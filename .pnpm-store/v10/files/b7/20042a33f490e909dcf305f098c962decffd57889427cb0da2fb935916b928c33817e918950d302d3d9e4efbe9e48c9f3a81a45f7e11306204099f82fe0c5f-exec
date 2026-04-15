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
import { NotImplementedError } from '../../../errors';
import { Task } from './task';
/**
 *  Base class for Generative Task models.
 */
class GenerativeTask extends Task {
    compile(args) {
        throw new NotImplementedError();
    }
    /**
     * Run the generation on a single batch of input.
     */
    generateStep(inputs, endTokenId) {
        throw new NotImplementedError();
    }
    /**
     * Create or return the compiled generation function.
     */
    makeGenerateFunction() {
        throw new NotImplementedError();
    }
    /**
     * Normalize user input to the generate function.
     *
     * This function converts all inputs to tensors, adds a batch dimension if
     * necessary, and returns a iterable "dataset like" object.
     */
    normalizeGenerateInputs(inputs) {
        throw new NotImplementedError();
    }
    /**
     * Normalize user output from the generate function.
     *
     * This function converts all output to numpy (for integer output), or
     * python strings (for string output). If a batch dimension was added to
     * the input, it is removed from the output (so generate can be string in,
     * string out).
     */
    normalizeGenerateOutputs(outputs, inputIsScalar) {
        throw new NotImplementedError();
    }
    /**
     * Generate text given prompt `inputs`.
     *
     * This method generates text based on given `inputs`. The sampling method
     * used for generation can be set via the `compile()` method.
     *
     * `inputs` will be handled as a single batch.
     *
     * If a `preprocessor` is attached to the model, `inputs` will be
     * preprocessed inside the `generate()` function and should match the
     * structure expected by the `preprocessor` layer (usually raw strings).
     * If a `preprocessor` is not attached, inputs should match the structure
     * expected by the `backbone`. See the example usage above for a
     * demonstration of each.
     *
     * @param inputs tensor data. If a `preprocessor` is attached to the model,
     *  `inputs` should match the structure expected by the `preprocessor` layer.
     *  If a `preprocessor` is not attached, `inputs` should match the structure
     *  expected the the `backbone` model.
     * @param maxLength Integer. The max length of the generated sequence.
     *  Will default to the max configured `sequenceLength` of the
     *  `preprocessor`. If `preprocessor` is `null`, `inputs` should be
     *  should be padded to the desired maximum length and this argument
     *  will be ignored.
     */
    generate(inputs, maxLength) {
        throw new NotImplementedError();
    }
}
/** @nocollapse */
GenerativeTask.className = 'GenerativeTask';
export { GenerativeTask };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGl2ZV90YXNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9ubHAvbW9kZWxzL2dlbmVyYXRpdmVfdGFzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFTSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUd0RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBSzlCOztHQUVHO0FBQ0gsTUFBYSxjQUFlLFNBQVEsSUFBSTtJQU03QixPQUFPLENBQUMsSUFBc0I7UUFDckMsTUFBTSxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWSxDQUNWLE1BQXNCLEVBQ3RCLFVBQWtCO1FBRWxCLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7T0FFRztJQUNILG9CQUFvQjtRQUNsQixNQUFNLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDTyx1QkFBdUIsQ0FBQyxNQUFjO1FBQzlDLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ08sd0JBQXdCLENBQ2hDLE9BQWUsRUFDZixhQUFzQjtRQUV0QixNQUFNLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXdCRztJQUNILFFBQVEsQ0FBQyxNQUFjLEVBQUUsU0FBa0I7UUFDekMsTUFBTSxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbEMsQ0FBQzs7QUE5RUQsa0JBQWtCO0FBQ0Ysd0JBQVMsR0FBRyxnQkFBZ0IsQ0FBQztTQUZsQyxjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqICBCYXNlIGNsYXNzIGZvciBHZW5lcmF0aXZlIFRhc2sgbW9kZWxzLlxuICovXG5cbi8qIE9yaWdpbmFsIHNvdXJjZToga2VyYXNfbmxwL21vZGVscy9nZW5lcmF0aXZlX3Rhc2sucHkgKi9cbmltcG9ydCB7IE5hbWVkVGVuc29yTWFwLCBUZW5zb3IgfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBOb3RJbXBsZW1lbnRlZEVycm9yIH0gZnJvbSAnLi4vLi4vLi4vZXJyb3JzJztcbmltcG9ydCB7IE1vZGVsQ29tcGlsZUFyZ3MgfSBmcm9tICcuLi8uLi8uLi9lbmdpbmUvdHJhaW5pbmcnO1xuXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSAnLi90YXNrJztcblxuZXhwb3J0IHR5cGUgR2VuZXJhdGVGbiA9XG4gIChpbnB1dHM6IE5hbWVkVGVuc29yTWFwLCBlbmRUb2tlbklkPzogbnVtYmVyKSA9PiBOYW1lZFRlbnNvck1hcDtcblxuLyoqXG4gKiAgQmFzZSBjbGFzcyBmb3IgR2VuZXJhdGl2ZSBUYXNrIG1vZGVscy5cbiAqL1xuZXhwb3J0IGNsYXNzIEdlbmVyYXRpdmVUYXNrIGV4dGVuZHMgVGFzayB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgY2xhc3NOYW1lID0gJ0dlbmVyYXRpdmVUYXNrJztcblxuICBwcm90ZWN0ZWQgZ2VuZXJhdGVGdW5jdGlvbjogR2VuZXJhdGVGbjtcblxuICBvdmVycmlkZSBjb21waWxlKGFyZ3M6IE1vZGVsQ29tcGlsZUFyZ3MpOiB2b2lkIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biB0aGUgZ2VuZXJhdGlvbiBvbiBhIHNpbmdsZSBiYXRjaCBvZiBpbnB1dC5cbiAgICovXG4gIGdlbmVyYXRlU3RlcChcbiAgICBpbnB1dHM6IE5hbWVkVGVuc29yTWFwLFxuICAgIGVuZFRva2VuSWQ6IG51bWJlclxuICApOiBOYW1lZFRlbnNvck1hcCB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3IgcmV0dXJuIHRoZSBjb21waWxlZCBnZW5lcmF0aW9uIGZ1bmN0aW9uLlxuICAgKi9cbiAgbWFrZUdlbmVyYXRlRnVuY3Rpb24oKTogR2VuZXJhdGVGbiB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3JtYWxpemUgdXNlciBpbnB1dCB0byB0aGUgZ2VuZXJhdGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gY29udmVydHMgYWxsIGlucHV0cyB0byB0ZW5zb3JzLCBhZGRzIGEgYmF0Y2ggZGltZW5zaW9uIGlmXG4gICAqIG5lY2Vzc2FyeSwgYW5kIHJldHVybnMgYSBpdGVyYWJsZSBcImRhdGFzZXQgbGlrZVwiIG9iamVjdC5cbiAgICovXG4gIHByb3RlY3RlZCBub3JtYWxpemVHZW5lcmF0ZUlucHV0cyhpbnB1dHM6IFRlbnNvcik6IFtUZW5zb3IsIGJvb2xlYW5dIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vcm1hbGl6ZSB1c2VyIG91dHB1dCBmcm9tIHRoZSBnZW5lcmF0ZSBmdW5jdGlvbi5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBjb252ZXJ0cyBhbGwgb3V0cHV0IHRvIG51bXB5IChmb3IgaW50ZWdlciBvdXRwdXQpLCBvclxuICAgKiBweXRob24gc3RyaW5ncyAoZm9yIHN0cmluZyBvdXRwdXQpLiBJZiBhIGJhdGNoIGRpbWVuc2lvbiB3YXMgYWRkZWQgdG9cbiAgICogdGhlIGlucHV0LCBpdCBpcyByZW1vdmVkIGZyb20gdGhlIG91dHB1dCAoc28gZ2VuZXJhdGUgY2FuIGJlIHN0cmluZyBpbixcbiAgICogc3RyaW5nIG91dCkuXG4gICAqL1xuICBwcm90ZWN0ZWQgbm9ybWFsaXplR2VuZXJhdGVPdXRwdXRzKFxuICAgIG91dHB1dHM6IFRlbnNvcixcbiAgICBpbnB1dElzU2NhbGFyOiBib29sZWFuXG4gICk6IFRlbnNvciB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0ZXh0IGdpdmVuIHByb21wdCBgaW5wdXRzYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgZ2VuZXJhdGVzIHRleHQgYmFzZWQgb24gZ2l2ZW4gYGlucHV0c2AuIFRoZSBzYW1wbGluZyBtZXRob2RcbiAgICogdXNlZCBmb3IgZ2VuZXJhdGlvbiBjYW4gYmUgc2V0IHZpYSB0aGUgYGNvbXBpbGUoKWAgbWV0aG9kLlxuICAgKlxuICAgKiBgaW5wdXRzYCB3aWxsIGJlIGhhbmRsZWQgYXMgYSBzaW5nbGUgYmF0Y2guXG4gICAqXG4gICAqIElmIGEgYHByZXByb2Nlc3NvcmAgaXMgYXR0YWNoZWQgdG8gdGhlIG1vZGVsLCBgaW5wdXRzYCB3aWxsIGJlXG4gICAqIHByZXByb2Nlc3NlZCBpbnNpZGUgdGhlIGBnZW5lcmF0ZSgpYCBmdW5jdGlvbiBhbmQgc2hvdWxkIG1hdGNoIHRoZVxuICAgKiBzdHJ1Y3R1cmUgZXhwZWN0ZWQgYnkgdGhlIGBwcmVwcm9jZXNzb3JgIGxheWVyICh1c3VhbGx5IHJhdyBzdHJpbmdzKS5cbiAgICogSWYgYSBgcHJlcHJvY2Vzc29yYCBpcyBub3QgYXR0YWNoZWQsIGlucHV0cyBzaG91bGQgbWF0Y2ggdGhlIHN0cnVjdHVyZVxuICAgKiBleHBlY3RlZCBieSB0aGUgYGJhY2tib25lYC4gU2VlIHRoZSBleGFtcGxlIHVzYWdlIGFib3ZlIGZvciBhXG4gICAqIGRlbW9uc3RyYXRpb24gb2YgZWFjaC5cbiAgICpcbiAgICogQHBhcmFtIGlucHV0cyB0ZW5zb3IgZGF0YS4gSWYgYSBgcHJlcHJvY2Vzc29yYCBpcyBhdHRhY2hlZCB0byB0aGUgbW9kZWwsXG4gICAqICBgaW5wdXRzYCBzaG91bGQgbWF0Y2ggdGhlIHN0cnVjdHVyZSBleHBlY3RlZCBieSB0aGUgYHByZXByb2Nlc3NvcmAgbGF5ZXIuXG4gICAqICBJZiBhIGBwcmVwcm9jZXNzb3JgIGlzIG5vdCBhdHRhY2hlZCwgYGlucHV0c2Agc2hvdWxkIG1hdGNoIHRoZSBzdHJ1Y3R1cmVcbiAgICogIGV4cGVjdGVkIHRoZSB0aGUgYGJhY2tib25lYCBtb2RlbC5cbiAgICogQHBhcmFtIG1heExlbmd0aCBJbnRlZ2VyLiBUaGUgbWF4IGxlbmd0aCBvZiB0aGUgZ2VuZXJhdGVkIHNlcXVlbmNlLlxuICAgKiAgV2lsbCBkZWZhdWx0IHRvIHRoZSBtYXggY29uZmlndXJlZCBgc2VxdWVuY2VMZW5ndGhgIG9mIHRoZVxuICAgKiAgYHByZXByb2Nlc3NvcmAuIElmIGBwcmVwcm9jZXNzb3JgIGlzIGBudWxsYCwgYGlucHV0c2Agc2hvdWxkIGJlXG4gICAqICBzaG91bGQgYmUgcGFkZGVkIHRvIHRoZSBkZXNpcmVkIG1heGltdW0gbGVuZ3RoIGFuZCB0aGlzIGFyZ3VtZW50XG4gICAqICB3aWxsIGJlIGlnbm9yZWQuXG4gICAqL1xuICBnZW5lcmF0ZShpbnB1dHM6IFRlbnNvciwgbWF4TGVuZ3RoPzogbnVtYmVyKSB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxufVxuIl19