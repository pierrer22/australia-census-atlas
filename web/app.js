const LAYERS = [
  { key: "sa4", label: "SA4", file: "data/sa4_census_2021.geojson", desc: "89 SA4 regions" },
  { key: "ced", label: "Electorates", file: "data/ced_census_2021.geojson", desc: "150 divisions (2025 AEC)" },
  { key: "sa3", label: "SA3", file: "data/sa3_census_2021.geojson", desc: "340 SA3 regions" },
  { key: "lga", label: "LGA", file: "data/lga_census_2021.geojson", desc: "547 councils" },
  { key: "sa2", label: "SA2", file: "data/sa2_census_2021.geojson", desc: "2,454 suburbs/areas" },
];

const PARTY_COLORS = {
  ALP: "#e11d48",
  LP: "#1d4ed8",
  LNP: "#1d4ed8",
  NP: "#1e40af",
  GRN: "#16a34a",
  IND: "#0d9488",
  KAP: "#b45309",
  XEN: "#b45309",
};

const CENSUS_METRICS = [
  {
    key: "median_hhd_inc_wk",
    label: "Household Income",
    unit: "$/wk",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#e6f4f1", "#7cc6bd", "#0b6e68", "#043835"],
    scale: "linear",
  },
  {
    key: "median_prsnl_inc_wk",
    label: "Personal Income",
    unit: "$/wk",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#ecfeff", "#67e8f9", "#0e7490", "#164e63"],
    scale: "linear",
  },
  {
    key: "median_rent_wk",
    label: "Weekly Rent",
    unit: "$/wk",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#e6f4f1", "#68b8b0", "#0b6e68", "#053330"],
    scale: "linear",
  },
  {
    key: "median_mortgage_mo",
    label: "Monthly Mortgage",
    unit: "$/mo",
    format: (v) => `$${v.toLocaleString()}`,
    colors: ["#ecfdf5", "#34d399", "#047857", "#064e3b"],
    scale: "linear",
  },
  {
    key: "median_age",
    label: "Median Age",
    unit: "yrs",
    format: (v) => `${v} yrs`,
    colors: ["#fef3c7", "#f59e0b", "#b45309", "#78350f"],
    scale: "linear",
  },
  {
    key: "pct_born_overseas",
    label: "Born Overseas",
    unit: "%",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#e0e7ff", "#818cf8", "#3730a3", "#1e1b4b"],
    scale: "linear",
  },
  {
    key: "pct_no_religion",
    label: "Religion",
    unit: "% No Religion",
    format: (v) => `${v.toFixed(1)}%`,
    colors: ["#3b0764", "#7e22ce", "#c084fc", "#f3e8ff"],
    scale: "linear",
    invertRank: true,
  },
  {
    key: "density_sqkm",
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
    label: "2025 Winner",
    unit: "AEC",
    format: (v) => v || "Abolished 2025",
    scale: "party",
    cedOnly: true,
  },
  {
    key: "aec_alp_pct",
    label: "2025 ALP 2PP",
    unit: "%",
    format: (v) => (v != null ? `${v.toFixed(1)}%` : "N/A"),
    colors: ["#1d4ed8", "#93c5fd", "#f1f5f9", "#fda4af", "#e11d48"],
    scale: "diverging",
    cedOnly: true,
  },
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

const state = {
  layerKey: "sa4",
  cache: {},
  ste: null,
  national: null,
  cities: null,
  metric: CENSUS_METRICS[0],
  selectedCode: null,
  activeCity: "Australia",
};

let svg, mapGroup, regionLayer, pathGen, projection, zoomBehavior;
let width = 900;
let height = 650;

function currentGeo() {
  return state.cache[state.layerKey];
}

function availableMetrics() {
  return state.layerKey === "ced"
    ? [...ELECTION_METRICS, ...CENSUS_METRICS]
    : CENSUS_METRICS;
}

async function loadLayer(key) {
  if (state.cache[key]) return state.cache[key];
  const cfg = LAYERS.find((l) => l.key === key);
  const data = await d3.json(cfg.file);
  state.cache[key] = data;
  return data;
}

async function init() {
  initTheme();
  const [sa4, ste, national, cities] = await Promise.all([
    loadLayer("sa4"),
    d3.json("data/ste_2021.geojson"),
    d3.json("data/national_2021.json"),
    d3.json("data/cities_2021.json"),
  ]);
  state.ste = ste;
  state.national = national;
  state.cities = cities;

  buildLayerSwitch();
  buildMetricTabs();
  buildCityBar();
  initSearch();
  initMap(sa4);
  renderLayerPaths();
  renderChoropleth();
  renderDossier();

  document.getElementById("clear-selection").addEventListener("click", () => {
    state.selectedCode = null;
    state.activeCity = "Australia";
    document.querySelectorAll(".city-btn").forEach((b) => b.classList.toggle("active", b.textContent === "Australia"));
    updateSelectionHighlight();
    zoomToCity(CITIES[0]);
    renderDossier();
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

function buildLayerSwitch() {
  const wrap = document.getElementById("layer-switch");
  LAYERS.forEach((l) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "layer-btn" + (l.key === state.layerKey ? " active" : "");
    btn.textContent = l.label;
    btn.addEventListener("click", async () => {
      if (l.key === state.layerKey) return;
      state.layerKey = l.key;
      state.selectedCode = null;
      wrap.querySelectorAll(".layer-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("subtitle").textContent = `ABS 2021 · ${l.desc}`;

      await loadLayer(l.key);
      if (l.key !== "ced" && state.metric.cedOnly) {
        state.metric = CENSUS_METRICS[0];
      }
      buildMetricTabs();
      renderLayerPaths();
      renderChoropleth();
      renderDossier();
    });
    wrap.appendChild(btn);
  });
}

function buildMetricTabs() {
  const container = document.getElementById("metric-tabs");
  container.innerHTML = "";
  availableMetrics().forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "metric-btn" + (m.key === state.metric.key ? " active" : "");
    btn.textContent = m.label;
    btn.addEventListener("click", () => {
      state.metric = m;
      container.querySelectorAll(".metric-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderChoropleth();
      renderDossier();
    });
    container.appendChild(btn);
  });
}

function buildCityBar() {
  const bar = document.getElementById("city-bar");
  CITIES.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "city-btn" + (c.name === state.activeCity ? " active" : "");
    btn.textContent = c.name;
    btn.addEventListener("click", () => {
      state.activeCity = c.name;
      state.selectedCode = null;
      bar.querySelectorAll(".city-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateSelectionHighlight();
      zoomToCity(c);
      renderDossier();
    });
    bar.appendChild(btn);
  });
}

function initMap(initialGeo) {
  const stage = document.querySelector(".map-stage");
  width = stage.clientWidth;
  height = stage.clientHeight;

  svg = d3.select("#australia-map").attr("viewBox", `0 0 ${width} ${height}`);
  mapGroup = svg.append("g");

  const mainlandFeatures = {
    type: "FeatureCollection",
    features: initialGeo.features.filter((f) => f.properties.ste_code !== "9"),
  };

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

  zoomBehavior = d3
    .zoom()
    .scaleExtent([0.75, 120])
    .on("zoom", (event) => {
      mapGroup.attr("transform", event.transform);
    });

  svg.call(zoomBehavior);

  regionLayer = mapGroup.append("g").attr("class", "sa4-layer");

  mapGroup
    .append("g")
    .attr("class", "ste-layer")
    .selectAll("path")
    .data(state.ste.features)
    .join("path")
    .attr("class", "ste-border")
    .attr("d", pathGen);

  document.getElementById("zoom-in").addEventListener("click", () => {
    svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.6);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.625);
  });
  document.getElementById("zoom-reset").addEventListener("click", () => {
    zoomToCity(CITIES[0]);
  });
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
      state.selectedCode = d.properties.code;
      updateSelectionHighlight();
      renderDossier();
    });
}

