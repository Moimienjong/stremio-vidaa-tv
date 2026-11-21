(function () {
  var timer = null;
  var nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;

  function flushToReact(input) {
    if (!input) return;
    nativeSetter.call(input, input.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  document.addEventListener(
    "input",
    function (e) {
      var el = e.target;
      if (!el || el.tagName !== "INPUT") return;
      // Block React from re-rendering mid-typing on search inputs
      if (e.isTrusted) {
        e.stopImmediatePropagation();
        clearTimeout(timer);
        timer = setTimeout(function () {
          flushToReact(el);
        }, 5000); // Waits 5s after you stop typing before searching
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (e) {
      var el = e.target;
      if (!el || el.tagName !== "INPUT") return;
      // Triggers immediately when you press OK / Enter on the VIDAA remote or keyboard
      if (e.key === "Enter" || e.keyCode === 13) {
        clearTimeout(timer);
        flushToReact(el);
      }
    },
    true
  );
})();
