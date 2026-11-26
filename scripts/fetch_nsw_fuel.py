#!/usr/bin/env python3
"""Fetch NSW FuelCheck v2 prices & station locations into compact web/data/nsw_fuel_prices.json."""

from __future__ import annotations

import base64
import datetime as dt
import hashlib
import json
import os
import urllib.request
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

from fetch_recent_incidents import build_lga_spatial_index, find_lga

BASE = Path(__file__).resolve().parent.parent
WEB_DATA = BASE / "web" / "data"
LGA_GEO = WEB_DATA / "lga_census_2021.geojson"
SA2_GEO = WEB_DATA / "sa2_census_2021.geojson"
OUT_PATH = WEB_DATA / "nsw_fuel_prices.json"
ENV_PATH = BASE / ".env"

TOKEN_URL = "https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials"
PRICES_URL = "https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices?states=NSW%7CTAS"
WA_RSS_URL = "https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS?Product={prod}&Day=today"
WA_PRODUCTS = [(1, "U91"), (2, "P95"), (4, "DL"), (5, "LPG"), (6, "P98"), (10, "E85"), (11, "PDL")]
QLD_API_BASE = "https://fppdirectapi-prod.fuelpricesqld.com.au"
SA_DEFAULT_API_BASE = "https://fppdirectapi-prod.safuelpricinginformation.com.au"
VIC_PRICES_URL = "https://api.fuel.service.vic.gov.au/open-data/v1/fuel/prices"
FUEL_ORDER = ["E10", "U91", "P95", "P98", "DL", "PDL", "LPG", "E85", "B20"]
STATE_ORDER = ["NSW", "ACT", "VIC", "QLD", "SA", "WA", "TAS", "NT"]
LGA_PREFIX_TO_STATE = {
    "1": "NSW",
    "2": "VIC",
    "3": "QLD",
    "4": "SA",
    "5": "WA",
    "6": "TAS",
    "7": "NT",
    "8": "ACT",
}
FUEL_ALIASES = {
    "e10": "E10",
    "unleaded 91 e10": "E10",
    "ethanol 91": "E10",
    "e10 unleaded": "E10",
    "u91": "U91",
    "ulp": "U91",
    "unleaded": "U91",
    "unleaded 91": "U91",
    "regular unleaded": "U91",
    "91": "U91",
    "p95": "P95",
    "pulp": "P95",
    "pulp 95": "P95",
    "premium 95": "P95",
    "premium unleaded 95": "P95",
    "95": "P95",
    "p98": "P98",
    "pulp 98": "P98",
    "premium 98": "P98",
    "premium unleaded 98": "P98",
    "98": "P98",
    "dl": "DL",
    "diesel": "DL",
    "dsl": "DL",
    "pdl": "PDL",
    "premium diesel": "PDL",
    "pdsl": "PDL",
    "brand diesel": "PDL",
    "lpg": "LPG",
    "autogas": "LPG",
    "e85": "E85",
    "b20": "B20",
    "biodiesel": "B20",
    "biodiesel 20": "B20",
}
UA = "AustraliaCensusAtlas/1.0 (+https://github.com/pierrer22/australia-census-atlas)"


def load_env() -> dict[str, str]:
    """Load credentials from .env (if present) and overlay process environment variables."""
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and v:
                env[k] = v
    for k, v in os.environ.items():
        val = v.strip()
        if val:
            env[k] = val
    return env


def normalize_fuel_type(raw: str) -> str | None:
    """Normalize provider fuel labels/codes into FUEL_ORDER keys."""
    if not raw:
        return None
    cleaned = " ".join(str(raw).strip().lower().replace("_", " ").replace("-", " ").split())
    if cleaned in FUEL_ALIASES:
        return FUEL_ALIASES[cleaned]
    if "e10" in cleaned:
        return "E10"
    if "e85" in cleaned:
        return "E85"
    if "b20" in cleaned or "biodiesel" in cleaned:
        return "B20"
    if "lpg" in cleaned or "autogas" in cleaned:
        return "LPG"
    if "diesel" in cleaned or cleaned in {"dl", "pdl", "dsl", "pdsl"}:
        return "PDL" if ("prem" in cleaned or cleaned.startswith("p")) else "DL"
    if "98" in cleaned:
        return "P98"
    if "95" in cleaned:
        return "P95"
    if "91" in cleaned or cleaned in {"ulp", "unleaded"}:
        return "U91"
    return None


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


