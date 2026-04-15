/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/// <amd-module name="@tensorflow/tfjs-layers/dist/keras_format/optimizer_config" />
import { BaseSerialization } from './types';
export type AdadeltaOptimizerConfig = {
    learning_rate: number;
    rho: number;
    epsilon: number;
};
export type AdadeltaSerialization = BaseSerialization<'Adadelta', AdadeltaOptimizerConfig>;
export type AdagradOptimizerConfig = {
    learning_rate: number;
    initial_accumulator_value?: number;
};
export type AdagradSerialization = BaseSerialization<'Adagrad', AdagradOptimizerConfig>;
export type AdamOptimizerConfig = {
    learning_rate: number;
    beta1: number;
    beta2: number;
    epsilon?: number;
};
export type AdamSerialization = BaseSerialization<'Adam', AdamOptimizerConfig>;
export type AdamaxOptimizerConfig = {
    learning_rate: number;
    beta1: number;
    beta2: number;
    epsilon?: number;
    decay?: number;
};
export type AdamaxSerialization = BaseSerialization<'Adamax', AdamaxOptimizerConfig>;
export type MomentumOptimizerConfig = {
    learning_rate: number;
    momentum: number;
    use_nesterov?: boolean;
};
export type MomentumSerialization = BaseSerialization<'Momentum', MomentumOptimizerConfig>;
export type RMSPropOptimizerConfig = {
    learning_rate: number;
    decay?: number;
    momentum?: number;
    epsilon?: number;
    centered?: boolean;
};
export type RMSPropSerialization = BaseSerialization<'RMSProp', RMSPropOptimizerConfig>;
export type SGDOptimizerConfig = {
    learning_rate: number;
};
export type SGDSerialization = BaseSerialization<'SGD', SGDOptimizerConfig>;
export type OptimizerSerialization = AdadeltaSerialization | AdagradSerialization | AdamSerialization | AdamaxSerialization | MomentumSerialization | RMSPropSerialization | SGDSerialization;
export type OptimizerClassName = OptimizerSerialization['class_name'];
/**
 * A string array of valid Optimizer class names.
 *
 * This is guaranteed to match the `OptimizerClassName` union type.
 */
export declare const optimizerClassNames: OptimizerClassName[];
