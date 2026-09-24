const DB_NAME = 'Derby Band Music Requests';
const PIECES_SHEET = 'Pieces';
const REQUESTS_SHEET = 'Requests';

const SEED_PIECES = [
  ['dragon-slayer','Dragon Slayer','6',true],
  ['jester-dance','Jester Dance','6,8',true],
  ['alpha-squadron','Alpha Squadron','6,8',true],
  ['midnight-madness','Midnight Madness','6',true],
  ['might-of-hercules','The Might of Hercules','6',true],
  ['rise-of-bladesmith','Rise of the Bladesmith','6',true],
  ['star-wars','Star Wars','6',true],
  ['tenth-planet','The Tenth Planet','6',true],
  ['shine','Shine','6',true],
  ['falcons-flight',"Falcon's Flight March",'6',true],
  ['mechanical-monsters','Mechanical Monsters','6,7',true],
  ['wrath-mechanical','Wrath of the Mechanical Monsters','6',true],
  ['tempest','The Tempest','6',true],
  ['power','Power','6',true],
  ['valiance','Valiance','7',true],
  ['engines-resistance','Engines of Resistance','7,8',true],
  ['conquer-kraken','To Conquer the Kraken','7,8',true],
  ['snakebite','Snakebite!','7,8',true]
];

function doGet(e) {
  try {
    const action = clean_(e.parameter.action || 'bootstrap', 40);
    let data;
    if (action === 'bootstrap') data = { pieces: getPieces_() };
    else if (action === 'requests') {
      requireAdmin_(e.parameter.key);
      data = { requests: getRequests_() };
    } else data = { error: 'Unknown action' };
    return output_(data, e.parameter.callback);
  } catch (err) {
    return output_({ error: String(err.message || err) }, e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const p = e.parameter || {};
    const action = clean_(p.action, 40);
    if (action === 'request') addRequest_(p);
    else if (action === 'addPiece') { requireAdmin_(p.key); addPiece_(p); }
    else if (action === 'removePiece') { requireAdmin_(p.key); removePiece_(p.id); }
    else if (action === 'markPrinted') { requireAdmin_(p.key); markPrinted_(p.ids); }
    else throw new Error('Unknown action');
    return output_({ ok: true });
  } catch (err) {
    return output_({ ok: false, error: String(err.message || err) });
  }
}

function db_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('DB_ID');
  let ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create(DB_NAME);
    ss.setSpreadsheetTimeZone('America/New_York');
    props.setProperty('DB_ID', ss.getId());
  }
  setup_(ss);
  return ss;
}

function setup_(ss) {
  let pieces = ss.getSheetByName(PIECES_SHEET);
  if (!pieces) pieces = ss.insertSheet(PIECES_SHEET);
  if (pieces.getLastRow() === 0) {
    pieces.appendRow(['id','title','grades','active','createdAt']);
    const now = new Date();
    const rows = SEED_PIECES.map(r => [r[0],r[1],r[2],r[3],now]);
    pieces.getRange(2,1,rows.length,5).setValues(rows);
    pieces.setFrozenRows(1);
  }
  let requests = ss.getSheetByName(REQUESTS_SHEET);
  if (!requests) requests = ss.insertSheet(REQUESTS_SHEET);
  if (requests.getLastRow() === 0) {
    requests.appendRow(['id','timestamp','name','grade','piece','pieceId','instrument','status']);
    requests.setFrozenRows(1);
  }
  const starter = ss.getSheetByName('Sheet1');
  if (starter && ss.getSheets().length > 2) ss.deleteSheet(starter);
}

function getPieces_() {
  const sh = db_().getSheetByName(PIECES_SHEET);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).filter(r => r[3] !== false).map(r => ({
    id: String(r[0]), title: String(r[1]),
    grades: String(r[2]).split(',').map(Number).filter(Boolean), active: r[3] !== false
  }));
}

function getRequests_() {
  const sh = db_().getSheetByName(REQUESTS_SHEET);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).reverse().map(r => ({
    id:String(r[0]), time:formatTime_(r[1]), name:String(r[2]), grade:String(r[3]),
    piece:String(r[4]), pieceId:String(r[5]), instrument:String(r[6]), status:String(r[7] || 'OPEN')
  }));
}

function addRequest_(p) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const name = clean_(p.name,60), grade = clean_(p.grade,2), piece = clean_(p.piece,120), pieceId = clean_(p.pieceId,100), instrument = clean_(p.instrument,80);
    if (!name || !['6','7','8'].includes(grade) || !piece || !instrument) throw new Error('Missing request information');
    const id = Utilities.getUuid().slice(0,8).toUpperCase();
    db_().getSheetByName(REQUESTS_SHEET).appendRow([id,new Date(),name,grade,piece,pieceId,instrument,'OPEN']);
  } finally { lock.releaseLock(); }
}

function addPiece_(p) {
  const title = clean_(p.title,120), grades = clean_(p.grades,20), id = clean_(p.id,100) || ('piece-' + Date.now());
  if (!title || !grades) throw new Error('Title and grades are required');
  db_().getSheetByName(PIECES_SHEET).appendRow([id,title,grades,true,new Date()]);
}

function removePiece_(id) {
  id = clean_(id,100); if (!id) throw new Error('Piece id required');
  const sh = db_().getSheetByName(PIECES_SHEET), values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) if (String(values[i][0]) === id) { sh.getRange(i+1,4).setValue(false); return; }
  throw new Error('Piece not found');
}

function markPrinted_(idsText) {
  const ids = String(idsText || '').split(',').map(x=>x.trim()).filter(Boolean);
  if (!ids.length) return;
  const sh = db_().getSheetByName(REQUESTS_SHEET), values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) if (ids.includes(String(values[i][0]))) sh.getRange(i+1,8).setValue('PRINTED');
}

function requireAdmin_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expected) throw new Error('Admin PIN has not been configured');
  if (String(key || '') !== expected) throw new Error('Incorrect admin PIN');
}

function output_(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    const safe = String(callback).replace(/[^A-Za-z0-9_$.]/g,'');
    return ContentService.createTextOutput(safe + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function clean_(value, max) {
  return String(value == null ? '' : value).replace(/[<>]/g,'').trim().slice(0,max || 200);
}

function formatTime_(value) {
  if (!(value instanceof Date)) return String(value || '');
  return Utilities.formatDate(value, 'America/New_York', 'MMM d, h:mm a');
}