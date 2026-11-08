/**
 * editor/syntax.js
 *
 * Tiny dependency-free syntax highlighters for the editor overlay.
 * Each function takes raw source text and returns escaped HTML with
 * <span class="tk-*"> wrappers. They favour speed and "good enough"
 * colouring while typing over full language accuracy.
 */

var Syntax = (function () {
  // Above this size we skip colouring and just mirror the text
  var MAX_HIGHLIGHT = 150000;

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function span(cls, text) {
    return '<span class="tk-' + cls + '">' + esc(text) + "</span>";
  }

  /* Walk all regex matches, escaping the text in between */
  function run(re, src, fn) {
    var out = "";
    var last = 0;
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if (m.index > last) out += esc(src.slice(last, m.index));
      out += fn(m, re);
      last = re.lastIndex;
    }
    if (last < src.length) out += esc(src.slice(last));
    return out;
  }


  /*** JavaScript ***/

  var JS_KEYWORDS = /^(?:await|async|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)$/;
  var JS_LITERALS = /^(?:true|false|null|undefined|NaN|Infinity)$/;
  var JS_RE = new RegExp(
    [
      "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$))",                     // 1 comment
      "(\"(?:[^\"\\\\\\n]|\\\\.)*\"?|'(?:[^'\\\\\\n]|\\\\.)*'?|`(?:[^`\\\\]|\\\\[\\s\\S])*`?)", // 2 string
      "(\\b0x[\\da-fA-F]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)", // 3 number
      "([A-Za-z_$][\\w$]*)(\\s*\\()?",                                     // 4 identifier, 5 call
      "([{}()[\\];,.:?=<>!+\\-*\\/%&|^~]+)"                                // 6 punctuation
    ].join("|"),
    "g"
  );

  function js(src) {
    if (src.length > MAX_HIGHLIGHT) return esc(src);
    return run(JS_RE, src, function (m) {
      if (m[1]) return span("comment", m[1]);
      if (m[2]) return span("string", m[2]);
      if (m[3]) return span("number", m[3]);
      if (m[4]) {
        var word = m[4];
        var tail = m[5] ? esc(m[5].slice(0, -1)) + span("punct", "(") : "";
        if (JS_KEYWORDS.test(word)) return span("keyword", word) + tail;
        if (JS_LITERALS.test(word)) return span("number", word) + tail;
        if (m[5]) return span("fn", word) + tail;
        return esc(word);
      }
      return span("punct", m[6]);
    });
  }


  /*** CSS ***/

  var CSS_VALUE_RE = /("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(#[\da-fA-F]{3,8}\b)|(--[\w-]+)|([a-zA-Z_-][\w-]*)(?=\()|(-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?)|(!important)|([a-zA-Z_-][\w-]*)/g;

  function cssValue(v) {
    return run(CSS_VALUE_RE, v, function (m) {
      if (m[1]) return span("string", m[1]);
      if (m[2]) return span("number", m[2]);
      if (m[3]) return span("prop", m[3]);
      if (m[4]) return span("fn", m[4]);
      if (m[5]) return span("number", m[5]);
      if (m[6]) return span("keyword", m[6]);
      return esc(m[7]);
    });
  }

  /* Colour one chunk of CSS based on what terminates it */
  function cssChunk(text, term, depth) {
    var lead = text.match(/^\s*/)[0];
    var body = text.slice(lead.length);
    if (!body) return esc(text);

    // At-rules: @media, @import, @keyframes ...
    if (body.charAt(0) === "@") {
      var at = body.match(/^@[\w-]+/)[0];
      return esc(lead) + span("atrule", at) + cssValue(body.slice(at.length));
    }

    var isSelector = term === "{" || (term === null && depth === 0);
    if (isSelector) {
      return esc(lead) + span("selector", body);
    }

    var colon = body.indexOf(":");
    if (colon === -1) return esc(text);
    return (
      esc(lead) +
      span("prop", body.slice(0, colon)) +
      span("punct", ":") +
      cssValue(body.slice(colon + 1))
    );
  }

  var CSS_TERM_RE = /[{};]/g;

  function css(src) {
    if (src.length > MAX_HIGHLIGHT) return esc(src);
    var out = "";
    var buf = "";
    var depth = 0;
    var i = 0;
    var n = src.length;

    function flush(term) {
      if (buf) {
        out += cssChunk(buf, term, depth);
        buf = "";
      }
    }

    function lookAheadTerm(from) {
      CSS_TERM_RE.lastIndex = from;
      var m = CSS_TERM_RE.exec(src);
      return m ? m[0] : null;
    }

    while (i < n) {
      var c = src.charAt(i);

      if (c === "/" && src.charAt(i + 1) === "*") {
        var end = src.indexOf("*/", i + 2);
        end = end === -1 ? n : end + 2;
        flush(lookAheadTerm(i));
        out += span("comment", src.slice(i, end));
        i = end;
        continue;
      }

      if (c === '"' || c === "'") {
        var j = i + 1;
        while (j < n && src.charAt(j) !== c && src.charAt(j) !== "\n") {
          if (src.charAt(j) === "\\") j++;
          j++;
        }
        buf += src.slice(i, j + 1);
        i = j + 1;
        continue;
      }

      if (c === "{" || c === "}" || c === ";") {
        flush(c);
        out += span("punct", c);
        if (c === "{") depth++;
        if (c === "}") depth = Math.max(0, depth - 1);
        i++;
        continue;
      }

      buf += c;
      i++;
    }
    flush(null);
    return out;
  }


  /*** HTML ***/

  var HTML_RE = /(<!--[\s\S]*?(?:-->|$))|(<!doctype[^>]*>?)|(<\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?>|$)|(&[#\w]+;)/gi;
  var ATTR_RE = /([^\s=\/>"']+)(?:(\s*=\s*)("[^"]*"?|'[^']*'?|[^\s>"']+))?/g;

  function attrs(text) {
    return run(ATTR_RE, text, function (m) {
      var out = span("attr", m[1]);
      if (m[2]) out += span("punct", m[2]) + span("string", m[3]);
      return out;
    });
  }

  function html(src) {
    if (src.length > MAX_HIGHLIGHT) return esc(src);
    return run(HTML_RE, src, function (m, re) {
      if (m[1]) return span("comment", m[1]);
      if (m[2]) return span("keyword", m[2]);
      if (m[7]) return span("number", m[7]);

      var open = m[3];
      var name = m[4];
      var out = span("punct", open) + span("tag", name) + attrs(m[5]) + span("punct", m[6]);

      // Colour embedded <style> and <script> blocks with their own highlighter
      var lower = name.toLowerCase();
      if (open === "<" && m[6] === ">" && (lower === "style" || lower === "script")) {
        var endRe = new RegExp("</" + lower + "\\s*>", "ig");
        endRe.lastIndex = re.lastIndex;
        var em = endRe.exec(src);
        var stop = em ? em.index : src.length;
        var inner = src.slice(re.lastIndex, stop);
        out += lower === "style" ? css(inner) : js(inner);
        re.lastIndex = stop;
      }
      return out;
    });
  }

  return { html: html, css: css, js: js, escape: esc };
})();
