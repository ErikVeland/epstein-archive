/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/**
 * TensorFlow.js Layers: Recurrent Neural Network Layers.
 */
import * as tfc from '@tensorflow/tfjs-core';
import { serialization, tidy, util } from '@tensorflow/tfjs-core';
import { getActivation, serializeActivation } from '../activations';
import * as K from '../backend/tfjs_backend';
import { nameScope } from '../common';
import { getConstraint, serializeConstraint } from '../constraints';
import { InputSpec, SymbolicTensor } from '../engine/topology';
import { Layer } from '../engine/topology';
import { AttributeError, NotImplementedError, ValueError } from '../errors';
import { getInitializer, Initializer, Ones, serializeInitializer } from '../initializers';
import { getRegularizer, serializeRegularizer } from '../regularizers';
import { assertPositiveInteger } from '../utils/generic_utils';
import * as math_utils from '../utils/math_utils';
import { getExactlyOneShape, getExactlyOneTensor, isArrayOfShapes } from '../utils/types_utils';
import { batchGetValue, batchSetValue } from '../variables';
import { deserialize } from './serialization';
/**
 * Standardize `apply()` args to a single list of tensor inputs.
 *
 * When running a model loaded from file, the input tensors `initialState` and
 * `constants` are passed to `RNN.apply()` as part of `inputs` instead of the
 * dedicated kwargs fields. `inputs` consists of
 * `[inputs, initialState0, initialState1, ..., constant0, constant1]` in this
 * case.
 * This method makes sure that arguments are
 * separated and that `initialState` and `constants` are `Array`s of tensors
 * (or None).
 *
 * @param inputs Tensor or `Array` of  tensors.
 * @param initialState Tensor or `Array` of tensors or `null`/`undefined`.
 * @param constants Tensor or `Array` of tensors or `null`/`undefined`.
 * @returns An object consisting of
 *   inputs: A tensor.
 *   initialState: `Array` of tensors or `null`.
 *   constants: `Array` of tensors or `null`.
 * @throws ValueError, if `inputs` is an `Array` but either `initialState` or
 *   `constants` is provided.
 */
export function standardizeArgs(inputs, initialState, constants, numConstants) {
    if (Array.isArray(inputs)) {
        if (initialState != null || constants != null) {
            throw new ValueError('When inputs is an array, neither initialState or constants ' +
                'should be provided');
        }
        if (numConstants != null) {
            constants = inputs.slice(inputs.length - numConstants, inputs.length);
            inputs = inputs.slice(0, inputs.length - numConstants);
        }
        if (inputs.length > 1) {
            initialState = inputs.slice(1, inputs.length);
        }
        inputs = inputs[0];
    }
    function toListOrNull(x) {
        if (x == null || Array.isArray(x)) {
            return x;
        }
        else {
            return [x];
        }
    }
    initialState = toListOrNull(initialState);
    constants = toListOrNull(constants);
    return { inputs, initialState, constants };
}
/**
 * Iterates over the time dimension of a tensor.
 *
 * @param stepFunction RNN step function.
 *   Parameters:
 *     inputs: tensor with shape `[samples, ...]` (no time dimension),
 *       representing input for the batch of samples at a certain time step.
 *     states: an Array of tensors.
 *   Returns:
 *     outputs: tensor with shape `[samples, outputDim]` (no time dimension).
 *     newStates: list of tensors, same length and shapes as `states`. The first
 *       state in the list must be the output tensor at the previous timestep.
 * @param inputs Tensor of temporal data of shape `[samples, time, ...]` (at
 *   least 3D).
 * @param initialStates Tensor with shape `[samples, outputDim]` (no time
 *   dimension), containing the initial values of the states used in the step
 *   function.
 * @param goBackwards If `true`, do the iteration over the time dimension in
 *   reverse order and return the reversed sequence.
 * @param mask Binary tensor with shape `[sample, time, 1]`, with a zero for
 *   every element that is masked.
 * @param constants An Array of constant values passed at each step.
 * @param unroll Whether to unroll the RNN or to use a symbolic loop. *Not*
 *   applicable to this imperative deeplearn.js backend. Its value is ignored.
 * @param needPerStepOutputs Whether the per-step outputs are to be
 *   concatenated into a single tensor and returned (as the second return
 *   value). Default: `false`. This arg is included so that the relatively
 *   expensive concatenation of the stepwise outputs can be omitted unless
 *   the stepwise outputs need to be kept (e.g., for an LSTM layer of which
 *   `returnSequence` is `true`.)
 * @returns An Array: `[lastOutput, outputs, newStates]`.
 *   lastOutput: the lastest output of the RNN, of shape `[samples, ...]`.
 *   outputs: tensor with shape `[samples, time, ...]` where each entry
 *     `output[s, t]` is the output of the step function at time `t` for sample
 *     `s`. This return value is provided if and only if the
 *     `needPerStepOutputs` is set as `true`. If it is set as `false`, this
 *     return value will be `undefined`.
 *   newStates: Array of tensors, latest states returned by the step function,
 *      of shape `(samples, ...)`.
 * @throws ValueError If input dimension is less than 3.
 *
 * TODO(nielsene): This needs to be tidy-ed.
 */
export function rnn(stepFunction, inputs, initialStates, goBackwards = false, mask, constants, unroll = false, needPerStepOutputs = false) {
    return tfc.tidy(() => {
        const ndim = inputs.shape.length;
        if (ndim < 3) {
            throw new ValueError(`Input should be at least 3D, but is ${ndim}D.`);
        }
        // Transpose to time-major, i.e., from [batch, time, ...] to [time, batch,
        // ...].
        const axes = [1, 0].concat(math_utils.range(2, ndim));
        inputs = tfc.transpose(inputs, axes);
        if (constants != null) {
            throw new NotImplementedError('The rnn() functoin of the deeplearn.js backend does not support ' +
                'constants yet.');
        }
        // Porting Note: the unroll option is ignored by the imperative backend.
        if (unroll) {
            console.warn('Backend rnn(): the unroll = true option is not applicable to the ' +
                'imperative deeplearn.js backend.');
        }
        if (mask != null) {
            mask = tfc.cast(tfc.cast(mask, 'bool'), 'float32');
            if (mask.rank === ndim - 1) {
                mask = tfc.expandDims(mask, -1);
            }
            mask = tfc.transpose(mask, axes);
        }
        if (goBackwards) {
            inputs = tfc.reverse(inputs, 0);
            if (mask != null) {
                mask = tfc.reverse(mask, 0);
            }
        }
        // Porting Note: PyKeras with TensorFlow backend uses a symbolic loop
        //   (tf.while_loop). But for the imperative deeplearn.js backend, we just
        //   use the usual TypeScript control flow to iterate over the time steps in
        //   the inputs.
        // Porting Note: PyKeras patches a "_use_learning_phase" attribute to
        // outputs.
        //   This is not idiomatic in TypeScript. The info regarding whether we are
        //   in a learning (i.e., training) phase for RNN is passed in a different
        //   way.
        const perStepOutputs = [];
        let lastOutput;
        let states = initialStates;
        const timeSteps = inputs.shape[0];
        const perStepInputs = tfc.unstack(inputs);
        let perStepMasks;
        if (mask != null) {
            perStepMasks = tfc.unstack(mask);
        }
        for (let t = 0; t < timeSteps; ++t) {
            const currentInput = perStepInputs[t];
            const stepOutputs = tfc.tidy(() => stepFunction(currentInput, states));
            if (mask == null) {
                lastOutput = stepOutputs[0];
                states = stepOutputs[1];
            }
            else {
                const maskedOutputs = tfc.tidy(() => {
                    const stepMask = perStepMasks[t];
                    const negStepMask = tfc.sub(tfc.onesLike(stepMask), stepMask);
                    // TODO(cais): Would tfc.where() be better for performance?
                    const output = tfc.add(tfc.mul(stepOutputs[0], stepMask), tfc.mul(states[0], negStepMask));
                    const newStates = states.map((state, i) => {
                        return tfc.add(tfc.mul(stepOutputs[1][i], stepMask), tfc.mul(state, negStepMask));
                    });
                    return { output, newStates };
                });
                lastOutput = maskedOutputs.output;
                states = maskedOutputs.newStates;
            }
            if (needPerStepOutputs) {
                perStepOutputs.push(lastOutput);
            }
        }
        let outputs;
        if (needPerStepOutputs) {
            const axis = 1;
            outputs = tfc.stack(perStepOutputs, axis);
        }
        return [lastOutput, outputs, states];
    });
}
class RNN extends Layer {
    constructor(args) {
        super(args);
        let cell;
        if (args.cell == null) {
            throw new ValueError('cell property is missing for the constructor of RNN.');
        }
        else if (Array.isArray(args.cell)) {
            cell = new StackedRNNCells({ cells: args.cell });
        }
        else {
            cell = args.cell;
        }
        if (cell.stateSize == null) {
            throw new ValueError('The RNN cell should have an attribute `stateSize` (tuple of ' +
                'integers, one integer per RNN state).');
        }
        this.cell = cell;
        this.returnSequences =
            args.returnSequences == null ? false : args.returnSequences;
        this.returnState = args.returnState == null ? false : args.returnState;
        this.goBackwards = args.goBackwards == null ? false : args.goBackwards;
        this._stateful = args.stateful == null ? false : args.stateful;
        this.unroll = args.unroll == null ? false : args.unroll;
        this.supportsMasking = true;
        this.inputSpec = [new InputSpec({ ndim: 3 })];
        this.stateSpec = null;
        this.states_ = null;
        // TODO(cais): Add constantsSpec and numConstants.
        this.numConstants = null;
        // TODO(cais): Look into the use of initial_state in the kwargs of the
        //   constructor.
        this.keptStates = [];
    }
    // Porting Note: This is the equivalent of `RNN.states` property getter in
    //   PyKeras.
    getStates() {
        if (this.states_ == null) {
            const numStates = Array.isArray(this.cell.stateSize) ? this.cell.stateSize.length : 1;
            return math_utils.range(0, numStates).map(x => null);
        }
        else {
            return this.states_;
        }
    }
    // Porting Note: This is the equivalent of the `RNN.states` property setter in
    //   PyKeras.
    setStates(states) {
        this.states_ = states;
    }
    computeOutputShape(inputShape) {
        if (isArrayOfShapes(inputShape)) {
            inputShape = inputShape[0];
        }
        inputShape = inputShape;
        // TODO(cais): Remove the casting once stacked RNN cells become supported.
        let stateSize = this.cell.stateSize;
        if (!Array.isArray(stateSize)) {
            stateSize = [stateSize];
        }
        const outputDim = stateSize[0];
        let outputShape;
        if (this.returnSequences) {
            outputShape = [inputShape[0], inputShape[1], outputDim];
        }
        else {
            outputShape = [inputShape[0], outputDim];
        }
        if (this.returnState) {
            const stateShape = [];
            for (const dim of stateSize) {
                stateShape.push([inputShape[0], dim]);
            }
            return [outputShape].concat(stateShape);
        }
        else {
            return outputShape;
        }
    }
    computeMask(inputs, mask) {
        return tfc.tidy(() => {
            if (Array.isArray(mask)) {
                mask = mask[0];
            }
            const outputMask = this.returnSequences ? mask : null;
            if (this.returnState) {
                const stateMask = this.states.map(s => null);
                return [outputMask].concat(stateMask);
            }
            else {
                return outputMask;
            }
        });
    }
    /**
     * Get the current state tensors of the RNN.
     *
     * If the state hasn't been set, return an array of `null`s of the correct
     * length.
     */
    get states() {
        if (this.states_ == null) {
            const numStates = Array.isArray(this.cell.stateSize) ? this.cell.stateSize.length : 1;
            const output = [];
            for (let i = 0; i < numStates; ++i) {
                output.push(null);
            }
            return output;
        }
        else {
            return this.states_;
        }
    }
    set states(s) {
        this.states_ = s;
    }
    build(inputShape) {
        // Note inputShape will be an Array of Shapes of initial states and
        // constants if these are passed in apply().
        const constantShape = null;
        if (this.numConstants != null) {
            throw new NotImplementedError('Constants support is not implemented in RNN yet.');
        }
        if (isArrayOfShapes(inputShape)) {
            inputShape = inputShape[0];
        }
        inputShape = inputShape;
        const batchSize = this.stateful ? inputShape[0] : null;
        const inputDim = inputShape.slice(2);
        this.inputSpec[0] = new InputSpec({ shape: [batchSize, null, ...inputDim] });
        // Allow cell (if RNNCell Layer) to build before we set or validate
        // stateSpec.
        const stepInputShape = [inputShape[0]].concat(inputShape.slice(2));
        if (constantShape != null) {
            throw new NotImplementedError('Constants support is not implemented in RNN yet.');
        }
        else {
            this.cell.build(stepInputShape);
        }
        // Set or validate stateSpec.
        let stateSize;
        if (Array.isArray(this.cell.stateSize)) {
            stateSize = this.cell.stateSize;
        }
        else {
            stateSize = [this.cell.stateSize];
        }
        if (this.stateSpec != null) {
            if (!util.arraysEqual(this.stateSpec.map(spec => spec.shape[spec.shape.length - 1]), stateSize)) {
                throw new ValueError(`An initialState was passed that is not compatible with ` +
                    `cell.stateSize. Received stateSpec=${this.stateSpec}; ` +
                    `However cell.stateSize is ${this.cell.stateSize}`);
            }
        }
        else {
            this.stateSpec =
                stateSize.map(dim => new InputSpec({ shape: [null, dim] }));
        }
        if (this.stateful) {
            this.resetStates();
        }
    }
    /**
     * Reset the state tensors of the RNN.
     *
     * If the `states` argument is `undefined` or `null`, will set the
     * state tensor(s) of the RNN to all-zero tensors of the appropriate
     * shape(s).
     *
     * If `states` is provided, will set the state tensors of the RNN to its
     * value.
     *
     * @param states Optional externally-provided initial states.
     * @param training Whether this call is done during training. For stateful
     *   RNNs, this affects whether the old states are kept or discarded. In
     *   particular, if `training` is `true`, the old states will be kept so
     *   that subsequent backpropgataion through time (BPTT) may work properly.
     *   Else, the old states will be discarded.
     */
    resetStates(states, training = false) {
        tidy(() => {
            if (!this.stateful) {
                throw new AttributeError('Cannot call resetStates() on an RNN Layer that is not stateful.');
            }
            const batchSize = this.inputSpec[0].shape[0];
            if (batchSize == null) {
                throw new ValueError('If an RNN is stateful, it needs to know its batch size. Specify ' +
                    'the batch size of your input tensors: \n' +
                    '- If using a Sequential model, specify the batch size by ' +
                    'passing a `batchInputShape` option to your first layer.\n' +
                    '- If using the functional API, specify the batch size by ' +
                    'passing a `batchShape` option to your Input layer.');
            }
            // Initialize state if null.
            if (this.states_ == null) {
                if (Array.isArray(this.cell.stateSize)) {
                    this.states_ =
                        this.cell.stateSize.map(dim => tfc.zeros([batchSize, dim]));
                }
                else {
                    this.states_ = [tfc.zeros([batchSize, this.cell.stateSize])];
                }
            }
            else if (states == null) {
                // Dispose old state tensors.
                tfc.dispose(this.states_);
                // For stateful RNNs, fully dispose kept old states.
                if (this.keptStates != null) {
                    tfc.dispose(this.keptStates);
                    this.keptStates = [];
                }
                if (Array.isArray(this.cell.stateSize)) {
                    this.states_ =
                        this.cell.stateSize.map(dim => tfc.zeros([batchSize, dim]));
                }
                else {
                    this.states_[0] = tfc.zeros([batchSize, this.cell.stateSize]);
                }
            }
            else {
                if (!Array.isArray(states)) {
                    states = [states];
                }
                if (states.length !== this.states_.length) {
                    throw new ValueError(`Layer ${this.name} expects ${this.states_.length} state(s), ` +
                        `but it received ${states.length} state value(s). Input ` +
                        `received: ${states}`);
                }
                if (training === true) {
                    // Store old state tensors for complete disposal later, i.e., during
                    // the next no-arg call to this method. We do not dispose the old
                    // states immediately because that BPTT (among other things) require
                    // them.
                    this.keptStates.push(this.states_.slice());
                }
                else {
                    tfc.dispose(this.states_);
                }
                for (let index = 0; index < this.states_.length; ++index) {
                    const value = states[index];
                    const dim = Array.isArray(this.cell.stateSize) ?
                        this.cell.stateSize[index] :
                        this.cell.stateSize;
                    const expectedShape = [batchSize, dim];
                    if (!util.arraysEqual(value.shape, expectedShape)) {
                        throw new ValueError(`State ${index} is incompatible with layer ${this.name}: ` +
                            `expected shape=${expectedShape}, received shape=${value.shape}`);
                    }
                    this.states_[index] = value;
                }
            }
            this.states_ = this.states_.map(state => tfc.keep(state.clone()));
        });
    }
    apply(inputs, kwargs) {
        // TODO(cais): Figure out whether initialState is in kwargs or inputs.
        let initialState = kwargs == null ? null : kwargs['initialState'];
        let constants = kwargs == null ? null : kwargs['constants'];
        if (kwargs == null) {
            kwargs = {};
        }
        const standardized = standardizeArgs(inputs, initialState, constants, this.numConstants);
        inputs = standardized.inputs;
        initialState = standardized.initialState;
        constants = standardized.constants;
        // If any of `initial_state` or `constants` are specified and are
        // `tf.SymbolicTensor`s, then add them to the inputs and temporarily modify
        // the input_spec to include them.
        let additionalInputs = [];
        let additionalSpecs = [];
        if (initialState != null) {
            kwargs['initialState'] = initialState;
            additionalInputs = additionalInputs.concat(initialState);
            this.stateSpec = [];
            for (const state of initialState) {
                this.stateSpec.push(new InputSpec({ shape: state.shape }));
            }
            // TODO(cais): Use the following instead.
            // this.stateSpec = initialState.map(state => new InputSpec({shape:
            // state.shape}));
            additionalSpecs = additionalSpecs.concat(this.stateSpec);
        }
        if (constants != null) {
            kwargs['constants'] = constants;
            additionalInputs = additionalInputs.concat(constants);
            // TODO(cais): Add this.constantsSpec.
            this.numConstants = constants.length;
        }
        const isTensor = additionalInputs[0] instanceof SymbolicTensor;
        if (isTensor) {
            // Compute full input spec, including state and constants.
            const fullInput = [inputs].concat(additionalInputs);
            const fullInputSpec = this.inputSpec.concat(additionalSpecs);
            // Perform the call with temporarily replaced inputSpec.
            const originalInputSpec = this.inputSpec;
            this.inputSpec = fullInputSpec;
            const output = super.apply(fullInput, kwargs);
            this.inputSpec = originalInputSpec;
            return output;
        }
        else {
            return super.apply(inputs, kwargs);
        }
    }
    // tslint:disable-next-line:no-any
    call(inputs, kwargs) {
        // Input shape: `[samples, time (padded with zeros), input_dim]`.
        // Note that the .build() method of subclasses **must** define
        // this.inputSpec and this.stateSpec owith complete input shapes.
        return tidy(() => {
            const mask = kwargs == null ? null : kwargs['mask'];
            const training = kwargs == null ? null : kwargs['training'];
            let initialState = kwargs == null ? null : kwargs['initialState'];
            inputs = getExactlyOneTensor(inputs);
            if (initialState == null) {
                if (this.stateful) {
                    initialState = this.states_;
                }
                else {
                    initialState = this.getInitialState(inputs);
                }
            }
            const numStates = Array.isArray(this.cell.stateSize) ? this.cell.stateSize.length : 1;
            if (initialState.length !== numStates) {
                throw new ValueError(`RNN Layer has ${numStates} state(s) but was passed ` +
                    `${initialState.length} initial state(s).`);
            }
            if (this.unroll) {
                console.warn('Ignoring unroll = true for RNN layer, due to imperative backend.');
            }
            const cellCallKwargs = { training };
            // TODO(cais): Add support for constants.
            const step = (inputs, states) => {
                // `inputs` and `states` are concatenated to form a single `Array` of
                // `tf.Tensor`s as the input to `cell.call()`.
                const outputs = this.cell.call([inputs].concat(states), cellCallKwargs);
                // Marshall the return value into output and new states.
                return [outputs[0], outputs.slice(1)];
            };
            // TODO(cais): Add support for constants.
            const rnnOutputs = rnn(step, inputs, initialState, this.goBackwards, mask, null, this.unroll, this.returnSequences);
            const lastOutput = rnnOutputs[0];
            const outputs = rnnOutputs[1];
            const states = rnnOutputs[2];
            if (this.stateful) {
                this.resetStates(states, training);
            }
            const output = this.returnSequences ? outputs : lastOutput;
            // TODO(cais): Property set learning phase flag.
            if (this.returnState) {
                return [output].concat(states);
            }
            else {
                return output;
            }
        });
    }
    getInitialState(inputs) {
        return tidy(() => {
            // Build an all-zero tensor of shape [samples, outputDim].
            // [Samples, timeSteps, inputDim].
            let initialState = tfc.zeros(inputs.shape);
            // [Samples].
            initialState = tfc.sum(initialState, [1, 2]);
            initialState = K.expandDims(initialState); // [Samples, 1].
            if (Array.isArray(this.cell.stateSize)) {
                return this.cell.stateSize.map(dim => dim > 1 ? K.tile(initialState, [1, dim]) : initialState);
            }
            else {
                return this.cell.stateSize > 1 ?
                    [K.tile(initialState, [1, this.cell.stateSize])] :
                    [initialState];
            }
        });
    }
    get trainableWeights() {
        if (!this.trainable) {
            return [];
        }
        // Porting Note: In TypeScript, `this` is always an instance of `Layer`.
        return this.cell.trainableWeights;
    }
    get nonTrainableWeights() {
        // Porting Note: In TypeScript, `this` is always an instance of `Layer`.
        if (!this.trainable) {
            return this.cell.weights;
        }
        return this.cell.nonTrainableWeights;
    }
    setFastWeightInitDuringBuild(value) {
        super.setFastWeightInitDuringBuild(value);
        if (this.cell != null) {
            this.cell.setFastWeightInitDuringBuild(value);
        }
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = {
            returnSequences: this.returnSequences,
            returnState: this.returnState,
            goBackwards: this.goBackwards,
            stateful: this.stateful,
            unroll: this.unroll,
        };
        if (this.numConstants != null) {
            config['numConstants'] = this.numConstants;
        }
        const cellConfig = this.cell.getConfig();
        if (this.getClassName() === RNN.className) {
            config['cell'] = {
                'className': this.cell.getClassName(),
                'config': cellConfig,
            };
        }
        // this order is necessary, to prevent cell name from replacing layer name
        return Object.assign(Object.assign(Object.assign({}, cellConfig), baseConfig), config);
    }
    /** @nocollapse */
    static fromConfig(cls, config, customObjects = {}) {
        const cellConfig = config['cell'];
        const cell = deserialize(cellConfig, customObjects);
        return new cls(Object.assign(config, { cell }));
    }
}
/** @nocollapse */
RNN.className = 'RNN';
export { RNN };
serialization.registerClass(RNN);
// Porting Note: This is a common parent class for RNN cells. There is no
// equivalent of this in PyKeras. Having a common parent class forgoes the
//  need for `has_attr(cell, ...)` checks or its TypeScript equivalent.
/**
 * An RNNCell layer.
 *
 * @doc {heading: 'Layers', subheading: 'Classes'}
 */
