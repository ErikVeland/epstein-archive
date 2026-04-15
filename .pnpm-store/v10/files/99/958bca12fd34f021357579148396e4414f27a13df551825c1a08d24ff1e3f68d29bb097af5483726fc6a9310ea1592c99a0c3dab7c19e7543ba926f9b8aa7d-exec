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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/modeling/transformer_layer_utils" />
/**
 *  Utility functions for `TransformerDecoder`.
 */
import { Tensor } from '@tensorflow/tfjs-core';
/**
 * Compute a causal attention mask for a transformer decoder.
 *
 * @param batchSize batch size for the mask.
 * @param inputLength the length of key/value tensors in the attention layer.
 * @param outputLength the length of query tensor in the attention layer.
 * @param cacheIndex the current index for cached generation. If passed, the
 *  query sequence will be considered to start at `cacheIndex` rather than zero.
 *  For example, a casual mask with `outputLength=1` and `cacheIndex=5` would
 *  allow the query tensor to attend to the first five positions of the
 *  key/value tensors.
 *
 * @returns a causal attention mask with shape
 *  `[batchSize, outputLength, inputLength]` that can be passed to a attention
 *  layer.
 */
export declare function computeCausalMask(batchSize: number, inputLength: number, outputLength: number, cacheIndex?: number): Tensor;
/**
 * Merge the padding mask with a customized attention mask.
 *
 * @param inputs the input sequence.
 * @param paddingMask the 1D padding mask, of shape
 *          [batchSize, sequenceLength].
 * @param attentionMask the 2D customized mask, of shape
 *          [batchSize, sequenceLength, sequence2_length].
 * @returns
 *  A merged 2D mask or null. If only `paddingMask` is provided, the
 *  returned mask is paddingMask with one additional axis.
 */
export declare function mergePaddingAndAttentionMask(inputs: Tensor, paddingMask: Tensor, attentionMask: Tensor): Tensor;
