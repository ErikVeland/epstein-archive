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
// We use the pattern below (as opposed to require('jasmine') to create the
// jasmine module in order to avoid loading node specific modules which may
// be ignored in browser environments but cannot be ignored in react-native
// due to the pre-bundling of dependencies that it must do.
// tslint:disable-next-line:no-require-imports
const jasmineRequire = require('jasmine-core/lib/jasmine-core/jasmine.js');
const jasmineCore = jasmineRequire.core(jasmineRequire);
import { KernelBackend } from './backends/backend';
import { ENGINE } from './engine';
import { env } from './environment';
import { purgeLocalStorageArtifacts } from './io/local_storage';
import { isPromise } from './util_base';
Error.stackTraceLimit = Infinity;
jasmineCore.DEFAULT_TIMEOUT_INTERVAL = 20000;
export const NODE_ENVS = {
    predicate: () => env().platformName === 'node'
};
export const CHROME_ENVS = {
    flags: { 'IS_CHROME': true }
};
export const BROWSER_ENVS = {
    predicate: () => env().platformName === 'browser'
};
export const SYNC_BACKEND_ENVS = {
    predicate: (testEnv) => testEnv.isDataSync === true
};
export const HAS_WORKER = {
    predicate: () => typeof (Worker) !== 'undefined' &&
        typeof (Blob) !== 'undefined' && typeof (URL) !== 'undefined'
};
export const HAS_NODE_WORKER = {
    predicate: () => {
        let hasWorker = true;
        try {
            require.resolve('worker_threads');
        }
        catch (_a) {
            hasWorker = false;
        }
        return typeof (process) !== 'undefined' && hasWorker;
    }
};
export const ALL_ENVS = {};
// Tests whether the current environment satisfies the set of constraints.
export function envSatisfiesConstraints(env, testEnv, constraints) {
    if (constraints == null) {
        return true;
    }
    if (constraints.flags != null) {
        for (const flagName in constraints.flags) {
            const flagValue = constraints.flags[flagName];
            if (env.get(flagName) !== flagValue) {
                return false;
            }
        }
    }
    if (constraints.predicate != null && !constraints.predicate(testEnv)) {
        return false;
    }
    return true;
}
/**
 * Add test filtering logic to Jasmine's specFilter hook.
 *
 * @param testFilters Used for include a test suite, with the ability
 *     to selectively exclude some of the tests.
 *     Either `include` or `startsWith` must exist for a `TestFilter`.
 *     Tests that have the substrings specified by the include or startsWith
 *     will be included in the test run, unless one of the substrings specified
 *     by `excludes` appears in the name.
 * @param customInclude Function to programmatically include a test.
 *     If this function returns true, a test will immediately run. Otherwise,
 *     `testFilters` is used for fine-grained filtering.
 *
 * If a test is not handled by `testFilters` or `customInclude`, the test will
 * be excluded in the test run.
 */
