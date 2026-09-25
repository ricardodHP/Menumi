# Analytics y estadísticas — Menumi

## Propósito

Este documento define qué significan las métricas actuales, cómo se calculan y qué limitaciones tienen.

No asumas que una métrica visible en dashboard representa ventas, usuarios únicos o conversiones reales.

## Fuente de datos

Tabla principal:

`public.dish_events`

Eventos canónicos de captura:

- `menu_view`;
- `dish_view`;
- `selection_add`;
- `category_view`;
- `whatsapp_clicked`.

`view` y `cart_add` permanecen en el enum y en filas históricas. Statistics los agrega junto con `dish_view` y `selection_add`, respectivamente: el código anterior emitía `view` al abrir intencionalmente un platillo y `cart_add` al usar la acción explícita para agregarlo. Cambiar cantidades dentro del carrito no emitía `cart_add`. No se reescriben filas históricas.

El tracking se realiza desde frontend mediante:

`src/lib/analytics.ts`

La función `trackEvent` es best-effort y no debe bloquear la UX principal. Todo evento nuevo lleva el mismo UUID anónimo del tab en `session_id`; `created_at` lo asigna PostgreSQL.

El UUID vive en `sessionStorage`: se comparte en SPA navigation y refresh del tab, un tab nuevo puede tener otro, y cambiar de restaurante no lo reemplaza. No se usan cookies, fingerprinting ni login de cliente.

## Exclusión de preview

El menú abierto con `/r/:slug?preview=1` es una vista de inspección para el owner/admin y no registra `menu_view`, `dish_view`, `selection_add`, `category_view` ni `whatsapp_clicked`. La utilidad central también rechaza tracking marcado como preview. La interacción visual y el carrito pueden seguir funcionando, pero no deben inflar las métricas del menú publicado.

El menú publicado sin `preview=1` emite únicamente los eventos definidos abajo.

## Semántica actual de eventos

| Evento | Significado |
|---|---|
| `menu_view` | Una sesión anónima abrió el menú del restaurante. |
| `dish_view` | El cliente abrió intencionalmente el detalle de un platillo. |
| `selection_add` | El cliente agregó intencionalmente un platillo a “Mi pedido”. |
| `whatsapp_clicked` | El cliente activó intencionalmente el CTA de WhatsApp. |

`category_view` también se conserva para la activación de una categoría persistente. Ningún evento representa ventas, pedidos completados, pedidos confirmados ni pagos.

### menu_view

Se registra al cargar un menú publicado en `/r/:slug`. Se deduplica por restaurante con un marcador en `sessionStorage`, por lo que refresh, navegación SPA y remounts no generan otro evento durante el mismo tab. Otro restaurante puede generar su propio `menu_view` con el mismo `session_id`.

No equivale a una vista de platillo.

### dish_view

Se registra cuando se abre intencionalmente un platillo en el flujo de `DishFeed`, no por renderizar su tarjeta. Dentro de una instancia del feed se evita repetir el mismo platillo por rerenders. Una nueva apertura puede generar otro evento.

No equivale a:

- impresión garantizada;
- visitante único;
- sesión única;
- lectura completa;
- compra.

### selection_add

Se registra al usar la acción de agregar desde el feed para añadir el platillo a “Mi pedido”. Los botones de cantidad dentro de “Mi pedido” solo administran la selección y no generan este evento.

No equivale a:

- pedido enviado;
- venta;
- checkout;
- pago;
- ingreso.

### category_view

Se registra cuando el usuario activa una categoría persistente desde el menú.

La pseudo-categoría `populares` no se trackea como categoría DB en el flujo actual.

### whatsapp_clicked

Se registra únicamente cuando el cliente activa `Pedir por WhatsApp` desde una selección no vacía y con destino configurado. Incluye `restaurant_id` y el UUID anónimo compartido en `session_id`.

No confirma que WhatsApp se haya abierto, que el mensaje se haya enviado, que el restaurante lo haya recibido, ni que haya ocurrido una venta. No se presenta como conversión o pedido completado.

## Dashboard actual

Página:

`src/pages/dashboard/DashboardStats.tsx`

Rangos disponibles:

- Hoy;
- Últimos 7 días;
- Últimos 30 días.

