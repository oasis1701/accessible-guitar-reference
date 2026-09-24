// metronome.js — the sound engine for the metronome page. Browser-only: all
// Web Audio code for the metronome lives here and nowhere else. No DOM and
// no words: js/page.js owns the elements, js/renderer.js owns the text, and
// js/tempo.js decides when each tick falls. tools/validate.js does not load
// this file.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  // Ticks are placed on the audio clock a little ahead of time, so timer
  // jitter never reaches the ear. A hidden tab gets a much longer horizon:
  // browsers slow background timers to once a second or worse, and the
  // click must carry on while the player reads a tab in another tab or
  // window. Settings changed from a hidden tab may therefore take a couple
  // of seconds to be heard, which is fine, because nobody is there to
  // change them.
  var PUMP_MS = 25;
  var LOOKAHEAD_S = 0.15;
  var HIDDEN_LOOKAHEAD_S = 2.5;
  var START_DELAY_S = 0.05;

  // Each sound is a short enveloped oscillator. The three kinds differ in
  // both pitch and level so they stay apart by ear alone: the accent is
  // the highest and loudest, subdivisions the lowest and quietest. The
  // wood block adds a quick pitch fall for its knock.
  var SOUNDS = {
    click: {
      type: "sine", decay: 0.03,
      accent: { freq: 1600, level: 1 },
      beat: { freq: 1100, level: 0.8 },
      sub: { freq: 800, level: 0.45 }
    },
    beep: {
      type: "sine", decay: 0.1,
      accent: { freq: 1046.5, level: 1 },
      beat: { freq: 784, level: 0.75 },
      sub: { freq: 523.25, level: 0.4 }
    },
    wood: {
      type: "triangle", decay: 0.04, fall: 0.5,
      accent: { freq: 1000, level: 1 },
      beat: { freq: 700, level: 0.8 },
      sub: { freq: 520, level: 0.45 }
    }
  };

  var running = null; // The active engine state, or null.

  function audioContextClass() {
    return globalThis.AudioContext || globalThis.webkitAudioContext || null;
  }

  function isSupported() {
    return !!audioContextClass();
  }

  // Perceived loudness is closer to the square of the slider than to the
  // slider itself, so the low end of the range stays usable.
  function gainForVolume(volume) {
    var v = volume / 100;
    return v * v;
  }

  function closeContext(context) {
    try {
      var closed = context.close();
      if (closed && closed.catch) closed.catch(function () {});
    } catch (err) {
      // An already-closed context is fine.
    }
  }

  function playClick(active, tick) {
    var sound = SOUNDS[active.config.sound] || SOUNDS.click;
    var spec = sound[tick.kind] || sound.beat;
    var context = active.context;
    var osc = context.createOscillator();
    var gain = context.createGain();
    osc.type = sound.type;
    osc.frequency.setValueAtTime(spec.freq, tick.time);
    if (sound.fall) {
      osc.frequency.exponentialRampToValueAtTime(spec.freq * sound.fall, tick.time + sound.decay);
    }
    gain.gain.setValueAtTime(spec.level, tick.time);
    // Never ramp to zero: an exponential ramp cannot reach it.
    gain.gain.exponentialRampToValueAtTime(0.001, tick.time + sound.decay);
    osc.connect(gain);
    gain.connect(active.master);
    osc.start(tick.time);
    osc.stop(tick.time + sound.decay + 0.02);
  }

  // Tell the page about a beat at the moment it sounds (not when it is
  // scheduled), for the visual-only counter.
  function notifyBeat(active, tick) {
    if (tick.sub !== 1 || !active.callbacks.onBeat) return;
    var delayMs = Math.max(0, (tick.time - active.context.currentTime) * 1000);
    setTimeout(function () {
      if (running !== active) return;
      active.callbacks.onBeat(tick, active.config.beatsPerBar);
    }, delayMs);
  }

  function pump() {
    var active = running;
    if (!active) return;
    var hidden = globalThis.document && document.hidden;
    var horizon = active.context.currentTime + (hidden ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    while (active.sequencer.peek() < horizon) {
      var tick = active.sequencer.next();
      playClick(active, tick);
      notifyBeat(active, tick);
      if (tick.tempoChanged) {
        active.config.bpm = tick.bpm;
        if (active.callbacks.onTempo) active.callbacks.onTempo(tick.bpm);
      }
    }
  }

  // callbacks: onStarted(), onStopped(), onError(kind), onBeat(tick,
  // beatsPerBar), onTempo(bpm). config is any AGR.tempo config; it is
  // sanitized here. A second start while running is a no-op.
  function start(config, callbacks) {
    if (running) return;
    var ContextClass = audioContextClass();
    if (!ContextClass) {
      callbacks.onError("unsupported");
      return;
    }
    var context;
    try {
      context = new ContextClass();
    } catch (err) {
      callbacks.onError("error");
      return;
    }
    // Created inside the button's click handler so autoplay policy allows
    // it; resume() covers browsers that still hand it over suspended.
    if (context.resume) {
      try {
        var resumed = context.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
      } catch (err) {
        // Older engines resume on their own.
      }
    }
    var clean = AGR.tempo.sanitize(config);
    var master = context.createGain();
    master.gain.value = gainForVolume(clean.volume);
    master.connect(context.destination);
    var sequencer = AGR.tempo.createSequencer(clean);
    sequencer.start(context.currentTime + START_DELAY_S);
    running = {
      context: context,
      master: master,
      sequencer: sequencer,
      config: clean,
      callbacks: callbacks,
      timer: null
    };
    pump();
    running.timer = setInterval(pump, PUMP_MS);
    callbacks.onStarted();
  }

  // Apply a changed config while running: the sequencer takes the timing
  // fields, the master gain takes the volume, and the next click takes the
  // sound. Harmless when stopped.
  function update(config) {
    var active = running;
    if (!active) return;
    var clean = AGR.tempo.sanitize(config, active.config);
    active.sequencer.update(clean, active.context.currentTime);
    active.config = active.sequencer.config();
    active.config.sound = clean.sound;
    active.config.volume = clean.volume;
    active.master.gain.value = gainForVolume(clean.volume);
  }

  // Idempotent: stops the timer and closes the context, which silences
  // every click already placed on the clock, then reports back once.
  function stop() {
    if (!running) return;
    var active = running;
    running = null;
    clearInterval(active.timer);
    try {
      active.master.disconnect();
    } catch (err) {
      // Already disconnected.
    }
    closeContext(active.context);
    active.callbacks.onStopped();
  }

  AGR.metronome = {
    isSupported: isSupported,
    start: start,
    update: update,
    stop: stop,
    running: function () { return !!running; },
    tempo: function () { return running ? running.sequencer.tempo() : null; }
  };
})();
