/**
 * editor/editor.js: the main code that runs what is referred to as the "editor"
 * in the documentation
 */

api = apiVersions[LATEST_API_VERSION]

var EDITORS = [
  { id: "html", gutter: "htmlGutter", info: "htmlLines", lang: "html" },
  { id: "css", gutter: "cssGutter", info: "cssLines", lang: "css" },
  { id: "javascript", gutter: "jsGutter", info: "jsLines", lang: "js" }
];



/***
 * Helper functions
 ***/

/* Return the HTML string for the page */
function getHTML(data) {
  // Generate an HTML page from the contents of each <textarea>
  var pageData =
`
<!DOCTYPE html>
<head>
<style>
${data["css"]}
</style>
<script type="text/javascript">
${data["js"]}
</scr` +
// This has to be broken up because otherwise it is recognized as the main
// document's end script tag
`ipt>
</head>
<body>
${data["html"]}
</body>
`;

  return pageData;
}


/* Read the three editor boxes */
function getEditorData() {
  return {
    "css" : document.getElementById("css").value,
    "js" : document.getElementById("javascript").value,
    "html" : document.getElementById("html").value
  };
}


/* Display a temporary toast notification */
var toastTimeout = null;
function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function() {
    toast.classList.remove("visible");
  }, 2400);
}


/* Briefly mark a button as done (e.g. "Copied") */
function flashDone(el, label) {
  if (!el || !el.classList) return;
  var text = el.querySelector(".btn-text");
  if (text && !text.hasAttribute("data-label")) {
    text.setAttribute("data-label", text.textContent);
  }
  el.classList.add("is-done");
  if (text && label) text.textContent = label;
  clearTimeout(el._doneTimer);
  el._doneTimer = setTimeout(function() {
    el.classList.remove("is-done");
    if (text) text.textContent = text.getAttribute("data-label");
  }, 1600);
}


/* Copy text, falling back to a prompt when the clipboard is unavailable */
function copyText(text, promptLabel, onDone) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(function() {
      window.prompt(promptLabel, text);
    });
  } else {
    window.prompt(promptLabel, text);
  }
}


/* Syntax-highlight the overlay behind each textarea */
var lastHighlighted = {};
function updateHighlighting() {
  if (typeof Syntax === "undefined") {
    document.querySelectorAll(".code-wrap").forEach(function(w) {
      w.classList.add("plain");
    });
    return;
  }

  EDITORS.forEach(function(item) {
    var textarea = document.getElementById(item.id);
    var target = document.getElementById(item.id + "Hl");
    if (!textarea || !target) return;

    var value = textarea.value;
    if (lastHighlighted[item.id] === value) return;
    lastHighlighted[item.id] = value;

    var markup = Syntax[item.lang](value);
    // A trailing newline needs a character after it to take up a line
    if (value.charAt(value.length - 1) === "\n") markup += " ";
    target.innerHTML = markup;
    syncScroll(item);
  });
}


/* Keep the overlay and line numbers aligned with the textarea scroll */
function syncScroll(item) {
  var textarea = document.getElementById(item.id);
  var code = document.getElementById(item.id + "Hl");
  var gutter = document.getElementById(item.gutter);
  if (!textarea) return;
  var x = textarea.scrollLeft;
  var y = textarea.scrollTop;
  if (code) code.style.transform = "translate(" + (-x) + "px," + (-y) + "px)";
  if (gutter) gutter.style.transform = "translateY(" + (-y) + "px)";
}


/* Update line numbers and line counts for each editor pane */
var lastLineCount = {};
function updateLineNumbers() {
  EDITORS.forEach(function(item) {
    var textarea = document.getElementById(item.id);
    var gutter = document.getElementById(item.gutter);
    var info = document.getElementById(item.info);
    if (!textarea || !gutter) return;

    var count = (textarea.value.match(/\n/g) || []).length + 1;
    if (lastLineCount[item.id] === count) return;
    lastLineCount[item.id] = count;

    var lines = [];
    for (var i = 1; i <= count; i++) {
      lines.push(i);
    }
    gutter.textContent = lines.join("\n");
    if (info) {
      info.textContent = count.toLocaleString() + (count === 1 ? " line" : " lines");
    }
  });
}


