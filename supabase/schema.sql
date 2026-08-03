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
  tech text[] not null default '{}'
);

create table if not exists education (
  id bigint generated always as identity primary key,
  degree text not null default '',
  institution text not null default '',
  period text not null default '',
  notes text not null default ''
);

create table if not exists projects (
  id bigint generated always as identity primary key,
  title text not null default '',
  description text not null default '',
  tech text[] not null default '{}',
  repo text not null default '',
  demo text not null default ''
);

create table if not exists skills (
  id bigint generated always as identity primary key,
  category text not null default '',
  items text[] not null default '{}'
);

create table if not exists contact (
  id int primary key default 1 check (id = 1),
  email text not null default '',
  github text not null default '',
  linkedin text not null default '',
  website text not null default '',
  message text not null default ''
);

alter table profile enable row level security;
alter table experience enable row level security;
alter table education enable row level security;
alter table projects enable row level security;
alter table skills enable row level security;
alter table contact enable row level security;

create policy "public read profile" on profile for select using (true);
create policy "admin write profile" on profile for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read experience" on experience for select using (true);
create policy "admin write experience" on experience for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read education" on education for select using (true);
create policy "admin write education" on education for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read projects" on projects for select using (true);
create policy "admin write projects" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read skills" on skills for select using (true);
create policy "admin write skills" on skills for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read contact" on contact for select using (true);
create policy "admin write contact" on contact for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

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
