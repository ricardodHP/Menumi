# Menú público — UX y comportamiento

## Propósito

Este documento describe la experiencia pública en `/r/:slug` y los invariantes que deben preservarse al modificarla.

## Diseños del menú

El restaurante elige una de tres presentaciones para el mismo catálogo:

- **Social** conserva el perfil, las categorías tipo stories, el grid y el detalle estilo feed. Es el diseño predeterminado y mantiene el comportamiento previo.
- **Carta clásica** prioriza lectura rápida con índice de categorías, filas compactas, descripción breve y precio visible. Las miniaturas aparecen únicamente cuando el platillo tiene una foto real.
- **Galería** presenta las categorías como secciones con tarjetas de platillos y fotos protagonistas. Nombre y precio están visibles; sin foto real, la tarjeta usa un tratamiento tipográfico neutro.

Las tres presentaciones comparten perfil, búsqueda, catálogo visible, carrito, likes, reviews, rating, compartir, disponibilidad, QR, WhatsApp y asistente. La elección de presentación es independiente del tema visual `cuisine_template`; los cinco temas actuales son provisionales y sus estilos definitivos quedan pendientes de decisión.

La presentación cambia navegación y jerarquía visual, no categorías ni platillos. `populares` continúa como vista virtual ordenada por la configuración del restaurante. En Carta clásica y Galería, activar una categoría desplaza a su sección y mantiene accesible el resto del menú; Populares sí filtra el catálogo. La búsqueda abarca todo el catálogo visible aunque haya una categoría seleccionada.

Los detalles abiertos desde Carta clásica o Galería conservan las acciones comunes y muestran una foto solo si existe una imagen real. Social conserva su comportamiento de imagen actual.

## Flujo principal

`RestaurantPublic`
→ `useRestaurantData(slug)`
→ `RestaurantView`

`RestaurantView` coordina:

- perfil;
- categoría activa;
- búsqueda;
- modo grid/feed;
- carrito;
- asistente;
- reviews;
- temas visuales y presentación;
- deep links;
- tracking.

## Perfil

`ProfileHeader` representa identidad y datos del restaurante.

Puede incluir información como:

- logo;
- nombre;
- bio;
- dirección;
- horarios;
- links externos;
- rating cuando esté habilitado.

Los links externos deben usar datos configurados por el restaurante.

No inventar URLs o contactos.

## Categorías

En Social, `CategoryStories` presenta categorías horizontalmente.

Incluye una pseudo-categoría:

- id: `populares`;
- nombre visible: Populares.

`populares` es virtual.

No persistirla en `categories`.

La interacción de categoría puede generar `category_view`.

## Grid

En Social, `DishGrid` permite exploración rápida.

Prioridades:

- imagen;
- reconocimiento visual;
- densidad adecuada en móvil y escritorio;
- transición clara al detalle.

No sobrecargar cada tarjeta con todos los metadatos del platillo.

## Feed

`DishFeed` conserva la vista detallada y las acciones comunes. En Social muestra el feed vertical en móvil y, en pantallas grandes, una cuadrícula de tres columnas con tarjetas cuadradas estilo Instagram. Para Carta clásica y Galería se abre un solo platillo con un marco visual adaptado a la presentación.

Comportamientos actuales relevantes:

- imagen cuadrada;
- tap simple abre lightbox;
- double tap activa like;
- botón de like;
- acceso a reviews;
- agregar al carrito;
- compartir deep link;
- precio;
- tags;
- rating condicionado por configuración;
- navegación explícita “Volver al menú”.

Al tocar este componente, revisar:

- listeners;
- timers;
- historial del navegador;
- bloqueo/restauración de scroll;
- tracking;
- interacción tap vs double tap.

## Deep links

El menú soporta query param de platillo:

`/r/:slug?dish=<id>`

El objetivo es abrir el detalle de ese platillo cuando pertenezca al menú cargado.

Reglas:

- no romper navegación normal;
- ignorar IDs inválidos de forma segura;
- no permitir acceso cross-tenant mediante un dish id que no pertenezca al restaurante cargado.

## Búsqueda

La búsqueda filtra el catálogo disponible en el menú.

Debe:

- trabajar sobre platillos del restaurante actual;
- respetar visibilidad;
- ser rápida en móvil;
- no requerir backend adicional si el dataset ya está cargado y el patrón actual es suficiente.

