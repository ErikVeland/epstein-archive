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
import { ENGINE } from '../engine';
import { dispose, tidy } from '../globals';
import { add } from '../ops/add';
import { mul } from '../ops/mul';
import { scalar } from '../ops/scalar';
import { zerosLike } from '../ops/zeros_like';
import { SGDOptimizer } from './sgd_optimizer';
/** @doclink Optimizer */
export class MomentumOptimizer extends SGDOptimizer {
    /** @nocollapse */
    // Name matters for Python compatibility.
    static get className() {
        // Name matters for Python compatibility.
        // This is a getter instead of a property because when it's a property, it
        // prevents the entire class from being tree-shaken.
        return 'Momentum';
    }
    constructor(learningRate, momentum, useNesterov = false) {
        super(learningRate);
        this.learningRate = learningRate;
        this.momentum = momentum;
        this.useNesterov = useNesterov;
        this.accumulations = [];
        this.m = scalar(this.momentum);
    }
    applyGradients(variableGradients) {
        const variableNames = Array.isArray(variableGradients) ?
            variableGradients.map(item => item.name) :
            Object.keys(variableGradients);
        variableNames.forEach((name, i) => {
            const value = ENGINE.registeredVariables[name];
            if (this.accumulations[i] == null) {
                const trainable = false;
                this.accumulations[i] = {
                    originalName: `${name}/momentum`,
                    variable: tidy(() => zerosLike(value).variable(trainable))
                };
            }
            const accumulation = this.accumulations[i].variable;
            const gradient = Array.isArray(variableGradients) ?
                variableGradients[i].tensor :
                variableGradients[name];
            if (gradient == null) {
                return;
            }
            tidy(() => {
                let newValue;
                const newAccumulation = add(mul(this.m, accumulation), gradient);
                if (this.useNesterov) {
                    newValue = add(mul(this.c, add(gradient, mul(newAccumulation, this.m))), value);
                }
                else {
                    newValue = add(mul(this.c, newAccumulation), value);
                }
                accumulation.assign(newAccumulation);
                value.assign(newValue);
            });
        });
        this.incrementIterations();
    }
    dispose() {
        this.m.dispose();
        if (this.accumulations != null) {
            dispose(this.accumulations.map(v => v.variable));
        }
    }
    /**
     * Sets the momentum of the optimizer.
     *
     * @param momentum
     */
    setMomentum(momentum) {
        this.momentum = momentum;
    }
    async getWeights() {
        // Order matters for Python compatibility.
        return [await this.saveIterations()].concat(this.accumulations.map(v => ({ name: v.originalName, tensor: v.variable })));
    }
    async setWeights(weightValues) {
        weightValues = await this.extractIterations(weightValues);
        const trainable = false;
        this.accumulations = weightValues.map(v => ({ originalName: v.name, variable: v.tensor.variable(trainable) }));
    }
    getConfig() {
        return {
            'learningRate': this.learningRate,
            'momentum': this.momentum,
            'useNesterov': this.useNesterov
        };
    }
    /** @nocollapse */
    static fromConfig(cls, config) {
        return new cls(config['learningRate'], config['momentum'], config['useNesterov']);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9tZW50dW1fb3B0aW1pemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHRpbWl6ZXJzL21vbWVudHVtX29wdGltaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDL0IsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvQixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQU01QyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFN0MseUJBQXlCO0FBQ3pCLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxZQUFZO0lBQ2pELGtCQUFrQjtJQUNsQix5Q0FBeUM7SUFDekMsTUFBTSxLQUFjLFNBQVM7UUFDM0IseUNBQXlDO1FBQ3pDLDBFQUEwRTtRQUMxRSxvREFBb0Q7UUFDcEQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUlELFlBQ3VCLFlBQW9CLEVBQVUsUUFBZ0IsRUFDekQsY0FBYyxLQUFLO1FBQzdCLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUZDLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUN6RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUp2QixrQkFBYSxHQUF3QixFQUFFLENBQUM7UUFNOUMsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pDLENB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RSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUM5RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFUSxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQTJCO1FBQ25ELFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUNqQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVRLFNBQVM7UUFDaEIsT0FBTztZQUNMLGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUNqQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDekIsYUFBYSxFQUFFLElBQUksQ0FBQyxXQUFXO1NBQ2hDLENBQUM7SUFDSixDQUFDO0lBRUQsa0JBQWtCO0lBQ2xCLE1BQU0sQ0FBVSxVQUFVLENBQ3RCLEdBQStCLEVBQUUsTUFBa0I7UUFDckQsT0FBTyxJQUFJLEdBQUcsQ0FDVixNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtFTkdJTkV9IGZyb20gJy4uL2VuZ2luZSc7XG5pbXBvcnQge2Rpc3Bvc2UsIHRpZHl9IGZyb20gJy4uL2dsb2JhbHMnO1xuaW1wb3J0IHthZGR9IGZyb20gJy4uL29wcy9hZGQnO1xuaW1wb3J0IHttdWx9IGZyb20gJy4uL29wcy9tdWwnO1xuaW1wb3J0IHtzY2FsYXJ9IGZyb20gJy4uL29wcy9zY2FsYXInO1xuaW1wb3J0IHt6ZXJvc0xpa2V9IGZyb20gJy4uL29wcy96ZXJvc19saWtlJztcbmltcG9ydCB7Q29uZmlnRGljdCwgU2VyaWFsaXphYmxlLCBTZXJpYWxpemFibGVDb25zdHJ1Y3Rvcn0gZnJvbSAnLi4vc2VyaWFsaXphdGlvbic7XG5pbXBvcnQge1NjYWxhciwgVGVuc29yfSBmcm9tICcuLi90ZW5zb3InO1xuaW1wb3J0IHtOYW1lZFRlbnNvciwgTmFtZWRWYXJpYWJsZU1hcH0gZnJvbSAnLi4vdGVuc29yX3R5cGVzJztcblxuaW1wb3J0IHtPcHRpbWl6ZXJWYXJpYWJsZX0gZnJvbSAnLi9vcHRpbWl6ZXInO1xuaW1wb3J0IHtTR0RPcHRpbWl6ZXJ9IGZyb20gJy4vc2dkX29wdGltaXplcic7XG5cbi8qKiBAZG9jbGluayBPcHRpbWl6ZXIgKi9cbmV4cG9ydCBjbGFzcyBNb21lbnR1bU9wdGltaXplciBleHRlbmRzIFNHRE9wdGltaXplciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAvLyBOYW1lIG1hdHRlcnMgZm9yIFB5dGhvbiBjb21wYXRpYmlsaXR5LlxuICBzdGF0aWMgb3ZlcnJpZGUgZ2V0IGNsYXNzTmFtZSgpIHtcbiAgICAvLyBOYW1lIG1hdHRlcnMgZm9yIFB5dGhvbiBjb21wYXRpYmlsaXR5LlxuICAgIC8vIFRoaXMgaXMgYSBnZXR0ZXIgaW5zdGVhZCBvZiBhIHByb3BlcnR5IGJlY2F1c2Ugd2hlbiBpdCdzIGEgcHJvcGVydHksIGl0XG4gICAgLy8gcHJldmVudHMgdGhlIGVudGlyZSBjbGFzcyBmcm9tIGJlaW5nIHRyZWUtc2hha2VuLlxuICAgIHJldHVybiAnTW9tZW50dW0nO1xuICB9XG4gIHByaXZhdGUgbTogU2NhbGFyO1xuICBwcml2YXRlIGFjY3VtdWxhdGlvbnM6IE9wdGltaXplclZhcmlhYmxlW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBvdmVycmlkZSBsZWFybmluZ1JhdGU6IG51bWJlciwgcHJpdmF0ZSBtb21lbnR1bTogbnVtYmVyLFxuICAgICAgcHJpdmF0ZSB1c2VOZXN0ZXJvdiA9IGZhbHNlKSB7XG4gICAgc3VwZXIobGVhcm5pbmdSYXRlKTtcbiAgICB0aGlzLm0gPSBzY2FsYXIodGhpcy5tb21lbnR1bSk7XG4gIH1cblxuICBvdmVycmlkZSBhcHBseUdyYWRpZW50cyh2YXJpYWJsZUdyYWRpZW50czogTmFtZWRWYXJpYWJsZU1hcHxOYW1lZFRlbnNvcltdKSB7XG4gICAgY29uc3QgdmFyaWFibGVOYW1lcyA9IEFycmF5LmlzQXJyYXkodmFyaWFibGVHcmFkaWVudHMpID9cbiAgICAgICAgdmFyaWFibGVHcmFkaWVudHMubWFwKGl0ZW0gPT4gaXRlbS5uYW1lKSA6XG4gICAgICAgIE9iamVjdC5rZXlzKHZhcmlhYmxlR3JhZGllbnRzKTtcblxuICAgIHZhcmlhYmxlTmFtZXMuZm9yRWFjaCgobmFtZSwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBFTkdJTkUucmVnaXN0ZXJlZFZhcmlhYmxlc1tuYW1lXTtcbiAgICAgIGlmICh0aGlzLmFjY3VtdWxhdGlvbnNbaV0gPT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0cmFpbmFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5hY2N1bXVsYXRpb25zW2ldID0ge1xuICAgICAgICAgIG9yaWdpbmFsTmFtZTogYCR7bmFtZX0vbW9tZW50dW1gLFxuICAgICAgICAgIHZhcmlhYmxlOiB0aWR5KCgpID0+IHplcm9zTGlrZSh2YWx1ZSkudmFyaWFibGUodHJhaW5hYmxlKSlcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWNjdW11bGF0aW9uID0gdGhpcy5hY2N1bXVsYXRpb25zW2ldLnZhcmlhYmxlO1xuICAgICAgY29uc3QgZ3JhZGllbnQgPSBBcnJheS5pc0FycmF5KHZhcmlhYmxlR3JhZGllbnRzKSA/XG4gICAgICAgICAgdmFyaWFibGVHcmFkaWVudHNbaV0udGVuc29yIDpcbiAgICAgICAgICB2YXJpYWJsZUdyYWRpZW50c1tuYW1lXTtcbiAgICAgIGlmIChncmFkaWVudCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGlkeSgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdWYWx1ZTogVGVuc29yO1xuICAgICAgICBjb25zdCBuZXdBY2N1bXVsYXRpb24gPSBhZGQobXVsKHRoaXMubSwgYWNjdW11bGF0aW9uKSwgZ3JhZGllbnQpO1xuICAgICAgICBpZiAodGhpcy51c2VOZXN0ZXJvdikge1xuICAgICAgICAgIG5ld1ZhbHVlID0gYWRkKFxuICAgICAgICAgICAgICBtdWwodGhpcy5jLCBhZGQoZ3JhZGllbnQsIG11bChuZXdBY2N1bXVsYXRpb24sIHRoaXMubSkpKSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5ld1ZhbHVlID0gYWRkKG11bCh0aGlzLmMsIG5ld0FjY3VtdWxhdGlvbiksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBhY2N1bXVsYXRpb24uYXNzaWduKG5ld0FjY3VtdWxhdGlvbik7XG4gICAgICAgIHZhbHVlLmFzc2lnbihuZXdWYWx1ZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLmluY3JlbWVudEl0ZXJhdGlvbnMoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5tLmRpc3Bvc2UoKTtcbiAgICBpZiAodGhpcy5hY2N1bXVsYXRpb25zICE9IG51bGwpIHtcbiAgICAgIGRpc3Bvc2UodGhpcy5hY2N1bXVsYXRpb25zLm1hcCh2ID0+IHYudmFyaWFibGUpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgbW9tZW50dW0gb2YgdGhlIG9wdGltaXplci5cbiAgICpcbiAgICogQHBhcmFtIG1vbWVudHVtXG4gICAqL1xuICBzZXRNb21lbnR1bShtb21lbnR1bTogbnVtYmVyKSB7XG4gICAgdGhpcy5tb21lbnR1bSA9IG1vbWVudHVtO1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgZ2V0V2VpZ2h0cygpOiBQcm9taXNlPE5hbWVkVGVuc29yW10+IHtcbiAgICAvLyBPcmRlciBtYXR0ZXJzIGZvciBQeXRob24gY29tcGF0aWJpbGl0eS5cbiAgICByZXR1cm4gW2F3YWl0IHRoaXMuc2F2ZUl0ZXJhdGlvbnMoKV0uY29uY2F0KHRoaXMuYWNjdW11bGF0aW9ucy5tYXAoXG4gICAgICAgIHYgPT4gKHtuYW1lOiB2Lm9yaWdpbmFsTmFtZSwgdGVuc29yOiB2LnZhcmlhYmxlfSkpKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIHNldFdlaWdodHMod2VpZ2h0VmFsdWVzOiBOYW1lZFRlbnNvcltdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgd2VpZ2h0VmFsdWVzID0gYXdhaXQgdGhpcy5leHRyYWN0SXRlcmF0aW9ucyh3ZWlnaHRWYWx1ZXMpO1xuICAgIGNvbnN0IHRyYWluYWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuYWNjdW11bGF0aW9ucyA9IHdlaWdodFZhbHVlcy5tYXAoXG4gICAgICAgIHYgPT4gKHtvcmlnaW5hbE5hbWU6IHYubmFtZSwgdmFyaWFibGU6IHYudGVuc29yLnZhcmlhYmxlKHRyYWluYWJsZSl9KSk7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogQ29uZmlnRGljdCB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdsZWFybmluZ1JhdGUnOiB0aGlzLmxlYXJuaW5nUmF0ZSxcbiAgICAgICdtb21lbnR1bSc6IHRoaXMubW9tZW50dW0sXG4gICAgICAndXNlTmVzdGVyb3YnOiB0aGlzLnVzZU5lc3Rlcm92XG4gICAgfTtcbiAgfVxuXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgZnJvbUNvbmZpZzxUIGV4dGVuZHMgU2VyaWFsaXphYmxlPihcbiAgICAgIGNsczogU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4sIGNvbmZpZzogQ29uZmlnRGljdCk6IFQge1xuICAgIHJldHVybiBuZXcgY2xzKFxuICAgICAgICBjb25maWdbJ2xlYXJuaW5nUmF0ZSddLCBjb25maWdbJ21vbWVudHVtJ10sIGNvbmZpZ1sndXNlTmVzdGVyb3YnXSk7XG4gIH1cbn1cbiJdfQ==