const LAYERS = [
  { key: "sa4", label: "SA4", file: "data/sa4_census_2021.geojson", desc: "89 SA4 regions", tip: "Statistical Area Level 4 — 89 broad labour-market regions (~100k–500k people)" },
  { key: "ced", label: "Federal", file: "data/ced_census_2021.geojson", desc: "150 divisions (2025 AEC)", tip: "Commonwealth Electoral Divisions — 150 federal seats + 2025 AEC results" },
  { key: "sa3", label: "SA3", file: "data/sa3_census_2021.geojson", desc: "340 SA3 regions", tip: "Statistical Area Level 3 — 340 regional districts (~30k–130k people)" },
  { key: "sed", label: "State Seats", file: "data/sed_census_2021.geojson", desc: "433 state electorates", tip: "State Electoral Divisions — 433 state & territory electorates" },
  { key: "lga", label: "LGA", file: "data/lga_census_2021.geojson", desc: "547 councils", tip: "Local Government Areas — 547 local councils (includes Crime Rate)" },
  { key: "sa2", label: "Suburbs", file: "data/sa2_census_2021.geojson", desc: "2,454 suburbs/areas (SA2)", tip: "Statistical Area Level 2 (SA2) — 2,454 suburb-level areas (~3k–25k people)" },
];

const PARTY_COLORS = {
  ALP: "#e11d48",
  LP: "#1d4ed8",
  LNP: "#1d4ed8",
  CLP: "#1d4ed8",
  NAT: "#166534",
  GRN: "#22c55e",
  ONP: "#f97316",
  IND: "#64748b",
  KAP: "#b45309",
  SFF: "#b45309",
  XEN: "#b45309",
};

const STATE_ABBR = {
  "New South Wales": "NSW",
  Victoria: "VIC",
  Queensland: "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  Tasmania: "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT",
  "Other Territories": "OT",
};

const METRIC_GROUPS = [
  { key: "housing", label: "Housing & Income" },
  { key: "people", label: "Demographics" },
  { key: "politics", label: "Elections & Crime" },
  { key: "fuel", label: "NSW Fuel" },
  { key: "ev", label: "EV Fast Charging" },
];

const CENSUS_METRICS = [
  {
    key: "median_hhd_inc_wk",
    group: "housing",
    label: "Household Income",
    unit: "$/wk",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#e6f4f1", "#7cc6bd", "#0b6e68", "#043835"],
    scale: "linear",
  },
  {
    key: "median_prsnl_inc_wk",
    group: "housing",
    label: "Personal Income",
    unit: "$/wk",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#ecfeff", "#67e8f9", "#0e7490", "#164e63"],
    scale: "linear",
  },
  {
    key: "median_rent_wk",
    group: "housing",
    label: "Weekly Rent",
    unit: "$/wk",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#e6f4f1", "#68b8b0", "#0b6e68", "#053330"],
    scale: "linear",
  },
  {
    key: "rai",
    group: "housing",
    label: "Rental Affordability",
    unit: "RAI (2025 Q2)",
    format: (v) => `${Math.round(v)}`,
    colors: ["#7f1d1d", "#dc2626", "#f97316", "#eab308", "#84cc16", "#15803d"],
    scale: "rai",
    note: "SGS Rental Affordability Index (2025 Q2). 100 = rent is 30% of average rental household income; lower = less affordable (NT unavailable).",
  },
  {
    key: "median_mortgage_mo",
    group: "housing",
    label: "Monthly Mortgage",
    unit: "$/mo",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#ecfdf5", "#34d399", "#047857", "#064e3b"],
    scale: "linear",
  },
  {
    key: "avg_hhd_size",
    group: "housing",
    label: "Household Size",
    unit: "persons",
    format: (v) => `${v.toFixed(1)} ppl`,
    colors: ["#fdf2f8", "#f472b6", "#be185d", "#831843"],
    scale: "linear",
  },
  {
    key: "pct_owner",
    group: "housing",
    label: "Owner-Occupiers",
    unit: "% Dwellings",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#ecfdf5", "#6ee7b7", "#059669", "#064e3b"],
    scale: "linear",
  },
  {
    key: "pct_renter",
    group: "housing",
    label: "Renters",
    unit: "% Dwellings",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#eff6ff", "#93c5fd", "#2563eb", "#1e3a8a"],
    scale: "linear",
  },
  {
    key: "pct_social_housing",
    group: "housing",
    label: "Social Housing",
    unit: "% Dwellings",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#fffbeb", "#fcd34d", "#ea580c", "#7c2d12"],
    scale: "sqrt",
    note: "ABS 2021 Census G37: dwellings rented from a State/Territory Housing Authority or Community Housing Provider (% of stated tenure).",
  },
  {
    key: "median_age",
    group: "people",
    label: "Median Age",
    unit: "yrs",
    format: (v) => `${v} yrs`,
    colors: ["#fef3c7", "#f59e0b", "#b45309", "#78350f"],
    scale: "linear",
  },
  {
    key: "pct_born_overseas",
    group: "people",
    label: "Born Overseas",
    unit: "%",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#e0e7ff", "#818cf8", "#3730a3", "#1e1b4b"],
    scale: "linear",
  },
  {
    key: "pct_affiliated",
    group: "people",
    label: "Religion",
    unit: "% Affiliated",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#f3e8ff", "#c084fc", "#7e22ce", "#3b0764"],
    scale: "linear",
  },
  {
    key: "pct_uni",
    group: "people",
    label: "Education",
    unit: "% Uni Degree",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#eff6ff", "#93c5fd", "#2563eb", "#1e3a8a"],
    scale: "linear",
  },
  {
    key: "pct_citizen",
    group: "people",
    label: "Citizenship",
    unit: "% Aus Citizen",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#f0fdf4", "#86efac", "#15803d", "#14532d"],
    scale: "linear",
  },
  {
    key: "density_sqkm",
    group: "people",
    label: "Pop. Density",
    unit: "/km²",
    format: (v) => (v >= 100 ? `${Math.round(v).toLocaleString()}/km²` : `${v.toFixed(1)}/km²`),
    colors: ["#fef3c7", "#f97316", "#c2410c", "#6c1d0a"],
    scale: "log",
  },
];

const ELECTION_METRICS = [
  {
    key: "aec_party",
    group: "politics",
    label: "2025 Winner",
    unit: "AEC",
    format: (v) => v || "Abolished 2025",
    scale: "party",
    layerOnly: "ced",
  },
  {
    key: "aec_alp_pct",
    group: "politics",
    label: "2025 ALP 2PP",
    unit: "%",
    format: (v) => (v != null ? `${v.toFixed(1)}%` : "N/A"),
    colors: ["#1d4ed8", "#93c5fd", "#f1f5f9", "#fda4af", "#e11d48"],
    scale: "diverging",
    layerOnly: "ced",
  },
];

const STATE_ELECTION_METRICS = [
  {
    key: "st_party",
    group: "politics",
    label: "State Winner",
    unit: "7 States/Terr.",
    format: (v) => v || "Not loaded",
    scale: "party",
    layerOnly: "sed",
  },
];

const CRIME_METRICS = [
  {
    key: "crime_rate_100k",
    group: "politics",
    label: "Crime Rate",
    unit: "/100k (12 mo)",
    format: (v) => `${Math.round(v).toLocaleString()}/100k`,
    colors: ["#fef2f2", "#fca5a5", "#dc2626", "#7f1d1d"],
    scale: "log",
    layerOnly: "lga",
    withinState: true,
    note: "State police use different offence rules & pop bases (NSW/VIC/QLD/NT only; WA/SA/TAS/ACT unavailable). Compare within states, not across borders.",
  },
];

const FUEL_METRICS = [
  ["E10_U91", "E10 / U91", ["E10", "U91"]],
  ["E10", "E10", ["E10"]],
  ["U91", "Unleaded 91", ["U91"]],
  ["P95", "Premium 95", ["P95"]],
  ["P98", "Premium 98", ["P98"]],
  ["ALL_DIESEL", "All Diesel", ["DL", "PDL"]],
  ["DL", "Diesel", ["DL"]],
  ["PDL", "Prem Diesel", ["PDL"]],
  ["LPG", "LPG", ["LPG"]],
].map(([code, label, fuelTypes]) => ({
  key: `fuel_${code}`,
  fuelType: code,
  fuelTypes,
  group: "fuel",
  label,
  unit: "¢/L (cheapest)",
  format: (v) => `${v.toFixed(1)}¢/L`,
  colors: ["#15803d", "#4ade80", "#eab308", "#dc2626"],
  scale: "fuel",
  allowedLayers: ["sa2", "lga"],
  invertRank: true,
  note: "Shaded by cheapest FuelCheck station in each NSW Suburb (SA2) or LGA, with cheapest zone price labels and station pins.",
}));

function isFuelMetric(m = state.metric) {
  return Boolean(m && m.group === "fuel");
}

const EV_METRICS = [
  {
    key: "ev_all",
    evFilter: "all",
    group: "ev",
    label: "All Fast (50+ kW)",
    unit: "kW (max)",
    format: (v) => `${Math.round(v)} kW`,
    colors: ["#eab308", "#0ea5e9", "#10b981"],
    scale: "ev_power",
    allowedLayers: ["sa2", "lga"],
    note: "Shaded by max DC fast charger rating (50+ kW) in each Suburb (SA2) or LGA; pins show individual stations with power, connectors, and price (Open Charge Map).",
  },
  {
    key: "ev_ultra",
    evFilter: "ultra",
    group: "ev",
    label: "Ultra-Fast (150+ kW)",
    unit: "kW (max)",
    format: (v) => `${Math.round(v)} kW`,
    colors: ["#0ea5e9", "#10b981", "#059669"],
    scale: "ev_power",
    allowedLayers: ["sa2", "lga"],
    note: "Ultra-fast DC chargers rated 150 kW and above across Australia.",
  },
  {
    key: "ev_ccs2",
    evFilter: "CCS2",
    group: "ev",
    label: "CCS2",
    unit: "kW (max)",
    format: (v) => `${Math.round(v)} kW`,
    colors: ["#eab308", "#0ea5e9", "#10b981"],
    scale: "ev_power",
    allowedLayers: ["sa2", "lga"],
    note: "Fast DC stations with CCS2 connectors (50+ kW).",
  },
  {
    key: "ev_chademo",
    evFilter: "CHAdeMO",
    group: "ev",
    label: "CHAdeMO",
    unit: "kW (max)",
    format: (v) => `${Math.round(v)} kW`,
    colors: ["#eab308", "#0ea5e9", "#10b981"],
    scale: "ev_power",
    allowedLayers: ["sa2", "lga"],
    note: "Fast DC stations with CHAdeMO connectors (50+ kW).",
  },
  {
    key: "ev_tesla",
    evFilter: "Tesla",
    group: "ev",
    label: "Tesla",
    unit: "kW (max)",
    format: (v) => `${Math.round(v)} kW`,
    colors: ["#eab308", "#0ea5e9", "#10b981"],
    scale: "ev_power",
    allowedLayers: ["sa2", "lga"],
    note: "Tesla Supercharger fast DC locations across Australia.",
  },
  {
    key: "ev_price",
    evFilter: "price",
    group: "ev",
    label: "By Price ($/kWh)",
    unit: "$/kWh (cheapest)",
    format: (v) => (v === 0 ? "Free" : `$${v.toFixed(2)}/kWh`),
    colors: ["#16a34a", "#eab308", "#dc2626"],
    scale: "ev_price",
    allowedLayers: ["sa2", "lga"],
    invertRank: true,
    note: "Shaded by cheapest listed fast-charging price ($/kWh or Free) in each Suburb (SA2) or LGA.",
  },
];

function isEvMetric(m = state.metric) {
  return Boolean(m && m.group === "ev");
}

function metricSupportsLayer(m, layerKey) {
  if (!m) return true;
  if (m.allowedLayers) return m.allowedLayers.includes(layerKey);
  return m.layerOnly ? m.layerOnly === layerKey : true;
}

function defaultLayerForMetric(m) {
  if (!m) return null;
  if (m.layerOnly) return m.layerOnly;
  return m.allowedLayers ? m.allowedLayers[0] : null;
}

const ALL_METRICS = [
  ...CENSUS_METRICS,
  ...ELECTION_METRICS,
  ...STATE_ELECTION_METRICS,
  ...CRIME_METRICS,
  ...FUEL_METRICS,
  ...EV_METRICS,
];

const CITIES = [
  { name: "Australia", coords: null, scale: 1 },
  { name: "Sydney", coords: [151.1, -33.86], scale: 11 },
  { name: "Melbourne", coords: [145.0, -37.82], scale: 11 },
  { name: "Brisbane", coords: [153.03, -27.47], scale: 10 },
  { name: "Perth", coords: [115.86, -31.95], scale: 9 },
  { name: "Adelaide", coords: [138.6, -34.93], scale: 11 },
  { name: "Canberra", coords: [149.13, -35.28], scale: 14 },
];

const INCIDENT_CATS = {
  violent: { label: "Violent", color: "#dc2626" },
  property: { label: "Property", color: "#d97706" },
  vehicle: { label: "Vehicle/Traffic", color: "#2563eb" },
  drugs_weapons: { label: "Drugs & Weapons", color: "#9333ea" },
  other: { label: "Other", color: "#64748b" },
};

const QPS_API_BASE = "https://a5c7zwf7e5.execute-api.ap-southeast-2.amazonaws.com/dev";

const QPS_VIOLENT_RE = /assault|homicide|robbery|against the person/i;
const QPS_VEHICLE_RE = /traffic|motor vehicle/i;
const QPS_DRUG_WEAPON_RE = /drug|weapon/i;
const QPS_PROPERTY_RE = /arson|fraud|stolen goods|damage|theft|trespass|unlawful entry|stock/i;

function classifyQpsOffence(typeStr) {
  const s = String(typeStr || "");
  if (QPS_VIOLENT_RE.test(s)) return "violent";
  if (QPS_VEHICLE_RE.test(s)) return "vehicle";
  if (QPS_DRUG_WEAPON_RE.test(s)) return "drugs_weapons";
  if (QPS_PROPERTY_RE.test(s)) return "property";
  return "other";
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function safeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : "";
}

const state = {
  layerKey: "sa4",
  cache: {},
  ste: null,
  national: null,
  cities: null,
  states: null,
  metric: CENSUS_METRICS[0],
  activeGroup: "housing",
  selectedCode: null,
  activeCity: "Australia",
  activeState: null,
  showIncidents: false,
  incidentCat: "all",
  qldDays: 14,
  incidentsData: null,
  qldMbCentroids: null,
  qldNhwByLga: null,
  qldLiveCache: new Map(),
  qldNhwGeoCache: new Map(),
  activeQldPins: [],
  activeQldMeta: null,
  selectedNhw: "",
  selectedPinId: null,
  userToggledPinsOff: false,
  showFuel: false,
  fuelType: "E10_U91",
  fuelData: null,
  selectedFuelCode: null,
  showEv: false,
  evData: null,
  selectedEvId: null,
  raiData: null,
};

let svg, mapGroup, regionLayer, nhwLayer, fuelLayer, evLayer, fuelLabelLayer, pinLayer, labelLayer, pathGen, projection, zoomBehavior;
let currentTransform = d3.zoomIdentity;
let labelCandidates = [];
let labelRaf = null;
let pinRaf = null;
let fuelRaf = null;
let evRaf = null;
let layerLoadSeq = 0;
let qldFetchSeq = 0;
const rankCache = new Map();
let width = 900;
let height = 650;

function currentGeo() {
  return state.cache[state.layerKey];
}

function metricsInGroup(groupKey) {
  return ALL_METRICS.filter((m) => m.group === groupKey);
}

const DATA_VERSION = "20261123f";

function showLoading(msg) {
  const el = document.getElementById("map-loading");
  const txt = document.getElementById("map-loading-text");
  if (txt) txt.textContent = msg;
  if (el) el.hidden = false;
}

function hideLoading() {
  const el = document.getElementById("map-loading");
  if (el) el.hidden = true;
}

function parseHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  let metric = params.get("metric") || "";
  if (metric === "pct_no_religion") metric = "pct_affiliated";
  if (!metric && params.get("fuel") === "1") {
    const ftype = (params.get("ftype") || "E10").toUpperCase();
    metric = `fuel_${ftype}`;
  }
  return {
    layer: params.get("layer") || "",
    metric,
    code: params.get("code") || "",
    city: params.get("city") || "",
    stateAbbr: (params.get("state") || "").toUpperCase(),
    pins: params.get("pins") === "1",
  };
}

function syncHash() {
  const params = new URLSearchParams();
  if (state.layerKey !== "sa4") params.set("layer", state.layerKey);
  if (state.metric.key !== CENSUS_METRICS[0].key) params.set("metric", state.metric.key);
  if (state.selectedCode) {
    params.set("code", state.selectedCode);
  } else if (state.activeCity && state.activeCity !== "Australia") {
    params.set("city", state.activeCity);
  } else if (state.activeState) {
    params.set("state", state.activeState);
  }
  if (state.showIncidents) params.set("pins", "1");
  const qs = params.toString();
  const hashStr = qs ? `#${qs}` : "";
  if (hashStr !== window.location.hash) {
    history.replaceState(null, "", hashStr || `${window.location.pathname}${window.location.search}`);
  }
}

async function loadLayer(key) {
  if (state.cache[key]) return state.cache[key];
  const cfg = LAYERS.find((l) => l.key === key);
  const data = await d3.json(`${cfg.file}?v=${DATA_VERSION}`);
  state.cache[key] = data;
  if ((key === "lga" || key === "sa2") && state.fuelData) attachFuelToLayer(key);
  if ((key === "lga" || key === "sa2") && state.evData) attachEvToLayer(key);
  if (state.raiData) attachRaiToLayer(key);
  return data;
}

