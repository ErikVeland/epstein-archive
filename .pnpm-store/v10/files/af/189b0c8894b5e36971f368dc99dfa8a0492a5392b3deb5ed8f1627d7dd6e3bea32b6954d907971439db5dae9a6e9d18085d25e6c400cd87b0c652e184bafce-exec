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
 *
 * =============================================================================
 */
import { datasetFromIteratorFn } from './dataset';
import { CSVDataset } from './datasets/csv_dataset';
import { iteratorFromFunction } from './iterators/lazy_iterator';
import { MicrophoneIterator } from './iterators/microphone_iterator';
import { WebcamIterator } from './iterators/webcam_iterator';
import { URLDataSource } from './sources/url_data_source';
/**
 * Create a `CSVDataset` by reading and decoding CSV file(s) from provided URL
 * or local path if it's in Node environment.
 *
 * Note: If isLabel in columnConfigs is `true` for at least one column, the
 * element in returned `CSVDataset` will be an object of
 * `{xs:features, ys:labels}`: xs is a dict of features key/value pairs, ys
 * is a dict of labels key/value pairs. If no column is marked as label,
 * returns a dict of features only.
 *
 * ```js
 * const csvUrl =
 * 'https://storage.googleapis.com/tfjs-examples/multivariate-linear-regression/data/boston-housing-train.csv';
 *
 * async function run() {
 *   // We want to predict the column "medv", which represents a median value of
 *   // a home (in $1000s), so we mark it as a label.
 *   const csvDataset = tf.data.csv(
 *     csvUrl, {
 *       columnConfigs: {
 *         medv: {
 *           isLabel: true
 *         }
 *       }
 *     });
 *
 *   // Number of features is the number of column names minus one for the label
 *   // column.
 *   const numOfFeatures = (await csvDataset.columnNames()).length - 1;
 *
 *   // Prepare the Dataset for training.
 *   const flattenedDataset =
 *     csvDataset
 *     .map(({xs, ys}) =>
 *       {
 *         // Convert xs(features) and ys(labels) from object form (keyed by
 *         // column name) to array form.
 *         return {xs:Object.values(xs), ys:Object.values(ys)};
 *       })
 *     .batch(10);
 *
 *   // Define the model.
 *   const model = tf.sequential();
 *   model.add(tf.layers.dense({
 *     inputShape: [numOfFeatures],
 *     units: 1
 *   }));
 *   model.compile({
 *     optimizer: tf.train.sgd(0.000001),
 *     loss: 'meanSquaredError'
 *   });
 *
 *   // Fit the model using the prepared Dataset
 *   return model.fitDataset(flattenedDataset, {
 *     epochs: 10,
 *     callbacks: {
 *       onEpochEnd: async (epoch, logs) => {
 *         console.log(epoch + ':' + logs.loss);
 *       }
 *     }
 *   });
 * }
 *
 * await run();
 * ```
 *
 * @param source URL or local path to get CSV file. If it's a local path, it
 * must have prefix `file://` and it only works in node environment.
 * @param csvConfig (Optional) A CSVConfig object that contains configurations
 *     of reading and decoding from CSV file(s).
 *
 * @doc {
 *   heading: 'Data',
 *   subheading: 'Creation',
 *   namespace: 'data',
 *   configParamIndices: [1]
 *  }
 */
export function csv(source, csvConfig = {}) {
    return new CSVDataset(new URLDataSource(source), csvConfig);
}
/**
 * Create a `Dataset` that produces each element by calling a provided function.
 *
 * Note that repeated iterations over this `Dataset` may produce different
 * results, because the function will be called anew for each element of each
 * iteration.
 *
 * Also, beware that the sequence of calls to this function may be out of order
 * in time with respect to the logical order of the Dataset. This is due to the
 * asynchronous lazy nature of stream processing, and depends on downstream
 * transformations (e.g. .shuffle()). If the provided function is pure, this is
 * no problem, but if it is a closure over a mutable state (e.g., a traversal
 * pointer), then the order of the produced elements may be scrambled.
 *
 * ```js
 * let i = -1;
 * const func = () =>
 *    ++i < 5 ? {value: i, done: false} : {value: null, done: true};
 * const ds = tf.data.func(func);
 * await ds.forEachAsync(e => console.log(e));
 * ```
 *
 * @param f A function that produces one data element on each call.
 */
