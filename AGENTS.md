# AGENTS.md

## Propósito

Este archivo define cómo debe trabajar Codex dentro de `culinary-feed`.

El objetivo no es maximizar la cantidad de cambios ni completar automáticamente todo lo que exista en el repositorio. El objetivo es modificar el producto de forma incremental, segura y alineada con el alcance actual.

Antes de editar código, Codex debe entender qué parte del producto está activa, qué código pertenece a etapas futuras y qué invariantes de seguridad y multi-tenancy no se pueden romper.

---

## 1. Fuente de verdad

Usa esta prioridad cuando distintas partes del repositorio se contradigan:

1. La instrucción explícita de la tarea actual.
2. Este `AGENTS.md`.
3. El código y esquema actualmente ejecutables.
4. Las migraciones de Supabase.
5. La documentación específica del feature que esté siendo modificado.
6. `.lovable/memory/**` y `.lovable/plan.md` únicamente como contexto histórico.

La memoria de Lovable NO es una especificación vinculante.

Ya existen contradicciones entre esa memoria y el código actual. Por ejemplo, documentación antigua describe algunos comportamientos como locales o temporales mientras el código actual ya persiste datos o usa RPCs.

Cuando exista una contradicción:

- no asumir cuál versión es correcta;
- revisar el código, esquema y tarea actual;
- preservar el comportamiento productivo salvo que la tarea indique cambiarlo;
- señalar la discrepancia en el resumen final si afecta la implementación.

---

## 2. Alcance actual del producto

### Núcleo activo del MVP

Trata estas áreas como producto activo y prioritario:

- menú público del restaurante;
- perfil e identidad visual del restaurante;
- categorías;
- platillos;
- búsqueda y navegación del menú;
- carrito local;
- recomendaciones del Asistente del Chef;
- reseñas y calificaciones;
- likes;
- estadísticas de interacción;
- administración del restaurante;
- administración de categorías y platillos;
- autenticación de owner/admin;
- QR del menú público;
- multi-tenancy por restaurante.

Las rutas principales del producto activo son:

- `/`
- `/r/:slug`
- `/login`
- `/dashboard`
- `/dashboard/categorias`
- `/dashboard/platillos`
- `/dashboard/estadisticas`
- `/admin`
- `/admin/users`

### Código existente fuera del MVP actual

El repositorio contiene funcionalidad ya implementada para:

- mesas;
- sesiones de mesa;
- meseros;
- pedidos por mesa;
- flujo `/m/:code`;
- flujo `/mesero`;
- estados de pedidos y Edge Functions asociadas.

Este código debe considerarse **feature futura/congelada**, no trabajo pendiente del MVP.

Reglas:

- no expandir estas funcionalidades;
- no agregar nuevas dependencias alrededor de ellas;
- no completar etapas descritas en `.lovable/plan.md`;
- no usar su existencia como justificación para introducir nuevas pantallas o arquitectura;
- preservarlas si un cambio transversal las toca;
- modificarlas solo cuando la tarea lo solicite explícitamente o cuando sea estrictamente necesario para evitar una regresión.

### Funcionalidad secundaria ya existente

El carrito compartido ya existe en el código. Preservar su comportamiento si se toca `CartContext`, pero no ampliarlo automáticamente ni convertirlo en eje del producto salvo instrucción explícita.

---

## 3. Stack y arquitectura actual

Mantener el stack existente:

- React 18;
- TypeScript;
- Vite;
- React Router;
- Tailwind CSS;
- shadcn/ui + Radix primitives;
- Supabase;
- TanStack Query;
- React Hook Form cuando aplique;
- Zod donde ya esté integrado;
- Vitest + Testing Library.

No migrar frameworks, router, sistema de estilos, backend o base de datos sin una decisión explícita.

No introducir una segunda arquitectura paralela.

No reescribir el proyecto para “modernizarlo” si la tarea puede resolverse dentro de los patrones actuales.

---

## 4. Estructura relevante

### Frontend

- `src/App.tsx`: routing principal y providers globales.
- `src/pages/`: páginas.
- `src/pages/dashboard/`: administración del owner.
- `src/pages/admin/`: administración global.
- `src/components/`: componentes de producto.
- `src/components/ui/`: primitives shadcn. Evitar modificaciones innecesarias.
- `src/contexts/`: estado global de auth, carrito y likes.
- `src/hooks/`: lógica reutilizable y acceso a datos.
- `src/lib/`: utilidades de dominio, analytics y templates.
- `src/integrations/supabase/`: cliente y tipos generados.
- `src/data/restaurant.ts`: shape de datos consumido por la UI pública.

