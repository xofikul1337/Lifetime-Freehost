# ⚡ Lifetime FreeHost

🌐 **Live Demo:** [https://host.xofikul.is-a.dev](https://host.xofikul.is-a.dev)

**Lifetime FreeHost** is a modern, serverless web playground and URL-based webpage hosting studio. Write **HTML5**, **CSS3**, and **JavaScript** in a sleek light-mode IDE, preview changes in real time across desktop/tablet/mobile viewports, and share your entire webpage inside a compressed URL—with zero backend servers or databases required.

---

## ✨ Key Features

- **🎨 Studio UI with Light & Dark Themes**: One clean workspace with `HTML`, `CSS`, and `JS` editors, built-in syntax highlighting, synchronized line numbers, live line counters, `Tab` indentation, and one-click **Clear** buttons. Your theme choice is remembered.
- **🔗 Live Link Bar**: The preview's address bar shows the page's real shareable link as you type, with its length. Click it to copy.
- **🗜️ Built-in Deflate-Raw URL Compression (`v0.3.0`)**: Uses native browser `CompressionStream("deflate-raw")` + Zero-Boilerplate packing to shrink shareable URLs by **65%–85%** without any third-party URL shortener.
- **⚡ 5-Character Instant Short URLs (`#abcde`)**: Generate ultra-short 5-character local alias links for quick testing and instant previewing.
- **📱 Responsive Live Preview & Viewport Switcher**: Built-in browser frame preview with Desktop (`100%`), Tablet (`768px`), Mobile (`390px`), and **Fullscreen** modes (`Esc` to exit). On phones, a segmented tab bar (`HTML` | `CSS` | `JS` | `Preview`) on top and a thumb-friendly action bar at the bottom.
- **📦 Export & Share Anywhere**: One-click **Share Link**, **Short URL**, **Copy HTML**, and **Download (`export.html`)**.

---

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/xofikul1337/Lifetime-Freehost.git
   cd Lifetime-Freehost
   ```
2. Open `editor/index.html` directly in your browser, or serve the folder with any static server:
   ```bash
   npx serve .
   ```

---

## 🛠️ Project Structure

```text
Lifetime-Freehost/
├── index.html          # Instant full-screen URL page renderer
├── api.js              # Deflate-Raw compression, Short URL & legacy URL codec
├── b64.js              # UTF-8 safe Base64 encoder/decoder
├── editor/
│   ├── index.html      # Lifetime FreeHost Studio UI
│   ├── main.css        # Responsive light/dark theme styles
│   ├── syntax.js       # Tiny HTML/CSS/JS syntax highlighter
│   └── editor.js       # Live preview, compression & IDE logic
└── examples/           # Example URL-encoded pages
```

---

## 👨‍💻 Author

Developed by **[Shofikul Islam](https://xofikul.is-a.dev/)**
