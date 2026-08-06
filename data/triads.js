// triads.js — movable major and minor triad shapes, all three inversions,
// on two string groups. Same movable-shape schema as power-chords.js:
// one anchor entry (the root, offset 0); other frets are offsets from it.
// stringSet groups the shapes on the page: "123" = strings 1 to 3,
// "234" = strings 2 to 4.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  globalThis.AGR.triadShapes = [

    // --- Strings 1 to 3 (sounding strings: 3rd, 2nd, 1st) ---
    {
      id: "triad-123-major-root",
      name: "Major triad, root position, strings 1 to 3",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "123",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 0, finger: "middle", role: "root", anchor: true },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "third" },
        { string: 1, action: "fret", offset: -2, finger: "index", role: "fifth" }
      ],
      fretRange: [3, 12],
      examples: [
        { root: "C", anchorFret: 5 },
        { root: "D", anchorFret: 7 }
      ],
      tips: ""
    },
    {
      id: "triad-123-major-first",
      name: "Major triad, first inversion, strings 1 to 3",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "123",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 1, finger: "ring", role: "third" },
        { string: 2, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 1, action: "fret", offset: 0, finger: "middle", role: "root", anchor: true }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "G", anchorFret: 3 },
        { root: "C", anchorFret: 8 }
      ],
      tips: ""
    },
    {
      id: "triad-123-major-second",
      name: "Major triad, second inversion, strings 1 to 3",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "123",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 1, action: "fret", offset: -1, finger: "middle", role: "third" }
      ],
      fretRange: [2, 12],
      examples: [
        { root: "D", anchorFret: 3 },
        { root: "G", anchorFret: 8 }
      ],
      tips: "The open D major chord uses exactly this grip, with the root at the 3rd fret."
    },
    {
      id: "triad-123-minor-root",
      name: "Minor triad, root position, strings 1 to 3",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "123",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 2, action: "fret", offset: -1, finger: "middle", role: "third" },
        { string: 1, action: "fret", offset: -2, finger: "index", role: "fifth" }
      ],
      fretRange: [3, 12],
      examples: [
        { root: "D", anchorFret: 7 },
        { root: "E", anchorFret: 9 }
      ],
      tips: ""
    },
    {
      id: "triad-123-minor-first",
      name: "Minor triad, first inversion, strings 1 to 3",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "123",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 0, finger: "index", role: "third" },
        { string: 2, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 1, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "A", anchorFret: 5 },
        { root: "D", anchorFret: 10 }
      ],
      tips: "All three fingers sit at the same fret, one per string."
    },
    {
      id: "triad-123-minor-second",
      name: "Minor triad, second inversion, strings 1 to 3",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "123",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: -1, finger: "middle", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 1, action: "fret", offset: -2, finger: "index", role: "third" }
      ],
      fretRange: [3, 12],
      examples: [
        { root: "D", anchorFret: 3 },
        { root: "A", anchorFret: 10 }
      ],
      tips: "The open D minor chord uses exactly this grip, with the root at the 3rd fret."
    },

    // --- Strings 2 to 4 (sounding strings: 4th, 3rd, 2nd) ---
    {
      id: "triad-234-major-root",
      name: "Major triad, root position, strings 2 to 4",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "234",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 3, action: "fret", offset: -1, finger: "middle", role: "third" },
        { string: 2, action: "fret", offset: -2, finger: "index", role: "fifth" },
        { string: 1, action: "mute" }
      ],
      fretRange: [3, 12],
      examples: [
        { root: "G", anchorFret: 5 },
        { root: "C", anchorFret: 10 }
      ],
      tips: ""
    },
    {
      id: "triad-234-major-first",
      name: "Major triad, first inversion, strings 2 to 4",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "234",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 1, finger: "ring", role: "third" },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "middle", role: "root", anchor: true }
      ,
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 12],
      examples: [
        { root: "D", anchorFret: 3 },
        { root: "G", anchorFret: 8 }
      ],
      tips: ""
    },
    {
      id: "triad-234-major-second",
      name: "Major triad, second inversion, strings 2 to 4",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "234",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 3, action: "fret", offset: 0, finger: "middle", role: "root", anchor: true },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "third" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "A", anchorFret: 2 },
        { root: "C", anchorFret: 5 }
      ],
      tips: "The three fretted strings of the open A major chord are exactly this grip, with the root at the 2nd fret."
    },
    {
      id: "triad-234-minor-root",
      name: "Minor triad, root position, strings 2 to 4",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "234",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 3, action: "fret", offset: -2, finger: "index", role: "third" },
        { string: 2, action: "fret", offset: -2, finger: "middle", role: "fifth" },
        { string: 1, action: "mute" }
      ],
      fretRange: [3, 12],
      examples: [
        { root: "G", anchorFret: 5 },
        { root: "A", anchorFret: 7 }
      ],
      tips: ""
    },
    {
      id: "triad-234-minor-first",
      name: "Minor triad, first inversion, strings 2 to 4",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "234",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "middle", role: "third" },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 12],
      examples: [
        { root: "G", anchorFret: 8 },
        { root: "D", anchorFret: 3 }
      ],
      tips: ""
    },
    {
      id: "triad-234-minor-second",
      name: "Minor triad, second inversion, strings 2 to 4",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "234",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 3, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 2, action: "fret", offset: -1, finger: "index", role: "third" },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 12],
      examples: [
        { root: "A", anchorFret: 2 },
        { root: "D", anchorFret: 7 }
      ],
      tips: "The three fretted strings of the open A minor chord are exactly this grip, with the root at the 2nd fret."
    }
  ];
})();
