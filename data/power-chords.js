// power-chords.js — the "5" chords: open power chords plus movable shapes.
// Fixed chords use the same schema as open-chords.js.
// Movable shapes use offsets from an anchor: exactly one fretted entry has
// anchor: true with offset 0 (the root); other frets are measured from it.
// Every fretted entry declares its role so the validator can prove the music.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  // Open power chords (fixed).
  globalThis.AGR.powerChords = [
    {
      id: "e5",
      name: "E5",
      root: "E",
      quality: "power",
      strings: [
        { string: 6, action: "open" },
        { string: 5, action: "fret", fret: 2, finger: "index" },
        { string: 4, action: "mute" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      tips: "Let the tip of your index finger rest lightly against the 4th string to keep it quiet."
    },
    {
      id: "a5",
      name: "A5",
      root: "A",
      quality: "power",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "open" },
        { string: 4, action: "fret", fret: 2, finger: "index" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      tips: ""
    },
    {
      id: "d5",
      name: "D5",
      root: "D",
      quality: "power",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "open" },
        { string: 3, action: "fret", fret: 2, finger: "index" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      tips: ""
    }
  ];

  // Movable power chord shapes.
  globalThis.AGR.powerShapes = [
    {
      id: "power-root6-two-finger",
      name: "Power chord with the root on the 6th string, two fingers",
      quality: "power",
      family: "power",
      kind: "movable",
      inversion: "root",
      variantLabel: "root on the 6th string, two fingers",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 5, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 4, action: "mute" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "G", anchorFret: 3 },
        { root: "A", anchorFret: 5 }
      ],
      tips: "Lean the underside of your index finger gently against the thinner strings so only two strings sound."
    },
    {
      id: "power-root6-three-finger",
      name: "Power chord with the root on the 6th string, three fingers",
      quality: "power",
      family: "power",
      kind: "movable",
      inversion: "root",
      variantLabel: "root on the 6th string, three fingers",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 5, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 4, action: "fret", offset: 2, finger: "pinky", role: "root" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "G", anchorFret: 3 },
        { root: "C", anchorFret: 8 }
      ],
      tips: "The pinky adds the root note an octave higher, for a fuller sound."
    },
    {
      id: "power-root5-two-finger",
      name: "Power chord with the root on the 5th string, two fingers",
      quality: "power",
      family: "power",
      kind: "movable",
      inversion: "root",
      variantLabel: "root on the 5th string, two fingers",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 4, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "C", anchorFret: 3 },
        { root: "D", anchorFret: 5 }
      ],
      tips: "Let the tip of your index finger touch the 6th string so it stays silent."
    },
    {
      id: "power-root5-three-finger",
      name: "Power chord with the root on the 5th string, three fingers",
      quality: "power",
      family: "power",
      kind: "movable",
      inversion: "root",
      variantLabel: "root on the 5th string, three fingers",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 4, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 3, action: "fret", offset: 2, finger: "pinky", role: "root" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "C", anchorFret: 3 },
        { root: "E", anchorFret: 7 }
      ],
      tips: ""
    }
  ];
})();