function zoomToCity(city) {
  if (!city.coords) {
    svg.transition().duration(450).call(zoomBehavior.transform, d3.zoomIdentity);
    return;
  }
  const [x, y] = projection(city.coords);
  const t = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(city.scale)
    .translate(-x, -y);
  svg.transition().duration(500).call(zoomBehavior.transform, t);
}

function focusFeature(feature) {
  let target = feature;
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
    target = { type: "Polygon", coordinates: bestPoly };
  }
  const [[x0, y0], [x1, y1]] = pathGen.bounds(target);
  const dx = Math.max(12, x1 - x0);
  const dy = Math.max(12, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const scale = Math.min(75, 0.65 / Math.max(dx / width, dy / height));
  const t = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-cx, -cy);
  svg.transition().duration(500).call(zoomBehavior.transform, t);
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
  const { color, min, max } = getColorScale();
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

  if (m.scale === "party") {
    barEl.hidden = true;
    ticksEl.hidden = true;
    partiesEl.hidden = false;
    partiesEl.innerHTML = [
      { label: "Labor (ALP)", color: "#e11d48" },
      { label: "Coalition", color: "#1d4ed8" },
      { label: "Ind / Teal", color: "#0d9488" },
      { label: "Greens", color: "#16a34a" },
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
    const mid = m.scale === "log" ? Math.sqrt(min * max) : (min + max) / 2;
    ticksEl.innerHTML =
      `<span>${m.format(min)}</span>` +
      `<span>${m.format(Math.round(mid))}</span>` +
      `<span>${m.format(max)}</span>`;
  }
}

