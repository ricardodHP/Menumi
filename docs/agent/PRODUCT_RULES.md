# Reglas de producto — Menumi

## Propósito

Este documento contiene decisiones funcionales y límites de alcance.

No describe cómo programar una feature; define qué comportamiento pertenece al producto actual y qué cambios requieren una decisión explícita.

## Objetivo actual

El MVP debe permitir que un restaurante:

1. tenga un menú público atractivo y fácil de explorar desde móvil;
2. administre su información;
3. cree, edite, ordene, active y desactive categorías y platillos;
4. entienda cómo interactúan los clientes con el menú mediante métricas básicas;
5. ofrezca interacciones útiles sin convertirse todavía en un POS o sistema completo de operación de restaurante.

## Tenant

El restaurante es el tenant principal.

Toda funcionalidad persistente debe respetar ese límite.

Una feature no debe mezclar:

- platillos;
- categorías;
- estadísticas;
- reviews;
- configuración;
- archivos;

entre restaurantes distintos.

## MVP activo

### Restaurante

Incluye:

- nombre;
- slug;
- bio;
- logo;
- teléfono;
- dirección;
- horario;
- WhatsApp;
- Instagram;
- template de cocina;
- estado draft/published;
- configuración de ratings;
- configuración de orden por rating.

### Categorías

Incluye:

- alta;
- edición;
- eliminación;
- orden;
- nombre;
- emoji;
- imagen cuando aplique.

### Platillos

Incluye:

- alta;
- edición;
- eliminación;
- categoría;
- nombre;
- descripción;
- precio;
- imagen;
- tags;
- posición;
- featured;
- activo/inactivo;
- rating visible/oculto.

### Menú público

Incluye:

- perfil;
- categorías estilo stories;
- populares;
- grid;
- feed;
- búsqueda;
- detalle visual;
- carrito;
- likes;
- reviews;
- ratings;
- compartir platillo;
- Asistente del Chef;
- QR del menú.

### Estadísticas

Incluye interacción básica:

- vistas de platillo;
- agregados al carrito;
- vistas de categoría;
- ratings;
- likes.

Estas métricas no equivalen a ventas.

### Administración

Incluye:

- owner sobre su restaurante;
- admin global;
- gestión de usuarios/roles ya existente.

## Funcionalidades existentes fuera del MVP

Existen en el código, pero están congeladas:

- mesas;
- sesiones de mesa;
- diners;
- meseros;
- login de mesero;
- pedidos por mesa;
- flujo de estados de pedido;
- vista operativa del mesero.

Regla:

**existente no significa prioritario.**

No:

- ampliar pantallas;
- añadir estados;
- crear vista de cocina;
- añadir pagos;
- añadir notificaciones;
- completar etapas antiguas;

salvo instrucción explícita.

Si una refactorización transversal toca estas áreas, conservar compatibilidad razonable.

## Carrito

El carrito principal representa intención del comensal, no una venta confirmada.

Sin sesión de mesa, el flujo actual permite:

- mostrar pedido al mesero;
- compartir por WhatsApp;
- usar carrito compartido cuando corresponda.

No presentar un carrito como:

- orden pagada;
- venta;
- ticket;
- transacción confirmada.

## Carrito compartido

Existe una modalidad colaborativa con código y Realtime.

Es secundaria al MVP principal.

No hacerla requisito para usar el menú.

No ampliar permisos o persistencia sin revisar `SUPABASE.md`.

## Categoría “Populares”

`populares` es una categoría virtual de UI.

No existe como categoría persistente.

Reglas:

- no insertar una fila llamada `populares` para resolver lógica frontend;
- no usarla como foreign key;
- su contenido debe derivarse de los platillos y reglas del menú;
- cualquier cambio a su criterio debe ser una decisión funcional explícita.

## Platillos activos

`is_active` controla visibilidad pública.

Un platillo inactivo:

- puede seguir existiendo para administración;
- no debe mostrarse como opción normal al comensal.

No usar eliminación física como sustituto de deshabilitar cuando el objetivo sea ocultar temporalmente.

