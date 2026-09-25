# Instrucciones de trabajo para Menumi

Estas instrucciones aplican a todo el repositorio. El objetivo es trabajar con precisión, preservar la calidad del producto y usar únicamente el contexto, exploración, skills y validaciones necesarias para cada tarea.

## Principio de economía de contexto

Usa el mínimo contexto, exploración y herramientas necesarios para resolver correctamente la tarea.

- Empieza por el scope más pequeño capaz de explicar o resolver la solicitud.
- No inspecciones áreas relacionadas solo por precaución.
- Amplía el alcance únicamente cuando exista evidencia concreta de dependencia.
- No vuelvas a leer archivos ya inspeccionados durante la misma tarea salvo que hayan cambiado.
- No repitas análisis ya documentados.
- No ejecutes herramientas o validaciones que no puedan cambiar razonablemente la conclusión.
- No consultes documentación externa si el repositorio ya demuestra claramente el patrón o comportamiento necesario.

## Contexto del proyecto

La memoria operativa vive en `docs/agent/PROJECT_CONTEXT.md`.

Antes de una tarea:

- Para cambios pequeños y claramente localizados, consulta el contexto solo si aporta información necesaria.
- Para cambios funcionales, complejos o transversales, lee `docs/agent/PROJECT_CONTEXT.md`.
- Después, abre únicamente la documentación especializada que corresponda:
  - arquitectura React, routing, contexts y hooks → `docs/agent/ARCHITECTURE.md`
  - Supabase, Auth, RLS, Storage, RPC, Edge Functions o migraciones → `docs/agent/SUPABASE.md`
  - decisiones de producto, MVP y alcance → `docs/agent/PRODUCT_RULES.md`
  - menú público, UX e interacciones → `docs/agent/MENU_PUBLIC.md`
  - métricas, eventos y estadísticas → `docs/agent/ANALYTICS.md`
  - baseline y estrategia de validación → `docs/agent/VALIDATION_STATE.md`
- No leas todos los documentos automáticamente.
- Contrasta siempre la documentación persistente con el repositorio y, cuando corresponda, con Supabase.
- Si la documentación contradice el código o el estado remoto, el repositorio y el sistema actual son la fuente de verdad.
- Trata `.lovable/memory/**` y `.lovable/plan.md` como contexto histórico, no como especificación vinculante.

Actualiza la documentación persistente solo cuando cambie arquitectura, una fuente de verdad, una decisión de producto, estado remoto relevante, un pendiente material o la forma de retomar el trabajo.

No uses estos archivos como changelog.

## Seguridad de secretos y datos sensibles

- Nunca escribas ni agregues al código, documentación, pruebas, migraciones, logs o commits llaves privadas, API keys, tokens, contraseñas, secretos, credenciales ni datos sensibles reales.
- Usa variables de entorno para secretos y valores ficticios claramente identificados en ejemplos o pruebas.
- `.env.example` debe contener únicamente nombres de variables y placeholders seguros.
- Nunca expongas claves `service_role`, secret keys ni credenciales privilegiadas en frontend, variables públicas o artefactos accesibles al navegador.
- Si detectas un secreto existente, no lo reproduzcas ni lo muestres. Informa del riesgo y coordina revocación, rotación y eliminación segura antes de reutilizarlo.
- El repositorio contiene actualmente deuda técnica relacionada con `.env`; consulta `docs/agent/PROJECT_CONTEXT.md` antes de tocar configuración sensible.

## Idioma y comunicación

- Comunícate en español salvo que el usuario solicite otro idioma.
- Explica primero el resultado, decisión o hallazgo más importante.
- Durante tareas largas, informa avances breves y verificables.
- No presentes como terminado aquello que no se haya validado.
- Si aparece una decisión que cambie significativamente el producto, detente y consulta al usuario.

## 1. Clasificación de la tarea

Antes de modificar archivos, clasifica la solicitud:

- **Cambio pequeño, claro y aislado:** implementa directamente.
- **Cambio funcional local:** inspecciona el área inmediata, implementa y valida de forma focalizada.
- **Cambio complejo, ambiguo o transversal:** explora progresivamente y prepara un plan antes de modificar.
- **Análisis, diagnóstico o revisión:** inspecciona y reporta; no modifiques salvo que el usuario también pida corregir.
- **Base de datos, Auth, RLS, Storage, secretos o migraciones:** siempre requieren plan y validación reforzada.
- **Acción destructiva o decisión importante de producto:** solicita confirmación explícita antes de ejecutarla.

