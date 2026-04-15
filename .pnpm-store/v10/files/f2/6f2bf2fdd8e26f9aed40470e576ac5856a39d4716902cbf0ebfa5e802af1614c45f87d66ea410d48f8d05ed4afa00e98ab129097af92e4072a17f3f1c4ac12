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
exports.flipLeftRightConfig = void 0;
var tfjs_core_1 = require("@tensorflow/tfjs-core");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.flipLeftRightConfig = {
    kernelName: tfjs_core_1.FlipLeftRight,
    backendName: 'tensorflow',
    kernelFunc: function (_a) {
        var inputs = _a.inputs, backend = _a.backend;
        var nodeBackend = backend;
        var image = inputs.image;
        var opAttrs = [
            (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('Tidx', 'int32'),
            (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', image.dtype),
        ];
        var axes = tfjs_core_1.util.parseAxisParam([2], image.shape);
        var axisTensor = (0, tfjs_core_1.tensor1d)(axes, 'int32');
        var res = nodeBackend.executeSingleOutput('ReverseV2', opAttrs, [image, axisTensor]);
        axisTensor.dispose();
        return res;
    }
};
