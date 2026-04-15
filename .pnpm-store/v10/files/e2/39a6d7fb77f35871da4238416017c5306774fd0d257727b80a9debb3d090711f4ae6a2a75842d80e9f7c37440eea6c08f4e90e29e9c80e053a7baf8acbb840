"use strict";
/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTensorflowBackend = exports.createOpAttr = exports.createTensorsTypeOpAttr = exports.getTFDType = exports.nodeBackend = exports.NodeJSKernelBackend = void 0;
var tf = require("@tensorflow/tfjs");
var tfjs_1 = require("@tensorflow/tfjs");
var util_1 = require("util");
var int64_tensors_1 = require("./int64_tensors");
// tslint:disable-next-line:no-require-imports
var messages = require('./proto/api_pb');
var NodeJSKernelBackend = /** @class */ (function (_super) {
    __extends(NodeJSKernelBackend, _super);
    function NodeJSKernelBackend(binding, packageName) {
        var _this = _super.call(this) || this;
        _this.binding = binding;
        _this.isGPUPackage = packageName === '@tensorflow/tfjs-node-gpu';
        _this.isUsingGpuDevice = _this.binding.isUsingGpuDevice();
        _this.tensorMap = new tf.DataStorage(_this, tf.engine());
        return _this;
    }
    NodeJSKernelBackend.prototype.getDTypeInteger = function (dtype) {
        switch (dtype) {
            case 'float32':
                return this.binding.TF_FLOAT;
            case 'int32':
                return this.binding.TF_INT32;
            case 'bool':
                return this.binding.TF_BOOL;
            case 'complex64':
                return this.binding.TF_COMPLEX64;
            case 'string':
                return this.binding.TF_STRING;
            default:
                throw new Error("Unsupported DType: ".concat(dtype));
        }
    };
    NodeJSKernelBackend.prototype.typeAttributeFromTensor = function (value) {
        return this.getDTypeInteger(value.dtype);
    };
    // Creates a new Tensor and maps the dataId to the passed in ID.
    NodeJSKernelBackend.prototype.createOutputTensor = function (metadata) {
        var newId = {};
        this.tensorMap.set(newId, {
            shape: metadata.shape,
            dtype: metadata.dtype,
            id: metadata.id,
            values: null,
            refCount: 1
        });
        var dtype;
        switch (metadata.dtype) {
            case this.binding.TF_FLOAT:
                dtype = 'float32';
                break;
            case this.binding.TF_INT32:
                dtype = 'int32';
                break;
            case this.binding.TF_INT64:
                console.warn('INT64 output tensor will be stored as BigInt64Array.');
                // INT64 is not supported in TFJS yet, cast it to int32.
                dtype = 'int32';
                break;
            case this.binding.TF_BOOL:
                dtype = 'bool';
                break;
            case this.binding.TF_COMPLEX64:
                dtype = 'complex64';
                break;
            case this.binding.TF_STRING:
                dtype = 'string';
                break;
            case this.binding.TF_RESOURCE:
                // NOTE(cais): We currently represent resource-type Tensors
                // as string of ubytes.
                dtype = 'string';
                break;
            case this.binding.TF_UINT8:
                // TensorFlow uses UINT8 as dtype for image tensor. UINT8 is not
                // supported in TFJS yet, cast it to int32.
                dtype = 'int32';
                break;
            default:
                throw new Error("Unknown dtype enum ".concat(metadata.dtype));
        }
        // TODO(yassogba) Enable this once all the kernels are removed from backend.
        // We can then change the return type from Tensor to TensorInfo.
        // return {dataId: newId, shape: metadata.shape, dtype};
        var tensorInfo = { dataId: newId, shape: metadata.shape, dtype: dtype };
        return tf.engine().makeTensorFromTensorInfo(tensorInfo);
    };
    // Prepares Tensor instances for Op execution.
    NodeJSKernelBackend.prototype.getInputTensorIds = function (tensors) {
        var ids = [];
        for (var i = 0; i < tensors.length; i++) {
            if (tensors[i] instanceof int64_tensors_1.Int64Scalar) {
                // Then `tensors[i]` is a Int64Scalar, which we currently represent
                // using an `Int32Array`.
                var value = tensors[i].valueArray;
                var id = this.binding.createTensor([], this.binding.TF_INT64, value);
                ids.push(id);
            }
            else {
                var info = this.tensorMap.get(tensors[i].dataId);
                // TODO - what about ID in this case? Handle in write()??
                if (info.values != null) {
                    // Values were delayed to write into the TensorHandle. Do that before
                    // Op execution and clear stored values.
                    info.id =
                        this.binding.createTensor(info.shape, info.dtype, info.values);
                    info.values = null;
                }
                ids.push(info.id);
            }
        }
        return ids;
    };
    NodeJSKernelBackend.prototype.createReductionOpAttrs = function (tensor, keepDims) {
        if (keepDims === void 0) { keepDims = false; }
        return [
            { name: 'keep_dims', type: this.binding.TF_ATTR_BOOL, value: keepDims },
            createTensorsTypeOpAttr('T', tensor.dtype),
            createTensorsTypeOpAttr('Tidx', 'int32')
        ];
    };
    NodeJSKernelBackend.prototype.floatPrecision = function () {
        return 32;
    };
    NodeJSKernelBackend.prototype.epsilon = function () {
        return _super.prototype.epsilon.call(this);
    };
    /**
     * Executes an op that has a single input and output.
     *
     * Helper function to wrap executeSingleOutput in a particular case.
     * @param name The name of the Op to execute.
     * @param input The input Tensor for the Op.
     */
    NodeJSKernelBackend.prototype.executeSingleInput = function (name, input) {
        var opAttrs = [createTensorsTypeOpAttr('T', input.dtype)];
        return this.executeSingleOutput(name, opAttrs, [input]);
    };
    /**
     * Executes a TensorFlow Eager Op that provides one output Tensor.
     * @param name The name of the Op to execute.
     * @param opAttrs The list of Op attributes required to execute.
     * @param inputs The list of input Tensors for the Op.
     * @return A resulting Tensor from Op execution.
     */
    NodeJSKernelBackend.prototype.executeSingleOutput = function (name, opAttrs, inputs) {
        var outputMetadata = this.binding.executeOp(name, opAttrs, this.getInputTensorIds(inputs), 1);
        return this.createOutputTensor(outputMetadata[0]);
    };
    /**
     * Executes a TensorFlow Eager Op that provides multiple output Tensors.
     * @param name The name of the Op to execute.
     * @param opAttrs The list of Op attributes required to execute.
     * @param inputs The list of input Tensors for the Op.
     * @param numOutputs The number of output Tensors for Op execution.
     * @return A resulting Tensor array from Op execution.
     */
    NodeJSKernelBackend.prototype.executeMultipleOutputs = function (name, opAttrs, inputs, numOutputs) {
        var _this = this;
        var outputMetadata = this.binding.executeOp(name, opAttrs, this.getInputTensorIds(inputs), numOutputs);
        return outputMetadata.map(function (m) { return _this.createOutputTensor(m); });
    };
    NodeJSKernelBackend.prototype.numDataIds = function () {
        return this.tensorMap.numDataIds();
    };
    NodeJSKernelBackend.prototype.dispose = function () { };
    NodeJSKernelBackend.prototype.read = function (dataId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.readSync(dataId)];
            });
        });
    };
    NodeJSKernelBackend.prototype.readSync = function (dataId) {
        if (!this.tensorMap.has(dataId)) {
            throw new Error("Tensor ".concat(dataId, " was not registered!"));
        }
        var info = this.tensorMap.get(dataId);
        if (info.values != null) {
            return info.values;
        }
        else {
            return this.binding.tensorDataSync(info.id);
        }
    };
    /**
     * Dispose the memory if the dataId has 0 refCount. Return true if the memory
     * is released, false otherwise.
     * @param dataId
     * @oaram force Optional, remove the data regardless of refCount
     */
    NodeJSKernelBackend.prototype.disposeData = function (dataId, force) {
        if (force === void 0) { force = false; }
        // No-op if already disposed.
        if (this.tensorMap.has(dataId)) {
            var id = this.tensorMap.get(dataId).id;
            this.tensorMap.get(dataId).refCount--;
            if (!force && this.tensorMap.get(dataId).refCount > 0) {
                return false;
            }
            if (id != null && id >= 0) {
                this.binding.deleteTensor(id);
            }
            this.tensorMap.delete(dataId);
        }
        return true;
    };
    /** Return refCount of a `TensorData`. */
    NodeJSKernelBackend.prototype.refCount = function (dataId) {
        if (this.tensorMap.has(dataId)) {
            var tensorData = this.tensorMap.get(dataId);
            return tensorData.refCount;
        }
        return 0;
    };
    NodeJSKernelBackend.prototype.incRef = function (dataId) {
        this.tensorMap.get(dataId).refCount++;
    };
    NodeJSKernelBackend.prototype.move = function (dataId, values, shape, dtype, refCount) {
        this.tensorMap.set(dataId, { shape: shape, dtype: getTFDType(dtype), values: values, id: -1, refCount: refCount });
    };
    NodeJSKernelBackend.prototype.write = function (values, shape, dtype) {
        var dataId = {};
        this.move(dataId, values, shape, dtype, 1);
        return dataId;
    };
    NodeJSKernelBackend.prototype.applyActivation = function (input, activation, preluActivationWeights, leakyreluAlpha) {
        var result = input;
        if (activation != null) {
            if (activation === 'linear') {
                // No-op
            }
            else if (activation === 'relu') {
                result = tf.relu(result);
            }
            else if (activation === 'prelu') {
                result = tf.prelu(result, preluActivationWeights);
            }
            else if (activation === 'leakyrelu') {
                result = tf.leakyRelu(result, leakyreluAlpha);
            }
            else if (activation === 'elu') {
                result = tf.elu(result);
            }
            else if (activation === 'relu6') {
                result = tf.relu6(result);
            }
            else if (activation === 'sigmoid') {
                result = tf.sigmoid(result);
            }
            else {
                throw new Error("Activation: ".concat(activation, " has not been implemented for the Node.js backend"));
            }
        }
        return result;
    };
    NodeJSKernelBackend.prototype.divide = function (a, b) {
        var opAttrs = [createTensorsTypeOpAttr('T', tfjs_1.backend_util.upcastType(a.dtype, b.dtype))];
        return this.executeSingleOutput('Div', opAttrs, [a, b]);
    };
    NodeJSKernelBackend.prototype.divNoNan = function (a, b) {
        var opAttrs = [createTensorsTypeOpAttr('T', tfjs_1.backend_util.upcastType(a.dtype, b.dtype))];
        return this.executeSingleOutput('DivNoNan', opAttrs, [a, b]);
    };
    NodeJSKernelBackend.prototype.where = function (condition) {
        return this.executeSingleOutput('Where', [], [condition]);
    };
    NodeJSKernelBackend.prototype.topKValues = function (x, k) {
        throw new Error('Method not implemented.');
    };
    NodeJSKernelBackend.prototype.topKIndices = function (x, k) {
        throw new Error('Method not implemented.');
    };
    NodeJSKernelBackend.prototype.int = function (x) {
        throw new Error('Method not implemented.');
    };
    NodeJSKernelBackend.prototype.decodeJpeg = function (contents, channels, ratio, fancyUpscaling, tryRecoverTruncated, acceptableFraction, dctMethod) {
        var opAttrs = [
            { name: 'channels', type: this.binding.TF_ATTR_INT, value: channels },
            { name: 'ratio', type: this.binding.TF_ATTR_INT, value: ratio }, {
                name: 'fancy_upscaling',
                type: this.binding.TF_ATTR_BOOL,
                value: fancyUpscaling
            },
            {
                name: 'try_recover_truncated',
                type: this.binding.TF_ATTR_BOOL,
                value: tryRecoverTruncated
            },
            {
                name: 'acceptable_fraction',
                type: this.binding.TF_ATTR_FLOAT,
                value: acceptableFraction
            },
            { name: 'dct_method', type: this.binding.TF_ATTR_STRING, value: dctMethod }
        ];
        var inputArgs = [(0, tfjs_1.scalar)(contents, 'string')];
        return this.executeSingleOutput('DecodeJpeg', opAttrs, inputArgs);
    };
    NodeJSKernelBackend.prototype.decodePng = function (contents, channels) {
        var opAttrs = [{ name: 'channels', type: this.binding.TF_ATTR_INT, value: channels }];
        var inputArgs = [(0, tfjs_1.scalar)(contents, 'string')];
        return this.executeSingleOutput('DecodePng', opAttrs, inputArgs);
    };
    NodeJSKernelBackend.prototype.decodeBmp = function (contents, channels) {
        var opAttrs = [{ name: 'channels', type: this.binding.TF_ATTR_INT, value: channels }];
        var inputArgs = [(0, tfjs_1.scalar)(contents, 'string')];
        return this.executeSingleOutput('DecodeBmp', opAttrs, inputArgs);
    };
    NodeJSKernelBackend.prototype.decodeGif = function (contents) {
        var inputArgs = [(0, tfjs_1.scalar)(contents, 'string')];
        return this.executeSingleOutput('DecodeGif', [], inputArgs);
    };
    NodeJSKernelBackend.prototype.executeEncodeImageOp = function (name, opAttrs, imageData, imageShape) {
        var inputTensorId = this.binding.createTensor(imageShape, this.binding.TF_UINT8, imageData);
        var outputMetadata = this.binding.executeOp(name, opAttrs, [inputTensorId], 1);
        this.binding.deleteTensor(inputTensorId);
        var outputTensorInfo = outputMetadata[0];
        // prevent the tensor data from being converted to a UTF8 string, since
        // the encoded data is not valid UTF8
        outputTensorInfo.dtype = this.binding.TF_UINT8;
        return this.createOutputTensor(outputTensorInfo);
    };
    NodeJSKernelBackend.prototype.encodeJpeg = function (imageData, imageShape, format, quality, progressive, optimizeSize, chromaDownsampling, densityUnit, xDensity, yDensity, xmpMetadata) {
        var opAttrs = [
            { name: 'format', type: this.binding.TF_ATTR_STRING, value: format },
            { name: 'quality', type: this.binding.TF_ATTR_INT, value: quality }, {
                name: 'progressive',
                type: this.binding.TF_ATTR_BOOL,
                value: progressive
            },
            {
                name: 'optimize_size',
                type: this.binding.TF_ATTR_BOOL,
                value: optimizeSize
            },
            {
                name: 'chroma_downsampling',
                type: this.binding.TF_ATTR_BOOL,
                value: chromaDownsampling
            },
            {
                name: 'density_unit',
                type: this.binding.TF_ATTR_STRING,
                value: densityUnit
            },
            { name: 'x_density', type: this.binding.TF_ATTR_INT, value: xDensity },
            { name: 'y_density', type: this.binding.TF_ATTR_INT, value: yDensity }, {
                name: 'xmp_metadata',
                type: this.binding.TF_ATTR_STRING,
                value: xmpMetadata
            }
        ];
        return this.executeEncodeImageOp('EncodeJpeg', opAttrs, imageData, imageShape);
    };
    NodeJSKernelBackend.prototype.encodePng = function (imageData, imageShape, compression) {
        var opAttrs = [
            { name: 'compression', type: this.binding.TF_ATTR_INT, value: compression }
        ];
        return this.executeEncodeImageOp('EncodePng', opAttrs, imageData, imageShape);
    };
    NodeJSKernelBackend.prototype.deleteSavedModel = function (id) {
        this.binding.deleteSavedModel(id);
    };
    NodeJSKernelBackend.prototype.loadSavedModelMetaGraph = function (path, tags) {
        return this.binding.loadSavedModel(path, tags);
    };
    NodeJSKernelBackend.prototype.getMappedInputTensorIds = function (inputs, inputTensorInfos) {
        var tensorIds = this.getInputTensorIds(inputs);
        var newTensors = [];
        for (var i = 0; i < inputs.length; i++) {
            if (inputTensorInfos[i] != null) {
                if (inputTensorInfos[i].tfDtype === 'DT_UINT8') {
                    var data = Uint8Array.from(inputs[i].dataSync());
                    var inputTensorId = this.binding.createTensor(inputs[i].shape, this.binding.TF_UINT8, data);
                    tensorIds[i] = inputTensorId;
                    newTensors.push(i);
                }
                else if (inputTensorInfos[i].tfDtype === 'DT_INT64') {
                    var data = (0, int64_tensors_1.encodeInt32ArrayAsInt64)(inputs[i].dataSync());
                    var inputTensorId = this.binding.createTensor(inputs[i].shape, this.binding.TF_INT64, data);
                    tensorIds[i] = inputTensorId;
                    newTensors.push(i);
                }
            }
        }
        return { tensorIds: tensorIds, newTensors: newTensors };
    };
    NodeJSKernelBackend.prototype.runSavedModel = function (id, inputs, inputTensorInfos, outputOpNames) {
        var _this = this;
        var _a = this.getMappedInputTensorIds(inputs, inputTensorInfos), tensorIds = _a.tensorIds, newTensors = _a.newTensors;
        var outputMetadata = this.binding.runSavedModel(id, tensorIds, inputTensorInfos.map(function (info) { return info.name; }).join(','), outputOpNames.join(','));
        for (var i = 0; i < tensorIds.length; i++) {
            if (newTensors.includes(i)) {
                this.binding.deleteTensor(tensorIds[i]);
            }
        }
        return outputMetadata.map(function (m) { return _this.createOutputTensor(m); });
    };
    // ------------------------------------------------------------
    // TensorBoard-related (tfjs-node-specific) backend kernels.
    NodeJSKernelBackend.prototype.summaryWriter = function (logdir) {
        var opAttrs = [
            {
                name: 'shared_name',
                type: this.binding.TF_ATTR_STRING,
                value: "logdir:".concat(logdir)
            },
            { name: 'container', type: this.binding.TF_ATTR_STRING, value: '' }
        ];
        var writerResource = this.executeSingleOutput('SummaryWriter', opAttrs, []);
        return writerResource;
    };
    NodeJSKernelBackend.prototype.createSummaryFileWriter = function (resourceHandle, logdir, maxQueue, flushMillis, filenameSuffix) {
        var inputArgs = [
            resourceHandle, (0, tfjs_1.scalar)(logdir),
            (0, tfjs_1.scalar)(maxQueue == null ? 10 : maxQueue, 'int32'),
            (0, tfjs_1.scalar)(flushMillis == null ? 2 * 60 * 1000 : flushMillis, 'int32'),
            (0, tfjs_1.scalar)(filenameSuffix == null ? '.v2' : filenameSuffix)
        ];
        this.executeMultipleOutputs('CreateSummaryFileWriter', [], inputArgs, 0);
    };
    NodeJSKernelBackend.prototype.writeScalarSummary = function (resourceHandle, step, name, value) {
        var _this = this;
        (0, tfjs_1.tidy)(function () {
            tfjs_1.util.assert(Number.isInteger(step), function () { return "step is expected to be an integer, but is instead ".concat(step); });
            var inputArgs = [resourceHandle, new int64_tensors_1.Int64Scalar(step), (0, tfjs_1.scalar)(name, 'string')];
            var typeAttr;
            if (typeof value === 'number') {
                inputArgs.push((0, tfjs_1.scalar)(value));
                typeAttr = _this.binding.TF_FLOAT;
            }
            else {
                // `value` is a Scalar.
                tfjs_1.util.assert(value.rank === 0, function () { return "A non-scalar tensor (rank ".concat(value.rank, ") is passed to ") +
                    "writeScalarSummary()"; });
                inputArgs.push(value);
                typeAttr = _this.typeAttributeFromTensor(value);
            }
            var opAttrs = [{ name: 'T', type: _this.binding.TF_ATTR_TYPE, value: typeAttr }];
            var ids = _this.getInputTensorIds(inputArgs);
            _this.binding.executeOp('WriteScalarSummary', opAttrs, ids, 0);
            // release the tensorflow tensor for Int64Scalar value of step
            _this.binding.deleteTensor(ids[1]);
        });
    };
    NodeJSKernelBackend.prototype.writeHistogramSummary = function (resourceHandle, step, name, data, bucketCount, description) {
        var _this = this;
        (0, tfjs_1.tidy)(function () {
            tfjs_1.util.assert(Number.isInteger(step), function () { return "step is expected to be an integer, but is instead ".concat(step); });
            // We use the WriteSummary op, and not WriteHistogramSummary. The
            // difference is that WriteHistogramSummary takes a tensor of any shape,
            // and places the values in 30 buckets, while WriteSummary expects a
            // tensor which already describes the bucket widths and counts.
            //
            // If we were to use WriteHistogramSummary, we wouldn't have to
            // implement the "bucketization" of the input tensor, but we also
            // wouldn't have control over the number of buckets, or the description
            // of the graph.
            //
            // Therefore, we instead use WriteSummary, which makes it possible to
            // support these features. However, the trade-off is that we have to
            // implement our own "bucketization", and have to write the summary as a
            // protobuf message.
            var content = new messages.HistogramPluginData().setVersion(0);
            var pluginData = new messages.SummaryMetadata.PluginData()
                .setPluginName('histograms')
                .setContent(content.serializeBinary());
            var summary = new messages.SummaryMetadata()
                .setPluginData(pluginData)
                .setDisplayName(null)
                .setSummaryDescription(description);
            var summaryTensor = (0, tfjs_1.scalar)(summary.serializeBinary(), 'string');
            var nameTensor = (0, tfjs_1.scalar)(name, 'string');
            var stepScalar = new int64_tensors_1.Int64Scalar(step);
            var buckets = _this.buckets(data, bucketCount);
            tfjs_1.util.assert(buckets.rank === 2 && buckets.shape[1] === 3, function () { return "Expected buckets to have shape [k, 3], but they had shape ".concat(buckets.shape); });
            tfjs_1.util.assert(buckets.dtype === 'float32', function () { return "Expected buckets to have dtype float32, but they had dtype ".concat(buckets.dtype); });
            var inputArgs = [resourceHandle, stepScalar, buckets, nameTensor, summaryTensor];
            var typeAttr = _this.typeAttributeFromTensor(buckets);
            var opAttrs = [{ name: 'T', type: _this.binding.TF_ATTR_TYPE, value: typeAttr }];
            var ids = _this.getInputTensorIds(inputArgs);
            _this.binding.executeOp('WriteSummary', opAttrs, ids, 0);
            // release the tensorflow tensor for Int64Scalar value of step
            _this.binding.deleteTensor(ids[1]);
        });
    };
    NodeJSKernelBackend.prototype.flushSummaryWriter = function (resourceHandle) {
        var inputArgs = [resourceHandle];
        this.executeMultipleOutputs('FlushSummaryWriter', [], inputArgs, 0);
    };
    /**
     * Group data into histogram buckets.
     *
     * @param data A `Tensor` of any shape. Must be castable to `float32`
     * @param bucketCount Optional positive `number`
     * @returns A `Tensor` of shape `[k, 3]` and type `float32`. The `i`th row
     *     is
     *   a triple `[leftEdge, rightEdge, count]` for a single bucket. The value
     * of `k` is either `bucketCount`, `1` or `0`.
     */
    NodeJSKernelBackend.prototype.buckets = function (data, bucketCount) {
        if (data.size === 0) {
            return tf.tensor([], [0, 3], 'float32');
        }
        // 30 is the default number of buckets in the TensorFlow Python
        // implementation. See
        // https://github.com/tensorflow/tensorboard/blob/master/tensorboard/plugins/histogram/summary_v2.py
        bucketCount = bucketCount !== undefined ? bucketCount : 30;
        tfjs_1.util.assert(Number.isInteger(bucketCount) && bucketCount > 0, function () {
            return "Expected bucket count to be a strictly positive integer, but it was " +
                "".concat(bucketCount);
        });
        data = data.flatten();
        data = data.cast('float32');
        var min = data.min();
        var max = data.max();
        var range = max.sub(min);
        var isSingular = range.equal(0).arraySync() !== 0;
        if (isSingular) {
            var center = min;
            var bucketStart = center.sub(0.5);
            var bucketEnd = center.add(0.5);
            var bucketCounts_1 = tf.scalar(data.size, 'float32');
            return tf.concat([bucketStart, bucketEnd, bucketCounts_1]).reshape([1, 3]);
        }
        var bucketWidth = range.div(bucketCount);
        var offsets = data.sub(min);
        var bucketIndices = offsets.floorDiv(bucketWidth).cast('int32');
        var clampedIndices = tf.minimum(bucketIndices, bucketCount - 1).cast('int32');
        var oneHots = tf.oneHot(clampedIndices, bucketCount);
        var bucketCounts = oneHots.sum(0).cast('int32');
        var edges = tf.linspace(min.arraySync(), max.arraySync(), bucketCount + 1);
        // Ensure last value in edges is max (TF's linspace op doesn't do this)
        edges = tf.concat([edges.slice(0, bucketCount), max.reshape([1])], 0);
        var leftEdges = edges.slice(0, bucketCount);
        var rightEdges = edges.slice(1, bucketCount);
        return tf.stack([leftEdges, rightEdges, bucketCounts.cast('float32')])
            .transpose();
    };
    // ~ TensorBoard-related (tfjs-node-specific) backend kernels.
    // ------------------------------------------------------------
    NodeJSKernelBackend.prototype.memory = function () {
        // Due to automatic garbage collection, the numbers are unreliable.
        // TODO(kreeger): Since there is finalization in C, count the true
        // number of undisposed tensors.
        return { unreliable: true };
    };
    NodeJSKernelBackend.prototype.time = function (f) {
        return __awaiter(this, void 0, void 0, function () {
            var start, elapsed;
            return __generator(this, function (_a) {
                start = process.hrtime();
                f();
                elapsed = process.hrtime(start);
                return [2 /*return*/, { kernelMs: elapsed[0] * 1000 + elapsed[1] / 1000000 }];
            });
        });
    };
    NodeJSKernelBackend.prototype.getNumOfSavedModels = function () {
        return this.binding.getNumOfSavedModels();
    };
    NodeJSKernelBackend.prototype.getNumOfTFTensors = function () {
        return this.binding.getNumOfTensors();
    };
    return NodeJSKernelBackend;
}(tfjs_1.KernelBackend));
exports.NodeJSKernelBackend = NodeJSKernelBackend;
/** Returns an instance of the Node.js backend. */
function nodeBackend() {
    return tf.findBackend('tensorflow');
}
exports.nodeBackend = nodeBackend;
/** Returns the TF dtype for a given DataType. */
function getTFDType(dataType) {
    var binding = nodeBackend().binding;
    switch (dataType) {
        case 'float32':
            return binding.TF_FLOAT;
        case 'int32':
            return binding.TF_INT32;
        case 'bool':
            return binding.TF_BOOL;
        case 'complex64':
            return binding.TF_COMPLEX64;
        case 'string':
            return binding.TF_STRING;
        // tslint:disable-next-line:no-any
        case 'int64':
            // int64 is not a generally supported dtype in TensorFlow.js
            // (tfjs-core). However, it needs to be included here for the purpose of
            // writing the `step` value to TensorBoard via WriteScalarSummary and
            // other op kernels.
            return binding.TF_INT64;
        default:
            var errorMessage = "Unknown dtype: ".concat(dataType);
            throw new Error(errorMessage);
    }
}
exports.getTFDType = getTFDType;
/**
 * Creates a TFEOpAttr for a 'type' OpDef attribute from a Tensor or list of
 * Tensors.
 */
