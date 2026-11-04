/* Deterministic game rules, independent of rendering. */
(function(root){
'use strict';
const names=['Баллон','Рычаг','Манометр','Шланг','Раструб'];
const icons=['▥','⌁','◴','∿','◁'];
const platforms=[];
for(let i=0;i<=24;i++){
 const angle=i*.91, radius=i===0?0:5.4;
 platforms.push({x:Math.sin(angle)*radius,z:Math.cos(angle)*radius,y:i*1.65,w:i===0?4.6:i===24?3.6:2.8,d:i===0?4.6:i===24?3.6:2.8,shape:i===0||i===24?'box':['box','circle','triangle','long'][i%4],index:i});
}
const partLevels=[4,8,12,16,20];
const parts=partLevels.map((level,i)=>{
 const angle=level*.91;
 // One detached platform per part: an optional jump out and back.
 const radius=9.9;
 platforms.push({x:Math.sin(angle)*radius,z:Math.cos(angle)*radius,y:platforms[level].y,w:2.8,d:2.8,shape:['circle','box','triangle','long','circle'][i],index:platforms.length,route:'detail',level});
 const p=platforms[platforms.length-1];
 return{index:i,platform:p.index,name:names[i],icon:icons[i],x:p.x,y:p.y+1.15,z:p.z};
});
function makeState(){return{x:0,y:.01,z:0,vy:0,grounded:true,collected:new Set(),checkpoint:0,phase:'climb',fire:1,jumps:0,time:0,won:false,coyote:.12,buffer:0,portalHint:0};}
function contains(p,x,z,padding=0){
 const dx=x-p.x,dz=z-p.z;
 if(p.shape==='circle')return Math.hypot(dx,dz)<p.w/2+padding;
 if(p.shape==='triangle'){const r=p.w*.67;return dz>=-r*.5-padding&&dz<=r+padding&&Math.abs(dx)<(r-dz)/Math.sqrt(3)+padding;}
 return Math.abs(dx)<p.w/2+padding&&Math.abs(dz)<(p.shape==='long'?p.d*.34:p.d/2)+padding;
}
function resetAtCheckpoint(s){const p=platforms[s.checkpoint];s.x=p.x;s.z=p.z;s.y=p.y+.02;s.vy=0;s.grounded=true;s.coyote=.12;}
function step(s,input,dt){
 const events=[];if(s.won)return events;s.time+=dt;
 if(s.phase==='fire'){
  const speed=4; s.x=Math.max(-11,Math.min(11,s.x+(input.x||0)*speed*dt));s.z=Math.max(3.6,Math.min(15,s.z+(input.z||0)*speed*dt));
  if(input.spray&&Math.hypot(s.x,s.z)<12){s.fire=Math.max(0,s.fire-dt*.22);if(s.fire===0){s.won=true;events.push('win');}}
  return events;
 }
 const magnitude=Math.hypot(input.x||0,input.z||0)||1;
 const speed=5.8;
 s.x+=(input.x||0)/Math.max(1,magnitude)*speed*dt;s.z+=(input.z||0)/Math.max(1,magnitude)*speed*dt;
 s.coyote=s.grounded?.12:Math.max(0,s.coyote-dt);
 if(input.jump)s.buffer=.14;else s.buffer=Math.max(0,s.buffer-dt);
 if(s.buffer>0&&s.coyote>0){s.vy=10;s.grounded=false;s.coyote=0;s.buffer=0;s.jumps++;events.push('jump');}
 const prev=s.y;s.vy-=18*dt;s.y+=s.vy*dt;s.grounded=false;
 if(s.vy<=0){let landing=null;for(const p of platforms){if(prev>=p.y-.04&&s.y<=p.y&&contains(p,s.x,s.z,.16)&&(!landing||p.y>landing.y))landing=p;}if(landing){s.y=landing.y;s.vy=0;s.grounded=true;}}
 for(const p of parts){if(!s.collected.has(p.index)&&Math.hypot(s.x-p.x,s.z-p.z)<1.1&&Math.abs(s.y+.7-p.y)<1.5){s.collected.add(p.index);s.checkpoint=p.platform;events.push('part:'+p.index);}}
 if(s.y< -9){resetAtCheckpoint(s);events.push('fall');}
 const top=platforms[24];
 if(Math.hypot(s.x-top.x,s.z-top.z)<1.4&&Math.abs(s.y-top.y)<1.4){
  if(s.collected.size===5){s.phase='fire';s.x=0;s.y=0;s.z=9;s.vy=0;events.push('portal');}
  else if(s.portalHint<=0){s.portalHint=4;events.push('locked');}
 }
 s.portalHint=Math.max(0,s.portalHint-dt);return events;
}
root.PlatformGame={platforms,parts,names,icons,makeState,contains,resetAtCheckpoint,step};
})(globalThis);
