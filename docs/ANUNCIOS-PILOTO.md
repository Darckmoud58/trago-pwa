# TraGo — anuncios y suscripción (piloto)

Pauta **propia** (no AdSense). Los anuncios van etiquetados *Patrocinado* y **nunca** entran al catálogo `origen: oficial`.

**Ingresos:** suscripción de cadena/sucursales + ellas suben **sus** anuncios.  
**No** Freemium con pauta del vecino (pierde clientes de oferta).

Ver tesis: [`PITCH-TRAGO.md`](./PITCH-TRAGO.md), [`PROPUESTA-FREEMIUM-EQUIPO.md`](./PROPUESTA-FREEMIUM-EQUIPO.md).

## Flujo piloto (cobro manual)

1. Alta unificada: PWA `/registro-empresa` → `POST /api/cadena/registro-empresa` crea responsable + empresa + rol en un paso.  
   Entrada: `/entrar-empresa` → panel `/cadena`.
2. En **Anuncios** pulsa *Solicitar plan de pauta* → crea `suscripciones` con `estatus: pending`.
3. Admin activa tras confirmar pago (transferencia / factura):

```http
POST /api/anuncios/admin/suscripciones
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "empresaId": "<ObjectId>",
  "plan": "basic",
  "dias": 30,
  "activo": true,
  "notas": "Piloto GDL · transferencia 31-oct"
}
```

Planes útiles: `basic` (pauta), `campaign` (vuelo marca), `pro` / `premium` (también actualiza `empresas.plan`).

4. La empresa crea borradores (`POST /api/cadena/anuncios`) y los activa (`POST /api/cadena/anuncios/:id/activar`).
5. La PWA sirve creativos en:

| Slot | Superficie |
|------|------------|
| `home_rail` | Home |
| `explorar_mid` | Explorar (`/promos`) |
| `cerca_top` | Cerca |
| `side_left` / `side_right` | Rieles desktop (huecos laterales) |

```http
GET /api/anuncios/serving?slot=home_rail&zona=gdl
POST /api/anuncios/:id/evento  { "tipo": "impression" | "click" }
```

## Colecciones

- `suscripciones` — periodo, `activo`, `origen: manual|solicitud|pasarela`
- `anuncios` — creativo, slot, zonas, métricas (`impresiones`, `clics`)
- `empresas.plan_pauta` — `none|basic|campaign` (espejo al activar)

## Reglas de producto

- Si no hay anuncio activo vigente → el slot se oculta (no inventar).
- Label visible *Patrocinado* / *Sponsored*.
- Alcohol: solo copy; gate 18+ de la app aplica.
- Fase 2: Mercado Pago / Stripe → webhook pone `activo` (`origen: pasarela`).

## Beta local / demo (video)

Para ver slots con creativo de prueba (muestras públicas, **no marcas reales**):

```bash
cd server && npm run seed:anuncios-beta -- --yes
```

Crea empresa `trago-beta-ads`, suscripción `basic` 30 días y anuncios activos
(`home_rail`, `explorar_mid`, `cerca_top`, `side_left`, `side_right`) con
`video_url` + poster **distintos** por slot (noche urbana / brindis rooftop /
calle cercana / pour de cóctel / antro neón) en `trago_web/public/ads-beta/`.
Creativos con look de comercial; no son ofertas oficiales.
La PWA reproduce el video muted/loop etiquetado *Patrocinado · Demostración*.

Campo en `anuncios`: `video_url` (https o path `/…`). Si está presente, gana sobre `imagen_url`.

## Checklist venta piloto

- [x] Seed beta video (demo)
- [ ] 1 anunciante GDL real con plan `basic` 30 días
- [ ] Creativo de marca en `cerca_top` + `explorar_mid`
- [ ] Revisar impresiones/clics en panel Cadena
- [ ] Upsell: más sucursales / destacada cerca / slots extra (sin pauta de terceros)
