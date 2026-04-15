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
exports.broadcastArgsConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.broadcastArgsConfig = {
    kernelName: tfjs_1.BroadcastArgs,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var _a = args.inputs, s0 = _a.s0, s1 = _a.s1;
        var backend = args.backend;
        var opAttrs = [(0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', tfjs_1.backend_util.upcastType(s0.dtype, s1.dtype))];
        return backend.executeSingleOutput(tfjs_1.BroadcastArgs, opAttrs, [s0, s1]);
    }
};
