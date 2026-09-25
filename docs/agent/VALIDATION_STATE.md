# Estado y estrategia de validación — Menumi

## Propósito

Este documento define el baseline real de validación del repositorio y cómo escalar verificaciones según riesgo.

No ejecutar todas las validaciones por rutina.

## Scripts disponibles

Desde `package.json`:

- `npm run dev` → Vite dev server;
- `npm run build` → `vite build`;
- `npm run lint` → `eslint .`;
- `npm run preview` → Vite preview;
- `npm test` → `vitest run`;
- `npm run test:watch` → Vitest watch.

## TypeScript

No existe actualmente un script dedicado `typecheck`.

`tsconfig.app.json` usa `noEmit: true`.

Validación directa recomendada cuando haga falta:

`npx tsc -p tsconfig.app.json`

Importante:

`npm run build` usa Vite y no debe tratarse como sustituto garantizado de typecheck completo.

## Estado actual de tests

Vitest está configurado con:

- jsdom;
- globals;
- `src/test/setup.ts`;
- patrón `src/**/*.{test,spec}.{ts,tsx}`.

La suite visible actualmente contiene solo un test de ejemplo trivial.

Consecuencia:

**que `npm test` pase no implica que el producto esté funcionalmente cubierto.**

Para lógica nueva relevante, agregar tests focalizados cuando aporten protección real.

## ESLint

Config actual:

- JavaScript recommended;
- TypeScript ESLint recommended;
- React Hooks;
- React Refresh.

Algunas reglas TypeScript estrictas están relajadas.

No interpretar ausencia de lint error como garantía de corrección de tipos o dominio.

## Baseline TypeScript

El proyecto no está en modo strict completo.

Entre otros:

- `strict: false`;
- `noImplicitAny: false`;
- unused checks relajados.

No intentar activar strict global como efecto secundario de una tarea.

Sí evitar introducir deuda nueva innecesaria.

## Nivel A — cambio trivial

Ejemplos:

- copy;
- icono;
- asset;
- spacing;
- clase aislada;
- documentación.

Validar:

- diff;
- sintaxis/formato;
- lint focalizado si el archivo es código.

No ejecutar build/test completo salvo evidencia de riesgo.

## Nivel B — cambio funcional local

Ejemplos:

- componente;
- hook;
- helper;
- handler;
- validación local.

Validar:

- `npx tsc -p tsconfig.app.json` o validación TS equivalente;
- ESLint del archivo/área;
- tests directamente relacionados;
- interacción manual focalizada si la UI cambió.

Ejemplo de lint focalizado:

`npx eslint src/components/Componente.tsx`

## Nivel C — cambio transversal

Ejemplos:

- routing;
- Context;
- shared state;
- contratos de tipos;
- flujo completo del menú;
- múltiples componentes;
- comportamiento responsive no trivial.

Validar:

- TypeScript;
- lint relevante o completo;
- tests relacionados;
- `npm run build`;
- flujo funcional principal;
- regresiones de consumidores afectados.

## Nivel D — cambio crítico

Ejemplos:

- Supabase;
- Auth;
- RLS;
- Storage;
- RPC;
- Edge Function;
- migración;
- publicación/seguridad multi-tenant.

Validar según aplique:

- TypeScript;
- lint;
- tests;
- build;
- SQL/migración;
- permisos;
- actor autorizado;
- actor no autorizado;
- tenant propio;
- tenant ajeno;
- rollback o compatibilidad.

Si Supabase CLI está disponible:

- validar local;
- usar `supabase db push --dry-run` antes del push real.

No aplicar cambios remotos destructivos sin confirmación explícita.

## Playwright / E2E

Playwright no aparece actualmente configurado como dependencia del repositorio.

No instalarlo automáticamente por una tarea pequeña.

Puede justificarse cuando una tarea afecte:

- navegación;
- interacción compleja;
- responsive;
- dialogs;
- back button;
- deep links;
- auth;
- integración frontend/backend;
- regresión visual importante.

Si el entorno de trabajo ya ofrece una herramienta de navegador equivalente, puede usarse sin alterar dependencias del proyecto.

## Validación visual del menú

Para cambios públicos relevantes revisar al menos:

### Móvil

- ancho estrecho;
- scrolling;
- categories stories;
- grid;
- feed;
- carrito;
- dialogs;
- botones flotantes;
- teclado cuando exista input.

### Desktop

- ancho máximo;
- centrado;
- overlays;
- navegación;
- no convertir accidentalmente layout a dashboard.

### Templates

Si se tocan tokens/colores/layout temático, probar:

- generic;
- al menos un template con overrides fuertes.

Idealmente más si el cambio afecta CSS variables compartidas.

## Validación de auth

Cuando corresponda probar:

- sin sesión;
- owner;
- admin;
- owner intentando restaurante ajeno;
- refresh;
- logout.

No considerar protegida una ruta únicamente porque `ProtectedRoute` la oculta: revisar RLS si hay datos sensibles.

## Validación de dashboard

Para cambios de owner:

- restaurante asignado;
- owner sin restaurante;
- admin override;
- loading;
- error;
- vacío;
- guardado;
- reload si aplica.

## Validación de categorías

Revisar según cambio:

- crear;
- editar;
- borrar;
- ordenar;
- categoría sin imagen;
- categorías vacías;
- aislamiento por restaurante;
- efecto en menú público.

## Validación de platillos

Revisar según cambio:

- crear;
- editar;
- borrar;
- activar/desactivar;
- featured;
- show_rating;
- tags;
- precio;
- categoría nula;
- upload;
- efecto público;
- tenant.

## Validación de carrito

Si se toca `CartContext`:

- agregar;
- agregar repetido;
- incrementar;
- decrementar a cero;
- eliminar;
- limpiar;
- total;
- abrir/cerrar;
- shared cart si el cambio es transversal;
- flujo de mesa congelado si el cambio puede afectarlo.

## Validación de likes

Si se toca:

- primer like;
- unlike;
- reload/localStorage;
- RPC success;
- RPC failure;
- double tap;
- botón;
- no duplicar contador visual.

## Validación de analytics

Consulta `ANALYTICS.md`.

Verificar:

- evento;
- entity id;
- restaurant id;
- deduplicación;
- rango;
- truncamiento;
- semántica visible.

## Screenshots y artefactos

Genera screenshots cuando aporten evidencia real:

- cambio visual significativo;
- responsive;
- bug reproducible;
- antes/después;
- estado difícil de describir.

Ruta sugerida:

`artifacts/playwright/`

No agregar screenshots al repo automáticamente si solo sirven como evidencia temporal, salvo que el workflow del equipo lo requiera.

## Regla de escalamiento

Antes de añadir una validación adicional pregunta:

**¿Qué fallo concreto puede detectar que las validaciones actuales no cubren?**

Si no hay respuesta concreta, no escales por rutina.

## Reporte final

No decir simplemente “validado”.

Indicar:

- comando o flujo;
- resultado;
- qué no se pudo validar;
- si existe baseline roto previo;
- si el cambio requiere verificación remota posterior.
