const FUEL_TABS = [
  { code: "E10_U91", label: "E10 / U91", types: ["E10", "U91"] },
  { code: "E10", label: "E10", types: ["E10"] },
  { code: "U91", label: "Unleaded 91", types: ["U91"] },
  { code: "P95", label: "Premium 95", types: ["P95"] },
  { code: "P98", label: "Premium 98", types: ["P98"] },
  { code: "ALL_DIESEL", label: "All Diesel", types: ["DL", "PDL"] },
  { code: "DL", label: "Diesel", types: ["DL"] },
  { code: "PDL", label: "Prem Diesel", types: ["PDL"] },
  { code: "LPG", label: "LPG", types: ["LPG"] },
];

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

const EV_TABS = [
  { code: "ev_all", label: "All Fast (50+ kW)" },
  { code: "ev_ultra", label: "Ultra-Fast (150+ kW)" },
  { code: "ev_ccs2", label: "CCS2" },
  { code: "ev_chademo", label: "CHAdeMO" },
  { code: "ev_tesla", label: "Tesla" },
  { code: "ev_price", label: "By Price ($/kWh)" },
];

const CITIES = [
  { name: "Sydney", state: "NSW", lat: -33.8688, lon: 151.12, zoom: 11 },
  { name: "Newcastle", state: "NSW", lat: -32.9283, lon: 151.7817, zoom: 11 },
  { name: "Wollongong", state: "NSW", lat: -34.4278, lon: 150.8931, zoom: 11 },
  { name: "Hobart", state: "TAS", lat: -42.8821, lon: 147.3272, zoom: 11 },
  { name: "Perth", state: "WA", lat: -31.9505, lon: 115.8605, zoom: 11 },
  { name: "Canberra", state: "ACT", lat: -35.2809, lon: 149.13, zoom: 11 },
  { name: "Melbourne", state: "VIC", lat: -37.8136, lon: 144.9631, zoom: 11 },
  { name: "Brisbane", state: "QLD", lat: -27.4698, lon: 153.0251, zoom: 11 },
  { name: "Adelaide", state: "SA", lat: -34.9285, lon: 138.6007, zoom: 11 },
  { name: "Darwin", state: "NT", lat: -12.4634, lon: 130.8456, zoom: 11 },
];

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/fiord";

const FUEL_STOPS = [
  [21, 128, 61],
  [74, 222, 128],
  [234, 179, 8],
  [220, 38, 38],
];

const EV_STOPS = [
  [234, 179, 8],
  [14, 165, 233],
  [16, 185, 129],
];

const state = {
  mode: "fuel",
  fuelTab: "E10_U91",
  evTab: "ev_all",
  fuelData: null,
  evData: null,
  userLatLon: null,
  sort: "best",
  selectedId: null,
  activeCity: "Sydney",
};

let map;
let currentStyleUrl = "";
let pillMarkers = [];
let userMarker = null;
let activePopup = null;
let hoverPopup = null;
let stationById = new Map();
let renderRaf = null;

function closeHoverPopup() {
  if (!hoverPopup) return;
  hoverPopup.remove();
  hoverPopup = null;
}

function openHoverPopup(station, html) {
  if (!map || !station) return;
  closeHoverPopup();
  hoverPopup = new maplibregl.Popup({
    maxWidth: "290px",
    offset: 14,
    closeButton: false,
    closeOnClick: false,
    className: "pill-hover-popup",
  })
    .setLngLat([station.lon, station.lat])
    .setHTML(html)
    .addTo(map);
}

function openStationPopup(station, html) {
  if (!map || !station) return;
  closeHoverPopup();
  if (activePopup) activePopup.remove();
  const popup = new maplibregl.Popup({ maxWidth: "290px", offset: 14 })
    .setLngLat([station.lon, station.lat])
    .setHTML(html)
    .addTo(map);
  popup.on("close", () => {
    if (activePopup === popup) activePopup = null;
  });
  activePopup = popup;
}

const BRAND_ICON_RULES = [
  ["eg ampol", "icons/eg-ampol.png"],
  ["u-go", "icons/u-go.png"],
  ["ugo", "icons/u-go.png"],
  ["ampol", "icons/ampol.png"],
  ["bp", "icons/bp.png"],
  ["7-eleven", "icons/7eleven.png"],
  ["7 eleven", "icons/7eleven.png"],
  ["reddy", "icons/shell.png"],
  ["coles express", "icons/shell.png"],
  ["metro", "icons/metro.png"],
  ["shell", "icons/shell.png"],
  ["caltex", "icons/caltex.png"],
  ["united", "icons/united.png"],
  ["liberty", "icons/liberty.png"],
  ["mobil", "icons/mobil.png"],
  ["pearl", "icons/pearl.png"],
  ["vibe", "icons/vibe.png"],
  ["speedway", "icons/speedway.png"],
  ["apex", "icons/apex.png"],
  ["enhance", "icons/enhance.png"],
  ["budget", "icons/budget.png"],
  ["lowes", "icons/lowes.png"],
  ["astron", "icons/astron.png"],
  ["tas petroleum", "icons/tas-pet.png"],
  ["ior", "icons/ior.png"],
  ["atlas", "icons/atlas.png"],
  ["burk", "icons/burk.png"],
  ["inland", "icons/inland.png"],
  ["ultra", "icons/ultra.png"],
  ["costco", "icons/costco.png"],
];

function fuelBrandBadgeSvg(brand, name = "") {
  const raw = String(brand || "").trim();
  const b = raw.toLowerCase();

  for (const [needle, src] of BRAND_ICON_RULES) {
    if (b.includes(needle)) {
      return `<span class="pill-brand" title="${escapeHtml(raw)}"><img src="${src}" alt="" loading="lazy" /></span>`;
    }
  }

  if ((!b || b === "independent") && /\bapex\b/i.test(String(name || ""))) {
    return `<span class="pill-brand" title="Apex Petroleum"><img src="icons/apex.png" alt="" loading="lazy" /></span>`;
  }

  let inner = "";
  if (!b || b === "independent") {
    inner = `<circle cx="8" cy="8" r="8" fill="#334155"/><path d="M4.5 13V4.5A1.2 1.2 0 0 1 5.7 3.3h3.6a1.2 1.2 0 0 1 1.2 1.2V13H4.5zm1.2-8.2v2.7h3.6V4.8H5.7zm5.4 1.2l1.3 1.3v3.9a.8.8 0 0 1-1.6 0V9.1h-.5V8.1h.8a.5.5 0 0 1 .5.5v2.6a.2.2 0 0 0 .4 0V7.7l-1-.9V6z" fill="#f8fafc"/>`;
  } else {
    const words = raw.split(/[\s/-]+/).filter(Boolean);
    const mono = (words.length >= 2 ? words[0][0] + words[1][0] : raw.slice(0, 2)).toUpperCase();
    const fs = mono.length > 1 ? "7.4" : "9.8";
    inner = `<circle cx="8" cy="8" r="8" fill="#475569"/><text x="8" y="11" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="${fs}" fill="#f8fafc">${escapeHtml(mono)}</text>`;
  }

  return `<span class="pill-brand" title="${escapeHtml(raw || "Independent")}"><svg viewBox="0 0 16 16" aria-hidden="true">${inner}</svg></span>`;
}

function isFullyInView(lat, lon) {
  if (!map) return true;
  const cont = map.getContainer();
  const w = cont.clientWidth;
  const h = cont.clientHeight;
  const pt = map.project([lon, lat]);
  const padX = Math.min(54, Math.floor(w * 0.16));
  const padTop = Math.min(50, Math.floor(h * 0.16));
  const padBottom = Math.min(26, Math.floor(h * 0.1));
  return pt.x >= padX && pt.x <= w - padX && pt.y >= padTop && pt.y <= h - padBottom;
}

function tryPlacePillBox(pt, placed, halfW, halfH) {
  const x0 = pt.x - halfW;
  const y0 = pt.y - halfH;
  const x1 = pt.x + halfW;
  const y1 = pt.y + halfH;
  for (const b of placed) {
    if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) return false;
  }
  placed.push([x0, y0, x1, y1]);
  return true;
}

function addPillMarker(station, idStr, label, col, zIndex, isBest, active, popupHtml, brandHtml = "") {
  const el = document.createElement("div");
  el.className = `price-pill${isBest ? " cheapest" : ""}${active ? " active" : ""}`;
  el.style.background = col;
  el.style.zIndex = String(zIndex);
  if (brandHtml) {
    el.innerHTML = `${brandHtml}<span class="pill-txt">${escapeHtml(label)}</span>`;
  } else {
    el.textContent = label;
  }
  el.addEventListener("mouseenter", () => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (activePopup && state.selectedId === idStr) return;
    openHoverPopup(station, popupHtml);
  });
  el.addEventListener("mouseleave", () => {
    closeHoverPopup();
  });
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    state.selectedId = idStr;
    highlightListSelection();
    openStationPopup(station, popupHtml);
  });
  const marker = new maplibregl.Marker({ element: el, anchor: "center" })
    .setLngLat([station.lon, station.lat])
    .addTo(map);
  pillMarkers.push(marker);
}

function selectPillIndices(items, priorityIdxs, placed, halfW, halfH, maxPills) {
  const skipSet = new Set(priorityIdxs);
  const survivors = [];
  for (let i = 0; i < items.length; i++) {
    if (skipSet.has(i)) continue;
    const pt = map.project([items[i].s.lon, items[i].s.lat]);
    if (tryPlacePillBox(pt, placed, halfW, halfH)) {
      survivors.push({ idx: i, pt });
    }
  }
  const budget = Math.max(0, maxPills - priorityIdxs.length);
  let chosen = survivors;
  if (survivors.length > budget) {
    if (window.innerWidth > 820) {
      const cont = map.getContainer();
      const w = Math.max(1, cont.clientWidth);
      const h = Math.max(1, cont.clientHeight);
      const cx = w / 2;
      const cy = h / 2;
      chosen = [...survivors]
        .sort(
          (a, b) =>
            Math.hypot((a.pt.x - cx) / (w * 0.5), (a.pt.y - cy) / (h * 0.5)) -
            Math.hypot((b.pt.x - cx) / (w * 0.5), (b.pt.y - cy) / (h * 0.5))
        )
        .slice(0, budget);
    } else {
      chosen = survivors.slice(0, budget);
    }
  }
  return new Set(chosen.map((c) => c.idx));
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

function rgbInterp(stops, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = stops[idx];
  const b = stops[idx + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * frac);
  const g = Math.round(a[1] + (b[1] - a[1]) * frac);
  const bl = Math.round(a[2] + (b[2] - a[2]) * frac);
  return `rgb(${r}, ${g}, ${bl})`;
}

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
  return rgbInterp(FUEL_STOPS, fuelLogNorm(price, lo, hi));
}

function evPowerColor(kw) {
  const t = Math.max(0, Math.min(1, (kw - 50) / 300));
  return rgbInterp(EV_STOPS, t);
}

function getFuelTabCfg(code = state.fuelTab) {
  return FUEL_TABS.find((t) => t.code === code) || FUEL_TABS[0];
}

