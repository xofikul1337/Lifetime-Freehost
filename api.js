/**
 * api.js
 *
 * API For encoding and decoding URL hash objects
 *
 * Created by Jacob Strieb
 * July 2020
 */


/*******************************************************************************
 * Global Variables
 ******************************************************************************/

const LATEST_API_VERSION = "0.3.0";

var apiVersions = {};

function getBaseViewerUrl() {
  try {
    return new URL("../index.html", window.location.href).href.split("#")[0];
  } catch (e) {
    return "../index.html";
  }
}

/* Convert Uint8Array to URL-safe Base64 without '=' padding */
function bytesToBase64Url(bytes) {
  var binary = "";
  for (var i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* Convert URL-safe Base64 back to Uint8Array */
function base64UrlToBytes(b64url) {
  var b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/* Build full HTML document from raw html, css, js parts */
function buildFullHTML(html, css, js) {
  return (
    "<!DOCTYPE html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>" +
    (css || "") +
    "</style><script type=\"text/javascript\">" +
    (js || "") +
    "</scr" +
    "ipt></head><body>" +
    (html || "") +
    "</body>"
  );
}

/* Compress string using native Deflate-Raw stream and return 'z.<base64url>' */
async function compressToHash(rawString) {
  if (typeof CompressionStream === "undefined") {
    return b64.encode(rawString);
  }
  var encoded = new TextEncoder().encode(rawString);
  var cs = new CompressionStream("deflate-raw");
  var writer = cs.writable.getWriter();
  writer.write(encoded);
  writer.close();
  var compressedBuffer = await new Response(cs.readable).arrayBuffer();
  var compressedBytes = new Uint8Array(compressedBuffer);
  return "z." + bytesToBase64Url(compressedBytes);
}

/* Decompress 'z.<base64url>' back into original UTF-8 string */
async function decompressFromHash(hash) {
  var payload = hash.slice(2);
  var compressedBytes = base64UrlToBytes(payload);
  var ds = new DecompressionStream("deflate-raw");
  var writer = ds.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();
  var decompressedBuffer = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(decompressedBuffer);
}

/* Pack {html, css, js} into minimal string without HTML boilerplate overhead */
function packParts(data) {
  var h = (data.html || "").trim();
  var c = (data.css || "").trim();
  var j = (data.js || "").trim();
  if (!c && !j) {
    return h;
  }
  if (!j) {
    return h + "\0" + c;
  }
  return h + "\0" + c + "\0" + j;
}

/* Unpack minimal string back into full HTML document */
function unpackToHTML(packed) {
  if (packed.indexOf("\0") === -1) {
    // Check if it's already a full HTML document or a body snippet
    if (/<!doctype\s+html|<html[\s>]/i.test(packed)) {
      return packed;
    }
    return buildFullHTML(packed, "", "");
  }
  var parts = packed.split("\0");
  return buildFullHTML(parts[0] || "", parts[1] || "", parts[2] || "");
}

/* Unpack minimal string back into {html, css, js} object for the editor */
function unpackToParts(packed) {
  var parts = packed.split("\0");
  return {
    html: parts[0] || "",
    css: parts[1] || "",
    js: parts[2] || "",
  };
}

/* Save and resolve ultra-short 5-char local alias links (#s/xxxxx) */
const SHORT_STORE_KEY = "lifetime_freehost_shortlinks_v1";

function createShortAlias(packedData) {
  var store = {};
  try {
    store = JSON.parse(localStorage.getItem(SHORT_STORE_KEY) || "{}");
  } catch (e) {
    store = {};
  }

  // Generate deterministic 5-char hash from content so identical code gets same short ID
  var h = 2166136261;
  for (var i = 0; i < packedData.length; i++) {
    h ^= packedData.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  var alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  var unsigned = h >>> 0;
  var code = "";
  for (var k = 0; k < 5; k++) {
    code += alphabet[unsigned % alphabet.length];
    unsigned = Math.floor(unsigned / alphabet.length) || ((h >>> (k * 5)) & 31);
  }

  store[code] = packedData;
  try {
    localStorage.setItem(SHORT_STORE_KEY, JSON.stringify(store));
  } catch (e) {}

  return `${getBaseViewerUrl()}#${code}`;
}

function resolveShortAlias(code) {
  try {
    var store = JSON.parse(localStorage.getItem(SHORT_STORE_KEY) || "{}");
    return store[code] || null;
  } catch (e) {
    return null;
  }
}



/*******************************************************************************
 * API Version 0.3.0 (Ultra-Compact Deflate + Zero-Boilerplate)
 ******************************************************************************/

apiVersions["0.3.0"] = {

  VERSION: "0.3.0",

  /* Return a compressed view link from {html, css, js} or raw HTML */
  getCompressedViewLink: async function(dataOrHtml) {
    var packed = typeof dataOrHtml === "string" ? dataOrHtml : packParts(dataOrHtml);
    var compressedHash = await compressToHash(packed);
    return `${getBaseViewerUrl()}#${compressedHash}`;
  },

  /* Synchronous fallback link */
  getViewLink: function(pageData) {
    return `${getBaseViewerUrl()}#${b64.encode(pageData)}`;
  },

  decode: function(urlData) {
    return urlData.body;
  },

};



/*******************************************************************************
 * API Version 0.2.0
 ******************************************************************************/

apiVersions["0.2.0"] = {

  VERSION: "0.2.0",

  /* Return a link to view the page */
  getViewLink: function(pageData) {
    var urlData = {
      version: this.VERSION,
      compressed: false,
      body: pageData,
    };

    const hashObject = b64.encode(JSON.stringify(urlData));
    return `${getBaseViewerUrl()}#${hashObject}`;
  },

  /* Return the page data from the object */
  decode: function(urlData) {
    return urlData.body;
  },

}



/*******************************************************************************
 * API Version 0.0.1 (Original)
 ******************************************************************************/

apiVersions["0.0.1"] = {

  VERSION: "0.0.1",

  /* Return a link to view the page */
  getViewLink: function(pageData) {
    return `${getBaseViewerUrl()}#${b64.encode(pageData)}`;
  },

}
