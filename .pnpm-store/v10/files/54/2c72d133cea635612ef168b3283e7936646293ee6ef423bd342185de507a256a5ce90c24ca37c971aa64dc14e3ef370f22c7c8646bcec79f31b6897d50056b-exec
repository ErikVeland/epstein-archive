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
 *  Position embedding implementation based on `tf.layers.Layer`.
 */
/* Original source: keras_nlp/layers/modeling/position_embedding.py */
import { serialization, tidy } from '@tensorflow/tfjs-core';
import { Layer } from '../../../engine/topology';
import { ValueError } from '../../../errors';
import { getInitializer, serializeInitializer } from '../../../initializers';
import { getExactlyOneTensor } from '../../../utils/types_utils';
/**
 * A layer which learns a position embedding for input sequences.
 *
 * This class assumes that in the input tensor, the last dimension corresponds
 * to the features, and the dimension before the last corresponds to the
 * sequence.
 *
 * Examples:
 *
 * Called directly on input.
 * ```js
 * const layer = new PositionEmbedding({sequenceLength=10});
 * layer.call(tf.zeros([8, 10, 16]));
 * ```
 *
 * Combine with a token embedding.
 * ```js
 * const seqLength = 50;
 * const vocabSize = 5000;
 * const embedDim = 128;
 * const inputs = tf.input({shape: [seqLength]});
 * const tokenEmbeddings = tf.layers.embedding({
 *     inputDim=vocabSize, outputDim=embedDim
 * }).apply(inputs);
 * const positionEmbeddings = new PositionEmbedding({
 *     sequenceLength: seqLength
 * }).apply(tokenEmbeddings);
 * const outputs = tf.add(tokenEmbeddings, positionEmbeddings);
 * ```
 *
 * Reference:
 *  - [Devlin et al., 2019](https://arxiv.org/abs/1810.04805)
 */
