# TraGo
## La promo que sí está viva — en la sucursal de a lado

**Documento comercial · confidencial**  
PWA de promociones vigentes por cadena, sucursal y geolocalización  
México · 18+ cuando hay alcohol  
Septiembre 2026

---

### Una frase

Hoy las cadenas publican promociones. Mañana el cliente llega a la sucursal y ya no aplican. **TraGo vende certeza:** qué promo sigue vigente, en cuál local, a cuántos metros.

---

## 1. El problema (lo que duele de verdad)

México está lleno de “2x1”, “3x2 en botella” y “cover + mixto”. El anuncio vive en Instagram, en el volante de la cadena o en el sitio corporativo. **La vigencia vive en el piso** — y el piso no es uniforme.

Tres fallas que se repiten cada noche:

1. **La promo es de la cadena, no del local.** Polanco sí; Condesa ya se acabó. El usuario no tiene cómo saberlo sin ir.
2. **El contenido caduca y nadie lo baja.** El post de hace 12 días sigue likeable. El cliente se mueve. El negocio pierde la venta y gana un comentario malo.
3. **Quien paga publicidad compra clics, no pies en la puerta.** Una cadena gasta en “estamos en promo” y convierte mal porque el 30–50% de sucursales ya no participa, se les acabó el inventario o el gerente no activó el folio.

Eso no es un problema de “más catálogo”. Es un problema de **verdad local y a tiempo**.

### El costo, en claro

| Actor | Qué pierde hoy |
|--------|----------------|
| Usuario | Tiempo, pasaje, la noche, confianza |
| Cadena / sucursal | Visita frustrada, mala reseña, inventario mal empujado |
| Marca ( destilado, cerveza) | Trade spend sin prueba de que la botella se movió *en ese* local |
| Medio / app genérica | Engagement hueco: promociones “nacionales” que mienten en la esquina |

**Insight:** el ticket nocturno (botella, mesa, six) es alto. El arrepentimiento también. Quien resuelva “¿sí o no, aquí y ahora?” se queda con la intención de compra más cara del retail de conveniencia y de la vida nocturna.

---

## 2. A quién va dirigido

TraGo no es “para todo el que sale”. Tiene **dos caras que se alimentan**.

### A. Consumidor (demanda) — el que abre la PWA

| Perfil | Qué busca | Por qué TraGo |
|--------|-----------|---------------|
| **Cazador de promo 18–35** | 2x1, six, michelada, botella barata esta noche | GPS + vigencia por sucursal, no un feed infinito |
| **Grupo que sale** | Cover + botella, rooftop, antro | Decide en 30 segundos si vale el Uber |
| **Comprador de destilado** | 3x2 mezcal / 20% whisky en licorería | Ve si *esa* Cava / Vinoteca todavía lo tiene |

Promesa al usuario: *no te muevas de balde.*

Instalable en el teléfono (PWA). Sin App Store el día uno.

### B. Cadena y marca (oferta) — quien paga

| Perfil | Dolor | Qué le vendemos |
|--------|-------|-----------------|
| **Cadena de conveniencia** (Paso Rápido / formato Oxxo) | Promo nacional que no pega igual en 200 tiendas | Publicar por sucursal; ver dónde la gente confirma o niega |
| **Licorería / cava** | Inventario de botella caro y fechas cortas | Empujar 3x2 solo donde hay stock y tráfico |
| **Grupo de antros / cantinas** | Cover y botella que cambian jueves vs sábado | Destacar “cerca de ti” en horario nocturno |
| **Marca de alcohol** (Heineken, Cuervo, Johnnie) | Paga exhibición y no sabe si el local cumplió | Promo patrocinada + señal de vigencia en piso |

**No es el cliente primario:** el directorio de “lugares bonitos” (eso ya lo hace Google / Instagram). TraGo gana si **la promo es el producto**.

### C. Quién no es

- Menores de 18 (alcohol).
- Cadenas que no pueden (o no quieren) decir *en qué sucursales* aplica.
- Un marketplace de delivery: no competimos con Rappi; competimos con el **viaje en vano**.

---

## 3. La solución

**TraGo = promo oficial de la cadena × sucursales participantes × GPS × verdad de la calle.**

