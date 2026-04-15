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
 *  Transformer decoder block implementation based on TFJS `Layer`.
 */
/* Original source: keras_nlp/layers/modeling/transformer_decoder.py */
import { add, serialization, tidy } from '@tensorflow/tfjs-core';
import { getActivation, serializeActivation } from '../../../activations';
import { Layer, } from '../../../engine/topology';
import { ValueError } from '../../../errors';
import { getInitializer, serializeInitializer } from '../../../initializers';
import { Dense, Dropout } from '../../core';
import { LayerNormalization } from '../../normalization';
import { CachedMultiHeadAttention } from './cached_multihead_attention';
import { computeCausalMask, mergePaddingAndAttentionMask } from './transformer_layer_utils';
/**
 * Transformer decoder.
 *
 * This class follows the architecture of the transformer decoder layer in the
 * paper [Attention is All You Need](https://arxiv.org/abs/1706.03762). Users
 * can instantiate multiple instances of this class to stack up a decoder.
 *
 * By default, this layer will apply a causal mask to the decoder attention
 * layer. This layer will correctly compute an attention mask from an implicit
 * padding mask (for example, by passing `maskZero=true` to a
 * `tf.layers.embedding` layer). See the Masking and Padding
 * [guide](https://keras.io/guides/understanding_masking_and_padding/)
 * for more details.
 *
 * This layer can be called with either one or two inputs. The number of inputs
 * must be consistent across all calls. The options are as follows:
 *    `layer.call(decoderSequence)`: no cross-attention will be built into the
 *         decoder block. This is useful when building a "decoder-only"
 *         transformer such as GPT-2.
 *    `layer.call(decoderSequence, {encoderSequence})`: cross-attention will be
 *         built into the decoder block. This is useful when building an
 *         "encoder-decoder" transformer, such as the original transformer
 *         model described in Attention is All You Need.
 *
 * Examples:
 * ```js
 * // Create a single transformer decoder layer.
 * const decoder = new TransformerDecoder({intermediateDim: 64, numHeads: 8});
 *
 * // Create a simple model containing the decoder.
 * const decoderInput = tf.input({shape: [10, 64]});
 * const encoderInput = tf.input({shape: {[10, 64]});
 * const output = decoder.call(decoderInput, {encoderInput});
 * const model = tf.model({
 *     inputs: [decoderInput, encoderInput],
 *     outputs: output,
 * );
 *
 * // Call decoder on the inputs.
 * const decoderInputData = tf.randomUniform([2, 10, 64]);
 * const encoderInputData = tf.randomUniform([2, 10, 64]);
 * const decoderOutput = model.predict([decoderInputData, encoderInputData]);
 * ```
 *
 * References:
 *  - [Vaswani et al., 2017](https://arxiv.org/abs/1706.03762)
 */
