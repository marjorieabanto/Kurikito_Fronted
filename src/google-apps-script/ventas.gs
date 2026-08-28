function listVentas_(filters) {
  // Hoja VENTAS: ventaId, fecha, cliente, productoId, cantidad, precioVentaUnit, estado
  return list_(SHEET_VENTAS, "ventaId", filters, ["fecha", "cliente", "productoId", "estado"]);
}

function listVentasConProductos_() {
  return {
    ventas: listVentas_({}),
    productos: listProductos_()
  };
}

function getVenta_(ventaId) {
  const venta = getById_(SHEET_VENTAS, "ventaId", ventaId);
  if (!venta) throw new Error(`No existe ventaId=${ventaId}`);

  const gastos = listByField_(SHEET_GASTOS, "ventaId", ventaId);
  const pagos = sheetExists_(SHEET_PAGOS) ? listByField_(SHEET_PAGOS, "ventaId", ventaId) : [];

  const totales = calcTotalesVenta_(venta, gastos, pagos);

  return { venta, gastos, pagos, totales };
}

function calcTotalesVenta_(venta, gastos, pagos) {
  const cantidad = num_(venta.cantidad);
  const precioVentaUnit = num_(venta.precioVentaUnit);

  const totalBase = cantidad * precioVentaUnit;

  // gastos asumidos por CLIENTE descuentan lo que debe pagar
  const gastosCliente = sum_(gastos, g => String(g.asumidoPor || "").toUpperCase() === "CLIENTE" ? num_(g.monto) : 0);

  const totalAPagar = totalBase - gastosCliente;

  const totalPagado = sum_(pagos, p => num_(p.monto));
  const saldo = totalAPagar - totalPagado;

  return {
    totalBase,
    gastosCliente,
    totalAPagar,
    totalPagado,
    saldo
  };
}

function createVenta_(payload) {
  // Genera ventaId automáticamente
  return create_(SHEET_VENTAS, "ventaId", "V", payload);
}


function updateVenta_(payload) {
  return update_(SHEET_VENTAS, "ventaId", payload);
}

function createGastos_(payload) {
  // Genera gastoId automáticamente
  return create_(SHEET_GASTOS, "gastoId", "G", payload);
}

function updateGasto_(payload) {
  return update_(SHEET_GASTOS, "gastoId", payload);
}