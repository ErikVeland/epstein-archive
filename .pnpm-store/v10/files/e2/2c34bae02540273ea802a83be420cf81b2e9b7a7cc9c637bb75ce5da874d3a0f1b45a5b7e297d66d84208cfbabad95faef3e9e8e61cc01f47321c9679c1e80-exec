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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/models/gpt2/gpt2_backbone" />
/**
 *  Base class for Backbone models.
 */
import { serialization } from '@tensorflow/tfjs-core';
import { Embedding } from '../../../embeddings';
import { Backbone } from '../backbone';
export interface GPT2BackboneArgs {
    /**
     * Integer. The size of the token vocabulary.
     */
    vocabularySize: number;
    /**
     * Integer. The number of transformer layers.
     */
    numLayers: number;
    /**
     * Integer. The number of attention heads for each transformer.
     * The hidden size must be divisible by the number of attention heads.
     */
    numHeads: number;
    /**
     * Integer. The size of the transformer encoding and pooler layers.
     */
    hiddenDim: number;
    /**
     * Integer. The output dimension of the first Dense layer in a two-layer
     * feedforward network for each transformer.
     */
    intermediateDim: number;
    /**
     * Float. Dropout probability for the Transformer encoder.
     * Defaults to 0.2.
     */
    dropout?: number;
    /**
     * Integer. The maximum sequence length that this encoder can consume.
     * If `null`, `maxSequenceLength` uses the value from sequence length.
     * This determines the variable shape for positional embeddings.
     * Defaults to 1024.
     */
    maxSequenceLength?: number;
}
/**
 * GPT-2 core network with hyperparameters.
 *
 * This network implements a Transformer-based decoder network,
 * Generative Pretrained Transformer-2 (GPT-2), as described in
 * ["Language Models are Unsupervised Multitask Learners"](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf).
 * It includes the embedding lookups and transformer layers.
 *
 * The default constructor gives a fully customizable, randomly initialized
 * GPT-2 model with any number of layers, heads, and embedding
 * dimensions. To load preset architectures and weights, use the `fromPreset`
 * constructor.
 *
 * Disclaimer: Pre-trained models are provided on an "as is" basis, without
 * warranties or conditions of any kind. The underlying model is provided by a
 * third party and subject to a separate license, available
 * [here](https://github.com/openai/gpt-2).
 *
 *
 * Example usage:
 * ```js
 * const tokenIds = tf.ones([1, 12]), dtype="int32");
 * const paddingMask = tf.tensor(
 *  [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]], 'int32');
 *
 * # Pretrained GPT-2 decoder.
 * model = GPT2Backbone.fromPreset("gpt2_base_en");
 * model.apply(inputData, {paddingMask});
 *
 * # Randomly initialized GPT-2 decoder with custom config.
 * model = kerasNlp.models.GPT2Backbone({
 *     vocabularySize: 50257,
 *     numLayers: 12,
 *     numHeads: 12,
 *     hiddenDim: 768,
 *     intermediateDim: 3072,
 *     maxSequenceLength: 1024,
 * });
 * model.apply(inputData, {paddingMask});
 * ```
 */
export declare class GPT2Backbone extends Backbone {
    /** @nocollapse */
    static className: string;
    private vocabularySize;
    private numLayers;
    private numHeads;
    private hiddenDim;
    private intermediateDim;
    private dropout;
    private maxSequenceLength;
    constructor(args: GPT2BackboneArgs);
    getConfig(): serialization.ConfigDict;
    get tokenEmbedding(): Embedding;
}
