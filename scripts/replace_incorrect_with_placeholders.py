from __future__ import annotations

import json

from fetch_wikimedia_meal_images import CREDITS_JSON, MANIFEST, OUT_DIR, make_contact_sheet, make_placeholder

# Visual review rejects these files because the depicted subject is clearly not
# the named dish (documents, signs, ingredients, another meal, or blank media).
REJECTED_IDS = {
    "cantonese-fried-noodles", "loh-mee", "mee-sua-soup", "dry-bak-kut-teh", "marmite-chicken",
    "kolo-mee", "umai", "mee-sapi", "dabai-fried-rice",
    "roti-canai", "idli-sambar", "roti-telur", "roti-bawang", "roti-bom", "fish-head-curry", "palak-paneer",
    "tempeh-bowl", "rawon", "sate-ayam-indonesia", "indonesian-martabak",
    "gyudon", "teriyaki-chicken",
    "nyonya-chap-chye", "jiu-hu-char", "nyonya-laksa", "nyonya-otak-otak", "nyonya-nasi-ulam",
    "pad-see-ew", "moo-ping", "khao-soi", "com-tam",
    "mushroom-soup", "lasagna", "eggs-benedict", "pancakes", "waffles", "roast-chicken", "chicken-pie",
    "lamb-mandi", "hummus-pita",
    "nasi-tomato", "nasi-hujan-panas", "nasi-kukus", "rendang-tok", "daging-masak-hitam", "roti-jala-curry", "nasi-ulam",
}


def main() -> None:
    meals = json.loads(MANIFEST.read_text(encoding="utf-8"))
    credits = {item["mealId"]: item for item in json.loads(CREDITS_JSON.read_text(encoding="utf-8"))}
    for meal in meals:
        if meal["id"] in REJECTED_IDS:
            credits[meal["id"]] = make_placeholder(OUT_DIR / f"{meal['id']}.webp", meal)
    CREDITS_JSON.write_text(json.dumps([credits[meal["id"]] for meal in meals], ensure_ascii=False, indent=2), encoding="utf-8")
    make_contact_sheet(meals)
    print(f"Replaced {len(REJECTED_IDS)} visually rejected images with neutral placeholders.")


if __name__ == "__main__":
    main()
