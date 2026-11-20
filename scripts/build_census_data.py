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
        "key": "sa2",
        "in_geo": "sa2_2021.geojson",
        "out_geo": "sa2_census_2021.geojson",
        "code_prop": "SA2_CODE21",
        "name_prop": "SA2_NAME21",
        "csv_dir": CSV_ROOT / "SA2" / "AUS",
        "g01": "2021Census_G01_AUST_SA2.csv",
        "g02": "2021Census_G02_AUST_SA2.csv",
        "csv_code_col": "SA2_CODE_2021",
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
    {
        "key": "sed",
        "in_geo": "sed_2025.geojson",
        "out_geo": "sed_census_2021.geojson",
        "code_prop": "SED_CODE25",
        "name_prop": "SED_NAME25",
        "area_prop": "AREASQKM",
        "csv_dir": CSV_ROOT / "SED" / "AUS",
        "g01": "2021Census_G01_AUST_SED.csv",
        "g02": "2021Census_G02_AUST_SED.csv",
        "csv_code_col": "SED_CODE_2021",
        "code_prefix": "SED",
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


SKIP_COB = {"P_Australia_Tot", "P_Elsewhere_Tot", "P_COB_NS_Tot", "P_Tot_Tot"}
COB_NAMES = {
    "Bosnia_Herzegov": "Bosnia & Herz.",
    "Hong_Kong_SAR_Ch": "Hong Kong",
    "Korea_South": "South Korea",
    "New_Zealand": "New Zealand",
    "North_Macedonia": "N. Macedonia",
    "PNG": "Papua New Guinea",
    "South_Africa": "South Africa",
    "Sri_Lanka": "Sri Lanka",
    "USA": "United States",
}


RELIGION_COLS = [
    ("SB_OSB_NRA_NR_P", "No Religion"),
    ("Christianity_Catholic_P", "Catholic"),
    ("Christianity_Anglican_P", "Anglican"),
    ("Christianity_Uniting_Church_P", "Uniting Church"),
    ("Christianity_Eastrn_Orthdox_P", "Eastern Orthodox"),
    ("Christinty_Prsbytrin_Refrmd_P", "Presbyterian"),
    ("Christianity_Baptist_P", "Baptist"),
    ("Christianity_Pentecostal_P", "Pentecostal"),
    ("Christianity_Lutheran_P", "Lutheran"),
    ("Christianity_Christian_nfd_P", "Christian (nfd)"),
    ("Islam_P", "Islam"),
    ("Hinduism_P", "Hinduism"),
    ("Buddhism_P", "Buddhism"),
    ("Othr_Rel_Sikhism_P", "Sikhism"),
    ("Judaism_P", "Judaism"),
]


def load_religion(csv_dir: Path, prefix: str, code_col: str) -> tuple[dict[str, float], dict[str, list]]:
    pct_no_rel: dict[str, float] = {}
    top_rel: dict[str, list] = {}
    path = csv_dir / f"2021Census_G14_{prefix}.csv"
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row[code_col].strip()
            try:
                tot = int(row.get("Tot_P", 0) or 0)
            except ValueError:
                tot = 0
            if tot <= 0:
                continue
            try:
                no_rel = int(row.get("SB_OSB_NRA_NR_P", 0) or 0)
            except ValueError:
                no_rel = 0
            pct_no_rel[code] = round(100.0 - (100.0 * no_rel / tot), 1)
            counts = []
            for col, label in RELIGION_COLS:
                try:
                    val = int(row.get(col, 0) or 0)
                except ValueError:
                    val = 0
                if val > 0:
                    counts.append((label, val))
            counts.sort(key=lambda x: x[1], reverse=True)
            top_rel[code] = [[lbl, cnt, round(100.0 * cnt / tot, 1)] for lbl, cnt in counts[:5]]
    return pct_no_rel, top_rel


EDU_COLS = [
    ("P_PGrad_Deg_Total", "Postgraduate"),
    ("P_GradDip_and_GradCert_Total", "Grad Dip / Cert"),
    ("P_BachDeg_Total", "Bachelor"),
    ("P_AdvDip_and_Dip_Total", "Diploma"),
    ("P_Cert_III_IV_Total", "Cert III / IV"),
    ("P_Cert_I_II_Total", "Cert I / II"),
]


def load_uni_pct(csv_dir: Path, prefix: str, code_col: str, pop15_by_code: dict[str, int]) -> tuple[dict[str, float], dict[str, list]]:
    pct_uni: dict[str, float] = {}
    edu_bd: dict[str, list] = {}
    path = csv_dir / f"2021Census_G49B_{prefix}.csv"
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row[code_col].strip()
            pop15 = max(1, pop15_by_code.get(code, 1))
            vals = []
            bd = []
            for col, label in EDU_COLS:
                try:
                    cnt = int(row.get(col, 0) or 0)
                except ValueError:
                    cnt = 0
                vals.append(cnt)
                bd.append([label, cnt, round(100.0 * cnt / pop15, 1)])
            pct_uni[code] = round(100.0 * sum(vals[:3]) / pop15, 1)
            edu_bd[code] = bd
    return pct_uni, edu_bd


def load_top_cob(csv_dir: Path, prefix: str, code_col: str, pop_by_code: dict[str, int]) -> dict[str, list]:
    merged: dict[str, dict[str, int]] = {}
    for part in ("G09F", "G09G", "G09H"):
        path = csv_dir / f"2021Census_{part}_{prefix}.csv"
        with path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            cols = [c for c in (reader.fieldnames or []) if c.startswith("P_") and c.endswith("_Tot") and c not in SKIP_COB]
            for row in reader:
                code = row[code_col].strip()
                bucket = merged.setdefault(code, {})
                for c in cols:
                    try:
                        val = int(row[c])
                    except ValueError:
                        val = 0
                    if val > 0:
                        raw_name = c[2:-4]
                        bucket[COB_NAMES.get(raw_name, raw_name.replace("_", " "))] = val
    out: dict[str, list] = {}
    for code, counts in merged.items():
        pop = max(1, pop_by_code.get(code, 1))
        top5 = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
        out[code] = [[name, cnt, round(100.0 * cnt / pop, 1)] for name, cnt in top5]
    return out


AGE_BUCKETS = [(f"Age_yr_{i}", i, i + 1) for i in range(80)] + [
    ("Age_yr_80_84", 80, 85),
    ("Age_yr_85_89", 85, 90),
    ("Age_yr_90_94", 90, 95),
    ("Age_yr_95_99", 95, 100),
    ("Age_yr_100_yr_over", 100, 105),
]

INC_BUCKETS = [
    ("Neg_Nil_income", 0, 1),
    ("1_149", 1, 150),
    ("150_299", 150, 300),
    ("300_399", 300, 400),
    ("400_499", 400, 500),
    ("500_649", 500, 650),
    ("650_799", 650, 800),
    ("800_999", 800, 1000),
    ("1000_1249", 1000, 1250),
    ("1250_1499", 1250, 1500),
    ("1500_1749", 1500, 1750),
    ("1750_1999", 1750, 2000),
    ("2000_2999", 2000, 3000),
    ("3000_3499", 3000, 3500),
    ("3500_more", 3500, 4000),
]


def _interp_median(counts: list[tuple[int, int, int]], as_int_floor: bool = False) -> int | None:
    tot = sum(c for c, _, _ in counts)
    if tot <= 0:
        return None
    half = tot / 2.0
    cum = 0
    for c, lo, hi in counts:
        if cum + c >= half:
            val = lo + (half - cum) / max(1, c) * (hi - lo)
            return int(val) if as_int_floor else round(val)
        cum += c
    return counts[-1][1]


def load_age_by_gender(csv_dir: Path, prefix: str, code_col: str) -> dict[str, tuple[int | None, int | None]]:
    merged: dict[str, dict[str, str]] = {}
    for part in ("G04A", "G04B"):
        path = csv_dir / f"2021Census_{part}_{prefix}.csv"
        with path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                code = row[code_col].strip()
                merged.setdefault(code, {}).update(row)
    out: dict[str, tuple[int | None, int | None]] = {}
    for code, row in merged.items():
        m_counts = [(int(row.get(f"{col}_M", 0) or 0), lo, hi) for col, lo, hi in AGE_BUCKETS]
        f_counts = [(int(row.get(f"{col}_F", 0) or 0), lo, hi) for col, lo, hi in AGE_BUCKETS]
        out[code] = (_interp_median(m_counts, as_int_floor=True), _interp_median(f_counts, as_int_floor=True))
    return out


def load_income_by_gender(csv_dir: Path, prefix: str, code_col: str) -> dict[str, tuple[int | None, int | None]]:
    merged: dict[str, dict[str, str]] = {}
    for part in ("G17A", "G17B"):
        path = csv_dir / f"2021Census_{part}_{prefix}.csv"
        with path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                code = row[code_col].strip()
                merged.setdefault(code, {}).update(row)
    out: dict[str, tuple[int | None, int | None]] = {}
    for code, row in merged.items():
        m_counts = [(int(row.get(f"M_{col}_Tot", 0) or 0), lo, hi) for col, lo, hi in INC_BUCKETS]
        f_counts = [(int(row.get(f"F_{col}_Tot", 0) or 0), lo, hi) for col, lo, hi in INC_BUCKETS]
        out[code] = (_interp_median(m_counts), _interp_median(f_counts))
    return out


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

    tcp_by_div: dict[str, list[dict]] = {}
    with (AEC_ROOT / "HouseTcpByCandidateByVoteTypeDownload-31496.csv").open(newline="", encoding="utf-8") as f:
        next(f)
        for r in csv.DictReader(f):
            raw_ab = r["PartyAb"].strip()
            party_ab = "NAT" if raw_ab == "NP" else raw_ab
            div_key = r["DivisionNm"].strip().lower()
            tcp_by_div.setdefault(div_key, []).append({
                "elected": r["Elected"].strip() == "Y",
                "party": party_ab,
                "name": f"{r['GivenNm'].strip()} {r['Surname'].strip().title()}",
                "votes": int(r["TotalVotes"]),
                "swing": float(r["Swing"]),
            })

    elected: dict[str, dict] = {}
    with (AEC_ROOT / "HouseMembersElectedDownload-31496.csv").open(newline="", encoding="utf-8") as f:
        next(f)
        for r in csv.DictReader(f):
            key = r["DivisionNm"].strip().lower()
            tpp = tpp_rows.get(key, {})
            raw_ab = r["PartyAb"].strip()
            cands = tcp_by_div.get(key, [])
            tot_tcp = sum(c["votes"] for c in cands) or 1
            win_c = next((c for c in cands if c["elected"]), None)
            run_c = next((c for c in cands if not c["elected"]), None)
            elected[key] = {
                "aec_party": "NAT" if raw_ab == "NP" else raw_ab,
                "aec_party_name": r["PartyNm"].strip(),
                "aec_member": f"{r['GivenNm'].strip()} {r['Surname'].strip().title()}",
                "aec_alp_pct": tpp.get("alp_pct"),
                "aec_coa_pct": tpp.get("coa_pct"),
                "aec_swing": win_c["swing"] if win_c else tpp.get("swing"),
                "aec_tcp_pct": round(100.0 * win_c["votes"] / tot_tcp, 2) if win_c else None,
                "aec_runner_up_party": run_c["party"] if run_c else None,
                "aec_runner_up_pct": round(100.0 * run_c["votes"] / tot_tcp, 2) if run_c else None,
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
        "pop_m": int(g1.get("Tot_P_M", 0)),
        "pop_f": int(g1.get("Tot_P_F", 0)),
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


def load_state_elections() -> dict[str, dict]:
    path = AEC_ROOT / "state_elections.json"
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for k, v in raw.items():
        out[k] = {
            "st_year": v["year"],
            "st_party": v["party"],
            "st_party_name": v["party_name"],
            "st_member": v["member"],
            "st_tcp_pct": v["tcp_pct"],
            "st_swing": v["swing"],
            "st_runner_up_party": v["runner_up_party"],
            "st_runner_up_pct": v["runner_up_pct"],
        }
    return out


def main() -> None:
    aec_2025 = load_aec_2025()
    state_elec = load_state_elections()
    crime_path = BASE / "crime" / "lga_crime.json"
    lga_crime = json.loads(crime_path.read_text(encoding="utf-8")) if crime_path.exists() else {}
    ced21_geo = json.loads((WEB_DATA / "ced_2021.geojson").read_text(encoding="utf-8"))
    ced21_name_to_code = {
        f["properties"]["CED_NAME21"].strip().lower(): f"CED{f['properties']['CED_CODE21']}"
        for f in ced21_geo["features"]
    }

    for cfg in LAYERS:
        g01 = load_csv_by_code(cfg["csv_dir"] / cfg["g01"], cfg["csv_code_col"])
        g02 = load_csv_by_code(cfg["csv_dir"] / cfg["g02"], cfg["csv_code_col"])
        pop_map = {k: int(v.get("Tot_P_P", 0) or 0) for k, v in g01.items()}
        pop15_map = {
            k: max(1, int(v.get("Tot_P_P", 0) or 0) - int(v.get("Age_0_4_yr_P", 0) or 0) - int(v.get("Age_5_14_yr_P", 0) or 0))
            for k, v in g01.items()
        }
        cob_prefix = f"AUST_{cfg['key'].upper()}"
        top_cob = load_top_cob(cfg["csv_dir"], cob_prefix, cfg["csv_code_col"], pop_map)
        pct_no_rel, top_rel = load_religion(cfg["csv_dir"], cob_prefix, cfg["csv_code_col"])
        pct_uni, edu_bd = load_uni_pct(cfg["csv_dir"], cob_prefix, cfg["csv_code_col"], pop15_map)
        age_gender = load_age_by_gender(cfg["csv_dir"], cob_prefix, cfg["csv_code_col"])
        inc_gender = load_income_by_gender(cfg["csv_dir"], cob_prefix, cfg["csv_code_col"])

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
            if csv_key in top_cob:
                out_props["top_cob"] = top_cob[csv_key]
            if csv_key in pct_no_rel:
                out_props["pct_no_religion"] = pct_no_rel[csv_key]
                out_props["top_rel"] = top_rel[csv_key]
            if csv_key in pct_uni:
                out_props["pct_uni"] = pct_uni[csv_key]
                out_props["edu_bd"] = edu_bd[csv_key]
            if csv_key in age_gender:
                ag_m, ag_f = age_gender[csv_key]
                if ag_m is not None:
                    out_props["median_age_m"] = ag_m
                if ag_f is not None:
                    out_props["median_age_f"] = ag_f
            if csv_key in inc_gender:
                in_m, in_f = inc_gender[csv_key]
                if in_m is not None:
                    out_props["median_prsnl_inc_m"] = in_m
                if in_f is not None:
                    out_props["median_prsnl_inc_f"] = in_f
            if cfg["key"] == "ced":
                elec = aec_2025.get(name.strip().lower(), {})
                out_props.update(elec)
            elif cfg["key"] == "sed":
                import re as _re
                clean_sed = _re.sub(r"\s*\([^)]*\)$", "", name).strip().lower()
                st_key = f"{props['STE_NAME21'].strip().lower()}::{clean_sed}"
                st_elec = state_elec.get(st_key, {})
                out_props.update(st_elec)
            elif cfg["key"] == "lga":
                c_data = lga_crime.get(raw_code)
                if c_data:
                    out_props.update(c_data)
            feat["properties"] = out_props

        (WEB_DATA / cfg["out_geo"]).write_text(
            json.dumps(geo, separators=(",", ":")), encoding="utf-8"
        )
        print(f"Wrote {cfg['out_geo']}: {len(geo['features'])} features")

    csv_aus = CSV_ROOT / "AUS"
    g01_aus = load_csv_by_code(csv_aus / "2021Census_G01_AUS_AUS.csv", "AUS_CODE_2021")["AUS"]
    g02_aus = load_csv_by_code(csv_aus / "2021Census_G02_AUS_AUS.csv", "AUS_CODE_2021")["AUS"]
    national = extract_metrics(g01_aus, g02_aus, 7688095.0)
    national["top_cob"] = load_top_cob(csv_aus, "AUS_AUS", "AUS_CODE_2021", {"AUS": national["pop"]}).get("AUS", [])
    aus_no_rel, aus_top_rel = load_religion(csv_aus, "AUS_AUS", "AUS_CODE_2021")
    national["pct_no_religion"] = aus_no_rel.get("AUS", 0.0)
    national["top_rel"] = aus_top_rel.get("AUS", [])
    aus_pop15 = max(1, national["pop"] - int(g01_aus.get("Age_0_4_yr_P", 0) or 0) - int(g01_aus.get("Age_5_14_yr_P", 0) or 0))
    aus_uni, aus_edu_bd = load_uni_pct(csv_aus, "AUS_AUS", "AUS_CODE_2021", {"AUS": aus_pop15})
    national["pct_uni"] = aus_uni.get("AUS", 0.0)
    national["edu_bd"] = aus_edu_bd.get("AUS", [])
    aus_age_g = load_age_by_gender(csv_aus, "AUS_AUS", "AUS_CODE_2021").get("AUS", (None, None))
    aus_inc_g = load_income_by_gender(csv_aus, "AUS_AUS", "AUS_CODE_2021").get("AUS", (None, None))
    national["median_age_m"], national["median_age_f"] = aus_age_g
    national["median_prsnl_inc_m"], national["median_prsnl_inc_f"] = aus_inc_g
    (WEB_DATA / "national_2021.json").write_text(
        json.dumps(national, indent=2), encoding="utf-8"
    )

    csv_gcc = CSV_ROOT / "GCCSA" / "AUS"
    g01_gcc = load_csv_by_code(csv_gcc / "2021Census_G01_AUST_GCCSA.csv", "GCCSA_CODE_2021")
    g02_gcc = load_csv_by_code(csv_gcc / "2021Census_G02_AUST_GCCSA.csv", "GCCSA_CODE_2021")
    pop_gcc = {k: int(v.get("Tot_P_P", 0) or 0) for k, v in g01_gcc.items()}
    pop15_gcc = {
        k: max(1, int(v.get("Tot_P_P", 0) or 0) - int(v.get("Age_0_4_yr_P", 0) or 0) - int(v.get("Age_5_14_yr_P", 0) or 0))
        for k, v in g01_gcc.items()
    }
    cob_gcc = load_top_cob(csv_gcc, "AUST_GCCSA", "GCCSA_CODE_2021", pop_gcc)
    gcc_no_rel, gcc_top_rel = load_religion(csv_gcc, "AUST_GCCSA", "GCCSA_CODE_2021")
    gcc_uni, gcc_edu_bd = load_uni_pct(csv_gcc, "AUST_GCCSA", "GCCSA_CODE_2021", pop15_gcc)
    gcc_age_g = load_age_by_gender(csv_gcc, "AUST_GCCSA", "GCCSA_CODE_2021")
    gcc_inc_g = load_income_by_gender(csv_gcc, "AUST_GCCSA", "GCCSA_CODE_2021")
    city_map = {
        "Sydney": ("1GSYD", "Greater Sydney", "New South Wales", 12368.7),
        "Melbourne": ("2GMEL", "Greater Melbourne", "Victoria", 9992.5),
        "Brisbane": ("3GBRI", "Greater Brisbane", "Queensland", 15842.0),
        "Perth": ("5GPER", "Greater Perth", "Western Australia", 6417.9),
        "Adelaide": ("4GADE", "Greater Adelaide", "South Australia", 3259.8),
        "Canberra": ("8ACTE", "Canberra (ACT)", "Australian Capital Territory", 2358.1),
    }
    cities_out = {}
    for city_key, (gcc_code, full_name, ste_name, area_km2) in city_map.items():
        m = extract_metrics(g01_gcc.get(gcc_code, {}), g02_gcc.get(gcc_code, {}), area_km2)
        m["name"] = full_name
        m["ste_name"] = ste_name
        m["area_sqkm"] = area_km2
        m["top_cob"] = cob_gcc.get(gcc_code, [])
        m["pct_no_religion"] = gcc_no_rel.get(gcc_code, 0.0)
        m["top_rel"] = gcc_top_rel.get(gcc_code, [])
        m["pct_uni"] = gcc_uni.get(gcc_code, 0.0)
        m["edu_bd"] = gcc_edu_bd.get(gcc_code, [])
        m["median_age_m"], m["median_age_f"] = gcc_age_g.get(gcc_code, (None, None))
        m["median_prsnl_inc_m"], m["median_prsnl_inc_f"] = gcc_inc_g.get(gcc_code, (None, None))
        cities_out[city_key] = m
    (WEB_DATA / "cities_2021.json").write_text(
        json.dumps(cities_out, indent=2), encoding="utf-8"
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