/* Switch active pane on mobile/tablet screens */
function switchMobileTab(tabName) {
  var buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(function(btn) {
    var isActive = btn.getAttribute("data-tab") === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  var panes = document.querySelectorAll(".editor-card");
  var previewSection = document.getElementById("previewSection");
  var textboxes = document.getElementById("textboxes");

  if (tabName === "preview") {
    panes.forEach(function(p) { p.classList.remove("active"); });
    if (textboxes) textboxes.style.display = "none";
    if (previewSection) previewSection.classList.add("active");
  } else {
    if (textboxes) textboxes.style.display = "";
    if (previewSection) previewSection.classList.remove("active");
    panes.forEach(function(p) {
      p.classList.toggle("active", p.getAttribute("data-pane") === tabName);
    });
  }
}


/* Clear a single editor box */
function clearPane(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.value = "";
  el.focus();
  update();
  var names = { html: "HTML", css: "CSS", javascript: "JavaScript" };
  showToast((names[id] || id) + " cleared");
}


/* Load a sample starter template into the editors */
function loadStarterTemplate() {
  document.getElementById("html").value =
`<div class="card">
  <span class="badge">Lifetime FreeHost</span>
  <h1>Hello from the URL! 👋</h1>
  <p>This entire webpage is stored inside the shareable URL link.</p>
  <button id="magicBtn">Click Me (<span id="count">0</span>)</button>
</div>`;

  document.getElementById("css").value =
`body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
  color: #0f172a;
}
.card {
  background: #ffffff;
  padding: 2rem 2.5rem;
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  text-align: center;
  max-width: 420px;
  border: 1px solid #e2e8f0;
}
.badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 10px;
}
h1 { margin: 0 0 8px; font-size: 1.6rem; }
p { color: #64748b; line-height: 1.5; margin-bottom: 1.25rem; }
button {
  background: #4f46e5;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}`;

  document.getElementById("javascript").value =
`window.addEventListener("DOMContentLoaded", () => {
  let clicks = 0;
  const btn = document.getElementById("magicBtn");
  const count = document.getElementById("count");
  if (btn && count) {
    btn.addEventListener("click", () => {
      clicks++;
      count.textContent = clicks;
    });
  }
});`;

  update();
  showToast("Demo loaded");
}


/* Change live preview iframe viewport width */
function setPreviewWidth(width, btn) {
  var frame = document.getElementById("previewFrame");
  var stage = document.getElementById("iframeStage");
  if (frame) {
    frame.style.width = width;
  }
  if (stage) {
    stage.classList.toggle("full-bleed", width === "100%");
  }
  var buttons = document.querySelectorAll(".vp-btn");
  buttons.forEach(function(b) {
    b.classList.toggle("active", b === btn);
  });
}


/* Show the page's link in the preview address bar */
function renderAddressBar(url) {
  var hostEl = document.getElementById("addrHost");
  var hashEl = document.getElementById("addrHash");
  if (!hostEl || !hashEl) return;
  var cut = url.indexOf("#");
  var base = cut === -1 ? url : url.slice(0, cut);
  var hash = cut === -1 ? "" : url.slice(cut);
  hostEl.textContent = base.replace(/^https?:\/\//, "").replace(/index\.html$/, "");
  hashEl.textContent = hash;
}


/* Copy compressed shareable URL directly to clipboard */
async function copyShareLink(btn) {
  var url = await api.getCompressedViewLink(getEditorData());
  document.getElementById("getLinkLink").href = url;

  copyText(url, "Copy shareable link:", function() {
    flashDone(btn, "Copied");
    showToast("Link copied");
  });
}


/* Generate and copy 5-character ultra-short alias link (#abcde) */
function copyShortAliasLink(btn) {
  var packed = packParts(getEditorData());
  var shortUrl = createShortAlias(packed);
  document.getElementById("getLinkLink").href = shortUrl;

  copyText(shortUrl, "Copy short link:", function() {
    var code = shortUrl.split("#")[1];
    flashDone(btn);
    showToast("Short link #" + code + " copied. It opens only in this browser.");
  });
}


/* Switch between light and dark themes */
function toggleTheme() {
  var root = document.documentElement;
  var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("lfh_theme", next);
  } catch (e) {}
  syncThemeToggle();
}

function syncThemeToggle() {
  var btn = document.getElementById("themeToggle");
  if (!btn) return;
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var label = isDark ? "Switch to light theme" : "Switch to dark theme";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
}



/***
 * Button press functions
 ***/


/* Copy the compiled HTML page so the user can paste it anywhere */
function showCopyCodePrompt(btn) {
  var html = getHTML(getEditorData());
  copyText(html, "Copy to clipboard: ", function() {
    flashDone(btn);
    showToast("HTML copied");
  });
}


/* Show only the preview, or bring the editors back */
function toggleZen(force) {
  var on = typeof force === "boolean" ? force : !document.body.classList.contains("zen-mode");
  document.body.classList.toggle("zen-mode", on);
  var btn = document.getElementById("zenToggle");
  var label = document.getElementById("zenLabel");
  if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  if (label) label.textContent = on ? "Exit fullscreen" : "Fullscreen";
}

/* Kept for older markup that used a checkbox */
function hideButtons(box) {
  toggleZen(!!box.checked);
}



/***
 * Main procedure functions
 ***/

/* Run once when the page is loaded */
async function initialize() {
  // Get page data from the URL and load it into the boxes
  if (window.location.hash) {
    var encoded = window.location.hash.slice(1);
    try {
      if (/^[a-z0-9]{5}$/i.test(encoded)) {
        var resolved = resolveShortAlias(encoded.toLowerCase());
        if (resolved !== null) {
          var shortParts = unpackToParts(resolved);
          document.getElementById("html").value = shortParts.html;
          document.getElementById("css").value = shortParts.css;
          document.getElementById("javascript").value = shortParts.js;
        }
      } else if (encoded.indexOf("z.") === 0) {
        var decompressed = await decompressFromHash(encoded);
        var parts = unpackToParts(decompressed);
        document.getElementById("html").value = parts.html;
        document.getElementById("css").value = parts.css;
        document.getElementById("javascript").value = parts.js;
      } else {
        var json = b64.decode(encoded);
        var data = JSON.parse(json);

        document.getElementById("css").value = data["css"] || "";
        document.getElementById("javascript").value = data["js"] || "";
        document.getElementById("html").value = data["html"] || "";
      }
    } catch (e) {
      // Ignore malformed hash on initial load
    }
  }

  var stage = document.getElementById("iframeStage");
  if (stage) stage.classList.add("full-bleed");

  syncThemeToggle();
  setupEditorEnhancements();
  update();
}


/* Configure Tab indentation, scroll sync, and split resizer */
function setupEditorEnhancements() {
  EDITORS.forEach(function(item) {
    var textarea = document.getElementById(item.id);
    if (!textarea) return;

    textarea.addEventListener("scroll", function() {
      syncScroll(item);
    });

    textarea.addEventListener("keydown", function(e) {
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        update();
      }
    });
  });

  // Esc leaves fullscreen preview
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && document.body.classList.contains("zen-mode")) {
      toggleZen(false);
    }
  });

  // Setup vertical drag resizer between editor grid and preview pane
  var resizer = document.getElementById("dragResizer");
  var workspace = document.getElementById("workspace");
  var textboxes = document.getElementById("textboxes");
  if (resizer && workspace && textboxes) {
    var isDragging = false;

    function setFramePointer(value) {
      var iframe = document.getElementById("previewFrame");
      if (iframe) iframe.style.pointerEvents = value;
    }

    resizer.addEventListener("pointerdown", function(e) {
      isDragging = true;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      setFramePointer("none");
      e.preventDefault();
    });

    window.addEventListener("pointermove", function(e) {
      if (!isDragging) return;
      var rect = workspace.getBoundingClientRect();
      var offsetY = e.clientY - rect.top;
      var percentage = Math.min(82, Math.max(18, (offsetY / rect.height) * 100));
      textboxes.style.height = percentage + "%";
    });

    window.addEventListener("pointerup", function() {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      setFramePointer("");
    });
  }

  window.addEventListener("resize", function() {
    if (window.innerWidth > 960) {
      var textboxesEl = document.getElementById("textboxes");
      if (textboxesEl) textboxesEl.style.display = "";
    }
  });
}


