import * as THREE from 'three';

export async function fonts(){
  const faces=[
    ['Grinder','Grinder-Refined-Regular.woff2'],
    ['Retalic','Grinder-Refined-Retalic.woff2'],
    ['GrinderItalic','Grinder-Refined-Italic.woff2'],
    ['UbuntuMono','UbuntuMono-Regular.ttf'],
    ['MaziusDisplay','MaziusDisplay-Bold.otf'],
    ['EBGaramond','EBGaramond-VariableFont_wght.ttf']
  ];
  await Promise.all(faces.map(async([family,file])=>{
    const face=new FontFace(family,`url(./assets/fonts/${file})`,{weight:'400',style:'normal'});
    await face.load();
    document.fonts.add(face);
  }));
}

export class TypeLayer{
  constructor(){
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(0,1920,1080,0,-20,20);
    this.cache=new Map();
    this.active=[];
  }
  clear(){this.active.forEach(mesh=>mesh.visible=false);this.active=[]}
  put(str,x,y,size=150,{color='#efe9d7',font='Grinder',align='left',alpha=1,rotation=0,scale=1}={}){
    const key=[str,size,color,font].join('|');
    let mesh=this.cache.get(key);
    if(!mesh){
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
      ctx.font=`400 ${size}px ${font}`;
      ctx.fontKerning='normal';
      const metrics=ctx.measureText(str);
      const advance=metrics.width;
      const drawX=Math.max(12,Math.ceil(metrics.actualBoundingBoxLeft||0)+12);
      const baseline=Math.max(size*1.04,Math.ceil(metrics.actualBoundingBoxAscent||0)+12);
      canvas.width=Math.ceil(drawX+Math.max(advance,metrics.actualBoundingBoxRight||0)+12);
      canvas.height=Math.ceil(Math.max(size*1.4,baseline+(metrics.actualBoundingBoxDescent||0)+12));
      ctx.font=`400 ${size}px ${font}`;
      ctx.fontKerning='normal';
      ctx.fillStyle=color;
      ctx.textBaseline='alphabetic';
      ctx.fillText(str,drawX,baseline);
      const texture=new THREE.CanvasTexture(canvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;
      texture.generateMipmaps=false;
      mesh=new THREE.Mesh(new THREE.PlaneGeometry(canvas.width,canvas.height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
      mesh.userData={width:canvas.width,height:canvas.height,advance,drawX};
      this.scene.add(mesh);
      this.cache.set(key,mesh);
    }
    const {width,height,advance,drawX}=mesh.userData;
    const anchor=x+(align==='center'?-advance*scale/2:align==='right'?-advance*scale:7*scale);
    const left=anchor-drawX*scale;
    mesh.position.set(left+width*scale/2,1080-y-height*scale/2,1);
    mesh.scale.setScalar(scale);
    mesh.rotation.z=-rotation;
    mesh.material.opacity=alpha;
    mesh.visible=true;
    this.active.push(mesh);
    return (advance+14)*scale;
  }
  mono(str,x,y,size=25,color='#77948b'){return this.put(str,x,y,size,{font:'UbuntuMono',color})}
  render(renderer){renderer.render(this.scene,this.camera)}
}
