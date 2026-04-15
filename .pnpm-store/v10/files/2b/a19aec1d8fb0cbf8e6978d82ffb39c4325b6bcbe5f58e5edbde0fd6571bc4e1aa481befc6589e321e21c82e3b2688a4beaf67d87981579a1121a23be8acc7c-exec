/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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
 * IOHandler implementations based on HTTP requests in the web browser.
 *
 * Uses [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
 */
import { env } from '../environment';
import { assert } from '../util';
import { getModelArtifactsForJSON, getModelArtifactsInfoForJSON, getModelJSONForModelArtifacts, getWeightSpecs } from './io_utils';
import { CompositeArrayBuffer } from './composite_array_buffer';
import { IORouterRegistry } from './router_registry';
import { loadWeightsAsArrayBuffer, streamWeights } from './weights_loader';
const OCTET_STREAM_MIME_TYPE = 'application/octet-stream';
const JSON_TYPE = 'application/json';
class HTTPRequest {
    constructor(path, loadOptions) {
        this.DEFAULT_METHOD = 'POST';
        if (loadOptions == null) {
            loadOptions = {};
        }
        this.weightPathPrefix = loadOptions.weightPathPrefix;
        this.weightUrlConverter = loadOptions.weightUrlConverter;
        if (loadOptions.fetchFunc != null) {
            assert(typeof loadOptions.fetchFunc === 'function', () => 'Must pass a function that matches the signature of ' +
                '`fetch` (see ' +
                'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)');
            this.fetch = loadOptions.fetchFunc;
        }
        else {
            this.fetch = env().platform.fetch;
        }
        assert(path != null && path.length > 0, () => 'URL path for http must not be null, undefined or ' +
            'empty.');
        if (Array.isArray(path)) {
            assert(path.length === 2, () => 'URL paths for http must have a length of 2, ' +
                `(actual length is ${path.length}).`);
        }
        this.path = path;
        if (loadOptions.requestInit != null &&
            loadOptions.requestInit.body != null) {
            throw new Error('requestInit is expected to have no pre-existing body, but has one.');
        }
        this.requestInit = loadOptions.requestInit || {};
        this.loadOptions = loadOptions;
    }
    async save(modelArtifacts) {
        if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
            throw new Error('BrowserHTTPRequest.save() does not support saving model topology ' +
                'in binary formats yet.');
        }
        const init = Object.assign({ method: this.DEFAULT_METHOD }, this.requestInit);
        init.body = new FormData();
        const weightsManifest = [{
                paths: ['./model.weights.bin'],
                weights: modelArtifacts.weightSpecs,
            }];
        const modelTopologyAndWeightManifest = getModelJSONForModelArtifacts(modelArtifacts, weightsManifest);
        init.body.append('model.json', new Blob([JSON.stringify(modelTopologyAndWeightManifest)], { type: JSON_TYPE }), 'model.json');
        if (modelArtifacts.weightData != null) {
            // TODO(mattsoulanille): Support saving models over 2GB that exceed
            // Chrome's ArrayBuffer size limit.
            const weightBuffer = CompositeArrayBuffer.join(modelArtifacts.weightData);
            init.body.append('model.weights.bin', new Blob([weightBuffer], { type: OCTET_STREAM_MIME_TYPE }), 'model.weights.bin');
        }
        const response = await this.fetch(this.path, init);
        if (response.ok) {
            return {
                modelArtifactsInfo: getModelArtifactsInfoForJSON(modelArtifacts),
                responses: [response],
            };
        }
        else {
            throw new Error(`BrowserHTTPRequest.save() failed due to HTTP response status ` +
                `${response.status}.`);
        }
    }
    async loadModelJSON() {
        const modelConfigRequest = await this.fetch(this.path, this.requestInit);
        if (!modelConfigRequest.ok) {
            throw new Error(`Request to ${this.path} failed with status code ` +
                `${modelConfigRequest.status}. Please verify this URL points to ` +
                `the model JSON of the model to load.`);
        }
        let modelJSON;
        try {
            modelJSON = await modelConfigRequest.json();
        }
        catch (e) {
            let message = `Failed to parse model JSON of response from ${this.path}.`;
            // TODO(nsthorat): Remove this after some time when we're comfortable that
            // .pb files are mostly gone.
            if (this.path.endsWith('.pb')) {
                message += ' Your path contains a .pb file extension. ' +
                    'Support for .pb models have been removed in TensorFlow.js 1.0 ' +
                    'in favor of .json models. You can re-convert your Python ' +
                    'TensorFlow model using the TensorFlow.js 1.0 conversion scripts ' +
                    'or you can convert your.pb models with the \'pb2json\'' +
                    'NPM script in the tensorflow/tfjs-converter repository.';
            }
            else {
                message += ' Please make sure the server is serving valid ' +
                    'JSON for this request.';
            }
            throw new Error(message);
        }
        // We do not allow both modelTopology and weightsManifest to be missing.
        const modelTopology = modelJSON.modelTopology;
        const weightsManifest = modelJSON.weightsManifest;
        if (modelTopology == null && weightsManifest == null) {
            throw new Error(`The JSON from HTTP path ${this.path} contains neither model ` +
                `topology or manifest for weights.`);
        }
        return modelJSON;
    }
    /**
     * Load model artifacts via HTTP request(s).
     *
     * See the documentation to `tf.io.http` for details on the saved
     * artifacts.
     *
     * @returns The loaded model artifacts (if loading succeeds).
     */
    async load() {
        if (this.loadOptions.streamWeights) {
            return this.loadStream();
        }
        const modelJSON = await this.loadModelJSON();
        return getModelArtifactsForJSON(modelJSON, (weightsManifest) => this.loadWeights(weightsManifest));
    }
    async loadStream() {
        const modelJSON = await this.loadModelJSON();
        const fetchURLs = await this.getWeightUrls(modelJSON.weightsManifest);
        const weightSpecs = getWeightSpecs(modelJSON.weightsManifest);
        const stream = () => streamWeights(fetchURLs, this.loadOptions);
        return Object.assign(Object.assign({}, modelJSON), { weightSpecs, getWeightStream: stream });
    }
    async getWeightUrls(weightsManifest) {
        const weightPath = Array.isArray(this.path) ? this.path[1] : this.path;
        const [prefix, suffix] = parseUrl(weightPath);
        const pathPrefix = this.weightPathPrefix || prefix;
        const fetchURLs = [];
        const urlPromises = [];
        for (const weightsGroup of weightsManifest) {
            for (const path of weightsGroup.paths) {
                if (this.weightUrlConverter != null) {
                    urlPromises.push(this.weightUrlConverter(path));
                }
                else {
                    fetchURLs.push(pathPrefix + path + suffix);
                }
            }
        }
        if (this.weightUrlConverter) {
            fetchURLs.push(...await Promise.all(urlPromises));
        }
        return fetchURLs;
    }
    async loadWeights(weightsManifest) {
        const fetchURLs = await this.getWeightUrls(weightsManifest);
        const weightSpecs = getWeightSpecs(weightsManifest);
        const buffers = await loadWeightsAsArrayBuffer(fetchURLs, this.loadOptions);
        return [weightSpecs, buffers];
    }
}
HTTPRequest.URL_SCHEME_REGEX = /^https?:\/\//;
export { HTTPRequest };
/**
 * Extract the prefix and suffix of the url, where the prefix is the path before
 * the last file, and suffix is the search params after the last file.
 * ```
 * const url = 'http://tfhub.dev/model/1/tensorflowjs_model.pb?tfjs-format=file'
 * [prefix, suffix] = parseUrl(url)
 * // prefix = 'http://tfhub.dev/model/1/'
 * // suffix = '?tfjs-format=file'
 * ```
 * @param url the model url to be parsed.
 */
