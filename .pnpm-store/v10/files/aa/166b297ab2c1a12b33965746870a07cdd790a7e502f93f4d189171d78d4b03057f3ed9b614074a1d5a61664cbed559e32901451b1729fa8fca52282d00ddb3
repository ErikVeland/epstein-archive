"use strict";
/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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
exports.uniqueConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.uniqueConfig = {
    kernelName: tfjs_1.Unique,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var x = args.inputs.x;
        var backend = args.backend;
        var _a = args.attrs.axis, axis = _a === void 0 ? 0 : _a;
        var axisTensor = (0, tfjs_1.tensor1d)([axis], 'int32');
        try {
            var opAttrs = [
                (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', x.dtype),
                (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('Taxis', 'int32'),
                (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('out_idx', 'int32')
            ];
            var inputs = [x, axisTensor];
            return backend.executeMultipleOutputs('UniqueV2', opAttrs, inputs, 2);
        }
        finally {
            axisTensor.dispose();
        }
    }
};
