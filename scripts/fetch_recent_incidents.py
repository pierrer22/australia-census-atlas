#!/usr/bin/env python3
"""Fetch, geocode, and aggregate recent police RSS (QLD/TAS/NT) & SA SAPOL incidents."""

from __future__ import annotations

import csv
import datetime as dt
import email.utils
import html
import io
import json
import math
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
CRIME_DIR = BASE / "crime"
WEB_DATA = BASE / "web" / "data"
LGA_GEO = WEB_DATA / "lga_census_2021.geojson"
SUBURB_CENTROIDS_PATH = CRIME_DIR / "suburb_centroids.json"
GEOCODE_CACHE_PATH = CRIME_DIR / "geocode_cache.json"
OUT_PATH = WEB_DATA / "recent_incidents.json"

UA = {
    "User-Agent": "AustraliaCensusAtlas/1.0 (+https://github.com/pierrer22/australia-census-atlas)"
}

STATE_FULL = {
    "QLD": "Queensland",
    "TAS": "Tasmania",
    "NT": "Northern Territory",
    "SA": "South Australia",
}

STATE_BBOX = {
    "QLD": (137.8, -29.5, 154.0, -9.0),
    "TAS": (143.5, -43.8, 148.6, -39.5),
    "NT": (128.9, -26.2, 138.1, -10.8),
    "SA": (128.9, -38.2, 141.1, -25.9),
}

SA_PKG_URL = "https://data.sa.gov.au/data/api/3/action/package_show?id=860126f7-eeb5-4fbc-be44-069aa0467d11"
SA_FALLBACK_CSV = (
    "https://data.sa.gov.au/data/dataset/860126f7-eeb5-4fbc-be44-069aa0467d11/"
    "resource/bfd3d695-7e77-4ef1-aecf-273bf2a0e300/download/data_sa_crime_q1_2026-27.csv"
)

STREET_SUFFIXES = (
    "Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Highway|Hwy|Motorway|Mwy|"
    "Place|Pl|Court|Ct|Parade|Pde|Lane|Ln|Crescent|Cres|Terrace|Tce|"
    "Boulevard|Blvd|Circuit|Cct|Way|Close|Esplanade|Freeway|Fwy"
)
STREET_RE = re.compile(
    rf"\b([A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){{0,3}}\s+(?:{STREET_SUFFIXES}))\b"
)
LEAD_STOP_WORDS = {"On", "In", "At", "Near", "Along", "Off", "From", "To", "The", "A", "An", "Via", "Towards"}
BAD_STREET_HEADS = {"Initial", "Police", "Emergency", "Ambulance", "Witnesses", "Investigations", "Officers", "Detectives", "Forensic"}

VIOLENT_KWS = (
    "assault", "wound", "stab", "murder", "homicide", "manslaughter", "robbery",
    "armed robbery", "abduct", "kidnap", "sexual", "rape", "shooting", "shot",
    "strangl", "threat", "violent", "domestic violence", "deprivation of liberty",
    "grievous bodily harm", "attempted murder", "harm or endanger", "blackmail",
    "extortion",
)
PROPERTY_KWS = (
    "unlawful entry", "break and enter", "break-in", "burglary", "trespass",
    "theft", "steal", "stole", "shoplift", "arson", "deliberately lit",
    "structure fire", "grass fire", "bushfire", "property damage",
    "damage or destroy", "vandalism", "graffiti", "fraud", "deception",
    "receive or handle", "proceeds of crime", "criminal trespass", "sct -",
)
VEHICLE_KWS = (
    "stolen motor vehicle", "unlawful use of motor vehicle", "motor vehicle theft",
    "traffic", "crash", "collision", "high speed", "hoon", "reckless driving",
    "dangerous driving", "drink driv", "drug driv", "pedestrian", "bicycle",
    "motorbike", "quad bike", "hit and run", "pursuit",
)
DRUGS_WEAPONS_KWS = (
    "drug", "cannabis", "meth", "methylamphetamine", "cocaine", "heroin",
    "illicit", "narcotic", "firearm", "weapon", "gun", "knife", "machete",
    "ammunition", "explosives",
)
NON_INCIDENT_KWS = (
    "medals and awards", "awards ceremony", "recruitment", "world hello day",
    "open day", "charity", "graduation", "memorial service", "awareness week",
)