Los tres rangos usan límites de calendario en la zona horaria local del navegador del owner/admin. “Hoy” empieza a medianoche local; 7 y 30 días incluyen hoy y comienzan a medianoche local seis o 29 días antes. El límite superior es el momento de la consulta. Se convierten a ISO antes de consultar `created_at` (timestamptz), por lo que el cambio horario estacional conserva los límites del calendario local.

Todas las métricas y rankings de actividad usan estos mismos límites.

## Lectura de eventos

El dashboard consulta `dish_events` directamente con el filtro `restaurant_id` y el límite temporal, y pagina en bloques de 1,000 filas hasta completar el rango. Así elimina el límite anterior de 5,000 filas. La agregación permanece en el cliente para la escala piloto; si el volumen crece, conviene mover los agregados a SQL/RPC conservando RLS y aislamiento por tenant. El índice existente `(restaurant_id, created_at DESC)` cubre el filtro principal.

## Métricas por período vs métricas all-time

Las métricas del dashboard se agregan de eventos dentro del rango seleccionado. Likes y ratings no tienen una fuente histórica fechada disponible en esta vista y se omitieron en lugar de presentarlos como actividad del período.

### Métricas del rango seleccionado

Derivadas de `dish_events`:

- visitas al menú;
- vistas intencionales de platillos;
- agregados intencionales a “Mi pedido”;
- tasa de agregado por sesiones;
- clicks intencionales en WhatsApp, cuando está habilitado;
- vistas de categorías y rankings asociados a esos eventos.

`Visitas al menú` cuenta `COUNT(DISTINCT session_id)` para `menu_view`. `Tasa de agregado` es sesiones distintas con `selection_add` / sesiones distintas con `menu_view`; con denominador cero muestra 0%. Los eventos con `session_id` nulo no cuentan como sesión, aunque las vistas/agregados crudos sí se incluyen en sus totales.

Las estadísticas de platillos conservan por separado los conteos crudos, sesiones únicas que vieron, sesiones únicas que agregaron (`addingSessions`) y sesiones únicas que hicieron ambas acciones (`viewingSessionsWithAdd`). La tasa por platillo es la tasa de embudo `viewingSessionsWithAdd / viewingSessions`: requiere que el mismo `session_id` tenga vista y agregado del mismo platillo dentro del período seleccionado, por lo que nunca supera 100%. Si no hay sesiones únicas de vista, la tasa no se muestra. Un agregado sin vista del platillo sigue sumando al conteo crudo y a `addingSessions`/ranking, pero no entra al numerador de la tasa. Los eventos `view` y `cart_add` históricos participan en la misma intersección que `dish_view` y `selection_add`.

`menu_view` solo existe desde el tracking canónico de TASK005; no se reconstruyen visitas históricas. La pantalla muestra esta limitación junto a los datos. La lectura de eventos canónicos depende de que la migración TASK005 esté aplicada en el entorno remoto.

## Rankings Top 5

El dashboard muestra Top 5 para “Platillos más vistos”, “Más agregados a Mi pedido” y “Categorías más vistas”; no presenta Bottom 5. Los rankings de platillos se unen al catálogo actual de platillos activos del tenant. Así no se presentan en rankings accionables platillos ocultos, borrados o huérfanos, aunque sus eventos válidos aún contribuyen a los KPIs de interacción histórica del período. Categorías conserva su catálogo y ranking actuales.

Estos rankings ordenan actividad registrada dentro del período y no comparan ventas.

## Oportunidades por platillo

`Oportunidades` compara únicamente platillos del catálogo activo actual, con por lo menos `MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT = 10` sesiones únicas de vista en el período seleccionado. Se requieren al menos dos platillos elegibles para comparar.

La referencia es la mediana de la tasa por platillo de los elegibles. Una señal se presenta solo cuando la distancia a esa mediana es de al menos el mayor entre 10 puntos porcentuales y 25% de la mediana:

- debajo de la referencia: “Muchas vistas, pocos agregados”;
- encima de la referencia: “Alta tasa de agregado”.

Las señales se ordenan por magnitud de diferencia y por ID como desempate determinista, con un máximo de tres. Si la muestra es menor o no hay diferencias claras, el dashboard comunica ese estado sin crear una recomendación. Las oportunidades solo usan eventos dentro del tenant y período actuales, incluyen compatibilidad histórica `view`/`cart_add`, describen interacciones y no atribuyen causas.

## Atribución de origen

