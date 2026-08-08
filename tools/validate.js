#!/usr/bin/env node
// validate.js — the correctness gate. Run before every commit:
//   node tools/validate.js
//
// Phase A: schema — every chord has exactly strings 6..1, sane actions,
//          named fingers, permanent ids; movable shapes have one anchor.
// Phase B: music — recompute the real pitches from string + fret and prove
//          each chord spells its declared quality, has the right bass note,
//          and each movable role sounds the interval it claims.
// Phase C: render lint — render every item under all 9 settings combinations;
//          no throws, per-string always has 6 lines, no banned symbols or
//          direction words, deterministic output.
// Phase D: all-roots sweep — every movable shape at every root, at every
//          position the finder would offer, music-checked and lint-checked.
// Phase E: fretboard lines — the generated note tables, linted the same way.
// Phase F: tuner — prove the pitch detector on synthesized waves and the
//          announcement gates on scripted timelines; lint every tuner phrase.
"use strict";

const path = require("path");

// Load the site's own files (classic scripts assigning to globalThis.AGR).
[
  ["data", "notes.js"],
  ["data", "open-chords.js"],
  ["data", "power-chords.js"],
  ["data", "triads.js"],
  ["data", "barre-chords.js"],
  ["data", "octaves.js"],
  ["js", "settings.js"],
  ["js", "pitch.js"],
  ["js", "renderer.js"]
].forEach((parts) => require(path.join(__dirname, "..", ...parts)));

const AGR = globalThis.AGR;

let errors = 0;
let warnings = 0;

function error(context, message) {
  errors += 1;
  console.error("ERROR  " + context + ": " + message);
}

function warn(context, message) {
  warnings += 1;
  console.warn("warn   " + context + ": " + message);
}

const FINGERS = ["index", "middle", "ring", "pinky", "thumb"];
const FINGER_RANK = { index: 1, middle: 2, ring: 3, pinky: 4 };
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const fixedChords = [...AGR.openChords, ...AGR.powerChords];
const shapes = [...AGR.powerShapes, ...AGR.triadShapes, ...AGR.barreShapes, ...AGR.octaveShapes];

// ---------- Phase A: schema ----------

function checkStringsArray(context, item, movable) {
  const strings = item.strings;
  if (!Array.isArray(strings) || strings.length !== 6) {
    error(context, "strings must be an array of exactly 6 entries");
    return;
  }
  strings.forEach((entry, i) => {
    const expected = 6 - i;
    if (entry.string !== expected) {
      error(context, `entry ${i} must be string ${expected}, found ${entry.string}`);
    }
    if (!["mute", "open", "fret"].includes(entry.action)) {
      error(context, `string ${entry.string} has unknown action "${entry.action}"`);
      return;
    }
    if (entry.action === "fret") {
      if (!FINGERS.includes(entry.finger)) {
        error(context, `string ${entry.string} has unknown finger "${entry.finger}"`);
      }
      if (movable) {
        if (!Number.isInteger(entry.offset)) {
          error(context, `string ${entry.string} needs an integer offset`);
        }
        if (!(entry.role in AGR.roleInterval)) {
          error(context, `string ${entry.string} has unknown role "${entry.role}"`);
        }
      } else if (!Number.isInteger(entry.fret) || entry.fret < 1 || entry.fret > 15) {
        error(context, `string ${entry.string} fret must be an integer 1 to 15 (use action "open" for fret 0)`);
      }
    } else if ("fret" in entry || "finger" in entry || "offset" in entry) {
      error(context, `string ${entry.string} is ${entry.action} but carries fret or finger data`);
    }
  });
}

const seenIds = new Set();

function checkCommon(context, item) {
  if (!ID_PATTERN.test(item.id || "")) error(context, `bad id "${item.id}"`);
  if (seenIds.has(item.id)) error(context, `duplicate id "${item.id}"`);
  seenIds.add(item.id);
  if (!item.name) error(context, "missing name");
  if (!(item.quality in AGR.qualities)) error(context, `unknown quality "${item.quality}"`);
}

