# Supabase — Culinary Feed

## Propósito

Este documento resume los contratos persistentes y reglas de seguridad observables en el repositorio.

Antes de modificar Supabase:

- revisar migraciones existentes relevantes;
- revisar tipos generados;
- revisar consumidores frontend;
- revisar RLS;
- revisar Storage/Edge Functions si aplican.

No usar este documento como sustituto del esquema real.

## Cliente

Cliente:

`src/integrations/supabase/client.ts`

Variables públicas esperadas:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Nunca usar `service_role` en frontend.

El cliente usa `brokeredPreviewStorage()` para compatibilidad con previews de Lovable y fallback a almacenamiento local fuera de ese contexto.

No simplificar esa integración incidentalmente.

## Tipos

`src/integrations/supabase/types.ts` es generado.

Reglas:

- no editar manualmente como solución permanente;
- después de cambios de esquema, regenerar cuando el entorno lo permita;
- si no puede regenerarse, documentar el pendiente.

## Entidades activas principales

### profiles

Perfil ligado a `auth.users`.

RLS:

- usuario puede leer/actualizar su perfil según políticas;
- admin puede leer perfiles según reglas existentes.

### user_roles

Roles:

- admin;
- owner;
- customer.

Existe helper SQL `has_role`.

No autorizar operaciones sensibles únicamente desde claims/UI si RLS ya define el contrato.

### restaurants

Campos de dominio incluyen:

- owner_id;
- slug;
- name;
- bio;
- logo_url;
- phone;
- address;
- hours;
- whatsapp_link;
- instagram_link;
- cuisine_template;
- status;
- show_by_rating;
- show_rating;
- timestamps.

Estados:

- draft;
- published.

Lectura pública condicionada por publicación; owner/admin tienen acceso adicional según RLS.

### categories

Ligadas por `restaurant_id`.

Incluyen:

- name;
- emoji;
- image_url;
- position.

Owner/admin escriben según políticas existentes.

### dishes

Ligados por `restaurant_id` y opcionalmente `category_id`.

Incluyen:

- name;
- description;
- price;
- image_url;
- rating;
- likes_count;
- tags;
- is_featured;
- position;
- is_active;
- show_rating;
- timestamps.

El menú público debe filtrar por restaurante y visibilidad.

### reviews

Una review puede ser:

- de restaurante;
- de platillo mediante `dish_id`.

Incluye:

- restaurant_id;
- dish_id;
- user_id;
- author_name;
- rating;
- comment;
- created_at.

Validaciones existentes:

- rating 1..5;
- límite de longitud de comentario;
- límite de author_name.

Existe lógica de recálculo del rating del platillo tras cambios de reviews.

### dish_events

Eventos:

- view;
- cart_add;
- category_view.

Incluye:

- restaurant_id;
- dish_id;
- category_id;
- event_type;
- created_at.

Owner/admin leen según RLS.

La inserción pública actual es amplia.

Consulta `ANALYTICS.md`.

## RPC relevantes

### has_role

Helper de autorización.

### increment_dish_likes

Incrementa contador persistente del platillo.

### decrement_dish_likes

Decrementa contador persistente.

Existen otras funciones de administración y recálculo en migraciones.

Antes de cambiar una RPC:

- buscar todos los consumidores;
- revisar `SECURITY DEFINER`;
- revisar `search_path`;
- validar parámetros y autorización.

## Storage

Buckets/policies observados para:

- `restaurant-logos`;
- `dish-images`.

Las políticas han evolucionado mediante migraciones.

Antes de modificar uploads:

- revisar la migración más reciente, no solo la primera;
- mantener path/tenant coherentes;
- no permitir escritura cruzada entre restaurantes;
- validar MIME y tamaño en la capa adecuada;
- no reutilizar nombre original como identificador confiable;
- conservar lectura pública solo cuando el asset deba ser público.

## Shared carts

Tablas existentes:

### shared_carts

Incluye:

- restaurant_id;
- code;
- host_device_id;
- metadata de host/expiración según esquema actual.

### shared_cart_items

