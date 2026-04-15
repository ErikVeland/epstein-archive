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
/* Original source: keras-nlp/models/preprocessor.py */
import { serialization } from '@tensorflow/tfjs-core';
import { Layer } from '../../../engine/topology';
import { Tokenizer } from '../tokenizers';
import { deserializeKerasObject, serializeKerasObject } from '../../../utils/generic_utils';
/**
 * Base class for model Preprocessors.
 */
class Preprocessor extends Layer {
    constructor(args) {
        super(args);
    }
    /**
     * The tokenizer used to tokenize strings.
     */
    get tokenizer() {
        return this._tokenizer;
    }
    set tokenizer(value) {
        this._tokenizer = value;
    }
    getConfig() {
        const config = super.getConfig();
        config.tokenizer = serializeKerasObject(this.tokenizer);
        return config;
    }
    static fromConfig(cls, config) {
        const kwargs = config;
        if (config.tokenizer != null && !(config.tokenizer instanceof Tokenizer)) {
            const tokenizerConfigDict = config.tokenizer;
            kwargs.tokenizer = deserializeKerasObject(tokenizerConfigDict, serialization.SerializationMap.getMap().classNameMap, {}, 'preprocessor');
        }
        return new cls(kwargs);
    }
    static tokenizerCls(cls) { }
}
/** @nocollapse */
Preprocessor.className = 'Preprocessor';
export { Preprocessor };
serialization.registerClass(Preprocessor);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9ubHAvbW9kZWxzL3ByZXByb2Nlc3Nvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCx1REFBdUQ7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXRELE9BQU8sRUFBRSxLQUFLLEVBQWEsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVGOztHQUVHO0FBQ0gsTUFBYSxZQUFhLFNBQVEsS0FBSztJQU1yQyxZQUFZLElBQWU7UUFDekIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxTQUFTO1FBQ1gsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLFNBQVMsQ0FBQyxLQUFnQjtRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRVEsU0FBUztRQUNoQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakMsTUFBTSxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVELE1BQU0sQ0FBVSxVQUFVLENBQ3hCLEdBQTZDLEVBQzdDLE1BQWdDO1FBRWhDLE1BQU0sTUFBTSxHQUFXLE1BQU0sQ0FBQztRQUU5QixJQUFJLE1BQU0sQ0FBQyxTQUFTLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxZQUFZLFNBQVMsQ0FBQyxFQUFFO1lBQ3hFLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLFNBQXFDLENBQUM7WUFFekUsTUFBTSxDQUFDLFNBQVMsR0FBRyxzQkFBc0IsQ0FDdkMsbUJBQW1CLEVBQ25CLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxZQUFZLEVBQ3BELEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztTQUN2QjtRQUNELE9BQU8sSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUFZLENBQ2pCLEdBQTZDLElBQUcsQ0FBQzs7QUE1Q25ELGtCQUFrQjtBQUNYLHNCQUFTLEdBQUcsY0FBYyxDQUFDO1NBRnZCLFlBQVk7QUErQ3pCLGFBQWEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qIE9yaWdpbmFsIHNvdXJjZToga2VyYXMtbmxwL21vZGVscy9wcmVwcm9jZXNzb3IucHkgKi9cbmltcG9ydCB7IHNlcmlhbGl6YXRpb24gfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBMYXllciwgTGF5ZXJBcmdzIH0gZnJvbSAnLi4vLi4vLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7IFRva2VuaXplciB9IGZyb20gJy4uL3Rva2VuaXplcnMnO1xuaW1wb3J0IHsgS3dhcmdzIH0gZnJvbSAnLi4vLi4vLi4vdHlwZXMnO1xuaW1wb3J0IHsgZGVzZXJpYWxpemVLZXJhc09iamVjdCwgc2VyaWFsaXplS2VyYXNPYmplY3QgfSBmcm9tICcuLi8uLi8uLi91dGlscy9nZW5lcmljX3V0aWxzJztcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBtb2RlbCBQcmVwcm9jZXNzb3JzLlxuICovXG5leHBvcnQgY2xhc3MgUHJlcHJvY2Vzc29yIGV4dGVuZHMgTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdQcmVwcm9jZXNzb3InO1xuXG4gIHByaXZhdGUgX3Rva2VuaXplcjogVG9rZW5pemVyO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB0b2tlbml6ZXIgdXNlZCB0byB0b2tlbml6ZSBzdHJpbmdzLlxuICAgKi9cbiAgZ2V0IHRva2VuaXplcigpIHtcbiAgICByZXR1cm4gdGhpcy5fdG9rZW5pemVyO1xuICB9XG5cbiAgc2V0IHRva2VuaXplcih2YWx1ZTogVG9rZW5pemVyKSB7XG4gICAgdGhpcy5fdG9rZW5pemVyID0gdmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBjb25maWcudG9rZW5pemVyID0gc2VyaWFsaXplS2VyYXNPYmplY3QodGhpcy50b2tlbml6ZXIpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBzdGF0aWMgb3ZlcnJpZGUgZnJvbUNvbmZpZzxUIGV4dGVuZHMgc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGU+KFxuICAgIGNsczogc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGVDb25zdHJ1Y3RvcjxUPixcbiAgICBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdFxuICApOiBUIHtcbiAgICBjb25zdCBrd2FyZ3M6IEt3YXJncyA9IGNvbmZpZztcblxuICAgIGlmIChjb25maWcudG9rZW5pemVyICE9IG51bGwgJiYgIShjb25maWcudG9rZW5pemVyIGluc3RhbmNlb2YgVG9rZW5pemVyKSkge1xuICAgICAgY29uc3QgdG9rZW5pemVyQ29uZmlnRGljdCA9IGNvbmZpZy50b2tlbml6ZXIgYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0O1xuXG4gICAgICBrd2FyZ3MudG9rZW5pemVyID0gZGVzZXJpYWxpemVLZXJhc09iamVjdChcbiAgICAgICAgdG9rZW5pemVyQ29uZmlnRGljdCxcbiAgICAgICAgc2VyaWFsaXphdGlvbi5TZXJpYWxpemF0aW9uTWFwLmdldE1hcCgpLmNsYXNzTmFtZU1hcCxcbiAgICAgICAge30sICdwcmVwcm9jZXNzb3InKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBjbHMoa3dhcmdzKTtcbiAgfVxuXG4gIHN0YXRpYyB0b2tlbml6ZXJDbHM8VCBleHRlbmRzIHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlPihcbiAgICBjbHM6IHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4pIHt9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUHJlcHJvY2Vzc29yKTtcbiJdfQ==