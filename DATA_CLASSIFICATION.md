# Clasificación de datos

Definición de los tres niveles de visibilidad del contenido y qué debe ir en cada uno. El objetivo: mostrar lo suficiente para que te contraten, no para que te hagan un mapa de tu vida en cinco minutos.

## Niveles

| Nivel | Acceso | Se sirve a través de |
|---|---|---|
| `public` | Cualquier visitante | Tablas (RLS) y vistas `profile_public` / `contact_public` / `certifications_public` |
| `recruiter` | Quien valide un token y tenga sesión vigente | RPC `get_recruiter_content` con sesión válida |
| `private` | Solo el propietario (panel de administración) | Panel autenticado; no se expone por REST público |

## Dónde se aplica

- **Listas** (`experience`, `education`, `projects`, `skills`, `certifications`): columna `visibility` por fila (`public` | `recruiter` | `private`).
- **Perfil** (`profile`): visibilidad por campo — `name_visibility`, `role_visibility`, `tagline_visibility`, `photo_visibility`, `location_visibility`, `summary_visibility`, `highlights_visibility`.
- **Contacto** (`contact`): visibilidad por campo — `email_visibility`, `github_visibility`, `linkedin_visibility`, `website_visibility`, `message_visibility`.
- **Medios** (`media_assets`): columna `visibility` por archivo. El **metadato público** (nombre/tipo) puede ser legible, pero el **archivo** solo se sirve a través del Media Gateway, que valida sesión: `public` sin token; `recruiter` **y `private`** con sesión de reclutador válida. En certificaciones, el adjunto expone su visibilidad como `media_visibility`.
- **Datos de sesión** (`access_sessions`, `recruiter_tokens`): siempre `private`; solo lectura para el propietario.

## Qué poner en cada nivel

### Público — visible para todos

Lo que demuestra capacidad sin exponer datos sensibles:

- Nombre y rol/título profesional.
- Frase breve de presentación.
- Habilidades y tecnologías.
- Proyectos destacados (con repos y demos públicos).
- CV resumido si se desea.
- Contacto **limitado** (perfiles públicos: GitHub, LinkedIn; correo con alias si se desea).

### Reclutador — solo con token temporal válido

Contexto ampliado para evaluación profesional:

- Experiencia más detallada (responsabilidades, logros, stack).
- Educación y certificaciones completas.
- Proyectos adicionales o detalles sensibles aún en desarrollo.
- Forma de contacto profesional ampliada (correo directo).
- Cualquier dato que prefieras no exponer de forma permanente.
- **Certificaciones**: el ID de credencial (`credential_id`) y el **archivo** (PDF/imagen del certificado) pueden quedar en este nivel aunque el título/institución sean públicos: se controla con `media_visibility` del adjunto (`recruiter`/`private` → solo con token).

En la interfaz, los ítems `recruiter` aparecen con una franja verde neón al activarse la sesión.

### Privado — solo el propietario

Nunca se publica:

- Documentos de identidad, fechas de nacimiento, ubicaciones precisas del hogar.
- Datos familiares o personales sin relación laboral.
- Tokens y hashes de sesión (`recruiter_tokens`, `access_sessions`).
- Datos que prefieras no mostrar bajo ninguna circunstancia.
- Campos de perfil/contacto marcados como `private`.

## Reglas de consistencia

1. El respaldo público `data/content.json` solo puede contener datos `public` (RLS y vistas lo garantizan al generarse con la anon key).
2. Si un ítem de reclutador se vuelve `private`, deja de entregarse incluso con sesión válida (el RPC filtra por `public`/`recruiter`).
3. Si un campo de perfil/contacto pasa a `private`, la vista pública lo enmascara (`null`) y el RPC ampliado tampoco lo revela.
4. **Los archivos** (objetos R2) nunca van a `content.json` ni al HTML: solo se sirven por el gateway con sesión validada para `recruiter`/`private`. El metadato público (nombre/tipo) sí puede aparecer.
5. Antes de publicar, revisar que ningún dato `recruiter`/`private` se cuele en contenido público o en el respaldo.

## Auditoría de cambios

- Cambiar `public` → `recruiter`/`private` reduce exposición; es seguro en cualquier momento.
- Cambiar `private`/`recruiter` → `public` **aumenta** exposición; verificar dos veces y regenerar `content.json`.
