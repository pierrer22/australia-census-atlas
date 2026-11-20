#!/usr/bin/env python3
"""Merge ABS 2021 Census G01/G02 CSVs + 2025 AEC Election CSVs into simplified GeoJSONs."""

import csv
import json
from pathlib import Path

BASE = Path("/home/pierre/census")
CSV_ROOT = BASE / "2021 Census GCP All Geographies for AUS"
AEC_ROOT = BASE / "aec"
WEB_DATA = BASE / "web" / "data"

LAYERS = [
    {
        "key": "sa4",
        "in_geo": "sa4_2021.geojson",
        "out_geo": "sa4_census_2021.geojson",
        "code_prop": "SA4_CODE21",
        "name_prop": "SA4_NAME21",
        "csv_dir": CSV_ROOT / "SA4" / "AUS",
        "g01": "2021Census_G01_AUST_SA4.csv",
        "g02": "2021Census_G02_AUST_SA4.csv",
        "csv_code_col": "SA4_CODE_2021",
        "code_prefix": "",
    },
    {
        "key": "sa3",
        "in_geo": "sa3_2021.geojson",
        "out_geo": "sa3_census_2021.geojson",
        "code_prop": "SA3_CODE21",
        "name_prop": "SA3_NAME21",
        "csv_dir": CSV_ROOT / "SA3" / "AUS",
        "g01": "2021Census_G01_AUST_SA3.csv",
        "g02": "2021Census_G02_AUST_SA3.csv",
        "csv_code_col": "SA3_CODE_2021",
        "code_prefix": "",
    },
    {
        "key": "lga",
        "in_geo": "lga_2021.geojson",
        "out_geo": "lga_census_2021.geojson",
        "code_prop": "LGA_CODE21",
        "name_prop": "LGA_NAME21",
        "csv_dir": CSV_ROOT / "LGA" / "AUS",
        "g01": "2021Census_G01_AUST_LGA.csv",
        "g02": "2021Census_G02_AUST_LGA.csv",
        "csv_code_col": "LGA_CODE_2021",
        "code_prefix": "LGA",
    },
    {
        "key": "ced",
        "in_geo": "ced_2025.geojson",
        "out_geo": "ced_census_2021.geojson",
        "code_prop": "CED_CODE25",
        "name_prop": "CED_NAME25",
        "area_prop": "AREASQKM",
        "csv_dir": CSV_ROOT / "CED" / "AUS",
        "g01": "2021Census_G01_AUST_CED.csv",
        "g02": "2021Census_G02_AUST_CED.csv",
        "csv_code_col": "CED_CODE_2021",
        "code_prefix": "CED",
    },
]


def load_csv_by_code(path: Path, code_col: str) -> dict[str, dict[str, float | str]]:
    rows = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row[code_col].strip()
            parsed: dict[str, float | str] = {}
            for k, v in row.items():
                if k == code_col:
                    parsed[k] = v
                else:
                    try:
                        parsed[k] = float(v) if "." in v else int(v)
                    except ValueError:
                        parsed[k] = v
            rows[code] = parsed
    return rows


def load_aec_2025() -> dict[str, dict]:
    tpp_rows: dict[str, dict] = {}
    with (AEC_ROOT / "HouseTppByDivisionDownload-31496.csv").open(newline="", encoding="utf-8") as f:
        next(f)
        for r in csv.DictReader(f):
            tpp_rows[r["DivisionNm"].strip().lower()] = {
                "alp_pct": float(r["Australian Labor Party Percentage"]),
                "coa_pct": float(r["Liberal/National Coalition Percentage"]),
                "swing": float(r["Swing"]),
                "total_votes": int(r["TotalVotes"]),
            }

    elected: dict[str, dict] = {}
    with (AEC_ROOT / "HouseMembersElectedDownload-31496.csv").open(newline="", encoding="utf-8") as f:
        next(f)
        for r in csv.DictReader(f):
            key = r["DivisionNm"].strip().lower()
            tpp = tpp_rows.get(key, {})
            elected[key] = {
                "aec_party": r["PartyAb"].strip(),
                "aec_party_name": r["PartyNm"].strip(),
                "aec_member": f"{r['GivenNm'].strip()} {r['Surname'].strip().title()}",
                "aec_alp_pct": tpp.get("alp_pct"),
                "aec_coa_pct": tpp.get("coa_pct"),
                "aec_swing": tpp.get("swing"),
                "aec_total_votes": tpp.get("total_votes"),
            }
    return elected


