(function () {
  var activeEl = null;
  var fullHeight = window.innerHeight || 1080;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  var origBlur = HTMLInputElement.prototype.blur;

  window.addEventListener("resize", function () {
    if (window.innerHeight > fullHeight) fullHeight = window.innerHeight;
  });

  function isKeyboardOpen() {
    // VIDAA shrinks innerHeight when the on-screen keyboard is up
    return window.innerHeight < fullHeight * 0.85;
  }

  // 1. Block Stremio from calling .blur() while typing
  HTMLInputElement.prototype.blur = function () {
    if (this === activeEl && isKeyboardOpen()) return;
    return origBlur.apply(this, arguments);
  };

  function flushInput(el) {
    if (!el) return;
    var finalVal = el.value;
    if (origSet) origSet.call(el, finalVal);
    else el.value = finalVal;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function focusFirstMovie() {
    var posters = document.querySelectorAll("a[href*='#/detail'], [class*='poster'], [class*='meta-item']");
    for (var i = 0; i < posters.length; i++) {
      var p = posters[i];
      var r = p.getBoundingClientRect();
      if (r.width > 60 && r.height > 80 && r.top > 120 && r.left >= 0) {
        if (p.tabIndex < 0) p.tabIndex = 0;
        p.focus();
        if (document.activeElement === p) return true;
      }
    }
    return false;
  }

  function focusLeftSidebar() {
    var navs = document.querySelectorAll("a[href='#/'], a[href='#/search'], a[href='#/board'], nav a, nav div, [class*='nav-bar'] a, [class*='nav-bar'] div");
    for (var i = 0; i < navs.length; i++) {
      var n = navs[i];
      if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") continue;
      var r = n.getBoundingClientRect();
      if (r.width >= 24 && r.width <= 260 && r.height >= 24 && r.height <= 120 && r.left >= 0 && r.left < 150 && r.top >= 40) {
        if (n.tabIndex < 0) n.tabIndex = 0;
        n.focus();
        if (document.activeElement === n) return true;
      }
    }
    return false;
  }

  // 2. Track search input focus
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      activeEl = el;
    }
  }, true);

  // 3. Keep focus locked only while the TV keyboard is actually open
  ["blur", "focusout"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (activeEl && e.target === activeEl && isKeyboardOpen()) {
        e.stopImmediatePropagation();
        setTimeout(function () {
          if (activeEl && isKeyboardOpen() && document.activeElement !== activeEl) {
            activeEl.focus();
          }
        }, 0);
      }
    }, true);
  });

  // 4. Flush typed letters smoothly when OK (13) is pressed on the TV keyboard
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode || e.which;
    var focused = document.activeElement;
    var isInput = focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA");
    if (!isInput && !activeEl) return;

    var el = activeEl || focused;

    // If the TV keyboard is OPEN, let Down/Left/Right/OK work normally on the keyboard!
    if (isKeyboardOpen()) {
      if (k === 13) {
        setTimeout(function () { flushInput(el); }, 30);
      }
      return;
    }

    // From here on, the TV keyboard is CLOSED:
    // DOWN ARROW (40): Leave search box and focus the first movie poster directly
    if (k === 40) {
      e.preventDefault();
      e.stopImmediatePropagation();
      activeEl = null;
      try { el.setSelectionRange(0, 0); } catch (err) {}
      origBlur.call(el);
      focusFirstMovie();
      return;
    }

    // BACK BUTTON (27, 461, 10009): Leave search box and focus the left sidebar directly
    if (k === 27 || k === 461 || k === 10009) {
      e.preventDefault();
      e.stopImmediatePropagation();
      activeEl = null;
      try { el.setSelectionRange(0, 0); } catch (err) {}
      origBlur.call(el);
      focusLeftSidebar();
      return;
    }
  }, true);
})();
