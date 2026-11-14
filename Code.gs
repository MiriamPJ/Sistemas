/**
 * ============================================================================
 *  CICLO DE CONFERENCIAS CONECTATEC 2026
 *  Instituto Tecnológico de Reynosa - Departamento de Sistemas y Computación
 *  Sistema de registro de asistencia (Google Apps Script + Google Sheets)
 * ============================================================================
 *  Hojas que crea el script (menú CONECTATEC > "1. Inicializar hojas"):
 *    - Conferencias        : programa oficial (editable por el comité)
 *    - Asistencia          : un renglón por asistencia (lista para constancias)
 *    - Resumen_Constancias : un renglón por alumno (se genera desde el menú)
 *    - QR                  : enlace + código QR de cada conferencia
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// CONFIGURACIÓN GENERAL
// ---------------------------------------------------------------------------
const CONFIG = {
  TZ: 'America/Matamoros',          // Zona horaria de Reynosa, Tamaulipas
  HOJA_CONF: 'Conferencias',
  HOJA_REG: 'Asistencia',
  HOJA_RESUMEN: 'Resumen_Constancias',
  HOJA_QR: 'QR',

  // Ventana de registro: el alumno solo puede registrarse desde X minutos
  // antes del inicio hasta Y minutos después del fin de la conferencia.
  // Pon VALIDAR_VENTANA en false SOLO para hacer pruebas antes del evento.
  VALIDAR_VENTANA: true,
  MIN_ANTES: 15,
  MIN_DESPUES: 20,

  // Sede / semestre: false = solo muestra aviso; true = bloquea el registro.
  BLOQUEAR_SEDE: false,

  // Número de control TecNM: 8 dígitos, opcionalmente con una letra inicial
  // (ej. 21580123, C21580123, B21580123, M26580001, D...).
  REGEX_CONTROL: /^[A-Z]?\d{8}$/,

  SEMESTRES: ['1', '3', '5', '7', '9'],
  PREFIJO_FOLIO: 'CTEC26-',

  // Opcional: pega aquí la URL /exec de tu implementación si
  // ScriptApp.getService().getUrl() no la devuelve correctamente.
  URL_WEBAPP: ''
};

// ---------------------------------------------------------------------------
// PROGRAMA OFICIAL (se escribe en la hoja "Conferencias" al inicializar).
// Después de inicializar, la HOJA es la fuente de verdad: edita ahí sedes,
// semestres o ponentes pendientes, y pon "NO" en la columna Activa para
// deshabilitar una conferencia.
// Columnas: ID, Fecha, Inicio, Fin, Conferencia, Ponente, Sede, Semestres, Activa
// ---------------------------------------------------------------------------
const PROGRAMA = [
  // ---------------- 18 de noviembre ----------------
  ['1',  '2026-11-18', '09:00', '10:00', 'INAUGURACIÓN', '', 'Unidad 5 Lab 1', 'Todos', 'SI'],
  ['2',  '2026-11-18', '10:00', '11:00', 'Telemetría e Inteligencia Distribuida para la Monitorización y Calidad del Agua', 'M.I.D.S. José Antonio Contreras Flores', 'Por confirmar', 'Todos', 'SI'],
  ['3',  '2026-11-18', '11:00', '12:00', 'IA generativa para la educación superior', 'Dr. José Alfonso López González', 'Por confirmar', 'Todos', 'SI'],
  ['4',  '2026-11-18', '12:00', '13:00', 'Conferencia pendiente', 'Dr. Mario Santiago Sánchez', 'Por confirmar', 'Todos', 'SI'],
  ['5',  '2026-11-18', '16:00', '16:30', 'INAUGURACIÓN', '', 'Unidad 5 Lab 1', 'Todos', 'SI'],
  ['6',  '2026-11-18', '16:30', '17:30', 'Rally / Actividad', '', 'Pista Deportiva', 'Todos', 'SI'],
  ['7',  '2026-11-18', '18:00', '19:30', 'Más allá del chatbot: ética y diseño en la IA educativa', 'Victor Manuel Dominguez Lara', 'Por confirmar', 'Todos', 'SI'],
  ['8',  '2026-11-18', '19:30', '20:30', 'Hackea la matrix, no tu código: seguridad, IA y desarrollo inquebrantable', 'Arturo Huesca Franco', 'Por confirmar', 'Todos', 'SI'],
  // ---------------- 19 de noviembre ----------------
  ['9',  '2026-11-19', '09:00', '11:00', 'Rally / Actividad', '', 'Pista Deportiva', 'Todos', 'SI'],
  ['10', '2026-11-19', '11:00', '12:00', 'Industria 4.0 y su transición a la 5.0', 'Julio Erazo Macías Rodríguez', 'Por confirmar', 'Todos', 'SI'],
  ['11', '2026-11-19', '12:00', '13:00', 'Microemprendimiento digital de las NENIS y los BROS: oportunidades y desafíos para su sostenibilidad económica', 'Dra. María de Jesús Hernández Luna', 'Por confirmar', 'Todos', 'SI'],
  ['12', '2026-11-19', '16:00', '17:30', 'Implementación de un modelo de Deep Learning y plataforma SIARR para analítica predictiva del desempeño académico', 'Dr. Samuel Martínez Ramos', 'Por confirmar', 'Todos', 'SI'],
  ['13', '2026-11-19', '17:00', '18:00', 'Conferencia pendiente', '', 'Auditorio de Fundadores', '1,3,5', 'SI'],
  ['14', '2026-11-19', '18:00', '19:00', 'Sistemas tutores inteligentes: una nueva perspectiva para la formación de ingenieros en computación', 'Sandra Magali Garcia Garcia', 'Por confirmar', 'Todos', 'SI'],
  ['15', '2026-11-19', '19:30', '20:30', 'Gestión de proyectos: de estudiante de ingeniería a project management professional', 'Angel Mendoza', 'Por confirmar', 'Todos', 'SI']
];

const ENC_CONF = ['ID', 'Fecha', 'Inicio', 'Fin', 'Conferencia', 'Ponente', 'Sede', 'Semestres', 'Activa'];

// Columnas de "Asistencia" (el orden importa: ver COL más abajo)
const ENC_REG = ['Folio', 'Timestamp', 'No. Control', 'Nombre completo', 'Semestre',
                 'ID Conf', 'Conferencia', 'Ponente', 'Fecha conferencia', 'Horario', 'Sede'];
const COL = { FOLIO: 1, TS: 2, CONTROL: 3, NOMBRE: 4, SEMESTRE: 5, CONF_ID: 6 };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ===========================================================================
//  WEB APP
// ===========================================================================
function doGet(e) {
  const p = (e && e.parameter) || {};

  // Página imprimible con todos los QR:  .../exec?vista=carteles
  if (p.vista === 'carteles') return paginaCarteles_();

  const t = HtmlService.createTemplateFromFile('Index');
  const boot = {
    conf: String(p.conf || '').replace(/[^0-9A-Za-z_-]/g, ''),
    confs: conferenciasPublicas_(),
    ahora: ahora_(),
    cfg: {
      ventana: CONFIG.VALIDAR_VENTANA,
      antes: CONFIG.MIN_ANTES,
      despues: CONFIG.MIN_DESPUES,
      bloquearSede: CONFIG.BLOQUEAR_SEDE
    }
  };
  // Se escapa "<" para que ningún texto pueda cerrar la etiqueta <script>.
  t.boot = JSON.stringify(boot).replace(/</g, '\\u003c');

  return t.evaluate()
    .setTitle('Asistencia · CONECTATEC 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/**
 * Llamada desde el formulario con google.script.run.registrar({...}).
 * Devuelve { ok:true, folio, conferencia, aviso } o { ok:false, error }.
 */
