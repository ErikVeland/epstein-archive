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
 *  Base class for Backbone models.
 */
/* Original source: keras_nlp/models/gpt2/gpt2_backbone.py */
import { serialization } from '@tensorflow/tfjs-core';
import { RandomNormal } from '../../../../initializers';
import { input } from '../../../../exports';
import { Embedding } from '../../../embeddings';
import { PositionEmbedding } from '../../modeling/position_embedding';
import { add } from '../../../../exports_layers';
import { Dropout } from '../../../core';
import { TransformerDecoder } from '../../modeling/transformer_decoder';
import { getActivation } from '../../../../activations';
import { LayerNormalization } from '../../../normalization';
import { Backbone } from '../backbone';
function gpt2KernelInitializer(stddev = 0.02) {
    return new RandomNormal({ stddev });
}
/**
 * GPT-2 core network with hyperparameters.
 *
 * This network implements a Transformer-based decoder network,
 * Generative Pretrained Transformer-2 (GPT-2), as described in
 * ["Language Models are Unsupervised Multitask Learners"](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf).
 * It includes the embedding lookups and transformer layers.
 *
 * The default constructor gives a fully customizable, randomly initialized
 * GPT-2 model with any number of layers, heads, and embedding
 * dimensions. To load preset architectures and weights, use the `fromPreset`
 * constructor.
 *
 * Disclaimer: Pre-trained models are provided on an "as is" basis, without
 * warranties or conditions of any kind. The underlying model is provided by a
 * third party and subject to a separate license, available
 * [here](https://github.com/openai/gpt-2).
 *
 *
 * Example usage:
 * ```js
 * const tokenIds = tf.ones([1, 12]), dtype="int32");
 * const paddingMask = tf.tensor(
 *  [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]], 'int32');
 *
 * # Pretrained GPT-2 decoder.
 * model = GPT2Backbone.fromPreset("gpt2_base_en");
 * model.apply(inputData, {paddingMask});
 *
 * # Randomly initialized GPT-2 decoder with custom config.
 * model = kerasNlp.models.GPT2Backbone({
 *     vocabularySize: 50257,
 *     numLayers: 12,
 *     numHeads: 12,
 *     hiddenDim: 768,
 *     intermediateDim: 3072,
 *     maxSequenceLength: 1024,
 * });
 * model.apply(inputData, {paddingMask});
 * ```
 */
