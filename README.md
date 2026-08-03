# Portfolio

Una web personal profesional de una sola página, con diseño oscuro y contenido **data-driven**: todo el contenido se carga desde `data/content.json`, no se edita directamente en el HTML.

La idea central es que el sitio público consuma una fuente estructurada de datos, que en el futuro será administrada desde un **panel de administración** en la web.

## Características actuales

- Una sola página con navegación por secciones (Inicio, Sobre mí, Hoja de vida, Proyectos, Habilidades, Contacto).
- Tema oscuro, limpio y responsive.
- Contenido 100% manejado desde `data/content.json`.
- Favicon propio (`assets/darkness.ico`).
- Compatible con dispositivos móviles y escritorio.

## Próximas mejoras (futuras versiones)

- **Panel de administración** en la web para gestionar el contenido (perfil, experiencia, educación, proyectos, habilidades, contacto).
- Autenticación real cuando exista una arquitectura clara.
- Soporte para subir imágenes y documentos desde el panel.

## Estructura del proyecto

```
assets/            Recursos estáticos (favicon, imágenes).
data/content.json  Fuente única de contenido estructurado.
index.html         Esqueleto mínimo del sitio.
script.js          Carga content.json y renderiza el sitio.
style.css          Estilos y tema oscuro.
```

## Tecnologías

- HTML5
- CSS3
- JavaScript

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
