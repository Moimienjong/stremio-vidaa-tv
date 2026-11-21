(function () {
  var activeEl = null;
  var origSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  var origBlur = HTMLInputElement.prototype.blur;

  // 1. Block Stremio from calling .blur() while keyboard is open (activeEl is locked)
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
    // 1st priority: match Stremio's exact sidebar route links (Home, Board, Discover, Library, Search)
    var routeLinks = document.querySelectorAll(
      "a[href='#/'], a[href='#/board'], a[href='#/discover'], a[href='#/library'], a[href='#/search']"
    );
    for (var i = 0; i < routeLinks.length; i++) {
      var link = routeLinks[i];
      var lr = link.getBoundingClientRect();
      if (lr.width > 0 && lr.height > 0 && lr.left >= 0 && lr.left < 260) {
        if (link.tabIndex < 0) link.tabIndex = 0;
        link.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        link.focus();
        if (document.activeElement === link) return true;
      }
    }

    // 2nd priority: any visible nav/sidebar container item on the far left
    var navs = document.querySelectorAll(
      "nav a, nav div, nav button, [class*='nav-bar'] a, [class*='nav-bar'] div, [class*='side-nav'] a, [class*='side-nav'] div, [class*='vertical-nav'] a, [class*='vertical-nav'] div"
    );
    for (var j = 0; j < navs.length; j++) {
      var n = navs[j];
      if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") continue;
      var r = n.getBoundingClientRect();
      if (r.width >= 20 && r.width <= 260 && r.height >= 20 && r.height <= 140 && r.left >= 0 && r.left < 220) {
        if (n.tabIndex < 0) n.tabIndex = 0;
        n.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        n.focus();
        if (document.activeElement === n) return true;
      }
    }
    return false;
  }

  function isSubScreen() {
    var h = (window.location.hash || "").toLowerCase();
    return (
      h.indexOf("#/player") === 0 ||
      h.indexOf("#/detail") === 0 ||
      h.indexOf("#/metadetails") === 0 ||
      h.indexOf("#/settings") === 0
    );
  }

  function isNuvioBackEvent(e) {
    var key = String((e && e.key) || "");
    var keyLower = key.toLowerCase();
    var keyName = String((e && (e.keyName || (e.detail && e.detail.keyName))) || "");
    var keyNameLower = keyName.toLowerCase();
    var code = String((e && e.code) || "");
    var rawCode = Number((e && (e.keyCode || e.which)) || 0);

    if (key === "Backspace" || rawCode === 8 || key === "Delete" || rawCode === 46) {
      return false;
    }
    if (["back", "goback", "browserback", "xf86back"].indexOf(keyNameLower) !== -1) {
      return true;
    }
    if ([461, 10009, 27].indexOf(rawCode) !== -1) {
      return true;
    }
    if (
      key === "Escape" ||
      key === "Esc" ||
      key === "GoBack" ||
      key === "XF86Back" ||
      code === "BrowserBack" ||
      code === "GoBack"
    ) {
      return true;
    }
    return keyLower.indexOf("back") !== -1;
  }

  // 2. Lock onto search input when focused & place cursor at the end of existing text
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

  // 3. Keep keyboard open while activeEl is locked
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

  // 4. Handle Back (1st closes keyboard; when no keyboard, jumps to left sidebar from anywhere) + Single Down to movies
  ["keydown", "keyup"].forEach(function (evtType) {
    window.addEventListener(evtType, function (e) {
      var focused = document.activeElement;
      var isInput = focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA");
      var el = activeEl || (isInput ? focused : null);

      if (isNuvioBackEvent(e)) {
        if (activeEl) {
          // Keyboard is open: unlock so TV closes the keyboard cleanly
          activeEl = null;
          origBlur.call(el);
        } else if (!isSubScreen()) {
          // Browsing Search / Home / Discover / Library (even 20 posters deep): jump straight to left sidebar
          e.preventDefault();
          e.stopImmediatePropagation();
          if (el) origBlur.call(el);
          focusLeftSidebar();
        }
        return;
      }

      if (evtType !== "keydown" || !el) return;
      var k = e.keyCode || e.which;

      // OK (13) on keyboard: flush live movie results
      if (k === 13) {
        setTimeout(function () { flushInput(el); }, 30);
        return;
      }

      // Single Down Arrow (40) once keyboard is closed: jump straight to the first movie poster
      if (k === 40) {
        e.preventDefault();
        e.stopImmediatePropagation();
        activeEl = null;
        origBlur.call(el);
        focusFirstMovie();
        return;
      }
    }, true);
  });

  // 5. Also catch browser history Back (popstate) when browsing Search or movie rows
  window.addEventListener("popstate", function () {
    if (activeEl) {
      var el = activeEl;
      activeEl = null;
      origBlur.call(el);
    } else if (!isSubScreen()) {
      focusLeftSidebar();
    }
  }, true);
})();
