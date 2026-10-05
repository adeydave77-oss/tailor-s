/* Turns spoken text into measurements. Pure functions, no DOM.
   Handles: "chest forty two, waist thirty four and a half", "sleeve 23 3/4",
   "round sleeve fifteen point five", "trouser waist 30". */
(function (root) {
  "use strict";

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const round2 = n => Math.round(n * 100) / 100;

  const ONES = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
    eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19 };
  const TENS = { twenty:20, thirty:30, forty:40, fourty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
  const DIGITWORDS = { zero:"0", oh:"0", one:"1", two:"2", three:"3", four:"4", five:"5", six:"6", seven:"7", eight:"8", nine:"9" };
  const NUMERATORS = { a:1, an:1, one:1, two:2, three:3, five:5, seven:7 };
  const DENOMS = { half:2, halves:2, quarter:4, quarters:4, eighth:8, eighths:8 };
  const FILLER = new Set(["and","inches","inch","in","cm","cms","centimeter","centimeters","centimetre","centimetres",
    "is","the","my","uh","um","okay","ok","then","next","for","its","it's","at","size","measurement","measure"]);

  // Other ways a tailor might say each measurement (keyed by the field label, lowercase).
  const ALIASES = {
    "neck": ["neck", "collar"],
    "shoulder": ["shoulder", "shoulders"],
    "chest": ["chest", "bust"],
    "waist": ["waist"],
    "sleeve length": ["sleeve length", "sleeve", "long sleeve", "arm length"],
    "round sleeve": ["round sleeve", "bicep", "biceps", "arm round", "sleeve round", "round arm"],
    "top length": ["top length", "shirt length", "length of top", "length of shirt", "length"],
    "hip": ["hip", "hips", "seat"],
    "thigh": ["thigh", "thighs"],
    "knee": ["knee", "knees"],
    "length": ["length", "trouser length", "trousers length", "pants length"],
    "bottom": ["bottom", "ankle", "hem", "cuff"],
    "crotch": ["crotch", "rise"],
    "head circumference": ["head circumference", "head", "circumference", "cap size"],
    "front to back": ["front to back", "front back"],
    "depth": ["depth"]
  };
  const SECTION_KW = { top: ["top", "shirt"], trousers: ["trouser", "trousers", "pants"], cap: ["cap", "hat"] };

  function normalize(text) {
    return String(text || "").toLowerCase()
      .replace(/½/g, " and a half ").replace(/¼/g, " and a quarter ")
      .replace(/¾/g, " and three quarters ").replace(/⅛/g, " and an eighth ")
      .replace(/(\d+)\s*\/\s*(\d+)/g, (m, a, b) => " and " + a + " " + ({ 2: "half", 4: "quarter", 8: "eighth" }[b] || "") + " ")
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/(\d)(inches|inch|in|cm)\b/g, "$1 $2")
      .replace(/[-–—]/g, " ")
      .replace(/\.(?!\d)/g, " ")
      .replace(/[^a-z0-9.\s']/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b(and )+/g, "and ")
      .trim();
  }

  function parseNumberAt(tk, i) {
    const t = tk[i];
    if (t === undefined) return null;
    let v, j, hasDec = false;
    if (/^(\d+(\.\d+)?|\.\d+)$/.test(t)) { v = parseFloat(t); j = i + 1; hasDec = t.indexOf(".") >= 0; }
    else if (has(TENS, t)) {
      v = TENS[t]; j = i + 1;
      const n = tk[j];
      if (n !== undefined && has(ONES, n) && ONES[n] >= 1 && ONES[n] <= 9) { v += ONES[n]; j++; }
    }
    else if (has(ONES, t)) { v = ONES[t]; j = i + 1; }
    else return null;

    // "thirty four point five"
    if (!hasDec && (tk[j] === "point" || tk[j] === "dot")) {
      let k = j + 1, digits = "";
      while (k < tk.length && (/^\d+$/.test(tk[k]) || has(DIGITWORDS, tk[k]))) {
        digits += has(DIGITWORDS, tk[k]) ? DIGITWORDS[tk[k]] : tk[k];
        k++;
      }
      if (digits) return { value: round2(parseFloat(v + "." + digits)), next: k };
    }

    // "and a half", "three quarters", "one eighth"
    if (!hasDec) {
      let k = j;
      if (tk[k] === "and") k++;
      let num = 1, den = null;
      if (has(DENOMS, tk[k])) { den = DENOMS[tk[k]]; k++; }
      else if ((has(NUMERATORS, tk[k]) || /^\d$/.test(tk[k] || "")) && has(DENOMS, tk[k + 1])) {
        num = has(NUMERATORS, tk[k]) ? NUMERATORS[tk[k]] : parseInt(tk[k], 10);
        den = DENOMS[tk[k + 1]]; k += 2;
      }
      if (den && num < den) return { value: round2(v + num / den), next: k };
    }
    return { value: round2(v), next: j };
  }

  function firstNumber(text) {
    const tk = normalize(text).split(" ");
    for (let i = 0; i < tk.length; i++) {
      const r = parseNumberAt(tk, i);
      if (r) return r.value;
    }
    return null;
  }

  // "chest 42 waist 34.5" -> [{label:"chest", value:42}, {label:"waist", value:34.5}]
  function parseDictation(text) {
    const tk = normalize(text).split(" ").filter(Boolean);
    const out = [];
    let label = [];
    for (let i = 0; i < tk.length;) {
      const r = parseNumberAt(tk, i);
      if (r) {
        if (label.length) out.push({ label: label.join(" "), value: r.value });
        label = [];
        i = r.next;
      } else {
        if (!FILLER.has(tk[i])) label.push(tk[i]);
        i++;
      }
    }
    return out;
  }

  function sectionKeywords(name) {
    const n = String(name || "").toLowerCase().trim();
    if (has(SECTION_KW, n)) return SECTION_KW[n];
    return n.split(/\s+/).filter(w => w.length > 2);
  }
  function aliasesFor(label) {
    const l = String(label || "").toLowerCase().trim();
    const list = has(ALIASES, l) ? ALIASES[l].slice() : [];
    if (l && list.indexOf(l) < 0) list.push(l);
    return list;
  }

  // Finds which field a spoken label means. Saying the section ("trouser waist") wins;
  // otherwise it prefers the section you're already working in.
  function matchField(label, sections, current) {
    const padded = " " + String(label).trim() + " ";
    let best = null;
    sections.forEach((sec, s) => {
      const secBonus = sectionKeywords(sec.name).some(k => padded.indexOf(" " + k + " ") >= 0) ? 25 : 0;
      sec.fields.forEach((fld, f) => {
        if (!String(fld.label).trim()) return;
        aliasesFor(fld.label).forEach(al => {
          if (padded.indexOf(" " + al + " ") < 0) return;
          const score = al.split(" ").length * 10 + al.length + secBonus + (s === current ? 5 : 0);
          if (!best || score > best.score) best = { s: s, f: f, score: score };
        });
      });
    });
    return best;
  }

  function resolve(segments, sections, active) {
    const matched = new Map(), unmatched = [];
    let current = active;
    segments.forEach(seg => {
      const hit = seg.value > 0 ? matchField(seg.label, sections, current) : null;
      if (hit) {
        current = hit.s;
        matched.set(hit.s + ":" + hit.f, { s: hit.s, f: hit.f, value: seg.value });
      } else unmatched.push(seg);
    });
    return { matched: Array.from(matched.values()), unmatched: unmatched };
  }

  // Guided mode: one answer per field.
  function guideCommand(text) {
    const n = firstNumber(text);
    if (n !== null && n > 0) return { type: "number", value: n };
    const t = " " + normalize(text) + " ";
    if (/ (skip|pass|next|leave it) /.test(t)) return { type: "skip" };
    if (/ (back|previous|before|redo|again|repeat) /.test(t)) return { type: "back" };
    if (/ (stop|done|finish|finished|end|cancel|exit|quit) /.test(t)) return { type: "stop" };
    return { type: "unknown" };
  }

  const api = { normalize, firstNumber, parseDictation, matchField, resolve, guideCommand };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VoiceParse = api;
})(typeof window !== "undefined" ? window : globalThis);