export function parseUrl(url) {
    const lastSlash = url.lastIndexOf('/');
    const lastSearchParam = url.lastIndexOf('?');
    const prefix = url.substring(0, lastSlash);
    const suffix = lastSearchParam > lastSlash ? url.substring(lastSearchParam) : '';
    return [prefix + '/', suffix];
}
export function isHTTPScheme(url) {
    return url.match(HTTPRequest.URL_SCHEME_REGEX) != null;
}
export const httpRouter = (url, loadOptions) => {
    if (typeof fetch === 'undefined' &&
        (loadOptions == null || loadOptions.fetchFunc == null)) {
        // `http` uses `fetch` or `node-fetch`, if one wants to use it in
        // an environment that is not the browser or node they have to setup a
        // global fetch polyfill.
        return null;
    }
    else {
        let isHTTP = true;
        if (Array.isArray(url)) {
            isHTTP = url.every(urlItem => isHTTPScheme(urlItem));
        }
        else {
            isHTTP = isHTTPScheme(url);
        }
        if (isHTTP) {
            return http(url, loadOptions);
        }
    }
    return null;
};
IORouterRegistry.registerSaveRouter(httpRouter);
IORouterRegistry.registerLoadRouter(httpRouter);
/**
 * Creates an IOHandler subtype that sends model artifacts to HTTP server.
 *
 * An HTTP request of the `multipart/form-data` mime type will be sent to the
 * `path` URL. The form data includes artifacts that represent the topology
 * and/or weights of the model. In the case of Keras-style `tf.Model`, two
 * blobs (files) exist in form-data:
 *   - A JSON file consisting of `modelTopology` and `weightsManifest`.
 *   - A binary weights file consisting of the concatenated weight values.
 * These files are in the same format as the one generated by
 * [tfjs_converter](https://js.tensorflow.org/tutorials/import-keras.html).
 *
 * The following code snippet exemplifies the client-side code that uses this
 * function:
 *
 * ```js
 * const model = tf.sequential();
 * model.add(
 *     tf.layers.dense({units: 1, inputShape: [100], activation: 'sigmoid'}));
 *
 * const saveResult = await model.save(tf.io.http(
 *     'http://model-server:5000/upload', {requestInit: {method: 'PUT'}}));
 * console.log(saveResult);
 * ```
 *
 * If the default `POST` method is to be used, without any custom parameters
 * such as headers, you can simply pass an HTTP or HTTPS URL to `model.save`:
 *
 * ```js
 * const saveResult = await model.save('http://model-server:5000/upload');
 * ```
 *
 * The following GitHub Gist
 * https://gist.github.com/dsmilkov/1b6046fd6132d7408d5257b0976f7864
 * implements a server based on [flask](https://github.com/pallets/flask) that
 * can receive the request. Upon receiving the model artifacts via the request,
 * this particular server reconstitutes instances of [Keras
 * Models](https://keras.io/models/model/) in memory.
 *
 *
 * @param path A URL path to the model.
 *   Can be an absolute HTTP path (e.g.,
 *   'http://localhost:8000/model-upload)') or a relative path (e.g.,
 *   './model-upload').
 * @param requestInit Request configurations to be used when sending
 *    HTTP request to server using `fetch`. It can contain fields such as
 *    `method`, `credentials`, `headers`, `mode`, etc. See
 *    https://developer.mozilla.org/en-US/docs/Web/API/Request/Request
 *    for more information. `requestInit` must not have a body, because the
 * body will be set by TensorFlow.js. File blobs representing the model
 * topology (filename: 'model.json') and the weights of the model (filename:
 * 'model.weights.bin') will be appended to the body. If `requestInit` has a
 * `body`, an Error will be thrown.
 * @param loadOptions Optional configuration for the loading. It includes the
 *   following fields:
 *   - weightPathPrefix Optional, this specifies the path prefix for weight
 *     files, by default this is calculated from the path param.
 *   - fetchFunc Optional, custom `fetch` function. E.g., in Node.js,
 *     the `fetch` from node-fetch can be used here.
 *   - onProgress Optional, progress callback function, fired periodically
 *     before the load is completed.
 * @returns An instance of `IOHandler`.
 *
 * @doc {
 *   heading: 'Models',
 *   subheading: 'Loading',
 *   namespace: 'io',
 *   ignoreCI: true
 * }
 */
export function http(path, loadOptions) {
    return new HTTPRequest(path, loadOptions);
}
/**
 * Deprecated. Use `tf.io.http`.
 * @param path
 * @param loadOptions
 */
