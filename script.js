/* ---------- EDIT THESE DEFAULTS ---------- */
const DEFAULTS = {
  brand: "Dave's Atelier",
  designer: "David",
  whatsapp: "2349066429559",   // country code, no +
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

// Typical adult ranges in INCHES. Outside this, the field gets a gentle "check this?" hint.
const RANGES = {
  "neck": [11, 24], "shoulder": [12, 26], "chest": [26, 70], "waist": [22, 70],
  "sleeve length": [14, 36], "round sleeve": [7, 24], "top length": [18, 50],
  "hip": [26, 70], "thigh": [14, 40], "knee": [10, 30], "length": [24, 52],
  "bottom": [6, 24], "crotch": [18, 40],
  "head circumference": [18, 27], "front to back": [8, 20], "depth": [3, 10]
};
/* ----------------------------------------- */

const $ = id => document.getElementById(id);
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const lsDel = k => { try { localStorage.removeItem(k); } catch {} };

const store = {
  get() { try { return { ...DEFAULTS, ...JSON.parse(lsGet("ms-settings")) }; } catch { return { ...DEFAULTS }; } },
  set(v) { lsSet("ms-settings", JSON.stringify(v)); }
};

let settings = store.get();
let unit = "in";
let active = 0;
const picked = new Set();
const gallery = GALLERY.slice();
const freshSections = () => START_SECTIONS.map(s => ({
  name: s.name, fixed: s.fixed,
  fields: s.fields.map(l => ({ label: l, value: "", custom: false }))
}));
const sections = freshSections();
const flashKeys = new Set();

/* ---------- branding ---------- */
function applyBrand() {
  $("brandName").textContent = settings.brand;
  $("designerLine").textContent = "by " + settings.designer;
  document.title = settings.brand + " · Measurement sheet";
  document.documentElement.style.setProperty("--brand", settings.color);
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute("content", settings.color);
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

/* ---------- draft (auto-save so a refresh or phone call never loses work) ---------- */
let saveTimer;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 300); }
function saveDraft() {
  lsSet("ms-draft", JSON.stringify({
    customer: $("customer").value, notes: $("notes").value, unit, active,
    picked: [...picked].filter(id => GALLERY.some(g => g.id === id)),
    sections
  }));
}
function restoreDraft() {
  let d; try { d = JSON.parse(lsGet("ms-draft")); } catch { d = null; }
  if (!d || !Array.isArray(d.sections) || !d.sections.length) return false;
  unit = d.unit === "cm" ? "cm" : "in";
  sections.length = 0;
  d.sections.forEach(s => sections.push({
    name: String(s.name || "Section"), fixed: !!s.fixed,
    fields: (Array.isArray(s.fields) ? s.fields : []).map(f => ({
      label: String(f.label || ""), value: String(f.value ?? ""), custom: !!f.custom
    }))
  }));
  active = Math.min(Math.max(d.active | 0, 0), sections.length - 1);
  (d.picked || []).forEach(id => picked.add(id));
  $("customer").value = d.customer || "";
  $("notes").value = d.notes || "";
  return !!(d.customer || d.notes || picked.size || sections.some(s => s.fields.some(f => String(f.value).trim())));
}
document.addEventListener("input", scheduleSave);
document.addEventListener("change", scheduleSave);
document.addEventListener("click", scheduleSave);

/* ---------- unit ---------- */
function setUnitUI() {
  [...$("unitSeg").children].forEach(x => x.classList.toggle("on", x.dataset.unit === unit));
}
function roundTo(n, to) { return to === "in" ? Math.round(n * 4) / 4 : Math.round(n * 10) / 10; }
function convertAll(from, to) {
  const k = from === "in" ? 2.54 : 1 / 2.54;
  sections.forEach(s => s.fields.forEach(f => {
    const n = parseFloat(f.value);
    if (!isNaN(n)) f.value = String(roundTo(n * k, to));
  }));
}
$("unitSeg").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.dataset.unit === unit) return;
  stopVoice();
  const to = b.dataset.unit;
  const hadValues = sections.some(s => s.fields.some(f => String(f.value).trim()));
  convertAll(unit, to);
  unit = to;
  setUnitUI(); renderPanel();
  if (hadValues) toast("Values converted to " + (to === "in" ? "inches" : "cm") + ".");
});

