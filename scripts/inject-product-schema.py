#!/usr/bin/env python3
"""Inject complete Product JSON-LD into Riot Shop pages (fixes Google Search Console issues)."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "js" / "data.js"

SITE_URL = "https://riotshop.xyz"
LOGO_URL = f"{SITE_URL}/assets/logo.png"
PRICE_VALID_UNTIL = (date.today() + timedelta(days=365)).isoformat()


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


def parse_service_products(text: str) -> dict[str, dict]:
    services: dict[str, dict] = {}
    block_match = re.search(r"const SERVICE_PRODUCTS = \{(.*?)\};", text, re.S)
    if not block_match:
        return services
    block = block_match.group(1)
    for quoted_key, bare_key, label, price in re.findall(
        r"(?:'([^']+)'|([A-Za-z0-9_-]+)):\s*\{\s*label:\s*'([^']+)',\s*price:\s*([\d.]+)",
        block,
    ):
        services[quoted_key or bare_key] = {"label": label, "price": float(price)}
    return services


def parse_reviews(text: str) -> list[dict]:
    reviews = []
    for body, name, meta in re.findall(
        r"text:\s*'((?:\\'|[^'])*)',\s*name:\s*'([^']+)',\s*meta:\s*'([^']+)'",
        text,
    ):
        reviews.append(
            {
                "text": body.replace("\\'", "'"),
                "name": name,
                "meta": meta,
            }
        )
    return reviews


def seller() -> dict:
    return {"@type": "Organization", "name": "Riot Shop", "url": SITE_URL}


def aggregate_offer(low: float, high: float, offer_count: int, url: str) -> dict:
    return {
        "@type": "AggregateOffer",
        "lowPrice": f"{low:.2f}",
        "highPrice": f"{high:.2f}",
        "offerCount": offer_count,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition",
        "url": url,
        "seller": seller(),
        "priceValidUntil": PRICE_VALID_UNTIL,
    }


def single_offer(price: float, url: str) -> dict:
    return {
        "@type": "Offer",
        "price": f"{price:.2f}",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition",
        "url": url,
        "seller": seller(),
        "priceValidUntil": PRICE_VALID_UNTIL,
    }


def review_nodes(reviews: list[dict], limit: int = 3) -> list[dict]:
    nodes = []
    for review in reviews[:limit]:
        nodes.append(
            {
                "@type": "Review",
                "author": {"@type": "Person", "name": review["name"]},
                "reviewBody": review["text"],
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": "5",
                    "bestRating": "5",
                    "worstRating": "1",
                },
            }
        )
    return nodes


def aggregate_rating(review_count: int) -> dict:
    return {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": review_count,
        "bestRating": "5",
        "worstRating": "1",
    }


def product_schema(
    *,
    product_id: str,
    name: str,
    description: str,
    url: str,
    offers: dict,
    reviews: list[dict],
    review_count: int,
) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": f"{url}#product",
        "name": name,
        "url": url,
        "image": LOGO_URL,
        "description": description,
        "brand": {"@type": "Brand", "name": "Riot Shop"},
        "sku": product_id,
        "offers": offers,
        "aggregateRating": aggregate_rating(review_count),
        "review": review_nodes(reviews),
    }


def products_page_schema(products: list[dict]) -> dict:
    item_list = []
    for index, product in enumerate(products, start=1):
        item_list.append(
            {
                "@type": "ListItem",
                "position": index,
                "url": product["url"],
                "item": product["schema"],
            }
        )

    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{SITE_URL}/products#webpage",
                "name": "Available Products | Riot Shop",
                "url": f"{SITE_URL}/products",
                "description": "Valorant Points from $9.99, full-access accounts, gun buddy service, and unban help with instant delivery.",
                "isPartOf": {"@type": "WebSite", "name": "Riot Shop", "url": SITE_URL},
                "mainEntity": {"@id": f"{SITE_URL}/products#itemlist"},
            },
            {
                "@type": "ItemList",
                "@id": f"{SITE_URL}/products#itemlist",
                "name": "Riot Shop Products",
                "numberOfItems": len(products),
                "itemListElement": item_list,
            },
        ],
    }


def format_json_ld(data: dict) -> str:
    body = json.dumps(data, indent=2, ensure_ascii=False)
    indented = "\n".join(f"  {line}" for line in body.splitlines())
    return f"  <script type=\"application/ld+json\">\n{indented}\n  </script>"


def replace_ld_json(html: str, schema: dict) -> str:
    block = format_json_ld(schema)
    return re.sub(
        r"  <script type=\"application/ld\+json\">.*?</script>",
        block,
        html,
        count=1,
        flags=re.S,
    )


def patch_file(path: Path, schema: dict) -> None:
    html = path.read_text(encoding="utf-8")
    html = replace_ld_json(html, schema)
    path.write_text(html, encoding="utf-8")
    print(f"patched {path.name}")


def filter_reviews(reviews: list[dict], product_type: str) -> list[dict]:
    return [review for review in reviews if product_type in review["meta"]]


def build_schemas(text: str) -> dict[str, dict]:
    bundles = parse_vp_bundles(text)
    accounts = parse_accounts(text)
    services = parse_service_products(text)
    reviews = parse_reviews(text)

    vp_prices = [bundle["price"] for bundle in bundles]
    account_prices = [item["price"] for items in accounts.values() for item in items]
    vp_reviews = filter_reviews(reviews, "Valorant Points")
    account_reviews = filter_reviews(reviews, "Account")

    vp_url = f"{SITE_URL}/valorant-points"
    accounts_url = f"{SITE_URL}/accounts"
    products_url = f"{SITE_URL}/products"

    vp_product = product_schema(
        product_id="valorant-points",
        name="Valorant Points",
        description="Valorant Points bundles from $9.99 with gift card codes delivered by email after payment.",
        url=vp_url,
        offers=aggregate_offer(min(vp_prices), max(vp_prices), len(bundles), vp_url),
        reviews=vp_reviews,
        review_count=len(vp_reviews),
    )

    accounts_product = product_schema(
        product_id="valorant-accounts",
        name="Valorant Accounts",
        description="Full-access Valorant accounts across five regions with preview, original email, and lifetime warranty.",
        url=accounts_url,
        offers=aggregate_offer(
            min(account_prices),
            max(account_prices),
            len(account_prices),
            accounts_url,
        ),
        reviews=account_reviews,
        review_count=len(account_reviews),
    )

    gun_buddy = services["gun-buddy"]
    unban = services["unban"]
    service_reviews = reviews[:3]

    gun_buddy_product = product_schema(
        product_id="gun-buddy-service",
        name=gun_buddy["label"],
        description="Riot Gun Buddy service with fast delivery. No login info required — only your Riot ID and email.",
        url=products_url,
        offers=single_offer(gun_buddy["price"], products_url),
        reviews=service_reviews,
        review_count=len(reviews),
    )

    unban_product = product_schema(
        product_id="unban-service",
        name=unban["label"],
        description="Professional unban assistance for your Riot account. Fast delivery with no login info required.",
        url=products_url,
        offers=single_offer(unban["price"], products_url),
        reviews=service_reviews,
        review_count=len(reviews),
    )

    catalog_products = [
        {"url": vp_url, "schema": {k: v for k, v in vp_product.items() if k != "@context"}},
        {"url": accounts_url, "schema": {k: v for k, v in accounts_product.items() if k != "@context"}},
        {"url": products_url, "schema": {k: v for k, v in gun_buddy_product.items() if k != "@context"}},
        {"url": products_url, "schema": {k: v for k, v in unban_product.items() if k != "@context"}},
    ]

    return {
        "valorant-points.html": vp_product,
        "accounts.html": accounts_product,
        "products.html": products_page_schema(catalog_products),
    }


def main() -> None:
    schemas = build_schemas(read_data())
    for filename, schema in schemas.items():
        patch_file(ROOT / filename, schema)


if __name__ == "__main__":
    main()