1. La empresa **publica** la promo: fechas, tipo (2x1, botella, cover, happy hour), términos, sucursales.
2. El usuario **ve las que están vigentes cerca**.
3. Entra al detalle y ve **en cuáles locales sigue viva**.
4. En el piso, **confirma o niega**: “sigue vigente” / “ya no aplica”.
5. Si se acumulan reportes en contra, esa sucursal pasa a *en duda* o se oculta. La cadena no pierde el control de lo oficial; **el piso corrige el folleto**.

Eso cierra la pregunta que Lalo dejó abierta: no es *o* la empresa *o* el usuario. **Las dos capas.** Sin la empresa no hay oferta legal ni marca. Sin el usuario, la vigencia es un PDF.

### Por qué PWA (y no app nativa el día uno)

- Se instala desde el navegador. Menos fricción que App Store / Play.
- Geolocalización y “agregar a inicio” bastan para el hábito de “¿a dónde vamos?”.
- Un solo código (Next.js) para web y “app”.
- Cuando haya tracción: wrappers nativos. No antes.

---

## 4. Por qué es vendible y rentable

El dinero no está en el usuario gratuito. Está en **quien necesita que esa sucursal se llene esta noche**.

### Motivos para pagar (cadena / marca)

1. **Aparecer primero en “Cerca de ti”** cuando hay intención real (GPS + horario nocturno).
2. **Dejar de quemar presupuesto** en sucursales donde la promo ya murió.
3. **Prueba social de piso:** N personas dijeron “sigue vigente” en Reforma vs 0 en Del Valle.
4. **API** para meter TraGo en su app, letrero digital o CRM (plan Premium).
5. **Marcas de alcohol:** pauta nativa sobre la promo de botella, no un banner genérico.

### Modelo de ingresos (Freemium que sí cierra)

| Plan | Quién | Qué incluye | Precio de lista sugerido* |
|------|--------|-------------|---------------------------|
| **Freemium** | Cadena chica / cantina | Perfil + 2 promos activas + anuncios de terceros | $0 |
| **Pro** | Cadena con 3+ sucursales | Sin anuncios propios, **destacada cerca de ti**, reportes de vigencia | $2,900 – $6,900 MXN / mes por zona (CDMX, MTY, GDL) |
| **Premium** | Grupo / marca | API, sucursales ilimitadas, white-label light, export | $12,000 – $25,000 MXN / mes |
| **Campaña de marca** | Destilado / cerveza | Promo patrocinada 7–15 días, slot nocturno | $15,000 – $80,000 por vuelo |
| **Pauta Freemium** | Anunciantes locales | Banner en perfiles free | CPM / CPC local |

\*Lista para vender la idea, no un SAP. Se ajusta con piloto.

### Unidad económica (piloto CDMX, conservador)

Supuesto de 12 meses, ciudad ancla:

| Palanca | Año 1 (orden de magnitud) |
|---------|----------------------------|
| 40 cadenas Pro × $4,000/mes promedio | ~$1.9 M MXN |
| 8 Premium × $15,000/mes | ~$1.4 M MXN |
| 6 vuelos de marca / trimestre | ~$1.2 – $2.0 M MXN |
| Pauta Freemium | $0.3 M MXN |
| **Ingreso bruto indicativo** | **$4.8 – $5.6 M MXN** |
| Costo (2–3 personas + infra + ads de adquisición) | $2.5 – $3.2 M MXN |
| **Margen de contribución** | Positivo si el piloto cierra 25+ Pro en 6 meses |

No hace falta ser “el Uber de las promos”. Hace falta **ser el sistema de verdad** de 40 cadenas que ya gastan en volante, pauta y trade.

### Por qué el margen aguanta

- Software, no inventario.
- PWA: cero comisión de tienda al inicio.
- El contenido lo ponen las cadenas; los usuarios lo curan. CAC de oferta bajo si el primer grupo (licorerías + antros) ve visitas medibles.
- Upsell natural: Freemium → Pro en cuanto la sucursal vecina les quite el clic.

---

## 5. Competencia y cuña

| Alternativa | Qué hace | Dónde falla vs TraGo |
|-------------|----------|----------------------|
| Instagram / TikTok | Alcance | No hay vigencia por sucursal ni GPS de “aún aplica” |
| Google Maps | Dónde está el local | No es un sistema de promos; el post se pudre |
| Clubes de lealtad de cadena | Descuento propio | Silo: no comparas Cava vs antro vs tienda |
| Rappi / PedidosYa | Entrega | Otro job: “me lo traen”, no “¿voy o no?” |
| Grupos de Facebook “promos CDMX” | Ruido social | Sin oficialidad, sin mapa, sin API |