async function init() {
  initTheme();
  const initial = parseHash();
  const hashLayer = LAYERS.find((l) => l.key === initial.layer);
  const hashMetric = ALL_METRICS.find((m) => m.key === initial.metric);
  if (hashLayer) state.layerKey = hashLayer.key;
  if (hashMetric) state.metric = hashMetric;
  if (!metricSupportsLayer(state.metric, state.layerKey)) {
    state.layerKey = defaultLayerForMetric(state.metric) || state.layerKey;
  }
  state.activeGroup = state.metric.group || "housing";

  showLoading(`Loading ${LAYERS.find((l) => l.key === state.layerKey).label}…`);
  let initialGeo;
  let ste, national, cities, states;
  try {
    [initialGeo, ste, national, cities, states] = await Promise.all([
      loadLayer(state.layerKey),
      d3.json(`data/ste_2021.geojson?v=${DATA_VERSION}`),
      d3.json(`data/national_2021.json?v=${DATA_VERSION}`),
      d3.json(`data/cities_2021.json?v=${DATA_VERSION}`),
      d3.json(`data/states_2021.json?v=${DATA_VERSION}`),
    ]);
  } finally {
    hideLoading();
  }
  state.ste = ste;
  state.national = national;
  state.cities = cities;
  state.states = states;

  const initLayerCfg = LAYERS.find((l) => l.key === state.layerKey);
  document.getElementById("subtitle").textContent = `ABS 2021 · ${initLayerCfg.desc}`;

  const matchedCity =
    !initial.code && initial.city
      ? CITIES.find((c) => c.name.toLowerCase() === initial.city.toLowerCase() && c.coords)
      : null;
  const matchedState =
    !initial.code && !matchedCity && initial.stateAbbr && state.states[initial.stateAbbr]
      ? initial.stateAbbr
      : null;

  if (matchedCity) {
    state.activeCity = matchedCity.name;
    state.activeState = null;
  } else if (matchedState) {
    state.activeState = matchedState;
    state.activeCity = null;
  }

  buildLayerSwitch();
  buildMetricGroups();
  buildMetricTabs();
  buildCityBar();
  buildStateBar();
  initIncidentControls();
  initSearch();
  initMap(initialGeo);
  renderLayerPaths();

  if (isFuelMetric(state.metric)) {
    state.showFuel = true;
    state.fuelType = state.metric.fuelType;
    await loadFuelData();
    attachFuelToLayer(state.layerKey);
  } else if (isEvMetric(state.metric)) {
    state.showEv = true;
    await loadEvData();
    attachEvToLayer(state.layerKey);
  } else if (state.metric.key === "rai") {
    await loadRaiData();
    attachRaiToLayer(state.layerKey);
  }

  renderChoropleth();

  let selectedFeat = null;
  if (initial.code) {
    selectedFeat = initialGeo.features.find((f) => String(f.properties.code) === String(initial.code));
    if (selectedFeat) {
      state.selectedCode = selectedFeat.properties.code;
      updateSelectionHighlight();
      focusFeature(selectedFeat, true);
    }
  } else if (matchedCity) {
    zoomToCity(matchedCity, true);
  } else if (matchedState) {
    const info = state.states[matchedState];
    const steFeat = state.ste.features.find((f) => String(f.properties.STE_CODE21) === String(info.code));
    if (steFeat) focusFeature(steFeat, true);
  }

  if (!isFuelMetric(state.metric) && !isEvMetric(state.metric) && (initial.pins || state.metric.key === "crime_rate_100k")) {
    await setIncidentsEnabled(true, { skipSync: true });
  }
  if (state.showFuel) {
    renderFuelPins();
  }
  if (state.showEv) {
    renderEvPins();
  }

  renderDossier();

  document.getElementById("clear-selection").addEventListener("click", () => {
    state.selectedCode = null;
    state.activeCity = "Australia";
    state.activeState = null;
    clearActiveQld();
    state.selectedFuelCode = null;
    state.selectedEvId = null;
    document.querySelectorAll(".city-btn").forEach((b) => b.classList.toggle("active", b.textContent === "Australia"));
    updateSelectionHighlight();
    zoomToCity(CITIES[0]);
    renderPins();
    renderFuelPins();
    renderEvPins();
    renderDossier();
    syncHash();
  });
}

function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const saved = localStorage.getItem("atlas-theme") || "light";
  applyTheme(saved);
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("atlas-theme", next);
    applyTheme(next);
  });
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  document.getElementById("theme-toggle").textContent = mode === "dark" ? "Light" : "Dark";
}

async function switchLayer(targetKey, opts = {}) {
  const l = LAYERS.find((x) => x.key === targetKey);
  if (!l) return;
  const seq = ++layerLoadSeq;
  if (!state.cache[l.key]) showLoading(`Loading ${l.label}…`);

  try {
    await loadLayer(l.key);
  } finally {
    if (seq === layerLoadSeq) hideLoading();
  }
  if (seq !== layerLoadSeq) return;

  state.layerKey = l.key;
  if (!opts.preserveSelection) {
    state.selectedCode = null;
    clearActiveQld();
  }
  document.querySelectorAll("#layer-switch .layer-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.layer === l.key);
  });
  document.getElementById("subtitle").textContent = `ABS 2021 · ${l.desc}`;

  if (!metricSupportsLayer(state.metric, l.key)) {
    state.metric = CENSUS_METRICS[0];
    state.activeGroup = state.metric.group;
    state.showFuel = false;
    state.selectedFuelCode = null;
    state.showEv = false;
    state.selectedEvId = null;
  }
  buildMetricGroups();
  buildMetricTabs();
  renderLayerPaths();
  renderChoropleth();
  renderPins();
  renderFuelPins();
  renderEvPins();
  renderDossier();
  syncHash();
}

function buildLayerSwitch() {
  const wrap = document.getElementById("layer-switch");
  LAYERS.forEach((l) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.layer = l.key;
    btn.dataset.tip = l.tip;
    btn.title = l.tip;
    btn.className = "layer-btn" + (l.key === state.layerKey ? " active" : "");
    btn.textContent = l.label;
    btn.addEventListener("click", async () => {
      if (l.key === state.layerKey) return;
      await switchLayer(l.key);
    });
    wrap.appendChild(btn);
  });
}

async function selectMetric(m) {
  const wasFuel = isFuelMetric(state.metric);
  state.metric = m;
  state.activeGroup = m.group;

  if (isFuelMetric(m)) {
    state.showFuel = true;
    state.fuelType = m.fuelType;
    state.selectedFuelCode = null;
    if (state.showEv) {
      state.showEv = false;
      state.selectedEvId = null;
      renderEvPins();
    }
    if (state.showIncidents) {
      await setIncidentsEnabled(false, { skipSync: true });
    }
    if (!state.fuelData) {
      showLoading("Loading NSW FuelCheck…");
      try {
        await loadFuelData();
      } finally {
        hideLoading();
      }
    }
    if (!wasFuel) {
      if (state.layerKey !== "sa2") {
        await switchLayer("sa2");
      } else {
        attachFuelToLayer(state.layerKey);
        buildMetricGroups();
        buildMetricTabs();
        renderChoropleth();
        renderFuelPins();
      }
      const sydney = CITIES.find((c) => c.name === "Sydney");
      if (sydney) {
        state.activeCity = sydney.name;
        state.activeState = null;
        state.selectedCode = null;
        clearActiveQld();
        document.querySelectorAll(".quick-bars .city-btn").forEach((b) => {
          b.classList.toggle("active", b.textContent === sydney.name);
        });
        updateSelectionHighlight();
        zoomToCity(sydney);
      }
      renderDossier();
      syncHash();
    } else if (!metricSupportsLayer(m, state.layerKey)) {
      await switchLayer(defaultLayerForMetric(m) || "sa2");
    } else {
      attachFuelToLayer(state.layerKey);
      buildMetricGroups();
      buildMetricTabs();
      renderChoropleth();
      renderFuelPins();
      renderDossier();
      syncHash();
    }
    return;
  }

  if (state.showFuel) {
    state.showFuel = false;
    state.selectedFuelCode = null;
    renderFuelPins();
  }

  if (isEvMetric(m)) {
    state.showEv = true;
    state.selectedEvId = null;
    if (state.showIncidents) {
      await setIncidentsEnabled(false, { skipSync: true });
    }
    if (!state.evData) {
      showLoading("Loading EV Fast Chargers…");
      try {
        await loadEvData();
      } finally {
        hideLoading();
      }
    }
    if (!metricSupportsLayer(m, state.layerKey)) {
      await switchLayer(defaultLayerForMetric(m) || "sa2");
    } else {
      attachEvToLayer(state.layerKey);
      buildMetricGroups();
      buildMetricTabs();
      renderChoropleth();
      renderEvPins();
      renderDossier();
      syncHash();
    }
    return;
  }

  if (state.showEv) {
    state.showEv = false;
    state.selectedEvId = null;
    renderEvPins();
  }

  if (m.key === "rai" && !state.raiData) {
    showLoading("Loading Rental Affordability Index…");
    try {
      await loadRaiData();
    } finally {
      hideLoading();
    }
  }
  if (m.key === "rai" && state.raiData) {
    attachRaiToLayer(state.layerKey);
  }

  if (!metricSupportsLayer(m, state.layerKey)) {
    await switchLayer(defaultLayerForMetric(m));
  } else {
    buildMetricGroups();
    buildMetricTabs();
    renderChoropleth();
    renderDossier();
    syncHash();
  }
  if (m.key === "crime_rate_100k" && !state.userToggledPinsOff && !state.showIncidents) {
    await setIncidentsEnabled(true);
  }
}

function buildMetricGroups() {
  const wrap = document.getElementById("metric-groups");
  wrap.innerHTML = "";
  METRIC_GROUPS.forEach((g) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive = g.key === state.activeGroup;
    const hasActiveMetric = !isActive && state.metric.group === g.key;
    btn.className = "group-btn" + (isActive ? " active" : "") + (hasActiveMetric ? " has-active" : "");
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(isActive));
    btn.textContent = g.label;
    btn.addEventListener("click", async () => {
      if (g.key === "fuel" && !isFuelMetric()) {
        await selectMetric(FUEL_METRICS[0]);
        return;
      }
      if (g.key === "ev" && !isEvMetric()) {
        await selectMetric(EV_METRICS[0]);
        return;
      }
      if (state.activeGroup === g.key) return;
      state.activeGroup = g.key;
      buildMetricGroups();
      buildMetricTabs();
    });
    wrap.appendChild(btn);
  });
}

function buildMetricTabs() {
  const container = document.getElementById("metric-tabs");
  container.innerHTML = "";
  metricsInGroup(state.activeGroup).forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "metric-btn" + (m.key === state.metric.key ? " active" : "");
    btn.textContent = m.label;
    btn.addEventListener("click", async () => {
      await selectMetric(m);
    });
    container.appendChild(btn);
  });
}

function buildCityBar() {
  const bar = document.getElementById("city-bar");
  CITIES.filter((c) => c.name !== "Australia").forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "city-btn" + (c.name === state.activeCity ? " active" : "");
    btn.textContent = c.name;
    btn.addEventListener("click", () => {
      state.activeCity = c.name;
      state.activeState = null;
      state.selectedCode = null;
      clearActiveQld();
      document.querySelectorAll(".quick-bars .city-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateSelectionHighlight();
      zoomToCity(c);
      renderPins();
      renderDossier();
      syncHash();
    });
    bar.appendChild(btn);
  });
}

function buildStateBar() {
  const bar = document.getElementById("state-bar");
  const ausBtn = document.createElement("button");
  ausBtn.type = "button";
  ausBtn.className = "city-btn" + (state.activeCity === "Australia" ? " active" : "");
  ausBtn.textContent = "Australia";
  ausBtn.addEventListener("click", () => {
    state.activeCity = "Australia";
    state.activeState = null;
    state.selectedCode = null;
    clearActiveQld();
    document.querySelectorAll(".quick-bars .city-btn").forEach((b) => b.classList.remove("active"));
    ausBtn.classList.add("active");
    updateSelectionHighlight();
    zoomToCity(CITIES[0]);
    renderPins();
    renderDossier();
    syncHash();
  });
  bar.appendChild(ausBtn);

  const order = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];
  order.forEach((abbr) => {
    const info = state.states && state.states[abbr];
    if (!info) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "city-btn" + (state.activeState === abbr ? " active" : "");
    btn.textContent = abbr;
    btn.title = info.name;
    btn.addEventListener("click", () => {
      state.activeState = abbr;
      state.activeCity = null;
      state.selectedCode = null;
      clearActiveQld();
      document.querySelectorAll(".quick-bars .city-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateSelectionHighlight();
      const steFeat = state.ste.features.find((f) => String(f.properties.STE_CODE21) === String(info.code));
      if (steFeat) focusFeature(steFeat);
      renderPins();
      renderDossier();
      syncHash();
    });
    bar.appendChild(btn);
  });
}

function mainlandBoundsFeatureCollection(fallbackGeo) {
  if (state.ste && state.ste.features) {
    return {
      type: "FeatureCollection",
      features: state.ste.features.filter((f) => String(f.properties.STE_CODE21) !== "9"),
    };
  }
  return {
    type: "FeatureCollection",
    features: fallbackGeo.features.filter((f) => String(f.properties.ste_code) !== "9"),
  };
}

function initMap(initialGeo) {
  const stage = document.querySelector(".map-stage");
  width = stage.clientWidth;
  height = stage.clientHeight;

  svg = d3.select("#australia-map").attr("viewBox", `0 0 ${width} ${height}`);
  mapGroup = svg.append("g");

  const mainlandFeatures = mainlandBoundsFeatureCollection(initialGeo);

  projection = d3
    .geoConicEqualArea()
    .center([0, -27])
    .rotate([-133.5, 0])
    .parallels([-18, -36])
    .fitExtent(
      [
        [36, 56],
        [width - 36, height - 76],
      ],
      mainlandFeatures
    );

  pathGen = d3.geoPath(projection);

  let repaintTimer;
  zoomBehavior = d3
    .zoom()
    .scaleExtent([0.75, 600])
    .on("zoom", (event) => {
      currentTransform = event.transform;
      mapGroup.attr("transform", event.transform);
      scheduleLabels();
      schedulePins();
      scheduleFuel();
      scheduleEv();
    })
    .on("end", () => {
      scheduleLabels();
      schedulePins();
      scheduleFuel();
      scheduleEv();
      clearTimeout(repaintTimer);
      repaintTimer = setTimeout(() => {
        svg.style("shape-rendering", "crispEdges");
        svg.node().getBoundingClientRect();
        requestAnimationFrame(() => svg.style("shape-rendering", "geometricPrecision"));
      }, 40);
    });

  svg.call(zoomBehavior);
  svg.on("click", (event) => {
    if (event.defaultPrevented || event.target !== svg.node()) return;
    if (!state.selectedCode && !state.activeState && state.activeCity === "Australia" && !state.selectedPinId && !state.selectedFuelCode && !state.selectedEvId) return;
    state.selectedCode = null;
    state.activeState = null;
    state.activeCity = "Australia";
    clearActiveQld();
    state.selectedFuelCode = null;
    state.selectedEvId = null;
    document.querySelectorAll(".quick-bars .city-btn").forEach((b) => {
      b.classList.toggle("active", b.textContent === "Australia");
    });
    updateSelectionHighlight();
    renderPins();
    renderFuelPins();
    renderEvPins();
    renderDossier();
    syncHash();
  });
  svg.on("mouseenter", () => {
    if (document.activeElement !== document.getElementById("region-search")) {
      svg.node().focus({ preventScroll: true });
    }
  });

  regionLayer = mapGroup.append("g").attr("class", "sa4-layer");

  mapGroup
    .append("g")
    .attr("class", "ste-layer")
    .selectAll("path")
    .data(state.ste.features)
    .join("path")
    .attr("class", "ste-border")
    .attr("d", pathGen);

  nhwLayer = mapGroup.append("g").attr("class", "nhw-layer");
  fuelLayer = svg.append("g").attr("class", "fuel-layer");
  evLayer = svg.append("g").attr("class", "ev-layer");
  pinLayer = svg.append("g").attr("class", "pin-layer");
  labelLayer = svg.append("g").attr("class", "label-layer");
  fuelLabelLayer = svg.append("g").attr("class", "fuel-label-layer");

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });

  document.getElementById("zoom-in").addEventListener("click", () => {
    svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.6);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.625);
  });
  document.getElementById("zoom-reset").addEventListener("click", () => {
    document.getElementById("australia-map").classList.remove("flipped");
    zoomToCity(CITIES[0]);
  });

  let brandClicks = 0;
  let brandTimer;
  document.querySelector(".brand").addEventListener("click", () => {
    brandClicks += 1;
    clearTimeout(brandTimer);
    brandTimer = setTimeout(() => (brandClicks = 0), 2000);
    if (brandClicks >= 5) {
      brandClicks = 0;
      state.sausageMode = !state.sausageMode;
      showToast(
        state.sausageMode
          ? "🌭 Democracy Sausage unlocked — onions on top or bottom?"
          : "Democracy Sausage mode off"
      );
      renderDossier();
    }
  });
}

function handleResize() {
  const stage = document.querySelector(".map-stage");
  if (!stage) return;
  const newW = stage.clientWidth;
  const newH = stage.clientHeight;
  if (!newW || !newH || (newW === width && newH === height)) return;

  const prevK = currentTransform.k;
  const centerLonLat =
    prevK > 1.05 && projection.invert
      ? projection.invert(currentTransform.invert([width / 2, height / 2]))
      : null;

  width = newW;
  height = newH;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  projection.fitExtent(
    [
      [36, 56],
      [width - 36, height - 76],
    ],
    mainlandBoundsFeatureCollection(currentGeo())
  );

  regionLayer.selectAll("path").attr("d", pathGen);
  mapGroup.selectAll(".ste-border").attr("d", pathGen);
  if (nhwLayer) nhwLayer.selectAll("path").attr("d", pathGen);
  buildLabelCandidates();
  reprojectPins();
  reprojectFuel();
  reprojectEv();

  if (centerLonLat && Number.isFinite(centerLonLat[0]) && Number.isFinite(centerLonLat[1])) {
    const [nx, ny] = projection(centerLonLat);
    const nextT = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(prevK)
      .translate(-nx, -ny);
    svg.call(zoomBehavior.transform, nextT);
  } else {
    svg.call(zoomBehavior.transform, d3.zoomIdentity);
  }
  renderLabels();
  renderPins();
  renderFuelPins();
  renderEvPins();
}

function showToast(msg) {
  let el = document.querySelector(".atlas-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "atlas-toast";
    document.querySelector(".map-stage").appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), 3800);
}

function largestPolygonGeo(feature) {
  if (feature.geometry.type === "MultiPolygon" && feature.geometry.coordinates.length > 1) {
    let bestPoly = feature.geometry.coordinates[0];
    let bestArea = 0;
    for (const poly of feature.geometry.coordinates) {
      const area = pathGen.area({ type: "Polygon", coordinates: poly });
      if (area > bestArea) {
        bestArea = area;
        bestPoly = poly;
      }
    }
    return { type: "Polygon", coordinates: bestPoly };
  }
  return feature;
}

