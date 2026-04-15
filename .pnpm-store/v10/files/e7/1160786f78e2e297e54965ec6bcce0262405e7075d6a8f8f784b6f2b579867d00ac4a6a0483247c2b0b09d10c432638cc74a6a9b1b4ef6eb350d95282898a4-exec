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
import * as tf from './index';
import { ALL_ENVS, describeWithFlags } from './jasmine_util';
function isFloat(num) {
    return num % 1 !== 0;
}
describeWithFlags('nextFrame', ALL_ENVS, () => {
    it('basic usage', async () => {
        const t0 = tf.util.now();
        await tf.nextFrame();
        const t1 = tf.util.now();
        // tf.nextFrame may take no more than 1ms to complete, so this test is
        // meaningful only if the precision of tf.util.now is better than 1ms.
        // After version 59, the precision of Firefox's tf.util.now becomes 2ms by
        // default for security issues, https://caniuse.com/?search=performance.now.
        // Then, this test is dropped for Firefox, even though it could be
        // set to better precision through browser setting,
        // https://github.com/lumen/threading-benchmarks/issues/7.
        if (isFloat(t0) || isFloat(t1)) {
            // If t0 or t1 have decimal point, it means the precision is better than
            // 1ms.
            expect(t1).toBeGreaterThan(t0);
        }
    });
    it('does not block timers', async () => {
        let flag = false;
        setTimeout(() => {
            flag = true;
        }, 50);
        const t0 = tf.util.now();
        expect(flag).toBe(false);
        while (tf.util.now() - t0 < 1000 && !flag) {
            await tf.nextFrame();
        }
        expect(flag).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlcl91dGlsX3Rlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi90ZmpzLWNvcmUvc3JjL2Jyb3dzZXJfdXRpbF90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE9BQU8sS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzlCLE9BQU8sRUFBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUUzRCxTQUFTLE9BQU8sQ0FBQyxHQUFXO0lBQzFCLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQUVELGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQzVDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0IsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN6QixNQUFNLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNyQixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXpCLHNFQUFzRTtRQUN0RSxzRUFBc0U7UUFDdEUsMEVBQTBFO1FBQzFFLDRFQUE0RTtRQUM1RSxrRUFBa0U7UUFDbEUsbURBQW1EO1FBQ25ELDBEQUEwRDtRQUMxRCxJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDOUIsd0VBQXdFO1lBQ3hFLE9BQU87WUFDUCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ1AsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ3pDLE1BQU0sRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO1NBQ3RCO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQgKiBhcyB0ZiBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7QUxMX0VOVlMsIGRlc2NyaWJlV2l0aEZsYWdzfSBmcm9tICcuL2phc21pbmVfdXRpbCc7XG5cbmZ1bmN0aW9uIGlzRmxvYXQobnVtOiBudW1iZXIpIHtcbiAgcmV0dXJuIG51bSAlIDEgIT09IDA7XG59XG5cbmRlc2NyaWJlV2l0aEZsYWdzKCduZXh0RnJhbWUnLCBBTExfRU5WUywgKCkgPT4ge1xuICBpdCgnYmFzaWMgdXNhZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdDAgPSB0Zi51dGlsLm5vdygpO1xuICAgIGF3YWl0IHRmLm5leHRGcmFtZSgpO1xuICAgIGNvbnN0IHQxID0gdGYudXRpbC5ub3coKTtcblxuICAgIC8vIHRmLm5leHRGcmFtZSBtYXkgdGFrZSBubyBtb3JlIHRoYW4gMW1zIHRvIGNvbXBsZXRlLCBzbyB0aGlzIHRlc3QgaXNcbiAgICAvLyBtZWFuaW5nZnVsIG9ubHkgaWYgdGhlIHByZWNpc2lvbiBvZiB0Zi51dGlsLm5vdyBpcyBiZXR0ZXIgdGhhbiAxbXMuXG4gICAgLy8gQWZ0ZXIgdmVyc2lvbiA1OSwgdGhlIHByZWNpc2lvbiBvZiBGaXJlZm94J3MgdGYudXRpbC5ub3cgYmVjb21lcyAybXMgYnlcbiAgICAvLyBkZWZhdWx0IGZvciBzZWN1cml0eSBpc3N1ZXMsIGh0dHBzOi8vY2FuaXVzZS5jb20vP3NlYXJjaD1wZXJmb3JtYW5jZS5ub3cuXG4gICAgLy8gVGhlbiwgdGhpcyB0ZXN0IGlzIGRyb3BwZWQgZm9yIEZpcmVmb3gsIGV2ZW4gdGhvdWdoIGl0IGNvdWxkIGJlXG4gICAgLy8gc2V0IHRvIGJldHRlciBwcmVjaXNpb24gdGhyb3VnaCBicm93c2VyIHNldHRpbmcsXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2x1bWVuL3RocmVhZGluZy1iZW5jaG1hcmtzL2lzc3Vlcy83LlxuICAgIGlmIChpc0Zsb2F0KHQwKSB8fCBpc0Zsb2F0KHQxKSkge1xuICAgICAgLy8gSWYgdDAgb3IgdDEgaGF2ZSBkZWNpbWFsIHBvaW50LCBpdCBtZWFucyB0aGUgcHJlY2lzaW9uIGlzIGJldHRlciB0aGFuXG4gICAgICAvLyAxbXMuXG4gICAgICBleHBlY3QodDEpLnRvQmVHcmVhdGVyVGhhbih0MCk7XG4gICAgfVxuICB9KTtcblxuICBpdCgnZG9lcyBub3QgYmxvY2sgdGltZXJzJywgYXN5bmMgKCkgPT4ge1xuICAgIGxldCBmbGFnID0gZmFsc2U7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBmbGFnID0gdHJ1ZTtcbiAgICB9LCA1MCk7XG4gICAgY29uc3QgdDAgPSB0Zi51dGlsLm5vdygpO1xuICAgIGV4cGVjdChmbGFnKS50b0JlKGZhbHNlKTtcbiAgICB3aGlsZSAodGYudXRpbC5ub3coKSAtIHQwIDwgMTAwMCAmJiAhZmxhZykge1xuICAgICAgYXdhaXQgdGYubmV4dEZyYW1lKCk7XG4gICAgfVxuICAgIGV4cGVjdChmbGFnKS50b0JlKHRydWUpO1xuICB9KTtcbn0pO1xuIl19