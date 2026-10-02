/* ---------- EDIT THESE DEFAULTS ---------- */
const DEFAULTS = {
  brand: "Your Brand",
  designer: "Designer Name",
  whatsapp: "",            // e.g. "2348012345678" (country code, no +)
  color: "#25346b"
};

// Put photos in the "images" folder and list them here.
// If a file is missing, a plain placeholder tile shows instead.
const GALLERY = [
  { id: "g1", title: "Agbada",         src: "images/agbada.jpg" },
  { id: "g2", title: "Senator",        src: "images/senator.jpg" },
  { id: "g3", title: "Kaftan",         src: "images/kaftan.jpg" },
  { id: "g4", title: "Dashiki",        src: "images/dashiki.jpg" },
  { id: "g5", title: "Two-piece suit", src: "images/suit.jpg" },
  { id: "g6", title: "Native cap",     src: "images/cap.jpg" },
  { id: "g7", title: "Short sleeve",   src: "images/short-sleeve.jpg" },
  { id: "g8", title: "Tapered trouser",src: "images/trouser.jpg" }
];

const START_SECTIONS = [
  { name: "Top", fixed: true, fields: ["Neck", "Shoulder", "Chest", "Waist", "Sleeve length", "Round sleeve", "Top length"] },
  { name: "Trousers", fixed: true, fields: ["Waist", "Hip", "Thigh", "Knee", "Length", "Bottom", "Crotch"] },
  { name: "Cap", fixed: true, fields: ["Head circumference", "Front to back", "Depth"] }
];
/* ----------------------------------------- */

const $ = id => document.getElementById(id);
const store = {
  get() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("ms-settings")) }; } catch { return { ...DEFAULTS }; } },
  set(v) { try { localStorage.setItem("ms-settings", JSON.stringify(v)); } catch {} }
};

let settings = store.get();
let unit = "in";
let active = 0;
const picked = new Set();
const gallery = GALLERY.slice();
const sections = START_SECTIONS.map(s => ({
  name: s.name, fixed: s.fixed,
  fields: s.fields.map(l => ({ label: l, value: "", custom: false }))
}));

/* ---------- branding ---------- */
function applyBrand() {
  $("brandName").textContent = settings.brand;
  $("designerLine").textContent = "by " + settings.designer;
  document.title = settings.brand + " · Measurement sheet";
  document.documentElement.style.setProperty("--brand", settings.color);
}
$("openSettings").onclick = () => {
  $("sBrand").value = settings.brand;
  $("sDesigner").value = settings.designer;
  $("sPhone").value = settings.whatsapp;
  $("sColor").value = settings.color;
  $("settings").showModal();
};
$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  settings = {
    brand: $("sBrand").value.trim() || DEFAULTS.brand,
    designer: $("sDesigner").value.trim() || DEFAULTS.designer,
    whatsapp: $("sPhone").value.replace(/\D/g, ""),
    color: $("sColor").value
  };
  store.set(settings);
  applyBrand();
});

/* ---------- unit ---------- */
$("unitSeg").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  unit = b.dataset.unit;
  [...$("unitSeg").children].forEach(x => x.classList.toggle("on", x === b));
  renderPanel();
});

/* ---------- measurements ---------- */
function renderTabs() {
  $("tabs").innerHTML = "";
  sections.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab" + (i === active ? " on" : "");
    b.textContent = s.name;
    b.onclick = () => { active = i; renderTabs(); renderPanel(); };
    $("tabs").appendChild(b);
  });
  const add = document.createElement("button");
  add.type = "button"; add.className = "tab add"; add.textContent = "+ Add section";
  add.onclick = () => {
    const name = (prompt("Name of the new section (e.g. Agbada, Waistcoat)") || "").trim();
    if (!name) return;
    sections.push({ name, fixed: false, fields: [{ label: "", value: "", custom: true }] });
    active = sections.length - 1; renderTabs(); renderPanel();
  };
  $("tabs").appendChild(add);
}

