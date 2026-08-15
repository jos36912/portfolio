-- Auditoría de seguridad: endurecimiento de exposición anónima.
-- Corrige tres hallazgos verificados en vivo:
--
--  F1 (ALTA)   revoke_recruiter_token ejecutable por anon (Postgres otorga
--              EXECUTE a PUBLIC por defecto; el grant a authenticated no lo quita).
--              Ahora se revoca de PUBLIC/anon; solo authenticated lo ejecuta.
--
--  F2 (ALTA)   La tabla base certifications exponía credential_id/media_asset_id
--              a anon (la vista lo enmascara, pero la RLS de la tabla lo filtraba).
--              Se revoca el SELECT de anon sobre la tabla base; la vista y el RPC
--              siguen funcionando (el frontend y sync-content.py usan la vista).
--
--  F3 (MEDIA)  La tabla base media_assets exponía object_key a anon.
--              Se revoca el SELECT de anon y se crea la vista media_assets_public
--              (sin object_key) para el respaldo data/content.json.
--
-- Hardening adicional: se revoca EXECUTE de PUBLIC sobre todas las RPC y se
-- vuelve a otorgar de forma explícita y mínima.
--
-- Idempotente: ejecutar en SQL Editor de Supabase.

-- ============================================================
-- F1: revoke_recruiter_token solo para authenticated
-- ============================================================
revoke execute on function public.revoke_recruiter_token(bigint) from public, anon;
grant execute on function public.revoke_recruiter_token(bigint) to authenticated;

-- ============================================================
-- Hardening: quitar PUBLIC de todas las RPC y otorgar explícito
-- ============================================================
revoke execute on function public.validate_recruiter_token(text) from public;
revoke execute on function public.get_recruiter_content(text) from public;
revoke execute on function public.get_media_asset(bigint, text) from public;

grant execute on function public.validate_recruiter_token(text) to anon, authenticated;
grant execute on function public.get_recruiter_content(text) to anon, authenticated;
grant execute on function public.get_media_asset(bigint, text) to anon, authenticated;

-- ============================================================
-- F2: anon ya no lee la tabla base certifications
-- ============================================================
drop policy if exists "public read certifications" on public.certifications;
revoke select on public.certifications from anon;

-- Recrea la vista pública con filtro explícito de visibilidad:
-- garantiza que nunca exponga filas recruiter/private a anon aunque
-- el rol que la ejecuta tenga permisos de dueño (defensa en profundidad).
create or replace view certifications_public as
select
  c.id,
  c.title,
  c.issuer,
  c.date,
  c.description,
  null::text as credential_id,
  c.visibility,
  c.media_asset_id,
  m.type as media_type,
  m.name as media_name,
  m.visibility as media_visibility,
  c.tech
from certifications c
left join media_assets m on m.id = c.media_asset_id
where c.visibility = 'public';

grant select on certifications_public to anon, authenticated;

-- ============================================================
-- F3: anon ya no lee la tabla base media_assets
-- ============================================================
drop policy if exists "public read media_assets" on public.media_assets;
revoke select on public.media_assets from anon;

-- Vista pública de activos para el respaldo: expone metadatos pero
-- nunca el object_key (la ruta real en R2 la resuelve solo el servidor).
create or replace view media_assets_public as
select
  id,
  name,
  type,
  mime_type,
  visibility,
  size_bytes
from media_assets
where visibility = 'public';

grant select on media_assets_public to anon, authenticated;
