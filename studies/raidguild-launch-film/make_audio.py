"""Three-second silent title, then original song through 1:18 with a one-second fade ending at 1:17.5."""
from pathlib import Path
import subprocess, argparse
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='Original Desolate Negative Space recording')
source=parser.parse_args().source
if not source.is_file(): parser.error('Source recording not found')
(root/'audio').mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af','atrim=start=0:end=78,asetpts=PTS-STARTPTS,afade=t=out:st=76.5:d=1,adelay=3000|3000,apad=whole_dur=85,atrim=end=85','-ar','48000','-ac','2','-c:a','pcm_s16le',str(root/'audio/score.wav')],check=True)
print('85 seconds total; 3 silent seconds + original source 0–78 + 4 silent end-card seconds; no vocal splice.')
