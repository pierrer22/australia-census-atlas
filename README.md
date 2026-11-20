# Australia Census & Election Atlas

Interactive choropleth atlas of Australia combining **ABS 2021 Census** data (`G01`, `G02`) with **2025 AEC Federal Election** results across four geographic layers.

## Features

- **4 Geography Layers:**
  - `SA4` (89 Statistical Areas Level 4)
  - `SA3` (340 Statistical Areas Level 3)
  - `LGA` (547 Local Government Areas)
  - `Electorates` (151 Commonwealth Electoral Divisions + 2025 AEC results)
- **6 Census Lenses:** Median Household Income, Weekly Rent, Monthly Mortgage, Median Age, Born Overseas (%), and Population Density.
- **2025 AEC Election Lenses (Electorates layer):** 2025 Winner by party and 2025 ALP Two-Party Preferred (2PP) %.
- **Interactive Dossier:** Click any region, search by name, or pick from the Highest/Lowest leaderboard to compare against Australian national benchmarks.
- **Dark / Light Mode:** Persisted in `localStorage`.

## Quick Start

Serve the static site from `web/`:

```bash
python3 -m http.server 8765 --directory web
```

Then open `http://localhost:8765/`.

## Data Pipeline

Pre-merged, simplified GeoJSONs live in `web/data/`. To rebuild them from raw ABS 2021 DataPacks, ASGS Edition 3 shapefiles, and AEC Tally Room CSVs (`aec/`):

```bash
python3 scripts/build_census_data.py
```

## Sources

- Australian Bureau of Statistics (ABS) 2021 Census General Community Profile (GCP) & ASGS Edition 3 Digital Boundary Files
- Australian Electoral Commission (AEC) 2025 Federal Election Tally Room (`Event 31496`)
