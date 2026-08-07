
Informe técnico preliminar

Propuesta de implementación de visibilidad segmentada y acceso temporal para reclutadores

1. Resumen ejecutivo

El proyecto evoluciona hacia una web personal profesional con enfoque en privacidad por diseño. La propuesta actual no solo contempla contenido público y un panel administrativo privado, sino también un tercer nivel de acceso: contenido visible para reclutadores mediante token temporal de uso controlado.

Este enfoque permite mostrar información ampliada sin exponer de forma permanente el CV completo, certificados o datos de contacto sensibles. El sistema propuesto mantiene la web como una aplicación estática en el frontend, mientras Supabase actúa como fuente de autenticación, almacenamiento y control de acceso lógico.


---

2. Objetivo de la nueva implementación

Implementar una estrategia de publicación de contenido basada en tres niveles de visibilidad:

Público: accesible para cualquier visitante.

Reclutador: accesible mediante un token temporal generado desde el panel administrativo.

Privado: accesible solo desde el panel de administración.


El objetivo es que el sitio sea útil para empleo sin convertirse en una exposición innecesaria de información personal. En otras palabras, mostrar lo suficiente para que te contraten, no lo suficiente para que te hagan un mapa de vida en 5 minutos.


---

3. Propuesta funcional

3.1 Apartado público

El visitante normal solo ve:

Presentación breve.

Habilidades.

Proyectos destacados.

Información de contacto limitada.

Hoja de vida resumida, si se desea.


3.2 Apartado reclutador

Se agregará una sección específica llamada, por ejemplo, “Acceso para reclutadores”.
Esta sección requerirá ingresar un token de uso controlado.

Una vez validado el token:

se habilita contenido ampliado,

comienza el conteo de expiración,

el acceso se mantiene por un tiempo limitado, por ejemplo 24 horas,

al expirar, el usuario vuelve automáticamente al modo público.


3.3 Panel de administración

Desde el panel admin, el propietario podrá:

generar tokens para reclutadores,

definir su duración,

revocarlos manualmente si es necesario,

ver su estado,

desactivar accesos caducados o comprometidos.



---

4. Flujo propuesto del token para reclutadores

4.1 Generación

El token se genera únicamente desde el panel administrativo.

Características recomendadas:

longitud alta,

aleatorio criptográficamente,

no predecible,

almacenado como hash en la base de datos, no en texto plano.


4.2 Entrega

El token puede compartirse manualmente con el reclutador por correo o medio privado.
No debería aparecer en la web pública ni en enlaces visibles sin control.

4.3 Validación

Cuando el reclutador ingresa el token:

1. el sistema verifica que exista,


2. comprueba que no esté expirado,


3. valida que no haya sido revocado,


4. inicia una sesión temporal de acceso ampliado.



4.4 Caducidad

El acceso ampliado expira automáticamente después del tiempo definido, por ejemplo 24 horas.

Tras la expiración:

el contenido ampliado deja de mostrarse,

solo vuelve a verse el contenido público,

el token queda inválido para nuevas sesiones.


4.5 Revocación

El administrador puede revocar un token en cualquier momento:

por seguridad,

por error de entrega,

porque ya no desea mantener el acceso.



---

5. Modelo de datos sugerido

Para soportar esta funcionalidad, conviene extender el modelo actual con una tabla específica para tokens de reclutador.

Tabla: recruiter_tokens

Campos recomendados:

id

token_hash

label o name

created_at

expires_at

revoked_at

last_used_at

max_uses (opcional, si más adelante deseas limitar usos)

scope (por ejemplo: CV completo, certificados, contacto extendido)


Tabla: access_sessions

Opcional, si deseas registrar sesiones temporales:

id

token_id

session_start

session_expires

ip_hash o metadato mínimo de seguridad

user_agent_hash opcional


Esto permitiría controlar con más claridad qué token abrió qué contenido y cuándo.


