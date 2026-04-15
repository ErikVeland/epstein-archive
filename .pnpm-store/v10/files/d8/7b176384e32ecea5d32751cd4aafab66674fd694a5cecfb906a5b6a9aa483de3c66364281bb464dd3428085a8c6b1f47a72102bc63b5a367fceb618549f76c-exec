/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/* Original source: keras/engine/topology.py */
import { tidy } from '@tensorflow/tfjs-core';
import { getUid } from '../backend/state';
import { NotImplementedError, RuntimeError, ValueError } from '../errors';
import { deserialize as deserializeLayer } from '../layers/serialization';
import * as generic_utils from '../utils/generic_utils';
import { convertTsToPythonic } from '../utils/serialization_utils';
import * as types_utils from '../utils/types_utils';
import { batchSetValue } from '../variables';
import { version as layersVersion } from '../version';
import { execute, FeedDict } from './executor';
import { InputLayer } from './input_layer';
import { Layer, Node } from './topology';
// get weights key from tensor map in order to check if it is from keras v3.
// e.g. dense/0
const isKerasSavedModelFormat = (weights) => {
    const keys = Object.keys(weights);
    if (keys.length === 0) {
        return false;
    }
    const key = keys[0].split('/');
    return !isNaN(parseInt(key[key.length - 1], 10));
};
/**
 * A Container is a directed acyclic graph of layers.
 *
 * It is the topological form of a "model". A LayersModel
 * is simply a Container with added training routines.
 *
 */
