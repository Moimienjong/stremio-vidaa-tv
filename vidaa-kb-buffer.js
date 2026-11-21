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
    var navSelectors = [
      "nav a, nav button, nav [tabindex]",
      "[class*='side-nav'] a, [class*='side-nav'] button, [class*='side-nav'] [tabindex]",
      "[class*='vertical-nav'] a, [class*='vertical-nav'] button, [class*='vertical-nav'] [tabindex]",
      "[class*='nav-bar'] a, [class*='nav-bar'] button, [class*='nav-bar'] [tabindex]",
      "a[href='#/search'], a[href='#/']"
    ];
    for (var i = 0; i < navSelectors.length; i++) {
      var items = document.querySelectorAll(navSelectors[i]);
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var rect = item.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.left < 260) {
          item.focus();
          return true;
        }
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

  // 5. Handle Enter (submit), Back/Return (exit to left sidebar), and Left Arrow when input is empty
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode || e.which;
    var focused = document.activeElement;

    // Allow Left Arrow (37) on an empty search box to jump straight to the left sidebar
    if (k === 37 && focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA") && !focused.value) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var elLeft = activeEl || focused;
      activeEl = null;
      origBlur.call(elLeft);
      focusLeftSidebar();
      return;
    }

    // Allow Back / Return (27, 461, 10009) from the search box (or empty focus) to jump to the left sidebar
    if ((k === 27 || k === 461 || k === 10009) && (activeEl || (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var elBack = activeEl || focused;
      activeEl = null;
      if (elBack && elBack.tagName === "INPUT") origBlur.call(elBack);
      if (focusLeftSidebar()) return;
    }

    if (!activeEl) return;

    if (k === 13) { // Done / Enter
      flushInput(activeEl);
    } else if (e.target === activeEl && e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);
})();
