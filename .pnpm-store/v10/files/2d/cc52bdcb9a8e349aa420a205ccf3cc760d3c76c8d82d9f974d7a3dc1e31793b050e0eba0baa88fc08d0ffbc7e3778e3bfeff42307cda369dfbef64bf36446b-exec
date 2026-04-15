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
import { ENGINE } from '../../engine';
import { StaticRegexReplace } from '../../kernel_names';
import { convertToTensor } from '../../tensor_util_env';
import { op } from '../operation';
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
function staticRegexReplace_(input, pattern, rewrite, replaceGlobal = true) {
    const $input = convertToTensor(input, 'input', 'staticRegexReplace', 'string');
    const attrs = { pattern, rewrite, replaceGlobal };
    return ENGINE.runKernel(StaticRegexReplace, { x: $input }, attrs);
}
export const staticRegexReplace = /* @__PURE__ */ op({ staticRegexReplace_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljX3JlZ2V4X3JlcGxhY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWNvcmUvc3JjL29wcy9zdHJpbmcvc3RhdGljX3JlZ2V4X3JlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNwQyxPQUFPLEVBQUMsa0JBQWtCLEVBQTBCLE1BQU0sb0JBQW9CLENBQUM7QUFHL0UsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXRELE9BQU8sRUFBQyxFQUFFLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFaEM7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNILFNBQVMsbUJBQW1CLENBQzFCLEtBQTBCLEVBQUUsT0FBZSxFQUFFLE9BQWUsRUFDNUQsYUFBYSxHQUFDLElBQUk7SUFFbEIsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQ3BDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sS0FBSyxHQUE0QixFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFDLENBQUM7SUFDekUsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLEVBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBQyxFQUMvQixLQUFnQyxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUMsRUFBQyxtQkFBbUIsRUFBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7RU5HSU5FfSBmcm9tICcuLi8uLi9lbmdpbmUnO1xuaW1wb3J0IHtTdGF0aWNSZWdleFJlcGxhY2UsIFN0YXRpY1JlZ2V4UmVwbGFjZUF0dHJzfSBmcm9tICcuLi8uLi9rZXJuZWxfbmFtZXMnO1xuaW1wb3J0IHtOYW1lZEF0dHJNYXB9IGZyb20gJy4uLy4uL2tlcm5lbF9yZWdpc3RyeSc7XG5pbXBvcnQge1RlbnNvcn0gZnJvbSAnLi4vLi4vdGVuc29yJztcbmltcG9ydCB7Y29udmVydFRvVGVuc29yfSBmcm9tICcuLi8uLi90ZW5zb3JfdXRpbF9lbnYnO1xuaW1wb3J0IHtUZW5zb3JMaWtlfSBmcm9tICcuLi8uLi90eXBlcyc7XG5pbXBvcnQge29wfSBmcm9tICcuLi9vcGVyYXRpb24nO1xuXG4vKipcbiAqIFJlcGxhY2UgdGhlIG1hdGNoIG9mIGEgYHBhdHRlcm5gIGluIGBpbnB1dGAgd2l0aCBgcmV3cml0ZWAuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IHJlc3VsdCA9IHRmLnN0cmluZy5zdGF0aWNSZWdleFJlcGxhY2UoXG4gKiAgICAgWydmb3JtYXQgICAgICAgdGhpcyAgIHNwYWNpbmcgICAgICBiZXR0ZXInXSwgJyArJywgJyAnKTtcbiAqIHJlc3VsdC5wcmludCgpOyAvLyBbJ2Zvcm1hdCB0aGlzIHNwYWNpbmcgYmV0dGVyJ11cbiAqIGBgYFxuICogQHBhcmFtIGlucHV0OiBBIFRlbnNvciBvZiB0eXBlIHN0cmluZy4gVGhlIHRleHQgdG8gYmUgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHBhdHRlcm46IEEgc3RyaW5nLiBUaGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoIHRoZSBpbnB1dC5cbiAqIEBwYXJhbSByZXdyaXRlOiBBIHN0cmluZy4gVGhlIHJld3JpdGUgdG8gYmUgYXBwbGllZCB0byB0aGUgbWF0Y2hlZFxuICogICAgIGV4cHJlc3Npb24uXG4gKiBAcGFyYW0gcmVwbGFjZUdsb2JhbDogQW4gb3B0aW9uYWwgYm9vbC4gRGVmYXVsdHMgdG8gVHJ1ZS4gSWYgVHJ1ZSwgdGhlXG4gKiAgICAgcmVwbGFjZW1lbnQgaXMgZ2xvYmFsLCBvdGhlcndpc2UgdGhlIHJlcGxhY2VtZW50IGlzIGRvbmUgb25seSBvbiB0aGVcbiAqICAgICBmaXJzdCBtYXRjaC5cbiAqIEByZXR1cm4gQSBUZW5zb3Igb2YgdHlwZSBzdHJpbmcuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ09wZXJhdGlvbnMnLCBzdWJoZWFkaW5nOiAnU3RyaW5nJ31cbiAqL1xuZnVuY3Rpb24gc3RhdGljUmVnZXhSZXBsYWNlXyhcbiAgaW5wdXQ6IFRlbnNvciB8IFRlbnNvckxpa2UsIHBhdHRlcm46IHN0cmluZywgcmV3cml0ZTogc3RyaW5nLFxuICByZXBsYWNlR2xvYmFsPXRydWUpOiBUZW5zb3Ige1xuXG4gIGNvbnN0ICRpbnB1dCA9IGNvbnZlcnRUb1RlbnNvcihpbnB1dCwgJ2lucHV0JywgJ3N0YXRpY1JlZ2V4UmVwbGFjZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyaW5nJyk7XG4gIGNvbnN0IGF0dHJzOiBTdGF0aWNSZWdleFJlcGxhY2VBdHRycyA9IHtwYXR0ZXJuLCByZXdyaXRlLCByZXBsYWNlR2xvYmFsfTtcbiAgcmV0dXJuIEVOR0lORS5ydW5LZXJuZWwoU3RhdGljUmVnZXhSZXBsYWNlLCB7eDogJGlucHV0fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgYXMgdW5rbm93biBhcyBOYW1lZEF0dHJNYXApO1xufVxuXG5leHBvcnQgY29uc3Qgc3RhdGljUmVnZXhSZXBsYWNlID0gLyogQF9fUFVSRV9fICovIG9wKHtzdGF0aWNSZWdleFJlcGxhY2VffSk7XG4iXX0=