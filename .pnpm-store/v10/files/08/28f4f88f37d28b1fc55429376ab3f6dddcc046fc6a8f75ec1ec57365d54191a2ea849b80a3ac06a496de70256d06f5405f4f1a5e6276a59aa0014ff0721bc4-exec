/**
 * @license
 * Copyright 2023 CodeSmith LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/// <amd-module name="@tensorflow/tfjs-layers/dist/engine/base_random_layer" />
import { LayerArgs, Layer } from './topology';
import { RandomSeed } from '../backend/random_seed';
import { serialization } from '@tensorflow/tfjs-core';
export declare interface BaseRandomLayerArgs extends LayerArgs {
    seed?: number;
}
export declare abstract class BaseRandomLayer extends Layer {
    /** @nocollapse */
    static className: string;
    protected randomGenerator: RandomSeed;
    constructor(args: BaseRandomLayerArgs);
    getConfig(): serialization.ConfigDict;
}
