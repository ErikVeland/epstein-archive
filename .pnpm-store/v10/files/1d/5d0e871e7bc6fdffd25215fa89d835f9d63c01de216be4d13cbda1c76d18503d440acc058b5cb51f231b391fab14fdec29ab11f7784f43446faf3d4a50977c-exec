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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/models/task" />
/**
 *  Base class for Task models.
 */
import { Tensor, serialization } from '@tensorflow/tfjs-core';
import { PipelineModel, PipelineModelArgs } from '../utils';
import { Backbone } from './backbone';
import { Preprocessor } from './preprocessor';
import { ModelCompileArgs } from '../../../engine/training';
export declare class Task extends PipelineModel {
    /** @nocollapse */
    static className: string;
    protected _backbone: Backbone;
    protected _preprocessor: Preprocessor;
    constructor(args: PipelineModelArgs);
    private checkForLossMismatch;
    compile(args: ModelCompileArgs): void;
    preprocessSamples(x: Tensor, y?: Tensor, sampleWeight?: Tensor): Tensor | [Tensor, Tensor] | [Tensor, Tensor, Tensor];
    /**
     * A `LayersModel` instance providing the backbone submodel.
     */
    get backbone(): Backbone;
    set backbone(value: Backbone);
    /**
     * A `LayersModel` instance used to preprocess inputs.
     */
    get preprocessor(): Preprocessor;
    set preprocessor(value: Preprocessor);
    getConfig(): serialization.ConfigDict;
    static fromConfig<T extends serialization.Serializable>(cls: serialization.SerializableConstructor<T>, config: serialization.ConfigDict): T;
    static backboneCls<T extends serialization.Serializable>(cls: serialization.SerializableConstructor<T>): serialization.SerializableConstructor<T>;
    static preprocessorCls<T extends serialization.Serializable>(cls: serialization.SerializableConstructor<T>): serialization.SerializableConstructor<T>;
    static presets<T extends serialization.Serializable>(cls: serialization.SerializableConstructor<T>): {};
    getLayers(): void;
    summary(lineLength?: number, positions?: number[], printFn?: (message?: any, ...optionalParams: any[]) => void): void;
}
