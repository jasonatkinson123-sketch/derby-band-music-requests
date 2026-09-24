(() => {
  const CONFIG = window.DERBY_MUSIC_CONFIG || {};
  const API_URL = (CONFIG.API_URL || '').trim();
  const GOOGLE_FORM_URL = (CONFIG.GOOGLE_FORM_URL || '').trim();
  const GOOGLE_FORM_FIELDS = CONFIG.GOOGLE_FORM_FIELDS || {};
  const FORM_MODE = Boolean(
    GOOGLE_FORM_URL &&
    GOOGLE_FORM_FIELDS.name &&
    GOOGLE_FORM_FIELDS.grade &&
    GOOGLE_FORM_FIELDS.piece &&
    GOOGLE_FORM_FIELDS.instrument
  );
  const INSTRUMENTS = ['Flute','Oboe','Bassoon','Clarinet','Bass Clarinet','Alto Saxophone','Tenor Saxophone','Baritone Saxophone','Trumpet','French Horn','Trombone','Baritone','Tuba','Electric Bass','Percussion','Mallets / Bells'];
  const SEED_PIECES = [
    {id:'beginner', title:'Beginner', grades:[6,7,8], active:true},
    {id:'power', title:'Power', grades:[6,7,8], active:true},
    {id:'dragon-slayer', title:'Dragon Slayer', grades:[6,7,8], active:true},
    {id:'alpha-squadron', title:'Alpha Squadron', grades:[6,7,8], active:true},
    {id:'jester-dance', title:'Jester Dance', grades:[6,7,8], active:true},
    {id:'midnight-madness', title:'Midnight Madness', grades:[7,8], active:true},
    {id:'might-of-hercules', title:'The Might of Hercules', grades:[7,8], active:true},
    {id:'rise-of-bladesmith', title:'Rise of the Bladesmith', grades:[7,8], active:true},
    {id:'star-wars', title:'Star Wars', grades:[7,8], active:true},
    {id:'tenth-planet', title:'The Tenth Planet', grades:[7,8], active:true},
    {id:'shine', title:'Shine', grades:[7,8], active:true},
    {id:'falcons-flight', title:"Falcon's Flight March", grades:[7,8], active:true},
    {id:'mechanical-monsters', title:'Mechanical Monsters', grades:[7,8], active:true},
    {id:'wrath-mechanical', title:'Wrath of the Mechanical Monsters', grades:[7,8], active:true},
    {id:'tempest', title:'The Tempest', grades:[7,8], active:true},
    {id:'valiance', title:'Valiance', grades:[7,8], active:true},
    {id:'engines-resistance', title:'Engines of Resistance', grades:[7,8], active:true},
    {id:'conquer-kraken', title:'To Conquer the Kraken', grades:[7,8], active:true},
    {id:'snakebite', title:'Snakebite!', grades:[7,8], active:true}
  ];

  const app = document.getElementById('studentApp');
  const teacherButton = document.getElementById('teacherButton');
  const teacherDialog = document.getElementById('teacherDialog');
  const teacherApp = document.getElementById('teacherApp');
  const state = { grade:null, name:'', piece:null, instrument:null, pieces:[...SEED_PIECES], adminKey:'', requests:[] };

  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  function jsonp(params){
    return new Promise((resolve,reject)=>{
      if(!API_URL) return reject(new Error('API not configured'));
      const cb='derbyCb_'+Date.now()+'_'+Math.floor(Math.random()*10000);
      const script=document.createElement('script');
      const timer=setTimeout(()=>done(new Error('Request timed out')),8000);
      const done=(err,data)=>{clearTimeout(timer);delete window[cb];script.remove();err?reject(err):resolve(data)};
      window[cb]=data=>done(null,data);
      script.onerror=()=>done(new Error('Could not reach request service'));
      const q=new URLSearchParams({...params,callback:cb});
      script.src=API_URL+'?'+q.toString();
      document.body.appendChild(script);
    });
  }

  function postForm(fields){
    if(!API_URL) return false;
    const form=document.createElement('form');
    form.method='POST';form.action=API_URL;form.target='writeTarget';form.style.display='none';
    Object.entries(fields).forEach(([k,v])=>{const input=document.createElement('input');input.name=k;input.value=String(v);form.appendChild(input)});
    document.body.appendChild(form);form.submit();setTimeout(()=>form.remove(),1000);return true;
  }
  function renderStart(){
    state.grade=null;state.piece=null;state.instrument=null;
    app.innerHTML=`<h2 class="screen-title">NEED REPLACEMENT MUSIC?</h2><p class="screen-subtitle">Choose your grade.</p><div class="grid grade-grid">${[6,7,8].map(g=>`<button class="pixel-button grade" data-grade="${g}"><strong>${g}</strong>GRADE</button>`).join('')}</div>${(!API_URL&&!FORM_MODE)?'<div class="notice">Demo mode: requests are not connected yet.</div>':''}`;
    app.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{state.grade=Number(b.dataset.grade);renderName()});
  }

  function renderName(){
    app.innerHTML=`<button class="action secondary back" id="backStart">← BACK</button><h2 class="screen-title">${state.grade}TH GRADE</h2><p class="screen-subtitle">Who needs the replacement copy?</p><div class="field"><label for="studentName">YOUR NAME</label><input id="studentName" maxlength="60" autocomplete="name" placeholder="First name + last initial" value="${esc(state.name)}"></div><div class="action-row"><button class="action primary" id="nextPieces">CHOOSE PIECE →</button></div>`;
    document.getElementById('backStart').onclick=renderStart;
    document.getElementById('nextPieces').onclick=()=>{const n=document.getElementById('studentName').value.trim();if(!n){document.getElementById('studentName').focus();return}state.name=n;renderPieces()};
  }

  function renderPieces(){
    const pieces=state.pieces.filter(p=>p.active!==false && p.grades.includes(state.grade)).sort((a,b)=>a.title.localeCompare(b.title));
    app.innerHTML=`<button class="action secondary back" id="backName">← BACK</button><h2 class="screen-title">CHOOSE YOUR PIECE</h2><div class="chip-row"><span class="chip">${state.grade}th grade</span><span class="chip">${esc(state.name)}</span></div><div class="grid piece-grid">${pieces.map(p=>`<button class="pixel-button piece" data-piece="${esc(p.id)}">${esc(p.title)}</button>`).join('')}</div>`;
    document.getElementById('backName').onclick=renderName;
    app.querySelectorAll('[data-piece]').forEach(b=>b.onclick=()=>{state.piece=state.pieces.find(p=>p.id===b.dataset.piece);renderInstruments()});
  }

  function renderInstruments(){
    state.instrument=null;
    app.innerHTML=`<button class="action secondary back" id="backPieces">← BACK</button><h2 class="screen-title">CHOOSE YOUR INSTRUMENT</h2><p class="screen-subtitle">Tap your instrument, then continue to the Google Form.</p><div class="chip-row"><span class="chip">${esc(state.name)}</span><span class="chip">${esc(state.piece.title)}</span></div><div class="grid instrument-grid">${INSTRUMENTS.map(i=>`<button class="pixel-button instrument" data-instrument="${esc(i)}">${esc(i)}</button>`).join('')}</div><div class="send-dock" id="sendDock"><div id="selectedInstrument" class="selected-instrument">No instrument selected</div><button class="action primary send-request" id="sendRequest" disabled>CONTINUE TO FORM</button></div>`;
    document.getElementById('backPieces').onclick=renderPieces;
    const sendButton=document.getElementById('sendRequest');
    app.querySelectorAll('[data-instrument]').forEach(b=>b.onclick=()=>{
      state.instrument=b.dataset.instrument;
      app.querySelectorAll('[data-instrument]').forEach(x=>x.classList.toggle('selected',x===b));
      document.getElementById('selectedInstrument').textContent=state.instrument+' selected';
      sendButton.disabled=false;
    });
    sendButton.onclick=submitRequest;
  }

  function renderConfirm(){
    app.innerHTML=`<button class="action secondary back" id="backInst">← BACK</button><h2 class="screen-title">CHECK YOUR REQUEST</h2><div class="card"><p><strong>${esc(state.name)}</strong></p><p>${state.grade}th Grade</p><p>${esc(state.piece.title)}</p><p>${esc(state.instrument)}</p></div><div class="notice">Your replacement copy will be ready at the next rehearsal. Keep playing from a neighbor's copy today.</div><div class="action-row"><button class="action primary" id="sendRequest">REQUEST MUSIC</button></div>`;
    document.getElementById('backInst').onclick=renderInstruments;
    document.getElementById('sendRequest').onclick=submitRequest;
  }

  function submitRequest(){
    if(!state.instrument) return;
    if(FORM_MODE){
      const url=new URL(GOOGLE_FORM_URL);
      url.searchParams.set('usp','pp_url');
      url.searchParams.set(GOOGLE_FORM_FIELDS.name,state.name);
      url.searchParams.set(GOOGLE_FORM_FIELDS.grade,String(state.grade));
      url.searchParams.set(GOOGLE_FORM_FIELDS.piece,state.piece.title);
      url.searchParams.set(GOOGLE_FORM_FIELDS.instrument,state.instrument);
      window.location.assign(url.toString());
      return;
    }
    const ok=postForm({action:'request',name:state.name,grade:state.grade,piece:state.piece.title,pieceId:state.piece.id,instrument:state.instrument});
    app.innerHTML=`<div class="confirmation"><div class="confirm-icon">✓</div><h2>${ok?'REQUEST SENT!':'DEMO REQUEST SAVED'}</h2><p>${esc(state.piece.title)} — ${esc(state.instrument)}</p><p>Your replacement music will be ready at the next rehearsal.</p><button class="action primary" id="another">DONE</button></div>`;
    document.getElementById('another').onclick=()=>{state.name='';renderStart()};
  }

  async function loadPieces(){
    if(!API_URL){renderStart();return;}
    try{const data=await jsonp({action:'bootstrap'});if(data?.pieces?.length)state.pieces=data.pieces;}catch(e){console.warn(e)}
    renderStart();
  }
  if(FORM_MODE && !API_URL){
    teacherButton.style.display='none';
  } else {
    teacherButton.onclick=()=>{teacherDialog.showModal();renderTeacherLogin()};
  }
  teacherDialog.addEventListener('click',e=>{if(e.target===teacherDialog)teacherDialog.close()});

  function renderTeacherLogin(){
    teacherApp.innerHTML=`<div class="teacher-wrap"><div class="teacher-head"><h2>TEACHER MODE</h2><button class="action" id="closeTeacher">CLOSE</button></div><div class="card"><div class="field"><label for="adminKey">ADMIN PIN</label><input id="adminKey" type="password" inputmode="numeric" autocomplete="off" placeholder="Teacher PIN"></div><div class="action-row"><button class="action primary" id="teacherGo">OPEN DASHBOARD</button></div><div id="teacherError"></div></div></div>`;
    document.getElementById('closeTeacher').onclick=()=>teacherDialog.close();
    document.getElementById('teacherGo').onclick=async()=>{
      const key=document.getElementById('adminKey').value.trim();
      if(!key)return;
      state.adminKey=key;
      if(!API_URL){renderTeacherDashboard();return;}
      try{const data=await jsonp({action:'requests',key});if(data?.error)throw new Error(data.error);state.requests=data.requests||[];renderTeacherDashboard();}catch(e){document.getElementById('teacherError').innerHTML=`<div class="notice error">${esc(e.message||'Could not open dashboard')}</div>`;}
    };
  }

  function renderTeacherDashboard(){
    teacherApp.innerHTML=`<div class="teacher-wrap"><div class="teacher-head"><div><h2>MUSIC REQUEST QUEUE</h2><div class="small">${API_URL?'Live queue':'Demo mode'}</div></div><button class="action" id="closeTeacher">CLOSE</button></div><div class="tabs"><button class="action tab active" id="requestsTab">REQUESTS</button><button class="action tab" id="piecesTab">PIECES</button></div><div id="adminBody"></div></div>`;
    document.getElementById('closeTeacher').onclick=()=>teacherDialog.close();
    document.getElementById('requestsTab').onclick=()=>{document.getElementById('requestsTab').classList.add('active');document.getElementById('piecesTab').classList.remove('active');renderRequestsAdmin()};
    document.getElementById('piecesTab').onclick=()=>{document.getElementById('piecesTab').classList.add('active');document.getElementById('requestsTab').classList.remove('active');renderPiecesAdmin()};
    renderRequestsAdmin();
  }

  async function refreshRequests(){
    if(!API_URL)return;
    try{const data=await jsonp({action:'requests',key:state.adminKey});if(data?.error)throw new Error(data.error);state.requests=data.requests||[];renderRequestsAdmin();}catch(e){alert(e.message||'Could not refresh requests')}
  }

  function renderRequestsAdmin(){
    const body=document.getElementById('adminBody');if(!body)return;
    const open=state.requests.filter(r=>String(r.status||'OPEN').toUpperCase()!=='PRINTED');
    body.innerHTML=`<div class="admin-grid"><section class="card"><h3>TODAY'S REQUESTS — ${open.length}</h3><div class="request-list">${open.length?open.map(r=>`<div class="request"><input type="checkbox" data-req="${esc(r.id)}"><div><strong>${esc(r.name)}</strong> — ${esc(r.piece)}<div class="meta">Grade ${esc(r.grade)} · ${esc(r.instrument)} · ${esc(r.time||'')}</div></div><span>#${esc(r.id)}</span></div>`).join(''):'<p>No open requests.</p>'}</div></section><aside class="card"><h3>QUEUE TOOLS</h3><div class="action-row"><button class="action primary" id="markPrinted">MARK CHECKED PRINTED</button><button class="action" id="copyQueue">COPY QUEUE</button><button class="action" id="refreshQueue">REFRESH</button></div><p class="small">Copy Queue gives you a clean list you can paste into ChatGPT for one replacement packet.</p></aside></div>`;
    document.getElementById('refreshQueue').onclick=refreshRequests;
    document.getElementById('copyQueue').onclick=async()=>{const text=open.map(r=>`${r.name} — Grade ${r.grade} — ${r.piece} — ${r.instrument}`).join('\n');await navigator.clipboard.writeText(text||'No open requests.');document.getElementById('copyQueue').textContent='COPIED!';setTimeout(()=>document.getElementById('copyQueue').textContent='COPY QUEUE',1200)};
    document.getElementById('markPrinted').onclick=()=>{const ids=[...body.querySelectorAll('[data-req]:checked')].map(x=>x.dataset.req);if(!ids.length)return;if(API_URL)postForm({action:'markPrinted',key:state.adminKey,ids:ids.join(',')});state.requests=state.requests.map(r=>ids.includes(String(r.id))?{...r,status:'PRINTED'}:r);renderRequestsAdmin()};
  }
  function renderPiecesAdmin(){
    const body=document.getElementById('adminBody');if(!body)return;
    body.innerHTML=`<div class="admin-grid"><section class="card"><h3>ACTIVE PIECES</h3><div class="piece-admin-list">${state.pieces.slice().sort((a,b)=>a.title.localeCompare(b.title)).map(p=>`<div class="piece-row"><div><strong>${esc(p.title)}</strong><div class="small">Grades ${p.grades.join(', ')}</div></div><span>${p.active===false?'OFF':'ON'}</span><button class="action danger" data-remove-piece="${esc(p.id)}">REMOVE</button></div>`).join('')}</div></section><aside class="card"><h3>ADD A PIECE</h3><div class="field"><label for="newPieceTitle">TITLE</label><input id="newPieceTitle" placeholder="Piece title"></div><label>SHOW FOR GRADES</label><div class="checkbox-row"><label><input type="checkbox" value="6" class="newGrade"> 6</label><label><input type="checkbox" value="7" class="newGrade"> 7</label><label><input type="checkbox" value="8" class="newGrade"> 8</label></div><div class="action-row"><button class="action primary" id="addPiece">ADD PIECE</button></div><p class="small">New pieces appear for students as soon as the live request service is connected.</p></aside></div>`;
    document.getElementById('addPiece').onclick=()=>{const title=document.getElementById('newPieceTitle').value.trim();const grades=[...body.querySelectorAll('.newGrade:checked')].map(x=>Number(x.value));if(!title||!grades.length)return;const piece={id:slug(title)+'-'+Date.now(),title,grades,active:true};state.pieces.push(piece);if(API_URL)postForm({action:'addPiece',key:state.adminKey,id:piece.id,title:piece.title,grades:piece.grades.join(',')});renderPiecesAdmin()};
    body.querySelectorAll('[data-remove-piece]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.removePiece;state.pieces=state.pieces.filter(p=>p.id!==id);if(API_URL)postForm({action:'removePiece',key:state.adminKey,id});renderPiecesAdmin()});
  }

  loadPieces();
})();