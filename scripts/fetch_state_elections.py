#!/usr/bin/env python3
"""Fetch NSW 2023, VIC 2022, QLD 2024, and WA 2025 state election results by district."""

import json
import re
import urllib.request
from pathlib import Path

OUT_PATH = Path("/home/pierre/census/aec/state_elections.json")

SOURCES = [
    ("New South Wales", 2023, "Results_of_the_2023_New_South_Wales_Legislative_Assembly_election"),
    ("Victoria", 2022, "Results_of_the_2022_Victorian_state_election_(Legislative_Assembly)"),
    ("Queensland", 2024, "Results_of_the_2024_Queensland_state_election"),
    ("Western Australia", 2025, "Results_of_the_2025_Western_Australian_state_election_(Legislative_Assembly)"),
    ("South Australia", 2026, "Results_of_the_2026_South_Australian_state_election_(House_of_Assembly)"),
    ("Northern Territory", 2024, "Results_of_the_2024_Northern_Territory_general_election"),
]

TAS_SOURCE = ("Tasmania", 2025, "Results_of_the_2025_Tasmanian_state_election")


def norm_party(raw: str) -> str:
    p = raw.strip().lower()
    if "country liberal" in p or p == "clp":
        return "CLP"
    if "labor" in p or "alp" in p:
        return "ALP"
    if "liberal national" in p or p == "lnp":
        return "LNP"
    if "national" in p:
        return "NP"
    if "liberal" in p:
        return "LP"
    if "green" in p:
        return "GRN"
    if "katter" in p or "kap" in p:
        return "KAP"
    if "shooter" in p:
        return "SFF"
    if "independent" in p or "teal" in p:
        return "IND"
    return raw.strip()[:6].upper() or "OTH"


def clean_text(html_frag: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html_frag)).strip()


def parse_float(s: str) -> float | None:
    s = s.replace("−", "-").replace("+", "").replace("%", "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def main() -> None:
    results: dict[str, dict] = {}
    for state_name, year, page in SOURCES:
        url = f"https://en.wikipedia.org/api/rest_v1/page/html/{page}"
        req = urllib.request.Request(url, headers={"User-Agent": "AustraliaCensusAtlas/1.0"})
        html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8")

        parts = re.split(r"<h3[^>]*>(.*?)</h3>", html)
        count = 0
        for i in range(1, len(parts), 2):
            district = clean_text(parts[i])
            chunk = parts[i + 1]
            rows = []
            for tr in re.findall(r"<tr[^>]*>.*?</tr>", chunk, re.S):
                cells = [clean_text(c) for c in re.findall(r"<t[dh][^>]*>.*?</t[dh]>", tr, re.S)]
                if cells:
                    rows.append(cells)

            # Find Two-party-preferred or Two-candidate-preferred section
            tcp_idx = None
            for idx, r in enumerate(rows):
                joined = " ".join(r).lower()
                if "two-party-preferred" in joined or "two-candidate-preferred" in joined:
                    tcp_idx = idx
                    break

            if tcp_idx is None:
                # Handle 2-candidate contests (e.g. Arafura NT) with no separate 2CP header
                cand_rows = [
                    r for r in rows[1:]
                    if len(r) >= 5 and r[0] == "" and "hold" not in " ".join(r).lower() and "gain" not in " ".join(r).lower()
                ]
                if len(cand_rows) == 2:
                    win_row, run_row = cand_rows[0], cand_rows[1]
                else:
                    continue
            elif tcp_idx + 2 >= len(rows):
                continue
            else:
                win_row = rows[tcp_idx + 1]
                run_row = rows[tcp_idx + 2]
            # Expect ['', Party, Candidate, Votes, %, Swing] (6 cols) or [Party, Candidate, Votes, %, Swing] (5 cols)
            off = 1 if win_row[0] == "" else 0
            if len(win_row) < off + 4:
                continue

            win_party_raw = win_row[off]
            win_cand = win_row[off + 1]
            win_pct = parse_float(win_row[off + 3])
            win_swing = parse_float(win_row[off + 4]) if len(win_row) > off + 4 else None

            run_off = 1 if run_row[0] == "" else 0
            run_party_raw = run_row[run_off] if len(run_row) > run_off + 3 else ""
            run_pct = parse_float(run_row[run_off + 3]) if len(run_row) > run_off + 3 else None

            key = f"{state_name.lower()}::{district.lower()}"
            results[key] = {
                "state": state_name,
                "year": year,
                "district": district,
                "party": norm_party(win_party_raw),
                "party_name": win_party_raw,
                "member": win_cand,
                "tcp_pct": win_pct,
                "swing": win_swing,
                "runner_up_party": norm_party(run_party_raw) if run_party_raw else None,
                "runner_up_pct": run_pct,
            }
            count += 1
        print(f"{state_name} ({year}): parsed {count} districts")

    # Tasmania 2025 (5 multi-member Hare-Clark divisions)
    tas_state, tas_year, tas_page = TAS_SOURCE
    url = f"https://en.wikipedia.org/api/rest_v1/page/html/{tas_page}"
    html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "AustraliaCensusAtlas/1.0"}), timeout=20).read().decode("utf-8")
    parts = re.split(r"<h3[^>]*>(.*?)</h3>", html)
    tas_count = 0
    for i in range(1, len(parts), 2):
        district = clean_text(parts[i])
        chunk = parts[i + 1]
        party_votes: dict[str, float] = {}
        party_seats: dict[str, int] = {}
        for tr in re.findall(r"<tr[^>]*>.*?</tr>", chunk, re.S):
            cells = [clean_text(c) for c in re.findall(r"<t[dh][^>]*>.*?</t[dh]>", tr, re.S)]
            if len(cells) >= 5 and cells[0] == "":
                p_code = norm_party(cells[1])
                cand = cells[2]
                pct = parse_float(cells[4])
                if pct is not None:
                    party_votes[p_code] = round(party_votes.get(p_code, 0.0) + pct, 1)
                if "(elected" in cand.lower():
                    party_seats[p_code] = party_seats.get(p_code, 0) + 1
        if not party_seats:
            continue
        ranked = sorted(party_votes.items(), key=lambda x: (party_seats.get(x[0], 0), x[1]), reverse=True)
        lead_p, lead_pct = ranked[0]
        run_p, run_pct = ranked[1] if len(ranked) > 1 else ("OTH", 0.0)
        seat_summary = " · ".join(
            f"{p} {s}" for p, s in sorted(party_seats.items(), key=lambda x: x[1], reverse=True)
        )
        results[f"tasmania::{district.lower()}"] = {
            "state": tas_state,
            "year": tas_year,
            "district": district,
            "party": lead_p,
            "party_name": lead_p,
            "member": seat_summary,
            "tcp_pct": lead_pct,
            "swing": None,
            "runner_up_party": run_p,
            "runner_up_pct": run_pct,
        }
        tas_count += 1
    print(f"{tas_state} ({tas_year}): parsed {tas_count} divisions")

    OUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Saved {len(results)} total state districts to {OUT_PATH}")


if __name__ == "__main__":
    main()
