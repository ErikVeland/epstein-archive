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
import { assert } from './util';
/**
 * Maps to mapping between the custom object and its name.
 *
 * After registering a custom class, these two maps will add key-value pairs
 * for the class object and the registered name.
 *
 * Therefore we can get the relative registered name by calling
 * getRegisteredName() function.
 *
 * For example:
 * GLOBAL_CUSTOM_OBJECT: {key=registeredName: value=corresponding
 * CustomObjectClass}
 *
 * GLOBAL_CUSTOM_NAMES: {key=CustomObjectClass: value=corresponding
 * registeredName}
 *
 */
const GLOBAL_CUSTOM_OBJECT = new Map();
const GLOBAL_CUSTOM_NAMES = new Map();
/**
 * Serializable defines the serialization contract.
 *
 * TFJS requires serializable classes to return their className when asked
 * to avoid issues with minification.
 */
export class Serializable {
    /**
     * Return the class name for this class to use in serialization contexts.
     *
     * Generally speaking this will be the same thing that constructor.name
     * would have returned.  However, the class name needs to be robust
     * against minification for serialization/deserialization to work properly.
     *
     * There's also places such as initializers.VarianceScaling, where
     * implementation details between different languages led to different
     * class hierarchies and a non-leaf node is used for serialization purposes.
     */
    getClassName() {
        return this.constructor
            .className;
    }
    /**
     * Creates an instance of T from a ConfigDict.
     *
     * This works for most descendants of serializable.  A few need to
     * provide special handling.
     * @param cls A Constructor for the class to instantiate.
     * @param config The Configuration for the object.
     */
    /** @nocollapse */
    static fromConfig(cls, config) {
        return new cls(config);
    }
}
/**
 * Maps string keys to class constructors.
 *
 * Used during (de)serialization from the cross-language JSON format, which
 * requires the class name in the serialization format matches the class
 * names as used in Python, should it exist.
 */
export class SerializationMap {
    constructor() {
        this.classNameMap = {};
    }
    /**
     * Returns the singleton instance of the map.
     */
    static getMap() {
        if (SerializationMap.instance == null) {
            SerializationMap.instance = new SerializationMap();
        }
        return SerializationMap.instance;
    }
    /**
     * Registers the class as serializable.
     */
    static register(cls) {
        SerializationMap.getMap().classNameMap[cls.className] =
            [cls, cls.fromConfig];
    }
}
/**
 * Register a class with the serialization map of TensorFlow.js.
 *
 * This is often used for registering custom Layers, so they can be
 * serialized and deserialized.
 *
 * Example 1. Register the class without package name and specified name.
 *
 * ```js
 * class MyCustomLayer extends tf.layers.Layer {
 *   static className = 'MyCustomLayer';
 *
 *   constructor(config) {
 *     super(config);
 *   }
 * }
 * tf.serialization.registerClass(MyCustomLayer);
 * console.log(tf.serialization.GLOBALCUSTOMOBJECT.get("Custom>MyCustomLayer"));
 * console.log(tf.serialization.GLOBALCUSTOMNAMES.get(MyCustomLayer));
 * ```
 *
 * Example 2. Register the class with package name: "Package" and specified
 * name: "MyLayer".
 * ```js
 * class MyCustomLayer extends tf.layers.Layer {
 *   static className = 'MyCustomLayer';
 *
 *   constructor(config) {
 *     super(config);
 *   }
 * }
 * tf.serialization.registerClass(MyCustomLayer, "Package", "MyLayer");
 * console.log(tf.serialization.GLOBALCUSTOMOBJECT.get("Package>MyLayer"));
 * console.log(tf.serialization.GLOBALCUSTOMNAMES.get(MyCustomLayer));
 * ```
 *
 * Example 3. Register the class with specified name: "MyLayer".
 * ```js
 * class MyCustomLayer extends tf.layers.Layer {
 *   static className = 'MyCustomLayer';
 *
 *   constructor(config) {
 *     super(config);
 *   }
 * }
 * tf.serialization.registerClass(MyCustomLayer, undefined, "MyLayer");
 * console.log(tf.serialization.GLOBALCUSTOMOBJECT.get("Custom>MyLayer"));
 * console.log(tf.serialization.GLOBALCUSTOMNAMES.get(MyCustomLayer));
 * ```
 *
 * Example 4. Register the class with specified package name: "Package".
 * ```js
 * class MyCustomLayer extends tf.layers.Layer {
 *   static className = 'MyCustomLayer';
 *
 *   constructor(config) {
 *     super(config);
 *   }
 * }
 * tf.serialization.registerClass(MyCustomLayer, "Package");
 * console.log(tf.serialization.GLOBALCUSTOMOBJECT
 * .get("Package>MyCustomLayer"));
 * console.log(tf.serialization.GLOBALCUSTOMNAMES
 * .get(MyCustomLayer));
 * ```
 *
 * @param cls The class to be registered. It must have a public static member
 *   called `className` defined and the value must be a non-empty string.
 * @param pkg The package name that this class belongs to. This used to define
 *     the key in GlobalCustomObject. If not defined, it defaults to `Custom`.
 * @param name The name that user specified. It defaults to the actual name of
 *     the class as specified by its static `className` property.
 * @doc {heading: 'Models', subheading: 'Serialization', ignoreCI: true}
 */
