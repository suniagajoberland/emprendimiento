/**
 * AVELLVIS - Backend Google Sheets
 * =================================
 * CÓMO USAR (con tu hoja existente):
 * 1. Abre tu hoja: https://docs.google.com/spreadsheets/d/1m4rU-dTII8t-Y5XYIafV-WxHAdBFpAT1rIBOut9in7o/edit
 * 2. Ve a Extensiones > Apps Script y pega TODO este archivo (reemplaza Code.gs).
 * 3. Selecciona la función setupSheet en el editor y dale Ejecutar
 *    (crea la pestaña "Productos" con todas las columnas y formato).
 * 4. Implementar > Nueva implementación > Tipo: Aplicación web >
 *    Ejecutar como: Yo > Acceso: Cualquier usuario > Implementar.
 * 5. Copia la URL de la aplicación web (termina en /exec) y pégala en
 *    js/config.js dentro del proyecto (variable AVELLVIS_SHEET_URL).
 * 6. Seguridad: ejecuta setupAuth() (crea el usuario admin y el secreto de
 *    firma). Cambia la contraseña con el menú "Avellvis > Cambiar contraseña".
 *    Las escrituras (save/delete/bulk) exigen un token válido emitido por login.
 *
 * API:
 *   GET  ?action=list                         -> lista todos los productos (público)
 *   POST {"action":"list"}                    -> lista todos los productos (público)
 *   POST {"action":"login","username","password"} -> { ok, token, expiresIn, user }
 *   POST {"action":"save","token","product":{...}}   -> crea o actualiza (por id)
 *   POST {"action":"delete","token","id":"..."}      -> elimina por id
 *   POST {"action":"bulk","token","products":[...]}  -> importación masiva
 */

var SHEET_NAME = 'Productos';
var HEADERS = [
  'id', 'nombre', 'sku', 'precio', 'categoria', 'filtro', 'edicion',
  'stock', 'tallas', 'colores', 'imagen', 'activo', 'creado', 'actualizado'
];

/** Caché del listado en segundos (alivia cuota y acelera a muchos usuarios). */
var CACHE_TTL_LIST = 45;
/** Duración del token de sesión (8 horas). */
var TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
/** Intentos fallidos de login permitidos por ventana. */
var MAX_LOGIN_INTENTOS = 8;
/** Ventana de bloqueo por intentos fallidos, en segundos. */
var LOGIN_VENTANA = 600;
/** Espera máxima para adquirir el bloqueo de escritura. */
var LOCK_WAIT_MS = 15000;

/* ============================================================
 *  SEGURIDAD: usuario/contraseña y tokens firmados
 * ============================================================ */

function props_() {
  return PropertiesService.getScriptProperties();
}

function ui_() {
  return SpreadsheetApp.getUi();
}

function sha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

function b64Encode_(text) {
  return Utilities.base64EncodeWebSafe(text).replace(/=+$/, '');
}

function b64Decode_(text) {
  var s = String(text).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString();
}

function sign_(payload) {
  var secret = props_().getProperty('AUTH_SECRET') || '';
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, secret)).replace(/=+$/, '');
}

function createToken_(user) {
  var payload = b64Encode_(JSON.stringify({ u: user, exp: Date.now() + TOKEN_TTL_MS }));
  return payload + '.' + sign_(payload);
}

/** Verifica firma y caducidad. Lanza error si el token no es válido. */
function verifyToken_(token) {
  if (!token) throw new Error('Sesión requerida. Inicia sesión de nuevo.');
  var parts = String(token).split('.');
  if (parts.length !== 2) throw new Error('Sesión inválida.');
  if (sign_(parts[0]) !== parts[1]) throw new Error('Sesión inválida.');
  var data;
  try {
    data = JSON.parse(b64Decode_(parts[0]));
  } catch (err) {
    throw new Error('Sesión inválida.');
  }
  if (!data.exp || data.exp < Date.now()) throw new Error('La sesión expiró. Inicia sesión de nuevo.');
  return data.u;
}