function registrar(datos) {
  datos = datos || {};
  const control = normalizarControl_(datos.control);
  const nombre = normalizarNombre_(datos.nombre);
  const semestre = String(datos.semestre || '').trim();
  const confId = String(datos.conf || '').trim();

  // ---------- 1. Validación de formato ----------
  if (!CONFIG.REGEX_CONTROL.test(control)) {
    return fallo_('Número de control inválido. Debe tener 8 dígitos (opcionalmente una letra al inicio, p. ej. C21580123), sin espacios.');
  }
  if (!/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ' -]*$/.test(nombre) || nombre.split(' ').length < 2 || nombre.length < 6) {
    return fallo_('Escribe tu nombre completo (nombre y apellidos), solo con letras.');
  }
  if (CONFIG.SEMESTRES.indexOf(semestre) < 0) {
    return fallo_('Selecciona un semestre válido (1, 3, 5, 7 o 9).');
  }

  const confs = leerConferencias_();
  const mapa = {};
  confs.forEach(function (c) { mapa[c.id] = c; });
  const conf = mapa[confId];
  if (!conf || !conf.activa) return fallo_('La conferencia seleccionada no existe o no está activa.');

  // ---------- 2. Ventana de horario ----------
  const ahora = ahora_();
  if (CONFIG.VALIDAR_VENTANA) {
    const abre = conf.ini - CONFIG.MIN_ANTES;
    const cierra = conf.finMin + CONFIG.MIN_DESPUES;
    if (ahora.fecha !== conf.fecha || ahora.min < abre || ahora.min > cierra) {
      return fallo_('El registro para "' + conf.titulo + '" solo está abierto el ' + fechaLarga_(conf.fecha) +
        ' de ' + hhmm_(abre) + ' a ' + hhmm_(cierra) + ' h.');
    }
  }

  // ---------- 3. Sede / semestre ----------
  let aviso = '';
  if (!semestrePermitido_(conf, semestre)) {
    const msg = 'Esta actividad (' + conf.sede + ') está asignada a los semestres ' + conf.semestres + '.';
    if (CONFIG.BLOQUEAR_SEDE) return fallo_(msg + ' Tu semestre (' + semestre + ') no corresponde a esta sede.');
    aviso = msg + ' Tu registro se guardó, pero verifica que estés en la sede correcta.';
  }

  // ---------- 4. Duplicados y empalmes (con candado para evitar carreras) ----------
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return fallo_('Hay mucha gente registrándose en este momento. Espera unos segundos y vuelve a intentar.');
  }
  try {
    const sh = hoja_(CONFIG.HOJA_REG);
    const ultima = sh.getLastRow();
    const filas = ultima > 1
      ? sh.getRange(2, COL.CONTROL, ultima - 1, COL.CONF_ID - COL.CONTROL + 1).getDisplayValues()
      : [];

    for (let i = 0; i < filas.length; i++) {
      if (String(filas[i][0]).trim().toUpperCase() !== control) continue;
      const otraId = String(filas[i][COL.CONF_ID - COL.CONTROL]).trim();

      if (otraId === conf.id) {
        return fallo_('El número de control ' + control + ' ya está registrado en "' + conf.titulo +
          '" (' + conf.inicio + ' - ' + conf.fin + '). No es necesario registrarte de nuevo.');
      }
      const otra = mapa[otraId];
      if (otra && seEmpalman_(conf, otra)) {
        return fallo_('Empalme de horario: el número de control ' + control + ' ya está registrado en "' +
          otra.titulo + '" el ' + fechaLarga_(otra.fecha) + ' de ' + otra.inicio + ' a ' + otra.fin +
          ' h, que se cruza con "' + conf.titulo + '" (' + conf.inicio + ' - ' + conf.fin +
          ' h). Solo puedes registrar asistencia a una actividad por horario.');
      }
    }

    // ---------- 5. Guardar ----------
    const folio = CONFIG.PREFIJO_FOLIO + ('0000' + ultima).slice(-4);   // ultima = n.º de registros + 1 (encabezado)
    sh.appendRow([
      folio,
      new Date(),
      control,
      nombre,
      Number(semestre),
      conf.id,
      conf.titulo,
      conf.ponente,
      fechaLarga_(conf.fecha),
      conf.inicio + ' - ' + conf.fin,
      conf.sede
    ]);
    SpreadsheetApp.flush();

    return {
      ok: true,
      folio: folio,
      control: control,
      nombre: nombre,
      conferencia: conf.titulo,
      ponente: conf.ponente,
      horario: fechaLarga_(conf.fecha) + ', ' + conf.inicio + ' - ' + conf.fin + ' h',
      hora: Utilities.formatDate(new Date(), CONFIG.TZ, 'HH:mm:ss'),
      aviso: aviso
    };
  } catch (err) {
    console.error(err);
    return fallo_('Ocurrió un error al guardar. Intenta de nuevo en unos segundos.');
  } finally {
    lock.releaseLock();
  }
}