/* ---------- measurements ---------- */
function renderTabs() {
  $("tabs").innerHTML = "";
  sections.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab" + (i === active ? " on" : "");
    b.textContent = s.name;
    b.onclick = () => { stopVoice(); active = i; renderTabs(); renderPanel(); };
    $("tabs").appendChild(b);
  });
  const add = document.createElement("button");
  add.type = "button"; add.className = "tab add"; add.textContent = "+ Add section";
  add.onclick = () => {
    const name = (prompt("Name of the new section (e.g. Agbada, Waistcoat)") || "").trim();
    if (!name) return;
    stopVoice();
    sections.push({ name, fixed: false, fields: [{ label: "", value: "", custom: true }] });
    active = sections.length - 1; renderTabs(); renderPanel();
  };
  $("tabs").appendChild(add);
}

function checkRange(w, f) {
  const note = w.querySelector(".note");
  const n = parseFloat(f.value);
  const r = RANGES[String(f.label).trim().toLowerCase()];
  let msg = "";
  if (!f.custom && r && !isNaN(n) && n > 0) {
    const k = unit === "in" ? 1 : 2.54;
    const lo = Math.round(r[0] * k), hi = Math.round(r[1] * k);
    if (n < lo || n > hi) msg = `Usually ${lo}–${hi} ${unit}. Check?`;
  }
  w.classList.toggle("warn", !!msg);
  note.textContent = msg;
}

function focusFirstInput() {
  const el = document.querySelector("#panel .m input:not(.lab), #panel .m .lab");
  if (el) el.focus();
}

function renderPanel() {
  const s = sections[active], p = $("panel");
  p.innerHTML = '<div class="grid"></div><div class="panelfoot"></div>';
  const grid = p.firstChild;
  const step = unit === "in" ? "0.25" : "0.1";
  s.fields.forEach((f, i) => {
    const w = document.createElement("div"); w.className = "m";
    if (flashKeys.has(active + ":" + i)) w.classList.add("flash");
    const label = f.custom
      ? `<input class="lab" type="text" placeholder="Measurement name" value="${esc(f.label)}">`
      : `<span>${esc(f.label)}</span>`;
    w.innerHTML = `${label}<div class="val"><input type="number" inputmode="decimal" enterkeyhint="next" min="0" step="${step}" value="${esc(f.value)}"><span class="u">${unit}</span></div>` +
      (f.custom ? '<button class="x" type="button" aria-label="Remove">×</button>' : "") +
      '<small class="note" aria-live="polite"></small>';
    const num = w.querySelector(".val input");
    const lab = w.querySelector(".lab");
    if (lab) lab.oninput = () => { f.label = lab.value; };
    num.oninput = () => { f.value = num.value; updateSummary(); checkRange(w, f); };
    checkRange(w, f);
    const x = w.querySelector(".x");
    if (x) x.onclick = () => { stopVoice(); s.fields.splice(i, 1); renderPanel(); updateSummary(); };
    grid.appendChild(w);
  });
  setTimeout(() => flashKeys.clear(), 1600);

  const foot = p.lastChild;
  const addF = document.createElement("button");
  addF.type = "button"; addF.className = "ghost"; addF.textContent = "+ Add measurement";
  addF.onclick = () => { stopVoice(); s.fields.push({ label: "", value: "", custom: true }); renderPanel(); };
  foot.appendChild(addF);
  if (!s.fixed) {
    const d = document.createElement("button");
    d.type = "button"; d.className = "ghost del"; d.textContent = "Remove this section";
    d.onclick = () => { stopVoice(); sections.splice(active, 1); active = 0; renderTabs(); renderPanel(); updateSummary(); };
    foot.appendChild(d);
  }
}

// Enter / "Next" on the keyboard jumps to the next box (and on to the next section).
$("panel").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.matches("input")) return;
  e.preventDefault();
  if (e.target.classList.contains("lab")) {
    const sib = e.target.closest(".m").querySelector(".val input");
    if (sib) { sib.focus(); sib.select(); }
    return;
  }
  const list = [...document.querySelectorAll("#panel .val input")];
  const next = list[list.indexOf(e.target) + 1];
  if (next) { next.focus(); next.select(); return; }
  if (active < sections.length - 1) {
    stopVoice(); active++; renderTabs(); renderPanel(); focusFirstInput();
  } else $("notes").focus();
});

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

/* ---------- new customer ---------- */
$("newCustomer").onclick = () => {
  const dirty = $("customer").value.trim() || $("notes").value.trim() || picked.size ||
    sections.some(s => s.fields.some(f => String(f.value).trim()));
  if (dirty && !confirm("Start a new customer? This clears the form.")) return;
  stopVoice(); closeHeard();
  sections.length = 0; sections.push(...freshSections());
  active = 0; picked.clear();
  gallery.length = 0; gallery.push(...GALLERY);
  $("customer").value = ""; $("notes").value = "";
  lsDel("ms-draft");
  renderTabs(); renderPanel(); renderGallery(); updateSummary();
  $("customer").focus();
  toast("Ready for a new customer.");
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

/* ---------- voice ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;          // current recognizer
let voiceMode = null;    // "dictate" | "guide" | null
let guide = null;        // { s: section index, i: field index }
let pending = [];        // measurements heard, waiting for the tailor to confirm

function makeRec(continuous) {
  const r = new SR();
  r.lang = "en-NG";
  r.interimResults = true;
  r.continuous = continuous;
  r.maxAlternatives = 1;
  return r;
}
function showStatus(t) { const el = $("voiceStatus"); el.textContent = t; el.hidden = false; }
function hideStatus() { $("voiceStatus").hidden = true; }
function setMicUI() {
  $("micDictate").setAttribute("aria-pressed", voiceMode === "dictate");
  $("micGuide").setAttribute("aria-pressed", voiceMode === "guide");
  $("micDictate").querySelector("b").textContent = voiceMode === "dictate" ? "Stop" : "Dictate";
  $("micGuide").querySelector("b").textContent = voiceMode === "guide" ? "Stop guide" : "Guide me";
}
function clearListening() {
  document.querySelectorAll("#panel .m.listening").forEach(el => el.classList.remove("listening"));
}
function stopVoice() {
  const was = voiceMode;
  voiceMode = null; guide = null;
  if (rec) { try { rec.abort(); } catch {} rec = null; }
  if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch {} }
  if (SR) { setMicUI(); hideStatus(); clearListening(); }
  return was;
}
function voiceError(ev) {
  const e = ev && ev.error;
  if (e === "no-speech" || e === "aborted") return;
  stopVoice();
  if (e === "not-allowed" || e === "service-not-allowed") toast("Microphone is blocked. Allow it in your browser's site settings.");
  else if (e === "network") toast("Voice needs an internet connection.");
  else if (e === "audio-capture") toast("No microphone found.");
  else toast("Voice stopped. You can keep typing.");
}

/* Dictate: say several measurements, then confirm what was heard. */
function toggleDictate() {
  if (voiceMode === "dictate" && rec) { rec.stop(); return; }
  stopVoice(); closeHeard();
  voiceMode = "dictate"; setMicUI();
  let text = "";
  const me = rec = makeRec(true);
  me.onresult = e => {
    text = [...e.results].map(r => r[0].transcript).join(" ");
    showStatus("Listening… " + text);
  };
  me.onerror = voiceError;
  me.onend = () => {
    const wasDictating = voiceMode === "dictate";
    if (rec === me) rec = null;
    if (!wasDictating) return;
    voiceMode = null; setMicUI(); hideStatus();
    if (text.trim()) showHeard(text); else toast("Didn't hear anything. Try again.");
  };
  showStatus("Listening… say e.g. “chest forty two, waist thirty four and a half”. Tap Stop when done.");
  try { me.start(); } catch { stopVoice(); }
}

function closeHeard() { pending = []; $("heard").hidden = true; $("heard").innerHTML = ""; }
function showHeard(text) {
  const segs = VoiceParse.parseDictation(text);
  const { matched, unmatched } = VoiceParse.resolve(segs, sections, active);
  pending = matched;
  const h = $("heard");
  let html = `<p class="heardtext">Heard: “${esc(text.trim())}”</p>`;
  if (matched.length) {
    html += "<ul>" + heardItems() + "</ul>";
  } else {
    html += '<p class="miss">Couldn\'t match any measurement. Try “chest 42, waist 34”.</p>';
  }
  if (unmatched.length) {
    html += `<p class="miss">Not matched: ${unmatched.map(u => esc(u.label + " " + u.value)).join(", ")}</p>`;
  }
  html += '<div class="row end"><button class="ghost" type="button" data-act="cancel">' + (matched.length ? "Cancel" : "Close") + "</button>" +
    (matched.length ? `<button class="primary" type="button" data-act="apply">Apply ${matched.length}</button>` : "") + "</div>";
  h.innerHTML = html; h.hidden = false;
}
function applyHeard() {
  const items = pending.filter(m => sections[m.s] && sections[m.s].fields[m.f]);
  if (!items.length) return closeHeard();
  items.forEach(m => {
    sections[m.s].fields[m.f].value = String(m.value);
    flashKeys.add(m.s + ":" + m.f);
  });
  if (!items.some(m => m.s === active)) active = items[0].s;
  closeHeard();
  renderTabs(); renderPanel(); updateSummary(); scheduleSave();
  toast(`Filled ${items.length} measurement${items.length === 1 ? "" : "s"}.`);
}
$("heard").addEventListener("click", e => {
  const x = e.target.closest(".x2");
  if (x) { pending.splice(+x.dataset.i, 1); return showHeardFromPending(); }
  const act = e.target.closest("[data-act]");
  if (!act) return;
  act.dataset.act === "apply" ? applyHeard() : closeHeard();
});
function heardItems() {
  return pending.map((m, i) =>
    `<li><span>${esc(sections[m.s].name)} · ${esc(sections[m.s].fields[m.f].label)}</span><strong>${m.value} ${unit}</strong>` +
    `<button class="x2" type="button" data-i="${i}" aria-label="Remove this one">×</button></li>`).join("");
}
function showHeardFromPending() {
  if (!pending.length) return closeHeard();
  const h = $("heard");
  h.querySelector("ul").innerHTML = heardItems();
  const btn = h.querySelector('[data-act="apply"]');
  if (btn) btn.textContent = "Apply " + pending.length;
}

/* Guide me: the app goes field by field, you just say the number. */
function speak(text, done) {
  if (!$("speakToggle").checked || !window.speechSynthesis) return done();
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  } catch { done(); }
}
function toggleGuide() {
  if (voiceMode === "guide") { stopVoice(); return; }
  stopVoice(); closeHeard();
  voiceMode = "guide"; guide = { s: active, i: 0 }; setMicUI();
  guideAsk();
}
function guideAsk() {
  if (voiceMode !== "guide") return;
  const s = sections[guide.s];
  while (guide.i < s.fields.length && !s.fields[guide.i].label.trim()) guide.i++;
  if (guide.i >= s.fields.length) { stopVoice(); toast(`${s.name} done. Check the numbers, then Send.`); return; }
  const f = s.fields[guide.i];
  const cards = [...document.querySelectorAll("#panel .m")];
  cards.forEach((el, i) => el.classList.toggle("listening", i === guide.i));
  if (cards[guide.i]) cards[guide.i].scrollIntoView({ block: "center", behavior: "smooth" });
  showStatus(`${s.name} · ${f.label}? Say the number. Or say “skip”, “back”, “stop”.`);
  speak(f.label, guideListen);
}
function guideListen() {
  if (voiceMode !== "guide") return;
  let heard = "";
  const me = rec = makeRec(false);
  me.onresult = e => {
    const r = e.results[e.results.length - 1];
    if (r.isFinal) heard = r[0].transcript;
    else showStatus("Hearing… " + r[0].transcript);
  };
  me.onerror = voiceError;
  me.onend = () => {
    if (rec === me) rec = null;
    if (voiceMode !== "guide") return;
    if (heard) guideHandle(heard); else guideListen();
  };
  try { me.start(); } catch { stopVoice(); }
}
function guideHandle(text) {
  const s = sections[guide.s];
  const cmd = VoiceParse.guideCommand(text);
  if (cmd.type === "stop") { stopVoice(); return; }
  if (cmd.type === "number") {
    const f = s.fields[guide.i];
    f.value = String(cmd.value);
    const label = f.label;
    guide.i++;
    renderPanel(); updateSummary(); scheduleSave();
    toast(`${label}: ${cmd.value} ${unit}`);
  } else if (cmd.type === "skip") {
    guide.i++;
  } else if (cmd.type === "back") {
    guide.i = Math.max(0, guide.i - 1);
    while (guide.i > 0 && !s.fields[guide.i].label.trim()) guide.i--;
  } else {
    toast("Didn't catch that. Say just the number.");
  }
  setTimeout(guideAsk, 150);
}

if (SR) {
  $("voicebar").hidden = false;
  $("micDictate").onclick = toggleDictate;
  $("micGuide").onclick = toggleGuide;
  $("speakToggle").checked = lsGet("ms-speak") !== "0";
  $("speakToggle").onchange = () => lsSet("ms-speak", $("speakToggle").checked ? "1" : "0");
} else {
  $("voiceHint").hidden = false;
}

/* ---------- install + offline ---------- */
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); installEvt = e; $("install").hidden = false;
});
$("install").onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch {}
  installEvt = null; $("install").hidden = true;
};
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

/* ---------- start ---------- */
const restored = restoreDraft();
applyBrand(); setUnitUI(); renderTabs(); renderPanel(); renderGallery(); updateSummary();
if (restored) toast("Restored your unfinished sheet.");
