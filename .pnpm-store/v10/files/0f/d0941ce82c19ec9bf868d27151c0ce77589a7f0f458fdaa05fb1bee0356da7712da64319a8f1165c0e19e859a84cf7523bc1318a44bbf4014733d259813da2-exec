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
import { backend_util, env, util } from '@tensorflow/tfjs-core';
import * as shader_compiler from './shader_compiler';
import { createFragmentShader } from './webgl_util';
export function compileProgram(gpgpu, program, inputs, output) {
    const inputInfos = inputs.map((input, i) => {
        const shapeInfo = {
            logicalShape: input.shape,
            texShape: input.isUniform ? null : input.texData.texShape,
            isUniform: input.isUniform,
            isPacked: input.isUniform ? false : input.texData.isPacked,
            flatOffset: null
        };
        if (input.texData != null && input.texData.slice != null &&
            input.texData.slice.flatOffset > 0) {
            shapeInfo.flatOffset = input.texData.slice.flatOffset;
        }
        return { name: program.variableNames[i], shapeInfo };
    });
    const inShapeInfos = inputInfos.map(x => x.shapeInfo);
    const outShapeInfo = {
        logicalShape: output.shape,
        texShape: output.texData.texShape,
        isUniform: false,
        isPacked: output.texData.isPacked,
        flatOffset: null
    };
    const source = shader_compiler.makeShader(inputInfos, outShapeInfo, program);
    const fragmentShader = createFragmentShader(gpgpu.gl, source);
    const webGLProgram = gpgpu.createProgram(fragmentShader);
    if (!env().get('ENGINE_COMPILE_ONLY')) {
        gpgpu.buildVao(webGLProgram);
        return Object.assign({ program,
            fragmentShader,
            source,
            webGLProgram,
            inShapeInfos,
            outShapeInfo }, getUniformLocations(gpgpu, program, webGLProgram));
    }
    else {
        return {
            program,
            fragmentShader,
            source,
            webGLProgram,
            inShapeInfos,
            outShapeInfo,
            variablesLocations: null,
            customUniformLocations: null,
            infLoc: null,
            nanLoc: null,
            outShapeLocation: null,
            outShapeStridesLocation: null,
            outTexShapeLocation: null
        };
    }
}
export function getUniformLocations(gpgpu, program, webGLProgram) {
    const variablesLocations = [];
    const customUniformLocations = [];
    let outShapeLocation;
    let outTexShapeLocation;
    let outShapeStridesLocation;
    let infLoc = null;
    let nanLoc = null;
    // Add special uniforms (NAN, INFINITY)
    nanLoc = gpgpu.getUniformLocation(webGLProgram, 'NAN', false);
    if (env().getNumber('WEBGL_VERSION') === 1) {
        infLoc = gpgpu.getUniformLocation(webGLProgram, 'INFINITY', false);
    }
    // Add user-defined uniforms
    const shouldThrow = false;
    for (const varName of program.variableNames) {
        const varLocs = {
            name: varName,
            uniform: gpgpu.getUniformLocation(webGLProgram, varName, shouldThrow),
            offset: gpgpu.getUniformLocation(webGLProgram, `offset${varName}`, shouldThrow),
        };
        if (program.enableShapeUniforms) {
            varLocs.shape = gpgpu.getUniformLocation(webGLProgram, `${varName}Shape`, shouldThrow);
            varLocs.texShape = gpgpu.getUniformLocation(webGLProgram, `${varName}TexShape`, shouldThrow);
        }
        variablesLocations.push(varLocs);
    }
    if (program.enableShapeUniforms) {
        outShapeLocation =
            gpgpu.getUniformLocation(webGLProgram, 'outShape', shouldThrow);
        outShapeStridesLocation =
            gpgpu.getUniformLocation(webGLProgram, 'outShapeStrides', shouldThrow);
        outTexShapeLocation =
            gpgpu.getUniformLocation(webGLProgram, 'outTexShape', shouldThrow);
    }
    if (program.customUniforms) {
        for (const d of program.customUniforms) {
            customUniformLocations.push(gpgpu.getUniformLocation(webGLProgram, d.name, shouldThrow));
        }
    }
    return {
        variablesLocations,
        customUniformLocations,
        infLoc,
        nanLoc,
        outShapeLocation,
        outShapeStridesLocation,
        outTexShapeLocation
    };
}
function validateBinaryAndProgram(shapeInfos, inputs) {
    if (shapeInfos.length !== inputs.length) {
        throw Error(`Binary was compiled with ${shapeInfos.length} inputs, but ` +
            `was executed with ${inputs.length} inputs`);
    }
    shapeInfos.forEach((s, i) => {
        const shapeA = s.logicalShape;
        const input = inputs[i];
        const shapeB = input.shape;
        if (!util.arraysEqual(shapeA, shapeB)) {
            throw Error(`Binary was compiled with different shapes than ` +
                `the current args. Shapes ${shapeA} and ${shapeB} must match`);
        }
        // The input is uploaded as uniform.
        if (s.isUniform && input.isUniform) {
            return;
        }
        const texShapeA = s.texShape;
        const texShapeB = input.isUniform ? null : input.texData.texShape;
        if (!util.arraysEqual(texShapeA, texShapeB)) {
            throw Error(`Binary was compiled with different texture shapes than the` +
                ` current args. Shape ${texShapeA} and ${texShapeB} must match`);
        }
    });
}
export function runProgram(gpgpu, binary, inputs, output, customUniformValues) {
    if (!binary.program.enableShapeUniforms) {
        validateBinaryAndProgram(binary.inShapeInfos, inputs);
        validateBinaryAndProgram([binary.outShapeInfo], [output]);
    }
    const outTex = output.texData.texture;
    const outTexShape = output.texData.texShape;
    if (output.texData.isPacked) {
        gpgpu.setOutputPackedMatrixTexture(outTex.texture, outTexShape[0], outTexShape[1]);
    }
    else {
        gpgpu.setOutputMatrixTexture(outTex.texture, outTexShape[0], outTexShape[1]);
    }
    gpgpu.setProgram(binary.webGLProgram);
    gpgpu.bindVertexArray(binary.webGLProgram.vao);
    // Set special uniforms (NAN, INFINITY)
    if (env().getNumber('WEBGL_VERSION') === 1) {
        if (binary.infLoc !== null) {
            gpgpu.gl.uniform1f(binary.infLoc, Infinity);
        }
    }
    if (binary.nanLoc !== null) {
        gpgpu.gl.uniform1f(binary.nanLoc, NaN);
    }
    // Set user-defined inputs
    for (let i = 0; i < inputs.length; ++i) {
        const input = inputs[i];
        const { uniform: varLoc, offset: varOffsetLoc, shape: varShapeLoc, texShape: varTexShapeLoc, } = binary.variablesLocations[i];
        if (varShapeLoc) {
            const { uniformShape } = shader_compiler.getUniformInfoFromShape(binary.program.packedInputs, input.shape, input.texData.texShape);
            switch (uniformShape.length) {
                case 1:
                    gpgpu.gl.uniform1iv(varShapeLoc, new Int32Array(uniformShape));
                    break;
                case 2:
                    gpgpu.gl.uniform2iv(varShapeLoc, new Int32Array(uniformShape));
                    break;
                case 3:
                    gpgpu.gl.uniform3iv(varShapeLoc, new Int32Array(uniformShape));
                    break;
                case 4:
                    gpgpu.gl.uniform4iv(varShapeLoc, new Int32Array(uniformShape));
                    break;
                default:
                    break;
            }
        }
        if (varTexShapeLoc) {
            gpgpu.gl.uniform2i(varTexShapeLoc, input.texData.texShape[0], input.texData.texShape[1]);
        }
        if (varLoc == null) {
            // The compiler inferred that this variable is not used in this shader.
            continue;
        }
        if (input.isUniform) {
            // Upload the values of the tensor as uniform.
            if (util.sizeFromShape(input.shape) < 2) {
                gpgpu.gl.uniform1f(varLoc, input.uniformValues[0]);
            }
            else {
                let vals = input.uniformValues;
                if (!(vals instanceof Float32Array)) {
                    vals = new Float32Array(vals);
                }
                gpgpu.gl.uniform1fv(varLoc, vals);
            }
            continue;
        }
        // If the input was sliced, upload the flat offset index.
        if (input.texData.slice != null && varOffsetLoc != null) {
            gpgpu.gl.uniform1i(varOffsetLoc, input.texData.slice.flatOffset);
        }
        gpgpu.setInputMatrixTexture(input.texData.texture.texture, varLoc, i);
    }
    const outShapeLoc = binary.outShapeLocation;
    if (outShapeLoc) {
        switch (output.shape.length) {
            case 1:
                gpgpu.gl.uniform1iv(outShapeLoc, new Int32Array(output.shape));
                break;
            case 2:
                gpgpu.gl.uniform2iv(outShapeLoc, new Int32Array(output.shape));
                break;
            case 3:
                gpgpu.gl.uniform3iv(outShapeLoc, new Int32Array(output.shape));
                break;
            case 4:
                gpgpu.gl.uniform4iv(outShapeLoc, new Int32Array(output.shape));
                break;
            default:
                break;
        }
    }
    if (binary.outShapeStridesLocation) {
        const strides = util.computeStrides(output.shape);
        switch (output.shape.length) {
            case 2:
                gpgpu.gl.uniform1iv(binary.outShapeStridesLocation, new Int32Array(strides));
                break;
            case 3:
                gpgpu.gl.uniform2iv(binary.outShapeStridesLocation, new Int32Array(strides));
                break;
            case 4:
                gpgpu.gl.uniform3iv(binary.outShapeStridesLocation, new Int32Array(strides));
                break;
            default:
                break;
        }
    }
    if (binary.outTexShapeLocation) {
        gpgpu.gl.uniform2i(binary.outTexShapeLocation, output.texData.texShape[0], output.texData.texShape[1]);
    }
    if (binary.program.customUniforms && customUniformValues) {
        for (let i = 0; i < binary.program.customUniforms.length; ++i) {
            const d = binary.program.customUniforms[i];
            const customLoc = binary.customUniformLocations[i];
            const customValue = customUniformValues[i];
            if (d.type === 'float') {
                gpgpu.gl.uniform1fv(customLoc, customValue);
            }
            else if (d.type === 'vec2') {
                gpgpu.gl.uniform2fv(customLoc, customValue);
            }
            else if (d.type === 'vec3') {
                gpgpu.gl.uniform3fv(customLoc, customValue);
            }
            else if (d.type === 'vec4') {
                gpgpu.gl.uniform4fv(customLoc, customValue);
            }
            else if (d.type === 'int') {
                gpgpu.gl.uniform1iv(customLoc, customValue);
            }
            else if (d.type === 'ivec2') {
                gpgpu.gl.uniform2iv(customLoc, customValue);
            }
            else if (d.type === 'ivec3') {
                gpgpu.gl.uniform3iv(customLoc, customValue);
            }
            else if (d.type === 'ivec4') {
                gpgpu.gl.uniform4iv(customLoc, customValue);
            }
            else {
                throw Error(`uniform type ${d.type} is not supported yet.`);
            }
        }
    }
    gpgpu.executeProgram();
}
export function makeShaderKey(program, inputs, output) {
    let keyInputs = '';
    inputs.concat(output).forEach(x => {
        const hasOffset = x.texData != null && x.texData.slice != null &&
            x.texData.slice.flatOffset > 0;
        // TODO: Remove the condition of !x.isUniform.
        if (program.enableShapeUniforms && !x.isUniform) {
            const xTexShape = x.texData.texShape;
            const { useSqueezeShape, uniformShape, keptDims } = shader_compiler.getUniformInfoFromShape(program.packedInputs, x.shape, xTexShape);
            let rank1 = '', rank2 = '', rank34 = '';
            if (uniformShape.length === 1 && program.packedInputs) {
                const packedTexShape = [Math.ceil(xTexShape[0] / 2), Math.ceil(xTexShape[1] / 2)];
                rank1 = `${packedTexShape[0] > 1}_${packedTexShape[1] > 1}`;
            }
            else if (uniformShape.length === 2 && !program.packedInputs) {
                rank2 = `${uniformShape[0] > 1}_${uniformShape[1] > 1}`;
            }
            else if (uniformShape.length > 2 && !program.packedInputs) {
                const strides = util.computeStrides(uniformShape);
                rank34 = `${strides[0] === xTexShape[1]}_${strides[strides.length - 1] === xTexShape[1]}`;
            }
            const xRank = x.shape.length;
            const isLogicalShapTexShapeEqual = uniformShape.length === 2 && util.arraysEqual(x.shape, xTexShape);
            const isScalar = util.sizeFromShape(x.shape) === 1;
            const broadcastDims = backend_util.getBroadcastDims(x.shape, output.shape);
            const isInOutTexShapeEqual = !program.packedInputs &&
                xRank === output.shape.length &&
                util.arraysEqual(xTexShape, output.texData.texShape);
            const isTexShapeGreaterThanOne = program.packedInputs || uniformShape.length > 2 ?
                '' :
                `${xTexShape[0] > 1}_${xTexShape[1] > 1}`;
            // These key components are needed due to shader_compiler is embedding
            // them in the shader.
            // |xRank| is used to determine the coords length. See
            // get[Packed]SamplerAtOutputCoords.
            // |isInOutTexShapeEqual| is used to determine whether going to an
            // optimization path in getSamplerAtOutputCoords.
            // |useSqueezeShape| is extracted from squeezeInputInfo of
            // getSampler[2|3|4]D/getPackedSampler3D.
            // |isScalar| is extracted from isInputScalar/isOutputScalar in
            // getPackedSamplerAtOutputCoords.
            // |broadcastDims| is extracted from get[Packed]SamplerAtOutputCoords.
            // |isLogicalShapTexShapeEqual| is used in
            // getOutput[Packed]2DCoords/get[Packed]Sampler2D.
            // |rank1| is used in getOutputPacked1DCoords.
            // |rank2| is used in getOutput2DCoords.
            // |rank34| is used in getSampler3D/getSampler4D.
            // |isTexShapeGreaterThanOne| are used in
            // getSampler[Scalar|1D|2D]/getOutput1DCoords.
            keyInputs += `${xRank}_${isInOutTexShapeEqual}_${useSqueezeShape ? keptDims : ''}_${uniformShape.length}_${isScalar}_${broadcastDims}_${isLogicalShapTexShapeEqual}_${rank1}_${rank2}_${rank34}_${isTexShapeGreaterThanOne}_${hasOffset}`;
        }
        else {
            const texShape = x.isUniform ? 'uniform' : x.texData.texShape;
            keyInputs += `${x.shape}_${texShape}_${hasOffset}`;
        }
    });
    const keyUserCode = program.userCode;
    let key = program.constructor.name;
    // Fast string concat. See https://jsperf.com/string-concatenation/14.
    key += '_' + keyInputs + '_' + keyUserCode +
        `${env().getNumber('WEBGL_VERSION')}`;
    return key;
}
export function useShapeUniforms(rank) {
    // TODO: Remove the limitaion of rank <= 4.
    return env().getBool('WEBGL_USE_SHAPES_UNIFORMS') && rank <= 4;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3BncHVfbWF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RmanMtYmFja2VuZC13ZWJnbC9zcmMvZ3BncHVfbWF0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsWUFBWSxFQUFFLEdBQUcsRUFBc0IsSUFBSSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFHbEYsT0FBTyxLQUFLLGVBQWUsTUFBTSxtQkFBbUIsQ0FBQztBQUdyRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSxjQUFjLENBQUM7QUE0RGxELE1BQU0sVUFBVSxjQUFjLENBQzFCLEtBQW1CLEVBQUUsT0FBcUIsRUFBRSxNQUFvQixFQUNoRSxNQUFrQjtJQUNwQixNQUFNLFVBQVUsR0FBZ0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN0RCxNQUFNLFNBQVMsR0FBYztZQUMzQixZQUFZLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDekIsUUFBUSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRO1lBQ3pELFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztZQUMxQixRQUFRLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVE7WUFDMUQsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQztRQUNGLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksSUFBSTtZQUNwRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFO1lBQ3RDLFNBQVMsQ0FBQyxVQUFVLEdB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Q0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUM5RCxTQUFTLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztTQUNwRDtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNyQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztJQUNuQyxzRUFBc0U7SUFDdEUsR0FBRyxJQUFJLEdBQUcsR0FBRyxTQUFTLEdBQUcsR0FBRyxHQUFHLFdBQVc7UUFDdEMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztJQUMxQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBWTtJQUMzQywyQ0FBMkM7SUFDM0MsT0FBTyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQ2pFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7YmFja2VuZF91dGlsLCBlbnYsIFRlbnNvciwgVHlwZWRBcnJheSwgdXRpbH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHtHUEdQVUNvbnRleHQsIEdQR1BVQ29udGV4dFByb2dyYW19IGZyb20gJy4vZ3BncHVfY29udGV4dCc7XG5pbXBvcnQgKiBhcyBzaGFkZXJfY29tcGlsZXIgZnJvbSAnLi9zaGFkZXJfY29tcGlsZXInO1xuaW1wb3J0IHtJbnB1dEluZm8sIFNoYXBlSW5mbywgVW5pZm9ybVR5cGV9IGZyb20gJy4vc2hhZGVyX2NvbXBpbGVyJztcbmltcG9ydCB7UGFja2luZ1NjaGVtZSwgVGV4dHVyZURhdGEsIFRleHR1cmVVc2FnZX0gZnJvbSAnLi90ZXhfdXRpbCc7XG5pbXBvcnQge2NyZWF0ZUZyYWdtZW50U2hhZGVyfSBmcm9tICcuL3dlYmdsX3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdQR1BVUHJvZ3JhbSB7XG4gIHZhcmlhYmxlTmFtZXM6IHN0cmluZ1tdO1xuICBvdXRwdXRTaGFwZTogbnVtYmVyW107XG4gIHVzZXJDb2RlOiBzdHJpbmc7XG4gIGVuYWJsZVNoYXBlVW5pZm9ybXM/OiBib29sZWFuO1xuICAvKiogSWYgdHJ1ZSwgdGhpcyBwcm9ncmFtIGV4cGVjdHMgcGFja2VkIGlucHV0IHRleHR1cmVzLiBEZWZhdWx0cyB0byBmYWxzZS4gKi9cbiAgcGFja2VkSW5wdXRzPzogYm9vbGVhbjtcbiAgLyoqIElmIHRydWUsIHRoaXMgcHJvZ3JhbSBwcm9kdWNlcyBhIHBhY2tlZCB0ZXh0dXJlLiBEZWZhdWx0cyB0byBmYWxzZS4gKi9cbiAgcGFja2VkT3V0cHV0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFmZmVjdHMgd2hhdCB0eXBlIG9mIHRleHR1cmUgd2UgYWxsb2NhdGUgZm9yIHRoZSBvdXRwdXQuIERlZmF1bHRzIHRvXG4gICAqIGBUZXh0dXJlVXNhZ2UuUkVOREVSYC5cbiAgICovXG4gIG91dFRleFVzYWdlPzogVGV4dHVyZVVzYWdlO1xuICAvKipcbiAgICogVGhlIHR5cGUgb2Ygc2NoZW1lIHRvIHVzZSB3aGVuIHBhY2tpbmcgdGV4ZWxzIGZvciB0aGUgb3V0cHV0IHZhbHVlcy5cbiAgICogU2VlIGBQYWNraW5nU2NoZW1lYCBmb3IgZGV0YWlscy4gRGVmYXVsdHMgdG8gYFBhY2tpbmdTY2hlbWUuU0hBUkVEX0JBVENIYC5cbiAgICovXG4gIG91dFBhY2tpbmdTY2hlbWU/OiBQYWNraW5nU2NoZW1lO1xuICBjdXN0b21Vbmlmb3Jtcz86XG4gICAgICBBcnJheTx7bmFtZTogc3RyaW5nOyBhcnJheUluZGV4PzogbnVtYmVyOyB0eXBlOiBVbmlmb3JtVHlwZTt9Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHUEdQVUJpbmFyeSBleHRlbmRzIEdQR1BVQmluYXJ5TG9jYXRpb25zIHtcbiAgd2ViR0xQcm9ncmFtOiBHUEdQVUNvbnRleHRQcm9ncmFtO1xuICBwcm9ncmFtOiBHUEdQVVByb2dyYW07XG4gIHNvdXJjZTogc3RyaW5nO1xuICBmcmFnbWVudFNoYWRlcjogV2ViR0xTaGFkZXI7XG4gIGluU2hhcGVJbmZvczogU2hhcGVJbmZvW107XG4gIG91dFNoYXBlSW5mbzogU2hhcGVJbmZvO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdQR1BVQmluYXJ5TG9jYXRpb25zIHtcbiAgY3VzdG9tVW5pZm9ybUxvY2F0aW9ucz86IFdlYkdMVW5pZm9ybUxvY2F0aW9uW107XG4gIGluZkxvYzogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIG5hbkxvYzogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIG91dFNoYXBlTG9jYXRpb24/OiBXZWJHTFVuaWZvcm1Mb2NhdGlvbjtcbiAgb3V0U2hhcGVTdHJpZGVzTG9jYXRpb24/OiBXZWJHTFVuaWZvcm1Mb2NhdGlvbjtcbiAgb3V0VGV4U2hhcGVMb2NhdGlvbj86IFdlYkdMVW5pZm9ybUxvY2F0aW9uO1xuICB2YXJpYWJsZXNMb2NhdGlvbnM/OiBHUEdQVVZhcmlhYmxlTG9jYXRpb25zW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR1BHUFVWYXJpYWJsZUxvY2F0aW9ucyB7XG4gIG5hbWU6IHN0cmluZztcbiAgdW5pZm9ybTogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIG9mZnNldDogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIHNoYXBlPzogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIHRleFNoYXBlPzogV2ViR0xVbmlmb3JtTG9jYXRpb247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVuc29yRGF0YSB7XG4gIHNoYXBlOiBudW1iZXJbXTtcbiAgdGV4RGF0YTogVGV4dHVyZURhdGE7XG4gIGlzVW5pZm9ybTogYm9vbGVhbjtcbiAgLy8gQXZhaWxhYmxlIHdoZW4gd2UgZGVjaWRlIHRvIHVwbG9hZCBhcyB1bmlmb3JtIGluc3RlYWQgb2YgdGV4dHVyZS5cbiAgdW5pZm9ybVZhbHVlcz86IFR5cGVkQXJyYXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlUHJvZ3JhbTxUIGV4dGVuZHMgVGVuc29yLCBLIGV4dGVuZHMgVGVuc29yPihcbiAgICBncGdwdTogR1BHUFVDb250ZXh0LCBwcm9ncmFtOiBHUEdQVVByb2dyYW0sIGlucHV0czogVGVuc29yRGF0YVtdLFxuICAgIG91dHB1dDogVGVuc29yRGF0YSk6IEdQR1BVQmluYXJ5IHtcbiAgY29uc3QgaW5wdXRJbmZvczogSW5wdXRJbmZvW10gPSBpbnB1dHMubWFwKChpbnB1dCwgaSkgPT4ge1xuICAgIGNvbnN0IHNoYXBlSW5mbzogU2hhcGVJbmZvID0ge1xuICAgICAgbG9naWNhbFNoYXBlOiBpbnB1dC5zaGFwZSxcbiAgICAgIHRleFNoYXBlOiBpbnB1dC5pc1VuaWZvcm0gPyBudWxsIDogaW5wdXQudGV4RGF0YS50ZXhTaGFwZSxcbiAgICAgIGlzVW5pZm9ybTogaW5wdXQuaXNVbmlmb3JtLFxuICAgICAgaXNQYWNrZWQ6IGlucHV0LmlzVW5pZm9ybSA/IGZhbHNlIDogaW5wdXQudGV4RGF0YS5pc1BhY2tlZCxcbiAgICAgIGZsYXRPZmZzZXQ6IG51bGxcbiAgICB9O1xuICAgIGlmIChpbnB1dC50ZXhEYXRhICE9IG51bGwgJiYgaW5wdXQudGV4RGF0YS5zbGljZSAhPSBudWxsICYmXG4gICAgICAgIGlucHV0LnRleERhdGEuc2xpY2UuZmxhdE9mZnNldCA+IDApIHtcbiAgICAgIHNoYXBlSW5mby5mbGF0T2Zmc2V0ID0gaW5wdXQudGV4RGF0YS5zbGljZS5mbGF0T2Zmc2V0O1xuICAgIH1cbiAgICByZXR1cm4ge25hbWU6IHByb2dyYW0udmFyaWFibGVOYW1lc1tpXSwgc2hhcGVJbmZvfTtcbiAgfSk7XG4gIGNvbnN0IGluU2hhcGVJbmZvcyA9IGlucHV0SW5mb3MubWFwKHggPT4geC5zaGFwZUluZm8pO1xuICBjb25zdCBvdXRTaGFwZUluZm86IFNoYXBlSW5mbyA9IHtcbiAgICBsb2dpY2FsU2hhcGU6IG91dHB1dC5zaGFwZSxcbiAgICB0ZXhTaGFwZTogb3V0cHV0LnRleERhdGEudGV4U2hhcGUsXG4gICAgaXNVbmlmb3JtOiBmYWxzZSxcbiAgICBpc1BhY2tlZDogb3V0cHV0LnRleERhdGEuaXNQYWNrZWQsXG4gICAgZmxhdE9mZnNldDogbnVsbFxuICB9O1xuICBjb25zdCBzb3VyY2UgPSBzaGFkZXJfY29tcGlsZXIubWFrZVNoYWRlcihpbnB1dEluZm9zLCBvdXRTaGFwZUluZm8sIHByb2dyYW0pO1xuICBjb25zdCBmcmFnbWVudFNoYWRlciA9IGNyZWF0ZUZyYWdtZW50U2hhZGVyKGdwZ3B1LmdsLCBzb3VyY2UpO1xuICBjb25zdCB3ZWJHTFByb2dyYW0gPSBncGdwdS5jcmVhdGVQcm9ncmFtKGZyYWdtZW50U2hhZGVyKTtcblxuICBpZiAoIWVudigpLmdldCgnRU5HSU5FX0NPTVBJTEVfT05MWScpKSB7XG4gICAgZ3BncHUuYnVpbGRWYW8od2ViR0xQcm9ncmFtKTtcbiAgICByZXR1cm4ge1xuICAgICAgcHJvZ3JhbSxcbiAgICAgIGZyYWdtZW50U2hhZGVyLFxuICAgICAgc291cmNlLFxuICAgICAgd2ViR0xQcm9ncmFtLFxuICAgICAgaW5TaGFwZUluZm9zLFxuICAgICAgb3V0U2hhcGVJbmZvLFxuICAgICAgLi4uZ2V0VW5pZm9ybUxvY2F0aW9ucyhncGdwdSwgcHJvZ3JhbSwgd2ViR0xQcm9ncmFtKVxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2dyYW0sXG4gICAgICBmcmFnbWVudFNoYWRlcixcbiAgICAgIHNvdXJjZSxcbiAgICAgIHdlYkdMUHJvZ3JhbSxcbiAgICAgIGluU2hhcGVJbmZvcyxcbiAgICAgIG91dFNoYXBlSW5mbyxcbiAgICAgIHZhcmlhYmxlc0xvY2F0aW9uczogbnVsbCxcbiAgICAgIGN1c3RvbVVuaWZvcm1Mb2NhdGlvbnM6IG51bGwsXG4gICAgICBpbmZMb2M6IG51bGwsXG4gICAgICBuYW5Mb2M6IG51bGwsXG4gICAgICBvdXRTaGFwZUxvY2F0aW9uOiBudWxsLFxuICAgICAgb3V0U2hhcGVTdHJpZGVzTG9jYXRpb246IG51bGwsXG4gICAgICBvdXRUZXhTaGFwZUxvY2F0aW9uOiBudWxsXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pZm9ybUxvY2F0aW9ucyhcbiAgICBncGdwdTogR1BHUFVDb250ZXh0LCBwcm9ncmFtOiBHUEdQVVByb2dyYW0sXG4gICAgd2ViR0xQcm9ncmFtOiBXZWJHTFByb2dyYW0pOiBHUEdQVUJpbmFyeUxvY2F0aW9ucyB7XG4gIGNvbnN0IHZhcmlhYmxlc0xvY2F0aW9uczogR1BHUFVWYXJpYWJsZUxvY2F0aW9uc1tdID0gW107XG4gIGNvbnN0IGN1c3RvbVVuaWZvcm1Mb2NhdGlvbnM6IFdlYkdMVW5pZm9ybUxvY2F0aW9uW10gPSBbXTtcbiAgbGV0IG91dFNoYXBlTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uO1xuICBsZXQgb3V0VGV4U2hhcGVMb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIGxldCBvdXRTaGFwZVN0cmlkZXNMb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb247XG4gIGxldCBpbmZMb2M6IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gbnVsbDtcbiAgbGV0IG5hbkxvYzogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBudWxsO1xuXG4gIC8vIEFkZCBzcGVjaWFsIHVuaWZvcm1zIChOQU4sIElORklOSVRZKVxuICBuYW5Mb2MgPSBncGdwdS5nZXRVbmlmb3JtTG9jYXRpb24od2ViR0xQcm9ncmFtLCAnTkFOJywgZmFsc2UpO1xuICBpZiAoZW52KCkuZ2V0TnVtYmVyKCdXRUJHTF9WRVJTSU9OJykgPT09IDEpIHtcbiAgICBpbmZMb2MgPSBncGdwdS5nZXRVbmlmb3JtTG9jYXRpb24od2ViR0xQcm9ncmFtLCAnSU5GSU5JVFknLCBmYWxzZSk7XG4gIH1cblxuICAvLyBBZGQgdXNlci1kZWZpbmVkIHVuaWZvcm1zXG4gIGNvbnN0IHNob3VsZFRocm93ID0gZmFsc2U7XG4gIGZvciAoY29uc3QgdmFyTmFtZSBvZiBwcm9ncmFtLnZhcmlhYmxlTmFtZXMpIHtcbiAgICBjb25zdCB2YXJMb2NzOiBHUEdQVVZhcmlhYmxlTG9jYXRpb25zID0ge1xuICAgICAgbmFtZTogdmFyTmFtZSxcbiAgICAgIHVuaWZvcm06IGdwZ3B1LmdldFVuaWZvcm1Mb2NhdGlvbih3ZWJHTFByb2dyYW0sIHZhck5hbWUsIHNob3VsZFRocm93KSxcbiAgICAgIG9mZnNldDogZ3BncHUuZ2V0VW5pZm9ybUxvY2F0aW9uKFxuICAgICAgICAgIHdlYkdMUHJvZ3JhbSwgYG9mZnNldCR7dmFyTmFtZX1gLCBzaG91bGRUaHJvdyksXG4gICAgfTtcbiAgICBpZiAocHJvZ3JhbS5lbmFibGVTaGFwZVVuaWZvcm1zKSB7XG4gICAgICB2YXJMb2NzLnNoYXBlID0gZ3BncHUuZ2V0VW5pZm9ybUxvY2F0aW9uKFxuICAgICAgICAgIHdlYkdMUHJvZ3JhbSwgYCR7dmFyTmFtZX1TaGFwZWAsIHNob3VsZFRocm93KTtcbiAgICAgIHZhckxvY3MudGV4U2hhcGUgPSBncGdwdS5nZXRVbmlmb3JtTG9jYXRpb24oXG4gICAgICAgICAgd2ViR0xQcm9ncmFtLCBgJHt2YXJOYW1lfVRleFNoYXBlYCwgc2hvdWxkVGhyb3cpO1xuICAgIH1cblxuICAgIHZhcmlhYmxlc0xvY2F0aW9ucy5wdXNoKHZhckxvY3MpO1xuICB9XG5cbiAgaWYgKHByb2dyYW0uZW5hYmxlU2hhcGVVbmlmb3Jtcykge1xuICAgIG91dFNoYXBlTG9jYXRpb24gPVxuICAgICAgICBncGdwdS5nZXRVbmlmb3JtTG9jYXRpb24od2ViR0xQcm9ncmFtLCAnb3V0U2hhcGUnLCBzaG91bGRUaHJvdyk7XG4gICAgb3V0U2hhcGVTdHJpZGVzTG9jYXRpb24gPVxuICAgICAgICBncGdwdS5nZXRVbmlmb3JtTG9jYXRpb24od2ViR0xQcm9ncmFtLCAnb3V0U2hhcGVTdHJpZGVzJywgc2hvdWxkVGhyb3cpO1xuICAgIG91dFRleFNoYXBlTG9jYXRpb24gPVxuICAgICAgICBncGdwdS5nZXRVbmlmb3JtTG9jYXRpb24od2ViR0xQcm9ncmFtLCAnb3V0VGV4U2hhcGUnLCBzaG91bGRUaHJvdyk7XG4gIH1cblxuICBpZiAocHJvZ3JhbS5jdXN0b21Vbmlmb3Jtcykge1xuICAgIGZvciAoY29uc3QgZCBvZiBwcm9ncmFtLmN1c3RvbVVuaWZvcm1zKSB7XG4gICAgICBjdXN0b21Vbmlmb3JtTG9jYXRpb25zLnB1c2goXG4gICAgICAgICAgZ3BncHUuZ2V0VW5pZm9ybUxvY2F0aW9uKHdlYkdMUHJvZ3JhbSwgZC5uYW1lLCBzaG91bGRUaHJvdykpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdmFyaWFibGVzTG9jYXRpb25zLFxuICAgIGN1c3RvbVVuaWZvcm1Mb2NhdGlvbnMsXG4gICAgaW5mTG9jLFxuICAgIG5hbkxvYyxcbiAgICBvdXRTaGFwZUxvY2F0aW9uLFxuICAgIG91dFNoYXBlU3RyaWRlc0xvY2F0aW9uLFxuICAgIG91dFRleFNoYXBlTG9jYXRpb25cbiAgfTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVCaW5hcnlBbmRQcm9ncmFtKFxuICAgIHNoYXBlSW5mb3M6IFNoYXBlSW5mb1tdLCBpbnB1dHM6IFRlbnNvckRhdGFbXSkge1xuICBpZiAoc2hhcGVJbmZvcy5sZW5ndGggIT09IGlucHV0cy5sZW5ndGgpIHtcbiAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYEJpbmFyeSB3YXMgY29tcGlsZWQgd2l0aCAke3NoYXBlSW5mb3MubGVuZ3RofSBpbnB1dHMsIGJ1dCBgICtcbiAgICAgICAgYHdhcyBleGVjdXRlZCB3aXRoICR7aW5wdXRzLmxlbmd0aH0gaW5wdXRzYCk7XG4gIH1cblxuICBzaGFwZUluZm9zLmZvckVhY2goKHMsIGkpID0+IHtcbiAgICBjb25zdCBzaGFwZUEgPSBzLmxvZ2ljYWxTaGFwZTtcbiAgICBjb25zdCBpbnB1dCA9IGlucHV0c1tpXTtcbiAgICBjb25zdCBzaGFwZUIgPSBpbnB1dC5zaGFwZTtcblxuICAgIGlmICghdXRpbC5hcnJheXNFcXVhbChzaGFwZUEsIHNoYXBlQikpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgIGBCaW5hcnkgd2FzIGNvbXBpbGVkIHdpdGggZGlmZmVyZW50IHNoYXBlcyB0aGFuIGAgK1xuICAgICAgICAgIGB0aGUgY3VycmVudCBhcmdzLiBTaGFwZXMgJHtzaGFwZUF9IGFuZCAke3NoYXBlQn0gbXVzdCBtYXRjaGApO1xuICAgIH1cbiAgICAvLyBUaGUgaW5wdXQgaXMgdXBsb2FkZWQgYXMgdW5pZm9ybS5cbiAgICBpZiAocy5pc1VuaWZvcm0gJiYgaW5wdXQuaXNVbmlmb3JtKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGV4U2hhcGVBID0gcy50ZXhTaGFwZTtcbiAgICBjb25zdCB0ZXhTaGFwZUIgPSBpbnB1dC5pc1VuaWZvcm0gPyBudWxsIDogaW5wdXQudGV4RGF0YS50ZXhTaGFwZTtcbiAgICBpZiAoIXV0aWwuYXJyYXlzRXF1YWwodGV4U2hhcGVBLCB0ZXhTaGFwZUIpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICBgQmluYXJ5IHdhcyBjb21waWxlZCB3aXRoIGRpZmZlcmVudCB0ZXh0dXJlIHNoYXBlcyB0aGFuIHRoZWAgK1xuICAgICAgICAgIGAgY3VycmVudCBhcmdzLiBTaGFwZSAke3RleFNoYXBlQX0gYW5kICR7dGV4U2hhcGVCfSBtdXN0IG1hdGNoYCk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blByb2dyYW08VCBleHRlbmRzIFRlbnNvciwgSyBleHRlbmRzIFRlbnNvcj4oXG4gICAgZ3BncHU6IEdQR1BVQ29udGV4dCwgYmluYXJ5OiBHUEdQVUJpbmFyeSwgaW5wdXRzOiBUZW5zb3JEYXRhW10sXG4gICAgb3V0cHV0OiBUZW5zb3JEYXRhLCBjdXN0b21Vbmlmb3JtVmFsdWVzPzogbnVtYmVyW11bXSk6IHZvaWQge1xuICBpZiAoIWJpbmFyeS5wcm9ncmFtLmVuYWJsZVNoYXBlVW5pZm9ybXMpIHtcbiAgICB2YWxpZGF0ZUJpbmFyeUFuZFByb2dyYW0oYmluYXJ5LmluU2hhcGVJbmZvcywgaW5wdXRzKTtcbiAgICB2YWxpZGF0ZUJpbmFyeUFuZFByb2dyYW0oW2JpbmFyeS5vdXRTaGFwZUluZm9dLCBbb3V0cHV0XSk7XG4gIH1cblxuICBjb25zdCBvdXRUZXggPSBvdXRwdXQudGV4RGF0YS50ZXh0dXJlO1xuICBjb25zdCBvdXRUZXhTaGFwZSA9IG91dHB1dC50ZXhEYXRhLnRleFNoYXBlO1xuICBpZiAob3V0cHV0LnRleERhdGEuaXNQYWNrZWQpIHtcbiAgICBncGdwdS5zZXRPdXRwdXRQYWNrZWRNYXRyaXhUZXh0dXJlKFxuICAgICAgICBvdXRUZXgudGV4dHVyZSwgb3V0VGV4U2hhcGVbMF0sIG91dFRleFNoYXBlWzFdKTtcbiAgfSBlbHNlIHtcbiAgICBncGdwdS5zZXRPdXRwdXRNYXRyaXhUZXh0dXJlKFxuICAgICAgICBvdXRUZXgudGV4dHVyZSwgb3V0VGV4U2hhcGVbMF0sIG91dFRleFNoYXBlWzFdKTtcbiAgfVxuICBncGdwdS5zZXRQcm9ncmFtKGJpbmFyeS53ZWJHTFByb2dyYW0pO1xuICBncGdwdS5iaW5kVmVydGV4QXJyYXkoYmluYXJ5LndlYkdMUHJvZ3JhbS52YW8pO1xuXG4gIC8vIFNldCBzcGVjaWFsIHVuaWZvcm1zIChOQU4sIElORklOSVRZKVxuICBpZiAoZW52KCkuZ2V0TnVtYmVyKCdXRUJHTF9WRVJTSU9OJykgPT09IDEpIHtcbiAgICBpZiAoYmluYXJ5LmluZkxvYyAhPT0gbnVsbCkge1xuICAgICAgZ3BncHUuZ2wudW5pZm9ybTFmKGJpbmFyeS5pbmZMb2MsIEluZmluaXR5KTtcbiAgICB9XG4gIH1cbiAgaWYgKGJpbmFyeS5uYW5Mb2MgIT09IG51bGwpIHtcbiAgICBncGdwdS5nbC51bmlmb3JtMWYoYmluYXJ5Lm5hbkxvYywgTmFOKTtcbiAgfVxuXG4gIC8vIFNldCB1c2VyLWRlZmluZWQgaW5wdXRzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRzLmxlbmd0aDsgKytpKSB7XG4gICAgY29uc3QgaW5wdXQgPSBpbnB1dHNbaV07XG4gICAgY29uc3Qge1xuICAgICAgdW5pZm9ybTogdmFyTG9jLFxuICAgICAgb2Zmc2V0OiB2YXJPZmZzZXRMb2MsXG4gICAgICBzaGFwZTogdmFyU2hhcGVMb2MsXG4gICAgICB0ZXhTaGFwZTogdmFyVGV4U2hhcGVMb2MsXG4gICAgfSA9IGJpbmFyeS52YXJpYWJsZXNMb2NhdGlvbnNbaV07XG5cbiAgICBpZiAodmFyU2hhcGVMb2MpIHtcbiAgICAgIGNvbnN0IHt1bmlmb3JtU2hhcGV9ID0gc2hhZGVyX2NvbXBpbGVyLmdldFVuaWZvcm1JbmZvRnJvbVNoYXBlKFxuICAgICAgICAgIGJpbmFyeS5wcm9ncmFtLnBhY2tlZElucHV0cywgaW5wdXQuc2hhcGUsIGlucHV0LnRleERhdGEudGV4U2hhcGUpO1xuICAgICAgc3dpdGNoICh1bmlmb3JtU2hhcGUubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBncGdwdS5nbC51bmlmb3JtMWl2KHZhclNoYXBlTG9jLCBuZXcgSW50MzJBcnJheSh1bmlmb3JtU2hhcGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGdwZ3B1LmdsLnVuaWZvcm0yaXYodmFyU2hhcGVMb2MsIG5ldyBJbnQzMkFycmF5KHVuaWZvcm1TaGFwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTNpdih2YXJTaGFwZUxvYywgbmV3IEludDMyQXJyYXkodW5pZm9ybVNoYXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBncGdwdS5nbC51bmlmb3JtNGl2KHZhclNoYXBlTG9jLCBuZXcgSW50MzJBcnJheSh1bmlmb3JtU2hhcGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFyVGV4U2hhcGVMb2MpIHtcbiAgICAgIGdwZ3B1LmdsLnVuaWZvcm0yaShcbiAgICAgICAgICB2YXJUZXhTaGFwZUxvYywgaW5wdXQudGV4RGF0YS50ZXhTaGFwZVswXSwgaW5wdXQudGV4RGF0YS50ZXhTaGFwZVsxXSk7XG4gICAgfVxuXG4gICAgaWYgKHZhckxvYyA9PSBudWxsKSB7XG4gICAgICAvLyBUaGUgY29tcGlsZXIgaW5mZXJyZWQgdGhhdCB0aGlzIHZhcmlhYmxlIGlzIG5vdCB1c2VkIGluIHRoaXMgc2hhZGVyLlxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGlucHV0LmlzVW5pZm9ybSkge1xuICAgICAgLy8gVXBsb2FkIHRoZSB2YWx1ZXMgb2YgdGhlIHRlbnNvciBhcyB1bmlmb3JtLlxuICAgICAgaWYgKHV0aWwuc2l6ZUZyb21TaGFwZShpbnB1dC5zaGFwZSkgPCAyKSB7XG4gICAgICAgIGdwZ3B1LmdsLnVuaWZvcm0xZih2YXJMb2MsIGlucHV0LnVuaWZvcm1WYWx1ZXNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHZhbHMgPSBpbnB1dC51bmlmb3JtVmFsdWVzO1xuICAgICAgICBpZiAoISh2YWxzIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSkge1xuICAgICAgICAgIHZhbHMgPSBuZXcgRmxvYXQzMkFycmF5KHZhbHMpO1xuICAgICAgICB9XG4gICAgICAgIGdwZ3B1LmdsLnVuaWZvcm0xZnYodmFyTG9jLCB2YWxzKTtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBpbnB1dCB3YXMgc2xpY2VkLCB1cGxvYWQgdGhlIGZsYXQgb2Zmc2V0IGluZGV4LlxuICAgIGlmIChpbnB1dC50ZXhEYXRhLnNsaWNlICE9IG51bGwgJiYgdmFyT2Zmc2V0TG9jICE9IG51bGwpIHtcbiAgICAgIGdwZ3B1LmdsLnVuaWZvcm0xaSh2YXJPZmZzZXRMb2MsIGlucHV0LnRleERhdGEuc2xpY2UuZmxhdE9mZnNldCk7XG4gICAgfVxuXG4gICAgZ3BncHUuc2V0SW5wdXRNYXRyaXhUZXh0dXJlKGlucHV0LnRleERhdGEudGV4dHVyZS50ZXh0dXJlLCB2YXJMb2MsIGkpO1xuICB9XG5cbiAgY29uc3Qgb3V0U2hhcGVMb2MgPSBiaW5hcnkub3V0U2hhcGVMb2NhdGlvbjtcbiAgaWYgKG91dFNoYXBlTG9jKSB7XG4gICAgc3dpdGNoIChvdXRwdXQuc2hhcGUubGVuZ3RoKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGdwZ3B1LmdsLnVuaWZvcm0xaXYob3V0U2hhcGVMb2MsIG5ldyBJbnQzMkFycmF5KG91dHB1dC5zaGFwZSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTJpdihvdXRTaGFwZUxvYywgbmV3IEludDMyQXJyYXkob3V0cHV0LnNoYXBlKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBncGdwdS5nbC51bmlmb3JtM2l2KG91dFNoYXBlTG9jLCBuZXcgSW50MzJBcnJheShvdXRwdXQuc2hhcGUpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDQ6XG4gICAgICAgIGdwZ3B1LmdsLnVuaWZvcm00aXYob3V0U2hhcGVMb2MsIG5ldyBJbnQzMkFycmF5KG91dHB1dC5zaGFwZSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAoYmluYXJ5Lm91dFNoYXBlU3RyaWRlc0xvY2F0aW9uKSB7XG4gICAgY29uc3Qgc3RyaWRlcyA9IHV0aWwuY29tcHV0ZVN0cmlkZXMob3V0cHV0LnNoYXBlKTtcbiAgICBzd2l0Y2ggKG91dHB1dC5zaGFwZS5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTFpdihcbiAgICAgICAgICAgIGJpbmFyeS5vdXRTaGFwZVN0cmlkZXNMb2NhdGlvbiwgbmV3IEludDMyQXJyYXkoc3RyaWRlcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTJpdihcbiAgICAgICAgICAgIGJpbmFyeS5vdXRTaGFwZVN0cmlkZXNMb2NhdGlvbiwgbmV3IEludDMyQXJyYXkoc3RyaWRlcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTNpdihcbiAgICAgICAgICAgIGJpbmFyeS5vdXRTaGFwZVN0cmlkZXNMb2NhdGlvbiwgbmV3IEludDMyQXJyYXkoc3RyaWRlcykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAoYmluYXJ5Lm91dFRleFNoYXBlTG9jYXRpb24pIHtcbiAgICBncGdwdS5nbC51bmlmb3JtMmkoXG4gICAgICAgIGJpbmFyeS5vdXRUZXhTaGFwZUxvY2F0aW9uLCBvdXRwdXQudGV4RGF0YS50ZXhTaGFwZVswXSxcbiAgICAgICAgb3V0cHV0LnRleERhdGEudGV4U2hhcGVbMV0pO1xuICB9XG5cbiAgaWYgKGJpbmFyeS5wcm9ncmFtLmN1c3RvbVVuaWZvcm1zICYmIGN1c3RvbVVuaWZvcm1WYWx1ZXMpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeS5wcm9ncmFtLmN1c3RvbVVuaWZvcm1zLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBkID0gYmluYXJ5LnByb2dyYW0uY3VzdG9tVW5pZm9ybXNbaV07XG4gICAgICBjb25zdCBjdXN0b21Mb2MgPSBiaW5hcnkuY3VzdG9tVW5pZm9ybUxvY2F0aW9uc1tpXTtcbiAgICAgIGNvbnN0IGN1c3RvbVZhbHVlID0gY3VzdG9tVW5pZm9ybVZhbHVlc1tpXTtcbiAgICAgIGlmIChkLnR5cGUgPT09ICdmbG9hdCcpIHtcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTFmdihjdXN0b21Mb2MsIGN1c3RvbVZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09PSAndmVjMicpIHtcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTJmdihjdXN0b21Mb2MsIGN1c3RvbVZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09PSAndmVjMycpIHtcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTNmdihjdXN0b21Mb2MsIGN1c3RvbVZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09PSAndmVjNCcpIHtcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTRmdihjdXN0b21Mb2MsIGN1c3RvbVZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09PSAnaW50Jykge1xuICAgICAgICBncGdwdS5nbC51bmlmb3JtMWl2KGN1c3RvbUxvYywgY3VzdG9tVmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChkLnR5cGUgPT09ICdpdmVjMicpIHtcbiAgICAgICAgZ3BncHUuZ2wudW5pZm9ybTJpdihjdXN0b21Mb2MsIGN1c3RvbVZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09PSAnaXZlYzMnKSB7XG4gICAgICAgIGdwZ3B1LmdsLnVuaWZvcm0zaXYoY3VzdG9tTG9jLCBjdXN0b21WYWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGQudHlwZSA9PT0gJ2l2ZWM0Jykge1xuICAgICAgICBncGdwdS5nbC51bmlmb3JtNGl2KGN1c3RvbUxvYywgY3VzdG9tVmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoYHVuaWZvcm0gdHlwZSAke2QudHlwZX0gaXMgbm90IHN1cHBvcnRlZCB5ZXQuYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGdwZ3B1LmV4ZWN1dGVQcm9ncmFtKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlU2hhZGVyS2V5KFxuICAgIHByb2dyYW06IEdQR1BVUHJvZ3JhbSwgaW5wdXRzOiBUZW5zb3JEYXRhW10sIG91dHB1dDogVGVuc29yRGF0YSk6IHN0cmluZyB7XG4gIGxldCBrZXlJbnB1dHMgPSAnJztcbiAgaW5wdXRzLmNvbmNhdChvdXRwdXQpLmZvckVhY2goeCA9PiB7XG4gICAgY29uc3QgaGFzT2Zmc2V0ID0geC50ZXhEYXRhICE9IG51bGwgJiYgeC50ZXhEYXRhLnNsaWNlICE9IG51bGwgJiZcbiAgICAgICAgeC50ZXhEYXRhLnNsaWNlLmZsYXRPZmZzZXQgPiAwO1xuICAgIC8vIFRPRE86IFJlbW92ZSB0aGUgY29uZGl0aW9uIG9mICF4LmlzVW5pZm9ybS5cbiAgICBpZiAocHJvZ3JhbS5lbmFibGVTaGFwZVVuaWZvcm1zICYmICF4LmlzVW5pZm9ybSkge1xuICAgICAgY29uc3QgeFRleFNoYXBlID0geC50ZXhEYXRhLnRleFNoYXBlO1xuICAgICAgY29uc3Qge3VzZVNxdWVlemVTaGFwZSwgdW5pZm9ybVNoYXBlLCBrZXB0RGltc30gPVxuICAgICAgICAgIHNoYWRlcl9jb21waWxlci5nZXRVbmlmb3JtSW5mb0Zyb21TaGFwZShcbiAgICAgICAgICAgICAgcHJvZ3JhbS5wYWNrZWRJbnB1dHMsIHguc2hhcGUsIHhUZXhTaGFwZSk7XG4gICAgICBsZXQgcmFuazEgPSAnJywgcmFuazIgPSAnJywgcmFuazM0ID0gJyc7XG4gICAgICBpZiAodW5pZm9ybVNoYXBlLmxlbmd0aCA9PT0gMSAmJiBwcm9ncmFtLnBhY2tlZElucHV0cykge1xuICAgICAgICBjb25zdCBwYWNrZWRUZXhTaGFwZSA9XG4gICAgICAgICAgICBbTWF0aC5jZWlsKHhUZXhTaGFwZVswXSAvIDIpLCBNYXRoLmNlaWwoeFRleFNoYXBlWzFdIC8gMildO1xuICAgICAgICByYW5rMSA9IGAke3BhY2tlZFRleFNoYXBlWzBdID4gMX1fJHtwYWNrZWRUZXhTaGFwZVsxXSA+IDF9YDtcbiAgICAgIH0gZWxzZSBpZiAodW5pZm9ybVNoYXBlLmxlbmd0aCA9PT0gMiAmJiAhcHJvZ3JhbS5wYWNrZWRJbnB1dHMpIHtcbiAgICAgICAgcmFuazIgPSBgJHt1bmlmb3JtU2hhcGVbMF0gPiAxfV8ke3VuaWZvcm1TaGFwZVsxXSA+IDF9YDtcbiAgICAgIH0gZWxzZSBpZiAodW5pZm9ybVNoYXBlLmxlbmd0aCA+IDIgJiYgIXByb2dyYW0ucGFja2VkSW5wdXRzKSB7XG4gICAgICAgIGNvbnN0IHN0cmlkZXMgPSB1dGlsLmNvbXB1dGVTdHJpZGVzKHVuaWZvcm1TaGFwZSk7XG4gICAgICAgIHJhbmszNCA9IGAke3N0cmlkZXNbMF0gPT09IHhUZXhTaGFwZVsxXX1fJHtcbiAgICAgICAgICAgIHN0cmlkZXNbc3RyaWRlcy5sZW5ndGggLSAxXSA9PT0geFRleFNoYXBlWzFdfWA7XG4gICAgICB9XG4gICAgICBjb25zdCB4UmFuayA9IHguc2hhcGUubGVuZ3RoO1xuICAgICAgY29uc3QgaXNMb2dpY2FsU2hhcFRleFNoYXBlRXF1YWwgPVxuICAgICAgICAgIHVuaWZvcm1TaGFwZS5sZW5ndGggPT09IDIgJiYgdXRpbC5hcnJheXNFcXVhbCh4LnNoYXBlLCB4VGV4U2hhcGUpO1xuICAgICAgY29uc3QgaXNTY2FsYXIgPSB1dGlsLnNpemVGcm9tU2hhcGUoeC5zaGFwZSkgPT09IDE7XG4gICAgICBjb25zdCBicm9hZGNhc3REaW1zID1cbiAgICAgICAgICBiYWNrZW5kX3V0aWwuZ2V0QnJvYWRjYXN0RGltcyh4LnNoYXBlLCBvdXRwdXQuc2hhcGUpO1xuICAgICAgY29uc3QgaXNJbk91dFRleFNoYXBlRXF1YWwgPSAhcHJvZ3JhbS5wYWNrZWRJbnB1dHMgJiZcbiAgICAgICAgICB4UmFuayA9PT0gb3V0cHV0LnNoYXBlLmxlbmd0aCAmJlxuICAgICAgICAgIHV0aWwuYXJyYXlzRXF1YWwoeFRleFNoYXBlLCBvdXRwdXQudGV4RGF0YS50ZXhTaGFwZSk7XG4gICAgICBjb25zdCBpc1RleFNoYXBlR3JlYXRlclRoYW5PbmUgPVxuICAgICAgICAgIHByb2dyYW0ucGFja2VkSW5wdXRzIHx8IHVuaWZvcm1TaGFwZS5sZW5ndGggPiAyID9cbiAgICAgICAgICAnJyA6XG4gICAgICAgICAgYCR7eFRleFNoYXBlWzBdID4gMX1fJHt4VGV4U2hhcGVbMV0gPiAxfWA7XG4gICAgICAvLyBUaGVzZSBrZXkgY29tcG9uZW50cyBhcmUgbmVlZGVkIGR1ZSB0byBzaGFkZXJfY29tcGlsZXIgaXMgZW1iZWRkaW5nXG4gICAgICAvLyB0aGVtIGluIHRoZSBzaGFkZXIuXG4gICAgICAvLyB8eFJhbmt8IGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBjb29yZHMgbGVuZ3RoLiBTZWVcbiAgICAgIC8vIGdldFtQYWNrZWRdU2FtcGxlckF0T3V0cHV0Q29vcmRzLlxuICAgICAgLy8gfGlzSW5PdXRUZXhTaGFwZUVxdWFsfCBpcyB1c2VkIHRvIGRldGVybWluZSB3aGV0aGVyIGdvaW5nIHRvIGFuXG4gICAgICAvLyBvcHRpbWl6YXRpb24gcGF0aCBpbiBnZXRTYW1wbGVyQXRPdXRwdXRDb29yZHMuXG4gICAgICAvLyB8dXNlU3F1ZWV6ZVNoYXBlfCBpcyBleHRyYWN0ZWQgZnJvbSBzcXVlZXplSW5wdXRJbmZvIG9mXG4gICAgICAvLyBnZXRTYW1wbGVyWzJ8M3w0XUQvZ2V0UGFja2VkU2FtcGxlcjNELlxuICAgICAgLy8gfGlzU2NhbGFyfCBpcyBleHRyYWN0ZWQgZnJvbSBpc0lucHV0U2NhbGFyL2lzT3V0cHV0U2NhbGFyIGluXG4gICAgICAvLyBnZXRQYWNrZWRTYW1wbGVyQXRPdXRwdXRDb29yZHMuXG4gICAgICAvLyB8YnJvYWRjYXN0RGltc3wgaXMgZXh0cmFjdGVkIGZyb20gZ2V0W1BhY2tlZF1TYW1wbGVyQXRPdXRwdXRDb29yZHMuXG4gICAgICAvLyB8aXNMb2dpY2FsU2hhcFRleFNoYXBlRXF1YWx8IGlzIHVzZWQgaW5cbiAgICAgIC8vIGdldE91dHB1dFtQYWNrZWRdMkRDb29yZHMvZ2V0W1BhY2tlZF1TYW1wbGVyMkQuXG4gICAgICAvLyB8cmFuazF8IGlzIHVzZWQgaW4gZ2V0T3V0cHV0UGFja2VkMURDb29yZHMuXG4gICAgICAvLyB8cmFuazJ8IGlzIHVzZWQgaW4gZ2V0T3V0cHV0MkRDb29yZHMuXG4gICAgICAvLyB8cmFuazM0fCBpcyB1c2VkIGluIGdldFNhbXBsZXIzRC9nZXRTYW1wbGVyNEQuXG4gICAgICAvLyB8aXNUZXhTaGFwZUdyZWF0ZXJUaGFuT25lfCBhcmUgdXNlZCBpblxuICAgICAgLy8gZ2V0U2FtcGxlcltTY2FsYXJ8MUR8MkRdL2dldE91dHB1dDFEQ29vcmRzLlxuICAgICAga2V5SW5wdXRzICs9IGAke3hSYW5rfV8ke2lzSW5PdXRUZXhTaGFwZUVxdWFsfV8ke1xuICAgICAgICAgIHVzZVNxdWVlemVTaGFwZSA/IGtlcHREaW1zIDogJyd9XyR7dW5pZm9ybVNoYXBlLmxlbmd0aH1fJHtpc1NjYWxhcn1fJHtcbiAgICAgICAgICBicm9hZGNhc3REaW1zfV8ke2lzTG9naWNhbFNoYXBUZXhTaGFwZUVxdWFsfV8ke3JhbmsxfV8ke3JhbmsyfV8ke1xuICAgICAgICAgIHJhbmszNH1fJHtpc1RleFNoYXBlR3JlYXRlclRoYW5PbmV9XyR7aGFzT2Zmc2V0fWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRleFNoYXBlID0geC5pc1VuaWZvcm0gPyAndW5pZm9ybScgOiB4LnRleERhdGEudGV4U2hhcGU7XG4gICAgICBrZXlJbnB1dHMgKz0gYCR7eC5zaGFwZX1fJHt0ZXhTaGFwZX1fJHtoYXNPZmZzZXR9YDtcbiAgICB9XG4gIH0pO1xuICBjb25zdCBrZXlVc2VyQ29kZSA9IHByb2dyYW0udXNlckNvZGU7XG4gIGxldCBrZXkgPSBwcm9ncmFtLmNvbnN0cnVjdG9yLm5hbWU7XG4gIC8vIEZhc3Qgc3RyaW5nIGNvbmNhdC4gU2VlIGh0dHBzOi8vanNwZXJmLmNvbS9zdHJpbmctY29uY2F0ZW5hdGlvbi8xNC5cbiAga2V5ICs9ICdfJyArIGtleUlucHV0cyArICdfJyArIGtleVVzZXJDb2RlICtcbiAgICAgIGAke2VudigpLmdldE51bWJlcignV0VCR0xfVkVSU0lPTicpfWA7XG4gIHJldHVybiBrZXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VTaGFwZVVuaWZvcm1zKHJhbms6IG51bWJlcikge1xuICAvLyBUT0RPOiBSZW1vdmUgdGhlIGxpbWl0YWlvbiBvZiByYW5rIDw9IDQuXG4gIHJldHVybiBlbnYoKS5nZXRCb29sKCdXRUJHTF9VU0VfU0hBUEVTX1VOSUZPUk1TJykgJiYgcmFuayA8PSA0O1xufVxuIl19