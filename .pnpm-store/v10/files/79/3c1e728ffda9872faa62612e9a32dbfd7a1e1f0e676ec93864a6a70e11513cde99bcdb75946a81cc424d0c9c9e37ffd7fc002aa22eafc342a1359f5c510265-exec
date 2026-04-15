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
 * GPT2 Causal LM preprocessor layer.
 */
/* Original source: keras-nlp/models/gpt2/gpt2_causal_lm_preprocessor.py */
import { serialization } from '@tensorflow/tfjs-core';
import { GPT2Preprocessor, packXYSampleWeight } from './gpt2_preprocessor';
import { NotImplementedError } from '../../../../errors';
/**
 * GPT2 Causal LM preprocessor.
 *
 * This preprocessing layer is meant for use with
 * `GPT2CausalLM`. By default, it will take in batches of
 * strings, and return outputs in a `[x, y, sampleWeight]` format, where the
 * `y` label is the next token id in the `x` sequence.
 *
 * For use with generation, the layer also exposes two methods
 * generatePreprocess()` and `generatePostprocess()`. When this preprocessor
 * is attached to a `GPT2CausalLM` instance, these methods
 * will be called implicitly in `generate()`. They can also be called
 * standalone (e.g. to precompute preprocessing inputs for generation in a
 * separate process).
 *
 * Examples:
 * ```js
 * // Load the preprocessor from a preset.
 * const preprocessor = GPT2CausalLMPreprocessor.from_preset('gpt2_base_en');
 *
 * // Tokenize and pack a single sentence.
 * const sentence = tf.scalar('League of legends');
 * preprocessor.apply(sentence);
 * // Same output.
 * preprocessor('League of legends');
 *
 * // Tokenize a batch of sentences.
 * const sentences = tf.constant(['Taco tuesday', 'Fish taco please!']);
 * preprocessor.apply(sentences);
 * // Same output.
 * preprocessor.apply(['Taco tuesday', 'Fish taco please!']);
 * ```
 */
