(function () {
  var typingInput = null;
  var origPush = history.pushState;
  var origReplace = history.replaceState;

  // 1. Stop Stremio from changing the URL (#/search?search=...) while TV keyboard is open
  history.pushState = function () {
    if (typingInput) return;
    return origPush.apply(this, arguments);
  };
  history.replaceState = function () {
    if (typingInput) return;
    return origReplace.apply(this, arguments);
  };

  document.addEventListener("focusin", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
      typingInput = e.target;
    }
  }, true);

  document.addEventListener("focusout", function (e) {
    if (e.target === typingInput) {
      var el = typingInput;
      typingInput = null;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, true);

  // 2. Block live search re-renders on every letter; flush once when Done/Enter is pressed
  document.addEventListener("input", function (e) {
    if (typingInput && e.target === typingInput && e.isTrusted) {
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("keydown", function (e) {
    if (!typingInput) return;
    var k = e.keyCode || e.which;
    if (k === 13) { // Enter / Done on TV keyboard
      var el = typingInput;
      typingInput = null;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (k === 27 || k === 461 || k === 10009) {
      typingInput = null;
    } else {
      e.stopImmediatePropagation();
    }
  }, true);
})();
