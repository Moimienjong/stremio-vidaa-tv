(function () {
  var activeEl = null;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  var origBlur = HTMLInputElement.prototype.blur;

  // 1. Block Stremio from calling .blur() on the input while you are typing
  HTMLInputElement.prototype.blur = function () {
    if (this === activeEl) return;
    return origBlur.apply(this, arguments);
  };

  function focusLeftSidebar() {
    var candidates = document.querySelectorAll("a, button, [role='button'], [tabindex], [class*='nav-item'], [class*='menu-item'], [class*='sidebar'] div");
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") continue;
      var rect = el.getBoundingClientRect();
      if (rect.width >= 30 && rect.width <= 260 && rect.height >= 30 && rect.height <= 120 && rect.left >= 0 && rect.left < 150 && rect.top >= 60) {
        if (el.tabIndex < 0) el.tabIndex = 0;
        el.focus();
        if (document.activeElement === el) return true;
      }
    }
    return false;
  }

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

  // 5. Handle Enter (submit), and jump to left sidebar anytime on Back or Left Arrow (at start of text)
  function handleExitNav(e) {
    var k = e.keyCode || e.which;
    var focused = document.activeElement;
    var isInput = focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA");
    var isBackKey = (k === 27 || k === 461 || k === 10009);
    var isLeftAtStart = (k === 37 && isInput && (!focused.value || focused.selectionStart === 0));

    if (isInput && (isBackKey || isLeftAtStart)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var elExit = activeEl || focused;
      activeEl = null;
      origBlur.call(elExit);
      if (!focusLeftSidebar() && isBackKey) {
        window.location.hash = "#/";
      }
      return true;
    }
    return false;
  }

  document.addEventListener("keydown", function (e) {
    if (handleExitNav(e)) return;
    if (!activeEl) return;

    var k = e.keyCode || e.which;
    if (k === 13) { // Done / Enter
      flushInput(activeEl);
    } else if (e.target === activeEl && e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("keyup", function (e) {
    handleExitNav(e);
  }, true);
})();
