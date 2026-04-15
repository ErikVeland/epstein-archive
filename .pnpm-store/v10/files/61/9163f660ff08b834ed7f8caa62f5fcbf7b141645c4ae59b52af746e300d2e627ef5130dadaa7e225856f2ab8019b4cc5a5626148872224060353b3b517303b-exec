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
 * GPT-2 preprocessor layer.
 */
/* Original source: keras-nlp/models/gpt2/gpt2_preprocessor.py */
import { serialization, tidy } from '@tensorflow/tfjs-core';
import { Preprocessor } from '../preprocessor';
import { GPT2Tokenizer } from './gpt2_tokenizer';
import { StartEndPacker } from '../../preprocessing/start_end_packer';
import { ValueError } from '../../../../errors';
export function packXYSampleWeight(x, y, sampleWeight) {
    if (y === undefined) {
        return x;
    }
    else if (sampleWeight === undefined) {
        return [x, y];
    }
    else {
        return [x, y, sampleWeight];
    }
}
/**
 * GPT2 preprocessing layer which tokenizes and packs inputs.
 *
 * This preprocessing layer will do 2 things:
 *
 * - Tokenize the inputs using the `tokenizer`.
 * - Construct a dictionary with keys `"tokenIds"`, `"paddingMask"`, that can
 *     be passed directly to a `GPT2Backbone`.
 *
 * The call method of this layer accepts three arguments, `x`, `y`, and
 * `sampleWeight`. `x` can be a string or tensor representing a single
 * segment, a list of strings representing a batch of single segments,
 * or a list of tensors representing multiple segments to be packed together.
 * `y` and `sampleWeight` are both optional, can have any format, and will be
 * passed through unaltered.
 *
 * `GPT2Preprocessor` forces the input to have only one segment, as GPT2 is
 * mainly used for generation tasks. For tasks having multi-segment inputs
 * like "glue/mnli", please use a model designed for classification purposes
 * such as BERT or RoBERTa.
 *
 * Examples:
 *
 * Directly calling the layer on data.
 * ```js
 * const features =  ['a quick fox.', 'a fox quick.'];
 * const vocabulary =
 *    new Map([['<|endoftext|>', 0], ['a', 4], ['Ġquick', 5], ['Ġfox', 6]]);
 * const merges =
 *    ['Ġ q', 'u i', 'c k', 'ui ck', 'Ġq uick', 'Ġ f', 'o x', 'Ġf ox'];
 * const tokenizer = GPT2Tokenizer({vocabulary, merges});
 *
 * const preprocessor = GPT2Preprocessor({tokenizer});
 * preprocessor.call(tensor(['the quick brown fox jumped.']))[0].print();
 * ```
 */
