#!/usr/bin/env python3
"""Aggregate SGS Rental Affordability Index (housing/postcode_rai.csv) across all 6 census layers."""

from __future__ import annotations

import csv
import json
import struct
import zipfile
from collections import defaultdict
from pathlib import Path

from build_geo_centroids import (
    BOUNDARIES_DIR,
    download_if_missing,
    find_lga,
    find_zip_member,
    point_in_ring,
    read_dbf_records,
    build_lga_spatial_index,
)

BASE = Path(__file__).resolve().parent.parent
HOUSING_DIR = BASE / "housing"
WEB_DATA = BASE / "web" / "data"
RAI_CSV = HOUSING_DIR / "postcode_rai.csv"
POA_ZIP = BOUNDARIES_DIR / "POA_2021_AUST_GDA2020_SHP.zip"
OUT_PATH = WEB_DATA / "rai_2025.json"

POA_URL = (
    "https://www.abs.gov.au/statistics/standards/"
    "australian-statistical-geography-standard-asgs-edition-3/"
    "jul2021-jun2026/access-and-downloads/digital-boundary-files/"
    "POA_2021_AUST_GDA2020_SHP.zip"
)


def load_postcode_rai(csv_path: Path) -> dict[str, tuple[int, str, int | None]]:
    """Return {poa4: (latest_rai, period_str, chg5y)} for postcodes active in 2024-2025."""
    by_poa: dict[str, dict[tuple[int, int], int]] = defaultdict(dict)
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            val = int(row.get("RAI") or 0)
            if val <= 0:
                continue
            pc = (row.get("Postcode") or "").strip().zfill(4)
            yr = int(row["Year"])
            q = int(row["Quarter"])
            by_poa[pc][(yr, q)] = val

    out: dict[str, tuple[int, str, int | None]] = {}
    for pc, qmap in by_poa.items():
        recent = [(yr, q) for (yr, q) in qmap if yr >= 2024]
        if not recent:
            continue
        yr, q = max(recent)
        latest = qmap[(yr, q)]
        prev = qmap.get((yr - 5, q))
        if prev is None:
            same_yr5 = [(abs(qq - q), val) for (yy, qq), val in qmap.items() if yy == yr - 5]
            if same_yr5:
                prev = min(same_yr5)[1]
        chg5y = (latest - prev) if prev is not None else None
        out[pc] = (latest, f"{yr} Q{q}", chg5y)
    return out


def load_poa_polygons(poa_zip: Path, wanted: set[str]) -> list[dict]:
    """Parse ABS POA 2021 shapefile polygons for postcodes in `wanted`."""
    with zipfile.ZipFile(poa_zip) as zf:
        dbf_bytes = zf.read(find_zip_member(zf, ".dbf"))
        shp_bytes = zf.read(find_zip_member(zf, ".shp"))

    polys: list[dict] = []
    pos = 100
    total_bytes = len(shp_bytes)
    for rec in read_dbf_records(dbf_bytes):
        if pos + 8 > total_bytes:
            break
        _, content_words = struct.unpack(">ii", shp_bytes[pos : pos + 8])
        pos += 8
        rec_len = content_words * 2
        shp_rec = shp_bytes[pos : pos + rec_len]
        pos += rec_len

        if rec is None or len(shp_rec) < 4:
            continue
        poa = (rec.get("POA_CODE21") or rec.get("POA_NAME21") or "").strip().zfill(4)
        if poa not in wanted:
            continue
        shape_type = struct.unpack("<i", shp_rec[:4])[0]
        if shape_type not in (5, 15, 25) or len(shp_rec) < 44:
            continue
        xmin, ymin, xmax, ymax = struct.unpack("<4d", shp_rec[4:36])
        num_parts, num_pts = struct.unpack("<ii", shp_rec[36:44])
        parts_end = 44 + 4 * num_parts
        parts = list(struct.unpack(f"<{num_parts}i", shp_rec[44:parts_end]))
        pts_end = parts_end + 16 * num_pts
        coords = struct.unpack(f"<{2 * num_pts}d", shp_rec[parts_end:pts_end])

        rings: list[list[list[float]]] = []
        for i, start in enumerate(parts):
            end = parts[i + 1] if i + 1 < num_parts else num_pts
            if end - start >= 3:
                rings.append([[coords[2 * j], coords[2 * j + 1]] for j in range(start, end)])
        if rings:
            polys.append({"poa": poa, "bbox": (xmin, ymin, xmax, ymax), "rings": rings})
    return polys