### Backend

- `supabase/migrations/`: historial y contrato del esquema.
- `supabase/functions/`: Edge Functions.
- RLS es parte de la arquitectura, no una capa opcional.

---

## 5. Modelo mental del dominio

El tenant principal es `restaurant`.

La mayoría de los datos funcionales deben quedar asociados a un `restaurant_id`.

Entidades principales del MVP:

- `restaurants`
- `categories`
- `dishes`
- `reviews`
- `dish_events`
- `profiles`
- `user_roles`

Entidades secundarias/futuras ya presentes:

- shared carts;
- tables;
- table sessions;
- diners;
- waiters;
- orders;
- order items.

Nunca mezclar datos de restaurantes distintos.

Nunca confiar únicamente en filtros del frontend para aislamiento de tenant.

---

## 6. Autorización y multi-tenancy

Los roles principales en Supabase son:

- `admin`
- `owner`
- `customer`

El owner administra únicamente su restaurante.

Un admin puede administrar restaurantes globalmente y puede cargar un restaurante concreto mediante el mecanismo existente de override usado por `useManagedRestaurant`.

Reglas obligatorias:

- toda lectura/escritura sensible debe respetar RLS;
- toda consulta de owner debe estar limitada al restaurante administrado;
- una UI oculta NO equivale a autorización;
- no introducir operaciones con service role desde el cliente;
- no desactivar RLS para resolver un problema;
- no crear políticas amplias tipo `USING (true)` para tablas privadas;
- cualquier cambio de esquema debe revisar impacto sobre RLS, Storage y Edge Functions;
- preservar la separación entre auth users normales y cuentas internas de mesero mientras esas features existan.

Para cambios multi-tenant, revisar tanto la consulta frontend como la política RLS correspondiente.

---

## 7. Menú público e identidad visual

La experiencia pública tiene una identidad deliberada inspirada en patrones visuales de Instagram:

- perfil del restaurante en la parte superior;
- categorías tipo stories;
- grid visual de platillos;
- feed vertical de detalle;
- interacción rápida y visual;
- menú mobile-first.

No convertir el menú público en un dashboard SaaS genérico.

Preservar:

- fuerte protagonismo de imágenes;
- navegación táctil simple;
- jerarquía visual clara;
- categorías horizontales;
- grid compacto;
- detalle tipo feed;
- acciones de carrito accesibles;
- labels descriptivos para navegación;
- responsive mobile-first.

Las plantillas por cocina modifican CSS variables y tipografía. Los templates existentes son:

- `generic`
- `mexican`
- `italian`
- `chinese`
- `japanese`

Si se modifica una pantalla pública, validar que el cambio no dependa de una sola plantilla.

No hardcodear colores que rompan las CSS variables del template si puede usarse el sistema de tokens existente.

---

## 8. Categorías y platillos

Las categorías y platillos pertenecen siempre a un restaurante.

### Categorías

Preservar:

- orden por `position`;
- relación con `restaurant_id`;
- categoría virtual `populares`, que NO es una fila real en la base de datos.

No crear una categoría DB llamada `populares` para resolver lógica de UI.

### Platillos

Preservar:

- `restaurant_id`;
- `category_id`;
- `position`;
- `is_active`;
- `is_featured`;
- `show_rating`;
- `tags`;
- precio;
- imagen;
- rating;
- likes.

Los platillos inactivos no deben aparecer en el menú público.

Si se cambian imágenes o Storage:

- mantener separación por restaurante;
- validar MIME/type y tamaño cuando aplique;
- no reutilizar rutas de otro tenant;
- no confiar en el nombre original del archivo como identificador seguro.

---

## 9. Likes, reseñas y ratings

No asumir que la documentación histórica de Lovable representa el comportamiento actual.

El código actual:

- conserva localmente qué platillos dio like el dispositivo;
- actualiza contadores mediante RPCs;
- usa reseñas persistentes;
- recalcula ratings desde la base de datos.

Por lo tanto:

- no reemplazar silenciosamente este comportamiento por likes puramente locales;
- no incrementar contadores solo en UI;
- evitar doble conteo;
- manejar errores de RPC si el feature se modifica;
- mantener rating entre 1 y 5;
- respetar `show_rating` tanto para restaurante como para platillo;
- no permitir reseñas sobre restaurantes no publicados.

---

