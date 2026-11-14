// triads.js — movable major and minor triad shapes, all three inversions,
// on all four string groups. Same movable-shape schema as power-chords.js:
// one anchor entry (the root, offset 0); other frets are offsets from it.
// stringSet groups the shapes on the page: "123" = strings 1 to 3,
// "234" = strings 2 to 4, "345" = strings 3 to 5, "456" = strings 4 to 6.
// fretRange spans a full 12-fret window so every root note has exactly one
// playable position per shape. Strings 6 to 3 are all a fourth apart (no B
// string shift), so "345" and "456" share offsets and fingers, and neither
// is copied from "234". Each triad keeps one example, to keep the page
// short (maintainer decision, 2026-11-13).
// Fingering rule (maintainer-tested, 2026-11-13): when the two thinner
// strings of a triad share a fret and the thickest string sits at another
// fret, the index finger flattens across the two as a small barre. Shapes
// with all three strings at one fret keep three fingers, as in open A.
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
      variantLabel: "strings 1 to 3",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 0, finger: "middle", role: "root", anchor: true },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "third" },
        { string: 1, action: "fret", offset: -2, finger: "index", role: "fifth" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "C", anchorFret: 5 }
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
      variantLabel: "strings 1 to 3",
      barres: [{ finger: "index", offset: 0, fromString: 2, toString: 1 }],
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 1, finger: "ring", role: "third" },
        { string: 2, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 1, action: "fret", offset: 0, finger: "index", role: "root", anchor: true }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "G", anchorFret: 3 }
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
      variantLabel: "strings 1 to 3",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 1, action: "fret", offset: -1, finger: "middle", role: "third" }
      ],
      fretRange: [2, 13],
      examples: [
        { root: "D", anchorFret: 3 }
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
      variantLabel: "strings 1 to 3",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 2, action: "fret", offset: -1, finger: "middle", role: "third" },
        { string: 1, action: "fret", offset: -2, finger: "index", role: "fifth" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "D", anchorFret: 7 }
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
      variantLabel: "strings 1 to 3",
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
        { root: "A", anchorFret: 5 }
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
      variantLabel: "strings 1 to 3",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "mute" },
        { string: 3, action: "fret", offset: -1, finger: "middle", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 1, action: "fret", offset: -2, finger: "index", role: "third" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "D", anchorFret: 3 }
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
      variantLabel: "strings 2 to 4",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 3, action: "fret", offset: -1, finger: "middle", role: "third" },
        { string: 2, action: "fret", offset: -2, finger: "index", role: "fifth" },
        { string: 1, action: "mute" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "G", anchorFret: 5 }
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
      variantLabel: "strings 2 to 4",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 1, finger: "ring", role: "third" },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "middle", role: "root", anchor: true },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 13],
      examples: [
        { root: "D", anchorFret: 3 }
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
      variantLabel: "strings 2 to 4",
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
        { root: "A", anchorFret: 2 }
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
      variantLabel: "strings 2 to 4",
      barres: [{ finger: "index", offset: -2, fromString: 3, toString: 2 }],
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 3, action: "fret", offset: -2, finger: "index", role: "third" },
        { string: 2, action: "fret", offset: -2, finger: "index", role: "fifth" },
        { string: 1, action: "mute" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "G", anchorFret: 5 }
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
      variantLabel: "strings 2 to 4",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "middle", role: "third" },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "fifth" },
        { string: 2, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 13],
      examples: [
        { root: "G", anchorFret: 8 }
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
      variantLabel: "strings 2 to 4",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "mute" },
        { string: 4, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 3, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 2, action: "fret", offset: -1, finger: "index", role: "third" },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 13],
      examples: [
        { root: "A", anchorFret: 2 }
      ],
      tips: "The three fretted strings of the open A minor chord are exactly this grip, with the root at the 2nd fret."
    },

    // --- Strings 3 to 5 (sounding strings: 5th, 4th, 3rd) ---
    // The strings 4 to 6 grips moved one string thinner: strings 5, 4, and 3
    // are a fourth apart too, so offsets and fingers match "456" exactly.
    {
      id: "triad-345-major-root",
      name: "Major triad, root position, strings 3 to 5",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "345",
      variantLabel: "strings 3 to 5",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "pinky", role: "root", anchor: true },
        { string: 4, action: "fret", offset: -1, finger: "ring", role: "third" },
        { string: 3, action: "fret", offset: -3, finger: "index", role: "fifth" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [4, 15],
      examples: [
        { root: "D", anchorFret: 5 }
      ],
      tips: "Same grip as on strings 4 to 6, one string thinner."
    },
    {
      id: "triad-345-major-first",
      name: "Major triad, first inversion, strings 3 to 5",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "345",
      variantLabel: "strings 3 to 5",
      barres: [{ finger: "index", offset: 0, fromString: 4, toString: 3 }],
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 2, finger: "ring", role: "third" },
        { string: 4, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 3, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "C", anchorFret: 5 }
      ],
      tips: "Same grip as on strings 4 to 6, one string thinner."
    },
    {
      id: "triad-345-major-second",
      name: "Major triad, second inversion, strings 3 to 5",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "345",
      variantLabel: "strings 3 to 5",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 4, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 3, action: "fret", offset: -1, finger: "index", role: "third" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 13],
      examples: [
        { root: "E", anchorFret: 2 }
      ],
      tips: "The open E major chord uses exactly this grip, with the root at the 2nd fret."
    },
    {
      id: "triad-345-minor-root",
      name: "Minor triad, root position, strings 3 to 5",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "345",
      variantLabel: "strings 3 to 5",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "pinky", role: "root", anchor: true },
        { string: 4, action: "fret", offset: -2, finger: "middle", role: "third" },
        { string: 3, action: "fret", offset: -3, finger: "index", role: "fifth" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [4, 15],
      examples: [
        { root: "D", anchorFret: 5 }
      ],
      tips: "Same grip as on strings 4 to 6, one string thinner."
    },
    {
      id: "triad-345-minor-first",
      name: "Minor triad, first inversion, strings 3 to 5",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "345",
      variantLabel: "strings 3 to 5",
      barres: [{ finger: "index", offset: 0, fromString: 4, toString: 3 }],
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 1, finger: "ring", role: "third" },
        { string: 4, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 3, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "A", anchorFret: 2 }
      ],
      tips: "Same grip as on strings 4 to 6, one string thinner."
    },
    {
      id: "triad-345-minor-second",
      name: "Minor triad, second inversion, strings 3 to 5",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "345",
      variantLabel: "strings 3 to 5",
      strings: [
        { string: 6, action: "mute" },
        { string: 5, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 4, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 3, action: "fret", offset: -2, finger: "index", role: "third" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "G", anchorFret: 5 }
      ],
      tips: "Same grip as on strings 4 to 6, one string thinner."
    },

    // --- Strings 4 to 6 (sounding strings: 6th, 5th, 4th) ---
    {
      id: "triad-456-major-root",
      name: "Major triad, root position, strings 4 to 6",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "456",
      variantLabel: "strings 4 to 6",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "pinky", role: "root", anchor: true },
        { string: 5, action: "fret", offset: -1, finger: "ring", role: "third" },
        { string: 4, action: "fret", offset: -3, finger: "index", role: "fifth" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [4, 15],
      examples: [
        { root: "A", anchorFret: 5 }
      ],
      tips: ""
    },
    {
      id: "triad-456-major-first",
      name: "Major triad, first inversion, strings 4 to 6",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "456",
      variantLabel: "strings 4 to 6",
      barres: [{ finger: "index", offset: 0, fromString: 5, toString: 4 }],
      strings: [
        { string: 6, action: "fret", offset: 2, finger: "ring", role: "third" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 4, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "G", anchorFret: 5 }
      ],
      tips: ""
    },
    {
      id: "triad-456-major-second",
      name: "Major triad, second inversion, strings 4 to 6",
      quality: "major",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "456",
      variantLabel: "strings 4 to 6",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 5, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 4, action: "fret", offset: -1, finger: "index", role: "third" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [2, 13],
      examples: [
        { root: "C", anchorFret: 3 }
      ],
      tips: "The fingers make the same grip as in the open E major chord, with each finger moved to the next thicker string."
    },
    {
      id: "triad-456-minor-root",
      name: "Minor triad, root position, strings 4 to 6",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "root",
      stringSet: "456",
      variantLabel: "strings 4 to 6",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "pinky", role: "root", anchor: true },
        { string: 5, action: "fret", offset: -2, finger: "middle", role: "third" },
        { string: 4, action: "fret", offset: -3, finger: "index", role: "fifth" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [4, 15],
      examples: [
        { root: "A", anchorFret: 5 }
      ],
      tips: ""
    },
    {
      id: "triad-456-minor-first",
      name: "Minor triad, first inversion, strings 4 to 6",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "first",
      stringSet: "456",
      variantLabel: "strings 4 to 6",
      barres: [{ finger: "index", offset: 0, fromString: 5, toString: 4 }],
      strings: [
        { string: 6, action: "fret", offset: 1, finger: "ring", role: "third" },
        { string: 5, action: "fret", offset: 0, finger: "index", role: "fifth" },
        { string: 4, action: "fret", offset: 0, finger: "index", role: "root", anchor: true },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [1, 12],
      examples: [
        { root: "E", anchorFret: 2 }
      ],
      tips: ""
    },
    {
      id: "triad-456-minor-second",
      name: "Minor triad, second inversion, strings 4 to 6",
      quality: "minor",
      family: "triad",
      kind: "movable",
      inversion: "second",
      stringSet: "456",
      variantLabel: "strings 4 to 6",
      strings: [
        { string: 6, action: "fret", offset: 0, finger: "middle", role: "fifth" },
        { string: 5, action: "fret", offset: 0, finger: "ring", role: "root", anchor: true },
        { string: 4, action: "fret", offset: -2, finger: "index", role: "third" },
        { string: 3, action: "mute" },
        { string: 2, action: "mute" },
        { string: 1, action: "mute" }
      ],
      fretRange: [3, 14],
      examples: [
        { root: "D", anchorFret: 5 }
      ],
      tips: ""
    }
  ];
})();