function updateSelectionHighlight() {
  regionLayer
    .selectAll(".sa4-region")
    .classed("selected", (d) => d.properties.code === state.selectedCode);
}

function getRank(code, metric) {
  const key = typeof metric === "string" ? metric : metric.key;
  const asc = typeof metric === "object" && metric.invertRank;
  const features = currentGeo().features.filter((f) => isRankable(f) && f.properties[key] != null);
  const sorted = [...features].sort((a, b) =>
    asc ? a.properties[key] - b.properties[key] : b.properties[key] - a.properties[key]
  );
  const idx = sorted.findIndex((f) => f.properties.code === code);
  return { rank: idx >= 0 ? idx + 1 : null, total: sorted.length };
}

function handleHover(event, d) {
  const tip = document.getElementById("tooltip");
  const p = d.properties;
  const m = state.metric;
  const val = p[m.key];

  let extra = "";
  if (m.scale === "party") {
    extra = p.aec_member ? `${p.aec_member} (${p.aec_alp_pct ?? "—"}% ALP 2PP)` : "Abolished 2025";
  } else if (val != null) {
    const { rank, total } = getRank(p.code, m);
    extra = rank ? `#${rank}/${total}` : "pop < 500";
  }

  const valStr = val != null ? m.format(val) : "N/A";
  tip.innerHTML = `
    <div class="tooltip-title">${p.name}</div>
    <div class="tooltip-meta">${p.ste_name} · Pop ${p.pop != null ? p.pop.toLocaleString() : "New 2025"}</div>
    <div class="tooltip-val">${valStr} <span style="opacity:0.75;font-weight:400">${extra}</span></div>
  `;
  const stageRect = document.querySelector(".map-stage").getBoundingClientRect();
  const x = Math.min(stageRect.width - 260, event.clientX - stageRect.left + 14);
  const y = Math.min(stageRect.height - 95, event.clientY - stageRect.top + 14);
  tip.style.left = `${Math.max(10, x)}px`;
  tip.style.top = `${Math.max(10, y)}px`;
  tip.hidden = false;
}

