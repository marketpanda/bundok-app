"""Fetch selected Commons photos and retain creator/license/source metadata."""
import html
import json
import re
import urllib.parse
import urllib.request
import time
from urllib.error import HTTPError
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELECTIONS = [
    ("ulap-gungal", "Gungal Rock Formation.jpg", "Gungal Rock on the Mount Ulap Eco-Trail, Benguet"),
    ("pulag", "Mount Pulag.jpg", "Grassland slopes of Mount Pulag"),
    ("apo", "Mount Apo.JPG", "Mount Apo seen from Lake Venado"),
    ("pinatubo", "Pinatubo crater lake, Luzon, Philippines (10226103744).jpg", "Mount Pinatubo crater lake"),
    ("daraitan", "Daraitan.jpg", "View of the landscape surrounding Mount Daraitan"),
    ("batulao", "Batulao Circa 2015.jpg", "One of the peaks of Mount Batulao"),
    ("guiting-guiting", "Guiting-guiting 1.jpg", "The jagged peaks of Mount Guiting-Guiting"),
    ("zambales-view", "Zambales mountains.jpg", "Zambales mountain range from Mount Tapulao — regional illustration for the Cawag itineraries"),
    ("talamitam", "Long walk to Mt. Talamitam, Nasugbu, Batangas, Philippines.jpg", "Approach to Mount Talamitam, a Nasugbu Trilogy destination"),
    ("kabunian", "Mt. Kabunian.jpg", "Mount Kabunian, one of the Bakun Trio mountains"),
    ("pamitinan", "Mount Pamitinan facing Mount Binacayan.jpg", "Mount Pamitinan facing Mount Binacayan, two Montalban destinations"),
    ("kibungan", "Kibuñgan Cross country (KXC) -9.jpg", "Litalit trail on Kibungan Cross Country"),
    ("arayat", "View of Arayat Mountain.jpg", "View of Mount Arayat"),
    ("kayapa", "FvfKayapaNV3902 01.JPG", "Mountain landscape around Kayapa — regional view, not the four summits"),
    ("pulag-trail", "Mount Pulag 1.jpg", "Trail approaching Mount Pulag"),
    ("apo-terrain", "The Ring of Mt. Apo.jpg", "Volcanic terrain on Mount Apo"),
    ("guiting-view", "Guiting-guiting 4.jpg", "Mount Guiting-Guiting seen from the south"),
]


def fetch(url):
    for attempt in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "AmbangegPhotoImporter/1.0 (mountain guide photo attribution)"}), timeout=45).read()
        except HTTPError as error:
            if error.code not in (429, 503) or attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))


def plain(value):
    return html.unescape(re.sub(r"<[^>]+>", "", value)).strip()


def main():
    directory = ROOT / "public/images/mountains"
    directory.mkdir(parents=True, exist_ok=True)
    photos = {}
    manifest_path = ROOT / "data/mountain-photos.json"
    previous = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    query = urllib.parse.urlencode({"action": "query", "format": "json", "titles": "|".join("File:" + title for _, title, _ in SELECTIONS), "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 1280})
    pages = json.loads(fetch("https://commons.wikimedia.org/w/api.php?" + query))["query"]["pages"]
    by_title = {page["title"]: page for page in pages.values()}
    for key, title, caption in SELECTIONS:
        page = by_title["File:" + title]
        info = page["imageinfo"][0]
        metadata = info["extmetadata"]
        license_name = plain(metadata["LicenseShortName"]["value"])
        if not license_name.startswith(("CC BY", "CC0", "Public domain")) or "NC" in license_name or "ND" in license_name:
            raise ValueError(f"Review license before importing {title}: {license_name}")
        author = plain(metadata["Artist"]["value"])
        if not author:
            raise ValueError(f"Missing photographer for {title}")
        image_url = info.get("thumburl", info["url"])
        target = directory / f"{key}.jpg"
        if not target.exists() or previous.get(key, {}).get("originalUrl") != info["url"]:
            try:
                target.write_bytes(fetch(image_url))
            except Exception:
                image_url = info["url"]
                target.write_bytes(fetch(image_url))
        if target.read_bytes()[:2] != b"\xff\xd8":
            raise ValueError(f"Not a JPEG: {title}")
        photos[key] = {"src": f"/images/mountains/{key}.jpg", "alt": caption, "caption": caption, "author": author, "sourceUrl": info["descriptionurl"], "license": license_name, "licenseUrl": metadata.get("LicenseUrl", {}).get("value", "https://creativecommons.org/publicdomain/zero/1.0/"), "originalUrl": info["url"], "downloadUrl": image_url, "changes": "Scaled by Wikimedia where available; cropped to fit the display.", "retrievedOn": "2026-10-06"}
        (ROOT / "data/mountain-photos.json").write_text(json.dumps(photos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{key}: {author.encode('ascii', 'backslashreplace').decode()} / {license_name}", flush=True)
    (ROOT / "data/mountain-photos.json").write_text(json.dumps(photos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    notes = ["# Mountain photo credits", "", "Photos are downloaded from Wikimedia Commons and served locally. Each image retains its own listed license; the image license does not apply to unrelated application code. Display crops and resized versions of ShareAlike photos are provided under the same listed license. Photographer names, source pages, and license links appear alongside the photos in the site.", "", "Cawag uses a Zambales ridge view photographed near Mount Tapulao as a regional illustration, not a photograph of the Hexa/Hepta route. Kayapa uses a regional mountain landscape, not a photograph identifying all four peaks. Other itinerary photos identify an individual destination or the actual KXC trail.", "", "Regenerate with `python scripts/import-mountain-photos.py` from frontend. The manifest records original and downloaded image URLs and retrieval dates.", "", "| Image | Photographer | Source | License |", "| --- | --- | --- | --- |"]
    for key, photo in photos.items():
        notes.append(f"| {key} | {photo['author']} | [Commons file]({photo['sourceUrl']}) | [{photo['license']}]({photo['licenseUrl']}) |")
    (ROOT / "docs/mountain-photo-credits.md").write_text("\n".join(notes) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
