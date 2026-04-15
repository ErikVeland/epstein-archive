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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/tokenizers" />
/**
 *  Tokenizer layers.
 */
import { Tensor, serialization } from '@tensorflow/tfjs-core';
import { Layer, LayerArgs } from '../../engine/topology';
export declare interface TokenizerOptions {
    mode?: 'tokenize' | 'detokenize';
}
/**
 * Base class for Tokenizers.
 *
 *  Tokenizers in the tfjs library should all subclass this layer.
 *  The class provides two core methods `tokenize()` and `detokenize()` for
 *  going from plain text to sequences and back. A tokenizer is a subclass of
 *  `Layer` and can be combined with other layers in a `tf.sequential` model.
 *
 *  Subclassers should always implement the `tokenize()` method, which will also
 *  be the default when calling the layer directly on inputs.
 *
 *  Subclassers can optionally implement the `detokenize()` method if the
 *  tokenization is reversible. Otherwise, this can be skipped.
 *
 *  Subclassers should implement `get_vocabulary()`, `vocabulary_size()`,
 *  `token_to_id()` and `id_to_token()` if applicable. For some simple
 *  "vocab free" tokenizers, such as a whitespace splitter shown below, these
 *  methods do not apply and can be skipped.
 *
 *  Example:
 *
 *  ```js
 *  class WhitespaceSplitterTokenizer extends Tokenizer {
 *    tokenize(inputs: Tensor): Tensor[] {
 *      const stringInputs = inputs.dataSync() as unknown as string[];
 *      return stringInputs.map(input => Tensor(input.split(' ')));
 *    }
 *
 *    override detokenize(inputs: Tensor[]): Tensor {
 *      const stringInputs = inputs.map(
 *        input => input.dataSync() as unknown as string[]);
 *      return Tensor(stringInputs.map(str => str.join(' ')));
 *    }
 *  }
 *
 * const tokenizer = new WhitespaceSplitterTokenizer();
 *
 * tokenizer.tokenize(tensor(['this is a test']))[0].print();
 *
 * tokenizer.detokenize([tensor(['this', 'is', 'a', 'test'])]).print();
 * ```
 */
export declare abstract class Tokenizer extends Layer {
    /**
     * Transform input tensors of strings into output tokens.
     *
     * @param inputs Input tensor.
     * @param kwargs Additional keyword arguments.
     */
    abstract tokenize(inputs: Tensor): Tensor[];
    /**
     * Transform tokens back into strings.
     *
     * @param inputs Input tensor.
     * @param kwargs Additional keyword arguments.
     */
    detokenize(inputs: Tensor[]): Tensor;
    /**
     * Get the tokenizer vocabulary as a list of strings terms.
     */
    get vocabulary(): string[];
    /**
     * Returns the total size of the token id space.
     */
    get vocabularySize(): number;
    /**
     * Convert an integer id to a string token.
     */
    idToToken(id: number): string;
    /**
     * Convert an integer id to a string token.
     */
    tokenToId(token: string): number;
    call(inputs: Tensor | Tensor[], { mode }?: TokenizerOptions): Tensor | Tensor[];
}
export declare interface BytePairTokenizerArgs extends LayerArgs {
    /**
     * Maps token to integer ids
     */
    vocabulary: Map<string, number>;
    /**
     * Array. Contains the merge rule.
     */
    merges: string[];
    /**
     * Integer. If set, the output will be padded or truncated to the
     * `sequenceLength`. Defaults to `null`.
     */
    sequenceLength?: number;
    /**
     * Boolean. Whether to add an initial space to the input. This tokenizer is
     * whitespace aware, and will tokenize a word with a leading space
     * differently. Adding a prefix space to the first word will cause it to be
     * tokenized equivalently to all subsequent words in the sequence.
     * Defaults to `false`.
     */
    addPrefixSpace?: boolean;
    /**
     * Array. A list of strings that will never be split during the word-level
     * splitting applied before the byte-pair encoding. This can be used to ensure
     * special tokens map to unique indices in the vocabulary, even if these
     * special tokens contain splittable characters such as punctuation. Special
     * tokens must still be included in `vocabulary`. Defaults to `None`.
     */
    unsplittableTokens?: string[];
}
/**
 * Byte-pair encoding tokenizer layer.
 *
 * This BPE tokenizer provides the same functionality as the official GPT-2
 * tokenizer. Given the same `vocabulary` which maps tokens to ids, and `merges`
 * which describes BPE merge rules, it should provide the same output as OpenAI
 * implementation (https://github.com/openai/gpt-2/blob/master/src/encoder.py).
 *
 * If input is a batch of strings (rank > 0):
 * By default, the layer will output a `Tensor[]`.
 * If `sequenceLength` is set, the layer will output a `Tensor[]` where all
 * inputs have been padded or truncated to `sequenceLength`.
 *
 * Examples:
 *
 * Tokenize
 * ```js
 * const vocabulary = new Map([['butter', 1], ['fly', 2]]);
 * const merges = ['b u', 't t', 'e r', 'bu tt', 'butt er', 'f l', 'fl y'];
 * const tokenizer = new BytePairTokenizer({vocabulary, merges});
 *
 * tokenizer.tokenize(tensor(['butterfly']))[0].print();
 * tokenizer.tokenize(tensor(['butterfly, butter']))[1].print();
 * ```
 *
 * Detokenize
 * ```js
 * const vocabulary = new Map([['butter', 1], ['fly', 2]]);
 * const merges = ['b u', 't t', 'e r', 'bu tt', 'butt er', 'f l', 'fl y'];
 * const tokenizer = new BytePairTokenizer({vocabulary, merges});
 *
 * tokenizer.detokenize([[1, 2]]).print();
 * ```
 */
export declare class BytePairTokenizer extends Tokenizer {
    /** @nocollapse */
    static readonly className = "BytePairTokenizer";
    private _vocabulary;
    private merges;
    private readonly sequenceLength;
    private readonly addPrefixSpace;
    private readonly unsplittableTokens;
    private readonly byte2Unicode;
    private readonly cache;
    private readonly tokenToIdMap;
    private readonly idToTokenMap;
    private readonly mergeRanksLookupDefault;
    private readonly mergeRanks;
    constructor(args: BytePairTokenizerArgs);
    /**
     * Get the tokenizer vocabulary as a list of string tokens.
     */
    get vocabulary(): string[];
    /**
     * Get the size of the tokenizer vocabulary.
     */
    get vocabularySize(): number;
    /**
     * Convert an integer id to a string token.
     */
    idToToken(id: number): string | undefined;
    /**
     * Convert a string token to an integer id.
     */
    tokenToId(token: string): number | undefined;
    getConfig(): serialization.ConfigDict;
    /**
     * Perform one step of byte-pair merge.
     */
    private bpeMergeOneStep;
    /**
     * Perform byte-pair merge for each word in the inputs.
     */
    private bpeMerge;
    /**
     * Map token bytes to unicode using `byte2unicode`.
     */
    private transformBytes;
    /**
     * Process unseen tokens and add to cache.
     */
    private bpeMergeAndUpdateCache;
    tokenize(inputs: Tensor): Tensor[];
    detokenize(inputs: Tensor[]): Tensor;
}
