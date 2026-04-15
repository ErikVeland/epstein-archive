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
import { tensorScatterUpdate, tidy } from '@tensorflow/tfjs-core';
import { LayersModel } from '../../engine/training';
import { NotImplementedError } from '../../errors';
export function tensorToArr(input) {
    return Array.from(input.dataSync());
}
export function tensorArrTo2DArr(inputs) {
    return inputs.map(input => tensorToArr(input));
}
/**
 * Returns a new Tensor with `updates` inserted into `inputs` starting at the
 * index `startIndices`.
 *
 * @param inputs Tensor to "modify"
 * @param startIndices the starting index to insert the slice.
 *  Length must be equal to `inputs.rank`;
 * @param updates the update tensor. Shape must fit within `inputs` shape.
 * @returns a new tensor with the modification.
 */
export function sliceUpdate(inputs, startIndices, updates) {
    return tidy(() => {
        const indices = [];
        /**
         * Computes the update indices by iterating through all indices from
         * `startIndices` to `startIndices + updates.shape`.
         */
        function createIndices(idx, curr) {
            if (curr.length === startIndices.length) {
                indices.push(curr.slice());
                return;
            }
            const start = startIndices[idx];
            const end = start + updates.shape[idx];
            for (let i = start; i < end; i++) {
                curr.push(i);
                createIndices(idx + 1, curr);
                curr.pop();
            }
        }
        createIndices(0, []);
        // Flatten the updates to match length of its update indices.
        updates = updates.reshape([updates.size]);
        return tensorScatterUpdate(inputs, indices, updates);
    });
}
function packXYSampleWeight(x, y, sampleWeight) {
    throw new NotImplementedError();
}
function unPackXYSampleWeight(data) {
    throw new NotImplementedError();
}
// TODO(pforderique): Figure out a workaround for `tf.data.Dataset`.
function convertInputsToDataset(x, y, sampleWeight, batchSize) {
    throw new NotImplementedError();
}
function trainValidationSplit(arrays, validationSplit) {
    throw new NotImplementedError();
}
class PipelineModel extends LayersModel {
    constructor(args) {
        var _a;
        super(args);
        this.includePreprocessing = (_a = args.includePreprocessing) !== null && _a !== void 0 ? _a : true;
    }
    /**
     * An overridable function which preprocesses features.
     */
    preprocessFeatures(x) {
        return x;
    }
    /**
     * An overridable function which preprocesses labels.
     */
    preprocessLabels(y) {
        return y;
    }
    /**
     * An overridable function which preprocesses entire samples.
     */
    preprocessSamples(x, y, sampleWeight) {
        throw new NotImplementedError();
    }
    // ---------------------------------------------------------------------------
    // Below are overrides to LayersModel methods to apply the functions above.
    // ---------------------------------------------------------------------------
    fit(x, y, args = {}) {
        throw new NotImplementedError(`Uses ${convertInputsToDataset}, ${trainValidationSplit} ` +
            `${packXYSampleWeight}, and ${unPackXYSampleWeight}`);
    }
    evaluate(x, y, args) {
        throw new NotImplementedError();
    }
    predict(x, args) {
        throw new NotImplementedError();
    }
    trainOnBatch(x, y, sampleWeight) {
        throw new NotImplementedError();
    }
    predictOnBatch(x) {
        throw new NotImplementedError();
    }
}
/** @nocollapse */
PipelineModel.className = 'PipelineModel';
export { PipelineModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL25scC91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQXNDLG1CQUFtQixFQUFFLElBQUksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBSXRHLE9BQU8sRUFBRSxXQUFXLEVBQXFCLE1BQU0sdUJBQXVCLENBQUM7QUFFdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRW5ELE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBYTtJQUN2QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUF5QixDQUFDO0FBQzlELENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsTUFBZ0I7SUFDL0MsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQ3ZCLE1BQWMsRUFBRSxZQUFzQixFQUFFLE9BQWU7SUFDekQsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ2YsTUFBTSxPQUFPLEdBQWUsRUFBRSxDQUFDO1FBQy9COzs7V0FHRztRQUNILFNBQVMsYUFBYSxDQUFDLEdBQVcsRUFBRSxJQUFjO1lBQ2hELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxZQUFZLENBQUMsTUFBTSxFQUFFO2dCQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQixPQUFPO2FBQ1I7WUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsTUFBTSxHQUFH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Q29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7IE1vZGVsUHJlZGljdENvbmZpZywgU2NhbGFyLCBUZW5zb3IsIHRlbnNvclNjYXR0ZXJVcGRhdGUsIHRpZHkgfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQgeyBIaXN0b3J5IH0gZnJvbSAnLi4vLi4vYmFzZV9jYWxsYmFja3MnO1xuaW1wb3J0IHsgQ29udGFpbmVyQXJncyB9IGZyb20gJy4uLy4uL2VuZ2luZS9jb250YWluZXInO1xuaW1wb3J0IHsgTGF5ZXJzTW9kZWwsIE1vZGVsRXZhbHVhdGVBcmdzIH0gZnJvbSAnLi4vLi4vZW5naW5lL3RyYWluaW5nJztcbmltcG9ydCB7IE1vZGVsRml0QXJncyB9IGZyb20gJy4uLy4uL2VuZ2luZS90cmFpbmluZ190ZW5zb3JzJztcbmltcG9ydCB7IE5vdEltcGxlbWVudGVkRXJyb3IgfSBmcm9tICcuLi8uLi9lcnJvcnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gdGVuc29yVG9BcnIoaW5wdXQ6IFRlbnNvcik6IHVua25vd25bXSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGlucHV0LmRhdGFTeW5jKCkpIGFzIHVua25vd24gYXMgdW5rbm93bltdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVuc29yQXJyVG8yREFycihpbnB1dHM6IFRlbnNvcltdKTogdW5rbm93bltdW10ge1xuICByZXR1cm4gaW5wdXRzLm1hcChpbnB1dCA9PiB0ZW5zb3JUb0FycihpbnB1dCkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgVGVuc29yIHdpdGggYHVwZGF0ZXNgIGluc2VydGVkIGludG8gYGlucHV0c2Agc3RhcnRpbmcgYXQgdGhlXG4gKiBpbmRleCBgc3RhcnRJbmRpY2VzYC5cbiAqXG4gKiBAcGFyYW0gaW5wdXRzIFRlbnNvciB0byBcIm1vZGlmeVwiXG4gKiBAcGFyYW0gc3RhcnRJbmRpY2VzIHRoZSBzdGFydGluZyBpbmRleCB0byBpbnNlcnQgdGhlIHNsaWNlLlxuICogIExlbmd0aCBtdXN0IGJlIGVxdWFsIHRvIGBpbnB1dHMucmFua2A7XG4gKiBAcGFyYW0gdXBkYXRlcyB0aGUgdXBkYXRlIHRlbnNvci4gU2hhcGUgbXVzdCBmaXQgd2l0aGluIGBpbnB1dHNgIHNoYXBlLlxuICogQHJldHVybnMgYSBuZXcgdGVuc29yIHdpdGggdGhlIG1vZGlmaWNhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsaWNlVXBkYXRlKFxuICAgIGlucHV0czogVGVuc29yLCBzdGFydEluZGljZXM6IG51bWJlcltdLCB1cGRhdGVzOiBUZW5zb3IpOiBUZW5zb3Ige1xuICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgY29uc3QgaW5kaWNlczogbnVtYmVyW11bXSA9IFtdO1xuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIHRoZSB1cGRhdGUgaW5kaWNlcyBieSBpdGVyYXRpbmcgdGhyb3VnaCBhbGwgaW5kaWNlcyBmcm9tXG4gICAgICogYHN0YXJ0SW5kaWNlc2AgdG8gYHN0YXJ0SW5kaWNlcyArIHVwZGF0ZXMuc2hhcGVgLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUluZGljZXMoaWR4OiBudW1iZXIsIGN1cnI6IG51bWJlcltdKTogdm9pZCB7XG4gICAgICBpZiAoY3Vyci5sZW5ndGggPT09IHN0YXJ0SW5kaWNlcy5sZW5ndGgpIHtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGN1cnIuc2xpY2UoKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN0YXJ0ID0gc3RhcnRJbmRpY2VzW2lkeF07XG4gICAgICBjb25zdCBlbmQgPSBzdGFydCArIHVwZGF0ZXMuc2hhcGVbaWR4XTtcbiAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICAgIGN1cnIucHVzaChpKTtcbiAgICAgICAgY3JlYXRlSW5kaWNlcyhpZHggKyAxLCBjdXJyKTtcbiAgICAgICAgY3Vyci5wb3AoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY3JlYXRlSW5kaWNlcygwLCBbXSk7XG4gICAgLy8gRmxhdHRlbiB0aGUgdXBkYXRlcyB0byBtYXRjaCBsZW5ndGggb2YgaXRzIHVwZGF0ZSBpbmRpY2VzLlxuICAgIHVwZGF0ZXMgPSB1cGRhdGVzLnJlc2hhcGUoW3VwZGF0ZXMuc2l6ZV0pO1xuICAgIHJldHVybiB0ZW5zb3JTY2F0dGVyVXBkYXRlKGlucHV0cywgaW5kaWNlcywgdXBkYXRlcyk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwYWNrWFlTYW1wbGVXZWlnaHQoeDogVGVuc29yLCB5PzogVGVuc29yLCBzYW1wbGVXZWlnaHQ/OiBUZW5zb3IpOlxuICBUZW5zb3JcbiAgfCBbVGVuc29yLCBUZW5zb3JdXG4gIHwgW1RlbnNvciwgVGVuc29yLCBUZW5zb3JdIHtcbiAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbn1cblxuZnVuY3Rpb24gdW5QYWNrWFlTYW1wbGVXZWlnaHQoXG4gIGRhdGE6IFtUZW5zb3JdfFtUZW5zb3IsIFRlbnNvcl18W1RlbnNvciwgVGVuc29yLCBUZW5zb3JdXG4pIHtcbiAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbn1cblxuLy8gVE9ETyhwZm9yZGVyaXF1ZSk6IEZpZ3VyZSBvdXQgYSB3b3JrYXJvdW5kIGZvciBgdGYuZGF0YS5EYXRhc2V0YC5cbmZ1bmN0aW9uIGNvbnZlcnRJbnB1dHNUb0RhdGFzZXQoXG4gIHg/OiBUZW5zb3IsIHk/OiBUZW5zb3IsIHNhbXBsZVdlaWdodD86IFRlbnNvciwgYmF0Y2hTaXplPzogbnVtYmVyXG4pIHtcbiAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbn1cblxuZnVuY3Rpb24gdHJhaW5WYWxpZGF0aW9uU3BsaXQoYXJyYXlzOiBUZW5zb3JbXSwgdmFsaWRhdGlvblNwbGl0OiBudW1iZXIpIHtcbiAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbn1cblxuLyoqXG4gKiBBIG1vZGVsIHdoaWNoIGFsbG93cyBhdXRvbWF0aWNhbGx5IGFwcGx5aW5nIHByZXByb2Nlc3NpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZWxpbmVNb2RlbEFyZ3MgZXh0ZW5kcyBDb250YWluZXJBcmdzIHtcbiAgLyoqXG4gICAqIERlZmF1bHRzIHRvIHRydWUuXG4gICAqL1xuICBpbmNsdWRlUHJlcHJvY2Vzc2luZz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBQaXBlbGluZU1vZGVsIGV4dGVuZHMgTGF5ZXJzTW9kZWwge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdQaXBlbGluZU1vZGVsJztcblxuICBwcm90ZWN0ZWQgaW5jbHVkZVByZXByb2Nlc3Npbmc6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoYXJnczogUGlwZWxpbmVNb2RlbEFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICB0aGlzLmluY2x1ZGVQcmVwcm9jZXNzaW5nID0gYXJncy5pbmNsdWRlUHJlcHJvY2Vzc2luZyA/PyB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuIG92ZXJyaWRhYmxlIGZ1bmN0aW9uIHdoaWNoIHByZXByb2Nlc3NlcyBmZWF0dXJlcy5cbiAgICovXG4gIHByZXByb2Nlc3NGZWF0dXJlcyh4OiBUZW5zb3IpIHtcbiAgICByZXR1cm4geDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBvdmVycmlkYWJsZSBmdW5jdGlvbiB3aGljaCBwcmVwcm9jZXNzZXMgbGFiZWxzLlxuICAgKi9cbiAgcHJlcHJvY2Vzc0xhYmVscyh5OiBUZW5zb3IpIHtcbiAgICByZXR1cm4geTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBvdmVycmlkYWJsZSBmdW5jdGlvbiB3aGljaCBwcmVwcm9jZXNzZXMgZW50aXJlIHNhbXBsZXMuXG4gICAqL1xuICBwcmVwcm9jZXNzU2FtcGxlcyh4OiBUZW5zb3IsIHk/OiBUZW5zb3IsIHNhbXBsZVdlaWdodD86IFRlbnNvcik6XG4gICAgVGVuc29yXG4gICAgfCBbVGVuc29yLCBUZW5zb3JdXG4gICAgfCBbVGVuc29yLCBUZW5zb3IsIFRlbnNvcl0ge1xuICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKCk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gQmVsb3cgYXJlIG92ZXJyaWRlcyB0byBMYXllcnNNb2RlbCBtZXRob2RzIHRvIGFwcGx5IHRoZSBmdW5jdGlvbnMgYWJvdmUuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBvdmVycmlkZSBmaXQoXG4gICAgeDogVGVuc29yfFRlbnNvcltdfHtbaW5wdXROYW1lOiBzdHJpbmddOiBUZW5zb3J9LFxuICAgIHk6IFRlbnNvcnxUZW5zb3JbXXx7W2lucHV0TmFtZTogc3RyaW5nXTogVGVuc29yfSxcbiAgICBhcmdzOiBNb2RlbEZpdEFyZ3MgPSB7fVxuICApOiBQcm9taXNlPEhpc3Rvcnk+IHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgIGBVc2VzICR7Y29udmVydElucHV0c1RvRGF0YXNldH0sICR7dHJhaW5WYWxpZGF0aW9uU3BsaXR9IGAgK1xuICAgICAgYCR7cGFja1hZU2FtcGxlV2VpZ2h0fSwgYW5kICR7dW5QYWNrWFlTYW1wbGVXZWlnaHR9YCk7XG4gIH1cblxuICBvdmVycmlkZSBldmFsdWF0ZShcbiAgICB4OiBUZW5zb3J8VGVuc29yW10sXG4gICAgeTogVGVuc29yfFRlbnNvcltdLFxuICAgIGFyZ3M/OiBNb2RlbEV2YWx1YXRlQXJnc1xuICApOiBTY2FsYXIgfCBTY2FsYXJbXSB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHByZWRpY3QoXG4gICAgeDogVGVuc29yIHwgVGVuc29yW10sXG4gICAgYXJncz86IE1vZGVsUHJlZGljdENvbmZpZ1xuICApOiBUZW5zb3IgfCBUZW5zb3JbXSB7XG4gICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHRyYWluT25CYXRjaChcbiAgICB4OiBUZW5zb3J8VGVuc29yW118e1tpbnB1dE5hbWU6IHN0cmluZ106IFRlbnNvcn0sXG4gICAgeTogVGVuc29yfFRlbnNvcltdfHtbaW5wdXROYW1lOiBzdHJpbmddOiBUZW5zb3J9LFxuICAgIHNhbXBsZVdlaWdodD86IFRlbnNvclxuICApOiBQcm9taXNlPG51bWJlcnxudW1iZXJbXT4ge1xuICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKCk7XG4gIH1cblxuICBvdmVycmlkZSBwcmVkaWN0T25CYXRjaCh4OiBUZW5zb3J8VGVuc29yW10pOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKCk7XG4gIH1cbn1cbiJdfQ==