function shortLabelName(name) {
  return name
    .replace(/\s*\([^)]*\)$/, "")
    .replace(/^(Sydney|Melbourne|Brisbane|Perth|Adelaide)\s*-\s*/i, "")
    .trim();
}

function buildLabelCandidates() {
  labelCandidates = currentGeo()
    .features.map((f) => {
      const geom = largestPolygonGeo(f);
      const area = pathGen.area(geom);
      const [[x0, y0], [x1, y1]] = pathGen.bounds(geom);
      const [cx, cy] = pathGen.centroid(geom);
      const label = shortLabelName(f.properties.name);
      return {
        code: f.properties.code,
        label,
        cx,
        cy,
        bw: x1 - x0,
        bh: y1 - y0,
        area,
        pop: f.properties.pop || 0,
        estW: label.length * 6.3 + 10,
        estH: 14,
      };
    })
    .filter((c) => Number.isFinite(c.cx) && Number.isFinite(c.cy) && c.area > 0)
    .sort((a, b) => b.area * Math.log10(b.pop + 10) - a.area * Math.log10(a.pop + 10));
}

function scheduleLabels() {
  if (labelRaf) return;
  labelRaf = requestAnimationFrame(() => {
    labelRaf = null;
    renderLabels();
  });
}

function renderLabels() {
  if (!labelLayer) return;
  const { x: tx, y: ty, k } = currentTransform;
  const atMaxZoom = k >= 520;
  const placed = [];
  const visible = [];
  const priceLabels = [];
  const placedPriceCodes = new Set();
  const padX = 5;
  const padY = 3;
  const showFuelPrices = state.showFuel && isFuelMetric();
  const showEvBadges = state.showEv && isEvMetric();
  const showZoneBadges = showFuelPrices || showEvBadges;
  const zoneBadgeByCode = new Map();
  if (showZoneBadges) {
    for (const f of currentGeo().features) {
      const val = f.properties[state.metric.key];
      if (showFuelPrices) {
        if (val != null && val > 0) zoneBadgeByCode.set(f.properties.code, `${val.toFixed(1)}¢`);
      } else if (state.metric.key === "ev_price") {
        if (val != null && val >= 0) {
          zoneBadgeByCode.set(f.properties.code, val === 0 ? "Free" : `$${val.toFixed(2)}`);
        }
      } else if (val != null && val > 0) {
        zoneBadgeByCode.set(f.properties.code, `${Math.round(val)}kW`);
      }
    }
  }

  const tryPlace = (c) => {
    const sx = c.cx * k + tx;
    const sy = c.cy * k + ty;
    if (sx < 18 || sx > width - 18 || sy < 56 || sy > height - 48) return false;

    const screenW = c.bw * k;
    const screenH = c.bh * k;
    const isSel = c.code === state.selectedCode;
    const badge = showZoneBadges ? zoneBadgeByCode.get(c.code) : null;
    const hasBadge = badge != null;

    if (!atMaxZoom) {
      // Require label to fit inside the polygon's screen bounding box (prevents spilling over boundaries)
      if (!isSel && (screenW < c.estW * 0.95 || screenH < c.estH * 1.25)) return false;

      const halfW = hasBadge ? Math.max(c.estW / 2, 18) : c.estW / 2;
      const effPadX = hasBadge ? 3 : padX;
      const box = hasBadge
        ? {
            x0: sx - halfW - effPadX,
            y0: sy - 12,
            x1: sx + halfW + effPadX,
            y1: sy + 12.5,
          }
        : {
            x0: sx - halfW - padX,
            y0: sy - c.estH / 2 - padY,
            x1: sx + halfW + padX,
            y1: sy + c.estH / 2 + padY,
          };

      for (const p of placed) {
        if (box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0) return false;
      }
      placed.push(box);
    }

    visible.push({ code: c.code, label: c.label, sx, sy: hasBadge ? sy - 6 : sy, isSel });
    if (hasBadge) {
      placedPriceCodes.add(c.code);
      priceLabels.push({ code: c.code, sx, sy: sy + 7, txt: badge });
    }
    return true;
  };

  if (state.selectedCode) {
    const sel = labelCandidates.find((c) => c.code === state.selectedCode);
    if (sel) tryPlace(sel);
  }

  for (const c of labelCandidates) {
    if (!atMaxZoom && visible.length >= 65) break;
    if (c.code === state.selectedCode) continue;
    tryPlace(c);
  }

  labelLayer
    .selectAll("text")
    .data(visible, (d) => d.code)
    .join("text")
    .attr("class", (d) => (d.isSel ? "map-label selected" : "map-label"))
    .attr("x", (d) => d.sx)
    .attr("y", (d) => d.sy)
    .text((d) => d.label);

  if (showZoneBadges && fuelLabelLayer) {
    if (atMaxZoom || k >= 1.8 || state.selectedCode) {
      for (const c of labelCandidates) {
        if (!atMaxZoom && priceLabels.length >= 180) break;
        if (placedPriceCodes.has(c.code)) continue;
        const badge = zoneBadgeByCode.get(c.code);
        if (badge == null) continue;
        const isSel = c.code === state.selectedCode;
        if (!atMaxZoom && k < 1.8 && !isSel) continue;
        const sx = c.cx * k + tx;
        const sy = c.cy * k + ty;
        if (sx < 18 || sx > width - 18 || sy < 56 || sy > height - 48) continue;
        if (!atMaxZoom && !isSel && (c.bw * k < 5 || c.bh * k < 4)) continue;
        if (!atMaxZoom) {
          const box = { x0: sx - 17, y0: sy - 5, x1: sx + 17, y1: sy + 5 };
          if (placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) continue;
          placed.push(box);
        }
        placedPriceCodes.add(c.code);
        priceLabels.push({ code: c.code, sx, sy, txt: badge });
      }
    }
    fuelLabelLayer
      .selectAll("text")
      .data(priceLabels, (d) => d.code)
      .join("text")
      .attr("class", "fuel-price-lbl")
      .attr("x", (d) => d.sx)
      .attr("y", (d) => d.sy)
      .text((d) => d.txt);
  } else if (fuelLabelLayer) {
    fuelLabelLayer.selectAll("text").remove();
  }
}

function selectRegion(code) {
  state.selectedCode = code;
  state.activeCity = null;
  state.activeState = null;
  clearActiveQld();
  state.selectedFuelCode = null;
  state.selectedEvId = null;
  document.querySelectorAll(".quick-bars .city-btn").forEach((b) => b.classList.remove("active"));
  updateSelectionHighlight();
  const feat = currentGeo().features.find((f) => f.properties.code === code);
  if (state.showIncidents && state.layerKey === "lga" && feat && feat.properties.ste_name === "Queensland") {
    fetchQldLiveOffences(code, "");
  }
  renderPins();
  renderFuelPins();
  renderEvPins();
  renderDossier();
  syncHash();
}

function renderLayerPaths() {
  regionLayer
    .selectAll("path")
    .data(currentGeo().features, (d) => d.properties.code)
    .join("path")
    .attr("class", "sa4-region")
    .attr("d", pathGen)
    .on("mousemove", handleHover)
    .on("mouseleave", () => {
      document.getElementById("tooltip").hidden = true;
    })
    .on("click", (_, d) => {
      selectRegion(d.properties.code);
    });
  buildLabelCandidates();
  renderLabels();
}

function zoomToCity(city, instant = false) {
  if (!city.coords) {
    const sel = instant ? svg : svg.transition().duration(450);
    sel.call(zoomBehavior.transform, d3.zoomIdentity);
    return;
  }
  const [x, y] = projection(city.coords);
  const t = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(city.scale)
    .translate(-x, -y);
  const sel = instant ? svg : svg.transition().duration(500);
  sel.call(zoomBehavior.transform, t);
}

function focusFeature(feature, instant = false) {
  const target = largestPolygonGeo(feature);
  const [[x0, y0], [x1, y1]] = pathGen.bounds(target);
  const dx = Math.max(12, x1 - x0);
  const dy = Math.max(12, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const scale = Math.min(220, 0.65 / Math.max(dx / width, dy / height));
  const t = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-cx, -cy);
  const sel = instant ? svg : svg.transition().duration(500);
  sel.call(zoomBehavior.transform, t);
}

const MIN_RANK_POP = 500;

function isRankable(feature) {
  const pop = feature.properties.pop;
  return pop != null && pop >= MIN_RANK_POP;
}

function getColorScale() {
  const m = state.metric;
  const features = currentGeo().features;

  if (m.scale === "party") {
    return {
      color: (v) => PARTY_COLORS[v] || "#94a3b8",
      min: 0,
      max: 100,
    };
  }

  if (m.scale === "diverging") {
    const interp = d3.interpolateRgbBasis(m.colors);
    const s = d3.scaleLinear().domain([25, 75]).range([0, 1]).clamp(true);
    return {
      color: (v) => (v == null ? "#94a3b8" : interp(s(v))),
      min: 25,
      max: 75,
    };
  }

  if (m.scale === "rai") {
    const interp = d3.interpolateRgbBasis(m.colors);
    const s = d3.scaleLinear().domain([50, 80, 100, 120, 150, 180]).range([0, 0.2, 0.4, 0.6, 0.8, 1]).clamp(true);
    return {
      color: (v) => (v == null || v <= 0 ? "#94a3b8" : interp(s(v))),
      min: 50,
      mid: 100,
      max: 180,
    };
  }

  if (m.scale === "fuel") {
    const vals = features
      .map((f) => f.properties[m.key])
      .filter((v) => v != null && v > 0)
      .sort((a, b) => a - b);
    if (!vals.length) {
      return { color: () => "#94a3b8", min: 0, mid: 0, max: 0 };
    }
    const min = vals[0];
    const hi = d3.quantile(vals, 0.9) ?? vals[vals.length - 1];
    const interp = d3.interpolateRgbBasis(m.colors);
    if (!(hi > min)) {
      return { color: (v) => (v == null || v <= 0 ? "#94a3b8" : interp(0.5)), min, mid: min, max: hi };
    }
    const span = hi - min;
    const mid = min + span * 0.15 * (Math.sqrt(1 + 1 / 0.15) - 1);
    return {
      color: (v) => (v == null || v <= 0 ? "#94a3b8" : interp(fuelLogNorm(v, min, hi))),
      min,
      mid,
      max: hi,
    };
  }

  if (m.scale === "ev_price") {
    const vals = features
      .map((f) => f.properties[m.key])
      .filter((v) => v != null && v >= 0)
      .sort((a, b) => a - b);
    if (!vals.length) {
      return { color: () => "#94a3b8", min: 0, mid: 0, max: 0 };
    }
    const min = vals[0];
    const max = vals[vals.length - 1];
    const p10 = d3.quantile(vals, 0.1) ?? min;
    const med = d3.quantile(vals, 0.5) ?? (min + max) / 2;
    const p90 = d3.quantile(vals, 0.9) ?? max;
    const interp = d3.interpolateRgbBasis(m.colors);
    if (!(p90 > p10)) {
      return { color: (v) => (v == null || v < 0 ? "#94a3b8" : interp(0.5)), min, mid: med, max };
    }
    const s = d3.scaleLinear().domain([p10, med, p90]).range([0, 0.5, 1]).clamp(true);
    return {
      color: (v) => (v == null || v < 0 ? "#94a3b8" : interp(s(v))),
      min,
      mid: med,
      max,
    };
  }

  if (m.scale === "ev_power") {
    const interp = d3.interpolateRgbBasis(m.colors);
    const s = d3.scaleLinear().domain([50, 150, 350]).range([0, 0.5, 1]).clamp(true);
    return {
      color: (v) => (v == null || v <= 0 ? "#94a3b8" : interp(s(v))),
      min: 50,
      mid: 150,
      max: 350,
    };
  }

  if (m.scale === "sqrt") {
    const vals = features.filter(isRankable).map((f) => f.properties[m.key]).filter((v) => v != null && v >= 0);
    const max = d3.max(vals) || 1;
    const interp = d3.interpolateRgbBasis(m.colors);
    const s = d3.scaleSqrt().domain([0, max]).range([0, 1]).clamp(true);
    return {
      color: (v) => (v == null || v < 0 ? "#94a3b8" : interp(s(v))),
      min: 0,
      mid: max / 4,
      max,
    };
  }

  const vals = features.filter(isRankable).map((f) => f.properties[m.key]).filter((v) => v > 0);
  const min = d3.min(vals);
  const max = d3.max(vals);
  const interp = d3.interpolateRgbBasis(m.colors);
  if (m.scale === "log") {
    const s = d3.scaleLog().domain([Math.max(0.1, min), max]).range([0, 1]).clamp(true);
    return { color: (v) => (v == null || v <= 0 ? "#94a3b8" : interp(s(Math.max(0.1, v)))), min, max };
  }
  const s = d3.scaleLinear().domain([min, max]).range([0, 1]).clamp(true);
  return { color: (v) => (v == null ? "#94a3b8" : interp(s(v))), min, max };
}

function renderChoropleth() {
  const { color, min, mid: scaleMid, max } = getColorScale();
  const m = state.metric;

  regionLayer
    .selectAll(".sa4-region")
    .transition()
    .duration(220)
    .attr("fill", (d) => color(d.properties[m.key]));

  document.getElementById("legend-title").textContent = m.label;
  document.getElementById("legend-unit").textContent = m.unit;

  const barEl = document.getElementById("legend-bar");
  const ticksEl = document.getElementById("legend-ticks");
  const partiesEl = document.getElementById("legend-parties");
  const noteEl = document.getElementById("legend-note");

  if (m.scale === "party") {
    barEl.hidden = true;
    ticksEl.hidden = true;
    partiesEl.hidden = false;
    partiesEl.innerHTML = [
      { label: "Labor (ALP)", color: "#e11d48" },
      { label: "Liberal (LP/LNP)", color: "#1d4ed8" },
      { label: "Nationals (NAT)", color: "#166534" },
      { label: "Greens", color: "#22c55e" },
      { label: "One Nation (ONP)", color: "#f97316" },
      { label: "Independent", color: "#64748b" },
      { label: "Other (KAP/CA)", color: "#b45309" },
    ]
      .map(
        (p) =>
          `<span class="party-key"><span class="party-dot" style="background:${p.color}"></span>${p.label}</span>`
      )
      .join("");
  } else {
    barEl.hidden = false;
    ticksEl.hidden = false;
    partiesEl.hidden = true;
    barEl.style.background = `linear-gradient(90deg, ${m.colors.join(", ")})`;
    const mid = scaleMid ?? (m.scale === "log" ? Math.sqrt(min * max) : (min + max) / 2);
    const midVal = (m.scale === "fuel" || m.scale === "ev_price" || m.scale === "ev_power" || m.scale === "rai" || m.scale === "sqrt")
      ? (m.scale === "sqrt" ? Math.round(mid * 10) / 10 : mid)
      : (max <= 20 ? mid : Math.round(mid));
    ticksEl.innerHTML =
      `<span>${m.format(min)}</span>` +
      `<span>${m.format(midVal)}</span>` +
      `<span>${m.format(max)}</span>`;
  }

  noteEl.textContent = m.note || "";
  noteEl.hidden = !m.note;
  renderLabels();
}

function updateSelectionHighlight() {
  regionLayer
    .selectAll(".sa4-region")
    .classed("selected", (d) => d.properties.code === state.selectedCode);
  scheduleLabels();
}

function getRank(code, metric) {
  const mObj = typeof metric === "object" ? metric : ALL_METRICS.find((x) => x.key === metric) || { key: metric };
  const key = mObj.key;
  const cacheKey = `${state.layerKey}:${key}`;
  let table = rankCache.get(cacheKey);
  if (!table) {
    table = new Map();
    const asc = Boolean(mObj.invertRank);
    const valid = currentGeo().features.filter(
      (f) =>
        isRankable(f) &&
        f.properties[key] != null &&
        (key === "crime_rate_100k" ? f.properties[key] > 0 : true)
    );
    const cmp = (a, b) => (asc ? a.properties[key] - b.properties[key] : b.properties[key] - a.properties[key]);
    if (mObj.withinState) {
      const byState = new Map();
      for (const f of valid) {
        const ste = f.properties.ste_name || "Other";
        if (!byState.has(ste)) byState.set(ste, []);
        byState.get(ste).push(f);
      }
      for (const [ste, grp] of byState.entries()) {
        grp.sort(cmp);
        const scope = STATE_ABBR[ste] || ste;
        grp.forEach((f, idx) => table.set(f.properties.code, { rank: idx + 1, total: grp.length, scope }));
      }
    } else {
      valid.sort(cmp);
      valid.forEach((f, idx) => table.set(f.properties.code, { rank: idx + 1, total: valid.length, scope: null }));
    }
    rankCache.set(cacheKey, table);
  }
  return table.get(code) || { rank: null, total: table.size, scope: null };
}

function fmtMoney(v, suffix) {
  return v != null && v > 0 ? `$${v.toLocaleString()}${suffix}` : "—";
}

function tooltipRows(rows) {
  return rows
    .map(([k, v]) => `<div class="tooltip-row"><span class="tk">${k}</span><span class="tv">${v}</span></div>`)
    .join("");
}

function tooltipTop5Table(items, colLabel) {
  if (!items || !items.length) return "";
  const body = items
    .slice(0, 5)
    .map(
      ([name, cnt, pct]) =>
        `<tr><td>${name}</td><td>${pct}%</td><td class="muted">${cnt.toLocaleString()}</td></tr>`
    )
    .join("");
  return `<table class="tooltip-table"><thead><tr><th>Top 5 ${colLabel}</th><th>%</th><th>Pop</th></tr></thead><tbody>${body}</tbody></table>`;
}

