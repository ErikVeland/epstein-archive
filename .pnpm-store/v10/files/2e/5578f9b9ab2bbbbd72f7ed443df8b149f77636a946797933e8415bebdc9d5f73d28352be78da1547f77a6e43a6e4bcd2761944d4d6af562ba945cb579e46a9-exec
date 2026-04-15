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
import { getCoordsDataType } from './shader_compiler';
export class ScatterPackedProgram {
    constructor(updateSize, sliceDim, indicesRank, updatesRank, strides, shape, summingDupeIndex = true, defaultIsTensor = false) {
        this.variableNames = ['updates', 'indices', 'defaultValue'];
        this.packedInputs = true;
        this.packedOutput = true;
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
        const strideString2 = sliceDim > 1 ? 'strides[j + 1]' : 'strides';
        this.userCode = `
        ${stridesType} strides = ${stridesType}(${strides});

        void main() {
          ${dtype} coords = getOutputCoords();
          vec4 sum = vec4(0.);
          vec4 found = vec4(0.);
          for (int i = 0; i < ${updateSize}; i+=2) {
            ivec2 flattenedIndex = ivec2(0);
            for (int j = 0; j < ${sliceDim}; j+=2) {
              ivec4 index = round(${indicesSnippet});
              flattenedIndex += index.xz * ${strideString};
              if (j + 1 < ${sliceDim}) {
                flattenedIndex += index.yw * ${strideString2};
              }
            }
            if (flattenedIndex[0] == coords[0] || flattenedIndex[1] == coords[0] ||
                flattenedIndex[0] == coords[0] + 1 || flattenedIndex[1] == coords[0] + 1) {
              vec4 updVals = ${updatesSnippet};
              if (flattenedIndex[0] == coords[0]) {
                sum.xy += updVals.xy;
                found.xy = vec2(1.);
              } else if (flattenedIndex[0] == coords[0] + 1) {
                sum.zw += updVals.xy;
                found.zw = vec2(1.);
              }
              if (flattenedIndex[1] == coords[0]) {
                sum.xy += updVals.zw;
                found.xy = vec2(1.);
              } else if (flattenedIndex[1] == coords[0] + 1) {
                sum.zw += updVals.zw;
                found.zw = vec2(1.);
              }
            }
          }
          setOutput(mix(${defaultValueSnippet}, sum, found));
        }
      `;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NhdHRlcl9wYWNrZWRfZ3B1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1iYWNrZW5kLXdlYmdsL3NyYy9zY2F0dGVyX3BhY2tlZF9ncHUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBR0gsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFcEQsTUFBTSxPQUFPLG9CQUFvQjtJQU8vQixZQUNJLFVBQWtCLEVBQUUsUUFBZ0IsRUFBRSxXQUFtQixFQUN6RCxXQUFtQixFQUFFLE9BQWlCLEVBQUUsS0FBZSxFQUN2RCxnQkFBZ0IsR0FBRyxJQUFJLEVBQUUsZUFBZSxHQUFHLEtBQUs7UUFUcEQsa0JBQWEsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFdkQsaUJBQVksR0FBRyxJQUFJLENBQUM7UUFDcEIsaUJBQVksR0FBRyxJQUFJLENBQUM7UUFPbEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFDdkIsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLGFBQWEsR0FBRyxHQUFHLENBQUM7U0FDckI7YUFBTSxJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUU7WUFDNUIsYUFBYSxHQUFHLE1BQU0sQ0FBQztTQUN4QjtRQUNELE1BQU0sY0FBYyxHQUFHLGNBQWMsYUFBYSxHQUFHLENBQUM7UUFFdEQsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRTtZQUNyQixhQUFhLEdBQUcsR0FBRyxDQUFDO1NBQ3JCO2FBQU0sSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFO1lBQzVCLGFBQWEsR0FBRyxjQUFjLENBQUM7U0FDaEM7UUFDRCxNQUFNLGNBQWMsR0FBRyxjQUFjLGFBQWEsR0FBRyxDQUFDO1FBRXRELElBQUksbUJBQW1CLEdBQUcsRUFBRSxDQUFDO1FBQzdCLElBQUksZUFBZSxFQUFFO1lBQ25CLG1CQUFtQixHQUFHLHNCQUFzQixDQUFDO1NBQzlDO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxtQkFBbUIsbUJBQW1CLEdBQUcsQ0FBQztRQUV0RSxNQUFNLFlBQVksR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM3RCxNQUFNLGFBQWEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWxFLElBQUksQ0FBQyxRQUFRLEdBQUc7VUFDVixXQUFXLGNBQWMsV0FBVyxJQUFJLE9BQU87OztZQUc3QyxLQUFLOzs7Z0NBR2UsVUFBVTs7a0NBRVIsUUFBUTtvQ0FDTixjQUFjOzZDQUNMLFlBQVk7NEJBQzdCLFFBQVE7K0NBQ1csYUFBYTs7Ozs7K0JBSzdCLGNBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7OzBCQWlCbkIsbUJBQW1COztPQUV0QyxDQUFDO0lBQ04sQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge0dQR1BVUHJvZ3JhbX0gZnJvbSAnLi9ncGdwdV9tYXRoJztcbmltcG9ydCB7Z2V0Q29vcmRzRGF0YVR5cGV9IGZyb20gJy4vc2hhZGVyX2NvbXBpbGVyJztcblxuZXhwb3J0IGNsYXNzIFNjYXR0ZXJQYWNrZWRQcm9ncmFtIGltcGxlbWVudHMgR1BHUFVQcm9ncmFtIHtcbiAgdmFyaWFibGVOYW1lcyA9IFsndXBkYXRlcycsICdpbmRpY2VzJywgJ2RlZmF1bHRWYWx1ZSddO1xuICBvdXRwdXRTaGFwZTogbnVtYmVyW107XG4gIHBhY2tlZElucHV0cyA9IHRydWU7XG4gIHBhY2tlZE91dHB1dCA9IHRydWU7XG4gIHVzZXJDb2RlOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICB1cGRhdGVTaXplOiBudW1iZXIsIHNsaWNlRGltOiBudW1iZXIsIGluZGljZXNSYW5rOiBudW1iZXIsXG4gICAgICB1cGRhdGVzUmFuazogbnVtYmVyLCBzdHJpZGVzOiBudW1iZXJbXSwgc2hhcGU6IG51bWJlcltdLFxuICAgICAgc3VtbWluZ0R1cGVJbmRleCA9IHRydWUsIGRlZmF1bHRJc1RlbnNvciA9IGZhbHNlKSB7XG4gICAgdGhpcy5vdXRwdXRTaGFwZSA9IHNoYXBlO1xuICAgIGNvbnN0IHN0cmlkZXNUeXBlID0gZ2V0Q29vcmRzRGF0YVR5cGUoc3RyaWRlcy5sZW5ndGgpO1xuICAgIGNvbnN0IGR0eXBlID0gZ2V0Q29vcmRzRGF0YVR5cGUoc2hhcGUubGVuZ3RoKTtcbiAgICBsZXQgaW5kaWNlc1N0cmluZyA9ICcnO1xuICAgIGlmIChpbmRpY2VzUmFuayA9PT0gMSkge1xuICAgICAgaW5kaWNlc1N0cmluZyA9ICdpJztcbiAgICB9IGVsc2UgaWYgKGluZGljZXNSYW5rID09PSAyKSB7XG4gICAgICBpbmRpY2VzU3RyaW5nID0gJ2ksIGonO1xuICAgIH1cbiAgICBjb25zdCBpbmRpY2VzU25pcHBldCA9IGBnZXRJbmRpY2VzKCR7aW5kaWNlc1N0cmluZ30pYDtcblxuICAgIGxldCB1cGRhdGVzU3RyaW5nID0gJyc7XG4gICAgaWYgKHVwZGF0ZXNSYW5rID09PSAxKSB7XG4gICAgICB1cGRhdGVzU3RyaW5nID0gJ2knO1xuICAgIH0gZWxzZSBpZiAodXBkYXRlc1JhbmsgPT09IDIpIHtcbiAgICAgIHVwZGF0ZXNTdHJpbmcgPSAnaSwgY29vcmRzWzFdJztcbiAgICB9XG4gICAgY29uc3QgdXBkYXRlc1NuaXBwZXQgPSBgZ2V0VXBkYXRlcygke3VwZGF0ZXNTdHJpbmd9KWA7XG5cbiAgICBsZXQgZGVmYXVsdFZhbHVlc1N0cmluZyA9ICcnO1xuICAgIGlmIChkZWZhdWx0SXNUZW5zb3IpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZXNTdHJpbmcgPSAnY29vcmRzWzBdLCBjb29yZHNbMV0nO1xuICAgIH1cbiAgICBjb25zdCBkZWZhdWx0VmFsdWVTbmlwcGV0ID0gYGdldERlZmF1bHRWYWx1ZSgke2RlZmF1bHRWYWx1ZXNTdHJpbmd9KWA7XG5cbiAgICBjb25zdCBzdHJpZGVTdHJpbmcgPSBzbGljZURpbSA+IDEgPyAnc3RyaWRlc1tqXScgOiAnc3RyaWRlcyc7XG4gICAgY29uc3Qgc3RyaWRlU3RyaW5nMiA9IHNsaWNlRGltID4gMSA/ICdzdHJpZGVzW2ogKyAxXScgOiAnc3RyaWRlcyc7XG5cbiAgICB0aGlzLnVzZXJDb2RlID0gYFxuICAgICAgICAke3N0cmlkZXNUeXBlfSBzdHJpZGVzID0gJHtzdHJpZGVzVHlwZX0oJHtzdHJpZGVzfSk7XG5cbiAgICAgICAgdm9pZCBtYWluKCkge1xuICAgICAgICAgICR7ZHR5cGV9IGNvb3JkcyA9IGdldE91dHB1dENvb3JkcygpO1xuICAgICAgICAgIHZlYzQgc3VtID0gdmVjNCgwLik7XG4gICAgICAgICAgdmVjNCBmb3VuZCA9IHZlYzQoMC4pO1xuICAgICAgICAgIGZvciAoaW50IGkgPSAwOyBpIDwgJHt1cGRhdGVTaXplfTsgaSs9Mikge1xuICAgICAgICAgICAgaXZlYzIgZmxhdHRlbmVkSW5kZXggPSBpdmVjMigwKTtcbiAgICAgICAgICAgIGZvciAoaW50IGogPSAwOyBqIDwgJHtzbGljZURpbX07IGorPTIpIHtcbiAgICAgICAgICAgICAgaXZlYzQgaW5kZXggPSByb3VuZCgke2luZGljZXNTbmlwcGV0fSk7XG4gICAgICAgICAgICAgIGZsYXR0ZW5lZEluZGV4ICs9IGluZGV4Lnh6ICogJHtzdHJpZGVTdHJpbmd9O1xuICAgICAgICAgICAgICBpZiAoaiArIDEgPCAke3NsaWNlRGltfSkge1xuICAgICAgICAgICAgICAgIGZsYXR0ZW5lZEluZGV4ICs9IGluZGV4Lnl3ICogJHtzdHJpZGVTdHJpbmcyfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZsYXR0ZW5lZEluZGV4WzBdID09IGNvb3Jkc1swXSB8fCBmbGF0dGVuZWRJbmRleFsxXSA9PSBjb29yZHNbMF0gfHxcbiAgICAgICAgICAgICAgICBmbGF0dGVuZWRJbmRleFswXSA9PSBjb29yZHNbMF0gKyAxIHx8IGZsYXR0ZW5lZEluZGV4WzFdID09IGNvb3Jkc1swXSArIDEpIHtcbiAgICAgICAgICAgICAgdmVjNCB1cGRWYWxzID0gJHt1cGRhdGVzU25pcHBldH07XG4gICAgICAgICAgICAgIGlmIChmbGF0dGVuZWRJbmRleFswXSA9PSBjb29yZHNbMF0pIHtcbiAgICAgICAgICAgICAgICBzdW0ueHkgKz0gdXBkVmFscy54eTtcbiAgICAgICAgICAgICAgICBmb3VuZC54eSA9IHZlYzIoMS4pO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZsYXR0ZW5lZEluZGV4WzBdID09IGNvb3Jkc1swXSArIDEpIHtcbiAgICAgICAgICAgICAgICBzdW0uencgKz0gdXBkVmFscy54eTtcbiAgICAgICAgICAgICAgICBmb3VuZC56dyA9IHZlYzIoMS4pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChmbGF0dGVuZWRJbmRleFsxXSA9PSBjb29yZHNbMF0pIHtcbiAgICAgICAgICAgICAgICBzdW0ueHkgKz0gdXBkVmFscy56dztcbiAgICAgICAgICAgICAgICBmb3VuZC54eSA9IHZlYzIoMS4pO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZsYXR0ZW5lZEluZGV4WzFdID09IGNvb3Jkc1swXSArIDEpIHtcbiAgICAgICAgICAgICAgICBzdW0uencgKz0gdXBkVmFscy56dztcbiAgICAgICAgICAgICAgICBmb3VuZC56dyA9IHZlYzIoMS4pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldE91dHB1dChtaXgoJHtkZWZhdWx0VmFsdWVTbmlwcGV0fSwgc3VtLCBmb3VuZCkpO1xuICAgICAgICB9XG4gICAgICBgO1xuICB9XG59XG4iXX0=