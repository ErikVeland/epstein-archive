/// <amd-module name="@tensorflow/tfjs-core/dist/kernel_names" />
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
import { NamedTensorInfoMap } from './kernel_registry';
import { ExplicitPadding } from './ops/conv_util';
import { Activation } from './ops/fused_types';
import { TensorInfo } from './tensor_info';
import { DataType, DrawOptions, PixelData } from './types';
export declare const Abs = "Abs";
export type AbsInputs = UnaryInputs;
export declare const Acos = "Acos";
export type AcosInputs = UnaryInputs;
export declare const Acosh = "Acosh";
export type AcoshInputs = UnaryInputs;
export declare const Add = "Add";
export type AddInputs = BinaryInputs;
export declare const AddN = "AddN";
export type AddNInputs = TensorInfo[];
export declare const All = "All";
export type AllInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface AllAttrs {
    axis: number | number[];
    keepDims: boolean;
}
export declare const Any = "Any";
export type AnyInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface AnyAttrs {
    axis: number | number[];
    keepDims: boolean;
}
export declare const ArgMax = "ArgMax";
export type ArgMaxInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface ArgMaxAttrs {
    axis: number;
}
export declare const ArgMin = "ArgMin";
export type ArgMinInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface ArgMinAttrs {
    axis: number;
}
export declare const Asin = "Asin";
export type AsinInputs = UnaryInputs;
export declare const Asinh = "Asinh";
export type AsinhInputs = UnaryInputs;
export declare const Atan = "Atan";
export type AtanInputs = UnaryInputs;
export declare const Atanh = "Atanh";
export type AtanhInputs = UnaryInputs;
export declare const Atan2 = "Atan2";
export type Atan2Inputs = BinaryInputs;
export declare const AvgPool = "AvgPool";
export type AvgPoolInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface AvgPoolAttrs {
    filterSize: [number, number] | number;
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const AvgPoolGrad = "AvgPoolGrad";
export type AvgPoolGradInputs = Pick<NamedTensorInfoMap, 'dy' | 'input'>;
export interface AvgPoolGradAttrs {
    filterSize: [number, number] | number;
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
}
export declare const AvgPool3D = "AvgPool3D";
export type AvgPool3DInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface AvgPool3DAttrs {
    filterSize: [number, number, number] | number;
    strides: [number, number, number] | number;
    pad: 'valid' | 'same' | number;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
    dataFormat: 'NDHWC' | 'NCDHW';
}
export declare const AvgPool3DGrad = "AvgPool3DGrad";
export type AvgPool3DGradInputs = Pick<NamedTensorInfoMap, 'dy' | 'input'>;
export interface AvgPool3DGradAttrs {
    filterSize: [number, number, number] | number;
    strides: [number, number, number] | number;
    pad: 'valid' | 'same' | number;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const BatchMatMul = "BatchMatMul";
export type BatchMatMulInputs = Pick<NamedTensorInfoMap, 'a' | 'b'>;
export interface BatchMatMulAttrs {
    transposeA: boolean;
    transposeB: boolean;
}
export declare const BatchToSpaceND = "BatchToSpaceND";
export type BatchToSpaceNDInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface BatchToSpaceNDAttrs {
    blockShape: number[];
    crops: number[][];
}
export type BinaryInputs = Pick<NamedTensorInfoMap, 'a' | 'b'>;
export declare const Bincount = "Bincount";
export type BincountInputs = Pick<NamedTensorInfoMap, 'x' | 'weights'>;
export interface BincountAttrs {
    size: number;
}
export declare const BitwiseAnd = "BitwiseAnd";
export type BitwiseAndInputs = BinaryInputs;
export declare const BroadcastTo = "BroadcastTo";
export type BroadcastToInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface BroadCastToAttrs {
    shape: number[];
    inputShape: number[];
}
export declare const BroadcastArgs = "BroadcastArgs";
export type BroadcastArgsInputs = Pick<NamedTensorInfoMap, 's0' | 's1'>;
export declare const Cast = "Cast";
export type CastInputs = UnaryInputs;
export interface CastAttrs {
    dtype: DataType;
}
export declare const Ceil = "Ceil";
export type CeilInputs = UnaryInputs;
export declare const ClipByValue = "ClipByValue";
export type ClipByValueInputs = UnaryInputs;
export interface ClipByValueAttrs {
    clipValueMin: number;
    clipValueMax: number;
}
export declare const Complex = "Complex";
export type ComplexInputs = Pick<NamedTensorInfoMap, 'real' | 'imag'>;
export declare const ComplexAbs = "ComplexAbs";
export type ComplexAbsInputs = UnaryInputs;
export declare const Concat = "Concat";
export type ConcatInputs = TensorInfo[];
export interface ConcatAttrs {
    axis: number;
}
export declare const Conv2D = "Conv2D";
export type Conv2DInputs = Pick<NamedTensorInfoMap, 'x' | 'filter'>;
export interface Conv2DAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dataFormat: 'NHWC' | 'NCHW';
    dilations: [number, number] | number;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const Conv2DBackpropFilter = "Conv2DBackpropFilter";
export type Conv2DBackpropFilterInputs = Pick<NamedTensorInfoMap, 'x' | 'dy'>;
export interface Conv2DBackpropFilterAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dataFormat: 'NHWC' | 'NCHW';
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
    filterShape: [number, number, number, number];
}
export declare const Conv2DBackpropInput = "Conv2DBackpropInput";
export type Conv2DBackpropInputInputs = Pick<NamedTensorInfoMap, 'dy' | 'filter'>;
export interface Conv2DBackpropInputAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dataFormat: 'NHWC' | 'NCHW';
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
    inputShape: [number, number, number, number];
}
export declare const Conv3D = "Conv3D";
export type Conv3DInputs = Pick<NamedTensorInfoMap, 'x' | 'filter'>;
export interface Conv3DAttrs {
    strides: [number, number, number] | number;
    pad: 'valid' | 'same';
    dataFormat: 'NDHWC' | 'NCDHW';
    dilations: [number, number, number] | number;
}
export declare const Conv3DBackpropFilterV2 = "Conv3DBackpropFilterV2";
export type Conv3DBackpropFilterV2Inputs = Pick<NamedTensorInfoMap, 'x' | 'dy'>;
export interface Conv3DBackpropFilterV2Attrs {
    strides: [number, number, number] | number;
    pad: 'valid' | 'same';
    filterShape: [number, number, number, number, number];
}
export declare const Conv3DBackpropInputV2 = "Conv3DBackpropInputV2";
export type Conv3DBackpropInputV2Inputs = Pick<NamedTensorInfoMap, 'dy' | 'filter'>;
export interface Conv3DBackpropInputV2Attrs {
    strides: [number, number, number] | number;
    pad: 'valid' | 'same';
    inputShape: [number, number, number, number, number];
}
export declare const Cos = "Cos";
export type CosInputs = UnaryInputs;
export declare const Cosh = "Cosh";
export type CoshInputs = UnaryInputs;
export declare const Cumprod = "Cumprod";
export type CumprodInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface CumprodAttrs {
    axis: number;
    exclusive: boolean;
    reverse: boolean;
}
export declare const Cumsum = "Cumsum";
export type CumsumInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface CumsumAttrs {
    axis: number;
    exclusive: boolean;
    reverse: boolean;
}
export declare const CropAndResize = "CropAndResize";
export type CropAndResizeInputs = Pick<NamedTensorInfoMap, 'image' | 'boxes' | 'boxInd'>;
export interface CropAndResizeAttrs {
    cropSize: [number, number];
    method: 'bilinear' | 'nearest';
    extrapolationValue: number;
}
export declare const DenseBincount = "DenseBincount";
export type DenseBincountInputs = Pick<NamedTensorInfoMap, 'x' | 'weights'>;
export interface DenseBincountAttrs {
    size: number;
    binaryOutput?: boolean;
}
export declare const DepthToSpace = "DepthToSpace";
export type DepthToSpaceInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface DepthToSpaceAttrs {
    blockSize: number;
    dataFormat: 'NHWC' | 'NCHW';
}
export declare const DepthwiseConv2dNative = "DepthwiseConv2dNative";
export type DepthwiseConv2dNativeInputs = Pick<NamedTensorInfoMap, 'x' | 'filter'>;
export interface DepthwiseConv2dNativeAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dataFormat: 'NHWC' | 'NCHW';
    dilations: [number, number] | number;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const DepthwiseConv2dNativeBackpropFilter = "DepthwiseConv2dNativeBackpropFilter";
