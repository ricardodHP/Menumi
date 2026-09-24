# Menumi — MVP Development Backlog

## 1. Objetivo del MVP

Menumi es una plataforma para convertir menús tradicionales de restaurantes en menús digitales visuales, editables y medibles.

El MVP debe resolver principalmente dos escenarios:

### Escenario A — Cliente dentro del restaurante

Restaurant owner
→ configura restaurante
→ carga/importa menú
→ publica
→ coloca QR
→ cliente escanea QR
→ explora menú
→ agrega platillos a "Mi pedido"
→ consulta su selección y total
→ realiza el pedido directamente con el mesero

Menumi NO procesa el pedido en este flujo.

### Escenario B — Cliente externo

Cliente
→ recibe link desde Instagram / WhatsApp / web
→ explora menú
→ agrega productos a "Mi pedido"
→ opcionalmente inicia contacto/pedido por WhatsApp

WhatsApp es configurable por restaurante.

---

# 2. Principio fundamental del MVP

Menumi NO es todavía:

- POS
- sistema de órdenes
- sistema de comandas
- sistema de mesas
- sistema de cocina
- sistema de delivery

"Mi pedido" representa:

> La selección que el cliente está considerando pedir.

NO representa:

> Una orden recibida, confirmada, preparada o vendida.

Esta distinción debe mantenerse en UI, modelo, analytics y copy.

---

# 3. Scope Freeze

## IN SCOPE — MVP

- Información del restaurante
- Categorías
- Platillos
- Disponibilidad / agotado
- Imágenes
- Importación desde imagen/PDF
- Menú público
- QR general del restaurante
- "Mi pedido"
- Total de selección
- Notas simples
- WhatsApp opcional
- Reseñas/calificaciones existentes
- Analytics de interacción
- Onboarding
- Responsive mobile + desktop
- Seguridad
- Testing

## OUT OF SCOPE — DO NOT IMPLEMENT

No desarrollar durante el MVP:

- Mesas
- QR por mesa
- Sesiones de mesa
- Meseros
- PIN de meseros
- Pedidos internos
- Estados de pedido
- Cocina / KDS
- POS
- Pagos
- División de cuenta
- Inventario
- Multi-sucursal
- Roles avanzados
- Followers
- Following
- Feed social
- Discovery social
- IA conversacional
- LLM insights
- Promociones avanzadas
- Dominios personalizados

Las implementaciones existentes de Mesas/Meseros pueden permanecer en código,
pero deben quedar fuera de la navegación y del flujo MVP.

---

# 4. Prioridades

P0 = bloqueante para lanzamiento MVP  
P1 = completar antes del piloto  
P2 = mejora si no retrasa validación

---

# EPIC M1 — Información del restaurante

Priority: P1

## M1-01 — Normalizar WhatsApp

El restaurante debe introducir únicamente su número.

No exigir:

https://wa.me/...

Generar URLs internamente.

### Acceptance Criteria

- número validado
- código de país soportado
- URL generada automáticamente
- datos existentes compatibles

---

## M1-02 — WhatsApp opcional

Agregar configuración:

whatsapp_enabled

Semántica:

true:
Menumi puede mostrar una acción para contactar/pedir por WhatsApp.

false:
no aparece CTA de WhatsApp en el flujo público.

### Important

WhatsApp no debe ser obligatorio para utilizar Menumi.

---

## M1-03 — Normalizar Instagram

Permitir preferentemente:

@usuario

Generar URL internamente.

---

## M1-04 — Horarios estructurados

Reemplazar progresivamente horario libre por:

- día
- abierto/cerrado
- hora apertura
- hora cierre

Un rango diario es suficiente para MVP.

Diseñar modelo sin bloquear horarios partidos futuros.

---

## M1-05 — Ratings y reseñas independientes

Separar:

allow_reviews
show_rating

---

## M1-06 — URL pública

Formato estable:

/r/{restaurantSlug}

Permitir:

- copiar
- abrir
- compartir

slug único.

---

# EPIC M2 — Categorías

Priority: P1

## M2-01 — Ocultar posición técnica

No mostrar:

Posición 0
Posición 1

La posición sigue existiendo internamente.

---

## M2-02 — Contador de platillos

Mostrar:

X platillos

por categoría.

---

## M2-03 — Visible / oculta

Agregar:

is_visible

Ocultar no debe eliminar datos.

---

## M2-04 — Reordenamiento

Preferencia:

drag & drop

Fallback:

flechas actuales.

Persistir orden.

---

## M2-05 — Eliminación segura

Si una categoría contiene platillos:

- advertir
- impedir eliminación accidental
- permitir cancelar

---

## M2-06 — Imagen/icono de categoría

Modelo:

name
icon opcional
image opcional

Prioridad pública:

