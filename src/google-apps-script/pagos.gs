function resolveClienteDeVenta_(ventaId) {
  const venta = getById_(SHEET_VENTAS, "ventaId", ventaId);
  return venta ? String(venta.cliente || "") : "";
}

function listPagos_(filters) {
  const normalizedFilters = { ...(filters || {}) };
  delete normalizedFilters.cliente;

  let items = list_(SHEET_PAGOS, "pagoId", normalizedFilters, ["fecha", "ventaId", "metodo", "tipoMovimiento", "origen"])
    .map(p => ({ ...p, cliente: resolveClienteDeVenta_(p.ventaId) }));

  if (filters && filters.cliente) {
    const cliente = String(filters.cliente).trim().toLowerCase();
    items = items.filter(p => String(p.cliente || "").trim().toLowerCase().includes(cliente));
  }

  return items;
}

function ensurePagoHeaders_() {
  const sheet = getSheet_(SHEET_PAGOS);
  const required = [
    "pagoId",
    "ventaId",
    "fecha",
    "metodo",
    "monto",
    "tipoMovimiento",
    "origen",
    "estado",
    "aplicadoAventaId",
    "saldoRestante",
    "observacion"
  ];

  const currentHeaders = (sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0] || []).map(h => String(h || "").trim());
  const extras = currentHeaders.filter(h => !required.includes(h));
  const canonicalHeaders = required.concat(extras);

  const needsReorder = !currentHeaders.length || currentHeaders.length !== canonicalHeaders.length || currentHeaders.some((h, idx) => h !== canonicalHeaders[idx]);

  if (needsReorder) {
    sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);

    const allRows = sheet.getDataRange().getValues();
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i] || [];
      const normalizedRow = Array(canonicalHeaders.length).fill("");

      for (let j = 0; j < currentHeaders.length; j++) {
        const sourceKey = currentHeaders[j];
        const targetIdx = canonicalHeaders.indexOf(sourceKey);
        if (targetIdx >= 0 && j < row.length) {
          normalizedRow[targetIdx] = row[j];
        }
      }

      sheet.getRange(i + 1, 1, 1, canonicalHeaders.length).setValues([normalizedRow]);
    }
  }

  return canonicalHeaders;
}

function appendPagoRow_(row) {
  const sheet = getSheet_(SHEET_PAGOS);
  const headers = ensurePagoHeaders_();
  const normalized = Array(headers.length).fill("");

  const explicitMap = {
    pagoId: row && row.pagoId,
    ventaId: row && row.ventaId,
    fecha: row && row.fecha,
    metodo: row && row.metodo,
    monto: row && row.monto,
    tipoMovimiento: row && row.tipoMovimiento,
    origen: row && row.origen,
    estado: row && row.estado,
    aplicadoAventaId: row && row.aplicadoAventaId,
    saldoRestante: row && row.saldoRestante,
    observacion: row && row.observacion
  };

  Object.keys(explicitMap).forEach(key => {
    const idx = headers.indexOf(key);
    if (idx >= 0) normalized[idx] = explicitMap[key] ?? "";
  });

  sheet.appendRow(normalized);
  return row;
}

function getVentaDeudaActual_(ventaId) {
  const venta = getById_(SHEET_VENTAS, "ventaId", ventaId);
  if (!venta) throw new Error(`Venta no encontrada: ${ventaId}`);

  const gastos = listByField_(SHEET_GASTOS, "ventaId", ventaId);
  const pagos = sheetExists_(SHEET_PAGOS) ? listByField_(SHEET_PAGOS, "ventaId", ventaId) : [];
  const totales = calcTotalesVenta_(venta, gastos, pagos);

  const deudaActual = Math.max(0, num_(totales.totalAPagar) - num_(totales.totalPagado));
  return {
    venta,
    deudaActual,
    totalAPagar: num_(totales.totalAPagar),
    totalPagado: num_(totales.totalPagado)
  };
}

function listVentasActivasPorCliente_(cliente) {
  if (!cliente) return [];

  const ventas = listVentas_({
    cliente,
    estado: "ACTIVA",
    limit: 0
  });

  return ventas.sort((a, b) => {
    const da = toDate_(a.fecha) || new Date(0);
    const db = toDate_(b.fecha) || new Date(0);
    return da.getTime() - db.getTime();
  });
}

