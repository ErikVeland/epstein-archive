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
 * TensorFlow.js Layers: Noise Layers.
 */
import { add, greaterEqual, mul, randomUniform, serialization, tidy } from '@tensorflow/tfjs-core';
import * as K from '../backend/tfjs_backend';
import { Layer } from '../engine/topology';
import { getExactlyOneTensor } from '../utils/types_utils';
class GaussianNoise extends Layer {
    constructor(args) {
        super(args);
        this.supportsMasking = true;
        this.stddev = args.stddev;
    }
    computeOutputShape(inputShape) {
        return inputShape;
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = { stddev: this.stddev };
        Object.assign(config, baseConfig);
        return config;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            const input = getExactlyOneTensor(inputs);
            const noised = () => add(K.randomNormal(input.shape, 0, this.stddev), input);
            const output = K.inTrainPhase(noised, () => input, kwargs['training'] || false);
            return output;
        });
    }
}
/** @nocollapse */
GaussianNoise.className = 'GaussianNoise';
export { GaussianNoise };
serialization.registerClass(GaussianNoise);
class GaussianDropout extends Layer {
    constructor(args) {
        super(args);
        this.supportsMasking = true;
        this.rate = args.rate;
    }
    computeOutputShape(inputShape) {
        return inputShape;
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = { rate: this.rate };
        Object.assign(config, baseConfig);
        return config;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            const input = getExactlyOneTensor(inputs);
            if (this.rate > 0 && this.rate < 1) {
                const noised = () => {
                    const stddev = Math.sqrt(this.rate / (1 - this.rate));
                    return mul(input, K.randomNormal(input.shape, 1, stddev));
                };
                return K.inTrainPhase(noised, () => input, kwargs['training'] || false);
            }
            return input;
        });
    }
}
/** @nocollapse */
GaussianDropout.className = 'GaussianDropout';
export { GaussianDropout };
serialization.registerClass(GaussianDropout);
/**
 * Applies Alpha Dropout to the input.
 *
 * As it is a regularization layer, it is only active at training time.
 *
 * Alpha Dropout is a `Dropout` that keeps mean and variance of inputs
 * to their original values, in order to ensure the self-normalizing property
 * even after this dropout.
 * Alpha Dropout fits well to Scaled Exponential Linear Units
 * by randomly setting activations to the negative saturation value.
 *
 * Arguments:
 *   - `rate`: float, drop probability (as with `Dropout`).
 *     The multiplicative noise will have
 *     standard deviation `sqrt(rate / (1 - rate))`.
 *   - `noise_shape`: A 1-D `Tensor` of type `int32`, representing the
 *     shape for randomly generated keep/drop flags.
 *
 * Input shape:
 *   Arbitrary. Use the keyword argument `inputShape`
 *   (tuple of integers, does not include the samples axis)
 *   when using this layer as the first layer in a model.
 *
 * Output shape:
 *   Same shape as input.
 *
 * References:
 *   - [Self-Normalizing Neural Networks](https://arxiv.org/abs/1706.02515)
 */