## 2. Exploración progresiva

Antes de planificar o implementar un cambio no trivial:

1. Revisa `git status --short` si trabajas en un checkout local para conservar cambios ajenos.
2. Localiza primero los archivos directamente implicados.
3. Identifica la causa o contrato que debe cambiar.
4. Amplía el scope solo si encuentras evidencia de:
   - dependencia directa;
   - estado compartido;
   - contrato o tipo compartido;
   - API compartida;
   - estructura de datos modificada;
   - comportamiento reutilizado;
   - riesgo concreto de regresión.

No inspecciones menú público, dashboard, admin, features congeladas y Supabase automáticamente.

Para errores ambiguos o intermitentes, reproduce y reúne evidencia antes de editar.

Consulta documentación oficial solo cuando:

- exista incertidumbre real sobre una API;
- el comportamiento dependa de una versión;
- aparezca un error que el repositorio no permita explicar;
- el usuario solicite verificar documentación.

## 3. Plan

El plan debe ser proporcional al riesgo e incluir solo lo necesario:

- objetivo y alcance;
- archivos, componentes o tablas afectados;
- pasos de implementación;
- decisiones o supuestos relevantes;
- riesgos y medidas de protección;
- migración o rollback si aplica;
- validación prevista.

Si el objetivo está claro, presenta el plan y continúa con la implementación.

Si el usuario dice **“primero plan”**, **“muéstrame el plan”** o **“no implementes todavía”**, entrega únicamente el plan y espera aprobación.

## 4. Ejecución

- Implementa por bloques coherentes y en la capa responsable más estrecha.
- Evita tocar código no relacionado.
- Reutiliza componentes, utilidades y patrones existentes antes de crear nuevas abstracciones.
- No ocultes errores con fallbacks silenciosos.
- Conserva observabilidad útil.
- Corrige automáticamente errores encontrados cuando estén dentro del alcance aprobado.
- Si una causa nueva amplía materialmente el alcance, explica la evidencia antes de continuar.
- No conviertas código existente de mesas, meseros o pedidos en prioridad del MVP salvo instrucción explícita.

## 5. Uso de skills y herramientas especializadas

Las skills son herramientas bajo demanda, no pasos obligatorios.

Usa una skill cuando aporte conocimiento, diagnóstico o un proceso que la tarea realmente necesite.

No invoques skills para:

- cambios mecánicos;
- implementación de una especificación ya definida;
- tareas cuyo patrón sea evidente en el repositorio;
- repetir un análisis ya documentado.

No combines skills con objetivos superpuestos salvo que exista una razón concreta.

Cuando una skill produzca una decisión, análisis o especificación reutilizable:

- persiste el resultado si tendrá valor posterior;
- usa esa especificación para las siguientes iteraciones;
- no vuelvas a ejecutar la skill salvo que el alcance o evidencia haya cambiado.

Antes de ampliar significativamente el análisis, pregunta internamente:

**“¿Qué evidencia espero obtener y puede cambiar la implementación?”**

Si no existe una respuesta concreta, no amplíes el scope.

## 6. Reglas especiales para Supabase

Si la tarea toca Supabase, lee `docs/agent/SUPABASE.md`.

Reglas base:

- Trata cambios de esquema, funciones, triggers, Auth, Storage y RLS como cambios de alto riesgo.
- Usa migraciones versionadas para cambios persistentes.
- No reabras acceso directo a tablas protegidas para resolver rápidamente un error de frontend.
- Prefiere autorización explícita y el patrón ya existente antes de ampliar permisos.
- Valida los caminos de usuario anónimo, owner, usuario ajeno y admin cuando correspondan.
- Comprueba localmente la migración antes de aplicarla remotamente cuando el entorno lo permita.
- Ejecuta `supabase db push --dry-run` antes de un push real de migraciones cuando Supabase CLI esté disponible.
- Nunca asumas que una migración aplicada manualmente coincide con el historial remoto: verifícalo.
- No edites manualmente `src/integrations/supabase/types.ts` como solución permanente; es un archivo generado.
- No uses `service_role` desde el navegador.

## 7. Validación proporcional

Consulta `docs/agent/VALIDATION_STATE.md` cuando el cambio necesite validación funcional, transversal o crítica.

### Nivel A — cambio trivial

