from __future__ import annotations

import json
import os
import hashlib
import time

from fetch_wikimedia_meal_images import (
    CREDITS_JSON, MANIFEST, OUT_DIR, clean_metadata, download_and_fit, make_contact_sheet, request_json,
)

# Manually selected after reviewing the full 64-image contact sheet. Exact Commons
# filenames keep the image, meal, license, and attribution tied together.
CURATED_FILES = {
    "roti-canai": "Malaysian Roti Canai.jpg",
    "idli-sambar": "Idli with sambar and chutney 05.jpg",
    "mushroom-soup": "Bowl of Cream of Mushroom Soup.JPG",
    "lasagna": "Lasagna 02.jpg",
    "gyudon": "Gyudon from Marugame Udon (2025-01-12).jpg",
    "teriyaki-chicken": "Teriyaki Chicken Rice Bowl from Botejyu (2024-12-21).jpg",
    "eggs-benedict": "Eggs Benedict (6933880370).jpg",
    "pancakes": "Pancakes at Commander's Palace restaurant, New Orleans.jpg",
    "waffles": "Waffles on Maple Counter.jpg",
    "roast-chicken": "Roasted Chicken Dinner Plate, Broccoli, Stuffing, Potatoes, Demi Glace.jpg",
    "chicken-pie": "Chicken Pot Pie, cut open.jpg",
    "hummus-pita": "Pita bread and Hummus.jpg",
    "lamb-mandi": "Mandi Lamb Shank, Lepak @ Sultan, 62 Bussorah St, Singapore (01).jpg",
    "pad-see-ew": "Pad See Ew ผัดซีอิ๊ว- rice noodles cooked in a wok with chicken, chinese broccoli, egg, black soy sauce.jpg",
    "khao-soi": "Khao Soi Northern Thai food ข้าวซอย ผักดอง.jpg",
    "rawon": "Rawon Setan.jpg",
    "com-tam": "Cơm Tấm, Da Nang, Vietnam.jpg",
    "sate-ayam-indonesia": "Sate Ayam Al-Huda Jember.jpg",
    "roti-telur": "Traditional roti telur (egg flatbread).jpg",
    "rava-thosai": "Rava Dosa with Coconut Chutney.jpg",
    "fish-head-curry": "Kari Kepala Ikan Merah.jpg",
    "palak-paneer": "Palak Paneer curry on plate.jpg",
    "loh-mee": "Penang loh mee Uncle Eddies Perth 2022-02.jpg",
    "dry-bak-kut-teh": "Dry bah kut teh.jpg",
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
    "lontong": "Lontong Sayur.jpg",
    "bubur-lambuk": "Buburlambuk.jpg",
    "curry-mee": "Curry Mee in Malaysia.jpg",
    "char-siu-rice": "Char Siu & Fried Egg with Rice.jpg",
    "siu-yuk-rice": "Crispy Roasted Pork Belly with Rice.jpg",
    "pecel-lele": "Pecel Lele 1.JPG",
    "ayam-bakar-indonesia": "Set menu Ayam Bakar Tempe Tahu.jpg",
    "penang-hokkien-mee": "Penang-style Hokkien mee.jpg",
    "ipoh-hor-fun": "Ipoh Hor Fun, Yinzo Kopi, Ipoh, Malaysia.jpg",
    "bulgogi": "Bulgogi cooked.jpg",
    "budae-jjigae": "Korean stew-Budae jjigae-01.jpg",
    "oyakodon": "Oyakodon 003.jpg",
    "tempura-set": "Ebinoya Tempura set meal.jpg",
    "okonomiyaki": "Okonomiyaki 001.jpg",
    "omurice": "Omurice 1.jpg",
    "thai-red-curry": "Thai Red Curry with Rice.jpg",
    "tom-yum-noodles": "Tom Yum Goong Noodle Soup - Nok Nok Kitchen at The Cow 2024-03-28.jpg",
    "bo-kho": "Bo Kho.jpg",
    "chicken-shawarma": "Chicken Shawarma Wrap - Lavash 2024-09-11.jpg",
    "shish-kebab": "Lamb shish kebab - Ankara.jpg",
    "sweet-sour-pork": "Sweet and Sour Pork - RV90 - 22 August 2024.jpg",
    "salted-egg-chicken": "Salted Egg Chicken from BOK Korean Fried Chicken in Talamban (2026-07-19).jpg",
    "butter-prawns": "Butter Prawns Batu Ferringhi.JPG",
    "vegetarian-thali": "Vegetarian Thali 2.jpg",
    "rasam": "Rasam Soup.JPG",
    "nasi-hujan-panas": "Nasi hujan panas.jpg",
    "rendang-tok": "Rendang Tok & Ketupat Palas.jpg",
    "daging-masak-hitam": "Daging Masak Hitam.jpg",
    "roti-jala-curry": "ROTI JALA & CHICKEN CURRY.jpg",
    "nasi-ulam": "Nasi Ulam bersama Daging Bakar.jpg",
    "nyonya-laksa": "Nyonya Laksa.jpg",
    "nyonya-otak-otak": "Nyonya Otak-Otak.jpg",
    "kolo-mee": "Kolo Mee khas Sarawak, Malaysia.jpg",
    "umai": "Umei.JPG",
    "wat-tan-hor": "Fish and Fried Hor Fun Noodles in Egg Sauce and Hongkong-style Milk Tea - Pacific BBQ Cafe AUD9.50 lunch (3517240179).jpg",
    "sambal-sotong": "Sotong sambal.jpg",
    "fish-head-noodles": "Fish Head Noodle in Malaysia.jpg",
    "claypot-tofu": "IndonesianFood SapoTauhu.JPG",
    "mutton-biryani": "Mutton biryani.JPG",
    "mutton-curry": "South Indian style Mutton gravy.JPG",
    "sambal-petai-prawns": "Sambal udang dan petai.jpg",
    "ayam-geprek": "Ayam Geprek Uyat.jpg",
    "laksa-johor": "Johor laksa.JPG",
    "lei-cha": "Kenny's Mum's 擂茶饭 Lei Cha Rice (1576303537).jpg",
    "hakka-mee": "Hakka Mee, Ipoh, Malaysia.JPG",
    "kampar-curry-chicken-bread": "Kampar curry chicken bread.JPG",
    "ngiu-chap": "Ngiu Chap.jpg",
    "tomato-crispy-mee": "Tomato mee.jpg",
    "thai-chicken-rice": "2013 Khao man kai Chiang Mai.jpg",
    "ikan-patin-tempoyak": "Tempoyak Ikan Patin 1.JPG",
    "kam-heong-lala": "Kam Heong Lala.jpg",
    "vietnamese-chicken-rice": "Cơm gà Tam Kỳ, Quảng Nam.JPG",
    "beef-shawarma": "Beef Shawarma.jpg",
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
    review_path = MANIFEST.parents[1] / "docs" / "V1.8_CATALOG_REVIEW.json"
    review = json.loads(review_path.read_text(encoding="utf-8"))
    reviewed = {item["mealId"]: item for item in review["items"]}
    requested = {item.strip() for item in os.environ.get("MEAL_IDS", "").split(",") if item.strip()}
    selected = [(meal_id, filename) for meal_id, filename in CURATED_FILES.items() if not requested or meal_id in requested]
    for index, (meal_id, filename) in enumerate(selected, start=1):
        url, info = exact_file(filename)
        download_and_fit(url, OUT_DIR / f"{meal_id}.webp")
        credits[meal_id] = clean_metadata(info, by_id[meal_id])
        image_bytes = (OUT_DIR / f"{meal_id}.webp").read_bytes()
        reviewed[meal_id]["imageSha256"] = hashlib.sha256(image_bytes).hexdigest()
        reviewed[meal_id]["display"] = "photo"
        reviewed[meal_id]["imageDecision"] = f"Curated exact-dish Wikimedia file: {filename}"
        CREDITS_JSON.write_text(json.dumps([credits[item["id"]] for item in meals], ensure_ascii=False, indent=2), encoding="utf-8")
        review_path.write_text(json.dumps(review, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"[{index:02}/{len(selected)}] {meal_id} <- {filename}", flush=True)
        time.sleep(1.5)
    make_contact_sheet(meals)


if __name__ == "__main__":
    main()
