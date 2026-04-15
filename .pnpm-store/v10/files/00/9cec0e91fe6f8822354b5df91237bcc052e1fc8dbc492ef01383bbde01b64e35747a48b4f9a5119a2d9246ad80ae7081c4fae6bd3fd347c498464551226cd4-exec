/**
 * @license
 * Copyright 2023 Google LLC.
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
// TODO(mattSoulanille): Replace this with automatic polyfilling using core-js.
export function* matchAll(str, regexp) {
    // Remove the global flag since str.match does not work with it.
    const flags = regexp.flags.replace(/g/g, '');
    regexp = new RegExp(regexp, flags);
    let match = str.match(regexp);
    let offset = 0;
    let restOfStr = str;
    while (match != null) {
        if (match.index == null) {
            console.error(match);
            throw new Error(`Matched string '${match[0]}' has no index`);
        }
        // Remove up to and including the first match from the input string
        // so the next loop can find the next match.
        const matchEnd = match.index + match[0].length;
        restOfStr = restOfStr.slice(matchEnd);
        // Adjust the match to look like a result from matchAll.
        match.index += offset;
        match.input = str;
        offset += matchEnd;
        yield match;
        match = restOfStr.match(regexp);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hfYWxsX3BvbHlmaWxsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9ubHAvbWF0Y2hfYWxsX3BvbHlmaWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILCtFQUErRTtBQUMvRSxNQUFNLFNBQVUsQ0FBQyxDQUFBLFFBQVEsQ0FBQyxHQUFXLEVBQUUsTUFBYztJQUNuRCxnRUFBZ0U7SUFDaEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFbkMsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUM7SUFDcEIsT0FBTyxLQUFLLElBQUksSUFBSSxFQUFFO1FBQ3BCLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxJQUFJLEVBQUU7WUFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDOUQ7UUFFRCxtRUFBbUU7UUFDbkUsNENBQTRDO1FBQzVDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV0Qyx3REFBd0Q7UUFDeEQsS0FBSyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUM7UUFDdEIsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUM7UUFFbEIsTUFBTSxJQUFJLFFBQVEsQ0FBQztRQUNuQixNQUFNLEtBQUssQ0FBQztRQUNaLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ2pDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTEMuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLy8gVE9ETyhtYXR0U291bGFuaWxsZSk6IFJlcGxhY2UgdGhpcyB3aXRoIGF1dG9tYXRpYyBwb2x5ZmlsbGluZyB1c2luZyBjb3JlLWpzLlxuZXhwb3J0IGZ1bmN0aW9uICptYXRjaEFsbChzdHI6IHN0cmluZywgcmVnZXhwOiBSZWdFeHApOiBJdGVyYWJsZUl0ZXJhdG9yPFJlZ0V4cE1hdGNoQXJyYXk+IHtcbiAgLy8gUmVtb3ZlIHRoZSBnbG9iYWwgZmxhZyBzaW5jZSBzdHIubWF0Y2ggZG9lcyBub3Qgd29yayB3aXRoIGl0LlxuICBjb25zdCBmbGFncyA9IHJlZ2V4cC5mbGFncy5yZXBsYWNlKC9nL2csICcnKTtcbiAgcmVnZXhwID0gbmV3IFJlZ0V4cChyZWdleHAsIGZsYWdzKTtcblxuICBsZXQgbWF0Y2ggPSBzdHIubWF0Y2gocmVnZXhwKTtcbiAgbGV0IG9mZnNldCA9IDA7XG4gIGxldCByZXN0T2ZTdHIgPSBzdHI7XG4gIHdoaWxlIChtYXRjaCAhPSBudWxsKSB7XG4gICAgaWYgKG1hdGNoLmluZGV4ID09IG51bGwpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IobWF0Y2gpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXRjaGVkIHN0cmluZyAnJHttYXRjaFswXX0nIGhhcyBubyBpbmRleGApO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSB1cCB0byBhbmQgaW5jbHVkaW5nIHRoZSBmaXJzdCBtYXRjaCBmcm9tIHRoZSBpbnB1dCBzdHJpbmdcbiAgICAvLyBzbyB0aGUgbmV4dCBsb29wIGNhbiBmaW5kIHRoZSBuZXh0IG1hdGNoLlxuICAgIGNvbnN0IG1hdGNoRW5kID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgcmVzdE9mU3RyID0gcmVzdE9mU3RyLnNsaWNlKG1hdGNoRW5kKTtcblxuICAgIC8vIEFkanVzdCB0aGUgbWF0Y2ggdG8gbG9vayBsaWtlIGEgcmVzdWx0IGZyb20gbWF0Y2hBbGwuXG4gICAgbWF0Y2guaW5kZXggKz0gb2Zmc2V0O1xuICAgIG1hdGNoLmlucHV0ID0gc3RyO1xuXG4gICAgb2Zmc2V0ICs9IG1hdGNoRW5kO1xuICAgIHlpZWxkIG1hdGNoO1xuICAgIG1hdGNoID0gcmVzdE9mU3RyLm1hdGNoKHJlZ2V4cCk7XG4gIH1cbn1cbiJdfQ==