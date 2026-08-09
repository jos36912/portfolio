-- Actualización incremental: revocación inmediata de tokens.
-- 1) get_media_asset ahora rechaza sesiones cuyo token esté revocado.
-- 2) Nueva RPC revoke_recruiter_token: marca revoked_at y borra las sesiones.
-- Idempotente: ejecutar en SQL Editor de Supabase.

-- get_media_asset: recruiter/private exigen sesión válida Y token no revocado.
create or replace function get_media_asset(p_asset_id bigint, p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset media_assets%rowtype;
  v_session access_sessions%rowtype;
  v_token recruiter_tokens%rowtype;
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

  select * into v_token from recruiter_tokens where id = v_session.token_id;
  if not found or v_token.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'revoked');
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

-- Revoca un token y mata sus sesiones de inmediato.
create or replace function revoke_recruiter_token(p_token_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if p_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select exists(select 1 from recruiter_tokens where id = p_token_id) into v_exists;
  if not v_exists then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update recruiter_tokens set revoked_at = now() where id = p_token_id and revoked_at is null;
  delete from access_sessions where token_id = p_token_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function revoke_recruiter_token(bigint) to authenticated;
