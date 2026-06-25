#!/usr/bin/env python3
"""Inject crawlable static HTML into Riot Shop pages for non-JS crawlers (Bing, etc.)."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "js" / "data.js"

NAV = [
    ("/", "Home", "home"),
    ("/products", "Available Products", "products"),
    ("/reviews", "Reviews", "reviews"),
    ("/faq", "FAQ", "faq"),
    ("/reach-us", "Reach Us", "reach"),
]


def read_data() -> str:
    return DATA_JS.read_text(encoding="utf-8")


def parse_vp_bundles(text: str) -> list[dict]:
    bundles = []
    for match in re.finditer(
        r"\{ amount: '([^']+)', price: ([\d.]+), key: '([^']+)'(?:, badge: '([^']+)')? \}",
        text,
    ):
        bundles.append(
            {
                "amount": match.group(1),
                "price": float(match.group(2)),
                "key": match.group(3),
                "badge": match.group(4),
            }
        )
    return bundles


def parse_accounts(text: str) -> dict[str, list[dict]]:
    accounts: dict[str, list[dict]] = {}
    current = None
    for line in text.splitlines():
        region_match = re.match(r"\s+'?([^':]+?)'?: \[", line)
        if region_match and region_match.group(1).strip() in {
            "North America",
            "Europe",
            "Latin America",
            "Asia/Pacific",
            "Korea",
        }:
            current = region_match.group(1).strip()
            accounts[current] = []
            continue
        item_match = re.match(r"\s+\{ name: '([^']+)', price: ([\d.]+), link: '([^']+)' \},?", line)
        if current and item_match:
            accounts[current].append(
                {
                    "name": item_match.group(1),
                    "price": float(item_match.group(2)),
                    "link": item_match.group(3),
                }
            )
    return accounts


def parse_faq(text: str) -> list[dict]:
    items = []
    for match in re.finditer(r"q: '([^']+)',\s*a: '([^']+)'", text):
        items.append({"q": match.group(1), "a": match.group(2)})
    return items


def parse_reviews(text: str) -> list[dict]:
    reviews = []
    blocks = re.findall(
        r"\{\s*text: '((?:\\'|[^'])*)',\s*name: '([^']+)',\s*meta: '([^']+)',\s*\}",
        text,
    )
    for body, name, meta in blocks:
        reviews.append(
            {
                "text": body.replace("\\'", "'"),
                "name": name,
                "meta": meta,
            }
        )
    return reviews


def header(active: str = "") -> str:
    links = []
    for href, label, page_id in NAV:
        current = ' aria-current="page"' if active == page_id else ""
        links.append(f'<a href="{href}"{current}>{label}</a>')
    return (
        '<header class="site-header">\n'
        '  <div class="header-wrap">\n'
        '    <div class="header-pill">\n'
        f'      <nav class="header-nav" aria-label="Main navigation">{"".join(links)}</nav>\n'
        "    </div>\n"
        "  </div>\n"
        "</header>"
    )


def footer() -> str:
    return """<footer class="site-footer">
  <div class="footer-links-row">
    <a href="/products" class="footer-link">Available Products</a>
    <a href="/reviews" class="footer-link">Reviews</a>
    <a href="/faq" class="footer-link">FAQ</a>
    <a href="/reach-us" class="footer-link">Reach Us</a>
  </div>
  <div class="footer-copy">
    <p>Riot Shop © 2026</p>
    <p>Not affiliated with Riot Games. VALORANT is a trademark of Riot Games, Inc.</p>
  </div>
</footer>"""


def products_grid() -> str:
    cards = [
        (
            "/valorant-points",
            "Valorant Points",
            "From $9.99",
            "Valorant Points bundles delivered as a gift card code to your email.",
        ),
        (
            "/accounts",
            "Valorant Accounts",
            "From $19.99",
            "Full access accounts with original email and lifetime warranty.",
        ),
        (
            "/products",
            "Riot Gun Buddy Service",
            "$49.99",
            "Gun buddy service with fast delivery and no login info required.",
        ),
        (
            "/products",
            "Unban Service",
            "$99.99",
            "Professional unban assistance for your Riot account.",
        ),
    ]
    parts = []
    for href, title, price, desc in cards:
        parts.append(
            f"""<article class="catalog-card glass-card">
  <h2 class="catalog-title">{title}</h2>
  <p class="catalog-price">{price}</p>
  <p class="catalog-desc">{desc}</p>
  <p><a href="{href}">View {title}</a></p>
</article>"""
        )
    return "\n".join(parts)


def vp_grid(bundles: list[dict]) -> str:
    parts = []
    for bundle in bundles:
        badge = f'<p><strong>{bundle["badge"]}</strong></p>' if bundle.get("badge") else ""
        parts.append(
            f"""<article class="glass-card product-card">
  {badge}
  <h2>{bundle["amount"]}</h2>
  <p>Delivered via gift card to your email</p>
  <p class="product-price">${bundle["price"]:.2f}</p>