def extract_metrics(g1: dict, g2: dict, area_sqkm: float | None = None) -> dict:
    pop = g1.get("Tot_P_P", 0) or 1
    age_0_19 = (
        g1.get("Age_0_4_yr_P", 0)
        + g1.get("Age_5_14_yr_P", 0)
        + g1.get("Age_15_19_yr_P", 0)
    )
    age_20_64 = (
        g1.get("Age_20_24_yr_P", 0)
        + g1.get("Age_25_34_yr_P", 0)
        + g1.get("Age_35_44_yr_P", 0)
        + g1.get("Age_45_54_yr_P", 0)
        + g1.get("Age_55_64_yr_P", 0)
    )
    age_65_plus = (
        g1.get("Age_65_74_yr_P", 0)
        + g1.get("Age_75_84_yr_P", 0)
        + g1.get("Age_85ov_P", 0)
    )
    pop_15_plus = max(1, pop - g1.get("Age_0_4_yr_P", 0) - g1.get("Age_5_14_yr_P", 0))

    metrics = {
        "pop": int(g1.get("Tot_P_P", 0)),
        "median_hhd_inc_wk": int(g2.get("Median_tot_hhd_inc_weekly", 0)),
        "median_prsnl_inc_wk": int(g2.get("Median_tot_prsnl_inc_weekly", 0)),
        "median_rent_wk": int(g2.get("Median_rent_weekly", 0)),
        "median_mortgage_mo": int(g2.get("Median_mortgage_repay_monthly", 0)),
        "median_age": int(g2.get("Median_age_persons", 0)),
        "avg_hhd_size": float(g2.get("Average_household_size", 0)),
        "pct_born_overseas": round(100.0 * g1.get("Birthplace_Elsewhere_P", 0) / pop, 1),
        "pct_other_lang": round(100.0 * g1.get("Lang_used_home_Oth_Lang_P", 0) / pop, 1),
        "pct_indigenous": round(100.0 * g1.get("Indigenous_P_Tot_P", 0) / pop, 1),
        "pct_yr12": round(100.0 * g1.get("High_yr_schl_comp_Yr_12_eq_P", 0) / pop_15_plus, 1),
        "pct_age_0_19": round(100.0 * age_0_19 / pop, 1),
        "pct_age_20_64": round(100.0 * age_20_64 / pop, 1),
        "pct_age_65_plus": round(100.0 * age_65_plus / pop, 1),
    }
    if area_sqkm and area_sqkm > 0:
        metrics["density_sqkm"] = round(pop / area_sqkm, 1)
    return metrics


def ring_area(ring: list[list[float]]) -> float:
    total = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        total += (x1 * y2) - (x2 * y1)
    return total * 0.5


def fix_winding(geom: dict) -> None:
    """Ensure exterior rings are CW and hole rings are CCW for d3-geo spherical projection."""
    gtype = geom.get("type")
    if gtype == "Polygon":
        polys = [geom["coordinates"]]
    elif gtype == "MultiPolygon":
        polys = geom["coordinates"]
    else:
        return
    for poly in polys:
        for idx, ring in enumerate(poly):
            area = ring_area(ring)
            if (idx == 0 and area > 0) or (idx > 0 and area < 0):
                ring.reverse()


def main() -> None:
    aec_2025 = load_aec_2025()
    ced21_geo = json.loads((WEB_DATA / "ced_2021.geojson").read_text(encoding="utf-8"))
    ced21_name_to_code = {
        f["properties"]["CED_NAME21"].strip().lower(): f"CED{f['properties']['CED_CODE21']}"
        for f in ced21_geo["features"]
    }

    for cfg in LAYERS:
        g01 = load_csv_by_code(cfg["csv_dir"] / cfg["g01"], cfg["csv_code_col"])
        g02 = load_csv_by_code(cfg["csv_dir"] / cfg["g02"], cfg["csv_code_col"])

        geo = json.loads((WEB_DATA / cfg["in_geo"]).read_text(encoding="utf-8"))
        for feat in geo["features"]:
            fix_winding(feat["geometry"])
            props = feat["properties"]
            raw_code = str(props[cfg["code_prop"]])
            name = props[cfg["name_prop"]]
            if cfg["key"] == "ced":
                csv_key = ced21_name_to_code.get(name.strip().lower(), "")
            else:
                csv_key = raw_code if not cfg["code_prefix"] or raw_code.startswith(cfg["code_prefix"]) else f"{cfg['code_prefix']}{raw_code}"
            area = float(props.get(cfg.get("area_prop", "AREASQKM21")) or 0)
            m = extract_metrics(g01.get(csv_key, {}), g02.get(csv_key, {}), area) if csv_key in g01 else {}
            out_props = {
                "code": raw_code,
                "name": name,
                "ste_code": props["STE_CODE21"],
                "ste_name": props["STE_NAME21"],
                "area_sqkm": round(area, 1),
                **m,
            }
            if cfg["key"] == "ced":
                elec = aec_2025.get(name.strip().lower(), {})
                out_props.update(elec)
            feat["properties"] = out_props

        (WEB_DATA / cfg["out_geo"]).write_text(
            json.dumps(geo, separators=(",", ":")), encoding="utf-8"
        )
        print(f"Wrote {cfg['out_geo']}: {len(geo['features'])} features")

    csv_aus = CSV_ROOT / "AUS"
    g01_aus = load_csv_by_code(csv_aus / "2021Census_G01_AUS_AUS.csv", "AUS_CODE_2021")["AUS"]
    g02_aus = load_csv_by_code(csv_aus / "2021Census_G02_AUS_AUS.csv", "AUS_CODE_2021")["AUS"]
    national = extract_metrics(g01_aus, g02_aus, 7688095.0)
    (WEB_DATA / "national_2021.json").write_text(
        json.dumps(national, indent=2), encoding="utf-8"
    )

    ste_geo = json.loads((WEB_DATA / "ste_2021.geojson").read_text(encoding="utf-8"))
    for feat in ste_geo["features"]:
        fix_winding(feat["geometry"])
    (WEB_DATA / "ste_2021.geojson").write_text(
        json.dumps(ste_geo, separators=(",", ":")), encoding="utf-8"
    )
    print("Done.")


if __name__ == "__main__":
    main()
