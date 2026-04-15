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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/models/gpt2/gpt2_tokenizer" />
/**
 * GPT-2 tokenizer layer.
 */
import { serialization } from '@tensorflow/tfjs-core';
import { LayerArgs } from '../../../../engine/topology';
import { BytePairTokenizer } from '../../tokenizers';
export declare interface GPT2TokenizerArgs extends LayerArgs {
    /**
     * Maps token to integer ids
     */
    vocabulary: Map<string, number>;
    /**
     * Array. Contains the merge rule.
     */
    merges: string[];
}
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
export declare class GPT2Tokenizer extends BytePairTokenizer {
    private readonly _endTokenId;
    private readonly _startTokenId;
    private readonly _padTokenId;
    constructor(args: GPT2TokenizerArgs);
    get endTokenId(): number;
    get startTokenId(): number;
    get padTokenId(): number;
    getConfig(): serialization.ConfigDict;
}
