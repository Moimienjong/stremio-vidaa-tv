(function () {
  var activeEl = null;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  var origBlur = HTMLInputElement.prototype.blur;

  // 1. Block Stremio from calling .blur() on the input while you are typing
  HTMLInputElement.prototype.blur = function () {
    if (this === activeEl) return;
    return origBlur.apply(this, arguments);
  };

  function flushInput(el) {
    if (!el) return;
    var finalVal = el.value;
    activeEl = null;
    origSet.call(el, finalVal);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));
  }

  // 2. Lock onto the search input when focused
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      activeEl = el;
    }
  }, true);

  // 3. Block early blur/focusout events while typing (VIDAA fires these after 1 letter!)
  ["blur", "focusout"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (activeEl && e.target === activeEl) {
        e.stopImmediatePropagation();
        setTimeout(function () {
          if (activeEl && document.activeElement !== activeEl) {
            activeEl.focus();
          }
        }, 0);
      }
    }, true);
  });

  // 4. Block React from seeing each letter mid-word (prevents React from remounting the input)
  ["input", "change", "keyup", "keypress"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (activeEl && e.target === activeEl && e.isTrusted) {
        e.stopImmediatePropagation();
      }
    }, true);
  });

  // 5. Flush the full word only when you press Done / Enter (13) on the TV keyboard
  document.addEventListener("keydown", function (e) {
    if (!activeEl) return;
    var k = e.keyCode || e.which;
    if (k === 13) { // Done / Enter
      flushInput(activeEl);
    } else if (k === 27 || k === 461 || k === 10009) { // Back / Return
      var el = activeEl;
      activeEl = null;
      origBlur.call(el);
    } else if (e.target === activeEl && e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);
})();
