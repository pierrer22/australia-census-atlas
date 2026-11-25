#!/usr/bin/env python3
"""Fetch Australia EV fast chargers (>= 50 kW) from Open Charge Map ocm-export into web/data/au_ev_chargers.json."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

from fetch_recent_incidents import build_lga_spatial_index, find_lga

BASE = Path(__file__).resolve().parent.parent
WEB_DATA = BASE / "web" / "data"
LGA_GEO = WEB_DATA / "lga_census_2021.geojson"
SA2_GEO = WEB_DATA / "sa2_census_2021.geojson"
OUT_PATH = WEB_DATA / "au_ev_chargers.json"

OCM_REPO = "https://github.com/openchargemap/ocm-export.git"
INACTIVE_STATUS_IDS = {100, 150, 200, 210}

STATE_MAP = {
    "NSW": "New South Wales",
    "NEW SOUTH WALES": "New South Wales",
    "VIC": "Victoria",
    "VICTORIA": "Victoria",
    "QLD": "Queensland",
    "QUEENSLAND": "Queensland",
    "WA": "Western Australia",
    "WESTERN AUSTRALIA": "Western Australia",
    "SA": "South Australia",
    "SOUTH AUSTRALIA": "South Australia",
    "TAS": "Tasmania",
    "TASMANIA": "Tasmania",
    "NT": "Northern Territory",
    "NORTHERN TERRITORY": "Northern Territory",
    "ACT": "Australian Capital Territory",
    "AUSTRALIAN CAPITAL TERRITORY": "Australian Capital Territory",
}

TECH_ORDER = {"CCS2": 0, "CHAdeMO": 1, "Tesla": 2, "Type 2": 3, "CCS1": 4}

DOLLAR_KWH_RE = re.compile(
    r"(?:AUD\s*\$|\$AU\s*|\$|AUD\s*)(\d+(?:\.\d{1,2})?)\s*(?:(?:/|per)\s*)?kWhr?\b",
    re.IGNORECASE,
)
CENT_KWH_RE = re.compile(
    r"\b(\d{2,3}(?:\.\d+)?)\s*(?:c|¢|cents?)\s*(?:(?:/|per)\s*)?kWhr?\b",
    re.IGNORECASE,
)
BARE_DOLLAR_RE = re.compile(r"^\s*(?:\$|AUD\s*\$?)?(\d\.\d{1,2})\s*(?:(?:/|per)\s*kWhr?)?\s*$", re.IGNORECASE)
BARE_CENT_RE = re.compile(r"\b(\d{2})\s*(?:c|¢|cents?)\b(?!\s*/\s*(?:min|hr|hour))", re.IGNORECASE)
FREE_PARKING_RE = re.compile(r"\bfree\s+(?:parking|wifi|wi-fi)\b", re.IGNORECASE)
FREE_WORD_RE = re.compile(r"\bfree\b", re.IGNORECASE)


def normalize_tech(conn_id: int | None, title: str) -> str:
    t = (title or "").strip()
    tl = t.lower()
    if conn_id == 33 or "ccs (type 2)" in tl or "ccs2" in tl:
        return "CCS2"
    if conn_id == 2 or "chademo" in tl:
        return "CHAdeMO"
    if conn_id in {8, 27, 30} or "tesla" in tl or "nacs" in tl:
        return "Tesla"
    if conn_id in {25, 1036} or "type 2" in tl:
        return "Type 2"
    if conn_id == 32 or "ccs (type 1)" in tl:
        return "CCS1"
    return t or "Other"


def parse_price_kwh(raw_cost: str) -> tuple[float | None, str]:
    cleaned = re.sub(r"\s+", " ", raw_cost or "").strip()
    if not cleaned:
        return None, ""

    rates: list[float] = []
    for m in DOLLAR_KWH_RE.finditer(cleaned):
        val = float(m.group(1))
        if 0.0 <= val <= 2.50:
            rates.append(round(val, 2))
    for m in CENT_KWH_RE.finditer(cleaned):
        val = float(m.group(1)) / 100.0
        if 0.0 <= val <= 2.50:
            rates.append(round(val, 2))

    if not rates:
        if cleaned == "0":
            rates.append(0.0)
        elif (bm := BARE_DOLLAR_RE.match(cleaned)):
            val = float(bm.group(1))
            if 0.0 <= val <= 2.50:
                rates.append(round(val, 2))
        else:
            for m in BARE_CENT_RE.finditer(cleaned):
                val = float(m.group(1)) / 100.0
                if 0.10 <= val <= 2.50:
                    rates.append(round(val, 2))

    if rates:
        return min(rates), cleaned[:90]

    stripped = FREE_PARKING_RE.sub("", cleaned)
    if FREE_WORD_RE.search(stripped):
        return 0.0, cleaned[:90]

    return None, cleaned[:90]


def clean_num(val: float) -> int | float:
    r = round(val, 1)
    return int(r) if r == int(r) else r


def percentile(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return round(sorted_vals[0], 2)
    pos = (len(sorted_vals) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = pos - lo
    return round(sorted_vals[lo] * (1.0 - frac) + sorted_vals[hi] * frac, 2)


def main() -> int:
    try:
        with tempfile.TemporaryDirectory(prefix="ocm_export_") as tmpdir:
            repo_dir = Path(tmpdir) / "ocm-export"
            subprocess.run(
                ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", OCM_REPO, str(repo_dir)],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=120,
            )
            subprocess.run(
                ["git", "-C", str(repo_dir), "sparse-checkout", "set", "--no-cone", "data/AU", "data/referencedata.json"],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=120,
            )

            ref_path = repo_dir / "data" / "referencedata.json"
            au_dir = repo_dir / "data" / "AU"
            ref = json.loads(ref_path.read_text(encoding="utf-8"))
            operators = {int(o["ID"]): str(o.get("Title") or "").strip() for o in ref.get("Operators", []) if o.get("ID") is not None}
            conn_types = {int(c["ID"]): str(c.get("Title") or "").strip() for c in ref.get("ConnectionTypes", []) if c.get("ID") is not None}

            lga_idx = build_lga_spatial_index(LGA_GEO)
            sa2_idx = build_lga_spatial_index(SA2_GEO)

            stations_out: list[dict] = []
            max_kws: list[float] = []
            prices: list[float] = []
            free_count = 0
            ultrafast_count = 0

            for fp in sorted(au_dir.glob("*.json")):
                try:
                    raw = json.loads(fp.read_text(encoding="utf-8"))
                except Exception:
                    continue

                if raw.get("StatusTypeID") in INACTIVE_STATUS_IDS:
                    continue

                addr_info = raw.get("AddressInfo") or {}
                try:
                    lon = float(addr_info.get("Longitude"))
                    lat = float(addr_info.get("Latitude"))
                except (TypeError, ValueError):
                    continue
                if not (112.0 <= lon <= 155.0 and -44.0 <= lat <= -9.0):
                    continue

                conn_agg: dict[tuple[str, float], int] = {}
                station_max_kw = 0.0
                for c in raw.get("Connections") or []:
                    if c.get("StatusTypeID") in INACTIVE_STATUS_IDS:
                        continue
                    try:
                        kw = float(c.get("PowerKW"))
                    except (TypeError, ValueError):
                        continue
                    if kw <= 0:
                        continue
                    cid = c.get("ConnectionTypeID")
                    cid_int = int(cid) if cid is not None else None
                    tech = normalize_tech(cid_int, conn_types.get(cid_int, "") if cid_int is not None else "")
                    qty_raw = c.get("Quantity")
                    try:
                        qty = max(1, int(qty_raw)) if qty_raw is not None else 1
                    except (TypeError, ValueError):
                        qty = 1
                    kw_clean = float(clean_num(kw))
                    conn_agg[(tech, kw_clean)] = conn_agg.get((tech, kw_clean), 0) + qty
                    if kw_clean > station_max_kw:
                        station_max_kw = kw_clean

                if station_max_kw < 50.0:
                    continue

                lon_r = round(lon, 4)
                lat_r = round(lat, 4)
                st_raw = str(addr_info.get("StateOrProvince") or "").strip().upper()
                ste_hint = STATE_MAP.get(st_raw)
                lga_code, lga_name = find_lga(lon_r, lat_r, lga_idx, ste_name=ste_hint)
                if not lga_code and ste_hint:
                    lga_code, lga_name = find_lga(lon_r, lat_r, lga_idx, ste_name=None)
                if not lga_code:
                    continue

                sa2_code, sa2_name = find_lga(lon_r, lat_r, sa2_idx, ste_name=ste_hint)
                if not sa2_code and ste_hint:
                    sa2_code, sa2_name = find_lga(lon_r, lat_r, sa2_idx, ste_name=None)

                conns = sorted(
                    [[tech, clean_num(kw), qty] for (tech, kw), qty in conn_agg.items()],
                    key=lambda item: (-item[1], TECH_ORDER.get(item[0], 99), item[0]),
                )
                techs = sorted(
                    {item[0] for item in conns},
                    key=lambda t: (TECH_ORDER.get(t, 99), t),
                )

                price_kwh, cost_str = parse_price_kwh(str(raw.get("UsageCost") or ""))
                op_id = raw.get("OperatorID")
                op_name = operators.get(int(op_id), "") if op_id is not None else ""
                if op_name in {"(Unknown Operator)", "(Business Owner at Location)"}:
                    op_name = ""

                addr_parts = [
                    str(addr_info.get("AddressLine1") or "").strip(),
                    str(addr_info.get("Town") or "").strip(),
                    str(addr_info.get("StateOrProvince") or "").strip(),
                ]
                addr_str = ", ".join(p for p in addr_parts if p)

                pts_raw = raw.get("NumberOfPoints")
                try:
                    pts = int(pts_raw) if pts_raw else sum(item[2] for item in conns)
                except (TypeError, ValueError):
                    pts = sum(item[2] for item in conns)

                upd = str(raw.get("DateLastVerified") or raw.get("DateLastStatusUpdate") or "")[:10]

                mkw = clean_num(station_max_kw)
                max_kws.append(float(mkw))
                if mkw >= 150:
                    ultrafast_count += 1
                if price_kwh is not None:
                    prices.append(price_kwh)
                    if price_kwh == 0.0:
                        free_count += 1

                stations_out.append({
                    "id": int(raw["ID"]),
                    "name": str(addr_info.get("Title") or f"Station {raw['ID']}").strip(),
                    "op": op_name,
                    "addr": addr_str,
                    "lon": lon_r,
                    "lat": lat_r,
                    "lga_code": lga_code,
                    "lga_name": lga_name,
                    "sa2_code": sa2_code or "",
                    "sa2_name": sa2_name or "",
                    "max_kw": mkw,
                    "techs": techs,
                    "conns": conns,
                    "price_kwh": price_kwh,
                    "cost": cost_str,
                    "pts": pts,
                    "upd": upd,
                })
    except Exception as exc:
        print(f"[WARN] EV charger fetch failed ({exc}) — preserving existing {OUT_PATH.name}.")
        return 0

    max_kws.sort()
    prices.sort()
    stats = {
        "count": len(stations_out),
        "ultrafast_count": ultrafast_count,
        "priced_count": len(prices),
        "free_count": free_count,
        "median_kw": clean_num(percentile(max_kws, 0.50)) if max_kws else 0,
        "max_kw": clean_num(max_kws[-1]) if max_kws else 0,
        "min_price": round(prices[0], 2) if prices else None,
        "p10_price": percentile(prices, 0.10) if prices else None,
        "median_price": percentile(prices, 0.50) if prices else None,
        "p90_price": percentile(prices, 0.90) if prices else None,
        "max_price": round(prices[-1], 2) if prices else None,
    }

    out_obj = {
        "source": "Open Charge Map (ocm-export)",
        "station_count": len(stations_out),
        "stats": stats,
        "stations": stations_out,
    }
    OUT_PATH.write_text(json.dumps(out_obj, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024.0
    print(f"Wrote {OUT_PATH.name}: {len(stations_out):,} fast stations ({size_kb:.1f} KB) | stats={stats}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