export function func(f) {
    const iter = iteratorFromFunction(f);
    return datasetFromIteratorFn(async () => iter);
}
/**
 * Create a `Dataset` that produces each element from provided JavaScript
 * generator, which is a function that returns a (potentially async) iterator.
 *
 * For more information on iterators and generators, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators .
 * For the iterator protocol, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols .
 *
 * Example of creating a dataset from an iterator factory:
 * ```js
 * function makeIterator() {
 *   const numElements = 10;
 *   let index = 0;
 *
 *   const iterator = {
 *     next: () => {
 *       let result;
 *       if (index < numElements) {
 *         result = {value: index, done: false};
 *         index++;
 *         return result;
 *       }
 *       return {value: index, done: true};
 *     }
 *   };
 *   return iterator;
 * }
 * const ds = tf.data.generator(makeIterator);
 * await ds.forEachAsync(e => console.log(e));
 * ```
 *
 * Example of creating a dataset from a generator:
 * ```js
 * function* dataGenerator() {
 *   const numElements = 10;
 *   let index = 0;
 *   while (index < numElements) {
 *     const x = index;
 *     index++;
 *     yield x;
 *   }
 * }
 *
 * const ds = tf.data.generator(dataGenerator);
 * await ds.forEachAsync(e => console.log(e));
 * ```
 *
 * @param generator A JavaScript function that returns
 *     a (potentially async) JavaScript iterator.
 *
 * @doc {
 *   heading: 'Data',
 *   subheading: 'Creation',
 *   namespace: 'data',
 *   configParamIndices: [1]
 *  }
 */
export function generator(generator) {
    return datasetFromIteratorFn(async () => {
        const gen = await generator();
        return iteratorFromFunction(() => gen.next());
    });
}
/**
 * Create an iterator that generates `Tensor`s from webcam video stream. This
 * API only works in Browser environment when the device has webcam.
 *
 * Note: this code snippet only works when the device has a webcam. It will
 * request permission to open the webcam when running.
 * ```js
 * const videoElement = document.createElement('video');
 * videoElement.width = 100;
 * videoElement.height = 100;
 * const cam = await tf.data.webcam(videoElement);
 * const img = await cam.capture();
 * img.print();
 * cam.stop();
 * ```
 *
 * @param webcamVideoElement A `HTMLVideoElement` used to play video from
 *     webcam. If this element is not provided, a hidden `HTMLVideoElement` will
 *     be created. In that case, `resizeWidth` and `resizeHeight` must be
 *     provided to set the generated tensor shape.
 * @param webcamConfig A `WebcamConfig` object that contains configurations of
 *     reading and manipulating data from webcam video stream.
 *
 * @doc {
 *   heading: 'Data',
 *   subheading: 'Creation',
 *   namespace: 'data',
 *   ignoreCI: true
 *  }
 */
export async function webcam(webcamVideoElement, webcamConfig) {
    return WebcamIterator.create(webcamVideoElement, webcamConfig);
}
/**
 * Create an iterator that generates frequency-domain spectrogram `Tensor`s from
 * microphone audio stream with browser's native FFT. This API only works in
 * browser environment when the device has microphone.
 *
 * Note: this code snippet only works when the device has a microphone. It will
 * request permission to open the microphone when running.
 * ```js
 * const mic = await tf.data.microphone({
 *   fftSize: 1024,
 *   columnTruncateLength: 232,
 *   numFramesPerSpectrogram: 43,
 *   sampleRateHz:44100,
 *   includeSpectrogram: true,
 *   includeWaveform: true
 * });
 * const audioData = await mic.capture();
 * const spectrogramTensor = audioData.spectrogram;
 * spectrogramTensor.print();
 * const waveformTensor = audioData.waveform;
 * waveformTensor.print();
 * mic.stop();
 * ```
 *
 * @param microphoneConfig A `MicrophoneConfig` object that contains
 *     configurations of reading audio data from microphone.
 *
 * @doc {
 *   heading: 'Data',
 *   subheading: 'Creation',
 *   namespace: 'data',
 *   ignoreCI: true
 *  }
 */