/** Para refrescar la lista desde el celular sin recargar la página. */
function estadoActual() {
  return { confs: conferenciasPublicas_(), ahora: ahora_() };
}

// ===========================================================================
//  REGLAS
// ===========================================================================
/** Dos actividades se empalman si son el mismo día y sus rangos se traslapan.
 *  Rangos contiguos (10:00-11:00 y 11:00-12:00) NO se empalman. */
function seEmpalman_(a, b) {
  return a.fecha === b.fecha && a.ini < b.finMin && b.ini < a.finMin;
}

function semestrePermitido_(conf, semestre) {
  const s = String(conf.semestres || '').trim();
  if (!s || /^todos$/i.test(s)) return true;
  return s.split(/[\s,;]+/).indexOf(String(semestre)) >= 0;
}

// ===========================================================================
//  LECTURA DE CONFERENCIAS (con caché de 2 min para soportar mucho tráfico)
//  Cada conferencia: { id, fecha:'yyyy-MM-dd', inicio:'HH:mm', fin:'HH:mm',
//                      ini:<min>, finMin:<min>, titulo, ponente, sede,
//                      semestres, activa }
// ===========================================================================
function leerConferencias_() {
  const cache = CacheService.getScriptCache();
  const enCache = cache.get('confs_v1');
  if (enCache) return JSON.parse(enCache);

  const valores = hoja_(CONFIG.HOJA_CONF).getDataRange().getDisplayValues().slice(1);
  const lista = valores
    .filter(function (r) { return String(r[0]).trim() !== ''; })
    .map(function (r) {
      const ini = aMinutos_(r[2]);
      const finMin = aMinutos_(r[3]);
      return {
        id: String(r[0]).trim(),
        fecha: normalizarFecha_(r[1]),
        inicio: hhmm_(ini),
        fin: hhmm_(finMin),
        ini: ini,
        finMin: finMin,
        titulo: String(r[4]).trim(),
        ponente: String(r[5]).trim(),
        sede: String(r[6]).trim() || 'Por confirmar',
        semestres: String(r[7]).trim() || 'Todos',
        activa: !/^(no|false|falso|0|inactiva)$/i.test(String(r[8]).trim())
      };
    })
    .filter(function (c) { return c.fecha && !isNaN(c.ini) && !isNaN(c.finMin); });

  cache.put('confs_v1', JSON.stringify(lista), 120);
  return lista;
}

