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
 * GPT2 Causal LM (Language Model).
 */
/* Original source: keras-nlp/models/gpt2/gpt2_causal_lm.py */
import { serialization } from '@tensorflow/tfjs-core';
import { NotImplementedError } from '../../../../errors';
import { Layer } from '../../../../exports_layers';
import { GenerativeTask } from '../generative_task';
class ReverseEmbedding extends Layer {
    constructor(args) {
        super(args);
        this.embedding = args.embedding;
    }
    call(inputs, kwargs) {
        throw new NotImplementedError();
    }
    computeOutputShape(inputShape) {
        throw new NotImplementedError();
    }
}
/**
 * An end-to-end GPT2 model for causal language modeling.
 *
 * A causal language model (LM) predicts the next token based on previous
 * tokens. This task setup can be used to train the model unsupervised on
 * plain text input, or to autoregressively generate plain text similar to
 * the data used for training. This task can be used for pre-training or
 * fine-tuning a GPT-2 model, simply by calling `fit()`.
 *
 * This model has a `generate()` method, which generates text based on a
 * prompt. The generation strategy used is controlled by an additional
 * sampler` argument on `compile()`.
 * By default, the top k results will be returned.
 *
 * This model can optionally be configured with a `preprocessor` layer, in
 * which case it will automatically apply preprocessing to string inputs during
 * fit()`, `predict()`, `evaluate()` and `generate()`. This is done by default
 * when creating the model with `fromPreset()`.
 *
 * Disclaimer: Pre-trained models are provided on an "as is" basis, without
 * warranties or conditions of any kind. The underlying model is provided by a
 * third party and subject to a separate license, available
 * here](https://github.com/openai/gpt-2).
 *
 * Use `generate()` to do text generation.
 * ```js
 * const gpt2LM = GPT2CausalLM.fromPreset('gpt2_base_en');
 * gpt2LM.generate("I want to say", max_length=30);
 * // Generate with batched prompts.
 * gpt2LM.generate(["This is a", "Where are you"], max_length=30);
 * ```
 *
 * Use `generate()` without preprocessing.
 * ```js
 * // Prompt the model with `5338, 318` (the token ids for `"Who is"`).
 * // Use `"paddingMask"` to indicate values that should not be overridden.
 * const prompt = {
 *  tokenIds: tf.tensor([[5338, 318, 0, 0, 0], [5338, 318, 0, 0, 0]]),
 *  paddingMask: tf.tensor([[1, 1, 0, 0, 0], [1, 1, 0, 0, 0]]]),
 * };
 * const gpt2LM = GPT2CausalLM.from_preset('gpt2_base_en', null);
 * gpt2LM.generate(prompt);
 * ```
 *
 * Call `fit()` on a single batch.
 * ```js
 * const features = ['The quick brown fox jumped.', 'I forgot my homework.'];
 * const gpt2LM = GPT2CausalLM.from_preset('gpt2_base_en');
 * gpt2LM.fit(features, {batchSize: 2});
 * ```
 *
 * Call `fit()` without preprocessing.
 * ```js
 * const x = {
 *  tokenIds: tf.tensor([[50256, 1, 2, 3, 4], [50256, 1, 2, 3, 4]]),
 *  paddingMask: tf.tensor([[1, 1, 1, 1, 1], [1, 1, 1, 1, 1]]),
 * };
 * const y = tf.tensor([[1, 2, 3, 4, 50256], [1, 2, 3, 4, 50256]]);
 * const sw = tf.tensor([[1, 1, 1, 1, 1], [1, 1, 1, 1, 1]]);
 * const gpt2LM = GPT2CausalLM.from_preset('gpt2_base_en', null);
 * gpt2LM.fit(x, y, {sampleWeight: sw, batchSize: 2});
 * ```
 *
 * Custom backbone and vocabulary.
 * ```js
 * const features = ["a quick fox.", "a fox quick."];
 * const vocab = {"<|endoftext|>": 0, "a": 4, "Ġquick": 5, "Ġfox": 6};
 * const merges = [
 *  "Ġ q", "u i", "c k", "ui ck", "Ġq uick", "Ġ f", "o x", "Ġf ox"
 * ];
 * const tokenizer = new GPT2Tokenizer({vocabulary: vocab, merges});
 * const preprocessor =  new GPT2CausalLMPreprocessor({
 *  tokenizer,
 *  sequence_length: 128,
 * });
 * const backbone = new GPT2Backbone({
 *  vocabularysize: 30552,
 *  numlayers: 4,
 *  numheads: 4,
 *  hiddendim: 256,
 *  intermediatedim: 512,
 *  maxSequenceLength: 128,
 * });
 * const gpt2LM = new GPT2CausalLM({backbone, preprocessor});
 * gpt2LM.fit(features, {batch_size: 2});
 * ```
 */
