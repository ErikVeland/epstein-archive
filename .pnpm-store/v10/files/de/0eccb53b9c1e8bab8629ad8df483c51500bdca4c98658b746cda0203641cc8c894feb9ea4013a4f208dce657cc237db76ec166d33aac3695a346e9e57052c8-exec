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
import { inferShape } from '../tensor_util_env';
import { makeTensor } from './tensor_ops_util';
/**
 * Creates a `tf.Tensor` with the provided values, shape and dtype.
 *
 * ```js
 * // Pass an array of values to create a vector.
 * tf.tensor([1, 2, 3, 4]).print();
 * ```
 *
 * ```js
 * // Pass a nested array of values to make a matrix or a higher
 * // dimensional tensor.
 * tf.tensor([[1, 2], [3, 4]]).print();
 * ```
 *
 * ```js
 * // Pass a flat array and specify a shape yourself.
 * tf.tensor([1, 2, 3, 4], [2, 2]).print();
 * ```
 *
 * ```js
 * // Pass a `WebGLData` object and specify a shape yourself.
 *
 * // This makes it possible for TF.js applications to avoid GPU / CPU sync.
 * // For example, if your application includes a preprocessing step on the GPU,
 * // you could upload the GPU output directly to TF.js, rather than first
 * // downloading the values.
 *
 * // Example for WebGL2:
 * if (tf.findBackend('custom-webgl') == null) {
 *   const customCanvas = document.createElement('canvas');
 *   const customBackend = new tf.MathBackendWebGL(customCanvas);
 *   tf.registerBackend('custom-webgl', () => customBackend);
 * }
 * const savedBackend = tf.getBackend();
 * await tf.setBackend('custom-webgl');
 * const gl = tf.backend().gpgpu.gl;
 * const texture = gl.createTexture();
 * const tex2d = gl.TEXTURE_2D;
 * const width = 2;
 * const height = 2;
 *
 * gl.bindTexture(tex2d, texture);
 * gl.texParameteri(tex2d, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
 * gl.texParameteri(tex2d, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
 * gl.texParameteri(tex2d, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
 * gl.texParameteri(tex2d, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
 * gl.texImage2D(
 *   tex2d, 0, gl.RGBA32F, // internalFormat
 *   width, height, 0,
 *   gl.RGBA, // textureFormat
 *   gl.FLOAT, // textureType
 *   new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
 * );
 *
 * // Currently, the `texture` has 4 pixels:
 * // Pixel0 is {R:0, G:1, B:2, A:3}
 * // Pixel1 is {R:4, G:5, B:6, A:7}
 * // Pixel2 is {R:8, G:9, B:10, A:11}
 * // Pixel3 is {R:12, G:13, B:14, A:15}
 *
 * const logicalShape = [height * width * 2];
 * const a = tf.tensor({texture, height, width, channels: 'BR'}, logicalShape);
 * a.print();
 * // Tensor value will be [2, 0, 6, 4, 10, 8, 14, 12], since [2, 0] is the
 * // values of 'B' and 'R' channels of Pixel0, [6, 4] is the values of 'B' and
 * 'R'
 * // channels of Pixel1...
 *
 * // For postprocessing on the GPU, it's possible to retrieve the texture
 * // backing any tensor by calling the tensor's `dataToGPU` method like
 * // so:
 *
 * const tex = a.dataToGPU();
 * await tf.setBackend(savedBackend);
 * ```
 *
 * ```js
 * // Pass a `WebGPUData` object and specify a shape yourself.
 *
 * // This makes it possible for TF.js applications to avoid GPU / CPU sync.
 * // For example, if your application includes a preprocessing step on the GPU,
 * // you could upload the GPU output directly to TF.js, rather than first
 * // downloading the values. Unlike WebGL, this optionally supports zero copy
 * // by WebGPUData.zeroCopy. When zeroCopy is false or undefined(default), this
 * // passing GPUBuffer can be destroyed after tensor is created. When zeroCopy
 * // is true, this GPUBuffer is bound directly by the tensor, so do not destroy
 * // this GPUBuffer until all access is done.
 *
 * // Example for WebGPU:
 * function createGPUBufferFromData(device, data, dtype) {
 *   const bytesPerElement = 4;
 *   const sizeInBytes = data.length * bytesPerElement;
 *
 *   const gpuWriteBuffer = device.createBuffer({
 *     mappedAtCreation: true,
 *     size: sizeInBytes,
 *     usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
 *   });
 *   const arrayBuffer = gpuWriteBuffer.getMappedRange();
 *   if (dtype === 'float32') {
 *     new Float32Array(arrayBuffer).set(data);
 *   } else if (dtype === 'int32') {
 *     new Int32Array(arrayBuffer).set(data);
 *   } else {
 *     throw new Error(
 *         `Creating tensor from GPUBuffer only supports` +
 *         `'float32'|'int32' dtype, while the dtype is ${dtype}.`);
 *   }
 *   gpuWriteBuffer.unmap();
 *
 *   const gpuReadBuffer = device.createBuffer({
 *     mappedAtCreation: false,
 *     size: sizeInBytes,
 *     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE |
 *         GPUBufferUsage.COPY_SRC
 *   });
 *
 *   const copyEncoder = device.createCommandEncoder();
 *   copyEncoder.copyBufferToBuffer(
 *       gpuWriteBuffer, 0, gpuReadBuffer, 0, sizeInBytes);
 *   const copyCommands = copyEncoder.finish();
 *   device.queue.submit([copyCommands]);
 *   gpuWriteBuffer.destroy();
 *   return gpuReadBuffer;
 * }
 *
 * const savedBackend = tf.getBackend();
 * await tf.setBackend('webgpu').catch(
 *     () => {throw new Error(
 *         'Failed to use WebGPU backend. Please use Chrome Canary to run.')});
 * const dtype = 'float32';
 * const device = tf.backend().device;
 * const aData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
 * const bData = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4];
 * const expected = [2, 4, 6, 8, 6, 8, 10, 12, 10, 12, 14, 16, 14, 16, 18, 20];
 * const aBuffer = createGPUBufferFromData(device, aData, dtype);
 * const shape = [aData.length];
 * // To use zeroCopy, use {buffer: aBuffer, zeroCopy: true} instead and destroy
 * // aBuffer untill all access is done.
 * const a = tf.tensor({buffer: aBuffer}, shape, dtype);
 * const b = tf.tensor(bData, shape, dtype);
 * const result = tf.add(a, b);
 * result.print();
 * a.dispose();
 * b.dispose();
 * result.dispose();
 * aBuffer.destroy();
 * await tf.setBackend(savedBackend);
 * ```
 * @param values The values of the tensor. Can be nested array of numbers,
 * or a flat array, or a `TypedArray`(At the moment it supports Uint8Array,
 * Uint8ClampedArray, Int32Array, Float32Array) data types, or a `WebGLData`
 * object, or a `WebGPUData` object. If the values are strings, they will be
 * encoded as utf-8 and kept as `Uint8Array[]`. If the values is a `WebGLData`
 * object, the dtype could only be 'float32' or 'int32' and the object has to
 * have: 1. texture, a `WebGLTexture`, the texture must share the same
 * `WebGLRenderingContext` with TFJS's WebGL backend (you could create a custom
 * WebGL backend from your texture's canvas) and the internal texture format
 * for the input texture must be floating point or normalized integer; 2.
 * height, the height of the texture; 3. width, the width of the texture; 4.
 * channels, a non-empty subset of 'RGBA', indicating the values of which
 * channels will be passed to the tensor, such as 'R' or 'BR' (The order of the
 * channels affect the order of tensor values. ). (If the values passed from
 * texture is less than the tensor size, zeros will be padded at the rear.). If
 * the values is a `WebGPUData` object, the dtype could only be 'float32' or
 * 'int32 and the object has to have: buffer, a `GPUBuffer`. The buffer must:
 * 1. share the same `GPUDevice` with TFJS's WebGPU backend; 2. buffer.usage
 * should at least support GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC; 3.
 * buffer.size should not be smaller than the byte size of tensor shape.
 * WebGPUData optionally supports zero copy by flag zeroCopy. When zeroCopy is
 * false or undefined(default),this passing GPUBuffer can be destroyed after
 * tensor is created. When zeroCopy is true, this GPUBuffer is bound directly
 * by the tensor, so do not destroy this GPUBuffer until all access is done.
 * @param shape The shape of the tensor. Optional. If not provided,
 *   it is inferred from `values`.
 * @param dtype The data type.
 *
 * @doc {heading: 'Tensors', subheading: 'Creation'}
 */
