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
import * as tf from './index';
import { ALL_ENVS, describeWithFlags } from './jasmine_util';
import { complex, scalar, tensor2d } from './ops/ops';
import { inferShape } from './tensor_util_env';
import * as util from './util';
import { env } from './environment';
describe('Util', () => {
    it('Correctly gets size from shape', () => {
        expect(util.sizeFromShape([1, 2, 3, 4])).toEqual(24);
    });
    it('Correctly identifies scalars', () => {
        expect(util.isScalarShape([])).toBe(true);
        expect(util.isScalarShape([1, 2])).toBe(false);
        expect(util.isScalarShape([1])).toBe(false);
    });
    it('Number arrays equal', () => {
        expect(util.arraysEqual([1, 2, 3, 6], [1, 2, 3, 6])).toBe(true);
        expect(util.arraysEqual([1, 2], [1, 2, 3])).toBe(false);
        expect(util.arraysEqual([1, 2, 5], [1, 2])).toBe(false);
    });
    it('Arrays shuffle randomly', () => {
        // Create 1000 numbers ordered
        const a = Array.apply(0, { length: 1000 }).map(Number.call, Number).slice(1);
        const b = [].concat(a); // copy ES5 style
        util.shuffle(a);
        expect(a).not.toEqual(b);
        expect(a.length).toEqual(b.length);
    });
    it('Multiple arrays shuffle together', () => {
        // Create 1000 numbers ordered
        const a = Array.apply(0, { length: 1000 }).map(Number.call, Number).slice(1);
        const b = [].concat(a); // copies
        const c = [].concat(a);
        util.shuffleCombo(a, b);
        expect(a).not.toEqual(c);
        expect(a).toEqual(b);
        expect(a.length).toEqual(c.length);
    });
    it('Is integer', () => {
        expect(util.isInt(0.5)).toBe(false);
        expect(util.isInt(1)).toBe(true);
    });
    it('Size to squarish shape (perfect square)', () => {
        expect(util.sizeToSquarishShape(9)).toEqual([3, 3]);
    });
    it('Size to squarish shape (prime number)', () => {
        expect(util.sizeToSquarishShape(11)).toEqual([4, 3]);
    });
    it('Size to squarish shape (almost square)', () => {
        expect(util.sizeToSquarishShape(35)).toEqual([6, 6]);
    });
    it('Size of 1 to squarish shape', () => {
        expect(util.sizeToSquarishShape(1)).toEqual([1, 1]);
    });
    it('infer shape single number', () => {
        expect(inferShape(4)).toEqual([]);
    });
    it('infer shape 1d array', () => {
        expect(inferShape([1, 2, 5])).toEqual([3]);
    });
    it('infer shape 2d array', () => {
        expect(inferShape([[1, 2, 5], [5, 4, 1]])).toEqual([2, 3]);
    });
    it('infer shape 3d array', () => {
        const a = [[[1, 2], [2, 3], [5, 6]], [[5, 6], [4, 5], [1, 2]]];
        expect(inferShape(a)).toEqual([2, 3, 2]);
    });
    it('infer shape 4d array', () => {
        const a = [
            [[[1], [2]], [[2], [3]], [[5], [6]]], [[[5], [6]], [[4], [5]], [[1], [2]]]
        ];
        expect(inferShape(a)).toEqual([2, 3, 2, 1]);
    });
    it('infer shape of typed array', () => {
        const a = new Float32Array([1, 2, 3, 4, 5]);
        expect(inferShape(a)).toEqual([5]);
    });
    it('infer shape of clamped typed array', () => {
        const a = new Uint8ClampedArray([1, 2, 3, 4, 5]);
        expect(inferShape(a)).toEqual([5]);
    });
    it('infer shape of Uint8Array[], string tensor', () => {
        const a = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
        expect(inferShape(a, 'string')).toEqual([2]);
    });
    it('infer shape of Uint8Array[][], string tensor', () => {
        const a = [
            [new Uint8Array([1]), new Uint8Array([2])],
            [new Uint8Array([1]), new Uint8Array([2])]
        ];
        expect(inferShape(a, 'string')).toEqual([2, 2]);
    });
    it('infer shape of Uint8Array[][][], string tensor', () => {
        const a = [
            [[new Uint8Array([1, 2])], [new Uint8Array([2, 1])]],
            [[new Uint8Array([1, 2])], [new Uint8Array([2, 1])]]
        ];
        expect(inferShape(a, 'string')).toEqual([2, 2, 1]);
    });
    describe('isTypedArray', () => {
        it('checks if a value is a typed array', () => {
            expect(util.isTypedArray(new Uint8Array([1, 2, 3]))).toBeTrue();
            expect(util.isTypedArray([1, 2, 3])).toBeFalse();
        });
        it('uses fallback if platform is missing isTypedArray', () => {
            const tmpIsTypedArray = env().platform.isTypedArray;
            try {
                env().platform.isTypedArray = null;
                expect(util.isTypedArray(new Uint8Array([1, 2, 3]))).toBeTrue();
                expect(util.isTypedArray([1, 2, 3])).toBeFalse();
            }
            finally {
                env().platform.isTypedArray = tmpIsTypedArray;
            }
        });
    });
});
describe('util.flatten', () => {
    it('empty', () => {
        const data = [];
        expect(util.flatten(data)).toEqual([]);
    });
    it('nested number arrays', () => {
        expect(util.flatten([[1, 2, 3], [4, 5, 6]])).toEqual([1, 2, 3, 4, 5, 6]);
        expect(util.flatten([[[1, 2], [3, 4], [5, 6], [7, 8]]])).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8
        ]);
        expect(util.flatten([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6]);
    });
    it('nested string arrays', () => {
        expect(util.flatten([['a', 'b'], ['c', [['d']]]])).toEqual([
            'a', 'b', 'c', 'd'
        ]);
        expect(util.flatten([['a', ['b']], ['c', [['d']], 'e']])).toEqual([
            'a', 'b', 'c', 'd', 'e'
        ]);
    });
    it('mixed TypedArray and number[]', () => {
        const data = [new Float32Array([1, 2]), 3, [4, 5, new Float32Array([6, 7])]];
        expect(util.flatten(data)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
    it('nested Uint8Arrays, skipTypedArray=true', () => {
        const data = [
            [new Uint8Array([1, 2]), new Uint8Array([3, 4])],
            [new Uint8Array([5, 6]), new Uint8Array([7, 8])]
        ];
        expect(util.flatten(data, [], true)).toEqual([
            new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5, 6]),
            new Uint8Array([7, 8])
        ]);
    });
    it('Int8Array', () => {
        const data = [new Int8Array([1, 2])];
        expect(util.flatten(data)).toEqual([1, 2]);
    });
    it('index signature', () => {
        const data = { 0: 1, 1: 2 };
        // Will be ignored since array iteration ignores negatives.
        data[-1] = -1;
        // Will be ignored since non-integer array keys are ignored.
        data[3.2] = 4;
        expect(util.flatten(data)).toEqual([1, 2]);
    });
});
function encodeStrings(a) {
    return a.map(s => util.encodeString(s));
}
describe('util.bytesFromStringArray', () => {
    it('count bytes after utf8 encoding', () => {
        expect(util.bytesFromStringArray(encodeStrings(['a', 'bb', 'ccc'])))
            .toBe(6);
        expect(util.bytesFromStringArray(encodeStrings(['a', 'bb', 'cccddd'])))
            .toBe(9);
        expect(util.bytesFromStringArray(encodeStrings(['даниел']))).toBe(6 * 2);
    });
});
describe('util.inferDtype', () => {
    it('a single string => string', () => {
        expect(util.inferDtype('hello')).toBe('string');
    });
    it('a single boolean => bool', () => {
        expect(util.inferDtype(true)).toBe('bool');
        expect(util.inferDtype(false)).toBe('bool');
    });
    it('a single number => float32', () => {
        expect(util.inferDtype(0)).toBe('float32');
        expect(util.inferDtype(34)).toBe('float32');
    });
    it('a list of strings => string', () => {
        // Flat.
        expect(util.inferDtype(['a', 'b', 'c'])).toBe('string');
        // Nested.
        expect(util.inferDtype([
            [['a']], [['b']], [['c']], [['d']]
        ])).toBe('string');
    });
    it('a list of bools => float32', () => {
        // Flat.
        expect(util.inferDtype([false, true, false])).toBe('bool');
        // Nested.
        expect(util.inferDtype([
            [[true]], [[false]], [[true]], [[true]]
        ])).toBe('bool');
    });
    it('a list of numbers => float32', () => {
        // Flat.
        expect(util.inferDtype([0, 1, 2])).toBe('float32');
        // Nested.
        expect(util.inferDtype([[[0]], [[1]], [[2]], [[3]]])).toBe('float32');
    });
});
describe('util.repeatedTry', () => {
    it('resolves', (doneFn) => {
        let counter = 0;
        const checkFn = () => {
            counter++;
            if (counter === 2) {
                return true;
            }
            return false;
        };
        util.repeatedTry(checkFn).then(doneFn).catch(() => {
            throw new Error('Rejected backoff.');
        });
    });
    it('rejects', (doneFn) => {
        const checkFn = () => false;
        util.repeatedTry(checkFn, () => 0, 5)
            .then(() => {
            throw new Error('Backoff resolved');
        })
            .catch(doneFn);
    });
});
describe('util.inferFromImplicitShape', () => {
    it('empty shape', () => {
        const result = util.inferFromImplicitShape([], 0);
        expect(result).toEqual([]);
    });
    it('[2, 3, 4] -> [2, 3, 4]', () => {
        const result = util.inferFromImplicitShape([2, 3, 4], 24);
        expect(result).toEqual([2, 3, 4]);
    });
    it('[2, -1, 4] -> [2, 3, 4], size=24', () => {
        const result = util.inferFromImplicitShape([2, -1, 4], 24);
        expect(result).toEqual([2, 3, 4]);
    });
    it('[-1, 3, 4] -> [2, 3, 4], size=24', () => {
        const result = util.inferFromImplicitShape([-1, 3, 4], 24);
        expect(result).toEqual([2, 3, 4]);
    });
    it('[2, 3, -1] -> [2, 3, 4], size=24', () => {
        const result = util.inferFromImplicitShape([2, 3, -1], 24);
        expect(result).toEqual([2, 3, 4]);
    });
    it('[2, -1, -1] throws error', () => {
        expect(() => util.inferFromImplicitShape([2, -1, -1], 24)).toThrowError();
    });
    it('[2, 3, -1] size=13 throws error', () => {
        expect(() => util.inferFromImplicitShape([2, 3, -1], 13)).toThrowError();
    });
    it('[2, 3, 4] size=25 (should be 24) throws error', () => {
        expect(() => util.inferFromImplicitShape([2, 3, 4], 25)).toThrowError();
    });
});
describe('util parseAxisParam', () => {
    it('axis=null returns no axes for scalar', () => {
        const axis = null;
        const shape = [];
        expect(util.parseAxisParam(axis, shape)).toEqual([]);
    });
    it('axis=null returns 0 axis for Tensor1D', () => {
        const axis = null;
        const shape = [4];
        expect(util.parseAxisParam(axis, shape)).toEqual([0]);
    });
    it('axis=null returns all axes for Tensor3D', () => {
        const axis = null;
        const shape = [3, 1, 2];
        expect(util.parseAxisParam(axis, shape)).toEqual([0, 1, 2]);
    });
    it('axis as a single number', () => {
        const axis = 1;
        const shape = [3, 1, 2];
        expect(util.parseAxisParam(axis, shape)).toEqual([1]);
    });
    it('axis as single negative number', () => {
        const axis = -1;
        const shape = [3, 1, 2];
        expect(util.parseAxisParam(axis, shape)).toEqual([2]);
        const axis2 = -2;
        expect(util.parseAxisParam(axis2, shape)).toEqual([1]);
        const axis3 = -3;
        expect(util.parseAxisParam(axis3, shape)).toEqual([0]);
    });
    it('axis as list of negative numbers', () => {
        const axis = [-1, -3];
        const shape = [3, 1, 2];
        expect(util.parseAxisParam(axis, shape)).toEqual([2, 0]);
    });
    it('axis as list of positive numbers', () => {
        const axis = [0, 2];
        const shape = [3, 1, 2];
        expect(util.parseAxisParam(axis, shape)).toEqual([0, 2]);
    });
    it('axis as combo of positive and negative numbers', () => {
        const axis = [0, -1];
        const shape = [3, 1, 2];
        expect(util.parseAxisParam(axis, shape)).toEqual([0, 2]);
    });
    it('axis out of range throws error', () => {
        const axis = -4;
        const shape = [3, 1, 2];
        expect(() => util.parseAxisParam(axis, shape)).toThrowError();
        const axis2 = 4;
        expect(() => util.parseAxisParam(axis2, shape)).toThrowError();
    });
    it('axis a list with one number out of range throws error', () => {
        const axis = [0, 4];
        const shape = [3, 1, 2];
        expect(() => util.parseAxisParam(axis, shape)).toThrowError();
    });
    it('axis with decimal value throws error', () => {
        const axis = 0.5;
        const shape = [3, 1, 2];
        expect(() => util.parseAxisParam(axis, shape)).toThrowError();
    });
});
describe('util.squeezeShape', () => {
    it('scalar', () => {
        const { newShape, keptDims } = util.squeezeShape([]);
        expect(newShape).toEqual([]);
        expect(keptDims).toEqual([]);
    });
    it('1x1 reduced to scalar', () => {
        const { newShape, keptDims } = util.squeezeShape([1, 1]);
        expect(newShape).toEqual([]);
        expect(keptDims).toEqual([]);
    });
    it('1x3x1 reduced to [3]', () => {
        const { newShape, keptDims } = util.squeezeShape([1, 3, 1]);
        expect(newShape).toEqual([3]);
        expect(keptDims).toEqual([1]);
    });
    it('1x1x4 reduced to [4]', () => {
        const { newShape, keptDims } = util.squeezeShape([1, 1, 4]);
        expect(newShape).toEqual([4]);
        expect(keptDims).toEqual([2]);
    });
    it('2x3x4 not reduction', () => {
        const { newShape, keptDims } = util.squeezeShape([2, 3, 4]);
        expect(newShape).toEqual([2, 3, 4]);
        expect(keptDims).toEqual([0, 1, 2]);
    });
    describe('with axis', () => {
        it('should only reduce dimensions specified by axis', () => {
            const { newShape, keptDims } = util.squeezeShape([1, 1, 1, 1, 4], [1, 2]);
            expect(newShape).toEqual([1, 1, 4]);
            expect(keptDims).toEqual([0, 3, 4]);
        });
        it('should only reduce dimensions specified by negative axis', () => {
            const { newShape, keptDims } = util.squeezeShape([1, 1, 1, 1, 4], [-2, -3]);
            expect(newShape).toEqual([1, 1, 4]);
            expect(keptDims).toEqual([0, 1, 4]);
        });
        it('should only reduce dimensions specified by negative axis', () => {
            const axis = [-2, -3];
            util.squeezeShape([1, 1, 1, 1, 4], axis);
            expect(axis).toEqual([-2, -3]);
        });
        it('throws error when specified axis is not squeezable', () => {
            expect(() => util.squeezeShape([1, 1, 2, 1, 4], [1, 2])).toThrowError();
        });
        it('throws error when specified negative axis is not squeezable', () => {
            expect(() => util.squeezeShape([1, 1, 2, 1, 4], [-1, -2])).toThrowError();
        });
        it('throws error when specified axis is out of range', () => {
            expect(() => util.squeezeShape([1, 1, 2, 1, 4], [11, 22])).toThrowError();
        });
        it('throws error when specified negative axis is out of range', () => {
            expect(() => util.squeezeShape([1, 1, 2, 1, 4], [
                -11, -22
            ])).toThrowError();
        });
    });
});
describe('util.checkConversionForErrors', () => {
    it('Float32Array has NaN', () => {
        expect(() => util.checkConversionForErrors(new Float32Array([1, 2, 3, NaN, 4, 255]), 'float32'))
            .toThrowError();
    });
    it('Float32Array has Infinity', () => {
        expect(() => util.checkConversionForErrors(new Float32Array([1, 2, 3, Infinity, 4, 255]), 'float32'))
            .toThrowError();
    });
    it('Int32Array has NaN', () => {
        expect(() => util.checkConversionForErrors([1, 2, 3, 4, NaN], 'int32'))
            .toThrowError();
    });
});
describe('util.hasEncodingLoss', () => {
    it('complex64 to any', () => {
        expect(util.hasEncodingLoss('complex64', 'complex64')).toBe(false);
        expect(util.hasEncodingLoss('complex64', 'float32')).toBe(true);
        expect(util.hasEncodingLoss('complex64', 'int32')).toBe(true);
        expect(util.hasEncodingLoss('complex64', 'bool')).toBe(true);
    });
    it('any to complex64', () => {
        expect(util.hasEncodingLoss('bool', 'complex64')).toBe(false);
        expect(util.hasEncodingLoss('int32', 'complex64')).toBe(false);
        expect(util.hasEncodingLoss('float32', 'complex64')).toBe(false);
        expect(util.hasEncodingLoss('complex64', 'complex64')).toBe(false);
    });
    it('any to float32', () => {
        expect(util.hasEncodingLoss('bool', 'float32')).toBe(false);
        expect(util.hasEncodingLoss('int32', 'float32')).toBe(false);
        expect(util.hasEncodingLoss('float32', 'float32')).toBe(false);
        expect(util.hasEncodingLoss('complex64', 'float32')).toBe(true);
    });
    it('float32 to any', () => {
        expect(util.hasEncodingLoss('float32', 'float32')).toBe(false);
        expect(util.hasEncodingLoss('float32', 'int32')).toBe(true);
        expect(util.hasEncodingLoss('float32', 'bool')).toBe(true);
        expect(util.hasEncodingLoss('float32', 'complex64')).toBe(false);
    });
    it('int32 to lower', () => {
        expect(util.hasEncodingLoss('int32', 'int32')).toBe(false);
        expect(util.hasEncodingLoss('int32', 'bool')).toBe(true);
    });
    it('lower to int32', () => {
        expect(util.hasEncodingLoss('bool', 'int32')).toBe(false);
    });
    it('bool to bool', () => {
        expect(util.hasEncodingLoss('bool', 'bool')).toBe(false);
    });
});
describeWithFlags('util.toNestedArray', ALL_ENVS, () => {
    it('2 dimensions', () => {
        const a = new Float32Array([1, 2, 3, 4, 5, 6]);
        expect(util.toNestedArray([2, 3], a)).toEqual([[1, 2, 3], [4, 5, 6]]);
    });
    it('3 dimensions (2x2x3)', () => {
        const a = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(util.toNestedArray([2, 2, 3], a)).toEqual([
            [[0, 1, 2], [3, 4, 5]], [[6, 7, 8], [9, 10, 11]]
        ]);
    });
    it('3 dimensions (3x2x2)', () => {
        const a = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(util.toNestedArray([3, 2, 2], a)).toEqual([
            [[0, 1], [2, 3]], [[4, 5], [6, 7]], [[8, 9], [10, 11]]
        ]);
    });
    it('invalid dimension', () => {
        const a = new Float32Array([1, 2, 3]);
        expect(() => util.toNestedArray([2, 2], a)).toThrowError();
    });
    it('tensor to nested array', async () => {
        const x = tensor2d([1, 2, 3, 4], [2, 2]);
        expect(util.toNestedArray(x.shape, await x.data())).toEqual([
            [1, 2], [3, 4]
        ]);
    });
    it('scalar to nested array', async () => {
        const x = scalar(1);
        expect(util.toNestedArray(x.shape, await x.data())).toEqual(1);
    });
    it('tensor with zero shape', () => {
        const a = new Float32Array([0, 1]);
        expect(util.toNestedArray([1, 0, 2], a)).toEqual([]);
    });
});
describeWithFlags('util.toNestedArray for a complex tensor', ALL_ENVS, () => {
    it('2 dimensions', () => {
        const a = new Float32Array([1, 11, 2, 12, 3, 13, 4, 14, 5, 15, 6, 16]);
        expect(util.toNestedArray([2, 3], a, true)).toEqual([
            [1, 11, 2, 12, 3, 13], [4, 14, 5, 15, 6, 16]
        ]);
    });
    it('3 dimensions (2x2x3)', () => {
        const a = new Float32Array([
            0, 50, 1, 51, 2, 52, 3, 53, 4, 54, 5, 55,
            6, 56, 7, 57, 8, 58, 9, 59, 10, 60, 11, 61
        ]);
        expect(util.toNestedArray([2, 2, 3], a, true)).toEqual([
            [[0, 50, 1, 51, 2, 52], [3, 53, 4, 54, 5, 55]],
            [[6, 56, 7, 57, 8, 58], [9, 59, 10, 60, 11, 61]]
        ]);
    });
    it('3 dimensions (3x2x2)', () => {
        const a = new Float32Array([
            0, 50, 1, 51, 2, 52, 3, 53, 4, 54, 5, 55,
            6, 56, 7, 57, 8, 58, 9, 59, 10, 60, 11, 61
        ]);
        expect(util.toNestedArray([3, 2, 2], a, true)).toEqual([
            [[0, 50, 1, 51], [2, 52, 3, 53]], [[4, 54, 5, 55], [6, 56, 7, 57]],
            [[8, 58, 9, 59], [10, 60, 11, 61]]
        ]);
    });
    it('invalid dimension', () => {
        const a = new Float32Array([1, 11, 2, 12, 3, 13]);
        expect(() => util.toNestedArray([2, 2], a, true)).toThrowError();
    });
    it('tensor to nested array', async () => {
        const x = complex([[1, 2], [3, 4]], [[11, 12], [13, 14]]);
        expect(util.toNestedArray(x.shape, await x.data(), true)).toEqual([
            [1, 11, 2, 12], [3, 13, 4, 14]
        ]);
    });
});
describe('util.fetch', () => {
    it('should call the platform fetch', () => {
        spyOn(tf.env().platform, 'fetch')
            .and.callFake(async () => ({}));
        util.fetch('test/path', { method: 'GET' });
        expect(tf.env().platform.fetch).toHaveBeenCalledWith('test/path', {
            method: 'GET'
        });
    });
});
describe('util.encodeString', () => {
    it('Encode an empty string, default encoding', () => {
        const res = util.encodeString('');
        expect(res).toEqual(new Uint8Array([]));
    });
    it('Encode an empty string, utf-8 encoding', () => {
        const res = util.encodeString('', 'utf-8');
        expect(res).toEqual(new Uint8Array([]));
    });
    it('Encode an empty string, invalid decoding', () => {
        expect(() => util.encodeString('', 'foobarbax')).toThrowError();
    });
    it('Encode cyrillic letters', () => {
        const res = util.encodeString('Kaкo стe');
        expect(res).toEqual(new Uint8Array([75, 97, 208, 186, 111, 32, 209, 129, 209, 130, 101]));
    });
    it('Encode ascii letters', () => {
        const res = util.encodeString('hello');
        expect(res).toEqual(new Uint8Array([104, 101, 108, 108, 111]));
    });
});
describe('util.decodeString', () => {
    it('decode an empty string', () => {
        const s = util.decodeString(new Uint8Array([]));
        expect(s).toEqual('');
    });
    it('decode ascii', () => {
        const s = util.decodeString(new Uint8Array([104, 101, 108, 108, 111]));
        expect(s).toEqual('hello');
    });
    it('decode cyrillic', () => {
        const s = util.decodeString(new Uint8Array([75, 97, 208, 186, 111, 32, 209, 129, 209, 130, 101]));
        expect(s).toEqual('Kaкo стe');
    });
    it('decode utf-16', () => {
        const s = util.decodeString(new Uint8Array([255, 254, 237, 139, 0, 138, 4, 89, 6, 116]), 'utf-16');
        // UTF-16 allows optional presence of byte-order-mark (BOM)
        // Construct string for '语言处理', with and without BOM
        const expected = String.fromCodePoint(0x8bed, 0x8a00, 0x5904, 0x7406);
        const expectedBOM = String.fromCodePoint(0xfeff, 0x8bed, 0x8a00, 0x5904, 0x7406);
        if (s.codePointAt(0) === 0xfeff) {
            expect(s).toEqual(expectedBOM);
        }
        else {
            expect(s).toEqual(expected);
        }
    });
    it('assert promise', () => {
        const promise = new Promise(() => { });
        expect(util.isPromise(promise)).toBeTruthy();
        const promise2 = { then: () => { } };
        expect(util.isPromise(promise2)).toBeTruthy();
        const promise3 = {};
        expect(util.isPromise(promise3)).toBeFalsy();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbF90ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy91dGlsX3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDOUIsT0FBTyxFQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQzNELE9BQU8sRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwRCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDN0MsT0FBTyxLQUFLLElBQUksTUFBTSxRQUFRLENBQUM7QUFDL0IsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUVsQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUNwQixFQUFFLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFD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QUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxHQUFHO1lBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFD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LENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQy9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUN2RCxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0QyxNQUFNLENBQUMs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QyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNuQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ2hFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDL0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQzFCLEVBQUUsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDeEMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO2FBQzVCLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQTBCLENBQUEsQ0FBQyxDQUFDO1FBRTNELElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFFekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQ2hFLE1BQU0sRUFBRSxLQUFLO1NBQ2QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNsRSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUNmLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDdEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FDdkIsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUN2QixJQUFJLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFM0UsMkRBQTJEO1FBQzNELG9EQUFvRDtRQUNwRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sV0FBVyxHQUNiLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWpFLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLEVBQUU7WUFDL0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNoQzthQUFNO1lBQ0wsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM3QjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzdDLE1BQU0sUUFBUSxHQUFHLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDOUMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0ICogYXMgdGYgZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQge0FMTF9FTlZTLCBkZXNjcmliZVdpdGhGbGFnc30gZnJvbSAnLi9qYXNtaW5lX3V0aWwnO1xuaW1wb3J0IHtjb21wbGV4LCBzY2FsYXIsIHRlbnNvcjJkfSBmcm9tICcuL29wcy9vcHMnO1xuaW1wb3J0IHtpbmZlclNoYXBlfSBmcm9tICcuL3RlbnNvcl91dGlsX2Vudic7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCc7XG5pbXBvcnQge2Vudn0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5cbmRlc2NyaWJlKCdVdGlsJywgKCkgPT4ge1xuICBpdCgnQ29ycmVjdGx5IGdldHMgc2l6ZSBmcm9tIHNoYXBlJywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLnNpemVGcm9tU2hhcGUoWzEsIDIsIDMsIDRdKSkudG9FcXVhbCgyNCk7XG4gIH0pO1xuXG4gIGl0KCdDb3JyZWN0bHkgaWRlbnRpZmllcyBzY2FsYXJzJywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLmlzU2NhbGFyU2hhcGUoW10pKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCh1dGlsLmlzU2NhbGFyU2hhcGUoWzEsIDJdKSkudG9CZShmYWxzZSk7XG4gICAgZXhwZWN0KHV0aWwuaXNTY2FsYXJTaGFwZShbMV0pKS50b0JlKGZhbHNlKTtcbiAgfSk7XG5cbiAgaXQoJ051bWJlciBhcnJheXMgZXF1YWwnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHV0aWwuYXJyYXlzRXF1YWwoWzEsIDIsIDMsIDZdLCBbMSwgMiwgMywgNl0pKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCh1dGlsLmFycmF5c0VxdWFsKFsxLCAyXSwgWzEsIDIsIDNdKSkudG9CZShmYWxzZSk7XG4gICAgZXhwZWN0KHV0aWwuYXJyYXlzRXF1YWwoWzEsIDIsIDVdLCBbMSwgMl0pKS50b0JlKGZhbHNlKTtcbiAgfSk7XG5cbiAgaXQoJ0FycmF5cyBzaHVmZmxlIHJhbmRvbWx5JywgKCkgPT4ge1xuICAgIC8vIENyZWF0ZSAxMDAwIG51bWJlcnMgb3JkZXJlZFxuICAgIGNvbnN0IGEgPSBBcnJheS5hcHBseSgwLCB7bGVuZ3RoOiAxMDAwfSkubWFwKE51bWJlci5jYWxsLCBOdW1iZXIpLnNsaWNlKDEpO1xuICAgIGNvbnN0IGIgPSBbXS5jb25jYXQoYSk7ICAvLyBjb3B5IEVTNSBzdHlsZVxuICAgIHV0aWwuc2h1ZmZsZShhKTtcbiAgICBleHBlY3QoYSkubm90LnRvRXF1YWwoYik7XG4gICAgZXhwZWN0KGEubGVuZ3RoKS50b0VxdWFsKGIubGVuZ3RoKTtcbiAgfSk7XG5cbiAgaXQoJ011bHRpcGxlIGFycmF5cyBzaHVmZmxlIHRvZ2V0aGVyJywgKCkgPT4ge1xuICAgIC8vIENyZWF0ZSAxMDAwIG51bWJlcnMgb3JkZXJlZFxuICAgIGNvbnN0IGEgPSBBcnJheS5hcHBseSgwLCB7bGVuZ3RoOiAxMDAwfSkubWFwKE51bWJlci5jYWxsLCBOdW1iZXIpLnNsaWNlKDEpO1xuICAgIGNvbnN0IGIgPSBbXS5jb25jYXQoYSk7ICAvLyBjb3BpZXNcbiAgICBjb25zdCBjID0gW10uY29uY2F0KGEpO1xuICAgIHV0aWwuc2h1ZmZsZUNvbWJvKGEsIGIpO1xuICAgIGV4cGVjdChhKS5ub3QudG9FcXVhbChjKTtcbiAgICBleHBlY3QoYSkudG9FcXVhbChiKTtcbiAgICBleHBlY3QoYS5sZW5ndGgpLnRvRXF1YWwoYy5sZW5ndGgpO1xuICB9KTtcblxuICBpdCgnSXMgaW50ZWdlcicsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5pc0ludCgwLjUpKS50b0JlKGZhbHNlKTtcbiAgICBleHBlY3QodXRpbC5pc0ludCgxKSkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgaXQoJ1NpemUgdG8gc3F1YXJpc2ggc2hhcGUgKHBlcmZlY3Qgc3F1YXJlKScsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5zaXplVG9TcXVhcmlzaFNoYXBlKDkpKS50b0VxdWFsKFszLCAzXSk7XG4gIH0pO1xuXG4gIGl0KCdTaXplIHRvIHNxdWFyaXNoIHNoYXBlIChwcmltZSBudW1iZXIpJywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLnNpemVUb1NxdWFyaXNoU2hhcGUoMTEpKS50b0VxdWFsKFs0LCAzXSk7XG4gIH0pO1xuXG4gIGl0KCdTaXplIHRvIHNxdWFyaXNoIHNoYXBlIChhbG1vc3Qgc3F1YXJlKScsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5zaXplVG9TcXVhcmlzaFNoYXBlKDM1KSkudG9FcXVhbChbNiwgNl0pO1xuICB9KTtcblxuICBpdCgnU2l6ZSBvZiAxIHRvIHNxdWFyaXNoIHNoYXBlJywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLnNpemVUb1NxdWFyaXNoU2hhcGUoMSkpLnRvRXF1YWwoWzEsIDFdKTtcbiAgfSk7XG5cbiAgaXQoJ2luZmVyIHNoYXBlIHNpbmdsZSBudW1iZXInLCAoKSA9PiB7XG4gICAgZXhwZWN0KGluZmVyU2hhcGUoNCkpLnRvRXF1YWwoW10pO1xuICB9KTtcblxuICBpdCgnaW5mZXIgc2hhcGUgMWQgYXJyYXknLCAoKSA9PiB7XG4gICAgZXhwZWN0KGluZmVyU2hhcGUoWzEsIDIsIDVdKSkudG9FcXVhbChbM10pO1xuICB9KTtcblxuICBpdCgnaW5mZXIgc2hhcGUgMmQgYXJyYXknLCAoKSA9PiB7XG4gICAgZXhwZWN0KGluZmVyU2hhcGUoW1sxLCAyLCA1XSwgWzUsIDQsIDFdXSkpLnRvRXF1YWwoWzIsIDNdKTtcbiAgfSk7XG5cbiAgaXQoJ2luZmVyIHNoYXBlIDNkIGFycmF5JywgKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBbW1sxLCAyXSwgWzIsIDNdLCBbNSwgNl1dLCBbWzUsIDZdLCBbNCwgNV0sIFsxLCAyXV1dO1xuICAgIGV4cGVjdChpbmZlclNoYXBlKGEpKS50b0VxdWFsKFsyLCAzLCAyXSk7XG4gIH0pO1xuXG4gIGl0KCdpbmZlciBzaGFwZSA0ZCBhcnJheScsICgpID0+IHtcbiAgICBjb25zdCBhID0gW1xuICAgICAgW1tbMV0sIFsyXV0sIFtbMl0sIFszXV0sIFtbNV0sIFs2XV1dLCBbW1s1XSwgWzZdXSwgW1s0XSwgWzVdXSwgW1sxXSwgWzJdXV1cbiAgICBdO1xuICAgIGV4cGVjdChpbmZlclNoYXBlKGEpKS50b0VxdWFsKFsyLCAzLCAyLCAxXSk7XG4gIH0pO1xuXG4gIGl0KCdpbmZlciBzaGFwZSBvZiB0eXBlZCBhcnJheScsICgpID0+IHtcbiAgICBjb25zdCBhID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMiwgMywgNCwgNV0pO1xuICAgIGV4cGVjdChpbmZlclNoYXBlKGEpKS50b0VxdWFsKFs1XSk7XG4gIH0pO1xuXG4gIGl0KCdpbmZlciBzaGFwZSBvZiBjbGFtcGVkIHR5cGVkIGFycmF5JywgKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBuZXcgVWludDhDbGFtcGVkQXJyYXkoWzEsIDIsIDMsIDQsIDVdKTtcbiAgICBleHBlY3QoaW5mZXJTaGFwZShhKSkudG9FcXVhbChbNV0pO1xuICB9KTtcblxuICBpdCgnaW5mZXIgc2hhcGUgb2YgVWludDhBcnJheVtdLCBzdHJpbmcgdGVuc29yJywgKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBbbmV3IFVpbnQ4QXJyYXkoWzEsIDJdKSwgbmV3IFVpbnQ4QXJyYXkoWzMsIDRdKV07XG4gICAgZXhwZWN0KGluZmVyU2hhcGUoYSwgJ3N0cmluZycpKS50b0VxdWFsKFsyXSk7XG4gIH0pO1xuXG4gIGl0KCdpbmZlciBzaGFwZSBvZiBVaW50OEFycmF5W11bXSwgc3RyaW5nIHRlbnNvcicsICgpID0+IHtcbiAgICBjb25zdCBhID0gW1xuICAgICAgW25ldyBVaW50OEFycmF5KFsxXSksIG5ldyBVaW50OEFycmF5KFsyXSldLFxuICAgICAgW25ldyBVaW50OEFycmF5KFsxXSksIG5ldyBVaW50OEFycmF5KFsyXSldXG4gICAgXTtcbiAgICBleHBlY3QoaW5mZXJTaGFwZShhLCAnc3RyaW5nJykpLnRvRXF1YWwoWzIsIDJdKTtcbiAgfSk7XG5cbiAgaXQoJ2luZmVyIHNoYXBlIG9mIFVpbnQ4QXJyYXlbXVtdW10sIHN0cmluZyB0ZW5zb3InLCAoKSA9PiB7XG4gICAgY29uc3QgYSA9IFtcbiAgICAgIFtbbmV3IFVpbnQ4QXJyYXkoWzEsIDJdKV0sIFtuZXcgVWludDhBcnJheShbMiwgMV0pXV0sXG4gICAgICBbW25ldyBVaW50OEFycmF5KFsxLCAyXSldLCBbbmV3IFVpbnQ4QXJyYXkoWzIsIDFdKV1dXG4gICAgXTtcbiAgICBleHBlY3QoaW5mZXJTaGFwZShhLCAnc3RyaW5nJykpLnRvRXF1YWwoWzIsIDIsIDFdKTtcbiAgfSk7XG4gIGRlc2NyaWJlKCdpc1R5cGVkQXJyYXknLCAoKSA9PiB7XG4gICAgaXQoJ2NoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdHlwZWQgYXJyYXknLCAoKSA9PiB7XG4gICAgICBleHBlY3QodXRpbC5pc1R5cGVkQXJyYXkobmV3IFVpbnQ4QXJyYXkoWzEsMiwzXSkpKS50b0JlVHJ1ZSgpO1xuICAgICAgZXhwZWN0KHV0aWwuaXNUeXBlZEFycmF5KFsxLDIsM10pKS50b0JlRmFsc2UoKTtcbiAgICB9KTtcbiAgICBpdCgndXNlcyBmYWxsYmFjayBpZiBwbGF0Zm9ybSBpcyBtaXNzaW5nIGlzVHlwZWRBcnJheScsICgpID0+IHtcbiAgICAgIGNvbnN0IHRtcElzVHlwZWRBcnJheSA9IGVudigpLnBsYXRmb3JtLmlzVHlwZWRBcnJheTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGVudigpLnBsYXRmb3JtLmlzVHlwZWRBcnJheSA9IG51bGw7XG4gICAgICAgIGV4cGVjdCh1dGlsLmlzVHlwZWRBcnJheShuZXcgVWludDhBcnJheShbMSwyLDNdKSkpLnRvQmVUcnVlKCk7XG4gICAgICAgIGV4cGVjdCh1dGlsLmlzVHlwZWRBcnJheShbMSwyLDNdKSkudG9CZUZhbHNlKCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBlbnYoKS5wbGF0Zm9ybS5pc1R5cGVkQXJyYXkgPSB0bXBJc1R5cGVkQXJyYXk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCd1dGlsLmZsYXR0ZW4nLCAoKSA9PiB7XG4gIGl0KCdlbXB0eScsICgpID0+IHtcbiAgICBjb25zdCBkYXRhOiBudW1iZXJbXSA9IFtdO1xuICAgIGV4cGVjdCh1dGlsLmZsYXR0ZW4oZGF0YSkpLnRvRXF1YWwoW10pO1xuICB9KTtcblxuICBpdCgnbmVzdGVkIG51bWJlciBhcnJheXMnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHV0aWwuZmxhdHRlbihbWzEsIDIsIDNdLCBbNCwgNSwgNl1dKSkudG9FcXVhbChbMSwgMiwgMywgNCwgNSwgNl0pO1xuICAgIGV4cGVjdCh1dGlsLmZsYXR0ZW4oW1tbMSwgMl0sIFszLCA0XSwgWzUsIDZdLCBbNywgOF1dXSkpLnRvRXF1YWwoW1xuICAgICAgMSwgMiwgMywgNCwgNSwgNiwgNywgOFxuICAgIF0pO1xuICAgIGV4cGVjdCh1dGlsLmZsYXR0ZW4oWzEsIDIsIDMsIDQsIDUsIDZdKSkudG9FcXVhbChbMSwgMiwgMywgNCwgNSwgNl0pO1xuICB9KTtcblxuICBpdCgnbmVzdGVkIHN0cmluZyBhcnJheXMnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHV0aWwuZmxhdHRlbihbWydhJywgJ2InXSwgWydjJywgW1snZCddXV1dKSkudG9FcXVhbChbXG4gICAgICAnYScsICdiJywgJ2MnLCAnZCdcbiAgICBdKTtcbiAgICBleHBlY3QodXRpbC5mbGF0dGVuKFtbJ2EnLCBbJ2InXV0sIFsnYycsIFtbJ2QnXV0sICdlJ11dKSkudG9FcXVhbChbXG4gICAgICAnYScsICdiJywgJ2MnLCAnZCcsICdlJ1xuICAgIF0pO1xuICB9KTtcblxuICBpdCgnbWl4ZWQgVHlwZWRBcnJheSBhbmQgbnVtYmVyW10nLCAoKSA9PiB7XG4gICAgY29uc3QgZGF0YSA9XG4gICAgICAgIFtuZXcgRmxvYXQzMkFycmF5KFsxLCAyXSksIDMsIFs0LCA1LCBuZXcgRmxvYXQzMkFycmF5KFs2LCA3XSldXTtcbiAgICBleHBlY3QodXRpbC5mbGF0dGVuKGRhdGEpKS50b0VxdWFsKFsxLCAyLCAzLCA0LCA1LCA2LCA3XSk7XG4gIH0pO1xuXG4gIGl0KCduZXN0ZWQgVWludDhBcnJheXMsIHNraXBUeXBlZEFycmF5PXRydWUnLCAoKSA9PiB7XG4gICAgY29uc3QgZGF0YSA9IFtcbiAgICAgIFtuZXcgVWludDhBcnJheShbMSwgMl0pLCBuZXcgVWludDhBcnJheShbMywgNF0pXSxcbiAgICAgIFtuZXcgVWludDhBcnJheShbNSwgNl0pLCBuZXcgVWludDhBcnJheShbNywgOF0pXVxuICAgIF07XG4gICAgZXhwZWN0KHV0aWwuZmxhdHRlbihkYXRhLCBbXSwgdHJ1ZSkpLnRvRXF1YWwoW1xuICAgICAgbmV3IFVpbnQ4QXJyYXkoWzEsIDJdKSwgbmV3IFVpbnQ4QXJyYXkoWzMsIDRdKSwgbmV3IFVpbnQ4QXJyYXkoWzUsIDZdKSxcbiAgICAgIG5ldyBVaW50OEFycmF5KFs3LCA4XSlcbiAgICBdKTtcbiAgfSk7XG5cbiAgaXQoJ0ludDhBcnJheScsICgpID0+IHtcbiAgICBjb25zdCBkYXRhID0gW25ldyBJbnQ4QXJyYXkoWzEsIDJdKV07XG4gICAgZXhwZWN0KHV0aWwuZmxhdHRlbihkYXRhKSkudG9FcXVhbChbMSwgMl0pO1xuICB9KTtcblxuICBpdCgnaW5kZXggc2lnbmF0dXJlJywgKCkgPT4ge1xuICAgIGNvbnN0IGRhdGE6IHtbaW5kZXg6IG51bWJlcl06IG51bWJlcn0gPSB7MDogMSwgMTogMn07XG4gICAgLy8gV2lsbCBiZSBpZ25vcmVkIHNpbmNlIGFycmF5IGl0ZXJhdGlvbiBpZ25vcmVzIG5lZ2F0aXZlcy5cbiAgICBkYXRhWy0xXSA9IC0xO1xuICAgIC8vIFdpbGwgYmUgaWdub3JlZCBzaW5jZSBub24taW50ZWdlciBhcnJheSBrZXlzIGFyZSBpZ25vcmVkLlxuICAgIGRhdGFbMy4yXSA9IDQ7XG4gICAgZXhwZWN0KHV0aWwuZmxhdHRlbihkYXRhKSkudG9FcXVhbChbMSwgMl0pO1xuICB9KTtcbn0pO1xuXG5mdW5jdGlvbiBlbmNvZGVTdHJpbmdzKGE6IHN0cmluZ1tdKTogVWludDhBcnJheVtdIHtcbiAgcmV0dXJuIGEubWFwKHMgPT4gdXRpbC5lbmNvZGVTdHJpbmcocykpO1xufVxuXG5kZXNjcmliZSgndXRpbC5ieXRlc0Zyb21TdHJpbmdBcnJheScsICgpID0+IHtcbiAgaXQoJ2NvdW50IGJ5dGVzIGFmdGVyIHV0ZjggZW5jb2RpbmcnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHV0aWwuYnl0ZXNGcm9tU3RyaW5nQXJyYXkoZW5jb2RlU3RyaW5ncyhbJ2EnLCAnYmInLCAnY2NjJ10pKSlcbiAgICAgICAgLnRvQmUoNik7XG4gICAgZXhwZWN0KHV0aWwuYnl0ZXNGcm9tU3RyaW5nQXJyYXkoZW5jb2RlU3RyaW5ncyhbJ2EnLCAnYmInLCAnY2NjZGRkJ10pKSlcbiAgICAgICAgLnRvQmUoOSk7XG4gICAgZXhwZWN0KHV0aWwuYnl0ZXNGcm9tU3RyaW5nQXJyYXkoZW5jb2RlU3RyaW5ncyhbJ9C00LDQvdC40LXQuyddKSkpLnRvQmUoNiAqIDIpO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZSgndXRpbC5pbmZlckR0eXBlJywgKCkgPT4ge1xuICBpdCgnYSBzaW5nbGUgc3RyaW5nID0+IHN0cmluZycsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5pbmZlckR0eXBlKCdoZWxsbycpKS50b0JlKCdzdHJpbmcnKTtcbiAgfSk7XG5cbiAgaXQoJ2Egc2luZ2xlIGJvb2xlYW4gPT4gYm9vbCcsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5pbmZlckR0eXBlKHRydWUpKS50b0JlKCdib29sJyk7XG4gICAgZXhwZWN0KHV0aWwuaW5mZXJEdHlwZShmYWxzZSkpLnRvQmUoJ2Jvb2wnKTtcbiAgfSk7XG5cbiAgaXQoJ2Egc2luZ2xlIG51bWJlciA9PiBmbG9hdDMyJywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLmluZmVyRHR5cGUoMCkpLnRvQmUoJ2Zsb2F0MzInKTtcbiAgICBleHBlY3QodXRpbC5pbmZlckR0eXBlKDM0KSkudG9CZSgnZmxvYXQzMicpO1xuICB9KTtcblxuICBpdCgnYSBsaXN0IG9mIHN0cmluZ3MgPT4gc3RyaW5nJywgKCkgPT4ge1xuICAgIC8vIEZsYXQuXG4gICAgZXhwZWN0KHV0aWwuaW5mZXJEdHlwZShbJ2EnLCAnYicsICdjJ10pKS50b0JlKCdzdHJpbmcnKTtcbiAgICAvLyBOZXN0ZWQuXG4gICAgZXhwZWN0KHV0aWwuaW5mZXJEdHlwZShbXG4gICAgICBbWydhJ11dLCBbWydiJ11dLCBbWydjJ11dLCBbWydkJ11dXG4gICAgXSkpLnRvQmUoJ3N0cmluZycpO1xuICB9KTtcblxuICBpdCgnYSBsaXN0IG9mIGJvb2xzID0+IGZsb2F0MzInLCAoKSA9PiB7XG4gICAgLy8gRmxhdC5cbiAgICBleHBlY3QodXRpbC5pbmZlckR0eXBlKFtmYWxzZSwgdHJ1ZSwgZmFsc2VdKSkudG9CZSgnYm9vbCcpO1xuICAgIC8vIE5lc3RlZC5cbiAgICBleHBlY3QodXRpbC5pbmZlckR0eXBlKFtcbiAgICAgIFtbdHJ1ZV1dLCBbW2ZhbHNlXV0sIFtbdHJ1ZV1dLCBbW3RydWVdXVxuICAgIF0pKS50b0JlKCdib29sJyk7XG4gIH0pO1xuXG4gIGl0KCdhIGxpc3Qgb2YgbnVtYmVycyA9PiBmbG9hdDMyJywgKCkgPT4ge1xuICAgIC8vIEZsYXQuXG4gICAgZXhwZWN0KHV0aWwuaW5mZXJEdHlwZShbMCwgMSwgMl0pKS50b0JlKCdmbG9hdDMyJyk7XG4gICAgLy8gTmVzdGVkLlxuICAgIGV4cGVjdCh1dGlsLmluZmVyRHR5cGUoW1tbMF1dLCBbWzFdXSwgW1syXV0sIFtbM11dXSkpLnRvQmUoJ2Zsb2F0MzInKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3V0aWwucmVwZWF0ZWRUcnknLCAoKSA9PiB7XG4gIGl0KCdyZXNvbHZlcycsIChkb25lRm4pID0+IHtcbiAgICBsZXQgY291bnRlciA9IDA7XG4gICAgY29uc3QgY2hlY2tGbiA9ICgpID0+IHtcbiAgICAgIGNvdW50ZXIrKztcbiAgICAgIGlmIChjb3VudGVyID09PSAyKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB1dGlsLnJlcGVhdGVkVHJ5KGNoZWNrRm4pLnRoZW4oZG9uZUZuKS5jYXRjaCgoKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlamVjdGVkIGJhY2tvZmYuJyk7XG4gICAgfSk7XG4gIH0pO1xuICBpdCgncmVqZWN0cycsIChkb25lRm4pID0+IHtcbiAgICBjb25zdCBjaGVja0ZuID0gKCkgPT4gZmFsc2U7XG5cbiAgICB1dGlsLnJlcGVhdGVkVHJ5KGNoZWNrRm4sICgpID0+IDAsIDUpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0JhY2tvZmYgcmVzb2x2ZWQnKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGRvbmVGbik7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCd1dGlsLmluZmVyRnJvbUltcGxpY2l0U2hhcGUnLCAoKSA9PiB7XG4gIGl0KCdlbXB0eSBzaGFwZScsICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB1dGlsLmluZmVyRnJvbUltcGxpY2l0U2hhcGUoW10sIDApO1xuICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoW10pO1xuICB9KTtcblxuICBpdCgnWzIsIDMsIDRdIC0+IFsyLCAzLCA0XScsICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB1dGlsLmluZmVyRnJvbUltcGxpY2l0U2hhcGUoWzIsIDMsIDRdLCAyNCk7XG4gICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbMiwgMywgNF0pO1xuICB9KTtcblxuICBpdCgnWzIsIC0xLCA0XSAtPiBbMiwgMywgNF0sIHNpemU9MjQnLCAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gdXRpbC5pbmZlckZyb21JbXBsaWNpdFNoYXBlKFsyLCAtMSwgNF0sIDI0KTtcbiAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKFsyLCAzLCA0XSk7XG4gIH0pO1xuXG4gIGl0KCdbLTEsIDMsIDRdIC0+IFsyLCAzLCA0XSwgc2l6ZT0yNCcsICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB1dGlsLmluZmVyRnJvbUltcGxpY2l0U2hhcGUoWy0xLCAzLCA0XSwgMjQpO1xuICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoWzIsIDMsIDRdKTtcbiAgfSk7XG5cbiAgaXQoJ1syLCAzLCAtMV0gLT4gWzIsIDMsIDRdLCBzaXplPTI0JywgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHV0aWwuaW5mZXJGcm9tSW1wbGljaXRTaGFwZShbMiwgMywgLTFdLCAyNCk7XG4gICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbMiwgMywgNF0pO1xuICB9KTtcblxuICBpdCgnWzIsIC0xLCAtMV0gdGhyb3dzIGVycm9yJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLmluZmVyRnJvbUltcGxpY2l0U2hhcGUoWzIsIC0xLCAtMV0sIDI0KSkudG9UaHJvd0Vycm9yKCk7XG4gIH0pO1xuXG4gIGl0KCdbMiwgMywgLTFdIHNpemU9MTMgdGhyb3dzIGVycm9yJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLmluZmVyRnJvbUltcGxpY2l0U2hhcGUoWzIsIDMsIC0xXSwgMTMpKS50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG5cbiAgaXQoJ1syLCAzLCA0XSBzaXplPTI1IChzaG91bGQgYmUgMjQpIHRocm93cyBlcnJvcicsICgpID0+IHtcbiAgICBleHBlY3QoKCkgPT4gdXRpbC5pbmZlckZyb21JbXBsaWNpdFNoYXBlKFsyLCAzLCA0XSwgMjUpKS50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3V0aWwgcGFyc2VBeGlzUGFyYW0nLCAoKSA9PiB7XG4gIGl0KCdheGlzPW51bGwgcmV0dXJucyBubyBheGVzIGZvciBzY2FsYXInLCAoKSA9PiB7XG4gICAgY29uc3QgYXhpczogbnVtYmVyID0gbnVsbDtcbiAgICBjb25zdCBzaGFwZTogbnVtYmVyW10gPSBbXTtcbiAgICBleHBlY3QodXRpbC5wYXJzZUF4aXNQYXJhbShheGlzLCBzaGFwZSkpLnRvRXF1YWwoW10pO1xuICB9KTtcblxuICBpdCgnYXhpcz1udWxsIHJldHVybnMgMCBheGlzIGZvciBUZW5zb3IxRCcsICgpID0+IHtcbiAgICBjb25zdCBheGlzOiBudW1iZXIgPSBudWxsO1xuICAgIGNvbnN0IHNoYXBlID0gWzRdO1xuICAgIGV4cGVjdCh1dGlsLnBhcnNlQXhpc1BhcmFtKGF4aXMsIHNoYXBlKSkudG9FcXVhbChbMF0pO1xuICB9KTtcblxuICBpdCgnYXhpcz1udWxsIHJldHVybnMgYWxsIGF4ZXMgZm9yIFRlbnNvcjNEJywgKCkgPT4ge1xuICAgIGNvbnN0IGF4aXM6IG51bWJlcltdID0gbnVsbDtcbiAgICBjb25zdCBzaGFwZSA9IFszLCAxLCAyXTtcbiAgICBleHBlY3QodXRpbC5wYXJzZUF4aXNQYXJhbShheGlzLCBzaGFwZSkpLnRvRXF1YWwoWzAsIDEsIDJdKTtcbiAgfSk7XG5cbiAgaXQoJ2F4aXMgYXMgYSBzaW5nbGUgbnVtYmVyJywgKCkgPT4ge1xuICAgIGNvbnN0IGF4aXMgPSAxO1xuICAgIGNvbnN0IHNoYXBlID0gWzMsIDEsIDJdO1xuICAgIGV4cGVjdCh1dGlsLnBhcnNlQXhpc1BhcmFtKGF4aXMsIHNoYXBlKSkudG9FcXVhbChbMV0pO1xuICB9KTtcblxuICBpdCgnYXhpcyBhcyBzaW5nbGUgbmVnYXRpdmUgbnVtYmVyJywgKCkgPT4ge1xuICAgIGNvbnN0IGF4aXMgPSAtMTtcbiAgICBjb25zdCBzaGFwZSA9IFszLCAxLCAyXTtcbiAgICBleHBlY3QodXRpbC5wYXJzZUF4aXNQYXJhbShheGlzLCBzaGFwZSkpLnRvRXF1YWwoWzJdKTtcblxuICAgIGNvbnN0IGF4aXMyID0gLTI7XG4gICAgZXhwZWN0KHV0aWwucGFyc2VBeGlzUGFyYW0oYXhpczIsIHNoYXBlKSkudG9FcXVhbChbMV0pO1xuXG4gICAgY29uc3QgYXhpczMgPSAtMztcbiAgICBleHBlY3QodXRpbC5wYXJzZUF4aXNQYXJhbShheGlzMywgc2hhcGUpKS50b0VxdWFsKFswXSk7XG4gIH0pO1xuXG4gIGl0KCdheGlzIGFzIGxpc3Qgb2YgbmVnYXRpdmUgbnVtYmVycycsICgpID0+IHtcbiAgICBjb25zdCBheGlzID0gWy0xLCAtM107XG4gICAgY29uc3Qgc2hhcGUgPSBbMywgMSwgMl07XG4gICAgZXhwZWN0KHV0aWwucGFyc2VBeGlzUGFyYW0oYXhpcywgc2hhcGUpKS50b0VxdWFsKFsyLCAwXSk7XG4gIH0pO1xuXG4gIGl0KCdheGlzIGFzIGxpc3Qgb2YgcG9zaXRpdmUgbnVtYmVycycsICgpID0+IHtcbiAgICBjb25zdCBheGlzID0gWzAsIDJdO1xuICAgIGNvbnN0IHNoYXBlID0gWzMsIDEsIDJdO1xuICAgIGV4cGVjdCh1dGlsLnBhcnNlQXhpc1BhcmFtKGF4aXMsIHNoYXBlKSkudG9FcXVhbChbMCwgMl0pO1xuICB9KTtcblxuICBpdCgnYXhpcyBhcyBjb21ibyBvZiBwb3NpdGl2ZSBhbmQgbmVnYXRpdmUgbnVtYmVycycsICgpID0+IHtcbiAgICBjb25zdCBheGlzID0gWzAsIC0xXTtcbiAgICBjb25zdCBzaGFwZSA9IFszLCAxLCAyXTtcbiAgICBleHBlY3QodXRpbC5wYXJzZUF4aXNQYXJhbShheGlzLCBzaGFwZSkpLnRvRXF1YWwoWzAsIDJdKTtcbiAgfSk7XG5cbiAgaXQoJ2F4aXMgb3V0IG9mIHJhbmdlIHRocm93cyBlcnJvcicsICgpID0+IHtcbiAgICBjb25zdCBheGlzID0gLTQ7XG4gICAgY29uc3Qgc2hhcGUgPSBbMywgMSwgMl07XG4gICAgZXhwZWN0KCgpID0+IHV0aWwucGFyc2VBeGlzUGFyYW0oYXhpcywgc2hhcGUpKS50b1Rocm93RXJyb3IoKTtcblxuICAgIGNvbnN0IGF4aXMyID0gNDtcbiAgICBleHBlY3QoKCkgPT4gdXRpbC5wYXJzZUF4aXNQYXJhbShheGlzMiwgc2hhcGUpKS50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG5cbiAgaXQoJ2F4aXMgYSBsaXN0IHdpdGggb25lIG51bWJlciBvdXQgb2YgcmFuZ2UgdGhyb3dzIGVycm9yJywgKCkgPT4ge1xuICAgIGNvbnN0IGF4aXMgPSBbMCwgNF07XG4gICAgY29uc3Qgc2hhcGUgPSBbMywgMSwgMl07XG4gICAgZXhwZWN0KCgpID0+IHV0aWwucGFyc2VBeGlzUGFyYW0oYXhpcywgc2hhcGUpKS50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG5cbiAgaXQoJ2F4aXMgd2l0aCBkZWNpbWFsIHZhbHVlIHRocm93cyBlcnJvcicsICgpID0+IHtcbiAgICBjb25zdCBheGlzID0gMC41O1xuICAgIGNvbnN0IHNoYXBlID0gWzMsIDEsIDJdO1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLnBhcnNlQXhpc1BhcmFtKGF4aXMsIHNoYXBlKSkudG9UaHJvd0Vycm9yKCk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCd1dGlsLnNxdWVlemVTaGFwZScsICgpID0+IHtcbiAgaXQoJ3NjYWxhcicsICgpID0+IHtcbiAgICBjb25zdCB7bmV3U2hhcGUsIGtlcHREaW1zfSA9IHV0aWwuc3F1ZWV6ZVNoYXBlKFtdKTtcbiAgICBleHBlY3QobmV3U2hhcGUpLnRvRXF1YWwoW10pO1xuICAgIGV4cGVjdChrZXB0RGltcykudG9FcXVhbChbXSk7XG4gIH0pO1xuXG4gIGl0KCcxeDEgcmVkdWNlZCB0byBzY2FsYXInLCAoKSA9PiB7XG4gICAgY29uc3Qge25ld1NoYXBlLCBrZXB0RGltc30gPSB1dGlsLnNxdWVlemVTaGFwZShbMSwgMV0pO1xuICAgIGV4cGVjdChuZXdTaGFwZSkudG9FcXVhbChbXSk7XG4gICAgZXhwZWN0KGtlcHREaW1zKS50b0VxdWFsKFtdKTtcbiAgfSk7XG5cbiAgaXQoJzF4M3gxIHJlZHVjZWQgdG8gWzNdJywgKCkgPT4ge1xuICAgIGNvbnN0IHtuZXdTaGFwZSwga2VwdERpbXN9ID0gdXRpbC5zcXVlZXplU2hhcGUoWzEsIDMsIDFdKTtcbiAgICBleHBlY3QobmV3U2hhcGUpLnRvRXF1YWwoWzNdKTtcbiAgICBleHBlY3Qoa2VwdERpbXMpLnRvRXF1YWwoWzFdKTtcbiAgfSk7XG5cbiAgaXQoJzF4MXg0IHJlZHVjZWQgdG8gWzRdJywgKCkgPT4ge1xuICAgIGNvbnN0IHtuZXdTaGFwZSwga2VwdERpbXN9ID0gdXRpbC5zcXVlZXplU2hhcGUoWzEsIDEsIDRdKTtcbiAgICBleHBlY3QobmV3U2hhcGUpLnRvRXF1YWwoWzRdKTtcbiAgICBleHBlY3Qoa2VwdERpbXMpLnRvRXF1YWwoWzJdKTtcbiAgfSk7XG5cbiAgaXQoJzJ4M3g0IG5vdCByZWR1Y3Rpb24nLCAoKSA9PiB7XG4gICAgY29uc3Qge25ld1NoYXBlLCBrZXB0RGltc30gPSB1dGlsLnNxdWVlemVTaGFwZShbMiwgMywgNF0pO1xuICAgIGV4cGVjdChuZXdTaGFwZSkudG9FcXVhbChbMiwgMywgNF0pO1xuICAgIGV4cGVjdChrZXB0RGltcykudG9FcXVhbChbMCwgMSwgMl0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnd2l0aCBheGlzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgb25seSByZWR1Y2UgZGltZW5zaW9ucyBzcGVjaWZpZWQgYnkgYXhpcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHtuZXdTaGFwZSwga2VwdERpbXN9ID0gdXRpbC5zcXVlZXplU2hhcGUoWzEsIDEsIDEsIDEsIDRdLCBbMSwgMl0pO1xuICAgICAgZXhwZWN0KG5ld1NoYXBlKS50b0VxdWFsKFsxLCAxLCA0XSk7XG4gICAgICBleHBlY3Qoa2VwdERpbXMpLnRvRXF1YWwoWzAsIDMsIDRdKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIG9ubHkgcmVkdWNlIGRpbWVuc2lvbnMgc3BlY2lmaWVkIGJ5IG5lZ2F0aXZlIGF4aXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB7bmV3U2hhcGUsIGtlcHREaW1zfSA9IHV0aWwuc3F1ZWV6ZVNoYXBlKFsxLCAxLCAxLCAxLCA0XSwgWy0yLCAtM10pO1xuICAgICAgZXhwZWN0KG5ld1NoYXBlKS50b0VxdWFsKFsxLCAxLCA0XSk7XG4gICAgICBleHBlY3Qoa2VwdERpbXMpLnRvRXF1YWwoWzAsIDEsIDRdKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIG9ubHkgcmVkdWNlIGRpbWVuc2lvbnMgc3BlY2lmaWVkIGJ5IG5lZ2F0aXZlIGF4aXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBheGlzID0gWy0yLCAtM107XG4gICAgICB1dGlsLnNxdWVlemVTaGFwZShbMSwgMSwgMSwgMSwgNF0sIGF4aXMpO1xuICAgICAgZXhwZWN0KGF4aXMpLnRvRXF1YWwoWy0yLCAtM10pO1xuICAgIH0pO1xuICAgIGl0KCd0aHJvd3MgZXJyb3Igd2hlbiBzcGVjaWZpZWQgYXhpcyBpcyBub3Qgc3F1ZWV6YWJsZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiB1dGlsLnNxdWVlemVTaGFwZShbMSwgMSwgMiwgMSwgNF0sIFsxLCAyXSkpLnRvVGhyb3dFcnJvcigpO1xuICAgIH0pO1xuICAgIGl0KCd0aHJvd3MgZXJyb3Igd2hlbiBzcGVjaWZpZWQgbmVnYXRpdmUgYXhpcyBpcyBub3Qgc3F1ZWV6YWJsZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiB1dGlsLnNxdWVlemVTaGFwZShbMSwgMSwgMiwgMSwgNF0sIFstMSwgLTJdKSkudG9UaHJvd0Vycm9yKCk7XG4gICAgfSk7XG4gICAgaXQoJ3Rocm93cyBlcnJvciB3aGVuIHNwZWNpZmllZCBheGlzIGlzIG91dCBvZiByYW5nZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiB1dGlsLnNxdWVlemVTaGFwZShbMSwgMSwgMiwgMSwgNF0sIFsxMSwgMjJdKSkudG9UaHJvd0Vycm9yKCk7XG4gICAgfSk7XG4gICAgaXQoJ3Rocm93cyBlcnJvciB3aGVuIHNwZWNpZmllZCBuZWdhdGl2ZSBheGlzIGlzIG91dCBvZiByYW5nZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiB1dGlsLnNxdWVlemVTaGFwZShbMSwgMSwgMiwgMSwgNF0sIFtcbiAgICAgICAgLTExLCAtMjJcbiAgICAgIF0pKS50b1Rocm93RXJyb3IoKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3V0aWwuY2hlY2tDb252ZXJzaW9uRm9yRXJyb3JzJywgKCkgPT4ge1xuICBpdCgnRmxvYXQzMkFycmF5IGhhcyBOYU4nLCAoKSA9PiB7XG4gICAgZXhwZWN0KFxuICAgICAgICAoKSA9PiB1dGlsLmNoZWNrQ29udmVyc2lvbkZvckVycm9ycyhcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzEsIDIsIDMsIE5hTiwgNCwgMjU1XSksICdmbG9hdDMyJykpXG4gICAgICAgIC50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG5cbiAgaXQoJ0Zsb2F0MzJBcnJheSBoYXMgSW5maW5pdHknLCAoKSA9PiB7XG4gICAgZXhwZWN0KFxuICAgICAgICAoKSA9PiB1dGlsLmNoZWNrQ29udmVyc2lvbkZvckVycm9ycyhcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoWzEsIDIsIDMsIEluZmluaXR5LCA0LCAyNTVdKSwgJ2Zsb2F0MzInKSlcbiAgICAgICAgLnRvVGhyb3dFcnJvcigpO1xuICB9KTtcblxuICBpdCgnSW50MzJBcnJheSBoYXMgTmFOJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLmNoZWNrQ29udmVyc2lvbkZvckVycm9ycyhbMSwgMiwgMywgNCwgTmFOXSwgJ2ludDMyJykpXG4gICAgICAgIC50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3V0aWwuaGFzRW5jb2RpbmdMb3NzJywgKCkgPT4ge1xuICBpdCgnY29tcGxleDY0IHRvIGFueScsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5oYXNFbmNvZGluZ0xvc3MoJ2NvbXBsZXg2NCcsICdjb21wbGV4NjQnKSkudG9CZShmYWxzZSk7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdjb21wbGV4NjQnLCAnZmxvYXQzMicpKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnY29tcGxleDY0JywgJ2ludDMyJykpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdjb21wbGV4NjQnLCAnYm9vbCcpKS50b0JlKHRydWUpO1xuICB9KTtcblxuICBpdCgnYW55IHRvIGNvbXBsZXg2NCcsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5oYXNFbmNvZGluZ0xvc3MoJ2Jvb2wnLCAnY29tcGxleDY0JykpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnaW50MzInLCAnY29tcGxleDY0JykpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnZmxvYXQzMicsICdjb21wbGV4NjQnKSkudG9CZShmYWxzZSk7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdjb21wbGV4NjQnLCAnY29tcGxleDY0JykpLnRvQmUoZmFsc2UpO1xuICB9KTtcblxuICBpdCgnYW55IHRvIGZsb2F0MzInLCAoKSA9PiB7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdib29sJywgJ2Zsb2F0MzInKSkudG9CZShmYWxzZSk7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdpbnQzMicsICdmbG9hdDMyJykpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnZmxvYXQzMicsICdmbG9hdDMyJykpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnY29tcGxleDY0JywgJ2Zsb2F0MzInKSkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgaXQoJ2Zsb2F0MzIgdG8gYW55JywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnZmxvYXQzMicsICdmbG9hdDMyJykpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnZmxvYXQzMicsICdpbnQzMicpKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnZmxvYXQzMicsICdib29sJykpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdmbG9hdDMyJywgJ2NvbXBsZXg2NCcpKS50b0JlKGZhbHNlKTtcbiAgfSk7XG5cbiAgaXQoJ2ludDMyIHRvIGxvd2VyJywgKCkgPT4ge1xuICAgIGV4cGVjdCh1dGlsLmhhc0VuY29kaW5nTG9zcygnaW50MzInLCAnaW50MzInKSkudG9CZShmYWxzZSk7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdpbnQzMicsICdib29sJykpLnRvQmUodHJ1ZSk7XG4gIH0pO1xuXG4gIGl0KCdsb3dlciB0byBpbnQzMicsICgpID0+IHtcbiAgICBleHBlY3QodXRpbC5oYXNFbmNvZGluZ0xvc3MoJ2Jvb2wnLCAnaW50MzInKSkudG9CZShmYWxzZSk7XG4gIH0pO1xuXG4gIGl0KCdib29sIHRvIGJvb2wnLCAoKSA9PiB7XG4gICAgZXhwZWN0KHV0aWwuaGFzRW5jb2RpbmdMb3NzKCdib29sJywgJ2Jvb2wnKSkudG9CZShmYWxzZSk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlV2l0aEZsYWdzKCd1dGlsLnRvTmVzdGVkQXJyYXknLCBBTExfRU5WUywgKCkgPT4ge1xuICBpdCgnMiBkaW1lbnNpb25zJywgKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAyLCAzLCA0LCA1LCA2XSk7XG4gICAgZXhwZWN0KHV0aWwudG9OZXN0ZWRBcnJheShbMiwgM10sIGEpKS50b0VxdWFsKFtbMSwgMiwgM10sIFs0LCA1LCA2XV0pO1xuICB9KTtcblxuICBpdCgnMyBkaW1lbnNpb25zICgyeDJ4MyknLCAoKSA9PiB7XG4gICAgY29uc3QgYSA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDEsIDIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV0pO1xuICAgIGV4cGVjdCh1dGlsLnRvTmVzdGVkQXJyYXkoWzIsIDIsIDNdLCBhKSkudG9FcXVhbChbXG4gICAgICBbWzAsIDEsIDJdLCBbMywgNCwgNV1dLCBbWzYsIDcsIDhdLCBbOSwgMTAsIDExXV1cbiAgICBdKTtcbiAgfSk7XG5cbiAgaXQoJzMgZGltZW5zaW9ucyAoM3gyeDIpJywgKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBuZXcgRmxvYXQzMkFycmF5KFswLCAxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdKTtcbiAgICBleHBlY3QodXRpbC50b05lc3RlZEFycmF5KFszLCAyLCAyXSwgYSkpLnRvRXF1YWwoW1xuICAgICAgW1swLCAxXSwgWzIsIDNdXSwgW1s0LCA1XSwgWzYsIDddXSwgW1s4LCA5XSwgWzEwLCAxMV1dXG4gICAgXSk7XG4gIH0pO1xuXG4gIGl0KCdpbnZhbGlkIGRpbWVuc2lvbicsICgpID0+IHtcbiAgICBjb25zdCBhID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMiwgM10pO1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLnRvTmVzdGVkQXJyYXkoWzIsIDJdLCBhKSkudG9UaHJvd0Vycm9yKCk7XG4gIH0pO1xuXG4gIGl0KCd0ZW5zb3IgdG8gbmVzdGVkIGFycmF5JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHggPSB0ZW5zb3IyZChbMSwgMiwgMywgNF0sIFsyLCAyXSk7XG4gICAgZXhwZWN0KHV0aWwudG9OZXN0ZWRBcnJheSh4LnNoYXBlLCBhd2FpdCB4LmRhdGEoKSkpLnRvRXF1YWwoW1xuICAgICAgWzEsIDJdLCBbMywgNF1cbiAgICBdKTtcbiAgfSk7XG5cbiAgaXQoJ3NjYWxhciB0byBuZXN0ZWQgYXJyYXknLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgeCA9IHNjYWxhcigxKTtcbiAgICBleHBlY3QodXRpbC50b05lc3RlZEFycmF5KHguc2hhcGUsIGF3YWl0IHguZGF0YSgpKSkudG9FcXVhbCgxKTtcbiAgfSk7XG5cbiAgaXQoJ3RlbnNvciB3aXRoIHplcm8gc2hhcGUnLCAoKSA9PiB7XG4gICAgY29uc3QgYSA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDFdKTtcbiAgICBleHBlY3QodXRpbC50b05lc3RlZEFycmF5KFsxLCAwLCAyXSwgYSkpLnRvRXF1YWwoW10pO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZVdpdGhGbGFncygndXRpbC50b05lc3RlZEFycmF5IGZvciBhIGNvbXBsZXggdGVuc29yJywgQUxMX0VOVlMsICgpID0+IHtcbiAgaXQoJzIgZGltZW5zaW9ucycsICgpID0+IHtcbiAgICBjb25zdCBhID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMTEsIDIsIDEyLCAzLCAxMywgNCwgMTQsIDUsIDE1LCA2LCAxNl0pO1xuICAgIGV4cGVjdCh1dGlsLnRvTmVzdGVkQXJyYXkoWzIsIDNdLCBhLCB0cnVlKSkudG9FcXVhbChbXG4gICAgICBbMSwgMTEsIDIsIDEyLCAzLCAxM10sIFs0LCAxNCwgNSwgMTUsIDYsIDE2XVxuICAgIF0pO1xuICB9KTtcblxuICBpdCgnMyBkaW1lbnNpb25zICgyeDJ4MyknLCAoKSA9PiB7XG4gICAgY29uc3QgYSA9IG5ldyBGbG9hdDMyQXJyYXkoW1xuICAgICAgMCwgNTAsIDEsIDUxLCAyLCA1MiwgMywgNTMsIDQsICA1NCwgNSwgIDU1LFxuICAgICAgNiwgNTYsIDcsIDU3LCA4LCA1OCwgOSwgNTksIDEwLCA2MCwgMTEsIDYxXG4gICAgXSk7XG4gICAgZXhwZWN0KHV0aWwudG9OZXN0ZWRBcnJheShbMiwgMiwgM10sIGEsIHRydWUpKS50b0VxdWFsKFtcbiAgICAgIFtbMCwgNTAsIDEsIDUxLCAyLCA1Ml0sIFszLCA1MywgNCwgNTQsIDUsIDU1XV0sXG4gICAgICBbWzYsIDU2LCA3LCA1NywgOCwgNThdLCBbOSwgNTksIDEwLCA2MCwgMTEsIDYxXV1cbiAgICBdKTtcbiAgfSk7XG5cbiAgaXQoJzMgZGltZW5zaW9ucyAoM3gyeDIpJywgKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBuZXcgRmxvYXQzMkFycmF5KFtcbiAgICAgIDAsIDUwLCAxLCA1MSwgMiwgNTIsIDMsIDUzLCA0LCAgNTQsIDUsICA1NSxcbiAgICAgIDYsIDU2LCA3LCA1NywgOCwgNTgsIDksIDU5LCAxMCwgNjAsIDExLCA2MVxuICAgIF0pO1xuICAgIGV4cGVjdCh1dGlsLnRvTmVzdGVkQXJyYXkoWzMsIDIsIDJdLCBhLCB0cnVlKSkudG9FcXVhbChbXG4gICAgICBbWzAsIDUwLCAxLCA1MV0sIFsyLCA1MiwgMywgNTNdXSwgW1s0LCA1NCwgNSwgNTVdLCBbNiwgNTYsIDcsIDU3XV0sXG4gICAgICBbWzgsIDU4LCA5LCA1OV0sIFsxMCwgNjAsIDExLCA2MV1dXG4gICAgXSk7XG4gIH0pO1xuXG4gIGl0KCdpbnZhbGlkIGRpbWVuc2lvbicsICgpID0+IHtcbiAgICBjb25zdCBhID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMTEsIDIsIDEyLCAzLCAxM10pO1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLnRvTmVzdGVkQXJyYXkoWzIsIDJdLCBhLCB0cnVlKSkudG9UaHJvd0Vycm9yKCk7XG4gIH0pO1xuXG4gIGl0KCd0ZW5zb3IgdG8gbmVzdGVkIGFycmF5JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHggPSBjb21wbGV4KFtbMSwgMl0sIFszLCA0XV0sIFtbMTEsIDEyXSwgWzEzLCAxNF1dKTtcbiAgICBleHBlY3QodXRpbC50b05lc3RlZEFycmF5KHguc2hhcGUsIGF3YWl0IHguZGF0YSgpLCB0cnVlKSkudG9FcXVhbChbXG4gICAgICBbMSwgMTEsIDIsIDEyXSwgWzMsIDEzLCA0LCAxNF1cbiAgICBdKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3V0aWwuZmV0Y2gnLCAoKSA9PiB7XG4gIGl0KCdzaG91bGQgY2FsbCB0aGUgcGxhdGZvcm0gZmV0Y2gnLCAoKSA9PiB7XG4gICAgc3B5T24odGYuZW52KCkucGxhdGZvcm0sICdmZXRjaCcpXG4gICAgICAgIC5hbmQuY2FsbEZha2UoYXN5bmMgKCkgPT4gKHt9IGFzIHVua25vd24gYXMgUmVzcG9uc2UpKTtcblxuICAgIHV0aWwuZmV0Y2goJ3Rlc3QvcGF0aCcsIHttZXRob2Q6ICdHRVQnfSk7XG5cbiAgICBleHBlY3QodGYuZW52KCkucGxhdGZvcm0uZmV0Y2gpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCd0ZXN0L3BhdGgnLCB7XG4gICAgICBtZXRob2Q6ICdHRVQnXG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCd1dGlsLmVuY29kZVN0cmluZycsICgpID0+IHtcbiAgaXQoJ0VuY29kZSBhbiBlbXB0eSBzdHJpbmcsIGRlZmF1bHQgZW5jb2RpbmcnLCAoKSA9PiB7XG4gICAgY29uc3QgcmVzID0gdXRpbC5lbmNvZGVTdHJpbmcoJycpO1xuICAgIGV4cGVjdChyZXMpLnRvRXF1YWwobmV3IFVpbnQ4QXJyYXkoW10pKTtcbiAgfSk7XG5cbiAgaXQoJ0VuY29kZSBhbiBlbXB0eSBzdHJpbmcsIHV0Zi04IGVuY29kaW5nJywgKCkgPT4ge1xuICAgIGNvbnN0IHJlcyA9IHV0aWwuZW5jb2RlU3RyaW5nKCcnLCAndXRmLTgnKTtcbiAgICBleHBlY3QocmVzKS50b0VxdWFsKG5ldyBVaW50OEFycmF5KFtdKSk7XG4gIH0pO1xuXG4gIGl0KCdFbmNvZGUgYW4gZW1wdHkgc3RyaW5nLCBpbnZhbGlkIGRlY29kaW5nJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB1dGlsLmVuY29kZVN0cmluZygnJywgJ2Zvb2JhcmJheCcpKS50b1Rocm93RXJyb3IoKTtcbiAgfSk7XG5cbiAgaXQoJ0VuY29kZSBjeXJpbGxpYyBsZXR0ZXJzJywgKCkgPT4ge1xuICAgIGNvbnN0IHJlcyA9IHV0aWwuZW5jb2RlU3RyaW5nKCdLYdC6byDRgdGCZScpO1xuICAgIGV4cGVjdChyZXMpLnRvRXF1YWwoXG4gICAgICAgIG5ldyBVaW50OEFycmF5KFs3NSwgOTcsIDIwOCwgMTg2LCAxMTEsIDMyLCAyMDksIDEyOSwgMjA5LCAxMzAsIDEwMV0pKTtcbiAgfSk7XG5cbiAgaXQoJ0VuY29kZSBhc2NpaSBsZXR0ZXJzJywgKCkgPT4ge1xuICAgIGNvbnN0IHJlcyA9IHV0aWwuZW5jb2RlU3RyaW5nKCdoZWxsbycpO1xuICAgIGV4cGVjdChyZXMpLnRvRXF1YWwobmV3IFVpbnQ4QXJyYXkoWzEwNCwgMTAxLCAxMDgsIDEwOCwgMTExXSkpO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZSgndXRpbC5kZWNvZGVTdHJpbmcnLCAoKSA9PiB7XG4gIGl0KCdkZWNvZGUgYW4gZW1wdHkgc3RyaW5nJywgKCkgPT4ge1xuICAgIGNvbnN0IHMgPSB1dGlsLmRlY29kZVN0cmluZyhuZXcgVWludDhBcnJheShbXSkpO1xuICAgIGV4cGVjdChzKS50b0VxdWFsKCcnKTtcbiAgfSk7XG5cbiAgaXQoJ2RlY29kZSBhc2NpaScsICgpID0+IHtcbiAgICBjb25zdCBzID0gdXRpbC5kZWNvZGVTdHJpbmcobmV3IFVpbnQ4QXJyYXkoWzEwNCwgMTAxLCAxMDgsIDEwOCwgMTExXSkpO1xuICAgIGV4cGVjdChzKS50b0VxdWFsKCdoZWxsbycpO1xuICB9KTtcblxuICBpdCgnZGVjb2RlIGN5cmlsbGljJywgKCkgPT4ge1xuICAgIGNvbnN0IHMgPSB1dGlsLmRlY29kZVN0cmluZyhcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoWzc1LCA5NywgMjA4LCAxODYsIDExMSwgMzIsIDIwOSwgMTI5LCAyMDksIDEzMCwgMTAxXSkpO1xuICAgIGV4cGVjdChzKS50b0VxdWFsKCdLYdC6byDRgdGCZScpO1xuICB9KTtcblxuICBpdCgnZGVjb2RlIHV0Zi0xNicsICgpID0+IHtcbiAgICBjb25zdCBzID0gdXRpbC5kZWNvZGVTdHJpbmcoXG4gICAgICAgIG5ldyBVaW50OEFycmF5KFsyNTUsIDI1NCwgMjM3LCAxMzksIDAsIDEzOCwgNCwgODksIDYsIDExNl0pLCAndXRmLTE2Jyk7XG5cbiAgICAvLyBVVEYtMTYgYWxsb3dzIG9wdGlvbmFsIHByZXNlbmNlIG9mIGJ5dGUtb3JkZXItbWFyayAoQk9NKVxuICAgIC8vIENvbnN0cnVjdCBzdHJpbmcgZm9yICfor63oqIDlpITnkIYnLCB3aXRoIGFuZCB3aXRob3V0IEJPTVxuICAgIGNvbnN0IGV4cGVjdGVkID0gU3RyaW5nLmZyb21Db2RlUG9pbnQoMHg4YmVkLCAweDhhMDAsIDB4NTkwNCwgMHg3NDA2KTtcbiAgICBjb25zdCBleHBlY3RlZEJPTSA9XG4gICAgICAgIFN0cmluZy5mcm9tQ29kZVBvaW50KDB4ZmVmZiwgMHg4YmVkLCAweDhhMDAsIDB4NTkwNCwgMHg3NDA2KTtcblxuICAgIGlmIChzLmNvZGVQb2ludEF0KDApID09PSAweGZlZmYpIHtcbiAgICAgIGV4cGVjdChzKS50b0VxdWFsKGV4cGVjdGVkQk9NKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwZWN0KHMpLnRvRXF1YWwoZXhwZWN0ZWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaXQoJ2Fzc2VydCBwcm9taXNlJywgKCkgPT4ge1xuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHV0aWwuaXNQcm9taXNlKHByb21pc2UpKS50b0JlVHJ1dGh5KCk7XG4gICAgY29uc3QgcHJvbWlzZTIgPSB7dGhlbjogKCkgPT4ge319O1xuICAgIGV4cGVjdCh1dGlsLmlzUHJvbWlzZShwcm9taXNlMikpLnRvQmVUcnV0aHkoKTtcbiAgICBjb25zdCBwcm9taXNlMyA9IHt9O1xuICAgIGV4cGVjdCh1dGlsLmlzUHJvbWlzZShwcm9taXNlMykpLnRvQmVGYWxzeSgpO1xuICB9KTtcbn0pO1xuIl19