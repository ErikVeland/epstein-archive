/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import { ENGINE } from '../engine';
import { env } from '../environment';
import { Draw, FromPixels } from '../kernel_names';
import { getKernel } from '../kernel_registry';
import { Tensor } from '../tensor';
import { convertToTensor } from '../tensor_util_env';
import { cast } from './cast';
import { op } from './operation';
import { tensor3d } from './tensor3d';
let fromPixels2DContext;
let hasToPixelsWarned = false;
/**
 * Creates a `tf.Tensor` from an image.
 *
 * ```js
 * const image = new ImageData(1, 1);
 * image.data[0] = 100;
 * image.data[1] = 150;
 * image.data[2] = 200;
 * image.data[3] = 255;
 *
 * tf.browser.fromPixels(image).print();
 * ```
 *
 * @param pixels The input image to construct the tensor from. The
 * supported image types are all 4-channel. You can also pass in an image
 * object with following attributes:
 * `{data: Uint8Array; width: number; height: number}`
 * @param numChannels The number of channels of the output tensor. A
 * numChannels value less than 4 allows you to ignore channels. Defaults to
 * 3 (ignores alpha channel of input image).
 *
 * @returns A Tensor3D with the shape `[height, width, numChannels]`.
 *
 * Note: fromPixels can be lossy in some cases, same image may result in
 * slightly different tensor values, if rendered by different rendering
 * engines. This means that results from different browsers, or even same
 * browser with CPU and GPU rendering engines can be different. See discussion
 * in details:
 * https://github.com/tensorflow/tfjs/issues/5482
 *
 * @doc {heading: 'Browser', namespace: 'browser', ignoreCI: true}
 */
function fromPixels_(pixels, numChannels = 3) {
    // Sanity checks.
    if (numChannels > 4) {
        throw new Error('Cannot construct Tensor with more than 4 channels from pixels.');
    }
    if (pixels == null) {
        throw new Error('pixels passed to tf.browser.fromPixels() can not be null');
    }
    let isPixelData = false;
    let isImageData = false;
    let isVideo = false;
    let isImage = false;
    let isCanvasLike = false;
    let isImageBitmap = false;
    if (pixels.data instanceof Uint8Array) {
        isPixelData = true;
    }
    else if (typeof (ImageData) !== 'undefined' && pixels instanceof ImageData) {
        isImageData = true;
    }
    else if (typeof (HTMLVideoElement) !== 'undefined' &&
        pixels instanceof HTMLVideoElement) {
        isVideo = true;
    }
    else if (typeof (HTMLImageElement) !== 'undefined' &&
        pixels instanceof HTMLImageElement) {
        isImage = true;
        // tslint:disable-next-line: no-any
    }
    else if (pixels.getContext != null) {
        isCanvasLike = true;
    }
    else if (typeof (ImageBitmap) !== 'undefined' && pixels instanceof ImageBitmap) {
        isImageBitmap = true;
    }
    else {
        throw new Error('pixels passed to tf.browser.fromPixels() must be either an ' +
            `HTMLVideoElement, HTMLImageElement, HTMLCanvasElement, ImageData ` +
            `in browser, or OffscreenCanvas, ImageData in webworker` +
            ` or {data: Uint32Array, width: number, height: number}, ` +
            `but was ${pixels.constructor.name}`);
    }
    // If the current backend has 'FromPixels' registered, it has a more
    // efficient way of handling pixel uploads, so we call that.
    const kernel = getKernel(FromPixels, ENGINE.backendName);
    if (kernel != null) {
        const inputs = { pixels };
        const attrs = { numChannels };
        return ENGINE.runKernel(FromPixels, inputs, attrs);
    }
    const [width, height] = isVideo ?
        [
            pixels.videoWidth,
            pixels.videoHeight
        ] :
        [pixels.width, pixels.height];
    let vals;
    if (isCanvasLike) {
        vals =
            // tslint:disable-next-line:no-any
            pixels.getContext('2d').getImageData(0, 0, width, height).data;
    }
    else if (isImageData || isPixelData) {
        vals = pixels.data;
    }
    else if (isImage || isVideo || isImageBitmap) {
        if (fromPixels2DContext == null) {
            if (typeof document === 'undefined') {
                if (typeof OffscreenCanvas !== 'undefined' &&
                    typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
                    // @ts-ignore
                    fromPixels2DContext = new OffscreenCanvas(1, 1).getContext('2d');
                }
                else {
                    throw new Error('Cannot parse input in current context. ' +
                        'Reason: OffscreenCanvas Context2D rendering is not supported.');
                }
            }
            else {
                fromPixels2DContext = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
            }
        }
        fromPixels2DContext.canvas.width = width;
        fromPixels2DContext.canvas.height = height;
        fromPixels2DContext.drawImage(pixels, 0, 0, width, height);
        vals = fromPixels2DContext.getImageData(0, 0, width, height).data;
    }
    let values;
    if (numChannels === 4) {
        values = new Int32Array(vals);
    }
    else {
        const numPixels = width * height;
        values = new Int32Array(numPixels * numChannels);
        for (let i = 0; i < numPixels; i++) {
            for (let channel = 0; channel < numChannels; ++channel) {
                values[i * numChannels + channel] = vals[i * 4 + channel];
            }
        }
    }
    const outShape = [height, width, numChannels];
    return tensor3d(values, outShape, 'int32');
}
// Helper functions for |fromPixelsAsync| to check whether the input can
// be wrapped into imageBitmap.
function isPixelData(pixels) {
    return (pixels != null) && (pixels.data instanceof Uint8Array);
}
function isImageBitmapFullySupported() {
    return typeof window !== 'undefined' &&
        typeof (ImageBitmap) !== 'undefined' &&
        window.hasOwnProperty('createImageBitmap');
}
function isNonEmptyPixels(pixels) {
    return pixels != null && pixels.width !== 0 && pixels.height !== 0;
}
function canWrapPixelsToImageBitmap(pixels) {
    return isImageBitmapFullySupported() && !(pixels instanceof ImageBitmap) &&
        isNonEmptyPixels(pixels) && !isPixelData(pixels);
}
/**
 * Creates a `tf.Tensor` from an image in async way.
 *
 * ```js
 * const image = new ImageData(1, 1);
 * image.data[0] = 100;
 * image.data[1] = 150;
 * image.data[2] = 200;
 * image.data[3] = 255;
 *
 * (await tf.browser.fromPixelsAsync(image)).print();
 * ```
 * This API is the async version of fromPixels. The API will first
 * check |WRAP_TO_IMAGEBITMAP| flag, and try to wrap the input to
 * imageBitmap if the flag is set to true.
 *
 * @param pixels The input image to construct the tensor from. The
 * supported image types are all 4-channel. You can also pass in an image
 * object with following attributes:
 * `{data: Uint8Array; width: number; height: number}`
 * @param numChannels The number of channels of the output tensor. A
 * numChannels value less than 4 allows you to ignore channels. Defaults to
 * 3 (ignores alpha channel of input image).
 *
 * @doc {heading: 'Browser', namespace: 'browser', ignoreCI: true}
 */
