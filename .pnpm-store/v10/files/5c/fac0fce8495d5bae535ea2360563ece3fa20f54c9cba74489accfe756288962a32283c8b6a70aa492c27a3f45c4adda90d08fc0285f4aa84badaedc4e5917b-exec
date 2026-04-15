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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/tokenizers_utils" />
import { Tensor } from '@tensorflow/tfjs-core';
export declare function bytesToUnicode(): [Uint8Array, string[]];
/**
 * StaticHashTable includes a `lookup` function for multiple keys at once.
 */
export declare class StaticHashTable<K, V extends number | string> {
    private readonly defaultValue;
    private _map;
    constructor(keys: K[], values: V[], defaultValue: V);
    get(key: K): V;
    lookup(keys: Tensor[]): Tensor[];
}
export declare function createStaticHashtable<K, V extends number | string>(keys: K[], values: V[], defaultVal: V): StaticHashTable<K, V>;
/**
 * Cache that stores the encoded result of seen tokens.
 *
 * The cache key is string tensor or python strings, and the value is split
 * tokens joined by whitespace. For example, "dragonfly" => "dragon fly"
 *
 * Examples:
 *
 * ```js
 * const cache = new BytePairTokenizerCache();
 * cache.insert(["butterfly", "dragonfly"], ["but ter fly", "dragon fly"]);
 * cache.lookup(["butterfly"]);
 * ```
 */
export declare class BytePairTokenizerCache {
    private _cache;
    constructor();
    get(key: string): string;
    /**
     * Insert token <=> encoded outputs pairs.
     */
    insert(keys: Tensor | string[], values: string[]): BytePairTokenizerCache;
    /**
     * Look up the encoded outputs of given tokens.
     */
    lookup(keys: Tensor | string[]): string[];
}
/**
 * Remove certain strings from input tensor.
 */
export declare function removeStringsFromInputs(inputs: Tensor[], stringToRemove: string): Tensor[];
/**
 * Create alternates for all special tokens that will be not split during
 * tokenization.
 */
export declare function createAltsForUnsplittableTokens(unsplittableTokens: string[]): string[];
export declare const SPLIT_PATTERN_1: RegExp;
export declare function regexSplit(strs: string[] | string[][], delimRegexPattern: RegExp | string, keepDelimRegexPattern?: boolean): string[][];
export declare function splitStringsForBpe(inputs: Tensor, unsplittableTokens?: string[]): Tensor[];