export class Container extends Layer {
    constructor(args) {
        // No args passed to super's constructor.
        super({});
        this.containerNodes = new Set();
        this.name = args.name;
        if (this.name == null) {
            const prefix = this.getClassName().toLowerCase();
            this.name = getUid(prefix);
        }
        this.supportsMasking = false;
        this.trainable_ = true;
        // TODO(michaelterry): Initialize perInputLosses/Updates here.
        // Container-specific properties.
        if (Array.isArray(args.inputs)) {
            this.inputs = args.inputs.slice();
        }
        else {
            this.inputs = [args.inputs];
        }
        if (Array.isArray(args.outputs)) {
            this.outputs = args.outputs.slice();
        }
        else {
            this.outputs = [args.outputs];
        }
        // Check for redundancy in inputs.
        if (generic_utils.unique(this.inputs).length !== this.inputs.length) {
            throw new ValueError('The list of inputs passed to the model is ' +
                'redundant. All inputs should only appear once. Found: ' +
                `${this.inputs.map(x => x.name)}`);
        }
        // Check for redundancy in outputs.
        if (generic_utils.unique(this.outputs).length !== this.outputs.length) {
            console.warn('The list of outputs passed to the model is redundant. ' +
                'All outputs should only appear once. Found: ' +
                `${this.outputs.map(x => x.name)}`);
        }
        /*
          List of initial layers (1 to 1 mapping with this.inputs, hence the same
          layer might appear twice)
        */
        this.inputLayers = [];
        this.inputLayersNodeIndices = [];
        this.inputLayersTensorIndices = [];
        /*
          List of layers (1 to 1 mapping with this.outputs, hence the same layer
          might appear twice)
        */
        this.outputLayers = [];
        this.outputLayersNodeIndices = [];
        this.outputLayersTensorIndices = [];
        /*
          All layers in order of horizontal graph traversal. Entries are unique.
          Includes input and output layers.
        */
        this.layers = [];
        /*
          References to container layers that were constructed internally. We need
          these to properly dispose of tensors from nested containers.
        */
        this.internalContainerRefs = [];
        // TODO(michaelterry): Determine if caching still needed with eager
        // backend.
        /*
          This is for performance optimization when calling the Container on new
          inputs. Every time the Container is called on a set on input tensors,
          we compute the output tensors, output masks and output shapes in one pass,
          then cache them here. When one of these outputs is queried later,
          we retrieve it from there instead of recomputing it.
        */
        // this.outputTensorCache = {};
        // this.outputShapeCache = {};
        // Build this.outputLayers:
        for (const x of this.outputs) {
            const layer = x.sourceLayer;
            const nodeIndex = x.nodeIndex;
            const tensorIndex = x.tensorIndex;
            this.outputLayers.push(layer);
            this.outputLayersNodeIndices.push(nodeIndex);
            this.outputLayersTensorIndices.push(tensorIndex);
        }
        // TODO(michaelterry): Add output mask cache code.
        // Build this.inputLayers:
        for (const x of this.inputs) {
            const layer = x.sourceLayer;
            const nodeIndex = x.nodeIndex;
            const tensorIndex = x.tensorIndex;
            /*
              It's supposed to be an input layer, so only one node
              and one tensor output.
            */
            generic_utils.assert(nodeIndex === 0, 'input layer has >1 nodes');
            generic_utils.assert(tensorIndex === 0, 'input layer has >1 tensors');
            this.inputLayers.push(layer);
            this.inputLayersNodeIndices.push(nodeIndex);
            this.inputLayersTensorIndices.push(tensorIndex);
        }
        // Build this.inputNames and this.outputNames.
        this.inputNames = [];
        this.outputNames = [];
        this.feedInputShapes = [];
        this.feedInputNames = [];
        this.feedOutputNames = [];
        for (let i = 0; i < this.inputLayers.length; i++) {
            const layer = this.inputLayers[i];
            // Check that layer is an InputLayer.
            if (!(layer instanceof InputLayer)) {
                throw new TypeError('Input layers to a LayersModel must be InputLayer objects. ' +
                    `Received inputs: ${args.inputs}. ` +
                    `Input ${i} (0-based) originates ` +
                    `from layer type ${layer.getClassName()}.`);
            }
            this.inputNames.push(layer.name);
            this.feedInputShapes.push(layer.batchInputShape);
            this.feedInputNames.push(layer.name);
        }
        for (const layer of this.outputLayers) {
            this.outputNames.push(layer.name);
        }
        this.internalInputShapes = this.inputs.map(x => x.shape);
        this.internalOutputShapes = this.outputs.map(x => x.shape);
        /*
          Container_nodes: set of nodes included in the graph (not all nodes
          included in the layers are relevant to the current graph).
        */
        // ids of all nodes relevant to the Container:
        const nodesDepths = {};
        // To recover nodes from their ID.
        const nodeIDToNode = {};
        const layersDepths = {};
        // To layers from their ID.
        const layerIDToLayer = {};
        const layerIndices = {};
        const nodesInDecreasingDepth = [];
        /**
         * Builds a map of the graph of layers.
         *
         * This recursively updates the map `layerIndices`,
         * the list `nodesInDecreasingDepth` and the set `containerNodes`.
         *
         * @param tensor Some tensor in a graph.
         * @param finishedNodes Set of nodes whose subgraphs have been traversed
         *         completely. Useful to prevent duplicated work.
         * @param nodesInProgress Set of nodes that are currently active on the
         *         recursion stack. Useful to detect cycles.
         * @param layer Layer from which `tensor` comes from. If not provided,
         *   will be obtained from tensor.sourceLayer.
         * @param nodeIndex Node index from which `tensor` comes from.
         * @param tensorIndex TensorIndex from which `tensor` comes from.
         *
         * @exception RuntimeError if a cycle is detected.
         */
        const buildMapOfGraph = (tensor, finishedNodes, nodesInProgress, layer, nodeIndex, tensorIndex) => {
            if (layer == null || nodeIndex == null || tensorIndex == null) {
                layer = tensor.sourceLayer;
                nodeIndex = tensor.nodeIndex;
                tensorIndex = tensor.tensorIndex;
            }
            const node = layer.inboundNodes[nodeIndex];
            // Prevent cycles.
            if (nodesInProgress.indexOf(node) !== -1) {
                throw new RuntimeError(`The tensor ${tensor.name} at layer "${layer.name}" ` +
                    'is part of a cycle.');
            }
            // Don't repeat work for shared subgraphs
            if (finishedNodes.indexOf(node) !== -1) {
                return;
            }
            // Update containerNodes.
            this.containerNodes.add(Container.nodeKey(layer, nodeIndex));
            // Store the traversal order for layer sorting.
            if (!(layer.id in layerIndices)) {
                layerIndices[layer.id] = Object.keys(layerIndices).length;
            }
            if (nodesInProgress.indexOf(node) === -1) {
                nodesInProgress.push(node);
            }
            // Propagate to all previous tensors connected to this node.
            const numInboundLayers = node.inboundLayers.length;
            for (let i = 0; i < numInboundLayers; i++) {
                const x = node.inputTensors[i];
                const layer = node.inboundLayers[i];
                const nodeIndex = node.nodeIndices[i];
                const tensorIndex = node.tensorIndices[i];
                buildMapOfGraph(x, finishedNodes, nodesInProgress, layer, nodeIndex, tensorIndex);
            }
            finishedNodes.push(node);
            while (nodesInProgress.indexOf(node) >= 0) {
                nodesInProgress.splice(nodesInProgress.indexOf(node), 1);
            }
            nodesInDecreasingDepth.push(node);
        };
        const finishedNodes = [];
        const nodesInProgress = [];
        for (const x of this.outputs) {
            buildMapOfGraph(x, finishedNodes, nodesInProgress);
        }
        const reversedNodesInDecreasingDepth = nodesInDecreasingDepth.slice().reverse();
        for (const node of reversedNodesInDecreasingDepth) {
            nodeIDToNode[node.id] = node;
            // If the depth is not set, the node has no outbound nodes (depth 0).
            if (!(node.id in nodesDepths)) {
                nodesDepths[node.id] = 0;
            }
            let depth = nodesDepths[node.id];
            // Update the depth of the corresponding layer
            const previousDepth = (layersDepths[node.outboundLayer.id] == null ?
                0 :
                layersDepths[node.outboundLayer.id]);
            /*
              If we've seen this layer before at a higher depth, we should use that
              depth instead of the node depth.  This is necessary for shared layers
              that have inputs at different depth levels in the graph.
            */
            depth = Math.max(depth, previousDepth);
            layersDepths[node.outboundLayer.id] = depth;
            layerIDToLayer[node.outboundLayer.id] = node.outboundLayer;
            nodesDepths[node.id] = depth;
            // Update the depth of inbound nodes.
            for (let i = 0; i < node.inboundLayers.length; i++) {
                const inboundLayer = node.inboundLayers[i];
                const nodeIndex = node.nodeIndices[i];
                const inboundNode = inboundLayer.inboundNodes[nodeIndex];
                const previousDepth = (nodesDepths[inboundNode.id] == null ? 0 :
                    nodesDepths[inboundNode.id]);
                nodesDepths[inboundNode.id] = Math.max(depth + 1, previousDepth);
                nodeIDToNode[inboundNode.id] = inboundNode;
            }
        }
        // Build a dict {depth: list of nodes with this depth}
        const nodesByDepth = {};
        for (const nodeID in nodesDepths) {
            const depth = nodesDepths[nodeID];
            if (!(depth in nodesByDepth)) {
                nodesByDepth[depth] = [];
            }
            nodesByDepth[depth].push(nodeIDToNode[nodeID]);
        }
        // Build a dict {depth: list of layers with this depth}
        const layersByDepth = {};
        for (const layerID in layersDepths) {
            const depth = layersDepths[layerID];
            if (!(depth in layersByDepth)) {
                layersByDepth[depth] = [];
            }
            layersByDepth[depth].push(layerIDToLayer[layerID]);
        }
        // Get sorted list of layer depths.
        let depthKeys = Object.keys(layersByDepth)
            .map(x => parseInt(x, 10))
            .sort(generic_utils.reverseNumberCompare);
        // Set this.layers and this.layersByDepth.
        this.layers = [];
        for (const depth of depthKeys) {
            const layersForDepth = layersByDepth[depth];
            // Container.layers needs to have a deterministic order:
            // here we order them by traversal order.
            layersForDepth.sort((a, b) => {
                const aIndex = layerIndices[a.id];
                const bIndex = layerIndices[b.id];
                if (aIndex < bIndex) {
                    return -1;
                }
                if (aIndex > bIndex) {
                    return 1;
                }
                return 0;
            });
            for (const layer of layersForDepth) {
                if (layer instanceof Container) {
                    this.internalContainerRefs.push(layer);
                }
                this.layers.push(layer);
            }
        }
        this.layersByDepth = layersByDepth;
        // Get sorted list of node depths;
        depthKeys = Object.keys(nodesByDepth)
            .map(x => parseInt(x, 10))
            .sort(generic_utils.reverseNumberCompare);
        // Check that all tensors required are computable.
        // computable_tensors: all tensors in the graph
        // that can be computed from the inputs provided.
        const computableTensors = this.inputs.slice();
        // To provide a better error msg.
        const layersWithCompleteInput = [];
        for (const depth of depthKeys) {
            for (const node of nodesByDepth[depth]) {
                const layer = node.outboundLayer;
                if (layer != null) {
                    for (const x of node.inputTensors) {
                        if (computableTensors.indexOf(x) === -1) {
                            throw new RuntimeError(`Graph disconnected: cannot obtain value for tensor ${x}` +
                                ` at layer "${layer.name}". ` +
                                'The following previous layers were accessed without ' +
                                `issue: ${layersWithCompleteInput}`);
                        }
                    }
                    for (const x of node.outputTensors) {
                        computableTensors.push(x);
                    }
                    layersWithCompleteInput.push(layer.name);
                }
            }
        }
        // Set this.containerNodes and this.nodesByDepth.
        this.nodesByDepth = nodesByDepth;
        // Ensure name unicity, which will be crucial for serialization
        // (since serialized nodes refer to layers by their name).
        const allNames = this.layers.map(x => x.name);
        for (const name of allNames) {
            const numOccurrences = allNames.filter(x => x === name).length;
            if (numOccurrences !== 1) {
                throw new RuntimeError(`The name "${name}" is used ${numOccurrences} times ` +
                    'in the model. All layer names should be unique. Layer names: ' +
                    JSON.stringify(allNames));
            }
        }
        // Layer parameters.
        // The new container starts with a single inbound node
        // for its inputs, and no outbound nodes.
        // Will be appended to by future calls to apply().
        this.outboundNodes = [];
        // Will be appended to below, and by future calls to apply().
        this.inboundNodes = [];
        // Create the node linking internal inputs to internal outputs.
        // (This call has side effects.)
        // tslint:disable-next-line:no-unused-expression
        new Node({
            outboundLayer: this,
            inboundLayers: [],
            nodeIndices: [],
            tensorIndices: [],
            inputTensors: this.inputs,
            outputTensors: this.outputs,
            inputMasks: this.inputs.map(x => null),
            outputMasks: this.outputs.map(x => null),
            inputShapes: this.inputs.map(x => x.shape),
            outputShapes: this.outputs.map(x => x.shape)
        });
        this.built = true;
        this._refCount = 1; // The ref count of a container always start at 1.
    }
    assertNotDisposed() {
        if (this._refCount === 0) {
            throw new Error(`Container '${this.name}' is already disposed.`);
        }
    }
    /**
     * Attempt to dispose a LayersModel's weights.
     *
     * This method decrease the reference count of the LayersModel object by 1.
     *
     * A LayersModel is reference-counted. Its reference count is incremented by 1
     * when it is first constructed and when it is used as a Layer of another
     * LayersModel.
     *
     * If the reference count of a LayersModel becomes 0, the `dispose` method of
     * all its constituent `Layer`s will be called.
     *
     * Note: If the reference count is greater than 0 after the decrement, the
     * `dispose` method of its constituent `Layer`s will *not* be called.
     *
     * After a LayersModel is disposed, it cannot be used in calls such as
     * 'predict`, `evaluate` or `fit` anymore.
     *
     * @returns A DisposeResult Object with the following fields:
     *   - refCountAfterDispose: The reference count of the LayersModel after this
     *     `dispose()` call.
     *   - numDisposedVariables: Number of `tf.Variable`s (i.e., weights) disposed
     *     during this `dispose()` call.
     * @throws {Error} If the layer is not built yet, or if the LayersModel has
     *   already been disposed.
     */
    dispose() {
        this.assertNotDisposed();
        const result = { refCountAfterDispose: null, numDisposedVariables: 0 };
        if (--this._refCount === 0) {
            for (const layer of this.layers) {
                result.numDisposedVariables += layer.dispose().numDisposedVariables;
            }
            // Call dispose on each internally created container layer again to ensure
            // their refCounts hit zero and their tensors are subsequently deleted.
            for (const container of this.internalContainerRefs) {
                result.numDisposedVariables += container.dispose().numDisposedVariables;
            }
        }
        result.refCountAfterDispose = this._refCount;
        return result;
    }
    get trainable() {
        return this.trainable_;
    }
    set trainable(trainable) {
        this.layers.forEach(layer => {
            // tslint:disable-next-line:no-any
            layer._trainableWeights
                .forEach(w => w.trainable = trainable);
        });
        this.trainable_ = trainable;
    }
    get trainableWeights() {
        // Porting Note: This check below is to prevent errors where the
        //   _trainableWeights inherited from the parent class (Layer) gets
        //   inadvertently used.
        if (this._trainableWeights.length > 0) {
            throw new ValueError('Container instance unexpectedly contains _trainableWeights.' +
                'The trainable weights of a Container are a union of the ' +
                'trainable weights of its consituent Layers. Its own ' +
                '_trainableWeights must remain an empty Array.');
        }
        if (!this.trainable) {
            return [];
        }
        let weights = [];
        for (const layer of this.layers) {
            weights = weights.concat(layer.trainableWeights);
        }
        return weights;
    }
    get nonTrainableWeights() {
        const weights = [];
        for (const layer of this.layers) {
            weights.push(...layer.nonTrainableWeights);
        }
        if (!this.trainable) {
            const trainableWeights = [];
            for (const layer of this.layers) {
                trainableWeights.push(...layer.trainableWeights);
            }
            return trainableWeights.concat(weights);
        }
        return weights;
    }
    get weights() {
        return this.trainableWeights.concat(this.nonTrainableWeights);
    }
    /**
     * Loads all layer weights from a JSON object.
     *
     * Porting Note: HDF5 weight files cannot be directly loaded in JavaScript /
     *   TypeScript. The utility script at `scripts/pykeras.py` offers means
     *   to convert them into JSON strings compatible with this method.
     * Porting Note: TensorFlow.js Layers supports only loading by name currently.
     *
     * @param weights A JSON mapping weight names to weight values as nested
     *   arrays of numbers, or a `NamedTensorMap`, i.e., a JSON mapping weight
     *   names to `tf.Tensor` objects.
     * @param strict Require that the provided weights exactly match those
     *   required by the container.  Default: `true`.  Passing `false` means that
     *   extra weights and missing weights will be silently ignored.
     */
    loadWeights(weights, strict = true) {
        const nameToWeight = {};
        let totalWeightsCount = 0;
        const modelIsKerasSavedModelFormat = isKerasSavedModelFormat(weights);
        if (modelIsKerasSavedModelFormat) {
            this.parseWeights(weights);
        }
        // Check if weights from keras v3.
        for (const layer of this.layers) {
            for (const [index, weight] of layer.weights.entries()) {
                // Parse the name to layerName/index.
                // e.g. dense/0, dense/1, dense_1/0, dense_1/1
                const parsedName = modelIsKerasSavedModelFormat ?
                    `${weight.name.split('/').slice(0, -1).join('/') + '/'}${index}` :
                    weight.originalName;
                if (nameToWeight[parsedName] != null) {
                    throw new ValueError(`Duplicate weight name: ${parsedName}`);
                }
                nameToWeight[parsedName] = weight;
                totalWeightsCount++;
            }
        }
        const weightValueTuples = [];
        for (const name in weights) {
            // TF 2.2.0 added cell name to the weight name in the format of
            // layer_name/cell_name/weight_name, we need to remove
            // the inner cell name.
            let validatedName = name;
            if (nameToWeight[name] == null) {
                const tokens = name.split('/');
                const shortenNameArray = tokens.slice(0, -2).concat([tokens[tokens.length - 1]]);
                validatedName = shortenNameArray.join('/');
            }
            if (nameToWeight[validatedName] != null) {
                weightValueTuples.push([nameToWeight[validatedName], weights[name]]);
            }
            else if (strict) {
                throw new ValueError(`Provided weight data has no target variable: ${name}`);
            }
            delete nameToWeight[validatedName];
        }
        if (strict) {
            // Check that all weights are set.
            const unsetNames = [];
            for (const name in nameToWeight) {
                unsetNames.push(name);
            }
            if (unsetNames.length > 0) {
                throw new ValueError(`${unsetNames.length} of ${totalWeightsCount} weights are not set: ` +
                    `${unsetNames}`);
            }
        }
        batchSetValue(weightValueTuples);
    }
    parseWeights(weights) {
        for (const key in Object.keys(weights)) {
            const listParts = key.split('/');
            const list = ['vars', 'layer_checkpoint_dependencies'];
            // For keras v3, the weights name are saved based on the folder structure.
            // e.g. _backbone/_layer_checkpoint_dependencies/transformer/_self../
            // _output_dense/vars/0
            // Therefore we discard the `vars` and `layer_checkpoint_depencies` within
            // the saved name and only keeps the layer name and weights.
            // This can help to mapping the actual name of the layers and load each
            // weight accordingly.
            const newKey = listParts
                .map(str => {
                if (str.startsWith('_')) {
                    return str.slice(1);
                }
                return str;
            })
                .filter(str => !list.includes(str))
                .join('/');
            if (newKey !== key) {
                weights[newKey] = weights[key];
                delete weights[key];
            }
        }
    }
    /**
     * Util shared between different serialization methods.
     * @returns LayersModel config with Keras version information added.
     */
    updatedConfig() {
        const theConfig = this.getConfig();
        const modelConfig = {};
        modelConfig['className'] = this.getClassName();
        modelConfig['config'] = theConfig;
        modelConfig['kerasVersion'] = `tfjs-layers ${layersVersion}`;
        // TODO(nielsene): Replace something like K.backend() once
        // possible.
        modelConfig['backend'] = 'TensorFlow.js';
        return modelConfig;
    }
    /**
     * Returns a JSON string containing the network configuration.
     *
     * To load a network from a JSON save file, use
     * models.modelFromJSON(jsonString);
     * @param extraJsonArgs Unused in tfjs-layers, maintained for PyKeras
     * @param returnString Whether the return value should be stringified
     *    (default: `true`).
     * @returns a JSON string if `returnString` (default), or a JSON object if
     *   `!returnString`.
     */
    // tslint:disable-next-line:no-any
    toJSON(unused, returnString = true) {
        const modelConfig = convertTsToPythonic(this.updatedConfig());
        return returnString ? JSON.stringify(modelConfig) : modelConfig;
    }
    /**
     * Call the model on new inputs.
     *
     * In this case `call` just reapplies all ops in the graph to the new inputs
     * (e.g. build a new computational graph from the provided inputs).
     *
     * @param inputs A tensor or list of tensors.
     * @param mask A mask or list of masks. A mask can be either a tensor or null
     *   (no mask).
     *
     * @return A tensor if there is a single output, or a list of tensors if there
     *   are more than one outputs.
     */
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = generic_utils.toList(inputs);
            const feedDict = new FeedDict();
            for (let i = 0; i < this.inputs.length; ++i) {
                feedDict.add(this.inputs[i], inputs[i]);
            }
            return execute(this.outputs, feedDict, kwargs);
        });
    }
    /**
     * Computes an output mask tensor.
     *
     * @param inputs Tensor or list of tensors.
     * @param mask Tensor or list of tensors.
     *
     * @return null or a tensor (or list of tensors, one per output tensor of the
     * layer).
     */
    computeMask(inputs, mask) {
        return tidy(() => {
            inputs = generic_utils.toList(inputs);
            let masks;
            if (mask == null) {
                masks = generic_utils.pyListRepeat(null, inputs.length);
            }
            else {
                masks = generic_utils.toList(mask);
            }
            // TODO(michaelterry): Add support for mask caching.
            return this.runInternalGraph(inputs, masks)[1];
        });
    }
    /**
     * Computes the output shape of the layer.
     *
     * Assumes that the layer will be built to match that input shape provided.
     *
     * @param inputShape A shape (tuple of integers) or a list of shape tuples
     *   (one per output tensor of the layer). Shape tuples can include null for
     *   free dimensions, instead of an integer.
     */
    computeOutputShape(inputShape) {
        const inputShapes = types_utils.normalizeShapeList(inputShape);
        if (inputShapes.length !== this.inputLayers.length) {
            throw new ValueError(`Invalid inputShape argument ${inputShape}: ` +
                `model has ${this.inputLayers.length} tensor inputs.`);
        }
        // TODO(michaelterry): Add caching
        const layersToOutputShapes = {};
        for (let i = 0; i < inputShapes.length; i++) {
            const layer = this.inputLayers[i];
            const inputShape = inputShapes[i];
            // It's an input layer: computeOutputShape is identity,
            // and there is only one node and one tensor output.
            const shapeKey = layer.name + '_0_0';
            layersToOutputShapes[shapeKey] = inputShape;
        }
        const depthKeys = Object.keys(this.nodesByDepth)
            .map(x => parseInt(x, 10))
            .sort(generic_utils.reverseNumberCompare);
        // Iterate over nodes, by depth level.
        if (depthKeys.length > 1) {
            for (const depth of depthKeys) {
                const nodes = this.nodesByDepth[depth];
                for (const node of nodes) {
                    // This is always a single layer, never a list.
                    const layer = node.outboundLayer;
                    if (this.inputLayers.map(x => x.id).indexOf(layer.id) !== -1) {
                        // We've already covered the input layers a few lines above.
                        continue;
                    }
                    // Potentially redundant list, same size of node.inputTensors.
                    const inputShapes = [];
                    for (let j = 0; j < node.inboundLayers.length; j++) {
                        const inboundLayer = node.inboundLayers[j];
                        const nodeIndex = node.nodeIndices[j];
                        const tensorIndex = node.tensorIndices[j];
                        const shapeKey = `${inboundLayer.name}_${nodeIndex}_${tensorIndex}`;
                        const inputShape = layersToOutputShapes[shapeKey];
                        inputShapes.push(inputShape);
                    }
                    const outputShape = layer.computeOutputShape(generic_utils.singletonOrArray(inputShapes));
                    const outputShapes = types_utils.normalizeShapeList(outputShape);
                    const nodeIndex = layer.inboundNodes.indexOf(node);
                    for (let j = 0; j < outputShapes.length; j++) {
                        const shapeKey = `${layer.name}_${nodeIndex}_${j}`;
                        layersToOutputShapes[shapeKey] = outputShapes[j];
                    }
                }
            }
        }
        // Read final output shapes from layersToOutputShapes.
        const outputShapes = [];
        const outputShapeKeys = [];
        for (let i = 0; i < this.outputLayers.length; i++) {
            const layer = this.outputLayers[i];
            const nodeIndex = this.outputLayersNodeIndices[i];
            const tensorIndex = this.outputLayersTensorIndices[i];
            const shapeKey = `${layer.name}_${nodeIndex}_${tensorIndex}`;
            outputShapeKeys.push(shapeKey);
        }
        for (let i = 0; i < outputShapeKeys.length; i++) {
            const key = outputShapeKeys[i];
            generic_utils.assert(key in layersToOutputShapes);
            outputShapes.push(layersToOutputShapes[key]);
        }
        // TODO(michaelterry): Update cache
        return generic_utils.singletonOrArray(outputShapes);
    }
    /**
     * Computes output tensors for new inputs.
     *
     * Note:
     *   - Expects `inputs` to be a list (potentially with 1 element).
     *
     * @param inputs List of tensors
     * @param masks List of masks (tensors or null).
     * @return Three lists: outputTensors, outputMasks, outputShapes
     */
    runInternalGraph(inputs, masks) {
        if (masks == null) {
            masks = generic_utils.pyListRepeat(null, inputs.length);
        }
        // Dictionary mapping reference tensors to tuples
        // (computed tensor, compute mask)
        // we assume a 1:1 mapping from tensor to mask
        // TODO: raise exception when a `.computeMask()` call
        // does not return a list the same size as `call`
        const tensorMap = {};
        for (let i = 0; i < this.inputs.length; ++i) {
            const x = this.inputs[i];
            const y = inputs[i];
            const mask = masks[i];
            tensorMap[x.id] = [y, mask];
        }
        const depthKeys = Object.keys(this.nodesByDepth)
            .map(x => parseInt(x, 10))
            .sort(generic_utils.reverseNumberCompare);
        for (const depth of depthKeys) {
            const nodes = this.nodesByDepth[depth];
            for (const node of nodes) {
                // This is always a single layer, never a list.
                const layer = node.outboundLayer;
                const referenceInputTensors = node.inputTensors;
                const referenceOutputTensors = node.outputTensors;
                // If all previous input tensors are available in tensorMap,
                // then call node.inboundLayer on them.
                // List of tuples [input, mask]:
                const computedData = new Array();
                for (const x of referenceInputTensors) {
                    if (x.id in tensorMap) {
                        computedData.push(tensorMap[x.id]);
                    }
                }
                if (computedData.length === referenceInputTensors.length) {
                    // TODO(michaelterry): Add K.name_scope here, if we need it.
                    let kwargs = {};
                    let computedTensors;
                    let computedMasks;
                    let outputTensors;
                    let outputMasks;
                    // call layer
                    if (node.callArgs != null) {
                        kwargs = node.callArgs;
                    }
                    if (computedData.length === 1) {
                        const [computedTensor, computedMask] = computedData[0];
                        if (kwargs['mask'] == null) {
                            kwargs['mask'] = computedMask;
                        }
                        outputTensors =
                            generic_utils.toList(layer.call(computedTensor, kwargs));
                        outputMasks = generic_utils.toList(layer.computeMask(computedTensor, computedMask));
                        computedTensors = [computedTensor];
                        computedMasks = [computedMask];
                    }
                    else {
                        computedTensors = computedData.map(x => x[0]);
                        computedMasks = computedData.map(x => x[1]);
                        if (kwargs['mask'] == null) {
                            kwargs['mask'] = computedMasks;
                        }
                        outputTensors =
                            generic_utils.toList(layer.call(computedTensors, kwargs));
                        outputMasks = generic_utils.toList(layer.computeMask(computedTensors, computedMasks));
                    }
                    if (layer.activityRegularizer) {
                        throw new NotImplementedError('LayersModel invocation with concrete Tensor value(s) in the ' +
                            'presence of activity regularizer(s) is not supported yet.');
                    }
                    // TODO(michaelterry): Add model updates and losses
                    // Update tensor map.
                    for (let i = 0; i < referenceOutputTensors.length; ++i) {
                        const x = referenceOutputTensors[i];
                        const y = outputTensors[i];
                        const mask = outputMasks[i];
                        tensorMap[x.id] = [y, mask];
                    }
                }
            }
        }
        const outputTensors = [];
        const outputMasks = [];
        const outputShapes = [];
        for (const x of this.outputs) {
            generic_utils.assert(x.id in tensorMap, `Could not compute output ${x.name} : ${x.id}`);
            const [tensor, mask] = tensorMap[x.id];
            outputShapes.push(tensor.shape);
            outputTensors.push(tensor);
            outputMasks.push(mask);
        }
        // TODO(michaelterry): Add support for caches.
        return [outputTensors, outputMasks, outputShapes];
    }
    /**
     * Builds a map of internal node keys to node ordering.
     * Used in serializaion a node orderings may change as unused nodes are
     * dropped. Porting Note:  This helper method was pulled out of getConfig to
     * improve readability.
     * @param layers An array of Layers in the model.
     * @returns Map of Node Keys to index order within the layer.
     */
    buildNodeConversionMap(layers) {
        const nodeConversionMap = {};
        let keptNodes;
        for (const layer of this.layers) {
            keptNodes = layer instanceof Container ? 1 : 0;
            for (let originalNodeIndex = 0; originalNodeIndex < layer.inboundNodes.length; originalNodeIndex++) {
                const nodeKey = Container.nodeKey(layer, originalNodeIndex);
                if (this.containerNodes.has(nodeKey)) {
                    // i.e. we mark it to be saved
                    nodeConversionMap[nodeKey] = keptNodes;
                    keptNodes += 1;
                }
            }
        }
        return nodeConversionMap;
    }
    getLayer(nameOrIndex, index) {
        if (index != null) {
            return this.findLayer(index);
        }
        else {
            if (nameOrIndex == null) {
                throw new ValueError('Provide either a layer name or layer index');
            }
            if (typeof nameOrIndex === 'number') {
                return this.findLayer(nameOrIndex);
            }
        }
        for (const layer of this.layers) {
            if (layer.name === nameOrIndex) {
                return layer;
            }
        }
        throw new ValueError(`No such layer: ${nameOrIndex}`);
    }
    findLayer(index) {
        if (this.layers.length <= index) {
            throw new ValueError(`Was asked to retrieve layer at index ${index}, but model only ` +
                `has ${this.layers.length} layer(s).`);
        }
        else {
            return this.layers[index];
        }
    }
    /**
     * Retrieves the Container's current loss values.
     *
     * Used for regularizers during training.
     */
    calculateLosses() {
        // Porting Node: This is an augmentation to Container.loss in PyKeras.
        //   In PyKeras, Container.loss returns symbolic tensors. Here a concrete
        //   Tensor (specifically Scalar) values are returned. This is due to the
        //   imperative backend.
        return tidy(() => {
            const losses = [];
            for (const layer of this.layers) {
                for (let nodeIndex = 0; nodeIndex < layer.inboundNodes.length; ++nodeIndex) {
                    const nodeKey = Container.nodeKey(layer, nodeIndex);
                    if (this.containerNodes.has(nodeKey)) {
                        losses.push(...layer.calculateLosses());
                    }
                }
            }
            // TODO(cais): Add any unconditional model-level losses?
            return losses;
        });
    }
    getConfig() {
        const config = { name: this.name };
        // Build a map from layer unique name (self._node_key)
        // to the index of the nodes that are saved in the config.
        // Only nodes in container_nodes are saved.
        const nodeConversionMap = this.buildNodeConversionMap(this.layers);
        // Serialize and save the layers in layerConfigs
        const layerConfigs = [];
        for (const layer of this.layers) {
            const layerClassName = layer.getClassName();
            const layerConfig = layer.getConfig();
            const filteredInboundNodes = [];
            for (let originalNodeIndex = 0; originalNodeIndex < layer.inboundNodes.length; originalNodeIndex++) {
                const node = layer.inboundNodes[originalNodeIndex];
                const nodeKey = Container.nodeKey(layer, originalNodeIndex);
                let kwargs = {};
                if (this.containerNodes.has(nodeKey)) {
                    // The node is relevant to the model:
                    // add to filteredInboundNodes.
                    if (node.callArgs) {
                        try {
                            JSON.stringify(node.callArgs);
                            kwargs = node.callArgs;
                        }
                        catch (err) {
                            console.warn(`Layer ${layer.name} was passed ` +
                                `non-serializable keyword arguments: ` +
                                `${node.callArgs}. They will not be included ` +
                                `in the serialized model (and thus will be ` +
                                `missing at deserialization time).`);
                            kwargs = {};
                        }
                    }
                    if (node.inboundLayers.length > 0) {
                        const nodeData = [];
                        for (let i = 0; i < node.inboundLayers.length; i++) {
                            const inboundLayer = node.inboundLayers[i];
                            const nodeIndex = node.nodeIndices[i];
                            const tensorIndex = node.tensorIndices[i];
                            const nodeKey = Container.nodeKey(inboundLayer, nodeIndex);
                            let newNodeIndex = nodeConversionMap[nodeKey];
                            if (newNodeIndex == null) {
                                newNodeIndex = 0;
                            }
                            nodeData.push([inboundLayer.name, newNodeIndex, tensorIndex, kwargs]);
                        }
                        filteredInboundNodes.push(nodeData);
                    }
                }
            }
            const dict = {};
            dict['name'] = layer.name;
            dict['className'] = layerClassName;
            dict['config'] = layerConfig;
            dict['inboundNodes'] = filteredInboundNodes;
            layerConfigs.push(dict);
        }
        config['layers'] = layerConfigs;
        // Gather info about inputs and outputs
        const modelInputs = [];
        for (let i = 0; i < this.inputLayers.length; i++) {
            const layer = this.inputLayers[i];
            const nodeIndex = this.inputLayersNodeIndices[i];
            const nodeKey = Container.nodeKey(layer, nodeIndex);
            if (!this.containerNodes.has(nodeKey)) {
                continue;
            }
            let newNodeIndex = nodeConversionMap[nodeKey];
            if (newNodeIndex === null || newNodeIndex === undefined) {
                newNodeIndex = 0;
            }
            const tensorIndex = this.inputLayersTensorIndices[i];
            modelInputs.push([layer.name, newNodeIndex, tensorIndex]);
        }
        config['inputLayers'] = modelInputs;
        const modelOutputs = [];
        for (let i = 0; i < this.outputLayers.length; i++) {
            const layer = this.outputLayers[i];
            const nodeIndex = this.outputLayersNodeIndices[i];
            const nodeKey = Container.nodeKey(layer, nodeIndex);
            if (!this.containerNodes.has(nodeKey)) {
                continue;
            }
            let newNodeIndex = nodeConversionMap[nodeKey];
            if (newNodeIndex === null || newNodeIndex === undefined) {
                newNodeIndex = 0;
            }
            const tensorIndex = this.outputLayersTensorIndices[i];
            modelOutputs.push([layer.name, newNodeIndex, tensorIndex]);
        }
        config['outputLayers'] = modelOutputs;
        return config;
    }
    /**
     * Instantiates a LayersModel from its config (output of `get_config()`).
     * @param cls the class to create
     * @param config LayersModel config dictionary.
     * @param customObjects An optional dictionary of custom objects.
     * @param fastWeightInit Optional flag to use fast weight initialization
     *   during deserialization. This is applicable to cases in which
     *   the initialization will be immediately overwritten by loaded weight
     *   values. Default: `false`.
     * @returns A LayersModel instance.
     * @throws ValueError: In case of improperly formatted config dict.
     */
    /** @nocollapse */
    static fromConfig(cls, config, customObjects = {}, fastWeightInit = false) {
        // Layer instances created during
        // the graph reconstruction process
        const createdLayers = {};
        // Dictionary mapping layer instances to
        // node data that specifies a layer call.
        // It acts as a queue that maintains any unprocessed
        // layer call until it becomes possible to process it
        // (i.e. until the input tensors to the call all exist).
        const unprocessedNodes = {};
        function addUnprocessedNode(layer, nodeData) {
            if (!(layer.name in unprocessedNodes)) {
                unprocessedNodes[layer.name] = [nodeData];
            }
            else {
                unprocessedNodes[layer.name].push(nodeData);
            }
        }
        function processNode(layer, nodeData) {
            const inputTensors = [];
            let kwargs;
            for (const inputData of nodeData) {
                const inboundLayerName = inputData[0];
                const inboundNodeIndex = inputData[1];
                const inboundTensorIndex = inputData[2];
                kwargs = inputData[3] == null ?
                    {} :
                    inputData[3];
                if (!(inboundLayerName in createdLayers)) {
                    addUnprocessedNode(layer, nodeData);
                    return;
                }
                const inboundLayer = createdLayers[inboundLayerName];
                if (inboundLayer.inboundNodes.length <= inboundNodeIndex) {
                    addUnprocessedNode(layer, nodeData);
                    return;
                }
                const inboundNode = inboundLayer.inboundNodes[inboundNodeIndex];
                inputTensors.push(inboundNode.outputTensors[inboundTensorIndex]);
            }
            // Call layer on its inputs, thus creating the node
            // and building the layer if needed.
            // Note: This has Eager vs Graph Implications.
            if (inputTensors.length > 0) {
                layer.apply(generic_utils.singletonOrArray(inputTensors), kwargs); // was ** kwargs
            }
        }
        /**
         * Deserialize a layer, then call it on appropriate inputs.
         * @param layerData: layer config dict.
         * @throws ValueError: In case of improperly formatted `layer_data`
         * dict.
         */
        function processLayer(layerData) {
            const layerName = layerData['name'];
            // Instantiate layer.
            const layer = deserializeLayer(layerData, config['customObjects'] != null ?
                config['customObjects'] :
                {});
            layer.setFastWeightInitDuringBuild(fastWeightInit);
            createdLayers[layerName] = layer;
            // Gather layer inputs.
            const inboundNodesData = layerData['inboundNodes'];
            inboundNodesData.forEach(nodeData => {
                if (!(nodeData instanceof Array)) {
                    throw new ValueError(`Corrupted configuration, expected array for nodeData: ${nodeData}`);
                }
                // We don't process nodes (i.e. make layer calls)
                // on the fly because the inbound node may not yet exist,
                // in case of layer shared at different topological depths
                // (e.g.a model such as A(B(A(B(x)))))
                addUnprocessedNode(layer, nodeData);
            });
        }
        // First, we create all layers and enqueue nodes to be processed.
        const name = config['name'];
        const layersFromConfig = config['layers'];
        for (const layerData of layersFromConfig) {
            processLayer(layerData);
        }
        // Then we process nodes in order of layer depth.
        // Nodes that cannot yet be processed(if the inbound node
        // does not yet exist) are re - enqueued, and the process
        // is repeated until all nodes are processed.
        while (!generic_utils.isObjectEmpty(unprocessedNodes)) {
            for (const layerData of layersFromConfig) {
                const layer = createdLayers[layerData['name']];
                if (layer.name in unprocessedNodes) {
                    const currentUnprocessedNodesForLayer = unprocessedNodes[layer.name];
                    delete unprocessedNodes[layer.name];
                    for (const nodeData of currentUnprocessedNodesForLayer) {
                        processNode(layer, nodeData);
                    }
                }
            }
        }
        const inputTensors = [];
        const outputTensors = [];
        const inputLayersFromConfig = config['inputLayers'];
        for (const layerData of inputLayersFromConfig) {
            const layerName = layerData[0];
            const nodeIndex = layerData[1];
            const tensorIndex = layerData[2];
            generic_utils.assert(layerName in createdLayers);
            const layer = createdLayers[layerName];
            const layerOutputTensors = layer.inboundNodes[nodeIndex].outputTensors;
            inputTensors.push(layerOutputTensors[tensorIndex]);
        }
        const outputLayersFromConfig = config['outputLayers'];
        for (const layerData of outputLayersFromConfig) {
            const layerName = layerData[0];
            const nodeIndex = layerData[1];
            const tensorIndex = layerData[2];
            generic_utils.assert(layerName in createdLayers);
            const layer = createdLayers[layerName];
            const layerOutputTensors = layer.inboundNodes[nodeIndex].outputTensors;
            outputTensors.push(layerOutputTensors[tensorIndex]);
        }
        return new cls({ inputs: inputTensors, outputs: outputTensors, name });
    }
    /**
     * Determine whether the container is stateful.
     *
     * Porting Note: this is the equivalent of the stateful @property of
     *   the Container class in PyKeras.
     */
    get stateful() {
        // Porting Note: This check is to prevent inadvertent setting of the
        //   _stateful property of the Container instance.
        if (this._stateful) {
            throw new ValueError('Container instance unexpectedly has _stateful = true. The ' +
                'statefulness of a Container is determined by the Layers it ' +
                'contains. Its _stateful property must remain the default false.');
        }
        for (const layer of this.layers) {
            if (layer.stateful) {
                return true;
            }
        }
        return false;
    }
    /**
     * Reset the state of all stateful constituent layers (if any).
     *
     * Examples of stateful layers include RNN layers whose `stateful` property
     * is set as `true`.
     */
    resetStates() {
        tidy(() => {
            this.layers.forEach(layer => {
                // tslint:disable:no-any
                if (layer.stateful) {
                    layer.resetStates();
                }
                // tslint:enable:no-any
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGFpbmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2VuZ2luZS9jb250YWluZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0dBUUc7QUFFSCwrQ0FBK0M7QUFFL0MsT0FBTyxFQUFnRCxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUUxRixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDeEMsT0FBTyxFQUFDLG1CQUFtQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFJeEUsT0FBTyxFQUFDLFdBQVcsSUFBSSxnQkFBZ0IsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBRXhFLE9BQU8sS0FBSyxhQUFhLE1BQU0sd0JBQXdCLENBQUM7QUFDeEQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sOEJBQThCLENBQUM7QUFDakUsT0FBTyxLQUFLLFdBQVcsTUFBTSxzQkFBc0IsQ0FBQztBQUNwRCxPQUFPLEVBQUMsYUFBYSxFQUFnQixNQUFNLGNBQWMsQ0FBQztBQUMxRCxPQUFPLEVBQUMsT0FBTyxJQUFJLGFBQWEsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVwRCxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUM3QyxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBZ0IsS0FBSyxFQUFFLElBQUksRUFBaUIsTUFBTSxZQUFZLENBQUM7QUFTdEUsNEVBQTRFO0FBQzVFLGVBQWU7QUFDZixNQUFNLHVCQUF1QixHQUFHLENBQUMsT0FBdUIsRUFBVyxFQUFFO0lBQ25FLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtR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Q0FBQyxDQUFDO1NBQ3JEO1FBQ0QsT0FBTyxJQUFJLEdBQUcsQ0FBQyxFQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILElBQWEsUUFBUTtRQUNuQixvRUFBb0U7UUFDcEUsa0RBQWtEO1FBQ2xELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNsQixNQUFNLElBQUksVUFBVSxDQUNoQiw0REFBNEQ7Z0JBQzVELDZEQUE2RDtnQkFDN0QsaUVBQWlFLENBQUMsQ0FBQztTQUN4RTtRQUNELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUMvQixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ00sV0FBVztRQUNsQixJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzFCLHdCQUF3QjtnQkFDeEIsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO29CQUNsQixLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7aUJBQ3JCO2dCQUNELHVCQUF1QjtZQUN6QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyogT3JpZ2luYWwgc291cmNlOiBrZXJhcy9lbmdpbmUvdG9wb2xvZ3kucHkgKi9cblxuaW1wb3J0IHtOYW1lZFRlbnNvck1hcCwgU2NhbGFyLCBzZXJpYWxpemF0aW9uLCBUZW5zb3IsIHRpZHl9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7Z2V0VWlkfSBmcm9tICcuLi9iYWNrZW5kL3N0YXRlJztcbmltcG9ydCB7Tm90SW1wbGVtZW50ZWRFcnJvciwgUnVudGltZUVycm9yLCBWYWx1ZUVycm9yfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHtTaGFwZX0gZnJvbSAnLi4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQge1RlbnNvcktleVdpdGhBcmdzQXJyYXl9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC9ub2RlX2NvbmZpZyc7XG5pbXBvcnQge1B5SnNvbkRpY3R9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC90eXBlcyc7XG5pbXBvcnQge2Rlc2VyaWFsaXplIGFzIGRlc2VyaWFsaXplTGF5ZXJ9IGZyb20gJy4uL2xheWVycy9zZXJpYWxpemF0aW9uJztcbmltcG9ydCB7S3dhcmdzfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBnZW5lcmljX3V0aWxzIGZyb20gJy4uL3V0aWxzL2dlbmVyaWNfdXRpbHMnO1xuaW1wb3J0IHtjb252ZXJ0VHNUb1B5dGhvbmljfSBmcm9tICcuLi91dGlscy9zZXJpYWxpemF0aW9uX3V0aWxzJztcbmltcG9ydCAqIGFzIHR5cGVzX3V0aWxzIGZyb20gJy4uL3V0aWxzL3R5cGVzX3V0aWxzJztcbmltcG9ydCB7YmF0Y2hTZXRWYWx1ZSwgTGF5ZXJWYXJpYWJsZX0gZnJvbSAnLi4vdmFyaWFibGVzJztcbmltcG9ydCB7dmVyc2lvbiBhcyBsYXllcnNWZXJzaW9ufSBmcm9tICcuLi92ZXJzaW9uJztcblxuaW1wb3J0IHtleGVjdXRlLCBGZWVkRGljdH0gZnJvbSAnLi9leGVjdXRvcic7XG5pbXBvcnQge0lucHV0TGF5ZXJ9IGZyb20gJy4vaW5wdXRfbGF5ZXInO1xuaW1wb3J0IHtEaXNwb3NlUmVzdWx0LCBMYXllciwgTm9kZSwgU3ltYm9saWNUZW5zb3J9IGZyb20gJy4vdG9wb2xvZ3knO1xuXG4vKiogQ29uc3RydWN0b3IgY29uZmlnIGZvciBDb250YWluZXIuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnRhaW5lckFyZ3Mge1xuICBpbnB1dHM6IFN5bWJvbGljVGVuc29yfFN5bWJvbGljVGVuc29yW107XG4gIG91dHB1dHM6IFN5bWJvbGljVGVuc29yfFN5bWJvbGljVGVuc29yW107XG4gIG5hbWU/OiBzdHJpbmc7XG59XG5cbi8vIGdldCB3ZWlnaHRzIGtleSBmcm9tIHRlbnNvciBtYXAgaW4gb3JkZXIgdG8gY2hlY2sgaWYgaXQgaXMgZnJvbSBrZXJhcyB2My5cbi8vIGUuZy4gZGVuc2UvMFxuY29uc3QgaXNLZXJhc1NhdmVkTW9kZWxGb3JtYXQgPSAod2VpZ2h0czogTmFtZWRUZW5zb3JNYXApOiBib29sZWFuID0+IHtcbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHdlaWdodHMpO1xuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3Qga2V5ID0ga2V5c1swXS5zcGxpdCgnLycpO1xuICByZXR1cm4gIWlzTmFOKHBhcnNlSW50KGtleVtrZXkubGVuZ3RoIC0gMV0sIDEwKSk7XG59O1xuXG4vKipcbiAqIEEgQ29udGFpbmVyIGlzIGEgZGlyZWN0ZWQgYWN5Y2xpYyBncmFwaCBvZiBsYXllcnMuXG4gKlxuICogSXQgaXMgdGhlIHRvcG9sb2dpY2FsIGZvcm0gb2YgYSBcIm1vZGVsXCIuIEEgTGF5ZXJzTW9kZWxcbiAqIGlzIHNpbXBseSBhIENvbnRhaW5lciB3aXRoIGFkZGVkIHRyYWluaW5nIHJvdXRpbmVzLlxuICpcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbnRhaW5lciBleHRlbmRzIExheWVyIHtcbiAgaW5wdXRzOiBTeW1ib2xpY1RlbnNvcltdO1xuICBvdXRwdXRzOiBTeW1ib2xpY1RlbnNvcltdO1xuXG4gIGlucHV0TGF5ZXJzOiBMYXllcltdO1xuICBpbnB1dExheWVyc05vZGVJbmRpY2VzOiBudW1iZXJbXTtcbiAgaW5wdXRMYXllcnNUZW5zb3JJbmRpY2VzOiBudW1iZXJbXTtcblxuICBvdXRwdXRMYXllcnM6IExheWVyW107XG4gIG91dHB1dExheWVyc05vZGVJbmRpY2VzOiBudW1iZXJbXTtcbiAgb3V0cHV0TGF5ZXJzVGVuc29ySW5kaWNlczogbnVtYmVyW107XG5cbiAgbGF5ZXJzOiBMYXllcltdO1xuICBsYXllcnNCeURlcHRoOiB7W2RlcHRoOiBzdHJpbmddOiBMYXllcltdfTtcbiAgbm9kZXNCeURlcHRoOiB7W2RlcHRoOiBzdHJpbmddOiBOb2RlW119O1xuXG4gIGludGVybmFsQ29udGFpbmVyUmVmczogQ29udGFpbmVyW107XG5cbiAgY29udGFpbmVyTm9kZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IEFkZCBjYWNoZSBzdXBwb3J0XG4gIC8vIHByaXZhdGUgb3V0cHV0TWFza0NhY2hlOiBhbnk7XG4gIC8vIHByaXZhdGUgb3V0cHV0VGVuc29yQ2FjaGU6IGFueTtcbiAgLy8gcHJpdmF0ZSBvdXRwdXRTaGFwZUNhY2hlOiBhbnk7XG5cbiAgaW5wdXROYW1lczogc3RyaW5nW107XG4gIG91dHB1dE5hbWVzOiBzdHJpbmdbXTtcbiAgZmVlZElucHV0U2hhcGVzOiBTaGFwZVtdO1xuXG4gIHByb3RlY3RlZCBpbnRlcm5hbElucHV0U2hhcGVzOiBTaGFwZVtdO1xuICBwcm90ZWN0ZWQgaW50ZXJuYWxPdXRwdXRTaGFwZXM6IFNoYXBlW107XG4gIC8vIFRPRE8oY2Fpcyk6IE1heWJlICdmZWVkJyBzaG91bGQgbm90IGluIHRoZSBuYW1lcyBvZiB0aGVzZSB2YXJpYWJsZXMsXG4gIC8vICAgZHVlIHRvIHRoZSBmYWN0IHRoYXQgb3VyIGJhY2tlbmQgaXMgbm90IHN5bWJvbGljLlxuICBwcm90ZWN0ZWQgZmVlZElucHV0TmFtZXM6IHN0cmluZ1tdO1xuICBwcm90ZWN0ZWQgZmVlZE91dHB1dE5hbWVzOiBzdHJpbmdbXTtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBDb250YWluZXJBcmdzKSB7XG4gICAgLy8gTm8gYXJncyBwYXNzZWQgdG8gc3VwZXIncyBjb25zdHJ1Y3Rvci5cbiAgICBzdXBlcih7fSk7XG4gICAgdGhpcy5uYW1lID0gYXJncy5uYW1lO1xuICAgIGlmICh0aGlzLm5hbWUgPT0gbnVsbCkge1xuICAgICAgY29uc3QgcHJlZml4ID0gdGhpcy5nZXRDbGFzc05hbWUoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgdGhpcy5uYW1lID0gZ2V0VWlkKHByZWZpeCk7XG4gICAgfVxuXG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnRyYWluYWJsZV8gPSB0cnVlO1xuXG4gICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBJbml0aWFsaXplIHBlcklucHV0TG9zc2VzL1VwZGF0ZXMgaGVyZS5cblxuICAgIC8vIENvbnRhaW5lci1zcGVjaWZpYyBwcm9wZXJ0aWVzLlxuICAgIGlmIChBcnJheS5pc0FycmF5KGFyZ3MuaW5wdXRzKSkge1xuICAgICAgdGhpcy5pbnB1dHMgPSBhcmdzLmlucHV0cy5zbGljZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmlucHV0cyA9IFthcmdzLmlucHV0c107XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KGFyZ3Mub3V0cHV0cykpIHtcbiAgICAgIHRoaXMub3V0cHV0cyA9IGFyZ3Mub3V0cHV0cy5zbGljZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm91dHB1dHMgPSBbYXJncy5vdXRwdXRzXTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgcmVkdW5kYW5jeSBpbiBpbnB1dHMuXG4gICAgaWYgKGdlbmVyaWNfdXRpbHMudW5pcXVlKHRoaXMuaW5wdXRzKS5sZW5ndGggIT09IHRoaXMuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ1RoZSBsaXN0IG9mIGlucHV0cyBwYXNzZWQgdG8gdGhlIG1vZGVsIGlzICcgK1xuICAgICAgICAgICdyZWR1bmRhbnQuIEFsbCBpbnB1dHMgc2hvdWxkIG9ubHkgYXBwZWFyIG9uY2UuIEZvdW5kOiAnICtcbiAgICAgICAgICBgJHt0aGlzLmlucHV0cy5tYXAoeCA9PiB4Lm5hbWUpfWApO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciByZWR1bmRhbmN5IGluIG91dHB1dHMuXG4gICAgaWYgKGdlbmVyaWNfdXRpbHMudW5pcXVlKHRoaXMub3V0cHV0cykubGVuZ3RoICE9PSB0aGlzLm91dHB1dHMubGVuZ3RoKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1RoZSBsaXN0IG9mIG91dHB1dHMgcGFzc2VkIHRvIHRoZSBtb2RlbCBpcyByZWR1bmRhbnQuICcgK1xuICAgICAgICAgICdBbGwgb3V0cHV0cyBzaG91bGQgb25seSBhcHBlYXIgb25jZS4gRm91bmQ6ICcgK1xuICAgICAgICAgIGAke3RoaXMub3V0cHV0cy5tYXAoeCA9PiB4Lm5hbWUpfWApO1xuICAgIH1cblxuICAgIC8qXG4gICAgICBMaXN0IG9mIGluaXRpYWwgbGF5ZXJzICgxIHRvIDEgbWFwcGluZyB3aXRoIHRoaXMuaW5wdXRzLCBoZW5jZSB0aGUgc2FtZVxuICAgICAgbGF5ZXIgbWlnaHQgYXBwZWFyIHR3aWNlKVxuICAgICovXG4gICAgdGhpcy5pbnB1dExheWVycyA9IFtdO1xuICAgIHRoaXMuaW5wdXRMYXllcnNOb2RlSW5kaWNlcyA9IFtdO1xuICAgIHRoaXMuaW5wdXRMYXllcnNUZW5zb3JJbmRpY2VzID0gW107XG4gICAgLypcbiAgICAgIExpc3Qgb2YgbGF5ZXJzICgxIHRvIDEgbWFwcGluZyB3aXRoIHRoaXMub3V0cHV0cywgaGVuY2UgdGhlIHNhbWUgbGF5ZXJcbiAgICAgIG1pZ2h0IGFwcGVhciB0d2ljZSlcbiAgICAqL1xuICAgIHRoaXMub3V0cHV0TGF5ZXJzID0gW107XG4gICAgdGhpcy5vdXRwdXRMYXllcnNOb2RlSW5kaWNlcyA9IFtdO1xuICAgIHRoaXMub3V0cHV0TGF5ZXJzVGVuc29ySW5kaWNlcyA9IFtdO1xuICAgIC8qXG4gICAgICBBbGwgbGF5ZXJzIGluIG9yZGVyIG9mIGhvcml6b250YWwgZ3JhcGggdHJhdmVyc2FsLiBFbnRyaWVzIGFyZSB1bmlxdWUuXG4gICAgICBJbmNsdWRlcyBpbnB1dCBhbmQgb3V0cHV0IGxheWVycy5cbiAgICAqL1xuICAgIHRoaXMubGF5ZXJzID0gW107XG5cbiAgICAvKlxuICAgICAgUmVmZXJlbmNlcyB0byBjb250YWluZXIgbGF5ZXJzIHRoYXQgd2VyZSBjb25zdHJ1Y3RlZCBpbnRlcm5hbGx5LiBXZSBuZWVkXG4gICAgICB0aGVzZSB0byBwcm9wZXJseSBkaXNwb3NlIG9mIHRlbnNvcnMgZnJvbSBuZXN0ZWQgY29udGFpbmVycy5cbiAgICAqL1xuICAgIHRoaXMuaW50ZXJuYWxDb250YWluZXJSZWZzID0gW107XG5cbiAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IERldGVybWluZSBpZiBjYWNoaW5nIHN0aWxsIG5lZWRlZCB3aXRoIGVhZ2VyXG4gICAgLy8gYmFja2VuZC5cbiAgICAvKlxuICAgICAgVGhpcyBpcyBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uIHdoZW4gY2FsbGluZyB0aGUgQ29udGFpbmVyIG9uIG5ld1xuICAgICAgaW5wdXRzLiBFdmVyeSB0aW1lIHRoZSBDb250YWluZXIgaXMgY2FsbGVkIG9uIGEgc2V0IG9uIGlucHV0IHRlbnNvcnMsXG4gICAgICB3ZSBjb21wdXRlIHRoZSBvdXRwdXQgdGVuc29ycywgb3V0cHV0IG1hc2tzIGFuZCBvdXRwdXQgc2hhcGVzIGluIG9uZSBwYXNzLFxuICAgICAgdGhlbiBjYWNoZSB0aGVtIGhlcmUuIFdoZW4gb25lIG9mIHRoZXNlIG91dHB1dHMgaXMgcXVlcmllZCBsYXRlcixcbiAgICAgIHdlIHJldHJpZXZlIGl0IGZyb20gdGhlcmUgaW5zdGVhZCBvZiByZWNvbXB1dGluZyBpdC5cbiAgICAqL1xuICAgIC8vIHRoaXMub3V0cHV0VGVuc29yQ2FjaGUgPSB7fTtcbiAgICAvLyB0aGlzLm91dHB1dFNoYXBlQ2FjaGUgPSB7fTtcblxuICAgIC8vIEJ1aWxkIHRoaXMub3V0cHV0TGF5ZXJzOlxuICAgIGZvciAoY29uc3QgeCBvZiB0aGlzLm91dHB1dHMpIHtcbiAgICAgIGNvbnN0IGxheWVyID0geC5zb3VyY2VMYXllcjtcbiAgICAgIGNvbnN0IG5vZGVJbmRleCA9IHgubm9kZUluZGV4O1xuICAgICAgY29uc3QgdGVuc29ySW5kZXggPSB4LnRlbnNvckluZGV4O1xuICAgICAgdGhpcy5vdXRwdXRMYXllcnMucHVzaChsYXllcik7XG4gICAgICB0aGlzLm91dHB1dExheWVyc05vZGVJbmRpY2VzLnB1c2gobm9kZUluZGV4KTtcbiAgICAgIHRoaXMub3V0cHV0TGF5ZXJzVGVuc29ySW5kaWNlcy5wdXNoKHRlbnNvckluZGV4KTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IEFkZCBvdXRwdXQgbWFzayBjYWNoZSBjb2RlLlxuXG4gICAgLy8gQnVpbGQgdGhpcy5pbnB1dExheWVyczpcbiAgICBmb3IgKGNvbnN0IHggb2YgdGhpcy5pbnB1dHMpIHtcbiAgICAgIGNvbnN0IGxheWVyID0geC5zb3VyY2VMYXllcjtcbiAgICAgIGNvbnN0IG5vZGVJbmRleCA9IHgubm9kZUluZGV4O1xuICAgICAgY29uc3QgdGVuc29ySW5kZXggPSB4LnRlbnNvckluZGV4O1xuICAgICAgLypcbiAgICAgICAgSXQncyBzdXBwb3NlZCB0byBiZSBhbiBpbnB1dCBsYXllciwgc28gb25seSBvbmUgbm9kZVxuICAgICAgICBhbmQgb25lIHRlbnNvciBvdXRwdXQuXG4gICAgICAqL1xuICAgICAgZ2VuZXJpY191dGlscy5hc3NlcnQobm9kZUluZGV4ID09PSAwLCAnaW5wdXQgbGF5ZXIgaGFzID4xIG5vZGVzJyk7XG4gICAgICBnZW5lcmljX3V0aWxzLmFzc2VydCh0ZW5zb3JJbmRleCA9PT0gMCwgJ2lucHV0IGxheWVyIGhhcyA+MSB0ZW5zb3JzJyk7XG4gICAgICB0aGlzLmlucHV0TGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgICAgdGhpcy5pbnB1dExheWVyc05vZGVJbmRpY2VzLnB1c2gobm9kZUluZGV4KTtcbiAgICAgIHRoaXMuaW5wdXRMYXllcnNUZW5zb3JJbmRpY2VzLnB1c2godGVuc29ySW5kZXgpO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHRoaXMuaW5wdXROYW1lcyBhbmQgdGhpcy5vdXRwdXROYW1lcy5cbiAgICB0aGlzLmlucHV0TmFtZXMgPSBbXTtcbiAgICB0aGlzLm91dHB1dE5hbWVzID0gW107XG4gICAgdGhpcy5mZWVkSW5wdXRTaGFwZXMgPSBbXTtcbiAgICB0aGlzLmZlZWRJbnB1dE5hbWVzID0gW107XG4gICAgdGhpcy5mZWVkT3V0cHV0TmFtZXMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaW5wdXRMYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5pbnB1dExheWVyc1tpXTtcbiAgICAgIC8vIENoZWNrIHRoYXQgbGF5ZXIgaXMgYW4gSW5wdXRMYXllci5cbiAgICAgIGlmICghKGxheWVyIGluc3RhbmNlb2YgSW5wdXRMYXllcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICdJbnB1dCBsYXllcnMgdG8gYSBMYXllcnNNb2RlbCBtdXN0IGJlIElucHV0TGF5ZXIgb2JqZWN0cy4gJyArXG4gICAgICAgICAgICBgUmVjZWl2ZWQgaW5wdXRzOiAke2FyZ3MuaW5wdXRzfS4gYCArXG4gICAgICAgICAgICBgSW5wdXQgJHtpfSAoMC1iYXNlZCkgb3JpZ2luYXRlcyBgICtcbiAgICAgICAgICAgIGBmcm9tIGxheWVyIHR5cGUgJHtsYXllci5nZXRDbGFzc05hbWUoKX0uYCk7XG4gICAgICB9XG4gICAgICB0aGlzLmlucHV0TmFtZXMucHVzaChsYXllci5uYW1lKTtcbiAgICAgIHRoaXMuZmVlZElucHV0U2hhcGVzLnB1c2gobGF5ZXIuYmF0Y2hJbnB1dFNoYXBlKTtcblxuICAgICAgdGhpcy5mZWVkSW5wdXROYW1lcy5wdXNoKGxheWVyLm5hbWUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMub3V0cHV0TGF5ZXJzKSB7XG4gICAgICB0aGlzLm91dHB1dE5hbWVzLnB1c2gobGF5ZXIubmFtZSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbnRlcm5hbElucHV0U2hhcGVzID0gdGhpcy5pbnB1dHMubWFwKHggPT4geC5zaGFwZSk7XG4gICAgdGhpcy5pbnRlcm5hbE91dHB1dFNoYXBlcyA9IHRoaXMub3V0cHV0cy5tYXAoeCA9PiB4LnNoYXBlKTtcblxuICAgIC8qXG4gICAgICBDb250YWluZXJfbm9kZXM6IHNldCBvZiBub2RlcyBpbmNsdWRlZCBpbiB0aGUgZ3JhcGggKG5vdCBhbGwgbm9kZXNcbiAgICAgIGluY2x1ZGVkIGluIHRoZSBsYXllcnMgYXJlIHJlbGV2YW50IHRvIHRoZSBjdXJyZW50IGdyYXBoKS5cbiAgICAqL1xuICAgIC8vIGlkcyBvZiBhbGwgbm9kZXMgcmVsZXZhbnQgdG8gdGhlIENvbnRhaW5lcjpcbiAgICBjb25zdCBub2Rlc0RlcHRoczoge1tub2RlSUQ6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcbiAgICAvLyBUbyByZWNvdmVyIG5vZGVzIGZyb20gdGhlaXIgSUQuXG4gICAgY29uc3Qgbm9kZUlEVG9Ob2RlOiB7W25vZGVJRDogc3RyaW5nXTogTm9kZX0gPSB7fTtcbiAgICBjb25zdCBsYXllcnNEZXB0aHM6IHtbbGF5ZXJJRDogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuICAgIC8vIFRvIGxheWVycyBmcm9tIHRoZWlyIElELlxuICAgIGNvbnN0IGxheWVySURUb0xheWVyOiB7W2xheWVySUQ6IHN0cmluZ106IExheWVyfSA9IHt9O1xuICAgIGNvbnN0IGxheWVySW5kaWNlczoge1tsYXllcklEOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG4gICAgY29uc3Qgbm9kZXNJbkRlY3JlYXNpbmdEZXB0aDogTm9kZVtdID0gW107XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBtYXAgb2YgdGhlIGdyYXBoIG9mIGxheWVycy5cbiAgICAgKlxuICAgICAqIFRoaXMgcmVjdXJzaXZlbHkgdXBkYXRlcyB0aGUgbWFwIGBsYXllckluZGljZXNgLFxuICAgICAqIHRoZSBsaXN0IGBub2Rlc0luRGVjcmVhc2luZ0RlcHRoYCBhbmQgdGhlIHNldCBgY29udGFpbmVyTm9kZXNgLlxuICAgICAqXG4gICAgICogQHBhcmFtIHRlbnNvciBTb21lIHRlbnNvciBpbiBhIGdyYXBoLlxuICAgICAqIEBwYXJhbSBmaW5pc2hlZE5vZGVzIFNldCBvZiBub2RlcyB3aG9zZSBzdWJncmFwaHMgaGF2ZSBiZWVuIHRyYXZlcnNlZFxuICAgICAqICAgICAgICAgY29tcGxldGVseS4gVXNlZnVsIHRvIHByZXZlbnQgZHVwbGljYXRlZCB3b3JrLlxuICAgICAqIEBwYXJhbSBub2Rlc0luUHJvZ3Jlc3MgU2V0IG9mIG5vZGVzIHRoYXQgYXJlIGN1cnJlbnRseSBhY3RpdmUgb24gdGhlXG4gICAgICogICAgICAgICByZWN1cnNpb24gc3RhY2suIFVzZWZ1bCB0byBkZXRlY3QgY3ljbGVzLlxuICAgICAqIEBwYXJhbSBsYXllciBMYXllciBmcm9tIHdoaWNoIGB0ZW5zb3JgIGNvbWVzIGZyb20uIElmIG5vdCBwcm92aWRlZCxcbiAgICAgKiAgIHdpbGwgYmUgb2J0YWluZWQgZnJvbSB0ZW5zb3Iuc291cmNlTGF5ZXIuXG4gICAgICogQHBhcmFtIG5vZGVJbmRleCBOb2RlIGluZGV4IGZyb20gd2hpY2ggYHRlbnNvcmAgY29tZXMgZnJvbS5cbiAgICAgKiBAcGFyYW0gdGVuc29ySW5kZXggVGVuc29ySW5kZXggZnJvbSB3aGljaCBgdGVuc29yYCBjb21lcyBmcm9tLlxuICAgICAqXG4gICAgICogQGV4Y2VwdGlvbiBSdW50aW1lRXJyb3IgaWYgYSBjeWNsZSBpcyBkZXRlY3RlZC5cbiAgICAgKi9cbiAgICBjb25zdCBidWlsZE1hcE9mR3JhcGggPVxuICAgICAgICAodGVuc29yOiBTeW1ib2xpY1RlbnNvciwgZmluaXNoZWROb2RlczogTm9kZVtdLCBub2Rlc0luUHJvZ3Jlc3M6IE5vZGVbXSxcbiAgICAgICAgIGxheWVyPzogTGF5ZXIsIG5vZGVJbmRleD86IG51bWJlciwgdGVuc29ySW5kZXg/OiBudW1iZXIpID0+IHtcbiAgICAgICAgICBpZiAobGF5ZXIgPT0gbnVsbCB8fCBub2RlSW5kZXggPT0gbnVsbCB8fCB0ZW5zb3JJbmRleCA9PSBudWxsKSB7XG4gICAgICAgICAgICBsYXllciA9IHRlbnNvci5zb3VyY2VMYXllcjtcbiAgICAgICAgICAgIG5vZGVJbmRleCA9IHRlbnNvci5ub2RlSW5kZXg7XG4gICAgICAgICAgICB0ZW5zb3JJbmRleCA9IHRlbnNvci50ZW5zb3JJbmRleDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgbm9kZSA9IGxheWVyLmluYm91bmROb2Rlc1tub2RlSW5kZXhdO1xuXG4gICAgICAgICAgLy8gUHJldmVudCBjeWNsZXMuXG4gICAgICAgICAgaWYgKG5vZGVzSW5Qcm9ncmVzcy5pbmRleE9mKG5vZGUpICE9PSAtMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICAgICAgICBgVGhlIHRlbnNvciAke3RlbnNvci5uYW1lfSBhdCBsYXllciBcIiR7bGF5ZXIubmFtZX1cIiBgICtcbiAgICAgICAgICAgICAgICAnaXMgcGFydCBvZiBhIGN5Y2xlLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIERvbid0IHJlcGVhdCB3b3JrIGZvciBzaGFyZWQgc3ViZ3JhcGhzXG4gICAgICAgICAgaWYgKGZpbmlzaGVkTm9kZXMuaW5kZXhPZihub2RlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBVcGRhdGUgY29udGFpbmVyTm9kZXMuXG4gICAgICAgICAgdGhpcy5jb250YWluZXJOb2Rlcy5hZGQoQ29udGFpbmVyLm5vZGVLZXkobGF5ZXIsIG5vZGVJbmRleCkpO1xuXG4gICAgICAgICAgLy8gU3RvcmUgdGhlIHRyYXZlcnNhbCBvcmRlciBmb3IgbGF5ZXIgc29ydGluZy5cbiAgICAgICAgICBpZiAoIShsYXllci5pZCBpbiBsYXllckluZGljZXMpKSB7XG4gICAgICAgICAgICBsYXllckluZGljZXNbbGF5ZXIuaWRdID0gT2JqZWN0LmtleXMobGF5ZXJJbmRpY2VzKS5sZW5ndGg7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG5vZGVzSW5Qcm9ncmVzcy5pbmRleE9mKG5vZGUpID09PSAtMSkge1xuICAgICAgICAgICAgbm9kZXNJblByb2dyZXNzLnB1c2gobm9kZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUHJvcGFnYXRlIHRvIGFsbCBwcmV2aW91cyB0ZW5zb3JzIGNvbm5lY3RlZCB0byB0aGlzIG5vZGUuXG4gICAgICAgICAgY29uc3QgbnVtSW5ib3VuZExheWVycyA9IG5vZGUuaW5ib3VuZExheWVycy5sZW5ndGg7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1JbmJvdW5kTGF5ZXJzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHggPSBub2RlLmlucHV0VGVuc29yc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gbm9kZS5pbmJvdW5kTGF5ZXJzW2ldO1xuICAgICAgICAgICAgY29uc3Qgbm9kZUluZGV4ID0gbm9kZS5ub2RlSW5kaWNlc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IHRlbnNvckluZGV4ID0gbm9kZS50ZW5zb3JJbmRpY2VzW2ldO1xuICAgICAgICAgICAgYnVpbGRNYXBPZkdyYXBoKFxuICAgICAgICAgICAgICAgIHgsIGZpbmlzaGVkTm9kZXMsIG5vZGVzSW5Qcm9ncmVzcywgbGF5ZXIsIG5vZGVJbmRleCxcbiAgICAgICAgICAgICAgICB0ZW5zb3JJbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpbmlzaGVkTm9kZXMucHVzaChub2RlKTtcbiAgICAgICAgICB3aGlsZSAobm9kZXNJblByb2dyZXNzLmluZGV4T2Yobm9kZSkgPj0gMCkge1xuICAgICAgICAgICAgbm9kZXNJblByb2dyZXNzLnNwbGljZShub2Rlc0luUHJvZ3Jlc3MuaW5kZXhPZihub2RlKSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5vZGVzSW5EZWNyZWFzaW5nRGVwdGgucHVzaChub2RlKTtcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IGZpbmlzaGVkTm9kZXM6IE5vZGVbXSA9IFtdO1xuICAgIGNvbnN0IG5vZGVzSW5Qcm9ncmVzczogTm9kZVtdID0gW107XG4gICAgZm9yIChjb25zdCB4IG9mIHRoaXMub3V0cHV0cykge1xuICAgICAgYnVpbGRNYXBPZkdyYXBoKHgsIGZpbmlzaGVkTm9kZXMsIG5vZGVzSW5Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV2ZXJzZWROb2Rlc0luRGVjcmVhc2luZ0RlcHRoID1cbiAgICAgICAgbm9kZXNJbkRlY3JlYXNpbmdEZXB0aC5zbGljZSgpLnJldmVyc2UoKTtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgcmV2ZXJzZWROb2Rlc0luRGVjcmVhc2luZ0RlcHRoKSB7XG4gICAgICBub2RlSURUb05vZGVbbm9kZS5pZF0gPSBub2RlO1xuICAgICAgLy8gSWYgdGhlIGRlcHRoIGlzIG5vdCBzZXQsIHRoZSBub2RlIGhhcyBubyBvdXRib3VuZCBub2RlcyAoZGVwdGggMCkuXG4gICAgICBpZiAoIShub2RlLmlkIGluIG5vZGVzRGVwdGhzKSkge1xuICAgICAgICBub2Rlc0RlcHRoc1tub2RlLmlkXSA9IDA7XG4gICAgICB9XG4gICAgICBsZXQgZGVwdGggPSBub2Rlc0RlcHRoc1tub2RlLmlkXTtcblxuICAgICAgLy8gVXBkYXRlIHRoZSBkZXB0aCBvZiB0aGUgY29ycmVzcG9uZGluZyBsYXllclxuICAgICAgY29uc3QgcHJldmlvdXNEZXB0aCA9XG4gICAgICAgICAgKGxheWVyc0RlcHRoc1tub2RlLm91dGJvdW5kTGF5ZXIuaWRdID09IG51bGwgP1xuICAgICAgICAgICAgICAgMCA6XG4gICAgICAgICAgICAgICBsYXllcnNEZXB0aHNbbm9kZS5vdXRib3VuZExheWVyLmlkXSk7XG5cbiAgICAgIC8qXG4gICAgICAgIElmIHdlJ3ZlIHNlZW4gdGhpcyBsYXllciBiZWZvcmUgYXQgYSBoaWdoZXIgZGVwdGgsIHdlIHNob3VsZCB1c2UgdGhhdFxuICAgICAgICBkZXB0aCBpbnN0ZWFkIG9mIHRoZSBub2RlIGRlcHRoLiAgVGhpcyBpcyBuZWNlc3NhcnkgZm9yIHNoYXJlZCBsYXllcnNcbiAgICAgICAgdGhhdCBoYXZlIGlucHV0cyBhdCBkaWZmZXJlbnQgZGVwdGggbGV2ZWxzIGluIHRoZSBncmFwaC5cbiAgICAgICovXG4gICAgICBkZXB0aCA9IE1hdGgubWF4KGRlcHRoLCBwcmV2aW91c0RlcHRoKTtcbiAgICAgIGxheWVyc0RlcHRoc1tub2RlLm91dGJvdW5kTGF5ZXIuaWRdID0gZGVwdGg7XG4gICAgICBsYXllcklEVG9MYXllcltub2RlLm91dGJvdW5kTGF5ZXIuaWRdID0gbm9kZS5vdXRib3VuZExheWVyO1xuICAgICAgbm9kZXNEZXB0aHNbbm9kZS5pZF0gPSBkZXB0aDtcblxuICAgICAgLy8gVXBkYXRlIHRoZSBkZXB0aCBvZiBpbmJvdW5kIG5vZGVzLlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmluYm91bmRMYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgaW5ib3VuZExheWVyID0gbm9kZS5pbmJvdW5kTGF5ZXJzW2ldO1xuICAgICAgICBjb25zdCBub2RlSW5kZXggPSBub2RlLm5vZGVJbmRpY2VzW2ldO1xuICAgICAgICBjb25zdCBpbmJvdW5kTm9kZSA9IGluYm91bmRMYXllci5pbmJvdW5kTm9kZXNbbm9kZUluZGV4XTtcbiAgICAgICAgY29uc3QgcHJldmlvdXNEZXB0aCA9XG4gICAgICAgICAgICAobm9kZXNEZXB0aHNbaW5ib3VuZE5vZGUuaWRdID09IG51bGwgPyAwIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzRGVwdGhzW2luYm91bmROb2RlLmlkXSk7XG4gICAgICAgIG5vZGVzRGVwdGhzW2luYm91bmROb2RlLmlkXSA9IE1hdGgubWF4KGRlcHRoICsgMSwgcHJldmlvdXNEZXB0aCk7XG4gICAgICAgIG5vZGVJRFRvTm9kZVtpbmJvdW5kTm9kZS5pZF0gPSBpbmJvdW5kTm9kZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCdWlsZCBhIGRpY3Qge2RlcHRoOiBsaXN0IG9mIG5vZGVzIHdpdGggdGhpcyBkZXB0aH1cbiAgICBjb25zdCBub2Rlc0J5RGVwdGg6IHtbZGVwdGg6IHN0cmluZ106IE5vZGVbXX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IG5vZGVJRCBpbiBub2Rlc0RlcHRocykge1xuICAgICAgY29uc3QgZGVwdGggPSBub2Rlc0RlcHRoc1tub2RlSURdO1xuICAgICAgaWYgKCEoZGVwdGggaW4gbm9kZXNCeURlcHRoKSkge1xuICAgICAgICBub2Rlc0J5RGVwdGhbZGVwdGhdID0gW107XG4gICAgICB9XG4gICAgICBub2Rlc0J5RGVwdGhbZGVwdGhdLnB1c2gobm9kZUlEVG9Ob2RlW25vZGVJRF0pO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIGEgZGljdCB7ZGVwdGg6IGxpc3Qgb2YgbGF5ZXJzIHdpdGggdGhpcyBkZXB0aH1cbiAgICBjb25zdCBsYXllcnNCeURlcHRoOiB7W2RlcHRoOiBzdHJpbmddOiBMYXllcltdfSA9IHt9O1xuICAgIGZvciAoY29uc3QgbGF5ZXJJRCBpbiBsYXllcnNEZXB0aHMpIHtcbiAgICAgIGNvbnN0IGRlcHRoID0gbGF5ZXJzRGVwdGhzW2xheWVySURdO1xuICAgICAgaWYgKCEoZGVwdGggaW4gbGF5ZXJzQnlEZXB0aCkpIHtcbiAgICAgICAgbGF5ZXJzQnlEZXB0aFtkZXB0aF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIGxheWVyc0J5RGVwdGhbZGVwdGhdLnB1c2gobGF5ZXJJRFRvTGF5ZXJbbGF5ZXJJRF0pO1xuICAgIH1cblxuICAgIC8vIEdldCBzb3J0ZWQgbGlzdCBvZiBsYXllciBkZXB0aHMuXG4gICAgbGV0IGRlcHRoS2V5cyA9IE9iamVjdC5rZXlzKGxheWVyc0J5RGVwdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKHggPT4gcGFyc2VJbnQoeCwgMTApKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNvcnQoZ2VuZXJpY191dGlscy5yZXZlcnNlTnVtYmVyQ29tcGFyZSk7XG5cbiAgICAvLyBTZXQgdGhpcy5sYXllcnMgYW5kIHRoaXMubGF5ZXJzQnlEZXB0aC5cbiAgICB0aGlzLmxheWVycyA9IFtdO1xuICAgIGZvciAoY29uc3QgZGVwdGggb2YgZGVwdGhLZXlzKSB7XG4gICAgICBjb25zdCBsYXllcnNGb3JEZXB0aCA9IGxheWVyc0J5RGVwdGhbZGVwdGhdO1xuICAgICAgLy8gQ29udGFpbmVyLmxheWVycyBuZWVkcyB0byBoYXZlIGEgZGV0ZXJtaW5pc3RpYyBvcmRlcjpcbiAgICAgIC8vIGhlcmUgd2Ugb3JkZXIgdGhlbSBieSB0cmF2ZXJzYWwgb3JkZXIuXG4gICAgICBsYXllcnNGb3JEZXB0aC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGNvbnN0IGFJbmRleCA9IGxheWVySW5kaWNlc1thLmlkXTtcbiAgICAgICAgY29uc3QgYkluZGV4ID0gbGF5ZXJJbmRpY2VzW2IuaWRdO1xuICAgICAgICBpZiAoYUluZGV4IDwgYkluZGV4KSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhSW5kZXggPiBiSW5kZXgpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0pO1xuICAgICAgZm9yIChjb25zdCBsYXllciBvZiBsYXllcnNGb3JEZXB0aCkge1xuICAgICAgICBpZiAobGF5ZXIgaW5zdGFuY2VvZiBDb250YWluZXIpIHtcbiAgICAgICAgICB0aGlzLmludGVybmFsQ29udGFpbmVyUmVmcy5wdXNoKGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5sYXllcnNCeURlcHRoID0gbGF5ZXJzQnlEZXB0aDtcblxuICAgIC8vIEdldCBzb3J0ZWQgbGlzdCBvZiBub2RlIGRlcHRocztcbiAgICBkZXB0aEtleXMgPSBPYmplY3Qua2V5cyhub2Rlc0J5RGVwdGgpXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoeCA9PiBwYXJzZUludCh4LCAxMCkpXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KGdlbmVyaWNfdXRpbHMucmV2ZXJzZU51bWJlckNvbXBhcmUpO1xuXG4gICAgLy8gQ2hlY2sgdGhhdCBhbGwgdGVuc29ycyByZXF1aXJlZCBhcmUgY29tcHV0YWJsZS5cbiAgICAvLyBjb21wdXRhYmxlX3RlbnNvcnM6IGFsbCB0ZW5zb3JzIGluIHRoZSBncmFwaFxuICAgIC8vIHRoYXQgY2FuIGJlIGNvbXB1dGVkIGZyb20gdGhlIGlucHV0cyBwcm92aWRlZC5cbiAgICBjb25zdCBjb21wdXRhYmxlVGVuc29ycyA9IHRoaXMuaW5wdXRzLnNsaWNlKCk7XG5cbiAgICAvLyBUbyBwcm92aWRlIGEgYmV0dGVyIGVycm9yIG1zZy5cbiAgICBjb25zdCBsYXllcnNXaXRoQ29tcGxldGVJbnB1dDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGRlcHRoIG9mIGRlcHRoS2V5cykge1xuICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzQnlEZXB0aFtkZXB0aF0pIHtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBub2RlLm91dGJvdW5kTGF5ZXI7XG4gICAgICAgIGlmIChsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgZm9yIChjb25zdCB4IG9mIG5vZGUuaW5wdXRUZW5zb3JzKSB7XG4gICAgICAgICAgICBpZiAoY29tcHV0YWJsZVRlbnNvcnMuaW5kZXhPZih4KSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBHcmFwaCBkaXNjb25uZWN0ZWQ6IGNhbm5vdCBvYnRhaW4gdmFsdWUgZm9yIHRlbnNvciAke3h9YCArXG4gICAgICAgICAgICAgICAgICBgIGF0IGxheWVyIFwiJHtsYXllci5uYW1lfVwiLiBgICtcbiAgICAgICAgICAgICAgICAgICdUaGUgZm9sbG93aW5nIHByZXZpb3VzIGxheWVycyB3ZXJlIGFjY2Vzc2VkIHdpdGhvdXQgJyArXG4gICAgICAgICAgICAgICAgICBgaXNzdWU6ICR7bGF5ZXJzV2l0aENvbXBsZXRlSW5wdXR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgeCBvZiBub2RlLm91dHB1dFRlbnNvcnMpIHtcbiAgICAgICAgICAgIGNvbXB1dGFibGVUZW5zb3JzLnB1c2goeCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxheWVyc1dpdGhDb21wbGV0ZUlucHV0LnB1c2gobGF5ZXIubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTZXQgdGhpcy5jb250YWluZXJOb2RlcyBhbmQgdGhpcy5ub2Rlc0J5RGVwdGguXG4gICAgdGhpcy5ub2Rlc0J5RGVwdGggPSBub2Rlc0J5RGVwdGg7XG5cbiAgICAvLyBFbnN1cmUgbmFtZSB1bmljaXR5LCB3aGljaCB3aWxsIGJlIGNydWNpYWwgZm9yIHNlcmlhbGl6YXRpb25cbiAgICAvLyAoc2luY2Ugc2VyaWFsaXplZCBub2RlcyByZWZlciB0byBsYXllcnMgYnkgdGhlaXIgbmFtZSkuXG4gICAgY29uc3QgYWxsTmFtZXMgPSB0aGlzLmxheWVycy5tYXAoeCA9PiB4Lm5hbWUpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBhbGxOYW1lcykge1xuICAgICAgY29uc3QgbnVtT2NjdXJyZW5jZXMgPSBhbGxOYW1lcy5maWx0ZXIoeCA9PiB4ID09PSBuYW1lKS5sZW5ndGg7XG4gICAgICBpZiAobnVtT2NjdXJyZW5jZXMgIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICAgIGBUaGUgbmFtZSBcIiR7bmFtZX1cIiBpcyB1c2VkICR7bnVtT2NjdXJyZW5jZXN9IHRpbWVzIGAgK1xuICAgICAgICAgICAgJ2luIHRoZSBtb2RlbC4gQWxsIGxheWVyIG5hbWVzIHNob3VsZCBiZSB1bmlxdWUuIExheWVyIG5hbWVzOiAnICtcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGFsbE5hbWVzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTGF5ZXIgcGFyYW1ldGVycy5cbiAgICAvLyBUaGUgbmV3IGNvbnRhaW5lciBzdGFydHMgd2l0aCBhIHNpbmdsZSBpbmJvdW5kIG5vZGVcbiAgICAvLyBmb3IgaXRzIGlucHV0cywgYW5kIG5vIG91dGJvdW5kIG5vZGVzLlxuICAgIC8vIFdpbGwgYmUgYXBwZW5kZWQgdG8gYnkgZnV0dXJlIGNhbGxzIHRvIGFwcGx5KCkuXG4gICAgdGhpcy5vdXRib3VuZE5vZGVzID0gW107XG4gICAgLy8gV2lsbCBiZSBhcHBlbmRlZCB0byBiZWxvdywgYW5kIGJ5IGZ1dHVyZSBjYWxscyB0byBhcHBseSgpLlxuICAgIHRoaXMuaW5ib3VuZE5vZGVzID0gW107XG5cbiAgICAvLyBDcmVhdGUgdGhlIG5vZGUgbGlua2luZyBpbnRlcm5hbCBpbnB1dHMgdG8gaW50ZXJuYWwgb3V0cHV0cy5cbiAgICAvLyAoVGhpcyBjYWxsIGhhcyBzaWRlIGVmZmVjdHMuKVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bnVzZWQtZXhwcmVzc2lvblxuICAgIG5ldyBOb2RlKHtcbiAgICAgIG91dGJvdW5kTGF5ZXI6IHRoaXMsXG4gICAgICBpbmJvdW5kTGF5ZXJzOiBbXSxcbiAgICAgIG5vZGVJbmRpY2VzOiBbXSxcbiAgICAgIHRlbnNvckluZGljZXM6IFtdLFxuICAgICAgaW5wdXRUZW5zb3JzOiB0aGlzLmlucHV0cyxcbiAgICAgIG91dHB1dFRlbnNvcnM6IHRoaXMub3V0cHV0cyxcbiAgICAgIGlucHV0TWFza3M6IHRoaXMuaW5wdXRzLm1hcCh4ID0+IG51bGwpLFxuICAgICAgb3V0cHV0TWFza3M6IHRoaXMub3V0cHV0cy5tYXAoeCA9PiBudWxsKSxcbiAgICAgIGlucHV0U2hhcGVzOiB0aGlzLmlucHV0cy5tYXAoeCA9PiB4LnNoYXBlKSxcbiAgICAgIG91dHB1dFNoYXBlczogdGhpcy5vdXRwdXRzLm1hcCh4ID0+IHguc2hhcGUpXG4gICAgfSk7XG4gICAgdGhpcy5idWlsdCA9IHRydWU7XG4gICAgdGhpcy5fcmVmQ291bnQgPSAxOyAgLy8gVGhlIHJlZiBjb3VudCBvZiBhIGNvbnRhaW5lciBhbHdheXMgc3RhcnQgYXQgMS5cbiAgfVxuXG4gIHByb3RlY3RlZCBvdmVycmlkZSBhc3NlcnROb3REaXNwb3NlZCgpIHtcbiAgICBpZiAodGhpcy5fcmVmQ291bnQgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29udGFpbmVyICcke3RoaXMubmFtZX0nIGlzIGFscmVhZHkgZGlzcG9zZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gZGlzcG9zZSBhIExheWVyc01vZGVsJ3Mgd2VpZ2h0cy5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgZGVjcmVhc2UgdGhlIHJlZmVyZW5jZSBjb3VudCBvZiB0aGUgTGF5ZXJzTW9kZWwgb2JqZWN0IGJ5IDEuXG4gICAqXG4gICAqIEEgTGF5ZXJzTW9kZWwgaXMgcmVmZXJlbmNlLWNvdW50ZWQuIEl0cyByZWZlcmVuY2UgY291bnQgaXMgaW5jcmVtZW50ZWQgYnkgMVxuICAgKiB3aGVuIGl0IGlzIGZpcnN0IGNvbnN0cnVjdGVkIGFuZCB3aGVuIGl0IGlzIHVzZWQgYXMgYSBMYXllciBvZiBhbm90aGVyXG4gICAqIExheWVyc01vZGVsLlxuICAgKlxuICAgKiBJZiB0aGUgcmVmZXJlbmNlIGNvdW50IG9mIGEgTGF5ZXJzTW9kZWwgYmVjb21lcyAwLCB0aGUgYGRpc3Bvc2VgIG1ldGhvZCBvZlxuICAgKiBhbGwgaXRzIGNvbnN0aXR1ZW50IGBMYXllcmBzIHdpbGwgYmUgY2FsbGVkLlxuICAgKlxuICAgKiBOb3RlOiBJZiB0aGUgcmVmZXJlbmNlIGNvdW50IGlzIGdyZWF0ZXIgdGhhbiAwIGFmdGVyIHRoZSBkZWNyZW1lbnQsIHRoZVxuICAgKiBgZGlzcG9zZWAgbWV0aG9kIG9mIGl0cyBjb25zdGl0dWVudCBgTGF5ZXJgcyB3aWxsICpub3QqIGJlIGNhbGxlZC5cbiAgICpcbiAgICogQWZ0ZXIgYSBMYXllcnNNb2RlbCBpcyBkaXNwb3NlZCwgaXQgY2Fubm90IGJlIHVzZWQgaW4gY2FsbHMgc3VjaCBhc1xuICAgKiAncHJlZGljdGAsIGBldmFsdWF0ZWAgb3IgYGZpdGAgYW55bW9yZS5cbiAgICpcbiAgICogQHJldHVybnMgQSBEaXNwb3NlUmVzdWx0IE9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuICAgKiAgIC0gcmVmQ291bnRBZnRlckRpc3Bvc2U6IFRoZSByZWZlcmVuY2UgY291bnQgb2YgdGhlIExheWVyc01vZGVsIGFmdGVyIHRoaXNcbiAgICogICAgIGBkaXNwb3NlKClgIGNhbGwuXG4gICAqICAgLSBudW1EaXNwb3NlZFZhcmlhYmxlczogTnVtYmVyIG9mIGB0Zi5WYXJpYWJsZWBzIChpLmUuLCB3ZWlnaHRzKSBkaXNwb3NlZFxuICAgKiAgICAgZHVyaW5nIHRoaXMgYGRpc3Bvc2UoKWAgY2FsbC5cbiAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBsYXllciBpcyBub3QgYnVpbHQgeWV0LCBvciBpZiB0aGUgTGF5ZXJzTW9kZWwgaGFzXG4gICAqICAgYWxyZWFkeSBiZWVuIGRpc3Bvc2VkLlxuICAgKi9cbiAgb3ZlcnJpZGUgZGlzcG9zZSgpOiBEaXNwb3NlUmVzdWx0IHtcbiAgICB0aGlzLmFzc2VydE5vdERpc3Bvc2VkKCk7XG4gICAgY29uc3QgcmVzdWx0OlxuICAgICAgICBEaXNwb3NlUmVzdWx0ID0ge3JlZkNvdW50QWZ0ZXJEaXNwb3NlOiBudWxsLCBudW1EaXNwb3NlZFZhcmlhYmxlczogMH07XG4gICAgaWYgKC0tdGhpcy5fcmVmQ291bnQgPT09IDApIHtcbiAgICAgIGZvciAoY29uc3QgbGF5ZXIgb2YgdGhpcy5sYXllcnMpIHtcbiAgICAgICAgcmVzdWx0Lm51bURpc3Bvc2VkVmFyaWFibGVzICs9IGxheWVyLmRpc3Bvc2UoKS5udW1EaXNwb3NlZFZhcmlhYmxlcztcbiAgICAgIH1cblxuICAgICAgLy8gQ2FsbCBkaXNwb3NlIG9uIGVhY2ggaW50ZXJuYWxseSBjcmVhdGVkIGNvbnRhaW5lciBsYXllciBhZ2FpbiB0byBlbnN1cmVcbiAgICAgIC8vIHRoZWlyIHJlZkNvdW50cyBoaXQgemVybyBhbmQgdGhlaXIgdGVuc29ycyBhcmUgc3Vic2VxdWVudGx5IGRlbGV0ZWQuXG4gICAgICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiB0aGlzLmludGVybmFsQ29udGFpbmVyUmVmcykge1xuICAgICAgICByZXN1bHQubnVtRGlzcG9zZWRWYXJpYWJsZXMgKz0gY29udGFpbmVyLmRpc3Bvc2UoKS5udW1EaXNwb3NlZFZhcmlhYmxlcztcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0LnJlZkNvdW50QWZ0ZXJEaXNwb3NlID0gdGhpcy5fcmVmQ291bnQ7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCB0cmFpbmFibGUoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhaW5hYmxlXztcbiAgfVxuXG4gIG92ZXJyaWRlIHNldCB0cmFpbmFibGUodHJhaW5hYmxlOiBib29sZWFuKSB7XG4gICAgdGhpcy5sYXllcnMuZm9yRWFjaChsYXllciA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAoKGxheWVyIGFzIGFueSkuX3RyYWluYWJsZVdlaWdodHMgYXMgTGF5ZXJWYXJpYWJsZVtdKVxuICAgICAgICAgIC5mb3JFYWNoKHcgPT4gdy50cmFpbmFibGUgPSB0cmFpbmFibGUpO1xuICAgIH0pO1xuICAgIHRoaXMudHJhaW5hYmxlXyA9IHRyYWluYWJsZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCB0cmFpbmFibGVXZWlnaHRzKCk6IExheWVyVmFyaWFibGVbXSB7XG4gICAgLy8gUG9ydGluZyBOb3RlOiBUaGlzIGNoZWNrIGJlbG93IGlzIHRvIHByZXZlbnQgZXJyb3JzIHdoZXJlIHRoZVxuICAgIC8vICAgX3RyYWluYWJsZVdlaWdodHMgaW5oZXJpdGVkIGZyb20gdGhlIHBhcmVudCBjbGFzcyAoTGF5ZXIpIGdldHNcbiAgICAvLyAgIGluYWR2ZXJ0ZW50bHkgdXNlZC5cbiAgICBpZiAodGhpcy5fdHJhaW5hYmxlV2VpZ2h0cy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnQ29udGFpbmVyIGluc3RhbmNlIHVuZXhwZWN0ZWRseSBjb250YWlucyBfdHJhaW5hYmxlV2VpZ2h0cy4nICtcbiAgICAgICAgICAnVGhlIHRyYWluYWJsZSB3ZWlnaHRzIG9mIGEgQ29udGFpbmVyIGFyZSBhIHVuaW9uIG9mIHRoZSAnICtcbiAgICAgICAgICAndHJhaW5hYmxlIHdlaWdodHMgb2YgaXRzIGNvbnNpdHVlbnQgTGF5ZXJzLiBJdHMgb3duICcgK1xuICAgICAgICAgICdfdHJhaW5hYmxlV2VpZ2h0cyBtdXN0IHJlbWFpbiBhbiBlbXB0eSBBcnJheS4nKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudHJhaW5hYmxlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGxldCB3ZWlnaHRzOiBMYXllclZhcmlhYmxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMubGF5ZXJzKSB7XG4gICAgICB3ZWlnaHRzID0gd2VpZ2h0cy5jb25jYXQobGF5ZXIudHJhaW5hYmxlV2VpZ2h0cyk7XG4gICAgfVxuICAgIHJldHVybiB3ZWlnaHRzO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IG5vblRyYWluYWJsZVdlaWdodHMoKTogTGF5ZXJWYXJpYWJsZVtdIHtcbiAgICBjb25zdCB3ZWlnaHRzOiBMYXllclZhcmlhYmxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMubGF5ZXJzKSB7XG4gICAgICB3ZWlnaHRzLnB1c2goLi4ubGF5ZXIubm9uVHJhaW5hYmxlV2VpZ2h0cyk7XG4gICAgfVxuICAgIGlmICghdGhpcy50cmFpbmFibGUpIHtcbiAgICAgIGNvbnN0IHRyYWluYWJsZVdlaWdodHM6IExheWVyVmFyaWFibGVbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBsYXllciBvZiB0aGlzLmxheWVycykge1xuICAgICAgICB0cmFpbmFibGVXZWlnaHRzLnB1c2goLi4ubGF5ZXIudHJhaW5hYmxlV2VpZ2h0cyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJhaW5hYmxlV2VpZ2h0cy5jb25jYXQod2VpZ2h0cyk7XG4gICAgfVxuICAgIHJldHVybiB3ZWlnaHRzO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IHdlaWdodHMoKTogTGF5ZXJWYXJpYWJsZVtdIHtcbiAgICByZXR1cm4gdGhpcy50cmFpbmFibGVXZWlnaHRzLmNvbmNhdCh0aGlzLm5vblRyYWluYWJsZVdlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWRzIGFsbCBsYXllciB3ZWlnaHRzIGZyb20gYSBKU09OIG9iamVjdC5cbiAgICpcbiAgICogUG9ydGluZyBOb3RlOiBIREY1IHdlaWdodCBmaWxlcyBjYW5ub3QgYmUgZGlyZWN0bHkgbG9hZGVkIGluIEphdmFTY3JpcHQgL1xuICAgKiAgIFR5cGVTY3JpcHQuIFRoZSB1dGlsaXR5IHNjcmlwdCBhdCBgc2NyaXB0cy9weWtlcmFzLnB5YCBvZmZlcnMgbWVhbnNcbiAgICogICB0byBjb252ZXJ0IHRoZW0gaW50byBKU09OIHN0cmluZ3MgY29tcGF0aWJsZSB3aXRoIHRoaXMgbWV0aG9kLlxuICAgKiBQb3J0aW5nIE5vdGU6IFRlbnNvckZsb3cuanMgTGF5ZXJzIHN1cHBvcnRzIG9ubHkgbG9hZGluZyBieSBuYW1lIGN1cnJlbnRseS5cbiAgICpcbiAgICogQHBhcmFtIHdlaWdodHMgQSBKU09OIG1hcHBpbmcgd2VpZ2h0IG5hbWVzIHRvIHdlaWdodCB2YWx1ZXMgYXMgbmVzdGVkXG4gICAqICAgYXJyYXlzIG9mIG51bWJlcnMsIG9yIGEgYE5hbWVkVGVuc29yTWFwYCwgaS5lLiwgYSBKU09OIG1hcHBpbmcgd2VpZ2h0XG4gICAqICAgbmFtZXMgdG8gYHRmLlRlbnNvcmAgb2JqZWN0cy5cbiAgICogQHBhcmFtIHN0cmljdCBSZXF1aXJlIHRoYXQgdGhlIHByb3ZpZGVkIHdlaWdodHMgZXhhY3RseSBtYXRjaCB0aG9zZVxuICAgKiAgIHJlcXVpcmVkIGJ5IHRoZSBjb250YWluZXIuICBEZWZhdWx0OiBgdHJ1ZWAuICBQYXNzaW5nIGBmYWxzZWAgbWVhbnMgdGhhdFxuICAgKiAgIGV4dHJhIHdlaWdodHMgYW5kIG1pc3Npbmcgd2VpZ2h0cyB3aWxsIGJlIHNpbGVudGx5IGlnbm9yZWQuXG4gICAqL1xuICBsb2FkV2VpZ2h0cyh3ZWlnaHRzOiBOYW1lZFRlbnNvck1hcCwgc3RyaWN0ID0gdHJ1ZSkge1xuICAgIGNvbnN0IG5hbWVUb1dlaWdodDoge1tuYW1lOiBzdHJpbmddOiBMYXllclZhcmlhYmxlfSA9IHt9O1xuICAgIGxldCB0b3RhbFdlaWdodHNDb3VudCA9IDA7XG4gICAgY29uc3QgbW9kZWxJc0tlcmFzU2F2ZWRNb2RlbEZvcm1hdCA9IGlzS2VyYXNTYXZlZE1vZGVsRm9ybWF0KHdlaWdodHMpO1xuICAgIGlmIChtb2RlbElzS2VyYXNTYXZlZE1vZGVsRm9ybWF0KSB7XG4gICAgICB0aGlzLnBhcnNlV2VpZ2h0cyh3ZWlnaHRzKTtcbiAgICB9XG4gICAgLy8gQ2hlY2sgaWYgd2VpZ2h0cyBmcm9tIGtlcmFzIHYzLlxuICAgIGZvciAoY29uc3QgbGF5ZXIgb2YgdGhpcy5sYXllcnMpIHtcbiAgICAgIGZvciAoY29uc3QgW2luZGV4LCB3ZWlnaHRdIG9mIGxheWVyLndlaWdodHMuZW50cmllcygpKSB7XG4gICAgICAgIC8vIFBhcnNlIHRoZSBuYW1lIHRvIGxheWVyTmFtZS9pbmRleC5cbiAgICAgICAgLy8gZS5nLiBkZW5zZS8wLCBkZW5zZS8xLCBkZW5zZV8xLzAsIGRlbnNlXzEvMVxuICAgICAgICBjb25zdCBwYXJzZWROYW1lID0gbW9kZWxJc0tlcmFzU2F2ZWRNb2RlbEZvcm1hdCA/XG4gICAgICAgICAgICBgJHt3ZWlnaHQubmFtZS5zcGxpdCgnLycpLnNsaWNlKDAsIC0xKS5qb2luKCcvJykgKyAnLyd9JHtpbmRleH1gIDpcbiAgICAgICAgICAgIHdlaWdodC5vcmlnaW5hbE5hbWU7XG4gICAgICAgIGlmIChuYW1lVG9XZWlnaHRbcGFyc2VkTmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKGBEdXBsaWNhdGUgd2VpZ2h0IG5hbWU6ICR7cGFyc2VkTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBuYW1lVG9XZWlnaHRbcGFyc2VkTmFtZV0gPSB3ZWlnaHQ7XG4gICAgICAgIHRvdGFsV2VpZ2h0c0NvdW50Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgd2VpZ2h0VmFsdWVUdXBsZXM6IEFycmF5PFtMYXllclZhcmlhYmxlLCBUZW5zb3JdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiB3ZWlnaHRzKSB7XG4gICAgICAvLyBURiAyLjIuMCBhZGRlZCBjZWxsIG5hbWUgdG8gdGhlIHdlaWdodCBuYW1lIGluIHRoZSBmb3JtYXQgb2ZcbiAgICAgIC8vIGxheWVyX25hbWUvY2VsbF9uYW1lL3dlaWdodF9uYW1lLCB3ZSBuZWVkIHRvIHJlbW92ZVxuICAgICAgLy8gdGhlIGlubmVyIGNlbGwgbmFtZS5cbiAgICAgIGxldCB2YWxpZGF0ZWROYW1lID0gbmFtZTtcbiAgICAgIGlmIChuYW1lVG9XZWlnaHRbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b2tlbnMgPSBuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IHNob3J0ZW5OYW1lQXJyYXkgPVxuICAgICAgICAgICAgdG9rZW5zLnNsaWNlKDAsIC0yKS5jb25jYXQoW3Rva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV1dKTtcbiAgICAgICAgdmFsaWRhdGVkTmFtZSA9IHNob3J0ZW5OYW1lQXJyYXkuam9pbignLycpO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWVUb1dlaWdodFt2YWxpZGF0ZWROYW1lXSAhPSBudWxsKSB7XG4gICAgICAgIHdlaWdodFZhbHVlVHVwbGVzLnB1c2goW25hbWVUb1dlaWdodFt2YWxpZGF0ZWROYW1lXSwgd2VpZ2h0c1tuYW1lXV0pO1xuICAgICAgfSBlbHNlIGlmIChzdHJpY3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICBgUHJvdmlkZWQgd2VpZ2h0IGRhdGEgaGFzIG5vIHRhcmdldCB2YXJpYWJsZTogJHtuYW1lfWApO1xuICAgICAgfVxuICAgICAgZGVsZXRlIG5hbWVUb1dlaWdodFt2YWxpZGF0ZWROYW1lXTtcbiAgICB9XG5cbiAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAvLyBDaGVjayB0aGF0IGFsbCB3ZWlnaHRzIGFyZSBzZXQuXG4gICAgICBjb25zdCB1bnNldE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBuYW1lIGluIG5hbWVUb1dlaWdodCkge1xuICAgICAgICB1bnNldE5hbWVzLnB1c2gobmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAodW5zZXROYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYCR7dW5zZXROYW1lcy5sZW5ndGh9IG9mICR7XG4gICAgICAgICAgICAgICAgdG90YWxXZWlnaHRzQ291bnR9IHdlaWdodHMgYXJlIG5vdCBzZXQ6IGAgK1xuICAgICAgICAgICAgYCR7dW5zZXROYW1lc31gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBiYXRjaFNldFZhbHVlKHdlaWdodFZhbHVlVHVwbGVzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJzZVdlaWdodHMod2VpZ2h0czogTmFtZWRUZW5zb3JNYXApIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBPYmplY3Qua2V5cyh3ZWlnaHRzKSkge1xuICAgICAgY29uc3QgbGlzdFBhcnRzID0ga2V5LnNwbGl0KCcvJyk7XG4gICAgICBjb25zdCBsaXN0ID0gWyd2YXJzJywgJ2xheWVyX2NoZWNrcG9pbnRfZGVwZW5kZW5jaWVzJ107XG4gICAgICAvLyBGb3Iga2VyYXMgdjMsIHRoZSB3ZWlnaHRzIG5hbWUgYXJlIHNhdmVkIGJhc2VkIG9uIHRoZSBmb2xkZXIgc3RydWN0dXJlLlxuICAgICAgLy8gZS5nLiBfYmFja2JvbmUvX2xheWVyX2NoZWNrcG9pbnRfZGVwZW5kZW5jaWVzL3RyYW5zZm9ybWVyL19zZWxmLi4vXG4gICAgICAvLyBfb3V0cHV0X2RlbnNlL3ZhcnMvMFxuICAgICAgLy8gVGhlcmVmb3JlIHdlIGRpc2NhcmQgdGhlIGB2YXJzYCBhbmQgYGxheWVyX2NoZWNrcG9pbnRfZGVwZW5jaWVzYCB3aXRoaW5cbiAgICAgIC8vIHRoZSBzYXZlZCBuYW1lIGFuZCBvbmx5IGtlZXBzIHRoZSBsYXllciBuYW1lIGFuZCB3ZWlnaHRzLlxuICAgICAgLy8gVGhpcyBjYW4gaGVscCB0byBtYXBwaW5nIHRoZSBhY3R1YWwgbmFtZSBvZiB0aGUgbGF5ZXJzIGFuZCBsb2FkIGVhY2hcbiAgICAgIC8vIHdlaWdodCBhY2NvcmRpbmdseS5cbiAgICAgIGNvbnN0IG5ld0tleSA9IGxpc3RQYXJ0c1xuICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc3RyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdHIuc3RhcnRzV2l0aCgnXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHIuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihzdHIgPT4gIWxpc3QuaW5jbHVkZXMoc3RyKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuam9pbignLycpO1xuICAgICAgaWYgKG5ld0tleSAhPT0ga2V5KSB7XG4gICAgICAgIHdlaWdodHNbbmV3S2V5XSA9IHdlaWdodHNba2V5XTtcbiAgICAgICAgZGVsZXRlIHdlaWdodHNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbCBzaGFyZWQgYmV0d2VlbiBkaWZmZXJlbnQgc2VyaWFsaXphdGlvbiBtZXRob2RzLlxuICAgKiBAcmV0dXJucyBMYXllcnNNb2RlbCBjb25maWcgd2l0aCBLZXJhcyB2ZXJzaW9uIGluZm9ybWF0aW9uIGFkZGVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHVwZGF0ZWRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCB0aGVDb25maWcgPSB0aGlzLmdldENvbmZpZygpO1xuICAgIGNvbnN0IG1vZGVsQ29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7fTtcbiAgICBtb2RlbENvbmZpZ1snY2xhc3NOYW1lJ10gPSB0aGlzLmdldENsYXNzTmFtZSgpO1xuICAgIG1vZGVsQ29uZmlnWydjb25maWcnXSA9IHRoZUNvbmZpZztcbiAgICBtb2RlbENvbmZpZ1sna2VyYXNWZXJzaW9uJ10gPSBgdGZqcy1sYXllcnMgJHtsYXllcnNWZXJzaW9ufWA7XG4gICAgLy8gVE9ETyhuaWVsc2VuZSk6IFJlcGxhY2Ugc29tZXRoaW5nIGxpa2UgSy5iYWNrZW5kKCkgb25jZVxuICAgIC8vIHBvc3NpYmxlLlxuICAgIG1vZGVsQ29uZmlnWydiYWNrZW5kJ10gPSAnVGVuc29yRmxvdy5qcyc7XG4gICAgcmV0dXJuIG1vZGVsQ29uZmlnO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBKU09OIHN0cmluZyBjb250YWluaW5nIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIFRvIGxvYWQgYSBuZXR3b3JrIGZyb20gYSBKU09OIHNhdmUgZmlsZSwgdXNlXG4gICAqIG1vZGVscy5tb2RlbEZyb21KU09OKGpzb25TdHJpbmcpO1xuICAgKiBAcGFyYW0gZXh0cmFKc29uQXJncyBVbnVzZWQgaW4gdGZqcy1sYXllcnMsIG1haW50YWluZWQgZm9yIFB5S2VyYXNcbiAgICogQHBhcmFtIHJldHVyblN0cmluZyBXaGV0aGVyIHRoZSByZXR1cm4gdmFsdWUgc2hvdWxkIGJlIHN0cmluZ2lmaWVkXG4gICAqICAgIChkZWZhdWx0OiBgdHJ1ZWApLlxuICAgKiBAcmV0dXJucyBhIEpTT04gc3RyaW5nIGlmIGByZXR1cm5TdHJpbmdgIChkZWZhdWx0KSwgb3IgYSBKU09OIG9iamVjdCBpZlxuICAgKiAgIGAhcmV0dXJuU3RyaW5nYC5cbiAgICovXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgdG9KU09OKHVudXNlZD86IGFueSwgcmV0dXJuU3RyaW5nID0gdHJ1ZSk6IHN0cmluZ3xQeUpzb25EaWN0IHtcbiAgICBjb25zdCBtb2RlbENvbmZpZyA9IGNvbnZlcnRUc1RvUHl0aG9uaWModGhpcy51cGRhdGVkQ29uZmlnKCkpIGFzIFB5SnNvbkRpY3Q7XG4gICAgcmV0dXJuIHJldHVyblN0cmluZyA/IEpTT04uc3RyaW5naWZ5KG1vZGVsQ29uZmlnKSA6IG1vZGVsQ29uZmlnO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIG1vZGVsIG9uIG5ldyBpbnB1dHMuXG4gICAqXG4gICAqIEluIHRoaXMgY2FzZSBgY2FsbGAganVzdCByZWFwcGxpZXMgYWxsIG9wcyBpbiB0aGUgZ3JhcGggdG8gdGhlIG5ldyBpbnB1dHNcbiAgICogKGUuZy4gYnVpbGQgYSBuZXcgY29tcHV0YXRpb25hbCBncmFwaCBmcm9tIHRoZSBwcm92aWRlZCBpbnB1dHMpLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRzIEEgdGVuc29yIG9yIGxpc3Qgb2YgdGVuc29ycy5cbiAgICogQHBhcmFtIG1hc2sgQSBtYXNrIG9yIGxpc3Qgb2YgbWFza3MuIEEgbWFzayBjYW4gYmUgZWl0aGVyIGEgdGVuc29yIG9yIG51bGxcbiAgICogICAobm8gbWFzaykuXG4gICAqXG4gICAqIEByZXR1cm4gQSB0ZW5zb3IgaWYgdGhlcmUgaXMgYSBzaW5nbGUgb3V0cHV0LCBvciBhIGxpc3Qgb2YgdGVuc29ycyBpZiB0aGVyZVxuICAgKiAgIGFyZSBtb3JlIHRoYW4gb25lIG91dHB1dHMuXG4gICAqL1xuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaW5wdXRzID0gZ2VuZXJpY191dGlscy50b0xpc3QoaW5wdXRzKTtcbiAgICAgIGNvbnN0IGZlZWREaWN0ID0gbmV3IEZlZWREaWN0KCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaW5wdXRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGZlZWREaWN0LmFkZCh0aGlzLmlucHV0c1tpXSwgaW5wdXRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGVjdXRlKHRoaXMub3V0cHV0cywgZmVlZERpY3QsIGt3YXJncykgYXMgVGVuc29yIHwgVGVuc29yW107XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZXMgYW4gb3V0cHV0IG1hc2sgdGVuc29yLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRzIFRlbnNvciBvciBsaXN0IG9mIHRlbnNvcnMuXG4gICAqIEBwYXJhbSBtYXNrIFRlbnNvciBvciBsaXN0IG9mIHRlbnNvcnMuXG4gICAqXG4gICAqIEByZXR1cm4gbnVsbCBvciBhIHRlbnNvciAob3IgbGlzdCBvZiB0ZW5zb3JzLCBvbmUgcGVyIG91dHB1dCB0ZW5zb3Igb2YgdGhlXG4gICAqIGxheWVyKS5cbiAgICovXG4gIG92ZXJyaWRlIGNvbXB1dGVNYXNrKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBtYXNrPzogVGVuc29yfFRlbnNvcltdKTogVGVuc29yXG4gICAgICB8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlucHV0cyA9IGdlbmVyaWNfdXRpbHMudG9MaXN0KGlucHV0cyk7XG4gICAgICBsZXQgbWFza3M6IFRlbnNvcltdO1xuICAgICAgaWYgKG1hc2sgPT0gbnVsbCkge1xuICAgICAgICBtYXNrcyA9IGdlbmVyaWNfdXRpbHMucHlMaXN0UmVwZWF0KG51bGwsIGlucHV0cy5sZW5ndGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWFza3MgPSBnZW5lcmljX3V0aWxzLnRvTGlzdChtYXNrKTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8obWljaGFlbHRlcnJ5KTogQWRkIHN1cHBvcnQgZm9yIG1hc2sgY2FjaGluZy5cbiAgICAgIHJldHVybiB0aGlzLnJ1bkludGVybmFsR3JhcGgoaW5wdXRzLCBtYXNrcylbMV07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZXMgdGhlIG91dHB1dCBzaGFwZSBvZiB0aGUgbGF5ZXIuXG4gICAqXG4gICAqIEFzc3VtZXMgdGhhdCB0aGUgbGF5ZXIgd2lsbCBiZSBidWlsdCB0byBtYXRjaCB0aGF0IGlucHV0IHNoYXBlIHByb3ZpZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRTaGFwZSBBIHNoYXBlICh0dXBsZSBvZiBpbnRlZ2Vycykgb3IgYSBsaXN0IG9mIHNoYXBlIHR1cGxlc1xuICAgKiAgIChvbmUgcGVyIG91dHB1dCB0ZW5zb3Igb2YgdGhlIGxheWVyKS4gU2hhcGUgdHVwbGVzIGNhbiBpbmNsdWRlIG51bGwgZm9yXG4gICAqICAgZnJlZSBkaW1lbnNpb25zLCBpbnN0ZWFkIG9mIGFuIGludGVnZXIuXG4gICAqL1xuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGNvbnN0IGlucHV0U2hhcGVzID0gdHlwZXNfdXRpbHMubm9ybWFsaXplU2hhcGVMaXN0KGlucHV0U2hhcGUpO1xuICAgIGlmIChpbnB1dFNoYXBlcy5sZW5ndGggIT09IHRoaXMuaW5wdXRMYXllcnMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBpbnB1dFNoYXBlIGFyZ3VtZW50ICR7aW5wdXRTaGFwZX06IGAgK1xuICAgICAgICAgIGBtb2RlbCBoYXMgJHt0aGlzLmlucHV0TGF5ZXJzLmxlbmd0aH0gdGVuc29yIGlucHV0cy5gKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IEFkZCBjYWNoaW5nXG4gICAgY29uc3QgbGF5ZXJzVG9PdXRwdXRTaGFwZXM6IHtbc2hhcGVLZXk6IHN0cmluZ106IFNoYXBlfSA9IHt9O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRTaGFwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5pbnB1dExheWVyc1tpXTtcbiAgICAgIGNvbnN0IGlucHV0U2hhcGUgPSBpbnB1dFNoYXBlc1tpXTtcbiAgICAgIC8vIEl0J3MgYW4gaW5wdXQgbGF5ZXI6IGNvbXB1dGVPdXRwdXRTaGFwZSBpcyBpZGVudGl0eSxcbiAgICAgIC8vIGFuZCB0aGVyZSBpcyBvbmx5IG9uZSBub2RlIGFuZCBvbmUgdGVuc29yIG91dHB1dC5cbiAgICAgIGNvbnN0IHNoYXBlS2V5ID0gbGF5ZXIubmFtZSArICdfMF8wJztcbiAgICAgIGxheWVyc1RvT3V0cHV0U2hhcGVzW3NoYXBlS2V5XSA9IGlucHV0U2hhcGU7XG4gICAgfVxuXG4gICAgY29uc3QgZGVwdGhLZXlzID0gT2JqZWN0LmtleXModGhpcy5ub2Rlc0J5RGVwdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoeCA9PiBwYXJzZUludCh4LCAxMCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5zb3J0KGdlbmVyaWNfdXRpbHMucmV2ZXJzZU51bWJlckNvbXBhcmUpO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBub2RlcywgYnkgZGVwdGggbGV2ZWwuXG4gICAgaWYgKGRlcHRoS2V5cy5sZW5ndGggPiAxKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcHRoIG9mIGRlcHRoS2V5cykge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRoaXMubm9kZXNCeURlcHRoW2RlcHRoXTtcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYSBzaW5nbGUgbGF5ZXIsIG5ldmVyIGEgbGlzdC5cbiAgICAgICAgICBjb25zdCBsYXllciA9IG5vZGUub3V0Ym91bmRMYXllcjtcbiAgICAgICAgICBpZiAodGhpcy5pbnB1dExheWVycy5tYXAoeCA9PiB4LmlkKS5pbmRleE9mKGxheWVyLmlkKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIC8vIFdlJ3ZlIGFscmVhZHkgY292ZXJlZCB0aGUgaW5wdXQgbGF5ZXJzIGEgZmV3IGxpbmVzIGFib3ZlLlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFBvdGVudGlhbGx5IHJlZHVuZGFudCBsaXN0LCBzYW1lIHNpemUgb2Ygbm9kZS5pbnB1dFRlbnNvcnMuXG4gICAgICAgICAgY29uc3QgaW5wdXRTaGFwZXM6IFNoYXBlW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5vZGUuaW5ib3VuZExheWVycy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgY29uc3QgaW5ib3VuZExheWVyID0gbm9kZS5pbmJvdW5kTGF5ZXJzW2pdO1xuICAgICAgICAgICAgY29uc3Qgbm9kZUluZGV4ID0gbm9kZS5ub2RlSW5kaWNlc1tqXTtcbiAgICAgICAgICAgIGNvbnN0IHRlbnNvckluZGV4ID0gbm9kZS50ZW5zb3JJbmRpY2VzW2pdO1xuICAgICAgICAgICAgY29uc3Qgc2hhcGVLZXkgPSBgJHtpbmJvdW5kTGF5ZXIubmFtZX1fJHtub2RlSW5kZXh9XyR7dGVuc29ySW5kZXh9YDtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0U2hhcGUgPSBsYXllcnNUb091dHB1dFNoYXBlc1tzaGFwZUtleV07XG4gICAgICAgICAgICBpbnB1dFNoYXBlcy5wdXNoKGlucHV0U2hhcGUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IG91dHB1dFNoYXBlID0gbGF5ZXIuY29tcHV0ZU91dHB1dFNoYXBlKFxuICAgICAgICAgICAgICBnZW5lcmljX3V0aWxzLnNpbmdsZXRvbk9yQXJyYXkoaW5wdXRTaGFwZXMpKTtcblxuICAgICAgICAgIGNvbnN0IG91dHB1dFNoYXBlcyA9IHR5cGVzX3V0aWxzLm5vcm1hbGl6ZVNoYXBlTGlzdChvdXRwdXRTaGFwZSk7XG4gICAgICAgICAgY29uc3Qgbm9kZUluZGV4ID0gbGF5ZXIuaW5ib3VuZE5vZGVzLmluZGV4T2Yobm9kZSk7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBvdXRwdXRTaGFwZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHNoYXBlS2V5ID0gYCR7bGF5ZXIubmFtZX1fJHtub2RlSW5kZXh9XyR7an1gO1xuICAgICAgICAgICAgbGF5ZXJzVG9PdXRwdXRTaGFwZXNbc2hhcGVLZXldID0gb3V0cHV0U2hhcGVzW2pdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlYWQgZmluYWwgb3V0cHV0IHNoYXBlcyBmcm9tIGxheWVyc1RvT3V0cHV0U2hhcGVzLlxuICAgIGNvbnN0IG91dHB1dFNoYXBlczogU2hhcGVbXSA9IFtdO1xuICAgIGNvbnN0IG91dHB1dFNoYXBlS2V5czogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub3V0cHV0TGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBsYXllciA9IHRoaXMub3V0cHV0TGF5ZXJzW2ldO1xuICAgICAgY29uc3Qgbm9kZUluZGV4ID0gdGhpcy5vdXRwdXRMYXllcnNOb2RlSW5kaWNlc1tpXTtcbiAgICAgIGNvbnN0IHRlbnNvckluZGV4ID0gdGhpcy5vdXRwdXRMYXllcnNUZW5zb3JJbmRpY2VzW2ldO1xuICAgICAgY29uc3Qgc2hhcGVLZXkgPSBgJHtsYXllci5uYW1lfV8ke25vZGVJbmRleH1fJHt0ZW5zb3JJbmRleH1gO1xuICAgICAgb3V0cHV0U2hhcGVLZXlzLnB1c2goc2hhcGVLZXkpO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0U2hhcGVLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBrZXkgPSBvdXRwdXRTaGFwZUtleXNbaV07XG4gICAgICBnZW5lcmljX3V0aWxzLmFzc2VydChrZXkgaW4gbGF5ZXJzVG9PdXRwdXRTaGFwZXMpO1xuICAgICAgb3V0cHV0U2hhcGVzLnB1c2gobGF5ZXJzVG9PdXRwdXRTaGFwZXNba2V5XSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBVcGRhdGUgY2FjaGVcbiAgICByZXR1cm4gZ2VuZXJpY191dGlscy5zaW5nbGV0b25PckFycmF5KG91dHB1dFNoYXBlcyk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZXMgb3V0cHV0IHRlbnNvcnMgZm9yIG5ldyBpbnB1dHMuXG4gICAqXG4gICAqIE5vdGU6XG4gICAqICAgLSBFeHBlY3RzIGBpbnB1dHNgIHRvIGJlIGEgbGlzdCAocG90ZW50aWFsbHkgd2l0aCAxIGVsZW1lbnQpLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRzIExpc3Qgb2YgdGVuc29yc1xuICAgKiBAcGFyYW0gbWFza3MgTGlzdCBvZiBtYXNrcyAodGVuc29ycyBvciBudWxsKS5cbiAgICogQHJldHVybiBUaHJlZSBsaXN0czogb3V0cHV0VGVuc29ycywgb3V0cHV0TWFza3MsIG91dHB1dFNoYXBlc1xuICAgKi9cbiAgcHJvdGVjdGVkIHJ1bkludGVybmFsR3JhcGgoaW5wdXRzOiBUZW5zb3JbXSwgbWFza3M/OiBUZW5zb3JbXSk6XG4gICAgICBbVGVuc29yW10sIFRlbnNvcltdLCBTaGFwZVtdXSB7XG4gICAgaWYgKG1hc2tzID09IG51bGwpIHtcbiAgICAgIG1hc2tzID0gZ2VuZXJpY191dGlscy5weUxpc3RSZXBlYXQobnVsbCwgaW5wdXRzLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgLy8gRGljdGlvbmFyeSBtYXBwaW5nIHJlZmVyZW5jZSB0ZW5zb3JzIHRvIHR1cGxlc1xuICAgIC8vIChjb21wdXRlZCB0ZW5zb3IsIGNvbXB1dGUgbWFzaylcbiAgICAvLyB3ZSBhc3N1bWUgYSAxOjEgbWFwcGluZyBmcm9tIHRlbnNvciB0byBtYXNrXG4gICAgLy8gVE9ETzogcmFpc2UgZXhjZXB0aW9uIHdoZW4gYSBgLmNvbXB1dGVNYXNrKClgIGNhbGxcbiAgICAvLyBkb2VzIG5vdCByZXR1cm4gYSBsaXN0IHRoZSBzYW1lIHNpemUgYXMgYGNhbGxgXG4gICAgY29uc3QgdGVuc29yTWFwOiB7W3RlbnNvcklEOiBzdHJpbmddOiBbVGVuc29yLCBUZW5zb3JdfSA9IHt9O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pbnB1dHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IHggPSB0aGlzLmlucHV0c1tpXTtcbiAgICAgIGNvbnN0IHkgPSBpbnB1dHNbaV07XG4gICAgICBjb25zdCBtYXNrID0gbWFza3NbaV07XG4gICAgICB0ZW5zb3JNYXBbeC5pZF0gPSBbeSwgbWFza107XG4gICAgfVxuXG4gICAgY29uc3QgZGVwdGhLZXlzID0gT2JqZWN0LmtleXModGhpcy5ub2Rlc0J5RGVwdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoeCA9PiBwYXJzZUludCh4LCAxMCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5zb3J0KGdlbmVyaWNfdXRpbHMucmV2ZXJzZU51bWJlckNvbXBhcmUpO1xuICAgIGZvciAoY29uc3QgZGVwdGggb2YgZGVwdGhLZXlzKSB7XG4gICAgICBjb25zdCBub2RlcyA9IHRoaXMubm9kZXNCeURlcHRoW2RlcHRoXTtcbiAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAvLyBUaGlzIGlzIGFsd2F5cyBhIHNpbmdsZSBsYXllciwgbmV2ZXIgYSBsaXN0LlxuICAgICAgICBjb25zdCBsYXllciA9IG5vZGUub3V0Ym91bmRMYXllcjtcbiAgICAgICAgY29uc3QgcmVmZXJlbmNlSW5wdXRUZW5zb3JzID0gbm9kZS5pbnB1dFRlbnNvcnM7XG4gICAgICAgIGNvbnN0IHJlZmVyZW5jZU91dHB1dFRlbnNvcnMgPSBub2RlLm91dHB1dFRlbnNvcnM7XG5cbiAgICAgICAgLy8gSWYgYWxsIHByZXZpb3VzIGlucHV0IHRlbnNvcnMgYXJlIGF2YWlsYWJsZSBpbiB0ZW5zb3JNYXAsXG4gICAgICAgIC8vIHRoZW4gY2FsbCBub2RlLmluYm91bmRMYXllciBvbiB0aGVtLlxuICAgICAgICAvLyBMaXN0IG9mIHR1cGxlcyBbaW5wdXQsIG1hc2tdOlxuICAgICAgICBjb25zdCBjb21wdXRlZERhdGEgPSBuZXcgQXJyYXk8W1RlbnNvciwgVGVuc29yXT4oKTtcbiAgICAgICAgZm9yIChjb25zdCB4IG9mIHJlZmVyZW5jZUlucHV0VGVuc29ycykge1xuICAgICAgICAgIGlmICh4LmlkIGluIHRlbnNvck1hcCkge1xuICAgICAgICAgICAgY29tcHV0ZWREYXRhLnB1c2godGVuc29yTWFwW3guaWRdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbXB1dGVkRGF0YS5sZW5ndGggPT09IHJlZmVyZW5jZUlucHV0VGVuc29ycy5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IEFkZCBLLm5hbWVfc2NvcGUgaGVyZSwgaWYgd2UgbmVlZCBpdC5cbiAgICAgICAgICBsZXQga3dhcmdzOiBLd2FyZ3MgPSB7fTtcbiAgICAgICAgICBsZXQgY29tcHV0ZWRUZW5zb3JzOiBUZW5zb3JbXTtcbiAgICAgICAgICBsZXQgY29tcHV0ZWRNYXNrczogVGVuc29yW107XG4gICAgICAgICAgbGV0IG91dHB1dFRlbnNvcnM6IFRlbnNvcltdO1xuICAgICAgICAgIGxldCBvdXRwdXRNYXNrczogVGVuc29yW107XG4gICAgICAgICAgLy8gY2FsbCBsYXllclxuICAgICAgICAgIGlmIChub2RlLmNhbGxBcmdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGt3YXJncyA9IG5vZGUuY2FsbEFyZ3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjb21wdXRlZERhdGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBbY29tcHV0ZWRUZW5zb3IsIGNvbXB1dGVkTWFza10gPSBjb21wdXRlZERhdGFbMF07XG4gICAgICAgICAgICBpZiAoa3dhcmdzWydtYXNrJ10gPT0gbnVsbCkge1xuICAgICAgICAgICAgICBrd2FyZ3NbJ21hc2snXSA9IGNvbXB1dGVkTWFzaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dFRlbnNvcnMgPVxuICAgICAgICAgICAgICAgIGdlbmVyaWNfdXRpbHMudG9MaXN0KGxheWVyLmNhbGwoY29tcHV0ZWRUZW5zb3IsIGt3YXJncykpO1xuICAgICAgICAgICAgb3V0cHV0TWFza3MgPSBnZW5lcmljX3V0aWxzLnRvTGlzdChcbiAgICAgICAgICAgICAgICBsYXllci5jb21wdXRlTWFzayhjb21wdXRlZFRlbnNvciwgY29tcHV0ZWRNYXNrKSk7XG4gICAgICAgICAgICBjb21wdXRlZFRlbnNvcnMgPSBbY29tcHV0ZWRUZW5zb3JdO1xuICAgICAgICAgICAgY29tcHV0ZWRNYXNrcyA9IFtjb21wdXRlZE1hc2tdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wdXRlZFRlbnNvcnMgPSBjb21wdXRlZERhdGEubWFwKHggPT4geFswXSk7XG4gICAgICAgICAgICBjb21wdXRlZE1hc2tzID0gY29tcHV0ZWREYXRhLm1hcCh4ID0+IHhbMV0pO1xuICAgICAgICAgICAgaWYgKGt3YXJnc1snbWFzayddID09IG51bGwpIHtcbiAgICAgICAgICAgICAga3dhcmdzWydtYXNrJ10gPSBjb21wdXRlZE1hc2tzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0VGVuc29ycyA9XG4gICAgICAgICAgICAgICAgZ2VuZXJpY191dGlscy50b0xpc3QobGF5ZXIuY2FsbChjb21wdXRlZFRlbnNvcnMsIGt3YXJncykpO1xuICAgICAgICAgICAgb3V0cHV0TWFza3MgPSBnZW5lcmljX3V0aWxzLnRvTGlzdChcbiAgICAgICAgICAgICAgICBsYXllci5jb21wdXRlTWFzayhjb21wdXRlZFRlbnNvcnMsIGNvbXB1dGVkTWFza3MpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobGF5ZXIuYWN0aXZpdHlSZWd1bGFyaXplcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgICAgICAgJ0xheWVyc01vZGVsIGludm9jYXRpb24gd2l0aCBjb25jcmV0ZSBUZW5zb3IgdmFsdWUocykgaW4gdGhlICcgK1xuICAgICAgICAgICAgICAgICdwcmVzZW5jZSBvZiBhY3Rpdml0eSByZWd1bGFyaXplcihzKSBpcyBub3Qgc3VwcG9ydGVkIHlldC4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBBZGQgbW9kZWwgdXBkYXRlcyBhbmQgbG9zc2VzXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGVuc29yIG1hcC5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZmVyZW5jZU91dHB1dFRlbnNvcnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGNvbnN0IHggPSByZWZlcmVuY2VPdXRwdXRUZW5zb3JzW2ldO1xuICAgICAgICAgICAgY29uc3QgeSA9IG91dHB1dFRlbnNvcnNbaV07XG4gICAgICAgICAgICBjb25zdCBtYXNrID0gb3V0cHV0TWFza3NbaV07XG4gICAgICAgICAgICB0ZW5zb3JNYXBbeC5pZF0gPSBbeSwgbWFza107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0VGVuc29yczogVGVuc29yW10gPSBbXTtcbiAgICBjb25zdCBvdXRwdXRNYXNrczogVGVuc29yW10gPSBbXTtcbiAgICBjb25zdCBvdXRwdXRTaGFwZXM6IFNoYXBlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHggb2YgdGhpcy5vdXRwdXRzKSB7XG4gICAgICBnZW5lcmljX3V0aWxzLmFzc2VydChcbiAgICAgICAgICB4LmlkIGluIHRlbnNvck1hcCwgYENvdWxkIG5vdCBjb21wdXRlIG91dHB1dCAke3gubmFtZX0gOiAke3guaWR9YCk7XG4gICAgICBjb25zdCBbdGVuc29yLCBtYXNrXSA9IHRlbnNvck1hcFt4LmlkXTtcbiAgICAgIG91dHB1dFNoYXBlcy5wdXNoKHRlbnNvci5zaGFwZSk7XG4gICAgICBvdXRwdXRUZW5zb3JzLnB1c2godGVuc29yKTtcbiAgICAgIG91dHB1dE1hc2tzLnB1c2gobWFzayk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBBZGQgc3VwcG9ydCBmb3IgY2FjaGVzLlxuICAgIHJldHVybiBbb3V0cHV0VGVuc29ycywgb3V0cHV0TWFza3MsIG91dHB1dFNoYXBlc107XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgbWFwIG9mIGludGVybmFsIG5vZGUga2V5cyB0byBub2RlIG9yZGVyaW5nLlxuICAgKiBVc2VkIGluIHNlcmlhbGl6YWlvbiBhIG5vZGUgb3JkZXJpbmdzIG1heSBjaGFuZ2UgYXMgdW51c2VkIG5vZGVzIGFyZVxuICAgKiBkcm9wcGVkLiBQb3J0aW5nIE5vdGU6ICBUaGlzIGhlbHBlciBtZXRob2Qgd2FzIHB1bGxlZCBvdXQgb2YgZ2V0Q29uZmlnIHRvXG4gICAqIGltcHJvdmUgcmVhZGFiaWxpdHkuXG4gICAqIEBwYXJhbSBsYXllcnMgQW4gYXJyYXkgb2YgTGF5ZXJzIGluIHRoZSBtb2RlbC5cbiAgICogQHJldHVybnMgTWFwIG9mIE5vZGUgS2V5cyB0byBpbmRleCBvcmRlciB3aXRoaW4gdGhlIGxheWVyLlxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZE5vZGVDb252ZXJzaW9uTWFwKGxheWVyczogTGF5ZXJbXSk6IHtbbm9kZUtleTogc3RyaW5nXTogbnVtYmVyfSB7XG4gICAgY29uc3Qgbm9kZUNvbnZlcnNpb25NYXA6IHtbbm9kZUtleTogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuICAgIGxldCBrZXB0Tm9kZXM6IG51bWJlcjtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMubGF5ZXJzKSB7XG4gICAgICBrZXB0Tm9kZXMgPSBsYXllciBpbnN0YW5jZW9mIENvbnRhaW5lciA/IDEgOiAwO1xuICAgICAgZm9yIChsZXQgb3JpZ2luYWxOb2RlSW5kZXggPSAwO1xuICAgICAgICAgICBvcmlnaW5hbE5vZGVJbmRleCA8IGxheWVyLmluYm91bmROb2Rlcy5sZW5ndGg7IG9yaWdpbmFsTm9kZUluZGV4KyspIHtcbiAgICAgICAgY29uc3Qgbm9kZUtleSA9IENvbnRhaW5lci5ub2RlS2V5KGxheWVyLCBvcmlnaW5hbE5vZGVJbmRleCk7XG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5lck5vZGVzLmhhcyhub2RlS2V5KSkge1xuICAgICAgICAgIC8vIGkuZS4gd2UgbWFyayBpdCB0byBiZSBzYXZlZFxuICAgICAgICAgIG5vZGVDb252ZXJzaW9uTWFwW25vZGVLZXldID0ga2VwdE5vZGVzO1xuICAgICAgICAgIGtlcHROb2RlcyArPSAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlQ29udmVyc2lvbk1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSBsYXllciBiYXNlZCBvbiBlaXRoZXIgaXRzIG5hbWUgKHVuaXF1ZSkgb3IgaW5kZXguXG4gICAqXG4gICAqIEluZGljZXMgYXJlIGJhc2VkIG9uIG9yZGVyIG9mIGhvcml6b250YWwgZ3JhcGggdHJhdmVyc2FsIChib3R0b20tdXApLlxuICAgKlxuICAgKiBJZiBib3RoIGBuYW1lYCBhbmQgYGluZGV4YCBhcmUgc3BlY2lmaWVkLCBgaW5kZXhgIHRha2VzIHByZWNlZGVuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgbGF5ZXIuXG4gICAqIEBwYXJhbSBpbmRleCBJbmRleCBvZiBsYXllci5cbiAgICogQHJldHVybnMgQSBMYXllciBpbnN0YW5jZS5cbiAgICogQHRocm93cyBWYWx1ZUVycm9yOiBJbiBjYXNlIG9mIGludmFsaWQgbGF5ZXIgbmFtZSBvciBpbmRleC5cbiAgICpcbiAgICogQGRvYyB7XG4gICAqICAgIGhlYWRpbmc6ICdMYXllcnMnLFxuICAgKiAgICBzdWJoZWFkaW5nOiAnQ2xhc3NlcycsXG4gICAqICAgIG5hbWVzcGFjZTogJ2xheWVycycsXG4gICAqICAgIHN1YmNsYXNzZXM6IFsnTGF5ZXJzTW9kZWwnXVxuICAgKiB9XG4gICAqL1xuICBnZXRMYXllcihuYW1lOiBzdHJpbmcpOiBMYXllcjtcbiAgZ2V0TGF5ZXIoaW5kZXg6IG51bWJlcik6IExheWVyO1xuICBnZXRMYXllcihuYW1lOiBzdHJpbmcsIGluZGV4OiBudW1iZXIpOiBMYXllcjtcbiAgZ2V0TGF5ZXIobmFtZU9ySW5kZXg/OiBzdHJpbmd8bnVtYmVyLCBpbmRleD86IG51bWJlcik6IExheWVyIHtcbiAgICBpZiAoaW5kZXggIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZmluZExheWVyKGluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG5hbWVPckluZGV4ID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoJ1Byb3ZpZGUgZWl0aGVyIGEgbGF5ZXIgbmFtZSBvciBsYXllciBpbmRleCcpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBuYW1lT3JJbmRleCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZExheWVyKG5hbWVPckluZGV4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMubGF5ZXJzKSB7XG4gICAgICBpZiAobGF5ZXIubmFtZSA9PT0gbmFtZU9ySW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGxheWVyO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihgTm8gc3VjaCBsYXllcjogJHtuYW1lT3JJbmRleH1gKTtcbiAgfVxuXG4gIGZpbmRMYXllcihpbmRleDogbnVtYmVyKTogTGF5ZXIge1xuICAgIGlmICh0aGlzLmxheWVycy5sZW5ndGggPD0gaW5kZXgpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBXYXMgYXNrZWQgdG8gcmV0cmlldmUgbGF5ZXIgYXQgaW5kZXggJHtpbmRleH0sIGJ1dCBtb2RlbCBvbmx5IGAgK1xuICAgICAgICAgIGBoYXMgJHt0aGlzLmxheWVycy5sZW5ndGh9IGxheWVyKHMpLmApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5sYXllcnNbaW5kZXhdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIENvbnRhaW5lcidzIGN1cnJlbnQgbG9zcyB2YWx1ZXMuXG4gICAqXG4gICAqIFVzZWQgZm9yIHJlZ3VsYXJpemVycyBkdXJpbmcgdHJhaW5pbmcuXG4gICAqL1xuICBvdmVycmlkZSBjYWxjdWxhdGVMb3NzZXMoKTogU2NhbGFyW10ge1xuICAgIC8vIFBvcnRpbmcgTm9kZTogVGhpcyBpcyBhbiBhdWdtZW50YXRpb24gdG8gQ29udGFpbmVyLmxvc3MgaW4gUHlLZXJhcy5cbiAgICAvLyAgIEluIFB5S2VyYXMsIENvbnRhaW5lci5sb3NzIHJldHVybnMgc3ltYm9saWMgdGVuc29ycy4gSGVyZSBhIGNvbmNyZXRlXG4gICAgLy8gICBUZW5zb3IgKHNwZWNpZmljYWxseSBTY2FsYXIpIHZhbHVlcyBhcmUgcmV0dXJuZWQuIFRoaXMgaXMgZHVlIHRvIHRoZVxuICAgIC8vICAgaW1wZXJhdGl2ZSBiYWNrZW5kLlxuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IGxvc3NlczogU2NhbGFyW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgbGF5ZXIgb2YgdGhpcy5sYXllcnMpIHtcbiAgICAgICAgZm9yIChsZXQgbm9kZUluZGV4ID0gMDsgbm9kZUluZGV4IDwgbGF5ZXIuaW5ib3VuZE5vZGVzLmxlbmd0aDtcbiAgICAgICAgICAgICArK25vZGVJbmRleCkge1xuICAgICAgICAgIGNvbnN0IG5vZGVLZXkgPSBDb250YWluZXIubm9kZUtleShsYXllciwgbm9kZUluZGV4KTtcbiAgICAgICAgICBpZiAodGhpcy5jb250YWluZXJOb2Rlcy5oYXMobm9kZUtleSkpIHtcbiAgICAgICAgICAgIGxvc3Nlcy5wdXNoKC4uLmxheWVyLmNhbGN1bGF0ZUxvc3NlcygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIFRPRE8oY2Fpcyk6IEFkZCBhbnkgdW5jb25kaXRpb25hbCBtb2RlbC1sZXZlbCBsb3NzZXM/XG4gICAgICByZXR1cm4gbG9zc2VzO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7bmFtZTogdGhpcy5uYW1lfTtcblxuICAgIC8vIEJ1aWxkIGEgbWFwIGZyb20gbGF5ZXIgdW5pcXVlIG5hbWUgKHNlbGYuX25vZGVfa2V5KVxuICAgIC8vIHRvIHRoZSBpbmRleCBvZiB0aGUgbm9kZXMgdGhhdCBhcmUgc2F2ZWQgaW4gdGhlIGNvbmZpZy5cbiAgICAvLyBPbmx5IG5vZGVzIGluIGNvbnRhaW5lcl9ub2RlcyBhcmUgc2F2ZWQuXG4gICAgY29uc3Qgbm9kZUNvbnZlcnNpb25NYXA6IHtbbm9kZUtleTogc3RyaW5nXTogbnVtYmVyfSA9XG4gICAgICAgIHRoaXMuYnVpbGROb2RlQ29udmVyc2lvbk1hcCh0aGlzLmxheWVycyk7XG5cbiAgICAvLyBTZXJpYWxpemUgYW5kIHNhdmUgdGhlIGxheWVycyBpbiBsYXllckNvbmZpZ3NcbiAgICBjb25zdCBsYXllckNvbmZpZ3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMubGF5ZXJzKSB7XG4gICAgICBjb25zdCBsYXllckNsYXNzTmFtZSA9IGxheWVyLmdldENsYXNzTmFtZSgpO1xuICAgICAgY29uc3QgbGF5ZXJDb25maWcgPSBsYXllci5nZXRDb25maWcoKTtcbiAgICAgIGNvbnN0IGZpbHRlcmVkSW5ib3VuZE5vZGVzID0gW107XG4gICAgICBmb3IgKGxldCBvcmlnaW5hbE5vZGVJbmRleCA9IDA7XG4gICAgICAgICAgIG9yaWdpbmFsTm9kZUluZGV4IDwgbGF5ZXIuaW5ib3VuZE5vZGVzLmxlbmd0aDsgb3JpZ2luYWxOb2RlSW5kZXgrKykge1xuICAgICAgICBjb25zdCBub2RlID0gbGF5ZXIuaW5ib3VuZE5vZGVzW29yaWdpbmFsTm9kZUluZGV4XTtcbiAgICAgICAgY29uc3Qgbm9kZUtleSA9IENvbnRhaW5lci5ub2RlS2V5KGxheWVyLCBvcmlnaW5hbE5vZGVJbmRleCk7XG4gICAgICAgIGxldCBrd2FyZ3MgPSB7fTtcbiAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyTm9kZXMuaGFzKG5vZGVLZXkpKSB7XG4gICAgICAgICAgLy8gVGhlIG5vZGUgaXMgcmVsZXZhbnQgdG8gdGhlIG1vZGVsOlxuICAgICAgICAgIC8vIGFkZCB0byBmaWx0ZXJlZEluYm91bmROb2Rlcy5cbiAgICAgICAgICBpZiAobm9kZS5jYWxsQXJncykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkobm9kZS5jYWxsQXJncyk7XG4gICAgICAgICAgICAgIGt3YXJncyA9IG5vZGUuY2FsbEFyZ3M7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgYExheWVyICR7bGF5ZXIubmFtZX0gd2FzIHBhc3NlZCBgICtcbiAgICAgICAgICAgICAgICAgIGBub24tc2VyaWFsaXphYmxlIGtleXdvcmQgYXJndW1lbnRzOiBgICtcbiAgICAgICAgICAgICAgICAgIGAke25vZGUuY2FsbEFyZ3N9LiBUaGV5IHdpbGwgbm90IGJlIGluY2x1ZGVkIGAgK1xuICAgICAgICAgICAgICAgICAgYGluIHRoZSBzZXJpYWxpemVkIG1vZGVsIChhbmQgdGh1cyB3aWxsIGJlIGAgK1xuICAgICAgICAgICAgICAgICAgYG1pc3NpbmcgYXQgZGVzZXJpYWxpemF0aW9uIHRpbWUpLmApO1xuICAgICAgICAgICAgICBrd2FyZ3MgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG5vZGUuaW5ib3VuZExheWVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmluYm91bmRMYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgY29uc3QgaW5ib3VuZExheWVyID0gbm9kZS5pbmJvdW5kTGF5ZXJzW2ldO1xuICAgICAgICAgICAgICBjb25zdCBub2RlSW5kZXggPSBub2RlLm5vZGVJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICBjb25zdCB0ZW5zb3JJbmRleCA9IG5vZGUudGVuc29ySW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgY29uc3Qgbm9kZUtleSA9IENvbnRhaW5lci5ub2RlS2V5KGluYm91bmRMYXllciwgbm9kZUluZGV4KTtcbiAgICAgICAgICAgICAgbGV0IG5ld05vZGVJbmRleCA9IG5vZGVDb252ZXJzaW9uTWFwW25vZGVLZXldO1xuICAgICAgICAgICAgICBpZiAobmV3Tm9kZUluZGV4ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBuZXdOb2RlSW5kZXggPSAwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG5vZGVEYXRhLnB1c2goXG4gICAgICAgICAgICAgICAgICBbaW5ib3VuZExheWVyLm5hbWUsIG5ld05vZGVJbmRleCwgdGVuc29ySW5kZXgsIGt3YXJnc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmlsdGVyZWRJbmJvdW5kTm9kZXMucHVzaChub2RlRGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBkaWN0OiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7fTtcbiAgICAgIGRpY3RbJ25hbWUnXSA9IGxheWVyLm5hbWU7XG4gICAgICBkaWN0WydjbGFzc05hbWUnXSA9IGxheWVyQ2xhc3NOYW1lO1xuICAgICAgZGljdFsnY29uZmlnJ10gPSBsYXllckNvbmZpZztcbiAgICAgIGRpY3RbJ2luYm91bmROb2RlcyddID0gZmlsdGVyZWRJbmJvdW5kTm9kZXM7XG4gICAgICBsYXllckNvbmZpZ3MucHVzaChkaWN0KTtcbiAgICB9XG4gICAgY29uZmlnWydsYXllcnMnXSA9IGxheWVyQ29uZmlncztcbiAgICAvLyBHYXRoZXIgaW5mbyBhYm91dCBpbnB1dHMgYW5kIG91dHB1dHNcbiAgICBjb25zdCBtb2RlbElucHV0cyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pbnB1dExheWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmlucHV0TGF5ZXJzW2ldO1xuICAgICAgY29uc3Qgbm9kZUluZGV4ID0gdGhpcy5pbnB1dExheWVyc05vZGVJbmRpY2VzW2ldO1xuXG4gICAgICBjb25zdCBub2RlS2V5ID0gQ29udGFpbmVyLm5vZGVLZXkobGF5ZXIsIG5vZGVJbmRleCk7XG4gICAgICBpZiAoIXRoaXMuY29udGFpbmVyTm9kZXMuaGFzKG5vZGVLZXkpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbGV0IG5ld05vZGVJbmRleCA9IG5vZGVDb252ZXJzaW9uTWFwW25vZGVLZXldO1xuICAgICAgaWYgKG5ld05vZGVJbmRleCA9PT0gbnVsbCB8fCBuZXdOb2RlSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuZXdOb2RlSW5kZXggPSAwO1xuICAgICAgfVxuICAgICAgY29uc3QgdGVuc29ySW5kZXggPSB0aGlzLmlucHV0TGF5ZXJzVGVuc29ySW5kaWNlc1tpXTtcbiAgICAgIG1vZGVsSW5wdXRzLnB1c2goW2xheWVyLm5hbWUsIG5ld05vZGVJbmRleCwgdGVuc29ySW5kZXhdKTtcbiAgICB9XG4gICAgY29uZmlnWydpbnB1dExheWVycyddID0gbW9kZWxJbnB1dHM7XG5cbiAgICBjb25zdCBtb2RlbE91dHB1dHMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub3V0cHV0TGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBsYXllciA9IHRoaXMub3V0cHV0TGF5ZXJzW2ldO1xuICAgICAgY29uc3Qgbm9kZUluZGV4ID0gdGhpcy5vdXRwdXRMYXllcnNOb2RlSW5kaWNlc1tpXTtcblxuICAgICAgY29uc3Qgbm9kZUtleSA9IENvbnRhaW5lci5ub2RlS2V5KGxheWVyLCBub2RlSW5kZXgpO1xuICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lck5vZGVzLmhhcyhub2RlS2V5KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxldCBuZXdOb2RlSW5kZXggPSBub2RlQ29udmVyc2lvbk1hcFtub2RlS2V5XTtcbiAgICAgIGlmIChuZXdOb2RlSW5kZXggPT09IG51bGwgfHwgbmV3Tm9kZUluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbmV3Tm9kZUluZGV4ID0gMDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRlbnNvckluZGV4ID0gdGhpcy5vdXRwdXRMYXllcnNUZW5zb3JJbmRpY2VzW2ldO1xuICAgICAgbW9kZWxPdXRwdXRzLnB1c2goW2xheWVyLm5hbWUsIG5ld05vZGVJbmRleCwgdGVuc29ySW5kZXhdKTtcbiAgICB9XG4gICAgY29uZmlnWydvdXRwdXRMYXllcnMnXSA9IG1vZGVsT3V0cHV0cztcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhIExheWVyc01vZGVsIGZyb20gaXRzIGNvbmZpZyAob3V0cHV0IG9mIGBnZXRfY29uZmlnKClgKS5cbiAgICogQHBhcmFtIGNscyB0aGUgY2xhc3MgdG8gY3JlYXRlXG4gICAqIEBwYXJhbSBjb25maWcgTGF5ZXJzTW9kZWwgY29uZmlnIGRpY3Rpb25hcnkuXG4gICAqIEBwYXJhbSBjdXN0b21PYmplY3RzIEFuIG9wdGlvbmFsIGRpY3Rpb25hcnkgb2YgY3VzdG9tIG9iamVjdHMuXG4gICAqIEBwYXJhbSBmYXN0V2VpZ2h0SW5pdCBPcHRpb25hbCBmbGFnIHRvIHVzZSBmYXN0IHdlaWdodCBpbml0aWFsaXphdGlvblxuICAgKiAgIGR1cmluZyBkZXNlcmlhbGl6YXRpb24uIFRoaXMgaXMgYXBwbGljYWJsZSB0byBjYXNlcyBpbiB3aGljaFxuICAgKiAgIHRoZSBpbml0aWFsaXphdGlvbiB3aWxsIGJlIGltbWVkaWF0ZWx5IG92ZXJ3cml0dGVuIGJ5IGxvYWRlZCB3ZWlnaHRcbiAgICogICB2YWx1ZXMuIERlZmF1bHQ6IGBmYWxzZWAuXG4gICAqIEByZXR1cm5zIEEgTGF5ZXJzTW9kZWwgaW5zdGFuY2UuXG4gICAqIEB0aHJvd3MgVmFsdWVFcnJvcjogSW4gY2FzZSBvZiBpbXByb3Blcmx5IGZvcm1hdHRlZCBjb25maWcgZGljdC5cbiAgICovXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgZnJvbUNvbmZpZzxUIGV4dGVuZHMgc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGU+KFxuICAgICAgY2xzOiBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFQ+LFxuICAgICAgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QsXG4gICAgICBjdXN0b21PYmplY3RzID0ge30gYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0LFxuICAgICAgZmFzdFdlaWdodEluaXQgPSBmYWxzZSk6IFQge1xuICAgIC8vIExheWVyIGluc3RhbmNlcyBjcmVhdGVkIGR1cmluZ1xuICAgIC8vIHRoZSBncmFwaCByZWNvbnN0cnVjdGlvbiBwcm9jZXNzXG4gICAgY29uc3QgY3JlYXRlZExheWVyczoge1tsYXllck5hbWU6IHN0cmluZ106IExheWVyfSA9IHt9O1xuXG4gICAgLy8gRGljdGlvbmFyeSBtYXBwaW5nIGxheWVyIGluc3RhbmNlcyB0b1xuICAgIC8vIG5vZGUgZGF0YSB0aGF0IHNwZWNpZmllcyBhIGxheWVyIGNhbGwuXG4gICAgLy8gSXQgYWN0cyBhcyBhIHF1ZXVlIHRoYXQgbWFpbnRhaW5zIGFueSB1bnByb2Nlc3NlZFxuICAgIC8vIGxheWVyIGNhbGwgdW50aWwgaXQgYmVjb21lcyBwb3NzaWJsZSB0byBwcm9jZXNzIGl0XG4gICAgLy8gKGkuZS4gdW50aWwgdGhlIGlucHV0IHRlbnNvcnMgdG8gdGhlIGNhbGwgYWxsIGV4aXN0KS5cbiAgICBjb25zdCB1bnByb2Nlc3NlZE5vZGVzOiB7W2xheWVyOiBzdHJpbmddOiBUZW5zb3JLZXlXaXRoQXJnc0FycmF5W11bXX0gPSB7fTtcbiAgICBmdW5jdGlvbiBhZGRVbnByb2Nlc3NlZE5vZGUoXG4gICAgICAgIGxheWVyOiBMYXllciwgbm9kZURhdGE6IFRlbnNvcktleVdpdGhBcmdzQXJyYXlbXSkge1xuICAgICAgaWYgKCEobGF5ZXIubmFtZSBpbiB1bnByb2Nlc3NlZE5vZGVzKSkge1xuICAgICAgICB1bnByb2Nlc3NlZE5vZGVzW2xheWVyLm5hbWVdID0gW25vZGVEYXRhXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVucHJvY2Vzc2VkTm9kZXNbbGF5ZXIubmFtZV0ucHVzaChub2RlRGF0YSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc05vZGUobGF5ZXI6IExheWVyLCBub2RlRGF0YTogVGVuc29yS2V5V2l0aEFyZ3NBcnJheVtdKSB7XG4gICAgICBjb25zdCBpbnB1dFRlbnNvcnM6IFN5bWJvbGljVGVuc29yW10gPSBbXTtcbiAgICAgIGxldCBrd2FyZ3M7XG4gICAgICBmb3IgKGNvbnN0IGlucHV0RGF0YSBvZiBub2RlRGF0YSkge1xuICAgICAgICBjb25zdCBpbmJvdW5kTGF5ZXJOYW1lID0gaW5wdXREYXRhWzBdO1xuICAgICAgICBjb25zdCBpbmJvdW5kTm9kZUluZGV4ID0gaW5wdXREYXRhWzFdO1xuICAgICAgICBjb25zdCBpbmJvdW5kVGVuc29ySW5kZXggPSBpbnB1dERhdGFbMl07XG5cbiAgICAgICAga3dhcmdzID0gaW5wdXREYXRhWzNdID09IG51bGwgP1xuICAgICAgICAgICAge30gOlxuICAgICAgICAgICAgaW5wdXREYXRhWzNdIGFzIHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdDtcbiAgICAgICAgaWYgKCEoaW5ib3VuZExheWVyTmFtZSBpbiBjcmVhdGVkTGF5ZXJzKSkge1xuICAgICAgICAgIGFkZFVucHJvY2Vzc2VkTm9kZShsYXllciwgbm9kZURhdGEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbmJvdW5kTGF5ZXIgPSBjcmVhdGVkTGF5ZXJzW2luYm91bmRMYXllck5hbWVdO1xuICAgICAgICBpZiAoaW5ib3VuZExheWVyLmluYm91bmROb2Rlcy5sZW5ndGggPD0gaW5ib3VuZE5vZGVJbmRleCkge1xuICAgICAgICAgIGFkZFVucHJvY2Vzc2VkTm9kZShsYXllciwgbm9kZURhdGEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbmJvdW5kTm9kZSA9IGluYm91bmRMYXllci5pbmJvdW5kTm9kZXNbaW5ib3VuZE5vZGVJbmRleF07XG4gICAgICAgIGlucHV0VGVuc29ycy5wdXNoKGluYm91bmROb2RlLm91dHB1dFRlbnNvcnNbaW5ib3VuZFRlbnNvckluZGV4XSk7XG4gICAgICB9XG4gICAgICAvLyBDYWxsIGxheWVyIG9uIGl0cyBpbnB1dHMsIHRodXMgY3JlYXRpbmcgdGhlIG5vZGVcbiAgICAgIC8vIGFuZCBidWlsZGluZyB0aGUgbGF5ZXIgaWYgbmVlZGVkLlxuICAgICAgLy8gTm90ZTogVGhpcyBoYXMgRWFnZXIgdnMgR3JhcGggSW1wbGljYXRpb25zLlxuICAgICAgaWYgKGlucHV0VGVuc29ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxheWVyLmFwcGx5KFxuICAgICAgICAgICAgZ2VuZXJpY191dGlscy5zaW5nbGV0b25PckFycmF5KGlucHV0VGVuc29ycyksXG4gICAgICAgICAgICBrd2FyZ3MpOyAgLy8gd2FzICoqIGt3YXJnc1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc2VyaWFsaXplIGEgbGF5ZXIsIHRoZW4gY2FsbCBpdCBvbiBhcHByb3ByaWF0ZSBpbnB1dHMuXG4gICAgICogQHBhcmFtIGxheWVyRGF0YTogbGF5ZXIgY29uZmlnIGRpY3QuXG4gICAgICogQHRocm93cyBWYWx1ZUVycm9yOiBJbiBjYXNlIG9mIGltcHJvcGVybHkgZm9ybWF0dGVkIGBsYXllcl9kYXRhYFxuICAgICAqIGRpY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0xheWVyKGxheWVyRGF0YTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0fG51bGwpIHtcbiAgICAgIGNvbnN0IGxheWVyTmFtZSA9IGxheWVyRGF0YVsnbmFtZSddIGFzIHN0cmluZztcbiAgICAgIC8vIEluc3RhbnRpYXRlIGxheWVyLlxuICAgICAgY29uc3QgbGF5ZXIgPVxuICAgICAgICAgIGRlc2VyaWFsaXplTGF5ZXIoXG4gICAgICAgICAgICAgIGxheWVyRGF0YSxcbiAgICAgICAgICAgICAgY29uZmlnWydjdXN0b21PYmplY3RzJ10gIT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgICBjb25maWdbJ2N1c3RvbU9iamVjdHMnXSBhcyBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgOlxuICAgICAgICAgICAgICAgICAge30pIGFzIExheWVyO1xuICAgICAgbGF5ZXIuc2V0RmFzdFdlaWdodEluaXREdXJpbmdCdWlsZChmYXN0V2VpZ2h0SW5pdCk7XG4gICAgICBjcmVhdGVkTGF5ZXJzW2xheWVyTmFtZV0gPSBsYXllcjtcbiAgICAgIC8vIEdhdGhlciBsYXllciBpbnB1dHMuXG4gICAgICBjb25zdCBpbmJvdW5kTm9kZXNEYXRhID1cbiAgICAgICAgICBsYXllckRhdGFbJ2luYm91bmROb2RlcyddIGFzIFRlbnNvcktleVdpdGhBcmdzQXJyYXlbXVtdO1xuICAgICAgaW5ib3VuZE5vZGVzRGF0YS5mb3JFYWNoKG5vZGVEYXRhID0+IHtcbiAgICAgICAgaWYgKCEobm9kZURhdGEgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICAgYENvcnJ1cHRlZCBjb25maWd1cmF0aW9uLCBleHBlY3RlZCBhcnJheSBmb3Igbm9kZURhdGE6ICR7XG4gICAgICAgICAgICAgICAgICBub2RlRGF0YX1gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBkb24ndCBwcm9jZXNzIG5vZGVzIChpLmUuIG1ha2UgbGF5ZXIgY2FsbHMpXG4gICAgICAgIC8vIG9uIHRoZSBmbHkgYmVjYXVzZSB0aGUgaW5ib3VuZCBub2RlIG1heSBub3QgeWV0IGV4aXN0LFxuICAgICAgICAvLyBpbiBjYXNlIG9mIGxheWVyIHNoYXJlZCBhdCBkaWZmZXJlbnQgdG9wb2xvZ2ljYWwgZGVwdGhzXG4gICAgICAgIC8vIChlLmcuYSBtb2RlbCBzdWNoIGFzIEEoQihBKEIoeCkpKSkpXG4gICAgICAgIGFkZFVucHJvY2Vzc2VkTm9kZShsYXllciwgbm9kZURhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QsIHdlIGNyZWF0ZSBhbGwgbGF5ZXJzIGFuZCBlbnF1ZXVlIG5vZGVzIHRvIGJlIHByb2Nlc3NlZC5cbiAgICBjb25zdCBuYW1lID0gY29uZmlnWyduYW1lJ107XG4gICAgY29uc3QgbGF5ZXJzRnJvbUNvbmZpZyA9IGNvbmZpZ1snbGF5ZXJzJ10gYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0W107XG4gICAgZm9yIChjb25zdCBsYXllckRhdGEgb2YgbGF5ZXJzRnJvbUNvbmZpZykge1xuICAgICAgcHJvY2Vzc0xheWVyKGxheWVyRGF0YSk7XG4gICAgfVxuXG4gICAgLy8gVGhlbiB3ZSBwcm9jZXNzIG5vZGVzIGluIG9yZGVyIG9mIGxheWVyIGRlcHRoLlxuICAgIC8vIE5vZGVzIHRoYXQgY2Fubm90IHlldCBiZSBwcm9jZXNzZWQoaWYgdGhlIGluYm91bmQgbm9kZVxuICAgIC8vIGRvZXMgbm90IHlldCBleGlzdCkgYXJlIHJlIC0gZW5xdWV1ZWQsIGFuZCB0aGUgcHJvY2Vzc1xuICAgIC8vIGlzIHJlcGVhdGVkIHVudGlsIGFsbCBub2RlcyBhcmUgcHJvY2Vzc2VkLlxuICAgIHdoaWxlICghZ2VuZXJpY191dGlscy5pc09iamVjdEVtcHR5KHVucHJvY2Vzc2VkTm9kZXMpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxheWVyRGF0YSBvZiBsYXllcnNGcm9tQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGxheWVyID0gY3JlYXRlZExheWVyc1tsYXllckRhdGFbJ25hbWUnXSBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobGF5ZXIubmFtZSBpbiB1bnByb2Nlc3NlZE5vZGVzKSB7XG4gICAgICAgICAgY29uc3QgY3VycmVudFVucHJvY2Vzc2VkTm9kZXNGb3JMYXllciA9IHVucHJvY2Vzc2VkTm9kZXNbbGF5ZXIubmFtZV07XG4gICAgICAgICAgZGVsZXRlIHVucHJvY2Vzc2VkTm9kZXNbbGF5ZXIubmFtZV07XG4gICAgICAgICAgZm9yIChjb25zdCBub2RlRGF0YSBvZiBjdXJyZW50VW5wcm9jZXNzZWROb2Rlc0ZvckxheWVyKSB7XG4gICAgICAgICAgICBwcm9jZXNzTm9kZShsYXllciwgbm9kZURhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGlucHV0VGVuc29yczogU3ltYm9saWNUZW5zb3JbXSA9IFtdO1xuICAgIGNvbnN0IG91dHB1dFRlbnNvcnM6IFN5bWJvbGljVGVuc29yW10gPSBbXTtcbiAgICBjb25zdCBpbnB1dExheWVyc0Zyb21Db25maWcgPVxuICAgICAgICBjb25maWdbJ2lucHV0TGF5ZXJzJ10gYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0W107XG4gICAgZm9yIChjb25zdCBsYXllckRhdGEgb2YgaW5wdXRMYXllcnNGcm9tQ29uZmlnKSB7XG4gICAgICBjb25zdCBsYXllck5hbWUgPSBsYXllckRhdGFbMF0gYXMgc3RyaW5nO1xuICAgICAgY29uc3Qgbm9kZUluZGV4ID0gbGF5ZXJEYXRhWzFdIGFzIG51bWJlcjtcbiAgICAgIGNvbnN0IHRlbnNvckluZGV4ID0gbGF5ZXJEYXRhWzJdIGFzIG51bWJlcjtcbiAgICAgIGdlbmVyaWNfdXRpbHMuYXNzZXJ0KGxheWVyTmFtZSBpbiBjcmVhdGVkTGF5ZXJzKTtcbiAgICAgIGNvbnN0IGxheWVyID0gY3JlYXRlZExheWVyc1tsYXllck5hbWVdO1xuICAgICAgY29uc3QgbGF5ZXJPdXRwdXRUZW5zb3JzID0gbGF5ZXIuaW5ib3VuZE5vZGVzW25vZGVJbmRleF0ub3V0cHV0VGVuc29ycztcbiAgICAgIGlucHV0VGVuc29ycy5wdXNoKGxheWVyT3V0cHV0VGVuc29yc1t0ZW5zb3JJbmRleF0pO1xuICAgIH1cbiAgICBjb25zdCBvdXRwdXRMYXllcnNGcm9tQ29uZmlnID1cbiAgICAgICAgY29uZmlnWydvdXRwdXRMYXllcnMnXSBhcyBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3RbXTtcbiAgICBmb3IgKGNvbnN0IGxheWVyRGF0YSBvZiBvdXRwdXRMYXllcnNGcm9tQ29uZmlnKSB7XG4gICAgICBjb25zdCBsYXllck5hbWUgPSBsYXllckRhdGFbMF0gYXMgc3RyaW5nO1xuICAgICAgY29uc3Qgbm9kZUluZGV4ID0gbGF5ZXJEYXRhWzFdIGFzIG51bWJlcjtcbiAgICAgIGNvbnN0IHRlbnNvckluZGV4ID0gbGF5ZXJEYXRhWzJdIGFzIG51bWJlcjtcbiAgICAgIGdlbmVyaWNfdXRpbHMuYXNzZXJ0KGxheWVyTmFtZSBpbiBjcmVhdGVkTGF5ZXJzKTtcbiAgICAgIGNvbnN0IGxheWVyID0gY3JlYXRlZExheWVyc1tsYXllck5hbWVdO1xuICAgICAgY29uc3QgbGF5ZXJPdXRwdXRUZW5zb3JzID0gbGF5ZXIuaW5ib3VuZE5vZGVzW25vZGVJbmRleF0ub3V0cHV0VGVuc29ycztcbiAgICAgIG91dHB1dFRlbnNvcnMucHVzaChsYXllck91dHB1dFRlbnNvcnNbdGVuc29ySW5kZXhdKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBjbHMoe2lucHV0czogaW5wdXRUZW5zb3JzLCBvdXRwdXRzOiBvdXRwdXRUZW5zb3JzLCBuYW1lfSk7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGNvbnRhaW5lciBpcyBzdGF0ZWZ1bC5cbiAgICpcbiAgICogUG9ydGluZyBOb3RlOiB0aGlzIGlzIHRoZSBlcXVpdmFsZW50IG9mIHRoZSBzdGF0ZWZ1bCBAcHJvcGVydHkgb2ZcbiAgICogICB0aGUgQ29udGFpbmVyIGNsYXNzIGluIFB5S2VyYXMuXG4gICAqL1xuICBvdmVycmlkZSBnZXQgc3RhdGVmdWwoKTogYm9vbGVhbiB7XG4gICAgLy8gUG9ydGluZyBOb3RlOiBUaGlzIGNoZWNrIGlzIHRvIHByZXZlbnQgaW5hZHZlcnRlbnQgc2V0dGluZyBvZiB0aGVcbiAgICAvLyAgIF9zdGF0ZWZ1bCBwcm9wZXJ0eSBvZiB0aGUgQ29udGFpbmVyIGluc3RhbmNlLlxuICAgIGlmICh0aGlzLl9zdGF0ZWZ1bCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ0NvbnRhaW5lciBpbnN0YW5jZSB1bmV4cGVjdGVkbHkgaGFzIF9zdGF0ZWZ1bCA9IHRydWUuIFRoZSAnICtcbiAgICAgICAgICAnc3RhdGVmdWxuZXNzIG9mIGEgQ29udGFpbmVyIGlzIGRldGVybWluZWQgYnkgdGhlIExheWVycyBpdCAnICtcbiAgICAgICAgICAnY29udGFpbnMuIEl0cyBfc3RhdGVmdWwgcHJvcGVydHkgbXVzdCByZW1haW4gdGhlIGRlZmF1bHQgZmFsc2UuJyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbGF5ZXIgb2YgdGhpcy5sYXllcnMpIHtcbiAgICAgIGlmIChsYXllci5zdGF0ZWZ1bCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0IHRoZSBzdGF0ZSBvZiBhbGwgc3RhdGVmdWwgY29uc3RpdHVlbnQgbGF5ZXJzIChpZiBhbnkpLlxuICAgKlxuICAgKiBFeGFtcGxlcyBvZiBzdGF0ZWZ1bCBsYXllcnMgaW5jbHVkZSBSTk4gbGF5ZXJzIHdob3NlIGBzdGF0ZWZ1bGAgcHJvcGVydHlcbiAgICogaXMgc2V0IGFzIGB0cnVlYC5cbiAgICovXG4gIG92ZXJyaWRlIHJlc2V0U3RhdGVzKCkge1xuICAgIHRpZHkoKCkgPT4ge1xuICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaChsYXllciA9PiB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWFueVxuICAgICAgICBpZiAobGF5ZXIuc3RhdGVmdWwpIHtcbiAgICAgICAgICBsYXllci5yZXNldFN0YXRlcygpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRzbGludDplbmFibGU6bm8tYW55XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIl19