/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
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
import { env, util } from '@tensorflow/tfjs-core';
import { getWebGLContext } from './canvas_util';
import { getTextureConfig } from './tex_util';
export function callAndCheck(gl, func) {
    const returnValue = func();
    if (env().getBool('DEBUG')) {
        checkWebGLError(gl);
    }
    return returnValue;
}
function checkWebGLError(gl) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        throw new Error('WebGL Error: ' + getWebGLErrorMessage(gl, error));
    }
}
// https://en.wikipedia.org/wiki/Half-precision_floating-point_format
const MIN_FLOAT16 = 5.96e-8;
const MAX_FLOAT16 = 65504;
export function canBeRepresented(num) {
    if (env().getBool('WEBGL_RENDER_FLOAT32_ENABLED') || num === 0 ||
        (MIN_FLOAT16 < Math.abs(num) && Math.abs(num) < MAX_FLOAT16)) {
        return true;
    }
    return false;
}
export function getWebGLErrorMessage(gl, status) {
    switch (status) {
        case gl.NO_ERROR:
            return 'NO_ERROR';
        case gl.INVALID_ENUM:
            return 'INVALID_ENUM';
        case gl.INVALID_VALUE:
            return 'INVALID_VALUE';
        case gl.INVALID_OPERATION:
            return 'INVALID_OPERATION';
        case gl.INVALID_FRAMEBUFFER_OPERATION:
            return 'INVALID_FRAMEBUFFER_OPERATION';
        case gl.OUT_OF_MEMORY:
            return 'OUT_OF_MEMORY';
        case gl.CONTEXT_LOST_WEBGL:
            return 'CONTEXT_LOST_WEBGL';
        default:
            return `Unknown error code ${status}`;
    }
}
export function getExtensionOrThrow(gl, extensionName) {
    return throwIfNull(gl, () => gl.getExtension(extensionName), 'Extension "' + extensionName + '" not supported on this browser.');
}
export function createVertexShader(gl, vertexShaderSource) {
    const vertexShader = throwIfNull(gl, () => gl.createShader(gl.VERTEX_SHADER), 'Unable to create vertex WebGLShader.');
    callAndCheck(gl, () => gl.shaderSource(vertexShader, vertexShaderSource));
    callAndCheck(gl, () => gl.compileShader(vertexShader));
    if (gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) === false) {
        console.log(gl.getShaderInfoLog(vertexShader));
        throw new Error('Failed to compile vertex shader.');
    }
    return vertexShader;
}
export function createFragmentShader(gl, fragmentShaderSource) {
    const fragmentShader = throwIfNull(gl, () => gl.createShader(gl.FRAGMENT_SHADER), 'Unable to create fragment WebGLShader.');
    callAndCheck(gl, () => gl.shaderSource(fragmentShader, fragmentShaderSource));
    callAndCheck(gl, () => gl.compileShader(fragmentShader));
    if (env().get('ENGINE_COMPILE_ONLY')) {
        return fragmentShader;
    }
    if (gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) === false) {
        logShaderSourceAndInfoLog(fragmentShaderSource, gl.getShaderInfoLog(fragmentShader));
        throw new Error('Failed to compile fragment shader.');
    }
    return fragmentShader;
}
const lineNumberRegex = /ERROR: [0-9]+:([0-9]+):/g;
export function logShaderSourceAndInfoLog(shaderSource, shaderInfoLog) {
    const lineNumberRegexResult = lineNumberRegex.exec(shaderInfoLog);
    if (lineNumberRegexResult == null) {
        console.log(`Couldn't parse line number in error: ${shaderInfoLog}`);
        console.log(shaderSource);
        return;
    }
    const lineNumber = +lineNumberRegexResult[1];
    const shaderLines = shaderSource.split('\n');
    const pad = shaderLines.length.toString().length + 2;
    const linesWithLineNumbers = shaderLines.map((line, lineNumber) => util.rightPad((lineNumber + 1).toString(), pad) + line);
    let maxLineLength = 0;
    for (let i = 0; i < linesWithLineNumbers.length; i++) {
        maxLineLength = Math.max(linesWithLineNumbers[i].length, maxLineLength);
    }
    const beforeErrorLines = linesWithLineNumbers.slice(0, lineNumber - 1);
    const errorLine = linesWithLineNumbers.slice(lineNumber - 1, lineNumber);
    const afterErrorLines = linesWithLineNumbers.slice(lineNumber);
    console.log(beforeErrorLines.join('\n'));
    console.log(shaderInfoLog.split('\n')[0]);
    console.log(`%c ${util.rightPad(errorLine[0], maxLineLength)}`, 'border:1px solid red; background-color:#e3d2d2; color:#a61717');
    console.log(afterErrorLines.join('\n'));
}
export function createProgram(gl) {
    return throwIfNull(gl, () => gl.createProgram(), 'Unable to create WebGLProgram.');
}
export function linkProgram(gl, program) {
    callAndCheck(gl, () => gl.linkProgram(program));
    if (env().get('ENGINE_COMPILE_ONLY')) {
        return;
    }
    if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
        console.log(gl.getProgramInfoLog(program));
        throw new Error('Failed to link vertex and fragment shaders.');
    }
}
/// validateProgram is effectively "If we `useProgram(program); drawArrays();`,
/// give feedback in log about perf/correctness warnings or errors that would
/// occur."
/// So make sure we set up all vertex/texture/sampler/uniform data before
/// calling validateProgram!
export function validateProgram(gl, program) {
    callAndCheck(gl, () => gl.validateProgram(program));
    if (gl.getProgramParameter(program, gl.VALIDATE_STATUS) === false) {
        console.log(gl.getProgramInfoLog(program));
        throw new Error('Shader program validation failed.');
    }
}
export function createStaticVertexBuffer(gl, data) {
    const buffer = throwIfNull(gl, () => gl.createBuffer(), 'Unable to create WebGLBuffer');
    callAndCheck(gl, () => gl.bindBuffer(gl.ARRAY_BUFFER, buffer));
    callAndCheck(gl, () => gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW));
    return buffer;
}
export function createStaticIndexBuffer(gl, data) {
    const buffer = throwIfNull(gl, () => gl.createBuffer(), 'Unable to create WebGLBuffer');
    callAndCheck(gl, () => gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer));
    callAndCheck(gl, () => gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW));
    return buffer;
}
export function getNumChannels() {
    if (env().getNumber('WEBGL_VERSION') === 2) {
        return 1;
    }
    return 4;
}
export function createTexture(gl) {
    return throwIfNull(gl, () => gl.createTexture(), 'Unable to create WebGLTexture.');
}
export function validateTextureSize(width, height) {
    const maxTextureSize = env().getNumber('WEBGL_MAX_TEXTURE_SIZE');
    if ((width <= 0) || (height <= 0)) {
        const requested = `[${width}x${height}]`;
        throw new Error('Requested texture size ' + requested + ' is invalid.');
    }
    if ((width > maxTextureSize) || (height > maxTextureSize)) {
        const requested = `[${width}x${height}]`;
        const max = `[${maxTextureSize}x${maxTextureSize}]`;
        throw new Error('Requested texture size ' + requested +
            ' greater than WebGL maximum on this browser / GPU ' + max + '.');
    }
}
export function createFramebuffer(gl) {
    return throwIfNull(gl, () => gl.createFramebuffer(), 'Unable to create WebGLFramebuffer.');
}
export function bindVertexBufferToProgramAttribute(gl, program, attribute, buffer, arrayEntriesPerItem, itemStrideInBytes, itemOffsetInBytes) {
    const loc = gl.getAttribLocation(program, attribute);
    if (loc === -1) {
        // The GPU compiler decided to strip out this attribute because it's unused,
        // thus no need to bind.
        return false;
    }
    callAndCheck(gl, () => gl.bindBuffer(gl.ARRAY_BUFFER, buffer));
    callAndCheck(gl, () => gl.vertexAttribPointer(loc, arrayEntriesPerItem, gl.FLOAT, false, itemStrideInBytes, itemOffsetInBytes));
    callAndCheck(gl, () => gl.enableVertexAttribArray(loc));
    return true;
}
export function bindTextureUnit(gl, texture, textureUnit) {
    validateTextureUnit(gl, textureUnit);
    callAndCheck(gl, () => gl.activeTexture(gl.TEXTURE0 + textureUnit));
    callAndCheck(gl, () => gl.bindTexture(gl.TEXTURE_2D, texture));
}
export function unbindTextureUnit(gl, textureUnit) {
    validateTextureUnit(gl, textureUnit);
    callAndCheck(gl, () => gl.activeTexture(gl.TEXTURE0 + textureUnit));
    callAndCheck(gl, () => gl.bindTexture(gl.TEXTURE_2D, null));
}
export function getProgramUniformLocationOrThrow(gl, program, uniformName) {
    return throwIfNull(gl, () => gl.getUniformLocation(program, uniformName), 'uniform "' + uniformName + '" not present in program.');
}
export function getProgramUniformLocation(gl, program, uniformName) {
    return gl.getUniformLocation(program, uniformName);
}
export function bindTextureToProgramUniformSampler(gl, texture, uniformSamplerLocation, textureUnit) {
    callAndCheck(gl, () => bindTextureUnit(gl, texture, textureUnit));
    callAndCheck(gl, () => gl.uniform1i(uniformSamplerLocation, textureUnit));
}
export function bindCanvasToFramebuffer(gl) {
    callAndCheck(gl, () => gl.bindFramebuffer(gl.FRAMEBUFFER, null));
    callAndCheck(gl, () => gl.viewport(0, 0, gl.canvas.width, gl.canvas.height));
    callAndCheck(gl, () => gl.scissor(0, 0, gl.canvas.width, gl.canvas.height));
}
export function bindColorTextureToFramebuffer(gl, texture, framebuffer) {
    callAndCheck(gl, () => gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer));
    callAndCheck(gl, () => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0));
}
export function unbindColorTextureFromFramebuffer(gl, framebuffer) {
    callAndCheck(gl, () => gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer));
    callAndCheck(gl, () => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0));
}
export function validateFramebuffer(gl) {
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Error binding framebuffer: ' + getFramebufferErrorMessage(gl, status));
    }
}
export function getFramebufferErrorMessage(gl, status) {
    switch (status) {
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            return 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT';
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            return 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT';
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            return 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS';
        case gl.FRAMEBUFFER_UNSUPPORTED:
            return 'FRAMEBUFFER_UNSUPPORTED';
        default:
            return `unknown error ${status}`;
    }
}
function throwIfNull(gl, returnTOrNull, failureMessage) {
    const tOrNull = callAndCheck(gl, () => returnTOrNull());
    if (tOrNull == null) {
        throw new Error(failureMessage);
    }
    return tOrNull;
}
function validateTextureUnit(gl, textureUnit) {
    const maxTextureUnit = gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS - 1;
    const glTextureUnit = textureUnit + gl.TEXTURE0;
    if (glTextureUnit < gl.TEXTURE0 || glTextureUnit > maxTextureUnit) {
        const textureUnitRange = `[gl.TEXTURE0, gl.TEXTURE${maxTextureUnit}]`;
        throw new Error(`textureUnit must be in ${textureUnitRange}.`);
    }
}
export function getBatchDim(shape, dimsToSkip = 2) {
    return util.sizeFromShape(shape.slice(0, shape.length - dimsToSkip));
}
export function getRowsCols(shape) {
    if (shape.length === 0) {
        throw Error('Cannot get rows and columns of an empty shape array.');
    }
    return [
        shape.length > 1 ? shape[shape.length - 2] : 1, shape[shape.length - 1]
    ];
}
export function getShapeAs3D(shape) {
    let shapeAs3D = [1, 1, 1];
    const isScalar = shape.length === 0 || (shape.length === 1 && shape[0] === 1);
    if (!isScalar) {
        shapeAs3D =
            [getBatchDim(shape), ...getRowsCols(shape)];
    }
    return shapeAs3D;
}
export function getTextureShapeFromLogicalShape(logShape, isPacked = false) {
    let maxTexSize = env().getNumber('WEBGL_MAX_TEXTURE_SIZE');
    let maxSizeForNarrowTex = env().getNumber('WEBGL_MAX_SIZE_FOR_NARROW_TEXTURE');
    if (maxSizeForNarrowTex === Infinity &&
        env().getBool('WEBGL_AUTO_SQUARIFY_NARROW_TEXTURE_SHAPE')) {
        maxSizeForNarrowTex = maxTexSize / 2;
    }
    if (isPacked) {
        maxTexSize = maxTexSize * 2;
        maxSizeForNarrowTex = maxSizeForNarrowTex * 2;
        // This logic ensures we accurately count the number of packed texels needed
        // to accommodate the tensor. We can only pack values in the same texel if
        // they are from adjacent pairs of rows/cols within the same batch. So if a
        // tensor has 3 rows, we pretend it has 4 rows in order to account for the
        // fact that the texels containing the third row are half empty.
        logShape = logShape.map((d, i) => i >= logShape.length - 2 ?
            util.nearestLargerEven(logShape[i]) :
            logShape[i]);
        // Packed texture height is at least 2 (the channel height of a single
        // texel).
        if (logShape.length === 1) {
            logShape = [2, logShape[0]];
        }
    }
    // If logical shape is 2, we don't squeeze, since we want to match physical.
    if (logShape.length !== 2) {
        const squeezeResult = util.squeezeShape(logShape);
        logShape = squeezeResult.newShape;
    }
    let size = util.sizeFromShape(logShape);
    let textureShape = null;
    if (logShape.length <= 1 && size <= maxTexSize) {
        textureShape = [1, size];
    }
    else if (logShape.length === 2 && logShape[0] <= maxTexSize &&
        logShape[1] <= maxTexSize) {
        textureShape = logShape;
    }
    else if (logShape.length === 3 && logShape[0] * logShape[1] <= maxTexSize &&
        logShape[2] <= maxTexSize) {
        textureShape = [logShape[0] * logShape[1], logShape[2]];
    }
    else if (logShape.length === 3 && logShape[0] <= maxTexSize &&
        logShape[1] * logShape[2] <= maxTexSize) {
        textureShape = [logShape[0], logShape[1] * logShape[2]];
    }
    else if (logShape.length === 4 &&
        logShape[0] * logShape[1] * logShape[2] <= maxTexSize &&
        logShape[3] <= maxTexSize) {
        textureShape = [logShape[0] * logShape[1] * logShape[2], logShape[3]];
    }
    else if (logShape.length === 4 && logShape[0] <= maxTexSize &&
        logShape[1] * logShape[2] * logShape[3] <= maxTexSize) {
        textureShape = [logShape[0], logShape[1] * logShape[2] * logShape[3]];
    }
    // true if one edge length is 1 (1 or 2, if packed), while another edge
    // length exceeds maxSizeForNarrowTex.
    const isLongNarrowTex = textureShape != null &&
        Math.max(...textureShape) > maxSizeForNarrowTex &&
        Math.min(...textureShape) <= (isPacked ? 2 : 1) &&
        Math.min(...textureShape) > 0;
    if (textureShape == null || isLongNarrowTex) {
        if (isPacked) {
            // For packed textures size equals the number of channels required to
            // accommodate the texture data. However in order to squarify such that
            // inner dimensions stay even, we rewrite size to equal the number of
            // texels. Then in the return statement we rehydrate the squarified
            // dimensions to channel units.
            const batchDim = getBatchDim(logShape);
            let rows = 2, cols = 2;
            if (logShape.length) {
                [rows, cols] = getRowsCols(logShape);
            }
            size = batchDim * (rows / 2) * (cols / 2);
            textureShape =
                util.sizeToSquarishShape(size).map(d => d * 2);
        }
        else {
            textureShape = util.sizeToSquarishShape(size);
        }
    }
    return textureShape;
}
function isEven(n) {
    return n % 2 === 0;
}
/**
 * This determines whether reshaping a packed texture requires rearranging
 * the data within the texture, assuming 2x2 packing.
 */
