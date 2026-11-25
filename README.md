# Australia Census & Election Atlas

**Live Demo:** https://pierrer22.github.io/australia-census-atlas/ · **Street-Level Fuel & EV Finder:** https://pierrer22.github.io/australia-census-atlas/fuel.html

Interactive choropleth atlas of Australia combining **ABS 2021 Census** data (`G01`, `G02`, `G09`, `G14`, `G37`, `G49`) with **2025 AEC Federal** and **410 State/Territory** election results across six geographic layers.

![Australia Census & Election Atlas](docs/preview.png)

## Features

- **6 Geography Layers (sorted by granularity):**
  - `SA4` (89 Statistical Areas Level 4)
  - `Federal` (150 Commonwealth Electoral Divisions + 2025 AEC 2CP/2PP results)
  - `SA3` (340 Statistical Areas Level 3)
  - `State Seats` (433 State Electoral Divisions + 410 results across NSW 2023, VIC 2022, QLD 2024, WA 2025, SA 2026, NT 2024, TAS 2025)
  - `LGA` (547 Local Government Areas)
  - `Suburbs` (`SA2`, 2,454 suburb-level areas)
- **Grouped Metric Switcher:** 34 lenses organized into `Housing & Income`, `Demographics`, `Elections & Crime`, `NSW Fuel`, and `EV Fast Charging` (auto-switching layers when needed):
  - `Housing & Income`: Household Income, Personal Income, Weekly Rent, Rental Affordability (SGS RAI 2025 Q2 across all 6 layers), Monthly Mortgage, Household Size, Owner-Occupiers (%), Renters (%), and Social Housing (%).
  - `Demographics`: Median Age, Born Overseas (%), Religion (% Affiliated, excluding Not Stated), Education (% Uni Degree + hover qualification breakdown table), Citizenship (% Aus Citizen), and Population Density.
  - `Elections & Crime`: `2025 Winner` & `2025 ALP 2PP` (`Federal`), `State Winner` (`State Seats`), and `Crime Rate` (`LGA` layer — 12-month rate across 278 LGAs in NSW, VIC, QLD, and NT, ranked within state due to differing police offence definitions and population bases).
  - `NSW Fuel`: `E10 / U91` (cheapest of either), `E10`, `Unleaded 91`, `Premium 95`, `Premium 98`, `All Diesel` (cheapest of Diesel or Prem Diesel), `Diesel`, `Prem Diesel`, and `LPG` (auto-zooms to Sydney on `Suburbs (SA2)` with `LGA` also supported — NSW zones shaded by cheapest FuelCheck station with per-zone cheapest price labels, overlaid with **2,390** station pins and cheapest-station dossier rankings, refreshed twice daily via GitHub Actions).
  - `EV Fast Charging`: `All Fast (50+ kW)`, `Ultra-Fast (150+ kW)`, `CCS2`, `CHAdeMO`, `Tesla`, and `By Price ($/kWh)` (`Suburbs (SA2)` & `LGA` layers — Australia-wide DC fast chargers rated 50 kW+ from Open Charge Map with power rating, connector breakdown, listed $/kWh/Free tariffs, zone badges, and top-station dossier rankings).
- **Standalone Street-Level Fuel & EV Finder ([`web/fuel.html`](web/fuel.html)):** Dedicated mobile-friendly Leaflet street map sharing `nsw_fuel_prices.json` and `au_ev_chargers.json` with `Near Me` GPS sorting, station search, price/power map pills, and one-tap Google Maps directions.
- **Recent Crime & Neighbourhood Watch Incident Pins:** Toggleable map pins (`Incident Pins` or auto-enabled on `Crime Rate`) combining:
  - **Queensland live street-block & Neighbourhood Watch pins:** Live browser fetch from the official QPS Open Data Crime Map API across all 78 QLD LGAs and 852 Neighbourhood Watch (NHW) areas (with NHW boundary overlays and ABS 2021 Mesh Block coordinate translation).
  - **Multi-state geocoded police RSS & SA suburb pins:** Daily GitHub Actions refresh geocoding myPolice QLD, Tasmania Police, and NT Police (PFES) releases (via OpenStreetMap Nominatim + ABS SAL centroids) alongside SA SAPOL 30-day suburb offence hotspots.
