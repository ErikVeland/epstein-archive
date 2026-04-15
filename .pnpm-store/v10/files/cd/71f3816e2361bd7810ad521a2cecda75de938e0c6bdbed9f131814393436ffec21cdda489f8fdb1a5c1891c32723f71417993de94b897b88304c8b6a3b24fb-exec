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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/preprocessing/start_end_packer" />
/**
 *  Start End Packer implementation based on `tf.layers.Layer`.
 */
import { Tensor, Tensor1D, Tensor2D, serialization } from '@tensorflow/tfjs-core';
import { Layer, LayerArgs } from '../../../engine/topology';
export declare interface StartEndPackerArgs extends LayerArgs {
    /**
     * Integer. The desired output length.
     */
    sequenceLength: number;
    /**
     * Integer or string. The ID or token that is to be placed at the start of
     * each sequence. The dtype must match the dtype of the input tensors to the
     * layer. If undefined, no start value will be added.
     */
    startValue?: number | string;
    /**
     * Integer or string. The ID or token that is to be placed at the end of each
     * input segment. The dtype must match the dtype of the input tensors to the
     * layer. If undefined, no end value will be added.
     */
    endValue?: number | string;
    /**
     * Integer or string. The ID or token that is to be placed into the unused
     * positions after the last segment in the sequence. If undefined, 0 or ''
     * will be added depending on the dtype of the input tensor.
     */
    padValue?: number | string;
}
export declare interface StartEndPackerOptions {
    /**
     * Pass to override the configured `sequenceLength` of the layer.
     */
    sequenceLength?: number;
    /**
     * Pass `false` to not append a start value for this input.
     * Defaults to true.
     */
    addStartValue?: boolean;
    /**
     * Pass `false` to not append an end value for this input.
     * Defaults to true.
     */
    addEndValue?: boolean;
}
/**
 * Adds start and end tokens to a sequence and pads to a fixed length.
 *
 *  This layer is useful when tokenizing inputs for tasks like translation,
 *  where each sequence should include a start and end marker. It should
 *  be called after tokenization. The layer will first trim inputs to fit, then
 *  add start/end tokens, and finally pad, if necessary, to `sequence_length`.
 *
 *  Input should be either a `tf.Tensor[]` or a dense `tf.Tensor`, and
 *  either rank-1 or rank-2.
 */
export declare class StartEndPacker extends Layer {
    /** @nocollapse */
    static readonly className = "StartEndPacker";
    private sequenceLength;
    private startValue?;
    private endValue?;
    private padValue?;
    constructor(args: StartEndPackerArgs);
    call(inputs: Tensor | Tensor[], kwargs?: StartEndPackerOptions): Tensor | Tensor2D;
    /**
     * Exactly like `call` except also returns a boolean padding mask of all
     * locations that are filled in with the `padValue`.
     */
    callAndReturnPaddingMask(inputs: Tensor | Tensor[], kwargs?: StartEndPackerOptions): [Tensor1D | Tensor2D, Tensor1D | Tensor2D];
    getConfig(): serialization.ConfigDict;
}
