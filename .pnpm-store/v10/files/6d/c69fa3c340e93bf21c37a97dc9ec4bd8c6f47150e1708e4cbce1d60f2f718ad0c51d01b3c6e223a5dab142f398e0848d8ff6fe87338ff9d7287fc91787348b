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
exports.gatherV2Config = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.gatherV2Config = {
    kernelName: tfjs_1.GatherV2,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var _a = args.inputs, x = _a.x, indices = _a.indices;
        var backend = args.backend;
        var _b = args.attrs, axis = _b.axis, batchDims = _b.batchDims;
        // Throw error when any index is out of bound.
        var indicesVals = backend.readSync(indices.dataId);
        var axisDim = x.shape[axis];
        var _loop_1 = function (i) {
            var index = indicesVals[i];
            tfjs_1.util.assert(index <= axisDim - 1 && index >= 0, function () { return "GatherV2: the index value ".concat(index, " is not in [0, ").concat(axisDim - 1, "]"); });
        };
        for (var i = 0; i < indicesVals.length; ++i) {
            _loop_1(i);
        }
        // validate the inputs
        tfjs_1.backend_util.segment_util.collectGatherOpShapeInfo(x, indices, axis, batchDims);
        var axisTensor = (0, tfjs_1.scalar)(axis, 'int32');
        var opAttrs = [
            { name: 'batch_dims', type: backend.binding.TF_ATTR_INT, value: batchDims },
            (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('Tparams', x.dtype),
            (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('Tindices', indices.dtype),
            (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('Taxis', 'int32')
        ];
        var res = backend.executeSingleOutput(tfjs_1.GatherV2, opAttrs, [x, indices, axisTensor]);
        axisTensor.dispose();
        return res;
    }
};
