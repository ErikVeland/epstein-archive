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
 * GPT-2 tokenizer layer.
 */
/* Original source: keras-nlp/models/gpt2/gpt2_tokenizer.py */
import { serialization } from '@tensorflow/tfjs-core';
import { BytePairTokenizer } from '../../tokenizers';
import { ValueError } from '../../../../errors';
/**
 * A GPT-2 tokenizer using Byte-Pair Encoding subword segmentation.
 *
 * This tokenizer class will tokenize raw strings into integer sequences and
 * is based on `BytePairTokenizer`. Unlike the underlying tokenizer, it will
 * check for all special tokens needed by GPT-2 models.
 *
 * This tokenizer does not provide truncation or padding of inputs.
 *
 * When given an input of a batch of strings (`tf.Tensor`), the layer will
 * output a `tf.Tensor[]`.
 *
 * Examples:
 *
 * ```js
 * const vocabulary = new Map([
 *    ['<|endoftext|>', 0], ['butter', 1], ['fly', 2]]);
 * const merges = ['b u', 't t', 'e r', 'bu tt', 'butt er', 'f l', 'fl y'];
 * const tokenizer = new BytePairTokenizer({vocabulary, merges});
 *
 * tokenizer.tokenize(tensor(['butterfly']))[0].print();
 * tokenizer.tokenize(tensor(['butterfly, butter<|endoftext|>']))[1].print();
 *
 * tokenizer.detokenize([tensor([1, 2, 0])]).print();
 */
