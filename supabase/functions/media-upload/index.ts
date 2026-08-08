// media-upload: genera una presigned PUT URL hacia Cloudflare R2 para el panel.
//
// POST { name, type, mime_type, visibility }  (requiere sesión de admin)
// Responde { object_key, upload_url }. El panel sube los bytes directamente a
// upload_url y después inserta la fila en media_assets con el object_key.
// El panel nunca expone el object_key al visitante del sitio.

import { presignUrl } from "../_shared/sign.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT")!;
const R2_BUCKET = Deno.env.get("R2_BUCKET")!;
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;

const UPLOAD_URL_TTL_SECONDS = 300;
const MAX_MIME_LENGTH = 120;
const ALLOWED_TYPES = ["image", "document", "certificate", "video", "audio"];
const ALLOWED_VISIBILITY = ["public", "recruiter", "private"];

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

function extensionFromMime(mimeType: string): string {
  const ext = mimeType.split("/")[1] || "bin";
  const cleaned = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return cleaned ? "." + cleaned.slice(0, 8) : ".bin";
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

  let body: { name?: string; type?: string; mime_type?: string; visibility?: string };
  try {
    body = await request.json();
  } catch (_) {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const name = String(body.name || "").trim().slice(0, 200);
  const type = String(body.type || "document");
  const mimeType = String(body.mime_type || "application/octet-stream").trim().slice(0, MAX_MIME_LENGTH);
  const visibility = String(body.visibility || "public");

  if (!name) return json(400, { ok: false, error: "missing_name" });
  if (!ALLOWED_TYPES.includes(type)) return json(400, { ok: false, error: "invalid_type" });
  if (!ALLOWED_VISIBILITY.includes(visibility)) return json(400, { ok: false, error: "invalid_visibility" });

  const objectKey = `media/${type}/${Date.now()}-${crypto.randomUUID()}${extensionFromMime(mimeType)}`;

  let uploadUrl: string;
  try {
    uploadUrl = await presignUrl({
      method: "PUT",
      endpointHost: new URL(R2_ENDPOINT).host,
      bucket: R2_BUCKET,
      objectKey,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
  } catch (_) {
    return json(502, { ok: false, error: "gateway_error" });
  }

  return json(200, { ok: true, object_key: objectKey, upload_url: uploadUrl });
});
