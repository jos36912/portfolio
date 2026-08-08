create table if not exists profile (
  id int primary key default 1 check (id = 1),
  name text not null default '',
  role text not null default '',
  tagline text not null default '',
  photo text not null default '',
  location text not null default '',
  summary text[] not null default '{}',
  highlights text[] not null default '{}'
);

create table if not exists experience (
  id bigint generated always as identity primary key,
  role text not null default '',
  company text not null default '',
  period text not null default '',
  summary text not null default '',
  tech text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'recruiter', 'private'))
);

create table if not exists education (
  id bigint generated always as identity primary key,
  degree text not null default '',
  institution text not null default '',
  period text not null default '',
  notes text not null default '',
  visibility text not null default 'public' check (visibility in ('public', 'recruiter', 'private'))
);

create table if not exists projects (
  id bigint generated always as identity primary key,
  title text not null default '',
  description text not null default '',
  tech text[] not null default '{}',
  repo text not null default '',
  demo text not null default '',
  visibility text not null default 'public' check (visibility in ('public', 'recruiter', 'private'))
);

create table if not exists skills (
  id bigint generated always as identity primary key,
  category text not null default '',
  items text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'recruiter', 'private'))
);

create table if not exists contact (
  id int primary key default 1 check (id = 1),
  email text not null default '',
  github text not null default '',
  linkedin text not null default '',
  website text not null default '',
  message text not null default ''
);

-- Compatibilidad con esquemas existentes: agrega la columna si no está.
alter table experience add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'recruiter', 'private'));
alter table education add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'recruiter', 'private'));
alter table projects add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'recruiter', 'private'));
alter table skills add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'recruiter', 'private'));

-- Clasificación campo por campo en profile y contact.
alter table profile add column if not exists name_visibility text not null default 'public'
  check (name_visibility in ('public', 'recruiter', 'private'));
alter table profile add column if not exists role_visibility text not null default 'public'
  check (role_visibility in ('public', 'recruiter', 'private'));
alter table profile add column if not exists tagline_visibility text not null default 'public'
  check (tagline_visibility in ('public', 'recruiter', 'private'));
alter table profile add column if not exists photo_visibility text not null default 'public'
  check (photo_visibility in ('public', 'recruiter', 'private'));
alter table profile add column if not exists location_visibility text not null default 'public'
  check (location_visibility in ('public', 'recruiter', 'private'));
alter table profile add column if not exists summary_visibility text not null default 'public'
  check (summary_visibility in ('public', 'recruiter', 'private'));
alter table profile add column if not exists highlights_visibility text not null default 'public'
  check (highlights_visibility in ('public', 'recruiter', 'private'));

alter table contact add column if not exists email_visibility text not null default 'public'
  check (email_visibility in ('public', 'recruiter', 'private'));
alter table contact add column if not exists github_visibility text not null default 'public'
  check (github_visibility in ('public', 'recruiter', 'private'));
alter table contact add column if not exists linkedin_visibility text not null default 'public'
  check (linkedin_visibility in ('public', 'recruiter', 'private'));
alter table contact add column if not exists website_visibility text not null default 'public'
  check (website_visibility in ('public', 'recruiter', 'private'));
alter table contact add column if not exists message_visibility text not null default 'public'
  check (message_visibility in ('public', 'recruiter', 'private'));

-- Tokens de acceso temporal para reclutadores (Fase 2).
create table if not exists recruiter_tokens (
  id bigint generated always as identity primary key,
  label text not null default '',
  token_hash text not null default '',
  scope text not null default 'extended',
  max_uses int,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz
);

alter table profile enable row level security;
alter table experience enable row level security;
alter table education enable row level security;
alter table projects enable row level security;
alter table skills enable row level security;
alter table contact enable row level security;
alter table recruiter_tokens enable row level security;

