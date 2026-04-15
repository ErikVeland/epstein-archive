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

// src/browser.ts
var browser_exports = {};
__export(browser_exports, {
  addHook: () => addHook,
  clearConfig: () => clearConfig,
  clearWindow: () => clearWindow,
  default: () => browser_default,
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
module.exports = __toCommonJS(browser_exports);
var import_dompurify = __toESM(require("dompurify"));
var browser_default = import_dompurify.default;
var sanitize = import_dompurify.default.sanitize.bind(import_dompurify.default);
var isSupported = import_dompurify.default.isSupported;
var addHook = import_dompurify.default.addHook.bind(import_dompurify.default);
var removeHook = import_dompurify.default.removeHook.bind(import_dompurify.default);
var removeHooks = import_dompurify.default.removeHooks.bind(import_dompurify.default);
var removeAllHooks = import_dompurify.default.removeAllHooks.bind(import_dompurify.default);
var setConfig = import_dompurify.default.setConfig.bind(import_dompurify.default);
var clearConfig = import_dompurify.default.clearConfig.bind(import_dompurify.default);
var isValidAttribute = import_dompurify.default.isValidAttribute.bind(import_dompurify.default);
var version = import_dompurify.default.version;
var removed = import_dompurify.default.removed;
function clearWindow() {
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
