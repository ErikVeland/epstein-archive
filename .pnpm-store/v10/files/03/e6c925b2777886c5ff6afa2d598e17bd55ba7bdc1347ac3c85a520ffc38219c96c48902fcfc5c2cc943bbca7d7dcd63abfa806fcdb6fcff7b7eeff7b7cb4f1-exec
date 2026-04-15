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
import { useShapeUniforms } from './gpgpu_math';
export class Conv2DDerInputPackedProgram {
    constructor(convInfo) {
        this.variableNames = ['dy', 'W'];
        this.packedInputs = true;
        this.packedOutput = true;
        this.customUniforms = [
            { name: 'strides', type: 'vec2' },
        ];
        this.outputShape = convInfo.inShape;
        this.enableShapeUniforms = useShapeUniforms(this.outputShape.length);
        const filterHeight = convInfo.filterHeight;
        const filterWidth = convInfo.filterWidth;
        const padTop = filterHeight - 1 - convInfo.padInfo.top;
        const padLeft = filterWidth - 1 - convInfo.padInfo.left;
        this.userCode = `
      const ivec2 pads = ivec2(${padTop}, ${padLeft});

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d1 = coords[3];

        ivec2 dyCorner = ivec2(coords[1], coords[2]) - pads;
        int dyRCorner = dyCorner.x;
        int dyCCorner = dyCorner.y;

        vec4 result = vec4(0.);
        for (int wR = 0; wR < ${filterHeight}; wR++) {
          float dyR = float(dyRCorner + wR) / strides[0];
          if (dyR < 0.0 || dyR >= ${convInfo.outHeight}.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);
          int wRPerm = ${filterHeight} - 1 - wR;

          for (int wC = 0; wC < ${filterWidth}; wC++) {
            int wCPerm = ${filterWidth} - 1 - wC;

            float dyC = float(dyCCorner + wC) / strides[1];
            bool idyCVal = (dyC >= 0.0) && (dyC < ${convInfo.outWidth}.0)
              && (fract(dyC) == 0.0);
            int idyC = int(dyC);

            float dyC2 = float(dyCCorner + wC + 1) / strides[1];
            bool idyCVal2 = (dyC2 >= 0.0) && (dyC2 < ${convInfo.outWidth}.0)
              && (fract(dyC2) == 0.0);
            int idyC2 = int(dyC2);

            if (idyCVal && idyCVal2) {
              for (int d2 = 0; d2 < ${convInfo.outChannels}; d2 += 2) {
                vec4 wValue = getW(wRPerm, wCPerm, d1, d2);
                vec4 dySample = getDy(batch, idyR, idyC, d2);
                vec4 dySample2 = (idyC / 2 == idyC2 / 2) ?
                  dySample : getDy(batch, idyR, idyC2, d2);

                vec2 dyValue = mod(float(idyC), 2.) == 0. ?
                  dySample.xy : dySample.zw;
                result.xy += vec2(dot(dyValue, wValue.xy),
                  dot(dyValue, wValue.zw));

                dyValue = mod(float(idyC2), 2.) == 0. ?
                  dySample2.xy : dySample2.zw;
                result.zw += vec2(dot(dyValue, wValue.xy),
                  dot(dyValue, wValue.zw));
              }
            } else if (idyCVal) {
              for (int d2 = 0; d2 < ${convInfo.outChannels}; d2 += 2) {
                vec4 wValue = getW(wRPerm, wCPerm, d1, d2);
                vec4 dySample = getDy(batch, idyR, idyC, d2);
                vec2 dyValue = mod(float(idyC), 2.) == 0. ?
                  dySample.xy : dySample.zw;
                result.xy += vec2(dot(dyValue, wValue.xy),
                  dot(dyValue, wValue.zw));
              }
            } else if (idyCVal2) {
              for (int d2 = 0; d2 < ${convInfo.outChannels}; d2 += 2) {
                vec4 wValue = getW(wRPerm, wCPerm, d1, d2);
                vec4 dySample = getDy(batch, idyR, idyC2, d2);
                vec2 dyValue = mod(float(idyC2), 2.) == 0. ?
                  dySample.xy : dySample.zw;
                result.zw += vec2(dot(dyValue, wValue.xy),
                  dot(dyValue, wValue.zw));
              }
            }
          }
        }
        setOutput(result);
      }
    `;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udl9iYWNrcHJvcF9wYWNrZWRfZ3B1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1iYWNrZW5kLXdlYmdsL3NyYy9jb252X2JhY2twcm9wX3BhY2tlZF9ncHUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBR0gsT0FBTyxFQUFlLGdCQUFnQixFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRTVELE1BQU0sT0FBTywyQkFBMkI7SUFXdEMsWUFBWSxRQUFpQztRQVY3QyxrQkFBYSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLGlCQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLGlCQUFZLEdBQUcsSUFBSSxDQUFDO1FBSXBCLG1CQUFjLEdBQUc7WUFDZixFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQWUsRUFBRTtTQUMxQyxDQUFDO1FBR0EsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXJFLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQztRQUV6QyxNQUFNLE1BQU0sR0FBRyxZQUFZLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3ZELE1BQU0sT0FBTyxHQUFHLFdBQVcsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFFeEQsSUFBSSxDQUFDLFFBQVEsR0FBRztpQ0FDYSxNQUFNLEtBQUssT0FBTzs7Ozs7Ozs7Ozs7O2dDQVluQixZQUFZOztvQ0FFUixRQUFRLENBQUMsU0FBUzs7Ozt5QkFJN0IsWUFBWTs7a0NBRUgsV0FBVzsyQkFDbEIsV0FBVzs7O29EQUdjLFFBQVEsQ0FBQyxRQUFROzs7Ozt1REFLZCxRQUFRLENBQUMsUUFBUTs7Ozs7c0NBS2xDLFFBQVEsQ0FBQyxXQUFXOzs7Ozs7Ozs7Ozs7Ozs7OztzQ0FpQnBCLFFBQVEsQ0FBQyxXQUFXOzs7Ozs7Ozs7c0NBU3BCLFFBQVEsQ0FBQyxXQUFXOzs7Ozs7Ozs7Ozs7O0tBYXJELENBQUM7SUFDSixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMyBHb29nbGUgTExDLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7YmFja2VuZF91dGlsfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuaW1wb3J0IHtHUEdQVVByb2dyYW0sIHVzZVNoYXBlVW5pZm9ybXN9IGZyb20gJy4vZ3BncHVfbWF0aCc7XG5cbmV4cG9ydCBjbGFzcyBDb252MkREZXJJbnB1dFBhY2tlZFByb2dyYW0gaW1wbGVtZW50cyBHUEdQVVByb2dyYW0ge1xuICB2YXJpYWJsZU5hbWVzID0gWydkeScsICdXJ107XG4gIHBhY2tlZElucHV0cyA9IHRydWU7XG4gIHBhY2tlZE91dHB1dCA9IHRydWU7XG4gIG91dHB1dFNoYXBlOiBudW1iZXJbXTtcbiAgdXNlckNvZGU6IHN0cmluZztcbiAgZW5hYmxlU2hhcGVVbmlmb3JtczogYm9vbGVhbjtcbiAgY3VzdG9tVW5pZm9ybXMgPSBbXG4gICAge25hbWU6ICdzdHJpZGVzJywgdHlwZTogJ3ZlYzInIGFzIGNvbnN0IH0sXG4gIF07XG5cbiAgY29uc3RydWN0b3IoY29udkluZm86IGJhY2tlbmRfdXRpbC5Db252MkRJbmZvKSB7XG4gICAgdGhpcy5vdXRwdXRTaGFwZSA9IGNvbnZJbmZvLmluU2hhcGU7XG4gICAgdGhpcy5lbmFibGVTaGFwZVVuaWZvcm1zID0gdXNlU2hhcGVVbmlmb3Jtcyh0aGlzLm91dHB1dFNoYXBlLmxlbmd0aCk7XG5cbiAgICBjb25zdCBmaWx0ZXJIZWlnaHQgPSBjb252SW5mby5maWx0ZXJIZWlnaHQ7XG4gICAgY29uc3QgZmlsdGVyV2lkdGggPSBjb252SW5mby5maWx0ZXJXaWR0aDtcblxuICAgIGNvbnN0IHBhZFRvcCA9IGZpbHRlckhlaWdodCAtIDEgLSBjb252SW5mby5wYWRJbmZvLnRvcDtcbiAgICBjb25zdCBwYWRMZWZ0ID0gZmlsdGVyV2lkdGggLSAxIC0gY29udkluZm8ucGFkSW5mby5sZWZ0O1xuXG4gICAgdGhpcy51c2VyQ29kZSA9IGBcbiAgICAgIGNvbnN0IGl2ZWMyIHBhZHMgPSBpdmVjMigke3BhZFRvcH0sICR7cGFkTGVmdH0pO1xuXG4gICAgICB2b2lkIG1haW4oKSB7XG4gICAgICAgIGl2ZWM0IGNvb3JkcyA9IGdldE91dHB1dENvb3JkcygpO1xuICAgICAgICBpbnQgYmF0Y2ggPSBjb29yZHNbMF07XG4gICAgICAgIGludCBkMSA9IGNvb3Jkc1szXTtcblxuICAgICAgICBpdmVjMiBkeUNvcm5lciA9IGl2ZWMyKGNvb3Jkc1sxXSwgY29vcmRzWzJdKSAtIHBhZHM7XG4gICAgICAgIGludCBkeVJDb3JuZXIgPSBkeUNvcm5lci54O1xuICAgICAgICBpbnQgZHlDQ29ybmVyID0gZHlDb3JuZXIueTtcblxuICAgICAgICB2ZWM0IHJlc3VsdCA9IHZlYzQoMC4pO1xuICAgICAgICBmb3IgKGludCB3UiA9IDA7IHdSIDwgJHtmaWx0ZXJIZWlnaHR9OyB3UisrKSB7XG4gICAgICAgICAgZmxvYXQgZHlSID0gZmxvYXQoZHlSQ29ybmVyICsgd1IpIC8gc3RyaWRlc1swXTtcbiAgICAgICAgICBpZiAoZHlSIDwgMC4wIHx8IGR5UiA+PSAke2NvbnZJbmZvLm91dEhlaWdodH0uMCB8fCBmcmFjdChkeVIpID4gMC4wKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW50IGlkeVIgPSBpbnQoZHlSKTtcbiAgICAgICAgICBpbnQgd1JQZXJtID0gJHtmaWx0ZXJIZWlnaHR9IC0gMSAtIHdSO1xuXG4gICAgICAgICAgZm9yIChpbnQgd0MgPSAwOyB3QyA8ICR7ZmlsdGVyV2lkdGh9OyB3QysrKSB7XG4gICAgICAgICAgICBpbnQgd0NQZXJtID0gJHtmaWx0ZXJXaWR0aH0gLSAxIC0gd0M7XG5cbiAgICAgICAgICAgIGZsb2F0IGR5QyA9IGZsb2F0KGR5Q0Nvcm5lciArIHdDKSAvIHN0cmlkZXNbMV07XG4gICAgICAgICAgICBib29sIGlkeUNWYWwgPSAoZHlDID49IDAuMCkgJiYgKGR5QyA8ICR7Y29udkluZm8ub3V0V2lkdGh9LjApXG4gICAgICAgICAgICAgICYmIChmcmFjdChkeUMpID09IDAuMCk7XG4gICAgICAgICAgICBpbnQgaWR5QyA9IGludChkeUMpO1xuXG4gICAgICAgICAgICBmbG9hdCBkeUMyID0gZmxvYXQoZHlDQ29ybmVyICsgd0MgKyAxKSAvIHN0cmlkZXNbMV07XG4gICAgICAgICAgICBib29sIGlkeUNWYWwyID0gKGR5QzIgPj0gMC4wKSAmJiAoZHlDMiA8ICR7Y29udkluZm8ub3V0V2lkdGh9LjApXG4gICAgICAgICAgICAgICYmIChmcmFjdChkeUMyKSA9PSAwLjApO1xuICAgICAgICAgICAgaW50IGlkeUMyID0gaW50KGR5QzIpO1xuXG4gICAgICAgICAgICBpZiAoaWR5Q1ZhbCAmJiBpZHlDVmFsMikge1xuICAgICAgICAgICAgICBmb3IgKGludCBkMiA9IDA7IGQyIDwgJHtjb252SW5mby5vdXRDaGFubmVsc307IGQyICs9IDIpIHtcbiAgICAgICAgICAgICAgICB2ZWM0IHdWYWx1ZSA9IGdldFcod1JQZXJtLCB3Q1Blcm0sIGQxLCBkMik7XG4gICAgICAgICAgICAgICAgdmVjNCBkeVNhbXBsZSA9IGdldER5KGJhdGNoLCBpZHlSLCBpZHlDLCBkMik7XG4gICAgICAgICAgICAgICAgdmVjNCBkeVNhbXBsZTIgPSAoaWR5QyAvIDIgPT0gaWR5QzIgLyAyKSA/XG4gICAgICAgICAgICAgICAgICBkeVNhbXBsZSA6IGdldER5KGJhdGNoLCBpZHlSLCBpZHlDMiwgZDIpO1xuXG4gICAgICAgICAgICAgICAgdmVjMiBkeVZhbHVlID0gbW9kKGZsb2F0KGlkeUMpLCAyLikgPT0gMC4gP1xuICAgICAgICAgICAgICAgICAgZHlTYW1wbGUueHkgOiBkeVNhbXBsZS56dztcbiAgICAgICAgICAgICAgICByZXN1bHQueHkgKz0gdmVjMihkb3QoZHlWYWx1ZSwgd1ZhbHVlLnh5KSxcbiAgICAgICAgICAgICAgICAgIGRvdChkeVZhbHVlLCB3VmFsdWUuencpKTtcblxuICAgICAgICAgICAgICAgIGR5VmFsdWUgPSBtb2QoZmxvYXQoaWR5QzIpLCAyLikgPT0gMC4gP1xuICAgICAgICAgICAgICAgICAgZHlTYW1wbGUyLnh5IDogZHlTYW1wbGUyLnp3O1xuICAgICAgICAgICAgICAgIHJlc3VsdC56dyArPSB2ZWMyKGRvdChkeVZhbHVlLCB3VmFsdWUueHkpLFxuICAgICAgICAgICAgICAgICAgZG90KGR5VmFsdWUsIHdWYWx1ZS56dykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeUNWYWwpIHtcbiAgICAgICAgICAgICAgZm9yIChpbnQgZDIgPSAwOyBkMiA8ICR7Y29udkluZm8ub3V0Q2hhbm5lbHN9OyBkMiArPSAyKSB7XG4gICAgICAgICAgICAgICAgdmVjNCB3VmFsdWUgPSBnZXRXKHdSUGVybSwgd0NQZXJtLCBkMSwgZDIpO1xuICAgICAgICAgICAgICAgIHZlYzQgZHlTYW1wbGUgPSBnZXREeShiYXRjaCwgaWR5UiwgaWR5QywgZDIpO1xuICAgICAgICAgICAgICAgIHZlYzIgZHlWYWx1ZSA9IG1vZChmbG9hdChpZHlDKSwgMi4pID09IDAuID9cbiAgICAgICAgICAgICAgICAgIGR5U2FtcGxlLnh5IDogZHlTYW1wbGUuenc7XG4gICAgICAgICAgICAgICAgcmVzdWx0Lnh5ICs9IHZlYzIoZG90KGR5VmFsdWUsIHdWYWx1ZS54eSksXG4gICAgICAgICAgICAgICAgICBkb3QoZHlWYWx1ZSwgd1ZhbHVlLnp3KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaWR5Q1ZhbDIpIHtcbiAgICAgICAgICAgICAgZm9yIChpbnQgZDIgPSAwOyBkMiA8ICR7Y29udkluZm8ub3V0Q2hhbm5lbHN9OyBkMiArPSAyKSB7XG4gICAgICAgICAgICAgICAgdmVjNCB3VmFsdWUgPSBnZXRXKHdSUGVybSwgd0NQZXJtLCBkMSwgZDIpO1xuICAgICAgICAgICAgICAgIHZlYzQgZHlTYW1wbGUgPSBnZXREeShiYXRjaCwgaWR5UiwgaWR5QzIsIGQyKTtcbiAgICAgICAgICAgICAgICB2ZWMyIGR5VmFsdWUgPSBtb2QoZmxvYXQoaWR5QzIpLCAyLikgPT0gMC4gP1xuICAgICAgICAgICAgICAgICAgZHlTYW1wbGUueHkgOiBkeVNhbXBsZS56dztcbiAgICAgICAgICAgICAgICByZXN1bHQuencgKz0gdmVjMihkb3QoZHlWYWx1ZSwgd1ZhbHVlLnh5KSxcbiAgICAgICAgICAgICAgICAgIGRvdChkeVZhbHVlLCB3VmFsdWUuencpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRPdXRwdXQocmVzdWx0KTtcbiAgICAgIH1cbiAgICBgO1xuICB9XG59XG4iXX0=