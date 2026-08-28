function list_(sheetName, idField, filters, searchableFields) {
  const sheet = getSheet_(sheetName);
  const { headers, rows } = readAll_(sheet);

  let items = rows.map(r => rowToObj_(headers, r));

  // Filtros por fecha (si existe columna fecha)
  items = items.filter(it => {
    if (!("fecha" in it)) return true;
    const itDate = toDate_(it.fecha);
    if (!itDate) return true;

    const fromOk = filters.from ? (itDate >= toDate_(filters.from)) : true;
    const toOk = filters.to ? (itDate <= toDate_(filters.to)) : true;
    return fromOk && toOk;
  });

  // Filtro por estado (ventas)
  if (filters.estado) {
    const est = String(filters.estado).toLowerCase();
    items = items.filter(it => String(it.estado || "").toLowerCase() === est);
  }



  // Filtro por cliente
  if (filters.cliente) {
    const cl = String(filters.cliente).toLowerCase();
    items = items.filter(it => String(it.cliente || "").toLowerCase().includes(cl));
  }

  // Filtro por productoId
  if (filters.productoId) {
    const pr = String(filters.productoId).toLowerCase();
    items = items.filter(it => String(it.productoId || "").toLowerCase() === pr);
  }

  // Filtro por ventaId
  if (filters.ventaId) {
    const pr = String(filters.ventaId).toLowerCase();
    items = items.filter(it => String(it.ventaId || "").toLowerCase() === pr);
  }

  // Filtro por metodo (pagos)
    if (filters.metodo) {
      const est = String(filters.metodo).toLowerCase();
      items = items.filter(it => String(it.metodo || "").toLowerCase() === est);
    }
  // Buscador q
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    items = items.filter(it => {
      const fields = (searchableFields || []).map(f => String(it[f] || "").toLowerCase());
      fields.push(String(it[idField] || "").toLowerCase());
      return fields.join(" | ").includes(q);
    });
  }

  // Orden por fecha desc si existe
  if (items.length && ("fecha" in items[0])) {
    items.sort((a, b) => {
      const da = toDate_(a.fecha);
      const db = toDate_(b.fecha);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.getTime() - da.getTime();
    });
  }

  if (filters.limit && filters.limit > 0) items = items.slice(0, filters.limit);
  return items;
}

function create_(sheetName, idField, prefix, payload) {
  const sheet = getSheet_(sheetName);
  const { headers } = readAll_(sheet);

  if (headers.indexOf(idField) === -1) {
    throw new Error(`La hoja ${sheetName} debe tener la columna '${idField}' en la fila 1.`);
  }

  const id = generateId_(prefix);
  
  const row = new Array(headers.length).fill("");
  row[headers.indexOf(idField)] = id;

  Object.keys(payload || {}).forEach(k => {
    const idx = headers.indexOf(k);
    if (idx !== -1 && k !== idField && k != 'gastos') row[idx] = payload[k];
  });

  sheet.appendRow(row);
 if (sheetName === SHEET_VENTAS && Array.isArray(payload.gastos)) {

    payload.gastos.forEach(gasto => {

      const gastoPayload = {
        ...gasto,
        ventaId: id
      };

      create_(SHEET_GASTOS, "gastoId", "G", gastoPayload);

    });
  }
  return { [idField]: id };
}

function update_(sheetName, idField, payload) {
  const sheet = getSheet_(sheetName);
  const { headers, rows, startRow } = readAll_(sheet);

  const id = (payload && payload[idField]) ? String(payload[idField]).trim() : "";
  if (!id) throw new Error(`Para editar debes enviar '${idField}' en el body.`);

  const idIdx = headers.indexOf(idField);
  if (idIdx === -1) throw new Error(`La hoja ${sheetName} debe tener la columna '${idField}'.`);

  const rowPos = rows.findIndex(r => String(r[idIdx] || "").trim() === id);
  if (rowPos === -1) throw new Error(`No se encontró ${idField}=${id} en ${sheetName}.`);

  const sheetRowNumber = startRow + rowPos;
  const currentRow = rows[rowPos].slice();

  Object.keys(payload || {}).forEach(k => {
    if (k === idField) return;
    const idx = headers.indexOf(k);
    if (idx !== -1) currentRow[idx] = payload[k];
  });

  sheet.getRange(sheetRowNumber, 1, 1, headers.length).setValues([currentRow]);
  return { [idField]: id, updated: true };
}


function sheetExists_(name) {
  return !!SpreadsheetApp.getActive().getSheetByName(name);
}


function getById_(sheetName, idField, idValue) {
  const sheet = getSheet_(sheetName);
  const { headers, rows } = readAll_(sheet);

  const idx = headers.indexOf(idField);
  if (idx === -1) throw new Error(`La hoja ${sheetName} no tiene columna ${idField}`);

  const row = rows.find(r => String(r[idx] || "").trim() === String(idValue).trim());
  return row ? rowToObj_(headers, row) : null;
}


function listByField_(sheetName, field, value) {
  const sheet = getSheet_(sheetName);
  const { headers, rows } = readAll_(sheet);

  const idx = headers.indexOf(field);
  if (idx === -1) throw new Error(`La hoja ${sheetName} no tiene la columna '${field}'.`);

  return rows
    .filter(r => String(r[idx] || "").trim() === String(value).trim())
    .map(r => rowToObj_(headers, r));
}


function getSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`No existe la hoja '${name}'.`);
  return sheet;
}

function readAll_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) throw new Error(`La hoja ${sheet.getName()} está vacía.`);

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  if (lastRow === 1) return { headers, rows: [], startRow: 2 };

  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return { headers, rows, startRow: 2 };
}

function rowToObj_(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    if (!key) continue;
    obj[key] = row[i];
  }
  return obj;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (_) {
    throw new Error("Body inválido. Envía JSON válido.");
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function num_(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  const clean = String(value)
    .replace(/[^\d.,-]/g, "")  
    .replace(/,/g, "");        

  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function sum_(arr, selector) {
  return (arr || []).reduce((acc, x) => acc + selector(x), 0);
}

function toDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) return value;

  const s = String(value).trim();
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));

  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));

  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function generateId_(prefix) {
  // V-YYYYMMDD-0001  / C-YYYYMMDD-0001
  const lock = LockService.getScriptLock();
  lock.waitLock(3000);

  try {
    const props = PropertiesService.getScriptProperties();
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    const key = `SEQ_${prefix}_${today}`;
    const current = Number(props.getProperty(key) || "0") + 1;
    props.setProperty(key, String(current));
    return `${prefix}-${today}-${String(current).padStart(4, "0")}`;
  } finally {
    lock.releaseLock();
  }
}

function checkApiKey_(e) {
  if (!REQUIRE_API_KEY) return;

  const p = (e && e.parameter) ? e.parameter : {};
  const provided = String(p.key || "").trim();

  const props = PropertiesService.getScriptProperties();
  const expected = String(props.getProperty(API_KEY_PROP) || "").trim();

  if (!expected) throw new Error("API_KEY no está configurada en Script Properties.");
  if (!provided || provided !== expected) throw new Error("No autorizado: API KEY inválida.");
}