## 10. Analytics y estadísticas

Los eventos actuales son:

- `view`
- `cart_add`
- `category_view`

La UI de estadísticas consume `dish_events` por restaurante y rango temporal.

Reglas:

- filtrar siempre por `restaurant_id`;
- no mezclar métricas de tenants;
- no bloquear UX pública si analytics falla;
- analytics debe ser best-effort desde la UI;
- no presentar eventos como ventas reales;
- no convertir `cart_add` en “pedido” o “venta”;
- definir claramente cualquier métrica nueva antes de implementarla.

### Riesgo conocido

La política actual permite inserts públicos muy amplios en `dish_events`.

Eso significa que las estadísticas pueden ser contaminadas por eventos falsificados.

Si una tarea toca analytics o estadísticas:

1. revisar integridad del evento;
2. validar que `restaurant_id`, `dish_id` y `category_id` sean coherentes;
3. considerar rate limiting, RPC o Edge Function si se necesita mayor confiabilidad;
4. no asumir que los datos actuales son antifraude.

No expandir el sistema de analytics sin considerar este riesgo.

---

## 11. Estado y acceso a datos

Prefiere los patrones ya existentes antes de introducir nuevas capas.

Actualmente el proyecto usa:

- Context para estado global de interacción;
- hooks para lógica reutilizable;
- acceso directo al cliente Supabase en varias páginas;
- TanStack Query disponible, pero no usado como única capa obligatoria.

No migrar todo el acceso a datos a React Query como efecto secundario de una tarea pequeña.

No crear un repository/service layer global solo por preferencia arquitectónica.

Sí extraer lógica cuando:

- se duplica;
- es difícil de probar;
- mezcla demasiadas responsabilidades;
- varios componentes ya necesitan exactamente la misma operación.

---

## 12. Reglas para componentes React

Preferir:

- componentes funcionales;
- TypeScript explícito;
- props pequeñas y orientadas a dominio;
- hooks para efectos reutilizables;
- derivar estado cuando sea posible en vez de duplicarlo;
- cleanup de subscriptions, timers y listeners;
- evitar efectos con dependencias incorrectas;
- estados claros de loading/error/empty.

No:

- mutar estado directamente;
- esconder errores relevantes con `catch {}`;
- agregar estados globales para problemas locales;
- duplicar componentes shadcn existentes;
- meter lógica de tenant o seguridad únicamente en componentes visuales.

Cuando una operación async modifica datos:

- mostrar feedback útil;
- prevenir doble submit cuando corresponda;
- revisar errores;
- mantener la UI consistente si falla.

---

## 13. Supabase y cambios de base de datos

Las migraciones son el historial autoritativo del esquema.

No editar una migración ya aplicada para cambiar comportamiento productivo.

Para cambios de esquema:

1. crear una nueva migración;
2. definir constraints e índices necesarios;
3. revisar RLS;
4. revisar funciones/triggers;
5. revisar Storage si aplica;
6. revisar Edge Functions;
7. actualizar/regenerar tipos.

`src/integrations/supabase/types.ts` es generado.

No modificarlo manualmente como solución permanente.

Si no se dispone del CLI necesario para regenerarlo, dejarlo explícitamente indicado como pendiente en vez de inventar tipos manuales inconsistentes.

No incluir service-role keys en frontend.

---

## 14. Archivos generados o sensibles

Tratar con especial cuidado:

- `src/integrations/supabase/types.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/previewAuthStorage.ts`
- lockfiles;
- archivos `.env*`.

El repositorio actualmente contiene un `.env` versionado y `.gitignore` no ignora `.env`.

Esto es deuda técnica de seguridad.

Reglas para Codex:

- nunca imprimir valores secretos;
- nunca copiar secretos a documentación, tests o logs;
- no agregar nuevas credenciales al repositorio;
- usar variables de entorno;
- para nuevas variables, documentar nombres sin exponer valores;
- si una tarea toca configuración sensible, recomendar `.env.example` y exclusión apropiada de secretos.

No eliminar o rotar credenciales existentes como efecto secundario de otra tarea; reportar el riesgo y hacerlo solo dentro de una tarea de seguridad/configuración explícita.

---

## 15. Dependencias y package manager

El repositorio contiene:

- `package-lock.json`
- `bun.lock`
- `bun.lockb`

Evitar churn de lockfiles.

Reglas:

