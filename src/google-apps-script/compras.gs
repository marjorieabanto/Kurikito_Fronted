function listCompras_(filters) {
  // Hoja COMPRAS: compraId, fecha, productoId, cantidad, precioCompraUnit
  return list_(SHEET_COMPRAS, "compraId", filters, ["fecha", "productoId"]);
}

function createCompra_(payload) {
  return create_(SHEET_COMPRAS, "compraId", "C", payload);
}

function updateCompra_(payload) {
  return update_(SHEET_COMPRAS, "compraId", payload);
}

function deleteCompra_(payload) {
  return deleteById_(SHEET_COMPRAS, "compraId", payload && payload.compraId);
}

function listProductos_() {
  // PRODUCTOS: productoId, nombre
  const cache = CacheService.getScriptCache();
  const cacheKey = "productos:v1";
  const cached = cache.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const sheet = getSheet_(SHEET_PRODUCTOS);
  const { headers, rows } = readAll_(sheet);
  const productos = rows.map(r => rowToObj_(headers, r))
                        .filter(p => p.productoId || p.nombre);

  // Cache corto para evitar leer PRODUCTOS en cada petición.
  cache.put(cacheKey, JSON.stringify(productos), 60);
  return productos;
}