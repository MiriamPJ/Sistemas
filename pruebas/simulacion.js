// Simulación local de las reglas del servidor (Code.gs) con servicios de Apps Script simulados.
// Uso: node pruebas/simulacion.js   (sale con código 1 si alguna regla no se comporta como se espera)
const fs=require('fs');
let fallos=0;
let NOW=new Date();
let fakeNow={fecha:'2026-11-19',hora:'17:10'};
function mkSheet(rows){return{rows,getLastRow(){return this.rows.length},
 getDataRange(){const r=this.rows;return{getDisplayValues:()=>r.map(x=>x.map(String))}},
 getRange(r,c,nr,nc){const rows=this.rows;return{getDisplayValues:()=>rows.slice(r-1,r-1+nr).map(x=>x.slice(c-1,c-1+nc).map(String))}},
 appendRow(a){this.rows.push(a)}}}
const sheets={};
global.SpreadsheetApp={getActive:()=>({getSheetByName:n=>sheets[n]}),flush(){}};
global.CacheService={getScriptCache:()=>({get:()=>null,put(){},remove(){}})};
global.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})};
global.Utilities={formatDate:(d,tz,f)=>f==='yyyy-MM-dd'?fakeNow.fecha:f==='HH:mm'?fakeNow.hora:'00:00:00'};
eval(fs.readFileSync(require('path').join(__dirname,'..','Code.gs'),'utf8')+';global.registrar=registrar;global.PROGRAMA=PROGRAMA;global.ENC_CONF=ENC_CONF;global.ENC_REG=ENC_REG;');
sheets.Conferencias=mkSheet([ENC_CONF,...PROGRAMA]);
sheets.Asistencia=mkSheet([ENC_REG]);
const t=(d,h,data,esperado)=>{fakeNow={fecha:d,hora:h};const r=registrar(data);const ok=(esperado==='OK')===!!r.ok;if(!ok)fallos++;console.log(ok?'✔':'✘ FALLA',d,h,'conf',data.conf,'->',r.ok?'OK '+r.folio+(r.aviso?' AVISO':''):'ERR: '+r.error)};
const A={control:'21 580 123',nombre:'juan  pérez lópez',semestre:'7'};
t('2026-11-19','16:05',{...A,conf:'12'},'OK');
t('2026-11-19','17:05',{...A,conf:'13'},'ERR');        // empalme -> ERR
t('2026-11-19','16:10',{...A,conf:'12'},'ERR');        // duplicado -> ERR
t('2026-11-19','18:05',{...A,conf:'14'},'OK');        // ok
t('2026-11-19','12:00',{...A,conf:'14'},'ERR');        // fuera de ventana
t('2026-11-18','10:30',{...A,conf:'2'},'OK');
t('2026-11-18','11:00',{...A,conf:'3'},'OK');         // contiguo -> OK
t('2026-11-19','17:05',{control:'21580999',nombre:'ana ruiz',semestre:'7',conf:'13'},'OK'); // aviso sede
t('2026-11-19','17:05',{control:'2158012',nombre:'ana ruiz',semestre:'7',conf:'13'},'ERR');  // control inválido
t('2026-11-19','17:05',{control:'21580998',nombre:'=HYPERLINK(1)',semestre:'3',conf:'13'},'ERR');
console.log(sheets.Asistencia.rows.slice(1).map(r=>r.filter((_,i)=>i!==1).join(' | ')).join('\n'));
if(fallos){console.error('\n'+fallos+' caso(s) fallaron');process.exit(1)}else console.log('\nTodas las reglas se comportan como se espera.');
