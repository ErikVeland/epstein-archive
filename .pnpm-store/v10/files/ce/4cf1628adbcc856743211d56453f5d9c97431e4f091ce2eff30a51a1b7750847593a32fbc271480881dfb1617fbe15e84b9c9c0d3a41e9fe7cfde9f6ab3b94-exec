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
import * as tf from '../index';
import { BROWSER_ENVS, CHROME_ENVS, describeWithFlags, NODE_ENVS } from '../jasmine_util';
import { HTTPRequest, httpRouter, parseUrl } from './http';
import { CompositeArrayBuffer } from './composite_array_buffer';
// Test data.
const modelTopology1 = {
    'class_name': 'Sequential',
    'keras_version': '2.1.4',
    'config': [{
            'class_name': 'Dense',
            'config': {
                'kernel_initializer': {
                    'class_name': 'VarianceScaling',
                    'config': {
                        'distribution': 'uniform',
                        'scale': 1.0,
                        'seed': null,
                        'mode': 'fan_avg'
                    }
                },
                'name': 'dense',
                'kernel_constraint': null,
                'bias_regularizer': null,
                'bias_constraint': null,
                'dtype': 'float32',
                'activation': 'linear',
                'trainable': true,
                'kernel_regularizer': null,
                'bias_initializer': { 'class_name': 'Zeros', 'config': {} },
                'units': 1,
                'batch_input_shape': [null, 3],
                'use_bias': true,
                'activity_regularizer': null
            }
        }],
    'backend': 'tensorflow'
};
const trainingConfig1 = {
    loss: 'categorical_crossentropy',
    metrics: ['accuracy'],
    optimizer_config: { class_name: 'SGD', config: { learningRate: 0.1 } }
};
let fetchSpy;
const fakeResponse = (body, contentType, path) => ({
    ok: true,
    json() {
        return Promise.resolve(JSON.parse(body));
    },
    arrayBuffer() {
        const buf = body.buffer ?
            body.buffer :
            body;
        return Promise.resolve(buf);
    },
    headers: { get: (key) => contentType },
    url: path
});
const setupFakeWeightFiles = (fileBufferMap, requestInits) => {
    fetchSpy = spyOn(tf.env().platform, 'fetch')
        .and.callFake((path, init) => {
        if (fileBufferMap[path]) {
            requestInits[path] = init;
            return Promise.resolve(fakeResponse(fileBufferMap[path].data, fileBufferMap[path].contentType, path));
        }
        else {
            return Promise.reject('path not found');
        }
    });
};
describeWithFlags('http-load fetch', NODE_ENVS, () => {
    let requestInits;
    // tslint:disable-next-line:no-any
    let originalFetch;
    // simulate a fetch polyfill, this needs to be non-null for spyOn to work
    beforeEach(() => {
        // tslint:disable-next-line:no-any
        originalFetch = global.fetch;
        // tslint:disable-next-line:no-any
        global.fetch = () => { };
        requestInits = {};
    });
    afterAll(() => {
        // tslint:disable-next-line:no-any
        global.fetch = originalFetch;
    });
    it('1 group, 2 weights, 1 path', async () => {
        const weightManifest1 = [{
                paths: ['weightfile0'],
                weights: [
                    {
                        name: 'dense/kernel',
                        shape: [3, 1],
                        dtype: 'float32',
                    },
                    {
                        name: 'dense/bias',
                        shape: [2],
                        dtype: 'float32',
                    }
                ]
            }];
        const floatData = new Float32Array([1, 3, 3, 7, 4]);
        setupFakeWeightFiles({
            './model.json': {
                data: JSON.stringify({
                    modelTopology: modelTopology1,
                    weightsManifest: weightManifest1,
                    format: 'tfjs-layers',
                    generatedBy: '1.15',
                    convertedBy: '1.3.1',
                    signature: null,
                    userDefinedMetadata: {}
                }),
                contentType: 'application/json'
            },
            './weightfile0': { data: floatData, contentType: 'application/octet-stream' },
        }, requestInits);
        const handler = tf.io.http('./model.json');
        const modelArtifacts = await handler.load();
        expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
        expect(modelArtifacts.weightSpecs).toEqual(weightManifest1[0].weights);
        expect(modelArtifacts.format).toEqual('tfjs-layers');
        expect(modelArtifacts.generatedBy).toEqual('1.15');
        expect(modelArtifacts.convertedBy).toEqual('1.3.1');
        expect(modelArtifacts.userDefinedMetadata).toEqual({});
        expect(new Float32Array(CompositeArrayBuffer.join(modelArtifacts.weightData))).toEqual(floatData);
    });
    it('throw exception if no fetch polyfill', () => {
        // tslint:disable-next-line:no-any
        delete global.fetch;
        try {
            tf.io.http('./model.json');
        }
        catch (err) {
            expect(err.message).toMatch(/Unable to find fetch polyfill./);
        }
    });
});
// Turned off for other browsers due to:
// https://github.com/tensorflow/tfjs/issues/426
describeWithFlags('http-save', CHROME_ENVS, () => {
    // Test data.
    const weightSpecs1 = [
        {
            name: 'dense/kernel',
            shape: [3, 1],
            dtype: 'float32',
        },
        {
            name: 'dense/bias',
            shape: [1],
            dtype: 'float32',
        }
    ];
    const weightData1 = new ArrayBuffer(16);
    const artifacts1 = {
        modelTopology: modelTopology1,
        weightSpecs: weightSpecs1,
        weightData: weightData1,
        format: 'layers-model',
        generatedBy: 'TensorFlow.js v0.0.0',
        convertedBy: null,
        signature: null,
        userDefinedMetadata: {},
        modelInitializer: {},
        trainingConfig: trainingConfig1
    };
    let requestInits = [];
    beforeEach(() => {
        requestInits = [];
        spyOn(tf.env().platform, 'fetch')
            .and.callFake((path, init) => {
            if (path === 'model-upload-test' ||
                path === 'http://model-upload-test') {
                requestInits.push(init);
                return Promise.resolve(new Response(null, { status: 200 }));
            }
            else {
                return Promise.reject(new Response(null, { status: 404 }));
            }
        });
    });
    it('Save topology and weights, default POST method', (done) => {
        const testStartDate = new Date();
        const handler = tf.io.getSaveHandlers('http://model-upload-test')[0];
        handler.save(artifacts1)
            .then(saveResult => {
            expect(saveResult.modelArtifactsInfo.dateSaved.getTime())
                .toBeGreaterThanOrEqual(testStartDate.getTime());
            // Note: The following two assertions work only because there is no
            //   non-ASCII characters in `modelTopology1` and `weightSpecs1`.
            expect(saveResult.modelArtifactsInfo.modelTopologyBytes)
                .toEqual(JSON.stringify(modelTopology1).length);
            expect(saveResult.modelArtifactsInfo.weightSpecsBytes)
                .toEqual(JSON.stringify(weightSpecs1).length);
            expect(saveResult.modelArtifactsInfo.weightDataBytes)
                .toEqual(weightData1.byteLength);
            expect(requestInits.length).toEqual(1);
            const init = requestInits[0];
            expect(init.method).toEqual('POST');
            const body = init.body;
            const jsonFile = body.get('model.json');
            const jsonFileReader = new FileReader();
            jsonFileReader.onload = (event) => {
                const modelJSON = 
                // tslint:disable-next-line:no-any
                JSON.parse(event.target.result);
                expect(modelJSON.modelTopology).toEqual(modelTopology1);
                expect(modelJSON.weightsManifest.length).toEqual(1);
                expect(modelJSON.weightsManifest[0].weights).toEqual(weightSpecs1);
                expect(modelJSON.trainingConfig).toEqual(trainingConfig1);
                const weightsFile = body.get('model.weights.bin');
                const weightsFileReader = new FileReader();
                weightsFileReader.onload = (event) => {
                    // tslint:disable-next-line:no-any
                    const weightData = event.target.result;
                    expect(new Uint8Array(weightData))
                        .toEqual(new Uint8Array(weightData1));
                    done();
                };
                weightsFileReader.onerror = ev => {
                    done.fail(weightsFileReader.error.message);
                };
                weightsFileReader.readAsArrayBuffer(weightsFile);
            };
            jsonFileReader.onerror = ev => {
                done.fail(jsonFileReader.error.message);
            };
            jsonFileReader.readAsText(jsonFile);
        })
            .catch(err => {
            done.fail(err.stack);
        });
    });
    it('Save topology only, default POST method', (done) => {
        const testStartDate = new Date();
        const handler = tf.io.getSaveHandlers('http://model-upload-test')[0];
        const topologyOnlyArtifacts = { modelTopology: modelTopology1 };
        handler.save(topologyOnlyArtifacts)
            .then(saveResult => {
            expect(saveResult.modelArtifactsInfo.dateSaved.getTime())
                .toBeGreaterThanOrEqual(testStartDate.getTime());
            // Note: The following two assertions work only because there is no
            //   non-ASCII characters in `modelTopology1` and `weightSpecs1`.
            expect(saveResult.modelArtifactsInfo.modelTopologyBytes)
                .toEqual(JSON.stringify(modelTopology1).length);
            expect(saveResult.modelArtifactsInfo.weightSpecsBytes).toEqual(0);
            expect(saveResult.modelArtifactsInfo.weightDataBytes).toEqual(0);
            expect(requestInits.length).toEqual(1);
            const init = requestInits[0];
            expect(init.method).toEqual('POST');
            const body = init.body;
            const jsonFile = body.get('model.json');
            const jsonFileReader = new FileReader();
            jsonFileReader.onload = (event) => {
                // tslint:disable-next-line:no-any
                const modelJSON = JSON.parse(event.target.result);
                expect(modelJSON.modelTopology).toEqual(modelTopology1);
                // No weights should have been sent to the server.
                expect(body.get('model.weights.bin')).toEqual(null);
                done();
            };
            jsonFileReader.onerror = event => {
                done.fail(jsonFileReader.error.message);
            };
            jsonFileReader.readAsText(jsonFile);
        })
            .catch(err => {
            done.fail(err.stack);
        });
    });
    it('Save topology and weights, PUT method, extra headers', (done) => {
        const testStartDate = new Date();
        const handler = tf.io.http('model-upload-test', {
            requestInit: {
                method: 'PUT',
                headers: { 'header_key_1': 'header_value_1', 'header_key_2': 'header_value_2' }
            }
        });
        handler.save(artifacts1)
            .then(saveResult => {
            expect(saveResult.modelArtifactsInfo.dateSaved.getTime())
                .toBeGreaterThanOrEqual(testStartDate.getTime());
            // Note: The following two assertions work only because there is no
            //   non-ASCII characters in `modelTopology1` and `weightSpecs1`.
            expect(saveResult.modelArtifactsInfo.modelTopologyBytes)
                .toEqual(JSON.stringify(modelTopology1).length);
            expect(saveResult.modelArtifactsInfo.weightSpecsBytes)
                .toEqual(JSON.stringify(weightSpecs1).length);
            expect(saveResult.modelArtifactsInfo.weightDataBytes)
                .toEqual(weightData1.byteLength);
            expect(requestInits.length).toEqual(1);
            const init = requestInits[0];
            expect(init.method).toEqual('PUT');
            // Check headers.
            expect(init.headers).toEqual({
                'header_key_1': 'header_value_1',
                'header_key_2': 'header_value_2'
            });
            const body = init.body;
            const jsonFile = body.get('model.json');
            const jsonFileReader = new FileReader();
            jsonFileReader.onload = (event) => {
                const modelJSON = 
                // tslint:disable-next-line:no-any
                JSON.parse(event.target.result);
                expect(modelJSON.format).toEqual('layers-model');
                expect(modelJSON.generatedBy).toEqual('TensorFlow.js v0.0.0');
                expect(modelJSON.convertedBy).toEqual(null);
                expect(modelJSON.modelTopology).toEqual(modelTopology1);
                expect(modelJSON.modelInitializer).toEqual({});
                expect(modelJSON.weightsManifest.length).toEqual(1);
                expect(modelJSON.weightsManifest[0].weights).toEqual(weightSpecs1);
                expect(modelJSON.trainingConfig).toEqual(trainingConfig1);
                const weightsFile = body.get('model.weights.bin');
                const weightsFileReader = new FileReader();
                weightsFileReader.onload = (event) => {
                    // tslint:disable-next-line:no-any
                    const weightData = event.target.result;
                    expect(new Uint8Array(weightData))
                        .toEqual(new Uint8Array(weightData1));
                    done();
                };
                weightsFileReader.onerror = event => {
                    done.fail(weightsFileReader.error.message);
                };
                weightsFileReader.readAsArrayBuffer(weightsFile);
            };
            jsonFileReader.onerror = event => {
                done.fail(jsonFileReader.error.message);
            };
            jsonFileReader.readAsText(jsonFile);
        })
            .catch(err => {
            done.fail(err.stack);
        });
    });
    it('404 response causes Error', (done) => {
        const handler = tf.io.getSaveHandlers('http://invalid/path')[0];
        handler.save(artifacts1)
            .then(saveResult => {
            done.fail('Calling http at invalid URL succeeded ' +
                'unexpectedly');
        })
            .catch(err => {
            expect().nothing();
            done();
        });
    });
    it('getLoadHandlers with one URL string', () => {
        const handlers = tf.io.getLoadHandlers('http://foo/model.json');
        expect(handlers.length).toEqual(1);
        expect(handlers[0] instanceof HTTPRequest).toEqual(true);
    });
    it('Existing body leads to Error', () => {
        expect(() => tf.io.http('model-upload-test', {
            requestInit: { body: 'existing body' }
        })).toThrowError(/requestInit is expected to have no pre-existing body/);
    });
    it('Empty, null or undefined URL paths lead to Error', () => {
        expect(() => tf.io.http(null))
            .toThrowError(/must not be null, undefined or empty/);
        expect(() => tf.io.http(undefined))
            .toThrowError(/must not be null, undefined or empty/);
        expect(() => tf.io.http(''))
            .toThrowError(/must not be null, undefined or empty/);
    });
    it('router', () => {
        expect(httpRouter('http://bar/foo') instanceof HTTPRequest).toEqual(true);
        expect(httpRouter('https://localhost:5000/upload') instanceof HTTPRequest)
            .toEqual(true);
        expect(httpRouter('localhost://foo')).toBeNull();
        expect(httpRouter('foo:5000/bar')).toBeNull();
    });
});
describeWithFlags('parseUrl', BROWSER_ENVS, () => {
    it('should parse url with no suffix', () => {
        const url = 'http://google.com/file';
        const [prefix, suffix] = parseUrl(url);
        expect(prefix).toEqual('http://google.com/');
        expect(suffix).toEqual('');
    });
    it('should parse url with suffix', () => {
        const url = 'http://google.com/file?param=1';
        const [prefix, suffix] = parseUrl(url);
        expect(prefix).toEqual('http://google.com/');
        expect(suffix).toEqual('?param=1');
    });
    it('should parse url with multiple serach params', () => {
        const url = 'http://google.com/a?x=1/file?param=1';
        const [prefix, suffix] = parseUrl(url);
        expect(prefix).toEqual('http://google.com/a?x=1/');
        expect(suffix).toEqual('?param=1');
    });
});
describeWithFlags('http-load', BROWSER_ENVS, () => {
    describe('JSON model', () => {
        let requestInits;
        beforeEach(() => {
            requestInits = {};
        });
        it('1 group, 2 weights, 1 path', async () => {
            const weightManifest1 = [{
                    paths: ['weightfile0'],
                    weights: [
                        {
                            name: 'dense/kernel',
                            shape: [3, 1],
                            dtype: 'float32',
                        },
                        {
                            name: 'dense/bias',
                            shape: [2],
                            dtype: 'float32',
                        }
                    ]
                }];
            const floatData = new Float32Array([1, 3, 3, 7, 4]);
            setupFakeWeightFiles({
                './model.json': {
                    data: JSON.stringify({
                        modelTopology: modelTopology1,
                        weightsManifest: weightManifest1,
                        format: 'tfjs-graph-model',
                        generatedBy: '1.15',
                        convertedBy: '1.3.1',
                        signature: null,
                        userDefinedMetadata: {},
                        modelInitializer: {}
                    }),
                    contentType: 'application/json'
                },
                './weightfile0': { data: floatData, contentType: 'application/octet-stream' },
            }, requestInits);
            const handler = tf.io.http('./model.json');
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs).toEqual(weightManifest1[0].weights);
            expect(modelArtifacts.format).toEqual('tfjs-graph-model');
            expect(modelArtifacts.generatedBy).toEqual('1.15');
            expect(modelArtifacts.convertedBy).toEqual('1.3.1');
            expect(modelArtifacts.userDefinedMetadata).toEqual({});
            expect(modelArtifacts.modelInitializer).toEqual({});
            expect(new Float32Array(CompositeArrayBuffer.join(modelArtifacts
                .weightData))).toEqual(floatData);
            expect(Object.keys(requestInits).length).toEqual(2);
            // Assert that fetch is invoked with `window` as the context.
            expect(fetchSpy.calls.mostRecent().object).toEqual(window);
        });
        it('1 group, 2 weights, 1 path, with requestInit', async () => {
            const weightManifest1 = [{
                    paths: ['weightfile0'],
                    weights: [
                        {
                            name: 'dense/kernel',
                            shape: [3, 1],
                            dtype: 'float32',
                        },
                        {
                            name: 'dense/bias',
                            shape: [2],
                            dtype: 'float32',
                        }
                    ]
                }];
            const floatData = new Float32Array([1, 3, 3, 7, 4]);
            setupFakeWeightFiles({
                './model.json': {
                    data: JSON.stringify({
                        modelTopology: modelTopology1,
                        weightsManifest: weightManifest1
                    }),
                    contentType: 'application/json'
                },
                './weightfile0': { data: floatData, contentType: 'application/octet-stream' },
            }, requestInits);
            const handler = tf.io.http('./model.json', { requestInit: { headers: { 'header_key_1': 'header_value_1' } } });
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs).toEqual(weightManifest1[0].weights);
            expect(new Float32Array(CompositeArrayBuffer.join(modelArtifacts
                .weightData))).toEqual(floatData);
            expect(Object.keys(requestInits).length).toEqual(2);
            expect(Object.keys(requestInits).length).toEqual(2);
            expect(requestInits['./model.json'].headers['header_key_1'])
                .toEqual('header_value_1');
            expect(requestInits['./weightfile0'].headers['header_key_1'])
                .toEqual('header_value_1');
            expect(fetchSpy.calls.mostRecent().object).toEqual(window);
        });
        it('1 group, 2 weight, 2 paths', async () => {
            const weightManifest1 = [{
                    paths: ['weightfile0', 'weightfile1'],
                    weights: [
                        {
                            name: 'dense/kernel',
                            shape: [3, 1],
                            dtype: 'float32',
                        },
                        {
                            name: 'dense/bias',
                            shape: [2],
                            dtype: 'float32',
                        }
                    ]
                }];
            const floatData1 = new Float32Array([1, 3, 3]);
            const floatData2 = new Float32Array([7, 4]);
            setupFakeWeightFiles({
                './model.json': {
                    data: JSON.stringify({
                        modelTopology: modelTopology1,
                        weightsManifest: weightManifest1
                    }),
                    contentType: 'application/json'
                },
                './weightfile0': { data: floatData1, contentType: 'application/octet-stream' },
                './weightfile1': { data: floatData2, contentType: 'application/octet-stream' }
            }, requestInits);
            const handler = tf.io.http('./model.json');
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs).toEqual(weightManifest1[0].weights);
            expect(new Float32Array(CompositeArrayBuffer.join(modelArtifacts
                .weightData))).toEqual(new Float32Array([1, 3, 3, 7, 4]));
        });
        it('2 groups, 2 weight, 2 paths', async () => {
            const weightsManifest = [
                {
                    paths: ['weightfile0'],
                    weights: [{
                            name: 'dense/kernel',
                            shape: [3, 1],
                            dtype: 'float32',
                        }]
                },
                {
                    paths: ['weightfile1'],
                    weights: [{
                            name: 'dense/bias',
                            shape: [2],
                            dtype: 'float32',
                        }],
                }
            ];
            const floatData1 = new Float32Array([1, 3, 3]);
            const floatData2 = new Float32Array([7, 4]);
            setupFakeWeightFiles({
                './model.json': {
                    data: JSON.stringify({ modelTopology: modelTopology1, weightsManifest }),
                    contentType: 'application/json'
                },
                './weightfile0': { data: floatData1, contentType: 'application/octet-stream' },
                './weightfile1': { data: floatData2, contentType: 'application/octet-stream' }
            }, requestInits);
            const handler = tf.io.http('./model.json');
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs)
                .toEqual(weightsManifest[0].weights.concat(weightsManifest[1].weights));
            expect(new Float32Array(CompositeArrayBuffer.join(modelArtifacts.weightData)))
                .toEqual(new Float32Array([1, 3, 3, 7, 4]));
        });
        it('2 groups, 2 weight, 2 paths, Int32 and Uint8 Data', async () => {
            const weightsManifest = [
                {
                    paths: ['weightfile0'],
                    weights: [{
                            name: 'fooWeight',
                            shape: [3, 1],
                            dtype: 'int32',
                        }]
                },
                {
                    paths: ['weightfile1'],
                    weights: [{
                            name: 'barWeight',
                            shape: [2],
                            dtype: 'bool',
                        }],
                }
            ];
            const floatData1 = new Int32Array([1, 3, 3]);
            const floatData2 = new Uint8Array([7, 4]);
            setupFakeWeightFiles({
                'path1/model.json': {
                    data: JSON.stringify({ modelTopology: modelTopology1, weightsManifest }),
                    contentType: 'application/json'
                },
                'path1/weightfile0': { data: floatData1, contentType: 'application/octet-stream' },
                'path1/weightfile1': { data: floatData2, contentType: 'application/octet-stream' }
            }, requestInits);
            const handler = tf.io.http('path1/model.json');
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs)
                .toEqual(weightsManifest[0].weights.concat(weightsManifest[1].weights));
            expect(new Int32Array(CompositeArrayBuffer.join(modelArtifacts.weightData)
                .slice(0, 12))).toEqual(new Int32Array([1, 3, 3]));
            expect(new Uint8Array(CompositeArrayBuffer.join(modelArtifacts.weightData)
                .slice(12, 14))).toEqual(new Uint8Array([7, 4]));
        });
        it('topology only', async () => {
            setupFakeWeightFiles({
                './model.json': {
                    data: JSON.stringify({ modelTopology: modelTopology1 }),
                    contentType: 'application/json'
                },
            }, requestInits);
            const handler = tf.io.http('./model.json');
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs).toBeUndefined();
            expect(modelArtifacts.weightData).toBeUndefined();
        });
        it('weights only', async () => {
            const weightsManifest = [
                {
                    paths: ['weightfile0'],
                    weights: [{
                            name: 'fooWeight',
                            shape: [3, 1],
                            dtype: 'int32',
                        }]
                },
                {
                    paths: ['weightfile1'],
                    weights: [{
                            name: 'barWeight',
                            shape: [2],
                            dtype: 'float32',
                        }],
                }
            ];
            const floatData1 = new Int32Array([1, 3, 3]);
            const floatData2 = new Float32Array([-7, -4]);
            setupFakeWeightFiles({
                'path1/model.json': {
                    data: JSON.stringify({ weightsManifest }),
                    contentType: 'application/json'
                },
                'path1/weightfile0': { data: floatData1, contentType: 'application/octet-stream' },
                'path1/weightfile1': { data: floatData2, contentType: 'application/octet-stream' }
            }, requestInits);
            const handler = tf.io.http('path1/model.json');
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toBeUndefined();
            expect(modelArtifacts.weightSpecs)
                .toEqual(weightsManifest[0].weights.concat(weightsManifest[1].weights));
            expect(new Int32Array(CompositeArrayBuffer.join(modelArtifacts.weightData)
                .slice(0, 12))).toEqual(new Int32Array([1, 3, 3]));
            expect(new Float32Array(CompositeArrayBuffer
                .join(modelArtifacts.weightData)
                .slice(12, 20))).toEqual(new Float32Array([-7, -4]));
        });
        it('Missing modelTopology and weightsManifest leads to error', async () => {
            setupFakeWeightFiles({
                'path1/model.json': { data: JSON.stringify({}), contentType: 'application/json' }
            }, requestInits);
            const handler = tf.io.http('path1/model.json');
            handler.load()
                .then(modelTopology1 => {
                fail('Loading from missing modelTopology and weightsManifest ' +
                    'succeeded unexpectedly.');
            })
                .catch(err => {
                expect(err.message)
                    .toMatch(/contains neither model topology or manifest/);
            });
            expect().nothing();
        });
        it('with fetch rejection leads to error', async () => {
            setupFakeWeightFiles({
                'path1/model.json': { data: JSON.stringify({}), contentType: 'text/html' }
            }, requestInits);
            const handler = tf.io.http('path2/model.json');
            try {
                const data = await handler.load();
                expect(data).toBeDefined();
                fail('Loading with fetch rejection succeeded unexpectedly.');
            }
            catch (err) {
                // This error is mocked in beforeEach
                expect(err).toEqual('path not found');
            }
        });
        it('Provide WeightFileTranslateFunc', async () => {
            const weightManifest1 = [{
                    paths: ['weightfile0'],
                    weights: [
                        {
                            name: 'dense/kernel',
                            shape: [3, 1],
                            dtype: 'float32',
                        },
                        {
                            name: 'dense/bias',
                            shape: [2],
                            dtype: 'float32',
                        }
                    ]
                }];
            const floatData = new Float32Array([1, 3, 3, 7, 4]);
            setupFakeWeightFiles({
                './model.json': {
                    data: JSON.stringify({
                        modelTopology: modelTopology1,
                        weightsManifest: weightManifest1
                    }),
                    contentType: 'application/json'
                },
                'auth_weightfile0': { data: floatData, contentType: 'application/octet-stream' },
            }, requestInits);
            async function prefixWeightUrlConverter(weightFile) {
                // Add 'auth_' prefix to the weight file url.
                return new Promise(resolve => setTimeout(resolve, 1, 'auth_' + weightFile));
            }
            const handler = tf.io.http('./model.json', {
                requestInit: { headers: { 'header_key_1': 'header_value_1' } },
                weightUrlConverter: prefixWeightUrlConverter
            });
            const modelArtifacts = await handler.load();
            expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
            expect(modelArtifacts.weightSpecs).toEqual(weightManifest1[0].weights);
            expect(new Float32Array(CompositeArrayBuffer.join(modelArtifacts.weightData))).toEqual(floatData);
            expect(Object.keys(requestInits).length).toEqual(2);
            expect(Object.keys(requestInits).length).toEqual(2);
            expect(requestInits['./model.json'].headers['header_key_1'])
                .toEqual('header_value_1');
            expect(requestInits['auth_weightfile0'].headers['header_key_1'])
                .toEqual('header_value_1');
            expect(fetchSpy.calls.mostRecent().object).toEqual(window);
        });
    });
    it('Overriding BrowserHTTPRequest fetchFunc', async () => {
        const weightManifest1 = [{
                paths: ['weightfile0'],
                weights: [
                    {
                        name: 'dense/kernel',
                        shape: [3, 1],
                        dtype: 'float32',
                    },
                    {
                        name: 'dense/bias',
                        shape: [2],
                        dtype: 'float32',
                    }
                ]
            }];
        const floatData = new Float32Array([1, 3, 3, 7, 4]);
        const fetchInputs = [];
        const fetchInits = [];
        async function customFetch(input, init) {
            fetchInputs.push(input);
            fetchInits.push(init);
            if (input === './model.json') {
                return new Response(JSON.stringify({
                    modelTopology: modelTopology1,
                    weightsManifest: weightManifest1,
                    trainingConfig: trainingConfig1
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            else if (input === './weightfile0') {
                return new Response(floatData, {
                    status: 200,
                    headers: { 'content-type': 'application/octet-stream' }
                });
            }
            else {
                return new Response(null, { status: 404 });
            }
        }
        const handler = tf.io.http('./model.json', { requestInit: { credentials: 'include' }, fetchFunc: customFetch });
        const modelArtifacts = await handler.load();
        expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
        expect(modelArtifacts.trainingConfig).toEqual(trainingConfig1);
        expect(modelArtifacts.weightSpecs).toEqual(weightManifest1[0].weights);
        expect(new Float32Array(CompositeArrayBuffer
            .join(modelArtifacts.weightData))).toEqual(floatData);
        expect(fetchInputs).toEqual(['./model.json', './weightfile0']);
        expect(fetchInits.length).toEqual(2);
        expect(fetchInits[0].credentials).toEqual('include');
        expect(fetchInits[1].credentials).toEqual('include');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cF90ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9pby9odHRwX3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDL0IsT0FBTyxFQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDeEYsT0FBTyxFQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBQ3pELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTlELGFBQWE7QUFDYixNQUFNLGNBQWMsR0FBTztJQUN6QixZQUFZLEVBQUUsWUFBWTtJQUMxQixlQUFlLEVBQUUsT0FBTztJQUN4QixRQUFRLEVBQUUsQ0FBQztZQUNULFlBQVksRUFBRSxPQUFPO1lBQ3JCLFFBQVEsRUFBRTtnQkFDUixvQkFBb0IsRUFBRTtvQkFDcEIsWUFBWSxFQUFFLGlCQUFpQjtvQkFDL0IsUUFBUSxFQUFFO3dCQUNSLGNBQWMsRUFBRSxTQUFTO3dCQUN6QixPQUFPLEVBQUUsR0FBRzt3QkFDWixNQUFNLEVBQUUsSUFBSTt3QkFDWixNQUFNLEVBQUUsU0FBUztxQkFDbEI7aUJBQ0Y7Z0JBQ0QsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsbUJBQW1CLEVBQUUsSUFBSTtnQkFDekIsa0JBQWtCLEVBQUUsSUFBSTtnQkFDeEIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsT0FBTyxFQUFFLFNBQVM7Z0JBQ2xCLFlBQVksRUFBRSxRQUFRO2dCQUN0QixXQUFXLEVBQUUsSUFBSTtnQkFDakIsb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsa0JBQWtCLEVBQUUsRUFBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxF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YUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsSUFBSSxZQUFZLENBQUMsb0JBQW9CO2FBQ3ZDLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0ICogYXMgdGYgZnJvbSAnLi4vaW5kZXgnO1xuaW1wb3J0IHtCUk9XU0VSX0VOVlMsIENIUk9NRV9FTlZTLCBkZXNjcmliZVdpdGhGbGFncywgTk9ERV9FTlZTfSBmcm9tICcuLi9qYXNtaW5lX3V0aWwnO1xuaW1wb3J0IHtIVFRQUmVxdWVzdCwgaHR0cFJvdXRlciwgcGFyc2VVcmx9IGZyb20gJy4vaHR0cCc7XG5pbXBvcnQge0NvbXBvc2l0ZUFycmF5QnVmZmVyfSBmcm9tICcuL2NvbXBvc2l0ZV9hcnJheV9idWZmZXInO1xuXG4vLyBUZXN0IGRhdGEuXG5jb25zdCBtb2RlbFRvcG9sb2d5MToge30gPSB7XG4gICdjbGFzc19uYW1lJzogJ1NlcXVlbnRpYWwnLFxuICAna2VyYXNfdmVyc2lvbic6ICcyLjEuNCcsXG4gICdjb25maWcnOiBbe1xuICAgICdjbGFzc19uYW1lJzogJ0RlbnNlJyxcbiAgICAnY29uZmlnJzoge1xuICAgICAgJ2tlcm5lbF9pbml0aWFsaXplcic6IHtcbiAgICAgICAgJ2NsYXNzX25hbWUnOiAnVmFyaWFuY2VTY2FsaW5nJyxcbiAgICAgICAgJ2NvbmZpZyc6IHtcbiAgICAgICAgICAnZGlzdHJpYnV0aW9uJzogJ3VuaWZvcm0nLFxuICAgICAgICAgICdzY2FsZSc6IDEuMCxcbiAgICAgICAgICAnc2VlZCc6IG51bGwsXG4gICAgICAgICAgJ21vZGUnOiAnZmFuX2F2ZydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICduYW1lJzogJ2RlbnNlJyxcbiAgICAgICdrZXJuZWxfY29uc3RyYWludCc6IG51bGwsXG4gICAgICAnYmlhc19yZWd1bGFyaXplcic6IG51bGwsXG4gICAgICAnYmlhc19jb25zdHJhaW50JzogbnVsbCxcbiAgICAgICdkdHlwZSc6ICdmbG9hdDMyJyxcbiAgICAgICdhY3RpdmF0aW9uJzogJ2xpbmVhcicsXG4gICAgICAndHJhaW5hYmxlJzogdHJ1ZSxcbiAgICAgICdrZXJuZWxfcmVndWxhcml6ZXInOiBudWxsLFxuICAgICAgJ2JpYXNfaW5pdGlhbGl6ZXInOiB7J2NsYXNzX25hbWUnOiAnWmVyb3MnLCAnY29uZmlnJzoge319LFxuICAgICAgJ3VuaXRzJzogMSxcbiAgICAgICdiYXRjaF9pbnB1dF9zaGFwZSc6IFtudWxsLCAzXSxcbiAgICAgICd1c2VfYmlhcyc6IHRydWUsXG4gICAgICAnYWN0aXZpdHlfcmVndWxhcml6ZXInOiBudWxsXG4gICAgfVxuICB9XSxcbiAgJ2JhY2tlbmQnOiAndGVuc29yZmxvdydcbn07XG5jb25zdCB0cmFpbmluZ0NvbmZpZzE6IHRmLmlvLlRyYWluaW5nQ29uZmlnID0ge1xuICBsb3NzOiAnY2F0ZWdvcmljYWxfY3Jvc3NlbnRyb3B5JyxcbiAgbWV0cmljczogWydhY2N1cmFjeSddLFxuICBvcHRpbWl6ZXJfY29uZmlnOiB7Y2xhc3NfbmFtZTogJ1NHRCcsIGNvbmZpZzoge2xlYXJuaW5nUmF0ZTogMC4xfX1cbn07XG5cbmxldCBmZXRjaFNweTogamFzbWluZS5TcHk7XG5cbnR5cGUgVHlwZWRBcnJheXMgPSBGbG9hdDMyQXJyYXl8SW50MzJBcnJheXxVaW50OEFycmF5fFVpbnQxNkFycmF5O1xuY29uc3QgZmFrZVJlc3BvbnNlID1cbiAgICAoYm9keTogc3RyaW5nfFR5cGVkQXJyYXlzfEFycmF5QnVmZmVyLCBjb250ZW50VHlwZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+XG4gICAgICAgICh7XG4gICAgICAgICAgb2s6IHRydWUsXG4gICAgICAgICAganNvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoSlNPTi5wYXJzZShib2R5IGFzIHN0cmluZykpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYXJyYXlCdWZmZXIoKSB7XG4gICAgICAgICAgICBjb25zdCBidWY6IEFycmF5QnVmZmVyID0gKGJvZHkgYXMgVHlwZWRBcnJheXMpLmJ1ZmZlciA/XG4gICAgICAgICAgICAgICAgKGJvZHkgYXMgVHlwZWRBcnJheXMpLmJ1ZmZlciA6XG4gICAgICAgICAgICAgICAgYm9keSBhcyBBcnJheUJ1ZmZlcjtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoYnVmKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhlYWRlcnM6IHtnZXQ6IChrZXk6IHN0cmluZykgPT4gY29udGVudFR5cGV9LFxuICAgICAgICAgIHVybDogcGF0aFxuICAgICAgICB9KSBhcyB1bmtub3duIGFzIFJlc3BvbnNlO1xuXG5jb25zdCBzZXR1cEZha2VXZWlnaHRGaWxlcyA9XG4gICAgKGZpbGVCdWZmZXJNYXA6IHtcbiAgICAgIFtmaWxlbmFtZTogc3RyaW5nXToge1xuICAgICAgICBkYXRhOiBzdHJpbmd8RmxvYXQzMkFycmF5fEludDMyQXJyYXl8QXJyYXlCdWZmZXJ8VWludDhBcnJheXxVaW50MTZBcnJheSxcbiAgICAgICAgY29udGVudFR5cGU6IHN0cmluZ1xuICAgICAgfVxuICAgIH0sXG4gICAgIHJlcXVlc3RJbml0czoge1trZXk6IHN0cmluZ106IFJlcXVlc3RJbml0fSkgPT4ge1xuICAgICAgZmV0Y2hTcHkgPSBzcHlPbih0Zi5lbnYoKS5wbGF0Zm9ybSwgJ2ZldGNoJylcbiAgICAgICAgICAgICAgICAgICAgIC5hbmQuY2FsbEZha2UoKHBhdGg6IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVCdWZmZXJNYXBbcGF0aF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0SW5pdHNbcGF0aF0gPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFrZVJlc3BvbnNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlQnVmZmVyTWFwW3BhdGhdLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVCdWZmZXJNYXBbcGF0aF0uY29udGVudFR5cGUsIHBhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ3BhdGggbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbmRlc2NyaWJlV2l0aEZsYWdzKCdodHRwLWxvYWQgZmV0Y2gnLCBOT0RFX0VOVlMsICgpID0+IHtcbiAgbGV0IHJlcXVlc3RJbml0czoge1trZXk6IHN0cmluZ106IHtoZWFkZXJzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfX19O1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIGxldCBvcmlnaW5hbEZldGNoOiBhbnk7XG4gIC8vIHNpbXVsYXRlIGEgZmV0Y2ggcG9seWZpbGwsIHRoaXMgbmVlZHMgdG8gYmUgbm9uLW51bGwgZm9yIHNweU9uIHRvIHdvcmtcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIG9yaWdpbmFsRmV0Y2ggPSAoZ2xvYmFsIGFzIGFueSkuZmV0Y2g7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIChnbG9iYWwgYXMgYW55KS5mZXRjaCA9ICgpID0+IHt9O1xuICAgIHJlcXVlc3RJbml0cyA9IHt9O1xuICB9KTtcblxuICBhZnRlckFsbCgoKSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIChnbG9iYWwgYXMgYW55KS5mZXRjaCA9IG9yaWdpbmFsRmV0Y2g7XG4gIH0pO1xuXG4gIGl0KCcxIGdyb3VwLCAyIHdlaWdodHMsIDEgcGF0aCcsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB3ZWlnaHRNYW5pZmVzdDE6IHRmLmlvLldlaWdodHNNYW5pZmVzdENvbmZpZyA9IFt7XG4gICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMCddLFxuICAgICAgd2VpZ2h0czogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ2RlbnNlL2tlcm5lbCcsXG4gICAgICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ2RlbnNlL2JpYXMnLFxuICAgICAgICAgIHNoYXBlOiBbMl0sXG4gICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1dO1xuICAgIGNvbnN0IGZsb2F0RGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDMsIDMsIDcsIDRdKTtcbiAgICBzZXR1cEZha2VXZWlnaHRGaWxlcyhcbiAgICAgICAge1xuICAgICAgICAgICcuL21vZGVsLmpzb24nOiB7XG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIG1vZGVsVG9wb2xvZ3k6IG1vZGVsVG9wb2xvZ3kxLFxuICAgICAgICAgICAgICB3ZWlnaHRzTWFuaWZlc3Q6IHdlaWdodE1hbmlmZXN0MSxcbiAgICAgICAgICAgICAgZm9ybWF0OiAndGZqcy1sYXllcnMnLFxuICAgICAgICAgICAgICBnZW5lcmF0ZWRCeTogJzEuMTUnLFxuICAgICAgICAgICAgICBjb252ZXJ0ZWRCeTogJzEuMy4xJyxcbiAgICAgICAgICAgICAgc2lnbmF0dXJlOiBudWxsLFxuICAgICAgICAgICAgICB1c2VyRGVmaW5lZE1ldGFkYXRhOiB7fVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnLi93ZWlnaHRmaWxlMCc6XG4gICAgICAgICAgICAgIHtkYXRhOiBmbG9hdERhdGEsIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ30sXG4gICAgICAgIH0sXG4gICAgICAgIHJlcXVlc3RJbml0cyk7XG5cbiAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uaHR0cCgnLi9tb2RlbC5qc29uJyk7XG4gICAgY29uc3QgbW9kZWxBcnRpZmFjdHMgPSBhd2FpdCBoYW5kbGVyLmxvYWQoKTtcbiAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLndlaWdodFNwZWNzKS50b0VxdWFsKHdlaWdodE1hbmlmZXN0MVswXS53ZWlnaHRzKTtcbiAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMuZm9ybWF0KS50b0VxdWFsKCd0ZmpzLWxheWVycycpO1xuICAgIGV4cGVjdChtb2RlbEFydGlmYWN0cy5nZW5lcmF0ZWRCeSkudG9FcXVhbCgnMS4xNScpO1xuICAgIGV4cGVjdChtb2RlbEFydGlmYWN0cy5jb252ZXJ0ZWRCeSkudG9FcXVhbCgnMS4zLjEnKTtcbiAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMudXNlckRlZmluZWRNZXRhZGF0YSkudG9FcXVhbCh7fSk7XG4gICAgZXhwZWN0KG5ldyBGbG9hdDMyQXJyYXkoQ29tcG9zaXRlQXJyYXlCdWZmZXIuam9pbihcbiAgICAgICAgbW9kZWxBcnRpZmFjdHMud2VpZ2h0RGF0YSkpKS50b0VxdWFsKGZsb2F0RGF0YSk7XG4gIH0pO1xuXG4gIGl0KCd0aHJvdyBleGNlcHRpb24gaWYgbm8gZmV0Y2ggcG9seWZpbGwnLCAoKSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIGRlbGV0ZSAoZ2xvYmFsIGFzIGFueSkuZmV0Y2g7XG4gICAgdHJ5IHtcbiAgICAgIHRmLmlvLmh0dHAoJy4vbW9kZWwuanNvbicpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgZXhwZWN0KGVyci5tZXNzYWdlKS50b01hdGNoKC9VbmFibGUgdG8gZmluZCBmZXRjaCBwb2x5ZmlsbC4vKTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIFR1cm5lZCBvZmYgZm9yIG90aGVyIGJyb3dzZXJzIGR1ZSB0bzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS90ZW5zb3JmbG93L3RmanMvaXNzdWVzLzQyNlxuZGVzY3JpYmVXaXRoRmxhZ3MoJ2h0dHAtc2F2ZScsIENIUk9NRV9FTlZTLCAoKSA9PiB7XG4gIC8vIFRlc3QgZGF0YS5cbiAgY29uc3Qgd2VpZ2h0U3BlY3MxOiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RFbnRyeVtdID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdkZW5zZS9rZXJuZWwnLFxuICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgIGR0eXBlOiAnZmxvYXQzMicsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnZGVuc2UvYmlhcycsXG4gICAgICBzaGFwZTogWzFdLFxuICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICB9XG4gIF07XG4gIGNvbnN0IHdlaWdodERhdGExID0gbmV3IEFycmF5QnVmZmVyKDE2KTtcbiAgY29uc3QgYXJ0aWZhY3RzMTogdGYuaW8uTW9kZWxBcnRpZmFjdHMgPSB7XG4gICAgbW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsXG4gICAgd2VpZ2h0U3BlY3M6IHdlaWdodFNwZWNzMSxcbiAgICB3ZWlnaHREYXRhOiB3ZWlnaHREYXRhMSxcbiAgICBmb3JtYXQ6ICdsYXllcnMtbW9kZWwnLFxuICAgIGdlbmVyYXRlZEJ5OiAnVGVuc29yRmxvdy5qcyB2MC4wLjAnLFxuICAgIGNvbnZlcnRlZEJ5OiBudWxsLFxuICAgIHNpZ25hdHVyZTogbnVsbCxcbiAgICB1c2VyRGVmaW5lZE1ldGFkYXRhOiB7fSxcbiAgICBtb2RlbEluaXRpYWxpemVyOiB7fSxcbiAgICB0cmFpbmluZ0NvbmZpZzogdHJhaW5pbmdDb25maWcxXG4gIH07XG5cbiAgbGV0IHJlcXVlc3RJbml0czogUmVxdWVzdEluaXRbXSA9IFtdO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIHJlcXVlc3RJbml0cyA9IFtdO1xuICAgIHNweU9uKHRmLmVudigpLnBsYXRmb3JtLCAnZmV0Y2gnKVxuICAgICAgICAuYW5kLmNhbGxGYWtlKChwYXRoOiBzdHJpbmcsIGluaXQ6IFJlcXVlc3RJbml0KSA9PiB7XG4gICAgICAgICAgaWYgKHBhdGggPT09ICdtb2RlbC11cGxvYWQtdGVzdCcgfHxcbiAgICAgICAgICAgICAgcGF0aCA9PT0gJ2h0dHA6Ly9tb2RlbC11cGxvYWQtdGVzdCcpIHtcbiAgICAgICAgICAgIHJlcXVlc3RJbml0cy5wdXNoKGluaXQpO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMjAwfSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDQwNH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9KTtcblxuICBpdCgnU2F2ZSB0b3BvbG9neSBhbmQgd2VpZ2h0cywgZGVmYXVsdCBQT1NUIG1ldGhvZCcsIChkb25lKSA9PiB7XG4gICAgY29uc3QgdGVzdFN0YXJ0RGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgaGFuZGxlciA9IHRmLmlvLmdldFNhdmVIYW5kbGVycygnaHR0cDovL21vZGVsLXVwbG9hZC10ZXN0JylbMF07XG4gICAgaGFuZGxlci5zYXZlKGFydGlmYWN0czEpXG4gICAgICAgIC50aGVuKHNhdmVSZXN1bHQgPT4ge1xuICAgICAgICAgIGV4cGVjdChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby5kYXRlU2F2ZWQuZ2V0VGltZSgpKVxuICAgICAgICAgICAgICAudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCh0ZXN0U3RhcnREYXRlLmdldFRpbWUoKSk7XG4gICAgICAgICAgLy8gTm90ZTogVGhlIGZvbGxvd2luZyB0d28gYXNzZXJ0aW9ucyB3b3JrIG9ubHkgYmVjYXVzZSB0aGVyZSBpcyBub1xuICAgICAgICAgIC8vICAgbm9uLUFTQ0lJIGNoYXJhY3RlcnMgaW4gYG1vZGVsVG9wb2xvZ3kxYCBhbmQgYHdlaWdodFNwZWNzMWAuXG4gICAgICAgICAgZXhwZWN0KHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lCeXRlcylcbiAgICAgICAgICAgICAgLnRvRXF1YWwoSlNPTi5zdHJpbmdpZnkobW9kZWxUb3BvbG9neTEpLmxlbmd0aCk7XG4gICAgICAgICAgZXhwZWN0KHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodFNwZWNzQnl0ZXMpXG4gICAgICAgICAgICAgIC50b0VxdWFsKEpTT04uc3RyaW5naWZ5KHdlaWdodFNwZWNzMSkubGVuZ3RoKTtcbiAgICAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0RGF0YUJ5dGVzKVxuICAgICAgICAgICAgICAudG9FcXVhbCh3ZWlnaHREYXRhMS5ieXRlTGVuZ3RoKTtcblxuICAgICAgICAgIGV4cGVjdChyZXF1ZXN0SW5pdHMubGVuZ3RoKS50b0VxdWFsKDEpO1xuICAgICAgICAgIGNvbnN0IGluaXQgPSByZXF1ZXN0SW5pdHNbMF07XG4gICAgICAgICAgZXhwZWN0KGluaXQubWV0aG9kKS50b0VxdWFsKCdQT1NUJyk7XG4gICAgICAgICAgY29uc3QgYm9keSA9IGluaXQuYm9keSBhcyBGb3JtRGF0YTtcbiAgICAgICAgICBjb25zdCBqc29uRmlsZSA9IGJvZHkuZ2V0KCdtb2RlbC5qc29uJykgYXMgRmlsZTtcbiAgICAgICAgICBjb25zdCBqc29uRmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAganNvbkZpbGVSZWFkZXIub25sb2FkID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbW9kZWxKU09OID1cbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgSlNPTi5wYXJzZSgoZXZlbnQudGFyZ2V0IGFzIGFueSkucmVzdWx0KSBhcyB0Zi5pby5Nb2RlbEpTT047XG4gICAgICAgICAgICBleHBlY3QobW9kZWxKU09OLm1vZGVsVG9wb2xvZ3kpLnRvRXF1YWwobW9kZWxUb3BvbG9neTEpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi53ZWlnaHRzTWFuaWZlc3QubGVuZ3RoKS50b0VxdWFsKDEpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi53ZWlnaHRzTWFuaWZlc3RbMF0ud2VpZ2h0cykudG9FcXVhbCh3ZWlnaHRTcGVjczEpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi50cmFpbmluZ0NvbmZpZykudG9FcXVhbCh0cmFpbmluZ0NvbmZpZzEpO1xuXG4gICAgICAgICAgICBjb25zdCB3ZWlnaHRzRmlsZSA9IGJvZHkuZ2V0KCdtb2RlbC53ZWlnaHRzLmJpbicpIGFzIEZpbGU7XG4gICAgICAgICAgICBjb25zdCB3ZWlnaHRzRmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICB3ZWlnaHRzRmlsZVJlYWRlci5vbmxvYWQgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgICAgY29uc3Qgd2VpZ2h0RGF0YSA9IChldmVudC50YXJnZXQgYXMgYW55KS5yZXN1bHQgYXMgQXJyYXlCdWZmZXI7XG4gICAgICAgICAgICAgIGV4cGVjdChuZXcgVWludDhBcnJheSh3ZWlnaHREYXRhKSlcbiAgICAgICAgICAgICAgICAgIC50b0VxdWFsKG5ldyBVaW50OEFycmF5KHdlaWdodERhdGExKSk7XG4gICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3ZWlnaHRzRmlsZVJlYWRlci5vbmVycm9yID0gZXYgPT4ge1xuICAgICAgICAgICAgICBkb25lLmZhaWwod2VpZ2h0c0ZpbGVSZWFkZXIuZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd2VpZ2h0c0ZpbGVSZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIod2VpZ2h0c0ZpbGUpO1xuICAgICAgICAgIH07XG4gICAgICAgICAganNvbkZpbGVSZWFkZXIub25lcnJvciA9IGV2ID0+IHtcbiAgICAgICAgICAgIGRvbmUuZmFpbChqc29uRmlsZVJlYWRlci5lcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGpzb25GaWxlUmVhZGVyLnJlYWRBc1RleHQoanNvbkZpbGUpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICBkb25lLmZhaWwoZXJyLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdTYXZlIHRvcG9sb2d5IG9ubHksIGRlZmF1bHQgUE9TVCBtZXRob2QnLCAoZG9uZSkgPT4ge1xuICAgIGNvbnN0IHRlc3RTdGFydERhdGUgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnMoJ2h0dHA6Ly9tb2RlbC11cGxvYWQtdGVzdCcpWzBdO1xuICAgIGNvbnN0IHRvcG9sb2d5T25seUFydGlmYWN0cyA9IHttb2RlbFRvcG9sb2d5OiBtb2RlbFRvcG9sb2d5MX07XG4gICAgaGFuZGxlci5zYXZlKHRvcG9sb2d5T25seUFydGlmYWN0cylcbiAgICAgICAgLnRoZW4oc2F2ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgZXhwZWN0KHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLmRhdGVTYXZlZC5nZXRUaW1lKCkpXG4gICAgICAgICAgICAgIC50b0JlR3JlYXRlclRoYW5PckVxdWFsKHRlc3RTdGFydERhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgICAvLyBOb3RlOiBUaGUgZm9sbG93aW5nIHR3byBhc3NlcnRpb25zIHdvcmsgb25seSBiZWNhdXNlIHRoZXJlIGlzIG5vXG4gICAgICAgICAgLy8gICBub24tQVNDSUkgY2hhcmFjdGVycyBpbiBgbW9kZWxUb3BvbG9neTFgIGFuZCBgd2VpZ2h0U3BlY3MxYC5cbiAgICAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ubW9kZWxUb3BvbG9neUJ5dGVzKVxuICAgICAgICAgICAgICAudG9FcXVhbChKU09OLnN0cmluZ2lmeShtb2RlbFRvcG9sb2d5MSkubGVuZ3RoKTtcbiAgICAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0U3BlY3NCeXRlcykudG9FcXVhbCgwKTtcbiAgICAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0RGF0YUJ5dGVzKS50b0VxdWFsKDApO1xuXG4gICAgICAgICAgZXhwZWN0KHJlcXVlc3RJbml0cy5sZW5ndGgpLnRvRXF1YWwoMSk7XG4gICAgICAgICAgY29uc3QgaW5pdCA9IHJlcXVlc3RJbml0c1swXTtcbiAgICAgICAgICBleHBlY3QoaW5pdC5tZXRob2QpLnRvRXF1YWwoJ1BPU1QnKTtcbiAgICAgICAgICBjb25zdCBib2R5ID0gaW5pdC5ib2R5IGFzIEZvcm1EYXRhO1xuICAgICAgICAgIGNvbnN0IGpzb25GaWxlID0gYm9keS5nZXQoJ21vZGVsLmpzb24nKSBhcyBGaWxlO1xuICAgICAgICAgIGNvbnN0IGpzb25GaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICBqc29uRmlsZVJlYWRlci5vbmxvYWQgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICBjb25zdCBtb2RlbEpTT04gPSBKU09OLnBhcnNlKChldmVudC50YXJnZXQgYXMgYW55KS5yZXN1bHQpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi5tb2RlbFRvcG9sb2d5KS50b0VxdWFsKG1vZGVsVG9wb2xvZ3kxKTtcbiAgICAgICAgICAgIC8vIE5vIHdlaWdodHMgc2hvdWxkIGhhdmUgYmVlbiBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICAgICAgICBleHBlY3QoYm9keS5nZXQoJ21vZGVsLndlaWdodHMuYmluJykpLnRvRXF1YWwobnVsbCk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBqc29uRmlsZVJlYWRlci5vbmVycm9yID0gZXZlbnQgPT4ge1xuICAgICAgICAgICAgZG9uZS5mYWlsKGpzb25GaWxlUmVhZGVyLmVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgIH07XG4gICAgICAgICAganNvbkZpbGVSZWFkZXIucmVhZEFzVGV4dChqc29uRmlsZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgIGRvbmUuZmFpbChlcnIuc3RhY2spO1xuICAgICAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ1NhdmUgdG9wb2xvZ3kgYW5kIHdlaWdodHMsIFBVVCBtZXRob2QsIGV4dHJhIGhlYWRlcnMnLCAoZG9uZSkgPT4ge1xuICAgIGNvbnN0IHRlc3RTdGFydERhdGUgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5odHRwKCdtb2RlbC11cGxvYWQtdGVzdCcsIHtcbiAgICAgIHJlcXVlc3RJbml0OiB7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6XG4gICAgICAgICAgICB7J2hlYWRlcl9rZXlfMSc6ICdoZWFkZXJfdmFsdWVfMScsICdoZWFkZXJfa2V5XzInOiAnaGVhZGVyX3ZhbHVlXzInfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGhhbmRsZXIuc2F2ZShhcnRpZmFjdHMxKVxuICAgICAgICAudGhlbihzYXZlUmVzdWx0ID0+IHtcbiAgICAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8uZGF0ZVNhdmVkLmdldFRpbWUoKSlcbiAgICAgICAgICAgICAgLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwodGVzdFN0YXJ0RGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICAgIC8vIE5vdGU6IFRoZSBmb2xsb3dpbmcgdHdvIGFzc2VydGlvbnMgd29yayBvbmx5IGJlY2F1c2UgdGhlcmUgaXMgbm9cbiAgICAgICAgICAvLyAgIG5vbi1BU0NJSSBjaGFyYWN0ZXJzIGluIGBtb2RlbFRvcG9sb2d5MWAgYW5kIGB3ZWlnaHRTcGVjczFgLlxuICAgICAgICAgIGV4cGVjdChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgICAgIC50b0VxdWFsKEpTT04uc3RyaW5naWZ5KG1vZGVsVG9wb2xvZ3kxKS5sZW5ndGgpO1xuICAgICAgICAgIGV4cGVjdChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHRTcGVjc0J5dGVzKVxuICAgICAgICAgICAgICAudG9FcXVhbChKU09OLnN0cmluZ2lmeSh3ZWlnaHRTcGVjczEpLmxlbmd0aCk7XG4gICAgICAgICAgZXhwZWN0KHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodERhdGFCeXRlcylcbiAgICAgICAgICAgICAgLnRvRXF1YWwod2VpZ2h0RGF0YTEuYnl0ZUxlbmd0aCk7XG5cbiAgICAgICAgICBleHBlY3QocmVxdWVzdEluaXRzLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgICAgICAgICBjb25zdCBpbml0ID0gcmVxdWVzdEluaXRzWzBdO1xuICAgICAgICAgIGV4cGVjdChpbml0Lm1ldGhvZCkudG9FcXVhbCgnUFVUJyk7XG5cbiAgICAgICAgICAvLyBDaGVjayBoZWFkZXJzLlxuICAgICAgICAgIGV4cGVjdChpbml0LmhlYWRlcnMpLnRvRXF1YWwoe1xuICAgICAgICAgICAgJ2hlYWRlcl9rZXlfMSc6ICdoZWFkZXJfdmFsdWVfMScsXG4gICAgICAgICAgICAnaGVhZGVyX2tleV8yJzogJ2hlYWRlcl92YWx1ZV8yJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3QgYm9keSA9IGluaXQuYm9keSBhcyBGb3JtRGF0YTtcbiAgICAgICAgICBjb25zdCBqc29uRmlsZSA9IGJvZHkuZ2V0KCdtb2RlbC5qc29uJykgYXMgRmlsZTtcbiAgICAgICAgICBjb25zdCBqc29uRmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAganNvbkZpbGVSZWFkZXIub25sb2FkID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbW9kZWxKU09OID1cbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgSlNPTi5wYXJzZSgoZXZlbnQudGFyZ2V0IGFzIGFueSkucmVzdWx0KSBhcyB0Zi5pby5Nb2RlbEpTT047XG4gICAgICAgICAgICBleHBlY3QobW9kZWxKU09OLmZvcm1hdCkudG9FcXVhbCgnbGF5ZXJzLW1vZGVsJyk7XG4gICAgICAgICAgICBleHBlY3QobW9kZWxKU09OLmdlbmVyYXRlZEJ5KS50b0VxdWFsKCdUZW5zb3JGbG93LmpzIHYwLjAuMCcpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi5jb252ZXJ0ZWRCeSkudG9FcXVhbChudWxsKTtcbiAgICAgICAgICAgIGV4cGVjdChtb2RlbEpTT04ubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgICAgICAgICBleHBlY3QobW9kZWxKU09OLm1vZGVsSW5pdGlhbGl6ZXIpLnRvRXF1YWwoe30pO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi53ZWlnaHRzTWFuaWZlc3QubGVuZ3RoKS50b0VxdWFsKDEpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi53ZWlnaHRzTWFuaWZlc3RbMF0ud2VpZ2h0cykudG9FcXVhbCh3ZWlnaHRTcGVjczEpO1xuICAgICAgICAgICAgZXhwZWN0KG1vZGVsSlNPTi50cmFpbmluZ0NvbmZpZykudG9FcXVhbCh0cmFpbmluZ0NvbmZpZzEpO1xuXG4gICAgICAgICAgICBjb25zdCB3ZWlnaHRzRmlsZSA9IGJvZHkuZ2V0KCdtb2RlbC53ZWlnaHRzLmJpbicpIGFzIEZpbGU7XG4gICAgICAgICAgICBjb25zdCB3ZWlnaHRzRmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICB3ZWlnaHRzRmlsZVJlYWRlci5vbmxvYWQgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgICAgY29uc3Qgd2VpZ2h0RGF0YSA9IChldmVudC50YXJnZXQgYXMgYW55KS5yZXN1bHQgYXMgQXJyYXlCdWZmZXI7XG4gICAgICAgICAgICAgIGV4cGVjdChuZXcgVWludDhBcnJheSh3ZWlnaHREYXRhKSlcbiAgICAgICAgICAgICAgICAgIC50b0VxdWFsKG5ldyBVaW50OEFycmF5KHdlaWdodERhdGExKSk7XG4gICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3ZWlnaHRzRmlsZVJlYWRlci5vbmVycm9yID0gZXZlbnQgPT4ge1xuICAgICAgICAgICAgICBkb25lLmZhaWwod2VpZ2h0c0ZpbGVSZWFkZXIuZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd2VpZ2h0c0ZpbGVSZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIod2VpZ2h0c0ZpbGUpO1xuICAgICAgICAgIH07XG4gICAgICAgICAganNvbkZpbGVSZWFkZXIub25lcnJvciA9IGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGRvbmUuZmFpbChqc29uRmlsZVJlYWRlci5lcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGpzb25GaWxlUmVhZGVyLnJlYWRBc1RleHQoanNvbkZpbGUpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICBkb25lLmZhaWwoZXJyLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gIH0pO1xuXG4gIGl0KCc0MDQgcmVzcG9uc2UgY2F1c2VzIEVycm9yJywgKGRvbmUpID0+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKCdodHRwOi8vaW52YWxpZC9wYXRoJylbMF07XG4gICAgaGFuZGxlci5zYXZlKGFydGlmYWN0czEpXG4gICAgICAgIC50aGVuKHNhdmVSZXN1bHQgPT4ge1xuICAgICAgICAgIGRvbmUuZmFpbChcbiAgICAgICAgICAgICAgJ0NhbGxpbmcgaHR0cCBhdCBpbnZhbGlkIFVSTCBzdWNjZWVkZWQgJyArXG4gICAgICAgICAgICAgICd1bmV4cGVjdGVkbHknKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgZXhwZWN0KCkubm90aGluZygpO1xuICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdnZXRMb2FkSGFuZGxlcnMgd2l0aCBvbmUgVVJMIHN0cmluZycsICgpID0+IHtcbiAgICBjb25zdCBoYW5kbGVycyA9IHRmLmlvLmdldExvYWRIYW5kbGVycygnaHR0cDovL2Zvby9tb2RlbC5qc29uJyk7XG4gICAgZXhwZWN0KGhhbmRsZXJzLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgICBleHBlY3QoaGFuZGxlcnNbMF0gaW5zdGFuY2VvZiBIVFRQUmVxdWVzdCkudG9FcXVhbCh0cnVlKTtcbiAgfSk7XG5cbiAgaXQoJ0V4aXN0aW5nIGJvZHkgbGVhZHMgdG8gRXJyb3InLCAoKSA9PiB7XG4gICAgZXhwZWN0KCgpID0+IHRmLmlvLmh0dHAoJ21vZGVsLXVwbG9hZC10ZXN0Jywge1xuICAgICAgcmVxdWVzdEluaXQ6IHtib2R5OiAnZXhpc3RpbmcgYm9keSd9XG4gICAgfSkpLnRvVGhyb3dFcnJvcigvcmVxdWVzdEluaXQgaXMgZXhwZWN0ZWQgdG8gaGF2ZSBubyBwcmUtZXhpc3RpbmcgYm9keS8pO1xuICB9KTtcblxuICBpdCgnRW1wdHksIG51bGwgb3IgdW5kZWZpbmVkIFVSTCBwYXRocyBsZWFkIHRvIEVycm9yJywgKCkgPT4ge1xuICAgIGV4cGVjdCgoKSA9PiB0Zi5pby5odHRwKG51bGwpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKC9tdXN0IG5vdCBiZSBudWxsLCB1bmRlZmluZWQgb3IgZW1wdHkvKTtcbiAgICBleHBlY3QoKCkgPT4gdGYuaW8uaHR0cCh1bmRlZmluZWQpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKC9tdXN0IG5vdCBiZSBudWxsLCB1bmRlZmluZWQgb3IgZW1wdHkvKTtcbiAgICBleHBlY3QoKCkgPT4gdGYuaW8uaHR0cCgnJykpXG4gICAgICAgIC50b1Rocm93RXJyb3IoL211c3Qgbm90IGJlIG51bGwsIHVuZGVmaW5lZCBvciBlbXB0eS8pO1xuICB9KTtcblxuICBpdCgncm91dGVyJywgKCkgPT4ge1xuICAgIGV4cGVjdChodHRwUm91dGVyKCdodHRwOi8vYmFyL2ZvbycpIGluc3RhbmNlb2YgSFRUUFJlcXVlc3QpLnRvRXF1YWwodHJ1ZSk7XG4gICAgZXhwZWN0KGh0dHBSb3V0ZXIoJ2h0dHBzOi8vbG9jYWxob3N0OjUwMDAvdXBsb2FkJykgaW5zdGFuY2VvZiBIVFRQUmVxdWVzdClcbiAgICAgICAgLnRvRXF1YWwodHJ1ZSk7XG4gICAgZXhwZWN0KGh0dHBSb3V0ZXIoJ2xvY2FsaG9zdDovL2ZvbycpKS50b0JlTnVsbCgpO1xuICAgIGV4cGVjdChodHRwUm91dGVyKCdmb286NTAwMC9iYXInKSkudG9CZU51bGwoKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmVXaXRoRmxhZ3MoJ3BhcnNlVXJsJywgQlJPV1NFUl9FTlZTLCAoKSA9PiB7XG4gIGl0KCdzaG91bGQgcGFyc2UgdXJsIHdpdGggbm8gc3VmZml4JywgKCkgPT4ge1xuICAgIGNvbnN0IHVybCA9ICdodHRwOi8vZ29vZ2xlLmNvbS9maWxlJztcbiAgICBjb25zdCBbcHJlZml4LCBzdWZmaXhdID0gcGFyc2VVcmwodXJsKTtcbiAgICBleHBlY3QocHJlZml4KS50b0VxdWFsKCdodHRwOi8vZ29vZ2xlLmNvbS8nKTtcbiAgICBleHBlY3Qoc3VmZml4KS50b0VxdWFsKCcnKTtcbiAgfSk7XG4gIGl0KCdzaG91bGQgcGFyc2UgdXJsIHdpdGggc3VmZml4JywgKCkgPT4ge1xuICAgIGNvbnN0IHVybCA9ICdodHRwOi8vZ29vZ2xlLmNvbS9maWxlP3BhcmFtPTEnO1xuICAgIGNvbnN0IFtwcmVmaXgsIHN1ZmZpeF0gPSBwYXJzZVVybCh1cmwpO1xuICAgIGV4cGVjdChwcmVmaXgpLnRvRXF1YWwoJ2h0dHA6Ly9nb29nbGUuY29tLycpO1xuICAgIGV4cGVjdChzdWZmaXgpLnRvRXF1YWwoJz9wYXJhbT0xJyk7XG4gIH0pO1xuICBpdCgnc2hvdWxkIHBhcnNlIHVybCB3aXRoIG11bHRpcGxlIHNlcmFjaCBwYXJhbXMnLCAoKSA9PiB7XG4gICAgY29uc3QgdXJsID0gJ2h0dHA6Ly9nb29nbGUuY29tL2E/eD0xL2ZpbGU/cGFyYW09MSc7XG4gICAgY29uc3QgW3ByZWZpeCwgc3VmZml4XSA9IHBhcnNlVXJsKHVybCk7XG4gICAgZXhwZWN0KHByZWZpeCkudG9FcXVhbCgnaHR0cDovL2dvb2dsZS5jb20vYT94PTEvJyk7XG4gICAgZXhwZWN0KHN1ZmZpeCkudG9FcXVhbCgnP3BhcmFtPTEnKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmVXaXRoRmxhZ3MoJ2h0dHAtbG9hZCcsIEJST1dTRVJfRU5WUywgKCkgPT4ge1xuICBkZXNjcmliZSgnSlNPTiBtb2RlbCcsICgpID0+IHtcbiAgICBsZXQgcmVxdWVzdEluaXRzOiB7W2tleTogc3RyaW5nXToge2hlYWRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9fX07XG5cbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHJlcXVlc3RJbml0cyA9IHt9O1xuICAgIH0pO1xuXG4gICAgaXQoJzEgZ3JvdXAsIDIgd2VpZ2h0cywgMSBwYXRoJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgd2VpZ2h0TWFuaWZlc3QxOiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RDb25maWcgPSBbe1xuICAgICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMCddLFxuICAgICAgICB3ZWlnaHRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ2RlbnNlL2tlcm5lbCcsXG4gICAgICAgICAgICBzaGFwZTogWzMsIDFdLFxuICAgICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdkZW5zZS9iaWFzJyxcbiAgICAgICAgICAgIHNoYXBlOiBbMl0sXG4gICAgICAgICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfV07XG4gICAgICBjb25zdCBmbG9hdERhdGEgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAzLCAzLCA3LCA0XSk7XG4gICAgICBzZXR1cEZha2VXZWlnaHRGaWxlcyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAnLi9tb2RlbC5qc29uJzoge1xuICAgICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgbW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsXG4gICAgICAgICAgICAgICAgd2VpZ2h0c01hbmlmZXN0OiB3ZWlnaHRNYW5pZmVzdDEsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiAndGZqcy1ncmFwaC1tb2RlbCcsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVkQnk6ICcxLjE1JyxcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWRCeTogJzEuMy4xJyxcbiAgICAgICAgICAgICAgICBzaWduYXR1cmU6IG51bGwsXG4gICAgICAgICAgICAgICAgdXNlckRlZmluZWRNZXRhZGF0YToge30sXG4gICAgICAgICAgICAgICAgbW9kZWxJbml0aWFsaXplcjoge31cbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnLi93ZWlnaHRmaWxlMCc6XG4gICAgICAgICAgICAgICAge2RhdGE6IGZsb2F0RGF0YSwgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RJbml0cyk7XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5odHRwKCcuL21vZGVsLmpzb24nKTtcbiAgICAgIGNvbnN0IG1vZGVsQXJ0aWZhY3RzID0gYXdhaXQgaGFuZGxlci5sb2FkKCk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMud2VpZ2h0U3BlY3MpLnRvRXF1YWwod2VpZ2h0TWFuaWZlc3QxWzBdLndlaWdodHMpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLmZvcm1hdCkudG9FcXVhbCgndGZqcy1ncmFwaC1tb2RlbCcpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLmdlbmVyYXRlZEJ5KS50b0VxdWFsKCcxLjE1Jyk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMuY29udmVydGVkQnkpLnRvRXF1YWwoJzEuMy4xJyk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMudXNlckRlZmluZWRNZXRhZGF0YSkudG9FcXVhbCh7fSk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMubW9kZWxJbml0aWFsaXplcikudG9FcXVhbCh7fSk7XG5cbiAgICAgIGV4cGVjdChuZXcgRmxvYXQzMkFycmF5KENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4obW9kZWxBcnRpZmFjdHNcbiAgICAgICAgICAud2VpZ2h0RGF0YSkpKS50b0VxdWFsKGZsb2F0RGF0YSk7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXMocmVxdWVzdEluaXRzKS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gICAgICAvLyBBc3NlcnQgdGhhdCBmZXRjaCBpcyBpbnZva2VkIHdpdGggYHdpbmRvd2AgYXMgdGhlIGNvbnRleHQuXG4gICAgICBleHBlY3QoZmV0Y2hTcHkuY2FsbHMubW9zdFJlY2VudCgpLm9iamVjdCkudG9FcXVhbCh3aW5kb3cpO1xuICAgIH0pO1xuXG4gICAgaXQoJzEgZ3JvdXAsIDIgd2VpZ2h0cywgMSBwYXRoLCB3aXRoIHJlcXVlc3RJbml0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgd2VpZ2h0TWFuaWZlc3QxOiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RDb25maWcgPSBbe1xuICAgICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMCddLFxuICAgICAgICB3ZWlnaHRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ2RlbnNlL2tlcm5lbCcsXG4gICAgICAgICAgICBzaGFwZTogWzMsIDFdLFxuICAgICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdkZW5zZS9iaWFzJyxcbiAgICAgICAgICAgIHNoYXBlOiBbMl0sXG4gICAgICAgICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfV07XG4gICAgICBjb25zdCBmbG9hdERhdGEgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAzLCAzLCA3LCA0XSk7XG4gICAgICBzZXR1cEZha2VXZWlnaHRGaWxlcyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAnLi9tb2RlbC5qc29uJzoge1xuICAgICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgbW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsXG4gICAgICAgICAgICAgICAgd2VpZ2h0c01hbmlmZXN0OiB3ZWlnaHRNYW5pZmVzdDFcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnLi93ZWlnaHRmaWxlMCc6XG4gICAgICAgICAgICAgICAge2RhdGE6IGZsb2F0RGF0YSwgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RJbml0cyk7XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5odHRwKFxuICAgICAgICAgICcuL21vZGVsLmpzb24nLFxuICAgICAgICAgIHtyZXF1ZXN0SW5pdDoge2hlYWRlcnM6IHsnaGVhZGVyX2tleV8xJzogJ2hlYWRlcl92YWx1ZV8xJ319fSk7XG4gICAgICBjb25zdCBtb2RlbEFydGlmYWN0cyA9IGF3YWl0IGhhbmRsZXIubG9hZCgpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kpLnRvRXF1YWwobW9kZWxUb3BvbG9neTEpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLndlaWdodFNwZWNzKS50b0VxdWFsKHdlaWdodE1hbmlmZXN0MVswXS53ZWlnaHRzKTtcbiAgICAgIGV4cGVjdChuZXcgRmxvYXQzMkFycmF5KENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4obW9kZWxBcnRpZmFjdHNcbiAgICAgICAgICAud2VpZ2h0RGF0YSkpKS50b0VxdWFsKGZsb2F0RGF0YSk7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXMocmVxdWVzdEluaXRzKS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXMocmVxdWVzdEluaXRzKS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gICAgICBleHBlY3QocmVxdWVzdEluaXRzWycuL21vZGVsLmpzb24nXS5oZWFkZXJzWydoZWFkZXJfa2V5XzEnXSlcbiAgICAgICAgICAudG9FcXVhbCgnaGVhZGVyX3ZhbHVlXzEnKTtcbiAgICAgIGV4cGVjdChyZXF1ZXN0SW5pdHNbJy4vd2VpZ2h0ZmlsZTAnXS5oZWFkZXJzWydoZWFkZXJfa2V5XzEnXSlcbiAgICAgICAgICAudG9FcXVhbCgnaGVhZGVyX3ZhbHVlXzEnKTtcblxuICAgICAgZXhwZWN0KGZldGNoU3B5LmNhbGxzLm1vc3RSZWNlbnQoKS5vYmplY3QpLnRvRXF1YWwod2luZG93KTtcbiAgICB9KTtcblxuICAgIGl0KCcxIGdyb3VwLCAyIHdlaWdodCwgMiBwYXRocycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHdlaWdodE1hbmlmZXN0MTogdGYuaW8uV2VpZ2h0c01hbmlmZXN0Q29uZmlnID0gW3tcbiAgICAgICAgcGF0aHM6IFsnd2VpZ2h0ZmlsZTAnLCAnd2VpZ2h0ZmlsZTEnXSxcbiAgICAgICAgd2VpZ2h0czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdkZW5zZS9rZXJuZWwnLFxuICAgICAgICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgICAgICAgIGR0eXBlOiAnZmxvYXQzMicsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiAnZGVuc2UvYmlhcycsXG4gICAgICAgICAgICBzaGFwZTogWzJdLFxuICAgICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1dO1xuICAgICAgY29uc3QgZmxvYXREYXRhMSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDMsIDNdKTtcbiAgICAgIGNvbnN0IGZsb2F0RGF0YTIgPSBuZXcgRmxvYXQzMkFycmF5KFs3LCA0XSk7XG4gICAgICBzZXR1cEZha2VXZWlnaHRGaWxlcyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAnLi9tb2RlbC5qc29uJzoge1xuICAgICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgbW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsXG4gICAgICAgICAgICAgICAgd2VpZ2h0c01hbmlmZXN0OiB3ZWlnaHRNYW5pZmVzdDFcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnLi93ZWlnaHRmaWxlMCc6XG4gICAgICAgICAgICAgICAge2RhdGE6IGZsb2F0RGF0YTEsIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ30sXG4gICAgICAgICAgICAnLi93ZWlnaHRmaWxlMSc6XG4gICAgICAgICAgICAgICAge2RhdGE6IGZsb2F0RGF0YTIsIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ31cbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RJbml0cyk7XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5odHRwKCcuL21vZGVsLmpzb24nKTtcbiAgICAgIGNvbnN0IG1vZGVsQXJ0aWZhY3RzID0gYXdhaXQgaGFuZGxlci5sb2FkKCk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMud2VpZ2h0U3BlY3MpLnRvRXF1YWwod2VpZ2h0TWFuaWZlc3QxWzBdLndlaWdodHMpO1xuICAgICAgZXhwZWN0KG5ldyBGbG9hdDMyQXJyYXkoQ29tcG9zaXRlQXJyYXlCdWZmZXIuam9pbihtb2RlbEFydGlmYWN0c1xuICAgICAgICAud2VpZ2h0RGF0YSkpKS50b0VxdWFsKG5ldyBGbG9hdDMyQXJyYXkoWzEsIDMsIDMsIDcsIDRdKSk7XG4gICAgfSk7XG5cbiAgICBpdCgnMiBncm91cHMsIDIgd2VpZ2h0LCAyIHBhdGhzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgd2VpZ2h0c01hbmlmZXN0OiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RDb25maWcgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMCddLFxuICAgICAgICAgIHdlaWdodHM6IFt7XG4gICAgICAgICAgICBuYW1lOiAnZGVuc2Uva2VybmVsJyxcbiAgICAgICAgICAgIHNoYXBlOiBbMywgMV0sXG4gICAgICAgICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMSddLFxuICAgICAgICAgIHdlaWdodHM6IFt7XG4gICAgICAgICAgICBuYW1lOiAnZGVuc2UvYmlhcycsXG4gICAgICAgICAgICBzaGFwZTogWzJdLFxuICAgICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgICB9XSxcbiAgICAgICAgfVxuICAgICAgXTtcbiAgICAgIGNvbnN0IGZsb2F0RGF0YTEgPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAzLCAzXSk7XG4gICAgICBjb25zdCBmbG9hdERhdGEyID0gbmV3IEZsb2F0MzJBcnJheShbNywgNF0pO1xuICAgICAgc2V0dXBGYWtlV2VpZ2h0RmlsZXMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgJy4vbW9kZWwuanNvbic6IHtcbiAgICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgICB7bW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsIHdlaWdodHNNYW5pZmVzdH0pLFxuICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJy4vd2VpZ2h0ZmlsZTAnOlxuICAgICAgICAgICAgICAgIHtkYXRhOiBmbG9hdERhdGExLCBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSd9LFxuICAgICAgICAgICAgJy4vd2VpZ2h0ZmlsZTEnOlxuICAgICAgICAgICAgICAgIHtkYXRhOiBmbG9hdERhdGEyLCBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSd9XG4gICAgICAgICAgfSxcbiAgICAgICAgICByZXF1ZXN0SW5pdHMpO1xuXG4gICAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uaHR0cCgnLi9tb2RlbC5qc29uJyk7XG4gICAgICBjb25zdCBtb2RlbEFydGlmYWN0cyA9IGF3YWl0IGhhbmRsZXIubG9hZCgpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kpLnRvRXF1YWwobW9kZWxUb3BvbG9neTEpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLndlaWdodFNwZWNzKVxuICAgICAgICAgIC50b0VxdWFsKFxuICAgICAgICAgICAgICB3ZWlnaHRzTWFuaWZlc3RbMF0ud2VpZ2h0cy5jb25jYXQod2VpZ2h0c01hbmlmZXN0WzFdLndlaWdodHMpKTtcbiAgICAgIGV4cGVjdChuZXcgRmxvYXQzMkFycmF5KENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4oXG4gICAgICAgICAgbW9kZWxBcnRpZmFjdHMud2VpZ2h0RGF0YSkpKVxuICAgICAgICAgICAgICAudG9FcXVhbChuZXcgRmxvYXQzMkFycmF5KFsxLCAzLCAzLCA3LCA0XSkpO1xuICAgIH0pO1xuXG4gICAgaXQoJzIgZ3JvdXBzLCAyIHdlaWdodCwgMiBwYXRocywgSW50MzIgYW5kIFVpbnQ4IERhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB3ZWlnaHRzTWFuaWZlc3Q6IHRmLmlvLldlaWdodHNNYW5pZmVzdENvbmZpZyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIHBhdGhzOiBbJ3dlaWdodGZpbGUwJ10sXG4gICAgICAgICAgd2VpZ2h0czogW3tcbiAgICAgICAgICAgIG5hbWU6ICdmb29XZWlnaHQnLFxuICAgICAgICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgICAgICAgIGR0eXBlOiAnaW50MzInLFxuICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMSddLFxuICAgICAgICAgIHdlaWdodHM6IFt7XG4gICAgICAgICAgICBuYW1lOiAnYmFyV2VpZ2h0JyxcbiAgICAgICAgICAgIHNoYXBlOiBbMl0sXG4gICAgICAgICAgICBkdHlwZTogJ2Jvb2wnLFxuICAgICAgICAgIH1dLFxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgY29uc3QgZmxvYXREYXRhMSA9IG5ldyBJbnQzMkFycmF5KFsxLCAzLCAzXSk7XG4gICAgICBjb25zdCBmbG9hdERhdGEyID0gbmV3IFVpbnQ4QXJyYXkoWzcsIDRdKTtcbiAgICAgIHNldHVwRmFrZVdlaWdodEZpbGVzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICdwYXRoMS9tb2RlbC5qc29uJzoge1xuICAgICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICAgIHttb2RlbFRvcG9sb2d5OiBtb2RlbFRvcG9sb2d5MSwgd2VpZ2h0c01hbmlmZXN0fSksXG4gICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAncGF0aDEvd2VpZ2h0ZmlsZTAnOlxuICAgICAgICAgICAgICAgIHtkYXRhOiBmbG9hdERhdGExLCBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSd9LFxuICAgICAgICAgICAgJ3BhdGgxL3dlaWdodGZpbGUxJzpcbiAgICAgICAgICAgICAgICB7ZGF0YTogZmxvYXREYXRhMiwgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVxdWVzdEluaXRzKTtcblxuICAgICAgY29uc3QgaGFuZGxlciA9IHRmLmlvLmh0dHAoJ3BhdGgxL21vZGVsLmpzb24nKTtcbiAgICAgIGNvbnN0IG1vZGVsQXJ0aWZhY3RzID0gYXdhaXQgaGFuZGxlci5sb2FkKCk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMud2VpZ2h0U3BlY3MpXG4gICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgIHdlaWdodHNNYW5pZmVzdFswXS53ZWlnaHRzLmNvbmNhdCh3ZWlnaHRzTWFuaWZlc3RbMV0ud2VpZ2h0cykpO1xuICAgICAgZXhwZWN0KG5ldyBJbnQzMkFycmF5KENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4obW9kZWxBcnRpZmFjdHMud2VpZ2h0RGF0YSlcbiAgICAgICAgLnNsaWNlKDAsIDEyKSkpLnRvRXF1YWwobmV3IEludDMyQXJyYXkoWzEsIDMsIDNdKSk7XG4gICAgICBleHBlY3QobmV3IFVpbnQ4QXJyYXkoQ29tcG9zaXRlQXJyYXlCdWZmZXIuam9pbihtb2RlbEFydGlmYWN0cy53ZWlnaHREYXRhKVxuICAgICAgICAuc2xpY2UoMTIsIDE0KSkpLnRvRXF1YWwobmV3IFVpbnQ4QXJyYXkoWzcsIDRdKSk7XG4gICAgfSk7XG5cbiAgICBpdCgndG9wb2xvZ3kgb25seScsIGFzeW5jICgpID0+IHtcbiAgICAgIHNldHVwRmFrZVdlaWdodEZpbGVzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICcuL21vZGVsLmpzb24nOiB7XG4gICAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHttb2RlbFRvcG9sb2d5OiBtb2RlbFRvcG9sb2d5MX0pLFxuICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVxdWVzdEluaXRzKTtcblxuICAgICAgY29uc3QgaGFuZGxlciA9IHRmLmlvLmh0dHAoJy4vbW9kZWwuanNvbicpO1xuICAgICAgY29uc3QgbW9kZWxBcnRpZmFjdHMgPSBhd2FpdCBoYW5kbGVyLmxvYWQoKTtcbiAgICAgIGV4cGVjdChtb2RlbEFydGlmYWN0cy5tb2RlbFRvcG9sb2d5KS50b0VxdWFsKG1vZGVsVG9wb2xvZ3kxKTtcbiAgICAgIGV4cGVjdChtb2RlbEFydGlmYWN0cy53ZWlnaHRTcGVjcykudG9CZVVuZGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLndlaWdodERhdGEpLnRvQmVVbmRlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCd3ZWlnaHRzIG9ubHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB3ZWlnaHRzTWFuaWZlc3Q6IHRmLmlvLldlaWdodHNNYW5pZmVzdENvbmZpZyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIHBhdGhzOiBbJ3dlaWdodGZpbGUwJ10sXG4gICAgICAgICAgd2VpZ2h0czogW3tcbiAgICAgICAgICAgIG5hbWU6ICdmb29XZWlnaHQnLFxuICAgICAgICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgICAgICAgIGR0eXBlOiAnaW50MzInLFxuICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMSddLFxuICAgICAgICAgIHdlaWdodHM6IFt7XG4gICAgICAgICAgICBuYW1lOiAnYmFyV2VpZ2h0JyxcbiAgICAgICAgICAgIHNoYXBlOiBbMl0sXG4gICAgICAgICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgICAgICAgIH1dLFxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgY29uc3QgZmxvYXREYXRhMSA9IG5ldyBJbnQzMkFycmF5KFsxLCAzLCAzXSk7XG4gICAgICBjb25zdCBmbG9hdERhdGEyID0gbmV3IEZsb2F0MzJBcnJheShbLTcsIC00XSk7XG4gICAgICBzZXR1cEZha2VXZWlnaHRGaWxlcyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAncGF0aDEvbW9kZWwuanNvbic6IHtcbiAgICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe3dlaWdodHNNYW5pZmVzdH0pLFxuICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3BhdGgxL3dlaWdodGZpbGUwJzpcbiAgICAgICAgICAgICAgICB7ZGF0YTogZmxvYXREYXRhMSwgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfSxcbiAgICAgICAgICAgICdwYXRoMS93ZWlnaHRmaWxlMSc6XG4gICAgICAgICAgICAgICAge2RhdGE6IGZsb2F0RGF0YTIsIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ31cbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RJbml0cyk7XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5odHRwKCdwYXRoMS9tb2RlbC5qc29uJyk7XG4gICAgICBjb25zdCBtb2RlbEFydGlmYWN0cyA9IGF3YWl0IGhhbmRsZXIubG9hZCgpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kpLnRvQmVVbmRlZmluZWQoKTtcbiAgICAgIGV4cGVjdChtb2RlbEFydGlmYWN0cy53ZWlnaHRTcGVjcylcbiAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgd2VpZ2h0c01hbmlmZXN0WzBdLndlaWdodHMuY29uY2F0KHdlaWdodHNNYW5pZmVzdFsxXS53ZWlnaHRzKSk7XG4gICAgICBleHBlY3QobmV3IEludDMyQXJyYXkoQ29tcG9zaXRlQXJyYXlCdWZmZXIuam9pbihtb2RlbEFydGlmYWN0cy53ZWlnaHREYXRhKVxuICAgICAgICAgIC5zbGljZSgwLCAxMikpKS50b0VxdWFsKG5ldyBJbnQzMkFycmF5KFsxLCAzLCAzXSkpO1xuICAgICAgZXhwZWN0KG5ldyBGbG9hdDMyQXJyYXkoQ29tcG9zaXRlQXJyYXlCdWZmZXJcbiAgICAgICAgICAuam9pbihtb2RlbEFydGlmYWN0cy53ZWlnaHREYXRhKVxuICAgICAgICAgIC5zbGljZSgxMiwgMjApKSkudG9FcXVhbChuZXcgRmxvYXQzMkFycmF5KFstNywgLTRdKSk7XG4gICAgfSk7XG5cbiAgICBpdCgnTWlzc2luZyBtb2RlbFRvcG9sb2d5IGFuZCB3ZWlnaHRzTWFuaWZlc3QgbGVhZHMgdG8gZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgICBzZXR1cEZha2VXZWlnaHRGaWxlcyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAncGF0aDEvbW9kZWwuanNvbic6XG4gICAgICAgICAgICAgICAge2RhdGE6IEpTT04uc3RyaW5naWZ5KHt9KSwgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ31cbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RJbml0cyk7XG4gICAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uaHR0cCgncGF0aDEvbW9kZWwuanNvbicpO1xuICAgICAgaGFuZGxlci5sb2FkKClcbiAgICAgICAgICAudGhlbihtb2RlbFRvcG9sb2d5MSA9PiB7XG4gICAgICAgICAgICBmYWlsKFxuICAgICAgICAgICAgICAgICdMb2FkaW5nIGZyb20gbWlzc2luZyBtb2RlbFRvcG9sb2d5IGFuZCB3ZWlnaHRzTWFuaWZlc3QgJyArXG4gICAgICAgICAgICAgICAgJ3N1Y2NlZWRlZCB1bmV4cGVjdGVkbHkuJyk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAudG9NYXRjaCgvY29udGFpbnMgbmVpdGhlciBtb2RlbCB0b3BvbG9neSBvciBtYW5pZmVzdC8pO1xuICAgICAgICAgIH0pO1xuICAgICAgZXhwZWN0KCkubm90aGluZygpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3dpdGggZmV0Y2ggcmVqZWN0aW9uIGxlYWRzIHRvIGVycm9yJywgYXN5bmMgKCkgPT4ge1xuICAgICAgc2V0dXBGYWtlV2VpZ2h0RmlsZXMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgJ3BhdGgxL21vZGVsLmpzb24nOlxuICAgICAgICAgICAgICAgIHtkYXRhOiBKU09OLnN0cmluZ2lmeSh7fSksIGNvbnRlbnRUeXBlOiAndGV4dC9odG1sJ31cbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RJbml0cyk7XG4gICAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uaHR0cCgncGF0aDIvbW9kZWwuanNvbicpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGhhbmRsZXIubG9hZCgpO1xuICAgICAgICBleHBlY3QoZGF0YSkudG9CZURlZmluZWQoKTtcbiAgICAgICAgZmFpbCgnTG9hZGluZyB3aXRoIGZldGNoIHJlamVjdGlvbiBzdWNjZWVkZWQgdW5leHBlY3RlZGx5LicpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIFRoaXMgZXJyb3IgaXMgbW9ja2VkIGluIGJlZm9yZUVhY2hcbiAgICAgICAgZXhwZWN0KGVycikudG9FcXVhbCgncGF0aCBub3QgZm91bmQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpdCgnUHJvdmlkZSBXZWlnaHRGaWxlVHJhbnNsYXRlRnVuYycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHdlaWdodE1hbmlmZXN0MTogdGYuaW8uV2VpZ2h0c01hbmlmZXN0Q29uZmlnID0gW3tcbiAgICAgICAgcGF0aHM6IFsnd2VpZ2h0ZmlsZTAnXSxcbiAgICAgICAgd2VpZ2h0czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdkZW5zZS9rZXJuZWwnLFxuICAgICAgICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgICAgICAgIGR0eXBlOiAnZmxvYXQzMicsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiAnZGVuc2UvYmlhcycsXG4gICAgICAgICAgICBzaGFwZTogWzJdLFxuICAgICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1dO1xuICAgICAgY29uc3QgZmxvYXREYXRhID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMywgMywgNywgNF0pO1xuICAgICAgc2V0dXBGYWtlV2VpZ2h0RmlsZXMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgJy4vbW9kZWwuanNvbic6IHtcbiAgICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIG1vZGVsVG9wb2xvZ3k6IG1vZGVsVG9wb2xvZ3kxLFxuICAgICAgICAgICAgICAgIHdlaWdodHNNYW5pZmVzdDogd2VpZ2h0TWFuaWZlc3QxXG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2F1dGhfd2VpZ2h0ZmlsZTAnOlxuICAgICAgICAgICAgICAgIHtkYXRhOiBmbG9hdERhdGEsIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ30sXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZXF1ZXN0SW5pdHMpO1xuICAgICAgYXN5bmMgZnVuY3Rpb24gcHJlZml4V2VpZ2h0VXJsQ29udmVydGVyKHdlaWdodEZpbGU6IHN0cmluZyk6XG4gICAgICAgICAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgLy8gQWRkICdhdXRoXycgcHJlZml4IHRvIHRoZSB3ZWlnaHQgZmlsZSB1cmwuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShcbiAgICAgICAgICAgIHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxLCAnYXV0aF8nICsgd2VpZ2h0RmlsZSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uaHR0cCgnLi9tb2RlbC5qc29uJywge1xuICAgICAgICByZXF1ZXN0SW5pdDoge2hlYWRlcnM6IHsnaGVhZGVyX2tleV8xJzogJ2hlYWRlcl92YWx1ZV8xJ319LFxuICAgICAgICB3ZWlnaHRVcmxDb252ZXJ0ZXI6IHByZWZpeFdlaWdodFVybENvbnZlcnRlclxuICAgICAgfSk7XG4gICAgICBjb25zdCBtb2RlbEFydGlmYWN0cyA9IGF3YWl0IGhhbmRsZXIubG9hZCgpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kpLnRvRXF1YWwobW9kZWxUb3BvbG9neTEpO1xuICAgICAgZXhwZWN0KG1vZGVsQXJ0aWZhY3RzLndlaWdodFNwZWNzKS50b0VxdWFsKHdlaWdodE1hbmlmZXN0MVswXS53ZWlnaHRzKTtcbiAgICAgIGV4cGVjdChuZXcgRmxvYXQzMkFycmF5KENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4oXG4gICAgICAgICAgbW9kZWxBcnRpZmFjdHMud2VpZ2h0RGF0YSkpKS50b0VxdWFsKGZsb2F0RGF0YSk7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXMocmVxdWVzdEluaXRzKS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXMocmVxdWVzdEluaXRzKS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gICAgICBleHBlY3QocmVxdWVzdEluaXRzWycuL21vZGVsLmpzb24nXS5oZWFkZXJzWydoZWFkZXJfa2V5XzEnXSlcbiAgICAgICAgICAudG9FcXVhbCgnaGVhZGVyX3ZhbHVlXzEnKTtcbiAgICAgIGV4cGVjdChyZXF1ZXN0SW5pdHNbJ2F1dGhfd2VpZ2h0ZmlsZTAnXS5oZWFkZXJzWydoZWFkZXJfa2V5XzEnXSlcbiAgICAgICAgICAudG9FcXVhbCgnaGVhZGVyX3ZhbHVlXzEnKTtcblxuICAgICAgZXhwZWN0KGZldGNoU3B5LmNhbGxzLm1vc3RSZWNlbnQoKS5vYmplY3QpLnRvRXF1YWwod2luZG93KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ092ZXJyaWRpbmcgQnJvd3NlckhUVFBSZXF1ZXN0IGZldGNoRnVuYycsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB3ZWlnaHRNYW5pZmVzdDE6IHRmLmlvLldlaWdodHNNYW5pZmVzdENvbmZpZyA9IFt7XG4gICAgICBwYXRoczogWyd3ZWlnaHRmaWxlMCddLFxuICAgICAgd2VpZ2h0czogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ2RlbnNlL2tlcm5lbCcsXG4gICAgICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ2RlbnNlL2JpYXMnLFxuICAgICAgICAgIHNoYXBlOiBbMl0sXG4gICAgICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1dO1xuICAgIGNvbnN0IGZsb2F0RGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDMsIDMsIDcsIDRdKTtcblxuICAgIGNvbnN0IGZldGNoSW5wdXRzOiBSZXF1ZXN0SW5mb1tdID0gW107XG4gICAgY29uc3QgZmV0Y2hJbml0czogUmVxdWVzdEluaXRbXSA9IFtdO1xuICAgIGFzeW5jIGZ1bmN0aW9uIGN1c3RvbUZldGNoKFxuICAgICAgICBpbnB1dDogUmVxdWVzdEluZm8sIGluaXQ/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgICAgIGZldGNoSW5wdXRzLnB1c2goaW5wdXQpO1xuICAgICAgZmV0Y2hJbml0cy5wdXNoKGluaXQpO1xuXG4gICAgICBpZiAoaW5wdXQgPT09ICcuL21vZGVsLmpzb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIG1vZGVsVG9wb2xvZ3k6IG1vZGVsVG9wb2xvZ3kxLFxuICAgICAgICAgICAgICB3ZWlnaHRzTWFuaWZlc3Q6IHdlaWdodE1hbmlmZXN0MSxcbiAgICAgICAgICAgICAgdHJhaW5pbmdDb25maWc6IHRyYWluaW5nQ29uZmlnMVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB7c3RhdHVzOiAyMDAsIGhlYWRlcnM6IHsnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nfX0pO1xuICAgICAgfSBlbHNlIGlmIChpbnB1dCA9PT0gJy4vd2VpZ2h0ZmlsZTAnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoZmxvYXREYXRhLCB7XG4gICAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgICAgaGVhZGVyczogeydjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ31cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDQwNH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5odHRwKFxuICAgICAgICAnLi9tb2RlbC5qc29uJyxcbiAgICAgICAge3JlcXVlc3RJbml0OiB7Y3JlZGVudGlhbHM6ICdpbmNsdWRlJ30sIGZldGNoRnVuYzogY3VzdG9tRmV0Y2h9KTtcbiAgICBjb25zdCBtb2RlbEFydGlmYWN0cyA9IGF3YWl0IGhhbmRsZXIubG9hZCgpO1xuICAgIGV4cGVjdChtb2RlbEFydGlmYWN0cy5tb2RlbFRvcG9sb2d5KS50b0VxdWFsKG1vZGVsVG9wb2xvZ3kxKTtcbiAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMudHJhaW5pbmdDb25maWcpLnRvRXF1YWwodHJhaW5pbmdDb25maWcxKTtcbiAgICBleHBlY3QobW9kZWxBcnRpZmFjdHMud2VpZ2h0U3BlY3MpLnRvRXF1YWwod2VpZ2h0TWFuaWZlc3QxWzBdLndlaWdodHMpO1xuICAgIGV4cGVjdChuZXcgRmxvYXQzMkFycmF5KENvbXBvc2l0ZUFycmF5QnVmZmVyXG4gICAgICAgIC5qb2luKG1vZGVsQXJ0aWZhY3RzLndlaWdodERhdGEpKSkudG9FcXVhbChmbG9hdERhdGEpO1xuXG4gICAgZXhwZWN0KGZldGNoSW5wdXRzKS50b0VxdWFsKFsnLi9tb2RlbC5qc29uJywgJy4vd2VpZ2h0ZmlsZTAnXSk7XG4gICAgZXhwZWN0KGZldGNoSW5pdHMubGVuZ3RoKS50b0VxdWFsKDIpO1xuICAgIGV4cGVjdChmZXRjaEluaXRzWzBdLmNyZWRlbnRpYWxzKS50b0VxdWFsKCdpbmNsdWRlJyk7XG4gICAgZXhwZWN0KGZldGNoSW5pdHNbMV0uY3JlZGVudGlhbHMpLnRvRXF1YWwoJ2luY2x1ZGUnKTtcbiAgfSk7XG59KTtcbiJdfQ==