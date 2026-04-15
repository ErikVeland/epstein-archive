/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/**
 * Testing utilities.
 */
import { memory, Tensor, test_util, util } from '@tensorflow/tfjs-core';
// tslint:disable-next-line: no-imports-from-dist
import { ALL_ENVS, describeWithFlags } from '@tensorflow/tfjs-core/dist/jasmine_util';
import { ValueError } from '../errors';
/**
 * Expect values are close between a Tensor or number array.
 * @param actual
 * @param expected
 */
export function expectTensorsClose(actual, expected, epsilon) {
    if (actual == null) {
        throw new ValueError('First argument to expectTensorsClose() is not defined.');
    }
    if (expected == null) {
        throw new ValueError('Second argument to expectTensorsClose() is not defined.');
    }
    if (actual instanceof Tensor && expected instanceof Tensor) {
        if (actual.dtype !== expected.dtype) {
            throw new Error(`Data types do not match. Actual: '${actual.dtype}'. ` +
                `Expected: '${expected.dtype}'`);
        }
        if (!util.arraysEqual(actual.shape, expected.shape)) {
            throw new Error(`Shapes do not match. Actual: [${actual.shape}]. ` +
                `Expected: [${expected.shape}].`);
        }
    }
    const actualData = actual instanceof Tensor ? actual.dataSync() : actual;
    const expectedData = expected instanceof Tensor ? expected.dataSync() : expected;
    test_util.expectArraysClose(actualData, expectedData, epsilon);
}
/**
 * Expect values are not close between a Tensor or number array.
 * @param t1
 * @param t2
 */
export function expectTensorsNotClose(t1, t2, epsilon) {
    try {
        expectTensorsClose(t1, t2, epsilon);
    }
    catch (error) {
        return;
    }
    throw new Error('The two values are close at all elements.');
}
/**
 * Expect values in array are within a specified range, boundaries inclusive.
 * @param actual
 * @param expected
 */
export function expectTensorsValuesInRange(actual, low, high) {
    if (actual == null) {
        throw new ValueError('First argument to expectTensorsClose() is not defined.');
    }
    test_util.expectValuesInRange(actual.dataSync(), low, high);
}
/**
 * Describe tests to be run on CPU and GPU.
 * @param testName
 * @param tests
 */
export function describeMathCPUAndGPU(testName, tests) {
    describeWithFlags(testName, ALL_ENVS, () => {
        tests();
    });
}
/**
 * Describe tests to be run on CPU and GPU WebGL2.
 * @param testName
 * @param tests
 */
export function describeMathCPUAndWebGL2(testName, tests) {
    describeWithFlags(testName, {
        predicate: testEnv => (testEnv.flags == null || testEnv.flags['WEBGL_VERSION'] === 2)
    }, () => {
        tests();
    });
}
/**
 * Describe tests to be run on CPU only.
 * @param testName
 * @param tests
 */
export function describeMathCPU(testName, tests) {
    describeWithFlags(testName, { predicate: testEnv => testEnv.backendName === 'cpu' }, () => {
        tests();
    });
}
/**
 * Describe tests to be run on GPU only.
 * @param testName
 * @param tests
 */
export function describeMathGPU(testName, tests) {
    describeWithFlags(testName, { predicate: testEnv => testEnv.backendName === 'webgl' }, () => {
        tests();
    });
}
/**
 * Describe tests to be run on WebGL2 GPU only.
 * @param testName
 * @param tests
 */
export function describeMathWebGL2(testName, tests) {
    describeWithFlags(testName, {
        predicate: testEnv => testEnv.backendName === 'webgl' &&
            (testEnv.flags == null || testEnv.flags['WEBGL_VERSION'] === 2)
    }, () => {
        tests();
    });
}
/**
 * Check that a function only generates the expected number of new Tensors.
 *
 * The test  function is called twice, once to prime any regular constants and
 * once to ensure that additional copies aren't created/tensors aren't leaked.
 *
 * @param testFunc A fully curried (zero arg) version of the function to test.
 * @param numNewTensors The expected number of new Tensors that should exist.
 */
