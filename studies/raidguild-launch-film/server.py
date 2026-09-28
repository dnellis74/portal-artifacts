from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json, subprocess, threading, secrets, time, re, shutil, argparse
from urllib.parse import urlparse, parse_qs

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'exports'
PORT=8777
JOBS={}
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def send_head(self):
        path=Path(self.translate_path(self.path))
        self.range_remaining=None
        if not path.is_file():return super().send_head()
        size=path.stat().st_size
        start,end=0,size-1
        requested=self.headers.get('Range')
        if requested:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested)
            if not match or not any(match.groups()):
                self.send_error(416,'Invalid byte range');return None
            a,b=match.groups()
            if a:start=int(a);end=min(int(b),size-1) if b else size-1
            else:start=max(0,size-int(b))
            if start>=size or start>end:
                self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
        f=path.open('rb');f.seek(start)
        self.send_response(206 if requested else 200)
        self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Accept-Ranges','bytes')
        self.send_header('Content-Length',str(end-start+1))
        self.send_header('Last-Modified',self.date_time_string(path.stat().st_mtime))
        if requested:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers();self.range_remaining=end-start+1
        return f
    def copyfile(self,source,outputfile):
        if self.range_remaining is None:return shutil.copyfileobj(source,outputfile)
        remaining=self.range_remaining
        while remaining>0:
            data=source.read(min(65536,remaining))
            if not data:break
            outputfile.write(data);remaining-=len(data)
    def log_message(self,fmt,*args):
        if '/api/' in str(args):print(fmt%args,flush=True)
    def reply(self,obj,code=200):
        data=json.dumps(obj).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        u=urlparse(self.path)
        if u.path=='/api/status':
            job=JOBS.get(parse_qs(u.query).get('id',[''])[0]);self.reply(job or {'error':'Unknown job'},200 if job else 404);return
        return super().do_GET()
    def do_POST(self):
        origin=self.headers.get('Origin','')
        if origin and origin not in [f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}']:
            self.reply({'error':'Unexpected origin'},403);return
        n=int(self.headers.get('Content-Length','0'))
        if n>80_000_000:self.reply({'error':'Too large'},413);return
        data=self.rfile.read(n);u=urlparse(self.path);q=parse_qs(u.query)
        if u.path=='/api/export/start':
            cfg=json.loads(data);ext='h264' if cfg.get('format')=='h264' else 'ivf';ident=secrets.token_hex(12)
            path=ROOT/'render'/f'{ident}.{ext}';path.write_bytes(b'')
            JOBS[ident]={'id':ident,'path':str(path),'format':ext,'status':'receiving','frames':0,'fps':int(cfg.get('fps',30)),'started':time.time()}
            self.reply({'id':ident});return
        if u.path=='/api/still':
            name=q.get('name',['frame'])[0]
            if not name.replace('-','').replace('_','').isalnum():self.reply({'error':'Invalid name'},400);return
            (ROOT/'render'/f'{name}.png').write_bytes(data);self.reply({'ok':True});return
        job=JOBS.get(q.get('id',[''])[0])
        if not job:self.reply({'error':'Unknown job'},404);return
        if u.path=='/api/export/chunk':
            with open(job['path'],'ab') as f:f.write(data)
            job['frames']=int(q.get('frames',[job['frames']])[0]);self.reply({'ok':True});return
        if u.path=='/api/export/finish':
            job['status']='encoding';threading.Thread(target=finish,args=(job,),daemon=True).start();self.reply({'ok':True});return
        self.reply({'error':'Unknown endpoint'},404)

def finish(job):
    dest=OUTPUT/'raidguild-signal-music-video-v13.mp4'
    cmd=['ffmpeg','-v','error','-y']
    if job['format']=='h264':cmd+=['-r',str(job['fps']),'-f','h264']
    cmd+=['-i',job['path'],'-i',str(ROOT/'audio/score.wav')]
    cmd+=['-c:v','copy'] if job['format']=='h264' else ['-c:v','libx264','-preset','fast','-crf','19']
    cmd+=['-c:a','aac','-b:a','192k','-t',str(json.loads((ROOT/'data/music.json').read_text())['duration']),'-movflags','+faststart','-pix_fmt','yuv420p',str(dest)]
    proc=subprocess.run(cmd,capture_output=True,text=True)
    job.update(status='complete' if proc.returncode==0 else 'error',output=str(dest),error=proc.stderr[-2000:])
    print('EXPORT',job['status'],job.get('error',''),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Local Three.js film preview and export server')
    parser.add_argument('--port',type=int,default=8777)
    args=parser.parse_args();PORT=args.port
    (ROOT/'render').mkdir(exist_ok=True);OUTPUT.mkdir(exist_ok=True)
    print(f'RaidGuild film: http://127.0.0.1:{PORT}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