image
→ icon
→ fallback

---

# EPIC M3 — Platillos

Priority: P0

## M3-01 — Buscar platillo

Agregar búsqueda por nombre.

Debe funcionar junto al filtro por categoría.

---

## M3-02 — Vista administrativa compacta

Optimizar gestión de catálogos grandes.

Mostrar al menos:

- thumbnail
- nombre
- precio
- categoría
- disponibilidad
- visibilidad
- editar

Goal:

50–100 platillos deben poder administrarse cómodamente.

---

## M3-03 — Visible / Disponible

Separar:

visible
available

### visible = false

No aparece en menú.

### visible = true + available = false

Aparece públicamente como:

Agotado

y no puede agregarse a "Mi pedido".

---

## M3-04 — Tags

Sustituir progresivamente string separado por comas por chips.

Ejemplo:

[picante ×]
[vegano ×]

---

## M3-05 — Precio

No inicializar implícitamente en 0.

Validar valor antes de guardar.

---

## M3-06 — Imágenes

Implementar:

- preview
- crop/aspect ratio consistente
- compresión
- validación tamaño/formato

No generar imágenes artificiales de comida para el MVP.

---

## M3-07 — Destacado vs rating

Diferenciar visualmente:

⭐ rating
🔥 destacado
♡ favorito

Evitar reutilizar símbolos ambiguos.

---

## M3-08 — Duplicar platillo

Copiar información editorial/configuración.

NO copiar:

- likes
- reviews
- analytics

---

## M3-09 — Orden de platillos

Permitir definir orden dentro de categoría.

---

# EPIC M4 — Variantes y Extras — Architecture Only

Priority: P1

No construir todavía configurador completo.

Pero evitar una arquitectura rígida basada exclusivamente en:

dish.price

Preparar evolución futura:

Dish
→ Variants
→ ModifierGroups
→ Modifiers

Ejemplo futuro:

Pizza

Chica $150
Mediana $180
Grande $220

Extra queso +$25

### MVP

Documentar/preparar modelo.

No es obligatorio exponer UI.

---

# EPIC M5 — Importación de menú

Priority: P0

Feature crítica de onboarding.

---

## M5-01 — Importar imagen

Pipeline:

Upload
→ extracción
→ parsing
→ categorías/platillos/precios
→ revisión
→ confirmación
→ persistencia

---

## M5-02 — Importar PDF

Primero intentar extraer texto embebido.

Utilizar procesamiento de imagen solamente cuando sea necesario.

---

## M5-03 — Preview de importación

Antes de guardar, permitir:

- editar nombre
- precio
- descripción
- categoría
- eliminar elemento incorrecto
- corregir categoría

Nunca publicar automáticamente contenido detectado.

---

## M5-04 — Errores

Contemplar:

- formato no válido
- sin texto
- precio ambiguo
- categoría desconocida
- duplicados
- extracción parcial

No inventar datos silenciosamente.

---

# EPIC M6 — "Mi pedido"

Priority: P0

## Product Definition

"Mi pedido" NO es una orden enviada al restaurante.

Es una selección temporal de productos realizada por el cliente.

El nombre visible recomendado en producto es:

Mi pedido

El código interno puede conservar naming como:

cart

si cambiarlo generaría refactor innecesario.

La semántica del producto, sin embargo, debe ser la anterior.

---

## M6-01 — Agregar platillo

Permitir:

- producto
- cantidad
- precio

No permitir agregar productos agotados.

---

## M6-02 — Modificar selección

Permitir:

- aumentar cantidad
- disminuir
- eliminar

---

## M6-03 — Notas

Permitir nota sencilla.

Ejemplo:

Sin cebolla.

No implementar modifiers complejos todavía.

---

## M6-04 — Total

Mostrar suma clara de la selección.

NO llamarla:

Total a pagar

si Menumi no procesa el pago.

Preferir:

Total de tu selección

o simplemente:

Total

---

## M6-05 — Persistencia

La selección debe sobrevivir navegación y refresh.

Puede utilizar:

localStorage

o infraestructura equivalente.

Debe estar aislada por restaurante.

Una selección creada en Restaurante A no puede aparecer en Restaurante B.

---

## M6-06 — Acción presencial

El flujo presencial termina mostrando claramente la selección.

Ejemplo:

Mi pedido

2 × Margherita     $360
1 × Tiramisú        $90

Total               $450

El cliente puede mostrar esta pantalla al mesero.

NO agregar botones falsos como:

"Enviar a cocina"

"Pedir ahora"

si no existe backend de órdenes.

---

# EPIC M7 — WhatsApp opcional

Priority: P1

WhatsApp es un canal complementario.

NO forma parte obligatoria del flujo presencial.

---

## M7-01 — CTA condicional

Mostrar:

