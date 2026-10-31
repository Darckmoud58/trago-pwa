#!/usr/bin/env python3
"""Genera el Word del modelo de negocio de TraGo, listo para compartir."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

OUT = Path(__file__).resolve().parent / "TraGo-Modelo-de-Negocio.docx"

INK = RGBColor(0x1A, 0x18, 0x14)
MUTED = RGBColor(0x5C, 0x5A, 0x54)
COPPER = RGBColor(0xB8, 0x6B, 0x2A)
LEAF = RGBColor(0x1C, 0x3D, 0x34)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)


def mxn(n: int) -> str:
    return "$" + f"{n:,}".replace(",", ",")


def set_run(run, *, size=11, bold=False, color=INK, font="Calibri", italic=False):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def shade(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def set_cell_border(cell):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "D4C8B0")
        tcBorders.append(el)
    tcPr.append(tcBorders)


def cell_text(cell, text, *, size=9, bold=False, color=INK, fill=None, center=False):
    if fill:
        shade(cell, fill)
    set_cell_border(cell)
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=color)


def add_footer(section):
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run("TraGo  ·  Modelo de negocio  ·  Cifras ilustrativas, no un forecast  ·  Octubre 2026")
    set_run(r, size=8, color=MUTED, italic=True)

    p2 = footer.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r2 = p2.add_run("Pág. ")
    set_run(r2, size=8, color=MUTED)
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "end")
    r3 = p2.add_run()
    r3._r.append(fld1)
    r3._r.append(instr)
    r3._r.append(fld2)
    set_run(r3, size=8, color=MUTED)


def hbar(doc, color="1C3D34"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(8)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "12")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def heading(doc, text, n=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16 if n == 1 else 11)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    if n == 1:
        set_run(run, size=18, bold=True, color=LEAF)
        hbar(doc, "B86B2A")
    else:
        set_run(run, size=13, bold=True, color=COPPER)
    return p


def para(doc, text, *, size=11, italic=False, bold=False, color=INK, space=8):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, italic=italic, color=color)
    return p


def bullet(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Cm(0.6)
    run = p.add_run("•  " + text)
    set_run(run, size=11)
    return p


def table(doc, headers, rows, col_widths=None, size=8):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = True
    for i, h in enumerate(headers):
        cell_text(t.rows[0].cells[i], h, size=size, bold=True, color=WHITE, fill="1C3D34", center=True)
    for r_i, row in enumerate(rows):
        fill = "F7F3EA" if r_i % 2 == 0 else "FFFFFF"
        for c_i, val in enumerate(row):
            cell_text(t.rows[r_i + 1].cells[c_i], str(val), size=size, fill=fill)
    if col_widths:
        for row in t.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return t


def landscape(doc):
    section = doc.add_section(WD_ORIENT.LANDSCAPE)
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width = Cm(29.7)
    section.page_height = Cm(21.0)
    section.top_margin = Cm(1.6)
    section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(1.6)
    section.right_margin = Cm(1.6)
    add_footer(section)
    return section


CONSERVADOR = {
    "registrados": [8, 14, 20, 26, 30, 34, 38, 42, 46, 50, 54, 58],
    "pagadores": [0, 0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 8],
    "suscripcion": [0, 0, 0, 790, 1580, 1580, 2370, 3160, 3950, 4740, 5530, 6320],
    "campanas": [0] * 12,
    "costos": [10000] * 12,
}
MODERADO = {
    "registrados": [6, 12, 20, 28, 36, 44, 52, 60, 68, 74, 78, 80],
    "pagadores": [0, 1, 2, 3, 5, 7, 9, 11, 13, 15, 16, 18],
    "suscripcion": [0, 790, 1580, 2370, 7060, 8640, 10220, 14910, 16490, 21180, 21970, 26660],
    "campanas": [0, 0, 0, 0, 0, 2500, 2500, 5000, 5000, 8000, 10000, 12000],
    "costos": [12000, 12000, 12000, 18000, 18000, 22000, 22000, 22000, 26000, 28000, 30000, 30000],
}
OPTIMISTA = {
    "registrados": [12, 24, 40, 55, 70, 85, 100, 115, 130, 145, 155, 170],
    "pagadores": [2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 45],
    "suscripcion": [1580, 6270, 9430, 15700, 21970, 28240, 34510, 40780, 47050, 53320, 59590, 66650],
    "campanas": [0, 0, 0, 0, 8000, 18000, 18000, 25000, 18000, 36000, 25000, 40000],
    "costos": [22000, 22000, 26000, 51000, 51000, 51000, 55000, 55000, 68000, 68000, 68000, 68000],
}


def filas_mes(esc: dict) -> list[list[str]]:
    filas = []
    for i in range(12):
        ingreso = esc["suscripcion"][i] + esc["campanas"][i]
        costo = esc["costos"][i]
        filas.append(
            [
                f"M{i + 1}",
                str(esc["registrados"][i]),
                str(esc["pagadores"][i]),
                mxn(esc["suscripcion"][i]),
                mxn(esc["campanas"][i]),
                mxn(ingreso),
                mxn(costo),
                mxn(ingreso - costo),
            ]
        )
    ingreso_a = sum(esc["suscripcion"]) + sum(esc["campanas"])
    costo_a = sum(esc["costos"])
    filas.append(
        [
            "Año",
            str(esc["registrados"][-1]),
            str(esc["pagadores"][-1]),
            mxn(sum(esc["suscripcion"])),
            mxn(sum(esc["campanas"])),
            mxn(ingreso_a),
            mxn(costo_a),
            mxn(ingreso_a - costo_a),
        ]
    )
    return filas


MESES_HEADERS = [
    "Mes",
    "Registrados",
    "De pago",
    "Suscripción",
    "Campañas",
    "Ingreso",
    "Costo de caja",
    "Resultado",
]


def cover(doc):
    for _ in range(2):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("TRAGO")
    set_run(r, size=46, bold=True, color=LEAF)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Modelo de negocio")
    set_run(r, size=22, color=COPPER)

    hbar(doc, "B86B2A")

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Certeza local: qué promo sigue vigente, en cuál sucursal, a cuántos metros.")
    set_run(r, size=13, italic=True, color=LEAF)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Documento para socios y equipo  ·  Piloto Guadalajara  ·  Octubre 2026")
    set_run(r, size=11, color=MUTED)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Precios de lista más IVA. Las proyecciones son escenarios ilustrativos, no datos de mercado.")
    set_run(r, size=10, italic=True, color=MUTED)

    doc.add_page_break()


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(1.8)
    section.right_margin = Cm(1.8)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    add_footer(section)
    cover(doc)

    heading(doc, "Recomendación")
    para(
        doc,
        "TraGo no debe venderse como cuponero de restaurantes, cafeterías y tiendas. El modelo que puede cobrar es más estrecho: certeza de que la promo oficial sigue vigente en esa sucursal, a cuántos metros.",
        size=12,
        color=LEAF,
    )
    para(
        doc,
        "El usuario no paga. Cobra el negocio, con una suscripción, y aparte un presupuesto por impulsar una sola promo. Gratis existe para cargar oferta. Pro Local, a $790 más IVA al mes, es el primer producto de pago. Pro Zona, a $3,900 más IVA, es para una cadena de una ciudad. Premium, API, puntos, reservaciones y comisión por venta se posponen.",
    )
    para(
        doc,
        "Un vendedor de nómina antes de unos $50,000 de ingreso recurrente mensual apaga el año 1. La caja del piloto cabe en $150,000 a $250,000 MXN si vende el fundador y no se abre otra ciudad.",
        bold=True,
    )

    heading(doc, "1. Propuesta de valor")
    heading(doc, "Usuario, 18 años o más", 2)
    para(
        doc,
        "Saber si el 2x1, la botella o el six siguen vigentes en esa sucursal antes de pagar el viaje. Consulta condiciones, puede guardar la promo y, en el piso, confirmar o negar. La promesa es no moverse de balde. Los perfiles son el cazador de promo, el grupo que sale y el comprador de destilado.",
    )
    heading(doc, "Cadena, local y marca", 2)
    para(
        doc,
        "Publicar la promo solo donde aplica, dejar de anunciar sucursales muertas y ver dónde la gente confirma vigencia. La visibilidad se compra cuando hay intención con GPS. No se garantiza la venta. Alcohol es información de promo, con gate de 18 años. TraGo no vende alcohol.",
    )
    heading(doc, "Dónde no compite", 2)
    table(
        doc,
        ["Alternativa", "Qué resuelve", "Hueco de TraGo"],
        [
            ["Instagram y TikTok", "Alcance y novedad", "El post sigue vivo cuando la sucursal ya no participa"],
            ["Google y Maps", "Dónde está el local", "No opera la vigencia de una promo por sucursal"],
            ["Rappi y el delivery", "Que me lo traigan", "La pregunta aquí es voy o no voy"],
            ["Groupon y cuponeras", "Descuento genérico", "Sin oficialidad por sucursal ni corrección de piso"],
            ["Club de lealtad", "Descuento dentro de su app", "No compara cava, antro y tienda en el mismo radio"],
            ["Grupos de Facebook", "Chisme de promos", "Sin fuente oficial, sin mapa y sin medición"],
        ],
        [4.2, 4.5, 8.3],
    )
    para(doc, "La cuña es oficial, local y vivo. Quien no puede decir en qué sucursales aplica no es cliente.", bold=True, color=COPPER)

    heading(doc, "2. Monetización")
    para(
        doc,
        "El dinero entra por quien necesita llenar esa sucursal esta noche. Son dos compras distintas, para no regalar el lugar destacado dentro de la mensualidad.",
    )
    heading(doc, "A. Impulso de una promo", 2)
    para(
        doc,
        "Se paga por una publicación, con fecha de fin y presupuesto. Sube en el feed de un radio y un horario. Sirve para un jueves de botella o un 3x2 que caduca. Se reportan impresiones, aperturas, guardados y sucursal vista. Los canjes solo se reportan si más adelante hay un código en caja. Mínimo $1,500 más IVA por 7 días. Es campaña, no suscripción.",
    )
    heading(doc, "B. Posición del establecimiento", 2)
    para(
        doc,
        "Se paga porque el local o la cadena sigan presentes: perfil sin anuncios ajenos, varias sucursales, destacada cerca y reporte de vigencia. No empuja una sola foto. En la primera etapa esto es el plan Pro, no un segundo anuncio suelto. Venderlo aparte canibaliza la mensualidad.",
    )
    heading(doc, "C. Planes", 2)
    para(
        doc,
        "No conviene un plan Básico intermedio. Un peldaño barato con casi todo lo de Pro enseña que la certeza es barata y aplasta el ingreso recurrente. Se venden dos planes. Premium se pospone.",
    )
    table(
        doc,
        ["Plan", "Precio + IVA", "Incluye", "Se cobra aparte", "Cuándo"],
        [
            ["Gratis", "$0", "1 sucursal, 2 promos, votos, pauta ajena etiquetada", "Destacada, reportes, quitar anuncios", "Ahora, con cupo"],
            ["Pro Local", "$790 / mes", "3 sucursales, 8 promos, sin pauta ajena, destacada, panel", "Impulso, push, creativos, carga masiva", "Primer producto de pago"],
            ["Pro Zona", "$3,900 / mes", "15 sucursales, 1 ciudad, 40 promos, reporte semanal, 1 CSV", "Segunda ciudad, API, gerente", "Cuando haya una cadena"],
            ["Premium", "$14,900 / mes", "Varias ciudades, export, API de lectura", "White-label e integración", "Posponer"],
        ],
    )
    heading(doc, "D. Otras fuentes", 2)
    table(
        doc,
        ["Fuente", "Veredicto", "Motivo"],
        [
            ["Impulso de una promo", "Sí, desde el día 60", "Se entiende, se cotiza y no exige canje"],
            ["Suscripción Pro", "Sí. Es el motor", "Ingreso recurrente y fácil de explicar en una visita"],
            ["Pauta de marca", "Después, mes 6 o más", "Hace falta inventario con tráfico y cuidado de 18+"],
            ["Temporadas", "Después, como impulso", "Mismo producto, otro calendario"],
            ["Cobro por resultado", "No prometerlo", "Hoy no hay venta atribuible"],
            ["Puntos y fidelización", "No", "Cupones y canjes no tienen pantalla ni API"],
            ["Comisión por venta o reserva", "No en alcohol", "TraGo no cierra la caja"],
            ["AdSense", "No", "Políticas duras con alcohol y diluye la promesa"],
        ],
    )

    heading(doc, "3. Segmentos, en orden de cobro")
    table(
        doc,
        ["Segmento", "Orden", "Por qué pagaría", "Qué se puede medir"],
        [
            ["Licorería y cava", "1", "Botella cara y 3x2 que no está en todas las tiendas", "Sucursal vista y voto de vigencia"],
            ["Antro, cantina, bar", "1", "Cover y botella cambian entre jueves y sábado", "Apertura en horario nocturno, no el cover cobrado"],
            ["Conveniencia regional", "1, ciclo largo", "Promo nacional que no pega en todas las tiendas", "Solo con CSV o API"],
            ["Marca de cerveza o destilado", "2", "Trade spend sin prueba de esa sucursal", "Señal de piso, no sell-out"],
            ["Restaurante o cafetería", "Fuera del núcleo", "Su dolor es reserva y menú", "Solo un happy hour de alcohol, si ya está en el corredor"],
            ["Comida rápida, retail, entretenimiento", "Posponer", "Empuja a TraGo hacia un directorio", "Casi ninguna venta atribuible"],
        ],
    )
    para(
        doc,
        "El criterio es la frecuencia de la promo, el ticket que duele perder, la capacidad de pagar $790 sin un comité, y si el gerente puede ver un resultado en una semana. El piloto se ancla en Guadalajara, aunque una presentación comercial hable de CDMX.",
    )

    heading(doc, "4. Estrategia comercial")
    para(
        doc,
        "La oferta entra antes que la audiencia. Diez locales con promos reales en un corredor valen más que mil usuarios mirando un catálogo vacío. En las primeras cuatro semanas TraGo carga las promos.",
    )
    table(
        doc,
        ["Momento", "Qué se hace", "Argumento"],
        [
            ["Primeros 10", "Visita en Providencia, Chapultepec, Centro o Zapopan. 30 días con funciones Pro", "Te cargamos la promo. Si nadie la abre, no pagas"],
            ["Independiente", "Una sucursal y una promo de esta semana", "Tu vecino puede salir destacado. Tú decides si tu 2x1 sigue público"],
            ["Cadena", "Excel de sucursales. Mostrar un local confirmado y otro en duda", "Dejas de pagar alcance donde la promo ya murió"],
            ["Día 31", "Se apagan destacada y promos de más. Queda el límite Gratis", "La prueba termina. Pro Local se cobra por adelantado"],
            ["Retención", "Reporte semanal. Aviso si una sucursal pasa a en duda", "Cancelar es volver a anunciar sucursales muertas"],
        ],
    )
    para(
        doc,
        "No hay descuento eterno. Si a los 30 días no hay ni una sucursal vista, no se insiste con precio: se da de baja la promo. La anualidad con dos meses de descuento solo se ofrece después de tres meses pagados, para no adelantar caja que luego hay que devolver.",
    )

    heading(doc, "5. Precios de lista")
    para(
        doc,
        "La suscripción es renta mensual. El impulso es un presupuesto que se acaba. Mezclarlos en un solo paquete esconde el costo del lugar destacado. Precios más IVA.",
    )
    table(
        doc,
        ["Producto", "Precio", "Cobro", "Para quién", "Qué sí se puede decir"],
        [
            ["Gratis", "$0", "Sin contrato", "Prueba y cantina de un local", "Ficha oficial. No ventas"],
            ["Pro Local", "$790", "Mensual por adelantado", "Licorería o cantina", "Presencia cuando hay GPS"],
            ["Pro Zona", "$3,900", "Mensual por adelantado", "Grupo de antros o cava", "Ver qué sucursal sigue viva"],
            ["Impulso 7 días", "$1,500 a $4,000", "Presupuesto, no mensualidad", "Quien ya tiene promo real", "Más aperturas de esa oferta"],
            ["Vuelo de marca", "$18,000 a $40,000", "14 días", "Cerveza o destilado", "Señal de piso, no sell-out"],
            ["Carga CSV extra", "$2,500", "Una vez", "Cadena de más de 15 sucursales", "Alta en días, no en meses"],
        ],
    )
    para(doc, "Costo que TraGo no debe regalar", bold=True)
    bullet(doc, "Gratis consume moderación, soporte y almacenamiento. No incluye destacada ni reportes.")
    bullet(doc, "Pro Local ocupa un lugar del ranking. Ese lugar es el inventario que se vende.")
    bullet(doc, "Pro Zona consume horas de onboarding y soporte prioritario.")
    bullet(doc, "El impulso desplaza una promo orgánica. Hay que topar el cupo: una patrocinada por cada ocho orgánicas, siempre etiquetada.")
    bullet(doc, "La carga masiva, los creativos, el push y un gerente de cuenta se cobran aparte.")
    para(
        doc,
        "Antes de fijar el precio definitivo hay que probar $790 contra $1,490 en los primeros diez locales. Si nadie paga $790, bajar el precio no arregla una promo que no se abre. Si una cadena pide un contrato nacional, eso es Premium y no se cotiza en el piloto. Los precios del pitch anterior ($2,900 a $6,900 el Pro) sirven para una cadena por zona, no para la primera cantina.",
    )

    heading(doc, "6. Operación")
    table(
        doc,
        ["Paso", "Qué pasa", "En el piloto"],
        [
            ["1. Registro", "El negocio crea cuenta", "Autoservicio. La visita la cierra una persona"],
            ["2. Perfil y sucursales", "Nombre, horario y sucursales donde aplica", "Manual si pasan de 3. CSV solo en Pro Zona"],
            ["3. Promo", "Fechas, tipo, términos y sucursales. Si no se lee, no se publica", "La redacta TraGo las primeras 4 semanas"],
            ["4. Modo de salida", "Orgánica, impulso de esa promo, o plan del local", "Nadie patrocina sin promo vigente"],
            ["5. Presupuesto", "Días, radio, horario y tope", "Manual. Sin segmentación fina"],
            ["6. Entrega", "Usuarios de 18+ con GPS ven vigentes cerca", "Automático. Si el GPS falla, se avisa"],
            ["7. Uso", "Abren, guardan, ven sucursal. En piso votan", "Voto con límites. La apelación es manual"],
            ["8. Cierre", "El negocio ve el panel y decide renovar", "Factura CFDI manual los primeros 20"],
        ],
    )
    para(
        doc,
        "Ya se puede automatizar el gate de edad, el listado por GPS, el vínculo promo-sucursal, el voto con distancia y la métrica norte. Sigue manual el alta de los primeros 15, la moderación de abuso, la cobranza y cualquier excepción de alcohol.",
    )

    heading(doc, "7. Métricas")
    para(
        doc,
        "Una impresión no es una visita, y una sucursal vista no es una venta. Al negocio se le enseña intención cerca de la puerta. El retorno publicitario solo se habla cuando exista un código cobrado en caja. Ese flujo no está construido.",
    )
    table(
        doc,
        ["Indicador", "Qué demuestra", "Qué no demuestra"],
        [
            ["Impresiones", "La promo se mostró", "Interés ni asistencia"],
            ["Apertura", "Alguien leyó condiciones", "Que vaya al local"],
            ["Guardados", "Intención de usarla después", "Canje"],
            ["Sucursal vista", "Eligió un local. Parte de la métrica norte", "Que entró"],
            ["Votos de vigencia", "Verdad de piso", "Satisfacción ni ticket"],
            ["Costo por sucursal vista", "Precio de la intención", "Costo por venta"],
            ["MRR", "Suscripciones vivas", "Caja cobrada, si hay mora"],
            ["Gratis a pago", "Si la prueba convence", "Que el precio sea el correcto"],
            ["CAC y LTV", "Costo de un pagador contra meses que se queda", "El año 1 será corto y ruidoso"],
            ["Cancelación", "Bajas del mes entre pagadores iniciales", "El motivo: hay que preguntarlo"],
            ["ROAS", "Ingreso atribuible entre pauta", "No usarlo todavía"],
        ],
    )
    para(
        doc,
        "Meta de piloto, no promesa de venta: 8 sucursales vistas por promo por semana en el corredor. Debajo de eso, no se cobra el segundo mes. La métrica norte es sesión con GPS, promo abierta y sucursal vista.",
        bold=True,
    )

    heading(doc, "8. Business Model Canvas")
    table(
        doc,
        ["Bloque", "Contenido"],
        [
            ["Segmentos", "Paga licorería, antro o cantina, conveniencia regional y, después, la marca. Usa quien sale y tiene 18 años o más. Fuera: menores, y cadenas que no nombran sucursales."],
            ["Propuesta de valor", "Promo oficial por sucursal, GPS y voto de piso. Al usuario, certeza. Al negocio, dejar de anunciar locales donde la promo ya no aplica."],
            ["Canales", "PWA instalable, sin tienda de apps al inicio. Venta directa en un corredor de Guadalajara."],
            ["Relación", "Concierge 30 días. Luego autoservicio en Gratis y Pro Local. Reporte semanal en Pro Zona. Sin feed social."],
            ["Ingresos", "Mensualidad de Pro Local y Pro Zona. Presupuesto de impulso. Más adelante, vuelo de marca. El usuario paga $0."],
            ["Recursos clave", "Catálogo oficial, sucursales geocodificadas, panel de vigencia, gate de edad y una persona que carga y cobra. No hay inventario de alcohol."],
            ["Actividades clave", "Conseguir promos reales, moderar votos, mostrar solo vigentes cerca, cobrar y cortar destacadas vencidas."],
            ["Socios clave", "Primeras cadenas ancla, términos y aviso de 18+, facturación CFDI y mapas. No una red de afiliados."],
            ["Costos", "Infra, mapas, moderación nocturna, tiempo del fundador, CFDI, IVA y onboarding. El costo oculto es el lugar destacado: si se regala, no queda nada que vender."],
        ],
        [4.2, 12.8],
        size=9,
    )

    heading(doc, "9. Proyección a 12 meses")
    para(
        doc,
        "Tres escenarios de caja para un piloto en Guadalajara. No son históricos ni un estudio de mercado. El costo no incluye sueldo de fundador ni IVA por pagar. La pasarela, cerca del 4%, empeora un poco cada caso y no está restada.",
    )
    para(doc, "Cómo se arman", bold=True)
    bullet(doc, "Conservador. Solo Pro Local a $790. Cero campañas. Costo fijo de $10,000 al mes: tecnología, marketing mínimo y operación. Vende el fundador.")
    bullet(doc, "Moderado. Al mes 12 hay 14 Pro Local y 4 Pro Zona. Impulsos chicos desde el mes 6. El costo sube de $12,000 a $30,000. Sigue sin nómina.")
    bullet(doc, "Optimista. 35 Pro Local y 10 Pro Zona, más vuelos de marca. Desde el mes 4 entra un comercial de medio tiempo, cerca de $18,000. Sin esas campañas, este caso también pierde.")
    para(
        doc,
        "El supuesto más frágil es el porcentaje que paga. Al cierre es 14%, 23% y 26%. Si la conversión real es 5%, ninguno de los tres se acerca al equilibrio. No se usó el promedio de $4,000 del pitch anterior: ese número asume cadenas, no el primer local.",
    )

    table(
        doc,
        ["Escenario", "Pagadores mes 12", "MRR mes 12", "Ingreso del año", "Costo del año", "Caja del año", "Colchón"],
        [
            ["Conservador", "8", "$6,320", "$30,020", "$120,000", "−$89,980", "$150,000"],
            ["Moderado", "18", "$26,660", "$176,870", "$252,000", "−$75,130", "$180,000"],
            ["Optimista", "45", "$66,650", "$573,090", "$605,000", "−$31,910", "$250,000"],
        ],
    )
    para(
        doc,
        "En el moderado el mes se acerca al equilibrio en el mes 10 ($29,180 de ingreso contra $28,000 de costo) y el año sigue en rojo. El colchón de $180,000 cubre ese hueco y un margen de factura. No hace falta una ronda grande. La publicidad de alcohol en redes se rechaza con frecuencia: no contar con ella para traer usuarios.",
        italic=True,
        color=MUTED,
    )

    heading(doc, "10. Riesgos y pruebas baratas")
    table(
        doc,
        ["Riesgo", "Prueba", "Se detiene si"],
        [
            ["Pocos de los dos lados", "10 locales en un corredor, cargados a mano, antes de más código", "A las 4 semanas hay menos de 5 promos vivas"],
            ["Promos flojas", "Solo se publica lo que el gerente confirma", "Nadie actualiza la promo en 14 días"],
            ["No quieren pagar", "$790 contra $1,490, cobro al día 31", "Menos de 3 de 10 pagan sin descuento"],
            ["Instagram y Maps", "Preguntar si el post de hace 12 días sigue vigente en dos sucursales", "El gerente no distingue sucursal muerta de sucursal viva"],
            ["Fraude de votos", "Usar el voto con distancia que ya existe. No abrir canjes", "Más del 5% de votos se banea en una semana"],
            ["Ficha vieja", "Caducidad obligatoria y ocultar sucursal en duda", "Una promo vencida sigue visible"],
            ["Piden ventas garantizadas", "Vender sucursal vista, por escrito", "El cliente solo firma si hay ventas garantizadas"],
            ["El CAC se come el ingreso", "Venta a pie, sin pauta, 90 días", "Un pagador cuesta más de 3 meses de su plan"],
        ],
    )

    heading(doc, "11. Primeros 90 días")
    table(
        doc,
        ["Días", "Se hace", "No se construye", "Hipótesis"],
        [
            ["1 a 30", "8 a 10 fichas reales en un corredor de Guadalajara. Medir GPS, apertura y sucursal vista", "Cobros, canjes, puntos, reservas, app nativa", "Al menos el 40% publica una promo que alguien abre"],
            ["31 a 60", "Corte a Gratis. Oferta Pro Local. Un impulso de fin de semana a $1,500. Factura manual", "Pro Zona, salvo que una cadena traiga el Excel. Pauta de marca", "3 de 10 pagan. 8 sucursales vistas por promo por semana"],
            ["61 a 90", "Decisión de seguir. Si hay cadena, cotizar Pro Zona y una carga CSV", "Premium, API, comisión, otra ciudad", "Un gerente cambia o baja una promo por los votos de piso"],
        ],
    )
    heading(doc, "Liquidez sin romper la experiencia", 2)
    para(
        doc,
        "Se cobra al negocio, nunca al usuario. Como máximo una promo patrocinada por cada ocho orgánicas, con la etiqueta Patrocinado. El plan Gratis tiene límites de verdad: dos promos y una sucursal. Quitar el límite sin cobrar enseña que Pro no hace falta. No hay intersticiales, ni venta de datos, ni banners genéricos.",
    )
    heading(doc, "Antes de escalar", 2)
    bullet(doc, "Hay promos que la gente abre.")
    bullet(doc, "Hay sucursales vistas en el corredor.")
    bullet(doc, "Al menos tres de diez negocios pagan $790 sin regateo eterno.")
    bullet(doc, "El usuario vuelve la semana siguiente.")
    bullet(doc, "El abuso de votos se contiene.")
    bullet(doc, "Un gerente actúa por la verdad de piso.")
    para(
        doc,
        "Si falla la disposición de pago o el gerente no actúa, el problema no es de funciones. No conviene abrir otra ciudad.",
        bold=True,
        color=LEAF,
    )

    landscape(doc)
    heading(doc, "Anexo. Proyección mensual")
    para(
        doc,
        "Pesos mexicanos. Ingreso = suscripción del mes + campañas del mes. Costo = tecnología, marketing, operación y ventas en efectivo. La fila Año suma los doce meses. Registrados y de pago, en esa fila, son el cierre del mes 12, no una suma.",
        size=10,
        color=MUTED,
    )

    heading(doc, "Conservador", 2)
    para(doc, "8 pagadores al cierre, todos Pro Local. Sin campañas. Costo de $10,000 al mes.", size=10)
    table(doc, MESES_HEADERS, filas_mes(CONSERVADOR), size=9)

    heading(doc, "Moderado", 2)
    para(doc, "18 pagadores al cierre: 14 Pro Local y 4 Pro Zona. Campañas desde el mes 6. Sin nómina.", size=10)
    table(doc, MESES_HEADERS, filas_mes(MODERADO), size=9)

    heading(doc, "Optimista", 2)
    para(doc, "45 pagadores al cierre: 35 Pro Local y 10 Pro Zona, más vuelos de marca. Comercial de medio tiempo desde el mes 4.", size=10)
    table(doc, MESES_HEADERS, filas_mes(OPTIMISTA), size=9)

    para(
        doc,
        "TraGo  ·  Modelo de negocio para compartir  ·  Octubre 2026. Cifras de escenario, no un forecast auditado.",
        size=9,
        italic=True,
        color=MUTED,
    )

    core = doc.core_properties
    core.title = "TraGo — Modelo de negocio"
    core.subject = "Piloto Guadalajara, octubre 2026"
    core.category = "Documento comercial"
    core.comments = "Cifras ilustrativas. No es un forecast de mercado."

    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
