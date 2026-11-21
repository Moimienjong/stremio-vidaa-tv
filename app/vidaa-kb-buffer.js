(function () {
  var activeEl = null;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  var origBlur = HTMLInputElement.prototype.blur;

  // 1. Block Stremio from calling .blur() on the input while you are typing
  HTMLInputElement.prototype.blur = function () {
    if (this === activeEl) return;
    return origBlur.apply(this, arguments);
  };

  function releaseInput(el) {
    if (!el) return;
    activeEl = null;
    try { el.setSelectionRange(0, 0); } catch (err) {}
    origBlur.call(el);
  }

  function flushInput(el) {
    if (!el) return;
    var finalVal = el.value;
    activeEl = null;
    if (origSet) origSet.call(el, finalVal);
    else el.value = finalVal;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));
    try { el.setSelectionRange(0, 0); } catch (err) {}
  }

  // 2. Lock onto the search input when focused (keyboard open)
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      activeEl = el;
    }
  }, true);

  // 3. Block early blur/focusout events while typing
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

  // 4. Block React from seeing each letter mid-word
  ["input", "change", "keyup", "keypress"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (activeEl && e.target === activeEl && e.isTrusted) {
        e.stopImmediatePropagation();
      }
    }, true);
  });

  // 5. Handle Enter, Down Arrow (only when keyboard is closed!), and Back
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode || e.which;
    var focused = document.activeElement;
    var isInput = focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA");
    if (!isInput && !activeEl) return;

    var el = activeEl || focused;

    // DOWN ARROW (40): Only jump to movies when keyboard is closed (activeEl is null)
    if (k === 40 && !activeEl) {
      releaseInput(el);
      return;
    }

    // BACK BUTTON (27, 461, 10009): Close/unlock input and trigger Left nav into the left menu
    if (k === 27 || k === 461 || k === 10009) {
      e.preventDefault();
      e.stopImmediatePropagation();
      releaseInput(el);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37, which: 37, bubbles: true }));
      return;
    }

    // LEFT ARROW (37) when keyboard is closed and at the front: move into the left sidebar
    if (k === 37 && !activeEl && (!el.value || el.selectionStart === 0)) {
      releaseInput(el);
      return;
    }

    // DONE / ENTER (13): Flush the typed word, mark keyboard closed (activeEl = null), and snap cursor to front
    if (k === 13) {
      flushInput(el);
      return;
    }

    if (activeEl && e.target === activeEl && e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);
})();