Pedir / contactar por WhatsApp

solo cuando:

whatsapp_enabled = true

y exista número válido.

---

## M7-02 — Mensaje

Generar mensaje basado en "Mi pedido".

Ejemplo:

Hola, me interesa realizar el siguiente pedido:

2 × Margherita — $360
1 × Tiramisú — $90

Total: $450

Notas:
Sin cebolla

---

## M7-03 — No asumir contexto de mesa

El mensaje NO debe incluir:

Mesa X

salvo que en una versión futura exista un sistema real de mesas/sesiones.

No pedir al cliente que escriba manualmente su número de mesa como workaround.

---

## M7-04 — Evento Analytics

Registrar:

whatsapp_clicked

NO:

order_sent

Porque Menumi solamente conoce que el cliente abrió/inició WhatsApp.

No sabemos si:

- envió el mensaje
- el restaurante lo recibió
- fue aceptado
- se vendió

---

# EPIC M8 — Analytics Event Model

Priority: P0

Los analytics deben medir comportamiento real observable.

## Eventos MVP

- menu_view
- category_view
- dish_view
- selection_add
- selection_remove
- selection_quantity_change
- favorite_added
- favorite_removed
- review_submitted
- whatsapp_clicked

Si el código existente utiliza:

add_to_cart
remove_from_cart

puede mantenerse internamente por compatibilidad.

Documentar claramente que significa "Mi pedido".

---

## M8-01 — Session ID

Cada visitante debe tener identificador anónimo de sesión.

Objetivo:

distinguir:

1 persona haciendo 10 vistas

de

10 sesiones diferentes.

No requiere login.

---

## M8-02 — Contexto de evento

Registrar cuando aplique:

- restaurant_id
- session_id
- timestamp
- dish_id
- category_id
- source

---

## M8-03 — Source

Preparar:

direct
qr
instagram
whatsapp
shared_link
unknown

No construir atribución avanzada.

---

## M8-04 — Definición de conversiones

### Menu sessions

sesiones únicas que abrieron el menú.

### Dish views

vistas registradas de un platillo.

### Selection adds

acciones de agregar productos a "Mi pedido".

### Session selection rate

sesiones con al menos un selection_add
/
sesiones que abrieron el menú

### Dish add rate

sesiones únicas que agregaron un platillo
/
sesiones únicas que vieron ese platillo

Evitar llamar a estas métricas:

sales conversion

porque no representan ventas confirmadas.

---

# EPIC M9 — Estadísticas

Priority: P1

La pantalla debe ayudar a responder:

- ¿cuántas personas interactúan con mi menú?
- ¿qué platillos generan interés?
- ¿qué platillos terminan en "Mi pedido"?
- ¿qué categorías reciben atención?

NO debe afirmar ingresos o ventas.

---

## M9-01 — KPIs principales

Mostrar prioritariamente:

- Visitas al menú
- Vistas a platillos
- Agregados a Mi pedido
- Tasa de agregado

Opcional si WhatsApp está habilitado:

- Clicks en WhatsApp

---

## M9-02 — Engagement secundario

Más abajo:

- likes
- ratings
- reviews

No convertir likes en KPI principal del negocio.

---

## M9-03 — Períodos

Filtros:

Hoy
Últimos 7 días
Últimos 30 días

Todas las métricas deben respetar el período.

Si algún dato es acumulado históricamente, mostrar:

Total histórico

---

## M9-04 — Analytics por platillo

Ejemplo:

Carbonara

230 vistas
12 agregados
5.2% tasa de agregado

---

## M9-05 — Rankings

Permitir rankings como:

- más vistos
- más agregados a Mi pedido
- mejor calificados

Mostrar cantidad de reseñas junto al rating.

Evitar clasificar como mejor/peor basándose en muestras irrelevantes.

---

## M9-06 — Insights deterministas

Ejemplos válidos:

"Carbonara recibe muchas vistas pero pocos agregados a Mi pedido."

"Margherita tiene la tasa de agregado más alta de esta semana."

"Tiramisú recibió más vistas que durante el período anterior."

No inferir causas.

No decir:

"El precio está demasiado alto."

sin datos que lo demuestren.

No utilizar LLM para MVP.

---

# EPIC M10 — Onboarding

Priority: P0

Meta:

Restaurante nuevo → menú publicado en pocos minutos.

## Flujo

1. Crear restaurante
2. Información básica
3. Elegir:
   - Importar menú
   - Crear manualmente
4. Revisar categorías/platillos
5. Preview
6. Publicar
7. Obtener QR

---

## M10-01 — Empty States

Ejemplo:

Todavía no tienes platillos.

[Importar menú]
[Crear platillo]

---

## M10-02 — Progress feedback

Durante:

- uploads
- parsing
- imports

mostrar:

