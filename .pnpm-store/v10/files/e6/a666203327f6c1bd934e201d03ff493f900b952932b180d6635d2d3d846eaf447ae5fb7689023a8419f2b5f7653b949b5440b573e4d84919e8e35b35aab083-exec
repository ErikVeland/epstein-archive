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
 * IOHandlers related to files, such as browser-triggered file downloads,
 * user-selected files in browser.
 */
import '../flags';
import { env } from '../environment';
import { basename, getModelArtifactsForJSON, getModelArtifactsInfoForJSON, getModelJSONForModelArtifacts } from './io_utils';
import { IORouterRegistry } from './router_registry';
import { CompositeArrayBuffer } from './composite_array_buffer';
const DEFAULT_FILE_NAME_PREFIX = 'model';
const DEFAULT_JSON_EXTENSION_NAME = '.json';
const DEFAULT_WEIGHT_DATA_EXTENSION_NAME = '.weights.bin';
function defer(f) {
    return new Promise(resolve => setTimeout(resolve)).then(f);
}
class BrowserDownloads {
    constructor(fileNamePrefix) {
        if (!env().getBool('IS_BROWSER')) {
            // TODO(cais): Provide info on what IOHandlers are available under the
            //   current environment.
            throw new Error('browserDownloads() cannot proceed because the current environment ' +
                'is not a browser.');
        }
        if (fileNamePrefix.startsWith(BrowserDownloads.URL_SCHEME)) {
            fileNamePrefix = fileNamePrefix.slice(BrowserDownloads.URL_SCHEME.length);
        }
        if (fileNamePrefix == null || fileNamePrefix.length === 0) {
            fileNamePrefix = DEFAULT_FILE_NAME_PREFIX;
        }
        this.modelJsonFileName = fileNamePrefix + DEFAULT_JSON_EXTENSION_NAME;
        this.weightDataFileName =
            fileNamePrefix + DEFAULT_WEIGHT_DATA_EXTENSION_NAME;
    }
    async save(modelArtifacts) {
        if (typeof (document) === 'undefined') {
            throw new Error('Browser downloads are not supported in ' +
                'this environment since `document` is not present');
        }
        // TODO(mattsoulanille): Support saving models over 2GB that exceed
        // Chrome's ArrayBuffer size limit.
        const weightBuffer = CompositeArrayBuffer.join(modelArtifacts.weightData);
        const weightsURL = window.URL.createObjectURL(new Blob([weightBuffer], { type: 'application/octet-stream' }));
        if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
            throw new Error('BrowserDownloads.save() does not support saving model topology ' +
                'in binary formats yet.');
        }
        else {
            const weightsManifest = [{
                    paths: ['./' + this.weightDataFileName],
                    weights: modelArtifacts.weightSpecs
                }];
            const modelJSON = getModelJSONForModelArtifacts(modelArtifacts, weightsManifest);
            const modelJsonURL = window.URL.createObjectURL(new Blob([JSON.stringify(modelJSON)], { type: 'application/json' }));
            // If anchor elements are not provided, create them without attaching them
            // to parents, so that the downloaded file names can be controlled.
            const jsonAnchor = this.modelJsonAnchor == null ?
                document.createElement('a') :
                this.modelJsonAnchor;
            jsonAnchor.download = this.modelJsonFileName;
            jsonAnchor.href = modelJsonURL;
            // Trigger downloads by evoking a click event on the download anchors.
            // When multiple downloads are started synchronously, Firefox will only
            // save the last one.
            await defer(() => jsonAnchor.dispatchEvent(new MouseEvent('click')));
            if (modelArtifacts.weightData != null) {
                const weightDataAnchor = this.weightDataAnchor == null ?
                    document.createElement('a') :
                    this.weightDataAnchor;
                weightDataAnchor.download = this.weightDataFileName;
                weightDataAnchor.href = weightsURL;
                await defer(() => weightDataAnchor.dispatchEvent(new MouseEvent('click')));
            }
            return { modelArtifactsInfo: getModelArtifactsInfoForJSON(modelArtifacts) };
        }
    }
}
BrowserDownloads.URL_SCHEME = 'downloads://';
export { BrowserDownloads };
class BrowserFiles {
    constructor(files) {
        if (files == null || files.length < 1) {
            throw new Error(`When calling browserFiles, at least 1 file is required, ` +
                `but received ${files}`);
        }
        this.jsonFile = files[0];
        this.weightsFiles = files.slice(1);
    }
    async load() {
        return new Promise((resolve, reject) => {
            const jsonReader = new FileReader();
            jsonReader.onload = (event) => {
                // tslint:disable-next-line:no-any
                const modelJSON = JSON.parse(event.target.result);
                const modelTopology = modelJSON.modelTopology;
                if (modelTopology == null) {
                    reject(new Error(`modelTopology field is missing from file ${this.jsonFile.name}`));
                    return;
                }
                const weightsManifest = modelJSON.weightsManifest;
                if (weightsManifest == null) {
                    reject(new Error(`weightManifest field is missing from file ${this.jsonFile.name}`));
                    return;
                }
                if (this.weightsFiles.length === 0) {
                    resolve({ modelTopology });
                    return;
                }
                const modelArtifactsPromise = getModelArtifactsForJSON(modelJSON, (weightsManifest) => this.loadWeights(weightsManifest));
                resolve(modelArtifactsPromise);
            };
            jsonReader.onerror = error => reject(`Failed to read model topology and weights manifest JSON ` +
                `from file '${this.jsonFile.name}'. BrowserFiles supports loading ` +
                `Keras-style tf.Model artifacts only.`);
            jsonReader.readAsText(this.jsonFile);
        });
    }
    loadWeights(weightsManifest) {
        const weightSpecs = [];
        const paths = [];
        for (const entry of weightsManifest) {
            weightSpecs.push(...entry.weights);
            paths.push(...entry.paths);
        }
        const pathToFile = this.checkManifestAndWeightFiles(weightsManifest);
        const promises = paths.map(path => this.loadWeightsFile(path, pathToFile[path]));
        return Promise.all(promises).then(buffers => [weightSpecs, buffers]);
    }
    loadWeightsFile(path, file) {
        return new Promise((resolve, reject) => {
            const weightFileReader = new FileReader();
            weightFileReader.onload = (event) => {
                // tslint:disable-next-line:no-any
                const weightData = event.target.result;
                resolve(weightData);
            };
            weightFileReader.onerror = error => reject(`Failed to weights data from file of path '${path}'.`);
            weightFileReader.readAsArrayBuffer(file);
        });
    }
    /**
     * Check the compatibility between weights manifest and weight files.
     */
    checkManifestAndWeightFiles(manifest) {
        const basenames = [];
        const fileNames = this.weightsFiles.map(file => basename(file.name));
        const pathToFile = {};
        for (const group of manifest) {
            group.paths.forEach(path => {
                const pathBasename = basename(path);
                if (basenames.indexOf(pathBasename) !== -1) {
                    throw new Error(`Duplicate file basename found in weights manifest: ` +
                        `'${pathBasename}'`);
                }
                basenames.push(pathBasename);
                if (fileNames.indexOf(pathBasename) === -1) {
                    throw new Error(`Weight file with basename '${pathBasename}' is not provided.`);
                }
                else {
                    pathToFile[path] = this.weightsFiles[fileNames.indexOf(pathBasename)];
                }
            });
        }
        if (basenames.length !== this.weightsFiles.length) {
            throw new Error(`Mismatch in the number of files in weights manifest ` +
                `(${basenames.length}) and the number of weight files provided ` +
                `(${this.weightsFiles.length}).`);
        }
        return pathToFile;
    }
}
export const browserDownloadsRouter = (url) => {
    if (!env().getBool('IS_BROWSER')) {
        return null;
    }
    else {
        if (!Array.isArray(url) && url.startsWith(BrowserDownloads.URL_SCHEME)) {
            return browserDownloads(url.slice(BrowserDownloads.URL_SCHEME.length));
        }
        else {
            return null;
        }
    }
};
IORouterRegistry.registerSaveRouter(browserDownloadsRouter);
/**
 * Creates an IOHandler that triggers file downloads from the browser.
 *
 * The returned `IOHandler` instance can be used as model exporting methods such
 * as `tf.Model.save` and supports only saving.
 *
 * ```js
 * const model = tf.sequential();
 * model.add(tf.layers.dense(
 *     {units: 1, inputShape: [10], activation: 'sigmoid'}));
 * const saveResult = await model.save('downloads://mymodel');
 * // This will trigger downloading of two files:
 * //   'mymodel.json' and 'mymodel.weights.bin'.
 * console.log(saveResult);
 * ```
 *
 * @param fileNamePrefix Prefix name of the files to be downloaded. For use with
 *   `tf.Model`, `fileNamePrefix` should follow either of the following two
 *   formats:
 *   1. `null` or `undefined`, in which case the default file
 *      names will be used:
 *      - 'model.json' for the JSON file containing the model topology and
 *        weights manifest.
 *      - 'model.weights.bin' for the binary file containing the binary weight
 *        values.
 *   2. A single string or an Array of a single string, as the file name prefix.
 *      For example, if `'foo'` is provided, the downloaded JSON
 *      file and binary weights file will be named 'foo.json' and
 *      'foo.weights.bin', respectively.
 * @param config Additional configuration for triggering downloads.
 * @returns An instance of `BrowserDownloads` `IOHandler`.
 *
 * @doc {
 *   heading: 'Models',
 *   subheading: 'Loading',
 *   namespace: 'io',
 *   ignoreCI: true
 * }
 */
