import { useMemo as h, useCallback as p } from "react";
function g({
  isRowLoaded: d,
  minimumBatchSize: o,
  rowCount: a,
  startIndex: x,
  stopIndex: i
}) {
  const n = [];
  let r = -1, t = -1;
  for (let e = x; e <= i; e++)
    d(e) ? t >= 0 && (n.push({
      startIndex: r,
      stopIndex: t
    }), r = t = -1) : (t = e, r < 0 && (r = e));
  if (t >= 0) {
    const e = Math.min(
      Math.max(t, r + o - 1),
      a - 1
    );
    for (let s = t + 1; s <= e && !d(s); s++)
      t = s;
    n.push({
      startIndex: r,
      stopIndex: t
    });
  }
  if (n.length) {
    const e = n[0];
    for (; e.stopIndex - e.startIndex + 1 < o && e.startIndex > 0; ) {
      const s = e.startIndex - 1;
      if (!d(s))
        e.startIndex = s;
      else
        break;
    }
  }
  return n;
}
function S({
  isRowLoaded: d,
  loadMoreRows: o,
  minimumBatchSize: a = 10,
  rowCount: x,
  threshold: i = 15
}) {
  const n = h(() => /* @__PURE__ */ new Set(), [d, o]), r = p(
    (e) => d(e) ? !0 : n.has(e),
    [d, n]
  );
  return p(
    ({ startIndex: e, stopIndex: s }) => {
      const f = g({
        isRowLoaded: r,
        minimumBatchSize: a,
        rowCount: x,
        startIndex: Math.max(0, e - i),
        stopIndex: Math.min(x - 1, s + i)
      });
      for (let I = 0; I < f.length; I += 2) {
        const { startIndex: u, stopIndex: l } = f[I];
        for (let c = u; c <= l; c++)
          n.add(c);
        o(u, l);
      }
    },
    [
      r,
      o,
      a,
      n,
      x,
      i
    ]
  );
}
function k({
  children: d,
  ...o
}) {
  const a = S(o);
  return d({ onRowsRendered: a });
}
export {
  k as InfiniteLoader,
  S as useInfiniteLoader
};
//# sourceMappingURL=react-window-infinite-loader.js.map