class AlphaDropout extends Layer {
    constructor(args) {
        super(args);
        this.supportsMasking = true;
        this.rate = args.rate;
        this.noiseShape = args.noiseShape;
    }
    _getNoiseShape(inputs) {
        return this.noiseShape || getExactlyOneTensor(inputs).shape;
    }
    computeOutputShape(inputShape) {
        return inputShape;
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = { rate: this.rate };
        Object.assign(config, baseConfig);
        return config;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            if (this.rate < 1 && this.rate > 0) {
                const noiseShape = this._getNoiseShape(inputs);
                const droppedInputs = () => {
                    const input = getExactlyOneTensor(inputs);
                    const alpha = 1.6732632423543772848170429916717;
                    const scale = 1.0507009873554804934193349852946;
                    const alphaP = -alpha * scale;
                    let keptIdx = greaterEqual(randomUniform(noiseShape), this.rate);
                    keptIdx = K.cast(keptIdx, 'float32'); // get default dtype.
                    // Get affine transformation params.
                    const a = ((1 - this.rate) * (1 + this.rate * alphaP ** 2)) ** -0.5;
                    const b = -a * alphaP * this.rate;
                    // Apply mask.
                    const x = add(mul(input, keptIdx), mul(add(keptIdx, -1), alphaP));
                    return add(mul(x, a), b);
                };
                return K.inTrainPhase(droppedInputs, () => getExactlyOneTensor(inputs), kwargs['training'] || false);
            }
            return inputs;
        });
    }
}
/** @nocollapse */
AlphaDropout.className = 'AlphaDropout';
export { AlphaDropout };
serialization.registerClass(AlphaDropout);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9pc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25vaXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUg7O0dBRUc7QUFFSCxPQUFPLEVBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBVSxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUV6RyxPQUFPLEtBQUssQ0FBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzdDLE9BQU8sRUFBQyxLQUFLLEVBQVksTUFBTSxvQkFBb0IsQ0FBQztBQUdwRCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQU96RCxNQUFhLGFBQWMsU0FBUSxLQUFLO0lBS3RDLFlBQVksSUFBdUI7UUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQzVCLENBQUM7SUFFUSxrQkFBa0IsQ0FBQyxVQUF5QjtRQUNuRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxNQUFNLEdBQUcsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFUSxJQUFJLENBQUMsTUFBdUIsRUFBRSxNQUFjO1FBQ25ELE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE1B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QkFFakUsT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUUscUJBQXFCO29CQUU1RCxvQ0FBb0M7b0JBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7b0JBQ3BFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUVsQyxjQUFjO29CQUNkLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFFbEUsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0IsQ0FBQyxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FDakIsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUNoRCxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7YUFDbEM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBM0RELGtCQUFrQjtBQUNYLHNCQUFTLEdBQUcsY0FBYyxDQUFDO1NBRnZCLFlBQVk7QUE4RHpCLGFBQWEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgb3IgYXRcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqIFRlbnNvckZsb3cuanMgTGF5ZXJzOiBOb2lzZSBMYXllcnMuXG4gKi9cblxuaW1wb3J0IHthZGQsIGdyZWF0ZXJFcXVhbCwgbXVsLCByYW5kb21Vbmlmb3JtLCBzZXJpYWxpemF0aW9uLCBUZW5zb3IsIHRpZHl9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCAqIGFzIEsgZnJvbSAnLi4vYmFja2VuZC90ZmpzX2JhY2tlbmQnO1xuaW1wb3J0IHtMYXllciwgTGF5ZXJBcmdzfSBmcm9tICcuLi9lbmdpbmUvdG9wb2xvZ3knO1xuaW1wb3J0IHtTaGFwZX0gZnJvbSAnLi4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQge0t3YXJnc30gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtnZXRFeGFjdGx5T25lVGVuc29yfSBmcm9tICcuLi91dGlscy90eXBlc191dGlscyc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBHYXVzc2lhbk5vaXNlQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKiBTdGFuZGFyZCBEZXZpYXRpb24uICAqL1xuICBzdGRkZXY6IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIEdhdXNzaWFuTm9pc2UgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0dhdXNzaWFuTm9pc2UnO1xuICByZWFkb25seSBzdGRkZXY6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBHYXVzc2lhbk5vaXNlQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMuc3VwcG9ydHNNYXNraW5nID0gdHJ1ZTtcbiAgICB0aGlzLnN0ZGRldiA9IGFyZ3Muc3RkZGV2O1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICByZXR1cm4gaW5wdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpIHtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgY29uc3QgY29uZmlnID0ge3N0ZGRldjogdGhpcy5zdGRkZXZ9O1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBjb25zdCBub2lzZWQgPSAoKSA9PlxuICAgICAgICAgIGFkZChLLnJhbmRvbU5vcm1hbChpbnB1dC5zaGFwZSwgMCwgdGhpcy5zdGRkZXYpLCBpbnB1dCk7XG4gICAgICBjb25zdCBvdXRwdXQgPVxuICAgICAgICAgIEsuaW5UcmFpblBoYXNlKG5vaXNlZCwgKCkgPT4gaW5wdXQsIGt3YXJnc1sndHJhaW5pbmcnXSB8fCBmYWxzZSk7XG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR2F1c3NpYW5Ob2lzZSk7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBHYXVzc2lhbkRyb3BvdXRBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqIGRyb3AgcHJvYmFiaWxpdHkuICAqL1xuICByYXRlOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBHYXVzc2lhbkRyb3BvdXQgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0dhdXNzaWFuRHJvcG91dCc7XG4gIHJlYWRvbmx5IHJhdGU6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBHYXVzc2lhbkRyb3BvdXRBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICAgIHRoaXMucmF0ZSA9IGFyZ3MucmF0ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogU2hhcGV8U2hhcGVbXSB7XG4gICAgcmV0dXJuIGlucHV0U2hhcGU7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKSB7XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIGNvbnN0IGNvbmZpZyA9IHtyYXRlOiB0aGlzLnJhdGV9O1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBpZiAodGhpcy5yYXRlID4gMCAmJiB0aGlzLnJhdGUgPCAxKSB7XG4gICAgICAgIGNvbnN0IG5vaXNlZCA9ICgpID0+IHtcbiAgICAgICAgICBjb25zdCBzdGRkZXYgPSBNYXRoLnNxcnQodGhpcy5yYXRlIC8gKDEgLSB0aGlzLnJhdGUpKTtcbiAgICAgICAgICByZXR1cm4gbXVsKGlucHV0LCBLLnJhbmRvbU5vcm1hbChpbnB1dC5zaGFwZSwgMSwgc3RkZGV2KSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBLLmluVHJhaW5QaGFzZShub2lzZWQsICgpID0+IGlucHV0LCBrd2FyZ3NbJ3RyYWluaW5nJ10gfHwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR2F1c3NpYW5Ecm9wb3V0KTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEFscGhhRHJvcG91dEFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKiogZHJvcCBwcm9iYWJpbGl0eS4gICovXG4gIHJhdGU6IG51bWJlcjtcbiAgLyoqXG4gICAqIEEgMS1EIGBUZW5zb3JgIG9mIHR5cGUgYGludDMyYCwgcmVwcmVzZW50aW5nIHRoZVxuICAgKiBzaGFwZSBmb3IgcmFuZG9tbHkgZ2VuZXJhdGVkIGtlZXAvZHJvcCBmbGFncy5cbiAgICovXG4gIG5vaXNlU2hhcGU/OiBTaGFwZTtcbn1cblxuLyoqXG4gKiBBcHBsaWVzIEFscGhhIERyb3BvdXQgdG8gdGhlIGlucHV0LlxuICpcbiAqIEFzIGl0IGlzIGEgcmVndWxhcml6YXRpb24gbGF5ZXIsIGl0IGlzIG9ubHkgYWN0aXZlIGF0IHRyYWluaW5nIHRpbWUuXG4gKlxuICogQWxwaGEgRHJvcG91dCBpcyBhIGBEcm9wb3V0YCB0aGF0IGtlZXBzIG1lYW4gYW5kIHZhcmlhbmNlIG9mIGlucHV0c1xuICogdG8gdGhlaXIgb3JpZ2luYWwgdmFsdWVzLCBpbiBvcmRlciB0byBlbnN1cmUgdGhlIHNlbGYtbm9ybWFsaXppbmcgcHJvcGVydHlcbiAqIGV2ZW4gYWZ0ZXIgdGhpcyBkcm9wb3V0LlxuICogQWxwaGEgRHJvcG91dCBmaXRzIHdlbGwgdG8gU2NhbGVkIEV4cG9uZW50aWFsIExpbmVhciBVbml0c1xuICogYnkgcmFuZG9tbHkgc2V0dGluZyBhY3RpdmF0aW9ucyB0byB0aGUgbmVnYXRpdmUgc2F0dXJhdGlvbiB2YWx1ZS5cbiAqXG4gKiBBcmd1bWVudHM6XG4gKiAgIC0gYHJhdGVgOiBmbG9hdCwgZHJvcCBwcm9iYWJpbGl0eSAoYXMgd2l0aCBgRHJvcG91dGApLlxuICogICAgIFRoZSBtdWx0aXBsaWNhdGl2ZSBub2lzZSB3aWxsIGhhdmVcbiAqICAgICBzdGFuZGFyZCBkZXZpYXRpb24gYHNxcnQocmF0ZSAvICgxIC0gcmF0ZSkpYC5cbiAqICAgLSBgbm9pc2Vfc2hhcGVgOiBBIDEtRCBgVGVuc29yYCBvZiB0eXBlIGBpbnQzMmAsIHJlcHJlc2VudGluZyB0aGVcbiAqICAgICBzaGFwZSBmb3IgcmFuZG9tbHkgZ2VuZXJhdGVkIGtlZXAvZHJvcCBmbGFncy5cbiAqXG4gKiBJbnB1dCBzaGFwZTpcbiAqICAgQXJiaXRyYXJ5LiBVc2UgdGhlIGtleXdvcmQgYXJndW1lbnQgYGlucHV0U2hhcGVgXG4gKiAgICh0dXBsZSBvZiBpbnRlZ2VycywgZG9lcyBub3QgaW5jbHVkZSB0aGUgc2FtcGxlcyBheGlzKVxuICogICB3aGVuIHVzaW5nIHRoaXMgbGF5ZXIgYXMgdGhlIGZpcnN0IGxheWVyIGluIGEgbW9kZWwuXG4gKlxuICogT3V0cHV0IHNoYXBlOlxuICogICBTYW1lIHNoYXBlIGFzIGlucHV0LlxuICpcbiAqIFJlZmVyZW5jZXM6XG4gKiAgIC0gW1NlbGYtTm9ybWFsaXppbmcgTmV1cmFsIE5ldHdvcmtzXShodHRwczovL2FyeGl2Lm9yZy9hYnMvMTcwNi4wMjUxNSlcbiAqL1xuZXhwb3J0IGNsYXNzIEFscGhhRHJvcG91dCBleHRlbmRzIExheWVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnQWxwaGFEcm9wb3V0JztcbiAgcmVhZG9ubHkgcmF0ZTogbnVtYmVyO1xuICByZWFkb25seSBub2lzZVNoYXBlOiBTaGFwZTtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBBbHBoYURyb3BvdXRBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICAgIHRoaXMucmF0ZSA9IGFyZ3MucmF0ZTtcbiAgICB0aGlzLm5vaXNlU2hhcGUgPSBhcmdzLm5vaXNlU2hhcGU7XG4gIH1cblxuICBfZ2V0Tm9pc2VTaGFwZShpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSkge1xuICAgIHJldHVybiB0aGlzLm5vaXNlU2hhcGUgfHwgZ2V0RXhhY3RseU9uZVRlbnNvcihpbnB1dHMpLnNoYXBlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICByZXR1cm4gaW5wdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpIHtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgY29uc3QgY29uZmlnID0ge3JhdGU6IHRoaXMucmF0ZX07XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucmF0ZSA8IDEgJiYgdGhpcy5yYXRlID4gMCkge1xuICAgICAgICBjb25zdCBub2lzZVNoYXBlID0gdGhpcy5fZ2V0Tm9pc2VTaGFwZShpbnB1dHMpO1xuXG4gICAgICAgIGNvbnN0IGRyb3BwZWRJbnB1dHMgPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG5cbiAgICAgICAgICBjb25zdCBhbHBoYSA9IDEuNjczMjYzMjQyMzU0Mzc3Mjg0ODE3MDQyOTkxNjcxNztcbiAgICAgICAgICBjb25zdCBzY2FsZSA9IDEuMDUwNzAwOTg3MzU1NDgwNDkzNDE5MzM0OTg1Mjk0NjtcblxuICAgICAgICAgIGNvbnN0IGFscGhhUCA9IC1hbHBoYSAqIHNjYWxlO1xuXG4gICAgICAgICAgbGV0IGtlcHRJZHggPSBncmVhdGVyRXF1YWwocmFuZG9tVW5pZm9ybShub2lzZVNoYXBlKSwgdGhpcy5yYXRlKTtcblxuICAgICAgICAgIGtlcHRJZHggPSBLLmNhc3Qoa2VwdElkeCwgJ2Zsb2F0MzInKTsgIC8vIGdldCBkZWZhdWx0IGR0eXBlLlxuXG4gICAgICAgICAgLy8gR2V0IGFmZmluZSB0cmFuc2Zvcm1hdGlvbiBwYXJhbXMuXG4gICAgICAgICAgY29uc3QgYSA9ICgoMSAtIHRoaXMucmF0ZSkgKiAoMSArIHRoaXMucmF0ZSAqIGFscGhhUCAqKiAyKSkgKiogLTAuNTtcbiAgICAgICAgICBjb25zdCBiID0gLWEgKiBhbHBoYVAgKiB0aGlzLnJhdGU7XG5cbiAgICAgICAgICAvLyBBcHBseSBtYXNrLlxuICAgICAgICAgIGNvbnN0IHggPSBhZGQobXVsKGlucHV0LCBrZXB0SWR4KSwgbXVsKGFkZChrZXB0SWR4LCAtMSksIGFscGhhUCkpO1xuXG4gICAgICAgICAgcmV0dXJuIGFkZChtdWwoeCwgYSksIGIpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gSy5pblRyYWluUGhhc2UoXG4gICAgICAgICAgICBkcm9wcGVkSW5wdXRzLCAoKSA9PiBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyksXG4gICAgICAgICAgICBrd2FyZ3NbJ3RyYWluaW5nJ10gfHwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlucHV0cztcbiAgICB9KTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEFscGhhRHJvcG91dCk7XG4iXX0=