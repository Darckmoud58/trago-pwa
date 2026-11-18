# TraGo — modelo de ingresos (suscripción + anuncios propios)

> **Decisión de producto (nov 2026):** se **descarta Freemium con pauta de terceros**.  
> Regalar el canal al competidor (banner del vecino) **pierde clientes** de oferta.  
> La fuente de ingresos es **suscripción de cadena/sucursales** y **sus propios anuncios**.

Documento para el equipo. Tesis: [`PITCH-TRAGO.md`](./PITCH-TRAGO.md).  
Piloto técnico: [`ANUNCIOS-PILOTO.md`](./ANUNCIOS-PILOTO.md).

---

## 1. El problema

La gente se mueve por una promo y llega a una sucursal donde **ya no aplica**.  
Las cadenas pagan publicidad y compran **clics**, no **pies en la puerta**.

## 2. Qué es TraGo (una frase)

Vendemos **certeza local**: qué promo sigue vigente, en cuál sucursal, a cuántos metros — con fuente oficial × GPS × voto en piso.

No somos directorio, delivery ni feed social.

## 3. Modelo de ingresos (el que sí cuidamos)

| Producto | Quién paga | Qué recibe | Precio lista* |
|----------|------------|------------|----------------|
| **Suscripción Cadena / Sucursales** | Cadena o grupo de locales | Panel, promos vinculadas a sucursales, mapa de vigencia, métrica norte | $2,900 – $6,900 MXN/mes por zona |
| **Pauta propia (anuncios)** | Misma cadena (incluida o add-on) | Sube creativos (imagen/video) en Home / Explorar / Cerca, etiquetados *Patrocinado* | Incluida en plan o pack de slots |
| **Campaña marca** (fase 2) | Cerveza / destilado | Vuelo 7–15 días en slots | $15,000 – $80,000 / vuelo |

\*Lista para vender; se ajusta con piloto GDL.

### Qué **no** hacemos

| Anti-patrón | Por qué no |
|-------------|------------|
| Freemium $0 con **anuncios del vecino** | La cadena siente que pagamos con su audiencia al competidor → se va |
| AdSense / ads genéricos | Alcohol + poco control + diluye certeza |
| Disfrazar pauta de promo oficial | Rompe la tesis; catálogo `origen: oficial` queda limpio |

### Lógica comercial

```text
Usuario (gratis)  →  ve promos oficiales + GPS + vigencia
Cadena (paga)     →  suscripción + sube SUS anuncios / destacada cerca
Marca (paga)      →  campaña temporal (fase 2)
```

**Upsell natural (sin chantaje):** más sucursales → más valor de la suscripción (CSV, mapa, reportes).  
Más slots / video / zona → add-on de pauta. **Nunca** “paga o te muestro a la competencia”.

## 4. ¿Google Ads?

| Opción | Veredicto |
|--------|-----------|
| AdSense | **No** como motor principal |
| Pauta **propia** de la cadena suscrita | **Sí** — ellas pagan por aparecer |
| Etiqueta | Siempre *Patrocinado* — nunca como promo oficial |

## 5. Mejoras de producto para venderlo

1. Onboarding: registro empresa → suscripción (piloto: activación manual) → alta sucursales (CSV).
2. Con suscripción activa: crear/activar **sus** anuncios (imagen/video).
3. Destacada cerca + reportes de vigencia (métrica norte).
4. Sin plan activo: sin pauta propia; no inventar inventario de terceros “para llenar”.
5. Confianza: gate 18+, GPS honesto, catálogo solo oficial / verificado.

## 6. Decisiones para el equipo

1. ~~¿Freemium con pauta de terceros?~~ → **No. Cerrado.**
2. ¿Precio de lista suscripción: **$2,900** o **$4,900** (por cadena vs por zona)?
3. ¿Piloto: **1 cadena real en GDL** con N sucursales + 1 creativo propio?
4. ¿Sprint primero: **CSV sucursales** o **checkout/activación de suscripción**?

## 7. Elevator (30 s)

> TraGo no es un directorio ni delivery: es la app que te dice si la promo **sigue viva en esa sucursal**. El usuario entra gratis a la certeza; **la cadena paga suscripción** para operar sucursales y **subir sus anuncios**. Vendemos **pies en la puerta y vigencia real**, no likes ni inventario del competidor.

---

*Cifras de ingreso son escenarios de lista, no un forecast auditado.*  
*Nombre histórico del archivo: se mantuvo para no romper links; el contenido ya no propone Freemium.*
