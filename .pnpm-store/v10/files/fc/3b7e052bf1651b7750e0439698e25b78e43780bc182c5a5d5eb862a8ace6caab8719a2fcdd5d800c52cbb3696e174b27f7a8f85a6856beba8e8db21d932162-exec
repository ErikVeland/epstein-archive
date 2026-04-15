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
/**
 * Unit tests for indexed_db.ts.
 */
import * as tf from '../index';
import { BROWSER_ENVS, describeWithFlags, runWithLock } from '../jasmine_util';
import { expectArrayBuffersEqual } from '../test_util';
import { browserIndexedDB, BrowserIndexedDB, BrowserIndexedDBManager, deleteDatabase, indexedDBRouter } from './indexed_db';
import { CompositeArrayBuffer } from './composite_array_buffer';
describeWithFlags('IndexedDB', BROWSER_ENVS, () => {
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
        format: 'layers-model',
        generatedBy: 'TensorFlow.js v0.0.0',
        convertedBy: null,
        modelInitializer: {}
    };
    const weightSpecs2 = [
        {
            name: 'dense/new_kernel',
            shape: [5, 1],
            dtype: 'float32',
        },
        {
            name: 'dense/new_bias',
            shape: [1],
            dtype: 'float32',
        }
    ];
    beforeEach(deleteDatabase);
    afterEach(deleteDatabase);
    it('Save-load round trip', runWithLock(async () => {
        const testStartDate = new Date();
        const handler = tf.io.getSaveHandlers('indexeddb://FooModel')[0];
        const saveResult = await handler.save(artifacts1);
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
        const loadedArtifacts = await handler.load();
        expect(loadedArtifacts.modelTopology).toEqual(modelTopology1);
        expect(loadedArtifacts.weightSpecs).toEqual(weightSpecs1);
        expect(loadedArtifacts.format).toEqual('layers-model');
        expect(loadedArtifacts.generatedBy).toEqual('TensorFlow.js v0.0.0');
        expect(loadedArtifacts.convertedBy).toEqual(null);
        expect(loadedArtifacts.modelInitializer).toEqual({});
        expectArrayBuffersEqual(CompositeArrayBuffer.join(loadedArtifacts.weightData), weightData1);
    }));
    it('Save two models and load one', runWithLock(async () => {
        const weightData2 = new ArrayBuffer(24);
        const artifacts2 = {
            modelTopology: modelTopology1,
            weightSpecs: weightSpecs2,
            weightData: weightData2,
        };
        const handler1 = tf.io.getSaveHandlers('indexeddb://Model/1')[0];
        const saveResult1 = await handler1.save(artifacts1);
        // Note: The following two assertions work only because there is no
        // non-ASCII characters in `modelTopology1` and `weightSpecs1`.
        expect(saveResult1.modelArtifactsInfo.modelTopologyBytes)
            .toEqual(JSON.stringify(modelTopology1).length);
        expect(saveResult1.modelArtifactsInfo.weightSpecsBytes)
            .toEqual(JSON.stringify(weightSpecs1).length);
        expect(saveResult1.modelArtifactsInfo.weightDataBytes)
            .toEqual(weightData1.byteLength);
        const handler2 = tf.io.getSaveHandlers('indexeddb://Model/2')[0];
        const saveResult2 = await handler2.save(artifacts2);
        expect(saveResult2.modelArtifactsInfo.dateSaved.getTime())
            .toBeGreaterThanOrEqual(saveResult1.modelArtifactsInfo.dateSaved.getTime());
        // Note: The following two assertions work only because there is
        // no non-ASCII characters in `modelTopology1` and
        // `weightSpecs1`.
        expect(saveResult2.modelArtifactsInfo.modelTopologyBytes)
            .toEqual(JSON.stringify(modelTopology1).length);
        expect(saveResult2.modelArtifactsInfo.weightSpecsBytes)
            .toEqual(JSON.stringify(weightSpecs2).length);
        expect(saveResult2.modelArtifactsInfo.weightDataBytes)
            .toEqual(weightData2.byteLength);
        const loadedArtifacts = await handler1.load();
        expect(loadedArtifacts.modelTopology).toEqual(modelTopology1);
        expect(loadedArtifacts.weightSpecs).toEqual(weightSpecs1);
        expect(loadedArtifacts.weightData).toBeDefined();
        expectArrayBuffersEqual(CompositeArrayBuffer.join(loadedArtifacts.weightData), weightData1);
    }));
    it('Loading nonexistent model fails', runWithLock(async () => {
        const handler = tf.io.getSaveHandlers('indexeddb://NonexistentModel')[0];
        try {
            await handler.load();
            fail('Loading nonexistent model from IndexedDB succeeded unexpectly');
        }
        catch (err) {
            expect(err.message)
                .toEqual('Cannot find model ' +
                'with path \'NonexistentModel\' in IndexedDB.');
        }
    }));
    it('Null, undefined or empty modelPath throws Error', () => {
        expect(() => browserIndexedDB(null))
            .toThrowError(/IndexedDB, modelPath must not be null, undefined or empty/);
        expect(() => browserIndexedDB(undefined))
            .toThrowError(/IndexedDB, modelPath must not be null, undefined or empty/);
        expect(() => browserIndexedDB(''))
            .toThrowError(/IndexedDB, modelPath must not be null, undefined or empty./);
    });
    it('router', () => {
        expect(indexedDBRouter('indexeddb://bar') instanceof BrowserIndexedDB)
            .toEqual(true);
        expect(indexedDBRouter('localstorage://bar')).toBeNull();
        expect(indexedDBRouter('qux')).toBeNull();
    });
    it('Manager: List models: 0 result', runWithLock(async () => {
        // Before any model is saved, listModels should return empty result.
        const models = await new BrowserIndexedDBManager().listModels();
        expect(models).toEqual({});
    }));
    it('Manager: List models: 1 result', runWithLock(async () => {
        const handler = tf.io.getSaveHandlers('indexeddb://baz/QuxModel')[0];
        const saveResult = await handler.save(artifacts1);
        // After successful saving, there should be one model.
        const models = await new BrowserIndexedDBManager().listModels();
        expect(Object.keys(models).length).toEqual(1);
        expect(models['baz/QuxModel'].modelTopologyType)
            .toEqual(saveResult.modelArtifactsInfo.modelTopologyType);
        expect(models['baz/QuxModel'].modelTopologyBytes)
            .toEqual(saveResult.modelArtifactsInfo.modelTopologyBytes);
        expect(models['baz/QuxModel'].weightSpecsBytes)
            .toEqual(saveResult.modelArtifactsInfo.weightSpecsBytes);
        expect(models['baz/QuxModel'].weightDataBytes)
            .toEqual(saveResult.modelArtifactsInfo.weightDataBytes);
    }));
    it('Manager: List models: 2 results', runWithLock(async () => {
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers('indexeddb://QuxModel')[0];
        const saveResult1 = await handler1.save(artifacts1);
        // Then, save the model under another path.
        const handler2 = tf.io.getSaveHandlers('indexeddb://repeat/QuxModel')[0];
        const saveResult2 = await handler2.save(artifacts1);
        // After successful saving, there should be two models.
        const models = await new BrowserIndexedDBManager().listModels();
        expect(Object.keys(models).length).toEqual(2);
        expect(models['QuxModel'].modelTopologyType)
            .toEqual(saveResult1.modelArtifactsInfo.modelTopologyType);
        expect(models['QuxModel'].modelTopologyBytes)
            .toEqual(saveResult1.modelArtifactsInfo.modelTopologyBytes);
        expect(models['QuxModel'].weightSpecsBytes)
            .toEqual(saveResult1.modelArtifactsInfo.weightSpecsBytes);
        expect(models['QuxModel'].weightDataBytes)
            .toEqual(saveResult1.modelArtifactsInfo.weightDataBytes);
        expect(models['repeat/QuxModel'].modelTopologyType)
            .toEqual(saveResult2.modelArtifactsInfo.modelTopologyType);
        expect(models['repeat/QuxModel'].modelTopologyBytes)
            .toEqual(saveResult2.modelArtifactsInfo.modelTopologyBytes);
        expect(models['repeat/QuxModel'].weightSpecsBytes)
            .toEqual(saveResult2.modelArtifactsInfo.weightSpecsBytes);
        expect(models['repeat/QuxModel'].weightDataBytes)
            .toEqual(saveResult2.modelArtifactsInfo.weightDataBytes);
    }));
    it('Manager: Successful removeModel', runWithLock(async () => {
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers('indexeddb://QuxModel')[0];
        await handler1.save(artifacts1);
        // Then, save the model under another path.
        const handler2 = tf.io.getSaveHandlers('indexeddb://repeat/QuxModel')[0];
        await handler2.save(artifacts1);
        // After successful saving, delete the first save, and then
        // `listModel` should give only one result.
        const manager = new BrowserIndexedDBManager();
        await manager.removeModel('QuxModel');
        const models = await manager.listModels();
        expect(Object.keys(models)).toEqual(['repeat/QuxModel']);
    }));
    it('Manager: Successful removeModel with URL scheme', runWithLock(async () => {
        // First, save a model.
        const handler1 = tf.io.getSaveHandlers('indexeddb://QuxModel')[0];
        await handler1.save(artifacts1);
        // Then, save the model under another path.
        const handler2 = tf.io.getSaveHandlers('indexeddb://repeat/QuxModel')[0];
        await handler2.save(artifacts1);
        // After successful saving, delete the first save, and then
        // `listModel` should give only one result.
        const manager = new BrowserIndexedDBManager();
        // Delete a model specified with a path that includes the
        // indexeddb:// scheme prefix should work.
        manager.removeModel('indexeddb://QuxModel');
        const models = await manager.listModels();
        expect(Object.keys(models)).toEqual(['repeat/QuxModel']);
    }));
    it('Manager: Failed removeModel', runWithLock(async () => {
        try {
            // Attempt to delete a nonexistent model is expected to fail.
            await new BrowserIndexedDBManager().removeModel('nonexistent');
            fail('Deleting nonexistent model succeeded unexpectedly.');
        }
        catch (err) {
            expect(err.message)
                .toEqual('Cannot find model with path \'nonexistent\' in IndexedDB.');
        }
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZF9kYl90ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9pby9pbmRleGVkX2RiX3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUg7O0dBRUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMvQixPQUFPLEVBQUMsWUFBWSxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzdFLE9BQU8sRUFBQyx1QkFBdUIsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNyRCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsdUJBQXVCLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMxSCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUU5RCxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUNoRCxhQUFhO0lBQ2IsTUFBTSxjQUFjLEdBQU87UUFDekIsWUFBWSxFQUFFLFlBQVk7UUFDMUIsZUFBZSxFQUFFLE9BQU87UUFDeEIsUUFBUSxFQUFFLENBQUM7Z0JBQ1QsWUFBWSxFQUFFLE9BQU87Z0JBQ3JCLFFBQVEsRUFBRTtvQkFDUixvQkFBb0IsRUFBRTt3QkFDcEIsWUFBWSxFQUFFLGlCQUFpQjt3QkFDL0IsUUFBUSxFQUFFOzRCQUNSLGNBQWMsRUFBRSxTQUFTOzRCQUN6QixPQUFPLEVBQUUsR0FBRzs0QkFDWixNQUFNLEVBQUUsSUFBSTs0QkFDWixNQUFNLEVBQUUsU0FBUzt5QkFDbEI7cUJBQ0Y7b0JBQ0QsTUFBTSxFQUFFLE9BQU87b0JBQ2YsbUJBQW1CLEVBQUUsSUFBSTtvQkFDekIsa0JBQWtCLEVBQUUsSUFBSTtvQkFDeEIsaUJBQWlCLEVBQUUsSUFBSTtvQkFDdkIsT0FBTyxF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QUMsQ0FBQztRQUNsRSxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFaEMsMkNBQTJDO1FBQzNDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekUsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWhDLDJEQUEyRDtRQUMzRCwyQ0FBMkM7UUFDM0MsTUFBTSxPQUFPLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBRTlDLHlEQUF5RDtRQUN6RCwwQ0FBMEM7UUFDMUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRTVDLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFUCxFQUFFLENBQUMsNkJBQTZCLEVBQUUsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ3BELElBQUk7WUFDRiw2REFBNkQ7WUFDN0QsTUFBTSxJQUFJLHVCQUF1QixFQUFFLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1NBQzVEO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztpQkFDZCxPQUFPLENBQ0osMkRBQTJELENBQUMsQ0FBQztTQUN0RTtJQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiBVbml0IHRlc3RzIGZvciBpbmRleGVkX2RiLnRzLlxuICovXG5cbmltcG9ydCAqIGFzIHRmIGZyb20gJy4uL2luZGV4JztcbmltcG9ydCB7QlJPV1NFUl9FTlZTLCBkZXNjcmliZVdpdGhGbGFncywgcnVuV2l0aExvY2t9IGZyb20gJy4uL2phc21pbmVfdXRpbCc7XG5pbXBvcnQge2V4cGVjdEFycmF5QnVmZmVyc0VxdWFsfSBmcm9tICcuLi90ZXN0X3V0aWwnO1xuaW1wb3J0IHticm93c2VySW5kZXhlZERCLCBCcm93c2VySW5kZXhlZERCLCBCcm93c2VySW5kZXhlZERCTWFuYWdlciwgZGVsZXRlRGF0YWJhc2UsIGluZGV4ZWREQlJvdXRlcn0gZnJvbSAnLi9pbmRleGVkX2RiJztcbmltcG9ydCB7Q29tcG9zaXRlQXJyYXlCdWZmZXJ9IGZyb20gJy4vY29tcG9zaXRlX2FycmF5X2J1ZmZlcic7XG5cbmRlc2NyaWJlV2l0aEZsYWdzKCdJbmRleGVkREInLCBCUk9XU0VSX0VOVlMsICgpID0+IHtcbiAgLy8gVGVzdCBkYXRhLlxuICBjb25zdCBtb2RlbFRvcG9sb2d5MToge30gPSB7XG4gICAgJ2NsYXNzX25hbWUnOiAnU2VxdWVudGlhbCcsXG4gICAgJ2tlcmFzX3ZlcnNpb24nOiAnMi4xLjQnLFxuICAgICdjb25maWcnOiBbe1xuICAgICAgJ2NsYXNzX25hbWUnOiAnRGVuc2UnLFxuICAgICAgJ2NvbmZpZyc6IHtcbiAgICAgICAgJ2tlcm5lbF9pbml0aWFsaXplcic6IHtcbiAgICAgICAgICAnY2xhc3NfbmFtZSc6ICdWYXJpYW5jZVNjYWxpbmcnLFxuICAgICAgICAgICdjb25maWcnOiB7XG4gICAgICAgICAgICAnZGlzdHJpYnV0aW9uJzogJ3VuaWZvcm0nLFxuICAgICAgICAgICAgJ3NjYWxlJzogMS4wLFxuICAgICAgICAgICAgJ3NlZWQnOiBudWxsLFxuICAgICAgICAgICAgJ21vZGUnOiAnZmFuX2F2ZydcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICduYW1lJzogJ2RlbnNlJyxcbiAgICAgICAgJ2tlcm5lbF9jb25zdHJhaW50JzogbnVsbCxcbiAgICAgICAgJ2JpYXNfcmVndWxhcml6ZXInOiBudWxsLFxuICAgICAgICAnYmlhc19jb25zdHJhaW50JzogbnVsbCxcbiAgICAgICAgJ2R0eXBlJzogJ2Zsb2F0MzInLFxuICAgICAgICAnYWN0aXZhdGlvbic6ICdsaW5lYXInLFxuICAgICAgICAndHJhaW5hYmxlJzogdHJ1ZSxcbiAgICAgICAgJ2tlcm5lbF9yZWd1bGFyaXplcic6IG51bGwsXG4gICAgICAgICdiaWFzX2luaXRpYWxpemVyJzogeydjbGFzc19uYW1lJzogJ1plcm9zJywgJ2NvbmZpZyc6IHt9fSxcbiAgICAgICAgJ3VuaXRzJzogMSxcbiAgICAgICAgJ2JhdGNoX2lucHV0X3NoYXBlJzogW251bGwsIDNdLFxuICAgICAgICAndXNlX2JpYXMnOiB0cnVlLFxuICAgICAgICAnYWN0aXZpdHlfcmVndWxhcml6ZXInOiBudWxsXG4gICAgICB9XG4gICAgfV0sXG4gICAgJ2JhY2tlbmQnOiAndGVuc29yZmxvdydcbiAgfTtcbiAgY29uc3Qgd2VpZ2h0U3BlY3MxOiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RFbnRyeVtdID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdkZW5zZS9rZXJuZWwnLFxuICAgICAgc2hhcGU6IFszLCAxXSxcbiAgICAgIGR0eXBlOiAnZmxvYXQzMicsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnZGVuc2UvYmlhcycsXG4gICAgICBzaGFwZTogWzFdLFxuICAgICAgZHR5cGU6ICdmbG9hdDMyJyxcbiAgICB9XG4gIF07XG4gIGNvbnN0IHdlaWdodERhdGExID0gbmV3IEFycmF5QnVmZmVyKDE2KTtcbiAgY29uc3QgYXJ0aWZhY3RzMTogdGYuaW8uTW9kZWxBcnRpZmFjdHMgPSB7XG4gICAgbW9kZWxUb3BvbG9neTogbW9kZWxUb3BvbG9neTEsXG4gICAgd2VpZ2h0U3BlY3M6IHdlaWdodFNwZWNzMSxcbiAgICB3ZWlnaHREYXRhOiB3ZWlnaHREYXRhMSxcbiAgICBmb3JtYXQ6ICdsYXllcnMtbW9kZWwnLFxuICAgIGdlbmVyYXRlZEJ5OiAnVGVuc29yRmxvdy5qcyB2MC4wLjAnLFxuICAgIGNvbnZlcnRlZEJ5OiBudWxsLFxuICAgIG1vZGVsSW5pdGlhbGl6ZXI6IHt9XG4gIH07XG5cbiAgY29uc3Qgd2VpZ2h0U3BlY3MyOiB0Zi5pby5XZWlnaHRzTWFuaWZlc3RFbnRyeVtdID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdkZW5zZS9uZXdfa2VybmVsJyxcbiAgICAgIHNoYXBlOiBbNSwgMV0sXG4gICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogJ2RlbnNlL25ld19iaWFzJyxcbiAgICAgIHNoYXBlOiBbMV0sXG4gICAgICBkdHlwZTogJ2Zsb2F0MzInLFxuICAgIH1cbiAgXTtcblxuICBiZWZvcmVFYWNoKGRlbGV0ZURhdGFiYXNlKTtcblxuICBhZnRlckVhY2goZGVsZXRlRGF0YWJhc2UpO1xuXG4gIGl0KCdTYXZlLWxvYWQgcm91bmQgdHJpcCcsIHJ1bldpdGhMb2NrKGFzeW5jICgpID0+IHtcbiAgICAgICBjb25zdCB0ZXN0U3RhcnREYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICBjb25zdCBoYW5kbGVyID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKCdpbmRleGVkZGI6Ly9Gb29Nb2RlbCcpWzBdO1xuXG4gICAgICAgY29uc3Qgc2F2ZVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIuc2F2ZShhcnRpZmFjdHMxKTtcbiAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8uZGF0ZVNhdmVkLmdldFRpbWUoKSlcbiAgICAgICAgICAgLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwodGVzdFN0YXJ0RGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgIC8vIE5vdGU6IFRoZSBmb2xsb3dpbmcgdHdvIGFzc2VydGlvbnMgd29yayBvbmx5IGJlY2F1c2UgdGhlcmUgaXMgbm9cbiAgICAgICAvLyAgIG5vbi1BU0NJSSBjaGFyYWN0ZXJzIGluIGBtb2RlbFRvcG9sb2d5MWAgYW5kIGB3ZWlnaHRTcGVjczFgLlxuICAgICAgIGV4cGVjdChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKEpTT04uc3RyaW5naWZ5KG1vZGVsVG9wb2xvZ3kxKS5sZW5ndGgpO1xuICAgICAgIGV4cGVjdChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHRTcGVjc0J5dGVzKVxuICAgICAgICAgICAudG9FcXVhbChKU09OLnN0cmluZ2lmeSh3ZWlnaHRTcGVjczEpLmxlbmd0aCk7XG4gICAgICAgZXhwZWN0KHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodERhdGFCeXRlcylcbiAgICAgICAgICAgLnRvRXF1YWwod2VpZ2h0RGF0YTEuYnl0ZUxlbmd0aCk7XG5cbiAgICAgICBjb25zdCBsb2FkZWRBcnRpZmFjdHMgPSBhd2FpdCBoYW5kbGVyLmxvYWQoKTtcbiAgICAgICBleHBlY3QobG9hZGVkQXJ0aWZhY3RzLm1vZGVsVG9wb2xvZ3kpLnRvRXF1YWwobW9kZWxUb3BvbG9neTEpO1xuICAgICAgIGV4cGVjdChsb2FkZWRBcnRpZmFjdHMud2VpZ2h0U3BlY3MpLnRvRXF1YWwod2VpZ2h0U3BlY3MxKTtcbiAgICAgICBleHBlY3QobG9hZGVkQXJ0aWZhY3RzLmZvcm1hdCkudG9FcXVhbCgnbGF5ZXJzLW1vZGVsJyk7XG4gICAgICAgZXhwZWN0KGxvYWRlZEFydGlmYWN0cy5nZW5lcmF0ZWRCeSkudG9FcXVhbCgnVGVuc29yRmxvdy5qcyB2MC4wLjAnKTtcbiAgICAgICBleHBlY3QobG9hZGVkQXJ0aWZhY3RzLmNvbnZlcnRlZEJ5KS50b0VxdWFsKG51bGwpO1xuICAgICAgIGV4cGVjdChsb2FkZWRBcnRpZmFjdHMubW9kZWxJbml0aWFsaXplcikudG9FcXVhbCh7fSk7XG4gICAgICAgZXhwZWN0QXJyYXlCdWZmZXJzRXF1YWwoQ29tcG9zaXRlQXJyYXlCdWZmZXIuam9pbihcbiAgICAgICAgICAgbG9hZGVkQXJ0aWZhY3RzLndlaWdodERhdGEpLCB3ZWlnaHREYXRhMSk7XG4gIH0pKTtcblxuICBpdCgnU2F2ZSB0d28gbW9kZWxzIGFuZCBsb2FkIG9uZScsIHJ1bldpdGhMb2NrKGFzeW5jICgpID0+IHtcbiAgICAgICBjb25zdCB3ZWlnaHREYXRhMiA9IG5ldyBBcnJheUJ1ZmZlcigyNCk7XG4gICAgICAgY29uc3QgYXJ0aWZhY3RzMjogdGYuaW8uTW9kZWxBcnRpZmFjdHMgPSB7XG4gICAgICAgICBtb2RlbFRvcG9sb2d5OiBtb2RlbFRvcG9sb2d5MSxcbiAgICAgICAgIHdlaWdodFNwZWNzOiB3ZWlnaHRTcGVjczIsXG4gICAgICAgICB3ZWlnaHREYXRhOiB3ZWlnaHREYXRhMixcbiAgICAgICB9O1xuICAgICAgIGNvbnN0IGhhbmRsZXIxID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKCdpbmRleGVkZGI6Ly9Nb2RlbC8xJylbMF07XG4gICAgICAgY29uc3Qgc2F2ZVJlc3VsdDEgPSBhd2FpdCBoYW5kbGVyMS5zYXZlKGFydGlmYWN0czEpO1xuICAgICAgIC8vIE5vdGU6IFRoZSBmb2xsb3dpbmcgdHdvIGFzc2VydGlvbnMgd29yayBvbmx5IGJlY2F1c2UgdGhlcmUgaXMgbm9cbiAgICAgICAvLyBub24tQVNDSUkgY2hhcmFjdGVycyBpbiBgbW9kZWxUb3BvbG9neTFgIGFuZCBgd2VpZ2h0U3BlY3MxYC5cbiAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdDEubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lCeXRlcylcbiAgICAgICAgICAgLnRvRXF1YWwoSlNPTi5zdHJpbmdpZnkobW9kZWxUb3BvbG9neTEpLmxlbmd0aCk7XG4gICAgICAgZXhwZWN0KHNhdmVSZXN1bHQxLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHRTcGVjc0J5dGVzKVxuICAgICAgICAgICAudG9FcXVhbChKU09OLnN0cmluZ2lmeSh3ZWlnaHRTcGVjczEpLmxlbmd0aCk7XG4gICAgICAgZXhwZWN0KHNhdmVSZXN1bHQxLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHdlaWdodERhdGExLmJ5dGVMZW5ndGgpO1xuXG4gICAgICAgY29uc3QgaGFuZGxlcjIgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnMoJ2luZGV4ZWRkYjovL01vZGVsLzInKVswXTtcbiAgICAgICBjb25zdCBzYXZlUmVzdWx0MiA9IGF3YWl0IGhhbmRsZXIyLnNhdmUoYXJ0aWZhY3RzMik7XG4gICAgICAgZXhwZWN0KHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby5kYXRlU2F2ZWQuZ2V0VGltZSgpKVxuICAgICAgICAgICAudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbChcbiAgICAgICAgICAgICAgIHNhdmVSZXN1bHQxLm1vZGVsQXJ0aWZhY3RzSW5mby5kYXRlU2F2ZWQuZ2V0VGltZSgpKTtcbiAgICAgICAvLyBOb3RlOiBUaGUgZm9sbG93aW5nIHR3byBhc3NlcnRpb25zIHdvcmsgb25seSBiZWNhdXNlIHRoZXJlIGlzXG4gICAgICAgLy8gbm8gbm9uLUFTQ0lJIGNoYXJhY3RlcnMgaW4gYG1vZGVsVG9wb2xvZ3kxYCBhbmRcbiAgICAgICAvLyBgd2VpZ2h0U3BlY3MxYC5cbiAgICAgICBleHBlY3Qoc2F2ZVJlc3VsdDIubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lCeXRlcylcbiAgICAgICAgICAgLnRvRXF1YWwoSlNPTi5zdHJpbmdpZnkobW9kZWxUb3BvbG9neTEpLmxlbmd0aCk7XG4gICAgICAgZXhwZWN0KHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHRTcGVjc0J5dGVzKVxuICAgICAgICAgICAudG9FcXVhbChKU09OLnN0cmluZ2lmeSh3ZWlnaHRTcGVjczIpLmxlbmd0aCk7XG4gICAgICAgZXhwZWN0KHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHdlaWdodERhdGEyLmJ5dGVMZW5ndGgpO1xuXG4gICAgICAgY29uc3QgbG9hZGVkQXJ0aWZhY3RzID0gYXdhaXQgaGFuZGxlcjEubG9hZCgpO1xuICAgICAgIGV4cGVjdChsb2FkZWRBcnRpZmFjdHMubW9kZWxUb3BvbG9neSkudG9FcXVhbChtb2RlbFRvcG9sb2d5MSk7XG4gICAgICAgZXhwZWN0KGxvYWRlZEFydGlmYWN0cy53ZWlnaHRTcGVjcykudG9FcXVhbCh3ZWlnaHRTcGVjczEpO1xuICAgICAgIGV4cGVjdChsb2FkZWRBcnRpZmFjdHMud2VpZ2h0RGF0YSkudG9CZURlZmluZWQoKTtcbiAgICAgICBleHBlY3RBcnJheUJ1ZmZlcnNFcXVhbChDb21wb3NpdGVBcnJheUJ1ZmZlci5qb2luKFxuICAgICAgICAgICBsb2FkZWRBcnRpZmFjdHMud2VpZ2h0RGF0YSksIHdlaWdodERhdGExKTtcbiAgICAgfSkpO1xuXG4gIGl0KCdMb2FkaW5nIG5vbmV4aXN0ZW50IG1vZGVsIGZhaWxzJywgcnVuV2l0aExvY2soYXN5bmMgKCkgPT4ge1xuICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnMoJ2luZGV4ZWRkYjovL05vbmV4aXN0ZW50TW9kZWwnKVswXTtcblxuICAgICAgIHRyeSB7XG4gICAgICAgICBhd2FpdCBoYW5kbGVyLmxvYWQoKTtcbiAgICAgICAgIGZhaWwoJ0xvYWRpbmcgbm9uZXhpc3RlbnQgbW9kZWwgZnJvbSBJbmRleGVkREIgc3VjY2VlZGVkIHVuZXhwZWN0bHknKTtcbiAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgIGV4cGVjdChlcnIubWVzc2FnZSlcbiAgICAgICAgICAgICAudG9FcXVhbChcbiAgICAgICAgICAgICAgICAgJ0Nhbm5vdCBmaW5kIG1vZGVsICcgK1xuICAgICAgICAgICAgICAgICAnd2l0aCBwYXRoIFxcJ05vbmV4aXN0ZW50TW9kZWxcXCcgaW4gSW5kZXhlZERCLicpO1xuICAgICAgIH1cbiAgICAgfSkpO1xuXG4gIGl0KCdOdWxsLCB1bmRlZmluZWQgb3IgZW1wdHkgbW9kZWxQYXRoIHRocm93cyBFcnJvcicsICgpID0+IHtcbiAgICBleHBlY3QoKCkgPT4gYnJvd3NlckluZGV4ZWREQihudWxsKSlcbiAgICAgICAgLnRvVGhyb3dFcnJvcihcbiAgICAgICAgICAgIC9JbmRleGVkREIsIG1vZGVsUGF0aCBtdXN0IG5vdCBiZSBudWxsLCB1bmRlZmluZWQgb3IgZW1wdHkvKTtcbiAgICBleHBlY3QoKCkgPT4gYnJvd3NlckluZGV4ZWREQih1bmRlZmluZWQpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKFxuICAgICAgICAgICAgL0luZGV4ZWREQiwgbW9kZWxQYXRoIG11c3Qgbm90IGJlIG51bGwsIHVuZGVmaW5lZCBvciBlbXB0eS8pO1xuICAgIGV4cGVjdCgoKSA9PiBicm93c2VySW5kZXhlZERCKCcnKSlcbiAgICAgICAgLnRvVGhyb3dFcnJvcihcbiAgICAgICAgICAgIC9JbmRleGVkREIsIG1vZGVsUGF0aCBtdXN0IG5vdCBiZSBudWxsLCB1bmRlZmluZWQgb3IgZW1wdHkuLyk7XG4gIH0pO1xuXG4gIGl0KCdyb3V0ZXInLCAoKSA9PiB7XG4gICAgZXhwZWN0KGluZGV4ZWREQlJvdXRlcignaW5kZXhlZGRiOi8vYmFyJykgaW5zdGFuY2VvZiBCcm93c2VySW5kZXhlZERCKVxuICAgICAgICAudG9FcXVhbCh0cnVlKTtcbiAgICBleHBlY3QoaW5kZXhlZERCUm91dGVyKCdsb2NhbHN0b3JhZ2U6Ly9iYXInKSkudG9CZU51bGwoKTtcbiAgICBleHBlY3QoaW5kZXhlZERCUm91dGVyKCdxdXgnKSkudG9CZU51bGwoKTtcbiAgfSk7XG5cbiAgaXQoJ01hbmFnZXI6IExpc3QgbW9kZWxzOiAwIHJlc3VsdCcsIHJ1bldpdGhMb2NrKGFzeW5jICgpID0+IHtcbiAgICAgICAvLyBCZWZvcmUgYW55IG1vZGVsIGlzIHNhdmVkLCBsaXN0TW9kZWxzIHNob3VsZCByZXR1cm4gZW1wdHkgcmVzdWx0LlxuICAgICAgIGNvbnN0IG1vZGVscyA9IGF3YWl0IG5ldyBCcm93c2VySW5kZXhlZERCTWFuYWdlcigpLmxpc3RNb2RlbHMoKTtcbiAgICAgICBleHBlY3QobW9kZWxzKS50b0VxdWFsKHt9KTtcbiAgICAgfSkpO1xuXG4gIGl0KCdNYW5hZ2VyOiBMaXN0IG1vZGVsczogMSByZXN1bHQnLCBydW5XaXRoTG9jayhhc3luYyAoKSA9PiB7XG4gICAgICAgY29uc3QgaGFuZGxlciA9IHRmLmlvLmdldFNhdmVIYW5kbGVycygnaW5kZXhlZGRiOi8vYmF6L1F1eE1vZGVsJylbMF07XG4gICAgICAgY29uc3Qgc2F2ZVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIuc2F2ZShhcnRpZmFjdHMxKTtcblxuICAgICAgIC8vIEFmdGVyIHN1Y2Nlc3NmdWwgc2F2aW5nLCB0aGVyZSBzaG91bGQgYmUgb25lIG1vZGVsLlxuICAgICAgIGNvbnN0IG1vZGVscyA9IGF3YWl0IG5ldyBCcm93c2VySW5kZXhlZERCTWFuYWdlcigpLmxpc3RNb2RlbHMoKTtcbiAgICAgICBleHBlY3QoT2JqZWN0LmtleXMobW9kZWxzKS5sZW5ndGgpLnRvRXF1YWwoMSk7XG4gICAgICAgZXhwZWN0KG1vZGVsc1snYmF6L1F1eE1vZGVsJ10ubW9kZWxUb3BvbG9neVR5cGUpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lUeXBlKTtcbiAgICAgICBleHBlY3QobW9kZWxzWydiYXovUXV4TW9kZWwnXS5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lCeXRlcyk7XG4gICAgICAgZXhwZWN0KG1vZGVsc1snYmF6L1F1eE1vZGVsJ10ud2VpZ2h0U3BlY3NCeXRlcylcbiAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0U3BlY3NCeXRlcyk7XG4gICAgICAgZXhwZWN0KG1vZGVsc1snYmF6L1F1eE1vZGVsJ10ud2VpZ2h0RGF0YUJ5dGVzKVxuICAgICAgICAgICAudG9FcXVhbChzYXZlUmVzdWx0Lm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpO1xuICAgICB9KSk7XG5cbiAgaXQoJ01hbmFnZXI6IExpc3QgbW9kZWxzOiAyIHJlc3VsdHMnLCBydW5XaXRoTG9jayhhc3luYyAoKSA9PiB7XG4gICAgICAgLy8gRmlyc3QsIHNhdmUgYSBtb2RlbC5cbiAgICAgICBjb25zdCBoYW5kbGVyMSA9IHRmLmlvLmdldFNhdmVIYW5kbGVycygnaW5kZXhlZGRiOi8vUXV4TW9kZWwnKVswXTtcbiAgICAgICBjb25zdCBzYXZlUmVzdWx0MSA9IGF3YWl0IGhhbmRsZXIxLnNhdmUoYXJ0aWZhY3RzMSk7XG5cbiAgICAgICAvLyBUaGVuLCBzYXZlIHRoZSBtb2RlbCB1bmRlciBhbm90aGVyIHBhdGguXG4gICAgICAgY29uc3QgaGFuZGxlcjIgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnMoJ2luZGV4ZWRkYjovL3JlcGVhdC9RdXhNb2RlbCcpWzBdO1xuICAgICAgIGNvbnN0IHNhdmVSZXN1bHQyID0gYXdhaXQgaGFuZGxlcjIuc2F2ZShhcnRpZmFjdHMxKTtcblxuICAgICAgIC8vIEFmdGVyIHN1Y2Nlc3NmdWwgc2F2aW5nLCB0aGVyZSBzaG91bGQgYmUgdHdvIG1vZGVscy5cbiAgICAgICBjb25zdCBtb2RlbHMgPSBhd2FpdCBuZXcgQnJvd3NlckluZGV4ZWREQk1hbmFnZXIoKS5saXN0TW9kZWxzKCk7XG4gICAgICAgZXhwZWN0KE9iamVjdC5rZXlzKG1vZGVscykubGVuZ3RoKS50b0VxdWFsKDIpO1xuICAgICAgIGV4cGVjdChtb2RlbHNbJ1F1eE1vZGVsJ10ubW9kZWxUb3BvbG9neVR5cGUpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQxLm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5VHlwZSk7XG4gICAgICAgZXhwZWN0KG1vZGVsc1snUXV4TW9kZWwnXS5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQxLm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5Qnl0ZXMpO1xuICAgICAgIGV4cGVjdChtb2RlbHNbJ1F1eE1vZGVsJ10ud2VpZ2h0U3BlY3NCeXRlcylcbiAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdDEubW9kZWxBcnRpZmFjdHNJbmZvLndlaWdodFNwZWNzQnl0ZXMpO1xuICAgICAgIGV4cGVjdChtb2RlbHNbJ1F1eE1vZGVsJ10ud2VpZ2h0RGF0YUJ5dGVzKVxuICAgICAgICAgICAudG9FcXVhbChzYXZlUmVzdWx0MS5tb2RlbEFydGlmYWN0c0luZm8ud2VpZ2h0RGF0YUJ5dGVzKTtcbiAgICAgICBleHBlY3QobW9kZWxzWydyZXBlYXQvUXV4TW9kZWwnXS5tb2RlbFRvcG9sb2d5VHlwZSlcbiAgICAgICAgICAgLnRvRXF1YWwoc2F2ZVJlc3VsdDIubW9kZWxBcnRpZmFjdHNJbmZvLm1vZGVsVG9wb2xvZ3lUeXBlKTtcbiAgICAgICBleHBlY3QobW9kZWxzWydyZXBlYXQvUXV4TW9kZWwnXS5tb2RlbFRvcG9sb2d5Qnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby5tb2RlbFRvcG9sb2d5Qnl0ZXMpO1xuICAgICAgIGV4cGVjdChtb2RlbHNbJ3JlcGVhdC9RdXhNb2RlbCddLndlaWdodFNwZWNzQnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHRTcGVjc0J5dGVzKTtcbiAgICAgICBleHBlY3QobW9kZWxzWydyZXBlYXQvUXV4TW9kZWwnXS53ZWlnaHREYXRhQnl0ZXMpXG4gICAgICAgICAgIC50b0VxdWFsKHNhdmVSZXN1bHQyLm1vZGVsQXJ0aWZhY3RzSW5mby53ZWlnaHREYXRhQnl0ZXMpO1xuICAgICB9KSk7XG5cbiAgaXQoJ01hbmFnZXI6IFN1Y2Nlc3NmdWwgcmVtb3ZlTW9kZWwnLCBydW5XaXRoTG9jayhhc3luYyAoKSA9PiB7XG4gICAgICAgLy8gRmlyc3QsIHNhdmUgYSBtb2RlbC5cbiAgICAgICBjb25zdCBoYW5kbGVyMSA9IHRmLmlvLmdldFNhdmVIYW5kbGVycygnaW5kZXhlZGRiOi8vUXV4TW9kZWwnKVswXTtcbiAgICAgICBhd2FpdCBoYW5kbGVyMS5zYXZlKGFydGlmYWN0czEpO1xuXG4gICAgICAgLy8gVGhlbiwgc2F2ZSB0aGUgbW9kZWwgdW5kZXIgYW5vdGhlciBwYXRoLlxuICAgICAgIGNvbnN0IGhhbmRsZXIyID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKCdpbmRleGVkZGI6Ly9yZXBlYXQvUXV4TW9kZWwnKVswXTtcbiAgICAgICBhd2FpdCBoYW5kbGVyMi5zYXZlKGFydGlmYWN0czEpO1xuXG4gICAgICAgLy8gQWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZpbmcsIGRlbGV0ZSB0aGUgZmlyc3Qgc2F2ZSwgYW5kIHRoZW5cbiAgICAgICAvLyBgbGlzdE1vZGVsYCBzaG91bGQgZ2l2ZSBvbmx5IG9uZSByZXN1bHQuXG4gICAgICAgY29uc3QgbWFuYWdlciA9IG5ldyBCcm93c2VySW5kZXhlZERCTWFuYWdlcigpO1xuICAgICAgIGF3YWl0IG1hbmFnZXIucmVtb3ZlTW9kZWwoJ1F1eE1vZGVsJyk7XG5cbiAgICAgICBjb25zdCBtb2RlbHMgPSBhd2FpdCBtYW5hZ2VyLmxpc3RNb2RlbHMoKTtcbiAgICAgICBleHBlY3QoT2JqZWN0LmtleXMobW9kZWxzKSkudG9FcXVhbChbJ3JlcGVhdC9RdXhNb2RlbCddKTtcbiAgICAgfSkpO1xuXG4gIGl0KCdNYW5hZ2VyOiBTdWNjZXNzZnVsIHJlbW92ZU1vZGVsIHdpdGggVVJMIHNjaGVtZScsXG4gICAgIHJ1bldpdGhMb2NrKGFzeW5jICgpID0+IHtcbiAgICAgICAvLyBGaXJzdCwgc2F2ZSBhIG1vZGVsLlxuICAgICAgIGNvbnN0IGhhbmRsZXIxID0gdGYuaW8uZ2V0U2F2ZUhhbmRsZXJzKCdpbmRleGVkZGI6Ly9RdXhNb2RlbCcpWzBdO1xuICAgICAgIGF3YWl0IGhhbmRsZXIxLnNhdmUoYXJ0aWZhY3RzMSk7XG5cbiAgICAgICAvLyBUaGVuLCBzYXZlIHRoZSBtb2RlbCB1bmRlciBhbm90aGVyIHBhdGguXG4gICAgICAgY29uc3QgaGFuZGxlcjIgPSB0Zi5pby5nZXRTYXZlSGFuZGxlcnMoJ2luZGV4ZWRkYjovL3JlcGVhdC9RdXhNb2RlbCcpWzBdO1xuICAgICAgIGF3YWl0IGhhbmRsZXIyLnNhdmUoYXJ0aWZhY3RzMSk7XG5cbiAgICAgICAvLyBBZnRlciBzdWNjZXNzZnVsIHNhdmluZywgZGVsZXRlIHRoZSBmaXJzdCBzYXZlLCBhbmQgdGhlblxuICAgICAgIC8vIGBsaXN0TW9kZWxgIHNob3VsZCBnaXZlIG9ubHkgb25lIHJlc3VsdC5cbiAgICAgICBjb25zdCBtYW5hZ2VyID0gbmV3IEJyb3dzZXJJbmRleGVkREJNYW5hZ2VyKCk7XG5cbiAgICAgICAvLyBEZWxldGUgYSBtb2RlbCBzcGVjaWZpZWQgd2l0aCBhIHBhdGggdGhhdCBpbmNsdWRlcyB0aGVcbiAgICAgICAvLyBpbmRleGVkZGI6Ly8gc2NoZW1lIHByZWZpeCBzaG91bGQgd29yay5cbiAgICAgICBtYW5hZ2VyLnJlbW92ZU1vZGVsKCdpbmRleGVkZGI6Ly9RdXhNb2RlbCcpO1xuXG4gICAgICAgY29uc3QgbW9kZWxzID0gYXdhaXQgbWFuYWdlci5saXN0TW9kZWxzKCk7XG4gICAgICAgZXhwZWN0KE9iamVjdC5rZXlzKG1vZGVscykpLnRvRXF1YWwoWydyZXBlYXQvUXV4TW9kZWwnXSk7XG4gICAgIH0pKTtcblxuICBpdCgnTWFuYWdlcjogRmFpbGVkIHJlbW92ZU1vZGVsJywgcnVuV2l0aExvY2soYXN5bmMgKCkgPT4ge1xuICAgICAgIHRyeSB7XG4gICAgICAgICAvLyBBdHRlbXB0IHRvIGRlbGV0ZSBhIG5vbmV4aXN0ZW50IG1vZGVsIGlzIGV4cGVjdGVkIHRvIGZhaWwuXG4gICAgICAgICBhd2FpdCBuZXcgQnJvd3NlckluZGV4ZWREQk1hbmFnZXIoKS5yZW1vdmVNb2RlbCgnbm9uZXhpc3RlbnQnKTtcbiAgICAgICAgIGZhaWwoJ0RlbGV0aW5nIG5vbmV4aXN0ZW50IG1vZGVsIHN1Y2NlZWRlZCB1bmV4cGVjdGVkbHkuJyk7XG4gICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICBleHBlY3QoZXJyLm1lc3NhZ2UpXG4gICAgICAgICAgICAgLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgICdDYW5ub3QgZmluZCBtb2RlbCB3aXRoIHBhdGggXFwnbm9uZXhpc3RlbnRcXCcgaW4gSW5kZXhlZERCLicpO1xuICAgICAgIH1cbiAgICAgfSkpO1xufSk7XG4iXX0=