export function registerClass(cls, pkg, name) {
    assert(cls.className != null, () => `Class being registered does not have the static className ` +
        `property defined.`);
    assert(typeof cls.className === 'string', () => `className is required to be a string, but got type ` +
        typeof cls.className);
    assert(cls.className.length > 0, () => `Class being registered has an empty-string as its className, ` +
        `which is disallowed.`);
    if (typeof pkg === 'undefined') {
        pkg = 'Custom';
    }
    if (typeof name === 'undefined') {
        name = cls.className;
    }
    const className = name;
    const registerName = pkg + '>' + className;
    SerializationMap.register(cls);
    GLOBAL_CUSTOM_OBJECT.set(registerName, cls);
    GLOBAL_CUSTOM_NAMES.set(cls, registerName);
    return cls;
}
/**
 * Get the registered name of a class. If the class has not been registered,
 * return the class name.
 *
 * @param cls The class we want to get register name for. It must have a public
 *     static member called `className` defined.
 * @returns registered name or class name.
 */
export function getRegisteredName(cls) {
    if (GLOBAL_CUSTOM_NAMES.has(cls)) {
        return GLOBAL_CUSTOM_NAMES.get(cls);
    }
    else {
        return cls.className;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VyaWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvc2VyaWFsaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBdUM5Qjs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxFQUFpRCxDQUFDO0FBRTdELE1BQU0sbUJBQW1CLEdBQ3JCLElBQUksR0FBRyxFQUFpRCxDQUFDO0FBRTdEOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFnQixZQUFZO0lBQ2hDOzs7Ozs7Ozs7O09BVUc7SUFDSCxZQUFZO1FBQ1YsT0FBUSxJQUFJLENBQUMsV0FBcUQ7YUFDN0QsU0FBUyxDQUFDO0lBQ2pCLENBQUM7SUFPRDs7Ozs7OztPQU9HO0lBQ0gsa0JBQWtCO0lBQ2xCLE1BQU0sQ0FBQyxVQUFVLENBQ2IsR0FBK0IsRUFBRSxNQUFrQjtRQUNyRCxPQUFPLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBTyxnQkFBZ0I7SUFPM0I7UUFDRSxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBTTtRQUNYLElBQUksZ0JBQWdCLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRTtZQUNyQyxnQkFBZ0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1NBQ3BEO1FBQ0QsT0FBTyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUM7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFFBQVEsQ0FBeUIsR0FBK0I7UUFDckUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDakQsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDRjtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUVHO0FBQ0gsTUFBTSxVQUFVLGFBQWEsQ0FDekIsR0FBK0IsRUFBRSxHQUFZLEVBQUUsSUFBYTtJQUM5RCxNQUFNLENBQ0YsR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQ3JCLEdBQUcsRUFBRSxDQUFDLDREQUE0RDtRQUM5RCxtQkFBbUIsQ0FBQyxDQUFDO0lBQzdCLE1BQU0sQ0FDRixPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxxREFBcUQ7UUFDdkQsT0FBTyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDOUIsTUFBTSxDQUNGLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDeEIsR0FBRyxFQUFFLENBQUMsK0RBQStEO1FBQ2pFLHNCQUFzQixDQUFDLENBQUM7SUFFaEMsSUFBSSxPQUFPLEdBQUcsS0FBSyxXQUFXLEVBQUU7UUFDOUIsR0FBRyxHQUFHLFFBQVEsQ0FBQztLQUNoQjtJQUVELElBQUksT0FBTyxJQUFJLEtBQUssV0FBVyxFQUFFO1FBQy9CLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO0tBQ3RCO0lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLE1BQU0sWUFBWSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0lBRTNDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzVDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFFM0MsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQ7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FDN0IsR0FBK0I7SUFDakMsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDaEMsT0FBTyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckM7U0FBTTtRQUNMLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQztLQUN0QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7YXNzZXJ0fSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIFR5cGVzIHRvIHN1cHBvcnQgSlNPTi1lc3F1ZSBkYXRhIHN0cnVjdHVyZXMgaW50ZXJuYWxseS5cbiAqXG4gKiBJbnRlcm5hbGx5IENvbmZpZ0RpY3QncyB1c2UgY2FtZWxDYXNlIGtleXMgYW5kIHZhbHVlcyB3aGVyZSB0aGVcbiAqIHZhbHVlcyBhcmUgY2xhc3MgbmFtZXMgdG8gYmUgaW5zdGFudGlhdGVkLiAgT24gdGhlIHB5dGhvbiBzaWRlLCB0aGVzZVxuICogd2lsbCBiZSBzbmFrZV9jYXNlLiAgSW50ZXJuYWxseSB3ZSBhbGxvdyBFbnVtcyBpbnRvIHRoZSB2YWx1ZXMgZm9yIGJldHRlclxuICogdHlwZSBzYWZldHksIGJ1dCB0aGVzZSBuZWVkIHRvIGJlIGNvbnZlcnRlZCB0byByYXcgcHJpbWl0aXZlcyAodXN1YWxseVxuICogc3RyaW5ncykgZm9yIHJvdW5kLXRyaXBwaW5nIHdpdGggcHl0aG9uLlxuICpcbiAqIHRvQ29uZmlnIHJldHVybnMgdGhlIFRTLWZyaWVuZGx5IHJlcHJlc2VudGF0aW9uLiBtb2RlbC50b0pTT04oKSByZXR1cm5zXG4gKiB0aGUgcHl0aG9uaWMgdmVyc2lvbiBhcyB0aGF0J3MgdGhlIHBvcnRhYmxlIGZvcm1hdC4gIElmIHlvdSBuZWVkIHRvXG4gKiBweXRob24taWZ5IGEgbm9uLW1vZGVsIGxldmVsIHRvQ29uZmlnIG91dHB1dCwgeW91J2xsIG5lZWQgdG8gdXNlIGFcbiAqIGNvbnZlcnRUc1RvUHl0aG9uaWMgZnJvbSBzZXJpYWxpemF0aW9uX3V0aWxzIGluIC1MYXllcnMuXG4gKlxuICovXG5leHBvcnQgZGVjbGFyZSB0eXBlIENvbmZpZ0RpY3RWYWx1ZSA9XG4gICAgYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZyB8IG51bGwgfCBDb25maWdEaWN0QXJyYXkgfCBDb25maWdEaWN0O1xuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIENvbmZpZ0RpY3Qge1xuICBba2V5OiBzdHJpbmddOiBDb25maWdEaWN0VmFsdWU7XG59XG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQ29uZmlnRGljdEFycmF5IGV4dGVuZHMgQXJyYXk8Q29uZmlnRGljdFZhbHVlPiB7fVxuXG4vKipcbiAqIFR5cGUgdG8gcmVwcmVzZW50IHRoZSBjbGFzcy10eXBlIG9mIFNlcmlhbGl6YWJsZSBvYmplY3RzLlxuICpcbiAqIEllIHRoZSBjbGFzcyBwcm90b3R5cGUgd2l0aCBhY2Nlc3MgdG8gdGhlIGNvbnN0cnVjdG9yIGFuZCBhbnlcbiAqIHN0YXRpYyBtZW1iZXJzL21ldGhvZHMuIEluc3RhbmNlIG1ldGhvZHMgYXJlIG5vdCBsaXN0ZWQgaGVyZS5cbiAqXG4gKiBTb3VyY2UgZm9yIHRoaXMgaWRlYTogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzQzNjA3MjU1XG4gKi9cbmV4cG9ydCBkZWNsYXJlIHR5cGUgU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VCBleHRlbmRzIFNlcmlhbGl6YWJsZT4gPSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgbmV3ICguLi5hcmdzOiBhbnlbXSk6IFQ7IGNsYXNzTmFtZTogc3RyaW5nOyBmcm9tQ29uZmlnOiBGcm9tQ29uZmlnTWV0aG9kPFQ+O1xufTtcbmV4cG9ydCBkZWNsYXJlIHR5cGUgRnJvbUNvbmZpZ01ldGhvZDxUIGV4dGVuZHMgU2VyaWFsaXphYmxlPiA9XG4gICAgKGNsczogU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4sIGNvbmZpZzogQ29uZmlnRGljdCkgPT4gVDtcblxuLyoqXG4gKiBNYXBzIHRvIG1hcHBpbmcgYmV0d2VlbiB0aGUgY3VzdG9tIG9iamVjdCBhbmQgaXRzIG5hbWUuXG4gKlxuICogQWZ0ZXIgcmVnaXN0ZXJpbmcgYSBjdXN0b20gY2xhc3MsIHRoZXNlIHR3byBtYXBzIHdpbGwgYWRkIGtleS12YWx1ZSBwYWlyc1xuICogZm9yIHRoZSBjbGFzcyBvYmplY3QgYW5kIHRoZSByZWdpc3RlcmVkIG5hbWUuXG4gKlxuICogVGhlcmVmb3JlIHdlIGNhbiBnZXQgdGhlIHJlbGF0aXZlIHJlZ2lzdGVyZWQgbmFtZSBieSBjYWxsaW5nXG4gKiBnZXRSZWdpc3RlcmVkTmFtZSgpIGZ1bmN0aW9uLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICogR0xPQkFMX0NVU1RPTV9PQkpFQ1Q6IHtrZXk9cmVnaXN0ZXJlZE5hbWU6IHZhbHVlPWNvcnJlc3BvbmRpbmdcbiAqIEN1c3RvbU9iamVjdENsYXNzfVxuICpcbiAqIEdMT0JBTF9DVVNUT01fTkFNRVM6IHtrZXk9Q3VzdG9tT2JqZWN0Q2xhc3M6IHZhbHVlPWNvcnJlc3BvbmRpbmdcbiAqIHJlZ2lzdGVyZWROYW1lfVxuICpcbiAqL1xuY29uc3QgR0xPQkFMX0NVU1RPTV9PQkpFQ1QgPVxuICAgIG5ldyBNYXA8c3RyaW5nLCBTZXJpYWxpemFibGVDb25zdHJ1Y3RvcjxTZXJpYWxpemFibGU+PigpO1xuXG5jb25zdCBHTE9CQUxfQ1VTVE9NX05BTUVTID1cbiAgICBuZXcgTWFwPFNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFNlcmlhbGl6YWJsZT4sIHN0cmluZz4oKTtcblxuLyoqXG4gKiBTZXJpYWxpemFibGUgZGVmaW5lcyB0aGUgc2VyaWFsaXphdGlvbiBjb250cmFjdC5cbiAqXG4gKiBURkpTIHJlcXVpcmVzIHNlcmlhbGl6YWJsZSBjbGFzc2VzIHRvIHJldHVybiB0aGVpciBjbGFzc05hbWUgd2hlbiBhc2tlZFxuICogdG8gYXZvaWQgaXNzdWVzIHdpdGggbWluaWZpY2F0aW9uLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2VyaWFsaXphYmxlIHtcbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY2xhc3MgbmFtZSBmb3IgdGhpcyBjbGFzcyB0byB1c2UgaW4gc2VyaWFsaXphdGlvbiBjb250ZXh0cy5cbiAgICpcbiAgICogR2VuZXJhbGx5IHNwZWFraW5nIHRoaXMgd2lsbCBiZSB0aGUgc2FtZSB0aGluZyB0aGF0IGNvbnN0cnVjdG9yLm5hbWVcbiAgICogd291bGQgaGF2ZSByZXR1cm5lZC4gIEhvd2V2ZXIsIHRoZSBjbGFzcyBuYW1lIG5lZWRzIHRvIGJlIHJvYnVzdFxuICAgKiBhZ2FpbnN0IG1pbmlmaWNhdGlvbiBmb3Igc2VyaWFsaXphdGlvbi9kZXNlcmlhbGl6YXRpb24gdG8gd29yayBwcm9wZXJseS5cbiAgICpcbiAgICogVGhlcmUncyBhbHNvIHBsYWNlcyBzdWNoIGFzIGluaXRpYWxpemVycy5WYXJpYW5jZVNjYWxpbmcsIHdoZXJlXG4gICAqIGltcGxlbWVudGF0aW9uIGRldGFpbHMgYmV0d2VlbiBkaWZmZXJlbnQgbGFuZ3VhZ2VzIGxlZCB0byBkaWZmZXJlbnRcbiAgICogY2xhc3MgaGllcmFyY2hpZXMgYW5kIGEgbm9uLWxlYWYgbm9kZSBpcyB1c2VkIGZvciBzZXJpYWxpemF0aW9uIHB1cnBvc2VzLlxuICAgKi9cbiAgZ2V0Q2xhc3NOYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICh0aGlzLmNvbnN0cnVjdG9yIGFzIFNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFNlcmlhbGl6YWJsZT4pXG4gICAgICAgIC5jbGFzc05hbWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFsbCB0aGUgbm9uLXdlaWdodCBzdGF0ZSBuZWVkZWQgdG8gc2VyaWFsaXplIHRoaXMgb2JqZWN0LlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0Q29uZmlnKCk6IENvbmZpZ0RpY3Q7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgVCBmcm9tIGEgQ29uZmlnRGljdC5cbiAgICpcbiAgICogVGhpcyB3b3JrcyBmb3IgbW9zdCBkZXNjZW5kYW50cyBvZiBzZXJpYWxpemFibGUuICBBIGZldyBuZWVkIHRvXG4gICAqIHByb3ZpZGUgc3BlY2lhbCBoYW5kbGluZy5cbiAgICogQHBhcmFtIGNscyBBIENvbnN0cnVjdG9yIGZvciB0aGUgY2xhc3MgdG8gaW5zdGFudGlhdGUuXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIENvbmZpZ3VyYXRpb24gZm9yIHRoZSBvYmplY3QuXG4gICAqL1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGZyb21Db25maWc8VCBleHRlbmRzIFNlcmlhbGl6YWJsZT4oXG4gICAgICBjbHM6IFNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFQ+LCBjb25maWc6IENvbmZpZ0RpY3QpOiBUIHtcbiAgICByZXR1cm4gbmV3IGNscyhjb25maWcpO1xuICB9XG59XG5cbi8qKlxuICogTWFwcyBzdHJpbmcga2V5cyB0byBjbGFzcyBjb25zdHJ1Y3RvcnMuXG4gKlxuICogVXNlZCBkdXJpbmcgKGRlKXNlcmlhbGl6YXRpb24gZnJvbSB0aGUgY3Jvc3MtbGFuZ3VhZ2UgSlNPTiBmb3JtYXQsIHdoaWNoXG4gKiByZXF1aXJlcyB0aGUgY2xhc3MgbmFtZSBpbiB0aGUgc2VyaWFsaXphdGlvbiBmb3JtYXQgbWF0Y2hlcyB0aGUgY2xhc3NcbiAqIG5hbWVzIGFzIHVzZWQgaW4gUHl0aG9uLCBzaG91bGQgaXQgZXhpc3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZXJpYWxpemF0aW9uTWFwIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IFNlcmlhbGl6YXRpb25NYXA7XG4gIGNsYXNzTmFtZU1hcDoge1xuICAgIFtjbGFzc05hbWU6IHN0cmluZ106XG4gICAgICAgIFtTZXJpYWxpemFibGVDb25zdHJ1Y3RvcjxTZXJpYWxpemFibGU+LCBGcm9tQ29uZmlnTWV0aG9kPFNlcmlhbGl6YWJsZT5dXG4gIH07XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmNsYXNzTmFtZU1hcCA9IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiB0aGUgbWFwLlxuICAgKi9cbiAgc3RhdGljIGdldE1hcCgpOiBTZXJpYWxpemF0aW9uTWFwIHtcbiAgICBpZiAoU2VyaWFsaXphdGlvbk1hcC5pbnN0YW5jZSA9PSBudWxsKSB7XG4gICAgICBTZXJpYWxpemF0aW9uTWFwLmluc3RhbmNlID0gbmV3IFNlcmlhbGl6YXRpb25NYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIFNlcmlhbGl6YXRpb25NYXAuaW5zdGFuY2U7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIHRoZSBjbGFzcyBhcyBzZXJpYWxpemFibGUuXG4gICAqL1xuICBzdGF0aWMgcmVnaXN0ZXI8VCBleHRlbmRzIFNlcmlhbGl6YWJsZT4oY2xzOiBTZXJpYWxpemFibGVDb25zdHJ1Y3RvcjxUPikge1xuICAgIFNlcmlhbGl6YXRpb25NYXAuZ2V0TWFwKCkuY2xhc3NOYW1lTWFwW2Nscy5jbGFzc05hbWVdID1cbiAgICAgICAgW2NscywgY2xzLmZyb21Db25maWddO1xuICB9XG59XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBjbGFzcyB3aXRoIHRoZSBzZXJpYWxpemF0aW9uIG1hcCBvZiBUZW5zb3JGbG93LmpzLlxuICpcbiAqIFRoaXMgaXMgb2Z0ZW4gdXNlZCBmb3IgcmVnaXN0ZXJpbmcgY3VzdG9tIExheWVycywgc28gdGhleSBjYW4gYmVcbiAqIHNlcmlhbGl6ZWQgYW5kIGRlc2VyaWFsaXplZC5cbiAqXG4gKiBFeGFtcGxlIDEuIFJlZ2lzdGVyIHRoZSBjbGFzcyB3aXRob3V0IHBhY2thZ2UgbmFtZSBhbmQgc3BlY2lmaWVkIG5hbWUuXG4gKlxuICogYGBganNcbiAqIGNsYXNzIE15Q3VzdG9tTGF5ZXIgZXh0ZW5kcyB0Zi5sYXllcnMuTGF5ZXIge1xuICogICBzdGF0aWMgY2xhc3NOYW1lID0gJ015Q3VzdG9tTGF5ZXInO1xuICpcbiAqICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gKiAgICAgc3VwZXIoY29uZmlnKTtcbiAqICAgfVxuICogfVxuICogdGYuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKE15Q3VzdG9tTGF5ZXIpO1xuICogY29uc29sZS5sb2codGYuc2VyaWFsaXphdGlvbi5HTE9CQUxDVVNUT01PQkpFQ1QuZ2V0KFwiQ3VzdG9tPk15Q3VzdG9tTGF5ZXJcIikpO1xuICogY29uc29sZS5sb2codGYuc2VyaWFsaXphdGlvbi5HTE9CQUxDVVNUT01OQU1FUy5nZXQoTXlDdXN0b21MYXllcikpO1xuICogYGBgXG4gKlxuICogRXhhbXBsZSAyLiBSZWdpc3RlciB0aGUgY2xhc3Mgd2l0aCBwYWNrYWdlIG5hbWU6IFwiUGFja2FnZVwiIGFuZCBzcGVjaWZpZWRcbiAqIG5hbWU6IFwiTXlMYXllclwiLlxuICogYGBganNcbiAqIGNsYXNzIE15Q3VzdG9tTGF5ZXIgZXh0ZW5kcyB0Zi5sYXllcnMuTGF5ZXIge1xuICogICBzdGF0aWMgY2xhc3NOYW1lID0gJ015Q3VzdG9tTGF5ZXInO1xuICpcbiAqICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gKiAgICAgc3VwZXIoY29uZmlnKTtcbiAqICAgfVxuICogfVxuICogdGYuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKE15Q3VzdG9tTGF5ZXIsIFwiUGFja2FnZVwiLCBcIk15TGF5ZXJcIik7XG4gKiBjb25zb2xlLmxvZyh0Zi5zZXJpYWxpemF0aW9uLkdMT0JBTENVU1RPTU9CSkVDVC5nZXQoXCJQYWNrYWdlPk15TGF5ZXJcIikpO1xuICogY29uc29sZS5sb2codGYuc2VyaWFsaXphdGlvbi5HTE9CQUxDVVNUT01OQU1FUy5nZXQoTXlDdXN0b21MYXllcikpO1xuICogYGBgXG4gKlxuICogRXhhbXBsZSAzLiBSZWdpc3RlciB0aGUgY2xhc3Mgd2l0aCBzcGVjaWZpZWQgbmFtZTogXCJNeUxheWVyXCIuXG4gKiBgYGBqc1xuICogY2xhc3MgTXlDdXN0b21MYXllciBleHRlbmRzIHRmLmxheWVycy5MYXllciB7XG4gKiAgIHN0YXRpYyBjbGFzc05hbWUgPSAnTXlDdXN0b21MYXllcic7XG4gKlxuICogICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAqICAgICBzdXBlcihjb25maWcpO1xuICogICB9XG4gKiB9XG4gKiB0Zi5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTXlDdXN0b21MYXllciwgdW5kZWZpbmVkLCBcIk15TGF5ZXJcIik7XG4gKiBjb25zb2xlLmxvZyh0Zi5zZXJpYWxpemF0aW9uLkdMT0JBTENVU1RPTU9CSkVDVC5nZXQoXCJDdXN0b20+TXlMYXllclwiKSk7XG4gKiBjb25zb2xlLmxvZyh0Zi5zZXJpYWxpemF0aW9uLkdMT0JBTENVU1RPTU5BTUVTLmdldChNeUN1c3RvbUxheWVyKSk7XG4gKiBgYGBcbiAqXG4gKiBFeGFtcGxlIDQuIFJlZ2lzdGVyIHRoZSBjbGFzcyB3aXRoIHNwZWNpZmllZCBwYWNrYWdlIG5hbWU6IFwiUGFja2FnZVwiLlxuICogYGBganNcbiAqIGNsYXNzIE15Q3VzdG9tTGF5ZXIgZXh0ZW5kcyB0Zi5sYXllcnMuTGF5ZXIge1xuICogICBzdGF0aWMgY2xhc3NOYW1lID0gJ015Q3VzdG9tTGF5ZXInO1xuICpcbiAqICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gKiAgICAgc3VwZXIoY29uZmlnKTtcbiAqICAgfVxuICogfVxuICogdGYuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKE15Q3VzdG9tTGF5ZXIsIFwiUGFja2FnZVwiKTtcbiAqIGNvbnNvbGUubG9nKHRmLnNlcmlhbGl6YXRpb24uR0xPQkFMQ1VTVE9NT0JKRUNUXG4gKiAuZ2V0KFwiUGFja2FnZT5NeUN1c3RvbUxheWVyXCIpKTtcbiAqIGNvbnNvbGUubG9nKHRmLnNlcmlhbGl6YXRpb24uR0xPQkFMQ1VTVE9NTkFNRVNcbiAqIC5nZXQoTXlDdXN0b21MYXllcikpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNscyBUaGUgY2xhc3MgdG8gYmUgcmVnaXN0ZXJlZC4gSXQgbXVzdCBoYXZlIGEgcHVibGljIHN0YXRpYyBtZW1iZXJcbiAqICAgY2FsbGVkIGBjbGFzc05hbWVgIGRlZmluZWQgYW5kIHRoZSB2YWx1ZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZy5cbiAqIEBwYXJhbSBwa2cgVGhlIHBhY2thZ2UgbmFtZSB0aGF0IHRoaXMgY2xhc3MgYmVsb25ncyB0by4gVGhpcyB1c2VkIHRvIGRlZmluZVxuICogICAgIHRoZSBrZXkgaW4gR2xvYmFsQ3VzdG9tT2JqZWN0LiBJZiBub3QgZGVmaW5lZCwgaXQgZGVmYXVsdHMgdG8gYEN1c3RvbWAuXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSB0aGF0IHVzZXIgc3BlY2lmaWVkLiBJdCBkZWZhdWx0cyB0byB0aGUgYWN0dWFsIG5hbWUgb2ZcbiAqICAgICB0aGUgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IGl0cyBzdGF0aWMgYGNsYXNzTmFtZWAgcHJvcGVydHkuXG4gKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgc3ViaGVhZGluZzogJ1NlcmlhbGl6YXRpb24nLCBpZ25vcmVDSTogdHJ1ZX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ2xhc3M8VCBleHRlbmRzIFNlcmlhbGl6YWJsZT4oXG4gICAgY2xzOiBTZXJpYWxpemFibGVDb25zdHJ1Y3RvcjxUPiwgcGtnPzogc3RyaW5nLCBuYW1lPzogc3RyaW5nKSB7XG4gIGFzc2VydChcbiAgICAgIGNscy5jbGFzc05hbWUgIT0gbnVsbCxcbiAgICAgICgpID0+IGBDbGFzcyBiZWluZyByZWdpc3RlcmVkIGRvZXMgbm90IGhhdmUgdGhlIHN0YXRpYyBjbGFzc05hbWUgYCArXG4gICAgICAgICAgYHByb3BlcnR5IGRlZmluZWQuYCk7XG4gIGFzc2VydChcbiAgICAgIHR5cGVvZiBjbHMuY2xhc3NOYW1lID09PSAnc3RyaW5nJyxcbiAgICAgICgpID0+IGBjbGFzc05hbWUgaXMgcmVxdWlyZWQgdG8gYmUgYSBzdHJpbmcsIGJ1dCBnb3QgdHlwZSBgICtcbiAgICAgICAgICB0eXBlb2YgY2xzLmNsYXNzTmFtZSk7XG4gIGFzc2VydChcbiAgICAgIGNscy5jbGFzc05hbWUubGVuZ3RoID4gMCxcbiAgICAgICgpID0+IGBDbGFzcyBiZWluZyByZWdpc3RlcmVkIGhhcyBhbiBlbXB0eS1zdHJpbmcgYXMgaXRzIGNsYXNzTmFtZSwgYCArXG4gICAgICAgICAgYHdoaWNoIGlzIGRpc2FsbG93ZWQuYCk7XG5cbiAgaWYgKHR5cGVvZiBwa2cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcGtnID0gJ0N1c3RvbSc7XG4gIH1cblxuICBpZiAodHlwZW9mIG5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgbmFtZSA9IGNscy5jbGFzc05hbWU7XG4gIH1cblxuICBjb25zdCBjbGFzc05hbWUgPSBuYW1lO1xuICBjb25zdCByZWdpc3Rlck5hbWUgPSBwa2cgKyAnPicgKyBjbGFzc05hbWU7XG5cbiAgU2VyaWFsaXphdGlvbk1hcC5yZWdpc3RlcihjbHMpO1xuICBHTE9CQUxfQ1VTVE9NX09CSkVDVC5zZXQocmVnaXN0ZXJOYW1lLCBjbHMpO1xuICBHTE9CQUxfQ1VTVE9NX05BTUVTLnNldChjbHMsIHJlZ2lzdGVyTmFtZSk7XG5cbiAgcmV0dXJuIGNscztcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHJlZ2lzdGVyZWQgbmFtZSBvZiBhIGNsYXNzLiBJZiB0aGUgY2xhc3MgaGFzIG5vdCBiZWVuIHJlZ2lzdGVyZWQsXG4gKiByZXR1cm4gdGhlIGNsYXNzIG5hbWUuXG4gKlxuICogQHBhcmFtIGNscyBUaGUgY2xhc3Mgd2Ugd2FudCB0byBnZXQgcmVnaXN0ZXIgbmFtZSBmb3IuIEl0IG11c3QgaGF2ZSBhIHB1YmxpY1xuICogICAgIHN0YXRpYyBtZW1iZXIgY2FsbGVkIGBjbGFzc05hbWVgIGRlZmluZWQuXG4gKiBAcmV0dXJucyByZWdpc3RlcmVkIG5hbWUgb3IgY2xhc3MgbmFtZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlZ2lzdGVyZWROYW1lPFQgZXh0ZW5kcyBTZXJpYWxpemFibGU+KFxuICAgIGNsczogU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4pIHtcbiAgaWYgKEdMT0JBTF9DVVNUT01fTkFNRVMuaGFzKGNscykpIHtcbiAgICByZXR1cm4gR0xPQkFMX0NVU1RPTV9OQU1FUy5nZXQoY2xzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY2xzLmNsYXNzTmFtZTtcbiAgfVxufVxuIl19