#!/usr/bin/env python3
"""Generates a static, pre-rendered page per card at c/<slug>/index.html
so link previews (WhatsApp, iMessage, etc.) show the right image/title.
Run this after any change to data.json, then redeploy.
"""
import json
import os
import re
import html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://catalogodecartasgraduadas.com.br"

with open(os.path.join(ROOT, "data.json"), encoding="utf-8") as f:
    data = json.load(f)

with open(os.path.join(ROOT, "card.html"), encoding="utf-8") as f:
    template = f.read()


def slug_for(it):
    return it["cert"] if it.get("cert") else "p" + str(it["id"])


def esc(s):
    return html.escape(str(s), quote=True)


out_dir = os.path.join(ROOT, "c")
os.makedirs(out_dir, exist_ok=True)

count = 0
for it in data["itens"]:
    slug = slug_for(it)
    price = ("US$ " + format(it["usd"], ",.2f")) if it.get("usd") is not None else "Price on request"
    desc = it["det"] + " — " + it["grade"] + " — " + price
    image_url = DOMAIN + "/" + it["img_l"]
    page_url = DOMAIN + "/c/" + slug

    og_tags = (
        '<meta property="og:title" content="' + esc(it["nome"]) + ' — Graded Collection">\n'
        '<meta property="og:description" content="' + esc(desc) + '">\n'
        '<meta property="og:type" content="website">\n'
        '<meta property="og:url" content="' + esc(page_url) + '">\n'
        '<meta property="og:image" content="' + esc(image_url) + '">\n'
        '<meta property="og:image:width" content="760">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        '<meta name="twitter:title" content="' + esc(it["nome"]) + ' — Graded Collection">\n'
        '<meta name="twitter:description" content="' + esc(desc) + '">\n'
        '<meta name="twitter:image" content="' + esc(image_url) + '">\n'
        '<link rel="canonical" href="' + esc(page_url) + '">\n'
    )

    page = template
    page = page.replace(
        "<title>Card &mdash; Graded Collection</title>",
        "<title>" + esc(it["nome"]) + " — Graded Collection</title>\n" + og_tags
    )
    # data-preload lets card.js skip re-fetching/guessing and render instantly
    page = page.replace(
        '<div id="detailRoot" class="detail-wrap">',
        '<div id="detailRoot" class="detail-wrap" data-slug="' + esc(slug) + '">'
    )

    card_dir = os.path.join(out_dir, slug)
    os.makedirs(card_dir, exist_ok=True)
    with open(os.path.join(card_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)
    count += 1

print("Generated", count, "card pages in /c/<slug>/index.html")
