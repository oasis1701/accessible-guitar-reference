// settings.js — load, sanitize, and save reader settings.
// Storage may be unavailable (strict privacy modes, some file:// setups, Node);
// every access is guarded so the site always works on the defaults.
globalThis.AGR = globalThis.AGR || {};

(function () {
  "use strict";

  var AGR = globalThis.AGR;

  // Namespaced and versioned: every *.github.io project site shares one
  // localStorage origin, so the key must not collide with other projects.
  var KEY = "agr:settings:v1";

  var DEFAULTS = { format: "per-string", stringNaming: "both" };

  var VALID = {
    format: ["per-string", "by-finger", "prose"],
    stringNaming: ["both", "number", "name"]
  };

  function sanitize(raw) {
    var out = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      var value = raw && typeof raw === "object" ? raw[key] : null;
      out[key] = VALID[key].indexOf(value) !== -1 ? value : DEFAULTS[key];
    });
    return out;
  }

  AGR.settings = {
    DEFAULTS: DEFAULTS,

    get: function () {
      var raw = null;
      try {
        raw = JSON.parse(localStorage.getItem(KEY));
      } catch (error) {
        raw = null;
      }
      return sanitize(raw);
    },

    set: function (patch) {
      var merged = sanitize(Object.assign({}, AGR.settings.get(), patch));
      try {
        localStorage.setItem(KEY, JSON.stringify(merged));
      } catch (error) {
        // Storage unavailable: settings apply for this page view only.
      }
      return merged;
    }
  };
})();