class GPT2Preprocessor extends Preprocessor {
    constructor(args) {
        var _a, _b, _c;
        super(args);
        this.tokenizer = args.tokenizer;
        this.sequenceLength = (_a = args.sequenceLength) !== null && _a !== void 0 ? _a : 1024;
        this.addStartToken = (_b = args.addStartToken) !== null && _b !== void 0 ? _b : true;
        this.addEndToken = (_c = args.addEndToken) !== null && _c !== void 0 ? _c : true;
        const gpt2Tokenizer = this.tokenizer;
        this.packer = new StartEndPacker({
            startValue: gpt2Tokenizer.startTokenId,
            endValue: gpt2Tokenizer.endTokenId,
            padValue: gpt2Tokenizer.padTokenId,
            sequenceLength: this.sequenceLength,
        });
    }
    getConfig() {
        const config = {
            sequenceLength: this.sequenceLength,
            addStartToken: this.addStartToken,
            addEndToken: this.addEndToken,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    call(inputs, kwargs) {
        return this.callAndReturnPaddingMask(inputs, kwargs).tokenIds;
    }
    callAndReturnPaddingMask(inputs, kwargs) {
        return tidy(() => {
            var _a;
            if (inputs instanceof Array) {
                if (inputs.length !== 1) {
                    throw new ValueError('GPT2 requires each input feature to contain only ' +
                        `one segment, but received ${inputs.length}. If you are using ` +
                        'GPT2 for a multi-segment classification task, please refer to ' +
                        'classification models like BERT or RoBERTa.');
                }
                inputs = inputs[0];
            }
            const sequenceLength = (_a = kwargs.sequenceLength) !== null && _a !== void 0 ? _a : this.sequenceLength;
            const [tokenIds, paddingMask] = this.packer.callAndReturnPaddingMask(this.tokenizer.call(inputs), {
                sequenceLength,
                addStartValue: this.addStartToken,
                addEndValue: this.addEndToken
            });
            return {
                tokenIds: tokenIds,
                paddingMask: paddingMask
            };
        });
    }
    /**
     * Calls the layer and returns extra information like the paddingMask used to
     * pack the sequence, the label data, and the sample weights used.
     */
    callAndPackArgs(inputs, kwargs) {
        const x = this.callAndReturnPaddingMask(inputs, kwargs);
        return packXYSampleWeight(x, kwargs.y, kwargs.sampleWeight);
    }
    static tokenizerCls(cls) {
        return GPT2Tokenizer;
    }
}
/** @nocollapse */
GPT2Preprocessor.className = 'GPT2Preprocessor';
export { GPT2Preprocessor };
serialization.registerClass(GPT2Preprocessor);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B0Ml9wcmVwcm9jZXNzb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC9tb2RlbHMvZ3B0Mi9ncHQyX3ByZXByb2Nlc3Nvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7R0FFRztBQUVILGlFQUFpRTtBQUNqRSxPQUFPLEVBQW9DLGFBQWEsRUFBRSxJQUFJLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUc5RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUE4Q2hELE1BQU0sVUFBVSxrQkFBa0IsQ0FDaEMsQ0FBaUIsRUFBRSxDQUFVLEVBQUUsWUFBcUI7SUFLcEQsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO1FBQ25CLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7U0FBTSxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7UUFDckMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNmO1NBQU07UUFDTCxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztLQUM3QjtBQUNILENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQ0c7QUFDSCxNQUFhLGdCQUFpQixTQUFRLFlBQVk7SUFTaEQsWUFBWSxJQUEwQjs7UUFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxj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QWdCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTEMuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiBHUFQtMiBwcmVwcm9jZXNzb3IgbGF5ZXIuXG4gKi9cblxuLyogT3JpZ2luYWwgc291cmNlOiBrZXJhcy1ubHAvbW9kZWxzL2dwdDIvZ3B0Ml9wcmVwcm9jZXNzb3IucHkgKi9cbmltcG9ydCB7IE5hbWVkVGVuc29yTWFwLCBUZW5zb3IsIFRlbnNvcjJELCBzZXJpYWxpemF0aW9uLCB0aWR5IH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHsgTGF5ZXJBcmdzIH0gZnJvbSAnLi4vLi4vLi4vLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7IFByZXByb2Nlc3NvciB9IGZyb20gJy4uL3ByZXByb2Nlc3Nvcic7XG5pbXBvcnQgeyBHUFQyVG9rZW5pemVyIH0gZnJvbSAnLi9ncHQyX3Rva2VuaXplcic7XG5pbXBvcnQgeyBTdGFydEVuZFBhY2tlciB9IGZyb20gJy4uLy4uL3ByZXByb2Nlc3Npbmcvc3RhcnRfZW5kX3BhY2tlcic7XG5pbXBvcnQgeyBWYWx1ZUVycm9yIH0gZnJvbSAnLi4vLi4vLi4vLi4vZXJyb3JzJztcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEdQVDJQcmVwcm9jZXNzb3JBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIEEgR1BUMlRva2VuaXplciBpbnN0YW5jZS5cbiAgICovXG4gIHRva2VuaXplcjogR1BUMlRva2VuaXplcjtcblxuICAvKipcbiAgICogVGhlIGxlbmd0aCBvZiB0aGUgcGFja2VkIGlucHV0cy5cbiAgICogRGVmYXVsdHMgdG8gMTAyNC5cbiAgICovXG4gIHNlcXVlbmNlTGVuZ3RoPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIHRoZSBwcmVwcm9jZXNzb3Igd2lsbCBwcmVwZW5kIHRoZSB0b2tlbml6ZXIgc3RhcnQgdG9rZW4gdG8gZWFjaFxuICAgKiBpbnB1dCBzZXF1ZW5jZS5cbiAgICogRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgYWRkU3RhcnRUb2tlbj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIGB0cnVlYCwgdGhlIHByZXByb2Nlc3NvciB3aWxsIHByZXBlbmQgdGhlIHRva2VuaXplciBlbmQgdG9rZW4gdG8gZWFjaFxuICAgKiBpbnB1dCBzZXF1ZW5jZS5cbiAgICogRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgYWRkRW5kVG9rZW4/OiBib29sZWFuO1xufVxuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgR1BUMlByZXByb2Nlc3Nvck9wdGlvbnMge1xuICAvKipcbiAgICogQW55IGxhYmVsIGRhdGEuIFdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdW5hbHRlcmVkLlxuICAgKi9cbiAgeT86IFRlbnNvcjtcblxuICAvKipcbiAgICogQW55IGxhYmVsIHdlaWdodCBkYXRhLiBXaWxsIGJlIHBhc3NlZCB0aHJvdWdoIHVuYWx0ZXJlZC5cbiAgICovXG4gIHNhbXBsZVdlaWdodD86IFRlbnNvcjtcblxuICAvKipcbiAgICogUGFzcyB0byBvdmVycmlkZSB0aGUgY29uZmlndXJlZCBgc2VxdWVuY2VMZW5ndGhgIG9mIHRoZSBsYXllci5cbiAgICovXG4gIHNlcXVlbmNlTGVuZ3RoPzogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja1hZU2FtcGxlV2VpZ2h0KFxuICB4OiBOYW1lZFRlbnNvck1hcCwgeT86IFRlbnNvciwgc2FtcGxlV2VpZ2h0PzogVGVuc29yKTpcbiAgTmFtZWRUZW5zb3JNYXBcbiAgfCBbTmFtZWRUZW5zb3JNYXAsIFRlbnNvcl1cbiAgfCBbTmFtZWRUZW5zb3JNYXAsIFRlbnNvciwgVGVuc29yXSB7XG5cbiAgaWYgKHkgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB4O1xuICB9IGVsc2UgaWYgKHNhbXBsZVdlaWdodCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIFt4LCB5XTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW3gsIHksIHNhbXBsZVdlaWdodF07XG4gIH1cbn1cblxuLyoqXG4gKiBHUFQyIHByZXByb2Nlc3NpbmcgbGF5ZXIgd2hpY2ggdG9rZW5pemVzIGFuZCBwYWNrcyBpbnB1dHMuXG4gKlxuICogVGhpcyBwcmVwcm9jZXNzaW5nIGxheWVyIHdpbGwgZG8gMiB0aGluZ3M6XG4gKlxuICogLSBUb2tlbml6ZSB0aGUgaW5wdXRzIHVzaW5nIHRoZSBgdG9rZW5pemVyYC5cbiAqIC0gQ29uc3RydWN0IGEgZGljdGlvbmFyeSB3aXRoIGtleXMgYFwidG9rZW5JZHNcImAsIGBcInBhZGRpbmdNYXNrXCJgLCB0aGF0IGNhblxuICogICAgIGJlIHBhc3NlZCBkaXJlY3RseSB0byBhIGBHUFQyQmFja2JvbmVgLlxuICpcbiAqIFRoZSBjYWxsIG1ldGhvZCBvZiB0aGlzIGxheWVyIGFjY2VwdHMgdGhyZWUgYXJndW1lbnRzLCBgeGAsIGB5YCwgYW5kXG4gKiBgc2FtcGxlV2VpZ2h0YC4gYHhgIGNhbiBiZSBhIHN0cmluZyBvciB0ZW5zb3IgcmVwcmVzZW50aW5nIGEgc2luZ2xlXG4gKiBzZWdtZW50LCBhIGxpc3Qgb2Ygc3RyaW5ncyByZXByZXNlbnRpbmcgYSBiYXRjaCBvZiBzaW5nbGUgc2VnbWVudHMsXG4gKiBvciBhIGxpc3Qgb2YgdGVuc29ycyByZXByZXNlbnRpbmcgbXVsdGlwbGUgc2VnbWVudHMgdG8gYmUgcGFja2VkIHRvZ2V0aGVyLlxuICogYHlgIGFuZCBgc2FtcGxlV2VpZ2h0YCBhcmUgYm90aCBvcHRpb25hbCwgY2FuIGhhdmUgYW55IGZvcm1hdCwgYW5kIHdpbGwgYmVcbiAqIHBhc3NlZCB0aHJvdWdoIHVuYWx0ZXJlZC5cbiAqXG4gKiBgR1BUMlByZXByb2Nlc3NvcmAgZm9yY2VzIHRoZSBpbnB1dCB0byBoYXZlIG9ubHkgb25lIHNlZ21lbnQsIGFzIEdQVDIgaXNcbiAqIG1haW5seSB1c2VkIGZvciBnZW5lcmF0aW9uIHRhc2tzLiBGb3IgdGFza3MgaGF2aW5nIG11bHRpLXNlZ21lbnQgaW5wdXRzXG4gKiBsaWtlIFwiZ2x1ZS9tbmxpXCIsIHBsZWFzZSB1c2UgYSBtb2RlbCBkZXNpZ25lZCBmb3IgY2xhc3NpZmljYXRpb24gcHVycG9zZXNcbiAqIHN1Y2ggYXMgQkVSVCBvciBSb0JFUlRhLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqIERpcmVjdGx5IGNhbGxpbmcgdGhlIGxheWVyIG9uIGRhdGEuXG4gKiBgYGBqc1xuICogY29uc3QgZmVhdHVyZXMgPSAgWydhIHF1aWNrIGZveC4nLCAnYSBmb3ggcXVpY2suJ107XG4gKiBjb25zdCB2b2NhYnVsYXJ5ID1cbiAqICAgIG5ldyBNYXAoW1snPHxlbmRvZnRleHR8PicsIDBdLCBbJ2EnLCA0XSwgWyfEoHF1aWNrJywgNV0sIFsnxKBmb3gnLCA2XV0pO1xuICogY29uc3QgbWVyZ2VzID1cbiAqICAgIFsnxKAgcScsICd1IGknLCAnYyBrJywgJ3VpIGNrJywgJ8SgcSB1aWNrJywgJ8SgIGYnLCAnbyB4JywgJ8SgZiBveCddO1xuICogY29uc3QgdG9rZW5pemVyID0gR1BUMlRva2VuaXplcih7dm9jYWJ1bGFyeSwgbWVyZ2VzfSk7XG4gKlxuICogY29uc3QgcHJlcHJvY2Vzc29yID0gR1BUMlByZXByb2Nlc3Nvcih7dG9rZW5pemVyfSk7XG4gKiBwcmVwcm9jZXNzb3IuY2FsbCh0ZW5zb3IoWyd0aGUgcXVpY2sgYnJvd24gZm94IGp1bXBlZC4nXSkpWzBdLnByaW50KCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEdQVDJQcmVwcm9jZXNzb3IgZXh0ZW5kcyBQcmVwcm9jZXNzb3Ige1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdHUFQyUHJlcHJvY2Vzc29yJztcblxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2VxdWVuY2VMZW5ndGg6IG51bWJlcjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFkZFN0YXJ0VG9rZW46IGJvb2xlYW47XG4gIHByb3RlY3RlZCByZWFkb25seSBhZGRFbmRUb2tlbjogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHBhY2tlcjogU3RhcnRFbmRQYWNrZXI7XG5cbiAgY29uc3RydWN0b3IoYXJnczogR1BUMlByZXByb2Nlc3NvckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICB0aGlzLnRva2VuaXplciA9IGFyZ3MudG9rZW5pemVyO1xuICAgIHRoaXMuc2VxdWVuY2VMZW5ndGggPSBhcmdzLnNlcXVlbmNlTGVuZ3RoID8/IDEwMjQ7XG4gICAgdGhpcy5hZGRTdGFydFRva2VuID0gYXJncy5hZGRTdGFydFRva2VuID8/IHRydWU7XG4gICAgdGhpcy5hZGRFbmRUb2tlbiA9IGFyZ3MuYWRkRW5kVG9rZW4gPz8gdHJ1ZTtcblxuICAgIGNvbnN0IGdwdDJUb2tlbml6ZXIgPSB0aGlzLnRva2VuaXplciBhcyBHUFQyVG9rZW5pemVyO1xuICAgIHRoaXMucGFja2VyID0gbmV3IFN0YXJ0RW5kUGFja2VyKHtcbiAgICAgIHN0YXJ0VmFsdWU6IGdwdDJUb2tlbml6ZXIuc3RhcnRUb2tlbklkLFxuICAgICAgZW5kVmFsdWU6IGdwdDJUb2tlbml6ZXIuZW5kVG9rZW5JZCxcbiAgICAgIHBhZFZhbHVlOiBncHQyVG9rZW5pemVyLnBhZFRva2VuSWQsXG4gICAgICBzZXF1ZW5jZUxlbmd0aDogdGhpcy5zZXF1ZW5jZUxlbmd0aCxcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgIHNlcXVlbmNlTGVuZ3RoOiB0aGlzLnNlcXVlbmNlTGVuZ3RoLFxuICAgICAgYWRkU3RhcnRUb2tlbjogdGhpcy5hZGRTdGFydFRva2VuLFxuICAgICAgYWRkRW5kVG9rZW46IHRoaXMuYWRkRW5kVG9rZW4sXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKFxuICAgIGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEdQVDJQcmVwcm9jZXNzb3JPcHRpb25zKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQW5kUmV0dXJuUGFkZGluZ01hc2soaW5wdXRzLCBrd2FyZ3MpLnRva2VuSWRzO1xuICB9XG5cbiAgcHJpdmF0ZSBjYWxsQW5kUmV0dXJuUGFkZGluZ01hc2soXG4gICAgaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sXG4gICAga3dhcmdzOiBHUFQyUHJlcHJvY2Vzc29yT3B0aW9uc1xuICApOiBOYW1lZFRlbnNvck1hcCB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKGlucHV0cyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGlmIChpbnB1dHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAnR1BUMiByZXF1aXJlcyBlYWNoIGlucHV0IGZlYXR1cmUgdG8gY29udGFpbiBvbmx5ICcgK1xuICAgICAgICAgICAgYG9uZSBzZWdtZW50LCBidXQgcmVjZWl2ZWQgJHtpbnB1dHMubGVuZ3RofS4gSWYgeW91IGFyZSB1c2luZyBgICtcbiAgICAgICAgICAgICdHUFQyIGZvciBhIG11bHRpLXNlZ21lbnQgY2xhc3NpZmljYXRpb24gdGFzaywgcGxlYXNlIHJlZmVyIHRvICcgK1xuICAgICAgICAgICAgJ2NsYXNzaWZpY2F0aW9uIG1vZGVscyBsaWtlIEJFUlQgb3IgUm9CRVJUYS4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBpbnB1dHMgPSBpbnB1dHNbMF07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNlcXVlbmNlTGVuZ3RoID0ga3dhcmdzLnNlcXVlbmNlTGVuZ3RoID8/IHRoaXMuc2VxdWVuY2VMZW5ndGg7XG4gICAgICBjb25zdCBbdG9rZW5JZHMsIHBhZGRpbmdNYXNrXSA9IHRoaXMucGFja2VyLmNhbGxBbmRSZXR1cm5QYWRkaW5nTWFzayhcbiAgICAgICAgdGhpcy50b2tlbml6ZXIuY2FsbChpbnB1dHMpLFxuICAgICAgICB7XG4gICAgICAgICAgc2VxdWVuY2VMZW5ndGgsXG4gICAgICAgICAgYWRkU3RhcnRWYWx1ZTogdGhpcy5hZGRTdGFydFRva2VuLFxuICAgICAgICAgIGFkZEVuZFZhbHVlOiB0aGlzLmFkZEVuZFRva2VuXG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRva2VuSWRzOiB0b2tlbklkcyBhcyBUZW5zb3IyRCxcbiAgICAgICAgcGFkZGluZ01hc2s6IHBhZGRpbmdNYXNrIGFzIFRlbnNvcjJEXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIHRoZSBsYXllciBhbmQgcmV0dXJucyBleHRyYSBpbmZvcm1hdGlvbiBsaWtlIHRoZSBwYWRkaW5nTWFzayB1c2VkIHRvXG4gICAqIHBhY2sgdGhlIHNlcXVlbmNlLCB0aGUgbGFiZWwgZGF0YSwgYW5kIHRoZSBzYW1wbGUgd2VpZ2h0cyB1c2VkLlxuICAgKi9cbiAgY2FsbEFuZFBhY2tBcmdzKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEdQVDJQcmVwcm9jZXNzb3JPcHRpb25zKTpcbiAgICBOYW1lZFRlbnNvck1hcFxuICAgIHwgW05hbWVkVGVuc29yTWFwLCBUZW5zb3JdXG4gICAgfCBbTmFtZWRUZW5zb3JNYXAsIFRlbnNvciwgVGVuc29yXSB7XG4gICAgY29uc3QgeCA9IHRoaXMuY2FsbEFuZFJldHVyblBhZGRpbmdNYXNrKGlucHV0cywga3dhcmdzKTtcbiAgICByZXR1cm4gcGFja1hZU2FtcGxlV2VpZ2h0KHgsIGt3YXJncy55LCBrd2FyZ3Muc2FtcGxlV2VpZ2h0KTtcbiAgfVxuXG4gIHN0YXRpYyBvdmVycmlkZSB0b2tlbml6ZXJDbHM8VCBleHRlbmRzIHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlPihcbiAgICBjbHM6IHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4pIHtcbiAgICByZXR1cm4gR1BUMlRva2VuaXplcjtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEdQVDJQcmVwcm9jZXNzb3IpO1xuIl19