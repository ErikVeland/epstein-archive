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
import { backend_util } from '@tensorflow/tfjs-core';
import { assertNotComplex } from '../cpu_util';
import { createSimpleUnaryImpl } from './unary_impl';
/**
 * Template that creates a `KernelFunc` for unary ops.
 * @param name Kernel name.
 * @param op A `SimpleUnaryOperation` for the kernel.
 * @param dtype Optional. If set, the result has this dtype. Otherwise, the
 *     result has the same dtype as the input. This is mainly used in certain
 *     kernels that return bool type, such as isFinite, isInf, etc.
 */
export function unaryKernelFunc(name, op, dtype) {
    const impl = createSimpleUnaryImpl(op);
    return unaryKernelFuncFromImpl(name, impl, dtype);
}
/**
 * Template that creates a `KernelFunc` for unary ops from the given
 * `SimpleUnaryImpl`..
 * @param name Kernel name.
 * @param unaryImpl A `SimpleUnaryImpl` that implements the op.
 * @param dtype Optional. If set, the result has this dtype. Otherwise, the
 *     result has the same dtype as the input. This is mainly used in certain
 *     kernels that return bool type, such as isFinite, isInf, etc.
 */
export function unaryKernelFuncFromImpl(name, unaryImpl, dtype) {
    return ({ inputs, attrs, backend }) => {
        const { x } = inputs;
        assertNotComplex(x, name);
        const cpuBackend = backend;
        const values = cpuBackend.data.get(x.dataId).values;
        let decoded;
        if (x.dtype === 'string') {
            if (!Array.isArray(values)) {
                throw new Error('String tensor\'s value was not an instance of Array');
            }
            decoded = backend_util.fromUint8ToStringArray(values);
        }
        else {
            decoded = values;
        }
        const $dtype = dtype || x.dtype;
        const newValues = unaryImpl(decoded, $dtype, attrs);
        return cpuBackend.makeTensorInfo(x.shape, $dtype, newValues);
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5hcnlfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWJhY2tlbmQtY3B1L3NyYy91dGlscy91bmFyeV91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsWUFBWSxFQUF1QyxNQUFNLHVCQUF1QixDQUFDO0FBR3pGLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUM3QyxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFJbkQ7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxlQUFlLENBRTdCLElBQVksRUFBRSxFQUE4QixFQUM1QyxLQUFzQjtJQUV0QixNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBTyxFQUFFLENBQUMsQ0FBQztJQUU3QyxPQUFPLHVCQUF1QixDQUFPLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUVyQyxJQUFZLEVBQUUsU0FBZ0MsRUFDOUMsS0FBc0I7SUFFdEIsT0FBTyxDQUFDLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFO1FBQ2xDLE1BQU0sRUFBQyxDQUFDLEVBQUMsR0FBRyxNQUFxQixDQUFDO1FBQ2xDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUUxQixNQUFNLFVBQVUsR0FBRyxPQUF5QixDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDcEQsSUFBSSxPQUFxQixDQUFDO1FBQzFCLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQzthQUN4RTtZQUNELE9BQU8sR0FBRyxZQUFZLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUN0QyxDQUFDO1NBQ2hCO2FBQU07WUFDTCxPQUFPLEdBQUcsTUFBaUMsQ0FBQztTQUM3QztRQUVELE1BQU0sTUFBTSxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBdUIsQ0FBQztRQUNsRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxPQUFPLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDL0QsQ0FBQyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtiYWNrZW5kX3V0aWwsIERhdGFUeXBlRm9yLCBLZXJuZWxGdW5jLCBVbmFyeUlucHV0c30gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHtNYXRoQmFja2VuZENQVX0gZnJvbSAnLi4vYmFja2VuZF9jcHUnO1xuaW1wb3J0IHthc3NlcnROb3RDb21wbGV4fSBmcm9tICcuLi9jcHVfdXRpbCc7XG5pbXBvcnQge2NyZWF0ZVNpbXBsZVVuYXJ5SW1wbH0gZnJvbSAnLi91bmFyeV9pbXBsJztcblxuaW1wb3J0IHtTaW1wbGVVbmFyeUltcGwsIFNpbXBsZVVuYXJ5T3BlcmF0aW9ufSBmcm9tICcuL3VuYXJ5X3R5cGVzJztcblxuLyoqXG4gKiBUZW1wbGF0ZSB0aGF0IGNyZWF0ZXMgYSBgS2VybmVsRnVuY2AgZm9yIHVuYXJ5IG9wcy5cbiAqIEBwYXJhbSBuYW1lIEtlcm5lbCBuYW1lLlxuICogQHBhcmFtIG9wIEEgYFNpbXBsZVVuYXJ5T3BlcmF0aW9uYCBmb3IgdGhlIGtlcm5lbC5cbiAqIEBwYXJhbSBkdHlwZSBPcHRpb25hbC4gSWYgc2V0LCB0aGUgcmVzdWx0IGhhcyB0aGlzIGR0eXBlLiBPdGhlcndpc2UsIHRoZVxuICogICAgIHJlc3VsdCBoYXMgdGhlIHNhbWUgZHR5cGUgYXMgdGhlIGlucHV0LiBUaGlzIGlzIG1haW5seSB1c2VkIGluIGNlcnRhaW5cbiAqICAgICBrZXJuZWxzIHRoYXQgcmV0dXJuIGJvb2wgdHlwZSwgc3VjaCBhcyBpc0Zpbml0ZSwgaXNJbmYsIGV0Yy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuYXJ5S2VybmVsRnVuYzxJIGV4dGVuZHMgbnVtYmVyIHwgc3RyaW5nID0gbnVtYmVyLFxuICBPIGV4dGVuZHMgbnVtYmVyIHwgc3RyaW5nID0gbnVtYmVyPihcbiAgbmFtZTogc3RyaW5nLCBvcDogU2ltcGxlVW5hcnlPcGVyYXRpb248SSwgTz4sXG4gIGR0eXBlPzogRGF0YVR5cGVGb3I8Tz4pOiBLZXJuZWxGdW5jIHtcblxuICBjb25zdCBpbXBsID0gY3JlYXRlU2ltcGxlVW5hcnlJbXBsPEksIE8+KG9wKTtcblxuICByZXR1cm4gdW5hcnlLZXJuZWxGdW5jRnJvbUltcGw8SSwgTz4obmFtZSwgaW1wbCwgZHR5cGUpO1xufVxuXG4vKipcbiAqIFRlbXBsYXRlIHRoYXQgY3JlYXRlcyBhIGBLZXJuZWxGdW5jYCBmb3IgdW5hcnkgb3BzIGZyb20gdGhlIGdpdmVuXG4gKiBgU2ltcGxlVW5hcnlJbXBsYC4uXG4gKiBAcGFyYW0gbmFtZSBLZXJuZWwgbmFtZS5cbiAqIEBwYXJhbSB1bmFyeUltcGwgQSBgU2ltcGxlVW5hcnlJbXBsYCB0aGF0IGltcGxlbWVudHMgdGhlIG9wLlxuICogQHBhcmFtIGR0eXBlIE9wdGlvbmFsLiBJZiBzZXQsIHRoZSByZXN1bHQgaGFzIHRoaXMgZHR5cGUuIE90aGVyd2lzZSwgdGhlXG4gKiAgICAgcmVzdWx0IGhhcyB0aGUgc2FtZSBkdHlwZSBhcyB0aGUgaW5wdXQuIFRoaXMgaXMgbWFpbmx5IHVzZWQgaW4gY2VydGFpblxuICogICAgIGtlcm5lbHMgdGhhdCByZXR1cm4gYm9vbCB0eXBlLCBzdWNoIGFzIGlzRmluaXRlLCBpc0luZiwgZXRjLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5hcnlLZXJuZWxGdW5jRnJvbUltcGw8SSBleHRlbmRzIG51bWJlciB8IHN0cmluZyA9IG51bWJlcixcbiAgTyBleHRlbmRzIG51bWJlciB8IHN0cmluZyA9IG51bWJlcj4oXG4gIG5hbWU6IHN0cmluZywgdW5hcnlJbXBsOiBTaW1wbGVVbmFyeUltcGw8SSwgTz4sXG4gIGR0eXBlPzogRGF0YVR5cGVGb3I8Tz4pOiBLZXJuZWxGdW5jIHtcblxuICByZXR1cm4gKHtpbnB1dHMsIGF0dHJzLCBiYWNrZW5kfSkgPT4ge1xuICAgIGNvbnN0IHt4fSA9IGlucHV0cyBhcyBVbmFyeUlucHV0cztcbiAgICBhc3NlcnROb3RDb21wbGV4KHgsIG5hbWUpO1xuXG4gICAgY29uc3QgY3B1QmFja2VuZCA9IGJhY2tlbmQgYXMgTWF0aEJhY2tlbmRDUFU7XG4gICAgY29uc3QgdmFsdWVzID0gY3B1QmFja2VuZC5kYXRhLmdldCh4LmRhdGFJZCkudmFsdWVzO1xuICAgIGxldCBkZWNvZGVkOiBBcnJheUxpa2U8ST47XG4gICAgaWYgKHguZHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWVzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0cmluZyB0ZW5zb3JcXCdzIHZhbHVlIHdhcyBub3QgYW4gaW5zdGFuY2Ugb2YgQXJyYXknKTtcbiAgICAgIH1cbiAgICAgIGRlY29kZWQgPSBiYWNrZW5kX3V0aWwuZnJvbVVpbnQ4VG9TdHJpbmdBcnJheSh2YWx1ZXMpIGFzIHVua25vd24gYXNcbiAgICAgICAgQXJyYXlMaWtlPEk+O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWNvZGVkID0gdmFsdWVzIGFzIHVua25vd24gYXMgQXJyYXlMaWtlPEk+O1xuICAgIH1cblxuICAgIGNvbnN0ICRkdHlwZSA9IGR0eXBlIHx8IHguZHR5cGUgYXMgRGF0YVR5cGVGb3I8Tz47XG4gICAgY29uc3QgbmV3VmFsdWVzID0gdW5hcnlJbXBsKGRlY29kZWQsICRkdHlwZSwgYXR0cnMpO1xuICAgIHJldHVybiBjcHVCYWNrZW5kLm1ha2VUZW5zb3JJbmZvKHguc2hhcGUsICRkdHlwZSwgbmV3VmFsdWVzKTtcbiAgfTtcbn1cbiJdfQ==