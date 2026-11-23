#!/usr/bin/env python3
"""Build ABS 2021 Mesh Block centroids (QLD), SAL suburb centroids, and QLD NHW-to-LGA mapping."""

from __future__ import annotations

import json
import re
import struct
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
BOUNDARIES_DIR = BASE / "boundaries"
CRIME_DIR = BASE / "crime"
WEB_DATA = BASE / "web" / "data"
LGA_GEO = WEB_DATA / "lga_census_2021.geojson"

MB_URL = (
    "https://www.abs.gov.au/statistics/standards/"
    "australian-statistical-geography-standard-asgs-edition-3/"
    "jul2021-jun2026/access-and-downloads/digital-boundary-files/"
    "MB_2021_AUST_SHP_GDA2020.zip"
)
SAL_URL = (
    "https://www.abs.gov.au/statistics/standards/"
    "australian-statistical-geography-standard-asgs-edition-3/"
    "jul2021-jun2026/access-and-downloads/digital-boundary-files/"
    "SAL_2021_AUST_GDA2020_SHP.zip"
)
QPS_LUT_URL = "https://a5c7zwf7e5.execute-api.ap-southeast-2.amazonaws.com/dev/lut"
QPS_LOC_URL = "https://a5c7zwf7e5.execute-api.ap-southeast-2.amazonaws.com/dev/locations"

UA = {"User-Agent": "AustraliaCensusAtlas/1.0 (+https://github.com/pierrer22/australia-census-atlas)"}

STATE_MAP = {"3": "QLD", "4": "SA", "6": "TAS", "7": "NT"}

QPS_LGA_OVERRIDES = {
    "Central Highlands (Qld)": "Central Highlands",
    "Flinders (Qld)": "Flinders",
    "McKinlay": "Mckinlay",
    "Northern Peninsula Area": "Northern Peninsula",
    "Weipa": "Weipa Town",
}


