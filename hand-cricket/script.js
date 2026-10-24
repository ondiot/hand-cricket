const skins=[{c:'#f1c27d',p:'#f9dcae'},{c:'#c68642',p:'#e0a56a'}];
const FACES=[
 ['f',0,0,1,'translateZ(D)',1],['k',0,0,1,'rotateY(180deg) translateZ(D)',.7],
 ['r',1,0,0,'rotateY(90deg) translateZ(W)',.85],['l',1,0,0,'rotateY(-90deg) translateZ(W)',.85],
 ['t',0,1,0,'rotateX(90deg) translateZ(H)',1.15],['b',0,1,0,'rotateX(-90deg) translateZ(H)',.6]];
function box(w,h,d,c,front){
  const b=document.createElement('div');b.className='box';
  [['f',w,h,`translateZ(${d/2}px)`,1],['k',w,h,`rotateY(180deg) translateZ(${d/2}px)`,.7],
   ['r',d,h,`rotateY(90deg) translateZ(${w/2}px)`,.85],['l',d,h,`rotateY(-90deg) translateZ(${w/2}px)`,.85],
   ['t',w,d,`rotateX(90deg) translateZ(${h/2}px)`,1.15],['b',w,d,`rotateX(-90deg) translateZ(${h/2}px)`,.6]
  ].forEach(([n,fw,fh,tf,br])=>{
    const f=document.createElement('div');f.className='face';
    f.style.cssText=`width:${fw}px;height:${fh}px;margin:${-fh/2}px 0 0 ${-fw/2}px;background:${n==='f'&&front?front:c};filter:brightness(${br});transform:${tf}`;
    b.appendChild(f);
  });
  return b;
}
function part(x,y,len,th,rot,c){
  const pos=document.createElement('div');pos.className='pos';
  pos.style.transform=`translate3d(${x}px,${y}px,0) rotateZ(${rot}deg)`;
  const sc=document.createElement('div');sc.className='sc';
  const bx=box(len,th,th,c);bx.style.transform=`translateX(${len/2}px)`;
  sc.appendChild(bx);pos.appendChild(sc);return pos;
}
function buildHand(p){
  const s=skins[p-1];
  const mirror=document.createElement('div');mirror.className='mirror';
  const rig=document.createElement('div');rig.className='rig';rig.style.cssText='position:absolute;left:0;top:0;width:0;height:0';
  const palm=box(90,100,44,s.c,s.p);
  rig.appendChild(palm);
  [-36,-12,12,36].forEach(y=>rig.appendChild(part(45,y,80,22,0,s.c)));
  rig.appendChild(part(-18,-62,64,22,-22,s.c));
  mirror.appendChild(rig);
  document.getElementById('h'+p).appendChild(mirror);
}
const timers={1:[],2:[]},busy={1:false,2:false};
const THUMB=r=>`translate3d(-18px,-62px,0) rotateZ(${r}deg)`;
function show(p,n){
  if(busy[p])return;
  const hand=document.getElementById('h'+p),badge=document.getElementById('b'+p);
  const rig=hand.querySelector('.rig'),fingers=[...hand.querySelectorAll('.sc')],thumb=hand.querySelectorAll('.pos')[4];
  const T=(ms,fn)=>timers[p].push(setTimeout(fn,ms));
  const fast=true;
  hand.style.transitionDuration=fast?'.18s':'';
  rig.style.transitionDuration=fast?'.2s':'';
  fingers.forEach(f=>{f.style.transition=fast?'none':''});
  timers[p].forEach(clearTimeout);timers[p]=[];
  fingers.forEach(f=>f.classList.remove('up'));
  badge.classList.remove('on');
  rig.style.transform='';thumb.style.transform=THUMB(-22);
  hand.style.transform='translateX(0)';
  const dist=document.getElementById('stage').clientWidth*0.12*(p===1?1:-1);
  T(60,()=>{hand.style.transform=`translateX(${dist}px)`});
  const open=k=>{for(let i=0;i<k;i++)T(500+i*130,()=>fingers[i].classList.add('up'))};
  const tag=ms=>T(ms,()=>{badge.textContent=n;badge.classList.add('on')});
  const openN=k=>{for(let i=0;i<k;i++)fingers[i].classList.add('up')};
  if(n<=4){T(250,()=>chop(p,800,()=>openN(n),()=>tag(0)));}
  else if(n===5){T(250,()=>chop(p,800,()=>openN(5),()=>tag(0),90));}
  else if(n===6){T(250,()=>chop(p,800,()=>{thumb.style.transform=THUMB(-85);fingers[4].classList.add('up')},()=>{rig.style.transform='translateY(22px)';tag(250)}));}
  else if(n===20){T(250,()=>chop(p,800,()=>openN(5),()=>tag(0)));}
  else if(n===10){T(250,()=>chop(p,800,()=>openN(5),()=>tag(0),-90));}
}
function slam(p,dur=1500,after){
  if(busy[p])return;busy[p]=true;
  const rig=document.querySelector('#h'+p+' .rig');
  const k=(z,x,o)=>({transform:`rotateZ(${z}deg) rotateX(${x}deg)`,offset:o});
  const an=rig.animate([k(0,0,0),k(-38,-18,.28),k(7,-90,.46),k(-7,-82,.54),k(1,-90,.62),k(0,-90,1)],
    {duration:dur,easing:'ease-in-out'});
  rig.style.transition='none';rig.style.transform='rotateX(-90deg)';
  an.onfinish=()=>{busy[p]=false;rig.style.transition='';if(after)after()};
  setTimeout(()=>document.getElementById('stage').animate(
    [{transform:'translateY(0)'},{transform:'translateY(7px)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}],{duration:240}),dur*.46);
}
function chop(p,dur=800,mid,after,endX=0){
  if(busy[p])return;busy[p]=true;
  const rig=document.querySelector('#h'+p+' .rig');
  rig.style.transformOrigin='-45px 0px';
  if(endX){rig.style.transition='none';rig.style.transform=`rotateX(${endX}deg)`}
  const k=(z,o,x=0)=>({transform:`rotateZ(${z}deg) rotateX(${x}deg)`,offset:o});
  const an=rig.animate([k(0,0,0),k(-42,.35,0),k(8,.65,endX),k(0,1,endX)],{duration:dur,easing:'ease-in-out'});
  an.onfinish=()=>{busy[p]=false;rig.style.transformOrigin='';rig.style.transition='';if(after)after()};
  setTimeout(()=>{if(mid)mid()},dur*.45);
}
function fit(){document.querySelectorAll('.side').forEach(s=>s.style.setProperty('--s',Math.min(1,Math.max(.42,s.clientWidth/300))))}
[1,2].forEach(p=>{
  buildHand(p);
  const c=document.getElementById('c'+p);
  [1,2,3,4,5,6,10,20].forEach(n=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>press(p,n);c.appendChild(b)});
});
const VALS=[1,2,3,4,5,6,10,20];
let mode='free',G=null,locked=false;
const $=id=>document.getElementById(id);
function resetHands(){[1,2].forEach(p=>{const h=$('h'+p);timers[p].forEach(clearTimeout);timers[p]=[];busy[p]=false;h.style.transform='translateX(0)';h.querySelector('.rig').style.transform='';h.querySelectorAll('.sc').forEach(f=>f.classList.remove('up'));h.querySelectorAll('.pos')[4].style.transform=THUMB(-22);$('b'+p).classList.remove('on')})}
function openMenu(){$('menu').hidden=false;$('result').hidden=true}
function banner(t,ms=1200){const b=$('banner');b.textContent=t;b.classList.add('on');setTimeout(()=>b.classList.remove('on'),ms)}
function unlock(){locked=false;$('c1').parentElement.classList.remove('off')}
function startGame(m){
  mode=m;$('menu').hidden=true;$('result').hidden=true;resetHands();
  $('topbar').hidden=(m!=='pc');
  $('pn1').textContent=m==='pc'?'You':'Player 1';
  $('pn2').textContent=m==='pc'?'PC':'Player 2';
  document.querySelector('.p2c').classList.toggle('off',m==='pc');
  unlock();
  if(m==='pc'){G={inn:1,you:0,pc:0,target:null};render()}
}
function render(){
  $('yS').textContent=G.you;$('pS').textContent=G.pc;
  const bat=G.inn===1?G.you:G.pc;
  $('inn').textContent=G.inn===1?'Innings 1 \u00b7 You bat':'Innings 2 \u00b7 PC bats';
  if(G.target==null){$('tgt').textContent='Pick a number to bat';$('meterFill').style.width=Math.min(100,bat/50*100)+'%'}
  else{$('tgt').textContent=`Target ${G.target} \u00b7 PC needs ${Math.max(0,G.target-bat)} \u00b7 pick a number to bowl`;$('meterFill').style.width=Math.min(100,bat/G.target*100)+'%'}
}
const V=40,DECAY=.9,EPS=.15;
let AI=null;
try{AI=JSON.parse(localStorage.getItem('hcAI'))}catch(e){}
if(!AI||!AI.bat||!AI.bowl)AI={bat:{},bowl:{},sb:0,sw:0};
VALS.forEach(v=>{AI.bat[v]=AI.bat[v]??1;AI.bowl[v]=AI.bowl[v]??1});
function aiSave(){try{localStorage.setItem('hcAI',JSON.stringify(AI))}catch(e){}}
function aiNorm(t){const s=VALS.reduce((a,v)=>a+t[v],0);return v=>t[v]/s}
function aiSample(w){let r=Math.random()*VALS.reduce((a,v)=>a+w(v),0);for(const v of VALS){r-=w(v);if(r<=0)return v}return 20}
function aiPick(){
  const bowling=G.inn===1;
  const seen=bowling?AI.sb:AI.sw;
  if(seen<5||Math.random()<EPS)return aiSample(bowling?(u=>u/(u+V)):(v=>1/(v+V)));
  if(bowling){const p=aiNorm(AI.bat);return VALS.reduce((b,u)=>p(u)*(u+V)>p(b)*(b+V)?u:b)}
  const q=aiNorm(AI.bowl);
  return VALS.reduce((b,v)=>(1-q(v))*(v+V)>(1-q(b))*(b+V)?v:b);
}
function aiLearn(n){
  const t=G.inn===1?AI.bat:AI.bowl;
  VALS.forEach(v=>t[v]*=DECAY);t[n]+=1;
  if(G.inn===1)AI.sb++;else AI.sw++;
  aiSave();
}
function press(p,n){
  if(mode!=='pc'){show(p,n);return}
  if(p!==1||locked||!G)return;
  locked=true;$('c1').parentElement.classList.add('off');
  const pc=aiPick();aiLearn(n);
  show(1,n);show(2,pc);
  setTimeout(()=>resolve(n,pc),1500);
}
function resolve(y,c){
  if(y===c){
    banner('OUT!',1300);
    setTimeout(()=>{
      if(G.inn===1){G.inn=2;G.target=G.you+1;render();resetHands();banner('PC needs '+G.target,1300);setTimeout(unlock,1300)}
      else finish();
    },1400);
    return;
  }
  if(G.inn===1)G.you+=y;else G.pc+=c;
  render();
  if(G.inn===2&&G.pc>=G.target){finish();return}
  unlock();
}
function finish(){
  $('resT').textContent=G.you===G.pc?'It\u2019s a tie!':(G.you>G.pc?'You win! \ud83c\udf89':'PC wins');
  $('resS').textContent=`You ${G.you} \u2013 PC ${G.pc}`;
  $('result').hidden=false;
}
fit();addEventListener('resize',fit);