Ligados al cart y dish.

Esta funcionalidad permite acceso público controlado por políticas y usa Realtime desde frontend.

Es secundaria al MVP.

Cualquier cambio requiere revisar:

- expiración;
- code collision;
- permisos de host/guest;
- pertenencia del dish al restaurante;
- abuso de escritura pública.

## Funcionalidades congeladas

### waiters

Cuentas internas por restaurante.

No son `auth.users`.

### tables

Mesas por restaurante.

### table_sessions

Sesiones abiertas/cerradas por mesa con código.

### diners

Dispositivos/personas asociados a sesión.

### orders

Pedidos asociados a restaurante/sesión/mesa.

Estados:

- pending;
- preparing;
- ready;
- delivered;
- cancelled.

### order_items

Snapshots de:

- dish;
- nombre;
- precio;
- cantidad;
- notas.

Estas tablas existen, pero el feature está fuera del MVP activo.

No ampliar esquema operacional salvo solicitud explícita.

## Edge Functions existentes

Relacionadas principalmente con features congeladas:

- `waiter-auth`;
- `waiter-admin`;
- `waiter-tables`;
- `session-open`;
- `session-close`;
- `session-join`;
- `session-state`;
- `order-create`;
- `orders-list`;
- `order-update-status`;
- `session-orders`.

Patrones observables:

- service role dentro de Edge Functions cuando corresponde;
- validación de payload;
- tokens propios de mesero;
- CORS;
- Zod en funciones de pedidos/sesión.

No mover service role al navegador para “simplificar”.

## Multi-tenancy

Regla absoluta:

`restaurant_id` debe pertenecer al tenant autorizado.

Para cualquier write sensible comprobar:

1. identidad;
2. rol;
3. restaurante;
4. relación del recurso con restaurante;
5. operación permitida.

Un filtro frontend no reemplaza RLS.

## Admin override

`useManagedRestaurant` permite que admin seleccione un restaurante mediante query param.

Esto es UX/selección de contexto.

La autorización real sigue dependiendo de RLS.

Nunca convertir el ID del query param en permiso.

## Migraciones

Ubicación:

`supabase/migrations/**`

Reglas:

- nuevas modificaciones persistentes → nueva migración;
- no reescribir historial aplicado;
- usar nombres/fechas consistentes;
- hacer cambios backward-compatible cuando sea razonable;
- incluir índices/constraints pertinentes;
- revisar RLS en la misma tarea;
- regenerar tipos.

Antes de aplicar remoto:

1. revisar SQL;
2. probar local si el entorno existe;
3. ejecutar dry-run cuando CLI lo soporte;
4. verificar proyecto destino;
5. aplicar;
6. comprobar estado remoto.

## Cambios destructivos

Requieren confirmación explícita:

- DROP de tabla/columna;
- pérdida de datos;
- reset;
- cambio de owner masivo;
- eliminación de policies protectoras;
- apertura pública de tablas privadas;
- cambios de Auth;
- rotación/eliminación de secrets.

## Matriz mínima de autorización

Cuando aplique, validar:

| Actor | Caso |
| --- | --- |
| anon | solo datos públicos previstos |
| owner propio | puede administrar su restaurante |
| owner ajeno | no puede leer/escribir administración ajena |
| admin | capacidades globales previstas |
| mesero | solo Edge Functions del restaurante, cuando se trabaje ese feature |

## Riesgos conocidos

### dish_events

Insert público demasiado permisivo para considerarlo antifraude.

### .env

Existe un `.env` versionado.

No mostrar su contenido.

### Features congeladas

Tienen Edge Functions con service role y auth propia.

Un cambio transversal de esquema puede romperlas aunque no formen parte del MVP.

## Checklist para cambios Supabase

- ¿cambia esquema?
- ¿requiere migración?
- ¿afecta tipos?
- ¿afecta RLS?
- ¿afecta Storage?
- ¿afecta RPC?
- ¿afecta Edge Functions?
- ¿afecta otro tenant?
- ¿hay una operación destructiva?
- ¿se validó actor autorizado y no autorizado?