class GPT2CausalLM extends GenerativeTask {
    constructor(args) {
        super(args);
        throw new NotImplementedError(`Uses ${ReverseEmbedding}.`);
    }
    static presets(cls) {
        throw new NotImplementedError();
    }
    /**
     * Forward pass of `GPT2CausalLM` with cache.
     *
     * `callWithCache` adds an additional forward pass for the model for
     * autoregressive inference. Unlike calling the model directly, this method
     * allows caching previous key/value Tensors in multi-head attention layer,
     * and avoids recomputing the outputs of seen tokens.
     *
     * @param tokenIds a dense int Tensor with shape `[batchSize, maxLength]`.
     * @param cache a dense float Tensor, the cache of key and value.
     * @param cacheUpdateIndex Integer. The index of current inputs in the whole
     *  sequence.
     * @returns [logits, hiddenStates, cache], where `logits` is the
     *  language model logits for the input tokenIds, `hiddenStates` is
     *  the final hidden representation of the input tokens, and `cache` is
     *  the decoding cache.
     */
    callWithCache(tokenIds, cache, cacheUpdateIndex) {
        throw new NotImplementedError();
    }
    /**
     * Build an empty cache for use with `callWithCache()`.
     */
    buildCache(tokenIds) {
        throw new NotImplementedError();
    }
    /**
     * A compilable generation function for a single batch of inputs.
     *
     * This function represents the inner generation function for a single batch
     *  of inputs.
     *
     * @param inputs An object with two keys `tokenIds` and `paddingMask` and
     *  batched tensor values.
     * @param endTokenId The id of the end token to stop on. If all
     *  sequences have produced a new `endTokenId`, generation will stop.
     */
    generateStep(inputs, endTokenId) {
        throw new NotImplementedError(`Uses ${this.buildCache}`);
    }
}
/** @nocollapse */
GPT2CausalLM.className = 'GPT2CausalLM';
export { GPT2CausalLM };
serialization.registerClass(GPT2CausalLM);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B0Ml9jYXVzYWxfbG0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC9tb2RlbHMvZ3B0Mi9ncHQyX2NhdXNhbF9sbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7R0FFRztBQUVILDhEQUE4RDtBQUM5RCxPQUFPLEVBQTBCLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUluRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFTcEQsTUFBTSxnQkFBaUIsU0FBUSxLQUFLO0lBR2xDLFlBQVksSUFBMEI7UUFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ2xDLENBQUM7SUFFUSxJQUFJLENBQUMsTUFBdUIsRUFBRSxNQUFjO1FBQ25ELE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFUSxrQkFBa0IsQ0FBQyxVQUF5QjtRQUNuRCxNQUFNLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBRUY7QUFnQkQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0ZHO0FBQ0gsTUFBYSxZQUFhLFNBQVEsY0FBYztJQUk5QyxZQUFZLElBQXNCO1FBQ2hDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNaLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsTUFBTSxDQUFVLE9BQU8sQ0FDckIsR0FBNkM7UUFFN0MsTUFBTSxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0gsYUFBYSxDQUNYLFFBQWdCLEVBQ2hCLEtBQWEsRUFDYixnQkFBd0I7UUFFeEIsTUFBTSxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssVUFBVSxDQUFDLFFBQWdCO1FBQ2pDLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ00sWUFBWSxDQUNuQixNQUFzQixFQUN0QixVQUFrQjtRQUVsQixNQUFNLElBQUksbUJBQW1CLENBQUMsUUFBUSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDOztBQTlERCxrQkFBa0I7QUFDRixzQkFBUyxHQUFHLGNBQWMsQ0FBQztTQUZoQyxZQUFZO0FBaUV6QixhQUFhLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTEMuXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEdQVDIgQ2F1c2FsIExNIChMYW5ndWFnZSBNb2RlbCkuXHJcbiAqL1xyXG5cclxuLyogT3JpZ2luYWwgc291cmNlOiBrZXJhcy1ubHAvbW9kZWxzL2dwdDIvZ3B0Ml9jYXVzYWxfbG0ucHkgKi9cclxuaW1wb3J0IHsgTmFtZWRUZW5zb3JNYXAsIFRlbnNvciwgc2VyaWFsaXphdGlvbiB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XHJcblxyXG5pbXBvcnQgeyBHUFQyUHJlcHJvY2Vzc29yIH0gZnJvbSAnLi9ncHQyX3ByZXByb2Nlc3Nvcic7XHJcbmltcG9ydCB7IE5vdEltcGxlbWVudGVkRXJyb3IgfSBmcm9tICcuLi8uLi8uLi8uLi9lcnJvcnMnO1xyXG5pbXBvcnQgeyBMYXllciB9IGZyb20gJy4uLy4uLy4uLy4uL2V4cG9ydHNfbGF5ZXJzJztcclxuaW1wb3J0IHsgTGF5ZXJBcmdzIH0gZnJvbSAnLi4vLi4vLi4vLi4vZW5naW5lL3RvcG9sb2d5JztcclxuaW1wb3J0IHsgRW1iZWRkaW5nIH0gZnJvbSAnLi4vLi4vLi4vLi4vbGF5ZXJzL2VtYmVkZGluZ3MnO1xyXG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4uLy4uLy4uLy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xyXG5pbXBvcnQgeyBHZW5lcmF0aXZlVGFzayB9IGZyb20gJy4uL2dlbmVyYXRpdmVfdGFzayc7XHJcbmltcG9ydCB7IEdQVDJCYWNrYm9uZSB9IGZyb20gJy4vZ3B0Ml9iYWNrYm9uZSc7XHJcbmltcG9ydCB7IFBpcGVsaW5lTW9kZWxBcmdzIH0gZnJvbSAnLi4vLi4vdXRpbHMnO1xyXG5pbXBvcnQgeyBLd2FyZ3MgfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcyc7XHJcblxyXG5kZWNsYXJlIGludGVyZmFjZSBSZXZlcnNlRW1iZWRkaW5nQXJncyBleHRlbmRzIExheWVyQXJncyB7XHJcbiAgZW1iZWRkaW5nOiBFbWJlZGRpbmc7XHJcbn1cclxuXHJcbmNsYXNzIFJldmVyc2VFbWJlZGRpbmcgZXh0ZW5kcyBMYXllciB7XHJcbiAgcHJvdGVjdGVkIGVtYmVkZGluZzogRW1iZWRkaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihhcmdzOiBSZXZlcnNlRW1iZWRkaW5nQXJncykge1xyXG4gICAgc3VwZXIoYXJncyk7XHJcbiAgICB0aGlzLmVtYmVkZGluZyA9IGFyZ3MuZW1iZWRkaW5nO1xyXG4gIH1cclxuXHJcbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xyXG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcclxuICB9XHJcblxyXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogU2hhcGV8U2hhcGVbXSB7XHJcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBHUFQyQ2F1c2FsTE1BcmdzIGV4dGVuZHMgUGlwZWxpbmVNb2RlbEFyZ3Mge1xyXG4gIC8qKlxyXG4gICAqIEEgYEdQVDJCYWNrYm9uZWAgaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgYmFja2JvbmU6IEdQVDJCYWNrYm9uZTtcclxuXHJcbiAgLyoqXHJcbiAgICogT3B0aW9uYWwgYEdQVDJDYXVzYWxMTVByZXByb2Nlc3NvcmAuXHJcbiAgICogSWYgYG51bGxgLCB0aGlzIG1vZGVsIHdpbGwgbm90IGFwcGx5IHByZXByb2Nlc3NpbmcsIGFuZCBpbnB1dHMgc2hvdWxkIGJlXHJcbiAgICogcHJlcHJvY2Vzc2VkIGJlZm9yZSBjYWxsaW5nIHRoZSBtb2RlbC5cclxuICAgKi9cclxuICBwcmVwcm9jZXNzb3I/OiBHUFQyUHJlcHJvY2Vzc29yO1xyXG59XHJcblxyXG4vKipcclxuICogQW4gZW5kLXRvLWVuZCBHUFQyIG1vZGVsIGZvciBjYXVzYWwgbGFuZ3VhZ2UgbW9kZWxpbmcuXHJcbiAqXHJcbiAqIEEgY2F1c2FsIGxhbmd1YWdlIG1vZGVsIChMTSkgcHJlZGljdHMgdGhlIG5leHQgdG9rZW4gYmFzZWQgb24gcHJldmlvdXNcclxuICogdG9rZW5zLiBUaGlzIHRhc2sgc2V0dXAgY2FuIGJlIHVzZWQgdG8gdHJhaW4gdGhlIG1vZGVsIHVuc3VwZXJ2aXNlZCBvblxyXG4gKiBwbGFpbiB0ZXh0IGlucHV0LCBvciB0byBhdXRvcmVncmVzc2l2ZWx5IGdlbmVyYXRlIHBsYWluIHRleHQgc2ltaWxhciB0b1xyXG4gKiB0aGUgZGF0YSB1c2VkIGZvciB0cmFpbmluZy4gVGhpcyB0YXNrIGNhbiBiZSB1c2VkIGZvciBwcmUtdHJhaW5pbmcgb3JcclxuICogZmluZS10dW5pbmcgYSBHUFQtMiBtb2RlbCwgc2ltcGx5IGJ5IGNhbGxpbmcgYGZpdCgpYC5cclxuICpcclxuICogVGhpcyBtb2RlbCBoYXMgYSBgZ2VuZXJhdGUoKWAgbWV0aG9kLCB3aGljaCBnZW5lcmF0ZXMgdGV4dCBiYXNlZCBvbiBhXHJcbiAqIHByb21wdC4gVGhlIGdlbmVyYXRpb24gc3RyYXRlZ3kgdXNlZCBpcyBjb250cm9sbGVkIGJ5IGFuIGFkZGl0aW9uYWxcclxuICogc2FtcGxlcmAgYXJndW1lbnQgb24gYGNvbXBpbGUoKWAuXHJcbiAqIEJ5IGRlZmF1bHQsIHRoZSB0b3AgayByZXN1bHRzIHdpbGwgYmUgcmV0dXJuZWQuXHJcbiAqXHJcbiAqIFRoaXMgbW9kZWwgY2FuIG9wdGlvbmFsbHkgYmUgY29uZmlndXJlZCB3aXRoIGEgYHByZXByb2Nlc3NvcmAgbGF5ZXIsIGluXHJcbiAqIHdoaWNoIGNhc2UgaXQgd2lsbCBhdXRvbWF0aWNhbGx5IGFwcGx5IHByZXByb2Nlc3NpbmcgdG8gc3RyaW5nIGlucHV0cyBkdXJpbmdcclxuICogZml0KClgLCBgcHJlZGljdCgpYCwgYGV2YWx1YXRlKClgIGFuZCBgZ2VuZXJhdGUoKWAuIFRoaXMgaXMgZG9uZSBieSBkZWZhdWx0XHJcbiAqIHdoZW4gY3JlYXRpbmcgdGhlIG1vZGVsIHdpdGggYGZyb21QcmVzZXQoKWAuXHJcbiAqXHJcbiAqIERpc2NsYWltZXI6IFByZS10cmFpbmVkIG1vZGVscyBhcmUgcHJvdmlkZWQgb24gYW4gXCJhcyBpc1wiIGJhc2lzLCB3aXRob3V0XHJcbiAqIHdhcnJhbnRpZXMgb3IgY29uZGl0aW9ucyBvZiBhbnkga2luZC4gVGhlIHVuZGVybHlpbmcgbW9kZWwgaXMgcHJvdmlkZWQgYnkgYVxyXG4gKiB0aGlyZCBwYXJ0eSBhbmQgc3ViamVjdCB0byBhIHNlcGFyYXRlIGxpY2Vuc2UsIGF2YWlsYWJsZVxyXG4gKiBoZXJlXShodHRwczovL2dpdGh1Yi5jb20vb3BlbmFpL2dwdC0yKS5cclxuICpcclxuICogVXNlIGBnZW5lcmF0ZSgpYCB0byBkbyB0ZXh0IGdlbmVyYXRpb24uXHJcbiAqIGBgYGpzXHJcbiAqIGNvbnN0IGdwdDJMTSA9IEdQVDJDYXVzYWxMTS5mcm9tUHJlc2V0KCdncHQyX2Jhc2VfZW4nKTtcclxuICogZ3B0MkxNLmdlbmVyYXRlKFwiSSB3YW50IHRvIHNheVwiLCBtYXhfbGVuZ3RoPTMwKTtcclxuICogLy8gR2VuZXJhdGUgd2l0aCBiYXRjaGVkIHByb21wdHMuXHJcbiAqIGdwdDJMTS5nZW5lcmF0ZShbXCJUaGlzIGlzIGFcIiwgXCJXaGVyZSBhcmUgeW91XCJdLCBtYXhfbGVuZ3RoPTMwKTtcclxuICogYGBgXHJcbiAqXHJcbiAqIFVzZSBgZ2VuZXJhdGUoKWAgd2l0aG91dCBwcmVwcm9jZXNzaW5nLlxyXG4gKiBgYGBqc1xyXG4gKiAvLyBQcm9tcHQgdGhlIG1vZGVsIHdpdGggYDUzMzgsIDMxOGAgKHRoZSB0b2tlbiBpZHMgZm9yIGBcIldobyBpc1wiYCkuXHJcbiAqIC8vIFVzZSBgXCJwYWRkaW5nTWFza1wiYCB0byBpbmRpY2F0ZSB2YWx1ZXMgdGhhdCBzaG91bGQgbm90IGJlIG92ZXJyaWRkZW4uXHJcbiAqIGNvbnN0IHByb21wdCA9IHtcclxuICogIHRva2VuSWRzOiB0Zi50ZW5zb3IoW1s1MzM4LCAzMTgsIDAsIDAsIDBdLCBbNTMzOCwgMzE4LCAwLCAwLCAwXV0pLFxyXG4gKiAgcGFkZGluZ01hc2s6IHRmLnRlbnNvcihbWzEsIDEsIDAsIDAsIDBdLCBbMSwgMSwgMCwgMCwgMF1dXSksXHJcbiAqIH07XHJcbiAqIGNvbnN0IGdwdDJMTSA9IEdQVDJDYXVzYWxMTS5mcm9tX3ByZXNldCgnZ3B0Ml9iYXNlX2VuJywgbnVsbCk7XHJcbiAqIGdwdDJMTS5nZW5lcmF0ZShwcm9tcHQpO1xyXG4gKiBgYGBcclxuICpcclxuICogQ2FsbCBgZml0KClgIG9uIGEgc2luZ2xlIGJhdGNoLlxyXG4gKiBgYGBqc1xyXG4gKiBjb25zdCBmZWF0dXJlcyA9IFsnVGhlIHF1aWNrIGJyb3duIGZveCBqdW1wZWQuJywgJ0kgZm9yZ290IG15IGhvbWV3b3JrLiddO1xyXG4gKiBjb25zdCBncHQyTE0gPSBHUFQyQ2F1c2FsTE0uZnJvbV9wcmVzZXQoJ2dwdDJfYmFzZV9lbicpO1xyXG4gKiBncHQyTE0uZml0KGZlYXR1cmVzLCB7YmF0Y2hTaXplOiAyfSk7XHJcbiAqIGBgYFxyXG4gKlxyXG4gKiBDYWxsIGBmaXQoKWAgd2l0aG91dCBwcmVwcm9jZXNzaW5nLlxyXG4gKiBgYGBqc1xyXG4gKiBjb25zdCB4ID0ge1xyXG4gKiAgdG9rZW5JZHM6IHRmLnRlbnNvcihbWzUwMjU2LCAxLCAyLCAzLCA0XSwgWzUwMjU2LCAxLCAyLCAzLCA0XV0pLFxyXG4gKiAgcGFkZGluZ01hc2s6IHRmLnRlbnNvcihbWzEsIDEsIDEsIDEsIDFdLCBbMSwgMSwgMSwgMSwgMV1dKSxcclxuICogfTtcclxuICogY29uc3QgeSA9IHRmLnRlbnNvcihbWzEsIDIsIDMsIDQsIDUwMjU2XSwgWzEsIDIsIDMsIDQsIDUwMjU2XV0pO1xyXG4gKiBjb25zdCBzdyA9IHRmLnRlbnNvcihbWzEsIDEsIDEsIDEsIDFdLCBbMSwgMSwgMSwgMSwgMV1dKTtcclxuICogY29uc3QgZ3B0MkxNID0gR1BUMkNhdXNhbExNLmZyb21fcHJlc2V0KCdncHQyX2Jhc2VfZW4nLCBudWxsKTtcclxuICogZ3B0MkxNLmZpdCh4LCB5LCB7c2FtcGxlV2VpZ2h0OiBzdywgYmF0Y2hTaXplOiAyfSk7XHJcbiAqIGBgYFxyXG4gKlxyXG4gKiBDdXN0b20gYmFja2JvbmUgYW5kIHZvY2FidWxhcnkuXHJcbiAqIGBgYGpzXHJcbiAqIGNvbnN0IGZlYXR1cmVzID0gW1wiYSBxdWljayBmb3guXCIsIFwiYSBmb3ggcXVpY2suXCJdO1xyXG4gKiBjb25zdCB2b2NhYiA9IHtcIjx8ZW5kb2Z0ZXh0fD5cIjogMCwgXCJhXCI6IDQsIFwixKBxdWlja1wiOiA1LCBcIsSgZm94XCI6IDZ9O1xyXG4gKiBjb25zdCBtZXJnZXMgPSBbXHJcbiAqICBcIsSgIHFcIiwgXCJ1IGlcIiwgXCJjIGtcIiwgXCJ1aSBja1wiLCBcIsSgcSB1aWNrXCIsIFwixKAgZlwiLCBcIm8geFwiLCBcIsSgZiBveFwiXHJcbiAqIF07XHJcbiAqIGNvbnN0IHRva2VuaXplciA9IG5ldyBHUFQyVG9rZW5pemVyKHt2b2NhYnVsYXJ5OiB2b2NhYiwgbWVyZ2VzfSk7XHJcbiAqIGNvbnN0IHByZXByb2Nlc3NvciA9ICBuZXcgR1BUMkNhdXNhbExNUHJlcHJvY2Vzc29yKHtcclxuICogIHRva2VuaXplcixcclxuICogIHNlcXVlbmNlX2xlbmd0aDogMTI4LFxyXG4gKiB9KTtcclxuICogY29uc3QgYmFja2JvbmUgPSBuZXcgR1BUMkJhY2tib25lKHtcclxuICogIHZvY2FidWxhcnlzaXplOiAzMDU1MixcclxuICogIG51bWxheWVyczogNCxcclxuICogIG51bWhlYWRzOiA0LFxyXG4gKiAgaGlkZGVuZGltOiAyNTYsXHJcbiAqICBpbnRlcm1lZGlhdGVkaW06IDUxMixcclxuICogIG1heFNlcXVlbmNlTGVuZ3RoOiAxMjgsXHJcbiAqIH0pO1xyXG4gKiBjb25zdCBncHQyTE0gPSBuZXcgR1BUMkNhdXNhbExNKHtiYWNrYm9uZSwgcHJlcHJvY2Vzc29yfSk7XHJcbiAqIGdwdDJMTS5maXQoZmVhdHVyZXMsIHtiYXRjaF9zaXplOiAyfSk7XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEdQVDJDYXVzYWxMTSBleHRlbmRzIEdlbmVyYXRpdmVUYXNrIHtcclxuICAvKiogQG5vY29sbGFwc2UgKi9cclxuICBzdGF0aWMgb3ZlcnJpZGUgY2xhc3NOYW1lID0gJ0dQVDJDYXVzYWxMTSc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IEdQVDJDYXVzYWxMTUFyZ3MpIHtcclxuICAgIHN1cGVyKGFyZ3MpO1xyXG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoYFVzZXMgJHtSZXZlcnNlRW1iZWRkaW5nfS5gKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBvdmVycmlkZSBwcmVzZXRzPFQgZXh0ZW5kcyBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZT4oXHJcbiAgICBjbHM6IHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD5cclxuICApOiB7fSB7XHJcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRm9yd2FyZCBwYXNzIG9mIGBHUFQyQ2F1c2FsTE1gIHdpdGggY2FjaGUuXHJcbiAgICpcclxuICAgKiBgY2FsbFdpdGhDYWNoZWAgYWRkcyBhbiBhZGRpdGlvbmFsIGZvcndhcmQgcGFzcyBmb3IgdGhlIG1vZGVsIGZvclxyXG4gICAqIGF1dG9yZWdyZXNzaXZlIGluZmVyZW5jZS4gVW5saWtlIGNhbGxpbmcgdGhlIG1vZGVsIGRpcmVjdGx5LCB0aGlzIG1ldGhvZFxyXG4gICAqIGFsbG93cyBjYWNoaW5nIHByZXZpb3VzIGtleS92YWx1ZSBUZW5zb3JzIGluIG11bHRpLWhlYWQgYXR0ZW50aW9uIGxheWVyLFxyXG4gICAqIGFuZCBhdm9pZHMgcmVjb21wdXRpbmcgdGhlIG91dHB1dHMgb2Ygc2VlbiB0b2tlbnMuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gdG9rZW5JZHMgYSBkZW5zZSBpbnQgVGVuc29yIHdpdGggc2hhcGUgYFtiYXRjaFNpemUsIG1heExlbmd0aF1gLlxyXG4gICAqIEBwYXJhbSBjYWNoZSBhIGRlbnNlIGZsb2F0IFRlbnNvciwgdGhlIGNhY2hlIG9mIGtleSBhbmQgdmFsdWUuXHJcbiAgICogQHBhcmFtIGNhY2hlVXBkYXRlSW5kZXggSW50ZWdlci4gVGhlIGluZGV4IG9mIGN1cnJlbnQgaW5wdXRzIGluIHRoZSB3aG9sZVxyXG4gICAqICBzZXF1ZW5jZS5cclxuICAgKiBAcmV0dXJucyBbbG9naXRzLCBoaWRkZW5TdGF0ZXMsIGNhY2hlXSwgd2hlcmUgYGxvZ2l0c2AgaXMgdGhlXHJcbiAgICogIGxhbmd1YWdlIG1vZGVsIGxvZ2l0cyBmb3IgdGhlIGlucHV0IHRva2VuSWRzLCBgaGlkZGVuU3RhdGVzYCBpc1xyXG4gICAqICB0aGUgZmluYWwgaGlkZGVuIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBpbnB1dCB0b2tlbnMsIGFuZCBgY2FjaGVgIGlzXHJcbiAgICogIHRoZSBkZWNvZGluZyBjYWNoZS5cclxuICAgKi9cclxuICBjYWxsV2l0aENhY2hlKFxyXG4gICAgdG9rZW5JZHM6IFRlbnNvcixcclxuICAgIGNhY2hlOiBUZW5zb3IsXHJcbiAgICBjYWNoZVVwZGF0ZUluZGV4OiBudW1iZXJcclxuICApOiBbVGVuc29yLCBUZW5zb3IsIFRlbnNvcl0ge1xyXG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEJ1aWxkIGFuIGVtcHR5IGNhY2hlIGZvciB1c2Ugd2l0aCBgY2FsbFdpdGhDYWNoZSgpYC5cclxuICAgKi9cclxuICBwcml2YXRlIGJ1aWxkQ2FjaGUodG9rZW5JZHM6IFRlbnNvcik6IFtUZW5zb3IsIFRlbnNvcl0ge1xyXG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEEgY29tcGlsYWJsZSBnZW5lcmF0aW9uIGZ1bmN0aW9uIGZvciBhIHNpbmdsZSBiYXRjaCBvZiBpbnB1dHMuXHJcbiAgICpcclxuICAgKiBUaGlzIGZ1bmN0aW9uIHJlcHJlc2VudHMgdGhlIGlubmVyIGdlbmVyYXRpb24gZnVuY3Rpb24gZm9yIGEgc2luZ2xlIGJhdGNoXHJcbiAgICogIG9mIGlucHV0cy5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBpbnB1dHMgQW4gb2JqZWN0IHdpdGggdHdvIGtleXMgYHRva2VuSWRzYCBhbmQgYHBhZGRpbmdNYXNrYCBhbmRcclxuICAgKiAgYmF0Y2hlZCB0ZW5zb3IgdmFsdWVzLlxyXG4gICAqIEBwYXJhbSBlbmRUb2tlbklkIFRoZSBpZCBvZiB0aGUgZW5kIHRva2VuIHRvIHN0b3Agb24uIElmIGFsbFxyXG4gICAqICBzZXF1ZW5jZXMgaGF2ZSBwcm9kdWNlZCBhIG5ldyBgZW5kVG9rZW5JZGAsIGdlbmVyYXRpb24gd2lsbCBzdG9wLlxyXG4gICAqL1xyXG4gIG92ZXJyaWRlIGdlbmVyYXRlU3RlcChcclxuICAgIGlucHV0czogTmFtZWRUZW5zb3JNYXAsXHJcbiAgICBlbmRUb2tlbklkOiBudW1iZXJcclxuICApOiBOYW1lZFRlbnNvck1hcCB7XHJcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihgVXNlcyAke3RoaXMuYnVpbGRDYWNoZX1gKTtcclxuICB9XHJcbn1cclxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEdQVDJDYXVzYWxMTSk7XHJcbiJdfQ==