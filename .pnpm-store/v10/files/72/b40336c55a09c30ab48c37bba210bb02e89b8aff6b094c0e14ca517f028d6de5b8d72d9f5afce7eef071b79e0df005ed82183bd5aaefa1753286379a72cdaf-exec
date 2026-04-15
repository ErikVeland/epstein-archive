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
/// <amd-module name="@tensorflow/tfjs-core/dist/ops/string/static_regex_replace" />
import { Tensor } from '../../tensor';
import { TensorLike } from '../../types';
/**
 * Replace the match of a `pattern` in `input` with `rewrite`.
 *
 * ```js
 * const result = tf.string.staticRegexReplace(
 *     ['format       this   spacing      better'], ' +', ' ');
 * result.print(); // ['format this spacing better']
 * ```
 * @param input: A Tensor of type string. The text to be processed.
 * @param pattern: A string. The regular expression to match the input.
 * @param rewrite: A string. The rewrite to be applied to the matched
 *     expression.
 * @param replaceGlobal: An optional bool. Defaults to True. If True, the
 *     replacement is global, otherwise the replacement is done only on the
 *     first match.
 * @return A Tensor of type string.
 *
 * @doc {heading: 'Operations', subheading: 'String'}
 */
declare function staticRegexReplace_(input: Tensor | TensorLike, pattern: string, rewrite: string, replaceGlobal?: boolean): Tensor;
export declare const staticRegexReplace: typeof staticRegexReplace_;
export {};
