/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/**
 * TensorFlow.js Layers: Embedding Layer.
 *
 * Original source: keras/constraints.py
 */
import { notEqual, reshape, serialization, tidy, zerosLike } from '@tensorflow/tfjs-core';
import * as K from '../backend/tfjs_backend';
import { getConstraint, serializeConstraint } from '../constraints';
import { Layer } from '../engine/topology';
import { ValueError } from '../errors';
import { getInitializer, serializeInitializer } from '../initializers';
import { getRegularizer, serializeRegularizer } from '../regularizers';
import * as generic_utils from '../utils/generic_utils';
import { getExactlyOneShape, getExactlyOneTensor } from '../utils/types_utils';
class Embedding extends Layer {
    constructor(args) {
        super(args);
        this.embeddings = null;
        this.DEFAULT_EMBEDDINGS_INITIALIZER = 'randomUniform';
        if (args.batchInputShape == null && args.inputShape == null) {
            // Porting Note: This logic is copied from Layer's constructor, since we
            // can't do exactly what the Python constructor does for Embedding().
            // Specifically, the super constructor can not be called after the
            // mutation of the `config` argument.
            let batchSize = null;
            if (args.batchSize != null) {
                batchSize = args.batchSize;
            }
            if (args.inputLength == null) {
                // Fix super-constructor to what it would have done if
                // 'config.inputShape' were (None, )
                this.batchInputShape = [batchSize, null];
            }
            else {
                // Fix super-constructor to what it would have done if
                // 'config.inputShape' were (config.inputLength, )
                this.batchInputShape =
                    [batchSize].concat(generic_utils.toList(args.inputLength));
            }
        }
        this.inputDim = args.inputDim;
        generic_utils.assertPositiveInteger(this.inputDim, 'inputDim');
        this.outputDim = args.outputDim;
        generic_utils.assertPositiveInteger(this.outputDim, 'outputDim');
        this.embeddingsInitializer = getInitializer(args.embeddingsInitializer || this.DEFAULT_EMBEDDINGS_INITIALIZER);
        this.embeddingsRegularizer = getRegularizer(args.embeddingsRegularizer);
        this.activityRegularizer = getRegularizer(args.activityRegularizer);
        this.embeddingsConstraint = getConstraint(args.embeddingsConstraint);
        this.maskZero = args.maskZero;
        this.supportsMasking = args.maskZero;
        this.inputLength = args.inputLength;
    }
    build(inputShape) {
        this.embeddings = this.addWeight('embeddings', [this.inputDim, this.outputDim], this.dtype, this.embeddingsInitializer, this.embeddingsRegularizer, true, this.embeddingsConstraint);
        this.built = true;
    }
    // Override warnOnIncompatibleInputShape because an embedding layer allows
    // the input to have varying ranks.
    warnOnIncompatibleInputShape(inputShape) { }
    computeMask(inputs, mask) {
        return tidy(() => {
            if (!this.maskZero) {
                return null;
            }
            else {
                inputs = getExactlyOneTensor(inputs);
                return notEqual(inputs, zerosLike(inputs));
            }
        });
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        if (this.inputLength == null) {
            return [...inputShape, this.outputDim];
        }
        // inputLength can be an array if input is 3D or higher.
        const inLens = generic_utils.toList(this.inputLength);
        if (inLens.length !== inputShape.length - 1) {
            throw new ValueError(`"inputLength" is ${this.inputLength}, but received ` +
                `input shape has shape ${inputShape}`);
        }
        else {
            let i = 0;
            for (let k = 0; k < inLens.length; ++k) {
                const s1 = inLens[k];
                const s2 = inputShape[k + 1];
                if ((s1 != null) && (s2 != null) && (s1 !== s2)) {
                    throw new ValueError(`"inputLength" is ${this.inputLength}, but received ` +
                        `input shape has shape ${inputShape}`);
                }
                else if (s1 == null) {
                    inLens[i] = s2;
                }
                i++;
            }
        }
        return [inputShape[0], ...inLens, this.outputDim];
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            // Embedding layer accepts only a single input.
            let input = getExactlyOneTensor(inputs);
            if (input.dtype !== 'int32') {
                input = K.cast(input, 'int32');
            }
            const output = K.gather(this.embeddings.read(), reshape(input, [input.size]));
            return reshape(output, getExactlyOneShape(this.computeOutputShape(input.shape)));
        });
    }
    getConfig() {
        const config = {
            inputDim: this.inputDim,
            outputDim: this.outputDim,
            embeddingsInitializer: serializeInitializer(this.embeddingsInitializer),
            embeddingsRegularizer: serializeRegularizer(this.embeddingsRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            embeddingsConstraint: serializeConstraint(this.embeddingsConstraint),
            maskZero: this.maskZero,
            inputLength: this.inputLength
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Embedding.className = 'Embedding';
export { Embedding };
serialization.registerClass(Embedding);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkaW5ncy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvZW1iZWRkaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVIOzs7O0dBSUc7QUFDSCxPQUFPLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQVUsSUFBSSxFQUFFLFNBQVMsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRWhHLE9BQU8sS0FBSyxDQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0MsT0FBTyxFQUFtQyxhQUFhLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwRyxPQUFPLEVBQUMsS0FBSyxFQUFZLE1BQU0sb0JBQW9CLENBQUM7QUFDcEQsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNyQyxPQUFPLEVBQUMsY0FBYyxFQUFzQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXpHLE9BQU8sRUFBQyxjQUFjLEVBQXNDLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFekcsT0FBTyxLQUFLLGFBQWEsTUFBTSx3QkFBd0IsQ0FBQztBQUN4RCxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQWlEN0UsTUFBYSxTQUFVLFNBQVEsS0FBSztJQWdCbEMsWUFBWSxJQUF3QjtRQUNsQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFSTixlQUFVLEdBQWtCLElBQUksQ0FBQztRQUVoQyxtQ0FBOEIsR0FDbkMsZUFBZSxDQUFDO1FBTWxCLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLEVBQUU7WUFDM0Qsd0VBQXdFO1lBQ3hFLHFFQUFxRTtZQUNyRSxrRUFBa0U7WUFDbEUscUNBQXFDO1lBQ3JD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QUNGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDOztBQXJJRCxrQkFBa0I7QUFDWCxtQkFBUyxHQUFHLFdBQVcsQUFBZCxDQUFlO1NBRnBCLFNBQVM7QUF3SXRCLGFBQWEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgb3IgYXRcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqIFRlbnNvckZsb3cuanMgTGF5ZXJzOiBFbWJlZGRpbmcgTGF5ZXIuXG4gKlxuICogT3JpZ2luYWwgc291cmNlOiBrZXJhcy9jb25zdHJhaW50cy5weVxuICovXG5pbXBvcnQge25vdEVxdWFsLCByZXNoYXBlLCBzZXJpYWxpemF0aW9uLCBUZW5zb3IsIHRpZHksIHplcm9zTGlrZX0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0ICogYXMgSyBmcm9tICcuLi9iYWNrZW5kL3RmanNfYmFja2VuZCc7XG5pbXBvcnQge0NvbnN0cmFpbnQsIENvbnN0cmFpbnRJZGVudGlmaWVyLCBnZXRDb25zdHJhaW50LCBzZXJpYWxpemVDb25zdHJhaW50fSBmcm9tICcuLi9jb25zdHJhaW50cyc7XG5pbXBvcnQge0xheWVyLCBMYXllckFyZ3N9IGZyb20gJy4uL2VuZ2luZS90b3BvbG9neSc7XG5pbXBvcnQge1ZhbHVlRXJyb3J9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQge2dldEluaXRpYWxpemVyLCBJbml0aWFsaXplciwgSW5pdGlhbGl6ZXJJZGVudGlmaWVyLCBzZXJpYWxpemVJbml0aWFsaXplcn0gZnJvbSAnLi4vaW5pdGlhbGl6ZXJzJztcbmltcG9ydCB7U2hhcGV9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHtnZXRSZWd1bGFyaXplciwgUmVndWxhcml6ZXIsIFJlZ3VsYXJpemVySWRlbnRpZmllciwgc2VyaWFsaXplUmVndWxhcml6ZXJ9IGZyb20gJy4uL3JlZ3VsYXJpemVycyc7XG5pbXBvcnQge0t3YXJnc30gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZ2VuZXJpY191dGlscyBmcm9tICcuLi91dGlscy9nZW5lcmljX3V0aWxzJztcbmltcG9ydCB7Z2V0RXhhY3RseU9uZVNoYXBlLCBnZXRFeGFjdGx5T25lVGVuc29yfSBmcm9tICcuLi91dGlscy90eXBlc191dGlscyc7XG5pbXBvcnQge0xheWVyVmFyaWFibGV9IGZyb20gJy4uL3ZhcmlhYmxlcyc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBFbWJlZGRpbmdMYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogSW50ZWdlciA+IDAuIFNpemUgb2YgdGhlIHZvY2FidWxhcnksIGkuZS4gbWF4aW11bSBpbnRlZ2VyIGluZGV4ICsgMS5cbiAgICovXG4gIGlucHV0RGltOiBudW1iZXI7XG4gIC8qKlxuICAgKiBJbnRlZ2VyID49IDAuIERpbWVuc2lvbiBvZiB0aGUgZGVuc2UgZW1iZWRkaW5nLlxuICAgKi9cbiAgb3V0cHV0RGltOiBudW1iZXI7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGBlbWJlZGRpbmdzYCBtYXRyaXguXG4gICAqL1xuICBlbWJlZGRpbmdzSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXJ8SW5pdGlhbGl6ZXI7XG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBgZW1iZWRkaW5nc2AgbWF0cml4LlxuICAgKi9cbiAgZW1iZWRkaW5nc1JlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgYWN0aXZhdGlvbi5cbiAgICovXG4gIGFjdGl2aXR5UmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGBlbWJlZGRpbmdzYCBtYXRyaXguXG4gICAqL1xuICBlbWJlZGRpbmdzQ29uc3RyYWludD86IENvbnN0cmFpbnRJZGVudGlmaWVyfENvbnN0cmFpbnQ7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBpbnB1dCB2YWx1ZSAwIGlzIGEgc3BlY2lhbCBcInBhZGRpbmdcIiB2YWx1ZSB0aGF0IHNob3VsZCBiZVxuICAgKiBtYXNrZWQgb3V0LiBUaGlzIGlzIHVzZWZ1bCB3aGVuIHVzaW5nIHJlY3VycmVudCBsYXllcnMgd2hpY2ggbWF5IHRha2VcbiAgICogdmFyaWFibGUgbGVuZ3RoIGlucHV0LlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGBUcnVlYCB0aGVuIGFsbCBzdWJzZXF1ZW50IGxheWVycyBpbiB0aGUgbW9kZWwgbmVlZCB0byBzdXBwb3J0XG4gICAqIG1hc2tpbmcgb3IgYW4gZXhjZXB0aW9uIHdpbGwgYmUgcmFpc2VkLiBJZiBtYXNrWmVybyBpcyBzZXQgdG8gYFRydWVgLCBhcyBhXG4gICAqIGNvbnNlcXVlbmNlLCBpbmRleCAwIGNhbm5vdCBiZSB1c2VkIGluIHRoZSB2b2NhYnVsYXJ5IChpbnB1dERpbSBzaG91bGRcbiAgICogZXF1YWwgc2l6ZSBvZiB2b2NhYnVsYXJ5ICsgMSkuXG4gICAqL1xuICBtYXNrWmVybz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBMZW5ndGggb2YgaW5wdXQgc2VxdWVuY2VzLCB3aGVuIGl0IGlzIGNvbnN0YW50LlxuICAgKlxuICAgKiBUaGlzIGFyZ3VtZW50IGlzIHJlcXVpcmVkIGlmIHlvdSBhcmUgZ29pbmcgdG8gY29ubmVjdCBgZmxhdHRlbmAgdGhlblxuICAgKiBgZGVuc2VgIGxheWVycyB1cHN0cmVhbSAod2l0aG91dCBpdCwgdGhlIHNoYXBlIG9mIHRoZSBkZW5zZSBvdXRwdXRzIGNhbm5vdFxuICAgKiBiZSBjb21wdXRlZCkuXG4gICAqL1xuICBpbnB1dExlbmd0aD86IG51bWJlcnxudW1iZXJbXTtcbn1cblxuZXhwb3J0IGNsYXNzIEVtYmVkZGluZyBleHRlbmRzIExheWVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnRW1iZWRkaW5nJztcbiAgcHJpdmF0ZSBpbnB1dERpbTogbnVtYmVyO1xuICBwcml2YXRlIG91dHB1dERpbTogbnVtYmVyO1xuICBwcml2YXRlIGVtYmVkZGluZ3NJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHByaXZhdGUgbWFza1plcm86IGJvb2xlYW47XG4gIHByaXZhdGUgaW5wdXRMZW5ndGg6IG51bWJlcnxudW1iZXJbXTtcblxuICBwcml2YXRlIGVtYmVkZGluZ3M6IExheWVyVmFyaWFibGUgPSBudWxsO1xuXG4gIHJlYWRvbmx5IERFRkFVTFRfRU1CRURESU5HU19JTklUSUFMSVpFUjogSW5pdGlhbGl6ZXJJZGVudGlmaWVyID1cbiAgICAgICdyYW5kb21Vbmlmb3JtJztcbiAgcHJpdmF0ZSByZWFkb25seSBlbWJlZGRpbmdzUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcjtcbiAgcHJpdmF0ZSByZWFkb25seSBlbWJlZGRpbmdzQ29uc3RyYWludD86IENvbnN0cmFpbnQ7XG5cbiAgY29uc3RydWN0b3IoYXJnczogRW1iZWRkaW5nTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgaWYgKGFyZ3MuYmF0Y2hJbnB1dFNoYXBlID09IG51bGwgJiYgYXJncy5pbnB1dFNoYXBlID09IG51bGwpIHtcbiAgICAgIC8vIFBvcnRpbmcgTm90ZTogVGhpcyBsb2dpYyBpcyBjb3BpZWQgZnJvbSBMYXllcidzIGNvbnN0cnVjdG9yLCBzaW5jZSB3ZVxuICAgICAgLy8gY2FuJ3QgZG8gZXhhY3RseSB3aGF0IHRoZSBQeXRob24gY29uc3RydWN0b3IgZG9lcyBmb3IgRW1iZWRkaW5nKCkuXG4gICAgICAvLyBTcGVjaWZpY2FsbHksIHRoZSBzdXBlciBjb25zdHJ1Y3RvciBjYW4gbm90IGJlIGNhbGxlZCBhZnRlciB0aGVcbiAgICAgIC8vIG11dGF0aW9uIG9mIHRoZSBgY29uZmlnYCBhcmd1bWVudC5cbiAgICAgIGxldCBiYXRjaFNpemU6IG51bWJlciA9IG51bGw7XG4gICAgICBpZiAoYXJncy5iYXRjaFNpemUgIT0gbnVsbCkge1xuICAgICAgICBiYXRjaFNpemUgPSBhcmdzLmJhdGNoU2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChhcmdzLmlucHV0TGVuZ3RoID09IG51bGwpIHtcbiAgICAgICAgLy8gRml4IHN1cGVyLWNvbnN0cnVjdG9yIHRvIHdoYXQgaXQgd291bGQgaGF2ZSBkb25lIGlmXG4gICAgICAgIC8vICdjb25maWcuaW5wdXRTaGFwZScgd2VyZSAoTm9uZSwgKVxuICAgICAgICB0aGlzLmJhdGNoSW5wdXRTaGFwZSA9IFtiYXRjaFNpemUsIG51bGxdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRml4IHN1cGVyLWNvbnN0cnVjdG9yIHRvIHdoYXQgaXQgd291bGQgaGF2ZSBkb25lIGlmXG4gICAgICAgIC8vICdjb25maWcuaW5wdXRTaGFwZScgd2VyZSAoY29uZmlnLmlucHV0TGVuZ3RoLCApXG4gICAgICAgIHRoaXMuYmF0Y2hJbnB1dFNoYXBlID1cbiAgICAgICAgICAgIFtiYXRjaFNpemVdLmNvbmNhdChnZW5lcmljX3V0aWxzLnRvTGlzdChhcmdzLmlucHV0TGVuZ3RoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuaW5wdXREaW0gPSBhcmdzLmlucHV0RGltO1xuICAgIGdlbmVyaWNfdXRpbHMuYXNzZXJ0UG9zaXRpdmVJbnRlZ2VyKHRoaXMuaW5wdXREaW0sICdpbnB1dERpbScpO1xuICAgIHRoaXMub3V0cHV0RGltID0gYXJncy5vdXRwdXREaW07XG4gICAgZ2VuZXJpY191dGlscy5hc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy5vdXRwdXREaW0sICdvdXRwdXREaW0nKTtcbiAgICB0aGlzLmVtYmVkZGluZ3NJbml0aWFsaXplciA9IGdldEluaXRpYWxpemVyKFxuICAgICAgICBhcmdzLmVtYmVkZGluZ3NJbml0aWFsaXplciB8fCB0aGlzLkRFRkFVTFRfRU1CRURESU5HU19JTklUSUFMSVpFUik7XG4gICAgdGhpcy5lbWJlZGRpbmdzUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmVtYmVkZGluZ3NSZWd1bGFyaXplcik7XG4gICAgdGhpcy5hY3Rpdml0eVJlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5hY3Rpdml0eVJlZ3VsYXJpemVyKTtcbiAgICB0aGlzLmVtYmVkZGluZ3NDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmVtYmVkZGluZ3NDb25zdHJhaW50KTtcbiAgICB0aGlzLm1hc2taZXJvID0gYXJncy5tYXNrWmVybztcbiAgICB0aGlzLnN1cHBvcnRzTWFza2luZyA9IGFyZ3MubWFza1plcm87XG4gICAgdGhpcy5pbnB1dExlbmd0aCA9IGFyZ3MuaW5wdXRMZW5ndGg7XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIHRoaXMuZW1iZWRkaW5ncyA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAnZW1iZWRkaW5ncycsIFt0aGlzLmlucHV0RGltLCB0aGlzLm91dHB1dERpbV0sIHRoaXMuZHR5cGUsXG4gICAgICAgIHRoaXMuZW1iZWRkaW5nc0luaXRpYWxpemVyLCB0aGlzLmVtYmVkZGluZ3NSZWd1bGFyaXplciwgdHJ1ZSxcbiAgICAgICAgdGhpcy5lbWJlZGRpbmdzQ29uc3RyYWludCk7XG4gICAgdGhpcy5idWlsdCA9IHRydWU7XG4gIH1cblxuICAvLyBPdmVycmlkZSB3YXJuT25JbmNvbXBhdGlibGVJbnB1dFNoYXBlIGJlY2F1c2UgYW4gZW1iZWRkaW5nIGxheWVyIGFsbG93c1xuICAvLyB0aGUgaW5wdXQgdG8gaGF2ZSB2YXJ5aW5nIHJhbmtzLlxuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgd2Fybk9uSW5jb21wYXRpYmxlSW5wdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZSkge31cblxuICBvdmVycmlkZSBjb21wdXRlTWFzayhpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwgbWFzaz86IFRlbnNvcnxUZW5zb3JbXSk6XG4gICAgICBUZW5zb3Ige1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlmICghdGhpcy5tYXNrWmVybykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0cyA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgICAgcmV0dXJuIG5vdEVxdWFsKGlucHV0cywgemVyb3NMaWtlKGlucHV0cykpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuICAgIGlmICh0aGlzLmlucHV0TGVuZ3RoID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbLi4uaW5wdXRTaGFwZSwgdGhpcy5vdXRwdXREaW1dO1xuICAgIH1cbiAgICAvLyBpbnB1dExlbmd0aCBjYW4gYmUgYW4gYXJyYXkgaWYgaW5wdXQgaXMgM0Qgb3IgaGlnaGVyLlxuICAgIGNvbnN0IGluTGVuczogbnVtYmVyW10gPSBnZW5lcmljX3V0aWxzLnRvTGlzdCh0aGlzLmlucHV0TGVuZ3RoKTtcbiAgICBpZiAoaW5MZW5zLmxlbmd0aCAhPT0gaW5wdXRTaGFwZS5sZW5ndGggLSAxKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgXCJpbnB1dExlbmd0aFwiIGlzICR7dGhpcy5pbnB1dExlbmd0aH0sIGJ1dCByZWNlaXZlZCBgICtcbiAgICAgICAgICBgaW5wdXQgc2hhcGUgaGFzIHNoYXBlICR7aW5wdXRTaGFwZX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBpbkxlbnMubGVuZ3RoOyArK2spIHtcbiAgICAgICAgY29uc3QgczEgPSBpbkxlbnNba107XG4gICAgICAgIGNvbnN0IHMyID0gaW5wdXRTaGFwZVtrICsgMV07XG4gICAgICAgIGlmICgoczEgIT0gbnVsbCkgJiYgKHMyICE9IG51bGwpICYmIChzMSAhPT0gczIpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAgIGBcImlucHV0TGVuZ3RoXCIgaXMgJHt0aGlzLmlucHV0TGVuZ3RofSwgYnV0IHJlY2VpdmVkIGAgK1xuICAgICAgICAgICAgICBgaW5wdXQgc2hhcGUgaGFzIHNoYXBlICR7aW5wdXRTaGFwZX1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChzMSA9PSBudWxsKSB7XG4gICAgICAgICAgaW5MZW5zW2ldID0gczI7XG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2lucHV0U2hhcGVbMF0sIC4uLmluTGVucywgdGhpcy5vdXRwdXREaW1dO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgLy8gRW1iZWRkaW5nIGxheWVyIGFjY2VwdHMgb25seSBhIHNpbmdsZSBpbnB1dC5cbiAgICAgIGxldCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIGlmIChpbnB1dC5kdHlwZSAhPT0gJ2ludDMyJykge1xuICAgICAgICBpbnB1dCA9IEsuY2FzdChpbnB1dCwgJ2ludDMyJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBvdXRwdXQgPVxuICAgICAgICAgIEsuZ2F0aGVyKHRoaXMuZW1iZWRkaW5ncy5yZWFkKCksIHJlc2hhcGUoaW5wdXQsIFtpbnB1dC5zaXplXSkpO1xuICAgICAgcmV0dXJuIHJlc2hhcGUoXG4gICAgICAgICAgb3V0cHV0LCBnZXRFeGFjdGx5T25lU2hhcGUodGhpcy5jb21wdXRlT3V0cHV0U2hhcGUoaW5wdXQuc2hhcGUpKSk7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICBpbnB1dERpbTogdGhpcy5pbnB1dERpbSxcbiAgICAgIG91dHB1dERpbTogdGhpcy5vdXRwdXREaW0sXG4gICAgICBlbWJlZGRpbmdzSW5pdGlhbGl6ZXI6IHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMuZW1iZWRkaW5nc0luaXRpYWxpemVyKSxcbiAgICAgIGVtYmVkZGluZ3NSZWd1bGFyaXplcjogc2VyaWFsaXplUmVndWxhcml6ZXIodGhpcy5lbWJlZGRpbmdzUmVndWxhcml6ZXIpLFxuICAgICAgYWN0aXZpdHlSZWd1bGFyaXplcjogc2VyaWFsaXplUmVndWxhcml6ZXIodGhpcy5hY3Rpdml0eVJlZ3VsYXJpemVyKSxcbiAgICAgIGVtYmVkZGluZ3NDb25zdHJhaW50OiBzZXJpYWxpemVDb25zdHJhaW50KHRoaXMuZW1iZWRkaW5nc0NvbnN0cmFpbnQpLFxuICAgICAgbWFza1plcm86IHRoaXMubWFza1plcm8sXG4gICAgICBpbnB1dExlbmd0aDogdGhpcy5pbnB1dExlbmd0aFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoRW1iZWRkaW5nKTtcbiJdfQ==