function buildTooltipDetails(p, metricKey) {
  if (metricKey === "aec_party" || metricKey === "aec_alp_pct") {
    if (!p.aec_party) return "";
    const rows = [];
    if (metricKey === "aec_alp_pct" && p.aec_member) {
      rows.push(["Winner", `${p.aec_member} (${p.aec_party})`]);
    }
    if (p.aec_tcp_pct != null && p.aec_runner_up_party) {
      rows.push(["2CP", `${p.aec_party} ${p.aec_tcp_pct}% vs ${p.aec_runner_up_party} ${p.aec_runner_up_pct}%`]);
    }
    if (p.aec_alp_pct != null && p.aec_coa_pct != null) {
      rows.push(["2PP (ALP/COA)", `${p.aec_alp_pct}% / ${p.aec_coa_pct}%`]);
    }
    if (p.aec_swing != null) {
      rows.push(["Swing", `${p.aec_swing > 0 ? "+" : ""}${p.aec_swing}%`]);
    }
    return rows.length ? `<div class="tooltip-details">${tooltipRows(rows)}</div>` : "";
  }
  if (p.pop == null) return "";
  const hhdSize = p.avg_hhd_size != null ? `${p.avg_hhd_size}` : "—";
  const mortgage = fmtMoney(p.median_mortgage_mo, "/mo");
  const rent = fmtMoney(p.median_rent_wk, "/wk");
  const hhdInc = fmtMoney(p.median_hhd_inc_wk, "/wk");
  const prsnlInc = fmtMoney(p.median_prsnl_inc_wk, "/wk");

  let inner = "";
  switch (metricKey) {
    case "median_hhd_inc_wk":
      inner = tooltipRows([
        ["Avg Household Size", hhdSize],
        ["Monthly Mortgage", mortgage],
        ["Weekly Rent", rent],
        ["Personal Income", prsnlInc],
      ]);
      break;
    case "median_prsnl_inc_wk":
      inner = tooltipRows([
        ["Male Income", fmtMoney(p.median_prsnl_inc_m, "/wk")],
        ["Female Income", fmtMoney(p.median_prsnl_inc_f, "/wk")],
        ["Avg Household Size", hhdSize],
        ["Monthly Mortgage", mortgage],
        ["Weekly Rent", rent],
        ["Household Income", hhdInc],
      ]);
      break;
    case "median_rent_wk":
      inner = tooltipRows([
        ["Avg Household Size", hhdSize],
        ["Monthly Mortgage", mortgage],
        ["Household Income", hhdInc],
        ["Personal Income", prsnlInc],
      ]);
      break;
    case "rai": {
      if (p.rai == null) return "";
      const rows = [
        ["Rating", raiRating(p.rai)],
        ["Est. Rent Share", `~${Math.round(3000 / p.rai)}% of income`],
      ];
      if (p.rai_chg5y != null) {
        rows.push(["5-Yr Change", `${p.rai_chg5y > 0 ? "+" : ""}${p.rai_chg5y} pts (vs 2020)`]);
      }
      if (p.rai_basis) {
        rows.push(["Basis", p.rai_basis]);
      }
      inner = tooltipRows(rows);
      break;
    }
    case "median_mortgage_mo":
      inner = tooltipRows([
        ["Avg Household Size", hhdSize],
        ["Weekly Rent", rent],
        ["Household Income", hhdInc],
        ["Personal Income", prsnlInc],
      ]);
      break;
    case "avg_hhd_size":
      inner = tooltipRows([
        ["Household Income", hhdInc],
        ["Monthly Mortgage", mortgage],
        ["Weekly Rent", rent],
        ["Median Age", p.median_age != null ? `${p.median_age} yrs` : "—"],
        ["Male Income", fmtMoney(p.median_prsnl_inc_m, "/wk")],
        ["Female Income", fmtMoney(p.median_prsnl_inc_f, "/wk")],
      ]);
      break;
    case "pct_owner":
    case "pct_renter":
    case "pct_social_housing":
      if (p.pct_owner == null) return "";
      inner = tooltipRows([
        ["Owned Outright", `${p.pct_owned_outright}%`],
        ["With Mortgage", `${p.pct_mortgage}%`],
        ["Private Renters", `${p.pct_private_rent}%`],
        ["Public Housing", `${p.pct_public_housing}%`],
        ["Community Housing", `${p.pct_community_housing}%`],
      ]);
      break;
    case "median_age":
      inner = tooltipRows([
        ["Male", p.median_age_m != null ? `${p.median_age_m} yrs` : "—"],
        ["Female", p.median_age_f != null ? `${p.median_age_f} yrs` : "—"],
      ]);
      break;
    case "pct_born_overseas":
      inner =
        tooltipRows([["Aus Citizen", p.pct_citizen != null ? `${p.pct_citizen}%` : "—"]]) +
        tooltipTop5Table(p.top_cob, "Countries");
      break;
    case "pct_affiliated":
      inner =
        tooltipRows([["Not Stated", p.pct_religion_ns != null ? `${p.pct_religion_ns}%` : "—"]]) +
        tooltipTop5Table(p.top_rel, "Religions");
      break;
    case "crime_rate_100k":
      if (p.crime_rate_100k == null) return "";
      inner = tooltipRows([
        ["Offences (12 mo)", p.crime_count != null ? p.crime_count.toLocaleString() : "—"],
        ["Source / Period", p.crime_period || "—"],
        ["Comparability", "Compare within state only"],
      ]);
      break;
    case "pct_uni":
      if (p.edu_bd && p.edu_bd.length) {
        const mkRows = (items) =>
          items
            .map(
              ([name, cnt, pct]) =>
                `<tr><td>${name}</td><td>${pct}%</td><td class="muted">${cnt.toLocaleString()}</td></tr>`
            )
            .join("");
        const postSchool = p.edu_bd.slice(0, 6);
        const school = p.edu_bd.slice(6);
        inner =
          `<table class="tooltip-table"><thead><tr><th>Non-School Quals</th><th>%</th><th>Pop</th></tr></thead><tbody>${mkRows(postSchool)}</tbody></table>` +
          (school.length
            ? `<table class="tooltip-table" style="margin-top:6px"><thead><tr><th>School Completed</th><th>%</th><th>Pop</th></tr></thead><tbody>${mkRows(school)}</tbody></table>`
            : "");
      }
      break;
    case "pct_citizen": {
      const cit = p.citizen_p != null ? p.citizen_p : Math.round((p.pop * (p.pct_citizen || 0)) / 100);
      const nonCit = Math.max(0, p.pop - cit);
      const nonPct = Math.max(0, 100 - (p.pct_citizen || 0)).toFixed(1);
      inner =
        tooltipRows([
          ["Aus Citizens", `${cit.toLocaleString()} (${p.pct_citizen}%)`],
          ["Non-Citizen / NS", `${nonCit.toLocaleString()} (${nonPct}%)`],
          ["Born Overseas", p.pct_born_overseas != null ? `${p.pct_born_overseas}%` : "—"],
        ]) + tooltipTop5Table(p.top_cob, "Countries");
      break;
    }
    case "density_sqkm": {
      const tot = p.pop || 1;
      const mStr = p.pop_m != null ? `${p.pop_m.toLocaleString()} (${((100 * p.pop_m) / tot).toFixed(1)}%)` : "—";
      const fStr = p.pop_f != null ? `${p.pop_f.toLocaleString()} (${((100 * p.pop_f) / tot).toFixed(1)}%)` : "—";
      inner = tooltipRows([
        ["Male", mStr],
        ["Female", fStr],
      ]);
      break;
    }
    default:
      if (metricKey.startsWith("fuel_")) {
        const ft = metricKey.slice(5);
        const meta = p._fuelMeta?.[ft];
        if (!meta) return "";
        const scope = state.layerKey === "sa2" ? "Suburb" : "LGA";
        const isComposite = (getFuelMetric(ft)?.fuelTypes?.length || 1) > 1;
        const winFuel = isComposite && meta.cheapestFuelType ? ` · ${meta.cheapestFuelType}` : "";
        inner = tooltipRows([
          ["Cheapest Station", `${escapeHtml(meta.cheapestName)} (${meta.min.toFixed(1)}¢${winFuel})`],
          [`${scope} Median`, `${meta.median.toFixed(1)}¢/L`],
          [`${scope} Highest`, `${meta.max.toFixed(1)}¢/L`],
          ["Stations", String(meta.count)],
        ]);
        break;
      }
      if (metricKey.startsWith("ev_")) {
        const meta = p._evMeta?.[metricKey];
        if (!meta) return "";
        const rows = [];
        if (metricKey === "ev_price") {
          const pStr = meta.minPrice === 0 ? "Free" : `$${meta.minPrice.toFixed(2)}/kWh`;
          rows.push(["Cheapest Charger", `${escapeHtml(meta.bestName)} (${pStr})`]);
        } else {
          rows.push(["Fastest Charger", `${escapeHtml(meta.bestName)} (${Math.round(meta.maxKw)} kW)`]);
        }
        if (meta.techs?.length) rows.push(["Technologies", escapeHtml(meta.techs.join(", "))]);
        if (meta.minPrice != null && metricKey !== "ev_price") {
          const lo = meta.minPrice === 0 ? "Free" : `$${meta.minPrice.toFixed(2)}`;
          const hi = meta.maxPrice === 0 ? "Free" : `$${meta.maxPrice.toFixed(2)}`;
          rows.push(["Price Range", lo === hi ? (lo === "Free" ? "Free" : `${lo}/kWh`) : `${lo}–${hi}/kWh`]);
        }
        rows.push(["Fast Stations", String(meta.count)]);
        inner = tooltipRows(rows);
        break;
      }
      return "";
  }
  return inner ? `<div class="tooltip-details">${inner}</div>` : "";
}

function positionTooltip(event, tip) {
  const stageRect = document.querySelector(".map-stage").getBoundingClientRect();
  const tipW = tip.offsetWidth || 260;
  const tipH = tip.offsetHeight || 120;
  const rawX = event.clientX - stageRect.left + 14;
  const rawY = event.clientY - stageRect.top + 14;
  const x = rawX + tipW > stageRect.width - 10 ? Math.max(10, event.clientX - stageRect.left - tipW - 14) : rawX;
  const y = rawY + tipH > stageRect.height - 10 ? Math.max(10, stageRect.height - tipH - 10) : rawY;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function handleHover(event, d) {
  const tip = document.getElementById("tooltip");
  const p = d.properties;
  const m = state.metric;
  const val = p[m.key];

  let extra = "";
  if (m.scale === "party") {
    if (m.key === "st_party") {
      extra = p.st_member ? `${p.st_member} (${p.st_year} · ${p.st_tcp_pct ?? "—"}%)` : "ACT multi-member";
    } else {
      extra = p.aec_member
        ? `${p.aec_member} (${p.aec_tcp_pct ?? p.aec_alp_pct ?? "—"}% 2CP)`
        : "Abolished 2025";
    }
  } else if (val != null) {
    const { rank, total, scope } = getRank(p.code, m);
    extra = rank ? (scope ? `#${rank}/${total} ${scope}` : `#${rank}/${total}`) : "pop < 500";
  }

  const valStr = val != null ? m.format(val) : "N/A";
  const details = buildTooltipDetails(p, m.key);
  tip.innerHTML = `
    <div class="tooltip-title">${p.name}</div>
    <div class="tooltip-meta">${p.ste_name} · Pop ${p.pop != null ? p.pop.toLocaleString() : "Post-2021 seat"}</div>
    <div class="tooltip-val">${valStr} <span style="opacity:0.75;font-weight:400">${extra}</span></div>
    ${details}
  `;
  tip.hidden = false;
  positionTooltip(event, tip);
}

function renderDossier() {
  const features = currentGeo().features;
  const feat = state.selectedCode
    ? features.find((f) => f.properties.code === state.selectedCode)
    : null;
  const cityProfile = !feat && state.activeCity && state.activeCity !== "Australia" && state.cities
    ? state.cities[state.activeCity]
    : null;
  const stateProfile = !feat && !cityProfile && state.activeState && state.states
    ? state.states[state.activeState]
    : null;
  const quickProfile = cityProfile || stateProfile;
  const p = feat ? feat.properties : (quickProfile || state.national);
  const aus = state.national;
  const layerCfg = LAYERS.find((l) => l.key === state.layerKey);

  document.getElementById("clear-selection").hidden = !feat && !quickProfile;
  document.getElementById("dossier-badge").textContent = feat
    ? p.ste_name
    : (cityProfile ? `${p.ste_name} · Greater City` : (stateProfile ? "State / Territory" : "National Overview"));
  document.getElementById("dossier-title").textContent = (feat || quickProfile) ? p.name : "Australia";
  document.getElementById("dossier-sub").textContent = (feat || quickProfile)
    ? `${p.pop != null ? p.pop.toLocaleString() + " people" : "Post-2021 redistributed seat"} · ${p.area_sqkm.toLocaleString()} km²`
    : `${aus.pop.toLocaleString()} people · ${layerCfg.desc}`;

  const m = state.metric;
  document.getElementById("hero-kpi-label").textContent = m.label;
  if (feat) {
    document.getElementById("hero-kpi-value").textContent = p[m.key] != null ? m.format(p[m.key]) : "N/A";
  } else if (isFuelMetric(m)) {
    const fStats = state.fuelData?.stats?.[m.fuelType];
    document.getElementById("hero-kpi-value").textContent = fStats ? `med ${m.format(fStats.median)}` : "NSW FuelCheck";
  } else if (isEvMetric(m)) {
    const eStats = state.evData?.stats;
    if (!eStats) {
      document.getElementById("hero-kpi-value").textContent = "Open Charge Map";
    } else if (m.key === "ev_price" && eStats.median_price != null) {
      document.getElementById("hero-kpi-value").textContent = `med ${m.format(eStats.median_price)}`;
    } else if (m.key === "ev_ultra") {
      document.getElementById("hero-kpi-value").textContent = `${eStats.ultrafast_count} hubs`;
    } else {
      document.getElementById("hero-kpi-value").textContent = `med ${eStats.median_kw} kW`;
    }
  } else if (quickProfile) {
    document.getElementById("hero-kpi-value").textContent = p[m.key] != null ? m.format(p[m.key]) : "N/A";
  } else if (m.key === "st_party") {
    document.getElementById("hero-kpi-value").textContent = "410 Seats";
  } else if (m.scale === "party") {
    document.getElementById("hero-kpi-value").textContent = "ALP 94 · LNP 43";
  } else if (m.key === "aec_alp_pct") {
    document.getElementById("hero-kpi-value").textContent = "55.2% ALP";
  } else if (m.key === "crime_rate_100k") {
    document.getElementById("hero-kpi-value").textContent = "4 States/Terr.";
  } else if (m.key === "rai") {
    const natMed = state.raiData?.national_med ?? 107;
    document.getElementById("hero-kpi-value").textContent = `med ${natMed}`;
  } else {
    document.getElementById("hero-kpi-value").textContent = p[m.key] != null ? m.format(p[m.key]) : "N/A";
  }

  const rankPill = document.getElementById("hero-rank-pill");
  if (feat && m.scale !== "party" && p[m.key] != null) {
    const { rank, total, scope } = getRank(p.code, m);
    rankPill.textContent = rank
      ? (scope ? `#${rank} of ${total} in ${scope}` : `#${rank} of ${total}`)
      : "Unranked (pop < 500)";
    rankPill.hidden = false;
  } else {
    rankPill.hidden = true;
  }

  const elecPanel = document.getElementById("election-panel");
  if (state.layerKey === "ced" && feat && p.aec_party) {
    elecPanel.hidden = false;
    elecPanel.querySelector("h3").textContent =
      "2025 Federal Election (AEC)" + (state.sausageMode ? " 🌭" : "");
    const partyColor = PARTY_COLORS[p.aec_party] || "#475569";
    const runParty = p.aec_runner_up_party || "COA";
    const runColor = PARTY_COLORS[runParty] || "#64748b";
    const winPct = p.aec_tcp_pct ?? p.aec_alp_pct;
    const runPct = p.aec_runner_up_pct ?? p.aec_coa_pct;
    const swingSign = p.aec_swing > 0 ? "+" : "";
    document.getElementById("election-card").innerHTML = `
      <div class="elec-top">
        <span class="elec-mp">${p.aec_member}</span>
        <span class="party-pill" style="background:${partyColor}">${p.aec_party}</span>
      </div>
      <div class="tpp-bar">
        <div style="width:${winPct}%;background:${partyColor}"></div>
        <div style="width:${runPct}%;background:${runColor}"></div>
      </div>
      <div class="tpp-labels mono">
        <span>${p.aec_party} ${winPct}% (${swingSign}${p.aec_swing}%)</span>
        <span>${runParty} ${runPct}%</span>
      </div>
    `;
  } else if (state.layerKey === "sed" && feat && p.st_party) {
    elecPanel.hidden = false;
    elecPanel.querySelector("h3").textContent =
      `${p.st_year} ${p.ste_name} Election` + (state.sausageMode ? " 🌭" : "");
    const winColor = PARTY_COLORS[p.st_party] || "#475569";
    const runColor = PARTY_COLORS[p.st_runner_up_party] || "#64748b";
    const swingStr = p.st_swing != null ? ` (${p.st_swing > 0 ? "+" : ""}${p.st_swing}%)` : "";
    document.getElementById("election-card").innerHTML = `
      <div class="elec-top">
        <span class="elec-mp">${p.st_member}</span>
        <span class="party-pill" style="background:${winColor}">${p.st_party}</span>
      </div>
      <div class="tpp-bar">
        <div style="width:${p.st_tcp_pct}%;background:${winColor}"></div>
        <div style="width:${p.st_runner_up_pct}%;background:${runColor}"></div>
      </div>
      <div class="tpp-labels mono">
        <span>${p.st_party} ${p.st_tcp_pct}%${swingStr}</span>
        <span>${p.st_runner_up_party || "Runner-up"} ${p.st_runner_up_pct ?? "—"}%</span>
      </div>
    `;
  } else {
    elecPanel.hidden = true;
  }

  renderIncidentsPanel(feat, p);
  renderFuelPanel(feat, p);
  renderEvPanel(feat, p);

  const comparisons = [
    { label: "Household Income", val: p.median_hhd_inc_wk, aus: aus.median_hhd_inc_wk, fmt: (v) => `$${v.toLocaleString()}/wk` },
    { label: "Personal Income", val: p.median_prsnl_inc_wk, aus: aus.median_prsnl_inc_wk, fmt: (v) => `$${v.toLocaleString()}/wk` },
    { label: "Weekly Rent", val: p.median_rent_wk, aus: aus.median_rent_wk, fmt: (v) => `$${v.toLocaleString()}/wk` },
    { label: "Monthly Mortgage", val: p.median_mortgage_mo, aus: aus.median_mortgage_mo, fmt: (v) => `$${v.toLocaleString()}/mo` },
    { label: "Median Age", val: p.median_age, aus: aus.median_age, fmt: (v) => `${v} yrs` },
  ];

  document.getElementById("compare-list").innerHTML = comparisons
    .map((c) => {
      if (c.val == null) {
        return `<div class="compare-row"><div class="compare-top"><span class="label">${c.label}</span><span class="mono" style="color:var(--muted)">N/A (post-2021 seat)</span></div></div>`;
      }
      const maxRef = Math.max(c.val, c.aus) * 1.15;
      const pct = Math.min(100, (c.val / maxRef) * 100);
      const ausPct = Math.min(100, (c.aus / maxRef) * 100);
      return `
        <div class="compare-row">
          <div class="compare-top">
            <span class="label">${c.label}</span>
            <span class="mono"><strong>${c.fmt(c.val)}</strong> <span style="color:var(--muted)">(AU ${c.fmt(c.aus)})</span></span>
          </div>
          <div class="compare-track">
            <div class="compare-fill" style="width:${pct.toFixed(1)}%"></div>
            <div class="compare-aus" style="left:${ausPct.toFixed(1)}%" title="Australia: ${c.fmt(c.aus)}"></div>
          </div>
        </div>`;
    })
    .join("");

  document.getElementById("age-bar").innerHTML = p.pct_age_0_19 != null ? `
    <div class="age-seg-youth" style="width:${p.pct_age_0_19}%"></div>
    <div class="age-seg-work" style="width:${p.pct_age_20_64}%"></div>
    <div class="age-seg-senior" style="width:${p.pct_age_65_plus}%"></div>
  ` : "";
  document.getElementById("age-legend").innerHTML = p.pct_age_0_19 != null ? `
    <span>0–19: ${p.pct_age_0_19}%</span>
    <span>20–64: ${p.pct_age_20_64}%</span>
    <span>65+: ${p.pct_age_65_plus}%</span>
  ` : `<span style="color:var(--muted)">No 2021 Census profile (post-2021 redistributed seat)</span>`;

  document.getElementById("stat-grid").innerHTML = [
    { k: "Born Overseas", v: p.pct_born_overseas != null ? `${p.pct_born_overseas}%` : "N/A" },
    { k: "Aus Citizen", v: p.pct_citizen != null ? `${p.pct_citizen}%` : "N/A" },
    { k: "Non-English Home", v: p.pct_other_lang != null ? `${p.pct_other_lang}%` : "N/A" },
    { k: "Year 12+", v: p.pct_yr12 != null ? `${p.pct_yr12}%` : "N/A" },
    { k: "Uni Degree", v: p.pct_uni != null ? `${p.pct_uni}%` : "N/A" },
    { k: "Avg Household Size", v: p.avg_hhd_size != null ? `${p.avg_hhd_size}` : "N/A" },
    ...(p.pct_owner != null
      ? [
          { k: "Owner-Occupiers", v: `${p.pct_owner}%` },
          { k: "Renters", v: `${p.pct_renter}%` },
          { k: "Social Housing", v: `${p.pct_social_housing}%` },
        ]
      : []),
    ...(p.mean_dwelling_price != null
      ? [{ k: "Mean Dwelling (Jun 26)", v: `$${(p.mean_dwelling_price / 1e6).toFixed(2)}M` }]
      : []),
    ...(p.crime_rate_100k != null
      ? [{ k: `Crime Rate (${p.crime_period || "12 mo"})`, v: `${Math.round(p.crime_rate_100k).toLocaleString()}/100k` }]
      : []),
    ...(p.rai != null
      ? [{ k: "Rental Affordability (RAI)", v: `${p.rai} · ${raiRating(p.rai)}` }]
      : []),
  ]
    .map((s) => `<div class="stat-cell"><div class="k">${s.k}</div><div class="v mono">${s.v}</div></div>`)
    .join("");

  const cobSec = document.getElementById("cob-section");
  const cobList = document.getElementById("cob-list");
  if (p.top_cob && p.top_cob.length) {
    cobSec.hidden = false;
    const maxPct = Math.max(1, p.top_cob[0][2]);
    cobList.innerHTML = p.top_cob
      .map(([country, cnt, pct]) => `
        <div class="cob-row">
          <div class="cob-top">
            <span>${country}</span>
            <span class="mono"><strong>${pct}%</strong> <span style="color:var(--muted)">(${cnt.toLocaleString()})</span></span>
          </div>
          <div class="cob-track"><div class="cob-fill" style="width:${((pct / maxPct) * 100).toFixed(1)}%"></div></div>
        </div>`)
      .join("");
  } else {
    cobSec.hidden = true;
  }

  const relSec = document.getElementById("rel-section");
  const relList = document.getElementById("rel-list");
  if (p.top_rel && p.top_rel.length) {
    relSec.hidden = false;
    const maxRel = Math.max(1, p.top_rel[0][2]);
    relList.innerHTML = p.top_rel
      .map(([rel, cnt, pct]) => `
        <div class="cob-row">
          <div class="cob-top">
            <span>${rel}</span>
            <span class="mono"><strong>${pct}%</strong> <span style="color:var(--muted)">(${cnt.toLocaleString()})</span></span>
          </div>
          <div class="cob-track"><div class="rel-fill" style="width:${((pct / maxRel) * 100).toFixed(1)}%"></div></div>
        </div>`)
      .join("");
  } else {
    relSec.hidden = true;
  }

  const lbSection = document.getElementById("leaderboard-section");
  const lb = document.getElementById("leaderboard");
  if (m.scale === "party") {
    lbSection.hidden = true;
    return;
  }
  lbSection.hidden = false;

  const valid = features.filter(
    (f) => isRankable(f) && f.properties[m.key] != null && (m.scale === "sqrt" ? f.properties[m.key] >= 0 : f.properties[m.key] > 0)
  );
  const sorted = [...valid].sort((a, b) =>
    m.invertRank ? a.properties[m.key] - b.properties[m.key] : b.properties[m.key] - a.properties[m.key]
  );
  const top3 = sorted.slice(0, 3);
  const bot3 = sorted.slice(-3).reverse();

  lb.innerHTML = m.withinState
    ? `<div class="lb-note">State police definitions differ — compare within each state.</div>`
    : "";
  const highTitle = m.key === "rai" ? "Most Affordable" : (m.invertRank ? "Cheapest" : "Highest");
  const lowTitle = m.key === "rai" ? "Least Affordable" : (m.invertRank ? "Most Expensive" : "Lowest");
  [
    { title: highTitle, rows: top3 },
    { title: lowTitle, rows: bot3 },
  ].forEach((grp) => {
    const lbl = document.createElement("div");
    lbl.className = "lb-group-label";
    lbl.textContent = grp.title;
    lb.appendChild(lbl);
    grp.rows.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-row";
      const steTag = m.withinState ? ` (${STATE_ABBR[f.properties.ste_name] || f.properties.ste_name})` : "";
      btn.innerHTML = `<span class="lb-name">${f.properties.name}${steTag}</span><span class="lb-val mono">${m.format(f.properties[m.key])}</span>`;
      btn.addEventListener("click", () => {
        focusFeature(f);
        selectRegion(f.properties.code);
      });
      lb.appendChild(btn);
    });
  });
}

