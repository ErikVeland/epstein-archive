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
import { env } from '../environment';
import * as util from '../util';
import { CompositeArrayBuffer } from './composite_array_buffer';
import { decodeWeights } from './io_utils';
import { monitorPromisesProgress } from './progress';
import { DTYPE_VALUE_SIZE_MAP } from './types';
/**
 * Reads binary weights data from a number of URLs.
 *
 * @param fetchURLs URLs to send the HTTP requests at, using `fetch` calls.
 * @param requestOptions RequestInit (options) for the HTTP requests.
 * @param fetchFunc Optional overriding value for the `window.fetch` function.
 * @param onProgress Optional, progress callback function, fired periodically
 *   before the load is completed.
 * @returns A `Promise` of an Array of `ArrayBuffer`. The Array has the same
 *   length as `fetchURLs`.
 */
export async function loadWeightsAsArrayBuffer(fetchURLs, loadOptions) {
    if (loadOptions == null) {
        loadOptions = {};
    }
    const fetchFunc = loadOptions.fetchFunc == null ? env().platform.fetch :
        loadOptions.fetchFunc;
    // Create the requests for all of the weights in parallel.
    const requests = fetchURLs.map(fetchURL => fetchFunc(fetchURL, loadOptions.requestInit, { isBinary: true }));
    const fetchStartFraction = 0;
    const fetchEndFraction = 0.5;
    const responses = loadOptions.onProgress == null ?
        await Promise.all(requests) :
        await monitorPromisesProgress(requests, loadOptions.onProgress, fetchStartFraction, fetchEndFraction);
    const bufferPromises = responses.map(response => response.arrayBuffer());
    const bufferStartFraction = 0.5;
    const bufferEndFraction = 1;
    const buffers = loadOptions.onProgress == null ?
        await Promise.all(bufferPromises) :
        await monitorPromisesProgress(bufferPromises, loadOptions.onProgress, bufferStartFraction, bufferEndFraction);
    return buffers;
}
export function streamWeights(fetchURLs, loadOptions) {
    var _a;
    const fetchFunc = loadOptions.fetchFunc == null ? env().platform.fetch :
        loadOptions.fetchFunc;
    let fetchIndex = 0;
    let chunkReader;
    (_a = loadOptions.onProgress) === null || _a === void 0 ? void 0 : _a.call(loadOptions, 0);
    return new ReadableStream({
        pull: async (controller) => {
            var _a;
            while (fetchIndex < fetchURLs.length) {
                if (!chunkReader) {
                    const body = (await fetchFunc(fetchURLs[fetchIndex], loadOptions.requestInit, { isBinary: true })).body;
                    chunkReader = body.getReader();
                }
                const { done, value } = await chunkReader.read();
                if (done) {
                    fetchIndex++;
                    chunkReader = undefined;
                    (_a = loadOptions.onProgress) === null || _a === void 0 ? void 0 : _a.call(loadOptions, fetchIndex / fetchURLs.length);
                    continue;
                }
                controller.enqueue(value);
                return;
            }
            controller.close();
        },
    });
}
/**
 * Reads a weights manifest JSON configuration, fetches the weights and
 * returns them as `Tensor`s.
 *
 * @param manifest The weights manifest JSON.
 * @param filePathPrefix The path prefix for filenames given in the manifest.
 *     Defaults to the empty string.
 * @param weightNames The names of the weights to be fetched.
 */
export async function loadWeights(manifest, filePathPrefix = '', weightNames, requestInit) {
    // TODO(nsthorat): Groups are currently fetched atomically. If you need a
    // single weight from a group, the whole group will be fetched. At a future
    // date, we should support fetching only the individual shards within a
    // group that are needed to reconstruct the requested weight.
    // TODO(cais): Use `decodeWeights` for implementation.
    const fetchWeights = (fetchUrls) => loadWeightsAsArrayBuffer(fetchUrls, { requestInit });
    const loadWeights = weightsLoaderFactory(fetchWeights);
    return loadWeights(manifest, filePathPrefix, weightNames);
}
/**
 * Creates a function, which reads a weights manifest JSON configuration,
 * fetches the weight files using the specified function and returns them as
 * `Tensor`s.
 *
 * ```js
 * // example for creating a nodejs weight loader, which reads the weight files
 * // from disk using fs.readFileSync
 *
 * import * as fs from 'fs'
 *
 * const fetchWeightsFromDisk = (filePaths: string[]) =>
 *   filePaths.map(filePath => fs.readFileSync(filePath).buffer)
 *
 * const loadWeights = tf.io.weightsLoaderFactory(fetchWeightsFromDisk)
 *
 * const manifest = JSON.parse(
 *   fs.readFileSync('./my_model-weights_manifest').toString()
 * )
 * const weightMap = await loadWeights(manifest, './')
 * ```
 * @param fetchWeightsFunction The function used for fetching the weight files.
 * @returns Weight loading function.
 */
