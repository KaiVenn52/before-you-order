from __future__ import annotations

import json
import os
import time

from fetch_wikimedia_meal_images import (
    CREDITS_JSON, MANIFEST, OUT_DIR, clean_metadata, download_and_fit, make_contact_sheet, request_json,
)

# Manually selected after reviewing the full 64-image contact sheet. Exact Commons
# filenames keep the image, meal, license, and attribution tied together.
CURATED_FILES = {
    "nasi-lemak": "Nasi Lemak dengan Chili Nasi Lemak dan Sotong Pedas, di Penang Summer Restaurant.jpg",
    "beef-rendang": "Rendang daging sapi asli Padang.JPG",
    "nasi-kerabu": "Nasi kerabu.jpg",
    "nasi-dagang": "Mak ngah nasi dagang.jpg",
    "mee-rebus": "Mee Rebus by Banej, Singapore October 2017.jpg",
    "chicken-rice": "Hainanese chicken rice.jpg",
    "claypot-chicken-rice": "Claypot Chicken Rice, Singapore.JPG",
    "hokkien-mee": "KL hokkien mee.jpg",
    "yong-tau-foo": "Malaysian Yong Tau Foo.jpg",
    "dim-sum": "DFC 3931 A close-up of a cluster of steamed wontons with yellow wrappers arranged on a woven bamboo tray.jpg",
    "nasi-kandar": "Nasi kandar - 02.jpg",
    "chapati-dhal": "Methi bhaji in moog dal chapati salad.jpg",
    "naan": "Naan bread (3170160310).jpg",
    "chicken-chop": "Chicken chop,a unique dish of Malaysia.jpg",
    "grilled-chicken": "Liat Portal for Foodie Disorder - Homemade Grilled Chicken Dinner.jpg",
    "club-sandwich": "Club-sandwich.jpg",
    "sushi-set": "Sushi platter, Nikko, Japan.jpg",
    "korean-fried-chicken": "Korean fried chicken 240206.jpg",
    "kimchi-jjigae": "Korean.cuisine-Kimchi jjigae-01.jpg",
    "thai-green-curry": "Thai Green Curry with Rice.jpg",
    "pineapple-fried-rice": "Thai-style Fried Rice in Pineapple.jpg",
    "som-tam": "Som Tam green papaya salad, Bangkok, Thailand.jpg",
    "caprese-salad": "Insalata caprese.jpg",
    "greek-salad": "Greek Salad Choriatiki.jpg",
    "falafel-bowl": "Tasty Buddha Bowl with Falafel - Dyke Road Park Cafe 2025-05-09.jpg",
    "tempeh-bowl": "Sautéed Tempeh cropped.jpg",
    "vadai": "Vadai&Sambar.jpg",
    "japanese-curry": "Kare-Raisu.jpg",
    "fresh-spring-rolls": "Fresh vegan spring rolls 8286724426 o.jpg",
    "roast-duck-rice": "Roast duck rice in Singapore.jpg",
    "ayam-penyet": "Ayam penyet 2026.jpg",
}


def exact_file(filename: str):
    result = request_json(
        "https://commons.wikimedia.org/w/api.php",
        {
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "url|extmetadata", "iiurlwidth": "1200", "titles": "File:" + filename,
        },
    )
    page = next(iter(result.get("query", {}).get("pages", {}).values()))
    info = page.get("imageinfo", [None])[0]
    if not info:
        raise RuntimeError(f"Commons file not found: {filename}")
    return info.get("thumburl") or info["url"], info


def main():
    meals = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_id = {meal["id"]: meal for meal in meals}
    credits = {item["mealId"]: item for item in json.loads(CREDITS_JSON.read_text(encoding="utf-8"))}
    requested = {item.strip() for item in os.environ.get("MEAL_IDS", "").split(",") if item.strip()}
    selected = [(meal_id, filename) for meal_id, filename in CURATED_FILES.items() if not requested or meal_id in requested]
    for index, (meal_id, filename) in enumerate(selected, start=1):
        url, info = exact_file(filename)
        download_and_fit(url, OUT_DIR / f"{meal_id}.webp")
        credits[meal_id] = clean_metadata(info, by_id[meal_id])
        CREDITS_JSON.write_text(json.dumps([credits[item["id"]] for item in meals], ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[{index:02}/{len(selected)}] {meal_id} <- {filename}", flush=True)
        time.sleep(1.5)
    make_contact_sheet(meals)


if __name__ == "__main__":
    main()
