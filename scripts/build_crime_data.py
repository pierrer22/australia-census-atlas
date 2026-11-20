#!/usr/bin/env python3
"""Aggregate NSW, VIC, QLD, and NT crime datasets to ABS 2021 LGAs (rate per 100k)."""

import csv
import json
import re
from pathlib import Path
import openpyxl

BASE = Path("/home/pierre/census")
CRIME_DIR = BASE / "crime"
LGA_GEO = BASE / "web" / "data" / "lga_census_2021.geojson"


def norm_lga(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"\s+(shire|city|regional|town|borough|district|rural city|municipality|council|aboriginal shire)+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_lga_lookup() -> dict[tuple[str, str], dict]:
    geo = json.loads(LGA_GEO.read_text(encoding="utf-8"))
    by_state_name: dict[tuple[str, str], dict] = {}
    for f in geo["features"]:
        p = f["properties"]
        key = (p["ste_name"].lower(), norm_lga(p["name"]))
        by_state_name[key] = p
    return by_state_name


def parse_nsw(lga_lookup: dict) -> dict[str, dict]:
    wb = openpyxl.load_workbook(CRIME_DIR / "nsw_rci_offencebymonth.xlsm", read_only=True, data_only=True)
    ws = wb["Data"]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    # Last 12 month columns
    n_cols = len(header)
    start_col = n_cols - 12
    counts: dict[str, int] = {}
    for r in rows:
        lga = str(r[0] or "").strip()
        if not lga:
            continue
        tot = sum(int(v or 0) for v in r[start_col:n_cols])
        counts[lga] = counts.get(lga, 0) + tot

    out: dict[str, dict] = {}
    for lga, cnt in counts.items():
        p = lga_lookup.get(("new south wales", norm_lga(lga)))
        if p and p.get("pop", 0) > 0:
            rate = round(100000.0 * cnt / p["pop"], 1)
            out[p["code"]] = {"crime_rate_100k": rate, "crime_count": cnt, "crime_period": "Jul 2025–Jun 2026 (BOCSAR)"}
    return out


def parse_vic(lga_lookup: dict) -> dict[str, dict]:
    wb = openpyxl.load_workbook(CRIME_DIR / "vic_lga_offences_2026.xlsx", read_only=True, data_only=True)
    ws = wb["Table 01"]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    out: dict[str, dict] = {}
    for r in rows:
        if r[0] != 2026:
            continue
        lga = str(r[3] or "").strip()
        cnt = int(r[4] or 0)
        rate = float(r[5] or 0)
        p = lga_lookup.get(("victoria", norm_lga(lga)))
        if p:
            out[p["code"]] = {"crime_rate_100k": round(rate, 1), "crime_count": cnt, "crime_period": "YE Jun 2026 (CSA)"}
    return out


def parse_qld(lga_lookup: dict) -> dict[str, dict]:
    target_months = {
        "NOV25", "DEC25", "JAN26", "FEB26", "MAR26", "APR26",
        "MAY26", "JUN26", "JUL26", "AUG26", "SEP26", "OCT26",
    }
    rates: dict[str, float] = {}
    with (CRIME_DIR / "qld_lga_rates.csv").open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["Month Year"] not in target_months:
                continue
            lga = r["LGA Name"].strip()
            tot = (
                float(r.get("Offences Against the Person") or 0)
                + float(r.get("Offences Against Property") or 0)
                + float(r.get("Other Offences") or 0)
            )
            rates[lga] = rates.get(lga, 0.0) + tot

    out: dict[str, dict] = {}
    for lga, rate in rates.items():
        p = lga_lookup.get(("queensland", norm_lga(lga)))
        if p:
            cnt = round(rate * p.get("pop", 0) / 100000.0)
            out[p["code"]] = {"crime_rate_100k": round(rate, 1), "crime_count": cnt, "crime_period": "Nov 2025–Oct 2026 (QPS)"}
    return out


def parse_nt(lga_lookup: dict) -> dict[str, dict]:
    # Latest 12 months: Oct 2025 - Sep 2026
    counts: dict[str, int] = {}
    with (CRIME_DIR / "nt_crime_sep_2026.csv").open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            yr = int(r["Year"])
            mo = int(r["Month number"])
            if not ((yr == 2025 and mo >= 10) or (yr == 2026 and mo <= 9)):
                continue
            reg = r["Reporting Region"].strip()
            cnt = int(r["Number of offences"] or 0)
            counts[reg] = counts.get(reg, 0) + cnt

    out: dict[str, dict] = {}
    for reg, cnt in counts.items():
        p = lga_lookup.get(("northern territory", norm_lga(reg)))
        if p and p.get("pop", 0) > 0:
            rate = round(100000.0 * cnt / p["pop"], 1)
            out[p["code"]] = {"crime_rate_100k": rate, "crime_count": cnt, "crime_period": "Oct 2025–Sep 2026 (NT Police)"}
    return out


def main() -> None:
    lga_lookup = load_lga_lookup()
    nsw = parse_nsw(lga_lookup)
    vic = parse_vic(lga_lookup)
    qld = parse_qld(lga_lookup)
    nt = parse_nt(lga_lookup)
    merged = {**nsw, **vic, **qld, **nt}
    (CRIME_DIR / "lga_crime.json").write_text(json.dumps(merged, indent=2), encoding="utf-8")
    print(f"Matched LGAs — NSW: {len(nsw)}, VIC: {len(vic)}, QLD: {len(qld)}, NT: {len(nt)}, Total: {len(merged)}")


if __name__ == "__main__":
    main()