export function weightsLoaderFactory(fetchWeightsFunction) {
    return async (manifest, filePathPrefix = '', weightNames) => {
        // Collect all the groups, weights, and their relative offsets to be
        // fetched.
        const groupIndicesToFetchMap = manifest.map(() => false);
        const groupWeightsToFetch = {};
        const weightsFound = weightNames != null ? weightNames.map(() => false) : [];
        const allManifestWeightNames = [];
        manifest.forEach((manifestGroupConfig, groupIndex) => {
            let groupOffset = 0;
            manifestGroupConfig.weights.forEach(weightsEntry => {
                const rawDtype = ('quantization' in weightsEntry) ?
                    weightsEntry.quantization.dtype :
                    weightsEntry.dtype;
                const weightsBytes = DTYPE_VALUE_SIZE_MAP[rawDtype] *
                    util.sizeFromShape(weightsEntry.shape);
                const enqueueWeightsForFetchingFn = () => {
                    groupIndicesToFetchMap[groupIndex] = true;
                    if (groupWeightsToFetch[groupIndex] == null) {
                        groupWeightsToFetch[groupIndex] = [];
                    }
                    groupWeightsToFetch[groupIndex].push({
                        manifestEntry: weightsEntry,
                        groupOffset,
                        sizeBytes: weightsBytes
                    });
                };
                if (weightNames != null) {
                    weightNames.forEach((weightName, weightIndex) => {
                        if (weightName === weightsEntry.name) {
                            enqueueWeightsForFetchingFn();
                            weightsFound[weightIndex] = true;
                        }
                    });
                }
                else {
                    enqueueWeightsForFetchingFn();
                }
                allManifestWeightNames.push(weightsEntry.name);
                groupOffset += weightsBytes;
            });
        });
        if (!weightsFound.every(found => found)) {
            const weightsNotFound = weightNames.filter((_, i) => !weightsFound[i]);
            throw new Error(`Could not find weights in manifest with names: ` +
                `${weightsNotFound.join(', ')}. \n` +
                `Manifest JSON has weights with names: ` +
                `${allManifestWeightNames.join(', ')}.`);
        }
        // Convert the one-hot boolean groupId => shouldFetch map to a list of group
        // IDs.
        const groupIndicesToFetch = groupIndicesToFetchMap.reduce((accumulator, shouldFetch, i) => {
            if (shouldFetch) {
                accumulator.push(i);
            }
            return accumulator;
        }, []);
        const fetchUrls = [];
        groupIndicesToFetch.forEach(i => {
            manifest[i].paths.forEach(filepath => {
                const fetchUrl = filePathPrefix +
                    (!filePathPrefix.endsWith('/') ? '/' : '') + filepath;
                fetchUrls.push(fetchUrl);
            });
        });
        const buffers = await fetchWeightsFunction(fetchUrls);
        const weightsTensorMap = {};
        let bufferIndexOffset = 0;
        groupIndicesToFetch.forEach(i => {
            const numBuffers = manifest[i].paths.length;
            const weightsBuffer = new CompositeArrayBuffer(buffers.slice(bufferIndexOffset, bufferIndexOffset + numBuffers));
            const weightsEntries = groupWeightsToFetch[i];
            weightsEntries.forEach(weightsEntry => {
                const byteBuffer = weightsBuffer.slice(weightsEntry.groupOffset, weightsEntry.groupOffset + weightsEntry.sizeBytes);
                const nameToTensorMap = decodeWeights(byteBuffer, [weightsEntry.manifestEntry]);
                for (const name in nameToTensorMap) {
                    weightsTensorMap[name] = nameToTensorMap[name];
                }
            });
            bufferIndexOffset += numBuffers;
        });
        return weightsTensorMap;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VpZ2h0c19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWNvcmUvc3JjL2lvL3dlaWdodHNfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUduQyxPQUFPLEtBQUssSUFBSSxNQUFNLFNBQVMsQ0FBQztBQUNoQyxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyx1QkFBdUIsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNuRCxPQUFPLEVBQUMsb0JBQW9CLEVBQTJELE1BQU0sU0FBUyxDQUFDO0FBRXZHOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLHdCQUF3QixDQUM1QyxTQUFtQixFQUFFLFdBQXlCO0lBQzlDLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtRQUN2QixXQUFXLEdBQUcsRUFBRSxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RSxXQUFXLENBQUMsU0FBUyxDQUFDO0lBRXhCLDBEQUEwRDtJQUMxRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUM1QixRQUFRLENBQUMsRUFBRSxDQUNULFNBQVMsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFdEUsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7SUFDN0IsTUFBTSxnQkFBZ0IsR0FBRyxHQUFH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QyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUU1QyxNQUFNLGFBQWEsR0FBRyxJQUFJLG9CQUFvQixDQUM1QyxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFFcEUsTUFBTSxjQUFjLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFOUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDcEMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FDcEMsWUFBWSxDQUFDLFdBQVcsRUFDeEIsWUFBWSxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sZUFBZSxHQUNuQixhQUFhLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELEtBQUssTUFBTSxJQUFJLElBQUksZUFBZSxFQUFFO29CQUNsQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hEO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxpQkFBaUIsSUFBSSxVQUFVLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLGdCQUFnQixDQUFDO0lBQzFCLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7ZW52fSBmcm9tICcuLi9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCB7TmFtZWRUZW5zb3JNYXB9IGZyb20gJy4uL3RlbnNvcl90eXBlcyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4uL3V0aWwnO1xuaW1wb3J0IHtDb21wb3NpdGVBcnJheUJ1ZmZlcn0gZnJvbSAnLi9jb21wb3NpdGVfYXJyYXlfYnVmZmVyJztcbmltcG9ydCB7ZGVjb2RlV2VpZ2h0c30gZnJvbSAnLi9pb191dGlscyc7XG5pbXBvcnQge21vbml0b3JQcm9taXNlc1Byb2dyZXNzfSBmcm9tICcuL3Byb2dyZXNzJztcbmltcG9ydCB7RFRZUEVfVkFMVUVfU0laRV9NQVAsIExvYWRPcHRpb25zLCBXZWlnaHRzTWFuaWZlc3RDb25maWcsIFdlaWdodHNNYW5pZmVzdEVudHJ5fSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBSZWFkcyBiaW5hcnkgd2VpZ2h0cyBkYXRhIGZyb20gYSBudW1iZXIgb2YgVVJMcy5cbiAqXG4gKiBAcGFyYW0gZmV0Y2hVUkxzIFVSTHMgdG8gc2VuZCB0aGUgSFRUUCByZXF1ZXN0cyBhdCwgdXNpbmcgYGZldGNoYCBjYWxscy5cbiAqIEBwYXJhbSByZXF1ZXN0T3B0aW9ucyBSZXF1ZXN0SW5pdCAob3B0aW9ucykgZm9yIHRoZSBIVFRQIHJlcXVlc3RzLlxuICogQHBhcmFtIGZldGNoRnVuYyBPcHRpb25hbCBvdmVycmlkaW5nIHZhbHVlIGZvciB0aGUgYHdpbmRvdy5mZXRjaGAgZnVuY3Rpb24uXG4gKiBAcGFyYW0gb25Qcm9ncmVzcyBPcHRpb25hbCwgcHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24sIGZpcmVkIHBlcmlvZGljYWxseVxuICogICBiZWZvcmUgdGhlIGxvYWQgaXMgY29tcGxldGVkLlxuICogQHJldHVybnMgQSBgUHJvbWlzZWAgb2YgYW4gQXJyYXkgb2YgYEFycmF5QnVmZmVyYC4gVGhlIEFycmF5IGhhcyB0aGUgc2FtZVxuICogICBsZW5ndGggYXMgYGZldGNoVVJMc2AuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkV2VpZ2h0c0FzQXJyYXlCdWZmZXIoXG4gIGZldGNoVVJMczogc3RyaW5nW10sIGxvYWRPcHRpb25zPzogTG9hZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyW10+IHtcbiAgaWYgKGxvYWRPcHRpb25zID09IG51bGwpIHtcbiAgICBsb2FkT3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgY29uc3QgZmV0Y2hGdW5jID0gbG9hZE9wdGlvbnMuZmV0Y2hGdW5jID09IG51bGwgPyBlbnYoKS5wbGF0Zm9ybS5mZXRjaCA6XG4gICAgbG9hZE9wdGlvbnMuZmV0Y2hGdW5jO1xuXG4gIC8vIENyZWF0ZSB0aGUgcmVxdWVzdHMgZm9yIGFsbCBvZiB0aGUgd2VpZ2h0cyBpbiBwYXJhbGxlbC5cbiAgY29uc3QgcmVxdWVzdHMgPSBmZXRjaFVSTHMubWFwKFxuICAgIGZldGNoVVJMID0+XG4gICAgICBmZXRjaEZ1bmMoZmV0Y2hVUkwsIGxvYWRPcHRpb25zLnJlcXVlc3RJbml0LCB7IGlzQmluYXJ5OiB0cnVlIH0pKTtcblxuICBjb25zdCBmZXRjaFN0YXJ0RnJhY3Rpb24gPSAwO1xuICBjb25zdCBmZXRjaEVuZEZyYWN0aW9uID0gMC41O1xuXG4gIGNvbnN0IHJlc3BvbnNlcyA9IGxvYWRPcHRpb25zLm9uUHJvZ3Jlc3MgPT0gbnVsbCA/XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocmVxdWVzdHMpIDpcbiAgICBhd2FpdCBtb25pdG9yUHJvbWlzZXNQcm9ncmVzcyhcbiAgICAgIHJlcXVlc3RzLCBsb2FkT3B0aW9ucy5vblByb2dyZXNzLCBmZXRjaFN0YXJ0RnJhY3Rpb24sXG4gICAgICBmZXRjaEVuZEZyYWN0aW9uKTtcblxuICBjb25zdCBidWZmZXJQcm9taXNlcyA9IHJlc3BvbnNlcy5tYXAocmVzcG9uc2UgPT4gcmVzcG9uc2UuYXJyYXlCdWZmZXIoKSk7XG5cbiAgY29uc3QgYnVmZmVyU3RhcnRGcmFjdGlvbiA9IDAuNTtcbiAgY29uc3QgYnVmZmVyRW5kRnJhY3Rpb24gPSAxO1xuXG4gIGNvbnN0IGJ1ZmZlcnMgPSBsb2FkT3B0aW9ucy5vblByb2dyZXNzID09IG51bGwgP1xuICAgIGF3YWl0IFByb21pc2UuYWxsKGJ1ZmZlclByb21pc2VzKSA6XG4gICAgYXdhaXQgbW9uaXRvclByb21pc2VzUHJvZ3Jlc3MoXG4gICAgICBidWZmZXJQcm9taXNlcywgbG9hZE9wdGlvbnMub25Qcm9ncmVzcywgYnVmZmVyU3RhcnRGcmFjdGlvbixcbiAgICAgIGJ1ZmZlckVuZEZyYWN0aW9uKTtcbiAgcmV0dXJuIGJ1ZmZlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJlYW1XZWlnaHRzKGZldGNoVVJMczogc3RyaW5nW10sIGxvYWRPcHRpb25zOiBMb2FkT3B0aW9ucyk6IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyPiB7XG4gIGNvbnN0IGZldGNoRnVuYyA9IGxvYWRPcHRpb25zLmZldGNoRnVuYyA9PSBudWxsID8gZW52KCkucGxhdGZvcm0uZmV0Y2ggOlxuICAgIGxvYWRPcHRpb25zLmZldGNoRnVuYztcblxuICBsZXQgZmV0Y2hJbmRleCA9IDA7XG4gIGxldCBjaHVua1JlYWRlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+IHwgdW5kZWZpbmVkO1xuICBsb2FkT3B0aW9ucy5vblByb2dyZXNzPy4oMCk7XG4gIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgIHB1bGw6IGFzeW5jIChjb250cm9sbGVyKSA9PiB7XG4gICAgICB3aGlsZSAoZmV0Y2hJbmRleCA8IGZldGNoVVJMcy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKCFjaHVua1JlYWRlcikge1xuICAgICAgICAgIGNvbnN0IGJvZHkgPSAoYXdhaXQgZmV0Y2hGdW5jKGZldGNoVVJMc1tmZXRjaEluZGV4XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZE9wdGlvbnMucmVxdWVzdEluaXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpc0JpbmFyeTogdHJ1ZX0pKS5ib2R5O1xuXG4gICAgICAgICAgY2h1bmtSZWFkZXIgPSBib2R5LmdldFJlYWRlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qge2RvbmUsIHZhbHVlfSA9IGF3YWl0IGNodW5rUmVhZGVyLnJlYWQoKTtcblxuICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgIGZldGNoSW5kZXgrKztcbiAgICAgICAgICBjaHVua1JlYWRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBsb2FkT3B0aW9ucy5vblByb2dyZXNzPy4oZmV0Y2hJbmRleCAvIGZldGNoVVJMcy5sZW5ndGgpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICB9LFxuICB9KTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhIHdlaWdodHMgbWFuaWZlc3QgSlNPTiBjb25maWd1cmF0aW9uLCBmZXRjaGVzIHRoZSB3ZWlnaHRzIGFuZFxuICogcmV0dXJucyB0aGVtIGFzIGBUZW5zb3Jgcy5cbiAqXG4gKiBAcGFyYW0gbWFuaWZlc3QgVGhlIHdlaWdodHMgbWFuaWZlc3QgSlNPTi5cbiAqIEBwYXJhbSBmaWxlUGF0aFByZWZpeCBUaGUgcGF0aCBwcmVmaXggZm9yIGZpbGVuYW1lcyBnaXZlbiBpbiB0aGUgbWFuaWZlc3QuXG4gKiAgICAgRGVmYXVsdHMgdG8gdGhlIGVtcHR5IHN0cmluZy5cbiAqIEBwYXJhbSB3ZWlnaHROYW1lcyBUaGUgbmFtZXMgb2YgdGhlIHdlaWdodHMgdG8gYmUgZmV0Y2hlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRXZWlnaHRzKFxuICBtYW5pZmVzdDogV2VpZ2h0c01hbmlmZXN0Q29uZmlnLCBmaWxlUGF0aFByZWZpeCA9ICcnLFxuICB3ZWlnaHROYW1lcz86IHN0cmluZ1tdLFxuICByZXF1ZXN0SW5pdD86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxOYW1lZFRlbnNvck1hcD4ge1xuICAvLyBUT0RPKG5zdGhvcmF0KTogR3JvdXBzIGFyZSBjdXJyZW50bHkgZmV0Y2hlZCBhdG9taWNhbGx5LiBJZiB5b3UgbmVlZCBhXG4gIC8vIHNpbmdsZSB3ZWlnaHQgZnJvbSBhIGdyb3VwLCB0aGUgd2hvbGUgZ3JvdXAgd2lsbCBiZSBmZXRjaGVkLiBBdCBhIGZ1dHVyZVxuICAvLyBkYXRlLCB3ZSBzaG91bGQgc3VwcG9ydCBmZXRjaGluZyBvbmx5IHRoZSBpbmRpdmlkdWFsIHNoYXJkcyB3aXRoaW4gYVxuICAvLyBncm91cCB0aGF0IGFyZSBuZWVkZWQgdG8gcmVjb25zdHJ1Y3QgdGhlIHJlcXVlc3RlZCB3ZWlnaHQuXG4gIC8vIFRPRE8oY2Fpcyk6IFVzZSBgZGVjb2RlV2VpZ2h0c2AgZm9yIGltcGxlbWVudGF0aW9uLlxuXG4gIGNvbnN0IGZldGNoV2VpZ2h0cyA9IChmZXRjaFVybHM6IHN0cmluZ1tdKSA9PlxuICAgIGxvYWRXZWlnaHRzQXNBcnJheUJ1ZmZlcihmZXRjaFVybHMsIHsgcmVxdWVzdEluaXQgfSk7XG4gIGNvbnN0IGxvYWRXZWlnaHRzID0gd2VpZ2h0c0xvYWRlckZhY3RvcnkoZmV0Y2hXZWlnaHRzKTtcblxuICByZXR1cm4gbG9hZFdlaWdodHMobWFuaWZlc3QsIGZpbGVQYXRoUHJlZml4LCB3ZWlnaHROYW1lcyk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uLCB3aGljaCByZWFkcyBhIHdlaWdodHMgbWFuaWZlc3QgSlNPTiBjb25maWd1cmF0aW9uLFxuICogZmV0Y2hlcyB0aGUgd2VpZ2h0IGZpbGVzIHVzaW5nIHRoZSBzcGVjaWZpZWQgZnVuY3Rpb24gYW5kIHJldHVybnMgdGhlbSBhc1xuICogYFRlbnNvcmBzLlxuICpcbiAqIGBgYGpzXG4gKiAvLyBleGFtcGxlIGZvciBjcmVhdGluZyBhIG5vZGVqcyB3ZWlnaHQgbG9hZGVyLCB3aGljaCByZWFkcyB0aGUgd2VpZ2h0IGZpbGVzXG4gKiAvLyBmcm9tIGRpc2sgdXNpbmcgZnMucmVhZEZpbGVTeW5jXG4gKlxuICogaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG4gKlxuICogY29uc3QgZmV0Y2hXZWlnaHRzRnJvbURpc2sgPSAoZmlsZVBhdGhzOiBzdHJpbmdbXSkgPT5cbiAqICAgZmlsZVBhdGhzLm1hcChmaWxlUGF0aCA9PiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgpLmJ1ZmZlcilcbiAqXG4gKiBjb25zdCBsb2FkV2VpZ2h0cyA9IHRmLmlvLndlaWdodHNMb2FkZXJGYWN0b3J5KGZldGNoV2VpZ2h0c0Zyb21EaXNrKVxuICpcbiAqIGNvbnN0IG1hbmlmZXN0ID0gSlNPTi5wYXJzZShcbiAqICAgZnMucmVhZEZpbGVTeW5jKCcuL215X21vZGVsLXdlaWdodHNfbWFuaWZlc3QnKS50b1N0cmluZygpXG4gKiApXG4gKiBjb25zdCB3ZWlnaHRNYXAgPSBhd2FpdCBsb2FkV2VpZ2h0cyhtYW5pZmVzdCwgJy4vJylcbiAqIGBgYFxuICogQHBhcmFtIGZldGNoV2VpZ2h0c0Z1bmN0aW9uIFRoZSBmdW5jdGlvbiB1c2VkIGZvciBmZXRjaGluZyB0aGUgd2VpZ2h0IGZpbGVzLlxuICogQHJldHVybnMgV2VpZ2h0IGxvYWRpbmcgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3ZWlnaHRzTG9hZGVyRmFjdG9yeShcbiAgZmV0Y2hXZWlnaHRzRnVuY3Rpb246IChmZXRjaFVybHM6IHN0cmluZ1tdKSA9PiBQcm9taXNlPEFycmF5QnVmZmVyW10+KTpcbiAgKG1hbmlmZXN0OiBXZWlnaHRzTWFuaWZlc3RDb25maWcsIGZpbGVQYXRoUHJlZml4Pzogc3RyaW5nLFxuICAgIHdlaWdodE5hbWVzPzogc3RyaW5nW10pID0+IFByb21pc2U8TmFtZWRUZW5zb3JNYXA+IHtcbiAgcmV0dXJuIGFzeW5jIChcbiAgICBtYW5pZmVzdDogV2VpZ2h0c01hbmlmZXN0Q29uZmlnLCBmaWxlUGF0aFByZWZpeCA9ICcnLFxuICAgIHdlaWdodE5hbWVzPzogc3RyaW5nW10pOiBQcm9taXNlPE5hbWVkVGVuc29yTWFwPiA9PiB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIGdyb3Vwcywgd2VpZ2h0cywgYW5kIHRoZWlyIHJlbGF0aXZlIG9mZnNldHMgdG8gYmVcbiAgICAvLyBmZXRjaGVkLlxuICAgIGNvbnN0IGdyb3VwSW5kaWNlc1RvRmV0Y2hNYXAgPSBtYW5pZmVzdC5tYXAoKCkgPT4gZmFsc2UpO1xuICAgIGNvbnN0IGdyb3VwV2VpZ2h0c1RvRmV0Y2g6IHtcbiAgICAgIFtncm91cDogbnVtYmVyXTogQXJyYXk8e1xuICAgICAgICBtYW5pZmVzdEVudHJ5OiBXZWlnaHRzTWFuaWZlc3RFbnRyeTsgZ3JvdXBPZmZzZXQ6IG51bWJlcjtcbiAgICAgICAgc2l6ZUJ5dGVzOiBudW1iZXI7XG4gICAgICB9PlxuICAgIH0gPSB7fTtcbiAgICBjb25zdCB3ZWlnaHRzRm91bmQgPVxuICAgICAgd2VpZ2h0TmFtZXMgIT0gbnVsbCA/IHdlaWdodE5hbWVzLm1hcCgoKSA9PiBmYWxzZSkgOiBbXTtcbiAgICBjb25zdCBhbGxNYW5pZmVzdFdlaWdodE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIG1hbmlmZXN0LmZvckVhY2goKG1hbmlmZXN0R3JvdXBDb25maWcsIGdyb3VwSW5kZXgpID0+IHtcbiAgICAgIGxldCBncm91cE9mZnNldCA9IDA7XG4gICAgICBtYW5pZmVzdEdyb3VwQ29uZmlnLndlaWdodHMuZm9yRWFjaCh3ZWlnaHRzRW50cnkgPT4ge1xuICAgICAgICBjb25zdCByYXdEdHlwZSA9ICgncXVhbnRpemF0aW9uJyBpbiB3ZWlnaHRzRW50cnkpID9cbiAgICAgICAgICB3ZWlnaHRzRW50cnkucXVhbnRpemF0aW9uLmR0eXBlIDpcbiAgICAgICAgICB3ZWlnaHRzRW50cnkuZHR5cGU7XG5cbiAgICAgICAgY29uc3Qgd2VpZ2h0c0J5dGVzID0gRFRZUEVfVkFMVUVfU0laRV9NQVBbcmF3RHR5cGVdICpcbiAgICAgICAgICB1dGlsLnNpemVGcm9tU2hhcGUod2VpZ2h0c0VudHJ5LnNoYXBlKTtcblxuICAgICAgICBjb25zdCBlbnF1ZXVlV2VpZ2h0c0ZvckZldGNoaW5nRm4gPSAoKSA9PiB7XG4gICAgICAgICAgZ3JvdXBJbmRpY2VzVG9GZXRjaE1hcFtncm91cEluZGV4XSA9IHRydWU7XG4gICAgICAgICAgaWYgKGdyb3VwV2VpZ2h0c1RvRmV0Y2hbZ3JvdXBJbmRleF0gPT0gbnVsbCkge1xuICAgICAgICAgICAgZ3JvdXBXZWlnaHRzVG9GZXRjaFtncm91cEluZGV4XSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGdyb3VwV2VpZ2h0c1RvRmV0Y2hbZ3JvdXBJbmRleF0ucHVzaCh7XG4gICAgICAgICAgICBtYW5pZmVzdEVudHJ5OiB3ZWlnaHRzRW50cnksXG4gICAgICAgICAgICBncm91cE9mZnNldCxcbiAgICAgICAgICAgIHNpemVCeXRlczogd2VpZ2h0c0J5dGVzXG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHdlaWdodE5hbWVzICE9IG51bGwpIHtcbiAgICAgICAgICB3ZWlnaHROYW1lcy5mb3JFYWNoKCh3ZWlnaHROYW1lLCB3ZWlnaHRJbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKHdlaWdodE5hbWUgPT09IHdlaWdodHNFbnRyeS5uYW1lKSB7XG4gICAgICAgICAgICAgIGVucXVldWVXZWlnaHRzRm9yRmV0Y2hpbmdGbigpO1xuICAgICAgICAgICAgICB3ZWlnaHRzRm91bmRbd2VpZ2h0SW5kZXhdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbnF1ZXVlV2VpZ2h0c0ZvckZldGNoaW5nRm4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFsbE1hbmlmZXN0V2VpZ2h0TmFtZXMucHVzaCh3ZWlnaHRzRW50cnkubmFtZSk7XG4gICAgICAgIGdyb3VwT2Zmc2V0ICs9IHdlaWdodHNCeXRlcztcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKCF3ZWlnaHRzRm91bmQuZXZlcnkoZm91bmQgPT4gZm91bmQpKSB7XG4gICAgICBjb25zdCB3ZWlnaHRzTm90Rm91bmQgPSB3ZWlnaHROYW1lcy5maWx0ZXIoKF8sIGkpID0+ICF3ZWlnaHRzRm91bmRbaV0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQ291bGQgbm90IGZpbmQgd2VpZ2h0cyBpbiBtYW5pZmVzdCB3aXRoIG5hbWVzOiBgICtcbiAgICAgICAgYCR7d2VpZ2h0c05vdEZvdW5kLmpvaW4oJywgJyl9LiBcXG5gICtcbiAgICAgICAgYE1hbmlmZXN0IEpTT04gaGFzIHdlaWdodHMgd2l0aCBuYW1lczogYCArXG4gICAgICAgIGAke2FsbE1hbmlmZXN0V2VpZ2h0TmFtZXMuam9pbignLCAnKX0uYCk7XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCB0aGUgb25lLWhvdCBib29sZWFuIGdyb3VwSWQgPT4gc2hvdWxkRmV0Y2ggbWFwIHRvIGEgbGlzdCBvZiBncm91cFxuICAgIC8vIElEcy5cbiAgICBjb25zdCBncm91cEluZGljZXNUb0ZldGNoID1cbiAgICAgIGdyb3VwSW5kaWNlc1RvRmV0Y2hNYXAucmVkdWNlKChhY2N1bXVsYXRvciwgc2hvdWxkRmV0Y2gsIGkpID0+IHtcbiAgICAgICAgaWYgKHNob3VsZEZldGNoKSB7XG4gICAgICAgICAgYWNjdW11bGF0b3IucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgICB9LCBbXSk7XG5cbiAgICBjb25zdCBmZXRjaFVybHM6IHN0cmluZ1tdID0gW107XG4gICAgZ3JvdXBJbmRpY2VzVG9GZXRjaC5mb3JFYWNoKGkgPT4ge1xuICAgICAgbWFuaWZlc3RbaV0ucGF0aHMuZm9yRWFjaChmaWxlcGF0aCA9PiB7XG4gICAgICAgIGNvbnN0IGZldGNoVXJsID0gZmlsZVBhdGhQcmVmaXggK1xuICAgICAgICAgICghZmlsZVBhdGhQcmVmaXguZW5kc1dpdGgoJy8nKSA/ICcvJyA6ICcnKSArIGZpbGVwYXRoO1xuICAgICAgICBmZXRjaFVybHMucHVzaChmZXRjaFVybCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBjb25zdCBidWZmZXJzID0gYXdhaXQgZmV0Y2hXZWlnaHRzRnVuY3Rpb24oZmV0Y2hVcmxzKTtcblxuICAgIGNvbnN0IHdlaWdodHNUZW5zb3JNYXA6IE5hbWVkVGVuc29yTWFwID0ge307XG4gICAgbGV0IGJ1ZmZlckluZGV4T2Zmc2V0ID0gMDtcbiAgICBncm91cEluZGljZXNUb0ZldGNoLmZvckVhY2goaSA9PiB7XG4gICAgICBjb25zdCBudW1CdWZmZXJzID0gbWFuaWZlc3RbaV0ucGF0aHMubGVuZ3RoO1xuXG4gICAgICBjb25zdCB3ZWlnaHRzQnVmZmVyID0gbmV3IENvbXBvc2l0ZUFycmF5QnVmZmVyKFxuICAgICAgICBidWZmZXJzLnNsaWNlKGJ1ZmZlckluZGV4T2Zmc2V0LCBidWZmZXJJbmRleE9mZnNldCArIG51bUJ1ZmZlcnMpKTtcblxuICAgICAgY29uc3Qgd2VpZ2h0c0VudHJpZXMgPSBncm91cFdlaWdodHNUb0ZldGNoW2ldO1xuXG4gICAgICB3ZWlnaHRzRW50cmllcy5mb3JFYWNoKHdlaWdodHNFbnRyeSA9PiB7XG4gICAgICAgIGNvbnN0IGJ5dGVCdWZmZXIgPSB3ZWlnaHRzQnVmZmVyLnNsaWNlKFxuICAgICAgICAgIHdlaWdodHNFbnRyeS5ncm91cE9mZnNldCxcbiAgICAgICAgICB3ZWlnaHRzRW50cnkuZ3JvdXBPZmZzZXQgKyB3ZWlnaHRzRW50cnkuc2l6ZUJ5dGVzKTtcbiAgICAgICAgY29uc3QgbmFtZVRvVGVuc29yTWFwID1cbiAgICAgICAgICBkZWNvZGVXZWlnaHRzKGJ5dGVCdWZmZXIsIFt3ZWlnaHRzRW50cnkubWFuaWZlc3RFbnRyeV0pO1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gbmFtZVRvVGVuc29yTWFwKSB7XG4gICAgICAgICAgd2VpZ2h0c1RlbnNvck1hcFtuYW1lXSA9IG5hbWVUb1RlbnNvck1hcFtuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGJ1ZmZlckluZGV4T2Zmc2V0ICs9IG51bUJ1ZmZlcnM7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gd2VpZ2h0c1RlbnNvck1hcDtcbiAgfTtcbn1cbiJdfQ==