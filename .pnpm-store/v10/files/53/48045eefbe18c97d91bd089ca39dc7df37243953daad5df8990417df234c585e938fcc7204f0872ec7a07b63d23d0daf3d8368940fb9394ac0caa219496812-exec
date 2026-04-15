/**
 * @license
 * Copyright 2023 CodeSmith LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/preprocessing/random_height" />
import { Rank, serialization, Tensor } from '@tensorflow/tfjs-core';
import { Shape } from '../../keras_format/common';
import { Kwargs } from '../../types';
import { BaseRandomLayerArgs, BaseRandomLayer } from '../../engine/base_random_layer';
export declare interface RandomHeightArgs extends BaseRandomLayerArgs {
    factor: number | [number, number];
    interpolation?: InterpolationType;
    seed?: number;
    autoVectorize?: boolean;
}
declare const INTERPOLATION_KEYS: readonly ["bilinear", "nearest"];
export declare const INTERPOLATION_METHODS: Set<"nearest" | "bilinear">;
type InterpolationType = typeof INTERPOLATION_KEYS[number];
/**
 * Preprocessing Layer with randomly varies image during training
 *
 * This layer randomly adjusts the height of a
 * batch of images by a random factor.
 *
 * The input should be a 3D (unbatched) or
 * 4D (batched) tensor in the `"channels_last"` image data format. Input pixel
 * values can be of any range (e.g. `[0., 1.)` or `[0, 255]`) and of integer
 * or floating point dtype. By default, the layer will output floats.
 *
 * tf methods implemented in tfjs: 'bilinear', 'nearest',
 * tf methods unimplemented in tfjs: 'bicubic', 'area', 'lanczos3', 'lanczos5',
 *                                   'gaussian', 'mitchellcubic'
 *
 */
export declare class RandomHeight extends BaseRandomLayer {
    /** @nocollapse */
    static className: string;
    private readonly factor;
    private readonly interpolation?;
    private heightLower;
    private heightUpper;
    private imgWidth;
    private heightFactor;
    constructor(args: RandomHeightArgs);
    getConfig(): serialization.ConfigDict;
    computeOutputShape(inputShape: Shape | Shape[]): Shape | Shape[];
    call(inputs: Tensor<Rank.R3> | Tensor<Rank.R4>, kwargs: Kwargs): Tensor[] | Tensor;
}
export {};
