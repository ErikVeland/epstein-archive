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
 * TensorFlow.js Layers: Pooling Layers.
 */
import * as tfc from '@tensorflow/tfjs-core';
import { serialization, tidy } from '@tensorflow/tfjs-core';
import { imageDataFormat } from '../backend/common';
import * as K from '../backend/tfjs_backend';
import { checkDataFormat, checkPaddingMode, checkPoolMode } from '../common';
import { InputSpec } from '../engine/topology';
import { Layer } from '../engine/topology';
import { NotImplementedError, ValueError } from '../errors';
import { convOutputLength } from '../utils/conv_utils';
import { assertPositiveInteger } from '../utils/generic_utils';
import { getExactlyOneShape, getExactlyOneTensor } from '../utils/types_utils';
import { preprocessConv2DInput, preprocessConv3DInput } from './convolutional';
/**
 * 2D pooling.
 * @param x
 * @param poolSize
 * @param strides strides. Defaults to [1, 1].
 * @param padding padding. Defaults to 'valid'.
 * @param dataFormat data format. Defaults to 'channelsLast'.
 * @param poolMode Mode of pooling. Defaults to 'max'.
 * @returns Result of the 2D pooling.
 */
export function pool2d(x, poolSize, strides, padding, dataFormat, poolMode) {
    return tidy(() => {
        checkDataFormat(dataFormat);
        checkPoolMode(poolMode);
        checkPaddingMode(padding);
        if (strides == null) {
            strides = [1, 1];
        }
        if (padding == null) {
            padding = 'valid';
        }
        if (dataFormat == null) {
            dataFormat = imageDataFormat();
        }
        if (poolMode == null) {
            poolMode = 'max';
        }
        // TODO(cais): Remove the preprocessing step once deeplearn.js supports
        // dataFormat as an input argument.
        x = preprocessConv2DInput(x, dataFormat); // x is NHWC after preprocessing.
        let y;
        const paddingString = (padding === 'same') ? 'same' : 'valid';
        if (poolMode === 'max') {
            // TODO(cais): Rank check?
            y = tfc.maxPool(x, poolSize, strides, paddingString);
        }
        else { // 'avg'
            // TODO(cais): Check the dtype and rank of x and give clear error message
            //   if those are incorrect.
            y = tfc.avgPool(
            // TODO(cais): Rank check?
            x, poolSize, strides, paddingString);
        }
        if (dataFormat === 'channelsFirst') {
            y = tfc.transpose(y, [0, 3, 1, 2]); // NHWC -> NCHW.
        }
        return y;
    });
}
/**
 * 3D pooling.
 * @param x
 * @param poolSize. Default to [1, 1, 1].
 * @param strides strides. Defaults to [1, 1, 1].
 * @param padding padding. Defaults to 'valid'.
 * @param dataFormat data format. Defaults to 'channelsLast'.
 * @param poolMode Mode of pooling. Defaults to 'max'.
 * @returns Result of the 3D pooling.
 */
export function pool3d(x, poolSize, strides, padding, dataFormat, poolMode) {
    return tidy(() => {
        checkDataFormat(dataFormat);
        checkPoolMode(poolMode);
        checkPaddingMode(padding);
        if (strides == null) {
            strides = [1, 1, 1];
        }
        if (padding == null) {
            padding = 'valid';
        }
        if (dataFormat == null) {
            dataFormat = imageDataFormat();
        }
        if (poolMode == null) {
            poolMode = 'max';
        }
        // x is NDHWC after preprocessing.
        x = preprocessConv3DInput(x, dataFormat);
        let y;
        const paddingString = (padding === 'same') ? 'same' : 'valid';
        if (poolMode === 'max') {
            y = tfc.maxPool3d(x, poolSize, strides, paddingString);
        }
        else { // 'avg'
            y = tfc.avgPool3d(x, poolSize, strides, paddingString);
        }
        if (dataFormat === 'channelsFirst') {
            y = tfc.transpose(y, [0, 4, 1, 2, 3]); // NDHWC -> NCDHW.
        }
        return y;
    });
}
/**
 * Abstract class for different pooling 1D layers.
 */
