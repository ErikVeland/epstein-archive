/**
 * @license
 * Copyright 2023 CodeSmith LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
import { Layer } from './topology';
import { RandomSeed } from '../backend/random_seed';
class BaseRandomLayer extends Layer {
    constructor(args) {
        super(args);
        this.randomGenerator = new RandomSeed(args.seed);
    }
    getConfig() {
        const config = {
            'seed': this.randomGenerator.seed
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
// A layer handle the random number creation and savemodel behavior.
/** @nocollapse */
BaseRandomLayer.className = 'BaseRandomLayer';
export { BaseRandomLayer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV9yYW5kb21fbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvZW5naW5lL2Jhc2VfcmFuZG9tX2xheWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsT0FBTyxFQUFhLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFPcEQsTUFBc0IsZUFBZ0IsU0FBUSxLQUFLO0lBTWpELFlBQVksSUFBeUI7UUFDbkMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVRLFNBQVM7UUFDaEIsTUFBTSxNQUFNLEdBQTZCO1lBQ3ZDLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUk7U0FDbEMsQ0FBQztRQUVGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDOztBQWxCRCxvRUFBb0U7QUFDcEUsa0JBQWtCO0FBQ1gseUJBQVMsR0FBRyxpQkFBaUIsQ0FBQztTQUhqQixlQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgQ29kZVNtaXRoIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHsgTGF5ZXJBcmdzLCBMYXllciB9IGZyb20gJy4vdG9wb2xvZ3knO1xuaW1wb3J0IHsgUmFuZG9tU2VlZCB9IGZyb20gJy4uL2JhY2tlbmQvcmFuZG9tX3NlZWQnO1xuaW1wb3J0IHsgc2VyaWFsaXphdGlvbiB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBCYXNlUmFuZG9tTGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgc2VlZD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VSYW5kb21MYXllciBleHRlbmRzIExheWVyIHtcbiAgLy8gQSBsYXllciBoYW5kbGUgdGhlIHJhbmRvbSBudW1iZXIgY3JlYXRpb24gYW5kIHNhdmVtb2RlbCBiZWhhdmlvci5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnQmFzZVJhbmRvbUxheWVyJztcbiAgcHJvdGVjdGVkIHJhbmRvbUdlbmVyYXRvcjogUmFuZG9tU2VlZDtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBCYXNlUmFuZG9tTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5yYW5kb21HZW5lcmF0b3IgPSBuZXcgUmFuZG9tU2VlZChhcmdzLnNlZWQpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICAnc2VlZCc6IHRoaXMucmFuZG9tR2VuZXJhdG9yLnNlZWRcbiAgICB9O1xuXG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG4iXX0=