_LAST_NOMINATIM = 0.0


def point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and (
            lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def point_in_geom(lon: float, lat: float, geom: dict) -> bool:
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon":
        if not coords or not point_in_ring(lon, lat, coords[0]):
            return False
        return not any(point_in_ring(lon, lat, hole) for hole in coords[1:])
    if gtype == "MultiPolygon":
        for poly in coords:
            if poly and point_in_ring(lon, lat, poly[0]):
                if not any(point_in_ring(lon, lat, hole) for hole in poly[1:]):
                    return True
    return False


def geom_bbox(geom: dict) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        for ring in poly:
            for pt in ring:
                xs.append(pt[0])
                ys.append(pt[1])
    return (min(xs), min(ys), max(xs), max(ys))


def build_lga_spatial_index(lga_geojson_path: Path) -> list[dict]:
    geo = json.loads(lga_geojson_path.read_text(encoding="utf-8"))
    idx: list[dict] = []
    for feat in geo["features"]:
        geom = feat.get("geometry")
        if not geom:
            continue
        p = feat["properties"]
        idx.append({
            "code": str(p["code"]),
            "name": p["name"],
            "ste_name": p["ste_name"],
            "bbox": geom_bbox(geom),
            "geom": geom,
        })
    return idx


def find_lga(lon: float, lat: float, lga_index: list[dict], ste_name: str | None = None) -> tuple[str | None, str | None]:
    cands = [x for x in lga_index if ste_name is None or x["ste_name"] == ste_name]
    for item in cands:
        xmin, ymin, xmax, ymax = item["bbox"]
        if xmin <= lon <= xmax and ymin <= lat <= ymax:
            if point_in_geom(lon, lat, item["geom"]):
                return item["code"], item["name"]

    best_item = None
    best_dist = float("inf")
    for item in cands:
        xmin, ymin, xmax, ymax = item["bbox"]
        cx = (xmin + xmax) / 2.0
        cy = (ymin + ymax) / 2.0
        dx = max(xmin - lon, 0.0, lon - xmax)
        dy = max(ymin - lat, 0.0, lat - ymax)
        dist = (dx * dx + dy * dy) * 100.0 + (lon - cx) ** 2 + (lat - cy) ** 2
        if dist < best_dist:
            best_dist = dist
            best_item = item
    if best_item and best_dist < 5.0:
        return best_item["code"], best_item["name"]
    return None, None


def classify_category(text: str) -> str:
    low = text.lower()
    if any(k in low for k in VIOLENT_KWS):
        return "violent"
    if any(k in low for k in VEHICLE_KWS):
        return "vehicle"
    if any(k in low for k in DRUGS_WEAPONS_KWS):
        return "drugs_weapons"
    if any(k in low for k in PROPERTY_KWS):
        return "property"
    return "other"


def is_crime_incident(title: str, body: str) -> bool:
    combined = f"{title} {body[:350]}".lower()
    if any(k in combined for k in NON_INCIDENT_KWS):
        if not any(k in combined for k in (*VIOLENT_KWS, *PROPERTY_KWS, *VEHICLE_KWS, *DRUGS_WEAPONS_KWS)):
            return False
    return True


def strip_html(raw: str) -> str:
    txt = html.unescape(raw or "")
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def parse_pub_date(raw: str) -> str:
    if not raw:
        return dt.date.today().isoformat()
    try:
        parsed = email.utils.parsedate_to_datetime(raw.strip())
        return parsed.date().isoformat()
    except Exception:
        return dt.date.today().isoformat()


def fetch_bytes(url: str, timeout: int = 15) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def extract_street(body: str) -> str | None:
    snippet = body[:650]
    for m in STREET_RE.finditer(snippet):
        parts = m.group(1).split()
        while parts and parts[0] in LEAD_STOP_WORDS:
            parts.pop(0)
        if len(parts) < 2:
            continue
        if parts[0] in BAD_STREET_HEADS:
            continue
        return " ".join(parts)
    return None


def compile_suburb_scanner(suburb_names: list[str]) -> re.Pattern | None:
    filtered = sorted({s for s in suburb_names if len(s) >= 4}, key=len, reverse=True)
    if not filtered:
        return None
    escaped = "|".join(re.escape(s) for s in filtered)
    return re.compile(rf"\b({escaped})\b", re.I)


def extract_suburb(
    state: str,
    title: str,
    body: str,
    state_suburbs: dict[str, list[float]],
    scanner: re.Pattern | None,
) -> str | None:
    candidates: list[str] = []

    if state == "QLD" and "," in title:
        tail = title.rsplit(",", 1)[1].strip()
        for piece in re.split(r"\s+and\s+|/", tail, flags=re.I):
            candidates.append(piece.strip(" ."))
    elif state == "NT":
        parts = re.split(r"\s+[–-]\s+", title)
        if len(parts) >= 2:
            candidates.append(parts[-1].strip(" ."))
    elif state == "TAS":
        m = re.search(r"\b(?:at|in|near|on)\s+([A-Z][a-zA-Z'’\-]+(?:\s+[A-Z][a-zA-Z'’\-]+){0,2})\b", title)
        if m:
            candidates.append(m.group(1).strip())

    for cand in candidates:
        key = re.sub(r"\s+", " ", cand.upper()).strip()
        if key in state_suburbs:
            return cand.title() if cand.isupper() else cand

    if scanner:
        for text_block in (title, body[:500]):
            m = scanner.search(text_block)
            if m:
                matched = re.sub(r"\s+", " ", m.group(1).upper()).strip()
                if matched in state_suburbs:
                    return matched.title()

    for cand in candidates:
        if len(cand) >= 3:
            return cand
    return None


def in_state_bbox(lon: float, lat: float, state: str) -> bool:
    xmin, ymin, xmax, ymax = STATE_BBOX[state]
    return xmin <= lon <= xmax and ymin <= lat <= ymax


def nominatim_geocode(query: str, state: str, cache: dict) -> list[float] | None:
    global _LAST_NOMINATIM
    if query in cache:
        pt = cache[query]
        if pt and in_state_bbox(pt[0], pt[1], state):
            return pt
        return None

    elapsed = time.monotonic() - _LAST_NOMINATIM
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)
    url = (
        "https://nominatim.openstreetmap.org/search?"
        + urllib.parse.urlencode({"q": query, "countrycodes": "au", "format": "json", "limit": "1"})
    )
    pt = None
    try:
        data = json.loads(fetch_bytes(url, timeout=10).decode("utf-8"))
        _LAST_NOMINATIM = time.monotonic()
        if data:
            lon = round(float(data[0]["lon"]), 5)
            lat = round(float(data[0]["lat"]), 5)
            if in_state_bbox(lon, lat, state):
                pt = [lon, lat]
    except Exception:
        _LAST_NOMINATIM = time.monotonic()
        return None

    cache[query] = pt
    return pt