function stationFuelEntry(station, tabCode = state.fuelTab) {
  if (!station?.p) return null;
  const types = getFuelTabCfg(tabCode).types;
  let best = null;
  for (const ft of types) {
    const price = station.p[ft];
    if (price != null && (!best || price < best.price)) {
      best = { price, fuelType: ft };
    }
  }
  return best;
}

function evStationValue(station, tabCode = state.evTab) {
  if (!station) return null;
  switch (tabCode) {
    case "ev_all":
      return station.max_kw ?? null;
    case "ev_ultra":
      return station.max_kw >= 150 ? station.max_kw : null;
    case "ev_ccs2":
    case "ev_chademo": {
      const target = tabCode === "ev_ccs2" ? "CCS2" : "CHAdeMO";
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

function computeCompositeFuelStats(data) {
  if (!data?.stations) return;
  data.stats = data.stats || {};
  for (const tab of FUEL_TABS) {
    if (tab.types.length <= 1) continue;
    const vals = [];
    for (const s of data.stations) {
      const e = stationFuelEntry(s, tab.code);
      if (e) vals.push(e.price);
    }
    vals.sort((a, b) => a - b);
    if (!vals.length) continue;
    const q = (p) => vals[Math.min(vals.length - 1, Math.floor((vals.length - 1) * p))];
    data.stats[tab.code] = {
      min: vals[0],
      p10: q(0.1),
      median: q(0.5),
      p90: q(0.9),
      max: vals[vals.length - 1],
      count: vals.length,
    };
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateDistances() {
  if (!state.userLatLon) return;
  const [ulat, ulon] = state.userLatLon;
  for (const s of state.fuelData?.stations || []) {
    s.distKm = haversineKm(ulat, ulon, s.lat, s.lon);
  }
  for (const s of state.evData?.stations || []) {
    s.distKm = haversineKm(ulat, ulon, s.lat, s.lon);
  }
}

function parseHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const mode = params.get("mode") === "ev" ? "ev" : "fuel";
  const tab = params.get("tab") || "";
  if (mode === "ev" && EV_TABS.some((t) => t.code === tab)) {
    state.evTab = tab;
  } else if (mode === "fuel" && FUEL_TABS.some((t) => t.code === tab)) {
    state.fuelTab = tab;
  }
  state.mode = mode;
}

function syncHash() {
  const params = new URLSearchParams();
  if (state.mode !== "fuel") params.set("mode", state.mode);
  const tab = state.mode === "fuel" ? state.fuelTab : state.evTab;
  const defaultTab = state.mode === "fuel" ? FUEL_TABS[0].code : EV_TABS[0].code;
  if (tab !== defaultTab) params.set("tab", tab);
  const qs = params.toString();
  const hashStr = qs ? `#${qs}` : "";
  if (hashStr !== window.location.hash) {
    history.replaceState(null, "", hashStr || `${window.location.pathname}${window.location.search}`);
  }
}

function ensureDotLayer() {
  if (!map || !map.isStyleLoaded() || map.getSource("stations-dots")) return;
  map.addSource("stations-dots", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: "stations-dots-layer",
    type: "circle",
    source: "stations-dots",
    paint: {
      "circle-radius": ["get", "r"],
      "circle-color": ["get", "color"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
      "circle-opacity": 0.92,
    },
  });
}

function setTileTheme(theme) {
  if (!map) return;
  const nextStyle = theme === "dark" ? STYLE_DARK : STYLE_LIGHT;
  if (nextStyle !== currentStyleUrl) {
    currentStyleUrl = nextStyle;
    map.setStyle(nextStyle);
  }
}

function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const saved = localStorage.getItem("atlas-theme") || "light";
  const apply = (mode) => {
    document.documentElement.dataset.theme = mode;
    btn.textContent = mode === "dark" ? "Light" : "Dark";
    setTileTheme(mode);
  };
  apply(saved);
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("atlas-theme", next);
    apply(next);
  });
}

function buildCityJumps() {
  const wrap = document.getElementById("city-jumps");
  wrap.innerHTML = "";
  for (const c of CITIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "city-btn" + (c.name === state.activeCity ? " active" : "");
    btn.textContent = c.name;
    btn.addEventListener("click", async () => {
      state.activeCity = c.name;
      wrap.querySelectorAll(".city-btn").forEach((b) => b.classList.toggle("active", b.textContent === c.name));
      const activeFuelStates = state.fuelData?.states?.length ? state.fuelData.states : ["NSW", "ACT", "TAS", "WA"];
      if (state.mode === "fuel" && !activeFuelStates.includes(c.state)) {
        await setMode("ev");
      }
      map.flyTo({ center: [c.lon, c.lat], zoom: c.zoom, duration: 600 });
    });
    wrap.appendChild(btn);
  }
}

function buildSubTabs() {
  const wrap = document.getElementById("sub-tabs");
  wrap.innerHTML = "";
  const tabs = state.mode === "fuel" ? FUEL_TABS : EV_TABS;
  const activeCode = state.mode === "fuel" ? state.fuelTab : state.evTab;
  for (const t of tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sub-btn" + (t.code === activeCode ? " active" : "");
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      if (state.mode === "fuel") state.fuelTab = t.code;
      else state.evTab = t.code;
      state.selectedId = null;
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      buildSubTabs();
      renderLegend();
      renderView();
      syncHash();
    });
    wrap.appendChild(btn);
  }
}

async function setMode(nextMode) {
  if (state.mode === nextMode) return;
  state.mode = nextMode;
  state.selectedId = null;
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
  document.querySelectorAll("#mode-switch .mode-btn").forEach((b) => {
    const active = b.dataset.mode === nextMode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
  });
  buildSubTabs();
  if (nextMode === "ev" && !state.evData) {
    await loadEvData();
  }
  updateSubtitle();
  renderLegend();
  renderView();
  syncHash();
}

