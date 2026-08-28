function listPagos_(filters) {
  // Hoja PAGOS
  return list_(SHEET_PAGOS, "pagoId", filters, ["fecha", "ventaId", "metodo"]);
}

function createPago_(payload) {
  // Genera ventaId automáticamente
  return create_(SHEET_PAGOS, "pagoId", "P", payload);
}


function updatePago_(payload) {
  return update_(SHEET_PAGOS, "pagoId", payload);
}