def geocode_incident(
    state: str,
    street: str | None,
    suburb: str | None,
    cache: dict,
    state_suburbs: dict[str, list[float]],
) -> tuple[float, float, str, str] | None:
    if street and suburb:
        q = f"{street}, {suburb}, {state}, Australia"
        pt = nominatim_geocode(q, state, cache)
        if pt:
            return pt[0], pt[1], "street", f"{street}, {suburb}"

    if suburb:
        key = re.sub(r"\s+", " ", suburb.upper()).strip()
        if key in state_suburbs:
            lon, lat = state_suburbs[key]
            return lon, lat, "suburb", suburb
        q = f"{suburb}, {state}, Australia"
        pt = nominatim_geocode(q, state, cache)
        if pt:
            return pt[0], pt[1], "locality", suburb

    return None


def fetch_rss_feed(
    state: str,
    source_name: str,
    urls: list[str],
    state_suburbs: dict[str, list[float]],
    scanner: re.Pattern | None,
    cache: dict,
    lga_index: list[dict],
) -> tuple[list[dict], bool]:
    seen_links: set[str] = set()
    raw_items: list[dict] = []
    any_ok = False

    for url in urls:
        try:
            xml_bytes = fetch_bytes(url, timeout=15)
            root = ET.fromstring(xml_bytes)
            any_ok = True
        except Exception as exc:
            print(f"[WARN] {state} feed error ({url}): {exc}")
            continue

        for it in root.findall(".//item"):
            link = (it.findtext("link") or "").strip()
            if not link or link in seen_links:
                continue
            seen_links.add(link)
            title = strip_html(it.findtext("title") or "")
            raw_body = (
                it.findtext("{http://purl.org/rss/1.0/modules/content/}encoded")
                or it.findtext("description")
                or ""
            )
            body = strip_html(raw_body)
            if not title or not is_crime_incident(title, body):
                continue
            raw_items.append({
                "title": title,
                "body": body,
                "date": parse_pub_date(it.findtext("pubDate") or ""),
                "link": link,
            })

    if not any_ok:
        return [], False

    pins: list[dict] = []
    skipped = 0
    for idx, item in enumerate(raw_items):
        street = extract_street(item["body"])
        suburb = extract_suburb(state, item["title"], item["body"], state_suburbs, scanner)
        geo = geocode_incident(state, street, suburb, cache, state_suburbs)
        if not geo:
            skipped += 1
            continue
        lon, lat, precision, loc_label = geo
        lga_code, lga_name = find_lga(lon, lat, lga_index, ste_name=STATE_FULL[state])
        summary = item["body"][:210].rstrip()
        if len(item["body"]) > 210:
            summary += "…"
        pins.append({
            "id": f"{state.lower()}-{idx}-{abs(hash(item['link'])) % 100000}",
            "source": "rss",
            "agency": source_name,
            "state": state,
            "title": item["title"],
            "date": item["date"],
            "cat": classify_category(f"{item['title']} {item['body'][:350]}"),
            "loc": loc_label,
            "precision": precision,
            "lon": round(lon, 5),
            "lat": round(lat, 5),
            "lga_code": lga_code,
            "lga_name": lga_name,
            "summary": summary,
            "url": item["link"],
        })

    print(f"RSS {state} ({source_name}): {len(pins)} geocoded, {skipped} skipped (from {len(raw_items)} incident items)")
    return pins, True