function updateSubtitle() {
  const el = document.getElementById("fuel-subtitle");
  const states = state.fuelData?.states?.length ? state.fuelData.states : ["NSW", "ACT", "TAS", "WA"];
  const fuelBtn = document.querySelector('#mode-switch .mode-btn[data-mode="fuel"]');
  if (fuelBtn) fuelBtn.textContent = `Fuel (${states.join("/")})`;
  if (state.mode === "fuel") {
    const d = state.fuelData;
    el.textContent = d
      ? `Live Fuel (${states.join("/")}) · ${d.station_count.toLocaleString()} stations · Updated ${d.generated_at.slice(0, 10)}`
      : "Loading live Australian fuel prices…";
  } else {
    const d = state.evData;
    el.textContent = d
      ? `Open Charge Map · ${d.station_count.toLocaleString()} AU fast chargers (50+ kW)`
      : "Loading AU EV Fast Chargers…";
  }
}

function renderLegend(customStats = null) {
  const titleEl = document.getElementById("legend-title");
  const barEl = document.getElementById("legend-bar");
  const ticksEl = document.getElementById("legend-ticks");

  if (state.mode === "fuel") {
    const cfg = getFuelTabCfg();
    const st = customStats || state.fuelData?.stats?.[cfg.code];
    titleEl.textContent = customStats ? `${cfg.label} (¢/L · view)` : `${cfg.label} (¢/L · log scale)`;
    barEl.style.background = "linear-gradient(90deg, #15803d, #4ade80, #eab308, #dc2626)";
    if (st) {
      const lo = st.min ?? st.p10;
      const hi = st.p90 ?? st.max;
      const span = hi - lo;
      const mid = hi > lo ? lo + span * 0.15 * (Math.sqrt(1 + 1 / 0.15) - 1) : lo;
      ticksEl.innerHTML = `<span>${lo.toFixed(1)}¢</span><span>${mid.toFixed(1)}¢</span><span>${hi.toFixed(1)}¢</span>`;
    } else {
      ticksEl.innerHTML = "";
    }
    return;
  }

  if (state.evTab === "ev_price") {
    const st = customStats || state.evData?.stats;
    titleEl.textContent = customStats ? "EV Price ($/kWh · view)" : "EV Fast Charging ($/kWh)";
    barEl.style.background = "linear-gradient(90deg, #15803d, #4ade80, #eab308, #dc2626)";
    const lo = st?.min ?? st?.min_price;
    const hi = st?.p90 ?? st?.p90_price;
    if (lo != null && hi != null) {
      const span = hi - lo;
      const mid = hi > lo ? lo + span * 0.15 * (Math.sqrt(1 + 1 / 0.15) - 1) : lo;
      const fmt = (v) => (v === 0 ? "Free" : `$${v.toFixed(2)}`);
      ticksEl.innerHTML = `<span>${fmt(lo)}</span><span>${fmt(mid)}</span><span>${fmt(hi)}</span>`;
    } else {
      ticksEl.innerHTML = "";
    }
  } else {
    titleEl.textContent = "Charger Power (kW)";
    barEl.style.background = "linear-gradient(90deg, #eab308, #0ea5e9, #10b981)";
    ticksEl.innerHTML = "<span>50 kW</span><span>150 kW</span><span>350+ kW</span>";
  }
}

function buildDirectionsLink(s) {
  const dest = `${s.lat},${s.lon}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) {
    const intentUrl = `intent://maps.google.com/maps?daddr=${dest}&directionsmode=driving#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    return `<a class="dir-link" href="${escapeHtml(intentUrl)}">Directions ↗</a>`;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return `<a class="dir-link" href="${webUrl}" data-ios-maps="1" data-lat="${s.lat}" data-lon="${s.lon}">Directions ↗</a>`;
  }
  return `<a class="dir-link" href="${webUrl}" target="_blank" rel="noopener noreferrer">Directions ↗</a>`;
}