function renderDossier() {
  const features = currentGeo().features;
  const feat = state.selectedCode
    ? features.find((f) => f.properties.code === state.selectedCode)
    : null;
  const cityProfile = !feat && state.activeCity !== "Australia" && state.cities
    ? state.cities[state.activeCity]
    : null;
  const p = feat ? feat.properties : (cityProfile || state.national);
  const aus = state.national;
  const layerCfg = LAYERS.find((l) => l.key === state.layerKey);

  document.getElementById("clear-selection").hidden = !feat && !cityProfile;
  document.getElementById("dossier-badge").textContent = feat
    ? p.ste_name
    : (cityProfile ? `${p.ste_name} · Greater City` : "National Overview");
  document.getElementById("dossier-title").textContent = (feat || cityProfile) ? p.name : "Australia";
  document.getElementById("dossier-sub").textContent = (feat || cityProfile)
    ? `${p.pop != null ? p.pop.toLocaleString() + " people" : "New 2025 division"} · ${p.area_sqkm.toLocaleString()} km²`
    : `${aus.pop.toLocaleString()} people · ${layerCfg.desc}`;

  const m = state.metric;
  document.getElementById("hero-kpi-label").textContent = m.label;
  if (feat) {
    document.getElementById("hero-kpi-value").textContent = p[m.key] != null ? m.format(p[m.key]) : "N/A";
  } else if (cityProfile) {
    document.getElementById("hero-kpi-value").textContent = p[m.key] != null ? m.format(p[m.key]) : "N/A";
  } else if (m.scale === "party") {
    document.getElementById("hero-kpi-value").textContent = "ALP 94 · LNP 43";
  } else if (m.key === "aec_alp_pct") {
    document.getElementById("hero-kpi-value").textContent = "55.2% ALP";
  } else {
    document.getElementById("hero-kpi-value").textContent = m.format(p[m.key]);
  }

  const rankPill = document.getElementById("hero-rank-pill");
  if (feat && m.scale !== "party" && p[m.key] != null) {
    const { rank, total } = getRank(p.code, m);
    rankPill.textContent = rank ? `#${rank} of ${total}` : "Unranked (pop < 500)";
    rankPill.hidden = false;
  } else {
    rankPill.hidden = true;
  }

  const elecPanel = document.getElementById("election-panel");
  if (state.layerKey === "ced" && feat && p.aec_party) {
    elecPanel.hidden = false;
    const partyColor = PARTY_COLORS[p.aec_party] || "#475569";
    const swingSign = p.aec_swing > 0 ? "+" : "";
    document.getElementById("election-card").innerHTML = `
      <div class="elec-top">
        <span class="elec-mp">${p.aec_member}</span>
        <span class="party-pill" style="background:${partyColor}">${p.aec_party}</span>
      </div>
      <div class="tpp-bar">
        <div class="tpp-alp" style="width:${p.aec_alp_pct}%"></div>
        <div class="tpp-coa" style="width:${p.aec_coa_pct}%"></div>
      </div>
      <div class="tpp-labels mono">
        <span>ALP ${p.aec_alp_pct}% (${swingSign}${p.aec_swing}%)</span>
        <span>COA ${p.aec_coa_pct}%</span>
      </div>
    `;
  } else {
    elecPanel.hidden = true;
  }

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
        return `<div class="compare-row"><div class="compare-top"><span class="label">${c.label}</span><span class="mono" style="color:var(--muted)">N/A (new 2025 seat)</span></div></div>`;
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
  ` : `<span style="color:var(--muted)">No 2021 Census profile for new 2025 division</span>`;

  document.getElementById("stat-grid").innerHTML = [
    { k: "Born Overseas", v: p.pct_born_overseas != null ? `${p.pct_born_overseas}%` : "N/A" },
    { k: "Non-English Home", v: p.pct_other_lang != null ? `${p.pct_other_lang}%` : "N/A" },
    { k: "Year 12+ (15+ yrs)", v: p.pct_yr12 != null ? `${p.pct_yr12}%` : "N/A" },
    { k: "Avg Household Size", v: p.avg_hhd_size != null ? `${p.avg_hhd_size}` : "N/A" },
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

  const valid = features.filter((f) => isRankable(f) && f.properties[m.key] != null && f.properties[m.key] > 0);
  const sorted = [...valid].sort((a, b) =>
    m.invertRank ? a.properties[m.key] - b.properties[m.key] : b.properties[m.key] - a.properties[m.key]
  );
  const top3 = sorted.slice(0, 3);
  const bot3 = sorted.slice(-3).reverse();

  lb.innerHTML = "";
  [
    { title: "Highest", rows: top3 },
    { title: "Lowest", rows: bot3 },
  ].forEach((grp) => {
    const lbl = document.createElement("div");
    lbl.className = "lb-group-label";
    lbl.textContent = grp.title;
    lb.appendChild(lbl);
    grp.rows.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-row";
      btn.innerHTML = `<span class="lb-name">${f.properties.name}</span><span class="lb-val mono">${m.format(f.properties[m.key])}</span>`;
      btn.addEventListener("click", () => {
        state.selectedCode = f.properties.code;
        updateSelectionHighlight();
        focusFeature(f);
        renderDossier();
      });
      lb.appendChild(btn);
    });
  });
}

function initSearch() {
  const input = document.getElementById("region-search");
  const box = document.getElementById("search-results");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      box.hidden = true;
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
        state.selectedCode = f.properties.code;
        input.value = f.properties.name;
        box.hidden = true;
        updateSelectionHighlight();
        focusFeature(f);
        renderDossier();
      });
      box.appendChild(btn);
    });
    box.hidden = false;
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) box.hidden = true;
  });
}

window.addEventListener("DOMContentLoaded", init);