export function expectNoLeakedTensors(
// tslint:disable-next-line:no-any
testFunc, numNewTensors) {
    testFunc();
    const numTensorsBefore = memory().numTensors;
    testFunc();
    const numTensorsAfter = memory().numTensors;
    const actualNewTensors = numTensorsAfter - numTensorsBefore;
    if (actualNewTensors !== numNewTensors) {
        throw new ValueError(`Created an unexpected number of new ` +
            `Tensors.  Expected: ${numNewTensors}, created : ${actualNewTensors}. ` +
            `Please investigate the discrepency and/or use tidy.`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdF91dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy91dGlscy90ZXN0X3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUg7O0dBRUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDdEUsaURBQWlEO0FBQ2pELE9BQU8sRUFBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRixPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRXJDOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQzlCLE1BQXVCLEVBQUUsUUFBeUIsRUFBRSxPQUFnQjtJQUN0RSxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7UUFDbEIsTUFBTSxJQUFJLFVBQVUsQ0FDaEIsd0RBQXdELENBQUMsQ0FBQztLQUMvRDtJQUNELElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNwQixNQUFNLElBQUksVUFBVSxDQUNoQix5REFBeUQsQ0FBQyxDQUFDO0tBQ2hFO0lBQ0QsSUFBSSxNQUFNLFlBQVksTUFBTSxJQUFJLFFBQVEsWUFBWSxNQUFNLEVBQUU7UUFDMUQsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBcUMsTUFBTSxDQUFDLEtBQUssS0FBSztnQkFDdEQsY0FBYyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztTQUN0QztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ25ELE1BQU0sSUFBSSxLQUFLLENBQ1gsaUNBQWlDLE1B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Q2pELENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7S0FFcEUsRUFDRCxHQUFHLEVBQUU7UUFDSCxLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQjtBQUNqQyxrQ0FBa0M7QUFDbEMsUUFBbUIsRUFBRSxhQUFxQjtJQUM1QyxRQUFRLEVBQUUsQ0FBQztJQUNYLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO0lBQzdDLFFBQVEsRUFBRSxDQUFDO0lBQ1gsTUFBTSxlQUFlLEdBQUcsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO0lBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxHQUFHLGdCQUFnQixDQUFDO0lBQzVELElBQUksZ0JBQWdCLEtBQUssYUFBYSxFQUFFO1FBQ3RDLE1BQU0sSUFBSSxVQUFVLENBQ2hCLHNDQUFzQztZQUN0Qyx1QkFBdUIsYUFBYSxlQUNoQyxnQkFBZ0IsSUFBSTtZQUN4QixxREFBcUQsQ0FBQyxDQUFDO0tBQzVEO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGVcbiAqIGxpY2Vuc2UgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBvciBhdFxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogVGVzdGluZyB1dGlsaXRpZXMuXG4gKi9cblxuaW1wb3J0IHttZW1vcnksIFRlbnNvciwgdGVzdF91dGlsLCB1dGlsfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1pbXBvcnRzLWZyb20tZGlzdFxuaW1wb3J0IHtBTExfRU5WUywgZGVzY3JpYmVXaXRoRmxhZ3N9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZS9kaXN0L2phc21pbmVfdXRpbCc7XG5cbmltcG9ydCB7VmFsdWVFcnJvcn0gZnJvbSAnLi4vZXJyb3JzJztcblxuLyoqXG4gKiBFeHBlY3QgdmFsdWVzIGFyZSBjbG9zZSBiZXR3ZWVuIGEgVGVuc29yIG9yIG51bWJlciBhcnJheS5cbiAqIEBwYXJhbSBhY3R1YWxcbiAqIEBwYXJhbSBleHBlY3RlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwZWN0VGVuc29yc0Nsb3NlKFxuICAgIGFjdHVhbDogVGVuc29yfG51bWJlcltdLCBleHBlY3RlZDogVGVuc29yfG51bWJlcltdLCBlcHNpbG9uPzogbnVtYmVyKSB7XG4gIGlmIChhY3R1YWwgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAnRmlyc3QgYXJndW1lbnQgdG8gZXhwZWN0VGVuc29yc0Nsb3NlKCkgaXMgbm90IGRlZmluZWQuJyk7XG4gIH1cbiAgaWYgKGV4cGVjdGVkID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgJ1NlY29uZCBhcmd1bWVudCB0byBleHBlY3RUZW5zb3JzQ2xvc2UoKSBpcyBub3QgZGVmaW5lZC4nKTtcbiAgfVxuICBpZiAoYWN0dWFsIGluc3RhbmNlb2YgVGVuc29yICYmIGV4cGVjdGVkIGluc3RhbmNlb2YgVGVuc29yKSB7XG4gICAgaWYgKGFjdHVhbC5kdHlwZSAhPT0gZXhwZWN0ZWQuZHR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRGF0YSB0eXBlcyBkbyBub3QgbWF0Y2guIEFjdHVhbDogJyR7YWN0dWFsLmR0eXBlfScuIGAgK1xuICAgICAgICAgIGBFeHBlY3RlZDogJyR7ZXhwZWN0ZWQuZHR5cGV9J2ApO1xuICAgIH1cbiAgICBpZiAoIXV0aWwuYXJyYXlzRXF1YWwoYWN0dWFsLnNoYXBlLCBleHBlY3RlZC5zaGFwZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgU2hhcGVzIGRvIG5vdCBtYXRjaC4gQWN0dWFsOiBbJHthY3R1YWwuc2hhcGV9XS4gYCArXG4gICAgICAgICAgYEV4cGVjdGVkOiBbJHtleHBlY3RlZC5zaGFwZX1dLmApO1xuICAgIH1cbiAgfVxuICBjb25zdCBhY3R1YWxEYXRhID0gYWN0dWFsIGluc3RhbmNlb2YgVGVuc29yID8gYWN0dWFsLmRhdGFTeW5jKCkgOiBhY3R1YWw7XG4gIGNvbnN0IGV4cGVjdGVkRGF0YSA9XG4gICAgICBleHBlY3RlZCBpbnN0YW5jZW9mIFRlbnNvciA/IGV4cGVjdGVkLmRhdGFTeW5jKCkgOiBleHBlY3RlZDtcbiAgdGVzdF91dGlsLmV4cGVjdEFycmF5c0Nsb3NlKGFjdHVhbERhdGEsIGV4cGVjdGVkRGF0YSwgZXBzaWxvbik7XG59XG5cbi8qKlxuICogRXhwZWN0IHZhbHVlcyBhcmUgbm90IGNsb3NlIGJldHdlZW4gYSBUZW5zb3Igb3IgbnVtYmVyIGFycmF5LlxuICogQHBhcmFtIHQxXG4gKiBAcGFyYW0gdDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4cGVjdFRlbnNvcnNOb3RDbG9zZShcbiAgdDE6IFRlbnNvcnxudW1iZXJbXSwgdDI6IFRlbnNvcnxudW1iZXJbXSwgZXBzaWxvbj86IG51bWJlcikge1xudHJ5IHtcbiAgZXhwZWN0VGVuc29yc0Nsb3NlKHQxLCB0MiwgZXBzaWxvbik7XG59IGNhdGNoIChlcnJvcikge1xuICByZXR1cm47XG59XG50aHJvdyBuZXcgRXJyb3IoJ1RoZSB0d28gdmFsdWVzIGFyZSBjbG9zZSBhdCBhbGwgZWxlbWVudHMuJyk7XG59XG5cbi8qKlxuICogRXhwZWN0IHZhbHVlcyBpbiBhcnJheSBhcmUgd2l0aGluIGEgc3BlY2lmaWVkIHJhbmdlLCBib3VuZGFyaWVzIGluY2x1c2l2ZS5cbiAqIEBwYXJhbSBhY3R1YWxcbiAqIEBwYXJhbSBleHBlY3RlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwZWN0VGVuc29yc1ZhbHVlc0luUmFuZ2UoXG4gICAgYWN0dWFsOiBUZW5zb3IsIGxvdzogbnVtYmVyLCBoaWdoOiBudW1iZXIpIHtcbiAgaWYgKGFjdHVhbCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICdGaXJzdCBhcmd1bWVudCB0byBleHBlY3RUZW5zb3JzQ2xvc2UoKSBpcyBub3QgZGVmaW5lZC4nKTtcbiAgfVxuICB0ZXN0X3V0aWwuZXhwZWN0VmFsdWVzSW5SYW5nZShhY3R1YWwuZGF0YVN5bmMoKSwgbG93LCBoaWdoKTtcbn1cblxuLyoqXG4gKiBEZXNjcmliZSB0ZXN0cyB0byBiZSBydW4gb24gQ1BVIGFuZCBHUFUuXG4gKiBAcGFyYW0gdGVzdE5hbWVcbiAqIEBwYXJhbSB0ZXN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVNYXRoQ1BVQW5kR1BVKHRlc3ROYW1lOiBzdHJpbmcsIHRlc3RzOiAoKSA9PiB2b2lkKSB7XG4gIGRlc2NyaWJlV2l0aEZsYWdzKHRlc3ROYW1lLCBBTExfRU5WUywgKCkgPT4ge1xuICAgIHRlc3RzKCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIERlc2NyaWJlIHRlc3RzIHRvIGJlIHJ1biBvbiBDUFUgYW5kIEdQVSBXZWJHTDIuXG4gKiBAcGFyYW0gdGVzdE5hbWVcbiAqIEBwYXJhbSB0ZXN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVNYXRoQ1BVQW5kV2ViR0wyKHRlc3ROYW1lOiBzdHJpbmcsIHRlc3RzOiAoKSA9PiB2b2lkKSB7XG4gIGRlc2NyaWJlV2l0aEZsYWdzKFxuICAgICAgdGVzdE5hbWUsIHtcbiAgICAgICAgcHJlZGljYXRlOiB0ZXN0RW52ID0+XG4gICAgICAgICAgICAodGVzdEVudi5mbGFncyA9PSBudWxsIHx8IHRlc3RFbnYuZmxhZ3NbJ1dFQkdMX1ZFUlNJT04nXSA9PT0gMilcbiAgICAgIH0sXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHRlc3RzKCk7XG4gICAgICB9KTtcbn1cblxuLyoqXG4gKiBEZXNjcmliZSB0ZXN0cyB0byBiZSBydW4gb24gQ1BVIG9ubHkuXG4gKiBAcGFyYW0gdGVzdE5hbWVcbiAqIEBwYXJhbSB0ZXN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVNYXRoQ1BVKHRlc3ROYW1lOiBzdHJpbmcsIHRlc3RzOiAoKSA9PiB2b2lkKSB7XG4gIGRlc2NyaWJlV2l0aEZsYWdzKFxuICAgICAgdGVzdE5hbWUsIHtwcmVkaWNhdGU6IHRlc3RFbnYgPT4gdGVzdEVudi5iYWNrZW5kTmFtZSA9PT0gJ2NwdSd9LCAoKSA9PiB7XG4gICAgICAgIHRlc3RzKCk7XG4gICAgICB9KTtcbn1cblxuLyoqXG4gKiBEZXNjcmliZSB0ZXN0cyB0byBiZSBydW4gb24gR1BVIG9ubHkuXG4gKiBAcGFyYW0gdGVzdE5hbWVcbiAqIEBwYXJhbSB0ZXN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVNYXRoR1BVKHRlc3ROYW1lOiBzdHJpbmcsIHRlc3RzOiAoKSA9PiB2b2lkKSB7XG4gIGRlc2NyaWJlV2l0aEZsYWdzKFxuICAgICAgdGVzdE5hbWUsIHtwcmVkaWNhdGU6IHRlc3RFbnYgPT4gdGVzdEVudi5iYWNrZW5kTmFtZSA9PT0gJ3dlYmdsJ30sICgpID0+IHtcbiAgICAgICAgdGVzdHMoKTtcbiAgICAgIH0pO1xufVxuXG4vKipcbiAqIERlc2NyaWJlIHRlc3RzIHRvIGJlIHJ1biBvbiBXZWJHTDIgR1BVIG9ubHkuXG4gKiBAcGFyYW0gdGVzdE5hbWVcbiAqIEBwYXJhbSB0ZXN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVNYXRoV2ViR0wyKHRlc3ROYW1lOiBzdHJpbmcsIHRlc3RzOiAoKSA9PiB2b2lkKSB7XG4gIGRlc2NyaWJlV2l0aEZsYWdzKFxuICAgICAgdGVzdE5hbWUsIHtcbiAgICAgICAgcHJlZGljYXRlOiB0ZXN0RW52ID0+IHRlc3RFbnYuYmFja2VuZE5hbWUgPT09ICd3ZWJnbCcgJiZcbiAgICAgICAgICAgICh0ZXN0RW52LmZsYWdzID09IG51bGwgfHwgdGVzdEVudi5mbGFnc1snV0VCR0xfVkVSU0lPTiddID09PSAyKVxuXG4gICAgICB9LFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0ZXN0cygpO1xuICAgICAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2sgdGhhdCBhIGZ1bmN0aW9uIG9ubHkgZ2VuZXJhdGVzIHRoZSBleHBlY3RlZCBudW1iZXIgb2YgbmV3IFRlbnNvcnMuXG4gKlxuICogVGhlIHRlc3QgIGZ1bmN0aW9uIGlzIGNhbGxlZCB0d2ljZSwgb25jZSB0byBwcmltZSBhbnkgcmVndWxhciBjb25zdGFudHMgYW5kXG4gKiBvbmNlIHRvIGVuc3VyZSB0aGF0IGFkZGl0aW9uYWwgY29waWVzIGFyZW4ndCBjcmVhdGVkL3RlbnNvcnMgYXJlbid0IGxlYWtlZC5cbiAqXG4gKiBAcGFyYW0gdGVzdEZ1bmMgQSBmdWxseSBjdXJyaWVkICh6ZXJvIGFyZykgdmVyc2lvbiBvZiB0aGUgZnVuY3Rpb24gdG8gdGVzdC5cbiAqIEBwYXJhbSBudW1OZXdUZW5zb3JzIFRoZSBleHBlY3RlZCBudW1iZXIgb2YgbmV3IFRlbnNvcnMgdGhhdCBzaG91bGQgZXhpc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHBlY3ROb0xlYWtlZFRlbnNvcnMoXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIHRlc3RGdW5jOiAoKSA9PiBhbnksIG51bU5ld1RlbnNvcnM6IG51bWJlcikge1xuICB0ZXN0RnVuYygpO1xuICBjb25zdCBudW1UZW5zb3JzQmVmb3JlID0gbWVtb3J5KCkubnVtVGVuc29ycztcbiAgdGVzdEZ1bmMoKTtcbiAgY29uc3QgbnVtVGVuc29yc0FmdGVyID0gbWVtb3J5KCkubnVtVGVuc29ycztcbiAgY29uc3QgYWN0dWFsTmV3VGVuc29ycyA9IG51bVRlbnNvcnNBZnRlciAtIG51bVRlbnNvcnNCZWZvcmU7XG4gIGlmIChhY3R1YWxOZXdUZW5zb3JzICE9PSBudW1OZXdUZW5zb3JzKSB7XG4gICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgIGBDcmVhdGVkIGFuIHVuZXhwZWN0ZWQgbnVtYmVyIG9mIG5ldyBgICtcbiAgICAgICAgYFRlbnNvcnMuICBFeHBlY3RlZDogJHtudW1OZXdUZW5zb3JzfSwgY3JlYXRlZCA6ICR7XG4gICAgICAgICAgICBhY3R1YWxOZXdUZW5zb3JzfS4gYCArXG4gICAgICAgIGBQbGVhc2UgaW52ZXN0aWdhdGUgdGhlIGRpc2NyZXBlbmN5IGFuZC9vciB1c2UgdGlkeS5gKTtcbiAgfVxufVxuIl19