def fetch_wa_fuelwatch(wa_lga_idx: list[dict], wa_sa2_idx: list[dict]) -> list[dict]:
    """Fetch daily FuelWatch WA stations from public RSS feeds (no API key required)."""
    grouped: dict[tuple[float, float, str], dict] = {}
    for prod_id, ftype in WA_PRODUCTS:
        url = WA_RSS_URL.format(prod=prod_id)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                root = ET.fromstring(r.read())
        except Exception as exc:
            print(f"[WARN] WA FuelWatch Product={prod_id} ({ftype}) failed: {exc}")
            continue

        for item in root.findall("./channel/item"):
            try:
                lon = float((item.findtext("longitude") or "").strip())
                lat = float((item.findtext("latitude") or "").strip())
                pval = float((item.findtext("price") or "").strip())
            except (TypeError, ValueError):
                continue
            if not (112.0 <= lon <= 129.5 and -35.5 <= lat <= -13.0) or not (50.0 <= pval <= 600.0):
                continue

            name = (item.findtext("trading-name") or "").strip()
            if not name:
                continue
            lon_r = round(lon, 4)
            lat_r = round(lat, 4)
            key = (lon_r, lat_r, name)
            entry = grouped.get(key)
            if entry is None:
                brand = (item.findtext("brand") or "").strip()
                address = (item.findtext("address") or "").strip()
                loc = (item.findtext("location") or "").strip()
                upd = (item.findtext("date") or "").strip()[:10]
                addr_parts = [p for p in (address, loc.title() if loc else "", "WA") if p]
                entry = {
                    "name": name,
                    "brand": brand,
                    "addr": ", ".join(addr_parts),
                    "lon": lon_r,
                    "lat": lat_r,
                    "p": {},
                    "upd": upd,
                }
                grouped[key] = entry
            entry["p"][ftype] = round(pval, 1)

    wa_stations: list[dict] = []
    for (lon_r, lat_r, name), st in grouped.items():
        lga_code, lga_name = find_lga(lon_r, lat_r, wa_lga_idx, ste_name="Western Australia")
        if not lga_code:
            continue
        sa2_code, sa2_name = find_lga(lon_r, lat_r, wa_sa2_idx, ste_name="Western Australia")
        digest = hashlib.md5(f"{lon_r}:{lat_r}:{name}".encode("utf-8")).hexdigest()[:8]
        wa_stations.append({
            "code": f"WA-{digest}",
            "brand": st["brand"],
            "name": st["name"],
            "addr": st["addr"],
            "lon": lon_r,
            "lat": lat_r,
            "lga_code": lga_code,
            "lga_name": lga_name,
            "sa2_code": sa2_code or "",
            "sa2_name": sa2_name or "",
            "p": st["p"],
            "upd": st["upd"],
        })
    return wa_stations