function conferenciasPublicas_() {
  return leerConferencias_()
    .filter(function (c) { return c.activa; })
    .map(function (c) {
      return {
        id: c.id, fecha: c.fecha, fechaLarga: fechaLarga_(c.fecha),
        inicio: c.inicio, fin: c.fin, ini: c.ini, finMin: c.finMin,
        titulo: c.titulo, ponente: c.ponente, sede: c.sede, semestres: c.semestres
      };
    });
}

function limpiarCache_() {
  CacheService.getScriptCache().remove('confs_v1');
}

/** Disparador simple: si editan la hoja Conferencias, se invalida la caché. */
function onEdit(e) {
  try {
    if (e && e.range && e.range.getSheet().getName() === CONFIG.HOJA_CONF) limpiarCache_();
  } catch (err) { /* sin acción */ }
}

// ===========================================================================
//  UTILIDADES
// ===========================================================================
function fallo_(msg) { return { ok: false, error: msg }; }

function hoja_(nombre) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!sh) throw new Error('No existe la hoja "' + nombre + '". Ejecuta CONECTATEC > Inicializar hojas.');
  return sh;
}

function normalizarControl_(v) {
  return String(v || '').toUpperCase().replace(/[\s\-_.]/g, '');
}

function normalizarNombre_(v) {
  return String(v || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function ahora_() {
  const d = new Date();
  const f = Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd');
  const h = Utilities.formatDate(d, CONFIG.TZ, 'HH:mm');
  return { fecha: f, min: aMinutos_(h), hora: h };
}

/** Acepta '2026-11-18', '18/11/2026' o '18-11-2026'. Devuelve 'yyyy-MM-dd'. */
function normalizarFecha_(v) {
  const s = String(v || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

/** '9:00', '09:00', '09:00:00' -> minutos desde medianoche. */
function aMinutos_(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function hhmm_(min) {
  if (isNaN(min)) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
}

function fechaLarga_(f) {
  const p = String(f).split('-').map(Number);
  if (p.length !== 3 || !p[1]) return f;
  return p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0];
}

function urlWebApp_() {
  if (CONFIG.URL_WEBAPP) return CONFIG.URL_WEBAPP;
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

// ===========================================================================
//  ADMINISTRACIÓN (menú dentro de Google Sheets)
// ===========================================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('CONECTATEC')
    .addItem('1. Inicializar hojas', 'inicializar')
    .addItem('2. Generar hoja de códigos QR', 'generarHojaQR')
    .addItem('3. Generar resumen por alumno (constancias)', 'generarResumen')
    .addSeparator()
    .addItem('Refrescar programa (limpiar caché)', 'refrescarPrograma')
    .addToUi();
}

function refrescarPrograma() {
  limpiarCache_();
  SpreadsheetApp.getActive().toast('Programa recargado. Los cambios ya se ven en el formulario.', 'CONECTATEC');
}

/** Crea las hojas "Conferencias" y "Asistencia" con formato. No borra datos. */
function inicializar() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(CONFIG.TZ);

  // --- Conferencias ---
  let sc = ss.getSheetByName(CONFIG.HOJA_CONF);
  if (!sc) sc = ss.insertSheet(CONFIG.HOJA_CONF);
  if (sc.getLastRow() <= 1) {
    sc.clear();
    sc.getRange(1, 1, 200, ENC_CONF.length).setNumberFormat('@'); // todo como texto
    sc.getRange(1, 1, 1, ENC_CONF.length).setValues([ENC_CONF]);
    sc.getRange(2, 1, PROGRAMA.length, ENC_CONF.length).setValues(PROGRAMA);
  }
  formatearEncabezado_(sc, ENC_CONF.length);
  sc.setColumnWidth(5, 420); sc.setColumnWidth(6, 260); sc.setColumnWidth(7, 180);

  // --- Asistencia ---
  let sr = ss.getSheetByName(CONFIG.HOJA_REG);
  if (!sr) sr = ss.insertSheet(CONFIG.HOJA_REG);
  if (sr.getLastRow() === 0) sr.getRange(1, 1, 1, ENC_REG.length).setValues([ENC_REG]);
  sr.getRange('C:C').setNumberFormat('@');                       // No. control como texto
  sr.getRange('B:B').setNumberFormat('dd/MM/yyyy HH:mm:ss');     // Timestamp
  formatearEncabezado_(sr, ENC_REG.length);
  sr.setColumnWidth(4, 260); sr.setColumnWidth(7, 380);

  const hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && hoja1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(hoja1);

  limpiarCache_();
  ss.toast('Hojas listas. Ahora implementa la aplicación web (Implementar > Nueva implementación).', 'CONECTATEC', 8);
}

function formatearEncabezado_(sh, n) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#1B396A').setFontColor('#FFFFFF');
}

/** Hoja "QR": URL de cada conferencia + imagen del QR lista para imprimir. */
function generarHojaQR() {
  const url = urlWebApp_();
  const ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('Primero implementa la aplicación web (Implementar > Nueva implementación) ' +
             'o pega la URL /exec en CONFIG.URL_WEBAPP dentro de Code.gs.');
    return;
  }
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CONFIG.HOJA_QR);
  if (!sh) sh = ss.insertSheet(CONFIG.HOJA_QR);
  sh.clear();

  const filas = [['ID', 'Fecha', 'Horario', 'Conferencia', 'Sede', 'URL del QR', 'Código QR']];
  leerConferencias_().forEach(function (c) {
    filas.push([c.id, fechaLarga_(c.fecha), c.inicio + ' - ' + c.fin, c.titulo, c.sede, url + '?conf=' + c.id, '']);
  });
  // QR general (sin conferencia preseleccionada)
  filas.push(['GENERAL', '', '', 'Formulario general (lista según horario actual)', '', url, '']);

  sh.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  for (let r = 2; r <= filas.length; r++) {
    sh.getRange(r, 7).setFormula(
      '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data="&ENCODEURL(F' + r + '))');
    sh.setRowHeight(r, 170);
  }
  sh.setColumnWidth(4, 360); sh.setColumnWidth(6, 300); sh.setColumnWidth(7, 175);
  formatearEncabezado_(sh, filas[0].length);
  ss.toast('Hoja QR generada. Carteles imprimibles en: ' + url + '?vista=carteles', 'CONECTATEC', 10);
}

