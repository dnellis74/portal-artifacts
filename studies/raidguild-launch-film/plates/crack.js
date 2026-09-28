import {P,G} from '../engine/lines.js';
import {ease} from '../timeline.js';
const hash=n=>{let v=Math.sin(n*127.1)*43758.5453;return v-Math.floor(v)};
// A fixed connected tree: 11 diagonal spine segments plus seven three-segment branches.
const segments=[];let last=[660,135],arc=0;
for(let j=0;j<11;j++){let end=[660+(j+1)*58+(hash(j+9)-.5)*35,135+(j+1)*70+(hash(j+21)-.5)*28];let length=Math.hypot(end[0]-last[0],end[1]-last[1]);segments.push({a:last,b:end,parent:j-1,depth:0,arc,length});arc+=length;last=end}
const spineLength=arc;
const branchLengths=[];for(let branch=0;branch<7;branch++){let root=2+branch,parent=root,point=segments[root].b,side=branch%2?1:-1,branchArc=0;for(let depth=1;depth<=3;depth++){let angle=(side>0?-.45:2.8)+(hash(branch*3+depth)-.5)*.7,len=80+hash(branch*7+depth)*95,end=[point[0]+Math.cos(angle)*len,point[1]+Math.sin(angle)*len];segments.push({a:point,b:end,parent,depth,branch,length:len,arc:branchArc});branchArc+=len;parent=segments.length-1;point=end}branchLengths.push(branchArc)}
export function crack(batch,t){let after=t-18.56,main=ease((t-17)/1.56)*.36+ease(after/.48)*.64;let done=[];segments.forEach((s,j)=>{let p;if(s.depth===0)p=Math.max(0,Math.min(1,(main*spineLength-s.arc)/s.length));else{let growing=branchLengths[s.branch]*ease((after-s.branch*.022)/.5);p=done[s.parent]?Math.max(0,Math.min(1,(growing-s.arc)/s.length)):0;}done[j]=p>=.999;if(p<=0)return;let end=[s.a[0]+(s.b[0]-s.a[0])*p,s.a[1]+(s.b[1]-s.a[1])*p];batch.line(...s.a,...end,G,6,.22);batch.line(...s.a,...end,p<1?P:G,s.depth?1.5:2.4,p<1?.95:.8);if(p<1){batch.line(end[0]-4,end[1],end[0]+4,end[1],P,4,1);batch.line(end[0],end[1]-4,end[0],end[1]+4,P,2.2,.8)}})}