class GPT2CausalLMPreprocessor extends GPT2Preprocessor {
    call(inputs, kwargs) {
        const output = this.callAndPackArgs(inputs, kwargs);
        if (kwargs.y) {
            return output[0]['tokenIds'];
        }
        return output['tokenIds'];
    }
    /**
     * Calls the layer and returns extra information like the paddingMask used to
     * pack the sequence, the label data, and the sample weights used.
     */
    callAndPackArgs(inputs, kwargs) {
        throw new NotImplementedError(`Uses ${packXYSampleWeight}`);
    }
    /**
     * Covert strings to integer token input for generation.
     *
     * Similar to calling the layer for training, this method takes in strings
     * or tensor strings, tokenizes and packs the input, and computes a padding
     * mask masking all inputs not filled in with a padded value.
     *
     * Unlike calling the the layer for training, this method does not compute
     * labels and will never append a `tokenizer.endTokenId` to the end of
     * the sequence (as generation is expected to continue at the end of the
     * inputted prompt).
     */
    generatePreprocess(x, sequenceLength) {
        throw new NotImplementedError();
    }
    /**
     * Covert integer token output to strings for generation.
     *
     * This method reverses `generatePreprocess()`, by first removing all
     * padding and start/end tokens, and then converting the integer sequence
     * back to a string.
     */
    generatePostprocess(x) {
        throw new NotImplementedError();
    }
}
/** @nocollapse */
GPT2CausalLMPreprocessor.className = 'GPT2CausalLMPreprocessor';
export { GPT2CausalLMPreprocessor };
serialization.registerClass(GPT2CausalLMPreprocessor);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B0Ml9jYXVzYWxfbG1fcHJlcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9ubHAvbW9kZWxzL2dwdDIvZ3B0Ml9jYXVzYWxfbG1fcHJlcHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVIOztHQUVHO0FBRUgsMkVBQTJFO0FBQzNFLE9BQU8sRUFBMEIsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFOUUsT0FBTyxFQUFFLGdCQUFnQixFQUEyQixrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXpEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdDRztBQUNILE1BQWEsd0JBQXlCLFNBQVEsZ0JBQWdCO0lBSW5ELElBQUksQ0FDWCxNQUF1QixFQUN2QixNQUErQjtRQUUvQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUU7WUFDWixPQUFRLE1BQW1DLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDNUQ7UUFDRCxPQUFRLE1BQXlCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVEOzs7T0FHRztJQUNNLGVBQWUsQ0FDdEIsTUFBdUIsRUFDdkIsTUFBK0I7UUFNL0IsTUFBTSxJQUFJLG1CQUFtQixDQUFDLFFBQVEsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNILGtCQUFrQixDQUFDLENBQVMsRUFBRSxjQUF1QjtRQUNuRCxNQUFNLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsbUJBQW1CLENBQUMsQ0FBaUI7UUFDbkMsTUFBTSxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbEMsQ0FBQzs7QUF0REQsa0JBQWtCO0FBQ0Ysa0NBQVMsR0FBRywwQkFBMEIsQ0FBQztTQUY1Qyx3QkFBd0I7QUEwRHJDLGFBQWEsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBHUFQyIENhdXNhbCBMTSBwcmVwcm9jZXNzb3IgbGF5ZXIuXHJcbiAqL1xyXG5cclxuLyogT3JpZ2luYWwgc291cmNlOiBrZXJhcy1ubHAvbW9kZWxzL2dwdDIvZ3B0Ml9jYXVzYWxfbG1fcHJlcHJvY2Vzc29yLnB5ICovXHJcbmltcG9ydCB7IE5hbWVkVGVuc29yTWFwLCBUZW5zb3IsIHNlcmlhbGl6YXRpb24gfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xyXG5cclxuaW1wb3J0IHsgR1BUMlByZXByb2Nlc3NvciwgR1BUMlByZXByb2Nlc3Nvck9wdGlvbnMsIHBhY2tYWVNhbXBsZVdlaWdodCB9IGZyb20gJy4vZ3B0Ml9wcmVwcm9jZXNzb3InO1xyXG5pbXBvcnQgeyBOb3RJbXBsZW1lbnRlZEVycm9yIH0gZnJvbSAnLi4vLi4vLi4vLi4vZXJyb3JzJztcclxuXHJcbi8qKlxyXG4gKiBHUFQyIENhdXNhbCBMTSBwcmVwcm9jZXNzb3IuXHJcbiAqXHJcbiAqIFRoaXMgcHJlcHJvY2Vzc2luZyBsYXllciBpcyBtZWFudCBmb3IgdXNlIHdpdGhcclxuICogYEdQVDJDYXVzYWxMTWAuIEJ5IGRlZmF1bHQsIGl0IHdpbGwgdGFrZSBpbiBiYXRjaGVzIG9mXHJcbiAqIHN0cmluZ3MsIGFuZCByZXR1cm4gb3V0cHV0cyBpbiBhIGBbeCwgeSwgc2FtcGxlV2VpZ2h0XWAgZm9ybWF0LCB3aGVyZSB0aGVcclxuICogYHlgIGxhYmVsIGlzIHRoZSBuZXh0IHRva2VuIGlkIGluIHRoZSBgeGAgc2VxdWVuY2UuXHJcbiAqXHJcbiAqIEZvciB1c2Ugd2l0aCBnZW5lcmF0aW9uLCB0aGUgbGF5ZXIgYWxzbyBleHBvc2VzIHR3byBtZXRob2RzXHJcbiAqIGdlbmVyYXRlUHJlcHJvY2VzcygpYCBhbmQgYGdlbmVyYXRlUG9zdHByb2Nlc3MoKWAuIFdoZW4gdGhpcyBwcmVwcm9jZXNzb3JcclxuICogaXMgYXR0YWNoZWQgdG8gYSBgR1BUMkNhdXNhbExNYCBpbnN0YW5jZSwgdGhlc2UgbWV0aG9kc1xyXG4gKiB3aWxsIGJlIGNhbGxlZCBpbXBsaWNpdGx5IGluIGBnZW5lcmF0ZSgpYC4gVGhleSBjYW4gYWxzbyBiZSBjYWxsZWRcclxuICogc3RhbmRhbG9uZSAoZS5nLiB0byBwcmVjb21wdXRlIHByZXByb2Nlc3NpbmcgaW5wdXRzIGZvciBnZW5lcmF0aW9uIGluIGFcclxuICogc2VwYXJhdGUgcHJvY2VzcykuXHJcbiAqXHJcbiAqIEV4YW1wbGVzOlxyXG4gKiBgYGBqc1xyXG4gKiAvLyBMb2FkIHRoZSBwcmVwcm9jZXNzb3IgZnJvbSBhIHByZXNldC5cclxuICogY29uc3QgcHJlcHJvY2Vzc29yID0gR1BUMkNhdXNhbExNUHJlcHJvY2Vzc29yLmZyb21fcHJlc2V0KCdncHQyX2Jhc2VfZW4nKTtcclxuICpcclxuICogLy8gVG9rZW5pemUgYW5kIHBhY2sgYSBzaW5nbGUgc2VudGVuY2UuXHJcbiAqIGNvbnN0IHNlbnRlbmNlID0gdGYuc2NhbGFyKCdMZWFndWUgb2YgbGVnZW5kcycpO1xyXG4gKiBwcmVwcm9jZXNzb3IuYXBwbHkoc2VudGVuY2UpO1xyXG4gKiAvLyBTYW1lIG91dHB1dC5cclxuICogcHJlcHJvY2Vzc29yKCdMZWFndWUgb2YgbGVnZW5kcycpO1xyXG4gKlxyXG4gKiAvLyBUb2tlbml6ZSBhIGJhdGNoIG9mIHNlbnRlbmNlcy5cclxuICogY29uc3Qgc2VudGVuY2VzID0gdGYuY29uc3RhbnQoWydUYWNvIHR1ZXNkYXknLCAnRmlzaCB0YWNvIHBsZWFzZSEnXSk7XHJcbiAqIHByZXByb2Nlc3Nvci5hcHBseShzZW50ZW5jZXMpO1xyXG4gKiAvLyBTYW1lIG91dHB1dC5cclxuICogcHJlcHJvY2Vzc29yLmFwcGx5KFsnVGFjbyB0dWVzZGF5JywgJ0Zpc2ggdGFjbyBwbGVhc2UhJ10pO1xyXG4gKiBgYGBcclxuICovXHJcbmV4cG9ydCBjbGFzcyBHUFQyQ2F1c2FsTE1QcmVwcm9jZXNzb3IgZXh0ZW5kcyBHUFQyUHJlcHJvY2Vzc29yIHtcclxuICAvKiogQG5vY29sbGFwc2UgKi9cclxuICBzdGF0aWMgb3ZlcnJpZGUgY2xhc3NOYW1lID0gJ0dQVDJDYXVzYWxMTVByZXByb2Nlc3Nvcic7XHJcblxyXG4gIG92ZXJyaWRlIGNhbGwoXHJcbiAgICBpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSxcclxuICAgIGt3YXJnczogR1BUMlByZXByb2Nlc3Nvck9wdGlvbnNcclxuICApOiBUZW5zb3J8VGVuc29yW10ge1xyXG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5jYWxsQW5kUGFja0FyZ3MoaW5wdXRzLCBrd2FyZ3MpO1xyXG4gICAgaWYgKGt3YXJncy55KSB7XHJcbiAgICAgIHJldHVybiAob3V0cHV0IGFzIFtOYW1lZFRlbnNvck1hcCwgVGVuc29yXSlbMF1bJ3Rva2VuSWRzJ107XHJcbiAgICB9XHJcbiAgICByZXR1cm4gKG91dHB1dCBhcyBOYW1lZFRlbnNvck1hcClbJ3Rva2VuSWRzJ107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxscyB0aGUgbGF5ZXIgYW5kIHJldHVybnMgZXh0cmEgaW5mb3JtYXRpb24gbGlrZSB0aGUgcGFkZGluZ01hc2sgdXNlZCB0b1xyXG4gICAqIHBhY2sgdGhlIHNlcXVlbmNlLCB0aGUgbGFiZWwgZGF0YSwgYW5kIHRoZSBzYW1wbGUgd2VpZ2h0cyB1c2VkLlxyXG4gICAqL1xyXG4gIG92ZXJyaWRlIGNhbGxBbmRQYWNrQXJncyhcclxuICAgIGlucHV0czogVGVuc29yfFRlbnNvcltdLFxyXG4gICAga3dhcmdzOiBHUFQyUHJlcHJvY2Vzc29yT3B0aW9uc1xyXG4gICk6XHJcbiAgICBOYW1lZFRlbnNvck1hcFxyXG4gICAgfCBbTmFtZWRUZW5zb3JNYXAsIFRlbnNvcl1cclxuICAgIHwgW05hbWVkVGVuc29yTWFwLCBUZW5zb3IsIFRlbnNvcl0ge1xyXG5cclxuICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKGBVc2VzICR7cGFja1hZU2FtcGxlV2VpZ2h0fWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ292ZXJ0IHN0cmluZ3MgdG8gaW50ZWdlciB0b2tlbiBpbnB1dCBmb3IgZ2VuZXJhdGlvbi5cclxuICAgKlxyXG4gICAqIFNpbWlsYXIgdG8gY2FsbGluZyB0aGUgbGF5ZXIgZm9yIHRyYWluaW5nLCB0aGlzIG1ldGhvZCB0YWtlcyBpbiBzdHJpbmdzXHJcbiAgICogb3IgdGVuc29yIHN0cmluZ3MsIHRva2VuaXplcyBhbmQgcGFja3MgdGhlIGlucHV0LCBhbmQgY29tcHV0ZXMgYSBwYWRkaW5nXHJcbiAgICogbWFzayBtYXNraW5nIGFsbCBpbnB1dHMgbm90IGZpbGxlZCBpbiB3aXRoIGEgcGFkZGVkIHZhbHVlLlxyXG4gICAqXHJcbiAgICogVW5saWtlIGNhbGxpbmcgdGhlIHRoZSBsYXllciBmb3IgdHJhaW5pbmcsIHRoaXMgbWV0aG9kIGRvZXMgbm90IGNvbXB1dGVcclxuICAgKiBsYWJlbHMgYW5kIHdpbGwgbmV2ZXIgYXBwZW5kIGEgYHRva2VuaXplci5lbmRUb2tlbklkYCB0byB0aGUgZW5kIG9mXHJcbiAgICogdGhlIHNlcXVlbmNlIChhcyBnZW5lcmF0aW9uIGlzIGV4cGVjdGVkIHRvIGNvbnRpbnVlIGF0IHRoZSBlbmQgb2YgdGhlXHJcbiAgICogaW5wdXR0ZWQgcHJvbXB0KS5cclxuICAgKi9cclxuICBnZW5lcmF0ZVByZXByb2Nlc3MoeDogVGVuc29yLCBzZXF1ZW5jZUxlbmd0aD86IG51bWJlcik6IE5hbWVkVGVuc29yTWFwIHtcclxuICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb3ZlcnQgaW50ZWdlciB0b2tlbiBvdXRwdXQgdG8gc3RyaW5ncyBmb3IgZ2VuZXJhdGlvbi5cclxuICAgKlxyXG4gICAqIFRoaXMgbWV0aG9kIHJldmVyc2VzIGBnZW5lcmF0ZVByZXByb2Nlc3MoKWAsIGJ5IGZpcnN0IHJlbW92aW5nIGFsbFxyXG4gICAqIHBhZGRpbmcgYW5kIHN0YXJ0L2VuZCB0b2tlbnMsIGFuZCB0aGVuIGNvbnZlcnRpbmcgdGhlIGludGVnZXIgc2VxdWVuY2VcclxuICAgKiBiYWNrIHRvIGEgc3RyaW5nLlxyXG4gICAqL1xyXG4gIGdlbmVyYXRlUG9zdHByb2Nlc3MoeDogTmFtZWRUZW5zb3JNYXApOiBUZW5zb3Ige1xyXG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcclxuICB9XHJcblxyXG59XHJcbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhHUFQyQ2F1c2FsTE1QcmVwcm9jZXNzb3IpO1xyXG4iXX0=