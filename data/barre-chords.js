// barre-chords.js — movable full-chord barre shapes: the E and A shapes,
// major and minor. Same movable schema as power-chords.js and triads.js,
// plus a "barres" annotation: per-string entries remain the source of truth
// (every covered string still records its offset and finger); the annotation
// drives the barre prose.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  globalThis.AGR.barreShapes = [
    {
      id: "barre-e-major",
      name: "Major barre chord, E shape, root on the 6th string",
      quality: "major",
      family: "barre",
      kind: "movable",
      inversion: "root",
      variantLabel: "E shape",
      barres: [{ finger: "index", offset: 0, fromString: 6, toString: 1 }],
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 5, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 4, action: "fret", offset: 2, finger: "pinky", role: "root" },
        { string: 3, action: "fret", offset: 1, finger: "middle", role: "third" },
        { string: 2, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 1, action: "fret", offset: 0, finger: "index", role: "root" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "F", anchorFret: 1 },
        { root: "A", anchorFret: 5 }
      ],
      tips: "This is the open E major grip with your index finger replacing the nut. Press the barre with the bony edge of the finger, close behind the fret wire, and let your thumb rest on the back of the neck."
    },
    {
      id: "barre-e-minor",
      name: "Minor barre chord, E shape, root on the 6th string",
      quality: "minor",
      family: "barre",
      kind: "movable",
      inversion: "root",
      variantLabel: "E shape",
      barres: [{ finger: "index", offset: 0, fromString: 6, toString: 1 }],
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 5, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 4, action: "fret", offset: 2, finger: "pinky", role: "root" },
        { string: 3, action: "fret", offset: 0, finger: "index", role: "third" },
        { string: 2, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 1, action: "fret", offset: 0, finger: "index", role: "root" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "F#", anchorFret: 2 },
        { root: "A", anchorFret: 5 }
      ],
      tips: "The open E minor grip with a barre. The 3rd string rings under the barre itself, which is what makes the chord minor."
    },
    {
      id: "barre-a-major",
      name: "Major barre chord, A shape, root on the 5th string",
      quality: "major",
      family: "barre",
      kind: "movable",
      inversion: "root",
      variantLabel: "A shape",
      barres: [{ finger: "index", offset: 0, fromString: 5, toString: 1 }],
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 4, action: "fret", offset: 2, finger: "middle", role: "fifth" },
        { string: 3, action: "fret", offset: 2, finger: "ring", role: "root" },
        { string: 2, action: "fret", offset: 2, finger: "pinky", role: "third" },
        { string: 1, action: "fret", offset: 0, finger: "index", role: "fifth" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "B", anchorFret: 2 },
        { root: "C", anchorFret: 3 }
      ],
      tips: "The open A major grip with a barre. Many players flatten the ring finger across the 4th, 3rd, and 2nd strings instead of using three separate fingers; both are correct."
    },
    {
      id: "barre-a-minor",
      name: "Minor barre chord, A shape, root on the 5th string",
      quality: "minor",
      family: "barre",
      kind: "movable",
      inversion: "root",
      variantLabel: "A shape",
      barres: [{ finger: "index", offset: 0, fromString: 5, toString: 1 }],
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 4, action: "fret", offset: 2, finger: "ring", role: "fifth" },
        { string: 3, action: "fret", offset: 2, finger: "pinky", role: "root" },
        { string: 2, action: "fret", offset: 1, finger: "middle", role: "third" },
        { string: 1, action: "fret", offset: 0, finger: "index", role: "fifth" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "B", anchorFret: 2 },
        { root: "D", anchorFret: 5 }
      ],
      tips: "The open A minor grip with a barre."
    }
  ];
})();
