function listInventario_(filters) {
  filters = filters || {};

  const productos = listProductos_();
  const ventas = listVentas_({});
  const compras = listCompras_({});

  const map = {};

  // Base productos
  productos.forEach(p => {
    const id = String(p.productoId || "").trim();
    if (!id) return;

    map[id] = {
      productoId: id,
      nombre: String(p.nombre || "").trim(),
      totalComprado: 0,
      totalVendido: 0,
      stockActual: 0,
      precioPromedioCompra: 0,
      ultimoMovimiento: "",
      tipoUltimoMovimiento: "",
      _importeCompra: 0,
      _ultimaFecha: null
    };
  });

  // Compras suman stock
  compras.forEach(c => {
    const id = String(c.productoId || "").trim();
    if (!id) return;

    if (!map[id]) {
      map[id] = {
        productoId: id,
        nombre: "",
        totalComprado: 0,
        totalVendido: 0,
        stockActual: 0,
        precioPromedioCompra: 0,
        ultimoMovimiento: "",
        tipoUltimoMovimiento: "",
        _importeCompra: 0,
        _ultimaFecha: null
      };
    }

    const cantidad = num_(c.cantidad);
    const precio = num_(c.precioCompraUnit);

    map[id].totalComprado += cantidad;
    map[id].stockActual += cantidad;
    map[id]._importeCompra += cantidad * precio;

    const fecha = toDate_(c.fecha);
    if (fecha && (!map[id]._ultimaFecha || fecha > map[id]._ultimaFecha)) {
      map[id]._ultimaFecha = fecha;
      map[id].ultimoMovimiento = Utilities.formatDate(
        fecha,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
      map[id].tipoUltimoMovimiento = "COMPRA";
    }
  });

 // Ventas restan stock
  ventas.forEach(v => {
  const id = String(v.productoId || "").trim();
  if (!id) return;

  if (!map[id]) {
    map[id] = {
      productoId: id,
      nombre: "",
      totalComprado: 0,
      totalVendido: 0,
      stockActual: 0,
      precioPromedioCompra: 0,
      ultimoMovimiento: "",
      tipoUltimoMovimiento: "",
      _importeCompra: 0,
      _ultimaFecha: null
    };
  }

  const cantidad = num_(v.cantidad);

  map[id].totalVendido += cantidad;
  map[id].stockActual -= cantidad;

  const fecha = toDate_(v.fecha);
  if (fecha && (!map[id]._ultimaFecha || fecha > map[id]._ultimaFecha)) {
    map[id]._ultimaFecha = fecha;
    map[id].ultimoMovimiento = Utilities.formatDate(
      fecha,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
    map[id].tipoUltimoMovimiento = "VENTA";
  }
  });

  let items = Object.keys(map).map(id => {
    const it = map[id];

    const precioPromedio =
      it.totalComprado > 0 ? (it._importeCompra / it.totalComprado) : 0;

    return {
      productoId: it.productoId,
      nombre: it.nombre,
      totalComprado: it.totalComprado,
      totalVendido: it.totalVendido,
      stockActual: it.stockActual,
      precioPromedioCompra: Number(precioPromedio.toFixed(2)),
      ultimoMovimiento: it.ultimoMovimiento,
      tipoUltimoMovimiento: it.tipoUltimoMovimiento,
      estadoStock: getEstadoStock_(it.stockActual, filters.stockMinimo)
    };
  });

  if (filters.productoId) {
    const pr = String(filters.productoId).trim().toLowerCase();
    items = items.filter(it => String(it.productoId || "").toLowerCase() === pr);
  }

  if (filters.q) {
    const q = String(filters.q).trim().toLowerCase();
    items = items.filter(it =>
      `${it.productoId} ${it.nombre} ${it.estadoStock}`.toLowerCase().includes(q)
    );
  }

  if (filters.estadoStock) {
    const est = String(filters.estadoStock).trim().toUpperCase();
    items = items.filter(it => String(it.estadoStock || "").toUpperCase() === est);
  }

  items.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

  if (filters.limit && Number(filters.limit) > 0) {
    items = items.slice(0, Number(filters.limit));
  }

  return items;
}

function getInventarioResumen_(filters, items) {
  items = items || listInventario_(filters || {});

  return {
    totalProductos: items.length,
    stockTotal: sum_(items, x => num_(x.stockActual)),
    bajoStock: items.filter(x => x.estadoStock === "BAJO_STOCK").length,
    sinStock: items.filter(x => x.estadoStock === "SIN_STOCK").length,
    valorInventario: Number(
      sum_(items, x => num_(x.stockActual) * num_(x.precioPromedioCompra)).toFixed(2)
    )
  };
}

function getEstadoStock_(stockActual, stockMinimo) {
  const stock = num_(stockActual);
  const minimo = num_(stockMinimo || 100);

  if (stock <= 0) return "SIN_STOCK";
  if (stock <= minimo) return "BAJO_STOCK";
  return "DISPONIBLE";
}