class TransformerDecoder extends Layer {
    constructor(args) {
        var _a, _b, _c, _d, _e, _f;
        super(args);
        this.intermediateDim = args.intermediateDim;
        this.numHeads = args.numHeads;
        this.dropout = (_a = args.dropout) !== null && _a !== void 0 ? _a : 0;
        this.activation = getActivation((_b = args.activation) !== null && _b !== void 0 ? _b : 'relu');
        this.layerNormEpsilon = (_c = args.layerNormEpsilon) !== null && _c !== void 0 ? _c : 1e-05;
        this.kernelInitializer =
            getInitializer((_d = args.kernelInitializer) !== null && _d !== void 0 ? _d : 'glorotUniform');
        this.biasInitializer = getInitializer((_e = args.biasInitializer) !== null && _e !== void 0 ? _e : 'zeros');
        this.normalizeFirst = (_f = args.normalizeFirst) !== null && _f !== void 0 ? _f : false;
    }
    /**
     *
     * @param inputShape decoderSequenceShape or
     *  [decoderSequenceShape, encoderSequenceShape]
     */
    build(inputShape) {
        if (Array.isArray(inputShape[0])) {
            // `inputShape` is of type [Shape, Shape].
            [this.decoderSequenceShape, this.encoderSequenceShape] =
                inputShape;
        }
        else {
            this.decoderSequenceShape = inputShape;
        }
        // Infer the dimension of our hidden feature size from the build shape.
        const hiddenDim = this.decoderSequenceShape[this.decoderSequenceShape.length - 1];
        // Attention head size is `hiddenDim` over the number of heads.
        const headDim = Math.floor(hiddenDim / this.numHeads);
        // Self attention layers.
        this.selfAttentionLayer = new CachedMultiHeadAttention({
            numHeads: this.numHeads,
            keyDim: headDim,
            dropout: this.dropout,
            kernelInitializer: getInitializer(this.kernelInitializer.getClassName()),
            biasInitializer: getInitializer(this.biasInitializer.getClassName()),
        });
        this.selfAttentionLayer.buildFromSignature(this.decoderSequenceShape, this.decoderSequenceShape);
        this.selfAttentionLayernorm =
            new LayerNormalization({ epsilon: this.layerNormEpsilon });
        this.selfAttentionLayernorm.build(this.decoderSequenceShape);
        this.selfAttentionDropout = new Dropout({ rate: this.dropout });
        // Cross attention layers are optional.
        // TODO(pforderique): Add cross attention layers.
        // Feedforward layers.
        this.feedforwardIntermediateDense = new Dense({
            units: this.intermediateDim,
            activation: this.activation.getClassName(),
            kernelInitializer: getInitializer(this.kernelInitializer.getClassName()),
            biasInitializer: getInitializer(this.biasInitializer.getClassName()),
        });
        this.feedforwardIntermediateDense.build(this.decoderSequenceShape);
        this.feedforwardOutputDense = new Dense({
            units: hiddenDim,
            kernelInitializer: getInitializer(this.kernelInitializer.getClassName()),
            biasInitializer: getInitializer(this.biasInitializer.getClassName()),
        });
        const intermediateShape = this.decoderSequenceShape.slice();
        intermediateShape[intermediateShape.length - 1] = this.intermediateDim;
        this.feedforwardOutputDense.build(intermediateShape);
        this.feedforwardLayernorm =
            new LayerNormalization({ epsilon: this.layerNormEpsilon });
        this.feedforwardLayernorm.build(this.decoderSequenceShape);
        this.feedforwardDropout = new Dropout({ rate: this.dropout });
        // Create layers based on input shape.
        this.built = true;
    }
    apply(decoderSequence, kwargs) {
        if (!this.built) {
            const decoderSequenceShape = decoderSequence.shape;
            const encoderSequenceShape = kwargs && kwargs.encoderSequence ? kwargs.encoderSequence.shape : null;
            this.build([decoderSequenceShape, encoderSequenceShape]);
        }
        return super.apply(decoderSequence, kwargs);
    }
    call(decoderSequence, kwargs) {
        return this.callAndReturnCaches(decoderSequence, kwargs)[0];
    }
    /**
     * Forward pass of the TransformerDecoder.
     *
     * @returns One of three things, depending on call arguments:
     *   - `[outputs, null, null]`, if `selfAttentionCache` is `null`.
     *   - `[outputs, selfAttentionCache, null]`, if `selfAttentionCache` is
     *     set and the layer has no cross-attention.
     *   - `[outputs, selfAttentionCache, crossAttentionCache]`, if
     *     `selfAttentionCache` and `crossAttentionCache` are set and
     *     the layer has cross-attention.
     */
    callAndReturnCaches(decoderSequence, kwargs) {
        return tidy(() => {
            const hasEncoderSequence = kwargs.encoderSequence != null;
            const hasCrossAttention = this.selfCrossAttentionLayer != null;
            if (!hasCrossAttention && hasEncoderSequence) {
                throw new ValueError('The number of call arguments to `TransformerDecoder` should ' +
                    'not change. Use `layer.apply(decoderSequence, {encoderSequence})` ' +
                    'to build a layer with cross attention, or ' +
                    '`layer.apply (decoderSequence)` to build a layer without. ' +
                    'This layer has been built without cross attention, but ' +
                    'you are trying to call it with encoderSequence.');
            }
            else if (hasCrossAttention && !hasEncoderSequence) {
                throw new ValueError('The number of call arguments to `TransformerDecoder` should not ' +
                    'change. Use `layer.apply(decoderSequence, {encoderSequence})` ' +
                    'to build a layer with cross attention, or ' +
                    '`layer.apply(decoderSequence)` to build a layer without. ' +
                    'This layer has been built with cross attention, but ' +
                    'you did not provide encoderSequence.');
            }
            const hasSelfAttentionCache = kwargs.selfAttentionCache != null;
            const hasCrossAttentionCache = kwargs.crossAttentionCache != null;
            if (hasCrossAttention && (hasSelfAttentionCache !== hasCrossAttentionCache)) {
                throw new ValueError('When calling `TransformerDecoder` with cross-attention (with both ' +
                    '`encoderSequence` and `decoderSequence`), `selfAttentionCache` ' +
                    'and `crossAttentionCache` should both be set or both be `null`.  ' +
                    'One cannot be `null` while the other is not. Received: ' +
                    `selfAttentionCache=${kwargs.selfAttentionCache}, ` +
                    `crossAttentionCache=${kwargs.crossAttentionCache}.`);
            }
            const selfAttentionMask = this.computeSelfAttentionMask(decoderSequence, kwargs.decoderPaddingMask, kwargs.decoderAttentionMask, kwargs.useCausalMask, kwargs.selfAttentionCache, kwargs.selfAttentionCacheUpdateIndex);
            let x = decoderSequence; // Intermediate result.
            let selfAttentionCache = kwargs.selfAttentionCache;
            // Self attention block.
            let residual = x;
            if (this.normalizeFirst) {
                x = this.selfAttentionLayernorm.apply(x);
            }
            [x, selfAttentionCache] = this.selfAttentionLayer.callAndReturnCache(x, {
                value: x,
                attentionMask: selfAttentionMask,
                cache: selfAttentionCache,
                cacheUpdateIndex: kwargs.selfAttentionCacheUpdateIndex,
            });
            x = this.selfAttentionDropout.apply(x);
            x = add(x, residual);
            if (!this.normalizeFirst) {
                x = this.selfAttentionLayernorm.apply(x);
            }
            // Cross attention is optional.
            // TODO(pforderique): Add cross attention logic for encoder-decoder arch.
            // Feedforward block.
            residual = x;
            if (this.normalizeFirst) {
                x = this.selfAttentionLayernorm.apply(x);
            }
            x = this.feedforwardIntermediateDense.apply(x);
            x = this.feedforwardOutputDense.apply(x);
            x = this.feedforwardDropout.apply(x);
            x = add(x, residual);
            if (!this.normalizeFirst) {
                x = this.selfAttentionLayernorm.apply(x);
            }
            if (selfAttentionCache != null) {
                if (hasCrossAttention) {
                    return [x, selfAttentionCache, kwargs.crossAttentionCache];
                }
                else {
                    return [x, selfAttentionCache, null];
                }
            }
            return [x, null, null];
        });
    }
    computeSelfAttentionMask(decoderSequence, decoderPaddingMask, decoderAttentionMask, useCasualMask, selfAttentionCache, selfAttentionCacheUpdateIndex) {
        const decoderMask = mergePaddingAndAttentionMask(decoderSequence, decoderPaddingMask, decoderAttentionMask);
        if (useCasualMask) {
            const batchSize = decoderSequence.shape[0];
            let inputLength = decoderSequence.shape[1];
            const outputLength = decoderSequence.shape[1];
            // We need to handle a rectangular causal mask when doing cached
            // decoding. For generative inference, `decoderSequence` will
            // generally be length 1, and `cache` will be the full generation length.
            if (selfAttentionCache != null) {
                inputLength = selfAttentionCache.shape[2];
            }
            const causalMask = computeCausalMask(batchSize, inputLength, outputLength, selfAttentionCacheUpdateIndex !== null && selfAttentionCacheUpdateIndex !== void 0 ? selfAttentionCacheUpdateIndex : 0);
            return decoderMask != null ? decoderMask.minimum(causalMask) : causalMask;
        }
        return decoderMask;
    }
    getConfig() {
        const config = {
            'intermediateDim': this.intermediateDim,
            'numHeads': this.numHeads,
            'dropout': this.dropout,
            'activation': serializeActivation(this.activation),
            'layerNormEpsilon': this.layerNormEpsilon,
            'kernelInitializer': serializeInitializer(this.kernelInitializer),
            'biasInitializer': serializeInitializer(this.biasInitializer),
            'normalizeFirst': this.normalizeFirst,
            'decoderSequenceShape': this.decoderSequenceShape,
            'encoderSequenceShape': this.encoderSequenceShape,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    computeOutputShape(decoderSequenceShape) {
        return decoderSequenceShape;
    }
}
/** @nocollapse */
TransformerDecoder.className = 'TransformerDecoder';
export { TransformerDecoder };
serialization.registerClass(TransformerDecoder);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXJfZGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvbmxwL21vZGVsaW5nL3RyYW5zZm9ybWVyX2RlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUg7O0dBRUc7QUFFSCx1RUFBdUU7QUFDdkUsT0FBTyxFQUFVLEdBQUcsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFekUsT0FBTyxFQUFjLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxLQUFLLEdBQThCLE1BQU0sMEJBQTBCLENBQUM7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzdDLE9BQU8sRUFBc0MsY0FBYyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakgsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFekQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUE0SDVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBOENHO0FBQ0gsTUFBYSxrQkFBbUIsU0FBUSxLQUFLO0lBNEIzQyxZQUFZLElBQTRCOztRQUN0QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDWixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDNUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENB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QyxVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDekIsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3ZCLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2xELGtCQUFrQixFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDekMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ2pFLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDN0QsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDckMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtZQUNqRCxzQkFBc0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1NBQ2xELENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVRLGtCQUFrQixDQUFDLG9CQUEyQjtRQUNyRCxPQUFPLG9CQUFvQixDQUFDO0lBQzlCLENBQUM7O0FBN1JELGtCQUFrQjtBQUNGLDRCQUFTLEdBQUcsb0JBQW9CLENBQUM7U0FGdEMsa0JBQWtCO0FBZ1MvQixhQUFhLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogIFRyYW5zZm9ybWVyIGRlY29kZXIgYmxvY2sgaW1wbGVtZW50YXRpb24gYmFzZWQgb24gVEZKUyBgTGF5ZXJgLlxuICovXG5cbi8qIE9yaWdpbmFsIHNvdXJjZToga2VyYXNfbmxwL2xheWVycy9tb2RlbGluZy90cmFuc2Zvcm1lcl9kZWNvZGVyLnB5ICovXG5pbXBvcnQgeyBUZW5zb3IsIGFkZCwgc2VyaWFsaXphdGlvbiwgdGlkeSB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7IEFjdGl2YXRpb24sIGdldEFjdGl2YXRpb24sIHNlcmlhbGl6ZUFjdGl2YXRpb24gfSBmcm9tICcuLi8uLi8uLi9hY3RpdmF0aW9ucyc7XG5pbXBvcnQgeyBMYXllciwgTGF5ZXJBcmdzLCBTeW1ib2xpY1RlbnNvciwgfSBmcm9tICcuLi8uLi8uLi9lbmdpbmUvdG9wb2xvZ3knO1xuaW1wb3J0IHsgVmFsdWVFcnJvciB9IGZyb20gJy4uLy4uLy4uL2Vycm9ycyc7XG5pbXBvcnQgeyBJbml0aWFsaXplciwgSW5pdGlhbGl6ZXJJZGVudGlmaWVyLCBnZXRJbml0aWFsaXplciwgc2VyaWFsaXplSW5pdGlhbGl6ZXIgfSBmcm9tICcuLi8uLi8uLi9pbml0aWFsaXplcnMnO1xuaW1wb3J0IHsgQWN0aXZhdGlvbklkZW50aWZpZXIgfSBmcm9tICcuLi8uLi8uLi9rZXJhc19mb3JtYXQvYWN0aXZhdGlvbl9jb25maWcnO1xuaW1wb3J0IHsgU2hhcGUgfSBmcm9tICcuLi8uLi8uLi9rZXJhc19mb3JtYXQvY29tbW9uJztcbmltcG9ydCB7IERlbnNlLCBEcm9wb3V0IH0gZnJvbSAnLi4vLi4vY29yZSc7XG5pbXBvcnQgeyBMYXllck5vcm1hbGl6YXRpb24gfSBmcm9tICcuLi8uLi9ub3JtYWxpemF0aW9uJztcblxuaW1wb3J0IHsgQ2FjaGVkTXVsdGlIZWFkQXR0ZW50aW9uIH0gZnJvbSAnLi9jYWNoZWRfbXVsdGloZWFkX2F0dGVudGlvbic7XG5pbXBvcnQgeyBjb21wdXRlQ2F1c2FsTWFzaywgbWVyZ2VQYWRkaW5nQW5kQXR0ZW50aW9uTWFzayB9IGZyb20gJy4vdHJhbnNmb3JtZXJfbGF5ZXJfdXRpbHMnO1xuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgVHJhbnNmb3JtZXJEZWNvZGVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBJbnRlZ2VyLiBUaGUgaGlkZGVuIHNpemUgb2YgZmVlZGZvcndhcmQgbmV0d29yay5cbiAgICovXG4gIGludGVybWVkaWF0ZURpbTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbnRlZ2VyLiBUaGUgbnVtYmVyIG9mIGhlYWRzIGluIE11bHRpSGVhZEF0dGVudGlvbi5cbiAgICovXG4gIG51bUhlYWRzOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBkcm9wb3V0IHZhbHVlLCBzaGFyZWQgYnkgTXVsdGlIZWFkQXR0ZW50aW9uIGFuZCBmZWVkZm9yd2FyZCBuZXR3b3JrLlxuICAgKiBEZWZhdWx0cyB0byBgMC5gLlxuICAgKi9cbiAgZHJvcG91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIGFjdGl2YXRpb24gZnVuY3Rpb24gb2YgZmVlZGZvcndhcmQgbmV0d29yay5cbiAgICogRGVmYXVsdHMgdG8gYFwicmVsdVwiYC5cbiAgICovXG4gIGFjdGl2YXRpb24/OiBBY3RpdmF0aW9ufEFjdGl2YXRpb25JZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBUaGUgZXBzIHZhbHVlIGluIGxheWVyIG5vcm1hbGl6YXRpb24gY29tcG9uZW50cy5cbiAgICogRGVmYXVsdHMgdG8gYDFlLTVgLlxuICAgKi9cbiAgbGF5ZXJOb3JtRXBzaWxvbj86IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIGtlcm5lbCBpbml0aWFsaXplciBmb3IgdGhlIGRlbnNlIGFuZCBtdWx0aWhlYWRlZCBhdHRlbnRpb24gbGF5ZXJzLlxuICAgKiBEZWZhdWx0cyB0byBgXCJnbG9yb3RVbmlmb3JtXCJgLlxuICAgKi9cbiAga2VybmVsSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcnxJbml0aWFsaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBiaWFzIGluaXRpYWxpemVyIGZvciB0aGUgZGVuc2UgYW5kIG11bHRpaGVhZGVkIGF0dGVudGlvbiBsYXllcnMuXG4gICAqIERlZmF1bHRzIHRvIGBcInplcm9zXCJgLlxuICAgKi9cbiAgYmlhc0luaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJ8SW5pdGlhbGl6ZXJJZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCB0aGUgaW5wdXRzIHRvIHRoZSBhdHRlbnRpb24gbGF5ZXIocykgYW5kIHRoZSBpbnRlcm1lZGlhdGUgZGVuc2VcbiAgICogbGF5ZXIgYXJlIG5vcm1hbGl6ZWQgKHNpbWlsYXIgdG8gR1BULTIpLiBJZiBzZXQgdG8gZmFsc2UsIG91dHB1dHMgb2ZcbiAgICogYXR0ZW50aW9uIGxheWVyIGFuZCBpbnRlcm1lZGlhdGUgZGVuc2UgbGF5ZXIgYXJlIG5vcm1hbGl6ZWRcbiAgICogKHNpbWlsYXIgdG8gQkVSVCkuXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAuXG4gICAqL1xuICBub3JtYWxpemVGaXJzdD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBUcmFuc2Zvcm1lckRlY29kZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIGRlY29kZXJTZXF1ZW5jZTogVGhlIGRlY29kZSBpbnB1dCBzZXF1ZW5jZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIFRoZSBlbmNvZGVyIGlucHV0IHNlcXVlbmNlLiBGb3IgZGVjb2RlciBvbmx5IG1vZGVscyAobGlrZSBHUFQyKSwgdGhpc1xuICAgKiBzaG91bGQgYmUgbGVmdCBgbnVsbGAuIE9uY2UgdGhlIG1vZGVsIGlzIGNhbGxlZCB3aXRob3V0IGFuIGVuY29kZXJTZXF1ZW5jZSxcbiAgICogeW91IGNhbm5vdCBjYWxsIGl0IGFnYWluIHdpdGggZW5jb2RlclNlcXVlbmNlLlxuICAgKi9cbiAgZW5jb2RlclNlcXVlbmNlPzogVGVuc29yfFN5bWJvbGljVGVuc29yO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gVGVuc29yLCB0aGUgcGFkZGluZyBtYXNrIG9mIGRlY29kZXIgc2VxdWVuY2UsIG11c3QgYmUgb2Ygc2hhcGVcbiAgICogYFtiYXRjaFNpemUsIGRlY29kZXJTZXF1ZW5jZUxlbmd0aF1gLlxuICAgKi9cbiAgZGVjb2RlclBhZGRpbmdNYXNrPzogVGVuc29yfFN5bWJvbGljVGVuc29yO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gVGVuc29yLiBDdXN0b21pemVkIGRlY29kZXIgc2VxdWVuY2UgbWFzaywgbXVzdCBiZSBvZiBzaGFwZVxuICAgKiBgW2JhdGNoU2l6ZSwgZGVjb2RlclNlcXVlbmNlTGVuZ3RoLCBkZWNvZGVyU2VxdWVuY2VMZW5ndGhdYC5cbiAgICovXG4gIGRlY29kZXJBdHRlbnRpb25NYXNrPzogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gVGVuc29yLCB0aGUgcGFkZGluZyBtYXNrIG9mIGVuY29kZXIgc2VxdWVuY2UsIG11c3QgYmUgb2Ygc2hhcGVcbiAgICogYFtiYXRjaFNpemUsIGVuY29kZXJTZXF1ZW5jZUxlbmd0aF1gLlxuICAgKi9cbiAgZW5jb2RlclBhZGRpbmdNYXNrPzogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gVGVuc29yLiBDdXN0b21pemVkIGVuY29kZXIgc2VxdWVuY2UgbWFzaywgbXVzdCBiZSBvZiBzaGFwZVxuICAgKiBgW2JhdGNoU2l6ZSwgZW5jb2RlclNlcXVlbmNlTGVuZ3RoLCBlbmNvZGVyU2VxdWVuY2VMZW5ndGhdYC5cbiAgICovXG4gIGVuY29kZXJBdHRlbnRpb25NYXNrPzogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBBIGRlbnNlIGZsb2F0IFRlbnNvci4gVGhlIGNhY2hlIG9mIGtleS92YWx1ZXMgcGFpcnMgaW4gdGhlIHNlbGYtYXR0ZW50aW9uXG4gICAqIGxheWVyLiBIYXMgc2hhcGUgYFtiYXRjaFNpemUsIDIsIG1heFNlcUxlbiwgbnVtSGVhZHMsIGtleURpbXNdYC5cbiAgICovXG4gIHNlbGZBdHRlbnRpb25DYWNoZT86IFRlbnNvcjtcblxuICAvKipcbiAgICogSW50ZWdlciBvciBJbnRlZ2VyIFRlbnNvci4gVGhlIGluZGV4IGF0IHdoaWNoIHRvIHVwZGF0ZSB0aGVcbiAgICogYHNlbGZBdHRlbnRpb25DYWNoZWAuIFVzdWFsbHksIHRoaXMgaXMgdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHRva2VuXG4gICAqIGJlaW5nIHByb2Nlc3NlZCBkdXJpbmcgZGVjb2RpbmcuXG4gICAqL1xuICBzZWxmQXR0ZW50aW9uQ2FjaGVVcGRhdGVJbmRleD86IG51bWJlcjtcblxuICAvKipcbiAgICogQSBkZW5zZSBmbG9hdCBUZW5zb3IuIFRoZSBjYWNoZSBvZiBrZXkvdmFsdWUgcGFpcnMgaW4gdGhlIGNyb3NzLWF0dGVudGlvblxuICAgKiBsYXllci4gSGFzIHNoYXBlIGBbYmF0Y2hTaXplLCAyLCBTLCBudW1IZWFkcywga2V5RGltc11gLlxuICAgKi9cbiAgY3Jvc3NBdHRlbnRpb25DYWNoZT86IFRlbnNvcjtcblxuICAvKipcbiAgICogSW50ZWdlciBvciBJbnRlZ2VyIFRlbnNvci4gVGhlIGluZGV4IGF0IHdoaWNoIHRvIHVwZGF0ZSB0aGVcbiAgICogYGNyb3NzQXR0ZW50aW9uQ2FjaGVgLiBVc3VhbGx5LCB0aGlzIGlzIGVpdGhlciBgMGAgKGNvbXB1dGUgdGhlIGVudGlyZVxuICAgKiBgY3Jvc3NBdHRlbnRpb25DYWNoZWApLCBvciBgbnVsbGAgKHJldXNlIGEgcHJldmlvdXNseSBjb21wdXRlZFxuICAgKiBgY3Jvc3NBdHRlbnRpb25DYWNoZWApLlxuICAgKi9cbiAgY3Jvc3NBdHRlbnRpb25DYWNoZVVwZGF0ZUluZGV4PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBhIGNhdXNhbCBtYXNrIChtYXNraW5nIG91dCBmdXR1cmUgaW5wdXQpIGlzIGFwcGxpZWQgb24gdGhlIGRlY29kZXJcbiAgICogc2VxdWVuY2UuXG4gICAqIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIHVzZUNhdXNhbE1hc2s/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybWVyIGRlY29kZXIuXG4gKlxuICogVGhpcyBjbGFzcyBmb2xsb3dzIHRoZSBhcmNoaXRlY3R1cmUgb2YgdGhlIHRyYW5zZm9ybWVyIGRlY29kZXIgbGF5ZXIgaW4gdGhlXG4gKiBwYXBlciBbQXR0ZW50aW9uIGlzIEFsbCBZb3UgTmVlZF0oaHR0cHM6Ly9hcnhpdi5vcmcvYWJzLzE3MDYuMDM3NjIpLiBVc2Vyc1xuICogY2FuIGluc3RhbnRpYXRlIG11bHRpcGxlIGluc3RhbmNlcyBvZiB0aGlzIGNsYXNzIHRvIHN0YWNrIHVwIGEgZGVjb2Rlci5cbiAqXG4gKiBCeSBkZWZhdWx0LCB0aGlzIGxheWVyIHdpbGwgYXBwbHkgYSBjYXVzYWwgbWFzayB0byB0aGUgZGVjb2RlciBhdHRlbnRpb25cbiAqIGxheWVyLiBUaGlzIGxheWVyIHdpbGwgY29ycmVjdGx5IGNvbXB1dGUgYW4gYXR0ZW50aW9uIG1hc2sgZnJvbSBhbiBpbXBsaWNpdFxuICogcGFkZGluZyBtYXNrIChmb3IgZXhhbXBsZSwgYnkgcGFzc2luZyBgbWFza1plcm89dHJ1ZWAgdG8gYVxuICogYHRmLmxheWVycy5lbWJlZGRpbmdgIGxheWVyKS4gU2VlIHRoZSBNYXNraW5nIGFuZCBQYWRkaW5nXG4gKiBbZ3VpZGVdKGh0dHBzOi8va2VyYXMuaW8vZ3VpZGVzL3VuZGVyc3RhbmRpbmdfbWFza2luZ19hbmRfcGFkZGluZy8pXG4gKiBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFRoaXMgbGF5ZXIgY2FuIGJlIGNhbGxlZCB3aXRoIGVpdGhlciBvbmUgb3IgdHdvIGlucHV0cy4gVGhlIG51bWJlciBvZiBpbnB1dHNcbiAqIG11c3QgYmUgY29uc2lzdGVudCBhY3Jvc3MgYWxsIGNhbGxzLiBUaGUgb3B0aW9ucyBhcmUgYXMgZm9sbG93czpcbiAqICAgIGBsYXllci5jYWxsKGRlY29kZXJTZXF1ZW5jZSlgOiBubyBjcm9zcy1hdHRlbnRpb24gd2lsbCBiZSBidWlsdCBpbnRvIHRoZVxuICogICAgICAgICBkZWNvZGVyIGJsb2NrLiBUaGlzIGlzIHVzZWZ1bCB3aGVuIGJ1aWxkaW5nIGEgXCJkZWNvZGVyLW9ubHlcIlxuICogICAgICAgICB0cmFuc2Zvcm1lciBzdWNoIGFzIEdQVC0yLlxuICogICAgYGxheWVyLmNhbGwoZGVjb2RlclNlcXVlbmNlLCB7ZW5jb2RlclNlcXVlbmNlfSlgOiBjcm9zcy1hdHRlbnRpb24gd2lsbCBiZVxuICogICAgICAgICBidWlsdCBpbnRvIHRoZSBkZWNvZGVyIGJsb2NrLiBUaGlzIGlzIHVzZWZ1bCB3aGVuIGJ1aWxkaW5nIGFuXG4gKiAgICAgICAgIFwiZW5jb2Rlci1kZWNvZGVyXCIgdHJhbnNmb3JtZXIsIHN1Y2ggYXMgdGhlIG9yaWdpbmFsIHRyYW5zZm9ybWVyXG4gKiAgICAgICAgIG1vZGVsIGRlc2NyaWJlZCBpbiBBdHRlbnRpb24gaXMgQWxsIFlvdSBOZWVkLlxuICpcbiAqIEV4YW1wbGVzOlxuICogYGBganNcbiAqIC8vIENyZWF0ZSBhIHNpbmdsZSB0cmFuc2Zvcm1lciBkZWNvZGVyIGxheWVyLlxuICogY29uc3QgZGVjb2RlciA9IG5ldyBUcmFuc2Zvcm1lckRlY29kZXIoe2ludGVybWVkaWF0ZURpbTogNjQsIG51bUhlYWRzOiA4fSk7XG4gKlxuICogLy8gQ3JlYXRlIGEgc2ltcGxlIG1vZGVsIGNvbnRhaW5pbmcgdGhlIGRlY29kZXIuXG4gKiBjb25zdCBkZWNvZGVySW5wdXQgPSB0Zi5pbnB1dCh7c2hhcGU6IFsxMCwgNjRdfSk7XG4gKiBjb25zdCBlbmNvZGVySW5wdXQgPSB0Zi5pbnB1dCh7c2hhcGU6IHtbMTAsIDY0XX0pO1xuICogY29uc3Qgb3V0cHV0ID0gZGVjb2Rlci5jYWxsKGRlY29kZXJJbnB1dCwge2VuY29kZXJJbnB1dH0pO1xuICogY29uc3QgbW9kZWwgPSB0Zi5tb2RlbCh7XG4gKiAgICAgaW5wdXRzOiBbZGVjb2RlcklucHV0LCBlbmNvZGVySW5wdXRdLFxuICogICAgIG91dHB1dHM6IG91dHB1dCxcbiAqICk7XG4gKlxuICogLy8gQ2FsbCBkZWNvZGVyIG9uIHRoZSBpbnB1dHMuXG4gKiBjb25zdCBkZWNvZGVySW5wdXREYXRhID0gdGYucmFuZG9tVW5pZm9ybShbMiwgMTAsIDY0XSk7XG4gKiBjb25zdCBlbmNvZGVySW5wdXREYXRhID0gdGYucmFuZG9tVW5pZm9ybShbMiwgMTAsIDY0XSk7XG4gKiBjb25zdCBkZWNvZGVyT3V0cHV0ID0gbW9kZWwucHJlZGljdChbZGVjb2RlcklucHV0RGF0YSwgZW5jb2RlcklucHV0RGF0YV0pO1xuICogYGBgXG4gKlxuICogUmVmZXJlbmNlczpcbiAqICAtIFtWYXN3YW5pIGV0IGFsLiwgMjAxN10oaHR0cHM6Ly9hcnhpdi5vcmcvYWJzLzE3MDYuMDM3NjIpXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2Zvcm1lckRlY29kZXIgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgcmVhZG9ubHkgY2xhc3NOYW1lID0gJ1RyYW5zZm9ybWVyRGVjb2Rlcic7XG5cbiAgcHJvdGVjdGVkIGludGVybWVkaWF0ZURpbTogbnVtYmVyO1xuICBwcm90ZWN0ZWQgbnVtSGVhZHM6IG51bWJlcjtcbiAgcHJvdGVjdGVkIGRyb3BvdXQ6IG51bWJlcjtcbiAgcHJvdGVjdGVkIGFjdGl2YXRpb246IEFjdGl2YXRpb247XG4gIHByb3RlY3RlZCBsYXllck5vcm1FcHNpbG9uOiBudW1iZXI7XG4gIHByb3RlY3RlZCBrZXJuZWxJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHByb3RlY3RlZCBiaWFzSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICBwcm90ZWN0ZWQgbm9ybWFsaXplRmlyc3Q6IGJvb2xlYW47XG4gIHByb3RlY3RlZCBkZWNvZGVyU2VxdWVuY2VTaGFwZTogU2hhcGU7XG4gIHByb3RlY3RlZCBlbmNvZGVyU2VxdWVuY2VTaGFwZTogU2hhcGU7XG5cbiAgcHJvdGVjdGVkIHNlbGZBdHRlbnRpb25MYXllcjogQ2FjaGVkTXVsdGlIZWFkQXR0ZW50aW9uO1xuICBwcm90ZWN0ZWQgc2VsZkF0dGVudGlvbkxheWVybm9ybTogTGF5ZXJOb3JtYWxpemF0aW9uO1xuICBwcm90ZWN0ZWQgc2VsZkF0dGVudGlvbkRyb3BvdXQ6IERyb3BvdXQ7XG5cbiAgcHJvdGVjdGVkIHNlbGZDcm9zc0F0dGVudGlvbkxheWVyOiBDYWNoZWRNdWx0aUhlYWRBdHRlbnRpb247XG4gIHByb3RlY3RlZCBzZWxmQ3Jvc3NBdHRlbnRpb25MYXllcm5vcm06IExheWVyTm9ybWFsaXphdGlvbjtcbiAgcHJvdGVjdGVkIHNlbGZDcm9zc0F0dGVudGlvbkRyb3BvdXQ6IERyb3BvdXQ7XG5cbiAgcHJvdGVjdGVkIGZlZWRmb3J3YXJkSW50ZXJtZWRpYXRlRGVuc2U6IERlbnNlO1xuICBwcm90ZWN0ZWQgZmVlZGZvcndhcmRPdXRwdXREZW5zZTogRGVuc2U7XG4gIHByb3RlY3RlZCBmZWVkZm9yd2FyZExheWVybm9ybTogTGF5ZXJOb3JtYWxpemF0aW9uO1xuICBwcm90ZWN0ZWQgZmVlZGZvcndhcmREcm9wb3V0OiBEcm9wb3V0O1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFRyYW5zZm9ybWVyRGVjb2RlckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICB0aGlzLmludGVybWVkaWF0ZURpbSA9IGFyZ3MuaW50ZXJtZWRpYXRlRGltO1xuICAgIHRoaXMubnVtSGVhZHMgPSBhcmdzLm51bUhlYWRzO1xuICAgIHRoaXMuZHJvcG91dCA9IGFyZ3MuZHJvcG91dCA/PyAwO1xuICAgIHRoaXMuYWN0aXZhdGlvbiA9IGdldEFjdGl2YXRpb24oYXJncy5hY3RpdmF0aW9uID8/ICdyZWx1Jyk7XG4gICAgdGhpcy5sYXllck5vcm1FcHNpbG9uID0gYXJncy5sYXllck5vcm1FcHNpbG9uID8/IDFlLTA1O1xuICAgIHRoaXMua2VybmVsSW5pdGlhbGl6ZXIgPVxuICAgICAgZ2V0SW5pdGlhbGl6ZXIoYXJncy5rZXJuZWxJbml0aWFsaXplciA/PyAnZ2xvcm90VW5pZm9ybScpO1xuICAgIHRoaXMuYmlhc0luaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoYXJncy5iaWFzSW5pdGlhbGl6ZXIgPz8gJ3plcm9zJyk7XG4gICAgdGhpcy5ub3JtYWxpemVGaXJzdCA9IGFyZ3Mubm9ybWFsaXplRmlyc3QgPz8gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGlucHV0U2hhcGUgZGVjb2RlclNlcXVlbmNlU2hhcGUgb3JcbiAgICogIFtkZWNvZGVyU2VxdWVuY2VTaGFwZSwgZW5jb2RlclNlcXVlbmNlU2hhcGVdXG4gICAqL1xuICBvdmVycmlkZSBidWlsZChpbnB1dFNoYXBlOiBTaGFwZXxbU2hhcGUsIFNoYXBlXSk6IHZvaWQge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGlucHV0U2hhcGVbMF0pKSB7XG4gICAgICAvLyBgaW5wdXRTaGFwZWAgaXMgb2YgdHlwZSBbU2hhcGUsIFNoYXBlXS5cbiAgICAgIFt0aGlzLmRlY29kZXJTZXF1ZW5jZVNoYXBlLCB0aGlzLmVuY29kZXJTZXF1ZW5jZVNoYXBlXSA9XG4gICAgICAgIGlucHV0U2hhcGUgYXMgW1NoYXBlLCBTaGFwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGVjb2RlclNlcXVlbmNlU2hhcGUgPSBpbnB1dFNoYXBlIGFzIFNoYXBlO1xuICAgIH1cbiAgICAvLyBJbmZlciB0aGUgZGltZW5zaW9uIG9mIG91ciBoaWRkZW4gZmVhdHVyZSBzaXplIGZyb20gdGhlIGJ1aWxkIHNoYXBlLlxuICAgIGNvbnN0IGhpZGRlbkRpbSA9XG4gICAgICB0aGlzLmRlY29kZXJTZXF1ZW5jZVNoYXBlW3RoaXMuZGVjb2RlclNlcXVlbmNlU2hhcGUubGVuZ3RoIC0gMV07XG4gICAgLy8gQXR0ZW50aW9uIGhlYWQgc2l6ZSBpcyBgaGlkZGVuRGltYCBvdmVyIHRoZSBudW1iZXIgb2YgaGVhZHMuXG4gICAgY29uc3QgaGVhZERpbSA9IE1hdGguZmxvb3IoaGlkZGVuRGltIC8gdGhpcy5udW1IZWFkcyk7XG5cbiAgICAvLyBTZWxmIGF0dGVudGlvbiBsYXllcnMuXG4gICAgdGhpcy5zZWxmQXR0ZW50aW9uTGF5ZXIgPSBuZXcgQ2FjaGVkTXVsdGlIZWFkQXR0ZW50aW9uKHtcbiAgICAgIG51bUhlYWRzOiB0aGlzLm51bUhlYWRzLFxuICAgICAga2V5RGltOiBoZWFkRGltLFxuICAgICAgZHJvcG91dDogdGhpcy5kcm9wb3V0LFxuICAgICAga2VybmVsSW5pdGlhbGl6ZXI6IGdldEluaXRpYWxpemVyKHRoaXMua2VybmVsSW5pdGlhbGl6ZXIuZ2V0Q2xhc3NOYW1lKCkpLFxuICAgICAgYmlhc0luaXRpYWxpemVyOiBnZXRJbml0aWFsaXplcih0aGlzLmJpYXNJbml0aWFsaXplci5nZXRDbGFzc05hbWUoKSksXG4gICAgfSk7XG5cbiAgICB0aGlzLnNlbGZBdHRlbnRpb25MYXllci5idWlsZEZyb21TaWduYXR1cmUoXG4gICAgICB0aGlzLmRlY29kZXJTZXF1ZW5jZVNoYXBlLCB0aGlzLmRlY29kZXJTZXF1ZW5jZVNoYXBlKTtcblxuICAgIHRoaXMuc2VsZkF0dGVudGlvbkxheWVybm9ybSA9XG4gICAgICBuZXcgTGF5ZXJOb3JtYWxpemF0aW9uKHtlcHNpbG9uOiB0aGlzLmxheWVyTm9ybUVwc2lsb259KTtcblxuICAgIHRoaXMuc2VsZkF0dGVudGlvbkxheWVybm9ybS5idWlsZCh0aGlzLmRlY29kZXJTZXF1ZW5jZVNoYXBlKTtcbiAgICB0aGlzLnNlbGZBdHRlbnRpb25Ecm9wb3V0ID0gbmV3IERyb3BvdXQoe3JhdGU6IHRoaXMuZHJvcG91dH0pO1xuXG4gICAgLy8gQ3Jvc3MgYXR0ZW50aW9uIGxheWVycyBhcmUgb3B0aW9uYWwuXG4gICAgLy8gVE9ETyhwZm9yZGVyaXF1ZSk6IEFkZCBjcm9zcyBhdHRlbnRpb24gbGF5ZXJzLlxuXG4gICAgLy8gRmVlZGZvcndhcmQgbGF5ZXJzLlxuICAgIHRoaXMuZmVlZGZvcndhcmRJbnRlcm1lZGlhdGVEZW5zZSA9IG5ldyBEZW5zZSh7XG4gICAgICB1bml0czogdGhpcy5pbnRlcm1lZGlhdGVEaW0sXG4gICAgICBhY3RpdmF0aW9uOiB0aGlzLmFjdGl2YXRpb24uZ2V0Q2xhc3NOYW1lKCkgYXMgQWN0aXZhdGlvbklkZW50aWZpZXIsXG4gICAgICBrZXJuZWxJbml0aWFsaXplcjogZ2V0SW5pdGlhbGl6ZXIodGhpcy5rZXJuZWxJbml0aWFsaXplci5nZXRDbGFzc05hbWUoKSksXG4gICAgICBiaWFzSW5pdGlhbGl6ZXI6IGdldEluaXRpYWxpemVyKHRoaXMuYmlhc0luaXRpYWxpemVyLmdldENsYXNzTmFtZSgpKSxcbiAgICB9KTtcbiAgICB0aGlzLmZlZWRmb3J3YXJkSW50ZXJtZWRpYXRlRGVuc2UuYnVpbGQodGhpcy5kZWNvZGVyU2VxdWVuY2VTaGFwZSk7XG4gICAgdGhpcy5mZWVkZm9yd2FyZE91dHB1dERlbnNlID0gbmV3IERlbnNlKHtcbiAgICAgIHVuaXRzOiBoaWRkZW5EaW0sXG4gICAgICBrZXJuZWxJbml0aWFsaXplcjogZ2V0SW5pdGlhbGl6ZXIodGhpcy5rZXJuZWxJbml0aWFsaXplci5nZXRDbGFzc05hbWUoKSksXG4gICAgICBiaWFzSW5pdGlhbGl6ZXI6IGdldEluaXRpYWxpemVyKHRoaXMuYmlhc0luaXRpYWxpemVyLmdldENsYXNzTmFtZSgpKSxcbiAgICB9KTtcbiAgICBjb25zdCBpbnRlcm1lZGlhdGVTaGFwZSA9IHRoaXMuZGVjb2RlclNlcXVlbmNlU2hhcGUuc2xpY2UoKTtcbiAgICBpbnRlcm1lZGlhdGVTaGFwZVtpbnRlcm1lZGlhdGVTaGFwZS5sZW5ndGggLSAxXSA9IHRoaXMuaW50ZXJtZWRpYXRlRGltO1xuICAgIHRoaXMuZmVlZGZvcndhcmRPdXRwdXREZW5zZS5idWlsZChpbnRlcm1lZGlhdGVTaGFwZSk7XG4gICAgdGhpcy5mZWVkZm9yd2FyZExheWVybm9ybSA9XG4gICAgICBuZXcgTGF5ZXJOb3JtYWxpemF0aW9uKHtlcHNpbG9uOiB0aGlzLmxheWVyTm9ybUVwc2lsb259KTtcbiAgICB0aGlzLmZlZWRmb3J3YXJkTGF5ZXJub3JtLmJ1aWxkKHRoaXMuZGVjb2RlclNlcXVlbmNlU2hhcGUpO1xuICAgIHRoaXMuZmVlZGZvcndhcmREcm9wb3V0ID0gbmV3IERyb3BvdXQoe3JhdGU6IHRoaXMuZHJvcG91dH0pO1xuICAgIC8vIENyZWF0ZSBsYXllcnMgYmFzZWQgb24gaW5wdXQgc2hhcGUuXG4gICAgdGhpcy5idWlsdCA9IHRydWU7XG4gIH1cblxuICBvdmVycmlkZSBhcHBseShcbiAgICAgIGRlY29kZXJTZXF1ZW5jZTogVGVuc29yfFN5bWJvbGljVGVuc29yLFxuICAgICAga3dhcmdzPzogVHJhbnNmb3JtZXJEZWNvZGVyT3B0aW9ucyk6IFRlbnNvcnxTeW1ib2xpY1RlbnNvciB7XG4gICAgaWYgKCF0aGlzLmJ1aWx0KSB7XG4gICAgICBjb25zdCBkZWNvZGVyU2VxdWVuY2VTaGFwZSA9IGRlY29kZXJTZXF1ZW5jZS5zaGFwZTtcbiAgICAgIGNvbnN0IGVuY29kZXJTZXF1ZW5jZVNoYXBlID1cbiAgICAgICAga3dhcmdzICYmIGt3YXJncy5lbmNvZGVyU2VxdWVuY2UgPyBrd2FyZ3MuZW5jb2RlclNlcXVlbmNlLnNoYXBlIDogbnVsbDtcbiAgICAgIHRoaXMuYnVpbGQoW2RlY29kZXJTZXF1ZW5jZVNoYXBlLCBlbmNvZGVyU2VxdWVuY2VTaGFwZV0pO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuYXBwbHkoZGVjb2RlclNlcXVlbmNlLCBrd2FyZ3MpIGFzIFRlbnNvcnxTeW1ib2xpY1RlbnNvcjtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoXG4gICAgICBkZWNvZGVyU2VxdWVuY2U6IFRlbnNvciwga3dhcmdzOiBUcmFuc2Zvcm1lckRlY29kZXJPcHRpb25zKTogVGVuc29yIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQW5kUmV0dXJuQ2FjaGVzKGRlY29kZXJTZXF1ZW5jZSwga3dhcmdzKVswXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3J3YXJkIHBhc3Mgb2YgdGhlIFRyYW5zZm9ybWVyRGVjb2Rlci5cbiAgICpcbiAgICogQHJldHVybnMgT25lIG9mIHRocmVlIHRoaW5ncywgZGVwZW5kaW5nIG9uIGNhbGwgYXJndW1lbnRzOlxuICAgKiAgIC0gYFtvdXRwdXRzLCBudWxsLCBudWxsXWAsIGlmIGBzZWxmQXR0ZW50aW9uQ2FjaGVgIGlzIGBudWxsYC5cbiAgICogICAtIGBbb3V0cHV0cywgc2VsZkF0dGVudGlvbkNhY2hlLCBudWxsXWAsIGlmIGBzZWxmQXR0ZW50aW9uQ2FjaGVgIGlzXG4gICAqICAgICBzZXQgYW5kIHRoZSBsYXllciBoYXMgbm8gY3Jvc3MtYXR0ZW50aW9uLlxuICAgKiAgIC0gYFtvdXRwdXRzLCBzZWxmQXR0ZW50aW9uQ2FjaGUsIGNyb3NzQXR0ZW50aW9uQ2FjaGVdYCwgaWZcbiAgICogICAgIGBzZWxmQXR0ZW50aW9uQ2FjaGVgIGFuZCBgY3Jvc3NBdHRlbnRpb25DYWNoZWAgYXJlIHNldCBhbmRcbiAgICogICAgIHRoZSBsYXllciBoYXMgY3Jvc3MtYXR0ZW50aW9uLlxuICAgKi9cbiAgY2FsbEFuZFJldHVybkNhY2hlcyhcbiAgICBkZWNvZGVyU2VxdWVuY2U6IFRlbnNvciwga3dhcmdzOiBUcmFuc2Zvcm1lckRlY29kZXJPcHRpb25zXG4gICk6IFtUZW5zb3IsIFRlbnNvciwgVGVuc29yXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgaGFzRW5jb2RlclNlcXVlbmNlID0ga3dhcmdzLmVuY29kZXJTZXF1ZW5jZSAhPSBudWxsO1xuICAgICAgY29uc3QgaGFzQ3Jvc3NBdHRlbnRpb24gPSB0aGlzLnNlbGZDcm9zc0F0dGVudGlvbkxheWVyICE9IG51bGw7XG5cbiAgICAgIGlmICghaGFzQ3Jvc3NBdHRlbnRpb24gJiYgaGFzRW5jb2RlclNlcXVlbmNlKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICdUaGUgbnVtYmVyIG9mIGNhbGwgYXJndW1lbnRzIHRvIGBUcmFuc2Zvcm1lckRlY29kZXJgIHNob3VsZCAnICtcbiAgICAgICAgICAnbm90IGNoYW5nZS4gVXNlIGBsYXllci5hcHBseShkZWNvZGVyU2VxdWVuY2UsIHtlbmNvZGVyU2VxdWVuY2V9KWAgJyArXG4gICAgICAgICAgJ3RvIGJ1aWxkIGEgbGF5ZXIgd2l0aCBjcm9zcyBhdHRlbnRpb24sIG9yICcgK1xuICAgICAgICAgICdgbGF5ZXIuYXBwbHkgKGRlY29kZXJTZXF1ZW5jZSlgIHRvIGJ1aWxkIGEgbGF5ZXIgd2l0aG91dC4gJyArXG4gICAgICAgICAgJ1RoaXMgbGF5ZXIgaGFzIGJlZW4gYnVpbHQgd2l0aG91dCBjcm9zcyBhdHRlbnRpb24sIGJ1dCAnICtcbiAgICAgICAgICAneW91IGFyZSB0cnlpbmcgdG8gY2FsbCBpdCB3aXRoIGVuY29kZXJTZXF1ZW5jZS4nXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGhhc0Nyb3NzQXR0ZW50aW9uICYmICFoYXNFbmNvZGVyU2VxdWVuY2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ1RoZSBudW1iZXIgb2YgY2FsbCBhcmd1bWVudHMgdG8gYFRyYW5zZm9ybWVyRGVjb2RlcmAgc2hvdWxkIG5vdCAnICtcbiAgICAgICAgICAnY2hhbmdlLiBVc2UgYGxheWVyLmFwcGx5KGRlY29kZXJTZXF1ZW5jZSwge2VuY29kZXJTZXF1ZW5jZX0pYCAnICtcbiAgICAgICAgICAndG8gYnVpbGQgYSBsYXllciB3aXRoIGNyb3NzIGF0dGVudGlvbiwgb3IgJyArXG4gICAgICAgICAgJ2BsYXllci5hcHBseShkZWNvZGVyU2VxdWVuY2UpYCB0byBidWlsZCBhIGxheWVyIHdpdGhvdXQuICcgK1xuICAgICAgICAgICdUaGlzIGxheWVyIGhhcyBiZWVuIGJ1aWx0IHdpdGggY3Jvc3MgYXR0ZW50aW9uLCBidXQgJyArXG4gICAgICAgICAgJ3lvdSBkaWQgbm90IHByb3ZpZGUgZW5jb2RlclNlcXVlbmNlLidcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaGFzU2VsZkF0dGVudGlvbkNhY2hlID0ga3dhcmdzLnNlbGZBdHRlbnRpb25DYWNoZSAhPSBudWxsO1xuICAgICAgY29uc3QgaGFzQ3Jvc3NBdHRlbnRpb25DYWNoZSA9IGt3YXJncy5jcm9zc0F0dGVudGlvbkNhY2hlICE9IG51bGw7XG4gICAgICBpZiAoaGFzQ3Jvc3NBdHRlbnRpb24gJiYgKFxuICAgICAgICBoYXNTZWxmQXR0ZW50aW9uQ2FjaGUgIT09IGhhc0Nyb3NzQXR0ZW50aW9uQ2FjaGVcbiAgICAgICkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ1doZW4gY2FsbGluZyBgVHJhbnNmb3JtZXJEZWNvZGVyYCB3aXRoIGNyb3NzLWF0dGVudGlvbiAod2l0aCBib3RoICcgK1xuICAgICAgICAgICdgZW5jb2RlclNlcXVlbmNlYCBhbmQgYGRlY29kZXJTZXF1ZW5jZWApLCBgc2VsZkF0dGVudGlvbkNhY2hlYCAnICtcbiAgICAgICAgICAnYW5kIGBjcm9zc0F0dGVudGlvbkNhY2hlYCBzaG91bGQgYm90aCBiZSBzZXQgb3IgYm90aCBiZSBgbnVsbGAuICAnICtcbiAgICAgICAgICAnT25lIGNhbm5vdCBiZSBgbnVsbGAgd2hpbGUgdGhlIG90aGVyIGlzIG5vdC4gUmVjZWl2ZWQ6ICcgK1xuICAgICAgICAgIGBzZWxmQXR0ZW50aW9uQ2FjaGU9JHtrd2FyZ3Muc2VsZkF0dGVudGlvbkNhY2hlfSwgYCArXG4gICAgICAgICAgYGNyb3NzQXR0ZW50aW9uQ2FjaGU9JHtrd2FyZ3MuY3Jvc3NBdHRlbnRpb25DYWNoZX0uYFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzZWxmQXR0ZW50aW9uTWFzayA9IHRoaXMuY29tcHV0ZVNlbGZBdHRlbnRpb25NYXNrKFxuICAgICAgICBkZWNvZGVyU2VxdWVuY2UsXG4gICAgICAgIGt3YXJncy5kZWNvZGVyUGFkZGluZ01hc2sgYXMgVGVuc29yLFxuICAgICAgICBrd2FyZ3MuZGVjb2RlckF0dGVudGlvbk1hc2ssXG4gICAgICAgIGt3YXJncy51c2VDYXVzYWxNYXNrLFxuICAgICAgICBrd2FyZ3Muc2VsZkF0dGVudGlvbkNhY2hlLFxuICAgICAgICBrd2FyZ3Muc2VsZkF0dGVudGlvbkNhY2hlVXBkYXRlSW5kZXgsXG4gICAgICApO1xuXG4gICAgICBsZXQgeCA9IGRlY29kZXJTZXF1ZW5jZTsgLy8gSW50ZXJtZWRpYXRlIHJlc3VsdC5cbiAgICAgIGxldCBzZWxmQXR0ZW50aW9uQ2FjaGUgPSBrd2FyZ3Muc2VsZkF0dGVudGlvbkNhY2hlO1xuXG4gICAgICAvLyBTZWxmIGF0dGVudGlvbiBibG9jay5cbiAgICAgIGxldCByZXNpZHVhbCA9IHg7XG4gICAgICBpZiAodGhpcy5ub3JtYWxpemVGaXJzdCkge1xuICAgICAgICB4ID0gdGhpcy5zZWxmQXR0ZW50aW9uTGF5ZXJub3JtLmFwcGx5KHgpIGFzIFRlbnNvcjtcbiAgICAgIH1cbiAgICAgIFt4LCBzZWxmQXR0ZW50aW9uQ2FjaGVdID0gdGhpcy5zZWxmQXR0ZW50aW9uTGF5ZXIuY2FsbEFuZFJldHVybkNhY2hlKFxuICAgICAgICB4LFxuICAgICAgICB7XG4gICAgICAgICAgdmFsdWU6IHgsXG4gICAgICAgICAgYXR0ZW50aW9uTWFzazogc2VsZkF0dGVudGlvbk1hc2ssXG4gICAgICAgICAgY2FjaGU6IHNlbGZBdHRlbnRpb25DYWNoZSxcbiAgICAgICAgICBjYWNoZVVwZGF0ZUluZGV4OiBrd2FyZ3Muc2VsZkF0dGVudGlvbkNhY2hlVXBkYXRlSW5kZXgsXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICB4ID0gdGhpcy5zZWxmQXR0ZW50aW9uRHJvcG91dC5hcHBseSh4KSBhcyBUZW5zb3I7XG4gICAgICB4ID0gYWRkKHgsIHJlc2lkdWFsKTtcbiAgICAgIGlmICghdGhpcy5ub3JtYWxpemVGaXJzdCkge1xuICAgICAgICB4ID0gdGhpcy5zZWxmQXR0ZW50aW9uTGF5ZXJub3JtLmFwcGx5KHgpIGFzIFRlbnNvcjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3Jvc3MgYXR0ZW50aW9uIGlzIG9wdGlvbmFsLlxuICAgICAgLy8gVE9ETyhwZm9yZGVyaXF1ZSk6IEFkZCBjcm9zcyBhdHRlbnRpb24gbG9naWMgZm9yIGVuY29kZXItZGVjb2RlciBhcmNoLlxuXG4gICAgICAvLyBGZWVkZm9yd2FyZCBibG9jay5cbiAgICAgIHJlc2lkdWFsID0geDtcbiAgICAgIGlmICh0aGlzLm5vcm1hbGl6ZUZpcnN0KSB7XG4gICAgICAgIHggPSB0aGlzLnNlbGZBdHRlbnRpb25MYXllcm5vcm0uYXBwbHkoeCkgYXMgVGVuc29yO1xuICAgICAgfVxuICAgICAgeCA9IHRoaXMuZmVlZGZvcndhcmRJbnRlcm1lZGlhdGVEZW5zZS5hcHBseSh4KSBhcyBUZW5zb3I7XG4gICAgICB4ID0gdGhpcy5mZWVkZm9yd2FyZE91dHB1dERlbnNlLmFwcGx5KHgpIGFzIFRlbnNvcjtcbiAgICAgIHggPSB0aGlzLmZlZWRmb3J3YXJkRHJvcG91dC5hcHBseSh4KSBhcyBUZW5zb3I7XG4gICAgICB4ID0gYWRkKHgsIHJlc2lkdWFsKTtcbiAgICAgIGlmICghdGhpcy5ub3JtYWxpemVGaXJzdCkge1xuICAgICAgICB4ID0gdGhpcy5zZWxmQXR0ZW50aW9uTGF5ZXJub3JtLmFwcGx5KHgpIGFzIFRlbnNvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbGZBdHRlbnRpb25DYWNoZSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChoYXNDcm9zc0F0dGVudGlvbikge1xuICAgICAgICAgIHJldHVybiBbeCwgc2VsZkF0dGVudGlvbkNhY2hlLCBrd2FyZ3MuY3Jvc3NBdHRlbnRpb25DYWNoZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFt4LCBzZWxmQXR0ZW50aW9uQ2FjaGUsIG51bGxdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gW3gsIG51bGwsIG51bGxdO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlU2VsZkF0dGVudGlvbk1hc2soXG4gICAgZGVjb2RlclNlcXVlbmNlOiBUZW5zb3IsXG4gICAgZGVjb2RlclBhZGRpbmdNYXNrOiBUZW5zb3IsXG4gICAgZGVjb2RlckF0dGVudGlvbk1hc2s6IFRlbnNvcixcbiAgICB1c2VDYXN1YWxNYXNrOiBib29sZWFuLFxuICAgIHNlbGZBdHRlbnRpb25DYWNoZTogVGVuc29yLFxuICAgIHNlbGZBdHRlbnRpb25DYWNoZVVwZGF0ZUluZGV4OiBudW1iZXJcbiAgKTogVGVuc29yIHtcbiAgICBjb25zdCBkZWNvZGVyTWFzayA9IG1lcmdlUGFkZGluZ0FuZEF0dGVudGlvbk1hc2soXG4gICAgICBkZWNvZGVyU2VxdWVuY2UsIGRlY29kZXJQYWRkaW5nTWFzaywgZGVjb2RlckF0dGVudGlvbk1hc2spO1xuICAgIGlmKHVzZUNhc3VhbE1hc2spIHtcbiAgICAgIGNvbnN0IGJhdGNoU2l6ZSA9IGRlY29kZXJTZXF1ZW5jZS5zaGFwZVswXTtcbiAgICAgIGxldCBpbnB1dExlbmd0aCA9IGRlY29kZXJTZXF1ZW5jZS5zaGFwZVsxXTtcbiAgICAgIGNvbnN0IG91dHB1dExlbmd0aCA9IGRlY29kZXJTZXF1ZW5jZS5zaGFwZVsxXTtcbiAgICAgIC8vIFdlIG5lZWQgdG8gaGFuZGxlIGEgcmVjdGFuZ3VsYXIgY2F1c2FsIG1hc2sgd2hlbiBkb2luZyBjYWNoZWRcbiAgICAgIC8vIGRlY29kaW5nLiBGb3IgZ2VuZXJhdGl2ZSBpbmZlcmVuY2UsIGBkZWNvZGVyU2VxdWVuY2VgIHdpbGxcbiAgICAgIC8vIGdlbmVyYWxseSBiZSBsZW5ndGggMSwgYW5kIGBjYWNoZWAgd2lsbCBiZSB0aGUgZnVsbCBnZW5lcmF0aW9uIGxlbmd0aC5cbiAgICAgIGlmKHNlbGZBdHRlbnRpb25DYWNoZSAhPSBudWxsKSB7XG4gICAgICAgIGlucHV0TGVuZ3RoID0gc2VsZkF0dGVudGlvbkNhY2hlLnNoYXBlWzJdO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjYXVzYWxNYXNrID0gY29tcHV0ZUNhdXNhbE1hc2soXG4gICAgICAgIGJhdGNoU2l6ZSxcbiAgICAgICAgaW5wdXRMZW5ndGgsXG4gICAgICAgIG91dHB1dExlbmd0aCxcbiAgICAgICAgc2VsZkF0dGVudGlvbkNhY2hlVXBkYXRlSW5kZXggPz8gMFxuICAgICAgKTtcbiAgICAgIHJldHVybiBkZWNvZGVyTWFzayAhPSBudWxsID8gZGVjb2Rlck1hc2subWluaW11bShjYXVzYWxNYXNrKSA6IGNhdXNhbE1hc2s7XG4gICAgfVxuICAgIHJldHVybiBkZWNvZGVyTWFzaztcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICdpbnRlcm1lZGlhdGVEaW0nOiB0aGlzLmludGVybWVkaWF0ZURpbSxcbiAgICAgICdudW1IZWFkcyc6IHRoaXMubnVtSGVhZHMsXG4gICAgICAnZHJvcG91dCc6IHRoaXMuZHJvcG91dCxcbiAgICAgICdhY3RpdmF0aW9uJzogc2VyaWFsaXplQWN0aXZhdGlvbih0aGlzLmFjdGl2YXRpb24pLFxuICAgICAgJ2xheWVyTm9ybUVwc2lsb24nOiB0aGlzLmxheWVyTm9ybUVwc2lsb24sXG4gICAgICAna2VybmVsSW5pdGlhbGl6ZXInOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmtlcm5lbEluaXRpYWxpemVyKSxcbiAgICAgICdiaWFzSW5pdGlhbGl6ZXInOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmJpYXNJbml0aWFsaXplciksXG4gICAgICAnbm9ybWFsaXplRmlyc3QnOiB0aGlzLm5vcm1hbGl6ZUZpcnN0LFxuICAgICAgJ2RlY29kZXJTZXF1ZW5jZVNoYXBlJzogdGhpcy5kZWNvZGVyU2VxdWVuY2VTaGFwZSxcbiAgICAgICdlbmNvZGVyU2VxdWVuY2VTaGFwZSc6IHRoaXMuZW5jb2RlclNlcXVlbmNlU2hhcGUsXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoZGVjb2RlclNlcXVlbmNlU2hhcGU6IFNoYXBlKTogU2hhcGUge1xuICAgIHJldHVybiBkZWNvZGVyU2VxdWVuY2VTaGFwZTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFRyYW5zZm9ybWVyRGVjb2Rlcik7XG4iXX0=