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
import '../flags';
import { env } from '../environment';
import { getModelArtifactsInfoForJSON } from './io_utils';
import { IORouterRegistry } from './router_registry';
import { CompositeArrayBuffer } from './composite_array_buffer';
const DATABASE_NAME = 'tensorflowjs';
const DATABASE_VERSION = 1;
// Model data and ModelArtifactsInfo (metadata) are stored in two separate
// stores for efficient access of the list of stored models and their metadata.
// 1. The object store for model data: topology, weights and weight manifests.
const MODEL_STORE_NAME = 'models_store';
// 2. The object store for ModelArtifactsInfo, including meta-information such
//    as the type of topology (JSON vs binary), byte size of the topology, byte
//    size of the weights, etc.
const INFO_STORE_NAME = 'model_info_store';
/**
 * Delete the entire database for tensorflow.js, including the models store.
 */
export async function deleteDatabase() {
    const idbFactory = getIndexedDBFactory();
    return new Promise((resolve, reject) => {
        const deleteRequest = idbFactory.deleteDatabase(DATABASE_NAME);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = error => reject(error);
    });
}
function getIndexedDBFactory() {
    if (!env().getBool('IS_BROWSER')) {
        // TODO(cais): Add more info about what IOHandler subtypes are available.
        //   Maybe point to a doc page on the web and/or automatically determine
        //   the available IOHandlers and print them in the error message.
        throw new Error('Failed to obtain IndexedDB factory because the current environment' +
            'is not a web browser.');
    }
    // tslint:disable-next-line:no-any
    const theWindow = typeof window === 'undefined' ? self : window;
    const factory = theWindow.indexedDB || theWindow.mozIndexedDB ||
        theWindow.webkitIndexedDB || theWindow.msIndexedDB ||
        theWindow.shimIndexedDB;
    if (factory == null) {
        throw new Error('The current browser does not appear to support IndexedDB.');
    }
    return factory;
}
function setUpDatabase(openRequest) {
    const db = openRequest.result;
    db.createObjectStore(MODEL_STORE_NAME, { keyPath: 'modelPath' });
    db.createObjectStore(INFO_STORE_NAME, { keyPath: 'modelPath' });
}
/**
 * IOHandler subclass: Browser IndexedDB.
 *
 * See the doc string of `browserIndexedDB` for more details.
 */
class BrowserIndexedDB {
    constructor(modelPath) {
        this.indexedDB = getIndexedDBFactory();
        if (modelPath == null || !modelPath) {
            throw new Error('For IndexedDB, modelPath must not be null, undefined or empty.');
        }
        this.modelPath = modelPath;
    }
    async save(modelArtifacts) {
        // TODO(cais): Support saving GraphDef models.
        if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
            throw new Error('BrowserLocalStorage.save() does not support saving model topology ' +
                'in binary formats yet.');
        }
        return this.databaseAction(this.modelPath, modelArtifacts);
    }
    async load() {
        return this.databaseAction(this.modelPath);
    }
    /**
     * Perform database action to put model artifacts into or read model artifacts
     * from IndexedDB object store.
     *
     * Whether the action is put or get depends on whether `modelArtifacts` is
     * specified. If it is specified, the action will be put; otherwise the action
     * will be get.
     *
     * @param modelPath A unique string path for the model.
     * @param modelArtifacts If specified, it will be the model artifacts to be
     *   stored in IndexedDB.
     * @returns A `Promise` of `SaveResult`, if the action is put, or a `Promise`
     *   of `ModelArtifacts`, if the action is get.
     */
    databaseAction(modelPath, modelArtifacts) {
        return new Promise((resolve, reject) => {
            const openRequest = this.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            openRequest.onupgradeneeded = () => setUpDatabase(openRequest);
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                if (modelArtifacts == null) {
                    // Read model out from object store.
                    const modelTx = db.transaction(MODEL_STORE_NAME, 'readonly');
                    const modelStore = modelTx.objectStore(MODEL_STORE_NAME);
                    const getRequest = modelStore.get(this.modelPath);
                    getRequest.onsuccess = () => {
                        if (getRequest.result == null) {
                            db.close();
                            return reject(new Error(`Cannot find model with path '${this.modelPath}' ` +
                                `in IndexedDB.`));
                        }
                        else {
                            resolve(getRequest.result.modelArtifacts);
                        }
                    };
                    getRequest.onerror = error => {
                        db.close();
                        return reject(getRequest.error);
                    };
                    modelTx.oncomplete = () => db.close();
                }
                else {
                    // Put model into object store.
                    // Concatenate all the model weights into a single ArrayBuffer. Large
                    // models (~1GB) have problems saving if they are not concatenated.
                    // TODO(mattSoulanille): Save large models to multiple indexeddb
                    // records.
                    modelArtifacts.weightData = CompositeArrayBuffer.join(modelArtifacts.weightData);
                    const modelArtifactsInfo = getModelArtifactsInfoForJSON(modelArtifacts);
                    // First, put ModelArtifactsInfo into info store.
                    const infoTx = db.transaction(INFO_STORE_NAME, 'readwrite');
                    let infoStore = infoTx.objectStore(INFO_STORE_NAME);
                    let putInfoRequest;
                    try {
                        putInfoRequest =
                            infoStore.put({ modelPath: this.modelPath, modelArtifactsInfo });
                    }
                    catch (error) {
                        return reject(error);
                    }
                    let modelTx;
                    putInfoRequest.onsuccess = () => {
                        // Second, put model data into model store.
                        modelTx = db.transaction(MODEL_STORE_NAME, 'readwrite');
                        const modelStore = modelTx.objectStore(MODEL_STORE_NAME);
                        let putModelRequest;
                        try {
                            putModelRequest = modelStore.put({
                                modelPath: this.modelPath,
                                modelArtifacts,
                                modelArtifactsInfo
                            });
                        }
                        catch (error) {
                            // Sometimes, the serialized value is too large to store.
                            return reject(error);
                        }
                        putModelRequest.onsuccess = () => resolve({ modelArtifactsInfo });
                        putModelRequest.onerror = error => {
                            // If the put-model request fails, roll back the info entry as
                            // well.
                            infoStore = infoTx.objectStore(INFO_STORE_NAME);
                            const deleteInfoRequest = infoStore.delete(this.modelPath);
                            deleteInfoRequest.onsuccess = () => {
                                db.close();
                                return reject(putModelRequest.error);
                            };
                            deleteInfoRequest.onerror = error => {
                                db.close();
                                return reject(putModelRequest.error);
                            };
                        };
                    };
                    putInfoRequest.onerror = error => {
                        db.close();
                        return reject(putInfoRequest.error);
                    };
                    infoTx.oncomplete = () => {
                        if (modelTx == null) {
                            db.close();
                        }
                        else {
                            modelTx.oncomplete = () => db.close();
                        }
                    };
                }
            };
            openRequest.onerror = error => reject(openRequest.error);
        });
    }
}
BrowserIndexedDB.URL_SCHEME = 'indexeddb://';
export { BrowserIndexedDB };
export const indexedDBRouter = (url) => {
    if (!env().getBool('IS_BROWSER')) {
        return null;
    }
    else {
        if (!Array.isArray(url) && url.startsWith(BrowserIndexedDB.URL_SCHEME)) {
            return browserIndexedDB(url.slice(BrowserIndexedDB.URL_SCHEME.length));
        }
        else {
            return null;
        }
    }
};
IORouterRegistry.registerSaveRouter(indexedDBRouter);
IORouterRegistry.registerLoadRouter(indexedDBRouter);
/**
 * Creates a browser IndexedDB IOHandler for saving and loading models.
 *
 * ```js
 * const model = tf.sequential();
 * model.add(
 *     tf.layers.dense({units: 1, inputShape: [100], activation: 'sigmoid'}));
 *
 * const saveResult = await model.save('indexeddb://MyModel'));
 * console.log(saveResult);
 * ```
 *
 * @param modelPath A unique identifier for the model to be saved. Must be a
 *   non-empty string.
 * @returns An instance of `BrowserIndexedDB` (subclass of `IOHandler`),
 *   which can be used with, e.g., `tf.Model.save`.
 */
