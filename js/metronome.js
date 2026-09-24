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

  // Each sound is short and enveloped. The three kinds differ in both pitch
  // and level so they stay apart by ear alone: the accent is the highest
  // and loudest, subdivisions the lowest and quietest.
  //
  // "tone" sounds are one oscillator; "wood" (kept under its original
  // stored value, shown as Arcade hit) adds a quick pitch fall, which is
  // exactly what makes it sound electronic. "modal" sounds imitate a struck
  // object instead: a brief band-filtered noise burst for the mallet
  // contact, then a few fast-decaying, inharmonic sine partials for the
  // object's own ring, and no pitch sweep at all.
  var SOUNDS = {
    click: {
      type: "tone", wave: "sine", decay: 0.03,
      accent: { freq: 4500, level: 1 },
      beat: { freq: 4000, level: 0.8 },
      sub: { freq: 800, level: 0.45 }
    },
    beep: {
      type: "tone", wave: "sine", decay: 0.1,
      accent: { freq: 1046.5, level: 1 },
      beat: { freq: 784, level: 0.75 },
      sub: { freq: 523.25, level: 0.4 }
    },
    wood: {
      type: "tone", wave: "triangle", decay: 0.04, fall: 0.5,
      accent: { freq: 1000, level: 1 },
      beat: { freq: 700, level: 0.8 },
      sub: { freq: 520, level: 0.45 }
    },
    woodblock: {
      type: "modal",
      // Each mode: frequency ratio to the fundamental, level, decay seconds.
      // Levels sum to about one with the knock, so nothing clips at full
      // volume. The partial ratios are deliberately not whole numbers: a
      // block of wood does not ring in harmonics.
      modes: [[1, 0.56, 0.06], [2.13, 0.25, 0.035], [3.31, 0.13, 0.02]],
      knock: { level: 0.38, decay: 0.015, q: 5 },
      accent: { freq: 1400, level: 1 },
      beat: { freq: 1000, level: 0.8 },
      sub: { freq: 750, level: 0.45 }
    }
  };

  var NOISE_S = 0.05;

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

  function ignore() {}

  function closeContext(context) {
    try {
      var closed = context.close();
      if (closed && closed.catch) closed.catch(ignore);
    } catch (err) {
      // An already-closed context is fine.
    }
  }

  // Safari 17 and later let a page declare that its sound is media
  // playback: it then carries on with the screen locked and is not
  // silenced by the ring/silent switch. Other browsers have no such
  // setting and ignore this.
  function setAudioSession(type) {
    try {
      if (navigator.audioSession && "type" in navigator.audioSession) {
        navigator.audioSession.type = type;
      }
    } catch (err) {
      // Not supported here.
    }
  }

  // One buffer of white noise per context, made on first use.
  function noiseBuffer(context) {
    if (context.agrNoise) return context.agrNoise;
    var length = Math.ceil(context.sampleRate * NOISE_S);
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    context.agrNoise = buffer;
    return buffer;
  }

  function envelope(context, level, time, decay) {
    var gain = context.createGain();
    gain.gain.setValueAtTime(level, time);
    // Never ramp to zero: an exponential ramp cannot reach it.
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    return gain;
  }

  function scheduleTone(context, destination, sound, spec, time) {
    var osc = context.createOscillator();
    osc.type = sound.wave;
    osc.frequency.setValueAtTime(spec.freq, time);
    if (sound.fall) {
      osc.frequency.exponentialRampToValueAtTime(spec.freq * sound.fall, time + sound.decay);
    }
    var gain = envelope(context, spec.level, time, sound.decay);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + sound.decay + 0.02);
  }

  function scheduleModal(context, destination, sound, spec, time) {
    var out = context.createGain();
    out.gain.value = spec.level;
    out.connect(destination);
    sound.modes.forEach(function (mode) {
      var osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(spec.freq * mode[0], time);
      var gain = envelope(context, mode[1], time, mode[2]);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      osc.stop(time + mode[2] + 0.02);
    });
    var knock = sound.knock;
    if (knock) {
      var source = context.createBufferSource();
      source.buffer = noiseBuffer(context);
      var filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(spec.freq, time);
      filter.Q.value = knock.q;
      var gain = envelope(context, knock.level, time, knock.decay);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      source.start(time);
      source.stop(time + knock.decay + 0.02);
    }
  }

  // Place one click of the named sound and kind on the clock at time. Also
  // exposed so a check can render a click offline and inspect it.
  function scheduleClick(context, destination, soundName, kind, time) {
    var sound = SOUNDS[soundName] || SOUNDS.beep;
    var spec = sound[kind] || sound.beat;
    if (sound.type === "modal") {
      scheduleModal(context, destination, sound, spec, time);
    } else {
      scheduleTone(context, destination, sound, spec, time);
    }
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
    // A phone call, another app, or a lock screen can suspend the context
    // behind our back; ask for it back whenever we get to run.
    var state = active.context.state;
    if (state !== "running" && state !== "closed" && active.context.resume) {
      try {
        var resumed = active.context.resume();
        if (resumed && resumed.catch) resumed.catch(ignore);
      } catch (err) {
        // Nothing to do until the browser lets audio through again.
      }
    }
    var hidden = globalThis.document && document.hidden;
    var horizon = active.context.currentTime + (hidden ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    while (active.sequencer.peek() < horizon) {
      var tick = active.sequencer.next();
      scheduleClick(active.context, active.master, active.config.sound, tick.kind, tick.time);
      notifyBeat(active, tick);
      if (tick.tempoChanged) {
        active.config.bpm = tick.bpm;
        if (active.callbacks.onTempo) active.callbacks.onTempo(tick.bpm);
      }
    }
  }

  // Route the master gain into an audio element, as a media stream. iPhones
  // and iPads stop plain Web Audio the moment the screen locks or the
  // browser leaves the foreground, but they keep media playback going, so
  // the click is delivered the way a music site delivers a song. The
  // element must start inside the same press that started the engine. If
  // it cannot play, the sound falls back to the ordinary output.
  function connectOutput(active, sink) {
    var context = active.context;
    var master = active.master;
    function direct() {
      if (running !== active || active.direct) return;
      active.direct = true;
      try {
        master.disconnect();
      } catch (err) {
        // Nothing was connected.
      }
      master.connect(context.destination);
    }
    if (!sink || !context.createMediaStreamDestination || !("srcObject" in sink)) {
      direct();
      return;
    }
    try {
      var streamOut = context.createMediaStreamDestination();
      master.connect(streamOut);
      sink.srcObject = streamOut.stream;
      // The element's own progress events are timed by playback, not by
      // page timers, so they keep the scheduler fed when timers slow.
      sink.ontimeupdate = pump;
      active.sink = sink;
      var played = sink.play();
      if (played && played.catch) played.catch(direct);
    } catch (err) {
      direct();
    }
  }

  function releaseSink(active) {
    var sink = active.sink;
    if (!sink) return;
    active.sink = null;
    sink.ontimeupdate = null;
    try {
      sink.pause();
    } catch (err) {
      // Already stopped.
    }
    try {
      sink.srcObject = null;
    } catch (err) {
      // Nothing to release.
    }
  }

  // callbacks: onStarted(), onStopped(), onError(kind), onBeat(tick,
  // beatsPerBar), onTempo(bpm). config is any AGR.tempo config; it is
  // sanitized here. options.sink is the page's audio element, or absent.
  // A second start while running is a no-op.
  function start(config, callbacks, options) {
    if (running) return;
    var ContextClass = audioContextClass();
    if (!ContextClass) {
      callbacks.onError("unsupported");
      return;
    }
    setAudioSession("playback");
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
        if (resumed && resumed.catch) resumed.catch(ignore);
      } catch (err) {
        // Older engines resume on their own.
      }
    }
    var clean = AGR.tempo.sanitize(config);
    var master = context.createGain();
    master.gain.value = gainForVolume(clean.volume);
    var sequencer = AGR.tempo.createSequencer(clean);
    sequencer.start(context.currentTime + START_DELAY_S);
    running = {
      context: context,
      master: master,
      sequencer: sequencer,
      config: clean,
      callbacks: callbacks,
      timer: null,
      sink: null,
      direct: false
    };
    connectOutput(running, options && options.sink);
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

  // Idempotent: stops the timer, the audio element, and the context, which
  // silences every click already placed on the clock, then reports back
  // once.
  function stop() {
    if (!running) return;
    var active = running;
    running = null;
    clearInterval(active.timer);
    releaseSink(active);
    try {
      active.master.disconnect();
    } catch (err) {
      // Already disconnected.
    }
    closeContext(active.context);
    setAudioSession("auto");
    active.callbacks.onStopped();
  }

  AGR.metronome = {
    isSupported: isSupported,
    scheduleClick: scheduleClick,
    start: start,
    update: update,
    stop: stop,
    running: function () { return !!running; },
    tempo: function () { return running ? running.sequencer.tempo() : null; },
    // Whether sound is going through the page's audio element (true) or
    // straight to the speakers (false); null when stopped.
    viaElement: function () { return running ? !running.direct : null; }
  };
})();
