# Contexto del proyecto — Menumi

## Propósito

Menumi es una plataforma multi-tenant de menús digitales para restaurantes.

El producto combina:

- una experiencia pública visual y mobile-first;
- administración de información del restaurante;
- categorías y platillos;
- carrito y recomendaciones;
- likes, reseñas y calificaciones;
- analítica básica sobre interacción del menú;
- administración global de restaurantes y usuarios.

El tenant principal es el restaurante.

## Estado general

Stack actual:

- React 18;
- TypeScript;
- Vite;
- React Router;
- Tailwind CSS;
- shadcn/ui + Radix;
- Supabase;
- TanStack Query;
- Vitest + Testing Library.

Supabase actúa como backend principal para:

- Auth;
- PostgreSQL;
- RLS;
- Storage;
- RPC;
- Realtime en funcionalidades concretas;
- Edge Functions.

## Alcance activo del MVP

Considera como núcleo activo:

- landing/entrada de la aplicación;
- menú público por slug;
- perfil del restaurante;
- categorías;
- platillos;
- búsqueda;
- carrito local;
- Asistente del Chef;
- likes;
- reseñas y ratings;
- estadísticas;
- administración del restaurante;
- administración de categorías;
- administración de platillos;
- autenticación de owner/admin;
- administración global;
- QR del menú público;
- plantillas visuales por tipo de cocina.

## Funcionalidades existentes pero congeladas

El repositorio contiene implementación de:

- mesas;
- sesiones de mesa;
- diners;
- meseros;
- login de mesero;
- pedidos por mesa;
- estados de cocina;
- rutas `/mesero` y `/m/:code`;
- Edge Functions asociadas.

Estas funcionalidades NO forman parte del MVP activo actual.

Reglas:

- preservarlas si un cambio transversal las toca;
- no expandirlas;
- no completar automáticamente etapas descritas en documentación histórica;
- no introducir nuevas dependencias alrededor de ellas;
- modificarlas solo por instrucción explícita o para evitar una regresión directa causada por un cambio aprobado.

## Funcionalidad secundaria existente

El carrito compartido existe y usa Supabase + Realtime.

Preservar su comportamiento cuando se toque `CartContext`, pero no convertirlo en prioridad ni ampliarlo automáticamente.

## Usuarios y roles

Roles de aplicación actuales:

- `admin`;
- `owner`;
- `customer`.

Interpretación operativa:

- `admin`: administración global;
- `owner`: administra su restaurante;
- `customer`: rol autenticado general, actualmente no es eje del MVP público.

Los meseros no son `auth.users`; usan un modelo separado y Edge Functions. Esta decisión pertenece a funcionalidad congelada.

## Rutas principales

### Públicas

- `/`
- `/r/:slug`
- `/login`

### Owner/Admin

- `/dashboard`
- `/dashboard/categorias`
- `/dashboard/platillos`
- `/dashboard/estadisticas`

### Admin global

- `/admin`
- `/admin/users`

### Existentes pero fuera del MVP

- `/dashboard/mesas`
- `/dashboard/meseros`
- `/mesero/login`
- `/mesero`
- `/m/:code`

## Fuentes de verdad

Prioridad:

1. instrucción actual del usuario;
2. `AGENTS.md`;
3. código ejecutable;
4. migraciones de Supabase;
5. documentación especializada en `docs/agent/`;
6. `.lovable/memory/**` y `.lovable/plan.md` como contexto histórico.

La memoria de Lovable puede estar desactualizada.

Ejemplo conocido: documentación histórica describe likes como puramente in-memory, mientras el código actual conserva estado local y modifica el contador persistente mediante RPC.

No reconciliar discrepancias silenciosamente.

## Principios de producto

- Mobile-first para la experiencia pública.
- La imagen del platillo es protagonista.
- El menú público no debe verse como un dashboard SaaS.
- El restaurante es el límite principal de tenancy.
- Estadísticas representan interacción, no ventas.
- Evitar scope creep hacia POS, pagos, reservas o cocina salvo decisión explícita.
- Los cambios del MVP deben priorizar valor directo para restaurante y comensal.

## Deuda y riesgos conocidos

### `.env` versionado

Existe un archivo `.env` en el repositorio y el `.gitignore` actual no excluye de forma general archivos `.env`.

Tratar como deuda técnica de seguridad.

No reproducir su contenido.

Una tarea específica de seguridad debe revisar:

- secretos expuestos;
- rotación si aplica;
- eliminación segura del historial cuando sea necesario;
- `.env.example`;
- reglas de ignore.

### Integridad de analytics

`dish_events` acepta tracking anónimo solo para restaurantes publicados y formas válidas de evento/IDs por tenant. Aún se pueden fabricar eventos y UUIDs de sesión; no es antifraude y no representa ventas ni pedidos confirmados.

Consulta `ANALYTICS.md`.

### Cobertura de pruebas

Existe infraestructura Vitest, pero la cobertura automatizada actual es baja.

No inferir seguridad funcional porque `npm test` pase.

Consulta `VALIDATION_STATE.md`.

### Documentación histórica

`.lovable/plan.md` y `.lovable/memory/**` contienen decisiones de etapas anteriores, especialmente mesas y pedidos.

No usarlas para reactivar funcionalidades fuera del MVP.

## Terminología

- **Restaurante:** tenant principal.
- **Owner:** usuario autenticado propietario del restaurante.
- **Admin:** usuario con administración global.
- **Menú público:** experiencia en `/r/:slug`.
- **Categoría:** agrupación persistente de platillos.
- **Populares:** categoría virtual de UI; no es una fila persistente.
- **Platillo activo:** `is_active = true`; puede aparecer públicamente.
- **Featured:** atributo editorial; no equivale automáticamente a “popular”.
- **View:** evento analítico de visualización de platillo.
- **Cart add:** evento de agregar al carrito; no equivale a venta.
- **Shared cart:** carrito colaborativo existente, secundario al MVP.
- **Feature congelada:** código existente que debe preservarse pero no ampliarse.

## Cómo retomar trabajo

Para una tarea funcional:

1. lee este archivo;
2. identifica el dominio;
3. abre solo el documento especializado correspondiente;
4. inspecciona el código inmediato;
5. amplía el scope solo ante dependencias reales.