export class RNNCell extends Layer {
}
class SimpleRNNCell extends RNNCell {
    constructor(args) {
        super(args);
        this.DEFAULT_ACTIVATION = 'tanh';
        this.DEFAULT_KERNEL_INITIALIZER = 'glorotNormal';
        this.DEFAULT_RECURRENT_INITIALIZER = 'orthogonal';
        this.DEFAULT_BIAS_INITIALIZER = 'zeros';
        this.units = args.units;
        assertPositiveInteger(this.units, `units`);
        this.activation = getActivation(args.activation == null ? this.DEFAULT_ACTIVATION : args.activation);
        this.useBias = args.useBias == null ? true : args.useBias;
        this.kernelInitializer = getInitializer(args.kernelInitializer || this.DEFAULT_KERNEL_INITIALIZER);
        this.recurrentInitializer = getInitializer(args.recurrentInitializer || this.DEFAULT_RECURRENT_INITIALIZER);
        this.biasInitializer =
            getInitializer(args.biasInitializer || this.DEFAULT_BIAS_INITIALIZER);
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
        this.recurrentRegularizer = getRegularizer(args.recurrentRegularizer);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.recurrentConstraint = getConstraint(args.recurrentConstraint);
        this.biasConstraint = getConstraint(args.biasConstraint);
        this.dropout = math_utils.min([1, math_utils.max([0, args.dropout == null ? 0 : args.dropout])]);
        this.recurrentDropout = math_utils.min([
            1,
            math_utils.max([0, args.recurrentDropout == null ? 0 : args.recurrentDropout])
        ]);
        this.dropoutFunc = args.dropoutFunc;
        this.stateSize = this.units;
        this.dropoutMask = null;
        this.recurrentDropoutMask = null;
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        // TODO(cais): Use regularizer.
        this.kernel = this.addWeight('kernel', [inputShape[inputShape.length - 1], this.units], null, this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        this.recurrentKernel = this.addWeight('recurrent_kernel', [this.units, this.units], null, this.recurrentInitializer, this.recurrentRegularizer, true, this.recurrentConstraint);
        if (this.useBias) {
            this.bias = this.addWeight('bias', [this.units], null, this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        else {
            this.bias = null;
        }
        this.built = true;
    }
    // Porting Note: PyKeras' equivalent of this method takes two tensor inputs:
    //   `inputs` and `states`. Here, the two tensors are combined into an
    //   `Tensor[]` Array as the first input argument.
    //   Similarly, PyKeras' equivalent of this method returns two values:
    //    `output` and `[output]`. Here the two are combined into one length-2
    //    `Tensor[]`, consisting of `output` repeated.
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = inputs;
            if (inputs.length !== 2) {
                throw new ValueError(`SimpleRNNCell expects 2 input Tensors, got ${inputs.length}.`);
            }
            let prevOutput = inputs[1];
            inputs = inputs[0];
            const training = kwargs['training'] == null ? false : kwargs['training'];
            if (0 < this.dropout && this.dropout < 1 && this.dropoutMask == null) {
                this.dropoutMask = generateDropoutMask({
                    ones: () => tfc.onesLike(inputs),
                    rate: this.dropout,
                    training,
                    dropoutFunc: this.dropoutFunc,
                });
            }
            if (0 < this.recurrentDropout && this.recurrentDropout < 1 &&
                this.recurrentDropoutMask == null) {
                this.recurrentDropoutMask = generateDropoutMask({
                    ones: () => tfc.onesLike(prevOutput),
                    rate: this.recurrentDropout,
                    training,
                    dropoutFunc: this.dropoutFunc,
                });
            }
            let h;
            const dpMask = this.dropoutMask;
            const recDpMask = this.recurrentDropoutMask;
            if (dpMask != null) {
                h = K.dot(tfc.mul(inputs, dpMask), this.kernel.read());
            }
            else {
                h = K.dot(inputs, this.kernel.read());
            }
            if (this.bias != null) {
                h = K.biasAdd(h, this.bias.read());
            }
            if (recDpMask != null) {
                prevOutput = tfc.mul(prevOutput, recDpMask);
            }
            let output = tfc.add(h, K.dot(prevOutput, this.recurrentKernel.read()));
            if (this.activation != null) {
                output = this.activation.apply(output);
            }
            // TODO(cais): Properly set learning phase on output tensor?
            return [output, output];
        });
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = {
            units: this.units,
            activation: serializeActivation(this.activation),
            useBias: this.useBias,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            recurrentInitializer: serializeInitializer(this.recurrentInitializer),
            biasInitializer: serializeInitializer(this.biasInitializer),
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            recurrentRegularizer: serializeRegularizer(this.recurrentRegularizer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint),
            recurrentConstraint: serializeConstraint(this.recurrentConstraint),
            biasConstraint: serializeConstraint(this.biasConstraint),
            dropout: this.dropout,
            recurrentDropout: this.recurrentDropout,
        };
        return Object.assign(Object.assign({}, baseConfig), config);
    }
}
/** @nocollapse */
SimpleRNNCell.className = 'SimpleRNNCell';
export { SimpleRNNCell };
serialization.registerClass(SimpleRNNCell);
class SimpleRNN extends RNN {
    constructor(args) {
        args.cell = new SimpleRNNCell(args);
        super(args);
        // TODO(cais): Add activityRegularizer.
    }
    call(inputs, kwargs) {
        return tidy(() => {
            if (this.cell.dropoutMask != null) {
                tfc.dispose(this.cell.dropoutMask);
                this.cell.dropoutMask = null;
            }
            if (this.cell.recurrentDropoutMask != null) {
                tfc.dispose(this.cell.recurrentDropoutMask);
                this.cell.recurrentDropoutMask = null;
            }
            const mask = kwargs == null ? null : kwargs['mask'];
            const training = kwargs == null ? null : kwargs['training'];
            const initialState = kwargs == null ? null : kwargs['initialState'];
            return super.call(inputs, { mask, training, initialState });
        });
    }
    /** @nocollapse */
    static fromConfig(cls, config) {
        return new cls(config);
    }
}
/** @nocollapse */
SimpleRNN.className = 'SimpleRNN';
export { SimpleRNN };
serialization.registerClass(SimpleRNN);
class GRUCell extends RNNCell {
    constructor(args) {
        super(args);
        this.DEFAULT_ACTIVATION = 'tanh';
        this.DEFAULT_RECURRENT_ACTIVATION = 'hardSigmoid';
        this.DEFAULT_KERNEL_INITIALIZER = 'glorotNormal';
        this.DEFAULT_RECURRENT_INITIALIZER = 'orthogonal';
        this.DEFAULT_BIAS_INITIALIZER = 'zeros';
        if (args.resetAfter) {
            throw new ValueError(`GRUCell does not support reset_after parameter set to true.`);
        }
        this.units = args.units;
        assertPositiveInteger(this.units, 'units');
        this.activation = getActivation(args.activation === undefined ? this.DEFAULT_ACTIVATION :
            args.activation);
        this.recurrentActivation = getActivation(args.recurrentActivation === undefined ?
            this.DEFAULT_RECURRENT_ACTIVATION :
            args.recurrentActivation);
        this.useBias = args.useBias == null ? true : args.useBias;
        this.kernelInitializer = getInitializer(args.kernelInitializer || this.DEFAULT_KERNEL_INITIALIZER);
        this.recurrentInitializer = getInitializer(args.recurrentInitializer || this.DEFAULT_RECURRENT_INITIALIZER);
        this.biasInitializer =
            getInitializer(args.biasInitializer || this.DEFAULT_BIAS_INITIALIZER);
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
        this.recurrentRegularizer = getRegularizer(args.recurrentRegularizer);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.recurrentConstraint = getConstraint(args.recurrentConstraint);
        this.biasConstraint = getConstraint(args.biasConstraint);
        this.dropout = math_utils.min([1, math_utils.max([0, args.dropout == null ? 0 : args.dropout])]);
        this.recurrentDropout = math_utils.min([
            1,
            math_utils.max([0, args.recurrentDropout == null ? 0 : args.recurrentDropout])
        ]);
        this.dropoutFunc = args.dropoutFunc;
        this.implementation = args.implementation;
        this.stateSize = this.units;
        this.dropoutMask = null;
        this.recurrentDropoutMask = null;
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const inputDim = inputShape[inputShape.length - 1];
        this.kernel = this.addWeight('kernel', [inputDim, this.units * 3], null, this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        this.recurrentKernel = this.addWeight('recurrent_kernel', [this.units, this.units * 3], null, this.recurrentInitializer, this.recurrentRegularizer, true, this.recurrentConstraint);
        if (this.useBias) {
            this.bias = this.addWeight('bias', [this.units * 3], null, this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        else {
            this.bias = null;
        }
        // Porting Notes: Unlike the PyKeras implementation, we perform slicing
        //   of the weights and bias in the call() method, at execution time.
        this.built = true;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = inputs;
            if (inputs.length !== 2) {
                throw new ValueError(`GRUCell expects 2 input Tensors (inputs, h, c), got ` +
                    `${inputs.length}.`);
            }
            const training = kwargs['training'] == null ? false : kwargs['training'];
            let hTMinus1 = inputs[1]; // Previous memory state.
            inputs = inputs[0];
            // Note: For superior performance, TensorFlow.js always uses
            // implementation 2, regardless of the actual value of
            // config.implementation.
            if (0 < this.dropout && this.dropout < 1 && this.dropoutMask == null) {
                this.dropoutMask = generateDropoutMask({
                    ones: () => tfc.onesLike(inputs),
                    rate: this.dropout,
                    training,
                    count: 3,
                    dropoutFunc: this.dropoutFunc,
                });
            }
            if (0 < this.recurrentDropout && this.recurrentDropout < 1 &&
                this.recurrentDropoutMask == null) {
                this.recurrentDropoutMask = generateDropoutMask({
                    ones: () => tfc.onesLike(hTMinus1),
                    rate: this.recurrentDropout,
                    training,
                    count: 3,
                    dropoutFunc: this.dropoutFunc,
                });
            }
            const dpMask = this.dropoutMask;
            const recDpMask = this.recurrentDropoutMask;
            let z;
            let r;
            let hh;
            if (0 < this.dropout && this.dropout < 1) {
                inputs = tfc.mul(inputs, dpMask[0]);
            }
            let matrixX = K.dot(inputs, this.kernel.read());
            if (this.useBias) {
                matrixX = K.biasAdd(matrixX, this.bias.read());
            }
            if (0 < this.recurrentDropout && this.recurrentDropout < 1) {
                hTMinus1 = tfc.mul(hTMinus1, recDpMask[0]);
            }
            const recurrentKernelValue = this.recurrentKernel.read();
            const [rk1, rk2] = tfc.split(recurrentKernelValue, [2 * this.units, this.units], recurrentKernelValue.rank - 1);
            const matrixInner = K.dot(hTMinus1, rk1);
            const [xZ, xR, xH] = tfc.split(matrixX, 3, matrixX.rank - 1);
            const [recurrentZ, recurrentR] = tfc.split(matrixInner, 2, matrixInner.rank - 1);
            z = this.recurrentActivation.apply(tfc.add(xZ, recurrentZ));
            r = this.recurrentActivation.apply(tfc.add(xR, recurrentR));
            const recurrentH = K.dot(tfc.mul(r, hTMinus1), rk2);
            hh = this.activation.apply(tfc.add(xH, recurrentH));
            const h = tfc.add(tfc.mul(z, hTMinus1), tfc.mul(tfc.add(1, tfc.neg(z)), hh));
            // TODO(cais): Add use_learning_phase flag properly.
            return [h, h];
        });
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = {
            units: this.units,
            activation: serializeActivation(this.activation),
            recurrentActivation: serializeActivation(this.recurrentActivation),
            useBias: this.useBias,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            recurrentInitializer: serializeInitializer(this.recurrentInitializer),
            biasInitializer: serializeInitializer(this.biasInitializer),
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            recurrentRegularizer: serializeRegularizer(this.recurrentRegularizer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint),
            recurrentConstraint: serializeConstraint(this.recurrentConstraint),
            biasConstraint: serializeConstraint(this.biasConstraint),
            dropout: this.dropout,
            recurrentDropout: this.recurrentDropout,
            implementation: this.implementation,
            resetAfter: false
        };
        return Object.assign(Object.assign({}, baseConfig), config);
    }
}
/** @nocollapse */
GRUCell.className = 'GRUCell';
export { GRUCell };
serialization.registerClass(GRUCell);
class GRU extends RNN {
    constructor(args) {
        if (args.implementation === 0) {
            console.warn('`implementation=0` has been deprecated, and now defaults to ' +
                '`implementation=1`. Please update your layer call.');
        }
        args.cell = new GRUCell(args);
        super(args);
        // TODO(cais): Add activityRegularizer.
    }
    call(inputs, kwargs) {
        return tidy(() => {
            if (this.cell.dropoutMask != null) {
                tfc.dispose(this.cell.dropoutMask);
                this.cell.dropoutMask = null;
            }
            if (this.cell.recurrentDropoutMask != null) {
                tfc.dispose(this.cell.recurrentDropoutMask);
                this.cell.recurrentDropoutMask = null;
            }
            const mask = kwargs == null ? null : kwargs['mask'];
            const training = kwargs == null ? null : kwargs['training'];
            const initialState = kwargs == null ? null : kwargs['initialState'];
            return super.call(inputs, { mask, training, initialState });
        });
    }
    /** @nocollapse */
    static fromConfig(cls, config) {
        if (config['implmentation'] === 0) {
            config['implementation'] = 1;
        }
        return new cls(config);
    }
}
/** @nocollapse */
GRU.className = 'GRU';
export { GRU };
serialization.registerClass(GRU);
class LSTMCell extends RNNCell {
    constructor(args) {
        super(args);
        this.DEFAULT_ACTIVATION = 'tanh';
        this.DEFAULT_RECURRENT_ACTIVATION = 'hardSigmoid';
        this.DEFAULT_KERNEL_INITIALIZER = 'glorotNormal';
        this.DEFAULT_RECURRENT_INITIALIZER = 'orthogonal';
        this.DEFAULT_BIAS_INITIALIZER = 'zeros';
        this.units = args.units;
        assertPositiveInteger(this.units, 'units');
        this.activation = getActivation(args.activation === undefined ? this.DEFAULT_ACTIVATION :
            args.activation);
        this.recurrentActivation = getActivation(args.recurrentActivation === undefined ?
            this.DEFAULT_RECURRENT_ACTIVATION :
            args.recurrentActivation);
        this.useBias = args.useBias == null ? true : args.useBias;
        this.kernelInitializer = getInitializer(args.kernelInitializer || this.DEFAULT_KERNEL_INITIALIZER);
        this.recurrentInitializer = getInitializer(args.recurrentInitializer || this.DEFAULT_RECURRENT_INITIALIZER);
        this.biasInitializer =
            getInitializer(args.biasInitializer || this.DEFAULT_BIAS_INITIALIZER);
        this.unitForgetBias = args.unitForgetBias;
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
        this.recurrentRegularizer = getRegularizer(args.recurrentRegularizer);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.recurrentConstraint = getConstraint(args.recurrentConstraint);
        this.biasConstraint = getConstraint(args.biasConstraint);
        this.dropout = math_utils.min([1, math_utils.max([0, args.dropout == null ? 0 : args.dropout])]);
        this.recurrentDropout = math_utils.min([
            1,
            math_utils.max([0, args.recurrentDropout == null ? 0 : args.recurrentDropout])
        ]);
        this.dropoutFunc = args.dropoutFunc;
        this.implementation = args.implementation;
        this.stateSize = [this.units, this.units];
        this.dropoutMask = null;
        this.recurrentDropoutMask = null;
    }
    build(inputShape) {
        var _a;
        inputShape = getExactlyOneShape(inputShape);
        const inputDim = inputShape[inputShape.length - 1];
        this.kernel = this.addWeight('kernel', [inputDim, this.units * 4], null, this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
        this.recurrentKernel = this.addWeight('recurrent_kernel', [this.units, this.units * 4], null, this.recurrentInitializer, this.recurrentRegularizer, true, this.recurrentConstraint);
        let biasInitializer;
        if (this.useBias) {
            if (this.unitForgetBias) {
                const capturedBiasInit = this.biasInitializer;
                const capturedUnits = this.units;
                biasInitializer = new (_a = class CustomInit extends Initializer {
                        apply(shape, dtype) {
                            // TODO(cais): More informative variable names?
                            const bI = capturedBiasInit.apply([capturedUnits]);
                            const bF = (new Ones()).apply([capturedUnits]);
                            const bCAndH = capturedBiasInit.apply([capturedUnits * 2]);
                            return K.concatAlongFirstAxis(K.concatAlongFirstAxis(bI, bF), bCAndH);
                        }
                    },
                    /** @nocollapse */
                    _a.className = 'CustomInit',
                    _a)();
            }
            else {
                biasInitializer = this.biasInitializer;
            }
            this.bias = this.addWeight('bias', [this.units * 4], null, biasInitializer, this.biasRegularizer, true, this.biasConstraint);
        }
        else {
            this.bias = null;
        }
        // Porting Notes: Unlike the PyKeras implementation, we perform slicing
        //   of the weights and bias in the call() method, at execution time.
        this.built = true;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            const training = kwargs['training'] == null ? false : kwargs['training'];
            inputs = inputs;
            if (inputs.length !== 3) {
                throw new ValueError(`LSTMCell expects 3 input Tensors (inputs, h, c), got ` +
                    `${inputs.length}.`);
            }
            let hTMinus1 = inputs[1]; // Previous memory state.
            const cTMinus1 = inputs[2]; // Previous carry state.
            inputs = inputs[0];
            if (0 < this.dropout && this.dropout < 1 && this.dropoutMask == null) {
                this.dropoutMask = generateDropoutMask({
                    ones: () => tfc.onesLike(inputs),
                    rate: this.dropout,
                    training,
                    count: 4,
                    dropoutFunc: this.dropoutFunc
                });
            }
            if (0 < this.recurrentDropout && this.recurrentDropout < 1 &&
                this.recurrentDropoutMask == null) {
                this.recurrentDropoutMask = generateDropoutMask({
                    ones: () => tfc.onesLike(hTMinus1),
                    rate: this.recurrentDropout,
                    training,
                    count: 4,
                    dropoutFunc: this.dropoutFunc
                });
            }
            const dpMask = this.dropoutMask;
            const recDpMask = this.recurrentDropoutMask;
            // Note: For superior performance, TensorFlow.js always uses
            // implementation 2 regardless of the actual value of
            // config.implementation.
            let i;
            let f;
            let c;
            let o;
            if (0 < this.dropout && this.dropout < 1) {
                inputs = tfc.mul(inputs, dpMask[0]);
            }
            let z = K.dot(inputs, this.kernel.read());
            if (0 < this.recurrentDropout && this.recurrentDropout < 1) {
                hTMinus1 = tfc.mul(hTMinus1, recDpMask[0]);
            }
            z = tfc.add(z, K.dot(hTMinus1, this.recurrentKernel.read()));
            if (this.useBias) {
                z = K.biasAdd(z, this.bias.read());
            }
            const [z0, z1, z2, z3] = tfc.split(z, 4, z.rank - 1);
            i = this.recurrentActivation.apply(z0);
            f = this.recurrentActivation.apply(z1);
            c = tfc.add(tfc.mul(f, cTMinus1), tfc.mul(i, this.activation.apply(z2)));
            o = this.recurrentActivation.apply(z3);
            const h = tfc.mul(o, this.activation.apply(c));
            // TODO(cais): Add use_learning_phase flag properly.
            return [h, h, c];
        });
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = {
            units: this.units,
            activation: serializeActivation(this.activation),
            recurrentActivation: serializeActivation(this.recurrentActivation),
            useBias: this.useBias,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            recurrentInitializer: serializeInitializer(this.recurrentInitializer),
            biasInitializer: serializeInitializer(this.biasInitializer),
            unitForgetBias: this.unitForgetBias,
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            recurrentRegularizer: serializeRegularizer(this.recurrentRegularizer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint),
            recurrentConstraint: serializeConstraint(this.recurrentConstraint),
            biasConstraint: serializeConstraint(this.biasConstraint),
            dropout: this.dropout,
            recurrentDropout: this.recurrentDropout,
            implementation: this.implementation,
        };
        return Object.assign(Object.assign({}, baseConfig), config);
    }
}
/** @nocollapse */
LSTMCell.className = 'LSTMCell';
export { LSTMCell };
serialization.registerClass(LSTMCell);
class LSTM extends RNN {
    constructor(args) {
        if (args.implementation === 0) {
            console.warn('`implementation=0` has been deprecated, and now defaults to ' +
                '`implementation=1`. Please update your layer call.');
        }
        args.cell = new LSTMCell(args);
        super(args);
        // TODO(cais): Add activityRegularizer.
    }
    call(inputs, kwargs) {
        return tidy(() => {
            if (this.cell.dropoutMask != null) {
                tfc.dispose(this.cell.dropoutMask);
                this.cell.dropoutMask = null;
            }
            if (this.cell.recurrentDropoutMask != null) {
                tfc.dispose(this.cell.recurrentDropoutMask);
                this.cell.recurrentDropoutMask = null;
            }
            const mask = kwargs == null ? null : kwargs['mask'];
            const training = kwargs == null ? null : kwargs['training'];
            const initialState = kwargs == null ? null : kwargs['initialState'];
            return super.call(inputs, { mask, training, initialState });
        });
    }
    /** @nocollapse */
    static fromConfig(cls, config) {
        if (config['implmentation'] === 0) {
            config['implementation'] = 1;
        }
        return new cls(config);
    }
}
/** @nocollapse */
LSTM.className = 'LSTM';
export { LSTM };
serialization.registerClass(LSTM);
class StackedRNNCells extends RNNCell {
    constructor(args) {
        super(args);
        this.cells = args.cells;
    }
    get stateSize() {
        // States are a flat list in reverse order of the cell stack.
        // This allows preserving the requirement `stack.statesize[0] ===
        // outputDim`. E.g., states of a 2-layer LSTM would be `[h2, c2, h1, c1]`,
        // assuming one LSTM has states `[h, c]`.
        const stateSize = [];
        for (const cell of this.cells.slice().reverse()) {
            if (Array.isArray(cell.stateSize)) {
                stateSize.push(...cell.stateSize);
            }
            else {
                stateSize.push(cell.stateSize);
            }
        }
        return stateSize;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = inputs;
            let states = inputs.slice(1);
            // Recover per-cell states.
            const nestedStates = [];
            for (const cell of this.cells.slice().reverse()) {
                if (Array.isArray(cell.stateSize)) {
                    nestedStates.push(states.splice(0, cell.stateSize.length));
                }
                else {
                    nestedStates.push(states.splice(0, 1));
                }
            }
            nestedStates.reverse();
            // Call the cells in order and store the returned states.
            const newNestedStates = [];
            let callInputs;
            for (let i = 0; i < this.cells.length; ++i) {
                const cell = this.cells[i];
                states = nestedStates[i];
                // TODO(cais): Take care of constants.
                if (i === 0) {
                    callInputs = [inputs[0]].concat(states);
                }
                else {
                    callInputs = [callInputs[0]].concat(states);
                }
                callInputs = cell.call(callInputs, kwargs);
                newNestedStates.push(callInputs.slice(1));
            }
            // Format the new states as a flat list in reverse cell order.
            states = [];
            for (const cellStates of newNestedStates.slice().reverse()) {
                states.push(...cellStates);
            }
            return [callInputs[0]].concat(states);
        });
    }
    build(inputShape) {
        if (isArrayOfShapes(inputShape)) {
            // TODO(cais): Take care of input constants.
            // const constantShape = inputShape.slice(1);
            inputShape = inputShape[0];
        }
        inputShape = inputShape;
        let outputDim;
        this.cells.forEach((cell, i) => {
            nameScope(`RNNCell_${i}`, () => {
                // TODO(cais): Take care of input constants.
                cell.build(inputShape);
                if (Array.isArray(cell.stateSize)) {
                    outputDim = cell.stateSize[0];
                }
                else {
                    outputDim = cell.stateSize;
                }
                inputShape = [inputShape[0], outputDim];
            });
        });
        this.built = true;
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const getCellConfig = (cell) => {
            return {
                'className': cell.getClassName(),
                'config': cell.getConfig(),
            };
        };
        const cellConfigs = this.cells.map(getCellConfig);
        const config = { 'cells': cellConfigs };
        return Object.assign(Object.assign({}, baseConfig), config);
    }
    /** @nocollapse */
    static fromConfig(cls, config, customObjects = {}) {
        const cells = [];
        for (const cellConfig of config['cells']) {
            cells.push(deserialize(cellConfig, customObjects));
        }
        return new cls({ cells });
    }
    get trainableWeights() {
        if (!this.trainable) {
            return [];
        }
        const weights = [];
        for (const cell of this.cells) {
            weights.push(...cell.trainableWeights);
        }
        return weights;
    }
    get nonTrainableWeights() {
        const weights = [];
        for (const cell of this.cells) {
            weights.push(...cell.nonTrainableWeights);
        }
        if (!this.trainable) {
            const trainableWeights = [];
            for (const cell of this.cells) {
                trainableWeights.push(...cell.trainableWeights);
            }
            return trainableWeights.concat(weights);
        }
        return weights;
    }
    /**
     * Retrieve the weights of a the model.
     *
     * @returns A flat `Array` of `tf.Tensor`s.
     */
    getWeights() {
        const weights = [];
        for (const cell of this.cells) {
            weights.push(...cell.weights);
        }
        return batchGetValue(weights);
    }
    /**
     * Set the weights of the model.
     *
     * @param weights An `Array` of `tf.Tensor`s with shapes and types matching
     *     the output of `getWeights()`.
     */
    setWeights(weights) {
        const tuples = [];
        for (const cell of this.cells) {
            const numParams = cell.weights.length;
            const inputWeights = weights.splice(numParams);
            for (let i = 0; i < cell.weights.length; ++i) {
                tuples.push([cell.weights[i], inputWeights[i]]);
            }
        }
        batchSetValue(tuples);
    }
}
/** @nocollapse */
StackedRNNCells.className = 'StackedRNNCells';
export { StackedRNNCells };
serialization.registerClass(StackedRNNCells);
export function generateDropoutMask(args) {
    const { ones, rate, training = false, count = 1, dropoutFunc } = args;
    const droppedInputs = () => dropoutFunc != null ? dropoutFunc(ones(), rate) : K.dropout(ones(), rate);
    const createMask = () => K.inTrainPhase(droppedInputs, ones, training);
    // just in case count is provided with null or undefined
    if (!count || count <= 1) {
        return tfc.keep(createMask().clone());
    }
    const masks = Array(count).fill(undefined).map(createMask);
    return masks.map(m => tfc.keep(m.clone()));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjdXJyZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL2xheWVycy9yZWN1cnJlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0dBUUc7QUFFSDs7R0FFRztBQUVILE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFXLGFBQWEsRUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFFbEYsT0FBTyxFQUFhLGFBQWEsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQzlFLE9BQU8sS0FBSyxDQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQW1DLGFBQWEsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3BHLE9BQU8sRUFBQyxTQUFTLEVBQUUsY0FBYyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0QsT0FBTyxFQUFDLEtBQUssRUFBWSxNQUFNLG9CQUFvQixDQUFDO0FBQ3BELE9BQU8sRUFBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQzFFLE9BQU8sRUFBQyxjQUFjLEVBQUUsV0FBVyxFQUF5QixJQUFJLEVBQUUsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUcvRyxPQUFPLEVBQUMsY0FBYyxFQUFzQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXpHLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzdELE9BQU8sS0FBSyxVQUFVLE1BQU0scUJBQXFCLENBQUM7QUFDbEQsT0FBTyxFQUFDLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBQyxNQUFNLHNCQUFzQixDQUFD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QUFVLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRXZFLHdEQUF3RDtJQUN4RCxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUU7UUFDeEIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDdkM7SUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUUzRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGVcbiAqIGxpY2Vuc2UgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBvciBhdFxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogVGVuc29yRmxvdy5qcyBMYXllcnM6IFJlY3VycmVudCBOZXVyYWwgTmV0d29yayBMYXllcnMuXG4gKi9cblxuaW1wb3J0ICogYXMgdGZjIGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5pbXBvcnQge0RhdGFUeXBlLCBzZXJpYWxpemF0aW9uLCBUZW5zb3IsIHRpZHksIHV0aWx9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7QWN0aXZhdGlvbiwgZ2V0QWN0aXZhdGlvbiwgc2VyaWFsaXplQWN0aXZhdGlvbn0gZnJvbSAnLi4vYWN0aXZhdGlvbnMnO1xuaW1wb3J0ICogYXMgSyBmcm9tICcuLi9iYWNrZW5kL3RmanNfYmFja2VuZCc7XG5pbXBvcnQge25hbWVTY29wZX0gZnJvbSAnLi4vY29tbW9uJztcbmltcG9ydCB7Q29uc3RyYWludCwgQ29uc3RyYWludElkZW50aWZpZXIsIGdldENvbnN0cmFpbnQsIHNlcmlhbGl6ZUNvbnN0cmFpbnR9IGZyb20gJy4uL2NvbnN0cmFpbnRzJztcbmltcG9ydCB7SW5wdXRTcGVjLCBTeW1ib2xpY1RlbnNvcn0gZnJvbSAnLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7TGF5ZXIsIExheWVyQXJnc30gZnJvbSAnLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7QXR0cmlidXRlRXJyb3IsIE5vdEltcGxlbWVudGVkRXJyb3IsIFZhbHVlRXJyb3J9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQge2dldEluaXRpYWxpemVyLCBJbml0aWFsaXplciwgSW5pdGlhbGl6ZXJJZGVudGlmaWVyLCBPbmVzLCBzZXJpYWxpemVJbml0aWFsaXplcn0gZnJvbSAnLi4vaW5pdGlhbGl6ZXJzJztcbmltcG9ydCB7QWN0aXZhdGlvbklkZW50aWZpZXJ9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC9hY3RpdmF0aW9uX2NvbmZpZyc7XG5pbXBvcnQge1NoYXBlfSBmcm9tICcuLi9rZXJhc19mb3JtYXQvY29tbW9uJztcbmltcG9ydCB7Z2V0UmVndWxhcml6ZXIsIFJlZ3VsYXJpemVyLCBSZWd1bGFyaXplcklkZW50aWZpZXIsIHNlcmlhbGl6ZVJlZ3VsYXJpemVyfSBmcm9tICcuLi9yZWd1bGFyaXplcnMnO1xuaW1wb3J0IHtLd2FyZ3MsIFJublN0ZXBGdW5jdGlvbn0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHthc3NlcnRQb3NpdGl2ZUludGVnZXJ9IGZyb20gJy4uL3V0aWxzL2dlbmVyaWNfdXRpbHMnO1xuaW1wb3J0ICogYXMgbWF0aF91dGlscyBmcm9tICcuLi91dGlscy9tYXRoX3V0aWxzJztcbmltcG9ydCB7Z2V0RXhhY3RseU9uZVNoYXBlLCBnZXRFeGFjdGx5T25lVGVuc29yLCBpc0FycmF5T2ZTaGFwZXN9IGZyb20gJy4uL3V0aWxzL3R5cGVzX3V0aWxzJztcbmltcG9ydCB7YmF0Y2hHZXRWYWx1ZSwgYmF0Y2hTZXRWYWx1ZSwgTGF5ZXJWYXJpYWJsZX0gZnJvbSAnLi4vdmFyaWFibGVzJztcblxuaW1wb3J0IHtkZXNlcmlhbGl6ZX0gZnJvbSAnLi9zZXJpYWxpemF0aW9uJztcblxuLyoqXG4gKiBTdGFuZGFyZGl6ZSBgYXBwbHkoKWAgYXJncyB0byBhIHNpbmdsZSBsaXN0IG9mIHRlbnNvciBpbnB1dHMuXG4gKlxuICogV2hlbiBydW5uaW5nIGEgbW9kZWwgbG9hZGVkIGZyb20gZmlsZSwgdGhlIGlucHV0IHRlbnNvcnMgYGluaXRpYWxTdGF0ZWAgYW5kXG4gKiBgY29uc3RhbnRzYCBhcmUgcGFzc2VkIHRvIGBSTk4uYXBwbHkoKWAgYXMgcGFydCBvZiBgaW5wdXRzYCBpbnN0ZWFkIG9mIHRoZVxuICogZGVkaWNhdGVkIGt3YXJncyBmaWVsZHMuIGBpbnB1dHNgIGNvbnNpc3RzIG9mXG4gKiBgW2lucHV0cywgaW5pdGlhbFN0YXRlMCwgaW5pdGlhbFN0YXRlMSwgLi4uLCBjb25zdGFudDAsIGNvbnN0YW50MV1gIGluIHRoaXNcbiAqIGNhc2UuXG4gKiBUaGlzIG1ldGhvZCBtYWtlcyBzdXJlIHRoYXQgYXJndW1lbnRzIGFyZVxuICogc2VwYXJhdGVkIGFuZCB0aGF0IGBpbml0aWFsU3RhdGVgIGFuZCBgY29uc3RhbnRzYCBhcmUgYEFycmF5YHMgb2YgdGVuc29yc1xuICogKG9yIE5vbmUpLlxuICpcbiAqIEBwYXJhbSBpbnB1dHMgVGVuc29yIG9yIGBBcnJheWAgb2YgIHRlbnNvcnMuXG4gKiBAcGFyYW0gaW5pdGlhbFN0YXRlIFRlbnNvciBvciBgQXJyYXlgIG9mIHRlbnNvcnMgb3IgYG51bGxgL2B1bmRlZmluZWRgLlxuICogQHBhcmFtIGNvbnN0YW50cyBUZW5zb3Igb3IgYEFycmF5YCBvZiB0ZW5zb3JzIG9yIGBudWxsYC9gdW5kZWZpbmVkYC5cbiAqIEByZXR1cm5zIEFuIG9iamVjdCBjb25zaXN0aW5nIG9mXG4gKiAgIGlucHV0czogQSB0ZW5zb3IuXG4gKiAgIGluaXRpYWxTdGF0ZTogYEFycmF5YCBvZiB0ZW5zb3JzIG9yIGBudWxsYC5cbiAqICAgY29uc3RhbnRzOiBgQXJyYXlgIG9mIHRlbnNvcnMgb3IgYG51bGxgLlxuICogQHRocm93cyBWYWx1ZUVycm9yLCBpZiBgaW5wdXRzYCBpcyBhbiBgQXJyYXlgIGJ1dCBlaXRoZXIgYGluaXRpYWxTdGF0ZWAgb3JcbiAqICAgYGNvbnN0YW50c2AgaXMgcHJvdmlkZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFuZGFyZGl6ZUFyZ3MoXG4gICAgaW5wdXRzOiBUZW5zb3J8VGVuc29yW118U3ltYm9saWNUZW5zb3J8U3ltYm9saWNUZW5zb3JbXSxcbiAgICBpbml0aWFsU3RhdGU6IFRlbnNvcnxUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdLFxuICAgIGNvbnN0YW50czogVGVuc29yfFRlbnNvcltdfFN5bWJvbGljVGVuc29yfFN5bWJvbGljVGVuc29yW10sXG4gICAgbnVtQ29uc3RhbnRzPzogbnVtYmVyKToge1xuICBpbnB1dHM6IFRlbnNvcnxTeW1ib2xpY1RlbnNvcixcbiAgaW5pdGlhbFN0YXRlOiBUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcltdLFxuICBjb25zdGFudHM6IFRlbnNvcltdfFN5bWJvbGljVGVuc29yW11cbn0ge1xuICBpZiAoQXJyYXkuaXNBcnJheShpbnB1dHMpKSB7XG4gICAgaWYgKGluaXRpYWxTdGF0ZSAhPSBudWxsIHx8IGNvbnN0YW50cyAhPSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnV2hlbiBpbnB1dHMgaXMgYW4gYXJyYXksIG5laXRoZXIgaW5pdGlhbFN0YXRlIG9yIGNvbnN0YW50cyAnICtcbiAgICAgICAgICAnc2hvdWxkIGJlIHByb3ZpZGVkJyk7XG4gICAgfVxuICAgIGlmIChudW1Db25zdGFudHMgIT0gbnVsbCkge1xuICAgICAgY29uc3RhbnRzID0gaW5wdXRzLnNsaWNlKGlucHV0cy5sZW5ndGggLSBudW1Db25zdGFudHMsIGlucHV0cy5sZW5ndGgpO1xuICAgICAgaW5wdXRzID0gaW5wdXRzLnNsaWNlKDAsIGlucHV0cy5sZW5ndGggLSBudW1Db25zdGFudHMpO1xuICAgIH1cbiAgICBpZiAoaW5wdXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIGluaXRpYWxTdGF0ZSA9IGlucHV0cy5zbGljZSgxLCBpbnB1dHMubGVuZ3RoKTtcbiAgICB9XG4gICAgaW5wdXRzID0gaW5wdXRzWzBdO1xuICB9XG5cbiAgZnVuY3Rpb24gdG9MaXN0T3JOdWxsKHg6IFRlbnNvcnxUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcnxcbiAgICAgICAgICAgICAgICAgICAgICAgIFN5bWJvbGljVGVuc29yW10pOiBUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcltdIHtcbiAgICBpZiAoeCA9PSBudWxsIHx8IEFycmF5LmlzQXJyYXkoeCkpIHtcbiAgICAgIHJldHVybiB4IGFzIFRlbnNvcltdIHwgU3ltYm9saWNUZW5zb3JbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFt4XSBhcyBUZW5zb3JbXSB8IFN5bWJvbGljVGVuc29yW107XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbFN0YXRlID0gdG9MaXN0T3JOdWxsKGluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0YW50cyA9IHRvTGlzdE9yTnVsbChjb25zdGFudHMpO1xuXG4gIHJldHVybiB7aW5wdXRzLCBpbml0aWFsU3RhdGUsIGNvbnN0YW50c307XG59XG5cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciB0aGUgdGltZSBkaW1lbnNpb24gb2YgYSB0ZW5zb3IuXG4gKlxuICogQHBhcmFtIHN0ZXBGdW5jdGlvbiBSTk4gc3RlcCBmdW5jdGlvbi5cbiAqICAgUGFyYW1ldGVyczpcbiAqICAgICBpbnB1dHM6IHRlbnNvciB3aXRoIHNoYXBlIGBbc2FtcGxlcywgLi4uXWAgKG5vIHRpbWUgZGltZW5zaW9uKSxcbiAqICAgICAgIHJlcHJlc2VudGluZyBpbnB1dCBmb3IgdGhlIGJhdGNoIG9mIHNhbXBsZXMgYXQgYSBjZXJ0YWluIHRpbWUgc3RlcC5cbiAqICAgICBzdGF0ZXM6IGFuIEFycmF5IG9mIHRlbnNvcnMuXG4gKiAgIFJldHVybnM6XG4gKiAgICAgb3V0cHV0czogdGVuc29yIHdpdGggc2hhcGUgYFtzYW1wbGVzLCBvdXRwdXREaW1dYCAobm8gdGltZSBkaW1lbnNpb24pLlxuICogICAgIG5ld1N0YXRlczogbGlzdCBvZiB0ZW5zb3JzLCBzYW1lIGxlbmd0aCBhbmQgc2hhcGVzIGFzIGBzdGF0ZXNgLiBUaGUgZmlyc3RcbiAqICAgICAgIHN0YXRlIGluIHRoZSBsaXN0IG11c3QgYmUgdGhlIG91dHB1dCB0ZW5zb3IgYXQgdGhlIHByZXZpb3VzIHRpbWVzdGVwLlxuICogQHBhcmFtIGlucHV0cyBUZW5zb3Igb2YgdGVtcG9yYWwgZGF0YSBvZiBzaGFwZSBgW3NhbXBsZXMsIHRpbWUsIC4uLl1gIChhdFxuICogICBsZWFzdCAzRCkuXG4gKiBAcGFyYW0gaW5pdGlhbFN0YXRlcyBUZW5zb3Igd2l0aCBzaGFwZSBgW3NhbXBsZXMsIG91dHB1dERpbV1gIChubyB0aW1lXG4gKiAgIGRpbWVuc2lvbiksIGNvbnRhaW5pbmcgdGhlIGluaXRpYWwgdmFsdWVzIG9mIHRoZSBzdGF0ZXMgdXNlZCBpbiB0aGUgc3RlcFxuICogICBmdW5jdGlvbi5cbiAqIEBwYXJhbSBnb0JhY2t3YXJkcyBJZiBgdHJ1ZWAsIGRvIHRoZSBpdGVyYXRpb24gb3ZlciB0aGUgdGltZSBkaW1lbnNpb24gaW5cbiAqICAgcmV2ZXJzZSBvcmRlciBhbmQgcmV0dXJuIHRoZSByZXZlcnNlZCBzZXF1ZW5jZS5cbiAqIEBwYXJhbSBtYXNrIEJpbmFyeSB0ZW5zb3Igd2l0aCBzaGFwZSBgW3NhbXBsZSwgdGltZSwgMV1gLCB3aXRoIGEgemVybyBmb3JcbiAqICAgZXZlcnkgZWxlbWVudCB0aGF0IGlzIG1hc2tlZC5cbiAqIEBwYXJhbSBjb25zdGFudHMgQW4gQXJyYXkgb2YgY29uc3RhbnQgdmFsdWVzIHBhc3NlZCBhdCBlYWNoIHN0ZXAuXG4gKiBAcGFyYW0gdW5yb2xsIFdoZXRoZXIgdG8gdW5yb2xsIHRoZSBSTk4gb3IgdG8gdXNlIGEgc3ltYm9saWMgbG9vcC4gKk5vdCpcbiAqICAgYXBwbGljYWJsZSB0byB0aGlzIGltcGVyYXRpdmUgZGVlcGxlYXJuLmpzIGJhY2tlbmQuIEl0cyB2YWx1ZSBpcyBpZ25vcmVkLlxuICogQHBhcmFtIG5lZWRQZXJTdGVwT3V0cHV0cyBXaGV0aGVyIHRoZSBwZXItc3RlcCBvdXRwdXRzIGFyZSB0byBiZVxuICogICBjb25jYXRlbmF0ZWQgaW50byBhIHNpbmdsZSB0ZW5zb3IgYW5kIHJldHVybmVkIChhcyB0aGUgc2Vjb25kIHJldHVyblxuICogICB2YWx1ZSkuIERlZmF1bHQ6IGBmYWxzZWAuIFRoaXMgYXJnIGlzIGluY2x1ZGVkIHNvIHRoYXQgdGhlIHJlbGF0aXZlbHlcbiAqICAgZXhwZW5zaXZlIGNvbmNhdGVuYXRpb24gb2YgdGhlIHN0ZXB3aXNlIG91dHB1dHMgY2FuIGJlIG9taXR0ZWQgdW5sZXNzXG4gKiAgIHRoZSBzdGVwd2lzZSBvdXRwdXRzIG5lZWQgdG8gYmUga2VwdCAoZS5nLiwgZm9yIGFuIExTVE0gbGF5ZXIgb2Ygd2hpY2hcbiAqICAgYHJldHVyblNlcXVlbmNlYCBpcyBgdHJ1ZWAuKVxuICogQHJldHVybnMgQW4gQXJyYXk6IGBbbGFzdE91dHB1dCwgb3V0cHV0cywgbmV3U3RhdGVzXWAuXG4gKiAgIGxhc3RPdXRwdXQ6IHRoZSBsYXN0ZXN0IG91dHB1dCBvZiB0aGUgUk5OLCBvZiBzaGFwZSBgW3NhbXBsZXMsIC4uLl1gLlxuICogICBvdXRwdXRzOiB0ZW5zb3Igd2l0aCBzaGFwZSBgW3NhbXBsZXMsIHRpbWUsIC4uLl1gIHdoZXJlIGVhY2ggZW50cnlcbiAqICAgICBgb3V0cHV0W3MsIHRdYCBpcyB0aGUgb3V0cHV0IG9mIHRoZSBzdGVwIGZ1bmN0aW9uIGF0IHRpbWUgYHRgIGZvciBzYW1wbGVcbiAqICAgICBgc2AuIFRoaXMgcmV0dXJuIHZhbHVlIGlzIHByb3ZpZGVkIGlmIGFuZCBvbmx5IGlmIHRoZVxuICogICAgIGBuZWVkUGVyU3RlcE91dHB1dHNgIGlzIHNldCBhcyBgdHJ1ZWAuIElmIGl0IGlzIHNldCBhcyBgZmFsc2VgLCB0aGlzXG4gKiAgICAgcmV0dXJuIHZhbHVlIHdpbGwgYmUgYHVuZGVmaW5lZGAuXG4gKiAgIG5ld1N0YXRlczogQXJyYXkgb2YgdGVuc29ycywgbGF0ZXN0IHN0YXRlcyByZXR1cm5lZCBieSB0aGUgc3RlcCBmdW5jdGlvbixcbiAqICAgICAgb2Ygc2hhcGUgYChzYW1wbGVzLCAuLi4pYC5cbiAqIEB0aHJvd3MgVmFsdWVFcnJvciBJZiBpbnB1dCBkaW1lbnNpb24gaXMgbGVzcyB0aGFuIDMuXG4gKlxuICogVE9ETyhuaWVsc2VuZSk6IFRoaXMgbmVlZHMgdG8gYmUgdGlkeS1lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJubihcbiAgICBzdGVwRnVuY3Rpb246IFJublN0ZXBGdW5jdGlvbiwgaW5wdXRzOiBUZW5zb3IsIGluaXRpYWxTdGF0ZXM6IFRlbnNvcltdLFxuICAgIGdvQmFja3dhcmRzID0gZmFsc2UsIG1hc2s/OiBUZW5zb3IsIGNvbnN0YW50cz86IFRlbnNvcltdLCB1bnJvbGwgPSBmYWxzZSxcbiAgICBuZWVkUGVyU3RlcE91dHB1dHMgPSBmYWxzZSk6IFtUZW5zb3IsIFRlbnNvciwgVGVuc29yW11dIHtcbiAgcmV0dXJuIHRmYy50aWR5KCgpID0+IHtcbiAgICBjb25zdCBuZGltID0gaW5wdXRzLnNoYXBlLmxlbmd0aDtcbiAgICBpZiAobmRpbSA8IDMpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKGBJbnB1dCBzaG91bGQgYmUgYXQgbGVhc3QgM0QsIGJ1dCBpcyAke25kaW19RC5gKTtcbiAgICB9XG5cbiAgICAvLyBUcmFuc3Bvc2UgdG8gdGltZS1tYWpvciwgaS5lLiwgZnJvbSBbYmF0Y2gsIHRpbWUsIC4uLl0gdG8gW3RpbWUsIGJhdGNoLFxuICAgIC8vIC4uLl0uXG4gICAgY29uc3QgYXhlcyA9IFsxLCAwXS5jb25jYXQobWF0aF91dGlscy5yYW5nZSgyLCBuZGltKSk7XG4gICAgaW5wdXRzID0gdGZjLnRyYW5zcG9zZShpbnB1dHMsIGF4ZXMpO1xuXG4gICAgaWYgKGNvbnN0YW50cyAhPSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgICAnVGhlIHJubigpIGZ1bmN0b2luIG9mIHRoZSBkZWVwbGVhcm4uanMgYmFja2VuZCBkb2VzIG5vdCBzdXBwb3J0ICcgK1xuICAgICAgICAgICdjb25zdGFudHMgeWV0LicpO1xuICAgIH1cblxuICAgIC8vIFBvcnRpbmcgTm90ZTogdGhlIHVucm9sbCBvcHRpb24gaXMgaWdub3JlZCBieSB0aGUgaW1wZXJhdGl2ZSBiYWNrZW5kLlxuICAgIGlmICh1bnJvbGwpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnQmFja2VuZCBybm4oKTogdGhlIHVucm9sbCA9IHRydWUgb3B0aW9uIGlzIG5vdCBhcHBsaWNhYmxlIHRvIHRoZSAnICtcbiAgICAgICAgICAnaW1wZXJhdGl2ZSBkZWVwbGVhcm4uanMgYmFja2VuZC4nKTtcbiAgICB9XG5cbiAgICBpZiAobWFzayAhPSBudWxsKSB7XG4gICAgICBtYXNrID0gdGZjLmNhc3QodGZjLmNhc3QobWFzaywgJ2Jvb2wnKSwgJ2Zsb2F0MzInKTtcbiAgICAgIGlmIChtYXNrLnJhbmsgPT09IG5kaW0gLSAxKSB7XG4gICAgICAgIG1hc2sgPSB0ZmMuZXhwYW5kRGltcyhtYXNrLCAtMSk7XG4gICAgICB9XG4gICAgICBtYXNrID0gdGZjLnRyYW5zcG9zZShtYXNrLCBheGVzKTtcbiAgICB9XG5cbiAgICBpZiAoZ29CYWNrd2FyZHMpIHtcbiAgICAgIGlucHV0cyA9IHRmYy5yZXZlcnNlKGlucHV0cywgMCk7XG4gICAgICBpZiAobWFzayAhPSBudWxsKSB7XG4gICAgICAgIG1hc2sgPSB0ZmMucmV2ZXJzZShtYXNrLCAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQb3J0aW5nIE5vdGU6IFB5S2VyYXMgd2l0aCBUZW5zb3JGbG93IGJhY2tlbmQgdXNlcyBhIHN5bWJvbGljIGxvb3BcbiAgICAvLyAgICh0Zi53aGlsZV9sb29wKS4gQnV0IGZvciB0aGUgaW1wZXJhdGl2ZSBkZWVwbGVhcm4uanMgYmFja2VuZCwgd2UganVzdFxuICAgIC8vICAgdXNlIHRoZSB1c3VhbCBUeXBlU2NyaXB0IGNvbnRyb2wgZmxvdyB0byBpdGVyYXRlIG92ZXIgdGhlIHRpbWUgc3RlcHMgaW5cbiAgICAvLyAgIHRoZSBpbnB1dHMuXG4gICAgLy8gUG9ydGluZyBOb3RlOiBQeUtlcmFzIHBhdGNoZXMgYSBcIl91c2VfbGVhcm5pbmdfcGhhc2VcIiBhdHRyaWJ1dGUgdG9cbiAgICAvLyBvdXRwdXRzLlxuICAgIC8vICAgVGhpcyBpcyBub3QgaWRpb21hdGljIGluIFR5cGVTY3JpcHQuIFRoZSBpbmZvIHJlZ2FyZGluZyB3aGV0aGVyIHdlIGFyZVxuICAgIC8vICAgaW4gYSBsZWFybmluZyAoaS5lLiwgdHJhaW5pbmcpIHBoYXNlIGZvciBSTk4gaXMgcGFzc2VkIGluIGEgZGlmZmVyZW50XG4gICAgLy8gICB3YXkuXG5cbiAgICBjb25zdCBwZXJTdGVwT3V0cHV0czogVGVuc29yW10gPSBbXTtcbiAgICBsZXQgbGFzdE91dHB1dDogVGVuc29yO1xuICAgIGxldCBzdGF0ZXMgPSBpbml0aWFsU3RhdGVzO1xuICAgIGNvbnN0IHRpbWVTdGVwcyA9IGlucHV0cy5zaGFwZVswXTtcbiAgICBjb25zdCBwZXJTdGVwSW5wdXRzID0gdGZjLnVuc3RhY2soaW5wdXRzKTtcbiAgICBsZXQgcGVyU3RlcE1hc2tzOiBUZW5zb3JbXTtcbiAgICBpZiAobWFzayAhPSBudWxsKSB7XG4gICAgICBwZXJTdGVwTWFza3MgPSB0ZmMudW5zdGFjayhtYXNrKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHRpbWVTdGVwczsgKyt0KSB7XG4gICAgICBjb25zdCBjdXJyZW50SW5wdXQgPSBwZXJTdGVwSW5wdXRzW3RdO1xuICAgICAgY29uc3Qgc3RlcE91dHB1dHMgPSB0ZmMudGlkeSgoKSA9PiBzdGVwRnVuY3Rpb24oY3VycmVudElucHV0LCBzdGF0ZXMpKTtcblxuICAgICAgaWYgKG1hc2sgPT0gbnVsbCkge1xuICAgICAgICBsYXN0T3V0cHV0ID0gc3RlcE91dHB1dHNbMF07XG4gICAgICAgIHN0YXRlcyA9IHN0ZXBPdXRwdXRzWzFdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbWFza2VkT3V0cHV0cyA9IHRmYy50aWR5KCgpID0+IHtcbiAgICAgICAgICBjb25zdCBzdGVwTWFzayA9IHBlclN0ZXBNYXNrc1t0XTtcbiAgICAgICAgICBjb25zdCBuZWdTdGVwTWFzayA9IHRmYy5zdWIodGZjLm9uZXNMaWtlKHN0ZXBNYXNrKSwgc3RlcE1hc2spO1xuICAgICAgICAgIC8vIFRPRE8oY2Fpcyk6IFdvdWxkIHRmYy53aGVyZSgpIGJlIGJldHRlciBmb3IgcGVyZm9ybWFuY2U/XG4gICAgICAgICAgY29uc3Qgb3V0cHV0ID0gdGZjLmFkZChcbiAgICAgICAgICAgICAgdGZjLm11bChzdGVwT3V0cHV0c1swXSwgc3RlcE1hc2spLFxuICAgICAgICAgICAgICB0ZmMubXVsKHN0YXRlc1swXSwgbmVnU3RlcE1hc2spKTtcbiAgICAgICAgICBjb25zdCBuZXdTdGF0ZXMgPSBzdGF0ZXMubWFwKChzdGF0ZSwgaSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRmYy5hZGQoXG4gICAgICAgICAgICAgICAgdGZjLm11bChzdGVwT3V0cHV0c1sxXVtpXSwgc3RlcE1hc2spLFxuICAgICAgICAgICAgICAgIHRmYy5tdWwoc3RhdGUsIG5lZ1N0ZXBNYXNrKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHtvdXRwdXQsIG5ld1N0YXRlc307XG4gICAgICAgIH0pO1xuICAgICAgICBsYXN0T3V0cHV0ID0gbWFza2VkT3V0cHV0cy5vdXRwdXQ7XG4gICAgICAgIHN0YXRlcyA9IG1hc2tlZE91dHB1dHMubmV3U3RhdGVzO1xuICAgICAgfVxuXG4gICAgICBpZiAobmVlZFBlclN0ZXBPdXRwdXRzKSB7XG4gICAgICAgIHBlclN0ZXBPdXRwdXRzLnB1c2gobGFzdE91dHB1dCk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBvdXRwdXRzOiBUZW5zb3I7XG4gICAgaWYgKG5lZWRQZXJTdGVwT3V0cHV0cykge1xuICAgICAgY29uc3QgYXhpcyA9IDE7XG4gICAgICBvdXRwdXRzID0gdGZjLnN0YWNrKHBlclN0ZXBPdXRwdXRzLCBheGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIFtsYXN0T3V0cHV0LCBvdXRwdXRzLCBzdGF0ZXNdIGFzIFtUZW5zb3IsIFRlbnNvciwgVGVuc29yW11dO1xuICB9KTtcbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEJhc2VSTk5MYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogQSBSTk4gY2VsbCBpbnN0YW5jZS4gQSBSTk4gY2VsbCBpcyBhIGNsYXNzIHRoYXQgaGFzOlxuICAgKiAgIC0gYSBgY2FsbCgpYCBtZXRob2QsIHdoaWNoIHRha2VzIGBbVGVuc29yLCBUZW5zb3JdYCBhcyB0aGVcbiAgICogICAgIGZpcnN0IGlucHV0IGFyZ3VtZW50LiBUaGUgZmlyc3QgaXRlbSBpcyB0aGUgaW5wdXQgYXQgdGltZSB0LCBhbmRcbiAgICogICAgIHNlY29uZCBpdGVtIGlzIHRoZSBjZWxsIHN0YXRlIGF0IHRpbWUgdC5cbiAgICogICAgIFRoZSBgY2FsbCgpYCBtZXRob2QgcmV0dXJucyBgW291dHB1dEF0VCwgc3RhdGVzQXRUUGx1czFdYC5cbiAgICogICAgIFRoZSBgY2FsbCgpYCBtZXRob2Qgb2YgdGhlIGNlbGwgY2FuIGFsc28gdGFrZSB0aGUgYXJndW1lbnQgYGNvbnN0YW50c2AsXG4gICAqICAgICBzZWUgc2VjdGlvbiBcIk5vdGUgb24gcGFzc2luZyBleHRlcm5hbCBjb25zdGFudHNcIiBiZWxvdy5cbiAgICogICAgIFBvcnRpbmcgTm9kZTogUHlLZXJhcyBvdmVycmlkZXMgdGhlIGBjYWxsKClgIHNpZ25hdHVyZSBvZiBSTk4gY2VsbHMsXG4gICAqICAgICAgIHdoaWNoIGFyZSBMYXllciBzdWJ0eXBlcywgdG8gYWNjZXB0IHR3byBhcmd1bWVudHMuIHRmanMtbGF5ZXJzIGRvZXNcbiAgICogICAgICAgbm90IGRvIHN1Y2ggb3ZlcnJpZGluZy4gSW5zdGVhZCB3ZSBwcmVzZXJ2ZSB0aGUgYGNhbGwoKWAgc2lnbmF0dXJlLFxuICAgKiAgICAgICB3aGljaCBkdWUgdG8gaXRzIGBUZW5zb3J8VGVuc29yW11gIGFyZ3VtZW50IGFuZCByZXR1cm4gdmFsdWUgaXNcbiAgICogICAgICAgZmxleGlibGUgZW5vdWdoIHRvIGhhbmRsZSB0aGUgaW5wdXRzIGFuZCBzdGF0ZXMuXG4gICAqICAgLSBhIGBzdGF0ZVNpemVgIGF0dHJpYnV0ZS4gVGhpcyBjYW4gYmUgYSBzaW5nbGUgaW50ZWdlciAoc2luZ2xlIHN0YXRlKVxuICAgKiAgICAgaW4gd2hpY2ggY2FzZSBpdCBpcyB0aGUgc2l6ZSBvZiB0aGUgcmVjdXJyZW50IHN0YXRlICh3aGljaCBzaG91bGQgYmVcbiAgICogICAgIHRoZSBzYW1lIGFzIHRoZSBzaXplIG9mIHRoZSBjZWxsIG91dHB1dCkuIFRoaXMgY2FuIGFsc28gYmUgYW4gQXJyYXkgb2ZcbiAgICogICAgIGludGVnZXJzIChvbmUgc2l6ZSBwZXIgc3RhdGUpLiBJbiB0aGlzIGNhc2UsIHRoZSBmaXJzdCBlbnRyeVxuICAgKiAgICAgKGBzdGF0ZVNpemVbMF1gKSBzaG91bGQgYmUgdGhlIHNhbWUgYXMgdGhlIHNpemUgb2YgdGhlIGNlbGwgb3V0cHV0LlxuICAgKiBJdCBpcyBhbHNvIHBvc3NpYmxlIGZvciBgY2VsbGAgdG8gYmUgYSBsaXN0IG9mIFJOTiBjZWxsIGluc3RhbmNlcywgaW4gd2hpY2hcbiAgICogY2FzZSB0aGUgY2VsbHMgZ2V0IHN0YWNrZWQgb24gYWZ0ZXIgdGhlIG90aGVyIGluIHRoZSBSTk4sIGltcGxlbWVudGluZyBhblxuICAgKiBlZmZpY2llbnQgc3RhY2tlZCBSTk4uXG4gICAqL1xuICBjZWxsPzogUk5OQ2VsbHxSTk5DZWxsW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcmV0dXJuIHRoZSBsYXN0IG91dHB1dCBpbiB0aGUgb3V0cHV0IHNlcXVlbmNlLCBvciB0aGUgZnVsbFxuICAgKiBzZXF1ZW5jZS5cbiAgICovXG4gIHJldHVyblNlcXVlbmNlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcmV0dXJuIHRoZSBsYXN0IHN0YXRlIGluIGFkZGl0aW9uIHRvIHRoZSBvdXRwdXQuXG4gICAqL1xuICByZXR1cm5TdGF0ZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIGB0cnVlYCwgcHJvY2VzcyB0aGUgaW5wdXQgc2VxdWVuY2UgYmFja3dhcmRzIGFuZCByZXR1cm4gdGhlIHJldmVyc2VkXG4gICAqIHNlcXVlbmNlIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIGdvQmFja3dhcmRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSWYgYHRydWVgLCB0aGUgbGFzdCBzdGF0ZSBmb3IgZWFjaCBzYW1wbGUgYXQgaW5kZXggaSBpbiBhIGJhdGNoIHdpbGwgYmVcbiAgICogdXNlZCBhcyBpbml0aWFsIHN0YXRlIG9mIHRoZSBzYW1wbGUgb2YgaW5kZXggaSBpbiB0aGUgZm9sbG93aW5nIGJhdGNoXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICpcbiAgICogWW91IGNhbiBzZXQgUk5OIGxheWVycyB0byBiZSBcInN0YXRlZnVsXCIsIHdoaWNoIG1lYW5zIHRoYXQgdGhlIHN0YXRlc1xuICAgKiBjb21wdXRlZCBmb3IgdGhlIHNhbXBsZXMgaW4gb25lIGJhdGNoIHdpbGwgYmUgcmV1c2VkIGFzIGluaXRpYWwgc3RhdGVzXG4gICAqIGZvciB0aGUgc2FtcGxlcyBpbiB0aGUgbmV4dCBiYXRjaC4gVGhpcyBhc3N1bWVzIGEgb25lLXRvLW9uZSBtYXBwaW5nXG4gICAqIGJldHdlZW4gc2FtcGxlcyBpbiBkaWZmZXJlbnQgc3VjY2Vzc2l2ZSBiYXRjaGVzLlxuICAgKlxuICAgKiBUbyBlbmFibGUgXCJzdGF0ZWZ1bG5lc3NcIjpcbiAgICogICAtIHNwZWNpZnkgYHN0YXRlZnVsOiB0cnVlYCBpbiB0aGUgbGF5ZXIgY29uc3RydWN0b3IuXG4gICAqICAgLSBzcGVjaWZ5IGEgZml4ZWQgYmF0Y2ggc2l6ZSBmb3IgeW91ciBtb2RlbCwgYnkgcGFzc2luZ1xuICAgKiAgICAgLSBpZiBzZXF1ZW50aWFsIG1vZGVsOlxuICAgKiAgICAgICBgYmF0Y2hJbnB1dFNoYXBlOiBbLi4uXWAgdG8gdGhlIGZpcnN0IGxheWVyIGluIHlvdXIgbW9kZWwuXG4gICAqICAgICAtIGVsc2UgZm9yIGZ1bmN0aW9uYWwgbW9kZWwgd2l0aCAxIG9yIG1vcmUgSW5wdXQgbGF5ZXJzOlxuICAgKiAgICAgICBgYmF0Y2hTaGFwZTogWy4uLl1gIHRvIGFsbCB0aGUgZmlyc3QgbGF5ZXJzIGluIHlvdXIgbW9kZWwuXG4gICAqICAgICBUaGlzIGlzIHRoZSBleHBlY3RlZCBzaGFwZSBvZiB5b3VyIGlucHV0c1xuICAgKiAgICAgKmluY2x1ZGluZyB0aGUgYmF0Y2ggc2l6ZSouXG4gICAqICAgICBJdCBzaG91bGQgYmUgYSB0dXBsZSBvZiBpbnRlZ2VycywgZS5nLiwgYFszMiwgMTAsIDEwMF1gLlxuICAgKiAgIC0gc3BlY2lmeSBgc2h1ZmZsZTogZmFsc2VgIHdoZW4gY2FsbGluZyBgTGF5ZXJzTW9kZWwuZml0KClgLlxuICAgKlxuICAgKiBUbyByZXNldCB0aGUgc3RhdGUgb2YgeW91ciBtb2RlbCwgY2FsbCBgcmVzZXRTdGF0ZXMoKWAgb24gZWl0aGVyIHRoZVxuICAgKiBzcGVjaWZpYyBsYXllciBvciBvbiB0aGUgZW50aXJlIG1vZGVsLlxuICAgKi9cbiAgc3RhdGVmdWw/OiBib29sZWFuO1xuICAvLyBUT0RPKGNhaXMpOiBFeHBsb3JlIHdoZXRoZXIgd2UgY2FuIHdhcm4gdXNlcnMgd2hlbiB0aGV5IGZhaWwgdG8gc2V0XG4gIC8vICAgYHNodWZmbGU6IGZhbHNlYCB3aGVuIHRyYWluaW5nIGEgbW9kZWwgY29uc2lzdGluZyBvZiBzdGF0ZWZ1bCBSTk5zXG4gIC8vICAgYW5kIGFueSBzdGF0ZWZ1bCBMYXllcnMgaW4gZ2VuZXJhbC5cblxuICAvKipcbiAgICogSWYgYHRydWVgLCB0aGUgbmV0d29yayB3aWxsIGJlIHVucm9sbGVkLCBlbHNlIGEgc3ltYm9saWMgbG9vcCB3aWxsIGJlXG4gICAqIHVzZWQuIFVucm9sbGluZyBjYW4gc3BlZWQgdXAgYSBSTk4sIGFsdGhvdWdoIGl0IHRlbmRzIHRvIGJlIG1vcmVcbiAgICogbWVtb3J5LWludGVuc2l2ZS4gVW5yb2xsaW5nIGlzIG9ubHkgc3VpdGFibGUgZm9yIHNob3J0IHNlcXVlbmNlcyAoZGVmYXVsdDpcbiAgICogYGZhbHNlYCkuXG4gICAqIFBvcnRpbmcgTm90ZTogdGZqcy1sYXllcnMgaGFzIGFuIGltcGVyYXRpdmUgYmFja2VuZC4gUk5OcyBhcmUgZXhlY3V0ZWQgd2l0aFxuICAgKiAgIG5vcm1hbCBUeXBlU2NyaXB0IGNvbnRyb2wgZmxvdy4gSGVuY2UgdGhpcyBwcm9wZXJ0eSBpcyBpbmFwcGxpY2FibGUgYW5kXG4gICAqICAgaWdub3JlZCBpbiB0ZmpzLWxheWVycy5cbiAgICovXG4gIHVucm9sbD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIERpbWVuc2lvbmFsaXR5IG9mIHRoZSBpbnB1dCAoaW50ZWdlcikuXG4gICAqICAgVGhpcyBvcHRpb24gKG9yIGFsdGVybmF0aXZlbHksIHRoZSBvcHRpb24gYGlucHV0U2hhcGVgKSBpcyByZXF1aXJlZCB3aGVuXG4gICAqICAgdGhpcyBsYXllciBpcyB1c2VkIGFzIHRoZSBmaXJzdCBsYXllciBpbiBhIG1vZGVsLlxuICAgKi9cbiAgaW5wdXREaW0/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIExlbmd0aCBvZiB0aGUgaW5wdXQgc2VxdWVuY2VzLCB0byBiZSBzcGVjaWZpZWQgd2hlbiBpdCBpcyBjb25zdGFudC5cbiAgICogVGhpcyBhcmd1bWVudCBpcyByZXF1aXJlZCBpZiB5b3UgYXJlIGdvaW5nIHRvIGNvbm5lY3QgYEZsYXR0ZW5gIHRoZW5cbiAgICogYERlbnNlYCBsYXllcnMgdXBzdHJlYW0gKHdpdGhvdXQgaXQsIHRoZSBzaGFwZSBvZiB0aGUgZGVuc2Ugb3V0cHV0cyBjYW5ub3RcbiAgICogYmUgY29tcHV0ZWQpLiBOb3RlIHRoYXQgaWYgdGhlIHJlY3VycmVudCBsYXllciBpcyBub3QgdGhlIGZpcnN0IGxheWVyIGluXG4gICAqIHlvdXIgbW9kZWwsIHlvdSB3b3VsZCBuZWVkIHRvIHNwZWNpZnkgdGhlIGlucHV0IGxlbmd0aCBhdCB0aGUgbGV2ZWwgb2YgdGhlXG4gICAqIGZpcnN0IGxheWVyIChlLmcuLCB2aWEgdGhlIGBpbnB1dFNoYXBlYCBvcHRpb24pLlxuICAgKi9cbiAgaW5wdXRMZW5ndGg/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBSTk4gZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ1JOTic7XG4gIHB1YmxpYyByZWFkb25seSBjZWxsOiBSTk5DZWxsO1xuICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuU2VxdWVuY2VzOiBib29sZWFuO1xuICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuU3RhdGU6IGJvb2xlYW47XG4gIHB1YmxpYyByZWFkb25seSBnb0JhY2t3YXJkczogYm9vbGVhbjtcbiAgcHVibGljIHJlYWRvbmx5IHVucm9sbDogYm9vbGVhbjtcblxuICBwdWJsaWMgc3RhdGVTcGVjOiBJbnB1dFNwZWNbXTtcbiAgcHJvdGVjdGVkIHN0YXRlc186IFRlbnNvcltdO1xuXG4gIC8vIE5PVEUoY2Fpcyk6IEZvciBzdGF0ZWZ1bCBSTk5zLCB0aGUgb2xkIHN0YXRlcyBjYW5ub3QgYmUgZGlzcG9zZWQgcmlnaHRcbiAgLy8gYXdheSB3aGVuIG5ldyBzdGF0ZXMgYXJlIHNldCwgYmVjYXVzZSB0aGUgb2xkIHN0YXRlcyBtYXkgbmVlZCB0byBiZSB1c2VkXG4gIC8vIGxhdGVyIGZvciBiYWNrcHJvcGFnYXRpb24gdGhyb3VnaCB0aW1lIChCUFRUKSBhbmQgb3RoZXIgcHVycG9zZXMuIFNvIHdlXG4gIC8vIGtlZXAgdGhlbSBoZXJlIGZvciBmaW5hbCBkaXNwb3NhbCB3aGVuIHRoZSBzdGF0ZSBpcyByZXNldCBjb21wbGV0ZWx5XG4gIC8vIChpLmUuLCB0aHJvdWdoIG5vLWFyZyBjYWxsIHRvIGByZXNldFN0YXRlcygpYCkuXG4gIHByb3RlY3RlZCBrZXB0U3RhdGVzOiBUZW5zb3JbXVtdO1xuXG4gIHByaXZhdGUgbnVtQ29uc3RhbnRzOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYXJnczogUk5OTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgbGV0IGNlbGw6IFJOTkNlbGw7XG4gICAgaWYgKGFyZ3MuY2VsbCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnY2VsbCBwcm9wZXJ0eSBpcyBtaXNzaW5nIGZvciB0aGUgY29uc3RydWN0b3Igb2YgUk5OLicpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhcmdzLmNlbGwpKSB7XG4gICAgICBjZWxsID0gbmV3IFN0YWNrZWRSTk5DZWxscyh7Y2VsbHM6IGFyZ3MuY2VsbH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjZWxsID0gYXJncy5jZWxsO1xuICAgIH1cbiAgICBpZiAoY2VsbC5zdGF0ZVNpemUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ1RoZSBSTk4gY2VsbCBzaG91bGQgaGF2ZSBhbiBhdHRyaWJ1dGUgYHN0YXRlU2l6ZWAgKHR1cGxlIG9mICcgK1xuICAgICAgICAgICdpbnRlZ2Vycywgb25lIGludGVnZXIgcGVyIFJOTiBzdGF0ZSkuJyk7XG4gICAgfVxuICAgIHRoaXMuY2VsbCA9IGNlbGw7XG4gICAgdGhpcy5yZXR1cm5TZXF1ZW5jZXMgPVxuICAgICAgICBhcmdzLnJldHVyblNlcXVlbmNlcyA9PSBudWxsID8gZmFsc2UgOiBhcmdzLnJldHVyblNlcXVlbmNlcztcbiAgICB0aGlzLnJldHVyblN0YXRlID0gYXJncy5yZXR1cm5TdGF0ZSA9PSBudWxsID8gZmFsc2UgOiBhcmdzLnJldHVyblN0YXRlO1xuICAgIHRoaXMuZ29CYWNrd2FyZHMgPSBhcmdzLmdvQmFja3dhcmRzID09IG51bGwgPyBmYWxzZSA6IGFyZ3MuZ29CYWNrd2FyZHM7XG4gICAgdGhpcy5fc3RhdGVmdWwgPSBhcmdzLnN0YXRlZnVsID09IG51bGwgPyBmYWxzZSA6IGFyZ3Muc3RhdGVmdWw7XG4gICAgdGhpcy51bnJvbGwgPSBhcmdzLnVucm9sbCA9PSBudWxsID8gZmFsc2UgOiBhcmdzLnVucm9sbDtcblxuICAgIHRoaXMuc3VwcG9ydHNNYXNraW5nID0gdHJ1ZTtcbiAgICB0aGlzLmlucHV0U3BlYyA9IFtuZXcgSW5wdXRTcGVjKHtuZGltOiAzfSldO1xuICAgIHRoaXMuc3RhdGVTcGVjID0gbnVsbDtcbiAgICB0aGlzLnN0YXRlc18gPSBudWxsO1xuICAgIC8vIFRPRE8oY2Fpcyk6IEFkZCBjb25zdGFudHNTcGVjIGFuZCBudW1Db25zdGFudHMuXG4gICAgdGhpcy5udW1Db25zdGFudHMgPSBudWxsO1xuICAgIC8vIFRPRE8oY2Fpcyk6IExvb2sgaW50byB0aGUgdXNlIG9mIGluaXRpYWxfc3RhdGUgaW4gdGhlIGt3YXJncyBvZiB0aGVcbiAgICAvLyAgIGNvbnN0cnVjdG9yLlxuXG4gICAgdGhpcy5rZXB0U3RhdGVzID0gW107XG4gIH1cblxuICAvLyBQb3J0aW5nIE5vdGU6IFRoaXMgaXMgdGhlIGVxdWl2YWxlbnQgb2YgYFJOTi5zdGF0ZXNgIHByb3BlcnR5IGdldHRlciBpblxuICAvLyAgIFB5S2VyYXMuXG4gIGdldFN0YXRlcygpOiBUZW5zb3JbXSB7XG4gICAgaWYgKHRoaXMuc3RhdGVzXyA9PSBudWxsKSB7XG4gICAgICBjb25zdCBudW1TdGF0ZXMgPVxuICAgICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5jZWxsLnN0YXRlU2l6ZSkgPyB0aGlzLmNlbGwuc3RhdGVTaXplLmxlbmd0aCA6IDE7XG4gICAgICByZXR1cm4gbWF0aF91dGlscy5yYW5nZSgwLCBudW1TdGF0ZXMpLm1hcCh4ID0+IG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZXNfO1xuICAgIH1cbiAgfVxuXG4gIC8vIFBvcnRpbmcgTm90ZTogVGhpcyBpcyB0aGUgZXF1aXZhbGVudCBvZiB0aGUgYFJOTi5zdGF0ZXNgIHByb3BlcnR5IHNldHRlciBpblxuICAvLyAgIFB5S2VyYXMuXG4gIHNldFN0YXRlcyhzdGF0ZXM6IFRlbnNvcltdKTogdm9pZCB7XG4gICAgdGhpcy5zdGF0ZXNfID0gc3RhdGVzO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICBpZiAoaXNBcnJheU9mU2hhcGVzKGlucHV0U2hhcGUpKSB7XG4gICAgICBpbnB1dFNoYXBlID0gKGlucHV0U2hhcGUgYXMgU2hhcGVbXSlbMF07XG4gICAgfVxuICAgIGlucHV0U2hhcGUgPSBpbnB1dFNoYXBlIGFzIFNoYXBlO1xuXG4gICAgLy8gVE9ETyhjYWlzKTogUmVtb3ZlIHRoZSBjYXN0aW5nIG9uY2Ugc3RhY2tlZCBSTk4gY2VsbHMgYmVjb21lIHN1cHBvcnRlZC5cbiAgICBsZXQgc3RhdGVTaXplID0gdGhpcy5jZWxsLnN0YXRlU2l6ZTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3RhdGVTaXplKSkge1xuICAgICAgc3RhdGVTaXplID0gW3N0YXRlU2l6ZV07XG4gICAgfVxuICAgIGNvbnN0IG91dHB1dERpbSA9IHN0YXRlU2l6ZVswXTtcbiAgICBsZXQgb3V0cHV0U2hhcGU6IFNoYXBlfFNoYXBlW107XG4gICAgaWYgKHRoaXMucmV0dXJuU2VxdWVuY2VzKSB7XG4gICAgICBvdXRwdXRTaGFwZSA9IFtpbnB1dFNoYXBlWzBdLCBpbnB1dFNoYXBlWzFdLCBvdXRwdXREaW1dO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXRTaGFwZSA9IFtpbnB1dFNoYXBlWzBdLCBvdXRwdXREaW1dO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJldHVyblN0YXRlKSB7XG4gICAgICBjb25zdCBzdGF0ZVNoYXBlOiBTaGFwZVtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGRpbSBvZiBzdGF0ZVNpemUpIHtcbiAgICAgICAgc3RhdGVTaGFwZS5wdXNoKFtpbnB1dFNoYXBlWzBdLCBkaW1dKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbb3V0cHV0U2hhcGVdLmNvbmNhdChzdGF0ZVNoYXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG91dHB1dFNoYXBlO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVNYXNrKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBtYXNrPzogVGVuc29yfFRlbnNvcltdKTogVGVuc29yXG4gICAgICB8VGVuc29yW10ge1xuICAgIHJldHVybiB0ZmMudGlkeSgoKSA9PiB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShtYXNrKSkge1xuICAgICAgICBtYXNrID0gbWFza1swXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG91dHB1dE1hc2sgPSB0aGlzLnJldHVyblNlcXVlbmNlcyA/IG1hc2sgOiBudWxsO1xuXG4gICAgICBpZiAodGhpcy5yZXR1cm5TdGF0ZSkge1xuICAgICAgICBjb25zdCBzdGF0ZU1hc2sgPSB0aGlzLnN0YXRlcy5tYXAocyA9PiBudWxsKTtcbiAgICAgICAgcmV0dXJuIFtvdXRwdXRNYXNrXS5jb25jYXQoc3RhdGVNYXNrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvdXRwdXRNYXNrO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudCBzdGF0ZSB0ZW5zb3JzIG9mIHRoZSBSTk4uXG4gICAqXG4gICAqIElmIHRoZSBzdGF0ZSBoYXNuJ3QgYmVlbiBzZXQsIHJldHVybiBhbiBhcnJheSBvZiBgbnVsbGBzIG9mIHRoZSBjb3JyZWN0XG4gICAqIGxlbmd0aC5cbiAgICovXG4gIGdldCBzdGF0ZXMoKTogVGVuc29yW10ge1xuICAgIGlmICh0aGlzLnN0YXRlc18gPT0gbnVsbCkge1xuICAgICAgY29uc3QgbnVtU3RhdGVzID1cbiAgICAgICAgICBBcnJheS5pc0FycmF5KHRoaXMuY2VsbC5zdGF0ZVNpemUpID8gdGhpcy5jZWxsLnN0YXRlU2l6ZS5sZW5ndGggOiAxO1xuICAgICAgY29uc3Qgb3V0cHV0OiBUZW5zb3JbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1TdGF0ZXM7ICsraSkge1xuICAgICAgICBvdXRwdXQucHVzaChudWxsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlc187XG4gICAgfVxuICB9XG5cbiAgc2V0IHN0YXRlcyhzOiBUZW5zb3JbXSkge1xuICAgIHRoaXMuc3RhdGVzXyA9IHM7XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIC8vIE5vdGUgaW5wdXRTaGFwZSB3aWxsIGJlIGFuIEFycmF5IG9mIFNoYXBlcyBvZiBpbml0aWFsIHN0YXRlcyBhbmRcbiAgICAvLyBjb25zdGFudHMgaWYgdGhlc2UgYXJlIHBhc3NlZCBpbiBhcHBseSgpLlxuICAgIGNvbnN0IGNvbnN0YW50U2hhcGU6IFNoYXBlW10gPSBudWxsO1xuICAgIGlmICh0aGlzLm51bUNvbnN0YW50cyAhPSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgICAnQ29uc3RhbnRzIHN1cHBvcnQgaXMgbm90IGltcGxlbWVudGVkIGluIFJOTiB5ZXQuJyk7XG4gICAgfVxuXG4gICAgaWYgKGlzQXJyYXlPZlNoYXBlcyhpbnB1dFNoYXBlKSkge1xuICAgICAgaW5wdXRTaGFwZSA9IChpbnB1dFNoYXBlIGFzIFNoYXBlW10pWzBdO1xuICAgIH1cbiAgICBpbnB1dFNoYXBlID0gaW5wdXRTaGFwZSBhcyBTaGFwZTtcblxuICAgIGNvbnN0IGJhdGNoU2l6ZTogbnVtYmVyID0gdGhpcy5zdGF0ZWZ1bCA/IGlucHV0U2hhcGVbMF0gOiBudWxsO1xuICAgIGNvbnN0IGlucHV0RGltID0gaW5wdXRTaGFwZS5zbGljZSgyKTtcbiAgICB0aGlzLmlucHV0U3BlY1swXSA9IG5ldyBJbnB1dFNwZWMoe3NoYXBlOiBbYmF0Y2hTaXplLCBudWxsLCAuLi5pbnB1dERpbV19KTtcblxuICAgIC8vIEFsbG93IGNlbGwgKGlmIFJOTkNlbGwgTGF5ZXIpIHRvIGJ1aWxkIGJlZm9yZSB3ZSBzZXQgb3IgdmFsaWRhdGVcbiAgICAvLyBzdGF0ZVNwZWMuXG4gICAgY29uc3Qgc3RlcElucHV0U2hhcGUgPSBbaW5wdXRTaGFwZVswXV0uY29uY2F0KGlucHV0U2hhcGUuc2xpY2UoMikpO1xuICAgIGlmIChjb25zdGFudFNoYXBlICE9IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKFxuICAgICAgICAgICdDb25zdGFudHMgc3VwcG9ydCBpcyBub3QgaW1wbGVtZW50ZWQgaW4gUk5OIHlldC4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jZWxsLmJ1aWxkKHN0ZXBJbnB1dFNoYXBlKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgb3IgdmFsaWRhdGUgc3RhdGVTcGVjLlxuICAgIGxldCBzdGF0ZVNpemU6IG51bWJlcltdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuY2VsbC5zdGF0ZVNpemUpKSB7XG4gICAgICBzdGF0ZVNpemUgPSB0aGlzLmNlbGwuc3RhdGVTaXplO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZVNpemUgPSBbdGhpcy5jZWxsLnN0YXRlU2l6ZV07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhdGVTcGVjICE9IG51bGwpIHtcbiAgICAgIGlmICghdXRpbC5hcnJheXNFcXVhbChcbiAgICAgICAgICAgICAgdGhpcy5zdGF0ZVNwZWMubWFwKHNwZWMgPT4gc3BlYy5zaGFwZVtzcGVjLnNoYXBlLmxlbmd0aCAtIDFdKSxcbiAgICAgICAgICAgICAgc3RhdGVTaXplKSkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgIGBBbiBpbml0aWFsU3RhdGUgd2FzIHBhc3NlZCB0aGF0IGlzIG5vdCBjb21wYXRpYmxlIHdpdGggYCArXG4gICAgICAgICAgICBgY2VsbC5zdGF0ZVNpemUuIFJlY2VpdmVkIHN0YXRlU3BlYz0ke3RoaXMuc3RhdGVTcGVjfTsgYCArXG4gICAgICAgICAgICBgSG93ZXZlciBjZWxsLnN0YXRlU2l6ZSBpcyAke3RoaXMuY2VsbC5zdGF0ZVNpemV9YCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGVTcGVjID1cbiAgICAgICAgICBzdGF0ZVNpemUubWFwKGRpbSA9PiBuZXcgSW5wdXRTcGVjKHtzaGFwZTogW251bGwsIGRpbV19KSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0YXRlZnVsKSB7XG4gICAgICB0aGlzLnJlc2V0U3RhdGVzKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0IHRoZSBzdGF0ZSB0ZW5zb3JzIG9mIHRoZSBSTk4uXG4gICAqXG4gICAqIElmIHRoZSBgc3RhdGVzYCBhcmd1bWVudCBpcyBgdW5kZWZpbmVkYCBvciBgbnVsbGAsIHdpbGwgc2V0IHRoZVxuICAgKiBzdGF0ZSB0ZW5zb3Iocykgb2YgdGhlIFJOTiB0byBhbGwtemVybyB0ZW5zb3JzIG9mIHRoZSBhcHByb3ByaWF0ZVxuICAgKiBzaGFwZShzKS5cbiAgICpcbiAgICogSWYgYHN0YXRlc2AgaXMgcHJvdmlkZWQsIHdpbGwgc2V0IHRoZSBzdGF0ZSB0ZW5zb3JzIG9mIHRoZSBSTk4gdG8gaXRzXG4gICAqIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVzIE9wdGlvbmFsIGV4dGVybmFsbHktcHJvdmlkZWQgaW5pdGlhbCBzdGF0ZXMuXG4gICAqIEBwYXJhbSB0cmFpbmluZyBXaGV0aGVyIHRoaXMgY2FsbCBpcyBkb25lIGR1cmluZyB0cmFpbmluZy4gRm9yIHN0YXRlZnVsXG4gICAqICAgUk5OcywgdGhpcyBhZmZlY3RzIHdoZXRoZXIgdGhlIG9sZCBzdGF0ZXMgYXJlIGtlcHQgb3IgZGlzY2FyZGVkLiBJblxuICAgKiAgIHBhcnRpY3VsYXIsIGlmIGB0cmFpbmluZ2AgaXMgYHRydWVgLCB0aGUgb2xkIHN0YXRlcyB3aWxsIGJlIGtlcHQgc29cbiAgICogICB0aGF0IHN1YnNlcXVlbnQgYmFja3Byb3BnYXRhaW9uIHRocm91Z2ggdGltZSAoQlBUVCkgbWF5IHdvcmsgcHJvcGVybHkuXG4gICAqICAgRWxzZSwgdGhlIG9sZCBzdGF0ZXMgd2lsbCBiZSBkaXNjYXJkZWQuXG4gICAqL1xuICBvdmVycmlkZSByZXNldFN0YXRlcyhzdGF0ZXM/OiBUZW5zb3J8VGVuc29yW10sIHRyYWluaW5nID0gZmFsc2UpOiB2b2lkIHtcbiAgICB0aWR5KCgpID0+IHtcbiAgICAgIGlmICghdGhpcy5zdGF0ZWZ1bCkge1xuICAgICAgICB0aHJvdyBuZXcgQXR0cmlidXRlRXJyb3IoXG4gICAgICAgICAgICAnQ2Fubm90IGNhbGwgcmVzZXRTdGF0ZXMoKSBvbiBhbiBSTk4gTGF5ZXIgdGhhdCBpcyBub3Qgc3RhdGVmdWwuJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBiYXRjaFNpemUgPSB0aGlzLmlucHV0U3BlY1swXS5zaGFwZVswXTtcbiAgICAgIGlmIChiYXRjaFNpemUgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICdJZiBhbiBSTk4gaXMgc3RhdGVmdWwsIGl0IG5lZWRzIHRvIGtub3cgaXRzIGJhdGNoIHNpemUuIFNwZWNpZnkgJyArXG4gICAgICAgICAgICAndGhlIGJhdGNoIHNpemUgb2YgeW91ciBpbnB1dCB0ZW5zb3JzOiBcXG4nICtcbiAgICAgICAgICAgICctIElmIHVzaW5nIGEgU2VxdWVudGlhbCBtb2RlbCwgc3BlY2lmeSB0aGUgYmF0Y2ggc2l6ZSBieSAnICtcbiAgICAgICAgICAgICdwYXNzaW5nIGEgYGJhdGNoSW5wdXRTaGFwZWAgb3B0aW9uIHRvIHlvdXIgZmlyc3QgbGF5ZXIuXFxuJyArXG4gICAgICAgICAgICAnLSBJZiB1c2luZyB0aGUgZnVuY3Rpb25hbCBBUEksIHNwZWNpZnkgdGhlIGJhdGNoIHNpemUgYnkgJyArXG4gICAgICAgICAgICAncGFzc2luZyBhIGBiYXRjaFNoYXBlYCBvcHRpb24gdG8geW91ciBJbnB1dCBsYXllci4nKTtcbiAgICAgIH1cbiAgICAgIC8vIEluaXRpYWxpemUgc3RhdGUgaWYgbnVsbC5cbiAgICAgIGlmICh0aGlzLnN0YXRlc18gPT0gbnVsbCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmNlbGwuc3RhdGVTaXplKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVzXyA9XG4gICAgICAgICAgICAgIHRoaXMuY2VsbC5zdGF0ZVNpemUubWFwKGRpbSA9PiB0ZmMuemVyb3MoW2JhdGNoU2l6ZSwgZGltXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc3RhdGVzXyA9IFt0ZmMuemVyb3MoW2JhdGNoU2l6ZSwgdGhpcy5jZWxsLnN0YXRlU2l6ZV0pXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzdGF0ZXMgPT0gbnVsbCkge1xuICAgICAgICAvLyBEaXNwb3NlIG9sZCBzdGF0ZSB0ZW5zb3JzLlxuICAgICAgICB0ZmMuZGlzcG9zZSh0aGlzLnN0YXRlc18pO1xuICAgICAgICAvLyBGb3Igc3RhdGVmdWwgUk5OcywgZnVsbHkgZGlzcG9zZSBrZXB0IG9sZCBzdGF0ZXMuXG4gICAgICAgIGlmICh0aGlzLmtlcHRTdGF0ZXMgIT0gbnVsbCkge1xuICAgICAgICAgIHRmYy5kaXNwb3NlKHRoaXMua2VwdFN0YXRlcyk7XG4gICAgICAgICAgdGhpcy5rZXB0U3RhdGVzID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmNlbGwuc3RhdGVTaXplKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVzXyA9XG4gICAgICAgICAgICAgIHRoaXMuY2VsbC5zdGF0ZVNpemUubWFwKGRpbSA9PiB0ZmMuemVyb3MoW2JhdGNoU2l6ZSwgZGltXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc3RhdGVzX1swXSA9IHRmYy56ZXJvcyhbYmF0Y2hTaXplLCB0aGlzLmNlbGwuc3RhdGVTaXplXSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShzdGF0ZXMpKSB7XG4gICAgICAgICAgc3RhdGVzID0gW3N0YXRlc107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlcy5sZW5ndGggIT09IHRoaXMuc3RhdGVzXy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICAgYExheWVyICR7dGhpcy5uYW1lfSBleHBlY3RzICR7dGhpcy5zdGF0ZXNfLmxlbmd0aH0gc3RhdGUocyksIGAgK1xuICAgICAgICAgICAgICBgYnV0IGl0IHJlY2VpdmVkICR7c3RhdGVzLmxlbmd0aH0gc3RhdGUgdmFsdWUocykuIElucHV0IGAgK1xuICAgICAgICAgICAgICBgcmVjZWl2ZWQ6ICR7c3RhdGVzfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyYWluaW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgLy8gU3RvcmUgb2xkIHN0YXRlIHRlbnNvcnMgZm9yIGNvbXBsZXRlIGRpc3Bvc2FsIGxhdGVyLCBpLmUuLCBkdXJpbmdcbiAgICAgICAgICAvLyB0aGUgbmV4dCBuby1hcmcgY2FsbCB0byB0aGlzIG1ldGhvZC4gV2UgZG8gbm90IGRpc3Bvc2UgdGhlIG9sZFxuICAgICAgICAgIC8vIHN0YXRlcyBpbW1lZGlhdGVseSBiZWNhdXNlIHRoYXQgQlBUVCAoYW1vbmcgb3RoZXIgdGhpbmdzKSByZXF1aXJlXG4gICAgICAgICAgLy8gdGhlbS5cbiAgICAgICAgICB0aGlzLmtlcHRTdGF0ZXMucHVzaCh0aGlzLnN0YXRlc18uc2xpY2UoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGZjLmRpc3Bvc2UodGhpcy5zdGF0ZXNfKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLnN0YXRlc18ubGVuZ3RoOyArK2luZGV4KSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBzdGF0ZXNbaW5kZXhdO1xuICAgICAgICAgIGNvbnN0IGRpbSA9IEFycmF5LmlzQXJyYXkodGhpcy5jZWxsLnN0YXRlU2l6ZSkgP1xuICAgICAgICAgICAgICB0aGlzLmNlbGwuc3RhdGVTaXplW2luZGV4XSA6XG4gICAgICAgICAgICAgIHRoaXMuY2VsbC5zdGF0ZVNpemU7XG4gICAgICAgICAgY29uc3QgZXhwZWN0ZWRTaGFwZSA9IFtiYXRjaFNpemUsIGRpbV07XG4gICAgICAgICAgaWYgKCF1dGlsLmFycmF5c0VxdWFsKHZhbHVlLnNoYXBlLCBleHBlY3RlZFNoYXBlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAgICAgYFN0YXRlICR7aW5kZXh9IGlzIGluY29tcGF0aWJsZSB3aXRoIGxheWVyICR7dGhpcy5uYW1lfTogYCArXG4gICAgICAgICAgICAgICAgYGV4cGVjdGVkIHNoYXBlPSR7ZXhwZWN0ZWRTaGFwZX0sIHJlY2VpdmVkIHNoYXBlPSR7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnNoYXBlfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnN0YXRlc19baW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuc3RhdGVzXyA9IHRoaXMuc3RhdGVzXy5tYXAoc3RhdGUgPT4gdGZjLmtlZXAoc3RhdGUuY2xvbmUoKSkpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgYXBwbHkoXG4gICAgICBpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcnxTeW1ib2xpY1RlbnNvcltdLFxuICAgICAga3dhcmdzPzogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdfFN5bWJvbGljVGVuc29yfFN5bWJvbGljVGVuc29yW10ge1xuICAgIC8vIFRPRE8oY2Fpcyk6IEZpZ3VyZSBvdXQgd2hldGhlciBpbml0aWFsU3RhdGUgaXMgaW4ga3dhcmdzIG9yIGlucHV0cy5cbiAgICBsZXQgaW5pdGlhbFN0YXRlOiBUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcltdID1cbiAgICAgICAga3dhcmdzID09IG51bGwgPyBudWxsIDoga3dhcmdzWydpbml0aWFsU3RhdGUnXTtcbiAgICBsZXQgY29uc3RhbnRzOiBUZW5zb3JbXXxTeW1ib2xpY1RlbnNvcltdID1cbiAgICAgICAga3dhcmdzID09IG51bGwgPyBudWxsIDoga3dhcmdzWydjb25zdGFudHMnXTtcbiAgICBpZiAoa3dhcmdzID09IG51bGwpIHtcbiAgICAgIGt3YXJncyA9IHt9O1xuICAgIH1cblxuICAgIGNvbnN0IHN0YW5kYXJkaXplZCA9XG4gICAgICAgIHN0YW5kYXJkaXplQXJncyhpbnB1dHMsIGluaXRpYWxTdGF0ZSwgY29uc3RhbnRzLCB0aGlzLm51bUNvbnN0YW50cyk7XG4gICAgaW5wdXRzID0gc3RhbmRhcmRpemVkLmlucHV0cztcbiAgICBpbml0aWFsU3RhdGUgPSBzdGFuZGFyZGl6ZWQuaW5pdGlhbFN0YXRlO1xuICAgIGNvbnN0YW50cyA9IHN0YW5kYXJkaXplZC5jb25zdGFudHM7XG5cbiAgICAvLyBJZiBhbnkgb2YgYGluaXRpYWxfc3RhdGVgIG9yIGBjb25zdGFudHNgIGFyZSBzcGVjaWZpZWQgYW5kIGFyZVxuICAgIC8vIGB0Zi5TeW1ib2xpY1RlbnNvcmBzLCB0aGVuIGFkZCB0aGVtIHRvIHRoZSBpbnB1dHMgYW5kIHRlbXBvcmFyaWx5IG1vZGlmeVxuICAgIC8vIHRoZSBpbnB1dF9zcGVjIHRvIGluY2x1ZGUgdGhlbS5cblxuICAgIGxldCBhZGRpdGlvbmFsSW5wdXRzOiBBcnJheTxUZW5zb3J8U3ltYm9saWNUZW5zb3I+ID0gW107XG4gICAgbGV0IGFkZGl0aW9uYWxTcGVjczogSW5wdXRTcGVjW10gPSBbXTtcbiAgICBpZiAoaW5pdGlhbFN0YXRlICE9IG51bGwpIHtcbiAgICAgIGt3YXJnc1snaW5pdGlhbFN0YXRlJ10gPSBpbml0aWFsU3RhdGU7XG4gICAgICBhZGRpdGlvbmFsSW5wdXRzID0gYWRkaXRpb25hbElucHV0cy5jb25jYXQoaW5pdGlhbFN0YXRlKTtcbiAgICAgIHRoaXMuc3RhdGVTcGVjID0gW107XG4gICAgICBmb3IgKGNvbnN0IHN0YXRlIG9mIGluaXRpYWxTdGF0ZSkge1xuICAgICAgICB0aGlzLnN0YXRlU3BlYy5wdXNoKG5ldyBJbnB1dFNwZWMoe3NoYXBlOiBzdGF0ZS5zaGFwZX0pKTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8oY2Fpcyk6IFVzZSB0aGUgZm9sbG93aW5nIGluc3RlYWQuXG4gICAgICAvLyB0aGlzLnN0YXRlU3BlYyA9IGluaXRpYWxTdGF0ZS5tYXAoc3RhdGUgPT4gbmV3IElucHV0U3BlYyh7c2hhcGU6XG4gICAgICAvLyBzdGF0ZS5zaGFwZX0pKTtcbiAgICAgIGFkZGl0aW9uYWxTcGVjcyA9IGFkZGl0aW9uYWxTcGVjcy5jb25jYXQodGhpcy5zdGF0ZVNwZWMpO1xuICAgIH1cbiAgICBpZiAoY29uc3RhbnRzICE9IG51bGwpIHtcbiAgICAgIGt3YXJnc1snY29uc3RhbnRzJ10gPSBjb25zdGFudHM7XG4gICAgICBhZGRpdGlvbmFsSW5wdXRzID0gYWRkaXRpb25hbElucHV0cy5jb25jYXQoY29uc3RhbnRzKTtcbiAgICAgIC8vIFRPRE8oY2Fpcyk6IEFkZCB0aGlzLmNvbnN0YW50c1NwZWMuXG4gICAgICB0aGlzLm51bUNvbnN0YW50cyA9IGNvbnN0YW50cy5sZW5ndGg7XG4gICAgfVxuXG4gICAgY29uc3QgaXNUZW5zb3IgPSBhZGRpdGlvbmFsSW5wdXRzWzBdIGluc3RhbmNlb2YgU3ltYm9saWNUZW5zb3I7XG4gICAgaWYgKGlzVGVuc29yKSB7XG4gICAgICAvLyBDb21wdXRlIGZ1bGwgaW5wdXQgc3BlYywgaW5jbHVkaW5nIHN0YXRlIGFuZCBjb25zdGFudHMuXG4gICAgICBjb25zdCBmdWxsSW5wdXQgPVxuICAgICAgICAgIFtpbnB1dHNdLmNvbmNhdChhZGRpdGlvbmFsSW5wdXRzKSBhcyBUZW5zb3JbXSB8IFN5bWJvbGljVGVuc29yW107XG4gICAgICBjb25zdCBmdWxsSW5wdXRTcGVjID0gdGhpcy5pbnB1dFNwZWMuY29uY2F0KGFkZGl0aW9uYWxTcGVjcyk7XG4gICAgICAvLyBQZXJmb3JtIHRoZSBjYWxsIHdpdGggdGVtcG9yYXJpbHkgcmVwbGFjZWQgaW5wdXRTcGVjLlxuICAgICAgY29uc3Qgb3JpZ2luYWxJbnB1dFNwZWMgPSB0aGlzLmlucHV0U3BlYztcbiAgICAgIHRoaXMuaW5wdXRTcGVjID0gZnVsbElucHV0U3BlYztcbiAgICAgIGNvbnN0IG91dHB1dCA9IHN1cGVyLmFwcGx5KGZ1bGxJbnB1dCwga3dhcmdzKTtcbiAgICAgIHRoaXMuaW5wdXRTcGVjID0gb3JpZ2luYWxJbnB1dFNwZWM7XG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3VwZXIuYXBwbHkoaW5wdXRzLCBrd2FyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIC8vIElucHV0IHNoYXBlOiBgW3NhbXBsZXMsIHRpbWUgKHBhZGRlZCB3aXRoIHplcm9zKSwgaW5wdXRfZGltXWAuXG4gICAgLy8gTm90ZSB0aGF0IHRoZSAuYnVpbGQoKSBtZXRob2Qgb2Ygc3ViY2xhc3NlcyAqKm11c3QqKiBkZWZpbmVcbiAgICAvLyB0aGlzLmlucHV0U3BlYyBhbmQgdGhpcy5zdGF0ZVNwZWMgb3dpdGggY29tcGxldGUgaW5wdXQgc2hhcGVzLlxuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IG1hc2sgPSBrd2FyZ3MgPT0gbnVsbCA/IG51bGwgOiBrd2FyZ3NbJ21hc2snXSBhcyBUZW5zb3I7XG4gICAgICBjb25zdCB0cmFpbmluZyA9IGt3YXJncyA9PSBudWxsID8gbnVsbCA6IGt3YXJnc1sndHJhaW5pbmcnXTtcbiAgICAgIGxldCBpbml0aWFsU3RhdGU6IFRlbnNvcltdID1cbiAgICAgICAgICBrd2FyZ3MgPT0gbnVsbCA/IG51bGwgOiBrd2FyZ3NbJ2luaXRpYWxTdGF0ZSddO1xuXG4gICAgICBpbnB1dHMgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBpZiAoaW5pdGlhbFN0YXRlID09IG51bGwpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGVmdWwpIHtcbiAgICAgICAgICBpbml0aWFsU3RhdGUgPSB0aGlzLnN0YXRlc187XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaW5pdGlhbFN0YXRlID0gdGhpcy5nZXRJbml0aWFsU3RhdGUoaW5wdXRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBudW1TdGF0ZXMgPVxuICAgICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5jZWxsLnN0YXRlU2l6ZSkgPyB0aGlzLmNlbGwuc3RhdGVTaXplLmxlbmd0aCA6IDE7XG4gICAgICBpZiAoaW5pdGlhbFN0YXRlLmxlbmd0aCAhPT0gbnVtU3RhdGVzKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYFJOTiBMYXllciBoYXMgJHtudW1TdGF0ZXN9IHN0YXRlKHMpIGJ1dCB3YXMgcGFzc2VkIGAgK1xuICAgICAgICAgICAgYCR7aW5pdGlhbFN0YXRlLmxlbmd0aH0gaW5pdGlhbCBzdGF0ZShzKS5gKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnVucm9sbCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAnSWdub3JpbmcgdW5yb2xsID0gdHJ1ZSBmb3IgUk5OIGxheWVyLCBkdWUgdG8gaW1wZXJhdGl2ZSBiYWNrZW5kLicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjZWxsQ2FsbEt3YXJnczogS3dhcmdzID0ge3RyYWluaW5nfTtcblxuICAgICAgLy8gVE9ETyhjYWlzKTogQWRkIHN1cHBvcnQgZm9yIGNvbnN0YW50cy5cbiAgICAgIGNvbnN0IHN0ZXAgPSAoaW5wdXRzOiBUZW5zb3IsIHN0YXRlczogVGVuc29yW10pID0+IHtcbiAgICAgICAgLy8gYGlucHV0c2AgYW5kIGBzdGF0ZXNgIGFyZSBjb25jYXRlbmF0ZWQgdG8gZm9ybSBhIHNpbmdsZSBgQXJyYXlgIG9mXG4gICAgICAgIC8vIGB0Zi5UZW5zb3JgcyBhcyB0aGUgaW5wdXQgdG8gYGNlbGwuY2FsbCgpYC5cbiAgICAgICAgY29uc3Qgb3V0cHV0cyA9XG4gICAgICAgICAgICB0aGlzLmNlbGwuY2FsbChbaW5wdXRzXS5jb25jYXQoc3RhdGVzKSwgY2VsbENhbGxLd2FyZ3MpIGFzIFRlbnNvcltdO1xuICAgICAgICAvLyBNYXJzaGFsbCB0aGUgcmV0dXJuIHZhbHVlIGludG8gb3V0cHV0IGFuZCBuZXcgc3RhdGVzLlxuICAgICAgICByZXR1cm4gW291dHB1dHNbMF0sIG91dHB1dHMuc2xpY2UoMSldIGFzIFtUZW5zb3IsIFRlbnNvcltdXTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFRPRE8oY2Fpcyk6IEFkZCBzdXBwb3J0IGZvciBjb25zdGFudHMuXG5cbiAgICAgIGNvbnN0IHJubk91dHB1dHMgPVxuICAgICAgICAgIHJubihzdGVwLCBpbnB1dHMsIGluaXRpYWxTdGF0ZSwgdGhpcy5nb0JhY2t3YXJkcywgbWFzaywgbnVsbCxcbiAgICAgICAgICAgICAgdGhpcy51bnJvbGwsIHRoaXMucmV0dXJuU2VxdWVuY2VzKTtcbiAgICAgIGNvbnN0IGxhc3RPdXRwdXQgPSBybm5PdXRwdXRzWzBdO1xuICAgICAgY29uc3Qgb3V0cHV0cyA9IHJubk91dHB1dHNbMV07XG4gICAgICBjb25zdCBzdGF0ZXMgPSBybm5PdXRwdXRzWzJdO1xuXG4gICAgICBpZiAodGhpcy5zdGF0ZWZ1bCkge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGVzKHN0YXRlcywgdHJhaW5pbmcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvdXRwdXQgPSB0aGlzLnJldHVyblNlcXVlbmNlcyA/IG91dHB1dHMgOiBsYXN0T3V0cHV0O1xuXG4gICAgICAvLyBUT0RPKGNhaXMpOiBQcm9wZXJ0eSBzZXQgbGVhcm5pbmcgcGhhc2UgZmxhZy5cblxuICAgICAgaWYgKHRoaXMucmV0dXJuU3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIFtvdXRwdXRdLmNvbmNhdChzdGF0ZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdldEluaXRpYWxTdGF0ZShpbnB1dHM6IFRlbnNvcik6IFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICAvLyBCdWlsZCBhbiBhbGwtemVybyB0ZW5zb3Igb2Ygc2hhcGUgW3NhbXBsZXMsIG91dHB1dERpbV0uXG4gICAgICAvLyBbU2FtcGxlcywgdGltZVN0ZXBzLCBpbnB1dERpbV0uXG4gICAgICBsZXQgaW5pdGlhbFN0YXRlID0gdGZjLnplcm9zKGlucHV0cy5zaGFwZSk7XG4gICAgICAvLyBbU2FtcGxlc10uXG4gICAgICBpbml0aWFsU3RhdGUgPSB0ZmMuc3VtKGluaXRpYWxTdGF0ZSwgWzEsIDJdKTtcbiAgICAgIGluaXRpYWxTdGF0ZSA9IEsuZXhwYW5kRGltcyhpbml0aWFsU3RhdGUpOyAgLy8gW1NhbXBsZXMsIDFdLlxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmNlbGwuc3RhdGVTaXplKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jZWxsLnN0YXRlU2l6ZS5tYXAoXG4gICAgICAgICAgICBkaW0gPT4gZGltID4gMSA/IEsudGlsZShpbml0aWFsU3RhdGUsIFsxLCBkaW1dKSA6IGluaXRpYWxTdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5jZWxsLnN0YXRlU2l6ZSA+IDEgP1xuICAgICAgICAgICAgW0sudGlsZShpbml0aWFsU3RhdGUsIFsxLCB0aGlzLmNlbGwuc3RhdGVTaXplXSldIDpcbiAgICAgICAgICAgIFtpbml0aWFsU3RhdGVdO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IHRyYWluYWJsZVdlaWdodHMoKTogTGF5ZXJWYXJpYWJsZVtdIHtcbiAgICBpZiAoIXRoaXMudHJhaW5hYmxlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIC8vIFBvcnRpbmcgTm90ZTogSW4gVHlwZVNjcmlwdCwgYHRoaXNgIGlzIGFsd2F5cyBhbiBpbnN0YW5jZSBvZiBgTGF5ZXJgLlxuICAgIHJldHVybiB0aGlzLmNlbGwudHJhaW5hYmxlV2VpZ2h0cztcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCBub25UcmFpbmFibGVXZWlnaHRzKCk6IExheWVyVmFyaWFibGVbXSB7XG4gICAgLy8gUG9ydGluZyBOb3RlOiBJbiBUeXBlU2NyaXB0LCBgdGhpc2AgaXMgYWx3YXlzIGFuIGluc3RhbmNlIG9mIGBMYXllcmAuXG4gICAgaWYgKCF0aGlzLnRyYWluYWJsZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2VsbC53ZWlnaHRzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jZWxsLm5vblRyYWluYWJsZVdlaWdodHM7XG4gIH1cblxuICBvdmVycmlkZSBzZXRGYXN0V2VpZ2h0SW5pdER1cmluZ0J1aWxkKHZhbHVlOiBib29sZWFuKSB7XG4gICAgc3VwZXIuc2V0RmFzdFdlaWdodEluaXREdXJpbmdCdWlsZCh2YWx1ZSk7XG4gICAgaWYgKHRoaXMuY2VsbCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmNlbGwuc2V0RmFzdFdlaWdodEluaXREdXJpbmdCdWlsZCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuXG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICByZXR1cm5TZXF1ZW5jZXM6IHRoaXMucmV0dXJuU2VxdWVuY2VzLFxuICAgICAgcmV0dXJuU3RhdGU6IHRoaXMucmV0dXJuU3RhdGUsXG4gICAgICBnb0JhY2t3YXJkczogdGhpcy5nb0JhY2t3YXJkcyxcbiAgICAgIHN0YXRlZnVsOiB0aGlzLnN0YXRlZnVsLFxuICAgICAgdW5yb2xsOiB0aGlzLnVucm9sbCxcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMubnVtQ29uc3RhbnRzICE9IG51bGwpIHtcbiAgICAgIGNvbmZpZ1snbnVtQ29uc3RhbnRzJ10gPSB0aGlzLm51bUNvbnN0YW50cztcbiAgICB9XG5cbiAgICBjb25zdCBjZWxsQ29uZmlnID0gdGhpcy5jZWxsLmdldENvbmZpZygpO1xuXG4gICAgaWYgKHRoaXMuZ2V0Q2xhc3NOYW1lKCkgPT09IFJOTi5jbGFzc05hbWUpIHtcbiAgICAgIGNvbmZpZ1snY2VsbCddID0ge1xuICAgICAgICAnY2xhc3NOYW1lJzogdGhpcy5jZWxsLmdldENsYXNzTmFtZSgpLFxuICAgICAgICAnY29uZmlnJzogY2VsbENvbmZpZyxcbiAgICAgIH0gYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0VmFsdWU7XG4gICAgfVxuXG4gICAgLy8gdGhpcyBvcmRlciBpcyBuZWNlc3NhcnksIHRvIHByZXZlbnQgY2VsbCBuYW1lIGZyb20gcmVwbGFjaW5nIGxheWVyIG5hbWVcbiAgICByZXR1cm4gey4uLmNlbGxDb25maWcsIC4uLmJhc2VDb25maWcsIC4uLmNvbmZpZ307XG4gIH1cblxuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGZyb21Db25maWc8VCBleHRlbmRzIHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlPihcbiAgICAgIGNsczogc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGVDb25zdHJ1Y3RvcjxUPixcbiAgICAgIGNvbmZpZzogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0LFxuICAgICAgY3VzdG9tT2JqZWN0cyA9IHt9IGFzIHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCk6IFQge1xuICAgIGNvbnN0IGNlbGxDb25maWcgPSBjb25maWdbJ2NlbGwnXSBhcyBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Q7XG4gICAgY29uc3QgY2VsbCA9IGRlc2VyaWFsaXplKGNlbGxDb25maWcsIGN1c3RvbU9iamVjdHMpIGFzIFJOTkNlbGw7XG4gICAgcmV0dXJuIG5ldyBjbHMoT2JqZWN0LmFzc2lnbihjb25maWcsIHtjZWxsfSkpO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUk5OKTtcblxuLy8gUG9ydGluZyBOb3RlOiBUaGlzIGlzIGEgY29tbW9uIHBhcmVudCBjbGFzcyBmb3IgUk5OIGNlbGxzLiBUaGVyZSBpcyBub1xuLy8gZXF1aXZhbGVudCBvZiB0aGlzIGluIFB5S2VyYXMuIEhhdmluZyBhIGNvbW1vbiBwYXJlbnQgY2xhc3MgZm9yZ29lcyB0aGVcbi8vICBuZWVkIGZvciBgaGFzX2F0dHIoY2VsbCwgLi4uKWAgY2hlY2tzIG9yIGl0cyBUeXBlU2NyaXB0IGVxdWl2YWxlbnQuXG4vKipcbiAqIEFuIFJOTkNlbGwgbGF5ZXIuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ0xheWVycycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJOTkNlbGwgZXh0ZW5kcyBMYXllciB7XG4gIC8qKlxuICAgKiBTaXplKHMpIG9mIHRoZSBzdGF0ZXMuXG4gICAqIEZvciBSTk4gY2VsbHMgd2l0aCBvbmx5IGEgc2luZ2xlIHN0YXRlLCB0aGlzIGlzIGEgc2luZ2xlIGludGVnZXIuXG4gICAqL1xuICAvLyBTZWVcbiAgLy8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcmVsZWFzZS1ub3Rlcy90eXBlc2NyaXB0LTQtMC5odG1sI3Byb3BlcnRpZXMtb3ZlcnJpZGluZy1hY2Nlc3NvcnMtYW5kLXZpY2UtdmVyc2EtaXMtYW4tZXJyb3JcbiAgcHVibGljIGFic3RyYWN0IHN0YXRlU2l6ZTogbnVtYmVyfG51bWJlcltdO1xuICBwdWJsaWMgZHJvcG91dE1hc2s6IFRlbnNvcnxUZW5zb3JbXTtcbiAgcHVibGljIHJlY3VycmVudERyb3BvdXRNYXNrOiBUZW5zb3J8VGVuc29yW107XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBTaW1wbGVSTk5DZWxsTGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIHVuaXRzOiBQb3NpdGl2ZSBpbnRlZ2VyLCBkaW1lbnNpb25hbGl0eSBvZiB0aGUgb3V0cHV0IHNwYWNlLlxuICAgKi9cbiAgdW5pdHM6IG51bWJlcjtcblxuICAvKipcbiAgICogQWN0aXZhdGlvbiBmdW5jdGlvbiB0byB1c2UuXG4gICAqIERlZmF1bHQ6IGh5cGVyYm9saWMgdGFuZ2VudCAoJ3RhbmgnKS5cbiAgICogSWYgeW91IHBhc3MgYG51bGxgLCAgJ2xpbmVhcicgYWN0aXZhdGlvbiB3aWxsIGJlIGFwcGxpZWQuXG4gICAqL1xuICBhY3RpdmF0aW9uPzogQWN0aXZhdGlvbklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGxheWVyIHVzZXMgYSBiaWFzIHZlY3Rvci5cbiAgICovXG4gIHVzZUJpYXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGBrZXJuZWxgIHdlaWdodHMgbWF0cml4LCB1c2VkIGZvciB0aGUgbGluZWFyXG4gICAqIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSBpbnB1dHMuXG4gICAqL1xuICBrZXJuZWxJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIHRoZSBgcmVjdXJyZW50S2VybmVsYCB3ZWlnaHRzIG1hdHJpeCwgdXNlZCBmb3JcbiAgICogbGluZWFyIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSByZWN1cnJlbnQgc3RhdGUuXG4gICAqL1xuICByZWN1cnJlbnRJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIHRoZSBiaWFzIHZlY3Rvci5cbiAgICovXG4gIGJpYXNJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgYGtlcm5lbGAgd2VpZ2h0cyBtYXRyaXguXG4gICAqL1xuICBrZXJuZWxSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcnxSZWd1bGFyaXplcjtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgYHJlY3VycmVudF9rZXJuZWxgIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAgcmVjdXJyZW50UmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc1JlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xuXG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGBrZXJuZWxgIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAga2VybmVsQ29uc3RyYWludD86IENvbnN0cmFpbnRJZGVudGlmaWVyfENvbnN0cmFpbnQ7XG5cbiAgLyoqXG4gICAqIENvbnN0cmFpbnQgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgYHJlY3VycmVudEtlcm5lbGAgd2VpZ2h0cyBtYXRyaXguXG4gICAqL1xuICByZWN1cnJlbnRDb25zdHJhaW50PzogQ29uc3RyYWludElkZW50aWZpZXJ8Q29uc3RyYWludDtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBiaWFzIHZlY3Rvci5cbiAgICovXG4gIGJpYXNDb25zdHJhaW50PzogQ29uc3RyYWludElkZW50aWZpZXJ8Q29uc3RyYWludDtcblxuICAvKipcbiAgICogRmxvYXQgbnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gRnJhY3Rpb24gb2YgdGhlIHVuaXRzIHRvIGRyb3AgZm9yIHRoZSBsaW5lYXJcbiAgICogdHJhbnNmb3JtYXRpb24gb2YgdGhlIGlucHV0cy5cbiAgICovXG4gIGRyb3BvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEZsb2F0IG51bWJlciBiZXR3ZWVuIDAgYW5kIDEuIEZyYWN0aW9uIG9mIHRoZSB1bml0cyB0byBkcm9wIGZvciB0aGUgbGluZWFyXG4gICAqIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSByZWN1cnJlbnQgc3RhdGUuXG4gICAqL1xuICByZWN1cnJlbnREcm9wb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGlzIGlzIGFkZGVkIGZvciB0ZXN0IERJIHB1cnBvc2UuXG4gICAqL1xuICBkcm9wb3V0RnVuYz86IEZ1bmN0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgU2ltcGxlUk5OQ2VsbCBleHRlbmRzIFJOTkNlbGwge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdTaW1wbGVSTk5DZWxsJztcbiAgcmVhZG9ubHkgdW5pdHM6IG51bWJlcjtcbiAgcmVhZG9ubHkgYWN0aXZhdGlvbjogQWN0aXZhdGlvbjtcbiAgcmVhZG9ubHkgdXNlQmlhczogYm9vbGVhbjtcblxuICByZWFkb25seSBrZXJuZWxJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHJlYWRvbmx5IHJlY3VycmVudEluaXRpYWxpemVyOiBJbml0aWFsaXplcjtcbiAgcmVhZG9ubHkgYmlhc0luaXRpYWxpemVyOiBJbml0aWFsaXplcjtcblxuICByZWFkb25seSBrZXJuZWxDb25zdHJhaW50OiBDb25zdHJhaW50O1xuICByZWFkb25seSByZWN1cnJlbnRDb25zdHJhaW50OiBDb25zdHJhaW50O1xuICByZWFkb25seSBiaWFzQ29uc3RyYWludDogQ29uc3RyYWludDtcblxuICByZWFkb25seSBrZXJuZWxSZWd1bGFyaXplcjogUmVndWxhcml6ZXI7XG4gIHJlYWRvbmx5IHJlY3VycmVudFJlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcbiAgcmVhZG9ubHkgYmlhc1JlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcblxuICByZWFkb25seSBkcm9wb3V0OiBudW1iZXI7XG4gIHJlYWRvbmx5IHJlY3VycmVudERyb3BvdXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgZHJvcG91dEZ1bmM6IEZ1bmN0aW9uO1xuXG4gIHJlYWRvbmx5IHN0YXRlU2l6ZTogbnVtYmVyO1xuXG4gIGtlcm5lbDogTGF5ZXJWYXJpYWJsZTtcbiAgcmVjdXJyZW50S2VybmVsOiBMYXllclZhcmlhYmxlO1xuICBiaWFzOiBMYXllclZhcmlhYmxlO1xuXG4gIHJlYWRvbmx5IERFRkFVTFRfQUNUSVZBVElPTiA9ICd0YW5oJztcbiAgcmVhZG9ubHkgREVGQVVMVF9LRVJORUxfSU5JVElBTElaRVIgPSAnZ2xvcm90Tm9ybWFsJztcbiAgcmVhZG9ubHkgREVGQVVMVF9SRUNVUlJFTlRfSU5JVElBTElaRVIgPSAnb3J0aG9nb25hbCc7XG4gIHJlYWRvbmx5IERFRkFVTFRfQklBU19JTklUSUFMSVpFUjogSW5pdGlhbGl6ZXJJZGVudGlmaWVyID0gJ3plcm9zJztcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBTaW1wbGVSTk5DZWxsTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy51bml0cyA9IGFyZ3MudW5pdHM7XG4gICAgYXNzZXJ0UG9zaXRpdmVJbnRlZ2VyKHRoaXMudW5pdHMsIGB1bml0c2ApO1xuICAgIHRoaXMuYWN0aXZhdGlvbiA9IGdldEFjdGl2YXRpb24oXG4gICAgICAgIGFyZ3MuYWN0aXZhdGlvbiA9PSBudWxsID8gdGhpcy5ERUZBVUxUX0FDVElWQVRJT04gOiBhcmdzLmFjdGl2YXRpb24pO1xuICAgIHRoaXMudXNlQmlhcyA9IGFyZ3MudXNlQmlhcyA9PSBudWxsID8gdHJ1ZSA6IGFyZ3MudXNlQmlhcztcblxuICAgIHRoaXMua2VybmVsSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihcbiAgICAgICAgYXJncy5rZXJuZWxJbml0aWFsaXplciB8fCB0aGlzLkRFRkFVTFRfS0VSTkVMX0lOSVRJQUxJWkVSKTtcbiAgICB0aGlzLnJlY3VycmVudEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoXG4gICAgICAgIGFyZ3MucmVjdXJyZW50SW5pdGlhbGl6ZXIgfHwgdGhpcy5ERUZBVUxUX1JFQ1VSUkVOVF9JTklUSUFMSVpFUik7XG5cbiAgICB0aGlzLmJpYXNJbml0aWFsaXplciA9XG4gICAgICAgIGdldEluaXRpYWxpemVyKGFyZ3MuYmlhc0luaXRpYWxpemVyIHx8IHRoaXMuREVGQVVMVF9CSUFTX0lOSVRJQUxJWkVSKTtcblxuICAgIHRoaXMua2VybmVsUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmtlcm5lbFJlZ3VsYXJpemVyKTtcbiAgICB0aGlzLnJlY3VycmVudFJlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5yZWN1cnJlbnRSZWd1bGFyaXplcik7XG4gICAgdGhpcy5iaWFzUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmJpYXNSZWd1bGFyaXplcik7XG5cbiAgICB0aGlzLmtlcm5lbENvbnN0cmFpbnQgPSBnZXRDb25zdHJhaW50KGFyZ3Mua2VybmVsQ29uc3RyYWludCk7XG4gICAgdGhpcy5yZWN1cnJlbnRDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLnJlY3VycmVudENvbnN0cmFpbnQpO1xuICAgIHRoaXMuYmlhc0NvbnN0cmFpbnQgPSBnZXRDb25zdHJhaW50KGFyZ3MuYmlhc0NvbnN0cmFpbnQpO1xuXG4gICAgdGhpcy5kcm9wb3V0ID0gbWF0aF91dGlscy5taW4oXG4gICAgICAgIFsxLCBtYXRoX3V0aWxzLm1heChbMCwgYXJncy5kcm9wb3V0ID09IG51bGwgPyAwIDogYXJncy5kcm9wb3V0XSldKTtcbiAgICB0aGlzLnJlY3VycmVudERyb3BvdXQgPSBtYXRoX3V0aWxzLm1pbihbXG4gICAgICAxLFxuICAgICAgbWF0aF91dGlscy5tYXgoXG4gICAgICAgICAgWzAsIGFyZ3MucmVjdXJyZW50RHJvcG91dCA9PSBudWxsID8gMCA6IGFyZ3MucmVjdXJyZW50RHJvcG91dF0pXG4gICAgXSk7XG4gICAgdGhpcy5kcm9wb3V0RnVuYyA9IGFyZ3MuZHJvcG91dEZ1bmM7XG4gICAgdGhpcy5zdGF0ZVNpemUgPSB0aGlzLnVuaXRzO1xuICAgIHRoaXMuZHJvcG91dE1hc2sgPSBudWxsO1xuICAgIHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgPSBudWxsO1xuICB9XG5cbiAgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgLy8gVE9ETyhjYWlzKTogVXNlIHJlZ3VsYXJpemVyLlxuICAgIHRoaXMua2VybmVsID0gdGhpcy5hZGRXZWlnaHQoXG4gICAgICAgICdrZXJuZWwnLCBbaW5wdXRTaGFwZVtpbnB1dFNoYXBlLmxlbmd0aCAtIDFdLCB0aGlzLnVuaXRzXSwgbnVsbCxcbiAgICAgICAgdGhpcy5rZXJuZWxJbml0aWFsaXplciwgdGhpcy5rZXJuZWxSZWd1bGFyaXplciwgdHJ1ZSxcbiAgICAgICAgdGhpcy5rZXJuZWxDb25zdHJhaW50KTtcbiAgICB0aGlzLnJlY3VycmVudEtlcm5lbCA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAncmVjdXJyZW50X2tlcm5lbCcsIFt0aGlzLnVuaXRzLCB0aGlzLnVuaXRzXSwgbnVsbCxcbiAgICAgICAgdGhpcy5yZWN1cnJlbnRJbml0aWFsaXplciwgdGhpcy5yZWN1cnJlbnRSZWd1bGFyaXplciwgdHJ1ZSxcbiAgICAgICAgdGhpcy5yZWN1cnJlbnRDb25zdHJhaW50KTtcbiAgICBpZiAodGhpcy51c2VCaWFzKSB7XG4gICAgICB0aGlzLmJpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAnYmlhcycsIFt0aGlzLnVuaXRzXSwgbnVsbCwgdGhpcy5iaWFzSW5pdGlhbGl6ZXIsXG4gICAgICAgICAgdGhpcy5iaWFzUmVndWxhcml6ZXIsIHRydWUsIHRoaXMuYmlhc0NvbnN0cmFpbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJpYXMgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmJ1aWx0ID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIFBvcnRpbmcgTm90ZTogUHlLZXJhcycgZXF1aXZhbGVudCBvZiB0aGlzIG1ldGhvZCB0YWtlcyB0d28gdGVuc29yIGlucHV0czpcbiAgLy8gICBgaW5wdXRzYCBhbmQgYHN0YXRlc2AuIEhlcmUsIHRoZSB0d28gdGVuc29ycyBhcmUgY29tYmluZWQgaW50byBhblxuICAvLyAgIGBUZW5zb3JbXWAgQXJyYXkgYXMgdGhlIGZpcnN0IGlucHV0IGFyZ3VtZW50LlxuICAvLyAgIFNpbWlsYXJseSwgUHlLZXJhcycgZXF1aXZhbGVudCBvZiB0aGlzIG1ldGhvZCByZXR1cm5zIHR3byB2YWx1ZXM6XG4gIC8vICAgIGBvdXRwdXRgIGFuZCBgW291dHB1dF1gLiBIZXJlIHRoZSB0d28gYXJlIGNvbWJpbmVkIGludG8gb25lIGxlbmd0aC0yXG4gIC8vICAgIGBUZW5zb3JbXWAsIGNvbnNpc3Rpbmcgb2YgYG91dHB1dGAgcmVwZWF0ZWQuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBpbnB1dHMgPSBpbnB1dHMgYXMgVGVuc29yW107XG4gICAgICBpZiAoaW5wdXRzLmxlbmd0aCAhPT0gMikge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgIGBTaW1wbGVSTk5DZWxsIGV4cGVjdHMgMiBpbnB1dCBUZW5zb3JzLCBnb3QgJHtpbnB1dHMubGVuZ3RofS5gKTtcbiAgICAgIH1cbiAgICAgIGxldCBwcmV2T3V0cHV0ID0gaW5wdXRzWzFdO1xuICAgICAgaW5wdXRzID0gaW5wdXRzWzBdO1xuICAgICAgY29uc3QgdHJhaW5pbmcgPSBrd2FyZ3NbJ3RyYWluaW5nJ10gPT0gbnVsbCA/IGZhbHNlIDoga3dhcmdzWyd0cmFpbmluZyddO1xuXG4gICAgICBpZiAoMCA8IHRoaXMuZHJvcG91dCAmJiB0aGlzLmRyb3BvdXQgPCAxICYmIHRoaXMuZHJvcG91dE1hc2sgPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRyb3BvdXRNYXNrID0gZ2VuZXJhdGVEcm9wb3V0TWFzayh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uZXM6ICgpID0+IHRmYy5vbmVzTGlrZShpbnB1dHMgYXMgVGVuc29yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF0ZTogdGhpcy5kcm9wb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFpbmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJvcG91dEZ1bmM6IHRoaXMuZHJvcG91dEZ1bmMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KSBhcyBUZW5zb3I7XG4gICAgICB9XG4gICAgICBpZiAoMCA8IHRoaXMucmVjdXJyZW50RHJvcG91dCAmJiB0aGlzLnJlY3VycmVudERyb3BvdXQgPCAxICYmXG4gICAgICAgICAgdGhpcy5yZWN1cnJlbnREcm9wb3V0TWFzayA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgPSBnZW5lcmF0ZURyb3BvdXRNYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25lczogKCkgPT4gdGZjLm9uZXNMaWtlKHByZXZPdXRwdXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYXRlOiB0aGlzLnJlY3VycmVudERyb3BvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWluaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcm9wb3V0RnVuYzogdGhpcy5kcm9wb3V0RnVuYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pIGFzIFRlbnNvcjtcbiAgICAgIH1cbiAgICAgIGxldCBoOiBUZW5zb3I7XG4gICAgICBjb25zdCBkcE1hc2s6IFRlbnNvciA9IHRoaXMuZHJvcG91dE1hc2sgYXMgVGVuc29yO1xuICAgICAgY29uc3QgcmVjRHBNYXNrOiBUZW5zb3IgPSB0aGlzLnJlY3VycmVudERyb3BvdXRNYXNrIGFzIFRlbnNvcjtcbiAgICAgIGlmIChkcE1hc2sgIT0gbnVsbCkge1xuICAgICAgICBoID0gSy5kb3QodGZjLm11bChpbnB1dHMsIGRwTWFzayksIHRoaXMua2VybmVsLnJlYWQoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoID0gSy5kb3QoaW5wdXRzLCB0aGlzLmtlcm5lbC5yZWFkKCkpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuYmlhcyAhPSBudWxsKSB7XG4gICAgICAgIGggPSBLLmJpYXNBZGQoaCwgdGhpcy5iaWFzLnJlYWQoKSk7XG4gICAgICB9XG4gICAgICBpZiAocmVjRHBNYXNrICE9IG51bGwpIHtcbiAgICAgICAgcHJldk91dHB1dCA9IHRmYy5tdWwocHJldk91dHB1dCwgcmVjRHBNYXNrKTtcbiAgICAgIH1cbiAgICAgIGxldCBvdXRwdXQgPSB0ZmMuYWRkKGgsIEsuZG90KHByZXZPdXRwdXQsIHRoaXMucmVjdXJyZW50S2VybmVsLnJlYWQoKSkpO1xuICAgICAgaWYgKHRoaXMuYWN0aXZhdGlvbiAhPSBudWxsKSB7XG4gICAgICAgIG91dHB1dCA9IHRoaXMuYWN0aXZhdGlvbi5hcHBseShvdXRwdXQpO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPKGNhaXMpOiBQcm9wZXJseSBzZXQgbGVhcm5pbmcgcGhhc2Ugb24gb3V0cHV0IHRlbnNvcj9cbiAgICAgIHJldHVybiBbb3V0cHV0LCBvdXRwdXRdO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuXG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICB1bml0czogdGhpcy51bml0cyxcbiAgICAgIGFjdGl2YXRpb246IHNlcmlhbGl6ZUFjdGl2YXRpb24odGhpcy5hY3RpdmF0aW9uKSxcbiAgICAgIHVzZUJpYXM6IHRoaXMudXNlQmlhcyxcbiAgICAgIGtlcm5lbEluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmtlcm5lbEluaXRpYWxpemVyKSxcbiAgICAgIHJlY3VycmVudEluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLnJlY3VycmVudEluaXRpYWxpemVyKSxcbiAgICAgIGJpYXNJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5iaWFzSW5pdGlhbGl6ZXIpLFxuICAgICAga2VybmVsUmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMua2VybmVsUmVndWxhcml6ZXIpLFxuICAgICAgcmVjdXJyZW50UmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMucmVjdXJyZW50UmVndWxhcml6ZXIpLFxuICAgICAgYmlhc1JlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmJpYXNSZWd1bGFyaXplciksXG4gICAgICBhY3Rpdml0eVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIpLFxuICAgICAga2VybmVsQ29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLmtlcm5lbENvbnN0cmFpbnQpLFxuICAgICAgcmVjdXJyZW50Q29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLnJlY3VycmVudENvbnN0cmFpbnQpLFxuICAgICAgYmlhc0NvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5iaWFzQ29uc3RyYWludCksXG4gICAgICBkcm9wb3V0OiB0aGlzLmRyb3BvdXQsXG4gICAgICByZWN1cnJlbnREcm9wb3V0OiB0aGlzLnJlY3VycmVudERyb3BvdXQsXG4gICAgfTtcblxuICAgIHJldHVybiB7Li4uYmFzZUNvbmZpZywgLi4uY29uZmlnfTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFNpbXBsZVJOTkNlbGwpO1xuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgU2ltcGxlUk5OTGF5ZXJBcmdzIGV4dGVuZHMgQmFzZVJOTkxheWVyQXJncyB7XG4gIC8qKlxuICAgKiBQb3NpdGl2ZSBpbnRlZ2VyLCBkaW1lbnNpb25hbGl0eSBvZiB0aGUgb3V0cHV0IHNwYWNlLlxuICAgKi9cbiAgdW5pdHM6IG51bWJlcjtcblxuICAvKipcbiAgICogQWN0aXZhdGlvbiBmdW5jdGlvbiB0byB1c2UuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvICBoeXBlcmJvbGljIHRhbmdlbnQgKGB0YW5oYClcbiAgICpcbiAgICogSWYgeW91IHBhc3MgYG51bGxgLCBubyBhY3RpdmF0aW9uIHdpbGwgYmUgYXBwbGllZC5cbiAgICovXG4gIGFjdGl2YXRpb24/OiBBY3RpdmF0aW9uSWRlbnRpZmllcjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgbGF5ZXIgdXNlcyBhIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgdXNlQmlhcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVyIGZvciB0aGUgYGtlcm5lbGAgd2VpZ2h0cyBtYXRyaXgsIHVzZWQgZm9yIHRoZSBsaW5lYXJcbiAgICogdHJhbnNmb3JtYXRpb24gb2YgdGhlIGlucHV0cy5cbiAgICovXG4gIGtlcm5lbEluaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJJZGVudGlmaWVyfEluaXRpYWxpemVyO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGByZWN1cnJlbnRLZXJuZWxgIHdlaWdodHMgbWF0cml4LCB1c2VkIGZvclxuICAgKiBsaW5lYXIgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHJlY3VycmVudCBzdGF0ZS5cbiAgICovXG4gIHJlY3VycmVudEluaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJJZGVudGlmaWVyfEluaXRpYWxpemVyO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc0luaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJJZGVudGlmaWVyfEluaXRpYWxpemVyO1xuXG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBrZXJuZWwgd2VpZ2h0cyBtYXRyaXguXG4gICAqL1xuICBrZXJuZWxSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcnxSZWd1bGFyaXplcjtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgcmVjdXJyZW50S2VybmVsIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAgcmVjdXJyZW50UmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc1JlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xuXG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGtlcm5lbCB3ZWlnaHRzIG1hdHJpeC5cbiAgICovXG4gIGtlcm5lbENvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcnxDb25zdHJhaW50O1xuXG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIHJlY3VycmVudEtlcm5lbCB3ZWlnaHRzIG1hdHJpeC5cbiAgICovXG4gIHJlY3VycmVudENvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcnxDb25zdHJhaW50O1xuXG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc0NvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcnxDb25zdHJhaW50O1xuXG4gIC8qKlxuICAgKiBOdW1iZXIgYmV0d2VlbiAwIGFuZCAxLiBGcmFjdGlvbiBvZiB0aGUgdW5pdHMgdG8gZHJvcCBmb3IgdGhlIGxpbmVhclxuICAgKiB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgaW5wdXRzLlxuICAgKi9cbiAgZHJvcG91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogTnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gRnJhY3Rpb24gb2YgdGhlIHVuaXRzIHRvIGRyb3AgZm9yIHRoZSBsaW5lYXJcbiAgICogdHJhbnNmb3JtYXRpb24gb2YgdGhlIHJlY3VycmVudCBzdGF0ZS5cbiAgICovXG4gIHJlY3VycmVudERyb3BvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgYWRkZWQgZm9yIHRlc3QgREkgcHVycG9zZS5cbiAgICovXG4gIGRyb3BvdXRGdW5jPzogRnVuY3Rpb247XG59XG5cbi8qKlxuICogUk5OTGF5ZXJDb25maWcgaXMgaWRlbnRpY2FsIHRvIEJhc2VSTk5MYXllckNvbmZpZywgZXhjZXB0IGl0IG1ha2VzIHRoZVxuICogYGNlbGxgIHByb3BlcnR5IHJlcXVpcmVkLiBUaGlzIGludGVyZmFjZSBpcyB0byBiZSB1c2VkIHdpdGggY29uc3RydWN0b3JzXG4gKiBvZiBjb25jcmV0ZSBSTk4gbGF5ZXIgc3VidHlwZXMuXG4gKi9cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBSTk5MYXllckFyZ3MgZXh0ZW5kcyBCYXNlUk5OTGF5ZXJBcmdzIHtcbiAgY2VsbDogUk5OQ2VsbHxSTk5DZWxsW107XG59XG5cbmV4cG9ydCBjbGFzcyBTaW1wbGVSTk4gZXh0ZW5kcyBSTk4ge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdTaW1wbGVSTk4nO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBTaW1wbGVSTk5MYXllckFyZ3MpIHtcbiAgICBhcmdzLmNlbGwgPSBuZXcgU2ltcGxlUk5OQ2VsbChhcmdzKTtcbiAgICBzdXBlcihhcmdzIGFzIFJOTkxheWVyQXJncyk7XG4gICAgLy8gVE9ETyhjYWlzKTogQWRkIGFjdGl2aXR5UmVndWxhcml6ZXIuXG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY2VsbC5kcm9wb3V0TWFzayAhPSBudWxsKSB7XG4gICAgICAgIHRmYy5kaXNwb3NlKHRoaXMuY2VsbC5kcm9wb3V0TWFzayk7XG4gICAgICAgIHRoaXMuY2VsbC5kcm9wb3V0TWFzayA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jZWxsLnJlY3VycmVudERyb3BvdXRNYXNrICE9IG51bGwpIHtcbiAgICAgICAgdGZjLmRpc3Bvc2UodGhpcy5jZWxsLnJlY3VycmVudERyb3BvdXRNYXNrKTtcbiAgICAgICAgdGhpcy5jZWxsLnJlY3VycmVudERyb3BvdXRNYXNrID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hc2sgPSBrd2FyZ3MgPT0gbnVsbCA/IG51bGwgOiBrd2FyZ3NbJ21hc2snXTtcbiAgICAgIGNvbnN0IHRyYWluaW5nID0ga3dhcmdzID09IG51bGwgPyBudWxsIDoga3dhcmdzWyd0cmFpbmluZyddO1xuICAgICAgY29uc3QgaW5pdGlhbFN0YXRlOiBUZW5zb3JbXSA9XG4gICAgICAgICAga3dhcmdzID09IG51bGwgPyBudWxsIDoga3dhcmdzWydpbml0aWFsU3RhdGUnXTtcbiAgICAgIHJldHVybiBzdXBlci5jYWxsKGlucHV0cywge21hc2ssIHRyYWluaW5nLCBpbml0aWFsU3RhdGV9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgZnJvbUNvbmZpZzxUIGV4dGVuZHMgc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGU+KFxuICAgICAgY2xzOiBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFQ+LFxuICAgICAgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QpOiBUIHtcbiAgICByZXR1cm4gbmV3IGNscyhjb25maWcpO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoU2ltcGxlUk5OKTtcblxuLy8gUG9ydGluZyBOb3RlOiBTaW5jZSB0aGlzIGlzIGEgc3VwZXJzZXQgb2YgU2ltcGxlUk5OTGF5ZXJDb25maWcsIHdlIGV4dGVuZFxuLy8gICB0aGF0IGludGVyZmFjZSBpbnN0ZWFkIG9mIHJlcGVhdGluZyB0aGUgZmllbGRzLlxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEdSVUNlbGxMYXllckFyZ3MgZXh0ZW5kcyBTaW1wbGVSTk5DZWxsTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIEFjdGl2YXRpb24gZnVuY3Rpb24gdG8gdXNlIGZvciB0aGUgcmVjdXJyZW50IHN0ZXAuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGhhcmQgc2lnbW9pZCAoYGhhcmRTaWdtb2lkYCkuXG4gICAqXG4gICAqIElmIGBudWxsYCwgbm8gYWN0aXZhdGlvbiBpcyBhcHBsaWVkLlxuICAgKi9cbiAgcmVjdXJyZW50QWN0aXZhdGlvbj86IEFjdGl2YXRpb25JZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBtb2RlLCBlaXRoZXIgMSBvciAyLlxuICAgKlxuICAgKiBNb2RlIDEgd2lsbCBzdHJ1Y3R1cmUgaXRzIG9wZXJhdGlvbnMgYXMgYSBsYXJnZXIgbnVtYmVyIG9mXG4gICAqICAgc21hbGxlciBkb3QgcHJvZHVjdHMgYW5kIGFkZGl0aW9ucy5cbiAgICpcbiAgICogTW9kZSAyIHdpbGwgYmF0Y2ggdGhlbSBpbnRvIGZld2VyLCBsYXJnZXIgb3BlcmF0aW9ucy4gVGhlc2UgbW9kZXMgd2lsbFxuICAgKiBoYXZlIGRpZmZlcmVudCBwZXJmb3JtYW5jZSBwcm9maWxlcyBvbiBkaWZmZXJlbnQgaGFyZHdhcmUgYW5kXG4gICAqIGZvciBkaWZmZXJlbnQgYXBwbGljYXRpb25zLlxuICAgKlxuICAgKiBOb3RlOiBGb3Igc3VwZXJpb3IgcGVyZm9ybWFuY2UsIFRlbnNvckZsb3cuanMgYWx3YXlzIHVzZXMgaW1wbGVtZW50YXRpb25cbiAgICogMiwgcmVnYXJkbGVzcyBvZiB0aGUgYWN0dWFsIHZhbHVlIG9mIHRoaXMgY29uZmlndXJhdGlvbiBmaWVsZC5cbiAgICovXG4gIGltcGxlbWVudGF0aW9uPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBHUlUgY29udmVudGlvbiAod2hldGhlciB0byBhcHBseSByZXNldCBnYXRlIGFmdGVyIG9yIGJlZm9yZSBtYXRyaXhcbiAgICogbXVsdGlwbGljYXRpb24pLiBmYWxzZSA9IFwiYmVmb3JlXCIsIHRydWUgPSBcImFmdGVyXCIgKG9ubHkgZmFsc2UgaXNcbiAgICogc3VwcG9ydGVkKS5cbiAgICovXG4gIHJlc2V0QWZ0ZXI/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgR1JVQ2VsbCBleHRlbmRzIFJOTkNlbGwge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdHUlVDZWxsJztcbiAgcmVhZG9ubHkgdW5pdHM6IG51bWJlcjtcbiAgcmVhZG9ubHkgYWN0aXZhdGlvbjogQWN0aXZhdGlvbjtcbiAgcmVhZG9ubHkgcmVjdXJyZW50QWN0aXZhdGlvbjogQWN0aXZhdGlvbjtcbiAgcmVhZG9ubHkgdXNlQmlhczogYm9vbGVhbjtcblxuICByZWFkb25seSBrZXJuZWxJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHJlYWRvbmx5IHJlY3VycmVudEluaXRpYWxpemVyOiBJbml0aWFsaXplcjtcbiAgcmVhZG9ubHkgYmlhc0luaXRpYWxpemVyOiBJbml0aWFsaXplcjtcblxuICByZWFkb25seSBrZXJuZWxSZWd1bGFyaXplcjogUmVndWxhcml6ZXI7XG4gIHJlYWRvbmx5IHJlY3VycmVudFJlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcbiAgcmVhZG9ubHkgYmlhc1JlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcblxuICByZWFkb25seSBrZXJuZWxDb25zdHJhaW50OiBDb25zdHJhaW50O1xuICByZWFkb25seSByZWN1cnJlbnRDb25zdHJhaW50OiBDb25zdHJhaW50O1xuICByZWFkb25seSBiaWFzQ29uc3RyYWludDogQ29uc3RyYWludDtcblxuICByZWFkb25seSBkcm9wb3V0OiBudW1iZXI7XG4gIHJlYWRvbmx5IHJlY3VycmVudERyb3BvdXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgZHJvcG91dEZ1bmM6IEZ1bmN0aW9uO1xuXG4gIHJlYWRvbmx5IHN0YXRlU2l6ZTogbnVtYmVyO1xuICByZWFkb25seSBpbXBsZW1lbnRhdGlvbjogbnVtYmVyO1xuXG4gIHJlYWRvbmx5IERFRkFVTFRfQUNUSVZBVElPTiA9ICd0YW5oJztcbiAgcmVhZG9ubHkgREVGQVVMVF9SRUNVUlJFTlRfQUNUSVZBVElPTjogQWN0aXZhdGlvbklkZW50aWZpZXIgPSAnaGFyZFNpZ21vaWQnO1xuXG4gIHJlYWRvbmx5IERFRkFVTFRfS0VSTkVMX0lOSVRJQUxJWkVSID0gJ2dsb3JvdE5vcm1hbCc7XG4gIHJlYWRvbmx5IERFRkFVTFRfUkVDVVJSRU5UX0lOSVRJQUxJWkVSID0gJ29ydGhvZ29uYWwnO1xuICByZWFkb25seSBERUZBVUxUX0JJQVNfSU5JVElBTElaRVI6IEluaXRpYWxpemVySWRlbnRpZmllciA9ICd6ZXJvcyc7XG5cbiAga2VybmVsOiBMYXllclZhcmlhYmxlO1xuICByZWN1cnJlbnRLZXJuZWw6IExheWVyVmFyaWFibGU7XG4gIGJpYXM6IExheWVyVmFyaWFibGU7XG5cbiAgY29uc3RydWN0b3IoYXJnczogR1JVQ2VsbExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIGlmIChhcmdzLnJlc2V0QWZ0ZXIpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBHUlVDZWxsIGRvZXMgbm90IHN1cHBvcnQgcmVzZXRfYWZ0ZXIgcGFyYW1ldGVyIHNldCB0byB0cnVlLmApO1xuICAgIH1cbiAgICB0aGlzLnVuaXRzID0gYXJncy51bml0cztcbiAgICBhc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy51bml0cywgJ3VuaXRzJyk7XG4gICAgdGhpcy5hY3RpdmF0aW9uID0gZ2V0QWN0aXZhdGlvbihcbiAgICAgICAgYXJncy5hY3RpdmF0aW9uID09PSB1bmRlZmluZWQgPyB0aGlzLkRFRkFVTFRfQUNUSVZBVElPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5hY3RpdmF0aW9uKTtcbiAgICB0aGlzLnJlY3VycmVudEFjdGl2YXRpb24gPSBnZXRBY3RpdmF0aW9uKFxuICAgICAgICBhcmdzLnJlY3VycmVudEFjdGl2YXRpb24gPT09IHVuZGVmaW5lZCA/XG4gICAgICAgICAgICB0aGlzLkRFRkFVTFRfUkVDVVJSRU5UX0FDVElWQVRJT04gOlxuICAgICAgICAgICAgYXJncy5yZWN1cnJlbnRBY3RpdmF0aW9uKTtcbiAgICB0aGlzLnVzZUJpYXMgPSBhcmdzLnVzZUJpYXMgPT0gbnVsbCA/IHRydWUgOiBhcmdzLnVzZUJpYXM7XG5cbiAgICB0aGlzLmtlcm5lbEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoXG4gICAgICAgIGFyZ3Mua2VybmVsSW5pdGlhbGl6ZXIgfHwgdGhpcy5ERUZBVUxUX0tFUk5FTF9JTklUSUFMSVpFUik7XG4gICAgdGhpcy5yZWN1cnJlbnRJbml0aWFsaXplciA9IGdldEluaXRpYWxpemVyKFxuICAgICAgICBhcmdzLnJlY3VycmVudEluaXRpYWxpemVyIHx8IHRoaXMuREVGQVVMVF9SRUNVUlJFTlRfSU5JVElBTElaRVIpO1xuXG4gICAgdGhpcy5iaWFzSW5pdGlhbGl6ZXIgPVxuICAgICAgICBnZXRJbml0aWFsaXplcihhcmdzLmJpYXNJbml0aWFsaXplciB8fCB0aGlzLkRFRkFVTFRfQklBU19JTklUSUFMSVpFUik7XG5cbiAgICB0aGlzLmtlcm5lbFJlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5rZXJuZWxSZWd1bGFyaXplcik7XG4gICAgdGhpcy5yZWN1cnJlbnRSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MucmVjdXJyZW50UmVndWxhcml6ZXIpO1xuICAgIHRoaXMuYmlhc1JlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5iaWFzUmVndWxhcml6ZXIpO1xuXG4gICAgdGhpcy5rZXJuZWxDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmtlcm5lbENvbnN0cmFpbnQpO1xuICAgIHRoaXMucmVjdXJyZW50Q29uc3RyYWludCA9IGdldENvbnN0cmFpbnQoYXJncy5yZWN1cnJlbnRDb25zdHJhaW50KTtcbiAgICB0aGlzLmJpYXNDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmJpYXNDb25zdHJhaW50KTtcblxuICAgIHRoaXMuZHJvcG91dCA9IG1hdGhfdXRpbHMubWluKFxuICAgICAgICBbMSwgbWF0aF91dGlscy5tYXgoWzAsIGFyZ3MuZHJvcG91dCA9PSBudWxsID8gMCA6IGFyZ3MuZHJvcG91dF0pXSk7XG4gICAgdGhpcy5yZWN1cnJlbnREcm9wb3V0ID0gbWF0aF91dGlscy5taW4oW1xuICAgICAgMSxcbiAgICAgIG1hdGhfdXRpbHMubWF4KFxuICAgICAgICAgIFswLCBhcmdzLnJlY3VycmVudERyb3BvdXQgPT0gbnVsbCA/IDAgOiBhcmdzLnJlY3VycmVudERyb3BvdXRdKVxuICAgIF0pO1xuICAgIHRoaXMuZHJvcG91dEZ1bmMgPSBhcmdzLmRyb3BvdXRGdW5jO1xuICAgIHRoaXMuaW1wbGVtZW50YXRpb24gPSBhcmdzLmltcGxlbWVudGF0aW9uO1xuICAgIHRoaXMuc3RhdGVTaXplID0gdGhpcy51bml0cztcbiAgICB0aGlzLmRyb3BvdXRNYXNrID0gbnVsbDtcbiAgICB0aGlzLnJlY3VycmVudERyb3BvdXRNYXNrID0gbnVsbDtcbiAgfVxuXG4gIHB1YmxpYyBvdmVycmlkZSBidWlsZChpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogdm9pZCB7XG4gICAgaW5wdXRTaGFwZSA9IGdldEV4YWN0bHlPbmVTaGFwZShpbnB1dFNoYXBlKTtcbiAgICBjb25zdCBpbnB1dERpbSA9IGlucHV0U2hhcGVbaW5wdXRTaGFwZS5sZW5ndGggLSAxXTtcbiAgICB0aGlzLmtlcm5lbCA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAna2VybmVsJywgW2lucHV0RGltLCB0aGlzLnVuaXRzICogM10sIG51bGwsIHRoaXMua2VybmVsSW5pdGlhbGl6ZXIsXG4gICAgICAgIHRoaXMua2VybmVsUmVndWxhcml6ZXIsIHRydWUsIHRoaXMua2VybmVsQ29uc3RyYWludCk7XG4gICAgdGhpcy5yZWN1cnJlbnRLZXJuZWwgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgJ3JlY3VycmVudF9rZXJuZWwnLCBbdGhpcy51bml0cywgdGhpcy51bml0cyAqIDNdLCBudWxsLFxuICAgICAgICB0aGlzLnJlY3VycmVudEluaXRpYWxpemVyLCB0aGlzLnJlY3VycmVudFJlZ3VsYXJpemVyLCB0cnVlLFxuICAgICAgICB0aGlzLnJlY3VycmVudENvbnN0cmFpbnQpO1xuICAgIGlmICh0aGlzLnVzZUJpYXMpIHtcbiAgICAgIHRoaXMuYmlhcyA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAgICdiaWFzJywgW3RoaXMudW5pdHMgKiAzXSwgbnVsbCwgdGhpcy5iaWFzSW5pdGlhbGl6ZXIsXG4gICAgICAgICAgdGhpcy5iaWFzUmVndWxhcml6ZXIsIHRydWUsIHRoaXMuYmlhc0NvbnN0cmFpbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJpYXMgPSBudWxsO1xuICAgIH1cbiAgICAvLyBQb3J0aW5nIE5vdGVzOiBVbmxpa2UgdGhlIFB5S2VyYXMgaW1wbGVtZW50YXRpb24sIHdlIHBlcmZvcm0gc2xpY2luZ1xuICAgIC8vICAgb2YgdGhlIHdlaWdodHMgYW5kIGJpYXMgaW4gdGhlIGNhbGwoKSBtZXRob2QsIGF0IGV4ZWN1dGlvbiB0aW1lLlxuICAgIHRoaXMuYnVpbHQgPSB0cnVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlucHV0cyA9IGlucHV0cyBhcyBUZW5zb3JbXTtcbiAgICAgIGlmIChpbnB1dHMubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYEdSVUNlbGwgZXhwZWN0cyAyIGlucHV0IFRlbnNvcnMgKGlucHV0cywgaCwgYyksIGdvdCBgICtcbiAgICAgICAgICAgIGAke2lucHV0cy5sZW5ndGh9LmApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0cmFpbmluZyA9IGt3YXJnc1sndHJhaW5pbmcnXSA9PSBudWxsID8gZmFsc2UgOiBrd2FyZ3NbJ3RyYWluaW5nJ107XG4gICAgICBsZXQgaFRNaW51czEgPSBpbnB1dHNbMV07ICAvLyBQcmV2aW91cyBtZW1vcnkgc3RhdGUuXG4gICAgICBpbnB1dHMgPSBpbnB1dHNbMF07XG5cbiAgICAgIC8vIE5vdGU6IEZvciBzdXBlcmlvciBwZXJmb3JtYW5jZSwgVGVuc29yRmxvdy5qcyBhbHdheXMgdXNlc1xuICAgICAgLy8gaW1wbGVtZW50YXRpb24gMiwgcmVnYXJkbGVzcyBvZiB0aGUgYWN0dWFsIHZhbHVlIG9mXG4gICAgICAvLyBjb25maWcuaW1wbGVtZW50YXRpb24uXG4gICAgICBpZiAoMCA8IHRoaXMuZHJvcG91dCAmJiB0aGlzLmRyb3BvdXQgPCAxICYmIHRoaXMuZHJvcG91dE1hc2sgPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRyb3BvdXRNYXNrID0gZ2VuZXJhdGVEcm9wb3V0TWFzayh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uZXM6ICgpID0+IHRmYy5vbmVzTGlrZShpbnB1dHMgYXMgVGVuc29yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF0ZTogdGhpcy5kcm9wb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFpbmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyb3BvdXRGdW5jOiB0aGlzLmRyb3BvdXRGdW5jLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkgYXMgVGVuc29yW107XG4gICAgICB9XG4gICAgICBpZiAoMCA8IHRoaXMucmVjdXJyZW50RHJvcG91dCAmJiB0aGlzLnJlY3VycmVudERyb3BvdXQgPCAxICYmXG4gICAgICAgICAgdGhpcy5yZWN1cnJlbnREcm9wb3V0TWFzayA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgPSBnZW5lcmF0ZURyb3BvdXRNYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25lczogKCkgPT4gdGZjLm9uZXNMaWtlKGhUTWludXMxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF0ZTogdGhpcy5yZWN1cnJlbnREcm9wb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFpbmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyb3BvdXRGdW5jOiB0aGlzLmRyb3BvdXRGdW5jLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkgYXMgVGVuc29yW107XG4gICAgICB9XG4gICAgICBjb25zdCBkcE1hc2sgPSB0aGlzLmRyb3BvdXRNYXNrIGFzIFtUZW5zb3IsIFRlbnNvciwgVGVuc29yXTtcbiAgICAgIGNvbnN0IHJlY0RwTWFzayA9IHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgYXMgW1RlbnNvciwgVGVuc29yLCBUZW5zb3JdO1xuICAgICAgbGV0IHo6IFRlbnNvcjtcbiAgICAgIGxldCByOiBUZW5zb3I7XG4gICAgICBsZXQgaGg6IFRlbnNvcjtcblxuICAgICAgaWYgKDAgPCB0aGlzLmRyb3BvdXQgJiYgdGhpcy5kcm9wb3V0IDwgMSkge1xuICAgICAgICBpbnB1dHMgPSB0ZmMubXVsKGlucHV0cywgZHBNYXNrWzBdKTtcbiAgICAgIH1cbiAgICAgIGxldCBtYXRyaXhYID0gSy5kb3QoaW5wdXRzLCB0aGlzLmtlcm5lbC5yZWFkKCkpO1xuICAgICAgaWYgKHRoaXMudXNlQmlhcykge1xuICAgICAgICBtYXRyaXhYID0gSy5iaWFzQWRkKG1hdHJpeFgsIHRoaXMuYmlhcy5yZWFkKCkpO1xuICAgICAgfVxuICAgICAgaWYgKDAgPCB0aGlzLnJlY3VycmVudERyb3BvdXQgJiYgdGhpcy5yZWN1cnJlbnREcm9wb3V0IDwgMSkge1xuICAgICAgICBoVE1pbnVzMSA9IHRmYy5tdWwoaFRNaW51czEsIHJlY0RwTWFza1swXSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlY3VycmVudEtlcm5lbFZhbHVlID0gdGhpcy5yZWN1cnJlbnRLZXJuZWwucmVhZCgpO1xuICAgICAgY29uc3QgW3JrMSwgcmsyXSA9IHRmYy5zcGxpdChcbiAgICAgICAgICByZWN1cnJlbnRLZXJuZWxWYWx1ZSwgWzIgKiB0aGlzLnVuaXRzLCB0aGlzLnVuaXRzXSxcbiAgICAgICAgICByZWN1cnJlbnRLZXJuZWxWYWx1ZS5yYW5rIC0gMSk7XG4gICAgICBjb25zdCBtYXRyaXhJbm5lciA9IEsuZG90KGhUTWludXMxLCByazEpO1xuXG4gICAgICBjb25zdCBbeFosIHhSLCB4SF0gPSB0ZmMuc3BsaXQobWF0cml4WCwgMywgbWF0cml4WC5yYW5rIC0gMSk7XG4gICAgICBjb25zdCBbcmVjdXJyZW50WiwgcmVjdXJyZW50Ul0gPVxuICAgICAgICAgIHRmYy5zcGxpdChtYXRyaXhJbm5lciwgMiwgbWF0cml4SW5uZXIucmFuayAtIDEpO1xuICAgICAgeiA9IHRoaXMucmVjdXJyZW50QWN0aXZhdGlvbi5hcHBseSh0ZmMuYWRkKHhaLCByZWN1cnJlbnRaKSk7XG4gICAgICByID0gdGhpcy5yZWN1cnJlbnRBY3RpdmF0aW9uLmFwcGx5KHRmYy5hZGQoeFIsIHJlY3VycmVudFIpKTtcblxuICAgICAgY29uc3QgcmVjdXJyZW50SCA9IEsuZG90KHRmYy5tdWwociwgaFRNaW51czEpLCByazIpO1xuICAgICAgaGggPSB0aGlzLmFjdGl2YXRpb24uYXBwbHkodGZjLmFkZCh4SCwgcmVjdXJyZW50SCkpO1xuXG4gICAgICBjb25zdCBoID1cbiAgICAgICAgICB0ZmMuYWRkKHRmYy5tdWwoeiwgaFRNaW51czEpLCB0ZmMubXVsKHRmYy5hZGQoMSwgdGZjLm5lZyh6KSksIGhoKSk7XG4gICAgICAvLyBUT0RPKGNhaXMpOiBBZGQgdXNlX2xlYXJuaW5nX3BoYXNlIGZsYWcgcHJvcGVybHkuXG4gICAgICByZXR1cm4gW2gsIGhdO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuXG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICB1bml0czogdGhpcy51bml0cyxcbiAgICAgIGFjdGl2YXRpb246IHNlcmlhbGl6ZUFjdGl2YXRpb24odGhpcy5hY3RpdmF0aW9uKSxcbiAgICAgIHJlY3VycmVudEFjdGl2YXRpb246IHNlcmlhbGl6ZUFjdGl2YXRpb24odGhpcy5yZWN1cnJlbnRBY3RpdmF0aW9uKSxcbiAgICAgIHVzZUJpYXM6IHRoaXMudXNlQmlhcyxcbiAgICAgIGtlcm5lbEluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmtlcm5lbEluaXRpYWxpemVyKSxcbiAgICAgIHJlY3VycmVudEluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLnJlY3VycmVudEluaXRpYWxpemVyKSxcbiAgICAgIGJpYXNJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5iaWFzSW5pdGlhbGl6ZXIpLFxuICAgICAga2VybmVsUmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMua2VybmVsUmVndWxhcml6ZXIpLFxuICAgICAgcmVjdXJyZW50UmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMucmVjdXJyZW50UmVndWxhcml6ZXIpLFxuICAgICAgYmlhc1JlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmJpYXNSZWd1bGFyaXplciksXG4gICAgICBhY3Rpdml0eVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIpLFxuICAgICAga2VybmVsQ29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLmtlcm5lbENvbnN0cmFpbnQpLFxuICAgICAgcmVjdXJyZW50Q29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLnJlY3VycmVudENvbnN0cmFpbnQpLFxuICAgICAgYmlhc0NvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5iaWFzQ29uc3RyYWludCksXG4gICAgICBkcm9wb3V0OiB0aGlzLmRyb3BvdXQsXG4gICAgICByZWN1cnJlbnREcm9wb3V0OiB0aGlzLnJlY3VycmVudERyb3BvdXQsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogdGhpcy5pbXBsZW1lbnRhdGlvbixcbiAgICAgIHJlc2V0QWZ0ZXI6IGZhbHNlXG4gICAgfTtcblxuICAgIHJldHVybiB7Li4uYmFzZUNvbmZpZywgLi4uY29uZmlnfTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEdSVUNlbGwpO1xuXG4vLyBQb3J0aW5nIE5vdGU6IFNpbmNlIHRoaXMgaXMgYSBzdXBlcnNldCBvZiBTaW1wbGVSTk5MYXllckNvbmZpZywgd2UgaW5oZXJpdFxuLy8gICBmcm9tIHRoYXQgaW50ZXJmYWNlIGluc3RlYWQgb2YgcmVwZWF0aW5nIHRoZSBmaWVsZHMgaGVyZS5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBHUlVMYXllckFyZ3MgZXh0ZW5kcyBTaW1wbGVSTk5MYXllckFyZ3Mge1xuICAvKipcbiAgICogQWN0aXZhdGlvbiBmdW5jdGlvbiB0byB1c2UgZm9yIHRoZSByZWN1cnJlbnQgc3RlcC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gaGFyZCBzaWdtb2lkIChgaGFyZFNpZ21vaWRgKS5cbiAgICpcbiAgICogSWYgYG51bGxgLCBubyBhY3RpdmF0aW9uIGlzIGFwcGxpZWQuXG4gICAqL1xuICByZWN1cnJlbnRBY3RpdmF0aW9uPzogQWN0aXZhdGlvbklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG1vZGUsIGVpdGhlciAxIG9yIDIuXG4gICAqXG4gICAqIE1vZGUgMSB3aWxsIHN0cnVjdHVyZSBpdHMgb3BlcmF0aW9ucyBhcyBhIGxhcmdlciBudW1iZXIgb2ZcbiAgICogc21hbGxlciBkb3QgcHJvZHVjdHMgYW5kIGFkZGl0aW9ucy5cbiAgICpcbiAgICogTW9kZSAyIHdpbGwgYmF0Y2ggdGhlbSBpbnRvIGZld2VyLCBsYXJnZXIgb3BlcmF0aW9ucy4gVGhlc2UgbW9kZXMgd2lsbFxuICAgKiBoYXZlIGRpZmZlcmVudCBwZXJmb3JtYW5jZSBwcm9maWxlcyBvbiBkaWZmZXJlbnQgaGFyZHdhcmUgYW5kXG4gICAqIGZvciBkaWZmZXJlbnQgYXBwbGljYXRpb25zLlxuICAgKlxuICAgKiBOb3RlOiBGb3Igc3VwZXJpb3IgcGVyZm9ybWFuY2UsIFRlbnNvckZsb3cuanMgYWx3YXlzIHVzZXMgaW1wbGVtZW50YXRpb25cbiAgICogMiwgcmVnYXJkbGVzcyBvZiB0aGUgYWN0dWFsIHZhbHVlIG9mIHRoaXMgY29uZmlndXJhdGlvbiBmaWVsZC5cbiAgICovXG4gIGltcGxlbWVudGF0aW9uPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgR1JVIGV4dGVuZHMgUk5OIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBjbGFzc05hbWUgPSAnR1JVJztcbiAgY29uc3RydWN0b3IoYXJnczogR1JVTGF5ZXJBcmdzKSB7XG4gICAgaWYgKGFyZ3MuaW1wbGVtZW50YXRpb24gPT09IDApIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnYGltcGxlbWVudGF0aW9uPTBgIGhhcyBiZWVuIGRlcHJlY2F0ZWQsIGFuZCBub3cgZGVmYXVsdHMgdG8gJyArXG4gICAgICAgICAgJ2BpbXBsZW1lbnRhdGlvbj0xYC4gUGxlYXNlIHVwZGF0ZSB5b3VyIGxheWVyIGNhbGwuJyk7XG4gICAgfVxuICAgIGFyZ3MuY2VsbCA9IG5ldyBHUlVDZWxsKGFyZ3MpO1xuICAgIHN1cGVyKGFyZ3MgYXMgUk5OTGF5ZXJBcmdzKTtcbiAgICAvLyBUT0RPKGNhaXMpOiBBZGQgYWN0aXZpdHlSZWd1bGFyaXplci5cbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5jZWxsLmRyb3BvdXRNYXNrICE9IG51bGwpIHtcbiAgICAgICAgdGZjLmRpc3Bvc2UodGhpcy5jZWxsLmRyb3BvdXRNYXNrKTtcbiAgICAgICAgdGhpcy5jZWxsLmRyb3BvdXRNYXNrID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmNlbGwucmVjdXJyZW50RHJvcG91dE1hc2sgIT0gbnVsbCkge1xuICAgICAgICB0ZmMuZGlzcG9zZSh0aGlzLmNlbGwucmVjdXJyZW50RHJvcG91dE1hc2spO1xuICAgICAgICB0aGlzLmNlbGwucmVjdXJyZW50RHJvcG91dE1hc2sgPSBudWxsO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFzayA9IGt3YXJncyA9PSBudWxsID8gbnVsbCA6IGt3YXJnc1snbWFzayddO1xuICAgICAgY29uc3QgdHJhaW5pbmcgPSBrd2FyZ3MgPT0gbnVsbCA/IG51bGwgOiBrd2FyZ3NbJ3RyYWluaW5nJ107XG4gICAgICBjb25zdCBpbml0aWFsU3RhdGU6IFRlbnNvcltdID1cbiAgICAgICAgICBrd2FyZ3MgPT0gbnVsbCA/IG51bGwgOiBrd2FyZ3NbJ2luaXRpYWxTdGF0ZSddO1xuICAgICAgcmV0dXJuIHN1cGVyLmNhbGwoaW5wdXRzLCB7bWFzaywgdHJhaW5pbmcsIGluaXRpYWxTdGF0ZX0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBmcm9tQ29uZmlnPFQgZXh0ZW5kcyBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZT4oXG4gICAgICBjbHM6IHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4sXG4gICAgICBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCk6IFQge1xuICAgIGlmIChjb25maWdbJ2ltcGxtZW50YXRpb24nXSA9PT0gMCkge1xuICAgICAgY29uZmlnWydpbXBsZW1lbnRhdGlvbiddID0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBjbHMoY29uZmlnKTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKEdSVSk7XG5cbi8vIFBvcnRpbmcgTm90ZTogU2luY2UgdGhpcyBpcyBhIHN1cGVyc2V0IG9mIFNpbXBsZVJOTkxheWVyQ29uZmlnLCB3ZSBleHRlbmRcbi8vICAgdGhhdCBpbnRlcmZhY2UgaW5zdGVhZCBvZiByZXBlYXRpbmcgdGhlIGZpZWxkcy5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBMU1RNQ2VsbExheWVyQXJncyBleHRlbmRzIFNpbXBsZVJOTkNlbGxMYXllckFyZ3Mge1xuICAvKipcbiAgICogQWN0aXZhdGlvbiBmdW5jdGlvbiB0byB1c2UgZm9yIHRoZSByZWN1cnJlbnQgc3RlcC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gaGFyZCBzaWdtb2lkIChgaGFyZFNpZ21vaWRgKS5cbiAgICpcbiAgICogSWYgYG51bGxgLCBubyBhY3RpdmF0aW9uIGlzIGFwcGxpZWQuXG4gICAqL1xuICByZWN1cnJlbnRBY3RpdmF0aW9uPzogQWN0aXZhdGlvbklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIElmIGB0cnVlYCwgYWRkIDEgdG8gdGhlIGJpYXMgb2YgdGhlIGZvcmdldCBnYXRlIGF0IGluaXRpYWxpemF0aW9uLlxuICAgKiBTZXR0aW5nIGl0IHRvIGB0cnVlYCB3aWxsIGFsc28gZm9yY2UgYGJpYXNJbml0aWFsaXplciA9ICd6ZXJvcydgLlxuICAgKiBUaGlzIGlzIHJlY29tbWVuZGVkIGluXG4gICAqIFtKb3plZm93aWN6IGV0XG4gICAqIGFsLl0oaHR0cDovL3d3dy5qbWxyLm9yZy9wcm9jZWVkaW5ncy9wYXBlcnMvdjM3L2pvemVmb3dpY3oxNS5wZGYpXG4gICAqL1xuICB1bml0Rm9yZ2V0Qmlhcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG1vZGUsIGVpdGhlciAxIG9yIDIuXG4gICAqXG4gICAqIE1vZGUgMSB3aWxsIHN0cnVjdHVyZSBpdHMgb3BlcmF0aW9ucyBhcyBhIGxhcmdlciBudW1iZXIgb2ZcbiAgICogICBzbWFsbGVyIGRvdCBwcm9kdWN0cyBhbmQgYWRkaXRpb25zLlxuICAgKlxuICAgKiBNb2RlIDIgd2lsbCBiYXRjaCB0aGVtIGludG8gZmV3ZXIsIGxhcmdlciBvcGVyYXRpb25zLiBUaGVzZSBtb2RlcyB3aWxsXG4gICAqIGhhdmUgZGlmZmVyZW50IHBlcmZvcm1hbmNlIHByb2ZpbGVzIG9uIGRpZmZlcmVudCBoYXJkd2FyZSBhbmRcbiAgICogZm9yIGRpZmZlcmVudCBhcHBsaWNhdGlvbnMuXG4gICAqXG4gICAqIE5vdGU6IEZvciBzdXBlcmlvciBwZXJmb3JtYW5jZSwgVGVuc29yRmxvdy5qcyBhbHdheXMgdXNlcyBpbXBsZW1lbnRhdGlvblxuICAgKiAyLCByZWdhcmRsZXNzIG9mIHRoZSBhY3R1YWwgdmFsdWUgb2YgdGhpcyBjb25maWd1cmF0aW9uIGZpZWxkLlxuICAgKi9cbiAgaW1wbGVtZW50YXRpb24/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBMU1RNQ2VsbCBleHRlbmRzIFJOTkNlbGwge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdMU1RNQ2VsbCc7XG4gIHJlYWRvbmx5IHVuaXRzOiBudW1iZXI7XG4gIHJlYWRvbmx5IGFjdGl2YXRpb246IEFjdGl2YXRpb247XG4gIHJlYWRvbmx5IHJlY3VycmVudEFjdGl2YXRpb246IEFjdGl2YXRpb247XG4gIHJlYWRvbmx5IHVzZUJpYXM6IGJvb2xlYW47XG5cbiAgcmVhZG9ubHkga2VybmVsSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICByZWFkb25seSByZWN1cnJlbnRJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHJlYWRvbmx5IGJpYXNJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHJlYWRvbmx5IHVuaXRGb3JnZXRCaWFzOiBib29sZWFuO1xuXG4gIHJlYWRvbmx5IGtlcm5lbENvbnN0cmFpbnQ6IENvbnN0cmFpbnQ7XG4gIHJlYWRvbmx5IHJlY3VycmVudENvbnN0cmFpbnQ6IENvbnN0cmFpbnQ7XG4gIHJlYWRvbmx5IGJpYXNDb25zdHJhaW50OiBDb25zdHJhaW50O1xuXG4gIHJlYWRvbmx5IGtlcm5lbFJlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcbiAgcmVhZG9ubHkgcmVjdXJyZW50UmVndWxhcml6ZXI6IFJlZ3VsYXJpemVyO1xuICByZWFkb25seSBiaWFzUmVndWxhcml6ZXI6IFJlZ3VsYXJpemVyO1xuXG4gIHJlYWRvbmx5IGRyb3BvdXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgcmVjdXJyZW50RHJvcG91dDogbnVtYmVyO1xuICByZWFkb25seSBkcm9wb3V0RnVuYzogRnVuY3Rpb247XG5cbiAgcmVhZG9ubHkgc3RhdGVTaXplOiBudW1iZXJbXTtcbiAgcmVhZG9ubHkgaW1wbGVtZW50YXRpb246IG51bWJlcjtcblxuICByZWFkb25seSBERUZBVUxUX0FDVElWQVRJT04gPSAndGFuaCc7XG4gIHJlYWRvbmx5IERFRkFVTFRfUkVDVVJSRU5UX0FDVElWQVRJT04gPSAnaGFyZFNpZ21vaWQnO1xuICByZWFkb25seSBERUZBVUxUX0tFUk5FTF9JTklUSUFMSVpFUiA9ICdnbG9yb3ROb3JtYWwnO1xuICByZWFkb25seSBERUZBVUxUX1JFQ1VSUkVOVF9JTklUSUFMSVpFUiA9ICdvcnRob2dvbmFsJztcblxuICByZWFkb25seSBERUZBVUxUX0JJQVNfSU5JVElBTElaRVIgPSAnemVyb3MnO1xuXG4gIGtlcm5lbDogTGF5ZXJWYXJpYWJsZTtcbiAgcmVjdXJyZW50S2VybmVsOiBMYXllclZhcmlhYmxlO1xuICBiaWFzOiBMYXllclZhcmlhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IExTVE1DZWxsTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG5cbiAgICB0aGlzLnVuaXRzID0gYXJncy51bml0cztcbiAgICBhc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy51bml0cywgJ3VuaXRzJyk7XG4gICAgdGhpcy5hY3RpdmF0aW9uID0gZ2V0QWN0aXZhdGlvbihcbiAgICAgICAgYXJncy5hY3RpdmF0aW9uID09PSB1bmRlZmluZWQgPyB0aGlzLkRFRkFVTFRfQUNUSVZBVElPTiA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5hY3RpdmF0aW9uKTtcbiAgICB0aGlzLnJlY3VycmVudEFjdGl2YXRpb24gPSBnZXRBY3RpdmF0aW9uKFxuICAgICAgICBhcmdzLnJlY3VycmVudEFjdGl2YXRpb24gPT09IHVuZGVmaW5lZCA/XG4gICAgICAgICAgICB0aGlzLkRFRkFVTFRfUkVDVVJSRU5UX0FDVElWQVRJT04gOlxuICAgICAgICAgICAgYXJncy5yZWN1cnJlbnRBY3RpdmF0aW9uKTtcbiAgICB0aGlzLnVzZUJpYXMgPSBhcmdzLnVzZUJpYXMgPT0gbnVsbCA/IHRydWUgOiBhcmdzLnVzZUJpYXM7XG5cbiAgICB0aGlzLmtlcm5lbEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoXG4gICAgICAgIGFyZ3Mua2VybmVsSW5pdGlhbGl6ZXIgfHwgdGhpcy5ERUZBVUxUX0tFUk5FTF9JTklUSUFMSVpFUik7XG4gICAgdGhpcy5yZWN1cnJlbnRJbml0aWFsaXplciA9IGdldEluaXRpYWxpemVyKFxuICAgICAgICBhcmdzLnJlY3VycmVudEluaXRpYWxpemVyIHx8IHRoaXMuREVGQVVMVF9SRUNVUlJFTlRfSU5JVElBTElaRVIpO1xuXG4gICAgdGhpcy5iaWFzSW5pdGlhbGl6ZXIgPVxuICAgICAgICBnZXRJbml0aWFsaXplcihhcmdzLmJpYXNJbml0aWFsaXplciB8fCB0aGlzLkRFRkFVTFRfQklBU19JTklUSUFMSVpFUik7XG4gICAgdGhpcy51bml0Rm9yZ2V0QmlhcyA9IGFyZ3MudW5pdEZvcmdldEJpYXM7XG5cbiAgICB0aGlzLmtlcm5lbFJlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5rZXJuZWxSZWd1bGFyaXplcik7XG4gICAgdGhpcy5yZWN1cnJlbnRSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MucmVjdXJyZW50UmVndWxhcml6ZXIpO1xuICAgIHRoaXMuYmlhc1JlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5iaWFzUmVndWxhcml6ZXIpO1xuXG4gICAgdGhpcy5rZXJuZWxDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmtlcm5lbENvbnN0cmFpbnQpO1xuICAgIHRoaXMucmVjdXJyZW50Q29uc3RyYWludCA9IGdldENvbnN0cmFpbnQoYXJncy5yZWN1cnJlbnRDb25zdHJhaW50KTtcbiAgICB0aGlzLmJpYXNDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmJpYXNDb25zdHJhaW50KTtcblxuICAgIHRoaXMuZHJvcG91dCA9IG1hdGhfdXRpbHMubWluKFxuICAgICAgICBbMSwgbWF0aF91dGlscy5tYXgoWzAsIGFyZ3MuZHJvcG91dCA9PSBudWxsID8gMCA6IGFyZ3MuZHJvcG91dF0pXSk7XG4gICAgdGhpcy5yZWN1cnJlbnREcm9wb3V0ID0gbWF0aF91dGlscy5taW4oW1xuICAgICAgMSxcbiAgICAgIG1hdGhfdXRpbHMubWF4KFxuICAgICAgICAgIFswLCBhcmdzLnJlY3VycmVudERyb3BvdXQgPT0gbnVsbCA/IDAgOiBhcmdzLnJlY3VycmVudERyb3BvdXRdKVxuICAgIF0pO1xuICAgIHRoaXMuZHJvcG91dEZ1bmMgPSBhcmdzLmRyb3BvdXRGdW5jO1xuICAgIHRoaXMuaW1wbGVtZW50YXRpb24gPSBhcmdzLmltcGxlbWVudGF0aW9uO1xuICAgIHRoaXMuc3RhdGVTaXplID0gW3RoaXMudW5pdHMsIHRoaXMudW5pdHNdO1xuICAgIHRoaXMuZHJvcG91dE1hc2sgPSBudWxsO1xuICAgIHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgPSBudWxsO1xuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuICAgIGNvbnN0IGlucHV0RGltID0gaW5wdXRTaGFwZVtpbnB1dFNoYXBlLmxlbmd0aCAtIDFdO1xuICAgIHRoaXMua2VybmVsID0gdGhpcy5hZGRXZWlnaHQoXG4gICAgICAgICdrZXJuZWwnLCBbaW5wdXREaW0sIHRoaXMudW5pdHMgKiA0XSwgbnVsbCwgdGhpcy5rZXJuZWxJbml0aWFsaXplcixcbiAgICAgICAgdGhpcy5rZXJuZWxSZWd1bGFyaXplciwgdHJ1ZSwgdGhpcy5rZXJuZWxDb25zdHJhaW50KTtcbiAgICB0aGlzLnJlY3VycmVudEtlcm5lbCA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAncmVjdXJyZW50X2tlcm5lbCcsIFt0aGlzLnVuaXRzLCB0aGlzLnVuaXRzICogNF0sIG51bGwsXG4gICAgICAgIHRoaXMucmVjdXJyZW50SW5pdGlhbGl6ZXIsIHRoaXMucmVjdXJyZW50UmVndWxhcml6ZXIsIHRydWUsXG4gICAgICAgIHRoaXMucmVjdXJyZW50Q29uc3RyYWludCk7XG4gICAgbGV0IGJpYXNJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gICAgaWYgKHRoaXMudXNlQmlhcykge1xuICAgICAgaWYgKHRoaXMudW5pdEZvcmdldEJpYXMpIHtcbiAgICAgICAgY29uc3QgY2FwdHVyZWRCaWFzSW5pdCA9IHRoaXMuYmlhc0luaXRpYWxpemVyO1xuICAgICAgICBjb25zdCBjYXB0dXJlZFVuaXRzID0gdGhpcy51bml0cztcbiAgICAgICAgYmlhc0luaXRpYWxpemVyID0gbmV3IChjbGFzcyBDdXN0b21Jbml0IGV4dGVuZHMgSW5pdGlhbGl6ZXIge1xuICAgICAgICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgICAgICAgIHN0YXRpYyBjbGFzc05hbWUgPSAnQ3VzdG9tSW5pdCc7XG5cbiAgICAgICAgICBhcHBseShzaGFwZTogU2hhcGUsIGR0eXBlPzogRGF0YVR5cGUpOiBUZW5zb3Ige1xuICAgICAgICAgICAgLy8gVE9ETyhjYWlzKTogTW9yZSBpbmZvcm1hdGl2ZSB2YXJpYWJsZSBuYW1lcz9cbiAgICAgICAgICAgIGNvbnN0IGJJID0gY2FwdHVyZWRCaWFzSW5pdC5hcHBseShbY2FwdHVyZWRVbml0c10pO1xuICAgICAgICAgICAgY29uc3QgYkYgPSAobmV3IE9uZXMoKSkuYXBwbHkoW2NhcHR1cmVkVW5pdHNdKTtcbiAgICAgICAgICAgIGNvbnN0IGJDQW5kSCA9IGNhcHR1cmVkQmlhc0luaXQuYXBwbHkoW2NhcHR1cmVkVW5pdHMgKiAyXSk7XG4gICAgICAgICAgICByZXR1cm4gSy5jb25jYXRBbG9uZ0ZpcnN0QXhpcyhcbiAgICAgICAgICAgICAgICBLLmNvbmNhdEFsb25nRmlyc3RBeGlzKGJJLCBiRiksIGJDQW5kSCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmlhc0luaXRpYWxpemVyID0gdGhpcy5iaWFzSW5pdGlhbGl6ZXI7XG4gICAgICB9XG4gICAgICB0aGlzLmJpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAnYmlhcycsIFt0aGlzLnVuaXRzICogNF0sIG51bGwsIGJpYXNJbml0aWFsaXplciwgdGhpcy5iaWFzUmVndWxhcml6ZXIsXG4gICAgICAgICAgdHJ1ZSwgdGhpcy5iaWFzQ29uc3RyYWludCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYmlhcyA9IG51bGw7XG4gICAgfVxuICAgIC8vIFBvcnRpbmcgTm90ZXM6IFVubGlrZSB0aGUgUHlLZXJhcyBpbXBsZW1lbnRhdGlvbiwgd2UgcGVyZm9ybSBzbGljaW5nXG4gICAgLy8gICBvZiB0aGUgd2VpZ2h0cyBhbmQgYmlhcyBpbiB0aGUgY2FsbCgpIG1ldGhvZCwgYXQgZXhlY3V0aW9uIHRpbWUuXG4gICAgdGhpcy5idWlsdCA9IHRydWU7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgY29uc3QgdHJhaW5pbmcgPSBrd2FyZ3NbJ3RyYWluaW5nJ10gPT0gbnVsbCA/IGZhbHNlIDoga3dhcmdzWyd0cmFpbmluZyddO1xuICAgICAgaW5wdXRzID0gaW5wdXRzIGFzIFRlbnNvcltdO1xuICAgICAgaWYgKGlucHV0cy5sZW5ndGggIT09IDMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICBgTFNUTUNlbGwgZXhwZWN0cyAzIGlucHV0IFRlbnNvcnMgKGlucHV0cywgaCwgYyksIGdvdCBgICtcbiAgICAgICAgICAgIGAke2lucHV0cy5sZW5ndGh9LmApO1xuICAgICAgfVxuICAgICAgbGV0IGhUTWludXMxID0gaW5wdXRzWzFdOyAgICAvLyBQcmV2aW91cyBtZW1vcnkgc3RhdGUuXG4gICAgICBjb25zdCBjVE1pbnVzMSA9IGlucHV0c1syXTsgIC8vIFByZXZpb3VzIGNhcnJ5IHN0YXRlLlxuICAgICAgaW5wdXRzID0gaW5wdXRzWzBdO1xuICAgICAgaWYgKDAgPCB0aGlzLmRyb3BvdXQgJiYgdGhpcy5kcm9wb3V0IDwgMSAmJiB0aGlzLmRyb3BvdXRNYXNrID09IG51bGwpIHtcbiAgICAgICAgdGhpcy5kcm9wb3V0TWFzayA9IGdlbmVyYXRlRHJvcG91dE1hc2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmVzOiAoKSA9PiB0ZmMub25lc0xpa2UoaW5wdXRzIGFzIFRlbnNvciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhdGU6IHRoaXMuZHJvcG91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhaW5pbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiA0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcm9wb3V0RnVuYzogdGhpcy5kcm9wb3V0RnVuY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkgYXMgVGVuc29yW107XG4gICAgICB9XG4gICAgICBpZiAoMCA8IHRoaXMucmVjdXJyZW50RHJvcG91dCAmJiB0aGlzLnJlY3VycmVudERyb3BvdXQgPCAxICYmXG4gICAgICAgICAgdGhpcy5yZWN1cnJlbnREcm9wb3V0TWFzayA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgPSBnZW5lcmF0ZURyb3BvdXRNYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25lczogKCkgPT4gdGZjLm9uZXNMaWtlKGhUTWludXMxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF0ZTogdGhpcy5yZWN1cnJlbnREcm9wb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFpbmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyb3BvdXRGdW5jOiB0aGlzLmRyb3BvdXRGdW5jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSBhcyBUZW5zb3JbXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRwTWFzayA9IHRoaXMuZHJvcG91dE1hc2sgYXMgW1RlbnNvciwgVGVuc29yLCBUZW5zb3IsIFRlbnNvcl07XG4gICAgICBjb25zdCByZWNEcE1hc2sgPVxuICAgICAgICAgIHRoaXMucmVjdXJyZW50RHJvcG91dE1hc2sgYXMgW1RlbnNvciwgVGVuc29yLCBUZW5zb3IsIFRlbnNvcl07XG5cbiAgICAgIC8vIE5vdGU6IEZvciBzdXBlcmlvciBwZXJmb3JtYW5jZSwgVGVuc29yRmxvdy5qcyBhbHdheXMgdXNlc1xuICAgICAgLy8gaW1wbGVtZW50YXRpb24gMiByZWdhcmRsZXNzIG9mIHRoZSBhY3R1YWwgdmFsdWUgb2ZcbiAgICAgIC8vIGNvbmZpZy5pbXBsZW1lbnRhdGlvbi5cbiAgICAgIGxldCBpOiBUZW5zb3I7XG4gICAgICBsZXQgZjogVGVuc29yO1xuICAgICAgbGV0IGM6IFRlbnNvcjtcbiAgICAgIGxldCBvOiBUZW5zb3I7XG4gICAgICBpZiAoMCA8IHRoaXMuZHJvcG91dCAmJiB0aGlzLmRyb3BvdXQgPCAxKSB7XG4gICAgICAgIGlucHV0cyA9IHRmYy5tdWwoaW5wdXRzLCBkcE1hc2tbMF0pO1xuICAgICAgfVxuICAgICAgbGV0IHogPSBLLmRvdChpbnB1dHMsIHRoaXMua2VybmVsLnJlYWQoKSk7XG4gICAgICBpZiAoMCA8IHRoaXMucmVjdXJyZW50RHJvcG91dCAmJiB0aGlzLnJlY3VycmVudERyb3BvdXQgPCAxKSB7XG4gICAgICAgIGhUTWludXMxID0gdGZjLm11bChoVE1pbnVzMSwgcmVjRHBNYXNrWzBdKTtcbiAgICAgIH1cbiAgICAgIHogPSB0ZmMuYWRkKHosIEsuZG90KGhUTWludXMxLCB0aGlzLnJlY3VycmVudEtlcm5lbC5yZWFkKCkpKTtcbiAgICAgIGlmICh0aGlzLnVzZUJpYXMpIHtcbiAgICAgICAgeiA9IEsuYmlhc0FkZCh6LCB0aGlzLmJpYXMucmVhZCgpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgW3owLCB6MSwgejIsIHozXSA9IHRmYy5zcGxpdCh6LCA0LCB6LnJhbmsgLSAxKTtcblxuICAgICAgaSA9IHRoaXMucmVjdXJyZW50QWN0aXZhdGlvbi5hcHBseSh6MCk7XG4gICAgICBmID0gdGhpcy5yZWN1cnJlbnRBY3RpdmF0aW9uLmFwcGx5KHoxKTtcbiAgICAgIGMgPSB0ZmMuYWRkKHRmYy5tdWwoZiwgY1RNaW51czEpLCB0ZmMubXVsKGksIHRoaXMuYWN0aXZhdGlvbi5hcHBseSh6MikpKTtcbiAgICAgIG8gPSB0aGlzLnJlY3VycmVudEFjdGl2YXRpb24uYXBwbHkoejMpO1xuXG4gICAgICBjb25zdCBoID0gdGZjLm11bChvLCB0aGlzLmFjdGl2YXRpb24uYXBwbHkoYykpO1xuICAgICAgLy8gVE9ETyhjYWlzKTogQWRkIHVzZV9sZWFybmluZ19waGFzZSBmbGFnIHByb3Blcmx5LlxuICAgICAgcmV0dXJuIFtoLCBoLCBjXTtcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcblxuICAgIGNvbnN0IGNvbmZpZzogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0ID0ge1xuICAgICAgdW5pdHM6IHRoaXMudW5pdHMsXG4gICAgICBhY3RpdmF0aW9uOiBzZXJpYWxpemVBY3RpdmF0aW9uKHRoaXMuYWN0aXZhdGlvbiksXG4gICAgICByZWN1cnJlbnRBY3RpdmF0aW9uOiBzZXJpYWxpemVBY3RpdmF0aW9uKHRoaXMucmVjdXJyZW50QWN0aXZhdGlvbiksXG4gICAgICB1c2VCaWFzOiB0aGlzLnVzZUJpYXMsXG4gICAgICBrZXJuZWxJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5rZXJuZWxJbml0aWFsaXplciksXG4gICAgICByZWN1cnJlbnRJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5yZWN1cnJlbnRJbml0aWFsaXplciksXG4gICAgICBiaWFzSW5pdGlhbGl6ZXI6IHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMuYmlhc0luaXRpYWxpemVyKSxcbiAgICAgIHVuaXRGb3JnZXRCaWFzOiB0aGlzLnVuaXRGb3JnZXRCaWFzLFxuICAgICAga2VybmVsUmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMua2VybmVsUmVndWxhcml6ZXIpLFxuICAgICAgcmVjdXJyZW50UmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMucmVjdXJyZW50UmVndWxhcml6ZXIpLFxuICAgICAgYmlhc1JlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmJpYXNSZWd1bGFyaXplciksXG4gICAgICBhY3Rpdml0eVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIpLFxuICAgICAga2VybmVsQ29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLmtlcm5lbENvbnN0cmFpbnQpLFxuICAgICAgcmVjdXJyZW50Q29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLnJlY3VycmVudENvbnN0cmFpbnQpLFxuICAgICAgYmlhc0NvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5iaWFzQ29uc3RyYWludCksXG4gICAgICBkcm9wb3V0OiB0aGlzLmRyb3BvdXQsXG4gICAgICByZWN1cnJlbnREcm9wb3V0OiB0aGlzLnJlY3VycmVudERyb3BvdXQsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogdGhpcy5pbXBsZW1lbnRhdGlvbixcbiAgICB9O1xuXG4gICAgcmV0dXJuIHsuLi5iYXNlQ29uZmlnLCAuLi5jb25maWd9O1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTFNUTUNlbGwpO1xuXG4vLyBQb3J0aW5nIE5vdGU6IFNpbmNlIHRoaXMgaXMgYSBzdXBlcnNldCBvZiBTaW1wbGVSTk5MYXllckNvbmZpZywgd2UgaW5oZXJpdFxuLy8gICBmcm9tIHRoYXQgaW50ZXJmYWNlIGluc3RlYWQgb2YgcmVwZWF0aW5nIHRoZSBmaWVsZHMgaGVyZS5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBMU1RNTGF5ZXJBcmdzIGV4dGVuZHMgU2ltcGxlUk5OTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIEFjdGl2YXRpb24gZnVuY3Rpb24gdG8gdXNlIGZvciB0aGUgcmVjdXJyZW50IHN0ZXAuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGhhcmQgc2lnbW9pZCAoYGhhcmRTaWdtb2lkYCkuXG4gICAqXG4gICAqIElmIGBudWxsYCwgbm8gYWN0aXZhdGlvbiBpcyBhcHBsaWVkLlxuICAgKi9cbiAgcmVjdXJyZW50QWN0aXZhdGlvbj86IEFjdGl2YXRpb25JZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIGFkZCAxIHRvIHRoZSBiaWFzIG9mIHRoZSBmb3JnZXQgZ2F0ZSBhdCBpbml0aWFsaXphdGlvbi5cbiAgICogU2V0dGluZyBpdCB0byBgdHJ1ZWAgd2lsbCBhbHNvIGZvcmNlIGBiaWFzSW5pdGlhbGl6ZXIgPSAnemVyb3MnYC5cbiAgICogVGhpcyBpcyByZWNvbW1lbmRlZCBpblxuICAgKiBbSm96ZWZvd2ljeiBldFxuICAgKiBhbC5dKGh0dHA6Ly93d3cuam1sci5vcmcvcHJvY2VlZGluZ3MvcGFwZXJzL3YzNy9qb3plZm93aWN6MTUucGRmKVxuICAgKi9cbiAgdW5pdEZvcmdldEJpYXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBtb2RlLCBlaXRoZXIgMSBvciAyLlxuICAgKiAgIE1vZGUgMSB3aWxsIHN0cnVjdHVyZSBpdHMgb3BlcmF0aW9ucyBhcyBhIGxhcmdlciBudW1iZXIgb2ZcbiAgICogICBzbWFsbGVyIGRvdCBwcm9kdWN0cyBhbmQgYWRkaXRpb25zLCB3aGVyZWFzIG1vZGUgMiB3aWxsXG4gICAqICAgYmF0Y2ggdGhlbSBpbnRvIGZld2VyLCBsYXJnZXIgb3BlcmF0aW9ucy4gVGhlc2UgbW9kZXMgd2lsbFxuICAgKiAgIGhhdmUgZGlmZmVyZW50IHBlcmZvcm1hbmNlIHByb2ZpbGVzIG9uIGRpZmZlcmVudCBoYXJkd2FyZSBhbmRcbiAgICogICBmb3IgZGlmZmVyZW50IGFwcGxpY2F0aW9ucy5cbiAgICpcbiAgICogTm90ZTogRm9yIHN1cGVyaW9yIHBlcmZvcm1hbmNlLCBUZW5zb3JGbG93LmpzIGFsd2F5cyB1c2VzIGltcGxlbWVudGF0aW9uXG4gICAqIDIsIHJlZ2FyZGxlc3Mgb2YgdGhlIGFjdHVhbCB2YWx1ZSBvZiB0aGlzIGNvbmZpZyBmaWVsZC5cbiAgICovXG4gIGltcGxlbWVudGF0aW9uPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgTFNUTSBleHRlbmRzIFJOTiB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgY2xhc3NOYW1lID0gJ0xTVE0nO1xuICBjb25zdHJ1Y3RvcihhcmdzOiBMU1RNTGF5ZXJBcmdzKSB7XG4gICAgaWYgKGFyZ3MuaW1wbGVtZW50YXRpb24gPT09IDApIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnYGltcGxlbWVudGF0aW9uPTBgIGhhcyBiZWVuIGRlcHJlY2F0ZWQsIGFuZCBub3cgZGVmYXVsdHMgdG8gJyArXG4gICAgICAgICAgJ2BpbXBsZW1lbnRhdGlvbj0xYC4gUGxlYXNlIHVwZGF0ZSB5b3VyIGxheWVyIGNhbGwuJyk7XG4gICAgfVxuICAgIGFyZ3MuY2VsbCA9IG5ldyBMU1RNQ2VsbChhcmdzKTtcbiAgICBzdXBlcihhcmdzIGFzIFJOTkxheWVyQXJncyk7XG4gICAgLy8gVE9ETyhjYWlzKTogQWRkIGFjdGl2aXR5UmVndWxhcml6ZXIuXG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY2VsbC5kcm9wb3V0TWFzayAhPSBudWxsKSB7XG4gICAgICAgIHRmYy5kaXNwb3NlKHRoaXMuY2VsbC5kcm9wb3V0TWFzayk7XG4gICAgICAgIHRoaXMuY2VsbC5kcm9wb3V0TWFzayA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jZWxsLnJlY3VycmVudERyb3BvdXRNYXNrICE9IG51bGwpIHtcbiAgICAgICAgdGZjLmRpc3Bvc2UodGhpcy5jZWxsLnJlY3VycmVudERyb3BvdXRNYXNrKTtcbiAgICAgICAgdGhpcy5jZWxsLnJlY3VycmVudERyb3BvdXRNYXNrID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hc2sgPSBrd2FyZ3MgPT0gbnVsbCA/IG51bGwgOiBrd2FyZ3NbJ21hc2snXTtcbiAgICAgIGNvbnN0IHRyYWluaW5nID0ga3dhcmdzID09IG51bGwgPyBudWxsIDoga3dhcmdzWyd0cmFpbmluZyddO1xuICAgICAgY29uc3QgaW5pdGlhbFN0YXRlOiBUZW5zb3JbXSA9XG4gICAgICAgICAga3dhcmdzID09IG51bGwgPyBudWxsIDoga3dhcmdzWydpbml0aWFsU3RhdGUnXTtcbiAgICAgIHJldHVybiBzdXBlci5jYWxsKGlucHV0cywge21hc2ssIHRyYWluaW5nLCBpbml0aWFsU3RhdGV9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgZnJvbUNvbmZpZzxUIGV4dGVuZHMgc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGU+KFxuICAgICAgY2xzOiBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFQ+LFxuICAgICAgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QpOiBUIHtcbiAgICBpZiAoY29uZmlnWydpbXBsbWVudGF0aW9uJ10gPT09IDApIHtcbiAgICAgIGNvbmZpZ1snaW1wbGVtZW50YXRpb24nXSA9IDE7XG4gICAgfVxuICAgIHJldHVybiBuZXcgY2xzKGNvbmZpZyk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhMU1RNKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFN0YWNrZWRSTk5DZWxsc0FyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogQW4gYEFycmF5YCBvZiBgUk5OQ2VsbGAgaW5zdGFuY2VzLlxuICAgKi9cbiAgY2VsbHM6IFJOTkNlbGxbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFN0YWNrZWRSTk5DZWxscyBleHRlbmRzIFJOTkNlbGwge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdTdGFja2VkUk5OQ2VsbHMnO1xuICBwcm90ZWN0ZWQgY2VsbHM6IFJOTkNlbGxbXTtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBTdGFja2VkUk5OQ2VsbHNBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5jZWxscyA9IGFyZ3MuY2VsbHM7XG4gIH1cblxuICBnZXQgc3RhdGVTaXplKCk6IG51bWJlcltdIHtcbiAgICAvLyBTdGF0ZXMgYXJlIGEgZmxhdCBsaXN0IGluIHJldmVyc2Ugb3JkZXIgb2YgdGhlIGNlbGwgc3RhY2suXG4gICAgLy8gVGhpcyBhbGxvd3MgcHJlc2VydmluZyB0aGUgcmVxdWlyZW1lbnQgYHN0YWNrLnN0YXRlc2l6ZVswXSA9PT1cbiAgICAvLyBvdXRwdXREaW1gLiBFLmcuLCBzdGF0ZXMgb2YgYSAyLWxheWVyIExTVE0gd291bGQgYmUgYFtoMiwgYzIsIGgxLCBjMV1gLFxuICAgIC8vIGFzc3VtaW5nIG9uZSBMU1RNIGhhcyBzdGF0ZXMgYFtoLCBjXWAuXG4gICAgY29uc3Qgc3RhdGVTaXplOiBudW1iZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2VsbCBvZiB0aGlzLmNlbGxzLnNsaWNlKCkucmV2ZXJzZSgpKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjZWxsLnN0YXRlU2l6ZSkpIHtcbiAgICAgICAgc3RhdGVTaXplLnB1c2goLi4uY2VsbC5zdGF0ZVNpemUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGVTaXplLnB1c2goY2VsbC5zdGF0ZVNpemUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3RhdGVTaXplO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlucHV0cyA9IGlucHV0cyBhcyBUZW5zb3JbXTtcbiAgICAgIGxldCBzdGF0ZXMgPSBpbnB1dHMuc2xpY2UoMSk7XG5cbiAgICAgIC8vIFJlY292ZXIgcGVyLWNlbGwgc3RhdGVzLlxuICAgICAgY29uc3QgbmVzdGVkU3RhdGVzOiBUZW5zb3JbXVtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGNlbGwgb2YgdGhpcy5jZWxscy5zbGljZSgpLnJldmVyc2UoKSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjZWxsLnN0YXRlU2l6ZSkpIHtcbiAgICAgICAgICBuZXN0ZWRTdGF0ZXMucHVzaChzdGF0ZXMuc3BsaWNlKDAsIGNlbGwuc3RhdGVTaXplLmxlbmd0aCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5lc3RlZFN0YXRlcy5wdXNoKHN0YXRlcy5zcGxpY2UoMCwgMSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBuZXN0ZWRTdGF0ZXMucmV2ZXJzZSgpO1xuXG4gICAgICAvLyBDYWxsIHRoZSBjZWxscyBpbiBvcmRlciBhbmQgc3RvcmUgdGhlIHJldHVybmVkIHN0YXRlcy5cbiAgICAgIGNvbnN0IG5ld05lc3RlZFN0YXRlczogVGVuc29yW11bXSA9IFtdO1xuICAgICAgbGV0IGNhbGxJbnB1dHM6IFRlbnNvcltdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNlbGxzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGNvbnN0IGNlbGwgPSB0aGlzLmNlbGxzW2ldO1xuICAgICAgICBzdGF0ZXMgPSBuZXN0ZWRTdGF0ZXNbaV07XG4gICAgICAgIC8vIFRPRE8oY2Fpcyk6IFRha2UgY2FyZSBvZiBjb25zdGFudHMuXG4gICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgY2FsbElucHV0cyA9IFtpbnB1dHNbMF1dLmNvbmNhdChzdGF0ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxJbnB1dHMgPSBbY2FsbElucHV0c1swXV0uY29uY2F0KHN0YXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbElucHV0cyA9IGNlbGwuY2FsbChjYWxsSW5wdXRzLCBrd2FyZ3MpIGFzIFRlbnNvcltdO1xuICAgICAgICBuZXdOZXN0ZWRTdGF0ZXMucHVzaChjYWxsSW5wdXRzLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgLy8gRm9ybWF0IHRoZSBuZXcgc3RhdGVzIGFzIGEgZmxhdCBsaXN0IGluIHJldmVyc2UgY2VsbCBvcmRlci5cbiAgICAgIHN0YXRlcyA9IFtdO1xuICAgICAgZm9yIChjb25zdCBjZWxsU3RhdGVzIG9mIG5ld05lc3RlZFN0YXRlcy5zbGljZSgpLnJldmVyc2UoKSkge1xuICAgICAgICBzdGF0ZXMucHVzaCguLi5jZWxsU3RhdGVzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbY2FsbElucHV0c1swXV0uY29uY2F0KHN0YXRlcyk7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIGlmIChpc0FycmF5T2ZTaGFwZXMoaW5wdXRTaGFwZSkpIHtcbiAgICAgIC8vIFRPRE8oY2Fpcyk6IFRha2UgY2FyZSBvZiBpbnB1dCBjb25zdGFudHMuXG4gICAgICAvLyBjb25zdCBjb25zdGFudFNoYXBlID0gaW5wdXRTaGFwZS5zbGljZSgxKTtcbiAgICAgIGlucHV0U2hhcGUgPSAoaW5wdXRTaGFwZSBhcyBTaGFwZVtdKVswXTtcbiAgICB9XG4gICAgaW5wdXRTaGFwZSA9IGlucHV0U2hhcGUgYXMgU2hhcGU7XG4gICAgbGV0IG91dHB1dERpbTogbnVtYmVyO1xuICAgIHRoaXMuY2VsbHMuZm9yRWFjaCgoY2VsbCwgaSkgPT4ge1xuICAgICAgbmFtZVNjb3BlKGBSTk5DZWxsXyR7aX1gLCAoKSA9PiB7XG4gICAgICAgIC8vIFRPRE8oY2Fpcyk6IFRha2UgY2FyZSBvZiBpbnB1dCBjb25zdGFudHMuXG5cbiAgICAgICAgY2VsbC5idWlsZChpbnB1dFNoYXBlKTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2VsbC5zdGF0ZVNpemUpKSB7XG4gICAgICAgICAgb3V0cHV0RGltID0gY2VsbC5zdGF0ZVNpemVbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0cHV0RGltID0gY2VsbC5zdGF0ZVNpemU7XG4gICAgICAgIH1cbiAgICAgICAgaW5wdXRTaGFwZSA9IFtpbnB1dFNoYXBlWzBdLCBvdXRwdXREaW1dIGFzIFNoYXBlO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5idWlsdCA9IHRydWU7XG4gIH1cblxuICBvdmVycmlkZSBnZXRDb25maWcoKTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0IHtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG5cbiAgICBjb25zdCBnZXRDZWxsQ29uZmlnID0gKGNlbGw6IFJOTkNlbGwpID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICdjbGFzc05hbWUnOiBjZWxsLmdldENsYXNzTmFtZSgpLFxuICAgICAgICAnY29uZmlnJzogY2VsbC5nZXRDb25maWcoKSxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGNvbnN0IGNlbGxDb25maWdzID0gdGhpcy5jZWxscy5tYXAoZ2V0Q2VsbENvbmZpZyk7XG5cbiAgICBjb25zdCBjb25maWcgPSB7J2NlbGxzJzogY2VsbENvbmZpZ3N9O1xuXG4gICAgcmV0dXJuIHsuLi5iYXNlQ29uZmlnLCAuLi5jb25maWd9O1xuICB9XG5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBvdmVycmlkZSBmcm9tQ29uZmlnPFQgZXh0ZW5kcyBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZT4oXG4gICAgICBjbHM6IHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4sXG4gICAgICBjb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCxcbiAgICAgIGN1c3RvbU9iamVjdHMgPSB7fSBhcyBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QpOiBUIHtcbiAgICBjb25zdCBjZWxsczogUk5OQ2VsbFtdID0gW107XG4gICAgZm9yIChjb25zdCBjZWxsQ29uZmlnIG9mIChjb25maWdbJ2NlbGxzJ10gYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0W10pKSB7XG4gICAgICBjZWxscy5wdXNoKGRlc2VyaWFsaXplKGNlbGxDb25maWcsIGN1c3RvbU9iamVjdHMpIGFzIFJOTkNlbGwpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IGNscyh7Y2VsbHN9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCB0cmFpbmFibGVXZWlnaHRzKCk6IExheWVyVmFyaWFibGVbXSB7XG4gICAgaWYgKCF0aGlzLnRyYWluYWJsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCB3ZWlnaHRzOiBMYXllclZhcmlhYmxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNlbGwgb2YgdGhpcy5jZWxscykge1xuICAgICAgd2VpZ2h0cy5wdXNoKC4uLmNlbGwudHJhaW5hYmxlV2VpZ2h0cyk7XG4gICAgfVxuICAgIHJldHVybiB3ZWlnaHRzO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IG5vblRyYWluYWJsZVdlaWdodHMoKTogTGF5ZXJWYXJpYWJsZVtdIHtcbiAgICBjb25zdCB3ZWlnaHRzOiBMYXllclZhcmlhYmxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNlbGwgb2YgdGhpcy5jZWxscykge1xuICAgICAgd2VpZ2h0cy5wdXNoKC4uLmNlbGwubm9uVHJhaW5hYmxlV2VpZ2h0cyk7XG4gICAgfVxuICAgIGlmICghdGhpcy50cmFpbmFibGUpIHtcbiAgICAgIGNvbnN0IHRyYWluYWJsZVdlaWdodHM6IExheWVyVmFyaWFibGVbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBjZWxsIG9mIHRoaXMuY2VsbHMpIHtcbiAgICAgICAgdHJhaW5hYmxlV2VpZ2h0cy5wdXNoKC4uLmNlbGwudHJhaW5hYmxlV2VpZ2h0cyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJhaW5hYmxlV2VpZ2h0cy5jb25jYXQod2VpZ2h0cyk7XG4gICAgfVxuICAgIHJldHVybiB3ZWlnaHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSB3ZWlnaHRzIG9mIGEgdGhlIG1vZGVsLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGZsYXQgYEFycmF5YCBvZiBgdGYuVGVuc29yYHMuXG4gICAqL1xuICBvdmVycmlkZSBnZXRXZWlnaHRzKCk6IFRlbnNvcltdIHtcbiAgICBjb25zdCB3ZWlnaHRzOiBMYXllclZhcmlhYmxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNlbGwgb2YgdGhpcy5jZWxscykge1xuICAgICAgd2VpZ2h0cy5wdXNoKC4uLmNlbGwud2VpZ2h0cyk7XG4gICAgfVxuICAgIHJldHVybiBiYXRjaEdldFZhbHVlKHdlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgd2VpZ2h0cyBvZiB0aGUgbW9kZWwuXG4gICAqXG4gICAqIEBwYXJhbSB3ZWlnaHRzIEFuIGBBcnJheWAgb2YgYHRmLlRlbnNvcmBzIHdpdGggc2hhcGVzIGFuZCB0eXBlcyBtYXRjaGluZ1xuICAgKiAgICAgdGhlIG91dHB1dCBvZiBgZ2V0V2VpZ2h0cygpYC5cbiAgICovXG4gIG92ZXJyaWRlIHNldFdlaWdodHMod2VpZ2h0czogVGVuc29yW10pOiB2b2lkIHtcbiAgICBjb25zdCB0dXBsZXM6IEFycmF5PFtMYXllclZhcmlhYmxlLCBUZW5zb3JdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgY2VsbCBvZiB0aGlzLmNlbGxzKSB7XG4gICAgICBjb25zdCBudW1QYXJhbXMgPSBjZWxsLndlaWdodHMubGVuZ3RoO1xuICAgICAgY29uc3QgaW5wdXRXZWlnaHRzID0gd2VpZ2h0cy5zcGxpY2UobnVtUGFyYW1zKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2VsbC53ZWlnaHRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHR1cGxlcy5wdXNoKFtjZWxsLndlaWdodHNbaV0sIGlucHV0V2VpZ2h0c1tpXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBiYXRjaFNldFZhbHVlKHR1cGxlcyk7XG4gIH1cblxuICAvLyBUT0RPKGNhaXMpOiBNYXliZSBpbXBsZW1lbnQgYGxvc3Nlc2AgYW5kIGBnZXRMb3NzZXNGb3JgLlxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFN0YWNrZWRSTk5DZWxscyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZURyb3BvdXRNYXNrKGFyZ3M6IHtcbiAgb25lczogKCkgPT4gdGZjLlRlbnNvcixcbiAgcmF0ZTogbnVtYmVyLFxuICB0cmFpbmluZz86IGJvb2xlYW4sXG4gIGNvdW50PzogbnVtYmVyLFxuICBkcm9wb3V0RnVuYz86IEZ1bmN0aW9uLFxufSk6IHRmYy5UZW5zb3J8dGZjLlRlbnNvcltdIHtcbiAgY29uc3Qge29uZXMsIHJhdGUsIHRyYWluaW5nID0gZmFsc2UsIGNvdW50ID0gMSwgZHJvcG91dEZ1bmN9ID0gYXJncztcblxuICBjb25zdCBkcm9wcGVkSW5wdXRzID0gKCkgPT5cbiAgICAgIGRyb3BvdXRGdW5jICE9IG51bGwgPyBkcm9wb3V0RnVuYyhvbmVzKCksIHJhdGUpIDogSy5kcm9wb3V0KG9uZXMoKSwgcmF0ZSk7XG5cbiAgY29uc3QgY3JlYXRlTWFzayA9ICgpID0+IEsuaW5UcmFpblBoYXNlKGRyb3BwZWRJbnB1dHMsIG9uZXMsIHRyYWluaW5nKTtcblxuICAvLyBqdXN0IGluIGNhc2UgY291bnQgaXMgcHJvdmlkZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZFxuICBpZiAoIWNvdW50IHx8IGNvdW50IDw9IDEpIHtcbiAgICByZXR1cm4gdGZjLmtlZXAoY3JlYXRlTWFzaygpLmNsb25lKCkpO1xuICB9XG5cbiAgY29uc3QgbWFza3MgPSBBcnJheShjb3VudCkuZmlsbCh1bmRlZmluZWQpLm1hcChjcmVhdGVNYXNrKTtcblxuICByZXR1cm4gbWFza3MubWFwKG0gPT4gdGZjLmtlZXAobS5jbG9uZSgpKSk7XG59XG4iXX0=