# Portfolio

Una web personal profesional de una sola página, con diseño oscuro y contenido **data-driven**: el contenido vive en una fuente estructurada (Supabase) y se administra desde un **panel de administración** en la web. El sitio público consume esa fuente y la renderiza; nada se edita directamente en el HTML.

## Características actuales

- Una sola página con navegación por secciones (Inicio, Sobre mí, Hoja de vida, Proyectos, Habilidades, Contacto).
- Tema oscuro, limpio y responsive.
- Contenido persistido en **Supabase** (base de datos con RLS) con respaldo en `data/content.json`.
- Panel de administración con inicio de sesión protegido (Supabase Auth).
- Módulos del panel completos: **Perfil**, **Experiencia**, **Educación**, **Proyectos**, **Habilidades** y **Contacto** (crear, editar y eliminar).
- Script `sync-content.py` para regenerar `data/content.json` desde Supabase.
- Favicon propio (`assets/darkness.ico`).
- Compatible con dispositivos móviles y escritorio.

## Próximas mejoras (futuras versiones)

- Soporte para subir imágenes y documentos desde el panel.

## Estructura del proyecto

```
assets/            Recursos estáticos (favicon, imágenes, vendor).
data/content.json  Respaldo del contenido (el sitio usa Supabase primero).
index.html         Esqueleto mínimo del sitio.
script.js          Carga el contenido (Supabase → fallback content.json) y renderiza.
style.css          Estilos y tema oscuro.
supabase-config.js Configuración compartida de Supabase (URL + anon key).
supabase/schema.sql  Esquema de la base de datos (tablas, RLS y datos iniciales).
sync-content.py      Regenera data/content.json con los datos actuales de Supabase.
admin/             Panel de administración (login + panel), en carpeta separada.
admin/index.html   Página del panel (se accede en /admin/).
admin/admin.js     Lógica de sesión, login y módulos del panel.
admin/admin.css    Estilos del panel de administración.
```

## Tecnologías

- HTML5
- CSS3
- JavaScript
- Supabase (Auth, Postgres/PostgREST con RLS)

## Panel de administración

El panel está en la carpeta `admin/` (se accede en `/admin/`) y solo permite entrar con una sesión válida de Supabase (correo + contraseña). Se comunica con los recursos compartidos mediante rutas relativas (`../`).

### Configuración en Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com) y copiar el *Project URL* y la *anon public key* en `supabase-config.js`.
2. En **Authentication → Providers → Email**: habilitar el inicio de sesión con correo y contraseña.
3. Crear tu usuario en **Auth → Users** con tu correo.
4. Desactivar el sign-up público para que solo tú puedas registrarte/entrar.
5. En **SQL Editor**, ejecutar el contenido de `supabase/schema.sql` para crear las tablas, las políticas RLS y los datos iniciales.

La `anon key` es pública por diseño y es segura para el navegador. La `service_role key` jamás debe usarse en el cliente.

### Políticas de acceso (RLS)

- **Público (anon)**: solo puede leer (`select`) el contenido.
- **Administrador (authenticated)**: puede crear, leer, actualizar y eliminar. Como el sign-up público está desactivado, `authenticated` es únicamente tu usuario.

## Instalación / Uso local

El sitio usa `fetch`, así que debe servirse por HTTP:

```bash
python3 -m http.server
```

Luego abre `http://localhost:8000` en tu navegador.

## Cómo se administra el contenido

El contenido se edita desde el panel (`/admin/`) y se guarda en Supabase. El sitio público intenta leer de Supabase y, si no está disponible, usa `data/content.json` como respaldo.

Para que el respaldo refleje los últimos cambios del panel, regenera `content.json` desde Supabase antes de hacer commit:

```bash
python3 sync-content.py
```

El script lee las 6 tablas (profile, experience, education, projects, skills, contact) con la anon key de `supabase-config.js` y conserva las secciones estáticas (`site` y `sections`).