- **Interactive Dossier & Shareable URLs:** Click any region, city quick-zoom (`Sydney`, `Melbourne`, `Brisbane`, `Perth`, `Adelaide`, `Canberra`), state/territory quick-zoom (`NSW`–`ACT` with ABS June 2026 Mean Dwelling Price), search result, or leaderboard item, and share the exact view via the URL hash (`#layer=...&metric=...&code=...&pins=1`).
- **Dynamic Map Labels:** Zoom-responsive region names with boundary-fit and 2D collision avoidance so labels appear cleanly as you zoom in without overlapping text or borders.
- **Dark / Light Mode:** Persisted in `localStorage`.

## Quick Start

All processed GeoJSONs (`web/data/`) and election datasets (`aec/`) are committed in the repository. Serve `web/` locally with any static HTTP server:

```bash
python3 -m http.server 8765 --directory web
```

Then open `http://localhost:8765/`.

## Rebuilding from Raw Sources

Install Python dependencies and ensure ABS 2021 GCP DataPacks and ASGS Edition 3 shapefiles (simplified to `web/data/*.geojson` with `mapshaper`) are present locally, then rebuild and validate:

```bash
pip install -r requirements.txt
python3 scripts/fetch_state_elections.py
python3 scripts/build_crime_data.py
python3 scripts/build_census_data.py
python3 scripts/build_geo_centroids.py
python3 scripts/build_rai_data.py
python3 scripts/fetch_recent_incidents.py
python3 scripts/fetch_nsw_fuel.py   # requires NSW_FUEL_API_KEY & NSW_FUEL_API_SECRET
python3 scripts/fetch_ev_chargers.py
python3 scripts/validate_site.py
```

## Validation & CI

- **Local validation:** Run `node --check web/app.js`, `node --check web/fuel.js`, `python3 -m py_compile scripts/*.py`, and `python3 scripts/validate_site.py` to check dataset bounds and verify every `getElementById(...)` reference in `web/app.js` and `web/fuel.js` exists in its HTML page.
- **Pull request CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs syntax, dataset, and DOM ID checks automatically on pull requests to `main`, non-`main` pushes, and manual dispatch.

## Sources

- Australian Bureau of Statistics (ABS) 2021 Census General Community Profile (GCP), ASGS Edition 3 Digital Boundary Files (including Mesh Blocks, Postcodes/POA, & Suburbs and Localities), and *Total Value of Dwellings* (June Quarter 2026)
- Australian Electoral Commission (AEC) 2025 Federal Election Tally Room (`Event 31496`)
- State/Territory Legislative Assembly & House of Assembly election results (NSW 2023, VIC 2022, QLD 2024, WA 2025, SA 2026, NT 2024, TAS 2025)
- State/Territory Crime Data: NSW BOCSAR, Crime Statistics Agency Victoria (CSA), Queensland Police Service (QPS), NT Police, and South Australia Police (SAPOL via Data.SA)
- Live & Recent Incident Feeds: QPS Online Crime Map Open Data API (LGAs & Neighbourhood Watch areas), myPolice QLD RSS, Tasmania Police Media Releases RSS, NT Police (PFES) Newsroom RSS, and OpenStreetMap Nominatim geocoding
- Fuel Prices: NSW Government FuelCheck v2 API (`api.nsw.gov.au`)
- EV Fast Charging: Open Charge Map (`ocm-export`, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
- Rental Affordability Index (RAI, 2025 Q2): SGS Economics & Planning via National Housing Data Exchange (AHDAP)

## License

- **Code (`web/*.{html,css,js}`, `scripts/`, `.github/`):** Licensed under the [MIT License](LICENSE).
- **Data (`web/data/`, `aec/`, `crime/`):** Third-party and derived datasets retain their original licences:
  - **ABS data:** Based on Australian Bureau of Statistics data ([abs.gov.au](https://www.abs.gov.au)), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). ABS data used with permission from the Australian Bureau of Statistics.
  - **AEC federal election data (`aec/House*.csv`):** © Commonwealth of Australia (Australian Electoral Commission), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - **State/Territory election summaries (`aec/state_elections.json`):** Derived from Wikipedia Legislative Assembly / House of Assembly election result tables, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  - **Crime & incident datasets (`crime/`, `web/data/recent_incidents.json`, `web/data/qld_nhw_by_lga.json`):** Derived from NSW BOCSAR, Crime Statistics Agency Victoria (CSA), Queensland Police Service (QPS Open Data API & myPolice), NT Police, Tasmania Police, and SAPOL open datasets ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Street-level coordinates geocoded via OpenStreetMap Nominatim ([ODbL](https://opendatacommons.org/licenses/odbl/)).