-- profile y contact ya no son legibles por anon directamente:
-- el sitio público los consume a través de vistas que enmascaran los campos no públicos.
drop policy if exists "public read profile" on profile;
drop policy if exists "admin write profile" on profile;
create policy "admin write profile" on profile for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Solo las filas públicas son legibles por anon; el resto solo vía sesión de reclutador (RPC).
drop policy if exists "public read experience" on experience;
create policy "public read experience" on experience for select using (visibility = 'public');
drop policy if exists "admin write experience" on experience;
create policy "admin write experience" on experience for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read education" on education;
create policy "public read education" on education for select using (visibility = 'public');
drop policy if exists "admin write education" on education;
create policy "admin write education" on education for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select using (visibility = 'public');
drop policy if exists "admin write projects" on projects;
create policy "admin write projects" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read skills" on skills;
create policy "public read skills" on skills for select using (visibility = 'public');
drop policy if exists "admin write skills" on skills;
create policy "admin write skills" on skills for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read contact" on contact;
drop policy if exists "admin write contact" on contact;
create policy "admin write contact" on contact for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Los tokens nunca son públicos: solo el administrador puede leerlos o modificarlos.
drop policy if exists "admin all recruiter_tokens" on recruiter_tokens;
create policy "admin all recruiter_tokens" on recruiter_tokens for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into profile (id, name, role, tagline, photo, location, summary, highlights) values (
  1,
  'Tu Nombre',
  'Desarrollador/a',
  'Breve frase profesional que resuma tu valor y enfoque.',
  '',
  '',
  array[
    'Párrafo breve sobre ti: qué haces, qué te interesa y qué buscas profesionalmente.',
    'Segundo párrafo opcional con información adicional relevante.'
  ],
  array[
    'Logro o característica destacada 1',
    'Logro o característica destacada 2',
    'Logro o característica destacada 3'
  ]
) on conflict (id) do nothing;

insert into contact (id, email, github, linkedin, website, message) values (
  1,
  'tucorreo@ejemplo.com',
  '',
  '',
  '',
  'Texto breve invitando a contactarte para oportunidades profesionales.'
) on conflict (id) do nothing;

insert into experience (role, company, period, summary, tech) values
  ('Rol o cargo', 'Empresa o proyecto', 'MES AAAA – MES AAAA', 'Descripción breve de responsabilidades y logros.', array['Tecnología 1', 'Tecnología 2']),
  ('Rol o cargo', 'Empresa o proyecto', 'MES AAAA – MES AAAA', 'Descripción breve de responsabilidades y logros.', array['Tecnología 1', 'Tecnología 2']);

insert into education (degree, institution, period, notes) values
  ('Título o grado', 'Institución', 'AAAA – AAAA', 'Nota opcional (menciones, enfoque, etc.)');

insert into projects (title, description, tech, repo, demo) values
  ('Nombre del proyecto', 'Descripción breve del proyecto y su propósito.', array['HTML', 'CSS', 'JavaScript'], '', ''),
  ('Nombre del proyecto', 'Descripción breve del proyecto y su propósito.', array['HTML', 'CSS', 'JavaScript'], '', '');

insert into skills (category, items) values
  ('Categoría (ej. Frontend)', array['Habilidad 1', 'Habilidad 2', 'Habilidad 3']),
  ('Categoría (ej. Backend)', array['Habilidad 1', 'Habilidad 2', 'Habilidad 3']);

-- ============================================================
-- FASE 3: Sesiones temporales, vistas públicas y validación RPC
-- ============================================================

-- Instalar pgcrypto en 'public' para que 'digest' y 'gen_random_bytes' sean
-- visibles bajo 'set search_path = public' dentro de las funciones RPC.
-- (En proyectos existentes donde ya esté en 'extensions', migrarlo primero:
--  drop extension if exists pgcrypto cascade; create extension pgcrypto with schema public;)
create extension if not exists pgcrypto with schema public;

create table if not exists access_sessions (
  id bigint generated always as identity primary key,
  token_id bigint not null references recruiter_tokens(id) on delete cascade,
  session_token_hash text not null default '',
  session_start timestamptz not null default now(),
  session_expires timestamptz not null,
  ip_hash text not null default '',
  user_agent_hash text not null default ''
);

alter table access_sessions enable row level security;
drop policy if exists "admin read access_sessions" on access_sessions;
create policy "admin read access_sessions" on access_sessions for select
  using (auth.role() = 'authenticated');

-- Vistas públicas: exponen solo los campos marcados como públicos.
create or replace view profile_public as
select
  id,
  case when name_visibility = 'public' then name else null end as name,
  case when role_visibility = 'public' then role else null end as role,
  case when tagline_visibility = 'public' then tagline else null end as tagline,
  case when photo_visibility = 'public' then photo else null end as photo,
  case when location_visibility = 'public' then location else null end as location,
  case when summary_visibility = 'public' then summary else '{}' end as summary,
  case when highlights_visibility = 'public' then highlights else '{}' end as highlights