export class Pooling1D extends Layer {
    /**
     *
     * @param args Parameters for the Pooling layer.
     *
     * config.poolSize defaults to 2.
     */
    constructor(args) {
        if (args.poolSize == null) {
            args.poolSize = 2;
        }
        super(args);
        if (typeof args.poolSize === 'number') {
            this.poolSize = [args.poolSize];
        }
        else if (Array.isArray(args.poolSize) &&
            args.poolSize.length === 1 &&
            typeof args.poolSize[0] === 'number') {
            this.poolSize = args.poolSize;
        }
        else {
            throw new ValueError(`poolSize for 1D convolutional layer must be a number or an ` +
                `Array of a single number, but received ` +
                `${JSON.stringify(args.poolSize)}`);
        }
        assertPositiveInteger(this.poolSize, 'poolSize');
        if (args.strides == null) {
            this.strides = this.poolSize;
        }
        else {
            if (typeof args.strides === 'number') {
                this.strides = [args.strides];
            }
            else if (Array.isArray(args.strides) &&
                args.strides.length === 1 &&
                typeof args.strides[0] === 'number') {
                this.strides = args.strides;
            }
            else {
                throw new ValueError(`strides for 1D convolutional layer must be a number or an ` +
                    `Array of a single number, but received ` +
                    `${JSON.stringify(args.strides)}`);
            }
        }
        assertPositiveInteger(this.strides, 'strides');
        this.padding = args.padding == null ? 'valid' : args.padding;
        checkPaddingMode(this.padding);
        this.inputSpec = [new InputSpec({ ndim: 3 })];
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const length = convOutputLength(inputShape[1], this.poolSize[0], this.padding, this.strides[0]);
        return [inputShape[0], length, inputShape[2]];
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            // Add dummy last dimension.
            inputs = K.expandDims(getExactlyOneTensor(inputs), 2);
            const output = this.poolingFunction(getExactlyOneTensor(inputs), [this.poolSize[0], 1], [this.strides[0], 1], this.padding, 'channelsLast');
            // Remove dummy last dimension.
            return tfc.squeeze(output, [2]);
        });
    }
    getConfig() {
        const config = {
            poolSize: this.poolSize,
            padding: this.padding,
            strides: this.strides,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
class MaxPooling1D extends Pooling1D {
    constructor(args) {
        super(args);
    }
    poolingFunction(inputs, poolSize, strides, padding, dataFormat) {
        checkDataFormat(dataFormat);
        checkPaddingMode(padding);
        return pool2d(inputs, poolSize, strides, padding, dataFormat, 'max');
    }
}
/** @nocollapse */
MaxPooling1D.className = 'MaxPooling1D';
export { MaxPooling1D };
serialization.registerClass(MaxPooling1D);
class AveragePooling1D extends Pooling1D {
    constructor(args) {
        super(args);
    }
    poolingFunction(inputs, poolSize, strides, padding, dataFormat) {
        checkDataFormat(dataFormat);
        checkPaddingMode(padding);
        return pool2d(inputs, poolSize, strides, padding, dataFormat, 'avg');
    }
}
/** @nocollapse */
AveragePooling1D.className = 'AveragePooling1D';
export { AveragePooling1D };
serialization.registerClass(AveragePooling1D);
/**
 * Abstract class for different pooling 2D layers.
 */
export class Pooling2D extends Layer {
    constructor(args) {
        if (args.poolSize == null) {
            args.poolSize = [2, 2];
        }
        super(args);
        this.poolSize = Array.isArray(args.poolSize) ?
            args.poolSize :
            [args.poolSize, args.poolSize];
        if (args.strides == null) {
            this.strides = this.poolSize;
        }
        else if (Array.isArray(args.strides)) {
            if (args.strides.length !== 2) {
                throw new ValueError(`If the strides property of a 2D pooling layer is an Array, ` +
                    `it is expected to have a length of 2, but received length ` +
                    `${args.strides.length}.`);
            }
            this.strides = args.strides;
        }
        else {
            // `config.strides` is a number.
            this.strides = [args.strides, args.strides];
        }
        assertPositiveInteger(this.poolSize, 'poolSize');
        assertPositiveInteger(this.strides, 'strides');
        this.padding = args.padding == null ? 'valid' : args.padding;
        this.dataFormat =
            args.dataFormat == null ? 'channelsLast' : args.dataFormat;
        checkDataFormat(this.dataFormat);
        checkPaddingMode(this.padding);
        this.inputSpec = [new InputSpec({ ndim: 4 })];
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        let rows = this.dataFormat === 'channelsFirst' ? inputShape[2] : inputShape[1];
        let cols = this.dataFormat === 'channelsFirst' ? inputShape[3] : inputShape[2];
        rows =
            convOutputLength(rows, this.poolSize[0], this.padding, this.strides[0]);
        cols =
            convOutputLength(cols, this.poolSize[1], this.padding, this.strides[1]);
        if (this.dataFormat === 'channelsFirst') {
            return [inputShape[0], inputShape[1], rows, cols];
        }
        else {
            return [inputShape[0], rows, cols, inputShape[3]];
        }
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            return this.poolingFunction(getExactlyOneTensor(inputs), this.poolSize, this.strides, this.padding, this.dataFormat);
        });
    }
    getConfig() {
        const config = {
            poolSize: this.poolSize,
            padding: this.padding,
            strides: this.strides,
            dataFormat: this.dataFormat
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
class MaxPooling2D extends Pooling2D {
    constructor(args) {
        super(args);
    }
    poolingFunction(inputs, poolSize, strides, padding, dataFormat) {
        checkDataFormat(dataFormat);
        checkPaddingMode(padding);
        return pool2d(inputs, poolSize, strides, padding, dataFormat, 'max');
    }
}
/** @nocollapse */
MaxPooling2D.className = 'MaxPooling2D';
export { MaxPooling2D };
serialization.registerClass(MaxPooling2D);
class AveragePooling2D extends Pooling2D {
    constructor(args) {
        super(args);
    }
    poolingFunction(inputs, poolSize, strides, padding, dataFormat) {
        checkDataFormat(dataFormat);
        checkPaddingMode(padding);
        return pool2d(inputs, poolSize, strides, padding, dataFormat, 'avg');
    }
}
/** @nocollapse */
AveragePooling2D.className = 'AveragePooling2D';
export { AveragePooling2D };
serialization.registerClass(AveragePooling2D);
/**
 * Abstract class for different pooling 3D layers.
 */
export class Pooling3D extends Layer {
    constructor(args) {
        if (args.poolSize == null) {
            args.poolSize = [2, 2, 2];
        }
        super(args);
        this.poolSize = Array.isArray(args.poolSize) ?
            args.poolSize :
            [args.poolSize, args.poolSize, args.poolSize];
        if (args.strides == null) {
            this.strides = this.poolSize;
        }
        else if (Array.isArray(args.strides)) {
            if (args.strides.length !== 3) {
                throw new ValueError(`If the strides property of a 3D pooling layer is an Array, ` +
                    `it is expected to have a length of 3, but received length ` +
                    `${args.strides.length}.`);
            }
            this.strides = args.strides;
        }
        else {
            // `config.strides` is a number.
            this.strides = [args.strides, args.strides, args.strides];
        }
        assertPositiveInteger(this.poolSize, 'poolSize');
        assertPositiveInteger(this.strides, 'strides');
        this.padding = args.padding == null ? 'valid' : args.padding;
        this.dataFormat =
            args.dataFormat == null ? 'channelsLast' : args.dataFormat;
        checkDataFormat(this.dataFormat);
        checkPaddingMode(this.padding);
        this.inputSpec = [new InputSpec({ ndim: 5 })];
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        let depths = this.dataFormat === 'channelsFirst' ? inputShape[2] : inputShape[1];
        let rows = this.dataFormat === 'channelsFirst' ? inputShape[3] : inputShape[2];
        let cols = this.dataFormat === 'channelsFirst' ? inputShape[4] : inputShape[3];
        depths = convOutputLength(depths, this.poolSize[0], this.padding, this.strides[0]);
        rows =
            convOutputLength(rows, this.poolSize[1], this.padding, this.strides[1]);
        cols =
            convOutputLength(cols, this.poolSize[2], this.padding, this.strides[2]);
        if (this.dataFormat === 'channelsFirst') {
            return [inputShape[0], inputShape[1], depths, rows, cols];
        }
        else {
            return [inputShape[0], depths, rows, cols, inputShape[4]];
        }
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            return this.poolingFunction(getExactlyOneTensor(inputs), this.poolSize, this.strides, this.padding, this.dataFormat);
        });
    }
    getConfig() {
        const config = {
            poolSize: this.poolSize,
            padding: this.padding,
            strides: this.strides,
            dataFormat: this.dataFormat
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
class MaxPooling3D extends Pooling3D {
    constructor(args) {
        super(args);
    }
    poolingFunction(inputs, poolSize, strides, padding, dataFormat) {
        checkDataFormat(dataFormat);
        checkPaddingMode(padding);
        return pool3d(inputs, poolSize, strides, padding, dataFormat, 'max');
    }
}
/** @nocollapse */
MaxPooling3D.className = 'MaxPooling3D';
export { MaxPooling3D };
serialization.registerClass(MaxPooling3D);
class AveragePooling3D extends Pooling3D {
    constructor(args) {
        super(args);
    }
    poolingFunction(inputs, poolSize, strides, padding, dataFormat) {
        checkDataFormat(dataFormat);
        checkPaddingMode(padding);
        return pool3d(inputs, poolSize, strides, padding, dataFormat, 'avg');
    }
}
/** @nocollapse */
AveragePooling3D.className = 'AveragePooling3D';
export { AveragePooling3D };
serialization.registerClass(AveragePooling3D);
/**
 * Abstract class for different global pooling 1D layers.
 */
export class GlobalPooling1D extends Layer {
    constructor(args) {
        super(args);
        this.inputSpec = [new InputSpec({ ndim: 3 })];
    }
    computeOutputShape(inputShape) {
        return [inputShape[0], inputShape[2]];
    }
    call(inputs, kwargs) {
        throw new NotImplementedError();
    }
}
class GlobalAveragePooling1D extends GlobalPooling1D {
    constructor(args) {
        super(args || {});
    }
    call(inputs, kwargs) {
        return tidy(() => {
            const input = getExactlyOneTensor(inputs);
            return tfc.mean(input, 1);
        });
    }
}
/** @nocollapse */
GlobalAveragePooling1D.className = 'GlobalAveragePooling1D';
export { GlobalAveragePooling1D };
serialization.registerClass(GlobalAveragePooling1D);
class GlobalMaxPooling1D extends GlobalPooling1D {
    constructor(args) {
        super(args || {});
    }
    call(inputs, kwargs) {
        return tidy(() => {
            const input = getExactlyOneTensor(inputs);
            return tfc.max(input, 1);
        });
    }
}
/** @nocollapse */
GlobalMaxPooling1D.className = 'GlobalMaxPooling1D';
export { GlobalMaxPooling1D };
serialization.registerClass(GlobalMaxPooling1D);
/**
 * Abstract class for different global pooling 2D layers.
 */
export class GlobalPooling2D extends Layer {
    constructor(args) {
        super(args);
        this.dataFormat =
            args.dataFormat == null ? 'channelsLast' : args.dataFormat;
        checkDataFormat(this.dataFormat);
        this.inputSpec = [new InputSpec({ ndim: 4 })];
    }
    computeOutputShape(inputShape) {
        inputShape = inputShape;
        if (this.dataFormat === 'channelsLast') {
            return [inputShape[0], inputShape[3]];
        }
        else {
            return [inputShape[0], inputShape[1]];
        }
    }
    call(inputs, kwargs) {
        throw new NotImplementedError();
    }
    getConfig() {
        const config = { dataFormat: this.dataFormat };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
class GlobalAveragePooling2D extends GlobalPooling2D {
    call(inputs, kwargs) {
        return tidy(() => {
            const input = getExactlyOneTensor(inputs);
            if (this.dataFormat === 'channelsLast') {
                return tfc.mean(input, [1, 2]);
            }
            else {
                return tfc.mean(input, [2, 3]);
            }
        });
    }
}
/** @nocollapse */
GlobalAveragePooling2D.className = 'GlobalAveragePooling2D';
export { GlobalAveragePooling2D };
serialization.registerClass(GlobalAveragePooling2D);
class GlobalMaxPooling2D extends GlobalPooling2D {
    call(inputs, kwargs) {
        return tidy(() => {
            const input = getExactlyOneTensor(inputs);
            if (this.dataFormat === 'channelsLast') {
                return tfc.max(input, [1, 2]);
            }
            else {
                return tfc.max(input, [2, 3]);
            }
        });
    }
}
/** @nocollapse */
GlobalMaxPooling2D.className = 'GlobalMaxPooling2D';
export { GlobalMaxPooling2D };
serialization.registerClass(GlobalMaxPooling2D);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvcG9vbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVIOztHQUVHO0FBRUgsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUMsYUFBYSxFQUF3QyxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUVoRyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDbEQsT0FBTyxLQUFLLENBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM3QyxPQUFPLEVBQUMsZUFBZSxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMzRSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLEtBQUssRUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBQ3BELE9BQU8sRUFBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHMUQsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDN0QsT0FBTyxFQUFDLGtCQUFrQixFQUFFLG1CQUFtQixFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFFN0UsT0FBTyxFQUFDLHFCQUFxQixFQUFFLHFCQUFxQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFN0U7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FDbEIsQ0FBUyxFQUFFLFFBQTBCLEVBQUUsT0FBMEIsRUFDakUsT0FBcUIsRUFBRSxVQUF1QixFQUM5QyxRQUFtQjtJQUNyQixPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDZixlQUFlLENBQUMsVUFB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Q0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBWkQsa0JBQWtCO0FBQ1gsZ0NBQVMsR0FBRyx3QkFBd0IsQ0FBQztTQUZqQyxzQkFBc0I7QUFlbkMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBRXBELE1BQWEsa0JBQW1CLFNBQVEsZUFBZTtJQUk1QyxJQUFJLENBQUMsTUFBdUIsRUFBRSxNQUFjO1FBQ25ELE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNmLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxjQUFjLEVBQUU7Z0JBQ3RDLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMvQjtpQkFBTTtnQkFDTCxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDL0I7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBWkQsa0JBQWtCO0FBQ1gsNEJBQVMsR0FBRyxvQkFBb0IsQ0FBQztTQUY3QixrQkFBa0I7QUFlL0IsYUFBYSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiBUZW5zb3JGbG93LmpzIExheWVyczogUG9vbGluZyBMYXllcnMuXG4gKi9cblxuaW1wb3J0ICogYXMgdGZjIGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5pbXBvcnQge3NlcmlhbGl6YXRpb24sIFRlbnNvciwgVGVuc29yM0QsIFRlbnNvcjRELCBUZW5zb3I1RCwgdGlkeX0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHtpbWFnZURhdGFGb3JtYXR9IGZyb20gJy4uL2JhY2tlbmQvY29tbW9uJztcbmltcG9ydCAqIGFzIEsgZnJvbSAnLi4vYmFja2VuZC90ZmpzX2JhY2tlbmQnO1xuaW1wb3J0IHtjaGVja0RhdGFGb3JtYXQsIGNoZWNrUGFkZGluZ01vZGUsIGNoZWNrUG9vbE1vZGV9IGZyb20gJy4uL2NvbW1vbic7XG5pbXBvcnQge0lucHV0U3BlY30gZnJvbSAnLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7TGF5ZXIsIExheWVyQXJnc30gZnJvbSAnLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7Tm90SW1wbGVtZW50ZWRFcnJvciwgVmFsdWVFcnJvcn0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7RGF0YUZvcm1hdCwgUGFkZGluZ01vZGUsIFBvb2xNb2RlLCBTaGFwZX0gZnJvbSAnLi4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQge0t3YXJnc30gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtjb252T3V0cHV0TGVuZ3RofSBmcm9tICcuLi91dGlscy9jb252X3V0aWxzJztcbmltcG9ydCB7YXNzZXJ0UG9zaXRpdmVJbnRlZ2VyfSBmcm9tICcuLi91dGlscy9nZW5lcmljX3V0aWxzJztcbmltcG9ydCB7Z2V0RXhhY3RseU9uZVNoYXBlLCBnZXRFeGFjdGx5T25lVGVuc29yfSBmcm9tICcuLi91dGlscy90eXBlc191dGlscyc7XG5cbmltcG9ydCB7cHJlcHJvY2Vzc0NvbnYyRElucHV0LCBwcmVwcm9jZXNzQ29udjNESW5wdXR9IGZyb20gJy4vY29udm9sdXRpb25hbCc7XG5cbi8qKlxuICogMkQgcG9vbGluZy5cbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0gcG9vbFNpemVcbiAqIEBwYXJhbSBzdHJpZGVzIHN0cmlkZXMuIERlZmF1bHRzIHRvIFsxLCAxXS5cbiAqIEBwYXJhbSBwYWRkaW5nIHBhZGRpbmcuIERlZmF1bHRzIHRvICd2YWxpZCcuXG4gKiBAcGFyYW0gZGF0YUZvcm1hdCBkYXRhIGZvcm1hdC4gRGVmYXVsdHMgdG8gJ2NoYW5uZWxzTGFzdCcuXG4gKiBAcGFyYW0gcG9vbE1vZGUgTW9kZSBvZiBwb29saW5nLiBEZWZhdWx0cyB0byAnbWF4Jy5cbiAqIEByZXR1cm5zIFJlc3VsdCBvZiB0aGUgMkQgcG9vbGluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvb2wyZChcbiAgICB4OiBUZW5zb3IsIHBvb2xTaXplOiBbbnVtYmVyLCBudW1iZXJdLCBzdHJpZGVzPzogW251bWJlciwgbnVtYmVyXSxcbiAgICBwYWRkaW5nPzogUGFkZGluZ01vZGUsIGRhdGFGb3JtYXQ/OiBEYXRhRm9ybWF0LFxuICAgIHBvb2xNb2RlPzogUG9vbE1vZGUpOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUG9vbE1vZGUocG9vbE1vZGUpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUocGFkZGluZyk7XG4gICAgaWYgKHN0cmlkZXMgPT0gbnVsbCkge1xuICAgICAgc3RyaWRlcyA9IFsxLCAxXTtcbiAgICB9XG4gICAgaWYgKHBhZGRpbmcgPT0gbnVsbCkge1xuICAgICAgcGFkZGluZyA9ICd2YWxpZCc7XG4gICAgfVxuICAgIGlmIChkYXRhRm9ybWF0ID09IG51bGwpIHtcbiAgICAgIGRhdGFGb3JtYXQgPSBpbWFnZURhdGFGb3JtYXQoKTtcbiAgICB9XG4gICAgaWYgKHBvb2xNb2RlID09IG51bGwpIHtcbiAgICAgIHBvb2xNb2RlID0gJ21heCc7XG4gICAgfVxuXG4gICAgLy8gVE9ETyhjYWlzKTogUmVtb3ZlIHRoZSBwcmVwcm9jZXNzaW5nIHN0ZXAgb25jZSBkZWVwbGVhcm4uanMgc3VwcG9ydHNcbiAgICAvLyBkYXRhRm9ybWF0IGFzIGFuIGlucHV0IGFyZ3VtZW50LlxuICAgIHggPSBwcmVwcm9jZXNzQ29udjJESW5wdXQoeCwgZGF0YUZvcm1hdCk7ICAvLyB4IGlzIE5IV0MgYWZ0ZXIgcHJlcHJvY2Vzc2luZy5cbiAgICBsZXQgeTogVGVuc29yO1xuICAgIGNvbnN0IHBhZGRpbmdTdHJpbmcgPSAocGFkZGluZyA9PT0gJ3NhbWUnKSA/ICdzYW1lJyA6ICd2YWxpZCc7XG4gICAgaWYgKHBvb2xNb2RlID09PSAnbWF4Jykge1xuICAgICAgLy8gVE9ETyhjYWlzKTogUmFuayBjaGVjaz9cbiAgICAgIHkgPSB0ZmMubWF4UG9vbCh4IGFzIFRlbnNvcjRELCBwb29sU2l6ZSwgc3RyaWRlcywgcGFkZGluZ1N0cmluZyk7XG4gICAgfSBlbHNlIHsgIC8vICdhdmcnXG4gICAgICAvLyBUT0RPKGNhaXMpOiBDaGVjayB0aGUgZHR5cGUgYW5kIHJhbmsgb2YgeCBhbmQgZ2l2ZSBjbGVhciBlcnJvciBtZXNzYWdlXG4gICAgICAvLyAgIGlmIHRob3NlIGFyZSBpbmNvcnJlY3QuXG4gICAgICB5ID0gdGZjLmF2Z1Bvb2woXG4gICAgICAgICAgLy8gVE9ETyhjYWlzKTogUmFuayBjaGVjaz9cbiAgICAgICAgICB4IGFzIFRlbnNvcjNEIHwgVGVuc29yNEQsIHBvb2xTaXplLCBzdHJpZGVzLCBwYWRkaW5nU3RyaW5nKTtcbiAgICB9XG4gICAgaWYgKGRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0Jykge1xuICAgICAgeSA9IHRmYy50cmFuc3Bvc2UoeSwgWzAsIDMsIDEsIDJdKTsgIC8vIE5IV0MgLT4gTkNIVy5cbiAgICB9XG4gICAgcmV0dXJuIHk7XG4gIH0pO1xufVxuXG4vKipcbiAqIDNEIHBvb2xpbmcuXG4gKiBAcGFyYW0geFxuICogQHBhcmFtIHBvb2xTaXplLiBEZWZhdWx0IHRvIFsxLCAxLCAxXS5cbiAqIEBwYXJhbSBzdHJpZGVzIHN0cmlkZXMuIERlZmF1bHRzIHRvIFsxLCAxLCAxXS5cbiAqIEBwYXJhbSBwYWRkaW5nIHBhZGRpbmcuIERlZmF1bHRzIHRvICd2YWxpZCcuXG4gKiBAcGFyYW0gZGF0YUZvcm1hdCBkYXRhIGZvcm1hdC4gRGVmYXVsdHMgdG8gJ2NoYW5uZWxzTGFzdCcuXG4gKiBAcGFyYW0gcG9vbE1vZGUgTW9kZSBvZiBwb29saW5nLiBEZWZhdWx0cyB0byAnbWF4Jy5cbiAqIEByZXR1cm5zIFJlc3VsdCBvZiB0aGUgM0QgcG9vbGluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvb2wzZChcbiAgICB4OiBUZW5zb3I1RCwgcG9vbFNpemU6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSxcbiAgICBzdHJpZGVzPzogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBwYWRkaW5nPzogUGFkZGluZ01vZGUsXG4gICAgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQsIHBvb2xNb2RlPzogUG9vbE1vZGUpOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUG9vbE1vZGUocG9vbE1vZGUpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUocGFkZGluZyk7XG4gICAgaWYgKHN0cmlkZXMgPT0gbnVsbCkge1xuICAgICAgc3RyaWRlcyA9IFsxLCAxLCAxXTtcbiAgICB9XG4gICAgaWYgKHBhZGRpbmcgPT0gbnVsbCkge1xuICAgICAgcGFkZGluZyA9ICd2YWxpZCc7XG4gICAgfVxuICAgIGlmIChkYXRhRm9ybWF0ID09IG51bGwpIHtcbiAgICAgIGRhdGFGb3JtYXQgPSBpbWFnZURhdGFGb3JtYXQoKTtcbiAgICB9XG4gICAgaWYgKHBvb2xNb2RlID09IG51bGwpIHtcbiAgICAgIHBvb2xNb2RlID0gJ21heCc7XG4gICAgfVxuXG4gICAgLy8geCBpcyBOREhXQyBhZnRlciBwcmVwcm9jZXNzaW5nLlxuICAgIHggPSBwcmVwcm9jZXNzQ29udjNESW5wdXQoeCBhcyBUZW5zb3IsIGRhdGFGb3JtYXQpIGFzIFRlbnNvcjVEO1xuICAgIGxldCB5OiBUZW5zb3I7XG4gICAgY29uc3QgcGFkZGluZ1N0cmluZyA9IChwYWRkaW5nID09PSAnc2FtZScpID8gJ3NhbWUnIDogJ3ZhbGlkJztcbiAgICBpZiAocG9vbE1vZGUgPT09ICdtYXgnKSB7XG4gICAgICB5ID0gdGZjLm1heFBvb2wzZCh4LCBwb29sU2l6ZSwgc3RyaWRlcywgcGFkZGluZ1N0cmluZyk7XG4gICAgfSBlbHNlIHsgIC8vICdhdmcnXG4gICAgICB5ID0gdGZjLmF2Z1Bvb2wzZCh4LCBwb29sU2l6ZSwgc3RyaWRlcywgcGFkZGluZ1N0cmluZyk7XG4gICAgfVxuICAgIGlmIChkYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcpIHtcbiAgICAgIHkgPSB0ZmMudHJhbnNwb3NlKHksIFswLCA0LCAxLCAyLCAzXSk7ICAvLyBOREhXQyAtPiBOQ0RIVy5cbiAgICB9XG4gICAgcmV0dXJuIHk7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgUG9vbGluZzFETGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIFNpemUgb2YgdGhlIHdpbmRvdyB0byBwb29sIG92ZXIsIHNob3VsZCBiZSBhbiBpbnRlZ2VyLlxuICAgKi9cbiAgcG9vbFNpemU/OiBudW1iZXJ8W251bWJlcl07XG4gIC8qKlxuICAgKiBQZXJpb2QgYXQgd2hpY2ggdG8gc2FtcGxlIHRoZSBwb29sZWQgdmFsdWVzLlxuICAgKlxuICAgKiBJZiBgbnVsbGAsIGRlZmF1bHRzIHRvIGBwb29sU2l6ZWAuXG4gICAqL1xuICBzdHJpZGVzPzogbnVtYmVyfFtudW1iZXJdO1xuICAvKiogSG93IHRvIGZpbGwgaW4gZGF0YSB0aGF0J3Mgbm90IGFuIGludGVnZXIgbXVsdGlwbGUgb2YgcG9vbFNpemUuICovXG4gIHBhZGRpbmc/OiBQYWRkaW5nTW9kZTtcbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBjbGFzcyBmb3IgZGlmZmVyZW50IHBvb2xpbmcgMUQgbGF5ZXJzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUG9vbGluZzFEIGV4dGVuZHMgTGF5ZXIge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcG9vbFNpemU6IFtudW1iZXJdO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc3RyaWRlczogW251bWJlcl07XG4gIHByb3RlY3RlZCByZWFkb25seSBwYWRkaW5nOiBQYWRkaW5nTW9kZTtcblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGFyZ3MgUGFyYW1ldGVycyBmb3IgdGhlIFBvb2xpbmcgbGF5ZXIuXG4gICAqXG4gICAqIGNvbmZpZy5wb29sU2l6ZSBkZWZhdWx0cyB0byAyLlxuICAgKi9cbiAgY29uc3RydWN0b3IoYXJnczogUG9vbGluZzFETGF5ZXJBcmdzKSB7XG4gICAgaWYgKGFyZ3MucG9vbFNpemUgPT0gbnVsbCkge1xuICAgICAgYXJncy5wb29sU2l6ZSA9IDI7XG4gICAgfVxuICAgIHN1cGVyKGFyZ3MpO1xuICAgIGlmICh0eXBlb2YgYXJncy5wb29sU2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHRoaXMucG9vbFNpemUgPSBbYXJncy5wb29sU2l6ZV07XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgQXJyYXkuaXNBcnJheShhcmdzLnBvb2xTaXplKSAmJlxuICAgICAgICAoYXJncy5wb29sU2l6ZSBhcyBudW1iZXJbXSkubGVuZ3RoID09PSAxICYmXG4gICAgICAgIHR5cGVvZiAoYXJncy5wb29sU2l6ZSBhcyBudW1iZXJbXSlbMF0gPT09ICdudW1iZXInKSB7XG4gICAgICB0aGlzLnBvb2xTaXplID0gYXJncy5wb29sU2l6ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYHBvb2xTaXplIGZvciAxRCBjb252b2x1dGlvbmFsIGxheWVyIG11c3QgYmUgYSBudW1iZXIgb3IgYW4gYCArXG4gICAgICAgICAgYEFycmF5IG9mIGEgc2luZ2xlIG51bWJlciwgYnV0IHJlY2VpdmVkIGAgK1xuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGFyZ3MucG9vbFNpemUpfWApO1xuICAgIH1cbiAgICBhc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy5wb29sU2l6ZSwgJ3Bvb2xTaXplJyk7XG4gICAgaWYgKGFyZ3Muc3RyaWRlcyA9PSBudWxsKSB7XG4gICAgICB0aGlzLnN0cmlkZXMgPSB0aGlzLnBvb2xTaXplO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIGFyZ3Muc3RyaWRlcyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhpcy5zdHJpZGVzID0gW2FyZ3Muc3RyaWRlc107XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIEFycmF5LmlzQXJyYXkoYXJncy5zdHJpZGVzKSAmJlxuICAgICAgICAgIChhcmdzLnN0cmlkZXMgYXMgbnVtYmVyW10pLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgICAgIHR5cGVvZiAoYXJncy5zdHJpZGVzIGFzIG51bWJlcltdKVswXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhpcy5zdHJpZGVzID0gYXJncy5zdHJpZGVzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICBgc3RyaWRlcyBmb3IgMUQgY29udm9sdXRpb25hbCBsYXllciBtdXN0IGJlIGEgbnVtYmVyIG9yIGFuIGAgK1xuICAgICAgICAgICAgYEFycmF5IG9mIGEgc2luZ2xlIG51bWJlciwgYnV0IHJlY2VpdmVkIGAgK1xuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkoYXJncy5zdHJpZGVzKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXNzZXJ0UG9zaXRpdmVJbnRlZ2VyKHRoaXMuc3RyaWRlcywgJ3N0cmlkZXMnKTtcblxuICAgIHRoaXMucGFkZGluZyA9IGFyZ3MucGFkZGluZyA9PSBudWxsID8gJ3ZhbGlkJyA6IGFyZ3MucGFkZGluZztcbiAgICBjaGVja1BhZGRpbmdNb2RlKHRoaXMucGFkZGluZyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbbmV3IElucHV0U3BlYyh7bmRpbTogM30pXTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogU2hhcGV8U2hhcGVbXSB7XG4gICAgaW5wdXRTaGFwZSA9IGdldEV4YWN0bHlPbmVTaGFwZShpbnB1dFNoYXBlKTtcbiAgICBjb25zdCBsZW5ndGggPSBjb252T3V0cHV0TGVuZ3RoKFxuICAgICAgICBpbnB1dFNoYXBlWzFdLCB0aGlzLnBvb2xTaXplWzBdLCB0aGlzLnBhZGRpbmcsIHRoaXMuc3RyaWRlc1swXSk7XG4gICAgcmV0dXJuIFtpbnB1dFNoYXBlWzBdLCBsZW5ndGgsIGlucHV0U2hhcGVbMl1dO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IHBvb2xpbmdGdW5jdGlvbihcbiAgICAgIGlucHV0czogVGVuc29yLCBwb29sU2l6ZTogW251bWJlciwgbnVtYmVyXSwgc3RyaWRlczogW251bWJlciwgbnVtYmVyXSxcbiAgICAgIHBhZGRpbmc6IFBhZGRpbmdNb2RlLCBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0KTogVGVuc29yO1xuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICB0aGlzLmludm9rZUNhbGxIb29rKGlucHV0cywga3dhcmdzKTtcbiAgICAgIC8vIEFkZCBkdW1teSBsYXN0IGRpbWVuc2lvbi5cbiAgICAgIGlucHV0cyA9IEsuZXhwYW5kRGltcyhnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyksIDIpO1xuICAgICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5wb29saW5nRnVuY3Rpb24oXG4gICAgICAgICAgZ2V0RXhhY3RseU9uZVRlbnNvcihpbnB1dHMpLCBbdGhpcy5wb29sU2l6ZVswXSwgMV0sXG4gICAgICAgICAgW3RoaXMuc3RyaWRlc1swXSwgMV0sIHRoaXMucGFkZGluZywgJ2NoYW5uZWxzTGFzdCcpO1xuICAgICAgLy8gUmVtb3ZlIGR1bW15IGxhc3QgZGltZW5zaW9uLlxuICAgICAgcmV0dXJuIHRmYy5zcXVlZXplKG91dHB1dCwgWzJdKTtcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgIHBvb2xTaXplOiB0aGlzLnBvb2xTaXplLFxuICAgICAgcGFkZGluZzogdGhpcy5wYWRkaW5nLFxuICAgICAgc3RyaWRlczogdGhpcy5zdHJpZGVzLFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXhQb29saW5nMUQgZXh0ZW5kcyBQb29saW5nMUQge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdNYXhQb29saW5nMUQnO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBQb29saW5nMURMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwb29saW5nRnVuY3Rpb24oXG4gICAgICBpbnB1dHM6IFRlbnNvciwgcG9vbFNpemU6IFtudW1iZXIsIG51bWJlcl0sIHN0cmlkZXM6IFtudW1iZXIsIG51bWJlcl0sXG4gICAgICBwYWRkaW5nOiBQYWRkaW5nTW9kZSwgZGF0YUZvcm1hdDogRGF0YUZvcm1hdCk6IFRlbnNvciB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUocGFkZGluZyk7XG4gICAgcmV0dXJuIHBvb2wyZChpbnB1dHMsIHBvb2xTaXplLCBzdHJpZGVzLCBwYWRkaW5nLCBkYXRhRm9ybWF0LCAnbWF4Jyk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhNYXhQb29saW5nMUQpO1xuXG5leHBvcnQgY2xhc3MgQXZlcmFnZVBvb2xpbmcxRCBleHRlbmRzIFBvb2xpbmcxRCB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0F2ZXJhZ2VQb29saW5nMUQnO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBQb29saW5nMURMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwb29saW5nRnVuY3Rpb24oXG4gICAgICBpbnB1dHM6IFRlbnNvciwgcG9vbFNpemU6IFtudW1iZXIsIG51bWJlcl0sIHN0cmlkZXM6IFtudW1iZXIsIG51bWJlcl0sXG4gICAgICBwYWRkaW5nOiBQYWRkaW5nTW9kZSwgZGF0YUZvcm1hdDogRGF0YUZvcm1hdCk6IFRlbnNvciB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUocGFkZGluZyk7XG4gICAgcmV0dXJuIHBvb2wyZChpbnB1dHMsIHBvb2xTaXplLCBzdHJpZGVzLCBwYWRkaW5nLCBkYXRhRm9ybWF0LCAnYXZnJyk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhBdmVyYWdlUG9vbGluZzFEKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFBvb2xpbmcyRExheWVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBGYWN0b3JzIGJ5IHdoaWNoIHRvIGRvd25zY2FsZSBpbiBlYWNoIGRpbWVuc2lvbiBbdmVydGljYWwsIGhvcml6b250YWxdLlxuICAgKiBFeHBlY3RzIGFuIGludGVnZXIgb3IgYW4gYXJyYXkgb2YgMiBpbnRlZ2Vycy5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGBbMiwgMl1gIHdpbGwgaGFsdmUgdGhlIGlucHV0IGluIGJvdGggc3BhdGlhbCBkaW1lbnNpb25zLlxuICAgKiBJZiBvbmx5IG9uZSBpbnRlZ2VyIGlzIHNwZWNpZmllZCwgdGhlIHNhbWUgd2luZG93IGxlbmd0aFxuICAgKiB3aWxsIGJlIHVzZWQgZm9yIGJvdGggZGltZW5zaW9ucy5cbiAgICovXG4gIHBvb2xTaXplPzogbnVtYmVyfFtudW1iZXIsIG51bWJlcl07XG5cbiAgLyoqXG4gICAqIFRoZSBzaXplIG9mIHRoZSBzdHJpZGUgaW4gZWFjaCBkaW1lbnNpb24gb2YgdGhlIHBvb2xpbmcgd2luZG93LiBFeHBlY3RzXG4gICAqIGFuIGludGVnZXIgb3IgYW4gYXJyYXkgb2YgMiBpbnRlZ2Vycy4gSW50ZWdlciwgdHVwbGUgb2YgMiBpbnRlZ2Vycywgb3JcbiAgICogTm9uZS5cbiAgICpcbiAgICogSWYgYG51bGxgLCBkZWZhdWx0cyB0byBgcG9vbFNpemVgLlxuICAgKi9cbiAgc3RyaWRlcz86IG51bWJlcnxbbnVtYmVyLCBudW1iZXJdO1xuXG4gIC8qKiBUaGUgcGFkZGluZyB0eXBlIHRvIHVzZSBmb3IgdGhlIHBvb2xpbmcgbGF5ZXIuICovXG4gIHBhZGRpbmc/OiBQYWRkaW5nTW9kZTtcbiAgLyoqIFRoZSBkYXRhIGZvcm1hdCB0byB1c2UgZm9yIHRoZSBwb29saW5nIGxheWVyLiAqL1xuICBkYXRhRm9ybWF0PzogRGF0YUZvcm1hdDtcbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBjbGFzcyBmb3IgZGlmZmVyZW50IHBvb2xpbmcgMkQgbGF5ZXJzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUG9vbGluZzJEIGV4dGVuZHMgTGF5ZXIge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcG9vbFNpemU6IFtudW1iZXIsIG51bWJlcl07XG4gIHByb3RlY3RlZCByZWFkb25seSBzdHJpZGVzOiBbbnVtYmVyLCBudW1iZXJdO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcGFkZGluZzogUGFkZGluZ01vZGU7XG4gIHByb3RlY3RlZCByZWFkb25seSBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0O1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFBvb2xpbmcyRExheWVyQXJncykge1xuICAgIGlmIChhcmdzLnBvb2xTaXplID09IG51bGwpIHtcbiAgICAgIGFyZ3MucG9vbFNpemUgPSBbMiwgMl07XG4gICAgfVxuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMucG9vbFNpemUgPSBBcnJheS5pc0FycmF5KGFyZ3MucG9vbFNpemUpID9cbiAgICAgICAgYXJncy5wb29sU2l6ZSA6XG4gICAgICAgIFthcmdzLnBvb2xTaXplLCBhcmdzLnBvb2xTaXplXTtcbiAgICBpZiAoYXJncy5zdHJpZGVzID09IG51bGwpIHtcbiAgICAgIHRoaXMuc3RyaWRlcyA9IHRoaXMucG9vbFNpemU7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFyZ3Muc3RyaWRlcykpIHtcbiAgICAgIGlmIChhcmdzLnN0cmlkZXMubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYElmIHRoZSBzdHJpZGVzIHByb3BlcnR5IG9mIGEgMkQgcG9vbGluZyBsYXllciBpcyBhbiBBcnJheSwgYCArXG4gICAgICAgICAgICBgaXQgaXMgZXhwZWN0ZWQgdG8gaGF2ZSBhIGxlbmd0aCBvZiAyLCBidXQgcmVjZWl2ZWQgbGVuZ3RoIGAgK1xuICAgICAgICAgICAgYCR7YXJncy5zdHJpZGVzLmxlbmd0aH0uYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnN0cmlkZXMgPSBhcmdzLnN0cmlkZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGBjb25maWcuc3RyaWRlc2AgaXMgYSBudW1iZXIuXG4gICAgICB0aGlzLnN0cmlkZXMgPSBbYXJncy5zdHJpZGVzLCBhcmdzLnN0cmlkZXNdO1xuICAgIH1cbiAgICBhc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy5wb29sU2l6ZSwgJ3Bvb2xTaXplJyk7XG4gICAgYXNzZXJ0UG9zaXRpdmVJbnRlZ2VyKHRoaXMuc3RyaWRlcywgJ3N0cmlkZXMnKTtcbiAgICB0aGlzLnBhZGRpbmcgPSBhcmdzLnBhZGRpbmcgPT0gbnVsbCA/ICd2YWxpZCcgOiBhcmdzLnBhZGRpbmc7XG4gICAgdGhpcy5kYXRhRm9ybWF0ID1cbiAgICAgICAgYXJncy5kYXRhRm9ybWF0ID09IG51bGwgPyAnY2hhbm5lbHNMYXN0JyA6IGFyZ3MuZGF0YUZvcm1hdDtcbiAgICBjaGVja0RhdGFGb3JtYXQodGhpcy5kYXRhRm9ybWF0KTtcbiAgICBjaGVja1BhZGRpbmdNb2RlKHRoaXMucGFkZGluZyk7XG5cbiAgICB0aGlzLmlucHV0U3BlYyA9IFtuZXcgSW5wdXRTcGVjKHtuZGltOiA0fSldO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuICAgIGxldCByb3dzID1cbiAgICAgICAgdGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcgPyBpbnB1dFNoYXBlWzJdIDogaW5wdXRTaGFwZVsxXTtcbiAgICBsZXQgY29scyA9XG4gICAgICAgIHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnID8gaW5wdXRTaGFwZVszXSA6IGlucHV0U2hhcGVbMl07XG4gICAgcm93cyA9XG4gICAgICAgIGNvbnZPdXRwdXRMZW5ndGgocm93cywgdGhpcy5wb29sU2l6ZVswXSwgdGhpcy5wYWRkaW5nLCB0aGlzLnN0cmlkZXNbMF0pO1xuICAgIGNvbHMgPVxuICAgICAgICBjb252T3V0cHV0TGVuZ3RoKGNvbHMsIHRoaXMucG9vbFNpemVbMV0sIHRoaXMucGFkZGluZywgdGhpcy5zdHJpZGVzWzFdKTtcbiAgICBpZiAodGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcpIHtcbiAgICAgIHJldHVybiBbaW5wdXRTaGFwZVswXSwgaW5wdXRTaGFwZVsxXSwgcm93cywgY29sc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbaW5wdXRTaGFwZVswXSwgcm93cywgY29scywgaW5wdXRTaGFwZVszXV07XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IHBvb2xpbmdGdW5jdGlvbihcbiAgICAgIGlucHV0czogVGVuc29yLCBwb29sU2l6ZTogW251bWJlciwgbnVtYmVyXSwgc3RyaWRlczogW251bWJlciwgbnVtYmVyXSxcbiAgICAgIHBhZGRpbmc6IFBhZGRpbmdNb2RlLCBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0KTogVGVuc29yO1xuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICB0aGlzLmludm9rZUNhbGxIb29rKGlucHV0cywga3dhcmdzKTtcbiAgICAgIHJldHVybiB0aGlzLnBvb2xpbmdGdW5jdGlvbihcbiAgICAgICAgICBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyksIHRoaXMucG9vbFNpemUsIHRoaXMuc3RyaWRlcyxcbiAgICAgICAgICB0aGlzLnBhZGRpbmcsIHRoaXMuZGF0YUZvcm1hdCk7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICBwb29sU2l6ZTogdGhpcy5wb29sU2l6ZSxcbiAgICAgIHBhZGRpbmc6IHRoaXMucGFkZGluZyxcbiAgICAgIHN0cmlkZXM6IHRoaXMuc3RyaWRlcyxcbiAgICAgIGRhdGFGb3JtYXQ6IHRoaXMuZGF0YUZvcm1hdFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXhQb29saW5nMkQgZXh0ZW5kcyBQb29saW5nMkQge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdNYXhQb29saW5nMkQnO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBQb29saW5nMkRMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwb29saW5nRnVuY3Rpb24oXG4gICAgICBpbnB1dHM6IFRlbnNvciwgcG9vbFNpemU6IFtudW1iZXIsIG51bWJlcl0sIHN0cmlkZXM6IFtudW1iZXIsIG51bWJlcl0sXG4gICAgICBwYWRkaW5nOiBQYWRkaW5nTW9kZSwgZGF0YUZvcm1hdDogRGF0YUZvcm1hdCk6IFRlbnNvciB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUocGFkZGluZyk7XG4gICAgcmV0dXJuIHBvb2wyZChpbnB1dHMsIHBvb2xTaXplLCBzdHJpZGVzLCBwYWRkaW5nLCBkYXRhRm9ybWF0LCAnbWF4Jyk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhNYXhQb29saW5nMkQpO1xuXG5leHBvcnQgY2xhc3MgQXZlcmFnZVBvb2xpbmcyRCBleHRlbmRzIFBvb2xpbmcyRCB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0F2ZXJhZ2VQb29saW5nMkQnO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBQb29saW5nMkRMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwb29saW5nRnVuY3Rpb24oXG4gICAgICBpbnB1dHM6IFRlbnNvciwgcG9vbFNpemU6IFtudW1iZXIsIG51bWJlcl0sIHN0cmlkZXM6IFtudW1iZXIsIG51bWJlcl0sXG4gICAgICBwYWRkaW5nOiBQYWRkaW5nTW9kZSwgZGF0YUZvcm1hdDogRGF0YUZvcm1hdCk6IFRlbnNvciB7XG4gICAgY2hlY2tEYXRhRm9ybWF0KGRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUocGFkZGluZyk7XG4gICAgcmV0dXJuIHBvb2wyZChpbnB1dHMsIHBvb2xTaXplLCBzdHJpZGVzLCBwYWRkaW5nLCBkYXRhRm9ybWF0LCAnYXZnJyk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhBdmVyYWdlUG9vbGluZzJEKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFBvb2xpbmczRExheWVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBGYWN0b3JzIGJ5IHdoaWNoIHRvIGRvd25zY2FsZSBpbiBlYWNoIGRpbWVuc2lvbiBbZGVwdGgsIGhlaWdodCwgd2lkdGhdLlxuICAgKiBFeHBlY3RzIGFuIGludGVnZXIgb3IgYW4gYXJyYXkgb2YgMyBpbnRlZ2Vycy5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGBbMiwgMiwgMl1gIHdpbGwgaGFsdmUgdGhlIGlucHV0IGluIHRocmVlIGRpbWVuc2lvbnMuXG4gICAqIElmIG9ubHkgb25lIGludGVnZXIgaXMgc3BlY2lmaWVkLCB0aGUgc2FtZSB3aW5kb3cgbGVuZ3RoXG4gICAqIHdpbGwgYmUgdXNlZCBmb3IgYWxsIGRpbWVuc2lvbnMuXG4gICAqL1xuICBwb29sU2l6ZT86IG51bWJlcnxbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG5cbiAgLyoqXG4gICAqIFRoZSBzaXplIG9mIHRoZSBzdHJpZGUgaW4gZWFjaCBkaW1lbnNpb24gb2YgdGhlIHBvb2xpbmcgd2luZG93LiBFeHBlY3RzXG4gICAqIGFuIGludGVnZXIgb3IgYW4gYXJyYXkgb2YgMyBpbnRlZ2Vycy4gSW50ZWdlciwgdHVwbGUgb2YgMyBpbnRlZ2Vycywgb3JcbiAgICogTm9uZS5cbiAgICpcbiAgICogSWYgYG51bGxgLCBkZWZhdWx0cyB0byBgcG9vbFNpemVgLlxuICAgKi9cbiAgc3RyaWRlcz86IG51bWJlcnxbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG5cbiAgLyoqIFRoZSBwYWRkaW5nIHR5cGUgdG8gdXNlIGZvciB0aGUgcG9vbGluZyBsYXllci4gKi9cbiAgcGFkZGluZz86IFBhZGRpbmdNb2RlO1xuICAvKiogVGhlIGRhdGEgZm9ybWF0IHRvIHVzZSBmb3IgdGhlIHBvb2xpbmcgbGF5ZXIuICovXG4gIGRhdGFGb3JtYXQ/OiBEYXRhRm9ybWF0O1xufVxuXG4vKipcbiAqIEFic3RyYWN0IGNsYXNzIGZvciBkaWZmZXJlbnQgcG9vbGluZyAzRCBsYXllcnMuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQb29saW5nM0QgZXh0ZW5kcyBMYXllciB7XG4gIHByb3RlY3RlZCByZWFkb25seSBwb29sU2l6ZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc3RyaWRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcGFkZGluZzogUGFkZGluZ01vZGU7XG4gIHByb3RlY3RlZCByZWFkb25seSBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0O1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFBvb2xpbmczRExheWVyQXJncykge1xuICAgIGlmIChhcmdzLnBvb2xTaXplID09IG51bGwpIHtcbiAgICAgIGFyZ3MucG9vbFNpemUgPSBbMiwgMiwgMl07XG4gICAgfVxuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMucG9vbFNpemUgPSBBcnJheS5pc0FycmF5KGFyZ3MucG9vbFNpemUpID9cbiAgICAgICAgYXJncy5wb29sU2l6ZSA6XG4gICAgICAgIFthcmdzLnBvb2xTaXplLCBhcmdzLnBvb2xTaXplLCBhcmdzLnBvb2xTaXplXTtcbiAgICBpZiAoYXJncy5zdHJpZGVzID09IG51bGwpIHtcbiAgICAgIHRoaXMuc3RyaWRlcyA9IHRoaXMucG9vbFNpemU7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFyZ3Muc3RyaWRlcykpIHtcbiAgICAgIGlmIChhcmdzLnN0cmlkZXMubGVuZ3RoICE9PSAzKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYElmIHRoZSBzdHJpZGVzIHByb3BlcnR5IG9mIGEgM0QgcG9vbGluZyBsYXllciBpcyBhbiBBcnJheSwgYCArXG4gICAgICAgICAgICBgaXQgaXMgZXhwZWN0ZWQgdG8gaGF2ZSBhIGxlbmd0aCBvZiAzLCBidXQgcmVjZWl2ZWQgbGVuZ3RoIGAgK1xuICAgICAgICAgICAgYCR7YXJncy5zdHJpZGVzLmxlbmd0aH0uYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnN0cmlkZXMgPSBhcmdzLnN0cmlkZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGBjb25maWcuc3RyaWRlc2AgaXMgYSBudW1iZXIuXG4gICAgICB0aGlzLnN0cmlkZXMgPSBbYXJncy5zdHJpZGVzLCBhcmdzLnN0cmlkZXMsIGFyZ3Muc3RyaWRlc107XG4gICAgfVxuICAgIGFzc2VydFBvc2l0aXZlSW50ZWdlcih0aGlzLnBvb2xTaXplLCAncG9vbFNpemUnKTtcbiAgICBhc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy5zdHJpZGVzLCAnc3RyaWRlcycpO1xuICAgIHRoaXMucGFkZGluZyA9IGFyZ3MucGFkZGluZyA9PSBudWxsID8gJ3ZhbGlkJyA6IGFyZ3MucGFkZGluZztcbiAgICB0aGlzLmRhdGFGb3JtYXQgPVxuICAgICAgICBhcmdzLmRhdGFGb3JtYXQgPT0gbnVsbCA/ICdjaGFubmVsc0xhc3QnIDogYXJncy5kYXRhRm9ybWF0O1xuICAgIGNoZWNrRGF0YUZvcm1hdCh0aGlzLmRhdGFGb3JtYXQpO1xuICAgIGNoZWNrUGFkZGluZ01vZGUodGhpcy5wYWRkaW5nKTtcblxuICAgIHRoaXMuaW5wdXRTcGVjID0gW25ldyBJbnB1dFNwZWMoe25kaW06IDV9KV07XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgbGV0IGRlcHRocyA9XG4gICAgICAgIHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnID8gaW5wdXRTaGFwZVsyXSA6IGlucHV0U2hhcGVbMV07XG4gICAgbGV0IHJvd3MgPVxuICAgICAgICB0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0JyA/IGlucHV0U2hhcGVbM10gOiBpbnB1dFNoYXBlWzJdO1xuICAgIGxldCBjb2xzID1cbiAgICAgICAgdGhpcy5kYXRhRm9ybWF0ID09PSAnY2hhbm5lbHNGaXJzdCcgPyBpbnB1dFNoYXBlWzRdIDogaW5wdXRTaGFwZVszXTtcbiAgICBkZXB0aHMgPSBjb252T3V0cHV0TGVuZ3RoKFxuICAgICAgICBkZXB0aHMsIHRoaXMucG9vbFNpemVbMF0sIHRoaXMucGFkZGluZywgdGhpcy5zdHJpZGVzWzBdKTtcbiAgICByb3dzID1cbiAgICAgICAgY29udk91dHB1dExlbmd0aChyb3dzLCB0aGlzLnBvb2xTaXplWzFdLCB0aGlzLnBhZGRpbmcsIHRoaXMuc3RyaWRlc1sxXSk7XG4gICAgY29scyA9XG4gICAgICAgIGNvbnZPdXRwdXRMZW5ndGgoY29scywgdGhpcy5wb29sU2l6ZVsyXSwgdGhpcy5wYWRkaW5nLCB0aGlzLnN0cmlkZXNbMl0pO1xuICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0Jykge1xuICAgICAgcmV0dXJuIFtpbnB1dFNoYXBlWzBdLCBpbnB1dFNoYXBlWzFdLCBkZXB0aHMsIHJvd3MsIGNvbHNdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW2lucHV0U2hhcGVbMF0sIGRlcHRocywgcm93cywgY29scywgaW5wdXRTaGFwZVs0XV07XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IHBvb2xpbmdGdW5jdGlvbihcbiAgICAgIGlucHV0czogVGVuc29yLCBwb29sU2l6ZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLFxuICAgICAgc3RyaWRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBwYWRkaW5nOiBQYWRkaW5nTW9kZSxcbiAgICAgIGRhdGFGb3JtYXQ6IERhdGFGb3JtYXQpOiBUZW5zb3I7XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgcmV0dXJuIHRoaXMucG9vbGluZ0Z1bmN0aW9uKFxuICAgICAgICAgIGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKSwgdGhpcy5wb29sU2l6ZSwgdGhpcy5zdHJpZGVzLFxuICAgICAgICAgIHRoaXMucGFkZGluZywgdGhpcy5kYXRhRm9ybWF0KTtcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgIHBvb2xTaXplOiB0aGlzLnBvb2xTaXplLFxuICAgICAgcGFkZGluZzogdGhpcy5wYWRkaW5nLFxuICAgICAgc3RyaWRlczogdGhpcy5zdHJpZGVzLFxuICAgICAgZGF0YUZvcm1hdDogdGhpcy5kYXRhRm9ybWF0XG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1heFBvb2xpbmczRCBleHRlbmRzIFBvb2xpbmczRCB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ01heFBvb2xpbmczRCc7XG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFBvb2xpbmczRExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHBvb2xpbmdGdW5jdGlvbihcbiAgICAgIGlucHV0czogVGVuc29yLCBwb29sU2l6ZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLFxuICAgICAgc3RyaWRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBwYWRkaW5nOiBQYWRkaW5nTW9kZSxcbiAgICAgIGRhdGFGb3JtYXQ6IERhdGFGb3JtYXQpOiBUZW5zb3Ige1xuICAgIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgICBjaGVja1BhZGRpbmdNb2RlKHBhZGRpbmcpO1xuICAgIHJldHVybiBwb29sM2QoXG4gICAgICAgIGlucHV0cyBhcyBUZW5zb3I1RCwgcG9vbFNpemUsIHN0cmlkZXMsIHBhZGRpbmcsIGRhdGFGb3JtYXQsICdtYXgnKTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKE1heFBvb2xpbmczRCk7XG5cbmV4cG9ydCBjbGFzcyBBdmVyYWdlUG9vbGluZzNEIGV4dGVuZHMgUG9vbGluZzNEIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnQXZlcmFnZVBvb2xpbmczRCc7XG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFBvb2xpbmczRExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHBvb2xpbmdGdW5jdGlvbihcbiAgICAgIGlucHV0czogVGVuc29yLCBwb29sU2l6ZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLFxuICAgICAgc3RyaWRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBwYWRkaW5nOiBQYWRkaW5nTW9kZSxcbiAgICAgIGRhdGFGb3JtYXQ6IERhdGFGb3JtYXQpOiBUZW5zb3Ige1xuICAgIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgICBjaGVja1BhZGRpbmdNb2RlKHBhZGRpbmcpO1xuICAgIHJldHVybiBwb29sM2QoXG4gICAgICAgIGlucHV0cyBhcyBUZW5zb3I1RCwgcG9vbFNpemUsIHN0cmlkZXMsIHBhZGRpbmcsIGRhdGFGb3JtYXQsICdhdmcnKTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEF2ZXJhZ2VQb29saW5nM0QpO1xuXG4vKipcbiAqIEFic3RyYWN0IGNsYXNzIGZvciBkaWZmZXJlbnQgZ2xvYmFsIHBvb2xpbmcgMUQgbGF5ZXJzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR2xvYmFsUG9vbGluZzFEIGV4dGVuZHMgTGF5ZXIge1xuICBjb25zdHJ1Y3RvcihhcmdzOiBMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICB0aGlzLmlucHV0U3BlYyA9IFtuZXcgSW5wdXRTcGVjKHtuZGltOiAzfSldO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlKTogU2hhcGUge1xuICAgIHJldHVybiBbaW5wdXRTaGFwZVswXSwgaW5wdXRTaGFwZVsyXV07XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgR2xvYmFsQXZlcmFnZVBvb2xpbmcxRCBleHRlbmRzIEdsb2JhbFBvb2xpbmcxRCB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0dsb2JhbEF2ZXJhZ2VQb29saW5nMUQnO1xuICBjb25zdHJ1Y3RvcihhcmdzPzogTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyB8fCB7fSk7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICByZXR1cm4gdGZjLm1lYW4oaW5wdXQsIDEpO1xuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR2xvYmFsQXZlcmFnZVBvb2xpbmcxRCk7XG5cbmV4cG9ydCBjbGFzcyBHbG9iYWxNYXhQb29saW5nMUQgZXh0ZW5kcyBHbG9iYWxQb29saW5nMUQge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdHbG9iYWxNYXhQb29saW5nMUQnO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzIHx8IHt9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIHJldHVybiB0ZmMubWF4KGlucHV0LCAxKTtcbiAgICB9KTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEdsb2JhbE1heFBvb2xpbmcxRCk7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBHbG9iYWxQb29saW5nMkRMYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogT25lIG9mIGBDSEFOTkVMX0xBU1RgIChkZWZhdWx0KSBvciBgQ0hBTk5FTF9GSVJTVGAuXG4gICAqXG4gICAqIFRoZSBvcmRlcmluZyBvZiB0aGUgZGltZW5zaW9ucyBpbiB0aGUgaW5wdXRzLiBgQ0hBTk5FTF9MQVNUYCBjb3JyZXNwb25kc1xuICAgKiB0byBpbnB1dHMgd2l0aCBzaGFwZSBgW2JhdGNoLCBoZWlnaHQsIHdpZHRoLCBjaGFubmVsc11gIHdoaWxlXG4gICAqIGBDSEFOTkVMX0ZJUlNUYCBjb3JyZXNwb25kcyB0byBpbnB1dHMgd2l0aCBzaGFwZVxuICAgKiBgW2JhdGNoLCBjaGFubmVscywgaGVpZ2h0LCB3aWR0aF1gLlxuICAgKi9cbiAgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQ7XG59XG5cbi8qKlxuICogQWJzdHJhY3QgY2xhc3MgZm9yIGRpZmZlcmVudCBnbG9iYWwgcG9vbGluZyAyRCBsYXllcnMuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHbG9iYWxQb29saW5nMkQgZXh0ZW5kcyBMYXllciB7XG4gIHByb3RlY3RlZCBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0O1xuICBjb25zdHJ1Y3RvcihhcmdzOiBHbG9iYWxQb29saW5nMkRMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICB0aGlzLmRhdGFGb3JtYXQgPVxuICAgICAgICBhcmdzLmRhdGFGb3JtYXQgPT0gbnVsbCA/ICdjaGFubmVsc0xhc3QnIDogYXJncy5kYXRhRm9ybWF0O1xuICAgIGNoZWNrRGF0YUZvcm1hdCh0aGlzLmRhdGFGb3JtYXQpO1xuICAgIHRoaXMuaW5wdXRTcGVjID0gW25ldyBJbnB1dFNwZWMoe25kaW06IDR9KV07XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBpbnB1dFNoYXBlIGFzIFNoYXBlO1xuICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0xhc3QnKSB7XG4gICAgICByZXR1cm4gW2lucHV0U2hhcGVbMF0sIGlucHV0U2hhcGVbM11dO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW2lucHV0U2hhcGVbMF0sIGlucHV0U2hhcGVbMV1dO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge2RhdGFGb3JtYXQ6IHRoaXMuZGF0YUZvcm1hdH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBHbG9iYWxBdmVyYWdlUG9vbGluZzJEIGV4dGVuZHMgR2xvYmFsUG9vbGluZzJEIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnR2xvYmFsQXZlcmFnZVBvb2xpbmcyRCc7XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0gZ2V0RXhhY3RseU9uZVRlbnNvcihpbnB1dHMpO1xuICAgICAgaWYgKHRoaXMuZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzTGFzdCcpIHtcbiAgICAgICAgcmV0dXJuIHRmYy5tZWFuKGlucHV0LCBbMSwgMl0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRmYy5tZWFuKGlucHV0LCBbMiwgM10pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR2xvYmFsQXZlcmFnZVBvb2xpbmcyRCk7XG5cbmV4cG9ydCBjbGFzcyBHbG9iYWxNYXhQb29saW5nMkQgZXh0ZW5kcyBHbG9iYWxQb29saW5nMkQge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdHbG9iYWxNYXhQb29saW5nMkQnO1xuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0xhc3QnKSB7XG4gICAgICAgIHJldHVybiB0ZmMubWF4KGlucHV0LCBbMSwgMl0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRmYy5tYXgoaW5wdXQsIFsyLCAzXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhHbG9iYWxNYXhQb29saW5nMkQpO1xuIl19