function triggerSpecialQuery(q) {
  if (q === "upside down" || q === "straya") {
    const mapEl = document.getElementById("australia-map");
    const flipped = mapEl.classList.toggle("flipped");
    showToast(flipped ? "Northern Hemisphere View — Reset to flip back" : "Back down under");
    return true;
  }
  if (q === "nz" || q === "new zealand") {
    zoomToCity({ name: "NZ", coords: [163, -36], scale: 2.4 });
    showToast("New Zealand not found — left off the map again (r/MapsWithoutNZ)");
    return true;
  }
  if (q === "emu" || q === "emu war") {
    zoomToCity({ name: "Wheatbelt", coords: [118.2, -31.0], scale: 5.5 });
    document.getElementById("clear-selection").hidden = false;
    document.getElementById("dossier-badge").textContent = "Western Australia · Nov 1932";
    document.getElementById("dossier-title").textContent = "Great Emu War";
    document.getElementById("dossier-sub").textContent = "~20,000 emus · Campion, WA";
    document.getElementById("hero-kpi-label").textContent = "Final Result";
    document.getElementById("hero-kpi-value").textContent = "Emus 100%";
    document.getElementById("hero-rank-pill").hidden = true;
    const ep = document.getElementById("election-panel");
    ep.hidden = false;
    ep.querySelector("h3").textContent = "1932 Conflict Outcome";
    document.getElementById("election-card").innerHTML = `
      <div class="elec-top"><span class="elec-mp">Dromaius novaehollandiae</span><span class="party-pill" style="background:#166534">EMU</span></div>
      <div class="tpp-bar"><div style="width:100%;background:#166534"></div></div>
      <div class="tpp-labels mono"><span>EMUS 100% (+100%)</span><span>RAA 0%</span></div>
    `;
    showToast("1932 Great Emu War — decisive Emu victory");
    return true;
  }
  if (q === "drop bear" || q === "dropbear") {
    document.getElementById("clear-selection").hidden = false;
    document.getElementById("dossier-badge").textContent = "Biosecurity Advisory";
    document.getElementById("dossier-title").textContent = "Drop Bear Alert";
    document.getElementById("dossier-sub").textContent = "Thylarctos plummetus · Eucalyptus canopy";
    document.getElementById("hero-kpi-label").textContent = "Threat Level";
    document.getElementById("hero-kpi-value").textContent = "EXTREME";
    document.getElementById("hero-rank-pill").hidden = true;
    const ep = document.getElementById("election-panel");
    ep.hidden = false;
    ep.querySelector("h3").textContent = "Recommended Countermeasure";
    document.getElementById("election-card").innerHTML = `
      <div class="elec-top"><span class="elec-mp">Vegemite behind ears</span><span class="party-pill" style="background:#dc2626">CRITICAL</span></div>
      <div class="tpp-labels mono"><span>Fork in hair: +12%</span><span>Accent: Mandatory</span></div>
    `;
    showToast("Look up before walking under gum trees");
    return true;
  }
  return false;
}

function initSearch() {
  const input = document.getElementById("region-search");
  const box = document.getElementById("search-results");

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim().toLowerCase();
      if (triggerSpecialQuery(q)) {
        e.preventDefault();
        box.hidden = true;
      }
    }
  });

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      box.hidden = true;
      return;
    }
    const specialLabels = {
      "upside down": ["Northern Hemisphere View", "Press Enter"],
      straya: ["Northern Hemisphere View", "Press Enter"],
      nz: ["New Zealand", "Tasman Sea"],
      "new zealand": ["New Zealand", "Tasman Sea"],
      emu: ["Great Emu War (1932)", "Western Australia"],
      "drop bear": ["Drop Bear Advisory", "Canopy Alert"],
    };
    if (specialLabels[q]) {
      box.innerHTML = "";
      const [lbl, sub] = specialLabels[q];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-item";
      btn.innerHTML = `${lbl} <span>${sub}</span>`;
      btn.addEventListener("click", () => {
        box.hidden = true;
        triggerSpecialQuery(q);
      });
      box.appendChild(btn);
      box.hidden = false;
      return;
    }
    const matches = currentGeo()
      .features.filter(
        (f) => f.properties.name.toLowerCase().includes(q) || f.properties.ste_name.toLowerCase().includes(q)
      )
      .slice(0, 8);

    if (!matches.length) {
      box.hidden = true;
      return;
    }

    box.innerHTML = "";
    matches.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-item";
      btn.innerHTML = `${f.properties.name} <span>${f.properties.ste_name}</span>`;
      btn.addEventListener("click", () => {
        input.value = f.properties.name;
        box.hidden = true;
        focusFeature(f);
        selectRegion(f.properties.code);
      });
      box.appendChild(btn);
    });
    box.hidden = false;
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) box.hidden = true;
  });
}

function clearNhwBoundary() {
  if (nhwLayer) nhwLayer.selectAll("path").remove();
}

function clearActiveQld() {
  qldFetchSeq += 1;
  state.selectedNhw = "";
  state.selectedPinId = null;
  state.activeQldPins = [];
  state.activeQldMeta = null;
  clearNhwBoundary();
}

function initIncidentControls() {
  const toggleBtn = document.getElementById("incidents-toggle");
  const catSel = document.getElementById("incident-cat-filter");
  const winSel = document.getElementById("qld-window-select");

  toggleBtn.addEventListener("click", async () => {
    const next = !state.showIncidents;
    state.userToggledPinsOff = !next;
    await setIncidentsEnabled(next);
  });

  catSel.addEventListener("change", () => {
    state.incidentCat = catSel.value;
    state.selectedPinId = null;
    renderPins();
    renderDossier();
  });

  winSel.addEventListener("change", async () => {
    state.qldDays = Number(winSel.value) || 14;
    state.selectedPinId = null;
    if (state.showIncidents && state.layerKey === "lga" && state.selectedCode) {
      const feat = currentGeo()?.features.find((f) => f.properties.code === state.selectedCode);
      if (feat && feat.properties.ste_name === "Queensland") {
        await fetchQldLiveOffences(state.selectedCode, state.selectedNhw);
        return;
      }
    }
    renderPins();
    renderDossier();
  });
}

async function setIncidentsEnabled(enabled, opts = {}) {
  state.showIncidents = Boolean(enabled);
  const toggleBtn = document.getElementById("incidents-toggle");
  const filtersEl = document.getElementById("incident-filters");
  toggleBtn.classList.toggle("active", state.showIncidents);
  toggleBtn.setAttribute("aria-pressed", String(state.showIncidents));
  filtersEl.hidden = !state.showIncidents;

  if (!state.showIncidents) {
    clearActiveQld();
    renderPins();
    renderDossier();
    if (!opts.skipSync) syncHash();
    return;
  }

  await loadRecentIncidents();
  if (state.layerKey === "lga" && state.selectedCode) {
    const feat = currentGeo()?.features.find((f) => f.properties.code === state.selectedCode);
    if (feat && feat.properties.ste_name === "Queensland") {
      fetchQldLiveOffences(state.selectedCode, state.selectedNhw);
    }
  }
  renderPins();
  renderDossier();
  if (!opts.skipSync) syncHash();
}

async function loadRecentIncidents() {
  if (state.incidentsData) return state.incidentsData;
  try {
    const data = await d3.json(`data/recent_incidents.json?v=${DATA_VERSION}`);
    state.incidentsData = data;
    reprojectPins();
  } catch (err) {
    console.warn("Failed to load recent_incidents.json:", err);
  }
  return state.incidentsData;
}

async function loadQldRefs() {
  if (state.qldMbCentroids && state.qldNhwByLga) return;
  const [mbs, nhw] = await Promise.all([
    state.qldMbCentroids || d3.json(`data/qld_mb_centroids.json?v=${DATA_VERSION}`),
    state.qldNhwByLga || d3.json(`data/qld_nhw_by_lga.json?v=${DATA_VERSION}`),
  ]);
  state.qldMbCentroids = mbs;
  state.qldNhwByLga = nhw;
}

function projectPinList(list) {
  if (!projection || !list) return;
  for (const d of list) {
    const pt = projection([d.lon, d.lat]);
    if (pt) {
      d.px = pt[0];
      d.py = pt[1];
    }
  }
}

function reprojectPins() {
  if (state.incidentsData) {
    projectPinList(state.incidentsData.rss);
    projectPinList(state.incidentsData.sa);
  }
  projectPinList(state.activeQldPins);
}

function schedulePins() {
  if (!state.showIncidents || pinRaf) return;
  pinRaf = requestAnimationFrame(() => {
    pinRaf = null;
    renderPins();
  });
}

function formatQpsDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

async function fetchNhwBoundary(nhwName) {
  if (!nhwName) {
    clearNhwBoundary();
    return null;
  }
  let fc = state.qldNhwGeoCache.get(nhwName);
  if (!fc) {
    const url = `${QPS_API_BASE}/locations?locationType=NHW&locationName=${encodeURIComponent(nhwName)}`;
    const raw = await d3.json(url);
    fc = Array.isArray(raw) ? raw[0] : raw;
    if (fc && fc.features && fc.features.length) {
      state.qldNhwGeoCache.set(nhwName, fc);
    } else {
      fc = null;
    }
  }
  if (!fc || !nhwLayer) {
    clearNhwBoundary();
    return null;
  }
  nhwLayer
    .selectAll("path")
    .data(fc.features)
    .join("path")
    .attr("class", "nhw-boundary")
    .attr("d", pathGen);
  return fc.features[0] || null;
}