export function browserDownloads(fileNamePrefix = 'model') {
    return new BrowserDownloads(fileNamePrefix);
}
/**
 * Creates an IOHandler that loads model artifacts from user-selected files.
 *
 * This method can be used for loading from files such as user-selected files
 * in the browser.
 * When used in conjunction with `tf.loadLayersModel`, an instance of
 * `tf.LayersModel` (Keras-style) can be constructed from the loaded artifacts.
 *
 * ```js
 * // Note: This code snippet won't run properly without the actual file input
 * //   elements in the HTML DOM.
 *
 * // Suppose there are two HTML file input (`<input type="file" ...>`)
 * // elements.
 * const uploadJSONInput = document.getElementById('upload-json');
 * const uploadWeightsInput = document.getElementById('upload-weights');
 * const model = await tf.loadLayersModel(tf.io.browserFiles(
 *     [uploadJSONInput.files[0], uploadWeightsInput.files[0]]));
 * ```
 *
 * @param files `File`s to load from. Currently, this function supports only
 *   loading from files that contain Keras-style models (i.e., `tf.Model`s), for
 *   which an `Array` of `File`s is expected (in that order):
 *   - A JSON file containing the model topology and weight manifest.
 *   - Optionally, one or more binary files containing the binary weights.
 *     These files must have names that match the paths in the `weightsManifest`
 *     contained by the aforementioned JSON file, or errors will be thrown
 *     during loading. These weights files have the same format as the ones
 *     generated by `tensorflowjs_converter` that comes with the `tensorflowjs`
 *     Python PIP package. If no weights files are provided, only the model
 *     topology will be loaded from the JSON file above.
 * @returns An instance of `Files` `IOHandler`.
 *
 * @doc {
 *   heading: 'Models',
 *   subheading: 'Loading',
 *   namespace: 'io',
 *   ignoreCI: true
 * }
 */
