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
// Phase G: metronome — prove the tick sequencer, the speed trainer, and tap
//          tempo on scripted timelines; lint every metronome phrase.
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
  ["js", "tempo.js"],
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
// waveforms across the full chromatic range (the tuner names the nearest
// note, never a string), the stability and announcement gates on scripted
// timelines, and (further below) every phrase linted like all other
// generated text.

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

// Detection: every note from the open low E up to G sharp 4 (MIDI 40 to 68),
// in tune and 25 cents to either side, as a pure sine at both common rates.
// The tuner names the nearest note, not a string, so fretted notes such as
// F must detect as cleanly as open strings (regression for the misread-F
// report, 2026-08-10). The open strings and all three F notes among them
// also run as a guitar-like mix of harmonics.
const GUITAR_PARTIALS = [[1, 1], [2, 0.5], [3, 0.33], [4, 0.2]];
const MIX_MIDIS = [...OPEN_MIDIS, 41, 53, 65];
for (const rate of TUNER_RATES) {
  for (let midi = 40; midi <= 68; midi++) {
    for (const cents of [-25, 0, 25]) {
      const hz = AGR.pitch.midiToFrequency(midi) * Math.pow(2, cents / 1200);
      const label = `tuner detect midi ${midi} at ${cents} cents, rate ${rate}`;
      expectDetect(`${label} (sine)`, synthWave(hz, rate, [[1, 1]], 0.5), rate, hz, 2);
      if (MIX_MIDIS.includes(midi)) {
        expectDetect(`${label} (mix)`, synthWave(hz, rate, GUITAR_PARTIALS, 0.5), rate, hz, 3);
      }
    }
  }
  // The octave trap: a dominant second harmonic must not read an octave high.
  for (const midi of [40, 45]) {
    const hz = AGR.pitch.midiToFrequency(midi);
    expectDetect(`tuner octave trap midi ${midi}, rate ${rate}`,
      synthWave(hz, rate, [[1, 0.35], [2, 1], [3, 0.3]], 0.5), rate, hz, 5);
  }
  // Silence, noise, out-of-range sounds, and mains hum must all read as
  // "no pitch".
  expectNull(`tuner null zeros, rate ${rate}`, new Float32Array(TUNER_BUFFER), rate);
  expectNull(`tuner null noise, rate ${rate}`, seededNoise(0.3), rate);
  expectNull(`tuner null 30 hertz, rate ${rate}`, synthWave(30, rate, [[1, 1]], 0.5), rate);
  expectNull(`tuner null 50 hertz hum, rate ${rate}`, synthWave(50, rate, [[1, 1]], 0.3), rate);
  expectNull(`tuner null 60 hertz hum, rate ${rate}`, synthWave(60, rate, [[1, 1]], 0.3), rate);
  expectNull(`tuner null 1500 hertz, rate ${rate}`, synthWave(1500, rate, [[1, 1]], 0.5), rate);
  expectNull(`tuner null below gate, rate ${rate}`, synthWave(110, rate, [[1, 1]], 0.0003), rate);
  // Regression for the silent-tuner report (2026-08-07): a very quiet but
  // clean string must still be read, not gated away as silence.
  expectDetect(`tuner quiet but clear, rate ${rate}`, synthWave(110, rate, [[1, 1]], 0.002), rate, 110, 2);
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
  // Boundary behavior: conversion is chromatic and always rounds to the
  // nearest note, so the tuner guides toward whichever note is closest.
  // 60 cents flat of F2 is 40 cents sharp of E2 and must read as E; just
  // past the halfway point it must flip to F.
  const flatF = AGR.pitch.frequencyToPitch(AGR.pitch.midiToFrequency(41) * Math.pow(2, -60 / 1200));
  if (flatF.midi !== 40 || Math.abs(flatF.cents - 40) > 0.001) {
    error(c, `60 cents flat of F2 must read MIDI 40 at 40 cents, got ${flatF.midi} at ${flatF.cents}`);
  }
  const nearlyF = AGR.pitch.frequencyToPitch(AGR.pitch.midiToFrequency(40) * Math.pow(2, 49 / 1200));
  if (nearlyF.midi !== 40 || Math.abs(nearlyF.cents - 49) > 0.001) {
    error(c, `49 cents sharp of E2 must still read MIDI 40, got ${nearlyF.midi} at ${nearlyF.cents}`);
  }
  const justF = AGR.pitch.frequencyToPitch(AGR.pitch.midiToFrequency(40) * Math.pow(2, 51 / 1200));
  if (justF.midi !== 41 || Math.abs(justF.cents + 49) > 0.001) {
    error(c, `51 cents sharp of E2 must read MIDI 41 at minus 49 cents, got ${justF.midi} at ${justF.cents}`);
  }
  tunerDetectorCases += 3;
  if (AGR.pitch.IN_TUNE_CENTS !== 5) {
    error(c, "IN_TUNE_CENTS must stay 5, matching the renderer's wording");
  }
  if (AGR.pitch.signalLevel(new Float32Array(TUNER_BUFFER)) !== 0) {
    error(c, "digital silence must have a level of exactly zero");
  }
  const level = AGR.pitch.signalLevel(synthWave(110, 48000, [[1, 1]], 0.5));
  if (Math.abs(level - 0.5 / Math.SQRT2) > 0.01) {
    error(c, `a half-amplitude sine must read near 0.354, got ${level}`);
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
  if (mixed[4] !== null) error(c, "a pitch jump must not count as stable");
  const interrupted = runTwice([
    { midi: 45, cents: 0 }, { midi: 45, cents: 1 }, { midi: 45, cents: 0 },
    { midi: 45, cents: 1 }, null, { midi: 45, cents: 0 }, { midi: 45, cents: 1 },
    { midi: 45, cents: 0 }, { midi: 45, cents: 1 }, { midi: 45, cents: 2 }
  ]);
  if (interrupted.slice(0, 9).some((r) => r !== null) || !interrupted[9]) {
    error(c, "a null push must clear the window; stability needs five fresh readings");
  }
  // Regression for the misread-F report (2026-08-10): a pitch holding near
  // the halfway point between two notes makes rounding alternate between
  // MIDI 40 and 41. The smoother compares readings in continuous semitone
  // space, so this still counts as steady and must emit a reading; the old
  // same-integer-midi rule reported nothing here forever while the page
  // kept showing a stale reading.
  const boundary = runTwice([
    { midi: 40, cents: 49 }, { midi: 41, cents: -49 }, { midi: 40, cents: 48 },
    { midi: 41, cents: -48 }, { midi: 41, cents: -49 }
  ]);
  if (boundary.slice(0, 4).some((r) => r !== null)) {
    error(c, "boundary: reported stable before the window filled");
  }
  if (!boundary[4] || boundary[4].midi !== 41 || boundary[4].cents !== -49) {
    error(c, `a boundary hover must emit its median reading (MIDI 41 at minus 49 cents), got ${JSON.stringify(boundary[4])}`);
  }
  const boundaryLow = runTwice([
    { midi: 40, cents: 49 }, { midi: 40, cents: 48 }, { midi: 41, cents: -49 },
    { midi: 40, cents: 47 }, { midi: 41, cents: -48 }
  ]);
  if (!boundaryLow[4] || boundaryLow[4].midi !== 40 || boundaryLow[4].cents !== 49) {
    error(c, `a boundary hover with the median on the low side must emit MIDI 40 at 49 cents, got ${JSON.stringify(boundaryLow[4])}`);
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
  // The six open strings; the naturals one semitone outside both E strings
  // (MIDI 39, 41, 63, 65 — the misread-F report lives there); the E an
  // octave above the open low E; and both double-named accidentals
  // (F sharp 2 and C sharp 4).
  const TUNER_MIDIS = [...OPEN_MIDIS, 39, 41, 52, 63, 65, 42, 61];
  // A reading names a note, never a string: no string talk, no low or high
  // E, no ordinals. State texts are exempt ("Play one string at a time" is
  // approved copy); this pattern guards the readings only.
  const BANNED_TUNER_WORDS = /string|\blow E\b|\bhigh E\b|\b\d+(st|nd|rd|th)\b/i;
  for (const midi of TUNER_MIDIS) {
    for (const cents of TUNER_CENTS) {
      for (const includeName of [true, false]) {
        const context = `tuner phrase midi ${midi} cents ${cents}${includeName ? " [name]" : ""}`;
        let first;
        let second;
        try {
          first = AGR.render.tunerReading({ midi, cents }, includeName);
          second = AGR.render.tunerReading({ midi, cents }, includeName);
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
        if (BANNED_TUNER_WORDS.test(first)) {
          error(context, `a reading must name a note, never a string: "${first}"`);
        }
        if (includeName) {
          // The named form is exactly the note name sentence plus the bare
          // verdict; the announcer relies on that structure to compare
          // readings without the name.
          const bare = AGR.render.tunerReading({ midi, cents }, false);
          const name = AGR.render.noteNamesForPc(((midi % 12) + 12) % 12);
          if (first !== `${name}. ${bare}`) {
            error(context, `a named reading must be the note name plus the bare reading: "${first}"`);
          }
        }
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

  const golden = (reading, includeName, want) => {
    const got = AGR.render.tunerReading(reading, includeName);
    if (got !== want) error("tuner golden", `expected "${want}", got "${got}"`);
  };
  // All three E octaves on the neck — the open low E, the E at the 2nd fret
  // of the D string, and the open high E — must read identically: the tuner
  // names notes, never strings and never octaves.
  golden({ midi: 40, cents: -15 }, true, "E. About 15 cents too low. Tune higher.");
  golden({ midi: 52, cents: -15 }, true, "E. About 15 cents too low. Tune higher.");
  golden({ midi: 64, cents: -15 }, true, "E. About 15 cents too low. Tune higher.");
  // The misread-F report (2026-08-10): an F must read as F, wherever it is
  // played, and even a far-flat F is guided toward the note it is now
  // closest to.
  golden({ midi: 41, cents: 0 }, true, "F. In tune.");
  golden({ midi: 41, cents: -49 }, true, "F. About 50 cents too low. Tune higher.");
  golden({ midi: 42, cents: 12 }, true, "F sharp or G flat. About 10 cents too high. Tune lower.");
  golden({ midi: 45, cents: 4 }, true, "A. In tune.");
  golden({ midi: 40, cents: -15 }, false, "About 15 cents too low. Tune higher.");
  golden({ midi: 45, cents: 6 }, false, "About 5 cents too high. Tune lower.");

  const stateKeys = AGR.render.tunerStateKeys;
  const wantKeys = ["idle", "starting", "listening", "no-signal", "unclear",
    "stopped", "insecure", "unsupported", "denied", "denied-file", "no-mic",
    "busy", "error"];
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

// ---------- Phase G: metronome ----------
// The metronome's timing is pure (js/tempo.js) and its words come from the
// renderer, so both are proven here: every tick of a bar for every beats,
// subdivision, and accent combination, exact tick spacing, tempo changes
// while running, the speed trainer's raises and cap, tap tempo averaging,
// settings sanitizing, and every phrase linted like all other generated
// text. Nothing here touches a clock: times are scripted.

let metronomeTimelineChecks = 0;
let metronomePhraseTexts = 0;

const tempo = AGR.tempo;
const nearly = (a, b) => Math.abs(a - b) < 1e-9;

function runTicks(config, count, startAt) {
  const seq = tempo.createSequencer(config);
  seq.start(startAt === undefined ? 0 : startAt);
  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(seq.next());
  return ticks;
}

{
  const c = "metronome sanitize";
  const defaults = tempo.sanitize(null);
  if (JSON.stringify(defaults) !== JSON.stringify(tempo.DEFAULTS)) {
    error(c, "sanitize(null) must give the defaults");
  }
  if (JSON.stringify(tempo.sanitize("junk")) !== JSON.stringify(defaults) ||
      JSON.stringify(tempo.sanitize({ bpm: "fast", trainer: 7 })) !== JSON.stringify(defaults)) {
    error(c, "garbage must fall back to the defaults");
  }
  const clamped = tempo.sanitize({
    bpm: "900", beatsPerBar: "1", accent: "false", subdivision: "3", sound: "gong",
    volume: 140, trainer: { enabled: "true", step: "5", everyBars: 9, targetBpm: 0 }
  });
  const wantClamped = {
    bpm: 500, beatsPerBar: 2, accent: false, subdivision: 3, sound: "click", volume: 100,
    trainer: { enabled: true, step: 5, everyBars: 4, targetBpm: 30 }
  };
  if (JSON.stringify(clamped) !== JSON.stringify(wantClamped)) {
    error(c, `clamping gave ${JSON.stringify(clamped)}`);
  }
  const base = tempo.sanitize({ bpm: 72, beatsPerBar: 3, sound: "wood" });
  const patched = tempo.sanitize({ bpm: "" , volume: 20 }, base);
  if (patched.bpm !== 72 || patched.beatsPerBar !== 3 || patched.sound !== "wood" || patched.volume !== 20) {
    error(c, "a partial patch must keep the base for what it leaves out");
  }
  if (tempo.sanitize({ bpm: 99.6 }).bpm !== 100) error(c, "bpm must be rounded to an integer");
  // Every catalogued sound survives sanitizing, so a stored choice is never
  // silently swapped for the default.
  for (const sound of tempo.SOUNDS) {
    if (tempo.sanitize({ sound }).sound !== sound) error(c, `sound "${sound}" must be accepted`);
  }
  if (tempo.SOUNDS.indexOf("wood") === -1) error(c, "the published sound value \"wood\" must never be removed");
  metronomeTimelineChecks += 6 + tempo.SOUNDS.length + 1;
}

{
  const c = "metronome ticks";
  for (const beats of [2, 3, 4, 5, 6, 7, 8]) {
    for (const subdivision of tempo.SUBDIVISIONS) {
      for (const accent of [true, false]) {
        const config = { bpm: 120, beatsPerBar: beats, subdivision, accent };
        const context = `${c} [${beats} beats, ${subdivision} per beat, accent ${accent}]`;
        const perBar = beats * subdivision;
        const first = runTicks(config, perBar * 2 + 1);
        const second = runTicks(config, perBar * 2 + 1);
        if (JSON.stringify(first) !== JSON.stringify(second)) error(context, "sequencer is not deterministic");
        const spacing = tempo.secondsPerTick(120, subdivision);
        first.forEach((tick, i) => {
          if (!nearly(tick.time, i * spacing)) error(context, `tick ${i} at ${tick.time}, expected ${i * spacing}`);
          const wantBar = Math.floor(i / perBar) + 1;
          const wantBeat = Math.floor((i % perBar) / subdivision) + 1;
          const wantSub = (i % subdivision) + 1;
          if (tick.bar !== wantBar || tick.beat !== wantBeat || tick.sub !== wantSub) {
            error(context, `tick ${i} placed at bar ${tick.bar} beat ${tick.beat} sub ${tick.sub}`);
          }
          let wantKind = "beat";
          if (wantSub !== 1) wantKind = "sub";
          else if (wantBeat === 1 && accent) wantKind = "accent";
          if (tick.kind !== wantKind) error(context, `tick ${i} is ${tick.kind}, expected ${wantKind}`);
          if (tick.bpm !== 120 || tick.tempoChanged) error(context, `tick ${i} reports a tempo change`);
        });
        metronomeTimelineChecks += first.length;
      }
    }
  }
  // Extremes of the tempo range keep exact spacing too.
  const slow = runTicks({ bpm: 30, subdivision: 1 }, 3);
  const fast = runTicks({ bpm: 500, subdivision: 4 }, 3);
  if (!nearly(slow[2].time, 4) || !nearly(fast[2].time, 0.06)) {
    error(c, "extreme tempos must keep exact spacing");
  }
  metronomeTimelineChecks += 2;
}

{
  const c = "metronome tempo change";
  // At 30 beats per minute one tick has sounded at 0 and the next waits for
  // 2.0. Changing to 120 at 0.1 must pull the pending tick to 0.5 (one new
  // interval after the last tick), never earlier than now, never doubled.
  const seq = tempo.createSequencer({ bpm: 30 });
  seq.start(0);
  seq.next();
  seq.update({ bpm: 120 }, 0.1);
  if (!nearly(seq.peek(), 0.5)) error(c, `realigned tick at ${seq.peek()}, expected 0.5`);
  if (seq.tempo() !== 120) error(c, "tempo() must report the new tempo");
  const after = seq.next();
  if (!nearly(seq.peek(), 1.0) || after.bpm !== 120) error(c, "spacing after the change must be the new interval");
  // When the new interval has already passed, the tick lands right now.
  seq.next();
  seq.update({ bpm: 300 }, 5);
  if (!nearly(seq.peek(), 5)) error(c, `late realignment at ${seq.peek()}, expected 5`);
  // A change that leaves timing alone (sound, volume, accent) moves nothing.
  const still = tempo.createSequencer({ bpm: 60 });
  still.start(0);
  still.next();
  still.update({ sound: "beep", volume: 10, accent: false }, 0.9);
  if (!nearly(still.peek(), 1)) error(c, "a non-timing change must not move the pending tick");
  if (still.next().kind !== "beat") error(c, "accent off must take effect on the next beat");
  // Fewer beats per bar than the current position wraps to a new bar.
  const wrap = tempo.createSequencer({ bpm: 60, beatsPerBar: 4 });
  wrap.start(0);
  wrap.next(); wrap.next(); wrap.next(); // beats 1, 2, 3 of bar 1
  wrap.update({ beatsPerBar: 2 });
  const wrapped = wrap.next();
  if (wrapped.bar !== 2 || wrapped.beat !== 1) error(c, `shrinking the bar gave bar ${wrapped.bar} beat ${wrapped.beat}`);
  // A subdivision change is heard from the next tick.
  const sub = tempo.createSequencer({ bpm: 60, subdivision: 1 });
  sub.start(0);
  sub.next();
  sub.update({ subdivision: 2 }, 0.1);
  if (!nearly(sub.peek(), 0.5)) error(c, "a subdivision change must realign the pending tick");
  const subTick = sub.next();
  if (subTick.beat !== 2 || subTick.sub !== 1 || subTick.kind !== "beat") error(c, "position after a subdivision change is wrong");
  metronomeTimelineChecks += 10;
}

{
  const c = "metronome speed trainer";
  const config = { bpm: 120, beatsPerBar: 4, subdivision: 1,
    trainer: { enabled: true, step: 5, everyBars: 2, targetBpm: 130 } };
  const ticks = runTicks(config, 4 * 8);
  const raises = ticks.filter((t) => t.tempoChanged).map((t) => `bar ${t.bar} beat ${t.beat} to ${t.bpm}`);
  const wantRaises = ["bar 3 beat 1 to 125", "bar 5 beat 1 to 130"];
  if (JSON.stringify(raises) !== JSON.stringify(wantRaises)) {
    error(c, `raises were ${JSON.stringify(raises)}`);
  }
  // Timing: bar 3 beat 1 falls at the old spacing, the beat after it at the new.
  const barThree = ticks.findIndex((t) => t.bar === 3);
  if (!nearly(ticks[barThree].time - ticks[barThree - 1].time, 0.5)) {
    error(c, "the first beat of the raised bar must keep the old spacing");
  }
  if (!nearly(ticks[barThree + 1].time - ticks[barThree].time, 60 / 125)) {
    error(c, "the beat after a raise must use the new spacing");
  }
  if (ticks[ticks.length - 1].bpm !== 130) error(c, "the tempo must hold at the target");
  // Target at or below the current tempo: never a raise, never a drop.
  const flat = runTicks({ bpm: 120, trainer: { enabled: true, step: 5, everyBars: 2, targetBpm: 100 } }, 40);
  if (flat.some((t) => t.tempoChanged || t.bpm !== 120)) error(c, "a target below the tempo must change nothing");
  // A step that overshoots stops exactly at the target.
  const exact = runTicks({ bpm: 120, trainer: { enabled: true, step: 10, everyBars: 2, targetBpm: 125 } }, 40);
  const exactRaises = exact.filter((t) => t.tempoChanged).map((t) => t.bpm);
  if (JSON.stringify(exactRaises) !== JSON.stringify([125])) error(c, `overshoot gave ${JSON.stringify(exactRaises)}`);
  // Disabled: nothing happens.
  const off = runTicks({ bpm: 120, trainer: { enabled: false, step: 5, everyBars: 2, targetBpm: 200 } }, 40);
  if (off.some((t) => t.tempoChanged)) error(c, "a disabled trainer must not raise the tempo");
  // Every spacing in the catalogue raises on the right bar.
  for (const everyBars of tempo.TRAINER_BARS) {
    const run = runTicks({ bpm: 60, beatsPerBar: 2, trainer: { enabled: true, step: 1, everyBars, targetBpm: 63 } }, 2 * (everyBars * 3 + 1));
    const bars = run.filter((t) => t.tempoChanged).map((t) => t.bar);
    const want = [everyBars + 1, everyBars * 2 + 1, everyBars * 3 + 1];
    if (JSON.stringify(bars) !== JSON.stringify(want)) error(c, `every ${everyBars} bars raised at ${JSON.stringify(bars)}`);
  }
  // The player's own tempo change while running replaces a raised tempo,
  // and the trainer keeps going from there.
  const seq = tempo.createSequencer(config);
  seq.start(0);
  for (let i = 0; i < 9; i++) seq.next(); // through bar 3 beat 1: now 125
  if (seq.tempo() !== 125) error(c, "expected 125 after the first raise");
  seq.update({ bpm: 100 }, 4.6);
  if (seq.tempo() !== 100 || seq.config().bpm !== 100) error(c, "a typed tempo must replace a raised one");
  let next;
  do { next = seq.next(); } while (!next.tempoChanged);
  if (next.bar !== 5 || next.bpm !== 105) error(c, `after the typed tempo the raise came at bar ${next.bar} to ${next.bpm}`);
  metronomeTimelineChecks += 12;
}

{
  const c = "metronome tap tempo";
  const run = (times, options) => {
    const tapper = tempo.createTapTempo(options);
    return times.map((t) => tapper.tap(t));
  };
  const steady = run([0, 500, 1000, 1500]);
  const want = [{ count: 1, bpm: null }, { count: 2, bpm: 120 }, { count: 3, bpm: 120 }, { count: 4, bpm: 120 }];
  if (JSON.stringify(steady) !== JSON.stringify(want) || JSON.stringify(run([0, 500, 1000, 1500])) !== JSON.stringify(steady)) {
    error(c, `steady taps gave ${JSON.stringify(steady)}`);
  }
  const jitter = run([0, 480, 1020, 1490, 2010]);
  if (jitter[4].bpm !== 119) error(c, `jittery taps gave ${jitter[4].bpm}, expected 119`);
  const gap = run([0, 500, 1000, 4000, 4600]);
  if (gap[3].count !== 1 || gap[3].bpm !== null || gap[4].count !== 2 || gap[4].bpm !== 100) {
    error(c, `a long gap must start a fresh count, got ${JSON.stringify(gap.slice(3))}`);
  }
  const fast = run([0, 100, 200]);
  if (fast[2].bpm !== 500) error(c, "very fast taps must clamp to the top of the range");
  const slow = run([0, 1900, 3800]);
  if (slow[2].bpm !== 32) error(c, `slow taps gave ${slow[2].bpm}, expected 32`);
  const tooSlow = run([0, 1999], { resetMs: 3000 });
  const slowest = run([0, 2500, 5000], { resetMs: 3000 });
  if (tooSlow[1].bpm !== 30 || slowest[2].bpm !== 30) error(c, "taps slower than 30 must clamp to 30");
  // Only the most recent intervals count, so a tempo that settles is followed.
  const settles = run([0, 1000, 2000, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500]);
  if (settles[12].bpm !== 120 || settles[12].count !== 13) error(c, `a settling tempo gave ${JSON.stringify(settles[12])}`);
  const same = run([0, 0]);
  if (same[1].bpm !== null) error(c, "two taps at the same instant must not give a tempo");
  const tapper = tempo.createTapTempo();
  tapper.tap(0); tapper.tap(500); tapper.reset();
  if (JSON.stringify(tapper.tap(600)) !== JSON.stringify({ count: 1, bpm: null })) error(c, "reset must forget every tap");
  metronomeTimelineChecks += 10;
}

// Metronome phrases: every status the renderer can produce for every
// combination of the catalogued settings, linted like all other generated
// text, plus byte-for-byte goldens for the canonical forms.
{
  const lintPhrase = (context, produce) => {
    let first;
    let second;
    try {
      first = produce();
      second = produce();
    } catch (e) {
      error(context, `renderer threw: ${e.message}`);
      return null;
    }
    metronomePhraseTexts += 1;
    if (first !== second) error(context, "output is not deterministic");
    if (typeof first !== "string" || first.length === 0) {
      error(context, "empty phrase");
      return null;
    }
    if (!first.endsWith(".")) error(context, `phrase must end with a period: "${first}"`);
    if (BANNED_GLYPHS.test(first)) error(context, `banned symbol in: "${first}"`);
    if (BANNED_WORDS.test(first)) error(context, `banned direction word in: "${first}"`);
    return first;
  };

  for (const running of [false, true]) {
    for (const bpm of [30, 100, 159, 160, 300, 500]) {
      for (const beats of [2, 3, 4, 5, 6, 7, 8]) {
        for (const subdivision of tempo.SUBDIVISIONS) {
          for (const accent of [true, false]) {
            for (const enabled of [false, true]) {
              for (const step of tempo.TRAINER_STEPS) {
                for (const everyBars of tempo.TRAINER_BARS) {
                  const config = tempo.sanitize({ bpm, beatsPerBar: beats, subdivision, accent,
                    trainer: { enabled, step, everyBars, targetBpm: 160 } });
                  const context = `metronome status ${running ? "running" : "stopped"} ${bpm} bpm ${beats}/${subdivision} accent ${accent} trainer ${enabled}/${step}/${everyBars}`;
                  const text = lintPhrase(context, () => AGR.render.metronomeStatus(config, running));
                  if (text === null) continue;
                  if (!text.includes(` ${bpm} beats per minute.`)) error(context, `tempo missing from: "${text}"`);
                  if (!text.includes(`${beats} beats per bar`)) error(context, `beats per bar missing from: "${text}"`);
                  if (text.startsWith("Running") !== running) error(context, `wrong state in: "${text}"`);
                  if (text.includes("Speed trainer") !== enabled) error(context, `trainer wrongly mentioned in: "${text}"`);
                  if (enabled) {
                    const reached = bpm >= 160;
                    if (text.includes("faster by") === reached) error(context, `trainer sentence wrong for ${bpm} toward 160: "${text}"`);
                    if (!reached && !text.includes(`every ${everyBars} bars`)) error(context, `bars missing from: "${text}"`);
                  }
                  if (text.includes("accented") !== accent) error(context, `accent wrong in: "${text}"`);
                }
              }
            }
          }
        }
      }
    }
  }

  for (const count of [1, 2, 3, 9, 40]) {
    for (const bpm of [null, 30, 118, 500]) {
      const context = `metronome tap text ${count} taps ${bpm}`;
      const text = lintPhrase(context, () => AGR.render.metronomeTapText({ count, bpm }));
      if (text === null) continue;
      if (text.includes("Tempo set") === (bpm === null)) error(context, `wrong shape: "${text}"`);
    }
  }

  for (const beats of [2, 4, 8]) {
    for (const beat of [1, 2, beats]) {
      lintPhrase(`metronome beat text ${beat} of ${beats}`,
        () => AGR.render.metronomeBeatText({ beat, bar: 12, sub: 1, kind: "beat" }, beats));
    }
  }

  const stateKeys = AGR.render.metronomeStateKeys;
  const wantKeys = ["unsupported", "error"];
  if (JSON.stringify([...stateKeys].sort()) !== JSON.stringify([...wantKeys].sort())) {
    error("metronome states", `state keys are ${JSON.stringify(stateKeys)}`);
  }
  for (const key of stateKeys) {
    lintPhrase(`metronome state ${key}`, () => AGR.render.metronomeStateText(key));
  }

  const golden = (got, want) => {
    if (got !== want) error("metronome golden", `expected "${want}", got "${got}"`);
  };
  golden(AGR.render.metronomeStatus(tempo.sanitize(null), false),
    "Stopped. Set to 100 beats per minute. 4 beats per bar, first beat accented. One click per beat.");
  golden(AGR.render.metronomeStatus(tempo.sanitize({ bpm: 120, subdivision: 3, accent: false,
    trainer: { enabled: true, step: 5, everyBars: 4, targetBpm: 160 } }), true),
    "Running at 120 beats per minute. 4 beats per bar, no accent. Three clicks per beat, triplets. " +
    "Speed trainer: faster by 5 beats per minute every 4 bars, until 160 beats per minute.");
  golden(AGR.render.metronomeStatus(tempo.sanitize({ bpm: 160, beatsPerBar: 3, subdivision: 2,
    trainer: { enabled: true, step: 1, everyBars: 8, targetBpm: 160 } }), true),
    "Running at 160 beats per minute. 3 beats per bar, first beat accented. Two clicks per beat, eighth notes. " +
    "Speed trainer: the tempo is already at or above the target of 160 beats per minute, so it stays as it is.");
  golden(AGR.render.metronomeStatus(tempo.sanitize({ bpm: 90, subdivision: 4,
    trainer: { enabled: true, step: 1, everyBars: 2, targetBpm: 100 } }), false),
    "Stopped. Set to 90 beats per minute. 4 beats per bar, first beat accented. Four clicks per beat, sixteenth notes. " +
    "Speed trainer: faster by 1 beat per minute every 2 bars, until 100 beats per minute.");
  golden(AGR.render.metronomeTapText({ count: 1, bpm: null }), "1 tap so far. Tap again on each beat.");
  golden(AGR.render.metronomeTapText({ count: 4, bpm: 118 }), "4 taps. Tempo set to 118 beats per minute.");
  golden(AGR.render.metronomeBeatText({ beat: 3, bar: 12, sub: 1, kind: "beat" }, 4), "Beat 3 of 4. Bar 12.");
}

// ---------- Summary ----------

const exampleCount = shapes.reduce((n, s) => n + s.examples.length, 0);
console.log("");
console.log(`Checked ${fixedChords.length} chords, ${shapes.length} movable shapes, ${exampleCount} shape examples, and ${sweepCount} all-roots sweep positions.`);
console.log(`Tuner: ${tunerDetectorCases} detection cases, ${tunerGatingChecks} gating steps, and ${tunerPhraseTexts} phrase texts checked.`);
console.log(`Metronome: ${metronomeTimelineChecks} timeline checks and ${metronomePhraseTexts} phrase texts checked.`);
console.log(`${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) {
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