</article>"""
        )
    return "\n".join(parts)


def accounts_panel(accounts: dict[str, list[dict]]) -> str:
    parts = []
    for region, items in accounts.items():
        parts.append(f'<section class="seo-account-region"><h2>Valorant Accounts — {region}</h2><ul>')
        for item in items:
            parts.append(
                f'<li><strong>{item["name"]}</strong> — ${item["price"]:.2f} — '
                f'<a href="{item["link"]}" rel="noopener">Preview account</a></li>'
            )
        parts.append("</ul></section>")
    return "\n".join(parts)


def faq_list(items: list[dict]) -> str:
    parts = []
    for item in items:
        parts.append(
            f"""<article class="glass-card faq-item">
  <h2>{item["q"]}</h2>
  <p>{item["a"]}</p>
</article>"""
        )
    return "\n".join(parts)


def reviews_grid(reviews: list[dict], limit: int = 12) -> str:
    parts = []
    for review in reviews[:limit]:
        parts.append(
            f"""<article class="glass-card review-card">
  <p>{review["text"]}</p>
  <p><strong>{review["name"]}</strong> — {review["meta"]}</p>
</article>"""
        )
    return "\n".join(parts)


def home_extras() -> str:
    return """<section class="section-block">
  <div class="max-w-5xl mx-auto px-4 sm:px-6">
    <h2>Why shoppers choose Riot Shop</h2>
    <ul>
      <li>5,000+ completed orders</li>
      <li>4.9 average buyer rating</li>
      <li>Instant email delivery after payment</li>
      <li>Valorant Points, accounts, gun buddy, and unban services</li>
    </ul>
    <p><a href="/products">Browse all products</a> · <a href="/reviews">Read reviews</a> · <a href="/faq">FAQ</a></p>
  </div>
</section>"""


def replace_div(html: str, div_id: str, content: str) -> str:
    start_match = re.search(rf"<div[^>]*\bid=\"{re.escape(div_id)}\"[^>]*>", html)
    if not start_match:
        raise RuntimeError(f"Could not find div #{div_id}")

    start = start_match.start()
    pos = start_match.end()
    depth = 1
    end = None
    while pos < len(html) and depth:
        next_open = html.find("<div", pos)
        next_close = html.find("</div>", pos)
        if next_close == -1:
            raise RuntimeError(f"Unclosed div #{div_id}")
        if next_open != -1 and next_open < next_close:
            depth += 1
            pos = next_open + 4
            continue
        depth -= 1
        pos = next_close + 6
        if depth == 0:
            end = pos

    if end is None:
        raise RuntimeError(f"Could not close div #{div_id}")

    opening = html[start_match.start() : start_match.end()]
    return html[:start] + opening + "\n" + content + "\n</div>" + html[end:]


def patch_file(path: Path, replacements: dict[str, str]) -> None:
    html = path.read_text(encoding="utf-8")
    for div_id, content in replacements.items():
        html = replace_div(html, div_id, content)
    path.write_text(html, encoding="utf-8")
    print(f"patched {path.name}")


def main() -> None:
    text = read_data()
    bundles = parse_vp_bundles(text)
    accounts = parse_accounts(text)
    faq_items = parse_faq(text)
    reviews = parse_reviews(text)

    common = {
        "site-header": header(),
        "site-footer": footer(),
    }

    patch_file(ROOT / "index.html", {
        **common,
        "site-header": header("home"),
        "hero-stats": (
            '<section aria-label="Store stats"><p>5,000+ orders completed · 4.9 average rating · '
            "98% on-time delivery · 5 regions available</p></section>"
        ),
        "home-products": products_grid(),
        "process-steps": (
            '<section aria-label="How it works"><h2>How checkout works</h2>'
            "<ol><li>Choose a product</li><li>Complete secure checkout</li>"
            "<li>Receive delivery by email</li></ol></section>"
        ),
        "trust-signals": home_extras(),
    })

    patch_file(ROOT / "accounts.html", {
        **common,
        "site-header": header("accounts"),
        "accounts-panel": accounts_panel(accounts),
    })

    patch_file(ROOT / "valorant-points.html", {
        **common,
        "site-header": header("vp"),
        "vp-grid": vp_grid(bundles),
    })

    patch_file(ROOT / "products.html", {
        **common,
        "site-header": header("products"),
        "products-grid": products_grid(),
    })

    patch_file(ROOT / "faq.html", {
        **common,
        "site-header": header("faq"),
        "faq-list": faq_list(faq_items),
        "page-cta": '<p><a href="/reach-us">Reach us</a> if you have more questions.</p>',
    })

    patch_file(ROOT / "reviews.html", {
        **common,
        "site-header": header("reviews"),
        "reviews-grid": reviews_grid(reviews),
        "page-cta": '<p><a href="/products">View available products</a></p>',
    })

    patch_file(ROOT / "reach-us.html", {
        **common,
        "site-header": header("reach"),
    })

    schema_script = ROOT / "scripts" / "inject-product-schema.py"
    subprocess.run([sys.executable, str(schema_script)], check=True)


if __name__ == "__main__":
    main()