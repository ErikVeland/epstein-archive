/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/**
 * TensorFlow.js Layers: Convolutional Layers
 */
import * as tfc from '@tensorflow/tfjs-core';
import { serialization, tidy } from '@tensorflow/tfjs-core';
import { getActivation, serializeActivation } from '../activations';
import { imageDataFormat } from '../backend/common';
import * as K from '../backend/tfjs_backend';
import { checkDataFormat, checkInterpolationFormat, checkPaddingMode } from '../common';
import { getConstraint, serializeConstraint } from '../constraints';
import { InputSpec, Layer } from '../engine/topology';
import { NotImplementedError, ValueError } from '../errors';
import { getInitializer, serializeInitializer } from '../initializers';
import { getRegularizer, serializeRegularizer } from '../regularizers';
import { convOutputLength, deconvLength, normalizeArray } from '../utils/conv_utils';
import * as generic_utils from '../utils/generic_utils';
import { getExactlyOneShape, getExactlyOneTensor } from '../utils/types_utils';
/**
 * Transpose and cast the input before the conv2d.
 * @param x Input image tensor.
 * @param dataFormat
 */
export function preprocessConv2DInput(x, dataFormat) {
    // TODO(cais): Cast type to float32 if not.
    return tidy(() => {
        checkDataFormat(dataFormat);
        if (dataFormat === 'channelsFirst') {
            return tfc.transpose(x, [0, 2, 3, 1]); // NCHW -> NHWC.
        }
        else {
            return x;
        }
    });
}
/**
 * Transpose and cast the input before the conv3d.
 * @param x Input image tensor.
 * @param dataFormat
 */
export function preprocessConv3DInput(x, dataFormat) {
    return tidy(() => {
        checkDataFormat(dataFormat);
        if (dataFormat === 'channelsFirst') {
            return tfc.transpose(x, [0, 2, 3, 4, 1]); // NCDHW -> NDHWC.
        }
        else {
            return x;
        }
    });
}
/**
 * 1D-convolution with bias added.
 *
 * Porting Note: This function does not exist in the Python Keras backend.
 *   It is exactly the same as `conv2d`, except the added `bias`.
 *
 * @param x Input tensor, rank-3, of shape `[batchSize, width, inChannels]`.
 * @param kernel Kernel, rank-3, of shape `[filterWidth, inDepth, outDepth]`.
 * @param bias Bias, rank-3, of shape `[outDepth]`.
 * @param strides
 * @param padding Padding mode.
 * @param dataFormat Data format.
 * @param dilationRate
 * @returns The result of the 1D convolution.
 * @throws ValueError, if `x`, `kernel` or `bias` is not of the correct rank.
 */
export function conv1dWithBias(x, kernel, bias, strides = 1, padding = 'valid', dataFormat, dilationRate = 1) {
    return tidy(() => {
        if (dataFormat == null) {
            dataFormat = imageDataFormat();
        }
        checkDataFormat(dataFormat);
        // Check the ranks of x, kernel and bias.
        if (x.shape.length !== 3) {
            throw new ValueError(`The input of a conv1dWithBias operation should be 3, but is ` +
                `${x.shape.length} instead.`);
        }
        if (kernel.shape.length !== 3) {
            throw new ValueError(`The kernel for a conv1dWithBias operation should be 3, but is ` +
                `${kernel.shape.length} instead`);
        }
        if (bias != null && bias.shape.length !== 1) {
            throw new ValueError(`The bias for a conv1dWithBias operation should be 1, but is ` +
                `${bias.shape.length} instead`);
        }
        // TODO(cais): Support CAUSAL padding mode.
        if (dataFormat === 'channelsFirst') {
            x = tfc.transpose(x, [0, 2, 1]); // NCW -> NWC.
        }
        if (padding === 'causal') {
            throw new NotImplementedError('The support for CAUSAL padding mode in conv1dWithBias is not ' +
                'implemented yet.');
        }
        let y = tfc.conv1d(x, kernel, strides, padding === 'same' ? 'same' : 'valid', 'NWC', dilationRate);
        if (bias != null) {
            y = K.biasAdd(y, bias);
        }
        return y;
    });
}
/**
 * 1D-convolution.
 *
 * @param x Input tensor, rank-3, of shape `[batchSize, width, inChannels]`.
 * @param kernel Kernel, rank-3, of shape `[filterWidth, inDepth, outDepth]`.s
 * @param strides
 * @param padding Padding mode.
 * @param dataFormat Data format.
 * @param dilationRate
 * @returns The result of the 1D convolution.
 * @throws ValueError, if `x`, `kernel` or `bias` is not of the correct rank.
 */
export function conv1d(x, kernel, strides = 1, padding = 'valid', dataFormat, dilationRate = 1) {
    return tidy(() => {
        checkDataFormat(dataFormat);
        return conv1dWithBias(x, kernel, null, strides, padding, dataFormat, dilationRate);
    });
}
/**
 * 2D Convolution
 * @param x
 * @param kernel kernel of the convolution.
 * @param strides strides array.
 * @param padding padding mode. Default to 'valid'.
 * @param dataFormat data format. Defaults to 'channelsLast'.
 * @param dilationRate dilation rate array.
 * @returns Result of the 2D pooling.
 */
export function conv2d(x, kernel, strides = [1, 1], padding = 'valid', dataFormat, dilationRate) {
    return tidy(() => {
        checkDataFormat(dataFormat);
        return conv2dWithBiasActivation(x, kernel, null, strides, padding, dataFormat, dilationRate);
    });
}
/**
 * 2D Convolution with an added bias and optional activation.
 * Note: This function does not exist in the Python Keras Backend. This function
 * is exactly the same as `conv2d`, except the added `bias`.
 */
export function conv2dWithBiasActivation(x, kernel, bias, strides = [1, 1], padding = 'valid', dataFormat, dilationRate, activation = null) {
    return tidy(() => {
        if (dataFormat == null) {
            dataFormat = imageDataFormat();
        }
        checkDataFormat(dataFormat);
        if (x.rank !== 3 && x.rank !== 4) {
            throw new ValueError(`conv2dWithBiasActivation expects input to be of rank 3 or 4, ` +
                `but received ${x.rank}.`);
        }
        if (kernel.rank !== 3 && kernel.rank !== 4) {
            throw new ValueError(`conv2dWithBiasActivation expects kernel to be of rank 3 or 4, ` +
                `but received ${x.rank}.`);
        }
        let y = preprocessConv2DInput(x, dataFormat);
        if (padding === 'causal') {
            throw new NotImplementedError('The support for CAUSAL padding mode in conv1dWithBias is not ' +
                'implemented yet.');
        }
        y = tfc.fused.conv2d({
            x: y,
            filter: kernel,
            strides: strides,
            pad: padding === 'same' ? 'same' : 'valid',
            dilations: dilationRate,
            dataFormat: 'NHWC',
            bias,
            activation
        });
        if (dataFormat === 'channelsFirst') {
            y = tfc.transpose(y, [0, 3, 1, 2]);
        }
        return y;
    });
}
/**
 * 3D Convolution.
 * @param x
 * @param kernel kernel of the convolution.
 * @param strides strides array.
 * @param padding padding mode. Default to 'valid'.
 * @param dataFormat data format. Defaults to 'channelsLast'.
 * @param dilationRate dilation rate array.
 * @returns Result of the 3D convolution.
 */
export function conv3d(x, kernel, strides = [1, 1, 1], padding = 'valid', dataFormat, dilationRate) {
    return tidy(() => {
        checkDataFormat(dataFormat);
        return conv3dWithBias(x, kernel, null, strides, padding, dataFormat, dilationRate);
    });
}
/**
 * 3D Convolution with an added bias.
 * Note: This function does not exist in the Python Keras Backend. This function
 * is exactly the same as `conv3d`, except the added `bias`.
 */
export function conv3dWithBias(x, kernel, bias, strides = [1, 1, 1], padding = 'valid', dataFormat, dilationRate) {
    return tidy(() => {
        if (dataFormat == null) {
            dataFormat = imageDataFormat();
        }
        checkDataFormat(dataFormat);
        if (x.rank !== 4 && x.rank !== 5) {
            throw new ValueError(`conv3dWithBias expects input to be of rank 4 or 5, but received ` +
                `${x.rank}.`);
        }
        if (kernel.rank !== 4 && kernel.rank !== 5) {
            throw new ValueError(`conv3dWithBias expects kernel to be of rank 4 or 5, but received ` +
                `${x.rank}.`);
        }
        let y = preprocessConv3DInput(x, dataFormat);
        if (padding === 'causal') {
            throw new NotImplementedError('The support for CAUSAL padding mode in conv3dWithBias is not ' +
                'implemented yet.');
        }
        y = tfc.conv3d(y, kernel, strides, padding === 'same' ? 'same' : 'valid', 'NDHWC', dilationRate);
        if (bias != null) {
            y = K.biasAdd(y, bias);
        }
        if (dataFormat === 'channelsFirst') {
            y = tfc.transpose(y, [0, 4, 1, 2, 3]);
        }
        return y;
    });
}
/**
 * Abstract convolution layer.
 */