export class GPT2Tokenizer extends BytePairTokenizer {
    constructor(args) {
        // Special tokens.
        const endToken = '<|endoftext|>';
        super({
            vocabulary: args.vocabulary,
            merges: args.merges,
            unsplittableTokens: [endToken]
        });
        // Check whether special tokens are present in the vocabulary.
        if (!this.vocabulary.includes(endToken)) {
            throw new ValueError(`Cannot find token '${endToken}' in the provided 'vocabulary'. Please` +
                ` provide '${endToken}' in your 'vocabulary' or use a pretrained` +
                ` 'vocabulary' name.`);
        }
        this._endTokenId = this.tokenToId(endToken);
        this._startTokenId = this._endTokenId;
        this._padTokenId = 0;
    }
    get endTokenId() {
        return this._endTokenId;
    }
    get startTokenId() {
        return this._startTokenId;
    }
    get padTokenId() {
        return this._padTokenId;
    }
    getConfig() {
        const config = super.getConfig();
        // In the constructor, we pass the list of special tokens to the
        // `unsplittableTokens` arg of the superclass' constructor. Hence, we
        // delete it from the config here.
        delete config.unsplittableTokens;
        return config;
    }
}
serialization.registerClass(GPT2Tokenizer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B0Ml90b2tlbml6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC9tb2RlbHMvZ3B0Mi9ncHQyX3Rva2VuaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7R0FFRztBQUVILDhEQUE4RDtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBY2hEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3Qkc7QUFDSCxNQUFNLE9BQU8sYUFBYyxTQUFRLGlCQUFpQjtJQUtsRCxZQUFZLElBQXVCO1FBRWpDLGtCQUFrQjtRQUNsQixNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUM7UUFFakMsS0FBSyxDQUFDO1lBQ0osVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixrQkFBa0IsRUFBRSxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDLENBQUM7UUFFSCw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxVQUFVLENBQ2xCLHNCQUFzQixRQUFRLHdDQUF3QztnQkFDdEUsYUFBYSxRQUFRLDRDQUE0QztnQkFDakUscUJBQXFCLENBQ3RCLENBQUM7U0FDSDtRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDMUIsQ0FBQztJQUVRLFNBQVM7UUFDaEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2pDLGdFQUFnRTtRQUNoRSxxRUFBcUU7UUFDckUsa0NBQWtDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDO1FBQ2pDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQUNELGFBQWEsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogR1BULTIgdG9rZW5pemVyIGxheWVyLlxuICovXG5cbi8qIE9yaWdpbmFsIHNvdXJjZToga2VyYXMtbmxwL21vZGVscy9ncHQyL2dwdDJfdG9rZW5pemVyLnB5ICovXG5pbXBvcnQgeyBzZXJpYWxpemF0aW9uIH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHsgTGF5ZXJBcmdzIH0gZnJvbSAnLi4vLi4vLi4vLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7IEJ5dGVQYWlyVG9rZW5pemVyIH0gZnJvbSAnLi4vLi4vdG9rZW5pemVycyc7XG5pbXBvcnQgeyBWYWx1ZUVycm9yIH0gZnJvbSAnLi4vLi4vLi4vLi4vZXJyb3JzJztcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEdQVDJUb2tlbml6ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIE1hcHMgdG9rZW4gdG8gaW50ZWdlciBpZHNcbiAgICovXG4gIHZvY2FidWxhcnk6IE1hcDxzdHJpbmcsIG51bWJlcj47XG5cbiAgLyoqXG4gICAqIEFycmF5LiBDb250YWlucyB0aGUgbWVyZ2UgcnVsZS5cbiAgICovXG4gIG1lcmdlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQSBHUFQtMiB0b2tlbml6ZXIgdXNpbmcgQnl0ZS1QYWlyIEVuY29kaW5nIHN1YndvcmQgc2VnbWVudGF0aW9uLlxuICpcbiAqIFRoaXMgdG9rZW5pemVyIGNsYXNzIHdpbGwgdG9rZW5pemUgcmF3IHN0cmluZ3MgaW50byBpbnRlZ2VyIHNlcXVlbmNlcyBhbmRcbiAqIGlzIGJhc2VkIG9uIGBCeXRlUGFpclRva2VuaXplcmAuIFVubGlrZSB0aGUgdW5kZXJseWluZyB0b2tlbml6ZXIsIGl0IHdpbGxcbiAqIGNoZWNrIGZvciBhbGwgc3BlY2lhbCB0b2tlbnMgbmVlZGVkIGJ5IEdQVC0yIG1vZGVscy5cbiAqXG4gKiBUaGlzIHRva2VuaXplciBkb2VzIG5vdCBwcm92aWRlIHRydW5jYXRpb24gb3IgcGFkZGluZyBvZiBpbnB1dHMuXG4gKlxuICogV2hlbiBnaXZlbiBhbiBpbnB1dCBvZiBhIGJhdGNoIG9mIHN0cmluZ3MgKGB0Zi5UZW5zb3JgKSwgdGhlIGxheWVyIHdpbGxcbiAqIG91dHB1dCBhIGB0Zi5UZW5zb3JbXWAuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IHZvY2FidWxhcnkgPSBuZXcgTWFwKFtcbiAqICAgIFsnPHxlbmRvZnRleHR8PicsIDBdLCBbJ2J1dHRlcicsIDFdLCBbJ2ZseScsIDJdXSk7XG4gKiBjb25zdCBtZXJnZXMgPSBbJ2IgdScsICd0IHQnLCAnZSByJywgJ2J1IHR0JywgJ2J1dHQgZXInLCAnZiBsJywgJ2ZsIHknXTtcbiAqIGNvbnN0IHRva2VuaXplciA9IG5ldyBCeXRlUGFpclRva2VuaXplcih7dm9jYWJ1bGFyeSwgbWVyZ2VzfSk7XG4gKlxuICogdG9rZW5pemVyLnRva2VuaXplKHRlbnNvcihbJ2J1dHRlcmZseSddKSlbMF0ucHJpbnQoKTtcbiAqIHRva2VuaXplci50b2tlbml6ZSh0ZW5zb3IoWydidXR0ZXJmbHksIGJ1dHRlcjx8ZW5kb2Z0ZXh0fD4nXSkpWzFdLnByaW50KCk7XG4gKlxuICogdG9rZW5pemVyLmRldG9rZW5pemUoW3RlbnNvcihbMSwgMiwgMF0pXSkucHJpbnQoKTtcbiAqL1xuZXhwb3J0IGNsYXNzIEdQVDJUb2tlbml6ZXIgZXh0ZW5kcyBCeXRlUGFpclRva2VuaXplciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2VuZFRva2VuSWQ6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBfc3RhcnRUb2tlbklkOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3BhZFRva2VuSWQ6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBHUFQyVG9rZW5pemVyQXJncykge1xuXG4gICAgLy8gU3BlY2lhbCB0b2tlbnMuXG4gICAgY29uc3QgZW5kVG9rZW4gPSAnPHxlbmRvZnRleHR8Pic7XG5cbiAgICBzdXBlcih7XG4gICAgICB2b2NhYnVsYXJ5OiBhcmdzLnZvY2FidWxhcnksXG4gICAgICBtZXJnZXM6IGFyZ3MubWVyZ2VzLFxuICAgICAgdW5zcGxpdHRhYmxlVG9rZW5zOiBbZW5kVG9rZW5dXG4gICAgfSk7XG5cbiAgICAvLyBDaGVjayB3aGV0aGVyIHNwZWNpYWwgdG9rZW5zIGFyZSBwcmVzZW50IGluIHRoZSB2b2NhYnVsYXJ5LlxuICAgIGlmICghdGhpcy52b2NhYnVsYXJ5LmluY2x1ZGVzKGVuZFRva2VuKSkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgZmluZCB0b2tlbiAnJHtlbmRUb2tlbn0nIGluIHRoZSBwcm92aWRlZCAndm9jYWJ1bGFyeScuIFBsZWFzZWAgK1xuICAgICAgICBgIHByb3ZpZGUgJyR7ZW5kVG9rZW59JyBpbiB5b3VyICd2b2NhYnVsYXJ5JyBvciB1c2UgYSBwcmV0cmFpbmVkYCArXG4gICAgICAgIGAgJ3ZvY2FidWxhcnknIG5hbWUuYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRUb2tlbklkID0gdGhpcy50b2tlblRvSWQoZW5kVG9rZW4pO1xuICAgIHRoaXMuX3N0YXJ0VG9rZW5JZCA9IHRoaXMuX2VuZFRva2VuSWQ7XG4gICAgdGhpcy5fcGFkVG9rZW5JZCA9IDA7XG4gIH1cblxuICBnZXQgZW5kVG9rZW5JZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5kVG9rZW5JZDtcbiAgfVxuXG4gIGdldCBzdGFydFRva2VuSWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXJ0VG9rZW5JZDtcbiAgfVxuXG4gIGdldCBwYWRUb2tlbklkKCkge1xuICAgIHJldHVybiB0aGlzLl9wYWRUb2tlbklkO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgLy8gSW4gdGhlIGNvbnN0cnVjdG9yLCB3ZSBwYXNzIHRoZSBsaXN0IG9mIHNwZWNpYWwgdG9rZW5zIHRvIHRoZVxuICAgIC8vIGB1bnNwbGl0dGFibGVUb2tlbnNgIGFyZyBvZiB0aGUgc3VwZXJjbGFzcycgY29uc3RydWN0b3IuIEhlbmNlLCB3ZVxuICAgIC8vIGRlbGV0ZSBpdCBmcm9tIHRoZSBjb25maWcgaGVyZS5cbiAgICBkZWxldGUgY29uZmlnLnVuc3BsaXR0YWJsZVRva2VucztcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoR1BUMlRva2VuaXplcik7XG4iXX0=