(function () {
  var activeEl = null;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;

  function flushInput(el) {
    if (!el) return;
    var finalVal = el.value;
    activeEl = null;
    origSet.call(el, finalVal);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));
  }

  // Track when the TV keyboard opens on the search input
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      activeEl = el;
    }
  }, true);

  // Stop Stremio/React from seeing each letter (which causes React to remount the input and close VIDAA's keyboard)
  ["input", "change", "keyup", "keypress"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (activeEl && e.target === activeEl && e.isTrusted) {
        e.stopImmediatePropagation();
      }
    }, true);
  });

  // Intercept keydown: let normal typing stay inside the browser's native input box, flush only on Enter/Done
  document.addEventListener("keydown", function (e) {
    if (!activeEl || e.target !== activeEl) return;
    var k = e.keyCode || e.which;
    if (k === 13) { // Done / Enter on TV keyboard
      flushInput(activeEl);
    } else if (k === 27 || k === 461 || k === 10009) { // Back / Return
      activeEl = null;
    } else if (e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);

  // Also flush if the user closes the TV keyboard via its "Close/Done" button (which triggers blur/focusout)
  document.addEventListener("focusout", function (e) {
    if (activeEl && e.target === activeEl) {
      flushInput(activeEl);
    }
  }, true);
})();
