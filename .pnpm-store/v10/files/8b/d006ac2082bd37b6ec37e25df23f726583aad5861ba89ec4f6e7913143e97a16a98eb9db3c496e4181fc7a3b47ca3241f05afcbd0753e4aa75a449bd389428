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
exports.stridedSliceConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.stridedSliceConfig = {
    kernelName: tfjs_1.StridedSlice,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var x = args.inputs.x;
        var backend = args.backend;
        var _a = args.attrs, beginMask = _a.beginMask, endMask = _a.endMask, ellipsisMask = _a.ellipsisMask, newAxisMask = _a.newAxisMask, shrinkAxisMask = _a.shrinkAxisMask;
        var attrs = args.attrs;
        // make a copy because it may be modified in-place further down.
        var begin = attrs.begin.slice();
        var end = attrs.end.slice();
        var strides = attrs.strides;
        return (0, tfjs_1.tidy)(function () {
            var beginTensor = (0, tfjs_1.tensor1d)(begin, 'int32');
            var endTensor = (0, tfjs_1.tensor1d)(end, 'int32');
            var stridesTensor = (0, tfjs_1.tensor1d)(strides, 'int32');
            var opAttrs = [
                (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', x.dtype),
                (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('Index', 'int32'), {
                    name: 'begin_mask',
                    type: backend.binding.TF_ATTR_INT,
                    value: beginMask
                },
                { name: 'end_mask', type: backend.binding.TF_ATTR_INT, value: endMask }, {
                    name: 'ellipsis_mask',
                    type: backend.binding.TF_ATTR_INT,
                    value: ellipsisMask
                },
                {
                    name: 'new_axis_mask',
                    type: backend.binding.TF_ATTR_INT,
                    value: newAxisMask
                },
                {
                    name: 'shrink_axis_mask',
                    type: backend.binding.TF_ATTR_INT,
                    value: shrinkAxisMask
                }
            ];
            return backend.executeSingleOutput(tfjs_1.StridedSlice, opAttrs, [x, beginTensor, endTensor, stridesTensor]);
        });
    }
};
