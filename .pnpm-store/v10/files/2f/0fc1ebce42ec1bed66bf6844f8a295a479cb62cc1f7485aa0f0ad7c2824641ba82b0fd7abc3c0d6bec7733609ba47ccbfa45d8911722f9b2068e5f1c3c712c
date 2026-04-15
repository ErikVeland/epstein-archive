/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import { Scalar, Tensor } from '@tensorflow/tfjs';
import { NodeJSKernelBackend } from './nodejs_kernel_backend';
export declare class SummaryFileWriter {
    private readonly resourceHandle;
    backend: NodeJSKernelBackend;
    constructor(resourceHandle: Tensor);
    /**
     * Write a scalar summary.
     *
     * @param name A name of the summary. The summary tag for TensorBoard will be
     *   this name.
     * @param value A real numeric scalar value, as `tf.Scalar` or a JavaScript
     *   `number`.
     * @param step Required `int64`-castable, monotonically-increasing step value.
     * @param description Optional long-form description for this summary, as a
     *   `string`. *Not implemented yet*.
     */
    scalar(name: string, value: Scalar | number, step: number, description?: string): void;
    /**
     * Write a histogram summary, for later analysis in TensorBoard's 'Histograms'
     * and 'Distributions' dashboards (data written using this API will appear in
     * both places). Like `SummaryFileWriter.scalar` points, each histogram is
     * associated with a `step` and a `name`. All the histograms with the same
     * `name` constitute a time series of histograms.
     *
     * The histogram is calculated over all the elements of the given `Tensor`
     * without regard to its shape or rank.
     *
     * @param name  A name for this summary. The summary tag used for TensorBoard
     *     will be this name.
     * @param data  A Tensor of any shape. The histogram is computed over its
     *     elements, which must be castable to `float32`.
     * @param step  Monotonically-increasing step value.
     * @param buckets  Optional positive `number`. The output will have this many
     *     buckets, except in two edge cases. If there is no data, then there are
     *     no buckets. If there is data but all points have the same value, then
     *     there is one bucket whose left and right endpoints are the same.
     * @param description Optional long-form description for this summary, as a
     *    `string`. Markdown is supported. Defaults to empty.
     */
    histogram(name: string, data: Tensor, step: number, buckets?: number, description?: string): void;
    /**
     * Force summary writer to send all buffered data to storage.
     */
    flush(): void;
}
/**
 * Create a summary file writer for TensorBoard.
 *
 * Example:
 * ```js
 * const tf = require('@tensorflow/tfjs-node');
 *
 * const summaryWriter = tf.node.summaryFileWriter('/tmp/tfjs_tb_logdir');
 *
 * for (let step = 0; step < 100; ++step) {
 *  summaryWriter.scalar('dummyValue', Math.sin(2 * Math.PI * step / 8), step);
 * }
 * ```
 *
 * @param logdir Log directory in which the summary data will be written.
 * @param maxQueue Maximum queue length (default: `10`).
 * @param flushMillis Flush every __ milliseconds (default: `120e3`, i.e,
 *   `120` seconds).
 * @param filenameSuffix Suffix of the protocol buffer file names to be
 *   written in the `logdir` (default: `.v2`).
 * @returns An instance of `SummaryFileWriter`.
 *
 * @doc {heading: 'TensorBoard', namespace: 'node'}
 */
export declare function summaryFileWriter(logdir: string, maxQueue?: number, flushMillis?: number, filenameSuffix?: string): SummaryFileWriter;
