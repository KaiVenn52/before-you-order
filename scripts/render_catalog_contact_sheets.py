"""Render review sheets from the frozen ledger; never changes catalog/assets/decisions.

Requires Pillow. Run from any directory with: python scripts/render_catalog_contact_sheets.py
Sheets show original assets, including withheld photos, and label the current display decision.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def main():
    review = json.loads((ROOT / 'docs/V1.8_CATALOG_REVIEW.json').read_text(encoding='utf-8'))
    output = ROOT / 'artifacts/v1.8-acceptance-review'
    output.mkdir(parents=True, exist_ok=True)
    items = review['items']
    font = ImageFont.load_default(size=15)
    for offset in range(0, len(items), 12):
        sheet = Image.new('RGB', (1200, 840), 'white')
        draw = ImageDraw.Draw(sheet)
        for cell, item in enumerate(items[offset:offset + 12]):
            asset = ROOT / 'assets/meals' / (item['mealId'] + '.webp')
            if hashlib.sha256(asset.read_bytes()).hexdigest() != item['imageSha256']:
                raise ValueError(f"Image changed since review: {item['mealId']}")
            x, y = cell % 4 * 300, cell // 4 * 280
            with Image.open(asset) as original:
                thumb = ImageOps.contain(original.convert('RGB'), (290, 195))
            sheet.paste(thumb, (x + 5, y))
            draw.text((x + 4, y + 198), item['mealId'], font=font, fill='#123c2a')
            draw.text((x + 4, y + 219), ','.join(item['foodTypes']), font=font, fill='#123c2a')
            color = '#a34236' if item['display'] == 'withheld' else '#123c2a'
            draw.text((x + 4, y + 240), f"{offset + cell + 1}: {item['display']}", font=font, fill=color)
        sheet.save(output / f'sheet-{offset // 12 + 1:02}.jpg', quality=88)
    print(f'Rendered {len(items)} unchanged assets in {(len(items) + 11) // 12} sheets.')


if __name__ == '__main__':
    main()