loading
progress cuando sea posible
error recuperable

---

# EPIC M11 — Publicación y QR

Priority: P0

## M11-01 — Estado

Distinguir claramente:

Borrador
Publicado

---

## M11-02 — Preview

Preview disponible antes de publicación.

---

## M11-03 — QR general

El MVP utiliza QR del restaurante:

/r/{restaurantSlug}

NO:

/table/{id}

/session/{token}

El QR debe:

- visualizarse
- poder imprimirse/guardarse
- compartirse

La URL debe permanecer estable.

---

# EPIC M12 — Responsive

Priority: P1

## Menú público

mobile-first.

## Administración

responsive mobile + desktop.

En desktop optimizar:

- densidad
- búsqueda
- edición
- listados

No crear dos aplicaciones independientes.

---

# EPIC M13 — Seguridad y Robustez

Priority: P0

## M13-01 — Tenant Isolation

Restaurant A nunca puede acceder a datos de Restaurant B.

Revisar:

- database
- RLS
- storage
- analytics
- mutations

---

## M13-02 — Validaciones server-side

Validar:

- prices
- slugs
- IDs
- ownership
- uploads
- nombres
- relaciones

---

## M13-03 — Slugs

Únicos y estables.

---

## M13-04 — UI states

Toda operación crítica debe manejar:

- loading
- success
- error
- empty

---

## M13-05 — Deletes

Evitar eliminación destructiva cuando exista información relacionada importante.

---

# EPIC M14 — Testing

Priority: P0

## M14-01 — Happy Path Owner

Owner:

→ crea restaurante
→ importa menú
→ revisa categorías
→ revisa platillos
→ publica
→ obtiene QR
→ abre preview
→ consulta analytics

---

## M14-02 — Happy Path Cliente presencial

Cliente:

→ escanea QR
→ explora categorías
→ abre platillo
→ agrega a Mi pedido
→ cambia cantidades
→ consulta total
→ muestra selección al mesero

No existe transmisión de orden.

---

## M14-03 — Happy Path Cliente externo

Cuando WhatsApp está habilitado:

→ abre link
→ explora
→ agrega a Mi pedido
→ abre WhatsApp

Verificar:

whatsapp_clicked

---

## M14-04 — Edge Cases

Probar:

- menú vacío
- categoría vacía
- platillo sin imagen
- platillo agotado
- platillo oculto
- categoría oculta
- restaurante borrador
- selección vacía
- refresh con selección
- cambiar de restaurante con selección existente
- WhatsApp desactivado
- WhatsApp inválido
- PDF inválido
- importación parcial
- slug duplicado
- acceso cross-tenant

---

# EPIC M15 — Pilot Readiness

Priority: P0

Antes de desarrollar nuevas features:

- onboarding funcional
- importación
- menú público
- Mi pedido
- QR
- analytics
- WhatsApp opcional
- mobile QA
- desktop admin QA
- security
- producción estable

Después:

probar con restaurantes reales.

---

# 5. Orden recomendado

## Phase 1 — Core

M1
M2
M3
M4

## Phase 2 — Importación

M5

## Phase 3 — Experiencia cliente

M6
M7

## Phase 4 — Analytics

M8
M9

## Phase 5 — Onboarding/publicación

M10
M11

## Phase 6 — Hardening

M12
M13
M14

## Phase 7 — Pilot

M15

---

# 6. Definition of Done

Una task no está terminada solamente porque exista la UI.

Debe cubrir cuando aplique:

- comportamiento funcional
- types
- schema
- migrations
- RLS/security
- validaciones
- loading
- error
- empty states
- responsive
- tests
- lint
- typecheck
- build
- documentación
- no regresiones

---

# 7. Product Guardrails

Antes de implementar una nueva feature:

STOP.

Preguntar:

1. ¿Es necesaria para completar el MVP?
2. ¿Resuelve un problema observado?
3. ¿Existe evidencia de que debe desarrollarse ahora?

Si la respuesta es no:

POST-MVP.

Especialmente NO implementar como "mejora rápida":

- número de mesa escrito manualmente
- pseudo-órdenes
- botón "Enviar a cocina"
- pedido sin backend real
- QR por mesa sin sesiones
- integración parcial de meseros

No construir una versión incompleta de Mesas/Meseros para simular pedidos.

---

# 8. MVP Success Flow

## Restaurante

"Subo mi menú → reviso → publico → comparto QR."

## Cliente presencial

"Escaneo → exploro → agrego → veo Mi pedido → se lo indico al mesero."

## Cliente externo

"Abro link → exploro → agrego → opcionalmente contacto por WhatsApp."

## Restaurante

"Veo qué partes de mi menú están generando interés."

Ese es el MVP.

No avanzar hacia operación de restaurante hasta validarlo con usuarios reales.