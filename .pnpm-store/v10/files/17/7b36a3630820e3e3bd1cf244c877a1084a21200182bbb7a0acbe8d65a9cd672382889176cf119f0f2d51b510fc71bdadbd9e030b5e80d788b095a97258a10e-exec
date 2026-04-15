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
import * as tf from '../../index';
import { ALL_ENVS, describeWithFlags } from '../../jasmine_util';
describeWithFlags('staticRegexReplace', ALL_ENVS, () => {
    it('replaces the first instance of a string', async () => {
        const result = tf.string.staticRegexReplace(['this', 'is', 'a', 'test test'], 'test', 'result', false);
        expect(await result.data())
            .toEqual(['this', 'is', 'a', 'result test']);
    });
    it('replaces a string globally by default', async () => {
        const result = tf.string.staticRegexReplace(['this', 'is', 'a', 'test test'], 'test', 'result');
        expect(await result.data())
            .toEqual(['this', 'is', 'a', 'result result']);
    });
    it('matches using regex', async () => {
        const result = tf.string.staticRegexReplace(['This     will  have normal    whitespace'], ' +', ' ');
        expect(await result.data())
            .toEqual(['This will have normal whitespace']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljX3JlZ2V4X3JlcGxhY2VfdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvb3BzL3N0cmluZy9zdGF0aWNfcmVnZXhfcmVwbGFjZV90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE9BQU8sS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWxDLE9BQU8sRUFBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUUvRCxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3JELEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUN6QyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFN0QsTUFBTSxDQUFDLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBdUIsQ0FBQzthQUM3QyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHVDQUF1QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQ3pDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXRELE1BQU0sQ0FBQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQXVCLENBQUM7YUFDN0MsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUN6QyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTNELE1BQU0sQ0FBQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQXVCLENBQUM7YUFDN0MsT0FBTyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCAqIGFzIHRmIGZyb20gJy4uLy4uL2luZGV4JztcbmltcG9ydCB7IERhdGFUeXBlRm9yIH0gZnJvbSAnLi4vLi4vaW5kZXgnO1xuaW1wb3J0IHtBTExfRU5WUywgZGVzY3JpYmVXaXRoRmxhZ3N9IGZyb20gJy4uLy4uL2phc21pbmVfdXRpbCc7XG5cbmRlc2NyaWJlV2l0aEZsYWdzKCdzdGF0aWNSZWdleFJlcGxhY2UnLCBBTExfRU5WUywgKCkgPT4ge1xuICBpdCgncmVwbGFjZXMgdGhlIGZpcnN0IGluc3RhbmNlIG9mIGEgc3RyaW5nJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRmLnN0cmluZy5zdGF0aWNSZWdleFJlcGxhY2UoXG4gICAgICBbJ3RoaXMnLCAnaXMnLCAnYScsICd0ZXN0IHRlc3QnXSwgJ3Rlc3QnLCAncmVzdWx0JywgZmFsc2UpO1xuXG4gICAgZXhwZWN0KGF3YWl0IHJlc3VsdC5kYXRhPERhdGFUeXBlRm9yPHN0cmluZz4+KCkpXG4gICAgICAudG9FcXVhbChbJ3RoaXMnLCAnaXMnLCAnYScsICdyZXN1bHQgdGVzdCddKTtcbiAgfSk7XG5cbiAgaXQoJ3JlcGxhY2VzIGEgc3RyaW5nIGdsb2JhbGx5IGJ5IGRlZmF1bHQnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gdGYuc3RyaW5nLnN0YXRpY1JlZ2V4UmVwbGFjZShcbiAgICAgIFsndGhpcycsICdpcycsICdhJywgJ3Rlc3QgdGVzdCddLCAndGVzdCcsICdyZXN1bHQnKTtcblxuICAgIGV4cGVjdChhd2FpdCByZXN1bHQuZGF0YTxEYXRhVHlwZUZvcjxzdHJpbmc+PigpKVxuICAgICAgLnRvRXF1YWwoWyd0aGlzJywgJ2lzJywgJ2EnLCAncmVzdWx0IHJlc3VsdCddKTtcbiAgfSk7XG5cbiAgaXQoJ21hdGNoZXMgdXNpbmcgcmVnZXgnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gdGYuc3RyaW5nLnN0YXRpY1JlZ2V4UmVwbGFjZShcbiAgICAgIFsnVGhpcyAgICAgd2lsbCAgaGF2ZSBub3JtYWwgICAgd2hpdGVzcGFjZSddLCAnICsnLCAnICcpO1xuXG4gICAgZXhwZWN0KGF3YWl0IHJlc3VsdC5kYXRhPERhdGFUeXBlRm9yPHN0cmluZz4+KCkpXG4gICAgICAudG9FcXVhbChbJ1RoaXMgd2lsbCBoYXZlIG5vcm1hbCB3aGl0ZXNwYWNlJ10pO1xuICB9KTtcbn0pO1xuIl19