export function isReshapeFree(shape1, shape2) {
    shape1 = shape1.slice(-2);
    shape2 = shape2.slice(-2);
    if (util.arraysEqual(shape1, shape2)) {
        return true;
    }
    if (!shape1.length || !shape2.length) { // One of the shapes is a scalar.
        return true;
    }
    if (shape1[0] === 0 || shape1[1] === 0 || shape2[0] === 0 ||
        shape2[1] === 0) {
        return true;
    }
    if (shape1.length !== shape2.length) { // One of the shapes is a vector.
        const shape1Cols = shape1[shape1.length - 1];
        const shape2Cols = shape2[shape2.length - 1];
        if (shape1Cols === shape2Cols) {
            return true;
        }
        if (isEven(shape1Cols) && isEven(shape2Cols) &&
            (shape1[0] === 1 || shape2[0] === 1)) {
            return true;
        }
    }
    return shape1[1] === shape2[1] && isEven(shape1[0]) && isEven(shape2[0]);
}
// We cache webgl params because the environment gets reset between
// unit tests and we don't want to constantly query the WebGLContext for
// MAX_TEXTURE_SIZE.
let MAX_TEXTURE_SIZE;
let MAX_TEXTURES_IN_SHADER;
export function getWebGLMaxTextureSize(webGLVersion) {
    if (MAX_TEXTURE_SIZE == null) {
        const gl = getWebGLContext(webGLVersion);
        MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
    return MAX_TEXTURE_SIZE;
}
export function resetMaxTextureSize() {
    MAX_TEXTURE_SIZE = null;
}
export function resetMaxTexturesInShader() {
    MAX_TEXTURES_IN_SHADER = null;
}
export function getMaxTexturesInShader(webGLVersion) {
    if (MAX_TEXTURES_IN_SHADER == null) {
        const gl = getWebGLContext(webGLVersion);
        MAX_TEXTURES_IN_SHADER = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    }
    // We cap at 16 to avoid spurious runtime "memory exhausted" error.
    return Math.min(16, MAX_TEXTURES_IN_SHADER);
}
export function getWebGLDisjointQueryTimerVersion(webGLVersion) {
    if (webGLVersion === 0) {
        return 0;
    }
    let queryTimerVersion;
    const gl = getWebGLContext(webGLVersion);
    if (hasExtension(gl, 'EXT_disjoint_timer_query_webgl2') &&
        webGLVersion === 2) {
        queryTimerVersion = 2;
    }
    else if (hasExtension(gl, 'EXT_disjoint_timer_query')) {
        queryTimerVersion = 1;
    }
    else {
        queryTimerVersion = 0;
    }
    return queryTimerVersion;
}
export function hasExtension(gl, extensionName) {
    const ext = gl.getExtension(extensionName);
    return ext != null;
}
export function isWebGLVersionEnabled(webGLVersion) {
    try {
        const gl = getWebGLContext(webGLVersion);
        if (gl != null) {
            return true;
        }
    }
    catch (e) {
        console.log('Error when getting WebGL context: ', e);
        return false;
    }
    return false;
}
export function isCapableOfRenderingToFloatTexture(webGLVersion) {
    if (webGLVersion === 0) {
        return false;
    }
    const gl = getWebGLContext(webGLVersion);
    if (webGLVersion === 1) {
        if (!hasExtension(gl, 'OES_texture_float')) {
            return false;
        }
    }
    else {
        if (!hasExtension(gl, 'EXT_color_buffer_float')) {
            return false;
        }
    }
    const isFrameBufferComplete = createFloatTextureAndBindToFramebuffer(gl);
    return isFrameBufferComplete;
}
/**
 * Check if we can download values from a float/half-float texture.
 *
 * Note that for performance reasons we use binding a texture to a framebuffer
 * as a proxy for ability to download float values later using readPixels. The
 * texture params of this texture will not match those in readPixels exactly
 * but if we are unable to bind some kind of float texture to the frameBuffer
 * then we definitely will not be able to read float values from it.
 */
export function isDownloadFloatTextureEnabled(webGLVersion) {
    if (webGLVersion === 0) {
        return false;
    }
    const gl = getWebGLContext(webGLVersion);
    if (webGLVersion === 1) {
        if (!hasExtension(gl, 'OES_texture_float')) {
            return false;
        }
        if (!hasExtension(gl, 'WEBGL_color_buffer_float')) {
            return false;
        }
    }
    else {
        if (hasExtension(gl, 'EXT_color_buffer_float')) {
            return createFloatTextureAndBindToFramebuffer(gl);
        }
        const COLOR_BUFFER_HALF_FLOAT = 'EXT_color_buffer_half_float';
        if (hasExtension(gl, COLOR_BUFFER_HALF_FLOAT)) {
            const textureHalfFloatExtension = gl.getExtension(COLOR_BUFFER_HALF_FLOAT);
            return createHalfFloatTextureAndBindToFramebuffer(gl, textureHalfFloatExtension);
        }
        return false;
    }
    const isFrameBufferComplete = createFloatTextureAndBindToFramebuffer(gl);
    return isFrameBufferComplete;
}
function createFloatTextureAndBindToFramebuffer(gl) {
    const texConfig = getTextureConfig(gl);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const width = 1;
    const height = 1;
    gl.texImage2D(gl.TEXTURE_2D, 0, texConfig.internalFormatFloat, width, height, 0, texConfig.textureFormatFloat, texConfig.textureTypeFloat, null);
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const isFrameBufferComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(frameBuffer);
    return isFrameBufferComplete;
}
function createHalfFloatTextureAndBindToFramebuffer(
// tslint:disable-next-line:no-any
gl, textureHalfFloatExtension) {
    const texConfig = getTextureConfig(gl, textureHalfFloatExtension);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const width = 1;
    const height = 1;
    gl.texImage2D(gl.TEXTURE_2D, 0, texConfig.internalFormatHalfFloat, width, height, 0, texConfig.textureFormatFloat, texConfig.textureTypeHalfFloat, null);
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const isFrameBufferComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(frameBuffer);
    return isFrameBufferComplete;
}
export function isWebGLFenceEnabled(webGLVersion) {
    if (webGLVersion !== 2) {
        return false;
    }
    const gl = getWebGLContext(webGLVersion);
    // tslint:disable-next-line:no-any
    const isEnabled = gl.fenceSync != null;
    return isEnabled;
}
export function assertNotComplex(tensor, opName) {
    if (!Array.isArray(tensor)) {
        tensor = [tensor];
    }
    tensor.forEach(t => {
        if (t != null) {
            util.assert(t.dtype !== 'complex64', () => `${opName} does not support complex64 tensors ` +
                'in the WebGL backend.');
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViZ2xfdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RmanMtYmFja2VuZC13ZWJnbC9zcmMvd2ViZ2xfdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsR0FBRyxFQUFjLElBQUksRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRTVELE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDOUMsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0sWUFBWSxDQUFDO0FBRTVDLE1BQU0sVUFBVSxZQUFZLENBQUksRUFBeUIsRUFBRSxJQUFhO0lBQ3RFLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDO0lBQzNCLElBQUksR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzFCLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNyQjtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxFQUF5QjtJQUNoRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDNUIsSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUNwRTtBQUNILENBQUM7QUFFRCxxRUFBcUU7QUFDckUsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDO0FBQzVCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQztBQUUxQixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBVztJQUMxQyxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQzFELENBQUMsV0FBVyxHQUFH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Q0FBQyxJQUFJLFVBQVUsRUFBRTtRQUMzQyxZQUFZLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pEO1NBQU0sSUFDSCxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDckIsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVTtRQUNyRCxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVSxFQUFFO1FBQzdCLFlBQVksR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3ZFO1NBQU0sSUFDSCxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVTtRQUNsRCxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLEVBQUU7UUFDekQsWUFBWSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkU7SUFFRCx1RUFBdUU7SUFDdkUsc0NBQXNDO0lBQ3RDLE1BQU0sZUFBZSxHQUFHLFlBQVksSUFBSSxJQUFJO1FBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUMsR0FBRyxtQkFBbUI7UUFDL0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxD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TEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtlbnYsIFRlbnNvckluZm8sIHV0aWx9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7Z2V0V2ViR0xDb250ZXh0fSBmcm9tICcuL2NhbnZhc191dGlsJztcbmltcG9ydCB7Z2V0VGV4dHVyZUNvbmZpZ30gZnJvbSAnLi90ZXhfdXRpbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxsQW5kQ2hlY2s8VD4oZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgZnVuYzogKCkgPT4gVCk6IFQge1xuICBjb25zdCByZXR1cm5WYWx1ZSA9IGZ1bmMoKTtcbiAgaWYgKGVudigpLmdldEJvb2woJ0RFQlVHJykpIHtcbiAgICBjaGVja1dlYkdMRXJyb3IoZ2wpO1xuICB9XG4gIHJldHVybiByZXR1cm5WYWx1ZTtcbn1cblxuZnVuY3Rpb24gY2hlY2tXZWJHTEVycm9yKGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQpIHtcbiAgY29uc3QgZXJyb3IgPSBnbC5nZXRFcnJvcigpO1xuICBpZiAoZXJyb3IgIT09IGdsLk5PX0VSUk9SKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdXZWJHTCBFcnJvcjogJyArIGdldFdlYkdMRXJyb3JNZXNzYWdlKGdsLCBlcnJvcikpO1xuICB9XG59XG5cbi8vIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hhbGYtcHJlY2lzaW9uX2Zsb2F0aW5nLXBvaW50X2Zvcm1hdFxuY29uc3QgTUlOX0ZMT0FUMTYgPSA1Ljk2ZS04O1xuY29uc3QgTUFYX0ZMT0FUMTYgPSA2NTUwNDtcblxuZXhwb3J0IGZ1bmN0aW9uIGNhbkJlUmVwcmVzZW50ZWQobnVtOiBudW1iZXIpOiBib29sZWFuIHtcbiAgaWYgKGVudigpLmdldEJvb2woJ1dFQkdMX1JFTkRFUl9GTE9BVDMyX0VOQUJMRUQnKSB8fCBudW0gPT09IDAgfHxcbiAgICAgIChNSU5fRkxPQVQxNiA8IE1hdGguYWJzKG51bSkgJiYgTWF0aC5hYnMobnVtKSA8IE1BWF9GTE9BVDE2KSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdlYkdMRXJyb3JNZXNzYWdlKFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIHN0YXR1czogbnVtYmVyKTogc3RyaW5nIHtcbiAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICBjYXNlIGdsLk5PX0VSUk9SOlxuICAgICAgcmV0dXJuICdOT19FUlJPUic7XG4gICAgY2FzZSBnbC5JTlZBTElEX0VOVU06XG4gICAgICByZXR1cm4gJ0lOVkFMSURfRU5VTSc7XG4gICAgY2FzZSBnbC5JTlZBTElEX1ZBTFVFOlxuICAgICAgcmV0dXJuICdJTlZBTElEX1ZBTFVFJztcbiAgICBjYXNlIGdsLklOVkFMSURfT1BFUkFUSU9OOlxuICAgICAgcmV0dXJuICdJTlZBTElEX09QRVJBVElPTic7XG4gICAgY2FzZSBnbC5JTlZBTElEX0ZSQU1FQlVGRkVSX09QRVJBVElPTjpcbiAgICAgIHJldHVybiAnSU5WQUxJRF9GUkFNRUJVRkZFUl9PUEVSQVRJT04nO1xuICAgIGNhc2UgZ2wuT1VUX09GX01FTU9SWTpcbiAgICAgIHJldHVybiAnT1VUX09GX01FTU9SWSc7XG4gICAgY2FzZSBnbC5DT05URVhUX0xPU1RfV0VCR0w6XG4gICAgICByZXR1cm4gJ0NPTlRFWFRfTE9TVF9XRUJHTCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBgVW5rbm93biBlcnJvciBjb2RlICR7c3RhdHVzfWA7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvbk9yVGhyb3coXG4gICAgZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgZXh0ZW5zaW9uTmFtZTogc3RyaW5nKToge30ge1xuICByZXR1cm4gdGhyb3dJZk51bGw8e30+KFxuICAgICAgZ2wsICgpID0+IGdsLmdldEV4dGVuc2lvbihleHRlbnNpb25OYW1lKSxcbiAgICAgICdFeHRlbnNpb24gXCInICsgZXh0ZW5zaW9uTmFtZSArICdcIiBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgYnJvd3Nlci4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZlcnRleFNoYWRlcihcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCB2ZXJ0ZXhTaGFkZXJTb3VyY2U6IHN0cmluZyk6IFdlYkdMU2hhZGVyIHtcbiAgY29uc3QgdmVydGV4U2hhZGVyOiBXZWJHTFNoYWRlciA9IHRocm93SWZOdWxsPFdlYkdMU2hhZGVyPihcbiAgICAgIGdsLCAoKSA9PiBnbC5jcmVhdGVTaGFkZXIoZ2wuVkVSVEVYX1NIQURFUiksXG4gICAgICAnVW5hYmxlIHRvIGNyZWF0ZSB2ZXJ0ZXggV2ViR0xTaGFkZXIuJyk7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuc2hhZGVyU291cmNlKHZlcnRleFNoYWRlciwgdmVydGV4U2hhZGVyU291cmNlKSk7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuY29tcGlsZVNoYWRlcih2ZXJ0ZXhTaGFkZXIpKTtcbiAgaWYgKGdsLmdldFNoYWRlclBhcmFtZXRlcih2ZXJ0ZXhTaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSA9PT0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZyhnbC5nZXRTaGFkZXJJbmZvTG9nKHZlcnRleFNoYWRlcikpO1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgdmVydGV4IHNoYWRlci4nKTtcbiAgfVxuICByZXR1cm4gdmVydGV4U2hhZGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRnJhZ21lbnRTaGFkZXIoXG4gICAgZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgZnJhZ21lbnRTaGFkZXJTb3VyY2U6IHN0cmluZyk6IFdlYkdMU2hhZGVyIHtcbiAgY29uc3QgZnJhZ21lbnRTaGFkZXI6IFdlYkdMU2hhZGVyID0gdGhyb3dJZk51bGw8V2ViR0xTaGFkZXI+KFxuICAgICAgZ2wsICgpID0+IGdsLmNyZWF0ZVNoYWRlcihnbC5GUkFHTUVOVF9TSEFERVIpLFxuICAgICAgJ1VuYWJsZSB0byBjcmVhdGUgZnJhZ21lbnQgV2ViR0xTaGFkZXIuJyk7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuc2hhZGVyU291cmNlKGZyYWdtZW50U2hhZGVyLCBmcmFnbWVudFNoYWRlclNvdXJjZSkpO1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmNvbXBpbGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpKTtcbiAgaWYgKGVudigpLmdldCgnRU5HSU5FX0NPTVBJTEVfT05MWScpKSB7XG4gICAgcmV0dXJuIGZyYWdtZW50U2hhZGVyO1xuICB9XG4gIGlmIChnbC5nZXRTaGFkZXJQYXJhbWV0ZXIoZnJhZ21lbnRTaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSA9PT0gZmFsc2UpIHtcbiAgICBsb2dTaGFkZXJTb3VyY2VBbmRJbmZvTG9nKFxuICAgICAgICBmcmFnbWVudFNoYWRlclNvdXJjZSwgZ2wuZ2V0U2hhZGVySW5mb0xvZyhmcmFnbWVudFNoYWRlcikpO1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgZnJhZ21lbnQgc2hhZGVyLicpO1xuICB9XG4gIHJldHVybiBmcmFnbWVudFNoYWRlcjtcbn1cblxuY29uc3QgbGluZU51bWJlclJlZ2V4ID0gL0VSUk9SOiBbMC05XSs6KFswLTldKyk6L2c7XG5leHBvcnQgZnVuY3Rpb24gbG9nU2hhZGVyU291cmNlQW5kSW5mb0xvZyhcbiAgICBzaGFkZXJTb3VyY2U6IHN0cmluZywgc2hhZGVySW5mb0xvZzogc3RyaW5nKSB7XG4gIGNvbnN0IGxpbmVOdW1iZXJSZWdleFJlc3VsdCA9IGxpbmVOdW1iZXJSZWdleC5leGVjKHNoYWRlckluZm9Mb2cpO1xuICBpZiAobGluZU51bWJlclJlZ2V4UmVzdWx0ID09IG51bGwpIHtcbiAgICBjb25zb2xlLmxvZyhgQ291bGRuJ3QgcGFyc2UgbGluZSBudW1iZXIgaW4gZXJyb3I6ICR7c2hhZGVySW5mb0xvZ31gKTtcbiAgICBjb25zb2xlLmxvZyhzaGFkZXJTb3VyY2UpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGxpbmVOdW1iZXIgPSArbGluZU51bWJlclJlZ2V4UmVzdWx0WzFdO1xuXG4gIGNvbnN0IHNoYWRlckxpbmVzID0gc2hhZGVyU291cmNlLnNwbGl0KCdcXG4nKTtcbiAgY29uc3QgcGFkID0gc2hhZGVyTGluZXMubGVuZ3RoLnRvU3RyaW5nKCkubGVuZ3RoICsgMjtcbiAgY29uc3QgbGluZXNXaXRoTGluZU51bWJlcnMgPSBzaGFkZXJMaW5lcy5tYXAoXG4gICAgICAobGluZSwgbGluZU51bWJlcikgPT5cbiAgICAgICAgICB1dGlsLnJpZ2h0UGFkKChsaW5lTnVtYmVyICsgMSkudG9TdHJpbmcoKSwgcGFkKSArIGxpbmUpO1xuICBsZXQgbWF4TGluZUxlbmd0aCA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXNXaXRoTGluZU51bWJlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBtYXhMaW5lTGVuZ3RoID0gTWF0aC5tYXgobGluZXNXaXRoTGluZU51bWJlcnNbaV0ubGVuZ3RoLCBtYXhMaW5lTGVuZ3RoKTtcbiAgfVxuXG4gIGNvbnN0IGJlZm9yZUVycm9yTGluZXMgPSBsaW5lc1dpdGhMaW5lTnVtYmVycy5zbGljZSgwLCBsaW5lTnVtYmVyIC0gMSk7XG4gIGNvbnN0IGVycm9yTGluZSA9IGxpbmVzV2l0aExpbmVOdW1iZXJzLnNsaWNlKGxpbmVOdW1iZXIgLSAxLCBsaW5lTnVtYmVyKTtcbiAgY29uc3QgYWZ0ZXJFcnJvckxpbmVzID0gbGluZXNXaXRoTGluZU51bWJlcnMuc2xpY2UobGluZU51bWJlcik7XG5cbiAgY29uc29sZS5sb2coYmVmb3JlRXJyb3JMaW5lcy5qb2luKCdcXG4nKSk7XG4gIGNvbnNvbGUubG9nKHNoYWRlckluZm9Mb2cuc3BsaXQoJ1xcbicpWzBdKTtcbiAgY29uc29sZS5sb2coXG4gICAgICBgJWMgJHt1dGlsLnJpZ2h0UGFkKGVycm9yTGluZVswXSwgbWF4TGluZUxlbmd0aCl9YCxcbiAgICAgICdib3JkZXI6MXB4IHNvbGlkIHJlZDsgYmFja2dyb3VuZC1jb2xvcjojZTNkMmQyOyBjb2xvcjojYTYxNzE3Jyk7XG4gIGNvbnNvbGUubG9nKGFmdGVyRXJyb3JMaW5lcy5qb2luKCdcXG4nKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmFtKGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFByb2dyYW0ge1xuICByZXR1cm4gdGhyb3dJZk51bGw8V2ViR0xQcm9ncmFtPihcbiAgICAgIGdsLCAoKSA9PiBnbC5jcmVhdGVQcm9ncmFtKCksICdVbmFibGUgdG8gY3JlYXRlIFdlYkdMUHJvZ3JhbS4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmtQcm9ncmFtKGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIHByb2dyYW06IFdlYkdMUHJvZ3JhbSkge1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmxpbmtQcm9ncmFtKHByb2dyYW0pKTtcbiAgaWYgKGVudigpLmdldCgnRU5HSU5FX0NPTVBJTEVfT05MWScpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChnbC5nZXRQcm9ncmFtUGFyYW1ldGVyKHByb2dyYW0sIGdsLkxJTktfU1RBVFVTKSA9PT0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZyhnbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gbGluayB2ZXJ0ZXggYW5kIGZyYWdtZW50IHNoYWRlcnMuJyk7XG4gIH1cbn1cblxuLy8vIHZhbGlkYXRlUHJvZ3JhbSBpcyBlZmZlY3RpdmVseSBcIklmIHdlIGB1c2VQcm9ncmFtKHByb2dyYW0pOyBkcmF3QXJyYXlzKCk7YCxcbi8vLyBnaXZlIGZlZWRiYWNrIGluIGxvZyBhYm91dCBwZXJmL2NvcnJlY3RuZXNzIHdhcm5pbmdzIG9yIGVycm9ycyB0aGF0IHdvdWxkXG4vLy8gb2NjdXIuXCJcbi8vLyBTbyBtYWtlIHN1cmUgd2Ugc2V0IHVwIGFsbCB2ZXJ0ZXgvdGV4dHVyZS9zYW1wbGVyL3VuaWZvcm0gZGF0YSBiZWZvcmVcbi8vLyBjYWxsaW5nIHZhbGlkYXRlUHJvZ3JhbSFcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVByb2dyYW0oXG4gICAgZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgcHJvZ3JhbTogV2ViR0xQcm9ncmFtKSB7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wudmFsaWRhdGVQcm9ncmFtKHByb2dyYW0pKTtcbiAgaWYgKGdsLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgZ2wuVkFMSURBVEVfU1RBVFVTKSA9PT0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZyhnbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTaGFkZXIgcHJvZ3JhbSB2YWxpZGF0aW9uIGZhaWxlZC4nKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3RhdGljVmVydGV4QnVmZmVyKFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIGRhdGE6IEZsb2F0MzJBcnJheSk6IFdlYkdMQnVmZmVyIHtcbiAgY29uc3QgYnVmZmVyOiBXZWJHTEJ1ZmZlciA9IHRocm93SWZOdWxsPFdlYkdMQnVmZmVyPihcbiAgICAgIGdsLCAoKSA9PiBnbC5jcmVhdGVCdWZmZXIoKSwgJ1VuYWJsZSB0byBjcmVhdGUgV2ViR0xCdWZmZXInKTtcbiAgY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgYnVmZmVyKSk7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIGRhdGEsIGdsLlNUQVRJQ19EUkFXKSk7XG4gIHJldHVybiBidWZmZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdGF0aWNJbmRleEJ1ZmZlcihcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCBkYXRhOiBVaW50MTZBcnJheSk6IFdlYkdMQnVmZmVyIHtcbiAgY29uc3QgYnVmZmVyOiBXZWJHTEJ1ZmZlciA9IHRocm93SWZOdWxsPFdlYkdMQnVmZmVyPihcbiAgICAgIGdsLCAoKSA9PiBnbC5jcmVhdGVCdWZmZXIoKSwgJ1VuYWJsZSB0byBjcmVhdGUgV2ViR0xCdWZmZXInKTtcbiAgY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBidWZmZXIpKTtcbiAgY2FsbEFuZENoZWNrKFxuICAgICAgZ2wsICgpID0+IGdsLmJ1ZmZlckRhdGEoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGRhdGEsIGdsLlNUQVRJQ19EUkFXKSk7XG4gIHJldHVybiBidWZmZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROdW1DaGFubmVscygpOiBudW1iZXIge1xuICBpZiAoZW52KCkuZ2V0TnVtYmVyKCdXRUJHTF9WRVJTSU9OJykgPT09IDIpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICByZXR1cm4gNDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRleHR1cmUoZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMVGV4dHVyZSB7XG4gIHJldHVybiB0aHJvd0lmTnVsbDxXZWJHTFRleHR1cmU+KFxuICAgICAgZ2wsICgpID0+IGdsLmNyZWF0ZVRleHR1cmUoKSwgJ1VuYWJsZSB0byBjcmVhdGUgV2ViR0xUZXh0dXJlLicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVUZXh0dXJlU2l6ZSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikge1xuICBjb25zdCBtYXhUZXh0dXJlU2l6ZSA9IGVudigpLmdldE51bWJlcignV0VCR0xfTUFYX1RFWFRVUkVfU0laRScpO1xuICBpZiAoKHdpZHRoIDw9IDApIHx8IChoZWlnaHQgPD0gMCkpIHtcbiAgICBjb25zdCByZXF1ZXN0ZWQgPSBgWyR7d2lkdGh9eCR7aGVpZ2h0fV1gO1xuICAgIHRocm93IG5ldyBFcnJvcignUmVxdWVzdGVkIHRleHR1cmUgc2l6ZSAnICsgcmVxdWVzdGVkICsgJyBpcyBpbnZhbGlkLicpO1xuICB9XG4gIGlmICgod2lkdGggPiBtYXhUZXh0dXJlU2l6ZSkgfHwgKGhlaWdodCA+IG1heFRleHR1cmVTaXplKSkge1xuICAgIGNvbnN0IHJlcXVlc3RlZCA9IGBbJHt3aWR0aH14JHtoZWlnaHR9XWA7XG4gICAgY29uc3QgbWF4ID0gYFske21heFRleHR1cmVTaXplfXgke21heFRleHR1cmVTaXplfV1gO1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1JlcXVlc3RlZCB0ZXh0dXJlIHNpemUgJyArIHJlcXVlc3RlZCArXG4gICAgICAgICcgZ3JlYXRlciB0aGFuIFdlYkdMIG1heGltdW0gb24gdGhpcyBicm93c2VyIC8gR1BVICcgKyBtYXggKyAnLicpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGcmFtZWJ1ZmZlcihnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xGcmFtZWJ1ZmZlciB7XG4gIHJldHVybiB0aHJvd0lmTnVsbDxXZWJHTEZyYW1lYnVmZmVyPihcbiAgICAgIGdsLCAoKSA9PiBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpLCAnVW5hYmxlIHRvIGNyZWF0ZSBXZWJHTEZyYW1lYnVmZmVyLicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmluZFZlcnRleEJ1ZmZlclRvUHJvZ3JhbUF0dHJpYnV0ZShcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCBwcm9ncmFtOiBXZWJHTFByb2dyYW0sIGF0dHJpYnV0ZTogc3RyaW5nLFxuICAgIGJ1ZmZlcjogV2ViR0xCdWZmZXIsIGFycmF5RW50cmllc1Blckl0ZW06IG51bWJlciwgaXRlbVN0cmlkZUluQnl0ZXM6IG51bWJlcixcbiAgICBpdGVtT2Zmc2V0SW5CeXRlczogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IGxvYyA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIGF0dHJpYnV0ZSk7XG4gIGlmIChsb2MgPT09IC0xKSB7XG4gICAgLy8gVGhlIEdQVSBjb21waWxlciBkZWNpZGVkIHRvIHN0cmlwIG91dCB0aGlzIGF0dHJpYnV0ZSBiZWNhdXNlIGl0J3MgdW51c2VkLFxuICAgIC8vIHRodXMgbm8gbmVlZCB0byBiaW5kLlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCBidWZmZXIpKTtcbiAgY2FsbEFuZENoZWNrKFxuICAgICAgZ2wsXG4gICAgICAoKSA9PiBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuICAgICAgICAgIGxvYywgYXJyYXlFbnRyaWVzUGVySXRlbSwgZ2wuRkxPQVQsIGZhbHNlLCBpdGVtU3RyaWRlSW5CeXRlcyxcbiAgICAgICAgICBpdGVtT2Zmc2V0SW5CeXRlcykpO1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGxvYykpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRUZXh0dXJlVW5pdChcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCB0ZXh0dXJlOiBXZWJHTFRleHR1cmUsIHRleHR1cmVVbml0OiBudW1iZXIpIHtcbiAgdmFsaWRhdGVUZXh0dXJlVW5pdChnbCwgdGV4dHVyZVVuaXQpO1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTAgKyB0ZXh0dXJlVW5pdCkpO1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuYmluZFRleHR1cmVVbml0KFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIHRleHR1cmVVbml0OiBudW1iZXIpIHtcbiAgdmFsaWRhdGVUZXh0dXJlVW5pdChnbCwgdGV4dHVyZVVuaXQpO1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTAgKyB0ZXh0dXJlVW5pdCkpO1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2dyYW1Vbmlmb3JtTG9jYXRpb25PclRocm93KFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIHByb2dyYW06IFdlYkdMUHJvZ3JhbSxcbiAgICB1bmlmb3JtTmFtZTogc3RyaW5nKTogV2ViR0xVbmlmb3JtTG9jYXRpb24ge1xuICByZXR1cm4gdGhyb3dJZk51bGw8V2ViR0xVbmlmb3JtTG9jYXRpb24+KFxuICAgICAgZ2wsICgpID0+IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCB1bmlmb3JtTmFtZSksXG4gICAgICAndW5pZm9ybSBcIicgKyB1bmlmb3JtTmFtZSArICdcIiBub3QgcHJlc2VudCBpbiBwcm9ncmFtLicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvZ3JhbVVuaWZvcm1Mb2NhdGlvbihcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCBwcm9ncmFtOiBXZWJHTFByb2dyYW0sXG4gICAgdW5pZm9ybU5hbWU6IHN0cmluZyk6IFdlYkdMVW5pZm9ybUxvY2F0aW9uIHtcbiAgcmV0dXJuIGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCB1bmlmb3JtTmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kVGV4dHVyZVRvUHJvZ3JhbVVuaWZvcm1TYW1wbGVyKFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIHRleHR1cmU6IFdlYkdMVGV4dHVyZSxcbiAgICB1bmlmb3JtU2FtcGxlckxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiwgdGV4dHVyZVVuaXQ6IG51bWJlcikge1xuICBjYWxsQW5kQ2hlY2soZ2wsICgpID0+IGJpbmRUZXh0dXJlVW5pdChnbCwgdGV4dHVyZSwgdGV4dHVyZVVuaXQpKTtcbiAgY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC51bmlmb3JtMWkodW5pZm9ybVNhbXBsZXJMb2NhdGlvbiwgdGV4dHVyZVVuaXQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRDYW52YXNUb0ZyYW1lYnVmZmVyKGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQpIHtcbiAgY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpKTtcbiAgY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC52aWV3cG9ydCgwLCAwLCBnbC5jYW52YXMud2lkdGgsIGdsLmNhbnZhcy5oZWlnaHQpKTtcbiAgY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC5zY2lzc29yKDAsIDAsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmluZENvbG9yVGV4dHVyZVRvRnJhbWVidWZmZXIoXG4gICAgZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgdGV4dHVyZTogV2ViR0xUZXh0dXJlLFxuICAgIGZyYW1lYnVmZmVyOiBXZWJHTEZyYW1lYnVmZmVyKSB7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmcmFtZWJ1ZmZlcikpO1xuICBjYWxsQW5kQ2hlY2soXG4gICAgICBnbCxcbiAgICAgICgpID0+IGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKFxuICAgICAgICAgIGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSwgMCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5iaW5kQ29sb3JUZXh0dXJlRnJvbUZyYW1lYnVmZmVyKFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIGZyYW1lYnVmZmVyOiBXZWJHTEZyYW1lYnVmZmVyKSB7XG4gIGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmcmFtZWJ1ZmZlcikpO1xuICBjYWxsQW5kQ2hlY2soXG4gICAgICBnbCxcbiAgICAgICgpID0+IGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKFxuICAgICAgICAgIGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgbnVsbCwgMCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVGcmFtZWJ1ZmZlcihnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0KSB7XG4gIGNvbnN0IHN0YXR1cyA9IGdsLmNoZWNrRnJhbWVidWZmZXJTdGF0dXMoZ2wuRlJBTUVCVUZGRVIpO1xuICBpZiAoc3RhdHVzICE9PSBnbC5GUkFNRUJVRkZFUl9DT01QTEVURSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0Vycm9yIGJpbmRpbmcgZnJhbWVidWZmZXI6ICcgKyBnZXRGcmFtZWJ1ZmZlckVycm9yTWVzc2FnZShnbCwgc3RhdHVzKSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZyYW1lYnVmZmVyRXJyb3JNZXNzYWdlKFxuICAgIGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIHN0YXR1czogbnVtYmVyKTogc3RyaW5nIHtcbiAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICBjYXNlIGdsLkZSQU1FQlVGRkVSX0lOQ09NUExFVEVfQVRUQUNITUVOVDpcbiAgICAgIHJldHVybiAnRlJBTUVCVUZGRVJfSU5DT01QTEVURV9BVFRBQ0hNRU5UJztcbiAgICBjYXNlIGdsLkZSQU1FQlVGRkVSX0lOQ09NUExFVEVfTUlTU0lOR19BVFRBQ0hNRU5UOlxuICAgICAgcmV0dXJuICdGUkFNRUJVRkZFUl9JTkNPTVBMRVRFX01JU1NJTkdfQVRUQUNITUVOVCc7XG4gICAgY2FzZSBnbC5GUkFNRUJVRkZFUl9JTkNPTVBMRVRFX0RJTUVOU0lPTlM6XG4gICAgICByZXR1cm4gJ0ZSQU1FQlVGRkVSX0lOQ09NUExFVEVfRElNRU5TSU9OUyc7XG4gICAgY2FzZSBnbC5GUkFNRUJVRkZFUl9VTlNVUFBPUlRFRDpcbiAgICAgIHJldHVybiAnRlJBTUVCVUZGRVJfVU5TVVBQT1JURUQnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gYHVua25vd24gZXJyb3IgJHtzdGF0dXN9YDtcbiAgfVxufVxuXG5mdW5jdGlvbiB0aHJvd0lmTnVsbDxUPihcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCByZXR1cm5UT3JOdWxsOiAoKSA9PiBUIHwgbnVsbCxcbiAgICBmYWlsdXJlTWVzc2FnZTogc3RyaW5nKTogVCB7XG4gIGNvbnN0IHRPck51bGw6IFR8bnVsbCA9IGNhbGxBbmRDaGVjayhnbCwgKCkgPT4gcmV0dXJuVE9yTnVsbCgpKTtcbiAgaWYgKHRPck51bGwgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihmYWlsdXJlTWVzc2FnZSk7XG4gIH1cbiAgcmV0dXJuIHRPck51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlVGV4dHVyZVVuaXQoZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgdGV4dHVyZVVuaXQ6IG51bWJlcikge1xuICBjb25zdCBtYXhUZXh0dXJlVW5pdCA9IGdsLk1BWF9DT01CSU5FRF9URVhUVVJFX0lNQUdFX1VOSVRTIC0gMTtcbiAgY29uc3QgZ2xUZXh0dXJlVW5pdCA9IHRleHR1cmVVbml0ICsgZ2wuVEVYVFVSRTA7XG4gIGlmIChnbFRleHR1cmVVbml0IDwgZ2wuVEVYVFVSRTAgfHwgZ2xUZXh0dXJlVW5pdCA+IG1heFRleHR1cmVVbml0KSB7XG4gICAgY29uc3QgdGV4dHVyZVVuaXRSYW5nZSA9IGBbZ2wuVEVYVFVSRTAsIGdsLlRFWFRVUkUke21heFRleHR1cmVVbml0fV1gO1xuICAgIHRocm93IG5ldyBFcnJvcihgdGV4dHVyZVVuaXQgbXVzdCBiZSBpbiAke3RleHR1cmVVbml0UmFuZ2V9LmApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXRjaERpbShzaGFwZTogbnVtYmVyW10sIGRpbXNUb1NraXAgPSAyKTogbnVtYmVyIHtcbiAgcmV0dXJuIHV0aWwuc2l6ZUZyb21TaGFwZShzaGFwZS5zbGljZSgwLCBzaGFwZS5sZW5ndGggLSBkaW1zVG9Ta2lwKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb3dzQ29scyhzaGFwZTogbnVtYmVyW10pOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgaWYgKHNoYXBlLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IEVycm9yKCdDYW5ub3QgZ2V0IHJvd3MgYW5kIGNvbHVtbnMgb2YgYW4gZW1wdHkgc2hhcGUgYXJyYXkuJyk7XG4gIH1cblxuICByZXR1cm4gW1xuICAgIHNoYXBlLmxlbmd0aCA+IDEgPyBzaGFwZVtzaGFwZS5sZW5ndGggLSAyXSA6IDEsIHNoYXBlW3NoYXBlLmxlbmd0aCAtIDFdXG4gIF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGFwZUFzM0Qoc2hhcGU6IG51bWJlcltdKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgbGV0IHNoYXBlQXMzRDogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gWzEsIDEsIDFdO1xuICBjb25zdCBpc1NjYWxhciA9IHNoYXBlLmxlbmd0aCA9PT0gMCB8fCAoc2hhcGUubGVuZ3RoID09PSAxICYmIHNoYXBlWzBdID09PSAxKTtcbiAgaWYgKCFpc1NjYWxhcikge1xuICAgIHNoYXBlQXMzRCA9XG4gICAgICAgIFtnZXRCYXRjaERpbShzaGFwZSksIC4uLmdldFJvd3NDb2xzKHNoYXBlKV0gYXMgW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICB9XG4gIHJldHVybiBzaGFwZUFzM0Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZXh0dXJlU2hhcGVGcm9tTG9naWNhbFNoYXBlKFxuICAgIGxvZ1NoYXBlOiBudW1iZXJbXSwgaXNQYWNrZWQgPSBmYWxzZSk6IFtudW1iZXIsIG51bWJlcl0ge1xuICBsZXQgbWF4VGV4U2l6ZSA9IGVudigpLmdldE51bWJlcignV0VCR0xfTUFYX1RFWFRVUkVfU0laRScpO1xuICBsZXQgbWF4U2l6ZUZvck5hcnJvd1RleCA9XG4gICAgICBlbnYoKS5nZXROdW1iZXIoJ1dFQkdMX01BWF9TSVpFX0ZPUl9OQVJST1dfVEVYVFVSRScpO1xuICBpZiAobWF4U2l6ZUZvck5hcnJvd1RleCA9PT0gSW5maW5pdHkgJiZcbiAgICAgIGVudigpLmdldEJvb2woJ1dFQkdMX0FVVE9fU1FVQVJJRllfTkFSUk9XX1RFWFRVUkVfU0hBUEUnKSkge1xuICAgIG1heFNpemVGb3JOYXJyb3dUZXggPSBtYXhUZXhTaXplIC8gMjtcbiAgfVxuXG4gIGlmIChpc1BhY2tlZCkge1xuICAgIG1heFRleFNpemUgPSBtYXhUZXhTaXplICogMjtcbiAgICBtYXhTaXplRm9yTmFycm93VGV4ID0gbWF4U2l6ZUZvck5hcnJvd1RleCAqIDI7XG5cbiAgICAvLyBUaGlzIGxvZ2ljIGVuc3VyZXMgd2UgYWNjdXJhdGVseSBjb3VudCB0aGUgbnVtYmVyIG9mIHBhY2tlZCB0ZXhlbHMgbmVlZGVkXG4gICAgLy8gdG8gYWNjb21tb2RhdGUgdGhlIHRlbnNvci4gV2UgY2FuIG9ubHkgcGFjayB2YWx1ZXMgaW4gdGhlIHNhbWUgdGV4ZWwgaWZcbiAgICAvLyB0aGV5IGFyZSBmcm9tIGFkamFjZW50IHBhaXJzIG9mIHJvd3MvY29scyB3aXRoaW4gdGhlIHNhbWUgYmF0Y2guIFNvIGlmIGFcbiAgICAvLyB0ZW5zb3IgaGFzIDMgcm93cywgd2UgcHJldGVuZCBpdCBoYXMgNCByb3dzIGluIG9yZGVyIHRvIGFjY291bnQgZm9yIHRoZVxuICAgIC8vIGZhY3QgdGhhdCB0aGUgdGV4ZWxzIGNvbnRhaW5pbmcgdGhlIHRoaXJkIHJvdyBhcmUgaGFsZiBlbXB0eS5cbiAgICBsb2dTaGFwZSA9IGxvZ1NoYXBlLm1hcChcbiAgICAgICAgKGQsIGkpID0+IGkgPj0gbG9nU2hhcGUubGVuZ3RoIC0gMiA/XG4gICAgICAgICAgICB1dGlsLm5lYXJlc3RMYXJnZXJFdmVuKGxvZ1NoYXBlW2ldKSA6XG4gICAgICAgICAgICBsb2dTaGFwZVtpXSk7XG5cbiAgICAvLyBQYWNrZWQgdGV4dHVyZSBoZWlnaHQgaXMgYXQgbGVhc3QgMiAodGhlIGNoYW5uZWwgaGVpZ2h0IG9mIGEgc2luZ2xlXG4gICAgLy8gdGV4ZWwpLlxuICAgIGlmIChsb2dTaGFwZS5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxvZ1NoYXBlID0gWzIsIGxvZ1NoYXBlWzBdXTtcbiAgICB9XG4gIH1cblxuICAvLyBJZiBsb2dpY2FsIHNoYXBlIGlzIDIsIHdlIGRvbid0IHNxdWVlemUsIHNpbmNlIHdlIHdhbnQgdG8gbWF0Y2ggcGh5c2ljYWwuXG4gIGlmIChsb2dTaGFwZS5sZW5ndGggIT09IDIpIHtcbiAgICBjb25zdCBzcXVlZXplUmVzdWx0ID0gdXRpbC5zcXVlZXplU2hhcGUobG9nU2hhcGUpO1xuICAgIGxvZ1NoYXBlID0gc3F1ZWV6ZVJlc3VsdC5uZXdTaGFwZTtcbiAgfVxuXG4gIGxldCBzaXplID0gdXRpbC5zaXplRnJvbVNoYXBlKGxvZ1NoYXBlKTtcbiAgbGV0IHRleHR1cmVTaGFwZTogW251bWJlciwgbnVtYmVyXSA9IG51bGw7XG4gIGlmIChsb2dTaGFwZS5sZW5ndGggPD0gMSAmJiBzaXplIDw9IG1heFRleFNpemUpIHtcbiAgICB0ZXh0dXJlU2hhcGUgPSBbMSwgc2l6ZV07XG4gIH0gZWxzZSBpZiAoXG4gICAgICBsb2dTaGFwZS5sZW5ndGggPT09IDIgJiYgbG9nU2hhcGVbMF0gPD0gbWF4VGV4U2l6ZSAmJlxuICAgICAgbG9nU2hhcGVbMV0gPD0gbWF4VGV4U2l6ZSkge1xuICAgIHRleHR1cmVTaGFwZSA9IGxvZ1NoYXBlIGFzIFtudW1iZXIsIG51bWJlcl07XG4gIH0gZWxzZSBpZiAoXG4gICAgICBsb2dTaGFwZS5sZW5ndGggPT09IDMgJiYgbG9nU2hhcGVbMF0gKiBsb2dTaGFwZVsxXSA8PSBtYXhUZXhTaXplICYmXG4gICAgICBsb2dTaGFwZVsyXSA8PSBtYXhUZXhTaXplKSB7XG4gICAgdGV4dHVyZVNoYXBlID0gW2xvZ1NoYXBlWzBdICogbG9nU2hhcGVbMV0sIGxvZ1NoYXBlWzJdXTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIGxvZ1NoYXBlLmxlbmd0aCA9PT0gMyAmJiBsb2dTaGFwZVswXSA8PSBtYXhUZXhTaXplICYmXG4gICAgICBsb2dTaGFwZVsxXSAqIGxvZ1NoYXBlWzJdIDw9IG1heFRleFNpemUpIHtcbiAgICB0ZXh0dXJlU2hhcGUgPSBbbG9nU2hhcGVbMF0sIGxvZ1NoYXBlWzFdICogbG9nU2hhcGVbMl1dO1xuICB9IGVsc2UgaWYgKFxuICAgICAgbG9nU2hhcGUubGVuZ3RoID09PSA0ICYmXG4gICAgICBsb2dTaGFwZVswXSAqIGxvZ1NoYXBlWzFdICogbG9nU2hhcGVbMl0gPD0gbWF4VGV4U2l6ZSAmJlxuICAgICAgbG9nU2hhcGVbM10gPD0gbWF4VGV4U2l6ZSkge1xuICAgIHRleHR1cmVTaGFwZSA9IFtsb2dTaGFwZVswXSAqIGxvZ1NoYXBlWzFdICogbG9nU2hhcGVbMl0sIGxvZ1NoYXBlWzNdXTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIGxvZ1NoYXBlLmxlbmd0aCA9PT0gNCAmJiBsb2dTaGFwZVswXSA8PSBtYXhUZXhTaXplICYmXG4gICAgICBsb2dTaGFwZVsxXSAqIGxvZ1NoYXBlWzJdICogbG9nU2hhcGVbM10gPD0gbWF4VGV4U2l6ZSkge1xuICAgIHRleHR1cmVTaGFwZSA9IFtsb2dTaGFwZVswXSwgbG9nU2hhcGVbMV0gKiBsb2dTaGFwZVsyXSAqIGxvZ1NoYXBlWzNdXTtcbiAgfVxuXG4gIC8vIHRydWUgaWYgb25lIGVkZ2UgbGVuZ3RoIGlzIDEgKDEgb3IgMiwgaWYgcGFja2VkKSwgd2hpbGUgYW5vdGhlciBlZGdlXG4gIC8vIGxlbmd0aCBleGNlZWRzIG1heFNpemVGb3JOYXJyb3dUZXguXG4gIGNvbnN0IGlzTG9uZ05hcnJvd1RleCA9IHRleHR1cmVTaGFwZSAhPSBudWxsICYmXG4gICAgICBNYXRoLm1heCguLi50ZXh0dXJlU2hhcGUpID4gbWF4U2l6ZUZvck5hcnJvd1RleCAmJlxuICAgICAgTWF0aC5taW4oLi4udGV4dHVyZVNoYXBlKSA8PSAoaXNQYWNrZWQgPyAyIDogMSkgJiZcbiAgICAgIE1hdGgubWluKC4uLnRleHR1cmVTaGFwZSkgPiAwO1xuXG4gIGlmICh0ZXh0dXJlU2hhcGUgPT0gbnVsbCB8fCBpc0xvbmdOYXJyb3dUZXgpIHtcbiAgICBpZiAoaXNQYWNrZWQpIHtcbiAgICAgIC8vIEZvciBwYWNrZWQgdGV4dHVyZXMgc2l6ZSBlcXVhbHMgdGhlIG51bWJlciBvZiBjaGFubmVscyByZXF1aXJlZCB0b1xuICAgICAgLy8gYWNjb21tb2RhdGUgdGhlIHRleHR1cmUgZGF0YS4gSG93ZXZlciBpbiBvcmRlciB0byBzcXVhcmlmeSBzdWNoIHRoYXRcbiAgICAgIC8vIGlubmVyIGRpbWVuc2lvbnMgc3RheSBldmVuLCB3ZSByZXdyaXRlIHNpemUgdG8gZXF1YWwgdGhlIG51bWJlciBvZlxuICAgICAgLy8gdGV4ZWxzLiBUaGVuIGluIHRoZSByZXR1cm4gc3RhdGVtZW50IHdlIHJlaHlkcmF0ZSB0aGUgc3F1YXJpZmllZFxuICAgICAgLy8gZGltZW5zaW9ucyB0byBjaGFubmVsIHVuaXRzLlxuXG4gICAgICBjb25zdCBiYXRjaERpbSA9IGdldEJhdGNoRGltKGxvZ1NoYXBlKTtcbiAgICAgIGxldCByb3dzID0gMiwgY29scyA9IDI7XG4gICAgICBpZiAobG9nU2hhcGUubGVuZ3RoKSB7XG4gICAgICAgIFtyb3dzLCBjb2xzXSA9IGdldFJvd3NDb2xzKGxvZ1NoYXBlKTtcbiAgICAgIH1cbiAgICAgIHNpemUgPSBiYXRjaERpbSAqIChyb3dzIC8gMikgKiAoY29scyAvIDIpO1xuICAgICAgdGV4dHVyZVNoYXBlID1cbiAgICAgICAgICB1dGlsLnNpemVUb1NxdWFyaXNoU2hhcGUoc2l6ZSkubWFwKGQgPT4gZCAqIDIpIGFzIFtudW1iZXIsIG51bWJlcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRleHR1cmVTaGFwZSA9IHV0aWwuc2l6ZVRvU3F1YXJpc2hTaGFwZShzaXplKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGV4dHVyZVNoYXBlO1xufVxuXG5mdW5jdGlvbiBpc0V2ZW4objogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBuICUgMiA9PT0gMDtcbn1cblxuLyoqXG4gKiBUaGlzIGRldGVybWluZXMgd2hldGhlciByZXNoYXBpbmcgYSBwYWNrZWQgdGV4dHVyZSByZXF1aXJlcyByZWFycmFuZ2luZ1xuICogdGhlIGRhdGEgd2l0aGluIHRoZSB0ZXh0dXJlLCBhc3N1bWluZyAyeDIgcGFja2luZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVzaGFwZUZyZWUoc2hhcGUxOiBudW1iZXJbXSwgc2hhcGUyOiBudW1iZXJbXSk6IGJvb2xlYW4ge1xuICBzaGFwZTEgPSBzaGFwZTEuc2xpY2UoLTIpO1xuICBzaGFwZTIgPSBzaGFwZTIuc2xpY2UoLTIpO1xuXG4gIGlmICh1dGlsLmFycmF5c0VxdWFsKHNoYXBlMSwgc2hhcGUyKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKCFzaGFwZTEubGVuZ3RoIHx8ICFzaGFwZTIubGVuZ3RoKSB7ICAvLyBPbmUgb2YgdGhlIHNoYXBlcyBpcyBhIHNjYWxhci5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChzaGFwZTFbMF0gPT09IDAgfHwgc2hhcGUxWzFdID09PSAwIHx8IHNoYXBlMlswXSA9PT0gMCB8fFxuICAgICAgc2hhcGUyWzFdID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAoc2hhcGUxLmxlbmd0aCAhPT0gc2hhcGUyLmxlbmd0aCkgeyAgLy8gT25lIG9mIHRoZSBzaGFwZXMgaXMgYSB2ZWN0b3IuXG4gICAgY29uc3Qgc2hhcGUxQ29scyA9IHNoYXBlMVtzaGFwZTEubGVuZ3RoIC0gMV07XG4gICAgY29uc3Qgc2hhcGUyQ29scyA9IHNoYXBlMltzaGFwZTIubGVuZ3RoIC0gMV07XG4gICAgaWYgKHNoYXBlMUNvbHMgPT09IHNoYXBlMkNvbHMpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChpc0V2ZW4oc2hhcGUxQ29scykgJiYgaXNFdmVuKHNoYXBlMkNvbHMpICYmXG4gICAgICAgIChzaGFwZTFbMF0gPT09IDEgfHwgc2hhcGUyWzBdID09PSAxKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBzaGFwZTFbMV0gPT09IHNoYXBlMlsxXSAmJiBpc0V2ZW4oc2hhcGUxWzBdKSAmJiBpc0V2ZW4oc2hhcGUyWzBdKTtcbn1cblxuLy8gV2UgY2FjaGUgd2ViZ2wgcGFyYW1zIGJlY2F1c2UgdGhlIGVudmlyb25tZW50IGdldHMgcmVzZXQgYmV0d2VlblxuLy8gdW5pdCB0ZXN0cyBhbmQgd2UgZG9uJ3Qgd2FudCB0byBjb25zdGFudGx5IHF1ZXJ5IHRoZSBXZWJHTENvbnRleHQgZm9yXG4vLyBNQVhfVEVYVFVSRV9TSVpFLlxubGV0IE1BWF9URVhUVVJFX1NJWkU6IG51bWJlcjtcbmxldCBNQVhfVEVYVFVSRVNfSU5fU0hBREVSOiBudW1iZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRXZWJHTE1heFRleHR1cmVTaXplKHdlYkdMVmVyc2lvbjogbnVtYmVyKTogbnVtYmVyIHtcbiAgaWYgKE1BWF9URVhUVVJFX1NJWkUgPT0gbnVsbCkge1xuICAgIGNvbnN0IGdsID0gZ2V0V2ViR0xDb250ZXh0KHdlYkdMVmVyc2lvbik7XG4gICAgTUFYX1RFWFRVUkVfU0laRSA9IGdsLmdldFBhcmFtZXRlcihnbC5NQVhfVEVYVFVSRV9TSVpFKTtcbiAgfVxuICByZXR1cm4gTUFYX1RFWFRVUkVfU0laRTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0TWF4VGV4dHVyZVNpemUoKSB7XG4gIE1BWF9URVhUVVJFX1NJWkUgPSBudWxsO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0TWF4VGV4dHVyZXNJblNoYWRlcigpIHtcbiAgTUFYX1RFWFRVUkVTX0lOX1NIQURFUiA9IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNYXhUZXh0dXJlc0luU2hhZGVyKHdlYkdMVmVyc2lvbjogbnVtYmVyKTogbnVtYmVyIHtcbiAgaWYgKE1BWF9URVhUVVJFU19JTl9TSEFERVIgPT0gbnVsbCkge1xuICAgIGNvbnN0IGdsID0gZ2V0V2ViR0xDb250ZXh0KHdlYkdMVmVyc2lvbik7XG4gICAgTUFYX1RFWFRVUkVTX0lOX1NIQURFUiA9IGdsLmdldFBhcmFtZXRlcihnbC5NQVhfVEVYVFVSRV9JTUFHRV9VTklUUyk7XG4gIH1cbiAgLy8gV2UgY2FwIGF0IDE2IHRvIGF2b2lkIHNwdXJpb3VzIHJ1bnRpbWUgXCJtZW1vcnkgZXhoYXVzdGVkXCIgZXJyb3IuXG4gIHJldHVybiBNYXRoLm1pbigxNiwgTUFYX1RFWFRVUkVTX0lOX1NIQURFUik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRXZWJHTERpc2pvaW50UXVlcnlUaW1lclZlcnNpb24od2ViR0xWZXJzaW9uOiBudW1iZXIpOlxuICAgIG51bWJlciB7XG4gIGlmICh3ZWJHTFZlcnNpb24gPT09IDApIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGxldCBxdWVyeVRpbWVyVmVyc2lvbjogbnVtYmVyO1xuICBjb25zdCBnbCA9IGdldFdlYkdMQ29udGV4dCh3ZWJHTFZlcnNpb24pO1xuXG4gIGlmIChoYXNFeHRlbnNpb24oZ2wsICdFWFRfZGlzam9pbnRfdGltZXJfcXVlcnlfd2ViZ2wyJykgJiZcbiAgICAgIHdlYkdMVmVyc2lvbiA9PT0gMikge1xuICAgIHF1ZXJ5VGltZXJWZXJzaW9uID0gMjtcbiAgfSBlbHNlIGlmIChoYXNFeHRlbnNpb24oZ2wsICdFWFRfZGlzam9pbnRfdGltZXJfcXVlcnknKSkge1xuICAgIHF1ZXJ5VGltZXJWZXJzaW9uID0gMTtcbiAgfSBlbHNlIHtcbiAgICBxdWVyeVRpbWVyVmVyc2lvbiA9IDA7XG4gIH1cbiAgcmV0dXJuIHF1ZXJ5VGltZXJWZXJzaW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzRXh0ZW5zaW9uKGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIGV4dGVuc2lvbk5hbWU6IHN0cmluZykge1xuICBjb25zdCBleHQgPSBnbC5nZXRFeHRlbnNpb24oZXh0ZW5zaW9uTmFtZSk7XG4gIHJldHVybiBleHQgIT0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2ViR0xWZXJzaW9uRW5hYmxlZCh3ZWJHTFZlcnNpb246IDF8Mikge1xuICB0cnkge1xuICAgIGNvbnN0IGdsID0gZ2V0V2ViR0xDb250ZXh0KHdlYkdMVmVyc2lvbik7XG4gICAgaWYgKGdsICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKCdFcnJvciB3aGVuIGdldHRpbmcgV2ViR0wgY29udGV4dDogJywgZSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FwYWJsZU9mUmVuZGVyaW5nVG9GbG9hdFRleHR1cmUod2ViR0xWZXJzaW9uOiBudW1iZXIpOlxuICAgIGJvb2xlYW4ge1xuICBpZiAod2ViR0xWZXJzaW9uID09PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgZ2wgPSBnZXRXZWJHTENvbnRleHQod2ViR0xWZXJzaW9uKTtcblxuICBpZiAod2ViR0xWZXJzaW9uID09PSAxKSB7XG4gICAgaWYgKCFoYXNFeHRlbnNpb24oZ2wsICdPRVNfdGV4dHVyZV9mbG9hdCcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICghaGFzRXh0ZW5zaW9uKGdsLCAnRVhUX2NvbG9yX2J1ZmZlcl9mbG9hdCcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaXNGcmFtZUJ1ZmZlckNvbXBsZXRlID0gY3JlYXRlRmxvYXRUZXh0dXJlQW5kQmluZFRvRnJhbWVidWZmZXIoZ2wpO1xuICByZXR1cm4gaXNGcmFtZUJ1ZmZlckNvbXBsZXRlO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHdlIGNhbiBkb3dubG9hZCB2YWx1ZXMgZnJvbSBhIGZsb2F0L2hhbGYtZmxvYXQgdGV4dHVyZS5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHBlcmZvcm1hbmNlIHJlYXNvbnMgd2UgdXNlIGJpbmRpbmcgYSB0ZXh0dXJlIHRvIGEgZnJhbWVidWZmZXJcbiAqIGFzIGEgcHJveHkgZm9yIGFiaWxpdHkgdG8gZG93bmxvYWQgZmxvYXQgdmFsdWVzIGxhdGVyIHVzaW5nIHJlYWRQaXhlbHMuIFRoZVxuICogdGV4dHVyZSBwYXJhbXMgb2YgdGhpcyB0ZXh0dXJlIHdpbGwgbm90IG1hdGNoIHRob3NlIGluIHJlYWRQaXhlbHMgZXhhY3RseVxuICogYnV0IGlmIHdlIGFyZSB1bmFibGUgdG8gYmluZCBzb21lIGtpbmQgb2YgZmxvYXQgdGV4dHVyZSB0byB0aGUgZnJhbWVCdWZmZXJcbiAqIHRoZW4gd2UgZGVmaW5pdGVseSB3aWxsIG5vdCBiZSBhYmxlIHRvIHJlYWQgZmxvYXQgdmFsdWVzIGZyb20gaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Rvd25sb2FkRmxvYXRUZXh0dXJlRW5hYmxlZCh3ZWJHTFZlcnNpb246IG51bWJlcik6IGJvb2xlYW4ge1xuICBpZiAod2ViR0xWZXJzaW9uID09PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgZ2wgPSBnZXRXZWJHTENvbnRleHQod2ViR0xWZXJzaW9uKTtcblxuICBpZiAod2ViR0xWZXJzaW9uID09PSAxKSB7XG4gICAgaWYgKCFoYXNFeHRlbnNpb24oZ2wsICdPRVNfdGV4dHVyZV9mbG9hdCcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaGFzRXh0ZW5zaW9uKGdsLCAnV0VCR0xfY29sb3JfYnVmZmVyX2Zsb2F0JykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGhhc0V4dGVuc2lvbihnbCwgJ0VYVF9jb2xvcl9idWZmZXJfZmxvYXQnKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUZsb2F0VGV4dHVyZUFuZEJpbmRUb0ZyYW1lYnVmZmVyKGdsKTtcbiAgICB9XG5cbiAgICBjb25zdCBDT0xPUl9CVUZGRVJfSEFMRl9GTE9BVCA9ICdFWFRfY29sb3JfYnVmZmVyX2hhbGZfZmxvYXQnO1xuICAgIGlmIChoYXNFeHRlbnNpb24oZ2wsIENPTE9SX0JVRkZFUl9IQUxGX0ZMT0FUKSkge1xuICAgICAgY29uc3QgdGV4dHVyZUhhbGZGbG9hdEV4dGVuc2lvbiA9XG4gICAgICAgICAgZ2wuZ2V0RXh0ZW5zaW9uKENPTE9SX0JVRkZFUl9IQUxGX0ZMT0FUKTtcbiAgICAgIHJldHVybiBjcmVhdGVIYWxmRmxvYXRUZXh0dXJlQW5kQmluZFRvRnJhbWVidWZmZXIoXG4gICAgICAgICAgZ2wsIHRleHR1cmVIYWxmRmxvYXRFeHRlbnNpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGlzRnJhbWVCdWZmZXJDb21wbGV0ZSA9IGNyZWF0ZUZsb2F0VGV4dHVyZUFuZEJpbmRUb0ZyYW1lYnVmZmVyKGdsKTtcbiAgcmV0dXJuIGlzRnJhbWVCdWZmZXJDb21wbGV0ZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRmxvYXRUZXh0dXJlQW5kQmluZFRvRnJhbWVidWZmZXIoZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCk6XG4gICAgYm9vbGVhbiB7XG4gIGNvbnN0IHRleENvbmZpZyA9IGdldFRleHR1cmVDb25maWcoZ2wpO1xuXG4gIGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG4gIGNvbnN0IHdpZHRoID0gMTtcbiAgY29uc3QgaGVpZ2h0ID0gMTtcbiAgZ2wudGV4SW1hZ2UyRChcbiAgICAgIGdsLlRFWFRVUkVfMkQsIDAsIHRleENvbmZpZy5pbnRlcm5hbEZvcm1hdEZsb2F0LCB3aWR0aCwgaGVpZ2h0LCAwLFxuICAgICAgdGV4Q29uZmlnLnRleHR1cmVGb3JtYXRGbG9hdCwgdGV4Q29uZmlnLnRleHR1cmVUeXBlRmxvYXQsIG51bGwpO1xuXG4gIGNvbnN0IGZyYW1lQnVmZmVyID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcbiAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmcmFtZUJ1ZmZlcik7XG4gIGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKFxuICAgICAgZ2wuRlJBTUVCVUZGRVIsIGdsLkNPTE9SX0FUVEFDSE1FTlQwLCBnbC5URVhUVVJFXzJELCB0ZXh0dXJlLCAwKTtcblxuICBjb25zdCBpc0ZyYW1lQnVmZmVyQ29tcGxldGUgPVxuICAgICAgZ2wuY2hlY2tGcmFtZWJ1ZmZlclN0YXR1cyhnbC5GUkFNRUJVRkZFUikgPT09IGdsLkZSQU1FQlVGRkVSX0NPTVBMRVRFO1xuXG4gIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuICBnbC5kZWxldGVUZXh0dXJlKHRleHR1cmUpO1xuICBnbC5kZWxldGVGcmFtZWJ1ZmZlcihmcmFtZUJ1ZmZlcik7XG5cbiAgcmV0dXJuIGlzRnJhbWVCdWZmZXJDb21wbGV0ZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSGFsZkZsb2F0VGV4dHVyZUFuZEJpbmRUb0ZyYW1lYnVmZmVyKFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCB0ZXh0dXJlSGFsZkZsb2F0RXh0ZW5zaW9uOiBhbnkpOiBib29sZWFuIHtcbiAgY29uc3QgdGV4Q29uZmlnID0gZ2V0VGV4dHVyZUNvbmZpZyhnbCwgdGV4dHVyZUhhbGZGbG9hdEV4dGVuc2lvbik7XG4gIGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG4gIGNvbnN0IHdpZHRoID0gMTtcbiAgY29uc3QgaGVpZ2h0ID0gMTtcbiAgZ2wudGV4SW1hZ2UyRChcbiAgICAgIGdsLlRFWFRVUkVfMkQsIDAsIHRleENvbmZpZy5pbnRlcm5hbEZvcm1hdEhhbGZGbG9hdCwgd2lkdGgsIGhlaWdodCwgMCxcbiAgICAgIHRleENvbmZpZy50ZXh0dXJlRm9ybWF0RmxvYXQsIHRleENvbmZpZy50ZXh0dXJlVHlwZUhhbGZGbG9hdCwgbnVsbCk7XG5cbiAgY29uc3QgZnJhbWVCdWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZyYW1lQnVmZmVyKTtcbiAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoXG4gICAgICBnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRleHR1cmUsIDApO1xuXG4gIGNvbnN0IGlzRnJhbWVCdWZmZXJDb21wbGV0ZSA9XG4gICAgICBnbC5jaGVja0ZyYW1lYnVmZmVyU3RhdHVzKGdsLkZSQU1FQlVGRkVSKSA9PT0gZ2wuRlJBTUVCVUZGRVJfQ09NUExFVEU7XG5cbiAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG4gIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG4gIGdsLmRlbGV0ZVRleHR1cmUodGV4dHVyZSk7XG4gIGdsLmRlbGV0ZUZyYW1lYnVmZmVyKGZyYW1lQnVmZmVyKTtcblxuICByZXR1cm4gaXNGcmFtZUJ1ZmZlckNvbXBsZXRlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJHTEZlbmNlRW5hYmxlZCh3ZWJHTFZlcnNpb246IG51bWJlcikge1xuICBpZiAod2ViR0xWZXJzaW9uICE9PSAyKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IGdsID0gZ2V0V2ViR0xDb250ZXh0KHdlYkdMVmVyc2lvbik7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICBjb25zdCBpc0VuYWJsZWQgPSAoZ2wgYXMgYW55KS5mZW5jZVN5bmMgIT0gbnVsbDtcbiAgcmV0dXJuIGlzRW5hYmxlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdENvbXBsZXgoXG4gICAgdGVuc29yOiBUZW5zb3JJbmZvfFRlbnNvckluZm9bXSwgb3BOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHRlbnNvcikpIHtcbiAgICB0ZW5zb3IgPSBbdGVuc29yXTtcbiAgfVxuICB0ZW5zb3IuZm9yRWFjaCh0ID0+IHtcbiAgICBpZiAodCAhPSBudWxsKSB7XG4gICAgICB1dGlsLmFzc2VydChcbiAgICAgICAgICB0LmR0eXBlICE9PSAnY29tcGxleDY0JyxcbiAgICAgICAgICAoKSA9PiBgJHtvcE5hbWV9IGRvZXMgbm90IHN1cHBvcnQgY29tcGxleDY0IHRlbnNvcnMgYCArXG4gICAgICAgICAgICAgICdpbiB0aGUgV2ViR0wgYmFja2VuZC4nKTtcbiAgICB9XG4gIH0pO1xufVxuIl19