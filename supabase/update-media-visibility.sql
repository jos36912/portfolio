-- Actualización incremental: visibilidad del adjunto en certificaciones
-- + get_media_asset permite 'private' con sesión de reclutador válida.
-- Idempotente: ejecutar en SQL Editor de Supabase.

create or replace function get_recruiter_content(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session access_sessions%rowtype;
  v_token recruiter_tokens%rowtype;
begin
  if p_session_token !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_session
  from access_sessions
  where session_token_hash = encode(digest(decode(p_session_token, 'hex'), 'sha256'), 'hex')
    and session_expires > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_token from recruiter_tokens where id = v_session.token_id;
  if not found or v_token.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'revoked');
  end if;

  return jsonb_build_object(
    'ok', true,
    'scope', v_token.scope,
    'experience', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb) from (
        select id, role, company, period, summary, tech, visibility
        from experience where visibility in ('public', 'recruiter')) x),
    'education', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb) from (
        select id, degree, institution, period, notes, visibility
        from education where visibility in ('public', 'recruiter')) x),
    'projects', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb) from (
        select id, title, description, tech, repo, demo, visibility
        from projects where visibility in ('public', 'recruiter')) x),
    'skills', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb) from (
        select id, category, items, visibility
        from skills where visibility in ('public', 'recruiter')) x),
    'certifications', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb) from (
        select c.id, c.title, c.issuer, c.date, c.description, c.credential_id, c.visibility, c.media_asset_id,
               m.type as media_type, m.name as media_name, m.visibility as media_visibility
        from certifications c
        left join media_assets m on m.id = c.media_asset_id
        where c.visibility in ('public', 'recruiter')) x),
    'profile', (select to_jsonb(pr) from (
        select id,
          case when name_visibility in ('public', 'recruiter') then name else null end as name,
          case when role_visibility in ('public', 'recruiter') then role else null end as role,
          case when tagline_visibility in ('public', 'recruiter') then tagline else null end as tagline,
          case when photo_visibility in ('public', 'recruiter') then photo else null end as photo,
          case when location_visibility in ('public', 'recruiter') then location else null end as location,
          case when summary_visibility in ('public', 'recruiter') then summary else '{}' end as summary,
          case when highlights_visibility in ('public', 'recruiter') then highlights else '{}' end as highlights
        from profile limit 1) pr),
    'contact', (select to_jsonb(c) from (
        select id,
          case when email_visibility in ('public', 'recruiter') then email else null end as email,
          case when github_visibility in ('public', 'recruiter') then github else null end as github,
          case when linkedin_visibility in ('public', 'recruiter') then linkedin else null end as linkedin,
          case when website_visibility in ('public', 'recruiter') then website else null end as website,
          case when message_visibility in ('public', 'recruiter') then message else null end as message
        from contact limit 1) c)
  );
end;
$$;

grant execute on function get_recruiter_content(text) to anon, authenticated;

-- Vista pública: expone la visibilidad del adjunto (media_visibility).
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
  m.visibility as media_visibility
from certifications c
left join media_assets m on m.id = c.media_asset_id;

grant select on certifications_public to anon, authenticated;

-- get_media_asset: 'private' se sirve con sesión de reclutador válida (igual que 'recruiter').
create or replace function get_media_asset(p_asset_id bigint, p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset media_assets%rowtype;
  v_session access_sessions%rowtype;
begin
  if p_asset_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_asset from media_assets where id = p_asset_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_asset.visibility = 'public' then
    return jsonb_build_object(
      'ok', true,
      'name', v_asset.name,
      'mime_type', v_asset.mime_type,
      'object_key', v_asset.object_key,
      'visibility', v_asset.visibility
    );
  end if;

  -- recruiter o private: requieren una sesión de reclutador válida.
  if p_session_token !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_session
  from access_sessions
  where session_token_hash = encode(digest(decode(p_session_token, 'hex'), 'sha256'), 'hex')
    and session_expires > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'name', v_asset.name,
    'mime_type', v_asset.mime_type,
    'object_key', v_asset.object_key,
    'visibility', v_asset.visibility
  );
end;
$$;

grant execute on function get_media_asset(bigint, text) to anon, authenticated;