export async function fromPixelsAsync(pixels, numChannels = 3) {
    let inputs = null;
    // Check whether the backend needs to wrap |pixels| to imageBitmap and
    // whether |pixels| can be wrapped to imageBitmap.
    if (env().getBool('WRAP_TO_IMAGEBITMAP') &&
        canWrapPixelsToImageBitmap(pixels)) {
        // Force the imageBitmap creation to not do any premultiply alpha
        // ops.
        let imageBitmap;
        try {
            // wrap in try-catch block, because createImageBitmap may not work
            // properly in some browsers, e.g.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1335594
            // tslint:disable-next-line: no-any
            imageBitmap = await createImageBitmap(pixels, { premultiplyAlpha: 'none' });
        }
        catch (e) {
            imageBitmap = null;
        }
        // createImageBitmap will clip the source size.
        // In some cases, the input will have larger size than its content.
        // E.g. new Image(10, 10) but with 1 x 1 content. Using
        // createImageBitmap will clip the size from 10 x 10 to 1 x 1, which
        // is not correct. We should avoid wrapping such resouce to
        // imageBitmap.
        if (imageBitmap != null && imageBitmap.width === pixels.width &&
            imageBitmap.height === pixels.height) {
            inputs = imageBitmap;
        }
        else {
            inputs = pixels;
        }
    }
    else {
        inputs = pixels;
    }
    return fromPixels_(inputs, numChannels);
}
function validateImgTensor(img) {
    if (img.rank !== 2 && img.rank !== 3) {
        throw new Error(`toPixels only supports rank 2 or 3 tensors, got rank ${img.rank}.`);
    }
    const depth = img.rank === 2 ? 1 : img.shape[2];
    if (depth > 4 || depth === 2) {
        throw new Error(`toPixels only supports depth of size ` +
            `1, 3 or 4 but got ${depth}`);
    }
    if (img.dtype !== 'float32' && img.dtype !== 'int32') {
        throw new Error(`Unsupported type for toPixels: ${img.dtype}.` +
            ` Please use float32 or int32 tensors.`);
    }
}
function validateImageOptions(imageOptions) {
    const alpha = (imageOptions === null || imageOptions === void 0 ? void 0 : imageOptions.alpha) || 1;
    if (alpha > 1 || alpha < 0) {
        throw new Error(`Alpha value ${alpha} is suppoed to be in range [0 - 1].`);
    }
}
/**
 * Draws a `tf.Tensor` of pixel values to a byte array or optionally a
 * canvas.
 *
 * When the dtype of the input is 'float32', we assume values in the range
 * [0-1]. Otherwise, when input is 'int32', we assume values in the range
 * [0-255].
 *
 * Returns a promise that resolves when the canvas has been drawn to.
 *
 * @param img A rank-2 tensor with shape `[height, width]`, or a rank-3 tensor
 * of shape `[height, width, numChannels]`. If rank-2, draws grayscale. If
 * rank-3, must have depth of 1, 3 or 4. When depth of 1, draws
 * grayscale. When depth of 3, we draw with the first three components of
 * the depth dimension corresponding to r, g, b and alpha = 1. When depth of
 * 4, all four components of the depth dimension correspond to r, g, b, a.
 * @param canvas The canvas to draw to.
 *
 * @doc {heading: 'Browser', namespace: 'browser'}
 */
export async function toPixels(img, canvas) {
    let $img = convertToTensor(img, 'img', 'toPixels');
    if (!(img instanceof Tensor)) {
        // Assume int32 if user passed a native array.
        const originalImgTensor = $img;
        $img = cast(originalImgTensor, 'int32');
        originalImgTensor.dispose();
    }
    validateImgTensor($img);
    const [height, width] = $img.shape.slice(0, 2);
    const depth = $img.rank === 2 ? 1 : $img.shape[2];
    const data = await $img.data();
    const multiplier = $img.dtype === 'float32' ? 255 : 1;
    const bytes = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < height * width; ++i) {
        const rgba = [0, 0, 0, 255];
        for (let d = 0; d < depth; d++) {
            const value = data[i * depth + d];
            if ($img.dtype === 'float32') {
                if (value < 0 || value > 1) {
                    throw new Error(`Tensor values for a float32 Tensor must be in the ` +
                        `range [0 - 1] but encountered ${value}.`);
                }
            }
            else if ($img.dtype === 'int32') {
                if (value < 0 || value > 255) {
                    throw new Error(`Tensor values for a int32 Tensor must be in the ` +
                        `range [0 - 255] but encountered ${value}.`);
                }
            }
            if (depth === 1) {
                rgba[0] = value * multiplier;
                rgba[1] = value * multiplier;
                rgba[2] = value * multiplier;
            }
            else {
                rgba[d] = value * multiplier;
            }
        }
        const j = i * 4;
        bytes[j + 0] = Math.round(rgba[0]);
        bytes[j + 1] = Math.round(rgba[1]);
        bytes[j + 2] = Math.round(rgba[2]);
        bytes[j + 3] = Math.round(rgba[3]);
    }
    if (canvas != null) {
        if (!hasToPixelsWarned) {
            const kernel = getKernel(Draw, ENGINE.backendName);
            if (kernel != null) {
                console.warn('tf.browser.toPixels is not efficient to draw tensor on canvas. ' +
                    'Please try tf.browser.draw instead.');
                hasToPixelsWarned = true;
            }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(bytes, width, height);
        ctx.putImageData(imageData, 0, 0);
    }
    if ($img !== img) {
        $img.dispose();
    }
    return bytes;
}
/**
 * Draws a `tf.Tensor` to a canvas.
 *
 * When the dtype of the input is 'float32', we assume values in the range
 * [0-1]. Otherwise, when input is 'int32', we assume values in the range
 * [0-255].
 *
 * @param image The tensor to draw on the canvas. Must match one of
 * these shapes:
 *   - Rank-2 with shape `[height, width`]: Drawn as grayscale.
 *   - Rank-3 with shape `[height, width, 1]`: Drawn as grayscale.
 *   - Rank-3 with shape `[height, width, 3]`: Drawn as RGB with alpha set in
 *     `imageOptions` (defaults to 1, which is opaque).
 *   - Rank-3 with shape `[height, width, 4]`: Drawn as RGBA.
 * @param canvas The canvas to draw to.
 * @param options The configuration arguments for image to be drawn and the
 *     canvas to draw to.
 *
 * @doc {heading: 'Browser', namespace: 'browser'}
 */