function renderPanel() {
  const s = sections[active], p = $("panel");
  p.innerHTML = '<div class="grid"></div><div class="panelfoot"></div>';
  const grid = p.firstChild;
  s.fields.forEach((f, i) => {
    const w = document.createElement("div"); w.className = "m";
    const label = f.custom
      ? `<input class="lab" type="text" placeholder="Measurement name" value="${esc(f.label)}">`
      : `<span>${esc(f.label)}</span>`;
    w.innerHTML = `${label}<div class="val"><input type="number" inputmode="decimal" min="0" step="0.25" value="${esc(f.value)}"><span class="u">${unit}</span></div>` +
      (f.custom ? '<button class="x" type="button" aria-label="Remove">×</button>' : "");
    const [lab, num] = w.querySelectorAll("input");
    if (f.custom) lab.oninput = () => f.label = lab.value;
    (f.custom ? num : lab).oninput = e => { f.value = e.target.value; updateSummary(); };
    const x = w.querySelector(".x");
    if (x) x.onclick = () => { s.fields.splice(i, 1); renderPanel(); updateSummary(); };
    grid.appendChild(w);
  });
  const foot = p.lastChild;
  const addF = document.createElement("button");
  addF.type = "button"; addF.className = "ghost"; addF.textContent = "+ Add measurement";
  addF.onclick = () => { s.fields.push({ label: "", value: "", custom: true }); renderPanel(); };
  foot.appendChild(addF);
  if (!s.fixed) {
    const d = document.createElement("button");
    d.type = "button"; d.className = "ghost del"; d.textContent = "Remove this section";
    d.onclick = () => { sections.splice(active, 1); active = 0; renderTabs(); renderPanel(); updateSummary(); };
    foot.appendChild(d);
  }
}

/* ---------- gallery ---------- */
function placeholder(t) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#dfe3df"/><path d="M0 0L300 400M300 0L0 400" stroke="#cfd3d0" stroke-width="2"/><text x="150" y="205" font-family="sans-serif" font-size="22" fill="#5b6275" text-anchor="middle">${t.replace(/[<&]/g, "")}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
function renderGallery() {
  const g = $("gallery"); g.innerHTML = "";
  gallery.forEach(item => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tile" + (picked.has(item.id) ? " on" : "");
    b.setAttribute("aria-pressed", picked.has(item.id));
    const img = new Image(); img.alt = ""; img.src = item.src;
    img.onerror = () => { img.onerror = null; img.src = placeholder(item.title); };
    const cap = document.createElement("span"); cap.textContent = item.title;
    b.append(img, cap);
    b.onclick = () => { picked.has(item.id) ? picked.delete(item.id) : picked.add(item.id); renderGallery(); updateSummary(); };
    g.appendChild(b);
  });
  const add = document.createElement("button");
  add.type = "button"; add.className = "tile addtile"; add.textContent = "+ Add photo";
  add.onclick = () => $("upload").click();
  g.appendChild(add);
}
$("upload").onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const title = (prompt("Short name for this style") || file.name.replace(/\.\w+$/, "")).trim();
  const id = "u" + Date.now();
  gallery.push({ id, title, src: URL.createObjectURL(file) });
  picked.add(id); e.target.value = "";
  renderGallery(); updateSummary();
};

/* ---------- send ---------- */
function filled() {
  return sections.map(s => ({
    name: s.name,
    rows: s.fields.filter(f => f.label.trim() && String(f.value).trim() !== "")
  })).filter(s => s.rows.length);
}
function updateSummary() {
  const n = filled().reduce((a, s) => a + s.rows.length, 0);
  $("summary").textContent = `${n} measurement${n === 1 ? "" : "s"} · ${picked.size} style${picked.size === 1 ? "" : "s"}`;
}
function buildMessage() {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  let m = `*${settings.brand}* – Measurement sheet\nDesigner: ${settings.designer}\nCustomer: *${$("customer").value.trim()}*\nDate: ${date}\n`;
  filled().forEach(s => {
    m += `\n*${s.name}*\n` + s.rows.map(r => `${r.label}: ${r.value} ${unit}`).join("\n") + "\n";
  });
  const styles = gallery.filter(x => picked.has(x.id)).map(x => "• " + x.title);
  if (styles.length) m += `\n*Styles chosen*\n${styles.join("\n")}\n`;
  const notes = $("notes").value.trim();
  if (notes) m += `\n*Notes*\n${notes}\n`;
  return m;
}
function toast(t) {
  const el = $("toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2800);
}
$("send").onclick = () => {
  if (!$("customer").value.trim()) { $("customer").focus(); return toast("Enter the customer's name first."); }
  if (!filled().length) return toast("Fill in at least one measurement.");
  if (!settings.whatsapp) { toast("Add your WhatsApp number in Brand settings."); return $("openSettings").click(); }
  window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(buildMessage())}`, "_blank");
};

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

applyBrand(); renderTabs(); renderPanel(); renderGallery(); updateSummary();
