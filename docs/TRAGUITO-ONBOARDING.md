# Bienvenida guiada con Traguito

Sustituye el splash de ubicación por cinco pasos: bienvenida, condiciones de una oferta, sesión para ver el detalle (con enlaces a Términos y Aviso de privacidad), utilidad del GPS y participación por sucursal. Reutiliza el personaje de `public/icon-512-v2.png`, con una animación de entrada breve por paso. El ejemplo de precio está identificado como ilustrativo.

- Se muestra después de la animación de carga (y del splash de cumple si aplica), una vez por navegador hasta completar u omitir.
- Preferencia versionada: `trago_onboarding_v1` en localStorage. Si el almacenamiento está bloqueado, recuerda la decisión durante esa sesión.
- Atrás/Siguiente; Escape equivale a omitir. No avanza automáticamente ni reproduce audio.
- Un `<dialog>` nativo contiene el foco y bloquea interacción con el fondo. Contenido desplazable en pantallas pequeñas; `prefers-reduced-motion` desactiva las animaciones nuevas.
- Repetición desde Inicio y Cuenta → Cómo funciona TraGo (Inicio sin sesión).
- Omitir por primera vez y Explorar catálogo llevan a `/promos`. Omitir una repetición conserva la ruta actual.
- Acción principal al terminar: **Activar ubicación y seguir en Inicio** (pide GPS y permanece en `/`; no manda a Cerca).
- «Ir a Cerca» es opcional y sí navega a `/cerca`. «Explorar catálogo» va a `/promos` sin GPS.
- Abrir `/cerca` por primera vez espera a que cierre el tutorial antes de pedir permiso.
- Inicio solo usa geolocalización si el permiso ya está concedido y la bienvenida no está pendiente.
- El aviso de instalación se oculta mientras el tutorial está abierto.
- Los anuncios demo (`trago-beta-ads`) siguen visibles; se etiquetan «Patrocinado · Demostración».

## Validación

```sh
npm run test:onboarding --prefix trago_web
npm run lint --prefix trago_web
npm run build --prefix trago_web
```

## Cómo volver a verla

```js
localStorage.removeItem('trago_onboarding_v1');
location.reload();
```

O pulsa «Cómo funciona TraGo» en Inicio / Cuenta.
