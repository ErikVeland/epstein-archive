/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/// <amd-module name="@tensorflow/tfjs-layers/dist/keras_format/initializer_config" />
import { BaseSerialization } from './types';
/** @docinline */
export type FanMode = 'fanIn' | 'fanOut' | 'fanAvg';
export declare const VALID_FAN_MODE_VALUES: string[];
export type FanModeSerialization = 'fan_in' | 'fan_out' | 'fan_avg';
/** @docinline */
export type Distribution = 'normal' | 'uniform' | 'truncatedNormal';
export declare const VALID_DISTRIBUTION_VALUES: string[];
export type DistributionSerialization = 'normal' | 'uniform' | 'truncated_normal';
export type ZerosSerialization = BaseSerialization<'Zeros', {}>;
export type OnesSerialization = BaseSerialization<'Ones', {}>;
export type ConstantConfig = {
    value: number;
};
export type ConstantSerialization = BaseSerialization<'Constant', ConstantConfig>;
export type RandomNormalConfig = {
    mean?: number;
    stddev?: number;
    seed?: number;
};
export type RandomNormalSerialization = BaseSerialization<'RandomNormal', RandomNormalConfig>;
export type RandomUniformConfig = {
    minval?: number;
    maxval?: number;
    seed?: number;
};
export type RandomUniformSerialization = BaseSerialization<'RandomUniform', RandomUniformConfig>;
export type TruncatedNormalConfig = {
    mean?: number;
    stddev?: number;
    seed?: number;
};
export type TruncatedNormalSerialization = BaseSerialization<'TruncatedNormal', TruncatedNormalConfig>;
export type VarianceScalingConfig = {
    scale?: number;
    mode?: FanModeSerialization;
    distribution?: DistributionSerialization;
    seed?: number;
};
export type VarianceScalingSerialization = BaseSerialization<'VarianceScaling', VarianceScalingConfig>;
export type OrthogonalConfig = {
    seed?: number;
    gain?: number;
};
export type OrthogonalSerialization = BaseSerialization<'Orthogonal', OrthogonalConfig>;
export type IdentityConfig = {
    gain?: number;
};
export type IdentitySerialization = BaseSerialization<'Identity', IdentityConfig>;
export type InitializerSerialization = ZerosSerialization | OnesSerialization | ConstantSerialization | RandomUniformSerialization | RandomNormalSerialization | TruncatedNormalSerialization | IdentitySerialization | VarianceScalingSerialization | OrthogonalSerialization;
export type InitializerClassName = InitializerSerialization['class_name'];
/**
 * A string array of valid Initializer class names.
 *
 * This is guaranteed to match the `InitializerClassName` union type.
 */
export declare const initializerClassNames: InitializerClassName[];
