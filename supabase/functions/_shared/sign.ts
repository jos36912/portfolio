// Firmado AWS SigV4 de URLs presignadas para Cloudflare R2 (S3 API) usando
// Web Crypto (HMAC-SHA256 / SHA-256), sin dependencias externas.
//
// R2 usa region "auto". El bucket se referencia por path-style:
//   https://<endpoint-host>/<bucket>/<object_key>

const encoder = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    "%" + char.charCodeAt(0).toString(16).toUpperCase()
  );
}

function sha256Hex(input: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", encoder.encode(input)).then((digest) => hex(new Uint8Array(digest)));
}

function hmac(key: string | Uint8Array, value: string): Promise<Uint8Array> {
  return crypto.subtle
    .importKey(
      "raw",
      typeof key === "string" ? encoder.encode(key) : key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    .then((cryptoKey) =>
      crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)).then((signature) => new Uint8Array(signature))
    );
}

export interface PresignOptions {
  method: "GET" | "PUT";
  endpointHost: string;
  bucket: string;
  objectKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn: number;
  query?: Record<string, string>;
}

export async function presignUrl(options: PresignOptions): Promise<string> {
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${options.accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(options.expiresIn),
    "X-Amz-SignedHeaders": "host",
    ...(options.query || {}),
  };

  const sortedKeys = Object.keys(query).sort();
  const canonicalQuery = sortedKeys
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(query[key])}`)
    .join("&");

  const canonicalUri = "/" +
    options.bucket + "/" +
    options.objectKey.split("/").map(encodeRfc3986).join("/");

  const canonicalHeaders = `host:${options.endpointHost}\n`;
  const signedHeaders = "host";

  const canonicalRequest = [
    options.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const dateKey = await hmac("AWS4" + options.secretAccessKey, dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, service);
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));

  return `https://${options.endpointHost}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