export class BaseConv extends Layer {
    constructor(rank, args) {
        super(args);
        this.bias = null;
        this.DEFAULT_KERNEL_INITIALIZER = 'glorotNormal';
        this.DEFAULT_BIAS_INITIALIZER = 'zeros';
        BaseConv.verifyArgs(args);
        this.rank = rank;
        generic_utils.assertPositiveInteger(this.rank, 'rank');
        if (this.rank !== 1 && this.rank !== 2 && this.rank !== 3) {
            throw new NotImplementedError(`Convolution layer for rank other than 1, 2, or 3 (${this.rank}) is ` +
                `not implemented yet.`);
        }
        this.kernelSize = normalizeArray(args.kernelSize, rank, 'kernelSize');
        this.strides = normalizeArray(args.strides == null ? 1 : args.strides, rank, 'strides');
        this.padding = args.padding == null ? 'valid' : args.padding;
        checkPaddingMode(this.padding);
        this.dataFormat =
            args.dataFormat == null ? 'channelsLast' : args.dataFormat;
        checkDataFormat(this.dataFormat);
        this.activation = getActivation(args.activation);
        this.useBias = args.useBias == null ? true : args.useBias;
        this.biasInitializer =
            getInitializer(args.biasInitializer || this.DEFAULT_BIAS_INITIALIZER);
        this.biasConstraint = getConstraint(args.biasConstraint);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.activityRegularizer = getRegularizer(args.activityRegularizer);
        this.dilationRate = normalizeArray(args.dilationRate == null ? 1 : args.dilationRate, rank, 'dilationRate');
        if (this.rank === 1 &&
            (Array.isArray(this.dilationRate) && this.dilationRate.length !== 1)) {
            throw new ValueError(`dilationRate must be a number or an array of a single number ` +
                `for 1D convolution, but received ` +
                `${JSON.stringify(this.dilationRate)}`);
        }
        else if (this.rank === 2) {
            if (typeof this.dilationRate === 'number') {
                this.dilationRate = [this.dilationRate, this.dilationRate];
            }
            else if (this.dilationRate.length !== 2) {
                throw new ValueError(`dilationRate must be a number or array of two numbers for 2D ` +
                    `convolution, but received ${JSON.stringify(this.dilationRate)}`);
            }
        }
        else if (this.rank === 3) {
            if (typeof this.dilationRate === 'number') {
                this.dilationRate =
                    [this.dilationRate, this.dilationRate, this.dilationRate];
            }
            else if (this.dilationRate.length !== 3) {
                throw new ValueError(`dilationRate must be a number or array of three numbers for 3D ` +
                    `convolution, but received ${JSON.stringify(this.dilationRate)}`);
            }
        }
    }
    static verifyArgs(args) {
        // Check config.kernelSize type and shape.
        generic_utils.assert('kernelSize' in args, `required key 'kernelSize' not in config`);
        if (typeof args.kernelSize !== 'number' &&
            !generic_utils.checkArrayTypeAndLength(args.kernelSize, 'number', 1, 3)) {
            throw new ValueError(`BaseConv expects config.kernelSize to be number or number[] with ` +
                `length 1, 2, or 3, but received ${JSON.stringify(args.kernelSize)}.`);
        }
    }
    getConfig() {
        const config = {
            kernelSize: this.kernelSize,
            strides: this.strides,
            padding: this.padding,
            dataFormat: this.dataFormat,
            dilationRate: this.dilationRate,
            activation: serializeActivation(this.activation),
            useBias: this.useBias,
            biasInitializer: serializeInitializer(this.biasInitializer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            biasConstraint: serializeConstraint(this.biasConstraint)
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/**
 * Abstract nD convolution layer.  Ancestor of convolution layers which reduce
 * across channels, i.e., Conv1D and Conv2D, but not DepthwiseConv2D.
 */
export class Conv extends BaseConv {
    constructor(rank, args) {
        super(rank, args);
        this.kernel = null;
        Conv.verifyArgs(args);
        this.filters = args.filters;
        generic_utils.assertPositiveInteger(this.filters, 'filters');
        this.kernelInitializer = getInitializer(args.kernelInitializer || this.DEFAULT_KERNEL_INITIALIZER);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const channelAxis = this.dataFormat === 'channelsFirst' ? 1 : inputShape.length - 1;
        if (inputShape[channelAxis] == null) {
            throw new ValueError(`The channel dimension of the input should be defined. ` +
                `Found ${inputShape[channelAxis]}`);
        }
        const inputDim = inputShape[channelAxis];
        const kernelShape = this.kernelSize.concat([inputDim, this.filters]);
        this.kernel = this.addWeight('kernel', kernelShape, null, this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        if (this.useBias) {
            this.bias = this.addWeight('bias', [this.filters], null, this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        this.inputSpec = [{ ndim: this.rank + 2, axes: { [channelAxis]: inputDim } }];
        this.built = true;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = getExactlyOneTensor(inputs);
            let outputs;
            const biasValue = this.bias == null ? null : this.bias.read();
            const fusedActivationName = generic_utils.mapActivationToFusedKernel(this.activation.getClassName());
            if (fusedActivationName != null && this.rank === 2) {
                outputs = conv2dWithBiasActivation(inputs, this.kernel.read(), biasValue, this.strides, this.padding, this.dataFormat, this.dilationRate, fusedActivationName);
            }
            else {
                if (this.rank === 1) {
                    outputs = conv1dWithBias(inputs, this.kernel.read(), biasValue, this.strides[0], this.padding, this.dataFormat, this.dilationRate[0]);
                }
                else if (this.rank === 2) {
                    // TODO(cais): Move up to constructor.
                    outputs = conv2dWithBiasActivation(inputs, this.kernel.read(), biasValue, this.strides, this.padding, this.dataFormat, this.dilationRate);
                }
                else if (this.rank === 3) {
                    outputs = conv3dWithBias(inputs, this.kernel.read(), biasValue, this.strides, this.padding, this.dataFormat, this.dilationRate);
                }
                else {
                    throw new NotImplementedError('convolutions greater than 3D are not implemented yet.');
                }
                if (this.activation != null) {
                    outputs = this.activation.apply(outputs);
                }
            }
            return outputs;
        });
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const newSpace = [];
        const space = (this.dataFormat === 'channelsLast') ?
            inputShape.slice(1, inputShape.length - 1) :
            inputShape.slice(2);
        for (let i = 0; i < space.length; ++i) {
            const newDim = convOutputLength(space[i], this.kernelSize[i], this.padding, this.strides[i], typeof this.dilationRate === 'number' ? this.dilationRate :
                this.dilationRate[i]);
            newSpace.push(newDim);
        }
        let outputShape = [inputShape[0]];
        if (this.dataFormat === 'channelsLast') {
            outputShape = outputShape.concat(newSpace);
            outputShape.push(this.filters);
        }
        else {
            outputShape.push(this.filters);
            outputShape = outputShape.concat(newSpace);
        }
        return outputShape;
    }
    getConfig() {
        const config = {
            filters: this.filters,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint)
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    static verifyArgs(args) {
        // Check config.filters type, shape, and value.
        if (!('filters' in args) || typeof args.filters !== 'number' ||
            args.filters < 1) {
            throw new ValueError(`Convolution layer expected config.filters to be a 'number' > 0 ` +
                `but got ${JSON.stringify(args.filters)}`);
        }
    }
}
class Conv2D extends Conv {
    constructor(args) {
        super(2, args);
        Conv2D.verifyArgs(args);
    }
    getConfig() {
        const config = super.getConfig();
        delete config['rank'];
        return config;
    }
    static verifyArgs(args) {
        // config.kernelSize must be a number or array of numbers.
        if ((typeof args.kernelSize !== 'number') &&
            !generic_utils.checkArrayTypeAndLength(args.kernelSize, 'number', 1, 2)) {
            throw new ValueError(`Conv2D expects config.kernelSize to be number or number[] with ` +
                `length 1 or 2, but received ${JSON.stringify(args.kernelSize)}.`);
        }
    }
}
/** @nocollapse */
Conv2D.className = 'Conv2D';
export { Conv2D };
serialization.registerClass(Conv2D);
class Conv3D extends Conv {
    constructor(args) {
        super(3, args);
        Conv3D.verifyArgs(args);
    }
    getConfig() {
        const config = super.getConfig();
        delete config['rank'];
        return config;
    }
    static verifyArgs(args) {
        // config.kernelSize must be a number or array of numbers.
        if (typeof args.kernelSize !== 'number') {
            if (!(Array.isArray(args.kernelSize) &&
                (args.kernelSize.length === 1 || args.kernelSize.length === 3))) {
                throw new ValueError(`Conv3D expects config.kernelSize to be number or` +
                    ` [number, number, number], but received ${JSON.stringify(args.kernelSize)}.`);
            }
        }
    }
}
/** @nocollapse */
Conv3D.className = 'Conv3D';
export { Conv3D };
serialization.registerClass(Conv3D);
class Conv2DTranspose extends Conv2D {
    constructor(args) {
        super(args);
        this.inputSpec = [new InputSpec({ ndim: 4 })];
        if (this.padding !== 'same' && this.padding !== 'valid') {
            throw new ValueError(`Conv2DTranspose currently supports only padding modes 'same' ` +
                `and 'valid', but received padding mode ${this.padding}`);
        }
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        if (inputShape.length !== 4) {
            throw new ValueError('Input should have rank 4; Received input shape: ' +
                JSON.stringify(inputShape));
        }
        const channelAxis = this.dataFormat === 'channelsFirst' ? 1 : inputShape.length - 1;
        if (inputShape[channelAxis] == null) {
            throw new ValueError('The channel dimension of the inputs should be defined. ' +
                'Found `None`.');
        }
        const inputDim = inputShape[channelAxis];
        const kernelShape = this.kernelSize.concat([this.filters, inputDim]);
        this.kernel = this.addWeight('kernel', kernelShape, 'float32', this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        if (this.useBias) {
            this.bias = this.addWeight('bias', [this.filters], 'float32', this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        // Set input spec.
        this.inputSpec =
            [new InputSpec({ ndim: 4, axes: { [channelAxis]: inputDim } })];
        this.built = true;
    }
    call(inputs, kwargs) {
        return tfc.tidy(() => {
            let input = getExactlyOneTensor(inputs);
            if (input.shape.length !== 4) {
                throw new ValueError(`Conv2DTranspose.call() expects input tensor to be rank-4, but ` +
                    `received a tensor of rank-${input.shape.length}`);
            }
            const inputShape = input.shape;
            const batchSize = inputShape[0];
            let hAxis;
            let wAxis;
            if (this.dataFormat === 'channelsFirst') {
                hAxis = 2;
                wAxis = 3;
            }
            else {
                hAxis = 1;
                wAxis = 2;
            }
            const height = inputShape[hAxis];
            const width = inputShape[wAxis];
            const kernelH = this.kernelSize[0];
            const kernelW = this.kernelSize[1];
            const strideH = this.strides[0];
            const strideW = this.strides[1];
            // Infer the dynamic output shape.
            const outHeight = deconvLength(height, strideH, kernelH, this.padding);
            const outWidth = deconvLength(width, strideW, kernelW, this.padding);
            // Porting Note: We don't branch based on `this.dataFormat` here,
            // because
            //   the tjfs-core function `conv2dTranspose` called below always
            //   assumes channelsLast.
            const outputShape = [batchSize, outHeight, outWidth, this.filters];
            if (this.dataFormat !== 'channelsLast') {
                input = tfc.transpose(input, [0, 2, 3, 1]);
            }
            let outputs = tfc.conv2dTranspose(input, this.kernel.read(), outputShape, this.strides, this.padding);
            if (this.dataFormat !== 'channelsLast') {
                outputs = tfc.transpose(outputs, [0, 3, 1, 2]);
            }
            if (this.bias != null) {
                outputs =
                    K.biasAdd(outputs, this.bias.read(), this.dataFormat);
            }
            if (this.activation != null) {
                outputs = this.activation.apply(outputs);
            }
            return outputs;
        });
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const outputShape = inputShape.slice();
        let channelAxis;
        let heightAxis;
        let widthAxis;
        if (this.dataFormat === 'channelsFirst') {
            channelAxis = 1;
            heightAxis = 2;
            widthAxis = 3;
        }
        else {
            channelAxis = 3;
            heightAxis = 1;
            widthAxis = 2;
        }
        const kernelH = this.kernelSize[0];
        const kernelW = this.kernelSize[1];
        const strideH = this.strides[0];
        const strideW = this.strides[1];
        outputShape[channelAxis] = this.filters;
        outputShape[heightAxis] =
            deconvLength(outputShape[heightAxis], strideH, kernelH, this.padding);
        outputShape[widthAxis] =
            deconvLength(outputShape[widthAxis], strideW, kernelW, this.padding);
        return outputShape;
    }
    getConfig() {
        const config = super.getConfig();
        delete config['dilationRate'];
        return config;
    }
}
/** @nocollapse */
Conv2DTranspose.className = 'Conv2DTranspose';
export { Conv2DTranspose };
serialization.registerClass(Conv2DTranspose);
class Conv3DTranspose extends Conv3D {
    constructor(args) {
        super(args);
        this.inputSpec = [new InputSpec({ ndim: 5 })];
        if (this.padding !== 'same' && this.padding !== 'valid') {
            throw new ValueError(`Conv3DTranspose currently supports only padding modes 'same' ` +
                `and 'valid', but received padding mode ${this.padding}`);
        }
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        if (inputShape.length !== 5) {
            throw new ValueError('Input should have rank 5; Received input shape: ' +
                JSON.stringify(inputShape));
        }
        const channelAxis = this.dataFormat === 'channelsFirst' ? 1 : inputShape.length - 1;
        if (inputShape[channelAxis] == null) {
            throw new ValueError('The channel dimension of the inputs should be defined. ' +
                'Found `None`.');
        }
        const inputDim = inputShape[channelAxis];
        const kernelShape = this.kernelSize.concat([this.filters, inputDim]);
        this.kernel = this.addWeight('kernel', kernelShape, 'float32', this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        if (this.useBias) {
            this.bias = this.addWeight('bias', [this.filters], 'float32', this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        // Set input spec.
        this.inputSpec =
            [new InputSpec({ ndim: 5, axes: { [channelAxis]: inputDim } })];
        this.built = true;
    }
    call(inputs, kwargs) {
        return tfc.tidy(() => {
            let input = getExactlyOneTensor(inputs);
            if (input.shape.length !== 5) {
                throw new ValueError(`Conv3DTranspose.call() expects input tensor to be rank-4, but ` +
                    `received a tensor of rank-${input.shape.length}`);
            }
            const inputShape = input.shape;
            const batchSize = inputShape[0];
            let hAxis;
            let wAxis;
            let dAxis;
            if (this.dataFormat === 'channelsFirst') {
                dAxis = 2;
                hAxis = 3;
                wAxis = 4;
            }
            else {
                dAxis = 1;
                hAxis = 2;
                wAxis = 3;
            }
            const depth = inputShape[dAxis];
            const height = inputShape[hAxis];
            const width = inputShape[wAxis];
            const kernelD = this.kernelSize[0];
            const kernelH = this.kernelSize[1];
            const kernelW = this.kernelSize[2];
            const strideD = this.strides[0];
            const strideH = this.strides[1];
            const strideW = this.strides[2];
            // Infer the dynamic output shape.
            const outDepth = deconvLength(depth, strideD, kernelD, this.padding);
            const outHeight = deconvLength(height, strideH, kernelH, this.padding);
            const outWidth = deconvLength(width, strideW, kernelW, this.padding);
            // Same as `conv2dTranspose`. We always assumes channelsLast.
            const outputShape = [batchSize, outDepth, outHeight, outWidth, this.filters];
            if (this.dataFormat !== 'channelsLast') {
                input = tfc.transpose(input, [0, 2, 3, 4, 1]);
            }
            let outputs = tfc.conv3dTranspose(input, this.kernel.read(), outputShape, this.strides, this.padding);
            if (this.dataFormat !== 'channelsLast') {
                outputs = tfc.transpose(outputs, [0, 4, 1, 2, 3]);
            }
            if (this.bias !== null) {
                outputs =
                    K.biasAdd(outputs, this.bias.read(), this.dataFormat);
            }
            if (this.activation !== null) {
                outputs = this.activation.apply(outputs);
            }
            return outputs;
        });
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const outputShape = inputShape.slice();
        let channelAxis;
        let depthAxis;
        let heightAxis;
        let widthAxis;
        if (this.dataFormat === 'channelsFirst') {
            channelAxis = 1;
            depthAxis = 2;
            heightAxis = 3;
            widthAxis = 4;
        }
        else {
            channelAxis = 4;
            depthAxis = 1;
            heightAxis = 2;
            widthAxis = 3;
        }
        const kernelD = this.kernelSize[0];
        const kernelH = this.kernelSize[1];
        const kernelW = this.kernelSize[2];
        const strideD = this.strides[0];
        const strideH = this.strides[1];
        const strideW = this.strides[2];
        outputShape[channelAxis] = this.filters;
        outputShape[depthAxis] =
            deconvLength(outputShape[depthAxis], strideD, kernelD, this.padding);
        outputShape[heightAxis] =
            deconvLength(outputShape[heightAxis], strideH, kernelH, this.padding);
        outputShape[widthAxis] =
            deconvLength(outputShape[widthAxis], strideW, kernelW, this.padding);
        return outputShape;
    }
    getConfig() {
        const config = super.getConfig();
        delete config['dilationRate'];
        return config;
    }
}
/** @nocollapse */
Conv3DTranspose.className = 'Conv3DTranspose';
export { Conv3DTranspose };
serialization.registerClass(Conv3DTranspose);
class SeparableConv extends Conv {
    constructor(rank, config) {
        super(rank, config);
        this.DEFAULT_DEPTHWISE_INITIALIZER = 'glorotUniform';
        this.DEFAULT_POINTWISE_INITIALIZER = 'glorotUniform';
        this.depthwiseKernel = null;
        this.pointwiseKernel = null;
        if (config.filters == null) {
            throw new ValueError('The `filters` configuration field is required by SeparableConv, ' +
                'but is unspecified.');
        }
        if (config.kernelInitializer != null || config.kernelRegularizer != null ||
            config.kernelConstraint != null) {
            throw new ValueError('Fields kernelInitializer, kernelRegularizer and kernelConstraint ' +
                'are invalid for SeparableConv2D. Use depthwiseInitializer, ' +
                'depthwiseRegularizer, depthwiseConstraint, pointwiseInitializer, ' +
                'pointwiseRegularizer and pointwiseConstraint instead.');
        }
        if (config.padding != null && config.padding !== 'same' &&
            config.padding !== 'valid') {
            throw new ValueError(`SeparableConv${this.rank}D supports only padding modes: ` +
                `'same' and 'valid', but received ${JSON.stringify(config.padding)}`);
        }
        this.depthMultiplier =
            config.depthMultiplier == null ? 1 : config.depthMultiplier;
        this.depthwiseInitializer = getInitializer(config.depthwiseInitializer || this.DEFAULT_DEPTHWISE_INITIALIZER);
        this.depthwiseRegularizer = getRegularizer(config.depthwiseRegularizer);
        this.depthwiseConstraint = getConstraint(config.depthwiseConstraint);
        this.pointwiseInitializer = getInitializer(config.depthwiseInitializer || this.DEFAULT_POINTWISE_INITIALIZER);
        this.pointwiseRegularizer = getRegularizer(config.pointwiseRegularizer);
        this.pointwiseConstraint = getConstraint(config.pointwiseConstraint);
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        if (inputShape.length < this.rank + 2) {
            throw new ValueError(`Inputs to SeparableConv${this.rank}D should have rank ` +
                `${this.rank + 2}, but received input shape: ` +
                `${JSON.stringify(inputShape)}`);
        }
        const channelAxis = this.dataFormat === 'channelsFirst' ? 1 : inputShape.length - 1;
        if (inputShape[channelAxis] == null || inputShape[channelAxis] < 0) {
            throw new ValueError(`The channel dimension of the inputs should be defined, ` +
                `but found ${JSON.stringify(inputShape[channelAxis])}`);
        }
        const inputDim = inputShape[channelAxis];
        const depthwiseKernelShape = this.kernelSize.concat([inputDim, this.depthMultiplier]);
        const pointwiseKernelShape = [];
        for (let i = 0; i < this.rank; ++i) {
            pointwiseKernelShape.push(1);
        }
        pointwiseKernelShape.push(inputDim * this.depthMultiplier, this.filters);
        const trainable = true;
        this.depthwiseKernel = this.addWeight('depthwise_kernel', depthwiseKernelShape, 'float32', this.depthwiseInitializer, this.depthwiseRegularizer, trainable, this.depthwiseConstraint);
        this.pointwiseKernel = this.addWeight('pointwise_kernel', pointwiseKernelShape, 'float32', this.pointwiseInitializer, this.pointwiseRegularizer, trainable, this.pointwiseConstraint);
        if (this.useBias) {
            this.bias = this.addWeight('bias', [this.filters], 'float32', this.biasInitializer, this.biasRegularizer, trainable, this.biasConstraint);
        }
        else {
            this.bias = null;
        }
        this.inputSpec =
            [new InputSpec({ ndim: this.rank + 2, axes: { [channelAxis]: inputDim } })];
        this.built = true;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = getExactlyOneTensor(inputs);
            let output;
            if (this.rank === 1) {
                throw new NotImplementedError('1D separable convolution is not implemented yet.');
            }
            else if (this.rank === 2) {
                if (this.dataFormat === 'channelsFirst') {
                    inputs = tfc.transpose(inputs, [0, 2, 3, 1]); // NCHW -> NHWC.
                }
                output = tfc.separableConv2d(inputs, this.depthwiseKernel.read(), this.pointwiseKernel.read(), this.strides, this.padding, this.dilationRate, 'NHWC');
            }
            if (this.useBias) {
                output = K.biasAdd(output, this.bias.read(), this.dataFormat);
            }
            if (this.activation != null) {
                output = this.activation.apply(output);
            }
            if (this.dataFormat === 'channelsFirst') {
                output = tfc.transpose(output, [0, 3, 1, 2]); // NHWC -> NCHW.
            }
            return output;
        });
    }
    getConfig() {
        const config = super.getConfig();
        delete config['rank'];
        delete config['kernelInitializer'];
        delete config['kernelRegularizer'];
        delete config['kernelConstraint'];
        config['depthwiseInitializer'] =
            serializeInitializer(this.depthwiseInitializer);
        config['pointwiseInitializer'] =
            serializeInitializer(this.pointwiseInitializer);
        config['depthwiseRegularizer'] =
            serializeRegularizer(this.depthwiseRegularizer);
        config['pointwiseRegularizer'] =
            serializeRegularizer(this.pointwiseRegularizer);
        config['depthwiseConstraint'] =
            serializeConstraint(this.depthwiseConstraint);
        config['pointwiseConstraint'] =
            serializeConstraint(this.pointwiseConstraint);
        return config;
    }
}
/** @nocollapse */
SeparableConv.className = 'SeparableConv';
export { SeparableConv };
class SeparableConv2D extends SeparableConv {
    constructor(args) {
        super(2, args);
    }
}
/** @nocollapse */
SeparableConv2D.className = 'SeparableConv2D';
export { SeparableConv2D };
serialization.registerClass(SeparableConv2D);
class Conv1D extends Conv {
    constructor(args) {
        super(1, args);
        Conv1D.verifyArgs(args);
        this.inputSpec = [{ ndim: 3 }];
    }
    getConfig() {
        const config = super.getConfig();
        delete config['rank'];
        delete config['dataFormat'];
        return config;
    }
    static verifyArgs(args) {
        // config.kernelSize must be a number or array of numbers.
        if (typeof args.kernelSize !== 'number' &&
            !generic_utils.checkArrayTypeAndLength(args.kernelSize, 'number', 1, 1)) {
            throw new ValueError(`Conv1D expects config.kernelSize to be number or number[] with ` +
                `length 1, but received ${JSON.stringify(args.kernelSize)}.`);
        }
    }
}
/** @nocollapse */
Conv1D.className = 'Conv1D';
export { Conv1D };
serialization.registerClass(Conv1D);
class Cropping2D extends Layer {
    constructor(args) {
        super(args);
        if (typeof args.cropping === 'number') {
            this.cropping =
                [[args.cropping, args.cropping], [args.cropping, args.cropping]];
        }
        else if (typeof args.cropping[0] === 'number') {
            this.cropping = [
                [args.cropping[0], args.cropping[0]],
                [args.cropping[1], args.cropping[1]]
            ];
        }
        else {
            this.cropping = args.cropping;
        }
        this.dataFormat =
            args.dataFormat === undefined ? 'channelsLast' : args.dataFormat;
        this.inputSpec = [{ ndim: 4 }];
    }
    computeOutputShape(inputShape) {
        if (this.dataFormat === 'channelsFirst') {
            return [
                inputShape[0], inputShape[1],
                inputShape[2] - this.cropping[0][0] - this.cropping[0][1],
                inputShape[3] - this.cropping[1][0] - this.cropping[1][1]
            ];
        }
        else {
            return [
                inputShape[0],
                inputShape[1] - this.cropping[0][0] - this.cropping[0][1],
                inputShape[2] - this.cropping[1][0] - this.cropping[1][1], inputShape[3]
            ];
        }
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = getExactlyOneTensor(inputs);
            if (this.dataFormat === 'channelsLast') {
                const hSliced = K.sliceAlongAxis(inputs, this.cropping[0][0], inputs.shape[1] - this.cropping[0][0] - this.cropping[0][1], 2);
                return K.sliceAlongAxis(hSliced, this.cropping[1][0], inputs.shape[2] - this.cropping[1][1] - this.cropping[1][0], 3);
            }
            else {
                const hSliced = K.sliceAlongAxis(inputs, this.cropping[0][0], inputs.shape[2] - this.cropping[0][0] - this.cropping[0][1], 3);
                return K.sliceAlongAxis(hSliced, this.cropping[1][0], inputs.shape[3] - this.cropping[1][1] - this.cropping[1][0], 4);
            }
        });
    }
    getConfig() {
        const config = { cropping: this.cropping, dataFormat: this.dataFormat };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Cropping2D.className = 'Cropping2D';
export { Cropping2D };
serialization.registerClass(Cropping2D);
class UpSampling2D extends Layer {
    constructor(args) {
        super(args);
        this.DEFAULT_SIZE = [2, 2];
        this.inputSpec = [{ ndim: 4 }];
        this.size = args.size == null ? this.DEFAULT_SIZE : args.size;
        this.dataFormat =
            args.dataFormat == null ? 'channelsLast' : args.dataFormat;
        checkDataFormat(this.dataFormat);
        this.interpolation =
            args.interpolation == null ? 'nearest' : args.interpolation;
        checkInterpolationFormat(this.interpolation);
    }
    computeOutputShape(inputShape) {
        if (this.dataFormat === 'channelsFirst') {
            const height = inputShape[2] == null ? null : this.size[0] * inputShape[2];
            const width = inputShape[3] == null ? null : this.size[1] * inputShape[3];
            return [inputShape[0], inputShape[1], height, width];
        }
        else {
            const height = inputShape[1] == null ? null : this.size[0] * inputShape[1];
            const width = inputShape[2] == null ? null : this.size[1] * inputShape[2];
            return [inputShape[0], height, width, inputShape[3]];
        }
    }
    call(inputs, kwargs) {
        return tfc.tidy(() => {
            let input = getExactlyOneTensor(inputs);
            const inputShape = input.shape;
            if (this.dataFormat === 'channelsFirst') {
                input = tfc.transpose(input, [0, 2, 3, 1]);
                const height = this.size[0] * inputShape[2];
                const width = this.size[1] * inputShape[3];
                const resized = this.interpolation === 'nearest' ?
                    tfc.image.resizeNearestNeighbor(input, [height, width]) :
                    tfc.image.resizeBilinear(input, [height, width]);
                return tfc.transpose(resized, [0, 3, 1, 2]);
            }
            else {
                const height = this.size[0] * inputShape[1];
                const width = this.size[1] * inputShape[2];
                return this.interpolation === 'nearest' ?
                    tfc.image.resizeNearestNeighbor(input, [height, width]) :
                    tfc.image.resizeBilinear(input, [height, width]);
            }
        });
    }
    getConfig() {
        const config = {
            size: this.size,
            dataFormat: this.dataFormat,
            interpolation: this.interpolation
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
UpSampling2D.className = 'UpSampling2D';
export { UpSampling2D };
serialization.registerClass(UpSampling2D);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udm9sdXRpb25hbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvY29udm9sdXRpb25hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVIOztHQUVHO0FBRUgsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQVEsYUFBYSxFQUE0RCxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUUzSCxPQUFPLEVBQWEsYUFBYSxFQUFFLG1CQUFtQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUUsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2xELE9BQU8sS0FBSyxDQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0MsT0FBTyxFQUFDLGVBQWUsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN0RixPQUFPLEVBQW1DLGFBQWEsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3BHLE9BQU8sRUFBQyxTQUFTLEVBQUUsS0FBSyxFQUFZLE1BQU0sb0JBQW9CLENBQUM7QUFDL0QsT0FBTyxFQUFDLG1CQUFtQixFQUFFLFVBQVUsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMxRCxPQUFPLEVBQUMsY0FBYyxFQUFzQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBR3pHLE9BQU8sRUFBQyxjQUFjLEVBQXNDLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFekcsT0FBTyxFQUFDLGdCQUFnQixFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRixPQUFPLEtBQUssYUFBYSxNQUFNLHdCQUF3QixDQUFDO0FBQ3hELE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRzdFOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQ2pDLENBQVMsRUFBRSxVQUFzQjtJQUNuQywyQ0FBMkM7SUFDM0MsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ2YsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLElBQUksVUFBVSxLQUFLLGVBQWUsRUFBRTtZQUNsQyxPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLGdCQUFnQjtTQUN6RDthQUFNO1lBQ0wsT0FBTyxDQUFDLENBQUM7U0FDVjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQ2pDLENBQVMsRUFBRSxVQUFzQjtJQUNuQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDZixlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUIsSUFBSSxVQUFVLEtBQUssZUFBZSxFQUFFO1lBQ2xDLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLGtCQUFrQjtTQUM5RDthQUFNO1lBQ0wsT0FBTyxDQUFDLENBQUM7U0FDVjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQzFCLENBQVMsRUFBRSxNQUFjLEVBQUUsSUFBWSxFQUFFLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLE9BQU8sRUFDdkUsVUFBdUIsRUFBRSxZQUFZLEdBQUcsQ0FBQztJQUMzQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDZixJQUFJLFVBQVUsSUFBSSxJQUFJLEVBQUU7WUFDdEIsVUFBVSxHQUFHLGVBQWUsRUFBRSxDQUFDO1NBQ2hDO1FBQ0QsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLHlDQUF5QztRQUN6QyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4QixNQUFNLElBQUksVUFBVSxDQUNoQiw4REFBOEQ7Z0JBQzlELEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLFdBQVcsQ0FBQyxDQUFDO1NBQ25DO1FBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDN0IsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsZ0VBQWdFO2dCQUNoRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxVQUFVLENBQUMsQ0FBQztTQUN2QztRQUNELElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDM0MsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsOERBQThEO2dCQUM5RCxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxVQUFVLENBQUMsQ0FBQztTQUNyQztRQUNELDJDQUEyQztRQUMzQyxJQUFJLFVBQVUsS0FBSyxlQUFlLEVBQUU7WUFDbEMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsY0FBYztTQUNqRDtRQUNELElBQUksT0FBTyxLQUFLLFFBQVEsRUFBRTtZQUN4QixNQUFNLElBQUksbUJBQW1CLENBQ3pCLCtEQUErRDtnQkFDL0Qsa0JBQWtCLENBQUMsQ0FBQztTQUN6QjtRQUNELElBQUksQ0FBQyxHQUFXLEdBQUcsQ0FBQyxNQUFNLENBQ3RCLENBQXdCLEVBQUUsTUFBa0IsRUFBRSxPQUFPLEVBQ3JELE9BQU8sS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoRSxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDaEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQ2xCLENBQVMsRUFBRSxNQUFjLEVBQUUsT0FBTyxHQUFHLENBQUMsRUFBRSxPQUFPLEdBQUcsT0FBTyxFQUN6RCxVQUF1QixFQUFFLFlBQVksR0FBRyxDQUFDO0lBQzNDLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNmLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QixPQUFPLGNBQWMsQ0FDakIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FDbEIsQ0FBUyxFQUFFLE1BQWMsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxHQUFHLE9BQU8sRUFDOUQsVUFBdUIsRUFBRSxZQUErQjtJQUMxRCxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDZixlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUIsT0FBTyx3QkFBd0IsQ0FDM0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSx3QkFBd0IsQ0FDcEMsQ0FBUyxFQUFFLE1BQWMsRUFBRSxJQUFZLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6RCxPQUFPLEdBQUcsT0FBTyxFQUFFLFVBQXVCLEVBQUUsWUFBK0IsRUFDM0UsYUFBK0IsSUFBSTtJQUNyQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDZixJQUFJLFVBQVUsSUFBSSxJQUFJLEVBQUU7WUFDdEIsVUFBVSxHQUFHLGVBQWUsRUFBRSxDQUFDO1NBQ2hDO1FBQ0QsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7WUFDaEMsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsK0RBQStEO2dCQUMvRCxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7U0FDaEM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQzFDLE1BQU0sSUFBSSxVQUFVLENBQ2hCLGdFQUFnRTtnQkFDaEUsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1NBQ2hDO1FBQ0QsSUFBSSxDQUFDLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLElBQUksT0FBTyxLQUFLLFFBQVEsRUFBRTtZQUN4QixNQUFNLElBQUksbUJBQW1CLENBQ3pCLCtEQUErRDtnQkFDL0Qsa0JBQWtCLENBQUMsQ0FBQztTQUN6QjtRQUNELENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUNuQixDQUFDLEVBQUUsQ0FBd0I7WUFDM0IsTUFBTSxFQUFFLE1BQWtCO1lBQzFCLE9BQU8sRUFBRSxPQUEyQjtZQUNwQyxHQUFHLEVBQUUsT0FBTyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPO1lBQzFDLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFVBQVUsRUFBRSxNQUFNO1lBQ2xCLElBQUk7WUFDSixVQUFVO1NBQ1gsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxVQUFVLEtBQUssZUFBZSxFQUFFO1lBQ2xDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDcEM7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQ2xCLENBQVMsRUFBRSxNQUFjLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEdBQUcsT0FBTyxFQUNqRSxVQUF1QixFQUFFLFlBQXVDO0lBQ2xFLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNmLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QixPQUFPLGNBQWMsQ0FDakIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQzFCLENBQVMsRUFBRSxNQUFjLEVBQUUsSUFBWSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzVELE9BQU8sR0FBRyxPQUFPLEVBQUUsVUFBdUIsRUFDMUMsWUFBdUM7SUFDekMsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ2YsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLFVBQVUsR0FBRyxlQUFlLEVBQUUsQ0FBQztTQUNoQztRQUNELGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQ2hDLE1BQU0sSUFBSSxVQUFVLENBQ2hCLGtFQUFrRTtnQkFDbEUsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztTQUNuQjtRQUNELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7WUFDMUMsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsbUVBQW1FO2dCQUNuRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO1FBQ0QsSUFBSSxDQUFDLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLElBQUksT0FBTyxLQUFLLFFBQVEsRUFBRTtZQUN4QixNQUFNLElBQUksbUJBQW1CLENBQ3pCLCtEQUErRDtnQkFDL0Qsa0JBQWtCLENBQUMsQ0FBQztTQUN6QjtRQUNELENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUNWLENBQXVDLEVBQ3ZDLE1BQWlDLEVBQUUsT0FBbUMsRUFDdEUsT0FBTyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2xFLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNoQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBZ0IsQ0FBQyxDQUFDO1NBQ3BDO1FBQ0QsSUFBSSxVQUFVLEtBQUssZUFBZSxFQUFFO1lBQ2xDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDO1FBQ0QsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE4R0Q7O0dBRUc7QUFDSCxNQUFNLE9BQWdCLFFBQVMsU0FBUSxLQUFLO0lBd0IxQyxZQUFZLElBQVksRUFBRSxJQUF1QjtRQUMvQyxLQUFLLENBQUMsSUFBaUIsQ0FBQyxDQUFDO1FBTmpCLFNBQUksR0FBa0IsSUFBSSxDQUFDO1FBRTVCLCtCQUEwQixHQUEwQixjQUFjLENBQUM7UUFDbkUsNkJBQXdCLEdBQTBCLE9BQU8sQ0FBQztRQUlqRSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7WUFDekQsTUFBTSxJQUFJLG1CQUFtQixDQUN6QixxREFDSSxJQUFJLENBQUMsSUFBSSxPQUFPO2dCQUNwQixzQkFBc0IsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQ3pCLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM3RCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLFVBQVU7WUFDWCxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQy9ELGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUMxRCxJQUFJLENBQUMsZUFBZTtZQUNoQixjQUFjLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFlBQVksR0FBRyxjQUFjLENBQzlCLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUN2RCxjQUFjLENBQUMsQ0FBQztRQUNwQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQztZQUNmLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDeEUsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsK0RBQStEO2dCQUMvRCxtQ0FBbUM7Z0JBQ25DLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzdDO2FBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtZQUMxQixJQUFJLE9BQU8sSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLEVBQUU7Z0JBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUM1RDtpQkFBTSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDekMsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsK0RBQStEO29CQUMvRCw2QkFBNkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZFO1NBQ0Y7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQzFCLElBQUksT0FBTyxJQUFJLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRTtnQkFDekMsSUFBSSxDQUFDLFlBQVk7b0JBQ2IsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQy9EO2lCQUFNLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN6QyxNQUFNLElBQUksVUFBVSxDQUNoQixpRUFBaUU7b0JBQ2pFLDZCQUE2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdkU7U0FDRjtJQUNILENBQUM7SUFFUyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQXVCO1FBQ2pELDBDQUEwQztRQUMxQyxhQUFhLENBQUMsTUFBTSxDQUNoQixZQUFZLElBQUksSUFBSSxFQUFFLHlDQUF5QyxDQUFDLENBQUM7UUFDckUsSUFBSSxPQUFPLElBQUksQ0FBQyxVQUFVLEtBQUssUUFBUTtZQUNuQyxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FDbEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3hDLE1BQU0sSUFBSSxVQUFVLENBQ2hCLG1FQUFtRTtnQkFDbkUsbUNBQ0ksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzdDO0lBQ0gsQ0FBQztJQUVRLFNBQVM7UUFDaEIsTUFBTSxNQUFNLEdBQTZCO1lBQ3ZDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsVUFBVSxFQUFFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEQsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQzNELGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQzNELG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztZQUNuRSxjQUFjLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztTQUN6RCxDQUFDO1FBQ0YsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsSUFBSyxTQUFRLFFBQVE7SUFjekMsWUFBWSxJQUFZLEVBQUUsSUFBbUI7UUFDM0MsS0FBSyxDQUFDLElBQUksRUFBRSxJQUF5QixDQUFDLENBQUM7UUFaL0IsV0FBTSxHQUFrQixJQUFJLENBQUM7UUFhckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsYUFBYSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGNBQWMsQ0FDbkMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRVEsS0FBSyxDQUFDLFVBQXlCO1FBQ3RDLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxNQUFNLFdBQVcsR0FDYixJQUFJLENBQUMsVUFBVSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNwRSxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDbkMsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsd0RBQXdEO2dCQUN4RCxTQUFTLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDekM7UUFDRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFekMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFckUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QixRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQ25ELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDekQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEIsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsZUFBZSxFQUNsRCxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDdEQ7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUMsRUFBQyxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDcEIsQ0FBQztJQUVRLElBQUksQ0FBQyxNQUF1QixFQUFFLE1BQWM7UUFDbkQsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ2YsTUFBTSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLElBQUksT0FBZSxDQUFDO1lBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUQsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsMEJBQTBCLENBQ2hFLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUVwQyxJQUFJLG1CQUFtQixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDbEQsT0FBTyxHQUFHLHdCQUF3QixDQUM5QixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUNqRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFnQyxFQUN0RCxtQkFBbUIsQ0FBQyxDQUFDO2FBQzFCO2lCQUFNO2dCQUNMLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7b0JBQ25CLE9BQU8sR0FBRyxjQUFjLENBQ3BCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUN0RCxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUMxRDtxQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO29CQUMxQixzQ0FBc0M7b0JBQ3RDLE9BQU8sR0FBRyx3QkFBd0IsQ0FDOUIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFDakUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBZ0MsQ0FBQyxDQUFDO2lCQUM3RDtxQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO29CQUMxQixPQUFPLEdBQUcsY0FBYyxDQUNwQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUNqRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUF3QyxDQUFDLENBQUM7aUJBQ3JFO3FCQUFNO29CQUNMLE1BQU0sSUFBSSxtQkFBbUIsQ0FDekIsdURBQXVELENBQUMsQ0FBQztpQkFDOUQ7Z0JBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksRUFBRTtvQkFDM0IsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUMxQzthQUNGO1lBRUQsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVEsa0JBQWtCLENBQUMsVUFBeUI7UUFDbkQsVUFBVSxHQUFHLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQztZQUNoRCxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNyQyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FDM0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUMzRCxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZCO1FBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssY0FBYyxFQUFFO1lBQ3RDLFdBQVcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2hDO2FBQU07WUFDTCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQixXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM1QztRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFUSxTQUFTO1FBQ2hCLE1BQU0sTUFBTSxHQUFHO1lBQ2IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUMvRCxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDL0QsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1NBQzdELENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVTLE1BQU0sQ0FBVSxVQUFVLENBQUMsSUFBbUI7UUFDdEQsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssUUFBUTtZQUN4RCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsRUFBRTtZQUNwQixNQUFNLElBQUksVUFBVSxDQUNoQixpRUFBaUU7Z0JBQ2pFLFdBQVcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQztDQUNGO0FBRUQsTUFBYSxNQUFPLFNBQVEsSUFBSTtJQUc5QixZQUFZLElBQW1CO1FBQzdCLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDZixNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFUSxTQUFTO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRVMsTUFBTSxDQUFVLFVBQVUsQ0FBQyxJQUFtQjtRQUN0RCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUM7WUFDckMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQ2xDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUN4QyxNQUFNLElBQUksVUFBVSxDQUNoQixpRUFBaUU7Z0JBQ2pFLCtCQUErQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEU7SUFDSCxDQUFDOztBQXRCRCxrQkFBa0I7QUFDWCxnQkFBUyxHQUFHLFFBQVEsQ0FBQztTQUZqQixNQUFNO0FBeUJuQixhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXBDLE1BQWEsTUFBTyxTQUFRLElBQUk7SUFHOUIsWUFBWSxJQUFtQjtRQUM3QixLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2YsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEIsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVTLE1BQU0sQ0FBVSxVQUFVLENBQUMsSUFBbUI7UUFDdEQsMERBQTBEO1FBQzFELElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRTtZQUN2QyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQzlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3JFLE1BQU0sSUFBSSxVQUFVLENBQ2hCLGtEQUFrRDtvQkFDbEQsMkNBQ0ksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzdDO1NBQ0Y7SUFDSCxDQUFDOztBQXhCRCxrQkFBa0I7QUFDWCxnQkFBUyxHQUFHLFFBQVEsQ0FBQztTQUZqQixNQUFNO0FBMkJuQixhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXBDLE1BQWEsZUFBZ0IsU0FBUSxNQUFNO0lBSXpDLFlBQVksSUFBbUI7UUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUU1QyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUFFO1lBQ3ZELE1BQU0sSUFBSSxVQUFVLENBQ2hCLCtEQUErRDtnQkFDL0QsMENBQTBDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1NBQy9EO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxVQUF5QjtRQUN0QyxVQUFVLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMzQixNQUFNLElBQUksVUFBVSxDQUNoQixrREFBa0Q7Z0JBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztTQUNqQztRQUVELE1BQU0sV0FBVyxHQUNiLElBQUksQ0FBQyxVQUFVLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3BFLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRTtZQUNuQyxNQUFNLElBQUksVUFBVSxDQUNoQix5REFBeUQ7Z0JBQ3pELGVBQWUsQ0FBQyxDQUFDO1NBQ3RCO1FBQ0QsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXJFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDeEIsUUFBUSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUN4RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3pELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RCLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFDdkQsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ3REO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxTQUFTO1lBQ1YsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNwQixDQUFDO0lBRVEsSUFBSSxDQUFDLE1BQXVCLEVBQUUsTUFBYztRQUNuRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ25CLElBQUksS0FBSyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUM1QixNQUFNLElBQUksVUFBVSxDQUNoQixnRUFBZ0U7b0JBQ2hFLDZCQUE2QixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDeEQ7WUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQy9CLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQyxJQUFJLEtBQWEsQ0FBQztZQUNsQixJQUFJLEtBQWEsQ0FBQztZQUNsQixJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssZUFBZSxFQUFFO2dCQUN2QyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLEtBQUssR0FBRyxDQUFDLENBQUM7YUFDWDtpQkFBTTtnQkFDTCxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLEtBQUssR0FBRyxDQUFDLENBQUM7YUFDWDtZQUVELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQyxrQ0FBa0M7WUFDbEMsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2RSxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXJFLGlFQUFpRTtZQUNqRSxVQUFVO1lBQ1YsaUVBQWlFO1lBQ2pFLDBCQUEwQjtZQUMxQixNQUFNLFdBQVcsR0FDYixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVuRCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssY0FBYyxFQUFFO2dCQUN0QyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVDO1lBQ0QsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FDN0IsS0FBaUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBYyxFQUFFLFdBQVcsRUFDOUQsSUFBSSxDQUFDLE9BQTJCLEVBQUUsSUFBSSxDQUFDLE9BQTJCLENBQUMsQ0FBQztZQUN4RSxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssY0FBYyxFQUFFO2dCQUN0QyxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hEO1lBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDckIsT0FBTztvQkFDSCxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQWEsQ0FBQzthQUN2RTtZQUNELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLEVBQUU7Z0JBQzNCLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWEsQ0FBQzthQUN0RDtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLGtCQUFrQixDQUFDLFVBQXlCO1FBQ25ELFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFdkMsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUksVUFBa0IsQ0FBQztRQUN2QixJQUFJLFNBQWlCLENBQUM7UUFDdEIsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLGVBQWUsRUFBRTtZQUN2QyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDZixTQUFTLEdBQUcsQ0FBQyxDQUFDO1NBQ2Y7YUFBTTtZQUNMLFdBQVcsR0FBRyxDQUFDLENBQUM7WUFDaEIsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNmLFNBQVMsR0FBRyxDQUFDLENBQUM7U0FDZjtRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDeEMsV0FBVyxDQUFDLFVBQVUsQ0FBQztZQUNuQixZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFFLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFDbEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6RSxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakMsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUIsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQzs7QUEvSUQsa0JBQWtCO0FBQ0YseUJBQVMsR0FBRyxpQkFBaUIsQ0FBQztTQUZuQyxlQUFlO0FBa0o1QixhQUFhLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRTdDLE1BQWEsZUFBZ0IsU0FBUSxNQUFNO0lBSXpDLFlBQVksSUFBbUI7UUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUU1QyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUFFO1lBQ3ZELE1BQU0sSUFBSSxVQUFVLENBQ2hCLCtEQUErRDtnQkFDL0QsMENBQTBDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1NBQy9EO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxVQUF5QjtRQUN0QyxVQUFVLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMzQixNQUFNLElBQUksVUFBVSxDQUNoQixrREFBa0Q7Z0JBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztTQUNqQztRQUVELE1BQU0sV0FBVyxHQUNiLElBQUksQ0FBQyxVQUFVLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3BFLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRTtZQUNuQyxNQUFNLElBQUksVUFBVSxDQUNoQix5REFBeUQ7Z0JBQ3pELGVBQWUsQ0FBQyxDQUFDO1NBQ3RCO1FBQ0QsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXJFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDeEIsUUFBUSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUN4RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3pELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RCLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFDdkQsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ3REO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxTQUFTO1lBQ1YsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNwQixDQUFDO0lBRVEsSUFBSSxDQUFDLE1BQXVCLEVBQUUsTUFBYztRQUNuRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQWUsR0FBRyxFQUFFO1lBQ2pDLElBQUksS0FBSyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUM1QixNQUFNLElBQUksVUFBVSxDQUNoQixnRUFBZ0U7b0JBQ2hFLDZCQUE2QixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDeEQ7WUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQy9CLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQyxJQUFJLEtBQWEsQ0FBQztZQUNsQixJQUFJLEtBQWEsQ0FBQztZQUNsQixJQUFJLEtBQWEsQ0FBQztZQUVsQixJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssZUFBZSxFQUFFO2dCQUN2QyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLENBQUMsQ0FBQzthQUNYO2lCQUFNO2dCQUNMLEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFDVixLQUFLLEdBQUcsQ0FBQyxDQUFDO2FBQ1g7WUFFRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQyxrQ0FBa0M7WUFDbEMsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFckUsNkRBQTZEO1lBQzdELE1BQU0sV0FBVyxHQUNiLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3RCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssY0FBYyxFQUFFO2dCQUN0QyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMvQztZQUNELElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQzdCLEtBQWlCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQWMsRUFBRSxXQUFXLEVBQzlELElBQUksQ0FBQyxPQUFtQyxFQUN4QyxJQUFJLENBQUMsT0FBMkIsQ0FBQyxDQUFDO1lBQ3RDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxjQUFjLEVBQUU7Z0JBQ3RDLE9BQU8sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1lBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDdEIsT0FBTztvQkFDSCxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQWEsQ0FBQzthQUN2RTtZQUNELElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQzVCLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWEsQ0FBQzthQUN0RDtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLGtCQUFrQixDQUFDLFVBQXlCO1FBQ25ELFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFdkMsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUksU0FBaUIsQ0FBQztRQUN0QixJQUFJLFVBQWtCLENBQUM7UUFDdkIsSUFBSSxTQUFpQixDQUFDO1FBQ3RCLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxlQUFlLEVBQUU7WUFDdkMsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUNoQixTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNmLFNBQVMsR0FBRyxDQUFDLENBQUM7U0FDZjthQUFNO1lBQ0wsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUNoQixTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNmLFNBQVMsR0FBRyxDQUFDLENBQUM7U0FDZjtRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhDLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3hDLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFDbEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6RSxXQUFXLENBQUMsVUFBVSxDQUFDO1lBQ25CLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUUsV0FBVyxDQUFDLFNBQVMsQ0FBQztZQUNsQixZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFUSxTQUFTO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQyxPQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM5QixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDOztBQTNKRCxrQkFBa0I7QUFDRix5QkFBUyxHQUFHLGlCQUFpQixDQUFDO1NBRm5DLGVBQWU7QUE4SjVCLGFBQWEsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7QUEwQzdDLE1BQWEsYUFBYyxTQUFRLElBQUk7SUFxQnJDLFlBQVksSUFBWSxFQUFFLE1BQStCO1FBQ3ZELEtBQUssQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFUYixrQ0FBNkIsR0FDbEMsZUFBZSxDQUFDO1FBQ1gsa0NBQTZCLEdBQ2xDLGVBQWUsQ0FBQztRQUVWLG9CQUFlLEdBQWtCLElBQUksQ0FBQztRQUN0QyxvQkFBZSxHQUFrQixJQUFJLENBQUM7UUFLOUMsSUFBSSxNQUFNLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUMxQixNQUFNLElBQUksVUFBVSxDQUNoQixrRUFBa0U7Z0JBQ2xFLHFCQUFxQixDQUFDLENBQUM7U0FDNUI7UUFDRCxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLGlCQUFpQixJQUFJLElBQUk7WUFDcEUsTUFBTSxDQUFDLGdCQUFnQixJQUFJLElBQUksRUFBRTtZQUNuQyxNQUFNLElBQUksVUFBVSxDQUNoQixtRUFBbUU7Z0JBQ25FLDZEQUE2RDtnQkFDN0QsbUVBQW1FO2dCQUNuRSx1REFBdUQsQ0FBQyxDQUFDO1NBQzlEO1FBQ0QsSUFBSSxNQUFNLENBQUMsT0FBTyxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLE1BQU07WUFDbkQsTUFBTSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUU7WUFDOUIsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLGlDQUFpQztnQkFDMUQsb0NBQW9DLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUMzRTtRQUVELElBQUksQ0FBQyxlQUFlO1lBQ2hCLE1BQU0sQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7UUFDaEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGNBQWMsQ0FDdEMsTUFBTSxDQUFDLG9CQUFvQixJQUFJLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsY0FBYyxDQUN0QyxNQUFNLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFUSxLQUFLLENBQUMsVUFBeUI7UUFDdEMsVUFBVSxHQUFHLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVDLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtZQUNyQyxNQUFNLElBQUksVUFBVSxDQUNoQiwwQkFBMEIsSUFBSSxDQUFDLElBQUkscUJBQXFCO2dCQUN4RCxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyw4QkFBOEI7Z0JBQzlDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDdEM7UUFDRCxNQUFNLFdBQVcsR0FDYixJQUFJLENBQUMsVUFBVSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNwRSxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsRSxNQUFNLElBQUksVUFBVSxDQUNoQix5REFBeUQ7Z0JBQ3pELGFBQWEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDN0Q7UUFFRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekMsTUFBTSxvQkFBb0IsR0FDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUM7UUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDbEMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzlCO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV6RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNqQyxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxTQUFTLEVBQ25ELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxFQUMvRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pDLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLFNBQVMsRUFDbkQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQy9ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzlCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RCLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFDdkQsSUFBSSxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQzNEO2FBQU07WUFDTCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUNsQjtRQUVELElBQUksQ0FBQyxTQUFTO1lBQ1YsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsRUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLENBQUM7SUFFUSxJQUFJLENBQUMsTUFBdUIsRUFBRSxNQUFjO1FBQ25ELE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNmLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVyQyxJQUFJLE1BQWMsQ0FBQztZQUNuQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNuQixNQUFNLElBQUksbUJBQW1CLENBQ3pCLGtEQUFrRCxDQUFDLENBQUM7YUFDekQ7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLGVBQWUsRUFBRTtvQkFDdkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLGdCQUFnQjtpQkFDaEU7Z0JBRUQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQ3hCLE1BQWtCLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQWMsRUFDM0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQWMsRUFDdkMsSUFBSSxDQUFDLE9BQTJCLEVBQUUsSUFBSSxDQUFDLE9BQTJCLEVBQ2xFLElBQUksQ0FBQyxZQUFnQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ3BEO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNoQixNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDL0Q7WUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxFQUFFO2dCQUMzQixNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDeEM7WUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssZUFBZSxFQUFFO2dCQUN2QyxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsZ0JBQWdCO2FBQ2hFO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEIsT0FBTyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNuQyxPQUFPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLHNCQUFzQixDQUFDO1lBQzFCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQztZQUMxQixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsc0JBQXNCLENBQUM7WUFDMUIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLHNCQUFzQixDQUFDO1lBQzFCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQztZQUN6QixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMscUJBQXFCLENBQUM7WUFDekIsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDbEQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQzs7QUEzSkQsa0JBQWtCO0FBQ1gsdUJBQVMsR0FBRyxlQUFlLEFBQWxCLENBQW1CO1NBRnhCLGFBQWE7QUErSjFCLE1BQWEsZUFBZ0IsU0FBUSxhQUFhO0lBR2hELFlBQVksSUFBNkI7UUFDdkMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqQixDQUFDOztBQUpELGtCQUFrQjtBQUNGLHlCQUFTLEdBQUcsaUJBQWlCLENBQUM7U0FGbkMsZUFBZTtBQU81QixhQUFhLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRTdDLE1BQWEsTUFBTyxTQUFRLElBQUk7SUFHOUIsWUFBWSxJQUFtQjtRQUM3QixLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2YsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEIsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDNUIsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVTLE1BQU0sQ0FBVSxVQUFVLENBQUMsSUFBbUI7UUFDdEQsMERBQTBEO1FBQzFELElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVE7WUFDbkMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQ2xDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUN4QyxNQUFNLElBQUksVUFBVSxDQUNoQixpRUFBaUU7Z0JBQ2pFLDBCQUEwQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkU7SUFDSCxDQUFDOztBQXhCRCxrQkFBa0I7QUFDWCxnQkFBUyxHQUFHLFFBQVEsQ0FBQztTQUZqQixNQUFNO0FBMkJuQixhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBZ0NwQyxNQUFhLFVBQVcsU0FBUSxLQUFLO0lBTW5DLFlBQVksSUFBeUI7UUFDbkMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxRQUFRO2dCQUNULENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7U0FDdEU7YUFBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7WUFDL0MsSUFBSSxDQUFDLFFBQVEsR0FBRztnQkFDZCxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFXLENBQUM7YUFDekQsQ0FBQztTQUNIO2FBQU07WUFDTCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFnRCxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxDQUFDLFVBQVU7WUFDWCxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3JFLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFUSxrQkFBa0IsQ0FBQyxVQUFpQjtRQUMzQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssZUFBZSxFQUFFO1lBQ3ZDLE9BQU87Z0JBQ0wsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMxRCxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU87Z0JBQ0wsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDYixVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekQsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO2FBQ3pFLENBQUM7U0FDSDtJQUNILENBQUM7SUFFUSxJQUFJLENBQUMsTUFBdUIsRUFBRSxNQUFjO1FBQ25ELE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNmLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVyQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssY0FBYyxFQUFFO2dCQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsY0FBYyxDQUM1QixNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDM0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FDbkIsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3JFO2lCQUFNO2dCQUNMLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQzVCLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMzQixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEUsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUNuQixPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDckU7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUSxTQUFTO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUMsQ0FBQztRQUN0RSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7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LEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUN0RDtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLFNBQVM7UUFDaEIsTUFBTSxNQUFNLEdBQUc7WUFDWCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1NBQ3BDLENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQzs7QUFsRUQsa0JBQWtCO0FBQ1gsc0JBQVMsR0FBRyxjQUFjLEFBQWpCLENBQWtCO1NBRnZCLFlBQVk7QUFxRXpCLGFBQWEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgb3IgYXRcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqIFRlbnNvckZsb3cuanMgTGF5ZXJzOiBDb252b2x1dGlvbmFsIExheWVyc1xuICovXG5cbmltcG9ydCAqIGFzIHRmYyBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuaW1wb3J0IHtmdXNlZCwgc2VyaWFsaXphdGlvbiwgVGVuc29yLCBUZW5zb3IxRCwgVGVuc29yMkQsIFRlbnNvcjNELCBUZW5zb3I0RCwgVGVuc29yNUQsIHRpZHl9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7QWN0aXZhdGlvbiwgZ2V0QWN0aXZhdGlvbiwgc2VyaWFsaXplQWN0aXZhdGlvbn0gZnJvbSAnLi4vYWN0aXZhdGlvbnMnO1xuaW1wb3J0IHtpbWFnZURhdGFGb3JtYXR9IGZyb20gJy4uL2JhY2tlbmQvY29tbW9uJztcbmltcG9ydCAqIGFzIEsgZnJvbSAnLi4vYmFja2VuZC90ZmpzX2JhY2tlbmQnO1xuaW1wb3J0IHtjaGVja0RhdGFGb3JtYXQsIGNoZWNrSW50ZXJwb2xhdGlvbkZvcm1hdCwgY2hlY2tQYWRkaW5nTW9kZX0gZnJvbSAnLi4vY29tbW9uJztcbmltcG9ydCB7Q29uc3RyYWludCwgQ29uc3RyYWludElkZW50aWZpZXIsIGdldENvbnN0cmFpbnQsIHNlcmlhbGl6ZUNvbnN0cmFpbnR9IGZyb20gJy4uL2NvbnN0cmFpbnRzJztcbmltcG9ydCB7SW5wdXRTcGVjLCBMYXllciwgTGF5ZXJBcmdzfSBmcm9tICcuLi9lbmdpbmUvdG9wb2xvZ3knO1xuaW1wb3J0IHtOb3RJbXBsZW1lbnRlZEVycm9yLCBWYWx1ZUVycm9yfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHtnZXRJbml0aWFsaXplciwgSW5pdGlhbGl6ZXIsIEluaXRpYWxpemVySWRlbnRpZmllciwgc2VyaWFsaXplSW5pdGlhbGl6ZXJ9IGZyb20gJy4uL2luaXRpYWxpemVycyc7XG5pbXBvcnQge0FjdGl2YXRpb25JZGVudGlmaWVyfSBmcm9tICcuLi9rZXJhc19mb3JtYXQvYWN0aXZhdGlvbl9jb25maWcnO1xuaW1wb3J0IHtEYXRhRm9ybWF0LCBJbnRlcnBvbGF0aW9uRm9ybWF0LCBQYWRkaW5nTW9kZSwgU2hhcGV9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHtnZXRSZWd1bGFyaXplciwgUmVndWxhcml6ZXIsIFJlZ3VsYXJpemVySWRlbnRpZmllciwgc2VyaWFsaXplUmVndWxhcml6ZXJ9IGZyb20gJy4uL3JlZ3VsYXJpemVycyc7XG5pbXBvcnQge0t3YXJnc30gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtjb252T3V0cHV0TGVuZ3RoLCBkZWNvbnZMZW5ndGgsIG5vcm1hbGl6ZUFycmF5fSBmcm9tICcuLi91dGlscy9jb252X3V0aWxzJztcbmltcG9ydCAqIGFzIGdlbmVyaWNfdXRpbHMgZnJvbSAnLi4vdXRpbHMvZ2VuZXJpY191dGlscyc7XG5pbXBvcnQge2dldEV4YWN0bHlPbmVTaGFwZSwgZ2V0RXhhY3RseU9uZVRlbnNvcn0gZnJvbSAnLi4vdXRpbHMvdHlwZXNfdXRpbHMnO1xuaW1wb3J0IHtMYXllclZhcmlhYmxlfSBmcm9tICcuLi92YXJpYWJsZXMnO1xuXG4vKipcbiAqIFRyYW5zcG9zZSBhbmQgY2FzdCB0aGUgaW5wdXQgYmVmb3JlIHRoZSBjb252MmQuXG4gKiBAcGFyYW0geCBJbnB1dCBpbWFnZSB0ZW5zb3IuXG4gKiBAcGFyYW0gZGF0YUZvcm1hdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlcHJvY2Vzc0NvbnYyRElucHV0KFxuICAgIHg6IFRlbnNvciwgZGF0YUZvcm1hdDogRGF0YUZvcm1hdCk6IFRlbnNvciB7XG4gIC8vIFRPRE8oY2Fpcyk6IENhc3QgdHlwZSB0byBmbG9hdDMyIGlmIG5vdC5cbiAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgICBpZiAoZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICByZXR1cm4gdGZjLnRyYW5zcG9zZSh4LCBbMCwgMiwgMywgMV0pOyAgLy8gTkNIVyAtPiBOSFdDLlxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFRyYW5zcG9zZSBhbmQgY2FzdCB0aGUgaW5wdXQgYmVmb3JlIHRoZSBjb252M2QuXG4gKiBAcGFyYW0geCBJbnB1dCBpbWFnZSB0ZW5zb3IuXG4gKiBAcGFyYW0gZGF0YUZvcm1hdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlcHJvY2Vzc0NvbnYzRElucHV0KFxuICAgIHg6IFRlbnNvciwgZGF0YUZvcm1hdDogRGF0YUZvcm1hdCk6IFRlbnNvciB7XG4gIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICBjaGVja0RhdGFGb3JtYXQoZGF0YUZvcm1hdCk7XG4gICAgaWYgKGRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0Jykge1xuICAgICAgcmV0dXJuIHRmYy50cmFuc3Bvc2UoeCwgWzAsIDIsIDMsIDQsIDFdKTsgIC8vIE5DREhXIC0+IE5ESFdDLlxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIDFELWNvbnZvbHV0aW9uIHdpdGggYmlhcyBhZGRlZC5cbiAqXG4gKiBQb3J0aW5nIE5vdGU6IFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgZXhpc3QgaW4gdGhlIFB5dGhvbiBLZXJhcyBiYWNrZW5kLlxuICogICBJdCBpcyBleGFjdGx5IHRoZSBzYW1lIGFzIGBjb252MmRgLCBleGNlcHQgdGhlIGFkZGVkIGBiaWFzYC5cbiAqXG4gKiBAcGFyYW0geCBJbnB1dCB0ZW5zb3IsIHJhbmstMywgb2Ygc2hhcGUgYFtiYXRjaFNpemUsIHdpZHRoLCBpbkNoYW5uZWxzXWAuXG4gKiBAcGFyYW0ga2VybmVsIEtlcm5lbCwgcmFuay0zLCBvZiBzaGFwZSBgW2ZpbHRlcldpZHRoLCBpbkRlcHRoLCBvdXREZXB0aF1gLlxuICogQHBhcmFtIGJpYXMgQmlhcywgcmFuay0zLCBvZiBzaGFwZSBgW291dERlcHRoXWAuXG4gKiBAcGFyYW0gc3RyaWRlc1xuICogQHBhcmFtIHBhZGRpbmcgUGFkZGluZyBtb2RlLlxuICogQHBhcmFtIGRhdGFGb3JtYXQgRGF0YSBmb3JtYXQuXG4gKiBAcGFyYW0gZGlsYXRpb25SYXRlXG4gKiBAcmV0dXJucyBUaGUgcmVzdWx0IG9mIHRoZSAxRCBjb252b2x1dGlvbi5cbiAqIEB0aHJvd3MgVmFsdWVFcnJvciwgaWYgYHhgLCBga2VybmVsYCBvciBgYmlhc2AgaXMgbm90IG9mIHRoZSBjb3JyZWN0IHJhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252MWRXaXRoQmlhcyhcbiAgICB4OiBUZW5zb3IsIGtlcm5lbDogVGVuc29yLCBiaWFzOiBUZW5zb3IsIHN0cmlkZXMgPSAxLCBwYWRkaW5nID0gJ3ZhbGlkJyxcbiAgICBkYXRhRm9ybWF0PzogRGF0YUZvcm1hdCwgZGlsYXRpb25SYXRlID0gMSk6IFRlbnNvciB7XG4gIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICBpZiAoZGF0YUZvcm1hdCA9PSBudWxsKSB7XG4gICAgICBkYXRhRm9ybWF0ID0gaW1hZ2VEYXRhRm9ybWF0KCk7XG4gICAgfVxuICAgIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgICAvLyBDaGVjayB0aGUgcmFua3Mgb2YgeCwga2VybmVsIGFuZCBiaWFzLlxuICAgIGlmICh4LnNoYXBlLmxlbmd0aCAhPT0gMykge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYFRoZSBpbnB1dCBvZiBhIGNvbnYxZFdpdGhCaWFzIG9wZXJhdGlvbiBzaG91bGQgYmUgMywgYnV0IGlzIGAgK1xuICAgICAgICAgIGAke3guc2hhcGUubGVuZ3RofSBpbnN0ZWFkLmApO1xuICAgIH1cbiAgICBpZiAoa2VybmVsLnNoYXBlLmxlbmd0aCAhPT0gMykge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYFRoZSBrZXJuZWwgZm9yIGEgY29udjFkV2l0aEJpYXMgb3BlcmF0aW9uIHNob3VsZCBiZSAzLCBidXQgaXMgYCArXG4gICAgICAgICAgYCR7a2VybmVsLnNoYXBlLmxlbmd0aH0gaW5zdGVhZGApO1xuICAgIH1cbiAgICBpZiAoYmlhcyAhPSBudWxsICYmIGJpYXMuc2hhcGUubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgVGhlIGJpYXMgZm9yIGEgY29udjFkV2l0aEJpYXMgb3BlcmF0aW9uIHNob3VsZCBiZSAxLCBidXQgaXMgYCArXG4gICAgICAgICAgYCR7Ymlhcy5zaGFwZS5sZW5ndGh9IGluc3RlYWRgKTtcbiAgICB9XG4gICAgLy8gVE9ETyhjYWlzKTogU3VwcG9ydCBDQVVTQUwgcGFkZGluZyBtb2RlLlxuICAgIGlmIChkYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcpIHtcbiAgICAgIHggPSB0ZmMudHJhbnNwb3NlKHgsIFswLCAyLCAxXSk7ICAvLyBOQ1cgLT4gTldDLlxuICAgIH1cbiAgICBpZiAocGFkZGluZyA9PT0gJ2NhdXNhbCcpIHtcbiAgICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKFxuICAgICAgICAgICdUaGUgc3VwcG9ydCBmb3IgQ0FVU0FMIHBhZGRpbmcgbW9kZSBpbiBjb252MWRXaXRoQmlhcyBpcyBub3QgJyArXG4gICAgICAgICAgJ2ltcGxlbWVudGVkIHlldC4nKTtcbiAgICB9XG4gICAgbGV0IHk6IFRlbnNvciA9IHRmYy5jb252MWQoXG4gICAgICAgIHggYXMgVGVuc29yMkQgfCBUZW5zb3IzRCwga2VybmVsIGFzIFRlbnNvcjNELCBzdHJpZGVzLFxuICAgICAgICBwYWRkaW5nID09PSAnc2FtZScgPyAnc2FtZScgOiAndmFsaWQnLCAnTldDJywgZGlsYXRpb25SYXRlKTtcbiAgICBpZiAoYmlhcyAhPSBudWxsKSB7XG4gICAgICB5ID0gSy5iaWFzQWRkKHksIGJpYXMpO1xuICAgIH1cbiAgICByZXR1cm4geTtcbiAgfSk7XG59XG5cbi8qKlxuICogMUQtY29udm9sdXRpb24uXG4gKlxuICogQHBhcmFtIHggSW5wdXQgdGVuc29yLCByYW5rLTMsIG9mIHNoYXBlIGBbYmF0Y2hTaXplLCB3aWR0aCwgaW5DaGFubmVsc11gLlxuICogQHBhcmFtIGtlcm5lbCBLZXJuZWwsIHJhbmstMywgb2Ygc2hhcGUgYFtmaWx0ZXJXaWR0aCwgaW5EZXB0aCwgb3V0RGVwdGhdYC5zXG4gKiBAcGFyYW0gc3RyaWRlc1xuICogQHBhcmFtIHBhZGRpbmcgUGFkZGluZyBtb2RlLlxuICogQHBhcmFtIGRhdGFGb3JtYXQgRGF0YSBmb3JtYXQuXG4gKiBAcGFyYW0gZGlsYXRpb25SYXRlXG4gKiBAcmV0dXJucyBUaGUgcmVzdWx0IG9mIHRoZSAxRCBjb252b2x1dGlvbi5cbiAqIEB0aHJvd3MgVmFsdWVFcnJvciwgaWYgYHhgLCBga2VybmVsYCBvciBgYmlhc2AgaXMgbm90IG9mIHRoZSBjb3JyZWN0IHJhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252MWQoXG4gICAgeDogVGVuc29yLCBrZXJuZWw6IFRlbnNvciwgc3RyaWRlcyA9IDEsIHBhZGRpbmcgPSAndmFsaWQnLFxuICAgIGRhdGFGb3JtYXQ/OiBEYXRhRm9ybWF0LCBkaWxhdGlvblJhdGUgPSAxKTogVGVuc29yIHtcbiAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgICByZXR1cm4gY29udjFkV2l0aEJpYXMoXG4gICAgICAgIHgsIGtlcm5lbCwgbnVsbCwgc3RyaWRlcywgcGFkZGluZywgZGF0YUZvcm1hdCwgZGlsYXRpb25SYXRlKTtcbiAgfSk7XG59XG5cbi8qKlxuICogMkQgQ29udm9sdXRpb25cbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0ga2VybmVsIGtlcm5lbCBvZiB0aGUgY29udm9sdXRpb24uXG4gKiBAcGFyYW0gc3RyaWRlcyBzdHJpZGVzIGFycmF5LlxuICogQHBhcmFtIHBhZGRpbmcgcGFkZGluZyBtb2RlLiBEZWZhdWx0IHRvICd2YWxpZCcuXG4gKiBAcGFyYW0gZGF0YUZvcm1hdCBkYXRhIGZvcm1hdC4gRGVmYXVsdHMgdG8gJ2NoYW5uZWxzTGFzdCcuXG4gKiBAcGFyYW0gZGlsYXRpb25SYXRlIGRpbGF0aW9uIHJhdGUgYXJyYXkuXG4gKiBAcmV0dXJucyBSZXN1bHQgb2YgdGhlIDJEIHBvb2xpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252MmQoXG4gICAgeDogVGVuc29yLCBrZXJuZWw6IFRlbnNvciwgc3RyaWRlcyA9IFsxLCAxXSwgcGFkZGluZyA9ICd2YWxpZCcsXG4gICAgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQsIGRpbGF0aW9uUmF0ZT86IFtudW1iZXIsIG51bWJlcl0pOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIHJldHVybiBjb252MmRXaXRoQmlhc0FjdGl2YXRpb24oXG4gICAgICAgIHgsIGtlcm5lbCwgbnVsbCwgc3RyaWRlcywgcGFkZGluZywgZGF0YUZvcm1hdCwgZGlsYXRpb25SYXRlKTtcbiAgfSk7XG59XG5cbi8qKlxuICogMkQgQ29udm9sdXRpb24gd2l0aCBhbiBhZGRlZCBiaWFzIGFuZCBvcHRpb25hbCBhY3RpdmF0aW9uLlxuICogTm90ZTogVGhpcyBmdW5jdGlvbiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgUHl0aG9uIEtlcmFzIEJhY2tlbmQuIFRoaXMgZnVuY3Rpb25cbiAqIGlzIGV4YWN0bHkgdGhlIHNhbWUgYXMgYGNvbnYyZGAsIGV4Y2VwdCB0aGUgYWRkZWQgYGJpYXNgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udjJkV2l0aEJpYXNBY3RpdmF0aW9uKFxuICAgIHg6IFRlbnNvciwga2VybmVsOiBUZW5zb3IsIGJpYXM6IFRlbnNvciwgc3RyaWRlcyA9IFsxLCAxXSxcbiAgICBwYWRkaW5nID0gJ3ZhbGlkJywgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQsIGRpbGF0aW9uUmF0ZT86IFtudW1iZXIsIG51bWJlcl0sXG4gICAgYWN0aXZhdGlvbjogZnVzZWQuQWN0aXZhdGlvbiA9IG51bGwpOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgaWYgKGRhdGFGb3JtYXQgPT0gbnVsbCkge1xuICAgICAgZGF0YUZvcm1hdCA9IGltYWdlRGF0YUZvcm1hdCgpO1xuICAgIH1cbiAgICBjaGVja0RhdGFGb3JtYXQoZGF0YUZvcm1hdCk7XG4gICAgaWYgKHgucmFuayAhPT0gMyAmJiB4LnJhbmsgIT09IDQpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBjb252MmRXaXRoQmlhc0FjdGl2YXRpb24gZXhwZWN0cyBpbnB1dCB0byBiZSBvZiByYW5rIDMgb3IgNCwgYCArXG4gICAgICAgICAgYGJ1dCByZWNlaXZlZCAke3gucmFua30uYCk7XG4gICAgfVxuICAgIGlmIChrZXJuZWwucmFuayAhPT0gMyAmJiBrZXJuZWwucmFuayAhPT0gNCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYGNvbnYyZFdpdGhCaWFzQWN0aXZhdGlvbiBleHBlY3RzIGtlcm5lbCB0byBiZSBvZiByYW5rIDMgb3IgNCwgYCArXG4gICAgICAgICAgYGJ1dCByZWNlaXZlZCAke3gucmFua30uYCk7XG4gICAgfVxuICAgIGxldCB5ID0gcHJlcHJvY2Vzc0NvbnYyRElucHV0KHgsIGRhdGFGb3JtYXQpO1xuICAgIGlmIChwYWRkaW5nID09PSAnY2F1c2FsJykge1xuICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgJ1RoZSBzdXBwb3J0IGZvciBDQVVTQUwgcGFkZGluZyBtb2RlIGluIGNvbnYxZFdpdGhCaWFzIGlzIG5vdCAnICtcbiAgICAgICAgICAnaW1wbGVtZW50ZWQgeWV0LicpO1xuICAgIH1cbiAgICB5ID0gdGZjLmZ1c2VkLmNvbnYyZCh7XG4gICAgICB4OiB5IGFzIFRlbnNvcjNEIHwgVGVuc29yNEQsXG4gICAgICBmaWx0ZXI6IGtlcm5lbCBhcyBUZW5zb3I0RCxcbiAgICAgIHN0cmlkZXM6IHN0cmlkZXMgYXMgW251bWJlciwgbnVtYmVyXSxcbiAgICAgIHBhZDogcGFkZGluZyA9PT0gJ3NhbWUnID8gJ3NhbWUnIDogJ3ZhbGlkJyxcbiAgICAgIGRpbGF0aW9uczogZGlsYXRpb25SYXRlLFxuICAgICAgZGF0YUZvcm1hdDogJ05IV0MnLFxuICAgICAgYmlhcyxcbiAgICAgIGFjdGl2YXRpb25cbiAgICB9KTtcbiAgICBpZiAoZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICB5ID0gdGZjLnRyYW5zcG9zZSh5LCBbMCwgMywgMSwgMl0pO1xuICAgIH1cbiAgICByZXR1cm4geTtcbiAgfSk7XG59XG5cbi8qKlxuICogM0QgQ29udm9sdXRpb24uXG4gKiBAcGFyYW0geFxuICogQHBhcmFtIGtlcm5lbCBrZXJuZWwgb2YgdGhlIGNvbnZvbHV0aW9uLlxuICogQHBhcmFtIHN0cmlkZXMgc3RyaWRlcyBhcnJheS5cbiAqIEBwYXJhbSBwYWRkaW5nIHBhZGRpbmcgbW9kZS4gRGVmYXVsdCB0byAndmFsaWQnLlxuICogQHBhcmFtIGRhdGFGb3JtYXQgZGF0YSBmb3JtYXQuIERlZmF1bHRzIHRvICdjaGFubmVsc0xhc3QnLlxuICogQHBhcmFtIGRpbGF0aW9uUmF0ZSBkaWxhdGlvbiByYXRlIGFycmF5LlxuICogQHJldHVybnMgUmVzdWx0IG9mIHRoZSAzRCBjb252b2x1dGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnYzZChcbiAgICB4OiBUZW5zb3IsIGtlcm5lbDogVGVuc29yLCBzdHJpZGVzID0gWzEsIDEsIDFdLCBwYWRkaW5nID0gJ3ZhbGlkJyxcbiAgICBkYXRhRm9ybWF0PzogRGF0YUZvcm1hdCwgZGlsYXRpb25SYXRlPzogW251bWJlciwgbnVtYmVyLCBudW1iZXJdKTogVGVuc29yIHtcbiAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgICByZXR1cm4gY29udjNkV2l0aEJpYXMoXG4gICAgICAgIHgsIGtlcm5lbCwgbnVsbCwgc3RyaWRlcywgcGFkZGluZywgZGF0YUZvcm1hdCwgZGlsYXRpb25SYXRlKTtcbiAgfSk7XG59XG5cbi8qKlxuICogM0QgQ29udm9sdXRpb24gd2l0aCBhbiBhZGRlZCBiaWFzLlxuICogTm90ZTogVGhpcyBmdW5jdGlvbiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgUHl0aG9uIEtlcmFzIEJhY2tlbmQuIFRoaXMgZnVuY3Rpb25cbiAqIGlzIGV4YWN0bHkgdGhlIHNhbWUgYXMgYGNvbnYzZGAsIGV4Y2VwdCB0aGUgYWRkZWQgYGJpYXNgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udjNkV2l0aEJpYXMoXG4gICAgeDogVGVuc29yLCBrZXJuZWw6IFRlbnNvciwgYmlhczogVGVuc29yLCBzdHJpZGVzID0gWzEsIDEsIDFdLFxuICAgIHBhZGRpbmcgPSAndmFsaWQnLCBkYXRhRm9ybWF0PzogRGF0YUZvcm1hdCxcbiAgICBkaWxhdGlvblJhdGU/OiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgaWYgKGRhdGFGb3JtYXQgPT0gbnVsbCkge1xuICAgICAgZGF0YUZvcm1hdCA9IGltYWdlRGF0YUZvcm1hdCgpO1xuICAgIH1cbiAgICBjaGVja0RhdGFGb3JtYXQoZGF0YUZvcm1hdCk7XG4gICAgaWYgKHgucmFuayAhPT0gNCAmJiB4LnJhbmsgIT09IDUpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBjb252M2RXaXRoQmlhcyBleHBlY3RzIGlucHV0IHRvIGJlIG9mIHJhbmsgNCBvciA1LCBidXQgcmVjZWl2ZWQgYCArXG4gICAgICAgICAgYCR7eC5yYW5rfS5gKTtcbiAgICB9XG4gICAgaWYgKGtlcm5lbC5yYW5rICE9PSA0ICYmIGtlcm5lbC5yYW5rICE9PSA1KSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgY29udjNkV2l0aEJpYXMgZXhwZWN0cyBrZXJuZWwgdG8gYmUgb2YgcmFuayA0IG9yIDUsIGJ1dCByZWNlaXZlZCBgICtcbiAgICAgICAgICBgJHt4LnJhbmt9LmApO1xuICAgIH1cbiAgICBsZXQgeSA9IHByZXByb2Nlc3NDb252M0RJbnB1dCh4LCBkYXRhRm9ybWF0KTtcbiAgICBpZiAocGFkZGluZyA9PT0gJ2NhdXNhbCcpIHtcbiAgICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKFxuICAgICAgICAgICdUaGUgc3VwcG9ydCBmb3IgQ0FVU0FMIHBhZGRpbmcgbW9kZSBpbiBjb252M2RXaXRoQmlhcyBpcyBub3QgJyArXG4gICAgICAgICAgJ2ltcGxlbWVudGVkIHlldC4nKTtcbiAgICB9XG4gICAgeSA9IHRmYy5jb252M2QoXG4gICAgICAgIHkgYXMgVGVuc29yNEQgfCB0ZmMuVGVuc29yPHRmYy5SYW5rLlI1PixcbiAgICAgICAga2VybmVsIGFzIHRmYy5UZW5zb3I8dGZjLlJhbmsuUjU+LCBzdHJpZGVzIGFzIFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSxcbiAgICAgICAgcGFkZGluZyA9PT0gJ3NhbWUnID8gJ3NhbWUnIDogJ3ZhbGlkJywgJ05ESFdDJywgZGlsYXRpb25SYXRlKTtcbiAgICBpZiAoYmlhcyAhPSBudWxsKSB7XG4gICAgICB5ID0gSy5iaWFzQWRkKHksIGJpYXMgYXMgVGVuc29yMUQpO1xuICAgIH1cbiAgICBpZiAoZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICB5ID0gdGZjLnRyYW5zcG9zZSh5LCBbMCwgNCwgMSwgMiwgM10pO1xuICAgIH1cbiAgICByZXR1cm4geTtcbiAgfSk7XG59XG5cbi8qKlxuICogQmFzZSBMYXllckNvbmZpZyBmb3IgZGVwdGh3aXNlIGFuZCBub24tZGVwdGh3aXNlIGNvbnZvbHV0aW9uYWwgbGF5ZXJzLlxuICovXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQmFzZUNvbnZMYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogVGhlIGRpbWVuc2lvbnMgb2YgdGhlIGNvbnZvbHV0aW9uIHdpbmRvdy4gSWYga2VybmVsU2l6ZSBpcyBhIG51bWJlciwgdGhlXG4gICAqIGNvbnZvbHV0aW9uYWwgd2luZG93IHdpbGwgYmUgc3F1YXJlLlxuICAgKi9cbiAga2VybmVsU2l6ZTogbnVtYmVyfG51bWJlcltdO1xuXG4gIC8qKlxuICAgKiBUaGUgc3RyaWRlcyBvZiB0aGUgY29udm9sdXRpb24gaW4gZWFjaCBkaW1lbnNpb24uIElmIHN0cmlkZXMgaXMgYSBudW1iZXIsXG4gICAqIHN0cmlkZXMgaW4gYm90aCBkaW1lbnNpb25zIGFyZSBlcXVhbC5cbiAgICpcbiAgICogU3BlY2lmeWluZyBhbnkgc3RyaWRlIHZhbHVlICE9IDEgaXMgaW5jb21wYXRpYmxlIHdpdGggc3BlY2lmeWluZyBhbnlcbiAgICogYGRpbGF0aW9uUmF0ZWAgdmFsdWUgIT0gMS5cbiAgICovXG4gIHN0cmlkZXM/OiBudW1iZXJ8bnVtYmVyW107XG5cbiAgLyoqXG4gICAqIFBhZGRpbmcgbW9kZS5cbiAgICovXG4gIHBhZGRpbmc/OiBQYWRkaW5nTW9kZTtcblxuICAvKipcbiAgICogRm9ybWF0IG9mIHRoZSBkYXRhLCB3aGljaCBkZXRlcm1pbmVzIHRoZSBvcmRlcmluZyBvZiB0aGUgZGltZW5zaW9ucyBpblxuICAgKiB0aGUgaW5wdXRzLlxuICAgKlxuICAgKiBgY2hhbm5lbHNfbGFzdGAgY29ycmVzcG9uZHMgdG8gaW5wdXRzIHdpdGggc2hhcGVcbiAgICogICBgKGJhdGNoLCAuLi4sIGNoYW5uZWxzKWBcbiAgICpcbiAgICogIGBjaGFubmVsc19maXJzdGAgY29ycmVzcG9uZHMgdG8gaW5wdXRzIHdpdGggc2hhcGUgYChiYXRjaCwgY2hhbm5lbHMsXG4gICAqIC4uLilgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgY2hhbm5lbHNfbGFzdGAuXG4gICAqL1xuICBkYXRhRm9ybWF0PzogRGF0YUZvcm1hdDtcblxuICAvKipcbiAgICogVGhlIGRpbGF0aW9uIHJhdGUgdG8gdXNlIGZvciB0aGUgZGlsYXRlZCBjb252b2x1dGlvbiBpbiBlYWNoIGRpbWVuc2lvbi5cbiAgICogU2hvdWxkIGJlIGFuIGludGVnZXIgb3IgYXJyYXkgb2YgdHdvIG9yIHRocmVlIGludGVnZXJzLlxuICAgKlxuICAgKiBDdXJyZW50bHksIHNwZWNpZnlpbmcgYW55IGBkaWxhdGlvblJhdGVgIHZhbHVlICE9IDEgaXMgaW5jb21wYXRpYmxlIHdpdGhcbiAgICogc3BlY2lmeWluZyBhbnkgYHN0cmlkZXNgIHZhbHVlICE9IDEuXG4gICAqL1xuICBkaWxhdGlvblJhdGU/OiBudW1iZXJ8W251bWJlcl18W251bWJlciwgbnVtYmVyXXxbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG5cbiAgLyoqXG4gICAqIEFjdGl2YXRpb24gZnVuY3Rpb24gb2YgdGhlIGxheWVyLlxuICAgKlxuICAgKiBJZiB5b3UgZG9uJ3Qgc3BlY2lmeSB0aGUgYWN0aXZhdGlvbiwgbm9uZSBpcyBhcHBsaWVkLlxuICAgKi9cbiAgYWN0aXZhdGlvbj86IEFjdGl2YXRpb25JZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBsYXllciB1c2VzIGEgYmlhcyB2ZWN0b3IuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIHVzZUJpYXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGNvbnZvbHV0aW9uYWwga2VybmVsIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAga2VybmVsSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXJ8SW5pdGlhbGl6ZXI7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVyIGZvciB0aGUgYmlhcyB2ZWN0b3IuXG4gICAqL1xuICBiaWFzSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXJ8SW5pdGlhbGl6ZXI7XG5cbiAgLyoqXG4gICAqIENvbnN0cmFpbnQgZm9yIHRoZSBjb252b2x1dGlvbmFsIGtlcm5lbCB3ZWlnaHRzLlxuICAgKi9cbiAga2VybmVsQ29uc3RyYWludD86IENvbnN0cmFpbnRJZGVudGlmaWVyfENvbnN0cmFpbnQ7XG5cbiAgLyoqXG4gICAqIENvbnN0cmFpbnQgZm9yIHRoZSBiaWFzIHZlY3Rvci5cbiAgICovXG4gIGJpYXNDb25zdHJhaW50PzogQ29uc3RyYWludElkZW50aWZpZXJ8Q29uc3RyYWludDtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUga2VybmVsIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAga2VybmVsUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc1JlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xuXG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBhY3RpdmF0aW9uLlxuICAgKi9cbiAgYWN0aXZpdHlSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcnxSZWd1bGFyaXplcjtcbn1cblxuLyoqXG4gKiBMYXllckNvbmZpZyBmb3Igbm9uLWRlcHRod2lzZSBjb252b2x1dGlvbmFsIGxheWVycy5cbiAqIEFwcGxpZXMgdG8gbm9uLWRlcHRod2lzZSBjb252b2x1dGlvbiBvZiBhbGwgcmFua3MgKGUuZywgQ29udjFELCBDb252MkQsXG4gKiBDb252M0QpLlxuICovXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQ29udkxheWVyQXJncyBleHRlbmRzIEJhc2VDb252TGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIFRoZSBkaW1lbnNpb25hbGl0eSBvZiB0aGUgb3V0cHV0IHNwYWNlIChpLmUuIHRoZSBudW1iZXIgb2YgZmlsdGVycyBpbiB0aGVcbiAgICogY29udm9sdXRpb24pLlxuICAgKi9cbiAgZmlsdGVyczogbnVtYmVyO1xufVxuXG4vKipcbiAqIEFic3RyYWN0IGNvbnZvbHV0aW9uIGxheWVyLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZUNvbnYgZXh0ZW5kcyBMYXllciB7XG4gIHByb3RlY3RlZCByZWFkb25seSByYW5rOiBudW1iZXI7XG4gIHByb3RlY3RlZCByZWFkb25seSBrZXJuZWxTaXplOiBudW1iZXJbXTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHN0cmlkZXM6IG51bWJlcltdO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcGFkZGluZzogUGFkZGluZ01vZGU7XG4gIHByb3RlY3RlZCByZWFkb25seSBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0O1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYWN0aXZhdGlvbjogQWN0aXZhdGlvbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHVzZUJpYXM6IGJvb2xlYW47XG4gIHByb3RlY3RlZCByZWFkb25seSBkaWxhdGlvblJhdGU6IG51bWJlcltdO1xuXG4gIC8vIEJpYXMtcmVsYXRlZCBtZW1iZXJzIGFyZSBoZXJlIGJlY2F1c2UgYWxsIGNvbnZvbHV0aW9uIHN1YmNsYXNzZXMgdXNlIHRoZVxuICAvLyBzYW1lIGNvbmZpZ3VyYXRpb24gcGFybWV0ZXJzIHRvIGNvbnRyb2wgYmlhcy4gIEtlcm5lbC1yZWxhdGVkIG1lbWJlcnNcbiAgLy8gYXJlIGluIHN1YmNsYXNzIGBDb252YCBiZWNhdXNlIHNvbWUgc3ViY2xhc3NlcyB1c2UgZGlmZmVyZW50IHBhcmFtZXRlcnMgdG9cbiAgLy8gY29udHJvbCBrZXJuZWwgcHJvcGVydGllcywgZm9yIGluc3RhbmNlLCBgRGVwdGh3aXNlQ29udjJEYCB1c2VzXG4gIC8vIGBkZXB0aHdpc2VJbml0aWFsaXplcmAgaW5zdGVhZCBvZiBga2VybmVsSW5pdGlhbGl6ZXJgLlxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYmlhc0luaXRpYWxpemVyPzogSW5pdGlhbGl6ZXI7XG4gIHByb3RlY3RlZCByZWFkb25seSBiaWFzQ29uc3RyYWludD86IENvbnN0cmFpbnQ7XG4gIHByb3RlY3RlZCByZWFkb25seSBiaWFzUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcjtcblxuICBwcm90ZWN0ZWQgYmlhczogTGF5ZXJWYXJpYWJsZSA9IG51bGw7XG5cbiAgcmVhZG9ubHkgREVGQVVMVF9LRVJORUxfSU5JVElBTElaRVI6IEluaXRpYWxpemVySWRlbnRpZmllciA9ICdnbG9yb3ROb3JtYWwnO1xuICByZWFkb25seSBERUZBVUxUX0JJQVNfSU5JVElBTElaRVI6IEluaXRpYWxpemVySWRlbnRpZmllciA9ICd6ZXJvcyc7XG5cbiAgY29uc3RydWN0b3IocmFuazogbnVtYmVyLCBhcmdzOiBCYXNlQ29udkxheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MgYXMgTGF5ZXJBcmdzKTtcbiAgICBCYXNlQ29udi52ZXJpZnlBcmdzKGFyZ3MpO1xuICAgIHRoaXMucmFuayA9IHJhbms7XG4gICAgZ2VuZXJpY191dGlscy5hc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy5yYW5rLCAncmFuaycpO1xuICAgIGlmICh0aGlzLnJhbmsgIT09IDEgJiYgdGhpcy5yYW5rICE9PSAyICYmIHRoaXMucmFuayAhPT0gMykge1xuICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgYENvbnZvbHV0aW9uIGxheWVyIGZvciByYW5rIG90aGVyIHRoYW4gMSwgMiwgb3IgMyAoJHtcbiAgICAgICAgICAgICAgdGhpcy5yYW5rfSkgaXMgYCArXG4gICAgICAgICAgYG5vdCBpbXBsZW1lbnRlZCB5ZXQuYCk7XG4gICAgfVxuICAgIHRoaXMua2VybmVsU2l6ZSA9IG5vcm1hbGl6ZUFycmF5KGFyZ3Mua2VybmVsU2l6ZSwgcmFuaywgJ2tlcm5lbFNpemUnKTtcbiAgICB0aGlzLnN0cmlkZXMgPSBub3JtYWxpemVBcnJheShcbiAgICAgICAgYXJncy5zdHJpZGVzID09IG51bGwgPyAxIDogYXJncy5zdHJpZGVzLCByYW5rLCAnc3RyaWRlcycpO1xuICAgIHRoaXMucGFkZGluZyA9IGFyZ3MucGFkZGluZyA9PSBudWxsID8gJ3ZhbGlkJyA6IGFyZ3MucGFkZGluZztcbiAgICBjaGVja1BhZGRpbmdNb2RlKHRoaXMucGFkZGluZyk7XG4gICAgdGhpcy5kYXRhRm9ybWF0ID1cbiAgICAgICAgYXJncy5kYXRhRm9ybWF0ID09IG51bGwgPyAnY2hhbm5lbHNMYXN0JyA6IGFyZ3MuZGF0YUZvcm1hdDtcbiAgICBjaGVja0RhdGFGb3JtYXQodGhpcy5kYXRhRm9ybWF0KTtcbiAgICB0aGlzLmFjdGl2YXRpb24gPSBnZXRBY3RpdmF0aW9uKGFyZ3MuYWN0aXZhdGlvbik7XG4gICAgdGhpcy51c2VCaWFzID0gYXJncy51c2VCaWFzID09IG51bGwgPyB0cnVlIDogYXJncy51c2VCaWFzO1xuICAgIHRoaXMuYmlhc0luaXRpYWxpemVyID1cbiAgICAgICAgZ2V0SW5pdGlhbGl6ZXIoYXJncy5iaWFzSW5pdGlhbGl6ZXIgfHwgdGhpcy5ERUZBVUxUX0JJQVNfSU5JVElBTElaRVIpO1xuICAgIHRoaXMuYmlhc0NvbnN0cmFpbnQgPSBnZXRDb25zdHJhaW50KGFyZ3MuYmlhc0NvbnN0cmFpbnQpO1xuICAgIHRoaXMuYmlhc1JlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5iaWFzUmVndWxhcml6ZXIpO1xuICAgIHRoaXMuYWN0aXZpdHlSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MuYWN0aXZpdHlSZWd1bGFyaXplcik7XG4gICAgdGhpcy5kaWxhdGlvblJhdGUgPSBub3JtYWxpemVBcnJheShcbiAgICAgICAgYXJncy5kaWxhdGlvblJhdGUgPT0gbnVsbCA/IDEgOiBhcmdzLmRpbGF0aW9uUmF0ZSwgcmFuayxcbiAgICAgICAgJ2RpbGF0aW9uUmF0ZScpO1xuICAgIGlmICh0aGlzLnJhbmsgPT09IDEgJiZcbiAgICAgICAgKEFycmF5LmlzQXJyYXkodGhpcy5kaWxhdGlvblJhdGUpICYmIHRoaXMuZGlsYXRpb25SYXRlLmxlbmd0aCAhPT0gMSkpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBkaWxhdGlvblJhdGUgbXVzdCBiZSBhIG51bWJlciBvciBhbiBhcnJheSBvZiBhIHNpbmdsZSBudW1iZXIgYCArXG4gICAgICAgICAgYGZvciAxRCBjb252b2x1dGlvbiwgYnV0IHJlY2VpdmVkIGAgK1xuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KHRoaXMuZGlsYXRpb25SYXRlKX1gKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucmFuayA9PT0gMikge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLmRpbGF0aW9uUmF0ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhpcy5kaWxhdGlvblJhdGUgPSBbdGhpcy5kaWxhdGlvblJhdGUsIHRoaXMuZGlsYXRpb25SYXRlXTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5kaWxhdGlvblJhdGUubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYGRpbGF0aW9uUmF0ZSBtdXN0IGJlIGEgbnVtYmVyIG9yIGFycmF5IG9mIHR3byBudW1iZXJzIGZvciAyRCBgICtcbiAgICAgICAgICAgIGBjb252b2x1dGlvbiwgYnV0IHJlY2VpdmVkICR7SlNPTi5zdHJpbmdpZnkodGhpcy5kaWxhdGlvblJhdGUpfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5yYW5rID09PSAzKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuZGlsYXRpb25SYXRlID09PSAnbnVtYmVyJykge1xuICAgICAgICB0aGlzLmRpbGF0aW9uUmF0ZSA9XG4gICAgICAgICAgICBbdGhpcy5kaWxhdGlvblJhdGUsIHRoaXMuZGlsYXRpb25SYXRlLCB0aGlzLmRpbGF0aW9uUmF0ZV07XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuZGlsYXRpb25SYXRlLmxlbmd0aCAhPT0gMykge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgIGBkaWxhdGlvblJhdGUgbXVzdCBiZSBhIG51bWJlciBvciBhcnJheSBvZiB0aHJlZSBudW1iZXJzIGZvciAzRCBgICtcbiAgICAgICAgICAgIGBjb252b2x1dGlvbiwgYnV0IHJlY2VpdmVkICR7SlNPTi5zdHJpbmdpZnkodGhpcy5kaWxhdGlvblJhdGUpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBzdGF0aWMgdmVyaWZ5QXJncyhhcmdzOiBCYXNlQ29udkxheWVyQXJncykge1xuICAgIC8vIENoZWNrIGNvbmZpZy5rZXJuZWxTaXplIHR5cGUgYW5kIHNoYXBlLlxuICAgIGdlbmVyaWNfdXRpbHMuYXNzZXJ0KFxuICAgICAgICAna2VybmVsU2l6ZScgaW4gYXJncywgYHJlcXVpcmVkIGtleSAna2VybmVsU2l6ZScgbm90IGluIGNvbmZpZ2ApO1xuICAgIGlmICh0eXBlb2YgYXJncy5rZXJuZWxTaXplICE9PSAnbnVtYmVyJyAmJlxuICAgICAgICAhZ2VuZXJpY191dGlscy5jaGVja0FycmF5VHlwZUFuZExlbmd0aChcbiAgICAgICAgICAgIGFyZ3Mua2VybmVsU2l6ZSwgJ251bWJlcicsIDEsIDMpKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgQmFzZUNvbnYgZXhwZWN0cyBjb25maWcua2VybmVsU2l6ZSB0byBiZSBudW1iZXIgb3IgbnVtYmVyW10gd2l0aCBgICtcbiAgICAgICAgICBgbGVuZ3RoIDEsIDIsIG9yIDMsIGJ1dCByZWNlaXZlZCAke1xuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShhcmdzLmtlcm5lbFNpemUpfS5gKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHtcbiAgICAgIGtlcm5lbFNpemU6IHRoaXMua2VybmVsU2l6ZSxcbiAgICAgIHN0cmlkZXM6IHRoaXMuc3RyaWRlcyxcbiAgICAgIHBhZGRpbmc6IHRoaXMucGFkZGluZyxcbiAgICAgIGRhdGFGb3JtYXQ6IHRoaXMuZGF0YUZvcm1hdCxcbiAgICAgIGRpbGF0aW9uUmF0ZTogdGhpcy5kaWxhdGlvblJhdGUsXG4gICAgICBhY3RpdmF0aW9uOiBzZXJpYWxpemVBY3RpdmF0aW9uKHRoaXMuYWN0aXZhdGlvbiksXG4gICAgICB1c2VCaWFzOiB0aGlzLnVzZUJpYXMsXG4gICAgICBiaWFzSW5pdGlhbGl6ZXI6IHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMuYmlhc0luaXRpYWxpemVyKSxcbiAgICAgIGJpYXNSZWd1bGFyaXplcjogc2VyaWFsaXplUmVndWxhcml6ZXIodGhpcy5iaWFzUmVndWxhcml6ZXIpLFxuICAgICAgYWN0aXZpdHlSZWd1bGFyaXplcjogc2VyaWFsaXplUmVndWxhcml6ZXIodGhpcy5hY3Rpdml0eVJlZ3VsYXJpemVyKSxcbiAgICAgIGJpYXNDb25zdHJhaW50OiBzZXJpYWxpemVDb25zdHJhaW50KHRoaXMuYmlhc0NvbnN0cmFpbnQpXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBuRCBjb252b2x1dGlvbiBsYXllci4gIEFuY2VzdG9yIG9mIGNvbnZvbHV0aW9uIGxheWVycyB3aGljaCByZWR1Y2VcbiAqIGFjcm9zcyBjaGFubmVscywgaS5lLiwgQ29udjFEIGFuZCBDb252MkQsIGJ1dCBub3QgRGVwdGh3aXNlQ29udjJELlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29udiBleHRlbmRzIEJhc2VDb252IHtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGZpbHRlcnM6IG51bWJlcjtcblxuICBwcm90ZWN0ZWQga2VybmVsOiBMYXllclZhcmlhYmxlID0gbnVsbDtcblxuICAvLyBCaWFzLXJlbGF0ZWQgcHJvcGVydGllcyBhcmUgc3RvcmVkIGluIHRoZSBzdXBlcmNsYXNzIGBCYXNlQ29udmAgYmVjYXVzZSBhbGxcbiAgLy8gY29udm9sdXRpb24gc3ViY2xhc3NlcyB1c2UgdGhlIHNhbWUgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzIHRvIGNvbnRyb2xcbiAgLy8gYmlhcy4gS2VybmVsLXJlbGF0ZWQgcHJvcGVydGllcyBhcmUgZGVmaW5lZCBoZXJlIHJhdGhlciB0aGFuIGluIHRoZVxuICAvLyBzdXBlcmNsYXNzIGJlY2F1c2Ugc29tZSBjb252b2x1dGlvbiBzdWJjbGFzc2VzIHVzZSBkaWZmZXJlbnQgbmFtZXMgYW5kXG4gIC8vIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyBmb3IgdGhlaXIgaW50ZXJuYWwga2VybmVsIHN0YXRlLlxuICBwcm90ZWN0ZWQgcmVhZG9ubHkga2VybmVsSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGtlcm5lbENvbnN0cmFpbnQ/OiBDb25zdHJhaW50O1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkga2VybmVsUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcjtcblxuICBjb25zdHJ1Y3RvcihyYW5rOiBudW1iZXIsIGFyZ3M6IENvbnZMYXllckFyZ3MpIHtcbiAgICBzdXBlcihyYW5rLCBhcmdzIGFzIEJhc2VDb252TGF5ZXJBcmdzKTtcbiAgICBDb252LnZlcmlmeUFyZ3MoYXJncyk7XG4gICAgdGhpcy5maWx0ZXJzID0gYXJncy5maWx0ZXJzO1xuICAgIGdlbmVyaWNfdXRpbHMuYXNzZXJ0UG9zaXRpdmVJbnRlZ2VyKHRoaXMuZmlsdGVycywgJ2ZpbHRlcnMnKTtcbiAgICB0aGlzLmtlcm5lbEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoXG4gICAgICAgIGFyZ3Mua2VybmVsSW5pdGlhbGl6ZXIgfHwgdGhpcy5ERUZBVUxUX0tFUk5FTF9JTklUSUFMSVpFUik7XG4gICAgdGhpcy5rZXJuZWxDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmtlcm5lbENvbnN0cmFpbnQpO1xuICAgIHRoaXMua2VybmVsUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmtlcm5lbFJlZ3VsYXJpemVyKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuICAgIGNvbnN0IGNoYW5uZWxBeGlzID1cbiAgICAgICAgdGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcgPyAxIDogaW5wdXRTaGFwZS5sZW5ndGggLSAxO1xuICAgIGlmIChpbnB1dFNoYXBlW2NoYW5uZWxBeGlzXSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgVGhlIGNoYW5uZWwgZGltZW5zaW9uIG9mIHRoZSBpbnB1dCBzaG91bGQgYmUgZGVmaW5lZC4gYCArXG4gICAgICAgICAgYEZvdW5kICR7aW5wdXRTaGFwZVtjaGFubmVsQXhpc119YCk7XG4gICAgfVxuICAgIGNvbnN0IGlucHV0RGltID0gaW5wdXRTaGFwZVtjaGFubmVsQXhpc107XG5cbiAgICBjb25zdCBrZXJuZWxTaGFwZSA9IHRoaXMua2VybmVsU2l6ZS5jb25jYXQoW2lucHV0RGltLCB0aGlzLmZpbHRlcnNdKTtcblxuICAgIHRoaXMua2VybmVsID0gdGhpcy5hZGRXZWlnaHQoXG4gICAgICAgICdrZXJuZWwnLCBrZXJuZWxTaGFwZSwgbnVsbCwgdGhpcy5rZXJuZWxJbml0aWFsaXplcixcbiAgICAgICAgdGhpcy5rZXJuZWxSZWd1bGFyaXplciwgdHJ1ZSwgdGhpcy5rZXJuZWxDb25zdHJhaW50KTtcbiAgICBpZiAodGhpcy51c2VCaWFzKSB7XG4gICAgICB0aGlzLmJpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAnYmlhcycsIFt0aGlzLmZpbHRlcnNdLCBudWxsLCB0aGlzLmJpYXNJbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLmJpYXNSZWd1bGFyaXplciwgdHJ1ZSwgdGhpcy5iaWFzQ29uc3RyYWludCk7XG4gICAgfVxuXG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbe25kaW06IHRoaXMucmFuayArIDIsIGF4ZXM6IHtbY2hhbm5lbEF4aXNdOiBpbnB1dERpbX19XTtcbiAgICB0aGlzLmJ1aWx0ID0gdHJ1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBpbnB1dHMgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBsZXQgb3V0cHV0czogVGVuc29yO1xuICAgICAgY29uc3QgYmlhc1ZhbHVlID0gdGhpcy5iaWFzID09IG51bGwgPyBudWxsIDogdGhpcy5iaWFzLnJlYWQoKTtcbiAgICAgIGNvbnN0IGZ1c2VkQWN0aXZhdGlvbk5hbWUgPSBnZW5lcmljX3V0aWxzLm1hcEFjdGl2YXRpb25Ub0Z1c2VkS2VybmVsKFxuICAgICAgICAgIHRoaXMuYWN0aXZhdGlvbi5nZXRDbGFzc05hbWUoKSk7XG5cbiAgICAgIGlmIChmdXNlZEFjdGl2YXRpb25OYW1lICE9IG51bGwgJiYgdGhpcy5yYW5rID09PSAyKSB7XG4gICAgICAgIG91dHB1dHMgPSBjb252MmRXaXRoQmlhc0FjdGl2YXRpb24oXG4gICAgICAgICAgICBpbnB1dHMsIHRoaXMua2VybmVsLnJlYWQoKSwgYmlhc1ZhbHVlLCB0aGlzLnN0cmlkZXMsIHRoaXMucGFkZGluZyxcbiAgICAgICAgICAgIHRoaXMuZGF0YUZvcm1hdCwgdGhpcy5kaWxhdGlvblJhdGUgYXMgW251bWJlciwgbnVtYmVyXSxcbiAgICAgICAgICAgIGZ1c2VkQWN0aXZhdGlvbk5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMucmFuayA9PT0gMSkge1xuICAgICAgICAgIG91dHB1dHMgPSBjb252MWRXaXRoQmlhcyhcbiAgICAgICAgICAgICAgaW5wdXRzLCB0aGlzLmtlcm5lbC5yZWFkKCksIGJpYXNWYWx1ZSwgdGhpcy5zdHJpZGVzWzBdLFxuICAgICAgICAgICAgICB0aGlzLnBhZGRpbmcsIHRoaXMuZGF0YUZvcm1hdCwgdGhpcy5kaWxhdGlvblJhdGVbMF0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMucmFuayA9PT0gMikge1xuICAgICAgICAgIC8vIFRPRE8oY2Fpcyk6IE1vdmUgdXAgdG8gY29uc3RydWN0b3IuXG4gICAgICAgICAgb3V0cHV0cyA9IGNvbnYyZFdpdGhCaWFzQWN0aXZhdGlvbihcbiAgICAgICAgICAgICAgaW5wdXRzLCB0aGlzLmtlcm5lbC5yZWFkKCksIGJpYXNWYWx1ZSwgdGhpcy5zdHJpZGVzLCB0aGlzLnBhZGRpbmcsXG4gICAgICAgICAgICAgIHRoaXMuZGF0YUZvcm1hdCwgdGhpcy5kaWxhdGlvblJhdGUgYXMgW251bWJlciwgbnVtYmVyXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5yYW5rID09PSAzKSB7XG4gICAgICAgICAgb3V0cHV0cyA9IGNvbnYzZFdpdGhCaWFzKFxuICAgICAgICAgICAgICBpbnB1dHMsIHRoaXMua2VybmVsLnJlYWQoKSwgYmlhc1ZhbHVlLCB0aGlzLnN0cmlkZXMsIHRoaXMucGFkZGluZyxcbiAgICAgICAgICAgICAgdGhpcy5kYXRhRm9ybWF0LCB0aGlzLmRpbGF0aW9uUmF0ZSBhcyBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKFxuICAgICAgICAgICAgICAnY29udm9sdXRpb25zIGdyZWF0ZXIgdGhhbiAzRCBhcmUgbm90IGltcGxlbWVudGVkIHlldC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmFjdGl2YXRpb24gIT0gbnVsbCkge1xuICAgICAgICAgIG91dHB1dHMgPSB0aGlzLmFjdGl2YXRpb24uYXBwbHkob3V0cHV0cyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG91dHB1dHM7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgY29uc3QgbmV3U3BhY2U6IG51bWJlcltdID0gW107XG4gICAgY29uc3Qgc3BhY2UgPSAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNMYXN0JykgP1xuICAgICAgICBpbnB1dFNoYXBlLnNsaWNlKDEsIGlucHV0U2hhcGUubGVuZ3RoIC0gMSkgOlxuICAgICAgICBpbnB1dFNoYXBlLnNsaWNlKDIpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BhY2UubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IG5ld0RpbSA9IGNvbnZPdXRwdXRMZW5ndGgoXG4gICAgICAgICAgc3BhY2VbaV0sIHRoaXMua2VybmVsU2l6ZVtpXSwgdGhpcy5wYWRkaW5nLCB0aGlzLnN0cmlkZXNbaV0sXG4gICAgICAgICAgdHlwZW9mIHRoaXMuZGlsYXRpb25SYXRlID09PSAnbnVtYmVyJyA/IHRoaXMuZGlsYXRpb25SYXRlIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWxhdGlvblJhdGVbaV0pO1xuICAgICAgbmV3U3BhY2UucHVzaChuZXdEaW0pO1xuICAgIH1cblxuICAgIGxldCBvdXRwdXRTaGFwZSA9IFtpbnB1dFNoYXBlWzBdXTtcbiAgICBpZiAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNMYXN0Jykge1xuICAgICAgb3V0cHV0U2hhcGUgPSBvdXRwdXRTaGFwZS5jb25jYXQobmV3U3BhY2UpO1xuICAgICAgb3V0cHV0U2hhcGUucHVzaCh0aGlzLmZpbHRlcnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXRTaGFwZS5wdXNoKHRoaXMuZmlsdGVycyk7XG4gICAgICBvdXRwdXRTaGFwZSA9IG91dHB1dFNoYXBlLmNvbmNhdChuZXdTcGFjZSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgIGZpbHRlcnM6IHRoaXMuZmlsdGVycyxcbiAgICAgIGtlcm5lbEluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmtlcm5lbEluaXRpYWxpemVyKSxcbiAgICAgIGtlcm5lbFJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmtlcm5lbFJlZ3VsYXJpemVyKSxcbiAgICAgIGtlcm5lbENvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5rZXJuZWxDb25zdHJhaW50KVxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN0YXRpYyBvdmVycmlkZSB2ZXJpZnlBcmdzKGFyZ3M6IENvbnZMYXllckFyZ3MpIHtcbiAgICAvLyBDaGVjayBjb25maWcuZmlsdGVycyB0eXBlLCBzaGFwZSwgYW5kIHZhbHVlLlxuICAgIGlmICghKCdmaWx0ZXJzJyBpbiBhcmdzKSB8fCB0eXBlb2YgYXJncy5maWx0ZXJzICE9PSAnbnVtYmVyJyB8fFxuICAgICAgICBhcmdzLmZpbHRlcnMgPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgQ29udm9sdXRpb24gbGF5ZXIgZXhwZWN0ZWQgY29uZmlnLmZpbHRlcnMgdG8gYmUgYSAnbnVtYmVyJyA+IDAgYCArXG4gICAgICAgICAgYGJ1dCBnb3QgJHtKU09OLnN0cmluZ2lmeShhcmdzLmZpbHRlcnMpfWApO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ29udjJEIGV4dGVuZHMgQ29udiB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0NvbnYyRCc7XG4gIGNvbnN0cnVjdG9yKGFyZ3M6IENvbnZMYXllckFyZ3MpIHtcbiAgICBzdXBlcigyLCBhcmdzKTtcbiAgICBDb252MkQudmVyaWZ5QXJncyhhcmdzKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGRlbGV0ZSBjb25maWdbJ3JhbmsnXTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN0YXRpYyBvdmVycmlkZSB2ZXJpZnlBcmdzKGFyZ3M6IENvbnZMYXllckFyZ3MpIHtcbiAgICAvLyBjb25maWcua2VybmVsU2l6ZSBtdXN0IGJlIGEgbnVtYmVyIG9yIGFycmF5IG9mIG51bWJlcnMuXG4gICAgaWYgKCh0eXBlb2YgYXJncy5rZXJuZWxTaXplICE9PSAnbnVtYmVyJykgJiZcbiAgICAgICAgIWdlbmVyaWNfdXRpbHMuY2hlY2tBcnJheVR5cGVBbmRMZW5ndGgoXG4gICAgICAgICAgICBhcmdzLmtlcm5lbFNpemUsICdudW1iZXInLCAxLCAyKSkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYENvbnYyRCBleHBlY3RzIGNvbmZpZy5rZXJuZWxTaXplIHRvIGJlIG51bWJlciBvciBudW1iZXJbXSB3aXRoIGAgK1xuICAgICAgICAgIGBsZW5ndGggMSBvciAyLCBidXQgcmVjZWl2ZWQgJHtKU09OLnN0cmluZ2lmeShhcmdzLmtlcm5lbFNpemUpfS5gKTtcbiAgICB9XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDb252MkQpO1xuXG5leHBvcnQgY2xhc3MgQ29udjNEIGV4dGVuZHMgQ29udiB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0NvbnYzRCc7XG4gIGNvbnN0cnVjdG9yKGFyZ3M6IENvbnZMYXllckFyZ3MpIHtcbiAgICBzdXBlcigzLCBhcmdzKTtcbiAgICBDb252M0QudmVyaWZ5QXJncyhhcmdzKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGRlbGV0ZSBjb25maWdbJ3JhbmsnXTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN0YXRpYyBvdmVycmlkZSB2ZXJpZnlBcmdzKGFyZ3M6IENvbnZMYXllckFyZ3MpIHtcbiAgICAvLyBjb25maWcua2VybmVsU2l6ZSBtdXN0IGJlIGEgbnVtYmVyIG9yIGFycmF5IG9mIG51bWJlcnMuXG4gICAgaWYgKHR5cGVvZiBhcmdzLmtlcm5lbFNpemUgIT09ICdudW1iZXInKSB7XG4gICAgICBpZiAoIShBcnJheS5pc0FycmF5KGFyZ3Mua2VybmVsU2l6ZSkgJiZcbiAgICAgICAgICAgIChhcmdzLmtlcm5lbFNpemUubGVuZ3RoID09PSAxIHx8IGFyZ3Mua2VybmVsU2l6ZS5sZW5ndGggPT09IDMpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgIGBDb252M0QgZXhwZWN0cyBjb25maWcua2VybmVsU2l6ZSB0byBiZSBudW1iZXIgb3JgICtcbiAgICAgICAgICAgIGAgW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBidXQgcmVjZWl2ZWQgJHtcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShhcmdzLmtlcm5lbFNpemUpfS5gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDb252M0QpO1xuXG5leHBvcnQgY2xhc3MgQ29udjJEVHJhbnNwb3NlIGV4dGVuZHMgQ29udjJEIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnQ29udjJEVHJhbnNwb3NlJztcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBDb252TGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbbmV3IElucHV0U3BlYyh7bmRpbTogNH0pXTtcblxuICAgIGlmICh0aGlzLnBhZGRpbmcgIT09ICdzYW1lJyAmJiB0aGlzLnBhZGRpbmcgIT09ICd2YWxpZCcpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBDb252MkRUcmFuc3Bvc2UgY3VycmVudGx5IHN1cHBvcnRzIG9ubHkgcGFkZGluZyBtb2RlcyAnc2FtZScgYCArXG4gICAgICAgICAgYGFuZCAndmFsaWQnLCBidXQgcmVjZWl2ZWQgcGFkZGluZyBtb2RlICR7dGhpcy5wYWRkaW5nfWApO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuXG4gICAgaWYgKGlucHV0U2hhcGUubGVuZ3RoICE9PSA0KSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnSW5wdXQgc2hvdWxkIGhhdmUgcmFuayA0OyBSZWNlaXZlZCBpbnB1dCBzaGFwZTogJyArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5wdXRTaGFwZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNoYW5uZWxBeGlzID1cbiAgICAgICAgdGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcgPyAxIDogaW5wdXRTaGFwZS5sZW5ndGggLSAxO1xuICAgIGlmIChpbnB1dFNoYXBlW2NoYW5uZWxBeGlzXSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnVGhlIGNoYW5uZWwgZGltZW5zaW9uIG9mIHRoZSBpbnB1dHMgc2hvdWxkIGJlIGRlZmluZWQuICcgK1xuICAgICAgICAgICdGb3VuZCBgTm9uZWAuJyk7XG4gICAgfVxuICAgIGNvbnN0IGlucHV0RGltID0gaW5wdXRTaGFwZVtjaGFubmVsQXhpc107XG4gICAgY29uc3Qga2VybmVsU2hhcGUgPSB0aGlzLmtlcm5lbFNpemUuY29uY2F0KFt0aGlzLmZpbHRlcnMsIGlucHV0RGltXSk7XG5cbiAgICB0aGlzLmtlcm5lbCA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAna2VybmVsJywga2VybmVsU2hhcGUsICdmbG9hdDMyJywgdGhpcy5rZXJuZWxJbml0aWFsaXplcixcbiAgICAgICAgdGhpcy5rZXJuZWxSZWd1bGFyaXplciwgdHJ1ZSwgdGhpcy5rZXJuZWxDb25zdHJhaW50KTtcbiAgICBpZiAodGhpcy51c2VCaWFzKSB7XG4gICAgICB0aGlzLmJpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAnYmlhcycsIFt0aGlzLmZpbHRlcnNdLCAnZmxvYXQzMicsIHRoaXMuYmlhc0luaXRpYWxpemVyLFxuICAgICAgICAgIHRoaXMuYmlhc1JlZ3VsYXJpemVyLCB0cnVlLCB0aGlzLmJpYXNDb25zdHJhaW50KTtcbiAgICB9XG5cbiAgICAvLyBTZXQgaW5wdXQgc3BlYy5cbiAgICB0aGlzLmlucHV0U3BlYyA9XG4gICAgICAgIFtuZXcgSW5wdXRTcGVjKHtuZGltOiA0LCBheGVzOiB7W2NoYW5uZWxBeGlzXTogaW5wdXREaW19fSldO1xuICAgIHRoaXMuYnVpbHQgPSB0cnVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0ZmMudGlkeSgoKSA9PiB7XG4gICAgICBsZXQgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBpZiAoaW5wdXQuc2hhcGUubGVuZ3RoICE9PSA0KSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYENvbnYyRFRyYW5zcG9zZS5jYWxsKCkgZXhwZWN0cyBpbnB1dCB0ZW5zb3IgdG8gYmUgcmFuay00LCBidXQgYCArXG4gICAgICAgICAgICBgcmVjZWl2ZWQgYSB0ZW5zb3Igb2YgcmFuay0ke2lucHV0LnNoYXBlLmxlbmd0aH1gKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5wdXRTaGFwZSA9IGlucHV0LnNoYXBlO1xuICAgICAgY29uc3QgYmF0Y2hTaXplID0gaW5wdXRTaGFwZVswXTtcblxuICAgICAgbGV0IGhBeGlzOiBudW1iZXI7XG4gICAgICBsZXQgd0F4aXM6IG51bWJlcjtcbiAgICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0Jykge1xuICAgICAgICBoQXhpcyA9IDI7XG4gICAgICAgIHdBeGlzID0gMztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhBeGlzID0gMTtcbiAgICAgICAgd0F4aXMgPSAyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoZWlnaHQgPSBpbnB1dFNoYXBlW2hBeGlzXTtcbiAgICAgIGNvbnN0IHdpZHRoID0gaW5wdXRTaGFwZVt3QXhpc107XG4gICAgICBjb25zdCBrZXJuZWxIID0gdGhpcy5rZXJuZWxTaXplWzBdO1xuICAgICAgY29uc3Qga2VybmVsVyA9IHRoaXMua2VybmVsU2l6ZVsxXTtcbiAgICAgIGNvbnN0IHN0cmlkZUggPSB0aGlzLnN0cmlkZXNbMF07XG4gICAgICBjb25zdCBzdHJpZGVXID0gdGhpcy5zdHJpZGVzWzFdO1xuXG4gICAgICAvLyBJbmZlciB0aGUgZHluYW1pYyBvdXRwdXQgc2hhcGUuXG4gICAgICBjb25zdCBvdXRIZWlnaHQgPSBkZWNvbnZMZW5ndGgoaGVpZ2h0LCBzdHJpZGVILCBrZXJuZWxILCB0aGlzLnBhZGRpbmcpO1xuICAgICAgY29uc3Qgb3V0V2lkdGggPSBkZWNvbnZMZW5ndGgod2lkdGgsIHN0cmlkZVcsIGtlcm5lbFcsIHRoaXMucGFkZGluZyk7XG5cbiAgICAgIC8vIFBvcnRpbmcgTm90ZTogV2UgZG9uJ3QgYnJhbmNoIGJhc2VkIG9uIGB0aGlzLmRhdGFGb3JtYXRgIGhlcmUsXG4gICAgICAvLyBiZWNhdXNlXG4gICAgICAvLyAgIHRoZSB0amZzLWNvcmUgZnVuY3Rpb24gYGNvbnYyZFRyYW5zcG9zZWAgY2FsbGVkIGJlbG93IGFsd2F5c1xuICAgICAgLy8gICBhc3N1bWVzIGNoYW5uZWxzTGFzdC5cbiAgICAgIGNvbnN0IG91dHB1dFNoYXBlOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9XG4gICAgICAgICAgW2JhdGNoU2l6ZSwgb3V0SGVpZ2h0LCBvdXRXaWR0aCwgdGhpcy5maWx0ZXJzXTtcblxuICAgICAgaWYgKHRoaXMuZGF0YUZvcm1hdCAhPT0gJ2NoYW5uZWxzTGFzdCcpIHtcbiAgICAgICAgaW5wdXQgPSB0ZmMudHJhbnNwb3NlKGlucHV0LCBbMCwgMiwgMywgMV0pO1xuICAgICAgfVxuICAgICAgbGV0IG91dHB1dHMgPSB0ZmMuY29udjJkVHJhbnNwb3NlKFxuICAgICAgICAgIGlucHV0IGFzIFRlbnNvcjRELCB0aGlzLmtlcm5lbC5yZWFkKCkgYXMgVGVuc29yNEQsIG91dHB1dFNoYXBlLFxuICAgICAgICAgIHRoaXMuc3RyaWRlcyBhcyBbbnVtYmVyLCBudW1iZXJdLCB0aGlzLnBhZGRpbmcgYXMgJ3NhbWUnIHwgJ3ZhbGlkJyk7XG4gICAgICBpZiAodGhpcy5kYXRhRm9ybWF0ICE9PSAnY2hhbm5lbHNMYXN0Jykge1xuICAgICAgICBvdXRwdXRzID0gdGZjLnRyYW5zcG9zZShvdXRwdXRzLCBbMCwgMywgMSwgMl0pO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5iaWFzICE9IG51bGwpIHtcbiAgICAgICAgb3V0cHV0cyA9XG4gICAgICAgICAgICBLLmJpYXNBZGQob3V0cHV0cywgdGhpcy5iaWFzLnJlYWQoKSwgdGhpcy5kYXRhRm9ybWF0KSBhcyBUZW5zb3I0RDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmFjdGl2YXRpb24gIT0gbnVsbCkge1xuICAgICAgICBvdXRwdXRzID0gdGhpcy5hY3RpdmF0aW9uLmFwcGx5KG91dHB1dHMpIGFzIFRlbnNvcjREO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dHM7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgY29uc3Qgb3V0cHV0U2hhcGUgPSBpbnB1dFNoYXBlLnNsaWNlKCk7XG5cbiAgICBsZXQgY2hhbm5lbEF4aXM6IG51bWJlcjtcbiAgICBsZXQgaGVpZ2h0QXhpczogbnVtYmVyO1xuICAgIGxldCB3aWR0aEF4aXM6IG51bWJlcjtcbiAgICBpZiAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcpIHtcbiAgICAgIGNoYW5uZWxBeGlzID0gMTtcbiAgICAgIGhlaWdodEF4aXMgPSAyO1xuICAgICAgd2lkdGhBeGlzID0gMztcbiAgICB9IGVsc2Uge1xuICAgICAgY2hhbm5lbEF4aXMgPSAzO1xuICAgICAgaGVpZ2h0QXhpcyA9IDE7XG4gICAgICB3aWR0aEF4aXMgPSAyO1xuICAgIH1cblxuICAgIGNvbnN0IGtlcm5lbEggPSB0aGlzLmtlcm5lbFNpemVbMF07XG4gICAgY29uc3Qga2VybmVsVyA9IHRoaXMua2VybmVsU2l6ZVsxXTtcbiAgICBjb25zdCBzdHJpZGVIID0gdGhpcy5zdHJpZGVzWzBdO1xuICAgIGNvbnN0IHN0cmlkZVcgPSB0aGlzLnN0cmlkZXNbMV07XG5cbiAgICBvdXRwdXRTaGFwZVtjaGFubmVsQXhpc10gPSB0aGlzLmZpbHRlcnM7XG4gICAgb3V0cHV0U2hhcGVbaGVpZ2h0QXhpc10gPVxuICAgICAgICBkZWNvbnZMZW5ndGgob3V0cHV0U2hhcGVbaGVpZ2h0QXhpc10sIHN0cmlkZUgsIGtlcm5lbEgsIHRoaXMucGFkZGluZyk7XG4gICAgb3V0cHV0U2hhcGVbd2lkdGhBeGlzXSA9XG4gICAgICAgIGRlY29udkxlbmd0aChvdXRwdXRTaGFwZVt3aWR0aEF4aXNdLCBzdHJpZGVXLCBrZXJuZWxXLCB0aGlzLnBhZGRpbmcpO1xuICAgIHJldHVybiBvdXRwdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGRlbGV0ZSBjb25maWdbJ2RpbGF0aW9uUmF0ZSddO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDb252MkRUcmFuc3Bvc2UpO1xuXG5leHBvcnQgY2xhc3MgQ29udjNEVHJhbnNwb3NlIGV4dGVuZHMgQ29udjNEIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnQ29udjNEVHJhbnNwb3NlJztcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBDb252TGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbbmV3IElucHV0U3BlYyh7bmRpbTogNX0pXTtcblxuICAgIGlmICh0aGlzLnBhZGRpbmcgIT09ICdzYW1lJyAmJiB0aGlzLnBhZGRpbmcgIT09ICd2YWxpZCcpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBDb252M0RUcmFuc3Bvc2UgY3VycmVudGx5IHN1cHBvcnRzIG9ubHkgcGFkZGluZyBtb2RlcyAnc2FtZScgYCArXG4gICAgICAgICAgYGFuZCAndmFsaWQnLCBidXQgcmVjZWl2ZWQgcGFkZGluZyBtb2RlICR7dGhpcy5wYWRkaW5nfWApO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuXG4gICAgaWYgKGlucHV0U2hhcGUubGVuZ3RoICE9PSA1KSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnSW5wdXQgc2hvdWxkIGhhdmUgcmFuayA1OyBSZWNlaXZlZCBpbnB1dCBzaGFwZTogJyArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5wdXRTaGFwZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNoYW5uZWxBeGlzID1cbiAgICAgICAgdGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcgPyAxIDogaW5wdXRTaGFwZS5sZW5ndGggLSAxO1xuICAgIGlmIChpbnB1dFNoYXBlW2NoYW5uZWxBeGlzXSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnVGhlIGNoYW5uZWwgZGltZW5zaW9uIG9mIHRoZSBpbnB1dHMgc2hvdWxkIGJlIGRlZmluZWQuICcgK1xuICAgICAgICAgICdGb3VuZCBgTm9uZWAuJyk7XG4gICAgfVxuICAgIGNvbnN0IGlucHV0RGltID0gaW5wdXRTaGFwZVtjaGFubmVsQXhpc107XG4gICAgY29uc3Qga2VybmVsU2hhcGUgPSB0aGlzLmtlcm5lbFNpemUuY29uY2F0KFt0aGlzLmZpbHRlcnMsIGlucHV0RGltXSk7XG5cbiAgICB0aGlzLmtlcm5lbCA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAna2VybmVsJywga2VybmVsU2hhcGUsICdmbG9hdDMyJywgdGhpcy5rZXJuZWxJbml0aWFsaXplcixcbiAgICAgICAgdGhpcy5rZXJuZWxSZWd1bGFyaXplciwgdHJ1ZSwgdGhpcy5rZXJuZWxDb25zdHJhaW50KTtcbiAgICBpZiAodGhpcy51c2VCaWFzKSB7XG4gICAgICB0aGlzLmJpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAnYmlhcycsIFt0aGlzLmZpbHRlcnNdLCAnZmxvYXQzMicsIHRoaXMuYmlhc0luaXRpYWxpemVyLFxuICAgICAgICAgIHRoaXMuYmlhc1JlZ3VsYXJpemVyLCB0cnVlLCB0aGlzLmJpYXNDb25zdHJhaW50KTtcbiAgICB9XG5cbiAgICAvLyBTZXQgaW5wdXQgc3BlYy5cbiAgICB0aGlzLmlucHV0U3BlYyA9XG4gICAgICAgIFtuZXcgSW5wdXRTcGVjKHtuZGltOiA1LCBheGVzOiB7W2NoYW5uZWxBeGlzXTogaW5wdXREaW19fSldO1xuICAgIHRoaXMuYnVpbHQgPSB0cnVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0ZmMudGlkeTx0ZmMuVGVuc29yNUQ+KCgpID0+IHtcbiAgICAgIGxldCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIGlmIChpbnB1dC5zaGFwZS5sZW5ndGggIT09IDUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICBgQ29udjNEVHJhbnNwb3NlLmNhbGwoKSBleHBlY3RzIGlucHV0IHRlbnNvciB0byBiZSByYW5rLTQsIGJ1dCBgICtcbiAgICAgICAgICAgIGByZWNlaXZlZCBhIHRlbnNvciBvZiByYW5rLSR7aW5wdXQuc2hhcGUubGVuZ3RofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbnB1dFNoYXBlID0gaW5wdXQuc2hhcGU7XG4gICAgICBjb25zdCBiYXRjaFNpemUgPSBpbnB1dFNoYXBlWzBdO1xuXG4gICAgICBsZXQgaEF4aXM6IG51bWJlcjtcbiAgICAgIGxldCB3QXhpczogbnVtYmVyO1xuICAgICAgbGV0IGRBeGlzOiBudW1iZXI7XG5cbiAgICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0Jykge1xuICAgICAgICBkQXhpcyA9IDI7XG4gICAgICAgIGhBeGlzID0gMztcbiAgICAgICAgd0F4aXMgPSA0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZEF4aXMgPSAxO1xuICAgICAgICBoQXhpcyA9IDI7XG4gICAgICAgIHdBeGlzID0gMztcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVwdGggPSBpbnB1dFNoYXBlW2RBeGlzXTtcbiAgICAgIGNvbnN0IGhlaWdodCA9IGlucHV0U2hhcGVbaEF4aXNdO1xuICAgICAgY29uc3Qgd2lkdGggPSBpbnB1dFNoYXBlW3dBeGlzXTtcbiAgICAgIGNvbnN0IGtlcm5lbEQgPSB0aGlzLmtlcm5lbFNpemVbMF07XG4gICAgICBjb25zdCBrZXJuZWxIID0gdGhpcy5rZXJuZWxTaXplWzFdO1xuICAgICAgY29uc3Qga2VybmVsVyA9IHRoaXMua2VybmVsU2l6ZVsyXTtcbiAgICAgIGNvbnN0IHN0cmlkZUQgPSB0aGlzLnN0cmlkZXNbMF07XG4gICAgICBjb25zdCBzdHJpZGVIID0gdGhpcy5zdHJpZGVzWzFdO1xuICAgICAgY29uc3Qgc3RyaWRlVyA9IHRoaXMuc3RyaWRlc1syXTtcblxuICAgICAgLy8gSW5mZXIgdGhlIGR5bmFtaWMgb3V0cHV0IHNoYXBlLlxuICAgICAgY29uc3Qgb3V0RGVwdGggPSBkZWNvbnZMZW5ndGgoZGVwdGgsIHN0cmlkZUQsIGtlcm5lbEQsIHRoaXMucGFkZGluZyk7XG4gICAgICBjb25zdCBvdXRIZWlnaHQgPSBkZWNvbnZMZW5ndGgoaGVpZ2h0LCBzdHJpZGVILCBrZXJuZWxILCB0aGlzLnBhZGRpbmcpO1xuICAgICAgY29uc3Qgb3V0V2lkdGggPSBkZWNvbnZMZW5ndGgod2lkdGgsIHN0cmlkZVcsIGtlcm5lbFcsIHRoaXMucGFkZGluZyk7XG5cbiAgICAgIC8vIFNhbWUgYXMgYGNvbnYyZFRyYW5zcG9zZWAuIFdlIGFsd2F5cyBhc3N1bWVzIGNoYW5uZWxzTGFzdC5cbiAgICAgIGNvbnN0IG91dHB1dFNoYXBlOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdID1cbiAgICAgICAgICBbYmF0Y2hTaXplLCBvdXREZXB0aCwgb3V0SGVpZ2h0LCBvdXRXaWR0aCwgdGhpcy5maWx0ZXJzXTtcbiAgICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgIT09ICdjaGFubmVsc0xhc3QnKSB7XG4gICAgICAgIGlucHV0ID0gdGZjLnRyYW5zcG9zZShpbnB1dCwgWzAsIDIsIDMsIDQsIDFdKTtcbiAgICAgIH1cbiAgICAgIGxldCBvdXRwdXRzID0gdGZjLmNvbnYzZFRyYW5zcG9zZShcbiAgICAgICAgICBpbnB1dCBhcyBUZW5zb3I1RCwgdGhpcy5rZXJuZWwucmVhZCgpIGFzIFRlbnNvcjVELCBvdXRwdXRTaGFwZSxcbiAgICAgICAgICB0aGlzLnN0cmlkZXMgYXMgW251bWJlciwgbnVtYmVyLCBudW1iZXJdLFxuICAgICAgICAgIHRoaXMucGFkZGluZyBhcyAnc2FtZScgfCAndmFsaWQnKTtcbiAgICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgIT09ICdjaGFubmVsc0xhc3QnKSB7XG4gICAgICAgIG91dHB1dHMgPSB0ZmMudHJhbnNwb3NlKG91dHB1dHMsIFswLCA0LCAxLCAyLCAzXSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmJpYXMgIT09IG51bGwpIHtcbiAgICAgICAgb3V0cHV0cyA9XG4gICAgICAgICAgICBLLmJpYXNBZGQob3V0cHV0cywgdGhpcy5iaWFzLnJlYWQoKSwgdGhpcy5kYXRhRm9ybWF0KSBhcyBUZW5zb3I1RDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmFjdGl2YXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgb3V0cHV0cyA9IHRoaXMuYWN0aXZhdGlvbi5hcHBseShvdXRwdXRzKSBhcyBUZW5zb3I1RDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXRzO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuICAgIGNvbnN0IG91dHB1dFNoYXBlID0gaW5wdXRTaGFwZS5zbGljZSgpO1xuXG4gICAgbGV0IGNoYW5uZWxBeGlzOiBudW1iZXI7XG4gICAgbGV0IGRlcHRoQXhpczogbnVtYmVyO1xuICAgIGxldCBoZWlnaHRBeGlzOiBudW1iZXI7XG4gICAgbGV0IHdpZHRoQXhpczogbnVtYmVyO1xuICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0Jykge1xuICAgICAgY2hhbm5lbEF4aXMgPSAxO1xuICAgICAgZGVwdGhBeGlzID0gMjtcbiAgICAgIGhlaWdodEF4aXMgPSAzO1xuICAgICAgd2lkdGhBeGlzID0gNDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hhbm5lbEF4aXMgPSA0O1xuICAgICAgZGVwdGhBeGlzID0gMTtcbiAgICAgIGhlaWdodEF4aXMgPSAyO1xuICAgICAgd2lkdGhBeGlzID0gMztcbiAgICB9XG5cbiAgICBjb25zdCBrZXJuZWxEID0gdGhpcy5rZXJuZWxTaXplWzBdO1xuICAgIGNvbnN0IGtlcm5lbEggPSB0aGlzLmtlcm5lbFNpemVbMV07XG4gICAgY29uc3Qga2VybmVsVyA9IHRoaXMua2VybmVsU2l6ZVsyXTtcbiAgICBjb25zdCBzdHJpZGVEID0gdGhpcy5zdHJpZGVzWzBdO1xuICAgIGNvbnN0IHN0cmlkZUggPSB0aGlzLnN0cmlkZXNbMV07XG4gICAgY29uc3Qgc3RyaWRlVyA9IHRoaXMuc3RyaWRlc1syXTtcblxuICAgIG91dHB1dFNoYXBlW2NoYW5uZWxBeGlzXSA9IHRoaXMuZmlsdGVycztcbiAgICBvdXRwdXRTaGFwZVtkZXB0aEF4aXNdID1cbiAgICAgICAgZGVjb252TGVuZ3RoKG91dHB1dFNoYXBlW2RlcHRoQXhpc10sIHN0cmlkZUQsIGtlcm5lbEQsIHRoaXMucGFkZGluZyk7XG4gICAgb3V0cHV0U2hhcGVbaGVpZ2h0QXhpc10gPVxuICAgICAgICBkZWNvbnZMZW5ndGgob3V0cHV0U2hhcGVbaGVpZ2h0QXhpc10sIHN0cmlkZUgsIGtlcm5lbEgsIHRoaXMucGFkZGluZyk7XG4gICAgb3V0cHV0U2hhcGVbd2lkdGhBeGlzXSA9XG4gICAgICAgIGRlY29udkxlbmd0aChvdXRwdXRTaGFwZVt3aWR0aEF4aXNdLCBzdHJpZGVXLCBrZXJuZWxXLCB0aGlzLnBhZGRpbmcpO1xuICAgIHJldHVybiBvdXRwdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGRlbGV0ZSBjb25maWdbJ2RpbGF0aW9uUmF0ZSddO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDb252M0RUcmFuc3Bvc2UpO1xuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgU2VwYXJhYmxlQ29udkxheWVyQXJncyBleHRlbmRzIENvbnZMYXllckFyZ3Mge1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBkZXB0aHdpc2UgY29udm9sdXRpb24gb3V0cHV0IGNoYW5uZWxzIGZvciBlYWNoIGlucHV0XG4gICAqIGNoYW5uZWwuXG4gICAqIFRoZSB0b3RhbCBudW1iZXIgb2YgZGVwdGh3aXNlIGNvbnZvbHV0aW9uIG91dHB1dCBjaGFubmVscyB3aWxsIGJlIGVxdWFsXG4gICAqIHRvIGBmaWx0ZXJzSW4gKiBkZXB0aE11bHRpcGxpZXJgLiBEZWZhdWx0OiAxLlxuICAgKi9cbiAgZGVwdGhNdWx0aXBsaWVyPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGRlcHRod2lzZSBrZXJuZWwgbWF0cml4LlxuICAgKi9cbiAgZGVwdGh3aXNlSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXJ8SW5pdGlhbGl6ZXI7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVyIGZvciB0aGUgcG9pbnR3aXNlIGtlcm5lbCBtYXRyaXguXG4gICAqL1xuICBwb2ludHdpc2VJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgZGVwdGh3aXNlIGtlcm5lbCBtYXRyaXguXG4gICAqL1xuICBkZXB0aHdpc2VSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcnxSZWd1bGFyaXplcjtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgcG9pbnR3aXNlIGtlcm5lbCBtYXRyaXguXG4gICAqL1xuICBwb2ludHdpc2VSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcnxSZWd1bGFyaXplcjtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBkZXB0aHdpc2Uga2VybmVsIG1hdHJpeC5cbiAgICovXG4gIGRlcHRod2lzZUNvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcnxDb25zdHJhaW50O1xuXG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIHBvaW50d2lzZSBrZXJuZWwgbWF0cml4LlxuICAgKi9cbiAgcG9pbnR3aXNlQ29uc3RyYWludD86IENvbnN0cmFpbnRJZGVudGlmaWVyfENvbnN0cmFpbnQ7XG59XG5cbmV4cG9ydCBjbGFzcyBTZXBhcmFibGVDb252IGV4dGVuZHMgQ29udiB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ1NlcGFyYWJsZUNvbnYnO1xuXG4gIHJlYWRvbmx5IGRlcHRoTXVsdGlwbGllcjogbnVtYmVyO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBkZXB0aHdpc2VJbml0aWFsaXplcj86IEluaXRpYWxpemVyO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZGVwdGh3aXNlUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGRlcHRod2lzZUNvbnN0cmFpbnQ/OiBDb25zdHJhaW50O1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcG9pbnR3aXNlSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHBvaW50d2lzZVJlZ3VsYXJpemVyPzogUmVndWxhcml6ZXI7XG4gIHByb3RlY3RlZCByZWFkb25seSBwb2ludHdpc2VDb25zdHJhaW50PzogQ29uc3RyYWludDtcblxuICByZWFkb25seSBERUZBVUxUX0RFUFRIV0lTRV9JTklUSUFMSVpFUjogSW5pdGlhbGl6ZXJJZGVudGlmaWVyID1cbiAgICAgICdnbG9yb3RVbmlmb3JtJztcbiAgcmVhZG9ubHkgREVGQVVMVF9QT0lOVFdJU0VfSU5JVElBTElaRVI6IEluaXRpYWxpemVySWRlbnRpZmllciA9XG4gICAgICAnZ2xvcm90VW5pZm9ybSc7XG5cbiAgcHJvdGVjdGVkIGRlcHRod2lzZUtlcm5lbDogTGF5ZXJWYXJpYWJsZSA9IG51bGw7XG4gIHByb3RlY3RlZCBwb2ludHdpc2VLZXJuZWw6IExheWVyVmFyaWFibGUgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHJhbms6IG51bWJlciwgY29uZmlnPzogU2VwYXJhYmxlQ29udkxheWVyQXJncykge1xuICAgIHN1cGVyKHJhbmssIGNvbmZpZyk7XG5cbiAgICBpZiAoY29uZmlnLmZpbHRlcnMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ1RoZSBgZmlsdGVyc2AgY29uZmlndXJhdGlvbiBmaWVsZCBpcyByZXF1aXJlZCBieSBTZXBhcmFibGVDb252LCAnICtcbiAgICAgICAgICAnYnV0IGlzIHVuc3BlY2lmaWVkLicpO1xuICAgIH1cbiAgICBpZiAoY29uZmlnLmtlcm5lbEluaXRpYWxpemVyICE9IG51bGwgfHwgY29uZmlnLmtlcm5lbFJlZ3VsYXJpemVyICE9IG51bGwgfHxcbiAgICAgICAgY29uZmlnLmtlcm5lbENvbnN0cmFpbnQgIT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ0ZpZWxkcyBrZXJuZWxJbml0aWFsaXplciwga2VybmVsUmVndWxhcml6ZXIgYW5kIGtlcm5lbENvbnN0cmFpbnQgJyArXG4gICAgICAgICAgJ2FyZSBpbnZhbGlkIGZvciBTZXBhcmFibGVDb252MkQuIFVzZSBkZXB0aHdpc2VJbml0aWFsaXplciwgJyArXG4gICAgICAgICAgJ2RlcHRod2lzZVJlZ3VsYXJpemVyLCBkZXB0aHdpc2VDb25zdHJhaW50LCBwb2ludHdpc2VJbml0aWFsaXplciwgJyArXG4gICAgICAgICAgJ3BvaW50d2lzZVJlZ3VsYXJpemVyIGFuZCBwb2ludHdpc2VDb25zdHJhaW50IGluc3RlYWQuJyk7XG4gICAgfVxuICAgIGlmIChjb25maWcucGFkZGluZyAhPSBudWxsICYmIGNvbmZpZy5wYWRkaW5nICE9PSAnc2FtZScgJiZcbiAgICAgICAgY29uZmlnLnBhZGRpbmcgIT09ICd2YWxpZCcpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBTZXBhcmFibGVDb252JHt0aGlzLnJhbmt9RCBzdXBwb3J0cyBvbmx5IHBhZGRpbmcgbW9kZXM6IGAgK1xuICAgICAgICAgIGAnc2FtZScgYW5kICd2YWxpZCcsIGJ1dCByZWNlaXZlZCAke0pTT04uc3RyaW5naWZ5KGNvbmZpZy5wYWRkaW5nKX1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmRlcHRoTXVsdGlwbGllciA9XG4gICAgICAgIGNvbmZpZy5kZXB0aE11bHRpcGxpZXIgPT0gbnVsbCA/IDEgOiBjb25maWcuZGVwdGhNdWx0aXBsaWVyO1xuICAgIHRoaXMuZGVwdGh3aXNlSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihcbiAgICAgICAgY29uZmlnLmRlcHRod2lzZUluaXRpYWxpemVyIHx8IHRoaXMuREVGQVVMVF9ERVBUSFdJU0VfSU5JVElBTElaRVIpO1xuICAgIHRoaXMuZGVwdGh3aXNlUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihjb25maWcuZGVwdGh3aXNlUmVndWxhcml6ZXIpO1xuICAgIHRoaXMuZGVwdGh3aXNlQ29uc3RyYWludCA9IGdldENvbnN0cmFpbnQoY29uZmlnLmRlcHRod2lzZUNvbnN0cmFpbnQpO1xuICAgIHRoaXMucG9pbnR3aXNlSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihcbiAgICAgICAgY29uZmlnLmRlcHRod2lzZUluaXRpYWxpemVyIHx8IHRoaXMuREVGQVVMVF9QT0lOVFdJU0VfSU5JVElBTElaRVIpO1xuICAgIHRoaXMucG9pbnR3aXNlUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihjb25maWcucG9pbnR3aXNlUmVndWxhcml6ZXIpO1xuICAgIHRoaXMucG9pbnR3aXNlQ29uc3RyYWludCA9IGdldENvbnN0cmFpbnQoY29uZmlnLnBvaW50d2lzZUNvbnN0cmFpbnQpO1xuICB9XG5cbiAgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgaWYgKGlucHV0U2hhcGUubGVuZ3RoIDwgdGhpcy5yYW5rICsgMikge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYElucHV0cyB0byBTZXBhcmFibGVDb252JHt0aGlzLnJhbmt9RCBzaG91bGQgaGF2ZSByYW5rIGAgK1xuICAgICAgICAgIGAke3RoaXMucmFuayArIDJ9LCBidXQgcmVjZWl2ZWQgaW5wdXQgc2hhcGU6IGAgK1xuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGlucHV0U2hhcGUpfWApO1xuICAgIH1cbiAgICBjb25zdCBjaGFubmVsQXhpcyA9XG4gICAgICAgIHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnID8gMSA6IGlucHV0U2hhcGUubGVuZ3RoIC0gMTtcbiAgICBpZiAoaW5wdXRTaGFwZVtjaGFubmVsQXhpc10gPT0gbnVsbCB8fCBpbnB1dFNoYXBlW2NoYW5uZWxBeGlzXSA8IDApIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBUaGUgY2hhbm5lbCBkaW1lbnNpb24gb2YgdGhlIGlucHV0cyBzaG91bGQgYmUgZGVmaW5lZCwgYCArXG4gICAgICAgICAgYGJ1dCBmb3VuZCAke0pTT04uc3RyaW5naWZ5KGlucHV0U2hhcGVbY2hhbm5lbEF4aXNdKX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbnB1dERpbSA9IGlucHV0U2hhcGVbY2hhbm5lbEF4aXNdO1xuICAgIGNvbnN0IGRlcHRod2lzZUtlcm5lbFNoYXBlID1cbiAgICAgICAgdGhpcy5rZXJuZWxTaXplLmNvbmNhdChbaW5wdXREaW0sIHRoaXMuZGVwdGhNdWx0aXBsaWVyXSk7XG4gICAgY29uc3QgcG9pbnR3aXNlS2VybmVsU2hhcGUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucmFuazsgKytpKSB7XG4gICAgICBwb2ludHdpc2VLZXJuZWxTaGFwZS5wdXNoKDEpO1xuICAgIH1cbiAgICBwb2ludHdpc2VLZXJuZWxTaGFwZS5wdXNoKGlucHV0RGltICogdGhpcy5kZXB0aE11bHRpcGxpZXIsIHRoaXMuZmlsdGVycyk7XG5cbiAgICBjb25zdCB0cmFpbmFibGUgPSB0cnVlO1xuICAgIHRoaXMuZGVwdGh3aXNlS2VybmVsID0gdGhpcy5hZGRXZWlnaHQoXG4gICAgICAgICdkZXB0aHdpc2Vfa2VybmVsJywgZGVwdGh3aXNlS2VybmVsU2hhcGUsICdmbG9hdDMyJyxcbiAgICAgICAgdGhpcy5kZXB0aHdpc2VJbml0aWFsaXplciwgdGhpcy5kZXB0aHdpc2VSZWd1bGFyaXplciwgdHJhaW5hYmxlLFxuICAgICAgICB0aGlzLmRlcHRod2lzZUNvbnN0cmFpbnQpO1xuICAgIHRoaXMucG9pbnR3aXNlS2VybmVsID0gdGhpcy5hZGRXZWlnaHQoXG4gICAgICAgICdwb2ludHdpc2Vfa2VybmVsJywgcG9pbnR3aXNlS2VybmVsU2hhcGUsICdmbG9hdDMyJyxcbiAgICAgICAgdGhpcy5wb2ludHdpc2VJbml0aWFsaXplciwgdGhpcy5wb2ludHdpc2VSZWd1bGFyaXplciwgdHJhaW5hYmxlLFxuICAgICAgICB0aGlzLnBvaW50d2lzZUNvbnN0cmFpbnQpO1xuICAgIGlmICh0aGlzLnVzZUJpYXMpIHtcbiAgICAgIHRoaXMuYmlhcyA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAgICdiaWFzJywgW3RoaXMuZmlsdGVyc10sICdmbG9hdDMyJywgdGhpcy5iaWFzSW5pdGlhbGl6ZXIsXG4gICAgICAgICAgdGhpcy5iaWFzUmVndWxhcml6ZXIsIHRyYWluYWJsZSwgdGhpcy5iaWFzQ29uc3RyYWludCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYmlhcyA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5pbnB1dFNwZWMgPVxuICAgICAgICBbbmV3IElucHV0U3BlYyh7bmRpbTogdGhpcy5yYW5rICsgMiwgYXhlczoge1tjaGFubmVsQXhpc106IGlucHV0RGltfX0pXTtcbiAgICB0aGlzLmJ1aWx0ID0gdHJ1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBpbnB1dHMgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG5cbiAgICAgIGxldCBvdXRwdXQ6IFRlbnNvcjtcbiAgICAgIGlmICh0aGlzLnJhbmsgPT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgICAnMUQgc2VwYXJhYmxlIGNvbnZvbHV0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZCB5ZXQuJyk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMucmFuayA9PT0gMikge1xuICAgICAgICBpZiAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcpIHtcbiAgICAgICAgICBpbnB1dHMgPSB0ZmMudHJhbnNwb3NlKGlucHV0cywgWzAsIDIsIDMsIDFdKTsgIC8vIE5DSFcgLT4gTkhXQy5cbiAgICAgICAgfVxuXG4gICAgICAgIG91dHB1dCA9IHRmYy5zZXBhcmFibGVDb252MmQoXG4gICAgICAgICAgICBpbnB1dHMgYXMgVGVuc29yNEQsIHRoaXMuZGVwdGh3aXNlS2VybmVsLnJlYWQoKSBhcyBUZW5zb3I0RCxcbiAgICAgICAgICAgIHRoaXMucG9pbnR3aXNlS2VybmVsLnJlYWQoKSBhcyBUZW5zb3I0RCxcbiAgICAgICAgICAgIHRoaXMuc3RyaWRlcyBhcyBbbnVtYmVyLCBudW1iZXJdLCB0aGlzLnBhZGRpbmcgYXMgJ3NhbWUnIHwgJ3ZhbGlkJyxcbiAgICAgICAgICAgIHRoaXMuZGlsYXRpb25SYXRlIGFzIFtudW1iZXIsIG51bWJlcl0sICdOSFdDJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnVzZUJpYXMpIHtcbiAgICAgICAgb3V0cHV0ID0gSy5iaWFzQWRkKG91dHB1dCwgdGhpcy5iaWFzLnJlYWQoKSwgdGhpcy5kYXRhRm9ybWF0KTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmFjdGl2YXRpb24gIT0gbnVsbCkge1xuICAgICAgICBvdXRwdXQgPSB0aGlzLmFjdGl2YXRpb24uYXBwbHkob3V0cHV0KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICAgIG91dHB1dCA9IHRmYy50cmFuc3Bvc2Uob3V0cHV0LCBbMCwgMywgMSwgMl0pOyAgLy8gTkhXQyAtPiBOQ0hXLlxuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGRlbGV0ZSBjb25maWdbJ3JhbmsnXTtcbiAgICBkZWxldGUgY29uZmlnWydrZXJuZWxJbml0aWFsaXplciddO1xuICAgIGRlbGV0ZSBjb25maWdbJ2tlcm5lbFJlZ3VsYXJpemVyJ107XG4gICAgZGVsZXRlIGNvbmZpZ1sna2VybmVsQ29uc3RyYWludCddO1xuICAgIGNvbmZpZ1snZGVwdGh3aXNlSW5pdGlhbGl6ZXInXSA9XG4gICAgICAgIHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMuZGVwdGh3aXNlSW5pdGlhbGl6ZXIpO1xuICAgIGNvbmZpZ1sncG9pbnR3aXNlSW5pdGlhbGl6ZXInXSA9XG4gICAgICAgIHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMucG9pbnR3aXNlSW5pdGlhbGl6ZXIpO1xuICAgIGNvbmZpZ1snZGVwdGh3aXNlUmVndWxhcml6ZXInXSA9XG4gICAgICAgIHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMuZGVwdGh3aXNlUmVndWxhcml6ZXIpO1xuICAgIGNvbmZpZ1sncG9pbnR3aXNlUmVndWxhcml6ZXInXSA9XG4gICAgICAgIHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMucG9pbnR3aXNlUmVndWxhcml6ZXIpO1xuICAgIGNvbmZpZ1snZGVwdGh3aXNlQ29uc3RyYWludCddID1cbiAgICAgICAgc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLmRlcHRod2lzZUNvbnN0cmFpbnQpO1xuICAgIGNvbmZpZ1sncG9pbnR3aXNlQ29uc3RyYWludCddID1cbiAgICAgICAgc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLnBvaW50d2lzZUNvbnN0cmFpbnQpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFNlcGFyYWJsZUNvbnYyRCBleHRlbmRzIFNlcGFyYWJsZUNvbnYge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdTZXBhcmFibGVDb252MkQnO1xuICBjb25zdHJ1Y3RvcihhcmdzPzogU2VwYXJhYmxlQ29udkxheWVyQXJncykge1xuICAgIHN1cGVyKDIsIGFyZ3MpO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoU2VwYXJhYmxlQ29udjJEKTtcblxuZXhwb3J0IGNsYXNzIENvbnYxRCBleHRlbmRzIENvbnYge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdDb252MUQnO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBDb252TGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoMSwgYXJncyk7XG4gICAgQ29udjFELnZlcmlmeUFyZ3MoYXJncyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbe25kaW06IDN9XTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGRlbGV0ZSBjb25maWdbJ3JhbmsnXTtcbiAgICBkZWxldGUgY29uZmlnWydkYXRhRm9ybWF0J107XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHByb3RlY3RlZCBzdGF0aWMgb3ZlcnJpZGUgdmVyaWZ5QXJncyhhcmdzOiBDb252TGF5ZXJBcmdzKSB7XG4gICAgLy8gY29uZmlnLmtlcm5lbFNpemUgbXVzdCBiZSBhIG51bWJlciBvciBhcnJheSBvZiBudW1iZXJzLlxuICAgIGlmICh0eXBlb2YgYXJncy5rZXJuZWxTaXplICE9PSAnbnVtYmVyJyAmJlxuICAgICAgICAhZ2VuZXJpY191dGlscy5jaGVja0FycmF5VHlwZUFuZExlbmd0aChcbiAgICAgICAgICAgIGFyZ3Mua2VybmVsU2l6ZSwgJ251bWJlcicsIDEsIDEpKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgQ29udjFEIGV4cGVjdHMgY29uZmlnLmtlcm5lbFNpemUgdG8gYmUgbnVtYmVyIG9yIG51bWJlcltdIHdpdGggYCArXG4gICAgICAgICAgYGxlbmd0aCAxLCBidXQgcmVjZWl2ZWQgJHtKU09OLnN0cmluZ2lmeShhcmdzLmtlcm5lbFNpemUpfS5gKTtcbiAgICB9XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDb252MUQpO1xuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQ3JvcHBpbmcyRExheWVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBEaW1lbnNpb24gb2YgdGhlIGNyb3BwaW5nIGFsb25nIHRoZSB3aWR0aCBhbmQgdGhlIGhlaWdodC5cbiAgICogLSBJZiBpbnRlZ2VyOiB0aGUgc2FtZSBzeW1tZXRyaWMgY3JvcHBpbmdcbiAgICogIGlzIGFwcGxpZWQgdG8gd2lkdGggYW5kIGhlaWdodC5cbiAgICogLSBJZiBsaXN0IG9mIDIgaW50ZWdlcnM6XG4gICAqICAgaW50ZXJwcmV0ZWQgYXMgdHdvIGRpZmZlcmVudFxuICAgKiAgIHN5bW1ldHJpYyBjcm9wcGluZyB2YWx1ZXMgZm9yIGhlaWdodCBhbmQgd2lkdGg6XG4gICAqICAgYFtzeW1tZXRyaWNfaGVpZ2h0X2Nyb3AsIHN5bW1ldHJpY193aWR0aF9jcm9wXWAuXG4gICAqIC0gSWYgYSBsaXN0IG9mIDIgbGlzdHMgb2YgMiBpbnRlZ2VyczpcbiAgICogICBpbnRlcnByZXRlZCBhc1xuICAgKiAgIGBbW3RvcF9jcm9wLCBib3R0b21fY3JvcF0sIFtsZWZ0X2Nyb3AsIHJpZ2h0X2Nyb3BdXWBcbiAgICovXG4gIGNyb3BwaW5nOiBudW1iZXJ8W251bWJlciwgbnVtYmVyXXxbW251bWJlciwgbnVtYmVyXSwgW251bWJlciwgbnVtYmVyXV07XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBvZiB0aGUgZGF0YSwgd2hpY2ggZGV0ZXJtaW5lcyB0aGUgb3JkZXJpbmcgb2YgdGhlIGRpbWVuc2lvbnMgaW5cbiAgICogdGhlIGlucHV0cy5cbiAgICpcbiAgICogYGNoYW5uZWxzX2xhc3RgIGNvcnJlc3BvbmRzIHRvIGlucHV0cyB3aXRoIHNoYXBlXG4gICAqICAgYChiYXRjaCwgLi4uLCBjaGFubmVscylgXG4gICAqXG4gICAqIGBjaGFubmVsc19maXJzdGAgY29ycmVzcG9uZHMgdG8gaW5wdXRzIHdpdGggc2hhcGVcbiAgICogICBgKGJhdGNoLCBjaGFubmVscywgLi4uKWBcbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGNoYW5uZWxzX2xhc3RgLlxuICAgKi9cbiAgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDcm9wcGluZzJEIGV4dGVuZHMgTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdDcm9wcGluZzJEJztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGNyb3BwaW5nOiBbW251bWJlciwgbnVtYmVyXSwgW251bWJlciwgbnVtYmVyXV07XG4gIHByb3RlY3RlZCByZWFkb25seSBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0O1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IENyb3BwaW5nMkRMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICBpZiAodHlwZW9mIGFyZ3MuY3JvcHBpbmcgPT09ICdudW1iZXInKSB7XG4gICAgICB0aGlzLmNyb3BwaW5nID1cbiAgICAgICAgICBbW2FyZ3MuY3JvcHBpbmcsIGFyZ3MuY3JvcHBpbmddLCBbYXJncy5jcm9wcGluZywgYXJncy5jcm9wcGluZ11dO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZ3MuY3JvcHBpbmdbMF0gPT09ICdudW1iZXInKSB7XG4gICAgICB0aGlzLmNyb3BwaW5nID0gW1xuICAgICAgICBbYXJncy5jcm9wcGluZ1swXSwgYXJncy5jcm9wcGluZ1swXV0sXG4gICAgICAgIFthcmdzLmNyb3BwaW5nWzFdIGFzIG51bWJlciwgYXJncy5jcm9wcGluZ1sxXSBhcyBudW1iZXJdXG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNyb3BwaW5nID0gYXJncy5jcm9wcGluZyBhcyBbW251bWJlciwgbnVtYmVyXSwgW251bWJlciwgbnVtYmVyXV07XG4gICAgfVxuICAgIHRoaXMuZGF0YUZvcm1hdCA9XG4gICAgICAgIGFyZ3MuZGF0YUZvcm1hdCA9PT0gdW5kZWZpbmVkID8gJ2NoYW5uZWxzTGFzdCcgOiBhcmdzLmRhdGFGb3JtYXQ7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbe25kaW06IDR9XTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZSk6IFNoYXBlIHtcbiAgICBpZiAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcpIHtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIGlucHV0U2hhcGVbMF0sIGlucHV0U2hhcGVbMV0sXG4gICAgICAgIGlucHV0U2hhcGVbMl0gLSB0aGlzLmNyb3BwaW5nWzBdWzBdIC0gdGhpcy5jcm9wcGluZ1swXVsxXSxcbiAgICAgICAgaW5wdXRTaGFwZVszXSAtIHRoaXMuY3JvcHBpbmdbMV1bMF0gLSB0aGlzLmNyb3BwaW5nWzFdWzFdXG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW1xuICAgICAgICBpbnB1dFNoYXBlWzBdLFxuICAgICAgICBpbnB1dFNoYXBlWzFdIC0gdGhpcy5jcm9wcGluZ1swXVswXSAtIHRoaXMuY3JvcHBpbmdbMF1bMV0sXG4gICAgICAgIGlucHV0U2hhcGVbMl0gLSB0aGlzLmNyb3BwaW5nWzFdWzBdIC0gdGhpcy5jcm9wcGluZ1sxXVsxXSwgaW5wdXRTaGFwZVszXVxuICAgICAgXTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaW5wdXRzID0gZ2V0RXhhY3RseU9uZVRlbnNvcihpbnB1dHMpO1xuXG4gICAgICBpZiAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNMYXN0Jykge1xuICAgICAgICBjb25zdCBoU2xpY2VkID0gSy5zbGljZUFsb25nQXhpcyhcbiAgICAgICAgICAgIGlucHV0cywgdGhpcy5jcm9wcGluZ1swXVswXSxcbiAgICAgICAgICAgIGlucHV0cy5zaGFwZVsxXSAtIHRoaXMuY3JvcHBpbmdbMF1bMF0gLSB0aGlzLmNyb3BwaW5nWzBdWzFdLCAyKTtcbiAgICAgICAgcmV0dXJuIEsuc2xpY2VBbG9uZ0F4aXMoXG4gICAgICAgICAgICBoU2xpY2VkLCB0aGlzLmNyb3BwaW5nWzFdWzBdLFxuICAgICAgICAgICAgaW5wdXRzLnNoYXBlWzJdIC0gdGhpcy5jcm9wcGluZ1sxXVsxXSAtIHRoaXMuY3JvcHBpbmdbMV1bMF0sIDMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaFNsaWNlZCA9IEsuc2xpY2VBbG9uZ0F4aXMoXG4gICAgICAgICAgICBpbnB1dHMsIHRoaXMuY3JvcHBpbmdbMF1bMF0sXG4gICAgICAgICAgICBpbnB1dHMuc2hhcGVbMl0gLSB0aGlzLmNyb3BwaW5nWzBdWzBdIC0gdGhpcy5jcm9wcGluZ1swXVsxXSwgMyk7XG4gICAgICAgIHJldHVybiBLLnNsaWNlQWxvbmdBeGlzKFxuICAgICAgICAgICAgaFNsaWNlZCwgdGhpcy5jcm9wcGluZ1sxXVswXSxcbiAgICAgICAgICAgIGlucHV0cy5zaGFwZVszXSAtIHRoaXMuY3JvcHBpbmdbMV1bMV0gLSB0aGlzLmNyb3BwaW5nWzFdWzBdLCA0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtjcm9wcGluZzogdGhpcy5jcm9wcGluZywgZGF0YUZvcm1hdDogdGhpcy5kYXRhRm9ybWF0fTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDcm9wcGluZzJEKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFVwU2FtcGxpbmcyRExheWVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBUaGUgdXBzYW1wbGluZyBmYWN0b3JzIGZvciByb3dzIGFuZCBjb2x1bW5zLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgWzIsIDJdYC5cbiAgICovXG4gIHNpemU/OiBudW1iZXJbXTtcbiAgLyoqXG4gICAqIEZvcm1hdCBvZiB0aGUgZGF0YSwgd2hpY2ggZGV0ZXJtaW5lcyB0aGUgb3JkZXJpbmcgb2YgdGhlIGRpbWVuc2lvbnMgaW5cbiAgICogdGhlIGlucHV0cy5cbiAgICpcbiAgICogYFwiY2hhbm5lbHNMYXN0XCJgIGNvcnJlc3BvbmRzIHRvIGlucHV0cyB3aXRoIHNoYXBlXG4gICAqICAgYFtiYXRjaCwgLi4uLCBjaGFubmVsc11gXG4gICAqXG4gICAqICBgXCJjaGFubmVsc0ZpcnN0XCJgIGNvcnJlc3BvbmRzIHRvIGlucHV0cyB3aXRoIHNoYXBlIGBbYmF0Y2gsIGNoYW5uZWxzLFxuICAgKiAuLi5dYC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYFwiY2hhbm5lbHNMYXN0XCJgLlxuICAgKi9cbiAgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQ7XG4gIC8qKlxuICAgKiBUaGUgaW50ZXJwb2xhdGlvbiBtZWNoYW5pc20sIG9uZSBvZiBgXCJuZWFyZXN0XCJgIG9yIGBcImJpbGluZWFyXCJgLCBkZWZhdWx0XG4gICAqIHRvIGBcIm5lYXJlc3RcImAuXG4gICAqL1xuICBpbnRlcnBvbGF0aW9uPzogSW50ZXJwb2xhdGlvbkZvcm1hdDtcbn1cblxuZXhwb3J0IGNsYXNzIFVwU2FtcGxpbmcyRCBleHRlbmRzIExheWVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnVXBTYW1wbGluZzJEJztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IERFRkFVTFRfU0laRSA9IFsyLCAyXTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNpemU6IG51bWJlcltdO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZGF0YUZvcm1hdDogRGF0YUZvcm1hdDtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGludGVycG9sYXRpb246IEludGVycG9sYXRpb25Gb3JtYXQ7XG5cbiAgY29uc3RydWN0b3IoYXJnczogVXBTYW1wbGluZzJETGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbe25kaW06IDR9XTtcbiAgICB0aGlzLnNpemUgPSBhcmdzLnNpemUgPT0gbnVsbCA/IHRoaXMuREVGQVVMVF9TSVpFIDogYXJncy5zaXplO1xuICAgIHRoaXMuZGF0YUZvcm1hdCA9XG4gICAgICAgIGFyZ3MuZGF0YUZvcm1hdCA9PSBudWxsID8gJ2NoYW5uZWxzTGFzdCcgOiBhcmdzLmRhdGFGb3JtYXQ7XG4gICAgY2hlY2tEYXRhRm9ybWF0KHRoaXMuZGF0YUZvcm1hdCk7XG4gICAgdGhpcy5pbnRlcnBvbGF0aW9uID1cbiAgICAgICAgYXJncy5pbnRlcnBvbGF0aW9uID09IG51bGwgPyAnbmVhcmVzdCcgOiBhcmdzLmludGVycG9sYXRpb247XG4gICAgY2hlY2tJbnRlcnBvbGF0aW9uRm9ybWF0KHRoaXMuaW50ZXJwb2xhdGlvbik7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGUpOiBTaGFwZSB7XG4gICAgaWYgKHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICBjb25zdCBoZWlnaHQgPVxuICAgICAgICAgIGlucHV0U2hhcGVbMl0gPT0gbnVsbCA/IG51bGwgOiB0aGlzLnNpemVbMF0gKiBpbnB1dFNoYXBlWzJdO1xuICAgICAgY29uc3Qgd2lkdGggPSBpbnB1dFNoYXBlWzNdID09IG51bGwgPyBudWxsIDogdGhpcy5zaXplWzFdICogaW5wdXRTaGFwZVszXTtcbiAgICAgIHJldHVybiBbaW5wdXRTaGFwZVswXSwgaW5wdXRTaGFwZVsxXSwgaGVpZ2h0LCB3aWR0aF07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGhlaWdodCA9XG4gICAgICAgICAgaW5wdXRTaGFwZVsxXSA9PSBudWxsID8gbnVsbCA6IHRoaXMuc2l6ZVswXSAqIGlucHV0U2hhcGVbMV07XG4gICAgICBjb25zdCB3aWR0aCA9IGlucHV0U2hhcGVbMl0gPT0gbnVsbCA/IG51bGwgOiB0aGlzLnNpemVbMV0gKiBpbnB1dFNoYXBlWzJdO1xuICAgICAgcmV0dXJuIFtpbnB1dFNoYXBlWzBdLCBoZWlnaHQsIHdpZHRoLCBpbnB1dFNoYXBlWzNdXTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRmYy50aWR5KCgpID0+IHtcbiAgICAgIGxldCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKSBhcyBUZW5zb3I0RDtcbiAgICAgIGNvbnN0IGlucHV0U2hhcGUgPSBpbnB1dC5zaGFwZTtcblxuICAgICAgaWYgKHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICAgIGlucHV0ID0gdGZjLnRyYW5zcG9zZShpbnB1dCwgWzAsIDIsIDMsIDFdKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5zaXplWzBdICogaW5wdXRTaGFwZVsyXTtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLnNpemVbMV0gKiBpbnB1dFNoYXBlWzNdO1xuXG4gICAgICAgIGNvbnN0IHJlc2l6ZWQgPSB0aGlzLmludGVycG9sYXRpb24gPT09ICduZWFyZXN0JyA/XG4gICAgICAgICAgICB0ZmMuaW1hZ2UucmVzaXplTmVhcmVzdE5laWdoYm9yKGlucHV0LCBbaGVpZ2h0LCB3aWR0aF0pIDpcbiAgICAgICAgICAgIHRmYy5pbWFnZS5yZXNpemVCaWxpbmVhcihpbnB1dCwgW2hlaWdodCwgd2lkdGhdKTtcbiAgICAgICAgcmV0dXJuIHRmYy50cmFuc3Bvc2UocmVzaXplZCwgWzAsIDMsIDEsIDJdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuc2l6ZVswXSAqIGlucHV0U2hhcGVbMV07XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5zaXplWzFdICogaW5wdXRTaGFwZVsyXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW50ZXJwb2xhdGlvbiA9PT0gJ25lYXJlc3QnID9cbiAgICAgICAgICAgIHRmYy5pbWFnZS5yZXNpemVOZWFyZXN0TmVpZ2hib3IoaW5wdXQsIFtoZWlnaHQsIHdpZHRoXSkgOlxuICAgICAgICAgICAgdGZjLmltYWdlLnJlc2l6ZUJpbGluZWFyKGlucHV0LCBbaGVpZ2h0LCB3aWR0aF0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgICBzaXplOiB0aGlzLnNpemUsXG4gICAgICAgIGRhdGFGb3JtYXQ6IHRoaXMuZGF0YUZvcm1hdCxcbiAgICAgICAgaW50ZXJwb2xhdGlvbjogdGhpcy5pbnRlcnBvbGF0aW9uXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhVcFNhbXBsaW5nMkQpO1xuIl19