export function browserHTTPRequest(path, loadOptions) {
    return http(path, loadOptions);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvaW8vaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7OztHQUlHO0FBRUgsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRW5DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxTQUFTLENBQUM7QUFDL0IsT0FBTyxFQUFDLHdCQUF3QixFQUFFLDRCQUE0QixFQUFFLDZCQUE2QixFQUFFLGNBQWMsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNqSSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQVcsZ0JBQWdCLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUU3RCxPQUFPLEVBQUMsd0JBQXdCLEVBQUUsYUFBYSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFFekUsTUFBTSxzQkFBc0IsR0FBRywwQkFBMEIsQ0FBQztBQUMxRCxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQztBQUNyQyxNQUFhLFdBQVc7SUFjdEIsWUFBWSxJQUFZLEVBQUUsV0FBeUI7UUFQMUMsbUJBQWMsR0FBRyxNQUFNLENBQUM7UUFRL0IsSUFBSSxXQUFXLElBQUksSUFBSSxFQUFFO1lBQ3ZCLFdBQVcsR0FBRyxFQUFFLENBQUM7U0FDbEI7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFDO1FBQ3JELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxXQUFXLENBQUMsa0JBQWtCLENBQUM7UUFFekQsSUFBSSxXQUFXLENBQUMsU0FBUyxJQUFJLElBQUksRUFBRTtZQUNqQyxNQUFNLENBQ0YsT0FBTyxXQUFXLENBQUMsU0FBUyxLQUFLLFVBQVUsRUFDM0MsR0FBRyxFQUFFLENBQUMscURBQXFEO2dCQUN2RCxlQUFlO2dCQUNm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QUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDdEQ7YUFBTTtZQUNMLE1BQU0sR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUI7UUFDRCxJQUFJLE1BQU0sRUFBRTtZQUNWLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztTQUMvQjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUM7QUFDTixnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNoRCxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUVoRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUVHO0FBQ0gsTUFBTSxVQUFVLElBQUksQ0FBQyxJQUFZLEVBQUUsV0FBeUI7SUFDMUQsT0FBTyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQzlCLElBQVksRUFBRSxXQUF5QjtJQUN6QyxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiBJT0hhbmRsZXIgaW1wbGVtZW50YXRpb25zIGJhc2VkIG9uIEhUVFAgcmVxdWVzdHMgaW4gdGhlIHdlYiBicm93c2VyLlxuICpcbiAqIFVzZXMgW2BmZXRjaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9GZXRjaF9BUEkpLlxuICovXG5cbmltcG9ydCB7ZW52fSBmcm9tICcuLi9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCB7YXNzZXJ0fSBmcm9tICcuLi91dGlsJztcbmltcG9ydCB7Z2V0TW9kZWxBcnRpZmFjdHNGb3JKU09OLCBnZXRNb2RlbEFydGlmYWN0c0luZm9Gb3JKU09OLCBnZXRNb2RlbEpTT05Gb3JNb2RlbEFydGlmYWN0cywgZ2V0V2VpZ2h0U3BlY3N9IGZyb20gJy4vaW9fdXRpbHMnO1xuaW1wb3J0IHtDb21wb3NpdGVBcnJheUJ1ZmZlcn0gZnJvbSAnLi9jb21wb3NpdGVfYXJyYXlfYnVmZmVyJztcbmltcG9ydCB7SU9Sb3V0ZXIsIElPUm91dGVyUmVnaXN0cnl9IGZyb20gJy4vcm91dGVyX3JlZ2lzdHJ5JztcbmltcG9ydCB7SU9IYW5kbGVyLCBMb2FkT3B0aW9ucywgTW9kZWxBcnRpZmFjdHMsIE1vZGVsSlNPTiwgU2F2ZVJlc3VsdCwgV2VpZ2h0RGF0YSwgV2VpZ2h0c01hbmlmZXN0Q29uZmlnLCBXZWlnaHRzTWFuaWZlc3RFbnRyeX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2xvYWRXZWlnaHRzQXNBcnJheUJ1ZmZlciwgc3RyZWFtV2VpZ2h0c30gZnJvbSAnLi93ZWlnaHRzX2xvYWRlcic7XG5cbmNvbnN0IE9DVEVUX1NUUkVBTV9NSU1FX1RZUEUgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbmNvbnN0IEpTT05fVFlQRSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbmV4cG9ydCBjbGFzcyBIVFRQUmVxdWVzdCBpbXBsZW1lbnRzIElPSGFuZGxlciB7XG4gIHByb3RlY3RlZCByZWFkb25seSBwYXRoOiBzdHJpbmc7XG4gIHByb3RlY3RlZCByZWFkb25seSByZXF1ZXN0SW5pdDogUmVxdWVzdEluaXQ7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBmZXRjaDogdHlwZW9mIGZldGNoO1xuICBwcml2YXRlIHJlYWRvbmx5IHdlaWdodFVybENvbnZlcnRlcjogKHdlaWdodE5hbWU6IHN0cmluZykgPT4gUHJvbWlzZTxzdHJpbmc+O1xuXG4gIHJlYWRvbmx5IERFRkFVTFRfTUVUSE9EID0gJ1BPU1QnO1xuXG4gIHN0YXRpYyByZWFkb25seSBVUkxfU0NIRU1FX1JFR0VYID0gL15odHRwcz86XFwvXFwvLztcblxuICBwcml2YXRlIHJlYWRvbmx5IHdlaWdodFBhdGhQcmVmaXg6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSBsb2FkT3B0aW9uczogTG9hZE9wdGlvbnM7XG5cbiAgY29uc3RydWN0b3IocGF0aDogc3RyaW5nLCBsb2FkT3B0aW9ucz86IExvYWRPcHRpb25zKSB7XG4gICAgaWYgKGxvYWRPcHRpb25zID09IG51bGwpIHtcbiAgICAgIGxvYWRPcHRpb25zID0ge307XG4gICAgfVxuICAgIHRoaXMud2VpZ2h0UGF0aFByZWZpeCA9IGxvYWRPcHRpb25zLndlaWdodFBhdGhQcmVmaXg7XG4gICAgdGhpcy53ZWlnaHRVcmxDb252ZXJ0ZXIgPSBsb2FkT3B0aW9ucy53ZWlnaHRVcmxDb252ZXJ0ZXI7XG5cbiAgICBpZiAobG9hZE9wdGlvbnMuZmV0Y2hGdW5jICE9IG51bGwpIHtcbiAgICAgIGFzc2VydChcbiAgICAgICAgICB0eXBlb2YgbG9hZE9wdGlvbnMuZmV0Y2hGdW5jID09PSAnZnVuY3Rpb24nLFxuICAgICAgICAgICgpID0+ICdNdXN0IHBhc3MgYSBmdW5jdGlvbiB0aGF0IG1hdGNoZXMgdGhlIHNpZ25hdHVyZSBvZiAnICtcbiAgICAgICAgICAgICAgJ2BmZXRjaGAgKHNlZSAnICtcbiAgICAgICAgICAgICAgJ2h0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9GZXRjaF9BUEkpJyk7XG4gICAgICB0aGlzLmZldGNoID0gbG9hZE9wdGlvbnMuZmV0Y2hGdW5jO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZldGNoID0gZW52KCkucGxhdGZvcm0uZmV0Y2g7XG4gICAgfVxuXG4gICAgYXNzZXJ0KFxuICAgICAgICBwYXRoICE9IG51bGwgJiYgcGF0aC5sZW5ndGggPiAwLFxuICAgICAgICAoKSA9PiAnVVJMIHBhdGggZm9yIGh0dHAgbXVzdCBub3QgYmUgbnVsbCwgdW5kZWZpbmVkIG9yICcgK1xuICAgICAgICAgICAgJ2VtcHR5LicpO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICAgIGFzc2VydChcbiAgICAgICAgICBwYXRoLmxlbmd0aCA9PT0gMixcbiAgICAgICAgICAoKSA9PiAnVVJMIHBhdGhzIGZvciBodHRwIG11c3QgaGF2ZSBhIGxlbmd0aCBvZiAyLCAnICtcbiAgICAgICAgICAgICAgYChhY3R1YWwgbGVuZ3RoIGlzICR7cGF0aC5sZW5ndGh9KS5gKTtcbiAgICB9XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcblxuICAgIGlmIChsb2FkT3B0aW9ucy5yZXF1ZXN0SW5pdCAhPSBudWxsICYmXG4gICAgICAgIGxvYWRPcHRpb25zLnJlcXVlc3RJbml0LmJvZHkgIT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdyZXF1ZXN0SW5pdCBpcyBleHBlY3RlZCB0byBoYXZlIG5vIHByZS1leGlzdGluZyBib2R5LCBidXQgaGFzIG9uZS4nKTtcbiAgICB9XG4gICAgdGhpcy5yZXF1ZXN0SW5pdCA9IGxvYWRPcHRpb25zLnJlcXVlc3RJbml0IHx8IHt9O1xuICAgIHRoaXMubG9hZE9wdGlvbnMgPSBsb2FkT3B0aW9ucztcbiAgfVxuXG4gIGFzeW5jIHNhdmUobW9kZWxBcnRpZmFjdHM6IE1vZGVsQXJ0aWZhY3RzKTogUHJvbWlzZTxTYXZlUmVzdWx0PiB7XG4gICAgaWYgKG1vZGVsQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdCcm93c2VySFRUUFJlcXVlc3Quc2F2ZSgpIGRvZXMgbm90IHN1cHBvcnQgc2F2aW5nIG1vZGVsIHRvcG9sb2d5ICcgK1xuICAgICAgICAgICdpbiBiaW5hcnkgZm9ybWF0cyB5ZXQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaW5pdCA9IE9iamVjdC5hc3NpZ24oe21ldGhvZDogdGhpcy5ERUZBVUxUX01FVEhPRH0sIHRoaXMucmVxdWVzdEluaXQpO1xuICAgIGluaXQuYm9keSA9IG5ldyBGb3JtRGF0YSgpO1xuXG4gICAgY29uc3Qgd2VpZ2h0c01hbmlmZXN0OiBXZWlnaHRzTWFuaWZlc3RDb25maWcgPSBbe1xuICAgICAgcGF0aHM6IFsnLi9tb2RlbC53ZWlnaHRzLmJpbiddLFxuICAgICAgd2VpZ2h0czogbW9kZWxBcnRpZmFjdHMud2VpZ2h0U3BlY3MsXG4gICAgfV07XG4gICAgY29uc3QgbW9kZWxUb3BvbG9neUFuZFdlaWdodE1hbmlmZXN0OiBNb2RlbEpTT04gPVxuICAgICAgICBnZXRNb2RlbEpTT05Gb3JNb2RlbEFydGlmYWN0cyhtb2RlbEFydGlmYWN0cywgd2VpZ2h0c01hbmlmZXN0KTtcblxuICAgIGluaXQuYm9keS5hcHBlbmQoXG4gICAgICAgICdtb2RlbC5qc29uJyxcbiAgICAgICAgbmV3IEJsb2IoXG4gICAgICAgICAgICBbSlNPTi5zdHJpbmdpZnkobW9kZWxUb3BvbG9neUFuZFdlaWdodE1hbmlmZXN0KV0sXG4gICAgICAgICAgICB7dHlwZTogSlNPTl9UWVBFfSksXG4gICAgICAgICdtb2RlbC5qc29uJyk7XG5cbiAgICBpZiAobW9kZWxBcnRpZmFjdHMud2VpZ2h0RGF0YSAhPSBudWxsKSB7XG4gICAgICAvLyBUT0RPKG1hdHRzb3VsYW5pbGxlKTogU3VwcG9ydCBzYXZpbmcgbW9kZWxzIG92ZXIgMkdCIHRoYXQgZXhjZWVkXG4gICAgICAvLyBDaHJvbWUncyBBcnJheUJ1ZmZlciBzaXplIGxpbWl0LlxuICAgICAgY29uc3Qgd2VpZ2h0QnVmZmVyID0gQ29tcG9zaXRlQXJyYXlCdWZmZXIuam9pbihtb2RlbEFydGlmYWN0cy53ZWlnaHREYXRhKTtcblxuICAgICAgaW5pdC5ib2R5LmFwcGVuZChcbiAgICAgICAgICAnbW9kZWwud2VpZ2h0cy5iaW4nLFxuICAgICAgICAgIG5ldyBCbG9iKFt3ZWlnaHRCdWZmZXJdLCB7dHlwZTogT0NURVRfU1RSRUFNX01JTUVfVFlQRX0pLFxuICAgICAgICAgICdtb2RlbC53ZWlnaHRzLmJpbicpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5mZXRjaCh0aGlzLnBhdGgsIGluaXQpO1xuXG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtb2RlbEFydGlmYWN0c0luZm86IGdldE1vZGVsQXJ0aWZhY3RzSW5mb0ZvckpTT04obW9kZWxBcnRpZmFjdHMpLFxuICAgICAgICByZXNwb25zZXM6IFtyZXNwb25zZV0sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEJyb3dzZXJIVFRQUmVxdWVzdC5zYXZlKCkgZmFpbGVkIGR1ZSB0byBIVFRQIHJlc3BvbnNlIHN0YXR1cyBgICtcbiAgICAgICAgICBgJHtyZXNwb25zZS5zdGF0dXN9LmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZE1vZGVsSlNPTigpOiBQcm9taXNlPE1vZGVsSlNPTj4ge1xuICAgIGNvbnN0IG1vZGVsQ29uZmlnUmVxdWVzdCA9IGF3YWl0IHRoaXMuZmV0Y2godGhpcy5wYXRoLCB0aGlzLnJlcXVlc3RJbml0KTtcblxuICAgIGlmICghbW9kZWxDb25maWdSZXF1ZXN0Lm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFJlcXVlc3QgdG8gJHt0aGlzLnBhdGh9IGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlIGAgK1xuICAgICAgICAgIGAke21vZGVsQ29uZmlnUmVxdWVzdC5zdGF0dXN9LiBQbGVhc2UgdmVyaWZ5IHRoaXMgVVJMIHBvaW50cyB0byBgICtcbiAgICAgICAgICBgdGhlIG1vZGVsIEpTT04gb2YgdGhlIG1vZGVsIHRvIGxvYWQuYCk7XG4gICAgfVxuICAgIGxldCBtb2RlbEpTT046IE1vZGVsSlNPTjtcbiAgICB0cnkge1xuICAgICAgbW9kZWxKU09OID0gYXdhaXQgbW9kZWxDb25maWdSZXF1ZXN0Lmpzb24oKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsZXQgbWVzc2FnZSA9IGBGYWlsZWQgdG8gcGFyc2UgbW9kZWwgSlNPTiBvZiByZXNwb25zZSBmcm9tICR7dGhpcy5wYXRofS5gO1xuICAgICAgLy8gVE9ETyhuc3Rob3JhdCk6IFJlbW92ZSB0aGlzIGFmdGVyIHNvbWUgdGltZSB3aGVuIHdlJ3JlIGNvbWZvcnRhYmxlIHRoYXRcbiAgICAgIC8vIC5wYiBmaWxlcyBhcmUgbW9zdGx5IGdvbmUuXG4gICAgICBpZiAodGhpcy5wYXRoLmVuZHNXaXRoKCcucGInKSkge1xuICAgICAgICBtZXNzYWdlICs9ICcgWW91ciBwYXRoIGNvbnRhaW5zIGEgLnBiIGZpbGUgZXh0ZW5zaW9uLiAnICtcbiAgICAgICAgICAgICdTdXBwb3J0IGZvciAucGIgbW9kZWxzIGhhdmUgYmVlbiByZW1vdmVkIGluIFRlbnNvckZsb3cuanMgMS4wICcgK1xuICAgICAgICAgICAgJ2luIGZhdm9yIG9mIC5qc29uIG1vZGVscy4gWW91IGNhbiByZS1jb252ZXJ0IHlvdXIgUHl0aG9uICcgK1xuICAgICAgICAgICAgJ1RlbnNvckZsb3cgbW9kZWwgdXNpbmcgdGhlIFRlbnNvckZsb3cuanMgMS4wIGNvbnZlcnNpb24gc2NyaXB0cyAnICtcbiAgICAgICAgICAgICdvciB5b3UgY2FuIGNvbnZlcnQgeW91ci5wYiBtb2RlbHMgd2l0aCB0aGUgXFwncGIyanNvblxcJycgK1xuICAgICAgICAgICAgJ05QTSBzY3JpcHQgaW4gdGhlIHRlbnNvcmZsb3cvdGZqcy1jb252ZXJ0ZXIgcmVwb3NpdG9yeS4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVzc2FnZSArPSAnIFBsZWFzZSBtYWtlIHN1cmUgdGhlIHNlcnZlciBpcyBzZXJ2aW5nIHZhbGlkICcgK1xuICAgICAgICAgICAgJ0pTT04gZm9yIHRoaXMgcmVxdWVzdC4nO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8vIFdlIGRvIG5vdCBhbGxvdyBib3RoIG1vZGVsVG9wb2xvZ3kgYW5kIHdlaWdodHNNYW5pZmVzdCB0byBiZSBtaXNzaW5nLlxuICAgIGNvbnN0IG1vZGVsVG9wb2xvZ3kgPSBtb2RlbEpTT04ubW9kZWxUb3BvbG9neTtcbiAgICBjb25zdCB3ZWlnaHRzTWFuaWZlc3QgPSBtb2RlbEpTT04ud2VpZ2h0c01hbmlmZXN0O1xuICAgIGlmIChtb2RlbFRvcG9sb2d5ID09IG51bGwgJiYgd2VpZ2h0c01hbmlmZXN0ID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVGhlIEpTT04gZnJvbSBIVFRQIHBhdGggJHt0aGlzLnBhdGh9IGNvbnRhaW5zIG5laXRoZXIgbW9kZWwgYCArXG4gICAgICAgICAgYHRvcG9sb2d5IG9yIG1hbmlmZXN0IGZvciB3ZWlnaHRzLmApO1xuICAgIH1cblxuICAgIHJldHVybiBtb2RlbEpTT047XG4gIH1cblxuICAvKipcbiAgICogTG9hZCBtb2RlbCBhcnRpZmFjdHMgdmlhIEhUVFAgcmVxdWVzdChzKS5cbiAgICpcbiAgICogU2VlIHRoZSBkb2N1bWVudGF0aW9uIHRvIGB0Zi5pby5odHRwYCBmb3IgZGV0YWlscyBvbiB0aGUgc2F2ZWRcbiAgICogYXJ0aWZhY3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgbG9hZGVkIG1vZGVsIGFydGlmYWN0cyAoaWYgbG9hZGluZyBzdWNjZWVkcykuXG4gICAqL1xuICBhc3luYyBsb2FkKCk6IFByb21pc2U8TW9kZWxBcnRpZmFjdHM+IHtcbiAgICBpZiAodGhpcy5sb2FkT3B0aW9ucy5zdHJlYW1XZWlnaHRzKSB7XG4gICAgICByZXR1cm4gdGhpcy5sb2FkU3RyZWFtKCk7XG4gICAgfVxuICAgIGNvbnN0IG1vZGVsSlNPTiA9IGF3YWl0IHRoaXMubG9hZE1vZGVsSlNPTigpO1xuICAgIHJldHVybiBnZXRNb2RlbEFydGlmYWN0c0ZvckpTT04oXG4gICAgICAgIG1vZGVsSlNPTiwgKHdlaWdodHNNYW5pZmVzdCkgPT4gdGhpcy5sb2FkV2VpZ2h0cyh3ZWlnaHRzTWFuaWZlc3QpKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFN0cmVhbSgpOiBQcm9taXNlPE1vZGVsQXJ0aWZhY3RzPiB7XG4gICAgY29uc3QgbW9kZWxKU09OID0gYXdhaXQgdGhpcy5sb2FkTW9kZWxKU09OKCk7XG4gICAgY29uc3QgZmV0Y2hVUkxzID0gYXdhaXQgdGhpcy5nZXRXZWlnaHRVcmxzKG1vZGVsSlNPTi53ZWlnaHRzTWFuaWZlc3QpO1xuICAgIGNvbnN0IHdlaWdodFNwZWNzID0gZ2V0V2VpZ2h0U3BlY3MobW9kZWxKU09OLndlaWdodHNNYW5pZmVzdCk7XG4gICAgY29uc3Qgc3RyZWFtID0gKCkgPT4gc3RyZWFtV2VpZ2h0cyhmZXRjaFVSTHMsIHRoaXMubG9hZE9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLm1vZGVsSlNPTixcbiAgICAgIHdlaWdodFNwZWNzLFxuICAgICAgZ2V0V2VpZ2h0U3RyZWFtOiBzdHJlYW0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0V2VpZ2h0VXJscyh3ZWlnaHRzTWFuaWZlc3Q6IFdlaWdodHNNYW5pZmVzdENvbmZpZyk6XG4gICAgUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHdlaWdodFBhdGggPSBBcnJheS5pc0FycmF5KHRoaXMucGF0aCkgPyB0aGlzLnBhdGhbMV0gOiB0aGlzLnBhdGg7XG4gICAgY29uc3QgW3ByZWZpeCwgc3VmZml4XSA9IHBhcnNlVXJsKHdlaWdodFBhdGgpO1xuICAgIGNvbnN0IHBhdGhQcmVmaXggPSB0aGlzLndlaWdodFBhdGhQcmVmaXggfHwgcHJlZml4O1xuXG4gICAgY29uc3QgZmV0Y2hVUkxzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHVybFByb21pc2VzOiBBcnJheTxQcm9taXNlPHN0cmluZz4+ID0gW107XG4gICAgZm9yIChjb25zdCB3ZWlnaHRzR3JvdXAgb2Ygd2VpZ2h0c01hbmlmZXN0KSB7XG4gICAgICBmb3IgKGNvbnN0IHBhdGggb2Ygd2VpZ2h0c0dyb3VwLnBhdGhzKSB7XG4gICAgICAgIGlmICh0aGlzLndlaWdodFVybENvbnZlcnRlciAhPSBudWxsKSB7XG4gICAgICAgICAgdXJsUHJvbWlzZXMucHVzaCh0aGlzLndlaWdodFVybENvbnZlcnRlcihwYXRoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZmV0Y2hVUkxzLnB1c2gocGF0aFByZWZpeCArIHBhdGggKyBzdWZmaXgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2VpZ2h0VXJsQ29udmVydGVyKSB7XG4gICAgICBmZXRjaFVSTHMucHVzaCguLi5hd2FpdCBQcm9taXNlLmFsbCh1cmxQcm9taXNlcykpO1xuICAgIH1cbiAgICByZXR1cm4gZmV0Y2hVUkxzO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsb2FkV2VpZ2h0cyh3ZWlnaHRzTWFuaWZlc3Q6IFdlaWdodHNNYW5pZmVzdENvbmZpZyk6XG4gICAgUHJvbWlzZTxbV2VpZ2h0c01hbmlmZXN0RW50cnlbXSwgV2VpZ2h0RGF0YV0+IHtcbiAgICBjb25zdCBmZXRjaFVSTHMgPSBhd2FpdCB0aGlzLmdldFdlaWdodFVybHMod2VpZ2h0c01hbmlmZXN0KTtcbiAgICBjb25zdCB3ZWlnaHRTcGVjcyA9IGdldFdlaWdodFNwZWNzKHdlaWdodHNNYW5pZmVzdCk7XG5cbiAgICBjb25zdCBidWZmZXJzID0gYXdhaXQgbG9hZFdlaWdodHNBc0FycmF5QnVmZmVyKGZldGNoVVJMcywgdGhpcy5sb2FkT3B0aW9ucyk7XG4gICAgcmV0dXJuIFt3ZWlnaHRTcGVjcywgYnVmZmVyc107XG4gIH1cbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRoZSBwcmVmaXggYW5kIHN1ZmZpeCBvZiB0aGUgdXJsLCB3aGVyZSB0aGUgcHJlZml4IGlzIHRoZSBwYXRoIGJlZm9yZVxuICogdGhlIGxhc3QgZmlsZSwgYW5kIHN1ZmZpeCBpcyB0aGUgc2VhcmNoIHBhcmFtcyBhZnRlciB0aGUgbGFzdCBmaWxlLlxuICogYGBgXG4gKiBjb25zdCB1cmwgPSAnaHR0cDovL3RmaHViLmRldi9tb2RlbC8xL3RlbnNvcmZsb3dqc19tb2RlbC5wYj90ZmpzLWZvcm1hdD1maWxlJ1xuICogW3ByZWZpeCwgc3VmZml4XSA9IHBhcnNlVXJsKHVybClcbiAqIC8vIHByZWZpeCA9ICdodHRwOi8vdGZodWIuZGV2L21vZGVsLzEvJ1xuICogLy8gc3VmZml4ID0gJz90ZmpzLWZvcm1hdD1maWxlJ1xuICogYGBgXG4gKiBAcGFyYW0gdXJsIHRoZSBtb2RlbCB1cmwgdG8gYmUgcGFyc2VkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmddIHtcbiAgY29uc3QgbGFzdFNsYXNoID0gdXJsLmxhc3RJbmRleE9mKCcvJyk7XG4gIGNvbnN0IGxhc3RTZWFyY2hQYXJhbSA9IHVybC5sYXN0SW5kZXhPZignPycpO1xuICBjb25zdCBwcmVmaXggPSB1cmwuc3Vic3RyaW5nKDAsIGxhc3RTbGFzaCk7XG4gIGNvbnN0IHN1ZmZpeCA9XG4gICAgICBsYXN0U2VhcmNoUGFyYW0gPiBsYXN0U2xhc2ggPyB1cmwuc3Vic3RyaW5nKGxhc3RTZWFyY2hQYXJhbSkgOiAnJztcbiAgcmV0dXJuIFtwcmVmaXggKyAnLycsIHN1ZmZpeF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0hUVFBTY2hlbWUodXJsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHVybC5tYXRjaChIVFRQUmVxdWVzdC5VUkxfU0NIRU1FX1JFR0VYKSAhPSBudWxsO1xufVxuXG5leHBvcnQgY29uc3QgaHR0cFJvdXRlcjogSU9Sb3V0ZXIgPVxuICAgICh1cmw6IHN0cmluZywgbG9hZE9wdGlvbnM/OiBMb2FkT3B0aW9ucykgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBmZXRjaCA9PT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAobG9hZE9wdGlvbnMgPT0gbnVsbCB8fCBsb2FkT3B0aW9ucy5mZXRjaEZ1bmMgPT0gbnVsbCkpIHtcbiAgICAgICAgLy8gYGh0dHBgIHVzZXMgYGZldGNoYCBvciBgbm9kZS1mZXRjaGAsIGlmIG9uZSB3YW50cyB0byB1c2UgaXQgaW5cbiAgICAgICAgLy8gYW4gZW52aXJvbm1lbnQgdGhhdCBpcyBub3QgdGhlIGJyb3dzZXIgb3Igbm9kZSB0aGV5IGhhdmUgdG8gc2V0dXAgYVxuICAgICAgICAvLyBnbG9iYWwgZmV0Y2ggcG9seWZpbGwuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGlzSFRUUCA9IHRydWU7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHVybCkpIHtcbiAgICAgICAgICBpc0hUVFAgPSB1cmwuZXZlcnkodXJsSXRlbSA9PiBpc0hUVFBTY2hlbWUodXJsSXRlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlzSFRUUCA9IGlzSFRUUFNjaGVtZSh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0hUVFApIHtcbiAgICAgICAgICByZXR1cm4gaHR0cCh1cmwsIGxvYWRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcbklPUm91dGVyUmVnaXN0cnkucmVnaXN0ZXJTYXZlUm91dGVyKGh0dHBSb3V0ZXIpO1xuSU9Sb3V0ZXJSZWdpc3RyeS5yZWdpc3RlckxvYWRSb3V0ZXIoaHR0cFJvdXRlcik7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBJT0hhbmRsZXIgc3VidHlwZSB0aGF0IHNlbmRzIG1vZGVsIGFydGlmYWN0cyB0byBIVFRQIHNlcnZlci5cbiAqXG4gKiBBbiBIVFRQIHJlcXVlc3Qgb2YgdGhlIGBtdWx0aXBhcnQvZm9ybS1kYXRhYCBtaW1lIHR5cGUgd2lsbCBiZSBzZW50IHRvIHRoZVxuICogYHBhdGhgIFVSTC4gVGhlIGZvcm0gZGF0YSBpbmNsdWRlcyBhcnRpZmFjdHMgdGhhdCByZXByZXNlbnQgdGhlIHRvcG9sb2d5XG4gKiBhbmQvb3Igd2VpZ2h0cyBvZiB0aGUgbW9kZWwuIEluIHRoZSBjYXNlIG9mIEtlcmFzLXN0eWxlIGB0Zi5Nb2RlbGAsIHR3b1xuICogYmxvYnMgKGZpbGVzKSBleGlzdCBpbiBmb3JtLWRhdGE6XG4gKiAgIC0gQSBKU09OIGZpbGUgY29uc2lzdGluZyBvZiBgbW9kZWxUb3BvbG9neWAgYW5kIGB3ZWlnaHRzTWFuaWZlc3RgLlxuICogICAtIEEgYmluYXJ5IHdlaWdodHMgZmlsZSBjb25zaXN0aW5nIG9mIHRoZSBjb25jYXRlbmF0ZWQgd2VpZ2h0IHZhbHVlcy5cbiAqIFRoZXNlIGZpbGVzIGFyZSBpbiB0aGUgc2FtZSBmb3JtYXQgYXMgdGhlIG9uZSBnZW5lcmF0ZWQgYnlcbiAqIFt0ZmpzX2NvbnZlcnRlcl0oaHR0cHM6Ly9qcy50ZW5zb3JmbG93Lm9yZy90dXRvcmlhbHMvaW1wb3J0LWtlcmFzLmh0bWwpLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgY29kZSBzbmlwcGV0IGV4ZW1wbGlmaWVzIHRoZSBjbGllbnQtc2lkZSBjb2RlIHRoYXQgdXNlcyB0aGlzXG4gKiBmdW5jdGlvbjpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgbW9kZWwgPSB0Zi5zZXF1ZW50aWFsKCk7XG4gKiBtb2RlbC5hZGQoXG4gKiAgICAgdGYubGF5ZXJzLmRlbnNlKHt1bml0czogMSwgaW5wdXRTaGFwZTogWzEwMF0sIGFjdGl2YXRpb246ICdzaWdtb2lkJ30pKTtcbiAqXG4gKiBjb25zdCBzYXZlUmVzdWx0ID0gYXdhaXQgbW9kZWwuc2F2ZSh0Zi5pby5odHRwKFxuICogICAgICdodHRwOi8vbW9kZWwtc2VydmVyOjUwMDAvdXBsb2FkJywge3JlcXVlc3RJbml0OiB7bWV0aG9kOiAnUFVUJ319KSk7XG4gKiBjb25zb2xlLmxvZyhzYXZlUmVzdWx0KTtcbiAqIGBgYFxuICpcbiAqIElmIHRoZSBkZWZhdWx0IGBQT1NUYCBtZXRob2QgaXMgdG8gYmUgdXNlZCwgd2l0aG91dCBhbnkgY3VzdG9tIHBhcmFtZXRlcnNcbiAqIHN1Y2ggYXMgaGVhZGVycywgeW91IGNhbiBzaW1wbHkgcGFzcyBhbiBIVFRQIG9yIEhUVFBTIFVSTCB0byBgbW9kZWwuc2F2ZWA6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IHNhdmVSZXN1bHQgPSBhd2FpdCBtb2RlbC5zYXZlKCdodHRwOi8vbW9kZWwtc2VydmVyOjUwMDAvdXBsb2FkJyk7XG4gKiBgYGBcbiAqXG4gKiBUaGUgZm9sbG93aW5nIEdpdEh1YiBHaXN0XG4gKiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kc21pbGtvdi8xYjYwNDZmZDYxMzJkNzQwOGQ1MjU3YjA5NzZmNzg2NFxuICogaW1wbGVtZW50cyBhIHNlcnZlciBiYXNlZCBvbiBbZmxhc2tdKGh0dHBzOi8vZ2l0aHViLmNvbS9wYWxsZXRzL2ZsYXNrKSB0aGF0XG4gKiBjYW4gcmVjZWl2ZSB0aGUgcmVxdWVzdC4gVXBvbiByZWNlaXZpbmcgdGhlIG1vZGVsIGFydGlmYWN0cyB2aWEgdGhlIHJlcXVlc3QsXG4gKiB0aGlzIHBhcnRpY3VsYXIgc2VydmVyIHJlY29uc3RpdHV0ZXMgaW5zdGFuY2VzIG9mIFtLZXJhc1xuICogTW9kZWxzXShodHRwczovL2tlcmFzLmlvL21vZGVscy9tb2RlbC8pIGluIG1lbW9yeS5cbiAqXG4gKlxuICogQHBhcmFtIHBhdGggQSBVUkwgcGF0aCB0byB0aGUgbW9kZWwuXG4gKiAgIENhbiBiZSBhbiBhYnNvbHV0ZSBIVFRQIHBhdGggKGUuZy4sXG4gKiAgICdodHRwOi8vbG9jYWxob3N0OjgwMDAvbW9kZWwtdXBsb2FkKScpIG9yIGEgcmVsYXRpdmUgcGF0aCAoZS5nLixcbiAqICAgJy4vbW9kZWwtdXBsb2FkJykuXG4gKiBAcGFyYW0gcmVxdWVzdEluaXQgUmVxdWVzdCBjb25maWd1cmF0aW9ucyB0byBiZSB1c2VkIHdoZW4gc2VuZGluZ1xuICogICAgSFRUUCByZXF1ZXN0IHRvIHNlcnZlciB1c2luZyBgZmV0Y2hgLiBJdCBjYW4gY29udGFpbiBmaWVsZHMgc3VjaCBhc1xuICogICAgYG1ldGhvZGAsIGBjcmVkZW50aWFsc2AsIGBoZWFkZXJzYCwgYG1vZGVgLCBldGMuIFNlZVxuICogICAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1JlcXVlc3QvUmVxdWVzdFxuICogICAgZm9yIG1vcmUgaW5mb3JtYXRpb24uIGByZXF1ZXN0SW5pdGAgbXVzdCBub3QgaGF2ZSBhIGJvZHksIGJlY2F1c2UgdGhlXG4gKiBib2R5IHdpbGwgYmUgc2V0IGJ5IFRlbnNvckZsb3cuanMuIEZpbGUgYmxvYnMgcmVwcmVzZW50aW5nIHRoZSBtb2RlbFxuICogdG9wb2xvZ3kgKGZpbGVuYW1lOiAnbW9kZWwuanNvbicpIGFuZCB0aGUgd2VpZ2h0cyBvZiB0aGUgbW9kZWwgKGZpbGVuYW1lOlxuICogJ21vZGVsLndlaWdodHMuYmluJykgd2lsbCBiZSBhcHBlbmRlZCB0byB0aGUgYm9keS4gSWYgYHJlcXVlc3RJbml0YCBoYXMgYVxuICogYGJvZHlgLCBhbiBFcnJvciB3aWxsIGJlIHRocm93bi5cbiAqIEBwYXJhbSBsb2FkT3B0aW9ucyBPcHRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgbG9hZGluZy4gSXQgaW5jbHVkZXMgdGhlXG4gKiAgIGZvbGxvd2luZyBmaWVsZHM6XG4gKiAgIC0gd2VpZ2h0UGF0aFByZWZpeCBPcHRpb25hbCwgdGhpcyBzcGVjaWZpZXMgdGhlIHBhdGggcHJlZml4IGZvciB3ZWlnaHRcbiAqICAgICBmaWxlcywgYnkgZGVmYXVsdCB0aGlzIGlzIGNhbGN1bGF0ZWQgZnJvbSB0aGUgcGF0aCBwYXJhbS5cbiAqICAgLSBmZXRjaEZ1bmMgT3B0aW9uYWwsIGN1c3RvbSBgZmV0Y2hgIGZ1bmN0aW9uLiBFLmcuLCBpbiBOb2RlLmpzLFxuICogICAgIHRoZSBgZmV0Y2hgIGZyb20gbm9kZS1mZXRjaCBjYW4gYmUgdXNlZCBoZXJlLlxuICogICAtIG9uUHJvZ3Jlc3MgT3B0aW9uYWwsIHByb2dyZXNzIGNhbGxiYWNrIGZ1bmN0aW9uLCBmaXJlZCBwZXJpb2RpY2FsbHlcbiAqICAgICBiZWZvcmUgdGhlIGxvYWQgaXMgY29tcGxldGVkLlxuICogQHJldHVybnMgQW4gaW5zdGFuY2Ugb2YgYElPSGFuZGxlcmAuXG4gKlxuICogQGRvYyB7XG4gKiAgIGhlYWRpbmc6ICdNb2RlbHMnLFxuICogICBzdWJoZWFkaW5nOiAnTG9hZGluZycsXG4gKiAgIG5hbWVzcGFjZTogJ2lvJyxcbiAqICAgaWdub3JlQ0k6IHRydWVcbiAqIH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGh0dHAocGF0aDogc3RyaW5nLCBsb2FkT3B0aW9ucz86IExvYWRPcHRpb25zKTogSU9IYW5kbGVyIHtcbiAgcmV0dXJuIG5ldyBIVFRQUmVxdWVzdChwYXRoLCBsb2FkT3B0aW9ucyk7XG59XG5cbi8qKlxuICogRGVwcmVjYXRlZC4gVXNlIGB0Zi5pby5odHRwYC5cbiAqIEBwYXJhbSBwYXRoXG4gKiBAcGFyYW0gbG9hZE9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJyb3dzZXJIVFRQUmVxdWVzdChcbiAgICBwYXRoOiBzdHJpbmcsIGxvYWRPcHRpb25zPzogTG9hZE9wdGlvbnMpOiBJT0hhbmRsZXIge1xuICByZXR1cm4gaHR0cChwYXRoLCBsb2FkT3B0aW9ucyk7XG59XG4iXX0=