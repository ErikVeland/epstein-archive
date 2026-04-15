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
 *  Utility functions for `TransformerDecoder`.
 */
/* Original source: keras_nlp/layers/modeling/transformer_layer_utils.py */
import { add, expandDims, tensor, tidy } from '@tensorflow/tfjs-core';
import { ValueError } from '../../../errors';
function checkMasksShapes(inputs, paddingMask, attentionMask) {
    if (paddingMask != null) {
        if (paddingMask.shape.length !== 2) {
            throw new ValueError('`paddingMask` should have shape ' +
                `[batchSize, targetLength]. Received shape ${paddingMask.shape}.`);
        }
    }
    if (attentionMask != null) {
        if (attentionMask.shape.length !== 3) {
            throw new ValueError('`attentionMask` should have shape ' +
                `[batchSize, targetLength, sourceLength]. ` +
                `Received shape ${attentionMask.shape}.`);
        }
    }
}
/**
 * Compute a causal attention mask for a transformer decoder.
 *
 * @param batchSize batch size for the mask.
 * @param inputLength the length of key/value tensors in the attention layer.
 * @param outputLength the length of query tensor in the attention layer.
 * @param cacheIndex the current index for cached generation. If passed, the
 *  query sequence will be considered to start at `cacheIndex` rather than zero.
 *  For example, a casual mask with `outputLength=1` and `cacheIndex=5` would
 *  allow the query tensor to attend to the first five positions of the
 *  key/value tensors.
 *
 * @returns a causal attention mask with shape
 *  `[batchSize, outputLength, inputLength]` that can be passed to a attention
 *  layer.
 */
export function computeCausalMask(batchSize, inputLength, outputLength, cacheIndex = 0) {
    return tidy(() => {
        const i = add(expandDims(Array.from({ length: outputLength }, (_, i) => i), 1), cacheIndex);
        const j = tensor(Array.from({ length: inputLength }, (_, i) => i));
        const mask = i.greaterEqual(j).cast('int32').expandDims(0);
        return mask.broadcastTo([batchSize, outputLength, inputLength]);
    });
}
/**
 * Merge the padding mask with a customized attention mask.
 *
 * @param inputs the input sequence.
 * @param paddingMask the 1D padding mask, of shape
 *          [batchSize, sequenceLength].
 * @param attentionMask the 2D customized mask, of shape
 *          [batchSize, sequenceLength, sequence2_length].
 * @returns
 *  A merged 2D mask or null. If only `paddingMask` is provided, the
 *  returned mask is paddingMask with one additional axis.
 */
