/**
 * @license
 * Copyright 2023 CodeSmith LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
import { image, serialization, tidy } from '@tensorflow/tfjs-core';
import { getExactlyOneTensor, getExactlyOneShape } from '../../utils/types_utils';
import { ValueError } from '../../errors';
import { BaseRandomLayer } from '../../engine/base_random_layer';
import { randomUniform } from '@tensorflow/tfjs-core';
const INTERPOLATION_KEYS = ['bilinear', 'nearest'];
export const INTERPOLATION_METHODS = new Set(INTERPOLATION_KEYS);
/**
 * Preprocessing Layer with randomly varies image during training
 *
 * This layer randomly adjusts the width of a batch of images of a
 * batch of images by a random factor.
 *
 * The input should be a 3D (unbatched) or
 * 4D (batched) tensor in the `"channels_last"` image data format. Input pixel
 * values can be of any range (e.g. `[0., 1.)` or `[0, 255]`) and of integer
 * or floating point dtype. By default, the layer will output floats.
 *
 * tf methods implemented in tfjs: 'bilinear', 'nearest',
 * tf methods unimplemented in tfjs: 'bicubic', 'area', 'lanczos3', 'lanczos5',
 *                                   'gaussian', 'mitchellcubic'
 *
 */
class RandomWidth extends BaseRandomLayer {
    constructor(args) {
        super(args);
        const { factor, interpolation = 'bilinear' } = args;
        this.factor = factor;
        if (Array.isArray(this.factor) && this.factor.length === 2) {
            this.widthLower = this.factor[0];
            this.widthUpper = this.factor[1];
        }
        else if (!Array.isArray(this.factor) && this.factor > 0) {
            this.widthLower = -this.factor;
            this.widthUpper = this.factor;
        }
        else {
            throw new ValueError(`Invalid factor: ${this.factor}. Must be positive number or tuple of 2 numbers`);
        }
        if (this.widthLower < -1.0 || this.widthUpper < -1.0) {
            throw new ValueError(`factor must have values larger than -1. Got: ${this.factor}`);
        }
        if (this.widthUpper < this.widthLower) {
            throw new ValueError(`factor cannot have upper bound less than lower bound.
        Got upper bound: ${this.widthUpper}.
        Got lower bound: ${this.widthLower}
      `);
        }
        if (interpolation) {
            if (INTERPOLATION_METHODS.has(interpolation)) {
                this.interpolation = interpolation;
            }
            else {
                throw new ValueError(`Invalid interpolation parameter: ${interpolation} is not implemented`);
            }
        }
    }
    getConfig() {
        const config = {
            'factor': this.factor,
            'interpolation': this.interpolation,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const numChannels = inputShape[2];
        return [this.imgHeight, -1, numChannels];
    }
    call(inputs, kwargs) {
        return tidy(() => {
            const input = getExactlyOneTensor(inputs);
            this.imgHeight = input.shape[input.shape.length - 3];
            const imgWidth = input.shape[input.shape.length - 2];
            this.widthFactor = randomUniform([1], (1.0 + this.widthLower), (1.0 + this.widthUpper), 'float32', this.randomGenerator.next());
            let adjustedWidth = this.widthFactor.dataSync()[0] * imgWidth;
            adjustedWidth = Math.round(adjustedWidth);
            const size = [this.imgHeight, adjustedWidth];
            switch (this.interpolation) {
                case 'bilinear':
                    return image.resizeBilinear(inputs, size);
                case 'nearest':
                    return image.resizeNearestNeighbor(inputs, size);
                default:
                    throw new Error(`Interpolation is ${this.interpolation}
          but only ${[...INTERPOLATION_METHODS]} are supported`);
            }
        });
    }
}
/** @nocollapse */
RandomWidth.className = 'RandomWidth';
export { RandomWidth };
serialization.registerClass(RandomWidth);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tX3dpZHRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9wcmVwcm9jZXNzaW5nL3JhbmRvbV93aWR0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sRUFBRSxLQUFLLEVBQVEsYUFBYSxFQUFVLElBQUksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBR2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDMUMsT0FBTyxFQUF1QixlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFTdEQsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQVUsQ0FBQztBQUM1RCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBR2pFOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE1BQWEsV0FBWSxTQUFRLGVBQWU7SUFVOUMsWUFBWSxJQUFxQjtRQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDWixNQUFNLEVBQUMsTUFBTSxFQUFFLGFBQWEsR0FBRyxVQUFVLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFFbEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDMUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lB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LGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sSUFBSSxHQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFOUQsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUMxQixLQUFLLFVBQVU7b0JBQ2IsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUMsS0FBSyxTQUFTO29CQUNaLE9BQU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkQ7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLGFBQWE7cUJBQzNDLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQzFEO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQS9GRCxrQkFBa0I7QUFDRixxQkFBUyxHQUFHLGFBQWEsQ0FBQztTQUYvQixXQUFXO0FBbUd4QixhQUFhLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgQ29kZVNtaXRoIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHsgaW1hZ2UsIFJhbmssIHNlcmlhbGl6YXRpb24sIFRlbnNvciwgdGlkeSB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5pbXBvcnQgeyBnZXRFeGFjdGx5T25lVGVuc29yLCBnZXRFeGFjdGx5T25lU2hhcGUgfSBmcm9tICcuLi8uLi91dGlscy90eXBlc191dGlscyc7XG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4uLy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHsgS3dhcmdzIH0gZnJvbSAnLi4vLi4vdHlwZXMnO1xuaW1wb3J0IHsgVmFsdWVFcnJvciB9IGZyb20gJy4uLy4uL2Vycm9ycyc7XG5pbXBvcnQgeyBCYXNlUmFuZG9tTGF5ZXJBcmdzLCBCYXNlUmFuZG9tTGF5ZXIgfSBmcm9tICcuLi8uLi9lbmdpbmUvYmFzZV9yYW5kb21fbGF5ZXInO1xuaW1wb3J0IHsgcmFuZG9tVW5pZm9ybSB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBSYW5kb21XaWR0aEFyZ3MgZXh0ZW5kcyBCYXNlUmFuZG9tTGF5ZXJBcmdzIHtcbiAgIGZhY3RvcjogbnVtYmVyIHwgW251bWJlciwgbnVtYmVyXTtcbiAgIGludGVycG9sYXRpb24/OiBJbnRlcnBvbGF0aW9uVHlwZTsgLy8gZGVmYXVsdCA9ICdiaWxpbmVhcic7XG4gICBzZWVkPzogbnVtYmVyOyAvLyBkZWZhdWx0ID0gbnVsbDtcbiAgIGF1dG9WZWN0b3JpemU/OiBib29sZWFuO1xufVxuXG5jb25zdCBJTlRFUlBPTEFUSU9OX0tFWVMgPSBbJ2JpbGluZWFyJywgJ25lYXJlc3QnXSBhcyBjb25zdDtcbmV4cG9ydCBjb25zdCBJTlRFUlBPTEFUSU9OX01FVEhPRFMgPSBuZXcgU2V0KElOVEVSUE9MQVRJT05fS0VZUyk7XG50eXBlIEludGVycG9sYXRpb25UeXBlID0gdHlwZW9mIElOVEVSUE9MQVRJT05fS0VZU1tudW1iZXJdO1xuXG4vKipcbiAqIFByZXByb2Nlc3NpbmcgTGF5ZXIgd2l0aCByYW5kb21seSB2YXJpZXMgaW1hZ2UgZHVyaW5nIHRyYWluaW5nXG4gKlxuICogVGhpcyBsYXllciByYW5kb21seSBhZGp1c3RzIHRoZSB3aWR0aCBvZiBhIGJhdGNoIG9mIGltYWdlcyBvZiBhXG4gKiBiYXRjaCBvZiBpbWFnZXMgYnkgYSByYW5kb20gZmFjdG9yLlxuICpcbiAqIFRoZSBpbnB1dCBzaG91bGQgYmUgYSAzRCAodW5iYXRjaGVkKSBvclxuICogNEQgKGJhdGNoZWQpIHRlbnNvciBpbiB0aGUgYFwiY2hhbm5lbHNfbGFzdFwiYCBpbWFnZSBkYXRhIGZvcm1hdC4gSW5wdXQgcGl4ZWxcbiAqIHZhbHVlcyBjYW4gYmUgb2YgYW55IHJhbmdlIChlLmcuIGBbMC4sIDEuKWAgb3IgYFswLCAyNTVdYCkgYW5kIG9mIGludGVnZXJcbiAqIG9yIGZsb2F0aW5nIHBvaW50IGR0eXBlLiBCeSBkZWZhdWx0LCB0aGUgbGF5ZXIgd2lsbCBvdXRwdXQgZmxvYXRzLlxuICpcbiAqIHRmIG1ldGhvZHMgaW1wbGVtZW50ZWQgaW4gdGZqczogJ2JpbGluZWFyJywgJ25lYXJlc3QnLFxuICogdGYgbWV0aG9kcyB1bmltcGxlbWVudGVkIGluIHRmanM6ICdiaWN1YmljJywgJ2FyZWEnLCAnbGFuY3pvczMnLCAnbGFuY3pvczUnLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnYXVzc2lhbicsICdtaXRjaGVsbGN1YmljJ1xuICpcbiAqL1xuXG5leHBvcnQgY2xhc3MgUmFuZG9tV2lkdGggZXh0ZW5kcyBCYXNlUmFuZG9tTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdSYW5kb21XaWR0aCc7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmFjdG9yOiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXJdO1xuICBwcml2YXRlIHJlYWRvbmx5IGludGVycG9sYXRpb24/OiBJbnRlcnBvbGF0aW9uVHlwZTsgIC8vIGRlZmF1bHQgPSAnYmlsaW5lYXJcbiAgcHJpdmF0ZSB3aWR0aExvd2VyOiBudW1iZXI7XG4gIHByaXZhdGUgd2lkdGhVcHBlcjogbnVtYmVyO1xuICBwcml2YXRlIGltZ0hlaWdodDogbnVtYmVyO1xuICBwcml2YXRlIHdpZHRoRmFjdG9yOiBUZW5zb3I8UmFuay5SMT47XG5cbiAgY29uc3RydWN0b3IoYXJnczogUmFuZG9tV2lkdGhBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgY29uc3Qge2ZhY3RvciwgaW50ZXJwb2xhdGlvbiA9ICdiaWxpbmVhcid9ID0gYXJncztcblxuICAgIHRoaXMuZmFjdG9yID0gZmFjdG9yO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5mYWN0b3IpICYmIHRoaXMuZmFjdG9yLmxlbmd0aCA9PT0gMikge1xuICAgICAgdGhpcy53aWR0aExvd2VyID0gdGhpcy5mYWN0b3JbMF07XG4gICAgICB0aGlzLndpZHRoVXBwZXIgPSB0aGlzLmZhY3RvclsxXTtcbiAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHRoaXMuZmFjdG9yKSAmJiB0aGlzLmZhY3RvciA+IDApe1xuICAgICAgdGhpcy53aWR0aExvd2VyID0gLXRoaXMuZmFjdG9yO1xuICAgICAgdGhpcy53aWR0aFVwcGVyID0gdGhpcy5mYWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICBgSW52YWxpZCBmYWN0b3I6ICR7dGhpcy5mYWN0b3J9LiBNdXN0IGJlIHBvc2l0aXZlIG51bWJlciBvciB0dXBsZSBvZiAyIG51bWJlcnNgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodGhpcy53aWR0aExvd2VyIDwgLTEuMCB8fCB0aGlzLndpZHRoVXBwZXIgPCAtMS4wKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgYGZhY3RvciBtdXN0IGhhdmUgdmFsdWVzIGxhcmdlciB0aGFuIC0xLiBHb3Q6ICR7dGhpcy5mYWN0b3J9YFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy53aWR0aFVwcGVyIDwgdGhpcy53aWR0aExvd2VyKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgYGZhY3RvciBjYW5ub3QgaGF2ZSB1cHBlciBib3VuZCBsZXNzIHRoYW4gbG93ZXIgYm91bmQuXG4gICAgICAgIEdvdCB1cHBlciBib3VuZDogJHt0aGlzLndpZHRoVXBwZXJ9LlxuICAgICAgICBHb3QgbG93ZXIgYm91bmQ6ICR7dGhpcy53aWR0aExvd2VyfVxuICAgICAgYCk7XG4gICAgfVxuXG4gICAgaWYgKGludGVycG9sYXRpb24pIHtcbiAgICAgIGlmIChJTlRFUlBPTEFUSU9OX01FVEhPRFMuaGFzKGludGVycG9sYXRpb24pKSB7XG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdGlvbiA9IGludGVycG9sYXRpb247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihgSW52YWxpZCBpbnRlcnBvbGF0aW9uIHBhcmFtZXRlcjogJHtcbiAgICAgICAgICAgIGludGVycG9sYXRpb259IGlzIG5vdCBpbXBsZW1lbnRlZGApO1xuICAgICAgfVxuICAgIH0gXG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHtcbiAgICAgICdmYWN0b3InOiB0aGlzLmZhY3RvcixcbiAgICAgICdpbnRlcnBvbGF0aW9uJzogdGhpcy5pbnRlcnBvbGF0aW9uLFxuICAgIH07XG5cbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgY29uc3QgbnVtQ2hhbm5lbHMgPSBpbnB1dFNoYXBlWzJdO1xuICAgIHJldHVybiBbdGhpcy5pbWdIZWlnaHQsIC0xLCBudW1DaGFubmVsc107XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yPFJhbmsuUjM+fFRlbnNvcjxSYW5rLlI0PixcbiAgICBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcltdfFRlbnNvciB7XG5cbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIHRoaXMuaW1nSGVpZ2h0ID0gaW5wdXQuc2hhcGVbaW5wdXQuc2hhcGUubGVuZ3RoIC0gM107XG4gICAgICBjb25zdCBpbWdXaWR0aCA9IGlucHV0LnNoYXBlW2lucHV0LnNoYXBlLmxlbmd0aCAtIDJdO1xuXG4gICAgICB0aGlzLndpZHRoRmFjdG9yID0gcmFuZG9tVW5pZm9ybShbMV0sXG4gICAgICAgICgxLjAgKyB0aGlzLndpZHRoTG93ZXIpLCAoMS4wICsgdGhpcy53aWR0aFVwcGVyKSxcbiAgICAgICAgJ2Zsb2F0MzInLCB0aGlzLnJhbmRvbUdlbmVyYXRvci5uZXh0KClcbiAgICAgICk7XG5cbiAgICAgIGxldCBhZGp1c3RlZFdpZHRoID0gdGhpcy53aWR0aEZhY3Rvci5kYXRhU3luYygpWzBdICogaW1nV2lkdGg7XG4gICAgICBhZGp1c3RlZFdpZHRoID0gTWF0aC5yb3VuZChhZGp1c3RlZFdpZHRoKTtcblxuICAgICAgY29uc3Qgc2l6ZTpbbnVtYmVyLCBudW1iZXJdID0gW3RoaXMuaW1nSGVpZ2h0LCBhZGp1c3RlZFdpZHRoXTtcblxuICAgICAgc3dpdGNoICh0aGlzLmludGVycG9sYXRpb24pIHtcbiAgICAgICAgY2FzZSAnYmlsaW5lYXInOlxuICAgICAgICAgIHJldHVybiBpbWFnZS5yZXNpemVCaWxpbmVhcihpbnB1dHMsIHNpemUpO1xuICAgICAgICBjYXNlICduZWFyZXN0JzpcbiAgICAgICAgICByZXR1cm4gaW1hZ2UucmVzaXplTmVhcmVzdE5laWdoYm9yKGlucHV0cywgc2l6ZSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcnBvbGF0aW9uIGlzICR7dGhpcy5pbnRlcnBvbGF0aW9ufVxuICAgICAgICAgIGJ1dCBvbmx5ICR7Wy4uLklOVEVSUE9MQVRJT05fTUVUSE9EU119IGFyZSBzdXBwb3J0ZWRgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUmFuZG9tV2lkdGgpO1xuIl19