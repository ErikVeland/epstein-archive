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
import { CHROME_ENVS, describeWithFlags, runWithLock } from '../jasmine_util';
import { deleteDatabase } from './indexed_db';
import { CompositeArrayBuffer } from './composite_array_buffer';
import { purgeLocalStorageArtifacts } from './local_storage';
// Disabled for non-Chrome browsers due to:
// https://github.com/tensorflow/tfjs/issues/427
describeWithFlags('ModelManagement', CHROME_ENVS, () => {
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
    };
    beforeEach(done => {
        purgeLocalStorageArtifacts();
        deleteDatabase().then(() => {
            done();
        });
    });
    afterEach(done => {
        purgeLocalStorageArtifacts();
        deleteDatabase().then(() => {
            done();
        });
    });
    // TODO(cais): Reenable this test once we fix
    // https://github.com/tensorflow/tfjs/issues/1198
    // tslint:disable-next-line:ban
    xit('List models: 0 result', done => {
        // Before any model is saved, listModels should return empty result.
        tf.io.listModels()
            .then(out => {
            expect(out).toEqual({});
            done();
        })
            .catch(err => done.fail(err.stack));
    });
    // TODO(cais): Reenable this test once we fix
    // https://github.com/tensorflow/tfjs/issues/1198
    // tslint:disable-next-line:ban
    xit('List models: 1 result', done => {
        const url = 'localstorage://baz/QuxModel';
        const handler = tf.io.getSaveHandlers(url)[0];
        handler.save(artifacts1)
            .then(saveResult => {
            // After successful saving, there should be one model.
            tf.io.listModels()
                .then(out => {
                expect(Object.keys(out).length).toEqual(1);
                expect(out[url].modelTopologyType)
                    .toEqual(saveResult.modelArtifactsInfo.modelTopologyType);
                expect(out[url].modelTopologyBytes)
                    .toEqual(saveResult.modelArtifactsInfo.modelTopologyBytes);
                expect(out[url].weightSpecsBytes)
                    .toEqual(saveResult.modelArtifactsInfo.weightSpecsBytes);
                expect(out[url].weightDataBytes)
                    .toEqual(saveResult.modelArtifactsInfo.weightDataBytes);
                done();
            })
                .catch(err => done.fail(err.stack));
        })
            .catch(err => done.fail(err.stack));
    });
    // TODO(cais): Reenable this test once we fix
    // https://github.com/tensorflow/tfjs/issues/1198
    // tslint:disable-next-line:ban
    xit('Manager: List models: 2 results in 2 mediums', done => {
        const url1 = 'localstorage://QuxModel';
        const url2 = 'indexeddb://QuxModel';
        // First, save a model in Local Storage.
        const handler1 = tf.io.getSaveHandlers(url1)[0];
        handler1.save(artifacts1)
            .then(saveResult1 => {
            // Then, save the model in IndexedDB.
            const handler2 = tf.io.getSaveHandlers(url2)[0];
            handler2.save(artifacts1)
                .then(saveResult2 => {
                // After successful saving, there should be two models.
                tf.io.listModels()
                    .then(out => {
                    expect(Object.keys(out).length).toEqual(2);
                    expect(out[url1].modelTopologyType)
                        .toEqual(saveResult1.modelArtifactsInfo.modelTopologyType);
                    expect(out[url1].modelTopologyBytes)
                        .toEqual(saveResult1.modelArtifactsInfo
                        .modelTopologyBytes);
                    expect(out[url1].weightSpecsBytes)
                        .toEqual(saveResult1.modelArtifactsInfo.weightSpecsBytes);
                    expect(out[url1].weightDataBytes)
                        .toEqual(saveResult1.modelArtifactsInfo.weightDataBytes);
                    expect(out[url2].modelTopologyType)
                        .toEqual(saveResult2.modelArtifactsInfo.modelTopologyType);
                    expect(out[url2].modelTopologyBytes)
                        .toEqual(saveResult2.modelArtifactsInfo
                        .modelTopologyBytes);
                    expect(out[url2].weightSpecsBytes)
                        .toEqual(saveResult2.modelArtifactsInfo.weightSpecsBytes);
                    expect(out[url2].weightDataBytes)
                        .toEqual(saveResult2.modelArtifactsInfo.weightDataBytes);
                    done();
                })
                    .catch(err => done.fail(err.stack));
            })
                .catch(err => done.fail(err.stack));
        })
            .catch(err => done.fail(err.stack));
    });
    // TODO(cais): Reenable this test once we fix
    // https://github.com/tensorflow/tfjs/issues/1198
    // tslint:disable-next-line:ban
    xit('Successful removeModel', done => {
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers('localstorage://QuxModel')[0];
        handler1.save(artifacts1)
            .then(saveResult1 => {
            // Then, save the model under another path.
            const handler2 = tf.io.getSaveHandlers('indexeddb://repeat/QuxModel')[0];
            handler2.save(artifacts1)
                .then(saveResult2 => {
                // After successful saving, delete the first save, and then
                // `listModel` should give only one result.
                // Delete a model specified with a path that includes the
                // indexeddb:// scheme prefix should work.
                tf.io.removeModel('indexeddb://repeat/QuxModel')
                    .then(deletedInfo => {
                    tf.io.listModels()
                        .then(out => {
                        expect(Object.keys(out)).toEqual([
                            'localstorage://QuxModel'
                        ]);
                        tf.io.removeModel('localstorage://QuxModel')
                            .then(out => {
                            // The delete the remaining model.
                            tf.io.listModels()
                                .then(out => {
                                expect(Object.keys(out)).toEqual([]);
                                done();
                            })
                                .catch(err => done.fail(err));
                        })
                            .catch(err => done.fail(err));
                    })
                        .catch(err => done.fail(err));
                })
                    .catch(err => done.fail(err.stack));
            })
                .catch(err => done.fail(err.stack));
        })
            .catch(err => done.fail(err.stack));
    });
    // TODO(cais): Reenable this test once we fix
    // https://github.com/tensorflow/tfjs/issues/1198
    // tslint:disable-next-line:ban
    xit('Successful copyModel between mediums', done => {
        const url1 = 'localstorage://a1/FooModel';
        const url2 = 'indexeddb://a1/FooModel';
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers(url1)[0];
        handler1.save(artifacts1)
            .then(saveResult => {
            // Once model is saved, copy the model to another path.
            tf.io.copyModel(url1, url2)
                .then(modelInfo => {
                tf.io.listModels().then(out => {
                    expect(Object.keys(out).length).toEqual(2);
                    expect(out[url1].modelTopologyType)
                        .toEqual(saveResult.modelArtifactsInfo.modelTopologyType);
                    expect(out[url1].modelTopologyBytes)
                        .toEqual(saveResult.modelArtifactsInfo.modelTopologyBytes);
                    expect(out[url1].weightSpecsBytes)
                        .toEqual(saveResult.modelArtifactsInfo.weightSpecsBytes);
                    expect(out[url1].weightDataBytes)
                        .toEqual(saveResult.modelArtifactsInfo.weightDataBytes);
                    expect(out[url2].modelTopologyType)
                        .toEqual(saveResult.modelArtifactsInfo.modelTopologyType);
                    expect(out[url2].modelTopologyBytes)
                        .toEqual(saveResult.modelArtifactsInfo.modelTopologyBytes);
                    expect(out[url2].weightSpecsBytes)
                        .toEqual(saveResult.modelArtifactsInfo.weightSpecsBytes);
                    expect(out[url2].weightDataBytes)
                        .toEqual(saveResult.modelArtifactsInfo.weightDataBytes);
                    // Load the copy and verify the content.
                    const handler2 = tf.io.getLoadHandlers(url2)[0];
                    handler2.load()
                        .then(loaded => {
                        expect(loaded.modelTopology).toEqual(modelTopology1);
                        expect(loaded.weightSpecs).toEqual(weightSpecs1);
                        expect(loaded.weightData).toBeDefined();
                        expect(new Uint8Array(CompositeArrayBuffer.join(loaded.weightData)))
                            .toEqual(new Uint8Array(weightData1));
                        done();
                    })
                        .catch(err => done.fail(err.stack));
                });
            })
                .catch(err => done.fail(err.stack));
        })
            .catch(err => done.fail(err.stack));
    });
    // TODO(cais): Reenable this test once we fix
    // https://github.com/tensorflow/tfjs/issues/1198
    // tslint:disable-next-line:ban
    xit('Successful moveModel between mediums', done => {
        const url1 = 'localstorage://a1/FooModel';
        const url2 = 'indexeddb://a1/FooModel';
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers(url1)[0];
        handler1.save(artifacts1)
            .then(saveResult => {
            // Once model is saved, move the model to another path.
            tf.io.moveModel(url1, url2)
                .then(modelInfo => {
                tf.io.listModels().then(out => {
                    expect(Object.keys(out)).toEqual([url2]);
                    expect(out[url2].modelTopologyType)
                        .toEqual(saveResult.modelArtifactsInfo.modelTopologyType);
                    expect(out[url2].modelTopologyBytes)
                        .toEqual(saveResult.modelArtifactsInfo.modelTopologyBytes);
                    expect(out[url2].weightSpecsBytes)
                        .toEqual(saveResult.modelArtifactsInfo.weightSpecsBytes);
                    expect(out[url2].weightDataBytes)
                        .toEqual(saveResult.modelArtifactsInfo.weightDataBytes);
                    // Load the copy and verify the content.
                    const handler2 = tf.io.getLoadHandlers(url2)[0];
                    handler2.load()
                        .then(loaded => {
                        expect(loaded.modelTopology).toEqual(modelTopology1);
                        expect(loaded.weightSpecs).toEqual(weightSpecs1);
                        expect(new Uint8Array(CompositeArrayBuffer.join(loaded.weightData)))
                            .toEqual(new Uint8Array(weightData1));
                        done();
                    })
                        .catch(err => {
                        done.fail(err.stack);
                    });
                });
            })
                .catch(err => done.fail(err.stack));
        })
            .catch(err => done.fail(err.stack));
    });
    it('Failed copyModel to invalid source URL', runWithLock(done => {
        const url1 = 'invalidurl';
        const url2 = 'localstorage://a1/FooModel';
        tf.io.copyModel(url1, url2)
            .then(out => {
            done.fail('Copying from invalid URL succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toEqual('Copying failed because no load handler is found for ' +
                'source URL invalidurl.');
            done();
        });
    }));
    it('Failed copyModel to invalid destination URL', runWithLock(done => {
        const url1 = 'localstorage://a1/FooModel';
        const url2 = 'invalidurl';
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers(url1)[0];
        handler1.save(artifacts1)
            .then(saveResult => {
            // Once model is saved, copy the model to another path.
            tf.io.copyModel(url1, url2)
                .then(out => {
                done.fail('Copying to invalid URL succeeded unexpectedly.');
            })
                .catch(err => {
                expect(err.message)
                    .toEqual('Copying failed because no save handler is found ' +
                    'for destination URL invalidurl.');
                done();
            });
        })
            .catch(err => done.fail(err.stack));
    }));
    it('Failed moveModel to invalid destination URL', runWithLock(done => {
        const url1 = 'localstorage://a1/FooModel';
        const url2 = 'invalidurl';
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers(url1)[0];
        handler1.save(artifacts1)
            .then(saveResult => {
            // Once model is saved, copy the model to an invalid path, which
            // should fail.
            tf.io.moveModel(url1, url2)
                .then(out => {
                done.fail('Copying to invalid URL succeeded unexpectedly.');
            })
                .catch(err => {
                expect(err.message)
                    .toEqual('Copying failed because no save handler is found ' +
                    'for destination URL invalidurl.');
                // Verify that the source has not been removed.
                tf.io.listModels()
                    .then(out => {
                    expect(Object.keys(out)).toEqual([url1]);
                    done();
                })
                    .catch(err => done.fail(err.stack));
            });
        })
            .catch(err => done.fail(err.stack));
    }));
    it('Failed deletedModel: Absent scheme', runWithLock(done => {
        // Attempt to delete a nonexistent model is expected to fail.
        tf.io.removeModel('foo')
            .then(out => {
            done.fail('Removing model with missing scheme succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toMatch(/The url string provided does not contain a scheme/);
            expect(err.message.indexOf('localstorage')).toBeGreaterThan(0);
            expect(err.message.indexOf('indexeddb')).toBeGreaterThan(0);
            done();
        });
    }));
    it('Failed deletedModel: Invalid scheme', runWithLock(done => {
        // Attempt to delete a nonexistent model is expected to fail.
        tf.io.removeModel('invalidscheme://foo')
            .then(out => {
            done.fail('Removing nonexistent model succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toEqual('Cannot find model manager for scheme \'invalidscheme\'');
            done();
        });
    }));
    it('Failed deletedModel: Nonexistent model', runWithLock(done => {
        // Attempt to delete a nonexistent model is expected to fail.
        tf.io.removeModel('indexeddb://nonexistent')
            .then(out => {
            done.fail('Removing nonexistent model succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toEqual('Cannot find model ' +
                'with path \'nonexistent\' in IndexedDB.');
            done();
        });
    }));
    it('Failed copyModel', runWithLock(done => {
        // Attempt to copy a nonexistent model should fail.
        tf.io.copyModel('indexeddb://nonexistent', 'indexeddb://destination')
            .then(out => {
            done.fail('Copying nonexistent model succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toEqual('Cannot find model ' +
                'with path \'nonexistent\' in IndexedDB.');
            done();
        });
    }));
    it('copyModel: Identical oldPath and newPath leads to Error', runWithLock(done => {
        tf.io.copyModel('a/1', 'a/1')
            .then(out => {
            done.fail('Copying with identical ' +
                'old & new paths succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toEqual('Old path and new path are the same: \'a/1\'');
            done();
        });
    }));
    it('moveModel: Identical oldPath and newPath leads to Error', runWithLock(done => {
        tf.io.moveModel('a/1', 'a/1')
            .then(out => {
            done.fail('Copying with identical ' +
                'old & new paths succeeded unexpectedly.');
        })
            .catch(err => {
            expect(err.message)
                .toEqual('Old path and new path are the same: \'a/1\'');
            done();
        });
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxfbWFuYWdlbWVudF90ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9pby9tb2RlbF9tYW5hZ2VtZW50X3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDL0IsT0FBTyxFQUFDLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQzVDLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQzlELE9BQU8sRUFBQywwQkFBMEIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRTNELDJDQUEyQztBQUMzQyxnREFBZ0Q7QUFDaEQsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUNyRCxhQUFhO0lBQ2IsTUFBTSxjQUFjLEdBQU87UUFDekIsWUFBWSxFQUFFLFlBQVk7UUFDMUIsZUFBZSxFQUFFLE9BQU87UUFDeEIsUUFBUSxFQUFFLENBQUM7Z0JBQ1QsWUFBWSxFQUFFLE9BQU87Z0JBQ3JCLFFBQVEsRUFBRTtvQkFDUixvQkFBb0IsRUFBRTt3QkFDcEIsWUFBWSxFQUFFLGlCQUFpQjt3QkFDL0IsUUFBUSxFQUFFOzRCQUNSLGNBQWMsRUFBRSxTQUFTOzRCQUN6QixPQUFPLEVBQUUsR0FBRzs0QkFDWixNQUFNLEVBQUUsSUFBSTs0QkFDWixNQUFNLEVBQUUsU0FBUzt5QkFDbEI7cUJBQ0Y7b0JBQ0QsTUFBTSxFQUFFLE9BQU87b0JBQ2YsbUJBQW1CLEVBQUUsSUFBSTtvQkFDekIsa0JBQWtCLEVBQUUsSUFBSTtvQkFDeEIsaUJBQWlCLEVBQUUsSUFBSTtvQkFDdkIsT0FBTyxFQUFFLFNBQVM7b0JBQ2xC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QzthQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNYLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO2lCQUNkLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1lBQzVELElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQyxDQUFDLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCAqIGFzIHRmIGZyb20gJy4uL2luZGV4JztcbmltcG9ydCB7Q0hST01FX0VOVlMsIGRlc2NyaWJlV2l0aEZsYWdzLCBydW5XaXRoTG9ja30gZnJvbSAnLi4vamFzbWluZV91dGlsJztcbmltcG9ydCB7ZGVsZXRlRGF0YWJhc2V9IGZyb20gJy4vaW5kZXhlZF9kYic7XG5pbXBvcnQge0NvbXBvc2l0ZUFycmF5QnVmZmVyfSBmcm9tICcuL2NvbXBvc2l0ZV9hcnJheV9idWZmZXInO1xuaW1wb3J0IHtwdXJnZUxvY2FsU3RvcmFnZUFydGlmYWN0c30gZnJvbSAnLi9sb2NhbF9zdG9yYWdlJztcblxuLy8gRGlzYWJsZWQgZm9yIG5vbi1DaHJvbWUgYnJvd3NlcnMgZHVlIHRvOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3RlbnNvcmZsb3cvdGZqcy9pc3N1ZXMvNDI3XG5kZXNjcmliZVdpdGhGbGFncygnTW9kZWxNYW5hZ2VtZW50JywgQ0hST01FX0VOVlMsICgpID0+IHtcbiAgLy8gVGVzdCBkYXRhLlxuICBjb25zdCBtb2RlbFRvcG9sb2d5MToge30gPSB7XG4gICAgJ2NsYXNzX25hbWUnOiAnU2VxdWVudGlhbCcsXG4gICAgJ2tlcmFzX3ZlcnNpb24nOiAnMi4xLjQnLFxuICAgICdjb25maWcnOiBbe1xuICAgICAgJ2NsYXNzX25hbWUnOiAnRGVuc2UnLFxuICAgICAgJ2NvbmZpZyc6IHtcbiAgICAgICAgJ2tlcm5lbF9pbml0aWFsaXplcic6IHtcbiAgICAgICAgICAnY2xhc3NfbmFtZSc6ICdWYXJpYW5jZVNjYWxpbmcnLFxuICAgICAgICAgICdjb25maWcnOiB7XG4gICAgICAgICAgICAnZGlzdHJpYnV0aW9uJzogJ3VuaWZvcm0nLFxuICAgICAgICAgICAgJ3NjYWxlJzogMS4wLFxuICAgICAgICAgICAgJ3NlZWQnOiBudWxsLFxuICAgICAgICAgICAgJ21vZGUnOiAnZmFuX2F2ZydcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICduYW1lJzogJ2RlbnNlJyxcbiAgICAgICAgJ2tlcm5lbF9jb25zdHJhaW50JzogbnVsbCxcbiAgICAgICAgJ2JpYXNfcmVndWxhcml6ZXInOiBudWxsLFxuICAgICAgICAnYmlhc19jb25zdHJhaW50JzogbnVsbCxcbiAgICAgICAgJ2R0eXBlJzogJ2Zsb2F0MzInLFxuICAgICAgICAnYWN0aXZhdGlvbic6ICdsaW5lYXInLFxuICAgICAgICAndHJhaW5hYmxlJzogdHJ1ZSxcbiAgICAgICAgJ2tlcm5lbF9yZWd1bGFyaXplcic6IG51bGwsXG4gICAgICAgICdiaWFzX2luaXRpYWxpemVyJzogeydjbGFzc19uYW1lJzogJ1plcm9zJywgJ2NvbmZpZyc6IHt9fSxcbiAgICAgICAgJ3VuaXRzJzogMSxcbiAgICAgICAgJ2JhdGNoX2lucHV0X3NoYXBlJzogW251bGwsIDNdLFxuICAgICAgICAndXNlX2JpYXMnOiB0cnVlLFxuICAgICAgICAnYWN0aXZpdHlfcmVndWxhcml6ZXInOiBudWxsXG4gICAgICB9XG4gICAgfV0sXG4gICAgJ2JhY2tlbmQnOiAndGVuc29yZmxvdydcbiAgfTtcbiAgY29uc3Qgd2VpZ2h0U3BlY3MxOiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RFbnRyeVtdID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdkZW5zZS9rZXJuZWwnLFxuICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgIGR0eXBlOiAnZmxvYXQzMicsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnZGVuc2UvYmlhcycsXG4gICAgICBzaGFwZTogWzFdLFxuICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICB9XG4gIF07XG4gIGNvbnN0IHdlaWdodERhdGExID0gbmV3IEFycmF5QnVmZmVyKDE2KTtcbiAgY29uc3QgYXJ0aWZhY3RzMTogdGYuaW8uTW9kZWxBcnRpZmFjdHMgPSB7XG4gICAgbW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsXG4gICAgd2VpZ2h0U3BlY3M6IHdlaWdodFNwZWNzMSxcbiAgICB3ZWlnaHREYXRhOiB3ZWlnaHREYXRhMSxcbiAgfTtcblxuICBiZWZvcmVFYWNoKGRvbmUgPT4ge1xuICAgIHB1cmdlTG9jYWxTdG9yYWdlQXJ0aWZhY3RzKCk7XG4gICAgZGVsZXRlRGF0YWJhc2UoKS50aGVuKCgpID0+IHtcbiAgICAgIGRvbmUoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgYWZ0ZXJFYWNoKGRvbmUgPT4ge1xuICAgIHB1cmdlTG9jYWxTdG9yYWdlQXJ0aWZhY3RzKCk7XG4gICAgZGVsZXRlRGF0YWJhc2UoKS50aGVuKCgpID0+IHtcbiAgICAgIGRvbmUoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gVE9ETyhjYWlzKTogUmVlbmFibGUgdGhpcyB0ZXN0IG9uY2Ugd2UgZml4XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90ZW5zb3JmbG93L3RmanMvaXNzdWVzLzExOThcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmJhblxuICB4aXQoJ0xpc3QgbW9kZWxzOiAwIHJlc3VsdCcsIGRvbmUgPT4ge1xuICAgIC8vIEJlZm9yZSBhbnkgbW9kZWwgaXMgc2F2ZWQsIGxpc3RNb2RlbHMgc2hvdWxkIHJldHVybiBlbXB0eSByZXN1bHQuXG4gICAgdGYuaW8ubGlzdE1vZGVscygpXG4gICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgZXhwZWN0KG91dCkudG9FcXVhbCh7fSk7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIuc3RhY2spKTtcbiAgfSk7XG5cbiAgLy8gVE9ETyhjYWlzKTogUmVlbmFibGUgdGhpcyB0ZXN0IG9uY2Ugd2UgZml4XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90ZW5zb3JmbG93L3RmanMvaXNzdWVzLzExOThcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmJhblxuICB4aXQoJ0xpc3QgbW9kZWxzOiAxIHJlc3VsdCcsIGRvbmUgPT4ge1xuICAgIGNvbnN0IHVybCA9ICdsb2NhbHN0b3JhZ2U6Ly9iYXovUXV4TW9kZWwnO1xuICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnModXJsKVswXTtcbiAgICBoYW5kbGVyLnNhdmUoYXJ0aWZhY3RzMSlcbiAgICAgICAgLnRoZW4oc2F2ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgLy8gQWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZpbmcsIHRoZXJlIHNob3VsZCBiZSBvbmUgbW9kZWwuXG4gICAgICAgICAgdGYuaW8ubGlzdE1vZGVscygpXG4gICAgICAgICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KE9iamVjdC5rZXlzKG91dCkubGVuZ3RoKS50b0VxdWFsKDEpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsXS5tb2RlbFRvcG9sb2d5VHlwZSlcbiAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ubW9kZWxUb3BvbG9neVR5cGUpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsXS5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lCeXRlcyk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KG91dFt1cmxdLndlaWdodFNwZWNzQnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodFNwZWNzQnl0ZXMpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsXS53ZWlnaHREYXRhQnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodERhdGFCeXRlcyk7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIuc3RhY2spKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyLnN0YWNrKSk7XG4gIH0pO1xuXG4gIC8vIFRPRE8oY2Fpcyk6IFJlZW5hYmxlIHRoaXMgdGVzdCBvbmNlIHdlIGZpeFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy8xMTk4XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpiYW5cbiAgeGl0KCdNYW5hZ2VyOiBMaXN0IG1vZGVsczogMiByZXN1bHRzIGluIDIgbWVkaXVtcycsIGRvbmUgPT4ge1xuICAgIGNvbnN0IHVybDEgPSAnbG9jYWxzdG9yYWdlOi8vUXV4TW9kZWwnO1xuICAgIGNvbnN0IHVybDIgPSAnaW5kZXhlZGRiOi8vUXV4TW9kZWwnO1xuXG4gICAgLy8gRmlyc3QsIHNhdmUgYSBtb2RlbCBpbiBMb2NhbCBTdG9yYWdlLlxuICAgIGNvbnN0IGhhbmRsZXIxID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKHVybDEpWzBdO1xuICAgIGhhbmRsZXIxLnNhdmUoYXJ0aWZhY3RzMSlcbiAgICAgICAgLnRoZW4oc2F2ZVJlc3VsdDEgPT4ge1xuICAgICAgICAgIC8vIFRoZW4sIHNhdmUgdGhlIG1vZGVsIGluIEluZGV4ZWREQi5cbiAgICAgICAgICBjb25zdCBoYW5kbGVyMiA9IHRmLmlvLmdldFNhdmVIYW5kbGVycyh1cmwyKVswXTtcbiAgICAgICAgICBoYW5kbGVyMi5zYXZlKGFydGlmYWN0czEpXG4gICAgICAgICAgICAgIC50aGVuKHNhdmVSZXN1bHQyID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBZnRlciBzdWNjZXNzZnVsIHNhdmluZywgdGhlcmUgc2hvdWxkIGJlIHR3byBtb2RlbHMuXG4gICAgICAgICAgICAgICAgdGYuaW8ubGlzdE1vZGVscygpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KE9iamVjdC5rZXlzKG91dCkubGVuZ3RoKS50b0VxdWFsKDIpO1xuICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMV0ubW9kZWxUb3BvbG9neVR5cGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVJlc3VsdDEubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDFdLm1vZGVsVG9wb2xvZ3lCeXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdDEubW9kZWxBcnRpZmFjdHNJbmZvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kZWxUb3BvbG9neUJ5dGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDFdLndlaWdodFNwZWNzQnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVJlc3VsdDEubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodFNwZWNzQnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMV0ud2VpZ2h0RGF0YUJ5dGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVSZXN1bHQxLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMl0ubW9kZWxUb3BvbG9neVR5cGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVJlc3VsdDIubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDJdLm1vZGVsVG9wb2xvZ3lCeXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdDIubW9kZWxBcnRpZmFjdHNJbmZvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kZWxUb3BvbG9neUJ5dGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDJdLndlaWdodFNwZWNzQnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVJlc3VsdDIubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodFNwZWNzQnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMl0ud2VpZ2h0RGF0YUJ5dGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyLnN0YWNrKSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gZG9uZS5mYWlsKGVyci5zdGFjaykpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIuc3RhY2spKTtcbiAgfSk7XG5cbiAgLy8gVE9ETyhjYWlzKTogUmVlbmFibGUgdGhpcyB0ZXN0IG9uY2Ugd2UgZml4XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90ZW5zb3JmbG93L3RmanMvaXNzdWVzLzExOThcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmJhblxuICB4aXQoJ1N1Y2Nlc3NmdWwgcmVtb3ZlTW9kZWwnLCBkb25lID0+IHtcbiAgICAvLyBGaXJzdCwgc2F2ZSBhIG1vZGVsLlxuICAgIGNvbnN0IGhhbmRsZXIxID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKCdsb2NhbHN0b3JhZ2U6Ly9RdXhNb2RlbCcpWzBdO1xuICAgIGhhbmRsZXIxLnNhdmUoYXJ0aWZhY3RzMSlcbiAgICAgICAgLnRoZW4oc2F2ZVJlc3VsdDEgPT4ge1xuICAgICAgICAgIC8vIFRoZW4sIHNhdmUgdGhlIG1vZGVsIHVuZGVyIGFub3RoZXIgcGF0aC5cbiAgICAgICAgICBjb25zdCBoYW5kbGVyMiA9XG4gICAgICAgICAgICAgIHRmLmlvLmdldFNhdmVIYW5kbGVycygnaW5kZXhlZGRiOi8vcmVwZWF0L1F1eE1vZGVsJylbMF07XG4gICAgICAgICAgaGFuZGxlcjIuc2F2ZShhcnRpZmFjdHMxKVxuICAgICAgICAgICAgICAudGhlbihzYXZlUmVzdWx0MiA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZpbmcsIGRlbGV0ZSB0aGUgZmlyc3Qgc2F2ZSwgYW5kIHRoZW5cbiAgICAgICAgICAgICAgICAvLyBgbGlzdE1vZGVsYCBzaG91bGQgZ2l2ZSBvbmx5IG9uZSByZXN1bHQuXG5cbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYSBtb2RlbCBzcGVjaWZpZWQgd2l0aCBhIHBhdGggdGhhdCBpbmNsdWRlcyB0aGVcbiAgICAgICAgICAgICAgICAvLyBpbmRleGVkZGI6Ly8gc2NoZW1lIHByZWZpeCBzaG91bGQgd29yay5cbiAgICAgICAgICAgICAgICB0Zi5pby5yZW1vdmVNb2RlbCgnaW5kZXhlZGRiOi8vcmVwZWF0L1F1eE1vZGVsJylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZGVsZXRlZEluZm8gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIHRmLmlvLmxpc3RNb2RlbHMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChPYmplY3Qua2V5cyhvdXQpKS50b0VxdWFsKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsb2NhbHN0b3JhZ2U6Ly9RdXhNb2RlbCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRmLmlvLnJlbW92ZU1vZGVsKCdsb2NhbHN0b3JhZ2U6Ly9RdXhNb2RlbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGRlbGV0ZSB0aGUgcmVtYWluaW5nIG1vZGVsLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRmLmlvLmxpc3RNb2RlbHMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChPYmplY3Qua2V5cyhvdXQpKS50b0VxdWFsKFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gZG9uZS5mYWlsKGVycikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gZG9uZS5mYWlsKGVyci5zdGFjaykpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIuc3RhY2spKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyLnN0YWNrKSk7XG4gIH0pO1xuXG4gIC8vIFRPRE8oY2Fpcyk6IFJlZW5hYmxlIHRoaXMgdGVzdCBvbmNlIHdlIGZpeFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy8xMTk4XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpiYW5cbiAgeGl0KCdTdWNjZXNzZnVsIGNvcHlNb2RlbCBiZXR3ZWVuIG1lZGl1bXMnLCBkb25lID0+IHtcbiAgICBjb25zdCB1cmwxID0gJ2xvY2Fsc3RvcmFnZTovL2ExL0Zvb01vZGVsJztcbiAgICBjb25zdCB1cmwyID0gJ2luZGV4ZWRkYjovL2ExL0Zvb01vZGVsJztcbiAgICAvLyBGaXJzdCwgc2F2ZSBhIG1vZGVsLlxuICAgIGNvbnN0IGhhbmRsZXIxID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKHVybDEpWzBdO1xuICAgIGhhbmRsZXIxLnNhdmUoYXJ0aWZhY3RzMSlcbiAgICAgICAgLnRoZW4oc2F2ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgLy8gT25jZSBtb2RlbCBpcyBzYXZlZCwgY29weSB0aGUgbW9kZWwgdG8gYW5vdGhlciBwYXRoLlxuICAgICAgICAgIHRmLmlvLmNvcHlNb2RlbCh1cmwxLCB1cmwyKVxuICAgICAgICAgICAgICAudGhlbihtb2RlbEluZm8gPT4ge1xuICAgICAgICAgICAgICAgIHRmLmlvLmxpc3RNb2RlbHMoKS50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgICBleHBlY3QoT2JqZWN0LmtleXMob3V0KS5sZW5ndGgpLnRvRXF1YWwoMik7XG4gICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDFdLm1vZGVsVG9wb2xvZ3lUeXBlKVxuICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lUeXBlKTtcbiAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMV0ubW9kZWxUb3BvbG9neUJ5dGVzKVxuICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5Qnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgZXhwZWN0KG91dFt1cmwxXS53ZWlnaHRTcGVjc0J5dGVzKVxuICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodFNwZWNzQnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgZXhwZWN0KG91dFt1cmwxXS53ZWlnaHREYXRhQnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0RGF0YUJ5dGVzKTtcbiAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMl0ubW9kZWxUb3BvbG9neVR5cGUpXG4gICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ubW9kZWxUb3BvbG9neVR5cGUpO1xuICAgICAgICAgICAgICAgICAgZXhwZWN0KG91dFt1cmwyXS5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lCeXRlcyk7XG4gICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDJdLndlaWdodFNwZWNzQnl0ZXMpXG4gICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0U3BlY3NCeXRlcyk7XG4gICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDJdLndlaWdodERhdGFCeXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBMb2FkIHRoZSBjb3B5IGFuZCB2ZXJpZnkgdGhlIGNvbnRlbnQuXG4gICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyMiA9IHRmLmlvLmdldExvYWRIYW5kbGVycyh1cmwyKVswXTtcbiAgICAgICAgICAgICAgICAgIGhhbmRsZXIyLmxvYWQoKVxuICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGxvYWRlZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QobG9hZGVkLm1vZGVsVG9wb2xvZ3kpLnRvRXF1YWwobW9kZWxUb3BvbG9neTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGxvYWRlZC53ZWlnaHRTcGVjcykudG9FcXVhbCh3ZWlnaHRTcGVjczEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGxvYWRlZC53ZWlnaHREYXRhKS50b0JlRGVmaW5lZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KG5ldyBVaW50OEFycmF5KFxuICAgICAgICAgICAgICAgICAgICAgICAgICBDb21wb3NpdGVBcnJheUJ1ZmZlci5qb2luKGxvYWRlZC53ZWlnaHREYXRhKSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwobmV3IFVpbnQ4QXJyYXkod2VpZ2h0RGF0YTEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gZG9uZS5mYWlsKGVyci5zdGFjaykpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIuc3RhY2spKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyLnN0YWNrKSk7XG4gIH0pO1xuXG4gIC8vIFRPRE8oY2Fpcyk6IFJlZW5hYmxlIHRoaXMgdGVzdCBvbmNlIHdlIGZpeFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy8xMTk4XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpiYW5cbiAgeGl0KCdTdWNjZXNzZnVsIG1vdmVNb2RlbCBiZXR3ZWVuIG1lZGl1bXMnLCBkb25lID0+IHtcbiAgICBjb25zdCB1cmwxID0gJ2xvY2Fsc3RvcmFnZTovL2ExL0Zvb01vZGVsJztcbiAgICBjb25zdCB1cmwyID0gJ2luZGV4ZWRkYjovL2ExL0Zvb01vZGVsJztcbiAgICAvLyBGaXJzdCwgc2F2ZSBhIG1vZGVsLlxuICAgIGNvbnN0IGhhbmRsZXIxID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKHVybDEpWzBdO1xuICAgIGhhbmRsZXIxLnNhdmUoYXJ0aWZhY3RzMSlcbiAgICAgICAgLnRoZW4oc2F2ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgLy8gT25jZSBtb2RlbCBpcyBzYXZlZCwgbW92ZSB0aGUgbW9kZWwgdG8gYW5vdGhlciBwYXRoLlxuICAgICAgICAgIHRmLmlvLm1vdmVNb2RlbCh1cmwxLCB1cmwyKVxuICAgICAgICAgICAgICAudGhlbihtb2RlbEluZm8gPT4ge1xuICAgICAgICAgICAgICAgIHRmLmlvLmxpc3RNb2RlbHMoKS50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgICBleHBlY3QoT2JqZWN0LmtleXMob3V0KSkudG9FcXVhbChbdXJsMl0pO1xuICAgICAgICAgICAgICAgICAgZXhwZWN0KG91dFt1cmwyXS5tb2RlbFRvcG9sb2d5VHlwZSlcbiAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5VHlwZSk7XG4gICAgICAgICAgICAgICAgICBleHBlY3Qob3V0W3VybDJdLm1vZGVsVG9wb2xvZ3lCeXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ubW9kZWxUb3BvbG9neUJ5dGVzKTtcbiAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMl0ud2VpZ2h0U3BlY3NCeXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHRTcGVjc0J5dGVzKTtcbiAgICAgICAgICAgICAgICAgIGV4cGVjdChvdXRbdXJsMl0ud2VpZ2h0RGF0YUJ5dGVzKVxuICAgICAgICAgICAgICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodERhdGFCeXRlcyk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIExvYWQgdGhlIGNvcHkgYW5kIHZlcmlmeSB0aGUgY29udGVudC5cbiAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIyID0gdGYuaW8uZ2V0TG9hZEhhbmRsZXJzKHVybDIpWzBdO1xuICAgICAgICAgICAgICAgICAgaGFuZGxlcjIubG9hZCgpXG4gICAgICAgICAgICAgICAgICAgICAgLnRoZW4obG9hZGVkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChsb2FkZWQubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QobG9hZGVkLndlaWdodFNwZWNzKS50b0VxdWFsKHdlaWdodFNwZWNzMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QobmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4obG9hZGVkLndlaWdodERhdGEpKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9FcXVhbChuZXcgVWludDhBcnJheSh3ZWlnaHREYXRhMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lLmZhaWwoZXJyLnN0YWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyLnN0YWNrKSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChlcnIgPT4gZG9uZS5mYWlsKGVyci5zdGFjaykpO1xuICB9KTtcblxuICBpdCgnRmFpbGVkIGNvcHlNb2RlbCB0byBpbnZhbGlkIHNvdXJjZSBVUkwnLCBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICBjb25zdCB1cmwxID0gJ2ludmFsaWR1cmwnO1xuICAgICAgIGNvbnN0IHVybDIgPSAnbG9jYWxzdG9yYWdlOi8vYTEvRm9vTW9kZWwnO1xuICAgICAgIHRmLmlvLmNvcHlNb2RlbCh1cmwxLCB1cmwyKVxuICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgIGRvbmUuZmFpbCgnQ29weWluZyBmcm9tIGludmFsaWQgVVJMIHN1Y2NlZWRlZCB1bmV4cGVjdGVkbHkuJyk7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgICAgICAnQ29weWluZyBmYWlsZWQgYmVjYXVzZSBubyBsb2FkIGhhbmRsZXIgaXMgZm91bmQgZm9yICcgK1xuICAgICAgICAgICAgICAgICAgICAgJ3NvdXJjZSBVUkwgaW52YWxpZHVybC4nKTtcbiAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgIH0pO1xuICAgICB9KSk7XG5cbiAgaXQoJ0ZhaWxlZCBjb3B5TW9kZWwgdG8gaW52YWxpZCBkZXN0aW5hdGlvbiBVUkwnLCBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICBjb25zdCB1cmwxID0gJ2xvY2Fsc3RvcmFnZTovL2ExL0Zvb01vZGVsJztcbiAgICAgICBjb25zdCB1cmwyID0gJ2ludmFsaWR1cmwnO1xuICAgICAgIC8vIEZpcnN0LCBzYXZlIGEgbW9kZWwuXG4gICAgICAgY29uc3QgaGFuZGxlcjEgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnModXJsMSlbMF07XG4gICAgICAgaGFuZGxlcjEuc2F2ZShhcnRpZmFjdHMxKVxuICAgICAgICAgICAudGhlbihzYXZlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAvLyBPbmNlIG1vZGVsIGlzIHNhdmVkLCBjb3B5IHRoZSBtb2RlbCB0byBhbm90aGVyIHBhdGguXG4gICAgICAgICAgICAgdGYuaW8uY29weU1vZGVsKHVybDEsIHVybDIpXG4gICAgICAgICAgICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgICAgZG9uZS5mYWlsKCdDb3B5aW5nIHRvIGludmFsaWQgVVJMIHN1Y2NlZWRlZCB1bmV4cGVjdGVkbHkuJyk7XG4gICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnQ29weWluZyBmYWlsZWQgYmVjYXVzZSBubyBzYXZlIGhhbmRsZXIgaXMgZm91bmQgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnZm9yIGRlc3RpbmF0aW9uIFVSTCBpbnZhbGlkdXJsLicpO1xuICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgIC5jYXRjaChlcnIgPT4gZG9uZS5mYWlsKGVyci5zdGFjaykpO1xuICAgICB9KSk7XG5cbiAgaXQoJ0ZhaWxlZCBtb3ZlTW9kZWwgdG8gaW52YWxpZCBkZXN0aW5hdGlvbiBVUkwnLCBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICBjb25zdCB1cmwxID0gJ2xvY2Fsc3RvcmFnZTovL2ExL0Zvb01vZGVsJztcbiAgICAgICBjb25zdCB1cmwyID0gJ2ludmFsaWR1cmwnO1xuICAgICAgIC8vIEZpcnN0LCBzYXZlIGEgbW9kZWwuXG4gICAgICAgY29uc3QgaGFuZGxlcjEgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnModXJsMSlbMF07XG4gICAgICAgaGFuZGxlcjEuc2F2ZShhcnRpZmFjdHMxKVxuICAgICAgICAgICAudGhlbihzYXZlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAvLyBPbmNlIG1vZGVsIGlzIHNhdmVkLCBjb3B5IHRoZSBtb2RlbCB0byBhbiBpbnZhbGlkIHBhdGgsIHdoaWNoXG4gICAgICAgICAgICAgLy8gc2hvdWxkIGZhaWwuXG4gICAgICAgICAgICAgdGYuaW8ubW92ZU1vZGVsKHVybDEsIHVybDIpXG4gICAgICAgICAgICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgICAgZG9uZS5mYWlsKCdDb3B5aW5nIHRvIGludmFsaWQgVVJMIHN1Y2NlZWRlZCB1bmV4cGVjdGVkbHkuJyk7XG4gICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnQ29weWluZyBmYWlsZWQgYmVjYXVzZSBubyBzYXZlIGhhbmRsZXIgaXMgZm91bmQgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnZm9yIGRlc3RpbmF0aW9uIFVSTCBpbnZhbGlkdXJsLicpO1xuXG4gICAgICAgICAgICAgICAgICAgLy8gVmVyaWZ5IHRoYXQgdGhlIHNvdXJjZSBoYXMgbm90IGJlZW4gcmVtb3ZlZC5cbiAgICAgICAgICAgICAgICAgICB0Zi5pby5saXN0TW9kZWxzKClcbiAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4ob3V0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoT2JqZWN0LmtleXMob3V0KSkudG9FcXVhbChbdXJsMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBkb25lLmZhaWwoZXJyLnN0YWNrKSk7XG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICB9KVxuICAgICAgICAgICAuY2F0Y2goZXJyID0+IGRvbmUuZmFpbChlcnIuc3RhY2spKTtcbiAgICAgfSkpO1xuXG4gIGl0KCdGYWlsZWQgZGVsZXRlZE1vZGVsOiBBYnNlbnQgc2NoZW1lJywgcnVuV2l0aExvY2soZG9uZSA9PiB7XG4gICAgICAgLy8gQXR0ZW1wdCB0byBkZWxldGUgYSBub25leGlzdGVudCBtb2RlbCBpcyBleHBlY3RlZCB0byBmYWlsLlxuICAgICAgIHRmLmlvLnJlbW92ZU1vZGVsKCdmb28nKVxuICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgIGRvbmUuZmFpbChcbiAgICAgICAgICAgICAgICAgJ1JlbW92aW5nIG1vZGVsIHdpdGggbWlzc2luZyBzY2hlbWUgc3VjY2VlZGVkIHVuZXhwZWN0ZWRseS4nKTtcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgZXhwZWN0KGVyci5tZXNzYWdlKVxuICAgICAgICAgICAgICAgICAudG9NYXRjaCgvVGhlIHVybCBzdHJpbmcgcHJvdmlkZWQgZG9lcyBub3QgY29udGFpbiBhIHNjaGVtZS8pO1xuICAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZS5pbmRleE9mKCdsb2NhbHN0b3JhZ2UnKSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZS5pbmRleE9mKCdpbmRleGVkZGInKSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgfSk7XG4gICAgIH0pKTtcblxuICBpdCgnRmFpbGVkIGRlbGV0ZWRNb2RlbDogSW52YWxpZCBzY2hlbWUnLCBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICAvLyBBdHRlbXB0IHRvIGRlbGV0ZSBhIG5vbmV4aXN0ZW50IG1vZGVsIGlzIGV4cGVjdGVkIHRvIGZhaWwuXG4gICAgICAgdGYuaW8ucmVtb3ZlTW9kZWwoJ2ludmFsaWRzY2hlbWU6Ly9mb28nKVxuICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgIGRvbmUuZmFpbCgnUmVtb3Zpbmcgbm9uZXhpc3RlbnQgbW9kZWwgc3VjY2VlZGVkIHVuZXhwZWN0ZWRseS4nKTtcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgZXhwZWN0KGVyci5tZXNzYWdlKVxuICAgICAgICAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgICAgICAgICdDYW5ub3QgZmluZCBtb2RlbCBtYW5hZ2VyIGZvciBzY2hlbWUgXFwnaW52YWxpZHNjaGVtZVxcJycpO1xuICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgfSk7XG4gICAgIH0pKTtcblxuICBpdCgnRmFpbGVkIGRlbGV0ZWRNb2RlbDogTm9uZXhpc3RlbnQgbW9kZWwnLCBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICAvLyBBdHRlbXB0IHRvIGRlbGV0ZSBhIG5vbmV4aXN0ZW50IG1vZGVsIGlzIGV4cGVjdGVkIHRvIGZhaWwuXG4gICAgICAgdGYuaW8ucmVtb3ZlTW9kZWwoJ2luZGV4ZWRkYjovL25vbmV4aXN0ZW50JylcbiAgICAgICAgICAgLnRoZW4ob3V0ID0+IHtcbiAgICAgICAgICAgICBkb25lLmZhaWwoJ1JlbW92aW5nIG5vbmV4aXN0ZW50IG1vZGVsIHN1Y2NlZWRlZCB1bmV4cGVjdGVkbHkuJyk7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgICAgICAnQ2Fubm90IGZpbmQgbW9kZWwgJyArXG4gICAgICAgICAgICAgICAgICAgICAnd2l0aCBwYXRoIFxcJ25vbmV4aXN0ZW50XFwnIGluIEluZGV4ZWREQi4nKTtcbiAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgIH0pO1xuICAgICB9KSk7XG5cbiAgaXQoJ0ZhaWxlZCBjb3B5TW9kZWwnLCBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICAvLyBBdHRlbXB0IHRvIGNvcHkgYSBub25leGlzdGVudCBtb2RlbCBzaG91bGQgZmFpbC5cbiAgICAgICB0Zi5pby5jb3B5TW9kZWwoJ2luZGV4ZWRkYjovL25vbmV4aXN0ZW50JywgJ2luZGV4ZWRkYjovL2Rlc3RpbmF0aW9uJylcbiAgICAgICAgICAgLnRoZW4ob3V0ID0+IHtcbiAgICAgICAgICAgICBkb25lLmZhaWwoJ0NvcHlpbmcgbm9uZXhpc3RlbnQgbW9kZWwgc3VjY2VlZGVkIHVuZXhwZWN0ZWRseS4nKTtcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgZXhwZWN0KGVyci5tZXNzYWdlKVxuICAgICAgICAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgICAgICAgICdDYW5ub3QgZmluZCBtb2RlbCAnICtcbiAgICAgICAgICAgICAgICAgICAgICd3aXRoIHBhdGggXFwnbm9uZXhpc3RlbnRcXCcgaW4gSW5kZXhlZERCLicpO1xuICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgfSk7XG4gICAgIH0pKTtcblxuICBpdCgnY29weU1vZGVsOiBJZGVudGljYWwgb2xkUGF0aCBhbmQgbmV3UGF0aCBsZWFkcyB0byBFcnJvcicsXG4gICAgIHJ1bldpdGhMb2NrKGRvbmUgPT4ge1xuICAgICAgIHRmLmlvLmNvcHlNb2RlbCgnYS8xJywgJ2EvMScpXG4gICAgICAgICAgIC50aGVuKG91dCA9PiB7XG4gICAgICAgICAgICAgZG9uZS5mYWlsKFxuICAgICAgICAgICAgICAgICAnQ29weWluZyB3aXRoIGlkZW50aWNhbCAnICtcbiAgICAgICAgICAgICAgICAgJ29sZCAmIG5ldyBwYXRocyBzdWNjZWVkZWQgdW5leHBlY3RlZGx5LicpO1xuICAgICAgICAgICB9KVxuICAgICAgICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICBleHBlY3QoZXJyLm1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgIC50b0VxdWFsKCdPbGQgcGF0aCBhbmQgbmV3IHBhdGggYXJlIHRoZSBzYW1lOiBcXCdhLzFcXCcnKTtcbiAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgIH0pO1xuICAgICB9KSk7XG5cbiAgaXQoJ21vdmVNb2RlbDogSWRlbnRpY2FsIG9sZFBhdGggYW5kIG5ld1BhdGggbGVhZHMgdG8gRXJyb3InLFxuICAgICBydW5XaXRoTG9jayhkb25lID0+IHtcbiAgICAgICB0Zi5pby5tb3ZlTW9kZWwoJ2EvMScsICdhLzEnKVxuICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgIGRvbmUuZmFpbChcbiAgICAgICAgICAgICAgICAgJ0NvcHlpbmcgd2l0aCBpZGVudGljYWwgJyArXG4gICAgICAgICAgICAgICAgICdvbGQgJiBuZXcgcGF0aHMgc3VjY2VlZGVkIHVuZXhwZWN0ZWRseS4nKTtcbiAgICAgICAgICAgfSlcbiAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgZXhwZWN0KGVyci5tZXNzYWdlKVxuICAgICAgICAgICAgICAgICAudG9FcXVhbCgnT2xkIHBhdGggYW5kIG5ldyBwYXRoIGFyZSB0aGUgc2FtZTogXFwnYS8xXFwnJyk7XG4gICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICB9KTtcbiAgICAgfSkpO1xufSk7XG4iXX0=