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

// ---------- Summary ----------

const exampleCount = shapes.reduce((n, s) => n + s.examples.length, 0);
console.log("");
console.log(`Checked ${fixedChords.length} chords, ${shapes.length} movable shapes, ${exampleCount} shape examples, and ${sweepCount} all-roots sweep positions.`);
console.log(`${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) {
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
