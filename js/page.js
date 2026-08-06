// page.js — browser-only glue. Builds page content from data using the renderer.
// Must be the last script tag on the page; it relies on the data files,
// settings.js, and renderer.js having loaded first (classic scripts, in order).
(function () {
  "use strict";

  var AGR = globalThis.AGR || {};
  if (!AGR.render || !document.body) return;

  var category = document.body.getAttribute("data-category");
  if (!category) return;

  var settings = AGR.settings.get();

  function el(tag, text, attrs) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  // Turn a renderer description into DOM nodes.
  function descriptionNodes(desc) {
    var nodes = [];
    if (desc.intro) nodes.push(el("p", desc.intro, { "class": "shape-intro" }));
    if (desc.barre) nodes.push(el("p", desc.barre));
    if (desc.kind === "prose") {
      nodes.push(el("p", desc.text));
    } else {
      var ul = document.createElement("ul");
      desc.lines.forEach(function (line) {
        ul.appendChild(el("li", line));
      });
      nodes.push(ul);
      if (desc.strum) nodes.push(el("p", desc.strum));
    }
    if (desc.tips) nodes.push(el("p", "Tip: " + desc.tips, { "class": "tip" }));
    return nodes;
  }

  function appendNodes(container, nodes) {
    nodes.forEach(function (node) { container.appendChild(node); });
  }

  function addTocEntry(toc, id, name) {
    if (!toc) return;
    var li = document.createElement("li");
    var a = el("a", name, { href: "#" + id });
    li.appendChild(a);
    toc.appendChild(li);
  }

  function appendChord(container, toc, chord) {
    container.appendChild(el("h3", chord.name, { id: chord.id }));
    appendNodes(container, descriptionNodes(AGR.render.describeChord(chord, settings)));
    addTocEntry(toc, chord.id, chord.name);
  }

  function appendShape(container, toc, shape) {
    container.appendChild(el("h3", shape.name, { id: shape.id }));
    appendNodes(container, descriptionNodes(AGR.render.describeShapeRelative(shape, settings)));
    container.appendChild(el("h4", "Examples"));
    var anchor = shape.strings.filter(function (entry) { return entry.anchor; })[0];
    shape.examples.forEach(function (example) {
      var chord = AGR.render.instantiateShape(shape, example);
      container.appendChild(el("p",
        chord.name + ". Root at the " + AGR.render.ordinal(example.anchorFret) +
        " fret of the " + AGR.render.stringLabel(anchor.string, settings.stringNaming) + ".",
        { "class": "example-lead" }));
      appendNodes(container, descriptionNodes(AGR.render.describeChord(chord, settings)));
    });
    addTocEntry(toc, shape.id, shape.name);
  }

  function content() { return document.getElementById("content"); }
  function toc() { return document.getElementById("toc-list"); }

  function renderOpenChords() {
    var groups = [
      ["major", "Major chords"],
      ["minor", "Minor chords"],
      ["dom7", "Dominant 7th chords"]
    ];
    groups.forEach(function (group) {
      content().appendChild(el("h2", group[1]));
      AGR.openChords
        .filter(function (chord) { return chord.quality === group[0]; })
        .forEach(function (chord) { appendChord(content(), toc(), chord); });
    });
  }

  function renderPowerChords() {
    content().appendChild(el("h2", "Open power chords"));
    AGR.powerChords.forEach(function (chord) { appendChord(content(), toc(), chord); });
    content().appendChild(el("h2", "Movable power chord shapes"));
    AGR.powerShapes.forEach(function (shape) { appendShape(content(), toc(), shape); });
  }

  function renderTriads() {
    var groups = [
      ["123", "Triads on strings 1 to 3"],
      ["234", "Triads on strings 2 to 4"]
    ];
    groups.forEach(function (group) {
      content().appendChild(el("h2", group[1]));
      AGR.triadShapes
        .filter(function (shape) { return shape.stringSet === group[0]; })
        .forEach(function (shape) { appendShape(content(), toc(), shape); });
    });
  }

  function renderBarreChords() {
    var groups = [
      ["major", "Major barre shapes"],
      ["minor", "Minor barre shapes"]
    ];
    groups.forEach(function (group) {
      content().appendChild(el("h2", group[1]));
      AGR.barreShapes
        .filter(function (shape) { return shape.quality === group[0]; })
        .forEach(function (shape) { appendShape(content(), toc(), shape); });
    });
  }

  function renderFretboard() {
    var notesBox = content();
    var octavesBox = document.getElementById("octave-content");
    var tocUl = toc();
    for (var s = 6; s >= 1; s--) {
      var label = AGR.render.stringLabel(s, settings.stringNaming);
      var id = "string-" + s;
      notesBox.appendChild(el("h3", label, { id: id }));
      var ul = document.createElement("ul");
      AGR.render.fretboardStringLines(s, settings.stringNaming).forEach(function (line) {
        ul.appendChild(el("li", line));
      });
      notesBox.appendChild(ul);
      addTocEntry(tocUl, id, label);
    }
    AGR.octaveShapes.forEach(function (shape) {
      appendShape(octavesBox, tocUl, shape);
    });
  }

  // --- Chord finder ---

  var QUALITY_WORD = { major: "major", minor: "minor" };

  function appendVoicing(container, tocUl, shape, example) {
    var chord = AGR.render.instantiateShape(shape, example);
    var anchor = shape.strings.filter(function (e) { return e.anchor; })[0];
    var heading = chord.name + (shape.variantLabel ? ", " + shape.variantLabel : "");
    container.appendChild(el("h3", heading, { id: chord.id }));
    container.appendChild(el("p",
      "Root at the " + AGR.render.ordinal(example.anchorFret) + " fret of the " +
      AGR.render.stringLabel(anchor.string, settings.stringNaming) + ".",
      { "class": "example-lead" }));
    appendNodes(container, descriptionNodes(AGR.render.describeChord(chord, settings)));
    addTocEntry(tocUl, chord.id, heading);
  }

  function placedForRoot(shapes, pc) {
    var placed = [];
    shapes.forEach(function (shape) {
      AGR.render.shapePositions(shape, pc).forEach(function (fret) {
        placed.push({ shape: shape, fret: fret });
      });
    });
    placed.sort(function (a, b) { return a.fret - b.fret; });
    return placed;
  }

  function initChordFinder() {
    var rootSelect = document.getElementById("finder-root");
    var qualitySelect = document.getElementById("finder-quality");
    var status = document.getElementById("finder-status");

    function currentSlug() {
      return AGR.render.slugNote(rootSelect.value) + "-" + qualitySelect.value;
    }

    function applyHash() {
      var hash = (location.hash || "").replace("#", "");
      if (!hash) return;
      var parts = hash.split("-");
      var quality = parts.pop();
      var rootSlug = parts.join("-");
      var spelling = AGR.pcSpelling.filter(function (s) {
        return AGR.render.slugNote(s) === rootSlug;
      })[0];
      if (spelling && QUALITY_WORD[quality]) {
        rootSelect.value = spelling;
        qualitySelect.value = quality;
      }
    }

    function renderResults() {
      var box = content();
      var tocUl = toc();
      box.textContent = "";
      tocUl.textContent = "";
      var rootSpelling = rootSelect.value;
      var pc = AGR.pitchClass[rootSpelling];
      var quality = qualitySelect.value;
      var chordName = AGR.render.displayNote(rootSpelling) + " " + QUALITY_WORD[quality];
      var count = 0;

      var open = AGR.openChords.filter(function (c) {
        return AGR.pitchClass[c.root] === pc && c.quality === quality;
      });
      if (open.length > 0) {
        box.appendChild(el("h2", "Open chord"));
        open.forEach(function (c) {
          appendChord(box, tocUl, c);
          count += 1;
        });
      }

      var barres = placedForRoot(AGR.barreShapes.filter(function (s) {
        return s.quality === quality;
      }), pc);
      if (barres.length > 0) {
        box.appendChild(el("h2", "Barre chords"));
        barres.forEach(function (p) {
          appendVoicing(box, tocUl, p.shape, { root: rootSpelling, anchorFret: p.fret });
          count += 1;
        });
      }

      var triads = placedForRoot(AGR.triadShapes.filter(function (s) {
        return s.quality === quality;
      }), pc);
      if (triads.length > 0) {
        box.appendChild(el("h2", "Triads"));
        triads.forEach(function (p) {
          appendVoicing(box, tocUl, p.shape, { root: rootSpelling, anchorFret: p.fret });
          count += 1;
        });
      }

      var openPower = AGR.powerChords.filter(function (c) {
        return AGR.pitchClass[c.root] === pc;
      });
      var movablePower = placedForRoot(AGR.powerShapes, pc);
      if (openPower.length > 0 || movablePower.length > 0) {
        box.appendChild(el("h2", "Power chords, which fit major and minor alike"));
        openPower.forEach(function (c) {
          appendChord(box, tocUl, c);
          count += 1;
        });
        movablePower.forEach(function (p) {
          appendVoicing(box, tocUl, p.shape, { root: rootSpelling, anchorFret: p.fret });
          count += 1;
        });
      }

      // Plain text, deliberately not announced: a live region here would speak
      // over every arrow step while the user scrolls the combo box.
      status.textContent = "Showing " + count + " ways to play " + chordName + ".";
      try {
        history.replaceState(null, "", "#" + currentSlug());
      } catch (error) {
        // Some file:// contexts refuse history updates; the page still works.
      }
    }

    applyHash();
    renderResults();
    rootSelect.addEventListener("change", function () { renderResults(); });
    qualitySelect.addEventListener("change", function () { renderResults(); });
    // Arriving at a new #chord hash without a full page load (a link on this
    // page, or the back key) must re-render too. replaceState does not fire
    // this event, so our own updates cause no loop.
    window.addEventListener("hashchange", function () {
      applyHash();
      renderResults();
    });
  }

  // --- Settings page ---

  var GROUP_LABEL = { format: "Description format", stringNaming: "String naming" };
  var OPTION_LABEL = {
    format: {
      "per-string": "per string, from thickest to thinnest",
      "by-finger": "by finger",
      "prose": "compact prose"
    },
    stringNaming: {
      "both": "both number and note name",
      "number": "number only",
      "name": "note name only"
    }
  };

  function renderSettingsExamples() {
    var chordBox = document.getElementById("example-chord");
    var shapeBox = document.getElementById("example-shape");
    chordBox.textContent = "";
    shapeBox.textContent = "";
    var chord = AGR.openChords.filter(function (c) { return c.id === "c-major"; })[0];
    appendNodes(chordBox, descriptionNodes(AGR.render.describeChord(chord, settings)));
    var shape = AGR.powerShapes.filter(function (s) { return s.id === "power-root6-two-finger"; })[0];
    appendNodes(shapeBox, descriptionNodes(AGR.render.describeShapeRelative(shape, settings)));
  }

  function initSettingsPage() {
    var form = document.getElementById("settings-form");
    var status = document.getElementById("settings-status");
    Array.prototype.forEach.call(form.elements, function (input) {
      if (input.type === "radio") {
        input.checked = settings[input.name] === input.value;
      }
    });
    renderSettingsExamples();
    form.addEventListener("change", function (event) {
      var input = event.target;
      if (!input.name || !OPTION_LABEL[input.name]) return;
      var patch = {};
      patch[input.name] = input.value;
      settings = AGR.settings.set(patch);
      status.textContent = "Saved. " + GROUP_LABEL[input.name] + ": " +
        OPTION_LABEL[input.name][settings[input.name]] + ".";
      renderSettingsExamples();
    });
  }

  var registry = {
    "open-chords": renderOpenChords,
    "power-chords": renderPowerChords,
    "barre-chords": renderBarreChords,
    "triads": renderTriads,
    "chord-finder": initChordFinder,
    "fretboard": renderFretboard,
    "settings": initSettingsPage
  };

  if (registry[category]) registry[category]();
})();