class GPT2Backbone extends Backbone {
    constructor(args) {
        var _a, _b, _c, _d;
        args.dropout = (_a = args.dropout) !== null && _a !== void 0 ? _a : 0.1;
        args.maxSequenceLength = (_b = args.maxSequenceLength) !== null && _b !== void 0 ? _b : 1024;
        // Inputs
        const tokenIds = input({ shape: [null], dtype: 'int32', name: 'token_ids' });
        const paddingMask = input({ shape: [null], dtype: 'int32', name: 'padding_mask' });
        // Embed tokens, positions.
        const tokenEmbedding = new Embedding({
            inputDim: args.vocabularySize,
            outputDim: args.hiddenDim,
            embeddingsInitializer: gpt2KernelInitializer(0.01),
            name: 'token_embedding',
        }).apply(tokenIds);
        const positionEmbedding = new PositionEmbedding({
            initializer: gpt2KernelInitializer(0.02),
            sequenceLength: args.maxSequenceLength,
            name: 'position_embedding',
        }).apply(tokenEmbedding);
        // Sum and apply dropout to embeddings.
        let x = add({ name: 'embeddings_add' })
            .apply([tokenEmbedding, positionEmbedding]);
        x = new Dropout({ rate: args.dropout, name: 'embeddings_dropout' })
            .apply(x);
        // Apply successive transformer decoder blocks.
        for (let i = 0; i < args.numLayers; i++) {
            x = new TransformerDecoder({
                intermediateDim: args.intermediateDim,
                numHeads: args.numHeads,
                dropout: args.dropout,
                layerNormEpsilon: 1e-05,
                activation: getActivation('gelu'),
                kernelInitializer: gpt2KernelInitializer(0.02),
                normalizeFirst: true,
                name: `transformer_layer_${i}`,
            }).apply(x, { decoderPaddingMask: paddingMask });
        }
        const sequenceOutput = new LayerNormalization({
            name: 'layer_norm',
            axis: -1,
            epsilon: 1e-05,
            dtype: 'float32',
        }).apply(x);
        // Instantiate using Functional API Model constructor.
        super({
            inputs: [tokenIds, paddingMask],
            outputs: sequenceOutput,
            name: 'gpt2_backbone'
        });
        this.vocabularySize = args.vocabularySize;
        this.numLayers = args.numLayers;
        this.numHeads = args.numHeads;
        this.hiddenDim = args.hiddenDim;
        this.intermediateDim = args.intermediateDim;
        this.dropout = (_c = args.dropout) !== null && _c !== void 0 ? _c : 0.1;
        this.maxSequenceLength = (_d = args.maxSequenceLength) !== null && _d !== void 0 ? _d : 1024;
    }
    getConfig() {
        const config = {
            vocabularySize: this.vocabularySize,
            numLayers: this.numLayers,
            numHeads: this.numHeads,
            hiddenDim: this.hiddenDim,
            intermediateDim: this.intermediateDim,
            dropout: this.dropout,
            maxSequenceLength: this.maxSequenceLength,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    get tokenEmbedding() {
        return this.getLayer('token_embedding');
    }
}
/** @nocollapse */
GPT2Backbone.className = 'GPT2Backbone';
export { GPT2Backbone };
serialization.registerClass(GPT2Backbone);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B0Ml9iYWNrYm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvbmxwL21vZGVscy9ncHQyL2dwdDJfYmFja2JvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUg7O0dBRUc7QUFFSCw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXRELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWhELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXZDLFNBQVMscUJBQXFCLENBQUMsTUFBTSxHQUFHLElBQUk7SUFDMUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQztBQTZDRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXdDRztBQUNILE1BQWEsWUFBYSxTQUFRLFFBQVE7SUFZeEMsWUFBWSxJQUFzQjs7UUFDaEMsSUFB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bnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqICBCYXNlIGNsYXNzIGZvciBCYWNrYm9uZSBtb2RlbHMuXG4gKi9cblxuLyogT3JpZ2luYWwgc291cmNlOiBrZXJhc19ubHAvbW9kZWxzL2dwdDIvZ3B0Ml9iYWNrYm9uZS5weSAqL1xuaW1wb3J0IHsgc2VyaWFsaXphdGlvbiB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7IFJhbmRvbU5vcm1hbCB9IGZyb20gJy4uLy4uLy4uLy4uL2luaXRpYWxpemVycyc7XG5pbXBvcnQgeyBpbnB1dCB9IGZyb20gJy4uLy4uLy4uLy4uL2V4cG9ydHMnO1xuaW1wb3J0IHsgRW1iZWRkaW5nIH0gZnJvbSAnLi4vLi4vLi4vZW1iZWRkaW5ncyc7XG5pbXBvcnQgeyBTeW1ib2xpY1RlbnNvciB9IGZyb20gJy4uLy4uLy4uLy4uL2VuZ2luZS90b3BvbG9neSc7XG5pbXBvcnQgeyBQb3NpdGlvbkVtYmVkZGluZyB9IGZyb20gJy4uLy4uL21vZGVsaW5nL3Bvc2l0aW9uX2VtYmVkZGluZyc7XG5pbXBvcnQgeyBhZGQgfSBmcm9tICcuLi8uLi8uLi8uLi9leHBvcnRzX2xheWVycyc7XG5pbXBvcnQgeyBEcm9wb3V0IH0gZnJvbSAnLi4vLi4vLi4vY29yZSc7XG5pbXBvcnQgeyBUcmFuc2Zvcm1lckRlY29kZXIgfSBmcm9tICcuLi8uLi9tb2RlbGluZy90cmFuc2Zvcm1lcl9kZWNvZGVyJztcbmltcG9ydCB7IGdldEFjdGl2YXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi9hY3RpdmF0aW9ucyc7XG5pbXBvcnQgeyBMYXllck5vcm1hbGl6YXRpb24gfSBmcm9tICcuLi8uLi8uLi9ub3JtYWxpemF0aW9uJztcbmltcG9ydCB7IEJhY2tib25lIH0gZnJvbSAnLi4vYmFja2JvbmUnO1xuXG5mdW5jdGlvbiBncHQyS2VybmVsSW5pdGlhbGl6ZXIoc3RkZGV2ID0gMC4wMikge1xuICByZXR1cm4gbmV3IFJhbmRvbU5vcm1hbCh7c3RkZGV2fSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR1BUMkJhY2tib25lQXJncyAge1xuICAvKipcbiAgICogSW50ZWdlci4gVGhlIHNpemUgb2YgdGhlIHRva2VuIHZvY2FidWxhcnkuXG4gICAqL1xuICB2b2NhYnVsYXJ5U2l6ZTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbnRlZ2VyLiBUaGUgbnVtYmVyIG9mIHRyYW5zZm9ybWVyIGxheWVycy5cbiAgICovXG4gIG51bUxheWVyczogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbnRlZ2VyLiBUaGUgbnVtYmVyIG9mIGF0dGVudGlvbiBoZWFkcyBmb3IgZWFjaCB0cmFuc2Zvcm1lci5cbiAgICogVGhlIGhpZGRlbiBzaXplIG11c3QgYmUgZGl2aXNpYmxlIGJ5IHRoZSBudW1iZXIgb2YgYXR0ZW50aW9uIGhlYWRzLlxuICAgKi9cbiAgbnVtSGVhZHM6IG51bWJlcjtcblxuICAvKipcbiAgICogSW50ZWdlci4gVGhlIHNpemUgb2YgdGhlIHRyYW5zZm9ybWVyIGVuY29kaW5nIGFuZCBwb29sZXIgbGF5ZXJzLlxuICAgKi9cbiAgaGlkZGVuRGltOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEludGVnZXIuIFRoZSBvdXRwdXQgZGltZW5zaW9uIG9mIHRoZSBmaXJzdCBEZW5zZSBsYXllciBpbiBhIHR3by1sYXllclxuICAgKiBmZWVkZm9yd2FyZCBuZXR3b3JrIGZvciBlYWNoIHRyYW5zZm9ybWVyLlxuICAgKi9cbiAgaW50ZXJtZWRpYXRlRGltOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEZsb2F0LiBEcm9wb3V0IHByb2JhYmlsaXR5IGZvciB0aGUgVHJhbnNmb3JtZXIgZW5jb2Rlci5cbiAgICogRGVmYXVsdHMgdG8gMC4yLlxuICAgKi9cbiAgZHJvcG91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogSW50ZWdlci4gVGhlIG1heGltdW0gc2VxdWVuY2UgbGVuZ3RoIHRoYXQgdGhpcyBlbmNvZGVyIGNhbiBjb25zdW1lLlxuICAgKiBJZiBgbnVsbGAsIGBtYXhTZXF1ZW5jZUxlbmd0aGAgdXNlcyB0aGUgdmFsdWUgZnJvbSBzZXF1ZW5jZSBsZW5ndGguXG4gICAqIFRoaXMgZGV0ZXJtaW5lcyB0aGUgdmFyaWFibGUgc2hhcGUgZm9yIHBvc2l0aW9uYWwgZW1iZWRkaW5ncy5cbiAgICogRGVmYXVsdHMgdG8gMTAyNC5cbiAgICovXG4gIG1heFNlcXVlbmNlTGVuZ3RoPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIEdQVC0yIGNvcmUgbmV0d29yayB3aXRoIGh5cGVycGFyYW1ldGVycy5cbiAqXG4gKiBUaGlzIG5ldHdvcmsgaW1wbGVtZW50cyBhIFRyYW5zZm9ybWVyLWJhc2VkIGRlY29kZXIgbmV0d29yayxcbiAqIEdlbmVyYXRpdmUgUHJldHJhaW5lZCBUcmFuc2Zvcm1lci0yIChHUFQtMiksIGFzIGRlc2NyaWJlZCBpblxuICogW1wiTGFuZ3VhZ2UgTW9kZWxzIGFyZSBVbnN1cGVydmlzZWQgTXVsdGl0YXNrIExlYXJuZXJzXCJdKGh0dHBzOi8vY2RuLm9wZW5haS5jb20vYmV0dGVyLWxhbmd1YWdlLW1vZGVscy9sYW5ndWFnZV9tb2RlbHNfYXJlX3Vuc3VwZXJ2aXNlZF9tdWx0aXRhc2tfbGVhcm5lcnMucGRmKS5cbiAqIEl0IGluY2x1ZGVzIHRoZSBlbWJlZGRpbmcgbG9va3VwcyBhbmQgdHJhbnNmb3JtZXIgbGF5ZXJzLlxuICpcbiAqIFRoZSBkZWZhdWx0IGNvbnN0cnVjdG9yIGdpdmVzIGEgZnVsbHkgY3VzdG9taXphYmxlLCByYW5kb21seSBpbml0aWFsaXplZFxuICogR1BULTIgbW9kZWwgd2l0aCBhbnkgbnVtYmVyIG9mIGxheWVycywgaGVhZHMsIGFuZCBlbWJlZGRpbmdcbiAqIGRpbWVuc2lvbnMuIFRvIGxvYWQgcHJlc2V0IGFyY2hpdGVjdHVyZXMgYW5kIHdlaWdodHMsIHVzZSB0aGUgYGZyb21QcmVzZXRgXG4gKiBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBEaXNjbGFpbWVyOiBQcmUtdHJhaW5lZCBtb2RlbHMgYXJlIHByb3ZpZGVkIG9uIGFuIFwiYXMgaXNcIiBiYXNpcywgd2l0aG91dFxuICogd2FycmFudGllcyBvciBjb25kaXRpb25zIG9mIGFueSBraW5kLiBUaGUgdW5kZXJseWluZyBtb2RlbCBpcyBwcm92aWRlZCBieSBhXG4gKiB0aGlyZCBwYXJ0eSBhbmQgc3ViamVjdCB0byBhIHNlcGFyYXRlIGxpY2Vuc2UsIGF2YWlsYWJsZVxuICogW2hlcmVdKGh0dHBzOi8vZ2l0aHViLmNvbS9vcGVuYWkvZ3B0LTIpLlxuICpcbiAqXG4gKiBFeGFtcGxlIHVzYWdlOlxuICogYGBganNcbiAqIGNvbnN0IHRva2VuSWRzID0gdGYub25lcyhbMSwgMTJdKSwgZHR5cGU9XCJpbnQzMlwiKTtcbiAqIGNvbnN0IHBhZGRpbmdNYXNrID0gdGYudGVuc29yKFxuICogIFtbMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSwgMCwgMF1dLCAnaW50MzInKTtcbiAqXG4gKiAjIFByZXRyYWluZWQgR1BULTIgZGVjb2Rlci5cbiAqIG1vZGVsID0gR1BUMkJhY2tib25lLmZyb21QcmVzZXQoXCJncHQyX2Jhc2VfZW5cIik7XG4gKiBtb2RlbC5hcHBseShpbnB1dERhdGEsIHtwYWRkaW5nTWFza30pO1xuICpcbiAqICMgUmFuZG9tbHkgaW5pdGlhbGl6ZWQgR1BULTIgZGVjb2RlciB3aXRoIGN1c3RvbSBjb25maWcuXG4gKiBtb2RlbCA9IGtlcmFzTmxwLm1vZGVscy5HUFQyQmFja2JvbmUoe1xuICogICAgIHZvY2FidWxhcnlTaXplOiA1MDI1NyxcbiAqICAgICBudW1MYXllcnM6IDEyLFxuICogICAgIG51bUhlYWRzOiAxMixcbiAqICAgICBoaWRkZW5EaW06IDc2OCxcbiAqICAgICBpbnRlcm1lZGlhdGVEaW06IDMwNzIsXG4gKiAgICAgbWF4U2VxdWVuY2VMZW5ndGg6IDEwMjQsXG4gKiB9KTtcbiAqIG1vZGVsLmFwcGx5KGlucHV0RGF0YSwge3BhZGRpbmdNYXNrfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEdQVDJCYWNrYm9uZSBleHRlbmRzIEJhY2tib25lIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnR1BUMkJhY2tib25lJztcblxuICBwcml2YXRlIHZvY2FidWxhcnlTaXplOiBudW1iZXI7XG4gIHByaXZhdGUgbnVtTGF5ZXJzOiBudW1iZXI7XG4gIHByaXZhdGUgbnVtSGVhZHM6IG51bWJlcjtcbiAgcHJpdmF0ZSBoaWRkZW5EaW06IG51bWJlcjtcbiAgcHJpdmF0ZSBpbnRlcm1lZGlhdGVEaW06IG51bWJlcjtcbiAgcHJpdmF0ZSBkcm9wb3V0OiBudW1iZXI7XG4gIHByaXZhdGUgbWF4U2VxdWVuY2VMZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBHUFQyQmFja2JvbmVBcmdzKSB7XG4gICAgYXJncy5kcm9wb3V0ID0gYXJncy5kcm9wb3V0ID8/IDAuMTtcbiAgICBhcmdzLm1heFNlcXVlbmNlTGVuZ3RoID0gYXJncy5tYXhTZXF1ZW5jZUxlbmd0aCA/PyAxMDI0O1xuXG4gICAgLy8gSW5wdXRzXG4gICAgY29uc3QgdG9rZW5JZHMgPSBpbnB1dCh7c2hhcGU6IFtudWxsXSwgZHR5cGU6ICdpbnQzMicsIG5hbWU6ICd0b2tlbl9pZHMnfSk7XG4gICAgY29uc3QgcGFkZGluZ01hc2sgPVxuICAgICAgaW5wdXQoe3NoYXBlOiBbbnVsbF0sIGR0eXBlOiAnaW50MzInLCBuYW1lOiAncGFkZGluZ19tYXNrJ30pO1xuXG4gICAgLy8gRW1iZWQgdG9rZW5zLCBwb3NpdGlvbnMuXG4gICAgY29uc3QgdG9rZW5FbWJlZGRpbmcgPSBuZXcgRW1iZWRkaW5nKHtcbiAgICAgIGlucHV0RGltOiBhcmdzLnZvY2FidWxhcnlTaXplLFxuICAgICAgb3V0cHV0RGltOiBhcmdzLmhpZGRlbkRpbSxcbiAgICAgIGVtYmVkZGluZ3NJbml0aWFsaXplcjogZ3B0Mktlcm5lbEluaXRpYWxpemVyKDAuMDEpLFxuICAgICAgbmFtZTogJ3Rva2VuX2VtYmVkZGluZycsXG4gICAgfSkuYXBwbHkodG9rZW5JZHMpIGFzIFN5bWJvbGljVGVuc29yO1xuXG4gICAgY29uc3QgcG9zaXRpb25FbWJlZGRpbmcgPSBuZXcgUG9zaXRpb25FbWJlZGRpbmcoe1xuICAgICAgaW5pdGlhbGl6ZXI6IGdwdDJLZXJuZWxJbml0aWFsaXplcigwLjAyKSxcbiAgICAgIHNlcXVlbmNlTGVuZ3RoOiBhcmdzLm1heFNlcXVlbmNlTGVuZ3RoLFxuICAgICAgbmFtZTogJ3Bvc2l0aW9uX2VtYmVkZGluZycsXG4gICAgfSkuYXBwbHkodG9rZW5FbWJlZGRpbmcpIGFzIFN5bWJvbGljVGVuc29yO1xuXG4gICAgLy8gU3VtIGFuZCBhcHBseSBkcm9wb3V0IHRvIGVtYmVkZGluZ3MuXG4gICAgbGV0IHggPSBhZGQoe25hbWU6ICdlbWJlZGRpbmdzX2FkZCd9KVxuICAgICAgLmFwcGx5KFt0b2tlbkVtYmVkZGluZywgcG9zaXRpb25FbWJlZGRpbmddKSBhcyBTeW1ib2xpY1RlbnNvcjtcbiAgICB4ID0gbmV3IERyb3BvdXQoe3JhdGU6IGFyZ3MuZHJvcG91dCwgbmFtZTogJ2VtYmVkZGluZ3NfZHJvcG91dCd9KVxuICAgICAgLmFwcGx5KHgpIGFzIFN5bWJvbGljVGVuc29yO1xuXG4gICAgLy8gQXBwbHkgc3VjY2Vzc2l2ZSB0cmFuc2Zvcm1lciBkZWNvZGVyIGJsb2Nrcy5cbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgYXJncy5udW1MYXllcnM7IGkrKykge1xuICAgICAgeCA9IG5ldyBUcmFuc2Zvcm1lckRlY29kZXIoe1xuICAgICAgICBpbnRlcm1lZGlhdGVEaW06IGFyZ3MuaW50ZXJtZWRpYXRlRGltLFxuICAgICAgICBudW1IZWFkczogYXJncy5udW1IZWFkcyxcbiAgICAgICAgZHJvcG91dDogYXJncy5kcm9wb3V0LFxuICAgICAgICBsYXllck5vcm1FcHNpbG9uOiAxZS0wNSxcbiAgICAgICAgYWN0aXZhdGlvbjogZ2V0QWN0aXZhdGlvbignZ2VsdScpLFxuICAgICAgICBrZXJuZWxJbml0aWFsaXplcjogZ3B0Mktlcm5lbEluaXRpYWxpemVyKDAuMDIpLFxuICAgICAgICBub3JtYWxpemVGaXJzdDogdHJ1ZSxcbiAgICAgICAgbmFtZTogYHRyYW5zZm9ybWVyX2xheWVyXyR7aX1gLFxuICAgICAgfSkuYXBwbHkoeCwge2RlY29kZXJQYWRkaW5nTWFzazogcGFkZGluZ01hc2t9KSBhcyBTeW1ib2xpY1RlbnNvcjtcbiAgICB9XG5cbiAgICBjb25zdCBzZXF1ZW5jZU91dHB1dCA9IG5ldyBMYXllck5vcm1hbGl6YXRpb24oe1xuICAgICAgbmFtZTogJ2xheWVyX25vcm0nLFxuICAgICAgYXhpczogLTEsXG4gICAgICBlcHNpbG9uOiAxZS0wNSxcbiAgICAgIGR0eXBlOiAnZmxvYXQzMicsXG4gICAgfSkuYXBwbHkoeCkgYXMgU3ltYm9saWNUZW5zb3I7XG5cbiAgICAvLyBJbnN0YW50aWF0ZSB1c2luZyBGdW5jdGlvbmFsIEFQSSBNb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICBzdXBlcih7XG4gICAgICBpbnB1dHM6IFt0b2tlbklkcywgcGFkZGluZ01hc2tdLFxuICAgICAgb3V0cHV0czogc2VxdWVuY2VPdXRwdXQsXG4gICAgICBuYW1lOiAnZ3B0Ml9iYWNrYm9uZSdcbiAgICB9KTtcbiAgICB0aGlzLnZvY2FidWxhcnlTaXplID0gYXJncy52b2NhYnVsYXJ5U2l6ZTtcbiAgICB0aGlzLm51bUxheWVycyA9IGFyZ3MubnVtTGF5ZXJzO1xuICAgIHRoaXMubnVtSGVhZHMgPSBhcmdzLm51bUhlYWRzO1xuICAgIHRoaXMuaGlkZGVuRGltID0gYXJncy5oaWRkZW5EaW07XG4gICAgdGhpcy5pbnRlcm1lZGlhdGVEaW0gPSBhcmdzLmludGVybWVkaWF0ZURpbTtcbiAgICB0aGlzLmRyb3BvdXQgPSBhcmdzLmRyb3BvdXQgPz8gMC4xO1xuICAgIHRoaXMubWF4U2VxdWVuY2VMZW5ndGggPSBhcmdzLm1heFNlcXVlbmNlTGVuZ3RoID8/IDEwMjQ7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHtcbiAgICAgIHZvY2FidWxhcnlTaXplOiB0aGlzLnZvY2FidWxhcnlTaXplLFxuICAgICAgbnVtTGF5ZXJzOiB0aGlzLm51bUxheWVycyxcbiAgICAgIG51bUhlYWRzOiB0aGlzLm51bUhlYWRzLFxuICAgICAgaGlkZGVuRGltOiB0aGlzLmhpZGRlbkRpbSxcbiAgICAgIGludGVybWVkaWF0ZURpbTogdGhpcy5pbnRlcm1lZGlhdGVEaW0sXG4gICAgICBkcm9wb3V0OiB0aGlzLmRyb3BvdXQsXG4gICAgICBtYXhTZXF1ZW5jZUxlbmd0aDogdGhpcy5tYXhTZXF1ZW5jZUxlbmd0aCxcbiAgICB9O1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBPYmplY3QuYXNzaWduKGNvbmZpZywgYmFzZUNvbmZpZyk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCB0b2tlbkVtYmVkZGluZygpOiBFbWJlZGRpbmcge1xuICAgIHJldHVybiB0aGlzLmdldExheWVyKCd0b2tlbl9lbWJlZGRpbmcnKSBhcyBFbWJlZGRpbmc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhHUFQyQmFja2JvbmUpO1xuIl19