Ejemplos: copy, estilos aislados, iconos, assets o configuración local.

Validar:

- diff;
- lint o TypeScript focalizado si aplica.

### Nivel B — cambio funcional local

Ejemplos: componente, hook, utilitario o lógica aislada.

Validar:

- TypeScript;
- lint focalizado;
- pruebas directamente relacionadas.

### Nivel C — cambio transversal

Ejemplos: feature completa, routing, estado compartido, contratos públicos o múltiples consumidores.

Validar:

- TypeScript;
- lint relevante;
- pruebas relacionadas;
- build cuando pueda detectar integración rota.

### Nivel D — cambio crítico

Ejemplos: Supabase, Auth, RLS, Storage, publicación o migraciones.

Validar según corresponda:

- TypeScript;
- lint;
- tests unitarios o integración;
- migraciones;
- permisos;
- escenarios exitosos y fallidos;
- build.

No escales automáticamente al siguiente nivel si las validaciones actuales ya cubren razonablemente el riesgo.

## 8. Playwright

Usa Playwright cuando esté disponible y el cambio afecte:

- interacción;
- navegación;
- responsive layout no trivial;
- loaders o animaciones;
- comportamiento condicionado por estado;
- integración frontend/backend;
- regresiones visuales importantes.

No uses Playwright automáticamente para:

- copy;
- cambios cosméticos pequeños;
- clases Tailwind aisladas;
- iconos;
- spacing;
- configuración verificable estáticamente.

Cuando se use Playwright:

- prueba escenarios exitosos y fallidos relevantes;
- inspecciona consola y solicitudes de red cuando el flujo dependa de ellas;
- guarda screenshots descriptivos en `artifacts/playwright/` cuando aporten valor;
- activa animaciones mediante navegación o scroll antes de capturas de página completa;
- no declares éxito si la página carga pero el contenido funcional está vacío.

## 9. Entrega

La entrega final debe indicar, cuando aplique:

- resultado conseguido;
- archivos o componentes modificados;
- migraciones aplicadas;
- validaciones ejecutadas y resultados;
- screenshots o artefactos generados;
- problemas pendientes o limitaciones reales;
- siguiente paso recomendado.

No enumeres apartados irrelevantes para cambios pequeños.

## Comportamiento según la instrucción

| Instrucción del usuario | Comportamiento esperado |
| --- | --- |
| “Analiza…” o “diagnostica…” | Inspeccionar y reportar sin modificar. |
| “Planifica…” | Preparar solamente el plan y esperar aprobación. |
| “Implementa…” | Planificar solo si el riesgo o complejidad lo justifican y después ejecutar. |
| Cambio pequeño y claro | Ejecutar directamente y validar. |
| Base de datos, Auth, RLS, Storage o secretos | Planificar y aplicar validación reforzada. |
| Acción destructiva o decisión importante de producto | Solicitar confirmación. |

## Git y archivos del usuario

- Conserva cambios no relacionados y archivos creados por el usuario.
- No agregues, descartes, reescribas ni incluyas archivos ajenos al alcance.
- Antes de preparar commits, separa cambios por intención funcional.
- Usa staging parcial cuando un archivo contenga cambios de más de un bloque lógico.
- No hagas commit ni push salvo que el usuario lo solicite explícitamente o la herramienta de trabajo ya opere sobre una rama/PR solicitada.
- Reporta archivos nuevos no rastreados cuando sean relevantes al trabajo realizado.

## Contexto funcional mínimo

Menumi es una plataforma multi-tenant de menús digitales para restaurantes con experiencia pública mobile-first, administración de categorías y platillos, interacciones sociales y analítica básica.

El MVP actual se concentra en el menú público y su administración. Mesas, meseros, sesiones y pedidos por mesa existen en el repositorio, pero están fuera del MVP activo y se consideran funcionalidades congeladas salvo instrucción explícita.

Para reglas funcionales, arquitectura, Supabase, menú público, analytics o validación, consulta el documento especializado correspondiente.

## Escalamiento de herramientas y acciones externas

Prioriza siempre el camino más directo, reproducible y de menor costo operativo.

Orden preferido cuando aplique:

1. inspección del repositorio;
2. comandos locales / CLI;
3. tests o scripts existentes;
4. documentación oficial si existe incertidumbre real;
5. herramientas externas, navegador o interfaces gráficas únicamente cuando sean necesarias y estén autorizadas.

### Regla de bloqueo

