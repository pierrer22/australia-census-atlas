# Australia Census & Election Atlas

**Live Demo:** https://pierrer22.github.io/australia-census-atlas/

Interactive choropleth atlas of Australia combining **ABS 2021 Census** data (`G01`, `G02`, `G09`, `G14`, `G49`) with **2025 AEC Federal** and **410 State/Territory** election results across six geographic layers.

![Australia Census & Election Atlas](docs/preview.png)

## Features

- **6 Geography Layers (sorted by granularity):**
  - `SA4` (89 Statistical Areas Level 4)
  - `Federal` (150 Commonwealth Electoral Divisions + 2025 AEC 2CP/2PP results)
  - `SA3` (340 Statistical Areas Level 3)
  - `State Seats` (433 State Electoral Divisions + 410 results across NSW 2023, VIC 2022, QLD 2024, WA 2025, SA 2026, NT 2024, TAS 2025)
  - `LGA` (547 Local Government Areas)
  - `SA2` (2,454 suburb-level areas)
- **9 Census Lenses:** Household Income, Personal Income, Weekly Rent, Monthly Mortgage, Median Age, Born Overseas (%), Religion (% Affiliated), Education (% Uni Degree + hover qualification breakdown table), and Population Density.
- **Crime Lens (`LGA` layer):** 12-month Crime Rate (`/100k` residents) across 278 LGAs in NSW, VIC, QLD, and NT.
- **Election Lenses:** `2025 Winner` & `2025 ALP 2PP` (Federal), `State Winner` (State Seats), with actual 2CP Winner vs Runner-up cards in the sidebar.
- **Interactive Dossier:** Click any region, city quick-zoom (`Sydney`, `Melbourne`, `Brisbane`, `Perth`, `Adelaide`, `Canberra`), search result, or leaderboard item to view benchmarks against Australian medians, age structure, Top 5 overseas countries of birth, and Top 5 religions.
- **Dark / Light Mode:** Persisted in `localStorage`.

## Quick Start

All processed GeoJSONs (`web/data/`) and election datasets (`aec/`) are committed in the repository. Serve `web/` locally with any static HTTP server:

```bash
python3 -m http.server 8765 --directory web
```

Then open `http://localhost:8765/`.

## Rebuilding from Raw Sources

To re-fetch state election data and rebuild `web/data/*.geojson` from raw ABS 2021 DataPacks and ASGS Edition 3 shapefiles:

```bash
python3 scripts/fetch_state_elections.py
python3 scripts/build_crime_data.py
python3 scripts/build_census_data.py
```

## Sources

- Australian Bureau of Statistics (ABS) 2021 Census General Community Profile (GCP) & ASGS Edition 3 Digital Boundary Files
- Australian Electoral Commission (AEC) 2025 Federal Election Tally Room (`Event 31496`)
- State/Territory Legislative Assembly & House of Assembly election results (NSW 2023, VIC 2022, QLD 2024, WA 2025, SA 2026, NT 2024, TAS 2025)
- State/Territory Crime Data: NSW BOCSAR, Crime Statistics Agency Victoria (CSA), Queensland Police Service (QPS), and NT Police