/**
 * Ejecuta una vez desde el editor para crear el usuario admin,
 * la contraseña inicial y el secreto de firma de tokens.
 */
function setupAuth() {
  var props = props_();
  if (!props.getProperty('ADMIN_USER')) props.setProperty('ADMIN_USER', 'admin');
  if (!props.getProperty('ADMIN_PASS_HASH')) props.setProperty('ADMIN_PASS_HASH', sha256Hex_('avellvis2026'));
  if (!props.getProperty('AUTH_SECRET')) props.setProperty('AUTH_SECRET', Utilities.getUuid() + Utilities.getUuid());
  ui_().alert(
    'Autenticación lista.\n\n' +
    'Usuario: ' + props.getProperty('ADMIN_USER') + '\n' +
    'Contraseña inicial: avellvis2026\n\n' +
    'Cámbiala en el menú "Avellvis > Cambiar contraseña de administrador".'
  );
}

/** Cambia la contraseña del administrador (queda guardada hasheada). */
function setAdminPassword() {
  var respuesta = ui_().prompt('Cambiar contraseña', 'Nueva contraseña de administrador (mínimo 8 caracteres):', ui_().ButtonSet.OK_CANCEL);
  if (respuesta.getSelectedButton() !== ui_().Button.OK) return;
  var pass = String(respuesta.getResponseText() || '').trim();
  if (pass.length < 8) {
    ui_().alert('La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  props_().setProperty('ADMIN_PASS_HASH', sha256Hex_(pass));
  ui_().alert('Contraseña actualizada correctamente.');
}

/** Valida credenciales, limita intentos fallidos y devuelve un token firmado. */
function login_(username, password) {
  var props = props_();
  var esperadoUsuario = props.getProperty('ADMIN_USER') || '';
  var esperadoHash = props.getProperty('ADMIN_PASS_HASH') || '';
  if (!esperadoUsuario || !esperadoHash) {
    throw new Error('Autenticación no configurada. Ejecuta setupAuth() en Apps Script.');
  }

  var cache = CacheService.getScriptCache();
  var clave = 'int_' + b64Encode_(String(username)).slice(0, 40);
  var intentos = Number(cache.get(clave) || 0);
  if (intentos >= MAX_LOGIN_INTENTOS) {
    throw new Error('Demasiados intentos fallidos. Espera ' + Math.ceil(LOGIN_VENTANA / 60) + ' minutos.');
  }

  if (String(username) !== esperadoUsuario || sha256Hex_(String(password)) !== esperadoHash) {
    cache.put(clave, String(intentos + 1), LOGIN_VENTANA);
    throw new Error('Usuario o contraseña incorrectos.');
  }

  cache.remove(clave);
  return {
    user: esperadoUsuario,
    token: createToken_(esperadoUsuario),
    expiresIn: TOKEN_TTL_MS
  };
}

/** Serializa escrituras: evita choques cuando hay varias conexiones a la vez. */
function conBloqueo_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    throw new Error('El servidor está ocupado, intenta de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
 *  CACHÉ DEL LISTADO
 * ============================================================ */

function invalidarCacheListado_() {
  try { CacheService.getScriptCache().remove('listado'); } catch (err) {}
}

function listProductsCached_() {
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('listado');
  if (guardado) {
    try { return JSON.parse(guardado); } catch (err) {}
  }
  var productos = listProducts_();
  try {
    var json = JSON.stringify(productos);
    /* Límite de 100 KB por entrada en la caché de Apps Script. */
    if (json.length < 95000) cache.put('listado', json, CACHE_TTL_LIST);
  } catch (err) {}
  return productos;
}

/**
 * Ejecuta esta función una vez desde el editor de Apps Script
 * para crear la pestaña "Productos" con las columnas necesarias.
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Encabezados
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#f3e5ab')
    .setBackground('#1a1a1a')
    .setHorizontalAlignment('center');

  // Anchos de columna
  var widths = [140, 220, 100, 90, 180, 100, 150, 80, 160, 280, 320, 80, 150, 150];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  // Filtro y formato en fila 1 (solo si no existe)
  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, 1, HEADERS.length).createFilter();
  }

  // Validación de datos para la columna "filtro" (F) y "activo" (L)
  var filtroRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['mujer', 'hombre', 'deportivo', 'casual'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, 500, 1).setDataValidation(filtroRule);

  var activoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1', '0'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 12, 500, 1).setDataValidation(activoRule);

  // Fila de ejemplo (borrarla si no la necesitas)
  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, 1, HEADERS.length).setValues([[
      'pEJEMPLO01', 'Top Minimal Seamless', 'TS-01', 24, 'Mujer / Haute Couture',
      'mujer', 'SS26 Exclusive', 10, 'XS,S,M,L',
      'Negro Ébano#111111|Oro Champagne#d4af37', 'https://ejemplo.com/imagen.jpg',
      '1', new Date(), new Date()
    ]]);
  }

  SpreadsheetApp.getUi().alert(
    '¡Lista la hoja "' + SHEET_NAME + '"!\n\n' +
    'Columnas creadas: ' + HEADERS.join(', ') + '\n\n' +
    'Siguiente paso: Implementar > Nueva implementación > Aplicación web.\n' +
    'Luego pega la URL /exec en js/config.js.'
  );
}

/** Menú personalizado en la hoja de cálculo */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Avellvis')
    .addItem('Configurar hoja Productos', 'setupSheet')
    .addItem('Configurar seguridad', 'setupAuth')
    .addItem('Cambiar contraseña de administrador', 'setAdminPassword')
    .addToUi();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function colToIndex_() {
  var idx = {};
  for (var i = 0; i < HEADERS.length; i++) idx[HEADERS[i]] = i + 1;
  return idx;
}

function parseTallas_(raw) {
  if (!raw) return [];
  return String(raw).split(',').map(function (t) { return t.trim(); }).filter(Boolean);
}

function parseColores_(raw) {
  if (!raw) return [];
  // Formato: nombre#hex|nombre#hex|...
  return String(raw).split('|').map(function (c) {
    var parts = c.split('#');
    var nombre = (parts[0] || '').trim();
    var hex = parts[1] ? '#' + parts[1].replace(/^#/, '') : '#111111';
    return { nombre: nombre || 'Color', hex: hex, img: '' };
  }).filter(function (c) { return c.nombre; });
}

function serializeColores_(colores) {
  if (!colores || !colores.length) return '';
  return colores.map(function (c) {
    return (c.nombre || 'Color') + '#' + String(c.hex || '#111111').replace(/^#/, '');
  }).join('|');
}

function rowToProduct_(values) {
  var o = {};
  HEADERS.forEach(function (h, i) { o[h] = values[i]; });
  return {
    id: String(o.id || ''),
    nombre: String(o.nombre || ''),
    sku: String(o.sku || '') || null,
    precio: Number(o.precio) || 0,
    categoria: String(o.categoria || ''),
    filtro: String(o.filtro || 'casual'),
    edicion: String(o.edicion || ''),
    stock: parseInt(o.stock, 10) || 0,
    tallas: parseTallas_(o.tallas),
    colores: parseColores_(o.colores),
    imagen: String(o.imagen || ''),
    active: String(o.activo) === '1' || String(o.activo).toLowerCase() === 'true' ? 1 : 0
  };
}

function productToRow_(p, existing) {
  var now = new Date().toISOString();
  return [
    String(p.id || existing.id || 'p' + Date.now() + Math.floor(Math.random() * 1000)),
    String(p.nombre || ''),
    String(p.sku || ''),
    Number(p.precio) || 0,
    String(p.categoria || ''),
    String(p.filtro || 'casual'),
    String(p.edicion || ''),
    parseInt(p.stock, 10) || 0,
    (p.tallas || []).join(','),
    serializeColores_(p.colores),
    String(p.imagen || ''),
    p.active ? 1 : 0,
    existing ? existing.creado : now,
    now
  ];
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function listProducts_() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  return values
    .filter(function (r) { return r[0] !== '' && r[1] !== ''; })
    .map(rowToProduct_);
}

function findRowById_(id) {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function saveProduct_(product) {
  if (!product || !product.nombre) throw new Error('Producto sin nombre.');
  var sheet = getSheet_();
  var id = product.id || 'p' + Date.now() + Math.floor(Math.random() * 1000);
  product.id = id;
  var rowNum = findRowById_(id);
  var existing = rowNum > 0 ? { id: id, creado: sheet.getRange(rowNum, HEADERS.length - 1).getValue() } : null;
  var row = productToRow_(product, existing);
  if (rowNum > 0) {
    sheet.getRange(rowNum, 1, 1, HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return product;
}

function deleteProduct_(id) {
  var rowNum = findRowById_(id);
  if (rowNum > 0) {
    getSheet_().deleteRow(rowNum);
    return true;
  }
  return false;
}

function bulkSave_(products) {
  if (!products || !products.length) return 0;
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  var existingIds = {};
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (r, i) {
      existingIds[String(r[0])] = i + 2;
    });
  }
  var now = new Date().toISOString();
  var rows = [];
  var rowNumbers = [];
  products.forEach(function (p) {
    if (!p.nombre) return;
    var id = p.id || 'p' + Date.now() + Math.floor(Math.random() * 100000);
    p.id = id;
    var existing = existingIds[id] ? { id: id, creado: sheet.getRange(existingIds[id], HEADERS.length - 1).getValue() } : null;
    rows.push(productToRow_(p, existing));
    rowNumbers.push(existingIds[id] || 0);
  });
  // Agrupar: actualizaciones una a una, inserciones en bloque
  var toInsert = [];
  rows.forEach(function (row, i) {
    if (rowNumbers[i] > 0) {
      sheet.getRange(rowNumbers[i], 1, 1, HEADERS.length).setValues([row]);
    } else {
      toInsert.push(row);
    }
  });
  if (toInsert.length) {
    sheet.getRange(last + 1, 1, toInsert.length, HEADERS.length).setValues(toInsert);
  }
  return rows.length;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'list') return jsonResponse_({ ok: true, products: listProductsCached_() });
    return jsonResponse_({ ok: false, error: 'Acción no válida: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action;

    if (action === 'list') {
      return jsonResponse_({ ok: true, products: listProductsCached_() });
    }

    if (action === 'login') {
      var sesion = login_(body.username, body.password);
      return jsonResponse_({
        ok: true,
        user: sesion.user,
        token: sesion.token,
        expiresIn: sesion.expiresIn
      });
    }

    /* A partir de aquí se exige un token válido. */
    verifyToken_(body.token);

    if (action === 'save') {
      var saved = conBloqueo_(function () {
        var producto = saveProduct_(body.product);
        invalidarCacheListado_();
        return producto;
      });
      return jsonResponse_({ ok: true, product: saved });
    }

    if (action === 'delete') {
      var borrado = conBloqueo_(function () {
        var ok = deleteProduct_(body.id);
        invalidarCacheListado_();
        return ok;
      });
      return jsonResponse_({ ok: true, deleted: borrado });
    }

    if (action === 'bulk') {
      var cantidad = conBloqueo_(function () {
        var n = bulkSave_(body.products || []);
        invalidarCacheListado_();
        return n;
      });
      return jsonResponse_({ ok: true, count: cantidad });
    }

    return jsonResponse_({ ok: false, error: 'Acción no válida: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}