from profile;

create or replace view contact_public as
select
  id,
  case when email_visibility = 'public' then email else null end as email,
  case when github_visibility = 'public' then github else null end as github,
  case when linkedin_visibility = 'public' then linkedin else null end as linkedin,
  case when website_visibility = 'public' then website else null end as website,
  case when message_visibility = 'public' then message else null end as message
from contact;

grant select on profile_public to anon, authenticated;
grant select on contact_public to anon, authenticated;

-- Valida un token de reclutador y abre una sesión temporal.
create or replace function validate_recruiter_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_token recruiter_tokens%rowtype;
  v_session_token text := encode(gen_random_bytes(32), 'hex');
  v_session_expires timestamptz;
  v_used int;
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
begin
  -- Los tokens se entregan en hex de 32 bytes; el admin los guarda como
  -- SHA-256 de los bytes, así que aquí decodificamos el hex antes de hashear.
  if p_token !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  v_hash := encode(digest(decode(p_token, 'hex'), 'sha256'), 'hex');

  select * into v_token
  from recruiter_tokens
  where token_hash = v_hash
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_token.max_uses is not null then
    select count(*) into v_used from access_sessions where token_id = v_token.id;
    if v_used >= v_token.max_uses then
      return jsonb_build_object('ok', false, 'error', 'max_uses');
    end if;
  end if;

  v_session_expires := now() + interval '24 hours';
  if v_token.expires_at is not null and v_token.expires_at < v_session_expires then
    v_session_expires := v_token.expires_at;
  end if;

  update recruiter_tokens set last_used_at = now() where id = v_token.id;

  insert into access_sessions (token_id, session_token_hash, session_expires, ip_hash, user_agent_hash)
  values (
    v_token.id,
    encode(digest(decode(v_session_token, 'hex'), 'sha256'), 'hex'),
    v_session_expires,
    encode(digest(coalesce(v_headers ->> 'x-forwarded-for', ''), 'sha256'), 'hex'),
    encode(digest(coalesce(v_headers ->> 'user-agent', ''), 'sha256'), 'hex')
  );

  return jsonb_build_object(
    'ok', true,
    'session_token', v_session_token,
    'session_expires', to_char(v_session_expires at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'scope', v_token.scope
  );
end;
$$;

grant execute on function validate_recruiter_token(text) to anon, authenticated;

-- Devuelve el contenido ampliado para una sesión válida.
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
  -- Las sesiones se entregan en hex de 32 bytes y se guardan como SHA-256 de esos bytes.
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

-- ============================================================
-- FASE 4: Media Gateway — activos multimedia y certificaciones
-- ============================================================

create table if not exists media_assets (
  id bigint generated always as identity primary key,
  name text not null default '',
  type text not null default 'document'
    check (type in ('image', 'document', 'certificate', 'video', 'audio')),
  mime_type text not null default '',
  provider text not null default 'cloudflare_r2',
  object_key text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'recruiter', 'private')),
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists certifications (
  id bigint generated always as identity primary key,
  title text not null default '',
  issuer text not null default '',
  date text not null default '',
  description text not null default '',
  credential_id text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'recruiter', 'private')),
  media_asset_id bigint references media_assets(id) on delete set null
);

alter table media_assets enable row level security;
alter table certifications enable row level security;

-- anon solo ve los metadatos de activos públicos; el archivo siempre pasa por el gateway.
drop policy if exists "public read media_assets" on media_assets;
create policy "public read media_assets" on media_assets for select using (visibility = 'public');
drop policy if exists "admin write media_assets" on media_assets;
create policy "admin write media_assets" on media_assets for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read certifications" on certifications;
create policy "public read certifications" on certifications for select using (visibility = 'public');
drop policy if exists "admin write certifications" on certifications;
create policy "admin write certifications" on certifications for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Vista pública de certificaciones: oculta credential_id (solo para reclutadores).
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

-- Entrega los datos de un activo solo si la visibilidad lo permite.
-- La sesión de reclutador se valida aquí (mismo hashing que get_recruiter_content);
-- el gateway firma después la URL temporal, nunca expone object_key al frontend.
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