function fuelPopupHtml(s) {
  const rows = Object.entries(s.p || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `<tr><td>${escapeHtml(FUEL_LABELS[k] || k)}</td><td>${v.toFixed(1)}¢</td></tr>`)
    .join("");
  const distStr = s.distKm != null ? ` · ${s.distKm.toFixed(1)} km` : "";
  return `
    <div class="popup-box">
      <div class="popup-title">${escapeHtml(s.name)}</div>
      <div class="popup-meta"><span class="brand-inline">${fuelBrandBadgeSvg(s.brand, s.name)}<span>${escapeHtml(s.brand || "Fuel")} · ${escapeHtml(s.sa2_name || s.lga_name || "NSW")}${escapeHtml(distStr)}</span></span></div>
      <div class="popup-addr">${escapeHtml(s.addr)}</div>
      ${rows ? `<table class="popup-table"><thead><tr><th>Fuel</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
      <div class="popup-actions">
        <span class="mono" style="opacity:0.7">${s.upd ? `Upd ${escapeHtml(s.upd)}` : ""}</span>
        ${buildDirectionsLink(s)}
      </div>
    </div>
  `;
}

function evPopupHtml(s) {
  const rows = (s.conns || [])
    .map(([tech, kw, qty]) => `<tr><td>${escapeHtml(tech)}</td><td>${kw} kW</td><td>${qty}×</td></tr>`)
    .join("");
  const distStr = s.distKm != null ? ` · ${s.distKm.toFixed(1)} km` : "";
  const priceStr = evFormatPrice(s.price_kwh);
  return `
    <div class="popup-box">
      <div class="popup-title">${escapeHtml(s.name)}</div>
      <div class="popup-meta">${escapeHtml(s.op || "Public Charger")} · ${escapeHtml(s.sa2_name || s.lga_name || "AU")}${escapeHtml(distStr)}</div>
      ${s.addr ? `<div class="popup-addr">${escapeHtml(s.addr)}</div>` : ""}
      <div style="font-size:0.76rem;font-weight:700;margin-bottom:5px">${s.max_kw} kW max · ${escapeHtml(priceStr)}</div>
      ${rows ? `<table class="popup-table"><thead><tr><th>Tech</th><th>Power</th><th>Bays</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
      ${s.cost ? `<div style="font-size:0.68rem;opacity:0.78;margin-bottom:6px">${escapeHtml(s.cost)}</div>` : ""}
      <div class="popup-actions">
        <span class="mono" style="opacity:0.7">${s.upd ? `Verified ${escapeHtml(s.upd)}` : ""}</span>
        ${buildDirectionsLink(s)}
      </div>
    </div>
  `;
}

function scheduleRender() {
  if (renderRaf) return;
  renderRaf = requestAnimationFrame(() => {
    renderRaf = null;
    renderView();
  });
}

function clearMarkers() {
  closeHoverPopup();
  for (const m of pillMarkers) m.remove();
  pillMarkers = [];
  stationById.clear();
  const src = map?.getSource("stations-dots");
  if (src) src.setData({ type: "FeatureCollection", features: [] });
}

function renderView() {
  if (!map) return;
  clearMarkers();

  const bounds = map.getBounds();
  const zoom = map.getZoom();

  if (state.mode === "fuel") {
    renderFuelView(bounds, zoom);
  } else {
    renderEvView(bounds, zoom);
  }
}

function renderFuelView(bounds, zoom) {
  const listEl = document.getElementById("station-list");
  const kpiEl = document.getElementById("kpi-row");
  const titleEl = document.getElementById("list-title");
  const badgeEl = document.getElementById("list-badge");
  const cfg = getFuelTabCfg();
  const isComposite = cfg.types.length > 1;
  titleEl.textContent = `Fuel · ${cfg.label}`;

  if (!state.fuelData?.stations) {
    badgeEl.textContent = "Loading…";
    kpiEl.innerHTML = "";
    listEl.innerHTML = "";
    return;
  }

  const stStats = state.fuelData.stats?.[cfg.code];
  const inView = [];
  for (const s of state.fuelData.stations) {
    const entry = stationFuelEntry(s, cfg.code);
    if (!entry) continue;
    if (bounds.contains([s.lon, s.lat])) {
      inView.push({ s, price: entry.price, fuelType: entry.fuelType });
    }
  }

  badgeEl.textContent = `${inView.length} in view`;
  inView.sort((a, b) => a.price - b.price);

  if (!inView.length) {
    kpiEl.innerHTML = "";
    listEl.innerHTML = `<div style="font-size:0.76rem;color:var(--muted);padding:8px">Pan to NSW, TAS, or WA (Sydney / Perth / Hobart) above.</div>`;
    renderLegend(null);
    return;
  }

  const toPlot = inView.length > 500 ? inView.slice(0, 500) : inView;
  let cheapestIdx = toPlot.findIndex((item) => isFullyInView(item.s.lat, item.s.lon));
  if (cheapestIdx < 0) cheapestIdx = 0;

  const lo = toPlot[cheapestIdx].price;
  const mid = inView[Math.floor(inView.length / 2)].price;
  const hiMax = inView[inView.length - 1].price;
  const p90 = inView[Math.min(inView.length - 1, Math.floor((inView.length - 1) * 0.9))].price;
  const hi = p90 > inView[0].price ? p90 : hiMax;
  const hasViewRange = inView.length >= 2 && hi > inView[0].price;
  const colorStats = hasViewRange ? { min: inView[0].price, median: mid, p90: hi, max: hiMax } : stStats;
  renderLegend(hasViewRange ? colorStats : null);

  kpiEl.innerHTML = `
    <div class="kpi-box"><div class="k">Cheapest</div><div class="v mono" style="color:#15803d">${lo.toFixed(1)}¢</div></div>
    <div class="kpi-box"><div class="k">Median</div><div class="v mono">${mid.toFixed(1)}¢</div></div>
    <div class="kpi-box"><div class="k">Highest</div><div class="v mono" style="color:#dc2626">${hiMax.toFixed(1)}¢</div></div>
  `;

  const maxPills = zoom >= 12.5 ? 160 : 75;
  const halfW = zoom >= 12.5 ? 32 : 36;
  const halfH = zoom >= 12.5 ? 11 : 13;
  const placed = [];
  const dotFeatures = [];
  const activeIdx = toPlot.findIndex((item) => item.s.code === state.selectedId);
  const priorityIdxs = activeIdx >= 0 && activeIdx !== cheapestIdx ? [cheapestIdx, activeIdx] : [cheapestIdx];

  for (const idx of priorityIdxs) {
    const item = toPlot[idx];
    const isCheapest = idx === cheapestIdx;
    const active = idx === activeIdx;
    const col = fuelColor(item.price, colorStats);
    stationById.set(item.s.code, item.s);
    const pt = map.project([item.s.lon, item.s.lat]);
    placed.push([pt.x - halfW, pt.y - halfH, pt.x + halfW, pt.y + halfH]);
    addPillMarker(
      item.s,
      item.s.code,
      `${isCheapest ? "★ " : ""}${item.price.toFixed(1)}¢`,
      col,
      isCheapest ? 2500 : 2000,
      isCheapest,
      active,
      fuelPopupHtml(item.s),
      fuelBrandBadgeSvg(item.s.brand, item.s.name)
    );
  }

  const pillIdxs = selectPillIndices(toPlot, priorityIdxs, placed, halfW, halfH, maxPills);
  for (let i = 0; i < toPlot.length; i++) {
    if (i === cheapestIdx || i === activeIdx) continue;
    const item = toPlot[i];
    const col = fuelColor(item.price, colorStats);
    stationById.set(item.s.code, item.s);
    if (pillIdxs.has(i)) {
      addPillMarker(
        item.s,
        item.s.code,
        `${item.price.toFixed(1)}¢`,
        col,
        1000 - i,
        false,
        false,
        fuelPopupHtml(item.s),
        fuelBrandBadgeSvg(item.s.brand, item.s.name)
      );
    } else {
      dotFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.s.lon, item.s.lat] },
        properties: { id: item.s.code, r: 5.5, color: col },
      });
    }
  }

  const src = map.getSource("stations-dots");
  if (src) src.setData({ type: "FeatureCollection", features: dotFeatures });

  const listItems = [...inView];
  if (state.sort === "nearest" && state.userLatLon) {
    listItems.sort((a, b) => (a.s.distKm ?? 9999) - (b.s.distKm ?? 9999));
  }

  listEl.innerHTML = listItems
    .slice(0, 35)
    .map((item) => {
      const col = fuelColor(item.price, colorStats);
      const tag = isComposite ? ` · ${item.fuelType}` : "";
      const dist = item.s.distKm != null ? `${item.s.distKm.toFixed(1)} km` : (item.s.sa2_name || item.s.lga_name || "");
      return `
        <button type="button" class="station-card${item.s.code === state.selectedId ? " active" : ""}" data-id="${escapeHtml(item.s.code)}">
          <div class="card-top">
            <span class="brand-inline">${fuelBrandBadgeSvg(item.s.brand, item.s.name)}<span>${escapeHtml(item.s.brand || "Fuel")} · ${escapeHtml(item.s.lga_name || "NSW")}</span></span>
            <span class="card-price" style="color:${col}">${item.price.toFixed(1)}¢${escapeHtml(tag)}</span>
          </div>
          <div class="card-title">${escapeHtml(item.s.name)}</div>
          <div class="card-sub"><span>${escapeHtml(item.s.addr)}</span><span class="mono">${escapeHtml(dist)}</span></div>
        </button>`;
    })
    .join("");

  attachListHandlers(listEl);
}