- no agregar dependencias si la plataforma o Web APIs existentes resuelven el problema razonablemente;
- si no cambia ninguna dependencia, no tocar ningún lockfile;
- si se agrega o actualiza una dependencia, explicar por qué;
- usar npm como default para comandos de validación salvo que la tarea o entorno indiquen explícitamente Bun;
- no regenerar todos los lockfiles “por consistencia”.

---

## 16. Testing y validación

La cobertura automática actual es limitada; no asumir que la existencia de Vitest significa que todos los flujos están cubiertos.

Validación mínima proporcional al cambio:

### Cambio de UI

- `npm run lint`
- `npm run build`
- revisar estados loading/empty/error;
- revisar mobile y desktop;
- revisar al menos una plantilla distinta de `generic` si afecta menú público.

### Cambio de lógica

- agregar o actualizar tests cuando la lógica tenga reglas verificables;
- `npm test`;
- `npm run lint`;
- `npm run build`.

### Cambio de Supabase

Además:

- validar migración;
- revisar RLS;
- revisar aislamiento de tenant;
- revisar constraints;
- revisar tipos generados;
- probar caso autorizado y no autorizado cuando sea viable.

### Cambio de auth

Además probar conceptualmente o manualmente:

- usuario sin sesión;
- owner;
- admin;
- acceso a restaurante ajeno;
- logout/refresh.

No declarar una tarea “terminada” si solo compila pero el flujo funcional queda roto.

---

## 17. Protocolo de trabajo de Codex

Antes de modificar:

1. leer este archivo;
2. identificar la ruta/feature afectada;
3. inspeccionar solo los archivos relevantes;
4. revisar esquema/RLS si hay acceso a datos;
5. detectar si la tarea cae dentro del MVP activo o toca código futuro;
6. formular un plan proporcional al riesgo.

Durante la implementación:

1. realizar el cambio mínimo coherente;
2. reutilizar patrones existentes;
3. evitar refactors no relacionados;
4. no cambiar contratos públicos sin necesidad;
5. no “limpiar” archivos que no forman parte del objetivo;
6. conservar cambios de otros autores;
7. no ocultar errores para hacer pasar el build.

Después:

1. revisar el diff completo;
2. ejecutar validación relevante;
3. confirmar que no hubo cambios cross-tenant;
4. confirmar que no se expandió scope fuera del MVP;
5. resumir archivos modificados;
6. indicar pruebas ejecutadas;
7. indicar riesgos, deuda o validaciones pendientes.

No hacer commit, push, merge o cambios destructivos salvo que la tarea lo solicite explícitamente.

---

## 18. Criterio de alcance

Antes de construir algo no pedido, preguntar mentalmente:

> ¿Esto es necesario para completar correctamente la tarea actual?

Si la respuesta es no, no construirlo.

Ejemplos de cambios que NO deben aparecer incidentalmente:

- nueva vista de cocina;
- pagos;
- split bill;
- reservas;
- notificaciones push;
- nuevas features de meseros;
- expansión de mesas;
- nuevos estados de pedidos;
- una API propia paralela a Supabase;
- migración completa a React Query;
- nuevo design system;
- reescritura de auth;
- nuevas “mejoras IA” no solicitadas.

---

## 19. Decisiones destructivas o de alto riesgo

Requieren especial cautela:

- eliminar tablas o columnas;
- cambiar RLS;
- cambiar roles;
- modificar Auth;
- tocar service role;
- modificar Storage policies;
- cambiar slugs públicos;
- borrar restaurantes/categorías/platillos;
- alterar ratings históricos;
- alterar contratos de Edge Functions;
- migraciones con pérdida de datos;
- cambios que afecten todos los tenants.

En estos casos:

- inspeccionar dependencias antes de cambiar;
- preferir migraciones backward-compatible cuando sea posible;
- documentar impacto;
- no ejecutar destrucción adicional no solicitada.

---

## 20. Definition of Done

Una tarea está terminada cuando:

- cumple exactamente el comportamiento solicitado;
- mantiene aislamiento multi-tenant;
- no expande features fuera del MVP sin solicitud;
- conserva la identidad visual del menú;
- maneja loading/error/empty cuando corresponde;
- mantiene TypeScript y lint razonablemente limpios;
- pasa build;
- pasa tests relevantes;
- los cambios de DB incluyen RLS/constraints apropiados;
- no introduce secretos;
- no genera refactors ajenos al objetivo;
- el resumen final indica qué cambió, cómo se validó y qué riesgo queda pendiente.

El objetivo es que cada cambio deje el producto más confiable, no simplemente con más código.
