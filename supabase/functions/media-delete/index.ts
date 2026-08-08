// media-delete: elimina un objeto de Cloudflare R2 (requiere sesión de admin).
// POST { object_key }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT")!;
const R2_BUCKET = Deno.env.get("R2_BUCKET")!;
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function requireAdmin(request: Request): Promise<boolean> {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;
  if (!token) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  return response.status === 200;
}

// Elimina el objeto de R2. Llamada directa: DELETE /<bucket>/<key> con firma SigV4.
async function deleteObject(objectKey: string): Promise<boolean> {
  const host = new URL(R2_ENDPOINT).host;
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = date.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const encodeSegment = (segment: string) =>
    encodeURIComponent(segment).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  const canonicalUri = "/" + R2_BUCKET + "/" + objectKey.split("/").map(encodeSegment).join("/");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${date}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["DELETE", canonicalUri, "", canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const encoder = new TextEncoder();
  const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const sha256Hex = async (input: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(input))));
  const hmac = async (key: string | Uint8Array, value: string) => {
    const cryptoKey = await crypto.subtle.importKey("raw", typeof key === "string" ? encoder.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
  };

  const stringToSign = ["AWS4-HMAC-SHA256", date, scope, await sha256Hex(canonicalRequest)].join("\n");
  const dateKey = await hmac("AWS4" + R2_SECRET_ACCESS_KEY, dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, service);
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: "DELETE",
    headers: {
      Host: host,
      Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": date,
    },
  });
  return response.status === 204 || response.status === 200;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  if (!(await requireAdmin(request))) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let body: { object_key?: string };
  try {
    body = await request.json();
  } catch (_) {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const objectKey = String(body.object_key || "").trim();
  if (!objectKey || !objectKey.startsWith("media/")) {
    return json(400, { ok: false, error: "invalid_object_key" });
  }

  try {
    const deleted = await deleteObject(objectKey);
    if (!deleted) return json(404, { ok: false, error: "not_found" });
  } catch (_) {
    return json(502, { ok: false, error: "gateway_error" });
  }

  return json(200, { ok: true });
});