def dejitter_pins(pins: list[dict]) -> None:
    buckets: dict[tuple[float, float], list[dict]] = defaultdict(list)
    for p in pins:
        buckets[(round(p["lon"], 4), round(p["lat"], 4))].append(p)
    for grp in buckets.values():
        if len(grp) <= 1:
            continue
        for i, p in enumerate(grp[1:], start=1):
            r = 0.0022 * math.sqrt(i)
            ang = i * 2.39996323
            p["lon"] = round(p["lon"] + r * math.cos(ang), 5)
            p["lat"] = round(p["lat"] + r * math.sin(ang), 5)


def normalize_sa_suburb(name: str, sa_suburbs: dict[str, list[float]]) -> list[float] | None:
    s = re.sub(r"\s+", " ", name.strip().upper())
    if not s or s in {"NOT DISCLOSED", "UNKNOWN", "UNINCORPORATED"}:
        return None
    if s in sa_suburbs:
        return sa_suburbs[s]
    variants = [
        re.sub(r"^MT\s+", "MOUNT ", s),
        re.sub(r"^ST\s+", "SAINT ", s),
        re.sub(r"^PT\s+", "PORT ", s),
        re.sub(r"\s+NORTH$", "", s),
        re.sub(r"\s+SOUTH$", "", s),
        re.sub(r"\s+EAST$", "", s),
        re.sub(r"\s+WEST$", "", s),
    ]
    for v in variants:
        if v in sa_suburbs:
            return sa_suburbs[v]
    return None


