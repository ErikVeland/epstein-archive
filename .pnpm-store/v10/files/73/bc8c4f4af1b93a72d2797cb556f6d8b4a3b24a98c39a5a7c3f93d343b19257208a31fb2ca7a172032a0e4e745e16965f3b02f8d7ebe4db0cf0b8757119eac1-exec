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
 *
 * =============================================================================
 */
import { RingBuffer } from './ring_buffer';
class GrowingRingBuffer extends RingBuffer {
    /**
     * Constructs a `GrowingRingBuffer`.
     */
    constructor() {
        super(GrowingRingBuffer.INITIAL_CAPACITY);
    }
    isFull() {
        return false;
    }
    push(value) {
        if (super.isFull()) {
            this.expand();
        }
        super.push(value);
    }
    unshift(value) {
        if (super.isFull()) {
            this.expand();
        }
        super.unshift(value);
    }
    /**
     * Doubles the capacity of the buffer.
     */
    expand() {
        const newCapacity = this.capacity * 2;
        const newData = new Array(newCapacity);
        const len = this.length();
        // Rotate the buffer to start at index 0 again, since we can't just
        // allocate more space at the end.
        for (let i = 0; i < len; i++) {
            newData[i] = this.get(this.wrap(this.begin + i));
        }
        this.data = newData;
        this.capacity = newCapacity;
        this.doubledCapacity = 2 * this.capacity;
        this.begin = 0;
        this.end = len;
    }
}
GrowingRingBuffer.INITIAL_CAPACITY = 32;
export { GrowingRingBuffer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3Jvd2luZ19yaW5nX2J1ZmZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtZGF0YS9zcmMvdXRpbC9ncm93aW5nX3JpbmdfYnVmZmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBRUgsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV6QyxNQUFhLGlCQUFxQixTQUFRLFVBQWE7SUFHckQ7O09BRUc7SUFDSDtRQUNFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFUSxNQUFNO1FBQ2IsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRVEsSUFBSSxDQUFDLEtBQVE7UUFDcEIsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ2Y7UUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFUSxPQUFPLENBQUMsS0FBUTtRQUN2QixJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDZjtRQUNELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTTtRQUNaLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxDQUFJLFdBQVcsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUUxQixtRUFBbUU7UUFDbkUsa0NBQWtDO1FBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEQ7UUFFRCxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQztRQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDakIsQ0FBQzs7QUE5Q2Msa0NBQWdCLEdBQUcsRUFBRSxDQUFDO1NBRDFCLGlCQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7UmluZ0J1ZmZlcn0gZnJvbSAnLi9yaW5nX2J1ZmZlcic7XG5cbmV4cG9ydCBjbGFzcyBHcm93aW5nUmluZ0J1ZmZlcjxUPiBleHRlbmRzIFJpbmdCdWZmZXI8VD4ge1xuICBwcml2YXRlIHN0YXRpYyBJTklUSUFMX0NBUEFDSVRZID0gMzI7XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBgR3Jvd2luZ1JpbmdCdWZmZXJgLlxuICAgKi9cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoR3Jvd2luZ1JpbmdCdWZmZXIuSU5JVElBTF9DQVBBQ0lUWSk7XG4gIH1cblxuICBvdmVycmlkZSBpc0Z1bGwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgb3ZlcnJpZGUgcHVzaCh2YWx1ZTogVCkge1xuICAgIGlmIChzdXBlci5pc0Z1bGwoKSkge1xuICAgICAgdGhpcy5leHBhbmQoKTtcbiAgICB9XG4gICAgc3VwZXIucHVzaCh2YWx1ZSk7XG4gIH1cblxuICBvdmVycmlkZSB1bnNoaWZ0KHZhbHVlOiBUKSB7XG4gICAgaWYgKHN1cGVyLmlzRnVsbCgpKSB7XG4gICAgICB0aGlzLmV4cGFuZCgpO1xuICAgIH1cbiAgICBzdXBlci51bnNoaWZ0KHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3VibGVzIHRoZSBjYXBhY2l0eSBvZiB0aGUgYnVmZmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBleHBhbmQoKSB7XG4gICAgY29uc3QgbmV3Q2FwYWNpdHkgPSB0aGlzLmNhcGFjaXR5ICogMjtcbiAgICBjb25zdCBuZXdEYXRhID0gbmV3IEFycmF5PFQ+KG5ld0NhcGFjaXR5KTtcbiAgICBjb25zdCBsZW4gPSB0aGlzLmxlbmd0aCgpO1xuXG4gICAgLy8gUm90YXRlIHRoZSBidWZmZXIgdG8gc3RhcnQgYXQgaW5kZXggMCBhZ2Fpbiwgc2luY2Ugd2UgY2FuJ3QganVzdFxuICAgIC8vIGFsbG9jYXRlIG1vcmUgc3BhY2UgYXQgdGhlIGVuZC5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBuZXdEYXRhW2ldID0gdGhpcy5nZXQodGhpcy53cmFwKHRoaXMuYmVnaW4gKyBpKSk7XG4gICAgfVxuXG4gICAgdGhpcy5kYXRhID0gbmV3RGF0YTtcbiAgICB0aGlzLmNhcGFjaXR5ID0gbmV3Q2FwYWNpdHk7XG4gICAgdGhpcy5kb3VibGVkQ2FwYWNpdHkgPSAyICogdGhpcy5jYXBhY2l0eTtcbiAgICB0aGlzLmJlZ2luID0gMDtcbiAgICB0aGlzLmVuZCA9IGxlbjtcbiAgfVxufVxuIl19