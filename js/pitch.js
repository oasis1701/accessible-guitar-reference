// pitch.js — pure pitch math for the tuner: detection, conversion, and the
// gates that decide when a reading is stable and when it may be announced.
// Pure functions only: no DOM, no Web Audio, no storage, no clocks. Loads as
// a classic script in the browser and via require() in Node (tools/validate.js)
// through globalThis.AGR. The microphone itself lives in js/tuner.js; every
// user-facing word lives in js/renderer.js.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  // A at 440 hertz, MIDI note 69. Fixed; the site offers no calibration.
  var REFERENCE_HZ = 440;
  var REFERENCE_MIDI = 69;

  // Detection gates. The open strings span 82 to 330 hertz; the range leaves
  // room for fretted notes while rejecting rumble and hiss.
  var MIN_HZ = 60;
  var MAX_HZ = 1000;
  var RMS_GATE = 0.005;   // Quieter than this counts as silence.
  var CLARITY_MIN = 0.9;  // Below this the sound has no single clear pitch.
  var PEAK_PICK_K = 0.9;  // McLeod first-peak rule; see detectFrequency.

  // Stability window: five readings at the 100 ms poll is half a second.
  var SMOOTH_WINDOW = 5;
  var SPREAD_CENTS = 10;

  // Announcement gates, in milliseconds and cents. This gating is what
  // sanctions the tuner's live region (CLAUDE.md rule 2): stable readings
  // only, spaced apart, never the same text twice in a row.
  var MIN_GAP_MS = 1500;
  var IN_TUNE_GAP_MS = 800;    // Arriving in tune is worth hearing sooner.
  var IN_TUNE_CENTS = 5;       // Must match IN_TUNE_CENTS in js/renderer.js.
  var SILENCE_RESET_MS = 3000; // After this much quiet, repeat the note name.

  function midiToFrequency(midi) {
    return REFERENCE_HZ * Math.pow(2, (midi - REFERENCE_MIDI) / 12);
  }

  // Nearest MIDI note plus the signed distance from it in cents (hundredths
  // of a semitone). Negative cents mean the sound is below the note.
  function frequencyToPitch(hz) {
    var semis = REFERENCE_MIDI + 12 * (Math.log(hz / REFERENCE_HZ) / Math.LN2);
    var midi = Math.round(semis);
    return { midi: midi, cents: (semis - midi) * 100 };
  }

  // McLeod Pitch Method: normalized square difference (NSDF) autocorrelation.
  // Returns the detected frequency in hertz, or null when the buffer holds
  // silence, noise, or anything without one clear pitch. The first-peak rule
  // (take the earliest peak at least PEAK_PICK_K of the best one) is what
  // keeps a low E with a loud second harmonic from reading an octave high:
  // any mix of harmonics is exactly periodic at the true period, so the peak
  // there is always near the maximum, and it comes first.
  function detectFrequency(samples, sampleRate) {
    var n = samples.length;
    var maxLag = Math.ceil(sampleRate / MIN_HZ);
    if (n < maxLag * 2) return null;

    var i;
    var mean = 0;
    for (i = 0; i < n; i++) mean += samples[i];
    mean /= n;

    // Remove any DC offset so the gates see only the wave itself.
    var centered = new Float64Array(n);
    var sumSq = 0;
    for (i = 0; i < n; i++) {
      centered[i] = samples[i] - mean;
      sumSq += centered[i] * centered[i];
    }
    if (Math.sqrt(sumSq / n) < RMS_GATE) return null;

    // Prefix sums of squares make each lag's normalizer O(1).
    var prefix = new Float64Array(n + 1);
    for (i = 0; i < n; i++) prefix[i + 1] = prefix[i] + centered[i] * centered[i];

    var nsdf = new Float64Array(maxLag + 1);
    for (var lag = 1; lag <= maxLag; lag++) {
      var acf = 0;
      var limit = n - lag;
      for (i = 0; i < limit; i++) acf += centered[i] * centered[i + lag];
      var norm = prefix[limit] + (prefix[n] - prefix[lag]);
      nsdf[lag] = norm > 0 ? (2 * acf) / norm : 0;
    }

    // Candidate peaks: the maximum of each positive region after the curve
    // has first dipped below zero (which skips the trivial peak at lag zero).
    // A region still open at maxLag is a truncated peak and is not trusted.
    var scan = 1;
    while (scan <= maxLag && nsdf[scan] > 0) scan++;
    if (scan > maxLag) return null;
    var candidates = [];
    while (scan <= maxLag) {
      while (scan <= maxLag && nsdf[scan] <= 0) scan++;
      var bestLag = -1;
      var bestVal = 0;
      while (scan <= maxLag && nsdf[scan] > 0) {
        if (nsdf[scan] > bestVal) {
          bestVal = nsdf[scan];
          bestLag = scan;
        }
        scan++;
      }
      if (bestLag > 1 && bestLag < maxLag) candidates.push(bestLag);
    }
    if (candidates.length === 0) return null;

    // Parabolic interpolation refines each candidate to sub-sample accuracy.
    var interpolated = candidates.map(function (peakLag) {
      var a = nsdf[peakLag - 1];
      var b = nsdf[peakLag];
      var c = nsdf[peakLag + 1];
      var denom = a - 2 * b + c;
      var shift = denom === 0 ? 0 : 0.5 * (a - c) / denom;
      if (shift > 1) shift = 1;
      if (shift < -1) shift = -1;
      return { lag: peakLag + shift, value: b - 0.25 * (a - c) * shift };
    });

    var best = 0;
    for (i = 1; i < interpolated.length; i++) {
      if (interpolated[i].value > interpolated[best].value) best = i;
    }
    var threshold = interpolated[best].value * PEAK_PICK_K;
    var chosen = null;
    for (i = 0; i < interpolated.length; i++) {
      if (interpolated[i].value >= threshold) {
        chosen = interpolated[i];
        break;
      }
    }
    if (!chosen || chosen.value < CLARITY_MIN) return null;

    var hz = sampleRate / chosen.lag;
    if (hz < MIN_HZ || hz > MAX_HZ) return null;
    return hz;
  }

  // Stability smoother: the tuner reports nothing until the same note has
  // held for the whole window with only a small wobble. Push one detection
  // (a {midi, cents} reading or null) per poll; get back the stable reading
  // (median cents) or null. Any null push clears the window.
  function createSmoother() {
    var recent = [];
    return {
      push: function (reading) {
        if (!reading) {
          recent = [];
          return null;
        }
        recent.push({ midi: reading.midi, cents: reading.cents });
        if (recent.length > SMOOTH_WINDOW) recent.shift();
        if (recent.length < SMOOTH_WINDOW) return null;
        var midi = recent[0].midi;
        var cents = [];
        for (var i = 0; i < recent.length; i++) {
          if (recent[i].midi !== midi) return null;
          cents.push(recent[i].cents);
        }
        cents.sort(function (a, b) { return a - b; });
        if (cents[cents.length - 1] - cents[0] > SPREAD_CENTS) return null;
        return { midi: midi, cents: cents[Math.floor(cents.length / 2)] };
      },
      reset: function () {
        recent = [];
      }
    };
  }

  // Announcement gate. Decides whether a stable reading may be announced and
  // whether it should repeat the note name; the words themselves come from
  // js/renderer.js. Callers pass their own clock in milliseconds, so the
  // whole state machine stays testable in Node.
  function createAnnouncer(options) {
    var opts = options || {};
    var minGapMs = opts.minGapMs || MIN_GAP_MS;
    var inTuneGapMs = opts.inTuneGapMs || IN_TUNE_GAP_MS;
    var inTuneCents = opts.inTuneCents || IN_TUNE_CENTS;
    var silenceResetMs = opts.silenceResetMs || SILENCE_RESET_MS;

    var lastText = null;
    var lastMidi = null;
    var lastWasInTune = false;
    var lastAnnounceAt = null;
    var lastStableAt = null;
    var pending = null;

    return {
      // Offer a stable reading (or null for silence, which is never
      // announced). Returns null to stay silent, or { includeName } when an
      // announcement is allowed; the caller renders the text and must then
      // call commit() with it.
      offer: function (reading, nowMs) {
        if (!reading) {
          pending = null;
          return null;
        }
        var silenceMs = lastStableAt === null ? Infinity : nowMs - lastStableAt;
        lastStableAt = nowMs;
        var inTune = Math.abs(reading.cents) <= inTuneCents;
        if (lastAnnounceAt !== null) {
          var gap = nowMs - lastAnnounceAt;
          var arriving = inTune && reading.midi === lastMidi && !lastWasInTune;
          if (gap < (arriving ? inTuneGapMs : minGapMs)) {
            pending = null;
            return null;
          }
        }
        pending = { midi: reading.midi, inTune: inTune };
        return {
          includeName: lastText === null || reading.midi !== lastMidi ||
            silenceMs >= silenceResetMs
        };
      },

      // The caller passes the bare reading text, without any name sentence,
      // so that adding or dropping the name never counts as a change.
      // Returns true when an announcement should be written: the note
      // changed, or its reading changed. An unchanged reading returns false
      // and spends nothing, so it is simply never repeated.
      commit: function (bareText, nowMs) {
        var offered = pending;
        pending = null;
        if (!offered) return false;
        if (offered.midi === lastMidi && bareText === lastText) return false;
        lastText = bareText;
        lastMidi = offered.midi;
        lastWasInTune = offered.inTune;
        lastAnnounceAt = nowMs;
        return true;
      },

      reset: function () {
        lastText = null;
        lastMidi = null;
        lastWasInTune = false;
        lastAnnounceAt = null;
        lastStableAt = null;
        pending = null;
      }
    };
  }

  AGR.pitch = {
    midiToFrequency: midiToFrequency,
    frequencyToPitch: frequencyToPitch,
    detectFrequency: detectFrequency,
    createSmoother: createSmoother,
    createAnnouncer: createAnnouncer,
    // Shared facts, so js/tuner.js, js/page.js, and tools/validate.js all
    // agree with the gates above.
    POLL_MS: 100,
    IN_TUNE_CENTS: IN_TUNE_CENTS,
    MIN_GAP_MS: MIN_GAP_MS,
    IN_TUNE_GAP_MS: IN_TUNE_GAP_MS,
    SILENCE_RESET_MS: SILENCE_RESET_MS
  };
})();
