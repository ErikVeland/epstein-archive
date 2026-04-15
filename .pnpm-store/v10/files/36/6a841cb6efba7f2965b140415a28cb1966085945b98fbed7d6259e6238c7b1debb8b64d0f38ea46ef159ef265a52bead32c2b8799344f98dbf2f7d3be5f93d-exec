/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
import { eye, linalg, mul, ones, randomUniform, scalar, serialization, tidy, truncatedNormal, util, zeros } from '@tensorflow/tfjs-core';
import * as K from './backend/tfjs_backend';
import { checkDataFormat } from './common';
import { NotImplementedError, ValueError } from './errors';
import { VALID_DISTRIBUTION_VALUES, VALID_FAN_MODE_VALUES } from './keras_format/initializer_config';
import { checkStringTypeUnionValue, deserializeKerasObject, serializeKerasObject } from './utils/generic_utils';
import { arrayProd } from './utils/math_utils';
export function checkFanMode(value) {
    checkStringTypeUnionValue(VALID_FAN_MODE_VALUES, 'FanMode', value);
}
export function checkDistribution(value) {
    checkStringTypeUnionValue(VALID_DISTRIBUTION_VALUES, 'Distribution', value);
}
/**
 * Initializer base class.
 *
 * @doc {
 *   heading: 'Initializers', subheading: 'Classes', namespace: 'initializers'}
 */
export class Initializer extends serialization.Serializable {
    fromConfigUsesCustomObjects() {
        return false;
    }
    getConfig() {
        return {};
    }
}
class Zeros extends Initializer {
    apply(shape, dtype) {
        return zeros(shape, dtype);
    }
}
/** @nocollapse */
Zeros.className = 'Zeros';
export { Zeros };
serialization.registerClass(Zeros);
class Ones extends Initializer {
    apply(shape, dtype) {
        return ones(shape, dtype);
    }
}
/** @nocollapse */
Ones.className = 'Ones';
export { Ones };
serialization.registerClass(Ones);
class Constant extends Initializer {
    constructor(args) {
        super();
        if (typeof args !== 'object') {
            throw new ValueError(`Expected argument of type ConstantConfig but got ${args}`);
        }
        if (args.value === undefined) {
            throw new ValueError(`config must have value set but got ${args}`);
        }
        this.value = args.value;
    }
    apply(shape, dtype) {
        return tidy(() => mul(scalar(this.value), ones(shape, dtype)));
    }
    getConfig() {
        return {
            value: this.value,
        };
    }
}
/** @nocollapse */
Constant.className = 'Constant';
export { Constant };
serialization.registerClass(Constant);
class RandomUniform extends Initializer {
    constructor(args) {
        super();
        this.DEFAULT_MINVAL = -0.05;
        this.DEFAULT_MAXVAL = 0.05;
        this.minval = args.minval || this.DEFAULT_MINVAL;
        this.maxval = args.maxval || this.DEFAULT_MAXVAL;
        this.seed = args.seed;
    }
    apply(shape, dtype) {
        return randomUniform(shape, this.minval, this.maxval, dtype, this.seed);
    }
    getConfig() {
        return { minval: this.minval, maxval: this.maxval, seed: this.seed };
    }
}
/** @nocollapse */
RandomUniform.className = 'RandomUniform';
export { RandomUniform };
serialization.registerClass(RandomUniform);
class RandomNormal extends Initializer {
    constructor(args) {
        super();
        this.DEFAULT_MEAN = 0.;
        this.DEFAULT_STDDEV = 0.05;
        this.mean = args.mean || this.DEFAULT_MEAN;
        this.stddev = args.stddev || this.DEFAULT_STDDEV;
        this.seed = args.seed;
    }
    apply(shape, dtype) {
        dtype = dtype || 'float32';
        if (dtype !== 'float32' && dtype !== 'int32') {
            throw new NotImplementedError(`randomNormal does not support dType ${dtype}.`);
        }
        return K.randomNormal(shape, this.mean, this.stddev, dtype, this.seed);
    }
    getConfig() {
        return { mean: this.mean, stddev: this.stddev, seed: this.seed };
    }
}
/** @nocollapse */
RandomNormal.className = 'RandomNormal';
export { RandomNormal };
serialization.registerClass(RandomNormal);
class TruncatedNormal extends Initializer {
    constructor(args) {
        super();
        this.DEFAULT_MEAN = 0.;
        this.DEFAULT_STDDEV = 0.05;
        this.mean = args.mean || this.DEFAULT_MEAN;
        this.stddev = args.stddev || this.DEFAULT_STDDEV;
        this.seed = args.seed;
    }
    apply(shape, dtype) {
        dtype = dtype || 'float32';
        if (dtype !== 'float32' && dtype !== 'int32') {
            throw new NotImplementedError(`truncatedNormal does not support dType ${dtype}.`);
        }
        return truncatedNormal(shape, this.mean, this.stddev, dtype, this.seed);
    }
    getConfig() {
        return { mean: this.mean, stddev: this.stddev, seed: this.seed };
    }
}
/** @nocollapse */
TruncatedNormal.className = 'TruncatedNormal';
export { TruncatedNormal };
serialization.registerClass(TruncatedNormal);
class Identity extends Initializer {
    constructor(args) {
        super();
        this.gain = args.gain != null ? args.gain : 1.0;
    }
    apply(shape, dtype) {
        return tidy(() => {
            if (shape.length !== 2 || shape[0] !== shape[1]) {
                throw new ValueError('Identity matrix initializer can only be used for' +
                    ' 2D square matrices.');
            }
            else {
                return mul(this.gain, eye(shape[0]));
            }
        });
    }
    getConfig() {
        return { gain: this.gain };
    }
}
/** @nocollapse */
Identity.className = 'Identity';
export { Identity };
serialization.registerClass(Identity);
/**
 * Computes the number of input and output units for a weight shape.
 * @param shape Shape of weight.
 * @param dataFormat data format to use for convolution kernels.
 *   Note that all kernels in Keras are standardized on the
 *   CHANNEL_LAST ordering (even when inputs are set to CHANNEL_FIRST).
 * @return An length-2 array: fanIn, fanOut.
 */
