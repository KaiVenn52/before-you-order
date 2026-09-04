from __future__ import annotations

import html
import json
import os
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "scripts" / "meal_image_manifest.json"
OUT_DIR = ROOT / "assets" / "meals"
CREDITS_JSON = ROOT / "src" / "data" / "imageCredits.json"
CONTACT_SHEET = ROOT / "artifacts" / "meal-image-contact-sheet.jpg"
USER_AGENT = "BeforeYouOrder/1.0 (food image curation; contact: project owner via expo.dev)"


def request_json(base: str, params: dict[str, str]) -> dict:
    url = base + "?" + urllib.parse.urlencode(params)
    for attempt in range(5):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("Request retry loop ended unexpectedly")


def chunks(items: list, size: int):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def article_images(meals: list[dict]) -> dict[str, tuple[str, dict]]:
    meal_files: dict[str, str] = {}
    for group in chunks(meals, 24):
        result = request_json(
            "https://en.wikipedia.org/w/api.php",
            {
                "action": "query", "format": "json", "redirects": "1",
                "prop": "pageimages", "piprop": "name",
                "titles": "|".join(meal["title"] for meal in group),
            },
        )
        transforms = {item["from"]: item["to"] for key in ("normalized", "redirects") for item in result["query"].get(key, [])}
        pages = {page.get("title"): page for page in result["query"]["pages"].values()}
        for meal in group:
            title = meal["title"]
            seen = set()
            while title in transforms and title not in seen:
                seen.add(title)
                title = transforms[title]
            page = pages.get(title)
            if page and page.get("pageimage"):
                meal_files[meal["id"]] = page["pageimage"]
        time.sleep(1)

    file_info: dict[str, dict] = {}
    filenames = sorted(set(meal_files.values()))
    for group in chunks(filenames, 24):
        result = request_json(
            "https://en.wikipedia.org/w/api.php",
            {
                "action": "query", "format": "json", "prop": "imageinfo",
                "iiprop": "url|mime|extmetadata", "iiurlwidth": "1200",
                "titles": "|".join("File:" + filename for filename in group),
            },
        )
        for page in result.get("query", {}).get("pages", {}).values():
            info = page.get("imageinfo", [None])[0]
            if info:
                file_info[page["title"].removeprefix("File:")] = info
        time.sleep(1)

    resolved = {}
    for meal_id, filename in meal_files.items():
        info = file_info.get(filename)
        if info:
            resolved[meal_id] = (info.get("thumburl") or info["url"], info)
    return resolved


