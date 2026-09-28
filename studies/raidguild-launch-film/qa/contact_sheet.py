from pathlib import Path
from PIL import Image, ImageDraw
import sys, hashlib, re
root=Path(__file__).resolve().parents[1]
files=sorted((root/'render').glob('review-*.png'))
if not files:raise SystemExit('No captured frames')
times=[float(v) for v in re.search(r'const times=\[([^]]+)\]',(root/'exporter.js').read_text()).group(1).split(',')]
cols=4;w=480;h=270;label=30
sheet=Image.new('RGB',(cols*w,((len(files)+cols-1)//cols)*(h+label)),'#151719')
d=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
 im=Image.open(f).convert('RGB');im.thumbnail((w,h));x=(i%cols)*w;y=(i//cols)*(h+label)
 sheet.paste(im,(x,y));d.text((x+12,y+h+7),f'{f.stem} | film {times[i]:.2f}s | song {times[i]-3:.2f}s',fill='#efe9d7')
out=root/'render/contact-sheet.jpg';sheet.save(out,quality=92)
print(out)
for a,b in [('repeat-a','repeat-b'),('video-a','video-b'),('oasis-a','oasis-b'),('game-a','game-b'),('crack-a','crack-b'),('flyover-a','flyover-b'),('portal-a','portal-b'),('website-a','website-b'),('invite-a','invite-b'),('reprise-a','reprise-b'),('era-reveal-a','era-reveal-b'),('footer-a','footer-b'),('future-a','future-b')]:
 fa=root/'render'/f'{a}.png';fb=root/'render'/f'{b}.png'
 if fa.exists() and fb.exists():
  ia=Image.open(fa).tobytes();ib=Image.open(fb).tobytes();print(a,b,'identical' if ia==ib else 'DIFFERENT')
