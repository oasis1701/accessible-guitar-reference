// notes.js — tuning, note names, and chord quality definitions.
// Classic script: assigns to globalThis.AGR so the same file loads in browsers
// (via a script tag) and in Node (via require, for tools/validate.js).
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  // Standard tuning. stringMidi is indexed by string number:
  // string 6 is the thickest (low E), string 1 the thinnest (high E).
  AGR.tuning = {
    id: "standard",
    name: "Standard tuning",
    stringMidi: { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 } // E2 A2 D3 G3 B3 E4
  };

  // Open-string display names in standard tuning, by string number.
  // "low E" and "high E" disambiguate the two E strings.
  AGR.stringNoteName = { 6: "low E", 5: "A", 4: "D", 3: "G", 2: "B", 1: "high E" };

  // Pitch class (0 to 11) for every note spelling used in data files.
  AGR.pitchClass = {
    "C": 0, "B#": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4, "F": 5, "E#": 5, "F#": 6, "Gb": 6, "G": 7,
    "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11, "Cb": 11
  };

  // Screen-reader-safe display spellings. The glyphs "#" and the flat sign
  // must never appear in rendered text; screen readers misread them.
  AGR.displayNote = {
    "C": "C", "B#": "B sharp", "C#": "C sharp", "Db": "D flat", "D": "D",
    "D#": "D sharp", "Eb": "E flat", "E": "E", "Fb": "F flat", "F": "F",
    "E#": "E sharp", "F#": "F sharp", "Gb": "G flat", "G": "G",
    "G#": "G sharp", "Ab": "A flat", "A": "A", "A#": "A sharp",
    "Bb": "B flat", "B": "B", "Cb": "C flat"
  };

  // Canonical sharp spelling for each pitch class (0 to 11). Used by the
  // chord finder's root menu and the validator's all-roots sweep.
  AGR.pcSpelling = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Chord qualities as semitone intervals from the root.
  // "required" intervals must all be present; "optional" ones may be present;
  // any other interval is an error. The validator enforces this.
  AGR.qualities = {
    major: { label: "major", required: [0, 4, 7], optional: [] },
    minor: { label: "minor", required: [0, 3, 7], optional: [] },
    // Open C7 has no 5th, so the 5th is optional in dominant 7th chords.
    dom7: { label: "dominant 7th", required: [0, 4, 10], optional: [7] },
    power: { label: "power chord", required: [0, 7], optional: [] }
  };

  // Which intervals each named role may sound (movable shapes declare roles).
  AGR.roleInterval = {
    root: [0],
    third: [3, 4],
    fifth: [7],
    seventh: [10, 11]
  };
})();
