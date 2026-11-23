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

## Mercado Pago (sandbox real)

1. [Developers MP](https://www.mercadopago.com.mx/developers) → credenciales de **prueba** (`TEST-…`)
2. Env API:

```bash
PAGOS_PROVIDER=mercadopago
MP_ACCESS_TOKEN=TEST-...
APP_ORIGIN=https://trago-pwa-ujo5.vercel.app
API_PUBLIC_URL=https://<tu-api>.vercel.app
```

3. Webhook: `POST /api/pagos/webhook/mercadopago` (MP avisa `topic=payment`).

Un token que no empieza por `TEST-` no activa Mercado Pago: el checkout se queda en sandbox y el webhook no cobra ni aprueba.

## Admin manual (sigue vivo)

`POST /api/anuncios/admin/suscripciones` con JWT admin — ver [`ANUNCIOS-PILOTO.md`](./ANUNCIOS-PILOTO.md).
