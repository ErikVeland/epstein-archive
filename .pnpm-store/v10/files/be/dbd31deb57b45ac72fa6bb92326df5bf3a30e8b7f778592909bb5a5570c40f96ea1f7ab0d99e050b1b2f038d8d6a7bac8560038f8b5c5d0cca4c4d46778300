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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conv2dImpl = exports.conv2DConfig = void 0;
var tfjs_1 = require("@tensorflow/tfjs");
var nodejs_kernel_backend_1 = require("../nodejs_kernel_backend");
exports.conv2DConfig = {
    kernelName: tfjs_1.Conv2D,
    backendName: 'tensorflow',
    kernelFunc: function (args) {
        var _a = args.inputs, x = _a.x, filter = _a.filter;
        var backend = args.backend;
        var _b = args.attrs, strides = _b.strides, pad = _b.pad, dataFormat = _b.dataFormat, dilations = _b.dilations, dimRoundingMode = _b.dimRoundingMode;
        var $dataFormat = tfjs_1.backend_util.convertConv2DDataFormat(dataFormat);
        var convInfo = tfjs_1.backend_util.computeConv2DInfo(x.shape, filter.shape, strides, dilations, pad, dimRoundingMode, false /* depthwise */, $dataFormat);
        return conv2dImpl(x, filter, convInfo, backend);
    }
};
function conv2dImpl(x, filter, convInfo, backend) {
    if (convInfo.padInfo.type !== 'VALID' && convInfo.padInfo.type !== 'SAME' &&
        convInfo.padInfo.type !== 'EXPLICIT') {
        throw new Error("TF Backend supports only 'valid' and 'same' padding " +
            "while padding was ".concat(convInfo.padInfo.type));
    }
    var strides = [1, convInfo.strideHeight, convInfo.strideWidth, 1];
    var padding = convInfo.padInfo.type;
    var dataFormat = convInfo.dataFormat === 'channelsLast' ? 'NHWC' : 'NCHW';
    var dilations = [1, convInfo.dilationHeight, convInfo.dilationWidth, 1];
    var opAttrs = [
        (0, nodejs_kernel_backend_1.createTensorsTypeOpAttr)('T', x.dtype),
        { name: 'strides', type: backend.binding.TF_ATTR_INT, value: strides },
        { name: 'padding', type: backend.binding.TF_ATTR_STRING, value: padding },
        {
            name: 'data_format',
            type: backend.binding.TF_ATTR_STRING,
            value: dataFormat
        },
        { name: 'use_cudnn_on_gpu', type: backend.binding.TF_ATTR_BOOL, value: true },
        { name: 'dilations', type: backend.binding.TF_ATTR_INT, value: dilations },
    ];
    if (padding === 'EXPLICIT') {
        var padValue = [
            convInfo.padInfo.top, convInfo.padInfo.bottom, convInfo.padInfo.left,
            convInfo.padInfo.right
        ];
        opAttrs.push({
            name: 'explicit_paddings',
            type: backend.binding.TF_ATTR_INT,
            value: dataFormat === 'NHWC' ? __spreadArray(__spreadArray([0, 0], padValue, true), [0, 0], false) : __spreadArray([0, 0, 0, 0], padValue, true)
        });
    }
    return backend.executeSingleOutput(tfjs_1.Conv2D, opAttrs, [x, filter]);
}
exports.conv2dImpl = conv2dImpl;
