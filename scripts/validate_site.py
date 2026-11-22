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

    for key in CENSUS_KEYS:
        if key not in national:
            errors.append(f"national_2021.json missing key {key}")

    aff = national.get("pct_affiliated")
    if aff is None or not (50.0 <= aff <= 57.0):
        errors.append(f"national pct_affiliated out of expected range [50.0, 57.0]: {aff}")

    for label, coll in (("cities_2021.json", cities), ("states_2021.json", states)):
        for entry_name, entry in coll.items():
            if "pct_affiliated" not in entry:
                errors.append(f"{label}[{entry_name}] missing pct_affiliated")

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

    if errors:
        for err in errors:
            print(f"FAIL: {err}", file=sys.stderr)
        return 1

    print(
        f"OK: 6 layers validated | national pct_affiliated={aff}% | "
        f"SED pop={sed_pop_count}/{len(sed_feats)} | crime LGAs={crime_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