Los eventos actuales no capturan de manera consistente si la visita llegó desde QR, Instagram, WhatsApp, enlace compartido o acceso directo. El dashboard no muestra atribución; requiere una decisión futura de URL y captura de origen end-to-end.

## Integridad del tracking

RLS permite inserts anónimos solo para un restaurante publicado y para las formas permitidas de `menu_view`, `dish_view`, `selection_add`, `category_view` y `whatsapp_clicked`. Rechaza nuevos inserts `view`/`cart_add`; las filas históricas siguen intactas. También valida pertenencia de platillos y categorías al restaurante, platillos activos y categorías visibles. Los eventos no son antifraude; un cliente puede fabricar IDs de sesión y eventos válidos.

`dish_events.session_id` es nullable para mantener compatibilidad con eventos históricos y eventos existentes que no se asocian a sesión.

Esto facilita tracking anónimo, pero permite manipulación.

Riesgos:

- eventos fabricados;
- spam;
- IDs inconsistentes;
- volumen artificial;
- métricas no antifraude.

Antes de usar analytics para decisiones comerciales fuertes, considerar:

- RPC o Edge Function;
- validación de pertenencia dish/category → restaurant;
- session/device identifier anónimo;
- deduplicación;
- rate limiting;
- agregación server-side.

No introducir fingerprinting invasivo sin una decisión explícita de privacidad.

## Consistencia de IDs

Un evento idealmente debe cumplir:

- `dish_id` pertenece a `restaurant_id`;
- `category_id` pertenece a `restaurant_id`;
- si aplica, el dish pertenece a la category indicada.

La política de insert valida esta coherencia para los eventos nuevos.

Si una tarea toca integridad de analytics, reforzar en backend antes que confiar en frontend.

## Dish view tracking

`DishFeed` registra el platillo que se abrió desde el menú. No cuenta tarjetas renderizadas ni cada platillo que aparece al hacer scroll como vista intencional.

## Category tracking actual

`RestaurantView` registra `category_view` cuando una categoría persistente pasa a activa.

No registra `populares`.

No asumir que abrir/cerrar repetidamente produce una semántica de sesión única.

## Cart tracking actual

`selection_add` está asociado a la acción explícita de agregar desde `DishFeed`. Los cambios de cantidad en “Mi pedido” no lo generan. El término describe selección, no pedido enviado.

## Reglas para métricas nuevas

Toda métrica nueva debe definir antes de implementarse:

1. nombre;
2. evento fuente;
3. actor;
4. ventana temporal;
5. deduplicación;
6. tenant;
7. interpretación;
8. exclusiones;
9. volumen esperado;
10. limitaciones.

Ejemplo:

`menu_to_cart_rate`

No implementar hasta decidir:

- denominador;
- sesión vs evento;
- repetición;
- dispositivo;
- período.

## Métricas permitidas hoy

Con las limitaciones actuales, pueden presentarse como interacción aproximada:

- conteo de vistas registradas;
- conteo de agregados registrados;
- conteo de vistas de categoría registradas;
- sesiones anónimas con visita al menú;
- tasa de agregado por sesiones;
- clicks registrados en WhatsApp;
- rankings de entidades dentro del período seleccionado.

Usar lenguaje de interacción, no de revenue.

## Métricas que requieren más infraestructura

- usuarios únicos;
- sesiones únicas;
- tasa de conversión confiable;
- funnel completo;
- revenue;
- ticket promedio;
- ventas por platillo;
- repeat customers;
- cohortes;
- atribución;
- tiempos de permanencia confiables.

No inferirlas desde los datos actuales.

## Cambios recomendables futuros

No ejecutar automáticamente; son candidatos de roadmap técnico:

1. corregir semántica de “Hoy”;
2. instrumentar views reales por platillo visible;
3. mapear datos históricos y eventos canónicos en Statistics sin reinterpretar filas;
4. eliminar truncamiento silencioso o agregar agregación server-side;
5. separar métricas por período de métricas current-state;
6. añadir límites contra abuso de eventos.

## Validación para cambios de analytics

Como mínimo:

- evento correcto;
- restaurant_id correcto;
- ID de entidad correcto;
- no bloquear UX ante fallo;
- no duplicar accidentalmente;
- dashboard interpreta misma semántica;
- actor ajeno no obtiene datos de otro tenant.

Cambios de tabla/policy requieren Nivel D.
