/// <amd-module name="@tensorflow/tfjs-core/dist/io/composite_array_buffer" />
/**
 * @license
 * Copyright 2023 Google LLC. All Rights Reserved.
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
import { TypedArray } from '../types';
/**
 * Wraps a list of ArrayBuffers into a `slice()`-able object without allocating
 * a large ArrayBuffer.
 *
 * Allocating large ArrayBuffers (~2GB) can be unstable on Chrome. TFJS loads
 * its weights as a list of (usually) 4MB ArrayBuffers and then slices the
 * weight tensors out of them. For small models, it's safe to concatenate all
 * the weight buffers into a single ArrayBuffer and then slice the weight
 * tensors out of it, but for large models, a different approach is needed.
 */
export declare class CompositeArrayBuffer {
    private shards;
    private previousShardIndex;
    private bufferUniformSize?;
    readonly byteLength: number;
    /**
     * Concatenate a number of ArrayBuffers into one.
     *
     * @param buffers An array of ArrayBuffers to concatenate, or a single
     *     ArrayBuffer.
     * @returns Result of concatenating `buffers` in order.
     */
    static join(buffers?: ArrayBuffer[] | ArrayBuffer): ArrayBuffer;
    constructor(buffers?: ArrayBuffer | ArrayBuffer[] | TypedArray | TypedArray[]);
    slice(start?: number, end?: number): ArrayBuffer;
    /**
     * Get the index of the shard that contains the byte at `byteIndex`.
     */
    private findShardForByte;
}
/**
 * Search for an element of a sorted array.
 *
 * @param sortedArray The sorted array to search
 * @param compare A function to compare the current value against the searched
 *     value. Return 0 on a match, negative if the searched value is less than
 *     the value passed to the function, and positive if the searched value is
 *     greater than the value passed to the function.
 * @returns The index of the element, or -1 if it's not in the array.
 */
export declare function search<T>(sortedArray: T[], compare: (t: T) => number): number;