def resolve_sa_csv_url() -> tuple[str, str]:
    try:
        pkg = json.loads(fetch_bytes(SA_PKG_URL, timeout=15).decode("utf-8"))
        resources = pkg["result"]["resources"]
        cands = []
        for r in resources:
            name = r.get("name") or ""
            url = r.get("url") or ""
            if name.startswith("Crime Statistics ") and url.lower().endswith(".csv"):
                m = re.search(r"(\d{4})-(\d{2})(?:\s+Q(\d))?", name)
                sort_key = (int(m.group(1)), int(m.group(3) or 4)) if m else (0, 0)
                cands.append((sort_key, name, url))
        if cands:
            cands.sort(reverse=True)
            return cands[0][2], cands[0][1]
    except Exception as exc:
        print(f"[WARN] SA CKAN lookup failed, using fallback URL: {exc}")
    return SA_FALLBACK_CSV, "Crime Statistics 2026-27 Q1"


def fetch_sa_suburbs(sa_suburbs: dict[str, list[float]], lga_index: list[dict]) -> tuple[list[dict], str, bool]:
    csv_url, ds_name = resolve_sa_csv_url()
    try:
        raw_bytes = fetch_bytes(csv_url, timeout=30)
    except Exception as exc:
        print(f"[WARN] SA CSV fetch error: {exc}")
        return [], ds_name, False

    rows = list(csv.DictReader(io.StringIO(raw_bytes.decode("utf-8-sig", errors="replace"))))
    parsed_rows: list[tuple[dt.date, dict]] = []
    for r in rows:
        d_str = (r.get("Reported Date") or "").strip()
        try:
            d_obj = dt.datetime.strptime(d_str, "%d/%m/%Y").date()
        except ValueError:
            continue
        parsed_rows.append((d_obj, r))

    if not parsed_rows:
        return [], ds_name, False

    max_date = max(d for d, _ in parsed_rows)
    cutoff = max_date - dt.timedelta(days=29)
    period_label = f"{cutoff.strftime('%d %b')}–{max_date.strftime('%d %b %Y')} (30d)"

    agg: dict[str, dict] = {}
    unmatched = 0
    for d_obj, r in parsed_rows:
        if d_obj < cutoff:
            continue
        sub_raw = (r.get("Suburb - Incident") or "").strip()
        pt = normalize_sa_suburb(sub_raw, sa_suburbs)
        if not pt:
            if sub_raw and sub_raw.upper() not in {"NOT DISCLOSED", "UNKNOWN"}:
                unmatched += 1
            continue
        cnt = int(r.get("Offence count") or 1)
        off_l1 = r.get("Offence Level 1 Description") or ""
        off_l2 = r.get("Offence Level 2 Description") or ""
        off_l3 = r.get("Offence Level 3 Description") or off_l2 or "Other"
        cat = classify_category(f"{off_l1} {off_l2} {off_l3}")

        key = sub_raw.upper()
        if key not in agg:
            lga_code, lga_name = find_lga(pt[0], pt[1], lga_index, ste_name="South Australia")
            agg[key] = {
                "suburb": sub_raw.title(),
                "postcode": (r.get("Postcode - Incident") or "").strip(),
                "lon": pt[0],
                "lat": pt[1],
                "lga_code": lga_code,
                "lga_name": lga_name,
                "count": 0,
                "cats": Counter(),
                "offs": Counter(),
                "latest": d_obj,
            }
        entry = agg[key]
        entry["count"] += cnt
        entry["cats"][cat] += cnt
        entry["offs"][off_l3] += cnt
        if d_obj > entry["latest"]:
            entry["latest"] = d_obj

    sa_pins: list[dict] = []
    for idx, entry in enumerate(sorted(agg.values(), key=lambda x: x["count"], reverse=True)):
        dom_cat = entry["cats"].most_common(1)[0][0]
        sa_pins.append({
            "id": f"sa-{idx}-{entry['postcode'] or '0000'}",
            "source": "sa",
            "state": "SA",
            "suburb": entry["suburb"],
            "postcode": entry["postcode"],
            "lon": entry["lon"],
            "lat": entry["lat"],
            "lga_code": entry["lga_code"],
            "lga_name": entry["lga_name"],
            "count": entry["count"],
            "cat": dom_cat,
            "date": entry["latest"].isoformat(),
            "period": period_label,
            "top": [[k, v] for k, v in entry["offs"].most_common(3)],
        })

    print(f"SA SAPOL ({ds_name}, {period_label}): {len(sa_pins)} suburbs matched ({unmatched} rows unmatched)")
    return sa_pins, period_label, True


