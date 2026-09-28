const wait = ms => new Promise(r=>setTimeout(r,ms));
while(!window.film) await wait(50);
const film=window.film;
await film.ready;
let busy=false;
const exportButton=document.querySelector('#export');
const status=document.querySelector('#export-status');
function say(s){if(status) status.textContent=s;}
const perfMeter=document.createElement('span');perfMeter.id='preview-performance';perfMeter.style.cssText='font:11px monospace;opacity:.65;margin-left:12px';exportButton?.parentElement?.append(perfMeter);let perfTime=performance.now(),perfFrames=film.getState().renderedFrames||0;setInterval(()=>{const now=performance.now(),s=film.getState(),count=s.renderedFrames||0;if(s.playing)perfMeter.textContent=`Preview ${Math.round((count-perfFrames)*1000/(now-perfTime))} fps`;else if(!busy)perfMeter.textContent='';perfTime=now;perfFrames=count},1000);
function withTimeout(promise,ms,label){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out after ${ms/1000}s`)),ms)})]).finally(()=>clearTimeout(timer));}
function lockControls(){const controls=[...document.querySelectorAll('#play,#seek,#shots,#capture-review,#export')];const states=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);return ()=>controls.forEach((c,i)=>c.disabled=states[i]);}
async function encodeSegment(start,count,fps,cfg,software=false){
  let encoder,chunks=[],failure;
  try{
    const config=software?{...cfg,hardwareAcceleration:'prefer-software'}:cfg;
    const support=await VideoEncoder.isConfigSupported(config);
    if(!support.supported)throw new Error(software?'Software H264 export is unavailable':'H264 export is unavailable');
    encoder=new VideoEncoder({output:chunk=>{const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);chunks.push(b)},error:e=>{failure=e}});
    encoder.configure(config);
    for(let offset=0;offset<count;offset++){
      if(failure)throw failure;
      const i=start+offset;
      await withTimeout(film.renderAt(i/fps),10000,`Frame ${i+1}`);
      if(failure)throw failure;
      const frame=new VideoFrame(film.canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
      try{encoder.encode(frame,{keyFrame:offset===0})}finally{frame.close()}
    }
    await withTimeout(encoder.flush(),15000,`Segment ${start/fps+1} encoder flush`);
    if(failure)throw failure;
    if(!chunks.length)throw new Error(`Segment ${start/fps+1} returned no encoded frames`);
    return new Blob(chunks);
  }finally{if(encoder&&encoder.state!=='closed')encoder.close()}
}
async function post(path,data,type='application/octet-stream'){
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':type},body:data});
  if(!r.ok)throw new Error(`Export server ${r.status}`);return r.json();
}
exportButton?.addEventListener('click',async()=>{
  if(busy)return;busy=true;const previewSize=[film.canvas.width,film.canvas.height];const unlock=lockControls();film.pause();film.exporting=true;
  try{
    const width=1920,height=1080,fps=film.fps,total=Math.round(film.duration*fps);
    say('Preparing 1080p / 30 fps export…');film.setSize(width,height);
    const cfg={codec:'avc1.420028',width,height,bitrate:14000000,framerate:fps,latencyMode:'realtime',avc:{format:'annexb'}};
    const support=await VideoEncoder.isConfigSupported(cfg);if(!support.supported)throw new Error('H264 export is unavailable');
    const {id}=await post('/api/export/start',JSON.stringify({format:'h264',fps,width,height}),'application/json');
    for(let start=0;start<total;start+=fps){
      const count=Math.min(fps,total-start);let segment;
      say(`Rendering segment ${start/fps+1} / ${Math.ceil(total/fps)}…`);
      try{segment=await encodeSegment(start,count,fps,cfg)}
      catch(error){
        say(`Retrying segment ${start/fps+1} with software encoding…`);
        console.warn('Retrying export segment after encoder failure',error);
        segment=await encodeSegment(start,count,fps,cfg,true);
      }
      await post(`/api/export/chunk?id=${id}&frames=${start+count}`,segment);
      say(`Rendering ${Math.round((start+count)/total*100)}% · ${start+count} / ${total} frames`);
      await wait(0);
    }
    await post(`/api/export/finish?id=${id}`,'');say('Muxing the supplied song…');
    for(let i=0;i<120;i++){
      await wait(1000);const job=await (await fetch(`/api/status?id=${id}`)).json();
      if(job.status==='error')throw new Error(job.error);
      if(job.status==='complete'){say('Export complete · raidguild-signal-music-video-v12.mp4');return;}
    }
    throw new Error('Encoding is taking longer than expected. Check the local server.');
  }catch(e){say(`Export failed: ${e.message}`);console.error(e);}
  finally{film.setSize(...previewSize);try{await film.renderAt(film.getState().time)}catch{}film.exporting=false;busy=false;unlock();}
});
const qa=document.createElement('button');qa.textContent='Capture review frames';qa.id='capture-review';
exportButton?.parentElement?.append(qa);
qa.addEventListener('click',async()=>{
  if(busy)return;busy=true;const previewSize=[film.canvas.width,film.canvas.height];const unlock=lockControls();film.pause();film.exporting=true;
  try{
    film.setSize(1920,1080);
    const times=[0.8,1.6,2.2,2.6,5.6,10.1,11.4,14.2,15.1,16.5,17.9,19.3,20.5,21.6,22.1,24.4,27.2,30,32.3,32.7,33.2,33.29,33.31,33.65,34.0,34.3,34.43,34.44,34.7,35.5,36.2,37.4,39.2,40.9,43.1,46.8,47.9,49.7,51.15,51.55,51.95,52.4,53.4,55.3,55.4,56.8,57.0,58.0,58.7,59.0,60.7,61.9,63.4,64.9,66.5,67.4,67.75,68.2,68.9,69.65,69.95,70.4,71.1,71.85,72.8,74.8,76.8,77.7,79.3,80.8,81.15,81.8,82.5,84.5];
    const samples=times.map((t,i)=>[`review-${String(i+1).padStart(2,'0')}`,t]);
    samples.push(['first',0],['last',film.duration-1/film.fps],['repeat-a',42.8],['interleave-a',18.4],['repeat-b',42.8],['video-a',61.9],['interleave-b',29],['video-b',61.9],['oasis-a',63.4],['game-a',64.9],['interleave-c',6.1],['oasis-b',63.4],['game-b',64.9],['crack-a',21.85],['interleave-d',76.9],['crack-b',21.85],['flyover-a',36.4],['portal-a',68.7],['website-a',71.0],['interleave-e',76.9],['flyover-b',36.4],['portal-b',68.7],['website-b',71.0],['rail-transition-a',16.0],['rail-transition-b',16.22],['invite-a',51.55],['interleave-f',27.2],['invite-b',51.55],['reprise-a',57.0],['interleave-g',22.1],['reprise-b',57.0],['era-reveal-a',82.5],['interleave-h',5.6],['era-reveal-b',82.5],['footer-a',16.1],['interleave-i',68.7],['footer-b',16.1],['future-a',34.0],['interleave-j',70.4],['future-b',34.0]);
    for(let i=0;i<samples.length;i++){
      await withTimeout(film.renderAt(samples[i][1]),10000,`Review frame ${i+1}`);
      const b=await new Promise(r=>film.canvas.toBlob(r,'image/png'));
      await post(`/api/still?name=${samples[i][0]}`,b);
      say(`Captured review frame ${i+1} / ${samples.length}`);
    }
    say('Review frames captured');
  }catch(e){say(`Capture failed: ${e.message}`);}
  finally{film.setSize(...previewSize);try{await film.renderAt(film.getState().time)}catch{}film.exporting=false;busy=false;unlock();}
});
