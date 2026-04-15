import { useRef as C, useLayoutEffect as x, useState as w, useMemo as k, memo as O, createElement as A } from "react";
let m;
typeof window < "u" ? m = window : typeof self < "u" ? m = self : m = global;
let R = null, E = null;
const N = 20, y = m.clearTimeout, S = m.setTimeout, F = m.cancelAnimationFrame || m.mozCancelAnimationFrame || m.webkitCancelAnimationFrame, W = m.requestAnimationFrame || m.mozRequestAnimationFrame || m.webkitRequestAnimationFrame;
F == null || W == null ? (R = y, E = function(l) {
  return S(l, N);
}) : (R = function([l, _]) {
  F(l), y(_);
}, E = function(l) {
  const _ = W(
    function() {
      y(f), l();
    }
  ), f = S(function() {
    F(_), l();
  }, N);
  return [_, f];
});
function D(z) {
  let l, _, f, u, T, r, a;
  const c = typeof document < "u" && document.attachEvent;
  if (!c) {
    r = function(t) {
      const i = t.__resizeTriggers__, h = i.firstElementChild, b = i.lastElementChild, L = h.firstElementChild;
      b.scrollLeft = b.scrollWidth, b.scrollTop = b.scrollHeight, L.style.width = h.offsetWidth + 1 + "px", L.style.height = h.offsetHeight + 1 + "px", h.scrollLeft = h.scrollWidth, h.scrollTop = h.scrollHeight;
    }, T = function(t) {
      return t.offsetWidth !== t.__resizeLast__.width || t.offsetHeight !== t.__resizeLast__.height;
    }, a = function(t) {
      if (t.target.className && typeof t.target.className.indexOf == "function" && t.target.className.indexOf("contract-trigger") < 0 && t.target.className.indexOf("expand-trigger") < 0)
        return;
      const i = this;
      r(this), this.__resizeRAF__ && R(this.__resizeRAF__), this.__resizeRAF__ = E(function() {
        T(i) && (i.__resizeLast__.width = i.offsetWidth, i.__resizeLast__.height = i.offsetHeight, i.__resizeListeners__.forEach(
          function(L) {
            L.call(i, t);
          }
        ));
      });
    };
    let e = !1, s = "";
    f = "animationstart";
    const d = "Webkit Moz O ms".split(" ");
    let o = "webkitAnimationStart animationstart oAnimationStart MSAnimationStart".split(
      " "
    ), p = "";
    {
      const t = document.createElement("fakeelement");
      if (t.style.animationName !== void 0 && (e = !0), e === !1) {
        for (let i = 0; i < d.length; i++)
          if (t.style[d[i] + "AnimationName"] !== void 0) {
            p = d[i], s = "-" + p.toLowerCase() + "-", f = o[i], e = !0;
            break;
          }
      }
    }
    _ = "resizeanim", l = "@" + s + "keyframes " + _ + " { from { opacity: 0; } to { opacity: 0; } } ", u = s + "animation: 1ms " + _ + "; ";
  }
  const n = function(e) {
    if (!e.getElementById("detectElementResize")) {
      const s = (l || "") + ".resize-triggers { " + (u || "") + 'visibility: hidden; opacity: 0; } .resize-triggers, .resize-triggers > div, .contract-trigger:before { content: " "; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; z-index: -1; } .resize-triggers > div { background: #eee; overflow: auto; } .contract-trigger:before { width: 200%; height: 200%; }', d = e.head || e.getElementsByTagName("head")[0], o = e.createElement("style");
      o.id = "detectElementResize", o.type = "text/css", z != null && o.setAttribute("nonce", z), o.styleSheet ? o.styleSheet.cssText = s : o.appendChild(e.createTextNode(s)), d.appendChild(o);
    }
  };
  return {
    addResizeListener: function(e, s) {
      if (c)
        e.attachEvent("onresize", s);
      else {
        if (!e.__resizeTriggers__) {
          const d = e.ownerDocument, o = m.getComputedStyle(e);
          o && o.position === "static" && (e.style.position = "relative"), n(d), e.__resizeLast__ = {}, e.__resizeListeners__ = [], (e.__resizeTriggers__ = d.createElement("div")).className = "resize-triggers";
          const p = d.createElement("div");
          p.className = "expand-trigger", p.appendChild(d.createElement("div"));
          const t = d.createElement("div");
          t.className = "contract-trigger", e.__resizeTriggers__.appendChild(p), e.__resizeTriggers__.appendChild(t), e.appendChild(e.__resizeTriggers__), r(e), e.addEventListener("scroll", a, !0), f && (e.__resizeTriggers__.__animationListener__ = function(h) {
            h.animationName === _ && r(e);
          }, e.__resizeTriggers__.addEventListener(
            f,
            e.__resizeTriggers__.__animationListener__
          ));
        }
        e.__resizeListeners__.push(s);
      }
    },
    removeResizeListener: function(e, s) {
      if (c)
        e.detachEvent("onresize", s);
      else if (e.__resizeListeners__.splice(
        e.__resizeListeners__.indexOf(s),
        1
      ), !e.__resizeListeners__.length) {
        e.removeEventListener("scroll", a, !0), e.__resizeTriggers__.__animationListener__ && (e.__resizeTriggers__.removeEventListener(
          f,
          e.__resizeTriggers__.__animationListener__
        ), e.__resizeTriggers__.__animationListener__ = null);
        try {
          e.__resizeTriggers__ = !e.removeChild(
            e.__resizeTriggers__
          );
        } catch {
        }
      }
    }
  };
}
function B({
  box: z,
  nonce: l,
  onResize: _,
  rootElement: f
}) {
  const u = C({
    onResize: _,
    parentNode: null,
    prevSize: {
      height: void 0,
      width: void 0
    }
  });
  x(() => {
    u.current.onResize = _;
  });
  const T = C(() => {
    const { onResize: r, parentNode: a, prevSize: c } = u.current;
    if (a === null)
      return;
    let n, g;
    switch (z) {
      case "border-box": {
        const v = a.getBoundingClientRect();
        n = v.height, g = v.width;
        break;
      }
      case "content-box": {
        const v = a.getBoundingClientRect(), e = window.getComputedStyle(a) || {}, s = parseFloat(e.borderBottomWidth || "0"), d = parseFloat(e.borderLeftWidth || "0"), o = parseFloat(e.borderRightWidth || "0"), p = parseFloat(e.borderTopWidth || "0"), t = parseFloat(e.paddingLeft || "0"), i = parseFloat(e.paddingRight || "0"), h = parseFloat(e.paddingTop || "0"), b = parseFloat(e.paddingBottom || "0");
        n = v.height - h - b - p - s, g = v.width - t - i - d - o;
        break;
      }
      case "device-pixel-content-box": {
        n = a.offsetHeight, g = a.offsetWidth;
        break;
      }
    }
    (c.height !== n || c.width !== g) && (u.current.prevSize = { height: n, width: g }, r({
      height: n,
      width: g
    }));
  });
  x(() => {
    if (f === null)
      return;
    const r = f.parentNode;
    if (r === null || r.ownerDocument === null || r.ownerDocument.defaultView === null || !(r instanceof r.ownerDocument.defaultView.HTMLElement))
      return;
    u.current.parentNode = r;
    const a = T.current, c = r.ownerDocument.defaultView.ResizeObserver;
    if (c != null) {
      let n;
      const g = new c(() => {
        n = setTimeout(a, 0);
      });
      return g.observe(r), () => {
        n && clearTimeout(n), g.disconnect();
      };
    } else {
      const n = D(l);
      return n.addResizeListener(r, a), () => {
        n.removeResizeListener(r, a);
      };
    }
  }, [l, f]);
}
function q({
  box: z = "content-box",
  className: l,
  "data-testid": _,
  id: f,
  nonce: u,
  onResize: T,
  style: r,
  tagName: a = "div",
  ...c
}) {
  let n, g;
  "Child" in c ? n = c.Child : "ChildComponent" in c ? n = c.ChildComponent : "renderProp" in c && (g = c.renderProp);
  const [v, e] = w(null), [s, d] = w(), [o, p] = w();
  B({
    box: z,
    nonce: u,
    onResize: (i) => {
      d(i.height), p(i.width), typeof T < "u" && T(i);
    },
    rootElement: v
  });
  const t = k(
    () => n ? O(n) : void 0,
    [n]
  );
  return A(
    a,
    {
      className: l,
      "data-auto-sizer": "",
      "data-testid": _,
      id: f,
      ref: e,
      style: r
    },
    t ? A(t, { height: s, width: o }) : void 0,
    g ? g({ height: s, width: o }) : void 0
  );
}
export {
  q as AutoSizer
};
//# sourceMappingURL=react-virtualized-auto-sizer.js.map
