# TraGo — pagos sandbox (suscripción cadena)

Piloto: la cadena paga **suscripción** (sucursales + pauta propia).  
Sin Freemium con ads ajenos. Tesis: [`PROPUESTA-FREEMIUM-EQUIPO.md`](./PROPUESTA-FREEMIUM-EQUIPO.md).

## Qué registra hoy

### Al registrarse (`POST /api/cadena/registro-empresa`)
| Campo | Obligatorio |
|-------|-------------|
| `empresaNombre`, `empresaDescripcion?`, `sitio_web?` | empresa |
| `name`/`nombre`, `email`/`correo`, `password`, `birthDate` | responsable 18+/13+ |
| `sucursal?` `{ nombre?, calle, colonia?, municipio?, estado?, lat, lng, horario? }` | opcional 1ª sucursal |

Plan inicial: `freemium` / `plan_pauta: none` (aún no paga).

### Sucursales después (`POST /api/cadena/sucursales`)
`nombre`, `calle`, `num_ext?`, `colonia?`, `municipio`, `estado`, `lat`, `lng`, `horario?`, `imagen?` → colección `ubicaciones`.

### Suscripción / pago
| Antes | Ahora |
|-------|--------|
| Solo “Solicitar plan” → admin activa a mano | **Sandbox** o Mercado Pago Checkout |

## Cotización (lista piloto)

- Base `basic` **$2,900 MXN**/mes (1 sucursal incluida)
- +**$500** por sucursal adicional
- `pro` $4,900 · `premium` $6,900 · `campaign` $4,900

`GET /api/cadena/pagos/cotizar?plan=basic&sucursales=3`

## Flujo sandbox (local / Vercel sin MP)

1. Panel `/cadena` → **Pagar suscripción (sandbox)**  
2. `POST /api/cadena/pagos/checkout` → `checkout_url`  
3. `/cadena/pago-sandbox?pago=&token=` → **Simular pago aprobado**  
4. Activa `suscripciones` + `empresas.plan_pauta=basic`

```bash
# server/.env
PAGOS_PROVIDER=sandbox
APP_ORIGIN=http://localhost:5173
```

## Mercado Pago y PayPal (sandbox real)

En el panel hay dos botones. Cada uno abre **su** checkout de prueba. El plan se activa solo cuando la pasarela confirma el mismo monto en MXN. Un token que no empieza por `TEST-`, o `PAYPAL_MODE` distinto de `sandbox`, no cobra.

Mercado Pago: credencial de **prueba** en [Developers MP](https://www.mercadopago.com.mx/developers). Al pagar, inicia sesión con el **comprador de prueba**.

PayPal: app de **Sandbox** en [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox). Al pagar, inicia sesión con la cuenta **Personal** de sandbox.

```bash
# server/.env  — no commitear los secretos
MP_ACCESS_TOKEN=TEST-...
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
APP_ORIGIN=https://trago-pwa-ujo5.vercel.app
API_PUBLIC_URL=https://trago-pwa.vercel.app
```

Retorno PayPal: `GET /api/pagos/paypal/retorno`. Webhooks: `POST /api/pagos/webhook/mercadopago` y `POST /api/pagos/webhook/paypal`. El servidor vuelve a leer el cobro en la API de prueba antes de activar la pauta.

## Admin manual (sigue vivo)

`POST /api/anuncios/admin/suscripciones` con JWT admin — ver [`ANUNCIOS-PILOTO.md`](./ANUNCIOS-PILOTO.md).
