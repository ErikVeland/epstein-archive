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
/**
 *  TFJS-based einsum dense layer.
 */
/* Original source: keras/layers/core/einsum_dense.py */
import { einsum, serialization, tidy } from '@tensorflow/tfjs-core';
import { getActivation, serializeActivation } from '../../activations';
import { getConstraint, serializeConstraint } from '../../constraints';
import { Layer } from '../../engine/topology';
import { ValueError } from '../../errors';
import { getInitializer, serializeInitializer } from '../../initializers';
import { getRegularizer, serializeRegularizer } from '../../regularizers';
/**
 * Analyzes an einsum string to determine the required weight shape.
 */
export function analyzeEinsumString(equation, biasAxes, inputShape, outputShape) {
    const dotReplacedString = equation.replace(/\.\.\./g, '0');
    // This is the case where no ellipses are present in the string.
    let splitString = dotReplacedString.match(/([a-zA-Z]+),([a-zA-Z]+)->([a-zA-Z]+)/);
    if (splitString) {
        return analyzeSplitString(splitString, biasAxes, inputShape, outputShape);
    }
    // This is the case where ellipses are present on the left.
    splitString =
        dotReplacedString.match(/0([a-zA-Z]+),([a-zA-Z]+)->0([a-zA-Z]+)/);
    if (splitString) {
        return analyzeSplitString(splitString, biasAxes, inputShape, outputShape, true);
    }
    // This is the case where ellipses are present on the right.
    splitString =
        dotReplacedString.match(/([a-zA-Z]{2,})0,([a-zA-Z]+)->([a-zA-Z]+)0/);
    if (splitString) {
        return analyzeSplitString(splitString, biasAxes, inputShape, outputShape);
    }
    throw new ValueError(`Invalid einsum equation '${equation}'. Equations must be in the form ` +
        '[X],[Y]->[Z], ...[X],[Y]->...[Z], or [X]...,[Y]->[Z]....');
}
/**
 * Analyze an pre-split einsum string to find the weight shape.
 */
export function analyzeSplitString(splitString, biasAxes, inputShape, outputShape, leftElided = false) {
    const inputSpec = splitString[1];
    const weightSpec = splitString[2];
    const outputSpec = splitString[3];
    const elided = inputShape.length - inputSpec.length;
    const newOutputShape = Array.isArray(outputShape) ?
        outputShape.slice() : [outputShape];
    newOutputShape.unshift(inputShape[0]);
    if (elided > 0 && leftElided) {
        for (let i = 1; i < elided; i++) {
            // We already inserted the 0th input dimension at dim 0, so we need
            // to start at location 1 here.
            newOutputShape.splice(1, 0, inputShape[i]);
        }
    }
    else if (elided > 0 && !leftElided) {
        for (let i = inputShape.length - elided; i < inputShape.length; i++) {
            newOutputShape.push(inputShape[i]);
        }
    }
    const inputSpecArr = Array.from(inputSpec);
    const outputSpecArr = Array.from(outputSpec);
    let inputDimMap, outputDimMap;
    if (leftElided) {
        // If we have beginning dimensions elided, we need to use negative
        // indexing to determine where in the input dimension our values are.
        inputDimMap = new Map(inputSpecArr.map((dim, i) => {
            // This converts any negative indices to positive ones.
            const idx = i + elided - inputShape.length;
            const positiveIdx = ((idx % inputShape.length) + inputShape.length) % inputShape.length;
            return [dim, positiveIdx];
        }));
        // Because we've constructed the full output shape already, we don't need
        // to do negative indexing.
        outputDimMap = new Map(outputSpecArr.map((dim, i) => [dim, i + elided]));
    }
    else {
        inputDimMap = new Map(inputSpecArr.map((dim, i) => [dim, i]));
        outputDimMap = new Map(outputSpecArr.map((dim, i) => [dim, i]));
    }
    for (const dim of inputSpec) {
        const inputShapeAtDim = inputShape[inputDimMap.get(dim)];
        if (outputDimMap.has(dim)) {
            const outputShapeAtDim = newOutputShape[outputDimMap.get(dim)];
            if (outputShapeAtDim !== null && outputShapeAtDim !== inputShapeAtDim) {
                throw new ValueError(`Input shape and output shape do not match at shared dimension ` +
                    `'${dim}'. Input shape is ${inputShapeAtDim}, and output shape ` +
                    `is ${outputShapeAtDim}.`);
            }
        }
    }
    for (const dim of outputSpec) {
        if (!inputSpec.includes(dim) && !weightSpec.includes(dim)) {
            throw new ValueError(`Dimension '${dim}' was specified in the output '${outputSpec}' ` +
                `but has no corresponding dimension in the input spec ` +
                `'${inputSpec}' or weight spec '${weightSpec}'`);
        }
    }
    const weightShape = [];
    for (const dim of weightSpec) {
        if (inputDimMap.has(dim)) {
            weightShape.push(inputShape[inputDimMap.get(dim)]);
        }
        else if (outputDimMap.has(dim)) {
            weightShape.push(newOutputShape[outputDimMap.get(dim)]);
        }
        else {
            throw new ValueError(`Weight dimension '${dim}' did not have a match in either the ` +
                `input spec '${inputSpec}' or the output spec '${outputSpec}'. For ` +
                `this layer, the weight must be fully specified.`);
        }
    }
    let biasShape;
    if (biasAxes != null) {
        const numLeftElided = leftElided ? elided : 0;
        const idxMap = {};
        for (let i = 0; i < outputSpec.length; i++) {
            idxMap[outputSpec[i]] = newOutputShape[i + numLeftElided];
        }
        for (const char of biasAxes) {
            if (!outputSpec.includes(char)) {
                throw new ValueError(`Bias dimension '${char}' was requested, but is not part of the ` +
                    `output spec '${outputSpec}'`);
            }
        }
        const firstBiasLocation = Math.min(...biasAxes.split('').map(char => outputSpec.indexOf(char)));
        const biasOutputSpec = outputSpec.slice(firstBiasLocation);
        biasShape = biasOutputSpec.split('').map(char => biasAxes.includes(char) ? idxMap[char] : 1);
        if (!leftElided) {
            for (let i = 0; i < elided; i++) {
                biasShape.push(1);
            }
        }
    }
    else {
        biasShape = null;
    }
    return [weightShape, biasShape, newOutputShape];
}
/**
 * A layer that uses `tf.einsum` as the backing computation.
 *
 * This layer can perform einsum calculations of arbitrary dimensionality.
 *
 * Examples:
 *
 * **Biased dense layer with einsums**
 *
 * This example shows how to instantiate a standard Keras dense layer using
 * einsum operations. This example is equivalent to
 * tf.layers.Dense({units: 64, useBias: true})`.
 *
 * const layer = new EinsumDense({
 *    equation: "ab,bc->ac", outputShape: 4, biasAxes: "c"});
 * const inputTensor = tf.input({shape: [32]});
 * const outputTensor = layer.call(inputTensor);
 * console.log(outputTensor);  // [null, 64]
 *
 * **Applying a dense layer to a sequence**
 *
 * This example shows how to instantiate a layer that applies the same dense
 * operation to every element in a sequence. Here, the `outputShape` has two
 * values (since there are two non-batch dimensions in the output); the first
 * dimension in the `outputShape` is `null`, because the sequence dimension
 * `b` has an unknown shape.
 *
 * ```js
 * const layer = new EinsumDense({
 *    equation: "abc,cd->abd", outputShape: [null, 64], biasAxes: "d"});
 * const inputTensor = tf.input({shape: [32, 128]});
 * const outputTensor = layer.call(inputTensor);
 * console.log(outputTensor);  // [null, 32, 64]
 * ```
 *
 * **Applying a dense layer to a sequence using ellipses**
 *
 * This example shows how to instantiate a layer that applies the same dense
 * operation to every element in a sequence, but uses the ellipsis notation
 * instead of specifying the batch and sequence dimensions.
 *
 * Because we are using ellipsis notation and have specified only one axis, the
 * `outputShape` arg is a single value. When instantiated in this way, the
 * layer can handle any number of sequence dimensions - including the case
 * where no sequence dimension exists.
 *
 * ```js
 * const layer = new EinsumDense({
 *    equation: "...x,xy->...y", outputShape: 64, biasAxes: "y"});
 * const inputTensor = tf.input({shape: [32, 128]});
 * const outputTensor = layer.call(inputTensor);
 * console.log(outputTensor);  // [null, 32, 64]
 * ``
 */