fixedChords.forEach((chord) => {
  const context = "chord " + (chord.id || "?");
  checkCommon(context, chord);
  if (!(chord.root in AGR.pitchClass)) error(context, `unknown root "${chord.root}"`);
  checkStringsArray(context, chord, false);
});

shapes.forEach((shape) => {
  const context = "shape " + (shape.id || "?");
  checkCommon(context, shape);
  checkStringsArray(context, shape, true);
  const anchors = shape.strings.filter((e) => e.anchor);
  if (anchors.length !== 1) {
    error(context, `must have exactly one anchor, found ${anchors.length}`);
  } else {
    if (anchors[0].offset !== 0) error(context, "anchor offset must be 0");
    if (anchors[0].role !== "root") error(context, "anchor role must be root");
  }
  if (!["root", "first", "second"].includes(shape.inversion)) {
    error(context, `unknown inversion "${shape.inversion}"`);
  }
  (shape.barres || []).forEach((b, i) => {
    const bc = `${context} barre ${i}`;
    if (!FINGERS.includes(b.finger)) error(bc, `unknown finger "${b.finger}"`);
    if (!Number.isInteger(b.offset)) error(bc, "needs an integer offset");
    if (!Number.isInteger(b.fromString) || !Number.isInteger(b.toString) ||
        b.fromString <= b.toString || b.fromString > 6 || b.toString < 1) {
      error(bc, "span must run from a thicker string to a thinner string");
      return;
    }
    const inSpan = shape.strings.filter((e) => e.string <= b.fromString && e.string >= b.toString);
    inSpan.forEach((e) => {
      if (e.action === "open") error(bc, `string ${e.string} is open inside the barre span`);
      if (e.action === "fret" && e.offset < b.offset) error(bc, `string ${e.string} is fretted behind the barre`);
    });
    const covered = inSpan.filter((e) =>
      e.action === "fret" && e.finger === b.finger && e.offset === b.offset);
    if (covered.length < 2) error(bc, "a barre should cover at least two sounding strings");
  });
  if (!Array.isArray(shape.examples) || shape.examples.length === 0) {
    error(context, "needs at least one example");
    return;
  }
  const offsets = shape.strings.filter((e) => e.action === "fret").map((e) => e.offset);
  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  if (Array.isArray(shape.fretRange) && shape.fretRange[0] + minOffset < 1) {
    error(context, "fretRange lower bound produces a fret lower than 1");
  }
  shape.examples.forEach((ex) => {
    const exContext = `${context} example ${ex.root}@${ex.anchorFret}`;
    if (!(ex.root in AGR.pitchClass)) error(exContext, `unknown root "${ex.root}"`);
    if (!Number.isInteger(ex.anchorFret)) error(exContext, "anchorFret must be an integer");
    if (ex.anchorFret + minOffset < 1) error(exContext, "produces a fret lower than 1");
    if (ex.anchorFret + maxOffset > 15) error(exContext, "produces a fret higher than 15");
    if (Array.isArray(shape.fretRange) &&
        (ex.anchorFret < shape.fretRange[0] || ex.anchorFret > shape.fretRange[1])) {
      error(exContext, `anchorFret outside declared fretRange [${shape.fretRange}]`);
    }
  });
});

// ---------- Phase B: music ----------

function soundingMidis(chord) {
  return chord.strings
    .filter((e) => e.action !== "mute")
    .map((e) => AGR.tuning.stringMidi[e.string] + (e.action === "open" ? 0 : e.fret));
}

function checkMusic(context, chord, options) {
  const rootPc = AGR.pitchClass[chord.root];
  if (rootPc === undefined) return;
  const quality = AGR.qualities[chord.quality];
  if (!quality) return;
  const midis = soundingMidis(chord);
  if (midis.length === 0) {
    error(context, "no sounding strings");
    return;
  }
  const intervals = midis.map((m) => ((m % 12) - rootPc + 12) % 12);
  const present = new Set(intervals);
  quality.required.forEach((interval) => {
    if (!present.has(interval)) {
      error(context, `missing required interval ${interval} for ${chord.quality}`);
    }
  });
  const allowed = new Set([...quality.required, ...quality.optional]);
  present.forEach((interval) => {
    if (!allowed.has(interval)) {
      error(context, `sounds interval ${interval}, which is not part of ${chord.quality}`);
    }
  });
  const bassInterval = intervals[0];
  if (options.expectBass === "root" && bassInterval !== 0) {
    error(context, `lowest note should be the root, found interval ${bassInterval}`);
  }
  if (options.expectBass === "inversion") {
    const expected = {
      root: [0],
      first: chord.quality === "minor" ? [3] : [4],
      second: [7]
    }[chord.inversion];
    if (!expected || !expected.includes(bassInterval)) {
      error(context, `inversion "${chord.inversion}" expects bass interval ${expected}, found ${bassInterval}`);
    }
  }
}

function checkFingerOrder(context, chord) {
  const fretted = chord.strings.filter((e) => e.action === "fret" && e.finger in FINGER_RANK);
  fretted.forEach((a) => {
    fretted.forEach((b) => {
      if (FINGER_RANK[a.finger] < FINGER_RANK[b.finger] && a.fret > b.fret) {
        warn(context, `${a.finger} sits at fret ${a.fret}, past ${b.finger} at fret ${b.fret}; double-check the fingering`);
      }
    });
  });
}

fixedChords.forEach((chord) => {
  const context = "chord " + chord.id;
  checkMusic(context, chord, { expectBass: "root" });
  checkFingerOrder(context, chord);
});

shapes.forEach((shape) => {
  shape.examples.forEach((ex) => {
    const context = `shape ${shape.id} example ${ex.root}@${ex.anchorFret}`;
    const chord = AGR.render.instantiateShape(shape, ex);
    checkMusic(context, chord, { expectBass: "inversion" });
    checkFingerOrder(context, chord);
    // Each fretted entry must sound the interval its declared role claims.
    const rootPc = AGR.pitchClass[ex.root];
    shape.strings.forEach((entry) => {
      if (entry.action !== "fret") return;
      const midi = AGR.tuning.stringMidi[entry.string] + ex.anchorFret + entry.offset;
      const interval = ((midi % 12) - rootPc + 12) % 12;
      if (!AGR.roleInterval[entry.role] || !AGR.roleInterval[entry.role].includes(interval)) {
        error(context, `string ${entry.string} declares role "${entry.role}" but sounds interval ${interval}`);
      }
    });
  });
});

// ---------- Phase C: render lint ----------

