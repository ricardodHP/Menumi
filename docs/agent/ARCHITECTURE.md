# Arquitectura — Culinary Feed

## Objetivo

Este documento describe la arquitectura observable del repositorio actual.

No prescribe una reescritura.

Si un patrón actual puede resolver una tarea de forma segura, reutilízalo antes de introducir una capa nueva.

## Stack

Frontend:

- React 18;
- TypeScript;
- Vite;
- React Router 6;
- Tailwind CSS;
- shadcn/ui;
- Radix primitives;
- lucide-react.

Estado y datos:

- React Context;
- hooks locales;
- Supabase client;
- TanStack Query disponible;
- localStorage para determinados estados de dispositivo;
- Supabase Realtime en carrito compartido.

Backend:

- Supabase PostgreSQL;
- Auth;
- RLS;
- Storage;
- RPC;
- Edge Functions.

Testing:

- Vitest;
- Testing Library;
- jsdom.

## Entrada de aplicación

`src/main.tsx` monta `App`.

`src/App.tsx` concentra:

- QueryClientProvider;
- TooltipProvider;
- BrowserRouter;
- AuthProvider;
- CartProvider;
- LikesProvider;
- toasters;
- definición de rutas.

No mover providers ni router sin una necesidad funcional clara.

## Mapa de rutas

### Públicas

- `/` → `Index`
- `/r/:slug` → `RestaurantPublic`
- `/login` → `Login`
- `/signup` → redirección a login

### Admin global

- `/admin` → `AdminRestaurants`
- `/admin/users` → `AdminUsers`

Protegidas con rol `admin`.

### Owner/Admin

- `/dashboard` → `DashboardHome`
- `/dashboard/categorias` → `DashboardCategories`
- `/dashboard/platillos` → `DashboardDishes`
- `/dashboard/estadisticas` → `DashboardStats`

Protegidas con roles `owner` o `admin`.

### Existentes pero congeladas

- `/dashboard/meseros`
- `/dashboard/mesas`
- `/mesero/login`
- `/mesero`
- `/m/:code`

No ampliar sin instrucción explícita.

## Capas observables

### Páginas

`src/pages/**`

Responsables de:

- composición de pantalla;
- carga de datos específica;
- interacción con layouts;
- coordinación de componentes de dominio.

Evita mover lógica global a una página si varios consumidores ya la necesitan.

### Componentes de producto

`src/components/**`

Ejemplos:

- `RestaurantView`
- `ProfileHeader`
- `CategoryStories`
- `DishGrid`
- `DishFeed`
- `CartModal`
- `AssistantModal`
- `ReviewsModal`
- componentes de QR.

Mantenerlos orientados al dominio.

### UI primitives

`src/components/ui/**`

Componentes shadcn/Radix.

Regla:

- reutilizar antes de duplicar;
- evitar modificaciones globales por una necesidad de un solo feature;
- si se modifica una primitive, revisar consumidores relevantes.

### Contexts

`src/contexts/**`

#### AuthContext

Responsable de:

- sesión;
- usuario;
- roles;
- helpers de autorización/navegación.

No usarlo como sustituto de RLS.

#### CartContext

Responsable de:

- carrito local;
- selección local persistida por `restaurant.id` en `localStorage` usando solo IDs, cantidades y nota general;
- rehidratación contra el catálogo público actual, descartando platillos stale;
- selección efímera sin persistencia para preview;
- cantidades;
- total;
- apertura del carrito;
- carrito compartido;
- Realtime del carrito compartido;
- identidad de dispositivo relacionada con shared cart.

Es una pieza de estado global sensible a regresiones.

#### LikesContext

Responsable de:

- IDs liked por dispositivo;
- persistencia local;
- RPC de incremento/decremento.

No volverlo puramente visual sin cambiar explícitamente el contrato de producto.

### Hooks

`src/hooks/**`

Patrón preferido para lógica reutilizable.

Hooks relevantes:

- `useManagedRestaurant`
- `useRestaurantData`
- hooks de mesas/pedidos congelados.

