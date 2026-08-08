// tuner.js — the microphone engine for the tuner page. Browser-only: all
// Web Audio and getUserMedia code lives here and nowhere else. No DOM and no
// words: js/page.js owns the elements, js/renderer.js owns the text, and
// js/pitch.js does the math. tools/validate.js does not load this file.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  // 4096 samples is about 85 ms at 48000: at least seven periods of the low
  // E string, which the detector needs for a confident reading.
  var FFT_SIZE = 4096;

  var running = null; // The active pipeline, or null.
  var pending = null; // A start() waiting on the permission prompt, or null.

  function audioContextClass() {
    return globalThis.AudioContext || globalThis.webkitAudioContext || null;
  }

  function isSupported(selftest) {
    if (!audioContextClass()) return false;
    if (selftest) return true;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function isSecure() {
    // Browsers only hand out the microphone in secure contexts. Undefined
    // means the browser predates the flag; the call-time error path catches
    // whatever such a browser then refuses.
    return globalThis.isSecureContext !== false;
  }

  // Map a getUserMedia failure to a state key js/renderer.js has words for.
  function errorKind(err) {
    var name = err && err.name ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError" ||
        name === "SecurityError") {
      if (globalThis.location && location.protocol === "file:") return "denied-file";
      return name === "SecurityError" ? "insecure" : "denied";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError" ||
        name === "OverconstrainedError") return "no-mic";
    if (name === "NotReadableError" || name === "AbortError" ||
        name === "TrackStartError") return "busy";
    return "error";
  }

  function readInto(analyser, buffer) {
    if (analyser.getFloatTimeDomainData) {
      analyser.getFloatTimeDomainData(buffer.float);
      return buffer.float;
    }
    // Old engines only offer bytes, where 128 is silence; convert in place.
    analyser.getByteTimeDomainData(buffer.bytes);
    for (var i = 0; i < buffer.bytes.length; i++) {
      buffer.float[i] = (buffer.bytes[i] - 128) / 128;
    }
    return buffer.float;
  }

  function closeContext(context) {
    try {
      var closed = context.close();
      if (closed && closed.catch) closed.catch(function () {});
    } catch (err) {
      // An already-closed context is fine.
    }
  }

  function startPipeline(context, stream, selftestNodes, callbacks) {
    var source = context.createMediaStreamSource(stream);
    var analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    source.connect(analyser);
    var buffer = {
      float: new Float32Array(analyser.fftSize),
      bytes: new Uint8Array(analyser.fftSize)
    };
    var smoother = AGR.pitch.createSmoother();
    var timer = setInterval(function () {
      var samples = readInto(analyser, buffer);
      var hz = AGR.pitch.detectFrequency(samples, context.sampleRate);
      var raw = hz === null ? null : AGR.pitch.frequencyToPitch(hz);
      callbacks.onTick(smoother.push(raw), raw);
    }, AGR.pitch.POLL_MS);
    running = {
      context: context,
      stream: stream,
      source: source,
      timer: timer,
      selftest: selftestNodes,
      callbacks: callbacks
    };
    callbacks.onStarted();
  }

  // The selftest source (tuner.html?selftest): an inaudible oscillator at
  // low E, 15 cents flat, snapping in tune after five seconds. It exercises
  // the whole pipeline with no microphone and no permission, including on
  // pages opened straight from disk, for development and automated checks.
  // Nothing on the page mentions it, and nothing reaches the speakers.
  function startSelftest(context, callbacks) {
    var oscillator = context.createOscillator();
    oscillator.frequency.value = AGR.pitch.midiToFrequency(40);
    oscillator.detune.value = -15;
    var destination = context.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    var flip = setTimeout(function () {
      oscillator.detune.value = 0;
    }, 5000);
    startPipeline(context, destination.stream,
      { oscillator: oscillator, flip: flip }, callbacks);
  }

  // callbacks: onStarted(), onStopped(), onError(kind), onTick(stable, raw).
  // opts: { selftest: boolean }. A second start while running is a no-op.
  function start(callbacks, opts) {
    if (running || pending) return;
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
    if (context.resume) context.resume();

    if (opts && opts.selftest) {
      startSelftest(context, callbacks);
      return;
    }

    var attempt = { cancelled: false, context: context };
    pending = attempt;
    navigator.mediaDevices.getUserMedia({
      audio: {
        // Voice-call processing mangles a ringing string; the tuner wants
        // the raw signal.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    }).then(function (stream) {
      if (attempt.cancelled) {
        // Stopped while the permission prompt was open: release everything.
        stream.getTracks().forEach(function (track) { track.stop(); });
        closeContext(context);
        return;
      }
      pending = null;
      startPipeline(context, stream, null, callbacks);
    }).catch(function (err) {
      if (pending === attempt) pending = null;
      closeContext(context);
      if (!attempt.cancelled) callbacks.onError(errorKind(err));
    });
  }

  // Idempotent: stops the poll, the tracks (which turns the microphone
  // indicator off), and the context, then reports back once.
  function stop() {
    if (pending) {
      pending.cancelled = true;
      pending = null;
      return;
    }
    if (!running) return;
    var active = running;
    running = null;
    clearInterval(active.timer);
    if (active.selftest) {
      clearTimeout(active.selftest.flip);
      try {
        active.selftest.oscillator.stop();
      } catch (err) {
        // Already stopped.
      }
    }
    try {
      active.source.disconnect();
    } catch (err) {
      // Already disconnected.
    }
    var tracks = active.stream && active.stream.getTracks ? active.stream.getTracks() : [];
    for (var i = 0; i < tracks.length; i++) tracks[i].stop();
    closeContext(active.context);
    active.callbacks.onStopped();
  }

  AGR.tuner = {
    isSupported: isSupported,
    isSecure: isSecure,
    start: start,
    stop: stop,
    running: function () { return !!(running || pending); }
  };
})();