export function browserFiles(files) {
    return new BrowserFiles(files);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlcl9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvaW8vYnJvd3Nlcl9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSDs7O0dBR0c7QUFFSCxPQUFPLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkMsT0FBTyxFQUFDLFFBQVEsRUFBRSx3QkFBd0IsRUFBRSw0QkFBNEIsRUFBRSw2QkFBNkIsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMzSCxPQUFPLEVBQVcsZ0JBQWdCLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUU3RCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUU5RCxNQUFNLHdCQUF3QixHQUFHLE9BQU8sQ0FBQztBQUN6QyxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQztBQUM1QyxNQUFNLGtDQUFrQyxHQUFHLGNBQWMsQ0FBQztBQUUxRCxTQUFTLEtBQUssQ0FBSSxDQUFVO0lBQzFCLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQztBQUVELE1BQWEsZ0JBQWdCO0lBUTNCLFlBQVksY0FBdUI7UUFDakMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUNoQyxzRUFBc0U7WUFDdEUseUJBQXlCO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQ1gsb0VBQW9FO2dCQUNwRSxtQkFBbUIsQ0FBQyxDQUFDO1NBQzFCO1FBRUQsSUFBSSxjQUFjLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzFELGNBQWMsR0FBRyxj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QyxZQUFZLENBQUMsRUFBRTtRQUNoQyxPQUFPLElBQUksQ0FBQztLQUNiO1NBQU07UUFDTCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3RFLE9BQU8sZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUN4RTthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0FBQ0gsQ0FBQyxDQUFDO0FBQ0YsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUU1RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQ0c7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsY0FBYyxHQUFHLE9BQU87SUFDdkQsT0FBTyxJQUFJLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBdUNHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUFhO0lBQ3hDLE9BQU8sSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiBJT0hhbmRsZXJzIHJlbGF0ZWQgdG8gZmlsZXMsIHN1Y2ggYXMgYnJvd3Nlci10cmlnZ2VyZWQgZmlsZSBkb3dubG9hZHMsXG4gKiB1c2VyLXNlbGVjdGVkIGZpbGVzIGluIGJyb3dzZXIuXG4gKi9cblxuaW1wb3J0ICcuLi9mbGFncyc7XG5pbXBvcnQge2Vudn0gZnJvbSAnLi4vZW52aXJvbm1lbnQnO1xuXG5pbXBvcnQge2Jhc2VuYW1lLCBnZXRNb2RlbEFydGlmYWN0c0ZvckpTT04sIGdldE1vZGVsQXJ0aWZhY3RzSW5mb0ZvckpTT04sIGdldE1vZGVsSlNPTkZvck1vZGVsQXJ0aWZhY3RzfSBmcm9tICcuL2lvX3V0aWxzJztcbmltcG9ydCB7SU9Sb3V0ZXIsIElPUm91dGVyUmVnaXN0cnl9IGZyb20gJy4vcm91dGVyX3JlZ2lzdHJ5JztcbmltcG9ydCB7SU9IYW5kbGVyLCBNb2RlbEFydGlmYWN0cywgTW9kZWxKU09OLCBTYXZlUmVzdWx0LCBXZWlnaHREYXRhLCBXZWlnaHRzTWFuaWZlc3RDb25maWcsIFdlaWdodHNNYW5pZmVzdEVudHJ5fSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Q29tcG9zaXRlQXJyYXlCdWZmZXJ9IGZyb20gJy4vY29tcG9zaXRlX2FycmF5X2J1ZmZlcic7XG5cbmNvbnN0IERFRkFVTFRfRklMRV9OQU1FX1BSRUZJWCA9ICdtb2RlbCc7XG5jb25zdCBERUZBVUxUX0pTT05fRVhURU5TSU9OX05BTUUgPSAnLmpzb24nO1xuY29uc3QgREVGQVVMVF9XRUlHSFRfREFUQV9FWFRFTlNJT05fTkFNRSA9ICcud2VpZ2h0cy5iaW4nO1xuXG5mdW5jdGlvbiBkZWZlcjxUPihmOiAoKSA9PiBUKTogUHJvbWlzZTxUPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSkpLnRoZW4oZik7XG59XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VyRG93bmxvYWRzIGltcGxlbWVudHMgSU9IYW5kbGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBtb2RlbEpzb25GaWxlTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHdlaWdodERhdGFGaWxlTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IG1vZGVsSnNvbkFuY2hvcjogSFRNTEFuY2hvckVsZW1lbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgd2VpZ2h0RGF0YUFuY2hvcjogSFRNTEFuY2hvckVsZW1lbnQ7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFVSTF9TQ0hFTUUgPSAnZG93bmxvYWRzOi8vJztcblxuICBjb25zdHJ1Y3RvcihmaWxlTmFtZVByZWZpeD86IHN0cmluZykge1xuICAgIGlmICghZW52KCkuZ2V0Qm9vbCgnSVNfQlJPV1NFUicpKSB7XG4gICAgICAvLyBUT0RPKGNhaXMpOiBQcm92aWRlIGluZm8gb24gd2hhdCBJT0hhbmRsZXJzIGFyZSBhdmFpbGFibGUgdW5kZXIgdGhlXG4gICAgICAvLyAgIGN1cnJlbnQgZW52aXJvbm1lbnQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ2Jyb3dzZXJEb3dubG9hZHMoKSBjYW5ub3QgcHJvY2VlZCBiZWNhdXNlIHRoZSBjdXJyZW50IGVudmlyb25tZW50ICcgK1xuICAgICAgICAgICdpcyBub3QgYSBicm93c2VyLicpO1xuICAgIH1cblxuICAgIGlmIChmaWxlTmFtZVByZWZpeC5zdGFydHNXaXRoKEJyb3dzZXJEb3dubG9hZHMuVVJMX1NDSEVNRSkpIHtcbiAgICAgIGZpbGVOYW1lUHJlZml4ID0gZmlsZU5hbWVQcmVmaXguc2xpY2UoQnJvd3NlckRvd25sb2Fkcy5VUkxfU0NIRU1FLmxlbmd0aCk7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZVByZWZpeCA9PSBudWxsIHx8IGZpbGVOYW1lUHJlZml4Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgZmlsZU5hbWVQcmVmaXggPSBERUZBVUxUX0ZJTEVfTkFNRV9QUkVGSVg7XG4gICAgfVxuXG4gICAgdGhpcy5tb2RlbEpzb25GaWxlTmFtZSA9IGZpbGVOYW1lUHJlZml4ICsgREVGQVVMVF9KU09OX0VYVEVOU0lPTl9OQU1FO1xuICAgIHRoaXMud2VpZ2h0RGF0YUZpbGVOYW1lID1cbiAgICAgICAgZmlsZU5hbWVQcmVmaXggKyBERUZBVUxUX1dFSUdIVF9EQVRBX0VYVEVOU0lPTl9OQU1FO1xuICB9XG5cbiAgYXN5bmMgc2F2ZShtb2RlbEFydGlmYWN0czogTW9kZWxBcnRpZmFjdHMpOiBQcm9taXNlPFNhdmVSZXN1bHQ+IHtcbiAgICBpZiAodHlwZW9mIChkb2N1bWVudCkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0Jyb3dzZXIgZG93bmxvYWRzIGFyZSBub3Qgc3VwcG9ydGVkIGluICcgK1xuICAgICAgICAgICd0aGlzIGVudmlyb25tZW50IHNpbmNlIGBkb2N1bWVudGAgaXMgbm90IHByZXNlbnQnKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKG1hdHRzb3VsYW5pbGxlKTogU3VwcG9ydCBzYXZpbmcgbW9kZWxzIG92ZXIgMkdCIHRoYXQgZXhjZWVkXG4gICAgLy8gQ2hyb21lJ3MgQXJyYXlCdWZmZXIgc2l6ZSBsaW1pdC5cbiAgICBjb25zdCB3ZWlnaHRCdWZmZXIgPSBDb21wb3NpdGVBcnJheUJ1ZmZlci5qb2luKG1vZGVsQXJ0aWZhY3RzLndlaWdodERhdGEpO1xuXG4gICAgY29uc3Qgd2VpZ2h0c1VSTCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKG5ldyBCbG9iKFxuICAgICAgICBbd2VpZ2h0QnVmZmVyXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfSkpO1xuXG4gICAgaWYgKG1vZGVsQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdCcm93c2VyRG93bmxvYWRzLnNhdmUoKSBkb2VzIG5vdCBzdXBwb3J0IHNhdmluZyBtb2RlbCB0b3BvbG9neSAnICtcbiAgICAgICAgICAnaW4gYmluYXJ5IGZvcm1hdHMgeWV0LicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB3ZWlnaHRzTWFuaWZlc3Q6IFdlaWdodHNNYW5pZmVzdENvbmZpZyA9IFt7XG4gICAgICAgIHBhdGhzOiBbJy4vJyArIHRoaXMud2VpZ2h0RGF0YUZpbGVOYW1lXSxcbiAgICAgICAgd2VpZ2h0czogbW9kZWxBcnRpZmFjdHMud2VpZ2h0U3BlY3NcbiAgICAgIH1dO1xuICAgICAgY29uc3QgbW9kZWxKU09OOiBNb2RlbEpTT04gPVxuICAgICAgICAgIGdldE1vZGVsSlNPTkZvck1vZGVsQXJ0aWZhY3RzKG1vZGVsQXJ0aWZhY3RzLCB3ZWlnaHRzTWFuaWZlc3QpO1xuXG4gICAgICBjb25zdCBtb2RlbEpzb25VUkwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChcbiAgICAgICAgICBuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkobW9kZWxKU09OKV0sIHt0eXBlOiAnYXBwbGljYXRpb24vanNvbid9KSk7XG5cbiAgICAgIC8vIElmIGFuY2hvciBlbGVtZW50cyBhcmUgbm90IHByb3ZpZGVkLCBjcmVhdGUgdGhlbSB3aXRob3V0IGF0dGFjaGluZyB0aGVtXG4gICAgICAvLyB0byBwYXJlbnRzLCBzbyB0aGF0IHRoZSBkb3dubG9hZGVkIGZpbGUgbmFtZXMgY2FuIGJlIGNvbnRyb2xsZWQuXG4gICAgICBjb25zdCBqc29uQW5jaG9yID0gdGhpcy5tb2RlbEpzb25BbmNob3IgPT0gbnVsbCA/XG4gICAgICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpIDpcbiAgICAgICAgICB0aGlzLm1vZGVsSnNvbkFuY2hvcjtcbiAgICAgIGpzb25BbmNob3IuZG93bmxvYWQgPSB0aGlzLm1vZGVsSnNvbkZpbGVOYW1lO1xuICAgICAganNvbkFuY2hvci5ocmVmID0gbW9kZWxKc29uVVJMO1xuICAgICAgLy8gVHJpZ2dlciBkb3dubG9hZHMgYnkgZXZva2luZyBhIGNsaWNrIGV2ZW50IG9uIHRoZSBkb3dubG9hZCBhbmNob3JzLlxuICAgICAgLy8gV2hlbiBtdWx0aXBsZSBkb3dubG9hZHMgYXJlIHN0YXJ0ZWQgc3luY2hyb25vdXNseSwgRmlyZWZveCB3aWxsIG9ubHlcbiAgICAgIC8vIHNhdmUgdGhlIGxhc3Qgb25lLlxuICAgICAgYXdhaXQgZGVmZXIoKCkgPT4ganNvbkFuY2hvci5kaXNwYXRjaEV2ZW50KG5ldyBNb3VzZUV2ZW50KCdjbGljaycpKSk7XG5cbiAgICAgIGlmIChtb2RlbEFydGlmYWN0cy53ZWlnaHREYXRhICE9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgd2VpZ2h0RGF0YUFuY2hvciA9IHRoaXMud2VpZ2h0RGF0YUFuY2hvciA9PSBudWxsID9cbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKSA6XG4gICAgICAgICAgICB0aGlzLndlaWdodERhdGFBbmNob3I7XG4gICAgICAgIHdlaWdodERhdGFBbmNob3IuZG93bmxvYWQgPSB0aGlzLndlaWdodERhdGFGaWxlTmFtZTtcbiAgICAgICAgd2VpZ2h0RGF0YUFuY2hvci5ocmVmID0gd2VpZ2h0c1VSTDtcbiAgICAgICAgYXdhaXQgZGVmZXIoXG4gICAgICAgICAgICAoKSA9PiB3ZWlnaHREYXRhQW5jaG9yLmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoJ2NsaWNrJykpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHttb2RlbEFydGlmYWN0c0luZm86IGdldE1vZGVsQXJ0aWZhY3RzSW5mb0ZvckpTT04obW9kZWxBcnRpZmFjdHMpfTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQnJvd3NlckZpbGVzIGltcGxlbWVudHMgSU9IYW5kbGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBqc29uRmlsZTogRmlsZTtcbiAgcHJpdmF0ZSByZWFkb25seSB3ZWlnaHRzRmlsZXM6IEZpbGVbXTtcblxuICBjb25zdHJ1Y3RvcihmaWxlczogRmlsZVtdKSB7XG4gICAgaWYgKGZpbGVzID09IG51bGwgfHwgZmlsZXMubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBXaGVuIGNhbGxpbmcgYnJvd3NlckZpbGVzLCBhdCBsZWFzdCAxIGZpbGUgaXMgcmVxdWlyZWQsIGAgK1xuICAgICAgICAgIGBidXQgcmVjZWl2ZWQgJHtmaWxlc31gKTtcbiAgICB9XG4gICAgdGhpcy5qc29uRmlsZSA9IGZpbGVzWzBdO1xuICAgIHRoaXMud2VpZ2h0c0ZpbGVzID0gZmlsZXMuc2xpY2UoMSk7XG4gIH1cblxuICBhc3luYyBsb2FkKCk6IFByb21pc2U8TW9kZWxBcnRpZmFjdHM+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QganNvblJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICBqc29uUmVhZGVyLm9ubG9hZCA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICBjb25zdCBtb2RlbEpTT04gPSBKU09OLnBhcnNlKChldmVudC50YXJnZXQgYXMgYW55KS5yZXN1bHQpIGFzIE1vZGVsSlNPTjtcblxuICAgICAgICBjb25zdCBtb2RlbFRvcG9sb2d5ID0gbW9kZWxKU09OLm1vZGVsVG9wb2xvZ3k7XG4gICAgICAgIGlmIChtb2RlbFRvcG9sb2d5ID09IG51bGwpIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBtb2RlbFRvcG9sb2d5IGZpZWxkIGlzIG1pc3NpbmcgZnJvbSBmaWxlICR7XG4gICAgICAgICAgICAgIHRoaXMuanNvbkZpbGUubmFtZX1gKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd2VpZ2h0c01hbmlmZXN0ID0gbW9kZWxKU09OLndlaWdodHNNYW5pZmVzdDtcbiAgICAgICAgaWYgKHdlaWdodHNNYW5pZmVzdCA9PSBudWxsKSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgd2VpZ2h0TWFuaWZlc3QgZmllbGQgaXMgbWlzc2luZyBmcm9tIGZpbGUgJHtcbiAgICAgICAgICAgICAgdGhpcy5qc29uRmlsZS5uYW1lfWApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy53ZWlnaHRzRmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmVzb2x2ZSh7bW9kZWxUb3BvbG9neX0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1vZGVsQXJ0aWZhY3RzUHJvbWlzZSA9IGdldE1vZGVsQXJ0aWZhY3RzRm9ySlNPTihcbiAgICAgICAgICAgIG1vZGVsSlNPTiwgKHdlaWdodHNNYW5pZmVzdCkgPT4gdGhpcy5sb2FkV2VpZ2h0cyh3ZWlnaHRzTWFuaWZlc3QpKTtcbiAgICAgICAgcmVzb2x2ZShtb2RlbEFydGlmYWN0c1Byb21pc2UpO1xuICAgICAgfTtcblxuICAgICAganNvblJlYWRlci5vbmVycm9yID0gZXJyb3IgPT4gcmVqZWN0KFxuICAgICAgICAgIGBGYWlsZWQgdG8gcmVhZCBtb2RlbCB0b3BvbG9neSBhbmQgd2VpZ2h0cyBtYW5pZmVzdCBKU09OIGAgK1xuICAgICAgICAgIGBmcm9tIGZpbGUgJyR7dGhpcy5qc29uRmlsZS5uYW1lfScuIEJyb3dzZXJGaWxlcyBzdXBwb3J0cyBsb2FkaW5nIGAgK1xuICAgICAgICAgIGBLZXJhcy1zdHlsZSB0Zi5Nb2RlbCBhcnRpZmFjdHMgb25seS5gKTtcbiAgICAgIGpzb25SZWFkZXIucmVhZEFzVGV4dCh0aGlzLmpzb25GaWxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZFdlaWdodHMod2VpZ2h0c01hbmlmZXN0OiBXZWlnaHRzTWFuaWZlc3RDb25maWcpOiBQcm9taXNlPFtcbiAgICAvKiB3ZWlnaHRTcGVjcyAqLyBXZWlnaHRzTWFuaWZlc3RFbnRyeVtdLCBXZWlnaHREYXRhLFxuICBdPiB7XG4gICAgY29uc3Qgd2VpZ2h0U3BlY3M6IFdlaWdodHNNYW5pZmVzdEVudHJ5W10gPSBbXTtcbiAgICBjb25zdCBwYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHdlaWdodHNNYW5pZmVzdCkge1xuICAgICAgd2VpZ2h0U3BlY3MucHVzaCguLi5lbnRyeS53ZWlnaHRzKTtcbiAgICAgIHBhdGhzLnB1c2goLi4uZW50cnkucGF0aHMpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdGhUb0ZpbGU6IHtbcGF0aDogc3RyaW5nXTogRmlsZX0gPVxuICAgICAgICB0aGlzLmNoZWNrTWFuaWZlc3RBbmRXZWlnaHRGaWxlcyh3ZWlnaHRzTWFuaWZlc3QpO1xuXG4gICAgY29uc3QgcHJvbWlzZXM6IEFycmF5PFByb21pc2U8QXJyYXlCdWZmZXI+PiA9XG4gICAgICAgIHBhdGhzLm1hcChwYXRoID0+IHRoaXMubG9hZFdlaWdodHNGaWxlKHBhdGgsIHBhdGhUb0ZpbGVbcGF0aF0pKTtcblxuICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihcbiAgICAgICAgYnVmZmVycyA9PiBbd2VpZ2h0U3BlY3MsIGJ1ZmZlcnNdKTtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZFdlaWdodHNGaWxlKHBhdGg6IHN0cmluZywgZmlsZTogRmlsZSk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgd2VpZ2h0RmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICB3ZWlnaHRGaWxlUmVhZGVyLm9ubG9hZCA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICBjb25zdCB3ZWlnaHREYXRhID0gKGV2ZW50LnRhcmdldCBhcyBhbnkpLnJlc3VsdCBhcyBBcnJheUJ1ZmZlcjtcbiAgICAgICAgcmVzb2x2ZSh3ZWlnaHREYXRhKTtcbiAgICAgIH07XG4gICAgICB3ZWlnaHRGaWxlUmVhZGVyLm9uZXJyb3IgPSBlcnJvciA9PlxuICAgICAgICAgIHJlamVjdChgRmFpbGVkIHRvIHdlaWdodHMgZGF0YSBmcm9tIGZpbGUgb2YgcGF0aCAnJHtwYXRofScuYCk7XG4gICAgICB3ZWlnaHRGaWxlUmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRoZSBjb21wYXRpYmlsaXR5IGJldHdlZW4gd2VpZ2h0cyBtYW5pZmVzdCBhbmQgd2VpZ2h0IGZpbGVzLlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja01hbmlmZXN0QW5kV2VpZ2h0RmlsZXMobWFuaWZlc3Q6IFdlaWdodHNNYW5pZmVzdENvbmZpZyk6XG4gICAgICB7W3BhdGg6IHN0cmluZ106IEZpbGV9IHtcbiAgICBjb25zdCBiYXNlbmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgZmlsZU5hbWVzID0gdGhpcy53ZWlnaHRzRmlsZXMubWFwKGZpbGUgPT4gYmFzZW5hbWUoZmlsZS5uYW1lKSk7XG4gICAgY29uc3QgcGF0aFRvRmlsZToge1twYXRoOiBzdHJpbmddOiBGaWxlfSA9IHt9O1xuICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgbWFuaWZlc3QpIHtcbiAgICAgIGdyb3VwLnBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgIGNvbnN0IHBhdGhCYXNlbmFtZSA9IGJhc2VuYW1lKHBhdGgpO1xuICAgICAgICBpZiAoYmFzZW5hbWVzLmluZGV4T2YocGF0aEJhc2VuYW1lKSAhPT0gLTEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBEdXBsaWNhdGUgZmlsZSBiYXNlbmFtZSBmb3VuZCBpbiB3ZWlnaHRzIG1hbmlmZXN0OiBgICtcbiAgICAgICAgICAgICAgYCcke3BhdGhCYXNlbmFtZX0nYCk7XG4gICAgICAgIH1cbiAgICAgICAgYmFzZW5hbWVzLnB1c2gocGF0aEJhc2VuYW1lKTtcbiAgICAgICAgaWYgKGZpbGVOYW1lcy5pbmRleE9mKHBhdGhCYXNlbmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgV2VpZ2h0IGZpbGUgd2l0aCBiYXNlbmFtZSAnJHtwYXRoQmFzZW5hbWV9JyBpcyBub3QgcHJvdmlkZWQuYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGF0aFRvRmlsZVtwYXRoXSA9IHRoaXMud2VpZ2h0c0ZpbGVzW2ZpbGVOYW1lcy5pbmRleE9mKHBhdGhCYXNlbmFtZSldO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoYmFzZW5hbWVzLmxlbmd0aCAhPT0gdGhpcy53ZWlnaHRzRmlsZXMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE1pc21hdGNoIGluIHRoZSBudW1iZXIgb2YgZmlsZXMgaW4gd2VpZ2h0cyBtYW5pZmVzdCBgICtcbiAgICAgICAgICBgKCR7YmFzZW5hbWVzLmxlbmd0aH0pIGFuZCB0aGUgbnVtYmVyIG9mIHdlaWdodCBmaWxlcyBwcm92aWRlZCBgICtcbiAgICAgICAgICBgKCR7dGhpcy53ZWlnaHRzRmlsZXMubGVuZ3RofSkuYCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoVG9GaWxlO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBicm93c2VyRG93bmxvYWRzUm91dGVyOiBJT1JvdXRlciA9ICh1cmw6IHN0cmluZ3xzdHJpbmdbXSkgPT4ge1xuICBpZiAoIWVudigpLmdldEJvb2woJ0lTX0JST1dTRVInKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2Uge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh1cmwpICYmIHVybC5zdGFydHNXaXRoKEJyb3dzZXJEb3dubG9hZHMuVVJMX1NDSEVNRSkpIHtcbiAgICAgIHJldHVybiBicm93c2VyRG93bmxvYWRzKHVybC5zbGljZShCcm93c2VyRG93bmxvYWRzLlVSTF9TQ0hFTUUubGVuZ3RoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufTtcbklPUm91dGVyUmVnaXN0cnkucmVnaXN0ZXJTYXZlUm91dGVyKGJyb3dzZXJEb3dubG9hZHNSb3V0ZXIpO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gSU9IYW5kbGVyIHRoYXQgdHJpZ2dlcnMgZmlsZSBkb3dubG9hZHMgZnJvbSB0aGUgYnJvd3Nlci5cbiAqXG4gKiBUaGUgcmV0dXJuZWQgYElPSGFuZGxlcmAgaW5zdGFuY2UgY2FuIGJlIHVzZWQgYXMgbW9kZWwgZXhwb3J0aW5nIG1ldGhvZHMgc3VjaFxuICogYXMgYHRmLk1vZGVsLnNhdmVgIGFuZCBzdXBwb3J0cyBvbmx5IHNhdmluZy5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgbW9kZWwgPSB0Zi5zZXF1ZW50aWFsKCk7XG4gKiBtb2RlbC5hZGQodGYubGF5ZXJzLmRlbnNlKFxuICogICAgIHt1bml0czogMSwgaW5wdXRTaGFwZTogWzEwXSwgYWN0aXZhdGlvbjogJ3NpZ21vaWQnfSkpO1xuICogY29uc3Qgc2F2ZVJlc3VsdCA9IGF3YWl0IG1vZGVsLnNhdmUoJ2Rvd25sb2FkczovL215bW9kZWwnKTtcbiAqIC8vIFRoaXMgd2lsbCB0cmlnZ2VyIGRvd25sb2FkaW5nIG9mIHR3byBmaWxlczpcbiAqIC8vICAgJ215bW9kZWwuanNvbicgYW5kICdteW1vZGVsLndlaWdodHMuYmluJy5cbiAqIGNvbnNvbGUubG9nKHNhdmVSZXN1bHQpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGZpbGVOYW1lUHJlZml4IFByZWZpeCBuYW1lIG9mIHRoZSBmaWxlcyB0byBiZSBkb3dubG9hZGVkLiBGb3IgdXNlIHdpdGhcbiAqICAgYHRmLk1vZGVsYCwgYGZpbGVOYW1lUHJlZml4YCBzaG91bGQgZm9sbG93IGVpdGhlciBvZiB0aGUgZm9sbG93aW5nIHR3b1xuICogICBmb3JtYXRzOlxuICogICAxLiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAsIGluIHdoaWNoIGNhc2UgdGhlIGRlZmF1bHQgZmlsZVxuICogICAgICBuYW1lcyB3aWxsIGJlIHVzZWQ6XG4gKiAgICAgIC0gJ21vZGVsLmpzb24nIGZvciB0aGUgSlNPTiBmaWxlIGNvbnRhaW5pbmcgdGhlIG1vZGVsIHRvcG9sb2d5IGFuZFxuICogICAgICAgIHdlaWdodHMgbWFuaWZlc3QuXG4gKiAgICAgIC0gJ21vZGVsLndlaWdodHMuYmluJyBmb3IgdGhlIGJpbmFyeSBmaWxlIGNvbnRhaW5pbmcgdGhlIGJpbmFyeSB3ZWlnaHRcbiAqICAgICAgICB2YWx1ZXMuXG4gKiAgIDIuIEEgc2luZ2xlIHN0cmluZyBvciBhbiBBcnJheSBvZiBhIHNpbmdsZSBzdHJpbmcsIGFzIHRoZSBmaWxlIG5hbWUgcHJlZml4LlxuICogICAgICBGb3IgZXhhbXBsZSwgaWYgYCdmb28nYCBpcyBwcm92aWRlZCwgdGhlIGRvd25sb2FkZWQgSlNPTlxuICogICAgICBmaWxlIGFuZCBiaW5hcnkgd2VpZ2h0cyBmaWxlIHdpbGwgYmUgbmFtZWQgJ2Zvby5qc29uJyBhbmRcbiAqICAgICAgJ2Zvby53ZWlnaHRzLmJpbicsIHJlc3BlY3RpdmVseS5cbiAqIEBwYXJhbSBjb25maWcgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0cmlnZ2VyaW5nIGRvd25sb2Fkcy5cbiAqIEByZXR1cm5zIEFuIGluc3RhbmNlIG9mIGBCcm93c2VyRG93bmxvYWRzYCBgSU9IYW5kbGVyYC5cbiAqXG4gKiBAZG9jIHtcbiAqICAgaGVhZGluZzogJ01vZGVscycsXG4gKiAgIHN1YmhlYWRpbmc6ICdMb2FkaW5nJyxcbiAqICAgbmFtZXNwYWNlOiAnaW8nLFxuICogICBpZ25vcmVDSTogdHJ1ZVxuICogfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYnJvd3NlckRvd25sb2FkcyhmaWxlTmFtZVByZWZpeCA9ICdtb2RlbCcpOiBJT0hhbmRsZXIge1xuICByZXR1cm4gbmV3IEJyb3dzZXJEb3dubG9hZHMoZmlsZU5hbWVQcmVmaXgpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gSU9IYW5kbGVyIHRoYXQgbG9hZHMgbW9kZWwgYXJ0aWZhY3RzIGZyb20gdXNlci1zZWxlY3RlZCBmaWxlcy5cbiAqXG4gKiBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBmb3IgbG9hZGluZyBmcm9tIGZpbGVzIHN1Y2ggYXMgdXNlci1zZWxlY3RlZCBmaWxlc1xuICogaW4gdGhlIGJyb3dzZXIuXG4gKiBXaGVuIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBgdGYubG9hZExheWVyc01vZGVsYCwgYW4gaW5zdGFuY2Ugb2ZcbiAqIGB0Zi5MYXllcnNNb2RlbGAgKEtlcmFzLXN0eWxlKSBjYW4gYmUgY29uc3RydWN0ZWQgZnJvbSB0aGUgbG9hZGVkIGFydGlmYWN0cy5cbiAqXG4gKiBgYGBqc1xuICogLy8gTm90ZTogVGhpcyBjb2RlIHNuaXBwZXQgd29uJ3QgcnVuIHByb3Blcmx5IHdpdGhvdXQgdGhlIGFjdHVhbCBmaWxlIGlucHV0XG4gKiAvLyAgIGVsZW1lbnRzIGluIHRoZSBIVE1MIERPTS5cbiAqXG4gKiAvLyBTdXBwb3NlIHRoZXJlIGFyZSB0d28gSFRNTCBmaWxlIGlucHV0IChgPGlucHV0IHR5cGU9XCJmaWxlXCIgLi4uPmApXG4gKiAvLyBlbGVtZW50cy5cbiAqIGNvbnN0IHVwbG9hZEpTT05JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1cGxvYWQtanNvbicpO1xuICogY29uc3QgdXBsb2FkV2VpZ2h0c0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VwbG9hZC13ZWlnaHRzJyk7XG4gKiBjb25zdCBtb2RlbCA9IGF3YWl0IHRmLmxvYWRMYXllcnNNb2RlbCh0Zi5pby5icm93c2VyRmlsZXMoXG4gKiAgICAgW3VwbG9hZEpTT05JbnB1dC5maWxlc1swXSwgdXBsb2FkV2VpZ2h0c0lucHV0LmZpbGVzWzBdXSkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGZpbGVzIGBGaWxlYHMgdG8gbG9hZCBmcm9tLiBDdXJyZW50bHksIHRoaXMgZnVuY3Rpb24gc3VwcG9ydHMgb25seVxuICogICBsb2FkaW5nIGZyb20gZmlsZXMgdGhhdCBjb250YWluIEtlcmFzLXN0eWxlIG1vZGVscyAoaS5lLiwgYHRmLk1vZGVsYHMpLCBmb3JcbiAqICAgd2hpY2ggYW4gYEFycmF5YCBvZiBgRmlsZWBzIGlzIGV4cGVjdGVkIChpbiB0aGF0IG9yZGVyKTpcbiAqICAgLSBBIEpTT04gZmlsZSBjb250YWluaW5nIHRoZSBtb2RlbCB0b3BvbG9neSBhbmQgd2VpZ2h0IG1hbmlmZXN0LlxuICogICAtIE9wdGlvbmFsbHksIG9uZSBvciBtb3JlIGJpbmFyeSBmaWxlcyBjb250YWluaW5nIHRoZSBiaW5hcnkgd2VpZ2h0cy5cbiAqICAgICBUaGVzZSBmaWxlcyBtdXN0IGhhdmUgbmFtZXMgdGhhdCBtYXRjaCB0aGUgcGF0aHMgaW4gdGhlIGB3ZWlnaHRzTWFuaWZlc3RgXG4gKiAgICAgY29udGFpbmVkIGJ5IHRoZSBhZm9yZW1lbnRpb25lZCBKU09OIGZpbGUsIG9yIGVycm9ycyB3aWxsIGJlIHRocm93blxuICogICAgIGR1cmluZyBsb2FkaW5nLiBUaGVzZSB3ZWlnaHRzIGZpbGVzIGhhdmUgdGhlIHNhbWUgZm9ybWF0IGFzIHRoZSBvbmVzXG4gKiAgICAgZ2VuZXJhdGVkIGJ5IGB0ZW5zb3JmbG93anNfY29udmVydGVyYCB0aGF0IGNvbWVzIHdpdGggdGhlIGB0ZW5zb3JmbG93anNgXG4gKiAgICAgUHl0aG9uIFBJUCBwYWNrYWdlLiBJZiBubyB3ZWlnaHRzIGZpbGVzIGFyZSBwcm92aWRlZCwgb25seSB0aGUgbW9kZWxcbiAqICAgICB0b3BvbG9neSB3aWxsIGJlIGxvYWRlZCBmcm9tIHRoZSBKU09OIGZpbGUgYWJvdmUuXG4gKiBAcmV0dXJucyBBbiBpbnN0YW5jZSBvZiBgRmlsZXNgIGBJT0hhbmRsZXJgLlxuICpcbiAqIEBkb2Mge1xuICogICBoZWFkaW5nOiAnTW9kZWxzJyxcbiAqICAgc3ViaGVhZGluZzogJ0xvYWRpbmcnLFxuICogICBuYW1lc3BhY2U6ICdpbycsXG4gKiAgIGlnbm9yZUNJOiB0cnVlXG4gKiB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBicm93c2VyRmlsZXMoZmlsZXM6IEZpbGVbXSk6IElPSGFuZGxlciB7XG4gIHJldHVybiBuZXcgQnJvd3NlckZpbGVzKGZpbGVzKTtcbn1cbiJdfQ==