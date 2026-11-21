(function () {
  var lockedInput = null;
  var origBlur = HTMLInputElement.prototype.blur;

  // Stop Stremio from blurring the input while you are typing on the TV keyboard
  HTMLInputElement.prototype.blur = function () {
    if (this === lockedInput) return;
    return origBlur.apply(this, arguments);
  };

  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      lockedInput = el;
      el.setAttribute("inputmode", "text");
    }
  }, true);

  // Stop Stremio's navigation scripts from stealing focus on every letter
  document.addEventListener("keydown", function (e) {
    var el = document.activeElement;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;

    var k = e.keyCode || e.which;
    // Unlock when you press Enter/Done (13) or Back/Escape (27, 461, 10009)
    if (k === 13 || k === 27 || k === 461 || k === 10009) {
      lockedInput = null;
      return;
    }

    e.stopImmediatePropagation();
  }, true);
})();