function renderEvView(bounds, zoom) {
  const listEl = document.getElementById("station-list");
  const kpiEl = document.getElementById("kpi-row");
  const titleEl = document.getElementById("list-title");
  const badgeEl = document.getElementById("list-badge");
  const tabCfg = EV_TABS.find((t) => t.code === state.evTab) || EV_TABS[0];
  titleEl.textContent = `EV · ${tabCfg.label}`;

  if (!state.evData?.stations) {
    badgeEl.textContent = "Loading…";
    kpiEl.innerHTML = "";
    listEl.innerHTML = "";
    return;
  }

  const evStats = state.evData.stats;
  const inView = [];
  for (const s of state.evData.stations) {
    const val = evStationValue(s, state.evTab);
    if (val == null) continue;
    if (bounds.contains([s.lon, s.lat])) {
      inView.push({ s, val });
    }
  }

  badgeEl.textContent = `${inView.length} in view`;
  inView.sort((a, b) => (state.evTab === "ev_price" ? a.val - b.val : b.val - a.val));

  if (!inView.length) {
    kpiEl.innerHTML = "";
    listEl.innerHTML = `<div style="font-size:0.76rem;color:var(--muted);padding:8px">No matching fast chargers in this view. Pan out or jump to a city above.</div>`;
    renderLegend(null);
    return;
  }

  let evColorStats = { min: evStats?.min_price ?? 0, p90: evStats?.p90_price ?? 0.66 };
  if (state.evTab === "ev_price") {
    const lo = inView[0].val;
    const mid = inView[Math.floor(inView.length / 2)].val;
    const hiMax = inView[inView.length - 1].val;
    const p90 = inView[Math.min(inView.length - 1, Math.floor((inView.length - 1) * 0.9))].val;
    const hi = p90 > lo ? p90 : hiMax;
    const hasViewRange = inView.length >= 2 && hi > lo;
    if (hasViewRange) {
      evColorStats = { min: lo, median: mid, p90: hi, max: hiMax };
      renderLegend(evColorStats);
    } else {
      renderLegend(null);
    }
  } else {
    renderLegend(null);
  }

  let bestIdx = inView.findIndex((item) => isFullyInView(item.s.lat, item.s.lon));
  if (bestIdx < 0) bestIdx = 0;

  const topKw = Math.max(...inView.map((x) => x.s.max_kw));
  const ultra = inView.filter((x) => x.s.max_kw >= 150).length;
  const priced = inView.filter((x) => x.s.price_kwh != null).map((x) => x.s.price_kwh).sort((a, b) => a - b);
  const cheapest = state.evTab === "ev_price" ? evFormatPrice(inView[bestIdx].val) : (priced.length ? evFormatPrice(priced[0]) : "N/A");
  kpiEl.innerHTML = `
    <div class="kpi-box"><div class="k">Top Power</div><div class="v mono" style="color:#10b981">${topKw} kW</div></div>
    <div class="kpi-box"><div class="k">150+ kW</div><div class="v mono">${ultra}</div></div>
    <div class="kpi-box"><div class="k">Cheapest</div><div class="v mono" style="color:#15803d">${escapeHtml(cheapest)}</div></div>
  `;

  const maxPills = zoom >= 12.5 ? 160 : 75;
  const halfW = zoom >= 12.5 ? 24 : 28;
  const halfH = zoom >= 12.5 ? 9 : 11;
  const placed = [];
  const dotFeatures = [];
  const evColorFor = (item) =>
    state.evTab === "ev_price" ? fuelColor(item.val, evColorStats) : evPowerColor(item.val);
  const evLabelFor = (item) =>
    state.evTab === "ev_price"
      ? (item.val === 0 ? "Free" : `$${item.val.toFixed(2)}`)
      : `${Math.round(item.val)}kW`;

  const activeIdx = inView.findIndex((item) => String(item.s.id) === String(state.selectedId));
  const priorityIdxs = activeIdx >= 0 && activeIdx !== bestIdx ? [bestIdx, activeIdx] : [bestIdx];

  for (const idx of priorityIdxs) {
    const item = inView[idx];
    const idStr = String(item.s.id);
    const isBest = idx === bestIdx;
    const active = idx === activeIdx;
    const col = evColorFor(item);
    stationById.set(idStr, item.s);
    const pt = map.project([item.s.lon, item.s.lat]);
    placed.push([pt.x - halfW, pt.y - halfH, pt.x + halfW, pt.y + halfH]);
    addPillMarker(
      item.s,
      idStr,
      `${isBest ? "★ " : ""}${evLabelFor(item)}`,
      col,
      isBest ? 2500 : 2000,
      isBest,
      active,
      evPopupHtml(item.s)
    );
  }

  const pillIdxs = selectPillIndices(inView, priorityIdxs, placed, halfW, halfH, maxPills);
  for (let i = 0; i < inView.length; i++) {
    if (i === bestIdx || i === activeIdx) continue;
    const item = inView[i];
    const idStr = String(item.s.id);
    const col = evColorFor(item);
    stationById.set(idStr, item.s);
    if (pillIdxs.has(i)) {
      addPillMarker(item.s, idStr, evLabelFor(item), col, 1000 - i, false, false, evPopupHtml(item.s));
    } else {
      dotFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.s.lon, item.s.lat] },
        properties: { id: idStr, r: item.s.max_kw >= 150 ? 6 : 4.8, color: col },
      });
    }
  }

  const src = map.getSource("stations-dots");
  if (src) src.setData({ type: "FeatureCollection", features: dotFeatures });

  const listItems = [...inView];
  if (state.sort === "nearest" && state.userLatLon) {
    listItems.sort((a, b) => (a.s.distKm ?? 9999) - (b.s.distKm ?? 9999));
  }

  listEl.innerHTML = listItems
    .slice(0, 35)
    .map((item) => {
      const col =
        state.evTab === "ev_price"
          ? fuelColor(item.val, evColorStats)
          : evPowerColor(item.val);
      const techs = (item.s.conns || []).map(([t, kw, q]) => `${t} ${kw}kW×${q}`).join(" · ");
      const priceTag = evFormatPrice(item.s.price_kwh);
      const dist = item.s.distKm != null ? `${item.s.distKm.toFixed(1)} km` : (item.s.sa2_name || item.s.lga_name || "");
      return `
        <button type="button" class="station-card${String(item.s.id) === String(state.selectedId) ? " active" : ""}" data-id="${item.s.id}">
          <div class="card-top">
            <span>${escapeHtml(item.s.op || "Charger")} · ${escapeHtml(item.s.lga_name || "AU")}</span>
            <span class="card-price" style="color:${col}">${item.s.max_kw} kW · ${escapeHtml(priceTag)}</span>
          </div>
          <div class="card-title">${escapeHtml(item.s.name)}</div>
          <div class="card-sub"><span>${escapeHtml(techs || item.s.addr)}</span><span class="mono">${escapeHtml(dist)}</span></div>
        </button>`;
    })
    .join("");

  attachListHandlers(listEl);
}

