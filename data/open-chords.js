// open-chords.js — the open ("cowboy") chords.
// Schema rules (enforced by tools/validate.js):
// - strings: exactly 6 entries, ordered string 6 (thickest) to string 1 (thinnest).
// - Muted strings are explicit: { action: "mute" }. Open strings: { action: "open" }.
// - Fretted strings: { action: "fret", fret, finger } with finger NAMES, never numbers.
// - id is a permanent slug; never rename it once published.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  globalThis.AGR.openChords = [

    // --- Major chords ---
    {
      id: "c-major",
      name: "C major",
      root: "C",
      quality: "major",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", fret: 3, finger: "ring" },
        { string: 4, action: "fret", fret: 2, finger: "middle" },
        { string: 3, action: "open" },
        { string: 2, action: "fret", fret: 1, finger: "index" },
        { string: 1, action: "open" }
      ],
      tips: "Curl your fingers so the open strings can ring clearly."
    },
    {
      id: "a-major",
      name: "A major",
      root: "A",
      quality: "major",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "open" },
        { string: 4, action: "fret", fret: 2, finger: "index" },
        { string: 3, action: "fret", fret: 2, finger: "middle" },
        { string: 2, action: "fret", fret: 2, finger: "ring" },
        { string: 1, action: "open" }
      ],
      tips: "Three fingers share the 2nd fret; keep them in a tight row so each string sounds."
    },
    {
      id: "g-major",
      name: "G major",
      root: "G",
      quality: "major",
      strings: [
        { string: 6, action: "fret", fret: 3, finger: "middle" },
        { string: 5, action: "fret", fret: 2, finger: "index" },
        { string: 4, action: "open" },
        { string: 3, action: "open" },
        { string: 2, action: "open" },
        { string: 1, action: "fret", fret: 3, finger: "ring" }
      ],
      tips: ""
    },
    {
      id: "e-major",
      name: "E major",
      root: "E",
      quality: "major",
      strings: [
        { string: 6, action: "open" },
        { string: 5, action: "fret", fret: 2, finger: "middle" },
        { string: 4, action: "fret", fret: 2, finger: "ring" },
        { string: 3, action: "fret", fret: 1, finger: "index" },
        { string: 2, action: "open" },
        { string: 1, action: "open" }
      ],
      tips: ""
    },
    {
      id: "d-major",
      name: "D major",
      root: "D",
      quality: "major",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "open" },
        { string: 3, action: "fret", fret: 2, finger: "index" },
        { string: 2, action: "fret", fret: 3, finger: "ring" },
        { string: 1, action: "fret", fret: 2, finger: "middle" }
      ],
      tips: "The three fretted strings form a small triangle; the ring finger sits one fret past the other two."
    },

    // --- Minor chords ---
    {
      id: "a-minor",
      name: "A minor",
      root: "A",
      quality: "minor",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "open" },
        { string: 4, action: "fret", fret: 2, finger: "middle" },
        { string: 3, action: "fret", fret: 2, finger: "ring" },
        { string: 2, action: "fret", fret: 1, finger: "index" },
        { string: 1, action: "open" }
      ],
      tips: ""
    },
    {
      id: "e-minor",
      name: "E minor",
      root: "E",
      quality: "minor",
      strings: [
        { string: 6, action: "open" },
        { string: 5, action: "fret", fret: 2, finger: "middle" },
        { string: 4, action: "fret", fret: 2, finger: "ring" },
        { string: 3, action: "open" },
        { string: 2, action: "open" },
        { string: 1, action: "open" }
      ],
      tips: "Often the first chord people learn: two fingers, and every string is played."
    },
    {
      id: "d-minor",
      name: "D minor",
      root: "D",
      quality: "minor",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "open" },
        { string: 3, action: "fret", fret: 2, finger: "middle" },
        { string: 2, action: "fret", fret: 3, finger: "ring" },
        { string: 1, action: "fret", fret: 1, finger: "index" }
      ],
      tips: ""
    },

    // --- Dominant 7th chords ---
    {
      id: "a7",
      name: "A7",
      root: "A",
      quality: "dom7",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "open" },
        { string: 4, action: "fret", fret: 2, finger: "middle" },
        { string: 3, action: "open" },
        { string: 2, action: "fret", fret: 2, finger: "ring" },
        { string: 1, action: "open" }
      ],
      tips: "Like A major, but the 3rd string stays open."
    },
    {
      id: "b7",
      name: "B7",
      root: "B",
      quality: "dom7",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", fret: 2, finger: "middle" },
        { string: 4, action: "fret", fret: 1, finger: "index" },
        { string: 3, action: "fret", fret: 2, finger: "ring" },
        { string: 2, action: "open" },
        { string: 1, action: "fret", fret: 2, finger: "pinky" }
      ],
      tips: "This chord uses all four fingers."
    },
    {
      id: "c7",
      name: "C7",
      root: "C",
      quality: "dom7",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", fret: 3, finger: "ring" },
        { string: 4, action: "fret", fret: 2, finger: "middle" },
        { string: 3, action: "fret", fret: 3, finger: "pinky" },
        { string: 2, action: "fret", fret: 1, finger: "index" },
        { string: 1, action: "open" }
      ],
      tips: "C major with the pinky added on the 3rd string."
    },
    {
      id: "d7",
      name: "D7",
      root: "D",
      quality: "dom7",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "open" },
        { string: 3, action: "fret", fret: 2, finger: "middle" },
        { string: 2, action: "fret", fret: 1, finger: "index" },
        { string: 1, action: "fret", fret: 2, finger: "ring" }
      ],
      tips: "The mirror image of D major: the index finger is now the one closest to the nut."
    },
    {
      id: "e7",
      name: "E7",
      root: "E",
      quality: "dom7",
      strings: [
        { string: 6, action: "open" },
        { string: 5, action: "fret", fret: 2, finger: "middle" },
        { string: 4, action: "open" },
        { string: 3, action: "fret", fret: 1, finger: "index" },
        { string: 2, action: "open" },
        { string: 1, action: "open" }
      ],
      tips: "E major with the ring finger lifted."
    },
    {
      id: "g7",
      name: "G7",
      root: "G",
      quality: "dom7",
      strings: [
        { string: 6, action: "fret", fret: 3, finger: "ring" },
        { string: 5, action: "fret", fret: 2, finger: "middle" },
        { string: 4, action: "open" },
        { string: 3, action: "open" },
        { string: 2, action: "open" },
        { string: 1, action: "fret", fret: 1, finger: "index" }
      ],
      tips: ""
    }
  ];
})();