Si el método esperado falla por alguno de estos motivos:

- falta de autenticación;
- credenciales ausentes;
- permisos insuficientes;
- token requerido;
- proyecto remoto no enlazado;
- Docker/servicio local no disponible;
- CLI que requiere login interactivo;
- acceso a consola web requerido;

NO cambies automáticamente a:

- navegador;
- dashboard web;
- consola administrativa;
- login mediante interfaz gráfica;
- herramienta externa alternativa;
- MCP/conector alternativo;
- instalación de software adicional;
- otro mecanismo con acceso remoto.

En su lugar:

1. detente en ese subpaso;
2. informa brevemente qué comando falló y por qué;
3. indica si el bloqueo impide realmente continuar;
4. proporciona los comandos exactos que el usuario puede ejecutar manualmente;
5. si existe una alternativa mediante navegador o herramienta externa, solicita autorización explícita antes de utilizarla.

Ejemplo:

> `supabase db push --dry-run` no pudo ejecutarse porque falta autenticación.
> No abriré el dashboard de Supabase automáticamente.
> Puedes ejecutar:
>
> `supabase login`
> `supabase link --project-ref <ref>`
> `supabase migration list --linked`
> `supabase db push --dry-run`
>
> Si quieres que intente la verificación mediante navegador, confírmalo explícitamente.

### Navegador

No abras automáticamente un navegador para resolver fallos de CLI o autenticación.

Usa navegador solamente cuando:

- el usuario lo solicite explícitamente;
- el usuario apruebe su uso después de que expliques por qué es necesario;
- la tarea sea explícitamente visual y no pueda validarse razonablemente con código, tests o CLI.

Que una operación pueda realizarse mediante navegador no es razón suficiente para abrirlo.

### Reintentos

No repitas varias veces comandos que fallan por una causa determinista.

Ejemplos:

- missing token;
- unauthorized;
- permission denied;
- authentication required;
- Docker unavailable.

Un segundo intento solo se justifica si cambió alguna condición que pueda resolver el fallo.

### Acciones remotas

No realices automáticamente acciones remotas que el usuario haya indicado que ejecutará manualmente.

Si el usuario establece, por ejemplo:

> "yo aplicaré las migraciones"

entonces tu responsabilidad termina en:

- preparar la migración;
- inspeccionarla;
- validarla localmente cuando sea posible;
- proporcionar el dry-run/push esperado;
- indicar claramente qué queda pendiente.

No intentes aplicar la migración, iniciar sesión, abrir el dashboard ni buscar otro mecanismo para ejecutarla.

### Supabase CLI y acceso remoto

- Usa Supabase CLI como vía preferida para inspección de historial, dry-runs y migraciones.
- Si Supabase CLI falla por autenticación, token, permisos o ausencia de Docker, detente y reporta el bloqueo.
- No abras Supabase Dashboard automáticamente como fallback.
- No ejecutes `supabase login` mediante navegador sin autorización explícita.
- Si el usuario indicó que aplicará migraciones manualmente, no intentes aplicarlas ni validarlas mediante Dashboard; entrega los comandos exactos y marca la validación remota como pendiente.
- Nunca sustituyas un fallo de CLI por una mutación manual en SQL Editor salvo solicitud explícita del usuario.

## Preferencia del proyecto: operaciones remotas

Para este proyecto, el responsable aplica manualmente las migraciones Supabase cuando así lo indique en la tarea o conversación.

Cuando una migración requiera aplicación remota:

- prepara el archivo;
- valida su contenido;
- ejecuta validaciones locales disponibles;
- entrega los comandos CLI necesarios;
- marca la aplicación remota como pendiente;
- continúa únicamente con trabajo que no dependa de confirmar el estado remoto.

No abras interfaces web para completar ese paso sin permiso explícito.

## Disciplina de herramientas

No uses una herramienta más costosa o amplia si una comprobación local y focalizada responde la misma pregunta.

Evita:

- navegación web exploratoria sin una pregunta concreta;
- abrir dashboards para comprobar información disponible por CLI;
- repetir inspecciones ya realizadas;
- lanzar subagentes para cambios estrechamente acoplados o pequeños;
- ampliar la investigación después de obtener evidencia suficiente para decidir.

Antes de escalar de herramienta, pregunta:
"¿Esta acción puede cambiar la implementación o desbloquear una validación necesaria?"

Si no, no la ejecutes.
