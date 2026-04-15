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
/* Original source: keras_nlp/models/backbone.py */
import { serialization } from '@tensorflow/tfjs-core';
import { LayersModel } from '../../../engine/training';
import { NotImplementedError } from '../../../errors';
class Backbone extends LayersModel {
    constructor(args) {
        super(args);
    }
    /**
     * A `tf.layers.embedding` instance for embedding token ids.
     */
    get tokenEmbedding() {
        throw new NotImplementedError();
    }
    getConfig() {
        return {
            name: this.name,
            trainable: this.trainable,
        };
    }
    static fromConfig(cls, config) {
        return new cls(config);
    }
}
/** @nocollapse */
Backbone.className = 'Backbone';
export { Backbone };
serialization.registerClass(Backbone);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2JvbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC9tb2RlbHMvYmFja2JvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUg7O0dBRUc7QUFFSCxtREFBbUQ7QUFDbkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR3RELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUd0RCxNQUFhLFFBQVMsU0FBUSxXQUFXO0lBSXZDLFlBQVksSUFBbUI7UUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxjQUFjO1FBQ2hCLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFUSxTQUFTO1FBQ2hCLE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLENBQVUsVUFBVSxDQUN4QixHQUE2QyxFQUM3QyxNQUFnQztRQUVoQyxPQUFPLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7O0FBMUJELGtCQUFrQjtBQUNGLGtCQUFTLEdBQUcsVUFBVSxDQUFDO1NBRjVCLFFBQVE7QUE2QnJCLGFBQWEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogIEJhc2UgY2xhc3MgZm9yIEJhY2tib25lIG1vZGVscy5cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzX25scC9tb2RlbHMvYmFja2JvbmUucHkgKi9cbmltcG9ydCB7IHNlcmlhbGl6YXRpb24gfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBDb250YWluZXJBcmdzIH0gZnJvbSAnLi4vLi4vLi4vZW5naW5lL2NvbnRhaW5lcic7XG5pbXBvcnQgeyBMYXllcnNNb2RlbCB9IGZyb20gJy4uLy4uLy4uL2VuZ2luZS90cmFpbmluZyc7XG5pbXBvcnQgeyBOb3RJbXBsZW1lbnRlZEVycm9yIH0gZnJvbSAnLi4vLi4vLi4vZXJyb3JzJztcbmltcG9ydCB7IEVtYmVkZGluZyB9IGZyb20gJy4uLy4uL2VtYmVkZGluZ3MnO1xuXG5leHBvcnQgY2xhc3MgQmFja2JvbmUgZXh0ZW5kcyBMYXllcnNNb2RlbCB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgY2xhc3NOYW1lID0gJ0JhY2tib25lJztcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBDb250YWluZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQSBgdGYubGF5ZXJzLmVtYmVkZGluZ2AgaW5zdGFuY2UgZm9yIGVtYmVkZGluZyB0b2tlbiBpZHMuXG4gICAqL1xuICBnZXQgdG9rZW5FbWJlZGRpbmcoKTogRW1iZWRkaW5nIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHRyYWluYWJsZTogdGhpcy50cmFpbmFibGUsXG4gICAgfTtcbiAgfVxuXG4gIHN0YXRpYyBvdmVycmlkZSBmcm9tQ29uZmlnPFQgZXh0ZW5kcyBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZT4oXG4gICAgY2xzOiBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFQ+LFxuICAgIGNvbmZpZzogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0KTogVCB7XG5cbiAgICByZXR1cm4gbmV3IGNscyhjb25maWcpO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoQmFja2JvbmUpO1xuIl19