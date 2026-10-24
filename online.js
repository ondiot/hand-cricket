(() => {
 const cfg=window.HAND_CRICKET_SUPABASE||{}; let db=null,uid=null,room=null,channel=null,players=[],sending=false;
 const $=id=>document.getElementById(id), name=()=>(( $('playerName').value||'Player').trim().slice(0,20)||'Player');
 async function init(){
  if(!cfg.url||cfg.url.includes('YOUR_')||!cfg.anonKey||cfg.anonKey.includes('YOUR_'))throw Error('Set your Supabase URL and publishable/anon key in config.js.');
  if(!db)db=supabase.createClient(cfg.url,cfg.anonKey);
  let s=await db.auth.getSession();if(s.error)throw s.error;
  if(s.data.session){uid=s.data.session.user.id;return;}
  let a=await db.auth.signInAnonymously();if(a.error)throw Error(a.error.message+' — enable Anonymous Sign-Ins in Supabase.');uid=a.data.user.id;
 }
 function msg(t){$('onlineMessage').textContent=t;}
 window.showOnlineSetup=()=>{$('menu').hidden=true;$('onlineSetup').hidden=false;msg('');};
 window.hideOnlineSetup=()=>{$('onlineSetup').hidden=true;$('menu').hidden=false;};
 window.createOnlineRoom=async()=>{try{msg('Connecting…');await init();let r=await db.rpc('hc_create_room',{p_name:name(),p_max:Number($('maxPlayers').value),p_teams:Number($('teamCount').value)});if(r.error)throw r.error;room=r.data;await openRoom();}catch(e){msg(e.message);}};
 window.joinOnlineRoom=async()=>{try{msg('Joining…');await init();let code=$('joinCode').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code))throw Error('Enter the six-character room code.');let r=await db.rpc('hc_join_room',{p_code:code,p_name:name()});if(r.error)throw r.error;room=r.data;await openRoom();}catch(e){msg(e.message);}};
 async function openRoom(){$('onlineSetup').hidden=true;$('roomPanel').hidden=false;$('roomCodeDisplay').textContent=room.code;if(channel)await db.removeChannel(channel);channel=db.channel('hc-'+room.id).on('postgres_changes',{event:'*',schema:'public',table:'hc_rooms',filter:'id=eq.'+room.id},refresh).on('postgres_changes',{event:'*',schema:'public',table:'hc_room_players',filter:'room_id=eq.'+room.id},refresh).subscribe();await refresh();}
 async function refresh(){
  if(!room)return;let r=await db.from('hc_rooms').select('*').eq('id',room.id).maybeSingle();if(r.error){$('roomStatus').textContent=r.error.message;return;}if(!r.data)return;room=r.data;
  let p=await db.from('hc_room_players').select('user_id,display_name,team_no,joined_at').eq('room_id',room.id).order('joined_at');if(p.error){$('roomStatus').textContent=p.error.message;return;}players=p.data||[];
  $('roomPlayers').replaceChildren();players.forEach(x=>{let row=document.createElement('div');row.className='player-row';let a=document.createElement('span');a.textContent=x.display_name+(x.user_id===room.host_id?' · Host':'')+(x.user_id===uid?' · You':'');let b=document.createElement('small');b.textContent='Team '+x.team_no;row.append(a,b);$('roomPlayers').append(row);});
  $('roomRules').textContent=room.max_players+' slots · '+room.team_count+' teams · '+players.length+'/'+room.max_players+' joined';$('startOnlineButton').hidden=room.host_id!==uid||room.status!=='lobby';$('roomStatus').textContent=room.status==='lobby'?'Waiting for players…':'Match in progress · Round '+(room.state?.round||1);
  if(room.status==='playing'){$('roomPanel').hidden=true;$('menu').hidden=true;$('result').hidden=true;$('topbar').hidden=false;mode='online';document.querySelector('.p2c').classList.add('off');$('pn1').textContent=name();$('pn2').textContent='Team match';$('opponentLabel').textContent='Teams';let own=players.find(x=>x.user_id===uid),scores=room.state?.scores||{};$('yS').textContent=scores[own?.team_no]||0;$('pS').textContent=Object.entries(scores).filter(([t])=>Number(t)!==Number(own?.team_no||1)).reduce((n,[,v])=>n+Number(v||0),0);$('inn').textContent='Team round '+(room.state?.round||1);$('tgt').textContent=Object.keys(room.state?.picks||{}).length+' / '+players.length+' picks submitted';}
 }
 window.startOnlineMatch=async()=>{let r=await db.rpc('hc_start_room',{p_room_id:room.id});if(r.error){$('roomStatus').textContent=r.error.message;return;}room=r.data;await refresh();};
 window.copyRoomCode=async()=>{try{await navigator.clipboard.writeText(room.code);$('roomStatus').textContent='Code copied.';}catch{$('roomStatus').textContent='Room code: '+room.code;}};
 window.leaveOnlineRoom=async()=>{if(channel&&db)await db.removeChannel(channel);channel=null;room=null;$('roomPanel').hidden=true;$('onlineSetup').hidden=true;$('topbar').hidden=true;$('menu').hidden=false;mode='pc';resetHands();unlock();};
 const originalPress=window.press;window.press=async function(p,n){
  if(mode!=='online')return originalPress(p,n);if(p!==1||sending||!room||room.status!=='playing')return;
  if(room.state?.picks?.[uid]){banner('Pick already sent');return;}sending=true;show(1,n);$('c1').parentElement.classList.add('off');
  try{let r=await db.rpc('hc_submit_pick',{p_room_id:room.id,p_value:n});if(r.error)throw r.error;room=r.data;banner('Pick locked');await refresh();}catch(e){banner('Pick failed');$('tgt').textContent=e.message;}finally{sending=false;$('c1').parentElement.classList.remove('off');}
 };
 const originalStart=window.startGame;window.startGame=function(m){if(m==='pc'){if(room)window.leaveOnlineRoom();originalStart(m);$('opponentLabel').textContent='PC';}else originalStart(m);};
 const originalMenu=window.openMenu;window.openMenu=function(){if(room){if(room.status==='lobby')$('roomPanel').hidden=false;else $('roomPanel').hidden=false;$('topbar').hidden=true;}else originalMenu();};
})();