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
import { env, keep, tidy, util } from '@tensorflow/tfjs-core';
import { getNodeNameAndIndex, getParamValue, getTensor, getTensorsForCurrentContext, parseNodeName } from '../operations/executors/utils';
import { executeOp } from '../operations/operation_executor';
import { ExecutionContext } from './execution_context';
import { getExecutionSubgraph, getNodeLiveUntilMap, getNodesInTopologicalOrder, isControlFlow } from './model_analysis';
export class GraphExecutor {
    get weightIds() {
        return this.parent ? this.parent.weightIds : this._weightIds;
    }
    get functionExecutorMap() {
        return this.parent ? this.parent.functionExecutorMap :
            this._functionExecutorMap;
    }
    get weightMap() {
        return this.parent ? this.parent.weightMap : this._weightMap;
    }
    set weightMap(weightMap) {
        const weightIds = Object.keys(weightMap).map(key => weightMap[key].map(tensor => tensor.id));
        this._weightIds = [].concat(...weightIds);
        this._weightMap = weightMap;
    }
    /**
     * Set `ResourceManager` shared by executors of a model.
     * @param resourceManager: `ResourceManager` of the `GraphModel`.
     */
    set resourceManager(resourceManager) {
        this._resourceManager = resourceManager;
    }
    get inputs() {
        return this._inputs.map(node => {
            return {
                name: node.name,
                shape: node.attrParams['shape'] ?
                    node.attrParams['shape'].value :
                    undefined,
                dtype: node.attrParams['dtype'] ?
                    node.attrParams['dtype'].value :
                    undefined
            };
        });
    }
    get outputs() {
        return this._outputs.map(node => {
            return {
                name: node.name,
                shape: node.attrParams['shape'] ?
                    node.attrParams['shape'].value :
                    undefined,
                dtype: node.attrParams['dtype'] ?
                    node.attrParams['dtype'].value :
                    undefined
            };
        });
    }
    get inputNodes() {
        return this._inputs.map(node => node.signatureKey || node.name);
    }
    get outputNodes() {
        return this._outputs.map((node) => {
            const name = node.signatureKey || node.name;
            return node.defaultOutput ? (`${name}:${node.defaultOutput}`) : name;
        });
    }
    get functions() {
        return Object.keys(this._functions).reduce((map, key) => {
            map[key] = this._functions[key].signature;
            return map;
        }, {});
    }
    /**
     *
     * @param graph Graph the model or function graph to be executed.
     * @param parent When building function exector you need to set the parent
     * executor. Since the weights and function executor maps are set at parant
     * level, that function executor can access the function maps and weight maps
     * through the parent.
     */
    constructor(graph, parent) {
        this.graph = graph;
        this.parent = parent;
        this.compiledMap = new Map();
        this.parseNodeNameCache = new Map();
        this._weightMap = {};
        this.SEPARATOR = ',';
        this._functions = {};
        this._functionExecutorMap = {};
        this.keepIntermediateTensors = false;
        this._outputs = graph.outputs;
        this._inputs = graph.inputs;
        this._initNodes = graph.initNodes;
        this._signature = graph.signature;
        this._functions = graph.functions;
        // create sub-graph executors
        if (graph.functions != null) {
            Object.keys(graph.functions).forEach(name => {
                this._functionExecutorMap[name] =
                    new GraphExecutor(graph.functions[name], this);
            });
        }
    }
    getCompilationKey(inputs, outputs) {
        const sortedInputs = inputs.map(node => node.name).sort();
        const sortedOutputs = outputs.map(node => node.name).sort();
        return sortedInputs.join(this.SEPARATOR) + '--' +
            sortedOutputs.join(this.SEPARATOR);
    }
    /**
     * Compiles the inference graph and returns the minimal set of nodes that are
     * required for execution, in the correct execution order.
     * @returns {Object} compilation The compile result.
     * @returns {Node[]} compilation.orderedNodes Nodes in the correct execution
     *     order.
     * @returns {Map<string, Node[]>} compilation.nodeLiveUntilMap A map from node
     *     to disposable nodes after its execution. That is, for a node `x`,
     *     `nodeLiveUntilMap[x]` indicates all nodes whose intermediate
     *     tensors should be disposed after `x` is executed.
     */
    compile(inputs, outputs) {
        const executionInfo = getExecutionSubgraph(inputs, outputs, this.weightMap, this._initNodes);
        const { missingInputs, dynamicNode, syncInputs } = executionInfo;
        if (dynamicNode != null) {
            throw new Error(`This execution contains the node '${dynamicNode.name}', which has ` +
                `the dynamic op '${dynamicNode.op}'. Please use ` +
                `model.executeAsync() instead. Alternatively, to avoid the ` +
                `dynamic ops, specify the inputs [${syncInputs}]`);
        }
        if (missingInputs.length > 0) {
            const outNames = outputs.map(n => n.name);
            const inNames = Object.keys(inputs);
            throw new Error(`Cannot compute the outputs [${outNames}] from the provided inputs ` +
                `[${inNames}]. Missing the following inputs: [${missingInputs}]`);
        }
        const orderedNodes = getNodesInTopologicalOrder(this.graph, executionInfo);
        const nodeLiveUntilMap = getNodeLiveUntilMap(orderedNodes);
        return { orderedNodes, nodeLiveUntilMap };
    }
    cloneAndKeepTensor(tensor) {
        if (tensor == null) {
            return null;
        }
        const clone = tensor.clone();
        // Keep the clone because`model.execute()` may be called within
        // a `tidy()`, but the user may inspect these tensors after the
        // tidy.
        keep(clone);
        return clone;
    }
    cloneTensorList(tensors) {
        if (!tensors) {
            return null;
        }
        const clonedTensor = tensors.map(tensor => {
            return this.cloneAndKeepTensor(tensor);
        });
        return clonedTensor;
    }
    cloneTensorMap(tensorsMap) {
        return Object.fromEntries(Object.entries(tensorsMap).map(([name, tensorsList]) => {
            return [name, this.cloneTensorList(tensorsList)];
        }));
    }
    /**
     * Executes the inference for given input tensors.
     * @param inputs Tensor map for the model inputs, keyed by the input node
     * names.
     * @param outputs Optional. output node name from the Tensorflow model, if
     * no outputs are specified, the default outputs of the model would be used.
     * You can inspect intermediate nodes of the model by adding them to the
     * outputs array.
     */
    execute(inputs, outputs) {
        // Dispose any tensors from a prior run to avoid leaking them.
        this.disposeIntermediateTensors();
        inputs = this.mapInputs(inputs);
        const names = Object.keys(inputs).sort();
        this.checkInputs(inputs);
        this.checkInputShapeAndType(inputs);
        outputs = this.mapOutputs(outputs);
        this.checkOutputs(outputs);
        const inputNodes = names.map(name => this.graph.nodes[parseNodeName(name)[0]]);
        const outputNodeNames = outputs.map(name => parseNodeName(name)[0]);
        const outputNodeNameSet = new Set(outputNodeNames);
        let outputNodes = outputNodeNames.map(name => this.graph.nodes[name]);
        // If no outputs are specified, then use the default outputs of the model.
        if (outputNodes.length === 0) {
            outputNodes = this._outputs;
        }
        const compilationKey = this.getCompilationKey(inputNodes, outputNodes);
        // Do nothing if the compiled graph cache contains the input.
        let compilation = this.compiledMap.get(compilationKey);
        if (compilation == null) {
            compilation = this.compile(inputs, outputNodes);
            this.compiledMap.set(compilationKey, compilation);
        }
        // Keep tensors if KEEP_INTERMEDIATE_TENSORS is on.
        try {
            this.keepIntermediateTensors = env().getBool('KEEP_INTERMEDIATE_TENSORS');
        }
        catch (e) {
            this.keepIntermediateTensors = false;
            console.warn(e.message);
        }
        const tensorArrayMap = {};
        const tensorListMap = {};
        return tidy(() => {
            const context = new ExecutionContext(this.weightMap, tensorArrayMap, tensorListMap, this.functionExecutorMap, this.parseNodeNameCache);
            const tensorsMap = Object.assign({}, this.weightMap);
            if (this.keepIntermediateTensors) {
                this.clonedTensorsMap = this.cloneTensorMap(this.weightMap);
            }
            Object.keys(inputs).forEach(name => {
                const [nodeName, index] = parseNodeName(name, context);
                const tensors = [];
                tensors[index] = inputs[name];
                tensorsMap[nodeName] = tensors;
                if (this.keepIntermediateTensors) {
                    this.clonedTensorsMap[nodeName] = this.cloneTensorList(tensors);
                }
            });
            const tensorsToKeep = this.getFrozenTensorIds(tensorsMap);
            const { orderedNodes, nodeLiveUntilMap } = compilation;
            for (const node of orderedNodes) {
                if (tensorsMap[node.name]) {
                    continue;
                }
                const tensors = executeOp(node, tensorsMap, context, this._resourceManager);
                if (util.isPromise(tensors)) {
                    throw new Error(`The execution of the op '${node.op}' returned a promise. ` +
                        `Please use model.executeAsync() instead.`);
                }
                tensorsMap[node.name] = tensors;
                if (this.keepIntermediateTensors) {
                    this.clonedTensorsMap[node.name] = this.cloneTensorList(tensors);
                }
                this.checkTensorForDisposalWithNodeLiveUntilInfo(node, tensorsMap, context, tensorsToKeep, outputNodeNameSet, nodeLiveUntilMap.get(node.name));
            }
            // dispose the context for the root executor
            if (this.parent == null) {
                context.dispose(tensorsToKeep);
            }
            return outputs.map(name => getTensor(name, tensorsMap, context));
        });
    }
    getFrozenTensorIds(tensorMap) {
        const ids = [].concat.apply([], Object.keys(tensorMap)
            .map(key => tensorMap[key])
            .map(tensors => tensors.map(tensor => tensor.id)));
        return new Set(ids);
    }
    checkTensorForDisposal(nodeName, node, tensorMap, context, tensorsToKeep, outputNodeNameSet, intermediateTensorConsumerCount) {
        // Skip output nodes and any control flow nodes, since its dependency is
        // tricky to track correctly.
        if (isControlFlow(node) || outputNodeNameSet.has(nodeName)) {
            return;
        }
        for (const tensor of tensorMap[nodeName]) {
            if (tensor == null) {
                continue;
            }
            intermediateTensorConsumerCount[tensor.id] =
                (intermediateTensorConsumerCount[tensor.id] || 0) +
                    node.children.length;
        }
        for (const input of node.inputs) {
            // Skip any control flow nodes, since its dependency is tricky to track
            // correctly.
            if (isControlFlow(input)) {
                continue;
            }
            const tensors = getTensorsForCurrentContext(input.name, tensorMap, context);
            if (tensors == null) {
                continue;
            }
            for (const tensor of tensors) {
                if (!tensor || tensor.kept || tensorsToKeep.has(tensor.id)) {
                    continue;
                }
                // Only intermediate nodes' tensors have counts set, not marked as
                // kept, and not in `tensorsToKeep`.
                // Input and weight nodes' tensors should exist in `tensorsToKeep`.
                // Output and control flow nodes' tensors should never have count set.
                const count = intermediateTensorConsumerCount[tensor.id];
                if (count === 1) {
                    tensor.dispose();
                    delete intermediateTensorConsumerCount[tensor.id];
                }
                else if (count != null) {
                    intermediateTensorConsumerCount[tensor.id]--;
                }
            }
        }
    }
    checkTensorForDisposalWithNodeLiveUntilInfo(node, tensorMap, context, tensorsToKeep, outputNodeNameSet, liveUntilNodes) {
        function isNonDisposableNode(node) {
            // Skip output nodes and any control flow nodes, since its dependency is
            // tricky to track correctly.
            return isControlFlow(node) || outputNodeNameSet.has(node.name);
        }
        if (isControlFlow(node) || liveUntilNodes == null) {
            return;
        }
        for (const nodeToDispose of liveUntilNodes) {
            if (isNonDisposableNode(nodeToDispose)) {
                continue;
            }
            const tensors = getTensorsForCurrentContext(nodeToDispose.name, tensorMap, context);
            for (const tensor of tensors) {
                if (!tensor || tensor.kept || tensorsToKeep.has(tensor.id)) {
                    continue;
                }
                tensor.dispose();
            }
        }
    }
    /**
     * Executes the inference for given input tensors in Async fashion.
     * @param inputs Tensor map for the model inputs, keyed by the input node
     * names.
     * @param outputs output node name from the Tensorflow model, if no outputs
     * are specified, the default outputs of the model would be used. You can
     * inspect intermediate nodes of the model by adding them to the outputs
     * array.
     */
    async executeAsync(inputs, outputs) {
        return this._executeAsync(inputs, outputs);
    }
    disposeIntermediateTensors() {
        if (!this.clonedTensorsMap) {
            return;
        }
        Object.values(this.clonedTensorsMap).forEach(tensorsList => {
            for (const tensor of tensorsList) {
                if (tensor && !tensor.isDisposed) {
                    tensor.dispose();
                }
            }
        });
        this.clonedTensorsMap = null;
    }
    getIntermediateTensors() {
        return this.clonedTensorsMap;
    }
    /**
     * Executes the inference for given input tensors in Async fashion.
     * @param inputs Tensor map for the model inputs, keyed by the input node
     * names.
     * @param outputs Optional. output node name from the Tensorflow model,
     * if no outputs are specified, the default outputs of the model would be
     * used. You can inspect intermediate nodes of the model by adding them to
     * the outputs array.
     * @param isFunctionExecution Optional. Flag for executing a function.
     * @param tensorArrayMap Optional, global TensorArray map by id. Used for
     * function execution.
     * @param tensorArrayMap Optional global TensorList map by id. Used for
     * function execution.
     */
    async _executeAsync(inputs, outputs, isFunctionExecution = false, tensorArrayMap = {}, tensorListMap = {}) {
        // Dispose any tensors from a prior run to avoid leaking them.
        this.disposeIntermediateTensors();
        if (!isFunctionExecution) {
            inputs = this.mapInputs(inputs);
            this.checkInputs(inputs);
            this.checkInputShapeAndType(inputs);
            outputs = this.mapOutputs(outputs);
            this.checkOutputs(outputs);
        }
        // Keep tensors if KEEP_INTERMEDIATE_TENSORS is on.
        try {
            this.keepIntermediateTensors = env().getBool('KEEP_INTERMEDIATE_TENSORS');
        }
        catch (e) {
            this.keepIntermediateTensors = false;
            console.warn(e.message);
        }
        const context = new ExecutionContext(this.weightMap, tensorArrayMap, tensorListMap, this.functionExecutorMap, this.parseNodeNameCache);
        if (this.keepIntermediateTensors) {
            this.clonedTensorsMap = this.cloneTensorMap(this.weightMap);
        }
        // Graph with control flow op requires runtime evaluation of the execution
        // order, while without control flow the execution order is pre-determined
        // in the compile method.
        const tensorsMap = await this.executeWithControlFlow(inputs, context, outputs, isFunctionExecution);
        const results = outputs.map(name => getTensor(name, tensorsMap, context));
        // dispose all the intermediate tensors
        const outputIds = results.map(t => t.id);
        const inputIds = Object.keys(inputs).map(name => inputs[name].id);
        const keepIds = new Set([...outputIds, ...inputIds, ...this.weightIds]);
        Object.values(tensorsMap).forEach(tensorsList => {
            tensorsList.forEach(tensor => {
                if (tensor && !tensor.isDisposed && !keepIds.has(tensor.id)) {
                    tensor.dispose();
                }
            });
        });
        // dispose the context for the root executor
        if (this.parent == null) {
            context.dispose(keepIds);
        }
        return results;
    }
    async executeFunctionAsync(inputs, tensorArrayMap, tensorListMap) {
        const mappedInputs = inputs.reduce((map, tensor, index) => {
            map[this.inputs[index].name] = tensor;
            return map;
        }, {});
        return this._executeAsync(mappedInputs, this.outputNodes, true, tensorArrayMap, tensorListMap);
    }
    /**
     * When there are control flow nodes in the graph, the graph execution use
     * ExecutionContext to keep track of the frames and loop iterators.
     * @param inputs placeholder tensors for the graph.
     * @param context the execution context object for current execution.
     * @param outputNames Optional. output node name from the Tensorflow model,
     * if no outputs are specified, the default outputs of the model would be
     * used. You can inspect intermediate nodes of the model by adding them to
     * the outputs array.
     * @param isFunctionExecution Flag for executing a function.
     */
    async executeWithControlFlow(inputs, context, outputNames, isFunctionExecution) {
        const names = Object.keys(inputs);
        const inputNodes = names.map(name => this.graph.nodes[parseNodeName(name)[0]]);
        const outputNodeNames = outputNames.map(name => parseNodeName(name)[0]);
        const outputNodeNameSet = new Set(outputNodeNames);
        let outputNodes = outputNodeNames.map(name => this.graph.nodes[name]);
        // If no outputs are specified, then use the default outputs of the model.
        if (outputNodes.length === 0) {
            outputNodes = this._outputs;
        }
        const { usedNodes, missingInputs, dynamicNode, syncInputs } = getExecutionSubgraph(inputs, outputNodes, this.weightMap, this._initNodes);
        // First nodes to execute include inputNodes, weights, and initNodes.
        const stack = [
            ...inputNodes, ...this.graph.weights, ...(this._initNodes || [])
        ].map(node => {
            return { node, contexts: context.currentContext };
        });
        const tensorsMap = Object.assign({}, this.weightMap);
        Object.keys(inputs).forEach(name => {
            const [nodeName, index] = parseNodeName(name);
            const tensors = [];
            tensors[index] = inputs[name];
            tensorsMap[nodeName] = tensors;
        });
        const intermediateTensorConsumerCount = {};
        const tensorsToKeep = this.getFrozenTensorIds(tensorsMap);
        const added = {};
        while (stack.length > 0) {
            const promises = this.processStack(inputNodes, stack, context, tensorsMap, added, tensorsToKeep, outputNodeNameSet, intermediateTensorConsumerCount, usedNodes);
            await Promise.all(promises);
        }
        if (dynamicNode == null && !isFunctionExecution) {
            console.warn(`This model execution did not contain any nodes with control flow ` +
                `or dynamic output shapes. You can use model.execute() instead.`);
        }
        const missingOutputs = outputNodes
            .filter(node => !isControlFlow(node) &&
            !getTensor(node.name, tensorsMap, context))
            .map(node => node.name);
        if (missingOutputs.length > 0) {
            let alternativeMsg = '';
            if (dynamicNode != null) {
                alternativeMsg =
                    `Alternatively, to avoid the dynamic ops, use model.execute() ` +
                        `and specify the inputs [${syncInputs}]`;
            }
            throw new Error(`Cannot compute the outputs [${missingOutputs}] from the provided ` +
                `inputs [${names}]. Consider providing the following inputs: ` +
                `[${missingInputs}]. ${alternativeMsg}`);
        }
        return tensorsMap;
    }
    processStack(inputNodes, stack, context, tensorMap, added, tensorsToKeep, outputNodeNameSet, intermediateTensorConsumerCount, usedNodes) {
        const promises = [];
        while (stack.length > 0) {
            const item = stack.pop();
            context.currentContext = item.contexts;
            let nodeName = '';
            // The tensor of the Enter op with isConstant set should be set
            // in the parent scope, so it will be available as constant for the
            // whole loop.
            if (item.node.op === 'Enter' &&
                getParamValue('isConstant', item.node, tensorMap, context)) {
                [nodeName] = getNodeNameAndIndex(item.node.name, context);
            }
            // only process nodes that are not in the tensorMap yet, this include
            // inputNodes and internal initNodes.
            if (tensorMap[item.node.name] == null) {
                const tensors = executeOp(item.node, tensorMap, context, this._resourceManager);
                if (!nodeName) {
                    [nodeName] = getNodeNameAndIndex(item.node.name, context);
                }
                const currentContext = context.currentContext;
                if (util.isPromise(tensors)) {
                    promises.push(tensors.then(t => {
                        tensorMap[nodeName] = t;
                        if (this.keepIntermediateTensors) {
                            this.clonedTensorsMap[nodeName] = this.cloneTensorList(t);
                        }
                        context.currentContext = currentContext;
                        this.checkTensorForDisposal(nodeName, item.node, tensorMap, context, tensorsToKeep, outputNodeNameSet, intermediateTensorConsumerCount);
                        this.processChildNodes(item.node, stack, context, tensorMap, added, usedNodes);
                        return t;
                    }));
                }
                else {
                    tensorMap[nodeName] = tensors;
                    if (this.keepIntermediateTensors) {
                        this.clonedTensorsMap[nodeName] = this.cloneTensorList(tensors);
                    }
                    this.checkTensorForDisposal(nodeName, item.node, tensorMap, context, tensorsToKeep, outputNodeNameSet, intermediateTensorConsumerCount);
                    this.processChildNodes(item.node, stack, context, tensorMap, added, usedNodes);
                }
            }
            else {
                this.processChildNodes(item.node, stack, context, tensorMap, added, usedNodes);
            }
        }
        return promises;
    }
    processChildNodes(node, stack, context, tensorMap, added, usedNodes) {
        node.children.forEach((childNode) => {
            const [nodeName,] = getNodeNameAndIndex(childNode.name, context);
            if (added[nodeName] || !usedNodes.has(childNode.name)) {
                return;
            }
            // Merge op can be pushed if any of its inputs has value.
            if (childNode.op === 'Merge') {
                if (childNode.inputNames.some(name => {
                    return !!getTensor(name, tensorMap, context);
                })) {
                    added[nodeName] = true;
                    stack.push({ contexts: context.currentContext, node: childNode });
                }
            }
            else // Otherwise all inputs must to have value.
             if (childNode.inputNames.every(name => {
                return !!getTensor(name, tensorMap, context);
            })) {
                added[nodeName] = true;
                stack.push({ contexts: context.currentContext, node: childNode });
            }
        });
    }
    /**
     * Releases the memory used by the weight tensors.
     */
    dispose() {
        Object.keys(this.weightMap)
            .forEach(key => this.weightMap[key].forEach(tensor => tensor.dispose()));
    }
    checkInputShapeAndType(inputs) {
        Object.keys(inputs).forEach(name => {
            const input = inputs[name];
            const [nodeName,] = parseNodeName(name);
            const node = this.graph.nodes[nodeName];
            if (node.attrParams['shape'] && node.attrParams['shape'].value) {
                const shape = node.attrParams['shape'].value;
                const match = shape.length === input.shape.length &&
                    input.shape.every((dim, index) => shape[index] === -1 || shape[index] === dim);
                util.assert(match, () => `The shape of dict['${node.name}'] provided in ` +
                    `model.execute(dict) must be [${shape}], but was ` +
                    `[${input.shape}]`);
            }
            if (node.attrParams['dtype'] && node.attrParams['dtype'].value) {
                util.assert(input.dtype === node.attrParams['dtype'].value, () => `The dtype of dict['${node.name}'] provided in ` +
                    `model.execute(dict) must be ` +
                    `${node.attrParams['dtype'].value}, but was ${input.dtype}`);
            }
        });
    }
    mapInputs(inputs) {
        var _a, _b;
        const result = {};
        for (const inputName in inputs) {
            const tensor = (_b = (_a = this._signature) === null || _a === void 0 ? void 0 : _a.inputs) === null || _b === void 0 ? void 0 : _b[inputName];
            if (tensor != null) {
                result[tensor.name] = inputs[inputName];
            }
            else {
                result[inputName] = inputs[inputName];
            }
        }
        return result;
    }
    checkInputs(inputs) {
        const notInGraph = Object.keys(inputs).filter(name => {
            const [nodeName] = parseNodeName(name);
            return this.graph.nodes[nodeName] == null;
        });
        if (notInGraph.length > 0) {
            throw new Error(`The dict provided in model.execute(dict) has ` +
                `keys: [${notInGraph}] that are not part of graph`);
        }
    }
    mapOutputs(outputs) {
        return outputs.map(name => {
            var _a, _b;
            const tensor = (_b = (_a = this._signature) === null || _a === void 0 ? void 0 : _a.outputs) === null || _b === void 0 ? void 0 : _b[name];
            if (tensor != null) {
                return tensor.name;
            }
            return name;
        }, {});
    }
    checkOutputs(outputs) {
        outputs.forEach(name => {
            const [normalizedName] = parseNodeName(name);
            if (!this.graph.nodes[normalizedName]) {
                throw new Error(`The output '${name}' is not found in the graph`);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGhfZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWNvbnZlcnRlci9zcmMvZXhlY3V0b3IvZ3JhcGhfZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxFQUFXLEdBQUcsRUFBRSxJQUFJLEVBQTBCLElBQUksRUFBRSxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUk5RixPQUFPLEVBQUMsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSwyQkFBMkIsRUFBRSxhQUFhLEVBQUMsTUFBTSwrQkFBK0IsQ0FBQztBQUN4SSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sa0NBQWtDLENBQUM7QUFHM0QsT0FBTyxFQUFDLGdCQUFnQixFQUF1QixNQUFNLHFCQUFxQixDQUFDO0FBQzNFLE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQVN0SCxNQUFNLE9BQU8sYUFBYTtJQWdCeEIsSUFBSSxTQUFTO1FBQ1gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUMvRCxDQUFDO0lBRUQsSUFBSSxtQkFBbUI7UUFDckIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ2pELENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFB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QyxlQUFlLElBQUksNkJBQTZCLENBQUMsQ0FBQzthQUNuRTtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge0RhdGFUeXBlLCBlbnYsIGtlZXAsIE5hbWVkVGVuc29yTWFwLCBUZW5zb3IsIHRpZHksIHV0aWx9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7SVNpZ25hdHVyZURlZn0gZnJvbSAnLi4vZGF0YS9jb21waWxlZF9hcGknO1xuaW1wb3J0IHtOYW1lZFRlbnNvcnNNYXAsIFRlbnNvckFycmF5TWFwLCBUZW5zb3JJbmZvLCBUZW5zb3JMaXN0TWFwfSBmcm9tICcuLi9kYXRhL3R5cGVzJztcbmltcG9ydCB7Z2V0Tm9kZU5hbWVBbmRJbmRleCwgZ2V0UGFyYW1WYWx1ZSwgZ2V0VGVuc29yLCBnZXRUZW5zb3JzRm9yQ3VycmVudENvbnRleHQsIHBhcnNlTm9kZU5hbWV9IGZyb20gJy4uL29wZXJhdGlvbnMvZXhlY3V0b3JzL3V0aWxzJztcbmltcG9ydCB7ZXhlY3V0ZU9wfSBmcm9tICcuLi9vcGVyYXRpb25zL29wZXJhdGlvbl9leGVjdXRvcic7XG5pbXBvcnQge0dyYXBoLCBOb2RlfSBmcm9tICcuLi9vcGVyYXRpb25zL3R5cGVzJztcblxuaW1wb3J0IHtFeGVjdXRpb25Db250ZXh0LCBFeGVjdXRpb25Db250ZXh0SW5mb30gZnJvbSAnLi9leGVjdXRpb25fY29udGV4dCc7XG5pbXBvcnQge2dldEV4ZWN1dGlvblN1YmdyYXBoLCBnZXROb2RlTGl2ZVVudGlsTWFwLCBnZXROb2Rlc0luVG9wb2xvZ2ljYWxPcmRlciwgaXNDb250cm9sRmxvd30gZnJvbSAnLi9tb2RlbF9hbmFseXNpcyc7XG5pbXBvcnQge1Jlc291cmNlTWFuYWdlcn0gZnJvbSAnLi9yZXNvdXJjZV9tYW5hZ2VyJztcbmltcG9ydCB7RnVuY3Rpb25FeGVjdXRvcn0gZnJvbSAnLi90eXBlcyc7XG5cbmludGVyZmFjZSBOb2RlV2l0aENvbnRleHRzIHtcbiAgY29udGV4dHM6IEV4ZWN1dGlvbkNvbnRleHRJbmZvW107XG4gIG5vZGU6IE5vZGU7XG59XG5cbmV4cG9ydCBjbGFzcyBHcmFwaEV4ZWN1dG9yIGltcGxlbWVudHMgRnVuY3Rpb25FeGVjdXRvciB7XG4gIHByaXZhdGUgY29tcGlsZWRNYXAgPSBuZXcgTWFwPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgdGhpcy5jb21waWxlPj4oKTtcbiAgcHJpdmF0ZSBwYXJzZU5vZGVOYW1lQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgW3N0cmluZywgbnVtYmVyLCBzdHJpbmc/XT4oKTtcbiAgcHJpdmF0ZSBfd2VpZ2h0TWFwOiBOYW1lZFRlbnNvcnNNYXAgPSB7fTtcbiAgcHJpdmF0ZSBfd2VpZ2h0SWRzOiBudW1iZXJbXTtcbiAgcHJpdmF0ZSBfc2lnbmF0dXJlOiBJU2lnbmF0dXJlRGVmO1xuICBwcml2YXRlIF9pbnB1dHM6IE5vZGVbXTtcbiAgcHJpdmF0ZSBfb3V0cHV0czogTm9kZVtdO1xuICBwcml2YXRlIF9pbml0Tm9kZXM6IE5vZGVbXTsgIC8vIEludGVybmFsIGluaXQgbm9kZXMgdG8gc3RhcnQgaW5pdGlhbGl6YXRpb24uXG4gIHByaXZhdGUgU0VQQVJBVE9SID0gJywnO1xuICBwcml2YXRlIF9mdW5jdGlvbnM6IHtba2V5OiBzdHJpbmddOiBHcmFwaH0gPSB7fTtcbiAgcHJpdmF0ZSBfZnVuY3Rpb25FeGVjdXRvck1hcDoge1trZXk6IHN0cmluZ106IEZ1bmN0aW9uRXhlY3V0b3J9ID0ge307XG4gIHByaXZhdGUgX3Jlc291cmNlTWFuYWdlcjogUmVzb3VyY2VNYW5hZ2VyO1xuICBwcml2YXRlIGNsb25lZFRlbnNvcnNNYXA6IE5hbWVkVGVuc29yc01hcDtcbiAgcHJpdmF0ZSBrZWVwSW50ZXJtZWRpYXRlVGVuc29ycyA9IGZhbHNlO1xuXG4gIGdldCB3ZWlnaHRJZHMoKTogbnVtYmVyW10ge1xuICAgIHJldHVybiB0aGlzLnBhcmVudCA/IHRoaXMucGFyZW50LndlaWdodElkcyA6IHRoaXMuX3dlaWdodElkcztcbiAgfVxuXG4gIGdldCBmdW5jdGlvbkV4ZWN1dG9yTWFwKCk6IHtba2V5OiBzdHJpbmddOiBGdW5jdGlvbkV4ZWN1dG9yfSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50ID8gdGhpcy5wYXJlbnQuZnVuY3Rpb25FeGVjdXRvck1hcCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZnVuY3Rpb25FeGVjdXRvck1hcDtcbiAgfVxuXG4gIGdldCB3ZWlnaHRNYXAoKTogTmFtZWRUZW5zb3JzTWFwIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPyB0aGlzLnBhcmVudC53ZWlnaHRNYXAgOiB0aGlzLl93ZWlnaHRNYXA7XG4gIH1cblxuICBzZXQgd2VpZ2h0TWFwKHdlaWdodE1hcDogTmFtZWRUZW5zb3JzTWFwKSB7XG4gICAgY29uc3Qgd2VpZ2h0SWRzID0gT2JqZWN0LmtleXMod2VpZ2h0TWFwKS5tYXAoXG4gICAgICAgIGtleSA9PiB3ZWlnaHRNYXBba2V5XS5tYXAodGVuc29yID0+IHRlbnNvci5pZCkpO1xuICAgIHRoaXMuX3dlaWdodElkcyA9IFtdLmNvbmNhdCguLi53ZWlnaHRJZHMpO1xuICAgIHRoaXMuX3dlaWdodE1hcCA9IHdlaWdodE1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgYFJlc291cmNlTWFuYWdlcmAgc2hhcmVkIGJ5IGV4ZWN1dG9ycyBvZiBhIG1vZGVsLlxuICAgKiBAcGFyYW0gcmVzb3VyY2VNYW5hZ2VyOiBgUmVzb3VyY2VNYW5hZ2VyYCBvZiB0aGUgYEdyYXBoTW9kZWxgLlxuICAgKi9cbiAgc2V0IHJlc291cmNlTWFuYWdlcihyZXNvdXJjZU1hbmFnZXI6IFJlc291cmNlTWFuYWdlcikge1xuICAgIHRoaXMuX3Jlc291cmNlTWFuYWdlciA9IHJlc291cmNlTWFuYWdlcjtcbiAgfVxuXG4gIGdldCBpbnB1dHMoKTogVGVuc29ySW5mb1tdIHtcbiAgICByZXR1cm4gdGhpcy5faW5wdXRzLm1hcChub2RlID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgc2hhcGU6IG5vZGUuYXR0clBhcmFtc1snc2hhcGUnXSA/XG4gICAgICAgICAgICBub2RlLmF0dHJQYXJhbXNbJ3NoYXBlJ10udmFsdWUgYXMgbnVtYmVyW10gOlxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICBkdHlwZTogbm9kZS5hdHRyUGFyYW1zWydkdHlwZSddID9cbiAgICAgICAgICAgIG5vZGUuYXR0clBhcmFtc1snZHR5cGUnXS52YWx1ZSBhcyBEYXRhVHlwZSA6XG4gICAgICAgICAgICB1bmRlZmluZWRcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXQgb3V0cHV0cygpOiBUZW5zb3JJbmZvW10ge1xuICAgIHJldHVybiB0aGlzLl9vdXRwdXRzLm1hcChub2RlID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgc2hhcGU6IG5vZGUuYXR0clBhcmFtc1snc2hhcGUnXSA/XG4gICAgICAgICAgICBub2RlLmF0dHJQYXJhbXNbJ3NoYXBlJ10udmFsdWUgYXMgbnVtYmVyW10gOlxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICBkdHlwZTogbm9kZS5hdHRyUGFyYW1zWydkdHlwZSddID9cbiAgICAgICAgICAgIG5vZGUuYXR0clBhcmFtc1snZHR5cGUnXS52YWx1ZSBhcyBEYXRhVHlwZSA6XG4gICAgICAgICAgICB1bmRlZmluZWRcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXQgaW5wdXROb2RlcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuX2lucHV0cy5tYXAobm9kZSA9PiBub2RlLnNpZ25hdHVyZUtleSB8fCBub2RlLm5hbWUpO1xuICB9XG5cbiAgZ2V0IG91dHB1dE5vZGVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5fb3V0cHV0cy5tYXAoKG5vZGUpID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSBub2RlLnNpZ25hdHVyZUtleSB8fCBub2RlLm5hbWU7XG4gICAgICByZXR1cm4gbm9kZS5kZWZhdWx0T3V0cHV0ID8gKGAke25hbWV9OiR7bm9kZS5kZWZhdWx0T3V0cHV0fWApIDogbmFtZTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldCBmdW5jdGlvbnMoKToge1trZXk6IHN0cmluZ106IElTaWduYXR1cmVEZWZ9IHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZnVuY3Rpb25zKS5yZWR1Y2UoKG1hcCwga2V5KSA9PiB7XG4gICAgICBtYXBba2V5XSA9IHRoaXMuX2Z1bmN0aW9uc1trZXldLnNpZ25hdHVyZTtcbiAgICAgIHJldHVybiBtYXA7XG4gICAgfSwge30gYXMge1trZXk6IHN0cmluZ106IElTaWduYXR1cmVEZWZ9KTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gZ3JhcGggR3JhcGggdGhlIG1vZGVsIG9yIGZ1bmN0aW9uIGdyYXBoIHRvIGJlIGV4ZWN1dGVkLlxuICAgKiBAcGFyYW0gcGFyZW50IFdoZW4gYnVpbGRpbmcgZnVuY3Rpb24gZXhlY3RvciB5b3UgbmVlZCB0byBzZXQgdGhlIHBhcmVudFxuICAgKiBleGVjdXRvci4gU2luY2UgdGhlIHdlaWdodHMgYW5kIGZ1bmN0aW9uIGV4ZWN1dG9yIG1hcHMgYXJlIHNldCBhdCBwYXJhbnRcbiAgICogbGV2ZWwsIHRoYXQgZnVuY3Rpb24gZXhlY3V0b3IgY2FuIGFjY2VzcyB0aGUgZnVuY3Rpb24gbWFwcyBhbmQgd2VpZ2h0IG1hcHNcbiAgICogdGhyb3VnaCB0aGUgcGFyZW50LlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogR3JhcGgsIHByaXZhdGUgcGFyZW50PzogR3JhcGhFeGVjdXRvcikge1xuICAgIHRoaXMuX291dHB1dHMgPSBncmFwaC5vdXRwdXRzO1xuICAgIHRoaXMuX2lucHV0cyA9IGdyYXBoLmlucHV0cztcbiAgICB0aGlzLl9pbml0Tm9kZXMgPSBncmFwaC5pbml0Tm9kZXM7XG4gICAgdGhpcy5fc2lnbmF0dXJlID0gZ3JhcGguc2lnbmF0dXJlO1xuICAgIHRoaXMuX2Z1bmN0aW9ucyA9IGdyYXBoLmZ1bmN0aW9ucztcbiAgICAvLyBjcmVhdGUgc3ViLWdyYXBoIGV4ZWN1dG9yc1xuICAgIGlmIChncmFwaC5mdW5jdGlvbnMgIT0gbnVsbCkge1xuICAgICAgT2JqZWN0LmtleXMoZ3JhcGguZnVuY3Rpb25zKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICB0aGlzLl9mdW5jdGlvbkV4ZWN1dG9yTWFwW25hbWVdID1cbiAgICAgICAgICAgIG5ldyBHcmFwaEV4ZWN1dG9yKGdyYXBoLmZ1bmN0aW9uc1tuYW1lXSwgdGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldENvbXBpbGF0aW9uS2V5KGlucHV0czogTm9kZVtdLCBvdXRwdXRzOiBOb2RlW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IHNvcnRlZElucHV0cyA9IGlucHV0cy5tYXAobm9kZSA9PiBub2RlLm5hbWUpLnNvcnQoKTtcbiAgICBjb25zdCBzb3J0ZWRPdXRwdXRzID0gb3V0cHV0cy5tYXAobm9kZSA9PiBub2RlLm5hbWUpLnNvcnQoKTtcbiAgICByZXR1cm4gc29ydGVkSW5wdXRzLmpvaW4odGhpcy5TRVBBUkFUT1IpICsgJy0tJyArXG4gICAgICAgIHNvcnRlZE91dHB1dHMuam9pbih0aGlzLlNFUEFSQVRPUik7XG4gIH1cblxuICAvKipcbiAgICogQ29tcGlsZXMgdGhlIGluZmVyZW5jZSBncmFwaCBhbmQgcmV0dXJucyB0aGUgbWluaW1hbCBzZXQgb2Ygbm9kZXMgdGhhdCBhcmVcbiAgICogcmVxdWlyZWQgZm9yIGV4ZWN1dGlvbiwgaW4gdGhlIGNvcnJlY3QgZXhlY3V0aW9uIG9yZGVyLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBjb21waWxhdGlvbiBUaGUgY29tcGlsZSByZXN1bHQuXG4gICAqIEByZXR1cm5zIHtOb2RlW119IGNvbXBpbGF0aW9uLm9yZGVyZWROb2RlcyBOb2RlcyBpbiB0aGUgY29ycmVjdCBleGVjdXRpb25cbiAgICogICAgIG9yZGVyLlxuICAgKiBAcmV0dXJucyB7TWFwPHN0cmluZywgTm9kZVtdPn0gY29tcGlsYXRpb24ubm9kZUxpdmVVbnRpbE1hcCBBIG1hcCBmcm9tIG5vZGVcbiAgICogICAgIHRvIGRpc3Bvc2FibGUgbm9kZXMgYWZ0ZXIgaXRzIGV4ZWN1dGlvbi4gVGhhdCBpcywgZm9yIGEgbm9kZSBgeGAsXG4gICAqICAgICBgbm9kZUxpdmVVbnRpbE1hcFt4XWAgaW5kaWNhdGVzIGFsbCBub2RlcyB3aG9zZSBpbnRlcm1lZGlhdGVcbiAgICogICAgIHRlbnNvcnMgc2hvdWxkIGJlIGRpc3Bvc2VkIGFmdGVyIGB4YCBpcyBleGVjdXRlZC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsZShpbnB1dHM6IE5hbWVkVGVuc29yTWFwLCBvdXRwdXRzOiBOb2RlW10pOlxuICAgICAge29yZGVyZWROb2RlczogTm9kZVtdLCBub2RlTGl2ZVVudGlsTWFwOiBNYXA8c3RyaW5nLCBOb2RlW10+fSB7XG4gICAgY29uc3QgZXhlY3V0aW9uSW5mbyA9XG4gICAgICAgIGdldEV4ZWN1dGlvblN1YmdyYXBoKGlucHV0cywgb3V0cHV0cywgdGhpcy53ZWlnaHRNYXAsIHRoaXMuX2luaXROb2Rlcyk7XG4gICAgY29uc3Qge21pc3NpbmdJbnB1dHMsIGR5bmFtaWNOb2RlLCBzeW5jSW5wdXRzfSA9IGV4ZWN1dGlvbkluZm87XG4gICAgaWYgKGR5bmFtaWNOb2RlICE9IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVGhpcyBleGVjdXRpb24gY29udGFpbnMgdGhlIG5vZGUgJyR7ZHluYW1pY05vZGUubmFtZX0nLCB3aGljaCBoYXMgYCArXG4gICAgICAgICAgYHRoZSBkeW5hbWljIG9wICcke2R5bmFtaWNOb2RlLm9wfScuIFBsZWFzZSB1c2UgYCArXG4gICAgICAgICAgYG1vZGVsLmV4ZWN1dGVBc3luYygpIGluc3RlYWQuIEFsdGVybmF0aXZlbHksIHRvIGF2b2lkIHRoZSBgICtcbiAgICAgICAgICBgZHluYW1pYyBvcHMsIHNwZWNpZnkgdGhlIGlucHV0cyBbJHtzeW5jSW5wdXRzfV1gKTtcbiAgICB9XG5cbiAgICBpZiAobWlzc2luZ0lucHV0cy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBvdXROYW1lcyA9IG91dHB1dHMubWFwKG4gPT4gbi5uYW1lKTtcbiAgICAgIGNvbnN0IGluTmFtZXMgPSBPYmplY3Qua2V5cyhpbnB1dHMpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgY29tcHV0ZSB0aGUgb3V0cHV0cyBbJHtvdXROYW1lc31dIGZyb20gdGhlIHByb3ZpZGVkIGlucHV0cyBgICtcbiAgICAgICAgICBgWyR7aW5OYW1lc31dLiBNaXNzaW5nIHRoZSBmb2xsb3dpbmcgaW5wdXRzOiBbJHttaXNzaW5nSW5wdXRzfV1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBvcmRlcmVkTm9kZXMgPSBnZXROb2Rlc0luVG9wb2xvZ2ljYWxPcmRlcih0aGlzLmdyYXBoLCBleGVjdXRpb25JbmZvKTtcbiAgICBjb25zdCBub2RlTGl2ZVVudGlsTWFwID0gZ2V0Tm9kZUxpdmVVbnRpbE1hcChvcmRlcmVkTm9kZXMpO1xuICAgIHJldHVybiB7b3JkZXJlZE5vZGVzLCBub2RlTGl2ZVVudGlsTWFwfTtcbiAgfVxuXG4gIHByaXZhdGUgY2xvbmVBbmRLZWVwVGVuc29yKHRlbnNvcjogVGVuc29yKSB7XG4gICAgaWYgKHRlbnNvciA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2xvbmUgPSB0ZW5zb3IuY2xvbmUoKTtcbiAgICAvLyBLZWVwIHRoZSBjbG9uZSBiZWNhdXNlYG1vZGVsLmV4ZWN1dGUoKWAgbWF5IGJlIGNhbGxlZCB3aXRoaW5cbiAgICAvLyBhIGB0aWR5KClgLCBidXQgdGhlIHVzZXIgbWF5IGluc3BlY3QgdGhlc2UgdGVuc29ycyBhZnRlciB0aGVcbiAgICAvLyB0aWR5LlxuICAgIGtlZXAoY2xvbmUpO1xuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIHByaXZhdGUgY2xvbmVUZW5zb3JMaXN0KHRlbnNvcnM6IFRlbnNvcltdKSB7XG4gICAgaWYgKCF0ZW5zb3JzKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2xvbmVkVGVuc29yID0gdGVuc29ycy5tYXAodGVuc29yID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmNsb25lQW5kS2VlcFRlbnNvcih0ZW5zb3IpO1xuICAgIH0pO1xuICAgIHJldHVybiBjbG9uZWRUZW5zb3I7XG4gIH1cblxuICBwcml2YXRlIGNsb25lVGVuc29yTWFwKHRlbnNvcnNNYXA6IE5hbWVkVGVuc29yc01hcCk6IE5hbWVkVGVuc29yc01hcCB7XG4gICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgICAgT2JqZWN0LmVudHJpZXModGVuc29yc01hcCkubWFwKChbbmFtZSwgdGVuc29yc0xpc3RdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIFtuYW1lLCB0aGlzLmNsb25lVGVuc29yTGlzdCh0ZW5zb3JzTGlzdCldO1xuICAgICAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgdGhlIGluZmVyZW5jZSBmb3IgZ2l2ZW4gaW5wdXQgdGVuc29ycy5cbiAgICogQHBhcmFtIGlucHV0cyBUZW5zb3IgbWFwIGZvciB0aGUgbW9kZWwgaW5wdXRzLCBrZXllZCBieSB0aGUgaW5wdXQgbm9kZVxuICAgKiBuYW1lcy5cbiAgICogQHBhcmFtIG91dHB1dHMgT3B0aW9uYWwuIG91dHB1dCBub2RlIG5hbWUgZnJvbSB0aGUgVGVuc29yZmxvdyBtb2RlbCwgaWZcbiAgICogbm8gb3V0cHV0cyBhcmUgc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCBvdXRwdXRzIG9mIHRoZSBtb2RlbCB3b3VsZCBiZSB1c2VkLlxuICAgKiBZb3UgY2FuIGluc3BlY3QgaW50ZXJtZWRpYXRlIG5vZGVzIG9mIHRoZSBtb2RlbCBieSBhZGRpbmcgdGhlbSB0byB0aGVcbiAgICogb3V0cHV0cyBhcnJheS5cbiAgICovXG4gIGV4ZWN1dGUoaW5wdXRzOiBOYW1lZFRlbnNvck1hcCwgb3V0cHV0cz86IHN0cmluZ1tdKTogVGVuc29yW10ge1xuICAgIC8vIERpc3Bvc2UgYW55IHRlbnNvcnMgZnJvbSBhIHByaW9yIHJ1biB0byBhdm9pZCBsZWFraW5nIHRoZW0uXG4gICAgdGhpcy5kaXNwb3NlSW50ZXJtZWRpYXRlVGVuc29ycygpO1xuICAgIGlucHV0cyA9IHRoaXMubWFwSW5wdXRzKGlucHV0cyk7XG4gICAgY29uc3QgbmFtZXMgPSBPYmplY3Qua2V5cyhpbnB1dHMpLnNvcnQoKTtcbiAgICB0aGlzLmNoZWNrSW5wdXRzKGlucHV0cyk7XG4gICAgdGhpcy5jaGVja0lucHV0U2hhcGVBbmRUeXBlKGlucHV0cyk7XG4gICAgb3V0cHV0cyA9IHRoaXMubWFwT3V0cHV0cyhvdXRwdXRzKTtcbiAgICB0aGlzLmNoZWNrT3V0cHV0cyhvdXRwdXRzKTtcbiAgICBjb25zdCBpbnB1dE5vZGVzID1cbiAgICAgICAgbmFtZXMubWFwKG5hbWUgPT4gdGhpcy5ncmFwaC5ub2Rlc1twYXJzZU5vZGVOYW1lKG5hbWUpWzBdXSk7XG4gICAgY29uc3Qgb3V0cHV0Tm9kZU5hbWVzID0gb3V0cHV0cy5tYXAobmFtZSA9PiBwYXJzZU5vZGVOYW1lKG5hbWUpWzBdKTtcbiAgICBjb25zdCBvdXRwdXROb2RlTmFtZVNldCA9IG5ldyBTZXQob3V0cHV0Tm9kZU5hbWVzKTtcbiAgICBsZXQgb3V0cHV0Tm9kZXMgPSBvdXRwdXROb2RlTmFtZXMubWFwKG5hbWUgPT4gdGhpcy5ncmFwaC5ub2Rlc1tuYW1lXSk7XG4gICAgLy8gSWYgbm8gb3V0cHV0cyBhcmUgc3BlY2lmaWVkLCB0aGVuIHVzZSB0aGUgZGVmYXVsdCBvdXRwdXRzIG9mIHRoZSBtb2RlbC5cbiAgICBpZiAob3V0cHV0Tm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvdXRwdXROb2RlcyA9IHRoaXMuX291dHB1dHM7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsYXRpb25LZXkgPSB0aGlzLmdldENvbXBpbGF0aW9uS2V5KGlucHV0Tm9kZXMsIG91dHB1dE5vZGVzKTtcblxuICAgIC8vIERvIG5vdGhpbmcgaWYgdGhlIGNvbXBpbGVkIGdyYXBoIGNhY2hlIGNvbnRhaW5zIHRoZSBpbnB1dC5cbiAgICBsZXQgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVkTWFwLmdldChjb21waWxhdGlvbktleSk7XG4gICAgaWYgKGNvbXBpbGF0aW9uID09IG51bGwpIHtcbiAgICAgIGNvbXBpbGF0aW9uID0gdGhpcy5jb21waWxlKGlucHV0cywgb3V0cHV0Tm9kZXMpO1xuICAgICAgdGhpcy5jb21waWxlZE1hcC5zZXQoY29tcGlsYXRpb25LZXksIGNvbXBpbGF0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBLZWVwIHRlbnNvcnMgaWYgS0VFUF9JTlRFUk1FRElBVEVfVEVOU09SUyBpcyBvbi5cbiAgICB0cnkge1xuICAgICAgdGhpcy5rZWVwSW50ZXJtZWRpYXRlVGVuc29ycyA9IGVudigpLmdldEJvb2woJ0tFRVBfSU5URVJNRURJQVRFX1RFTlNPUlMnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLmtlZXBJbnRlcm1lZGlhdGVUZW5zb3JzID0gZmFsc2U7XG4gICAgICBjb25zb2xlLndhcm4oZS5tZXNzYWdlKTtcbiAgICB9XG4gICAgY29uc3QgdGVuc29yQXJyYXlNYXA6IFRlbnNvckFycmF5TWFwID0ge307XG4gICAgY29uc3QgdGVuc29yTGlzdE1hcDogVGVuc29yTGlzdE1hcCA9IHt9O1xuXG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IG5ldyBFeGVjdXRpb25Db250ZXh0KFxuICAgICAgICAgIHRoaXMud2VpZ2h0TWFwLCB0ZW5zb3JBcnJheU1hcCwgdGVuc29yTGlzdE1hcCxcbiAgICAgICAgICB0aGlzLmZ1bmN0aW9uRXhlY3V0b3JNYXAsIHRoaXMucGFyc2VOb2RlTmFtZUNhY2hlKTtcbiAgICAgIGNvbnN0IHRlbnNvcnNNYXA6IE5hbWVkVGVuc29yc01hcCA9IHsuLi50aGlzLndlaWdodE1hcH07XG4gICAgICBpZiAodGhpcy5rZWVwSW50ZXJtZWRpYXRlVGVuc29ycykge1xuICAgICAgICB0aGlzLmNsb25lZFRlbnNvcnNNYXAgPSB0aGlzLmNsb25lVGVuc29yTWFwKHRoaXMud2VpZ2h0TWFwKTtcbiAgICAgIH1cblxuICAgICAgT2JqZWN0LmtleXMoaW5wdXRzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBjb25zdCBbbm9kZU5hbWUsIGluZGV4XSA9IHBhcnNlTm9kZU5hbWUobmFtZSwgY29udGV4dCk7XG4gICAgICAgIGNvbnN0IHRlbnNvcnM6IFRlbnNvcltdID0gW107XG4gICAgICAgIHRlbnNvcnNbaW5kZXhdID0gaW5wdXRzW25hbWVdO1xuICAgICAgICB0ZW5zb3JzTWFwW25vZGVOYW1lXSA9IHRlbnNvcnM7XG4gICAgICAgIGlmICh0aGlzLmtlZXBJbnRlcm1lZGlhdGVUZW5zb3JzKSB7XG4gICAgICAgICAgdGhpcy5jbG9uZWRUZW5zb3JzTWFwW25vZGVOYW1lXSA9IHRoaXMuY2xvbmVUZW5zb3JMaXN0KHRlbnNvcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGVuc29yc1RvS2VlcCA9IHRoaXMuZ2V0RnJvemVuVGVuc29ySWRzKHRlbnNvcnNNYXApO1xuICAgICAgY29uc3Qge29yZGVyZWROb2Rlcywgbm9kZUxpdmVVbnRpbE1hcH0gPSBjb21waWxhdGlvbjtcbiAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBvcmRlcmVkTm9kZXMpIHtcbiAgICAgICAgaWYgKHRlbnNvcnNNYXBbbm9kZS5uYW1lXSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRlbnNvcnMgPVxuICAgICAgICAgICAgZXhlY3V0ZU9wKG5vZGUsIHRlbnNvcnNNYXAsIGNvbnRleHQsIHRoaXMuX3Jlc291cmNlTWFuYWdlcikgYXNcbiAgICAgICAgICAgIFRlbnNvcltdO1xuICAgICAgICBpZiAodXRpbC5pc1Byb21pc2UodGVuc29ycykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBUaGUgZXhlY3V0aW9uIG9mIHRoZSBvcCAnJHtub2RlLm9wfScgcmV0dXJuZWQgYSBwcm9taXNlLiBgICtcbiAgICAgICAgICAgICAgYFBsZWFzZSB1c2UgbW9kZWwuZXhlY3V0ZUFzeW5jKCkgaW5zdGVhZC5gKTtcbiAgICAgICAgfVxuICAgICAgICB0ZW5zb3JzTWFwW25vZGUubmFtZV0gPSB0ZW5zb3JzO1xuICAgICAgICBpZiAodGhpcy5rZWVwSW50ZXJtZWRpYXRlVGVuc29ycykge1xuICAgICAgICAgIHRoaXMuY2xvbmVkVGVuc29yc01hcFtub2RlLm5hbWVdID0gdGhpcy5jbG9uZVRlbnNvckxpc3QodGVuc29ycyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jaGVja1RlbnNvckZvckRpc3Bvc2FsV2l0aE5vZGVMaXZlVW50aWxJbmZvKFxuICAgICAgICAgICAgbm9kZSwgdGVuc29yc01hcCwgY29udGV4dCwgdGVuc29yc1RvS2VlcCwgb3V0cHV0Tm9kZU5hbWVTZXQsXG4gICAgICAgICAgICBub2RlTGl2ZVVudGlsTWFwLmdldChub2RlLm5hbWUpKTtcbiAgICAgIH1cblxuICAgICAgLy8gZGlzcG9zZSB0aGUgY29udGV4dCBmb3IgdGhlIHJvb3QgZXhlY3V0b3JcbiAgICAgIGlmICh0aGlzLnBhcmVudCA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRleHQuZGlzcG9zZSh0ZW5zb3JzVG9LZWVwKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG91dHB1dHMubWFwKG5hbWUgPT4gZ2V0VGVuc29yKG5hbWUsIHRlbnNvcnNNYXAsIGNvbnRleHQpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RnJvemVuVGVuc29ySWRzKHRlbnNvck1hcDogTmFtZWRUZW5zb3JzTWFwKTogU2V0PG51bWJlcj4ge1xuICAgIGNvbnN0IGlkcyA9IFtdLmNvbmNhdC5hcHBseShcbiAgICAgICAgW10sXG4gICAgICAgIE9iamVjdC5rZXlzKHRlbnNvck1hcClcbiAgICAgICAgICAgIC5tYXAoa2V5ID0+IHRlbnNvck1hcFtrZXldKVxuICAgICAgICAgICAgLm1hcCh0ZW5zb3JzID0+IHRlbnNvcnMubWFwKHRlbnNvciA9PiB0ZW5zb3IuaWQpKSk7XG4gICAgcmV0dXJuIG5ldyBTZXQoaWRzKTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tUZW5zb3JGb3JEaXNwb3NhbChcbiAgICAgIG5vZGVOYW1lOiBzdHJpbmcsIG5vZGU6IE5vZGUsIHRlbnNvck1hcDogTmFtZWRUZW5zb3JzTWFwLFxuICAgICAgY29udGV4dDogRXhlY3V0aW9uQ29udGV4dCwgdGVuc29yc1RvS2VlcDogU2V0PG51bWJlcj4sXG4gICAgICBvdXRwdXROb2RlTmFtZVNldDogU2V0PHN0cmluZz4sXG4gICAgICBpbnRlcm1lZGlhdGVUZW5zb3JDb25zdW1lckNvdW50OiB7W2tleTogc3RyaW5nXTogbnVtYmVyfSkge1xuICAgIC8vIFNraXAgb3V0cHV0IG5vZGVzIGFuZCBhbnkgY29udHJvbCBmbG93IG5vZGVzLCBzaW5jZSBpdHMgZGVwZW5kZW5jeSBpc1xuICAgIC8vIHRyaWNreSB0byB0cmFjayBjb3JyZWN0bHkuXG4gICAgaWYgKGlzQ29udHJvbEZsb3cobm9kZSkgfHwgb3V0cHV0Tm9kZU5hbWVTZXQuaGFzKG5vZGVOYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgdGVuc29yIG9mIHRlbnNvck1hcFtub2RlTmFtZV0pIHtcbiAgICAgIGlmICh0ZW5zb3IgPT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnRbdGVuc29yLmlkXSA9XG4gICAgICAgICAgKGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnRbdGVuc29yLmlkXSB8fCAwKSArXG4gICAgICAgICAgbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBub2RlLmlucHV0cykge1xuICAgICAgLy8gU2tpcCBhbnkgY29udHJvbCBmbG93IG5vZGVzLCBzaW5jZSBpdHMgZGVwZW5kZW5jeSBpcyB0cmlja3kgdG8gdHJhY2tcbiAgICAgIC8vIGNvcnJlY3RseS5cbiAgICAgIGlmIChpc0NvbnRyb2xGbG93KGlucHV0KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGVuc29ycyA9XG4gICAgICAgICAgZ2V0VGVuc29yc0ZvckN1cnJlbnRDb250ZXh0KGlucHV0Lm5hbWUsIHRlbnNvck1hcCwgY29udGV4dCk7XG4gICAgICBpZiAodGVuc29ycyA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHRlbnNvciBvZiB0ZW5zb3JzKSB7XG4gICAgICAgIGlmICghdGVuc29yIHx8IHRlbnNvci5rZXB0IHx8IHRlbnNvcnNUb0tlZXAuaGFzKHRlbnNvci5pZCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgaW50ZXJtZWRpYXRlIG5vZGVzJyB0ZW5zb3JzIGhhdmUgY291bnRzIHNldCwgbm90IG1hcmtlZCBhc1xuICAgICAgICAvLyBrZXB0LCBhbmQgbm90IGluIGB0ZW5zb3JzVG9LZWVwYC5cbiAgICAgICAgLy8gSW5wdXQgYW5kIHdlaWdodCBub2RlcycgdGVuc29ycyBzaG91bGQgZXhpc3QgaW4gYHRlbnNvcnNUb0tlZXBgLlxuICAgICAgICAvLyBPdXRwdXQgYW5kIGNvbnRyb2wgZmxvdyBub2RlcycgdGVuc29ycyBzaG91bGQgbmV2ZXIgaGF2ZSBjb3VudCBzZXQuXG4gICAgICAgIGNvbnN0IGNvdW50ID0gaW50ZXJtZWRpYXRlVGVuc29yQ29uc3VtZXJDb3VudFt0ZW5zb3IuaWRdO1xuICAgICAgICBpZiAoY291bnQgPT09IDEpIHtcbiAgICAgICAgICB0ZW5zb3IuZGlzcG9zZSgpO1xuICAgICAgICAgIGRlbGV0ZSBpbnRlcm1lZGlhdGVUZW5zb3JDb25zdW1lckNvdW50W3RlbnNvci5pZF07XG4gICAgICAgIH0gZWxzZSBpZiAoY291bnQgIT0gbnVsbCkge1xuICAgICAgICAgIGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnRbdGVuc29yLmlkXS0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja1RlbnNvckZvckRpc3Bvc2FsV2l0aE5vZGVMaXZlVW50aWxJbmZvKFxuICAgICAgbm9kZTogTm9kZSwgdGVuc29yTWFwOiBOYW1lZFRlbnNvcnNNYXAsIGNvbnRleHQ6IEV4ZWN1dGlvbkNvbnRleHQsXG4gICAgICB0ZW5zb3JzVG9LZWVwOiBTZXQ8bnVtYmVyPiwgb3V0cHV0Tm9kZU5hbWVTZXQ6IFNldDxzdHJpbmc+LFxuICAgICAgbGl2ZVVudGlsTm9kZXM/OiBOb2RlW10pIHtcbiAgICBmdW5jdGlvbiBpc05vbkRpc3Bvc2FibGVOb2RlKG5vZGU6IE5vZGUpIHtcbiAgICAgIC8vIFNraXAgb3V0cHV0IG5vZGVzIGFuZCBhbnkgY29udHJvbCBmbG93IG5vZGVzLCBzaW5jZSBpdHMgZGVwZW5kZW5jeSBpc1xuICAgICAgLy8gdHJpY2t5IHRvIHRyYWNrIGNvcnJlY3RseS5cbiAgICAgIHJldHVybiBpc0NvbnRyb2xGbG93KG5vZGUpIHx8IG91dHB1dE5vZGVOYW1lU2V0Lmhhcyhub2RlLm5hbWUpO1xuICAgIH1cblxuICAgIGlmIChpc0NvbnRyb2xGbG93KG5vZGUpIHx8IGxpdmVVbnRpbE5vZGVzID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG5vZGVUb0Rpc3Bvc2Ugb2YgbGl2ZVVudGlsTm9kZXMpIHtcbiAgICAgIGlmIChpc05vbkRpc3Bvc2FibGVOb2RlKG5vZGVUb0Rpc3Bvc2UpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdGVuc29ycyA9IGdldFRlbnNvcnNGb3JDdXJyZW50Q29udGV4dChcbiAgICAgICAgICBub2RlVG9EaXNwb3NlLm5hbWUsIHRlbnNvck1hcCwgY29udGV4dCk7XG4gICAgICBmb3IgKGNvbnN0IHRlbnNvciBvZiB0ZW5zb3JzKSB7XG4gICAgICAgIGlmICghdGVuc29yIHx8IHRlbnNvci5rZXB0IHx8IHRlbnNvcnNUb0tlZXAuaGFzKHRlbnNvci5pZCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0ZW5zb3IuZGlzcG9zZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyB0aGUgaW5mZXJlbmNlIGZvciBnaXZlbiBpbnB1dCB0ZW5zb3JzIGluIEFzeW5jIGZhc2hpb24uXG4gICAqIEBwYXJhbSBpbnB1dHMgVGVuc29yIG1hcCBmb3IgdGhlIG1vZGVsIGlucHV0cywga2V5ZWQgYnkgdGhlIGlucHV0IG5vZGVcbiAgICogbmFtZXMuXG4gICAqIEBwYXJhbSBvdXRwdXRzIG91dHB1dCBub2RlIG5hbWUgZnJvbSB0aGUgVGVuc29yZmxvdyBtb2RlbCwgaWYgbm8gb3V0cHV0c1xuICAgKiBhcmUgc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCBvdXRwdXRzIG9mIHRoZSBtb2RlbCB3b3VsZCBiZSB1c2VkLiBZb3UgY2FuXG4gICAqIGluc3BlY3QgaW50ZXJtZWRpYXRlIG5vZGVzIG9mIHRoZSBtb2RlbCBieSBhZGRpbmcgdGhlbSB0byB0aGUgb3V0cHV0c1xuICAgKiBhcnJheS5cbiAgICovXG4gIGFzeW5jIGV4ZWN1dGVBc3luYyhpbnB1dHM6IE5hbWVkVGVuc29yTWFwLCBvdXRwdXRzPzogc3RyaW5nW10pOlxuICAgICAgUHJvbWlzZTxUZW5zb3JbXT4ge1xuICAgIHJldHVybiB0aGlzLl9leGVjdXRlQXN5bmMoaW5wdXRzLCBvdXRwdXRzKTtcbiAgfVxuXG4gIGRpc3Bvc2VJbnRlcm1lZGlhdGVUZW5zb3JzKCkge1xuICAgIGlmICghdGhpcy5jbG9uZWRUZW5zb3JzTWFwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIE9iamVjdC52YWx1ZXModGhpcy5jbG9uZWRUZW5zb3JzTWFwKS5mb3JFYWNoKHRlbnNvcnNMaXN0ID0+IHtcbiAgICAgIGZvciAoY29uc3QgdGVuc29yIG9mIHRlbnNvcnNMaXN0KSB7XG4gICAgICAgIGlmICh0ZW5zb3IgJiYgIXRlbnNvci5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgICAgdGVuc29yLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5jbG9uZWRUZW5zb3JzTWFwID0gbnVsbDtcbiAgfVxuXG4gIGdldEludGVybWVkaWF0ZVRlbnNvcnMoKTogTmFtZWRUZW5zb3JzTWFwIHtcbiAgICByZXR1cm4gdGhpcy5jbG9uZWRUZW5zb3JzTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIHRoZSBpbmZlcmVuY2UgZm9yIGdpdmVuIGlucHV0IHRlbnNvcnMgaW4gQXN5bmMgZmFzaGlvbi5cbiAgICogQHBhcmFtIGlucHV0cyBUZW5zb3IgbWFwIGZvciB0aGUgbW9kZWwgaW5wdXRzLCBrZXllZCBieSB0aGUgaW5wdXQgbm9kZVxuICAgKiBuYW1lcy5cbiAgICogQHBhcmFtIG91dHB1dHMgT3B0aW9uYWwuIG91dHB1dCBub2RlIG5hbWUgZnJvbSB0aGUgVGVuc29yZmxvdyBtb2RlbCxcbiAgICogaWYgbm8gb3V0cHV0cyBhcmUgc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCBvdXRwdXRzIG9mIHRoZSBtb2RlbCB3b3VsZCBiZVxuICAgKiB1c2VkLiBZb3UgY2FuIGluc3BlY3QgaW50ZXJtZWRpYXRlIG5vZGVzIG9mIHRoZSBtb2RlbCBieSBhZGRpbmcgdGhlbSB0b1xuICAgKiB0aGUgb3V0cHV0cyBhcnJheS5cbiAgICogQHBhcmFtIGlzRnVuY3Rpb25FeGVjdXRpb24gT3B0aW9uYWwuIEZsYWcgZm9yIGV4ZWN1dGluZyBhIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0gdGVuc29yQXJyYXlNYXAgT3B0aW9uYWwsIGdsb2JhbCBUZW5zb3JBcnJheSBtYXAgYnkgaWQuIFVzZWQgZm9yXG4gICAqIGZ1bmN0aW9uIGV4ZWN1dGlvbi5cbiAgICogQHBhcmFtIHRlbnNvckFycmF5TWFwIE9wdGlvbmFsIGdsb2JhbCBUZW5zb3JMaXN0IG1hcCBieSBpZC4gVXNlZCBmb3JcbiAgICogZnVuY3Rpb24gZXhlY3V0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBfZXhlY3V0ZUFzeW5jKFxuICAgICAgaW5wdXRzOiBOYW1lZFRlbnNvck1hcCwgb3V0cHV0cz86IHN0cmluZ1tdLCBpc0Z1bmN0aW9uRXhlY3V0aW9uID0gZmFsc2UsXG4gICAgICB0ZW5zb3JBcnJheU1hcDogVGVuc29yQXJyYXlNYXAgPSB7fSxcbiAgICAgIHRlbnNvckxpc3RNYXA6IFRlbnNvckxpc3RNYXAgPSB7fSk6IFByb21pc2U8VGVuc29yW10+IHtcbiAgICAvLyBEaXNwb3NlIGFueSB0ZW5zb3JzIGZyb20gYSBwcmlvciBydW4gdG8gYXZvaWQgbGVha2luZyB0aGVtLlxuICAgIHRoaXMuZGlzcG9zZUludGVybWVkaWF0ZVRlbnNvcnMoKTtcbiAgICBpZiAoIWlzRnVuY3Rpb25FeGVjdXRpb24pIHtcbiAgICAgIGlucHV0cyA9IHRoaXMubWFwSW5wdXRzKGlucHV0cyk7XG4gICAgICB0aGlzLmNoZWNrSW5wdXRzKGlucHV0cyk7XG4gICAgICB0aGlzLmNoZWNrSW5wdXRTaGFwZUFuZFR5cGUoaW5wdXRzKTtcbiAgICAgIG91dHB1dHMgPSB0aGlzLm1hcE91dHB1dHMob3V0cHV0cyk7XG4gICAgICB0aGlzLmNoZWNrT3V0cHV0cyhvdXRwdXRzKTtcbiAgICB9XG5cbiAgICAvLyBLZWVwIHRlbnNvcnMgaWYgS0VFUF9JTlRFUk1FRElBVEVfVEVOU09SUyBpcyBvbi5cbiAgICB0cnkge1xuICAgICAgdGhpcy5rZWVwSW50ZXJtZWRpYXRlVGVuc29ycyA9IGVudigpLmdldEJvb2woJ0tFRVBfSU5URVJNRURJQVRFX1RFTlNPUlMnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLmtlZXBJbnRlcm1lZGlhdGVUZW5zb3JzID0gZmFsc2U7XG4gICAgICBjb25zb2xlLndhcm4oZS5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IEV4ZWN1dGlvbkNvbnRleHQoXG4gICAgICAgIHRoaXMud2VpZ2h0TWFwLCB0ZW5zb3JBcnJheU1hcCwgdGVuc29yTGlzdE1hcCwgdGhpcy5mdW5jdGlvbkV4ZWN1dG9yTWFwLFxuICAgICAgICB0aGlzLnBhcnNlTm9kZU5hbWVDYWNoZSk7XG5cbiAgICBpZiAodGhpcy5rZWVwSW50ZXJtZWRpYXRlVGVuc29ycykge1xuICAgICAgdGhpcy5jbG9uZWRUZW5zb3JzTWFwID0gdGhpcy5jbG9uZVRlbnNvck1hcCh0aGlzLndlaWdodE1hcCk7XG4gICAgfVxuXG4gICAgLy8gR3JhcGggd2l0aCBjb250cm9sIGZsb3cgb3AgcmVxdWlyZXMgcnVudGltZSBldmFsdWF0aW9uIG9mIHRoZSBleGVjdXRpb25cbiAgICAvLyBvcmRlciwgd2hpbGUgd2l0aG91dCBjb250cm9sIGZsb3cgdGhlIGV4ZWN1dGlvbiBvcmRlciBpcyBwcmUtZGV0ZXJtaW5lZFxuICAgIC8vIGluIHRoZSBjb21waWxlIG1ldGhvZC5cbiAgICBjb25zdCB0ZW5zb3JzTWFwID0gYXdhaXQgdGhpcy5leGVjdXRlV2l0aENvbnRyb2xGbG93KFxuICAgICAgICBpbnB1dHMsIGNvbnRleHQsIG91dHB1dHMsIGlzRnVuY3Rpb25FeGVjdXRpb24pO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBvdXRwdXRzLm1hcChuYW1lID0+IGdldFRlbnNvcihuYW1lLCB0ZW5zb3JzTWFwLCBjb250ZXh0KSk7XG5cbiAgICAvLyBkaXNwb3NlIGFsbCB0aGUgaW50ZXJtZWRpYXRlIHRlbnNvcnNcbiAgICBjb25zdCBvdXRwdXRJZHMgPSByZXN1bHRzLm1hcCh0ID0+IHQuaWQpO1xuICAgIGNvbnN0IGlucHV0SWRzID0gT2JqZWN0LmtleXMoaW5wdXRzKS5tYXAobmFtZSA9PiBpbnB1dHNbbmFtZV0uaWQpO1xuICAgIGNvbnN0IGtlZXBJZHMgPVxuICAgICAgICBuZXcgU2V0PG51bWJlcj4oWy4uLm91dHB1dElkcywgLi4uaW5wdXRJZHMsIC4uLnRoaXMud2VpZ2h0SWRzXSk7XG5cbiAgICBPYmplY3QudmFsdWVzKHRlbnNvcnNNYXApLmZvckVhY2godGVuc29yc0xpc3QgPT4ge1xuICAgICAgdGVuc29yc0xpc3QuZm9yRWFjaCh0ZW5zb3IgPT4ge1xuICAgICAgICBpZiAodGVuc29yICYmICF0ZW5zb3IuaXNEaXNwb3NlZCAmJiAha2VlcElkcy5oYXModGVuc29yLmlkKSkge1xuICAgICAgICAgIHRlbnNvci5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gZGlzcG9zZSB0aGUgY29udGV4dCBmb3IgdGhlIHJvb3QgZXhlY3V0b3JcbiAgICBpZiAodGhpcy5wYXJlbnQgPT0gbnVsbCkge1xuICAgICAgY29udGV4dC5kaXNwb3NlKGtlZXBJZHMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgYXN5bmMgZXhlY3V0ZUZ1bmN0aW9uQXN5bmMoXG4gICAgICBpbnB1dHM6IFRlbnNvcltdLCB0ZW5zb3JBcnJheU1hcDogVGVuc29yQXJyYXlNYXAsXG4gICAgICB0ZW5zb3JMaXN0TWFwOiBUZW5zb3JMaXN0TWFwKTogUHJvbWlzZTxUZW5zb3JbXT4ge1xuICAgIGNvbnN0IG1hcHBlZElucHV0cyA9IGlucHV0cy5yZWR1Y2UoKG1hcCwgdGVuc29yLCBpbmRleCkgPT4ge1xuICAgICAgbWFwW3RoaXMuaW5wdXRzW2luZGV4XS5uYW1lXSA9IHRlbnNvcjtcbiAgICAgIHJldHVybiBtYXA7XG4gICAgfSwge30gYXMgTmFtZWRUZW5zb3JNYXApO1xuXG4gICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGVBc3luYyhcbiAgICAgICAgbWFwcGVkSW5wdXRzLCB0aGlzLm91dHB1dE5vZGVzLCB0cnVlLCB0ZW5zb3JBcnJheU1hcCwgdGVuc29yTGlzdE1hcCk7XG4gIH1cblxuICAvKipcbiAgICogV2hlbiB0aGVyZSBhcmUgY29udHJvbCBmbG93IG5vZGVzIGluIHRoZSBncmFwaCwgdGhlIGdyYXBoIGV4ZWN1dGlvbiB1c2VcbiAgICogRXhlY3V0aW9uQ29udGV4dCB0byBrZWVwIHRyYWNrIG9mIHRoZSBmcmFtZXMgYW5kIGxvb3AgaXRlcmF0b3JzLlxuICAgKiBAcGFyYW0gaW5wdXRzIHBsYWNlaG9sZGVyIHRlbnNvcnMgZm9yIHRoZSBncmFwaC5cbiAgICogQHBhcmFtIGNvbnRleHQgdGhlIGV4ZWN1dGlvbiBjb250ZXh0IG9iamVjdCBmb3IgY3VycmVudCBleGVjdXRpb24uXG4gICAqIEBwYXJhbSBvdXRwdXROYW1lcyBPcHRpb25hbC4gb3V0cHV0IG5vZGUgbmFtZSBmcm9tIHRoZSBUZW5zb3JmbG93IG1vZGVsLFxuICAgKiBpZiBubyBvdXRwdXRzIGFyZSBzcGVjaWZpZWQsIHRoZSBkZWZhdWx0IG91dHB1dHMgb2YgdGhlIG1vZGVsIHdvdWxkIGJlXG4gICAqIHVzZWQuIFlvdSBjYW4gaW5zcGVjdCBpbnRlcm1lZGlhdGUgbm9kZXMgb2YgdGhlIG1vZGVsIGJ5IGFkZGluZyB0aGVtIHRvXG4gICAqIHRoZSBvdXRwdXRzIGFycmF5LlxuICAgKiBAcGFyYW0gaXNGdW5jdGlvbkV4ZWN1dGlvbiBGbGFnIGZvciBleGVjdXRpbmcgYSBmdW5jdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVdpdGhDb250cm9sRmxvdyhcbiAgICAgIGlucHV0czogTmFtZWRUZW5zb3JNYXAsIGNvbnRleHQ6IEV4ZWN1dGlvbkNvbnRleHQsIG91dHB1dE5hbWVzPzogc3RyaW5nW10sXG4gICAgICBpc0Z1bmN0aW9uRXhlY3V0aW9uPzogYm9vbGVhbik6IFByb21pc2U8TmFtZWRUZW5zb3JzTWFwPiB7XG4gICAgY29uc3QgbmFtZXMgPSBPYmplY3Qua2V5cyhpbnB1dHMpO1xuICAgIGNvbnN0IGlucHV0Tm9kZXMgPVxuICAgICAgICBuYW1lcy5tYXAobmFtZSA9PiB0aGlzLmdyYXBoLm5vZGVzW3BhcnNlTm9kZU5hbWUobmFtZSlbMF1dKTtcbiAgICBjb25zdCBvdXRwdXROb2RlTmFtZXMgPSBvdXRwdXROYW1lcy5tYXAobmFtZSA9PiBwYXJzZU5vZGVOYW1lKG5hbWUpWzBdKTtcbiAgICBjb25zdCBvdXRwdXROb2RlTmFtZVNldCA9IG5ldyBTZXQob3V0cHV0Tm9kZU5hbWVzKTtcbiAgICBsZXQgb3V0cHV0Tm9kZXMgPSBvdXRwdXROb2RlTmFtZXMubWFwKG5hbWUgPT4gdGhpcy5ncmFwaC5ub2Rlc1tuYW1lXSk7XG5cbiAgICAvLyBJZiBubyBvdXRwdXRzIGFyZSBzcGVjaWZpZWQsIHRoZW4gdXNlIHRoZSBkZWZhdWx0IG91dHB1dHMgb2YgdGhlIG1vZGVsLlxuICAgIGlmIChvdXRwdXROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG91dHB1dE5vZGVzID0gdGhpcy5fb3V0cHV0cztcbiAgICB9XG5cbiAgICBjb25zdCB7dXNlZE5vZGVzLCBtaXNzaW5nSW5wdXRzLCBkeW5hbWljTm9kZSwgc3luY0lucHV0c30gPVxuICAgICAgICBnZXRFeGVjdXRpb25TdWJncmFwaChcbiAgICAgICAgICAgIGlucHV0cywgb3V0cHV0Tm9kZXMsIHRoaXMud2VpZ2h0TWFwLCB0aGlzLl9pbml0Tm9kZXMpO1xuXG4gICAgLy8gRmlyc3Qgbm9kZXMgdG8gZXhlY3V0ZSBpbmNsdWRlIGlucHV0Tm9kZXMsIHdlaWdodHMsIGFuZCBpbml0Tm9kZXMuXG4gICAgY29uc3Qgc3RhY2s6IE5vZGVXaXRoQ29udGV4dHNbXSA9IFtcbiAgICAgIC4uLmlucHV0Tm9kZXMsIC4uLnRoaXMuZ3JhcGgud2VpZ2h0cywgLi4uKHRoaXMuX2luaXROb2RlcyB8fCBbXSlcbiAgICBdLm1hcChub2RlID0+IHtcbiAgICAgIHJldHVybiB7bm9kZSwgY29udGV4dHM6IGNvbnRleHQuY3VycmVudENvbnRleHR9O1xuICAgIH0pO1xuICAgIGNvbnN0IHRlbnNvcnNNYXA6IE5hbWVkVGVuc29yc01hcCA9IHsuLi50aGlzLndlaWdodE1hcH07XG4gICAgT2JqZWN0LmtleXMoaW5wdXRzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgY29uc3QgW25vZGVOYW1lLCBpbmRleF0gPSBwYXJzZU5vZGVOYW1lKG5hbWUpO1xuICAgICAgY29uc3QgdGVuc29yczogVGVuc29yW10gPSBbXTtcbiAgICAgIHRlbnNvcnNbaW5kZXhdID0gaW5wdXRzW25hbWVdO1xuICAgICAgdGVuc29yc01hcFtub2RlTmFtZV0gPSB0ZW5zb3JzO1xuICAgIH0pO1xuICAgIGNvbnN0IGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnQ6IHtba2V5OiBudW1iZXJdOiBudW1iZXJ9ID0ge307XG4gICAgY29uc3QgdGVuc29yc1RvS2VlcCA9IHRoaXMuZ2V0RnJvemVuVGVuc29ySWRzKHRlbnNvcnNNYXApO1xuICAgIGNvbnN0IGFkZGVkOiB7W2tleTogc3RyaW5nXTogYm9vbGVhbn0gPSB7fTtcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcHJvbWlzZXMgPSB0aGlzLnByb2Nlc3NTdGFjayhcbiAgICAgICAgICBpbnB1dE5vZGVzLCBzdGFjaywgY29udGV4dCwgdGVuc29yc01hcCwgYWRkZWQsIHRlbnNvcnNUb0tlZXAsXG4gICAgICAgICAgb3V0cHV0Tm9kZU5hbWVTZXQsIGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnQsIHVzZWROb2Rlcyk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuICAgIGlmIChkeW5hbWljTm9kZSA9PSBudWxsICYmICFpc0Z1bmN0aW9uRXhlY3V0aW9uKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYFRoaXMgbW9kZWwgZXhlY3V0aW9uIGRpZCBub3QgY29udGFpbiBhbnkgbm9kZXMgd2l0aCBjb250cm9sIGZsb3cgYCArXG4gICAgICAgICAgYG9yIGR5bmFtaWMgb3V0cHV0IHNoYXBlcy4gWW91IGNhbiB1c2UgbW9kZWwuZXhlY3V0ZSgpIGluc3RlYWQuYCk7XG4gICAgfVxuICAgIGNvbnN0IG1pc3NpbmdPdXRwdXRzID1cbiAgICAgICAgb3V0cHV0Tm9kZXNcbiAgICAgICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgICAgICAgbm9kZSA9PiAhaXNDb250cm9sRmxvdyhub2RlKSAmJlxuICAgICAgICAgICAgICAgICAgICAhZ2V0VGVuc29yKG5vZGUubmFtZSwgdGVuc29yc01hcCwgY29udGV4dCkpXG4gICAgICAgICAgICAubWFwKG5vZGUgPT4gbm9kZS5uYW1lKTtcbiAgICBpZiAobWlzc2luZ091dHB1dHMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGFsdGVybmF0aXZlTXNnID0gJyc7XG4gICAgICBpZiAoZHluYW1pY05vZGUgIT0gbnVsbCkge1xuICAgICAgICBhbHRlcm5hdGl2ZU1zZyA9XG4gICAgICAgICAgICBgQWx0ZXJuYXRpdmVseSwgdG8gYXZvaWQgdGhlIGR5bmFtaWMgb3BzLCB1c2UgbW9kZWwuZXhlY3V0ZSgpIGAgK1xuICAgICAgICAgICAgYGFuZCBzcGVjaWZ5IHRoZSBpbnB1dHMgWyR7c3luY0lucHV0c31dYDtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IGNvbXB1dGUgdGhlIG91dHB1dHMgWyR7bWlzc2luZ091dHB1dHN9XSBmcm9tIHRoZSBwcm92aWRlZCBgICtcbiAgICAgICAgICBgaW5wdXRzIFske25hbWVzfV0uIENvbnNpZGVyIHByb3ZpZGluZyB0aGUgZm9sbG93aW5nIGlucHV0czogYCArXG4gICAgICAgICAgYFske21pc3NpbmdJbnB1dHN9XS4gJHthbHRlcm5hdGl2ZU1zZ31gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlbnNvcnNNYXA7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NTdGFjayhcbiAgICAgIGlucHV0Tm9kZXM6IE5vZGVbXSwgc3RhY2s6IE5vZGVXaXRoQ29udGV4dHNbXSwgY29udGV4dDogRXhlY3V0aW9uQ29udGV4dCxcbiAgICAgIHRlbnNvck1hcDogTmFtZWRUZW5zb3JzTWFwLCBhZGRlZDoge1trZXk6IHN0cmluZ106IGJvb2xlYW59LFxuICAgICAgdGVuc29yc1RvS2VlcDogU2V0PG51bWJlcj4sIG91dHB1dE5vZGVOYW1lU2V0OiBTZXQ8c3RyaW5nPixcbiAgICAgIGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnQ6IHtba2V5OiBudW1iZXJdOiBudW1iZXJ9LFxuICAgICAgdXNlZE5vZGVzOiBTZXQ8c3RyaW5nPikge1xuICAgIGNvbnN0IHByb21pc2VzOiBBcnJheTxQcm9taXNlPFRlbnNvcltdPj4gPSBbXTtcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgaXRlbSA9IHN0YWNrLnBvcCgpO1xuICAgICAgY29udGV4dC5jdXJyZW50Q29udGV4dCA9IGl0ZW0uY29udGV4dHM7XG4gICAgICBsZXQgbm9kZU5hbWUgPSAnJztcbiAgICAgIC8vIFRoZSB0ZW5zb3Igb2YgdGhlIEVudGVyIG9wIHdpdGggaXNDb25zdGFudCBzZXQgc2hvdWxkIGJlIHNldFxuICAgICAgLy8gaW4gdGhlIHBhcmVudCBzY29wZSwgc28gaXQgd2lsbCBiZSBhdmFpbGFibGUgYXMgY29uc3RhbnQgZm9yIHRoZVxuICAgICAgLy8gd2hvbGUgbG9vcC5cbiAgICAgIGlmIChpdGVtLm5vZGUub3AgPT09ICdFbnRlcicgJiZcbiAgICAgICAgICBnZXRQYXJhbVZhbHVlKCdpc0NvbnN0YW50JywgaXRlbS5ub2RlLCB0ZW5zb3JNYXAsIGNvbnRleHQpKSB7XG4gICAgICAgIFtub2RlTmFtZV0gPSBnZXROb2RlTmFtZUFuZEluZGV4KGl0ZW0ubm9kZS5uYW1lLCBjb250ZXh0KTtcbiAgICAgIH1cblxuICAgICAgLy8gb25seSBwcm9jZXNzIG5vZGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgdGVuc29yTWFwIHlldCwgdGhpcyBpbmNsdWRlXG4gICAgICAvLyBpbnB1dE5vZGVzIGFuZCBpbnRlcm5hbCBpbml0Tm9kZXMuXG4gICAgICBpZiAodGVuc29yTWFwW2l0ZW0ubm9kZS5uYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbnNvcnMgPVxuICAgICAgICAgICAgZXhlY3V0ZU9wKGl0ZW0ubm9kZSwgdGVuc29yTWFwLCBjb250ZXh0LCB0aGlzLl9yZXNvdXJjZU1hbmFnZXIpO1xuICAgICAgICBpZiAoIW5vZGVOYW1lKSB7XG4gICAgICAgICAgW25vZGVOYW1lXSA9IGdldE5vZGVOYW1lQW5kSW5kZXgoaXRlbS5ub2RlLm5hbWUsIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGN1cnJlbnRDb250ZXh0ID0gY29udGV4dC5jdXJyZW50Q29udGV4dDtcbiAgICAgICAgaWYgKHV0aWwuaXNQcm9taXNlKHRlbnNvcnMpKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0ZW5zb3JzLnRoZW4odCA9PiB7XG4gICAgICAgICAgICB0ZW5zb3JNYXBbbm9kZU5hbWVdID0gdDtcbiAgICAgICAgICAgIGlmICh0aGlzLmtlZXBJbnRlcm1lZGlhdGVUZW5zb3JzKSB7XG4gICAgICAgICAgICAgIHRoaXMuY2xvbmVkVGVuc29yc01hcFtub2RlTmFtZV0gPSB0aGlzLmNsb25lVGVuc29yTGlzdCh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRleHQuY3VycmVudENvbnRleHQgPSBjdXJyZW50Q29udGV4dDtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tUZW5zb3JGb3JEaXNwb3NhbChcbiAgICAgICAgICAgICAgICBub2RlTmFtZSwgaXRlbS5ub2RlLCB0ZW5zb3JNYXAsIGNvbnRleHQsIHRlbnNvcnNUb0tlZXAsXG4gICAgICAgICAgICAgICAgb3V0cHV0Tm9kZU5hbWVTZXQsIGludGVybWVkaWF0ZVRlbnNvckNvbnN1bWVyQ291bnQpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzQ2hpbGROb2RlcyhcbiAgICAgICAgICAgICAgICBpdGVtLm5vZGUsIHN0YWNrLCBjb250ZXh0LCB0ZW5zb3JNYXAsIGFkZGVkLCB1c2VkTm9kZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRlbnNvck1hcFtub2RlTmFtZV0gPSB0ZW5zb3JzO1xuICAgICAgICAgIGlmICh0aGlzLmtlZXBJbnRlcm1lZGlhdGVUZW5zb3JzKSB7XG4gICAgICAgICAgICB0aGlzLmNsb25lZFRlbnNvcnNNYXBbbm9kZU5hbWVdID0gdGhpcy5jbG9uZVRlbnNvckxpc3QodGVuc29ycyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuY2hlY2tUZW5zb3JGb3JEaXNwb3NhbChcbiAgICAgICAgICAgICAgbm9kZU5hbWUsIGl0ZW0ubm9kZSwgdGVuc29yTWFwLCBjb250ZXh0LCB0ZW5zb3JzVG9LZWVwLFxuICAgICAgICAgICAgICBvdXRwdXROb2RlTmFtZVNldCwgaW50ZXJtZWRpYXRlVGVuc29yQ29uc3VtZXJDb3VudCk7XG4gICAgICAgICAgdGhpcy5wcm9jZXNzQ2hpbGROb2RlcyhcbiAgICAgICAgICAgICAgaXRlbS5ub2RlLCBzdGFjaywgY29udGV4dCwgdGVuc29yTWFwLCBhZGRlZCwgdXNlZE5vZGVzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2hpbGROb2RlcyhcbiAgICAgICAgICAgIGl0ZW0ubm9kZSwgc3RhY2ssIGNvbnRleHQsIHRlbnNvck1hcCwgYWRkZWQsIHVzZWROb2Rlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlcztcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc0NoaWxkTm9kZXMoXG4gICAgICBub2RlOiBOb2RlLCBzdGFjazogTm9kZVdpdGhDb250ZXh0c1tdLCBjb250ZXh0OiBFeGVjdXRpb25Db250ZXh0LFxuICAgICAgdGVuc29yTWFwOiBOYW1lZFRlbnNvcnNNYXAsIGFkZGVkOiB7W2tleTogc3RyaW5nXTogYm9vbGVhbn0sXG4gICAgICB1c2VkTm9kZXM6IFNldDxzdHJpbmc+KSB7XG4gICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZE5vZGUpID0+IHtcbiAgICAgIGNvbnN0IFtub2RlTmFtZSwgXSA9IGdldE5vZGVOYW1lQW5kSW5kZXgoY2hpbGROb2RlLm5hbWUsIGNvbnRleHQpO1xuICAgICAgaWYgKGFkZGVkW25vZGVOYW1lXSB8fCAhdXNlZE5vZGVzLmhhcyhjaGlsZE5vZGUubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gTWVyZ2Ugb3AgY2FuIGJlIHB1c2hlZCBpZiBhbnkgb2YgaXRzIGlucHV0cyBoYXMgdmFsdWUuXG4gICAgICBpZiAoY2hpbGROb2RlLm9wID09PSAnTWVyZ2UnKSB7XG4gICAgICAgIGlmIChjaGlsZE5vZGUuaW5wdXROYW1lcy5zb21lKG5hbWUgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gISFnZXRUZW5zb3IobmFtZSwgdGVuc29yTWFwLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgYWRkZWRbbm9kZU5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICBzdGFjay5wdXNoKHtjb250ZXh0czogY29udGV4dC5jdXJyZW50Q29udGV4dCwgbm9kZTogY2hpbGROb2RlfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSAgLy8gT3RoZXJ3aXNlIGFsbCBpbnB1dHMgbXVzdCB0byBoYXZlIHZhbHVlLlxuICAgICAgICAgIGlmIChjaGlsZE5vZGUuaW5wdXROYW1lcy5ldmVyeShuYW1lID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISFnZXRUZW5zb3IobmFtZSwgdGVuc29yTWFwLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgYWRkZWRbbm9kZU5hbWVdID0gdHJ1ZTtcbiAgICAgICAgc3RhY2sucHVzaCh7Y29udGV4dHM6IGNvbnRleHQuY3VycmVudENvbnRleHQsIG5vZGU6IGNoaWxkTm9kZX0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbGVhc2VzIHRoZSBtZW1vcnkgdXNlZCBieSB0aGUgd2VpZ2h0IHRlbnNvcnMuXG4gICAqL1xuICBkaXNwb3NlKCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMud2VpZ2h0TWFwKVxuICAgICAgICAuZm9yRWFjaChcbiAgICAgICAgICAgIGtleSA9PiB0aGlzLndlaWdodE1hcFtrZXldLmZvckVhY2godGVuc29yID0+IHRlbnNvci5kaXNwb3NlKCkpKTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tJbnB1dFNoYXBlQW5kVHlwZShpbnB1dHM6IE5hbWVkVGVuc29yTWFwKSB7XG4gICAgT2JqZWN0LmtleXMoaW5wdXRzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSBpbnB1dHNbbmFtZV07XG4gICAgICBjb25zdCBbbm9kZU5hbWUsIF0gPSBwYXJzZU5vZGVOYW1lKG5hbWUpO1xuICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ3JhcGgubm9kZXNbbm9kZU5hbWVdO1xuICAgICAgaWYgKG5vZGUuYXR0clBhcmFtc1snc2hhcGUnXSAmJiBub2RlLmF0dHJQYXJhbXNbJ3NoYXBlJ10udmFsdWUpIHtcbiAgICAgICAgY29uc3Qgc2hhcGUgPSBub2RlLmF0dHJQYXJhbXNbJ3NoYXBlJ10udmFsdWUgYXMgbnVtYmVyW107XG4gICAgICAgIGNvbnN0IG1hdGNoID0gc2hhcGUubGVuZ3RoID09PSBpbnB1dC5zaGFwZS5sZW5ndGggJiZcbiAgICAgICAgICAgIGlucHV0LnNoYXBlLmV2ZXJ5KFxuICAgICAgICAgICAgICAgIChkaW0sIGluZGV4KSA9PiBzaGFwZVtpbmRleF0gPT09IC0xIHx8IHNoYXBlW2luZGV4XSA9PT0gZGltKTtcbiAgICAgICAgdXRpbC5hc3NlcnQoXG4gICAgICAgICAgICBtYXRjaCxcbiAgICAgICAgICAgICgpID0+IGBUaGUgc2hhcGUgb2YgZGljdFsnJHtub2RlLm5hbWV9J10gcHJvdmlkZWQgaW4gYCArXG4gICAgICAgICAgICAgICAgYG1vZGVsLmV4ZWN1dGUoZGljdCkgbXVzdCBiZSBbJHtzaGFwZX1dLCBidXQgd2FzIGAgK1xuICAgICAgICAgICAgICAgIGBbJHtpbnB1dC5zaGFwZX1dYCk7XG4gICAgICB9XG4gICAgICBpZiAobm9kZS5hdHRyUGFyYW1zWydkdHlwZSddICYmIG5vZGUuYXR0clBhcmFtc1snZHR5cGUnXS52YWx1ZSkge1xuICAgICAgICB1dGlsLmFzc2VydChcbiAgICAgICAgICAgIGlucHV0LmR0eXBlID09PSBub2RlLmF0dHJQYXJhbXNbJ2R0eXBlJ10udmFsdWUgYXMgc3RyaW5nLFxuICAgICAgICAgICAgKCkgPT4gYFRoZSBkdHlwZSBvZiBkaWN0Wycke25vZGUubmFtZX0nXSBwcm92aWRlZCBpbiBgICtcbiAgICAgICAgICAgICAgICBgbW9kZWwuZXhlY3V0ZShkaWN0KSBtdXN0IGJlIGAgK1xuICAgICAgICAgICAgICAgIGAke25vZGUuYXR0clBhcmFtc1snZHR5cGUnXS52YWx1ZX0sIGJ1dCB3YXMgJHtpbnB1dC5kdHlwZX1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgbWFwSW5wdXRzKGlucHV0czogTmFtZWRUZW5zb3JNYXApIHtcbiAgICBjb25zdCByZXN1bHQ6IE5hbWVkVGVuc29yTWFwID0ge307XG4gICAgZm9yIChjb25zdCBpbnB1dE5hbWUgaW4gaW5wdXRzKSB7XG4gICAgICBjb25zdCB0ZW5zb3IgPSB0aGlzLl9zaWduYXR1cmUgPy5pbnB1dHMgPy5baW5wdXROYW1lXTtcbiAgICAgIGlmICh0ZW5zb3IgIT0gbnVsbCkge1xuICAgICAgICByZXN1bHRbdGVuc29yLm5hbWVdID0gaW5wdXRzW2lucHV0TmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbaW5wdXROYW1lXSA9IGlucHV0c1tpbnB1dE5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0lucHV0cyhpbnB1dHM6IE5hbWVkVGVuc29yTWFwKSB7XG4gICAgY29uc3Qgbm90SW5HcmFwaCA9IE9iamVjdC5rZXlzKGlucHV0cykuZmlsdGVyKG5hbWUgPT4ge1xuICAgICAgY29uc3QgW25vZGVOYW1lXSA9IHBhcnNlTm9kZU5hbWUobmFtZSk7XG4gICAgICByZXR1cm4gdGhpcy5ncmFwaC5ub2Rlc1tub2RlTmFtZV0gPT0gbnVsbDtcbiAgICB9KTtcbiAgICBpZiAobm90SW5HcmFwaC5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFRoZSBkaWN0IHByb3ZpZGVkIGluIG1vZGVsLmV4ZWN1dGUoZGljdCkgaGFzIGAgK1xuICAgICAgICAgIGBrZXlzOiBbJHtub3RJbkdyYXBofV0gdGhhdCBhcmUgbm90IHBhcnQgb2YgZ3JhcGhgKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG1hcE91dHB1dHMob3V0cHV0czogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gb3V0cHV0cy5tYXAobmFtZSA9PiB7XG4gICAgICBjb25zdCB0ZW5zb3IgPSB0aGlzLl9zaWduYXR1cmUgPy5vdXRwdXRzID8uW25hbWVdO1xuICAgICAgaWYgKHRlbnNvciAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0ZW5zb3IubmFtZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYW1lO1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tPdXRwdXRzKG91dHB1dHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgb3V0cHV0cy5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgY29uc3QgW25vcm1hbGl6ZWROYW1lXSA9IHBhcnNlTm9kZU5hbWUobmFtZSk7XG4gICAgICBpZiAoIXRoaXMuZ3JhcGgubm9kZXNbbm9ybWFsaXplZE5hbWVdKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIG91dHB1dCAnJHtuYW1lfScgaXMgbm90IGZvdW5kIGluIHRoZSBncmFwaGApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=