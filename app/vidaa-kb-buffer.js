(function () {
  var activeEl = null;
  var lastTypeTime = 0;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  var origBlur = HTMLInputElement.prototype.blur;

  // 1. Always block Stremio from calling .blur() while activeEl is locked (keeps your keyboard open)
  HTMLInputElement.prototype.blur = function () {
    if (this === activeEl) return;
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

  // 2. Lock onto the search input when focused AND place cursor at the very end of existing text
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      activeEl = el;
      setTimeout(function () {
        try {
          var len = el.value.length;
          el.setSelectionRange(len, len);
        } catch (err) {}
      }, 0);
    }
  }, true);

  // 3. Always block early blur/focusout events while activeEl is locked
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

  // 4. Flush live search smoothly on OK (13) while keeping activeEl locked
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode || e.which;
    var focused = document.activeElement;
    var isInput = focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA");
    if (!isInput && !activeEl) return;

    var el = activeEl || focused;

    // Letter / OK pressed on keyboard: update timestamp and flush live results
    if (k === 13 || (k >= 48 && k <= 90) || k === 32 || k === 8) {
      lastTypeTime = Date.now();
      if (k === 13) {
        setTimeout(function () { flushInput(el); }, 30);
      }
      return;
    }

    // DOWN ARROW (40): Jump to movies once you stop typing (> 350ms after last key)
    if (k === 40 && Date.now() - lastTypeTime > 350) {
      e.preventDefault();
      e.stopImmediatePropagation();
      activeEl = null;
      origBlur.call(el);
      focusFirstMovie();
      return;
    }

    // BACK BUTTON (27, 461, 10009): Jump straight to the left menu
    if (k === 27 || k === 461 || k === 10009) {
      e.preventDefault();
      e.stopImmediatePropagation();
      activeEl = null;
      origBlur.call(el);
      focusLeftSidebar();
      return;
    }
  }, true);
})();
