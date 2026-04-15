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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/modeling/position_embedding" />
/**
 *  Position embedding implementation based on `tf.layers.Layer`.
 */
import { Tensor, serialization } from '@tensorflow/tfjs-core';
import { Shape } from '../../../keras_format/common';
import { Layer, LayerArgs } from '../../../engine/topology';
import { Initializer, InitializerIdentifier } from '../../../initializers';
import { LayerVariable } from '../../../variables';
export declare interface PositionEmbeddingArgs extends LayerArgs {
    /**
     * Integer. The maximum length of the dynamic sequence.
     */
    sequenceLength: number;
    /**
     * The initializer to use for the embedding weights.
     * Defaults to `"glorotUniform"`.
     */
    initializer?: Initializer | InitializerIdentifier;
}
export declare interface PositionEmbeddingOptions {
    /**
     * Integer. Index to start the position embeddings at.
     * Defaults to 0.
     */
    startIndex?: number;
}
/**
 * A layer which learns a position embedding for input sequences.
 *
 * This class assumes that in the input tensor, the last dimension corresponds
 * to the features, and the dimension before the last corresponds to the
 * sequence.
 *
 * Examples:
 *
 * Called directly on input.
 * ```js
 * const layer = new PositionEmbedding({sequenceLength=10});
 * layer.call(tf.zeros([8, 10, 16]));
 * ```
 *
 * Combine with a token embedding.
 * ```js
 * const seqLength = 50;
 * const vocabSize = 5000;
 * const embedDim = 128;
 * const inputs = tf.input({shape: [seqLength]});
 * const tokenEmbeddings = tf.layers.embedding({
 *     inputDim=vocabSize, outputDim=embedDim
 * }).apply(inputs);
 * const positionEmbeddings = new PositionEmbedding({
 *     sequenceLength: seqLength
 * }).apply(tokenEmbeddings);
 * const outputs = tf.add(tokenEmbeddings, positionEmbeddings);
 * ```
 *
 * Reference:
 *  - [Devlin et al., 2019](https://arxiv.org/abs/1810.04805)
 */
export declare class PositionEmbedding extends Layer {
    /** @nocollapse */
    static readonly className = "PositionEmbedding";
    private sequenceLength;
    private initializer;
    protected positionEmbeddings: LayerVariable;
    constructor(args: PositionEmbeddingArgs);
    getConfig(): serialization.ConfigDict;
    build(inputShape: Shape): void;
    call(inputs: Tensor | Tensor[], kwargs?: PositionEmbeddingOptions): Tensor;
    computeOutputShape(inputShape: Shape): Shape;
}