/* Run each time a text box changes */
var updateSeq = 0;
async function update() {
  var currentSeq = ++updateSeq;
  var data = getEditorData();

  var html = getHTML(data);

  // Update the download link immediately
  document.getElementById("downloadLink").href = `data:text/html,${encodeURIComponent(html)}`;

  // Update line numbers and colours immediately
  updateLineNumbers();
  updateHighlighting();

  // Invite the user to start when every box is empty
  var isEmpty = !data.html.trim() && !data.css.trim() && !data.js.trim();
  var emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.hidden = !isEmpty;

  // Update the <iframe> to display the generated page immediately
  window.frames[0].location.replace(`data:text/html;charset=utf-8;base64,${b64.encode(html)}`);

  // Compress URL hash asynchronously using Deflate-Raw
  var packed = packParts(data);
  var compressedHash = await compressToHash(packed);
  if (currentSeq !== updateSeq) return;

  // Save compressed page data to the editor URL without polluting history
  try {
    history.replaceState(null, "", "#" + compressedHash);
  } catch (e) {
    window.location.hash = "#" + compressedHash;
  }

  // Update the URL for the "Open page" button and the address bar
  var viewLink = `${getBaseViewerUrl()}#${compressedHash}`;
  document.getElementById("getLinkLink").href = viewLink;
  renderAddressBar(viewLink);

  // Calculate savings compared to legacy v0.2.0 uncompressed link
  var legacyLink = apiVersions["0.2.0"].getViewLink(html);
  var savedPct = Math.max(0, Math.round((1 - viewLink.length / legacyLink.length) * 100));

  var statsEl = document.getElementById("urlStats");
  if (statsEl) {
    statsEl.textContent = viewLink.length.toLocaleString() + " chars";
    statsEl.title = savedPct + "% shorter than an uncompressed link";
  }
}