export async function microphone(microphoneConfig) {
    return MicrophoneIterator.create(microphoneConfig);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RmanMtZGF0YS9zcmMvcmVhZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUdILE9BQU8sRUFBVSxxQkFBcUIsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN6RCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDL0QsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFDbkUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUd4RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E2RUc7QUFDSCxNQUFNLFVBQVUsR0FBRyxDQUNmLE1BQW1CLEVBQUUsWUFBdUIsRUFBRTtJQUNoRCxPQUFPLElBQUksVUFBVSxDQUFDLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzlELENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F1Qkc7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUNoQixDQUFzRDtJQUN4RCxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyQyxPQUFPLHFCQUFxQixDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakQsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F5REc7QUFDSCxNQUFNLFVBQVUsU0FBUyxDQUN2QixTQUFzRTtJQUV0RSxPQUFPLHFCQUFxQixDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDOUIsT0FBTyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E2Qkc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLE1BQU0sQ0FDeEIsa0JBQXFDLEVBQ3JDLFlBQTJCO0lBQzdCLE9BQU8sY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNqRSxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWlDRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsVUFBVSxDQUFDLGdCQUFtQztJQUVsRSxPQUFPLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3JELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge1RlbnNvckNvbnRhaW5lcn0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcbmltcG9ydCB7RGF0YXNldCwgZGF0YXNldEZyb21JdGVyYXRvckZufSBmcm9tICcuL2RhdGFzZXQnO1xuaW1wb3J0IHtDU1ZEYXRhc2V0fSBmcm9tICcuL2RhdGFzZXRzL2Nzdl9kYXRhc2V0JztcbmltcG9ydCB7aXRlcmF0b3JGcm9tRnVuY3Rpb259IGZyb20gJy4vaXRlcmF0b3JzL2xhenlfaXRlcmF0b3InO1xuaW1wb3J0IHtNaWNyb3Bob25lSXRlcmF0b3J9IGZyb20gJy4vaXRlcmF0b3JzL21pY3JvcGhvbmVfaXRlcmF0b3InO1xuaW1wb3J0IHtXZWJjYW1JdGVyYXRvcn0gZnJvbSAnLi9pdGVyYXRvcnMvd2ViY2FtX2l0ZXJhdG9yJztcbmltcG9ydCB7VVJMRGF0YVNvdXJjZX0gZnJvbSAnLi9zb3VyY2VzL3VybF9kYXRhX3NvdXJjZSc7XG5pbXBvcnQge0NTVkNvbmZpZywgTWljcm9waG9uZUNvbmZpZywgV2ViY2FtQ29uZmlnfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBDcmVhdGUgYSBgQ1NWRGF0YXNldGAgYnkgcmVhZGluZyBhbmQgZGVjb2RpbmcgQ1NWIGZpbGUocykgZnJvbSBwcm92aWRlZCBVUkxcbiAqIG9yIGxvY2FsIHBhdGggaWYgaXQncyBpbiBOb2RlIGVudmlyb25tZW50LlxuICpcbiAqIE5vdGU6IElmIGlzTGFiZWwgaW4gY29sdW1uQ29uZmlncyBpcyBgdHJ1ZWAgZm9yIGF0IGxlYXN0IG9uZSBjb2x1bW4sIHRoZVxuICogZWxlbWVudCBpbiByZXR1cm5lZCBgQ1NWRGF0YXNldGAgd2lsbCBiZSBhbiBvYmplY3Qgb2ZcbiAqIGB7eHM6ZmVhdHVyZXMsIHlzOmxhYmVsc31gOiB4cyBpcyBhIGRpY3Qgb2YgZmVhdHVyZXMga2V5L3ZhbHVlIHBhaXJzLCB5c1xuICogaXMgYSBkaWN0IG9mIGxhYmVscyBrZXkvdmFsdWUgcGFpcnMuIElmIG5vIGNvbHVtbiBpcyBtYXJrZWQgYXMgbGFiZWwsXG4gKiByZXR1cm5zIGEgZGljdCBvZiBmZWF0dXJlcyBvbmx5LlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjc3ZVcmwgPVxuICogJ2h0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS90ZmpzLWV4YW1wbGVzL211bHRpdmFyaWF0ZS1saW5lYXItcmVncmVzc2lvbi9kYXRhL2Jvc3Rvbi1ob3VzaW5nLXRyYWluLmNzdic7XG4gKlxuICogYXN5bmMgZnVuY3Rpb24gcnVuKCkge1xuICogICAvLyBXZSB3YW50IHRvIHByZWRpY3QgdGhlIGNvbHVtbiBcIm1lZHZcIiwgd2hpY2ggcmVwcmVzZW50cyBhIG1lZGlhbiB2YWx1ZSBvZlxuICogICAvLyBhIGhvbWUgKGluICQxMDAwcyksIHNvIHdlIG1hcmsgaXQgYXMgYSBsYWJlbC5cbiAqICAgY29uc3QgY3N2RGF0YXNldCA9IHRmLmRhdGEuY3N2KFxuICogICAgIGNzdlVybCwge1xuICogICAgICAgY29sdW1uQ29uZmlnczoge1xuICogICAgICAgICBtZWR2OiB7XG4gKiAgICAgICAgICAgaXNMYWJlbDogdHJ1ZVxuICogICAgICAgICB9XG4gKiAgICAgICB9XG4gKiAgICAgfSk7XG4gKlxuICogICAvLyBOdW1iZXIgb2YgZmVhdHVyZXMgaXMgdGhlIG51bWJlciBvZiBjb2x1bW4gbmFtZXMgbWludXMgb25lIGZvciB0aGUgbGFiZWxcbiAqICAgLy8gY29sdW1uLlxuICogICBjb25zdCBudW1PZkZlYXR1cmVzID0gKGF3YWl0IGNzdkRhdGFzZXQuY29sdW1uTmFtZXMoKSkubGVuZ3RoIC0gMTtcbiAqXG4gKiAgIC8vIFByZXBhcmUgdGhlIERhdGFzZXQgZm9yIHRyYWluaW5nLlxuICogICBjb25zdCBmbGF0dGVuZWREYXRhc2V0ID1cbiAqICAgICBjc3ZEYXRhc2V0XG4gKiAgICAgLm1hcCgoe3hzLCB5c30pID0+XG4gKiAgICAgICB7XG4gKiAgICAgICAgIC8vIENvbnZlcnQgeHMoZmVhdHVyZXMpIGFuZCB5cyhsYWJlbHMpIGZyb20gb2JqZWN0IGZvcm0gKGtleWVkIGJ5XG4gKiAgICAgICAgIC8vIGNvbHVtbiBuYW1lKSB0byBhcnJheSBmb3JtLlxuICogICAgICAgICByZXR1cm4ge3hzOk9iamVjdC52YWx1ZXMoeHMpLCB5czpPYmplY3QudmFsdWVzKHlzKX07XG4gKiAgICAgICB9KVxuICogICAgIC5iYXRjaCgxMCk7XG4gKlxuICogICAvLyBEZWZpbmUgdGhlIG1vZGVsLlxuICogICBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoKTtcbiAqICAgbW9kZWwuYWRkKHRmLmxheWVycy5kZW5zZSh7XG4gKiAgICAgaW5wdXRTaGFwZTogW251bU9mRmVhdHVyZXNdLFxuICogICAgIHVuaXRzOiAxXG4gKiAgIH0pKTtcbiAqICAgbW9kZWwuY29tcGlsZSh7XG4gKiAgICAgb3B0aW1pemVyOiB0Zi50cmFpbi5zZ2QoMC4wMDAwMDEpLFxuICogICAgIGxvc3M6ICdtZWFuU3F1YXJlZEVycm9yJ1xuICogICB9KTtcbiAqXG4gKiAgIC8vIEZpdCB0aGUgbW9kZWwgdXNpbmcgdGhlIHByZXBhcmVkIERhdGFzZXRcbiAqICAgcmV0dXJuIG1vZGVsLmZpdERhdGFzZXQoZmxhdHRlbmVkRGF0YXNldCwge1xuICogICAgIGVwb2NoczogMTAsXG4gKiAgICAgY2FsbGJhY2tzOiB7XG4gKiAgICAgICBvbkVwb2NoRW5kOiBhc3luYyAoZXBvY2gsIGxvZ3MpID0+IHtcbiAqICAgICAgICAgY29uc29sZS5sb2coZXBvY2ggKyAnOicgKyBsb2dzLmxvc3MpO1xuICogICAgICAgfVxuICogICAgIH1cbiAqICAgfSk7XG4gKiB9XG4gKlxuICogYXdhaXQgcnVuKCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc291cmNlIFVSTCBvciBsb2NhbCBwYXRoIHRvIGdldCBDU1YgZmlsZS4gSWYgaXQncyBhIGxvY2FsIHBhdGgsIGl0XG4gKiBtdXN0IGhhdmUgcHJlZml4IGBmaWxlOi8vYCBhbmQgaXQgb25seSB3b3JrcyBpbiBub2RlIGVudmlyb25tZW50LlxuICogQHBhcmFtIGNzdkNvbmZpZyAoT3B0aW9uYWwpIEEgQ1NWQ29uZmlnIG9iamVjdCB0aGF0IGNvbnRhaW5zIGNvbmZpZ3VyYXRpb25zXG4gKiAgICAgb2YgcmVhZGluZyBhbmQgZGVjb2RpbmcgZnJvbSBDU1YgZmlsZShzKS5cbiAqXG4gKiBAZG9jIHtcbiAqICAgaGVhZGluZzogJ0RhdGEnLFxuICogICBzdWJoZWFkaW5nOiAnQ3JlYXRpb24nLFxuICogICBuYW1lc3BhY2U6ICdkYXRhJyxcbiAqICAgY29uZmlnUGFyYW1JbmRpY2VzOiBbMV1cbiAqICB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjc3YoXG4gICAgc291cmNlOiBSZXF1ZXN0SW5mbywgY3N2Q29uZmlnOiBDU1ZDb25maWcgPSB7fSk6IENTVkRhdGFzZXQge1xuICByZXR1cm4gbmV3IENTVkRhdGFzZXQobmV3IFVSTERhdGFTb3VyY2Uoc291cmNlKSwgY3N2Q29uZmlnKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgRGF0YXNldGAgdGhhdCBwcm9kdWNlcyBlYWNoIGVsZW1lbnQgYnkgY2FsbGluZyBhIHByb3ZpZGVkIGZ1bmN0aW9uLlxuICpcbiAqIE5vdGUgdGhhdCByZXBlYXRlZCBpdGVyYXRpb25zIG92ZXIgdGhpcyBgRGF0YXNldGAgbWF5IHByb2R1Y2UgZGlmZmVyZW50XG4gKiByZXN1bHRzLCBiZWNhdXNlIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhbmV3IGZvciBlYWNoIGVsZW1lbnQgb2YgZWFjaFxuICogaXRlcmF0aW9uLlxuICpcbiAqIEFsc28sIGJld2FyZSB0aGF0IHRoZSBzZXF1ZW5jZSBvZiBjYWxscyB0byB0aGlzIGZ1bmN0aW9uIG1heSBiZSBvdXQgb2Ygb3JkZXJcbiAqIGluIHRpbWUgd2l0aCByZXNwZWN0IHRvIHRoZSBsb2dpY2FsIG9yZGVyIG9mIHRoZSBEYXRhc2V0LiBUaGlzIGlzIGR1ZSB0byB0aGVcbiAqIGFzeW5jaHJvbm91cyBsYXp5IG5hdHVyZSBvZiBzdHJlYW0gcHJvY2Vzc2luZywgYW5kIGRlcGVuZHMgb24gZG93bnN0cmVhbVxuICogdHJhbnNmb3JtYXRpb25zIChlLmcuIC5zaHVmZmxlKCkpLiBJZiB0aGUgcHJvdmlkZWQgZnVuY3Rpb24gaXMgcHVyZSwgdGhpcyBpc1xuICogbm8gcHJvYmxlbSwgYnV0IGlmIGl0IGlzIGEgY2xvc3VyZSBvdmVyIGEgbXV0YWJsZSBzdGF0ZSAoZS5nLiwgYSB0cmF2ZXJzYWxcbiAqIHBvaW50ZXIpLCB0aGVuIHRoZSBvcmRlciBvZiB0aGUgcHJvZHVjZWQgZWxlbWVudHMgbWF5IGJlIHNjcmFtYmxlZC5cbiAqXG4gKiBgYGBqc1xuICogbGV0IGkgPSAtMTtcbiAqIGNvbnN0IGZ1bmMgPSAoKSA9PlxuICogICAgKytpIDwgNSA/IHt2YWx1ZTogaSwgZG9uZTogZmFsc2V9IDoge3ZhbHVlOiBudWxsLCBkb25lOiB0cnVlfTtcbiAqIGNvbnN0IGRzID0gdGYuZGF0YS5mdW5jKGZ1bmMpO1xuICogYXdhaXQgZHMuZm9yRWFjaEFzeW5jKGUgPT4gY29uc29sZS5sb2coZSkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGYgQSBmdW5jdGlvbiB0aGF0IHByb2R1Y2VzIG9uZSBkYXRhIGVsZW1lbnQgb24gZWFjaCBjYWxsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZnVuYzxUIGV4dGVuZHMgVGVuc29yQ29udGFpbmVyPihcbiAgICBmOiAoKSA9PiBJdGVyYXRvclJlc3VsdDxUPnwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxUPj4pOiBEYXRhc2V0PFQ+IHtcbiAgY29uc3QgaXRlciA9IGl0ZXJhdG9yRnJvbUZ1bmN0aW9uKGYpO1xuICByZXR1cm4gZGF0YXNldEZyb21JdGVyYXRvckZuKGFzeW5jICgpID0+IGl0ZXIpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBEYXRhc2V0YCB0aGF0IHByb2R1Y2VzIGVhY2ggZWxlbWVudCBmcm9tIHByb3ZpZGVkIEphdmFTY3JpcHRcbiAqIGdlbmVyYXRvciwgd2hpY2ggaXMgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSAocG90ZW50aWFsbHkgYXN5bmMpIGl0ZXJhdG9yLlxuICpcbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uIG9uIGl0ZXJhdG9ycyBhbmQgZ2VuZXJhdG9ycywgc2VlXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L0d1aWRlL0l0ZXJhdG9yc19hbmRfR2VuZXJhdG9ycyAuXG4gKiBGb3IgdGhlIGl0ZXJhdG9yIHByb3RvY29sLCBzZWVcbiAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0l0ZXJhdGlvbl9wcm90b2NvbHMgLlxuICpcbiAqIEV4YW1wbGUgb2YgY3JlYXRpbmcgYSBkYXRhc2V0IGZyb20gYW4gaXRlcmF0b3IgZmFjdG9yeTpcbiAqIGBgYGpzXG4gKiBmdW5jdGlvbiBtYWtlSXRlcmF0b3IoKSB7XG4gKiAgIGNvbnN0IG51bUVsZW1lbnRzID0gMTA7XG4gKiAgIGxldCBpbmRleCA9IDA7XG4gKlxuICogICBjb25zdCBpdGVyYXRvciA9IHtcbiAqICAgICBuZXh0OiAoKSA9PiB7XG4gKiAgICAgICBsZXQgcmVzdWx0O1xuICogICAgICAgaWYgKGluZGV4IDwgbnVtRWxlbWVudHMpIHtcbiAqICAgICAgICAgcmVzdWx0ID0ge3ZhbHVlOiBpbmRleCwgZG9uZTogZmFsc2V9O1xuICogICAgICAgICBpbmRleCsrO1xuICogICAgICAgICByZXR1cm4gcmVzdWx0O1xuICogICAgICAgfVxuICogICAgICAgcmV0dXJuIHt2YWx1ZTogaW5kZXgsIGRvbmU6IHRydWV9O1xuICogICAgIH1cbiAqICAgfTtcbiAqICAgcmV0dXJuIGl0ZXJhdG9yO1xuICogfVxuICogY29uc3QgZHMgPSB0Zi5kYXRhLmdlbmVyYXRvcihtYWtlSXRlcmF0b3IpO1xuICogYXdhaXQgZHMuZm9yRWFjaEFzeW5jKGUgPT4gY29uc29sZS5sb2coZSkpO1xuICogYGBgXG4gKlxuICogRXhhbXBsZSBvZiBjcmVhdGluZyBhIGRhdGFzZXQgZnJvbSBhIGdlbmVyYXRvcjpcbiAqIGBgYGpzXG4gKiBmdW5jdGlvbiogZGF0YUdlbmVyYXRvcigpIHtcbiAqICAgY29uc3QgbnVtRWxlbWVudHMgPSAxMDtcbiAqICAgbGV0IGluZGV4ID0gMDtcbiAqICAgd2hpbGUgKGluZGV4IDwgbnVtRWxlbWVudHMpIHtcbiAqICAgICBjb25zdCB4ID0gaW5kZXg7XG4gKiAgICAgaW5kZXgrKztcbiAqICAgICB5aWVsZCB4O1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3QgZHMgPSB0Zi5kYXRhLmdlbmVyYXRvcihkYXRhR2VuZXJhdG9yKTtcbiAqIGF3YWl0IGRzLmZvckVhY2hBc3luYyhlID0+IGNvbnNvbGUubG9nKGUpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBnZW5lcmF0b3IgQSBKYXZhU2NyaXB0IGZ1bmN0aW9uIHRoYXQgcmV0dXJuc1xuICogICAgIGEgKHBvdGVudGlhbGx5IGFzeW5jKSBKYXZhU2NyaXB0IGl0ZXJhdG9yLlxuICpcbiAqIEBkb2Mge1xuICogICBoZWFkaW5nOiAnRGF0YScsXG4gKiAgIHN1YmhlYWRpbmc6ICdDcmVhdGlvbicsXG4gKiAgIG5hbWVzcGFjZTogJ2RhdGEnLFxuICogICBjb25maWdQYXJhbUluZGljZXM6IFsxXVxuICogIH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRvcjxUIGV4dGVuZHMgVGVuc29yQ29udGFpbmVyPihcbiAgZ2VuZXJhdG9yOiAoKSA9PiBJdGVyYXRvcjxUPiB8IFByb21pc2U8SXRlcmF0b3I8VD4+IHwgQXN5bmNJdGVyYXRvcjxUPixcbik6IERhdGFzZXQ8VD4ge1xuICByZXR1cm4gZGF0YXNldEZyb21JdGVyYXRvckZuKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBnZW4gPSBhd2FpdCBnZW5lcmF0b3IoKTtcbiAgICByZXR1cm4gaXRlcmF0b3JGcm9tRnVuY3Rpb24oKCkgPT4gZ2VuLm5leHQoKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBpdGVyYXRvciB0aGF0IGdlbmVyYXRlcyBgVGVuc29yYHMgZnJvbSB3ZWJjYW0gdmlkZW8gc3RyZWFtLiBUaGlzXG4gKiBBUEkgb25seSB3b3JrcyBpbiBCcm93c2VyIGVudmlyb25tZW50IHdoZW4gdGhlIGRldmljZSBoYXMgd2ViY2FtLlxuICpcbiAqIE5vdGU6IHRoaXMgY29kZSBzbmlwcGV0IG9ubHkgd29ya3Mgd2hlbiB0aGUgZGV2aWNlIGhhcyBhIHdlYmNhbS4gSXQgd2lsbFxuICogcmVxdWVzdCBwZXJtaXNzaW9uIHRvIG9wZW4gdGhlIHdlYmNhbSB3aGVuIHJ1bm5pbmcuXG4gKiBgYGBqc1xuICogY29uc3QgdmlkZW9FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcbiAqIHZpZGVvRWxlbWVudC53aWR0aCA9IDEwMDtcbiAqIHZpZGVvRWxlbWVudC5oZWlnaHQgPSAxMDA7XG4gKiBjb25zdCBjYW0gPSBhd2FpdCB0Zi5kYXRhLndlYmNhbSh2aWRlb0VsZW1lbnQpO1xuICogY29uc3QgaW1nID0gYXdhaXQgY2FtLmNhcHR1cmUoKTtcbiAqIGltZy5wcmludCgpO1xuICogY2FtLnN0b3AoKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB3ZWJjYW1WaWRlb0VsZW1lbnQgQSBgSFRNTFZpZGVvRWxlbWVudGAgdXNlZCB0byBwbGF5IHZpZGVvIGZyb21cbiAqICAgICB3ZWJjYW0uIElmIHRoaXMgZWxlbWVudCBpcyBub3QgcHJvdmlkZWQsIGEgaGlkZGVuIGBIVE1MVmlkZW9FbGVtZW50YCB3aWxsXG4gKiAgICAgYmUgY3JlYXRlZC4gSW4gdGhhdCBjYXNlLCBgcmVzaXplV2lkdGhgIGFuZCBgcmVzaXplSGVpZ2h0YCBtdXN0IGJlXG4gKiAgICAgcHJvdmlkZWQgdG8gc2V0IHRoZSBnZW5lcmF0ZWQgdGVuc29yIHNoYXBlLlxuICogQHBhcmFtIHdlYmNhbUNvbmZpZyBBIGBXZWJjYW1Db25maWdgIG9iamVjdCB0aGF0IGNvbnRhaW5zIGNvbmZpZ3VyYXRpb25zIG9mXG4gKiAgICAgcmVhZGluZyBhbmQgbWFuaXB1bGF0aW5nIGRhdGEgZnJvbSB3ZWJjYW0gdmlkZW8gc3RyZWFtLlxuICpcbiAqIEBkb2Mge1xuICogICBoZWFkaW5nOiAnRGF0YScsXG4gKiAgIHN1YmhlYWRpbmc6ICdDcmVhdGlvbicsXG4gKiAgIG5hbWVzcGFjZTogJ2RhdGEnLFxuICogICBpZ25vcmVDSTogdHJ1ZVxuICogIH1cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdlYmNhbShcbiAgICB3ZWJjYW1WaWRlb0VsZW1lbnQ/OiBIVE1MVmlkZW9FbGVtZW50LFxuICAgIHdlYmNhbUNvbmZpZz86IFdlYmNhbUNvbmZpZyk6IFByb21pc2U8V2ViY2FtSXRlcmF0b3I+IHtcbiAgcmV0dXJuIFdlYmNhbUl0ZXJhdG9yLmNyZWF0ZSh3ZWJjYW1WaWRlb0VsZW1lbnQsIHdlYmNhbUNvbmZpZyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGl0ZXJhdG9yIHRoYXQgZ2VuZXJhdGVzIGZyZXF1ZW5jeS1kb21haW4gc3BlY3Ryb2dyYW0gYFRlbnNvcmBzIGZyb21cbiAqIG1pY3JvcGhvbmUgYXVkaW8gc3RyZWFtIHdpdGggYnJvd3NlcidzIG5hdGl2ZSBGRlQuIFRoaXMgQVBJIG9ubHkgd29ya3MgaW5cbiAqIGJyb3dzZXIgZW52aXJvbm1lbnQgd2hlbiB0aGUgZGV2aWNlIGhhcyBtaWNyb3Bob25lLlxuICpcbiAqIE5vdGU6IHRoaXMgY29kZSBzbmlwcGV0IG9ubHkgd29ya3Mgd2hlbiB0aGUgZGV2aWNlIGhhcyBhIG1pY3JvcGhvbmUuIEl0IHdpbGxcbiAqIHJlcXVlc3QgcGVybWlzc2lvbiB0byBvcGVuIHRoZSBtaWNyb3Bob25lIHdoZW4gcnVubmluZy5cbiAqIGBgYGpzXG4gKiBjb25zdCBtaWMgPSBhd2FpdCB0Zi5kYXRhLm1pY3JvcGhvbmUoe1xuICogICBmZnRTaXplOiAxMDI0LFxuICogICBjb2x1bW5UcnVuY2F0ZUxlbmd0aDogMjMyLFxuICogICBudW1GcmFtZXNQZXJTcGVjdHJvZ3JhbTogNDMsXG4gKiAgIHNhbXBsZVJhdGVIejo0NDEwMCxcbiAqICAgaW5jbHVkZVNwZWN0cm9ncmFtOiB0cnVlLFxuICogICBpbmNsdWRlV2F2ZWZvcm06IHRydWVcbiAqIH0pO1xuICogY29uc3QgYXVkaW9EYXRhID0gYXdhaXQgbWljLmNhcHR1cmUoKTtcbiAqIGNvbnN0IHNwZWN0cm9ncmFtVGVuc29yID0gYXVkaW9EYXRhLnNwZWN0cm9ncmFtO1xuICogc3BlY3Ryb2dyYW1UZW5zb3IucHJpbnQoKTtcbiAqIGNvbnN0IHdhdmVmb3JtVGVuc29yID0gYXVkaW9EYXRhLndhdmVmb3JtO1xuICogd2F2ZWZvcm1UZW5zb3IucHJpbnQoKTtcbiAqIG1pYy5zdG9wKCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbWljcm9waG9uZUNvbmZpZyBBIGBNaWNyb3Bob25lQ29uZmlnYCBvYmplY3QgdGhhdCBjb250YWluc1xuICogICAgIGNvbmZpZ3VyYXRpb25zIG9mIHJlYWRpbmcgYXVkaW8gZGF0YSBmcm9tIG1pY3JvcGhvbmUuXG4gKlxuICogQGRvYyB7XG4gKiAgIGhlYWRpbmc6ICdEYXRhJyxcbiAqICAgc3ViaGVhZGluZzogJ0NyZWF0aW9uJyxcbiAqICAgbmFtZXNwYWNlOiAnZGF0YScsXG4gKiAgIGlnbm9yZUNJOiB0cnVlXG4gKiAgfVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWljcm9waG9uZShtaWNyb3Bob25lQ29uZmlnPzogTWljcm9waG9uZUNvbmZpZyk6XG4gICAgUHJvbWlzZTxNaWNyb3Bob25lSXRlcmF0b3I+IHtcbiAgcmV0dXJuIE1pY3JvcGhvbmVJdGVyYXRvci5jcmVhdGUobWljcm9waG9uZUNvbmZpZyk7XG59XG4iXX0=