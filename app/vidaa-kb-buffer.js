(function () {
  var overlay = null;
  var activeInput = null;
  var currentText = "";
  var nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;

  var ROWS = [
    ["A","B","C","D","E","F","G","H","I","J"],
    ["K","L","M","N","O","P","Q","R","S","T"],
    ["U","V","W","X","Y","Z","0","1","2","3"],
    ["4","5","6","7","8","9","SPACE","DEL","CLEAR","SEARCH"]
  ];
  var r = 0, c = 0;

  function submitToStremio(input, val) {
    if (!input) return;
    nativeSetter.call(input, val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
  }

  function closeKeyboard() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (activeInput) {
      activeInput.focus();
      activeInput = null;
    }
  }

  function renderKeys() {
    var display = document.getElementById("vkb-display");
    if (display) display.textContent = currentText || "Type with D-pad arrows + OK...";
    var btns = overlay.querySelectorAll(".vkb-btn");
    btns.forEach(function (b) {
      var br = parseInt(b.dataset.r, 10);
      var bc = parseInt(b.dataset.c, 10);
      if (br === r && bc === c) {
        b.style.background = "#7b5bf5";
        b.style.color = "#fff";
        b.style.transform = "scale(1.08)";
      } else {
        b.style.background = b.dataset.key === "SEARCH" ? "#2e7d32" : "#222";
        b.style.color = "#eee";
        b.style.transform = "scale(1)";
      }
    });
  }

  function openKeyboard(input) {
    if (overlay) return;
    activeInput = input;
    currentText = input.value || "";
    r = 0; c = 0;

    overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999999;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;";

    var box = document.createElement("div");
    box.id = "vkb-display";
    box.style.cssText =
      "width:72%;max-width:820px;padding:18px 24px;margin-bottom:22px;background:#141414;" +
      "border:2px solid #7b5bf5;border-radius:12px;color:#fff;font-size:28px;min-height:38px;";
    overlay.appendChild(box);

    ROWS.forEach(function (row, ri) {
      var rowEl = document.createElement("div");
      rowEl.style.cssText = "display:flex;gap:10px;margin-bottom:10px;";
      row.forEach(function (key, ci) {
        var btn = document.createElement("div");
        btn.className = "vkb-btn";
        btn.dataset.r = ri;
        btn.dataset.c = ci;
        btn.dataset.key = key;
        btn.textContent = key === "SPACE" ? "␣" : key === "DEL" ? "⌫" : key;
        btn.style.cssText =
          "min-width:" + (key.length > 1 ? "96px" : "62px") + ";height:58px;" +
          "display:flex;align-items:center;justify-content:center;border-radius:10px;" +
          "font-size:22px;font-weight:bold;transition:all 0.1s;";
        rowEl.appendChild(btn);
      });
      overlay.appendChild(rowEl);
    });

    var hint = document.createElement("div");
    hint.textContent = "Arrows: Move  •  OK: Select  •  Back/Return: Close";
    hint.style.cssText = "color:#999;font-size:18px;margin-top:14px;";
    overlay.appendChild(hint);

    document.body.appendChild(overlay);
    renderKeys();
  }

  document.addEventListener("keydown", function (e) {
    if (!overlay) {
      var el = document.activeElement;
      if (el && el.tagName === "INPUT" && (e.key === "Enter" || e.keyCode === 13)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        el.blur();
        openKeyboard(el);
      }
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    var k = e.keyCode || e.which;

    if (k === 37) { c = (c - 1 + ROWS[r].length) % ROWS[r].length; renderKeys(); } // Left
    else if (k === 39) { c = (c + 1) % ROWS[r].length; renderKeys(); } // Right
    else if (k === 38) { r = (r - 1 + ROWS.length) % ROWS.length; c = Math.min(c, ROWS[r].length - 1); renderKeys(); } // Up
    else if (k === 40) { r = (r + 1) % ROWS.length; c = Math.min(c, ROWS[r].length - 1); renderKeys(); } // Down
    else if (k === 13) { // OK / Enter
      var key = ROWS[r][c];
      if (key === "SPACE") currentText += " ";
      else if (key === "DEL") currentText = currentText.slice(0, -1);
      else if (key === "CLEAR") currentText = "";
      else if (key === "SEARCH") {
        var target = activeInput;
        var finalQuery = currentText;
        closeKeyboard();
        submitToStremio(target, finalQuery);
        return;
      } else {
        currentText += key.toLowerCase();
      }
      renderKeys();
    } else if (k === 8 || k === 27 || k === 461 || k === 10009) { // Back / Return
      closeKeyboard();
    }
  }, true);
})();