/** Hoja "Resumen_Constancias": un renglón por alumno con todas sus asistencias. */
function generarResumen() {
  const ss = SpreadsheetApp.getActive();
  const sr = hoja_(CONFIG.HOJA_REG);
  const n = sr.getLastRow() - 1;
  const datos = n > 0 ? sr.getRange(2, 1, n, ENC_REG.length).getDisplayValues() : [];

  const alumnos = {};
  datos.forEach(function (r) {
    const ctrl = r[COL.CONTROL - 1];
    if (!alumnos[ctrl]) alumnos[ctrl] = { nombre: r[COL.NOMBRE - 1], semestre: r[COL.SEMESTRE - 1], confs: [] };
    alumnos[ctrl].confs.push(r[6] + (r[7] ? ' (' + r[7] + ')' : '') + ' - ' + r[8] + ' ' + r[9]);
  });

  const filas = [['No. Control', 'Nombre completo', 'Semestre', 'Total asistencias', 'Actividades']];
  Object.keys(alumnos).sort().forEach(function (k) {
    const a = alumnos[k];
    filas.push([k, a.nombre, a.semestre, a.confs.length, a.confs.join('\n')]);
  });

  let sh = ss.getSheetByName(CONFIG.HOJA_RESUMEN);
  if (!sh) sh = ss.insertSheet(CONFIG.HOJA_RESUMEN);
  sh.clear();
  sh.getRange('A:A').setNumberFormat('@');
  sh.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  sh.getRange('E:E').setWrap(true);
  sh.setColumnWidth(2, 260); sh.setColumnWidth(5, 600);
  formatearEncabezado_(sh, filas[0].length);
  ss.toast('Resumen generado: ' + (filas.length - 1) + ' alumnos.', 'CONECTATEC');
}

