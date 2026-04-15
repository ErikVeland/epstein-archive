/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import { BrowserIndexedDB, BrowserIndexedDBManager } from '../io/indexed_db';
import { BrowserLocalStorage, BrowserLocalStorageManager } from '../io/local_storage';
import { ModelStoreManagerRegistry } from '../io/model_management';
import { isTypedArrayBrowser } from './is_typed_array_browser';
export class PlatformBrowser {
    constructor() {
        // For setTimeoutCustom
        this.messageName = 'setTimeoutCustom';
        this.functionRefs = [];
        this.handledMessageCount = 0;
        this.hasEventListener = false;
    }
    fetch(path, init) {
        return fetch(path, init);
    }
    now() {
        return performance.now();
    }
    encode(text, encoding) {
        if (encoding !== 'utf-8' && encoding !== 'utf8') {
            throw new Error(`Browser's encoder only supports utf-8, but got ${encoding}`);
        }
        if (this.textEncoder == null) {
            this.textEncoder = new TextEncoder();
        }
        return this.textEncoder.encode(text);
    }
    decode(bytes, encoding) {
        return new TextDecoder(encoding).decode(bytes);
    }
    // If the setTimeout nesting level is greater than 5 and timeout is less
    // than 4ms, timeout will be clamped to 4ms, which hurts the perf.
    // Interleaving window.postMessage and setTimeout will trick the browser and
    // avoid the clamp.
    setTimeoutCustom(functionRef, delay) {
        if (typeof window === 'undefined' ||
            !env().getBool('USE_SETTIMEOUTCUSTOM')) {
            setTimeout(functionRef, delay);
            return;
        }
        this.functionRefs.push(functionRef);
        setTimeout(() => {
            window.postMessage({ name: this.messageName, index: this.functionRefs.length - 1 }, '*');
        }, delay);
        if (!this.hasEventListener) {
            this.hasEventListener = true;
            window.addEventListener('message', (event) => {
                if (event.source === window && event.data.name === this.messageName) {
                    event.stopPropagation();
                    const functionRef = this.functionRefs[event.data.index];
                    functionRef();
                    this.handledMessageCount++;
                    if (this.handledMessageCount === this.functionRefs.length) {
                        this.functionRefs = [];
                        this.handledMessageCount = 0;
                    }
                }
            }, true);
        }
    }
    isTypedArray(a) {
        return isTypedArrayBrowser(a);
    }
}
if (env().get('IS_BROWSER')) {
    env().setPlatform('browser', new PlatformBrowser());
    // Register LocalStorage IOHandler
    try {
        ModelStoreManagerRegistry.registerManager(BrowserLocalStorage.URL_SCHEME, new BrowserLocalStorageManager());
    }
    catch (err) {
    }
    // Register IndexedDB IOHandler
    try {
        ModelStoreManagerRegistry.registerManager(BrowserIndexedDB.URL_SCHEME, new BrowserIndexedDBManager());
    }
    catch (err) {
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1fYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvcGxhdGZvcm1zL3BsYXRmb3JtX2Jyb3dzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzNFLE9BQU8sRUFBQyxtQkFBbUIsRUFBRSwwQkFBMEIsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3BGLE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBR2pFLE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTdELE1BQU0sT0FBTyxlQUFlO0lBQTVCO1FBS0UsdUJBQXVCO1FBQ04sZ0JBQVcsR0FBRyxrQkFBa0IsQ0FBQztRQUMxQyxpQkFBWSxHQUFlLEVBQUUsQ0FBQztRQUM5Qix3QkFBbUIsR0FBRyxDQUFDLENBQUM7UUFDeEIscUJBQWdCLEdBQUcsS0FBSyxDQUFDO0lBOERuQyxDQUFDO0lBNURDLEtBQUssQ0FBQyxJQUFZLEVBQUUsSUFBa0I7UUFDcEMsT0FBTyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFRCxHQUFHO1FBQ0QsT0FBTyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFZLEVBQUUsUUFBZ0I7UUFDbkMsSUFBSSxRQUFRLEtBQUssT0FBTyxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUU7WUFDL0MsTUFBTSxJQUFJLEtBQUssQ0FDWCxrREFBa0QsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUNuRTtRQUNE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QGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0ICcuLi9mbGFncyc7XG5cbmltcG9ydCB7ZW52fSBmcm9tICcuLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge0Jyb3dzZXJJbmRleGVkREIsIEJyb3dzZXJJbmRleGVkREJNYW5hZ2VyfSBmcm9tICcuLi9pby9pbmRleGVkX2RiJztcbmltcG9ydCB7QnJvd3NlckxvY2FsU3RvcmFnZSwgQnJvd3NlckxvY2FsU3RvcmFnZU1hbmFnZXJ9IGZyb20gJy4uL2lvL2xvY2FsX3N0b3JhZ2UnO1xuaW1wb3J0IHtNb2RlbFN0b3JlTWFuYWdlclJlZ2lzdHJ5fSBmcm9tICcuLi9pby9tb2RlbF9tYW5hZ2VtZW50JztcblxuaW1wb3J0IHtQbGF0Zm9ybX0gZnJvbSAnLi9wbGF0Zm9ybSc7XG5pbXBvcnQge2lzVHlwZWRBcnJheUJyb3dzZXJ9IGZyb20gJy4vaXNfdHlwZWRfYXJyYXlfYnJvd3Nlcic7XG5cbmV4cG9ydCBjbGFzcyBQbGF0Zm9ybUJyb3dzZXIgaW1wbGVtZW50cyBQbGF0Zm9ybSB7XG4gIC8vIEFjY29yZGluZyB0byB0aGUgc3BlYywgdGhlIGJ1aWx0LWluIGVuY29kZXIgY2FuIGRvIG9ubHkgVVRGLTggZW5jb2RpbmcuXG4gIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9UZXh0RW5jb2Rlci9UZXh0RW5jb2RlclxuICBwcml2YXRlIHRleHRFbmNvZGVyOiBUZXh0RW5jb2RlcjtcblxuICAvLyBGb3Igc2V0VGltZW91dEN1c3RvbVxuICBwcml2YXRlIHJlYWRvbmx5IG1lc3NhZ2VOYW1lID0gJ3NldFRpbWVvdXRDdXN0b20nO1xuICBwcml2YXRlIGZ1bmN0aW9uUmVmczogRnVuY3Rpb25bXSA9IFtdO1xuICBwcml2YXRlIGhhbmRsZWRNZXNzYWdlQ291bnQgPSAwO1xuICBwcml2YXRlIGhhc0V2ZW50TGlzdGVuZXIgPSBmYWxzZTtcblxuICBmZXRjaChwYXRoOiBzdHJpbmcsIGluaXQ/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgICByZXR1cm4gZmV0Y2gocGF0aCwgaW5pdCk7XG4gIH1cblxuICBub3coKTogbnVtYmVyIHtcbiAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gIH1cblxuICBlbmNvZGUodGV4dDogc3RyaW5nLCBlbmNvZGluZzogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgaWYgKGVuY29kaW5nICE9PSAndXRmLTgnICYmIGVuY29kaW5nICE9PSAndXRmOCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQnJvd3NlcidzIGVuY29kZXIgb25seSBzdXBwb3J0cyB1dGYtOCwgYnV0IGdvdCAke2VuY29kaW5nfWApO1xuICAgIH1cbiAgICBpZiAodGhpcy50ZXh0RW5jb2RlciA9PSBudWxsKSB7XG4gICAgICB0aGlzLnRleHRFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRleHRFbmNvZGVyLmVuY29kZSh0ZXh0KTtcbiAgfVxuICBkZWNvZGUoYnl0ZXM6IFVpbnQ4QXJyYXksIGVuY29kaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBuZXcgVGV4dERlY29kZXIoZW5jb2RpbmcpLmRlY29kZShieXRlcyk7XG4gIH1cblxuICAvLyBJZiB0aGUgc2V0VGltZW91dCBuZXN0aW5nIGxldmVsIGlzIGdyZWF0ZXIgdGhhbiA1IGFuZCB0aW1lb3V0IGlzIGxlc3NcbiAgLy8gdGhhbiA0bXMsIHRpbWVvdXQgd2lsbCBiZSBjbGFtcGVkIHRvIDRtcywgd2hpY2ggaHVydHMgdGhlIHBlcmYuXG4gIC8vIEludGVybGVhdmluZyB3aW5kb3cucG9zdE1lc3NhZ2UgYW5kIHNldFRpbWVvdXQgd2lsbCB0cmljayB0aGUgYnJvd3NlciBhbmRcbiAgLy8gYXZvaWQgdGhlIGNsYW1wLlxuICBzZXRUaW1lb3V0Q3VzdG9tKGZ1bmN0aW9uUmVmOiBGdW5jdGlvbiwgZGVsYXk6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICAhZW52KCkuZ2V0Qm9vbCgnVVNFX1NFVFRJTUVPVVRDVVNUT00nKSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvblJlZiwgZGVsYXkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZnVuY3Rpb25SZWZzLnB1c2goZnVuY3Rpb25SZWYpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgd2luZG93LnBvc3RNZXNzYWdlKFxuICAgICAgICAgIHtuYW1lOiB0aGlzLm1lc3NhZ2VOYW1lLCBpbmRleDogdGhpcy5mdW5jdGlvblJlZnMubGVuZ3RoIC0gMX0sICcqJyk7XG4gICAgfSwgZGVsYXkpO1xuXG4gICAgaWYgKCF0aGlzLmhhc0V2ZW50TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuaGFzRXZlbnRMaXN0ZW5lciA9IHRydWU7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChldmVudC5zb3VyY2UgPT09IHdpbmRvdyAmJiBldmVudC5kYXRhLm5hbWUgPT09IHRoaXMubWVzc2FnZU5hbWUpIHtcbiAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBjb25zdCBmdW5jdGlvblJlZiA9IHRoaXMuZnVuY3Rpb25SZWZzW2V2ZW50LmRhdGEuaW5kZXhdO1xuICAgICAgICAgIGZ1bmN0aW9uUmVmKCk7XG4gICAgICAgICAgdGhpcy5oYW5kbGVkTWVzc2FnZUNvdW50Kys7XG4gICAgICAgICAgaWYgKHRoaXMuaGFuZGxlZE1lc3NhZ2VDb3VudCA9PT0gdGhpcy5mdW5jdGlvblJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmZ1bmN0aW9uUmVmcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVkTWVzc2FnZUNvdW50ID0gMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIGlzVHlwZWRBcnJheShhOiB1bmtub3duKTogYSBpcyBVaW50OEFycmF5IHwgRmxvYXQzMkFycmF5IHwgSW50MzJBcnJheVxuICAgIHwgVWludDhDbGFtcGVkQXJyYXkge1xuICAgIHJldHVybiBpc1R5cGVkQXJyYXlCcm93c2VyKGEpO1xuICB9XG59XG5cbmlmIChlbnYoKS5nZXQoJ0lTX0JST1dTRVInKSkge1xuICBlbnYoKS5zZXRQbGF0Zm9ybSgnYnJvd3NlcicsIG5ldyBQbGF0Zm9ybUJyb3dzZXIoKSk7XG5cbiAgLy8gUmVnaXN0ZXIgTG9jYWxTdG9yYWdlIElPSGFuZGxlclxuICB0cnkge1xuICAgIE1vZGVsU3RvcmVNYW5hZ2VyUmVnaXN0cnkucmVnaXN0ZXJNYW5hZ2VyKFxuICAgICAgICBCcm93c2VyTG9jYWxTdG9yYWdlLlVSTF9TQ0hFTUUsIG5ldyBCcm93c2VyTG9jYWxTdG9yYWdlTWFuYWdlcigpKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gIH1cblxuICAvLyBSZWdpc3RlciBJbmRleGVkREIgSU9IYW5kbGVyXG4gIHRyeSB7XG4gICAgTW9kZWxTdG9yZU1hbmFnZXJSZWdpc3RyeS5yZWdpc3Rlck1hbmFnZXIoXG4gICAgICAgIEJyb3dzZXJJbmRleGVkREIuVVJMX1NDSEVNRSwgbmV3IEJyb3dzZXJJbmRleGVkREJNYW5hZ2VyKCkpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgfVxufVxuIl19