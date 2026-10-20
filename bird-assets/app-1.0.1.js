
'use strict';
(function(){
const cv=document.querySelector('canvas'),form=document.querySelector('form'),input=document.querySelector('input');
let g=cv.getContext('2d'),backLayer,treeLayer,starSprites=[];
if(!g){
  const message=document.createElement('p');message.setAttribute('role','status');
  message.textContent='当前环境暂时无法绘制月夜，请稍后重新打开。';
  message.style.cssText='position:fixed;top:43%;left:8%;width:84%;text-align:center;color:#eaf4ff;font:16px sans-serif';
  document.body.appendChild(message);input.disabled=true;form.querySelector('button').disabled=true;
  form.addEventListener('submit',e=>e.preventDefault());return;
}
let sceneWidth=innerWidth||document.documentElement.clientWidth||360;
let sceneHeight=innerHeight||document.documentElement.clientHeight||640;
let keyboardSession=false,pendingViewportResize=false;
let fontReady=false,leafDust=[],leafClock=0;
const LEAF_COLORS=[[115,221,158],[164,231,163],[83,192,151]];
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t),random=(a,b)=>a+Math.random()*(b-a);
let W,H,D,moon,branches=[],foliage=[],perches=[],birds=[],letters=[],stars=[],dust=[],motes=[],time=0,last=0,busy=false,pointer={x:-999,y:-999},disturbAt=-10,nextIdle=6;
function seeded(n){return()=>((n=(n*16807)%2147483647)-1)/2147483646}
function cubic(a,b,c,d,t){let u=1-t;return{x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y}}
function branchPoint(b,t){return cubic(b.a,b.b,b.c,b.d,t)}
function setup(){W=sceneWidth;H=sceneHeight;cv.style.width=W+'px';cv.style.height=H+'px';D=Math.min(devicePixelRatio||1,2,Math.sqrt(5200000/(W*H)));cv.width=W*D;cv.height=H*D;const mobile=W<600;moon={x:W*(mobile?.24:.23),y:H*.205,r:Math.min(W*(mobile?.12:.068),H*.105)};branches=[];foliage=[];perches=[];const rd=seeded(761);
function grow(a,angle,len,width,depth,opacity){const stretch=Math.min(W/H,1.6)*.68;const bend=(rd()-.5)*.24;const d={x:a.x+Math.sin(angle)*len*stretch,y:a.y-Math.cos(angle)*len};const branch={a,b:{x:a.x+Math.sin(angle+bend)*len*.32*stretch,y:a.y-Math.cos(angle+bend)*len*.32},c:{x:d.x-Math.sin(angle-bend)*len*.27*stretch,y:d.y+Math.cos(angle-bend)*len*.27},d,width,opacity};branches.push(branch);
if(depth>=2&&depth<=4){for(const t of [.55,.83]){const p=branchPoint(branch,t);if(p.x>W*.43&&p.x<W*.96&&p.y>H*.3&&p.y<H*.87)perches.push(Object.assign({},p,{y:p.y-2,opacity}));}}
if(depth>=6){for(let j=0;j<4;j++){const theta=rd()*TAU,rr=rd()*9;foliage.push({x:d.x+Math.cos(theta)*rr,y:d.y+Math.sin(theta)*rr,r:1.4+rd()*2.2,angle:rd()*TAU,opacity:opacity*(.25+rd()*.5)})}return;}
const spread=.26+rd()*.29;grow(d,clamp(angle-spread,-1.35,1.35),len*(.64+rd()*.12),width*.66,depth+1,opacity*.94);grow(d,clamp(angle+spread*(.8+rd()*.35),-1.35,1.35),len*(.65+rd()*.13),width*.64,depth+1,opacity*.92);
if(depth>=1&&depth<=3&&rd()>.5){const q=branchPoint(branch,.58);grow(q,angle+(rd()>.5?1:-1)*.85,len*.5,width*.49,depth+1,opacity*.75);}}
grow({x:W*.8,y:H*1.06},-.22,H*.26,4.6,0,.94);
grow({x:W*1.025,y:H*1.08},-.3,H*.21,3,0,.32);
const moved=new Set();for(const b of branches)for(const p of [b.a,b.b,b.c,b.d]){if(!moved.has(p)){p.y+=H*.1;moved.add(p)}}for(const f of foliage)f.y+=H*.1;for(const p of perches)p.y+=H*.1;
const spaced=[];for(const p of perches.map(p=>Object.assign({},p,{order:rd()})).sort((a,b)=>a.order-b.order)){if(spaced.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>(mobile?18:30)))spaced.push(p);}
for(const p of perches){if(spaced.length>=24)break;if(spaced.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>8))spaced.push(p);}
perches=spaced.slice(0,24);birds=perches.map((p,i)=>({home:p,x:p.x,y:p.y,state:'rest',phase:rd()*TAU,face:i%2?1:-1,size:mobile?.95:1.15,t:0,delay:0,letter:null,alpha:1,trail:[],sparkTimer:0}));letters=[];dust=[];leafDust=[];leafClock=0;busy=false;nextIdle=time+random(4,7);form.classList.remove('busy');input.disabled=!fontReady;form.querySelector('button').disabled=!fontReady;
stars=Array.from({length:200},()=>({x:rd()*W,y:rd()*H,a:rd()*.6+.2,r:rd()>.93?1.4:rd()*.65+.3,phase:rd()*TAU,speed:.4+rd()*1.5}));
motes=Array.from({length:36},()=>({x:rd()*W,y:rd()*H,r:rd()*1.3+.5,speed:rd()*6+3,phase:rd()*TAU}));buildLayers();
}
function wind(p){
  const strength=clamp((H*1.16-p.y)/H),amplitude=clamp(W*.07,24,36);
  const sway=Math.sin(time*.55)+.24*Math.sin(time*.93)+.18*Math.sin(time*.27+.8);
  return{x:p.x+sway*amplitude*strength,y:p.y+Math.sin(time*.55+.6)*2.9*strength};
}
function burst(x,y,count=16){for(let i=0;i<count;i++)dust.push({x,y,vx:random(-22,22),vy:random(-18,23),life:0,max:random(.7,2.3),r:random(.6,1.8)});}
function glyphPosition(c){return{x:c.x+Math.sin((time-c.born)*.8+c.phase)*1.2,y:c.y+Math.sin((time-c.born)*1.1+c.phase)*3};}
function path(b,start,c1,c2,end,duration,state){Object.assign(b,{start,c1,c2,end,duration,state,t:0});}
function scatter(b,delay=0){if(b.state!=='rest')return;b.delay=delay;b.letter=null;b.state='waiting';b.next='wander';b.waitPerched=true}
function wander(b){const side=b.home.x>W*.7?-1:1;path(b,{x:b.x,y:b.y},{x:b.x+side*W*.21,y:b.y-H*.28},{x:b.x-side*W*.11,y:b.y-H*.33},{x:b.home.x+side*W*.12,y:b.home.y-H*.16},random(2.8,4),'wander');}
function returnHome(b){path(b,{x:b.x,y:b.y},{x:b.x+W*.06,y:b.y-H*.06},{x:b.home.x-W*.05,y:b.home.y-H*.08},{x:b.home.x,y:b.home.y},random(2,3),'return');}
function disturb(x,y,radius){if(time-disturbAt<.2)return;let found=false;for(const b of birds){if(b.state==='rest'&&Math.hypot(b.x-x,b.y-y)<radius){scatter(b,random(0,.22));found=true}}if(found)disturbAt=time;}
cv.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};if(e.pointerType!=='touch')disturb(pointer.x,pointer.y,48)});cv.addEventListener('pointerdown',e=>disturb(e.clientX,e.clientY,W<600?115:160));cv.addEventListener('pointerleave',()=>pointer={x:-999,y:-999});
input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!e.isComposing&&e.keyCode!==229)send()}});input.addEventListener('input',()=>form.classList.toggle('empty',!input.value.trim()));
function releaseFontSize(){return W<600?clamp(W*.046,16,20):clamp(Math.min(W*.032,H*.038),26,38)}
const send=()=>{if(!fontReady||busy||!input.value.trim()||!birds.length)return;const chars=Array.from(input.value.trim()).slice(0,Math.min(24,birds.length)),font=releaseFontSize(),cols=Math.max(1,Math.min(12,Math.floor((W-48)/(font*1.45))));busy=true;input.disabled=true;input.blur();form.classList.add('busy');form.querySelector('button').disabled=true;const rowW=Math.min(cols,chars.length)*font*1.45,cx=clamp(moon.x,rowW/2+16,W-rowW/2-16);
letters=chars.map((char,i)=>{const row=Math.floor(i/cols),n=Math.min(cols,chars.length-row*cols);return{char,x:cx+((i%cols)-(n-1)/2)*font*1.45,y:moon.y+moon.r+font*1.6+row*font*1.7+Math.sin(i*.7)*font*.07,font,phase:i*1.7,rotation:Math.sin(i*2.4)*.03,held:false,gone:false,born:time}});
const available=birds.slice().sort((a,b)=>(a.state==='rest'?0:1)-(b.state==='rest'?0:1));letters.forEach((c,i)=>{const b=available[i];b.waitPerched=b.state==='rest';b.letter=c;b.state='waiting';b.next='fetch';b.delay=1.25+i*.32;b.alpha=1;b.trail=[]});input.value='';form.classList.add('empty');};
form.addEventListener('submit',e=>{e.preventDefault();send()});form.querySelector('button').addEventListener('click',e=>{e.preventDefault();send()});
function updateLeafDust(dt){
  leafClock+=dt;
  const motion=Math.abs(Math.cos(time*.55)*.55+.24*Math.cos(time*.93)*.93+.18*Math.cos(time*.27+.8)*.27);
  if(leafClock>.17&&motion>.18&&foliage.length&&leafDust.length<72){
    leafClock=0;const f=foliage[Math.floor(Math.random()*foliage.length)],p=wind(f);
    if(p.x>-10&&p.x<W+10&&p.y<H*.88){const shade=Math.floor(Math.random()*LEAF_COLORS.length);leafDust.push({x:p.x,y:p.y,vx:random(-9,9),vy:random(9,18),r:random(.7,1.55),age:0,max:random(3.2,5.5),phase:random(0,TAU),shade});}
  }
  for(const p of leafDust){p.age+=dt;const flow=Math.sin(time*.55)*12+Math.sin(time*1.1+p.phase)*4;p.vx+=(flow-p.vx)*dt*.7;p.x+=p.vx*dt;p.vy+=dt*1.1;p.y+=p.vy*dt;}
  leafDust=leafDust.filter(p=>p.age<p.max&&p.y<H+12);
}
function drawLeafDust(){
  g.save();for(const p of leafDust){const fade=Math.sin(Math.min(1,p.age/p.max)*Math.PI),rgb=LEAF_COLORS[p.shade];g.globalAlpha=fade*.65;g.fillStyle='rgb('+rgb.join(',')+')';g.beginPath();g.ellipse(p.x+Math.sin(time+p.phase)*1.8,p.y,p.r,p.r*.7,p.phase+time*.35,0,TAU);g.fill();}g.restore();
}
function update(dt){time+=dt;updateLeafDust(dt);if(!busy&&time>=nextIdle){if(birds.every(b=>b.state==='rest')){const pool=birds.filter(b=>b.y<H*.88);const first=pool[Math.floor(Math.random()*pool.length)];if(first){scatter(first);if(Math.random()<.38){const others=pool.filter(b=>b!==first&&Math.hypot(b.x-first.x,b.y-first.y)>35);if(others.length)scatter(others[Math.floor(Math.random()*others.length)],random(.55,1.15));}}}nextIdle=time+random(12,19);}for(const s of dust){s.life+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=dt*5}dust=dust.filter(s=>s.life<s.max);for(const m of motes){m.y-=m.speed*dt;m.x+=Math.sin(time*.3+m.phase)*dt*3;if(m.y<-10){m.y=H+10;m.x=random(0,W)}}for(const b of birds){if(b.state==='rest'){const p=wind(b.home);b.x=p.x;b.y=p.y;continue;}if(b.state==='waiting'){if(b.waitPerched){const p=wind(b.home);b.x=p.x;b.y=p.y;}b.delay-=dt;if(b.delay<=0){if(b.next==='wander')wander(b);else{const c=glyphPosition(b.letter);path(b,{x:b.x,y:b.y},{x:b.x-W*.09,y:b.y-H*.25},{x:c.x+W*.1,y:c.y-H*.09},{x:c.x-6,y:c.y-17},random(1.8,2.7),'fetch')}}continue;}
if(b.state==='return')b.end=wind(b.home);b.t=clamp(b.t+dt/b.duration);const t=b.t,p=cubic(b.start,b.c1,b.c2,b.end,b.state==='return'||b.state==='fetch'?ease(t):t);b.angle=Math.atan2(p.y-b.y,Math.abs(p.x-b.x)+.001)*.32;b.face=p.x>=b.x?1:-1;b.x=p.x;b.y=p.y;b.phase+=dt*10;if(b.state==='carry'){b.trail.push({x:b.x,y:b.y});if(b.trail.length>32)b.trail.shift();b.sparkTimer-=dt;if(b.sparkTimer<=0){burst(b.x,b.y+17,2);b.sparkTimer=.055}}else if(b.trail.length)b.trail.shift();
if(b.state==='carry')b.alpha=1-ease(clamp((t-.68)/.32));else if(b.state==='return')b.alpha=Math.min(1,b.alpha+dt*.7);
if(t>=1){if(b.state==='fetch'){b.letter.held=true;burst(b.x,b.y+20,22);path(b,{x:b.x,y:b.y},{x:b.x-W*.1,y:b.y-H*.12},{x:W*.32,y:H*.08},{x:W*.54,y:-70},5.2,'carry')}
else if(b.state==='carry'){b.letter.gone=true;b.letter=null;b.x=W*.85;b.y=-40;returnHome(b)}else if(b.state==='wander')returnHome(b);else if(b.state==='return'){b.state='rest';const p=wind(b.home);b.x=p.x;b.y=p.y;b.alpha=1;}}}
if(busy&&letters.every(c=>c.gone)){busy=false;letters=[];input.disabled=false;form.querySelector('button').disabled=false;form.classList.remove('busy');}}
function drawBird(b){g.save();g.translate(b.x,b.y);g.scale(b.size*b.face,b.size);g.globalAlpha=b.alpha*Math.max(.65,b.home.opacity);g.shadowColor='#92d5ff';g.shadowBlur=12;g.strokeStyle='#effbff';g.fillStyle='#effbff';g.lineWidth=.95;g.lineCap='round';if(b.state==='rest'||b.state==='waiting'){
// Narrow tapered silhouette with a small head and a close-folded wing.
g.shadowBlur=4;g.beginPath();g.moveTo(-10,4);g.bezierCurveTo(-7,-2,-5,-7,-2,-10);g.quadraticCurveTo(0,-12,3,-11);g.bezierCurveTo(4,-14,7,-15,8,-12);g.lineTo(11,-11);g.lineTo(8,-10);g.bezierCurveTo(6,-6,3,-4,0,-4);g.lineTo(-10,4);g.closePath();g.fill();g.shadowBlur=0;g.strokeStyle='rgba(106,168,204,.7)';g.lineWidth=.65;g.beginPath();g.moveTo(-4,-7);g.quadraticCurveTo(0,-5,4,-9);g.stroke();g.strokeStyle='rgba(230,247,255,.75)';g.lineWidth=.6;g.beginPath();g.moveTo(0,-4);g.lineTo(0,2);g.moveTo(2,-4);g.lineTo(2,2);g.stroke();
}else{g.rotate(b.angle*b.face);const flap=Math.sin(b.phase),wing=8+flap*10;g.beginPath();g.moveTo(-16,-wing);g.lineTo(-3,-1);g.lineTo(2,0);g.lineTo(12,-wing*.78);g.lineTo(5,1);g.lineTo(0,2);g.closePath();g.globalAlpha*=.85;g.fill();g.beginPath();g.moveTo(-6,2);g.lineTo(-10,5);g.moveTo(1,0);g.lineTo(7,1);g.stroke();}g.restore();}
function drawText(c,x,y,alpha,rot=0){g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha=alpha;g.fillStyle='#f6fbff';g.shadowColor='rgba(180,223,255,.55)';g.shadowBlur=6;g.font='300 '+c.font+'px "BirdSong",serif';g.textAlign='center';g.textBaseline='middle';g.fillText(c.char,0,0);g.restore();}
function sparkle(x,y,r,alpha,cross=false){g.globalAlpha=clamp(alpha);if(!cross&&r<1.2){g.fillStyle='#e6f5ff';g.beginPath();g.arc(x,y,Math.max(.45,r*.8),0,TAU);g.fill()}else{const size=(cross?16:11)*r;g.drawImage(starSprites[cross?1:0],x-size/2,y-size/2,size,size)}g.globalAlpha=1;}
function buildLayers(){const live=g;function layer(){const c=document.createElement('canvas');c.width=Math.ceil(W*D);c.height=Math.ceil(H*D);return c;}
backLayer=layer();g=backLayer.getContext('2d');g.scale(D,D);
const sky=g.createLinearGradient(0,0,W*.3,H);sky.addColorStop(0,'#0350e5');sky.addColorStop(.55,'#035ff1');sky.addColorStop(1,'#207ffb');g.fillStyle=sky;g.fillRect(0,0,W,H);
const mh=g.createRadialGradient(moon.x,moon.y,0,moon.x,moon.y,Math.max(W,H)*.55);mh.addColorStop(0,'rgba(194,229,255,.11)');mh.addColorStop(.4,'rgba(157,208,255,.035)');mh.addColorStop(1,'rgba(80,110,210,0)');g.fillStyle=mh;g.fillRect(0,0,W,H);
const vg=g.createLinearGradient(0,H*.7,0,H);vg.addColorStop(0,'rgba(6,10,32,0)');vg.addColorStop(1,'rgba(13,76,169,.06)');g.fillStyle=vg;g.fillRect(0,H*.7,W,H*.3);
g.lineWidth=1;for(const [k,a0,sw,al] of [[1.7,.4,3.6,.16],[2.5,2.2,2.8,.1]]){g.strokeStyle='rgba(200,225,255,'+al+')';g.beginPath();g.arc(moon.x,moon.y,moon.r*k,a0,a0+sw);g.stroke()}
// A smooth white crescent with a restrained light bloom.
g.save();g.translate(moon.x,moon.y);g.rotate(-.28);const r=moon.r,ix=r*.43,iy=-r*.15,ir=r*.94,dist=Math.hypot(ix,iy),axis=Math.atan2(iy,ix),half=Math.acos((r*r-ir*ir+dist*dist)/(2*r*dist)),bottom=axis+half,top=axis-half;const tx=r*Math.cos(top),ty=r*Math.sin(top),bx=r*Math.cos(bottom),by=r*Math.sin(bottom);g.beginPath();g.arc(0,0,r,bottom,top);g.arc(ix,iy,ir,Math.atan2(ty-iy,tx-ix),Math.atan2(by-iy,bx-ix),true);g.closePath();g.fillStyle='#f3faff';g.shadowColor='#a9d7ff';g.shadowBlur=21;g.fill();g.shadowBlur=7;g.fill();g.shadowBlur=0;
g.restore();

g=live;starSprites=[false,true].map(cross=>{const c=document.createElement('canvas');c.width=c.height=48;const k=c.getContext('2d');k.fillStyle='#e6f5ff';k.shadowColor='#8bccff';k.shadowBlur=cross?9:5;k.beginPath();k.arc(24,24,2,0,TAU);k.fill();if(cross){k.strokeStyle='#d9eeff';k.lineWidth=.7;k.beginPath();k.moveTo(15,24);k.lineTo(33,24);k.moveTo(24,15);k.lineTo(24,33);k.stroke()}return c;});}
function drawTree(){const k=wind;
g.save();g.lineCap='round';
for(let pass=0;pass<3;pass++)for(const b of branches){if(pass===0&&b.width<1)continue;const a=k(b.a),c1=k(b.b),c2=k(b.c),d=k(b.d);
g.strokeStyle=pass===0?'rgba(120,170,255,'+b.opacity*.06+')':pass===1?'rgba(150,200,255,'+b.opacity*.12+')':'rgba(238,249,255,'+Math.min(1,b.opacity*1.05)+')';
g.lineWidth=pass===0?b.width*5+2:pass===1?b.width*2.4+1:Math.max(.8,b.width*.95);g.beginPath();g.moveTo(a.x,a.y);g.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,d.x,d.y);g.stroke()}
for(let shade=0;shade<LEAF_COLORS.length;shade++){
  const color=LEAF_COLORS[shade];g.fillStyle='rgba('+color.join(',')+',.66)';g.beginPath();
  for(let i=shade;i<foliage.length;i+=LEAF_COLORS.length){
    const f=foliage[i],p=wind(f),length=f.r*2.8,width=f.r*.92;
    const angle=f.angle+Math.sin(time*.9+f.x*.015)*.2,ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;
    const ax=p.x-ux*length*.5,ay=p.y-uy*length*.5,bx=p.x+ux*length*.5,by=p.y+uy*length*.5;
    g.moveTo(ax,ay);g.quadraticCurveTo(p.x+nx*width,p.y+ny*width,bx,by);g.quadraticCurveTo(p.x-nx*width,p.y-ny*width,ax,ay);
  }g.fill();
}g.restore();}
function draw(){g.setTransform(D,0,0,D,0,0);g.drawImage(backLayer,0,0,W,H);
for(const s of stars){const tw=.2+.8*Math.pow(.5+.5*Math.sin(time*s.speed+s.phase),2);sparkle(s.x,s.y,s.r,s.a*tw,s.r>1.2)}
for(const m of motes)sparkle(m.x+Math.sin(time*.25+m.phase)*7,m.y,m.r,(.13+.17*Math.sin(time*.7+m.phase)**2));
drawTree();drawLeafDust();
for(let i=0;i<branches.length;i+=9){const b=branches[i];const p=wind(b.d);sparkle(p.x,p.y,1.1,b.opacity*(.35+.25*Math.sin(time+i)**2),i%27===0)}
for(const c of letters){if(c.held||c.gone)continue;const p=glyphPosition(c);drawText(c,p.x,p.y,clamp((time-c.born)*1.4),c.rotation+Math.sin(time*.6+c.phase)*.025);}
for(const b of birds){if(b.state==='carry'&&b.trail.length>2){g.save();g.strokeStyle='#b9e5ff';g.shadowColor='#88caff';g.shadowBlur=8;g.lineWidth=.7;g.globalAlpha=b.alpha*.22;g.beginPath();b.trail.forEach((p,i)=>g[i?'lineTo':'moveTo'](p.x,p.y));g.stroke();g.restore()}drawBird(b);if(b.state==='carry'&&b.letter){const sway=Math.sin(time*3+b.phase*.1)*3;drawText(b.letter,b.x+6+sway,b.y+18,b.alpha,Math.sin(time*3)*.13);}}
for(const p of dust){const f=p.life/p.max;sparkle(p.x,p.y,p.r*(1-f*.5),Math.sin(f*Math.PI)*.8,p.r>1.65)}
}
function positionForm(){
  const viewport=window.visualViewport;
  const inset=viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;
  form.style.transform='translate(-50%,'+(-inset)+'px)';
}
function resizeScene(){
  positionForm();
  const width=innerWidth||document.documentElement.clientWidth||360;
  const height=innerHeight||document.documentElement.clientHeight||640;
  const widthChanged=Math.abs(width-sceneWidth)>2;
  const reducedByKeyboard=keyboardSession&&!widthChanged&&height<sceneHeight*.85;
  if(reducedByKeyboard){pendingViewportResize=false;return;}
  if(keyboardSession&&height>=sceneHeight*.85)keyboardSession=document.activeElement===input;
  if(!widthChanged&&busy){pendingViewportResize=Math.abs(height-sceneHeight)>2;return;}
  pendingViewportResize=false;
  if(widthChanged||Math.abs(height-sceneHeight)>2){sceneWidth=width;sceneHeight=height;setup();}
}
input.addEventListener('focus',()=>{keyboardSession=true;positionForm()});
input.addEventListener('blur',positionForm);
if(window.visualViewport&&typeof window.visualViewport.addEventListener==='function'){
  window.visualViewport.addEventListener('resize',positionForm);
  window.visualViewport.addEventListener('scroll',positionForm);
}
let animationId=0;
function frame(ms){
  if(document.hidden){animationId=0;last=0;return;}
  const dt=Math.min(.04,(ms-last)/1000)||.016;last=ms;update(dt);
  if(pendingViewportResize&&!busy)resizeScene();
  draw();animationId=requestAnimationFrame(frame);
}
let resizeTimer;
addEventListener('resize',()=>{positionForm();clearTimeout(resizeTimer);resizeTimer=setTimeout(resizeScene,150)});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(animationId);animationId=0;last=0;}
  else if(!animationId){last=0;positionForm();animationId=requestAnimationFrame(frame);}
});
function prepareFont(){
  input.disabled=true;form.querySelector('button').disabled=true;
  function unlock(status){fontReady=true;cv.dataset.fontStatus=status;input.disabled=busy;form.querySelector('button').disabled=busy;}
  if(document.fonts&&typeof document.fonts.load==='function'){
    document.fonts.load('300 18px "BirdSong"','把心事交给鸟').then(fonts=>unlock(fonts&&fonts.length?'loaded':'fallback'),()=>unlock('fallback'));
  }else{unlock('fallback');}
}
setup();positionForm();prepareFont();if(!document.hidden)animationId=requestAnimationFrame(frame);
})();