class EinsumDense extends Layer {
    constructor(args) {
        var _a, _b;
        super(args);
        this.equation = args.equation;
        this.biasAxes = args.biasAxes;
        this.partialOutputShape =
            Array.isArray(args.outputShape) ? args.outputShape : [args.outputShape];
        this.activation = getActivation(args.activation);
        this.kernelInitializer = getInitializer((_a = args.kernelInitializer) !== null && _a !== void 0 ? _a : 'glorotUniform');
        this.biasInitializer = getInitializer((_b = args.biasInitializer) !== null && _b !== void 0 ? _b : 'zeros');
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.biasConstraint = getConstraint(args.biasConstraint);
    }
    get kernel() {
        return this._kernel;
    }
    get bias() {
        return this._bias;
    }
    build(inputShape) {
        const [kernelShape, biasShape, fullOutputShape] = analyzeEinsumString(this.equation, this.biasAxes, inputShape, this.partialOutputShape);
        this.fullOutputShape = fullOutputShape;
        this._kernel = this.addWeight('kernel', kernelShape, this.dtype, this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        if (biasShape != null) {
            this._bias = this.addWeight('bias', biasShape, this.dtype, this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        else {
            this._bias = null;
        }
        super.build(inputShape);
    }
    computeOutputShape(_) {
        return this.fullOutputShape;
    }
    getConfig() {
        const config = {
            outputShape: this.partialOutputShape,
            equation: this.equation,
            activation: serializeActivation(this.activation),
            biasAxes: this.biasAxes,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            biasInitializer: serializeInitializer(this.biasInitializer),
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint),
            biasConstraint: serializeConstraint(this.biasConstraint),
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = Array.isArray(inputs) ? inputs : [inputs];
            let ret = einsum(this.equation, ...inputs, this.kernel.read());
            if (this.bias != null) {
                ret = ret.add(this.bias.read());
            }
            if (this.activation != null) {
                ret = this.activation.apply(ret);
            }
            return ret;
        });
    }
}
/** @nocollapse */
EinsumDense.className = 'EinsumDense';
export { EinsumDense };
serialization.registerClass(EinsumDense);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWluc3VtX2RlbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9ubHAvZWluc3VtX2RlbnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVIOztHQUVHO0FBRUgsd0RBQXdEO0FBQ3hELE9BQU8sRUFBb0IsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV0RixPQUFPLEVBQWMsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkYsT0FBTyxFQUFvQyxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsS0FBSyxFQUFhLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMxQyxPQUFPLEVBQXNDLGNBQWMsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRzlHLE9BQU8sRUFBc0MsY0FBYyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFJOUc7O0dBRUc7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQ2pDLFFBQWdCLEVBQ2hCLFFBQWdCLEVBQ2hCLFVBQWlCLEVBQ2pCLFdBQWtCO0lBRWxCLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFM0QsZ0VBQWdFO0lBQ2hFLElBQUksV0FBVyxHQUNiLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQ2xFLElBQUksV0FBVyxFQUFFO1FBQ2YsT0FBTyxrQkFBa0IsQ0FDdkIsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7S0FDbkQ7SUFFRCwyREFB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SSxFQUFFLENBQUMsQ0FBQzthQUNqQztZQUNELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLEVBQUU7Z0JBQzNCLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNsQztZQUNELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQTVHRCxrQkFBa0I7QUFDRixxQkFBUyxHQUFHLGFBQWEsQ0FBQztTQUYvQixXQUFXO0FBK0d4QixhQUFhLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqICBURkpTLWJhc2VkIGVpbnN1bSBkZW5zZSBsYXllci5cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzL2xheWVycy9jb3JlL2VpbnN1bV9kZW5zZS5weSAqL1xuaW1wb3J0IHsgVGVuc29yLCBUZW5zb3IyRCwgZWluc3VtLCBzZXJpYWxpemF0aW9uLCB0aWR5IH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHsgQWN0aXZhdGlvbiwgZ2V0QWN0aXZhdGlvbiwgc2VyaWFsaXplQWN0aXZhdGlvbiB9IGZyb20gJy4uLy4uL2FjdGl2YXRpb25zJztcbmltcG9ydCB7IENvbnN0cmFpbnQsIENvbnN0cmFpbnRJZGVudGlmaWVyLCBnZXRDb25zdHJhaW50LCBzZXJpYWxpemVDb25zdHJhaW50IH0gZnJvbSAnLi4vLi4vY29uc3RyYWludHMnO1xuaW1wb3J0IHsgTGF5ZXIsIExheWVyQXJncyB9IGZyb20gJy4uLy4uL2VuZ2luZS90b3BvbG9neSc7XG5pbXBvcnQgeyBWYWx1ZUVycm9yIH0gZnJvbSAnLi4vLi4vZXJyb3JzJztcbmltcG9ydCB7IEluaXRpYWxpemVyLCBJbml0aWFsaXplcklkZW50aWZpZXIsIGdldEluaXRpYWxpemVyLCBzZXJpYWxpemVJbml0aWFsaXplciB9IGZyb20gJy4uLy4uL2luaXRpYWxpemVycyc7XG5pbXBvcnQgeyBBY3RpdmF0aW9uSWRlbnRpZmllciB9IGZyb20gJy4uLy4uL2tlcmFzX2Zvcm1hdC9hY3RpdmF0aW9uX2NvbmZpZyc7XG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4uLy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHsgUmVndWxhcml6ZXIsIFJlZ3VsYXJpemVySWRlbnRpZmllciwgZ2V0UmVndWxhcml6ZXIsIHNlcmlhbGl6ZVJlZ3VsYXJpemVyIH0gZnJvbSAnLi4vLi4vcmVndWxhcml6ZXJzJztcbmltcG9ydCB7IEt3YXJncyB9IGZyb20gJy4uLy4uL3R5cGVzJztcbmltcG9ydCB7IExheWVyVmFyaWFibGUgfSBmcm9tICcuLi8uLi92YXJpYWJsZXMnO1xuXG4vKipcbiAqIEFuYWx5emVzIGFuIGVpbnN1bSBzdHJpbmcgdG8gZGV0ZXJtaW5lIHRoZSByZXF1aXJlZCB3ZWlnaHQgc2hhcGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplRWluc3VtU3RyaW5nKFxuICBlcXVhdGlvbjogc3RyaW5nLFxuICBiaWFzQXhlczogc3RyaW5nLFxuICBpbnB1dFNoYXBlOiBTaGFwZSxcbiAgb3V0cHV0U2hhcGU6IFNoYXBlXG4pOiBbU2hhcGUsIFNoYXBlLCBTaGFwZV0ge1xuICBjb25zdCBkb3RSZXBsYWNlZFN0cmluZyA9IGVxdWF0aW9uLnJlcGxhY2UoL1xcLlxcLlxcLi9nLCAnMCcpO1xuXG4gIC8vIFRoaXMgaXMgdGhlIGNhc2Ugd2hlcmUgbm8gZWxsaXBzZXMgYXJlIHByZXNlbnQgaW4gdGhlIHN0cmluZy5cbiAgbGV0IHNwbGl0U3RyaW5nID1cbiAgICBkb3RSZXBsYWNlZFN0cmluZy5tYXRjaCgvKFthLXpBLVpdKyksKFthLXpBLVpdKyktPihbYS16QS1aXSspLyk7XG4gIGlmIChzcGxpdFN0cmluZykge1xuICAgIHJldHVybiBhbmFseXplU3BsaXRTdHJpbmcoXG4gICAgICBzcGxpdFN0cmluZywgYmlhc0F4ZXMsIGlucHV0U2hhcGUsIG91dHB1dFNoYXBlKTtcbiAgfVxuXG4gIC8vIFRoaXMgaXMgdGhlIGNhc2Ugd2hlcmUgZWxsaXBzZXMgYXJlIHByZXNlbnQgb24gdGhlIGxlZnQuXG4gIHNwbGl0U3RyaW5nID1cbiAgICBkb3RSZXBsYWNlZFN0cmluZy5tYXRjaCgvMChbYS16QS1aXSspLChbYS16QS1aXSspLT4wKFthLXpBLVpdKykvKTtcbiAgaWYgKHNwbGl0U3RyaW5nKSB7XG4gICAgcmV0dXJuIGFuYWx5emVTcGxpdFN0cmluZyhcbiAgICAgIHNwbGl0U3RyaW5nLCBiaWFzQXhlcywgaW5wdXRTaGFwZSwgb3V0cHV0U2hhcGUsIHRydWUpO1xuICB9XG5cbiAgLy8gVGhpcyBpcyB0aGUgY2FzZSB3aGVyZSBlbGxpcHNlcyBhcmUgcHJlc2VudCBvbiB0aGUgcmlnaHQuXG4gIHNwbGl0U3RyaW5nID1cbiAgICBkb3RSZXBsYWNlZFN0cmluZy5tYXRjaCgvKFthLXpBLVpdezIsfSkwLChbYS16QS1aXSspLT4oW2EtekEtWl0rKTAvKTtcbiAgaWYgKHNwbGl0U3RyaW5nKSB7XG4gICAgcmV0dXJuIGFuYWx5emVTcGxpdFN0cmluZyhcbiAgICAgIHNwbGl0U3RyaW5nLCBiaWFzQXhlcywgaW5wdXRTaGFwZSwgb3V0cHV0U2hhcGUpO1xuICB9XG5cbiAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgYEludmFsaWQgZWluc3VtIGVxdWF0aW9uICcke2VxdWF0aW9ufScuIEVxdWF0aW9ucyBtdXN0IGJlIGluIHRoZSBmb3JtIGAgK1xuICAgICdbWF0sW1ldLT5bWl0sIC4uLltYXSxbWV0tPi4uLltaXSwgb3IgW1hdLi4uLFtZXS0+W1pdLi4uLidcbiAgKTtcbn1cblxuLyoqXG4gKiBBbmFseXplIGFuIHByZS1zcGxpdCBlaW5zdW0gc3RyaW5nIHRvIGZpbmQgdGhlIHdlaWdodCBzaGFwZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTcGxpdFN0cmluZyhcbiAgc3BsaXRTdHJpbmc6IFJlZ0V4cE1hdGNoQXJyYXksXG4gIGJpYXNBeGVzOiBzdHJpbmcsXG4gIGlucHV0U2hhcGU6IFNoYXBlLFxuICBvdXRwdXRTaGFwZTogU2hhcGV8bnVtYmVyLFxuICBsZWZ0RWxpZGVkID0gZmFsc2Vcbik6IFtTaGFwZSwgU2hhcGUsIFNoYXBlXSB7XG4gIGNvbnN0IGlucHV0U3BlYyA9IHNwbGl0U3RyaW5nWzFdO1xuICBjb25zdCB3ZWlnaHRTcGVjID0gc3BsaXRTdHJpbmdbMl07XG4gIGNvbnN0IG91dHB1dFNwZWMgPSBzcGxpdFN0cmluZ1szXTtcbiAgY29uc3QgZWxpZGVkID0gaW5wdXRTaGFwZS5sZW5ndGggLSBpbnB1dFNwZWMubGVuZ3RoO1xuXG4gIGNvbnN0IG5ld091dHB1dFNoYXBlOiBTaGFwZSA9IEFycmF5LmlzQXJyYXkob3V0cHV0U2hhcGUpID9cbiAgICBvdXRwdXRTaGFwZS5zbGljZSgpIDogW291dHB1dFNoYXBlXTtcbiAgbmV3T3V0cHV0U2hhcGUudW5zaGlmdChpbnB1dFNoYXBlWzBdKTtcblxuICBpZiAoZWxpZGVkID4gMCAmJiBsZWZ0RWxpZGVkKSB7XG4gICAgZm9yKGxldCBpID0gMTsgaSA8IGVsaWRlZDsgaSsrKSB7XG4gICAgICAvLyBXZSBhbHJlYWR5IGluc2VydGVkIHRoZSAwdGggaW5wdXQgZGltZW5zaW9uIGF0IGRpbSAwLCBzbyB3ZSBuZWVkXG4gICAgICAvLyB0byBzdGFydCBhdCBsb2NhdGlvbiAxIGhlcmUuXG4gICAgICBuZXdPdXRwdXRTaGFwZS5zcGxpY2UoMSwgMCwgaW5wdXRTaGFwZVtpXSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGVsaWRlZCA+IDAgJiYgIWxlZnRFbGlkZWQpIHtcbiAgICBmb3IobGV0IGkgPSBpbnB1dFNoYXBlLmxlbmd0aCAtIGVsaWRlZDsgaSA8IGlucHV0U2hhcGUubGVuZ3RoOyBpKyspIHtcbiAgICAgIG5ld091dHB1dFNoYXBlLnB1c2goaW5wdXRTaGFwZVtpXSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaW5wdXRTcGVjQXJyID0gQXJyYXkuZnJvbShpbnB1dFNwZWMpO1xuICBjb25zdCBvdXRwdXRTcGVjQXJyID0gQXJyYXkuZnJvbShvdXRwdXRTcGVjKTtcbiAgbGV0IGlucHV0RGltTWFwLCBvdXRwdXREaW1NYXA7XG5cbiAgaWYgKGxlZnRFbGlkZWQpIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGJlZ2lubmluZyBkaW1lbnNpb25zIGVsaWRlZCwgd2UgbmVlZCB0byB1c2UgbmVnYXRpdmVcbiAgICAvLyBpbmRleGluZyB0byBkZXRlcm1pbmUgd2hlcmUgaW4gdGhlIGlucHV0IGRpbWVuc2lvbiBvdXIgdmFsdWVzIGFyZS5cbiAgICBpbnB1dERpbU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KFxuICAgICAgaW5wdXRTcGVjQXJyLm1hcCgoZGltLCBpKSA9PiB7XG4gICAgICAgIC8vIFRoaXMgY29udmVydHMgYW55IG5lZ2F0aXZlIGluZGljZXMgdG8gcG9zaXRpdmUgb25lcy5cbiAgICAgICAgY29uc3QgaWR4ID0gaSArIGVsaWRlZCAtIGlucHV0U2hhcGUubGVuZ3RoO1xuICAgICAgICBjb25zdCBwb3NpdGl2ZUlkeCA9XG4gICAgICAgICAgKChpZHggJSBpbnB1dFNoYXBlLmxlbmd0aCkgKyBpbnB1dFNoYXBlLmxlbmd0aCkgJSBpbnB1dFNoYXBlLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIFtkaW0sIHBvc2l0aXZlSWR4XTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEJlY2F1c2Ugd2UndmUgY29uc3RydWN0ZWQgdGhlIGZ1bGwgb3V0cHV0IHNoYXBlIGFscmVhZHksIHdlIGRvbid0IG5lZWRcbiAgICAvLyB0byBkbyBuZWdhdGl2ZSBpbmRleGluZy5cbiAgICBvdXRwdXREaW1NYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihcbiAgICAgIG91dHB1dFNwZWNBcnIubWFwKChkaW0sIGkpID0+IFtkaW0sIGkgKyBlbGlkZWRdKVxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgaW5wdXREaW1NYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihcbiAgICAgIGlucHV0U3BlY0Fyci5tYXAoKGRpbSwgaSkgPT4gW2RpbSwgaV0pXG4gICAgKTtcbiAgICBvdXRwdXREaW1NYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihcbiAgICAgIG91dHB1dFNwZWNBcnIubWFwKChkaW0sIGkpID0+IFtkaW0sIGldKVxuICAgICk7XG4gIH1cblxuICBmb3IgKGNvbnN0IGRpbSBvZiBpbnB1dFNwZWMpIHtcbiAgICBjb25zdCBpbnB1dFNoYXBlQXREaW0gPSBpbnB1dFNoYXBlW2lucHV0RGltTWFwLmdldChkaW0pXTtcbiAgICBpZiAob3V0cHV0RGltTWFwLmhhcyhkaW0pKSB7XG4gICAgICBjb25zdCBvdXRwdXRTaGFwZUF0RGltID0gbmV3T3V0cHV0U2hhcGVbb3V0cHV0RGltTWFwLmdldChkaW0pXTtcbiAgICAgIGlmIChvdXRwdXRTaGFwZUF0RGltICE9PSBudWxsICYmIG91dHB1dFNoYXBlQXREaW0gIT09IGlucHV0U2hhcGVBdERpbSkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgSW5wdXQgc2hhcGUgYW5kIG91dHB1dCBzaGFwZSBkbyBub3QgbWF0Y2ggYXQgc2hhcmVkIGRpbWVuc2lvbiBgK1xuICAgICAgICAgIGAnJHtkaW19Jy4gSW5wdXQgc2hhcGUgaXMgJHtpbnB1dFNoYXBlQXREaW19LCBhbmQgb3V0cHV0IHNoYXBlIGAgK1xuICAgICAgICAgIGBpcyAke291dHB1dFNoYXBlQXREaW19LmBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGRpbSBvZiBvdXRwdXRTcGVjKSB7XG4gICAgaWYgKCFpbnB1dFNwZWMuaW5jbHVkZXMoZGltKSAmJiAhd2VpZ2h0U3BlYy5pbmNsdWRlcyhkaW0pKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgYERpbWVuc2lvbiAnJHtkaW19JyB3YXMgc3BlY2lmaWVkIGluIHRoZSBvdXRwdXQgJyR7b3V0cHV0U3BlY30nIGAgK1xuICAgICAgICBgYnV0IGhhcyBubyBjb3JyZXNwb25kaW5nIGRpbWVuc2lvbiBpbiB0aGUgaW5wdXQgc3BlYyBgICtcbiAgICAgICAgYCcke2lucHV0U3BlY30nIG9yIHdlaWdodCBzcGVjICcke3dlaWdodFNwZWN9J2BcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgd2VpZ2h0U2hhcGU6IFNoYXBlID0gW107XG4gIGZvciAoY29uc3QgZGltIG9mIHdlaWdodFNwZWMpIHtcbiAgICBpZiAoaW5wdXREaW1NYXAuaGFzKGRpbSkpIHtcbiAgICAgIHdlaWdodFNoYXBlLnB1c2goaW5wdXRTaGFwZVtpbnB1dERpbU1hcC5nZXQoZGltKV0pO1xuICAgIH0gZWxzZSBpZiAob3V0cHV0RGltTWFwLmhhcyhkaW0pKSB7XG4gICAgICB3ZWlnaHRTaGFwZS5wdXNoKG5ld091dHB1dFNoYXBlW291dHB1dERpbU1hcC5nZXQoZGltKV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgYFdlaWdodCBkaW1lbnNpb24gJyR7ZGltfScgZGlkIG5vdCBoYXZlIGEgbWF0Y2ggaW4gZWl0aGVyIHRoZSBgICtcbiAgICAgICAgYGlucHV0IHNwZWMgJyR7aW5wdXRTcGVjfScgb3IgdGhlIG91dHB1dCBzcGVjICcke291dHB1dFNwZWN9Jy4gRm9yIGAgK1xuICAgICAgICBgdGhpcyBsYXllciwgdGhlIHdlaWdodCBtdXN0IGJlIGZ1bGx5IHNwZWNpZmllZC5gXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGxldCBiaWFzU2hhcGU6IFNoYXBlO1xuICBpZiAoYmlhc0F4ZXMgIT0gbnVsbCkge1xuICAgIGNvbnN0IG51bUxlZnRFbGlkZWQgPSBsZWZ0RWxpZGVkID8gZWxpZGVkIDogMDtcbiAgICBjb25zdCBpZHhNYXA6IHsgW2NoYXI6IHN0cmluZ106IG51bWJlciB9ID0ge307XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXRTcGVjLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZHhNYXBbb3V0cHV0U3BlY1tpXV0gPSBuZXdPdXRwdXRTaGFwZVtpICsgbnVtTGVmdEVsaWRlZF07XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBjaGFyIG9mIGJpYXNBeGVzKSB7XG4gICAgICBpZiAoIW91dHB1dFNwZWMuaW5jbHVkZXMoY2hhcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYEJpYXMgZGltZW5zaW9uICcke2NoYXJ9JyB3YXMgcmVxdWVzdGVkLCBidXQgaXMgbm90IHBhcnQgb2YgdGhlIGAgK1xuICAgICAgICAgIGBvdXRwdXQgc3BlYyAnJHtvdXRwdXRTcGVjfSdgXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZmlyc3RCaWFzTG9jYXRpb24gPSBNYXRoLm1pbihcbiAgICAgIC4uLmJpYXNBeGVzLnNwbGl0KCcnKS5tYXAoY2hhciA9PiBvdXRwdXRTcGVjLmluZGV4T2YoY2hhcikpXG4gICAgKTtcbiAgICBjb25zdCBiaWFzT3V0cHV0U3BlYyA9IG91dHB1dFNwZWMuc2xpY2UoZmlyc3RCaWFzTG9jYXRpb24pO1xuXG4gICAgYmlhc1NoYXBlID0gYmlhc091dHB1dFNwZWMuc3BsaXQoJycpLm1hcChjaGFyID0+XG4gICAgICBiaWFzQXhlcy5pbmNsdWRlcyhjaGFyKSA/IGlkeE1hcFtjaGFyXSA6IDFcbiAgICApO1xuXG4gICAgaWYgKCFsZWZ0RWxpZGVkKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsaWRlZDsgaSsrKSB7XG4gICAgICAgIGJpYXNTaGFwZS5wdXNoKDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBiaWFzU2hhcGUgPSBudWxsO1xuICB9XG4gIHJldHVybiBbd2VpZ2h0U2hhcGUsIGJpYXNTaGFwZSwgbmV3T3V0cHV0U2hhcGVdO1xufVxuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgRWluc3VtRGVuc2VBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIEFuIGVxdWF0aW9uIGRlc2NyaWJpbmcgdGhlIGVpbnN1bSB0byBwZXJmb3JtLiBUaGlzIGVxdWF0aW9uIG11c3QgYmUgYVxuICAgKiB2YWxpZCBlaW5zdW0gc3RyaW5nIG9mIHRoZSBmb3JtIGBhYixiYy0+YWNgLCBgLi4uYWIsYmMtPi4uLmFjYCwgb3JcbiAgICogYGFiLi4uLGJjLT5hYy4uLmAgd2hlcmUgJ2FiJywgJ2JjJywgYW5kICdhYycgY2FuIGJlIGFueSB2YWxpZCBlaW5zdW1cbiAgICogYXhpcyBleHByZXNzaW9uIHNlcXVlbmNlLlxuICAgKi9cbiAgZXF1YXRpb246IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGV4cGVjdGVkIHNoYXBlIG9mIHRoZSBvdXRwdXQgdGVuc29yIChleGNsdWRpbmcgdGhlIGJhdGNoIGRpbWVuc2lvbiBhbmRcbiAgICogYW55IGRpbWVuc2lvbnMgcmVwcmVzZW50ZWQgYnkgZWxsaXBzZXMpLiBZb3UgY2FuIHNwZWNpZnkgTm9uZSBmb3IgYW55XG4gICAqIGRpbWVuc2lvbiB0aGF0IGlzIHVua25vd24gb3IgY2FuIGJlIGluZmVycmVkIGZyb20gdGhlIGlucHV0IHNoYXBlLlxuICAgKi9cbiAgb3V0cHV0U2hhcGU6IFNoYXBlfG51bWJlcjtcblxuICAvKipcbiAgICogQWN0aXZhdGlvbiBmdW5jdGlvbiB0byB1c2UuIElmIHlvdSBkb24ndCBzcGVjaWZ5IGFueXRoaW5nLCBubyBhY3RpdmF0aW9uXG4gICAqIGlzIGFwcGxpZWQgKHRoYXQgaXMsIGEgXCJsaW5lYXJcIiBhY3RpdmF0aW9uOiBgYSh4KSA9IHhgKS5cbiAgICovXG4gIGFjdGl2YXRpb24/OiBBY3RpdmF0aW9uSWRlbnRpZmllcjtcblxuICAvKipcbiAgICogQSBzdHJpbmcgY29udGFpbmluZyB0aGUgb3V0cHV0IGRpbWVuc2lvbihzKSB0byBhcHBseSBhIGJpYXMgdG8uIEVhY2hcbiAgICogY2hhcmFjdGVyIGluIHRoZSBgYmlhc0F4ZXNgIHN0cmluZyBzaG91bGQgY29ycmVzcG9uZCB0byBhIGNoYXJhY3RlclxuICAgKiBpbiB0aGUgb3V0cHV0IHBvcnRpb24gb2YgdGhlIGBlcXVhdGlvbmAgc3RyaW5nLlxuICAgKi9cbiAgYmlhc0F4ZXM/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVyIGZvciB0aGUgYGtlcm5lbGAgd2VpZ2h0cyBtYXRyaXguXG4gICAqIERlZmF1bHRzIHRvIGBcImdsb3JvdFVuaWZvcm1cImAuXG4gICAqL1xuICBrZXJuZWxJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIHRoZSBiaWFzIHZlY3Rvci5cbiAgICogRGVmYXVsdHMgdG8gYFwiemVyb3NcImAuXG4gICAqL1xuICBiaWFzSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGBrZXJuZWxgIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAga2VybmVsUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc1JlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBvdXRwdXQgb2YgdGhlIGxheWVyIChpdHMgXCJhY3RpdmF0aW9uXCIpLlxuICAgKi9cbiAgYWN0aXZpdHlSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcjtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBga2VybmVsYCB3ZWlnaHRzIG1hdHJpeC5cbiAgICovXG4gIGtlcm5lbENvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcjtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBiaWFzIHZlY3Rvci5cbiAgICovXG4gIGJpYXNDb25zdHJhaW50PzogQ29uc3RyYWludElkZW50aWZpZXI7XG59XG5cbi8qKlxuICogQSBsYXllciB0aGF0IHVzZXMgYHRmLmVpbnN1bWAgYXMgdGhlIGJhY2tpbmcgY29tcHV0YXRpb24uXG4gKlxuICogVGhpcyBsYXllciBjYW4gcGVyZm9ybSBlaW5zdW0gY2FsY3VsYXRpb25zIG9mIGFyYml0cmFyeSBkaW1lbnNpb25hbGl0eS5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAqKkJpYXNlZCBkZW5zZSBsYXllciB3aXRoIGVpbnN1bXMqKlxuICpcbiAqIFRoaXMgZXhhbXBsZSBzaG93cyBob3cgdG8gaW5zdGFudGlhdGUgYSBzdGFuZGFyZCBLZXJhcyBkZW5zZSBsYXllciB1c2luZ1xuICogZWluc3VtIG9wZXJhdGlvbnMuIFRoaXMgZXhhbXBsZSBpcyBlcXVpdmFsZW50IHRvXG4gKiB0Zi5sYXllcnMuRGVuc2Uoe3VuaXRzOiA2NCwgdXNlQmlhczogdHJ1ZX0pYC5cbiAqXG4gKiBjb25zdCBsYXllciA9IG5ldyBFaW5zdW1EZW5zZSh7XG4gKiAgICBlcXVhdGlvbjogXCJhYixiYy0+YWNcIiwgb3V0cHV0U2hhcGU6IDQsIGJpYXNBeGVzOiBcImNcIn0pO1xuICogY29uc3QgaW5wdXRUZW5zb3IgPSB0Zi5pbnB1dCh7c2hhcGU6IFszMl19KTtcbiAqIGNvbnN0IG91dHB1dFRlbnNvciA9IGxheWVyLmNhbGwoaW5wdXRUZW5zb3IpO1xuICogY29uc29sZS5sb2cob3V0cHV0VGVuc29yKTsgIC8vIFtudWxsLCA2NF1cbiAqXG4gKiAqKkFwcGx5aW5nIGEgZGVuc2UgbGF5ZXIgdG8gYSBzZXF1ZW5jZSoqXG4gKlxuICogVGhpcyBleGFtcGxlIHNob3dzIGhvdyB0byBpbnN0YW50aWF0ZSBhIGxheWVyIHRoYXQgYXBwbGllcyB0aGUgc2FtZSBkZW5zZVxuICogb3BlcmF0aW9uIHRvIGV2ZXJ5IGVsZW1lbnQgaW4gYSBzZXF1ZW5jZS4gSGVyZSwgdGhlIGBvdXRwdXRTaGFwZWAgaGFzIHR3b1xuICogdmFsdWVzIChzaW5jZSB0aGVyZSBhcmUgdHdvIG5vbi1iYXRjaCBkaW1lbnNpb25zIGluIHRoZSBvdXRwdXQpOyB0aGUgZmlyc3RcbiAqIGRpbWVuc2lvbiBpbiB0aGUgYG91dHB1dFNoYXBlYCBpcyBgbnVsbGAsIGJlY2F1c2UgdGhlIHNlcXVlbmNlIGRpbWVuc2lvblxuICogYGJgIGhhcyBhbiB1bmtub3duIHNoYXBlLlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBsYXllciA9IG5ldyBFaW5zdW1EZW5zZSh7XG4gKiAgICBlcXVhdGlvbjogXCJhYmMsY2QtPmFiZFwiLCBvdXRwdXRTaGFwZTogW251bGwsIDY0XSwgYmlhc0F4ZXM6IFwiZFwifSk7XG4gKiBjb25zdCBpbnB1dFRlbnNvciA9IHRmLmlucHV0KHtzaGFwZTogWzMyLCAxMjhdfSk7XG4gKiBjb25zdCBvdXRwdXRUZW5zb3IgPSBsYXllci5jYWxsKGlucHV0VGVuc29yKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dFRlbnNvcik7ICAvLyBbbnVsbCwgMzIsIDY0XVxuICogYGBgXG4gKlxuICogKipBcHBseWluZyBhIGRlbnNlIGxheWVyIHRvIGEgc2VxdWVuY2UgdXNpbmcgZWxsaXBzZXMqKlxuICpcbiAqIFRoaXMgZXhhbXBsZSBzaG93cyBob3cgdG8gaW5zdGFudGlhdGUgYSBsYXllciB0aGF0IGFwcGxpZXMgdGhlIHNhbWUgZGVuc2VcbiAqIG9wZXJhdGlvbiB0byBldmVyeSBlbGVtZW50IGluIGEgc2VxdWVuY2UsIGJ1dCB1c2VzIHRoZSBlbGxpcHNpcyBub3RhdGlvblxuICogaW5zdGVhZCBvZiBzcGVjaWZ5aW5nIHRoZSBiYXRjaCBhbmQgc2VxdWVuY2UgZGltZW5zaW9ucy5cbiAqXG4gKiBCZWNhdXNlIHdlIGFyZSB1c2luZyBlbGxpcHNpcyBub3RhdGlvbiBhbmQgaGF2ZSBzcGVjaWZpZWQgb25seSBvbmUgYXhpcywgdGhlXG4gKiBgb3V0cHV0U2hhcGVgIGFyZyBpcyBhIHNpbmdsZSB2YWx1ZS4gV2hlbiBpbnN0YW50aWF0ZWQgaW4gdGhpcyB3YXksIHRoZVxuICogbGF5ZXIgY2FuIGhhbmRsZSBhbnkgbnVtYmVyIG9mIHNlcXVlbmNlIGRpbWVuc2lvbnMgLSBpbmNsdWRpbmcgdGhlIGNhc2VcbiAqIHdoZXJlIG5vIHNlcXVlbmNlIGRpbWVuc2lvbiBleGlzdHMuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGxheWVyID0gbmV3IEVpbnN1bURlbnNlKHtcbiAqICAgIGVxdWF0aW9uOiBcIi4uLngseHktPi4uLnlcIiwgb3V0cHV0U2hhcGU6IDY0LCBiaWFzQXhlczogXCJ5XCJ9KTtcbiAqIGNvbnN0IGlucHV0VGVuc29yID0gdGYuaW5wdXQoe3NoYXBlOiBbMzIsIDEyOF19KTtcbiAqIGNvbnN0IG91dHB1dFRlbnNvciA9IGxheWVyLmNhbGwoaW5wdXRUZW5zb3IpO1xuICogY29uc29sZS5sb2cob3V0cHV0VGVuc29yKTsgIC8vIFtudWxsLCAzMiwgNjRdXG4gKiBgYFxuICovXG5leHBvcnQgY2xhc3MgRWluc3VtRGVuc2UgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgcmVhZG9ubHkgY2xhc3NOYW1lID0gJ0VpbnN1bURlbnNlJztcbiAgcHJpdmF0ZSByZWFkb25seSBlcXVhdGlvbjogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IGJpYXNBeGVzOiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFydGlhbE91dHB1dFNoYXBlOiBTaGFwZTtcbiAgcHJpdmF0ZSByZWFkb25seSBhY3RpdmF0aW9uOiBBY3RpdmF0aW9uO1xuICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbEluaXRpYWxpemVyOiBJbml0aWFsaXplcjtcbiAgcHJpdmF0ZSByZWFkb25seSBiaWFzSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbFJlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcbiAgcHJpdmF0ZSByZWFkb25seSBiaWFzUmVndWxhcml6ZXI6IFJlZ3VsYXJpemVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbENvbnN0cmFpbnQ6IENvbnN0cmFpbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgYmlhc0NvbnN0cmFpbnQ6IENvbnN0cmFpbnQ7XG4gIHByaXZhdGUgZnVsbE91dHB1dFNoYXBlOiBTaGFwZTtcbiAgcHJpdmF0ZSBfa2VybmVsOiBMYXllclZhcmlhYmxlO1xuICBwcml2YXRlIF9iaWFzOiBMYXllclZhcmlhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IEVpbnN1bURlbnNlQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMuZXF1YXRpb24gPSBhcmdzLmVxdWF0aW9uO1xuICAgIHRoaXMuYmlhc0F4ZXMgPSBhcmdzLmJpYXNBeGVzO1xuICAgIHRoaXMucGFydGlhbE91dHB1dFNoYXBlID1cbiAgICAgIEFycmF5LmlzQXJyYXkoYXJncy5vdXRwdXRTaGFwZSkgPyBhcmdzLm91dHB1dFNoYXBlIDogW2FyZ3Mub3V0cHV0U2hhcGVdO1xuICAgIHRoaXMuYWN0aXZhdGlvbiA9IGdldEFjdGl2YXRpb24oYXJncy5hY3RpdmF0aW9uKTtcbiAgICB0aGlzLmtlcm5lbEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoXG4gICAgICBhcmdzLmtlcm5lbEluaXRpYWxpemVyID8/ICdnbG9yb3RVbmlmb3JtJyk7XG4gICAgdGhpcy5iaWFzSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihhcmdzLmJpYXNJbml0aWFsaXplciA/PyAnemVyb3MnKTtcbiAgICB0aGlzLmtlcm5lbFJlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5rZXJuZWxSZWd1bGFyaXplcik7XG4gICAgdGhpcy5iaWFzUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmJpYXNSZWd1bGFyaXplcik7XG4gICAgdGhpcy5rZXJuZWxDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmtlcm5lbENvbnN0cmFpbnQpO1xuICAgIHRoaXMuYmlhc0NvbnN0cmFpbnQgPSBnZXRDb25zdHJhaW50KGFyZ3MuYmlhc0NvbnN0cmFpbnQpO1xuICB9XG5cbiAgZ2V0IGtlcm5lbCgpOiBMYXllclZhcmlhYmxlIHtcbiAgICByZXR1cm4gdGhpcy5fa2VybmVsO1xuICB9XG5cbiAgZ2V0IGJpYXMoKTogTGF5ZXJWYXJpYWJsZSB7XG4gICAgcmV0dXJuIHRoaXMuX2JpYXM7XG4gIH1cblxuICBvdmVycmlkZSBidWlsZChpbnB1dFNoYXBlOiBTaGFwZSk6IHZvaWQge1xuICAgIGNvbnN0IFtrZXJuZWxTaGFwZSwgYmlhc1NoYXBlLCBmdWxsT3V0cHV0U2hhcGVdID0gYW5hbHl6ZUVpbnN1bVN0cmluZyhcbiAgICAgIHRoaXMuZXF1YXRpb24sXG4gICAgICB0aGlzLmJpYXNBeGVzLFxuICAgICAgaW5wdXRTaGFwZSxcbiAgICAgIHRoaXMucGFydGlhbE91dHB1dFNoYXBlXG4gICAgKTtcbiAgICB0aGlzLmZ1bGxPdXRwdXRTaGFwZSA9IGZ1bGxPdXRwdXRTaGFwZTtcbiAgICB0aGlzLl9rZXJuZWwgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICdrZXJuZWwnLFxuICAgICAga2VybmVsU2hhcGUsXG4gICAgICB0aGlzLmR0eXBlLFxuICAgICAgdGhpcy5rZXJuZWxJbml0aWFsaXplcixcbiAgICAgIHRoaXMua2VybmVsUmVndWxhcml6ZXIsXG4gICAgICB0cnVlLFxuICAgICAgdGhpcy5rZXJuZWxDb25zdHJhaW50LFxuICAgICk7XG5cbiAgICBpZiAoYmlhc1NoYXBlICE9IG51bGwpIHtcbiAgICAgIHRoaXMuX2JpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgJ2JpYXMnLFxuICAgICAgICBiaWFzU2hhcGUsXG4gICAgICAgIHRoaXMuZHR5cGUsXG4gICAgICAgIHRoaXMuYmlhc0luaXRpYWxpemVyLFxuICAgICAgICB0aGlzLmJpYXNSZWd1bGFyaXplcixcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgdGhpcy5iaWFzQ29uc3RyYWludCxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2JpYXMgPSBudWxsO1xuICAgIH1cbiAgICBzdXBlci5idWlsZChpbnB1dFNoYXBlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShfOiBTaGFwZSk6IFNoYXBlIHtcbiAgICByZXR1cm4gdGhpcy5mdWxsT3V0cHV0U2hhcGU7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICBvdXRwdXRTaGFwZTogdGhpcy5wYXJ0aWFsT3V0cHV0U2hhcGUsXG4gICAgICBlcXVhdGlvbjogdGhpcy5lcXVhdGlvbixcbiAgICAgIGFjdGl2YXRpb246IHNlcmlhbGl6ZUFjdGl2YXRpb24odGhpcy5hY3RpdmF0aW9uKSxcbiAgICAgIGJpYXNBeGVzOiB0aGlzLmJpYXNBeGVzLFxuICAgICAga2VybmVsSW5pdGlhbGl6ZXI6IHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMua2VybmVsSW5pdGlhbGl6ZXIpLFxuICAgICAgYmlhc0luaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmJpYXNJbml0aWFsaXplciksXG4gICAgICBrZXJuZWxSZWd1bGFyaXplcjogc2VyaWFsaXplUmVndWxhcml6ZXIodGhpcy5rZXJuZWxSZWd1bGFyaXplciksXG4gICAgICBiaWFzUmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMuYmlhc1JlZ3VsYXJpemVyKSxcbiAgICAgIGtlcm5lbENvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5rZXJuZWxDb25zdHJhaW50KSxcbiAgICAgIGJpYXNDb25zdHJhaW50OiBzZXJpYWxpemVDb25zdHJhaW50KHRoaXMuYmlhc0NvbnN0cmFpbnQpLFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yMkQge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlucHV0cyA9IEFycmF5LmlzQXJyYXkoaW5wdXRzKSA/IGlucHV0cyA6IFtpbnB1dHNdO1xuICAgICAgbGV0IHJldCA9IGVpbnN1bSh0aGlzLmVxdWF0aW9uLCAuLi5pbnB1dHMsIHRoaXMua2VybmVsLnJlYWQoKSk7XG4gICAgICBpZiAodGhpcy5iaWFzICE9IG51bGwpIHtcbiAgICAgICAgcmV0ID0gcmV0LmFkZCh0aGlzLmJpYXMucmVhZCgpKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmFjdGl2YXRpb24gIT0gbnVsbCkge1xuICAgICAgICByZXQgPSB0aGlzLmFjdGl2YXRpb24uYXBwbHkocmV0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhFaW5zdW1EZW5zZSk7XG4iXX0=