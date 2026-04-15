"use strict";
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
exports.stepConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.stepConfig = {
    kernelName: tfjs_1.Step,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var x = args.inputs.x;
        var backend = args.backend;
        var alpha = args.attrs.alpha;
        var dtype = x.dtype;
        return (0, tfjs_1.tidy)(function () {
            var nans = (0, tfjs_1.isNaN)(x);
            var stepNoNans = (0, tfjs_1.where)((0, tfjs_1.greater)(x, (0, tfjs_1.scalar)(0, dtype)), (0, tfjs_1.ones)(x.shape), (0, tfjs_1.fill)(x.shape, alpha, dtype));
            var opAttrs = [(0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', tfjs_1.backend_util.upcastType(x.dtype, stepNoNans.dtype))];
            return backend.executeSingleOutput('Select', opAttrs, [nans, x, stepNoNans]);
        });
    }
};
