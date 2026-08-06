// octaves.js — the four movable octave shapes: the same note in two places.
// These are the note-finding workhorses: learn the notes of the 6th and 5th
// strings, and the octave shapes hand you the other four strings.
// Same movable schema as the chord shapes; quality "octave" means the two
// notes must be the same pitch class, which the validator proves at all roots.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  globalThis.AGR.octaveShapes = [
    {
      id: "octave-6-to-4",
      name: "Octave shape, from the 6th string to the 4th string",
      quality: "octave",
      family: "octave",
      kind: "movable",
      inversion: "root",
      variantLabel: "6th string to 4th string",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 2, finger: "ring", role: "root" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "G", anchorFret: 3 },
        { root: "A", anchorFret: 5 }
      ],
      tips: "Let the underside of the index finger rest against the 5th string so the string between the two notes stays silent."
    },
    {
      id: "octave-5-to-3",
      name: "Octave shape, from the 5th string to the 3rd string",
      quality: "octave",
      family: "octave",
      kind: "movable",
      inversion: "root",
      variantLabel: "5th string to 3rd string",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 2, finger: "ring", role: "root" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "C", anchorFret: 3 },
        { root: "E", anchorFret: 7 }
      ],
      tips: ""
    },
    {
      id: "octave-4-to-2",
      name: "Octave shape, from the 4th string to the 2nd string",
      quality: "octave",
      family: "octave",
      kind: "movable",
      inversion: "root",
      variantLabel: "4th string to 2nd string",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 3, action: "mute" },
        { string: 2, action: "fret", offset: 3, finger: "pinky", role: "root" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "F", anchorFret: 3 },
        { root: "A", anchorFret: 7 }
      ],
      tips: "From here toward the thinner strings the reach grows to three frets; that is the B string shifting everything by one fret."
    },
    {
      id: "octave-3-to-1",
      name: "Octave shape, from the 3rd string to the 1st string",
      quality: "octave",
      family: "octave",
      kind: "movable",
      inversion: "root",
      variantLabel: "3rd string to 1st string",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 2, action: "mute" },
        { string: 1, action: "fret", offset: 3, finger: "pinky", role: "root" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "C", anchorFret: 5 },
        { root: "D", anchorFret: 7 }
      ],
      tips: ""
    }
  ];
})();
