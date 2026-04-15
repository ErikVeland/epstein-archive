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
import { serialization, tidy, util } from '@tensorflow/tfjs-core';
import { getNextUniqueTensorId, getUid } from '../backend/state';
import { getScopedTensorName, getUniqueTensorName, nameScope } from '../common';
import { AttributeError, NotImplementedError, RuntimeError, ValueError } from '../errors';
import { getInitializer } from '../initializers';
import * as generic_utils from '../utils/generic_utils';
import * as types_utils from '../utils/types_utils';
import * as variable_utils from '../utils/variable_utils';
import { batchGetValue, batchSetValue, LayerVariable } from '../variables';
/**
 * Specifies the ndim, dtype and shape of every input to a layer.
 *
 * Every layer should expose (if appropriate) an `inputSpec` attribute:
 * a list of instances of InputSpec (one per input tensor).
 *
 * A null entry in a shape is compatible with any dimension,
 * a null shape is compatible with any shape.
 */
export class InputSpec {
    constructor(args) {
        this.dtype = args.dtype;
        this.shape = args.shape;
        /*
          TODO(michaelterry): Could throw error if ndim and shape are both defined
            (then backport).
        */
        if (args.shape != null) {
            this.ndim = args.shape.length;
        }
        else {
            this.ndim = args.ndim;
        }
        this.maxNDim = args.maxNDim;
        this.minNDim = args.minNDim;
        this.axes = args.axes || {};
    }
}
/**
 * `tf.SymbolicTensor` is a placeholder for a Tensor without any concrete value.
 *
 * They are most often encountered when building a graph of `Layer`s for a
 * `tf.LayersModel` and the input data's shape, but not values are known.
 *
 * @doc {heading: 'Models', 'subheading': 'Classes'}
 */
export class SymbolicTensor {
    /**
     *
     * @param dtype
     * @param shape
     * @param sourceLayer The Layer that produced this symbolic tensor.
     * @param inputs The inputs passed to sourceLayer's __call__() method.
     * @param nodeIndex
     * @param tensorIndex
     * @param callArgs The keyword arguments passed to the __call__() method.
     * @param name
     * @param outputTensorIndex The index of this tensor in the list of outputs
     *   returned by apply().
     */
    constructor(dtype, shape, sourceLayer, inputs, callArgs, name, outputTensorIndex) {
        this.dtype = dtype;
        this.shape = shape;
        this.sourceLayer = sourceLayer;
        this.inputs = inputs;
        this.callArgs = callArgs;
        this.outputTensorIndex = outputTensorIndex;
        this.id = getNextUniqueTensorId();
        if (name != null) {
            this.originalName = getScopedTensorName(name);
            this.name = getUniqueTensorName(this.originalName);
        }
        this.rank = shape.length;
    }
}
let _nextNodeID = 0;
/**
 * A `Node` describes the connectivity between two layers.
 *
 * Each time a layer is connected to some new input,
 * a node is added to `layer.inboundNodes`.
 *
 * Each time the output of a layer is used by another layer,
 * a node is added to `layer.outboundNodes`.
 *
 * `nodeIndices` and `tensorIndices` are basically fine-grained coordinates
 * describing the origin of the `inputTensors`, verifying the following:
 *
 * `inputTensors[i] ==
 * inboundLayers[i].inboundNodes[nodeIndices[i]].outputTensors[
 *   tensorIndices[i]]`
 *
 * A node from layer A to layer B is added to:
 *     A.outboundNodes
 *     B.inboundNodes
 */
export class Node {
    constructor(args, 
    // TODO(michaelterry): Define actual type for this.
    callArgs) {
        this.callArgs = callArgs;
        this.id = _nextNodeID++;
        /*
          Layer instance (NOT a list).
          this is the layer that takes a list of input tensors
          and turns them into a list of output tensors.
          the current node will be added to
          the inboundNodes of outboundLayer.
        */
        this.outboundLayer = args.outboundLayer;
        /*
            The following 3 properties describe where
            the input tensors come from: which layers,
            and for each layer, which node and which
            tensor output of each node.
        */
        // List of layer instances.
        this.inboundLayers = args.inboundLayers;
        // List of integers, 1:1 mapping with inboundLayers.
        this.nodeIndices = args.nodeIndices;
        // List of integers, 1:1 mapping with inboundLayers.
        this.tensorIndices = args.tensorIndices;
        /*
            Following 2 properties:
            tensor inputs and outputs of outboundLayer.
        */
        // List of tensors. 1:1 mapping with inboundLayers.
        this.inputTensors = args.inputTensors;
        // List of tensors, created by outboundLayer.call().
        this.outputTensors = args.outputTensors;
        /*
            Following 2 properties: input and output masks.
            List of tensors, 1:1 mapping with inputTensor.
        */
        this.inputMasks = args.inputMasks;
        // List of tensors, created by outboundLayer.computeMask().
        this.outputMasks = args.outputMasks;
        // Following 2 properties: input and output shapes.
        // List of shape tuples, shapes of inputTensors.
        this.inputShapes = args.inputShapes;
        // List of shape tuples, shapes of outputTensors.
        this.outputShapes = args.outputShapes;
        // Add nodes to all layers involved.
        for (const layer of args.inboundLayers) {
            if (layer != null) {
                layer.outboundNodes.push(this);
            }
        }
        args.outboundLayer.inboundNodes.push(this);
    }
    getConfig() {
        const inboundNames = [];
        for (const layer of this.inboundLayers) {
            if (layer != null) {
                inboundNames.push(layer.name);
            }
            else {
                inboundNames.push(null);
            }
        }
        return {
            outboundLayer: this.outboundLayer ? this.outboundLayer.name : null,
            inboundLayers: inboundNames,
            nodeIndices: this.nodeIndices,
            tensorIndices: this.tensorIndices
        };
    }
}
let _nextLayerID = 0;
/**
 * A layer is a grouping of operations and weights that can be composed to
 * create a `tf.LayersModel`.
 *
 * Layers are constructed by using the functions under the
 * [tf.layers](#Layers-Basic) namespace.
 *
 * @doc {heading: 'Layers', subheading: 'Classes', namespace: 'layers'}
 */
export class Layer extends serialization.Serializable {
    constructor(args = {}) {
        super();
        this._callHook = null;
        this._addedWeightNames = [];
        // Porting Notes: PyKeras does not have this property in this base Layer
        //   class. Instead lets Layer subclass set it dynamically and checks the
        //   value with `hasattr`. In tfjs-layers, we let this be a member of this
        //   base class.
        this._stateful = false;
        this.id = _nextLayerID++;
        this.activityRegularizer = null;
        this.inputSpec = null;
        this.supportsMasking = false;
        // These properties will be set upon call of this.build()
        this._trainableWeights = [];
        this._nonTrainableWeights = [];
        this._losses = [];
        this._updates = [];
        this._built = false;
        /*
          These lists will be filled via successive calls
          to this.addInboundNode().
         */
        this.inboundNodes = [];
        this.outboundNodes = [];
        let name = args.name;
        if (!name) {
            const prefix = this.getClassName();
            name = generic_utils.toSnakeCase(prefix) + '_' + getUid(prefix);
        }
        this.name = name;
        this.trainable_ = args.trainable == null ? true : args.trainable;
        if (args.inputShape != null || args.batchInputShape != null) {
            /*
              In this case we will later create an input layer
              to insert before the current layer
             */
            let batchInputShape;
            if (args.batchInputShape != null) {
                batchInputShape = args.batchInputShape;
            }
            else if (args.inputShape != null) {
                let batchSize = null;
                if (args.batchSize != null) {
                    batchSize = args.batchSize;
                }
                batchInputShape = [batchSize].concat(args.inputShape);
            }
            this.batchInputShape = batchInputShape;
            // Set dtype.
            let dtype = args.dtype;
            if (dtype == null) {
                dtype = args.inputDType;
            }
            if (dtype == null) {
                dtype = 'float32';
            }
            this.dtype = dtype;
        }
        if (args.weights != null) {
            this.initialWeights = args.weights;
        }
        else {
            this.initialWeights = null;
        }
        // The value of `_refCount` is initialized to null. When the layer is used
        // in a symbolic way for the first time, it will be set to 1.
        this._refCount = null;
        this.fastWeightInitDuringBuild = false;
    }
    /**
     * Converts a layer and its index to a unique (immutable type) name.
     * This function is used internally with `this.containerNodes`.
     * @param layer The layer.
     * @param nodeIndex The layer's position (e.g. via enumerate) in a list of
     *   nodes.
     *
     * @returns The unique name.
     */
    static nodeKey(layer, nodeIndex) {
        return layer.name + '_ib-' + nodeIndex.toString();
    }
    /**
     * Returns this.inboundNode at index nodeIndex.
     *
     * Porting note: This is a replacement for _get_node_attribute_at_index()
     * @param nodeIndex
     * @param attrName The name of the attribute related to request for this node.
     */
    getNodeAtIndex(nodeIndex, attrName) {
        if (this.inboundNodes.length === 0) {
            throw new RuntimeError('The layer has never been called ' +
                `and thus has no defined ${attrName}.`);
        }
        if (this.inboundNodes.length <= nodeIndex) {
            throw new ValueError(`Asked to get ${attrName} at node ${nodeIndex}, ` +
                `but the layer has only ${this.inboundNodes.length} inbound nodes.`);
        }
        return this.inboundNodes[nodeIndex];
    }
    /**
     * Retrieves the input tensor(s) of a layer at a given node.
     *
     * @param nodeIndex Integer, index of the node from which to retrieve the
     *   attribute. E.g. `nodeIndex=0` will correspond to the first time the layer
     *   was called.
     *
     * @return A tensor (or list of tensors if the layer has multiple inputs).
     */
    getInputAt(nodeIndex) {
        return generic_utils.singletonOrArray(this.getNodeAtIndex(nodeIndex, 'input').inputTensors);
    }
    /**
     * Retrieves the output tensor(s) of a layer at a given node.
     *
     * @param nodeIndex Integer, index of the node from which to retrieve the
     *   attribute. E.g. `nodeIndex=0` will correspond to the first time the layer
     *   was called.
     *
     * @return A tensor (or list of tensors if the layer has multiple outputs).
     */
    getOutputAt(nodeIndex) {
        return generic_utils.singletonOrArray(this.getNodeAtIndex(nodeIndex, 'output').outputTensors);
    }
    // Properties
    /**
     * Retrieves the input tensor(s) of a layer.
     *
     * Only applicable if the layer has exactly one inbound node,
     * i.e. if it is connected to one incoming layer.
     *
     * @return Input tensor or list of input tensors.
     *
     * @exception AttributeError if the layer is connected to more than one
     *   incoming layers.
     */
    get input() {
        if (this.inboundNodes.length > 1) {
            throw new AttributeError(`Layer ${this.name}` +
                ' has multiple inbound nodes, ' +
                'hence the notion of "layer input" ' +
                'is ill-defined. ' +
                'Use `getInputAt(nodeIndex)` instead.');
        }
        else if (this.inboundNodes.length === 0) {
            throw new AttributeError(`Layer ${this.name}` +
                ' is not connected, no input to return.');
        }
        return generic_utils.singletonOrArray(this.getNodeAtIndex(0, 'input').inputTensors);
    }
    /**
     * Retrieves the output tensor(s) of a layer.
     *
     * Only applicable if the layer has exactly one inbound node,
     * i.e. if it is connected to one incoming layer.
     *
     * @return Output tensor or list of output tensors.
     *
     * @exception AttributeError if the layer is connected to more than one
     *   incoming layers.
     */
    get output() {
        if (this.inboundNodes.length === 0) {
            throw new AttributeError(`Layer ${this.name}` +
                ' has no inbound nodes.');
        }
        if (this.inboundNodes.length > 1) {
            throw new AttributeError(`Layer ${this.name}` +
                ' has multiple inbound nodes, ' +
                'hence the notion of "layer output" ' +
                'is ill-defined. ' +
                'Use `getOutputAt(nodeIndex)` instead.');
        }
        return generic_utils.singletonOrArray(this.getNodeAtIndex(0, 'output').outputTensors);
    }
    get losses() {
        return this._losses;
    }
    /**
     * Retrieves the Layer's current loss values.
     *
     * Used for regularizers during training.
     */
    calculateLosses() {
        // Porting Node: This is an augmentation to Layer.loss in PyKeras.
        //   In PyKeras, Layer.loss returns symbolic tensors. Here a concrete
        //   Tensor (specifically Scalar) values are returned. This is due to the
        //   imperative backend.
        return this.losses.map(lossFn => lossFn());
    }
    get updates() {
        return this._updates;
    }
    get built() {
        return this._built;
    }
    set built(built) {
        this._built = built;
    }
    get trainable() {
        return this.trainable_;
    }
    set trainable(trainable) {
        this._trainableWeights.forEach(w => w.trainable = trainable);
        this.trainable_ = trainable;
    }
    get trainableWeights() {
        if (this.trainable_) {
            return this._trainableWeights.filter(w => w.trainable);
        }
        else {
            return [];
        }
    }
    set trainableWeights(weights) {
        this._trainableWeights = weights;
    }
    get nonTrainableWeights() {
        if (this.trainable) {
            return this._trainableWeights.filter(w => !w.trainable)
                .concat(this._nonTrainableWeights);
        }
        else {
            return this._trainableWeights.concat(this._nonTrainableWeights);
        }
    }
    set nonTrainableWeights(weights) {
        this._nonTrainableWeights = weights;
    }
    /**
     * The concatenation of the lists trainableWeights and nonTrainableWeights
     * (in this order).
     */
    get weights() {
        return this.trainableWeights.concat(this.nonTrainableWeights);
    }
    get stateful() {
        return this._stateful;
    }
    /**
     * Reset the states of the layer.
     *
     * This method of the base Layer class is essentially a no-op.
     * Subclasses that are stateful (e.g., stateful RNNs) should override this
     * method.
     */
    resetStates() {
        if (!this.stateful) {
            throw new Error('Cannot call the resetStates() method of a non-stateful Layer ' +
                'object.');
        }
    }
    /**
     * Checks compatibility between the layer and provided inputs.
     *
     * This checks that the tensor(s) `input`
     * verify the input assumptions of the layer
     * (if any). If not, exceptions are raised.
     *
     * @param inputs Input tensor or list of input tensors.
     *
     * @exception ValueError in case of mismatch between
     *   the provided inputs and the expectations of the layer.
     */
    assertInputCompatibility(inputs) {
        const inputsList = generic_utils.toList(inputs);
        if (this.inputSpec == null || this.inputSpec.length === 0) {
            return;
        }
        const inputSpec = generic_utils.toList(this.inputSpec);
        if (inputsList.length !== inputSpec.length) {
            throw new ValueError(`Layer ${this.name} expects ${inputSpec.length} inputs, ` +
                `but it received ${inputsList.length} input tensors. ` +
                `Input received: ${inputs}`);
        }
        for (let inputIndex = 0; inputIndex < inputsList.length; inputIndex++) {
            const x = inputsList[inputIndex];
            const spec = inputSpec[inputIndex];
            if (spec == null) {
                continue;
            }
            // Check ndim.
            const ndim = x.rank;
            if (spec.ndim != null) {
                if (ndim !== spec.ndim) {
                    throw new ValueError(`Input ${inputIndex} is incompatible with layer ${this.name}: ` +
                        `expected ndim=${spec.ndim}, found ndim=${ndim}`);
                }
            }
            if (spec.maxNDim != null) {
                if (ndim > spec.maxNDim) {
                    throw new ValueError(`Input ${inputIndex} is incompatible with layer ${this.name}` +
                        `: expected max_ndim=${spec.maxNDim}, found ndim=${ndim}`);
                }
            }
            if (spec.minNDim != null) {
                if (ndim < spec.minNDim) {
                    throw new ValueError(`Input ${inputIndex} is incompatible with layer ${this.name}` +
                        `: expected min_ndim=${spec.minNDim}, found ndim=${ndim}.`);
                }
            }
            // Check dtype.
            if (spec.dtype != null) {
                if (x.dtype !== spec.dtype) {
                    throw new ValueError(`Input ${inputIndex} is incompatible with layer ${this.name} ` +
                        `: expected dtype=${spec.dtype}, found dtype=${x.dtype}.`);
                }
            }
            // Check specific shape axes.
            if (spec.axes) {
                const xShape = x.shape;
                for (const key in spec.axes) {
                    const axis = Number(key);
                    const value = spec.axes[key];
                    // Perform Python-style slicing in case axis < 0;
                    // TODO(cais): Use https://github.com/alvivi/typescript-underscore to
                    // ensure type safety through Underscore calls.
                    const xShapeAtAxis = axis >= 0 ? xShape[axis] : xShape[xShape.length + axis];
                    if (value != null && [value, null].indexOf(xShapeAtAxis) === -1) {
                        throw new ValueError(`Input ${inputIndex} is incompatible with layer ` +
                            `${this.name}: expected axis ${axis} of input shape to ` +
                            `have value ${value} but got shape ${xShape}.`);
                    }
                }
            }
            // Check shape.
            if (spec.shape != null) {
                for (let i = 0; i < spec.shape.length; ++i) {
                    const specDim = spec.shape[i];
                    const dim = x.shape[i];
                    if (specDim != null && dim != null) {
                        if (specDim !== dim) {
                            throw new ValueError(`Input ${inputIndex} is incompatible with layer ` +
                                `${this.name}: expected shape=${spec.shape}, ` +
                                `found shape=${x.shape}.`);
                        }
                    }
                }
            }
        }
    }
    /**
     * This is where the layer's logic lives.
     *
     * @param inputs Input tensor, or list/tuple of input tensors.
     * @param kwargs Additional keyword arguments.
     *
     * @return A tensor or list/tuple of tensors.
     */
    call(inputs, kwargs) {
        return inputs;
    }
    invokeCallHook(inputs, kwargs) {
        if (this._callHook != null) {
            this._callHook(inputs, kwargs);
        }
    }
    /**
     * Set call hook.
     * This is currently used for testing only.
     * @param callHook
     */
    setCallHook(callHook) {
        this._callHook = callHook;
    }
    /**
     * Clear call hook.
     * This is currently used for testing only.
     */
    clearCallHook() {
        this._callHook = null;
    }
    /**
     * Builds or executes a `Layer`'s logic.
     *
     * When called with `tf.Tensor`(s), execute the `Layer`'s computation and
     * return Tensor(s). For example:
     *
     * ```js
     * const denseLayer = tf.layers.dense({
     *   units: 1,
     *   kernelInitializer: 'zeros',
     *   useBias: false
     * });
     *
     * // Invoke the layer's apply() method with a `tf.Tensor` (with concrete
     * // numeric values).
     * const input = tf.ones([2, 2]);
     * const output = denseLayer.apply(input);
     *
     * // The output's value is expected to be [[0], [0]], due to the fact that
     * // the dense layer has a kernel initialized to all-zeros and does not have
     * // a bias.
     * output.print();
     * ```
     *
     * When called with `tf.SymbolicTensor`(s), this will prepare the layer for
     * future execution.  This entails internal book-keeping on shapes of
     * expected Tensors, wiring layers together, and initializing weights.
     *
     * Calling `apply` with `tf.SymbolicTensor`s are typically used during the
     * building of non-`tf.Sequential` models. For example:
     *
     * ```js
     * const flattenLayer = tf.layers.flatten();
     * const denseLayer = tf.layers.dense({units: 1});
     *
     * // Use tf.layers.input() to obtain a SymbolicTensor as input to apply().
     * const input = tf.input({shape: [2, 2]});
     * const output1 = flattenLayer.apply(input);
     *
     * // output1.shape is [null, 4]. The first dimension is the undetermined
     * // batch size. The second dimension comes from flattening the [2, 2]
     * // shape.
     * console.log(JSON.stringify(output1.shape));
     *
     * // The output SymbolicTensor of the flatten layer can be used to call
     * // the apply() of the dense layer:
     * const output2 = denseLayer.apply(output1);
     *
     * // output2.shape is [null, 1]. The first dimension is the undetermined
     * // batch size. The second dimension matches the number of units of the
     * // dense layer.
     * console.log(JSON.stringify(output2.shape));
     *
     * // The input and output can be used to construct a model that consists
     * // of the flatten and dense layers.
     * const model = tf.model({inputs: input, outputs: output2});
     * ```
     *
     * @param inputs a `tf.Tensor` or `tf.SymbolicTensor` or an Array of them.
     * @param kwargs Additional keyword arguments to be passed to `call()`.
     *
     * @return Output of the layer's `call` method.
     *
     * @exception ValueError error in case the layer is missing shape information
     *   for its `build` call.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    // Porting Note: This is a replacement for __call__() in Python.
    apply(inputs, kwargs) {
        kwargs = kwargs || {};
        this.assertNotDisposed();
        // Ensure inputs are all the same type.
        const inputsList = generic_utils.toList(inputs);
        const allAreSymbolic = checkAllSymbolic(inputs);
        const noneAreSymbolic = checkNoneSymbolic(inputs);
        if (allAreSymbolic === noneAreSymbolic) {
            throw new ValueError('Arguments to apply() must be all ' +
                'SymbolicTensors or all Tensors');
        }
        // TODO(michaelterry): nameScope() may not be necessary.
        return nameScope(this.name, () => {
            // Handle laying building (weight creating, input spec locking).
            if (!this.built) {
                /*
                  Throw exceptions in case the input is not compatible
                  with the inputSpec specified in the layer constructor.
                 */
                this.assertInputCompatibility(inputs);
                // Collect input shapes to build layer.
                const inputShapes = [];
                for (const xElem of generic_utils.toList(inputs)) {
                    inputShapes.push(xElem.shape);
                }
                this.build(generic_utils.singletonOrArray(inputShapes));
                this.built = true;
                // Load weights that were specified at layer instantiation.
                if (this.initialWeights) {
                    this.setWeights(this.initialWeights);
                }
                if (this._refCount === null && noneAreSymbolic) {
                    // The first use of this layer is a non-symbolic call, set ref count
                    // to 1 so the Layer can be properly disposed if its dispose() method
                    // is called.
                    this._refCount = 1;
                }
            }
            /*
              Throw exceptions in case the input is not compatible
              with the inputSpec set at build time.
            */
            this.assertInputCompatibility(inputs);
            // Handle mask propagation.
            // TODO(michaelterry): Mask propagation not currently implemented.
            // Actually call the layer, collecting output(s), mask(s), and shape(s).
            if (noneAreSymbolic) {
                let output = this.call(inputs, kwargs);
                // Apply masks to the output tensors if the layer supports it.
                if (this.supportsMasking) {
                    // TODO(mattsoulanille): pass the input tensors' masks to computeMask
                    this.setMaskMetadata(inputs, output);
                }
                // If the layer returns tensors from its inputs, unmodified,
                // we copy them to avoid loss of tensor metadata.
                const outputList = generic_utils.toList(output);
                const outputListCopy = [];
                // TODO(michaelterry): This copying may not be necessary given our eager
                // backend.
                for (let x of outputList) {
                    if (inputsList.indexOf(x) !== -1) {
                        x = x.clone();
                    }
                    outputListCopy.push(x);
                }
                output = generic_utils.singletonOrArray(outputListCopy);
                if (this.activityRegularizer != null) {
                    throw new NotImplementedError('Layer invocation in the presence of activity ' +
                        'regularizer(s) is not supported yet.');
                }
                // TODO(michaelterry): Call addInboundNode()?
                return output;
            }
            else {
                const inputShape = collectInputShape(inputs);
                const outputShape = this.computeOutputShape(inputShape);
                let output;
                const outputDType = guessOutputDType(inputs);
                this.warnOnIncompatibleInputShape(Array.isArray(inputs) ? inputShape[0] :
                    inputShape);
                if (outputShape != null && outputShape.length > 0 &&
                    Array.isArray(outputShape[0])) {
                    // We have multiple output shapes. Create multiple output tensors.
                    output = outputShape
                        .map((shape, index) => new SymbolicTensor(outputDType, shape, this, generic_utils.toList(inputs), kwargs, this.name, index));
                }
                else {
                    output = new SymbolicTensor(outputDType, outputShape, this, generic_utils.toList(inputs), kwargs, this.name);
                }
                /*
                  Add an inbound node to the layer, so that it keeps track
                  of the call and of all new variables created during the call.
                  This also updates the layer history of the output tensor(s).
                  If the input tensor(s) had no previous history,
                  this does nothing.
                */
                this.addInboundNode(inputs, output, null, null, inputShape, outputShape, kwargs);
                this._refCount++;
                if (this.activityRegularizer != null) {
                    throw new NotImplementedError('Layer invocation in the presence of activity ' +
                        'regularizer(s) is not supported yet.');
                }
                return output;
            }
        });
    }
    /**
     * Check compatibility between input shape and this layer's batchInputShape.
     *
     * Print warning if any incompatibility is found.
     *
     * @param inputShape Input shape to be checked.
     */
    warnOnIncompatibleInputShape(inputShape) {
        if (this.batchInputShape == null) {
            return;
        }
        else if (inputShape.length !== this.batchInputShape.length) {
            console.warn(`The rank of the input tensor provided (shape: ` +
                `${JSON.stringify(inputShape)}) does not match that of the ` +
                `batchInputShape (${JSON.stringify(this.batchInputShape)}) ` +
                `of the layer ${this.name}`);
        }
        else {
            let dimMismatch = false;
            this.batchInputShape.forEach((dimension, i) => {
                if (dimension != null && inputShape[i] != null &&
                    inputShape[i] !== dimension) {
                    dimMismatch = true;
                }
            });
            if (dimMismatch) {
                console.warn(`The shape of the input tensor ` +
                    `(${JSON.stringify(inputShape)}) does not ` +
                    `match the expectation of layer ${this.name}: ` +
                    `${JSON.stringify(this.batchInputShape)}`);
            }
        }
    }
    /**
     * Retrieves the output shape(s) of a layer.
     *
     * Only applicable if the layer has only one inbound node, or if all inbound
     * nodes have the same output shape.
     *
     * @returns Output shape or shapes.
     * @throws AttributeError: if the layer is connected to more than one incoming
     *   nodes.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    get outputShape() {
        if (this.inboundNodes == null || this.inboundNodes.length === 0) {
            throw new AttributeError(`The layer ${this.name} has never been called and thus has no ` +
                `defined output shape.`);
        }
        const allOutputShapes = [];
        for (const node of this.inboundNodes) {
            const shapeString = JSON.stringify(node.outputShapes);
            if (allOutputShapes.indexOf(shapeString) === -1) {
                allOutputShapes.push(shapeString);
            }
        }
        if (allOutputShapes.length === 1) {
            const outputShapes = this.inboundNodes[0].outputShapes;
            if (Array.isArray(outputShapes) && Array.isArray(outputShapes[0]) &&
                outputShapes.length === 1) {
                return outputShapes[0];
            }
            else {
                return outputShapes;
            }
        }
        else {
            throw new AttributeError(`The layer ${this.name} has multiple inbound nodes with different ` +
                `output shapes. Hence the notion of "output shape" is ill-defined ` +
                `for the layer.`);
            // TODO(cais): Implement getOutputShapeAt().
        }
    }
    /**
     * Counts the total number of numbers (e.g., float32, int32) in the
     * weights.
     *
     * @returns An integer count.
     * @throws RuntimeError: If the layer is not built yet (in which case its
     *   weights are not defined yet.)
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    countParams() {
        if (!this.built) {
            throw new RuntimeError(`You tried to call countParams() on ${this.name}, ` +
                `but the layer is not built yet. Build it first by calling ` +
                `build(batchInputShape).`);
        }
        return variable_utils.countParamsInWeights(this.weights);
    }
    /**
     * Creates the layer weights.
     *
     * Must be implemented on all layers that have weights.
     *
     * Called when apply() is called to construct the weights.
     *
     * @param inputShape A `Shape` or array of `Shape` (unused).
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    build(inputShape) {
        this.built = true;
    }
    /**
     * Returns the current values of the weights of the layer.
     *
     * @param trainableOnly Whether to get the values of only trainable weights.
     * @returns Weight values as an `Array` of `tf.Tensor`s.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    getWeights(trainableOnly = false) {
        return batchGetValue(trainableOnly ? this.trainableWeights : this.weights);
    }
    /**
     * Sets the weights of the layer, from Tensors.
     *
     * @param weights a list of Tensors. The number of arrays and their shape
     *   must match number of the dimensions of the weights of the layer (i.e.
     *   it should match the output of `getWeights`).
     *
     * @exception ValueError If the provided weights list does not match the
     *   layer's specifications.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    setWeights(weights) {
        tidy(() => {
            const params = this.weights;
            if (params.length !== weights.length) {
                // TODO(cais): Restore the following and use `providedWeights`, instead
                // of `weights` in the error message, once the deeplearn.js bug is
                // fixed: https://github.com/PAIR-code/deeplearnjs/issues/498 const
                // providedWeights = JSON.stringify(weights).slice(0, 50);
                throw new ValueError(`You called setWeights(weights) on layer "${this.name}" ` +
                    `with a weight list of length ${weights.length}, ` +
                    `but the layer was expecting ${params.length} weights. ` +
                    `Provided weights: ${weights}...`);
            }
            if (params.length === 0) {
                return;
            }
            const weightValueTuples = [];
            const paramValues = batchGetValue(params);
            for (let i = 0; i < paramValues.length; ++i) {
                const pv = paramValues[i];
                const p = params[i];
                const w = weights[i];
                if (!util.arraysEqual(pv.shape, w.shape)) {
                    throw new ValueError(`Layer weight shape ${pv.shape} ` +
                        `not compatible with provided weight shape ${w.shape}`);
                }
                weightValueTuples.push([p, w]);
            }
            batchSetValue(weightValueTuples);
        });
    }
    /**
     * Adds a weight variable to the layer.
     *
     * @param name Name of the new weight variable.
     * @param shape The shape of the weight.
     * @param dtype The dtype of the weight.
     * @param initializer An initializer instance.
     * @param regularizer A regularizer instance.
     * @param trainable Whether the weight should be trained via backprop or not
     *   (assuming that the layer itself is also trainable).
     * @param constraint An optional trainable.
     * @return The created weight variable.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    addWeight(name, shape, dtype, initializer, regularizer, trainable, constraint, getInitializerFunc) {
        // Reject duplicate weight names.
        if (this._addedWeightNames.indexOf(name) !== -1) {
            throw new ValueError(`Duplicate weight name ${name} for layer ${this.name}`);
        }
        this._addedWeightNames.push(name);
        if (dtype == null) {
            dtype = 'float32';
        }
        if (this.fastWeightInitDuringBuild) {
            initializer = getInitializerFunc != null ? getInitializerFunc() :
                getInitializer('zeros');
        }
        const initValue = initializer.apply(shape, dtype);
        const weight = new LayerVariable(initValue, dtype, name, trainable, constraint);
        initValue.dispose();
        // Request backend not to dispose the weights of the model on scope() exit.
        if (regularizer != null) {
            this.addLoss(() => regularizer.apply(weight.read()));
        }
        if (trainable == null) {
            trainable = true;
        }
        if (trainable) {
            this._trainableWeights.push(weight);
        }
        else {
            this._nonTrainableWeights.push(weight);
        }
        return weight;
    }
    /**
     * Set the fast-weight-initialization flag.
     *
     * In cases where the initialized weight values will be immediately
     * overwritten by loaded weight values during model loading, setting
     * the flag to `true` saves unnecessary calls to potentially expensive
     * initializers and speeds up the loading process.
     *
     * @param value Target value of the flag.
     */
    setFastWeightInitDuringBuild(value) {
        this.fastWeightInitDuringBuild = value;
    }
    /**
     * Add losses to the layer.
     *
     * The loss may potentially be conditional on some inputs tensors,
     * for instance activity losses are conditional on the layer's inputs.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    addLoss(losses) {
        if (losses == null || Array.isArray(losses) && losses.length === 0) {
            return;
        }
        // Update this.losses
        losses = generic_utils.toList(losses);
        if (this._losses !== undefined && this._losses !== null) {
            this.losses.push(...losses);
        }
    }
    /**
     * Computes the output shape of the layer.
     *
     * Assumes that the layer will be built to match that input shape provided.
     *
     * @param inputShape A shape (tuple of integers) or a list of shape tuples
     *   (one per output tensor of the layer). Shape tuples can include null for
     *   free dimensions, instead of an integer.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    computeOutputShape(inputShape) {
        return inputShape;
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
        if (!this.supportsMasking) {
            if (mask != null) {
                if (Array.isArray(mask)) {
                    mask.forEach(maskElement => {
                        if (maskElement != null) {
                            throw new TypeError(`Layer ${this.name} does not support masking, ` +
                                'but was passed an inputMask.');
                        }
                    });
                }
                else {
                    throw new TypeError(`Layer ${this.name} does not support masking, ` +
                        'but was passed an inputMask.');
                }
            }
            // masking not explicitly supported: return null as mask
            return null;
        }
        // if masking is explictly supported, by default
        // carry over the input mask
        return mask;
    }
    setMaskMetadata(inputs, outputs, previousMask) {
        if (!this.supportsMasking) {
            return;
        }
        const outputMasks = this.computeMask(inputs, previousMask);
        const outputsList = generic_utils.toList(outputs);
        const outputMasksList = generic_utils.toList(outputMasks);
        if (outputsList.length !== outputMasksList.length) {
            throw new Error(`${this.name} outputs ${outputsList.length} tensors ` +
                `but ${outputsList.length} masks for those tensors`);
        }
        for (let i = 0; i < outputsList.length; i++) {
            outputsList[i].kerasMask = outputMasksList[i];
        }
    }
    /**
     * Internal method to create an inbound node for the layer.
     *
     * @param inputTensors List of input tensors.
     * @param outputTensors List of output tensors.
     * @param inputMasks List of input masks (a mask can be a tensor, or null).
     * @param outputMasks List of output masks (a mask can be a tensor, or null).
     * @param inputShapes List of input shape tuples.
     * @param outputShapes List of output shape tuples.
     * @param kwargs Dictionary of keyword arguments that were passed to the
     *   `call` method of the layer at the call that created the node.
     */
    addInboundNode(inputTensors, outputTensors, inputMasks, outputMasks, inputShapes, outputShapes, kwargs = null) {
        const inputTensorList = generic_utils.toList(inputTensors);
        outputTensors = generic_utils.toList(outputTensors);
        inputMasks = generic_utils.toList(inputMasks);
        outputMasks = generic_utils.toList(outputMasks);
        inputShapes = types_utils.normalizeShapeList(inputShapes);
        outputShapes = types_utils.normalizeShapeList(outputShapes);
        // Collect input tensor(s) coordinates.
        const inboundLayers = [];
        const nodeIndices = [];
        const tensorIndices = [];
        for (const x of inputTensorList) {
            /*
             * TODO(michaelterry): Keras adds this value to tensors; it's not
             * clear whether we'll use this or not.
             */
            inboundLayers.push(x.sourceLayer);
            nodeIndices.push(x.nodeIndex);
            tensorIndices.push(x.tensorIndex);
        }
        // Create node, add it to inbound nodes.
        // (This call has side effects.)
        // tslint:disable-next-line:no-unused-expression
        new Node({
            outboundLayer: this,
            inboundLayers,
            nodeIndices,
            tensorIndices,
            inputTensors: inputTensorList,
            outputTensors,
            inputMasks,
            outputMasks,
            inputShapes,
            outputShapes
        }, kwargs);
        // Update tensor history
        for (let i = 0; i < outputTensors.length; i++) {
            // TODO(michaelterry: _uses_learning_phase not tracked.
            outputTensors[i].sourceLayer = this;
            outputTensors[i].nodeIndex = this.inboundNodes.length - 1;
            outputTensors[i].tensorIndex = i;
        }
    }
    /**
     * Returns the config of the layer.
     *
     * A layer config is a TS dictionary (serializable)
     * containing the configuration of a layer.
     * The same layer can be reinstantiated later
     * (without its trained weights) from this configuration.
     *
     * The config of a layer does not include connectivity
     * information, nor the layer class name.  These are handled
     * by 'Container' (one layer of abstraction above).
     *
     * Porting Note: The TS dictionary follows TS naming standards for
     * keys, and uses tfjs-layers type-safe Enums.  Serialization methods
     * should use a helper function to convert to the pythonic storage
     * standard. (see serialization_utils.convertTsToPythonic)
     *
     * @returns TS dictionary of configuration.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    getConfig() {
        const config = { name: this.name, trainable: this.trainable };
        if (this.batchInputShape != null) {
            config['batchInputShape'] = this.batchInputShape;
        }
        if (this.dtype != null) {
            config['dtype'] = this.dtype;
        }
        return config;
    }
    /**
     * Dispose the weight variables that this Layer instance holds.
     *
     * @returns {number} Number of disposed variables.
     */
    disposeWeights() {
        this.weights.forEach(weight => weight.dispose());
        return this.weights.length;
    }
    assertNotDisposed() {
        if (this._refCount === 0) {
            throw new Error(`Layer '${this.name}' is already disposed.`);
        }
    }
    /**
     * Attempt to dispose layer's weights.
     *
     * This method decreases the reference count of the Layer object by 1.
     *
     * A Layer is reference-counted. Its reference count is incremented by 1
     * the first item its `apply()` method is called and when it becomes a part
     * of a new `Node` (through calling the `apply()` method on a
     * `tf.SymbolicTensor`).
     *
     * If the reference count of a Layer becomes 0, all the weights will be
     * disposed and the underlying memory (e.g., the textures allocated in WebGL)
     * will be freed.
     *
     * Note: If the reference count is greater than 0 after the decrement, the
     * weights of the Layer will *not* be disposed.
     *
     * After a Layer is disposed, it cannot be used in calls such as `apply()`,
     * `getWeights()` or `setWeights()` anymore.
     *
     * @returns A DisposeResult Object with the following fields:
     *   - refCountAfterDispose: The reference count of the Container after this
     *     `dispose()` call.
     *   - numDisposedVariables: Number of `tf.Variable`s (i.e., weights) disposed
     *     during this `dispose()` call.
     * @throws {Error} If the layer is not built yet, or if the layer has already
     *   been disposed.
     *
     * @doc {heading: 'Models', 'subheading': 'Classes'}
     */
    dispose() {
        if (!this.built) {
            throw new Error(`Cannot dispose Layer ${this.name} because it has not been ` +
                `built yet.`);
        }
        if (this._refCount === null) {
            throw new Error(`Cannot dispose Layer ${this.name} because it has not been used ` +
                `yet.`);
        }
        this.assertNotDisposed();
        let numDisposedVariables = 0;
        if (--this._refCount === 0) {
            numDisposedVariables = this.disposeWeights();
        }
        return { refCountAfterDispose: this._refCount, numDisposedVariables };
    }
}
/**
 * Collects the input shape(s) of a list of `tf.Tensor`s or
 * `tf.SymbolicTensor`s.
 *
 * TODO(michaelterry): Update PyKeras docs (backport).
 *
 * @param inputTensors List of input tensors (or single input tensor).
 *
 * @return List of shape tuples (or single tuple), one tuple per input.
 */
