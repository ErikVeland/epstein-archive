// src/index.ts
import DOMPurifyFactory from "dompurify";
import { JSDOM } from "jsdom";
var window = new JSDOM("<!DOCTYPE html>").window;
var purify = DOMPurifyFactory(window);
var DOMPurify = new Proxy({}, {
  get(_, prop) {
    const value = purify[prop];
    return typeof value === "function" ? value.bind(purify) : value;
  }
});
var src_default = DOMPurify;
var sanitize = ((dirty, config) => purify.sanitize(dirty, config));
var isSupported = DOMPurify.isSupported;
var addHook = ((entryPoint, hookFunction) => purify.addHook(entryPoint, hookFunction));
var removeHook = ((entryPoint) => purify.removeHook(entryPoint));
var removeHooks = ((entryPoint) => purify.removeHooks(entryPoint));
var removeAllHooks = (() => purify.removeAllHooks());
var setConfig = ((config) => purify.setConfig(config));
var clearConfig = (() => purify.clearConfig());
var isValidAttribute = ((tag, attr, value) => purify.isValidAttribute(tag, attr, value));
var version = DOMPurify.version;
var removed = new Proxy([], {
  get(_, prop) {
    return Reflect.get(purify.removed, prop);
  }
});
function clearWindow() {
  window.close();
  window = new JSDOM("<!DOCTYPE html>").window;
  purify = DOMPurifyFactory(window);
}
export {
  addHook,
  clearConfig,
  clearWindow,
  src_default as default,
  isSupported,
  isValidAttribute,
  removeAllHooks,
  removeHook,
  removeHooks,
  removed,
  sanitize,
  setConfig,
  version
};
