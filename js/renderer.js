// renderer.js — generates every piece of description text on the site.
// Pure functions only: no DOM, no storage. Loads as a classic script in the
// browser and via require() in Node (tools/validate.js), through globalThis.AGR.
//
// Grammar contract (see conventions.html):
// - "higher" and "lower" always mean pitch; the words up, down, left, and
//   right never appear in generated text.
// - Muted strings are always explicit: "do not play".
// - Sharps and flats are always spelled out ("F sharp"), never symbols.
// - Fingers are always named (index, middle, ring, pinky, thumb), never numbered.
// - stringLabel() is the only place string-naming logic lives; every string
//   reference in every format goes through it.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  var FINGER_ORDER = ["index", "middle", "ring", "pinky", "thumb"];
  var COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven", "twelve"];
  var INVERSION_LABEL = {
    root: "root position",
    first: "first inversion",
    second: "second inversion"
  };

  function ordinal(n) {
    var mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return n + "th";
    var last = n % 10;
    if (last === 1) return n + "st";
    if (last === 2) return n + "nd";
    if (last === 3) return n + "rd";
    return n + "th";
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function displayNote(spelling) {
    var display = AGR.displayNote[spelling];
    if (!display) throw new Error("No display spelling for note: " + spelling);
    return display;
  }

  function fingerPhrase(finger) {
    return finger === "thumb" ? "thumb" : finger + " finger";
  }

  // The only place string-naming logic lives.
  function stringLabel(stringNumber, naming) {
    var note = AGR.stringNoteName[stringNumber];
    if (naming === "number") return ordinal(stringNumber) + " string";
    if (naming === "name") return note + " string";
    return ordinal(stringNumber) + " string (" + note + ")";
  }

  // Compact label for summary lines like "Open strings: 3rd (G) and 1st (high E)."
  function stringLabelShort(stringNumber, naming) {
    var note = AGR.stringNoteName[stringNumber];
    if (naming === "number") return ordinal(stringNumber);
    if (naming === "name") return note;
    return ordinal(stringNumber) + " (" + note + ")";
  }

  function joinList(items, conjunction) {
    var word = conjunction || "and";
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + " " + word + " " + items[1];
    return items.slice(0, -1).join(", ") + ", " + word + " " + items[items.length - 1];
  }

  function byAction(item, action) {
    return item.strings.filter(function (entry) { return entry.action === action; });
  }

  // Strum guidance is always derived from the data, never stored.
  // Works for both concrete chords and movable shapes (frets are irrelevant).
  function strumText(item, naming) {
    var sounding = item.strings
      .filter(function (entry) { return entry.action !== "mute"; })
      .map(function (entry) { return entry.string; });
    var lowest = sounding[0];
    var contiguousToFirst = sounding.length === lowest &&
      sounding.every(function (s, i) { return s === lowest - i; });
    if (contiguousToFirst) {
      if (lowest === 6) return "Strum all six strings.";
      return "Strum from the " + stringLabel(lowest, naming) + ".";
    }
    return "Play only " + joinList(sounding.map(function (s) {
      return "the " + stringLabel(s, naming);
    })) + ".";
  }

  // --- Barre support ---
  // Per-string entries stay the single source of truth (every covered string
  // still records its fret and finger); the barres annotation only shapes the prose.

  function isCoveredByBarre(item, entry) {
    if (!item.barres || entry.action !== "fret") return false;
    return item.barres.some(function (b) {
      var sameFret = typeof b.fret === "number" ? entry.fret === b.fret : entry.offset === b.offset;
      return entry.finger === b.finger && sameFret &&
        entry.string <= b.fromString && entry.string >= b.toString;
    });
  }

  function barreSpan(b, naming) {
    var count = b.fromString - b.toString + 1;
    var countText = count === 6 ? "all six strings" : COUNT_WORDS[count] + " strings";
    return countText + ", from the " + stringLabel(b.fromString, naming) +
      " through the " + stringLabel(b.toString, naming);
  }

  function barreAt(b) {
    if (typeof b.fret === "number") return "at the " + ordinal(b.fret) + " fret";
    if (b.offset === 0) return "at the root fret";
    return "at " + relativeFret({ offset: b.offset });
  }

  function barreParagraph(item, naming) {
    if (!item.barres || item.barres.length === 0) return "";
    return item.barres.map(function (b) {
      return "Barre " + barreSpan(b, naming) + ", with your " + fingerPhrase(b.finger) +
        ", " + barreAt(b) + ".";
    }).join(" ");
  }

  // --- Fret wording: concrete frets vs. movable-shape offsets ---

  function concreteFret(entry) {
    return ordinal(entry.fret) + " fret";
  }

  function relativeFret(entry) {
    if (entry.offset === 0) return "the root fret";
    var amount = COUNT_WORDS[Math.abs(entry.offset)] || String(Math.abs(entry.offset));
    var unit = Math.abs(entry.offset) === 1 ? " fret " : " frets ";
    return amount + unit + (entry.offset > 0 ? "higher" : "lower") + " than the root fret";
  }

  // Which chord tone a movable-shape string sounds: "the root", "the third",
  // "the fifth", or "the root again, an octave higher" for octave doublings.
  // The root fret is a position; this phrase says what the string actually plays.
  function rolePhrase(shape, entry) {
    if (entry.role !== "root") return "the " + entry.role;
    var anchor = shape.strings.filter(function (e) { return e.anchor; })[0];
    var delta = (AGR.tuning.stringMidi[entry.string] + entry.offset) -
      (AGR.tuning.stringMidi[anchor.string] + anchor.offset);
    if (delta === 0) return "the root";
    var octaves = Math.abs(delta) / 12;
    var amount = octaves === 1 ? "an octave" : (COUNT_WORDS[octaves] || String(octaves)) + " octaves";
    return "the root again, " + amount + " " + (delta > 0 ? "higher" : "lower");
  }

  function roleSentence(shape, entry) {
    return " This note is " + rolePhrase(shape, entry) + ".";
  }

  // --- The three formats. They differ in organization, never in vocabulary. ---

  function perStringLines(item, naming, fretText, roleText) {
    return item.strings.map(function (entry) {
      var label = stringLabel(entry.string, naming);
      if (entry.action === "mute") return label + ": do not play.";
      if (entry.action === "open") return label + ": open.";
      var how = isCoveredByBarre(item, entry) ? "covered by the barre" : fingerPhrase(entry.finger);
      return label + ": " + fretText(entry) + ", " + how + "." +
        (roleText ? roleText(entry) : "");
    });
  }

  function byFingerLines(item, naming, fretText, roleText) {
    var lines = [];
    (item.barres || []).forEach(function (b) {
      lines.push(capitalize(fingerPhrase(b.finger)) + ": barre " + barreSpan(b, naming) +
        ", " + barreAt(b) + ".");
    });
    FINGER_ORDER.forEach(function (finger) {
      item.strings.forEach(function (entry) {
        if (entry.action === "fret" && entry.finger === finger && !isCoveredByBarre(item, entry)) {
          lines.push(capitalize(fingerPhrase(finger)) + ": " +
            stringLabel(entry.string, naming) + ", " + fretText(entry) + "." +
            (roleText ? roleText(entry) : ""));
        }
      });
    });
    var open = byAction(item, "open");
    if (open.length > 0) {
      lines.push((open.length === 1 ? "Open string: " : "Open strings: ") +
        joinList(open.map(function (entry) {
          return stringLabelShort(entry.string, naming);
        })) + ".");
    }
    var muted = byAction(item, "mute");
    if (muted.length > 0) {
      lines.push("Do not play: " + joinList(muted.map(function (entry) {
        return "the " + stringLabel(entry.string, naming);
      }), "or") + ".");
    }
    return lines;
  }

  function proseSentences(item, naming, isRelative) {
    var sentences = [];
    var barreText = barreParagraph(item, naming);
    if (barreText) sentences.push(barreText);
    var fretted = byAction(item, "fret").filter(function (entry) {
      return !isCoveredByBarre(item, entry);
    });
    if (fretted.length > 0) {
      sentences.push("Press " + joinList(fretted.map(function (entry) {
        var where = isRelative
          ? (entry.offset === 0 ? " at the root fret" : " " + relativeFret(entry))
          : " at the " + concreteFret(entry);
        return "the " + stringLabel(entry.string, naming) + where +
          " with your " + fingerPhrase(entry.finger);
      })) + ".");
    }
    if (isRelative && fretted.length > 0) {
      sentences.push(capitalize(joinList(fretted.map(function (entry) {
        return "the " + stringLabel(entry.string, naming) + " sounds " + rolePhrase(item, entry);
      }))) + ".");
    }
    var open = byAction(item, "open");
    if (open.length > 0) {
      sentences.push("Leave " + joinList(open.map(function (entry) {
        return "the " + stringLabel(entry.string, naming);
      })) + " open.");
    }
    var muted = byAction(item, "mute");
    if (muted.length > 0) {
      sentences.push("Do not play " + joinList(muted.map(function (entry) {
        return "the " + stringLabel(entry.string, naming);
      }), "or") + ".");
    }
    sentences.push(strumText(item, naming));
    return sentences.join(" ");
  }

  // --- Public API ---

  // Describe a chord with concrete frets.
  // Returns { kind: "list", lines, strum, tips } or { kind: "prose", text, tips }.
  function describeChord(chord, settings) {
    var naming = settings.stringNaming;
    if (settings.format === "prose") {
      return { kind: "prose", text: proseSentences(chord, naming, false), tips: chord.tips || "" };
    }
    if (settings.format === "by-finger") {
      // The barre gets its own finger line inside byFingerLines.
      return { kind: "list", lines: byFingerLines(chord, naming, concreteFret), strum: strumText(chord, naming), tips: chord.tips || "" };
    }
    return {
      kind: "list",
      barre: barreParagraph(chord, naming),
      lines: perStringLines(chord, naming, concreteFret),
      strum: strumText(chord, naming),
      tips: chord.tips || ""
    };
  }

  // Describe a movable shape relative to its root fret.
  // Same return shapes as describeChord, plus an "intro" sentence.
  function describeShapeRelative(shape, settings) {
    var naming = settings.stringNaming;
    var anchor = shape.strings.filter(function (entry) { return entry.anchor; })[0];
    var intro = "This shape is movable. The root note sits on the " +
      stringLabel(anchor.string, naming) +
      "; the fret you place it on is called the root fret, and the chord takes its name from that note.";
    if (settings.format === "prose") {
      return { kind: "prose", intro: intro, text: proseSentences(shape, naming, true), tips: shape.tips || "" };
    }
    var roleText = function (entry) { return roleSentence(shape, entry); };
    if (settings.format === "by-finger") {
      return { kind: "list", intro: intro, lines: byFingerLines(shape, naming, relativeFret, roleText), strum: strumText(shape, naming), tips: shape.tips || "" };
    }
    return {
      kind: "list",
      intro: intro,
      barre: barreParagraph(shape, naming),
      lines: perStringLines(shape, naming, relativeFret, roleText),
      strum: strumText(shape, naming),
      tips: shape.tips || ""
    };
  }

  function slugNote(note) {
    var letter = note.charAt(0).toLowerCase();
    var accidental = note.slice(1);
    if (accidental === "#") return letter + "-sharp";
    if (accidental === "b") return letter + "-flat";
    return letter;
  }

  // Name a chord produced from a shape at a concrete root.
  function instantiatedName(shape, example) {
    var rootDisplay = displayNote(example.root);
    if (shape.quality === "power") {
      // "G5" reads well; add a space only when the root has an accidental.
      return example.root.length === 1 ? rootDisplay + "5" : rootDisplay + " 5";
    }
    var quality = AGR.qualities[shape.quality].label;
    if (shape.family === "triad") {
      return rootDisplay + " " + quality + " triad, " + INVERSION_LABEL[shape.inversion];
    }
    return rootDisplay + " " + quality;
  }

  // Turn a movable shape plus an example root into an ordinary concrete chord.
  // The result flows through describeChord and the validator like any other chord.
  function instantiateShape(shape, example) {
    var strings = shape.strings.map(function (entry) {
      if (entry.action !== "fret") return { string: entry.string, action: entry.action };
      return {
        string: entry.string,
        action: "fret",
        fret: example.anchorFret + entry.offset,
        finger: entry.finger
      };
    });
    var chord = {
      id: shape.id + "-" + slugNote(example.root) + "-" + example.anchorFret,
      name: instantiatedName(shape, example),
      root: example.root,
      quality: shape.quality,
      inversion: shape.inversion,
      strings: strings,
      tips: ""
    };
    if (shape.barres) {
      chord.barres = shape.barres.map(function (b) {
        return {
          finger: b.finger,
          fret: example.anchorFret + b.offset,
          fromString: b.fromString,
          toString: b.toString
        };
      });
    }
    return chord;
  }

  // All anchor frets where this shape can play the given root pitch class.
  // Shared by the chord finder page and the validator's all-roots sweep.
  function shapePositions(shape, rootPc) {
    var anchor = shape.strings.filter(function (e) { return e.anchor; })[0];
    var openPc = AGR.tuning.stringMidi[anchor.string] % 12;
    var distance = ((rootPc - openPc) % 12 + 12) % 12;
    var lo = shape.fretRange ? shape.fretRange[0] : 1;
    var hi = shape.fretRange ? shape.fretRange[1] : 12;
    return [distance, distance + 12, distance + 24].filter(function (fret) {
      return fret >= 1 && fret >= lo && fret <= hi;
    });
  }

  AGR.render = {
    describeChord: describeChord,
    describeShapeRelative: describeShapeRelative,
    instantiateShape: instantiateShape,
    shapePositions: shapePositions,
    isCoveredByBarre: isCoveredByBarre,
    slugNote: slugNote,
    stringLabel: stringLabel,
    ordinal: ordinal,
    displayNote: displayNote
  };
})();
