/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import { parseNodeName } from '../operations/executors/utils';
/**
 * Given graph inputs and desired outputs, find the minimal set of nodes
 * to execute in order to compute the outputs. In addition return other useful
 * info such:
 * - Missing inputs needed to compute the output.
 * - Whether the subgraph contains dynamic ops (control flow, dynamic shape).
 * - Alternative inputs in order to avoid async (dynamic op) execution.
 */
export function getExecutionSubgraph(inputs, outputs, weightMap, initNodes) {
    const usedNodes = new Set();
    const missingInputs = [];
    let dynamicNode = null;
    let syncInputs = null;
    // Start with the outputs, going backwards and find all the nodes that are
    // needed to compute those outputs.
    const seen = new Set();
    const inputNodeNames = new Set(Object.keys(inputs).map((name) => parseNodeName(name)[0]));
    initNodes = initNodes || [];
    const initNodeNames = new Set(initNodes.map((node) => parseNodeName(node.name)[0]));
    const frontier = [...outputs];
    while (frontier.length > 0) {
        const node = frontier.pop();
        if (isControlFlow(node) || isDynamicShape(node) || isHashTable(node)) {
            if (dynamicNode == null) {
                dynamicNode = node;
                syncInputs = dynamicNode.children.map(child => child.name)
                    .filter(name => usedNodes.has(name));
            }
        }
        usedNodes.add(node.name);
        // Weights are dead end since we already have their values.
        if (weightMap[node.name] != null) {
            continue;
        }
        // This node is a dead end since it's one of the user-provided inputs.
        if (inputNodeNames.has(node.name)) {
            continue;
        }
        // This node is a dead end since it doesn't have any inputs.
        if (initNodeNames.has(node.name)) {
            continue;
        }
        if (node.inputs.length === 0) {
            missingInputs.push(node.name);
            continue;
        }
        node.inputs.forEach(input => {
            // Don't add to the frontier if it is already there.
            if (seen.has(input.name)) {
                return;
            }
            seen.add(input.name);
            frontier.push(input);
        });
    }
    return { inputs, outputs, usedNodes, missingInputs, dynamicNode, syncInputs };
}
/**
 * Given the execution info, return a list of nodes in topological order that
 * need to be executed to compute the output.
 */
export function getNodesInTopologicalOrder(graph, executionInfo) {
    const { usedNodes, inputs } = executionInfo;
    const inputNodes = Object.keys(inputs)
        .map(name => parseNodeName(name)[0])
        .map(name => graph.nodes[name]);
    const initNodes = graph.initNodes || [];
    const isUsed = (node) => usedNodes.has(typeof node === 'string' ? node : node.name);
    function unique(nodes) {
        return [...new Map(nodes.map((node) => [node.name, node])).values()];
    }
    const predefinedNodes = unique([
        ...inputNodes,
        ...graph.weights,
        ...initNodes,
    ]).filter(isUsed);
    const allNodes = unique([
        ...predefinedNodes,
        ...Object.values(graph.nodes),
    ]).filter(isUsed);
    const nameToNode = new Map(allNodes.map((node) => [node.name, node]));
    const inCounts = {};
    for (const node of allNodes) {
        inCounts[node.name] = inCounts[node.name] || 0;
        for (const child of node.children) {
            // When the child is unused, set in counts to infinity so that it will
            // never be decreased to 0 and added to the execution list.
            if (!isUsed(child)) {
                inCounts[child.name] = Number.POSITIVE_INFINITY;
            }
            inCounts[child.name] = (inCounts[child.name] || 0) + 1;
        }
    }
    // Build execution order for all used nodes regardless whether they are
    // predefined or not.
    const frontier = Object.entries(inCounts)
        .filter(([, inCount]) => inCount === 0)
        .map(([name]) => name);
    const orderedNodeNames = [...frontier];
    while (frontier.length > 0) {
        const nodeName = frontier.pop();
        const node = nameToNode.get(nodeName);
        for (const child of node.children.filter(isUsed)) {
            if (--inCounts[child.name] === 0) {
                orderedNodeNames.push(child.name);
                frontier.push(child.name);
            }
        }
    }
    const orderedNodes = orderedNodeNames.map((name) => nameToNode.get(name));
    const filteredOrderedNodes = filterPredefinedReachableNodes(orderedNodes, predefinedNodes);
    // TODO: Turn validation on/off with tf env flag.
    validateNodesExecutionOrder(filteredOrderedNodes, predefinedNodes);
    return filteredOrderedNodes;
}
/**
 * This is a helper function of `getNodesInTopologicalOrder`.
 * Returns ordered nodes reachable by at least one predefined node.
 * This can help us filter out redundant nodes from the returned node list.
 * For example:
 * If we have four nodes with dependencies like this:
 *   a --> b --> c --> d
 * when node `c` is predefined (e.g. given as an input tensor), we can
 * skip node `a` and `b` since their outputs will never be used.
 *
 * @param orderedNodes Graph nodes in execution order.
 * @param predefinedNodes Graph inputs, weights, and init nodes. Nodes in this
 *     list must have distinct names.
 */