export function setupTestFilters(testFilters, customInclude) {
    const env = jasmine.getEnv();
    // Account for --grep flag passed to karma by saving the existing specFilter.
    const config = env.configuration();
    const grepFilter = config.specFilter;
    /**
     * Filter method that returns boolean, if a given test should run or be
     * ignored based on its name. The exclude list has priority over the
     * include list. Thus, if a test matches both the exclude and the include
     * list, it will be excluded.
     */
    // tslint:disable-next-line: no-any
    const specFilter = (spec) => {
        // Filter out tests if the --grep flag is passed.
        if (!grepFilter(spec)) {
            return false;
        }
        const name = spec.getFullName();
        if (customInclude(name)) {
            return true;
        }
        // Include tests of a test suite unless tests are in excludes list.
        for (let i = 0; i < testFilters.length; ++i) {
            const testFilter = testFilters[i];
            if ((testFilter.include != null &&
                name.indexOf(testFilter.include) > -1) ||
                (testFilter.startsWith != null &&
                    name.startsWith(testFilter.startsWith))) {
                if (testFilter.excludes != null) {
                    for (let j = 0; j < testFilter.excludes.length; j++) {
                        if (name.indexOf(testFilter.excludes[j]) > -1) {
                            return false;
                        }
                    }
                }
                return true;
            }
        }
        // Otherwise ignore the test.
        return false;
    };
    env.configure(Object.assign(Object.assign({}, config), { specFilter }));
}
export function parseTestEnvFromKarmaFlags(args, registeredTestEnvs) {
    let flags;
    let testEnvName;
    args.forEach((arg, i) => {
        if (arg === '--flags') {
            flags = JSON.parse(args[i + 1]);
        }
        else if (arg === '--testEnv') {
            testEnvName = args[i + 1];
        }
    });
    const testEnvNames = registeredTestEnvs.map(env => env.name).join(', ');
    if (flags != null && testEnvName == null) {
        throw new Error('--testEnv flag is required when --flags is present. ' +
            `Available values are [${testEnvNames}].`);
    }
    if (testEnvName == null) {
        return null;
    }
    let testEnv;
    registeredTestEnvs.forEach(env => {
        if (env.name === testEnvName) {
            testEnv = env;
        }
    });
    if (testEnv == null) {
        throw new Error(`Test environment with name ${testEnvName} not ` +
            `found. Available test environment names are ` +
            `${testEnvNames}`);
    }
    if (flags != null) {
        testEnv.flags = flags;
    }
    return testEnv;
}
export function describeWithFlags(name, constraints, tests) {
    if (TEST_ENVS.length === 0) {
        throw new Error(`Found no test environments. This is likely due to test environment ` +
            `registries never being imported or test environment registries ` +
            `being registered too late.`);
    }
    TEST_ENVS.forEach(testEnv => {
        env().setFlags(testEnv.flags);
        env().set('IS_TEST', true);
        if (envSatisfiesConstraints(env(), testEnv, constraints)) {
            const testName = name + ' ' + testEnv.name + ' ' + JSON.stringify(testEnv.flags || {});
            executeTests(testName, tests, testEnv);
        }
    });
}
export const TEST_ENVS = [];
// Whether a call to setTestEnvs has been called so we turn off
// registration. This allows command line overriding or programmatic
// overriding of the default registrations.
let testEnvSet = false;
export function setTestEnvs(testEnvs) {
    testEnvSet = true;
    TEST_ENVS.length = 0;
    TEST_ENVS.push(...testEnvs);
}
export function registerTestEnv(testEnv) {
    // When using an explicit call to setTestEnvs, turn off registration of
    // test environments because the explicit call will set the test
    // environments.
    if (testEnvSet) {
        return;
    }
    TEST_ENVS.push(testEnv);
}
function executeTests(testName, tests, testEnv) {
    describe(testName, () => {
        beforeAll(async () => {
            ENGINE.reset();
            if (testEnv.flags != null) {
                env().setFlags(testEnv.flags);
            }
            env().set('IS_TEST', true);
            // Await setting the new backend since it can have async init.
            await ENGINE.setBackend(testEnv.backendName);
        });
        beforeEach(() => {
            ENGINE.startScope();
        });
        afterEach(() => {
            ENGINE.endScope();
            ENGINE.disposeVariables();
        });
        afterAll(() => {
            ENGINE.reset();
        });
        tests(testEnv);
    });
}
export class TestKernelBackend extends KernelBackend {
    dispose() { }
}
let lock = Promise.resolve();
/**
 * Wraps a Jasmine spec's test function so it is run exclusively to others that
 * use runWithLock.
 *
 * @param spec The function that runs the spec. Must return a promise or call
 *     `done()`.
 *
 */