function collectInputShape(inputTensors) {
    inputTensors =
        generic_utils.toList(inputTensors);
    const shapes = [];
    for (const x of inputTensors) {
        shapes.push(x.shape);
    }
    return generic_utils.singletonOrArray(shapes);
}
/**
 * Guesses output dtype based on inputs.
 *
 * At present, just returns 'float32' for any input.
 *
 * @param inputTensors List of input tensors (or single input tensor).
 *
 * @return The guessed DType. At present, always returns 'float32'.
 */
function guessOutputDType(inputTensors) {
    return 'float32';
}
/**
 * Returns the list of input tensors necessary to compute `tensor`.
 *
 * Output will always be a list of tensors (potentially with 1 element).
 *
 * @param tensor The tensor to start from.
 * @param layer Origin layer of the tensor.
 * @param nodeIndex Origin node index of the tensor.
 *
 * @return Array of input tensors.
 */
export function getSourceInputs(tensor, layer, nodeIndex) {
    if (layer == null || (nodeIndex != null && nodeIndex > 0)) {
        layer = tensor.sourceLayer;
        nodeIndex = tensor.nodeIndex;
    }
    if (layer.inboundNodes.length === 0) {
        return [tensor];
    }
    else {
        const node = layer.inboundNodes[nodeIndex];
        if (node.inboundLayers.length === 0) {
            return node.inputTensors;
        }
        else {
            const sourceTensors = [];
            for (let i = 0; i < node.inboundLayers.length; i++) {
                const x = node.inputTensors[i];
                const layer = node.inboundLayers[i];
                const nodeIndex = node.nodeIndices[i];
                const previousSources = getSourceInputs(x, layer, nodeIndex);
                // Avoid input redundancy.
                for (const x of previousSources) {
                    if (sourceTensors.indexOf(x) === -1) {
                        sourceTensors.push(x);
                    }
                }
            }
            return sourceTensors;
        }
    }
}
function checkAllSymbolic(tensors) {
    let allAreSymbolic = true;
    for (const tensor of generic_utils.toList(tensors)) {
        if (!(tensor instanceof SymbolicTensor)) {
            allAreSymbolic = false;
            break;
        }
    }
    return allAreSymbolic;
}
function checkNoneSymbolic(tensors) {
    let noneAreSymbolic = true;
    for (const tensor of generic_utils.toList(tensors)) {
        if (tensor instanceof SymbolicTensor) {
            noneAreSymbolic = false;
            break;
        }
    }
    return noneAreSymbolic;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9wb2xvZ3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvZW5naW5lL3RvcG9sb2d5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUgsK0NBQStDO0FBRS9DLE9BQU8sRUFBbUIsYUFBYSxFQUFVLElBQUksRUFBRSxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUUxRixPQUFPLEVBQUMscUJBQXFCLEVBQUUsTUFBTSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUU5RSxPQUFPLEVBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDeEYsT0FBTyxFQUFDLGNBQWMsRUFBYyxNQUFNLGlCQUFpQixDQUFDO0FBSTVELE9BQU8sS0FBSyxhQUFhLE1BQU0sd0JBQXdCLENBQUM7QUFDeEQsT0FBTyxLQUFLLFdBQVcsTUFBTSxzQkFBc0IsQ0FBQztBQUNwRCxPQUFPLEtBQUssY0FBYyxNQUFNLHlCQUF5QixDQUFDO0FBQzFELE9BQU8sRUFBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQXVCekU7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLE9BQU8sU0FBUztJQWNwQixZQUFZLElBQW1CO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDeEI7OztVQUdFO1FBQ0YsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtZQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFD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LENBQUMsQ0FBQztnQkFDN0QsMEJBQTBCO2dCQUMxQixLQUFLLE1BQU0sQ0FBQyxJQUFJLGVBQWUsRUFBRTtvQkFDL0IsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO3dCQUNuQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUN2QjtpQkFDRjthQUNGO1lBQ0QsT0FBTyxhQUFhLENBQUM7U0FDdEI7S0FDRjtBQUNILENBQUM7QUFJRCxTQUFTLGdCQUFnQixDQUFDLE9BQXNDO0lBRTlELElBQUksY0FBYyxHQUFHLElBQUksQ0FBQztJQUMxQixLQUFLLE1BQU0sTUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDbEQsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLGNBQWMsQ0FBQyxFQUFFO1lBQ3ZDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDdkIsTUFBTTtTQUNQO0tBQ0Y7SUFDRCxPQUFPLGNBQWMsQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxPQUNlO0lBQ3hDLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQztJQUMzQixLQUFLLE1BQU0sTUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDbEQsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFO1lBQ3BDLGVBQWUsR0FBRyxLQUFLLENBQUM7WUFDeEIsTUFBTTtTQUNQO0tBQ0Y7SUFDRCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyogT3JpZ2luYWwgc291cmNlOiBrZXJhcy9lbmdpbmUvdG9wb2xvZ3kucHkgKi9cblxuaW1wb3J0IHtEYXRhVHlwZSwgU2NhbGFyLCBzZXJpYWxpemF0aW9uLCBUZW5zb3IsIHRpZHksIHV0aWx9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7Z2V0TmV4dFVuaXF1ZVRlbnNvcklkLCBnZXRVaWR9IGZyb20gJy4uL2JhY2tlbmQvc3RhdGUnO1xuaW1wb3J0IHtnZXRTY29wZWRUZW5zb3JOYW1lLCBnZXRVbmlxdWVUZW5zb3JOYW1lLCBuYW1lU2NvcGV9IGZyb20gJy4uL2NvbW1vbic7XG5pbXBvcnQge0NvbnN0cmFpbnR9IGZyb20gJy4uL2NvbnN0cmFpbnRzJztcbmltcG9ydCB7QXR0cmlidXRlRXJyb3IsIE5vdEltcGxlbWVudGVkRXJyb3IsIFJ1bnRpbWVFcnJvciwgVmFsdWVFcnJvcn0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7Z2V0SW5pdGlhbGl6ZXIsIEluaXRpYWxpemVyfSBmcm9tICcuLi9pbml0aWFsaXplcnMnO1xuaW1wb3J0IHtTaGFwZX0gZnJvbSAnLi4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQge1JlZ3VsYXJpemVyfSBmcm9tICcuLi9yZWd1bGFyaXplcnMnO1xuaW1wb3J0IHtLd2FyZ3MsIFJlZ3VsYXJpemVyRm59IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGdlbmVyaWNfdXRpbHMgZnJvbSAnLi4vdXRpbHMvZ2VuZXJpY191dGlscyc7XG5pbXBvcnQgKiBhcyB0eXBlc191dGlscyBmcm9tICcuLi91dGlscy90eXBlc191dGlscyc7XG5pbXBvcnQgKiBhcyB2YXJpYWJsZV91dGlscyBmcm9tICcuLi91dGlscy92YXJpYWJsZV91dGlscyc7XG5pbXBvcnQge2JhdGNoR2V0VmFsdWUsIGJhdGNoU2V0VmFsdWUsIExheWVyVmFyaWFibGV9IGZyb20gJy4uL3ZhcmlhYmxlcyc7XG5cbi8vIFRPRE8obWljaGFlbHRlcnJ5KTogVGhpcyBpcyBhIHN0dWIgdW50aWwgaXQncyBkZWZpbmVkLlxuZXhwb3J0IHR5cGUgT3AgPSAoeDogTGF5ZXJWYXJpYWJsZSkgPT4gTGF5ZXJWYXJpYWJsZTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RvciBhcmd1bWVudHMgZm9yIElucHV0U3BlYy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnB1dFNwZWNBcmdzIHtcbiAgLyoqIEV4cGVjdGVkIGRhdGF0eXBlIG9mIHRoZSBpbnB1dC4gKi9cbiAgZHR5cGU/OiBEYXRhVHlwZTtcbiAgLyoqIEV4cGVjdGVkIHNoYXBlIG9mIHRoZSBpbnB1dCAobWF5IGluY2x1ZGUgbnVsbCBmb3IgdW5jaGVja2VkIGF4ZXMpLiAqL1xuICBzaGFwZT86IFNoYXBlO1xuICAvKiogRXhwZWN0ZWQgcmFuayBvZiB0aGUgaW5wdXQuICovXG4gIG5kaW0/OiBudW1iZXI7XG4gIC8qKiBNYXhpbXVtIHJhbmsgb2YgdGhlIGlucHV0LiAqL1xuICBtYXhORGltPzogbnVtYmVyO1xuICAvKiogTWluaW11bSByYW5rIG9mIHRoZSBpbnB1dC4gKi9cbiAgbWluTkRpbT86IG51bWJlcjtcbiAgLyoqIERpY3Rpb25hcnkgbWFwcGluZyBpbnRlZ2VyIGF4ZXMgdG8gYSBzcGVjaWZpYyBkaW1lbnNpb24gdmFsdWUuICovXG4gIGF4ZXM/OiB7W2F4aXM6IG51bWJlcl06IG51bWJlcn07XG59XG5cbi8qKlxuICogU3BlY2lmaWVzIHRoZSBuZGltLCBkdHlwZSBhbmQgc2hhcGUgb2YgZXZlcnkgaW5wdXQgdG8gYSBsYXllci5cbiAqXG4gKiBFdmVyeSBsYXllciBzaG91bGQgZXhwb3NlIChpZiBhcHByb3ByaWF0ZSkgYW4gYGlucHV0U3BlY2AgYXR0cmlidXRlOlxuICogYSBsaXN0IG9mIGluc3RhbmNlcyBvZiBJbnB1dFNwZWMgKG9uZSBwZXIgaW5wdXQgdGVuc29yKS5cbiAqXG4gKiBBIG51bGwgZW50cnkgaW4gYSBzaGFwZSBpcyBjb21wYXRpYmxlIHdpdGggYW55IGRpbWVuc2lvbixcbiAqIGEgbnVsbCBzaGFwZSBpcyBjb21wYXRpYmxlIHdpdGggYW55IHNoYXBlLlxuICovXG5leHBvcnQgY2xhc3MgSW5wdXRTcGVjIHtcbiAgLyoqIEV4cGVjdGVkIGRhdGF0eXBlIG9mIHRoZSBpbnB1dC4gKi9cbiAgZHR5cGU/OiBEYXRhVHlwZTtcbiAgLyoqIEV4cGVjdGVkIHNoYXBlIG9mIHRoZSBpbnB1dCAobWF5IGluY2x1ZGUgbnVsbCBmb3IgdW5jaGVja2VkIGF4ZXMpLiAqL1xuICBzaGFwZT86IFNoYXBlO1xuICAvKiogRXhwZWN0ZWQgcmFuayBvZiB0aGUgaW5wdXQuICovXG4gIG5kaW0/OiBudW1iZXI7XG4gIC8qKiBNYXhpbXVtIHJhbmsgb2YgdGhlIGlucHV0LiAqL1xuICBtYXhORGltPzogbnVtYmVyO1xuICAvKiogTWluaW11bSByYW5rIG9mIHRoZSBpbnB1dC4gKi9cbiAgbWluTkRpbT86IG51bWJlcjtcbiAgLyoqIERpY3Rpb25hcnkgbWFwcGluZyBpbnRlZ2VyIGF4ZXMgdG8gYSBzcGVjaWZpYyBkaW1lbnNpb24gdmFsdWUuICovXG4gIGF4ZXM/OiB7W2F4aXM6IG51bWJlcl06IG51bWJlcn07XG5cbiAgY29uc3RydWN0b3IoYXJnczogSW5wdXRTcGVjQXJncykge1xuICAgIHRoaXMuZHR5cGUgPSBhcmdzLmR0eXBlO1xuICAgIHRoaXMuc2hhcGUgPSBhcmdzLnNoYXBlO1xuICAgIC8qXG4gICAgICBUT0RPKG1pY2hhZWx0ZXJyeSk6IENvdWxkIHRocm93IGVycm9yIGlmIG5kaW0gYW5kIHNoYXBlIGFyZSBib3RoIGRlZmluZWRcbiAgICAgICAgKHRoZW4gYmFja3BvcnQpLlxuICAgICovXG4gICAgaWYgKGFyZ3Muc2hhcGUgIT0gbnVsbCkge1xuICAgICAgdGhpcy5uZGltID0gYXJncy5zaGFwZS5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubmRpbSA9IGFyZ3MubmRpbTtcbiAgICB9XG4gICAgdGhpcy5tYXhORGltID0gYXJncy5tYXhORGltO1xuICAgIHRoaXMubWluTkRpbSA9IGFyZ3MubWluTkRpbTtcbiAgICB0aGlzLmF4ZXMgPSBhcmdzLmF4ZXMgfHwge307XG4gIH1cbn1cblxuLyoqXG4gKiBgdGYuU3ltYm9saWNUZW5zb3JgIGlzIGEgcGxhY2Vob2xkZXIgZm9yIGEgVGVuc29yIHdpdGhvdXQgYW55IGNvbmNyZXRlIHZhbHVlLlxuICpcbiAqIFRoZXkgYXJlIG1vc3Qgb2Z0ZW4gZW5jb3VudGVyZWQgd2hlbiBidWlsZGluZyBhIGdyYXBoIG9mIGBMYXllcmBzIGZvciBhXG4gKiBgdGYuTGF5ZXJzTW9kZWxgIGFuZCB0aGUgaW5wdXQgZGF0YSdzIHNoYXBlLCBidXQgbm90IHZhbHVlcyBhcmUga25vd24uXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsICdzdWJoZWFkaW5nJzogJ0NsYXNzZXMnfVxuICovXG5leHBvcnQgY2xhc3MgU3ltYm9saWNUZW5zb3Ige1xuICAvKiBBIHVuaXF1ZSBJRCBmb3IgdGhlIHRlbnNvciB0byBiZSBhYmxlIHRvIGRpZmZlcmVudGlhdGUgdGVuc29ycy4gKi9cbiAgcmVhZG9ubHkgaWQ6IG51bWJlcjtcbiAgLy8gVGhlIGZ1bGx5IHNjb3BlZCBuYW1lIG9mIHRoaXMgVmFyaWFibGUsIGluY2x1ZGluZyBhIHVuaXF1ZSBzdWZmaXggaWYgbmVlZGVkXG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgLy8gVGhlIG9yaWdpbmFsbHkgcmVxdWVzdGVkIGZ1bGx5IHNjb3BlZCBuYW1lIG9mIHRoaXMgVmFyaWFibGUsIG5vdCBpbmNsdWRpbmdcbiAgLy8gYW55IHVuaXF1ZSBzdWZmaXguICBUaGlzIG1heSBiZSBuZWVkZWQgd2hlbiByZXN0b3Jpbmcgd2VpZ2h0cyBiZWNhdXNlIHRoaXNcbiAgLy8gb3JpZ2luYWwgbmFtZSBpcyB1c2VkIGFzIGEga2V5LlxuICByZWFkb25seSBvcmlnaW5hbE5hbWU/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBSYW5rL2RpbWVuc2lvbmFsaXR5IG9mIHRoZSB0ZW5zb3IuXG4gICAqL1xuICByZWFkb25seSByYW5rOiBudW1iZXI7XG4gIC8qKlxuICAgKiBSZXBsYWNlbWVudCBmb3IgX2tlcmFzX2hpc3RvcnkuXG4gICAqL1xuICBub2RlSW5kZXg6IG51bWJlcjtcbiAgLyoqXG4gICAqIFJlcGxhY2VtZW50IGZvciBfa2VyYXNfaGlzdG9yeS5cbiAgICovXG4gIHRlbnNvckluZGV4OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBkdHlwZVxuICAgKiBAcGFyYW0gc2hhcGVcbiAgICogQHBhcmFtIHNvdXJjZUxheWVyIFRoZSBMYXllciB0aGF0IHByb2R1Y2VkIHRoaXMgc3ltYm9saWMgdGVuc29yLlxuICAgKiBAcGFyYW0gaW5wdXRzIFRoZSBpbnB1dHMgcGFzc2VkIHRvIHNvdXJjZUxheWVyJ3MgX19jYWxsX18oKSBtZXRob2QuXG4gICAqIEBwYXJhbSBub2RlSW5kZXhcbiAgICogQHBhcmFtIHRlbnNvckluZGV4XG4gICAqIEBwYXJhbSBjYWxsQXJncyBUaGUga2V5d29yZCBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBfX2NhbGxfXygpIG1ldGhvZC5cbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIG91dHB1dFRlbnNvckluZGV4IFRoZSBpbmRleCBvZiB0aGlzIHRlbnNvciBpbiB0aGUgbGlzdCBvZiBvdXRwdXRzXG4gICAqICAgcmV0dXJuZWQgYnkgYXBwbHkoKS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZHR5cGU6IERhdGFUeXBlLCByZWFkb25seSBzaGFwZTogU2hhcGUsXG4gICAgICBwdWJsaWMgc291cmNlTGF5ZXI6IExheWVyLCByZWFkb25seSBpbnB1dHM6IFN5bWJvbGljVGVuc29yW10sXG4gICAgICByZWFkb25seSBjYWxsQXJnczogS3dhcmdzLCBuYW1lPzogc3RyaW5nLFxuICAgICAgcmVhZG9ubHkgb3V0cHV0VGVuc29ySW5kZXg/OiBudW1iZXIpIHtcbiAgICB0aGlzLmlkID0gZ2V0TmV4dFVuaXF1ZVRlbnNvcklkKCk7XG4gICAgaWYgKG5hbWUgIT0gbnVsbCkge1xuICAgICAgdGhpcy5vcmlnaW5hbE5hbWUgPSBnZXRTY29wZWRUZW5zb3JOYW1lKG5hbWUpO1xuICAgICAgdGhpcy5uYW1lID0gZ2V0VW5pcXVlVGVuc29yTmFtZSh0aGlzLm9yaWdpbmFsTmFtZSk7XG4gICAgfVxuICAgIHRoaXMucmFuayA9IHNoYXBlLmxlbmd0aDtcbiAgfVxufVxuXG4vKipcbiAqIENvbnN0cnVjdG9yIGFyZ3VtZW50cyBmb3IgTm9kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOb2RlQXJncyB7XG4gIC8qKlxuICAgKiBUaGUgbGF5ZXIgdGhhdCB0YWtlcyBgaW5wdXRUZW5zb3JzYCBhbmQgdHVybnMgdGhlbSBpbnRvIGBvdXRwdXRUZW5zb3JzYC5cbiAgICogKHRoZSBub2RlIGdldHMgY3JlYXRlZCB3aGVuIHRoZSBgY2FsbGAgbWV0aG9kIG9mIHRoZSBsYXllciBpcyBjYWxsZWQpLlxuICAgKi9cbiAgb3V0Ym91bmRMYXllcjogTGF5ZXI7XG4gIC8qKlxuICAgKiBBIGxpc3Qgb2YgbGF5ZXJzLCB0aGUgc2FtZSBsZW5ndGggYXMgYGlucHV0VGVuc29yc2AsIHRoZSBsYXllcnMgZnJvbSB3aGVyZVxuICAgKiBgaW5wdXRUZW5zb3JzYCBvcmlnaW5hdGUuXG4gICAqL1xuICBpbmJvdW5kTGF5ZXJzOiBMYXllcltdO1xuICAvKipcbiAgICogQSBsaXN0IG9mIGludGVnZXJzLCB0aGUgc2FtZSBsZW5ndGggYXMgYGluYm91bmRMYXllcnNgLiBgbm9kZUluZGljZXNbaV1gIGlzXG4gICAqIHRoZSBvcmlnaW4gbm9kZSBvZiBgaW5wdXRUZW5zb3JzW2ldYCAobmVjZXNzYXJ5IHNpbmNlIGVhY2ggaW5ib3VuZCBsYXllclxuICAgKiBtaWdodCBoYXZlIHNldmVyYWwgbm9kZXMsIGUuZy4gaWYgdGhlIGxheWVyIGlzIGJlaW5nIHNoYXJlZCB3aXRoIGFcbiAgICogZGlmZmVyZW50IGRhdGEgc3RyZWFtKS5cbiAgICovXG4gIG5vZGVJbmRpY2VzOiBudW1iZXJbXTtcbiAgLyoqXG4gICAqIEEgbGlzdCBvZiBpbnRlZ2VycywgdGhlIHNhbWUgbGVuZ3RoIGFzIGBpbmJvdW5kTGF5ZXJzYC4gYHRlbnNvckluZGljZXNbaV1gXG4gICAqIGlzIHRoZSBpbmRleCBvZiBgaW5wdXRUZW5zb3JzW2ldYCB3aXRoaW4gdGhlIG91dHB1dCBvZiB0aGUgaW5ib3VuZCBsYXllclxuICAgKiAobmVjZXNzYXJ5IHNpbmNlIGVhY2ggaW5ib3VuZCBsYXllciBtaWdodCBoYXZlIG11bHRpcGxlIHRlbnNvciBvdXRwdXRzLFxuICAgKiB3aXRoIGVhY2ggb25lIGJlaW5nIGluZGVwZW5kZW50bHkgbWFuaXB1bGFibGUpLlxuICAgKi9cbiAgdGVuc29ySW5kaWNlczogbnVtYmVyW107XG4gIC8qKiBMaXN0IG9mIGlucHV0IHRlbnNvcnMuICovXG4gIGlucHV0VGVuc29yczogU3ltYm9saWNUZW5zb3JbXTtcbiAgLyoqIExpc3Qgb2Ygb3V0cHV0IHRlbnNvcnMuICovXG4gIG91dHB1dFRlbnNvcnM6IFN5bWJvbGljVGVuc29yW107XG4gIC8qKiBMaXN0IG9mIGlucHV0IG1hc2tzIChhIG1hc2sgY2FuIGJlIGEgdGVuc29yLCBvciBudWxsKS4gKi9cbiAgaW5wdXRNYXNrczogVGVuc29yW107XG4gIC8qKiBMaXN0IG9mIG91dHB1dCBtYXNrcyAoYSBtYXNrIGNhbiBiZSBhIHRlbnNvciwgb3IgbnVsbCkuICovXG4gIG91dHB1dE1hc2tzOiBUZW5zb3JbXTtcbiAgLyoqIExpc3Qgb2YgaW5wdXQgc2hhcGUgdHVwbGVzLiAqL1xuICBpbnB1dFNoYXBlczogU2hhcGV8U2hhcGVbXTtcbiAgLyoqIExpc3Qgb2Ygb3V0cHV0IHNoYXBlIHR1cGxlcy4gKi9cbiAgb3V0cHV0U2hhcGVzOiBTaGFwZXxTaGFwZVtdO1xufVxuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSByZXR1cm4gdmFsdWUgb2YgTGF5ZXIuZGlzcG9zZSgpIGFuZCBDb250YWluZXIuZGlzcG9zZSgpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERpc3Bvc2VSZXN1bHQge1xuICAvKipcbiAgICogUmVmZXJlbmNlIGNvdW50IGFmdGVyIHRoZSBkaXNwb3NlIGNhbGwuXG4gICAqL1xuICByZWZDb3VudEFmdGVyRGlzcG9zZTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgdmFyaWFibGVzIGRpc3Bvc2UgaW4gdGhpcyBkaXNwb3NlIGNhbGwuXG4gICAqL1xuICBudW1EaXNwb3NlZFZhcmlhYmxlczogbnVtYmVyO1xufVxuXG5sZXQgX25leHROb2RlSUQgPSAwO1xuXG4vKipcbiAqIEEgYE5vZGVgIGRlc2NyaWJlcyB0aGUgY29ubmVjdGl2aXR5IGJldHdlZW4gdHdvIGxheWVycy5cbiAqXG4gKiBFYWNoIHRpbWUgYSBsYXllciBpcyBjb25uZWN0ZWQgdG8gc29tZSBuZXcgaW5wdXQsXG4gKiBhIG5vZGUgaXMgYWRkZWQgdG8gYGxheWVyLmluYm91bmROb2Rlc2AuXG4gKlxuICogRWFjaCB0aW1lIHRoZSBvdXRwdXQgb2YgYSBsYXllciBpcyB1c2VkIGJ5IGFub3RoZXIgbGF5ZXIsXG4gKiBhIG5vZGUgaXMgYWRkZWQgdG8gYGxheWVyLm91dGJvdW5kTm9kZXNgLlxuICpcbiAqIGBub2RlSW5kaWNlc2AgYW5kIGB0ZW5zb3JJbmRpY2VzYCBhcmUgYmFzaWNhbGx5IGZpbmUtZ3JhaW5lZCBjb29yZGluYXRlc1xuICogZGVzY3JpYmluZyB0aGUgb3JpZ2luIG9mIHRoZSBgaW5wdXRUZW5zb3JzYCwgdmVyaWZ5aW5nIHRoZSBmb2xsb3dpbmc6XG4gKlxuICogYGlucHV0VGVuc29yc1tpXSA9PVxuICogaW5ib3VuZExheWVyc1tpXS5pbmJvdW5kTm9kZXNbbm9kZUluZGljZXNbaV1dLm91dHB1dFRlbnNvcnNbXG4gKiAgIHRlbnNvckluZGljZXNbaV1dYFxuICpcbiAqIEEgbm9kZSBmcm9tIGxheWVyIEEgdG8gbGF5ZXIgQiBpcyBhZGRlZCB0bzpcbiAqICAgICBBLm91dGJvdW5kTm9kZXNcbiAqICAgICBCLmluYm91bmROb2Rlc1xuICovXG5leHBvcnQgY2xhc3MgTm9kZSB7XG4gIC8qKlxuICAgKiBUaGUgbGF5ZXIgdGhhdCB0YWtlcyBgaW5wdXRUZW5zb3JzYCBhbmQgdHVybnMgdGhlbSBpbnRvIGBvdXRwdXRUZW5zb3JzYFxuICAgKiAodGhlIG5vZGUgZ2V0cyBjcmVhdGVkIHdoZW4gdGhlIGBjYWxsYCBtZXRob2Qgb2YgdGhlIGxheWVyIGlzIGNhbGxlZCkuXG4gICAqL1xuICBvdXRib3VuZExheWVyOiBMYXllcjtcbiAgLyoqXG4gICAqIEEgbGlzdCBvZiBsYXllcnMsIHRoZSBzYW1lIGxlbmd0aCBhcyBgaW5wdXRUZW5zb3JzYCwgdGhlIGxheWVycyBmcm9tIHdoZXJlXG4gICAqIGBpbnB1dFRlbnNvcnNgIG9yaWdpbmF0ZS5cbiAgICovXG4gIGluYm91bmRMYXllcnM6IExheWVyW107XG4gIC8qKlxuICAgKiBBIGxpc3Qgb2YgaW50ZWdlcnMsIHRoZSBzYW1lIGxlbmd0aCBhcyBgaW5ib3VuZExheWVyc2AuIGBub2RlSW5kaWNlc1tpXWAgaXNcbiAgICogdGhlIG9yaWdpbiBub2RlIG9mIGBpbnB1dFRlbnNvcnNbaV1gIChuZWNlc3Nhcnkgc2luY2UgZWFjaCBpbmJvdW5kIGxheWVyXG4gICAqIG1pZ2h0IGhhdmUgc2V2ZXJhbCBub2RlcywgZS5nLiBpZiB0aGUgbGF5ZXIgaXMgYmVpbmcgc2hhcmVkIHdpdGggYVxuICAgKiBkaWZmZXJlbnQgZGF0YSBzdHJlYW0pLlxuICAgKi9cbiAgbm9kZUluZGljZXM6IG51bWJlcltdO1xuICAvKipcbiAgICogQSBsaXN0IG9mIGludGVnZXJzLCB0aGUgc2FtZSBsZW5ndGggYXMgYGluYm91bmRMYXllcnNgLiBgdGVuc29ySW5kaWNlc1tpXWBcbiAgICogaXMgdGhlIGluZGV4IG9mIGBpbnB1dFRlbnNvcnNbaV1gIHdpdGhpbiB0aGUgb3V0cHV0IG9mIHRoZSBpbmJvdW5kIGxheWVyXG4gICAqIChuZWNlc3Nhcnkgc2luY2UgZWFjaCBpbmJvdW5kIGxheWVyIG1pZ2h0IGhhdmUgbXVsdGlwbGUgdGVuc29yIG91dHB1dHMsXG4gICAqIHdpdGggZWFjaCBvbmUgYmVpbmcgaW5kZXBlbmRlbnRseSBtYW5pcHVsYWJsZSkuXG4gICAqL1xuICB0ZW5zb3JJbmRpY2VzOiBudW1iZXJbXTtcbiAgLyoqIExpc3Qgb2YgaW5wdXQgdGVuc29ycy4gKi9cbiAgaW5wdXRUZW5zb3JzOiBTeW1ib2xpY1RlbnNvcltdO1xuICAvKiogTGlzdCBvZiBvdXRwdXQgdGVuc29ycy4gKi9cbiAgb3V0cHV0VGVuc29yczogU3ltYm9saWNUZW5zb3JbXTtcbiAgLyoqIExpc3Qgb2YgaW5wdXQgbWFza3MgKGEgbWFzayBjYW4gYmUgYSB0ZW5zb3IsIG9yIG51bGwpLiAqL1xuICBpbnB1dE1hc2tzOiBUZW5zb3JbXTtcbiAgLyoqIExpc3Qgb2Ygb3V0cHV0IG1hc2tzIChhIG1hc2sgY2FuIGJlIGEgdGVuc29yLCBvciBudWxsKS4gKi9cbiAgb3V0cHV0TWFza3M6IFRlbnNvcltdO1xuICAvKiogTGlzdCBvZiBpbnB1dCBzaGFwZSB0dXBsZXMuICovXG4gIGlucHV0U2hhcGVzOiBTaGFwZXxTaGFwZVtdO1xuICAvKiogTGlzdCBvZiBvdXRwdXQgc2hhcGUgdHVwbGVzLiAqL1xuICBvdXRwdXRTaGFwZXM6IFNoYXBlfFNoYXBlW107XG5cbiAgcmVhZG9ubHkgaWQ6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGFyZ3M6IE5vZGVBcmdzLFxuICAgICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBEZWZpbmUgYWN0dWFsIHR5cGUgZm9yIHRoaXMuXG4gICAgICBwdWJsaWMgY2FsbEFyZ3M/OiBLd2FyZ3MpIHtcbiAgICB0aGlzLmlkID0gX25leHROb2RlSUQrKztcbiAgICAvKlxuICAgICAgTGF5ZXIgaW5zdGFuY2UgKE5PVCBhIGxpc3QpLlxuICAgICAgdGhpcyBpcyB0aGUgbGF5ZXIgdGhhdCB0YWtlcyBhIGxpc3Qgb2YgaW5wdXQgdGVuc29yc1xuICAgICAgYW5kIHR1cm5zIHRoZW0gaW50byBhIGxpc3Qgb2Ygb3V0cHV0IHRlbnNvcnMuXG4gICAgICB0aGUgY3VycmVudCBub2RlIHdpbGwgYmUgYWRkZWQgdG9cbiAgICAgIHRoZSBpbmJvdW5kTm9kZXMgb2Ygb3V0Ym91bmRMYXllci5cbiAgICAqL1xuICAgIHRoaXMub3V0Ym91bmRMYXllciA9IGFyZ3Mub3V0Ym91bmRMYXllcjtcblxuICAgIC8qXG4gICAgICAgIFRoZSBmb2xsb3dpbmcgMyBwcm9wZXJ0aWVzIGRlc2NyaWJlIHdoZXJlXG4gICAgICAgIHRoZSBpbnB1dCB0ZW5zb3JzIGNvbWUgZnJvbTogd2hpY2ggbGF5ZXJzLFxuICAgICAgICBhbmQgZm9yIGVhY2ggbGF5ZXIsIHdoaWNoIG5vZGUgYW5kIHdoaWNoXG4gICAgICAgIHRlbnNvciBvdXRwdXQgb2YgZWFjaCBub2RlLlxuICAgICovXG5cbiAgICAvLyBMaXN0IG9mIGxheWVyIGluc3RhbmNlcy5cbiAgICB0aGlzLmluYm91bmRMYXllcnMgPSBhcmdzLmluYm91bmRMYXllcnM7XG4gICAgLy8gTGlzdCBvZiBpbnRlZ2VycywgMToxIG1hcHBpbmcgd2l0aCBpbmJvdW5kTGF5ZXJzLlxuICAgIHRoaXMubm9kZUluZGljZXMgPSBhcmdzLm5vZGVJbmRpY2VzO1xuICAgIC8vIExpc3Qgb2YgaW50ZWdlcnMsIDE6MSBtYXBwaW5nIHdpdGggaW5ib3VuZExheWVycy5cbiAgICB0aGlzLnRlbnNvckluZGljZXMgPSBhcmdzLnRlbnNvckluZGljZXM7XG5cbiAgICAvKlxuICAgICAgICBGb2xsb3dpbmcgMiBwcm9wZXJ0aWVzOlxuICAgICAgICB0ZW5zb3IgaW5wdXRzIGFuZCBvdXRwdXRzIG9mIG91dGJvdW5kTGF5ZXIuXG4gICAgKi9cblxuICAgIC8vIExpc3Qgb2YgdGVuc29ycy4gMToxIG1hcHBpbmcgd2l0aCBpbmJvdW5kTGF5ZXJzLlxuICAgIHRoaXMuaW5wdXRUZW5zb3JzID0gYXJncy5pbnB1dFRlbnNvcnM7XG4gICAgLy8gTGlzdCBvZiB0ZW5zb3JzLCBjcmVhdGVkIGJ5IG91dGJvdW5kTGF5ZXIuY2FsbCgpLlxuICAgIHRoaXMub3V0cHV0VGVuc29ycyA9IGFyZ3Mub3V0cHV0VGVuc29ycztcblxuICAgIC8qXG4gICAgICAgIEZvbGxvd2luZyAyIHByb3BlcnRpZXM6IGlucHV0IGFuZCBvdXRwdXQgbWFza3MuXG4gICAgICAgIExpc3Qgb2YgdGVuc29ycywgMToxIG1hcHBpbmcgd2l0aCBpbnB1dFRlbnNvci5cbiAgICAqL1xuICAgIHRoaXMuaW5wdXRNYXNrcyA9IGFyZ3MuaW5wdXRNYXNrcztcbiAgICAvLyBMaXN0IG9mIHRlbnNvcnMsIGNyZWF0ZWQgYnkgb3V0Ym91bmRMYXllci5jb21wdXRlTWFzaygpLlxuICAgIHRoaXMub3V0cHV0TWFza3MgPSBhcmdzLm91dHB1dE1hc2tzO1xuXG4gICAgLy8gRm9sbG93aW5nIDIgcHJvcGVydGllczogaW5wdXQgYW5kIG91dHB1dCBzaGFwZXMuXG5cbiAgICAvLyBMaXN0IG9mIHNoYXBlIHR1cGxlcywgc2hhcGVzIG9mIGlucHV0VGVuc29ycy5cbiAgICB0aGlzLmlucHV0U2hhcGVzID0gYXJncy5pbnB1dFNoYXBlcztcbiAgICAvLyBMaXN0IG9mIHNoYXBlIHR1cGxlcywgc2hhcGVzIG9mIG91dHB1dFRlbnNvcnMuXG4gICAgdGhpcy5vdXRwdXRTaGFwZXMgPSBhcmdzLm91dHB1dFNoYXBlcztcblxuICAgIC8vIEFkZCBub2RlcyB0byBhbGwgbGF5ZXJzIGludm9sdmVkLlxuICAgIGZvciAoY29uc3QgbGF5ZXIgb2YgYXJncy5pbmJvdW5kTGF5ZXJzKSB7XG4gICAgICBpZiAobGF5ZXIgIT0gbnVsbCkge1xuICAgICAgICBsYXllci5vdXRib3VuZE5vZGVzLnB1c2godGhpcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGFyZ3Mub3V0Ym91bmRMYXllci5pbmJvdW5kTm9kZXMucHVzaCh0aGlzKTtcbiAgfVxuXG4gIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGluYm91bmROYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxheWVyIG9mIHRoaXMuaW5ib3VuZExheWVycykge1xuICAgICAgaWYgKGxheWVyICE9IG51bGwpIHtcbiAgICAgICAgaW5ib3VuZE5hbWVzLnB1c2gobGF5ZXIubmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmJvdW5kTmFtZXMucHVzaChudWxsKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG91dGJvdW5kTGF5ZXI6IHRoaXMub3V0Ym91bmRMYXllciA/IHRoaXMub3V0Ym91bmRMYXllci5uYW1lIDogbnVsbCxcbiAgICAgIGluYm91bmRMYXllcnM6IGluYm91bmROYW1lcyxcbiAgICAgIG5vZGVJbmRpY2VzOiB0aGlzLm5vZGVJbmRpY2VzLFxuICAgICAgdGVuc29ySW5kaWNlczogdGhpcy50ZW5zb3JJbmRpY2VzXG4gICAgfTtcbiAgfVxufVxuXG4vKiogQ29uc3RydWN0b3IgYXJndW1lbnRzIGZvciBMYXllci4gKi9cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBMYXllckFyZ3Mge1xuICAvKipcbiAgICogSWYgZGVmaW5lZCwgd2lsbCBiZSB1c2VkIHRvIGNyZWF0ZSBhbiBpbnB1dCBsYXllciB0byBpbnNlcnQgYmVmb3JlIHRoaXNcbiAgICogbGF5ZXIuIElmIGJvdGggYGlucHV0U2hhcGVgIGFuZCBgYmF0Y2hJbnB1dFNoYXBlYCBhcmUgZGVmaW5lZCxcbiAgICogYGJhdGNoSW5wdXRTaGFwZWAgd2lsbCBiZSB1c2VkLiBUaGlzIGFyZ3VtZW50IGlzIG9ubHkgYXBwbGljYWJsZSB0byBpbnB1dFxuICAgKiBsYXllcnMgKHRoZSBmaXJzdCBsYXllciBvZiBhIG1vZGVsKS5cbiAgICovXG4gIGlucHV0U2hhcGU/OiBTaGFwZTtcbiAgLyoqXG4gICAqIElmIGRlZmluZWQsIHdpbGwgYmUgdXNlZCB0byBjcmVhdGUgYW4gaW5wdXQgbGF5ZXIgdG8gaW5zZXJ0IGJlZm9yZSB0aGlzXG4gICAqIGxheWVyLiBJZiBib3RoIGBpbnB1dFNoYXBlYCBhbmQgYGJhdGNoSW5wdXRTaGFwZWAgYXJlIGRlZmluZWQsXG4gICAqIGBiYXRjaElucHV0U2hhcGVgIHdpbGwgYmUgdXNlZC4gVGhpcyBhcmd1bWVudCBpcyBvbmx5IGFwcGxpY2FibGUgdG8gaW5wdXRcbiAgICogbGF5ZXJzICh0aGUgZmlyc3QgbGF5ZXIgb2YgYSBtb2RlbCkuXG4gICAqL1xuICBiYXRjaElucHV0U2hhcGU/OiBTaGFwZTtcbiAgLyoqXG4gICAqIElmIGBpbnB1dFNoYXBlYCBpcyBzcGVjaWZpZWQgYW5kIGBiYXRjaElucHV0U2hhcGVgIGlzICpub3QqIHNwZWNpZmllZCxcbiAgICogYGJhdGNoU2l6ZWAgaXMgdXNlZCB0byBjb25zdHJ1Y3QgdGhlIGBiYXRjaElucHV0U2hhcGVgOiBgW2JhdGNoU2l6ZSxcbiAgICogLi4uaW5wdXRTaGFwZV1gXG4gICAqL1xuICBiYXRjaFNpemU/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGUgZGF0YS10eXBlIGZvciB0aGlzIGxheWVyLiBEZWZhdWx0cyB0byAnZmxvYXQzMicuXG4gICAqIFRoaXMgYXJndW1lbnQgaXMgb25seSBhcHBsaWNhYmxlIHRvIGlucHV0IGxheWVycyAodGhlIGZpcnN0IGxheWVyIG9mIGFcbiAgICogbW9kZWwpLlxuICAgKi9cbiAgZHR5cGU/OiBEYXRhVHlwZTtcbiAgLyoqIE5hbWUgZm9yIHRoaXMgbGF5ZXIuICovXG4gIG5hbWU/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB3ZWlnaHRzIG9mIHRoaXMgbGF5ZXIgYXJlIHVwZGF0YWJsZSBieSBgZml0YC5cbiAgICogRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICovXG4gIHRyYWluYWJsZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBJbml0aWFsIHdlaWdodCB2YWx1ZXMgb2YgdGhlIGxheWVyLlxuICAgKi9cbiAgd2VpZ2h0cz86IFRlbnNvcltdO1xuICAvKiogTGVnYWN5IHN1cHBvcnQuIERvIG5vdCB1c2UgZm9yIG5ldyBjb2RlLiAqL1xuICBpbnB1dERUeXBlPzogRGF0YVR5cGU7XG59XG5cbi8vIElmIG5lY2Vzc2FyeSwgYWRkIGBvdXRwdXRgIGFyZ3VtZW50cyB0byB0aGUgQ2FsbEhvb2sgZnVuY3Rpb24uXG4vLyBUaGlzIGlzIGN1cnJlbnRseSB1c2VkIGZvciB0ZXN0aW5nIG9ubHksIGJ1dCBtYXkgYmUgdXNlZCBmb3IgZGVidWdnZXItcmVsYXRlZFxuLy8gcHVycG9zZXMgaW4gdGhlIGZ1dHVyZS5cbmV4cG9ydCB0eXBlIENhbGxIb29rID0gKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncykgPT4gdm9pZDtcblxubGV0IF9uZXh0TGF5ZXJJRCA9IDA7XG5cbi8qKlxuICogQSBsYXllciBpcyBhIGdyb3VwaW5nIG9mIG9wZXJhdGlvbnMgYW5kIHdlaWdodHMgdGhhdCBjYW4gYmUgY29tcG9zZWQgdG9cbiAqIGNyZWF0ZSBhIGB0Zi5MYXllcnNNb2RlbGAuXG4gKlxuICogTGF5ZXJzIGFyZSBjb25zdHJ1Y3RlZCBieSB1c2luZyB0aGUgZnVuY3Rpb25zIHVuZGVyIHRoZVxuICogW3RmLmxheWVyc10oI0xheWVycy1CYXNpYykgbmFtZXNwYWNlLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdMYXllcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3NlcycsIG5hbWVzcGFjZTogJ2xheWVycyd9XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMYXllciBleHRlbmRzIHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlIHtcbiAgLyoqIE5hbWUgZm9yIHRoaXMgbGF5ZXIuIE11c3QgYmUgdW5pcXVlIHdpdGhpbiBhIG1vZGVsLiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBMaXN0IG9mIElucHV0U3BlYyBjbGFzcyBpbnN0YW5jZXMuXG4gICAqXG4gICAqIEVhY2ggZW50cnkgZGVzY3JpYmVzIG9uZSByZXF1aXJlZCBpbnB1dDpcbiAgICogLSBuZGltXG4gICAqIC0gZHR5cGVcbiAgICogQSBsYXllciB3aXRoIGBuYCBpbnB1dCB0ZW5zb3JzIG11c3QgaGF2ZSBhbiBgaW5wdXRTcGVjYCBvZiBsZW5ndGggYG5gLlxuICAgKi9cbiAgaW5wdXRTcGVjOiBJbnB1dFNwZWNbXTtcbiAgc3VwcG9ydHNNYXNraW5nOiBib29sZWFuO1xuICAvKiogV2hldGhlciB0aGUgbGF5ZXIgd2VpZ2h0cyB3aWxsIGJlIHVwZGF0ZWQgZHVyaW5nIHRyYWluaW5nLiAqL1xuICBwcm90ZWN0ZWQgdHJhaW5hYmxlXzogYm9vbGVhbjtcbiAgYmF0Y2hJbnB1dFNoYXBlOiBTaGFwZTtcbiAgZHR5cGU6IERhdGFUeXBlO1xuICBpbml0aWFsV2VpZ2h0czogVGVuc29yW107XG5cbiAgaW5ib3VuZE5vZGVzOiBOb2RlW107XG4gIG91dGJvdW5kTm9kZXM6IE5vZGVbXTtcblxuICBhY3Rpdml0eVJlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcblxuICBwcm90ZWN0ZWQgX3RyYWluYWJsZVdlaWdodHM6IExheWVyVmFyaWFibGVbXTtcbiAgcHJpdmF0ZSBfbm9uVHJhaW5hYmxlV2VpZ2h0czogTGF5ZXJWYXJpYWJsZVtdO1xuICBwcml2YXRlIF9sb3NzZXM6IFJlZ3VsYXJpemVyRm5bXTtcbiAgLy8gVE9ETyhjYWlzKTogX3VwZGF0ZXMgaXMgY3VycmVudGx5IHVudXNlZC5cbiAgcHJpdmF0ZSBfdXBkYXRlczogVGVuc29yW107XG4gIHByaXZhdGUgX2J1aWx0OiBib29sZWFuO1xuICBwcml2YXRlIF9jYWxsSG9vazogQ2FsbEhvb2sgPSBudWxsO1xuXG4gIHByaXZhdGUgX2FkZGVkV2VpZ2h0TmFtZXM6IHN0cmluZ1tdID0gW107XG5cbiAgcmVhZG9ubHkgaWQ6IG51bWJlcjtcblxuICAvLyBQb3J0aW5nIE5vdGVzOiBQeUtlcmFzIGRvZXMgbm90IGhhdmUgdGhpcyBwcm9wZXJ0eSBpbiB0aGlzIGJhc2UgTGF5ZXJcbiAgLy8gICBjbGFzcy4gSW5zdGVhZCBsZXRzIExheWVyIHN1YmNsYXNzIHNldCBpdCBkeW5hbWljYWxseSBhbmQgY2hlY2tzIHRoZVxuICAvLyAgIHZhbHVlIHdpdGggYGhhc2F0dHJgLiBJbiB0ZmpzLWxheWVycywgd2UgbGV0IHRoaXMgYmUgYSBtZW1iZXIgb2YgdGhpc1xuICAvLyAgIGJhc2UgY2xhc3MuXG4gIHByb3RlY3RlZCBfc3RhdGVmdWwgPSBmYWxzZTtcblxuICBwcm90ZWN0ZWQgX3JlZkNvdW50OiBudW1iZXJ8bnVsbDtcblxuICAvLyBBIGZsYWcgZm9yIHdoZXRoZXIgZmFzdCAoaS5lLiwgYWxsLXplcm8pIHdlaWdodCBpbml0aWFsaXphdGlvbiBpcyB0b1xuICAvLyBiZSB1c2VkIGR1cmluZyBgYnVpbGQoKWAgY2FsbC4gVGhpcyBzcGVlZHMgdXAgd2VpZ2h0IGluaXRpYWxpemF0aW9uXG4gIC8vIGJ5IHNhdmluZyB1bm5lY2Vzc2FyeSBjYWxscyB0byBleHBlbnNpdmUgaW5pdGlhbGl6ZXJzIGluIGNhc2VzIHdoZXJlXG4gIC8vIHRoZSBpbml0aWFsaXplZCB2YWx1ZXMgd2lsbCBiZSBvdmVyd3JpdHRlbiBieSBsb2FkZWQgd2VpZ2h0IHZhbHVlc1xuICAvLyBkdXJpbmcgbW9kZWwgbG9hZGluZy5cbiAgcHJpdmF0ZSBmYXN0V2VpZ2h0SW5pdER1cmluZ0J1aWxkOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IExheWVyQXJncyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmlkID0gX25leHRMYXllcklEKys7XG5cbiAgICB0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIgPSBudWxsO1xuXG4gICAgdGhpcy5pbnB1dFNwZWMgPSBudWxsO1xuICAgIHRoaXMuc3VwcG9ydHNNYXNraW5nID0gZmFsc2U7XG5cbiAgICAvLyBUaGVzZSBwcm9wZXJ0aWVzIHdpbGwgYmUgc2V0IHVwb24gY2FsbCBvZiB0aGlzLmJ1aWxkKClcbiAgICB0aGlzLl90cmFpbmFibGVXZWlnaHRzID0gW107XG4gICAgdGhpcy5fbm9uVHJhaW5hYmxlV2VpZ2h0cyA9IFtdO1xuICAgIHRoaXMuX2xvc3NlcyA9IFtdO1xuICAgIHRoaXMuX3VwZGF0ZXMgPSBbXTtcbiAgICB0aGlzLl9idWlsdCA9IGZhbHNlO1xuXG4gICAgLypcbiAgICAgIFRoZXNlIGxpc3RzIHdpbGwgYmUgZmlsbGVkIHZpYSBzdWNjZXNzaXZlIGNhbGxzXG4gICAgICB0byB0aGlzLmFkZEluYm91bmROb2RlKCkuXG4gICAgICovXG4gICAgdGhpcy5pbmJvdW5kTm9kZXMgPSBbXTtcbiAgICB0aGlzLm91dGJvdW5kTm9kZXMgPSBbXTtcblxuICAgIGxldCBuYW1lID0gYXJncy5uYW1lO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc3QgcHJlZml4ID0gdGhpcy5nZXRDbGFzc05hbWUoKTtcbiAgICAgIG5hbWUgPSBnZW5lcmljX3V0aWxzLnRvU25ha2VDYXNlKHByZWZpeCkgKyAnXycgKyBnZXRVaWQocHJlZml4KTtcbiAgICB9XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcblxuICAgIHRoaXMudHJhaW5hYmxlXyA9IGFyZ3MudHJhaW5hYmxlID09IG51bGwgPyB0cnVlIDogYXJncy50cmFpbmFibGU7XG5cbiAgICBpZiAoYXJncy5pbnB1dFNoYXBlICE9IG51bGwgfHwgYXJncy5iYXRjaElucHV0U2hhcGUgIT0gbnVsbCkge1xuICAgICAgLypcbiAgICAgICAgSW4gdGhpcyBjYXNlIHdlIHdpbGwgbGF0ZXIgY3JlYXRlIGFuIGlucHV0IGxheWVyXG4gICAgICAgIHRvIGluc2VydCBiZWZvcmUgdGhlIGN1cnJlbnQgbGF5ZXJcbiAgICAgICAqL1xuICAgICAgbGV0IGJhdGNoSW5wdXRTaGFwZTogU2hhcGU7XG4gICAgICBpZiAoYXJncy5iYXRjaElucHV0U2hhcGUgIT0gbnVsbCkge1xuICAgICAgICBiYXRjaElucHV0U2hhcGUgPSBhcmdzLmJhdGNoSW5wdXRTaGFwZTtcbiAgICAgIH0gZWxzZSBpZiAoYXJncy5pbnB1dFNoYXBlICE9IG51bGwpIHtcbiAgICAgICAgbGV0IGJhdGNoU2l6ZTogbnVtYmVyID0gbnVsbDtcbiAgICAgICAgaWYgKGFyZ3MuYmF0Y2hTaXplICE9IG51bGwpIHtcbiAgICAgICAgICBiYXRjaFNpemUgPSBhcmdzLmJhdGNoU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBiYXRjaElucHV0U2hhcGUgPSBbYmF0Y2hTaXplXS5jb25jYXQoYXJncy5pbnB1dFNoYXBlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYmF0Y2hJbnB1dFNoYXBlID0gYmF0Y2hJbnB1dFNoYXBlO1xuXG4gICAgICAvLyBTZXQgZHR5cGUuXG4gICAgICBsZXQgZHR5cGUgPSBhcmdzLmR0eXBlO1xuICAgICAgaWYgKGR0eXBlID09IG51bGwpIHtcbiAgICAgICAgZHR5cGUgPSBhcmdzLmlucHV0RFR5cGU7XG4gICAgICB9XG4gICAgICBpZiAoZHR5cGUgPT0gbnVsbCkge1xuICAgICAgICBkdHlwZSA9ICdmbG9hdDMyJztcbiAgICAgIH1cbiAgICAgIHRoaXMuZHR5cGUgPSBkdHlwZTtcbiAgICB9XG5cbiAgICBpZiAoYXJncy53ZWlnaHRzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuaW5pdGlhbFdlaWdodHMgPSBhcmdzLndlaWdodHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW5pdGlhbFdlaWdodHMgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoZSB2YWx1ZSBvZiBgX3JlZkNvdW50YCBpcyBpbml0aWFsaXplZCB0byBudWxsLiBXaGVuIHRoZSBsYXllciBpcyB1c2VkXG4gICAgLy8gaW4gYSBzeW1ib2xpYyB3YXkgZm9yIHRoZSBmaXJzdCB0aW1lLCBpdCB3aWxsIGJlIHNldCB0byAxLlxuICAgIHRoaXMuX3JlZkNvdW50ID0gbnVsbDtcblxuICAgIHRoaXMuZmFzdFdlaWdodEluaXREdXJpbmdCdWlsZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgbGF5ZXIgYW5kIGl0cyBpbmRleCB0byBhIHVuaXF1ZSAoaW1tdXRhYmxlIHR5cGUpIG5hbWUuXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBpbnRlcm5hbGx5IHdpdGggYHRoaXMuY29udGFpbmVyTm9kZXNgLlxuICAgKiBAcGFyYW0gbGF5ZXIgVGhlIGxheWVyLlxuICAgKiBAcGFyYW0gbm9kZUluZGV4IFRoZSBsYXllcidzIHBvc2l0aW9uIChlLmcuIHZpYSBlbnVtZXJhdGUpIGluIGEgbGlzdCBvZlxuICAgKiAgIG5vZGVzLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgdW5pcXVlIG5hbWUuXG4gICAqL1xuICBwcm90ZWN0ZWQgc3RhdGljIG5vZGVLZXkobGF5ZXI6IExheWVyLCBub2RlSW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBsYXllci5uYW1lICsgJ19pYi0nICsgbm9kZUluZGV4LnRvU3RyaW5nKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGlzLmluYm91bmROb2RlIGF0IGluZGV4IG5vZGVJbmRleC5cbiAgICpcbiAgICogUG9ydGluZyBub3RlOiBUaGlzIGlzIGEgcmVwbGFjZW1lbnQgZm9yIF9nZXRfbm9kZV9hdHRyaWJ1dGVfYXRfaW5kZXgoKVxuICAgKiBAcGFyYW0gbm9kZUluZGV4XG4gICAqIEBwYXJhbSBhdHRyTmFtZSBUaGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlIHJlbGF0ZWQgdG8gcmVxdWVzdCBmb3IgdGhpcyBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXROb2RlQXRJbmRleChub2RlSW5kZXg6IG51bWJlciwgYXR0ck5hbWU6IHN0cmluZyk6IE5vZGUge1xuICAgIGlmICh0aGlzLmluYm91bmROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgJ1RoZSBsYXllciBoYXMgbmV2ZXIgYmVlbiBjYWxsZWQgJyArXG4gICAgICAgICAgYGFuZCB0aHVzIGhhcyBubyBkZWZpbmVkICR7YXR0ck5hbWV9LmApO1xuICAgIH1cbiAgICBpZiAodGhpcy5pbmJvdW5kTm9kZXMubGVuZ3RoIDw9IG5vZGVJbmRleCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYEFza2VkIHRvIGdldCAke2F0dHJOYW1lfSBhdCBub2RlICR7bm9kZUluZGV4fSwgYCArXG4gICAgICAgICAgYGJ1dCB0aGUgbGF5ZXIgaGFzIG9ubHkgJHt0aGlzLmluYm91bmROb2Rlcy5sZW5ndGh9IGluYm91bmQgbm9kZXMuYCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmluYm91bmROb2Rlc1tub2RlSW5kZXhdO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgaW5wdXQgdGVuc29yKHMpIG9mIGEgbGF5ZXIgYXQgYSBnaXZlbiBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZUluZGV4IEludGVnZXIsIGluZGV4IG9mIHRoZSBub2RlIGZyb20gd2hpY2ggdG8gcmV0cmlldmUgdGhlXG4gICAqICAgYXR0cmlidXRlLiBFLmcuIGBub2RlSW5kZXg9MGAgd2lsbCBjb3JyZXNwb25kIHRvIHRoZSBmaXJzdCB0aW1lIHRoZSBsYXllclxuICAgKiAgIHdhcyBjYWxsZWQuXG4gICAqXG4gICAqIEByZXR1cm4gQSB0ZW5zb3IgKG9yIGxpc3Qgb2YgdGVuc29ycyBpZiB0aGUgbGF5ZXIgaGFzIG11bHRpcGxlIGlucHV0cykuXG4gICAqL1xuICBnZXRJbnB1dEF0KG5vZGVJbmRleDogbnVtYmVyKTogU3ltYm9saWNUZW5zb3J8U3ltYm9saWNUZW5zb3JbXSB7XG4gICAgcmV0dXJuIGdlbmVyaWNfdXRpbHMuc2luZ2xldG9uT3JBcnJheShcbiAgICAgICAgdGhpcy5nZXROb2RlQXRJbmRleChub2RlSW5kZXgsICdpbnB1dCcpLmlucHV0VGVuc29ycyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBvdXRwdXQgdGVuc29yKHMpIG9mIGEgbGF5ZXIgYXQgYSBnaXZlbiBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZUluZGV4IEludGVnZXIsIGluZGV4IG9mIHRoZSBub2RlIGZyb20gd2hpY2ggdG8gcmV0cmlldmUgdGhlXG4gICAqICAgYXR0cmlidXRlLiBFLmcuIGBub2RlSW5kZXg9MGAgd2lsbCBjb3JyZXNwb25kIHRvIHRoZSBmaXJzdCB0aW1lIHRoZSBsYXllclxuICAgKiAgIHdhcyBjYWxsZWQuXG4gICAqXG4gICAqIEByZXR1cm4gQSB0ZW5zb3IgKG9yIGxpc3Qgb2YgdGVuc29ycyBpZiB0aGUgbGF5ZXIgaGFzIG11bHRpcGxlIG91dHB1dHMpLlxuICAgKi9cbiAgZ2V0T3V0cHV0QXQobm9kZUluZGV4OiBudW1iZXIpOiBTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdIHtcbiAgICByZXR1cm4gZ2VuZXJpY191dGlscy5zaW5nbGV0b25PckFycmF5KFxuICAgICAgICB0aGlzLmdldE5vZGVBdEluZGV4KG5vZGVJbmRleCwgJ291dHB1dCcpLm91dHB1dFRlbnNvcnMpO1xuICB9XG5cbiAgLy8gUHJvcGVydGllc1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGlucHV0IHRlbnNvcihzKSBvZiBhIGxheWVyLlxuICAgKlxuICAgKiBPbmx5IGFwcGxpY2FibGUgaWYgdGhlIGxheWVyIGhhcyBleGFjdGx5IG9uZSBpbmJvdW5kIG5vZGUsXG4gICAqIGkuZS4gaWYgaXQgaXMgY29ubmVjdGVkIHRvIG9uZSBpbmNvbWluZyBsYXllci5cbiAgICpcbiAgICogQHJldHVybiBJbnB1dCB0ZW5zb3Igb3IgbGlzdCBvZiBpbnB1dCB0ZW5zb3JzLlxuICAgKlxuICAgKiBAZXhjZXB0aW9uIEF0dHJpYnV0ZUVycm9yIGlmIHRoZSBsYXllciBpcyBjb25uZWN0ZWQgdG8gbW9yZSB0aGFuIG9uZVxuICAgKiAgIGluY29taW5nIGxheWVycy5cbiAgICovXG4gIGdldCBpbnB1dCgpOiBTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdIHtcbiAgICBpZiAodGhpcy5pbmJvdW5kTm9kZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKFxuICAgICAgICAgIGBMYXllciAke3RoaXMubmFtZX1gICtcbiAgICAgICAgICAnIGhhcyBtdWx0aXBsZSBpbmJvdW5kIG5vZGVzLCAnICtcbiAgICAgICAgICAnaGVuY2UgdGhlIG5vdGlvbiBvZiBcImxheWVyIGlucHV0XCIgJyArXG4gICAgICAgICAgJ2lzIGlsbC1kZWZpbmVkLiAnICtcbiAgICAgICAgICAnVXNlIGBnZXRJbnB1dEF0KG5vZGVJbmRleClgIGluc3RlYWQuJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmluYm91bmROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBBdHRyaWJ1dGVFcnJvcihcbiAgICAgICAgICBgTGF5ZXIgJHt0aGlzLm5hbWV9YCArXG4gICAgICAgICAgJyBpcyBub3QgY29ubmVjdGVkLCBubyBpbnB1dCB0byByZXR1cm4uJyk7XG4gICAgfVxuICAgIHJldHVybiBnZW5lcmljX3V0aWxzLnNpbmdsZXRvbk9yQXJyYXkoXG4gICAgICAgIHRoaXMuZ2V0Tm9kZUF0SW5kZXgoMCwgJ2lucHV0JykuaW5wdXRUZW5zb3JzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIG91dHB1dCB0ZW5zb3Iocykgb2YgYSBsYXllci5cbiAgICpcbiAgICogT25seSBhcHBsaWNhYmxlIGlmIHRoZSBsYXllciBoYXMgZXhhY3RseSBvbmUgaW5ib3VuZCBub2RlLFxuICAgKiBpLmUuIGlmIGl0IGlzIGNvbm5lY3RlZCB0byBvbmUgaW5jb21pbmcgbGF5ZXIuXG4gICAqXG4gICAqIEByZXR1cm4gT3V0cHV0IHRlbnNvciBvciBsaXN0IG9mIG91dHB1dCB0ZW5zb3JzLlxuICAgKlxuICAgKiBAZXhjZXB0aW9uIEF0dHJpYnV0ZUVycm9yIGlmIHRoZSBsYXllciBpcyBjb25uZWN0ZWQgdG8gbW9yZSB0aGFuIG9uZVxuICAgKiAgIGluY29taW5nIGxheWVycy5cbiAgICovXG4gIGdldCBvdXRwdXQoKTogU3ltYm9saWNUZW5zb3J8U3ltYm9saWNUZW5zb3JbXSB7XG4gICAgaWYgKHRoaXMuaW5ib3VuZE5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKFxuICAgICAgICAgIGBMYXllciAke3RoaXMubmFtZX1gICtcbiAgICAgICAgICAnIGhhcyBubyBpbmJvdW5kIG5vZGVzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy5pbmJvdW5kTm9kZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKFxuICAgICAgICAgIGBMYXllciAke3RoaXMubmFtZX1gICtcbiAgICAgICAgICAnIGhhcyBtdWx0aXBsZSBpbmJvdW5kIG5vZGVzLCAnICtcbiAgICAgICAgICAnaGVuY2UgdGhlIG5vdGlvbiBvZiBcImxheWVyIG91dHB1dFwiICcgK1xuICAgICAgICAgICdpcyBpbGwtZGVmaW5lZC4gJyArXG4gICAgICAgICAgJ1VzZSBgZ2V0T3V0cHV0QXQobm9kZUluZGV4KWAgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIGdlbmVyaWNfdXRpbHMuc2luZ2xldG9uT3JBcnJheShcbiAgICAgICAgdGhpcy5nZXROb2RlQXRJbmRleCgwLCAnb3V0cHV0Jykub3V0cHV0VGVuc29ycyk7XG4gIH1cblxuICBnZXQgbG9zc2VzKCk6IFJlZ3VsYXJpemVyRm5bXSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvc3NlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIExheWVyJ3MgY3VycmVudCBsb3NzIHZhbHVlcy5cbiAgICpcbiAgICogVXNlZCBmb3IgcmVndWxhcml6ZXJzIGR1cmluZyB0cmFpbmluZy5cbiAgICovXG4gIGNhbGN1bGF0ZUxvc3NlcygpOiBTY2FsYXJbXSB7XG4gICAgLy8gUG9ydGluZyBOb2RlOiBUaGlzIGlzIGFuIGF1Z21lbnRhdGlvbiB0byBMYXllci5sb3NzIGluIFB5S2VyYXMuXG4gICAgLy8gICBJbiBQeUtlcmFzLCBMYXllci5sb3NzIHJldHVybnMgc3ltYm9saWMgdGVuc29ycy4gSGVyZSBhIGNvbmNyZXRlXG4gICAgLy8gICBUZW5zb3IgKHNwZWNpZmljYWxseSBTY2FsYXIpIHZhbHVlcyBhcmUgcmV0dXJuZWQuIFRoaXMgaXMgZHVlIHRvIHRoZVxuICAgIC8vICAgaW1wZXJhdGl2ZSBiYWNrZW5kLlxuICAgIHJldHVybiB0aGlzLmxvc3Nlcy5tYXAobG9zc0ZuID0+IGxvc3NGbigpKTtcbiAgfVxuXG4gIGdldCB1cGRhdGVzKCk6IFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGhpcy5fdXBkYXRlcztcbiAgfVxuXG4gIGdldCBidWlsdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fYnVpbHQ7XG4gIH1cblxuICBzZXQgYnVpbHQoYnVpbHQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9idWlsdCA9IGJ1aWx0O1xuICB9XG5cbiAgZ2V0IHRyYWluYWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy50cmFpbmFibGVfO1xuICB9XG5cbiAgc2V0IHRyYWluYWJsZSh0cmFpbmFibGU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl90cmFpbmFibGVXZWlnaHRzLmZvckVhY2godyA9PiB3LnRyYWluYWJsZSA9IHRyYWluYWJsZSk7XG4gICAgdGhpcy50cmFpbmFibGVfID0gdHJhaW5hYmxlO1xuICB9XG5cbiAgZ2V0IHRyYWluYWJsZVdlaWdodHMoKTogTGF5ZXJWYXJpYWJsZVtdIHtcbiAgICBpZiAodGhpcy50cmFpbmFibGVfKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdHJhaW5hYmxlV2VpZ2h0cy5maWx0ZXIodyA9PiB3LnRyYWluYWJsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBzZXQgdHJhaW5hYmxlV2VpZ2h0cyh3ZWlnaHRzOiBMYXllclZhcmlhYmxlW10pIHtcbiAgICB0aGlzLl90cmFpbmFibGVXZWlnaHRzID0gd2VpZ2h0cztcbiAgfVxuXG4gIGdldCBub25UcmFpbmFibGVXZWlnaHRzKCk6IExheWVyVmFyaWFibGVbXSB7XG4gICAgaWYgKHRoaXMudHJhaW5hYmxlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdHJhaW5hYmxlV2VpZ2h0cy5maWx0ZXIodyA9PiAhdy50cmFpbmFibGUpXG4gICAgICAgICAgLmNvbmNhdCh0aGlzLl9ub25UcmFpbmFibGVXZWlnaHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3RyYWluYWJsZVdlaWdodHMuY29uY2F0KHRoaXMuX25vblRyYWluYWJsZVdlaWdodHMpO1xuICAgIH1cbiAgfVxuXG4gIHNldCBub25UcmFpbmFibGVXZWlnaHRzKHdlaWdodHM6IExheWVyVmFyaWFibGVbXSkge1xuICAgIHRoaXMuX25vblRyYWluYWJsZVdlaWdodHMgPSB3ZWlnaHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBjb25jYXRlbmF0aW9uIG9mIHRoZSBsaXN0cyB0cmFpbmFibGVXZWlnaHRzIGFuZCBub25UcmFpbmFibGVXZWlnaHRzXG4gICAqIChpbiB0aGlzIG9yZGVyKS5cbiAgICovXG4gIGdldCB3ZWlnaHRzKCk6IExheWVyVmFyaWFibGVbXSB7XG4gICAgcmV0dXJuIHRoaXMudHJhaW5hYmxlV2VpZ2h0cy5jb25jYXQodGhpcy5ub25UcmFpbmFibGVXZWlnaHRzKTtcbiAgfVxuXG4gIGdldCBzdGF0ZWZ1bCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVmdWw7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXQgdGhlIHN0YXRlcyBvZiB0aGUgbGF5ZXIuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9mIHRoZSBiYXNlIExheWVyIGNsYXNzIGlzIGVzc2VudGlhbGx5IGEgbm8tb3AuXG4gICAqIFN1YmNsYXNzZXMgdGhhdCBhcmUgc3RhdGVmdWwgKGUuZy4sIHN0YXRlZnVsIFJOTnMpIHNob3VsZCBvdmVycmlkZSB0aGlzXG4gICAqIG1ldGhvZC5cbiAgICovXG4gIHJlc2V0U3RhdGVzKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zdGF0ZWZ1bCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdDYW5ub3QgY2FsbCB0aGUgcmVzZXRTdGF0ZXMoKSBtZXRob2Qgb2YgYSBub24tc3RhdGVmdWwgTGF5ZXIgJyArXG4gICAgICAgICAgJ29iamVjdC4nKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGNvbXBhdGliaWxpdHkgYmV0d2VlbiB0aGUgbGF5ZXIgYW5kIHByb3ZpZGVkIGlucHV0cy5cbiAgICpcbiAgICogVGhpcyBjaGVja3MgdGhhdCB0aGUgdGVuc29yKHMpIGBpbnB1dGBcbiAgICogdmVyaWZ5IHRoZSBpbnB1dCBhc3N1bXB0aW9ucyBvZiB0aGUgbGF5ZXJcbiAgICogKGlmIGFueSkuIElmIG5vdCwgZXhjZXB0aW9ucyBhcmUgcmFpc2VkLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRzIElucHV0IHRlbnNvciBvciBsaXN0IG9mIGlucHV0IHRlbnNvcnMuXG4gICAqXG4gICAqIEBleGNlcHRpb24gVmFsdWVFcnJvciBpbiBjYXNlIG9mIG1pc21hdGNoIGJldHdlZW5cbiAgICogICB0aGUgcHJvdmlkZWQgaW5wdXRzIGFuZCB0aGUgZXhwZWN0YXRpb25zIG9mIHRoZSBsYXllci5cbiAgICovXG4gIHByb3RlY3RlZCBhc3NlcnRJbnB1dENvbXBhdGliaWxpdHkoaW5wdXRzOiBUZW5zb3J8VGVuc29yW118U3ltYm9saWNUZW5zb3J8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU3ltYm9saWNUZW5zb3JbXSk6IHZvaWQge1xuICAgIGNvbnN0IGlucHV0c0xpc3QgPSBnZW5lcmljX3V0aWxzLnRvTGlzdChpbnB1dHMpO1xuICAgIGlmICh0aGlzLmlucHV0U3BlYyA9PSBudWxsIHx8IHRoaXMuaW5wdXRTcGVjLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnB1dFNwZWMgPSBnZW5lcmljX3V0aWxzLnRvTGlzdCh0aGlzLmlucHV0U3BlYyk7XG4gICAgaWYgKGlucHV0c0xpc3QubGVuZ3RoICE9PSBpbnB1dFNwZWMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgTGF5ZXIgJHt0aGlzLm5hbWV9IGV4cGVjdHMgJHtpbnB1dFNwZWMubGVuZ3RofSBpbnB1dHMsIGAgK1xuICAgICAgICAgIGBidXQgaXQgcmVjZWl2ZWQgJHtpbnB1dHNMaXN0Lmxlbmd0aH0gaW5wdXQgdGVuc29ycy4gYCArXG4gICAgICAgICAgYElucHV0IHJlY2VpdmVkOiAke2lucHV0c31gKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaW5wdXRJbmRleCA9IDA7IGlucHV0SW5kZXggPCBpbnB1dHNMaXN0Lmxlbmd0aDsgaW5wdXRJbmRleCsrKSB7XG4gICAgICBjb25zdCB4ID0gaW5wdXRzTGlzdFtpbnB1dEluZGV4XTtcbiAgICAgIGNvbnN0IHNwZWM6IElucHV0U3BlYyA9IGlucHV0U3BlY1tpbnB1dEluZGV4XTtcbiAgICAgIGlmIChzcGVjID09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIG5kaW0uXG4gICAgICBjb25zdCBuZGltID0geC5yYW5rO1xuICAgICAgaWYgKHNwZWMubmRpbSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChuZGltICE9PSBzcGVjLm5kaW0pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICAgYElucHV0ICR7aW5wdXRJbmRleH0gaXMgaW5jb21wYXRpYmxlIHdpdGggbGF5ZXIgJHt0aGlzLm5hbWV9OiBgICtcbiAgICAgICAgICAgICAgYGV4cGVjdGVkIG5kaW09JHtzcGVjLm5kaW19LCBmb3VuZCBuZGltPSR7bmRpbX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNwZWMubWF4TkRpbSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChuZGltID4gc3BlYy5tYXhORGltKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAgIGBJbnB1dCAke2lucHV0SW5kZXh9IGlzIGluY29tcGF0aWJsZSB3aXRoIGxheWVyICR7dGhpcy5uYW1lfWAgK1xuICAgICAgICAgICAgICBgOiBleHBlY3RlZCBtYXhfbmRpbT0ke3NwZWMubWF4TkRpbX0sIGZvdW5kIG5kaW09JHtuZGltfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3BlYy5taW5ORGltICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG5kaW0gPCBzcGVjLm1pbk5EaW0pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICAgYElucHV0ICR7aW5wdXRJbmRleH0gaXMgaW5jb21wYXRpYmxlIHdpdGggbGF5ZXIgJHt0aGlzLm5hbWV9YCArXG4gICAgICAgICAgICAgIGA6IGV4cGVjdGVkIG1pbl9uZGltPSR7c3BlYy5taW5ORGltfSwgZm91bmQgbmRpbT0ke25kaW19LmApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGR0eXBlLlxuICAgICAgaWYgKHNwZWMuZHR5cGUgIT0gbnVsbCkge1xuICAgICAgICBpZiAoeC5kdHlwZSAhPT0gc3BlYy5kdHlwZSkge1xuICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgICBgSW5wdXQgJHtpbnB1dEluZGV4fSBpcyBpbmNvbXBhdGlibGUgd2l0aCBsYXllciAke3RoaXMubmFtZX0gYCArXG4gICAgICAgICAgICAgIGA6IGV4cGVjdGVkIGR0eXBlPSR7c3BlYy5kdHlwZX0sIGZvdW5kIGR0eXBlPSR7eC5kdHlwZX0uYCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgc3BlY2lmaWMgc2hhcGUgYXhlcy5cbiAgICAgIGlmIChzcGVjLmF4ZXMpIHtcbiAgICAgICAgY29uc3QgeFNoYXBlID0geC5zaGFwZTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc3BlYy5heGVzKSB7XG4gICAgICAgICAgY29uc3QgYXhpcyA9IE51bWJlcihrZXkpO1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gc3BlYy5heGVzW2tleV07XG4gICAgICAgICAgLy8gUGVyZm9ybSBQeXRob24tc3R5bGUgc2xpY2luZyBpbiBjYXNlIGF4aXMgPCAwO1xuICAgICAgICAgIC8vIFRPRE8oY2Fpcyk6IFVzZSBodHRwczovL2dpdGh1Yi5jb20vYWx2aXZpL3R5cGVzY3JpcHQtdW5kZXJzY29yZSB0b1xuICAgICAgICAgIC8vIGVuc3VyZSB0eXBlIHNhZmV0eSB0aHJvdWdoIFVuZGVyc2NvcmUgY2FsbHMuXG4gICAgICAgICAgY29uc3QgeFNoYXBlQXRBeGlzID1cbiAgICAgICAgICAgICAgYXhpcyA+PSAwID8geFNoYXBlW2F4aXNdIDogeFNoYXBlW3hTaGFwZS5sZW5ndGggKyBheGlzXTtcbiAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiBbdmFsdWUsIG51bGxdLmluZGV4T2YoeFNoYXBlQXRBeGlzKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgICAgIGBJbnB1dCAke2lucHV0SW5kZXh9IGlzIGluY29tcGF0aWJsZSB3aXRoIGxheWVyIGAgK1xuICAgICAgICAgICAgICAgIGAke3RoaXMubmFtZX06IGV4cGVjdGVkIGF4aXMgJHtheGlzfSBvZiBpbnB1dCBzaGFwZSB0byBgICtcbiAgICAgICAgICAgICAgICBgaGF2ZSB2YWx1ZSAke3ZhbHVlfSBidXQgZ290IHNoYXBlICR7eFNoYXBlfS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgc2hhcGUuXG4gICAgICBpZiAoc3BlYy5zaGFwZSAhPSBudWxsKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BlYy5zaGFwZS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGNvbnN0IHNwZWNEaW0gPSBzcGVjLnNoYXBlW2ldO1xuICAgICAgICAgIGNvbnN0IGRpbSA9IHguc2hhcGVbaV07XG4gICAgICAgICAgaWYgKHNwZWNEaW0gIT0gbnVsbCAmJiBkaW0gIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHNwZWNEaW0gIT09IGRpbSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBJbnB1dCAke2lucHV0SW5kZXh9IGlzIGluY29tcGF0aWJsZSB3aXRoIGxheWVyIGAgK1xuICAgICAgICAgICAgICAgICAgYCR7dGhpcy5uYW1lfTogZXhwZWN0ZWQgc2hhcGU9JHtzcGVjLnNoYXBlfSwgYCArXG4gICAgICAgICAgICAgICAgICBgZm91bmQgc2hhcGU9JHt4LnNoYXBlfS5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBpcyB3aGVyZSB0aGUgbGF5ZXIncyBsb2dpYyBsaXZlcy5cbiAgICpcbiAgICogQHBhcmFtIGlucHV0cyBJbnB1dCB0ZW5zb3IsIG9yIGxpc3QvdHVwbGUgb2YgaW5wdXQgdGVuc29ycy5cbiAgICogQHBhcmFtIGt3YXJncyBBZGRpdGlvbmFsIGtleXdvcmQgYXJndW1lbnRzLlxuICAgKlxuICAgKiBAcmV0dXJuIEEgdGVuc29yIG9yIGxpc3QvdHVwbGUgb2YgdGVuc29ycy5cbiAgICovXG4gIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gaW5wdXRzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGludm9rZUNhbGxIb29rKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncykge1xuICAgIGlmICh0aGlzLl9jYWxsSG9vayAhPSBudWxsKSB7XG4gICAgICB0aGlzLl9jYWxsSG9vayhpbnB1dHMsIGt3YXJncyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCBjYWxsIGhvb2suXG4gICAqIFRoaXMgaXMgY3VycmVudGx5IHVzZWQgZm9yIHRlc3Rpbmcgb25seS5cbiAgICogQHBhcmFtIGNhbGxIb29rXG4gICAqL1xuICBzZXRDYWxsSG9vayhjYWxsSG9vazogQ2FsbEhvb2spIHtcbiAgICB0aGlzLl9jYWxsSG9vayA9IGNhbGxIb29rO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFyIGNhbGwgaG9vay5cbiAgICogVGhpcyBpcyBjdXJyZW50bHkgdXNlZCBmb3IgdGVzdGluZyBvbmx5LlxuICAgKi9cbiAgY2xlYXJDYWxsSG9vaygpIHtcbiAgICB0aGlzLl9jYWxsSG9vayA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIG9yIGV4ZWN1dGVzIGEgYExheWVyYCdzIGxvZ2ljLlxuICAgKlxuICAgKiBXaGVuIGNhbGxlZCB3aXRoIGB0Zi5UZW5zb3JgKHMpLCBleGVjdXRlIHRoZSBgTGF5ZXJgJ3MgY29tcHV0YXRpb24gYW5kXG4gICAqIHJldHVybiBUZW5zb3IocykuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiBjb25zdCBkZW5zZUxheWVyID0gdGYubGF5ZXJzLmRlbnNlKHtcbiAgICogICB1bml0czogMSxcbiAgICogICBrZXJuZWxJbml0aWFsaXplcjogJ3plcm9zJyxcbiAgICogICB1c2VCaWFzOiBmYWxzZVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gSW52b2tlIHRoZSBsYXllcidzIGFwcGx5KCkgbWV0aG9kIHdpdGggYSBgdGYuVGVuc29yYCAod2l0aCBjb25jcmV0ZVxuICAgKiAvLyBudW1lcmljIHZhbHVlcykuXG4gICAqIGNvbnN0IGlucHV0ID0gdGYub25lcyhbMiwgMl0pO1xuICAgKiBjb25zdCBvdXRwdXQgPSBkZW5zZUxheWVyLmFwcGx5KGlucHV0KTtcbiAgICpcbiAgICogLy8gVGhlIG91dHB1dCdzIHZhbHVlIGlzIGV4cGVjdGVkIHRvIGJlIFtbMF0sIFswXV0sIGR1ZSB0byB0aGUgZmFjdCB0aGF0XG4gICAqIC8vIHRoZSBkZW5zZSBsYXllciBoYXMgYSBrZXJuZWwgaW5pdGlhbGl6ZWQgdG8gYWxsLXplcm9zIGFuZCBkb2VzIG5vdCBoYXZlXG4gICAqIC8vIGEgYmlhcy5cbiAgICogb3V0cHV0LnByaW50KCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBXaGVuIGNhbGxlZCB3aXRoIGB0Zi5TeW1ib2xpY1RlbnNvcmAocyksIHRoaXMgd2lsbCBwcmVwYXJlIHRoZSBsYXllciBmb3JcbiAgICogZnV0dXJlIGV4ZWN1dGlvbi4gIFRoaXMgZW50YWlscyBpbnRlcm5hbCBib29rLWtlZXBpbmcgb24gc2hhcGVzIG9mXG4gICAqIGV4cGVjdGVkIFRlbnNvcnMsIHdpcmluZyBsYXllcnMgdG9nZXRoZXIsIGFuZCBpbml0aWFsaXppbmcgd2VpZ2h0cy5cbiAgICpcbiAgICogQ2FsbGluZyBgYXBwbHlgIHdpdGggYHRmLlN5bWJvbGljVGVuc29yYHMgYXJlIHR5cGljYWxseSB1c2VkIGR1cmluZyB0aGVcbiAgICogYnVpbGRpbmcgb2Ygbm9uLWB0Zi5TZXF1ZW50aWFsYCBtb2RlbHMuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiBjb25zdCBmbGF0dGVuTGF5ZXIgPSB0Zi5sYXllcnMuZmxhdHRlbigpO1xuICAgKiBjb25zdCBkZW5zZUxheWVyID0gdGYubGF5ZXJzLmRlbnNlKHt1bml0czogMX0pO1xuICAgKlxuICAgKiAvLyBVc2UgdGYubGF5ZXJzLmlucHV0KCkgdG8gb2J0YWluIGEgU3ltYm9saWNUZW5zb3IgYXMgaW5wdXQgdG8gYXBwbHkoKS5cbiAgICogY29uc3QgaW5wdXQgPSB0Zi5pbnB1dCh7c2hhcGU6IFsyLCAyXX0pO1xuICAgKiBjb25zdCBvdXRwdXQxID0gZmxhdHRlbkxheWVyLmFwcGx5KGlucHV0KTtcbiAgICpcbiAgICogLy8gb3V0cHV0MS5zaGFwZSBpcyBbbnVsbCwgNF0uIFRoZSBmaXJzdCBkaW1lbnNpb24gaXMgdGhlIHVuZGV0ZXJtaW5lZFxuICAgKiAvLyBiYXRjaCBzaXplLiBUaGUgc2Vjb25kIGRpbWVuc2lvbiBjb21lcyBmcm9tIGZsYXR0ZW5pbmcgdGhlIFsyLCAyXVxuICAgKiAvLyBzaGFwZS5cbiAgICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob3V0cHV0MS5zaGFwZSkpO1xuICAgKlxuICAgKiAvLyBUaGUgb3V0cHV0IFN5bWJvbGljVGVuc29yIG9mIHRoZSBmbGF0dGVuIGxheWVyIGNhbiBiZSB1c2VkIHRvIGNhbGxcbiAgICogLy8gdGhlIGFwcGx5KCkgb2YgdGhlIGRlbnNlIGxheWVyOlxuICAgKiBjb25zdCBvdXRwdXQyID0gZGVuc2VMYXllci5hcHBseShvdXRwdXQxKTtcbiAgICpcbiAgICogLy8gb3V0cHV0Mi5zaGFwZSBpcyBbbnVsbCwgMV0uIFRoZSBmaXJzdCBkaW1lbnNpb24gaXMgdGhlIHVuZGV0ZXJtaW5lZFxuICAgKiAvLyBiYXRjaCBzaXplLiBUaGUgc2Vjb25kIGRpbWVuc2lvbiBtYXRjaGVzIHRoZSBudW1iZXIgb2YgdW5pdHMgb2YgdGhlXG4gICAqIC8vIGRlbnNlIGxheWVyLlxuICAgKiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvdXRwdXQyLnNoYXBlKSk7XG4gICAqXG4gICAqIC8vIFRoZSBpbnB1dCBhbmQgb3V0cHV0IGNhbiBiZSB1c2VkIHRvIGNvbnN0cnVjdCBhIG1vZGVsIHRoYXQgY29uc2lzdHNcbiAgICogLy8gb2YgdGhlIGZsYXR0ZW4gYW5kIGRlbnNlIGxheWVycy5cbiAgICogY29uc3QgbW9kZWwgPSB0Zi5tb2RlbCh7aW5wdXRzOiBpbnB1dCwgb3V0cHV0czogb3V0cHV0Mn0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGlucHV0cyBhIGB0Zi5UZW5zb3JgIG9yIGB0Zi5TeW1ib2xpY1RlbnNvcmAgb3IgYW4gQXJyYXkgb2YgdGhlbS5cbiAgICogQHBhcmFtIGt3YXJncyBBZGRpdGlvbmFsIGtleXdvcmQgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBgY2FsbCgpYC5cbiAgICpcbiAgICogQHJldHVybiBPdXRwdXQgb2YgdGhlIGxheWVyJ3MgYGNhbGxgIG1ldGhvZC5cbiAgICpcbiAgICogQGV4Y2VwdGlvbiBWYWx1ZUVycm9yIGVycm9yIGluIGNhc2UgdGhlIGxheWVyIGlzIG1pc3Npbmcgc2hhcGUgaW5mb3JtYXRpb25cbiAgICogICBmb3IgaXRzIGBidWlsZGAgY2FsbC5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsICdzdWJoZWFkaW5nJzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgLy8gUG9ydGluZyBOb3RlOiBUaGlzIGlzIGEgcmVwbGFjZW1lbnQgZm9yIF9fY2FsbF9fKCkgaW4gUHl0aG9uLlxuICBhcHBseShcbiAgICAgIGlucHV0czogVGVuc29yfFRlbnNvcltdfFN5bWJvbGljVGVuc29yfFN5bWJvbGljVGVuc29yW10sXG4gICAgICBrd2FyZ3M/OiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW118U3ltYm9saWNUZW5zb3J8U3ltYm9saWNUZW5zb3JbXSB7XG4gICAga3dhcmdzID0ga3dhcmdzIHx8IHt9O1xuXG4gICAgdGhpcy5hc3NlcnROb3REaXNwb3NlZCgpO1xuXG4gICAgLy8gRW5zdXJlIGlucHV0cyBhcmUgYWxsIHRoZSBzYW1lIHR5cGUuXG4gICAgY29uc3QgaW5wdXRzTGlzdCA9IGdlbmVyaWNfdXRpbHMudG9MaXN0KGlucHV0cyk7XG5cbiAgICBjb25zdCBhbGxBcmVTeW1ib2xpYyA9IGNoZWNrQWxsU3ltYm9saWMoaW5wdXRzKTtcbiAgICBjb25zdCBub25lQXJlU3ltYm9saWMgPSBjaGVja05vbmVTeW1ib2xpYyhpbnB1dHMpO1xuXG4gICAgaWYgKGFsbEFyZVN5bWJvbGljID09PSBub25lQXJlU3ltYm9saWMpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICdBcmd1bWVudHMgdG8gYXBwbHkoKSBtdXN0IGJlIGFsbCAnICtcbiAgICAgICAgICAnU3ltYm9saWNUZW5zb3JzIG9yIGFsbCBUZW5zb3JzJyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBuYW1lU2NvcGUoKSBtYXkgbm90IGJlIG5lY2Vzc2FyeS5cbiAgICByZXR1cm4gbmFtZVNjb3BlKHRoaXMubmFtZSwgKCkgPT4ge1xuICAgICAgLy8gSGFuZGxlIGxheWluZyBidWlsZGluZyAod2VpZ2h0IGNyZWF0aW5nLCBpbnB1dCBzcGVjIGxvY2tpbmcpLlxuICAgICAgaWYgKCF0aGlzLmJ1aWx0KSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgVGhyb3cgZXhjZXB0aW9ucyBpbiBjYXNlIHRoZSBpbnB1dCBpcyBub3QgY29tcGF0aWJsZVxuICAgICAgICAgIHdpdGggdGhlIGlucHV0U3BlYyBzcGVjaWZpZWQgaW4gdGhlIGxheWVyIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hc3NlcnRJbnB1dENvbXBhdGliaWxpdHkoaW5wdXRzKTtcblxuICAgICAgICAvLyBDb2xsZWN0IGlucHV0IHNoYXBlcyB0byBidWlsZCBsYXllci5cbiAgICAgICAgY29uc3QgaW5wdXRTaGFwZXM6IFNoYXBlW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCB4RWxlbSBvZiBnZW5lcmljX3V0aWxzLnRvTGlzdChpbnB1dHMpKSB7XG4gICAgICAgICAgaW5wdXRTaGFwZXMucHVzaCh4RWxlbS5zaGFwZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5idWlsZChnZW5lcmljX3V0aWxzLnNpbmdsZXRvbk9yQXJyYXkoaW5wdXRTaGFwZXMpKTtcbiAgICAgICAgdGhpcy5idWlsdCA9IHRydWU7XG5cbiAgICAgICAgLy8gTG9hZCB3ZWlnaHRzIHRoYXQgd2VyZSBzcGVjaWZpZWQgYXQgbGF5ZXIgaW5zdGFudGlhdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuaW5pdGlhbFdlaWdodHMpIHtcbiAgICAgICAgICB0aGlzLnNldFdlaWdodHModGhpcy5pbml0aWFsV2VpZ2h0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fcmVmQ291bnQgPT09IG51bGwgJiYgbm9uZUFyZVN5bWJvbGljKSB7XG4gICAgICAgICAgLy8gVGhlIGZpcnN0IHVzZSBvZiB0aGlzIGxheWVyIGlzIGEgbm9uLXN5bWJvbGljIGNhbGwsIHNldCByZWYgY291bnRcbiAgICAgICAgICAvLyB0byAxIHNvIHRoZSBMYXllciBjYW4gYmUgcHJvcGVybHkgZGlzcG9zZWQgaWYgaXRzIGRpc3Bvc2UoKSBtZXRob2RcbiAgICAgICAgICAvLyBpcyBjYWxsZWQuXG4gICAgICAgICAgdGhpcy5fcmVmQ291bnQgPSAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgIFRocm93IGV4Y2VwdGlvbnMgaW4gY2FzZSB0aGUgaW5wdXQgaXMgbm90IGNvbXBhdGlibGVcbiAgICAgICAgd2l0aCB0aGUgaW5wdXRTcGVjIHNldCBhdCBidWlsZCB0aW1lLlxuICAgICAgKi9cbiAgICAgIHRoaXMuYXNzZXJ0SW5wdXRDb21wYXRpYmlsaXR5KGlucHV0cyk7XG5cbiAgICAgIC8vIEhhbmRsZSBtYXNrIHByb3BhZ2F0aW9uLlxuICAgICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBNYXNrIHByb3BhZ2F0aW9uIG5vdCBjdXJyZW50bHkgaW1wbGVtZW50ZWQuXG5cbiAgICAgIC8vIEFjdHVhbGx5IGNhbGwgdGhlIGxheWVyLCBjb2xsZWN0aW5nIG91dHB1dChzKSwgbWFzayhzKSwgYW5kIHNoYXBlKHMpLlxuICAgICAgaWYgKG5vbmVBcmVTeW1ib2xpYykge1xuICAgICAgICBsZXQgb3V0cHV0ID0gdGhpcy5jYWxsKGlucHV0cywga3dhcmdzKTtcblxuICAgICAgICAvLyBBcHBseSBtYXNrcyB0byB0aGUgb3V0cHV0IHRlbnNvcnMgaWYgdGhlIGxheWVyIHN1cHBvcnRzIGl0LlxuICAgICAgICBpZiAodGhpcy5zdXBwb3J0c01hc2tpbmcpIHtcbiAgICAgICAgICAvLyBUT0RPKG1hdHRzb3VsYW5pbGxlKTogcGFzcyB0aGUgaW5wdXQgdGVuc29ycycgbWFza3MgdG8gY29tcHV0ZU1hc2tcbiAgICAgICAgICB0aGlzLnNldE1hc2tNZXRhZGF0YShpbnB1dHMsIG91dHB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgbGF5ZXIgcmV0dXJucyB0ZW5zb3JzIGZyb20gaXRzIGlucHV0cywgdW5tb2RpZmllZCxcbiAgICAgICAgLy8gd2UgY29weSB0aGVtIHRvIGF2b2lkIGxvc3Mgb2YgdGVuc29yIG1ldGFkYXRhLlxuICAgICAgICBjb25zdCBvdXRwdXRMaXN0OiBUZW5zb3JbXSA9IGdlbmVyaWNfdXRpbHMudG9MaXN0KG91dHB1dCk7XG4gICAgICAgIGNvbnN0IG91dHB1dExpc3RDb3B5OiBUZW5zb3JbXSA9IFtdO1xuICAgICAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IFRoaXMgY29weWluZyBtYXkgbm90IGJlIG5lY2Vzc2FyeSBnaXZlbiBvdXIgZWFnZXJcbiAgICAgICAgLy8gYmFja2VuZC5cbiAgICAgICAgZm9yIChsZXQgeCBvZiBvdXRwdXRMaXN0KSB7XG4gICAgICAgICAgaWYgKGlucHV0c0xpc3QuaW5kZXhPZih4KSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHggPSB4LmNsb25lKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dHB1dExpc3RDb3B5LnB1c2goeCk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0cHV0ID0gZ2VuZXJpY191dGlscy5zaW5nbGV0b25PckFycmF5KG91dHB1dExpc3RDb3B5KTtcblxuICAgICAgICBpZiAodGhpcy5hY3Rpdml0eVJlZ3VsYXJpemVyICE9IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgICAgICAgJ0xheWVyIGludm9jYXRpb24gaW4gdGhlIHByZXNlbmNlIG9mIGFjdGl2aXR5ICcgK1xuICAgICAgICAgICAgICAncmVndWxhcml6ZXIocykgaXMgbm90IHN1cHBvcnRlZCB5ZXQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeSk6IENhbGwgYWRkSW5ib3VuZE5vZGUoKT9cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlucHV0U2hhcGUgPSBjb2xsZWN0SW5wdXRTaGFwZShpbnB1dHMpO1xuICAgICAgICBjb25zdCBvdXRwdXRTaGFwZSA9IHRoaXMuY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGUpO1xuICAgICAgICBsZXQgb3V0cHV0OiBTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdO1xuICAgICAgICBjb25zdCBvdXRwdXREVHlwZSA9IGd1ZXNzT3V0cHV0RFR5cGUoaW5wdXRzKTtcbiAgICAgICAgdGhpcy53YXJuT25JbmNvbXBhdGlibGVJbnB1dFNoYXBlKFxuICAgICAgICAgICAgQXJyYXkuaXNBcnJheShpbnB1dHMpID8gaW5wdXRTaGFwZVswXSBhcyBTaGFwZSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFNoYXBlIGFzIFNoYXBlKTtcblxuICAgICAgICBpZiAob3V0cHV0U2hhcGUgIT0gbnVsbCAmJiBvdXRwdXRTaGFwZS5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KG91dHB1dFNoYXBlWzBdKSkge1xuICAgICAgICAgIC8vIFdlIGhhdmUgbXVsdGlwbGUgb3V0cHV0IHNoYXBlcy4gQ3JlYXRlIG11bHRpcGxlIG91dHB1dCB0ZW5zb3JzLlxuICAgICAgICAgIG91dHB1dCA9IChvdXRwdXRTaGFwZSBhcyBTaGFwZVtdKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKHNoYXBlLCBpbmRleCkgPT4gbmV3IFN5bWJvbGljVGVuc29yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dERUeXBlLCBzaGFwZSwgdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmljX3V0aWxzLnRvTGlzdChpbnB1dHMpLCBrd2FyZ3MsIHRoaXMubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dHB1dCA9IG5ldyBTeW1ib2xpY1RlbnNvcihcbiAgICAgICAgICAgICAgb3V0cHV0RFR5cGUsIG91dHB1dFNoYXBlIGFzIFNoYXBlLCB0aGlzLFxuICAgICAgICAgICAgICBnZW5lcmljX3V0aWxzLnRvTGlzdChpbnB1dHMpLCBrd2FyZ3MsIHRoaXMubmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgIEFkZCBhbiBpbmJvdW5kIG5vZGUgdG8gdGhlIGxheWVyLCBzbyB0aGF0IGl0IGtlZXBzIHRyYWNrXG4gICAgICAgICAgb2YgdGhlIGNhbGwgYW5kIG9mIGFsbCBuZXcgdmFyaWFibGVzIGNyZWF0ZWQgZHVyaW5nIHRoZSBjYWxsLlxuICAgICAgICAgIFRoaXMgYWxzbyB1cGRhdGVzIHRoZSBsYXllciBoaXN0b3J5IG9mIHRoZSBvdXRwdXQgdGVuc29yKHMpLlxuICAgICAgICAgIElmIHRoZSBpbnB1dCB0ZW5zb3IocykgaGFkIG5vIHByZXZpb3VzIGhpc3RvcnksXG4gICAgICAgICAgdGhpcyBkb2VzIG5vdGhpbmcuXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuYWRkSW5ib3VuZE5vZGUoXG4gICAgICAgICAgICBpbnB1dHMsIG91dHB1dCwgbnVsbCwgbnVsbCwgaW5wdXRTaGFwZSwgb3V0cHV0U2hhcGUsIGt3YXJncyk7XG4gICAgICAgIHRoaXMuX3JlZkNvdW50Kys7XG5cbiAgICAgICAgaWYgKHRoaXMuYWN0aXZpdHlSZWd1bGFyaXplciAhPSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgICAgICdMYXllciBpbnZvY2F0aW9uIGluIHRoZSBwcmVzZW5jZSBvZiBhY3Rpdml0eSAnICtcbiAgICAgICAgICAgICAgJ3JlZ3VsYXJpemVyKHMpIGlzIG5vdCBzdXBwb3J0ZWQgeWV0LicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBjb21wYXRpYmlsaXR5IGJldHdlZW4gaW5wdXQgc2hhcGUgYW5kIHRoaXMgbGF5ZXIncyBiYXRjaElucHV0U2hhcGUuXG4gICAqXG4gICAqIFByaW50IHdhcm5pbmcgaWYgYW55IGluY29tcGF0aWJpbGl0eSBpcyBmb3VuZC5cbiAgICpcbiAgICogQHBhcmFtIGlucHV0U2hhcGUgSW5wdXQgc2hhcGUgdG8gYmUgY2hlY2tlZC5cbiAgICovXG4gIHByb3RlY3RlZCB3YXJuT25JbmNvbXBhdGlibGVJbnB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlKSB7XG4gICAgaWYgKHRoaXMuYmF0Y2hJbnB1dFNoYXBlID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGlucHV0U2hhcGUubGVuZ3RoICE9PSB0aGlzLmJhdGNoSW5wdXRTaGFwZS5sZW5ndGgpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgVGhlIHJhbmsgb2YgdGhlIGlucHV0IHRlbnNvciBwcm92aWRlZCAoc2hhcGU6IGAgK1xuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGlucHV0U2hhcGUpfSkgZG9lcyBub3QgbWF0Y2ggdGhhdCBvZiB0aGUgYCArXG4gICAgICAgICAgYGJhdGNoSW5wdXRTaGFwZSAoJHtKU09OLnN0cmluZ2lmeSh0aGlzLmJhdGNoSW5wdXRTaGFwZSl9KSBgICtcbiAgICAgICAgICBgb2YgdGhlIGxheWVyICR7dGhpcy5uYW1lfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgZGltTWlzbWF0Y2ggPSBmYWxzZTtcbiAgICAgIHRoaXMuYmF0Y2hJbnB1dFNoYXBlLmZvckVhY2goKGRpbWVuc2lvbiwgaSkgPT4ge1xuICAgICAgICBpZiAoZGltZW5zaW9uICE9IG51bGwgJiYgaW5wdXRTaGFwZVtpXSAhPSBudWxsICYmXG4gICAgICAgICAgICBpbnB1dFNoYXBlW2ldICE9PSBkaW1lbnNpb24pIHtcbiAgICAgICAgICBkaW1NaXNtYXRjaCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKGRpbU1pc21hdGNoKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgIGBUaGUgc2hhcGUgb2YgdGhlIGlucHV0IHRlbnNvciBgICtcbiAgICAgICAgICAgIGAoJHtKU09OLnN0cmluZ2lmeShpbnB1dFNoYXBlKX0pIGRvZXMgbm90IGAgK1xuICAgICAgICAgICAgYG1hdGNoIHRoZSBleHBlY3RhdGlvbiBvZiBsYXllciAke3RoaXMubmFtZX06IGAgK1xuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkodGhpcy5iYXRjaElucHV0U2hhcGUpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIG91dHB1dCBzaGFwZShzKSBvZiBhIGxheWVyLlxuICAgKlxuICAgKiBPbmx5IGFwcGxpY2FibGUgaWYgdGhlIGxheWVyIGhhcyBvbmx5IG9uZSBpbmJvdW5kIG5vZGUsIG9yIGlmIGFsbCBpbmJvdW5kXG4gICAqIG5vZGVzIGhhdmUgdGhlIHNhbWUgb3V0cHV0IHNoYXBlLlxuICAgKlxuICAgKiBAcmV0dXJucyBPdXRwdXQgc2hhcGUgb3Igc2hhcGVzLlxuICAgKiBAdGhyb3dzIEF0dHJpYnV0ZUVycm9yOiBpZiB0aGUgbGF5ZXIgaXMgY29ubmVjdGVkIHRvIG1vcmUgdGhhbiBvbmUgaW5jb21pbmdcbiAgICogICBub2Rlcy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsICdzdWJoZWFkaW5nJzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgZ2V0IG91dHB1dFNoYXBlKCk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlmICh0aGlzLmluYm91bmROb2RlcyA9PSBudWxsIHx8IHRoaXMuaW5ib3VuZE5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKFxuICAgICAgICAgIGBUaGUgbGF5ZXIgJHt0aGlzLm5hbWV9IGhhcyBuZXZlciBiZWVuIGNhbGxlZCBhbmQgdGh1cyBoYXMgbm8gYCArXG4gICAgICAgICAgYGRlZmluZWQgb3V0cHV0IHNoYXBlLmApO1xuICAgIH1cbiAgICBjb25zdCBhbGxPdXRwdXRTaGFwZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBub2RlIG9mIHRoaXMuaW5ib3VuZE5vZGVzKSB7XG4gICAgICBjb25zdCBzaGFwZVN0cmluZyA9IEpTT04uc3RyaW5naWZ5KG5vZGUub3V0cHV0U2hhcGVzKTtcbiAgICAgIGlmIChhbGxPdXRwdXRTaGFwZXMuaW5kZXhPZihzaGFwZVN0cmluZykgPT09IC0xKSB7XG4gICAgICAgIGFsbE91dHB1dFNoYXBlcy5wdXNoKHNoYXBlU3RyaW5nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFsbE91dHB1dFNoYXBlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IG91dHB1dFNoYXBlcyA9IHRoaXMuaW5ib3VuZE5vZGVzWzBdLm91dHB1dFNoYXBlcztcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG91dHB1dFNoYXBlcykgJiYgQXJyYXkuaXNBcnJheShvdXRwdXRTaGFwZXNbMF0pICYmXG4gICAgICAgICAgb3V0cHV0U2hhcGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gKG91dHB1dFNoYXBlcyBhcyBTaGFwZVtdKVswXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvdXRwdXRTaGFwZXM7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEF0dHJpYnV0ZUVycm9yKFxuICAgICAgICAgIGBUaGUgbGF5ZXIgJHt0aGlzLm5hbWV9IGhhcyBtdWx0aXBsZSBpbmJvdW5kIG5vZGVzIHdpdGggZGlmZmVyZW50IGAgK1xuICAgICAgICAgIGBvdXRwdXQgc2hhcGVzLiBIZW5jZSB0aGUgbm90aW9uIG9mIFwib3V0cHV0IHNoYXBlXCIgaXMgaWxsLWRlZmluZWQgYCArXG4gICAgICAgICAgYGZvciB0aGUgbGF5ZXIuYCk7XG4gICAgICAvLyBUT0RPKGNhaXMpOiBJbXBsZW1lbnQgZ2V0T3V0cHV0U2hhcGVBdCgpLlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb3VudHMgdGhlIHRvdGFsIG51bWJlciBvZiBudW1iZXJzIChlLmcuLCBmbG9hdDMyLCBpbnQzMikgaW4gdGhlXG4gICAqIHdlaWdodHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEFuIGludGVnZXIgY291bnQuXG4gICAqIEB0aHJvd3MgUnVudGltZUVycm9yOiBJZiB0aGUgbGF5ZXIgaXMgbm90IGJ1aWx0IHlldCAoaW4gd2hpY2ggY2FzZSBpdHNcbiAgICogICB3ZWlnaHRzIGFyZSBub3QgZGVmaW5lZCB5ZXQuKVxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgJ3N1YmhlYWRpbmcnOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBjb3VudFBhcmFtcygpOiBudW1iZXIge1xuICAgIGlmICghdGhpcy5idWlsdCkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBgWW91IHRyaWVkIHRvIGNhbGwgY291bnRQYXJhbXMoKSBvbiAke3RoaXMubmFtZX0sIGAgK1xuICAgICAgICAgIGBidXQgdGhlIGxheWVyIGlzIG5vdCBidWlsdCB5ZXQuIEJ1aWxkIGl0IGZpcnN0IGJ5IGNhbGxpbmcgYCArXG4gICAgICAgICAgYGJ1aWxkKGJhdGNoSW5wdXRTaGFwZSkuYCk7XG4gICAgfVxuICAgIHJldHVybiB2YXJpYWJsZV91dGlscy5jb3VudFBhcmFtc0luV2VpZ2h0cyh0aGlzLndlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGxheWVyIHdlaWdodHMuXG4gICAqXG4gICAqIE11c3QgYmUgaW1wbGVtZW50ZWQgb24gYWxsIGxheWVycyB0aGF0IGhhdmUgd2VpZ2h0cy5cbiAgICpcbiAgICogQ2FsbGVkIHdoZW4gYXBwbHkoKSBpcyBjYWxsZWQgdG8gY29uc3RydWN0IHRoZSB3ZWlnaHRzLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRTaGFwZSBBIGBTaGFwZWAgb3IgYXJyYXkgb2YgYFNoYXBlYCAodW51c2VkKS5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsICdzdWJoZWFkaW5nJzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSkge1xuICAgIHRoaXMuYnVpbHQgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWVzIG9mIHRoZSB3ZWlnaHRzIG9mIHRoZSBsYXllci5cbiAgICpcbiAgICogQHBhcmFtIHRyYWluYWJsZU9ubHkgV2hldGhlciB0byBnZXQgdGhlIHZhbHVlcyBvZiBvbmx5IHRyYWluYWJsZSB3ZWlnaHRzLlxuICAgKiBAcmV0dXJucyBXZWlnaHQgdmFsdWVzIGFzIGFuIGBBcnJheWAgb2YgYHRmLlRlbnNvcmBzLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgJ3N1YmhlYWRpbmcnOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBnZXRXZWlnaHRzKHRyYWluYWJsZU9ubHkgPSBmYWxzZSk6IFRlbnNvcltdIHtcbiAgICByZXR1cm4gYmF0Y2hHZXRWYWx1ZSh0cmFpbmFibGVPbmx5ID8gdGhpcy50cmFpbmFibGVXZWlnaHRzIDogdGhpcy53ZWlnaHRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB3ZWlnaHRzIG9mIHRoZSBsYXllciwgZnJvbSBUZW5zb3JzLlxuICAgKlxuICAgKiBAcGFyYW0gd2VpZ2h0cyBhIGxpc3Qgb2YgVGVuc29ycy4gVGhlIG51bWJlciBvZiBhcnJheXMgYW5kIHRoZWlyIHNoYXBlXG4gICAqICAgbXVzdCBtYXRjaCBudW1iZXIgb2YgdGhlIGRpbWVuc2lvbnMgb2YgdGhlIHdlaWdodHMgb2YgdGhlIGxheWVyIChpLmUuXG4gICAqICAgaXQgc2hvdWxkIG1hdGNoIHRoZSBvdXRwdXQgb2YgYGdldFdlaWdodHNgKS5cbiAgICpcbiAgICogQGV4Y2VwdGlvbiBWYWx1ZUVycm9yIElmIHRoZSBwcm92aWRlZCB3ZWlnaHRzIGxpc3QgZG9lcyBub3QgbWF0Y2ggdGhlXG4gICAqICAgbGF5ZXIncyBzcGVjaWZpY2F0aW9ucy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsICdzdWJoZWFkaW5nJzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgc2V0V2VpZ2h0cyh3ZWlnaHRzOiBUZW5zb3JbXSk6IHZvaWQge1xuICAgIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy53ZWlnaHRzO1xuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggIT09IHdlaWdodHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIFRPRE8oY2Fpcyk6IFJlc3RvcmUgdGhlIGZvbGxvd2luZyBhbmQgdXNlIGBwcm92aWRlZFdlaWdodHNgLCBpbnN0ZWFkXG4gICAgICAgIC8vIG9mIGB3ZWlnaHRzYCBpbiB0aGUgZXJyb3IgbWVzc2FnZSwgb25jZSB0aGUgZGVlcGxlYXJuLmpzIGJ1ZyBpc1xuICAgICAgICAvLyBmaXhlZDogaHR0cHM6Ly9naXRodWIuY29tL1BBSVItY29kZS9kZWVwbGVhcm5qcy9pc3N1ZXMvNDk4IGNvbnN0XG4gICAgICAgIC8vIHByb3ZpZGVkV2VpZ2h0cyA9IEpTT04uc3RyaW5naWZ5KHdlaWdodHMpLnNsaWNlKDAsIDUwKTtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICBgWW91IGNhbGxlZCBzZXRXZWlnaHRzKHdlaWdodHMpIG9uIGxheWVyIFwiJHt0aGlzLm5hbWV9XCIgYCArXG4gICAgICAgICAgICBgd2l0aCBhIHdlaWdodCBsaXN0IG9mIGxlbmd0aCAke3dlaWdodHMubGVuZ3RofSwgYCArXG4gICAgICAgICAgICBgYnV0IHRoZSBsYXllciB3YXMgZXhwZWN0aW5nICR7cGFyYW1zLmxlbmd0aH0gd2VpZ2h0cy4gYCArXG4gICAgICAgICAgICBgUHJvdmlkZWQgd2VpZ2h0czogJHt3ZWlnaHRzfS4uLmApO1xuICAgICAgfVxuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgd2VpZ2h0VmFsdWVUdXBsZXM6IEFycmF5PFtMYXllclZhcmlhYmxlLCBUZW5zb3JdPiA9IFtdO1xuICAgICAgY29uc3QgcGFyYW1WYWx1ZXMgPSBiYXRjaEdldFZhbHVlKHBhcmFtcyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtVmFsdWVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGNvbnN0IHB2ID0gcGFyYW1WYWx1ZXNbaV07XG4gICAgICAgIGNvbnN0IHAgPSBwYXJhbXNbaV07XG4gICAgICAgIGNvbnN0IHcgPSB3ZWlnaHRzW2ldO1xuICAgICAgICBpZiAoIXV0aWwuYXJyYXlzRXF1YWwocHYuc2hhcGUsIHcuc2hhcGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAgIGBMYXllciB3ZWlnaHQgc2hhcGUgJHtwdi5zaGFwZX0gYCArXG4gICAgICAgICAgICAgIGBub3QgY29tcGF0aWJsZSB3aXRoIHByb3ZpZGVkIHdlaWdodCBzaGFwZSAke3cuc2hhcGV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgd2VpZ2h0VmFsdWVUdXBsZXMucHVzaChbcCwgd10pO1xuICAgICAgfVxuICAgICAgYmF0Y2hTZXRWYWx1ZSh3ZWlnaHRWYWx1ZVR1cGxlcyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIHdlaWdodCB2YXJpYWJsZSB0byB0aGUgbGF5ZXIuXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgdGhlIG5ldyB3ZWlnaHQgdmFyaWFibGUuXG4gICAqIEBwYXJhbSBzaGFwZSBUaGUgc2hhcGUgb2YgdGhlIHdlaWdodC5cbiAgICogQHBhcmFtIGR0eXBlIFRoZSBkdHlwZSBvZiB0aGUgd2VpZ2h0LlxuICAgKiBAcGFyYW0gaW5pdGlhbGl6ZXIgQW4gaW5pdGlhbGl6ZXIgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSByZWd1bGFyaXplciBBIHJlZ3VsYXJpemVyIGluc3RhbmNlLlxuICAgKiBAcGFyYW0gdHJhaW5hYmxlIFdoZXRoZXIgdGhlIHdlaWdodCBzaG91bGQgYmUgdHJhaW5lZCB2aWEgYmFja3Byb3Agb3Igbm90XG4gICAqICAgKGFzc3VtaW5nIHRoYXQgdGhlIGxheWVyIGl0c2VsZiBpcyBhbHNvIHRyYWluYWJsZSkuXG4gICAqIEBwYXJhbSBjb25zdHJhaW50IEFuIG9wdGlvbmFsIHRyYWluYWJsZS5cbiAgICogQHJldHVybiBUaGUgY3JlYXRlZCB3ZWlnaHQgdmFyaWFibGUuXG4gICAqXG4gICAqIEBkb2Mge2hlYWRpbmc6ICdNb2RlbHMnLCAnc3ViaGVhZGluZyc6ICdDbGFzc2VzJ31cbiAgICovXG4gIHByb3RlY3RlZCBhZGRXZWlnaHQoXG4gICAgICBuYW1lOiBzdHJpbmcsIHNoYXBlOiBTaGFwZSwgZHR5cGU/OiBEYXRhVHlwZSwgaW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcixcbiAgICAgIHJlZ3VsYXJpemVyPzogUmVndWxhcml6ZXIsIHRyYWluYWJsZT86IGJvb2xlYW4sIGNvbnN0cmFpbnQ/OiBDb25zdHJhaW50LFxuICAgICAgZ2V0SW5pdGlhbGl6ZXJGdW5jPzogRnVuY3Rpb24pOiBMYXllclZhcmlhYmxlIHtcbiAgICAvLyBSZWplY3QgZHVwbGljYXRlIHdlaWdodCBuYW1lcy5cbiAgICBpZiAodGhpcy5fYWRkZWRXZWlnaHROYW1lcy5pbmRleE9mKG5hbWUpICE9PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYER1cGxpY2F0ZSB3ZWlnaHQgbmFtZSAke25hbWV9IGZvciBsYXllciAke3RoaXMubmFtZX1gKTtcbiAgICB9XG4gICAgdGhpcy5fYWRkZWRXZWlnaHROYW1lcy5wdXNoKG5hbWUpO1xuXG4gICAgaWYgKGR0eXBlID09IG51bGwpIHtcbiAgICAgIGR0eXBlID0gJ2Zsb2F0MzInO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZhc3RXZWlnaHRJbml0RHVyaW5nQnVpbGQpIHtcbiAgICAgIGluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXJGdW5jICE9IG51bGwgPyBnZXRJbml0aWFsaXplckZ1bmMoKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0SW5pdGlhbGl6ZXIoJ3plcm9zJyk7XG4gICAgfVxuICAgIGNvbnN0IGluaXRWYWx1ZSA9IGluaXRpYWxpemVyLmFwcGx5KHNoYXBlLCBkdHlwZSk7XG4gICAgY29uc3Qgd2VpZ2h0ID1cbiAgICAgICAgbmV3IExheWVyVmFyaWFibGUoaW5pdFZhbHVlLCBkdHlwZSwgbmFtZSwgdHJhaW5hYmxlLCBjb25zdHJhaW50KTtcbiAgICBpbml0VmFsdWUuZGlzcG9zZSgpO1xuICAgIC8vIFJlcXVlc3QgYmFja2VuZCBub3QgdG8gZGlzcG9zZSB0aGUgd2VpZ2h0cyBvZiB0aGUgbW9kZWwgb24gc2NvcGUoKSBleGl0LlxuICAgIGlmIChyZWd1bGFyaXplciAhPSBudWxsKSB7XG4gICAgICB0aGlzLmFkZExvc3MoKCkgPT4gcmVndWxhcml6ZXIuYXBwbHkod2VpZ2h0LnJlYWQoKSkpO1xuICAgIH1cbiAgICBpZiAodHJhaW5hYmxlID09IG51bGwpIHtcbiAgICAgIHRyYWluYWJsZSA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0cmFpbmFibGUpIHtcbiAgICAgIHRoaXMuX3RyYWluYWJsZVdlaWdodHMucHVzaCh3ZWlnaHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9ub25UcmFpbmFibGVXZWlnaHRzLnB1c2god2VpZ2h0KTtcbiAgICB9XG4gICAgcmV0dXJuIHdlaWdodDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGZhc3Qtd2VpZ2h0LWluaXRpYWxpemF0aW9uIGZsYWcuXG4gICAqXG4gICAqIEluIGNhc2VzIHdoZXJlIHRoZSBpbml0aWFsaXplZCB3ZWlnaHQgdmFsdWVzIHdpbGwgYmUgaW1tZWRpYXRlbHlcbiAgICogb3ZlcndyaXR0ZW4gYnkgbG9hZGVkIHdlaWdodCB2YWx1ZXMgZHVyaW5nIG1vZGVsIGxvYWRpbmcsIHNldHRpbmdcbiAgICogdGhlIGZsYWcgdG8gYHRydWVgIHNhdmVzIHVubmVjZXNzYXJ5IGNhbGxzIHRvIHBvdGVudGlhbGx5IGV4cGVuc2l2ZVxuICAgKiBpbml0aWFsaXplcnMgYW5kIHNwZWVkcyB1cCB0aGUgbG9hZGluZyBwcm9jZXNzLlxuICAgKlxuICAgKiBAcGFyYW0gdmFsdWUgVGFyZ2V0IHZhbHVlIG9mIHRoZSBmbGFnLlxuICAgKi9cbiAgc2V0RmFzdFdlaWdodEluaXREdXJpbmdCdWlsZCh2YWx1ZTogYm9vbGVhbikge1xuICAgIHRoaXMuZmFzdFdlaWdodEluaXREdXJpbmdCdWlsZCA9IHZhbHVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBsb3NzZXMgdG8gdGhlIGxheWVyLlxuICAgKlxuICAgKiBUaGUgbG9zcyBtYXkgcG90ZW50aWFsbHkgYmUgY29uZGl0aW9uYWwgb24gc29tZSBpbnB1dHMgdGVuc29ycyxcbiAgICogZm9yIGluc3RhbmNlIGFjdGl2aXR5IGxvc3NlcyBhcmUgY29uZGl0aW9uYWwgb24gdGhlIGxheWVyJ3MgaW5wdXRzLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgJ3N1YmhlYWRpbmcnOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBhZGRMb3NzKGxvc3NlczogUmVndWxhcml6ZXJGbnxSZWd1bGFyaXplckZuW10pOiB2b2lkIHtcbiAgICBpZiAobG9zc2VzID09IG51bGwgfHwgQXJyYXkuaXNBcnJheShsb3NzZXMpICYmIGxvc3Nlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVXBkYXRlIHRoaXMubG9zc2VzXG4gICAgbG9zc2VzID0gZ2VuZXJpY191dGlscy50b0xpc3QobG9zc2VzKTtcbiAgICBpZiAodGhpcy5fbG9zc2VzICE9PSB1bmRlZmluZWQgJiYgdGhpcy5fbG9zc2VzICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmxvc3Nlcy5wdXNoKC4uLmxvc3Nlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIHRoZSBvdXRwdXQgc2hhcGUgb2YgdGhlIGxheWVyLlxuICAgKlxuICAgKiBBc3N1bWVzIHRoYXQgdGhlIGxheWVyIHdpbGwgYmUgYnVpbHQgdG8gbWF0Y2ggdGhhdCBpbnB1dCBzaGFwZSBwcm92aWRlZC5cbiAgICpcbiAgICogQHBhcmFtIGlucHV0U2hhcGUgQSBzaGFwZSAodHVwbGUgb2YgaW50ZWdlcnMpIG9yIGEgbGlzdCBvZiBzaGFwZSB0dXBsZXNcbiAgICogICAob25lIHBlciBvdXRwdXQgdGVuc29yIG9mIHRoZSBsYXllcikuIFNoYXBlIHR1cGxlcyBjYW4gaW5jbHVkZSBudWxsIGZvclxuICAgKiAgIGZyZWUgZGltZW5zaW9ucywgaW5zdGVhZCBvZiBhbiBpbnRlZ2VyLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgJ3N1YmhlYWRpbmcnOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIHJldHVybiBpbnB1dFNoYXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIGFuIG91dHB1dCBtYXNrIHRlbnNvci5cbiAgICpcbiAgICogQHBhcmFtIGlucHV0cyBUZW5zb3Igb3IgbGlzdCBvZiB0ZW5zb3JzLlxuICAgKiBAcGFyYW0gbWFzayBUZW5zb3Igb3IgbGlzdCBvZiB0ZW5zb3JzLlxuICAgKlxuICAgKiBAcmV0dXJuIG51bGwgb3IgYSB0ZW5zb3IgKG9yIGxpc3Qgb2YgdGVuc29ycywgb25lIHBlciBvdXRwdXQgdGVuc29yIG9mIHRoZVxuICAgKiBsYXllcikuXG4gICAqL1xuICBjb21wdXRlTWFzayhpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwgbWFzaz86IFRlbnNvcnxUZW5zb3JbXSk6IFRlbnNvclxuICAgICAgfFRlbnNvcltdIHtcbiAgICBpZiAoIXRoaXMuc3VwcG9ydHNNYXNraW5nKSB7XG4gICAgICBpZiAobWFzayAhPSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1hc2spKSB7XG4gICAgICAgICAgbWFzay5mb3JFYWNoKG1hc2tFbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChtYXNrRWxlbWVudCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgTGF5ZXIgJHt0aGlzLm5hbWV9IGRvZXMgbm90IHN1cHBvcnQgbWFza2luZywgYCArXG4gICAgICAgICAgICAgICAgICAnYnV0IHdhcyBwYXNzZWQgYW4gaW5wdXRNYXNrLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIGBMYXllciAke3RoaXMubmFtZX0gZG9lcyBub3Qgc3VwcG9ydCBtYXNraW5nLCBgICtcbiAgICAgICAgICAgICAgJ2J1dCB3YXMgcGFzc2VkIGFuIGlucHV0TWFzay4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gbWFza2luZyBub3QgZXhwbGljaXRseSBzdXBwb3J0ZWQ6IHJldHVybiBudWxsIGFzIG1hc2tcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBpZiBtYXNraW5nIGlzIGV4cGxpY3RseSBzdXBwb3J0ZWQsIGJ5IGRlZmF1bHRcbiAgICAvLyBjYXJyeSBvdmVyIHRoZSBpbnB1dCBtYXNrXG4gICAgcmV0dXJuIG1hc2s7XG4gIH1cblxuICBwcml2YXRlIHNldE1hc2tNZXRhZGF0YShcbiAgICAgIGlucHV0czogVGVuc29yfFRlbnNvcltdLCBvdXRwdXRzOiBUZW5zb3J8VGVuc29yW10sXG4gICAgICBwcmV2aW91c01hc2s/OiBUZW5zb3J8VGVuc29yW10pOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc3VwcG9ydHNNYXNraW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0TWFza3MgPSB0aGlzLmNvbXB1dGVNYXNrKGlucHV0cywgcHJldmlvdXNNYXNrKTtcbiAgICBjb25zdCBvdXRwdXRzTGlzdCA9IGdlbmVyaWNfdXRpbHMudG9MaXN0KG91dHB1dHMpO1xuICAgIGNvbnN0IG91dHB1dE1hc2tzTGlzdCA9IGdlbmVyaWNfdXRpbHMudG9MaXN0KG91dHB1dE1hc2tzKTtcblxuICAgIGlmIChvdXRwdXRzTGlzdC5sZW5ndGggIT09IG91dHB1dE1hc2tzTGlzdC5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgJHt0aGlzLm5hbWV9IG91dHB1dHMgJHtvdXRwdXRzTGlzdC5sZW5ndGh9IHRlbnNvcnMgYCArXG4gICAgICAgICAgYGJ1dCAke291dHB1dHNMaXN0Lmxlbmd0aH0gbWFza3MgZm9yIHRob3NlIHRlbnNvcnNgKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXRzTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0cHV0c0xpc3RbaV0ua2VyYXNNYXNrID0gb3V0cHV0TWFza3NMaXN0W2ldO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBtZXRob2QgdG8gY3JlYXRlIGFuIGluYm91bmQgbm9kZSBmb3IgdGhlIGxheWVyLlxuICAgKlxuICAgKiBAcGFyYW0gaW5wdXRUZW5zb3JzIExpc3Qgb2YgaW5wdXQgdGVuc29ycy5cbiAgICogQHBhcmFtIG91dHB1dFRlbnNvcnMgTGlzdCBvZiBvdXRwdXQgdGVuc29ycy5cbiAgICogQHBhcmFtIGlucHV0TWFza3MgTGlzdCBvZiBpbnB1dCBtYXNrcyAoYSBtYXNrIGNhbiBiZSBhIHRlbnNvciwgb3IgbnVsbCkuXG4gICAqIEBwYXJhbSBvdXRwdXRNYXNrcyBMaXN0IG9mIG91dHB1dCBtYXNrcyAoYSBtYXNrIGNhbiBiZSBhIHRlbnNvciwgb3IgbnVsbCkuXG4gICAqIEBwYXJhbSBpbnB1dFNoYXBlcyBMaXN0IG9mIGlucHV0IHNoYXBlIHR1cGxlcy5cbiAgICogQHBhcmFtIG91dHB1dFNoYXBlcyBMaXN0IG9mIG91dHB1dCBzaGFwZSB0dXBsZXMuXG4gICAqIEBwYXJhbSBrd2FyZ3MgRGljdGlvbmFyeSBvZiBrZXl3b3JkIGFyZ3VtZW50cyB0aGF0IHdlcmUgcGFzc2VkIHRvIHRoZVxuICAgKiAgIGBjYWxsYCBtZXRob2Qgb2YgdGhlIGxheWVyIGF0IHRoZSBjYWxsIHRoYXQgY3JlYXRlZCB0aGUgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgYWRkSW5ib3VuZE5vZGUoXG4gICAgICBpbnB1dFRlbnNvcnM6IFN5bWJvbGljVGVuc29yfFN5bWJvbGljVGVuc29yW10sXG4gICAgICBvdXRwdXRUZW5zb3JzOiBTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdLFxuICAgICAgaW5wdXRNYXNrczogVGVuc29yfFRlbnNvcltdLCBvdXRwdXRNYXNrczogVGVuc29yfFRlbnNvcltdLFxuICAgICAgaW5wdXRTaGFwZXM6IFNoYXBlfFNoYXBlW10sIG91dHB1dFNoYXBlczogU2hhcGV8U2hhcGVbXSxcbiAgICAgIGt3YXJnczoge30gPSBudWxsKTogdm9pZCB7XG4gICAgY29uc3QgaW5wdXRUZW5zb3JMaXN0OiBTeW1ib2xpY1RlbnNvcltdID1cbiAgICAgICAgZ2VuZXJpY191dGlscy50b0xpc3QoaW5wdXRUZW5zb3JzKTtcbiAgICBvdXRwdXRUZW5zb3JzID0gZ2VuZXJpY191dGlscy50b0xpc3Qob3V0cHV0VGVuc29ycyk7XG4gICAgaW5wdXRNYXNrcyA9IGdlbmVyaWNfdXRpbHMudG9MaXN0KGlucHV0TWFza3MpO1xuICAgIG91dHB1dE1hc2tzID0gZ2VuZXJpY191dGlscy50b0xpc3Qob3V0cHV0TWFza3MpO1xuICAgIGlucHV0U2hhcGVzID0gdHlwZXNfdXRpbHMubm9ybWFsaXplU2hhcGVMaXN0KGlucHV0U2hhcGVzKTtcbiAgICBvdXRwdXRTaGFwZXMgPSB0eXBlc191dGlscy5ub3JtYWxpemVTaGFwZUxpc3Qob3V0cHV0U2hhcGVzKTtcblxuICAgIC8vIENvbGxlY3QgaW5wdXQgdGVuc29yKHMpIGNvb3JkaW5hdGVzLlxuICAgIGNvbnN0IGluYm91bmRMYXllcnM6IExheWVyW10gPSBbXTtcbiAgICBjb25zdCBub2RlSW5kaWNlczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCB0ZW5zb3JJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgeCBvZiBpbnB1dFRlbnNvckxpc3QpIHtcbiAgICAgIC8qXG4gICAgICAgKiBUT0RPKG1pY2hhZWx0ZXJyeSk6IEtlcmFzIGFkZHMgdGhpcyB2YWx1ZSB0byB0ZW5zb3JzOyBpdCdzIG5vdFxuICAgICAgICogY2xlYXIgd2hldGhlciB3ZSdsbCB1c2UgdGhpcyBvciBub3QuXG4gICAgICAgKi9cbiAgICAgIGluYm91bmRMYXllcnMucHVzaCh4LnNvdXJjZUxheWVyKTtcbiAgICAgIG5vZGVJbmRpY2VzLnB1c2goeC5ub2RlSW5kZXgpO1xuICAgICAgdGVuc29ySW5kaWNlcy5wdXNoKHgudGVuc29ySW5kZXgpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBub2RlLCBhZGQgaXQgdG8gaW5ib3VuZCBub2Rlcy5cbiAgICAvLyAoVGhpcyBjYWxsIGhhcyBzaWRlIGVmZmVjdHMuKVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bnVzZWQtZXhwcmVzc2lvblxuICAgIG5ldyBOb2RlKFxuICAgICAgICB7XG4gICAgICAgICAgb3V0Ym91bmRMYXllcjogdGhpcyxcbiAgICAgICAgICBpbmJvdW5kTGF5ZXJzLFxuICAgICAgICAgIG5vZGVJbmRpY2VzLFxuICAgICAgICAgIHRlbnNvckluZGljZXMsXG4gICAgICAgICAgaW5wdXRUZW5zb3JzOiBpbnB1dFRlbnNvckxpc3QsXG4gICAgICAgICAgb3V0cHV0VGVuc29ycyxcbiAgICAgICAgICBpbnB1dE1hc2tzLFxuICAgICAgICAgIG91dHB1dE1hc2tzLFxuICAgICAgICAgIGlucHV0U2hhcGVzLFxuICAgICAgICAgIG91dHB1dFNoYXBlc1xuICAgICAgICB9LFxuICAgICAgICBrd2FyZ3MpO1xuXG4gICAgLy8gVXBkYXRlIHRlbnNvciBoaXN0b3J5XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXRUZW5zb3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBUT0RPKG1pY2hhZWx0ZXJyeTogX3VzZXNfbGVhcm5pbmdfcGhhc2Ugbm90IHRyYWNrZWQuXG4gICAgICBvdXRwdXRUZW5zb3JzW2ldLnNvdXJjZUxheWVyID0gdGhpcztcbiAgICAgIG91dHB1dFRlbnNvcnNbaV0ubm9kZUluZGV4ID0gdGhpcy5pbmJvdW5kTm9kZXMubGVuZ3RoIC0gMTtcbiAgICAgIG91dHB1dFRlbnNvcnNbaV0udGVuc29ySW5kZXggPSBpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb25maWcgb2YgdGhlIGxheWVyLlxuICAgKlxuICAgKiBBIGxheWVyIGNvbmZpZyBpcyBhIFRTIGRpY3Rpb25hcnkgKHNlcmlhbGl6YWJsZSlcbiAgICogY29udGFpbmluZyB0aGUgY29uZmlndXJhdGlvbiBvZiBhIGxheWVyLlxuICAgKiBUaGUgc2FtZSBsYXllciBjYW4gYmUgcmVpbnN0YW50aWF0ZWQgbGF0ZXJcbiAgICogKHdpdGhvdXQgaXRzIHRyYWluZWQgd2VpZ2h0cykgZnJvbSB0aGlzIGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIFRoZSBjb25maWcgb2YgYSBsYXllciBkb2VzIG5vdCBpbmNsdWRlIGNvbm5lY3Rpdml0eVxuICAgKiBpbmZvcm1hdGlvbiwgbm9yIHRoZSBsYXllciBjbGFzcyBuYW1lLiAgVGhlc2UgYXJlIGhhbmRsZWRcbiAgICogYnkgJ0NvbnRhaW5lcicgKG9uZSBsYXllciBvZiBhYnN0cmFjdGlvbiBhYm92ZSkuXG4gICAqXG4gICAqIFBvcnRpbmcgTm90ZTogVGhlIFRTIGRpY3Rpb25hcnkgZm9sbG93cyBUUyBuYW1pbmcgc3RhbmRhcmRzIGZvclxuICAgKiBrZXlzLCBhbmQgdXNlcyB0ZmpzLWxheWVycyB0eXBlLXNhZmUgRW51bXMuICBTZXJpYWxpemF0aW9uIG1ldGhvZHNcbiAgICogc2hvdWxkIHVzZSBhIGhlbHBlciBmdW5jdGlvbiB0byBjb252ZXJ0IHRvIHRoZSBweXRob25pYyBzdG9yYWdlXG4gICAqIHN0YW5kYXJkLiAoc2VlIHNlcmlhbGl6YXRpb25fdXRpbHMuY29udmVydFRzVG9QeXRob25pYylcbiAgICpcbiAgICogQHJldHVybnMgVFMgZGljdGlvbmFyeSBvZiBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgJ3N1YmhlYWRpbmcnOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBjb25maWc6XG4gICAgICAgIHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHtuYW1lOiB0aGlzLm5hbWUsIHRyYWluYWJsZTogdGhpcy50cmFpbmFibGV9O1xuICAgIGlmICh0aGlzLmJhdGNoSW5wdXRTaGFwZSAhPSBudWxsKSB7XG4gICAgICBjb25maWdbJ2JhdGNoSW5wdXRTaGFwZSddID0gdGhpcy5iYXRjaElucHV0U2hhcGU7XG4gICAgfVxuICAgIGlmICh0aGlzLmR0eXBlICE9IG51bGwpIHtcbiAgICAgIGNvbmZpZ1snZHR5cGUnXSA9IHRoaXMuZHR5cGU7XG4gICAgfVxuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICAvKipcbiAgICogRGlzcG9zZSB0aGUgd2VpZ2h0IHZhcmlhYmxlcyB0aGF0IHRoaXMgTGF5ZXIgaW5zdGFuY2UgaG9sZHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IE51bWJlciBvZiBkaXNwb3NlZCB2YXJpYWJsZXMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGlzcG9zZVdlaWdodHMoKTogbnVtYmVyIHtcbiAgICB0aGlzLndlaWdodHMuZm9yRWFjaCh3ZWlnaHQgPT4gd2VpZ2h0LmRpc3Bvc2UoKSk7XG4gICAgcmV0dXJuIHRoaXMud2VpZ2h0cy5sZW5ndGg7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXNzZXJ0Tm90RGlzcG9zZWQoKSB7XG4gICAgaWYgKHRoaXMuX3JlZkNvdW50ID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYExheWVyICcke3RoaXMubmFtZX0nIGlzIGFscmVhZHkgZGlzcG9zZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gZGlzcG9zZSBsYXllcidzIHdlaWdodHMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGRlY3JlYXNlcyB0aGUgcmVmZXJlbmNlIGNvdW50IG9mIHRoZSBMYXllciBvYmplY3QgYnkgMS5cbiAgICpcbiAgICogQSBMYXllciBpcyByZWZlcmVuY2UtY291bnRlZC4gSXRzIHJlZmVyZW5jZSBjb3VudCBpcyBpbmNyZW1lbnRlZCBieSAxXG4gICAqIHRoZSBmaXJzdCBpdGVtIGl0cyBgYXBwbHkoKWAgbWV0aG9kIGlzIGNhbGxlZCBhbmQgd2hlbiBpdCBiZWNvbWVzIGEgcGFydFxuICAgKiBvZiBhIG5ldyBgTm9kZWAgKHRocm91Z2ggY2FsbGluZyB0aGUgYGFwcGx5KClgIG1ldGhvZCBvbiBhXG4gICAqIGB0Zi5TeW1ib2xpY1RlbnNvcmApLlxuICAgKlxuICAgKiBJZiB0aGUgcmVmZXJlbmNlIGNvdW50IG9mIGEgTGF5ZXIgYmVjb21lcyAwLCBhbGwgdGhlIHdlaWdodHMgd2lsbCBiZVxuICAgKiBkaXNwb3NlZCBhbmQgdGhlIHVuZGVybHlpbmcgbWVtb3J5IChlLmcuLCB0aGUgdGV4dHVyZXMgYWxsb2NhdGVkIGluIFdlYkdMKVxuICAgKiB3aWxsIGJlIGZyZWVkLlxuICAgKlxuICAgKiBOb3RlOiBJZiB0aGUgcmVmZXJlbmNlIGNvdW50IGlzIGdyZWF0ZXIgdGhhbiAwIGFmdGVyIHRoZSBkZWNyZW1lbnQsIHRoZVxuICAgKiB3ZWlnaHRzIG9mIHRoZSBMYXllciB3aWxsICpub3QqIGJlIGRpc3Bvc2VkLlxuICAgKlxuICAgKiBBZnRlciBhIExheWVyIGlzIGRpc3Bvc2VkLCBpdCBjYW5ub3QgYmUgdXNlZCBpbiBjYWxscyBzdWNoIGFzIGBhcHBseSgpYCxcbiAgICogYGdldFdlaWdodHMoKWAgb3IgYHNldFdlaWdodHMoKWAgYW55bW9yZS5cbiAgICpcbiAgICogQHJldHVybnMgQSBEaXNwb3NlUmVzdWx0IE9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuICAgKiAgIC0gcmVmQ291bnRBZnRlckRpc3Bvc2U6IFRoZSByZWZlcmVuY2UgY291bnQgb2YgdGhlIENvbnRhaW5lciBhZnRlciB0aGlzXG4gICAqICAgICBgZGlzcG9zZSgpYCBjYWxsLlxuICAgKiAgIC0gbnVtRGlzcG9zZWRWYXJpYWJsZXM6IE51bWJlciBvZiBgdGYuVmFyaWFibGVgcyAoaS5lLiwgd2VpZ2h0cykgZGlzcG9zZWRcbiAgICogICAgIGR1cmluZyB0aGlzIGBkaXNwb3NlKClgIGNhbGwuXG4gICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgbGF5ZXIgaXMgbm90IGJ1aWx0IHlldCwgb3IgaWYgdGhlIGxheWVyIGhhcyBhbHJlYWR5XG4gICAqICAgYmVlbiBkaXNwb3NlZC5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsICdzdWJoZWFkaW5nJzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgZGlzcG9zZSgpOiBEaXNwb3NlUmVzdWx0IHtcbiAgICBpZiAoIXRoaXMuYnVpbHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IGRpc3Bvc2UgTGF5ZXIgJHt0aGlzLm5hbWV9IGJlY2F1c2UgaXQgaGFzIG5vdCBiZWVuIGAgK1xuICAgICAgICAgIGBidWlsdCB5ZXQuYCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3JlZkNvdW50ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCBkaXNwb3NlIExheWVyICR7dGhpcy5uYW1lfSBiZWNhdXNlIGl0IGhhcyBub3QgYmVlbiB1c2VkIGAgK1xuICAgICAgICAgIGB5ZXQuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5hc3NlcnROb3REaXNwb3NlZCgpO1xuXG4gICAgbGV0IG51bURpc3Bvc2VkVmFyaWFibGVzID0gMDtcbiAgICBpZiAoLS10aGlzLl9yZWZDb3VudCA9PT0gMCkge1xuICAgICAgbnVtRGlzcG9zZWRWYXJpYWJsZXMgPSB0aGlzLmRpc3Bvc2VXZWlnaHRzKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtyZWZDb3VudEFmdGVyRGlzcG9zZTogdGhpcy5fcmVmQ291bnQsIG51bURpc3Bvc2VkVmFyaWFibGVzfTtcbiAgfVxufVxuXG4vKipcbiAqIENvbGxlY3RzIHRoZSBpbnB1dCBzaGFwZShzKSBvZiBhIGxpc3Qgb2YgYHRmLlRlbnNvcmBzIG9yXG4gKiBgdGYuU3ltYm9saWNUZW5zb3Jgcy5cbiAqXG4gKiBUT0RPKG1pY2hhZWx0ZXJyeSk6IFVwZGF0ZSBQeUtlcmFzIGRvY3MgKGJhY2twb3J0KS5cbiAqXG4gKiBAcGFyYW0gaW5wdXRUZW5zb3JzIExpc3Qgb2YgaW5wdXQgdGVuc29ycyAob3Igc2luZ2xlIGlucHV0IHRlbnNvcikuXG4gKlxuICogQHJldHVybiBMaXN0IG9mIHNoYXBlIHR1cGxlcyAob3Igc2luZ2xlIHR1cGxlKSwgb25lIHR1cGxlIHBlciBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gY29sbGVjdElucHV0U2hhcGUoaW5wdXRUZW5zb3JzOiBTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdfFRlbnNvcnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFRlbnNvcltdKTogU2hhcGV8U2hhcGVbXSB7XG4gIGlucHV0VGVuc29ycyA9XG4gICAgICBnZW5lcmljX3V0aWxzLnRvTGlzdChpbnB1dFRlbnNvcnMpIGFzIFN5bWJvbGljVGVuc29yW10gfCBUZW5zb3JbXTtcbiAgY29uc3Qgc2hhcGVzOiBTaGFwZVtdID0gW107XG4gIGZvciAoY29uc3QgeCBvZiBpbnB1dFRlbnNvcnMpIHtcbiAgICBzaGFwZXMucHVzaCh4LnNoYXBlKTtcbiAgfVxuICByZXR1cm4gZ2VuZXJpY191dGlscy5zaW5nbGV0b25PckFycmF5KHNoYXBlcyk7XG59XG5cbi8qKlxuICogR3Vlc3NlcyBvdXRwdXQgZHR5cGUgYmFzZWQgb24gaW5wdXRzLlxuICpcbiAqIEF0IHByZXNlbnQsIGp1c3QgcmV0dXJucyAnZmxvYXQzMicgZm9yIGFueSBpbnB1dC5cbiAqXG4gKiBAcGFyYW0gaW5wdXRUZW5zb3JzIExpc3Qgb2YgaW5wdXQgdGVuc29ycyAob3Igc2luZ2xlIGlucHV0IHRlbnNvcikuXG4gKlxuICogQHJldHVybiBUaGUgZ3Vlc3NlZCBEVHlwZS4gQXQgcHJlc2VudCwgYWx3YXlzIHJldHVybnMgJ2Zsb2F0MzInLlxuICovXG5mdW5jdGlvbiBndWVzc091dHB1dERUeXBlKGlucHV0VGVuc29yczogU3ltYm9saWNUZW5zb3J8U3ltYm9saWNUZW5zb3JbXXxUZW5zb3J8XG4gICAgICAgICAgICAgICAgICAgICAgICAgIFRlbnNvcltdKTogRGF0YVR5cGUge1xuICByZXR1cm4gJ2Zsb2F0MzInO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGxpc3Qgb2YgaW5wdXQgdGVuc29ycyBuZWNlc3NhcnkgdG8gY29tcHV0ZSBgdGVuc29yYC5cbiAqXG4gKiBPdXRwdXQgd2lsbCBhbHdheXMgYmUgYSBsaXN0IG9mIHRlbnNvcnMgKHBvdGVudGlhbGx5IHdpdGggMSBlbGVtZW50KS5cbiAqXG4gKiBAcGFyYW0gdGVuc29yIFRoZSB0ZW5zb3IgdG8gc3RhcnQgZnJvbS5cbiAqIEBwYXJhbSBsYXllciBPcmlnaW4gbGF5ZXIgb2YgdGhlIHRlbnNvci5cbiAqIEBwYXJhbSBub2RlSW5kZXggT3JpZ2luIG5vZGUgaW5kZXggb2YgdGhlIHRlbnNvci5cbiAqXG4gKiBAcmV0dXJuIEFycmF5IG9mIGlucHV0IHRlbnNvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VJbnB1dHMoXG4gICAgdGVuc29yOiBTeW1ib2xpY1RlbnNvciwgbGF5ZXI/OiBMYXllcixcbiAgICBub2RlSW5kZXg/OiBudW1iZXIpOiBTeW1ib2xpY1RlbnNvcltdIHtcbiAgaWYgKGxheWVyID09IG51bGwgfHwgKG5vZGVJbmRleCAhPSBudWxsICYmIG5vZGVJbmRleCA+IDApKSB7XG4gICAgbGF5ZXIgPSB0ZW5zb3Iuc291cmNlTGF5ZXI7XG4gICAgbm9kZUluZGV4ID0gdGVuc29yLm5vZGVJbmRleDtcbiAgfVxuICBpZiAobGF5ZXIuaW5ib3VuZE5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBbdGVuc29yXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBub2RlID0gbGF5ZXIuaW5ib3VuZE5vZGVzW25vZGVJbmRleF07XG4gICAgaWYgKG5vZGUuaW5ib3VuZExheWVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBub2RlLmlucHV0VGVuc29ycztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc291cmNlVGVuc29yczogU3ltYm9saWNUZW5zb3JbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmluYm91bmRMYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgeCA9IG5vZGUuaW5wdXRUZW5zb3JzW2ldO1xuICAgICAgICBjb25zdCBsYXllciA9IG5vZGUuaW5ib3VuZExheWVyc1tpXTtcbiAgICAgICAgY29uc3Qgbm9kZUluZGV4ID0gbm9kZS5ub2RlSW5kaWNlc1tpXTtcbiAgICAgICAgY29uc3QgcHJldmlvdXNTb3VyY2VzID0gZ2V0U291cmNlSW5wdXRzKHgsIGxheWVyLCBub2RlSW5kZXgpO1xuICAgICAgICAvLyBBdm9pZCBpbnB1dCByZWR1bmRhbmN5LlxuICAgICAgICBmb3IgKGNvbnN0IHggb2YgcHJldmlvdXNTb3VyY2VzKSB7XG4gICAgICAgICAgaWYgKHNvdXJjZVRlbnNvcnMuaW5kZXhPZih4KSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHNvdXJjZVRlbnNvcnMucHVzaCh4KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzb3VyY2VUZW5zb3JzO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIE1heWJlU3ltYm9saWMgPSBTeW1ib2xpY1RlbnNvcnxUZW5zb3I7XG5cbmZ1bmN0aW9uIGNoZWNrQWxsU3ltYm9saWModGVuc29yczogTWF5YmVTeW1ib2xpY3xNYXliZVN5bWJvbGljW10pOlxuICAgIHRlbnNvcnMgaXMgU3ltYm9saWNUZW5zb3J8U3ltYm9saWNUZW5zb3JbXSB7XG4gIGxldCBhbGxBcmVTeW1ib2xpYyA9IHRydWU7XG4gIGZvciAoY29uc3QgdGVuc29yIG9mIGdlbmVyaWNfdXRpbHMudG9MaXN0KHRlbnNvcnMpKSB7XG4gICAgaWYgKCEodGVuc29yIGluc3RhbmNlb2YgU3ltYm9saWNUZW5zb3IpKSB7XG4gICAgICBhbGxBcmVTeW1ib2xpYyA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBhbGxBcmVTeW1ib2xpYztcbn1cblxuZnVuY3Rpb24gY2hlY2tOb25lU3ltYm9saWModGVuc29yczogTWF5YmVTeW1ib2xpY3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIE1heWJlU3ltYm9saWNbXSk6IHRlbnNvcnMgaXMgVGVuc29yfFRlbnNvcltdIHtcbiAgbGV0IG5vbmVBcmVTeW1ib2xpYyA9IHRydWU7XG4gIGZvciAoY29uc3QgdGVuc29yIG9mIGdlbmVyaWNfdXRpbHMudG9MaXN0KHRlbnNvcnMpKSB7XG4gICAgaWYgKHRlbnNvciBpbnN0YW5jZW9mIFN5bWJvbGljVGVuc29yKSB7XG4gICAgICBub25lQXJlU3ltYm9saWMgPSBmYWxzZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbm9uZUFyZVN5bWJvbGljO1xufVxuIl19