def interior_point(geom: dict) -> tuple[float, float] | None:
    """Return a guaranteed interior point of the largest outer ring via horizontal scanline."""
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon" and coords:
        ring = coords[0]
    elif gtype == "MultiPolygon" and coords:
        best_ring = None
        best_area = -1.0
        for poly in coords:
            if not poly or not poly[0]:
                continue
            r = poly[0]
            xs = [p[0] for p in r]
            ys = [p[1] for p in r]
            area = (max(xs) - min(xs)) * (max(ys) - min(ys))
            if area > best_area:
                best_area = area
                best_ring = r
        ring = best_ring
    else:
        return None

    if not ring or len(ring) < 3:
        return None
    ys = [p[1] for p in ring]
    cy = (min(ys) + max(ys)) / 2.0
    hits: list[float] = []
    n = len(ring)
    j = n - 1
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[j]
        if (y1 > cy) != (y2 > cy):
            hits.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
        j = i
    hits.sort()
    if len(hits) >= 2:
        best_span = -1.0
        best_x = hits[0]
        for k in range(0, len(hits) - 1, 2):
            span = hits[k + 1] - hits[k]
            if span > best_span:
                best_span = span
                best_x = (hits[k] + hits[k + 1]) / 2.0
        return best_x, cy
    xs = [p[0] for p in ring]
    return (min(xs) + max(xs)) / 2.0, cy


def match_poa(lon: float, lat: float, poa_polys: list[dict]) -> str | None:
    for item in poa_polys:
        xmin, ymin, xmax, ymax = item["bbox"]
        if xmin <= lon <= xmax and ymin <= lat <= ymax:
            inside = False
            for ring in item["rings"]:
                if point_in_ring(lon, lat, ring):
                    inside = not inside
            if inside:
                return item["poa"]

    best_poa = None
    best_d2 = 0.0025  # <= 0.05 deg fallback for coastal points
    for item in poa_polys:
        xmin, ymin, xmax, ymax = item["bbox"]
        dx = max(xmin - lon, 0.0, lon - xmax)
        dy = max(ymin - lat, 0.0, lat - ymax)
        d2 = dx * dx + dy * dy
        if d2 < best_d2:
            best_d2 = d2
            best_poa = item["poa"]
    return best_poa


def main() -> None:
    if not RAI_CSV.exists():
        raise FileNotFoundError(f"Missing {RAI_CSV}")
    download_if_missing(POA_URL, POA_ZIP)

    rai_by_poa = load_postcode_rai(RAI_CSV)
    print(f"Loaded {len(rai_by_poa)} postcodes with 2024-2025 RAI data")

    poa_polys = load_poa_polygons(POA_ZIP, set(rai_by_poa.keys()))
    print(f"Loaded {len(poa_polys)} ABS POA polygons matching RAI postcodes")

    sa2_geo = json.loads((WEB_DATA / "sa2_census_2021.geojson").read_text(encoding="utf-8"))
    sa2_out: dict[str, list] = {}
    sa2_pts: list[dict] = []

    for feat in sa2_geo["features"]:
        props = feat["properties"]
        code = str(props["code"])
        pt = interior_point(feat.get("geometry") or {})
        if not pt:
            continue
        poa = match_poa(pt[0], pt[1], poa_polys)
        if not poa or poa not in rai_by_poa:
            continue
        rai, period, chg5y = rai_by_poa[poa]
        sa2_out[code] = [rai, period, chg5y, poa]
        sa2_pts.append({
            "lon": pt[0],
            "lat": pt[1],
            "ste_name": props.get("ste_name"),
            "pop": max(1, int(props.get("pop") or 1)),
            "rai": rai,
            "chg5y": chg5y,
        })

    out_obj: dict[str, object] = {
        "period": "2025 Q2",
        "sa2": sa2_out,
    }

    for layer_key in ("lga", "sa3", "sa4", "ced", "sed"):
        idx = build_lga_spatial_index(WEB_DATA / f"{layer_key}_census_2021.geojson")
        buckets: dict[str, list[dict]] = defaultdict(list)
        for sp in sa2_pts:
            rcode, _ = find_lga(sp["lon"], sp["lat"], idx, ste_name=sp["ste_name"])
            if rcode:
                buckets[rcode].append(sp)
        layer_out: dict[str, list] = {}
        for rcode, items in buckets.items():
            tot_w = sum(x["pop"] for x in items)
            w_rai = round(sum(x["rai"] * x["pop"] for x in items) / tot_w)
            chg_items = [x for x in items if x["chg5y"] is not None]
            if chg_items:
                cw = sum(x["pop"] for x in chg_items)
                w_chg = round(sum(x["chg5y"] * x["pop"] for x in chg_items) / cw)
            else:
                w_chg = None
            layer_out[rcode] = [w_rai, "2025 Q2", w_chg, len(items)]
        out_obj[layer_key] = layer_out

    sa2_vals = sorted(v[0] for v in sa2_out.values())
    out_obj["national_med"] = sa2_vals[len(sa2_vals) // 2] if sa2_vals else None

    OUT_PATH.write_text(json.dumps(out_obj, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024.0
    counts = ", ".join(f"{k}={len(out_obj[k])}" for k in ("sa2", "lga", "sa3", "sa4", "ced", "sed"))
    print(f"Wrote {OUT_PATH.name} ({size_kb:.1f} KB, nat_med={out_obj['national_med']}): {counts}")


if __name__ == "__main__":
    main()
