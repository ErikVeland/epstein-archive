/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
import { keep, scalar, stack, tidy, unstack, util } from '@tensorflow/tfjs-core';
// tslint:disable-next-line: no-imports-from-dist
import * as tfOps from '@tensorflow/tfjs-core/dist/ops/ops_for_converter';
/**
 * Hashtable contains a set of tensors, which can be accessed by key.
 */
export class HashTable {
    get id() {
        return this.handle.id;
    }
    /**
     * Constructor of HashTable. Creates a hash table.
     *
     * @param keyDType `dtype` of the table keys.
     * @param valueDType `dtype` of the table values.
     */
    constructor(keyDType, valueDType) {
        this.keyDType = keyDType;
        this.valueDType = valueDType;
        this.handle = scalar(0);
        // tslint:disable-next-line: no-any
        this.tensorMap = new Map();
        keep(this.handle);
    }
    /**
     * Dispose the tensors and handle and clear the hashtable.
     */
    clearAndClose() {
        this.tensorMap.forEach(value => value.dispose());
        this.tensorMap.clear();
        this.handle.dispose();
    }
    /**
     * The number of items in the hash table.
     */
    size() {
        return this.tensorMap.size;
    }
    /**
     * The number of items in the hash table as a rank-0 tensor.
     */
    tensorSize() {
        return tfOps.scalar(this.size(), 'int32');
    }
    /**
     * Replaces the contents of the table with the specified keys and values.
     * @param keys Keys to store in the hashtable.
     * @param values Values to store in the hashtable.
     */
    async import(keys, values) {
        this.checkKeyAndValueTensor(keys, values);
        // We only store the primitive values of the keys, this allows lookup
        // to be O(1).
        const $keys = await keys.data();
        // Clear the hashTable before inserting new values.
        this.tensorMap.forEach(value => value.dispose());
        this.tensorMap.clear();
        return tidy(() => {
            const $values = unstack(values);
            const keysLength = $keys.length;
            const valuesLength = $values.length;
            util.assert(keysLength === valuesLength, () => `The number of elements doesn't match, keys has ` +
                `${keysLength} elements, the values has ${valuesLength} ` +
                `elements.`);
            for (let i = 0; i < keysLength; i++) {
                const key = $keys[i];
                const value = $values[i];
                keep(value);
                this.tensorMap.set(key, value);
            }
            return this.handle;
        });
    }
    /**
     * Looks up keys in a hash table, outputs the corresponding values.
     *
     * Performs batch lookups, for every element in the key tensor, `find`
     * stacks the corresponding value into the return tensor.
     *
     * If an element is not present in the table, the given `defaultValue` is
     * used.
     *
     * @param keys Keys to look up. Must have the same type as the keys of the
     *     table.
     * @param defaultValue The scalar `defaultValue` is the value output for keys
     *     not present in the table. It must also be of the same type as the
     *     table values.
     */
    async find(keys, defaultValue) {
        this.checkKeyAndValueTensor(keys, defaultValue);
        const $keys = await keys.data();
        return tidy(() => {
            const result = [];
            for (let i = 0; i < $keys.length; i++) {
                const key = $keys[i];
                const value = this.findWithDefault(key, defaultValue);
                result.push(value);
            }
            return stack(result);
        });
    }
    // tslint:disable-next-line: no-any
    findWithDefault(key, defaultValue) {
        const result = this.tensorMap.get(key);
        return result != null ? result : defaultValue;
    }
    checkKeyAndValueTensor(key, value) {
        if (key.dtype !== this.keyDType) {
            throw new Error(`Expect key dtype ${this.keyDType}, but got ` +
                `${key.dtype}`);
        }
        if (value.dtype !== this.valueDType) {
            throw new Error(`Expect value dtype ${this.valueDType}, but got ` +
                `${value.dtype}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFzaF90YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29udmVydGVyL3NyYy9leGVjdXRvci9oYXNoX3RhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE9BQU8sRUFBVyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBVSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ2pHLGlEQUFpRDtBQUNqRCxPQUFPLEtBQUssS0FBSyxNQUFNLGtEQUFrRCxDQUFDO0FBRTFFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFNcEIsSUFBSSxFQUFFO1FBQ0osT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxZQUFxQixRQUFrQixFQUFXLFVBQW9CO1FBQWpELGFBQVEsR0FBUixRQUFRLENBQVU7UUFBVyxlQUFVLEdBQVYsVUFBVSxDQUFVO1FBQ3BFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFFeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhO1FBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSTtRQUNGLE9BQU8s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O0lBRU8sc0JBQXNCLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDdkQsSUFBSSxHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FDWCxvQkFBb0IsSUFBSSxDQUFDLFFBQVEsWUFBWTtnQkFDN0MsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztTQUNyQjtRQUVELElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQ1gsc0JBQXNCLElBQUksQ0FBQyxVQUFVLFlBQVk7Z0JBQ2pELEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5pbXBvcnQge0RhdGFUeXBlLCBrZWVwLCBzY2FsYXIsIHN0YWNrLCBUZW5zb3IsIHRpZHksIHVuc3RhY2ssIHV0aWx9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWltcG9ydHMtZnJvbS1kaXN0XG5pbXBvcnQgKiBhcyB0Zk9wcyBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUvZGlzdC9vcHMvb3BzX2Zvcl9jb252ZXJ0ZXInO1xuXG4vKipcbiAqIEhhc2h0YWJsZSBjb250YWlucyBhIHNldCBvZiB0ZW5zb3JzLCB3aGljaCBjYW4gYmUgYWNjZXNzZWQgYnkga2V5LlxuICovXG5leHBvcnQgY2xhc3MgSGFzaFRhYmxlIHtcbiAgcmVhZG9ubHkgaGFuZGxlOiBUZW5zb3I7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1hbnlcbiAgcHJpdmF0ZSB0ZW5zb3JNYXA6IE1hcDxhbnksIFRlbnNvcj47XG5cbiAgZ2V0IGlkKCkge1xuICAgIHJldHVybiB0aGlzLmhhbmRsZS5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvciBvZiBIYXNoVGFibGUuIENyZWF0ZXMgYSBoYXNoIHRhYmxlLlxuICAgKlxuICAgKiBAcGFyYW0ga2V5RFR5cGUgYGR0eXBlYCBvZiB0aGUgdGFibGUga2V5cy5cbiAgICogQHBhcmFtIHZhbHVlRFR5cGUgYGR0eXBlYCBvZiB0aGUgdGFibGUgdmFsdWVzLlxuICAgKi9cbiAgY29uc3RydWN0b3IocmVhZG9ubHkga2V5RFR5cGU6IERhdGFUeXBlLCByZWFkb25seSB2YWx1ZURUeXBlOiBEYXRhVHlwZSkge1xuICAgIHRoaXMuaGFuZGxlID0gc2NhbGFyKDApO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tYW55XG4gICAgdGhpcy50ZW5zb3JNYXAgPSBuZXcgTWFwPGFueSwgVGVuc29yPigpO1xuXG4gICAga2VlcCh0aGlzLmhhbmRsZSk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcG9zZSB0aGUgdGVuc29ycyBhbmQgaGFuZGxlIGFuZCBjbGVhciB0aGUgaGFzaHRhYmxlLlxuICAgKi9cbiAgY2xlYXJBbmRDbG9zZSgpIHtcbiAgICB0aGlzLnRlbnNvck1hcC5mb3JFYWNoKHZhbHVlID0+IHZhbHVlLmRpc3Bvc2UoKSk7XG4gICAgdGhpcy50ZW5zb3JNYXAuY2xlYXIoKTtcbiAgICB0aGlzLmhhbmRsZS5kaXNwb3NlKCk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBpdGVtcyBpbiB0aGUgaGFzaCB0YWJsZS5cbiAgICovXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy50ZW5zb3JNYXAuc2l6ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIGl0ZW1zIGluIHRoZSBoYXNoIHRhYmxlIGFzIGEgcmFuay0wIHRlbnNvci5cbiAgICovXG4gIHRlbnNvclNpemUoKTogVGVuc29yIHtcbiAgICByZXR1cm4gdGZPcHMuc2NhbGFyKHRoaXMuc2l6ZSgpLCAnaW50MzInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXBsYWNlcyB0aGUgY29udGVudHMgb2YgdGhlIHRhYmxlIHdpdGggdGhlIHNwZWNpZmllZCBrZXlzIGFuZCB2YWx1ZXMuXG4gICAqIEBwYXJhbSBrZXlzIEtleXMgdG8gc3RvcmUgaW4gdGhlIGhhc2h0YWJsZS5cbiAgICogQHBhcmFtIHZhbHVlcyBWYWx1ZXMgdG8gc3RvcmUgaW4gdGhlIGhhc2h0YWJsZS5cbiAgICovXG4gIGFzeW5jIGltcG9ydChrZXlzOiBUZW5zb3IsIHZhbHVlczogVGVuc29yKTogUHJvbWlzZTxUZW5zb3I+IHtcbiAgICB0aGlzLmNoZWNrS2V5QW5kVmFsdWVUZW5zb3Ioa2V5cywgdmFsdWVzKTtcblxuICAgIC8vIFdlIG9ubHkgc3RvcmUgdGhlIHByaW1pdGl2ZSB2YWx1ZXMgb2YgdGhlIGtleXMsIHRoaXMgYWxsb3dzIGxvb2t1cFxuICAgIC8vIHRvIGJlIE8oMSkuXG4gICAgY29uc3QgJGtleXMgPSBhd2FpdCBrZXlzLmRhdGEoKTtcblxuICAgIC8vIENsZWFyIHRoZSBoYXNoVGFibGUgYmVmb3JlIGluc2VydGluZyBuZXcgdmFsdWVzLlxuICAgIHRoaXMudGVuc29yTWFwLmZvckVhY2godmFsdWUgPT4gdmFsdWUuZGlzcG9zZSgpKTtcbiAgICB0aGlzLnRlbnNvck1hcC5jbGVhcigpO1xuXG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgJHZhbHVlcyA9IHVuc3RhY2sodmFsdWVzKTtcblxuICAgICAgY29uc3Qga2V5c0xlbmd0aCA9ICRrZXlzLmxlbmd0aDtcbiAgICAgIGNvbnN0IHZhbHVlc0xlbmd0aCA9ICR2YWx1ZXMubGVuZ3RoO1xuXG4gICAgICB1dGlsLmFzc2VydChcbiAgICAgICAgICBrZXlzTGVuZ3RoID09PSB2YWx1ZXNMZW5ndGgsXG4gICAgICAgICAgKCkgPT4gYFRoZSBudW1iZXIgb2YgZWxlbWVudHMgZG9lc24ndCBtYXRjaCwga2V5cyBoYXMgYCArXG4gICAgICAgICAgICAgIGAke2tleXNMZW5ndGh9IGVsZW1lbnRzLCB0aGUgdmFsdWVzIGhhcyAke3ZhbHVlc0xlbmd0aH0gYCArXG4gICAgICAgICAgICAgIGBlbGVtZW50cy5gKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3Qga2V5ID0gJGtleXNbaV07XG4gICAgICAgIGNvbnN0IHZhbHVlID0gJHZhbHVlc1tpXTtcblxuICAgICAgICBrZWVwKHZhbHVlKTtcbiAgICAgICAgdGhpcy50ZW5zb3JNYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5oYW5kbGU7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTG9va3MgdXAga2V5cyBpbiBhIGhhc2ggdGFibGUsIG91dHB1dHMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICAgKlxuICAgKiBQZXJmb3JtcyBiYXRjaCBsb29rdXBzLCBmb3IgZXZlcnkgZWxlbWVudCBpbiB0aGUga2V5IHRlbnNvciwgYGZpbmRgXG4gICAqIHN0YWNrcyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSBpbnRvIHRoZSByZXR1cm4gdGVuc29yLlxuICAgKlxuICAgKiBJZiBhbiBlbGVtZW50IGlzIG5vdCBwcmVzZW50IGluIHRoZSB0YWJsZSwgdGhlIGdpdmVuIGBkZWZhdWx0VmFsdWVgIGlzXG4gICAqIHVzZWQuXG4gICAqXG4gICAqIEBwYXJhbSBrZXlzIEtleXMgdG8gbG9vayB1cC4gTXVzdCBoYXZlIHRoZSBzYW1lIHR5cGUgYXMgdGhlIGtleXMgb2YgdGhlXG4gICAqICAgICB0YWJsZS5cbiAgICogQHBhcmFtIGRlZmF1bHRWYWx1ZSBUaGUgc2NhbGFyIGBkZWZhdWx0VmFsdWVgIGlzIHRoZSB2YWx1ZSBvdXRwdXQgZm9yIGtleXNcbiAgICogICAgIG5vdCBwcmVzZW50IGluIHRoZSB0YWJsZS4gSXQgbXVzdCBhbHNvIGJlIG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlXG4gICAqICAgICB0YWJsZSB2YWx1ZXMuXG4gICAqL1xuICBhc3luYyBmaW5kKGtleXM6IFRlbnNvciwgZGVmYXVsdFZhbHVlOiBUZW5zb3IpOiBQcm9taXNlPFRlbnNvcj4ge1xuICAgIHRoaXMuY2hlY2tLZXlBbmRWYWx1ZVRlbnNvcihrZXlzLCBkZWZhdWx0VmFsdWUpO1xuXG4gICAgY29uc3QgJGtleXMgPSBhd2FpdCBrZXlzLmRhdGEoKTtcblxuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdDogVGVuc29yW10gPSBbXTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAka2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBrZXkgPSAka2V5c1tpXTtcblxuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZmluZFdpdGhEZWZhdWx0KGtleSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3RhY2socmVzdWx0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tYW55XG4gIHByaXZhdGUgZmluZFdpdGhEZWZhdWx0KGtleTogYW55LCBkZWZhdWx0VmFsdWU6IFRlbnNvcik6IFRlbnNvciB7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy50ZW5zb3JNYXAuZ2V0KGtleSk7XG5cbiAgICByZXR1cm4gcmVzdWx0ICE9IG51bGwgPyByZXN1bHQgOiBkZWZhdWx0VmFsdWU7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrS2V5QW5kVmFsdWVUZW5zb3Ioa2V5OiBUZW5zb3IsIHZhbHVlOiBUZW5zb3IpIHtcbiAgICBpZiAoa2V5LmR0eXBlICE9PSB0aGlzLmtleURUeXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEV4cGVjdCBrZXkgZHR5cGUgJHt0aGlzLmtleURUeXBlfSwgYnV0IGdvdCBgICtcbiAgICAgICAgICBgJHtrZXkuZHR5cGV9YCk7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlLmR0eXBlICE9PSB0aGlzLnZhbHVlRFR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXhwZWN0IHZhbHVlIGR0eXBlICR7dGhpcy52YWx1ZURUeXBlfSwgYnV0IGdvdCBgICtcbiAgICAgICAgICBgJHt2YWx1ZS5kdHlwZX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==