export function browserIndexedDB(modelPath) {
    return new BrowserIndexedDB(modelPath);
}
function maybeStripScheme(key) {
    return key.startsWith(BrowserIndexedDB.URL_SCHEME) ?
        key.slice(BrowserIndexedDB.URL_SCHEME.length) :
        key;
}
export class BrowserIndexedDBManager {
    constructor() {
        this.indexedDB = getIndexedDBFactory();
    }
    async listModels() {
        return new Promise((resolve, reject) => {
            const openRequest = this.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            openRequest.onupgradeneeded = () => setUpDatabase(openRequest);
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                const tx = db.transaction(INFO_STORE_NAME, 'readonly');
                const store = tx.objectStore(INFO_STORE_NAME);
                // tslint:disable:max-line-length
                // Need to cast `store` as `any` here because TypeScript's DOM
                // library does not have the `getAll()` method even though the
                // method is supported in the latest version of most mainstream
                // browsers:
                // https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll
                // tslint:enable:max-line-length
                // tslint:disable-next-line:no-any
                const getAllInfoRequest = store.getAll();
                getAllInfoRequest.onsuccess = () => {
                    const out = {};
                    for (const item of getAllInfoRequest.result) {
                        out[item.modelPath] = item.modelArtifactsInfo;
                    }
                    resolve(out);
                };
                getAllInfoRequest.onerror = error => {
                    db.close();
                    return reject(getAllInfoRequest.error);
                };
                tx.oncomplete = () => db.close();
            };
            openRequest.onerror = error => reject(openRequest.error);
        });
    }
    async removeModel(path) {
        path = maybeStripScheme(path);
        return new Promise((resolve, reject) => {
            const openRequest = this.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            openRequest.onupgradeneeded = () => setUpDatabase(openRequest);
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                const infoTx = db.transaction(INFO_STORE_NAME, 'readwrite');
                const infoStore = infoTx.objectStore(INFO_STORE_NAME);
                const getInfoRequest = infoStore.get(path);
                let modelTx;
                getInfoRequest.onsuccess = () => {
                    if (getInfoRequest.result == null) {
                        db.close();
                        return reject(new Error(`Cannot find model with path '${path}' ` +
                            `in IndexedDB.`));
                    }
                    else {
                        // First, delete the entry in the info store.
                        const deleteInfoRequest = infoStore.delete(path);
                        const deleteModelData = () => {
                            // Second, delete the entry in the model store.
                            modelTx = db.transaction(MODEL_STORE_NAME, 'readwrite');
                            const modelStore = modelTx.objectStore(MODEL_STORE_NAME);
                            const deleteModelRequest = modelStore.delete(path);
                            deleteModelRequest.onsuccess = () => resolve(getInfoRequest.result.modelArtifactsInfo);
                            deleteModelRequest.onerror = error => reject(getInfoRequest.error);
                        };
                        // Proceed with deleting model data regardless of whether deletion
                        // of info data succeeds or not.
                        deleteInfoRequest.onsuccess = deleteModelData;
                        deleteInfoRequest.onerror = error => {
                            deleteModelData();
                            db.close();
                            return reject(getInfoRequest.error);
                        };
                    }
                };
                getInfoRequest.onerror = error => {
                    db.close();
                    return reject(getInfoRequest.error);
                };
                infoTx.oncomplete = () => {
                    if (modelTx == null) {
                        db.close();
                    }
                    else {
                        modelTx.oncomplete = () => db.close();
                    }
                };
            };
            openRequest.onerror = error => reject(openRequest.error);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZF9kYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvaW8vaW5kZXhlZF9kYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkMsT0FBTyxFQUFDLDRCQUE0QixFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ3hELE9BQU8sRUFBVyxnQkFBZ0IsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRTdELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTlELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQztBQUNyQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQztBQUUzQiwwRUFBMEU7QUFDMUUsK0VBQStFO0FBQy9FLDhFQUE4RTtBQUM5RSxNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQztBQUN4Qyw4RUFBOEU7QUFDOUUsK0VBQStFO0FBQy9FLCtCQUErQjtBQUMvQixNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQztBQUUzQzs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsY0FBYztJQUNsQyxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsRUFBRSxDQUFDO0lBRXpDLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDM0MsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMvRCxhQUFhLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUNoQyx5RUFBeUU7UUFDekUsd0VBQXdFO1FBQ3hFLGtFQUFrRTtRQUNsRSxNQUFNLElBQUksS0FBSyxDQUNYLG9FQUFvRTtZQUNwRSx1QkFBdUIsQ0FBQyxDQUFDO0tBQzlCO0lBQ0Qsa0NBQWtDO0lBQ2xDLE1BQU0sU0FBUyxHQUFRLE9BQU8sTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDckUsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsWUFBWTtRQUN6RCxTQUFTLENBQUMsZUFBZSxJQUFJLFNBQVMsQ0FBQyxXQUFXO1FBQ2xELFNBQVMsQ0FBQyxhQUFhLENBQUM7SUFDNUIsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQ1gsMkRBQTJELENBQUMsQ0FBQztLQUNsRTtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxXQUF1QjtJQUM1QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBcUIsQ0FBQztJQUM3QyxFQUFFLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsRUFBQyxPQUFPLEVBQUUsV0FBVyxFQUFDLENBQUMsQ0FBQztJQUMvRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLEVBQUMsT0FBTyxFQUFFLFdBQVcsRUFBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFhLGdCQUFnQjtJQU0zQixZQUFZLFNBQWlCO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztRQUV2QyxJQUFJLFNBQVMsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxnRUFBZ0UsQ0FBQyxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBOEI7UUFDdkMsOENBQThDO1FBQzlDLElBQUksY0FBYyxDQUFDLGFBQWEsWUFBWSxXQUFXLEVBQUU7WUFDdkQsTUFBTSxJQUFJLEtBQUssQ0FDWCxvRUFBb0U7Z0JBQ3BFLHdCQUF3QixDQUFDLENBQUM7U0FDL0I7UUFFRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQ2xDLENBQUM7SUFDMUIsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQTRCLENBQUM7SUFDeEUsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7O09BYUc7SUFDSyxjQUFjLENBQUMsU0FBaUIsRUFBRSxjQUErQjtRQUV2RSxPQUFPLElBQUksT0FBTyxDQUE0QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNoRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN6RSxXQUFXLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUUvRCxXQUFXLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRTtnQkFDM0IsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztnQkFFOUIsSUFBSSxjQUFjLElBQUksSUFBSSxFQUFFO29CQUMxQixvQ0FBb0M7b0JBQ3BDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQzdELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDekQsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ2xELFVBQVUsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFO3dCQUMxQixJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksSUFBSSxFQUFFOzRCQUM3QixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7NEJBQ1gsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQ25CLGdDQUFnQyxJQUFJLENBQUMsU0FBUyxJQUFJO2dDQUNsRCxlQUFlLENBQUMsQ0FBQyxDQUFDO3lCQUN2Qjs2QkFBTTs0QkFDTCxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQzt5QkFDM0M7b0JBQ0gsQ0FBQyxDQUFDO29CQUNGLFVBQVUsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUU7d0JBQzNCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDWCxPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xDLENBQUMsQ0FBQztvQkFDRixPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztpQkFDdkM7cUJBQU07b0JBQ0wsK0JBQStCO29CQUUvQixxRUFBcUU7b0JBQ3JFLG1FQUFtRTtvQkFDbkUsZ0VBQWdFO29CQUNoRSxXQUFXO29CQUNYLGNBQWMsQ0FBQyxVQUFVLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUNqRCxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQy9CLE1BQU0sa0JBQWtCLEdBQ3BCLDRCQUE0QixDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUNqRCxpREFBaUQ7b0JBQ2pELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUM1RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUNwRCxJQUFJLGNBQXVDLENBQUM7b0JBQzVDLElBQUk7d0JBQ0YsY0FBYzs0QkFDWixTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO3FCQUNsRTtvQkFBQyxPQUFPLEtBQUssRUFBRTt3QkFDZCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDdEI7b0JBQ0QsSUFBSSxPQUF1QixDQUFDO29CQUM1QixjQUFjLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRTt3QkFDOUIsMkNBQTJDO3dCQUMzQyxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQzt3QkFDeEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO3dCQUN6RCxJQUFJLGVBQXdDLENBQUM7d0JBQzdDLElBQUk7NEJBQ0YsZUFBZSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUM7Z0NBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQ0FDekIsY0FBYztnQ0FDZCxrQkFBa0I7NkJBQ25CLENBQUMsQ0FBQzt5QkFDSjt3QkFBQyxPQUFPLEtBQUssRUFBRTs0QkFDZCx5REFBeUQ7NEJBQ3pELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3lCQUN0Qjt3QkFDRCxlQUFlLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGtCQUFrQixFQUFDLENBQUMsQ0FBQzt3QkFDaEUsZUFBZSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRTs0QkFDaEMsOERBQThEOzRCQUM5RCxRQUFROzRCQUNSLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDOzRCQUNoRCxNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUMzRCxpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFO2dDQUNqQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQ1gsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUN2QyxDQUFDLENBQUM7NEJBQ0YsaUJBQWlCLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFO2dDQUNsQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQ1gsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUN2QyxDQUFDLENBQUM7d0JBQ0osQ0FBQyxDQUFDO29CQUNKLENBQUMsQ0FBQztvQkFDRixjQUFjLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFO3dCQUMvQixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ1gsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QyxDQUFDLENBQUM7b0JBQ0YsTUFBTSxDQUFDLFVBQVUsR0FBRyxHQUFHLEVBQUU7d0JBQ3ZCLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTs0QkFDbkIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO3lCQUNaOzZCQUFNOzRCQUNMLE9BQU8sQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO3lCQUN2QztvQkFDSCxDQUFDLENBQUM7aUJBQ0g7WUFDSCxDQUFDLENBQUM7WUFDRixXQUFXLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBM0llLDJCQUFVLEdBQUcsY0FBYyxDQUFDO1NBSmpDLGdCQUFnQjtBQWtKN0IsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFhLENBQUMsR0FBb0IsRUFBRSxFQUFFO0lBQ2hFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDaEMsT0FBTyxJQUFJLENBQUM7S0FDYjtTQUFNO1FBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN0RSxPQUFPLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDeEU7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtBQUNILENBQUMsQ0FBQztBQUNGLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3JELGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRXJEOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFNBQWlCO0lBQ2hELE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFXO0lBQ25DLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2hELEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDL0MsR0FBRyxDQUFDO0FBQ1YsQ0FBQztBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFHbEM7UUFDRSxJQUFJLENBQUMsU0FBUyxHQUFHLG1CQUFtQixFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVO1FBQ2QsT0FBTyxJQUFJLE9BQU8sQ0FDZCxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNsQixNQUFNLFdBQVcsR0FDYixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN6RCxXQUFXLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUUvRCxXQUFXLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRTtnQkFDM0IsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztnQkFDOUIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ3ZELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzlDLGlDQUFpQztnQkFDakMsOERBQThEO2dCQUM5RCw4REFBOEQ7Z0JBQzlELCtEQUErRDtnQkFDL0QsWUFBWTtnQkFDWix5RUFBeUU7Z0JBQ3pFLGdDQUFnQztnQkFDaEMsa0NBQWtDO2dCQUNsQyxNQUFNLGlCQUFpQixHQUFJLEtBQWEsQ0FBQyxNQUFNLEVBQWdCLENBQUM7Z0JBQ2hFLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUU7b0JBQ2pDLE1BQU0sR0FBRyxHQUF5QyxFQUFFLENBQUM7b0JBQ3JELEtBQUssTUFBTSxJQUFJLElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFO3dCQUMzQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztxQkFDL0M7b0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNmLENBQUMsQ0FBQztnQkFDRixpQkFBaUIsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUU7b0JBQ2xDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDWCxPQUFPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekMsQ0FBQyxDQUFDO2dCQUNGLEVBQUUsQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25DLENBQUMsQ0FBQztZQUNGLFdBQVcsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ1QsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBWTtRQUM1QixJQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLE9BQU8sQ0FBcUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDekQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDekUsV0FBVyxDQUFDLGVBQWUsR0FBRyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFL0QsV0FBVyxDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUU7Z0JBQzNCLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7Z0JBQzlCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUV0RCxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLE9BQXVCLENBQUM7Z0JBQzVCLGNBQWMsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFO29CQUM5QixJQUFJLGNBQWMsQ0FBQyxNQUFNLElBQUksSUFBSSxFQUFFO3dCQUNqQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ1gsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQ25CLGdDQUFnQyxJQUFJLElBQUk7NEJBQ3hDLGVBQWUsQ0FBQyxDQUFDLENBQUM7cUJBQ3ZCO3lCQUFNO3dCQUNMLDZDQUE2Qzt3QkFDN0MsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNqRCxNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7NEJBQzNCLCtDQUErQzs0QkFDL0MsT0FBTyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7NEJBQ3hELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs0QkFDekQsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNuRCxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQ2hDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7NEJBQ3RELGtCQUFrQixDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUNqQyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNuQyxDQUFDLENBQUM7d0JBQ0Ysa0VBQWtFO3dCQUNsRSxnQ0FBZ0M7d0JBQ2hDLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUM7d0JBQzlDLGlCQUFpQixDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRTs0QkFDbEMsZUFBZSxFQUFFLENBQUM7NEJBQ2xCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDWCxPQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ3RDLENBQUMsQ0FBQztxQkFDSDtnQkFDSCxDQUFDLENBQUM7Z0JBQ0YsY0FBYyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRTtvQkFDL0IsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNYLE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDO2dCQUVGLE1BQU0sQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFO29CQUN2QixJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7d0JBQ25CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztxQkFDWjt5QkFBTTt3QkFDTCxPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztxQkFDdkM7Z0JBQ0gsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDO1lBQ0YsV0FBVyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCAnLi4vZmxhZ3MnO1xuXG5pbXBvcnQge2Vudn0gZnJvbSAnLi4vZW52aXJvbm1lbnQnO1xuXG5pbXBvcnQge2dldE1vZGVsQXJ0aWZhY3RzSW5mb0ZvckpTT059IGZyb20gJy4vaW9fdXRpbHMnO1xuaW1wb3J0IHtJT1JvdXRlciwgSU9Sb3V0ZXJSZWdpc3RyeX0gZnJvbSAnLi9yb3V0ZXJfcmVnaXN0cnknO1xuaW1wb3J0IHtJT0hhbmRsZXIsIE1vZGVsQXJ0aWZhY3RzLCBNb2RlbEFydGlmYWN0c0luZm8sIE1vZGVsU3RvcmVNYW5hZ2VyLCBTYXZlUmVzdWx0fSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Q29tcG9zaXRlQXJyYXlCdWZmZXJ9IGZyb20gJy4vY29tcG9zaXRlX2FycmF5X2J1ZmZlcic7XG5cbmNvbnN0IERBVEFCQVNFX05BTUUgPSAndGVuc29yZmxvd2pzJztcbmNvbnN0IERBVEFCQVNFX1ZFUlNJT04gPSAxO1xuXG4vLyBNb2RlbCBkYXRhIGFuZCBNb2RlbEFydGlmYWN0c0luZm8gKG1ldGFkYXRhKSBhcmUgc3RvcmVkIGluIHR3byBzZXBhcmF0ZVxuLy8gc3RvcmVzIGZvciBlZmZpY2llbnQgYWNjZXNzIG9mIHRoZSBsaXN0IG9mIHN0b3JlZCBtb2RlbHMgYW5kIHRoZWlyIG1ldGFkYXRhLlxuLy8gMS4gVGhlIG9iamVjdCBzdG9yZSBmb3IgbW9kZWwgZGF0YTogdG9wb2xvZ3ksIHdlaWdodHMgYW5kIHdlaWdodCBtYW5pZmVzdHMuXG5jb25zdCBNT0RFTF9TVE9SRV9OQU1FID0gJ21vZGVsc19zdG9yZSc7XG4vLyAyLiBUaGUgb2JqZWN0IHN0b3JlIGZvciBNb2RlbEFydGlmYWN0c0luZm8sIGluY2x1ZGluZyBtZXRhLWluZm9ybWF0aW9uIHN1Y2hcbi8vICAgIGFzIHRoZSB0eXBlIG9mIHRvcG9sb2d5IChKU09OIHZzIGJpbmFyeSksIGJ5dGUgc2l6ZSBvZiB0aGUgdG9wb2xvZ3ksIGJ5dGVcbi8vICAgIHNpemUgb2YgdGhlIHdlaWdodHMsIGV0Yy5cbmNvbnN0IElORk9fU1RPUkVfTkFNRSA9ICdtb2RlbF9pbmZvX3N0b3JlJztcblxuLyoqXG4gKiBEZWxldGUgdGhlIGVudGlyZSBkYXRhYmFzZSBmb3IgdGVuc29yZmxvdy5qcywgaW5jbHVkaW5nIHRoZSBtb2RlbHMgc3RvcmUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVEYXRhYmFzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgaWRiRmFjdG9yeSA9IGdldEluZGV4ZWREQkZhY3RvcnkoKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGRlbGV0ZVJlcXVlc3QgPSBpZGJGYWN0b3J5LmRlbGV0ZURhdGFiYXNlKERBVEFCQVNFX05BTUUpO1xuICAgIGRlbGV0ZVJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4gcmVzb2x2ZSgpO1xuICAgIGRlbGV0ZVJlcXVlc3Qub25lcnJvciA9IGVycm9yID0+IHJlamVjdChlcnJvcik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRJbmRleGVkREJGYWN0b3J5KCk6IElEQkZhY3Rvcnkge1xuICBpZiAoIWVudigpLmdldEJvb2woJ0lTX0JST1dTRVInKSkge1xuICAgIC8vIFRPRE8oY2Fpcyk6IEFkZCBtb3JlIGluZm8gYWJvdXQgd2hhdCBJT0hhbmRsZXIgc3VidHlwZXMgYXJlIGF2YWlsYWJsZS5cbiAgICAvLyAgIE1heWJlIHBvaW50IHRvIGEgZG9jIHBhZ2Ugb24gdGhlIHdlYiBhbmQvb3IgYXV0b21hdGljYWxseSBkZXRlcm1pbmVcbiAgICAvLyAgIHRoZSBhdmFpbGFibGUgSU9IYW5kbGVycyBhbmQgcHJpbnQgdGhlbSBpbiB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdGYWlsZWQgdG8gb2J0YWluIEluZGV4ZWREQiBmYWN0b3J5IGJlY2F1c2UgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQnICtcbiAgICAgICAgJ2lzIG5vdCBhIHdlYiBicm93c2VyLicpO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgY29uc3QgdGhlV2luZG93OiBhbnkgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB3aW5kb3c7XG4gIGNvbnN0IGZhY3RvcnkgPSB0aGVXaW5kb3cuaW5kZXhlZERCIHx8IHRoZVdpbmRvdy5tb3pJbmRleGVkREIgfHxcbiAgICAgIHRoZVdpbmRvdy53ZWJraXRJbmRleGVkREIgfHwgdGhlV2luZG93Lm1zSW5kZXhlZERCIHx8XG4gICAgICB0aGVXaW5kb3cuc2hpbUluZGV4ZWREQjtcbiAgaWYgKGZhY3RvcnkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBjdXJyZW50IGJyb3dzZXIgZG9lcyBub3QgYXBwZWFyIHRvIHN1cHBvcnQgSW5kZXhlZERCLicpO1xuICB9XG4gIHJldHVybiBmYWN0b3J5O1xufVxuXG5mdW5jdGlvbiBzZXRVcERhdGFiYXNlKG9wZW5SZXF1ZXN0OiBJREJSZXF1ZXN0KSB7XG4gIGNvbnN0IGRiID0gb3BlblJlcXVlc3QucmVzdWx0IGFzIElEQkRhdGFiYXNlO1xuICBkYi5jcmVhdGVPYmplY3RTdG9yZShNT0RFTF9TVE9SRV9OQU1FLCB7a2V5UGF0aDogJ21vZGVsUGF0aCd9KTtcbiAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoSU5GT19TVE9SRV9OQU1FLCB7a2V5UGF0aDogJ21vZGVsUGF0aCd9KTtcbn1cblxuLyoqXG4gKiBJT0hhbmRsZXIgc3ViY2xhc3M6IEJyb3dzZXIgSW5kZXhlZERCLlxuICpcbiAqIFNlZSB0aGUgZG9jIHN0cmluZyBvZiBgYnJvd3NlckluZGV4ZWREQmAgZm9yIG1vcmUgZGV0YWlscy5cbiAqL1xuZXhwb3J0IGNsYXNzIEJyb3dzZXJJbmRleGVkREIgaW1wbGVtZW50cyBJT0hhbmRsZXIge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgaW5kZXhlZERCOiBJREJGYWN0b3J5O1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbW9kZWxQYXRoOiBzdHJpbmc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFVSTF9TQ0hFTUUgPSAnaW5kZXhlZGRiOi8vJztcblxuICBjb25zdHJ1Y3Rvcihtb2RlbFBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuaW5kZXhlZERCID0gZ2V0SW5kZXhlZERCRmFjdG9yeSgpO1xuXG4gICAgaWYgKG1vZGVsUGF0aCA9PSBudWxsIHx8ICFtb2RlbFBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnRm9yIEluZGV4ZWREQiwgbW9kZWxQYXRoIG11c3Qgbm90IGJlIG51bGwsIHVuZGVmaW5lZCBvciBlbXB0eS4nKTtcbiAgICB9XG4gICAgdGhpcy5tb2RlbFBhdGggPSBtb2RlbFBhdGg7XG4gIH1cblxuICBhc3luYyBzYXZlKG1vZGVsQXJ0aWZhY3RzOiBNb2RlbEFydGlmYWN0cyk6IFByb21pc2U8U2F2ZVJlc3VsdD4ge1xuICAgIC8vIFRPRE8oY2Fpcyk6IFN1cHBvcnQgc2F2aW5nIEdyYXBoRGVmIG1vZGVscy5cbiAgICBpZiAobW9kZWxBcnRpZmFjdHMubW9kZWxUb3BvbG9neSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0Jyb3dzZXJMb2NhbFN0b3JhZ2Uuc2F2ZSgpIGRvZXMgbm90IHN1cHBvcnQgc2F2aW5nIG1vZGVsIHRvcG9sb2d5ICcgK1xuICAgICAgICAgICdpbiBiaW5hcnkgZm9ybWF0cyB5ZXQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGF0YWJhc2VBY3Rpb24odGhpcy5tb2RlbFBhdGgsIG1vZGVsQXJ0aWZhY3RzKSBhc1xuICAgICAgICBQcm9taXNlPFNhdmVSZXN1bHQ+O1xuICB9XG5cbiAgYXN5bmMgbG9hZCgpOiBQcm9taXNlPE1vZGVsQXJ0aWZhY3RzPiB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YWJhc2VBY3Rpb24odGhpcy5tb2RlbFBhdGgpIGFzIFByb21pc2U8TW9kZWxBcnRpZmFjdHM+O1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gZGF0YWJhc2UgYWN0aW9uIHRvIHB1dCBtb2RlbCBhcnRpZmFjdHMgaW50byBvciByZWFkIG1vZGVsIGFydGlmYWN0c1xuICAgKiBmcm9tIEluZGV4ZWREQiBvYmplY3Qgc3RvcmUuXG4gICAqXG4gICAqIFdoZXRoZXIgdGhlIGFjdGlvbiBpcyBwdXQgb3IgZ2V0IGRlcGVuZHMgb24gd2hldGhlciBgbW9kZWxBcnRpZmFjdHNgIGlzXG4gICAqIHNwZWNpZmllZC4gSWYgaXQgaXMgc3BlY2lmaWVkLCB0aGUgYWN0aW9uIHdpbGwgYmUgcHV0OyBvdGhlcndpc2UgdGhlIGFjdGlvblxuICAgKiB3aWxsIGJlIGdldC5cbiAgICpcbiAgICogQHBhcmFtIG1vZGVsUGF0aCBBIHVuaXF1ZSBzdHJpbmcgcGF0aCBmb3IgdGhlIG1vZGVsLlxuICAgKiBAcGFyYW0gbW9kZWxBcnRpZmFjdHMgSWYgc3BlY2lmaWVkLCBpdCB3aWxsIGJlIHRoZSBtb2RlbCBhcnRpZmFjdHMgdG8gYmVcbiAgICogICBzdG9yZWQgaW4gSW5kZXhlZERCLlxuICAgKiBAcmV0dXJucyBBIGBQcm9taXNlYCBvZiBgU2F2ZVJlc3VsdGAsIGlmIHRoZSBhY3Rpb24gaXMgcHV0LCBvciBhIGBQcm9taXNlYFxuICAgKiAgIG9mIGBNb2RlbEFydGlmYWN0c2AsIGlmIHRoZSBhY3Rpb24gaXMgZ2V0LlxuICAgKi9cbiAgcHJpdmF0ZSBkYXRhYmFzZUFjdGlvbihtb2RlbFBhdGg6IHN0cmluZywgbW9kZWxBcnRpZmFjdHM/OiBNb2RlbEFydGlmYWN0cyk6XG4gICAgICBQcm9taXNlPE1vZGVsQXJ0aWZhY3RzfFNhdmVSZXN1bHQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8TW9kZWxBcnRpZmFjdHN8U2F2ZVJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgb3BlblJlcXVlc3QgPSB0aGlzLmluZGV4ZWREQi5vcGVuKERBVEFCQVNFX05BTUUsIERBVEFCQVNFX1ZFUlNJT04pO1xuICAgICAgb3BlblJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gKCkgPT4gc2V0VXBEYXRhYmFzZShvcGVuUmVxdWVzdCk7XG5cbiAgICAgIG9wZW5SZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgZGIgPSBvcGVuUmVxdWVzdC5yZXN1bHQ7XG5cbiAgICAgICAgaWYgKG1vZGVsQXJ0aWZhY3RzID09IG51bGwpIHtcbiAgICAgICAgICAvLyBSZWFkIG1vZGVsIG91dCBmcm9tIG9iamVjdCBzdG9yZS5cbiAgICAgICAgICBjb25zdCBtb2RlbFR4ID0gZGIudHJhbnNhY3Rpb24oTU9ERUxfU1RPUkVfTkFNRSwgJ3JlYWRvbmx5Jyk7XG4gICAgICAgICAgY29uc3QgbW9kZWxTdG9yZSA9IG1vZGVsVHgub2JqZWN0U3RvcmUoTU9ERUxfU1RPUkVfTkFNRSk7XG4gICAgICAgICAgY29uc3QgZ2V0UmVxdWVzdCA9IG1vZGVsU3RvcmUuZ2V0KHRoaXMubW9kZWxQYXRoKTtcbiAgICAgICAgICBnZXRSZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZXRSZXF1ZXN0LnJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgYENhbm5vdCBmaW5kIG1vZGVsIHdpdGggcGF0aCAnJHt0aGlzLm1vZGVsUGF0aH0nIGAgK1xuICAgICAgICAgICAgICAgICAgYGluIEluZGV4ZWREQi5gKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXNvbHZlKGdldFJlcXVlc3QucmVzdWx0Lm1vZGVsQXJ0aWZhY3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIGdldFJlcXVlc3Qub25lcnJvciA9IGVycm9yID0+IHtcbiAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGdldFJlcXVlc3QuZXJyb3IpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgbW9kZWxUeC5vbmNvbXBsZXRlID0gKCkgPT4gZGIuY2xvc2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBQdXQgbW9kZWwgaW50byBvYmplY3Qgc3RvcmUuXG5cbiAgICAgICAgICAvLyBDb25jYXRlbmF0ZSBhbGwgdGhlIG1vZGVsIHdlaWdodHMgaW50byBhIHNpbmdsZSBBcnJheUJ1ZmZlci4gTGFyZ2VcbiAgICAgICAgICAvLyBtb2RlbHMgKH4xR0IpIGhhdmUgcHJvYmxlbXMgc2F2aW5nIGlmIHRoZXkgYXJlIG5vdCBjb25jYXRlbmF0ZWQuXG4gICAgICAgICAgLy8gVE9ETyhtYXR0U291bGFuaWxsZSk6IFNhdmUgbGFyZ2UgbW9kZWxzIHRvIG11bHRpcGxlIGluZGV4ZWRkYlxuICAgICAgICAgIC8vIHJlY29yZHMuXG4gICAgICAgICAgbW9kZWxBcnRpZmFjdHMud2VpZ2h0RGF0YSA9IENvbXBvc2l0ZUFycmF5QnVmZmVyLmpvaW4oXG4gICAgICAgICAgICAgIG1vZGVsQXJ0aWZhY3RzLndlaWdodERhdGEpO1xuICAgICAgICAgIGNvbnN0IG1vZGVsQXJ0aWZhY3RzSW5mbzogTW9kZWxBcnRpZmFjdHNJbmZvID1cbiAgICAgICAgICAgICAgZ2V0TW9kZWxBcnRpZmFjdHNJbmZvRm9ySlNPTihtb2RlbEFydGlmYWN0cyk7XG4gICAgICAgICAgLy8gRmlyc3QsIHB1dCBNb2RlbEFydGlmYWN0c0luZm8gaW50byBpbmZvIHN0b3JlLlxuICAgICAgICAgIGNvbnN0IGluZm9UeCA9IGRiLnRyYW5zYWN0aW9uKElORk9fU1RPUkVfTkFNRSwgJ3JlYWR3cml0ZScpO1xuICAgICAgICAgIGxldCBpbmZvU3RvcmUgPSBpbmZvVHgub2JqZWN0U3RvcmUoSU5GT19TVE9SRV9OQU1FKTtcbiAgICAgICAgICBsZXQgcHV0SW5mb1JlcXVlc3Q6IElEQlJlcXVlc3Q8SURCVmFsaWRLZXk+O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwdXRJbmZvUmVxdWVzdCA9XG4gICAgICAgICAgICAgIGluZm9TdG9yZS5wdXQoe21vZGVsUGF0aDogdGhpcy5tb2RlbFBhdGgsIG1vZGVsQXJ0aWZhY3RzSW5mb30pO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGV0IG1vZGVsVHg6IElEQlRyYW5zYWN0aW9uO1xuICAgICAgICAgIHB1dEluZm9SZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgIC8vIFNlY29uZCwgcHV0IG1vZGVsIGRhdGEgaW50byBtb2RlbCBzdG9yZS5cbiAgICAgICAgICAgIG1vZGVsVHggPSBkYi50cmFuc2FjdGlvbihNT0RFTF9TVE9SRV9OQU1FLCAncmVhZHdyaXRlJyk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbFN0b3JlID0gbW9kZWxUeC5vYmplY3RTdG9yZShNT0RFTF9TVE9SRV9OQU1FKTtcbiAgICAgICAgICAgIGxldCBwdXRNb2RlbFJlcXVlc3Q6IElEQlJlcXVlc3Q8SURCVmFsaWRLZXk+O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgcHV0TW9kZWxSZXF1ZXN0ID0gbW9kZWxTdG9yZS5wdXQoe1xuICAgICAgICAgICAgICAgIG1vZGVsUGF0aDogdGhpcy5tb2RlbFBhdGgsXG4gICAgICAgICAgICAgICAgbW9kZWxBcnRpZmFjdHMsXG4gICAgICAgICAgICAgICAgbW9kZWxBcnRpZmFjdHNJbmZvXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgLy8gU29tZXRpbWVzLCB0aGUgc2VyaWFsaXplZCB2YWx1ZSBpcyB0b28gbGFyZ2UgdG8gc3RvcmUuXG4gICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHV0TW9kZWxSZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUoe21vZGVsQXJ0aWZhY3RzSW5mb30pO1xuICAgICAgICAgICAgcHV0TW9kZWxSZXF1ZXN0Lm9uZXJyb3IgPSBlcnJvciA9PiB7XG4gICAgICAgICAgICAgIC8vIElmIHRoZSBwdXQtbW9kZWwgcmVxdWVzdCBmYWlscywgcm9sbCBiYWNrIHRoZSBpbmZvIGVudHJ5IGFzXG4gICAgICAgICAgICAgIC8vIHdlbGwuXG4gICAgICAgICAgICAgIGluZm9TdG9yZSA9IGluZm9UeC5vYmplY3RTdG9yZShJTkZPX1NUT1JFX05BTUUpO1xuICAgICAgICAgICAgICBjb25zdCBkZWxldGVJbmZvUmVxdWVzdCA9IGluZm9TdG9yZS5kZWxldGUodGhpcy5tb2RlbFBhdGgpO1xuICAgICAgICAgICAgICBkZWxldGVJbmZvUmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgZGIuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHB1dE1vZGVsUmVxdWVzdC5lcnJvcik7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGRlbGV0ZUluZm9SZXF1ZXN0Lm9uZXJyb3IgPSBlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgZGIuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHB1dE1vZGVsUmVxdWVzdC5lcnJvcik7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH07XG4gICAgICAgICAgcHV0SW5mb1JlcXVlc3Qub25lcnJvciA9IGVycm9yID0+IHtcbiAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KHB1dEluZm9SZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGluZm9UeC5vbmNvbXBsZXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG1vZGVsVHggPT0gbnVsbCkge1xuICAgICAgICAgICAgICBkYi5jbG9zZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbW9kZWxUeC5vbmNvbXBsZXRlID0gKCkgPT4gZGIuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgb3BlblJlcXVlc3Qub25lcnJvciA9IGVycm9yID0+IHJlamVjdChvcGVuUmVxdWVzdC5lcnJvcik7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGluZGV4ZWREQlJvdXRlcjogSU9Sb3V0ZXIgPSAodXJsOiBzdHJpbmd8c3RyaW5nW10pID0+IHtcbiAgaWYgKCFlbnYoKS5nZXRCb29sKCdJU19CUk9XU0VSJykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodXJsKSAmJiB1cmwuc3RhcnRzV2l0aChCcm93c2VySW5kZXhlZERCLlVSTF9TQ0hFTUUpKSB7XG4gICAgICByZXR1cm4gYnJvd3NlckluZGV4ZWREQih1cmwuc2xpY2UoQnJvd3NlckluZGV4ZWREQi5VUkxfU0NIRU1FLmxlbmd0aCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn07XG5JT1JvdXRlclJlZ2lzdHJ5LnJlZ2lzdGVyU2F2ZVJvdXRlcihpbmRleGVkREJSb3V0ZXIpO1xuSU9Sb3V0ZXJSZWdpc3RyeS5yZWdpc3RlckxvYWRSb3V0ZXIoaW5kZXhlZERCUm91dGVyKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYnJvd3NlciBJbmRleGVkREIgSU9IYW5kbGVyIGZvciBzYXZpbmcgYW5kIGxvYWRpbmcgbW9kZWxzLlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoKTtcbiAqIG1vZGVsLmFkZChcbiAqICAgICB0Zi5sYXllcnMuZGVuc2Uoe3VuaXRzOiAxLCBpbnB1dFNoYXBlOiBbMTAwXSwgYWN0aXZhdGlvbjogJ3NpZ21vaWQnfSkpO1xuICpcbiAqIGNvbnN0IHNhdmVSZXN1bHQgPSBhd2FpdCBtb2RlbC5zYXZlKCdpbmRleGVkZGI6Ly9NeU1vZGVsJykpO1xuICogY29uc29sZS5sb2coc2F2ZVJlc3VsdCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbW9kZWxQYXRoIEEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBtb2RlbCB0byBiZSBzYXZlZC4gTXVzdCBiZSBhXG4gKiAgIG5vbi1lbXB0eSBzdHJpbmcuXG4gKiBAcmV0dXJucyBBbiBpbnN0YW5jZSBvZiBgQnJvd3NlckluZGV4ZWREQmAgKHN1YmNsYXNzIG9mIGBJT0hhbmRsZXJgKSxcbiAqICAgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCwgZS5nLiwgYHRmLk1vZGVsLnNhdmVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnJvd3NlckluZGV4ZWREQihtb2RlbFBhdGg6IHN0cmluZyk6IElPSGFuZGxlciB7XG4gIHJldHVybiBuZXcgQnJvd3NlckluZGV4ZWREQihtb2RlbFBhdGgpO1xufVxuXG5mdW5jdGlvbiBtYXliZVN0cmlwU2NoZW1lKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBrZXkuc3RhcnRzV2l0aChCcm93c2VySW5kZXhlZERCLlVSTF9TQ0hFTUUpID9cbiAgICAgIGtleS5zbGljZShCcm93c2VySW5kZXhlZERCLlVSTF9TQ0hFTUUubGVuZ3RoKSA6XG4gICAgICBrZXk7XG59XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VySW5kZXhlZERCTWFuYWdlciBpbXBsZW1lbnRzIE1vZGVsU3RvcmVNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBpbmRleGVkREI6IElEQkZhY3Rvcnk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pbmRleGVkREIgPSBnZXRJbmRleGVkREJGYWN0b3J5KCk7XG4gIH1cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8e1twYXRoOiBzdHJpbmddOiBNb2RlbEFydGlmYWN0c0luZm99PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHtbcGF0aDogc3RyaW5nXTogTW9kZWxBcnRpZmFjdHNJbmZvfT4oXG4gICAgICAgIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICBjb25zdCBvcGVuUmVxdWVzdCA9XG4gICAgICAgICAgICAgIHRoaXMuaW5kZXhlZERCLm9wZW4oREFUQUJBU0VfTkFNRSwgREFUQUJBU0VfVkVSU0lPTik7XG4gICAgICAgICAgb3BlblJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gKCkgPT4gc2V0VXBEYXRhYmFzZShvcGVuUmVxdWVzdCk7XG5cbiAgICAgICAgICBvcGVuUmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYiA9IG9wZW5SZXF1ZXN0LnJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oSU5GT19TVE9SRV9OQU1FLCAncmVhZG9ubHknKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoSU5GT19TVE9SRV9OQU1FKTtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuICAgICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGBzdG9yZWAgYXMgYGFueWAgaGVyZSBiZWNhdXNlIFR5cGVTY3JpcHQncyBET01cbiAgICAgICAgICAgIC8vIGxpYnJhcnkgZG9lcyBub3QgaGF2ZSB0aGUgYGdldEFsbCgpYCBtZXRob2QgZXZlbiB0aG91Z2ggdGhlXG4gICAgICAgICAgICAvLyBtZXRob2QgaXMgc3VwcG9ydGVkIGluIHRoZSBsYXRlc3QgdmVyc2lvbiBvZiBtb3N0IG1haW5zdHJlYW1cbiAgICAgICAgICAgIC8vIGJyb3dzZXJzOlxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0lEQk9iamVjdFN0b3JlL2dldEFsbFxuICAgICAgICAgICAgLy8gdHNsaW50OmVuYWJsZTptYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgIGNvbnN0IGdldEFsbEluZm9SZXF1ZXN0ID0gKHN0b3JlIGFzIGFueSkuZ2V0QWxsKCkgYXMgSURCUmVxdWVzdDtcbiAgICAgICAgICAgIGdldEFsbEluZm9SZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgb3V0OiB7W3BhdGg6IHN0cmluZ106IE1vZGVsQXJ0aWZhY3RzSW5mb30gPSB7fTtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGdldEFsbEluZm9SZXF1ZXN0LnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIG91dFtpdGVtLm1vZGVsUGF0aF0gPSBpdGVtLm1vZGVsQXJ0aWZhY3RzSW5mbztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXNvbHZlKG91dCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ2V0QWxsSW5mb1JlcXVlc3Qub25lcnJvciA9IGVycm9yID0+IHtcbiAgICAgICAgICAgICAgZGIuY2xvc2UoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChnZXRBbGxJbmZvUmVxdWVzdC5lcnJvcik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHgub25jb21wbGV0ZSA9ICgpID0+IGRiLmNsb3NlKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBvcGVuUmVxdWVzdC5vbmVycm9yID0gZXJyb3IgPT4gcmVqZWN0KG9wZW5SZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICBhc3luYyByZW1vdmVNb2RlbChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPE1vZGVsQXJ0aWZhY3RzSW5mbz4ge1xuICAgIHBhdGggPSBtYXliZVN0cmlwU2NoZW1lKHBhdGgpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxNb2RlbEFydGlmYWN0c0luZm8+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9wZW5SZXF1ZXN0ID0gdGhpcy5pbmRleGVkREIub3BlbihEQVRBQkFTRV9OQU1FLCBEQVRBQkFTRV9WRVJTSU9OKTtcbiAgICAgIG9wZW5SZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9ICgpID0+IHNldFVwRGF0YWJhc2Uob3BlblJlcXVlc3QpO1xuXG4gICAgICBvcGVuUmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGRiID0gb3BlblJlcXVlc3QucmVzdWx0O1xuICAgICAgICBjb25zdCBpbmZvVHggPSBkYi50cmFuc2FjdGlvbihJTkZPX1NUT1JFX05BTUUsICdyZWFkd3JpdGUnKTtcbiAgICAgICAgY29uc3QgaW5mb1N0b3JlID0gaW5mb1R4Lm9iamVjdFN0b3JlKElORk9fU1RPUkVfTkFNRSk7XG5cbiAgICAgICAgY29uc3QgZ2V0SW5mb1JlcXVlc3QgPSBpbmZvU3RvcmUuZ2V0KHBhdGgpO1xuICAgICAgICBsZXQgbW9kZWxUeDogSURCVHJhbnNhY3Rpb247XG4gICAgICAgIGdldEluZm9SZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICBpZiAoZ2V0SW5mb1JlcXVlc3QucmVzdWx0ID09IG51bGwpIHtcbiAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgQ2Fubm90IGZpbmQgbW9kZWwgd2l0aCBwYXRoICcke3BhdGh9JyBgICtcbiAgICAgICAgICAgICAgICBgaW4gSW5kZXhlZERCLmApKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmlyc3QsIGRlbGV0ZSB0aGUgZW50cnkgaW4gdGhlIGluZm8gc3RvcmUuXG4gICAgICAgICAgICBjb25zdCBkZWxldGVJbmZvUmVxdWVzdCA9IGluZm9TdG9yZS5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVNb2RlbERhdGEgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFNlY29uZCwgZGVsZXRlIHRoZSBlbnRyeSBpbiB0aGUgbW9kZWwgc3RvcmUuXG4gICAgICAgICAgICAgIG1vZGVsVHggPSBkYi50cmFuc2FjdGlvbihNT0RFTF9TVE9SRV9OQU1FLCAncmVhZHdyaXRlJyk7XG4gICAgICAgICAgICAgIGNvbnN0IG1vZGVsU3RvcmUgPSBtb2RlbFR4Lm9iamVjdFN0b3JlKE1PREVMX1NUT1JFX05BTUUpO1xuICAgICAgICAgICAgICBjb25zdCBkZWxldGVNb2RlbFJlcXVlc3QgPSBtb2RlbFN0b3JlLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgZGVsZXRlTW9kZWxSZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKGdldEluZm9SZXF1ZXN0LnJlc3VsdC5tb2RlbEFydGlmYWN0c0luZm8pO1xuICAgICAgICAgICAgICBkZWxldGVNb2RlbFJlcXVlc3Qub25lcnJvciA9IGVycm9yID0+XG4gICAgICAgICAgICAgICAgICByZWplY3QoZ2V0SW5mb1JlcXVlc3QuZXJyb3IpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIFByb2NlZWQgd2l0aCBkZWxldGluZyBtb2RlbCBkYXRhIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBkZWxldGlvblxuICAgICAgICAgICAgLy8gb2YgaW5mbyBkYXRhIHN1Y2NlZWRzIG9yIG5vdC5cbiAgICAgICAgICAgIGRlbGV0ZUluZm9SZXF1ZXN0Lm9uc3VjY2VzcyA9IGRlbGV0ZU1vZGVsRGF0YTtcbiAgICAgICAgICAgIGRlbGV0ZUluZm9SZXF1ZXN0Lm9uZXJyb3IgPSBlcnJvciA9PiB7XG4gICAgICAgICAgICAgIGRlbGV0ZU1vZGVsRGF0YSgpO1xuICAgICAgICAgICAgICBkYi5jbG9zZSgpO1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGdldEluZm9SZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBnZXRJbmZvUmVxdWVzdC5vbmVycm9yID0gZXJyb3IgPT4ge1xuICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChnZXRJbmZvUmVxdWVzdC5lcnJvcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5mb1R4Lm9uY29tcGxldGUgPSAoKSA9PiB7XG4gICAgICAgICAgaWYgKG1vZGVsVHggPT0gbnVsbCkge1xuICAgICAgICAgICAgZGIuY2xvc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbW9kZWxUeC5vbmNvbXBsZXRlID0gKCkgPT4gZGIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgb3BlblJlcXVlc3Qub25lcnJvciA9IGVycm9yID0+IHJlamVjdChvcGVuUmVxdWVzdC5lcnJvcik7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==