/**
 * editor/editor.js: the main code that runs what is referred to as the "editor"
 * in the documentation
 */

api = apiVersions[LATEST_API_VERSION]



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
  }, 2600);
}


/* Update line numbers and line counts for each editor pane */
function updateLineNumbers() {
  var editors = [
    { id: "html", gutter: "htmlGutter", info: "htmlLines" },
    { id: "css", gutter: "cssGutter", info: "cssLines" },
    { id: "javascript", gutter: "jsGutter", info: "jsLines" }
  ];

  editors.forEach(function(item) {
    var textarea = document.getElementById(item.id);
    var gutter = document.getElementById(item.gutter);
    var info = document.getElementById(item.info);
    if (!textarea || !gutter) return;

    var count = (textarea.value.match(/\n/g) || []).length + 1;
    var lines = [];
    for (var i = 1; i <= count; i++) {
      lines.push(i);
    }
    gutter.textContent = lines.join("\n");
    if (info) {
      info.textContent = count + (count === 1 ? " line" : " lines");
    }
  });
}


/* Switch active pane on mobile/tablet screens */
function switchMobileTab(tabName) {
  var buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(function(btn) {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
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
  showToast(id.toUpperCase() + " cleared");
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
  showToast("Demo template loaded!");
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


/* Copy compressed shareable URL directly to clipboard */
async function copyShareLink() {
  var data = {
    "css" : document.getElementById("css").value,
    "js" : document.getElementById("javascript").value,
    "html" : document.getElementById("html").value
  };
  var url = await api.getCompressedViewLink(data);
  document.getElementById("getLinkLink").href = url;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      showToast("Compressed Share Link copied!");
    }).catch(function() {
      window.prompt("Copy shareable link:", url);
    });
  } else {
    window.prompt("Copy shareable link:", url);
  }
}


/* Generate and copy 5-character ultra-short alias link (#abcde) */
function copyShortAliasLink() {
  var data = {
    "css" : document.getElementById("css").value,
    "js" : document.getElementById("javascript").value,
    "html" : document.getElementById("html").value
  };
  var packed = packParts(data);
  var shortUrl = createShortAlias(packed);
  document.getElementById("getLinkLink").href = shortUrl;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shortUrl).then(function() {
      var code = shortUrl.split("#")[1];
      showToast("Short Link (#" + code + ") copied!");
    }).catch(function() {
      window.prompt("Copy Short Link:", shortUrl);
    });
  } else {
    window.prompt("Copy Short Link:", shortUrl);
  }
}



/***
 * Button press functions
 ***/


/* Show a prompt with the HTML page data so the user can copy the code */
function showCopyCodePrompt() {
  var data = {
    "css" : document.getElementById("css").value,
    "js" : document.getElementById("javascript").value,
    "html" : document.getElementById("html").value
  };

  var html = getHTML(data);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(html).then(function() {
      showToast("Compiled HTML copied to clipboard!");
    }).catch(function() {
      window.prompt("Copy to clipboard: ", html);
    });
  } else {
    window.prompt("Copy to clipboard: ", html);
  }
}


/* Hide and show buttons based on checkbox state */
function hideButtons(box) {
  document.body.classList.toggle("zen-mode", box.checked);
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

  setupEditorEnhancements();
  update();
}


/* Configure Tab indentation, gutter scroll sync, and split resizer */
function setupEditorEnhancements() {
  var pairs = [
    { id: "html", gutter: "htmlGutter" },
    { id: "css", gutter: "cssGutter" },
    { id: "javascript", gutter: "jsGutter" }
  ];

  pairs.forEach(function(pair) {
    var textarea = document.getElementById(pair.id);
    var gutter = document.getElementById(pair.gutter);
    if (!textarea) return;

    textarea.addEventListener("scroll", function() {
      if (gutter) gutter.scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener("keydown", function(e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        update();
      }
    });
  });

  // Setup vertical drag resizer between editor grid and preview pane
  var resizer = document.getElementById("dragResizer");
  var workspace = document.getElementById("workspace");
  var textboxes = document.getElementById("textboxes");
  if (resizer && workspace && textboxes) {
    var isDragging = false;

    resizer.addEventListener("mousedown", function(e) {
      isDragging = true;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      var iframe = document.querySelector("iframe");
      if (iframe) iframe.style.pointerEvents = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", function(e) {
      if (!isDragging) return;
      var rect = workspace.getBoundingClientRect();
      var offsetY = e.clientY - rect.top;
      var percentage = Math.min(82, Math.max(18, (offsetY / rect.height) * 100));
      textboxes.style.height = percentage + "%";
    });

    window.addEventListener("mouseup", function() {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      var iframe = document.querySelector("iframe");
      if (iframe) iframe.style.pointerEvents = "";
    });
  }

  window.addEventListener("resize", function() {
    if (window.innerWidth > 960) {
      var textboxesEl = document.getElementById("textboxes");
      if (textboxesEl) textboxesEl.style.display = "";
    }
  });
}


/* Run each time a key is pressed on a text box */
var updateSeq = 0;
async function update() {
  var currentSeq = ++updateSeq;
  var data = {
    "css" : document.getElementById("css").value,
    "js" : document.getElementById("javascript").value,
    "html" : document.getElementById("html").value
  };

  var html = getHTML(data);

  // Update the download link immediately
  document.getElementById("downloadLink").href = `data:text/html,${encodeURIComponent(html)}`;

  // Update line numbers immediately
  updateLineNumbers();

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

  // Update the URL for the "Open Page" / "Share Link" button
  var viewLink = `${getBaseViewerUrl()}#${compressedHash}`;
  document.getElementById("getLinkLink").href = viewLink;

  // Calculate savings compared to legacy v0.2.0 uncompressed link
  var legacyLink = apiVersions["0.2.0"].getViewLink(html);
  var savedPct = Math.max(0, Math.round((1 - viewLink.length / legacyLink.length) * 100));

  var statsEl = document.getElementById("urlStats");
  if (statsEl) {
    statsEl.textContent = viewLink.length.toLocaleString() + " chars (-" + savedPct + "%)";
  }
}
