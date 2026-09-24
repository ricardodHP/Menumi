# Analytics y estadísticas — Culinary Feed

## Propósito

Este documento define qué significan las métricas actuales, cómo se calculan y qué limitaciones tienen.

No asumas que una métrica visible en dashboard representa ventas, usuarios únicos o conversiones reales.

## Fuente de datos

Tabla principal:

`public.dish_events`

Eventos actuales:

- `view`;
- `cart_add`;
- `category_view`.

El tracking se realiza desde frontend mediante:

`src/lib/analytics.ts`

La función `trackEvent` es best-effort y no debe bloquear la UX principal.

## Semántica actual de eventos

### view

Se registra cuando se abre un platillo en el flujo de `DishFeed`.

No equivale a:

- impresión garantizada;
- visitante único;
- sesión única;
- lectura completa;
- compra.

### cart_add

Se registra al usar la acción de agregar desde el feed.

No equivale a:

- pedido enviado;
- venta;
- checkout;
- pago;
- ingreso.

Importante: no asumir que toda forma de agregar al carrito necesariamente genera hoy este evento. Verifica consumidores antes de construir una métrica de conversión.

### category_view

Se registra cuando el usuario activa una categoría persistente desde el menú.

La pseudo-categoría `populares` no se trackea como categoría DB en el flujo actual.

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

RLS actual permite inserción pública amplia en `dish_events`.

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

El esquema/policy actual no debe asumirse como garantía completa de esta coherencia.

Si una tarea toca integridad de analytics, reforzar en backend antes que confiar en frontend.

## View tracking actual

`DishFeed` mantiene un Set local para evitar duplicar el mismo dish dentro de la instancia.

El efecto observado se dispara con `startIndex`.

Riesgo conocido:

- desplazarse verticalmente a otros platillos dentro del feed no necesariamente actualiza el índice usado por ese efecto;
- por tanto, “views” no debe asumirse como conteo exhaustivo de todos los platillos vistos al hacer scroll.

Antes de crear KPIs basados en views, validar este flujo.

## Category tracking actual

`RestaurantView` registra `category_view` cuando una categoría persistente pasa a activa.

No registra `populares`.

No asumir que abrir/cerrar repetidamente produce una semántica de sesión única.

## Cart tracking actual

El `cart_add` observado está asociado a una acción en `DishFeed`.

Antes de medir:

`views → cart_add`

verifica que todos los puntos de entrada al carrito estén instrumentados de forma consistente.

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
3. uniformar todos los puntos de `cart_add`;
4. eliminar truncamiento silencioso o agregar agregación server-side;
5. separar métricas por período de métricas current-state;
6. reforzar integridad/abuso de eventos.

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