`useManagedRestaurant` resuelve el restaurante administrado:

- admin puede usar override por query param;
- owner usa `owner_id = auth.uid()`.

Preservar este contrato salvo rediseño explícito.

### Lib

`src/lib/**`

Incluye:

- analytics;
- device helpers;
- slug;
- templates;
- utilidades.

Preferir funciones pequeñas y puras cuando la lógica no necesita React.

## Flujo del menú público

Ruta:

`/r/:slug`

Flujo principal:

`RestaurantPublic`
→ `useRestaurantData(slug)`
→ `RestaurantView`
→ componentes de presentación/interacción.

`useRestaurantData` carga:

- restaurante;
- categorías;
- platillos visibles;
- datos necesarios para la representación pública.

`RestaurantView` coordina:

- categoría activa;
- grid/feed;
- búsqueda;
- deep links;
- carrito;
- asistente;
- reseñas;
- templates;
- tracking.

`CartModal` en el menú público se limita a revisar la selección local y el carrito compartido. No consulta sesiones de mesa ni envía pedidos; los flujos de mesa y pedidos permanecen congelados en sus rutas/componentes existentes y no son alcanzables desde `/r/:slug`.

Consulta `MENU_PUBLIC.md` antes de modificar este flujo de forma transversal.

## Flujo del dashboard

Las páginas de dashboard usan `DashboardLayout` y `useManagedRestaurant`.

Regla principal:

todo dato administrativo debe quedar limitado al restaurante administrado.

No depender solo del query param o filtro de frontend para seguridad.

RLS sigue siendo obligatorio.

## Flujo de admin

Admin puede:

- gestionar restaurantes;
- gestionar usuarios/roles;
- entrar al contexto de un restaurante para administrarlo.

No trasladar capacidad global de admin a owners.

## Acceso a datos

El repositorio mezcla de forma válida:

- queries directas con `supabase`;
- hooks de acceso;
- Context;
- TanStack Query.

No imponer una migración global a React Query como efecto secundario.

Extrae una capa nueva solo si existe:

- duplicación real;
- necesidad de cache compartida;
- contrato reutilizado;
- complejidad de testing;
- acoplamiento excesivo.

## Estado local vs persistente

### Local

Apropiado para:

- apertura de modal;
- filtros visuales;
- categoría activa;
- input de búsqueda;
- animaciones;
- UI efímera.

### Context

Apropiado para:

- auth;
- carrito;
- likes/dispositivo;
- estado transversal con consumidores múltiples.

### Supabase

Apropiado para:

- datos del restaurante;
- categorías;
- platillos;
- reviews;
- métricas;
- configuración persistente.

No guardar en Context una copia autoritativa de datos multi-tenant que ya viven en Supabase sin una razón clara.

## Plantillas

`src/lib/templates.ts` define overrides visuales por cocina.

Templates actuales:

- generic;
- mexican;
- italian;
- chinese;
- japanese.

Se aplican mediante CSS variables y, cuando corresponde, tipografía/decoración.

No hardcodear decisiones visuales que rompan templates sin revisar este sistema.

## Archivos generados

`src/integrations/supabase/types.ts` es generado.

`src/integrations/supabase/client.ts` contiene la integración del frontend con Supabase.

No tratarlos como archivos ordinarios de dominio.

## Criterios para nuevas abstracciones

Crear una nueva abstracción solo cuando reduzca complejidad concreta.

No crear:

- repositories globales;
- services genéricos;
- stores adicionales;
- wrappers sobre Supabase;
- design systems paralelos;

solo por preferencia arquitectónica.

## Cambios transversales de alto riesgo

Revisar dependencias antes de tocar:

- providers de `App.tsx`;
- `AuthContext`;
- `CartContext`;
- `LikesContext`;
- `useManagedRestaurant`;
- tipos de `RestaurantInfo` o `Dish`;
- templates;
- routing;
- integración Supabase.

Para estos cambios usa validación Nivel C o D según corresponda.
