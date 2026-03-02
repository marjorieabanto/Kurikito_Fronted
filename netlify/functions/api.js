export async function handler(event) {
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; // lo pondrás en Netlify
  if (!APPS_SCRIPT_URL) {
    return json(500, { ok: false, error: "Falta APPS_SCRIPT_URL en variables de entorno" });
  }

  try {
    const method = event.httpMethod || "GET";

    // Construir URL final hacia Apps Script
    const url = new URL(APPS_SCRIPT_URL);

    // Forward query params (GET /api?action=...)
    if (event.queryStringParameters) {
      for (const [k, v] of Object.entries(event.queryStringParameters)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    // Forward body (POST) tal cual
    const hasBody = event.body && event.body.length > 0;
    const body = hasBody ? event.body : undefined;

    const resp = await fetch(url.toString(), {
      method,
      headers: {
        // Apps Script entiende JSON si le mandas Content-Type
        "Content-Type": event.headers["content-type"] || "application/json"
      },
      body: method === "GET" || method === "HEAD" ? undefined : body
    });

    const text = await resp.text();

    // Devolvemos al frontend con CORS abierto (por si pruebas en otros dominios)
    return {
      statusCode: resp.status,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      },
      body: text
    };
  } catch (err) {
    return json(500, { ok: false, error: String(err?.message || err) });
  }
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
  };
}