def _fetch_json(url: str, headers: dict[str, str], timeout: int = 25) -> dict | list:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_fpp_direct(
    token: str,
    state_code: str,
    ste_name: str,
    base_url: str,
    geo_region_id: int,
    bbox: tuple[float, float, float, float],
    lga_idx: list[dict],
    sa2_idx: list[dict],
) -> list[dict]:
    """Fetch Informed Sources (FPP Direct) fuel prices for QLD or SA."""
    try:
        headers = {
            "Authorization": f"FPDAPI SubscriberToken={token}",
            "Content-Type": "application/json",
            "User-Agent": UA,
        }
        base = base_url.rstrip("/")
        fuels_payload = _fetch_json(f"{base}/Subscriber/GetCountryFuelTypes?countryId=21", headers)
        fuel_id_map: dict[int, str] = {}
        fuel_items = fuels_payload.get("Fuels", []) if isinstance(fuels_payload, dict) else fuels_payload
        for f in fuel_items or []:
            fid = f.get("FuelId")
            norm = normalize_fuel_type(f.get("Name") or f.get("FuelType") or f.get("Code") or "")
            if fid is not None and norm:
                fuel_id_map[int(fid)] = norm

        brands_payload = _fetch_json(f"{base}/Subscriber/GetCountryBrands?countryId=21", headers)
        brand_id_map: dict[int, str] = {}
        brand_items = brands_payload.get("Brands", []) if isinstance(brands_payload, dict) else brands_payload
        for b in brand_items or []:
            bid = b.get("BrandId")
            bname = str(b.get("Name") or "").strip()
            if bid is not None and bname:
                brand_id_map[int(bid)] = bname

        sites_payload = _fetch_json(
            f"{base}/Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=3&geoRegionId={geo_region_id}",
            headers,
        )
        prices_payload = _fetch_json(
            f"{base}/Price/GetSitesPrices?countryId=21&geoRegionLevel=3&geoRegionId={geo_region_id}",
            headers,
        )

        prices_by_site: dict[str, dict[str, float]] = {}
        latest_by_site: dict[str, str] = {}
        price_items = prices_payload.get("SitePrices", []) if isinstance(prices_payload, dict) else prices_payload
        for row in price_items or []:
            sid = str(row.get("SiteId") or "").strip()
            fid = row.get("FuelId")
            if not sid or fid is None:
                continue
            ftype = fuel_id_map.get(int(fid))
            if not ftype:
                continue
            try:
                pval = float(row.get("Price"))
            except (TypeError, ValueError):
                continue
            if pval > 600.0:
                pval = pval / 10.0
            if not (50.0 <= pval <= 600.0):
                continue
            prices_by_site.setdefault(sid, {})[ftype] = round(pval, 1)
            upd = str(row.get("TransactionDateUtc") or row.get("LastUpdated") or "").strip()[:10]
            if upd and upd > latest_by_site.get(sid, ""):
                latest_by_site[sid] = upd

        min_lon, max_lon, min_lat, max_lat = bbox
        site_items = sites_payload.get("S", []) if isinstance(sites_payload, dict) else sites_payload
        stations_out: list[dict] = []
        for s in site_items or []:
            sid = str(s.get("S") if s.get("S") is not None else s.get("SiteId") or "").strip()
            pmap = prices_by_site.get(sid)
            if not sid or not pmap:
                continue
            try:
                lat = float(s.get("Lat") if s.get("Lat") is not None else s.get("Latitude"))
                lon = float(s.get("Lng") if s.get("Lng") is not None else s.get("Longitude"))
            except (TypeError, ValueError):
                continue
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                continue

            lon_r = round(lon, 4)
            lat_r = round(lat, 4)
            lga_code, lga_name = find_lga(lon_r, lat_r, lga_idx, ste_name=ste_name)
            if not lga_code:
                continue
            sa2_code, sa2_name = find_lga(lon_r, lat_r, sa2_idx, ste_name=ste_name)

            bid = s.get("B") if s.get("B") is not None else s.get("BrandId")
            brand = brand_id_map.get(int(bid), "") if bid is not None else str(s.get("Brand") or "").strip()
            name = str(s.get("N") if s.get("N") is not None else s.get("Name") or "").strip()
            addr_raw = str(s.get("A") if s.get("A") is not None else s.get("Address") or "").strip()
            postcode = str(s.get("P") if s.get("P") is not None else s.get("Postcode") or "").strip()
            addr = ", ".join(p for p in (addr_raw, f"{state_code} {postcode}".strip() if postcode else state_code) if p)

            stations_out.append({
                "code": f"{state_code}-{sid}",
                "brand": brand,
                "name": name or f"{brand} {state_code}".strip(),
                "addr": addr,
                "lon": lon_r,
                "lat": lat_r,
                "lga_code": lga_code,
                "lga_name": lga_name,
                "sa2_code": sa2_code or "",
                "sa2_name": sa2_name or "",
                "p": pmap,
                "upd": latest_by_site.get(sid, ""),
            })
        return stations_out
    except Exception as exc:
        print(f"[WARN] {state_code} fuel fetch failed: {exc}")
        return []


def fetch_vic_servo_saver(consumer_id: str, lga_idx: list[dict], sa2_idx: list[dict]) -> list[dict]:
    """Fetch Service Victoria Servo Saver Open Data fuel prices."""
    try:
        headers = {
            "x-consumer-id": consumer_id,
            "x-transactionid": str(uuid.uuid4()),
            "User-Agent": UA,
        }
        payload = _fetch_json(VIC_PRICES_URL, headers)
        details = payload.get("fuelPriceDetails", []) if isinstance(payload, dict) else payload
        stations_out: list[dict] = []
        for entry in details or []:
            st = entry.get("fuelStation") or entry.get("station") or entry
            sid = str(st.get("id") or st.get("stationId") or "").strip()
            loc = st.get("location") or {}
            try:
                lat = float(loc.get("latitude") if loc.get("latitude") is not None else st.get("latitude"))
                lon = float(loc.get("longitude") if loc.get("longitude") is not None else st.get("longitude"))
            except (TypeError, ValueError):
                continue
            if not sid or not (140.9 <= lon <= 150.1 and -39.2 <= lat <= -33.9):
                continue

            pmap: dict[str, float] = {}
            latest_upd = ""
            for fp in entry.get("fuelPrices") or entry.get("prices") or []:
                ftype = normalize_fuel_type(fp.get("fuelType") or fp.get("fuelCode") or "")
                if not ftype:
                    continue
                try:
                    pval = float(fp.get("price"))
                except (TypeError, ValueError):
                    continue
                if pval > 600.0:
                    pval = pval / 10.0
                if not (50.0 <= pval <= 600.0):
                    continue
                pmap[ftype] = round(pval, 1)
                upd = str(fp.get("updatedAt") or fp.get("lastUpdated") or "").strip()[:10]
                if upd and upd > latest_upd:
                    latest_upd = upd
            if not pmap:
                continue

            lon_r = round(lon, 4)
            lat_r = round(lat, 4)
            lga_code, lga_name = find_lga(lon_r, lat_r, lga_idx, ste_name="Victoria")
            if not lga_code:
                continue
            sa2_code, sa2_name = find_lga(lon_r, lat_r, sa2_idx, ste_name="Victoria")

            brand = str(st.get("brand") or st.get("brandName") or st.get("brandId") or "").strip()
            name = str(st.get("name") or "").strip()
            addr = str(st.get("address") or "").strip()

            stations_out.append({
                "code": f"VIC-{sid}",
                "brand": brand,
                "name": name or f"{brand} VIC".strip(),
                "addr": addr,
                "lon": lon_r,
                "lat": lat_r,
                "lga_code": lga_code,
                "lga_name": lga_name,
                "sa2_code": sa2_code or "",
                "sa2_name": sa2_name or "",
                "p": pmap,
                "upd": latest_upd,
            })
        return stations_out
    except Exception as exc:
        print(f"[WARN] VIC Servo Saver fetch failed: {exc}")
        return []


