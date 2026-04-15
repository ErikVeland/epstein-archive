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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/utils" />
import { ModelPredictConfig, Scalar, Tensor } from '@tensorflow/tfjs-core';
import { History } from '../../base_callbacks';
import { ContainerArgs } from '../../engine/container';
import { LayersModel, ModelEvaluateArgs } from '../../engine/training';
import { ModelFitArgs } from '../../engine/training_tensors';
export declare function tensorToArr(input: Tensor): unknown[];
export declare function tensorArrTo2DArr(inputs: Tensor[]): unknown[][];
/**
 * Returns a new Tensor with `updates` inserted into `inputs` starting at the
 * index `startIndices`.
 *
 * @param inputs Tensor to "modify"
 * @param startIndices the starting index to insert the slice.
 *  Length must be equal to `inputs.rank`;
 * @param updates the update tensor. Shape must fit within `inputs` shape.
 * @returns a new tensor with the modification.
 */
export declare function sliceUpdate(inputs: Tensor, startIndices: number[], updates: Tensor): Tensor;
/**
 * A model which allows automatically applying preprocessing.
 */
export interface PipelineModelArgs extends ContainerArgs {
    /**
     * Defaults to true.
     */
    includePreprocessing?: boolean;
}
export declare class PipelineModel extends LayersModel {
    /** @nocollapse */
    static className: string;
    protected includePreprocessing: boolean;
    constructor(args: PipelineModelArgs);
    /**
     * An overridable function which preprocesses features.
     */
    preprocessFeatures(x: Tensor): Tensor<import("@tensorflow/tfjs-core").Rank>;
    /**
     * An overridable function which preprocesses labels.
     */
    preprocessLabels(y: Tensor): Tensor<import("@tensorflow/tfjs-core").Rank>;
    /**
     * An overridable function which preprocesses entire samples.
     */
    preprocessSamples(x: Tensor, y?: Tensor, sampleWeight?: Tensor): Tensor | [Tensor, Tensor] | [Tensor, Tensor, Tensor];
    fit(x: Tensor | Tensor[] | {
        [inputName: string]: Tensor;
    }, y: Tensor | Tensor[] | {
        [inputName: string]: Tensor;
    }, args?: ModelFitArgs): Promise<History>;
    evaluate(x: Tensor | Tensor[], y: Tensor | Tensor[], args?: ModelEvaluateArgs): Scalar | Scalar[];
    predict(x: Tensor | Tensor[], args?: ModelPredictConfig): Tensor | Tensor[];
    trainOnBatch(x: Tensor | Tensor[] | {
        [inputName: string]: Tensor;
    }, y: Tensor | Tensor[] | {
        [inputName: string]: Tensor;
    }, sampleWeight?: Tensor): Promise<number | number[]>;
    predictOnBatch(x: Tensor | Tensor[]): Tensor | Tensor[];
}
