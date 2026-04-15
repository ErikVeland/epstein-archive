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
/// <amd-module name="@tensorflow/tfjs-backend-webgl/dist/kernels/BitwiseAnd" />
import { BitwiseAndInputs, KernelConfig, TensorInfo } from '@tensorflow/tfjs-core';
import { MathBackendWebGL } from '../backend_webgl';
export declare const BITWISEAND = "\n  int r = int(a.r) & int(b.r);\n  int g = int(a.g) & int(b.g);\n  int rb = int(a.b) & int(b.b);\n  int ra = int(a.a) & int(b.a);\n  return vec4(r, g, rb, ra);\n";
export declare const BITWISEAND_UNPACKED = "\n  return float(int(a.r) & int(b.r));\n";
export declare function bitwiseAnd(args: {
    inputs: BitwiseAndInputs;
    backend: MathBackendWebGL;
}): TensorInfo;
export declare const bitwiseAndConfig: KernelConfig;