function attachListHandlers(listEl) {
  listEl.querySelectorAll(".station-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const st = stationById.get(id);
      if (!st) return;
      state.selectedId = id;
      highlightListSelection();
      map.easeTo({ center: [st.lon, st.lat], duration: 350 });
      openStationPopup(st, state.mode === "fuel" ? fuelPopupHtml(st) : evPopupHtml(st));
      if (window.innerWidth <= 820) {
        document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function highlightListSelection() {
  document.querySelectorAll("#station-list .station-card").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === String(state.selectedId));
  });
}

function initSearch() {
  const input = document.getElementById("station-search");
  const results = document.getElementById("station-search-results");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }
    const list = state.mode === "fuel" ? (state.fuelData?.stations || []) : (state.evData?.stations || []);
    const matches = [];
    for (const s of list) {
      const hay = `${s.name} ${s.brand || s.op || ""} ${s.sa2_name || ""} ${s.lga_name || ""} ${s.addr || ""}`.toLowerCase();
      if (hay.includes(q)) {
        matches.push(s);
        if (matches.length >= 8) break;
      }
    }
    if (!matches.length) {
      results.hidden = true;
      return;
    }
    results.innerHTML = matches
      .map((s) => {
        const right =
          state.mode === "fuel"
            ? (() => {
                const e = stationFuelEntry(s, state.fuelTab);
                return e ? `${e.price.toFixed(1)}¢` : "";
              })()
            : `${s.max_kw} kW`;
        return `
          <button type="button" class="search-item" data-id="${escapeHtml(s.code || s.id)}">
            <span><strong>${escapeHtml(s.name)}</strong><span class="search-item-sub">${escapeHtml(s.sa2_name || s.lga_name || "")} · ${escapeHtml(s.brand || s.op || "")}</span></span>
            <span class="mono" style="font-weight:700">${escapeHtml(right)}</span>
          </button>`;
      })
      .join("");
    results.hidden = false;

    results.querySelectorAll(".search-item").forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        const st = matches[idx];
        results.hidden = true;
        input.value = st.name;
        state.selectedId = String(st.code || st.id);
        map.jumpTo({ center: [st.lon, st.lat], zoom: 13.5 });
        openStationPopup(st, state.mode === "fuel" ? fuelPopupHtml(st) : evPopupHtml(st));
      });
    });
  });

  document.addEventListener("click", (ev) => {
    if (!ev.target.closest(".search-wrap")) results.hidden = true;
  });
}