function computeFans(shape, dataFormat = 'channelsLast') {
    let fanIn;
    let fanOut;
    checkDataFormat(dataFormat);
    if (shape.length === 2) {
        fanIn = shape[0];
        fanOut = shape[1];
    }
    else if ([3, 4, 5].indexOf(shape.length) !== -1) {
        if (dataFormat === 'channelsFirst') {
            const receptiveFieldSize = arrayProd(shape, 2);
            fanIn = shape[1] * receptiveFieldSize;
            fanOut = shape[0] * receptiveFieldSize;
        }
        else if (dataFormat === 'channelsLast') {
            const receptiveFieldSize = arrayProd(shape, 0, shape.length - 2);
            fanIn = shape[shape.length - 2] * receptiveFieldSize;
            fanOut = shape[shape.length - 1] * receptiveFieldSize;
        }
    }
    else {
        const shapeProd = arrayProd(shape);
        fanIn = Math.sqrt(shapeProd);
        fanOut = Math.sqrt(shapeProd);
    }
    return [fanIn, fanOut];
}
class VarianceScaling extends Initializer {
    /**
     * Constructor of VarianceScaling.
     * @throws ValueError for invalid value in scale.
     */
    constructor(args) {
        super();
        if (args.scale < 0.0) {
            throw new ValueError(`scale must be a positive float. Got: ${args.scale}`);
        }
        this.scale = args.scale == null ? 1.0 : args.scale;
        this.mode = args.mode == null ? 'fanIn' : args.mode;
        checkFanMode(this.mode);
        this.distribution =
            args.distribution == null ? 'normal' : args.distribution;
        checkDistribution(this.distribution);
        this.seed = args.seed;
    }
    apply(shape, dtype) {
        const fans = computeFans(shape);
        const fanIn = fans[0];
        const fanOut = fans[1];
        let scale = this.scale;
        if (this.mode === 'fanIn') {
            scale /= Math.max(1, fanIn);
        }
        else if (this.mode === 'fanOut') {
            scale /= Math.max(1, fanOut);
        }
        else {
            scale /= Math.max(1, (fanIn + fanOut) / 2);
        }
        if (this.distribution === 'normal') {
            const stddev = Math.sqrt(scale);
            dtype = dtype || 'float32';
            if (dtype !== 'float32' && dtype !== 'int32') {
                throw new NotImplementedError(`${this.getClassName()} does not support dType ${dtype}.`);
            }
            return truncatedNormal(shape, 0, stddev, dtype, this.seed);
        }
        else {
            const limit = Math.sqrt(3 * scale);
            return randomUniform(shape, -limit, limit, dtype, this.seed);
        }
    }
    getConfig() {
        return {
            scale: this.scale,
            mode: this.mode,
            distribution: this.distribution,
            seed: this.seed
        };
    }
}
/** @nocollapse */
VarianceScaling.className = 'VarianceScaling';
export { VarianceScaling };
serialization.registerClass(VarianceScaling);
class GlorotUniform extends VarianceScaling {
    /**
     * Constructor of GlorotUniform
     * @param scale
     * @param mode
     * @param distribution
     * @param seed
     */
    constructor(args) {
        super({
            scale: 1.0,
            mode: 'fanAvg',
            distribution: 'uniform',
            seed: args == null ? null : args.seed
        });
    }
    getClassName() {
        // In Python Keras, GlorotUniform is not a class, but a helper method
        // that creates a VarianceScaling object. Use 'VarianceScaling' as
        // class name to be compatible with that.
        return VarianceScaling.className;
    }
}
/** @nocollapse */
GlorotUniform.className = 'GlorotUniform';
export { GlorotUniform };
serialization.registerClass(GlorotUniform);
class GlorotNormal extends VarianceScaling {
    /**
     * Constructor of GlorotNormal.
     * @param scale
     * @param mode
     * @param distribution
     * @param seed
     */
    constructor(args) {
        super({
            scale: 1.0,
            mode: 'fanAvg',
            distribution: 'normal',
            seed: args == null ? null : args.seed
        });
    }
    getClassName() {
        // In Python Keras, GlorotNormal is not a class, but a helper method
        // that creates a VarianceScaling object. Use 'VarianceScaling' as
        // class name to be compatible with that.
        return VarianceScaling.className;
    }
}
/** @nocollapse */
GlorotNormal.className = 'GlorotNormal';
export { GlorotNormal };
serialization.registerClass(GlorotNormal);
class HeNormal extends VarianceScaling {
    constructor(args) {
        super({
            scale: 2.0,
            mode: 'fanIn',
            distribution: 'normal',
            seed: args == null ? null : args.seed
        });
    }
    getClassName() {
        // In Python Keras, HeNormal is not a class, but a helper method
        // that creates a VarianceScaling object. Use 'VarianceScaling' as
        // class name to be compatible with that.
        return VarianceScaling.className;
    }
}
/** @nocollapse */
HeNormal.className = 'HeNormal';
export { HeNormal };
serialization.registerClass(HeNormal);
class HeUniform extends VarianceScaling {
    constructor(args) {
        super({
            scale: 2.0,
            mode: 'fanIn',
            distribution: 'uniform',
            seed: args == null ? null : args.seed
        });
    }
    getClassName() {
        // In Python Keras, HeUniform is not a class, but a helper method
        // that creates a VarianceScaling object. Use 'VarianceScaling' as
        // class name to be compatible with that.
        return VarianceScaling.className;
    }
}
/** @nocollapse */
HeUniform.className = 'HeUniform';
export { HeUniform };
serialization.registerClass(HeUniform);
class LeCunNormal extends VarianceScaling {
    constructor(args) {
        super({
            scale: 1.0,
            mode: 'fanIn',
            distribution: 'normal',
            seed: args == null ? null : args.seed
        });
    }
    getClassName() {
        // In Python Keras, LeCunNormal is not a class, but a helper method
        // that creates a VarianceScaling object. Use 'VarianceScaling' as
        // class name to be compatible with that.
        return VarianceScaling.className;
    }
}
/** @nocollapse */
LeCunNormal.className = 'LeCunNormal';
export { LeCunNormal };
serialization.registerClass(LeCunNormal);
class LeCunUniform extends VarianceScaling {
    constructor(args) {
        super({
            scale: 1.0,
            mode: 'fanIn',
            distribution: 'uniform',
            seed: args == null ? null : args.seed
        });
    }
    getClassName() {
        // In Python Keras, LeCunUniform is not a class, but a helper method
        // that creates a VarianceScaling object. Use 'VarianceScaling' as
        // class name to be compatible with that.
        return VarianceScaling.className;
    }
}
/** @nocollapse */
LeCunUniform.className = 'LeCunUniform';
export { LeCunUniform };
serialization.registerClass(LeCunUniform);
class Orthogonal extends Initializer {
    constructor(args) {
        super();
        this.DEFAULT_GAIN = 1;
        this.ELEMENTS_WARN_SLOW = 2000;
        this.gain = args.gain == null ? this.DEFAULT_GAIN : args.gain;
        this.seed = args.seed;
    }
    apply(shape, dtype) {
        return tidy(() => {
            if (shape.length < 2) {
                throw new NotImplementedError('Shape must be at least 2D.');
            }
            if (dtype !== 'int32' && dtype !== 'float32' && dtype !== undefined) {
                throw new TypeError(`Unsupported data type ${dtype}.`);
            }
            dtype = dtype;
            // flatten the input shape with the last dimension remaining its
            // original shape so it works for conv2d
            const numRows = util.sizeFromShape(shape.slice(0, -1));
            const numCols = shape[shape.length - 1];
            const numElements = numRows * numCols;
            if (numElements > this.ELEMENTS_WARN_SLOW) {
                console.warn(`Orthogonal initializer is being called on a matrix with more ` +
                    `than ${this.ELEMENTS_WARN_SLOW} (${numElements}) elements: ` +
                    `Slowness may result.`);
            }
            const flatShape = [Math.max(numCols, numRows), Math.min(numCols, numRows)];
            // Generate a random matrix
            const randNormalMat = K.randomNormal(flatShape, 0, 1, dtype, this.seed);
            // Compute QR factorization
            const qr = linalg.qr(randNormalMat, false);
            let qMat = qr[0];
            const rMat = qr[1];
            // Make Q uniform
            const diag = rMat.flatten().stridedSlice([0], [Math.min(numCols, numRows) * Math.min(numCols, numRows)], [Math.min(numCols, numRows) + 1]);
            qMat = mul(qMat, diag.sign());
            if (numRows < numCols) {
                qMat = qMat.transpose();
            }
            return mul(scalar(this.gain), qMat.reshape(shape));
        });
    }
    getConfig() {
        return {
            gain: this.gain,
            seed: this.seed,
        };
    }
}
/** @nocollapse */
Orthogonal.className = 'Orthogonal';
export { Orthogonal };
serialization.registerClass(Orthogonal);
// Maps the JavaScript-like identifier keys to the corresponding registry
// symbols.
export const INITIALIZER_IDENTIFIER_REGISTRY_SYMBOL_MAP = {
    'constant': 'Constant',
    'glorotNormal': 'GlorotNormal',
    'glorotUniform': 'GlorotUniform',
    'heNormal': 'HeNormal',
    'heUniform': 'HeUniform',
    'identity': 'Identity',
    'leCunNormal': 'LeCunNormal',
    'leCunUniform': 'LeCunUniform',
    'ones': 'Ones',
    'orthogonal': 'Orthogonal',
    'randomNormal': 'RandomNormal',
    'randomUniform': 'RandomUniform',
    'truncatedNormal': 'TruncatedNormal',
    'varianceScaling': 'VarianceScaling',
    'zeros': 'Zeros'
};
function deserializeInitializer(config, customObjects = {}) {
    return deserializeKerasObject(config, serialization.SerializationMap.getMap().classNameMap, customObjects, 'initializer');
}
export function serializeInitializer(initializer) {
    return serializeKerasObject(initializer);
}
export function getInitializer(identifier) {
    if (typeof identifier === 'string') {
        const className = identifier in INITIALIZER_IDENTIFIER_REGISTRY_SYMBOL_MAP ?
            INITIALIZER_IDENTIFIER_REGISTRY_SYMBOL_MAP[identifier] :
            identifier;
        /* We have four 'helper' classes for common initializers that
        all get serialized as 'VarianceScaling' and shouldn't go through
        the deserializeInitializer pathway. */
        if (className === 'GlorotNormal') {
            return new GlorotNormal();
        }
        else if (className === 'GlorotUniform') {
            return new GlorotUniform();
        }
        else if (className === 'HeNormal') {
            return new HeNormal();
        }
        else if (className === 'HeUniform') {
            return new HeUniform();
        }
        else if (className === 'LeCunNormal') {
            return new LeCunNormal();
        }
        else if (className === 'LeCunUniform') {
            return new LeCunUniform();
        }
        else {
            const config = {};
            config['className'] = className;
            config['config'] = {};
            return deserializeInitializer(config);
        }
    }
    else if (identifier instanceof Initializer) {
        return identifier;
    }
    else {
        return deserializeInitializer(identifier);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhbGl6ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2luaXRpYWxpemVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sRUFBVyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQVUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFFekosT0FBTyxLQUFLLENBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUM1QyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFekQsT0FBTyxFQUF3Qix5QkFBeUIsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQzFILE9BQU8sRUFBQyx5QkFBeUIsRUFBRSxzQkFBc0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQzlHLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUU3QyxNQUFNLFVBQVUsWUFBWSxDQUFDLEtBQWM7SUFDekMseUJBQXlCLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsS0FBYztJQUM5Qyx5QkFBeUIsQ0FBQyx5QkFBeUIsRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDOUUsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFnQixXQUFZLFNBQVEsYUFBYSxDQUFDLFlBQVk7SUFDM0QsMkJBQTJCO1FBQ2hDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQVNELFNB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QztRQUN0QyxJQUFJLFNBQVMsS0FBSyxjQUFjLEVBQUU7WUFDaEMsT0FBTyxJQUFJLFlBQVksRUFBRSxDQUFDO1NBQzNCO2FBQU0sSUFBSSxTQUFTLEtBQUssZUFBZSxFQUFFO1lBQ3hDLE9BQU8sSUFBSSxhQUFhLEVBQUUsQ0FBQztTQUM1QjthQUFNLElBQUksU0FBUyxLQUFLLFVBQVUsRUFBRTtZQUNuQyxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7U0FDdkI7YUFBTSxJQUFJLFNBQVMsS0FBSyxXQUFXLEVBQUU7WUFDcEMsT0FBTyxJQUFJLFNBQVMsRUFBRSxDQUFDO1NBQ3hCO2FBQU0sSUFBSSxTQUFTLEtBQUssYUFBYSxFQUFFO1lBQ3RDLE9BQU8sSUFBSSxXQUFXLEVBQUUsQ0FBQztTQUMxQjthQUFNLElBQUksU0FBUyxLQUFLLGNBQWMsRUFBRTtZQUN2QyxPQUFPLElBQUksWUFBWSxFQUFFLENBQUM7U0FDM0I7YUFBTTtZQUNMLE1BQU0sTUFBTSxHQUE2QixFQUFFLENBQUM7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLFNBQVMsQ0FBQztZQUNoQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdkM7S0FDRjtTQUFNLElBQUksVUFBVSxZQUFZLFdBQVcsRUFBRTtRQUM1QyxPQUFPLFVBQVUsQ0FBQztLQUNuQjtTQUFNO1FBQ0wsT0FBTyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUMzQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgb3IgYXRcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge0RhdGFUeXBlLCBleWUsIGxpbmFsZywgbXVsLCBvbmVzLCByYW5kb21Vbmlmb3JtLCBzY2FsYXIsIHNlcmlhbGl6YXRpb24sIFRlbnNvciwgdGlkeSwgdHJ1bmNhdGVkTm9ybWFsLCB1dGlsLCB6ZXJvc30gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0ICogYXMgSyBmcm9tICcuL2JhY2tlbmQvdGZqc19iYWNrZW5kJztcbmltcG9ydCB7Y2hlY2tEYXRhRm9ybWF0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge05vdEltcGxlbWVudGVkRXJyb3IsIFZhbHVlRXJyb3J9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7RGF0YUZvcm1hdCwgU2hhcGV9IGZyb20gJy4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQge0Rpc3RyaWJ1dGlvbiwgRmFuTW9kZSwgVkFMSURfRElTVFJJQlVUSU9OX1ZBTFVFUywgVkFMSURfRkFOX01PREVfVkFMVUVTfSBmcm9tICcuL2tlcmFzX2Zvcm1hdC9pbml0aWFsaXplcl9jb25maWcnO1xuaW1wb3J0IHtjaGVja1N0cmluZ1R5cGVVbmlvblZhbHVlLCBkZXNlcmlhbGl6ZUtlcmFzT2JqZWN0LCBzZXJpYWxpemVLZXJhc09iamVjdH0gZnJvbSAnLi91dGlscy9nZW5lcmljX3V0aWxzJztcbmltcG9ydCB7YXJyYXlQcm9kfSBmcm9tICcuL3V0aWxzL21hdGhfdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tGYW5Nb2RlKHZhbHVlPzogc3RyaW5nKTogdm9pZCB7XG4gIGNoZWNrU3RyaW5nVHlwZVVuaW9uVmFsdWUoVkFMSURfRkFOX01PREVfVkFMVUVTLCAnRmFuTW9kZScsIHZhbHVlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRGlzdHJpYnV0aW9uKHZhbHVlPzogc3RyaW5nKTogdm9pZCB7XG4gIGNoZWNrU3RyaW5nVHlwZVVuaW9uVmFsdWUoVkFMSURfRElTVFJJQlVUSU9OX1ZBTFVFUywgJ0Rpc3RyaWJ1dGlvbicsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplciBiYXNlIGNsYXNzLlxuICpcbiAqIEBkb2Mge1xuICogICBoZWFkaW5nOiAnSW5pdGlhbGl6ZXJzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnLCBuYW1lc3BhY2U6ICdpbml0aWFsaXplcnMnfVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSW5pdGlhbGl6ZXIgZXh0ZW5kcyBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZSB7XG4gIHB1YmxpYyBmcm9tQ29uZmlnVXNlc0N1c3RvbU9iamVjdHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhbiBpbml0aWFsIHZhbHVlLlxuICAgKiBAcGFyYW0gc2hhcGVcbiAgICogQHBhcmFtIGR0eXBlXG4gICAqIEByZXR1cm4gVGhlIGluaXQgdmFsdWUuXG4gICAqL1xuICBhYnN0cmFjdCBhcHBseShzaGFwZTogU2hhcGUsIGR0eXBlPzogRGF0YVR5cGUpOiBUZW5zb3I7XG5cbiAgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBaZXJvcyBleHRlbmRzIEluaXRpYWxpemVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnWmVyb3MnO1xuXG4gIGFwcGx5KHNoYXBlOiBTaGFwZSwgZHR5cGU/OiBEYXRhVHlwZSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHplcm9zKHNoYXBlLCBkdHlwZSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhaZXJvcyk7XG5cbmV4cG9ydCBjbGFzcyBPbmVzIGV4dGVuZHMgSW5pdGlhbGl6ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdPbmVzJztcblxuICBhcHBseShzaGFwZTogU2hhcGUsIGR0eXBlPzogRGF0YVR5cGUpOiBUZW5zb3Ige1xuICAgIHJldHVybiBvbmVzKHNoYXBlLCBkdHlwZSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhPbmVzKTtcblxuZXhwb3J0IGludGVyZmFjZSBDb25zdGFudEFyZ3Mge1xuICAvKiogVGhlIHZhbHVlIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIHZhcmlhYmxlLiAqL1xuICB2YWx1ZTogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uc3RhbnQgZXh0ZW5kcyBJbml0aWFsaXplciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0NvbnN0YW50JztcbiAgcHJpdmF0ZSB2YWx1ZTogbnVtYmVyO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBDb25zdGFudEFyZ3MpIHtcbiAgICBzdXBlcigpO1xuICAgIGlmICh0eXBlb2YgYXJncyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBFeHBlY3RlZCBhcmd1bWVudCBvZiB0eXBlIENvbnN0YW50Q29uZmlnIGJ1dCBnb3QgJHthcmdzfWApO1xuICAgIH1cbiAgICBpZiAoYXJncy52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihgY29uZmlnIG11c3QgaGF2ZSB2YWx1ZSBzZXQgYnV0IGdvdCAke2FyZ3N9YCk7XG4gICAgfVxuICAgIHRoaXMudmFsdWUgPSBhcmdzLnZhbHVlO1xuICB9XG5cbiAgYXBwbHkoc2hhcGU6IFNoYXBlLCBkdHlwZT86IERhdGFUeXBlKTogVGVuc29yIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiBtdWwoc2NhbGFyKHRoaXMudmFsdWUpLCBvbmVzKHNoYXBlLCBkdHlwZSkpKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZTogdGhpcy52YWx1ZSxcbiAgICB9O1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoQ29uc3RhbnQpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJhbmRvbVVuaWZvcm1BcmdzIHtcbiAgLyoqIExvd2VyIGJvdW5kIG9mIHRoZSByYW5nZSBvZiByYW5kb20gdmFsdWVzIHRvIGdlbmVyYXRlLiAqL1xuICBtaW52YWw/OiBudW1iZXI7XG4gIC8qKiBVcHBlciBib3VuZCBvZiB0aGUgcmFuZ2Ugb2YgcmFuZG9tIHZhbHVlcyB0byBnZW5lcmF0ZS4gKi9cbiAgbWF4dmFsPzogbnVtYmVyO1xuICAvKiogVXNlZCB0byBzZWVkIHRoZSByYW5kb20gZ2VuZXJhdG9yLiAqL1xuICBzZWVkPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgUmFuZG9tVW5pZm9ybSBleHRlbmRzIEluaXRpYWxpemVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnUmFuZG9tVW5pZm9ybSc7XG4gIHJlYWRvbmx5IERFRkFVTFRfTUlOVkFMID0gLTAuMDU7XG4gIHJlYWRvbmx5IERFRkFVTFRfTUFYVkFMID0gMC4wNTtcbiAgcHJpdmF0ZSBtaW52YWw6IG51bWJlcjtcbiAgcHJpdmF0ZSBtYXh2YWw6IG51bWJlcjtcbiAgcHJpdmF0ZSBzZWVkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYXJnczogUmFuZG9tVW5pZm9ybUFyZ3MpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMubWludmFsID0gYXJncy5taW52YWwgfHwgdGhpcy5ERUZBVUxUX01JTlZBTDtcbiAgICB0aGlzLm1heHZhbCA9IGFyZ3MubWF4dmFsIHx8IHRoaXMuREVGQVVMVF9NQVhWQUw7XG4gICAgdGhpcy5zZWVkID0gYXJncy5zZWVkO1xuICB9XG5cbiAgYXBwbHkoc2hhcGU6IFNoYXBlLCBkdHlwZT86IERhdGFUeXBlKTogVGVuc29yIHtcbiAgICByZXR1cm4gcmFuZG9tVW5pZm9ybShzaGFwZSwgdGhpcy5taW52YWwsIHRoaXMubWF4dmFsLCBkdHlwZSwgdGhpcy5zZWVkKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIHJldHVybiB7bWludmFsOiB0aGlzLm1pbnZhbCwgbWF4dmFsOiB0aGlzLm1heHZhbCwgc2VlZDogdGhpcy5zZWVkfTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFJhbmRvbVVuaWZvcm0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJhbmRvbU5vcm1hbEFyZ3Mge1xuICAvKiogTWVhbiBvZiB0aGUgcmFuZG9tIHZhbHVlcyB0byBnZW5lcmF0ZS4gKi9cbiAgbWVhbj86IG51bWJlcjtcbiAgLyoqIFN0YW5kYXJkIGRldmlhdGlvbiBvZiB0aGUgcmFuZG9tIHZhbHVlcyB0byBnZW5lcmF0ZS4gKi9cbiAgc3RkZGV2PzogbnVtYmVyO1xuICAvKiogVXNlZCB0byBzZWVkIHRoZSByYW5kb20gZ2VuZXJhdG9yLiAqL1xuICBzZWVkPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgUmFuZG9tTm9ybWFsIGV4dGVuZHMgSW5pdGlhbGl6ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdSYW5kb21Ob3JtYWwnO1xuICByZWFkb25seSBERUZBVUxUX01FQU4gPSAwLjtcbiAgcmVhZG9ubHkgREVGQVVMVF9TVERERVYgPSAwLjA1O1xuICBwcml2YXRlIG1lYW46IG51bWJlcjtcbiAgcHJpdmF0ZSBzdGRkZXY6IG51bWJlcjtcbiAgcHJpdmF0ZSBzZWVkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYXJnczogUmFuZG9tTm9ybWFsQXJncykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5tZWFuID0gYXJncy5tZWFuIHx8IHRoaXMuREVGQVVMVF9NRUFOO1xuICAgIHRoaXMuc3RkZGV2ID0gYXJncy5zdGRkZXYgfHwgdGhpcy5ERUZBVUxUX1NURERFVjtcbiAgICB0aGlzLnNlZWQgPSBhcmdzLnNlZWQ7XG4gIH1cblxuICBhcHBseShzaGFwZTogU2hhcGUsIGR0eXBlPzogRGF0YVR5cGUpOiBUZW5zb3Ige1xuICAgIGR0eXBlID0gZHR5cGUgfHwgJ2Zsb2F0MzInO1xuICAgIGlmIChkdHlwZSAhPT0gJ2Zsb2F0MzInICYmIGR0eXBlICE9PSAnaW50MzInKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgICBgcmFuZG9tTm9ybWFsIGRvZXMgbm90IHN1cHBvcnQgZFR5cGUgJHtkdHlwZX0uYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEsucmFuZG9tTm9ybWFsKHNoYXBlLCB0aGlzLm1lYW4sIHRoaXMuc3RkZGV2LCBkdHlwZSwgdGhpcy5zZWVkKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIHJldHVybiB7bWVhbjogdGhpcy5tZWFuLCBzdGRkZXY6IHRoaXMuc3RkZGV2LCBzZWVkOiB0aGlzLnNlZWR9O1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUmFuZG9tTm9ybWFsKTtcblxuZXhwb3J0IGludGVyZmFjZSBUcnVuY2F0ZWROb3JtYWxBcmdzIHtcbiAgLyoqIE1lYW4gb2YgdGhlIHJhbmRvbSB2YWx1ZXMgdG8gZ2VuZXJhdGUuICovXG4gIG1lYW4/OiBudW1iZXI7XG4gIC8qKiBTdGFuZGFyZCBkZXZpYXRpb24gb2YgdGhlIHJhbmRvbSB2YWx1ZXMgdG8gZ2VuZXJhdGUuICovXG4gIHN0ZGRldj86IG51bWJlcjtcbiAgLyoqIFVzZWQgdG8gc2VlZCB0aGUgcmFuZG9tIGdlbmVyYXRvci4gKi9cbiAgc2VlZD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIFRydW5jYXRlZE5vcm1hbCBleHRlbmRzIEluaXRpYWxpemVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnVHJ1bmNhdGVkTm9ybWFsJztcblxuICByZWFkb25seSBERUZBVUxUX01FQU4gPSAwLjtcbiAgcmVhZG9ubHkgREVGQVVMVF9TVERERVYgPSAwLjA1O1xuICBwcml2YXRlIG1lYW46IG51bWJlcjtcbiAgcHJpdmF0ZSBzdGRkZXY6IG51bWJlcjtcbiAgcHJpdmF0ZSBzZWVkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYXJnczogVHJ1bmNhdGVkTm9ybWFsQXJncykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5tZWFuID0gYXJncy5tZWFuIHx8IHRoaXMuREVGQVVMVF9NRUFOO1xuICAgIHRoaXMuc3RkZGV2ID0gYXJncy5zdGRkZXYgfHwgdGhpcy5ERUZBVUxUX1NURERFVjtcbiAgICB0aGlzLnNlZWQgPSBhcmdzLnNlZWQ7XG4gIH1cblxuICBhcHBseShzaGFwZTogU2hhcGUsIGR0eXBlPzogRGF0YVR5cGUpOiBUZW5zb3Ige1xuICAgIGR0eXBlID0gZHR5cGUgfHwgJ2Zsb2F0MzInO1xuICAgIGlmIChkdHlwZSAhPT0gJ2Zsb2F0MzInICYmIGR0eXBlICE9PSAnaW50MzInKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgICBgdHJ1bmNhdGVkTm9ybWFsIGRvZXMgbm90IHN1cHBvcnQgZFR5cGUgJHtkdHlwZX0uYCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVuY2F0ZWROb3JtYWwoc2hhcGUsIHRoaXMubWVhbiwgdGhpcy5zdGRkZXYsIGR0eXBlLCB0aGlzLnNlZWQpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgcmV0dXJuIHttZWFuOiB0aGlzLm1lYW4sIHN0ZGRldjogdGhpcy5zdGRkZXYsIHNlZWQ6IHRoaXMuc2VlZH07XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhUcnVuY2F0ZWROb3JtYWwpO1xuXG5leHBvcnQgaW50ZXJmYWNlIElkZW50aXR5QXJncyB7XG4gIC8qKlxuICAgKiBNdWx0aXBsaWNhdGl2ZSBmYWN0b3IgdG8gYXBwbHkgdG8gdGhlIGlkZW50aXR5IG1hdHJpeC5cbiAgICovXG4gIGdhaW4/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBJZGVudGl0eSBleHRlbmRzIEluaXRpYWxpemVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnSWRlbnRpdHknO1xuICBwcml2YXRlIGdhaW46IG51bWJlcjtcbiAgY29uc3RydWN0b3IoYXJnczogSWRlbnRpdHlBcmdzKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmdhaW4gPSBhcmdzLmdhaW4gIT0gbnVsbCA/IGFyZ3MuZ2FpbiA6IDEuMDtcbiAgfVxuXG4gIGFwcGx5KHNoYXBlOiBTaGFwZSwgZHR5cGU/OiBEYXRhVHlwZSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKHNoYXBlLmxlbmd0aCAhPT0gMiB8fCBzaGFwZVswXSAhPT0gc2hhcGVbMV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAnSWRlbnRpdHkgbWF0cml4IGluaXRpYWxpemVyIGNhbiBvbmx5IGJlIHVzZWQgZm9yJyArXG4gICAgICAgICAgICAnIDJEIHNxdWFyZSBtYXRyaWNlcy4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBtdWwodGhpcy5nYWluLCBleWUoc2hhcGVbMF0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIHJldHVybiB7Z2FpbjogdGhpcy5nYWlufTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKElkZW50aXR5KTtcblxuLyoqXG4gKiBDb21wdXRlcyB0aGUgbnVtYmVyIG9mIGlucHV0IGFuZCBvdXRwdXQgdW5pdHMgZm9yIGEgd2VpZ2h0IHNoYXBlLlxuICogQHBhcmFtIHNoYXBlIFNoYXBlIG9mIHdlaWdodC5cbiAqIEBwYXJhbSBkYXRhRm9ybWF0IGRhdGEgZm9ybWF0IHRvIHVzZSBmb3IgY29udm9sdXRpb24ga2VybmVscy5cbiAqICAgTm90ZSB0aGF0IGFsbCBrZXJuZWxzIGluIEtlcmFzIGFyZSBzdGFuZGFyZGl6ZWQgb24gdGhlXG4gKiAgIENIQU5ORUxfTEFTVCBvcmRlcmluZyAoZXZlbiB3aGVuIGlucHV0cyBhcmUgc2V0IHRvIENIQU5ORUxfRklSU1QpLlxuICogQHJldHVybiBBbiBsZW5ndGgtMiBhcnJheTogZmFuSW4sIGZhbk91dC5cbiAqL1xuZnVuY3Rpb24gY29tcHV0ZUZhbnMoXG4gICAgc2hhcGU6IFNoYXBlLCBkYXRhRm9ybWF0OiBEYXRhRm9ybWF0ID0gJ2NoYW5uZWxzTGFzdCcpOiBudW1iZXJbXSB7XG4gIGxldCBmYW5JbjogbnVtYmVyO1xuICBsZXQgZmFuT3V0OiBudW1iZXI7XG4gIGNoZWNrRGF0YUZvcm1hdChkYXRhRm9ybWF0KTtcbiAgaWYgKHNoYXBlLmxlbmd0aCA9PT0gMikge1xuICAgIGZhbkluID0gc2hhcGVbMF07XG4gICAgZmFuT3V0ID0gc2hhcGVbMV07XG4gIH0gZWxzZSBpZiAoWzMsIDQsIDVdLmluZGV4T2Yoc2hhcGUubGVuZ3RoKSAhPT0gLTEpIHtcbiAgICBpZiAoZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzRmlyc3QnKSB7XG4gICAgICBjb25zdCByZWNlcHRpdmVGaWVsZFNpemUgPSBhcnJheVByb2Qoc2hhcGUsIDIpO1xuICAgICAgZmFuSW4gPSBzaGFwZVsxXSAqIHJlY2VwdGl2ZUZpZWxkU2l6ZTtcbiAgICAgIGZhbk91dCA9IHNoYXBlWzBdICogcmVjZXB0aXZlRmllbGRTaXplO1xuICAgIH0gZWxzZSBpZiAoZGF0YUZvcm1hdCA9PT0gJ2NoYW5uZWxzTGFzdCcpIHtcbiAgICAgIGNvbnN0IHJlY2VwdGl2ZUZpZWxkU2l6ZSA9IGFycmF5UHJvZChzaGFwZSwgMCwgc2hhcGUubGVuZ3RoIC0gMik7XG4gICAgICBmYW5JbiA9IHNoYXBlW3NoYXBlLmxlbmd0aCAtIDJdICogcmVjZXB0aXZlRmllbGRTaXplO1xuICAgICAgZmFuT3V0ID0gc2hhcGVbc2hhcGUubGVuZ3RoIC0gMV0gKiByZWNlcHRpdmVGaWVsZFNpemU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IHNoYXBlUHJvZCA9IGFycmF5UHJvZChzaGFwZSk7XG4gICAgZmFuSW4gPSBNYXRoLnNxcnQoc2hhcGVQcm9kKTtcbiAgICBmYW5PdXQgPSBNYXRoLnNxcnQoc2hhcGVQcm9kKTtcbiAgfVxuXG4gIHJldHVybiBbZmFuSW4sIGZhbk91dF07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFyaWFuY2VTY2FsaW5nQXJncyB7XG4gIC8qKiBTY2FsaW5nIGZhY3RvciAocG9zaXRpdmUgZmxvYXQpLiAqL1xuICBzY2FsZT86IG51bWJlcjtcblxuICAvKiogRmFubmluZyBtb2RlIGZvciBpbnB1dHMgYW5kIG91dHB1dHMuICovXG4gIG1vZGU/OiBGYW5Nb2RlO1xuXG4gIC8qKiBQcm9iYWJpbGlzdGljIGRpc3RyaWJ1dGlvbiBvZiB0aGUgdmFsdWVzLiAqL1xuICBkaXN0cmlidXRpb24/OiBEaXN0cmlidXRpb247XG5cbiAgLyoqIFJhbmRvbSBudW1iZXIgZ2VuZXJhdG9yIHNlZWQuICovXG4gIHNlZWQ/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBWYXJpYW5jZVNjYWxpbmcgZXh0ZW5kcyBJbml0aWFsaXplciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ1ZhcmlhbmNlU2NhbGluZyc7XG4gIHByaXZhdGUgc2NhbGU6IG51bWJlcjtcbiAgcHJpdmF0ZSBtb2RlOiBGYW5Nb2RlO1xuICBwcml2YXRlIGRpc3RyaWJ1dGlvbjogRGlzdHJpYnV0aW9uO1xuICBwcml2YXRlIHNlZWQ6IG51bWJlcjtcblxuICAvKipcbiAgICogQ29uc3RydWN0b3Igb2YgVmFyaWFuY2VTY2FsaW5nLlxuICAgKiBAdGhyb3dzIFZhbHVlRXJyb3IgZm9yIGludmFsaWQgdmFsdWUgaW4gc2NhbGUuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihhcmdzOiBWYXJpYW5jZVNjYWxpbmdBcmdzKSB7XG4gICAgc3VwZXIoKTtcbiAgICBpZiAoYXJncy5zY2FsZSA8IDAuMCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYHNjYWxlIG11c3QgYmUgYSBwb3NpdGl2ZSBmbG9hdC4gR290OiAke2FyZ3Muc2NhbGV9YCk7XG4gICAgfVxuICAgIHRoaXMuc2NhbGUgPSBhcmdzLnNjYWxlID09IG51bGwgPyAxLjAgOiBhcmdzLnNjYWxlO1xuICAgIHRoaXMubW9kZSA9IGFyZ3MubW9kZSA9PSBudWxsID8gJ2ZhbkluJyA6IGFyZ3MubW9kZTtcbiAgICBjaGVja0Zhbk1vZGUodGhpcy5tb2RlKTtcbiAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9XG4gICAgICAgIGFyZ3MuZGlzdHJpYnV0aW9uID09IG51bGwgPyAnbm9ybWFsJyA6IGFyZ3MuZGlzdHJpYnV0aW9uO1xuICAgIGNoZWNrRGlzdHJpYnV0aW9uKHRoaXMuZGlzdHJpYnV0aW9uKTtcbiAgICB0aGlzLnNlZWQgPSBhcmdzLnNlZWQ7XG4gIH1cblxuICBhcHBseShzaGFwZTogU2hhcGUsIGR0eXBlPzogRGF0YVR5cGUpOiBUZW5zb3Ige1xuICAgIGNvbnN0IGZhbnMgPSBjb21wdXRlRmFucyhzaGFwZSk7XG4gICAgY29uc3QgZmFuSW4gPSBmYW5zWzBdO1xuICAgIGNvbnN0IGZhbk91dCA9IGZhbnNbMV07XG4gICAgbGV0IHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICBpZiAodGhpcy5tb2RlID09PSAnZmFuSW4nKSB7XG4gICAgICBzY2FsZSAvPSBNYXRoLm1heCgxLCBmYW5Jbik7XG4gICAgfSBlbHNlIGlmICh0aGlzLm1vZGUgPT09ICdmYW5PdXQnKSB7XG4gICAgICBzY2FsZSAvPSBNYXRoLm1heCgxLCBmYW5PdXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FsZSAvPSBNYXRoLm1heCgxLCAoZmFuSW4gKyBmYW5PdXQpIC8gMik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZGlzdHJpYnV0aW9uID09PSAnbm9ybWFsJykge1xuICAgICAgY29uc3Qgc3RkZGV2ID0gTWF0aC5zcXJ0KHNjYWxlKTtcbiAgICAgIGR0eXBlID0gZHR5cGUgfHwgJ2Zsb2F0MzInO1xuICAgICAgaWYgKGR0eXBlICE9PSAnZmxvYXQzMicgJiYgZHR5cGUgIT09ICdpbnQzMicpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgICBgJHt0aGlzLmdldENsYXNzTmFtZSgpfSBkb2VzIG5vdCBzdXBwb3J0IGRUeXBlICR7ZHR5cGV9LmApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydW5jYXRlZE5vcm1hbChzaGFwZSwgMCwgc3RkZGV2LCBkdHlwZSwgdGhpcy5zZWVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbGltaXQgPSBNYXRoLnNxcnQoMyAqIHNjYWxlKTtcbiAgICAgIHJldHVybiByYW5kb21Vbmlmb3JtKHNoYXBlLCAtbGltaXQsIGxpbWl0LCBkdHlwZSwgdGhpcy5zZWVkKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NhbGU6IHRoaXMuc2NhbGUsXG4gICAgICBtb2RlOiB0aGlzLm1vZGUsXG4gICAgICBkaXN0cmlidXRpb246IHRoaXMuZGlzdHJpYnV0aW9uLFxuICAgICAgc2VlZDogdGhpcy5zZWVkXG4gICAgfTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFZhcmlhbmNlU2NhbGluZyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VlZE9ubHlJbml0aWFsaXplckFyZ3Mge1xuICAvKiogUmFuZG9tIG51bWJlciBnZW5lcmF0b3Igc2VlZC4gKi9cbiAgc2VlZD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIEdsb3JvdFVuaWZvcm0gZXh0ZW5kcyBWYXJpYW5jZVNjYWxpbmcge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdHbG9yb3RVbmlmb3JtJztcblxuICAvKipcbiAgICogQ29uc3RydWN0b3Igb2YgR2xvcm90VW5pZm9ybVxuICAgKiBAcGFyYW0gc2NhbGVcbiAgICogQHBhcmFtIG1vZGVcbiAgICogQHBhcmFtIGRpc3RyaWJ1dGlvblxuICAgKiBAcGFyYW0gc2VlZFxuICAgKi9cbiAgY29uc3RydWN0b3IoYXJncz86IFNlZWRPbmx5SW5pdGlhbGl6ZXJBcmdzKSB7XG4gICAgc3VwZXIoe1xuICAgICAgc2NhbGU6IDEuMCxcbiAgICAgIG1vZGU6ICdmYW5BdmcnLFxuICAgICAgZGlzdHJpYnV0aW9uOiAndW5pZm9ybScsXG4gICAgICBzZWVkOiBhcmdzID09IG51bGwgPyBudWxsIDogYXJncy5zZWVkXG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDbGFzc05hbWUoKTogc3RyaW5nIHtcbiAgICAvLyBJbiBQeXRob24gS2VyYXMsIEdsb3JvdFVuaWZvcm0gaXMgbm90IGEgY2xhc3MsIGJ1dCBhIGhlbHBlciBtZXRob2RcbiAgICAvLyB0aGF0IGNyZWF0ZXMgYSBWYXJpYW5jZVNjYWxpbmcgb2JqZWN0LiBVc2UgJ1ZhcmlhbmNlU2NhbGluZycgYXNcbiAgICAvLyBjbGFzcyBuYW1lIHRvIGJlIGNvbXBhdGlibGUgd2l0aCB0aGF0LlxuICAgIHJldHVybiBWYXJpYW5jZVNjYWxpbmcuY2xhc3NOYW1lO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR2xvcm90VW5pZm9ybSk7XG5cbmV4cG9ydCBjbGFzcyBHbG9yb3ROb3JtYWwgZXh0ZW5kcyBWYXJpYW5jZVNjYWxpbmcge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdHbG9yb3ROb3JtYWwnO1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvciBvZiBHbG9yb3ROb3JtYWwuXG4gICAqIEBwYXJhbSBzY2FsZVxuICAgKiBAcGFyYW0gbW9kZVxuICAgKiBAcGFyYW0gZGlzdHJpYnV0aW9uXG4gICAqIEBwYXJhbSBzZWVkXG4gICAqL1xuICBjb25zdHJ1Y3RvcihhcmdzPzogU2VlZE9ubHlJbml0aWFsaXplckFyZ3MpIHtcbiAgICBzdXBlcih7XG4gICAgICBzY2FsZTogMS4wLFxuICAgICAgbW9kZTogJ2ZhbkF2ZycsXG4gICAgICBkaXN0cmlidXRpb246ICdub3JtYWwnLFxuICAgICAgc2VlZDogYXJncyA9PSBudWxsID8gbnVsbCA6IGFyZ3Muc2VlZFxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q2xhc3NOYW1lKCk6IHN0cmluZyB7XG4gICAgLy8gSW4gUHl0aG9uIEtlcmFzLCBHbG9yb3ROb3JtYWwgaXMgbm90IGEgY2xhc3MsIGJ1dCBhIGhlbHBlciBtZXRob2RcbiAgICAvLyB0aGF0IGNyZWF0ZXMgYSBWYXJpYW5jZVNjYWxpbmcgb2JqZWN0LiBVc2UgJ1ZhcmlhbmNlU2NhbGluZycgYXNcbiAgICAvLyBjbGFzcyBuYW1lIHRvIGJlIGNvbXBhdGlibGUgd2l0aCB0aGF0LlxuICAgIHJldHVybiBWYXJpYW5jZVNjYWxpbmcuY2xhc3NOYW1lO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR2xvcm90Tm9ybWFsKTtcblxuZXhwb3J0IGNsYXNzIEhlTm9ybWFsIGV4dGVuZHMgVmFyaWFuY2VTY2FsaW5nIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnSGVOb3JtYWwnO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBTZWVkT25seUluaXRpYWxpemVyQXJncykge1xuICAgIHN1cGVyKHtcbiAgICAgIHNjYWxlOiAyLjAsXG4gICAgICBtb2RlOiAnZmFuSW4nLFxuICAgICAgZGlzdHJpYnV0aW9uOiAnbm9ybWFsJyxcbiAgICAgIHNlZWQ6IGFyZ3MgPT0gbnVsbCA/IG51bGwgOiBhcmdzLnNlZWRcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENsYXNzTmFtZSgpOiBzdHJpbmcge1xuICAgIC8vIEluIFB5dGhvbiBLZXJhcywgSGVOb3JtYWwgaXMgbm90IGEgY2xhc3MsIGJ1dCBhIGhlbHBlciBtZXRob2RcbiAgICAvLyB0aGF0IGNyZWF0ZXMgYSBWYXJpYW5jZVNjYWxpbmcgb2JqZWN0LiBVc2UgJ1ZhcmlhbmNlU2NhbGluZycgYXNcbiAgICAvLyBjbGFzcyBuYW1lIHRvIGJlIGNvbXBhdGlibGUgd2l0aCB0aGF0LlxuICAgIHJldHVybiBWYXJpYW5jZVNjYWxpbmcuY2xhc3NOYW1lO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoSGVOb3JtYWwpO1xuXG5leHBvcnQgY2xhc3MgSGVVbmlmb3JtIGV4dGVuZHMgVmFyaWFuY2VTY2FsaW5nIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnSGVVbmlmb3JtJztcblxuICBjb25zdHJ1Y3RvcihhcmdzPzogU2VlZE9ubHlJbml0aWFsaXplckFyZ3MpIHtcbiAgICBzdXBlcih7XG4gICAgICBzY2FsZTogMi4wLFxuICAgICAgbW9kZTogJ2ZhbkluJyxcbiAgICAgIGRpc3RyaWJ1dGlvbjogJ3VuaWZvcm0nLFxuICAgICAgc2VlZDogYXJncyA9PSBudWxsID8gbnVsbCA6IGFyZ3Muc2VlZFxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q2xhc3NOYW1lKCk6IHN0cmluZyB7XG4gICAgLy8gSW4gUHl0aG9uIEtlcmFzLCBIZVVuaWZvcm0gaXMgbm90IGEgY2xhc3MsIGJ1dCBhIGhlbHBlciBtZXRob2RcbiAgICAvLyB0aGF0IGNyZWF0ZXMgYSBWYXJpYW5jZVNjYWxpbmcgb2JqZWN0LiBVc2UgJ1ZhcmlhbmNlU2NhbGluZycgYXNcbiAgICAvLyBjbGFzcyBuYW1lIHRvIGJlIGNvbXBhdGlibGUgd2l0aCB0aGF0LlxuICAgIHJldHVybiBWYXJpYW5jZVNjYWxpbmcuY2xhc3NOYW1lO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoSGVVbmlmb3JtKTtcblxuZXhwb3J0IGNsYXNzIExlQ3VuTm9ybWFsIGV4dGVuZHMgVmFyaWFuY2VTY2FsaW5nIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnTGVDdW5Ob3JtYWwnO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBTZWVkT25seUluaXRpYWxpemVyQXJncykge1xuICAgIHN1cGVyKHtcbiAgICAgIHNjYWxlOiAxLjAsXG4gICAgICBtb2RlOiAnZmFuSW4nLFxuICAgICAgZGlzdHJpYnV0aW9uOiAnbm9ybWFsJyxcbiAgICAgIHNlZWQ6IGFyZ3MgPT0gbnVsbCA/IG51bGwgOiBhcmdzLnNlZWRcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENsYXNzTmFtZSgpOiBzdHJpbmcge1xuICAgIC8vIEluIFB5dGhvbiBLZXJhcywgTGVDdW5Ob3JtYWwgaXMgbm90IGEgY2xhc3MsIGJ1dCBhIGhlbHBlciBtZXRob2RcbiAgICAvLyB0aGF0IGNyZWF0ZXMgYSBWYXJpYW5jZVNjYWxpbmcgb2JqZWN0LiBVc2UgJ1ZhcmlhbmNlU2NhbGluZycgYXNcbiAgICAvLyBjbGFzcyBuYW1lIHRvIGJlIGNvbXBhdGlibGUgd2l0aCB0aGF0LlxuICAgIHJldHVybiBWYXJpYW5jZVNjYWxpbmcuY2xhc3NOYW1lO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTGVDdW5Ob3JtYWwpO1xuXG5leHBvcnQgY2xhc3MgTGVDdW5Vbmlmb3JtIGV4dGVuZHMgVmFyaWFuY2VTY2FsaW5nIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnTGVDdW5Vbmlmb3JtJztcblxuICBjb25zdHJ1Y3RvcihhcmdzPzogU2VlZE9ubHlJbml0aWFsaXplckFyZ3MpIHtcbiAgICBzdXBlcih7XG4gICAgICBzY2FsZTogMS4wLFxuICAgICAgbW9kZTogJ2ZhbkluJyxcbiAgICAgIGRpc3RyaWJ1dGlvbjogJ3VuaWZvcm0nLFxuICAgICAgc2VlZDogYXJncyA9PSBudWxsID8gbnVsbCA6IGFyZ3Muc2VlZFxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q2xhc3NOYW1lKCk6IHN0cmluZyB7XG4gICAgLy8gSW4gUHl0aG9uIEtlcmFzLCBMZUN1blVuaWZvcm0gaXMgbm90IGEgY2xhc3MsIGJ1dCBhIGhlbHBlciBtZXRob2RcbiAgICAvLyB0aGF0IGNyZWF0ZXMgYSBWYXJpYW5jZVNjYWxpbmcgb2JqZWN0LiBVc2UgJ1ZhcmlhbmNlU2NhbGluZycgYXNcbiAgICAvLyBjbGFzcyBuYW1lIHRvIGJlIGNvbXBhdGlibGUgd2l0aCB0aGF0LlxuICAgIHJldHVybiBWYXJpYW5jZVNjYWxpbmcuY2xhc3NOYW1lO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTGVDdW5Vbmlmb3JtKTtcblxuZXhwb3J0IGludGVyZmFjZSBPcnRob2dvbmFsQXJncyBleHRlbmRzIFNlZWRPbmx5SW5pdGlhbGl6ZXJBcmdzIHtcbiAgLyoqXG4gICAqIE11bHRpcGxpY2F0aXZlIGZhY3RvciB0byBhcHBseSB0byB0aGUgb3J0aG9nb25hbCBtYXRyaXguIERlZmF1bHRzIHRvIDEuXG4gICAqL1xuICBnYWluPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgT3J0aG9nb25hbCBleHRlbmRzIEluaXRpYWxpemVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnT3J0aG9nb25hbCc7XG4gIHJlYWRvbmx5IERFRkFVTFRfR0FJTiA9IDE7XG4gIHJlYWRvbmx5IEVMRU1FTlRTX1dBUk5fU0xPVyA9IDIwMDA7XG4gIHByb3RlY3RlZCByZWFkb25seSBnYWluOiBudW1iZXI7XG4gIHByb3RlY3RlZCByZWFkb25seSBzZWVkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYXJncz86IE9ydGhvZ29uYWxBcmdzKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmdhaW4gPSBhcmdzLmdhaW4gPT0gbnVsbCA/IHRoaXMuREVGQVVMVF9HQUlOIDogYXJncy5nYWluO1xuICAgIHRoaXMuc2VlZCA9IGFyZ3Muc2VlZDtcbiAgfVxuXG4gIGFwcGx5KHNoYXBlOiBTaGFwZSwgZHR5cGU/OiBEYXRhVHlwZSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKHNoYXBlLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoJ1NoYXBlIG11c3QgYmUgYXQgbGVhc3QgMkQuJyk7XG4gICAgICB9XG4gICAgICBpZiAoZHR5cGUgIT09ICdpbnQzMicgJiYgZHR5cGUgIT09ICdmbG9hdDMyJyAmJiBkdHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuc3VwcG9ydGVkIGRhdGEgdHlwZSAke2R0eXBlfS5gKTtcbiAgICAgIH1cbiAgICAgIGR0eXBlID0gZHR5cGUgYXMgJ2ludDMyJyB8ICdmbG9hdDMyJyB8IHVuZGVmaW5lZDtcblxuICAgICAgLy8gZmxhdHRlbiB0aGUgaW5wdXQgc2hhcGUgd2l0aCB0aGUgbGFzdCBkaW1lbnNpb24gcmVtYWluaW5nIGl0c1xuICAgICAgLy8gb3JpZ2luYWwgc2hhcGUgc28gaXQgd29ya3MgZm9yIGNvbnYyZFxuICAgICAgY29uc3QgbnVtUm93cyA9IHV0aWwuc2l6ZUZyb21TaGFwZShzaGFwZS5zbGljZSgwLCAtMSkpO1xuICAgICAgY29uc3QgbnVtQ29scyA9IHNoYXBlW3NoYXBlLmxlbmd0aCAtIDFdO1xuICAgICAgY29uc3QgbnVtRWxlbWVudHMgPSBudW1Sb3dzICogbnVtQ29scztcbiAgICAgIGlmIChudW1FbGVtZW50cyA+IHRoaXMuRUxFTUVOVFNfV0FSTl9TTE9XKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgIGBPcnRob2dvbmFsIGluaXRpYWxpemVyIGlzIGJlaW5nIGNhbGxlZCBvbiBhIG1hdHJpeCB3aXRoIG1vcmUgYCArXG4gICAgICAgICAgICBgdGhhbiAke3RoaXMuRUxFTUVOVFNfV0FSTl9TTE9XfSAoJHtudW1FbGVtZW50c30pIGVsZW1lbnRzOiBgICtcbiAgICAgICAgICAgIGBTbG93bmVzcyBtYXkgcmVzdWx0LmApO1xuICAgICAgfVxuICAgICAgY29uc3QgZmxhdFNoYXBlID1cbiAgICAgICAgICBbTWF0aC5tYXgobnVtQ29scywgbnVtUm93cyksIE1hdGgubWluKG51bUNvbHMsIG51bVJvd3MpXTtcblxuICAgICAgLy8gR2VuZXJhdGUgYSByYW5kb20gbWF0cml4XG4gICAgICBjb25zdCByYW5kTm9ybWFsTWF0ID0gSy5yYW5kb21Ob3JtYWwoZmxhdFNoYXBlLCAwLCAxLCBkdHlwZSwgdGhpcy5zZWVkKTtcblxuICAgICAgLy8gQ29tcHV0ZSBRUiBmYWN0b3JpemF0aW9uXG4gICAgICBjb25zdCBxciA9IGxpbmFsZy5xcihyYW5kTm9ybWFsTWF0LCBmYWxzZSk7XG4gICAgICBsZXQgcU1hdCA9IHFyWzBdO1xuICAgICAgY29uc3Qgck1hdCA9IHFyWzFdO1xuXG4gICAgICAvLyBNYWtlIFEgdW5pZm9ybVxuICAgICAgY29uc3QgZGlhZyA9IHJNYXQuZmxhdHRlbigpLnN0cmlkZWRTbGljZShcbiAgICAgICAgICBbMF0sIFtNYXRoLm1pbihudW1Db2xzLCBudW1Sb3dzKSAqIE1hdGgubWluKG51bUNvbHMsIG51bVJvd3MpXSxcbiAgICAgICAgICBbTWF0aC5taW4obnVtQ29scywgbnVtUm93cykgKyAxXSk7XG4gICAgICBxTWF0ID0gbXVsKHFNYXQsIGRpYWcuc2lnbigpKTtcbiAgICAgIGlmIChudW1Sb3dzIDwgbnVtQ29scykge1xuICAgICAgICBxTWF0ID0gcU1hdC50cmFuc3Bvc2UoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG11bChzY2FsYXIodGhpcy5nYWluKSwgcU1hdC5yZXNoYXBlKHNoYXBlKSk7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICByZXR1cm4ge1xuICAgICAgZ2FpbjogdGhpcy5nYWluLFxuICAgICAgc2VlZDogdGhpcy5zZWVkLFxuICAgIH07XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhPcnRob2dvbmFsKTtcblxuLyoqIEBkb2NpbmxpbmUgKi9cbmV4cG9ydCB0eXBlIEluaXRpYWxpemVySWRlbnRpZmllciA9XG4gICAgJ2NvbnN0YW50J3wnZ2xvcm90Tm9ybWFsJ3wnZ2xvcm90VW5pZm9ybSd8J2hlTm9ybWFsJ3wnaGVVbmlmb3JtJ3wnaWRlbnRpdHknfFxuICAgICdsZUN1bk5vcm1hbCd8J2xlQ3VuVW5pZm9ybSd8J29uZXMnfCdvcnRob2dvbmFsJ3wncmFuZG9tTm9ybWFsJ3xcbiAgICAncmFuZG9tVW5pZm9ybSd8J3RydW5jYXRlZE5vcm1hbCd8J3ZhcmlhbmNlU2NhbGluZyd8J3plcm9zJ3xzdHJpbmc7XG5cbi8vIE1hcHMgdGhlIEphdmFTY3JpcHQtbGlrZSBpZGVudGlmaWVyIGtleXMgdG8gdGhlIGNvcnJlc3BvbmRpbmcgcmVnaXN0cnlcbi8vIHN5bWJvbHMuXG5leHBvcnQgY29uc3QgSU5JVElBTElaRVJfSURFTlRJRklFUl9SRUdJU1RSWV9TWU1CT0xfTUFQOlxuICAgIHtbaWRlbnRpZmllciBpbiBJbml0aWFsaXplcklkZW50aWZpZXJdOiBzdHJpbmd9ID0ge1xuICAgICAgJ2NvbnN0YW50JzogJ0NvbnN0YW50JyxcbiAgICAgICdnbG9yb3ROb3JtYWwnOiAnR2xvcm90Tm9ybWFsJyxcbiAgICAgICdnbG9yb3RVbmlmb3JtJzogJ0dsb3JvdFVuaWZvcm0nLFxuICAgICAgJ2hlTm9ybWFsJzogJ0hlTm9ybWFsJyxcbiAgICAgICdoZVVuaWZvcm0nOiAnSGVVbmlmb3JtJyxcbiAgICAgICdpZGVudGl0eSc6ICdJZGVudGl0eScsXG4gICAgICAnbGVDdW5Ob3JtYWwnOiAnTGVDdW5Ob3JtYWwnLFxuICAgICAgJ2xlQ3VuVW5pZm9ybSc6ICdMZUN1blVuaWZvcm0nLFxuICAgICAgJ29uZXMnOiAnT25lcycsXG4gICAgICAnb3J0aG9nb25hbCc6ICdPcnRob2dvbmFsJyxcbiAgICAgICdyYW5kb21Ob3JtYWwnOiAnUmFuZG9tTm9ybWFsJyxcbiAgICAgICdyYW5kb21Vbmlmb3JtJzogJ1JhbmRvbVVuaWZvcm0nLFxuICAgICAgJ3RydW5jYXRlZE5vcm1hbCc6ICdUcnVuY2F0ZWROb3JtYWwnLFxuICAgICAgJ3ZhcmlhbmNlU2NhbGluZyc6ICdWYXJpYW5jZVNjYWxpbmcnLFxuICAgICAgJ3plcm9zJzogJ1plcm9zJ1xuICAgIH07XG5cbmZ1bmN0aW9uIGRlc2VyaWFsaXplSW5pdGlhbGl6ZXIoXG4gICAgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QsXG4gICAgY3VzdG9tT2JqZWN0czogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0ID0ge30pOiBJbml0aWFsaXplciB7XG4gIHJldHVybiBkZXNlcmlhbGl6ZUtlcmFzT2JqZWN0KFxuICAgICAgY29uZmlnLCBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YXRpb25NYXAuZ2V0TWFwKCkuY2xhc3NOYW1lTWFwLFxuICAgICAgY3VzdG9tT2JqZWN0cywgJ2luaXRpYWxpemVyJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVJbml0aWFsaXplcihpbml0aWFsaXplcjogSW5pdGlhbGl6ZXIpOlxuICAgIHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdFZhbHVlIHtcbiAgcmV0dXJuIHNlcmlhbGl6ZUtlcmFzT2JqZWN0KGluaXRpYWxpemVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEluaXRpYWxpemVyKGlkZW50aWZpZXI6IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QpOiBJbml0aWFsaXplciB7XG4gIGlmICh0eXBlb2YgaWRlbnRpZmllciA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBjbGFzc05hbWUgPSBpZGVudGlmaWVyIGluIElOSVRJQUxJWkVSX0lERU5USUZJRVJfUkVHSVNUUllfU1lNQk9MX01BUCA/XG4gICAgICAgIElOSVRJQUxJWkVSX0lERU5USUZJRVJfUkVHSVNUUllfU1lNQk9MX01BUFtpZGVudGlmaWVyXSA6XG4gICAgICAgIGlkZW50aWZpZXI7XG4gICAgLyogV2UgaGF2ZSBmb3VyICdoZWxwZXInIGNsYXNzZXMgZm9yIGNvbW1vbiBpbml0aWFsaXplcnMgdGhhdFxuICAgIGFsbCBnZXQgc2VyaWFsaXplZCBhcyAnVmFyaWFuY2VTY2FsaW5nJyBhbmQgc2hvdWxkbid0IGdvIHRocm91Z2hcbiAgICB0aGUgZGVzZXJpYWxpemVJbml0aWFsaXplciBwYXRod2F5LiAqL1xuICAgIGlmIChjbGFzc05hbWUgPT09ICdHbG9yb3ROb3JtYWwnKSB7XG4gICAgICByZXR1cm4gbmV3IEdsb3JvdE5vcm1hbCgpO1xuICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09PSAnR2xvcm90VW5pZm9ybScpIHtcbiAgICAgIHJldHVybiBuZXcgR2xvcm90VW5pZm9ybSgpO1xuICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09PSAnSGVOb3JtYWwnKSB7XG4gICAgICByZXR1cm4gbmV3IEhlTm9ybWFsKCk7XG4gICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT09ICdIZVVuaWZvcm0nKSB7XG4gICAgICByZXR1cm4gbmV3IEhlVW5pZm9ybSgpO1xuICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09PSAnTGVDdW5Ob3JtYWwnKSB7XG4gICAgICByZXR1cm4gbmV3IExlQ3VuTm9ybWFsKCk7XG4gICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT09ICdMZUN1blVuaWZvcm0nKSB7XG4gICAgICByZXR1cm4gbmV3IExlQ3VuVW5pZm9ybSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHt9O1xuICAgICAgY29uZmlnWydjbGFzc05hbWUnXSA9IGNsYXNzTmFtZTtcbiAgICAgIGNvbmZpZ1snY29uZmlnJ10gPSB7fTtcbiAgICAgIHJldHVybiBkZXNlcmlhbGl6ZUluaXRpYWxpemVyKGNvbmZpZyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlkZW50aWZpZXIgaW5zdGFuY2VvZiBJbml0aWFsaXplcikge1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBkZXNlcmlhbGl6ZUluaXRpYWxpemVyKGlkZW50aWZpZXIpO1xuICB9XG59XG4iXX0=