async function fetchQldLiveOffences(lgaCode, nhwName = "") {
  const seq = ++qldFetchSeq;
  const days = state.qldDays || 14;
  state.selectedNhw = nhwName;
  state.activeQldPins = [];
  state.activeQldMeta = {
    lgaCode,
    nhwName,
    days,
    loading: true,
    error: null,
    totalOffences: 0,
    blockCount: 0,
    catCounts: {},
    scopeLabel: nhwName || "LGA",
  };
  renderDossier();

  try {
    await loadQldRefs();
    if (seq !== qldFetchSeq) return;

    const lgaInfo = state.qldNhwByLga?.by_lga?.[String(lgaCode)];
    if (!lgaInfo) {
      state.activeQldMeta = { ...state.activeQldMeta, loading: false, error: "LGA missing in QPS lookup" };
      renderDossier();
      return;
    }

    const locationType = nhwName ? "NHW" : "LGA";
    const locationName = nhwName || lgaInfo.qps_name;
    const cacheKey = `${locationType}:${locationName}:${days}`;

    if (nhwName) {
      fetchNhwBoundary(nhwName).then((nhwFeat) => {
        if (seq === qldFetchSeq && nhwFeat) focusFeature(nhwFeat);
      }).catch(() => {});
    } else {
      clearNhwBoundary();
    }

    let cached = state.qldLiveCache.get(cacheKey);
    if (!cached) {
      const endD = new Date();
      const startD = new Date(endD.getTime() - (days - 1) * 86400000);
      const startStr = formatQpsDate(startD);
      const endStr = formatQpsDate(endD);
      const url =
        `${QPS_API_BASE}/offences?locationType=${locationType}` +
        `&locationName=${encodeURIComponent(locationName)}` +
        `&startDate=${startStr}&endDate=${endStr}&format=JSON`;
      const raw = await d3.json(url);
      if (seq !== qldFetchSeq) return;

      const byMb = new Map();
      const catCounts = {};
      let totalOffences = 0;

      for (const row of Array.isArray(raw) ? raw : []) {
        const mb = String(row["ABS Meshblock"] || "").trim();
        const coords = state.qldMbCentroids[mb];
        if (!coords) continue;
        totalOffences += 1;
        const offType = String(row.Type || "Other");
        const cat = classifyQpsOffence(offType);
        catCounts[cat] = (catCounts[cat] || 0) + 1;
        const dateStr = String(row.Date || "").slice(0, 16);

        let entry = byMb.get(mb);
        if (!entry) {
          entry = {
            id: `qps-${mb}`,
            source: "qps",
            mb,
            lon: coords[0],
            lat: coords[1],
            postcode: row.Postcode || "",
            area: row["Area of Interest"] || locationName,
            count: 0,
            catCounts: {},
            latestDate: dateStr,
            items: [],
          };
          byMb.set(mb, entry);
        }
        entry.count += 1;
        entry.catCounts[cat] = (entry.catCounts[cat] || 0) + 1;
        if (dateStr > entry.latestDate) entry.latestDate = dateStr;
        entry.items.push({ type: offType, date: dateStr, cat });
      }

      const pins = Array.from(byMb.values()).map((entry) => {
        let domCat = "other";
        let bestCnt = -1;
        for (const [k, c] of Object.entries(entry.catCounts)) {
          if (c > bestCnt) {
            bestCnt = c;
            domCat = k;
          }
        }
        entry.cat = domCat;
        entry.items.sort((a, b) => b.date.localeCompare(a.date));
        entry.items = entry.items.slice(0, 20);
        return entry;
      });
      pins.sort((a, b) => b.count - a.count || b.latestDate.localeCompare(a.latestDate));

      cached = {
        pins,
        meta: {
          lgaCode,
          nhwName,
          scopeLabel: locationName,
          days,
          startStr,
          endStr,
          totalOffences,
          blockCount: pins.length,
          catCounts,
          loading: false,
          error: null,
        },
      };
      state.qldLiveCache.set(cacheKey, cached);
    }

    if (seq !== qldFetchSeq) return;
    projectPinList(cached.pins);
    state.activeQldPins = cached.pins;
    state.activeQldMeta = cached.meta;
    renderPins();
    renderDossier();
  } catch (err) {
    if (seq !== qldFetchSeq) return;
    console.warn("QPS live fetch failed:", err);
    state.activeQldMeta = {
      ...state.activeQldMeta,
      loading: false,
      error: "Live QPS request failed — check network or retry.",
    };
    renderPins();
    renderDossier();
  }
}

function zoomToCoords(lon, lat, minScale = 18) {
  if (!projection || !svg || !zoomBehavior) return;
  const pt = projection([lon, lat]);
  if (!pt) return;
  const targetScale = Math.max(currentTransform.k, minScale);
  const t = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(targetScale)
    .translate(-pt[0], -pt[1]);
  svg.transition().duration(450).call(zoomBehavior.transform, t);
}

function visiblePins() {
  if (!state.showIncidents) return [];
  const { x: tx, y: ty, k } = currentTransform;
  const cat = state.incidentCat;
  const inView = (d) => {
    if (!Number.isFinite(d.px) || !Number.isFinite(d.py)) return false;
    if (cat !== "all" && d.cat !== cat) return false;
    const sx = d.px * k + tx;
    const sy = d.py * k + ty;
    return sx >= -18 && sx <= width + 18 && sy >= -18 && sy <= height + 18;
  };

  const out = [];
  if (state.incidentsData) {
    const saSrc = state.incidentsData.sa || [];
    const saPool = k < 4 ? saSrc.slice(0, 80) : saSrc;
    for (const d of saPool) {
      if (inView(d)) out.push(d);
    }
    for (const d of state.incidentsData.rss || []) {
      if (inView(d)) out.push(d);
    }
  }

  const qpsCap = k < 15 ? 600 : Infinity;
  let qpsAdded = 0;
  for (const d of state.activeQldPins || []) {
    if (qpsAdded >= qpsCap) break;
    if (inView(d)) {
      out.push(d);
      qpsAdded += 1;
    }
  }
  return out;
}

function pinRadius(d) {
  let r = 5.5;
  if (d.source === "sa") {
    r = Math.max(3.5, Math.min(10, 2.5 + Math.sqrt(d.count || 1) * 0.65));
  } else if (d.source === "qps") {
    r = Math.max(3.5, Math.min(8.5, 3 + Math.sqrt(d.count || 1) * 1.1));
  }
  return d.id === state.selectedPinId ? r + 2 : r;
}

function renderPins() {
  const legInc = document.getElementById("legend-incidents");
  if (legInc) {
    if (state.showIncidents) {
      legInc.hidden = false;
      legInc.innerHTML = Object.values(INCIDENT_CATS)
        .map((c) => `<span class="party-key"><span class="party-dot" style="background:${c.color}"></span>${c.label}</span>`)
        .join("");
    } else {
      legInc.hidden = true;
      legInc.innerHTML = "";
    }
  }

  if (!pinLayer) return;
  if (!state.showIncidents) {
    pinLayer.selectAll("circle").remove();
    return;
  }

  const { x: tx, y: ty, k } = currentTransform;
  const pins = visiblePins();
  pinLayer
    .selectAll("circle")
    .data(pins, (d) => d.id)
    .join("circle")
    .attr("class", (d) => `pin-dot pin-${d.source}${d.id === state.selectedPinId ? " active-pin" : ""}`)
    .attr("cx", (d) => d.px * k + tx)
    .attr("cy", (d) => d.py * k + ty)
    .attr("r", pinRadius)
    .attr("fill", (d) => (INCIDENT_CATS[d.cat] || INCIDENT_CATS.other).color)
    .on("mousemove", handlePinHover)
    .on("mouseleave", () => {
      document.getElementById("tooltip").hidden = true;
    })
    .on("click", handlePinClick);
}