const FORMATS = ["per-string", "by-finger", "prose"];
const NAMINGS = ["both", "number", "name"];
const BANNED_GLYPHS = /[#♯♭]/; // "#", sharp sign, flat sign
const BANNED_WORDS = /\b(up|down|left|right)\b/i;

function collectText(desc) {
  const parts = [];
  if (desc.intro) parts.push(desc.intro);
  if (desc.barre) parts.push(desc.barre);
  if (desc.kind === "prose") {
    parts.push(desc.text);
  } else {
    parts.push(...(desc.lines || []));
    if (desc.strum) parts.push(desc.strum);
  }
  if (desc.tips) parts.push(desc.tips);
  return parts;
}

function lintDescription(context, desc, perStringExpected) {
  if (desc.kind === "list") {
    if (!Array.isArray(desc.lines) || desc.lines.length === 0) {
      error(context, "list description has no lines");
    }
    if (!desc.strum) error(context, "list description is missing strum guidance");
    if (perStringExpected && desc.lines.length !== 6) {
      error(context, `per-string format must have exactly 6 lines, found ${desc.lines.length}`);
    }
  } else if (desc.kind === "prose") {
    if (!desc.text) error(context, "prose description is empty");
  } else {
    error(context, `unknown kind "${desc.kind}"`);
  }
  collectText(desc).forEach((text) => {
    if (typeof text !== "string" || text.length === 0) {
      error(context, "empty text fragment");
      return;
    }
    if (BANNED_GLYPHS.test(text)) error(context, `banned symbol in: "${text}"`);
    if (BANNED_WORDS.test(text)) error(context, `banned direction word in: "${text}"`);
  });
}

function lintEverySetting(context, produce) {
  FORMATS.forEach((format) => {
    NAMINGS.forEach((naming) => {
      const settings = { format: format, stringNaming: naming };
      const comboContext = `${context} [${format}/${naming}]`;
      let first;
      let second;
      try {
        first = produce(settings);
        second = produce(settings);
      } catch (e) {
        error(comboContext, `renderer threw: ${e.message}`);
        return;
      }
      if (JSON.stringify(first) !== JSON.stringify(second)) {
        error(comboContext, "output is not deterministic");
      }
      lintDescription(comboContext, first, format === "per-string");
    });
  });
}

fixedChords.forEach((chord) => {
  lintEverySetting("chord " + chord.id, (s) => AGR.render.describeChord(chord, s));
});

shapes.forEach((shape) => {
  lintEverySetting(`shape ${shape.id} (relative)`, (s) => AGR.render.describeShapeRelative(shape, s));
  shape.examples.forEach((ex) => {
    const chord = AGR.render.instantiateShape(shape, ex);
    lintEverySetting(`shape ${shape.id} example ${ex.root}@${ex.anchorFret}`,
      (s) => AGR.render.describeChord(chord, s));
  });
});

// ---------- Phase D: all-roots sweep ----------
// Instantiate every movable shape at every one of the 12 roots, at every
// position the chord finder would compute, and prove the music and the
// rendered text of each. Also guarantees the finder always has at least one
// position to offer for any root.

let sweepCount = 0;
shapes.forEach((shape) => {
  for (let pc = 0; pc < 12; pc++) {
    const spelling = AGR.pcSpelling[pc];
    const frets = AGR.render.shapePositions(shape, pc);
    if (frets.length === 0) {
      error(`shape ${shape.id}`, `has no playable position for root ${spelling}`);
      continue;
    }
    frets.forEach((fret) => {
      sweepCount += 1;
      const context = `shape ${shape.id} sweep ${spelling}@${fret}`;
      const chord = AGR.render.instantiateShape(shape, { root: spelling, anchorFret: fret });
      checkMusic(context, chord, { expectBass: "inversion" });
      lintEverySetting(context, (s) => AGR.render.describeChord(chord, s));
    });
  }
});

// ---------- Phase E: fretboard guide lines ----------
// The note tables on fretboard.html are generated, so lint them like
// everything else: 13 lines per string, clean text, deterministic.

for (let s = 6; s >= 1; s--) {
  NAMINGS.forEach((naming) => {
    const context = `fretboard string ${s} [${naming}]`;
    let first;
    let second;
    try {
      first = AGR.render.fretboardStringLines(s, naming);
      second = AGR.render.fretboardStringLines(s, naming);
    } catch (e) {
      error(context, `renderer threw: ${e.message}`);
      return;
    }
    if (first.length !== 13) error(context, `expected 13 lines, found ${first.length}`);
    if (JSON.stringify(first) !== JSON.stringify(second)) error(context, "output is not deterministic");
    first.forEach((text) => {
      if (typeof text !== "string" || text.length === 0) {
        error(context, "empty line");
        return;
      }
      if (BANNED_GLYPHS.test(text)) error(context, `banned symbol in: "${text}"`);
      if (BANNED_WORDS.test(text)) error(context, `banned direction word in: "${text}"`);
    });
  });
}

// ---------- Phase F: tuner ----------
// The tuner page's engine is pure (js/pitch.js) and its words come from the
// renderer, so both are proven here: pitch detection on synthesized
// waveforms, the stability and announcement gates on scripted timelines,
// and (further below) every phrase linted like all other generated text.

let tunerDetectorCases = 0;
let tunerGatingChecks = 0;
let tunerPhraseTexts = 0;

const TUNER_RATES = [44100, 48000];
const OPEN_MIDIS = [40, 45, 50, 55, 59, 64];
const TUNER_BUFFER = 4096;

// A wave as the analyser would hand it over: a Float32Array holding the sum
// of the given partials ([multiple, weight] pairs), peak-scaled to amplitude.
function synthWave(freq, sampleRate, partials, amplitude) {
  const out = new Float32Array(TUNER_BUFFER);
  let peak = 0;
  for (let i = 0; i < TUNER_BUFFER; i++) {
    let v = 0;
    for (const [mult, weight] of partials) {
      v += weight * Math.sin((2 * Math.PI * freq * mult * i) / sampleRate);
    }
    out[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak > 0) {
    for (let i = 0; i < TUNER_BUFFER; i++) out[i] = (out[i] / peak) * amplitude;
  }
  return out;
}

// Deterministic noise (Park-Miller sequence): Math.random would make this
// gate flaky, and the validator must never be flaky.
function seededNoise(amplitude) {
  let seed = 123456789;
  const out = new Float32Array(TUNER_BUFFER);
  for (let i = 0; i < TUNER_BUFFER; i++) {
    seed = (seed * 48271) % 2147483647;
    out[i] = ((seed / 2147483647) * 2 - 1) * amplitude;
  }
  return out;
}

function expectDetect(context, wave, rate, expectedHz, toleranceCents) {
  tunerDetectorCases += 1;
  const first = AGR.pitch.detectFrequency(wave, rate);
  const second = AGR.pitch.detectFrequency(wave, rate);
  if (first !== second) error(context, "detection is not deterministic");
  if (first === null) {
    error(context, `expected ${expectedHz.toFixed(2)} hertz, got null`);
    return;
  }
  const off = Math.abs(1200 * Math.log2(first / expectedHz));
  if (off > toleranceCents) {
    error(context, `expected ${expectedHz.toFixed(2)} hertz, got ${first.toFixed(2)}` +
      ` (${off.toFixed(2)} cents off, tolerance ${toleranceCents})`);
  }
}

function expectNull(context, wave, rate) {
  tunerDetectorCases += 1;
  const got = AGR.pitch.detectFrequency(wave, rate);
  if (got !== null) error(context, `expected null, got ${got.toFixed(2)} hertz`);
}

// Detection: every open string, in tune and 25 cents to either side, as a
// pure sine and as a guitar-like mix of harmonics, at both common rates.
const GUITAR_PARTIALS = [[1, 1], [2, 0.5], [3, 0.33], [4, 0.2]];
for (const rate of TUNER_RATES) {
  for (const midi of OPEN_MIDIS) {
    for (const cents of [-25, 0, 25]) {
      const hz = AGR.pitch.midiToFrequency(midi) * Math.pow(2, cents / 1200);
      const label = `tuner detect midi ${midi} at ${cents} cents, rate ${rate}`;
      expectDetect(`${label} (sine)`, synthWave(hz, rate, [[1, 1]], 0.5), rate, hz, 2);
      expectDetect(`${label} (mix)`, synthWave(hz, rate, GUITAR_PARTIALS, 0.5), rate, hz, 3);
    }
  }
  // The octave trap: a dominant second harmonic must not read an octave high.
  for (const midi of [40, 45]) {
    const hz = AGR.pitch.midiToFrequency(midi);
    expectDetect(`tuner octave trap midi ${midi}, rate ${rate}`,
      synthWave(hz, rate, [[1, 0.35], [2, 1], [3, 0.3]], 0.5), rate, hz, 5);
  }
  // Silence, noise, and out-of-range sounds must all read as "no pitch".
  expectNull(`tuner null zeros, rate ${rate}`, new Float32Array(TUNER_BUFFER), rate);
  expectNull(`tuner null noise, rate ${rate}`, seededNoise(0.3), rate);
  expectNull(`tuner null 30 hertz, rate ${rate}`, synthWave(30, rate, [[1, 1]], 0.5), rate);
  expectNull(`tuner null 1500 hertz, rate ${rate}`, synthWave(1500, rate, [[1, 1]], 0.5), rate);
  expectNull(`tuner null quiet, rate ${rate}`, synthWave(110, rate, [[1, 1]], 0.001), rate);
}

// Conversion round trips and the shared in-tune threshold.
{
  const c = "tuner conversion";
  if (AGR.pitch.midiToFrequency(69) !== 440) error(c, "MIDI 69 must be 440 hertz");
  for (let m = 35; m <= 85; m++) {
    tunerDetectorCases += 1;
    const p = AGR.pitch.frequencyToPitch(AGR.pitch.midiToFrequency(m));
    if (p.midi !== m || Math.abs(p.cents) > 0.001) {
      error(c, `round trip failed for MIDI ${m}: got ${p.midi} at ${p.cents} cents`);
    }
  }
  const sharp = AGR.pitch.frequencyToPitch(440 * Math.pow(2, 25 / 1200));
  if (sharp.midi !== 69 || Math.abs(sharp.cents - 25) > 0.001) {
    error(c, "a quarter-semitone sharp A must read MIDI 69 at 25 cents");
  }
  if (AGR.pitch.IN_TUNE_CENTS !== 5) {
    error(c, "IN_TUNE_CENTS must stay 5, matching the renderer's wording");
  }
}

// Stability smoother: scripted push sequences with pinned outcomes.
function runSmoother(pushes) {
  const smoother = AGR.pitch.createSmoother();
  return pushes.map((p) => smoother.push(p));
}

{
  const c = "tuner smoother";
  const runTwice = (pushes) => {
    const a = JSON.stringify(runSmoother(pushes));
    const b = JSON.stringify(runSmoother(pushes));
    if (a !== b) error(c, "smoother is not deterministic");
    tunerGatingChecks += pushes.length;
    return JSON.parse(a);
  };
  const steady = runTwice([
    { midi: 45, cents: 3 }, { midi: 45, cents: 5 }, { midi: 45, cents: 4 },
    { midi: 45, cents: 6 }, { midi: 45, cents: 2 }
  ]);
  if (steady.slice(0, 4).some((r) => r !== null)) {
    error(c, "reported stable before the window filled");
  }
  if (!steady[4] || steady[4].midi !== 45 || steady[4].cents !== 4) {
    error(c, `expected the median reading (MIDI 45 at 4 cents), got ${JSON.stringify(steady[4])}`);
  }
  const wide = runTwice([
    { midi: 45, cents: 0 }, { midi: 45, cents: 2 }, { midi: 45, cents: 4 },
    { midi: 45, cents: 8 }, { midi: 45, cents: 12 }
  ]);
  if (wide[4] !== null) error(c, "a 12-cent spread must not count as stable");
  const mixed = runTwice([
    { midi: 45, cents: 0 }, { midi: 45, cents: 1 }, { midi: 45, cents: 0 },
    { midi: 45, cents: 1 }, { midi: 44, cents: 49 }
  ]);
  if (mixed[4] !== null) error(c, "a note change must not count as stable");
  const interrupted = runTwice([
    { midi: 45, cents: 0 }, { midi: 45, cents: 1 }, { midi: 45, cents: 0 },
    { midi: 45, cents: 1 }, null, { midi: 45, cents: 0 }, { midi: 45, cents: 1 },
    { midi: 45, cents: 0 }, { midi: 45, cents: 1 }, { midi: 45, cents: 2 }
  ]);
  if (interrupted.slice(0, 9).some((r) => r !== null) || !interrupted[9]) {
    error(c, "a null push must clear the window; stability needs five fresh readings");
  }
}

// Announcement gate: one scripted timeline covering every rule — first
// announcement, the minimum gap, the unchanged-reading refusal (commit
// takes the bare reading text, so dropping the name never counts as a
// change), the faster arriving-in-tune path, a note change that keeps the
// same bare text yet must still be spoken, silence, and reset.
{
  const c = "tuner announcer";
  const run = () => {
    const announcer = AGR.pitch.createAnnouncer();
    const log = [];
    const step = (reading, now, bareText) => {
      const offer = announcer.offer(reading, now);
      if (!offer) {
        log.push(`${now}:silent`);
        return;
      }
      const spoke = announcer.commit(bareText, now);
      log.push(`${now}:${spoke ? "spoke" : "held"}:${offer.includeName ? "name" : "bare"}:${bareText}`);
    };
    step({ midi: 45, cents: -15 }, 0, "B1");    // first reading announces, with name
    step({ midi: 45, cents: -14 }, 100, "B1");  // 100 ms gap: silent
    step({ midi: 45, cents: -12 }, 1600, "B1"); // gate passes, reading unchanged: held
    step({ midi: 45, cents: -10 }, 1700, "B2"); // gate passes, new reading: spoken, bare
    step({ midi: 45, cents: 2 }, 2600, "B3");   // 900 ms, but arriving in tune: spoken
    step({ midi: 45, cents: 1 }, 3300, "B4");   // already in tune, 700 ms: silent
    step({ midi: 40, cents: -20 }, 5000, "B3"); // same bare text, new note: spoken
    step(null, 5100, "");                       // silence: silent
    step({ midi: 40, cents: -20 }, 9000, "B5"); // 4 s since last stable: name again
    announcer.reset();
    step({ midi: 40, cents: -20 }, 9100, "B6"); // after reset: like the first
    return log;
  };
  const first = run();
  const second = run();
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    error(c, "announcer is not deterministic");
  }
  const expected = [
    "0:spoke:name:B1",
    "100:silent",
    "1600:held:bare:B1",
    "1700:spoke:bare:B2",
    "2600:spoke:bare:B3",
    "3300:silent",
    "5000:spoke:name:B3",
    "5100:silent",
    "9000:spoke:name:B5",
    "9100:spoke:name:B6"
  ];
  if (JSON.stringify(first) !== JSON.stringify(expected)) {
    error(c, `timeline mismatch: got ${JSON.stringify(first)}`);
  }
  tunerGatingChecks += expected.length;
}

// Tuner phrases: every reading the renderer can produce, linted like all
// other generated text, plus byte-for-byte goldens for the canonical forms.
{
  const TUNER_CENTS = [-40, -15, -6, -5, 0, 5, 6, 15, 40];
  const TUNER_MIDIS = [...OPEN_MIDIS, 42, 61]; // plus F sharp 2 and C sharp 4
  for (const naming of NAMINGS) {
    for (const midi of TUNER_MIDIS) {
      for (const cents of TUNER_CENTS) {
        for (const includeName of [true, false]) {
          const context = `tuner phrase midi ${midi} cents ${cents} [${naming}${includeName ? "/name" : ""}]`;
          let first;
          let second;
          try {
            first = AGR.render.tunerReading({ midi, cents }, naming, includeName);
            second = AGR.render.tunerReading({ midi, cents }, naming, includeName);
          } catch (e) {
            error(context, `renderer threw: ${e.message}`);
            continue;
          }
          tunerPhraseTexts += 1;
          if (first !== second) error(context, "output is not deterministic");
          if (typeof first !== "string" || first.length === 0) {
            error(context, "empty phrase");
            continue;
          }
          if (!first.endsWith(".")) error(context, `phrase must end with a period: "${first}"`);
          if (BANNED_GLYPHS.test(first)) error(context, `banned symbol in: "${first}"`);
          if (BANNED_WORDS.test(first)) error(context, `banned direction word in: "${first}"`);
          const inTune = Math.abs(cents) <= 5;
          if (inTune !== first.includes("In tune.")) {
            error(context, `wrong verdict for ${cents} cents: "${first}"`);
          }
          if (!inTune) {
            const wantLow = cents < 0;
            const hasLow = first.includes("too low. Tune higher.");
            const hasHigh = first.includes("too high. Tune lower.");
            if (!first.includes("About ") || hasLow !== wantLow || hasHigh === wantLow) {
              error(context, `wrong side for ${cents} cents: "${first}"`);
            }
          }
        }
      }
    }
  }

  const golden = (reading, naming, includeName, want) => {
    const got = AGR.render.tunerReading(reading, naming, includeName);
    if (got !== want) error("tuner golden", `expected "${want}", got "${got}"`);
  };
  golden({ midi: 40, cents: -15 }, "both", true, "6th string (low E). About 15 cents too low. Tune higher.");
  golden({ midi: 40, cents: -15 }, "both", false, "About 15 cents too low. Tune higher.");
  golden({ midi: 45, cents: 4 }, "both", true, "5th string (A). In tune.");
  golden({ midi: 42, cents: 12 }, "both", true, "Closest note is F sharp or G flat. About 10 cents too high. Tune lower.");
  golden({ midi: 64, cents: -30 }, "number", true, "1st string. About 30 cents too low. Tune higher.");
  golden({ midi: 59, cents: 0 }, "name", true, "B string. In tune.");
  golden({ midi: 40, cents: 0 }, "name", true, "Low E string. In tune.");
  golden({ midi: 45, cents: 6 }, "both", false, "About 5 cents too high. Tune lower.");

  const stateKeys = AGR.render.tunerStateKeys;
  const wantKeys = ["idle", "starting", "listening", "stopped", "insecure",
    "unsupported", "denied", "denied-file", "no-mic", "busy", "error"];
  if (JSON.stringify([...stateKeys].sort()) !== JSON.stringify([...wantKeys].sort())) {
    error("tuner states", `state keys are ${JSON.stringify(stateKeys)}`);
  }
  for (const key of stateKeys) {
    const context = `tuner state ${key}`;
    let first;
    let second;
    try {
      first = AGR.render.tunerStateText(key);
      second = AGR.render.tunerStateText(key);
    } catch (e) {
      error(context, `renderer threw: ${e.message}`);
      continue;
    }
    tunerPhraseTexts += 1;
    if (first !== second) error(context, "output is not deterministic");
    if (typeof first !== "string" || first.length === 0) {
      error(context, "empty phrase");
      continue;
    }
    if (!first.endsWith(".")) error(context, `phrase must end with a period: "${first}"`);
    if (BANNED_GLYPHS.test(first)) error(context, `banned symbol in: "${first}"`);
    if (BANNED_WORDS.test(first)) error(context, `banned direction word in: "${first}"`);
  }
  if (AGR.render.tunerStateText("listening") !==
      "Listening. Play one string at a time, and let it ring.") {
    error("tuner golden", "the listening phrase changed");
  }
  if (AGR.render.tunerStateText("denied") !==
      "Microphone permission was refused, so the tuner cannot hear the guitar. " +
      "Allow microphone access for this site in the browser, then press Start tuner again.") {
    error("tuner golden", "the denied phrase changed");
  }
}

// ---------- Summary ----------

const exampleCount = shapes.reduce((n, s) => n + s.examples.length, 0);
console.log("");
console.log(`Checked ${fixedChords.length} chords, ${shapes.length} movable shapes, ${exampleCount} shape examples, and ${sweepCount} all-roots sweep positions.`);
console.log(`Tuner: ${tunerDetectorCases} detection cases, ${tunerGatingChecks} gating steps, and ${tunerPhraseTexts} phrase texts checked.`);
console.log(`${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) {
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