export function mergePaddingAndAttentionMask(inputs, paddingMask, attentionMask) {
    return tidy(() => {
        checkMasksShapes(inputs, paddingMask, attentionMask);
        let mask;
        if (paddingMask != null) {
            // Add an axis for broadcasting, the attention mask should be 2D
            // (not including the batch axis).
            mask = paddingMask.expandDims(1).cast('int32');
        }
        if (attentionMask != null) {
            attentionMask = attentionMask.cast('int32');
            if (mask == null) {
                return attentionMask;
            }
            else {
                return mask.minimum(attentionMask);
            }
        }
        return mask;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXJfbGF5ZXJfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC9tb2RlbGluZy90cmFuc2Zvcm1lcl9sYXllcl91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7R0FFRztBQUVILDJFQUEyRTtBQUMzRSxPQUFPLEVBQVUsR0FBRyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTdDLFNBQVMsZ0JBQWdCLENBQ3JCLE1BQWMsRUFBRSxXQUFtQixFQUFFLGFBQXFCO0lBQzVELElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtRQUN2QixJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFJLENBQUMsRUFBRTtZQUNqQyxNQUFNLElBQUksVUFBVSxDQUNsQixrQ0FBa0M7Z0JBQ2xDLDZDQUE2QyxXQUFXLENBQUMsS0FBSyxHQUFHLENBQ2xFLENBQUM7U0FDSDtLQUNGO0lBQ0QsSUFBSSxhQUFhLElBQUksSUFBSSxFQUFFO1FBQ3pCLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3BDLE1BQU0sSUFBSSxVQUFVLENBQ2xCLG9DQUFvQztnQkFDcEMsMkNBQTJDO2dCQUMzQyxrQkFBa0IsYUFBYSxDQUFDLEtBQUssR0FBRyxDQUN6QyxDQUFDO1NBQ0g7S0FDRjtBQUNILENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQzdCLFNBQWlCLEVBQ2pCLFdBQW1CLEVBQ25CLFlBQW9CLEVBQ3BCLFVBQVUsR0FBRyxDQUFDO0lBRWhCLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FDWCxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM5RCxVQUFVLENBQ1gsQ0FBQztRQUNGLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLFdBQVcsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxVQUFVLDRCQUE0QixDQUN4QyxNQUFjLEVBQUUsV0FBbUIsRUFBRSxhQUFxQjtJQUM1RCxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDZixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3JELElBQUksSUFBWSxDQUFDO1FBQ2pCLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtZQUN2QixnRUFBZ0U7WUFDaEUsa0NBQWtDO1lBQ2xDLElBQUksR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNoRDtRQUNELElBQUksYUFBYSxJQUFJLElBQUksRUFBRTtZQUN6QixhQUFhLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QyxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLE9BQU8sYUFBYSxDQUFDO2FBQ3RCO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUNwQztTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogIFV0aWxpdHkgZnVuY3Rpb25zIGZvciBgVHJhbnNmb3JtZXJEZWNvZGVyYC5cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzX25scC9sYXllcnMvbW9kZWxpbmcvdHJhbnNmb3JtZXJfbGF5ZXJfdXRpbHMucHkgKi9cbmltcG9ydCB7IFRlbnNvciwgYWRkLCBleHBhbmREaW1zLCB0ZW5zb3IsIHRpZHkgfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBWYWx1ZUVycm9yIH0gZnJvbSAnLi4vLi4vLi4vZXJyb3JzJztcblxuZnVuY3Rpb24gY2hlY2tNYXNrc1NoYXBlcyhcbiAgICBpbnB1dHM6IFRlbnNvciwgcGFkZGluZ01hc2s6IFRlbnNvciwgYXR0ZW50aW9uTWFzazogVGVuc29yKTogdm9pZCB7XG4gIGlmIChwYWRkaW5nTWFzayAhPSBudWxsKSB7XG4gICAgaWYgKHBhZGRpbmdNYXNrLnNoYXBlLmxlbmd0aCAhPT0yKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgJ2BwYWRkaW5nTWFza2Agc2hvdWxkIGhhdmUgc2hhcGUgJyArXG4gICAgICAgIGBbYmF0Y2hTaXplLCB0YXJnZXRMZW5ndGhdLiBSZWNlaXZlZCBzaGFwZSAke3BhZGRpbmdNYXNrLnNoYXBlfS5gXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBpZiAoYXR0ZW50aW9uTWFzayAhPSBudWxsKSB7XG4gICAgaWYgKGF0dGVudGlvbk1hc2suc2hhcGUubGVuZ3RoICE9PSAzKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgJ2BhdHRlbnRpb25NYXNrYCBzaG91bGQgaGF2ZSBzaGFwZSAnICtcbiAgICAgICAgYFtiYXRjaFNpemUsIHRhcmdldExlbmd0aCwgc291cmNlTGVuZ3RoXS4gYCArXG4gICAgICAgIGBSZWNlaXZlZCBzaGFwZSAke2F0dGVudGlvbk1hc2suc2hhcGV9LmBcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ29tcHV0ZSBhIGNhdXNhbCBhdHRlbnRpb24gbWFzayBmb3IgYSB0cmFuc2Zvcm1lciBkZWNvZGVyLlxuICpcbiAqIEBwYXJhbSBiYXRjaFNpemUgYmF0Y2ggc2l6ZSBmb3IgdGhlIG1hc2suXG4gKiBAcGFyYW0gaW5wdXRMZW5ndGggdGhlIGxlbmd0aCBvZiBrZXkvdmFsdWUgdGVuc29ycyBpbiB0aGUgYXR0ZW50aW9uIGxheWVyLlxuICogQHBhcmFtIG91dHB1dExlbmd0aCB0aGUgbGVuZ3RoIG9mIHF1ZXJ5IHRlbnNvciBpbiB0aGUgYXR0ZW50aW9uIGxheWVyLlxuICogQHBhcmFtIGNhY2hlSW5kZXggdGhlIGN1cnJlbnQgaW5kZXggZm9yIGNhY2hlZCBnZW5lcmF0aW9uLiBJZiBwYXNzZWQsIHRoZVxuICogIHF1ZXJ5IHNlcXVlbmNlIHdpbGwgYmUgY29uc2lkZXJlZCB0byBzdGFydCBhdCBgY2FjaGVJbmRleGAgcmF0aGVyIHRoYW4gemVyby5cbiAqICBGb3IgZXhhbXBsZSwgYSBjYXN1YWwgbWFzayB3aXRoIGBvdXRwdXRMZW5ndGg9MWAgYW5kIGBjYWNoZUluZGV4PTVgIHdvdWxkXG4gKiAgYWxsb3cgdGhlIHF1ZXJ5IHRlbnNvciB0byBhdHRlbmQgdG8gdGhlIGZpcnN0IGZpdmUgcG9zaXRpb25zIG9mIHRoZVxuICogIGtleS92YWx1ZSB0ZW5zb3JzLlxuICpcbiAqIEByZXR1cm5zIGEgY2F1c2FsIGF0dGVudGlvbiBtYXNrIHdpdGggc2hhcGVcbiAqICBgW2JhdGNoU2l6ZSwgb3V0cHV0TGVuZ3RoLCBpbnB1dExlbmd0aF1gIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhIGF0dGVudGlvblxuICogIGxheWVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZUNhdXNhbE1hc2soXG4gICAgYmF0Y2hTaXplOiBudW1iZXIsXG4gICAgaW5wdXRMZW5ndGg6IG51bWJlcixcbiAgICBvdXRwdXRMZW5ndGg6IG51bWJlcixcbiAgICBjYWNoZUluZGV4ID0gMFxuICApOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgY29uc3QgaSA9IGFkZChcbiAgICAgIGV4cGFuZERpbXMoQXJyYXkuZnJvbSh7bGVuZ3RoOiBvdXRwdXRMZW5ndGh9LCAoXywgaSkgPT4gaSksIDEpLFxuICAgICAgY2FjaGVJbmRleCxcbiAgICApO1xuICAgIGNvbnN0IGogPSB0ZW5zb3IoQXJyYXkuZnJvbSh7bGVuZ3RoOiBpbnB1dExlbmd0aH0sIChfLCBpKSA9PiBpKSk7XG4gICAgY29uc3QgbWFzayA9IGkuZ3JlYXRlckVxdWFsKGopLmNhc3QoJ2ludDMyJykuZXhwYW5kRGltcygwKTtcbiAgICByZXR1cm4gbWFzay5icm9hZGNhc3RUbyhbYmF0Y2hTaXplLCBvdXRwdXRMZW5ndGgsIGlucHV0TGVuZ3RoXSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIE1lcmdlIHRoZSBwYWRkaW5nIG1hc2sgd2l0aCBhIGN1c3RvbWl6ZWQgYXR0ZW50aW9uIG1hc2suXG4gKlxuICogQHBhcmFtIGlucHV0cyB0aGUgaW5wdXQgc2VxdWVuY2UuXG4gKiBAcGFyYW0gcGFkZGluZ01hc2sgdGhlIDFEIHBhZGRpbmcgbWFzaywgb2Ygc2hhcGVcbiAqICAgICAgICAgIFtiYXRjaFNpemUsIHNlcXVlbmNlTGVuZ3RoXS5cbiAqIEBwYXJhbSBhdHRlbnRpb25NYXNrIHRoZSAyRCBjdXN0b21pemVkIG1hc2ssIG9mIHNoYXBlXG4gKiAgICAgICAgICBbYmF0Y2hTaXplLCBzZXF1ZW5jZUxlbmd0aCwgc2VxdWVuY2UyX2xlbmd0aF0uXG4gKiBAcmV0dXJuc1xuICogIEEgbWVyZ2VkIDJEIG1hc2sgb3IgbnVsbC4gSWYgb25seSBgcGFkZGluZ01hc2tgIGlzIHByb3ZpZGVkLCB0aGVcbiAqICByZXR1cm5lZCBtYXNrIGlzIHBhZGRpbmdNYXNrIHdpdGggb25lIGFkZGl0aW9uYWwgYXhpcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlUGFkZGluZ0FuZEF0dGVudGlvbk1hc2soXG4gICAgaW5wdXRzOiBUZW5zb3IsIHBhZGRpbmdNYXNrOiBUZW5zb3IsIGF0dGVudGlvbk1hc2s6IFRlbnNvcik6IFRlbnNvciB7XG4gIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICBjaGVja01hc2tzU2hhcGVzKGlucHV0cywgcGFkZGluZ01hc2ssIGF0dGVudGlvbk1hc2spO1xuICAgIGxldCBtYXNrOiBUZW5zb3I7XG4gICAgaWYgKHBhZGRpbmdNYXNrICE9IG51bGwpIHtcbiAgICAgIC8vIEFkZCBhbiBheGlzIGZvciBicm9hZGNhc3RpbmcsIHRoZSBhdHRlbnRpb24gbWFzayBzaG91bGQgYmUgMkRcbiAgICAgIC8vIChub3QgaW5jbHVkaW5nIHRoZSBiYXRjaCBheGlzKS5cbiAgICAgIG1hc2sgPSBwYWRkaW5nTWFzay5leHBhbmREaW1zKDEpLmNhc3QoJ2ludDMyJyk7XG4gICAgfVxuICAgIGlmIChhdHRlbnRpb25NYXNrICE9IG51bGwpIHtcbiAgICAgIGF0dGVudGlvbk1hc2sgPSBhdHRlbnRpb25NYXNrLmNhc3QoJ2ludDMyJyk7XG4gICAgICBpZiAobWFzayA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBhdHRlbnRpb25NYXNrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG1hc2subWluaW11bShhdHRlbnRpb25NYXNrKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hc2s7XG4gIH0pO1xufVxuIl19