function filterPredefinedReachableNodes(orderedNodes, predefinedNodes) {
    const nameToNode = new Map(orderedNodes.map((node) => [node.name, node]));
    // TODO: Filter out more nodes when >=2 nodes are predefined in a path.
    const stack = predefinedNodes.map((node) => node.name);
    const predefinedReachableNodeNames = new Set(stack);
    // Perform a DFS starting from the set of all predefined nodes
    // to find the set of all nodes reachable from the predefined nodes.
    while (stack.length > 0) {
        const nodeName = stack.pop();
        const node = nameToNode.get(nodeName);
        for (const child of node.children) {
            if (!nameToNode.has(child.name) ||
                predefinedReachableNodeNames.has(child.name)) {
                continue;
            }
            predefinedReachableNodeNames.add(child.name);
            stack.push(child.name);
        }
    }
    // Filter out unreachable nodes and build the ordered node list.
    const filteredOrderedNodes = orderedNodes.filter((node) => predefinedReachableNodeNames.has(node.name));
    return filteredOrderedNodes;
}
class NodesExecutionOrderError extends Error {
    constructor(message) {
        super(`NodesExecutionOrderError: ${message}`);
    }
}
/**
 * This is a helper function of `getNodesInTopologicalOrder`.
 * Validates property: given nodes `a` and `b`, Order(a) > Order(b) if `a`
 * is a child of `b`. This function throws an error if validation fails.
 *
 * @param orderedNodes Graph nodes in execution order.
 * @param predefinedNodes Graph inputs, weights, and init nodes. Nodes in this
 *     list must have distinct names.
 */
function validateNodesExecutionOrder(orderedNodes, predefinedNodes) {
    const nodeNameToOrder = new Map(orderedNodes.map((node, order) => [node.name, order]));
    const predefinedNodeNames = new Set(predefinedNodes.map((node) => node.name));
    const isPredefined = (node) => predefinedNodeNames.has(typeof node === 'string' ? node : node.name);
    const willBeExecutedNodeNames = new Set(orderedNodes.map((node) => node.name));
    const willBeExecuted = (node) => willBeExecutedNodeNames.has(typeof node === 'string' ? node : node.name);
    for (const node of orderedNodes) {
        for (const child of node.children.filter(willBeExecuted)) {
            if (!nodeNameToOrder.has(child.name)) {
                throw new NodesExecutionOrderError(`Child ${child.name} of node ${node.name} is unreachable.`);
            }
            if (nodeNameToOrder.get(node.name) > nodeNameToOrder.get(child.name)) {
                throw new NodesExecutionOrderError(`Node ${node.name} is scheduled to run after its child ${child.name}.`);
            }
        }
        if (!isPredefined(node)) {
            for (const input of node.inputs) {
                if (!nodeNameToOrder.has(input.name)) {
                    throw new NodesExecutionOrderError(`Input ${input.name} of node ${node.name} is unreachable.`);
                }
                if (nodeNameToOrder.get(input.name) > nodeNameToOrder.get(node.name)) {
                    throw new NodesExecutionOrderError(`Node ${node.name} is scheduled to run before its input ${input.name}.`);
                }
            }
        }
    }
}
/**
 * Given the execution info, return a map from node name to the disposable
 * node name list after its execution.
 *
 * @returns A map from node name to disposable nodes after its
 *     execution. That is, for a node `x`, `nodeLiveUntilMap[x]` indicates
 *     all nodes which their intermediate tensors should be disposed after `x`
 *     being executed.
 */