export function tensor(values, shape, dtype) {
    const inferredShape = inferShape(values, dtype);
    return makeTensor(values, shape, inferredShape, dtype);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHMvdGVuc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUdILE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUk5QyxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFN0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrTEc7QUFDSCxNQUFNLFVBQVUsTUFBTSxDQUNsQixNQUF1QyxFQUFFLEtBQW1CLEVBQzVELEtBQWdCO0lBQ2xCLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEQsT0FBTyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFjLENBQUM7QUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtUZW5zb3J9IGZyb20gJy4uL3RlbnNvcic7XG5pbXBvcnQge2luZmVyU2hhcGV9IGZyb20gJy4uL3RlbnNvcl91dGlsX2Vudic7XG5pbXBvcnQge1RlbnNvckxpa2V9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7RGF0YVR5cGUsIFJhbmssIFNoYXBlTWFwLCBXZWJHTERhdGEsIFdlYkdQVURhdGF9IGZyb20gJy4uL3R5cGVzJztcblxuaW1wb3J0IHttYWtlVGVuc29yfSBmcm9tICcuL3RlbnNvcl9vcHNfdXRpbCc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGB0Zi5UZW5zb3JgIHdpdGggdGhlIHByb3ZpZGVkIHZhbHVlcywgc2hhcGUgYW5kIGR0eXBlLlxuICpcbiAqIGBgYGpzXG4gKiAvLyBQYXNzIGFuIGFycmF5IG9mIHZhbHVlcyB0byBjcmVhdGUgYSB2ZWN0b3IuXG4gKiB0Zi50ZW5zb3IoWzEsIDIsIDMsIDRdKS5wcmludCgpO1xuICogYGBgXG4gKlxuICogYGBganNcbiAqIC8vIFBhc3MgYSBuZXN0ZWQgYXJyYXkgb2YgdmFsdWVzIHRvIG1ha2UgYSBtYXRyaXggb3IgYSBoaWdoZXJcbiAqIC8vIGRpbWVuc2lvbmFsIHRlbnNvci5cbiAqIHRmLnRlbnNvcihbWzEsIDJdLCBbMywgNF1dKS5wcmludCgpO1xuICogYGBgXG4gKlxuICogYGBganNcbiAqIC8vIFBhc3MgYSBmbGF0IGFycmF5IGFuZCBzcGVjaWZ5IGEgc2hhcGUgeW91cnNlbGYuXG4gKiB0Zi50ZW5zb3IoWzEsIDIsIDMsIDRdLCBbMiwgMl0pLnByaW50KCk7XG4gKiBgYGBcbiAqXG4gKiBgYGBqc1xuICogLy8gUGFzcyBhIGBXZWJHTERhdGFgIG9iamVjdCBhbmQgc3BlY2lmeSBhIHNoYXBlIHlvdXJzZWxmLlxuICpcbiAqIC8vIFRoaXMgbWFrZXMgaXQgcG9zc2libGUgZm9yIFRGLmpzIGFwcGxpY2F0aW9ucyB0byBhdm9pZCBHUFUgLyBDUFUgc3luYy5cbiAqIC8vIEZvciBleGFtcGxlLCBpZiB5b3VyIGFwcGxpY2F0aW9uIGluY2x1ZGVzIGEgcHJlcHJvY2Vzc2luZyBzdGVwIG9uIHRoZSBHUFUsXG4gKiAvLyB5b3UgY291bGQgdXBsb2FkIHRoZSBHUFUgb3V0cHV0IGRpcmVjdGx5IHRvIFRGLmpzLCByYXRoZXIgdGhhbiBmaXJzdFxuICogLy8gZG93bmxvYWRpbmcgdGhlIHZhbHVlcy5cbiAqXG4gKiAvLyBFeGFtcGxlIGZvciBXZWJHTDI6XG4gKiBpZiAodGYuZmluZEJhY2tlbmQoJ2N1c3RvbS13ZWJnbCcpID09IG51bGwpIHtcbiAqICAgY29uc3QgY3VzdG9tQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gKiAgIGNvbnN0IGN1c3RvbUJhY2tlbmQgPSBuZXcgdGYuTWF0aEJhY2tlbmRXZWJHTChjdXN0b21DYW52YXMpO1xuICogICB0Zi5yZWdpc3RlckJhY2tlbmQoJ2N1c3RvbS13ZWJnbCcsICgpID0+IGN1c3RvbUJhY2tlbmQpO1xuICogfVxuICogY29uc3Qgc2F2ZWRCYWNrZW5kID0gdGYuZ2V0QmFja2VuZCgpO1xuICogYXdhaXQgdGYuc2V0QmFja2VuZCgnY3VzdG9tLXdlYmdsJyk7XG4gKiBjb25zdCBnbCA9IHRmLmJhY2tlbmQoKS5ncGdwdS5nbDtcbiAqIGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gKiBjb25zdCB0ZXgyZCA9IGdsLlRFWFRVUkVfMkQ7XG4gKiBjb25zdCB3aWR0aCA9IDI7XG4gKiBjb25zdCBoZWlnaHQgPSAyO1xuICpcbiAqIGdsLmJpbmRUZXh0dXJlKHRleDJkLCB0ZXh0dXJlKTtcbiAqIGdsLnRleFBhcmFtZXRlcmkodGV4MmQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcbiAqIGdsLnRleFBhcmFtZXRlcmkodGV4MmQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcbiAqIGdsLnRleFBhcmFtZXRlcmkodGV4MmQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG4gKiBnbC50ZXhQYXJhbWV0ZXJpKHRleDJkLCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuICogZ2wudGV4SW1hZ2UyRChcbiAqICAgdGV4MmQsIDAsIGdsLlJHQkEzMkYsIC8vIGludGVybmFsRm9ybWF0XG4gKiAgIHdpZHRoLCBoZWlnaHQsIDAsXG4gKiAgIGdsLlJHQkEsIC8vIHRleHR1cmVGb3JtYXRcbiAqICAgZ2wuRkxPQVQsIC8vIHRleHR1cmVUeXBlXG4gKiAgIG5ldyBGbG9hdDMyQXJyYXkoWzAsIDEsIDIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMSwgMTIsIDEzLCAxNCwgMTVdKVxuICogKTtcbiAqXG4gKiAvLyBDdXJyZW50bHksIHRoZSBgdGV4dHVyZWAgaGFzIDQgcGl4ZWxzOlxuICogLy8gUGl4ZWwwIGlzIHtSOjAsIEc6MSwgQjoyLCBBOjN9XG4gKiAvLyBQaXhlbDEgaXMge1I6NCwgRzo1LCBCOjYsIEE6N31cbiAqIC8vIFBpeGVsMiBpcyB7Ujo4LCBHOjksIEI6MTAsIEE6MTF9XG4gKiAvLyBQaXhlbDMgaXMge1I6MTIsIEc6MTMsIEI6MTQsIEE6MTV9XG4gKlxuICogY29uc3QgbG9naWNhbFNoYXBlID0gW2hlaWdodCAqIHdpZHRoICogMl07XG4gKiBjb25zdCBhID0gdGYudGVuc29yKHt0ZXh0dXJlLCBoZWlnaHQsIHdpZHRoLCBjaGFubmVsczogJ0JSJ30sIGxvZ2ljYWxTaGFwZSk7XG4gKiBhLnByaW50KCk7XG4gKiAvLyBUZW5zb3IgdmFsdWUgd2lsbCBiZSBbMiwgMCwgNiwgNCwgMTAsIDgsIDE0LCAxMl0sIHNpbmNlIFsyLCAwXSBpcyB0aGVcbiAqIC8vIHZhbHVlcyBvZiAnQicgYW5kICdSJyBjaGFubmVscyBvZiBQaXhlbDAsIFs2LCA0XSBpcyB0aGUgdmFsdWVzIG9mICdCJyBhbmRcbiAqICdSJ1xuICogLy8gY2hhbm5lbHMgb2YgUGl4ZWwxLi4uXG4gKlxuICogLy8gRm9yIHBvc3Rwcm9jZXNzaW5nIG9uIHRoZSBHUFUsIGl0J3MgcG9zc2libGUgdG8gcmV0cmlldmUgdGhlIHRleHR1cmVcbiAqIC8vIGJhY2tpbmcgYW55IHRlbnNvciBieSBjYWxsaW5nIHRoZSB0ZW5zb3IncyBgZGF0YVRvR1BVYCBtZXRob2QgbGlrZVxuICogLy8gc286XG4gKlxuICogY29uc3QgdGV4ID0gYS5kYXRhVG9HUFUoKTtcbiAqIGF3YWl0IHRmLnNldEJhY2tlbmQoc2F2ZWRCYWNrZW5kKTtcbiAqIGBgYFxuICpcbiAqIGBgYGpzXG4gKiAvLyBQYXNzIGEgYFdlYkdQVURhdGFgIG9iamVjdCBhbmQgc3BlY2lmeSBhIHNoYXBlIHlvdXJzZWxmLlxuICpcbiAqIC8vIFRoaXMgbWFrZXMgaXQgcG9zc2libGUgZm9yIFRGLmpzIGFwcGxpY2F0aW9ucyB0byBhdm9pZCBHUFUgLyBDUFUgc3luYy5cbiAqIC8vIEZvciBleGFtcGxlLCBpZiB5b3VyIGFwcGxpY2F0aW9uIGluY2x1ZGVzIGEgcHJlcHJvY2Vzc2luZyBzdGVwIG9uIHRoZSBHUFUsXG4gKiAvLyB5b3UgY291bGQgdXBsb2FkIHRoZSBHUFUgb3V0cHV0IGRpcmVjdGx5IHRvIFRGLmpzLCByYXRoZXIgdGhhbiBmaXJzdFxuICogLy8gZG93bmxvYWRpbmcgdGhlIHZhbHVlcy4gVW5saWtlIFdlYkdMLCB0aGlzIG9wdGlvbmFsbHkgc3VwcG9ydHMgemVybyBjb3B5XG4gKiAvLyBieSBXZWJHUFVEYXRhLnplcm9Db3B5LiBXaGVuIHplcm9Db3B5IGlzIGZhbHNlIG9yIHVuZGVmaW5lZChkZWZhdWx0KSwgdGhpc1xuICogLy8gcGFzc2luZyBHUFVCdWZmZXIgY2FuIGJlIGRlc3Ryb3llZCBhZnRlciB0ZW5zb3IgaXMgY3JlYXRlZC4gV2hlbiB6ZXJvQ29weVxuICogLy8gaXMgdHJ1ZSwgdGhpcyBHUFVCdWZmZXIgaXMgYm91bmQgZGlyZWN0bHkgYnkgdGhlIHRlbnNvciwgc28gZG8gbm90IGRlc3Ryb3lcbiAqIC8vIHRoaXMgR1BVQnVmZmVyIHVudGlsIGFsbCBhY2Nlc3MgaXMgZG9uZS5cbiAqXG4gKiAvLyBFeGFtcGxlIGZvciBXZWJHUFU6XG4gKiBmdW5jdGlvbiBjcmVhdGVHUFVCdWZmZXJGcm9tRGF0YShkZXZpY2UsIGRhdGEsIGR0eXBlKSB7XG4gKiAgIGNvbnN0IGJ5dGVzUGVyRWxlbWVudCA9IDQ7XG4gKiAgIGNvbnN0IHNpemVJbkJ5dGVzID0gZGF0YS5sZW5ndGggKiBieXRlc1BlckVsZW1lbnQ7XG4gKlxuICogICBjb25zdCBncHVXcml0ZUJ1ZmZlciA9IGRldmljZS5jcmVhdGVCdWZmZXIoe1xuICogICAgIG1hcHBlZEF0Q3JlYXRpb246IHRydWUsXG4gKiAgICAgc2l6ZTogc2l6ZUluQnl0ZXMsXG4gKiAgICAgdXNhZ2U6IEdQVUJ1ZmZlclVzYWdlLk1BUF9XUklURSB8IEdQVUJ1ZmZlclVzYWdlLkNPUFlfU1JDXG4gKiAgIH0pO1xuICogICBjb25zdCBhcnJheUJ1ZmZlciA9IGdwdVdyaXRlQnVmZmVyLmdldE1hcHBlZFJhbmdlKCk7XG4gKiAgIGlmIChkdHlwZSA9PT0gJ2Zsb2F0MzInKSB7XG4gKiAgICAgbmV3IEZsb2F0MzJBcnJheShhcnJheUJ1ZmZlcikuc2V0KGRhdGEpO1xuICogICB9IGVsc2UgaWYgKGR0eXBlID09PSAnaW50MzInKSB7XG4gKiAgICAgbmV3IEludDMyQXJyYXkoYXJyYXlCdWZmZXIpLnNldChkYXRhKTtcbiAqICAgfSBlbHNlIHtcbiAqICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gKiAgICAgICAgIGBDcmVhdGluZyB0ZW5zb3IgZnJvbSBHUFVCdWZmZXIgb25seSBzdXBwb3J0c2AgK1xuICogICAgICAgICBgJ2Zsb2F0MzInfCdpbnQzMicgZHR5cGUsIHdoaWxlIHRoZSBkdHlwZSBpcyAke2R0eXBlfS5gKTtcbiAqICAgfVxuICogICBncHVXcml0ZUJ1ZmZlci51bm1hcCgpO1xuICpcbiAqICAgY29uc3QgZ3B1UmVhZEJ1ZmZlciA9IGRldmljZS5jcmVhdGVCdWZmZXIoe1xuICogICAgIG1hcHBlZEF0Q3JlYXRpb246IGZhbHNlLFxuICogICAgIHNpemU6IHNpemVJbkJ5dGVzLFxuICogICAgIHVzYWdlOiBHUFVCdWZmZXJVc2FnZS5DT1BZX0RTVCB8IEdQVUJ1ZmZlclVzYWdlLlNUT1JBR0UgfFxuICogICAgICAgICBHUFVCdWZmZXJVc2FnZS5DT1BZX1NSQ1xuICogICB9KTtcbiAqXG4gKiAgIGNvbnN0IGNvcHlFbmNvZGVyID0gZGV2aWNlLmNyZWF0ZUNvbW1hbmRFbmNvZGVyKCk7XG4gKiAgIGNvcHlFbmNvZGVyLmNvcHlCdWZmZXJUb0J1ZmZlcihcbiAqICAgICAgIGdwdVdyaXRlQnVmZmVyLCAwLCBncHVSZWFkQnVmZmVyLCAwLCBzaXplSW5CeXRlcyk7XG4gKiAgIGNvbnN0IGNvcHlDb21tYW5kcyA9IGNvcHlFbmNvZGVyLmZpbmlzaCgpO1xuICogICBkZXZpY2UucXVldWUuc3VibWl0KFtjb3B5Q29tbWFuZHNdKTtcbiAqICAgZ3B1V3JpdGVCdWZmZXIuZGVzdHJveSgpO1xuICogICByZXR1cm4gZ3B1UmVhZEJ1ZmZlcjtcbiAqIH1cbiAqXG4gKiBjb25zdCBzYXZlZEJhY2tlbmQgPSB0Zi5nZXRCYWNrZW5kKCk7XG4gKiBhd2FpdCB0Zi5zZXRCYWNrZW5kKCd3ZWJncHUnKS5jYXRjaChcbiAqICAgICAoKSA9PiB7dGhyb3cgbmV3IEVycm9yKFxuICogICAgICAgICAnRmFpbGVkIHRvIHVzZSBXZWJHUFUgYmFja2VuZC4gUGxlYXNlIHVzZSBDaHJvbWUgQ2FuYXJ5IHRvIHJ1bi4nKX0pO1xuICogY29uc3QgZHR5cGUgPSAnZmxvYXQzMic7XG4gKiBjb25zdCBkZXZpY2UgPSB0Zi5iYWNrZW5kKCkuZGV2aWNlO1xuICogY29uc3QgYURhdGEgPSBbMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExLCAxMiwgMTMsIDE0LCAxNSwgMTZdO1xuICogY29uc3QgYkRhdGEgPSBbMSwgMiwgMywgNCwgMSwgMiwgMywgNCwgMSwgMiwgMywgNCwgMSwgMiwgMywgNF07XG4gKiBjb25zdCBleHBlY3RlZCA9IFsyLCA0LCA2LCA4LCA2LCA4LCAxMCwgMTIsIDEwLCAxMiwgMTQsIDE2LCAxNCwgMTYsIDE4LCAyMF07XG4gKiBjb25zdCBhQnVmZmVyID0gY3JlYXRlR1BVQnVmZmVyRnJvbURhdGEoZGV2aWNlLCBhRGF0YSwgZHR5cGUpO1xuICogY29uc3Qgc2hhcGUgPSBbYURhdGEubGVuZ3RoXTtcbiAqIC8vIFRvIHVzZSB6ZXJvQ29weSwgdXNlIHtidWZmZXI6IGFCdWZmZXIsIHplcm9Db3B5OiB0cnVlfSBpbnN0ZWFkIGFuZCBkZXN0cm95XG4gKiAvLyBhQnVmZmVyIHVudGlsbCBhbGwgYWNjZXNzIGlzIGRvbmUuXG4gKiBjb25zdCBhID0gdGYudGVuc29yKHtidWZmZXI6IGFCdWZmZXJ9LCBzaGFwZSwgZHR5cGUpO1xuICogY29uc3QgYiA9IHRmLnRlbnNvcihiRGF0YSwgc2hhcGUsIGR0eXBlKTtcbiAqIGNvbnN0IHJlc3VsdCA9IHRmLmFkZChhLCBiKTtcbiAqIHJlc3VsdC5wcmludCgpO1xuICogYS5kaXNwb3NlKCk7XG4gKiBiLmRpc3Bvc2UoKTtcbiAqIHJlc3VsdC5kaXNwb3NlKCk7XG4gKiBhQnVmZmVyLmRlc3Ryb3koKTtcbiAqIGF3YWl0IHRmLnNldEJhY2tlbmQoc2F2ZWRCYWNrZW5kKTtcbiAqIGBgYFxuICogQHBhcmFtIHZhbHVlcyBUaGUgdmFsdWVzIG9mIHRoZSB0ZW5zb3IuIENhbiBiZSBuZXN0ZWQgYXJyYXkgb2YgbnVtYmVycyxcbiAqIG9yIGEgZmxhdCBhcnJheSwgb3IgYSBgVHlwZWRBcnJheWAoQXQgdGhlIG1vbWVudCBpdCBzdXBwb3J0cyBVaW50OEFycmF5LFxuICogVWludDhDbGFtcGVkQXJyYXksIEludDMyQXJyYXksIEZsb2F0MzJBcnJheSkgZGF0YSB0eXBlcywgb3IgYSBgV2ViR0xEYXRhYFxuICogb2JqZWN0LCBvciBhIGBXZWJHUFVEYXRhYCBvYmplY3QuIElmIHRoZSB2YWx1ZXMgYXJlIHN0cmluZ3MsIHRoZXkgd2lsbCBiZVxuICogZW5jb2RlZCBhcyB1dGYtOCBhbmQga2VwdCBhcyBgVWludDhBcnJheVtdYC4gSWYgdGhlIHZhbHVlcyBpcyBhIGBXZWJHTERhdGFgXG4gKiBvYmplY3QsIHRoZSBkdHlwZSBjb3VsZCBvbmx5IGJlICdmbG9hdDMyJyBvciAnaW50MzInIGFuZCB0aGUgb2JqZWN0IGhhcyB0b1xuICogaGF2ZTogMS4gdGV4dHVyZSwgYSBgV2ViR0xUZXh0dXJlYCwgdGhlIHRleHR1cmUgbXVzdCBzaGFyZSB0aGUgc2FtZVxuICogYFdlYkdMUmVuZGVyaW5nQ29udGV4dGAgd2l0aCBURkpTJ3MgV2ViR0wgYmFja2VuZCAoeW91IGNvdWxkIGNyZWF0ZSBhIGN1c3RvbVxuICogV2ViR0wgYmFja2VuZCBmcm9tIHlvdXIgdGV4dHVyZSdzIGNhbnZhcykgYW5kIHRoZSBpbnRlcm5hbCB0ZXh0dXJlIGZvcm1hdFxuICogZm9yIHRoZSBpbnB1dCB0ZXh0dXJlIG11c3QgYmUgZmxvYXRpbmcgcG9pbnQgb3Igbm9ybWFsaXplZCBpbnRlZ2VyOyAyLlxuICogaGVpZ2h0LCB0aGUgaGVpZ2h0IG9mIHRoZSB0ZXh0dXJlOyAzLiB3aWR0aCwgdGhlIHdpZHRoIG9mIHRoZSB0ZXh0dXJlOyA0LlxuICogY2hhbm5lbHMsIGEgbm9uLWVtcHR5IHN1YnNldCBvZiAnUkdCQScsIGluZGljYXRpbmcgdGhlIHZhbHVlcyBvZiB3aGljaFxuICogY2hhbm5lbHMgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHRlbnNvciwgc3VjaCBhcyAnUicgb3IgJ0JSJyAoVGhlIG9yZGVyIG9mIHRoZSBcbiAqIGNoYW5uZWxzIGFmZmVjdCB0aGUgb3JkZXIgb2YgdGVuc29yIHZhbHVlcy4gKS4gKElmIHRoZSB2YWx1ZXMgcGFzc2VkIGZyb20gXG4gKiB0ZXh0dXJlIGlzIGxlc3MgdGhhbiB0aGUgdGVuc29yIHNpemUsIHplcm9zIHdpbGwgYmUgcGFkZGVkIGF0IHRoZSByZWFyLikuIElmIFxuICogdGhlIHZhbHVlcyBpcyBhIGBXZWJHUFVEYXRhYCBvYmplY3QsIHRoZSBkdHlwZSBjb3VsZCBvbmx5IGJlICdmbG9hdDMyJyBvclxuICogJ2ludDMyIGFuZCB0aGUgb2JqZWN0IGhhcyB0byBoYXZlOiBidWZmZXIsIGEgYEdQVUJ1ZmZlcmAuIFRoZSBidWZmZXIgbXVzdDpcbiAqIDEuIHNoYXJlIHRoZSBzYW1lIGBHUFVEZXZpY2VgIHdpdGggVEZKUydzIFdlYkdQVSBiYWNrZW5kOyAyLiBidWZmZXIudXNhZ2VcbiAqIHNob3VsZCBhdCBsZWFzdCBzdXBwb3J0IEdQVUJ1ZmZlclVzYWdlLlNUT1JBR0UgfCBHUFVCdWZmZXJVc2FnZS5DT1BZX1NSQzsgMy5cbiAqIGJ1ZmZlci5zaXplIHNob3VsZCBub3QgYmUgc21hbGxlciB0aGFuIHRoZSBieXRlIHNpemUgb2YgdGVuc29yIHNoYXBlLlxuICogV2ViR1BVRGF0YSBvcHRpb25hbGx5IHN1cHBvcnRzIHplcm8gY29weSBieSBmbGFnIHplcm9Db3B5LiBXaGVuIHplcm9Db3B5IGlzXG4gKiBmYWxzZSBvciB1bmRlZmluZWQoZGVmYXVsdCksdGhpcyBwYXNzaW5nIEdQVUJ1ZmZlciBjYW4gYmUgZGVzdHJveWVkIGFmdGVyXG4gKiB0ZW5zb3IgaXMgY3JlYXRlZC4gV2hlbiB6ZXJvQ29weSBpcyB0cnVlLCB0aGlzIEdQVUJ1ZmZlciBpcyBib3VuZCBkaXJlY3RseVxuICogYnkgdGhlIHRlbnNvciwgc28gZG8gbm90IGRlc3Ryb3kgdGhpcyBHUFVCdWZmZXIgdW50aWwgYWxsIGFjY2VzcyBpcyBkb25lLlxuICogQHBhcmFtIHNoYXBlIFRoZSBzaGFwZSBvZiB0aGUgdGVuc29yLiBPcHRpb25hbC4gSWYgbm90IHByb3ZpZGVkLFxuICogICBpdCBpcyBpbmZlcnJlZCBmcm9tIGB2YWx1ZXNgLlxuICogQHBhcmFtIGR0eXBlIFRoZSBkYXRhIHR5cGUuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ3JlYXRpb24nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gdGVuc29yPFIgZXh0ZW5kcyBSYW5rPihcbiAgICB2YWx1ZXM6IFRlbnNvckxpa2V8V2ViR0xEYXRhfFdlYkdQVURhdGEsIHNoYXBlPzogU2hhcGVNYXBbUl0sXG4gICAgZHR5cGU/OiBEYXRhVHlwZSk6IFRlbnNvcjxSPiB7XG4gIGNvbnN0IGluZmVycmVkU2hhcGUgPSBpbmZlclNoYXBlKHZhbHVlcywgZHR5cGUpO1xuICByZXR1cm4gbWFrZVRlbnNvcih2YWx1ZXMsIHNoYXBlLCBpbmZlcnJlZFNoYXBlLCBkdHlwZSkgYXMgVGVuc29yPFI+O1xufSJdfQ==