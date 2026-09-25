# Analytics y estadísticas — Culinary Feed

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

`view` y `cart_add` permanecen en el enum y en filas históricas. No se reescriben ni se interpretan como si se hubieran capturado con los nombres nuevos. Statistics aún consume sus métricas históricas.

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

### Implementación temporal actual

El filtro usa:

- 1 día;
- 7 días;
- 30 días;

restados desde `Date.now()`.

Consecuencia:

**“Hoy” significa actualmente últimas 24 horas, no día calendario local.**

No cambiar esa semántica silenciosamente.

Si se corrige:

- definir zona horaria;
- definir inicio de día;
- revisar labels;
- añadir tests.

## Límite de eventos

La consulta actual limita a:

`5000` eventos por rango.

Consecuencia:

- restaurantes con más volumen pueden ver rankings truncados;
- el dashboard no indica actualmente que hubo truncamiento.

No presentar la métrica como exhaustiva sin considerar este límite.

## Métricas por período vs métricas all-time

El dashboard combina fuentes con distintas ventanas.

### Sí dependen del rango seleccionado

Derivadas de `dish_events`:

- vistas de platillos;
- agregados al carrito;
- vistas de categorías;
- rankings asociados a esos eventos.

### No dependen actualmente del rango

Se cargan desde `dishes` como estado actual:

- `rating`;
- `likes_count`.

Consecuencia:

- “likes totales” es actualmente acumulado/current-state, no likes generados durante el rango;
- ranking por rating representa rating actual, no rating del período;
- ranking por likes representa contador actual, no likes del período.

No etiquetar esas métricas como temporales sin cambiar su modelo de datos.

## “Más” y “menos”

Para eventos, los rankings se construyen desde IDs presentes en los eventos recuperados.

Consecuencia:

- “menos visitados” no incluye necesariamente platillos con cero eventos;
- “menos categorías” no incluye necesariamente categorías con cero eventos.

Si se quiere un verdadero ranking de menor rendimiento:

- partir del catálogo completo;
- asignar cero a entidades sin evento;
- definir si inactivos participan.

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
- ranking de entidades dentro de eventos recuperados;
- rating actual;
- likes acumulados actuales.

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
