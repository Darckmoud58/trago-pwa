# TraGo — anuncios y suscripción (piloto)

Pauta **propia** (no AdSense). Los anuncios van etiquetados *Patrocinado* y **nunca** entran al catálogo `origen: oficial`.

Ver tesis comercial: [`PITCH-TRAGO.md`](./PITCH-TRAGO.md), [`PROPUESTA-FREEMIUM-EQUIPO.md`](./PROPUESTA-FREEMIUM-EQUIPO.md).

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

## Checklist venta piloto

- [ ] 1 anunciante GDL con plan `basic` 30 días
- [ ] Creativo en `cerca_top` + `explorar_mid`
- [ ] Revisar impresiones/clics en panel Cadena
- [ ] Upsell Pro: destacada cerca + quitar pauta de terceros (siguiente corte)
