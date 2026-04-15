"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  addHook: () => addHook,
  clearConfig: () => clearConfig,
  clearWindow: () => clearWindow,
  default: () => src_default,
  isSupported: () => isSupported,
  isValidAttribute: () => isValidAttribute,
  removeAllHooks: () => removeAllHooks,
  removeHook: () => removeHook,
  removeHooks: () => removeHooks,
  removed: () => removed,
  sanitize: () => sanitize,
  setConfig: () => setConfig,
  version: () => version
});
module.exports = __toCommonJS(src_exports);
var import_dompurify = __toESM(require("dompurify"));
var import_jsdom = require("jsdom");
var window = new import_jsdom.JSDOM("<!DOCTYPE html>").window;
var purify = (0, import_dompurify.default)(window);
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
  window = new import_jsdom.JSDOM("<!DOCTYPE html>").window;
  purify = (0, import_dompurify.default)(window);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addHook,
  clearConfig,
  clearWindow,
  isSupported,
  isValidAttribute,
  removeAllHooks,
  removeHook,
  removeHooks,
  removed,
  sanitize,
  setConfig,
  version
});