def main() -> int:
    env = load_env()
    key = env.get("NSW_FUEL_API_KEY", "")
    secret = env.get("NSW_FUEL_API_SECRET", "")
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
    wa_lga_idx = [x for x in full_idx if x["ste_name"] == "Western Australia"]
    full_sa2_idx = build_lga_spatial_index(SA2_GEO)
    nsw_tas_act_sa2_idx = [
        x for x in full_sa2_idx
        if x["ste_name"] in {"New South Wales", "Tasmania", "Australian Capital Territory"}
    ]
    wa_sa2_idx = [x for x in full_sa2_idx if x["ste_name"] == "Western Australia"]

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

        sa2_code, sa2_name = find_lga(lon_r, lat_r, nsw_tas_act_sa2_idx, ste_name=ste_hint)
        if not sa2_code:
            sa2_code, sa2_name = find_lga(lon_r, lat_r, nsw_tas_act_sa2_idx, ste_name=None)

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
            "sa2_code": sa2_code,
            "sa2_name": sa2_name,
            "p": pmap,
            "upd": latest_by_station.get(scode, ""),
        })

    extra_stations = list(fetch_wa_fuelwatch(wa_lga_idx, wa_sa2_idx))

    qld_token = env.get("QLD_FUEL_TOKEN", "")
    if qld_token:
        qld_lga_idx = [x for x in full_idx if x["ste_name"] == "Queensland"]
        qld_sa2_idx = [x for x in full_sa2_idx if x["ste_name"] == "Queensland"]
        extra_stations.extend(
            fetch_fpp_direct(
                qld_token, "QLD", "Queensland", QLD_API_BASE, 1,
                (137.9, 154.0, -29.3, -9.0), qld_lga_idx, qld_sa2_idx,
            )
        )

    sa_token = env.get("SA_FUEL_TOKEN", "")
    if sa_token:
        sa_base = env.get("SA_FUEL_API_BASE", SA_DEFAULT_API_BASE)
        sa_lga_idx = [x for x in full_idx if x["ste_name"] == "South Australia"]
        sa_sa2_idx = [x for x in full_sa2_idx if x["ste_name"] == "South Australia"]
        extra_stations.extend(
            fetch_fpp_direct(
                sa_token, "SA", "South Australia", sa_base, 4,
                (128.9, 141.1, -38.2, -25.9), sa_lga_idx, sa_sa2_idx,
            )
        )

    vic_consumer_id = env.get("VIC_FUEL_CONSUMER_ID", "")
    if vic_consumer_id:
        vic_lga_idx = [x for x in full_idx if x["ste_name"] == "Victoria"]
        vic_sa2_idx = [x for x in full_sa2_idx if x["ste_name"] == "Victoria"]
        extra_stations.extend(
            fetch_vic_servo_saver(vic_consumer_id, vic_lga_idx, vic_sa2_idx)
        )

    for st in extra_stations:
        for ft, pv in st["p"].items():
            vals_by_fuel.setdefault(ft, []).append(pv)
        stations_out.append(st)

    state_counts: dict[str, int] = {}
    for st in stations_out:
        pref = str(st.get("lga_code") or "")[:1]
        scode = LGA_PREFIX_TO_STATE.get(pref)
        if scode:
            state_counts[scode] = state_counts.get(scode, 0) + 1
    states_present = [s for s in STATE_ORDER if state_counts.get(s, 0) > 0]

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
        "states": states_present,
        "station_count": len(stations_out),
        "fuel_types": fuel_types,
        "stats": stats,
        "stations": stations_out,
    }
    OUT_PATH.write_text(json.dumps(out_obj, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024.0
    counts_str = ", ".join(f"{s}={state_counts[s]}" for s in states_present)
    print(f"Wrote {OUT_PATH.name}: {len(stations_out):,} stations ({size_kb:.1f} KB) | {counts_str} | fuels={fuel_types}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