function handlePinHover(event, d) {
  const tip = document.getElementById("tooltip");
  const catInfo = INCIDENT_CATS[d.cat] || INCIDENT_CATS.other;

  if (d.source === "rss") {
    tip.innerHTML = `
      <div class="tooltip-title">${escapeHtml(d.title)}</div>
      <div class="tooltip-meta">${escapeHtml(d.agency)} · ${escapeHtml(d.date)} · ${escapeHtml(d.precision)}</div>
      <div class="tooltip-val" style="color:${catInfo.color}">${escapeHtml(catInfo.label)} · ${escapeHtml(d.loc)}</div>
      <div class="tooltip-details">
        <div style="opacity:0.85">${escapeHtml(d.summary)}</div>
        <div style="opacity:0.65;margin-top:3px">Click pin for details &amp; official link</div>
      </div>
    `;
  } else if (d.source === "sa") {
    const topRows = (d.top || [])
      .map(([name, cnt]) => `<tr><td>${escapeHtml(name)}</td><td>${cnt}</td></tr>`)
      .join("");
    tip.innerHTML = `
      <div class="tooltip-title">${escapeHtml(d.suburb)} (${escapeHtml(d.postcode || "SA")})</div>
      <div class="tooltip-meta">SAPOL · ${escapeHtml(d.period)}</div>
      <div class="tooltip-val">${d.count.toLocaleString()} offences <span style="opacity:0.75;font-weight:400">(${escapeHtml(catInfo.label)})</span></div>
      ${topRows ? `<div class="tooltip-details"><table class="tooltip-table"><thead><tr><th>Top Offences</th><th>Count</th></tr></thead><tbody>${topRows}</tbody></table></div>` : ""}
    `;
  } else if (d.source === "qps") {
    const days = state.activeQldMeta?.days || state.qldDays;
    const rows = (d.items || [])
      .slice(0, 5)
      .map((it) => `<tr><td>${escapeHtml(it.type)}</td><td>${escapeHtml(it.date.slice(0, 10))}</td></tr>`)
      .join("");
    tip.innerHTML = `
      <div class="tooltip-title">${escapeHtml(d.area)} · Mesh Block ${escapeHtml(d.mb)}</div>
      <div class="tooltip-meta">Postcode ${escapeHtml(d.postcode || "QLD")} · Last ${days} days (QPS Live)</div>
      <div class="tooltip-val">${d.count} ${d.count === 1 ? "offence" : "offences"} <span style="opacity:0.75;font-weight:400">(${escapeHtml(catInfo.label)})</span></div>
      ${rows ? `<div class="tooltip-details"><table class="tooltip-table"><thead><tr><th>Recent Offence</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
    `;
  }

  tip.hidden = false;
  positionTooltip(event, tip);
}

function handlePinClick(event, d) {
  event.stopPropagation();
  state.selectedPinId = d.id;
  zoomToCoords(d.lon, d.lat, d.source === "qps" ? 32 : 18);
  renderPins();
  renderDossier();
}

function findPinById(id) {
  if (!id) return null;
  for (const d of state.activeQldPins || []) {
    if (d.id === id) return d;
  }
  if (state.incidentsData) {
    for (const d of state.incidentsData.rss || []) {
      if (d.id === id) return d;
    }
    for (const d of state.incidentsData.sa || []) {
      if (d.id === id) return d;
    }
  }
  return null;
}

function renderCatChips(counts) {
  const chips = Object.entries(INCIDENT_CATS)
    .filter(([k]) => (counts[k] || 0) > 0)
    .map(
      ([k, info]) =>
        `<span class="inc-chip"><span class="inc-chip-dot" style="background:${info.color}"></span>${info.label}: <span class="mono">${counts[k].toLocaleString()}</span></span>`
    )
    .join("");
  return chips ? `<div class="inc-cat-chips">${chips}</div>` : "";
}

function renderPinDetailCard(pin) {
  if (!pin) return "";
  const catInfo = INCIDENT_CATS[pin.cat] || INCIDENT_CATS.other;
  if (pin.source === "rss") {
    const href = safeUrl(pin.url);
    return `
      <div class="inc-detail-card">
        <div class="inc-detail-top">
          <strong>${escapeHtml(pin.title)}</strong>
          <button id="clear-pin-detail" class="inc-detail-close" type="button" aria-label="Close detail">×</button>
        </div>
        <div class="inc-item-top">
          <span><span class="inc-chip-dot" style="display:inline-block;background:${catInfo.color};margin-right:4px"></span>${escapeHtml(pin.agency)} · ${escapeHtml(pin.date)}</span>
          <span class="inc-prec">${escapeHtml(pin.precision)}</span>
        </div>
        <p class="inc-detail-summary">${escapeHtml(pin.summary)}</p>
        ${href ? `<a class="inc-detail-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Read official police release ↗</a>` : ""}
      </div>
    `;
  }
  if (pin.source === "sa") {
    const offs = (pin.top || []).map(([n, c]) => `${escapeHtml(n)} (${c})`).join(" · ");
    return `
      <div class="inc-detail-card">
        <div class="inc-detail-top">
          <strong>${escapeHtml(pin.suburb)} (${escapeHtml(pin.postcode || "SA")})</strong>
          <button id="clear-pin-detail" class="inc-detail-close" type="button" aria-label="Close detail">×</button>
        </div>
        <div class="inc-item-top"><span>SAPOL ${escapeHtml(pin.period)}</span><span class="mono">${pin.count.toLocaleString()} offences</span></div>
        <p class="inc-detail-summary">${offs}</p>
      </div>
    `;
  }
  const itemsHtml = (pin.items || [])
    .slice(0, 6)
    .map((it) => `<div>• ${escapeHtml(it.type)} <span class="mono" style="opacity:0.7">(${escapeHtml(it.date)})</span></div>`)
    .join("");
  return `
    <div class="inc-detail-card">
      <div class="inc-detail-top">
        <strong>Mesh Block ${escapeHtml(pin.mb)} (${escapeHtml(pin.area)})</strong>
        <button id="clear-pin-detail" class="inc-detail-close" type="button" aria-label="Close detail">×</button>
      </div>
      <div class="inc-item-top"><span>Postcode ${escapeHtml(pin.postcode || "QLD")}</span><span class="mono">${pin.count} offences</span></div>
      <div class="inc-detail-summary">${itemsHtml}</div>
    </div>
  `;
}

function attachIncidentListHandlers(listEl, summaryEl, itemsById) {
  const closeBtn = summaryEl.querySelector("#clear-pin-detail");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      state.selectedPinId = null;
      renderPins();
      renderDossier();
    });
  }
  listEl.querySelectorAll(".inc-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pin = itemsById.get(btn.dataset.pinId);
      if (!pin) return;
      state.selectedPinId = pin.id;
      zoomToCoords(pin.lon, pin.lat, pin.source === "qps" ? 32 : 18);
      renderPins();
      renderDossier();
    });
  });
}

function renderIncidentsPanel(feat, p) {
  const panel = document.getElementById("incidents-panel");
  if (!panel) return;
  if (!state.showIncidents) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const titleEl = document.getElementById("incidents-panel-title");
  const badgeEl = document.getElementById("incidents-panel-badge");
  const nhwWrap = document.getElementById("nhw-controls");
  const nhwSelect = document.getElementById("nhw-select");
  const summaryEl = document.getElementById("incidents-summary");
  const listEl = document.getElementById("incidents-list");

  const catFilter = state.incidentCat;
  const matchesCat = (d) => catFilter === "all" || d.cat === catFilter;
  const selectedPin = findPinById(state.selectedPinId);
  const detailHtml = renderPinDetailCard(selectedPin);
  const itemsById = new Map();

  const renderRssRows = (rows) =>
    rows
      .map((d) => {
        itemsById.set(d.id, d);
        const col = (INCIDENT_CATS[d.cat] || INCIDENT_CATS.other).color;
        return `
          <button type="button" class="inc-item${d.id === state.selectedPinId ? " active" : ""}" data-pin-id="${escapeHtml(d.id)}">
            <div class="inc-item-top">
              <span class="inc-item-left"><span class="inc-chip-dot" style="background:${col}"></span>${escapeHtml(d.agency)} · ${escapeHtml(d.date)}</span>
              <span class="inc-prec">${escapeHtml(d.precision)}</span>
            </div>
            <div class="inc-item-title">${escapeHtml(d.title)}</div>
            <div class="inc-item-sub"><span>${escapeHtml(d.loc)}</span><span>${escapeHtml(d.lga_name || d.state)}</span></div>
          </button>`;
      })
      .join("");

  const isLga = state.layerKey === "lga" && feat;
  const steName = feat ? p.ste_name : null;

  if (isLga && steName === "Queensland") {
    titleEl.textContent = "QLD Live Crime & NHW";
    const nhwInfo = state.qldNhwByLga?.by_lga?.[String(p.code)];
    if (nhwInfo && nhwInfo.nhw && nhwInfo.nhw.length) {
      nhwWrap.hidden = false;
      nhwSelect.innerHTML =
        `<option value="">Entire LGA (${escapeHtml(p.name)} — ${nhwInfo.nhw.length} NHW)</option>` +
        nhwInfo.nhw.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
      nhwSelect.value = state.selectedNhw || "";
      nhwSelect.onchange = () => {
        const nextNhw = nhwSelect.value;
        state.selectedPinId = null;
        if (!nextNhw) focusFeature(feat);
        fetchQldLiveOffences(p.code, nextNhw);
      };
    } else {
      nhwWrap.hidden = true;
    }

    const meta = state.activeQldMeta;
    if (meta && meta.loading) {
      badgeEl.textContent = "Loading live QPS…";
      summaryEl.innerHTML = detailHtml + `<div class="inc-note">Fetching live offences from QPS Open Data…</div>`;
      listEl.innerHTML = "";
    } else if (meta && meta.error) {
      badgeEl.textContent = "QPS unavailable";
      summaryEl.innerHTML = detailHtml + `<div class="inc-note">${escapeHtml(meta.error)}</div>`;
      listEl.innerHTML = "";
    } else if (meta) {
      badgeEl.textContent = `${meta.totalOffences.toLocaleString()} offences · ${meta.blockCount} blocks (${meta.days}d)`;
      summaryEl.innerHTML = detailHtml + renderCatChips(meta.catCounts || {});
      const qpsFiltered = (state.activeQldPins || []).filter(matchesCat).slice(0, 30);
      const qpsRows = qpsFiltered
        .map((d) => {
          itemsById.set(d.id, d);
          const col = (INCIDENT_CATS[d.cat] || INCIDENT_CATS.other).color;
          const topOff = d.items?.[0]?.type || "Offence";
          return `
            <button type="button" class="inc-item${d.id === state.selectedPinId ? " active" : ""}" data-pin-id="${escapeHtml(d.id)}">
              <div class="inc-item-top">
                <span class="inc-item-left"><span class="inc-chip-dot" style="background:${col}"></span>${escapeHtml(d.latestDate.slice(0, 10))} · MB ${escapeHtml(d.mb)}</span>
                <span class="mono"><strong>${d.count}</strong></span>
              </div>
              <div class="inc-item-title">${escapeHtml(topOff)}</div>
              <div class="inc-item-sub"><span>${escapeHtml(d.area)} (${escapeHtml(d.postcode || "QLD")})</span><span>Street block</span></div>
            </button>`;
        })
        .join("");
      const localRss = (state.incidentsData?.rss || []).filter((d) => d.lga_code === p.code && matchesCat(d)).slice(0, 8);
      listEl.innerHTML = renderRssRows(localRss) + qpsRows || `<div class="inc-note">No offences recorded in this timeframe/filter.</div>`;
    } else {
      badgeEl.textContent = "QLD Live";
      summaryEl.innerHTML = detailHtml;
      listEl.innerHTML = "";
    }
    attachIncidentListHandlers(listEl, summaryEl, itemsById);
    return;
  }

  nhwWrap.hidden = true;

  if (isLga && steName === "South Australia") {
    titleEl.textContent = "SA Suburb Incidents (30d)";
    const saMatches = (state.incidentsData?.sa || []).filter((d) => d.lga_code === p.code && matchesCat(d));
    const total = saMatches.reduce((acc, d) => acc + d.count, 0);
    const counts = {};
    saMatches.forEach((d) => { counts[d.cat] = (counts[d.cat] || 0) + d.count; });
    badgeEl.textContent = `${total.toLocaleString()} offences · ${saMatches.length} suburbs`;
    summaryEl.innerHTML = detailHtml + renderCatChips(counts);
    listEl.innerHTML = saMatches
      .slice(0, 35)
      .map((d) => {
        itemsById.set(d.id, d);
        const col = (INCIDENT_CATS[d.cat] || INCIDENT_CATS.other).color;
        const topName = d.top?.[0]?.[0] || "Recorded offences";
        return `
          <button type="button" class="inc-item${d.id === state.selectedPinId ? " active" : ""}" data-pin-id="${escapeHtml(d.id)}">
            <div class="inc-item-top">
              <span class="inc-item-left"><span class="inc-chip-dot" style="background:${col}"></span>${escapeHtml(d.suburb)} (${escapeHtml(d.postcode || "SA")})</span>
              <span class="mono"><strong>${d.count.toLocaleString()}</strong></span>
            </div>
            <div class="inc-item-title">${escapeHtml(topName)}</div>
            <div class="inc-item-sub"><span>${escapeHtml(d.period)}</span><span>Suburb</span></div>
          </button>`;
      })
      .join("") || `<div class="inc-note">No matching SAPOL suburb data for this filter.</div>`;
    attachIncidentListHandlers(listEl, summaryEl, itemsById);
    return;
  }

  if (isLga && (steName === "Tasmania" || steName === "Northern Territory")) {
    const abbr = STATE_ABBR[steName];
    titleEl.textContent = `${abbr} Police Releases`;
    const allState = (state.incidentsData?.rss || []).filter((d) => d.state === abbr && matchesCat(d));
    const inLga = allState.filter((d) => d.lga_code === p.code);
    const shown = inLga.length ? inLga : allState.slice(0, 12);
    badgeEl.textContent = `${inLga.length} in LGA · ${allState.length} in ${abbr}`;
    const note = inLga.length
      ? ""
      : `<div class="inc-note">0 recent media releases in ${escapeHtml(p.name)} — showing latest ${abbr} releases:</div>`;
    summaryEl.innerHTML = detailHtml + note;
    listEl.innerHTML = renderRssRows(shown);
    attachIncidentListHandlers(listEl, summaryEl, itemsById);
    return;
  }

  if (isLga) {
    titleEl.textContent = "Recent Incident Pins";
    badgeEl.textContent = `${STATE_ABBR[steName] || steName} unavailable`;
    summaryEl.innerHTML =
      detailHtml +
      `<div class="inc-note">No open address-level or Neighbourhood Watch feed is published for ${escapeHtml(steName)} (state police withhold live addresses for privacy). Select any <strong>QLD</strong>, <strong>SA</strong>, <strong>TAS</strong>, or <strong>NT</strong> LGA for live or geocoded pins.</div>`;
    listEl.innerHTML = "";
    attachIncidentListHandlers(listEl, summaryEl, itemsById);
    return;
  }

  // National / State / City / non-LGA overview
  titleEl.textContent = "Recent Incident Pins";
  const allRss = (state.incidentsData?.rss || []).filter(matchesCat);
  const stateFilterAbbr = state.activeState || (feat && STATE_ABBR[p.ste_name]) || null;
  const rssFiltered = stateFilterAbbr ? allRss.filter((d) => d.state === stateFilterAbbr) : allRss;
  const shownRss = (rssFiltered.length ? rssFiltered : allRss).slice(0, 15);
  const saCount = (state.incidentsData?.sa || []).length;
  badgeEl.textContent = `${allRss.length} RSS · ${saCount} SA suburbs`;
  summaryEl.innerHTML =
    detailHtml +
    `<div class="inc-note">Showing geocoded QLD/TAS/NT police RSS &amp; SA 30-day suburb pins. Switch to <strong>LGA</strong> and click any <strong>Queensland</strong> council for live QPS street-block &amp; 852 Neighbourhood Watch pins.</div>`;
  listEl.innerHTML = renderRssRows(shownRss);
  attachIncidentListHandlers(listEl, summaryEl, itemsById);
}

const FUEL_LABELS = {
  E10_U91: "E10 / U91",
  E10: "E10",
  U91: "Unleaded 91",
  P95: "Premium 95",
  P98: "Premium 98",
  ALL_DIESEL: "All Diesel",
  DL: "Diesel",
  PDL: "Prem Diesel",
  LPG: "LPG",
  E85: "E85",
};

function getFuelMetric(ft = state.fuelType) {
  return FUEL_METRICS.find((m) => m.fuelType === ft);
}

function stationFuelEntry(station, ft = state.fuelType) {
  if (!station?.p) return null;
  const codes = getFuelMetric(ft)?.fuelTypes || [ft];
  let best = null;
  for (const code of codes) {
    const price = station.p[code];
    if (price != null && (!best || price < best.price)) {
      best = { price, fuelType: code };
    }
  }
  return best;
}

function stationFuelPrice(station, ft = state.fuelType) {
  return stationFuelEntry(station, ft)?.price ?? null;
}

function computeCompositeFuelStats(data) {
  if (!data?.stations) return;
  data.stats = data.stats || {};
  for (const fm of FUEL_METRICS) {
    if (!fm.fuelTypes || fm.fuelTypes.length <= 1) continue;
    const vals = [];
    for (const s of data.stations) {
      const price = stationFuelPrice(s, fm.fuelType);
      if (price != null) vals.push(price);
    }
    vals.sort((a, b) => a - b);
    if (!vals.length) continue;
    data.stats[fm.fuelType] = {
      min: Math.round(vals[0] * 10) / 10,
      p10: Math.round((d3.quantile(vals, 0.1) ?? vals[0]) * 10) / 10,
      p25: Math.round((d3.quantile(vals, 0.25) ?? vals[0]) * 10) / 10,
      median: Math.round((d3.quantile(vals, 0.5) ?? vals[0]) * 10) / 10,
      p75: Math.round((d3.quantile(vals, 0.75) ?? vals[vals.length - 1]) * 10) / 10,
      p90: Math.round((d3.quantile(vals, 0.9) ?? vals[vals.length - 1]) * 10) / 10,
      max: Math.round(vals[vals.length - 1] * 10) / 10,
      count: vals.length,
    };
  }
}

const FUEL_INTERP = d3.interpolateRgbBasis(["#15803d", "#4ade80", "#eab308", "#dc2626"]);

function fuelLogNorm(v, lo, hi) {
  if (v == null || !(hi > lo)) return 0.5;
  const span = hi - lo;
  const offset = span * 0.15;
  const clamped = Math.max(0, Math.min(span, v - lo));
  return Math.log1p(clamped / offset) / Math.log1p(span / offset);
}

function fuelColor(price, st) {
  if (!st || price == null) return "#64748b";
  const lo = st.min ?? st.p10;
  const hi = st.p90 ?? st.max;
  if (!(hi > lo)) return "#15803d";
  return FUEL_INTERP(fuelLogNorm(price, lo, hi));
}

function attachFuelToLayer(layerKey) {
  const geo = state.cache[layerKey];
  if (!geo || !state.fuelData?.stations) return;
  const codeField = layerKey === "sa2" ? "sa2_code" : "lga_code";
  const byAreaFuel = new Map();

  for (const s of state.fuelData.stations) {
    const areaCode = s[codeField];
    if (!areaCode || !s.p) continue;
    for (const fm of FUEL_METRICS) {
      const entry = stationFuelEntry(s, fm.fuelType);
      if (!entry) continue;
      const key = `${areaCode}:${fm.fuelType}`;
      let list = byAreaFuel.get(key);
      if (!list) {
        list = [];
        byAreaFuel.set(key, list);
      }
      list.push({ price: entry.price, fuelType: entry.fuelType, name: s.name, brand: s.brand });
    }
  }

  for (const f of geo.features) {
    const props = f.properties;
    const code = String(props.code);
    const metaMap = {};
    for (const fm of FUEL_METRICS) {
      const ft = fm.fuelType;
      const entries = byAreaFuel.get(`${code}:${ft}`);
      if (entries && entries.length) {
        entries.sort((a, b) => a.price - b.price);
        const mid = entries[Math.floor(entries.length / 2)].price;
        props[fm.key] = entries[0].price;
        metaMap[ft] = {
          min: entries[0].price,
          median: mid,
          max: entries[entries.length - 1].price,
          count: entries.length,
          cheapestName: entries[0].name,
          cheapestBrand: entries[0].brand,
          cheapestFuelType: entries[0].fuelType,
        };
      } else {
        delete props[fm.key];
      }
    }
    props._fuelMeta = metaMap;
  }

  for (const fm of FUEL_METRICS) {
    rankCache.delete(`${layerKey}:${fm.key}`);
  }
}

async function loadFuelData() {
  if (state.fuelData) return state.fuelData;
  try {
    const data = await d3.json(`data/nsw_fuel_prices.json?v=${DATA_VERSION}`);
    computeCompositeFuelStats(data);
    state.fuelData = data;
    reprojectFuel();
    attachFuelToLayer("lga");
    attachFuelToLayer("sa2");
  } catch (err) {
    console.warn("Failed to load nsw_fuel_prices.json:", err);
  }
  return state.fuelData;
}

function reprojectFuel() {
  if (!projection || !state.fuelData?.stations) return;
  for (const s of state.fuelData.stations) {
    const pt = projection([s.lon, s.lat]);
    if (pt) {
      s.px = pt[0];
      s.py = pt[1];
    }
  }
}

function scheduleFuel() {
  if (!state.showFuel || fuelRaf) return;
  fuelRaf = requestAnimationFrame(() => {
    fuelRaf = null;
    renderFuelPins();
    if (currentTransform.k >= 4 && !state.selectedCode && state.fuelData) {
      renderFuelPanel(null, state.national);
    }
  });
}

function visibleFuelStations() {
  if (!state.showFuel || !state.fuelData?.stations) return [];
  const ft = state.fuelType;
  const { x: tx, y: ty, k } = currentTransform;
  const inView = [];

  for (const s of state.fuelData.stations) {
    if (stationFuelPrice(s, ft) == null || !Number.isFinite(s.px) || !Number.isFinite(s.py)) continue;
    const sx = s.px * k + tx;
    const sy = s.py * k + ty;
    if (sx >= -18 && sx <= width + 18 && sy >= -18 && sy <= height + 18) {
      inView.push(s);
    }
  }

  if (k < 5 && inView.length > 320) {
    const sorted = [...inView].sort((a, b) => stationFuelPrice(a, ft) - stationFuelPrice(b, ft));
    const picked = new Set(sorted.slice(0, 40));
    const step = Math.ceil(inView.length / 280);
    for (let i = 0; i < inView.length && picked.size < 320; i += step) {
      picked.add(inView[i]);
    }
    if (state.selectedFuelCode) {
      const sel = inView.find((s) => s.code === state.selectedFuelCode);
      if (sel) picked.add(sel);
    }
    return Array.from(picked);
  }

  if (k < 14 && inView.length > 800) {
    const sorted = [...inView].sort((a, b) => stationFuelPrice(a, ft) - stationFuelPrice(b, ft));
    const out = sorted.slice(0, 800);
    if (state.selectedFuelCode && !out.some((s) => s.code === state.selectedFuelCode)) {
      const sel = inView.find((s) => s.code === state.selectedFuelCode);
      if (sel) out.push(sel);
    }
    return out;
  }

  return inView;
}

function renderFuelPins() {
  const ft = state.fuelType;
  const st = state.fuelData?.stats?.[ft];

  if (!fuelLayer || !fuelLabelLayer) return;
  if (!state.showFuel || !state.fuelData) {
    fuelLayer.selectAll("circle").remove();
    fuelLabelLayer.selectAll("text").remove();
    return;
  }

  const { x: tx, y: ty, k } = currentTransform;
  const stations = visibleFuelStations();

  fuelLayer
    .selectAll("circle")
    .data(stations, (d) => d.code)
    .join("circle")
    .attr("class", (d) => `fuel-dot${d.code === state.selectedFuelCode ? " active-pin" : ""}`)
    .attr("cx", (d) => d.px * k + tx)
    .attr("cy", (d) => d.py * k + ty)
    .attr("r", (d) => (d.code === state.selectedFuelCode ? 7 : 4.5))
    .attr("fill", (d) => fuelColor(stationFuelPrice(d, ft), st))
    .on("mousemove", handleFuelHover)
    .on("mouseleave", () => {
      document.getElementById("tooltip").hidden = true;
    })
    .on("click", handleFuelClick);
}

function handleFuelHover(event, d) {
  const tip = document.getElementById("tooltip");
  const ft = state.fuelType;
  const entry = stationFuelEntry(d, ft);
  const price = entry?.price ?? null;
  const st = state.fuelData?.stats?.[ft];
  const isComposite = (getFuelMetric(ft)?.fuelTypes?.length || 1) > 1;
  const fuelSuffix = isComposite && entry ? ` (${entry.fuelType})` : "";
  const diff = st && price != null ? price - st.median : null;
  const diffStr = diff != null ? ` (${diff > 0 ? "+" : ""}${diff.toFixed(1)}¢ vs NSW med)` : "";
  const allRows = Object.entries(d.p || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `<tr><td>${escapeHtml(FUEL_LABELS[k] || k)}</td><td>${v.toFixed(1)}¢</td></tr>`)
    .join("");

  tip.innerHTML = `
    <div class="tooltip-title">${escapeHtml(d.name)}</div>
    <div class="tooltip-meta">${escapeHtml(d.brand || "Fuel")} · ${escapeHtml(d.lga_name || "NSW")}</div>
    <div class="tooltip-val" style="color:${fuelColor(price, st)}">${price != null ? price.toFixed(1) + "¢/L" + escapeHtml(fuelSuffix) : "N/A"} <span style="opacity:0.8;font-weight:400">${escapeHtml(diffStr)}</span></div>
    <div class="tooltip-details">
      <div style="opacity:0.8;margin-bottom:3px">${escapeHtml(d.addr)}</div>
      ${allRows ? `<table class="tooltip-table"><thead><tr><th>Fuel</th><th>Price</th></tr></thead><tbody>${allRows}</tbody></table>` : ""}
      ${d.upd ? `<div style="opacity:0.65;margin-top:3px">Updated ${escapeHtml(d.upd)}</div>` : ""}
    </div>
  `;
  tip.hidden = false;
  positionTooltip(event, tip);
}

function handleFuelClick(event, d) {
  event.stopPropagation();
  state.selectedFuelCode = d.code;
  zoomToCoords(d.lon, d.lat, 40);
  renderFuelPins();
  renderDossier();
}

function renderFuelDetailCard(station) {
  if (!station) return "";
  const prices = Object.entries(station.p || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `<span class="inc-chip">${escapeHtml(k)}: <strong class="mono">${v.toFixed(1)}¢</strong></span>`)
    .join("");
  return `
    <div class="inc-detail-card">
      <div class="inc-detail-top">
        <strong>${escapeHtml(station.name)}</strong>
        <button id="clear-fuel-detail" class="inc-detail-close" type="button" aria-label="Close station detail">×</button>
      </div>
      <div class="inc-item-top">
        <span>${escapeHtml(station.brand || "Fuel")} · ${escapeHtml(station.lga_name || "NSW")}</span>
        <span class="mono">${escapeHtml(station.upd || "")}</span>
      </div>
      <p class="inc-detail-summary">${escapeHtml(station.addr)}</p>
      <div class="inc-cat-chips">${prices}</div>
    </div>
  `;
}

function renderFuelPanel(feat, p) {
  const panel = document.getElementById("fuel-panel");
  if (!panel) return;
  if (!state.showFuel) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const titleEl = document.getElementById("fuel-panel-title");
  const badgeEl = document.getElementById("fuel-panel-badge");
  const summaryEl = document.getElementById("fuel-summary");
  const listEl = document.getElementById("fuel-list");
  const ft = state.fuelType;
  const ftLabel = FUEL_LABELS[ft] || ft;
  const isComposite = (getFuelMetric(ft)?.fuelTypes?.length || 1) > 1;
  titleEl.textContent = `NSW Fuel · ${ftLabel}`;

  if (!state.fuelData?.stations) {
    badgeEl.textContent = "Loading…";
    summaryEl.innerHTML = `<div class="inc-note">Loading NSW FuelCheck station prices…</div>`;
    listEl.innerHTML = "";
    return;
  }

  const allWithFuel = state.fuelData.stations.filter((s) => stationFuelPrice(s, ft) != null);
  const selectedSt = state.selectedFuelCode
    ? state.fuelData.stations.find((s) => s.code === state.selectedFuelCode)
    : null;
  const detailHtml = renderFuelDetailCard(selectedSt);
  const stStats = state.fuelData.stats?.[ft];

  let scoped = allWithFuel;
  let noteHtml = "";
  const STATE_CODE_NAMES = {
    NSW: "New South Wales",
    ACT: "Australian Capital Territory",
    VIC: "Victoria",
    QLD: "Queensland",
    SA: "South Australia",
    WA: "Western Australia",
    TAS: "Tasmania",
    NT: "Northern Territory",
  };
  const activeStateCodes = state.fuelData?.states?.length ? state.fuelData.states : ["NSW", "ACT", "TAS", "WA"];
  const fuelStates = activeStateCodes.map((s) => STATE_CODE_NAMES[s]).filter(Boolean);
  const formattedStates =
    activeStateCodes.length > 1
      ? `${activeStateCodes.slice(0, -1).join(", ")} &amp; ${activeStateCodes[activeStateCodes.length - 1]}`
      : activeStateCodes[0] || "NSW";
  const isFuelScoped = (state.layerKey === "lga" || state.layerKey === "sa2") && feat && fuelStates.includes(p.ste_name);
  const scopeLabel = state.layerKey === "sa2" ? "suburb" : "LGA";

  if (isFuelScoped) {
    const field = state.layerKey === "sa2" ? "sa2_code" : "lga_code";
    scoped = allWithFuel.filter((s) => s[field] === p.code);
    badgeEl.textContent = `${scoped.length} stations in ${scopeLabel}`;
  } else if (feat && !fuelStates.includes(p.ste_name)) {
    noteHtml = `<div class="inc-note">Live fuel prices cover ${formattedStates} — select any ${activeStateCodes.join("/")} suburb or LGA to filter locally. Cheapest overall:</div>`;
    badgeEl.textContent = `${allWithFuel.length.toLocaleString()} stations`;
  } else if (currentTransform.k >= 4) {
    const inView = visibleFuelStations();
    if (inView.length >= 3) {
      scoped = inView;
      badgeEl.textContent = `${scoped.length} in view`;
    } else {
      badgeEl.textContent = `${allWithFuel.length.toLocaleString()} stations`;
    }
  } else {
    badgeEl.textContent = `${allWithFuel.length.toLocaleString()} stations`;
  }

  const sorted = scoped
    .map((s) => ({ s, entry: stationFuelEntry(s, ft) }))
    .filter((x) => x.entry != null)
    .sort((a, b) => a.entry.price - b.entry.price);
  if (!sorted.length) {
    summaryEl.innerHTML = detailHtml + noteHtml + `<div class="inc-note">No stations selling ${escapeHtml(ftLabel)} in this area.</div>`;
    listEl.innerHTML = "";
  } else {
    const lo = sorted[0].entry.price;
    const hi = sorted[sorted.length - 1].entry.price;
    const mid = sorted[Math.floor(sorted.length / 2)].entry.price;
    summaryEl.innerHTML =
      detailHtml +
      noteHtml +
      `<div class="fuel-stats-row">
        <div class="fuel-stat-box"><div class="k">Cheapest</div><div class="v mono" style="color:#16a34a">${lo.toFixed(1)}¢</div></div>
        <div class="fuel-stat-box"><div class="k">Median</div><div class="v mono">${mid.toFixed(1)}¢</div></div>
        <div class="fuel-stat-box"><div class="k">Highest</div><div class="v mono" style="color:#dc2626">${hi.toFixed(1)}¢</div></div>
      </div>`;

    const byCode = new Map();
    listEl.innerHTML = sorted
      .slice(0, 15)
      .map(({ s, entry }) => {
        byCode.set(s.code, s);
        const col = fuelColor(entry.price, stStats);
        const fuelTag = isComposite ? ` · ${entry.fuelType}` : "";
        return `
          <button type="button" class="inc-item${s.code === state.selectedFuelCode ? " active" : ""}" data-fuel-code="${escapeHtml(s.code)}">
            <div class="inc-item-top">
              <span class="inc-item-left"><span class="inc-chip-dot" style="background:${col}"></span>${escapeHtml(s.brand || "Fuel")} · ${escapeHtml(s.lga_name || "NSW")}</span>
              <span class="mono" style="color:${col}"><strong>${entry.price.toFixed(1)}¢${escapeHtml(fuelTag)}</strong></span>
            </div>
            <div class="inc-item-title">${escapeHtml(s.name)}</div>
            <div class="inc-item-sub"><span>${escapeHtml(s.addr)}</span></div>
          </button>`;
      })
      .join("");

    listEl.querySelectorAll(".inc-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const st = byCode.get(btn.dataset.fuelCode);
        if (!st) return;
        state.selectedFuelCode = st.code;
        zoomToCoords(st.lon, st.lat, 40);
        renderFuelPins();
        renderDossier();
      });
    });
  }

  const closeBtn = summaryEl.querySelector("#clear-fuel-detail");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      state.selectedFuelCode = null;
      renderFuelPins();
      renderDossier();
    });
  }
}

const EV_POWER_INTERP = d3.interpolateRgbBasis(["#eab308", "#0ea5e9", "#10b981"]);
const EV_POWER_SCALE = d3.scaleLinear().domain([50, 150, 350]).range([0, 0.5, 1]).clamp(true);

function evStationValue(station, metricKey) {
  if (!station) return null;
  switch (metricKey) {
    case "ev_all":
      return station.max_kw ?? null;
    case "ev_ultra":
      return station.max_kw >= 150 ? station.max_kw : null;
    case "ev_ccs2":
    case "ev_chademo": {
      const target = metricKey === "ev_ccs2" ? "CCS2" : "CHAdeMO";
      let best = 0;
      for (const [tech, kw] of station.conns || []) {
        if (tech === target && kw >= 50 && kw > best) best = kw;
      }
      return best > 0 ? best : null;
    }
    case "ev_tesla":
      return (station.techs?.includes("Tesla") || /^tesla/i.test(station.op || "")) ? station.max_kw : null;
    case "ev_price":
      return station.price_kwh != null ? station.price_kwh : null;
    default:
      return null;
  }
}

function evFormatPrice(priceKwh) {
  if (priceKwh === 0) return "Free";
  if (priceKwh != null) return `$${priceKwh.toFixed(2)}/kWh`;
  return "Price N/A";
}

function evPinColor(val, metricKey, evStats) {
  if (val == null) return "#64748b";
  if (metricKey === "ev_price") {
    return fuelColor(val, {
      p10: evStats?.p10_price ?? 0,
      median: evStats?.median_price ?? 0.45,
      p90: evStats?.p90_price ?? 0.66,
      min: evStats?.min_price ?? 0,
      max: evStats?.max_price ?? 1,
    });
  }
  return EV_POWER_INTERP(EV_POWER_SCALE(val));
}

function attachEvToLayer(layerKey) {
  const geo = state.cache[layerKey];
  if (!geo || !state.evData?.stations) return;
  const codeField = layerKey === "sa2" ? "sa2_code" : "lga_code";
  const byAreaMetric = new Map();

  for (const s of state.evData.stations) {
    const areaCode = s[codeField];
    if (!areaCode) continue;
    for (const em of EV_METRICS) {
      const val = evStationValue(s, em.key);
      if (val == null) continue;
      const key = `${areaCode}:${em.key}`;
      let list = byAreaMetric.get(key);
      if (!list) {
        list = [];
        byAreaMetric.set(key, list);
      }
      list.push({ val, station: s });
    }
  }

  for (const f of geo.features) {
    const props = f.properties;
    const code = String(props.code);
    const metaMap = {};
    for (const em of EV_METRICS) {
      const entries = byAreaMetric.get(`${code}:${em.key}`);
      if (entries && entries.length) {
        if (em.key === "ev_price") {
          entries.sort((a, b) => a.val - b.val);
        } else {
          entries.sort((a, b) => b.val - a.val);
        }
        const best = entries[0];
        props[em.key] = best.val;
        const techsSet = new Set();
        let minPrice = null;
        let maxPrice = null;
        for (const e of entries) {
          for (const t of e.station.techs || []) techsSet.add(t);
          const pk = e.station.price_kwh;
          if (pk != null) {
            if (minPrice == null || pk < minPrice) minPrice = pk;
            if (maxPrice == null || pk > maxPrice) maxPrice = pk;
          }
        }
        metaMap[em.key] = {
          bestName: best.station.name,
          maxKw: best.station.max_kw,
          minPrice,
          maxPrice,
          techs: Array.from(techsSet),
          count: entries.length,
        };
      } else {
        delete props[em.key];
      }
    }
    props._evMeta = metaMap;
  }

  for (const em of EV_METRICS) {
    rankCache.delete(`${layerKey}:${em.key}`);
  }
}

async function loadEvData() {
  if (state.evData) return state.evData;
  try {
    const data = await d3.json(`data/au_ev_chargers.json?v=${DATA_VERSION}`);
    state.evData = data;
    reprojectEv();
    attachEvToLayer("lga");
    attachEvToLayer("sa2");
  } catch (err) {
    console.warn("Failed to load au_ev_chargers.json:", err);
  }
  return state.evData;
}

function reprojectEv() {
  if (!projection || !state.evData?.stations) return;
  for (const s of state.evData.stations) {
    const pt = projection([s.lon, s.lat]);
    if (pt) {
      s.px = pt[0];
      s.py = pt[1];
    }
  }
}

function scheduleEv() {
  if (!state.showEv || evRaf) return;
  evRaf = requestAnimationFrame(() => {
    evRaf = null;
    renderEvPins();
    if (currentTransform.k >= 4 && !state.selectedCode && state.evData) {
      renderEvPanel(null, state.national);
    }
  });
}

function visibleEvStations() {
  if (!state.showEv || !state.evData?.stations) return [];
  const mk = state.metric.key;
  const { x: tx, y: ty, k } = currentTransform;
  const inView = [];

  for (const s of state.evData.stations) {
    const val = evStationValue(s, mk);
    if (val == null || !Number.isFinite(s.px) || !Number.isFinite(s.py)) continue;
    const sx = s.px * k + tx;
    const sy = s.py * k + ty;
    if (sx >= -18 && sx <= width + 18 && sy >= -18 && sy <= height + 18) {
      inView.push(s);
    }
  }
  return inView;
}

function renderEvPins() {
  if (!evLayer) return;
  if (!state.showEv || !state.evData) {
    evLayer.selectAll("circle").remove();
    return;
  }
  const mk = state.metric.key;
  const eStats = state.evData.stats;
  const { x: tx, y: ty, k } = currentTransform;
  const stations = visibleEvStations();

  evLayer
    .selectAll("circle")
    .data(stations, (d) => d.id)
    .join("circle")
    .attr("class", (d) => `ev-dot${d.id === state.selectedEvId ? " active-pin" : ""}`)
    .attr("cx", (d) => d.px * k + tx)
    .attr("cy", (d) => d.py * k + ty)
    .attr("r", (d) => (d.id === state.selectedEvId ? 7.5 : d.max_kw >= 150 ? 5.5 : 4.2))
    .attr("fill", (d) => evPinColor(evStationValue(d, mk), mk, eStats))
    .on("mousemove", handleEvHover)
    .on("mouseleave", () => {
      document.getElementById("tooltip").hidden = true;
    })
    .on("click", handleEvClick);
}

function handleEvHover(event, d) {
  const tip = document.getElementById("tooltip");
  const mk = state.metric.key;
  const val = evStationValue(d, mk);
  const col = evPinColor(val, mk, state.evData?.stats);
  const connRows = (d.conns || [])
    .map(([tech, kw, qty]) => `<tr><td>${escapeHtml(tech)}</td><td>${kw} kW</td><td>${qty}×</td></tr>`)
    .join("");
  const priceLine = evFormatPrice(d.price_kwh);
  const costExtra = d.cost && d.cost.toLowerCase() !== priceLine.toLowerCase() ? ` · ${d.cost}` : "";

  tip.innerHTML = `
    <div class="tooltip-title">${escapeHtml(d.name)}</div>
    <div class="tooltip-meta">${escapeHtml(d.op || "Public Charger")} · ${escapeHtml(d.lga_name || "AU")}</div>
    <div class="tooltip-val" style="color:${col}">${d.max_kw} kW max <span style="opacity:0.85;font-weight:500">· ${escapeHtml(priceLine)}</span></div>
    <div class="tooltip-details">
      ${d.addr ? `<div style="opacity:0.8;margin-bottom:3px">${escapeHtml(d.addr)}</div>` : ""}
      ${connRows ? `<table class="tooltip-table"><thead><tr><th>Tech</th><th>Power</th><th>Bays</th></tr></thead><tbody>${connRows}</tbody></table>` : ""}
      ${costExtra ? `<div style="opacity:0.75;margin-top:3px">${escapeHtml(costExtra.replace(/^\s*·\s*/, ""))}</div>` : ""}
      ${d.upd ? `<div style="opacity:0.6;margin-top:2px">Verified ${escapeHtml(d.upd)}</div>` : ""}
    </div>
  `;
  tip.hidden = false;
  positionTooltip(event, tip);
}

function handleEvClick(event, d) {
  event.stopPropagation();
  state.selectedEvId = d.id;
  zoomToCoords(d.lon, d.lat, 40);
  renderEvPins();
  renderDossier();
}

function renderEvDetailCard(station) {
  if (!station) return "";
  const conns = (station.conns || [])
    .map(([tech, kw, qty]) => `<span class="inc-chip">${escapeHtml(tech)}: <strong class="mono">${kw} kW</strong> (${qty}×)</span>`)
    .join("");
  const priceText = evFormatPrice(station.price_kwh);
  return `
    <div class="inc-detail-card">
      <div class="inc-detail-top">
        <strong>${escapeHtml(station.name)}</strong>
        <button id="clear-ev-detail" class="inc-detail-close" type="button" aria-label="Close charger detail">×</button>
      </div>
      <div class="inc-item-top">
        <span>${escapeHtml(station.op || "Public Charger")} · ${escapeHtml(station.lga_name || "AU")}</span>
        <span class="mono"><strong>${station.max_kw} kW</strong> · ${escapeHtml(priceText)}</span>
      </div>
      ${station.addr ? `<p class="inc-detail-summary">${escapeHtml(station.addr)}</p>` : ""}
      ${station.cost ? `<p class="inc-detail-summary" style="opacity:0.78">Tariff: ${escapeHtml(station.cost)}</p>` : ""}
      <div class="inc-cat-chips">${conns}</div>
    </div>
  `;
}

function renderEvPanel(feat, p) {
  const panel = document.getElementById("ev-panel");
  if (!panel) return;
  if (!state.showEv) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const titleEl = document.getElementById("ev-panel-title");
  const badgeEl = document.getElementById("ev-panel-badge");
  const summaryEl = document.getElementById("ev-summary");
  const listEl = document.getElementById("ev-list");
  const m = state.metric;
  titleEl.textContent = `EV Fast Charging · ${m.label}`;

  if (!state.evData?.stations) {
    badgeEl.textContent = "Loading…";
    summaryEl.innerHTML = `<div class="inc-note">Loading Australia EV fast chargers…</div>`;
    listEl.innerHTML = "";
    return;
  }

  const allMatching = state.evData.stations.filter((s) => evStationValue(s, m.key) != null);
  const selectedSt = state.selectedEvId
    ? state.evData.stations.find((s) => s.id === state.selectedEvId)
    : null;
  const detailHtml = renderEvDetailCard(selectedSt);
  const eStats = state.evData.stats;

  let scoped = allMatching;
  const isAreaScoped = (state.layerKey === "lga" || state.layerKey === "sa2") && feat;
  const scopeLabel = state.layerKey === "sa2" ? "suburb" : "LGA";

  if (isAreaScoped) {
    const field = state.layerKey === "sa2" ? "sa2_code" : "lga_code";
    scoped = allMatching.filter((s) => s[field] === p.code);
    badgeEl.textContent = `${scoped.length} stations in ${scopeLabel}`;
  } else if (currentTransform.k >= 4) {
    const inView = visibleEvStations();
    if (inView.length >= 2) {
      scoped = inView;
      badgeEl.textContent = `${scoped.length} in view`;
    } else {
      badgeEl.textContent = `${allMatching.length.toLocaleString()} AU`;
    }
  } else {
    badgeEl.textContent = `${allMatching.length.toLocaleString()} AU`;
  }

  const sorted = [...scoped].sort((a, b) => {
    const va = evStationValue(a, m.key);
    const vb = evStationValue(b, m.key);
    return m.key === "ev_price" ? va - vb : vb - va;
  });

  if (!sorted.length) {
    summaryEl.innerHTML = detailHtml + `<div class="inc-note">No matching fast chargers in this area.</div>`;
    listEl.innerHTML = "";
  } else {
    const maxKw = Math.max(...sorted.map((s) => s.max_kw));
    const priced = sorted.filter((s) => s.price_kwh != null).map((s) => s.price_kwh).sort((a, b) => a - b);
    const bestPrice = priced.length ? evFormatPrice(priced[0]) : "N/A";
    const ultraCount = sorted.filter((s) => s.max_kw >= 150).length;
    summaryEl.innerHTML =
      detailHtml +
      `<div class="fuel-stats-row">
        <div class="fuel-stat-box"><div class="k">Top Power</div><div class="v mono" style="color:#10b981">${maxKw} kW</div></div>
        <div class="fuel-stat-box"><div class="k">150+ kW Hubs</div><div class="v mono">${ultraCount}</div></div>
        <div class="fuel-stat-box"><div class="k">Cheapest</div><div class="v mono" style="color:#16a34a">${escapeHtml(bestPrice)}</div></div>
      </div>`;

    const byId = new Map();
    listEl.innerHTML = sorted
      .slice(0, 15)
      .map((s) => {
        byId.set(String(s.id), s);
        const val = evStationValue(s, m.key);
        const col = evPinColor(val, m.key, eStats);
        const techSummary = (s.conns || []).map(([t, kw, q]) => `${t} ${kw}kW×${q}`).join(" · ");
        const priceTag = evFormatPrice(s.price_kwh);
        return `
          <button type="button" class="inc-item${s.id === state.selectedEvId ? " active" : ""}" data-ev-id="${s.id}">
            <div class="inc-item-top">
              <span class="inc-item-left"><span class="inc-chip-dot" style="background:${col}"></span>${escapeHtml(s.op || "Charger")} · ${escapeHtml(s.lga_name || "AU")}</span>
              <span class="mono" style="color:${col}"><strong>${s.max_kw} kW</strong> · ${escapeHtml(priceTag)}</span>
            </div>
            <div class="inc-item-title">${escapeHtml(s.name)}</div>
            <div class="inc-item-sub"><span>${escapeHtml(techSummary || s.addr)}</span></div>
          </button>`;
      })
      .join("");

    listEl.querySelectorAll(".inc-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const st = byId.get(btn.dataset.evId);
        if (!st) return;
        state.selectedEvId = st.id;
        zoomToCoords(st.lon, st.lat, 40);
        renderEvPins();
        renderDossier();
      });
    });
  }

  const closeBtn = summaryEl.querySelector("#clear-ev-detail");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      state.selectedEvId = null;
      renderEvPins();
      renderDossier();
    });
  }
}

function raiRating(v) {
  if (v == null) return "N/A";
  if (v < 50) return "Extremely Unaffordable";
  if (v < 80) return "Severely Unaffordable";
  if (v < 100) return "Unaffordable";
  if (v < 120) return "Moderately Unaffordable";
  if (v < 150) return "Acceptable";
  return "Affordable";
}

function attachRaiToLayer(layerKey) {
  const geo = state.cache[layerKey];
  const mapObj = state.raiData?.[layerKey];
  if (!geo || !mapObj) return;
  for (const f of geo.features) {
    const props = f.properties;
    const entry = mapObj[String(props.code)];
    if (entry && entry[0] > 0) {
      props.rai = entry[0];
      props.rai_period = entry[1];
      props.rai_chg5y = entry[2];
      props.rai_basis = layerKey === "sa2" ? `Postcode ${entry[3]}` : `${entry[3]} suburbs (pop-weighted)`;
    } else {
      delete props.rai;
      delete props.rai_period;
      delete props.rai_chg5y;
      delete props.rai_basis;
    }
  }
  rankCache.delete(`${layerKey}:rai`);
}

async function loadRaiData() {
  if (state.raiData) return state.raiData;
  try {
    const data = await d3.json(`data/rai_2025.json?v=${DATA_VERSION}`);
    state.raiData = data;
    for (const key of Object.keys(state.cache)) {
      attachRaiToLayer(key);
    }
  } catch (err) {
    console.warn("Failed to load rai_2025.json:", err);
  }
  return state.raiData;
}

window.addEventListener("DOMContentLoaded", init);
