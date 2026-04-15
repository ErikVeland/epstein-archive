/**
 * @license
 * Copyright 2023 Google LLC.
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
/**
 *  Start End Packer implementation based on `tf.layers.Layer`.
 */
/* Original source: keras-nlp/start_end_packer.py */
import { Tensor, concat, serialization, stack, tensor, tidy } from '@tensorflow/tfjs-core';
import { Layer } from '../../../engine/topology';
import { ValueError } from '../../../errors';
/**
 * Adds start and end tokens to a sequence and pads to a fixed length.
 *
 *  This layer is useful when tokenizing inputs for tasks like translation,
 *  where each sequence should include a start and end marker. It should
 *  be called after tokenization. The layer will first trim inputs to fit, then
 *  add start/end tokens, and finally pad, if necessary, to `sequence_length`.
 *
 *  Input should be either a `tf.Tensor[]` or a dense `tf.Tensor`, and
 *  either rank-1 or rank-2.
 */
class StartEndPacker extends Layer {
    constructor(args) {
        super(args);
        this.sequenceLength = args.sequenceLength;
        this.startValue = args.startValue;
        this.endValue = args.endValue;
        this.padValue = args.padValue;
    }
    call(inputs, kwargs = { addStartValue: true, addEndValue: true }) {
        return this.callAndReturnPaddingMask(inputs, kwargs)[0];
    }
    /**
     * Exactly like `call` except also returns a boolean padding mask of all
     * locations that are filled in with the `padValue`.
     */
    callAndReturnPaddingMask(inputs, kwargs = { addStartValue: true, addEndValue: true }) {
        return tidy(() => {
            var _a;
            // Add a new axis at the beginning if needed.
            let x = inputs instanceof Tensor ? [inputs] : inputs;
            const inputIs1d = inputs instanceof Tensor && inputs.rank === 1;
            if (x.some(t => t.rank !== 1)) {
                throw new ValueError('Input must either be a rank 1 Tensor or an array of rank 1 Tensors.');
            }
            const sequenceLength = (_a = kwargs.sequenceLength) !== null && _a !== void 0 ? _a : this.sequenceLength;
            // Concatenate start and end tokens.
            if (kwargs.addStartValue && this.startValue != null) {
                const startTokenIdTensor = tensor([this.startValue]);
                x = x.map(t => concat([startTokenIdTensor, t]));
            }
            if (kwargs.addEndValue && this.endValue != null) {
                const endTokenIdTensor = tensor([this.endValue]);
                // Trim to leave room for end token.
                x = x.map(t => {
                    const sliced = t.slice(0, Math.min(t.shape[0], sequenceLength - 1));
                    const padded = concat([sliced, endTokenIdTensor]);
                    return padded;
                });
            }
            // tf.pad does not allow padding on Tensors with dtype='string'
            function ensureLength(input, length, padValue) {
                if (padValue === undefined) {
                    padValue = input.dtype === 'string' ? '' : 0;
                }
                if (typeof padValue === 'number') {
                    return input.pad([[0, length - input.size]], padValue);
                }
                const strInput = input.arraySync();
                if (strInput.length <= length) {
                    const pads = Array(length - strInput.length).fill(padValue);
                    return tensor(strInput.concat(pads));
                }
                return tensor(strInput.slice(0, strInput.length - length));
            }
            const paddedMask = x.map(t => {
                // `onesLike` not used since it does not support string tensors.
                const ones = tensor(Array(t.shape[0]).fill(1));
                return ensureLength(ones, sequenceLength, 0).cast('bool');
            });
            const mask = inputIs1d ?
                paddedMask[0]
                : stack(paddedMask);
            const paddedTensors = x.map(t => ensureLength(t, sequenceLength, this.padValue));
            const outputs = inputIs1d ?
                paddedTensors[0]
                : stack(paddedTensors);
            return [outputs, mask];
        });
    }
    getConfig() {
        const config = {
            sequenceLength: this.sequenceLength,
            startValue: this.startValue,
            endValue: this.endValue,
            padValue: this.padValue,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
StartEndPacker.className = 'StartEndPacker';
export { StartEndPacker };
serialization.registerClass(StartEndPacker);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnRfZW5kX3BhY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvbmxwL3ByZXByb2Nlc3Npbmcvc3RhcnRfZW5kX3BhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7R0FFRztBQUVILG9EQUFvRDtBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFzQixNQUFNLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFL0csT0FBTyxFQUFFLEtBQUssRUFBYSxNQUFNLDBCQUEwQixDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQWlEN0M7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQWEsY0FBZSxTQUFRLEtBQUs7SUFTdkMsWUFBWSxJQUF3QjtRQUNsQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFWixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM5QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDaEMsQ0FBQztJQUVRLElBQUksQ0FDWCxNQUF1QixFQUN2QixTQUE4QixFQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBQztRQUV0RSxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVEOzs7T0FHRztJQUNILHdCQUF3QixDQUN0QixNQUF1QixFQUN2QixTQUE4QixFQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBQztRQUV0RSxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7O1lBQ2YsNkNBQTZDO1lBQzdDLElBQUksQ0FBQyxHQUFHLE1BQU0sWUFBWSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUVyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO1lBRWhFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxVQUFVLENBQ2xCLHFFQUFxRSxDQUN0RSxDQUFDO2FBQ0g7WUFDRCxNQUFNLGNBQWMsR0FBRyxNQUFBLE1BQU0sQ0FBQyxjQUFjLG1DQUFJLElBQUksQ0FBQyxjQUFjLENBQUM7WUFFcEUsb0NBQW9DO1lBQ3BDLElBQUksTUFBTSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksRUFBRTtnQkFDbkQsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDckQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDakQ7WUFDRCxJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQy9DLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pELG9DQUFvQztnQkFDcEMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ1osTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNwRSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO29CQUNsRCxPQUFPLE1BQU0sQ0FBQztnQkFDaEIsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUVELCtEQUErRDtZQUMvRCxTQUFTLFlBQVksQ0FDbkIsS0FBYSxFQUFFLE1BQWMsRUFBRSxRQUF3QjtnQkFDdkQsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO29CQUMxQixRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM5QztnQkFDRCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRTtvQkFDaEMsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUN4RDtnQkFFRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUF5QixDQUFDO2dCQUUxRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksTUFBTSxFQUFFO29CQUM3QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzVELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDdEM7Z0JBRUQsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNyQyxnRUFBZ0U7Z0JBQ2hFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxPQUFPLFlBQVksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUN0QixVQUFVLENBQUMsQ0FBQyxDQUFhO2dCQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBYSxDQUFDO1lBRWxDLE1BQU0sYUFBYSxHQUNqQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDN0QsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0JBQ3pCLGFBQWEsQ0FBQyxDQUFDLENBQWE7Z0JBQzVCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFhLENBQUM7WUFFckMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUSxTQUFTO1FBQ2hCLE1BQU0sTUFBTSxHQUFHO1lBQ2IsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1NBQ3hCLENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQzs7QUE3R0Qsa0JBQWtCO0FBQ0Ysd0JBQVMsR0FBRyxnQkFBZ0IsQ0FBQztTQUZsQyxjQUFjO0FBZ0gzQixhQUFhLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqICBTdGFydCBFbmQgUGFja2VyIGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIGB0Zi5sYXllcnMuTGF5ZXJgLlxuICovXG5cbi8qIE9yaWdpbmFsIHNvdXJjZToga2VyYXMtbmxwL3N0YXJ0X2VuZF9wYWNrZXIucHkgKi9cbmltcG9ydCB7IFRlbnNvciwgVGVuc29yMUQsIFRlbnNvcjJELCBjb25jYXQsIHNlcmlhbGl6YXRpb24sIHN0YWNrLCB0ZW5zb3IsIHRpZHkgfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBMYXllciwgTGF5ZXJBcmdzIH0gZnJvbSAnLi4vLi4vLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7IFZhbHVlRXJyb3IgfSBmcm9tICcuLi8uLi8uLi9lcnJvcnMnO1xuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgU3RhcnRFbmRQYWNrZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIEludGVnZXIuIFRoZSBkZXNpcmVkIG91dHB1dCBsZW5ndGguXG4gICAqL1xuICBzZXF1ZW5jZUxlbmd0aDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbnRlZ2VyIG9yIHN0cmluZy4gVGhlIElEIG9yIHRva2VuIHRoYXQgaXMgdG8gYmUgcGxhY2VkIGF0IHRoZSBzdGFydCBvZlxuICAgKiBlYWNoIHNlcXVlbmNlLiBUaGUgZHR5cGUgbXVzdCBtYXRjaCB0aGUgZHR5cGUgb2YgdGhlIGlucHV0IHRlbnNvcnMgdG8gdGhlXG4gICAqIGxheWVyLiBJZiB1bmRlZmluZWQsIG5vIHN0YXJ0IHZhbHVlIHdpbGwgYmUgYWRkZWQuXG4gICAqL1xuICBzdGFydFZhbHVlPzogbnVtYmVyfHN0cmluZztcblxuICAvKipcbiAgICogSW50ZWdlciBvciBzdHJpbmcuIFRoZSBJRCBvciB0b2tlbiB0aGF0IGlzIHRvIGJlIHBsYWNlZCBhdCB0aGUgZW5kIG9mIGVhY2hcbiAgICogaW5wdXQgc2VnbWVudC4gVGhlIGR0eXBlIG11c3QgbWF0Y2ggdGhlIGR0eXBlIG9mIHRoZSBpbnB1dCB0ZW5zb3JzIHRvIHRoZVxuICAgKiBsYXllci4gSWYgdW5kZWZpbmVkLCBubyBlbmQgdmFsdWUgd2lsbCBiZSBhZGRlZC5cbiAgICovXG4gIGVuZFZhbHVlPzogbnVtYmVyfHN0cmluZztcblxuICAvKipcbiAgICogSW50ZWdlciBvciBzdHJpbmcuIFRoZSBJRCBvciB0b2tlbiB0aGF0IGlzIHRvIGJlIHBsYWNlZCBpbnRvIHRoZSB1bnVzZWRcbiAgICogcG9zaXRpb25zIGFmdGVyIHRoZSBsYXN0IHNlZ21lbnQgaW4gdGhlIHNlcXVlbmNlLiBJZiB1bmRlZmluZWQsIDAgb3IgJydcbiAgICogd2lsbCBiZSBhZGRlZCBkZXBlbmRpbmcgb24gdGhlIGR0eXBlIG9mIHRoZSBpbnB1dCB0ZW5zb3IuXG4gICAqL1xuICBwYWRWYWx1ZT86IG51bWJlcnxzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBTdGFydEVuZFBhY2tlck9wdGlvbnMge1xuICAvKipcbiAgICogUGFzcyB0byBvdmVycmlkZSB0aGUgY29uZmlndXJlZCBgc2VxdWVuY2VMZW5ndGhgIG9mIHRoZSBsYXllci5cbiAgICovXG4gIHNlcXVlbmNlTGVuZ3RoPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBQYXNzIGBmYWxzZWAgdG8gbm90IGFwcGVuZCBhIHN0YXJ0IHZhbHVlIGZvciB0aGlzIGlucHV0LlxuICAgKiBEZWZhdWx0cyB0byB0cnVlLlxuICAgKi9cbiAgYWRkU3RhcnRWYWx1ZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFBhc3MgYGZhbHNlYCB0byBub3QgYXBwZW5kIGFuIGVuZCB2YWx1ZSBmb3IgdGhpcyBpbnB1dC5cbiAgICogRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICovXG4gIGFkZEVuZFZhbHVlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBZGRzIHN0YXJ0IGFuZCBlbmQgdG9rZW5zIHRvIGEgc2VxdWVuY2UgYW5kIHBhZHMgdG8gYSBmaXhlZCBsZW5ndGguXG4gKlxuICogIFRoaXMgbGF5ZXIgaXMgdXNlZnVsIHdoZW4gdG9rZW5pemluZyBpbnB1dHMgZm9yIHRhc2tzIGxpa2UgdHJhbnNsYXRpb24sXG4gKiAgd2hlcmUgZWFjaCBzZXF1ZW5jZSBzaG91bGQgaW5jbHVkZSBhIHN0YXJ0IGFuZCBlbmQgbWFya2VyLiBJdCBzaG91bGRcbiAqICBiZSBjYWxsZWQgYWZ0ZXIgdG9rZW5pemF0aW9uLiBUaGUgbGF5ZXIgd2lsbCBmaXJzdCB0cmltIGlucHV0cyB0byBmaXQsIHRoZW5cbiAqICBhZGQgc3RhcnQvZW5kIHRva2VucywgYW5kIGZpbmFsbHkgcGFkLCBpZiBuZWNlc3NhcnksIHRvIGBzZXF1ZW5jZV9sZW5ndGhgLlxuICpcbiAqICBJbnB1dCBzaG91bGQgYmUgZWl0aGVyIGEgYHRmLlRlbnNvcltdYCBvciBhIGRlbnNlIGB0Zi5UZW5zb3JgLCBhbmRcbiAqICBlaXRoZXIgcmFuay0xIG9yIHJhbmstMi5cbiAqL1xuZXhwb3J0IGNsYXNzIFN0YXJ0RW5kUGFja2VyIGV4dGVuZHMgTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIHJlYWRvbmx5IGNsYXNzTmFtZSA9ICdTdGFydEVuZFBhY2tlcic7XG5cbiAgcHJpdmF0ZSBzZXF1ZW5jZUxlbmd0aDogbnVtYmVyO1xuICBwcml2YXRlIHN0YXJ0VmFsdWU/OiBudW1iZXJ8c3RyaW5nO1xuICBwcml2YXRlIGVuZFZhbHVlPzogbnVtYmVyfHN0cmluZztcbiAgcHJpdmF0ZSBwYWRWYWx1ZT86IG51bWJlcnxzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoYXJnczogU3RhcnRFbmRQYWNrZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG5cbiAgICB0aGlzLnNlcXVlbmNlTGVuZ3RoID0gYXJncy5zZXF1ZW5jZUxlbmd0aDtcbiAgICB0aGlzLnN0YXJ0VmFsdWUgPSBhcmdzLnN0YXJ0VmFsdWU7XG4gICAgdGhpcy5lbmRWYWx1ZSA9IGFyZ3MuZW5kVmFsdWU7XG4gICAgdGhpcy5wYWRWYWx1ZSA9IGFyZ3MucGFkVmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKFxuICAgIGlucHV0czogVGVuc29yfFRlbnNvcltdLFxuICAgIGt3YXJnczogU3RhcnRFbmRQYWNrZXJPcHRpb25zPXthZGRTdGFydFZhbHVlOiB0cnVlLCBhZGRFbmRWYWx1ZTogdHJ1ZX1cbiAgKTogVGVuc29yfFRlbnNvcjJEIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQW5kUmV0dXJuUGFkZGluZ01hc2soaW5wdXRzLCBrd2FyZ3MpWzBdO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YWN0bHkgbGlrZSBgY2FsbGAgZXhjZXB0IGFsc28gcmV0dXJucyBhIGJvb2xlYW4gcGFkZGluZyBtYXNrIG9mIGFsbFxuICAgKiBsb2NhdGlvbnMgdGhhdCBhcmUgZmlsbGVkIGluIHdpdGggdGhlIGBwYWRWYWx1ZWAuXG4gICAqL1xuICBjYWxsQW5kUmV0dXJuUGFkZGluZ01hc2soXG4gICAgaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sXG4gICAga3dhcmdzOiBTdGFydEVuZFBhY2tlck9wdGlvbnM9e2FkZFN0YXJ0VmFsdWU6IHRydWUsIGFkZEVuZFZhbHVlOiB0cnVlfVxuICApOiBbVGVuc29yMUR8VGVuc29yMkQsIFRlbnNvcjFEfFRlbnNvcjJEXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgLy8gQWRkIGEgbmV3IGF4aXMgYXQgdGhlIGJlZ2lubmluZyBpZiBuZWVkZWQuXG4gICAgICBsZXQgeCA9IGlucHV0cyBpbnN0YW5jZW9mIFRlbnNvciA/IFtpbnB1dHNdIDogaW5wdXRzO1xuXG4gICAgICBjb25zdCBpbnB1dElzMWQgPSBpbnB1dHMgaW5zdGFuY2VvZiBUZW5zb3IgJiYgaW5wdXRzLnJhbmsgPT09IDE7XG5cbiAgICAgIGlmICh4LnNvbWUodCA9PiB0LnJhbmsgIT09IDEpKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICdJbnB1dCBtdXN0IGVpdGhlciBiZSBhIHJhbmsgMSBUZW5zb3Igb3IgYW4gYXJyYXkgb2YgcmFuayAxIFRlbnNvcnMuJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2VxdWVuY2VMZW5ndGggPSBrd2FyZ3Muc2VxdWVuY2VMZW5ndGggPz8gdGhpcy5zZXF1ZW5jZUxlbmd0aDtcblxuICAgICAgLy8gQ29uY2F0ZW5hdGUgc3RhcnQgYW5kIGVuZCB0b2tlbnMuXG4gICAgICBpZiAoa3dhcmdzLmFkZFN0YXJ0VmFsdWUgJiYgdGhpcy5zdGFydFZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgc3RhcnRUb2tlbklkVGVuc29yID0gdGVuc29yKFt0aGlzLnN0YXJ0VmFsdWVdKTtcbiAgICAgICAgeCA9IHgubWFwKHQgPT4gY29uY2F0KFtzdGFydFRva2VuSWRUZW5zb3IsIHRdKSk7XG4gICAgICB9XG4gICAgICBpZiAoa3dhcmdzLmFkZEVuZFZhbHVlICYmIHRoaXMuZW5kVmFsdWUgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBlbmRUb2tlbklkVGVuc29yID0gdGVuc29yKFt0aGlzLmVuZFZhbHVlXSk7XG4gICAgICAgIC8vIFRyaW0gdG8gbGVhdmUgcm9vbSBmb3IgZW5kIHRva2VuLlxuICAgICAgICB4ID0geC5tYXAodCA9PiB7XG4gICAgICAgICAgY29uc3Qgc2xpY2VkID0gdC5zbGljZSgwLCBNYXRoLm1pbih0LnNoYXBlWzBdLCBzZXF1ZW5jZUxlbmd0aCAtIDEpKTtcbiAgICAgICAgICBjb25zdCBwYWRkZWQgPSBjb25jYXQoW3NsaWNlZCwgZW5kVG9rZW5JZFRlbnNvcl0pO1xuICAgICAgICAgIHJldHVybiBwYWRkZWQ7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyB0Zi5wYWQgZG9lcyBub3QgYWxsb3cgcGFkZGluZyBvbiBUZW5zb3JzIHdpdGggZHR5cGU9J3N0cmluZydcbiAgICAgIGZ1bmN0aW9uIGVuc3VyZUxlbmd0aChcbiAgICAgICAgaW5wdXQ6IFRlbnNvciwgbGVuZ3RoOiBudW1iZXIsIHBhZFZhbHVlPzogc3RyaW5nfG51bWJlcikge1xuICAgICAgICBpZiAocGFkVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBhZFZhbHVlID0gaW5wdXQuZHR5cGUgPT09ICdzdHJpbmcnID8gJycgOiAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcGFkVmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgcmV0dXJuIGlucHV0LnBhZChbWzAsIGxlbmd0aCAtIGlucHV0LnNpemVdXSwgcGFkVmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RySW5wdXQgPSBpbnB1dC5hcnJheVN5bmMoKSBhcyB1bmtub3duIGFzIHN0cmluZ1tdO1xuXG4gICAgICAgIGlmIChzdHJJbnB1dC5sZW5ndGggPD0gbGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgcGFkcyA9IEFycmF5KGxlbmd0aCAtIHN0cklucHV0Lmxlbmd0aCkuZmlsbChwYWRWYWx1ZSk7XG4gICAgICAgICAgcmV0dXJuIHRlbnNvcihzdHJJbnB1dC5jb25jYXQocGFkcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRlbnNvcihzdHJJbnB1dC5zbGljZSgwLCBzdHJJbnB1dC5sZW5ndGggLSBsZW5ndGgpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGFkZGVkTWFzazogVGVuc29yW10gPSB4Lm1hcCh0ID0+IHtcbiAgICAgICAgLy8gYG9uZXNMaWtlYCBub3QgdXNlZCBzaW5jZSBpdCBkb2VzIG5vdCBzdXBwb3J0IHN0cmluZyB0ZW5zb3JzLlxuICAgICAgICBjb25zdCBvbmVzID0gdGVuc29yKEFycmF5KHQuc2hhcGVbMF0pLmZpbGwoMSkpO1xuICAgICAgICByZXR1cm4gZW5zdXJlTGVuZ3RoKG9uZXMsIHNlcXVlbmNlTGVuZ3RoLCAwKS5jYXN0KCdib29sJyk7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IG1hc2sgPSBpbnB1dElzMWQgP1xuICAgICAgICBwYWRkZWRNYXNrWzBdIGFzIFRlbnNvcjFEXG4gICAgICAgIDogc3RhY2socGFkZGVkTWFzaykgYXMgVGVuc29yMkQ7XG5cbiAgICAgIGNvbnN0IHBhZGRlZFRlbnNvcnM6IFRlbnNvcltdID1cbiAgICAgICAgeC5tYXAodCA9PiBlbnN1cmVMZW5ndGgodCwgc2VxdWVuY2VMZW5ndGgsIHRoaXMucGFkVmFsdWUpKTtcbiAgICAgIGNvbnN0IG91dHB1dHMgPSBpbnB1dElzMWQgP1xuICAgICAgICBwYWRkZWRUZW5zb3JzWzBdIGFzIFRlbnNvcjFEXG4gICAgICAgIDogc3RhY2socGFkZGVkVGVuc29ycykgYXMgVGVuc29yMkQ7XG5cbiAgICAgIHJldHVybiBbb3V0cHV0cywgbWFza107XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICBzZXF1ZW5jZUxlbmd0aDogdGhpcy5zZXF1ZW5jZUxlbmd0aCxcbiAgICAgIHN0YXJ0VmFsdWU6IHRoaXMuc3RhcnRWYWx1ZSxcbiAgICAgIGVuZFZhbHVlOiB0aGlzLmVuZFZhbHVlLFxuICAgICAgcGFkVmFsdWU6IHRoaXMucGFkVmFsdWUsXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhTdGFydEVuZFBhY2tlcik7XG4iXX0=