---

6. Lógica de seguridad recomendada

6.1 Tokens no reversibles

El token nunca debe guardarse en texto plano.
Debe guardarse como hash. Así, si alguien accede a la base de datos, no obtiene los tokens directamente.

6.2 Expiración obligatoria

Todo token debe tener:

fecha de creación,

fecha de expiración,

estado activo/inactivo,

posibilidad de revocación.


6.3 Sesión temporal separada

El token no debería mantener acceso “permanente”.
Lo ideal es que al validarlo se cree una sesión temporal o un flag de acceso con vencimiento propio.

6.4 Validación del lado servidor

La validación del token debe ocurrir en backend o mediante un mecanismo seguro con Supabase y RLS.
No debe confiarse en que el frontend “oculte” contenido, porque ocultar cosas en JavaScript no es seguridad, es teatro con HTML.

6.5 Política de exposición mínima

El sistema debe mostrar solo lo estrictamente necesario.
Si el acceso para reclutadores existe, debería revelar:

CV ampliado,

experiencia más detallada,

certificados,

contacto profesional ampliado.


No debería revelar:

datos personales innecesarios,

datos familiares,

ubicaciones precisas,

elementos sensibles sin justificación.



---

7. Propuesta de comportamiento del sistema

7.1 Usuario público

ve únicamente contenido público,

no puede acceder al apartado reclutador,

no puede inferir que existe más información de la necesaria.


7.2 Usuario con token

ingresa el token en la sección “Reclutador”,

obtiene acceso temporal a contenido ampliado,

el acceso dura 24 horas o lo que definas,

al expirar, vuelve automáticamente a modo público.


7.3 Administrador

crea tokens,

define duración,

revoca accesos,

visualiza historial,

decide qué información amplía y cuál permanece restringida.



---

8. Riesgos de seguridad y mitigación

8.1 Riesgo: filtración del token

Mitigación:

guardar hashes,

usar tokens largos y aleatorios,

permitir revocación inmediata.


8.2 Riesgo: reutilización no autorizada

Mitigación:

sesión temporal con caducidad,

validación de estado en cada carga importante,

posibilidad de invalidar el token.


8.3 Riesgo: exposición por frontend

Mitigación:

no confiar solo en ocultar componentes,

aplicar RLS,

filtrar datos en la consulta según permisos.


8.4 Riesgo: ingeniería social / OSINT

Mitigación:

mantener la información privada separada,

no mostrar detalles personales innecesarios,

usar alias de correo,

evitar publicar datos de contacto extensos sin permiso temporal.



---

9. Relación con el modelo de privacidad

Esta propuesta encaja muy bien con la filosofía del proyecto:

Público: demuestra capacidad profesional.

Reclutador: permite evaluar al candidato con más contexto.

Privado: conserva control total del contenido.


Eso convierte la web en una especie de portafolio de acceso graduado. Muy útil, muy elegante y bastante más sensato que publicar todo a la intemperie como si la privacidad fuera una leyenda urbana.


---

10. Recomendación de implementación

Fase 1

Implementar la clasificación de contenido:

público,

reclutador,

privado.


Fase 2

Crear la tabla de tokens y el panel de administración para generarlos.

Fase 3

Implementar la validación del token y la sesión temporal.

Fase 4

Agregar revocación manual y expiración automática.

Fase 5

Documentar todo en SECURITY.md y DATA_CLASSIFICATION.md.


---

11. Conclusión

La propuesta de incorporar un acceso para reclutadores mediante token temporal es técnicamente sólida y coherente con el objetivo del proyecto. Permite exponer información adicional de forma controlada, reduce la exposición pública y refuerza el enfoque de privacidad por diseño.

Además, esta funcionalidad añade valor profesional al portafolio, porque no solo muestra desarrollo frontend y administración de contenido, sino también criterio de seguridad, diseño de acceso y manejo responsable de información sensible.