export function getNodeLiveUntilMap(orderedNodes) {
    const nodeNameToOrder = new Map(orderedNodes.map((node, order) => [node.name, order]));
    const INF_LIFE = Number.MAX_SAFE_INTEGER;
    // Make control flow nodes (and consequently their direct parents)
    // live forever since they're tricky to track correctly.
    const selfLifespans = orderedNodes.map((node, nodeOrder) => isControlFlow(node) ? INF_LIFE : nodeOrder);
    const getSelfLifeSpan = (node) => {
        const selfLife = selfLifespans[nodeNameToOrder.get(node.name)];
        if (selfLife == null) {
            // If nodeToOrder does not contain the node, it is unused or
            // unreachable in graph.
            return -1;
        }
        return selfLife;
    };
    // `liveUntil[i]` points to the last node in the `orderedNodes` array that
    // may depend on tensors from node `i`. It indicates that all the
    // intermediate tensors from `orderedNodes[i]` should be disposed after
    // `orderedNodes[liveUntil[i]]` is executed.
    // A node lives long enough to pass on its tensors to its children.
    // It lives until at least `max(node's position, children's positions)`.
    const liveUntilOrders = orderedNodes.map((node, nodeOrder) => {
        return node.children.map(getSelfLifeSpan)
            .reduce((a, b) => Math.max(a, b), selfLifespans[nodeOrder]);
    });
    // liveUntilMap:
    // - Key: Name of a node `x`
    // - Values: All nodes whose intermediate tensors should be disposed
    //           after `x` is executed.
    const liveUntilMap = new Map();
    for (let nodeOrder = 0; nodeOrder < orderedNodes.length; ++nodeOrder) {
        const liveUntilOrder = liveUntilOrders[nodeOrder];
        if (liveUntilOrder === INF_LIFE) {
            continue;
        }
        const node = orderedNodes[nodeOrder];
        const liveUntilNode = orderedNodes[liveUntilOrder];
        if (!liveUntilMap.has(liveUntilNode.name)) {
            liveUntilMap.set(liveUntilNode.name, []);
        }
        liveUntilMap.get(liveUntilNode.name).push(node);
    }
    return liveUntilMap;
}
const CONTROL_FLOW_OPS = new Set([
    'Switch', 'Merge', 'Enter', 'Exit', 'NextIteration', 'StatelessIf',
    'StatelessWhile', 'if', 'While'
]);
const DYNAMIC_SHAPE_OPS = new Set([
    'NonMaxSuppressionV2', 'NonMaxSuppressionV3', 'NonMaxSuppressionV5', 'Where'
]);
const HASH_TABLE_OPS = new Set([
    'HashTable', 'HashTableV2', 'LookupTableImport', 'LookupTableImportV2',
    'LookupTableFind', 'LookupTableFindV2', 'LookupTableSize', 'LookupTableSizeV2'
]);
export function isControlFlow(node) {
    return CONTROL_FLOW_OPS.has(node.op);
}
export function isDynamicShape(node) {
    return DYNAMIC_SHAPE_OPS.has(node.op);
}
export function isHashTable(node) {
    return HASH_TABLE_OPS.has(node.op);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxfYW5hbHlzaXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWNvbnZlcnRlci9zcmMvZXhlY3V0b3IvbW9kZWxfYW5hbHlzaXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBS0gsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBWTVEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQ2hDLE1BQXNCLEVBQUUsT0FBZSxFQUFFLFNBQTBCLEVBQ25FLFNBQWtCO0lBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDcEMsTUFBTSxhQUFhLEdBQWEsRUFBRSxDQUFDO0lBQ25DLElBQUksV0FBVyxHQUFTLElBQUksQ0FBQztJQUM3QixJQUFJLFVBQVUsR0FBYSxJQUFJLENBQUM7SUFFaEMsMEVBQTBFO0lBQzFFLG1DQUFtQztJQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQy9CLE1BQU0sY0FBYyxHQUNoQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2RSxTQUFTLEdBQUcsU0FBUyxJQUFJLEVBQUUsQ0FBQztJQUM1QixNQUFNLGFBQWEsR0FDZixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRSxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDOUIsT0FBTyxR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TSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUNoQyxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxPQUFPO0NBQzdFLENBQUMsQ0FBQztBQUNILE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDO0lBQzdCLFdBQVcsRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCO0lBQ3RFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLG1CQUFtQjtDQUMvRSxDQUFDLENBQUM7QUFFSCxNQUFNLFVBQVUsYUFBYSxDQUFDLElBQVU7SUFDdEMsT0FBTyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLElBQVU7SUFDdkMsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLElBQVU7SUFDcEMsT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge05hbWVkVGVuc29yTWFwfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQge05hbWVkVGVuc29yc01hcH0gZnJvbSAnLi4vZGF0YS90eXBlcyc7XG5pbXBvcnQge3BhcnNlTm9kZU5hbWV9IGZyb20gJy4uL29wZXJhdGlvbnMvZXhlY3V0b3JzL3V0aWxzJztcbmltcG9ydCB7R3JhcGgsIE5vZGV9IGZyb20gJy4uL29wZXJhdGlvbnMvdHlwZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvbkluZm8ge1xuICBpbnB1dHM6IE5hbWVkVGVuc29yTWFwO1xuICBvdXRwdXRzOiBOb2RlW107XG4gIHVzZWROb2RlczogU2V0PHN0cmluZz47XG4gIG1pc3NpbmdJbnB1dHM6IHN0cmluZ1tdO1xuICBkeW5hbWljTm9kZTogTm9kZTtcbiAgc3luY0lucHV0czogc3RyaW5nW107XG59XG5cbi8qKlxuICogR2l2ZW4gZ3JhcGggaW5wdXRzIGFuZCBkZXNpcmVkIG91dHB1dHMsIGZpbmQgdGhlIG1pbmltYWwgc2V0IG9mIG5vZGVzXG4gKiB0byBleGVjdXRlIGluIG9yZGVyIHRvIGNvbXB1dGUgdGhlIG91dHB1dHMuIEluIGFkZGl0aW9uIHJldHVybiBvdGhlciB1c2VmdWxcbiAqIGluZm8gc3VjaDpcbiAqIC0gTWlzc2luZyBpbnB1dHMgbmVlZGVkIHRvIGNvbXB1dGUgdGhlIG91dHB1dC5cbiAqIC0gV2hldGhlciB0aGUgc3ViZ3JhcGggY29udGFpbnMgZHluYW1pYyBvcHMgKGNvbnRyb2wgZmxvdywgZHluYW1pYyBzaGFwZSkuXG4gKiAtIEFsdGVybmF0aXZlIGlucHV0cyBpbiBvcmRlciB0byBhdm9pZCBhc3luYyAoZHluYW1pYyBvcCkgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uU3ViZ3JhcGgoXG4gICAgaW5wdXRzOiBOYW1lZFRlbnNvck1hcCwgb3V0cHV0czogTm9kZVtdLCB3ZWlnaHRNYXA6IE5hbWVkVGVuc29yc01hcCxcbiAgICBpbml0Tm9kZXM/OiBOb2RlW10pOiBFeGVjdXRpb25JbmZvIHtcbiAgY29uc3QgdXNlZE5vZGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG1pc3NpbmdJbnB1dHM6IHN0cmluZ1tdID0gW107XG4gIGxldCBkeW5hbWljTm9kZTogTm9kZSA9IG51bGw7XG4gIGxldCBzeW5jSW5wdXRzOiBzdHJpbmdbXSA9IG51bGw7XG5cbiAgLy8gU3RhcnQgd2l0aCB0aGUgb3V0cHV0cywgZ29pbmcgYmFja3dhcmRzIGFuZCBmaW5kIGFsbCB0aGUgbm9kZXMgdGhhdCBhcmVcbiAgLy8gbmVlZGVkIHRvIGNvbXB1dGUgdGhvc2Ugb3V0cHV0cy5cbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbnB1dE5vZGVOYW1lcyA9XG4gICAgICBuZXcgU2V0KE9iamVjdC5rZXlzKGlucHV0cykubWFwKChuYW1lKSA9PiBwYXJzZU5vZGVOYW1lKG5hbWUpWzBdKSk7XG5cbiAgaW5pdE5vZGVzID0gaW5pdE5vZGVzIHx8IFtdO1xuICBjb25zdCBpbml0Tm9kZU5hbWVzID1cbiAgICAgIG5ldyBTZXQoaW5pdE5vZGVzLm1hcCgobm9kZSkgPT4gcGFyc2VOb2RlTmFtZShub2RlLm5hbWUpWzBdKSk7XG5cbiAgY29uc3QgZnJvbnRpZXIgPSBbLi4ub3V0cHV0c107XG4gIHdoaWxlIChmcm9udGllci5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgbm9kZSA9IGZyb250aWVyLnBvcCgpO1xuICAgIGlmIChpc0NvbnRyb2xGbG93KG5vZGUpIHx8IGlzRHluYW1pY1NoYXBlKG5vZGUpIHx8IGlzSGFzaFRhYmxlKG5vZGUpKSB7XG4gICAgICBpZiAoZHluYW1pY05vZGUgPT0gbnVsbCkge1xuICAgICAgICBkeW5hbWljTm9kZSA9IG5vZGU7XG4gICAgICAgIHN5bmNJbnB1dHMgPSBkeW5hbWljTm9kZS5jaGlsZHJlbi5tYXAoY2hpbGQgPT4gY2hpbGQubmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKG5hbWUgPT4gdXNlZE5vZGVzLmhhcyhuYW1lKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHVzZWROb2Rlcy5hZGQobm9kZS5uYW1lKTtcblxuICAgIC8vIFdlaWdodHMgYXJlIGRlYWQgZW5kIHNpbmNlIHdlIGFscmVhZHkgaGF2ZSB0aGVpciB2YWx1ZXMuXG4gICAgaWYgKHdlaWdodE1hcFtub2RlLm5hbWVdICE9IG51bGwpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBUaGlzIG5vZGUgaXMgYSBkZWFkIGVuZCBzaW5jZSBpdCdzIG9uZSBvZiB0aGUgdXNlci1wcm92aWRlZCBpbnB1dHMuXG4gICAgaWYgKGlucHV0Tm9kZU5hbWVzLmhhcyhub2RlLm5hbWUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gVGhpcyBub2RlIGlzIGEgZGVhZCBlbmQgc2luY2UgaXQgZG9lc24ndCBoYXZlIGFueSBpbnB1dHMuXG4gICAgaWYgKGluaXROb2RlTmFtZXMuaGFzKG5vZGUubmFtZSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAobm9kZS5pbnB1dHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBtaXNzaW5nSW5wdXRzLnB1c2gobm9kZS5uYW1lKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBub2RlLmlucHV0cy5mb3JFYWNoKGlucHV0ID0+IHtcbiAgICAgIC8vIERvbid0IGFkZCB0byB0aGUgZnJvbnRpZXIgaWYgaXQgaXMgYWxyZWFkeSB0aGVyZS5cbiAgICAgIGlmIChzZWVuLmhhcyhpbnB1dC5uYW1lKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWVuLmFkZChpbnB1dC5uYW1lKTtcbiAgICAgIGZyb250aWVyLnB1c2goaW5wdXQpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiB7aW5wdXRzLCBvdXRwdXRzLCB1c2VkTm9kZXMsIG1pc3NpbmdJbnB1dHMsIGR5bmFtaWNOb2RlLCBzeW5jSW5wdXRzfTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0aGUgZXhlY3V0aW9uIGluZm8sIHJldHVybiBhIGxpc3Qgb2Ygbm9kZXMgaW4gdG9wb2xvZ2ljYWwgb3JkZXIgdGhhdFxuICogbmVlZCB0byBiZSBleGVjdXRlZCB0byBjb21wdXRlIHRoZSBvdXRwdXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2Rlc0luVG9wb2xvZ2ljYWxPcmRlcihcbiAgICBncmFwaDogR3JhcGgsIGV4ZWN1dGlvbkluZm86IEV4ZWN1dGlvbkluZm8pOiBOb2RlW10ge1xuICBjb25zdCB7dXNlZE5vZGVzLCBpbnB1dHN9ID0gZXhlY3V0aW9uSW5mbztcbiAgY29uc3QgaW5wdXROb2RlcyA9IE9iamVjdC5rZXlzKGlucHV0cylcbiAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKG5hbWUgPT4gcGFyc2VOb2RlTmFtZShuYW1lKVswXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKG5hbWUgPT4gZ3JhcGgubm9kZXNbbmFtZV0pO1xuICBjb25zdCBpbml0Tm9kZXMgPSBncmFwaC5pbml0Tm9kZXMgfHwgW107XG5cbiAgY29uc3QgaXNVc2VkID0gKG5vZGU6IE5vZGV8c3RyaW5nKSA9PlxuICAgICAgdXNlZE5vZGVzLmhhcyh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycgPyBub2RlIDogbm9kZS5uYW1lKTtcblxuICBmdW5jdGlvbiB1bmlxdWUobm9kZXM6IE5vZGVbXSk6IE5vZGVbXSB7XG4gICAgcmV0dXJuIFsuLi5uZXcgTWFwKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUubmFtZSwgbm9kZV0pKS52YWx1ZXMoKV07XG4gIH1cbiAgY29uc3QgcHJlZGVmaW5lZE5vZGVzID0gdW5pcXVlKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5pbnB1dE5vZGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmdyYXBoLndlaWdodHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uaW5pdE5vZGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBdKS5maWx0ZXIoaXNVc2VkKTtcbiAgY29uc3QgYWxsTm9kZXMgPSB1bmlxdWUoW1xuICAgICAgICAgICAgICAgICAgICAgLi4ucHJlZGVmaW5lZE5vZGVzLFxuICAgICAgICAgICAgICAgICAgICAgLi4uT2JqZWN0LnZhbHVlcyhncmFwaC5ub2RlcyksXG4gICAgICAgICAgICAgICAgICAgXSkuZmlsdGVyKGlzVXNlZCk7XG4gIGNvbnN0IG5hbWVUb05vZGUgPVxuICAgICAgbmV3IE1hcDxzdHJpbmcsIE5vZGU+KGFsbE5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUubmFtZSwgbm9kZV0pKTtcblxuICBjb25zdCBpbkNvdW50czogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICBmb3IgKGNvbnN0IG5vZGUgb2YgYWxsTm9kZXMpIHtcbiAgICBpbkNvdW50c1tub2RlLm5hbWVdID0gaW5Db3VudHNbbm9kZS5uYW1lXSB8fCAwO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgLy8gV2hlbiB0aGUgY2hpbGQgaXMgdW51c2VkLCBzZXQgaW4gY291bnRzIHRvIGluZmluaXR5IHNvIHRoYXQgaXQgd2lsbFxuICAgICAgLy8gbmV2ZXIgYmUgZGVjcmVhc2VkIHRvIDAgYW5kIGFkZGVkIHRvIHRoZSBleGVjdXRpb24gbGlzdC5cbiAgICAgIGlmICghaXNVc2VkKGNoaWxkKSkge1xuICAgICAgICBpbkNvdW50c1tjaGlsZC5uYW1lXSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICAgIH1cbiAgICAgIGluQ291bnRzW2NoaWxkLm5hbWVdID0gKGluQ291bnRzW2NoaWxkLm5hbWVdIHx8IDApICsgMTtcbiAgICB9XG4gIH1cblxuICAvLyBCdWlsZCBleGVjdXRpb24gb3JkZXIgZm9yIGFsbCB1c2VkIG5vZGVzIHJlZ2FyZGxlc3Mgd2hldGhlciB0aGV5IGFyZVxuICAvLyBwcmVkZWZpbmVkIG9yIG5vdC5cbiAgY29uc3QgZnJvbnRpZXIgPSBPYmplY3QuZW50cmllcyhpbkNvdW50cylcbiAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoWywgaW5Db3VudF0pID0+IGluQ291bnQgPT09IDApXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKFtuYW1lXSkgPT4gbmFtZSk7XG4gIGNvbnN0IG9yZGVyZWROb2RlTmFtZXMgPSBbLi4uZnJvbnRpZXJdO1xuICB3aGlsZSAoZnJvbnRpZXIubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG5vZGVOYW1lID0gZnJvbnRpZXIucG9wKCk7XG4gICAgY29uc3Qgbm9kZSA9IG5hbWVUb05vZGUuZ2V0KG5vZGVOYW1lKSE7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuLmZpbHRlcihpc1VzZWQpKSB7XG4gICAgICBpZiAoLS1pbkNvdW50c1tjaGlsZC5uYW1lXSA9PT0gMCkge1xuICAgICAgICBvcmRlcmVkTm9kZU5hbWVzLnB1c2goY2hpbGQubmFtZSk7XG4gICAgICAgIGZyb250aWVyLnB1c2goY2hpbGQubmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgb3JkZXJlZE5vZGVzID0gb3JkZXJlZE5vZGVOYW1lcy5tYXAoKG5hbWUpID0+IG5hbWVUb05vZGUuZ2V0KG5hbWUpKTtcbiAgY29uc3QgZmlsdGVyZWRPcmRlcmVkTm9kZXMgPVxuICAgICAgZmlsdGVyUHJlZGVmaW5lZFJlYWNoYWJsZU5vZGVzKG9yZGVyZWROb2RlcywgcHJlZGVmaW5lZE5vZGVzKTtcblxuICAvLyBUT0RPOiBUdXJuIHZhbGlkYXRpb24gb24vb2ZmIHdpdGggdGYgZW52IGZsYWcuXG4gIHZhbGlkYXRlTm9kZXNFeGVjdXRpb25PcmRlcihmaWx0ZXJlZE9yZGVyZWROb2RlcywgcHJlZGVmaW5lZE5vZGVzKTtcblxuICByZXR1cm4gZmlsdGVyZWRPcmRlcmVkTm9kZXM7XG59XG5cbi8qKlxuICogVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiBvZiBgZ2V0Tm9kZXNJblRvcG9sb2dpY2FsT3JkZXJgLlxuICogUmV0dXJucyBvcmRlcmVkIG5vZGVzIHJlYWNoYWJsZSBieSBhdCBsZWFzdCBvbmUgcHJlZGVmaW5lZCBub2RlLlxuICogVGhpcyBjYW4gaGVscCB1cyBmaWx0ZXIgb3V0IHJlZHVuZGFudCBub2RlcyBmcm9tIHRoZSByZXR1cm5lZCBub2RlIGxpc3QuXG4gKiBGb3IgZXhhbXBsZTpcbiAqIElmIHdlIGhhdmUgZm91ciBub2RlcyB3aXRoIGRlcGVuZGVuY2llcyBsaWtlIHRoaXM6XG4gKiAgIGEgLS0+IGIgLS0+IGMgLS0+IGRcbiAqIHdoZW4gbm9kZSBgY2AgaXMgcHJlZGVmaW5lZCAoZS5nLiBnaXZlbiBhcyBhbiBpbnB1dCB0ZW5zb3IpLCB3ZSBjYW5cbiAqIHNraXAgbm9kZSBgYWAgYW5kIGBiYCBzaW5jZSB0aGVpciBvdXRwdXRzIHdpbGwgbmV2ZXIgYmUgdXNlZC5cbiAqXG4gKiBAcGFyYW0gb3JkZXJlZE5vZGVzIEdyYXBoIG5vZGVzIGluIGV4ZWN1dGlvbiBvcmRlci5cbiAqIEBwYXJhbSBwcmVkZWZpbmVkTm9kZXMgR3JhcGggaW5wdXRzLCB3ZWlnaHRzLCBhbmQgaW5pdCBub2Rlcy4gTm9kZXMgaW4gdGhpc1xuICogICAgIGxpc3QgbXVzdCBoYXZlIGRpc3RpbmN0IG5hbWVzLlxuICovXG5mdW5jdGlvbiBmaWx0ZXJQcmVkZWZpbmVkUmVhY2hhYmxlTm9kZXMoXG4gICAgb3JkZXJlZE5vZGVzOiBOb2RlW10sIHByZWRlZmluZWROb2RlczogTm9kZVtdKSB7XG4gIGNvbnN0IG5hbWVUb05vZGUgPVxuICAgICAgbmV3IE1hcDxzdHJpbmcsIE5vZGU+KG9yZGVyZWROb2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLm5hbWUsIG5vZGVdKSk7XG5cbiAgLy8gVE9ETzogRmlsdGVyIG91dCBtb3JlIG5vZGVzIHdoZW4gPj0yIG5vZGVzIGFyZSBwcmVkZWZpbmVkIGluIGEgcGF0aC5cbiAgY29uc3Qgc3RhY2sgPSBwcmVkZWZpbmVkTm9kZXMubWFwKChub2RlKSA9PiBub2RlLm5hbWUpO1xuICBjb25zdCBwcmVkZWZpbmVkUmVhY2hhYmxlTm9kZU5hbWVzID0gbmV3IFNldChzdGFjayk7XG4gIC8vIFBlcmZvcm0gYSBERlMgc3RhcnRpbmcgZnJvbSB0aGUgc2V0IG9mIGFsbCBwcmVkZWZpbmVkIG5vZGVzXG4gIC8vIHRvIGZpbmQgdGhlIHNldCBvZiBhbGwgbm9kZXMgcmVhY2hhYmxlIGZyb20gdGhlIHByZWRlZmluZWQgbm9kZXMuXG4gIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgbm9kZU5hbWUgPSBzdGFjay5wb3AoKTtcbiAgICBjb25zdCBub2RlID0gbmFtZVRvTm9kZS5nZXQobm9kZU5hbWUpITtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIGlmICghbmFtZVRvTm9kZS5oYXMoY2hpbGQubmFtZSkgfHxcbiAgICAgICAgICBwcmVkZWZpbmVkUmVhY2hhYmxlTm9kZU5hbWVzLmhhcyhjaGlsZC5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHByZWRlZmluZWRSZWFjaGFibGVOb2RlTmFtZXMuYWRkKGNoaWxkLm5hbWUpO1xuICAgICAgc3RhY2sucHVzaChjaGlsZC5uYW1lKTtcbiAgICB9XG4gIH1cblxuICAvLyBGaWx0ZXIgb3V0IHVucmVhY2hhYmxlIG5vZGVzIGFuZCBidWlsZCB0aGUgb3JkZXJlZCBub2RlIGxpc3QuXG4gIGNvbnN0IGZpbHRlcmVkT3JkZXJlZE5vZGVzID0gb3JkZXJlZE5vZGVzLmZpbHRlcihcbiAgICAgIChub2RlKSA9PiBwcmVkZWZpbmVkUmVhY2hhYmxlTm9kZU5hbWVzLmhhcyhub2RlLm5hbWUpKTtcblxuICByZXR1cm4gZmlsdGVyZWRPcmRlcmVkTm9kZXM7XG59XG5cbmNsYXNzIE5vZGVzRXhlY3V0aW9uT3JkZXJFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYE5vZGVzRXhlY3V0aW9uT3JkZXJFcnJvcjogJHttZXNzYWdlfWApO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiBvZiBgZ2V0Tm9kZXNJblRvcG9sb2dpY2FsT3JkZXJgLlxuICogVmFsaWRhdGVzIHByb3BlcnR5OiBnaXZlbiBub2RlcyBgYWAgYW5kIGBiYCwgT3JkZXIoYSkgPiBPcmRlcihiKSBpZiBgYWBcbiAqIGlzIGEgY2hpbGQgb2YgYGJgLiBUaGlzIGZ1bmN0aW9uIHRocm93cyBhbiBlcnJvciBpZiB2YWxpZGF0aW9uIGZhaWxzLlxuICpcbiAqIEBwYXJhbSBvcmRlcmVkTm9kZXMgR3JhcGggbm9kZXMgaW4gZXhlY3V0aW9uIG9yZGVyLlxuICogQHBhcmFtIHByZWRlZmluZWROb2RlcyBHcmFwaCBpbnB1dHMsIHdlaWdodHMsIGFuZCBpbml0IG5vZGVzLiBOb2RlcyBpbiB0aGlzXG4gKiAgICAgbGlzdCBtdXN0IGhhdmUgZGlzdGluY3QgbmFtZXMuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlTm9kZXNFeGVjdXRpb25PcmRlcihcbiAgICBvcmRlcmVkTm9kZXM6IE5vZGVbXSwgcHJlZGVmaW5lZE5vZGVzOiBOb2RlW10pIHtcbiAgY29uc3Qgbm9kZU5hbWVUb09yZGVyID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oXG4gICAgICBvcmRlcmVkTm9kZXMubWFwKChub2RlLCBvcmRlcikgPT4gW25vZGUubmFtZSwgb3JkZXJdKSk7XG4gIGNvbnN0IHByZWRlZmluZWROb2RlTmFtZXMgPSBuZXcgU2V0KHByZWRlZmluZWROb2Rlcy5tYXAoKG5vZGUpID0+IG5vZGUubmFtZSkpO1xuICBjb25zdCBpc1ByZWRlZmluZWQgPSAobm9kZTogTm9kZXxzdHJpbmcpID0+XG4gICAgICBwcmVkZWZpbmVkTm9kZU5hbWVzLmhhcyh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycgPyBub2RlIDogbm9kZS5uYW1lKTtcbiAgY29uc3Qgd2lsbEJlRXhlY3V0ZWROb2RlTmFtZXMgPVxuICAgICAgbmV3IFNldChvcmRlcmVkTm9kZXMubWFwKChub2RlKSA9PiBub2RlLm5hbWUpKTtcbiAgY29uc3Qgd2lsbEJlRXhlY3V0ZWQgPSAobm9kZTogTm9kZXxzdHJpbmcpID0+XG4gICAgICB3aWxsQmVFeGVjdXRlZE5vZGVOYW1lcy5oYXModHlwZW9mIG5vZGUgPT09ICdzdHJpbmcnID8gbm9kZSA6IG5vZGUubmFtZSk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIG9yZGVyZWROb2Rlcykge1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbi5maWx0ZXIod2lsbEJlRXhlY3V0ZWQpKSB7XG4gICAgICBpZiAoIW5vZGVOYW1lVG9PcmRlci5oYXMoY2hpbGQubmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5vZGVzRXhlY3V0aW9uT3JkZXJFcnJvcihcbiAgICAgICAgICAgIGBDaGlsZCAke2NoaWxkLm5hbWV9IG9mIG5vZGUgJHtub2RlLm5hbWV9IGlzIHVucmVhY2hhYmxlLmApO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGVOYW1lVG9PcmRlci5nZXQobm9kZS5uYW1lKSA+IG5vZGVOYW1lVG9PcmRlci5nZXQoY2hpbGQubmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5vZGVzRXhlY3V0aW9uT3JkZXJFcnJvcihgTm9kZSAke1xuICAgICAgICAgICAgbm9kZS5uYW1lfSBpcyBzY2hlZHVsZWQgdG8gcnVuIGFmdGVyIGl0cyBjaGlsZCAke2NoaWxkLm5hbWV9LmApO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWlzUHJlZGVmaW5lZChub2RlKSkge1xuICAgICAgZm9yIChjb25zdCBpbnB1dCBvZiBub2RlLmlucHV0cykge1xuICAgICAgICBpZiAoIW5vZGVOYW1lVG9PcmRlci5oYXMoaW5wdXQubmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTm9kZXNFeGVjdXRpb25PcmRlckVycm9yKFxuICAgICAgICAgICAgICBgSW5wdXQgJHtpbnB1dC5uYW1lfSBvZiBub2RlICR7bm9kZS5uYW1lfSBpcyB1bnJlYWNoYWJsZS5gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZU5hbWVUb09yZGVyLmdldChpbnB1dC5uYW1lKSA+IG5vZGVOYW1lVG9PcmRlci5nZXQobm9kZS5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBOb2Rlc0V4ZWN1dGlvbk9yZGVyRXJyb3IoYE5vZGUgJHtcbiAgICAgICAgICAgICAgbm9kZS5uYW1lfSBpcyBzY2hlZHVsZWQgdG8gcnVuIGJlZm9yZSBpdHMgaW5wdXQgJHtpbnB1dC5uYW1lfS5gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEdpdmVuIHRoZSBleGVjdXRpb24gaW5mbywgcmV0dXJuIGEgbWFwIGZyb20gbm9kZSBuYW1lIHRvIHRoZSBkaXNwb3NhYmxlXG4gKiBub2RlIG5hbWUgbGlzdCBhZnRlciBpdHMgZXhlY3V0aW9uLlxuICpcbiAqIEByZXR1cm5zIEEgbWFwIGZyb20gbm9kZSBuYW1lIHRvIGRpc3Bvc2FibGUgbm9kZXMgYWZ0ZXIgaXRzXG4gKiAgICAgZXhlY3V0aW9uLiBUaGF0IGlzLCBmb3IgYSBub2RlIGB4YCwgYG5vZGVMaXZlVW50aWxNYXBbeF1gIGluZGljYXRlc1xuICogICAgIGFsbCBub2RlcyB3aGljaCB0aGVpciBpbnRlcm1lZGlhdGUgdGVuc29ycyBzaG91bGQgYmUgZGlzcG9zZWQgYWZ0ZXIgYHhgXG4gKiAgICAgYmVpbmcgZXhlY3V0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2RlTGl2ZVVudGlsTWFwKG9yZGVyZWROb2RlczogTm9kZVtdKTogTWFwPHN0cmluZywgTm9kZVtdPiB7XG4gIGNvbnN0IG5vZGVOYW1lVG9PcmRlciA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KFxuICAgICAgb3JkZXJlZE5vZGVzLm1hcCgobm9kZSwgb3JkZXIpID0+IFtub2RlLm5hbWUsIG9yZGVyXSkpO1xuXG4gIGNvbnN0IElORl9MSUZFID0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG4gIC8vIE1ha2UgY29udHJvbCBmbG93IG5vZGVzIChhbmQgY29uc2VxdWVudGx5IHRoZWlyIGRpcmVjdCBwYXJlbnRzKVxuICAvLyBsaXZlIGZvcmV2ZXIgc2luY2UgdGhleSdyZSB0cmlja3kgdG8gdHJhY2sgY29ycmVjdGx5LlxuICBjb25zdCBzZWxmTGlmZXNwYW5zID0gb3JkZXJlZE5vZGVzLm1hcChcbiAgICAgIChub2RlLCBub2RlT3JkZXIpID0+IGlzQ29udHJvbEZsb3cobm9kZSkgPyBJTkZfTElGRSA6IG5vZGVPcmRlcik7XG4gIGNvbnN0IGdldFNlbGZMaWZlU3BhbiA9IChub2RlOiBOb2RlKSA9PiB7XG4gICAgY29uc3Qgc2VsZkxpZmUgPSBzZWxmTGlmZXNwYW5zW25vZGVOYW1lVG9PcmRlci5nZXQobm9kZS5uYW1lKSFdO1xuICAgIGlmIChzZWxmTGlmZSA9PSBudWxsKSB7XG4gICAgICAvLyBJZiBub2RlVG9PcmRlciBkb2VzIG5vdCBjb250YWluIHRoZSBub2RlLCBpdCBpcyB1bnVzZWQgb3JcbiAgICAgIC8vIHVucmVhY2hhYmxlIGluIGdyYXBoLlxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZkxpZmU7XG4gIH07XG5cbiAgLy8gYGxpdmVVbnRpbFtpXWAgcG9pbnRzIHRvIHRoZSBsYXN0IG5vZGUgaW4gdGhlIGBvcmRlcmVkTm9kZXNgIGFycmF5IHRoYXRcbiAgLy8gbWF5IGRlcGVuZCBvbiB0ZW5zb3JzIGZyb20gbm9kZSBgaWAuIEl0IGluZGljYXRlcyB0aGF0IGFsbCB0aGVcbiAgLy8gaW50ZXJtZWRpYXRlIHRlbnNvcnMgZnJvbSBgb3JkZXJlZE5vZGVzW2ldYCBzaG91bGQgYmUgZGlzcG9zZWQgYWZ0ZXJcbiAgLy8gYG9yZGVyZWROb2Rlc1tsaXZlVW50aWxbaV1dYCBpcyBleGVjdXRlZC5cbiAgLy8gQSBub2RlIGxpdmVzIGxvbmcgZW5vdWdoIHRvIHBhc3Mgb24gaXRzIHRlbnNvcnMgdG8gaXRzIGNoaWxkcmVuLlxuICAvLyBJdCBsaXZlcyB1bnRpbCBhdCBsZWFzdCBgbWF4KG5vZGUncyBwb3NpdGlvbiwgY2hpbGRyZW4ncyBwb3NpdGlvbnMpYC5cbiAgY29uc3QgbGl2ZVVudGlsT3JkZXJzID0gb3JkZXJlZE5vZGVzLm1hcCgobm9kZSwgbm9kZU9yZGVyKSA9PiB7XG4gICAgcmV0dXJuIG5vZGUuY2hpbGRyZW4ubWFwKGdldFNlbGZMaWZlU3BhbilcbiAgICAgICAgLnJlZHVjZSgoYSwgYikgPT4gTWF0aC5tYXgoYSwgYiksIHNlbGZMaWZlc3BhbnNbbm9kZU9yZGVyXSk7XG4gIH0pO1xuXG4gIC8vIGxpdmVVbnRpbE1hcDpcbiAgLy8gLSBLZXk6IE5hbWUgb2YgYSBub2RlIGB4YFxuICAvLyAtIFZhbHVlczogQWxsIG5vZGVzIHdob3NlIGludGVybWVkaWF0ZSB0ZW5zb3JzIHNob3VsZCBiZSBkaXNwb3NlZFxuICAvLyAgICAgICAgICAgYWZ0ZXIgYHhgIGlzIGV4ZWN1dGVkLlxuICBjb25zdCBsaXZlVW50aWxNYXAgPSBuZXcgTWFwPHN0cmluZywgTm9kZVtdPigpO1xuICBmb3IgKGxldCBub2RlT3JkZXIgPSAwOyBub2RlT3JkZXIgPCBvcmRlcmVkTm9kZXMubGVuZ3RoOyArK25vZGVPcmRlcikge1xuICAgIGNvbnN0IGxpdmVVbnRpbE9yZGVyID0gbGl2ZVVudGlsT3JkZXJzW25vZGVPcmRlcl07XG4gICAgaWYgKGxpdmVVbnRpbE9yZGVyID09PSBJTkZfTElGRSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IG5vZGUgPSBvcmRlcmVkTm9kZXNbbm9kZU9yZGVyXTtcbiAgICBjb25zdCBsaXZlVW50aWxOb2RlID0gb3JkZXJlZE5vZGVzW2xpdmVVbnRpbE9yZGVyXTtcbiAgICBpZiAoIWxpdmVVbnRpbE1hcC5oYXMobGl2ZVVudGlsTm9kZS5uYW1lKSkge1xuICAgICAgbGl2ZVVudGlsTWFwLnNldChsaXZlVW50aWxOb2RlLm5hbWUsIFtdKTtcbiAgICB9XG4gICAgbGl2ZVVudGlsTWFwLmdldChsaXZlVW50aWxOb2RlLm5hbWUpIS5wdXNoKG5vZGUpO1xuICB9XG4gIHJldHVybiBsaXZlVW50aWxNYXA7XG59XG5cbmNvbnN0IENPTlRST0xfRkxPV19PUFMgPSBuZXcgU2V0KFtcbiAgJ1N3aXRjaCcsICdNZXJnZScsICdFbnRlcicsICdFeGl0JywgJ05leHRJdGVyYXRpb24nLCAnU3RhdGVsZXNzSWYnLFxuICAnU3RhdGVsZXNzV2hpbGUnLCAnaWYnLCAnV2hpbGUnXG5dKTtcbmNvbnN0IERZTkFNSUNfU0hBUEVfT1BTID0gbmV3IFNldChbXG4gICdOb25NYXhTdXBwcmVzc2lvblYyJywgJ05vbk1heFN1cHByZXNzaW9uVjMnLCAnTm9uTWF4U3VwcHJlc3Npb25WNScsICdXaGVyZSdcbl0pO1xuY29uc3QgSEFTSF9UQUJMRV9PUFMgPSBuZXcgU2V0KFtcbiAgJ0hhc2hUYWJsZScsICdIYXNoVGFibGVWMicsICdMb29rdXBUYWJsZUltcG9ydCcsICdMb29rdXBUYWJsZUltcG9ydFYyJyxcbiAgJ0xvb2t1cFRhYmxlRmluZCcsICdMb29rdXBUYWJsZUZpbmRWMicsICdMb29rdXBUYWJsZVNpemUnLCAnTG9va3VwVGFibGVTaXplVjInXG5dKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ29udHJvbEZsb3cobm9kZTogTm9kZSkge1xuICByZXR1cm4gQ09OVFJPTF9GTE9XX09QUy5oYXMobm9kZS5vcCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0R5bmFtaWNTaGFwZShub2RlOiBOb2RlKSB7XG4gIHJldHVybiBEWU5BTUlDX1NIQVBFX09QUy5oYXMobm9kZS5vcCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0hhc2hUYWJsZShub2RlOiBOb2RlKSB7XG4gIHJldHVybiBIQVNIX1RBQkxFX09QUy5oYXMobm9kZS5vcCk7XG59XG4iXX0=