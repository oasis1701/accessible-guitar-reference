// tempo.js — pure metronome logic: the tick sequencer, tap tempo averaging,
// and settings sanitizing. Pure functions only: no DOM, no Web Audio, no
// storage, no clocks; callers pass every time in. Loads as a classic script
// in the browser and via require() in Node (tools/validate.js) through
// globalThis.AGR. The sound itself lives in js/metronome.js; every
// user-facing word lives in js/renderer.js.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  var MIN_BPM = 30;
  var MAX_BPM = 500;
  var MIN_BEATS = 2;
  var MAX_BEATS = 8;
  var SUBDIVISIONS = [1, 2, 3, 4];   // clicks per beat
  var SOUNDS = ["click", "beep", "wood", "woodblock"];
  var TRAINER_STEPS = [1, 2, 5, 10];  // beats per minute added per raise
  var TRAINER_BARS = [2, 4, 8, 16];   // bars between raises

  var DEFAULTS = {
    bpm: 100,
    beatsPerBar: 4,
    accent: true,
    subdivision: 1,
    sound: "click",
    volume: 80,
    trainer: { enabled: false, step: 5, everyBars: 4, targetBpm: 160 }
  };

  // Tap tempo: taps further apart than this start a fresh count, and only
  // the most recent intervals are averaged so a drifting tap still lands
  // on the tempo the player means now.
  var TAP_RESET_MS = 2000;
  var TAP_KEEP = 8; // intervals

  function toNumber(value) {
    if (typeof value === "string" && value.trim() !== "") value = Number(value);
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function clampInt(value, min, max, fallback) {
    var n = toNumber(value);
    if (n === null) return fallback;
    n = Math.round(n);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function oneOfNumbers(value, allowed, fallback) {
    var n = toNumber(value);
    return n !== null && allowed.indexOf(n) !== -1 ? n : fallback;
  }

  function toBoolean(value, fallback) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
  }

  // A complete, valid config from anything: a stored object, a form patch,
  // garbage, or nothing. Missing or invalid fields fall back to base (the
  // previous config), or to DEFAULTS when no base is given. Numbers are
  // rounded and clamped, so a typed 900 becomes 500 and a typed 0 becomes 30.
  function sanitize(raw, base) {
    var fallback = base || DEFAULTS;
    var source = raw && typeof raw === "object" ? raw : {};
    var trainerRaw = source.trainer && typeof source.trainer === "object" ? source.trainer : {};
    return {
      bpm: clampInt(source.bpm, MIN_BPM, MAX_BPM, fallback.bpm),
      beatsPerBar: clampInt(source.beatsPerBar, MIN_BEATS, MAX_BEATS, fallback.beatsPerBar),
      accent: toBoolean(source.accent, fallback.accent),
      subdivision: oneOfNumbers(source.subdivision, SUBDIVISIONS, fallback.subdivision),
      sound: SOUNDS.indexOf(source.sound) !== -1 ? source.sound : fallback.sound,
      volume: clampInt(source.volume, 0, 100, fallback.volume),
      trainer: {
        enabled: toBoolean(trainerRaw.enabled, fallback.trainer.enabled),
        step: oneOfNumbers(trainerRaw.step, TRAINER_STEPS, fallback.trainer.step),
        everyBars: oneOfNumbers(trainerRaw.everyBars, TRAINER_BARS, fallback.trainer.everyBars),
        targetBpm: clampInt(trainerRaw.targetBpm, MIN_BPM, MAX_BPM, fallback.trainer.targetBpm)
      }
    };
  }

  function secondsPerTick(bpm, subdivision) {
    return 60 / bpm / subdivision;
  }

  // The sequencer hands out ticks one at a time, each stamped with the
  // moment it should sound (in the caller's clock, seconds), its place in
  // the bar, and its kind: "accent" for the first beat of a bar when
  // accents are on, "beat" for any other beat, "sub" for a subdivision
  // click. Times are never read from a clock here; start() takes the
  // first tick's time and every later time is derived from it, so the
  // whole timeline is reproducible in Node.
  function createSequencer(initial) {
    var config = sanitize(initial);
    var bpm = config.bpm;    // The live tempo; the trainer raises it.
    var nextTime = null;
    var lastTime = null;
    var bar = 1;
    var beat = 0;            // Zero-based inside this closure.
    var sub = 0;

    function normalize() {
      if (sub >= config.subdivision) {
        sub = 0;
        beat += 1;
      }
      if (beat >= config.beatsPerBar) {
        beat = 0;
        bar += 1;
      }
    }

    function trainerDue() {
      var trainer = config.trainer;
      return trainer.enabled && beat === 0 && sub === 0 && bar > 1 &&
        (bar - 1) % trainer.everyBars === 0 && bpm < trainer.targetBpm;
    }

    return {
      start: function (time) {
        nextTime = time;
        lastTime = null;
        bar = 1;
        beat = 0;
        sub = 0;
        bpm = config.bpm;
      },

      // The time of the tick next() will return, or null before start().
      peek: function () {
        return nextTime;
      },

      tempo: function () {
        return bpm;
      },

      config: function () {
        return sanitize(config);
      },

      next: function () {
        if (nextTime === null) throw new Error("The sequencer has not been started.");
        var tempoChanged = false;
        if (trainerDue()) {
          bpm = Math.min(config.trainer.targetBpm, bpm + config.trainer.step);
          config.bpm = bpm;
          tempoChanged = true;
        }
        var kind = "beat";
        if (sub !== 0) kind = "sub";
        else if (beat === 0 && config.accent) kind = "accent";
        var tick = {
          time: nextTime,
          bar: bar,
          beat: beat + 1,
          sub: sub + 1,
          kind: kind,
          bpm: bpm,
          tempoChanged: tempoChanged
        };
        lastTime = nextTime;
        nextTime += secondsPerTick(bpm, config.subdivision);
        sub += 1;
        normalize();
        return tick;
      },

      // Change any part of the config while running. A new bpm replaces
      // the live tempo (including one the trainer raised). When now is
      // given, the pending tick is moved so the new spacing is heard at
      // once rather than after one more old-length gap: it lands one new
      // interval after the last tick, or right now if that has passed.
      // It is never moved earlier than the last tick, so a tick already
      // handed out is never doubled.
      update: function (patch, now) {
        var source = patch && typeof patch === "object" ? patch : {};
        var merged = sanitize(source, config);
        var timingChanged = merged.subdivision !== config.subdivision;
        if (source.bpm !== undefined && merged.bpm !== bpm) {
          bpm = merged.bpm;
          timingChanged = true;
        }
        merged.bpm = bpm;
        config = merged;
        normalize();
        if (timingChanged && lastTime !== null && typeof now === "number") {
          var candidate = lastTime + secondsPerTick(bpm, config.subdivision);
          nextTime = Math.max(candidate, now);
        }
      }
    };
  }

  // Tap tempo. Feed it the time of each tap in milliseconds; it answers
  // with how many taps this run has counted and the tempo they imply, or
  // null for the tempo until there are two taps to measure between.
  function createTapTempo(options) {
    var opts = options || {};
    var resetMs = opts.resetMs || TAP_RESET_MS;
    var keep = opts.keep || TAP_KEEP;
    var taps = [];
    var total = 0;

    return {
      tap: function (nowMs) {
        if (taps.length > 0 && nowMs - taps[taps.length - 1] > resetMs) {
          taps = [];
          total = 0;
        }
        taps.push(nowMs);
        total += 1;
        if (taps.length > keep + 1) taps.shift();
        if (taps.length < 2) return { count: total, bpm: null };
        var mean = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
        if (!(mean > 0)) return { count: total, bpm: null };
        return { count: total, bpm: clampInt(60000 / mean, MIN_BPM, MAX_BPM, null) };
      },
      reset: function () {
        taps = [];
        total = 0;
      }
    };
  }

  AGR.tempo = {
    DEFAULTS: DEFAULTS,
    MIN_BPM: MIN_BPM,
    MAX_BPM: MAX_BPM,
    MIN_BEATS: MIN_BEATS,
    MAX_BEATS: MAX_BEATS,
    SUBDIVISIONS: SUBDIVISIONS,
    SOUNDS: SOUNDS,
    TRAINER_STEPS: TRAINER_STEPS,
    TRAINER_BARS: TRAINER_BARS,
    TAP_RESET_MS: TAP_RESET_MS,
    sanitize: sanitize,
    secondsPerTick: secondsPerTick,
    createSequencer: createSequencer,
    createTapTempo: createTapTempo
  };
})();
