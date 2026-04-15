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
import { getWebGLContext, setWebGLContext } from './canvas_util';
import * as gpgpu_util from './gpgpu_util';
import * as tex_util from './tex_util';
import * as webgl_util from './webgl_util';
export class GPGPUContext {
    constructor(gl) {
        this.outputTexture = null;
        this.program = null;
        this.disposed = false;
        this.itemsToPoll = [];
        const glVersion = env().getNumber('WEBGL_VERSION');
        if (gl != null) {
            this.gl = gl;
            setWebGLContext(glVersion, gl);
        }
        else {
            this.gl = getWebGLContext(glVersion);
        }
        gl = this.gl;
        if (env().getNumber('WEBGL_VERSION') === 2) {
            const gl2 = gl;
            this.createVertexArray = () => {
                return webgl_util.callAndCheck(gl2, () => gl2.createVertexArray());
            };
            this.bindVertexArray = (vao) => {
                return webgl_util.callAndCheck(gl2, () => gl2.bindVertexArray(vao));
            };
            this.deleteVertexArray = (vao) => {
                return webgl_util.callAndCheck(gl2, () => gl2.deleteVertexArray(vao));
            };
            this.getVertexArray = () => {
                return webgl_util.callAndCheck(gl2, () => gl2.getParameter(gl2.VERTEX_ARRAY_BINDING));
            };
        }
        else if (gl != null) {
            const ext = gl.getExtension('OES_vertex_array_object');
            if (ext == null) {
                throw new Error('All WebGL1 implementations are expected to offer' +
                    ' OES_vertex_array_object.');
            }
            this.createVertexArray = () => {
                return webgl_util.callAndCheck(gl, () => ext.createVertexArrayOES());
            };
            this.bindVertexArray = (vao) => {
                return webgl_util.callAndCheck(gl, () => ext.bindVertexArrayOES(vao));
            };
            this.deleteVertexArray = (vao) => {
                return webgl_util.callAndCheck(gl, () => ext.deleteVertexArrayOES(vao));
            };
            this.getVertexArray = () => {
                return webgl_util.callAndCheck(gl, () => gl.getParameter(ext.VERTEX_ARRAY_BINDING_OES));
            };
        }
        // WebGL 2.0 enables texture floats without an extension.
        let COLOR_BUFFER_FLOAT = 'WEBGL_color_buffer_float';
        const COLOR_BUFFER_HALF_FLOAT = 'EXT_color_buffer_half_float';
        this.parallelCompilationExtension =
            this.gl.getExtension('KHR_parallel_shader_compile');
        if (env().getNumber('WEBGL_VERSION') === 1) {
            const TEXTURE_FLOAT = 'OES_texture_float';
            const TEXTURE_HALF_FLOAT = 'OES_texture_half_float';
            this.textureFloatExtension =
                webgl_util.getExtensionOrThrow(this.gl, TEXTURE_FLOAT);
            if (webgl_util.hasExtension(this.gl, TEXTURE_HALF_FLOAT)) {
                this.textureHalfFloatExtension =
                    webgl_util.getExtensionOrThrow(this.gl, TEXTURE_HALF_FLOAT);
            }
            else if (env().get('WEBGL_FORCE_F16_TEXTURES')) {
                throw new Error('GL context does not support half float textures, yet the ' +
                    'environment flag WEBGL_FORCE_F16_TEXTURES is set to true.');
            }
            this.colorBufferFloatExtension = this.gl.getExtension(COLOR_BUFFER_FLOAT);
            if (webgl_util.hasExtension(this.gl, COLOR_BUFFER_HALF_FLOAT)) {
                this.colorBufferHalfFloatExtension =
                    webgl_util.getExtensionOrThrow(this.gl, COLOR_BUFFER_HALF_FLOAT);
            }
            else if (env().get('WEBGL_FORCE_F16_TEXTURES')) {
                throw new Error('GL context does not support color renderable half floats, yet ' +
                    'the environment flag WEBGL_FORCE_F16_TEXTURES is set to true.');
            }
        }
        else {
            COLOR_BUFFER_FLOAT = 'EXT_color_buffer_float';
            if (webgl_util.hasExtension(this.gl, COLOR_BUFFER_FLOAT)) {
                this.colorBufferFloatExtension =
                    this.gl.getExtension(COLOR_BUFFER_FLOAT);
            }
            else if (webgl_util.hasExtension(this.gl, COLOR_BUFFER_HALF_FLOAT)) {
                this.colorBufferHalfFloatExtension =
                    this.gl.getExtension(COLOR_BUFFER_HALF_FLOAT);
            }
            else {
                throw new Error('GL context does not support color renderable floats');
            }
        }
        this.vertexBuffer = gpgpu_util.createVertexBuffer(this.gl);
        this.indexBuffer = gpgpu_util.createIndexBuffer(this.gl);
        this.framebuffer = webgl_util.createFramebuffer(this.gl);
        this.textureConfig =
            tex_util.getTextureConfig(this.gl, this.textureHalfFloatExtension);
    }
    get debug() {
        return env().getBool('DEBUG');
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        if (this.program != null) {
            console.warn('Disposing a GPGPUContext that still has a bound WebGLProgram.' +
                ' This is probably a resource leak, delete the program with ' +
                'GPGPUContext.deleteProgram before disposing.');
        }
        if (this.outputTexture != null) {
            console.warn('Disposing a GPGPUContext that still has a bound output matrix ' +
                'texture.  This is probably a resource leak, delete the output ' +
                'matrix texture with GPGPUContext.deleteMatrixTexture before ' +
                'disposing.');
        }
        const gl = this.gl;
        webgl_util.callAndCheck(gl, () => gl.finish());
        webgl_util.callAndCheck(gl, () => gl.bindFramebuffer(gl.FRAMEBUFFER, null));
        webgl_util.callAndCheck(gl, () => gl.deleteFramebuffer(this.framebuffer));
        webgl_util.callAndCheck(gl, () => gl.bindBuffer(gl.ARRAY_BUFFER, null));
        webgl_util.callAndCheck(gl, () => gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null));
        webgl_util.callAndCheck(gl, () => gl.deleteBuffer(this.indexBuffer));
        this.disposed = true;
    }
    createFloat32MatrixTexture(rows, columns) {
        this.throwIfDisposed();
        return gpgpu_util.createFloat32MatrixTexture(this.gl, rows, columns, this.textureConfig);
    }
    createFloat16MatrixTexture(rows, columns) {
        this.throwIfDisposed();
        return gpgpu_util.createFloat16MatrixTexture(this.gl, rows, columns, this.textureConfig);
    }
    createUnsignedBytesMatrixTexture(rows, columns) {
        this.throwIfDisposed();
        return gpgpu_util.createUnsignedBytesMatrixTexture(this.gl, rows, columns, this.textureConfig);
    }
    uploadPixelDataToTexture(texture, pixels) {
        this.throwIfDisposed();
        gpgpu_util.uploadPixelDataToTexture(this.gl, texture, pixels);
    }
    uploadDenseMatrixToTexture(texture, width, height, data) {
        this.throwIfDisposed();
        gpgpu_util.uploadDenseMatrixToTexture(this.gl, texture, width, height, data, this.textureConfig);
    }
    createFloat16PackedMatrixTexture(rows, columns) {
        this.throwIfDisposed();
        return gpgpu_util.createFloat16PackedMatrixTexture(this.gl, rows, columns, this.textureConfig);
    }
    createPackedMatrixTexture(rows, columns) {
        this.throwIfDisposed();
        return gpgpu_util.createPackedMatrixTexture(this.gl, rows, columns, this.textureConfig);
    }
    deleteMatrixTexture(texture) {
        this.throwIfDisposed();
        if (this.outputTexture === texture) {
            webgl_util.unbindColorTextureFromFramebuffer(this.gl, this.framebuffer);
            this.outputTexture = null;
        }
        webgl_util.callAndCheck(this.gl, () => this.gl.deleteTexture(texture));
    }
    downloadByteEncodedFloatMatrixFromOutputTexture(texture, rows, columns) {
        return this.downloadMatrixDriver(texture, () => gpgpu_util.downloadByteEncodedFloatMatrixFromOutputTexture(this.gl, rows, columns, this.textureConfig));
    }
    downloadPackedMatrixFromBuffer(buffer, batch, rows, columns, physicalRows, physicalCols) {
        return gpgpu_util.downloadPackedMatrixFromBuffer(this.gl, buffer, batch, rows, columns, physicalRows, physicalCols, this.textureConfig);
    }
    downloadFloat32MatrixFromBuffer(buffer, size) {
        return gpgpu_util.downloadFloat32MatrixFromBuffer(this.gl, buffer, size);
    }
    createBufferFromTexture(texture, rows, columns) {
        this.bindTextureToFrameBuffer(texture);
        const result = gpgpu_util.createBufferFromOutputTexture(this.gl, rows, columns, this.textureConfig);
        this.unbindTextureToFrameBuffer();
        return result;
    }
    createAndWaitForFence() {
        const fenceContext = this.createFence(this.gl);
        return this.pollFence(fenceContext);
    }
    createFence(gl) {
        let query;
        let isFencePassed;
        if (env().getBool('WEBGL_FENCE_API_ENABLED')) {
            const gl2 = gl;
            const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl.flush();
            isFencePassed = () => {
                const status = gl2.clientWaitSync(sync, 0, 0);
                return status === gl2.ALREADY_SIGNALED ||
                    status === gl2.CONDITION_SATISFIED;
            };
            query = sync;
        }
        else if (env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION') > 0) {
            query = this.beginQuery();
            this.endQuery();
            isFencePassed = () => this.isQueryAvailable(query, env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION'));
        }
        else {
            // If we have no way to fence, return true immediately. This will fire in
            // WebGL 1.0 when there is no disjoint query timer. In this case, because
            // the fence passes immediately, we'll immediately ask for a download of
            // the texture, which will cause the UI thread to hang.
            isFencePassed = () => true;
        }
        return { query, isFencePassed };
    }
    downloadMatrixFromPackedTexture(texture, physicalRows, physicalCols) {
        return this.downloadMatrixDriver(texture, () => gpgpu_util.downloadMatrixFromPackedOutputTexture(this.gl, physicalRows, physicalCols));
    }
    createProgram(fragmentShader) {
        this.throwIfDisposed();
        const gl = this.gl;
        if (this.vertexShader == null) {
            this.vertexShader = gpgpu_util.createVertexShader(gl);
        }
        const program = webgl_util.createProgram(gl);
        webgl_util.callAndCheck(gl, () => gl.attachShader(program, this.vertexShader));
        webgl_util.callAndCheck(gl, () => gl.attachShader(program, fragmentShader));
        webgl_util.linkProgram(gl, program);
        const program2 = Object.assign(program, { vao: this.createVertexArray() });
        if (this.debug) {
            webgl_util.validateProgram(gl, program2);
        }
        return program2;
    }
    buildVao(program) {
        this.setProgram(program);
        this.bindVertexArray(program.vao);
        const gl = this.gl;
        // Bind index buffer, and vertex buffers based on program attrib
        // locations.
        webgl_util.callAndCheck(gl, () => gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer));
        gpgpu_util.bindVertexProgramAttributeStreams(gl, program, this.vertexBuffer);
    }
    deleteProgram(program) {
        this.throwIfDisposed();
        if (program === this.program) {
            this.program = null;
        }
        if (program != null) {
            webgl_util.callAndCheck(this.gl, () => this.gl.deleteProgram(program));
            this.deleteVertexArray(program.vao);
        }
    }
    setProgram(program) {
        this.throwIfDisposed();
        this.program = program;
        if (this.program != null) {
            if (this.debug) {
                webgl_util.validateProgram(this.gl, this.program);
            }
        }
        webgl_util.callAndCheck(this.gl, () => this.gl.useProgram(program));
    }
    getUniformLocation(program, uniformName, shouldThrow = true) {
        this.throwIfDisposed();
        if (shouldThrow) {
            return webgl_util.getProgramUniformLocationOrThrow(this.gl, program, uniformName);
        }
        else {
            return webgl_util.getProgramUniformLocation(this.gl, program, uniformName);
        }
    }
    getAttributeLocation(program, attribute) {
        this.throwIfDisposed();
        return webgl_util.callAndCheck(this.gl, () => this.gl.getAttribLocation(program, attribute));
    }
    getUniformLocationNoThrow(program, uniformName) {
        this.throwIfDisposed();
        return this.gl.getUniformLocation(program, uniformName);
    }
    setInputMatrixTexture(inputMatrixTexture, uniformLocation, textureUnit) {
        this.throwIfDisposed();
        this.throwIfNoProgram();
        webgl_util.bindTextureToProgramUniformSampler(this.gl, inputMatrixTexture, uniformLocation, textureUnit);
    }
    setOutputMatrixTexture(outputMatrixTexture, rows, columns) {
        this.setOutputMatrixTextureDriver(outputMatrixTexture, columns, rows);
    }
    setOutputPackedMatrixTexture(outputPackedMatrixTexture, rows, columns) {
        this.throwIfDisposed();
        const [width, height] = tex_util.getPackedMatrixTextureShapeWidthHeight(rows, columns);
        this.setOutputMatrixTextureDriver(outputPackedMatrixTexture, width, height);
    }
    setOutputMatrixWriteRegion(startRow, numRows, startColumn, numColumns) {
        this.setOutputMatrixWriteRegionDriver(startColumn, startRow, numColumns, numRows);
    }
    setOutputPackedMatrixWriteRegion(startRow, numRows, startColumn, numColumns) {
        throw new Error('setOutputPackedMatrixWriteRegion not implemented.');
    }
    debugValidate() {
        if (this.program != null) {
            webgl_util.validateProgram(this.gl, this.program);
        }
        webgl_util.validateFramebuffer(this.gl);
    }
    executeProgram() {
        this.throwIfDisposed();
        this.throwIfNoProgram();
        const gl = this.gl;
        if (this.debug) {
            const boundVao = this.getVertexArray();
            console.assert(boundVao === this.program.vao, 'VAO changed between setProgram and executeProgram!');
            this.debugValidate();
        }
        webgl_util.callAndCheck(gl, () => gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0));
    }
    blockUntilAllProgramsCompleted() {
        this.throwIfDisposed();
        webgl_util.callAndCheck(this.gl, () => this.gl.finish());
    }
    getQueryTimerExtension() {
        if (this.disjointQueryTimerExtension == null) {
            this.disjointQueryTimerExtension =
                webgl_util.getExtensionOrThrow(this.gl, env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION') === 2 ?
                    'EXT_disjoint_timer_query_webgl2' :
                    'EXT_disjoint_timer_query');
        }
        return this.disjointQueryTimerExtension;
    }
    getQueryTimerExtensionWebGL2() {
        return this.getQueryTimerExtension();
    }
    getQueryTimerExtensionWebGL1() {
        return this.getQueryTimerExtension();
    }
    beginQuery() {
        if (env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION') === 2) {
            const gl2 = this.gl;
            const ext = this.getQueryTimerExtensionWebGL2();
            const query = gl2.createQuery();
            gl2.beginQuery(ext.TIME_ELAPSED_EXT, query);
            return query;
        }
        const ext = this.getQueryTimerExtensionWebGL1();
        const query = ext.createQueryEXT();
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        return query;
    }
    endQuery() {
        if (env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION') === 2) {
            const gl2 = this.gl;
            const ext = this.getQueryTimerExtensionWebGL2();
            gl2.endQuery(ext.TIME_ELAPSED_EXT);
            return;
        }
        const ext = this.getQueryTimerExtensionWebGL1();
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
    }
    async waitForQueryAndGetTime(query) {
        await util.repeatedTry(() => this.disposed || // while testing contexts are created / disposed
            // in rapid succession, so without this check we
            // may poll for the query timer indefinitely
            this.isQueryAvailable(query, env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION')));
        return this.getQueryTime(query, env().getNumber('WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION'));
    }
    getQueryTime(query, queryTimerVersion) {
        if (queryTimerVersion === 0) {
            return null;
        }
        if (queryTimerVersion === 2) {
            const gl2 = this.gl;
            const timeElapsedNanos = gl2.getQueryParameter(query, gl2.QUERY_RESULT);
            // Return milliseconds.
            return timeElapsedNanos / 1000000;
        }
        else {
            const ext = this.getQueryTimerExtensionWebGL1();
            const timeElapsedNanos = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
            // Return milliseconds.
            return timeElapsedNanos / 1000000;
        }
    }
    isQueryAvailable(query, queryTimerVersion) {
        if (queryTimerVersion === 0) {
            return true;
        }
        if (queryTimerVersion === 2) {
            const gl2 = this.gl;
            const ext = this.getQueryTimerExtensionWebGL2();
            const available = gl2.getQueryParameter(query, gl2.QUERY_RESULT_AVAILABLE);
            if (this.disjoint == null) {
                this.disjoint = this.gl.getParameter(ext.GPU_DISJOINT_EXT);
            }
            return available && !this.disjoint;
        }
        else {
            const ext = this.getQueryTimerExtensionWebGL1();
            const available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
            if (this.disjoint == null) {
                this.disjoint = this.gl.getParameter(ext.GPU_DISJOINT_EXT);
            }
            return available && !this.disjoint;
        }
    }
    pollFence(fenceContext) {
        return new Promise(resolve => {
            this.addItemToPoll(() => fenceContext.isFencePassed(), () => resolve());
        });
    }
    pollItems() {
        // Find the last query that has finished.
        const index = linearSearchLastTrue(this.itemsToPoll.map(x => x.isDoneFn));
        for (let i = 0; i <= index; ++i) {
            const { resolveFn } = this.itemsToPoll[i];
            resolveFn();
        }
        this.itemsToPoll = this.itemsToPoll.slice(index + 1);
    }
    addItemToPoll(isDoneFn, resolveFn) {
        this.itemsToPoll.push({ isDoneFn, resolveFn });
        if (this.itemsToPoll.length > 1) {
            // We already have a running loop that polls.
            return;
        }
        // Start a new loop that polls.
        let scheduleFn = undefined;
        if ('setTimeoutCustom' in env().platform) {
            scheduleFn = env().platform.setTimeoutCustom.bind(env().platform);
        }
        util.repeatedTry(() => {
            this.pollItems();
            // End the loop if no more items to poll.
            return this.itemsToPoll.length === 0;
        }, () => 0, null, scheduleFn);
    }
    bindTextureToFrameBuffer(texture) {
        this.throwIfDisposed();
        webgl_util.bindColorTextureToFramebuffer(this.gl, texture, this.framebuffer);
        if (this.debug) {
            webgl_util.validateFramebuffer(this.gl);
        }
    }
    unbindTextureToFrameBuffer() {
        if (this.outputTexture != null) {
            webgl_util.bindColorTextureToFramebuffer(this.gl, this.outputTexture, this.framebuffer);
            if (this.debug) {
                webgl_util.validateFramebuffer(this.gl);
            }
        }
        else {
            webgl_util.unbindColorTextureFromFramebuffer(this.gl, this.framebuffer);
        }
    }
    downloadMatrixDriver(texture, downloadAndDecode) {
        this.bindTextureToFrameBuffer(texture);
        const result = downloadAndDecode();
        this.unbindTextureToFrameBuffer();
        return result;
    }
    setOutputMatrixTextureDriver(outputMatrixTextureMaybePacked, width, height) {
        this.throwIfDisposed();
        const gl = this.gl;
        webgl_util.bindColorTextureToFramebuffer(gl, outputMatrixTextureMaybePacked, this.framebuffer);
        if (this.debug) {
            webgl_util.validateFramebuffer(gl);
        }
        this.outputTexture = outputMatrixTextureMaybePacked;
        webgl_util.callAndCheck(gl, () => gl.viewport(0, 0, width, height));
        webgl_util.callAndCheck(gl, () => gl.scissor(0, 0, width, height));
    }
    setOutputMatrixWriteRegionDriver(x, y, width, height) {
        this.throwIfDisposed();
        webgl_util.callAndCheck(this.gl, () => this.gl.scissor(x, y, width, height));
    }
    throwIfDisposed() {
        if (this.disposed) {
            throw new Error('Attempted to use disposed GPGPUContext.');
        }
    }
    throwIfNoProgram() {
        if (this.program == null) {
            throw new Error('No GPU program is currently set.');
        }
    }
}
/**
 * Finds the index of the last true element using linear search.
 * Note: We can't do binary search because Chrome expects us to explicitly
 * test all fences before download:
 * https://github.com/tensorflow/tfjs/issues/1145
 */
export function linearSearchLastTrue(arr) {
    let i = 0;
    for (; i < arr.length; ++i) {
        const isDone = arr[i]();
        if (!isDone) {
            break;
        }
    }
    return i - 1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3BncHVfY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RmanMtYmFja2VuZC13ZWJnbC9zcmMvZ3BncHVfY29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsR0FBRyxFQUF5QixJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUV2RSxPQUFPLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUMvRCxPQUFPLEtBQUssVUFBVSxNQUFNLGNBQWMsQ0FBQztBQUMzQyxPQUFPLEtBQUssUUFBUSxNQUFNLFlBQVksQ0FBQztBQUd2QyxPQUFPLEtBQUssVUFBVSxNQUFNLGNBQWMsQ0FBQztBQWEzQyxNQUFNLE9BQU8sWUFBWTtJQXdCdkIsWUFBWSxFQUEwQjtRQVp0QyxrQkFBYSxHQUFzQixJQUFJLENBQUM7UUFDeEMsWUFBTyxHQUE2QixJQUFJLENBQUM7UUFDakMsYUFBUSxHQUFHLEtBQUssQ0FBQztRQThoQmpCLGdCQUFXLEdBQWUsRUFBRSxDQUFDO1FBbmhCbkMsTUFBTSxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ25ELElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtZQUNkLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ2IsZUFBZSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoQzthQUFNO1lBQ0wsSUFBSSxDQUFDLEVBQUUsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDdEM7UUFDRCxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUViLElBQUksR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMxQyxNQUFNLEdBQUcsR0FBRyxFQUE0QixDQUFDO1lBQ3pD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LENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge2VudiwgUGl4ZWxEYXRhLCBUeXBlZEFycmF5LCB1dGlsfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQge2dldFdlYkdMQ29udGV4dCwgc2V0V2ViR0xDb250ZXh0fSBmcm9tICcuL2NhbnZhc191dGlsJztcbmltcG9ydCAqIGFzIGdwZ3B1X3V0aWwgZnJvbSAnLi9ncGdwdV91dGlsJztcbmltcG9ydCAqIGFzIHRleF91dGlsIGZyb20gJy4vdGV4X3V0aWwnO1xuaW1wb3J0IHtUZXh0dXJlLCBUZXh0dXJlQ29uZmlnfSBmcm9tICcuL3RleF91dGlsJztcbmltcG9ydCB7V2ViR0wxRGlzam9pbnRRdWVyeVRpbWVyRXh0ZW5zaW9uLCBXZWJHTDJEaXNqb2ludFF1ZXJ5VGltZXJFeHRlbnNpb24sIFdlYkdMUGFyYWxsZWxDb21waWxhdGlvbkV4dGVuc2lvbn0gZnJvbSAnLi93ZWJnbF90eXBlcyc7XG5pbXBvcnQgKiBhcyB3ZWJnbF91dGlsIGZyb20gJy4vd2ViZ2xfdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmVuY2VDb250ZXh0IHtcbiAgcXVlcnk6IFdlYkdMUXVlcnl8V2ViR0xTeW5jO1xuICBpc0ZlbmNlUGFzc2VkKCk6IGJvb2xlYW47XG59XG5cbnR5cGUgV2ViR0xWYW8gPSBXZWJHTFZlcnRleEFycmF5T2JqZWN0fFdlYkdMVmVydGV4QXJyYXlPYmplY3RPRVM7XG5cbmV4cG9ydCBpbnRlcmZhY2UgR1BHUFVDb250ZXh0UHJvZ3JhbSBleHRlbmRzIFdlYkdMUHJvZ3JhbSB7XG4gIHZhbzogV2ViR0xWYW87XG59XG5cbmV4cG9ydCBjbGFzcyBHUEdQVUNvbnRleHQge1xuICBnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0O1xuICB0ZXh0dXJlRmxvYXRFeHRlbnNpb246IHt9O1xuICB0ZXh0dXJlSGFsZkZsb2F0RXh0ZW5zaW9uOiB7fTtcbiAgY29sb3JCdWZmZXJGbG9hdEV4dGVuc2lvbjoge307XG4gIGNvbG9yQnVmZmVySGFsZkZsb2F0RXh0ZW5zaW9uOiB7fTtcbiAgZGlzam9pbnRRdWVyeVRpbWVyRXh0ZW5zaW9uOiBXZWJHTDJEaXNqb2ludFF1ZXJ5VGltZXJFeHRlbnNpb258XG4gICAgICBXZWJHTDFEaXNqb2ludFF1ZXJ5VGltZXJFeHRlbnNpb247XG4gIHBhcmFsbGVsQ29tcGlsYXRpb25FeHRlbnNpb246IFdlYkdMUGFyYWxsZWxDb21waWxhdGlvbkV4dGVuc2lvbjtcbiAgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcjtcbiAgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyO1xuICBmcmFtZWJ1ZmZlcjogV2ViR0xGcmFtZWJ1ZmZlcjtcbiAgb3V0cHV0VGV4dHVyZTogV2ViR0xUZXh0dXJlfG51bGwgPSBudWxsO1xuICBwcm9ncmFtOiBHUEdQVUNvbnRleHRQcm9ncmFtfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgZGlzam9pbnQ6IGJvb2xlYW47XG4gIHByaXZhdGUgdmVydGV4U2hhZGVyOiBXZWJHTFNoYWRlcjtcbiAgdGV4dHVyZUNvbmZpZzogVGV4dHVyZUNvbmZpZztcblxuICBjcmVhdGVWZXJ0ZXhBcnJheTogKCkgPT4gV2ViR0xWYW8gfCBudWxsO1xuICBiaW5kVmVydGV4QXJyYXk6ICh2YW86IFdlYkdMVmFvfG51bGwpID0+IHZvaWQ7XG4gIGRlbGV0ZVZlcnRleEFycmF5OiAodmFvOiBXZWJHTFZhb3xudWxsKSA9PiB2b2lkO1xuICBnZXRWZXJ0ZXhBcnJheTogKCkgPT4gV2ViR0xWYW8gfCBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKGdsPzogV2ViR0xSZW5kZXJpbmdDb250ZXh0KSB7XG4gICAgY29uc3QgZ2xWZXJzaW9uID0gZW52KCkuZ2V0TnVtYmVyKCdXRUJHTF9WRVJTSU9OJyk7XG4gICAgaWYgKGdsICE9IG51bGwpIHtcbiAgICAgIHRoaXMuZ2wgPSBnbDtcbiAgICAgIHNldFdlYkdMQ29udGV4dChnbFZlcnNpb24sIGdsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5nbCA9IGdldFdlYkdMQ29udGV4dChnbFZlcnNpb24pO1xuICAgIH1cbiAgICBnbCA9IHRoaXMuZ2w7XG5cbiAgICBpZiAoZW52KCkuZ2V0TnVtYmVyKCdXRUJHTF9WRVJTSU9OJykgPT09IDIpIHtcbiAgICAgIGNvbnN0IGdsMiA9IGdsIGFzIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQ7XG4gICAgICB0aGlzLmNyZWF0ZVZlcnRleEFycmF5ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soZ2wyLCAoKSA9PiBnbDIuY3JlYXRlVmVydGV4QXJyYXkoKSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5iaW5kVmVydGV4QXJyYXkgPSAodmFvOiBXZWJHTFZhb3xudWxsKSA9PiB7XG4gICAgICAgIHJldHVybiB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhcbiAgICAgICAgICAgIGdsMiwgKCkgPT4gZ2wyLmJpbmRWZXJ0ZXhBcnJheSh2YW8gYXMgV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCkpO1xuICAgICAgfTtcbiAgICAgIHRoaXMuZGVsZXRlVmVydGV4QXJyYXkgPSAodmFvOiBXZWJHTFZhb3xudWxsKSA9PiB7XG4gICAgICAgIHJldHVybiB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhcbiAgICAgICAgICAgIGdsMiwgKCkgPT4gZ2wyLmRlbGV0ZVZlcnRleEFycmF5KHZhbyBhcyBXZWJHTFZlcnRleEFycmF5T2JqZWN0KSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5nZXRWZXJ0ZXhBcnJheSA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKFxuICAgICAgICAgICAgZ2wyLCAoKSA9PiBnbDIuZ2V0UGFyYW1ldGVyKGdsMi5WRVJURVhfQVJSQVlfQklORElORykpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGdsICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IGV4dCA9IGdsLmdldEV4dGVuc2lvbignT0VTX3ZlcnRleF9hcnJheV9vYmplY3QnKTtcbiAgICAgIGlmIChleHQgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnQWxsIFdlYkdMMSBpbXBsZW1lbnRhdGlvbnMgYXJlIGV4cGVjdGVkIHRvIG9mZmVyJyArXG4gICAgICAgICAgICAnIE9FU192ZXJ0ZXhfYXJyYXlfb2JqZWN0LicpO1xuICAgICAgfVxuICAgICAgdGhpcy5jcmVhdGVWZXJ0ZXhBcnJheSA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBleHQuY3JlYXRlVmVydGV4QXJyYXlPRVMoKSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5iaW5kVmVydGV4QXJyYXkgPSAodmFvOiBXZWJHTFZhb3xudWxsKSA9PiB7XG4gICAgICAgIHJldHVybiB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhcbiAgICAgICAgICAgIGdsLCAoKSA9PiBleHQuYmluZFZlcnRleEFycmF5T0VTKHZhbyBhcyBXZWJHTFZlcnRleEFycmF5T2JqZWN0T0VTKSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5kZWxldGVWZXJ0ZXhBcnJheSA9ICh2YW86IFdlYkdMVmFvfG51bGwpID0+IHtcbiAgICAgICAgcmV0dXJuIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKFxuICAgICAgICAgICAgZ2wsXG4gICAgICAgICAgICAoKSA9PiBleHQuZGVsZXRlVmVydGV4QXJyYXlPRVModmFvIGFzIFdlYkdMVmVydGV4QXJyYXlPYmplY3RPRVMpKTtcbiAgICAgIH07XG4gICAgICB0aGlzLmdldFZlcnRleEFycmF5ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soXG4gICAgICAgICAgICBnbCwgKCkgPT4gZ2wuZ2V0UGFyYW1ldGVyKGV4dC5WRVJURVhfQVJSQVlfQklORElOR19PRVMpKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gV2ViR0wgMi4wIGVuYWJsZXMgdGV4dHVyZSBmbG9hdHMgd2l0aG91dCBhbiBleHRlbnNpb24uXG4gICAgbGV0IENPTE9SX0JVRkZFUl9GTE9BVCA9ICdXRUJHTF9jb2xvcl9idWZmZXJfZmxvYXQnO1xuICAgIGNvbnN0IENPTE9SX0JVRkZFUl9IQUxGX0ZMT0FUID0gJ0VYVF9jb2xvcl9idWZmZXJfaGFsZl9mbG9hdCc7XG4gICAgdGhpcy5wYXJhbGxlbENvbXBpbGF0aW9uRXh0ZW5zaW9uID1cbiAgICAgICAgdGhpcy5nbC5nZXRFeHRlbnNpb24oJ0tIUl9wYXJhbGxlbF9zaGFkZXJfY29tcGlsZScpO1xuICAgIGlmIChlbnYoKS5nZXROdW1iZXIoJ1dFQkdMX1ZFUlNJT04nKSA9PT0gMSkge1xuICAgICAgY29uc3QgVEVYVFVSRV9GTE9BVCA9ICdPRVNfdGV4dHVyZV9mbG9hdCc7XG4gICAgICBjb25zdCBURVhUVVJFX0hBTEZfRkxPQVQgPSAnT0VTX3RleHR1cmVfaGFsZl9mbG9hdCc7XG5cbiAgICAgIHRoaXMudGV4dHVyZUZsb2F0RXh0ZW5zaW9uID1cbiAgICAgICAgICB3ZWJnbF91dGlsLmdldEV4dGVuc2lvbk9yVGhyb3codGhpcy5nbCwgVEVYVFVSRV9GTE9BVCk7XG4gICAgICBpZiAod2ViZ2xfdXRpbC5oYXNFeHRlbnNpb24odGhpcy5nbCwgVEVYVFVSRV9IQUxGX0ZMT0FUKSkge1xuICAgICAgICB0aGlzLnRleHR1cmVIYWxmRmxvYXRFeHRlbnNpb24gPVxuICAgICAgICAgICAgd2ViZ2xfdXRpbC5nZXRFeHRlbnNpb25PclRocm93KHRoaXMuZ2wsIFRFWFRVUkVfSEFMRl9GTE9BVCk7XG4gICAgICB9IGVsc2UgaWYgKGVudigpLmdldCgnV0VCR0xfRk9SQ0VfRjE2X1RFWFRVUkVTJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ0dMIGNvbnRleHQgZG9lcyBub3Qgc3VwcG9ydCBoYWxmIGZsb2F0IHRleHR1cmVzLCB5ZXQgdGhlICcgK1xuICAgICAgICAgICAgJ2Vudmlyb25tZW50IGZsYWcgV0VCR0xfRk9SQ0VfRjE2X1RFWFRVUkVTIGlzIHNldCB0byB0cnVlLicpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNvbG9yQnVmZmVyRmxvYXRFeHRlbnNpb24gPSB0aGlzLmdsLmdldEV4dGVuc2lvbihDT0xPUl9CVUZGRVJfRkxPQVQpO1xuICAgICAgaWYgKHdlYmdsX3V0aWwuaGFzRXh0ZW5zaW9uKHRoaXMuZ2wsIENPTE9SX0JVRkZFUl9IQUxGX0ZMT0FUKSkge1xuICAgICAgICB0aGlzLmNvbG9yQnVmZmVySGFsZkZsb2F0RXh0ZW5zaW9uID1cbiAgICAgICAgICAgIHdlYmdsX3V0aWwuZ2V0RXh0ZW5zaW9uT3JUaHJvdyh0aGlzLmdsLCBDT0xPUl9CVUZGRVJfSEFMRl9GTE9BVCk7XG4gICAgICB9IGVsc2UgaWYgKGVudigpLmdldCgnV0VCR0xfRk9SQ0VfRjE2X1RFWFRVUkVTJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ0dMIGNvbnRleHQgZG9lcyBub3Qgc3VwcG9ydCBjb2xvciByZW5kZXJhYmxlIGhhbGYgZmxvYXRzLCB5ZXQgJyArXG4gICAgICAgICAgICAndGhlIGVudmlyb25tZW50IGZsYWcgV0VCR0xfRk9SQ0VfRjE2X1RFWFRVUkVTIGlzIHNldCB0byB0cnVlLicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBDT0xPUl9CVUZGRVJfRkxPQVQgPSAnRVhUX2NvbG9yX2J1ZmZlcl9mbG9hdCc7XG4gICAgICBpZiAod2ViZ2xfdXRpbC5oYXNFeHRlbnNpb24odGhpcy5nbCwgQ09MT1JfQlVGRkVSX0ZMT0FUKSkge1xuICAgICAgICB0aGlzLmNvbG9yQnVmZmVyRmxvYXRFeHRlbnNpb24gPVxuICAgICAgICAgICAgdGhpcy5nbC5nZXRFeHRlbnNpb24oQ09MT1JfQlVGRkVSX0ZMT0FUKTtcbiAgICAgIH0gZWxzZSBpZiAod2ViZ2xfdXRpbC5oYXNFeHRlbnNpb24odGhpcy5nbCwgQ09MT1JfQlVGRkVSX0hBTEZfRkxPQVQpKSB7XG4gICAgICAgIHRoaXMuY29sb3JCdWZmZXJIYWxmRmxvYXRFeHRlbnNpb24gPVxuICAgICAgICAgICAgdGhpcy5nbC5nZXRFeHRlbnNpb24oQ09MT1JfQlVGRkVSX0hBTEZfRkxPQVQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHTCBjb250ZXh0IGRvZXMgbm90IHN1cHBvcnQgY29sb3IgcmVuZGVyYWJsZSBmbG9hdHMnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnZlcnRleEJ1ZmZlciA9IGdwZ3B1X3V0aWwuY3JlYXRlVmVydGV4QnVmZmVyKHRoaXMuZ2wpO1xuICAgIHRoaXMuaW5kZXhCdWZmZXIgPSBncGdwdV91dGlsLmNyZWF0ZUluZGV4QnVmZmVyKHRoaXMuZ2wpO1xuICAgIHRoaXMuZnJhbWVidWZmZXIgPSB3ZWJnbF91dGlsLmNyZWF0ZUZyYW1lYnVmZmVyKHRoaXMuZ2wpO1xuXG4gICAgdGhpcy50ZXh0dXJlQ29uZmlnID1cbiAgICAgICAgdGV4X3V0aWwuZ2V0VGV4dHVyZUNvbmZpZyh0aGlzLmdsLCB0aGlzLnRleHR1cmVIYWxmRmxvYXRFeHRlbnNpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgZGVidWcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGVudigpLmdldEJvb2woJ0RFQlVHJyk7XG4gIH1cblxuICBwdWJsaWMgZGlzcG9zZSgpIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcm9ncmFtICE9IG51bGwpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnRGlzcG9zaW5nIGEgR1BHUFVDb250ZXh0IHRoYXQgc3RpbGwgaGFzIGEgYm91bmQgV2ViR0xQcm9ncmFtLicgK1xuICAgICAgICAgICcgVGhpcyBpcyBwcm9iYWJseSBhIHJlc291cmNlIGxlYWssIGRlbGV0ZSB0aGUgcHJvZ3JhbSB3aXRoICcgK1xuICAgICAgICAgICdHUEdQVUNvbnRleHQuZGVsZXRlUHJvZ3JhbSBiZWZvcmUgZGlzcG9zaW5nLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vdXRwdXRUZXh0dXJlICE9IG51bGwpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnRGlzcG9zaW5nIGEgR1BHUFVDb250ZXh0IHRoYXQgc3RpbGwgaGFzIGEgYm91bmQgb3V0cHV0IG1hdHJpeCAnICtcbiAgICAgICAgICAndGV4dHVyZS4gIFRoaXMgaXMgcHJvYmFibHkgYSByZXNvdXJjZSBsZWFrLCBkZWxldGUgdGhlIG91dHB1dCAnICtcbiAgICAgICAgICAnbWF0cml4IHRleHR1cmUgd2l0aCBHUEdQVUNvbnRleHQuZGVsZXRlTWF0cml4VGV4dHVyZSBiZWZvcmUgJyArXG4gICAgICAgICAgJ2Rpc3Bvc2luZy4nKTtcbiAgICB9XG4gICAgY29uc3QgZ2wgPSB0aGlzLmdsO1xuICAgIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC5maW5pc2goKSk7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCkpO1xuICAgIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKGdsLCAoKSA9PiBnbC5kZWxldGVGcmFtZWJ1ZmZlcih0aGlzLmZyYW1lYnVmZmVyKSk7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCBudWxsKSk7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soXG4gICAgICAgIGdsLCAoKSA9PiBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBudWxsKSk7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLmRlbGV0ZUJ1ZmZlcih0aGlzLmluZGV4QnVmZmVyKSk7XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gIH1cblxuICBwdWJsaWMgY3JlYXRlRmxvYXQzMk1hdHJpeFRleHR1cmUocm93czogbnVtYmVyLCBjb2x1bW5zOiBudW1iZXIpOiBUZXh0dXJlIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIHJldHVybiBncGdwdV91dGlsLmNyZWF0ZUZsb2F0MzJNYXRyaXhUZXh0dXJlKFxuICAgICAgICB0aGlzLmdsLCByb3dzLCBjb2x1bW5zLCB0aGlzLnRleHR1cmVDb25maWcpO1xuICB9XG5cbiAgcHVibGljIGNyZWF0ZUZsb2F0MTZNYXRyaXhUZXh0dXJlKHJvd3M6IG51bWJlciwgY29sdW1uczogbnVtYmVyKTogVGV4dHVyZSB7XG4gICAgdGhpcy50aHJvd0lmRGlzcG9zZWQoKTtcbiAgICByZXR1cm4gZ3BncHVfdXRpbC5jcmVhdGVGbG9hdDE2TWF0cml4VGV4dHVyZShcbiAgICAgICAgdGhpcy5nbCwgcm93cywgY29sdW1ucywgdGhpcy50ZXh0dXJlQ29uZmlnKTtcbiAgfVxuXG4gIHB1YmxpYyBjcmVhdGVVbnNpZ25lZEJ5dGVzTWF0cml4VGV4dHVyZShyb3dzOiBudW1iZXIsIGNvbHVtbnM6IG51bWJlcik6XG4gICAgICBUZXh0dXJlIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIHJldHVybiBncGdwdV91dGlsLmNyZWF0ZVVuc2lnbmVkQnl0ZXNNYXRyaXhUZXh0dXJlKFxuICAgICAgICB0aGlzLmdsLCByb3dzLCBjb2x1bW5zLCB0aGlzLnRleHR1cmVDb25maWcpO1xuICB9XG5cbiAgcHVibGljIHVwbG9hZFBpeGVsRGF0YVRvVGV4dHVyZShcbiAgICAgIHRleHR1cmU6IFdlYkdMVGV4dHVyZSxcbiAgICAgIHBpeGVsczogUGl4ZWxEYXRhfEltYWdlRGF0YXxIVE1MSW1hZ2VFbGVtZW50fEhUTUxDYW52YXNFbGVtZW50fFxuICAgICAgSW1hZ2VCaXRtYXApIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIGdwZ3B1X3V0aWwudXBsb2FkUGl4ZWxEYXRhVG9UZXh0dXJlKHRoaXMuZ2wsIHRleHR1cmUsIHBpeGVscyk7XG4gIH1cblxuICBwdWJsaWMgdXBsb2FkRGVuc2VNYXRyaXhUb1RleHR1cmUoXG4gICAgICB0ZXh0dXJlOiBXZWJHTFRleHR1cmUsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBkYXRhOiBUeXBlZEFycmF5KSB7XG4gICAgdGhpcy50aHJvd0lmRGlzcG9zZWQoKTtcbiAgICBncGdwdV91dGlsLnVwbG9hZERlbnNlTWF0cml4VG9UZXh0dXJlKFxuICAgICAgICB0aGlzLmdsLCB0ZXh0dXJlLCB3aWR0aCwgaGVpZ2h0LCBkYXRhLCB0aGlzLnRleHR1cmVDb25maWcpO1xuICB9XG5cbiAgcHVibGljIGNyZWF0ZUZsb2F0MTZQYWNrZWRNYXRyaXhUZXh0dXJlKHJvd3M6IG51bWJlciwgY29sdW1uczogbnVtYmVyKTpcbiAgICAgIFRleHR1cmUge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgcmV0dXJuIGdwZ3B1X3V0aWwuY3JlYXRlRmxvYXQxNlBhY2tlZE1hdHJpeFRleHR1cmUoXG4gICAgICAgIHRoaXMuZ2wsIHJvd3MsIGNvbHVtbnMsIHRoaXMudGV4dHVyZUNvbmZpZyk7XG4gIH1cblxuICBwdWJsaWMgY3JlYXRlUGFja2VkTWF0cml4VGV4dHVyZShyb3dzOiBudW1iZXIsIGNvbHVtbnM6IG51bWJlcik6IFRleHR1cmUge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgcmV0dXJuIGdwZ3B1X3V0aWwuY3JlYXRlUGFja2VkTWF0cml4VGV4dHVyZShcbiAgICAgICAgdGhpcy5nbCwgcm93cywgY29sdW1ucywgdGhpcy50ZXh0dXJlQ29uZmlnKTtcbiAgfVxuXG4gIHB1YmxpYyBkZWxldGVNYXRyaXhUZXh0dXJlKHRleHR1cmU6IFdlYkdMVGV4dHVyZSkge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgaWYgKHRoaXMub3V0cHV0VGV4dHVyZSA9PT0gdGV4dHVyZSkge1xuICAgICAgd2ViZ2xfdXRpbC51bmJpbmRDb2xvclRleHR1cmVGcm9tRnJhbWVidWZmZXIodGhpcy5nbCwgdGhpcy5mcmFtZWJ1ZmZlcik7XG4gICAgICB0aGlzLm91dHB1dFRleHR1cmUgPSBudWxsO1xuICAgIH1cbiAgICB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayh0aGlzLmdsLCAoKSA9PiB0aGlzLmdsLmRlbGV0ZVRleHR1cmUodGV4dHVyZSkpO1xuICB9XG5cbiAgcHVibGljIGRvd25sb2FkQnl0ZUVuY29kZWRGbG9hdE1hdHJpeEZyb21PdXRwdXRUZXh0dXJlKFxuICAgICAgdGV4dHVyZTogV2ViR0xUZXh0dXJlLCByb3dzOiBudW1iZXIsIGNvbHVtbnM6IG51bWJlcik6IEZsb2F0MzJBcnJheSB7XG4gICAgcmV0dXJuIHRoaXMuZG93bmxvYWRNYXRyaXhEcml2ZXIoXG4gICAgICAgIHRleHR1cmUsXG4gICAgICAgICgpID0+IGdwZ3B1X3V0aWwuZG93bmxvYWRCeXRlRW5jb2RlZEZsb2F0TWF0cml4RnJvbU91dHB1dFRleHR1cmUoXG4gICAgICAgICAgICB0aGlzLmdsLCByb3dzLCBjb2x1bW5zLCB0aGlzLnRleHR1cmVDb25maWcpKTtcbiAgfVxuXG4gIHB1YmxpYyBkb3dubG9hZFBhY2tlZE1hdHJpeEZyb21CdWZmZXIoXG4gICAgICBidWZmZXI6IFdlYkdMQnVmZmVyLCBiYXRjaDogbnVtYmVyLCByb3dzOiBudW1iZXIsIGNvbHVtbnM6IG51bWJlcixcbiAgICAgIHBoeXNpY2FsUm93czogbnVtYmVyLCBwaHlzaWNhbENvbHM6IG51bWJlcik6IEZsb2F0MzJBcnJheSB7XG4gICAgcmV0dXJuIGdwZ3B1X3V0aWwuZG93bmxvYWRQYWNrZWRNYXRyaXhGcm9tQnVmZmVyKFxuICAgICAgICB0aGlzLmdsLCBidWZmZXIsIGJhdGNoLCByb3dzLCBjb2x1bW5zLCBwaHlzaWNhbFJvd3MsIHBoeXNpY2FsQ29scyxcbiAgICAgICAgdGhpcy50ZXh0dXJlQ29uZmlnKTtcbiAgfVxuXG4gIHB1YmxpYyBkb3dubG9hZEZsb2F0MzJNYXRyaXhGcm9tQnVmZmVyKGJ1ZmZlcjogV2ViR0xCdWZmZXIsIHNpemU6IG51bWJlcik6XG4gICAgICBGbG9hdDMyQXJyYXkge1xuICAgIHJldHVybiBncGdwdV91dGlsLmRvd25sb2FkRmxvYXQzMk1hdHJpeEZyb21CdWZmZXIodGhpcy5nbCwgYnVmZmVyLCBzaXplKTtcbiAgfVxuXG4gIHB1YmxpYyBjcmVhdGVCdWZmZXJGcm9tVGV4dHVyZShcbiAgICAgIHRleHR1cmU6IFdlYkdMVGV4dHVyZSwgcm93czogbnVtYmVyLCBjb2x1bW5zOiBudW1iZXIpOiBXZWJHTEJ1ZmZlciB7XG4gICAgdGhpcy5iaW5kVGV4dHVyZVRvRnJhbWVCdWZmZXIodGV4dHVyZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gZ3BncHVfdXRpbC5jcmVhdGVCdWZmZXJGcm9tT3V0cHV0VGV4dHVyZShcbiAgICAgICAgdGhpcy5nbCBhcyBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCByb3dzLCBjb2x1bW5zLCB0aGlzLnRleHR1cmVDb25maWcpO1xuICAgIHRoaXMudW5iaW5kVGV4dHVyZVRvRnJhbWVCdWZmZXIoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGNyZWF0ZUFuZFdhaXRGb3JGZW5jZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmZW5jZUNvbnRleHQgPSB0aGlzLmNyZWF0ZUZlbmNlKHRoaXMuZ2wpO1xuICAgIHJldHVybiB0aGlzLnBvbGxGZW5jZShmZW5jZUNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVGZW5jZShnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0KTogRmVuY2VDb250ZXh0IHtcbiAgICBsZXQgcXVlcnk6IFdlYkdMUXVlcnl8V2ViR0xTeW5jO1xuICAgIGxldCBpc0ZlbmNlUGFzc2VkOiAoKSA9PiBib29sZWFuO1xuXG4gICAgaWYgKGVudigpLmdldEJvb2woJ1dFQkdMX0ZFTkNFX0FQSV9FTkFCTEVEJykpIHtcbiAgICAgIGNvbnN0IGdsMiA9IGdsIGFzIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQ7XG5cbiAgICAgIGNvbnN0IHN5bmMgPSBnbDIuZmVuY2VTeW5jKGdsMi5TWU5DX0dQVV9DT01NQU5EU19DT01QTEVURSwgMCk7XG4gICAgICBnbC5mbHVzaCgpO1xuXG4gICAgICBpc0ZlbmNlUGFzc2VkID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSBnbDIuY2xpZW50V2FpdFN5bmMoc3luYywgMCwgMCk7XG4gICAgICAgIHJldHVybiBzdGF0dXMgPT09IGdsMi5BTFJFQURZX1NJR05BTEVEIHx8XG4gICAgICAgICAgICBzdGF0dXMgPT09IGdsMi5DT05ESVRJT05fU0FUSVNGSUVEO1xuICAgICAgfTtcblxuICAgICAgcXVlcnkgPSBzeW5jO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGVudigpLmdldE51bWJlcignV0VCR0xfRElTSk9JTlRfUVVFUllfVElNRVJfRVhURU5TSU9OX1ZFUlNJT04nKSA+IDApIHtcbiAgICAgIHF1ZXJ5ID0gdGhpcy5iZWdpblF1ZXJ5KCk7XG4gICAgICB0aGlzLmVuZFF1ZXJ5KCk7XG4gICAgICBpc0ZlbmNlUGFzc2VkID0gKCkgPT4gdGhpcy5pc1F1ZXJ5QXZhaWxhYmxlKFxuICAgICAgICAgIHF1ZXJ5LFxuICAgICAgICAgIGVudigpLmdldE51bWJlcignV0VCR0xfRElTSk9JTlRfUVVFUllfVElNRVJfRVhURU5TSU9OX1ZFUlNJT04nKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgbm8gd2F5IHRvIGZlbmNlLCByZXR1cm4gdHJ1ZSBpbW1lZGlhdGVseS4gVGhpcyB3aWxsIGZpcmUgaW5cbiAgICAgIC8vIFdlYkdMIDEuMCB3aGVuIHRoZXJlIGlzIG5vIGRpc2pvaW50IHF1ZXJ5IHRpbWVyLiBJbiB0aGlzIGNhc2UsIGJlY2F1c2VcbiAgICAgIC8vIHRoZSBmZW5jZSBwYXNzZXMgaW1tZWRpYXRlbHksIHdlJ2xsIGltbWVkaWF0ZWx5IGFzayBmb3IgYSBkb3dubG9hZCBvZlxuICAgICAgLy8gdGhlIHRleHR1cmUsIHdoaWNoIHdpbGwgY2F1c2UgdGhlIFVJIHRocmVhZCB0byBoYW5nLlxuICAgICAgaXNGZW5jZVBhc3NlZCA9ICgpID0+IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtxdWVyeSwgaXNGZW5jZVBhc3NlZH07XG4gIH1cblxuICBwdWJsaWMgZG93bmxvYWRNYXRyaXhGcm9tUGFja2VkVGV4dHVyZShcbiAgICAgIHRleHR1cmU6IFdlYkdMVGV4dHVyZSwgcGh5c2ljYWxSb3dzOiBudW1iZXIsXG4gICAgICBwaHlzaWNhbENvbHM6IG51bWJlcik6IEZsb2F0MzJBcnJheSB7XG4gICAgcmV0dXJuIHRoaXMuZG93bmxvYWRNYXRyaXhEcml2ZXIoXG4gICAgICAgIHRleHR1cmUsXG4gICAgICAgICgpID0+IGdwZ3B1X3V0aWwuZG93bmxvYWRNYXRyaXhGcm9tUGFja2VkT3V0cHV0VGV4dHVyZShcbiAgICAgICAgICAgIHRoaXMuZ2wsIHBoeXNpY2FsUm93cywgcGh5c2ljYWxDb2xzKSk7XG4gIH1cblxuICBwdWJsaWMgY3JlYXRlUHJvZ3JhbShmcmFnbWVudFNoYWRlcjogV2ViR0xTaGFkZXIpOiBHUEdQVUNvbnRleHRQcm9ncmFtIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIGNvbnN0IGdsID0gdGhpcy5nbDtcbiAgICBpZiAodGhpcy52ZXJ0ZXhTaGFkZXIgPT0gbnVsbCkge1xuICAgICAgdGhpcy52ZXJ0ZXhTaGFkZXIgPSBncGdwdV91dGlsLmNyZWF0ZVZlcnRleFNoYWRlcihnbCk7XG4gICAgfVxuICAgIGNvbnN0IHByb2dyYW06IFdlYkdMUHJvZ3JhbSA9IHdlYmdsX3V0aWwuY3JlYXRlUHJvZ3JhbShnbCk7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soXG4gICAgICAgIGdsLCAoKSA9PiBnbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgdGhpcy52ZXJ0ZXhTaGFkZXIpKTtcbiAgICB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIGZyYWdtZW50U2hhZGVyKSk7XG4gICAgd2ViZ2xfdXRpbC5saW5rUHJvZ3JhbShnbCwgcHJvZ3JhbSk7XG5cbiAgICBjb25zdCBwcm9ncmFtMiA9IE9iamVjdC5hc3NpZ24ocHJvZ3JhbSwge3ZhbzogdGhpcy5jcmVhdGVWZXJ0ZXhBcnJheSgpfSk7XG4gICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgIHdlYmdsX3V0aWwudmFsaWRhdGVQcm9ncmFtKGdsLCBwcm9ncmFtMik7XG4gICAgfVxuICAgIHJldHVybiBwcm9ncmFtMjtcbiAgfVxuXG4gIHB1YmxpYyBidWlsZFZhbyhwcm9ncmFtOiBHUEdQVUNvbnRleHRQcm9ncmFtKSB7XG4gICAgdGhpcy5zZXRQcm9ncmFtKHByb2dyYW0pO1xuICAgIHRoaXMuYmluZFZlcnRleEFycmF5KHByb2dyYW0udmFvKTtcbiAgICBjb25zdCBnbCA9IHRoaXMuZ2w7XG4gICAgLy8gQmluZCBpbmRleCBidWZmZXIsIGFuZCB2ZXJ0ZXggYnVmZmVycyBiYXNlZCBvbiBwcm9ncmFtIGF0dHJpYlxuICAgIC8vIGxvY2F0aW9ucy5cbiAgICB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhcbiAgICAgICAgZ2wsICgpID0+IGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIHRoaXMuaW5kZXhCdWZmZXIpKTtcbiAgICBncGdwdV91dGlsLmJpbmRWZXJ0ZXhQcm9ncmFtQXR0cmlidXRlU3RyZWFtcyhcbiAgICAgICAgZ2wsIHByb2dyYW0sIHRoaXMudmVydGV4QnVmZmVyKTtcbiAgfVxuXG4gIHB1YmxpYyBkZWxldGVQcm9ncmFtKHByb2dyYW06IEdQR1BVQ29udGV4dFByb2dyYW0pIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIGlmIChwcm9ncmFtID09PSB0aGlzLnByb2dyYW0pIHtcbiAgICAgIHRoaXMucHJvZ3JhbSA9IG51bGw7XG4gICAgfVxuICAgIGlmIChwcm9ncmFtICE9IG51bGwpIHtcbiAgICAgIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKHRoaXMuZ2wsICgpID0+IHRoaXMuZ2wuZGVsZXRlUHJvZ3JhbShwcm9ncmFtKSk7XG4gICAgICB0aGlzLmRlbGV0ZVZlcnRleEFycmF5KHByb2dyYW0udmFvKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgc2V0UHJvZ3JhbShwcm9ncmFtOiBHUEdQVUNvbnRleHRQcm9ncmFtfG51bGwpIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIHRoaXMucHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICBpZiAodGhpcy5wcm9ncmFtICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAgIHdlYmdsX3V0aWwudmFsaWRhdGVQcm9ncmFtKHRoaXMuZ2wsIHRoaXMucHJvZ3JhbSk7XG4gICAgICB9XG4gICAgfVxuICAgIHdlYmdsX3V0aWwuY2FsbEFuZENoZWNrKHRoaXMuZ2wsICgpID0+IHRoaXMuZ2wudXNlUHJvZ3JhbShwcm9ncmFtKSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0VW5pZm9ybUxvY2F0aW9uKFxuICAgICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLCB1bmlmb3JtTmFtZTogc3RyaW5nLFxuICAgICAgc2hvdWxkVGhyb3cgPSB0cnVlKTogV2ViR0xVbmlmb3JtTG9jYXRpb24ge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgaWYgKHNob3VsZFRocm93KSB7XG4gICAgICByZXR1cm4gd2ViZ2xfdXRpbC5nZXRQcm9ncmFtVW5pZm9ybUxvY2F0aW9uT3JUaHJvdyhcbiAgICAgICAgICB0aGlzLmdsLCBwcm9ncmFtLCB1bmlmb3JtTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB3ZWJnbF91dGlsLmdldFByb2dyYW1Vbmlmb3JtTG9jYXRpb24oXG4gICAgICAgICAgdGhpcy5nbCwgcHJvZ3JhbSwgdW5pZm9ybU5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBnZXRBdHRyaWJ1dGVMb2NhdGlvbihwcm9ncmFtOiBXZWJHTFByb2dyYW0sIGF0dHJpYnV0ZTogc3RyaW5nKTpcbiAgICAgIG51bWJlciB7XG4gICAgdGhpcy50aHJvd0lmRGlzcG9zZWQoKTtcbiAgICByZXR1cm4gd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soXG4gICAgICAgIHRoaXMuZ2wsICgpID0+IHRoaXMuZ2wuZ2V0QXR0cmliTG9jYXRpb24ocHJvZ3JhbSwgYXR0cmlidXRlKSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0VW5pZm9ybUxvY2F0aW9uTm9UaHJvdyhwcm9ncmFtOiBXZWJHTFByb2dyYW0sIHVuaWZvcm1OYW1lOiBzdHJpbmcpOlxuICAgICAgV2ViR0xVbmlmb3JtTG9jYXRpb24ge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgcmV0dXJuIHRoaXMuZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sIHVuaWZvcm1OYW1lKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRJbnB1dE1hdHJpeFRleHR1cmUoXG4gICAgICBpbnB1dE1hdHJpeFRleHR1cmU6IFdlYkdMVGV4dHVyZSwgdW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbixcbiAgICAgIHRleHR1cmVVbml0OiBudW1iZXIpIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIHRoaXMudGhyb3dJZk5vUHJvZ3JhbSgpO1xuICAgIHdlYmdsX3V0aWwuYmluZFRleHR1cmVUb1Byb2dyYW1Vbmlmb3JtU2FtcGxlcihcbiAgICAgICAgdGhpcy5nbCwgaW5wdXRNYXRyaXhUZXh0dXJlLCB1bmlmb3JtTG9jYXRpb24sIHRleHR1cmVVbml0KTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRPdXRwdXRNYXRyaXhUZXh0dXJlKFxuICAgICAgb3V0cHV0TWF0cml4VGV4dHVyZTogV2ViR0xUZXh0dXJlLCByb3dzOiBudW1iZXIsIGNvbHVtbnM6IG51bWJlcikge1xuICAgIHRoaXMuc2V0T3V0cHV0TWF0cml4VGV4dHVyZURyaXZlcihvdXRwdXRNYXRyaXhUZXh0dXJlLCBjb2x1bW5zLCByb3dzKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRPdXRwdXRQYWNrZWRNYXRyaXhUZXh0dXJlKFxuICAgICAgb3V0cHV0UGFja2VkTWF0cml4VGV4dHVyZTogV2ViR0xUZXh0dXJlLCByb3dzOiBudW1iZXIsIGNvbHVtbnM6IG51bWJlcikge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgY29uc3QgW3dpZHRoLCBoZWlnaHRdID1cbiAgICAgICAgdGV4X3V0aWwuZ2V0UGFja2VkTWF0cml4VGV4dHVyZVNoYXBlV2lkdGhIZWlnaHQocm93cywgY29sdW1ucyk7XG4gICAgdGhpcy5zZXRPdXRwdXRNYXRyaXhUZXh0dXJlRHJpdmVyKG91dHB1dFBhY2tlZE1hdHJpeFRleHR1cmUsIHdpZHRoLCBoZWlnaHQpO1xuICB9XG5cbiAgcHVibGljIHNldE91dHB1dE1hdHJpeFdyaXRlUmVnaW9uKFxuICAgICAgc3RhcnRSb3c6IG51bWJlciwgbnVtUm93czogbnVtYmVyLCBzdGFydENvbHVtbjogbnVtYmVyLFxuICAgICAgbnVtQ29sdW1uczogbnVtYmVyKSB7XG4gICAgdGhpcy5zZXRPdXRwdXRNYXRyaXhXcml0ZVJlZ2lvbkRyaXZlcihcbiAgICAgICAgc3RhcnRDb2x1bW4sIHN0YXJ0Um93LCBudW1Db2x1bW5zLCBudW1Sb3dzKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRPdXRwdXRQYWNrZWRNYXRyaXhXcml0ZVJlZ2lvbihcbiAgICAgIHN0YXJ0Um93OiBudW1iZXIsIG51bVJvd3M6IG51bWJlciwgc3RhcnRDb2x1bW46IG51bWJlcixcbiAgICAgIG51bUNvbHVtbnM6IG51bWJlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0T3V0cHV0UGFja2VkTWF0cml4V3JpdGVSZWdpb24gbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgcHVibGljIGRlYnVnVmFsaWRhdGUoKSB7XG4gICAgaWYgKHRoaXMucHJvZ3JhbSAhPSBudWxsKSB7XG4gICAgICB3ZWJnbF91dGlsLnZhbGlkYXRlUHJvZ3JhbSh0aGlzLmdsLCB0aGlzLnByb2dyYW0pO1xuICAgIH1cbiAgICB3ZWJnbF91dGlsLnZhbGlkYXRlRnJhbWVidWZmZXIodGhpcy5nbCk7XG4gIH1cblxuICBwdWJsaWMgZXhlY3V0ZVByb2dyYW0oKSB7XG4gICAgdGhpcy50aHJvd0lmRGlzcG9zZWQoKTtcbiAgICB0aGlzLnRocm93SWZOb1Byb2dyYW0oKTtcbiAgICBjb25zdCBnbCA9IHRoaXMuZ2w7XG4gICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgIGNvbnN0IGJvdW5kVmFvID0gdGhpcy5nZXRWZXJ0ZXhBcnJheSgpO1xuICAgICAgY29uc29sZS5hc3NlcnQoXG4gICAgICAgICAgYm91bmRWYW8gPT09IHRoaXMucHJvZ3JhbS52YW8sXG4gICAgICAgICAgJ1ZBTyBjaGFuZ2VkIGJldHdlZW4gc2V0UHJvZ3JhbSBhbmQgZXhlY3V0ZVByb2dyYW0hJyk7XG5cbiAgICAgIHRoaXMuZGVidWdWYWxpZGF0ZSgpO1xuICAgIH1cbiAgICB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhcbiAgICAgICAgZ2wsICgpID0+IGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIDYsIGdsLlVOU0lHTkVEX1NIT1JULCAwKSk7XG4gIH1cblxuICBwdWJsaWMgYmxvY2tVbnRpbEFsbFByb2dyYW1zQ29tcGxldGVkKCkge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2sodGhpcy5nbCwgKCkgPT4gdGhpcy5nbC5maW5pc2goKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFF1ZXJ5VGltZXJFeHRlbnNpb24oKTogV2ViR0wxRGlzam9pbnRRdWVyeVRpbWVyRXh0ZW5zaW9uXG4gICAgICB8V2ViR0wyRGlzam9pbnRRdWVyeVRpbWVyRXh0ZW5zaW9uIHtcbiAgICBpZiAodGhpcy5kaXNqb2ludFF1ZXJ5VGltZXJFeHRlbnNpb24gPT0gbnVsbCkge1xuICAgICAgdGhpcy5kaXNqb2ludFF1ZXJ5VGltZXJFeHRlbnNpb24gPVxuICAgICAgICAgIHdlYmdsX3V0aWwuZ2V0RXh0ZW5zaW9uT3JUaHJvdyhcbiAgICAgICAgICAgICAgdGhpcy5nbCxcbiAgICAgICAgICAgICAgZW52KCkuZ2V0TnVtYmVyKFxuICAgICAgICAgICAgICAgICAgJ1dFQkdMX0RJU0pPSU5UX1FVRVJZX1RJTUVSX0VYVEVOU0lPTl9WRVJTSU9OJykgPT09IDIgP1xuICAgICAgICAgICAgICAgICAgJ0VYVF9kaXNqb2ludF90aW1lcl9xdWVyeV93ZWJnbDInIDpcbiAgICAgICAgICAgICAgICAgICdFWFRfZGlzam9pbnRfdGltZXJfcXVlcnknKSBhc1xuICAgICAgICAgICAgICBXZWJHTDFEaXNqb2ludFF1ZXJ5VGltZXJFeHRlbnNpb24gfFxuICAgICAgICAgIFdlYkdMMkRpc2pvaW50UXVlcnlUaW1lckV4dGVuc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGlzam9pbnRRdWVyeVRpbWVyRXh0ZW5zaW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWVyeVRpbWVyRXh0ZW5zaW9uV2ViR0wyKCk6IFdlYkdMMkRpc2pvaW50UXVlcnlUaW1lckV4dGVuc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UXVlcnlUaW1lckV4dGVuc2lvbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWVyeVRpbWVyRXh0ZW5zaW9uV2ViR0wxKCk6IFdlYkdMMURpc2pvaW50UXVlcnlUaW1lckV4dGVuc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UXVlcnlUaW1lckV4dGVuc2lvbigpIGFzIFdlYkdMMURpc2pvaW50UXVlcnlUaW1lckV4dGVuc2lvbjtcbiAgfVxuXG4gIGJlZ2luUXVlcnkoKTogV2ViR0xRdWVyeSB7XG4gICAgaWYgKGVudigpLmdldE51bWJlcignV0VCR0xfRElTSk9JTlRfUVVFUllfVElNRVJfRVhURU5TSU9OX1ZFUlNJT04nKSA9PT0gMikge1xuICAgICAgY29uc3QgZ2wyID0gdGhpcy5nbCBhcyBXZWJHTDJSZW5kZXJpbmdDb250ZXh0O1xuICAgICAgY29uc3QgZXh0ID0gdGhpcy5nZXRRdWVyeVRpbWVyRXh0ZW5zaW9uV2ViR0wyKCk7XG5cbiAgICAgIGNvbnN0IHF1ZXJ5ID0gZ2wyLmNyZWF0ZVF1ZXJ5KCk7XG4gICAgICBnbDIuYmVnaW5RdWVyeShleHQuVElNRV9FTEFQU0VEX0VYVCwgcXVlcnkpO1xuICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cbiAgICBjb25zdCBleHQgPSB0aGlzLmdldFF1ZXJ5VGltZXJFeHRlbnNpb25XZWJHTDEoKTtcbiAgICBjb25zdCBxdWVyeSA9IGV4dC5jcmVhdGVRdWVyeUVYVCgpIGFzIFdlYkdMUXVlcnk7XG4gICAgZXh0LmJlZ2luUXVlcnlFWFQoZXh0LlRJTUVfRUxBUFNFRF9FWFQsIHF1ZXJ5KTtcbiAgICByZXR1cm4gcXVlcnk7XG4gIH1cblxuICBlbmRRdWVyeSgpIHtcbiAgICBpZiAoZW52KCkuZ2V0TnVtYmVyKCdXRUJHTF9ESVNKT0lOVF9RVUVSWV9USU1FUl9FWFRFTlNJT05fVkVSU0lPTicpID09PSAyKSB7XG4gICAgICBjb25zdCBnbDIgPSB0aGlzLmdsIGFzIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQ7XG4gICAgICBjb25zdCBleHQgPSB0aGlzLmdldFF1ZXJ5VGltZXJFeHRlbnNpb25XZWJHTDIoKTtcbiAgICAgIGdsMi5lbmRRdWVyeShleHQuVElNRV9FTEFQU0VEX0VYVCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGV4dCA9IHRoaXMuZ2V0UXVlcnlUaW1lckV4dGVuc2lvbldlYkdMMSgpO1xuICAgIGV4dC5lbmRRdWVyeUVYVChleHQuVElNRV9FTEFQU0VEX0VYVCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgd2FpdEZvclF1ZXJ5QW5kR2V0VGltZShxdWVyeTogV2ViR0xRdWVyeSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgYXdhaXQgdXRpbC5yZXBlYXRlZFRyeShcbiAgICAgICAgKCkgPT4gdGhpcy5kaXNwb3NlZCB8fCAgLy8gd2hpbGUgdGVzdGluZyBjb250ZXh0cyBhcmUgY3JlYXRlZCAvIGRpc3Bvc2VkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluIHJhcGlkIHN1Y2Nlc3Npb24sIHNvIHdpdGhvdXQgdGhpcyBjaGVjayB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXkgcG9sbCBmb3IgdGhlIHF1ZXJ5IHRpbWVyIGluZGVmaW5pdGVseVxuICAgICAgICAgICAgdGhpcy5pc1F1ZXJ5QXZhaWxhYmxlKFxuICAgICAgICAgICAgICAgIHF1ZXJ5LFxuICAgICAgICAgICAgICAgIGVudigpLmdldE51bWJlcihcbiAgICAgICAgICAgICAgICAgICAgJ1dFQkdMX0RJU0pPSU5UX1FVRVJZX1RJTUVSX0VYVEVOU0lPTl9WRVJTSU9OJykpKTtcbiAgICByZXR1cm4gdGhpcy5nZXRRdWVyeVRpbWUoXG4gICAgICAgIHF1ZXJ5LCBlbnYoKS5nZXROdW1iZXIoJ1dFQkdMX0RJU0pPSU5UX1FVRVJZX1RJTUVSX0VYVEVOU0lPTl9WRVJTSU9OJykpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWVyeVRpbWUocXVlcnk6IFdlYkdMUXVlcnksIHF1ZXJ5VGltZXJWZXJzaW9uOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmIChxdWVyeVRpbWVyVmVyc2lvbiA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHF1ZXJ5VGltZXJWZXJzaW9uID09PSAyKSB7XG4gICAgICBjb25zdCBnbDIgPSB0aGlzLmdsIGFzIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQ7XG5cbiAgICAgIGNvbnN0IHRpbWVFbGFwc2VkTmFub3MgPSBnbDIuZ2V0UXVlcnlQYXJhbWV0ZXIocXVlcnksIGdsMi5RVUVSWV9SRVNVTFQpO1xuICAgICAgLy8gUmV0dXJuIG1pbGxpc2Vjb25kcy5cbiAgICAgIHJldHVybiB0aW1lRWxhcHNlZE5hbm9zIC8gMTAwMDAwMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXh0ID0gdGhpcy5nZXRRdWVyeVRpbWVyRXh0ZW5zaW9uV2ViR0wxKCk7XG5cbiAgICAgIGNvbnN0IHRpbWVFbGFwc2VkTmFub3MgPVxuICAgICAgICAgIGV4dC5nZXRRdWVyeU9iamVjdEVYVChxdWVyeSwgZXh0LlFVRVJZX1JFU1VMVF9FWFQpO1xuICAgICAgLy8gUmV0dXJuIG1pbGxpc2Vjb25kcy5cbiAgICAgIHJldHVybiB0aW1lRWxhcHNlZE5hbm9zIC8gMTAwMDAwMDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGlzUXVlcnlBdmFpbGFibGUocXVlcnk6IFdlYkdMUXVlcnksIHF1ZXJ5VGltZXJWZXJzaW9uOiBudW1iZXIpOlxuICAgICAgYm9vbGVhbiB7XG4gICAgaWYgKHF1ZXJ5VGltZXJWZXJzaW9uID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocXVlcnlUaW1lclZlcnNpb24gPT09IDIpIHtcbiAgICAgIGNvbnN0IGdsMiA9IHRoaXMuZ2wgYXMgV2ViR0wyUmVuZGVyaW5nQ29udGV4dDtcbiAgICAgIGNvbnN0IGV4dCA9IHRoaXMuZ2V0UXVlcnlUaW1lckV4dGVuc2lvbldlYkdMMigpO1xuXG4gICAgICBjb25zdCBhdmFpbGFibGUgPVxuICAgICAgICAgIGdsMi5nZXRRdWVyeVBhcmFtZXRlcihxdWVyeSwgZ2wyLlFVRVJZX1JFU1VMVF9BVkFJTEFCTEUpO1xuICAgICAgaWYgKHRoaXMuZGlzam9pbnQgPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRpc2pvaW50ID0gdGhpcy5nbC5nZXRQYXJhbWV0ZXIoZXh0LkdQVV9ESVNKT0lOVF9FWFQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYXZhaWxhYmxlICYmICF0aGlzLmRpc2pvaW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBleHQgPSB0aGlzLmdldFF1ZXJ5VGltZXJFeHRlbnNpb25XZWJHTDEoKTtcblxuICAgICAgY29uc3QgYXZhaWxhYmxlID1cbiAgICAgICAgICBleHQuZ2V0UXVlcnlPYmplY3RFWFQocXVlcnksIGV4dC5RVUVSWV9SRVNVTFRfQVZBSUxBQkxFX0VYVCk7XG4gICAgICBpZiAodGhpcy5kaXNqb2ludCA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZGlzam9pbnQgPSB0aGlzLmdsLmdldFBhcmFtZXRlcihleHQuR1BVX0RJU0pPSU5UX0VYVCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhdmFpbGFibGUgJiYgIXRoaXMuZGlzam9pbnQ7XG4gICAgfVxuICB9XG5cbiAgcG9sbEZlbmNlKGZlbmNlQ29udGV4dDogRmVuY2VDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4ge1xuICAgICAgdGhpcy5hZGRJdGVtVG9Qb2xsKCgpID0+IGZlbmNlQ29udGV4dC5pc0ZlbmNlUGFzc2VkKCksICgpID0+IHJlc29sdmUoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGl0ZW1zVG9Qb2xsOiBQb2xsSXRlbVtdID0gW107XG5cbiAgcG9sbEl0ZW1zKCk6IHZvaWQge1xuICAgIC8vIEZpbmQgdGhlIGxhc3QgcXVlcnkgdGhhdCBoYXMgZmluaXNoZWQuXG4gICAgY29uc3QgaW5kZXggPSBsaW5lYXJTZWFyY2hMYXN0VHJ1ZSh0aGlzLml0ZW1zVG9Qb2xsLm1hcCh4ID0+IHguaXNEb25lRm4pKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBpbmRleDsgKytpKSB7XG4gICAgICBjb25zdCB7cmVzb2x2ZUZufSA9IHRoaXMuaXRlbXNUb1BvbGxbaV07XG4gICAgICByZXNvbHZlRm4oKTtcbiAgICB9XG4gICAgdGhpcy5pdGVtc1RvUG9sbCA9IHRoaXMuaXRlbXNUb1BvbGwuc2xpY2UoaW5kZXggKyAxKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkSXRlbVRvUG9sbChpc0RvbmVGbjogKCkgPT4gYm9vbGVhbiwgcmVzb2x2ZUZuOiAoKSA9PiB2b2lkKSB7XG4gICAgdGhpcy5pdGVtc1RvUG9sbC5wdXNoKHtpc0RvbmVGbiwgcmVzb2x2ZUZufSk7XG4gICAgaWYgKHRoaXMuaXRlbXNUb1BvbGwubGVuZ3RoID4gMSkge1xuICAgICAgLy8gV2UgYWxyZWFkeSBoYXZlIGEgcnVubmluZyBsb29wIHRoYXQgcG9sbHMuXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFN0YXJ0IGEgbmV3IGxvb3AgdGhhdCBwb2xscy5cbiAgICBsZXQgc2NoZWR1bGVGbiA9IHVuZGVmaW5lZDtcbiAgICBpZiAoJ3NldFRpbWVvdXRDdXN0b20nIGluIGVudigpLnBsYXRmb3JtKSB7XG4gICAgICBzY2hlZHVsZUZuID0gZW52KCkucGxhdGZvcm0uc2V0VGltZW91dEN1c3RvbS5iaW5kKGVudigpLnBsYXRmb3JtKTtcbiAgICB9XG4gICAgdXRpbC5yZXBlYXRlZFRyeSgoKSA9PiB7XG4gICAgICB0aGlzLnBvbGxJdGVtcygpO1xuICAgICAgLy8gRW5kIHRoZSBsb29wIGlmIG5vIG1vcmUgaXRlbXMgdG8gcG9sbC5cbiAgICAgIHJldHVybiB0aGlzLml0ZW1zVG9Qb2xsLmxlbmd0aCA9PT0gMDtcbiAgICB9LCAoKSA9PiAwLCBudWxsLCBzY2hlZHVsZUZuKTtcbiAgfVxuXG4gIHByaXZhdGUgYmluZFRleHR1cmVUb0ZyYW1lQnVmZmVyKHRleHR1cmU6IFdlYkdMVGV4dHVyZSkge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgd2ViZ2xfdXRpbC5iaW5kQ29sb3JUZXh0dXJlVG9GcmFtZWJ1ZmZlcihcbiAgICAgICAgdGhpcy5nbCwgdGV4dHVyZSwgdGhpcy5mcmFtZWJ1ZmZlcik7XG4gICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgIHdlYmdsX3V0aWwudmFsaWRhdGVGcmFtZWJ1ZmZlcih0aGlzLmdsKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHVuYmluZFRleHR1cmVUb0ZyYW1lQnVmZmVyKCkge1xuICAgIGlmICh0aGlzLm91dHB1dFRleHR1cmUgIT0gbnVsbCkge1xuICAgICAgd2ViZ2xfdXRpbC5iaW5kQ29sb3JUZXh0dXJlVG9GcmFtZWJ1ZmZlcihcbiAgICAgICAgICB0aGlzLmdsLCB0aGlzLm91dHB1dFRleHR1cmUsIHRoaXMuZnJhbWVidWZmZXIpO1xuICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgd2ViZ2xfdXRpbC52YWxpZGF0ZUZyYW1lYnVmZmVyKHRoaXMuZ2wpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB3ZWJnbF91dGlsLnVuYmluZENvbG9yVGV4dHVyZUZyb21GcmFtZWJ1ZmZlcih0aGlzLmdsLCB0aGlzLmZyYW1lYnVmZmVyKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRvd25sb2FkTWF0cml4RHJpdmVyKFxuICAgICAgdGV4dHVyZTogV2ViR0xUZXh0dXJlLFxuICAgICAgZG93bmxvYWRBbmREZWNvZGU6ICgpID0+IEZsb2F0MzJBcnJheSk6IEZsb2F0MzJBcnJheSB7XG4gICAgdGhpcy5iaW5kVGV4dHVyZVRvRnJhbWVCdWZmZXIodGV4dHVyZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gZG93bmxvYWRBbmREZWNvZGUoKTtcbiAgICB0aGlzLnVuYmluZFRleHR1cmVUb0ZyYW1lQnVmZmVyKCk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRPdXRwdXRNYXRyaXhUZXh0dXJlRHJpdmVyKFxuICAgICAgb3V0cHV0TWF0cml4VGV4dHVyZU1heWJlUGFja2VkOiBXZWJHTFRleHR1cmUsIHdpZHRoOiBudW1iZXIsXG4gICAgICBoZWlnaHQ6IG51bWJlcikge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgY29uc3QgZ2wgPSB0aGlzLmdsO1xuICAgIHdlYmdsX3V0aWwuYmluZENvbG9yVGV4dHVyZVRvRnJhbWVidWZmZXIoXG4gICAgICAgIGdsLCBvdXRwdXRNYXRyaXhUZXh0dXJlTWF5YmVQYWNrZWQsIHRoaXMuZnJhbWVidWZmZXIpO1xuICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICB3ZWJnbF91dGlsLnZhbGlkYXRlRnJhbWVidWZmZXIoZ2wpO1xuICAgIH1cbiAgICB0aGlzLm91dHB1dFRleHR1cmUgPSBvdXRwdXRNYXRyaXhUZXh0dXJlTWF5YmVQYWNrZWQ7XG4gICAgd2ViZ2xfdXRpbC5jYWxsQW5kQ2hlY2soZ2wsICgpID0+IGdsLnZpZXdwb3J0KDAsIDAsIHdpZHRoLCBoZWlnaHQpKTtcbiAgICB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhnbCwgKCkgPT4gZ2wuc2Npc3NvcigwLCAwLCB3aWR0aCwgaGVpZ2h0KSk7XG4gIH1cblxuICBwcml2YXRlIHNldE91dHB1dE1hdHJpeFdyaXRlUmVnaW9uRHJpdmVyKFxuICAgICAgeDogbnVtYmVyLCB5OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XG4gICAgdGhpcy50aHJvd0lmRGlzcG9zZWQoKTtcbiAgICB3ZWJnbF91dGlsLmNhbGxBbmRDaGVjayhcbiAgICAgICAgdGhpcy5nbCwgKCkgPT4gdGhpcy5nbC5zY2lzc29yKHgsIHksIHdpZHRoLCBoZWlnaHQpKTtcbiAgfVxuXG4gIHByaXZhdGUgdGhyb3dJZkRpc3Bvc2VkKCkge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0dGVtcHRlZCB0byB1c2UgZGlzcG9zZWQgR1BHUFVDb250ZXh0LicpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdGhyb3dJZk5vUHJvZ3JhbSgpIHtcbiAgICBpZiAodGhpcy5wcm9ncmFtID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gR1BVIHByb2dyYW0gaXMgY3VycmVudGx5IHNldC4nKTtcbiAgICB9XG4gIH1cbn1cblxudHlwZSBQb2xsSXRlbSA9IHtcbiAgaXNEb25lRm46ICgpID0+IGJvb2xlYW4sXG4gIHJlc29sdmVGbjogKCkgPT4gdm9pZFxufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgaW5kZXggb2YgdGhlIGxhc3QgdHJ1ZSBlbGVtZW50IHVzaW5nIGxpbmVhciBzZWFyY2guXG4gKiBOb3RlOiBXZSBjYW4ndCBkbyBiaW5hcnkgc2VhcmNoIGJlY2F1c2UgQ2hyb21lIGV4cGVjdHMgdXMgdG8gZXhwbGljaXRseVxuICogdGVzdCBhbGwgZmVuY2VzIGJlZm9yZSBkb3dubG9hZDpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS90ZW5zb3JmbG93L3RmanMvaXNzdWVzLzExNDVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmVhclNlYXJjaExhc3RUcnVlKGFycjogQXJyYXk8KCkgPT4gYm9vbGVhbj4pOiBudW1iZXIge1xuICBsZXQgaSA9IDA7XG4gIGZvciAoOyBpIDwgYXJyLmxlbmd0aDsgKytpKSB7XG4gICAgY29uc3QgaXNEb25lID0gYXJyW2ldKCk7XG4gICAgaWYgKCFpc0RvbmUpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaSAtIDE7XG59XG4iXX0=