def download_if_missing(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 100_000:
        print(f"Using cached {dest.name} ({dest.stat().st_size / 1e6:.1f} MB)")
        return
    print(f"Downloading {dest.name}...")
    tmp = dest.with_suffix(".zip.part")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as resp, tmp.open("wb") as out:
        while True:
            chunk = resp.read(1 << 16)
            if not chunk:
                break
            out.write(chunk)
    tmp.replace(dest)
    print(f"Downloaded {dest.name} ({dest.stat().st_size / 1e6:.1f} MB)")


def read_dbf_records(dbf_bytes: bytes):
    """Yield stripped string dicts from an ESRI DBF byte buffer."""
    num_records, header_len, record_len = struct.unpack("<IHH", dbf_bytes[4:12])
    fields: list[tuple[str, int]] = []
    pos = 32
    while pos < header_len - 1:
        if dbf_bytes[pos] == 0x0D:
            break
        raw_name = dbf_bytes[pos : pos + 11].split(b"\x00", 1)[0]
        name = raw_name.decode("ascii", errors="ignore").strip()
        length = dbf_bytes[pos + 16]
        fields.append((name, length))
        pos += 32

    offset = header_len
    for _ in range(num_records):
        rec = dbf_bytes[offset : offset + record_len]
        offset += record_len
        if not rec or rec[0] == 0x2A:
            yield None
            continue
        fpos = 1
        row: dict[str, str] = {}
        for name, flen in fields:
            val = rec[fpos : fpos + flen].decode("utf-8", errors="replace").strip()
            row[name] = val
            fpos += flen
        yield row


def read_shp_centroids(shp_bytes: bytes, largest_ring: bool = False):
    """Yield (lon, lat) centroid tuples (or None for null shapes) from an ESRI SHP buffer."""
    pos = 100
    total = len(shp_bytes)
    while pos + 8 <= total:
        _, content_words = struct.unpack(">ii", shp_bytes[pos : pos + 8])
        pos += 8
        rec_len = content_words * 2
        rec = shp_bytes[pos : pos + rec_len]
        pos += rec_len
        if len(rec) < 4:
            yield None
            continue
        shape_type = struct.unpack("<i", rec[:4])[0]
        if shape_type == 0:
            yield None
            continue
        if shape_type not in (5, 15, 25) or len(rec) < 44:
            yield None
            continue

        if not largest_ring:
            xmin, ymin, xmax, ymax = struct.unpack("<4d", rec[4:36])
            yield (round((xmin + xmax) / 2.0, 4), round((ymin + ymax) / 2.0, 4))
            continue

        num_parts, num_pts = struct.unpack("<ii", rec[36:44])
        if num_parts <= 0 or num_pts <= 0:
            yield None
            continue
        parts_end = 44 + 4 * num_parts
        parts = list(struct.unpack(f"<{num_parts}i", rec[44:parts_end]))
        pts_end = parts_end + 16 * num_pts
        if len(rec) < pts_end:
            xmin, ymin, xmax, ymax = struct.unpack("<4d", rec[4:36])
            yield (round((xmin + xmax) / 2.0, 4), round((ymin + ymax) / 2.0, 4))
            continue
        coords = struct.unpack(f"<{2 * num_pts}d", rec[parts_end:pts_end])

        best_bbox = None
        best_area = -1.0
        for idx, start in enumerate(parts):
            end = parts[idx + 1] if idx + 1 < num_parts else num_pts
            if end <= start:
                continue
            xs = coords[2 * start : 2 * end : 2]
            ys = coords[2 * start + 1 : 2 * end : 2]
            xmin, xmax = min(xs), max(xs)
            ymin, ymax = min(ys), max(ys)
            area = (xmax - xmin) * (ymax - ymin)
            if area > best_area:
                best_area = area
                best_bbox = (xmin, ymin, xmax, ymax)

        if best_bbox is None:
            yield None
        else:
            xmin, ymin, xmax, ymax = best_bbox
            yield (round((xmin + xmax) / 2.0, 4), round((ymin + ymax) / 2.0, 4))


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
        for hole in coords[1:]:
            if point_in_ring(lon, lat, hole):
                return False
        return True
    if gtype == "MultiPolygon":
        for poly in coords:
            if poly and point_in_ring(lon, lat, poly[0]):
                if not any(point_in_ring(lon, lat, hole) for hole in poly[1:]):
                    return True
    return False


def geom_bbox(geom: dict) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon":
        polys = [coords]
    elif gtype == "MultiPolygon":
        polys = coords
    else:
        polys = []
    for poly in polys:
        for ring in poly:
            for pt in ring:
                xs.append(pt[0])
                ys.append(pt[1])
    return (min(xs), min(ys), max(xs), max(ys))


def build_lga_spatial_index(lga_geojson_path: Path) -> list[dict]:
    geo = json.loads(lga_geojson_path.read_text(encoding="utf-8"))
    index: list[dict] = []
    for feat in geo["features"]:
        geom = feat.get("geometry")
        if not geom:
            continue
        p = feat["properties"]
        index.append({
            "code": str(p["code"]),
            "name": p["name"],
            "ste_name": p["ste_name"],
            "bbox": geom_bbox(geom),
            "geom": geom,
        })
    return index


def find_lga(lon: float, lat: float, lga_index: list[dict], ste_name: str | None = None) -> tuple[str | None, str | None]:
    candidates = [item for item in lga_index if ste_name is None or item["ste_name"] == ste_name]
    for item in candidates:
        xmin, ymin, xmax, ymax = item["bbox"]
        if xmin <= lon <= xmax and ymin <= lat <= ymax:
            if point_in_geom(lon, lat, item["geom"]):
                return item["code"], item["name"]

    # Fallback: nearest LGA bounding-box center (handles slight coastal rounding offsets)
    best_item = None
    best_dist = float("inf")
    for item in candidates:
        xmin, ymin, xmax, ymax = item["bbox"]
        cx = (xmin + xmax) / 2.0
        cy = (ymin + ymax) / 2.0
        # Penalize outside-bbox distance more strongly than center distance
        dx = max(xmin - lon, 0.0, lon - xmax)
        dy = max(ymin - lat, 0.0, lat - ymax)
        dist = (dx * dx + dy * dy) * 100.0 + (lon - cx) ** 2 + (lat - cy) ** 2
        if dist < best_dist:
            best_dist = dist
            best_item = item
    if best_item and best_dist < 5.0:
        return best_item["code"], best_item["name"]
    return None, None


def find_zip_member(zf: zipfile.ZipFile, suffix: str) -> str:
    for name in zf.namelist():
        if name.lower().endswith(suffix.lower()):
            return name
    raise FileNotFoundError(f"Missing *{suffix} in {zf.filename}")


def build_qld_mb_centroids(mb_zip: Path) -> dict[str, list[float]]:
    print("Extracting QLD Mesh Block centroids from MB_2021_AUST_SHP_GDA2020.zip...")
    centroids: dict[str, list[float]] = {}
    with zipfile.ZipFile(mb_zip) as zf:
        dbf_bytes = zf.read(find_zip_member(zf, ".dbf"))
        shp_bytes = zf.read(find_zip_member(zf, ".shp"))

    for rec, cent in zip(read_dbf_records(dbf_bytes), read_shp_centroids(shp_bytes, largest_ring=False)):
        if rec is None or cent is None:
            continue
        ste = rec.get("STE_CODE21") or rec.get("ste_code21") or ""
        if ste != "3":
            continue
        code = rec.get("MB_CODE21") or rec.get("mb_code21") or ""
        if not code:
            continue
        lon, lat = cent
        if 137.0 <= lon <= 154.5 and -30.0 <= lat <= -9.0:
            centroids[code] = [lon, lat]

    WEB_DATA.mkdir(parents=True, exist_ok=True)
    out_path = WEB_DATA / "qld_mb_centroids.json"
    out_path.write_text(json.dumps(centroids, separators=(",", ":")), encoding="utf-8")
    size_mb = out_path.stat().st_size / 1e6
    print(f"Wrote {out_path.name}: {len(centroids):,} QLD mesh blocks ({size_mb:.2f} MB)")
    return centroids


def build_suburb_centroids(sal_zip: Path) -> dict[str, dict[str, list[float]]]:
    print("Extracting SAL suburb centroids from SAL_2021_AUST_GDA2020_SHP.zip...")
    out: dict[str, dict[str, list[float]]] = {abbr: {} for abbr in STATE_MAP.values()}
    with zipfile.ZipFile(sal_zip) as zf:
        dbf_bytes = zf.read(find_zip_member(zf, ".dbf"))
        shp_bytes = zf.read(find_zip_member(zf, ".shp"))

    disambig_re = re.compile(r"\s+\((?:QLD|SA|TAS\.?|NT|NSW|VIC|WA|ACT)\)$", re.I)

    for rec, cent in zip(read_dbf_records(dbf_bytes), read_shp_centroids(shp_bytes, largest_ring=True)):
        if rec is None or cent is None:
            continue
        ste = rec.get("STE_CODE21") or rec.get("ste_code21") or ""
        abbr = STATE_MAP.get(ste)
        if not abbr:
            continue
        raw_name = (rec.get("SAL_NAME21") or rec.get("sal_name21") or "").strip()
        if not raw_name or raw_name.lower().startswith("no usual address") or raw_name.lower().startswith("migratory"):
            continue
        upper = re.sub(r"\s+", " ", raw_name.upper())
        lon, lat = cent
        out[abbr][upper] = [lon, lat]
        stripped = disambig_re.sub("", upper).strip()
        if stripped and stripped not in out[abbr]:
            out[abbr][stripped] = [lon, lat]

    CRIME_DIR.mkdir(parents=True, exist_ok=True)
    out_path = CRIME_DIR / "suburb_centroids.json"
    out_path.write_text(json.dumps(out, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    counts = ", ".join(f"{k}: {len(v):,}" for k, v in out.items())
    print(f"Wrote {out_path.name}: {counts}")
    return out


def fetch_json(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def first_coord_from_geojson(geo) -> tuple[float, float] | None:
    if isinstance(geo, list):
        geo = geo[0] if geo else {}
    if not isinstance(geo, dict):
        return None
    feats = geo.get("features") or []
    for f in feats:
        geom = f.get("geometry") or {}
        gtype = geom.get("type")
        coords = geom.get("coordinates") or []
        if gtype == "Polygon" and coords and coords[0]:
            pts = coords[0]
            lon = sum(p[0] for p in pts) / len(pts)
            lat = sum(p[1] for p in pts) / len(pts)
            return lon, lat
        if gtype == "MultiPolygon" and coords and coords[0] and coords[0][0]:
            pts = coords[0][0]
            lon = sum(p[0] for p in pts) / len(pts)
            lat = sum(p[1] for p in pts) / len(pts)
            return lon, lat
        if gtype == "Point" and len(coords) >= 2:
            return coords[0], coords[1]
    return None


def match_nhw_suburb(nhw_name: str, qld_suburbs: dict[str, list[float]]) -> list[float] | None:
    candidates = [nhw_name]
    s = re.sub(r"\s+(?:[A-Za-z]?\d+[A-Za-z]?|\d+[A-Za-z]?(?:\s*[-–]\s*\d+[A-Za-z]?)?)$", "", nhw_name).strip()
    candidates.append(s)
    s2 = re.sub(r"\s*\([^)]*\)\s*", " ", s).strip()
    candidates.append(s2)
    if " - " in s:
        candidates.extend(part.strip() for part in s.split(" - "))
    if "/" in s:
        candidates.extend(part.strip() for part in s.split("/"))
    # Handle suffix tags like "North", "South", "East", "West", "Central" if full string isn't a suburb
    s3 = re.sub(r"\s+(?:CBD|NORTH|SOUTH|EAST|WEST|CENTRAL|ESTATE|RURAL|DISTRICT|ZONE|AREA|PRECINCT)$", "", s2, flags=re.I).strip()
    candidates.append(s3)

    for cand in candidates:
        key = re.sub(r"\s+", " ", cand.upper()).strip()
        if key in qld_suburbs:
            return qld_suburbs[key]
    return None


def build_qld_nhw_by_lga(suburb_centroids: dict[str, dict[str, list[float]]], lga_index: list[dict]) -> None:
    print("Fetching QPS LUT and building QLD NHW-to-LGA mapping...")
    lut = fetch_json(QPS_LUT_URL, timeout=20)
    qps_lgas = sorted({x["name"] for x in lut if x.get("type") == "Local Government Area" and x.get("name")})
    qps_lga_set = set(qps_lgas)
    qps_nhws = sorted({x["name"] for x in lut if x.get("type") == "Neighbourhood Watch" and x.get("name")})

    qld_lga_feats = [x for x in lga_index if x["ste_name"] == "Queensland"]
    by_lga: dict[str, dict] = {}
    for item in qld_lga_feats:
        abs_name = item["name"]
        qps_name = QPS_LGA_OVERRIDES.get(abs_name, abs_name)
        if qps_name not in qps_lga_set:
            raise AssertionError(f"Unmatched QLD LGA: ABS='{abs_name}' -> '{qps_name}' not in QPS LUT")
        by_lga[item["code"]] = {"qps_name": qps_name, "nhw": []}

    qld_suburbs = suburb_centroids["QLD"]
    unmatched: list[str] = []
    matched_suburb = 0
    for nhw in qps_nhws:
        pt = match_nhw_suburb(nhw, qld_suburbs)
        if pt:
            lga_code, _ = find_lga(pt[0], pt[1], lga_index, ste_name="Queensland")
            if lga_code and lga_code in by_lga:
                by_lga[lga_code]["nhw"].append(nhw)
                matched_suburb += 1
                continue
        unmatched.append(nhw)

    print(f"NHW suburb-matched: {matched_suburb}/{len(qps_nhws)}; querying QPS locations for remaining {len(unmatched)}...")
    matched_api = 0
    still_unmatched: list[str] = []
    for nhw in unmatched:
        url = f"{QPS_LOC_URL}?locationType=NHW&locationName={urllib.parse.quote(nhw)}"
        try:
            geo = fetch_json(url, timeout=10)
            pt = first_coord_from_geojson(geo)
            if pt:
                lga_code, _ = find_lga(pt[0], pt[1], lga_index, ste_name="Queensland")
                if lga_code and lga_code in by_lga:
                    by_lga[lga_code]["nhw"].append(nhw)
                    matched_api += 1
                    time.sleep(0.15)
                    continue
        except Exception:
            pass
        still_unmatched.append(nhw)
        time.sleep(0.15)

    for info in by_lga.values():
        info["nhw"] = sorted(set(info["nhw"]))

    total_mapped = sum(len(v["nhw"]) for v in by_lga.values())
    out_obj = {"by_lga": by_lga, "nhw_count": total_mapped}
    out_path = WEB_DATA / "qld_nhw_by_lga.json"
    out_path.write_text(json.dumps(out_obj, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(
        f"Wrote {out_path.name}: {len(by_lga)} QLD LGAs | "
        f"{total_mapped}/{len(qps_nhws)} NHW mapped (API={matched_api}, unmapped={len(still_unmatched)})"
    )
    if still_unmatched:
        print("Unmapped NHW sample:", still_unmatched[:10])


def main() -> None:
    mb_zip = BOUNDARIES_DIR / "MB_2021_AUST_SHP_GDA2020.zip"
    sal_zip = BOUNDARIES_DIR / "SAL_2021_AUST_GDA2020_SHP.zip"
    download_if_missing(MB_URL, mb_zip)
    download_if_missing(SAL_URL, sal_zip)

    lga_index = build_lga_spatial_index(LGA_GEO)
    build_qld_mb_centroids(mb_zip)
    suburb_centroids = build_suburb_centroids(sal_zip)
    build_qld_nhw_by_lga(suburb_centroids, lga_index)


if __name__ == "__main__":
    main()