No introducir búsqueda global entre restaurantes.

## Carrito

El botón flotante del carrito debe permanecer accesible cuando tenga sentido.

El carrito permite:

- añadir;
- aumentar;
- reducir;
- eliminar;
- calcular total estimado.

El total es informativo.

No implica cobro.

### Flujo sin mesa

El código actual ofrece acciones como:

- mostrar al mesero;
- WhatsApp;
- carrito compartido.

### Flujo con sesión de mesa

Existe comportamiento alterno para enviar pedido a mesa.

Esta área pertenece a funcionalidades congeladas.

Si una tarea del carrito no trata mesas:

- preservar el branch existente;
- no ampliarlo.

## Carrito compartido

Permite colaboración mediante código.

Usa:

- identidad local de dispositivo;
- nombre almacenado localmente;
- Supabase;
- Realtime.

Si se modifica:

- revisar `CartContext`;
- revisar tablas/policies;
- revisar limpieza de subscription;
- probar host y guest.

## Likes

`LikesContext` mantiene un Set de IDs liked.

Persistencia local:

- key `likedDishes:v1`.

Persistencia del contador:

- RPC `increment_dish_likes`;
- RPC `decrement_dish_likes`.

Reglas:

- mantener UI optimista coherente con backend;
- no duplicar incremento por double tap;
- no usar `likes_count` como identidad del usuario;
- tratar errores de red si se modifica el flujo.

## Reviews

`ReviewsModal` se usa para restaurante/platillo según contexto.

La UI debe respetar:

- `restaurant.showRating`;
- `dish.showRating`.

Un rating visible debe provenir de datos reales.

No fabricar reviews para demos productivos salvo fixtures claramente aislados.

## Compartir platillo

El feed construye un deep link del restaurante + dish id.

Al modificar:

- usar el slug del restaurante correcto;
- codificar/validar parámetros cuando aplique;
- mantener feedback al copiar.

## Asistente del Chef

`AssistantModal` hace preguntas sobre:

- antojo;
- presupuesto;
- acompañamiento.

La recomendación actual usa reglas locales.

Fuentes permitidas:

- catálogo cargado;
- tags;
- nombre;
- descripción;
- precio;
- rating.

No llamar a un modelo externo solo porque el componente se llame “Asistente”.

Cualquier IA real futura debe ser una decisión explícita con privacidad, costo y fallback definidos.

## Templates

`getTemplateStyles` aplica variables CSS y tipografía.

Preservar tokens como:

- background;
- foreground;
- primary;
- primary-foreground;
- accent;
- secondary;
- ring;
- gradient-story.

No usar colores hardcodeados para elementos temáticos si existe token equivalente.

Excepciones justificadas:

- marcas externas, por ejemplo WhatsApp;
- estados semánticos;
- contenido gráfico específico.

## Responsive

Prioridad:

1. móvil;
2. tablet;
3. desktop.

No asumir que más ancho debe convertir la UI en dashboard.

Al modificar layout no trivial, validar al menos:

- viewport móvil estrecho;
- móvil estándar;
- desktop.

## Accesibilidad mínima

Mantener:

- `alt` útil en imágenes funcionales;
- labels accesibles en botones de icono;
- controles táctiles suficientes;
- foco razonable en dialogs;
- contraste compatible con templates;
- navegación comprensible sin depender solo de iconos.

## Loading y error

El menú debe distinguir:

- cargando;
- restaurante no encontrado/no disponible;
- menú válido sin categorías/platillos cuando ocurra;
- errores operativos de interacciones.

No mostrar una pantalla vacía silenciosa.

## Analytics desde UI

El tracking debe ser best-effort.

Nunca bloquear una interacción principal porque falle analytics.

Eventos actuales:

- view;
- cart_add;
- category_view.

Consulta `ANALYTICS.md` antes de añadir métricas.

## Checklist antes de modificar el menú público

Preguntar:

- ¿afecta una o todas las plantillas?
- ¿afecta grid y feed?
- ¿afecta carrito?
- ¿afecta deep links?
- ¿afecta analytics?
- ¿afecta mobile?
- ¿afecta navegación/back?
- ¿introduce datos que deben venir de Supabase?
- ¿puede romper aislamiento entre restaurantes?

Solo ampliar la inspección a esas áreas cuando la respuesta sea sí.
