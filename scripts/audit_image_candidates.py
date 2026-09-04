from __future__ import annotations

import time
import sys

from fetch_wikimedia_meal_images import request_json

QUERIES = {
    "chicken-rice": "Hainanese chicken rice Malaysia",
    "hokkien-mee": "Kuala Lumpur Hokkien mee noodles",
    "yong-tau-foo": "Yong tau foo Malaysia",
    "nasi-kandar": "Nasi kandar Malaysia",
    "chapati-dhal": "Chapati dal curry",
    "chicken-chop": "Malaysian chicken chop",
    "grilled-chicken": "Grilled chicken plate",
    "club-sandwich": "Club sandwich",
    "sushi-set": "Sushi platter",
    "korean-fried-chicken": "Korean fried chicken",
    "kimchi-jjigae": "Kimchi jjigae",
    "thai-green-curry": "Thai green curry",
    "pineapple-fried-rice": "Pineapple fried rice",
    "som-tam": "Som tam green papaya salad",
    "caprese-salad": "Caprese salad",
    "greek-salad": "Greek salad",
    "falafel-bowl": "Falafel bowl",
    "tempeh-bowl": "Tempeh rice bowl",
}


sys.stdout.reconfigure(encoding="utf-8")

for meal_id, query in QUERIES.items():
    result = request_json(
        "https://commons.wikimedia.org/w/api.php",
        {
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": query, "gsrnamespace": "6", "gsrlimit": "6",
            "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": "1200",
        },
    )
    pages = sorted(result.get("query", {}).get("pages", {}).values(), key=lambda page: page.get("index", 999))
    print(f"\n## {meal_id} — {query}")
    for page in pages:
        print(page.get("title"))
    time.sleep(1.5)