function createTensorsTypeOpAttr(attrName, tensorsOrDtype) {
    if ((0, util_1.isNullOrUndefined)(tensorsOrDtype)) {
        throw new Error('Invalid input tensors value.');
    }
    return {
        name: attrName,
        type: nodeBackend().binding.TF_ATTR_TYPE,
        value: (tensorsOrDtype instanceof tf.Tensor || Array.isArray(tensorsOrDtype)) ?
            getTFDTypeForInputs(tensorsOrDtype) :
            getTFDType(tensorsOrDtype)
    };
}
exports.createTensorsTypeOpAttr = createTensorsTypeOpAttr;
// TODO(yassogba) remove? who uses this?
function createOpAttr(attrName, tensorsOrDtype, value) {
    if ((0, util_1.isNullOrUndefined)(tensorsOrDtype)) {
        throw new Error('Invalid input tensors value.');
    }
    return { name: attrName, type: nodeBackend().binding.TF_BOOL, value: value };
}
exports.createOpAttr = createOpAttr;
/** Returns the dtype number for a single or list of input Tensors. */
function getTFDTypeForInputs(tensors) {
    if ((0, util_1.isNullOrUndefined)(tensors)) {
        throw new Error('Invalid input tensors value.');
    }
    if ((0, util_1.isArray)(tensors)) {
        for (var i = 0; i < tensors.length; i++) {
            return getTFDType(tensors[i].dtype);
        }
        return -1;
    }
    else {
        return getTFDType(tensors.dtype);
    }
}
function ensureTensorflowBackend() {
    tf.util.assert(tf.getBackend() === 'tensorflow', function () { return "Expect the current backend to be \"tensorflow\", but got \"".concat(tf.getBackend(), "\""); });
}
exports.ensureTensorflowBackend = ensureTensorflowBackend;
