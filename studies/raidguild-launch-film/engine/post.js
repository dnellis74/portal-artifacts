import * as THREE from 'three';
// Restrained pink halation, deterministic grain and vignette. Inspired by reference MIT post pipeline.
// Scrim RGB is #080909 converted to linear space, matching the clear color without a visible black-level step.
export class Post{constructor(renderer,w,h){this.renderer=renderer;this.rt=new THREE.WebGLRenderTarget(w,h,{depthBuffer:false});this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.mat=new THREE.ShaderMaterial({uniforms:{source:{value:this.rt.texture},res:{value:new THREE.Vector2(w,h)},time:{value:0},flash:{value:0}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D source;
uniform vec2 res;
uniform float time,flash;
varying vec2 uvv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+floor(time*30.)*19.7)*43758.5453);}
float ease01(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
void main(){
  vec2 sampleUv=uvv;
  float q=time-10.82;
  float front=0.,halo=0.,wash=0.,ignition=0.;
  if(q>=0.&&q<=1.03){
    vec2 pixel=vec2(uvv.x*1920.,(1.-uvv.y)*1080.);
    vec2 delta=pixel-vec2(960.,695.);
    float d=length(delta);
    float radius=1404.*ease01(q/.9);
    float edge=d-radius;
    front=exp(-pow(edge/17.,2.));
    halo=exp(-pow(edge/62.,2.));
    wash=smoothstep(0.,72.,-edge)*exp(-max(-edge,0.)/310.);
    float displacement=10.*exp(-pow(edge/48.,2.))*(1.-ease01((q-.9)/.13));
    vec2 direction=delta/max(d,1.);
    vec2 offset=vec2(direction.x,-direction.y)*displacement/vec2(1920.,1080.);
    float zoom=1.+.014*(1.-ease01(q/.3));
    sampleUv=clamp((uvv-.5)/zoom+.5+offset,vec2(0.),vec2(1.));
    ignition=.12*(1.-ease01(q/.12));
  }
  vec3 c=texture2D(source,sampleUv).rgb;
  vec3 bloom=vec3(0.);
  for(int i=0;i<8;i++){
    float a=float(i)*.785398;
    vec3 b=texture2D(source,clamp(sampleUv+vec2(cos(a),sin(a))*3.5/res,vec2(0.),vec2(1.))).rgb;
    float hot=max(0.,b.r-max(b.g,b.b)*1.5);
    bloom+=b*hot*.032;
  }
  c+=bloom;
  float v=1.-.25*dot(uvv-.5,uvv-.5);
  c=c*v+(hash(gl_FragCoord.xy)-.5)*.003+flash*.018;
  if(q>=0.&&q<=1.03){
    vec3 pink=vec3(.855,.045,.188);
    vec3 frontColor=mix(pink,vec3(1.,.55,.72),front*.65);
    float settle=1.-ease01((q-.9)/.13);
    float strength=clamp(front*1.1+halo*.63+wash*.34,0.,1.)*settle;
    c+=(1.-clamp(c,0.,1.))*frontColor*strength;
    c+=pink*ignition;
  }
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`});this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.mat));this.scrimScene=new THREE.Scene();this.scrimMat=new THREE.ShaderMaterial({uniforms:{opacity:{value:1}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform float opacity;varying vec2 uvv;void main(){float y=(1.-uvv.y)*1080.;float a=(.65*smoothstep(825.,900.,y)+.07*smoothstep(900.,1080.,y))*opacity;gl_FragColor=vec4(.002428216,.002731743,.002731743,a);}',transparent:true,depthTest:false,depthWrite:false});this.scrimScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.scrimMat))}begin(){this.renderer.setRenderTarget(this.rt);this.renderer.setClearColor(0x080909,1);this.renderer.clear()}footerScrim(opacity){if(opacity<=0)return;this.scrimMat.uniforms.opacity.value=opacity;this.renderer.render(this.scrimScene,this.camera)}finish(t,flash=0){this.mat.uniforms.time.value=t;this.mat.uniforms.flash.value=flash;this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera)}setSize(w,h){this.rt.setSize(w,h);this.mat.uniforms.res.value.set(w,h)}}
