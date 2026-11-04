/* Small, self-contained WebGL renderer. No downloads or build step required. */
(()=>{'use strict';
const $=id=>document.getElementById(id),G=PlatformGame,canvas=$('world');
const gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){$('error').classList.remove('hidden');return;}
const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uVP;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uVP*p;}`;
const fragment=`precision mediump float;varying vec3 vNormal;varying vec3 vWorld;uniform vec3 uColor;uniform vec3 uEye;uniform vec3 uFog;void main(){float light=.42+.58*max(0.,dot(normalize(vNormal),normalize(vec3(-.5,1.,.6))));vec3 c=uColor*light;float fog=smoothstep(35.,110.,distance(vWorld,uEye));gl_FragColor=vec4(mix(c,uFog,fog),1.);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
const loc={};for(const n of ['uModel','uVP','uColor','uEye','uFog'])loc[n]=gl.getUniformLocation(program,n);
const pos=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal');
gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(normal);
function mesh(tris){const buffer=gl.createBuffer(),data=[];for(const t of tris){const a=t[0],b=t[1],c=t[2],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;for(const p of t)data.push(...p,...n.map(x=>x/l));}gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return{buffer,count:data.length/6};}
const boxTris=[];const faces=[[[1,0,0],[1,1,1],[1,1,-1],[1,-1,-1],[1,-1,1]],[[-1,0,0],[-1,1,-1],[-1,1,1],[-1,-1,1],[-1,-1,-1]],[[0,1,0],[-1,1,1],[-1,1,-1],[1,1,-1],[1,1,1]],[[0,-1,0],[-1,-1,-1],[-1,-1,1],[1,-1,1],[1,-1,-1]],[[0,0,1],[-1,1,1],[1,1,1],[1,-1,1],[-1,-1,1]],[[0,0,-1],[1,1,-1],[-1,1,-1],[-1,-1,-1],[1,-1,-1]]];
for(const f of faces){const [a,b,c,d]=f.slice(1).map(p=>p.map(x=>x*.5));boxTris.push([a,b,c],[a,c,d]);}
const meshes={box:mesh(boxTris)};
function cylinder(sides,topRadius=1){const tris=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,p=[Math.sin(a),-.5,Math.cos(a)],q=[Math.sin(b),-.5,Math.cos(b)],r=[Math.sin(b)*topRadius,.5,Math.cos(b)*topRadius],s=[Math.sin(a)*topRadius,.5,Math.cos(a)*topRadius];tris.push([p,q,r],[p,r,s],[[0,.5,0],s,r],[[0,-.5,0],q,p]);}return mesh(tris);}
meshes.cylinder=cylinder(20);meshes.triangle=cylinder(3);meshes.rock=cylinder(7,.85);meshes.cone=cylinder(8,0);
const sphereTris=[];for(let j=0;j<8;j++)for(let i=0;i<12;i++){const pt=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];const a=j*Math.PI/8,b=(j+1)*Math.PI/8,c=i*Math.PI/6,d=(i+1)*Math.PI/6;sphereTris.push([pt(a,c),pt(b,c),pt(b,d)],[pt(a,c),pt(b,d),pt(a,d)]);}meshes.sphere=mesh(sphereTris);
const multiply=(a,b)=>{const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;};
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
const sub=(a,b)=>a.map((n,i)=>n-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);},dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function view(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function rgb(hex){return[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255];}
function draw(type,x,y,z,sx,sy,sz,color,rotation=0){const c=Math.cos(rotation),s=Math.sin(rotation);gl.uniformMatrix4fv(loc.uModel,false,new Float32Array([c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1]));gl.uniform3fv(loc.uColor,rgb(color));const m=meshes[type];gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,m.count);}
const C={orange:0xf5a16c,cream:0xe4d9b5,green:0x6c9990,dark:0x1a4148,red:0xef704e,metal:0x657c78};
let state=G.makeState(),started=false,paused=false,last=0,clock=0,camY=6,camX=0,camZ=0,angle=0,introTime=0;
const defaultYaw=Math.atan2(15,22.5),defaultPitch=Math.atan2(10.2,Math.hypot(15,22.5));
let cameraYaw=defaultYaw,cameraPitch=defaultPitch,cameraDistance=Math.hypot(15,22.5),cameraDrag=null;
function resetCamera(){cameraYaw=defaultYaw;cameraPitch=defaultPitch;cameraDistance=Math.hypot(15,22.5);}
let toastTimer=0,muted=true,audio=null,fireHeld=false,jumpPressed=false;
const keys=new Set();document.body.classList.add('intro');
$('parts').innerHTML=G.parts.map(p=>`<div class="part" id="part-${p.index}"><span class="part-icon">${p.icon}</span><span>${p.name}</span><span class="check">○</span></div>`).join('');
function tone(freq,duration=.1){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.value=freq;gain.gain.setValueAtTime(.06,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);}
function hud(){
 $('count').textContent=state.collected.size+' / 5';$('height').textContent=Math.max(0,Math.floor(state.y));$('alt-fill').style.height=Math.min(100,state.y/39.6*100)+'%';
 G.parts.forEach(p=>{const el=$('part-'+p.index),found=state.collected.has(p.index);el.classList.toggle('collected',found);el.querySelector('.check').textContent=found?'✓':'○';});
 const ready=state.collected.size===5;$('portal-light').classList.toggle('ready',ready);$('portal-state').textContent=ready?'Портал открыт на вершине':'Портал ждёт все детали';
 $('stage').textContent=state.phase==='climb'?'ЭКСПЕДИЦИЯ 01':'МИССИЯ · СПАСТИ ДОМ';
 $('extinguish').style.display=state.phase==='fire'&&!state.won?'block':'none';$('fire-progress').style.display=state.phase==='fire'?'block':'none';$('fire-fill').style.width=state.fire*100+'%';
}
function begin(){started=true;paused=false;document.body.classList.remove('intro');document.body.classList.add('playing');$('intro').classList.add('hidden');toast('WASD или стрелки — движение. Пробел — прыжок.');tone(440);}
function reset(){state=G.makeState();camY=6;camX=camZ=0;resetCamera();keys.clear();jumpPressed=false;fireHeld=false;$('win').classList.add('hidden');$('pause-screen').classList.add('hidden');begin();hud();}
function pause(value){if(!started||state.won)return;paused=value;keys.clear();cameraDrag=null;jumpPressed=false;fireHeld=false;$('pause-screen').classList.toggle('hidden',!paused);document.body.classList.toggle('playing',!paused);}
$('start').onclick=begin;$('pause').onclick=()=>pause(!paused);$('resume').onclick=()=>pause(false);$('restart').onclick=reset;$('again').onclick=reset;
$('sound').onclick=()=>{muted=!muted;$('sound').textContent='Звук: '+(muted?'выкл.':'вкл.');tone(600);};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&!e.repeat)pause(!paused);if(e.code==='KeyR'&&started&&!paused&&state.phase==='climb'){G.resetAtCheckpoint(state);toast('Возвращение к последней найденной детали');}if(e.code==='Space'&&!keys.has('Space'))jumpPressed=true;keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
window.addEventListener('keydown',e=>{if(e.code==='KeyC'&&started&&!paused)resetCamera();});
canvas.addEventListener('pointerdown',e=>{if(!started||paused||state.won||e.button!==0)return;cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!cameraDrag||cameraDrag.id!==e.pointerId)return;cameraYaw-=(e.clientX-cameraDrag.x)*.006;cameraPitch=Math.max(.25,Math.min(1.05,cameraPitch+(e.clientY-cameraDrag.y)*.005));cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;});
canvas.addEventListener('wheel',e=>{if(!started||paused||state.won)return;e.preventDefault();cameraDistance=Math.max(19,Math.min(38,cameraDistance+e.deltaY*.015));},{passive:false});
$('camera-left').onclick=()=>{if(!paused)cameraYaw-=Math.PI/6;};
$('camera-right').onclick=()=>{if(!paused)cameraYaw+=Math.PI/6;};
$('camera-reset').onclick=resetCamera;
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='Space')jumpPressed=true;};const release=()=>keys.delete(b.dataset.key);b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;});
$('extinguish').onpointerdown=e=>{e.preventDefault();$('extinguish').setPointerCapture(e.pointerId);fireHeld=true;};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('extinguish').addEventListener(event,()=>fireHeld=false);
function events(list){for(const event of list){if(event==='jump')tone(240,.08);if(event.startsWith('part:')){tone(740,.25);const n=+event.split(':')[1];toast(state.collected.size===5?'Огнетушитель собран! Портал на вершине открыт.':G.names[n]+' найден! Собрано '+state.collected.size+' из 5.');}if(event==='fall')toast('Ты снова у последней детали. Попробуй ещё раз!');if(event==='locked')toast('Не хватает деталей: '+G.parts.filter(p=>!state.collected.has(p.index)).map(p=>p.name.toLowerCase()).join(', ')+'. Спустись за ними.');if(event==='portal'){tone(880,.5);camY=4;toast('Дом горит! Подойди ближе и удерживай E, чтобы тушить.');}if(event==='win'){tone(1040,.6);document.body.classList.remove('playing');$('win').classList.remove('hidden');$('stats').textContent=state.jumps+' прыжков · '+Math.floor(state.time/60)+' мин '+Math.floor(state.time%60)+' сек';}}}
function extinguisher(x,y,z,scale=1,rot=0,part=-1){
 const d=(type,dx,dy,dz,sx,sy,sz,color)=>{const c=Math.cos(rot),s=Math.sin(rot);draw(type,x+(c*dx+s*dz)*scale,y+dy*scale,z+(-s*dx+c*dz)*scale,sx*scale,sy*scale,sz*scale,color,rot);};
 if(part<0||part===0){d('cylinder',0,.3,0,.22,.65,.22,C.red);d('sphere',0,.63,0,.22,.12,.22,C.red);d('box',0,.3,.208,.25,.22,.025,0xf2e6c7);d('cylinder',0,-.05,0,.23,.05,.23,C.dark);}
 if(part<0||part===1){d('box',0,.8,0,.12,.25,.1,C.metal);d('box',.07,.92,0,.4,.07,.09,C.dark);d('box',.07,.83,0,.38,.06,.09,C.red);}
 if(part<0||part===2){d('sphere',-.17,.76,.02,.14,.14,.08,C.cream);d('box',-.17,.77,.09,.025,.09,.025,C.red);}
 if(part<0||part===3){for(let i=0;i<8;i++)d('sphere',.3+Math.sin(i*.4)*.1,.85-i*.1,0,.06,.09,.06,C.dark);}
 if(part<0||part===4){d('cone',.37,.13,0,.13,.35,.13,C.dark);d('cylinder',.37,.32,0,.055,.15,.055,C.metal);}
}
function person(t){const x=started?state.x:0,y=started?state.y:0,z=started?state.z:0;const walk=started&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')||[...keys].some(k=>k.startsWith('Arrow'))),swing=walk?Math.sin(t*12)*.16:0;
 const c=Math.cos(angle),s=Math.sin(angle),part=(type,dx,dy,dz,sx,sy,sz,color)=>draw(type,x+c*dx+s*dz,y+dy,z-s*dx+c*dz,sx,sy,sz,color,angle);
 part('box',-.16,.26,swing,.23,.45,.27,C.dark);part('box',.16,.26,-swing,.23,.45,.27,C.dark);part('box',-.16,.07,swing+.06,.27,.14,.38,0x152c32);part('box',.16,.07,-swing+.06,.27,.14,.38,0x152c32);
 part('box',0,.85,0,.64,.7,.4,0xf4a45f);part('box',0,.67,.01,.66,.1,.42,0xe0e5ac);part('box',0,1.03,.205,.52,.07,.02,0xe0e5ac);part('box',0,.9,-.26,.46,.55,.2,C.dark);
 part('box',-.43,.85,-swing,.2,.6,.24,0xf4a45f);part('box',.43,.85,swing,.2,.6,.24,0xf4a45f);part('sphere',-.43,.55,-swing,.12,.12,.12,C.dark);part('sphere',.43,.55,swing,.12,.12,.12,C.dark);
 part('sphere',0,1.44,0,.27,.3,.25,0xf2c69d);part('sphere',0,1.64,0,.34,.19,.31,0xf4b85d);part('box',0,1.56,.12,.7,.06,.52,0xf4b85d);part('box',0,1.48,.232,.4,.14,.04,0x25454b);
 if(state.collected.size===5)extinguisher(x+.52,y+.3,z+.28,.7,angle);
 const p=G.platforms.reduce((best,p)=>p.y<=y+.05&&G.contains(p,x,z)&&(!best||p.y>best.y)?p:best,null);if(state.phase==='climb'&&p)draw('cylinder',x,p.y+.012,z,.4,.015,.28,0x395c56);
}
function portal(t){const p=G.platforms[24],ready=state.collected.size===5;draw('cylinder',p.x,p.y+.1,p.z,1.65,.2,1.65,0x324e50);for(let i=0;i<28;i++){const a=i/28*Math.PI*2;draw('sphere',p.x+Math.sin(a)*1.42,p.y+1.75+Math.cos(a)*1.6,p.z,.18,.22,.18,ready?0x99e9c1:0x718f88);}if(ready){for(let i=0;i<24;i++){const a=i*2.4+t,r=.2+(i%5)*.23;draw('sphere',p.x+Math.sin(a)*r,p.y+1.75+Math.cos(a)*r,p.z-.08,.07,.07,.07,0xd3f3bd);}}else{draw('box',p.x,p.y+1.6,p.z,.45,.4,.18,C.orange);draw('cylinder',p.x,p.y+1.95,p.z,.2,.35,.16,C.metal);}}
function climbWorld(t){
 draw('cylinder',0,-1.2,0,8,2.2,8,0x3e6b64);draw('rock',0,-5,0,5.8,6,5.8,0x284e50);
 for(const p of G.platforms){const top=p.index===24;const col=top?0xc5cda4:p.index%4===0?0xf2b27d:p.index%4===1?0x9abc9e:p.index%4===2?0xc9c8a6:0x71a99a;const type=p.shape==='circle'?'cylinder':p.shape==='triangle'?'triangle':'box';const sx=type==='box'?p.w:p.shape==='triangle'?p.w*.67:p.w/2;const sz=type==='box'?(p.shape==='long'?p.d*.68:p.d):sx;
  draw(type,p.x,p.y-.19,p.z,sx,.38,sz,col);draw(type,p.x,p.y-.45,p.z,sx*.94,.15,sz*.94,0x456e64);
  if(p.index>0&&p.index!==24){draw('box',p.x,p.y-1.05,p.z,.22,1.2,.22,0x527c71);if(p.route==='detail'){draw('box',p.x+1.1,p.y+.04,p.z-.8,.13,.08,.5,0xffdaa0);}}
 }
 for(const p of G.parts)if(!state.collected.has(p.index)){
  const y=p.y+Math.sin(t*2+p.index)*.12;draw('cylinder',p.x,G.platforms[p.platform].y+.04,p.z,.65,.05,.65,0xf5c780);extinguisher(p.x,y-.35,p.z,1.4,t*.65,p.index);
  for(let i=0;i<3;i++){const a=t+i*2.094;draw('sphere',p.x+Math.sin(a)*.8,y+.7+Math.sin(t+i)*.2,p.z+Math.cos(a)*.8,.04,.04,.04,0xffe5a6);}
 }
 portal(t);
 // Floating gardens and drifting clouds surround the platform routes.
 for(let i=0;i<12;i++){const a=i*2.4,r=19+i%4*5,x=Math.sin(a)*r,z=Math.cos(a)*r,y=-4+(i%5)*9;draw('rock',x,y-2,z,2.5+(i%3),3.5,2.2,0x315855);draw('cylinder',x,y,z,2.7+(i%3),.3,2.4,0x729387);draw('box',x,y+1,z,.18,2,.18,0x615f48);draw('cone',x,y+2.7,z,1.3,3.5,1.3,0x638e78);}
 for(let i=0;i<16;i++){const a=i*1.83,r=42+i%5*4;draw('box',Math.sin(a)*r,-10+(i%4),Math.cos(a)*r,3,8+i%5*2,3,0x345e62);}
 for(let i=0;i<15;i++){const a=i*1.7+t*.012,x=Math.sin(a)*(23+i%3*7),z=Math.cos(a)*(23+i%3*7),y=(i%6)*9-4;draw('sphere',x,y,z,4.5,1.0,2.5,0x91b7b0);draw('sphere',x+3,y-.2,z,3,.8,2,0x91b7b0);}
 person(t);
}
function fireWorld(t){
 draw('cylinder',0,-.4,1,19,.8,19,0x678c79);draw('box',0,.02,8,3,.05,16,0xb5b59a);
 draw('box',0,2,0,7,4,5,0xd3bd92);draw('triangle',0,4.15,0,4.8,5.8,3.7,0x975e49,Math.PI);draw('box',0,4.35,0,8,.2,6,0x975e49);
 draw('box',0,1.2,2.53,1.3,2.4,.12,0x355d5b);draw('sphere',.4,1.2,2.62,.06,.06,.06,0xfbd797);
 for(const x of [-2.2,2.2]){draw('box',x,2.1,2.56,1.25,1.5,.15,0x305156);draw('box',x,2.1,2.66,.07,1.6,.06,0xe1d6ad);draw('box',x,2.1,2.66,1.3,.07,.06,0xe1d6ad);}
 draw('box',2.2,5,0,.65,2,.7,0x8f745b);
 for(let i=0;i<12;i++){const a=i*2.4,x=Math.sin(a)*14,z=Math.cos(a)*13;draw('box',x,1,z,.2,2,.2,0x685f48);draw('cone',x,3,z,1.4,4,1.4,0x517b66);}
 for(let i=0;i<30;i++){if(state.fire<=0)break;const seed=i*9.43,x=Math.sin(seed)*3,z=Math.cos(seed)*1.8,y=1.3+((t*(1.5+i%3*.25)+i*.47)%3.5),size=(.35+Math.sin(t*9+i)*.12)*state.fire;draw('cone',x,y,z,size,1.5*state.fire,size,i%2?0xffb546:0xf07843);draw('sphere',x,y+3,z,.5*state.fire,.7*state.fire,.5*state.fire,0x60736a);}
 if((keys.has('KeyE')||fireHeld)&&!paused&&!state.won&&Math.hypot(state.x,state.z)<12){for(let i=0;i<45;i++){const f=((t*1.8+i/45)%1),spread=f*.9;draw('sphere',state.x*(1-f)+Math.sin(i*4.5+t)*spread,state.y+.85+f*1.1+Math.cos(i*2.5)*spread,state.z*(1-f),.10+f*.12,.10+f*.1,.10+f*.12,0xe2ecd5);}}
 person(t);
}
function resize(){const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
function frame(ms){try{
 const dt=Math.min((ms-last)/1000||.016,.04);last=ms;clock+=dt;if(!started)introTime+=dt;
 if(started&&!paused&&!state.won){let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  if(state.phase==='climb')cameraYaw+=((keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0))*dt*1.6;
  const yaw=state.phase==='climb'?cameraYaw:cameraYaw-defaultYaw+Math.atan2(12,21);
  const a=x*Math.cos(yaw)+z*Math.sin(yaw),b=-x*Math.sin(yaw)+z*Math.cos(yaw);x=a;z=b;
  if(x||z)angle=Math.atan2(x,z);
  const input={x,z,jump:jumpPressed,spray:keys.has('KeyE')||fireHeld};jumpPressed=false;
  const steps=Math.ceil(dt/(1/120));for(let i=0;i<steps;i++){events(G.step(state,input,dt/steps));input.jump=false;}hud();
 }
 resize();const fog=state.phase==='fire'?[.33,.48,.46]:[.18,.37,.39];gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3fv(loc.uFog,fog);
 const f=1-Math.exp(-dt*4);camY+=((started?state.y:3)-camY)*f;camX+=((started?state.x*.34:0)-camX)*f;camZ+=((started?state.z*.34:0)-camZ)*f;
 let eye,target;if(!started){eye=[23,20,31];target=[-2,12,-1];}else{
  const fire=state.phase==='fire',yaw=fire?cameraYaw-defaultYaw+Math.atan2(12,21):cameraYaw;
  target=fire?[0,2,2]:[camX,camY+2.8,camZ];
  eye=[target[0]+Math.sin(yaw)*cameraDistance,target[1]+Math.tan(cameraPitch)*cameraDistance,target[2]+Math.cos(yaw)*cameraDistance];
 }
 gl.uniform3fv(loc.uEye,eye);gl.uniformMatrix4fv(loc.uVP,false,multiply(perspective(.72,canvas.width/canvas.height,.1,180),view(eye,target)));
 if(state.phase==='climb')climbWorld(clock);else fireWorld(clock);
 requestAnimationFrame(frame);
 }catch(e){console.error(e);$('error').textContent='Не удалось запустить 3D-сцену: '+e.message;$('error').classList.remove('hidden');}}
hud();requestAnimationFrame(frame);
// Read-only state is useful when checking a local copy in browser developer tools.
window.gameSnapshot=()=>({...state,collected:[...state.collected],paused,started,camera:{yaw:cameraYaw,pitch:cameraPitch,distance:cameraDistance}});
})();
