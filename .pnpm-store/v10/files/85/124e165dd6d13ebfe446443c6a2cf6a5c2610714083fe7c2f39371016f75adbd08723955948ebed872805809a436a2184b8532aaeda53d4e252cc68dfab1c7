"use strict";
/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticRegexReplaceConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
exports.staticRegexReplaceConfig = {
    kernelName: tfjs_1.StaticRegexReplace,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var tensors = args.inputs;
        var backend = args.backend;
        var _a = args.attrs, pattern = _a.pattern, rewrite = _a.rewrite, replaceGlobal = _a.replaceGlobal;
        var opAttrs = [
            { name: 'pattern', type: backend.binding.TF_ATTR_STRING, value: pattern },
            { name: 'rewrite', type: backend.binding.TF_ATTR_STRING, value: rewrite },
            {
                name: 'replace_global',
                type: backend.binding.TF_ATTR_BOOL,
                value: replaceGlobal,
            },
        ];
        var inputs = [tensors.x];
        return backend.executeSingleOutput('StaticRegexReplace', opAttrs, inputs);
    }
};
