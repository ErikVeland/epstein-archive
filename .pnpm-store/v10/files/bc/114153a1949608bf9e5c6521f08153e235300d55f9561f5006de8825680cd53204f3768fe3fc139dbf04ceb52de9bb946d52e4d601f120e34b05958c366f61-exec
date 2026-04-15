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
 *  Cached MHA layer based on `MultiHeadAttention`.
 */
/* Original source: keras_nlp/layers/modeling/cached_multi_head_attention.py */
import { cast, einsum, mul, reciprocal, serialization, sqrt, stack, tidy } from '@tensorflow/tfjs-core';
import { ValueError } from '../../../errors';
import { MultiHeadAttention } from '../multihead_attention';
import { sliceUpdate } from '../utils';
/**
 * MultiHeadAttention layer with cache support.
 *
 * This layer is suitable for use in autoregressive decoding. It can be use
 * to cache decoder self-attention and cross-attention. The forward pass
 * can happen in one of three modes:
 * - No cache, same as regular multi-head attention.
 * - Static cache (`cacheUpdateIndex` is None). In this case, the
 *     cached key/value projections will be used and the input values will
 *     be ignored.
 * - Updated cache (`cacheUpdateIndex` is not None). In this case, new
 *     key/value projections are computed using the input, and spliced into
 *     the cache at the specified index.
 *
 * Note that caching is useful only during inference and should not be used
 * during training.
 *
 * We use the notation `B`, `T`, `S` below, where `B` is the batch dimension,
 * `T` is the target sequence length, and `S` in the source sequence length.
 * Note that during generative decoding, `T` is usually 1 (you are
 * generating a target sequence of length one to predict the next token).
 *
 * Returns:
 *     An `(attentionOutput, cache)` tuple. `attentionOutput` is the result
 *     of the computation, of shape `(B, T, dim)`, where `T` is for target
 *     sequence shapes and `dim` is the query input last dimension if
 *     `outputShape` is `null`. Otherwise, the multi-head outputs are
 *     projected to the shape specified by `outputShape`. `cache` is the
 *     updated cache.
 */