## Featured vs popular

`is_featured` es una decisión editorial.

Rating, likes, vistas y popularidad son señales diferentes.

No tratarlas como equivalentes.

## Ratings

El producto permite controlar visibilidad de rating:

- a nivel restaurante;
- a nivel platillo.

Si `show_rating` está desactivado:

- ocultar representación de rating correspondiente;
- no ofrecer interacción que contradiga la configuración.

No fabricar ratings para ausencia de reseñas fuera del comportamiento ya definido por backend.

## Reviews

Las reviews son persistentes.

Reglas:

- rating entre 1 y 5;
- respetar publicación del restaurante;
- respetar visibilidad configurada;
- no permitir que un cambio de UI salte controles de RLS;
- no usar reviews de un restaurante en otro.

## Likes

El comportamiento actual combina:

- preferencia local del dispositivo;
- contador persistente del platillo mediante RPC.

No cambiar esta semántica incidentalmente.

Si se redefine el modelo de likes, debe decidirse explícitamente:

- identidad;
- deduplicación;
- persistencia;
- anonimato;
- contador.

## Asistente del Chef

El asistente actual es un recomendador determinista basado en:

- respuestas del usuario;
- tags;
- nombre;
- descripción;
- precio;
- rating.

No presentarlo como IA generativa si no lo es.

No inventar propiedades del platillo.

Las recomendaciones deben derivarse del catálogo real.

Si no hay coincidencia suficiente, preferir fallback explícito y seguro antes que fabricar un platillo.

## Templates de cocina

Templates actuales:

- generic;
- mexican;
- italian;
- chinese;
- japanese.

Son variaciones de presentación, no tipos distintos de restaurante con reglas de negocio incompatibles.

Una funcionalidad del menú debe funcionar razonablemente en todas las plantillas.

## Publicación

Los restaurantes tienen estado:

- draft;
- published.

El menú público normal debe respetar publicación.

No hacer visible un draft anónimamente para resolver una necesidad de preview.

Si se necesita preview autenticado, mantener separado el concepto de preview del estado published.

## Admin vs owner

Owner:

- administra su restaurante.

Admin:

- puede administrar globalmente;
- puede operar sobre un restaurante específico mediante los mecanismos existentes.

No dar a owner capacidades globales como efecto secundario.

## Métricas

Semántica mínima:

- `view`: interacción de visualización;
- `cart_add`: agregado al carrito;
- `category_view`: interacción con categoría.

No usar nombres como:

- ventas;
- pedidos;
- ingresos;
- conversión a compra;

si la fuente no lo respalda.

Consulta `ANALYTICS.md`.

## Importación de menú

La importación desde imagen o PDF puede formar parte de una futura mejora del onboarding, pero “subir un archivo” y “extraer estructuradamente categorías/platillos” son capacidades distintas.

Si se implementa extracción:

- el resultado debe ser revisable antes de persistir;
- nunca insertar masivamente datos ambiguos sin confirmación;
- distinguir texto extraído de inferencias;
- validar precios y categorías;
- evitar duplicados;
- respetar tenant y Storage.

No asumir que existe OCR completo solo porque el UI acepte archivos.

## Fuera de alcance por defecto

No implementar incidentalmente:

- pagos;
- split bill;
- facturación;
- POS;
- inventario;
- reservas;
- cocina/KDS;
- delivery propio;
- push notifications;
- programa de lealtad;
- integraciones externas de mensajería;
- nuevas features de mesero;
- gestión avanzada de mesas.

Cualquiera puede convertirse en roadmap futuro, pero requiere decisión de producto.

## Regla para propuestas nuevas

Antes de implementar una propuesta no solicitada, evaluar:

1. ¿resuelve un problema del MVP actual?
2. ¿requiere cambiar modelo de datos o permisos?
3. ¿introduce operación de restaurante fuera del menú?
4. ¿aumenta mantenimiento antes de validar valor?
5. ¿hay una alternativa más pequeña?

Si no es necesaria para la tarea actual, no construirla.
