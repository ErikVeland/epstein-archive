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
import { getCoordsDataType } from './shader_compiler';
export class ScatterProgram {
    constructor(updateSize, sliceDim, indicesRank, updatesRank, strides, shape, summingDupeIndex = true, defaultIsTensor = false) {
        this.variableNames = ['updates', 'indices', 'defaultValue'];
        this.outputShape = shape;
        const stridesType = getCoordsDataType(strides.length);
        const dtype = getCoordsDataType(shape.length);
        let indicesString = '';
        if (indicesRank === 1) {
            indicesString = 'i';
        }
        else if (indicesRank === 2) {
            indicesString = 'i, j';
        }
        const indicesSnippet = `getIndices(${indicesString})`;
        let updatesString = '';
        if (updatesRank === 1) {
            updatesString = 'i';
        }
        else if (updatesRank === 2) {
            updatesString = 'i, coords[1]';
        }
        const updatesSnippet = `getUpdates(${updatesString})`;
        let defaultValuesString = '';
        if (defaultIsTensor) {
            defaultValuesString = 'coords[0], coords[1]';
        }
        const defaultValueSnippet = `getDefaultValue(${defaultValuesString})`;
        const strideString = sliceDim > 1 ? 'strides[j]' : 'strides';
        this.userCode = `
        ${stridesType} strides = ${stridesType}(${strides});

        void main() {
          ${dtype} coords = getOutputCoords();
          float sum = 0.0;
          bool found = false;
          for (int i = 0; i < ${updateSize}; i++) {
            int flattenedIndex = 0;
            for (int j = 0; j < ${sliceDim}; j++) {
              int index = round(${indicesSnippet});
              flattenedIndex += index * ${strideString};
            }
            if (flattenedIndex == coords[0]) {
              sum += ${updatesSnippet};
              found = true;
            }
          }
          setOutput(mix(${defaultValueSnippet}, sum, float(found)));
        }
      `;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NhdHRlcl9ncHUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi90ZmpzLWJhY2tlbmQtd2ViZ2wvc3JjL3NjYXR0ZXJfZ3B1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUdILE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRXBELE1BQU0sT0FBTyxjQUFjO0lBS3pCLFlBQ0ksVUFBa0IsRUFBRSxRQUFnQixFQUFFLFdBQW1CLEVBQ3pELFdBQW1CLEVBQUUsT0FBaUIsRUFBRSxLQUFlLEVBQ3ZELGdCQUFnQixHQUFHLElBQUksRUFBRSxlQUFlLEdBQUcsS0FBSztRQVBwRCxrQkFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQVFyRCxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN6QixNQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUU7WUFDckIsYUFBYSxHQUFHLEdBQUcsQ0FBQztTQUNyQjthQUFNLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRTtZQUM1QixhQUFhLEdBQUcsTUFBTSxDQUFDO1NBQ3hCO1FBQ0QsTUFBTSxjQUFjLEdBQUcsY0FBYyxhQUFhLEdBQUcsQ0FBQztRQUV0RCxJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFDdkIsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLGFBQWEsR0FBRyxHQUFHLENBQUM7U0FDckI7YUFBTSxJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUU7WUFDNUIsYUFBYSxHQUFHLGNBQWMsQ0FBQztTQUNoQztRQUNELE1BQU0sY0FBYyxHQUFHLGNBQWMsYUFBYSxHQUFHLENBQUM7UUFFdEQsSUFBSSxtQkFBbUIsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBSSxlQUFlLEVBQUU7WUFDbkIsbUJBQW1CLEdBQUcsc0JBQXNCLENBQUM7U0FDOUM7UUFDRCxNQUFNLG1CQUFtQixHQUFHLG1CQUFtQixtQkFBbUIsR0FBRyxDQUFDO1FBRXRFLE1BQU0sWUFBWSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzdELElBQUksQ0FBQyxRQUFRLEdBQUc7VUFDVixXQUFXLGNBQWMsV0FBVyxJQUFJLE9BQU87OztZQUc3QyxLQUFLOzs7Z0NBR2UsVUFBVTs7a0NBRVIsUUFBUTtrQ0FDUixjQUFjOzBDQUNOLFlBQVk7Ozt1QkFHL0IsY0FBYzs7OzswQkFJWCxtQkFBbUI7O09BRXRDLENBQUM7SUFDTixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7R1BHUFVQcm9ncmFtfSBmcm9tICcuL2dwZ3B1X21hdGgnO1xuaW1wb3J0IHtnZXRDb29yZHNEYXRhVHlwZX0gZnJvbSAnLi9zaGFkZXJfY29tcGlsZXInO1xuXG5leHBvcnQgY2xhc3MgU2NhdHRlclByb2dyYW0gaW1wbGVtZW50cyBHUEdQVVByb2dyYW0ge1xuICB2YXJpYWJsZU5hbWVzID0gWyd1cGRhdGVzJywgJ2luZGljZXMnLCAnZGVmYXVsdFZhbHVlJ107XG4gIG91dHB1dFNoYXBlOiBudW1iZXJbXTtcbiAgdXNlckNvZGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHVwZGF0ZVNpemU6IG51bWJlciwgc2xpY2VEaW06IG51bWJlciwgaW5kaWNlc1Jhbms6IG51bWJlcixcbiAgICAgIHVwZGF0ZXNSYW5rOiBudW1iZXIsIHN0cmlkZXM6IG51bWJlcltdLCBzaGFwZTogbnVtYmVyW10sXG4gICAgICBzdW1taW5nRHVwZUluZGV4ID0gdHJ1ZSwgZGVmYXVsdElzVGVuc29yID0gZmFsc2UpIHtcbiAgICB0aGlzLm91dHB1dFNoYXBlID0gc2hhcGU7XG4gICAgY29uc3Qgc3RyaWRlc1R5cGUgPSBnZXRDb29yZHNEYXRhVHlwZShzdHJpZGVzLmxlbmd0aCk7XG4gICAgY29uc3QgZHR5cGUgPSBnZXRDb29yZHNEYXRhVHlwZShzaGFwZS5sZW5ndGgpO1xuICAgIGxldCBpbmRpY2VzU3RyaW5nID0gJyc7XG4gICAgaWYgKGluZGljZXNSYW5rID09PSAxKSB7XG4gICAgICBpbmRpY2VzU3RyaW5nID0gJ2knO1xuICAgIH0gZWxzZSBpZiAoaW5kaWNlc1JhbmsgPT09IDIpIHtcbiAgICAgIGluZGljZXNTdHJpbmcgPSAnaSwgaic7XG4gICAgfVxuICAgIGNvbnN0IGluZGljZXNTbmlwcGV0ID0gYGdldEluZGljZXMoJHtpbmRpY2VzU3RyaW5nfSlgO1xuXG4gICAgbGV0IHVwZGF0ZXNTdHJpbmcgPSAnJztcbiAgICBpZiAodXBkYXRlc1JhbmsgPT09IDEpIHtcbiAgICAgIHVwZGF0ZXNTdHJpbmcgPSAnaSc7XG4gICAgfSBlbHNlIGlmICh1cGRhdGVzUmFuayA9PT0gMikge1xuICAgICAgdXBkYXRlc1N0cmluZyA9ICdpLCBjb29yZHNbMV0nO1xuICAgIH1cbiAgICBjb25zdCB1cGRhdGVzU25pcHBldCA9IGBnZXRVcGRhdGVzKCR7dXBkYXRlc1N0cmluZ30pYDtcblxuICAgIGxldCBkZWZhdWx0VmFsdWVzU3RyaW5nID0gJyc7XG4gICAgaWYgKGRlZmF1bHRJc1RlbnNvcikge1xuICAgICAgZGVmYXVsdFZhbHVlc1N0cmluZyA9ICdjb29yZHNbMF0sIGNvb3Jkc1sxXSc7XG4gICAgfVxuICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVNuaXBwZXQgPSBgZ2V0RGVmYXVsdFZhbHVlKCR7ZGVmYXVsdFZhbHVlc1N0cmluZ30pYDtcblxuICAgIGNvbnN0IHN0cmlkZVN0cmluZyA9IHNsaWNlRGltID4gMSA/ICdzdHJpZGVzW2pdJyA6ICdzdHJpZGVzJztcbiAgICB0aGlzLnVzZXJDb2RlID0gYFxuICAgICAgICAke3N0cmlkZXNUeXBlfSBzdHJpZGVzID0gJHtzdHJpZGVzVHlwZX0oJHtzdHJpZGVzfSk7XG5cbiAgICAgICAgdm9pZCBtYWluKCkge1xuICAgICAgICAgICR7ZHR5cGV9IGNvb3JkcyA9IGdldE91dHB1dENvb3JkcygpO1xuICAgICAgICAgIGZsb2F0IHN1bSA9IDAuMDtcbiAgICAgICAgICBib29sIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChpbnQgaSA9IDA7IGkgPCAke3VwZGF0ZVNpemV9OyBpKyspIHtcbiAgICAgICAgICAgIGludCBmbGF0dGVuZWRJbmRleCA9IDA7XG4gICAgICAgICAgICBmb3IgKGludCBqID0gMDsgaiA8ICR7c2xpY2VEaW19OyBqKyspIHtcbiAgICAgICAgICAgICAgaW50IGluZGV4ID0gcm91bmQoJHtpbmRpY2VzU25pcHBldH0pO1xuICAgICAgICAgICAgICBmbGF0dGVuZWRJbmRleCArPSBpbmRleCAqICR7c3RyaWRlU3RyaW5nfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmbGF0dGVuZWRJbmRleCA9PSBjb29yZHNbMF0pIHtcbiAgICAgICAgICAgICAgc3VtICs9ICR7dXBkYXRlc1NuaXBwZXR9O1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldE91dHB1dChtaXgoJHtkZWZhdWx0VmFsdWVTbmlwcGV0fSwgc3VtLCBmbG9hdChmb3VuZCkpKTtcbiAgICAgICAgfVxuICAgICAgYDtcbiAgfVxufVxuIl19