// ===========================================================================
//  PÁGINA IMPRIMIBLE DE CARTELES QR   (.../exec?vista=carteles)
// ===========================================================================
function paginaCarteles_() {
  const url = urlWebApp_();
  const esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  let html = '<style>' +
    'body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#1B396A}' +
    '.c{page-break-after:always;text-align:center;padding:40px 30px;min-height:90vh;box-sizing:border-box}' +
    '.e{font-size:14px;letter-spacing:2px;font-weight:bold}' +
    'h1{font-size:30px;margin:8px 0}h2{font-size:22px;color:#333;margin:18px 40px}' +
    '.p{font-size:18px;color:#555}.h{font-size:20px;font-weight:bold;margin:10px}' +
    'img{width:340px;height:340px;margin:20px}.u{font-size:11px;color:#888;word-break:break-all}' +
    '@media print{.np{display:none}}</style>' +
    '<p class="np" style="text-align:center;padding:10px;background:#FFF3CD">Usa Ctrl+P / Imprimir. Cada conferencia sale en una hoja.</p>';

  conferenciasPublicas_().forEach(function (c) {
    const link = url + '?conf=' + encodeURIComponent(c.id);
    html += '<div class="c">' +
      '<div class="e">INSTITUTO TECNOLÓGICO DE REYNOSA · SISTEMAS Y COMPUTACIÓN</div>' +
      '<h1>CICLO DE CONFERENCIAS CONECTATEC 2026</h1>' +
      '<div class="h">' + esc(c.fechaLarga) + ' · ' + esc(c.inicio) + ' - ' + esc(c.fin) + ' h · ' + esc(c.sede) + '</div>' +
      '<h2>' + esc(c.titulo) + '</h2>' +
      (c.ponente ? '<div class="p">' + esc(c.ponente) + '</div>' : '') +
      '<img src="https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=' + encodeURIComponent(link) + '">' +
      '<div class="h">Escanea para registrar tu asistencia</div>' +
      '<div class="u">' + esc(link) + '</div></div>';
  });

  return HtmlService.createHtmlOutput(html)
    .setTitle('Carteles QR · CONECTATEC 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
