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
 * This layer randomly adjusts the height of a
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
class RandomHeight extends BaseRandomLayer {
    constructor(args) {
        super(args);
        const { factor, interpolation = 'bilinear' } = args;
        this.factor = factor;
        if (Array.isArray(this.factor) && this.factor.length === 2) {
            this.heightLower = this.factor[0];
            this.heightUpper = this.factor[1];
        }
        else if (!Array.isArray(this.factor) && this.factor > 0) {
            this.heightLower = -this.factor;
            this.heightUpper = this.factor;
        }
        else {
            throw new ValueError(`Invalid factor: ${this.factor}. Must be positive number or tuple of 2 numbers`);
        }
        if (this.heightLower < -1.0 || this.heightUpper < -1.0) {
            throw new ValueError(`factor must have values larger than -1. Got: ${this.factor}`);
        }
        if (this.heightUpper < this.heightLower) {
            throw new ValueError(`factor cannot have upper bound less than lower bound.
        Got upper bound: ${this.heightUpper}.
        Got lower bound: ${this.heightLower}
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
        return [-1, this.imgWidth, numChannels];
    }
    call(inputs, kwargs) {
        return tidy(() => {
            const input = getExactlyOneTensor(inputs);
            this.imgWidth = input.shape[input.shape.length - 2];
            const imgHeight = input.shape[input.shape.length - 3];
            this.heightFactor = randomUniform([1], (1.0 + this.heightLower), (1.0 + this.heightUpper), 'float32', this.randomGenerator.next());
            let adjustedHeight = this.heightFactor.dataSync()[0] * imgHeight;
            adjustedHeight = Math.round(adjustedHeight);
            const size = [adjustedHeight, this.imgWidth];
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
RandomHeight.className = 'RandomHeight';
export { RandomHeight };
serialization.registerClass(RandomHeight);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tX2hlaWdodC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvcHJlcHJvY2Vzc2luZy9yYW5kb21faGVpZ2h0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxFQUFFLEtBQUssRUFBUSxhQUFhLEVBQVUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMxQyxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQVN0RCxNQUFNLGtCQUFrQixHQUFHLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBVSxDQUFDO0FBQzVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFHakU7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsTUFBYSxZQUFhLFNBQVEsZUFBZTtJQVUvQyxZQUFZLElBQXNCO1FBQ2hDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNaLE1BQU0sRUFBQyxNQUFNLEVBQUUsYUFBYSxHQUFHLFVBQVUsRUFBQyxHQUFHLElBQUksQ0FBQztRQUVsRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMxRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25DO2FBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO1lBQ3hELElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUNoQzthQUFNO1lBQ0wsTUFBTSxJQUFJLFVBQVUsQ0FDbEIsbUJBQW1CLElBQUksQ0FBQyxNQUFNLGlEQUFpRCxDQUNoRixDQUFDO1NBQ0g7UUFDRCxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUN0RCxNQUFNLElBQUksVUFBVSxDQUNsQixnREFBZ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUM5RCxDQUFDO1NBQ0g7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUN2QyxNQUFNLElBQUksVUFBVSxDQUNsQjsyQkFDbUIsSUFBSSxDQUFDLFdBQVc7MkJBQ2hCLElBQUksQ0FBQyxXQUFXO09BQ3BDLENBQUMsQ0FBQztTQUNKO1FBRUQsSUFBSSxhQUFhLEVBQUU7WUFDakIsSUFBSSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQzVDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxVQUFVLENBQUMsb0NBQ2pCLGFBQWEscUJBQXFCLENBQUMsQ0FBQzthQUN6QztTQUNGO0lBQ0gsQ0FBQztJQUVRLFNBQVM7UUFDaEIsTUFBTSxNQUFNLEdBQTZCO1lBQ3ZDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNyQixlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWE7U0FDcEMsQ0FBQztRQUVGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRVEsa0JBQWtCLENBQUMsVUFBeUI7UUFDbkQsVUFBVSxHQUFHLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRVEsSUFBSSxDQUFDLE1BQXVDLEVBQ25ELE1BQWM7UUFFZCxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDZixNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUV0RCxJQUFJLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNuQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUNsRCxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FDdkMsQ0FBQztZQUVGLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBQ2pFLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRTVDLE1BQU0sSUFBSSxHQUFvQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFOUQsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUMxQixLQUFLLFVBQVU7b0JBQ2IsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUMsS0FBSyxTQUFTO29CQUNaLE9BQU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkQ7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLGFBQWE7cUJBQzNDLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQzFEO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQS9GRCxrQkFBa0I7QUFDRixzQkFBUyxHQUFHLGNBQWMsQ0FBQztTQUZoQyxZQUFZO0FBbUd6QixhQUFhLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgQ29kZVNtaXRoIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHsgaW1hZ2UsIFJhbmssIHNlcmlhbGl6YXRpb24sIFRlbnNvciwgdGlkeSB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5pbXBvcnQgeyBnZXRFeGFjdGx5T25lVGVuc29yLCBnZXRFeGFjdGx5T25lU2hhcGUgfSBmcm9tICcuLi8uLi91dGlscy90eXBlc191dGlscyc7XG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4uLy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHsgS3dhcmdzIH0gZnJvbSAnLi4vLi4vdHlwZXMnO1xuaW1wb3J0IHsgVmFsdWVFcnJvciB9IGZyb20gJy4uLy4uL2Vycm9ycyc7XG5pbXBvcnQgeyBCYXNlUmFuZG9tTGF5ZXJBcmdzLCBCYXNlUmFuZG9tTGF5ZXIgfSBmcm9tICcuLi8uLi9lbmdpbmUvYmFzZV9yYW5kb21fbGF5ZXInO1xuaW1wb3J0IHsgcmFuZG9tVW5pZm9ybSB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBSYW5kb21IZWlnaHRBcmdzIGV4dGVuZHMgQmFzZVJhbmRvbUxheWVyQXJncyB7XG4gICBmYWN0b3I6IG51bWJlciB8IFtudW1iZXIsIG51bWJlcl07XG4gICBpbnRlcnBvbGF0aW9uPzogSW50ZXJwb2xhdGlvblR5cGU7IC8vIGRlZmF1bHQgPSAnYmlsaW5lYXInO1xuICAgc2VlZD86IG51bWJlcjsgLy8gZGVmYXVsdCA9IG51bGw7XG4gICBhdXRvVmVjdG9yaXplPzogYm9vbGVhbjtcbn1cblxuY29uc3QgSU5URVJQT0xBVElPTl9LRVlTID0gWydiaWxpbmVhcicsICduZWFyZXN0J10gYXMgY29uc3Q7XG5leHBvcnQgY29uc3QgSU5URVJQT0xBVElPTl9NRVRIT0RTID0gbmV3IFNldChJTlRFUlBPTEFUSU9OX0tFWVMpO1xudHlwZSBJbnRlcnBvbGF0aW9uVHlwZSA9IHR5cGVvZiBJTlRFUlBPTEFUSU9OX0tFWVNbbnVtYmVyXTtcblxuLyoqXG4gKiBQcmVwcm9jZXNzaW5nIExheWVyIHdpdGggcmFuZG9tbHkgdmFyaWVzIGltYWdlIGR1cmluZyB0cmFpbmluZ1xuICpcbiAqIFRoaXMgbGF5ZXIgcmFuZG9tbHkgYWRqdXN0cyB0aGUgaGVpZ2h0IG9mIGFcbiAqIGJhdGNoIG9mIGltYWdlcyBieSBhIHJhbmRvbSBmYWN0b3IuXG4gKlxuICogVGhlIGlucHV0IHNob3VsZCBiZSBhIDNEICh1bmJhdGNoZWQpIG9yXG4gKiA0RCAoYmF0Y2hlZCkgdGVuc29yIGluIHRoZSBgXCJjaGFubmVsc19sYXN0XCJgIGltYWdlIGRhdGEgZm9ybWF0LiBJbnB1dCBwaXhlbFxuICogdmFsdWVzIGNhbiBiZSBvZiBhbnkgcmFuZ2UgKGUuZy4gYFswLiwgMS4pYCBvciBgWzAsIDI1NV1gKSBhbmQgb2YgaW50ZWdlclxuICogb3IgZmxvYXRpbmcgcG9pbnQgZHR5cGUuIEJ5IGRlZmF1bHQsIHRoZSBsYXllciB3aWxsIG91dHB1dCBmbG9hdHMuXG4gKlxuICogdGYgbWV0aG9kcyBpbXBsZW1lbnRlZCBpbiB0ZmpzOiAnYmlsaW5lYXInLCAnbmVhcmVzdCcsXG4gKiB0ZiBtZXRob2RzIHVuaW1wbGVtZW50ZWQgaW4gdGZqczogJ2JpY3ViaWMnLCAnYXJlYScsICdsYW5jem9zMycsICdsYW5jem9zNScsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2dhdXNzaWFuJywgJ21pdGNoZWxsY3ViaWMnXG4gKlxuICovXG5cbmV4cG9ydCBjbGFzcyBSYW5kb21IZWlnaHQgZXh0ZW5kcyBCYXNlUmFuZG9tTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdSYW5kb21IZWlnaHQnO1xuICBwcml2YXRlIHJlYWRvbmx5IGZhY3RvcjogbnVtYmVyIHwgW251bWJlciwgbnVtYmVyXTtcbiAgcHJpdmF0ZSByZWFkb25seSBpbnRlcnBvbGF0aW9uPzogSW50ZXJwb2xhdGlvblR5cGU7ICAvLyBkZWZhdWx0ID0gJ2JpbGluZWFyXG4gIHByaXZhdGUgaGVpZ2h0TG93ZXI6IG51bWJlcjtcbiAgcHJpdmF0ZSBoZWlnaHRVcHBlcjogbnVtYmVyO1xuICBwcml2YXRlIGltZ1dpZHRoOiBudW1iZXI7XG4gIHByaXZhdGUgaGVpZ2h0RmFjdG9yOiBUZW5zb3I8UmFuay5SMT47XG5cbiAgY29uc3RydWN0b3IoYXJnczogUmFuZG9tSGVpZ2h0QXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIGNvbnN0IHtmYWN0b3IsIGludGVycG9sYXRpb24gPSAnYmlsaW5lYXInfSA9IGFyZ3M7XG5cbiAgICB0aGlzLmZhY3RvciA9IGZhY3RvcjtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuZmFjdG9yKSAmJiB0aGlzLmZhY3Rvci5sZW5ndGggPT09IDIpIHtcbiAgICAgIHRoaXMuaGVpZ2h0TG93ZXIgPSB0aGlzLmZhY3RvclswXTtcbiAgICAgIHRoaXMuaGVpZ2h0VXBwZXIgPSB0aGlzLmZhY3RvclsxXTtcbiAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHRoaXMuZmFjdG9yKSAmJiB0aGlzLmZhY3RvciA+IDApe1xuICAgICAgdGhpcy5oZWlnaHRMb3dlciA9IC10aGlzLmZhY3RvcjtcbiAgICAgIHRoaXMuaGVpZ2h0VXBwZXIgPSB0aGlzLmZhY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGZhY3RvcjogJHt0aGlzLmZhY3Rvcn0uIE11c3QgYmUgcG9zaXRpdmUgbnVtYmVyIG9yIHR1cGxlIG9mIDIgbnVtYmVyc2BcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh0aGlzLmhlaWdodExvd2VyIDwgLTEuMCB8fCB0aGlzLmhlaWdodFVwcGVyIDwgLTEuMCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgIGBmYWN0b3IgbXVzdCBoYXZlIHZhbHVlcyBsYXJnZXIgdGhhbiAtMS4gR290OiAke3RoaXMuZmFjdG9yfWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaGVpZ2h0VXBwZXIgPCB0aGlzLmhlaWdodExvd2VyKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgYGZhY3RvciBjYW5ub3QgaGF2ZSB1cHBlciBib3VuZCBsZXNzIHRoYW4gbG93ZXIgYm91bmQuXG4gICAgICAgIEdvdCB1cHBlciBib3VuZDogJHt0aGlzLmhlaWdodFVwcGVyfS5cbiAgICAgICAgR290IGxvd2VyIGJvdW5kOiAke3RoaXMuaGVpZ2h0TG93ZXJ9XG4gICAgICBgKTtcbiAgICB9XG5cbiAgICBpZiAoaW50ZXJwb2xhdGlvbikge1xuICAgICAgaWYgKElOVEVSUE9MQVRJT05fTUVUSE9EUy5oYXMoaW50ZXJwb2xhdGlvbikpIHtcbiAgICAgICAgdGhpcy5pbnRlcnBvbGF0aW9uID0gaW50ZXJwb2xhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKGBJbnZhbGlkIGludGVycG9sYXRpb24gcGFyYW1ldGVyOiAke1xuICAgICAgICAgICAgaW50ZXJwb2xhdGlvbn0gaXMgbm90IGltcGxlbWVudGVkYCk7XG4gICAgICB9XG4gICAgfSBcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZzogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0ID0ge1xuICAgICAgJ2ZhY3Rvcic6IHRoaXMuZmFjdG9yLFxuICAgICAgJ2ludGVycG9sYXRpb24nOiB0aGlzLmludGVycG9sYXRpb24sXG4gICAgfTtcblxuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBPYmplY3QuYXNzaWduKGNvbmZpZywgYmFzZUNvbmZpZyk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogU2hhcGV8U2hhcGVbXSB7XG4gICAgaW5wdXRTaGFwZSA9IGdldEV4YWN0bHlPbmVTaGFwZShpbnB1dFNoYXBlKTtcbiAgICBjb25zdCBudW1DaGFubmVscyA9IGlucHV0U2hhcGVbMl07XG4gICAgcmV0dXJuIFstMSwgdGhpcy5pbWdXaWR0aCwgbnVtQ2hhbm5lbHNdO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcjxSYW5rLlIzPnxUZW5zb3I8UmFuay5SND4sXG4gICAga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3JbXXxUZW5zb3Ige1xuXG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICB0aGlzLmltZ1dpZHRoID0gaW5wdXQuc2hhcGVbaW5wdXQuc2hhcGUubGVuZ3RoIC0gMl07XG4gICAgICBjb25zdCBpbWdIZWlnaHQgPSBpbnB1dC5zaGFwZVtpbnB1dC5zaGFwZS5sZW5ndGggLSAzXTtcblxuICAgICAgdGhpcy5oZWlnaHRGYWN0b3IgPSByYW5kb21Vbmlmb3JtKFsxXSxcbiAgICAgICAgKDEuMCArIHRoaXMuaGVpZ2h0TG93ZXIpLCAoMS4wICsgdGhpcy5oZWlnaHRVcHBlciksXG4gICAgICAgICdmbG9hdDMyJywgdGhpcy5yYW5kb21HZW5lcmF0b3IubmV4dCgpXG4gICAgICApO1xuXG4gICAgICBsZXQgYWRqdXN0ZWRIZWlnaHQgPSB0aGlzLmhlaWdodEZhY3Rvci5kYXRhU3luYygpWzBdICogaW1nSGVpZ2h0O1xuICAgICAgYWRqdXN0ZWRIZWlnaHQgPSBNYXRoLnJvdW5kKGFkanVzdGVkSGVpZ2h0KTtcblxuICAgICAgY29uc3Qgc2l6ZTpbbnVtYmVyLCBudW1iZXJdID0gW2FkanVzdGVkSGVpZ2h0LCB0aGlzLmltZ1dpZHRoXTtcblxuICAgICAgc3dpdGNoICh0aGlzLmludGVycG9sYXRpb24pIHtcbiAgICAgICAgY2FzZSAnYmlsaW5lYXInOlxuICAgICAgICAgIHJldHVybiBpbWFnZS5yZXNpemVCaWxpbmVhcihpbnB1dHMsIHNpemUpO1xuICAgICAgICBjYXNlICduZWFyZXN0JzpcbiAgICAgICAgICByZXR1cm4gaW1hZ2UucmVzaXplTmVhcmVzdE5laWdoYm9yKGlucHV0cywgc2l6ZSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcnBvbGF0aW9uIGlzICR7dGhpcy5pbnRlcnBvbGF0aW9ufVxuICAgICAgICAgIGJ1dCBvbmx5ICR7Wy4uLklOVEVSUE9MQVRJT05fTUVUSE9EU119IGFyZSBzdXBwb3J0ZWRgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUmFuZG9tSGVpZ2h0KTtcbiJdfQ==