**Cuña:** *oficial + local + vivo*. Nadie serio junta las tres.

---

## 6. Go-to-market (cómo se llena el dual market)

Orden que sí se puede ejecutar:

1. **Oferta primero (10–15 cadenas CDMX).** Licorerías, 1 grupo de antros, 1 formato conveniencia. Ellos cargan promos reales aunque el MVP hoy sea mock.
2. **Demanda en corredores.** Roma–Condesa–Reforma–Polanco. Una PWA, un mensaje: “botella y 2x1 que todavía sirven”.
3. **Prueba al gerente.** Screenshot: “12 personas confirmaron vigencia anoche en esta sucursal; 9 dijeron que en la otra ya no.” Eso vende el plan Pro.
4. **Marcas en vuelo 2.** Cuando haya 20+ sucursales con tráfico, se cotiza Johnnie / mezcal de casa / cerveza.

Métrica norte: **sesiones con GPS × promo abierta × sucursal vista**. No “likes”.

---

## 7. Producto (lo que ya existe vs lo que se vende después)

### Hoy (MVP)

- Home con geolocalización (fallback Centro CDMX).
- Promos vigentes, filtro por tipo.
- Detalle: sucursales + voto de vigencia.
- Capa **Nocturno** (botellas, cover, 2x1).
- Perfiles de cadena (Freemium / Pro / Premium + API de ejemplo).
- PWA instalable.

### 90 días (para cobrar)

- Login de cadena y alta de promos / sucursales.
- Base de datos (no mock).
- Moderación de reportes (anti-abuso).
- Panel: mapa de vigencia por local.
- Aviso 18+ y geocerca de alcohol.

### 12 meses

- Reservación / cover (take rate).
- Push: “tu 3x2 de mezcal caduca en 4 horas a 800 m”.
- Expansión MTY / GDL con el mismo playbook.

---

## 8. Riesgos (y cómo se contestan en una mesa)

| Riesgo | Respuesta |
|--------|-----------|
| “Los usuarios van a trollar la vigencia” | Umbral + cuenta + que la cadena pueda reafirmar oficial. El voto no borra el folio: lo matiza. |
| “Las cadenas no van a cargar sucursal por sucursal” | Excel / API / “aplicar a todas excepto…” En piloto lo cargamos nosotros. |
| “Alcohol, legal, 18+” | PWA con gate, copy 18+, no venta de alcohol: **información de promo**. Aviso de privacidad y términos desde el piloto. |
| “Google ya está” | Google no cobra ni opera vigencia de 2x1 por folio de sucursal. Ese es el hueco. |
| “¿Y si Lalo quería solo usuarios o solo empresas?” | El híbrido es la tesis: sin empresa no hay negocio B2B; sin usuario no hay verdad. Se valida en 4 semanas de piloto. |

---

## 9. La conversación de venta (60 segundos)

> Las cadenas ya pagan por decir “tenemos promo”. El cliente llega y en la mitad de las sucursales no es cierto. TraGo es la capa que responde *sí o no, aquí, ahora*, con GPS, y deja que la gente en piso confirme. Cobramos a la cadena por aparecer cerca y por no lucir sucursales muertas. Al usuario le damos la noche sin viaje en vano. Es PWA, se instala ya, y el piloto en CDMX se mide en pies en la puerta — no en likes.

---

## 10. Pedido (qué se necesita para el siguiente paso)

Para pasar de demo a **piloto cobrable**:

1. 8–12 cadenas ancla en CDMX (aunque sea 1 sucursal cada una).
2. Una persona de contenido / onboarding 4 semanas.
3. Auth + Postgres (el contenedor Docker ya levanta el front).
4. Decisión de precio Pro de lista ($2,900 vs $4,900) según si se vende por *cadena* o por *zona*.

**Cierre:** TraGo no pide que el mercado “descubra las salidas”. Pide que deje de mentir la distancia entre el anuncio y la caja.

---

*TraGo · Documento de tesis comercial · uso interno y presentaciones a socios*  
*Cifras de ingreso son escenarios de lista, no un forecast auditado.*