export function draw(image, canvas, options) {
    let $img = convertToTensor(image, 'img', 'draw');
    if (!(image instanceof Tensor)) {
        // Assume int32 if user passed a native array.
        const originalImgTensor = $img;
        $img = cast(originalImgTensor, 'int32');
        originalImgTensor.dispose();
    }
    validateImgTensor($img);
    validateImageOptions(options === null || options === void 0 ? void 0 : options.imageOptions);
    const inputs = { image: $img };
    const attrs = { canvas, options };
    ENGINE.runKernel(Draw, inputs, attrs);
}
export const fromPixels = /* @__PURE__ */ op({ fromPixels_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvb3BzL2Jyb3dzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNqQyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkMsT0FBTyxFQUFDLElBQUksRUFBeUIsVUFBVSxFQUFvQyxNQUFNLGlCQUFpQixDQUFDO0FBQzNHLE9BQU8sRUFBQyxTQUFTLEVBQWUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzRCxPQUFPLEVBQUMsTUFBTSxFQUFxQixNQUFNLFdBQVcsQ0FBQztBQUVyRCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFHbkQsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUMsRUFBRSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQy9CLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFcEMsSUFBSSxtQkFBNkMsQ0FBQztBQUNsRCxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztBQUU5Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQStCRztBQUNILFNBQVMsV0FBVyxDQUNoQixNQUM0QixFQUM1QixXQUFXLEdBQUcsQ0FBQztJQUNqQixpQkFBaUI7SUFDakIsSUFBSSxXQUFXLEdBQUcsQ0FBQyxFQUFFO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQ1gsZ0VBQWdFLENBQUMsQ0FBQztLQUN2RTtJQUNELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7S0FDN0U7SUFDRCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDeEIs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eEMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDN0I7SUFDRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QixvQkFBb0IsQ0FBQyxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsWUFBWSxDQUFDLENBQUM7SUFFNUMsTUFBTSxNQUFNLEdBQWUsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUM7SUFDekMsTUFBTSxLQUFLLEdBQWMsRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLENBQUM7SUFDM0MsTUFBTSxDQUFDLFNBQVMsQ0FDWixJQUFJLEVBQUUsTUFBbUMsRUFDekMsS0FBZ0MsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7RU5HSU5FfSBmcm9tICcuLi9lbmdpbmUnO1xuaW1wb3J0IHtlbnZ9IGZyb20gJy4uL2Vudmlyb25tZW50JztcbmltcG9ydCB7RHJhdywgRHJhd0F0dHJzLCBEcmF3SW5wdXRzLCBGcm9tUGl4ZWxzLCBGcm9tUGl4ZWxzQXR0cnMsIEZyb21QaXhlbHNJbnB1dHN9IGZyb20gJy4uL2tlcm5lbF9uYW1lcyc7XG5pbXBvcnQge2dldEtlcm5lbCwgTmFtZWRBdHRyTWFwfSBmcm9tICcuLi9rZXJuZWxfcmVnaXN0cnknO1xuaW1wb3J0IHtUZW5zb3IsIFRlbnNvcjJELCBUZW5zb3IzRH0gZnJvbSAnLi4vdGVuc29yJztcbmltcG9ydCB7TmFtZWRUZW5zb3JNYXB9IGZyb20gJy4uL3RlbnNvcl90eXBlcyc7XG5pbXBvcnQge2NvbnZlcnRUb1RlbnNvcn0gZnJvbSAnLi4vdGVuc29yX3V0aWxfZW52JztcbmltcG9ydCB7RHJhd09wdGlvbnMsIEltYWdlT3B0aW9ucywgUGl4ZWxEYXRhLCBUZW5zb3JMaWtlfSBmcm9tICcuLi90eXBlcyc7XG5cbmltcG9ydCB7Y2FzdH0gZnJvbSAnLi9jYXN0JztcbmltcG9ydCB7b3B9IGZyb20gJy4vb3BlcmF0aW9uJztcbmltcG9ydCB7dGVuc29yM2R9IGZyb20gJy4vdGVuc29yM2QnO1xuXG5sZXQgZnJvbVBpeGVsczJEQ29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEO1xubGV0IGhhc1RvUGl4ZWxzV2FybmVkID0gZmFsc2U7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGB0Zi5UZW5zb3JgIGZyb20gYW4gaW1hZ2UuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGltYWdlID0gbmV3IEltYWdlRGF0YSgxLCAxKTtcbiAqIGltYWdlLmRhdGFbMF0gPSAxMDA7XG4gKiBpbWFnZS5kYXRhWzFdID0gMTUwO1xuICogaW1hZ2UuZGF0YVsyXSA9IDIwMDtcbiAqIGltYWdlLmRhdGFbM10gPSAyNTU7XG4gKlxuICogdGYuYnJvd3Nlci5mcm9tUGl4ZWxzKGltYWdlKS5wcmludCgpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHBpeGVscyBUaGUgaW5wdXQgaW1hZ2UgdG8gY29uc3RydWN0IHRoZSB0ZW5zb3IgZnJvbS4gVGhlXG4gKiBzdXBwb3J0ZWQgaW1hZ2UgdHlwZXMgYXJlIGFsbCA0LWNoYW5uZWwuIFlvdSBjYW4gYWxzbyBwYXNzIGluIGFuIGltYWdlXG4gKiBvYmplY3Qgd2l0aCBmb2xsb3dpbmcgYXR0cmlidXRlczpcbiAqIGB7ZGF0YTogVWludDhBcnJheTsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXJ9YFxuICogQHBhcmFtIG51bUNoYW5uZWxzIFRoZSBudW1iZXIgb2YgY2hhbm5lbHMgb2YgdGhlIG91dHB1dCB0ZW5zb3IuIEFcbiAqIG51bUNoYW5uZWxzIHZhbHVlIGxlc3MgdGhhbiA0IGFsbG93cyB5b3UgdG8gaWdub3JlIGNoYW5uZWxzLiBEZWZhdWx0cyB0b1xuICogMyAoaWdub3JlcyBhbHBoYSBjaGFubmVsIG9mIGlucHV0IGltYWdlKS5cbiAqXG4gKiBAcmV0dXJucyBBIFRlbnNvcjNEIHdpdGggdGhlIHNoYXBlIGBbaGVpZ2h0LCB3aWR0aCwgbnVtQ2hhbm5lbHNdYC5cbiAqXG4gKiBOb3RlOiBmcm9tUGl4ZWxzIGNhbiBiZSBsb3NzeSBpbiBzb21lIGNhc2VzLCBzYW1lIGltYWdlIG1heSByZXN1bHQgaW5cbiAqIHNsaWdodGx5IGRpZmZlcmVudCB0ZW5zb3IgdmFsdWVzLCBpZiByZW5kZXJlZCBieSBkaWZmZXJlbnQgcmVuZGVyaW5nXG4gKiBlbmdpbmVzLiBUaGlzIG1lYW5zIHRoYXQgcmVzdWx0cyBmcm9tIGRpZmZlcmVudCBicm93c2Vycywgb3IgZXZlbiBzYW1lXG4gKiBicm93c2VyIHdpdGggQ1BVIGFuZCBHUFUgcmVuZGVyaW5nIGVuZ2luZXMgY2FuIGJlIGRpZmZlcmVudC4gU2VlIGRpc2N1c3Npb25cbiAqIGluIGRldGFpbHM6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy81NDgyXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ0Jyb3dzZXInLCBuYW1lc3BhY2U6ICdicm93c2VyJywgaWdub3JlQ0k6IHRydWV9XG4gKi9cbmZ1bmN0aW9uIGZyb21QaXhlbHNfKFxuICAgIHBpeGVsczogUGl4ZWxEYXRhfEltYWdlRGF0YXxIVE1MSW1hZ2VFbGVtZW50fEhUTUxDYW52YXNFbGVtZW50fFxuICAgIEhUTUxWaWRlb0VsZW1lbnR8SW1hZ2VCaXRtYXAsXG4gICAgbnVtQ2hhbm5lbHMgPSAzKTogVGVuc29yM0Qge1xuICAvLyBTYW5pdHkgY2hlY2tzLlxuICBpZiAobnVtQ2hhbm5lbHMgPiA0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ2Fubm90IGNvbnN0cnVjdCBUZW5zb3Igd2l0aCBtb3JlIHRoYW4gNCBjaGFubmVscyBmcm9tIHBpeGVscy4nKTtcbiAgfVxuICBpZiAocGl4ZWxzID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3BpeGVscyBwYXNzZWQgdG8gdGYuYnJvd3Nlci5mcm9tUGl4ZWxzKCkgY2FuIG5vdCBiZSBudWxsJyk7XG4gIH1cbiAgbGV0IGlzUGl4ZWxEYXRhID0gZmFsc2U7XG4gIGxldCBpc0ltYWdlRGF0YSA9IGZhbHNlO1xuICBsZXQgaXNWaWRlbyA9IGZhbHNlO1xuICBsZXQgaXNJbWFnZSA9IGZhbHNlO1xuICBsZXQgaXNDYW52YXNMaWtlID0gZmFsc2U7XG4gIGxldCBpc0ltYWdlQml0bWFwID0gZmFsc2U7XG4gIGlmICgocGl4ZWxzIGFzIFBpeGVsRGF0YSkuZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICBpc1BpeGVsRGF0YSA9IHRydWU7XG4gIH0gZWxzZSBpZiAoXG4gICAgICB0eXBlb2YgKEltYWdlRGF0YSkgIT09ICd1bmRlZmluZWQnICYmIHBpeGVscyBpbnN0YW5jZW9mIEltYWdlRGF0YSkge1xuICAgIGlzSW1hZ2VEYXRhID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIHR5cGVvZiAoSFRNTFZpZGVvRWxlbWVudCkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICBwaXhlbHMgaW5zdGFuY2VvZiBIVE1MVmlkZW9FbGVtZW50KSB7XG4gICAgaXNWaWRlbyA9IHRydWU7XG4gIH0gZWxzZSBpZiAoXG4gICAgICB0eXBlb2YgKEhUTUxJbWFnZUVsZW1lbnQpICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgcGl4ZWxzIGluc3RhbmNlb2YgSFRNTEltYWdlRWxlbWVudCkge1xuICAgIGlzSW1hZ2UgPSB0cnVlO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tYW55XG4gIH0gZWxzZSBpZiAoKHBpeGVscyBhcyBhbnkpLmdldENvbnRleHQgIT0gbnVsbCkge1xuICAgIGlzQ2FudmFzTGlrZSA9IHRydWU7XG4gIH0gZWxzZSBpZiAoXG4gICAgICB0eXBlb2YgKEltYWdlQml0bWFwKSAhPT0gJ3VuZGVmaW5lZCcgJiYgcGl4ZWxzIGluc3RhbmNlb2YgSW1hZ2VCaXRtYXApIHtcbiAgICBpc0ltYWdlQml0bWFwID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdwaXhlbHMgcGFzc2VkIHRvIHRmLmJyb3dzZXIuZnJvbVBpeGVscygpIG11c3QgYmUgZWl0aGVyIGFuICcgK1xuICAgICAgICBgSFRNTFZpZGVvRWxlbWVudCwgSFRNTEltYWdlRWxlbWVudCwgSFRNTENhbnZhc0VsZW1lbnQsIEltYWdlRGF0YSBgICtcbiAgICAgICAgYGluIGJyb3dzZXIsIG9yIE9mZnNjcmVlbkNhbnZhcywgSW1hZ2VEYXRhIGluIHdlYndvcmtlcmAgK1xuICAgICAgICBgIG9yIHtkYXRhOiBVaW50MzJBcnJheSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9LCBgICtcbiAgICAgICAgYGJ1dCB3YXMgJHsocGl4ZWxzIGFzIHt9KS5jb25zdHJ1Y3Rvci5uYW1lfWApO1xuICB9XG4gIC8vIElmIHRoZSBjdXJyZW50IGJhY2tlbmQgaGFzICdGcm9tUGl4ZWxzJyByZWdpc3RlcmVkLCBpdCBoYXMgYSBtb3JlXG4gIC8vIGVmZmljaWVudCB3YXkgb2YgaGFuZGxpbmcgcGl4ZWwgdXBsb2Fkcywgc28gd2UgY2FsbCB0aGF0LlxuICBjb25zdCBrZXJuZWwgPSBnZXRLZXJuZWwoRnJvbVBpeGVscywgRU5HSU5FLmJhY2tlbmROYW1lKTtcbiAgaWYgKGtlcm5lbCAhPSBudWxsKSB7XG4gICAgY29uc3QgaW5wdXRzOiBGcm9tUGl4ZWxzSW5wdXRzID0ge3BpeGVsc307XG4gICAgY29uc3QgYXR0cnM6IEZyb21QaXhlbHNBdHRycyA9IHtudW1DaGFubmVsc307XG4gICAgcmV0dXJuIEVOR0lORS5ydW5LZXJuZWwoXG4gICAgICAgIEZyb21QaXhlbHMsIGlucHV0cyBhcyB1bmtub3duIGFzIE5hbWVkVGVuc29yTWFwLFxuICAgICAgICBhdHRycyBhcyB1bmtub3duIGFzIE5hbWVkQXR0ck1hcCk7XG4gIH1cblxuICBjb25zdCBbd2lkdGgsIGhlaWdodF0gPSBpc1ZpZGVvID9cbiAgICAgIFtcbiAgICAgICAgKHBpeGVscyBhcyBIVE1MVmlkZW9FbGVtZW50KS52aWRlb1dpZHRoLFxuICAgICAgICAocGl4ZWxzIGFzIEhUTUxWaWRlb0VsZW1lbnQpLnZpZGVvSGVpZ2h0XG4gICAgICBdIDpcbiAgICAgIFtwaXhlbHMud2lkdGgsIHBpeGVscy5oZWlnaHRdO1xuICBsZXQgdmFsczogVWludDhDbGFtcGVkQXJyYXl8VWludDhBcnJheTtcblxuICBpZiAoaXNDYW52YXNMaWtlKSB7XG4gICAgdmFscyA9XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgKHBpeGVscyBhcyBhbnkpLmdldENvbnRleHQoJzJkJykuZ2V0SW1hZ2VEYXRhKDAsIDAsIHdpZHRoLCBoZWlnaHQpLmRhdGE7XG4gIH0gZWxzZSBpZiAoaXNJbWFnZURhdGEgfHwgaXNQaXhlbERhdGEpIHtcbiAgICB2YWxzID0gKHBpeGVscyBhcyBQaXhlbERhdGEgfCBJbWFnZURhdGEpLmRhdGE7XG4gIH0gZWxzZSBpZiAoaXNJbWFnZSB8fCBpc1ZpZGVvIHx8IGlzSW1hZ2VCaXRtYXApIHtcbiAgICBpZiAoZnJvbVBpeGVsczJEQ29udGV4dCA9PSBudWxsKSB7XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZW9mIE9mZnNjcmVlbkNhbnZhcyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAgIHR5cGVvZiBPZmZzY3JlZW5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgIGZyb21QaXhlbHMyRENvbnRleHQgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDEsIDEpLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnQ2Fubm90IHBhcnNlIGlucHV0IGluIGN1cnJlbnQgY29udGV4dC4gJyArXG4gICAgICAgICAgICAgICdSZWFzb246IE9mZnNjcmVlbkNhbnZhcyBDb250ZXh0MkQgcmVuZGVyaW5nIGlzIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZyb21QaXhlbHMyRENvbnRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKS5nZXRDb250ZXh0KFxuICAgICAgICAgICAgJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmcm9tUGl4ZWxzMkRDb250ZXh0LmNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgIGZyb21QaXhlbHMyRENvbnRleHQuY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICBmcm9tUGl4ZWxzMkRDb250ZXh0LmRyYXdJbWFnZShcbiAgICAgICAgcGl4ZWxzIGFzIEhUTUxWaWRlb0VsZW1lbnQsIDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgIHZhbHMgPSBmcm9tUGl4ZWxzMkRDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KS5kYXRhO1xuICB9XG4gIGxldCB2YWx1ZXM6IEludDMyQXJyYXk7XG4gIGlmIChudW1DaGFubmVscyA9PT0gNCkge1xuICAgIHZhbHVlcyA9IG5ldyBJbnQzMkFycmF5KHZhbHMpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG51bVBpeGVscyA9IHdpZHRoICogaGVpZ2h0O1xuICAgIHZhbHVlcyA9IG5ldyBJbnQzMkFycmF5KG51bVBpeGVscyAqIG51bUNoYW5uZWxzKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVBpeGVsczsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBjaGFubmVsID0gMDsgY2hhbm5lbCA8IG51bUNoYW5uZWxzOyArK2NoYW5uZWwpIHtcbiAgICAgICAgdmFsdWVzW2kgKiBudW1DaGFubmVscyArIGNoYW5uZWxdID0gdmFsc1tpICogNCArIGNoYW5uZWxdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBvdXRTaGFwZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gW2hlaWdodCwgd2lkdGgsIG51bUNoYW5uZWxzXTtcbiAgcmV0dXJuIHRlbnNvcjNkKHZhbHVlcywgb3V0U2hhcGUsICdpbnQzMicpO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb25zIGZvciB8ZnJvbVBpeGVsc0FzeW5jfCB0byBjaGVjayB3aGV0aGVyIHRoZSBpbnB1dCBjYW5cbi8vIGJlIHdyYXBwZWQgaW50byBpbWFnZUJpdG1hcC5cbmZ1bmN0aW9uIGlzUGl4ZWxEYXRhKHBpeGVsczogUGl4ZWxEYXRhfEltYWdlRGF0YXxIVE1MSW1hZ2VFbGVtZW50fFxuICAgICAgICAgICAgICAgICAgICAgSFRNTENhbnZhc0VsZW1lbnR8SFRNTFZpZGVvRWxlbWVudHxcbiAgICAgICAgICAgICAgICAgICAgIEltYWdlQml0bWFwKTogcGl4ZWxzIGlzIFBpeGVsRGF0YSB7XG4gIHJldHVybiAocGl4ZWxzICE9IG51bGwpICYmICgocGl4ZWxzIGFzIFBpeGVsRGF0YSkuZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpO1xufVxuXG5mdW5jdGlvbiBpc0ltYWdlQml0bWFwRnVsbHlTdXBwb3J0ZWQoKSB7XG4gIHJldHVybiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIChJbWFnZUJpdG1hcCkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB3aW5kb3cuaGFzT3duUHJvcGVydHkoJ2NyZWF0ZUltYWdlQml0bWFwJyk7XG59XG5cbmZ1bmN0aW9uIGlzTm9uRW1wdHlQaXhlbHMocGl4ZWxzOiBQaXhlbERhdGF8SW1hZ2VEYXRhfEhUTUxJbWFnZUVsZW1lbnR8XG4gICAgICAgICAgICAgICAgICAgICAgICAgIEhUTUxDYW52YXNFbGVtZW50fEhUTUxWaWRlb0VsZW1lbnR8SW1hZ2VCaXRtYXApIHtcbiAgcmV0dXJuIHBpeGVscyAhPSBudWxsICYmIHBpeGVscy53aWR0aCAhPT0gMCAmJiBwaXhlbHMuaGVpZ2h0ICE9PSAwO1xufVxuXG5mdW5jdGlvbiBjYW5XcmFwUGl4ZWxzVG9JbWFnZUJpdG1hcChwaXhlbHM6IFBpeGVsRGF0YXxJbWFnZURhdGF8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIVE1MSW1hZ2VFbGVtZW50fEhUTUxDYW52YXNFbGVtZW50fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSFRNTFZpZGVvRWxlbWVudHxJbWFnZUJpdG1hcCkge1xuICByZXR1cm4gaXNJbWFnZUJpdG1hcEZ1bGx5U3VwcG9ydGVkKCkgJiYgIShwaXhlbHMgaW5zdGFuY2VvZiBJbWFnZUJpdG1hcCkgJiZcbiAgICAgIGlzTm9uRW1wdHlQaXhlbHMocGl4ZWxzKSAmJiAhaXNQaXhlbERhdGEocGl4ZWxzKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgYHRmLlRlbnNvcmAgZnJvbSBhbiBpbWFnZSBpbiBhc3luYyB3YXkuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGltYWdlID0gbmV3IEltYWdlRGF0YSgxLCAxKTtcbiAqIGltYWdlLmRhdGFbMF0gPSAxMDA7XG4gKiBpbWFnZS5kYXRhWzFdID0gMTUwO1xuICogaW1hZ2UuZGF0YVsyXSA9IDIwMDtcbiAqIGltYWdlLmRhdGFbM10gPSAyNTU7XG4gKlxuICogKGF3YWl0IHRmLmJyb3dzZXIuZnJvbVBpeGVsc0FzeW5jKGltYWdlKSkucHJpbnQoKTtcbiAqIGBgYFxuICogVGhpcyBBUEkgaXMgdGhlIGFzeW5jIHZlcnNpb24gb2YgZnJvbVBpeGVscy4gVGhlIEFQSSB3aWxsIGZpcnN0XG4gKiBjaGVjayB8V1JBUF9UT19JTUFHRUJJVE1BUHwgZmxhZywgYW5kIHRyeSB0byB3cmFwIHRoZSBpbnB1dCB0b1xuICogaW1hZ2VCaXRtYXAgaWYgdGhlIGZsYWcgaXMgc2V0IHRvIHRydWUuXG4gKlxuICogQHBhcmFtIHBpeGVscyBUaGUgaW5wdXQgaW1hZ2UgdG8gY29uc3RydWN0IHRoZSB0ZW5zb3IgZnJvbS4gVGhlXG4gKiBzdXBwb3J0ZWQgaW1hZ2UgdHlwZXMgYXJlIGFsbCA0LWNoYW5uZWwuIFlvdSBjYW4gYWxzbyBwYXNzIGluIGFuIGltYWdlXG4gKiBvYmplY3Qgd2l0aCBmb2xsb3dpbmcgYXR0cmlidXRlczpcbiAqIGB7ZGF0YTogVWludDhBcnJheTsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXJ9YFxuICogQHBhcmFtIG51bUNoYW5uZWxzIFRoZSBudW1iZXIgb2YgY2hhbm5lbHMgb2YgdGhlIG91dHB1dCB0ZW5zb3IuIEFcbiAqIG51bUNoYW5uZWxzIHZhbHVlIGxlc3MgdGhhbiA0IGFsbG93cyB5b3UgdG8gaWdub3JlIGNoYW5uZWxzLiBEZWZhdWx0cyB0b1xuICogMyAoaWdub3JlcyBhbHBoYSBjaGFubmVsIG9mIGlucHV0IGltYWdlKS5cbiAqXG4gKiBAZG9jIHtoZWFkaW5nOiAnQnJvd3NlcicsIG5hbWVzcGFjZTogJ2Jyb3dzZXInLCBpZ25vcmVDSTogdHJ1ZX1cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZyb21QaXhlbHNBc3luYyhcbiAgICBwaXhlbHM6IFBpeGVsRGF0YXxJbWFnZURhdGF8SFRNTEltYWdlRWxlbWVudHxIVE1MQ2FudmFzRWxlbWVudHxcbiAgICBIVE1MVmlkZW9FbGVtZW50fEltYWdlQml0bWFwLFxuICAgIG51bUNoYW5uZWxzID0gMykge1xuICBsZXQgaW5wdXRzOiBQaXhlbERhdGF8SW1hZ2VEYXRhfEhUTUxJbWFnZUVsZW1lbnR8SFRNTENhbnZhc0VsZW1lbnR8XG4gICAgICBIVE1MVmlkZW9FbGVtZW50fEltYWdlQml0bWFwID0gbnVsbDtcblxuICAvLyBDaGVjayB3aGV0aGVyIHRoZSBiYWNrZW5kIG5lZWRzIHRvIHdyYXAgfHBpeGVsc3wgdG8gaW1hZ2VCaXRtYXAgYW5kXG4gIC8vIHdoZXRoZXIgfHBpeGVsc3wgY2FuIGJlIHdyYXBwZWQgdG8gaW1hZ2VCaXRtYXAuXG4gIGlmIChlbnYoKS5nZXRCb29sKCdXUkFQX1RPX0lNQUdFQklUTUFQJykgJiZcbiAgICAgIGNhbldyYXBQaXhlbHNUb0ltYWdlQml0bWFwKHBpeGVscykpIHtcbiAgICAvLyBGb3JjZSB0aGUgaW1hZ2VCaXRtYXAgY3JlYXRpb24gdG8gbm90IGRvIGFueSBwcmVtdWx0aXBseSBhbHBoYVxuICAgIC8vIG9wcy5cbiAgICBsZXQgaW1hZ2VCaXRtYXA7XG5cbiAgICB0cnkge1xuICAgICAgLy8gd3JhcCBpbiB0cnktY2F0Y2ggYmxvY2ssIGJlY2F1c2UgY3JlYXRlSW1hZ2VCaXRtYXAgbWF5IG5vdCB3b3JrXG4gICAgICAvLyBwcm9wZXJseSBpbiBzb21lIGJyb3dzZXJzLCBlLmcuXG4gICAgICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMzM1NTk0XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWFueVxuICAgICAgaW1hZ2VCaXRtYXAgPSBhd2FpdCAoY3JlYXRlSW1hZ2VCaXRtYXAgYXMgYW55KShcbiAgICAgICAgICBwaXhlbHMgYXMgSW1hZ2VCaXRtYXBTb3VyY2UsIHtwcmVtdWx0aXBseUFscGhhOiAnbm9uZSd9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpbWFnZUJpdG1hcCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlSW1hZ2VCaXRtYXAgd2lsbCBjbGlwIHRoZSBzb3VyY2Ugc2l6ZS5cbiAgICAvLyBJbiBzb21lIGNhc2VzLCB0aGUgaW5wdXQgd2lsbCBoYXZlIGxhcmdlciBzaXplIHRoYW4gaXRzIGNvbnRlbnQuXG4gICAgLy8gRS5nLiBuZXcgSW1hZ2UoMTAsIDEwKSBidXQgd2l0aCAxIHggMSBjb250ZW50LiBVc2luZ1xuICAgIC8vIGNyZWF0ZUltYWdlQml0bWFwIHdpbGwgY2xpcCB0aGUgc2l6ZSBmcm9tIDEwIHggMTAgdG8gMSB4IDEsIHdoaWNoXG4gICAgLy8gaXMgbm90IGNvcnJlY3QuIFdlIHNob3VsZCBhdm9pZCB3cmFwcGluZyBzdWNoIHJlc291Y2UgdG9cbiAgICAvLyBpbWFnZUJpdG1hcC5cbiAgICBpZiAoaW1hZ2VCaXRtYXAgIT0gbnVsbCAmJiBpbWFnZUJpdG1hcC53aWR0aCA9PT0gcGl4ZWxzLndpZHRoICYmXG4gICAgICAgIGltYWdlQml0bWFwLmhlaWdodCA9PT0gcGl4ZWxzLmhlaWdodCkge1xuICAgICAgaW5wdXRzID0gaW1hZ2VCaXRtYXA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlucHV0cyA9IHBpeGVscztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaW5wdXRzID0gcGl4ZWxzO1xuICB9XG5cbiAgcmV0dXJuIGZyb21QaXhlbHNfKGlucHV0cywgbnVtQ2hhbm5lbHMpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUltZ1RlbnNvcihpbWc6IFRlbnNvcjJEfFRlbnNvcjNEKSB7XG4gIGlmIChpbWcucmFuayAhPT0gMiAmJiBpbWcucmFuayAhPT0gMykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYHRvUGl4ZWxzIG9ubHkgc3VwcG9ydHMgcmFuayAyIG9yIDMgdGVuc29ycywgZ290IHJhbmsgJHtpbWcucmFua30uYCk7XG4gIH1cbiAgY29uc3QgZGVwdGggPSBpbWcucmFuayA9PT0gMiA/IDEgOiBpbWcuc2hhcGVbMl07XG5cbiAgaWYgKGRlcHRoID4gNCB8fCBkZXB0aCA9PT0gMikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYHRvUGl4ZWxzIG9ubHkgc3VwcG9ydHMgZGVwdGggb2Ygc2l6ZSBgICtcbiAgICAgICAgYDEsIDMgb3IgNCBidXQgZ290ICR7ZGVwdGh9YCk7XG4gIH1cblxuICBpZiAoaW1nLmR0eXBlICE9PSAnZmxvYXQzMicgJiYgaW1nLmR0eXBlICE9PSAnaW50MzInKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVW5zdXBwb3J0ZWQgdHlwZSBmb3IgdG9QaXhlbHM6ICR7aW1nLmR0eXBlfS5gICtcbiAgICAgICAgYCBQbGVhc2UgdXNlIGZsb2F0MzIgb3IgaW50MzIgdGVuc29ycy5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUltYWdlT3B0aW9ucyhpbWFnZU9wdGlvbnM6IEltYWdlT3B0aW9ucykge1xuICBjb25zdCBhbHBoYSA9IGltYWdlT3B0aW9ucyA/LmFscGhhIHx8IDE7XG4gIGlmIChhbHBoYSA+IDEgfHwgYWxwaGEgPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBBbHBoYSB2YWx1ZSAke2FscGhhfSBpcyBzdXBwb2VkIHRvIGJlIGluIHJhbmdlIFswIC0gMV0uYCk7XG4gIH1cbn1cblxuLyoqXG4gKiBEcmF3cyBhIGB0Zi5UZW5zb3JgIG9mIHBpeGVsIHZhbHVlcyB0byBhIGJ5dGUgYXJyYXkgb3Igb3B0aW9uYWxseSBhXG4gKiBjYW52YXMuXG4gKlxuICogV2hlbiB0aGUgZHR5cGUgb2YgdGhlIGlucHV0IGlzICdmbG9hdDMyJywgd2UgYXNzdW1lIHZhbHVlcyBpbiB0aGUgcmFuZ2VcbiAqIFswLTFdLiBPdGhlcndpc2UsIHdoZW4gaW5wdXQgaXMgJ2ludDMyJywgd2UgYXNzdW1lIHZhbHVlcyBpbiB0aGUgcmFuZ2VcbiAqIFswLTI1NV0uXG4gKlxuICogUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBjYW52YXMgaGFzIGJlZW4gZHJhd24gdG8uXG4gKlxuICogQHBhcmFtIGltZyBBIHJhbmstMiB0ZW5zb3Igd2l0aCBzaGFwZSBgW2hlaWdodCwgd2lkdGhdYCwgb3IgYSByYW5rLTMgdGVuc29yXG4gKiBvZiBzaGFwZSBgW2hlaWdodCwgd2lkdGgsIG51bUNoYW5uZWxzXWAuIElmIHJhbmstMiwgZHJhd3MgZ3JheXNjYWxlLiBJZlxuICogcmFuay0zLCBtdXN0IGhhdmUgZGVwdGggb2YgMSwgMyBvciA0LiBXaGVuIGRlcHRoIG9mIDEsIGRyYXdzXG4gKiBncmF5c2NhbGUuIFdoZW4gZGVwdGggb2YgMywgd2UgZHJhdyB3aXRoIHRoZSBmaXJzdCB0aHJlZSBjb21wb25lbnRzIG9mXG4gKiB0aGUgZGVwdGggZGltZW5zaW9uIGNvcnJlc3BvbmRpbmcgdG8gciwgZywgYiBhbmQgYWxwaGEgPSAxLiBXaGVuIGRlcHRoIG9mXG4gKiA0LCBhbGwgZm91ciBjb21wb25lbnRzIG9mIHRoZSBkZXB0aCBkaW1lbnNpb24gY29ycmVzcG9uZCB0byByLCBnLCBiLCBhLlxuICogQHBhcmFtIGNhbnZhcyBUaGUgY2FudmFzIHRvIGRyYXcgdG8uXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ0Jyb3dzZXInLCBuYW1lc3BhY2U6ICdicm93c2VyJ31cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRvUGl4ZWxzKFxuICAgIGltZzogVGVuc29yMkR8VGVuc29yM0R8VGVuc29yTGlrZSxcbiAgICBjYW52YXM/OiBIVE1MQ2FudmFzRWxlbWVudCk6IFByb21pc2U8VWludDhDbGFtcGVkQXJyYXk+IHtcbiAgbGV0ICRpbWcgPSBjb252ZXJ0VG9UZW5zb3IoaW1nLCAnaW1nJywgJ3RvUGl4ZWxzJyk7XG4gIGlmICghKGltZyBpbnN0YW5jZW9mIFRlbnNvcikpIHtcbiAgICAvLyBBc3N1bWUgaW50MzIgaWYgdXNlciBwYXNzZWQgYSBuYXRpdmUgYXJyYXkuXG4gICAgY29uc3Qgb3JpZ2luYWxJbWdUZW5zb3IgPSAkaW1nO1xuICAgICRpbWcgPSBjYXN0KG9yaWdpbmFsSW1nVGVuc29yLCAnaW50MzInKTtcbiAgICBvcmlnaW5hbEltZ1RlbnNvci5kaXNwb3NlKCk7XG4gIH1cbiAgdmFsaWRhdGVJbWdUZW5zb3IoJGltZyk7XG5cbiAgY29uc3QgW2hlaWdodCwgd2lkdGhdID0gJGltZy5zaGFwZS5zbGljZSgwLCAyKTtcbiAgY29uc3QgZGVwdGggPSAkaW1nLnJhbmsgPT09IDIgPyAxIDogJGltZy5zaGFwZVsyXTtcbiAgY29uc3QgZGF0YSA9IGF3YWl0ICRpbWcuZGF0YSgpO1xuICBjb25zdCBtdWx0aXBsaWVyID0gJGltZy5kdHlwZSA9PT0gJ2Zsb2F0MzInID8gMjU1IDogMTtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhDbGFtcGVkQXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGhlaWdodCAqIHdpZHRoOyArK2kpIHtcbiAgICBjb25zdCByZ2JhID0gWzAsIDAsIDAsIDI1NV07XG5cbiAgICBmb3IgKGxldCBkID0gMDsgZCA8IGRlcHRoOyBkKyspIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtpICogZGVwdGggKyBkXTtcblxuICAgICAgaWYgKCRpbWcuZHR5cGUgPT09ICdmbG9hdDMyJykge1xuICAgICAgICBpZiAodmFsdWUgPCAwIHx8IHZhbHVlID4gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRlbnNvciB2YWx1ZXMgZm9yIGEgZmxvYXQzMiBUZW5zb3IgbXVzdCBiZSBpbiB0aGUgYCArXG4gICAgICAgICAgICAgIGByYW5nZSBbMCAtIDFdIGJ1dCBlbmNvdW50ZXJlZCAke3ZhbHVlfS5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICgkaW1nLmR0eXBlID09PSAnaW50MzInKSB7XG4gICAgICAgIGlmICh2YWx1ZSA8IDAgfHwgdmFsdWUgPiAyNTUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBUZW5zb3IgdmFsdWVzIGZvciBhIGludDMyIFRlbnNvciBtdXN0IGJlIGluIHRoZSBgICtcbiAgICAgICAgICAgICAgYHJhbmdlIFswIC0gMjU1XSBidXQgZW5jb3VudGVyZWQgJHt2YWx1ZX0uYCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGRlcHRoID09PSAxKSB7XG4gICAgICAgIHJnYmFbMF0gPSB2YWx1ZSAqIG11bHRpcGxpZXI7XG4gICAgICAgIHJnYmFbMV0gPSB2YWx1ZSAqIG11bHRpcGxpZXI7XG4gICAgICAgIHJnYmFbMl0gPSB2YWx1ZSAqIG11bHRpcGxpZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZ2JhW2RdID0gdmFsdWUgKiBtdWx0aXBsaWVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGogPSBpICogNDtcbiAgICBieXRlc1tqICsgMF0gPSBNYXRoLnJvdW5kKHJnYmFbMF0pO1xuICAgIGJ5dGVzW2ogKyAxXSA9IE1hdGgucm91bmQocmdiYVsxXSk7XG4gICAgYnl0ZXNbaiArIDJdID0gTWF0aC5yb3VuZChyZ2JhWzJdKTtcbiAgICBieXRlc1tqICsgM10gPSBNYXRoLnJvdW5kKHJnYmFbM10pO1xuICB9XG5cbiAgaWYgKGNhbnZhcyAhPSBudWxsKSB7XG4gICAgaWYgKCFoYXNUb1BpeGVsc1dhcm5lZCkge1xuICAgICAgY29uc3Qga2VybmVsID0gZ2V0S2VybmVsKERyYXcsIEVOR0lORS5iYWNrZW5kTmFtZSk7XG4gICAgICBpZiAoa2VybmVsICE9IG51bGwpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgJ3RmLmJyb3dzZXIudG9QaXhlbHMgaXMgbm90IGVmZmljaWVudCB0byBkcmF3IHRlbnNvciBvbiBjYW52YXMuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSB0cnkgdGYuYnJvd3Nlci5kcmF3IGluc3RlYWQuJyk7XG4gICAgICAgIGhhc1RvUGl4ZWxzV2FybmVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGNvbnN0IGltYWdlRGF0YSA9IG5ldyBJbWFnZURhdGEoYnl0ZXMsIHdpZHRoLCBoZWlnaHQpO1xuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcbiAgfVxuICBpZiAoJGltZyAhPT0gaW1nKSB7XG4gICAgJGltZy5kaXNwb3NlKCk7XG4gIH1cbiAgcmV0dXJuIGJ5dGVzO1xufVxuXG4vKipcbiAqIERyYXdzIGEgYHRmLlRlbnNvcmAgdG8gYSBjYW52YXMuXG4gKlxuICogV2hlbiB0aGUgZHR5cGUgb2YgdGhlIGlucHV0IGlzICdmbG9hdDMyJywgd2UgYXNzdW1lIHZhbHVlcyBpbiB0aGUgcmFuZ2VcbiAqIFswLTFdLiBPdGhlcndpc2UsIHdoZW4gaW5wdXQgaXMgJ2ludDMyJywgd2UgYXNzdW1lIHZhbHVlcyBpbiB0aGUgcmFuZ2VcbiAqIFswLTI1NV0uXG4gKlxuICogQHBhcmFtIGltYWdlIFRoZSB0ZW5zb3IgdG8gZHJhdyBvbiB0aGUgY2FudmFzLiBNdXN0IG1hdGNoIG9uZSBvZlxuICogdGhlc2Ugc2hhcGVzOlxuICogICAtIFJhbmstMiB3aXRoIHNoYXBlIGBbaGVpZ2h0LCB3aWR0aGBdOiBEcmF3biBhcyBncmF5c2NhbGUuXG4gKiAgIC0gUmFuay0zIHdpdGggc2hhcGUgYFtoZWlnaHQsIHdpZHRoLCAxXWA6IERyYXduIGFzIGdyYXlzY2FsZS5cbiAqICAgLSBSYW5rLTMgd2l0aCBzaGFwZSBgW2hlaWdodCwgd2lkdGgsIDNdYDogRHJhd24gYXMgUkdCIHdpdGggYWxwaGEgc2V0IGluXG4gKiAgICAgYGltYWdlT3B0aW9uc2AgKGRlZmF1bHRzIHRvIDEsIHdoaWNoIGlzIG9wYXF1ZSkuXG4gKiAgIC0gUmFuay0zIHdpdGggc2hhcGUgYFtoZWlnaHQsIHdpZHRoLCA0XWA6IERyYXduIGFzIFJHQkEuXG4gKiBAcGFyYW0gY2FudmFzIFRoZSBjYW52YXMgdG8gZHJhdyB0by5cbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBjb25maWd1cmF0aW9uIGFyZ3VtZW50cyBmb3IgaW1hZ2UgdG8gYmUgZHJhd24gYW5kIHRoZVxuICogICAgIGNhbnZhcyB0byBkcmF3IHRvLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdCcm93c2VyJywgbmFtZXNwYWNlOiAnYnJvd3Nlcid9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcmF3KFxuICAgIGltYWdlOiBUZW5zb3IyRHxUZW5zb3IzRHxUZW5zb3JMaWtlLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LFxuICAgIG9wdGlvbnM/OiBEcmF3T3B0aW9ucyk6IHZvaWQge1xuICBsZXQgJGltZyA9IGNvbnZlcnRUb1RlbnNvcihpbWFnZSwgJ2ltZycsICdkcmF3Jyk7XG4gIGlmICghKGltYWdlIGluc3RhbmNlb2YgVGVuc29yKSkge1xuICAgIC8vIEFzc3VtZSBpbnQzMiBpZiB1c2VyIHBhc3NlZCBhIG5hdGl2ZSBhcnJheS5cbiAgICBjb25zdCBvcmlnaW5hbEltZ1RlbnNvciA9ICRpbWc7XG4gICAgJGltZyA9IGNhc3Qob3JpZ2luYWxJbWdUZW5zb3IsICdpbnQzMicpO1xuICAgIG9yaWdpbmFsSW1nVGVuc29yLmRpc3Bvc2UoKTtcbiAgfVxuICB2YWxpZGF0ZUltZ1RlbnNvcigkaW1nKTtcbiAgdmFsaWRhdGVJbWFnZU9wdGlvbnMob3B0aW9ucz8uaW1hZ2VPcHRpb25zKTtcblxuICBjb25zdCBpbnB1dHM6IERyYXdJbnB1dHMgPSB7aW1hZ2U6ICRpbWd9O1xuICBjb25zdCBhdHRyczogRHJhd0F0dHJzID0ge2NhbnZhcywgb3B0aW9uc307XG4gIEVOR0lORS5ydW5LZXJuZWwoXG4gICAgICBEcmF3LCBpbnB1dHMgYXMgdW5rbm93biBhcyBOYW1lZFRlbnNvck1hcCxcbiAgICAgIGF0dHJzIGFzIHVua25vd24gYXMgTmFtZWRBdHRyTWFwKTtcbn1cblxuZXhwb3J0IGNvbnN0IGZyb21QaXhlbHMgPSAvKiBAX19QVVJFX18gKi8gb3Aoe2Zyb21QaXhlbHNffSk7XG4iXX0=