function locateUser() {
  const btn = document.getElementById("locate-btn");
  if (!navigator.geolocation) {
    btn.textContent = "No GPS";
    return;
  }
  btn.textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      state.userLatLon = [latitude, longitude];
      btn.textContent = "Near Me";
      btn.classList.add("active");
      if (userMarker) userMarker.remove();
      const dotEl = document.createElement("div");
      dotEl.className = "user-gps-dot";
      dotEl.title = "Your location";
      userMarker = new maplibregl.Marker({ element: dotEl, anchor: "center" })
        .setLngLat([longitude, latitude])
        .addTo(map);
      updateDistances();
      state.sort = "nearest";
      document.getElementById("sort-select").value = "nearest";
      map.flyTo({ center: [longitude, latitude], zoom: 12.2, duration: 600 });
    },
    () => {
      btn.textContent = "GPS Denied";
      setTimeout(() => (btn.textContent = "Near Me"), 2500);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function loadFuelData() {
  if (state.fuelData) return state.fuelData;
  const data = await fetch("data/nsw_fuel_prices.json").then((r) => r.json());
  computeCompositeFuelStats(data);
  state.fuelData = data;
  updateDistances();
  return data;
}

async function loadEvData() {
  if (state.evData) return state.evData;
  const data = await fetch("data/au_ev_chargers.json").then((r) => r.json());
  state.evData = data;
  updateDistances();
  return data;
}

function enhanceDarkReadability() {
  if (!map || currentStyleUrl !== STYLE_DARK) return;
  const layers = map.getStyle()?.layers || [];
  for (const layer of layers) {
    const id = layer.id || "";
    try {
      if (id === "background") {
        map.setPaintProperty(id, "background-color", "#1e2736");
      } else if (id === "water") {
        map.setPaintProperty(id, "fill-color", "#131b26");
      } else if (id.includes("highway_motorway_inner") || id.includes("highway_major_inner")) {
        map.setPaintProperty(id, "line-color", "#475569");
      } else if (id.includes("highway_motorway_casing") || id.includes("highway_major_casing")) {
        map.setPaintProperty(id, "line-color", "#64748b");
      } else if (id === "highway_minor") {
        map.setPaintProperty(id, "line-color", "#3b475a");
      } else if (layer.type === "symbol" && (id.startsWith("place_") || id.startsWith("highway_name"))) {
        const isCity = id.startsWith("place_city") || id.startsWith("place_town") || id.startsWith("place_village");
        map.setPaintProperty(id, "text-color", isCity ? "#e2e8f0" : "#cbd5e1");
        map.setPaintProperty(id, "text-halo-color", "rgba(15, 23, 42, 0.9)");
        map.setPaintProperty(id, "text-halo-width", 1.4);
      }
    } catch (_) {}
  }
}

async function init() {
  parseHash();
  const initialTheme = localStorage.getItem("atlas-theme") || "light";
  currentStyleUrl = initialTheme === "dark" ? STYLE_DARK : STYLE_LIGHT;

  map = new maplibregl.Map({
    container: "map",
    style: currentStyleUrl,
    center: [151.12, -33.8688],
    zoom: 11.2,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

  map.on("style.load", () => {
    enhanceDarkReadability();
    ensureDotLayer();
    if (state.fuelData || state.evData) renderView();
  });

  map.on("click", "stations-dots-layer", (e) => {
    const f = e.features && e.features[0];
    if (!f) return;
    const id = String(f.properties.id);
    const st = stationById.get(id);
    if (!st) return;
    state.selectedId = id;
    highlightListSelection();
    openStationPopup(st, state.mode === "fuel" ? fuelPopupHtml(st) : evPopupHtml(st));
  });
  map.on("mouseenter", "stations-dots-layer", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "stations-dots-layer", () => {
    map.getCanvas().style.cursor = "";
  });

  initTheme();
  buildCityJumps();

  document.querySelectorAll("#mode-switch .mode-btn").forEach((btn) => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  buildSubTabs();
  initSearch();

  document.getElementById("locate-btn").addEventListener("click", locateUser);
  document.getElementById("sort-select").addEventListener("change", (e) => {
    state.sort = e.target.value;
    if (state.sort === "nearest" && !state.userLatLon) {
      locateUser();
    } else {
      renderView();
    }
  });

  map.on("moveend", scheduleRender);
  map.on("zoomend", scheduleRender);

  document.addEventListener("click", (e) => {
    const link = e.target.closest('.dir-link[data-ios-maps="1"]');
    if (!link) return;
    e.preventDefault();
    const { lat, lon } = link.dataset;
    const webUrl = link.getAttribute("href");
    window.location.href = `comgooglemaps://?daddr=${lat},${lon}&directionsmode=driving`;
    setTimeout(() => {
      if (!document.hidden) window.location.href = webUrl;
    }, 700);
  });

  await loadFuelData();
  if (state.mode === "ev") await loadEvData();
  updateSubtitle();
  renderLegend();
  ensureDotLayer();
  renderView();
  syncHash();
}

window.addEventListener("DOMContentLoaded", init);
