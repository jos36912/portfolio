# Portfolio

Una web personal profesional de una sola página, con diseño oscuro y contenido **data-driven**: todo el contenido se carga desde `data/content.json`, no se edita directamente en el HTML.

La idea central es que el sitio público consuma una fuente estructurada de datos, que en el futuro será administrada desde un **panel de administración** en la web.

## Características actuales

- Una sola página con navegación por secciones (Inicio, Sobre mí, Hoja de vida, Proyectos, Habilidades, Contacto).
- Tema oscuro, limpio y responsive.
- Contenido 100% manejado desde `data/content.json`.
- Favicon propio (`assets/darkness.ico`).
- Panel de administración con inicio de sesión protegido (Supabase Auth).
- Compatible con dispositivos móviles y escritorio.

## Próximas mejoras (futuras versiones)

- Módulos del panel de administración (perfil, experiencia, educación, proyectos, habilidades, contacto).
- Persistencia del contenido en Supabase y migración del sitio público a consumir la API.
- Soporte para subir imágenes y documentos desde el panel.

## Estructura del proyecto

```
assets/            Recursos estáticos (favicon, imágenes).
data/content.json  Fuente única de contenido estructurado.
index.html         Esqueleto mínimo del sitio.
script.js          Carga content.json y renderiza el sitio.
style.css          Estilos y tema oscuro.
admin.html         Panel de administración (login + panel).
admin.js           Lógica de sesión y login con Supabase.
admin.css          Estilos del panel de administración.
supabase-config.js Configuración del proyecto Supabase (URL + anon key).
```

## Tecnologías

- HTML5
- CSS3
- JavaScript
- Supabase (Auth y, próximamente, base de datos)

## Panel de administración

El panel está en `admin.html` y solo permite entrar con una sesión válida de Supabase (correo + contraseña).

### Configuración en Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com) y copiar el *Project URL* y la *anon public key* en `supabase-config.js`.
2. En **Authentication → Providers → Email**: habilitar el inicio de sesión con correo y contraseña.
3. Crear tu usuario en **Auth → Users** con tu correo.
4. Desactivar el sign-up público para que solo tú puedas registrarte/entrar.

La `anon key` es pública por diseño y es segura para el navegador. La `service_role key` jamás debe usarse en el cliente.

## Instalación / Uso local

El sitio usa `fetch` para cargar los datos, así que debe servirse por HTTP:

```bash
python3 -m http.server
```

Luego abre `http://localhost:8000` en tu navegador.

## Cómo editar el contenido

El contenido se edita en `data/content.json`:

- `profile`: nombre, rol, tagline, resumen y fotografía.
- `experience`: experiencia laboral.
- `education`: educación.
- `projects`: proyectos y sus enlaces.
- `skills`: habilidades por categoría.
- `contact`: correo y enlaces de contacto.
- `sections`: orden y etiquetas de las secciones.

Próximamente este archivo será administrado desde el panel de administración en la web.