function getSaldoAFavorActivoCliente_(cliente) {
  const pagos = listPagos_({});
  return pagos.filter(p => {
    const tipo = String(p.tipoMovimiento || "").trim().toLowerCase();
    const origen = String(p.origen || "").trim().toLowerCase();
    const estado = String(p.estado || "").trim().toLowerCase();
    const nombreCliente = String(p.cliente || "").trim().toLowerCase();
    return tipo === "saldo_a_favor" && origen === "cuenta" && (estado === "activo" || estado === "parcial") && (!cliente || nombreCliente.includes(String(cliente).trim().toLowerCase()));
  }).sort((a, b) => {
    const da = toDate_(a.fecha) || new Date(0);
    const db = toDate_(b.fecha) || new Date(0);
    return da.getTime() - db.getTime();
  });
}

function applySaldoCuenta_(payload) {
  const cliente = String((payload && payload.cliente) || "").trim();
  const ventaDestinoId = String((payload && payload.ventaDestinoId) || "").trim();
  const pagoIdSaldo = String((payload && payload.pagoIdSaldo) || "").trim();

  if (!cliente && !pagoIdSaldo) {
    throw new Error("Debes enviar cliente o pagoIdSaldo para aplicar el saldo.");
  }

  let saldoRow = null;
  if (pagoIdSaldo) {
    saldoRow = getById_(SHEET_PAGOS, "pagoId", pagoIdSaldo);
  } else {
    const saldos = getSaldoAFavorActivoCliente_(cliente);
    saldoRow = saldos[0] || null;
  }

  if (!saldoRow) {
    throw new Error("No existe saldo a favor activo para aplicar.");
  }

  const clienteSaldo = String((saldoRow.cliente || cliente || resolveClienteDeVenta_(saldoRow.ventaId) || "")).trim();
  const ventaId = ventaDestinoId || String(saldoRow.aplicadoAventaId || "").trim();
  if (!ventaId) {
    const ventas = listVentasActivasPorCliente_(clienteSaldo);
    if (!ventas.length) throw new Error("No hay ventas activas para aplicar el saldo.");
    const ventaSeleccionada = ventas[0];
    const destino = String(ventaSeleccionada.ventaId || "");
    if (!destino) throw new Error("No se pudo determinar la venta destino.");
    applySaldoCuenta_({ cliente: clienteSaldo, ventaDestinoId: destino, pagoIdSaldo: saldoRow.pagoId });
    return { ok: true, data: { applied: true, ventaId: destino } };
  }

  const deudaInfo = getVentaDeudaActual_(ventaId);
  const saldoActual = num_(saldoRow.saldoRestante);
  const montoAplicado = Math.min(saldoActual, Math.max(0, deudaInfo.deudaActual));
  const resto = Math.max(0, saldoActual - montoAplicado);

  const pagoAplicacion = {
    pagoId: generateId_("P"),
    ventaId: ventaId,
    fecha: saldoRow.fecha || new Date(),
    metodo: saldoRow.metodo || "EFECTIVO",
    monto: montoAplicado,
    tipoMovimiento: "aplicacion_saldo",
    origen: "cuenta",
    estado: "aplicado",
    aplicadoAventaId: ventaId,
    saldoRestante: 0,
    observacion: `Saldo a cuenta aplicado a la venta ${ventaId}`
  };

  appendPagoRow_(pagoAplicacion);

  const nuevoEstado = resto > 0 ? "parcial" : "aplicado";
  const saldoActualizado = {
    ...saldoRow,
    estado: nuevoEstado,
    aplicadoAventaId: ventaId,
    saldoRestante: resto,
    observacion: resto > 0 ? `Parcialmente aplicado a la venta ${ventaId}` : `Saldo aplicado a la venta ${ventaId}`
  };

  update_(SHEET_PAGOS, "pagoId", saldoActualizado);

  if (resto > 0) {
    const saldoResidual = {
      pagoId: generateId_("P"),
      ventaId: saldoRow.ventaId,
      fecha: saldoRow.fecha || new Date(),
      metodo: saldoRow.metodo || "EFECTIVO",
      monto: resto,
      tipoMovimiento: "saldo_a_favor",
      origen: "cuenta",
      estado: "activo",
      aplicadoAventaId: "",
      saldoRestante: resto,
      observacion: "Saldo remanente a cuenta del cliente"
    };

    appendPagoRow_(saldoResidual);
  }

  return {
    ok: true,
    data: {
      pagoIdSaldo: saldoRow.pagoId,
      ventaId,
      montoAplicado,
      saldoRestante: resto,
      estado: nuevoEstado
    }
  };
}

