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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/models/backbone" />
/**
 *  Base class for Backbone models.
 */
import { serialization } from '@tensorflow/tfjs-core';
import { ContainerArgs } from '../../../engine/container';
import { LayersModel } from '../../../engine/training';
import { Embedding } from '../../embeddings';
export declare class Backbone extends LayersModel {
    /** @nocollapse */
    static className: string;
    constructor(args: ContainerArgs);
    /**
     * A `tf.layers.embedding` instance for embedding token ids.
     */
    get tokenEmbedding(): Embedding;
    getConfig(): serialization.ConfigDict;
    static fromConfig<T extends serialization.Serializable>(cls: serialization.SerializableConstructor<T>, config: serialization.ConfigDict): T;
}
