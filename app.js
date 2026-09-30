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

  const BUILTIN_FALLBACK = [
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
    {id:'mechanical-monsters', title:'Mechanical Monsters', grades:[6,7,8], active:true},
    {id:'wrath-mechanical', title:'Wrath of the Mechanical Monsters', grades:[7,8], active:true},
    {id:'tempest', title:'The Tempest', grades:[6,7,8], active:true},
    {id:'valiance', title:'Valiance', grades:[7,8], active:true},
    {id:'engines-resistance', title:'Engines of Resistance', grades:[7,8], active:true},
    {id:'conquer-kraken', title:'To Conquer the Kraken', grades:[7,8], active:true},
    {id:'snakebite', title:'Snakebite!', grades:[7,8], active:true}
  ];

  const app = document.getElementById('studentApp');
  const teacherButton = document.getElementById('teacherButton');
  const teacherDialog = document.getElementById('teacherDialog');
  const teacherApp = document.getElementById('teacherApp');

  const state = {
    grade:null,
    name:'',
    piece:null,
    instrument:null,
    pieces:[...BUILTIN_FALLBACK],
    adminKey:'',
    adminPieces:[]
  };

  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  function jsonp(params){
    return new Promise((resolve,reject)=>{
      if(!API_URL) return reject(new Error('Live repertoire service is not connected.'));
      const cb='derbyCb_'+Date.now()+'_'+Math.floor(Math.random()*10000);
      const script=document.createElement('script');
      const timer=setTimeout(()=>done(new Error('Request timed out')),8000);
      const done=(err,data)=>{clearTimeout(timer);delete window[cb];script.remove();err?reject(err):resolve(data)};
      window[cb]=data=>done(null,data);
      script.onerror=()=>done(new Error('Could not reach repertoire service'));
      const q=new URLSearchParams({...params,callback:cb,_:String(Date.now())});
      script.src=API_URL+'?'+q.toString();
      document.body.appendChild(script);
    });
  }

  function postForm(fields){
    if(!API_URL) return false;
    const form=document.createElement('form');
    form.method='POST';
    form.action=API_URL;
    form.target='writeTarget';
    form.style.display='none';
    Object.entries(fields).forEach(([k,v])=>{
      const input=document.createElement('input');
      input.name=k;
      input.value=String(v);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    setTimeout(()=>form.remove(),1000);
    return true;
  }

  async function loadStaticFallback(){
    try{
      const response=await fetch('pieces.json?ts='+Date.now(),{cache:'no-store'});
      if(!response.ok) throw new Error('fallback unavailable');
      const pieces=await response.json();
      if(Array.isArray(pieces)&&pieces.length) state.pieces=pieces;
    }catch(e){
      state.pieces=[...BUILTIN_FALLBACK];
    }
  }

  function renderStart(){
    state.grade=null;
    state.piece=null;
    state.instrument=null;
    app.innerHTML=`<h2 class="screen-title">NEED REPLACEMENT MUSIC?</h2><p class="screen-subtitle">Choose your grade.</p><div class="grid grade-grid">${[6,7,8].map(g=>`<button class="pixel-button grade" data-grade="${g}"><strong>${g}</strong>GRADE</button>`).join('')}</div>${(!FORM_MODE)?'<div class="notice">Requests are temporarily unavailable. Please tell Mr. Atkinson what you need.</div>':''}`;
    app.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{state.grade=Number(b.dataset.grade);renderName()});
  }

  function renderName(){
    app.innerHTML=`<button class="action secondary back" id="backStart">← BACK</button><h2 class="screen-title">${state.grade}TH GRADE</h2><p class="screen-subtitle">Who needs the replacement copy?</p><div class="field"><label for="studentName">YOUR NAME</label><input id="studentName" maxlength="60" autocomplete="name" placeholder="First name + last initial" value="${esc(state.name)}"></div><div class="action-row"><button class="action primary" id="nextPieces">CHOOSE PIECE →</button></div>`;
    document.getElementById('backStart').onclick=renderStart;
    const input=document.getElementById('studentName');
    const go=()=>{const n=input.value.trim();if(!n){input.focus();return}state.name=n;renderPieces()};
    document.getElementById('nextPieces').onclick=go;
    input.onkeydown=e=>{if(e.key==='Enter')go()};
  }

  function renderPieces(){
    const pieces=state.pieces
      .filter(p=>p.active!==false && Array.isArray(p.grades) && p.grades.includes(state.grade))
      .sort((a,b)=>a.title.localeCompare(b.title));
    app.innerHTML=`<button class="action secondary back" id="backName">← BACK</button><h2 class="screen-title">CHOOSE YOUR PIECE</h2><div class="chip-row"><span class="chip">${state.grade}th grade</span><span class="chip">${esc(state.name)}</span></div><div class="grid piece-grid">${pieces.map(p=>`<button class="pixel-button piece" data-piece="${esc(p.id)}">${esc(p.title)}</button>`).join('')}</div>${pieces.length?'':'<div class="notice">No pieces are listed for this grade right now.</div>'}`;
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

  function submitRequest(){
    if(!state.instrument || !state.piece) return;
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
    app.innerHTML=`<div class="confirmation"><div class="confirm-icon">!</div><h2>REQUEST NOT SENT</h2><p>Please tell Mr. Atkinson what music you need.</p><button class="action primary" id="another">DONE</button></div>`;
    document.getElementById('another').onclick=()=>{state.name='';renderStart()};
  }

  async function loadPieces(){
    await loadStaticFallback();
    if(API_URL){
      try{
        const data=await jsonp({action:'bootstrap'});
        if(data?.pieces?.length) state.pieces=data.pieces;
      }catch(e){
        console.warn('Using fallback repertoire:',e);
      }
    }
    renderStart();
  }

  teacherDialog.addEventListener('click',e=>{if(e.target===teacherDialog)teacherDialog.close()});
  teacherButton.onclick=()=>{teacherDialog.showModal();renderTeacherLogin()};

  function renderTeacherLogin(){
    teacherApp.innerHTML=`<div class="teacher-wrap"><div class="teacher-head"><h2>TEACHER REPERTOIRE</h2><button class="action" id="closeTeacher">CLOSE</button></div>${API_URL?`<div class="card"><div class="field"><label for="adminKey">ADMIN PIN</label><input id="adminKey" type="password" inputmode="numeric" autocomplete="off" placeholder="Teacher PIN"></div><div class="action-row"><button class="action primary" id="teacherGo">MANAGE PIECES</button></div><div id="teacherError"></div></div>`:`<div class="notice">The student request page is working from its safe fallback list. Live teacher editing has not been connected yet.</div>`}</div>`;
    document.getElementById('closeTeacher').onclick=()=>teacherDialog.close();
    const go=document.getElementById('teacherGo');
    if(go) go.onclick=async()=>{
      const key=document.getElementById('adminKey').value.trim();
      if(!key)return;
      state.adminKey=key;
      try{
        const data=await jsonp({action:'adminPieces',key});
        if(data?.error) throw new Error(data.error);
        state.adminPieces=data.pieces||[];
        renderTeacherDashboard();
      }catch(e){
        document.getElementById('teacherError').innerHTML=`<div class="notice error">${esc(e.message||'Could not open repertoire manager')}</div>`;
      }
    };
  }

  function renderTeacherDashboard(){
    teacherApp.innerHTML=`<div class="teacher-wrap"><div class="teacher-head"><div><h2>REPERTOIRE MANAGER</h2><div class="small">Changes here become the student list.</div></div><button class="action" id="closeTeacher">CLOSE</button></div><div id="adminBody"></div></div>`;
    document.getElementById('closeTeacher').onclick=()=>teacherDialog.close();
    renderPiecesAdmin();
  }

  function gradeChecks(selected=[]){
    return [6,7,8].map(g=>`<label><input type="checkbox" value="${g}" class="editGrade" ${selected.includes(g)?'checked':''}> ${g}</label>`).join('');
  }

  function renderPiecesAdmin(){
    const body=document.getElementById('adminBody');
    if(!body)return;
    const pieces=state.adminPieces.slice().sort((a,b)=>a.title.localeCompare(b.title));
    body.innerHTML=`<div class="admin-grid"><section class="card"><h3>PIECES</h3><div class="piece-admin-list">${pieces.map(p=>`<div class="piece-row"><div><strong>${esc(p.title)}</strong><div class="small">Grades ${p.grades.join(', ')} · ${p.active===false?'HIDDEN':'VISIBLE'}</div></div><button class="action" data-edit-piece="${esc(p.id)}">EDIT</button><button class="action ${p.active===false?'':'danger'}" data-toggle-piece="${esc(p.id)}">${p.active===false?'SHOW':'HIDE'}</button></div>`).join('')}</div></section><aside class="card"><h3>ADD A PIECE</h3><div class="field"><label for="newPieceTitle">TITLE</label><input id="newPieceTitle" placeholder="Piece title"></div><label>SHOW FOR GRADES</label><div class="checkbox-row"><label><input type="checkbox" value="6" class="newGrade"> 6</label><label><input type="checkbox" value="7" class="newGrade"> 7</label><label><input type="checkbox" value="8" class="newGrade"> 8</label></div><div class="action-row"><button class="action primary" id="addPiece">ADD PIECE</button></div><p class="small">Students see saved changes the next time they open or refresh this page.</p></aside></div>`;
    document.getElementById('addPiece').onclick=addPieceFromAdmin;
    body.querySelectorAll('[data-edit-piece]').forEach(btn=>btn.onclick=()=>renderEditPiece(btn.dataset.editPiece));
    body.querySelectorAll('[data-toggle-piece]').forEach(btn=>btn.onclick=()=>togglePiece(btn.dataset.togglePiece));
  }

  async function refreshAdminPieces(message){
    await new Promise(r=>setTimeout(r,800));
    const data=await jsonp({action:'adminPieces',key:state.adminKey});
    if(data?.error) throw new Error(data.error);
    state.adminPieces=data.pieces||[];
    const live=state.adminPieces.filter(p=>p.active!==false);
    if(live.length) state.pieces=live;
    renderPiecesAdmin();
    if(message){
      const body=document.getElementById('adminBody');
      body.insertAdjacentHTML('afterbegin',`<div class="notice">${esc(message)}</div>`);
    }
  }

  async function addPieceFromAdmin(){
    const title=document.getElementById('newPieceTitle').value.trim();
    const grades=[...document.querySelectorAll('.newGrade:checked')].map(x=>Number(x.value));
    if(!title||!grades.length)return;
    const id=(slug(title)||'piece')+'-'+Date.now();
    postForm({action:'addPiece',key:state.adminKey,id,title,grades:grades.join(',')});
    try{await refreshAdminPieces('Piece added.');}catch(e){alert(e.message||'Could not refresh pieces');}
  }

  function renderEditPiece(id){
    const p=state.adminPieces.find(x=>x.id===id);
    if(!p)return;
    const body=document.getElementById('adminBody');
    body.innerHTML=`<div class="card"><button class="action secondary back" id="backPiecesAdmin">← BACK</button><h3>EDIT PIECE</h3><div class="field"><label for="editPieceTitle">TITLE</label><input id="editPieceTitle" maxlength="120" value="${esc(p.title)}"></div><label>SHOW FOR GRADES</label><div class="checkbox-row">${gradeChecks(p.grades)}</div><label class="checkbox-row"><input type="checkbox" id="editPieceActive" ${p.active===false?'':'checked'}> Visible to students</label><div class="action-row"><button class="action primary" id="savePiece">SAVE CHANGES</button></div></div>`;
    document.getElementById('backPiecesAdmin').onclick=renderPiecesAdmin;
    document.getElementById('savePiece').onclick=async()=>{
      const title=document.getElementById('editPieceTitle').value.trim();
      const grades=[...body.querySelectorAll('.editGrade:checked')].map(x=>Number(x.value));
      const active=document.getElementById('editPieceActive').checked;
      if(!title||!grades.length)return;
      postForm({action:'updatePiece',key:state.adminKey,id:p.id,title,grades:grades.join(','),active:String(active)});
      try{await refreshAdminPieces('Changes saved.');}catch(e){alert(e.message||'Could not refresh pieces');}
    };
  }

  async function togglePiece(id){
    const p=state.adminPieces.find(x=>x.id===id);
    if(!p)return;
    postForm({action:'setPieceActive',key:state.adminKey,id,active:String(p.active===false)});
    try{await refreshAdminPieces(p.active===false?'Piece is visible again.':'Piece hidden from students.');}catch(e){alert(e.message||'Could not refresh pieces');}
  }

  loadPieces();
})();