function reconcilePagoMovimiento_(payload, mode) {
  const ventaId = String(payload && payload.ventaId ? payload.ventaId : "").trim();
  if (!ventaId) throw new Error("Falta ventaId para registrar el pago.");

  ensurePagoHeaders_();

  const ventaInfo = getVentaDeudaActual_(ventaId);
  const monto = num_(payload.monto);
  const cliente = String(payload.cliente || ventaInfo.venta.cliente || "").trim();
  const fecha = payload.fecha || new Date();
  const metodo = payload.metodo || "Efectivo";

  if (monto <= 0) {
    throw new Error("El monto del pago debe ser mayor a cero.");
  }

  const pagoAplicado = Math.min(monto, ventaInfo.deudaActual);
  const excedente = Math.max(0, monto - ventaInfo.deudaActual);

  const pagoBase = {
    pagoId: String(payload.pagoId || generateId_("P")),
    ventaId,
    fecha: fecha,
    metodo,
    monto: pagoAplicado,
    tipoMovimiento: "pago",
    origen: "venta",
    estado: "aplicado",
    aplicadoAventaId: ventaId,
    saldoRestante: 0,
    observacion: payload.observacion || "Pago aplicado a la venta"
  };

  if (mode === "update") {
    const currentPago = getById_(SHEET_PAGOS, "pagoId", payload.pagoId);
    if (!currentPago) throw new Error(`No se encontró el pago ${payload.pagoId}.`);

    const merged = { ...currentPago, ...payload, ...pagoBase };
    update_(SHEET_PAGOS, "pagoId", merged);
  } else {
    appendPagoRow_(pagoBase);
  }

  if (excedente > 0) {
    const saldoAFavor = {
      pagoId: generateId_("P"),
      ventaId,
      fecha: fecha,
      metodo,
      monto: excedente,
      tipoMovimiento: "saldo_a_favor",
      origen: "cuenta",
      estado: "activo",
      aplicadoAventaId: "",
      saldoRestante: excedente,
      observacion: "Excedente a cuenta del cliente"
    };

    appendPagoRow_(saldoAFavor);

    const ventaDestinoId = String(payload.cuentaDestinoVentaId || "").trim();
    if (ventaDestinoId) {
      applySaldoCuenta_({ cliente, ventaDestinoId, pagoIdSaldo: saldoAFavor.pagoId });
    } else {
      const ventas = listVentasActivasPorCliente_(cliente);
      if (ventas.length) {
        const ventaMasVieja = ventas[0].ventaId;
        applySaldoCuenta_({ cliente, ventaDestinoId: ventaMasVieja, pagoIdSaldo: saldoAFavor.pagoId });
      }
    }
  }

  return {
    ok: true,
    data: {
      pagoId: pagoBase.pagoId,
      ventaId,
      cliente,
      deudaActual: ventaInfo.deudaActual,
      montoSolicitado: monto,
      montoAplicado: pagoAplicado,
      excedente,
      tipoMovimiento: excedente > 0 ? "saldo_a_favor" : "pago"
    }
  };
}

function createPago_(payload) {
  ensurePagoHeaders_();
  return reconcilePagoMovimiento_(payload || {}, "create");
}

function updatePago_(payload) {
  ensurePagoHeaders_();
  if (!payload || !payload.pagoId) {
    throw new Error("Para actualizar un pago debes enviar pagoId.");
  }
  return reconcilePagoMovimiento_(payload || {}, "update");
}