export class CachedMultiHeadAttention extends MultiHeadAttention {
    call(query, kwargs) {
        return this.callAndReturnCache(query, kwargs)[0];
    }
    /**
     * Exactly like `call` except also returns the updated cache.
     */
    callAndReturnCache(query, { value, key, attentionMask, cache, cacheUpdateIndex }) {
        return tidy(() => {
            if (!this.builtFromSignature) {
                this.buildFromSignature(query.shape, value.shape, key ? key.shape : null);
            }
            if (key == null) {
                key = value;
            }
            query = this.queryDense.apply(query);
            // If cache is not `null`, we will use the cache to compute the final key
            // and value tensors. If `cacheUpdateIndex` is not `null`, we will first
            // update the cache before use. To do this, we first call the
            // `keyDense` and `valueDense` layers, and copy the outputs into the
            // cache at the specified index. `cache = null` handles the training
            // case, where we don't use the cache at all.
            if (cache != null) {
                const keyCache = cache.gather([0], 1).squeeze();
                const valueCache = cache.gather([1], 1).squeeze();
                if (cacheUpdateIndex == null) {
                    key = keyCache;
                    value = valueCache;
                }
                else {
                    const keyUpdate = this.keyDense.apply(key);
                    const valueUpdate = this.valueDense.apply(value);
                    const start = [0, cacheUpdateIndex, 0, 0];
                    key = sliceUpdate(keyCache, start, keyUpdate);
                    value = sliceUpdate(valueCache, start, valueUpdate);
                    cache = stack([key, value], 1);
                }
            }
            else {
                if (cacheUpdateIndex != null) {
                    throw new ValueError('`cacheUpdateIndex` should not be set if `cache` is `null`. ' +
                        `Received: cache=${cache}, cacheUpdateIndex=${cacheUpdateIndex}`);
                }
                key = this.keyDense.apply(key);
                value = this.valueDense.apply(value);
            }
            query = mul(query, reciprocal(sqrt(cast(this.keyDim, query.dtype))));
            let attentionScores = einsum(this.dotProductEquation, key, query);
            attentionScores = this.maskedSoftmax(attentionScores, attentionMask);
            attentionScores = this.dropoutLayer.apply(attentionScores);
            let attentionOutput = einsum(this.combineEquation, attentionScores, value);
            attentionOutput = this.outputDense.apply(attentionOutput);
            return [attentionOutput, cache];
        });
    }
}
serialization.registerClass(CachedMultiHeadAttention);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkX211bHRpaGVhZF9hdHRlbnRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC9tb2RlbGluZy9jYWNoZWRfbXVsdGloZWFkX2F0dGVudGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7R0FFRztBQUVILCtFQUErRTtBQUMvRSxPQUFPLEVBQVUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWhILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBaUR2Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E2Qkc7QUFDSCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsa0JBQWtCO0lBRXJELElBQUksQ0FDWCxLQUFhLEVBQUUsTUFBdUM7UUFFdEQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7T0FFRztJQUNILGtCQUFrQixDQUNoQixLQUFhLEVBQ2IsRUFDRSxLQUFLLEVBQ0wsR0FBRyxFQUNILGFBQWEsRUFDYixLQUFLLEVBQ0wsZ0JBQWdCLEVBQ2lCO1FBRW5DLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxrQkFBa0IsQ0FDckIsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMs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QUM7Q0FDRjtBQUNELGFBQWEsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTEMuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiAgQ2FjaGVkIE1IQSBsYXllciBiYXNlZCBvbiBgTXVsdGlIZWFkQXR0ZW50aW9uYC5cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzX25scC9sYXllcnMvbW9kZWxpbmcvY2FjaGVkX211bHRpX2hlYWRfYXR0ZW50aW9uLnB5ICovXG5pbXBvcnQgeyBUZW5zb3IsIGNhc3QsIGVpbnN1bSwgbXVsLCByZWNpcHJvY2FsLCBzZXJpYWxpemF0aW9uLCBzcXJ0LCBzdGFjaywgdGlkeSB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7IFZhbHVlRXJyb3IgfSBmcm9tICcuLi8uLi8uLi9lcnJvcnMnO1xuaW1wb3J0IHsgTXVsdGlIZWFkQXR0ZW50aW9uIH0gZnJvbSAnLi4vbXVsdGloZWFkX2F0dGVudGlvbic7XG5pbXBvcnQgeyBzbGljZVVwZGF0ZSB9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIENhY2hlZE11bHRpSGVhZEF0dGVudGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogUXVlcnkgYFRlbnNvcmAgb2Ygc2hhcGUgYChCLCBULCBkaW0pYC5cbiAgICovXG5cbiAgLyoqXG4gICAqIFZhbHVlIGBUZW5zb3JgIG9mIHNoYXBlIGAoQiwgUyosIGRpbSlgLiBJZiBgY2FjaGVgIGlzIGBudWxsYCwgYFMqYFxuICAgKiBtdXN0IGVxdWFsIGBTYCBhbmQgbWF0Y2ggdGhlIHNoYXBlIG9mIGBhdHRlbnRpb25NYXNrYC4gSWYgYGNhY2hlYCBpc1xuICAgKiBub3QgYG51bGxgLCBgUypgIGNhbiBiZSBhbnkgbGVuZ3RoIGxlc3MgdGhhbiBgU2AsIGFuZCB0aGUgY29tcHV0ZWRcbiAgICogdmFsdWUgd2lsbCBiZSBzcGxpY2VkIGludG8gYGNhY2hlYCBhdCBgY2FjaGVVcGRhdGVJbmRleGAuXG4gICAqL1xuICB2YWx1ZTogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBLZXkgYFRlbnNvcmAgb2Ygc2hhcGUgYChCLCBTKiwgZGltKWAuICBJZiBgY2FjaGVgIGlzIGBudWxsYCwgYFMqYCBtdXN0XG4gICAqIGVxdWFsIGBTYCBhbmQgbWF0Y2ggdGhlIHNoYXBlIG9mIGBhdHRlbnRpb25NYXNrYC4gSWYgYGNhY2hlYCBpcyBub3QgYG51bGxgLFxuICAgKiBgUypgIGNhbiBiZSBhbnkgbGVuZ3RoIGxlc3MgdGhhbiBgU2AsIGFuZCB0aGUgY29tcHV0ZWQgdmFsdWUgd2lsbCBiZVxuICAgKiBzcGxpY2VkIGludG8gYGNhY2hlYCBhdCBgY2FjaGVVcGRhdGVJbmRleGAuXG4gICAqL1xuICBrZXk/OiBUZW5zb3I7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiBtYXNrIG9mIHNoYXBlIGAoQiwgVCwgUylgLiBgYXR0ZW50aW9uTWFza2AgcHJldmVudHNcbiAgICogYXR0ZW50aW9uIHRvIGNlcnRhaW4gcG9zaXRpb25zLiBUaGUgYm9vbGVhbiBtYXNrIHNwZWNpZmllcyB3aGljaFxuICAgKiBxdWVyeSBlbGVtZW50cyBjYW4gYXR0ZW5kIHRvIHdoaWNoIGtleSBlbGVtZW50cywgMSBpbmRpY2F0ZXNcbiAgICogYXR0ZW50aW9uIGFuZCAwIGluZGljYXRlcyBubyBhdHRlbnRpb24uIEJyb2FkY2FzdGluZyBjYW4gaGFwcGVuIGZvclxuICAgKiB0aGUgbWlzc2luZyBiYXRjaCBkaW1lbnNpb25zIGFuZCB0aGUgaGVhZCBkaW1lbnNpb24uXG4gICAqL1xuICBhdHRlbnRpb25NYXNrPzogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBBIGRlbnNlIGZsb2F0IFRlbnNvci4gVGhlIGtleS92YWx1ZSBjYWNoZSwgb2Ygc2hhcGVcbiAgICogYFtCLCAyLCBTLCBudW1IZWFkcywga2V5RGltc11gLCB3aGVyZSBgU2AgbXVzdCBhZ3JlZSB3aXRoIHRoZVxuICAgKiBgYXR0ZW50aW9uTWFza2Agc2hhcGUuIFRoaXMgYXJndW1lbnQgaXMgaW50ZW5kZWQgZm9yIHVzZSBkdXJpbmdcbiAgICogZ2VuZXJhdGlvbiB0byBhdm9pZCByZWNvbXB1dGluZyBpbnRlcm1lZGlhdGUgc3RhdGUuXG4gICAqL1xuICBjYWNoZT86IFRlbnNvcjtcblxuICAvKipcbiAgICogSW50ZWdlciBvciBJbnRlZ2VyIGBUZW5zb3JgLiBUaGUgaW5kZXggYXQgd2hpY2ggdG8gdXBkYXRlIGBjYWNoZWBcbiAgICogKHVzdWFsbHkgdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHRva2VuIGJlaW5nIHByb2Nlc3NlZCB3aGVuIHJ1bm5pbmdcbiAgICogZ2VuZXJhdGlvbikuIElmIGBjYWNoZVVwZGF0ZUluZGV4PW51bGxgIHdoaWxlIGBjYWNoZWAgaXMgc2V0LCB0aGUgY2FjaGVcbiAgICogd2lsbCBub3QgYmUgdXBkYXRlZC5cbiAgICovXG4gIGNhY2hlVXBkYXRlSW5kZXg/OiBudW1iZXI7XG59XG5cbi8qKlxuICogTXVsdGlIZWFkQXR0ZW50aW9uIGxheWVyIHdpdGggY2FjaGUgc3VwcG9ydC5cbiAqXG4gKiBUaGlzIGxheWVyIGlzIHN1aXRhYmxlIGZvciB1c2UgaW4gYXV0b3JlZ3Jlc3NpdmUgZGVjb2RpbmcuIEl0IGNhbiBiZSB1c2VcbiAqIHRvIGNhY2hlIGRlY29kZXIgc2VsZi1hdHRlbnRpb24gYW5kIGNyb3NzLWF0dGVudGlvbi4gVGhlIGZvcndhcmQgcGFzc1xuICogY2FuIGhhcHBlbiBpbiBvbmUgb2YgdGhyZWUgbW9kZXM6XG4gKiAtIE5vIGNhY2hlLCBzYW1lIGFzIHJlZ3VsYXIgbXVsdGktaGVhZCBhdHRlbnRpb24uXG4gKiAtIFN0YXRpYyBjYWNoZSAoYGNhY2hlVXBkYXRlSW5kZXhgIGlzIE5vbmUpLiBJbiB0aGlzIGNhc2UsIHRoZVxuICogICAgIGNhY2hlZCBrZXkvdmFsdWUgcHJvamVjdGlvbnMgd2lsbCBiZSB1c2VkIGFuZCB0aGUgaW5wdXQgdmFsdWVzIHdpbGxcbiAqICAgICBiZSBpZ25vcmVkLlxuICogLSBVcGRhdGVkIGNhY2hlIChgY2FjaGVVcGRhdGVJbmRleGAgaXMgbm90IE5vbmUpLiBJbiB0aGlzIGNhc2UsIG5ld1xuICogICAgIGtleS92YWx1ZSBwcm9qZWN0aW9ucyBhcmUgY29tcHV0ZWQgdXNpbmcgdGhlIGlucHV0LCBhbmQgc3BsaWNlZCBpbnRvXG4gKiAgICAgdGhlIGNhY2hlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gKlxuICogTm90ZSB0aGF0IGNhY2hpbmcgaXMgdXNlZnVsIG9ubHkgZHVyaW5nIGluZmVyZW5jZSBhbmQgc2hvdWxkIG5vdCBiZSB1c2VkXG4gKiBkdXJpbmcgdHJhaW5pbmcuXG4gKlxuICogV2UgdXNlIHRoZSBub3RhdGlvbiBgQmAsIGBUYCwgYFNgIGJlbG93LCB3aGVyZSBgQmAgaXMgdGhlIGJhdGNoIGRpbWVuc2lvbixcbiAqIGBUYCBpcyB0aGUgdGFyZ2V0IHNlcXVlbmNlIGxlbmd0aCwgYW5kIGBTYCBpbiB0aGUgc291cmNlIHNlcXVlbmNlIGxlbmd0aC5cbiAqIE5vdGUgdGhhdCBkdXJpbmcgZ2VuZXJhdGl2ZSBkZWNvZGluZywgYFRgIGlzIHVzdWFsbHkgMSAoeW91IGFyZVxuICogZ2VuZXJhdGluZyBhIHRhcmdldCBzZXF1ZW5jZSBvZiBsZW5ndGggb25lIHRvIHByZWRpY3QgdGhlIG5leHQgdG9rZW4pLlxuICpcbiAqIFJldHVybnM6XG4gKiAgICAgQW4gYChhdHRlbnRpb25PdXRwdXQsIGNhY2hlKWAgdHVwbGUuIGBhdHRlbnRpb25PdXRwdXRgIGlzIHRoZSByZXN1bHRcbiAqICAgICBvZiB0aGUgY29tcHV0YXRpb24sIG9mIHNoYXBlIGAoQiwgVCwgZGltKWAsIHdoZXJlIGBUYCBpcyBmb3IgdGFyZ2V0XG4gKiAgICAgc2VxdWVuY2Ugc2hhcGVzIGFuZCBgZGltYCBpcyB0aGUgcXVlcnkgaW5wdXQgbGFzdCBkaW1lbnNpb24gaWZcbiAqICAgICBgb3V0cHV0U2hhcGVgIGlzIGBudWxsYC4gT3RoZXJ3aXNlLCB0aGUgbXVsdGktaGVhZCBvdXRwdXRzIGFyZVxuICogICAgIHByb2plY3RlZCB0byB0aGUgc2hhcGUgc3BlY2lmaWVkIGJ5IGBvdXRwdXRTaGFwZWAuIGBjYWNoZWAgaXMgdGhlXG4gKiAgICAgdXBkYXRlZCBjYWNoZS5cbiAqL1xuZXhwb3J0IGNsYXNzIENhY2hlZE11bHRpSGVhZEF0dGVudGlvbiBleHRlbmRzIE11bHRpSGVhZEF0dGVudGlvbiB7XG5cbiAgb3ZlcnJpZGUgY2FsbChcbiAgICBxdWVyeTogVGVuc29yLCBrd2FyZ3M6IENhY2hlZE11bHRpSGVhZEF0dGVudGlvbk9wdGlvbnNcbiAgKTogVGVuc29yIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQW5kUmV0dXJuQ2FjaGUocXVlcnksIGt3YXJncylbMF07XG4gIH1cblxuICAvKipcbiAgICogRXhhY3RseSBsaWtlIGBjYWxsYCBleGNlcHQgYWxzbyByZXR1cm5zIHRoZSB1cGRhdGVkIGNhY2hlLlxuICAgKi9cbiAgY2FsbEFuZFJldHVybkNhY2hlKFxuICAgIHF1ZXJ5OiBUZW5zb3IsXG4gICAge1xuICAgICAgdmFsdWUsXG4gICAgICBrZXksXG4gICAgICBhdHRlbnRpb25NYXNrLFxuICAgICAgY2FjaGUsXG4gICAgICBjYWNoZVVwZGF0ZUluZGV4XG4gICAgfSA6IENhY2hlZE11bHRpSGVhZEF0dGVudGlvbk9wdGlvbnNcbiAgKTogW1RlbnNvciwgVGVuc29yXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLmJ1aWx0RnJvbVNpZ25hdHVyZSkge1xuICAgICAgICB0aGlzLmJ1aWxkRnJvbVNpZ25hdHVyZShcbiAgICAgICAgICBxdWVyeS5zaGFwZSwgdmFsdWUuc2hhcGUsIGtleSA/IGtleS5zaGFwZSA6IG51bGwpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PSBudWxsKSB7XG4gICAgICAgIGtleSA9IHZhbHVlO1xuICAgICAgfVxuXG4gICAgICBxdWVyeSA9IHRoaXMucXVlcnlEZW5zZS5hcHBseShxdWVyeSkgYXMgVGVuc29yO1xuICAgICAgLy8gSWYgY2FjaGUgaXMgbm90IGBudWxsYCwgd2Ugd2lsbCB1c2UgdGhlIGNhY2hlIHRvIGNvbXB1dGUgdGhlIGZpbmFsIGtleVxuICAgICAgLy8gYW5kIHZhbHVlIHRlbnNvcnMuIElmIGBjYWNoZVVwZGF0ZUluZGV4YCBpcyBub3QgYG51bGxgLCB3ZSB3aWxsIGZpcnN0XG4gICAgICAvLyB1cGRhdGUgdGhlIGNhY2hlIGJlZm9yZSB1c2UuIFRvIGRvIHRoaXMsIHdlIGZpcnN0IGNhbGwgdGhlXG4gICAgICAvLyBga2V5RGVuc2VgIGFuZCBgdmFsdWVEZW5zZWAgbGF5ZXJzLCBhbmQgY29weSB0aGUgb3V0cHV0cyBpbnRvIHRoZVxuICAgICAgLy8gY2FjaGUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC4gYGNhY2hlID0gbnVsbGAgaGFuZGxlcyB0aGUgdHJhaW5pbmdcbiAgICAgIC8vIGNhc2UsIHdoZXJlIHdlIGRvbid0IHVzZSB0aGUgY2FjaGUgYXQgYWxsLlxuICAgICAgaWYgKGNhY2hlICE9IG51bGwpIHtcbiAgICAgICAgY29uc3Qga2V5Q2FjaGUgPSBjYWNoZS5nYXRoZXIoWzBdLCAxKS5zcXVlZXplKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlQ2FjaGUgPSBjYWNoZS5nYXRoZXIoWzFdLCAxKS5zcXVlZXplKCk7XG4gICAgICAgIGlmIChjYWNoZVVwZGF0ZUluZGV4ID09IG51bGwpIHtcbiAgICAgICAgICBrZXkgPSBrZXlDYWNoZTtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlQ2FjaGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qga2V5VXBkYXRlID0gdGhpcy5rZXlEZW5zZS5hcHBseShrZXkpIGFzIFRlbnNvcjtcbiAgICAgICAgICBjb25zdCB2YWx1ZVVwZGF0ZSA9IHRoaXMudmFsdWVEZW5zZS5hcHBseSh2YWx1ZSkgYXMgVGVuc29yO1xuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gWzAsIGNhY2hlVXBkYXRlSW5kZXgsIDAsIDBdO1xuICAgICAgICAgIGtleSA9IHNsaWNlVXBkYXRlKGtleUNhY2hlLCBzdGFydCwga2V5VXBkYXRlKTtcbiAgICAgICAgICB2YWx1ZSA9IHNsaWNlVXBkYXRlKHZhbHVlQ2FjaGUsIHN0YXJ0LCB2YWx1ZVVwZGF0ZSk7XG4gICAgICAgICAgY2FjaGUgPSBzdGFjayhba2V5LCB2YWx1ZV0sIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoY2FjaGVVcGRhdGVJbmRleCAhPSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAnYGNhY2hlVXBkYXRlSW5kZXhgIHNob3VsZCBub3QgYmUgc2V0IGlmIGBjYWNoZWAgaXMgYG51bGxgLiAnICtcbiAgICAgICAgICAgIGBSZWNlaXZlZDogY2FjaGU9JHtjYWNoZX0sIGNhY2hlVXBkYXRlSW5kZXg9JHtjYWNoZVVwZGF0ZUluZGV4fWBcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGtleSA9IHRoaXMua2V5RGVuc2UuYXBwbHkoa2V5KSBhcyBUZW5zb3I7XG4gICAgICAgIHZhbHVlID0gdGhpcy52YWx1ZURlbnNlLmFwcGx5KHZhbHVlKSBhcyBUZW5zb3I7XG4gICAgICB9XG5cbiAgICAgIHF1ZXJ5ID0gbXVsKHF1ZXJ5LCByZWNpcHJvY2FsKHNxcnQoY2FzdCh0aGlzLmtleURpbSwgcXVlcnkuZHR5cGUpKSkpO1xuICAgICAgbGV0IGF0dGVudGlvblNjb3JlcyA9IGVpbnN1bSh0aGlzLmRvdFByb2R1Y3RFcXVhdGlvbiwga2V5LCBxdWVyeSk7XG4gICAgICBhdHRlbnRpb25TY29yZXMgPSB0aGlzLm1hc2tlZFNvZnRtYXgoYXR0ZW50aW9uU2NvcmVzLCBhdHRlbnRpb25NYXNrKTtcbiAgICAgIGF0dGVudGlvblNjb3JlcyA9IHRoaXMuZHJvcG91dExheWVyLmFwcGx5KGF0dGVudGlvblNjb3JlcykgYXMgVGVuc29yO1xuXG4gICAgICBsZXQgYXR0ZW50aW9uT3V0cHV0ID1cbiAgICAgICAgZWluc3VtKHRoaXMuY29tYmluZUVxdWF0aW9uLCBhdHRlbnRpb25TY29yZXMsIHZhbHVlKTtcbiAgICAgIGF0dGVudGlvbk91dHB1dCA9IHRoaXMub3V0cHV0RGVuc2UuYXBwbHkoYXR0ZW50aW9uT3V0cHV0KSBhcyBUZW5zb3I7XG5cbiAgICAgIHJldHVybiBbYXR0ZW50aW9uT3V0cHV0LCBjYWNoZV07XG4gICAgfSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhDYWNoZWRNdWx0aUhlYWRBdHRlbnRpb24pO1xuIl19