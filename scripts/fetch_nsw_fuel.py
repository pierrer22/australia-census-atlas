#!/usr/bin/env python3
"""Fetch NSW FuelCheck v2 prices & station locations into compact web/data/nsw_fuel_prices.json."""

from __future__ import annotations

import base64
import datetime as dt
import json
import os
import urllib.request
import uuid
from pathlib import Path

from fetch_recent_incidents import build_lga_spatial_index, find_lga

BASE = Path(__file__).resolve().parent.parent
WEB_DATA = BASE / "web" / "data"
LGA_GEO = WEB_DATA / "lga_census_2021.geojson"
OUT_PATH = WEB_DATA / "nsw_fuel_prices.json"
ENV_PATH = BASE / ".env"

TOKEN_URL = "https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials"
PRICES_URL = "https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices"
FUEL_ORDER = ["E10", "U91", "P95", "P98", "DL", "PDL", "LPG", "E85", "B20"]
UA = "AustraliaCensusAtlas/1.0 (+https://github.com/pierrer22/australia-census-atlas)"


def load_creds() -> tuple[str, str]:
    key = os.environ.get("NSW_FUEL_API_KEY", "").strip()
    secret = os.environ.get("NSW_FUEL_API_SECRET", "").strip()
    if (not key or not secret) and ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k == "NSW_FUEL_API_KEY" and not key:
                key = v
            elif k == "NSW_FUEL_API_SECRET" and not secret:
                secret = v
    return key, secret


def fetch_token(key: str, secret: str) -> str:
    raw_auth = base64.b64encode(f"{key}:{secret}".encode("utf-8")).decode("ascii")
    req = urllib.request.Request(
        TOKEN_URL,
        headers={"Authorization": f"Basic {raw_auth}", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))["access_token"]


def fetch_prices_payload(key: str, token: str) -> dict:
    ts = dt.datetime.now(dt.timezone.utc).strftime("%d/%m/%Y %I:%M:%S %p")
    req = urllib.request.Request(
        PRICES_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "apikey": key,
            "transactionid": str(uuid.uuid4()),
            "requesttimestamp": ts,
            "states": "NSW|TAS",
            "User-Agent": UA,
        },
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))


def percentile(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return round(sorted_vals[0], 1)
    pos = (len(sorted_vals) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = pos - lo
    return round(sorted_vals[lo] * (1.0 - frac) + sorted_vals[hi] * frac, 1)


def main() -> int:
    key, secret = load_creds()
    if not key or not secret:
        print("[WARN] Missing NSW_FUEL_API_KEY / NSW_FUEL_API_SECRET — skipping fuel refresh.")
        return 0

    try:
        token = fetch_token(key, secret)
        payload = fetch_prices_payload(key, token)
    except Exception as exc:
        print(f"[WARN] FuelCheck fetch failed ({exc}) — preserving existing {OUT_PATH.name}.")
        return 0

    prices_by_station: dict[str, dict[str, float]] = {}
    latest_by_station: dict[str, str] = {}
    for row in payload.get("prices", []):
        scode = str(row.get("stationcode", "")).strip()
        ftype = str(row.get("fueltype", "")).strip()
        try:
            pval = float(row.get("price"))
        except (TypeError, ValueError):
            continue
        if not scode or not ftype or not (50.0 <= pval <= 600.0):
            continue
        prices_by_station.setdefault(scode, {})[ftype] = round(pval, 1)
        upd = str(row.get("lastupdated") or "").strip()[:10]
        if upd and upd > latest_by_station.get(scode, ""):
            latest_by_station[scode] = upd

    full_idx = build_lga_spatial_index(LGA_GEO)
    nsw_tas_act_idx = [
        x for x in full_idx
        if x["ste_name"] in {"New South Wales", "Tasmania", "Australian Capital Territory"}
    ]

    stations_out: list[dict] = []
    vals_by_fuel: dict[str, list[float]] = {}

    for st in payload.get("stations", []):
        scode = str(st.get("code", "")).strip()
        pmap = prices_by_station.get(scode)
        if not pmap:
            continue
        loc = st.get("location") or {}
        try:
            lon = float(loc.get("longitude"))
            lat = float(loc.get("latitude"))
        except (TypeError, ValueError):
            continue
        if not (140.0 <= lon <= 154.5 and -44.0 <= lat <= -28.0):
            continue

        lon_r = round(lon, 4)
        lat_r = round(lat, 4)
        st_state = str(st.get("state") or "NSW").strip().upper()
        ste_hint = "Tasmania" if st_state == "TAS" else None
        lga_code, lga_name = find_lga(lon_r, lat_r, nsw_tas_act_idx, ste_name=ste_hint)
        if not lga_code:
            lga_code, lga_name = find_lga(lon_r, lat_r, nsw_tas_act_idx, ste_name=None)
        if not lga_code:
            continue

        for ft, pv in pmap.items():
            vals_by_fuel.setdefault(ft, []).append(pv)

        stations_out.append({
            "code": scode,
            "brand": str(st.get("brand") or "").strip(),
            "name": str(st.get("name") or "").strip(),
            "addr": str(st.get("address") or "").strip(),
            "lon": lon_r,
            "lat": lat_r,
            "lga_code": lga_code,
            "lga_name": lga_name,
            "p": pmap,
            "upd": latest_by_station.get(scode, ""),
        })

    stats: dict[str, dict] = {}
    fuel_types: list[str] = []
    for ft in FUEL_ORDER:
        vals = sorted(vals_by_fuel.get(ft, []))
        if len(vals) < 10:
            continue
        fuel_types.append(ft)
        stats[ft] = {
            "min": round(vals[0], 1),
            "p10": percentile(vals, 0.10),
            "p25": percentile(vals, 0.25),
            "median": percentile(vals, 0.50),
            "p75": percentile(vals, 0.75),
            "p90": percentile(vals, 0.90),
            "max": round(vals[-1], 1),
            "count": len(vals),
        }

    out_obj = {
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "station_count": len(stations_out),
        "fuel_types": fuel_types,
        "stats": stats,
        "stations": stations_out,
    }
    OUT_PATH.write_text(json.dumps(out_obj, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024.0
    print(f"Wrote {OUT_PATH.name}: {len(stations_out):,} stations ({size_kb:.1f} KB) | fuels={fuel_types}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
