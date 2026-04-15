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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/models/gpt2/gpt2_preprocessor" />
/**
 * GPT-2 preprocessor layer.
 */
import { NamedTensorMap, Tensor, serialization } from '@tensorflow/tfjs-core';
import { LayerArgs } from '../../../../engine/topology';
import { Preprocessor } from '../preprocessor';
import { GPT2Tokenizer } from './gpt2_tokenizer';
import { StartEndPacker } from '../../preprocessing/start_end_packer';
export declare interface GPT2PreprocessorArgs extends LayerArgs {
    /**
     * A GPT2Tokenizer instance.
     */
    tokenizer: GPT2Tokenizer;
    /**
     * The length of the packed inputs.
     * Defaults to 1024.
     */
    sequenceLength?: number;
    /**
     * If `true`, the preprocessor will prepend the tokenizer start token to each
     * input sequence.
     * Defaults to `true`.
     */
    addStartToken?: boolean;
    /**
     * If `true`, the preprocessor will prepend the tokenizer end token to each
     * input sequence.
     * Defaults to `true`.
     */
    addEndToken?: boolean;
}
export declare interface GPT2PreprocessorOptions {
    /**
     * Any label data. Will be passed through unaltered.
     */
    y?: Tensor;
    /**
     * Any label weight data. Will be passed through unaltered.
     */
    sampleWeight?: Tensor;
    /**
     * Pass to override the configured `sequenceLength` of the layer.
     */
    sequenceLength?: number;
}
export declare function packXYSampleWeight(x: NamedTensorMap, y?: Tensor, sampleWeight?: Tensor): NamedTensorMap | [NamedTensorMap, Tensor] | [NamedTensorMap, Tensor, Tensor];
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
export declare class GPT2Preprocessor extends Preprocessor {
    /** @nocollapse */
    static className: string;
    protected readonly sequenceLength: number;
    protected readonly addStartToken: boolean;
    protected readonly addEndToken: boolean;
    protected readonly packer: StartEndPacker;
    constructor(args: GPT2PreprocessorArgs);
    getConfig(): serialization.ConfigDict;
    call(inputs: Tensor | Tensor[], kwargs: GPT2PreprocessorOptions): Tensor | Tensor[];
    private callAndReturnPaddingMask;
    /**
     * Calls the layer and returns extra information like the paddingMask used to
     * pack the sequence, the label data, and the sample weights used.
     */
    callAndPackArgs(inputs: Tensor | Tensor[], kwargs: GPT2PreprocessorOptions): NamedTensorMap | [NamedTensorMap, Tensor] | [NamedTensorMap, Tensor, Tensor];
    static tokenizerCls<T extends serialization.Serializable>(cls: serialization.SerializableConstructor<T>): typeof GPT2Tokenizer;
}
