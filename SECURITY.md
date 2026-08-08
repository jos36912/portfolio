# Seguridad

Modelo de seguridad del portfolio: contenido de acceso graduado con Supabase (Postgres + RLS + PostgREST) y tokens temporales para reclutadores.

## Principios

1. **El frontend no es seguridad.** Ocultar contenido en JavaScript es presentación, no control de acceso. Todo el acceso se decide del lado servidor (RLS, vistas y funciones RPC).
2. **Mínima exposición.** El visitante público solo recibe lo estrictamente público; el resto se sirve únicamente a través de sesiones de reclutador válidas.
3. **Tokens no reversibles.** Los tokens nunca se almacenan ni se transmiten en texto plano.

## Tokens de reclutador

### Generación (panel de administración)

- Se generan 32 bytes criptográficamente aleatorios con `crypto.getRandomValues`.
- El valor se entrega como **hexadecimal de 64 caracteres** (`^[0-9a-fA-F]{64}$`).
- Se guarda en `recruiter_tokens.token_hash` como **SHA-256 de los 32 bytes** del token (`digest(decode(token, 'hex'), 'sha256')`).
- El token en claro se muestra **una sola vez** al generarlo; si se pierde, se revoca y se genera otro.

### Validación (lado servidor)

`validate_recruiter_token(p_token)`:

- Rechaza cualquier formato distinto a 64 caracteres hex (`invalid`).
- Compara el SHA-256 de los bytes del token contra `token_hash`.
- Rechaza tokens revocados (`revoked_at`) o vencidos (`expires_at`).
- Crea una sesión en `access_sessions` de **24 horas** (o el vencimiento del token, el que ocurra primero), guardando el hash de la sesión, y hashes (SHA-256) del IP y User-Agent para auditoría.

### Consumo de contenido ampliado

`get_recruiter_content(p_session_token)`:

- Exige el mismo formato hex de 64 caracteres para la sesión.
- Busca la sesión por hash, descarta las expiradas y las de tokens revocados.
- Solo así devuelve filas `public` y `recruiter` de experiencia, educación, proyectos y habilidades, y los campos de perfil/contacto con visibilidad `public` o `recruiter`.

## Acceso a datos (RLS)

| Tabla | anon (público) | authenticated (admin) |
|---|---|---|
| `profile` | sin acceso directo | todo |
| `contact` | sin acceso directo | todo |
| `experience`, `education`, `projects`, `skills` | solo filas `visibility = 'public'` | todo |
| `certifications` | solo filas `visibility = 'public'` | todo |
| `media_assets` | solo metadatos de filas `public` | todo |
| `recruiter_tokens` | nada | todo |
| `access_sessions` | nada | lectura |

- El sitio público lee **vistas** (`profile_public`, `contact_public`, `certifications_public`) que enmascaran con `CASE` cada campo cuya visibilidad no sea `public`. Aunque una fila sea legible por anon, los campos privados llegan como `null`/`{}`.
- `certifications_public` oculta siempre `credential_id`; el sitio de reclutador lo recibe vía `get_recruiter_content`. También expone `media_visibility` (la visibilidad del adjunto) para que el frontend sepa si puede previsualizarlo sin token.
- `authenticated` corresponde únicamente al propietario: el sign-up público está desactivado y el acceso se hace con correo y contraseña.

## Media Gateway (Cloudflare R2)

Los archivos (certificados, PDF, imágenes) se guardan en un **bucket privado de Cloudflare R2** y jamás se exponen por URL permanente. El frontend solo conoce el id del activo; la ubicación real (`object_key`) la resuelve el servidor.

### Flujo

1. El navegador pide `GET /functions/v1/media-gateway?asset_id=<id>&session_token=<token>`.
2. La función llama al RPC `get_media_asset(asset_id, session_token)` (`security definer`):
   - `public` → entrega sin sesión.
   - `recruiter` → exige sesión válida en `access_sessions` (mismo hashing SHA-256 que los demás RPC).
   - `private` → igual que `recruiter`: exige sesión de reclutador válida (permite adjuntos solo-visibles para reclutadores).
3. Si el RPC autoriza, la función firma una **presigned URL** contra R2 (SigV4, Web Crypto, sin dependencias) con **TTL de 60 segundos** y responde `302` hacia ella.

### Garantías

- El `object_key` y las credenciales de R2 solo existen en el lado servidor (Edge Function + secrets); no están en el repo ni en `content.json`.
- Las presigned URLs expiran rápido y no aparecen en el HTML (se generan al vuelo). Para documentos sensibles usar `download=1` cuando corresponda.
- CORS abierto solo para GET (navegación); las subidas y borrados exigen **sesión de admin** verificada contra Supabase Auth en la propia función.

### Administración (panel)

- **Medios**: sube por *presigned PUT* (TTL 300 s) a R2; registra el metadato en `media_assets` con `visibility`. Las imágenes se **comprimen en el navegador** antes de subir (WebP, máx. 1600 px, calidad 0.8) para reducir peso en R2 y acelerar el render; el `mime_type`/`object_key` guardan el formato comprimido.
- **Certificaciones**: enlazan un activo; el `credential_id` es solo `recruiter`. El adjunto hereda su visibilidad de `media_assets` (`media_visibility`): con `public` el modal lo previsualiza sin token; con `recruiter`/`private` solo con sesión.

### Operación

- **Rotación R2**: el token S3 puede tener TTL (p. ej. 12 meses). Al vencer, renovarlo o crear uno nuevo en Cloudflare y actualizar los secrets de la función:
  `supabase secrets set R2_SECRET_ACCESS_KEY=...`.
- **Secrets**: las credenciales R2 viven en `supabase secrets` y en `supabase/.env.local` (gitignored). Nunca en el repositorio.
- **Rate limiting**: el gateway incluye un límite básico en memoria (120 req/min/IP). No es distribuido: para un despliegue público real, añadir un WAF o limitación a nivel de red.

## Claves

- La **anon key** es pública por diseño y segura para el navegador; está en `supabase-config.js`.
- La **service_role key** jamás debe usarse en el cliente ni committearse. Solo se utiliza (si acaso) en contextos de servidor de confianza.
- Las RPC se crean con `security definer` y `set search_path = public` para evitar *search path hijacking*.

## Manejo operacional

- **Entrega**: los tokens se comparten por canal privado (correo/mensaje); no deben aparecer en la web pública ni en enlaces visibles.
- **Revocación**: un token revocado deja de servir de inmediato (validate y get_content devuelven error).
- **Expiración**: tokens y sesiones tienen vencimiento propio; el sitio vuelve solo a modo público al expirar.
- **Rotación**: al dudar de una filtración, revocar el token y emitir uno nuevo.
- **No registrar tokens**: evitar volcar tokens o sesiones en logs, analítica o errores de consola.
- **Límite de usos**: `recruiter_tokens.max_uses` permite limitar cuántas sesiones abre un token (opcional).

## Consideraciones y límites conocidos

- No hay *rate limiting* a nivel de aplicación sobre los RPC; la protección de fuerza bruta depende de la longitud del token (256 bits, no adivinable). El gateway de medios sí incluye un límite básico en memoria.
- La sesión vive en el navegador del reclutador (`localStorage`) y caduca por tiempo; para revocación inmediata se revoca el token asociado.
- `data/content.json` es un respaldo de solo contenido público; nunca contiene datos de reclutador ni privados, ni `object_key` de R2.
- Las presigned URLs del gateway apuntan al origen de R2 y son temporales; si se necesita ocultar por completo el origen, migrar a streaming directo en Cloudflare Workers (ver ADR).
