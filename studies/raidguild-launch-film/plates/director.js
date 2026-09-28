import {P,G,N,TEAL,CREAM} from '../engine/lines.js';
import {gear,contours,node} from './mechanics.js?v=13';
import {noisyPortal} from './portal.js';
import {crack} from './crack.js';
import {ease,boundaries,shot,beat,SONG_OFFSET} from '../timeline.js?v=13';
import {SVGLoader} from '../assets/vendor/SVGLoader.js';
const pink='#ee3c78',cream='#efe9d7';
export async function createDirector(media,epochs){const svg=await new SVGLoader().loadAsync('./assets/images/swords.svg');let symbol=[];for(let p of svg.paths)for(let path of p.subPaths){let pts=path.getPoints(40);for(let i=1;i<pts.length;i++)symbol.push([[pts[i-1].x,pts[i-1].y],[pts[i].x,pts[i].y]])}
function mark(batch,x,y,w=260,alpha=1,morph=1,t=0){for(let i=0;i<symbol.length;i++){let [a,b]=symbol[i],ang=i/symbol.length*6.283;let ca=[x+Math.cos(ang+t)*w*.55,y+Math.sin(ang+t)*w*.55],cb=[x+Math.cos(ang+.03+t)*w*.55,y+Math.sin(ang+.03+t)*w*.55];let pa=[x+(a[0]/112-.5)*w,y+(a[1]/105-.5)*w],pb=[x+(b[0]/112-.5)*w,y+(b[1]/105-.5)*w];batch.line(ca[0]*(1-morph)+pa[0]*morph,ca[1]*(1-morph)+pa[1]*morph,cb[0]*(1-morph)+pb[0]*morph,cb[1]*(1-morph)+pb[1]*morph,P,2.4,alpha)}}
function terminal(type,str,x,y,local,speed=35,fontSize=43){let content=str.slice(0,Math.floor(local*speed));let w=type.put(content,x,y,fontSize,{font:'UbuntuMono',color:cream});return x+w}
function caret(batch,x,y,h=48){batch.line(x,y,x,y+h,P,6)}
function grid(batch,t,opacity=.5){for(let i=0;i<17;i++){let x=150+i*100;batch.line(x,830,x,960,G,.75,opacity)}for(let y of [830,895,960])batch.line(150,y,1770,y,G,.75,opacity)}
function lyricWords(type,music,t,layout,size=180){let phrase=music.lyrics.find(p=>t>=p.start&&t<p.end+.18);if(!phrase)return;let words=phrase.words.filter(w=>w.start<=t);if(!words.length)return;let word=words.at(-1);let e=ease((t-word.start)/.13);type.put(word.word.toUpperCase().replace(/[.,]/g,''),layout[0]+(1-e)*45,layout[1],size,{color:cream,alpha:e})}
function reign(images,batch,type,t,key,start,duration=1.375){let q=t-start,r=335,travel=ease((q-(duration-.125))/.125)*.16,zr=r*(1+travel**3*7),cx=1280,cy=455;let palette={ven:'paletteVen',tw:'paletteTw',suede:'paletteSuede',world:'paletteLouchi'}[key];images.put(media.images[key],cx-zr*.88,cy-zr,zr*1.76,zr*2,{aperture:1,opacity:ease(q/.1)});noisyPortal(batch,cx,cy,r,t,travel);let isSuede=key==='suede';type.put({ven:'VEN',tw:'TW',suede:'Suede',world:'LOUCHI'}[key],140,245,isSuede?210:205,{font:isSuede?'MaziusDisplay':key==='world'?'Retalic':'Grinder',color:key==='tw'?'#f9f7e7':key==='suede'?'#efe9d7':pink,alpha:1});images.put(media.images[palette],145,705,520,76,{mode:0,opacity:1})}

function catchPulse(world,t){
  const q=t-7.82;if(q<0||q>.8)return 0;
  const pulse=(.25+.75*ease(q/.06))*(1-ease((q-.06)/.64));
  const x=.14,y=-7,z=1.8;
  world.seg([x-.6,y,z],[x+.6,y,z],32,P,.06*pulse);
  world.seg([x-.8,y,z],[x+.8,y,z],16,P,.1*pulse);
  world.seg([x-1.05,y,z],[x+1.05,y,z],7,P,.42*pulse);
  world.seg([x-.33,y,z],[x+.33,y,z],2.4,CREAM,1.2*pulse);
  world.seg([x,y-.65,z],[x,y+.65,z],2.2,CREAM,.8*pulse);
  const spread=ease(q/.8),radius=.7+8.5*spread,ringAlpha=.65*(1-spread);
  for(let j=0;j<48;j++){
    let a=j/48*Math.PI*2,b=(j+1)/48*Math.PI*2;
    let point=(ang,r)=>[x+Math.cos(ang)*r,y+Math.sin(ang)*r*.97,z+Math.sin(ang)*r*.25];
    world.seg(point(a,radius),point(b,radius),2.1,j%4?P:TEAL,ringAlpha);
  }
  for(let j=0;j<12;j++){
    let a=j*2.39996+.28,reach=(2.2+(j%4)*1.3)*spread;
    let point=(r)=>[x+Math.cos(a)*r,y+Math.sin(a)*r*.97,z+Math.sin(a)*r*.25];
    world.seg(point(reach),point(reach+.35+.3*(j%3)),1.7,j%3?P:TEAL,.85*(1-spread));
  }
  return pulse;
}
function rail(batch,type,headerType,t,i,filmTime,local){
  if(i<1||i>11)return;
  const future=filmTime>=32.3;
  const desired=future?8:i<=2?0:i===3?1:i===4?2:i===5?3:i<=7?4:i===11?7:i-3;
  const previous=future?7:i===1||i===2?0:i===7?4:i===11?7:desired-1;
  const active=future?7+ease((filmTime-32.3)/.9):previous+(desired-previous)*ease(local/.42);
  const fade=1-ease((filmTime-33.65)/.79),stewards=i>=8;
  headerType.put(stewards?"TODAY'S STEWARDS":'COMMUNITY-ELECTED BRAND ERAS',140,45,42,{font:'UbuntuMono',color:cream,alpha:fade});
  batch.line(100,1000,1820,1000,G,2,.8*fade);
  batch.line(100,1000,100+820*ease((filmTime-3)/2),1000,P,3,fade);
  const entries=[...epochs.markers,...epochs.currentStewards];
  if(future)entries.push({name:'THE FUTURE',role:'BUILD IT TOGETHER'});
  entries.forEach((item,j)=>{
    let x=920+(j-active)*420;if(x<-230||x>2150)return;
    let label=j<5?(j===0?'GUILD ORIGIN':item.label.toUpperCase()):item.name.toUpperCase();
    let sub=j>=5?item.role.toUpperCase():item.year?(item.approximate?'~':'')+item.year+(item.current?' CURRENT':''):j===1?'ARCHIVE':'';
    let on=j===desired,nodeAlpha=fade*(j===8?ease((filmTime-32.3)/.2):1);
    batch.line(x,990,x,1015,on?P:G,on?4:2,(on?1:.65)*nodeAlpha);
    type.put(label,x,875,on?40:36,{font:'UbuntuMono',align:'center',color:on?cream:'#789d93',alpha:nodeAlpha});
    if(sub)type.put(sub,x,935,32,{font:'UbuntuMono',align:'center',color:on?'#ee3c78':'#6a8f85',alpha:nodeAlpha});
  });
  batch.line(910,990,930,1010,P,3,fade);
  if(future){
    const dashAlpha=fade*ease((filmTime-32.3)/.3);
    for(let j=0;j<5;j++){let x=1130+j*105;batch.line(x,1000,x+32,1000,j%2?TEAL:P,2,dashAlpha*(1-j*.13))}
  }
  if(filmTime>=33.65){
    const drift=ease((filmTime-33.65)/.79),sparkAlpha=Math.sin(Math.PI*drift);
    for(let j=0;j<72;j++){
      const h=(n)=>{let v=Math.sin(n*127.1+19.7)*43758.5453;return v-Math.floor(v)};
      let x=130+j*23.2+(h(j)-.5)*17,y=992-(25+35*h(j+101))*drift;
      batch.line(x,y,x+3+6*h(j+202),y-(2+7*h(j+303)),j%3?P:TEAL,1.5,sparkAlpha*(.35+.5*h(j+404)));
    }
  }
}
function strip(batch,type,images,t,local,site){const keys=site?['website','launchGuild','launchPractices']:['portal','portalShipping','portalCommunity'];const q=ease((local-.3)/1.5),shift=q*1398,clip=[320,190,1600,890],boot=ease(local/.3);keys.forEach((key,j)=>{let y=202+j*699-shift;if(y+675<clip[1]||y>clip[3])return;images.put(media.images[key],360,y,1200,675,{mode:local<.3?1:0,reveal:1,opacity:1,clipRect:clip})});batch.line(320,190,1600,190,P,local<.3?5:1.5,.6+boot*.3);batch.line(320,890,1600,890,G,1.4,.75);let scan=190+700*boot;batch.line(320,scan,1600,scan,P,2.5,1-boot*.7);type.mono(site?'A WINDOW INTO THE GUILD':'PORTAL / SHARED KNOWLEDGE',140,82,31,cream);type.mono('APPLIED AI',145,945,32);type.mono('ONCHAIN SYSTEMS',1270,945,32)}
return function draw({lines:batch,world,type,footerLines,footerType,images,camera,music},filmTime){let i=shot(filmTime),local=filmTime-boundaries[i],t=filmTime-SONG_OFFSET,hit=beat(t,music);batch.clear();world.clear();type.clear();footerLines.clear();footerType.clear();images.clear();camera.position.set(0,4,65);camera.lookAt(0,0,-8);camera.fov=45;camera.updateProjectionMatrix();camera.updateMatrixWorld();
switch(i){
case 0:{let x=terminal(type,'raidguild_',150,280,local,10/1.2,85);if(local<1.3)caret(batch,x+8,295,92);if(local>=1.3){let y=terminal(type,'A new era_',150,440,local-1.3,10/.9,72);caret(batch,y+8,450,79)}batch.line(150,650,650,650,G,1);break}
case 1:{type.put('BUILDER-OWNED',140,155,155);type.put('COLLECTIVE.',140,355,205,{color:pink});type.mono('BUILDING TOGETHER SINCE 2019',150,700,37);gear(world,{cx:25,cy:-13,r:26,angle:t*.14,tilt:.4});break}
case 2:{type.put(t<7.72?'LET':'LET IT',140,150,155);if(t>=7.82)type.put('CATCH.',140+35*(1-ease((t-7.82)/.16)),340,225,{color:pink,scale:.85+.15*ease((t-7.82)/.16)});let a=t<7.82?.12*Math.sin(t*14):.2+(t-7.82)*1.2,pulse=catchPulse(world,t),widthScale=1+.7*pulse,alpha=1+.28*pulse;gear(world,{cx:18,cy:-7,r:19,angle:a,tilt:.25,widthScale,alpha});gear(world,{cx:-11.77,cy:-7,r:12.67,teeth:16,angle:-a*24/16+.2,tilt:.25,widthScale,alpha});break}
case 3:{reign(images,batch,type,t,'ven',11.5,1.375);break}
case 4:{reign(images,batch,type,t,'tw',12.875,1.375);break}
case 5:{reign(images,batch,type,t,'suede',14.25,1.375);break}
case 6:{reign(images,batch,type,t,'world',15.625,1.375);break}
case 7:{camera.position.set(-12,19,55);camera.lookAt(0,-3,-20);contours(world,t,.7,ease((t-18.56)/.45));type.put(t<17.62?'THROUGH':'THROUGH A',140,150,140);if(t>=18)type.put('WINDSHIELD',140,330,140);if(t>=18.56)type.put('CRACK.',1030+35*(1-ease((t-18.56)/.15)),585,190,{color:pink,rotation:-.06});crack(batch,t);break}
case 8:{images.put(media.images.dekan,1200,190,560,610,{mode:2,reveal:ease(local/.7)});type.mono('KNOWLEDGE STEWARD',140,150,28);type.put('DEKAN',140,265,205);type.mono('Learning becomes shared memory.',145,530,30);let n=[[250,660],[625,660],[1000,660]];n.forEach(([x,y],j)=>{node(batch,x,y,44,t,j<=local/.6);if(j<2)batch.line(x+50,y,x+325,y,G,2)});['SOURCE NOTE','REVIEW','PRISM / MEMORY'].forEach((s,j)=>type.mono(s,n[j][0]-80,735,24));let p=Math.min(1,Math.max(0,(local-.3)/1.8));batch.line(250+750*p,642,250+750*p,678,P,6);break}
case 9:{images.put(media.images.ecwireless,140,310,450,490,{mode:2,reveal:ease(local/.7)});type.mono('INFRASTRUCTURE STEWARD',700,140,28);type.put('ECWIRELESS',700,230,122);gear(world,{cx:6,cy:2,r:9,angle:t*.6,tilt:.2});gear(world,{cx:20.1,cy:2,r:6,teeth:16,angle:-t*.9,tilt:.2});type.mono('PEOPLE',820,710,26);type.mono('AGENTS',1180,710,26);type.mono('REVIEW',1500,710,26);node(batch,1550,535,48,t);batch.line(1240,535,1500,535,G,2);type.mono('AGENTIC OS / EXPERIMENT',700,785,25);break}
case 10:case 11:{let elapsed=t-26.75;images.put(media.images.louchi,1270,215,470,565,{mode:2,reveal:ease(elapsed/.55)});type.mono('BRAND STEWARD',140,140,28);type.put('LOUCHI',140,270,205,{font:'Retalic',color:pink});type.mono('A shared creative language.',140,565,29);mark(batch,670,695,180,1,ease((elapsed-.3)/1.5),t);break}
case 12:{let q=ease((t-31.44)/3.48),rise=ease((t-32.78)/.8);camera.position.set(-22+40*q,10+12*rise,35-47*q);camera.lookAt(-5+10*q,-6,-28-20*q);camera.fov=48;camera.updateProjectionMatrix();camera.updateMatrixWorld();contours(world,t,.58);if(t<32.08)type.put('NOBODY',140,140,230,{color:cream});else if(t<32.78){type.put('NOBODY',140,140,230);type.put('OWNS',800,480,200,{color:pink});batch.line(760,620,1730,620,G,3)}else{type.put('HORIZON',100,300,278,{color:cream,scale:1+ease((t-32.78)/.18)*.05});}break}
case 13:{if(t<36.9){type.put(t<35.56?'NOBODY':'FENCES',140,160,215);if(t>=36.1)type.put(t<36.42?'THE':'THE STARS',140,440,205,{color:pink,scale:.9+.1*ease((t-36.42)/.15)});let opening=ease((t-36)/.7)*220;batch.line(100-opening,120,100-opening,900,G,2);batch.line(1820+opening,120,1820+opening,900,G,2)}else{type.put('150',140,180,430,{color:cream});type.mono('GLOBAL MEMBERS',150,750,46);for(let j=0;j<150;j++){let e=ease((t-36.9)/.6),x=1040+Math.sin(j*2.399)*(220+e*180),y=510+Math.cos(j*1.71)*(120+e*280);batch.line(x-3,y,x+3,y,P,5,.95);if(j%5===0)batch.line(x,y-3,x,y+3,P,1.4,.8)}}break}
case 14:{camera.position.z=62-ease(local/2)*12;camera.updateMatrixWorld();gear(world,{cx:23,cy:-7,r:25,angle:t*.6,tilt:.2,progress:ease(local/1.2)});if(t<39.76)lyricWords(type,music,t,[140,180],200);else{type.put('TOGETHER',140,150,195,{color:cream});mark(batch,1330,640,490,1,ease((t-39.76)/1.3),t)}break}
case 15:{if(t<44){if(t<43.54)lyricWords(type,music,t,[140,250],240);else type.put('OURS',140+45*(1-ease((t-43.54)/.15)),250,360,{color:pink,scale:.86+.14*ease((t-43.54)/.15)});for(let j=0;j<18;j++){let y=190+j*35;batch.line(1130,y,1590,y+Math.sin(j*4)*16,G,1.2)}}else{type.put('88+',140,175,420);type.mono('RAIDS SHIPPED',150,750,46);mark(batch,1430,590,360,.55)}break}
case 16:{lyricWords(type,music,t,[140,150],200);let xs=[300,690,1080,1550];xs.forEach((x,j)=>{node(batch,x,720,52,t,j<local/.45);if(j<3)batch.line(x+58,720,xs[j+1]-58,720,G,2)});let x=300+1250*ease(local/2.2);caret(batch,x,698,44);if(t>46.96)type.put('BESIDE US',140,380,150,{color:pink});break}
case 17:{let opening=ease(local/.25),r=52+108*opening;batch.line(1138,720,1550-r,720,G,2,.8);node(batch,1550,720,r,t,false);type.put('PULL UP.',140,265,228,{color:pink,alpha:ease(local/.12)});break}
case 18:{if(t<49.52)lyricWords(type,music,t,[140,160],180);else type.put('A SEAT',140,160,195);if(t>=50.08)type.put(t<50.32?'EITHER':'EITHER SIDE',140,390,180,{color:pink});let q=ease(local/.6);node(batch,1550,720,160,t,false);node(batch,1020,835,65,t);node(batch,1760,835,65,t);batch.line(1550,720,1550+(1020-1550)*q,720+(835-720)*q,P,2.8);batch.line(1550,720,1550+(1760-1550)*q,720+(835-720)*q,P,2.8);break}
case 19:{let q=ease(local/3.9),rise=ease((t-54.12)/.8);camera.position.set(-22+40*q,10+12*rise,35-47*q);camera.lookAt(-5+10*q,-6,-28-20*q);camera.fov=48;camera.updateProjectionMatrix();camera.updateMatrixWorld();contours(world,t,.82);type.put(t<53.2?'NOBODY':t<54.12?'OWNS':'HORIZON',140,170,t<54.12?215:245,{color:t<54.12?cream:pink});break}
case 20:{type.put(t<56.42?'BUT WE':'OWN',140,140,t<56.42?195:340,{color:pink});if(t>=57.14)type.put(t<57.42?'THIS':'THIS RIDE.',150,620,125);mark(batch,1430,560,460,1,ease(local/1.2),t);break}
case 21:case 22:case 23:{let key=['walker','oasis','game'][i-21];images.put(media.videos[key].texture,0,0,1920,1080,{mode:1,opacity:1});type.mono(['DESERT WALKER','SIROCCO OASIS','THE LAST MILE'][i-21],140,900,38,cream);if(i===22)noisyPortal(batch,1240,530,320,t,ease((local-.9)/.6));else if(i===23){for(let j=0;j<16;j++){let a=j/16*6.283+t*.4;batch.line(1170+Math.cos(a)*260,530+Math.sin(a)*260,1170+Math.cos(a)*310,530+Math.sin(a)*310,P,2)}}break}
case 24:{type.put('BECOMING',140,130,145);type.put('AI-FIRST.',140,310,205,{color:pink});let end=terminal(type,'> review → remember → build',150,680,local,42);caret(batch,end+8,690,36);let xs=[320,950,1560];['PRISM','JEV','AGENTIC OS'].forEach((s,j)=>{node(batch,xs[j],860,35,t,local>j*.5);type.mono(s,xs[j]-80,940,27);if(j<2)batch.line(xs[j]+40,860,xs[j+1]-40,860,G,2)});type.mono('EXPERIMENTING IN THE OPEN',145,570,27);break}
case 25:{strip(batch,type,images,t,local,false);break}
case 26:{strip(batch,type,images,t,local,true);break}
case 27:{const q=t-69;type.put('WE BUILT IT.',140,170,155,{alpha:ease(q/.14)});if(t>=71)type.put('WE OWN IT.',140,385,155,{color:pink,alpha:ease((t-71)/.14)});if(t>=73)type.put('COME RIDE.',140,610,165,{font:'Retalic',alpha:ease((t-73)/.14)});mark(batch,1535,485,350,1,ease(q/.7));let corners=[[1300,180],[1780,180],[1780,830],[1300,830],[1300,180]];if(t>=71)for(let j=1;j<corners.length;j++){let a=corners[j-1],b=corners[j],e=ease((t-71-(j-1)*.08)/.3);batch.line(a[0],a[1],a[0]+(b[0]-a[0])*e,a[1]+(b[1]-a[1])*e,G,2)}if(t>=73){let e=ease((t-73)/.3);batch.line(1540,830,1540,830+130*e,P,2.5);node(batch,1540,990,28,t,true)}break}
case 28:{mark(batch,1515,310,245,1);type.put('VENTURE',140,180,190);type.put('BEYOND.',140,410,215,{color:pink});type.put('Together.',145,710,105,{font:'Retalic'});type.mono('raidguild.org',1290,835,49,cream);caret(batch,1760,840,55);break}
case 29:{let e=ease(local/.28);type.put('LOUCHI DESIGN ERA',140,235,132,{color:cream,alpha:e});type.put('coming Oct 26',140,515,104,{font:'Retalic',color:pink,alpha:ease((local-.1)/.18)});break}

}
rail(footerLines,footerType,type,t,i,filmTime,local);return {shot:i,video:i>=21&&i<=23?['walker','oasis','game'][i-21]:null,videoTime:local*(i===21?5/1.5:i===22?2.5/1.5:3.5/1.5)}
}
}
