#!/usr/bin/env python3
"""Validate generated GeoJSON/JSON datasets for completeness and regression guards."""

import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
WEB_DATA = BASE / "web" / "data"

CENSUS_KEYS = (
    "median_hhd_inc_wk",
    "median_prsnl_inc_wk",
    "median_rent_wk",
    "median_mortgage_mo",
    "avg_hhd_size",
    "median_age",
    "pct_born_overseas",
    "pct_affiliated",
    "pct_uni",
    "pct_citizen",
    "density_sqkm",
)

TENURE_KEYS = ("pct_owner", "pct_renter", "pct_social_housing")

LAYER_MIN_COUNTS = {
    "sa4": 85,
    "ced": 145,
    "sa3": 330,
    "sed": 400,
    "lga": 500,
    "sa2": 2400,
}


def load_json(path: Path) -> dict:
    if not path.exists():
        raise AssertionError(f"Missing required data file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []

    try:
        load_json(WEB_DATA / "ste_2021.geojson")
        national = load_json(WEB_DATA / "national_2021.json")
        cities = load_json(WEB_DATA / "cities_2021.json")
        states = load_json(WEB_DATA / "states_2021.json")
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1

    for key in CENSUS_KEYS + TENURE_KEYS:
        if key not in national:
            errors.append(f"national_2021.json missing key {key}")

    aff = national.get("pct_affiliated")
    if aff is None or not (50.0 <= aff <= 57.0):
        errors.append(f"national pct_affiliated out of expected range [50.0, 57.0]: {aff}")
    for key, lo, hi in (
        ("pct_owner", 65.0, 69.0),
        ("pct_renter", 29.0, 33.0),
        ("pct_social_housing", 3.0, 5.0),
    ):
        val = national.get(key)
        if val is None or not (lo <= val <= hi):
            errors.append(f"national {key} out of expected range [{lo}, {hi}]: {val}")

    for label, coll in (("cities_2021.json", cities), ("states_2021.json", states)):
        for entry_name, entry in coll.items():
            for key in ("pct_affiliated", *TENURE_KEYS):
                if key not in entry:
                    errors.append(f"{label}[{entry_name}] missing {key}")

    layers: dict[str, list[dict]] = {}
    for layer, min_count in LAYER_MIN_COUNTS.items():
        geo = load_json(WEB_DATA / f"{layer}_census_2021.geojson")
        feats = geo.get("features", [])
        layers[layer] = feats
        if len(feats) < min_count:
            errors.append(f"{layer}_census_2021.geojson has {len(feats)} features (< {min_count})")
        rankable = [f for f in feats if (f["properties"].get("pop") or 0) >= 500]
        if not rankable:
            errors.append(f"{layer}_census_2021.geojson has 0 rankable features")
        for f in rankable:
            p = f["properties"]
            for key in CENSUS_KEYS:
                if p.get(key) is None:
                    errors.append(f"{layer} {p.get('code')} ({p.get('name')}) missing {key}")
                    break
        tenure_ok = [
            f for f in rankable
            if all(f["properties"].get(k) is not None and 0.0 <= f["properties"][k] <= 100.0 for k in TENURE_KEYS)
        ]
        min_tenure = len(rankable) - (1 if layer == "sa2" else 0)
        if len(tenure_ok) < min_tenure:
            errors.append(f"{layer}_census_2021.geojson only has {len(tenure_ok)}/{len(rankable)} valid tenure features")

    # Regression guard: SED join by name must cover >= 400 seats and align NSW North Shore accurately
    sed_feats = layers.get("sed", [])
    sed_pop_count = sum(1 for f in sed_feats if f["properties"].get("pop") is not None)
    if sed_pop_count < 400:
        errors.append(f"sed_census_2021.geojson only has {sed_pop_count} populated seats (< 400)")
    north_shore = next(
        (
            f["properties"]
            for f in sed_feats
            if f["properties"].get("name") == "North Shore"
            and f["properties"].get("ste_name") == "New South Wales"
        ),
        None,
    )
    if not north_shore:
        errors.append("Missing North Shore (New South Wales) in sed_census_2021.geojson")
    else:
        if (north_shore.get("median_hhd_inc_wk") or 0) < 2500 or (north_shore.get("median_age") or 0) < 38:
            errors.append(
                f"SED North Shore mis-joined: inc={north_shore.get('median_hhd_inc_wk')}, age={north_shore.get('median_age')}"
            )

    # Regression guard: CED Sydney must match 2021 Sydney division (~204k pop, median age 33)
    ced_feats = layers.get("ced", [])
    sydney = next((f["properties"] for f in ced_feats if f["properties"].get("name") == "Sydney"), None)
    if not sydney:
        errors.append("Missing Sydney in ced_census_2021.geojson")
    else:
        if (sydney.get("pop") or 0) < 150000 or (sydney.get("median_age") or 99) > 36:
            errors.append(
                f"CED Sydney mis-joined: pop={sydney.get('pop')}, age={sydney.get('median_age')}"
            )

    # Regression guard: LGA crime coverage
    lga_feats = layers.get("lga", [])
    crime_count = sum(1 for f in lga_feats if f["properties"].get("crime_rate_100k") is not None)
    if crime_count < 270:
        errors.append(f"lga_census_2021.geojson only has {crime_count} crime LGAs (< 270)")

    # Regression guard: QLD Mesh Block centroids
    mb_path = WEB_DATA / "qld_mb_centroids.json"
    mb_data = load_json(mb_path)
    if len(mb_data) < 65000:
        errors.append(f"qld_mb_centroids.json has only {len(mb_data)} entries (< 65,000)")
    for mb_code, coords in list(mb_data.items())[:200]:
        lon, lat = coords
        if not (137.0 <= lon <= 154.5 and -30.0 <= lat <= -9.0):
            errors.append(f"qld_mb_centroids.json out-of-bounds coord for {mb_code}: {coords}")
            break

    # Regression guard: QLD NHW-to-LGA mapping
    nhw_data = load_json(WEB_DATA / "qld_nhw_by_lga.json")
    nhw_by_lga = nhw_data.get("by_lga", {})
    nhw_count = nhw_data.get("nhw_count", 0)
    if len(nhw_by_lga) != 78:
        errors.append(f"qld_nhw_by_lga.json has {len(nhw_by_lga)} QLD LGAs (expected 78)")
    if nhw_count < 800:
        errors.append(f"qld_nhw_by_lga.json only has {nhw_count} NHW areas (< 800)")
    bris = nhw_by_lga.get("31000")
    if not bris or bris.get("qps_name") != "Brisbane" or not bris.get("nhw"):
        errors.append("qld_nhw_by_lga.json missing valid Brisbane (31000) NHW mapping")

    # Regression guard: Recent incidents (RSS + SA)
    inc_data = load_json(WEB_DATA / "recent_incidents.json")
    rss_pins = inc_data.get("rss", [])
    sa_pins = inc_data.get("sa", [])
    valid_cats = {"violent", "property", "vehicle", "drugs_weapons", "other"}
    if len(rss_pins) < 20:
        errors.append(f"recent_incidents.json only has {len(rss_pins)} RSS pins (< 20)")
    if len(sa_pins) < 200:
        errors.append(f"recent_incidents.json only has {len(sa_pins)} SA pins (< 200)")
    for pin in rss_pins + sa_pins:
        lon, lat = pin.get("lon", 0), pin.get("lat", 0)
        if not (112.0 <= lon <= 155.0 and -44.0 <= lat <= -9.0):
            errors.append(f"recent_incidents.json out-of-bounds coord: {pin.get('id')} ({lon}, {lat})")
            break
        if pin.get("cat") not in valid_cats:
            errors.append(f"recent_incidents.json invalid category on {pin.get('id')}: {pin.get('cat')}")
            break

    # Regression guard: NSW FuelCheck prices
    fuel_data = load_json(WEB_DATA / "nsw_fuel_prices.json")
    fuel_stations = fuel_data.get("stations", [])
    fuel_stats = fuel_data.get("stats", {})
    if len(fuel_stations) < 1500:
        errors.append(f"nsw_fuel_prices.json only has {len(fuel_stations)} stations (< 1500)")
    if "E10" not in fuel_stats or "U91" not in fuel_stats:
        errors.append("nsw_fuel_prices.json stats missing E10 or U91")
    for st in fuel_stations:
        lon, lat = st.get("lon", 0), st.get("lat", 0)
        if not (140.0 <= lon <= 154.5 and -44.0 <= lat <= -28.0):
            errors.append(f"nsw_fuel_prices.json out-of-bounds coord on {st.get('code')}: ({lon}, {lat})")
            break
        if not st.get("lga_code"):
            errors.append(f"nsw_fuel_prices.json missing lga_code on {st.get('code')}")
            break
        if not st.get("sa2_code"):
            errors.append(f"nsw_fuel_prices.json missing sa2_code on {st.get('code')}")
            break
        prices = st.get("p") or {}
        if not prices or any(not (50.0 <= float(v) <= 600.0) for v in prices.values()):
            errors.append(f"nsw_fuel_prices.json invalid prices on {st.get('code')}: {prices}")
            break

    # Regression guard: SGS Rental Affordability Index (RAI)
    rai_data = load_json(WEB_DATA / "rai_2025.json")
    rai_sa2 = rai_data.get("sa2", {})
    rai_lga = rai_data.get("lga", {})
    if len(rai_sa2) < 1500:
        errors.append(f"rai_2025.json only has {len(rai_sa2)} SA2 entries (< 1500)")
    if len(rai_lga) < 350:
        errors.append(f"rai_2025.json only has {len(rai_lga)} LGA entries (< 350)")
    for layer_k in ("sa2", "lga", "sa3", "sa4", "ced", "sed"):
        for rcode, entry in list(rai_data.get(layer_k, {}).items())[:200]:
            val = entry[0] if isinstance(entry, list) and entry else 0
            if not (20 <= val <= 1000):
                errors.append(f"rai_2025.json invalid score on {layer_k}[{rcode}]: {entry}")
                break

    if errors:
        for err in errors:
            print(f"FAIL: {err}", file=sys.stderr)
        return 1

    print(
        f"OK: 6 layers validated | national pct_affiliated={aff}% | "
        f"SED pop={sed_pop_count}/{len(sed_feats)} | crime LGAs={crime_count} | "
        f"QLD MBs={len(mb_data):,} | NHW={nhw_count} | pins=({len(rss_pins)} RSS, {len(sa_pins)} SA) | "
        f"fuel={len(fuel_stations):,} | RAI=({len(rai_sa2):,} SA2, {len(rai_lga)} LGA)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
