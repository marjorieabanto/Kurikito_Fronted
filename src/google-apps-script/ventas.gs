function listVentas_(filters) {
  return list_(SHEET_VENTAS, "ventaId", filters, ["fecha", "cliente", "productoId", "estado"]);
}

function listVentasConProductos_() {
  return {
    ventas: listVentas_({}),
    productos: listProductos_()
  };
}

function listVentasPorClienteDetalle_(cliente, estado, sort) {
  const ventas = listVentas_({
    cliente,
    estado: estado || "",
    sort: sort || "desc",
    limit: 0
  });

  const productos = listProductos_();
  const map = new Map((productos || []).map(p => [String(p.productoId), String(p.nombre || "") ]));

  return (ventas || []).map(v => ({
    ventaId: v.ventaId,
    fecha: v.fecha,
    cliente: v.cliente,
    productoId: v.productoId,
    productoName: map.get(String(v.productoId)) || "",
    cantidad: v.cantidad,
    precioVentaUnit: v.precioVentaUnit,
    estado: v.estado
  }));
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

  const pagosValidos = (pagos || []).filter(p => {
    const tipo = String(p.tipoMovimiento || "").trim().toLowerCase();
    return tipo !== "saldo_a_favor";
  });

  const totalPagado = sum_(pagosValidos, p => num_(p.monto));
  const saldo = totalAPagar - totalPagado;
  const porcentajePagado = totalAPagar > 0 ? Math.min((totalPagado / totalAPagar) * 100, 100) : 0;

  return {
    totalBase,
    gastosCliente,
    totalAPagar,
    totalPagado,
    saldo,
    porcentajePagado
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