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
 *  Tokenizer layers.
 */
/* Original source: keras-nlp/tokenizer.py */
import { serialization, tensor, tidy } from '@tensorflow/tfjs-core';
import { Layer } from '../../engine/topology';
import { NotImplementedError, ValueError } from '../../errors';
import { BytePairTokenizerCache, bytesToUnicode, createStaticHashtable, removeStringsFromInputs, splitStringsForBpe } from './tokenizers_utils';
import { tensorToArr, tensorArrTo2DArr } from './utils';
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
export class Tokenizer extends Layer {
    /**
     * Transform tokens back into strings.
     *
     * @param inputs Input tensor.
     * @param kwargs Additional keyword arguments.
     */
    detokenize(inputs) {
        throw new NotImplementedError(`No implementation of 'detokenize()' was found for
      ${this.constructor.name}.`);
    }
    /**
     * Get the tokenizer vocabulary as a list of strings terms.
     */
    get vocabulary() {
        throw new NotImplementedError(`No implementation of 'vocabulary()' was found for
      ${this.constructor.name}.`);
    }
    /**
     * Returns the total size of the token id space.
     */
    get vocabularySize() {
        throw new NotImplementedError(`No implementation of 'vocabularySize()' was found for
      ${this.constructor.name}.`);
    }
    /**
     * Convert an integer id to a string token.
     */
    idToToken(id) {
        throw new NotImplementedError(`No implementation of 'idToToken()' was found for
      ${this.constructor.name}.`);
    }
    /**
     * Convert an integer id to a string token.
     */
    tokenToId(token) {
        throw new NotImplementedError(`No implementation of 'tokenToId()' was found for
      ${this.constructor.name}.`);
    }
    call(inputs, { mode = 'tokenize' } = {}) {
        if (mode === 'tokenize') {
            if (inputs instanceof Array) {
                throw new ValueError(`tokenize expects Tensor, not Tensor[].`);
            }
            return this.tokenize(inputs);
        }
        if (mode === 'detokenize') {
            if (!(inputs instanceof Array)) {
                throw new ValueError(`detokenize expects Tensor[], not Tensor.`);
            }
            return this.detokenize(inputs);
        }
        throw new ValueError(`Input mode=${mode} is not supported.`);
    }
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
class BytePairTokenizer extends Tokenizer {
    constructor(args) {
        super(args);
        this.cache = new BytePairTokenizerCache();
        this._vocabulary = new Map(args.vocabulary);
        this.merges = [...args.merges];
        this.sequenceLength = args.sequenceLength || null;
        this.addPrefixSpace = args.addPrefixSpace || false;
        this.unsplittableTokens = args.unsplittableTokens || null;
        // Create byte <=> unicode mapping. This is useful for handling
        // whitespace tokens.
        const [byteList, unicodeList] = bytesToUnicode();
        this.byte2Unicode = createStaticHashtable(Array.from(byteList), unicodeList, '');
        if (this.unsplittableTokens) {
            // Put unsplittable tokens into cache, so it won't be further split and
            // merged.
            this.cache.insert(this.unsplittableTokens, this.unsplittableTokens);
        }
        // Create mapping between string tokens to int ids, and vice versa.
        const bytePairs = [...this._vocabulary.keys()];
        const bytePairEncodingIndicies = [...this._vocabulary.values()];
        this.tokenToIdMap = createStaticHashtable(bytePairs, bytePairEncodingIndicies, -1);
        this.idToTokenMap = createStaticHashtable(bytePairEncodingIndicies, bytePairs, '');
        // Create ranking of merge rules, this is the same as order of merge pairs
        // in `this.merges`.
        this.mergeRanksLookupDefault = this.merges.length + 1;
        this.mergeRanks = createStaticHashtable(this.merges, [...Array(this.merges.length).keys()], this.mergeRanksLookupDefault);
    }
    /**
     * Get the tokenizer vocabulary as a list of string tokens.
     */
    get vocabulary() {
        return [...this._vocabulary.keys()];
    }
    /**
     * Get the size of the tokenizer vocabulary.
     */
    get vocabularySize() {
        return this._vocabulary.size;
    }
    /**
     * Convert an integer id to a string token.
     */
    idToToken(id) {
        // This will be slow, but keep memory usage down compared to building a
        // dict. Assuming the main use case is looking up a few special tokens
        // early in the vocab, this should be fine.
        const keys = this.vocabulary;
        for (const token of keys) {
            if (this._vocabulary.get(token) === id) {
                return token;
            }
        }
        return undefined;
    }
    /**
     * Convert a string token to an integer id.
     */
    tokenToId(token) {
        return this._vocabulary.get(token);
    }
    getConfig() {
        const config = {
            vocabulary: Array.from(this._vocabulary.entries()),
            merges: this.merges,
            sequenceLength: this.sequenceLength,
            addPrefixSpace: this.addPrefixSpace,
            unsplittableTokens: this.unsplittableTokens,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    /**
     * Perform one step of byte-pair merge.
     */
    bpeMergeOneStep(words, mask) {
        const wordsStr = tensorArrTo2DArr(words);
        // Get all word pairs.
        const first = wordsStr.map(arr => arr.slice(0, -1));
        const second = wordsStr.map(arr => arr.slice(1, arr.length));
        // Mask empty.
        const nonEmptyMask = second.map(arr => arr.length > 0);
        mask = mask.map((a, idx) => a && nonEmptyMask[idx]);
        if (!mask.some(e => e)) {
            return [words, mask];
        }
        const nonEmptyIndices = mask
            .map((bool, idx) => bool ? idx : -1)
            .filter(e => e !== -1);
        const filteredFirst = nonEmptyIndices.map(idx => first[idx]);
        const filteredSecond = nonEmptyIndices.map(idx => second[idx]);
        // Get byte pair ranking in merge rules.
        const pairs = filteredFirst.map((firstSubArr, idx) => {
            const secondSubArr = filteredSecond[idx];
            return firstSubArr.map((char, idx) => `${char} ${secondSubArr[idx]}`);
        });
        const pairRanksTensor = this.mergeRanks.lookup(pairs.map(arr => tensor(arr)));
        const pairRanks = tensorArrTo2DArr(pairRanksTensor);
        // Get BPE pair ranks.
        const minPairRank = pairRanks.map(arr => arr.reduce((a, b) => Math.min(a, b), Infinity));
        const pairFoundMask = minPairRank.map(rank => rank !== this.mergeRanksLookupDefault);
        // Tokens that cannot be further merged are marked as finished.
        for (const [idx, index] of nonEmptyIndices.entries()) {
            const update = pairFoundMask[idx];
            mask[index] = update;
        }
        if (!mask.some(e => e)) {
            return [words, mask];
        }
        function argMin(arr) {
            return arr.indexOf(arr.reduce((a, b) => Math.min(a, b), Infinity));
        }
        const maskedPairRanks = pairRanks.filter((_, idx) => pairFoundMask[idx]);
        const minPairRankIndices = maskedPairRanks.map(arr => argMin(arr));
        // Get words and pairs to process.
        const unfinishedWords = wordsStr.filter((_, idx) => mask[idx]);
        const pairLeft = unfinishedWords.map((word, idx) => word[minPairRankIndices[idx]]);
        const pairRight = unfinishedWords.map((word, idx) => word[minPairRankIndices[idx] + 1]);
        const mergedPairs = pairLeft.map((left, idx) => {
            const right = pairRight[idx];
            return `${left}${right}`;
        });
        const unfinishedWordsIndices = mask
            .map((_, idx) => idx)
            .filter((_, idx) => mask[idx]);
        const mergedPairIndices = unfinishedWordsIndices.map((index, idx) => [index, minPairRankIndices[idx]]);
        const emptyStringIndices = unfinishedWordsIndices.map((index, idx) => [index, minPairRankIndices[idx] + 1]);
        for (const [idx, indices] of mergedPairIndices.entries()) {
            const [wordIdx, charIdx] = indices;
            const mergedPair = mergedPairs[idx];
            wordsStr[wordIdx][charIdx] = mergedPair;
        }
        for (const indices of emptyStringIndices) {
            const [wordIdx, charIdx] = indices;
            wordsStr[wordIdx][charIdx] = '';
        }
        words = wordsStr.map(word => tensor(word));
        words = removeStringsFromInputs(words, '');
        return [words, mask];
    }
    /**
     * Perform byte-pair merge for each word in the inputs.
     */
    bpeMerge(words) {
        const numWords = words.length;
        // Merge bytes.
        function loopCondition(mask) {
            return mask.some(e => e);
        }
        const initialMask = Array(numWords).fill(true);
        let mergedWords = words;
        let mask = initialMask;
        while (loopCondition(mask)) {
            [mergedWords, mask] = this.bpeMergeOneStep(mergedWords, mask);
        }
        return mergedWords;
    }
    /**
     * Map token bytes to unicode using `byte2unicode`.
     */
    transformBytes(tokens) {
        const tokensStr = tensorToArr(tokens);
        const splitBytes = tokensStr.map(token => tensor(token.split('').map(c => c.charCodeAt(0))));
        const splitUnicode = this.byte2Unicode.lookup(splitBytes);
        return splitUnicode;
    }
    /**
     * Process unseen tokens and add to cache.
     */
    bpeMergeAndUpdateCache(tokens) {
        const words = this.transformBytes(tokens);
        const tokenizedWordsTensor = this.bpeMerge(words);
        const tokenizedWords = tensorArrTo2DArr(tokenizedWordsTensor);
        // For each word, join all its token by a whitespace,
        // e.g., ["dragon", "fly"] => "dragon fly" for hash purpose.
        const joinedTokens = tokenizedWords.map(word => word.join(' '));
        this.cache.insert(tokens, joinedTokens);
    }
    tokenize(inputs) {
        return tidy(() => {
            if (this.addPrefixSpace) {
                const strInputs = tensorToArr(inputs);
                inputs = tensor(strInputs.map(word => ' ' + word));
            }
            const rawTokensTensor = splitStringsForBpe(inputs, this.unsplittableTokens);
            const rawTokens = tensorArrTo2DArr(rawTokensTensor);
            const tokenRowSplits = [0];
            for (const [idx, token] of rawTokens.entries()) {
                tokenRowSplits.push(tokenRowSplits[idx] + token.length);
            }
            const flatTokens = rawTokens.reduce((acc, e) => acc.concat(e), []);
            // Check cache.
            const cacheLookup = this.cache.lookup(flatTokens);
            const cacheMask = cacheLookup.map(e => e === '');
            const hasUnseenWords = cacheMask.some((bool, idx) => bool && flatTokens[idx] !== '');
            const processUnseenTokens = () => {
                const unseenTokens = flatTokens.filter((_, idx) => cacheMask[idx]);
                this.bpeMergeAndUpdateCache(tensor(unseenTokens));
                return this.cache.lookup(flatTokens);
            };
            // If `has_unseen_words == True`, it means not all tokens are in cache,
            // we will process the unseen tokens. Otherwise return the cache lookup.
            const tokenizedWords = hasUnseenWords ? processUnseenTokens() : cacheLookup;
            const tokensTensor = this.tokenToIdMap.lookup(tokenizedWords.map(word => tensor(word.split(' '))));
            const tokens = tokensTensor.map(t => Array.from(t.dataSync()));
            // Unflatten to match input.
            const newTokenRowSplits = [0];
            for (const [idx, token] of tokens.entries()) {
                newTokenRowSplits.push(newTokenRowSplits[idx] + token.length);
            }
            const newFlatTokens = tokens.reduce((acc, e) => acc.concat(e), []);
            const gatheredIndices = tokenRowSplits.map(index => newTokenRowSplits[index]);
            let tokens2D = [];
            for (let i = 0; i < gatheredIndices.length - 1; i++) {
                const [start, end] = [gatheredIndices[i], gatheredIndices[i + 1]];
                const row = newFlatTokens.slice(start, end);
                tokens2D.push(tensor(row));
            }
            // Convert to a dense output if `sequenceLength` is set.
            if (this.sequenceLength) {
                // pad or truncate
                tokens2D = tokens2D.map(t => {
                    if (t.size === this.sequenceLength) {
                        return t;
                    }
                    else if (t.size > this.sequenceLength) {
                        return t.slice(0, this.sequenceLength);
                    }
                    else {
                        return t.pad([[0, this.sequenceLength - t.size]]);
                    }
                });
            }
            return tokens2D;
        });
    }
    detokenize(inputs) {
        const unicodeText = this.idToTokenMap.lookup(inputs)
            .map(t => tensorToArr(t).join(''));
        return tensor(unicodeText);
    }
}
/** @nocollapse */
BytePairTokenizer.className = 'BytePairTokenizer';
export { BytePairTokenizer };
serialization.registerClass(BytePairTokenizer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvbmxwL3Rva2VuaXplcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUg7O0dBRUc7QUFFSCw2Q0FBNkM7QUFDN0MsT0FBTyxFQUFVLGFBQWEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFFM0UsT0FBTyxFQUFFLEtBQUssRUFBYSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFtQixjQUFjLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNqSyxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sU0FBUyxDQUFDO0FBTXhEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXlDRztBQUNILE1BQU0sT0FBZ0IsU0FBVSxTQUFRLEtBQUs7SUFTM0M7Ozs7O09BS0c7SUFDSCxVQUFVLENBQUMsTUFBZ0I7UUFDekIsTUFBTSxJQUFJLG1CQUFtQixDQUMzQjtRQUNFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQzNCLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLFVBQVU7UUFDWixNQUFNLElBQUksbUJBQW1CLENBQzNCO1FBQ0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FDM0IsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksY0FBYztRQUNoQixNQUFNLElBQUksbUJBQW1CLENBQzNCO1FBQ0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJ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QyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFO3dCQUNsQyxPQUFPLENBQUMsQ0FBQztxQkFDVjt5QkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRTt3QkFDdkMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7cUJBQ3hDO3lCQUFNO3dCQUNMLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDbkQ7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUVELE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLFVBQVUsQ0FBQyxNQUFnQjtRQUNsQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7YUFDakQsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUUsV0FBVyxDQUFDLENBQUMsQ0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRW5ELE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzdCLENBQUM7O0FBaFZELGtCQUFrQjtBQUNGLDJCQUFTLEdBQUcsbUJBQW1CLEFBQXRCLENBQXVCO1NBRnJDLGlCQUFpQjtBQW1WOUIsYUFBYSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqICBUb2tlbml6ZXIgbGF5ZXJzLlxuICovXG5cbi8qIE9yaWdpbmFsIHNvdXJjZToga2VyYXMtbmxwL3Rva2VuaXplci5weSAqL1xuaW1wb3J0IHsgVGVuc29yLCBzZXJpYWxpemF0aW9uLCB0ZW5zb3IsIHRpZHl9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7IExheWVyLCBMYXllckFyZ3MgfSBmcm9tICcuLi8uLi9lbmdpbmUvdG9wb2xvZ3knO1xuaW1wb3J0IHsgTm90SW1wbGVtZW50ZWRFcnJvciwgVmFsdWVFcnJvciB9IGZyb20gJy4uLy4uL2Vycm9ycyc7XG5pbXBvcnQgeyBCeXRlUGFpclRva2VuaXplckNhY2hlLCBTdGF0aWNIYXNoVGFibGUsIGJ5dGVzVG9Vbmljb2RlLCBjcmVhdGVTdGF0aWNIYXNodGFibGUsIHJlbW92ZVN0cmluZ3NGcm9tSW5wdXRzLCBzcGxpdFN0cmluZ3NGb3JCcGUgfSBmcm9tICcuL3Rva2VuaXplcnNfdXRpbHMnO1xuaW1wb3J0IHsgdGVuc29yVG9BcnIsIHRlbnNvckFyclRvMkRBcnIgfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFRva2VuaXplck9wdGlvbnMge1xuICBtb2RlPzogJ3Rva2VuaXplJyB8ICdkZXRva2VuaXplJztcbn1cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBUb2tlbml6ZXJzLlxuICpcbiAqICBUb2tlbml6ZXJzIGluIHRoZSB0ZmpzIGxpYnJhcnkgc2hvdWxkIGFsbCBzdWJjbGFzcyB0aGlzIGxheWVyLlxuICogIFRoZSBjbGFzcyBwcm92aWRlcyB0d28gY29yZSBtZXRob2RzIGB0b2tlbml6ZSgpYCBhbmQgYGRldG9rZW5pemUoKWAgZm9yXG4gKiAgZ29pbmcgZnJvbSBwbGFpbiB0ZXh0IHRvIHNlcXVlbmNlcyBhbmQgYmFjay4gQSB0b2tlbml6ZXIgaXMgYSBzdWJjbGFzcyBvZlxuICogIGBMYXllcmAgYW5kIGNhbiBiZSBjb21iaW5lZCB3aXRoIG90aGVyIGxheWVycyBpbiBhIGB0Zi5zZXF1ZW50aWFsYCBtb2RlbC5cbiAqXG4gKiAgU3ViY2xhc3NlcnMgc2hvdWxkIGFsd2F5cyBpbXBsZW1lbnQgdGhlIGB0b2tlbml6ZSgpYCBtZXRob2QsIHdoaWNoIHdpbGwgYWxzb1xuICogIGJlIHRoZSBkZWZhdWx0IHdoZW4gY2FsbGluZyB0aGUgbGF5ZXIgZGlyZWN0bHkgb24gaW5wdXRzLlxuICpcbiAqICBTdWJjbGFzc2VycyBjYW4gb3B0aW9uYWxseSBpbXBsZW1lbnQgdGhlIGBkZXRva2VuaXplKClgIG1ldGhvZCBpZiB0aGVcbiAqICB0b2tlbml6YXRpb24gaXMgcmV2ZXJzaWJsZS4gT3RoZXJ3aXNlLCB0aGlzIGNhbiBiZSBza2lwcGVkLlxuICpcbiAqICBTdWJjbGFzc2VycyBzaG91bGQgaW1wbGVtZW50IGBnZXRfdm9jYWJ1bGFyeSgpYCwgYHZvY2FidWxhcnlfc2l6ZSgpYCxcbiAqICBgdG9rZW5fdG9faWQoKWAgYW5kIGBpZF90b190b2tlbigpYCBpZiBhcHBsaWNhYmxlLiBGb3Igc29tZSBzaW1wbGVcbiAqICBcInZvY2FiIGZyZWVcIiB0b2tlbml6ZXJzLCBzdWNoIGFzIGEgd2hpdGVzcGFjZSBzcGxpdHRlciBzaG93biBiZWxvdywgdGhlc2VcbiAqICBtZXRob2RzIGRvIG5vdCBhcHBseSBhbmQgY2FuIGJlIHNraXBwZWQuXG4gKlxuICogIEV4YW1wbGU6XG4gKlxuICogIGBgYGpzXG4gKiAgY2xhc3MgV2hpdGVzcGFjZVNwbGl0dGVyVG9rZW5pemVyIGV4dGVuZHMgVG9rZW5pemVyIHtcbiAqICAgIHRva2VuaXplKGlucHV0czogVGVuc29yKTogVGVuc29yW10ge1xuICogICAgICBjb25zdCBzdHJpbmdJbnB1dHMgPSBpbnB1dHMuZGF0YVN5bmMoKSBhcyB1bmtub3duIGFzIHN0cmluZ1tdO1xuICogICAgICByZXR1cm4gc3RyaW5nSW5wdXRzLm1hcChpbnB1dCA9PiBUZW5zb3IoaW5wdXQuc3BsaXQoJyAnKSkpO1xuICogICAgfVxuICpcbiAqICAgIG92ZXJyaWRlIGRldG9rZW5pemUoaW5wdXRzOiBUZW5zb3JbXSk6IFRlbnNvciB7XG4gKiAgICAgIGNvbnN0IHN0cmluZ0lucHV0cyA9IGlucHV0cy5tYXAoXG4gKiAgICAgICAgaW5wdXQgPT4gaW5wdXQuZGF0YVN5bmMoKSBhcyB1bmtub3duIGFzIHN0cmluZ1tdKTtcbiAqICAgICAgcmV0dXJuIFRlbnNvcihzdHJpbmdJbnB1dHMubWFwKHN0ciA9PiBzdHIuam9pbignICcpKSk7XG4gKiAgICB9XG4gKiAgfVxuICpcbiAqIGNvbnN0IHRva2VuaXplciA9IG5ldyBXaGl0ZXNwYWNlU3BsaXR0ZXJUb2tlbml6ZXIoKTtcbiAqXG4gKiB0b2tlbml6ZXIudG9rZW5pemUodGVuc29yKFsndGhpcyBpcyBhIHRlc3QnXSkpWzBdLnByaW50KCk7XG4gKlxuICogdG9rZW5pemVyLmRldG9rZW5pemUoW3RlbnNvcihbJ3RoaXMnLCAnaXMnLCAnYScsICd0ZXN0J10pXSkucHJpbnQoKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVG9rZW5pemVyIGV4dGVuZHMgTGF5ZXIge1xuICAvKipcbiAgICogVHJhbnNmb3JtIGlucHV0IHRlbnNvcnMgb2Ygc3RyaW5ncyBpbnRvIG91dHB1dCB0b2tlbnMuXG4gICAqXG4gICAqIEBwYXJhbSBpbnB1dHMgSW5wdXQgdGVuc29yLlxuICAgKiBAcGFyYW0ga3dhcmdzIEFkZGl0aW9uYWwga2V5d29yZCBhcmd1bWVudHMuXG4gICAqL1xuICBhYnN0cmFjdCB0b2tlbml6ZShpbnB1dHM6IFRlbnNvcik6IFRlbnNvcltdO1xuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gdG9rZW5zIGJhY2sgaW50byBzdHJpbmdzLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRzIElucHV0IHRlbnNvci5cbiAgICogQHBhcmFtIGt3YXJncyBBZGRpdGlvbmFsIGtleXdvcmQgYXJndW1lbnRzLlxuICAgKi9cbiAgZGV0b2tlbml6ZShpbnB1dHM6IFRlbnNvcltdKTogVGVuc29yIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgIGBObyBpbXBsZW1lbnRhdGlvbiBvZiAnZGV0b2tlbml6ZSgpJyB3YXMgZm91bmQgZm9yXG4gICAgICAke3RoaXMuY29uc3RydWN0b3IubmFtZX0uYFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSB0b2tlbml6ZXIgdm9jYWJ1bGFyeSBhcyBhIGxpc3Qgb2Ygc3RyaW5ncyB0ZXJtcy5cbiAgICovXG4gIGdldCB2b2NhYnVsYXJ5KCk6IHN0cmluZ1tdIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgIGBObyBpbXBsZW1lbnRhdGlvbiBvZiAndm9jYWJ1bGFyeSgpJyB3YXMgZm91bmQgZm9yXG4gICAgICAke3RoaXMuY29uc3RydWN0b3IubmFtZX0uYFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgdG90YWwgc2l6ZSBvZiB0aGUgdG9rZW4gaWQgc3BhY2UuXG4gICAqL1xuICBnZXQgdm9jYWJ1bGFyeVNpemUoKTogbnVtYmVyIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgIGBObyBpbXBsZW1lbnRhdGlvbiBvZiAndm9jYWJ1bGFyeVNpemUoKScgd2FzIGZvdW5kIGZvclxuICAgICAgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9LmBcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYW4gaW50ZWdlciBpZCB0byBhIHN0cmluZyB0b2tlbi5cbiAgICovXG4gIGlkVG9Ub2tlbihpZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgIGBObyBpbXBsZW1lbnRhdGlvbiBvZiAnaWRUb1Rva2VuKCknIHdhcyBmb3VuZCBmb3JcbiAgICAgICR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfS5gXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFuIGludGVnZXIgaWQgdG8gYSBzdHJpbmcgdG9rZW4uXG4gICAqL1xuICB0b2tlblRvSWQodG9rZW46IHN0cmluZyk6IG51bWJlciB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICBgTm8gaW1wbGVtZW50YXRpb24gb2YgJ3Rva2VuVG9JZCgpJyB3YXMgZm91bmQgZm9yXG4gICAgICAke3RoaXMuY29uc3RydWN0b3IubmFtZX0uYFxuICAgICk7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKFxuICAgIGlucHV0czogVGVuc29yfFRlbnNvcltdLFxuICAgIHttb2RlID0gJ3Rva2VuaXplJ306IFRva2VuaXplck9wdGlvbnM9e31cbiAgKTogVGVuc29yfFRlbnNvcltdIHtcblxuICAgIGlmIChtb2RlID09PSAndG9rZW5pemUnKSB7XG4gICAgICBpZiAoaW5wdXRzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoYHRva2VuaXplIGV4cGVjdHMgVGVuc29yLCBub3QgVGVuc29yW10uYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50b2tlbml6ZShpbnB1dHMpO1xuICAgIH1cblxuICAgIGlmIChtb2RlID09PSAnZGV0b2tlbml6ZScpIHtcbiAgICAgIGlmICghKGlucHV0cyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihgZGV0b2tlbml6ZSBleHBlY3RzIFRlbnNvcltdLCBub3QgVGVuc29yLmApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZGV0b2tlbml6ZShpbnB1dHMpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKGBJbnB1dCBtb2RlPSR7bW9kZX0gaXMgbm90IHN1cHBvcnRlZC5gKTtcbiAgfVxufVxuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzLW5scC9ieXRlX3BhaXJfdG9rZW5pemVyLnB5ICovXG4vLyBUT0RPKHBmb3JkZXJpcXVlKTogU3VwcG9ydCBmaWxlbmFtZSBzdHJpbmcgaW5wdXRzIGZvciB2b2NhYnVsYXJ5IGFuZCBtZXJnZXMuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQnl0ZVBhaXJUb2tlbml6ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIE1hcHMgdG9rZW4gdG8gaW50ZWdlciBpZHNcbiAgICovXG4gIHZvY2FidWxhcnk6IE1hcDxzdHJpbmcsIG51bWJlcj47XG5cbiAgLyoqXG4gICAqIEFycmF5LiBDb250YWlucyB0aGUgbWVyZ2UgcnVsZS5cbiAgICovXG4gIG1lcmdlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEludGVnZXIuIElmIHNldCwgdGhlIG91dHB1dCB3aWxsIGJlIHBhZGRlZCBvciB0cnVuY2F0ZWQgdG8gdGhlXG4gICAqIGBzZXF1ZW5jZUxlbmd0aGAuIERlZmF1bHRzIHRvIGBudWxsYC5cbiAgICovXG4gIHNlcXVlbmNlTGVuZ3RoPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBCb29sZWFuLiBXaGV0aGVyIHRvIGFkZCBhbiBpbml0aWFsIHNwYWNlIHRvIHRoZSBpbnB1dC4gVGhpcyB0b2tlbml6ZXIgaXNcbiAgICogd2hpdGVzcGFjZSBhd2FyZSwgYW5kIHdpbGwgdG9rZW5pemUgYSB3b3JkIHdpdGggYSBsZWFkaW5nIHNwYWNlXG4gICAqIGRpZmZlcmVudGx5LiBBZGRpbmcgYSBwcmVmaXggc3BhY2UgdG8gdGhlIGZpcnN0IHdvcmQgd2lsbCBjYXVzZSBpdCB0byBiZVxuICAgKiB0b2tlbml6ZWQgZXF1aXZhbGVudGx5IHRvIGFsbCBzdWJzZXF1ZW50IHdvcmRzIGluIHRoZSBzZXF1ZW5jZS5cbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYC5cbiAgICovXG4gIGFkZFByZWZpeFNwYWNlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQXJyYXkuIEEgbGlzdCBvZiBzdHJpbmdzIHRoYXQgd2lsbCBuZXZlciBiZSBzcGxpdCBkdXJpbmcgdGhlIHdvcmQtbGV2ZWxcbiAgICogc3BsaXR0aW5nIGFwcGxpZWQgYmVmb3JlIHRoZSBieXRlLXBhaXIgZW5jb2RpbmcuIFRoaXMgY2FuIGJlIHVzZWQgdG8gZW5zdXJlXG4gICAqIHNwZWNpYWwgdG9rZW5zIG1hcCB0byB1bmlxdWUgaW5kaWNlcyBpbiB0aGUgdm9jYWJ1bGFyeSwgZXZlbiBpZiB0aGVzZVxuICAgKiBzcGVjaWFsIHRva2VucyBjb250YWluIHNwbGl0dGFibGUgY2hhcmFjdGVycyBzdWNoIGFzIHB1bmN0dWF0aW9uLiBTcGVjaWFsXG4gICAqIHRva2VucyBtdXN0IHN0aWxsIGJlIGluY2x1ZGVkIGluIGB2b2NhYnVsYXJ5YC4gRGVmYXVsdHMgdG8gYE5vbmVgLlxuICAgKi9cbiAgdW5zcGxpdHRhYmxlVG9rZW5zPzogc3RyaW5nW107XG59XG5cbi8qKlxuICogQnl0ZS1wYWlyIGVuY29kaW5nIHRva2VuaXplciBsYXllci5cbiAqXG4gKiBUaGlzIEJQRSB0b2tlbml6ZXIgcHJvdmlkZXMgdGhlIHNhbWUgZnVuY3Rpb25hbGl0eSBhcyB0aGUgb2ZmaWNpYWwgR1BULTJcbiAqIHRva2VuaXplci4gR2l2ZW4gdGhlIHNhbWUgYHZvY2FidWxhcnlgIHdoaWNoIG1hcHMgdG9rZW5zIHRvIGlkcywgYW5kIGBtZXJnZXNgXG4gKiB3aGljaCBkZXNjcmliZXMgQlBFIG1lcmdlIHJ1bGVzLCBpdCBzaG91bGQgcHJvdmlkZSB0aGUgc2FtZSBvdXRwdXQgYXMgT3BlbkFJXG4gKiBpbXBsZW1lbnRhdGlvbiAoaHR0cHM6Ly9naXRodWIuY29tL29wZW5haS9ncHQtMi9ibG9iL21hc3Rlci9zcmMvZW5jb2Rlci5weSkuXG4gKlxuICogSWYgaW5wdXQgaXMgYSBiYXRjaCBvZiBzdHJpbmdzIChyYW5rID4gMCk6XG4gKiBCeSBkZWZhdWx0LCB0aGUgbGF5ZXIgd2lsbCBvdXRwdXQgYSBgVGVuc29yW11gLlxuICogSWYgYHNlcXVlbmNlTGVuZ3RoYCBpcyBzZXQsIHRoZSBsYXllciB3aWxsIG91dHB1dCBhIGBUZW5zb3JbXWAgd2hlcmUgYWxsXG4gKiBpbnB1dHMgaGF2ZSBiZWVuIHBhZGRlZCBvciB0cnVuY2F0ZWQgdG8gYHNlcXVlbmNlTGVuZ3RoYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiBUb2tlbml6ZVxuICogYGBganNcbiAqIGNvbnN0IHZvY2FidWxhcnkgPSBuZXcgTWFwKFtbJ2J1dHRlcicsIDFdLCBbJ2ZseScsIDJdXSk7XG4gKiBjb25zdCBtZXJnZXMgPSBbJ2IgdScsICd0IHQnLCAnZSByJywgJ2J1IHR0JywgJ2J1dHQgZXInLCAnZiBsJywgJ2ZsIHknXTtcbiAqIGNvbnN0IHRva2VuaXplciA9IG5ldyBCeXRlUGFpclRva2VuaXplcih7dm9jYWJ1bGFyeSwgbWVyZ2VzfSk7XG4gKlxuICogdG9rZW5pemVyLnRva2VuaXplKHRlbnNvcihbJ2J1dHRlcmZseSddKSlbMF0ucHJpbnQoKTtcbiAqIHRva2VuaXplci50b2tlbml6ZSh0ZW5zb3IoWydidXR0ZXJmbHksIGJ1dHRlciddKSlbMV0ucHJpbnQoKTtcbiAqIGBgYFxuICpcbiAqIERldG9rZW5pemVcbiAqIGBgYGpzXG4gKiBjb25zdCB2b2NhYnVsYXJ5ID0gbmV3IE1hcChbWydidXR0ZXInLCAxXSwgWydmbHknLCAyXV0pO1xuICogY29uc3QgbWVyZ2VzID0gWydiIHUnLCAndCB0JywgJ2UgcicsICdidSB0dCcsICdidXR0IGVyJywgJ2YgbCcsICdmbCB5J107XG4gKiBjb25zdCB0b2tlbml6ZXIgPSBuZXcgQnl0ZVBhaXJUb2tlbml6ZXIoe3ZvY2FidWxhcnksIG1lcmdlc30pO1xuICpcbiAqIHRva2VuaXplci5kZXRva2VuaXplKFtbMSwgMl1dKS5wcmludCgpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBCeXRlUGFpclRva2VuaXplciBleHRlbmRzIFRva2VuaXplciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgcmVhZG9ubHkgY2xhc3NOYW1lID0gJ0J5dGVQYWlyVG9rZW5pemVyJztcblxuICBwcml2YXRlIF92b2NhYnVsYXJ5OiBNYXA8c3RyaW5nLCBudW1iZXI+O1xuICBwcml2YXRlIG1lcmdlczogc3RyaW5nW107XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzZXF1ZW5jZUxlbmd0aDogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGFkZFByZWZpeFNwYWNlOiBib29sZWFuO1xuICBwcml2YXRlIHJlYWRvbmx5IHVuc3BsaXR0YWJsZVRva2Vuczogc3RyaW5nW107XG5cbiAgcHJpdmF0ZSByZWFkb25seSBieXRlMlVuaWNvZGU6IFN0YXRpY0hhc2hUYWJsZTxudW1iZXIsIHN0cmluZz47XG4gIHByaXZhdGUgcmVhZG9ubHkgY2FjaGUgPSBuZXcgQnl0ZVBhaXJUb2tlbml6ZXJDYWNoZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgdG9rZW5Ub0lkTWFwOiBTdGF0aWNIYXNoVGFibGU8c3RyaW5nLCBudW1iZXI+O1xuICBwcml2YXRlIHJlYWRvbmx5IGlkVG9Ub2tlbk1hcDogU3RhdGljSGFzaFRhYmxlPG51bWJlciwgc3RyaW5nPjtcblxuICBwcml2YXRlIHJlYWRvbmx5IG1lcmdlUmFua3NMb29rdXBEZWZhdWx0OiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWVyZ2VSYW5rczogU3RhdGljSGFzaFRhYmxlPHN0cmluZywgbnVtYmVyPjtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBCeXRlUGFpclRva2VuaXplckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcblxuICAgIHRoaXMuX3ZvY2FidWxhcnkgPSBuZXcgTWFwKGFyZ3Mudm9jYWJ1bGFyeSk7XG4gICAgdGhpcy5tZXJnZXMgPSBbLi4uYXJncy5tZXJnZXNdO1xuXG4gICAgdGhpcy5zZXF1ZW5jZUxlbmd0aCA9IGFyZ3Muc2VxdWVuY2VMZW5ndGggfHwgbnVsbDtcbiAgICB0aGlzLmFkZFByZWZpeFNwYWNlID0gYXJncy5hZGRQcmVmaXhTcGFjZSB8fCBmYWxzZTtcbiAgICB0aGlzLnVuc3BsaXR0YWJsZVRva2VucyA9IGFyZ3MudW5zcGxpdHRhYmxlVG9rZW5zIHx8IG51bGw7XG5cbiAgICAvLyBDcmVhdGUgYnl0ZSA8PT4gdW5pY29kZSBtYXBwaW5nLiBUaGlzIGlzIHVzZWZ1bCBmb3IgaGFuZGxpbmdcbiAgICAvLyB3aGl0ZXNwYWNlIHRva2Vucy5cbiAgICBjb25zdCBbYnl0ZUxpc3QsIHVuaWNvZGVMaXN0XSA9IGJ5dGVzVG9Vbmljb2RlKCk7XG4gICAgdGhpcy5ieXRlMlVuaWNvZGUgPSBjcmVhdGVTdGF0aWNIYXNodGFibGUoXG4gICAgICBBcnJheS5mcm9tKGJ5dGVMaXN0KSwgdW5pY29kZUxpc3QsICcnKTtcblxuICAgIGlmICh0aGlzLnVuc3BsaXR0YWJsZVRva2Vucykge1xuICAgICAgLy8gUHV0IHVuc3BsaXR0YWJsZSB0b2tlbnMgaW50byBjYWNoZSwgc28gaXQgd29uJ3QgYmUgZnVydGhlciBzcGxpdCBhbmRcbiAgICAgIC8vIG1lcmdlZC5cbiAgICAgIHRoaXMuY2FjaGUuaW5zZXJ0KHRoaXMudW5zcGxpdHRhYmxlVG9rZW5zLCB0aGlzLnVuc3BsaXR0YWJsZVRva2Vucyk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIG1hcHBpbmcgYmV0d2VlbiBzdHJpbmcgdG9rZW5zIHRvIGludCBpZHMsIGFuZCB2aWNlIHZlcnNhLlxuICAgIGNvbnN0IGJ5dGVQYWlycyA9IFsuLi50aGlzLl92b2NhYnVsYXJ5LmtleXMoKV07XG4gICAgY29uc3QgYnl0ZVBhaXJFbmNvZGluZ0luZGljaWVzID0gWy4uLnRoaXMuX3ZvY2FidWxhcnkudmFsdWVzKCldO1xuXG4gICAgdGhpcy50b2tlblRvSWRNYXAgPSBjcmVhdGVTdGF0aWNIYXNodGFibGUoXG4gICAgICBieXRlUGFpcnMsIGJ5dGVQYWlyRW5jb2RpbmdJbmRpY2llcywgLTEpO1xuXG4gICAgdGhpcy5pZFRvVG9rZW5NYXAgPSBjcmVhdGVTdGF0aWNIYXNodGFibGUoXG4gICAgICBieXRlUGFpckVuY29kaW5nSW5kaWNpZXMsIGJ5dGVQYWlycywgJycpO1xuXG4gICAgLy8gQ3JlYXRlIHJhbmtpbmcgb2YgbWVyZ2UgcnVsZXMsIHRoaXMgaXMgdGhlIHNhbWUgYXMgb3JkZXIgb2YgbWVyZ2UgcGFpcnNcbiAgICAvLyBpbiBgdGhpcy5tZXJnZXNgLlxuICAgIHRoaXMubWVyZ2VSYW5rc0xvb2t1cERlZmF1bHQgPSB0aGlzLm1lcmdlcy5sZW5ndGggKyAxO1xuICAgIHRoaXMubWVyZ2VSYW5rcyA9IGNyZWF0ZVN0YXRpY0hhc2h0YWJsZShcbiAgICAgIHRoaXMubWVyZ2VzLFxuICAgICAgWy4uLkFycmF5KHRoaXMubWVyZ2VzLmxlbmd0aCkua2V5cygpXSxcbiAgICAgIHRoaXMubWVyZ2VSYW5rc0xvb2t1cERlZmF1bHRcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdG9rZW5pemVyIHZvY2FidWxhcnkgYXMgYSBsaXN0IG9mIHN0cmluZyB0b2tlbnMuXG4gICAqL1xuICBvdmVycmlkZSBnZXQgdm9jYWJ1bGFyeSgpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLl92b2NhYnVsYXJ5LmtleXMoKV07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzaXplIG9mIHRoZSB0b2tlbml6ZXIgdm9jYWJ1bGFyeS5cbiAgICovXG4gIG92ZXJyaWRlIGdldCB2b2NhYnVsYXJ5U2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl92b2NhYnVsYXJ5LnNpemU7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhbiBpbnRlZ2VyIGlkIHRvIGEgc3RyaW5nIHRva2VuLlxuICAgKi9cbiAgb3ZlcnJpZGUgaWRUb1Rva2VuKGlkOiBudW1iZXIpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIC8vIFRoaXMgd2lsbCBiZSBzbG93LCBidXQga2VlcCBtZW1vcnkgdXNhZ2UgZG93biBjb21wYXJlZCB0byBidWlsZGluZyBhXG4gICAgLy8gZGljdC4gQXNzdW1pbmcgdGhlIG1haW4gdXNlIGNhc2UgaXMgbG9va2luZyB1cCBhIGZldyBzcGVjaWFsIHRva2Vuc1xuICAgIC8vIGVhcmx5IGluIHRoZSB2b2NhYiwgdGhpcyBzaG91bGQgYmUgZmluZS5cbiAgICBjb25zdCBrZXlzID0gdGhpcy52b2NhYnVsYXJ5O1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2Yga2V5cykge1xuICAgICAgaWYgKHRoaXMuX3ZvY2FidWxhcnkuZ2V0KHRva2VuKSA9PT0gaWQpIHtcbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBzdHJpbmcgdG9rZW4gdG8gYW4gaW50ZWdlciBpZC5cbiAgICovXG4gIG92ZXJyaWRlIHRva2VuVG9JZCh0b2tlbjogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fdm9jYWJ1bGFyeS5nZXQodG9rZW4pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgdm9jYWJ1bGFyeTogQXJyYXkuZnJvbSh0aGlzLl92b2NhYnVsYXJ5LmVudHJpZXMoKSksXG4gICAgICBtZXJnZXM6IHRoaXMubWVyZ2VzLFxuICAgICAgc2VxdWVuY2VMZW5ndGg6IHRoaXMuc2VxdWVuY2VMZW5ndGgsXG4gICAgICBhZGRQcmVmaXhTcGFjZTogdGhpcy5hZGRQcmVmaXhTcGFjZSxcbiAgICAgIHVuc3BsaXR0YWJsZVRva2VuczogdGhpcy51bnNwbGl0dGFibGVUb2tlbnMsXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBvbmUgc3RlcCBvZiBieXRlLXBhaXIgbWVyZ2UuXG4gICAqL1xuICBwcml2YXRlIGJwZU1lcmdlT25lU3RlcChcbiAgICB3b3JkczogVGVuc29yW10sIG1hc2s6IGJvb2xlYW5bXSk6IFtUZW5zb3JbXSwgYm9vbGVhbltdXSB7XG5cbiAgICBjb25zdCB3b3Jkc1N0ciA9IHRlbnNvckFyclRvMkRBcnIod29yZHMpIGFzIHN0cmluZ1tdW107XG5cbiAgICAvLyBHZXQgYWxsIHdvcmQgcGFpcnMuXG4gICAgY29uc3QgZmlyc3QgPSB3b3Jkc1N0ci5tYXAoYXJyID0+IGFyci5zbGljZSgwLCAtMSkpO1xuICAgIGNvbnN0IHNlY29uZCA9IHdvcmRzU3RyLm1hcChhcnIgPT4gYXJyLnNsaWNlKDEsIGFyci5sZW5ndGgpKTtcblxuICAgIC8vIE1hc2sgZW1wdHkuXG4gICAgY29uc3Qgbm9uRW1wdHlNYXNrID0gc2Vjb25kLm1hcChhcnIgPT4gYXJyLmxlbmd0aCA+IDApO1xuICAgIG1hc2sgPSBtYXNrLm1hcCgoYSwgaWR4KSA9PiBhICYmIG5vbkVtcHR5TWFza1tpZHhdKTtcbiAgICBpZiAoIW1hc2suc29tZShlID0+IGUpKSB7XG4gICAgICByZXR1cm4gW3dvcmRzLCBtYXNrXTtcbiAgICB9XG4gICAgY29uc3Qgbm9uRW1wdHlJbmRpY2VzID0gbWFza1xuICAgICAgLm1hcCgoYm9vbCwgaWR4KSA9PiBib29sID8gaWR4IDogLTEpXG4gICAgICAuZmlsdGVyKGUgPT4gZSAhPT0gLTEpO1xuXG4gICAgY29uc3QgZmlsdGVyZWRGaXJzdCA9IG5vbkVtcHR5SW5kaWNlcy5tYXAoaWR4ID0+IGZpcnN0W2lkeF0pO1xuICAgIGNvbnN0IGZpbHRlcmVkU2Vjb25kID0gbm9uRW1wdHlJbmRpY2VzLm1hcChpZHggPT4gc2Vjb25kW2lkeF0pO1xuXG4gICAgLy8gR2V0IGJ5dGUgcGFpciByYW5raW5nIGluIG1lcmdlIHJ1bGVzLlxuICAgIGNvbnN0IHBhaXJzOiBzdHJpbmdbXVtdID0gZmlsdGVyZWRGaXJzdC5tYXAoKGZpcnN0U3ViQXJyLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHNlY29uZFN1YkFyciA9IGZpbHRlcmVkU2Vjb25kW2lkeF07XG5cbiAgICAgIHJldHVybiBmaXJzdFN1YkFyci5tYXAoKGNoYXIsIGlkeCkgPT4gYCR7Y2hhcn0gJHtzZWNvbmRTdWJBcnJbaWR4XX1gKTtcbiAgICB9KTtcbiAgICBjb25zdCBwYWlyUmFua3NUZW5zb3IgPSB0aGlzLm1lcmdlUmFua3MubG9va3VwKFxuICAgICAgcGFpcnMubWFwKGFyciA9PiB0ZW5zb3IoYXJyKSkpO1xuICAgIGNvbnN0IHBhaXJSYW5rcyA9IHRlbnNvckFyclRvMkRBcnIocGFpclJhbmtzVGVuc29yKSBhcyBudW1iZXJbXVtdO1xuXG4gICAgLy8gR2V0IEJQRSBwYWlyIHJhbmtzLlxuICAgIGNvbnN0IG1pblBhaXJSYW5rID0gcGFpclJhbmtzLm1hcChcbiAgICAgIGFyciA9PiBhcnIucmVkdWNlKChhLCBiKSA9PiBNYXRoLm1pbihhLCBiKSwgSW5maW5pdHkpKTtcbiAgICBjb25zdCBwYWlyRm91bmRNYXNrID0gbWluUGFpclJhbmsubWFwKFxuICAgICAgcmFuayA9PiByYW5rICE9PSB0aGlzLm1lcmdlUmFua3NMb29rdXBEZWZhdWx0KTtcblxuICAgIC8vIFRva2VucyB0aGF0IGNhbm5vdCBiZSBmdXJ0aGVyIG1lcmdlZCBhcmUgbWFya2VkIGFzIGZpbmlzaGVkLlxuICAgIGZvciAoY29uc3QgW2lkeCwgaW5kZXhdIG9mIG5vbkVtcHR5SW5kaWNlcy5lbnRyaWVzKCkpIHtcbiAgICAgIGNvbnN0IHVwZGF0ZSA9IHBhaXJGb3VuZE1hc2tbaWR4XTtcbiAgICAgIG1hc2tbaW5kZXhdID0gdXBkYXRlO1xuICAgIH1cbiAgICBpZiAoIW1hc2suc29tZShlID0+IGUpKSB7XG4gICAgICByZXR1cm4gW3dvcmRzLCBtYXNrXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhcmdNaW4oYXJyOiBudW1iZXJbXSk6IG51bWJlciB7XG4gICAgICByZXR1cm4gYXJyLmluZGV4T2YoYXJyLnJlZHVjZSgoYSwgYikgPT4gTWF0aC5taW4oYSwgYiksIEluZmluaXR5KSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWFza2VkUGFpclJhbmtzID0gcGFpclJhbmtzLmZpbHRlcigoXywgaWR4KSA9PiBwYWlyRm91bmRNYXNrW2lkeF0pO1xuICAgIGNvbnN0IG1pblBhaXJSYW5rSW5kaWNlcyA9IG1hc2tlZFBhaXJSYW5rcy5tYXAoYXJyID0+IGFyZ01pbihhcnIpKTtcblxuICAgIC8vIEdldCB3b3JkcyBhbmQgcGFpcnMgdG8gcHJvY2Vzcy5cbiAgICBjb25zdCB1bmZpbmlzaGVkV29yZHMgPSB3b3Jkc1N0ci5maWx0ZXIoKF8sIGlkeCkgPT4gbWFza1tpZHhdKTtcblxuICAgIGNvbnN0IHBhaXJMZWZ0ID0gdW5maW5pc2hlZFdvcmRzLm1hcChcbiAgICAgICh3b3JkLCBpZHgpID0+IHdvcmRbbWluUGFpclJhbmtJbmRpY2VzW2lkeF1dKTtcblxuICAgIGNvbnN0IHBhaXJSaWdodCA9IHVuZmluaXNoZWRXb3Jkcy5tYXAoXG4gICAgICAod29yZCwgaWR4KSA9PiB3b3JkW21pblBhaXJSYW5rSW5kaWNlc1tpZHhdICsgMV0pO1xuXG4gICAgY29uc3QgbWVyZ2VkUGFpcnMgPSBwYWlyTGVmdC5tYXAoKGxlZnQsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgcmlnaHQgPSBwYWlyUmlnaHRbaWR4XTtcbiAgICAgIHJldHVybiBgJHtsZWZ0fSR7cmlnaHR9YDtcbiAgICB9KTtcbiAgICBjb25zdCB1bmZpbmlzaGVkV29yZHNJbmRpY2VzID0gbWFza1xuICAgICAgLm1hcCgoXywgaWR4KSA9PiBpZHgpXG4gICAgICAuZmlsdGVyKChfLCBpZHgpID0+IG1hc2tbaWR4XSk7XG5cbiAgICBjb25zdCBtZXJnZWRQYWlySW5kaWNlcyA9IHVuZmluaXNoZWRXb3Jkc0luZGljZXMubWFwKFxuICAgICAgKGluZGV4LCBpZHgpID0+IFtpbmRleCwgbWluUGFpclJhbmtJbmRpY2VzW2lkeF1dKTtcbiAgICBjb25zdCBlbXB0eVN0cmluZ0luZGljZXMgPSB1bmZpbmlzaGVkV29yZHNJbmRpY2VzLm1hcChcbiAgICAgIChpbmRleCwgaWR4KSA9PiBbaW5kZXgsIG1pblBhaXJSYW5rSW5kaWNlc1tpZHhdICsgMV0pO1xuXG4gICAgZm9yIChjb25zdCBbaWR4LCBpbmRpY2VzXSBvZiBtZXJnZWRQYWlySW5kaWNlcy5lbnRyaWVzKCkpIHtcbiAgICAgIGNvbnN0IFt3b3JkSWR4LCBjaGFySWR4XSA9IGluZGljZXM7XG4gICAgICBjb25zdCBtZXJnZWRQYWlyID0gbWVyZ2VkUGFpcnNbaWR4XTtcbiAgICAgIHdvcmRzU3RyW3dvcmRJZHhdW2NoYXJJZHhdID0gbWVyZ2VkUGFpcjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGluZGljZXMgb2YgZW1wdHlTdHJpbmdJbmRpY2VzKSB7XG4gICAgICBjb25zdCBbd29yZElkeCwgY2hhcklkeF0gPSBpbmRpY2VzO1xuICAgICAgd29yZHNTdHJbd29yZElkeF1bY2hhcklkeF0gPSAnJztcbiAgICB9XG5cbiAgICB3b3JkcyA9IHdvcmRzU3RyLm1hcCh3b3JkID0+IHRlbnNvcih3b3JkKSk7XG4gICAgd29yZHMgPSByZW1vdmVTdHJpbmdzRnJvbUlucHV0cyh3b3JkcywgJycpO1xuXG4gICAgcmV0dXJuIFt3b3JkcywgbWFza107XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBieXRlLXBhaXIgbWVyZ2UgZm9yIGVhY2ggd29yZCBpbiB0aGUgaW5wdXRzLlxuICAgKi9cbiAgcHJpdmF0ZSBicGVNZXJnZSh3b3JkczogVGVuc29yW10pOiBUZW5zb3JbXSB7XG4gICAgY29uc3QgbnVtV29yZHMgPSB3b3Jkcy5sZW5ndGg7XG5cbiAgICAvLyBNZXJnZSBieXRlcy5cbiAgICBmdW5jdGlvbiBsb29wQ29uZGl0aW9uKG1hc2s6IGJvb2xlYW5bXSk6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIG1hc2suc29tZShlID0+IGUpO1xuICAgIH1cblxuICAgIGNvbnN0IGluaXRpYWxNYXNrOiBib29sZWFuW10gPSBBcnJheShudW1Xb3JkcykuZmlsbCh0cnVlKTtcblxuICAgIGxldCBtZXJnZWRXb3JkcyA9IHdvcmRzO1xuICAgIGxldCBtYXNrID0gaW5pdGlhbE1hc2s7XG4gICAgd2hpbGUgKGxvb3BDb25kaXRpb24obWFzaykpIHtcbiAgICAgIFttZXJnZWRXb3JkcywgbWFza10gPSB0aGlzLmJwZU1lcmdlT25lU3RlcChtZXJnZWRXb3JkcywgbWFzayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZFdvcmRzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1hcCB0b2tlbiBieXRlcyB0byB1bmljb2RlIHVzaW5nIGBieXRlMnVuaWNvZGVgLlxuICAgKi9cbiAgcHJpdmF0ZSB0cmFuc2Zvcm1CeXRlcyh0b2tlbnM6IFRlbnNvcik6IFRlbnNvcltdIHtcbiAgICBjb25zdCB0b2tlbnNTdHIgPSB0ZW5zb3JUb0Fycih0b2tlbnMpIGFzIHN0cmluZ1tdO1xuXG4gICAgY29uc3Qgc3BsaXRCeXRlcyA9IHRva2Vuc1N0ci5tYXAoXG4gICAgICB0b2tlbiA9PiB0ZW5zb3IodG9rZW4uc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSkpKTtcbiAgICBjb25zdCBzcGxpdFVuaWNvZGUgPSB0aGlzLmJ5dGUyVW5pY29kZS5sb29rdXAoc3BsaXRCeXRlcyk7XG5cbiAgICByZXR1cm4gc3BsaXRVbmljb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgdW5zZWVuIHRva2VucyBhbmQgYWRkIHRvIGNhY2hlLlxuICAgKi9cbiAgcHJpdmF0ZSBicGVNZXJnZUFuZFVwZGF0ZUNhY2hlKHRva2VuczogVGVuc29yKSB7XG4gICAgY29uc3Qgd29yZHMgPSB0aGlzLnRyYW5zZm9ybUJ5dGVzKHRva2Vucyk7XG4gICAgY29uc3QgdG9rZW5pemVkV29yZHNUZW5zb3IgPSB0aGlzLmJwZU1lcmdlKHdvcmRzKTtcbiAgICBjb25zdCB0b2tlbml6ZWRXb3JkcyA9IHRlbnNvckFyclRvMkRBcnIodG9rZW5pemVkV29yZHNUZW5zb3IpIGFzIHN0cmluZ1tdW107XG5cbiAgICAvLyBGb3IgZWFjaCB3b3JkLCBqb2luIGFsbCBpdHMgdG9rZW4gYnkgYSB3aGl0ZXNwYWNlLFxuICAgIC8vIGUuZy4sIFtcImRyYWdvblwiLCBcImZseVwiXSA9PiBcImRyYWdvbiBmbHlcIiBmb3IgaGFzaCBwdXJwb3NlLlxuICAgIGNvbnN0IGpvaW5lZFRva2VucyA9IHRva2VuaXplZFdvcmRzLm1hcCh3b3JkID0+IHdvcmQuam9pbignICcpKTtcblxuICAgIHRoaXMuY2FjaGUuaW5zZXJ0KHRva2Vucywgam9pbmVkVG9rZW5zKTtcbiAgfVxuXG4gIHRva2VuaXplKGlucHV0czogVGVuc29yKTogVGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmFkZFByZWZpeFNwYWNlKSB7XG4gICAgICAgIGNvbnN0IHN0cklucHV0cyA9IHRlbnNvclRvQXJyKGlucHV0cykgYXMgc3RyaW5nW107XG4gICAgICAgIGlucHV0cyA9IHRlbnNvcihzdHJJbnB1dHMubWFwKHdvcmQgPT4gJyAnICsgd29yZCkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByYXdUb2tlbnNUZW5zb3IgPVxuICAgICAgICBzcGxpdFN0cmluZ3NGb3JCcGUoaW5wdXRzLCB0aGlzLnVuc3BsaXR0YWJsZVRva2Vucyk7XG4gICAgICBjb25zdCByYXdUb2tlbnMgPSB0ZW5zb3JBcnJUbzJEQXJyKHJhd1Rva2Vuc1RlbnNvcikgYXMgc3RyaW5nW11bXTtcblxuICAgICAgY29uc3QgdG9rZW5Sb3dTcGxpdHMgPSBbMF07XG4gICAgICBmb3IgKGNvbnN0IFtpZHgsIHRva2VuXSBvZiByYXdUb2tlbnMuZW50cmllcygpKSB7XG4gICAgICAgIHRva2VuUm93U3BsaXRzLnB1c2godG9rZW5Sb3dTcGxpdHNbaWR4XSArIHRva2VuLmxlbmd0aCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZsYXRUb2tlbnMgPSByYXdUb2tlbnMucmVkdWNlKChhY2MsIGUpID0+IGFjYy5jb25jYXQoZSksIFtdKTtcblxuICAgICAgLy8gQ2hlY2sgY2FjaGUuXG4gICAgICBjb25zdCBjYWNoZUxvb2t1cCA9IHRoaXMuY2FjaGUubG9va3VwKGZsYXRUb2tlbnMpO1xuICAgICAgY29uc3QgY2FjaGVNYXNrID0gY2FjaGVMb29rdXAubWFwKGUgPT4gZSA9PT0gJycpO1xuXG4gICAgICBjb25zdCBoYXNVbnNlZW5Xb3JkcyA9IGNhY2hlTWFzay5zb21lKFxuICAgICAgICAoYm9vbCwgaWR4KSA9PiBib29sICYmIGZsYXRUb2tlbnNbaWR4XSAhPT0gJycpO1xuXG4gICAgICBjb25zdCBwcm9jZXNzVW5zZWVuVG9rZW5zID0gKCk6IHN0cmluZ1tdICA9PiB7XG4gICAgICAgIGNvbnN0IHVuc2VlblRva2VucyA9IGZsYXRUb2tlbnMuZmlsdGVyKChfLCBpZHgpID0+IGNhY2hlTWFza1tpZHhdKTtcbiAgICAgICAgdGhpcy5icGVNZXJnZUFuZFVwZGF0ZUNhY2hlKHRlbnNvcih1bnNlZW5Ub2tlbnMpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGUubG9va3VwKGZsYXRUb2tlbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gSWYgYGhhc191bnNlZW5fd29yZHMgPT0gVHJ1ZWAsIGl0IG1lYW5zIG5vdCBhbGwgdG9rZW5zIGFyZSBpbiBjYWNoZSxcbiAgICAgIC8vIHdlIHdpbGwgcHJvY2VzcyB0aGUgdW5zZWVuIHRva2Vucy4gT3RoZXJ3aXNlIHJldHVybiB0aGUgY2FjaGUgbG9va3VwLlxuICAgICAgY29uc3QgdG9rZW5pemVkV29yZHMgPVxuICAgICAgICBoYXNVbnNlZW5Xb3JkcyA/IHByb2Nlc3NVbnNlZW5Ub2tlbnMoKSA6IGNhY2hlTG9va3VwO1xuXG4gICAgICBjb25zdCB0b2tlbnNUZW5zb3IgPSB0aGlzLnRva2VuVG9JZE1hcC5sb29rdXAoXG4gICAgICAgIHRva2VuaXplZFdvcmRzLm1hcCh3b3JkID0+IHRlbnNvcih3b3JkLnNwbGl0KCcgJykpKSk7XG4gICAgICBjb25zdCB0b2tlbnMgPSB0b2tlbnNUZW5zb3IubWFwKHQgPT4gQXJyYXkuZnJvbSh0LmRhdGFTeW5jKCkpKTtcblxuICAgICAgLy8gVW5mbGF0dGVuIHRvIG1hdGNoIGlucHV0LlxuICAgICAgY29uc3QgbmV3VG9rZW5Sb3dTcGxpdHMgPSBbMF07XG4gICAgICBmb3IgKGNvbnN0IFtpZHgsIHRva2VuXSBvZiB0b2tlbnMuZW50cmllcygpKSB7XG4gICAgICAgIG5ld1Rva2VuUm93U3BsaXRzLnB1c2gobmV3VG9rZW5Sb3dTcGxpdHNbaWR4XSArIHRva2VuLmxlbmd0aCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXdGbGF0VG9rZW5zID0gdG9rZW5zLnJlZHVjZSgoYWNjLCBlKSA9PiBhY2MuY29uY2F0KGUpLCBbXSk7XG4gICAgICBjb25zdCBnYXRoZXJlZEluZGljZXMgPVxuICAgICAgICB0b2tlblJvd1NwbGl0cy5tYXAoaW5kZXggPT4gbmV3VG9rZW5Sb3dTcGxpdHNbaW5kZXhdKTtcblxuICAgICAgbGV0IHRva2VuczJEOiBUZW5zb3JbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBnYXRoZXJlZEluZGljZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGNvbnN0IFtzdGFydCwgZW5kXSA9IFtnYXRoZXJlZEluZGljZXNbaV0sIGdhdGhlcmVkSW5kaWNlc1tpKzFdXTtcbiAgICAgICAgY29uc3Qgcm93ID0gbmV3RmxhdFRva2Vucy5zbGljZShzdGFydCwgZW5kKTtcbiAgICAgICAgdG9rZW5zMkQucHVzaCh0ZW5zb3Iocm93KSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbnZlcnQgdG8gYSBkZW5zZSBvdXRwdXQgaWYgYHNlcXVlbmNlTGVuZ3RoYCBpcyBzZXQuXG4gICAgICBpZiAodGhpcy5zZXF1ZW5jZUxlbmd0aCkge1xuICAgICAgICAvLyBwYWQgb3IgdHJ1bmNhdGVcbiAgICAgICAgdG9rZW5zMkQgPSB0b2tlbnMyRC5tYXAodCA9PiB7XG4gICAgICAgICAgaWYgKHQuc2l6ZSA9PT0gdGhpcy5zZXF1ZW5jZUxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgICAgfSBlbHNlIGlmICh0LnNpemUgPiB0aGlzLnNlcXVlbmNlTGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdC5zbGljZSgwLCB0aGlzLnNlcXVlbmNlTGVuZ3RoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHQucGFkKFtbMCwgdGhpcy5zZXF1ZW5jZUxlbmd0aCAtIHQuc2l6ZV1dKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdG9rZW5zMkQ7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBkZXRva2VuaXplKGlucHV0czogVGVuc29yW10pOiBUZW5zb3Ige1xuICAgIGNvbnN0IHVuaWNvZGVUZXh0ID0gdGhpcy5pZFRvVG9rZW5NYXAubG9va3VwKGlucHV0cylcbiAgICAgIC5tYXAodCA9PiAodGVuc29yVG9BcnIodCkgYXMgc3RyaW5nW10pLmpvaW4oJycpKTtcblxuICAgIHJldHVybiB0ZW5zb3IodW5pY29kZVRleHQpO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoQnl0ZVBhaXJUb2tlbml6ZXIpO1xuIl19