class PositionEmbedding extends Layer {
    constructor(args) {
        super(args);
        if (args.sequenceLength == null) {
            throw new ValueError('`sequenceLength` must be an Integer, received `null`.');
        }
        this.sequenceLength = args.sequenceLength;
        this.initializer = getInitializer(args.initializer || 'glorotUniform');
    }
    getConfig() {
        const config = {
            'sequenceLength': this.sequenceLength,
            'initializer': serializeInitializer(this.initializer),
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    build(inputShape) {
        const featureSize = inputShape[inputShape.length - 1];
        this.positionEmbeddings = this.addWeight('embeddings', [this.sequenceLength, featureSize], null, this.initializer, null, true);
        super.build(inputShape);
    }
    call(inputs, kwargs) {
        return tidy(() => {
            var _a;
            kwargs.startIndex = (_a = kwargs.startIndex) !== null && _a !== void 0 ? _a : 0;
            const shape = getExactlyOneTensor(inputs).shape;
            const featureLength = shape[shape.length - 1];
            const sequenceLength = shape[shape.length - 2];
            // trim to match the length of the input sequence, which might be less
            // than the sequence_length of the layer.
            const positionEmbeddings = this.positionEmbeddings.read().slice([kwargs.startIndex, 0], [sequenceLength, featureLength]);
            return positionEmbeddings.broadcastTo(shape);
        });
    }
    computeOutputShape(inputShape) {
        return inputShape;
    }
}
/** @nocollapse */
PositionEmbedding.className = 'PositionEmbedding';
export { PositionEmbedding };
serialization.registerClass(PositionEmbedding);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb25fZW1iZWRkaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9ubHAvbW9kZWxpbmcvcG9zaXRpb25fZW1iZWRkaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVIOztHQUVHO0FBRUgsc0VBQXNFO0FBQ3RFLE9BQU8sRUFBVSxhQUFhLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHcEUsT0FBTyxFQUFFLEtBQUssRUFBYSxNQUFNLDBCQUEwQixDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3QyxPQUFPLEVBQXNDLGNBQWMsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBd0JqRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQ0c7QUFDSCxNQUFhLGlCQUFrQixTQUFRLEtBQUs7SUFPMUMsWUFBWSxJQUEyQjtRQUNyQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDWixJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxFQUFFO1lBQy9CLE1BQU0sSUFBSSxVQUFVLENBQ2xCLHVEQUF1RCxDQUFDLENBQUM7U0FDNUQ7UUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxlQUFlLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLE1BQU0sR0FBRztZQUNiLGdCQUFnQixFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ3JDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1NBQ3RELENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVRLEtBQUssQ0FBQyxVQUFpQjtRQUM5QixNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEMsWUFBWSxFQUNaLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsRUFDbEMsSUFBSSxFQUNKLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksRUFDSixJQUFJLENBQ0wsQ0FBQztRQUNGLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVRLElBQUksQ0FDWCxNQUF1QixFQUN2QixNQUFpQztRQUVqQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUU7O1lBQ2YsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFBLE1BQU0sQ0FBQyxVQUFVLG1DQUFJLENBQUMsQ0FBQztZQUMzQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDaEQsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0Msc0VBQXNFO1lBQ3RFLHlDQUF5QztZQUN6QyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQzdELENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQzNELE9BQU8sa0JBQWtCLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLGtCQUFrQixDQUFDLFVBQWlCO1FBQzNDLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7O0FBMURELGtCQUFrQjtBQUNGLDJCQUFTLEdBQUcsbUJBQW1CLENBQUM7U0FGckMsaUJBQWlCO0FBNkQ5QixhQUFhLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogIFBvc2l0aW9uIGVtYmVkZGluZyBpbXBsZW1lbnRhdGlvbiBiYXNlZCBvbiBgdGYubGF5ZXJzLkxheWVyYC5cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzX25scC9sYXllcnMvbW9kZWxpbmcvcG9zaXRpb25fZW1iZWRkaW5nLnB5ICovXG5pbXBvcnQgeyBUZW5zb3IsIHNlcmlhbGl6YXRpb24sIHRpZHkgfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4uLy4uLy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHsgTGF5ZXIsIExheWVyQXJncyB9IGZyb20gJy4uLy4uLy4uL2VuZ2luZS90b3BvbG9neSc7XG5pbXBvcnQgeyBWYWx1ZUVycm9yIH0gZnJvbSAnLi4vLi4vLi4vZXJyb3JzJztcbmltcG9ydCB7IEluaXRpYWxpemVyLCBJbml0aWFsaXplcklkZW50aWZpZXIsIGdldEluaXRpYWxpemVyLCBzZXJpYWxpemVJbml0aWFsaXplciB9IGZyb20gJy4uLy4uLy4uL2luaXRpYWxpemVycyc7XG5pbXBvcnQgeyBnZXRFeGFjdGx5T25lVGVuc29yIH0gZnJvbSAnLi4vLi4vLi4vdXRpbHMvdHlwZXNfdXRpbHMnO1xuaW1wb3J0IHsgTGF5ZXJWYXJpYWJsZSB9IGZyb20gJy4uLy4uLy4uL3ZhcmlhYmxlcyc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBQb3NpdGlvbkVtYmVkZGluZ0FyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogSW50ZWdlci4gVGhlIG1heGltdW0gbGVuZ3RoIG9mIHRoZSBkeW5hbWljIHNlcXVlbmNlLlxuICAgKi9cbiAgc2VxdWVuY2VMZW5ndGg6IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIGluaXRpYWxpemVyIHRvIHVzZSBmb3IgdGhlIGVtYmVkZGluZyB3ZWlnaHRzLlxuICAgKiBEZWZhdWx0cyB0byBgXCJnbG9yb3RVbmlmb3JtXCJgLlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcnxJbml0aWFsaXplcklkZW50aWZpZXI7XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBQb3NpdGlvbkVtYmVkZGluZ09wdGlvbnMge1xuICAvKipcbiAgICogSW50ZWdlci4gSW5kZXggdG8gc3RhcnQgdGhlIHBvc2l0aW9uIGVtYmVkZGluZ3MgYXQuXG4gICAqIERlZmF1bHRzIHRvIDAuXG4gICAqL1xuICBzdGFydEluZGV4PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIEEgbGF5ZXIgd2hpY2ggbGVhcm5zIGEgcG9zaXRpb24gZW1iZWRkaW5nIGZvciBpbnB1dCBzZXF1ZW5jZXMuXG4gKlxuICogVGhpcyBjbGFzcyBhc3N1bWVzIHRoYXQgaW4gdGhlIGlucHV0IHRlbnNvciwgdGhlIGxhc3QgZGltZW5zaW9uIGNvcnJlc3BvbmRzXG4gKiB0byB0aGUgZmVhdHVyZXMsIGFuZCB0aGUgZGltZW5zaW9uIGJlZm9yZSB0aGUgbGFzdCBjb3JyZXNwb25kcyB0byB0aGVcbiAqIHNlcXVlbmNlLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqIENhbGxlZCBkaXJlY3RseSBvbiBpbnB1dC5cbiAqIGBgYGpzXG4gKiBjb25zdCBsYXllciA9IG5ldyBQb3NpdGlvbkVtYmVkZGluZyh7c2VxdWVuY2VMZW5ndGg9MTB9KTtcbiAqIGxheWVyLmNhbGwodGYuemVyb3MoWzgsIDEwLCAxNl0pKTtcbiAqIGBgYFxuICpcbiAqIENvbWJpbmUgd2l0aCBhIHRva2VuIGVtYmVkZGluZy5cbiAqIGBgYGpzXG4gKiBjb25zdCBzZXFMZW5ndGggPSA1MDtcbiAqIGNvbnN0IHZvY2FiU2l6ZSA9IDUwMDA7XG4gKiBjb25zdCBlbWJlZERpbSA9IDEyODtcbiAqIGNvbnN0IGlucHV0cyA9IHRmLmlucHV0KHtzaGFwZTogW3NlcUxlbmd0aF19KTtcbiAqIGNvbnN0IHRva2VuRW1iZWRkaW5ncyA9IHRmLmxheWVycy5lbWJlZGRpbmcoe1xuICogICAgIGlucHV0RGltPXZvY2FiU2l6ZSwgb3V0cHV0RGltPWVtYmVkRGltXG4gKiB9KS5hcHBseShpbnB1dHMpO1xuICogY29uc3QgcG9zaXRpb25FbWJlZGRpbmdzID0gbmV3IFBvc2l0aW9uRW1iZWRkaW5nKHtcbiAqICAgICBzZXF1ZW5jZUxlbmd0aDogc2VxTGVuZ3RoXG4gKiB9KS5hcHBseSh0b2tlbkVtYmVkZGluZ3MpO1xuICogY29uc3Qgb3V0cHV0cyA9IHRmLmFkZCh0b2tlbkVtYmVkZGluZ3MsIHBvc2l0aW9uRW1iZWRkaW5ncyk7XG4gKiBgYGBcbiAqXG4gKiBSZWZlcmVuY2U6XG4gKiAgLSBbRGV2bGluIGV0IGFsLiwgMjAxOV0oaHR0cHM6Ly9hcnhpdi5vcmcvYWJzLzE4MTAuMDQ4MDUpXG4gKi9cbmV4cG9ydCBjbGFzcyBQb3NpdGlvbkVtYmVkZGluZyBleHRlbmRzIExheWVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyByZWFkb25seSBjbGFzc05hbWUgPSAnUG9zaXRpb25FbWJlZGRpbmcnO1xuICBwcml2YXRlIHNlcXVlbmNlTGVuZ3RoOiBudW1iZXI7XG4gIHByaXZhdGUgaW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICBwcm90ZWN0ZWQgcG9zaXRpb25FbWJlZGRpbmdzOiBMYXllclZhcmlhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFBvc2l0aW9uRW1iZWRkaW5nQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIGlmIChhcmdzLnNlcXVlbmNlTGVuZ3RoID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAnYHNlcXVlbmNlTGVuZ3RoYCBtdXN0IGJlIGFuIEludGVnZXIsIHJlY2VpdmVkIGBudWxsYC4nKTtcbiAgICB9XG4gICAgdGhpcy5zZXF1ZW5jZUxlbmd0aCA9IGFyZ3Muc2VxdWVuY2VMZW5ndGg7XG4gICAgdGhpcy5pbml0aWFsaXplciA9IGdldEluaXRpYWxpemVyKGFyZ3MuaW5pdGlhbGl6ZXIgfHwgJ2dsb3JvdFVuaWZvcm0nKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICdzZXF1ZW5jZUxlbmd0aCc6IHRoaXMuc2VxdWVuY2VMZW5ndGgsXG4gICAgICAnaW5pdGlhbGl6ZXInOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmluaXRpYWxpemVyKSxcbiAgICB9O1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBPYmplY3QuYXNzaWduKGNvbmZpZywgYmFzZUNvbmZpZyk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlKTogdm9pZCB7XG4gICAgY29uc3QgZmVhdHVyZVNpemUgPSBpbnB1dFNoYXBlW2lucHV0U2hhcGUubGVuZ3RoIC0gMV07XG4gICAgdGhpcy5wb3NpdGlvbkVtYmVkZGluZ3MgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICdlbWJlZGRpbmdzJyxcbiAgICAgIFt0aGlzLnNlcXVlbmNlTGVuZ3RoLCBmZWF0dXJlU2l6ZV0sXG4gICAgICBudWxsLFxuICAgICAgdGhpcy5pbml0aWFsaXplcixcbiAgICAgIG51bGwsXG4gICAgICB0cnVlXG4gICAgKTtcbiAgICBzdXBlci5idWlsZChpbnB1dFNoYXBlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoXG4gICAgaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sXG4gICAga3dhcmdzPzogUG9zaXRpb25FbWJlZGRpbmdPcHRpb25zXG4gICk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAga3dhcmdzLnN0YXJ0SW5kZXggPSBrd2FyZ3Muc3RhcnRJbmRleCA/PyAwO1xuICAgICAgY29uc3Qgc2hhcGUgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cykuc2hhcGU7XG4gICAgICBjb25zdCBmZWF0dXJlTGVuZ3RoID0gc2hhcGVbc2hhcGUubGVuZ3RoIC0gMV07XG4gICAgICBjb25zdCBzZXF1ZW5jZUxlbmd0aCA9IHNoYXBlW3NoYXBlLmxlbmd0aCAtIDJdO1xuICAgICAgLy8gdHJpbSB0byBtYXRjaCB0aGUgbGVuZ3RoIG9mIHRoZSBpbnB1dCBzZXF1ZW5jZSwgd2hpY2ggbWlnaHQgYmUgbGVzc1xuICAgICAgLy8gdGhhbiB0aGUgc2VxdWVuY2VfbGVuZ3RoIG9mIHRoZSBsYXllci5cbiAgICAgIGNvbnN0IHBvc2l0aW9uRW1iZWRkaW5ncyA9IHRoaXMucG9zaXRpb25FbWJlZGRpbmdzLnJlYWQoKS5zbGljZShcbiAgICAgICAgW2t3YXJncy5zdGFydEluZGV4LCAwXSwgW3NlcXVlbmNlTGVuZ3RoLCBmZWF0dXJlTGVuZ3RoXSk7XG4gICAgICByZXR1cm4gcG9zaXRpb25FbWJlZGRpbmdzLmJyb2FkY2FzdFRvKHNoYXBlKTtcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZSk6IFNoYXBlIHtcbiAgICByZXR1cm4gaW5wdXRTaGFwZTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFBvc2l0aW9uRW1iZWRkaW5nKTtcbiJdfQ==