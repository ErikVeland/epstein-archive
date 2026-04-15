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
exports.einsumConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.einsumConfig = {
    kernelName: tfjs_1.Einsum,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var inputs = args.inputs, attrs = args.attrs;
        var tensors = inputs;
        var backend = args.backend;
        var equation = attrs.equation;
        var opAttrs = [
            { name: 'N', type: backend.binding.TF_ATTR_INT, value: tensors.length },
            { name: 'equation', type: backend.binding.TF_ATTR_STRING, value: equation },
            (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', tensors)
        ];
        var tensorArray = Array.from(tensors);
        return backend.executeSingleOutput(tfjs_1.Einsum, opAttrs, tensorArray);
    }
};