export function runWithLock(spec) {
    return () => {
        lock = lock.then(async () => {
            let done;
            const donePromise = new Promise((resolve, reject) => {
                done = (() => {
                    resolve();
                });
                done.fail = (message) => {
                    reject(message);
                };
            });
            purgeLocalStorageArtifacts();
            const result = spec(done);
            if (isPromise(result)) {
                await result;
            }
            else {
                await donePromise;
            }
        });
        return lock;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamFzbWluZV91dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9qYXNtaW5lX3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsMkVBQTJFO0FBQzNFLDJFQUEyRTtBQUMzRSwyRUFBMkU7QUFDM0UsMkRBQTJEO0FBQzNELDhDQUE4QztBQUM5QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsMENBQTBDLENBQUMsQ0FBQztBQUMzRSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNqRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxHQUFHLEVBQXFCLE1BQU0sZUFBZSxDQUFDO0FBQ3RELE9BQU8sRUFBQywwQkFBMEIsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzlELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFdEMsS0FBSyxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUM7QUFDakMsV0FBVyxDQUFDLHdCQUF3QixHQUFHLEtBQUssQ0FBQztBQU83QyxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQWdCO0lBQ3BDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLEtBQUssTUFBTTtDQUMvQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFnQjtJQUN0QyxLQUFLLEVBQUUsRUFBQyxXQUFXLEVBQUUsSUFBSSxFQUFDO0NBQzNCLENBQUM7QUFDRixNQUFNLENBQUMsTUFBTSxZQUFZLEdBQWdCO0lBQ3ZDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLEtBQUssU0FBUztDQUNsRCxD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Q0FBQyxHQUFHLEVBQUU7b0JBQ0osT0FBTyxFQUFFLENBQUM7Z0JBQ1osQ0FBQyxDQUFXLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFRLEVBQUUsRUFBRTtvQkFDdkIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNsQixDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVILDBCQUEwQixFQUFFLENBQUM7WUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTFCLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNyQixNQUFNLE1BQU0sQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE1BQU0sV0FBVyxDQUFDO2FBQ25CO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8vIFdlIHVzZSB0aGUgcGF0dGVybiBiZWxvdyAoYXMgb3Bwb3NlZCB0byByZXF1aXJlKCdqYXNtaW5lJykgdG8gY3JlYXRlIHRoZVxuLy8gamFzbWluZSBtb2R1bGUgaW4gb3JkZXIgdG8gYXZvaWQgbG9hZGluZyBub2RlIHNwZWNpZmljIG1vZHVsZXMgd2hpY2ggbWF5XG4vLyBiZSBpZ25vcmVkIGluIGJyb3dzZXIgZW52aXJvbm1lbnRzIGJ1dCBjYW5ub3QgYmUgaWdub3JlZCBpbiByZWFjdC1uYXRpdmVcbi8vIGR1ZSB0byB0aGUgcHJlLWJ1bmRsaW5nIG9mIGRlcGVuZGVuY2llcyB0aGF0IGl0IG11c3QgZG8uXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzXG5jb25zdCBqYXNtaW5lUmVxdWlyZSA9IHJlcXVpcmUoJ2phc21pbmUtY29yZS9saWIvamFzbWluZS1jb3JlL2phc21pbmUuanMnKTtcbmNvbnN0IGphc21pbmVDb3JlID0gamFzbWluZVJlcXVpcmUuY29yZShqYXNtaW5lUmVxdWlyZSk7XG5pbXBvcnQge0tlcm5lbEJhY2tlbmR9IGZyb20gJy4vYmFja2VuZHMvYmFja2VuZCc7XG5pbXBvcnQge0VOR0lORX0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHtlbnYsIEVudmlyb25tZW50LCBGbGFnc30gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3B1cmdlTG9jYWxTdG9yYWdlQXJ0aWZhY3RzfSBmcm9tICcuL2lvL2xvY2FsX3N0b3JhZ2UnO1xuaW1wb3J0IHtpc1Byb21pc2V9IGZyb20gJy4vdXRpbF9iYXNlJztcblxuRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ID0gSW5maW5pdHk7XG5qYXNtaW5lQ29yZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSAyMDAwMDtcblxuZXhwb3J0IHR5cGUgQ29uc3RyYWludHMgPSB7XG4gIGZsYWdzPzogRmxhZ3MsXG4gIHByZWRpY2F0ZT86ICh0ZXN0RW52OiBUZXN0RW52KSA9PiBib29sZWFuLFxufTtcblxuZXhwb3J0IGNvbnN0IE5PREVfRU5WUzogQ29uc3RyYWludHMgPSB7XG4gIHByZWRpY2F0ZTogKCkgPT4gZW52KCkucGxhdGZvcm1OYW1lID09PSAnbm9kZSdcbn07XG5leHBvcnQgY29uc3QgQ0hST01FX0VOVlM6IENvbnN0cmFpbnRzID0ge1xuICBmbGFnczogeydJU19DSFJPTUUnOiB0cnVlfVxufTtcbmV4cG9ydCBjb25zdCBCUk9XU0VSX0VOVlM6IENvbnN0cmFpbnRzID0ge1xuICBwcmVkaWNhdGU6ICgpID0+IGVudigpLnBsYXRmb3JtTmFtZSA9PT0gJ2Jyb3dzZXInXG59O1xuXG5leHBvcnQgY29uc3QgU1lOQ19CQUNLRU5EX0VOVlM6IENvbnN0cmFpbnRzID0ge1xuICBwcmVkaWNhdGU6ICh0ZXN0RW52OiBUZXN0RW52KSA9PiB0ZXN0RW52LmlzRGF0YVN5bmMgPT09IHRydWVcbn07XG5cbmV4cG9ydCBjb25zdCBIQVNfV09SS0VSID0ge1xuICBwcmVkaWNhdGU6ICgpID0+IHR5cGVvZiAoV29ya2VyKSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiAoQmxvYikgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiAoVVJMKSAhPT0gJ3VuZGVmaW5lZCdcbn07XG5cbmV4cG9ydCBjb25zdCBIQVNfTk9ERV9XT1JLRVIgPSB7XG4gIHByZWRpY2F0ZTogKCkgPT4ge1xuICAgIGxldCBoYXNXb3JrZXIgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUoJ3dvcmtlcl90aHJlYWRzJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICBoYXNXb3JrZXIgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVvZiAocHJvY2VzcykgIT09ICd1bmRlZmluZWQnICYmIGhhc1dvcmtlcjtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IEFMTF9FTlZTOiBDb25zdHJhaW50cyA9IHt9O1xuXG4vLyBUZXN0cyB3aGV0aGVyIHRoZSBjdXJyZW50IGVudmlyb25tZW50IHNhdGlzZmllcyB0aGUgc2V0IG9mIGNvbnN0cmFpbnRzLlxuZXhwb3J0IGZ1bmN0aW9uIGVudlNhdGlzZmllc0NvbnN0cmFpbnRzKFxuICAgIGVudjogRW52aXJvbm1lbnQsIHRlc3RFbnY6IFRlc3RFbnYsIGNvbnN0cmFpbnRzOiBDb25zdHJhaW50cyk6IGJvb2xlYW4ge1xuICBpZiAoY29uc3RyYWludHMgPT0gbnVsbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKGNvbnN0cmFpbnRzLmZsYWdzICE9IG51bGwpIHtcbiAgICBmb3IgKGNvbnN0IGZsYWdOYW1lIGluIGNvbnN0cmFpbnRzLmZsYWdzKSB7XG4gICAgICBjb25zdCBmbGFnVmFsdWUgPSBjb25zdHJhaW50cy5mbGFnc1tmbGFnTmFtZV07XG4gICAgICBpZiAoZW52LmdldChmbGFnTmFtZSkgIT09IGZsYWdWYWx1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChjb25zdHJhaW50cy5wcmVkaWNhdGUgIT0gbnVsbCAmJiAhY29uc3RyYWludHMucHJlZGljYXRlKHRlc3RFbnYpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlc3RGaWx0ZXIge1xuICBpbmNsdWRlPzogc3RyaW5nO1xuICBzdGFydHNXaXRoPzogc3RyaW5nO1xuICBleGNsdWRlcz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEFkZCB0ZXN0IGZpbHRlcmluZyBsb2dpYyB0byBKYXNtaW5lJ3Mgc3BlY0ZpbHRlciBob29rLlxuICpcbiAqIEBwYXJhbSB0ZXN0RmlsdGVycyBVc2VkIGZvciBpbmNsdWRlIGEgdGVzdCBzdWl0ZSwgd2l0aCB0aGUgYWJpbGl0eVxuICogICAgIHRvIHNlbGVjdGl2ZWx5IGV4Y2x1ZGUgc29tZSBvZiB0aGUgdGVzdHMuXG4gKiAgICAgRWl0aGVyIGBpbmNsdWRlYCBvciBgc3RhcnRzV2l0aGAgbXVzdCBleGlzdCBmb3IgYSBgVGVzdEZpbHRlcmAuXG4gKiAgICAgVGVzdHMgdGhhdCBoYXZlIHRoZSBzdWJzdHJpbmdzIHNwZWNpZmllZCBieSB0aGUgaW5jbHVkZSBvciBzdGFydHNXaXRoXG4gKiAgICAgd2lsbCBiZSBpbmNsdWRlZCBpbiB0aGUgdGVzdCBydW4sIHVubGVzcyBvbmUgb2YgdGhlIHN1YnN0cmluZ3Mgc3BlY2lmaWVkXG4gKiAgICAgYnkgYGV4Y2x1ZGVzYCBhcHBlYXJzIGluIHRoZSBuYW1lLlxuICogQHBhcmFtIGN1c3RvbUluY2x1ZGUgRnVuY3Rpb24gdG8gcHJvZ3JhbW1hdGljYWxseSBpbmNsdWRlIGEgdGVzdC5cbiAqICAgICBJZiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSwgYSB0ZXN0IHdpbGwgaW1tZWRpYXRlbHkgcnVuLiBPdGhlcndpc2UsXG4gKiAgICAgYHRlc3RGaWx0ZXJzYCBpcyB1c2VkIGZvciBmaW5lLWdyYWluZWQgZmlsdGVyaW5nLlxuICpcbiAqIElmIGEgdGVzdCBpcyBub3QgaGFuZGxlZCBieSBgdGVzdEZpbHRlcnNgIG9yIGBjdXN0b21JbmNsdWRlYCwgdGhlIHRlc3Qgd2lsbFxuICogYmUgZXhjbHVkZWQgaW4gdGhlIHRlc3QgcnVuLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0RmlsdGVycyhcbiAgICB0ZXN0RmlsdGVyczogVGVzdEZpbHRlcltdLCBjdXN0b21JbmNsdWRlOiAobmFtZTogc3RyaW5nKSA9PiBib29sZWFuKSB7XG4gIGNvbnN0IGVudiA9IGphc21pbmUuZ2V0RW52KCk7XG5cbiAgLy8gQWNjb3VudCBmb3IgLS1ncmVwIGZsYWcgcGFzc2VkIHRvIGthcm1hIGJ5IHNhdmluZyB0aGUgZXhpc3Rpbmcgc3BlY0ZpbHRlci5cbiAgY29uc3QgY29uZmlnID0gZW52LmNvbmZpZ3VyYXRpb24oKTtcbiAgY29uc3QgZ3JlcEZpbHRlciA9IGNvbmZpZy5zcGVjRmlsdGVyO1xuXG4gIC8qKlxuICAgKiBGaWx0ZXIgbWV0aG9kIHRoYXQgcmV0dXJucyBib29sZWFuLCBpZiBhIGdpdmVuIHRlc3Qgc2hvdWxkIHJ1biBvciBiZVxuICAgKiBpZ25vcmVkIGJhc2VkIG9uIGl0cyBuYW1lLiBUaGUgZXhjbHVkZSBsaXN0IGhhcyBwcmlvcml0eSBvdmVyIHRoZVxuICAgKiBpbmNsdWRlIGxpc3QuIFRodXMsIGlmIGEgdGVzdCBtYXRjaGVzIGJvdGggdGhlIGV4Y2x1ZGUgYW5kIHRoZSBpbmNsdWRlXG4gICAqIGxpc3QsIGl0IHdpbGwgYmUgZXhjbHVkZWQuXG4gICAqL1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWFueVxuICBjb25zdCBzcGVjRmlsdGVyID0gKHNwZWM6IGFueSkgPT4ge1xuICAgIC8vIEZpbHRlciBvdXQgdGVzdHMgaWYgdGhlIC0tZ3JlcCBmbGFnIGlzIHBhc3NlZC5cbiAgICBpZiAoIWdyZXBGaWx0ZXIoc3BlYykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lID0gc3BlYy5nZXRGdWxsTmFtZSgpO1xuXG4gICAgaWYgKGN1c3RvbUluY2x1ZGUobmFtZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEluY2x1ZGUgdGVzdHMgb2YgYSB0ZXN0IHN1aXRlIHVubGVzcyB0ZXN0cyBhcmUgaW4gZXhjbHVkZXMgbGlzdC5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRlc3RGaWx0ZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCB0ZXN0RmlsdGVyID0gdGVzdEZpbHRlcnNbaV07XG4gICAgICBpZiAoKHRlc3RGaWx0ZXIuaW5jbHVkZSAhPSBudWxsICYmXG4gICAgICAgICAgIG5hbWUuaW5kZXhPZih0ZXN0RmlsdGVyLmluY2x1ZGUpID4gLTEpIHx8XG4gICAgICAgICAgKHRlc3RGaWx0ZXIuc3RhcnRzV2l0aCAhPSBudWxsICYmXG4gICAgICAgICAgIG5hbWUuc3RhcnRzV2l0aCh0ZXN0RmlsdGVyLnN0YXJ0c1dpdGgpKSkge1xuICAgICAgICBpZiAodGVzdEZpbHRlci5leGNsdWRlcyAhPSBudWxsKSB7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0ZXN0RmlsdGVyLmV4Y2x1ZGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAobmFtZS5pbmRleE9mKHRlc3RGaWx0ZXIuZXhjbHVkZXNbal0pID4gLTEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgaWdub3JlIHRoZSB0ZXN0LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBlbnYuY29uZmlndXJlKHsuLi5jb25maWcsIHNwZWNGaWx0ZXJ9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVzdEVudkZyb21LYXJtYUZsYWdzKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCByZWdpc3RlcmVkVGVzdEVudnM6IFRlc3RFbnZbXSk6IFRlc3RFbnYge1xuICBsZXQgZmxhZ3M6IEZsYWdzO1xuICBsZXQgdGVzdEVudk5hbWU6IHN0cmluZztcblxuICBhcmdzLmZvckVhY2goKGFyZywgaSkgPT4ge1xuICAgIGlmIChhcmcgPT09ICctLWZsYWdzJykge1xuICAgICAgZmxhZ3MgPSBKU09OLnBhcnNlKGFyZ3NbaSArIDFdKTtcbiAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJy0tdGVzdEVudicpIHtcbiAgICAgIHRlc3RFbnZOYW1lID0gYXJnc1tpICsgMV07XG4gICAgfVxuICB9KTtcblxuICBjb25zdCB0ZXN0RW52TmFtZXMgPSByZWdpc3RlcmVkVGVzdEVudnMubWFwKGVudiA9PiBlbnYubmFtZSkuam9pbignLCAnKTtcbiAgaWYgKGZsYWdzICE9IG51bGwgJiYgdGVzdEVudk5hbWUgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJy0tdGVzdEVudiBmbGFnIGlzIHJlcXVpcmVkIHdoZW4gLS1mbGFncyBpcyBwcmVzZW50LiAnICtcbiAgICAgICAgYEF2YWlsYWJsZSB2YWx1ZXMgYXJlIFske3Rlc3RFbnZOYW1lc31dLmApO1xuICB9XG4gIGlmICh0ZXN0RW52TmFtZSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBsZXQgdGVzdEVudjogVGVzdEVudjtcbiAgcmVnaXN0ZXJlZFRlc3RFbnZzLmZvckVhY2goZW52ID0+IHtcbiAgICBpZiAoZW52Lm5hbWUgPT09IHRlc3RFbnZOYW1lKSB7XG4gICAgICB0ZXN0RW52ID0gZW52O1xuICAgIH1cbiAgfSk7XG4gIGlmICh0ZXN0RW52ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUZXN0IGVudmlyb25tZW50IHdpdGggbmFtZSAke3Rlc3RFbnZOYW1lfSBub3QgYCArXG4gICAgICAgIGBmb3VuZC4gQXZhaWxhYmxlIHRlc3QgZW52aXJvbm1lbnQgbmFtZXMgYXJlIGAgK1xuICAgICAgICBgJHt0ZXN0RW52TmFtZXN9YCk7XG4gIH1cbiAgaWYgKGZsYWdzICE9IG51bGwpIHtcbiAgICB0ZXN0RW52LmZsYWdzID0gZmxhZ3M7XG4gIH1cblxuICByZXR1cm4gdGVzdEVudjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlV2l0aEZsYWdzKFxuICAgIG5hbWU6IHN0cmluZywgY29uc3RyYWludHM6IENvbnN0cmFpbnRzLCB0ZXN0czogKGVudjogVGVzdEVudikgPT4gdm9pZCkge1xuICBpZiAoVEVTVF9FTlZTLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEZvdW5kIG5vIHRlc3QgZW52aXJvbm1lbnRzLiBUaGlzIGlzIGxpa2VseSBkdWUgdG8gdGVzdCBlbnZpcm9ubWVudCBgICtcbiAgICAgICAgYHJlZ2lzdHJpZXMgbmV2ZXIgYmVpbmcgaW1wb3J0ZWQgb3IgdGVzdCBlbnZpcm9ubWVudCByZWdpc3RyaWVzIGAgK1xuICAgICAgICBgYmVpbmcgcmVnaXN0ZXJlZCB0b28gbGF0ZS5gKTtcbiAgfVxuXG4gIFRFU1RfRU5WUy5mb3JFYWNoKHRlc3RFbnYgPT4ge1xuICAgIGVudigpLnNldEZsYWdzKHRlc3RFbnYuZmxhZ3MpO1xuICAgIGVudigpLnNldCgnSVNfVEVTVCcsIHRydWUpO1xuICAgIGlmIChlbnZTYXRpc2ZpZXNDb25zdHJhaW50cyhlbnYoKSwgdGVzdEVudiwgY29uc3RyYWludHMpKSB7XG4gICAgICBjb25zdCB0ZXN0TmFtZSA9XG4gICAgICAgICAgbmFtZSArICcgJyArIHRlc3RFbnYubmFtZSArICcgJyArIEpTT04uc3RyaW5naWZ5KHRlc3RFbnYuZmxhZ3MgfHwge30pO1xuICAgICAgZXhlY3V0ZVRlc3RzKHRlc3ROYW1lLCB0ZXN0cywgdGVzdEVudik7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZXN0RW52IHtcbiAgbmFtZTogc3RyaW5nO1xuICBiYWNrZW5kTmFtZTogc3RyaW5nO1xuICBmbGFncz86IEZsYWdzO1xuICBpc0RhdGFTeW5jPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IFRFU1RfRU5WUzogVGVzdEVudltdID0gW107XG5cbi8vIFdoZXRoZXIgYSBjYWxsIHRvIHNldFRlc3RFbnZzIGhhcyBiZWVuIGNhbGxlZCBzbyB3ZSB0dXJuIG9mZlxuLy8gcmVnaXN0cmF0aW9uLiBUaGlzIGFsbG93cyBjb21tYW5kIGxpbmUgb3ZlcnJpZGluZyBvciBwcm9ncmFtbWF0aWNcbi8vIG92ZXJyaWRpbmcgb2YgdGhlIGRlZmF1bHQgcmVnaXN0cmF0aW9ucy5cbmxldCB0ZXN0RW52U2V0ID0gZmFsc2U7XG5leHBvcnQgZnVuY3Rpb24gc2V0VGVzdEVudnModGVzdEVudnM6IFRlc3RFbnZbXSkge1xuICB0ZXN0RW52U2V0ID0gdHJ1ZTtcbiAgVEVTVF9FTlZTLmxlbmd0aCA9IDA7XG4gIFRFU1RfRU5WUy5wdXNoKC4uLnRlc3RFbnZzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyVGVzdEVudih0ZXN0RW52OiBUZXN0RW52KSB7XG4gIC8vIFdoZW4gdXNpbmcgYW4gZXhwbGljaXQgY2FsbCB0byBzZXRUZXN0RW52cywgdHVybiBvZmYgcmVnaXN0cmF0aW9uIG9mXG4gIC8vIHRlc3QgZW52aXJvbm1lbnRzIGJlY2F1c2UgdGhlIGV4cGxpY2l0IGNhbGwgd2lsbCBzZXQgdGhlIHRlc3RcbiAgLy8gZW52aXJvbm1lbnRzLlxuICBpZiAodGVzdEVudlNldCkge1xuICAgIHJldHVybjtcbiAgfVxuICBURVNUX0VOVlMucHVzaCh0ZXN0RW52KTtcbn1cblxuZnVuY3Rpb24gZXhlY3V0ZVRlc3RzKFxuICAgIHRlc3ROYW1lOiBzdHJpbmcsIHRlc3RzOiAoZW52OiBUZXN0RW52KSA9PiB2b2lkLCB0ZXN0RW52OiBUZXN0RW52KSB7XG4gIGRlc2NyaWJlKHRlc3ROYW1lLCAoKSA9PiB7XG4gICAgYmVmb3JlQWxsKGFzeW5jICgpID0+IHtcbiAgICAgIEVOR0lORS5yZXNldCgpO1xuICAgICAgaWYgKHRlc3RFbnYuZmxhZ3MgIT0gbnVsbCkge1xuICAgICAgICBlbnYoKS5zZXRGbGFncyh0ZXN0RW52LmZsYWdzKTtcbiAgICAgIH1cbiAgICAgIGVudigpLnNldCgnSVNfVEVTVCcsIHRydWUpO1xuICAgICAgLy8gQXdhaXQgc2V0dGluZyB0aGUgbmV3IGJhY2tlbmQgc2luY2UgaXQgY2FuIGhhdmUgYXN5bmMgaW5pdC5cbiAgICAgIGF3YWl0IEVOR0lORS5zZXRCYWNrZW5kKHRlc3RFbnYuYmFja2VuZE5hbWUpO1xuICAgIH0pO1xuXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBFTkdJTkUuc3RhcnRTY29wZSgpO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJFYWNoKCgpID0+IHtcbiAgICAgIEVOR0lORS5lbmRTY29wZSgpO1xuICAgICAgRU5HSU5FLmRpc3Bvc2VWYXJpYWJsZXMoKTtcbiAgICB9KTtcblxuICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgIEVOR0lORS5yZXNldCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdHModGVzdEVudik7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgVGVzdEtlcm5lbEJhY2tlbmQgZXh0ZW5kcyBLZXJuZWxCYWNrZW5kIHtcbiAgb3ZlcnJpZGUgZGlzcG9zZSgpOiB2b2lkIHt9XG59XG5cbmxldCBsb2NrID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbi8qKlxuICogV3JhcHMgYSBKYXNtaW5lIHNwZWMncyB0ZXN0IGZ1bmN0aW9uIHNvIGl0IGlzIHJ1biBleGNsdXNpdmVseSB0byBvdGhlcnMgdGhhdFxuICogdXNlIHJ1bldpdGhMb2NrLlxuICpcbiAqIEBwYXJhbSBzcGVjIFRoZSBmdW5jdGlvbiB0aGF0IHJ1bnMgdGhlIHNwZWMuIE11c3QgcmV0dXJuIGEgcHJvbWlzZSBvciBjYWxsXG4gKiAgICAgYGRvbmUoKWAuXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuV2l0aExvY2soc3BlYzogKGRvbmU/OiBEb25lRm4pID0+IFByb21pc2U8dm9pZD58IHZvaWQpIHtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBsb2NrID0gbG9jay50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgIGxldCBkb25lOiBEb25lRm47XG4gICAgICBjb25zdCBkb25lUHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgZG9uZSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgIH0pIGFzIERvbmVGbjtcbiAgICAgICAgZG9uZS5mYWlsID0gKG1lc3NhZ2U/KSA9PiB7XG4gICAgICAgICAgcmVqZWN0KG1lc3NhZ2UpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIHB1cmdlTG9jYWxTdG9yYWdlQXJ0aWZhY3RzKCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBzcGVjKGRvbmUpO1xuXG4gICAgICBpZiAoaXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgYXdhaXQgcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZG9uZVByb21pc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGxvY2s7XG4gIH07XG59XG4iXX0=