def commons_image(query: str) -> tuple[str, dict]:
    # These two pages are well-known local Malaysian dishes, but Commons'
    # search endpoint intermittently omits them under the English menu names.
    # Pin the exact file pages so we never substitute a visually similar dish.
    known_images = {
        "Laksa Johor": (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Foon_Yew_Laksa.jpg/1280px-Foon_Yew_Laksa.jpg",
            "https://commons.wikimedia.org/wiki/File:Foon_Yew_Laksa.jpg",
        ),
        "Lei cha": (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Lei_cha_in_Johor%2CMalaysia.jpg/1280px-Lei_cha_in_Johor%2CMalaysia.jpg",
            "https://commons.wikimedia.org/wiki/File:Lei_cha_in_Johor,Malaysia.jpg",
        ),
        "Banana leaf rice": (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Banana_leaf_rice.jpg/1280px-Banana_leaf_rice.jpg",
            "https://commons.wikimedia.org/wiki/File:Banana_leaf_rice.jpg",
        ),
        "Chicken katsu": (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Chicken_katsu_curry.jpg/1280px-Chicken_katsu_curry.jpg",
            "https://commons.wikimedia.org/wiki/File:Chicken_katsu_curry.jpg",
        ),
        "Nasi minyak": (
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Set_Nasi_minyak.jpg?width=1280",
            "https://commons.wikimedia.org/wiki/File:Set_Nasi_minyak.jpg",
        ),
        "Fishball noodles": (
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fishball_Noodles.jpg?width=1280",
            "https://commons.wikimedia.org/wiki/File:Fishball_Noodles.jpg",
        ),
        "Katsudon": (
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Katsudon_001.jpg?width=1280",
            "https://commons.wikimedia.org/wiki/File:Katsudon_001.jpg",
        ),
        "Bún chả": (
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bun_cha.jpg?width=1280",
            "https://commons.wikimedia.org/wiki/File:Bun_cha.jpg",
        ),
    }
    if query in known_images:
        image_url, source_url = known_images[query]
        known_credit = {
            "Laksa Johor": ("Yong Hui Yin (JC Yong)", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
            "Lei cha": ("Encik Tekateki", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
            "Banana leaf rice": ("Misaochan", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
            "Chicken katsu": ("DraftSaturn15", "CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/deed.en"),
            "Nasi minyak": ("Azilaahmat", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
            "Fishball noodles": ("ProjectManhattan", "CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/deed.en"),
            "Katsudon": ("Ocdp", "CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/deed.en"),
            "Bún chả": ("tuhang", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
        }
        artist, license_name, license_url = known_credit.get(
            query,
            ("Wikimedia Commons contributor", "See source", "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia"),
        )
        return image_url, {
            "url": image_url,
            "descriptionurl": source_url,
            "extmetadata": {
                "Artist": {"value": artist},
                "LicenseShortName": {"value": license_name},
                "LicenseUrl": {"value": license_url},
            },
        }

    # A few Malaysian dishes are indexed under a local dish or venue name
    # rather than the English menu label. Keep these fallbacks explicit so a
    # generic search cannot silently pick an unrelated dish or a document.
    local_fallbacks = {
        "Laksa Johor": "Foon Yew Laksa",
        "Lei cha": "Lei cha in Johor,Malaysia",
    }
    search_terms = [query + " food dish", query]
    if query in local_fallbacks:
        search_terms.append(local_fallbacks[query])
    for search_term in search_terms:
        result = request_json(
            "https://commons.wikimedia.org/w/api.php",
            {
                "action": "query", "format": "json", "generator": "search",
                "gsrsearch": search_term, "gsrnamespace": "6", "gsrlimit": "10",
                "prop": "imageinfo", "iiprop": "url|mime|extmetadata", "iiurlwidth": "1200",
            },
        )
        pages = result.get("query", {}).get("pages", {})
        for page in pages.values():
            info = page.get("imageinfo", [None])[0]
            media_url = (info or {}).get("thumburl") or (info or {}).get("url") or ""
            media_type = (info or {}).get("mime", "")
            if info and (info.get("thumburl") or info.get("url")) and media_type.startswith("image/") and not media_url.lower().split("?", 1)[0].endswith((".pdf", ".djvu")):
                return info.get("thumburl") or info["url"], info
    raise RuntimeError(f"No Commons image found for {query}")


def clean_metadata(info: dict, meal: dict) -> dict:
    metadata = info.get("extmetadata", {})
    value = lambda key, fallback="": html.unescape(metadata.get(key, {}).get("value", fallback))
    return {
        "mealId": meal["id"],
        "sourceTitle": meal["title"],
        "artist": value("Artist", "Wikimedia contributor"),
        "license": value("LicenseShortName", "See source"),
        "licenseUrl": value("LicenseUrl"),
        "sourceUrl": info.get("descriptionurl") or info.get("descriptionshorturl") or info.get("url"),
    }


def download_and_fit(url: str, destination: Path) -> None:
    temporary = destination.with_suffix(".download")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response, temporary.open("wb") as output:
                output.write(response.read())
            break
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 3:
                raise
            time.sleep(10 * (attempt + 1))
    with Image.open(temporary) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image = ImageOps.fit(image, (900, 600), method=Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=80, method=6)
    temporary.unlink(missing_ok=True)


def make_contact_sheet(meals: list[dict]) -> None:
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    tile_width, tile_height = 300, 230
    columns = 4
    rows = (len(meals) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#fffaf0")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    for index, meal in enumerate(meals):
        image = Image.open(OUT_DIR / f"{meal['id']}.webp").convert("RGB")
        image.thumbnail((tile_width, 190), Image.Resampling.LANCZOS)
        x = (index % columns) * tile_width
        y = (index // columns) * tile_height
        sheet.paste(image, (x, y))
        draw.text((x + 8, y + 195), meal["title"], fill="#103f29", font=font)
    sheet.save(CONTACT_SHEET, "JPEG", quality=88, optimize=True)


def main() -> None:
    meals = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    existing_credits = {}
    if CREDITS_JSON.exists():
        existing_credits = {item["mealId"]: item for item in json.loads(CREDITS_JSON.read_text(encoding="utf-8"))}
    # Avoid re-querying Wikipedia for the many assets whose credits are
    # already pinned. This also keeps a small recovery run well below the
    # public API rate limit when only one or two images need replacing.
    needs_refresh = [
        meal for meal in meals
        if meal["id"] not in existing_credits
        or not (OUT_DIR / f"{meal['id']}.webp").exists()
    ]
    resolved = article_images([
        meal for meal in needs_refresh if meal["id"] not in {"laksa-johor", "lei-cha", "banana-leaf-rice", "chicken-katsu-curry"}
    ])
    credits = []
    failures = []
    for index, meal in enumerate(meals, start=1):
        destination = OUT_DIR / f"{meal['id']}.webp"
        try:
            if meal["id"] in existing_credits and destination.exists():
                credits.append(existing_credits[meal["id"]])
                print(f"[{index:02}/{len(meals)}] {meal['id']} (kept existing credit)")
                continue
            result = resolved.get(meal["id"]) or commons_image(meal["title"])
            url, info = result
            if destination.exists():
                destination.unlink()
            download_and_fit(url, destination)
            credits.append(clean_metadata(info, meal))
            print(f"[{index:02}/{len(meals)}] {meal['id']}")
        except Exception as error:  # continue so the failure list is actionable
            failures.append({"meal": meal, "error": str(error)})
            print(f"FAILED {meal['id']}: {error}")
        time.sleep(0.4)

    CREDITS_JSON.write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")
    if failures:
        raise SystemExit(json.dumps(failures, ensure_ascii=False, indent=2))
    make_contact_sheet(meals)
    print(f"Saved {len(credits)} images and {CONTACT_SHEET}")


if __name__ == "__main__":
    main()
