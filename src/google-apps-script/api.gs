function doGet(e) {
  try {
    checkApiKey_(e);

    const p = (e && e.parameter) ? e.parameter : {};
    const action = (p.action || "").trim();

    


    if (action === "listVentas") {
      const filters = {
        from: p.from || "",
        to: p.to || "",
        q: p.q || "",
        estado: p.estado || "",
        cliente: p.cliente || "",
        productoId: p.productoId || "",
        sort: (p.sort || "desc").trim().toLowerCase(),
        limit: p.limit ? Number(p.limit) : 0
      };
      return json_({ ok: true, data: listVentas_(filters) });
    }

    if (action === "listVentasPorCliente") {
      const cliente = (p.cliente || "").trim();
      const estado = (p.estado || "").trim();
      const sort = (p.sort || "desc").trim().toLowerCase();

      if (!cliente) return json_({ ok: false, error: "Falta cliente" });

      return json_({
        ok: true,
        data: listVentasPorClienteDetalle_(cliente, estado, sort)
      });
    }

    if (action === "listVentasConProductos") {
      return json_({ ok: true, data: listVentasConProductos_() });
    }

    if (action === "listCompras") {
      const filters = {
        from: p.from || "",
        to: p.to || "",
        q: p.q || "",
        productoId: p.productoId || "",
        limit: p.limit ? Number(p.limit) : 0
      };
      return json_({ ok: true, data: listCompras_(filters) });
    }

    if (action === "listPagos") {
      const filters = {
        from: p.from || "",
        to: p.to || "",
        q: p.q || "",
        ventaId: p.ventaId || "",
        cliente: p.cliente || "",
        metodo: p.metodo || "",
        limit: p.limit ? Number(p.limit) : 0
      };
      return json_({ ok: true, data: listPagos_(filters) });
    }

    if (action === "listProductos") {
      return json_({ ok: true, data: listProductos_() });
    }

if (action === "getVenta") {
  const ventaId = (p.ventaId || "").trim();
  if (!ventaId) return json_({ ok: false, error: "Falta ventaId" });
  return json_({ ok: true, data: getVenta_(ventaId) });
}

if (action === "applySaldoCuenta") {
  const payload = parseBody_(e);
  return json_({ ok: true, data: applySaldoCuenta_(payload) });
}

if (action === "listInventario") {
  const filters = {
    q: p.q || "",
    productoId: p.productoId || "",
    estadoStock: p.estadoStock || "",
    stockMinimo: p.stockMinimo ? Number(p.stockMinimo) : 100,
    limit: p.limit ? Number(p.limit) : 0
  };

  const items = listInventario_(filters);

  return json_({
    ok: true,
    data: {
      items,
      resumen: getInventarioResumen_(filters, items)
    }
  });
}

   
    return json_({ ok: false, error: "Acción GET no soportada." });


  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    checkApiKey_(e);

    const p = (e && e.parameter) ? e.parameter : {};
    const action = (p.action || "").trim();
    const body = parseBody_(e);

    // VENTAS
    if (action === "createVenta") return json_({ ok: true, data: createVenta_(body) });
    if (action === "updateVenta") return json_({ ok: true, data: updateVenta_(body) });

//GASTO
  if (action === "updateGasto") return json_({ ok: true, data: updateGasto_(body) });

      // PAGOS
    if (action === "createPago") return json_({ ok: true, data: createPago_(body) });
    if (action === "updatePago") return json_({ ok: true, data: updatePago_(body) });

    // COMPRAS
    if (action === "createCompra") return json_({ ok: true, data: createCompra_(body) });
    if (action === "updateCompra") return json_({ ok: true, data: updateCompra_(body) });
    if (action === "deleteCompra") return json_({ ok: true, data: deleteCompra_(body) });

    return json_({ ok: false, error: "Acción POST no soportada." });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}