export type DepthwiseConv2dNativeBackpropFilterInputs = Pick<NamedTensorInfoMap, 'x' | 'dy'>;
export interface DepthwiseConv2dNativeBackpropFilterAttrs {
    strides: [number, number] | number;
    dilations: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
    filterShape: [number, number, number, number];
}
export declare const DepthwiseConv2dNativeBackpropInput = "DepthwiseConv2dNativeBackpropInput";
export type DepthwiseConv2dNativeBackpropInputInputs = Pick<NamedTensorInfoMap, 'dy' | 'filter'>;
export interface DepthwiseConv2dNativeBackpropInputAttrs {
    strides: [number, number] | number;
    dilations: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
    inputShape: [number, number, number, number];
}
export declare const Diag = "Diag";
export type DiagInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const Dilation2D = "Dilation2D";
export type Dilation2DInputs = Pick<NamedTensorInfoMap, 'x' | 'filter'>;
export interface Dilation2DAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number;
    dilations: [number, number] | number;
}
export declare const Dilation2DBackpropInput = "Dilation2DBackpropInput";
export type Dilation2DBackpropInputInputs = Pick<NamedTensorInfoMap, 'x' | 'filter' | 'dy'>;
export declare const Dilation2DBackpropFilter = "Dilation2DBackpropFilter";
export type Dilation2DBackpropFilterInputs = Pick<NamedTensorInfoMap, 'x' | 'filter' | 'dy'>;
export declare const Draw = "Draw";
export type DrawInputs = Pick<NamedTensorInfoMap, 'image'>;
export interface DrawAttrs {
    canvas: HTMLCanvasElement;
    options?: DrawOptions;
}
export declare const RealDiv = "RealDiv";
export type RealDivInputs = BinaryInputs;
export declare const Einsum = "Einsum";
export type EinsumInputs = TensorInfo[];
export interface EinsumAttrs {
    equation: string;
}
export declare const Elu = "Elu";
export type EluInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const EluGrad = "EluGrad";
export type EluGradInputs = Pick<NamedTensorInfoMap, 'dy' | 'y'>;
export declare const Erf = "Erf";
export type ErfInputs = UnaryInputs;
export declare const Equal = "Equal";
export type EqualInputs = BinaryInputs;
export declare const Exp = "Exp";
export type ExpInputs = UnaryInputs;
export declare const ExpandDims = "ExpandDims";
export type ExpandDimsInputs = Pick<NamedTensorInfoMap, 'input'>;
export interface ExpandDimsAttrs {
    dim: number;
}
export declare const Expm1 = "Expm1";
export type Expm1Inputs = UnaryInputs;
export declare const FFT = "FFT";
export type FFTInputs = Pick<NamedTensorInfoMap, 'input'>;
export declare const Fill = "Fill";
export interface FillAttrs {
    shape: number[];
    value: number | string;
    dtype: DataType;
}
export declare const FlipLeftRight = "FlipLeftRight";
export type FlipLeftRightInputs = Pick<NamedTensorInfoMap, 'image'>;
export declare const Floor = "Floor";
export type FloorInputs = UnaryInputs;
export declare const FloorDiv = "FloorDiv";
export type FloorDivInputs = BinaryInputs;
export declare const FusedBatchNorm = "FusedBatchNorm";
export type FusedBatchNormInputs = Pick<NamedTensorInfoMap, 'x' | 'scale' | 'offset' | 'mean' | 'variance'>;
export interface FusedBatchNormAttrs {
    varianceEpsilon: number;
}
export declare const GatherV2 = "GatherV2";
export type GatherV2Inputs = Pick<NamedTensorInfoMap, 'x' | 'indices'>;
export interface GatherV2Attrs {
    axis: number;
    batchDims: number;
}
export declare const GatherNd = "GatherNd";
export type GatherNdInputs = Pick<NamedTensorInfoMap, 'params' | 'indices'>;
export declare const Greater = "Greater";
export type GreaterInputs = BinaryInputs;
export declare const GreaterEqual = "GreaterEqual";
export type GreaterEqualInputs = BinaryInputs;
export declare const Identity = "Identity";
export type IdentityInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const IFFT = "IFFT";
export type IFFTInputs = Pick<NamedTensorInfoMap, 'input'>;
export declare const Imag = "Imag";
export type ImagInputs = Pick<NamedTensorInfoMap, 'input'>;
export declare const IsFinite = "IsFinite";
export type IsFiniteInputs = UnaryInputs;
export declare const IsInf = "IsInf";
export type IsInfInputs = UnaryInputs;
export declare const IsNan = "IsNan";
export type IsNanInputs = UnaryInputs;
export declare const LeakyRelu = "LeakyRelu";
export type LeakyReluInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface LeakyReluAttrs {
    alpha: number;
}
export declare const Less = "Less";
export type LessInputs = BinaryInputs;
export declare const LessEqual = "LessEqual";
export type LessEqualInputs = BinaryInputs;
export declare const LinSpace = "LinSpace";
export interface LinSpaceAttrs {
    start: number;
    stop: number;
    num: number;
}
export declare const Log = "Log";
export type LogInputs = UnaryInputs;
export declare const Log1p = "Log1p";
export type Log1pInputs = UnaryInputs;
export declare const LogicalAnd = "LogicalAnd";
export type LogicalAndInputs = BinaryInputs;
export declare const LogicalNot = "LogicalNot";
export type LogicalNotInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const LogicalOr = "LogicalOr";
export type LogicalOrInputs = BinaryInputs;
export declare const LogicalXor = "LogicalXor";
export type LogicalXorInputs = BinaryInputs;
export declare const LogSoftmax = "LogSoftmax";
export type LogSoftmaxInputs = Pick<NamedTensorInfoMap, 'logits'>;
export interface LogSoftmaxAttrs {
    axis: number;
}
export declare const LowerBound = "LowerBound";
export type LowerBoundInputs = Pick<NamedTensorInfoMap, 'sortedSequence' | 'values'>;
export declare const LRN = "LRN";
export type LRNInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface LRNAttrs {
    depthRadius: number;
    bias: number;
    alpha: number;
    beta: number;
}
export declare const LRNGrad = "LRNGrad";
export type LRNGradInputs = Pick<NamedTensorInfoMap, 'x' | 'y' | 'dy'>;
export interface LRNGradAttrs {
    depthRadius: number;
    bias: number;
    alpha: number;
    beta: number;
}
export declare const MatrixBandPart = "MatrixBandPart";
export type MatrixBandPartInputs = Pick<NamedTensorInfoMap, 'input' | 'numLower' | 'numUpper'>;
export interface MatrixBandPartAttrs {
}
export declare const Max = "Max";
export type MaxInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MaxAttrs {
    reductionIndices: number | number[];
    keepDims: boolean;
}
export declare const Maximum = "Maximum";
export type MaximumInputs = BinaryInputs;
export declare const MaxPool = "MaxPool";
export type MaxPoolInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MaxPoolAttrs {
    filterSize: [number, number] | number;
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const MaxPoolGrad = "MaxPoolGrad";
export type MaxPoolGradInputs = Pick<NamedTensorInfoMap, 'dy' | 'input' | 'output'>;
export interface MaxPoolGradAttrs {
    filterSize: [number, number] | number;
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const MaxPool3D = "MaxPool3D";
export type MaxPool3DInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MaxPool3DAttrs {
    filterSize: [number, number, number] | number;
    strides: [number, number, number] | number;
    pad: 'valid' | 'same' | number;
    dataFormat: 'NDHWC' | 'NCDHW';
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const MaxPool3DGrad = "MaxPool3DGrad";
export type MaxPool3DGradInputs = Pick<NamedTensorInfoMap, 'dy' | 'input' | 'output'>;
export interface MaxPool3DGradAttrs {
    filterSize: [number, number, number] | number;
    strides: [number, number, number] | number;
    pad: 'valid' | 'same' | number;
    dimRoundingMode?: 'floor' | 'round' | 'ceil';
}
export declare const MaxPoolWithArgmax = "MaxPoolWithArgmax";
export type MaxPoolWithArgmaxInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MaxPoolWithArgmaxAttrs {
    filterSize: [number, number] | number;
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number;
    includeBatchInIndex: boolean;
}
export declare const Mean = "Mean";
export type MeanInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MeanAttrs {
    axis: number | number[];
    keepDims: boolean;
}
export declare const Min = "Min";
export type MinInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MinAttrs {
    axis: number | number[];
    keepDims: boolean;
}
export declare const Minimum = "Minimum";
export type MinimumInputs = BinaryInputs;
export declare const MirrorPad = "MirrorPad";
export type MirrorPadInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface MirrorPadAttrs {
    paddings: Array<[number, number]>;
    mode: 'reflect' | 'symmetric';
}
export declare const Mod = "Mod";
export type ModInputs = BinaryInputs;
export declare const Multinomial = "Multinomial";
export type MultinomialInputs = Pick<NamedTensorInfoMap, 'logits'>;
export interface MultinomialAttrs {
    numSamples: number;
    seed: number;
    normalized: boolean;
}
export declare const Multiply = "Multiply";
export type MultiplyInputs = BinaryInputs;
export declare const Neg = "Neg";
export type NegInputs = UnaryInputs;
export declare const NotEqual = "NotEqual";
export type NotEqualInputs = BinaryInputs;
export declare const NonMaxSuppressionV3 = "NonMaxSuppressionV3";
export type NonMaxSuppressionV3Inputs = Pick<NamedTensorInfoMap, 'boxes' | 'scores'>;
export interface NonMaxSuppressionV3Attrs {
    maxOutputSize: number;
    iouThreshold: number;
    scoreThreshold: number;
}
export declare const NonMaxSuppressionV4 = "NonMaxSuppressionV4";
export type NonMaxSuppressionV4Inputs = Pick<NamedTensorInfoMap, 'boxes' | 'scores'>;
export interface NonMaxSuppressionV4Attrs {
    maxOutputSize: number;
    iouThreshold: number;
    scoreThreshold: number;
    padToMaxOutputSize: boolean;
}
export declare const NonMaxSuppressionV5 = "NonMaxSuppressionV5";
export type NonMaxSuppressionV5Inputs = Pick<NamedTensorInfoMap, 'boxes' | 'scores'>;
export interface NonMaxSuppressionV5Attrs {
    maxOutputSize: number;
    iouThreshold: number;
    scoreThreshold: number;
    softNmsSigma: number;
}
export declare const OnesLike = "OnesLike";
export type OnesLikeInputs = UnaryInputs;
export declare const OneHot = "OneHot";
export type OneHotInputs = Pick<NamedTensorInfoMap, 'indices'>;
export interface OneHotAttrs {
    depth: number;
    onValue: number;
    offValue: number;
    dtype: DataType;
}
export declare const Pack = "Pack";
export type PackInputs = TensorInfo[];
export interface PackAttrs {
    axis: number;
}
export declare const PadV2 = "PadV2";
export type PadV2Inputs = Pick<NamedTensorInfoMap, 'x'>;
export interface PadV2Attrs {
    paddings: Array<[number, number]>;
    constantValue: number;
}
export declare const Pool = "Pool";
export type PoolInputs = Pick<NamedTensorInfoMap, 'input'>;
export declare const Pow = "Pow";
export type PowInputs = BinaryInputs;
export declare const Prelu = "Prelu";
export type PreluInputs = Pick<NamedTensorInfoMap, 'x' | 'alpha'>;
export declare const Prod = "Prod";
export type ProdInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface ProdAttrs {
    axis: number | number[];
    keepDims: boolean;
}
export declare const RaggedGather = "RaggedGather";
export type RaggedGatherInputs = {
    paramsNestedSplits: TensorInfo[];
} & Pick<NamedTensorInfoMap, 'paramsDenseValues' | 'indices'>;
export interface RaggedGatherAttrs {
    outputRaggedRank: number;
}
export declare const RaggedRange = "RaggedRange";
export type RaggedRangeInputs = Pick<NamedTensorInfoMap, 'starts' | 'limits' | 'deltas'>;
export declare const RaggedTensorToTensor = "RaggedTensorToTensor";
export type RaggedTensorToTensorInputs = Pick<NamedTensorInfoMap, 'shape' | 'values' | 'defaultValue'> & {
    rowPartitionTensors: TensorInfo[];
};
export interface RaggedTensorToTensorAttrs {
    rowPartitionTypes: string[];
}
export declare const Range = "Range";
export interface RangeAttrs {
    start: number;
    stop: number;
    step: number;
    dtype: 'float32' | 'int32';
}
export declare const Real = "Real";
export type RealInputs = Pick<NamedTensorInfoMap, 'input'>;
export declare const Reciprocal = "Reciprocal";
export type ReciprocalInputs = UnaryInputs;
export declare const Relu = "Relu";
export type ReluInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const Reshape = "Reshape";
export type ReshapeInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface ReshapeAttrs {
    shape: number[];
}
export declare const ResizeNearestNeighbor = "ResizeNearestNeighbor";
export type ResizeNearestNeighborInputs = Pick<NamedTensorInfoMap, 'images'>;
export interface ResizeNearestNeighborAttrs {
    alignCorners: boolean;
    halfPixelCenters: boolean;
    size: [number, number];
}
export declare const ResizeNearestNeighborGrad = "ResizeNearestNeighborGrad";
export type ResizeNearestNeighborGradInputs = Pick<NamedTensorInfoMap, 'images' | 'dy'>;
export type ResizeNearestNeighborGradAttrs = ResizeNearestNeighborAttrs;
export declare const ResizeBilinear = "ResizeBilinear";
export type ResizeBilinearInputs = Pick<NamedTensorInfoMap, 'images'>;
export interface ResizeBilinearAttrs {
    alignCorners: boolean;
    halfPixelCenters: boolean;
    size: [number, number];
}
export declare const ResizeBilinearGrad = "ResizeBilinearGrad";
export type ResizeBilinearGradInputs = Pick<NamedTensorInfoMap, 'images' | 'dy'>;
export type ResizeBilinearGradAttrs = ResizeBilinearAttrs;
export declare const Relu6 = "Relu6";
export type Relu6Inputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const Reverse = "Reverse";
export type ReverseInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface ReverseAttrs {
    dims: number | number[];
}
export declare const Round = "Round";
export type RoundInputs = UnaryInputs;
export declare const Rsqrt = "Rsqrt";
export type RsqrtInputs = UnaryInputs;
export declare const ScatterNd = "ScatterNd";
export type ScatterNdInputs = Pick<NamedTensorInfoMap, 'indices' | 'updates'>;
export interface ScatterNdAttrs {
    shape: number[];
}
export declare const TensorScatterUpdate = "TensorScatterUpdate";
export type TensorScatterUpdateInputs = Pick<NamedTensorInfoMap, 'tensor' | 'indices' | 'updates'>;
export interface TensorScatterUpdateAttrs {
}
export declare const SearchSorted = "SearchSorted";
export type SearchSortedInputs = Pick<NamedTensorInfoMap, 'sortedSequence' | 'values'>;
export interface SearchSortedAttrs {
    side: 'left' | 'right';
}
export declare const Select = "Select";
export type SelectInputs = Pick<NamedTensorInfoMap, 'condition' | 't' | 'e'>;
export declare const Selu = "Selu";
export type SeluInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const Slice = "Slice";
export type SliceInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface SliceAttrs {
    begin: number | number[];
    size: number | number[];
}
export declare const Sin = "Sin";
export type SinInputs = UnaryInputs;
export declare const Sinh = "Sinh";
export type SinhInputs = UnaryInputs;
export declare const Sign = "Sign";
export type SignInputs = UnaryInputs;
export declare const Sigmoid = "Sigmoid";
export type SigmoidInputs = UnaryInputs;
export declare const Softplus = "Softplus";
export type SoftplusInputs = UnaryInputs;
export declare const Sqrt = "Sqrt";
export type SqrtInputs = UnaryInputs;
export declare const Sum = "Sum";
export type SumInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface SumAttrs {
    axis: number | number[];
    keepDims: boolean;
}
export declare const SpaceToBatchND = "SpaceToBatchND";
export type SpaceToBatchNDInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface SpaceToBatchNDAttrs {
    blockShape: number[];
    paddings: number[][];
}
export declare const SplitV = "SplitV";
export type SplitVInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface SplitVAttrs {
    numOrSizeSplits: number[] | number;
    axis: number;
}
export declare const Softmax = "Softmax";
export type SoftmaxInputs = Pick<NamedTensorInfoMap, 'logits'>;
export interface SoftmaxAttrs {
    dim: number;
}
export declare const SparseFillEmptyRows = "SparseFillEmptyRows";
export type SparseFillEmptyRowsInputs = Pick<NamedTensorInfoMap, 'indices' | 'values' | 'denseShape' | 'defaultValue'>;
export declare const SparseReshape = "SparseReshape";
export type SparseReshapeInputs = Pick<NamedTensorInfoMap, 'inputIndices' | 'inputShape' | 'newShape'>;
export declare const SparseSegmentMean = "SparseSegmentMean";
export type SparseSegmentMeanInputs = Pick<NamedTensorInfoMap, 'data' | 'indices' | 'segmentIds'>;
export declare const SparseSegmentSum = "SparseSegmentSum";
export type SparseSegmentSumInputs = Pick<NamedTensorInfoMap, 'data' | 'indices' | 'segmentIds'>;
export declare const SparseToDense = "SparseToDense";
export type SparseToDenseInputs = Pick<NamedTensorInfoMap, 'sparseIndices' | 'sparseValues' | 'defaultValue'>;
export interface SparseToDenseAttrs {
    outputShape: number[];
}
export declare const SquaredDifference = "SquaredDifference";
export type SquaredDifferenceInputs = BinaryInputs;
export declare const Square = "Square";
export type SquareInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const StaticRegexReplace = "StaticRegexReplace";
export type StaticRegexReplaceInputs = UnaryInputs;
export interface StaticRegexReplaceAttrs {
    pattern: string;
    rewrite: string;
    replaceGlobal: boolean;
}
export declare const StridedSlice = "StridedSlice";
export type StridedSliceInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface StridedSliceAttrs {
    begin: number[];
    end: number[];
    strides: number[];
    beginMask: number;
    endMask: number;
    ellipsisMask: number;
    newAxisMask: number;
    shrinkAxisMask: number;
}
export declare const StringNGrams = "StringNGrams";
export type StringNGramsInputs = Pick<NamedTensorInfoMap, 'data' | 'dataSplits'>;
export interface StringNGramsAttrs {
    separator: string;
    nGramWidths: number[];
    leftPad: string;
    rightPad: string;
    padWidth: number;
    preserveShortSequences: boolean;
}
export declare const StringSplit = "StringSplit";
export type StringSplitInputs = Pick<NamedTensorInfoMap, 'input' | 'delimiter'>;
export interface StringSplitAttrs {
    skipEmpty: boolean;
}
export declare const StringToHashBucketFast = "StringToHashBucketFast";
export type StringToHashBucketFastInputs = Pick<NamedTensorInfoMap, 'input'>;
export interface StringToHashBucketFastAttrs {
    numBuckets: number;
}
export declare const Sub = "Sub";
export type SubInputs = BinaryInputs;
export declare const Tan = "Tan";
export type TanInputs = UnaryInputs;
export declare const Tanh = "Tanh";
export type TanhInputs = UnaryInputs;
export declare const Tile = "Tile";
export type TileInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface TileAttrs {
    reps: number[];
}
export declare const TopK = "TopK";
export type TopKInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface TopKAttrs {
    k: number;
    sorted: boolean;
}
export declare const Transform = "Transform";
export type TransformInputs = Pick<NamedTensorInfoMap, 'image' | 'transforms'>;
export interface TransformAttrs {
    interpolation: 'nearest' | 'bilinear';
    fillMode: 'constant' | 'reflect' | 'wrap' | 'nearest';
    fillValue: number;
    outputShape?: [number, number];
}
export declare const Transpose = "Transpose";
export type TransposeInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface TransposeAttrs {
    perm: number[];
}
export declare const Unique = "Unique";
export type UniqueInputs = Pick<NamedTensorInfoMap, 'x'>;
export interface UniqueAttrs {
    axis: number;
}
export type UnaryInputs = Pick<NamedTensorInfoMap, 'x'>;
export declare const Unpack = "Unpack";
export type UnpackInputs = Pick<NamedTensorInfoMap, 'value'>;
export interface UnpackAttrs {
    axis: number;
}
export declare const UnsortedSegmentSum = "UnsortedSegmentSum";
export type UnsortedSegmentSumInputs = Pick<NamedTensorInfoMap, 'x' | 'segmentIds'>;
export interface UnsortedSegmentSumAttrs {
    numSegments: number;
}
export declare const UpperBound = "UpperBound";
export type UpperBoundInputs = Pick<NamedTensorInfoMap, 'sortedSequence' | 'values'>;
export declare const ZerosLike = "ZerosLike";
export type ZerosLikeInputs = UnaryInputs;
/**
 * TensorFlow.js-only kernels
 */
export declare const Step = "Step";
export type StepInputs = UnaryInputs;
export interface StepAttrs {
    alpha: number;
}
export declare const FromPixels = "FromPixels";
export interface FromPixelsInputs {
    pixels: PixelData | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
}
export interface FromPixelsAttrs {
    numChannels: number;
}
export declare const RotateWithOffset = "RotateWithOffset";
export type RotateWithOffsetInputs = Pick<NamedTensorInfoMap, 'image'>;
export interface RotateWithOffsetAttrs {
    radians: number;
    fillValue: number | [number, number, number];
    center: number | [number, number];
}
export declare const _FusedMatMul = "_FusedMatMul";
export interface _FusedMatMulInputs extends NamedTensorInfoMap {
    a: TensorInfo;
    b: TensorInfo;
    bias?: TensorInfo;
    preluActivationWeights?: TensorInfo;
}
export interface _FusedMatMulAttrs {
    transposeA: boolean;
    transposeB: boolean;
    activation: Activation;
    leakyreluAlpha?: number;
}
export declare const FusedConv2D = "FusedConv2D";
export interface FusedConv2DInputs extends NamedTensorInfoMap {
    x: TensorInfo;
    filter: TensorInfo;
    bias?: TensorInfo;
    preluActivationWeights?: TensorInfo;
}
export interface FusedConv2DAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dataFormat: 'NHWC' | 'NCHW';
    dilations: [number, number] | number;
    dimRoundingMode: 'floor' | 'round' | 'ceil';
    activation: Activation;
    leakyreluAlpha?: number;
}
export declare const FusedDepthwiseConv2D = "FusedDepthwiseConv2D";
export interface FusedDepthwiseConv2DInputs extends NamedTensorInfoMap {
    x: TensorInfo;
    filter: TensorInfo;
    bias?: TensorInfo;
    preluActivationWeights?: TensorInfo;
}
export interface FusedDepthwiseConv2DAttrs {
    strides: [number, number] | number;
    pad: 'valid' | 'same' | number | ExplicitPadding;
    dataFormat: 'NHWC' | 'NCHW';
    dilations: [number, number] | number;
    dimRoundingMode: 'floor' | 'round' | 'ceil';
    activation: Activation;
    leakyreluAlpha?: number;
}
