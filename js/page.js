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

  // --- Tuner page ---

  function initTuner() {
    var supportP = document.getElementById("tuner-support");
    var readingP = document.getElementById("tuner-reading");
    var statusP = document.getElementById("tuner-status");
    var startButton = document.getElementById("tuner-start");
    var muteButton = document.getElementById("tuner-mute");
    var selftest = /[?&]selftest/.test(location.search);
    var muted = false;
    var tunerOn = false;
    var hadReading = false; // Any stable reading since this start?
    var lastStableAt = 0;
    var lastRawAt = 0;      // Last tick with a pitch detection, stable or not.
    var lastAliveAt = 0;    // Last tick with any input signal at all.
    var announcer = AGR.pitch.createAnnouncer();

    function stateText(state) {
      return AGR.render.tunerStateText(state);
    }

    // The one sanctioned automatic announcement channel besides the settings
    // confirmation (CLAUDE.md rule 2). Everything written here either passed
    // the announcer's gates or confirms the user's own button press.
    function announce(text) {
      if (muted || document.hidden) return;
      statusP.textContent = text;
    }

    if (!AGR.tuner.isSupported(selftest)) {
      supportP.textContent = stateText("unsupported");
      return;
    }
    if (!selftest && !AGR.tuner.isSecure()) {
      supportP.textContent = stateText("insecure");
      return;
    }
    supportP.textContent = stateText("idle");
    startButton.disabled = false;
    muteButton.disabled = false;

    function onTick(stable, raw, level) {
      var now = Date.now();
      if (level > AGR.pitch.NO_SIGNAL_LEVEL) lastAliveAt = now;
      if (raw) lastRawAt = now;
      if (stable) {
        hadReading = true;
        lastStableAt = now;
        // The plain reading always carries the note name, for on-demand
        // reading; only the announcement may drop it.
        readingP.textContent = AGR.render.tunerReading(stable, true);
        if (muted || document.hidden) return;
        var offer = announcer.offer(stable, now);
        if (!offer) return;
        // The gate compares the bare reading, so that dropping the name
        // sentence never makes an unchanged reading sound new.
        var bare = AGR.render.tunerReading(stable, false);
        if (announcer.commit(bare, now)) {
          statusP.textContent = offer.includeName
            ? AGR.render.tunerReading(stable, true)
            : bare;
        }
        return;
      }
      // Once a reading exists it stays put, so it can be read on demand
      // (especially while muted). Before the first one, the paragraph says
      // what the tuner is hearing, so a silent failure explains itself:
      // a dead input, sound too unsteady to read, or simply quiet.
      if (hadReading || !tunerOn || now - lastStableAt <= 2500) return;
      if (now - lastAliveAt > 2500) {
        readingP.textContent = stateText("no-signal");
      } else if (now - lastRawAt <= 2500) {
        readingP.textContent = stateText("unclear");
      } else {
        readingP.textContent = stateText("listening");
      }
    }

    startButton.addEventListener("click", function () {
      if (AGR.tuner.running()) {
        AGR.tuner.stop();
        return;
      }
      startButton.disabled = true;
      supportP.textContent = stateText("starting");
      AGR.tuner.start({
        onStarted: function () {
          tunerOn = true;
          hadReading = false;
          lastStableAt = Date.now();
          lastRawAt = lastStableAt;
          lastAliveAt = lastStableAt;
          startButton.disabled = false;
          startButton.textContent = "Stop tuner";
          supportP.textContent = stateText("listening");
          announce(stateText("listening"));
        },
        onStopped: function () {
          tunerOn = false;
          announcer.reset();
          startButton.disabled = false;
          startButton.textContent = "Start tuner";
          supportP.textContent = stateText("stopped");
          readingP.textContent = "";
          announce(stateText("stopped"));
        },
        onError: function (kind) {
          tunerOn = false;
          startButton.disabled = false;
          startButton.textContent = "Start tuner";
          supportP.textContent = stateText(kind);
          announce(stateText(kind));
        },
        onTick: onTick
      }, { selftest: selftest });
    });

    muteButton.addEventListener("click", function () {
      muted = !muted;
      muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
      // No confirmation announcement: the button's own pressed state is the
      // feedback, and muting must go quiet immediately.
      if (muted) statusP.textContent = "";
    });

    // Leaving the page must release the microphone (and its indicator).
    window.addEventListener("pagehide", function () {
      AGR.tuner.stop();
    });
  }

  // --- Metronome page ---

  function initMetronome() {
    var STORAGE_KEY = "agr:metronome:v1";
    var statusP = document.getElementById("metronome-status");
    var tapP = document.getElementById("metronome-tap-result");
    var beatP = document.getElementById("metronome-beat");
    var startButton = document.getElementById("metronome-start");
    var tapButton = document.getElementById("metronome-tap");
    var form = document.getElementById("metronome-form");
    var fields = {
      bpm: document.getElementById("metronome-bpm"),
      beatsPerBar: document.getElementById("metronome-beats"),
      accent: document.getElementById("metronome-accent"),
      subdivision: document.getElementById("metronome-subdivision"),
      sound: document.getElementById("metronome-sound"),
      volume: document.getElementById("metronome-volume"),
      trainerEnabled: document.getElementById("metronome-trainer"),
      trainerStep: document.getElementById("metronome-trainer-step"),
      trainerEvery: document.getElementById("metronome-trainer-every"),
      trainerTarget: document.getElementById("metronome-trainer-target")
    };
    var tapper = AGR.tempo.createTapTempo();
    var running = false;
    var config = load();

    // The metronome keeps its own settings, remembered like the site
    // settings (js/settings.js) and guarded the same way: with no storage
    // the page simply starts from the defaults.
    function load() {
      var raw = null;
      try {
        raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      } catch (err) {
        raw = null;
      }
      return AGR.tempo.sanitize(raw);
    }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (err) {
        // Storage unavailable: settings hold for this page view only.
      }
    }

    // Write the config into the form. The tempo field is left alone while
    // the player is typing in it (the trainer can raise the tempo at any
    // moment); the blur handler below syncs it afterwards.
    function fillForm() {
      if (document.activeElement !== fields.bpm) fields.bpm.value = config.bpm;
      fields.beatsPerBar.value = String(config.beatsPerBar);
      fields.accent.checked = config.accent;
      fields.subdivision.value = String(config.subdivision);
      fields.sound.value = config.sound;
      fields.volume.value = config.volume;
      fields.trainerEnabled.checked = config.trainer.enabled;
      fields.trainerStep.value = String(config.trainer.step);
      fields.trainerEvery.value = String(config.trainer.everyBars);
      fields.trainerTarget.value = config.trainer.targetBpm;
      var trainerOff = !config.trainer.enabled;
      fields.trainerStep.disabled = trainerOff;
      fields.trainerEvery.disabled = trainerOff;
      fields.trainerTarget.disabled = trainerOff;
    }

    function readForm() {
      config = AGR.tempo.sanitize({
        bpm: fields.bpm.value,
        beatsPerBar: fields.beatsPerBar.value,
        accent: fields.accent.checked,
        subdivision: fields.subdivision.value,
        sound: fields.sound.value,
        volume: fields.volume.value,
        trainer: {
          enabled: fields.trainerEnabled.checked,
          step: fields.trainerStep.value,
          everyBars: fields.trainerEvery.value,
          targetBpm: fields.trainerTarget.value
        }
      }, config);
    }

    // Plain text, deliberately not a live region (CLAUDE.md rule 2): the
    // click itself is the feedback, and this paragraph is for reading on
    // demand. It changes only on the player's own actions and when the
    // speed trainer raises the tempo, never per beat.
    function renderStatus() {
      statusP.textContent = AGR.render.metronomeStatus(config, running);
    }

    function apply() {
      fillForm();
      save();
      renderStatus();
      if (running) AGR.metronome.update(config);
    }

    if (!AGR.metronome.isSupported()) {
      statusP.textContent = AGR.render.metronomeStateText("unsupported");
      return;
    }
    fillForm();
    renderStatus();
    startButton.disabled = false;
    tapButton.disabled = false;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });

    form.addEventListener("change", function (event) {
      if (event.target.tagName === "BUTTON") return;
      readForm();
      apply();
    });

    // The volume slider is heard as it moves; everything else waits for
    // the change event, so a half-typed tempo is never applied.
    fields.volume.addEventListener("input", function () {
      config = AGR.tempo.sanitize({ volume: fields.volume.value }, config);
      if (running) AGR.metronome.update(config);
    });

    fields.bpm.addEventListener("blur", function () {
      fields.bpm.value = config.bpm;
    });

    Array.prototype.forEach.call(form.querySelectorAll("button[data-nudge]"), function (button) {
      button.addEventListener("click", function () {
        var delta = Number(button.getAttribute("data-nudge"));
        config = AGR.tempo.sanitize({ bpm: config.bpm + delta }, config);
        apply();
      });
    });

    tapButton.addEventListener("click", function () {
      var result = tapper.tap(Date.now());
      tapP.textContent = AGR.render.metronomeTapText(result);
      if (result.bpm !== null) {
        config = AGR.tempo.sanitize({ bpm: result.bpm }, config);
        apply();
      }
    });

    startButton.addEventListener("click", function () {
      if (AGR.metronome.running()) {
        AGR.metronome.stop();
        return;
      }
      startButton.disabled = true;
      AGR.metronome.start(config, {
        onStarted: function () {
          running = true;
          startButton.disabled = false;
          startButton.textContent = "Stop metronome";
          renderStatus();
        },
        onStopped: function () {
          running = false;
          startButton.disabled = false;
          startButton.textContent = "Start metronome";
          beatP.textContent = "";
          beatP.classList.remove("accent");
          renderStatus();
        },
        onError: function (kind) {
          running = false;
          startButton.disabled = false;
          startButton.textContent = "Start metronome";
          statusP.textContent = AGR.render.metronomeStateText(kind);
        },
        // Visual only: the paragraph is aria-hidden, so this never
        // reaches a screen reader.
        onBeat: function (tick, beatsPerBar) {
          beatP.textContent = AGR.render.metronomeBeatText(tick, beatsPerBar);
          beatP.classList.toggle("accent", tick.kind === "accent");
        },
        onTempo: function (bpm) {
          config = AGR.tempo.sanitize({ bpm: bpm }, config);
          fillForm();
          save();
          renderStatus();
        }
      });
    });

    // Leaving the page must silence the click.
    window.addEventListener("pagehide", function () {
      AGR.metronome.stop();
    });
  }

  var registry = {
    "open-chords": renderOpenChords,
    "power-chords": renderPowerChords,
    "barre-chords": renderBarreChords,
    "triads": renderTriads,
    "chord-finder": initChordFinder,
    "fretboard": renderFretboard,
    "settings": initSettingsPage,
    "tuner": initTuner,
    "metronome": initMetronome
  };

  if (registry[category]) registry[category]();
})();
