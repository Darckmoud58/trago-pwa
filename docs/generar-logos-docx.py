#!/usr/bin/env python3
"""Word de propuestas de logo TraGo (oferta + comida + bebida)."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = Path(__file__).resolve().parent
OUT = HERE / "TraGo-Propuestas-Logo.docx"
LOGOS = HERE / "logos"

INK = RGBColor(0x1A, 0x18, 0x14)
MUTED = RGBColor(0x5C, 0x5A, 0x54)
COPPER = RGBColor(0xB8, 0x6B, 0x2A)
LEAF = RGBColor(0x1C, 0x3D, 0x34)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)


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


def cell_text(cell, text, *, size=10, bold=False, color=INK, fill=None, center=False):
    if fill:
        shade(cell, fill)
    set_cell_border(cell)
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=color)


def add_footer(section):
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run("TraGo  ·  Propuestas de logo  ·  Septiembre 2026  ·  Uso interno")
    set_run(r, size=8, color=MUTED, italic=True)


def hbar(doc, color="1C3D34"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(10)
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
    p.paragraph_format.space_before = Pt(14 if n == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    if n == 1:
        set_run(run, size=18, bold=True, color=LEAF, font="Calibri")
        hbar(doc, "B86B2A")
    else:
        set_run(run, size=14, bold=True, color=COPPER, font="Calibri")
    return p


def para(doc, text, *, size=11, italic=False, bold=False, color=INK, space=8, center=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(space)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, italic=italic, color=color)
    return p


def bullet(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Cm(0.7)
    run = p.add_run("•  " + text)
    set_run(run, size=11, color=INK)


def add_image_centered(doc, path: Path, width_cm=7.2):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run()
    run.add_picture(str(path), width=Cm(width_cm))


def cover(doc):
    for _ in range(2):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("TRAGO")
    set_run(r, size=44, bold=True, color=LEAF, font="Calibri")

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Tres propuestas de logo")
    set_run(r, size=22, color=COPPER, font="Calibri")

    hbar(doc, "B86B2A")

    para(
        doc,
        "Ofertas  ·  Comida  ·  Bebidas",
        size=14,
        color=LEAF,
        center=True,
    )
    para(
        doc,
        "PWA de promociones vigentes por sucursal y GPS  ·  Guadalajara  ·  18+",
        size=11,
        italic=True,
        color=MUTED,
        center=True,
    )
    para(
        doc,
        "Septiembre 2026  ·  Documento para pasar ideas a socios",
        size=10,
        color=MUTED,
        center=True,
    )
    doc.add_page_break()


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    add_footer(section)

    cover(doc)

    heading(doc, "El brief")
    para(
        doc,
        "TraGo no es solo alcohol ni solo restaurante: es la promo que sí está viva, cerca de ti. El logo tiene que leerse en el celular (icono PWA) y contar tres cosas en un vistazo: hay oferta, hay comida y hay bebida.",
    )
    para(doc, "Paleta de marca", bold=True, space=4)
    t = doc.add_table(rows=2, cols=4)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    labels = [
        ("Verde bosque", "08110E", "08110e"),
        ("Cobre", "D4894A", "D4894A"),
        ("Oro", "E4C27A", "E4C27A"),
        ("Espuma", "E8F0E4", "E8F0E4"),
    ]
    for i, (name, hex_code, fill) in enumerate(labels):
        cell_text(t.rows[0].cells[i], " ", fill=fill, center=True)
        cell_text(t.rows[1].cells[i], f"{name}\n#{hex_code}", size=8, center=True, fill="F7F3EA")
    doc.add_paragraph()

    heading(doc, "A — Pin combo  (recomendada para la PWA)")
    add_image_centered(doc, LOGOS / "A-pin-combo.png", 8.4)
    para(
        doc,
        "Un pin de mapa (cerca de ti / GPS) con plato + copa adentro y un sello de % de oferta. Es la más completa: ubicación, comida, trago y descuento.",
    )
    bullet(doc, "Se lee a 48 px en el celular.")
    bullet(doc, "Sigue la idea de geolocalización que ya vende TraGo.")
    bullet(doc, "No se queda solo en “bar” ni solo en “fonda”.")
    para(doc, "Cuándo usarla: icono de app, splash, favicon, sticker de sucursal.", italic=True, color=MUTED)

    heading(doc, "B — Monograma T")
    add_image_centered(doc, LOGOS / "B-monograma.png", 8.4)
    para(
        doc,
        "La letra T se funde con copa y tenedor. El círculo dorado con % es la oferta. Más “marca” y menos “mapa”.",
    )
    bullet(doc, "Fuerte para papelería, pitch y playera.")
    bullet(doc, "Elegante; un poco más abstracta en el icono chico.")
    para(doc, "Cuándo usarla: documento comercial, firma, redes.", italic=True, color=MUTED)

    heading(doc, "C — Sello / corcholata")
    add_image_centered(doc, LOGOS / "C-sello.png", 8.4)
    para(
        doc,
        "Tenedor y copa cruzados dentro de un sello tipo corcholata o lacre. Se siente bar + fonda, con un toque nocturno.",
    )
    bullet(doc, "Muy reconocible en mesa y en botella.")
    bullet(doc, "Pesa más a la noche que al desayuno o al café.")
    para(doc, "Cuándo usarla: Nocturno, merch, sello de “promo viva”.", italic=True, color=MUTED)

    heading(doc, "Comparativo rápido")
    table = doc.add_table(rows=4, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["", "A Pin combo", "B Monograma", "C Sello"]
    rows = [
        ["Oferta", "Sello % claro", "Círculo %", "Borde de sello"],
        ["Comida + bebida", "Plato y copa", "Tenedor + copa en la T", "Tenedor y copa cruzados"],
        ["Mejor uso", "Icono PWA / GPS", "Marca / pitch", "Noche / merch"],
    ]
    for i, h in enumerate(headers):
        cell_text(table.rows[0].cells[i], h, size=9, bold=True, color=WHITE, fill="1C3D34", center=True)
    for r_i, row in enumerate(rows):
        fill = "F7F3EA" if r_i % 2 == 0 else "FFFFFF"
        for c_i, val in enumerate(row):
            cell_text(table.rows[r_i + 1].cells[c_i], val, size=9, fill=fill, bold=c_i == 0)
    doc.add_paragraph()

    heading(doc, "Recomendación")
    para(
        doc,
        "Para el icono de la PWA nos quedamos con A. Cuenta la historia completa (ubicación, trago, comida, descuento) sin llenarse. B y C pueden vivir como variantes: B en el Word comercial y C en la capa Nocturno.",
        color=LEAF,
        size=12,
    )
    para(
        doc,
        "Siguiente paso: elegir una (o un combo A+B) y la pasamos a SVG 192 / 512 para instalar TraGo.",
        italic=True,
        color=MUTED,
    )

    doc.save(OUT)
    print(f"OK {OUT}")


if __name__ == "__main__":
    build()