def main() -> None:
    if not SUBURB_CENTROIDS_PATH.exists():
        raise FileNotFoundError(f"Missing {SUBURB_CENTROIDS_PATH}; run scripts/build_geo_centroids.py first")

    suburb_centroids = json.loads(SUBURB_CENTROIDS_PATH.read_text(encoding="utf-8"))
    cache = json.loads(GEOCODE_CACHE_PATH.read_text(encoding="utf-8")) if GEOCODE_CACHE_PATH.exists() else {}
    prev = json.loads(OUT_PATH.read_text(encoding="utf-8")) if OUT_PATH.exists() else {}
    prev_rss_by_state = defaultdict(list)
    for item in prev.get("rss", []):
        prev_rss_by_state[item.get("state", "")].append(item)

    lga_index = build_lga_spatial_index(LGA_GEO)

    feeds = [
        (
            "QLD",
            "myPolice QLD",
            [
                "https://mypolice.qld.gov.au/feed/",
                "https://mypolice.qld.gov.au/feed/?paged=2",
                "https://mypolice.qld.gov.au/feed/?paged=3",
            ],
        ),
        (
            "TAS",
            "Tasmania Police",
            [
                "https://www.police.tas.gov.au/news-events/media-releases/feed/",
                "https://www.police.tas.gov.au/news-events/media-releases/feed/?paged=2",
                "https://www.police.tas.gov.au/news-events/media-releases/feed/?paged=3",
                "https://www.police.tas.gov.au/news-events/media-releases/feed/?paged=4",
            ],
        ),
        (
            "NT",
            "NT Police (PFES)",
            ["https://pfes.nt.gov.au/news.rss"],
        ),
    ]

    all_rss: list[dict] = []
    sources_meta: dict[str, str] = {}
    for st, agency, urls in feeds:
        st_subs = suburb_centroids.get(st, {})
        scanner = compile_suburb_scanner(list(st_subs.keys()))
        pins, ok = fetch_rss_feed(st, agency, urls, st_subs, scanner, cache, lga_index)
        if ok and pins:
            all_rss.extend(pins)
            sources_meta[st] = f"{agency} ({len(pins)} pins)"
        elif prev_rss_by_state.get(st):
            fallback = prev_rss_by_state[st]
            all_rss.extend(fallback)
            sources_meta[st] = f"{agency} (cached {len(fallback)} pins)"
        else:
            sources_meta[st] = f"{agency} (0 pins)"

    dejitter_pins(all_rss)
    all_rss.sort(key=lambda x: x["date"], reverse=True)

    sa_pins, sa_period, sa_ok = fetch_sa_suburbs(suburb_centroids.get("SA", {}), lga_index)
    if not sa_ok and prev.get("sa"):
        sa_pins = prev["sa"]
        sa_period = prev.get("sources", {}).get("SA", "SAPOL cached")
    sources_meta["SA"] = f"SAPOL {sa_period}"

    GEOCODE_CACHE_PATH.write_text(json.dumps(cache, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    out_obj = {
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": sources_meta,
        "rss": all_rss,
        "sa": sa_pins,
    }
    OUT_PATH.write_text(json.dumps(out_obj, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT_PATH.name}: {len(all_rss)} RSS pins + {len(sa_pins)} SA suburb pins")


if __name__ == "__main__":
    main()
