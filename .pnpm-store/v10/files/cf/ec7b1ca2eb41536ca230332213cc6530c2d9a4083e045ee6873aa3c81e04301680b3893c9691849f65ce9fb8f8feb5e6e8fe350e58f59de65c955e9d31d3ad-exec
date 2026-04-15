/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/* Original source keras/models.py */
import { dispose, io, serialization, util } from '@tensorflow/tfjs-core';
import { getUid } from './backend/state';
import { Input } from './engine/input_layer';
import { getSourceInputs, Node } from './engine/topology';
import { LayersModel } from './engine/training';
import { NotImplementedError, RuntimeError, ValueError } from './errors';
import { deserialize } from './layers/serialization';
import * as generic_utils from './utils/generic_utils';
import { convertPythonicToTs } from './utils/serialization_utils';
import { getExactlyOneShape } from './utils/types_utils';
/**
 * Parses a JSON model configuration file and returns a model instance.
 *
 * ```js
 * // This example shows how to serialize a model using `toJSON()` and
 * // deserialize it as another model using `tf.models.modelFromJSON()`.
 * // Note: this example serializes and deserializes only the topology
 * // of the model; the weights of the loaded model will be different
 * // from those of the the original model, due to random weight
 * // initialization.
 * // To load the topology and weights of a model, use `tf.loadLayersModel()`.
 * const model1 = tf.sequential();
 * model1.add(tf.layers.repeatVector({inputShape: [2], n: 4}));
 * // Serialize `model1` as a JSON object.
 * const model1JSON = model1.toJSON(null, false);
 * model1.summary();
 *
 * const model2 = await tf.models.modelFromJSON(model1JSON);
 * model2.summary();
 * ```
 *
 *  @param modelAndWeightsConfig JSON object or string encoding a model and
 *       weights configuration. It can also be only the topology JSON of the
 *       model, in which case the weights will not be loaded.
 *  @param custom_objects Optional dictionary mapping names
 *       (strings) to custom classes or functions to be
 *       considered during deserialization.
 * @returns A TensorFlow.js Layers `tf.LayersModel` instance (uncompiled).
 */
export async function modelFromJSON(modelAndWeightsConfig, customObjects) {
    if (!('modelTopology' in modelAndWeightsConfig)) {
        modelAndWeightsConfig = { modelTopology: modelAndWeightsConfig };
    }
    modelAndWeightsConfig = modelAndWeightsConfig;
    let modelTopology = modelAndWeightsConfig.modelTopology;
    if (modelTopology['model_config'] != null) {
        // If the model-topology JSON contains a 'model_config' field, then it is
        // a full model JSON (e.g., from `keras.Model.save()`), which contains
        // not only the model's architecture in its 'model_config' field, but
        // additional information such as the model's optimizer. We use only the
        // 'model_config' field currently.
        modelTopology = modelTopology['model_config'];
    }
    const tsConfig = convertPythonicToTs(modelTopology);
    const model = deserialize(tsConfig, customObjects);
    if (modelAndWeightsConfig.weightsManifest != null) {
        // Load the weight values keyed by the original tensor names in the model
        // file that was loaded.  These should match the keys of the weight
        // manifest.
        const weightValues = await io.loadWeights(modelAndWeightsConfig.weightsManifest, modelAndWeightsConfig.pathPrefix, model.weights.map(weight => weight.originalName));
        // Map the weights to the unique tensor names generated during model loading
        const uniqueWeightValues = {};
        for (const weight of model.weights) {
            uniqueWeightValues[weight.originalName] =
                weightValues[weight.originalName];
        }
        model.loadWeights(uniqueWeightValues);
        // Dispose temporary weight values.
        dispose(weightValues);
    }
    return model;
}
/**
 * Load a model composed of Layer objects, including its topology and optionally
 * weights. See the Tutorial named "How to import a Keras Model" for usage
 * examples.
 *
 * This method is applicable to:
 *
 * 1. Models created with the `tf.layers.*`, `tf.sequential`, and
 * `tf.model` APIs of TensorFlow.js and later saved with the
 * `tf.LayersModel.save` method.
 * 2. Models converted from Keras or TensorFlow tf.keras using the
 * [tensorflowjs_converter](https://github.com/tensorflow/tfjs/tree/master/tfjs-converter).
 *
 * This mode is *not* applicable to TensorFlow `SavedModel`s or their converted
 * forms. For those models, use `tf.loadGraphModel`.
 *
 * Example 1. Load a model from an HTTP server.
 *
 * ```js
 * const model = await tf.loadLayersModel(
 *     'https://storage.googleapis.com/tfjs-models/tfjs/iris_v1/model.json');
 * model.summary();
 * ```
 *
 * Example 2: Save `model`'s topology and weights to browser [local
 * storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage);
 * then load it back.
 *
 * ```js
 * const model = tf.sequential(
 *     {layers: [tf.layers.dense({units: 1, inputShape: [3]})]});
 * console.log('Prediction from original model:');
 * model.predict(tf.ones([1, 3])).print();
 *
 * const saveResults = await model.save('localstorage://my-model-1');
 *
 * const loadedModel = await tf.loadLayersModel('localstorage://my-model-1');
 * console.log('Prediction from loaded model:');
 * loadedModel.predict(tf.ones([1, 3])).print();
 * ```
 *
 * Example 3. Saving `model`'s topology and weights to browser
 * [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API);
 * then load it back.
 *
 * ```js
 * const model = tf.sequential(
 *     {layers: [tf.layers.dense({units: 1, inputShape: [3]})]});
 * console.log('Prediction from original model:');
 * model.predict(tf.ones([1, 3])).print();
 *
 * const saveResults = await model.save('indexeddb://my-model-1');
 *
 * const loadedModel = await tf.loadLayersModel('indexeddb://my-model-1');
 * console.log('Prediction from loaded model:');
 * loadedModel.predict(tf.ones([1, 3])).print();
 * ```
 *
 * Example 4. Load a model from user-selected files from HTML
 * [file input
 * elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file).
 *
 * ```js
 * // Note: this code snippet will not work without the HTML elements in the
 * //   page
 * const jsonUpload = document.getElementById('json-upload');
 * const weightsUpload = document.getElementById('weights-upload');
 *
 * const model = await tf.loadLayersModel(
 *     tf.io.browserFiles([jsonUpload.files[0], weightsUpload.files[0]]));
 * ```
 *
 * @param pathOrIOHandler Can be either of the two formats
 *   1. A string path to the `ModelAndWeightsConfig` JSON describing
 *      the model in the canonical TensorFlow.js format. For file://
 *      (tfjs-node-only), http:// and https:// schemas, the path can be
 *      either absolute or relative. The content of the JSON file is assumed to
 *      be a JSON object with the following fields and values:
 *      - 'modelTopology': A JSON object that can be either of:
 *        1. a model architecture JSON consistent with the format of the return
 *            value of `keras.Model.to_json()`
 *        2. a full model JSON in the format of `keras.models.save_model()`.
 *      - 'weightsManifest': A TensorFlow.js weights manifest.
 *      See the Python converter function `save_model()` for more details.
 *      It is also assumed that model weights can be accessed from relative
 *      paths described by the `paths` fields in weights manifest.
 *   2. A `tf.io.IOHandler` object that loads model artifacts with its `load`
 *      method.
 * @param options Optional configuration arguments for the model loading,
 *   including:
 *   - `strict`: Require that the provided weights exactly match those required
 *     by the layers.  Default true.  Passing false means that both extra
 *     weights and missing weights will be silently ignored.
 *   - `onProgress`: A progress callback of the form:
 *     `(fraction: number) => void`. This callback can be used to monitor the
 *     model-loading process.
 * @returns A `Promise` of `tf.LayersModel`, with the topology and weights
 *     loaded.
 *
 * @doc {heading: 'Models', subheading: 'Loading'}
 */
export async function loadLayersModel(pathOrIOHandler, options) {
    if (options == null) {
        options = {};
    }
    if (typeof pathOrIOHandler === 'string') {
        const handlers = io.getLoadHandlers(pathOrIOHandler, options);
        if (handlers.length === 0) {
            // For backward compatibility: if no load handler can be found,
            // assume it is a relative http path.
            // TODO(cais): Reformat the args into a single `LoadOptions` once the core
            // is refactored.
            handlers.push(io.browserHTTPRequest(pathOrIOHandler, options));
        }
        else if (handlers.length > 1) {
            throw new ValueError(`Found more than one (${handlers.length}) load handlers for ` +
                `URL '${pathOrIOHandler}'`);
        }
        pathOrIOHandler = handlers[0];
    }
    return loadLayersModelFromIOHandler(pathOrIOHandler, undefined, options);
}
/**
 * Load a model and optionally its weights, using an IOHandler object.
 *
 * @param handler The instance of `IOHandler` to be used during the model
 *   loading.
 * @param customObjects Any optional custom objects to be used during model
 *   loading.
 * @param strict Whether the weight loading will be done in strict mode.
 *   Default: `true`.
 */
export async function loadLayersModelFromIOHandler(handler, customObjects, options) {
    if (options == null) {
        options = {};
    }
    if (handler.load == null) {
        throw new ValueError('Cannot proceed with model loading because the IOHandler provided ' +
            'does not have the `load` method implemented.');
    }
    const artifacts = await handler.load();
    let modelTopology = artifacts.modelTopology;
    if (modelTopology['model_config'] != null) {
        modelTopology = modelTopology['model_config'];
    }
    const strict = options.strict == null ? true : options.strict;
    // If weights are provided and the weight-loading mode is strict, use
    // fast weight initialization. This skips costly initializers such as
    // 'orthogonal' and saves unnecessary computation in cases where
    // the initialized weight values will immediately be overwritten by
    // loaded weight values.
    const fastWeightInit = artifacts.weightData != null && artifacts.weightSpecs != null && strict;
    const model = deserialize(convertPythonicToTs(modelTopology), customObjects, fastWeightInit);
    const trainingConfig = artifacts.trainingConfig;
    if (trainingConfig != null) {
        model.loadTrainingConfig(trainingConfig);
    }
    if (artifacts.userDefinedMetadata != null) {
        model.setUserDefinedMetadata(artifacts.userDefinedMetadata);
    }
    // If weightData is present, load the weights into the model.
    if (artifacts.weightData != null) {
        // Loading weights requires weightSpecs.
        if (artifacts.weightSpecs == null) {
            throw new ValueError('LayersModel artifacts contains weight data, but not weight specs. ' +
                'Therefore loading of weights cannot proceed.');
        }
        const { modelWeights, optimizerWeights } = decodeModelAndOptimizerWeights(artifacts.weightData, artifacts.weightSpecs);
        model.loadWeights(modelWeights, strict);
        if (model.optimizer != null && optimizerWeights.length > 0) {
            await model.optimizer.setWeights(optimizerWeights);
        }
        // Dispose temporary weight values.
        dispose(modelWeights);
        dispose(optimizerWeights.map(w => w.tensor));
    }
    return model;
}
function decodeModelAndOptimizerWeights(weightData, specs) {
    const name2Tensor = io.decodeWeights(weightData, specs);
    const modelWeights = {};
    const optimizerWeights = [];
    specs.forEach(spec => {
        if (spec.group === 'optimizer') {
            optimizerWeights.push({ name: spec.name, tensor: name2Tensor[spec.name] });
        }
        else {
            modelWeights[spec.name] = name2Tensor[spec.name];
        }
    });
    return { modelWeights, optimizerWeights };
}
/**
 * A model with a stack of layers, feeding linearly from one to the next.
 *
 * `tf.sequential` is a factory function that creates an instance of
 * `tf.Sequential`.
 *
 * ```js
 *  // Define a model for linear regression.
 *  const model = tf.sequential();
 *  model.add(tf.layers.dense({units: 1, inputShape: [1]}));
 *
 *  // Prepare the model for training: Specify the loss and the optimizer.
 *  model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
 *
 *  // Generate some synthetic data for training.
 *  const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
 *  const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);
 *
 *  // Train the model using the data then do inference on a data point the
 *  // model hasn't seen:
 *  await model.fit(xs, ys);
 *  model.predict(tf.tensor2d([5], [1, 1])).print();
 * ```
 *
 * @doc {heading: 'Models', subheading: 'Classes'}
 */
class Sequential extends LayersModel {
    constructor(args) {
        super({ inputs: [], outputs: [] });
        args = args || {};
        this.trainable = true;
        this.built = false;
        // Set model name.
        this.name = (args.name != null) ? args.name : getUid('sequential_');
        // Add to the model any layers passed to the constructor.
        if (args.layers != null) {
            for (const layer of args.layers) {
                this.add(layer);
            }
        }
    }
    // Helper function to Sequential.add  Throws if the new output shape will be
    // invalid.
    checkShape(layer) {
        const shape = layer.inboundNodes[0].outputTensors[0].shape;
        if (shape.some(x => x < 0)) {
            throw new ValueError('Negative dimension size caused by adding layer ' +
                `${layer.name} with input shape [` +
                `${layer.inboundNodes[0].inputTensors[0].shape}]`);
        }
    }
    /**
     * Adds a layer instance on top of the layer stack.
     *
     * ```js
     *  const model = tf.sequential();
     *  model.add(tf.layers.dense({units: 8, inputShape: [1]}));
     *  model.add(tf.layers.dense({units: 4, activation: 'relu6'}));
     *  model.add(tf.layers.dense({units: 1, activation: 'relu6'}));
     *  // Note that the untrained model is random at this point.
     *  model.predict(tf.randomNormal([10, 1])).print();
     * ```
     * @param layer Layer instance.
     *
     * @exception ValueError In case the `layer` argument does not know its
     * input shape.
     * @exception ValueError In case the `layer` argument has multiple output
     *   tensors, or is already connected somewhere else (forbidden in
     *   `Sequential` models).
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    add(layer) {
        const isLayerModelInstance = layer instanceof Sequential || layer instanceof LayersModel;
        let modelLayer;
        if (isLayerModelInstance) {
            modelLayer = layer;
            if (modelLayer.outputs.length !== 1) {
                throw new ValueError('All layers in a Sequential model ' +
                    'should have a single output tensor. ' +
                    'For multi-output layers, ' +
                    'use the functional API.');
            }
            if (modelLayer.inputs.length !== 1) {
                throw new ValueError('All layers in a Sequential model ' +
                    'should have a single input tensor. ' +
                    'For multi-input layers, ' +
                    'use the functional API.');
            }
        }
        if (this.outputs.length === 0) {
            // first layer in model: check that it is an input layer
            if (layer.inboundNodes.length === 0) {
                // create an input layer
                if (layer.batchInputShape == null) {
                    throw new ValueError('The first layer in a Sequential model must ' +
                        'get an `inputShape` or `batchInputShape` argument.');
                }
                // Instantiate the input layer.
                const x = Input({
                    batchShape: layer.batchInputShape,
                    dtype: layer.dtype,
                    name: layer.name + '_input'
                });
                // This will build the current layer and create the node connecting
                // the current layer to the input layer we just created.
                layer.apply(x);
            }
            if (isLayerModelInstance) {
                this.outputs = modelLayer.outputs;
                this.inputs = modelLayer.inputs;
            }
            else {
                if (layer.inboundNodes.length !== 1) {
                    throw new ValueError('A layer added to a Sequential model must not already be ' +
                        `connected somewhere else. LayersModel received layer ${layer.name} ` +
                        `which has ${layer.inboundNodes.length} pre-existing inbound ` +
                        'connections.');
                }
                if (layer.inboundNodes[0].outputTensors.length !== 1) {
                    throw new ValueError('All layers in a Sequential model ' +
                        'should have a single output tensor. ' +
                        'For multi-output layers, ' +
                        'use the functional API.');
                }
                this.checkShape(layer);
                this.outputs = [layer.inboundNodes[0].outputTensors[0]];
                this.inputs = getSourceInputs(this.outputs[0]);
            }
            this.inboundNodes = [];
            // We create an input node, which we will keep updated
            // as we add more layers.
            // (This call has side effects.)
            // tslint:disable-next-line:no-unused-expression
            new Node({
                outboundLayer: this,
                inboundLayers: [],
                nodeIndices: [],
                tensorIndices: [],
                inputTensors: this.inputs,
                outputTensors: this.outputs,
                // no model-level masking for now
                inputMasks: generic_utils.pyListRepeat(null, this.inputs.length),
                outputMasks: [null],
                inputShapes: this.inputs.map(x => x.shape),
                outputShapes: this.outputs[0].shape
            });
        }
        else {
            const outputTensor = layer.apply(this.outputs[0]);
            if (Array.isArray(outputTensor)) {
                throw new TypeError('All layers in a Sequential model ' +
                    'should have a single output tensor. ' +
                    'For multi-output layers, ' +
                    'use the functional API.');
            }
            this.checkShape(layer);
            this.outputs = [outputTensor];
            // update self.inbound_nodes
            this.inboundNodes[0].outputTensors = this.outputs;
            this.inboundNodes[0].outputShapes = [this.outputs[0].shape];
        }
        this.layers.push(layer);
        this.built = false;
    }
    /**
     * Removes the last layer in the model.
     *
     * @exception TypeError if there are no layers in the model.
     */
    pop() {
        if (this.layers.length === 0) {
            throw new TypeError('There are no layers in the model.');
        }
        this.layers.pop();
        if (this.layers.length === 0) {
            this.outputs = [];
            this.inboundNodes = [];
            this.outboundNodes = [];
        }
        else {
            const lastLayerIndex = this.layers.length - 1;
            this.layers[lastLayerIndex].outboundNodes = [];
            this.outputs = [this.layers[lastLayerIndex].output];
            // update self.inbound_nodes
            this.inboundNodes[0].outputTensors = this.outputs;
            this.inboundNodes[0].outputShapes = [this.outputs[0].shape];
        }
    }
    call(inputs, kwargs) {
        if (this.model == null) {
            this.build();
        }
        return this.model.call(inputs, kwargs);
    }
    build(inputShape) {
        // Call `getExactlyOneShape` without using its return value,
        // to verify that exactly one input shape is provided.
        getExactlyOneShape(inputShape);
        if (this.inputs.length === 0 || this.outputs.length === 0) {
            throw new TypeError('Sequential model cannot be built: model is empty.' +
                ' Add some layers first.');
        }
        // actually create the model
        this.model = new LayersModel({
            inputs: this.inputs,
            outputs: this.outputs[0],
            name: this.name + '_model'
        });
        this.model.trainable = this.trainable;
        // mirror model attributes
        this.supportsMasking = this.model.supportsMasking;
        // TODO(michaelterry): Add caches
        this.inputLayers = this.model.inputLayers;
        this.inputLayersNodeIndices = this.model.inputLayersNodeIndices;
        this.inputLayersTensorIndices = this.model.inputLayersTensorIndices;
        this.outputLayers = this.model.outputLayers;
        this.outputLayersNodeIndices = this.model.outputLayersNodeIndices;
        this.outputLayersTensorIndices = this.model.outputLayersTensorIndices;
        this.nodesByDepth = this.model.nodesByDepth;
        this.containerNodes = this.model.containerNodes;
        this.outputNames = this.model.outputNames;
        this.inputNames = this.model.inputNames;
        // TODO(michaelterry): Add feedInputNames, feedInputs, if needed.
        // TODO(michaelterry): Add callbackModel if needed.
        this.built = true;
    }
    countParams() {
        if (!this.built) {
            this.build();
        }
        return super.countParams();
    }
    /**
     * Print a text summary of the Sequential model's layers.
     *
     * The summary includes
     * - Name and type of all layers that comprise the model.
     * - Output shape(s) of the layers
     * - Number of weight parameters of each layer
     * - The total number of trainable and non-trainable parameters of the
     * model.
     *
     * ```js
     * const model = tf.sequential();
     * model.add(
     *     tf.layers.dense({units: 100, inputShape: [10], activation: 'relu'}));
     * model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
     *
     * model.summary();
     * ```
     *
     * @param lineLength Custom line length, in number of characters.
     * @param positions Custom widths of each of the columns, as either
     *   fractions of `lineLength` (e.g., `[0.5, 0.75, 1]`) or absolute number
     *   of characters (e.g., `[30, 50, 65]`). Each number corresponds to
     *   right-most (i.e., ending) position of a column.
     * @param printFn Custom print function. Can be used to replace the default
     *   `console.log`. For example, you can use `x => {}` to mute the printed
     *   messages in the console.
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    summary(lineLength, positions, printFn = console.log) {
        if (!this.built) {
            this.build();
        }
        super.summary(lineLength, positions, printFn);
    }
    /**
     * Sets the weights of the model.
     *
     * @param weights Should be a list of Tensors with shapes and types matching
     *   the output of `model.getWeights()`.
     */
    setWeights(weights) {
        if (this.model == null) {
            this.build();
        }
        this.model.setWeights(weights);
    }
    /**
     * Returns the loss value & metrics values for the model in test mode.
     *
     * Loss and metrics are specified during `compile()`, which needs to happen
     * before calls to `evaluate()`.
     *
     * Computation is done in batches.
     *
     * ```js
     * const model = tf.sequential({
     *   layers: [tf.layers.dense({units: 1, inputShape: [10]})]
     * });
     * model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
     * const result = model.evaluate(tf.ones([8, 10]), tf.ones([8, 1]), {
     *   batchSize: 4,
     * });
     * result.print();
     * ```
     *
     * @param x `tf.Tensor` of test data, or an `Array` of `tf.Tensor`s if the
     * model has multiple inputs.
     * @param y `tf.Tensor` of target data, or an `Array` of `tf.Tensor`s if the
     * model has multiple outputs.
     * @param args A `ModelEvaluateConfig`, containing optional fields.
     *
     * @return `Scalar` test loss (if the model has a single output and no
     *   metrics) or `Array` of `Scalar`s (if the model has multiple outputs
     *   and/or metrics). The attribute `model.metricsNames`
     *   will give you the display labels for the scalar outputs.
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    evaluate(x, y, args = {}) {
        if (!this.built) {
            throw new RuntimeError('The model needs to be compiled before being used.');
        }
        return this.model.evaluate(x, y, args);
    }
    // TODO(cais): Add code snippet below once real dataset objects are
    //   available.
    /**
     * Evaluate model using a dataset object.
     *
     * Note: Unlike `evaluate()`, this method is asynchronous (`async`).
     *
     * @param dataset A dataset object. Its `iterator()` method is expected
     *   to generate a dataset iterator object, the `next()` method of which
     *   is expected to produce data batches for evaluation. The return value
     *   of the `next()` call ought to contain a boolean `done` field and a
     *   `value` field. The `value` field is expected to be an array of two
     *   `tf.Tensor`s or an array of two nested `tf.Tensor` structures. The former
     *   case is for models with exactly one input and one output (e.g.
     *   a sequential model). The latter case is for models with multiple
     *   inputs and/or multiple outputs. Of the two items in the array, the
     *   first is the input feature(s) and the second is the output target(s).
     * @param args A configuration object for the dataset-based evaluation.
     * @returns Loss and metric values as an Array of `Scalar` objects.
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    async evaluateDataset(dataset, args) {
        if (!this.built) {
            throw new RuntimeError('The model needs to be compiled before being used.');
        }
        return this.model.evaluateDataset(dataset, args);
    }
    /**
     * Generates output predictions for the input samples.
     *
     * Computation is done in batches.
     *
     * Note: the "step" mode of predict() is currently not supported.
     *   This is because the TensorFlow.js core backend is imperative only.
     *
     * ```js
     * const model = tf.sequential({
     *   layers: [tf.layers.dense({units: 1, inputShape: [10]})]
     * });
     * model.predict(tf.ones([2, 10])).print();
     * ```
     *
     * @param x The input data, as a Tensor, or an `Array` of `tf.Tensor`s if
     *   the model has multiple inputs.
     * @param conifg A `ModelPredictConfig` object containing optional fields.
     *
     * @return `tf.Tensor`(s) of predictions.
     *
     * @exception ValueError In case of mismatch between the provided input data
     *   and the model's expectations, or in case a stateful model receives a
     *   number of samples that is not a multiple of the batch size.
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    predict(x, args = {}) {
        if (this.model == null) {
            this.build();
        }
        return this.model.predict(x, args);
    }
    /**
     * Returns predictions for a single batch of samples.
     *
     * @param x: Input samples, as a Tensor, or list of Tensors (if the model
     *   has multiple inputs).
     * @return Tensor(s) of predictions
     */
    predictOnBatch(x) {
        if (this.model == null) {
            this.build();
        }
        return this.model.predictOnBatch(x);
    }
    /**
     * See `LayersModel.compile`.
     *
     * @param args
     */
    compile(args) {
        this.build();
        this.model.compile(args);
        this.optimizer_ = this.model.optimizer;
        // tslint:disable-next-line:no-any
        this.isOptimizerOwned = this.model.isOptimizerOwned;
        this.loss = this.model.loss;
        this.metrics = this.model.metrics;
        // TODO(cais): Add this.lossWeights, this.sampleWeightMode,
        //   this.weightedMetrics, this.targets.
        this.metricsTensors = this.model.metricsTensors;
        this.metricsNames = this.model.metricsNames;
        // TODO(cais): Add sampleWeights.
    }
    get optimizer() {
        return this.model == null ? undefined : this.model.optimizer;
    }
    set optimizer(optimizer) {
        this.model.optimizer = optimizer;
    }
    /**
     * Trains the model for a fixed number of epochs (iterations on a dataset).
     *
     * ```js
     * const model = tf.sequential({
     *   layers: [tf.layers.dense({units: 1, inputShape: [10]})]
     * });
     * model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
     * const history = await model.fit(tf.ones([8, 10]), tf.ones([8, 1]), {
     *   batchSize: 4,
     *   epochs: 3
     * });
     * console.log(history.history.loss[0]);
     * ```
     *
     * @param x `tf.Tensor` of training data, or an array of `tf.Tensor`s if the
     * model has multiple inputs. If all inputs in the model are named, you can
     * also pass a dictionary mapping input names to `tf.Tensor`s.
     * @param y `tf.Tensor` of target (label) data, or an array of `tf.Tensor`s if
     * the model has multiple outputs. If all outputs in the model are named, you
     *  can also pass a dictionary mapping output names to `tf.Tensor`s.
     * @param args  A `ModelFitConfig`, containing optional fields.
     *
     * @return A `History` instance. Its `history` attribute contains all
     *   information collected during training.
     *
     * @exception ValueError In case of mismatch between the provided input data
     *   and what the model expects.
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    async fit(x, y, args = {}) {
        if (!this.built) {
            throw new RuntimeError('The model needs to be compiled before ' +
                'being used.');
        }
        return this.model.fit(x, y, args);
    }
    /**
     * Trains the model using a dataset object.
     *
     * ```js
     * const xArray = [
     *   [1, 1, 1, 1, 1, 1, 1, 1, 1],
     *   [1, 1, 1, 1, 1, 1, 1, 1, 1],
     *   [1, 1, 1, 1, 1, 1, 1, 1, 1],
     *   [1, 1, 1, 1, 1, 1, 1, 1, 1],
     * ];
     * const yArray = [1, 1, 1, 1];
     * // Create a dataset from the JavaScript array.
     * const xDataset = tf.data.array(xArray);
     * const yDataset = tf.data.array(yArray);
     * // Zip combines the `x` and `y` Datasets into a single Dataset, the
     * // iterator of which will return an object containing of two tensors,
     * // corresponding to `x` and `y`.  The call to `batch(4)` will bundle
     * // four such samples into a single object, with the same keys now pointing
     * // to tensors that hold 4 examples, organized along the batch dimension.
     * // The call to `shuffle(4)` causes each iteration through the dataset to
     * // happen in a different order.  The size of the shuffle window is 4.
     * const xyDataset = tf.data.zip({xs: xDataset, ys: yDataset})
     *     .batch(4)
     *     .shuffle(4);
     * const model = tf.sequential({
     *   layers: [tf.layers.dense({units: 1, inputShape: [9]})]
     * });
     * model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
     * const history = await model.fitDataset(xyDataset, {
     *   epochs: 4,
     *   callbacks: {onEpochEnd: (epoch, logs) => console.log(logs.loss)}
     * });
     * ```
     *
     * @param dataset A dataset object. Its `iterator()` method is expected to
     *   generate a dataset iterator object, the `next()` method of which is
     *   expected to produce data batches for evaluation. The return value of the
     *   `next()` call ought to contain a boolean `done` field and a `value`
     *   field.
     *
     *   The `value` field is expected to be an object of with fields
     *   `xs` and `ys`, which point to the feature tensor and the target tensor,
     *   respectively. This case is for models with exactly one input and one
     *   output (e.g. a sequential model). For example:
     *   ```js
     *   {value: {xs: xsTensor, ys: ysTensor}, done: false}
     *   ```
     *
     *   If the model has multiple inputs, the `xs` field of `value` should
     *   be an object mapping input names to their respective feature tensors.
     *   For example:
     *   ```js
     *   {
     *     value: {
     *       xs: {
     *         input_1: xsTensor1,
     *         input_2: xsTensor2
     *       },
     *       ys: ysTensor
     *     },
     *     done: false
     *   }
     *   ```
     *   If the model has multiple outputs, the `ys` field of `value` should
     *   be an object mapping output names to their respective target tensors.
     *   For example:
     *   ```js
     *   {
     *     value: {
     *       xs: xsTensor,
     *       ys: {
     *         output_1: ysTensor1,
     *         output_2: ysTensor2
     *       },
     *     },
     *     done: false
     *   }
     *   ```
     * @param args A `ModelFitDatasetArgs`, containing optional fields.
     *
     * @return A `History` instance. Its `history` attribute contains all
     *   information collected during training.
     *
     * @doc {heading: 'Models', subheading: 'Classes', ignoreCI: true}
     */
    async fitDataset(dataset, args) {
        if (!this.built) {
            throw new RuntimeError('The model needs to be compiled before ' +
                'being used.');
        }
        return this.model.fitDataset(dataset, args);
    }
    /**
     * Runs a single gradient update on a single batch of data.
     *
     * This method differs from `fit()` and `fitDataset()` in the following
     * regards:
     *   - It operates on exactly one batch of data.
     *   - It returns only the loss and metric values, instead of
     *     returning the batch-by-batch loss and metric values.
     *   - It doesn't support fine-grained options such as verbosity and
     *     callbacks.
     *
     * @param x Input data. It could be one of the following:
     *   - A `tf.Tensor`, or an Array of `tf.Tensor`s (in case the model has
     *     multiple inputs).
     *   - An Object mapping input names to corresponding `tf.Tensor` (if the
     *     model has named inputs).
     * @param y Target data. It could be either a `tf.Tensor` or multiple
     *   `tf.Tensor`s. It should be consistent with `x`.
     * @returns Training loss or losses (in case the model has
     *   multiple outputs), along with metrics (if any), as numbers.
     *
     * @doc {heading: 'Models', subheading: 'Classes'}
     */
    async trainOnBatch(x, y) {
        return this.model.trainOnBatch(x, y);
    }
    /* See parent class for JsDoc */
    /** @nocollapse */
    static fromConfig(cls, config, customObjects = {}, fastWeightInit = false) {
        let configArray;
        let extraModelConfig = {};
        if (config instanceof Array) {
            if (!(config[0].className != null) ||
                config[0]['className'] === 'Merge') {
                throw new ValueError('Legacy serialization format not supported yet.');
            }
            configArray = config;
        }
        else {
            util.assert(config['layers'] != null, () => `When the config data for a Sequential model is not an Array, ` +
                `it must be an Object that contains the 'layers' field.`);
            configArray = config['layers'];
            delete config['layers'];
            extraModelConfig = config;
        }
        const model = new cls(extraModelConfig);
        if (!(model instanceof Sequential)) {
            throw new NotImplementedError(`Sequential.fromConfig called on non-Sequential input: ${model}`);
        }
        for (const conf of configArray) {
            const customObjects = undefined;
            const layer = deserialize(conf, customObjects, fastWeightInit);
            if (fastWeightInit) {
                layer.setFastWeightInitDuringBuild(true);
            }
            model.add(layer);
        }
        return model;
    }
    /**
     * Setter used for force stopping of LayersModel.fit() (i.e., training).
     *
     * Example:
     *
     * ```js
     * const model = tf.sequential();
     * model.add(tf.layers.dense({units: 1, inputShape: [10]}));
     * model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
     * const xs = tf.ones([8, 10]);
     * const ys = tf.zeros([8, 1]);
     *
     * const history = await model.fit(xs, ys, {
     *   epochs: 10,
     *   callbacks: {
     *     onEpochEnd: async (epoch, logs) => {
     *       if (epoch === 2) {
     *         model.stopTraining = true;
     *       }
     *     }
     *   }
     * });
     *
     * // There should be only 3 values in the loss array, instead of 10 values,
     * // due to the stopping after 3 epochs.
     * console.log(history.history.loss);
     * ```
     */
    set stopTraining(stop) {
        // TODO(cais): When refactoring to remove the composition pattern happens,
        // remove this method overriding.
        if (this.model == null) {
            throw new ValueError('Cannot set the stopTraining property of a sequential model before ' +
                'it is compiled.');
        }
        this.model.stopTraining = stop;
    }
    get stopTraining() {
        if (this.model == null) {
            throw new ValueError('Cannot get the stopTraining property of a sequential model before ' +
                'it is compiled.');
        }
        return this.model.stopTraining;
    }
    // TODO(cais): Override get trainableWeights() here
    // tslint:disable-next-line:no-any
    getConfig() {
        // NOTE(cais): We override the return type of getConfig() to `any` here,
        //   because the `Sequential` class is a special case among `Container`
        //   subtypes in that its getConfig() method returns an Array (not a
        //   dict).
        const layers = [];
        for (const layer of this.layers) {
            const dict = {};
            dict['className'] = layer.getClassName();
            dict['config'] = layer.getConfig();
            layers.push(dict);
        }
        return { name: this.name, layers };
    }
}
/** @nocollapse */
Sequential.className = 'Sequential';
export { Sequential };
serialization.registerClass(Sequential);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1sYXllcnMvc3JjL21vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILHFDQUFxQztBQUVyQyxPQUFPLEVBQUMsT0FBTyxFQUFFLEVBQUUsRUFBcUMsYUFBYSxFQUFVLElBQUksRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRWxILE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUd2QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDM0MsT0FBTyxFQUFDLGVBQWUsRUFBUyxJQUFJLEVBQWlCLE1BQU0sbUJBQW1CLENBQUM7QUFDL0UsT0FBTyxFQUFDLFdBQVcsRUFBc0MsTUFBTSxtQkFBbUIsQ0FBQztBQUduRixPQUFPLEVBQUMsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUl2RSxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFbkQsT0FBTyxLQUFLLGFBQWEsTUFBTSx1QkFBdUIsQ0FBQztBQUN2RCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUV2RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRCRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsYUFBYSxDQUMvQixxQkFBdUQsRUFDdkQsYUFBd0M7SUFDMUMsSUFBSSxDQUFDLENBQUMsZUFBZSxJQUFJLHFCQUFxQixDQUFDLEVBQUU7UUFDL0MscUJBQXFCLEdBQUcsRUFBQyxhQUFhLEVBQUUscUJBQXFCLEVBQUMsQ0FBQztLQUNoRTtJQUNELHFCQUFxQixHQUFHLHFCQUE4QyxDQUFDO0lBRXZFLElBQUksYUFBYSxHQUFHLHFCQUFx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QyxJQUFJLENBQUMsQ0FBQztTQUNuQjtRQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQztJQUNuQyxDQUFDOztBQTFzQkQsa0JBQWtCO0FBQ0Ysb0JBQVMsR0FBRyxZQUFZLENBQUM7U0FGOUIsVUFBVTtBQTZzQnZCLGFBQWEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgb3IgYXRcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2Uga2VyYXMvbW9kZWxzLnB5ICovXG5cbmltcG9ydCB7ZGlzcG9zZSwgaW8sIE5hbWVkVGVuc29yTWFwLCBPcHRpbWl6ZXIsIFNjYWxhciwgc2VyaWFsaXphdGlvbiwgVGVuc29yLCB1dGlsfSBmcm9tICdAdGVuc29yZmxvdy90ZmpzLWNvcmUnO1xuXG5pbXBvcnQge2dldFVpZH0gZnJvbSAnLi9iYWNrZW5kL3N0YXRlJztcbmltcG9ydCB7SGlzdG9yeX0gZnJvbSAnLi9iYXNlX2NhbGxiYWNrcyc7XG5pbXBvcnQge0RhdGFzZXR9IGZyb20gJy4vZW5naW5lL2RhdGFzZXRfc3R1Yic7XG5pbXBvcnQge0lucHV0fSBmcm9tICcuL2VuZ2luZS9pbnB1dF9sYXllcic7XG5pbXBvcnQge2dldFNvdXJjZUlucHV0cywgTGF5ZXIsIE5vZGUsIFN5bWJvbGljVGVuc29yfSBmcm9tICcuL2VuZ2luZS90b3BvbG9neSc7XG5pbXBvcnQge0xheWVyc01vZGVsLCBNb2RlbENvbXBpbGVBcmdzLCBNb2RlbEV2YWx1YXRlQXJnc30gZnJvbSAnLi9lbmdpbmUvdHJhaW5pbmcnO1xuaW1wb3J0IHtNb2RlbEV2YWx1YXRlRGF0YXNldEFyZ3MsIE1vZGVsRml0RGF0YXNldEFyZ3N9IGZyb20gJy4vZW5naW5lL3RyYWluaW5nX2RhdGFzZXQnO1xuaW1wb3J0IHtNb2RlbEZpdEFyZ3N9IGZyb20gJy4vZW5naW5lL3RyYWluaW5nX3RlbnNvcnMnO1xuaW1wb3J0IHtOb3RJbXBsZW1lbnRlZEVycm9yLCBSdW50aW1lRXJyb3IsIFZhbHVlRXJyb3J9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7U2hhcGV9IGZyb20gJy4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQge1RyYWluaW5nQ29uZmlnfSBmcm9tICcuL2tlcmFzX2Zvcm1hdC90cmFpbmluZ19jb25maWcnO1xuaW1wb3J0IHtQeUpzb25EaWN0fSBmcm9tICcuL2tlcmFzX2Zvcm1hdC90eXBlcyc7XG5pbXBvcnQge2Rlc2VyaWFsaXplfSBmcm9tICcuL2xheWVycy9zZXJpYWxpemF0aW9uJztcbmltcG9ydCB7S3dhcmdzLCBOYW1lZFRlbnNvcn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBnZW5lcmljX3V0aWxzIGZyb20gJy4vdXRpbHMvZ2VuZXJpY191dGlscyc7XG5pbXBvcnQge2NvbnZlcnRQeXRob25pY1RvVHN9IGZyb20gJy4vdXRpbHMvc2VyaWFsaXphdGlvbl91dGlscyc7XG5pbXBvcnQge2dldEV4YWN0bHlPbmVTaGFwZX0gZnJvbSAnLi91dGlscy90eXBlc191dGlscyc7XG5cbi8qKlxuICogUGFyc2VzIGEgSlNPTiBtb2RlbCBjb25maWd1cmF0aW9uIGZpbGUgYW5kIHJldHVybnMgYSBtb2RlbCBpbnN0YW5jZS5cbiAqXG4gKiBgYGBqc1xuICogLy8gVGhpcyBleGFtcGxlIHNob3dzIGhvdyB0byBzZXJpYWxpemUgYSBtb2RlbCB1c2luZyBgdG9KU09OKClgIGFuZFxuICogLy8gZGVzZXJpYWxpemUgaXQgYXMgYW5vdGhlciBtb2RlbCB1c2luZyBgdGYubW9kZWxzLm1vZGVsRnJvbUpTT04oKWAuXG4gKiAvLyBOb3RlOiB0aGlzIGV4YW1wbGUgc2VyaWFsaXplcyBhbmQgZGVzZXJpYWxpemVzIG9ubHkgdGhlIHRvcG9sb2d5XG4gKiAvLyBvZiB0aGUgbW9kZWw7IHRoZSB3ZWlnaHRzIG9mIHRoZSBsb2FkZWQgbW9kZWwgd2lsbCBiZSBkaWZmZXJlbnRcbiAqIC8vIGZyb20gdGhvc2Ugb2YgdGhlIHRoZSBvcmlnaW5hbCBtb2RlbCwgZHVlIHRvIHJhbmRvbSB3ZWlnaHRcbiAqIC8vIGluaXRpYWxpemF0aW9uLlxuICogLy8gVG8gbG9hZCB0aGUgdG9wb2xvZ3kgYW5kIHdlaWdodHMgb2YgYSBtb2RlbCwgdXNlIGB0Zi5sb2FkTGF5ZXJzTW9kZWwoKWAuXG4gKiBjb25zdCBtb2RlbDEgPSB0Zi5zZXF1ZW50aWFsKCk7XG4gKiBtb2RlbDEuYWRkKHRmLmxheWVycy5yZXBlYXRWZWN0b3Ioe2lucHV0U2hhcGU6IFsyXSwgbjogNH0pKTtcbiAqIC8vIFNlcmlhbGl6ZSBgbW9kZWwxYCBhcyBhIEpTT04gb2JqZWN0LlxuICogY29uc3QgbW9kZWwxSlNPTiA9IG1vZGVsMS50b0pTT04obnVsbCwgZmFsc2UpO1xuICogbW9kZWwxLnN1bW1hcnkoKTtcbiAqXG4gKiBjb25zdCBtb2RlbDIgPSBhd2FpdCB0Zi5tb2RlbHMubW9kZWxGcm9tSlNPTihtb2RlbDFKU09OKTtcbiAqIG1vZGVsMi5zdW1tYXJ5KCk7XG4gKiBgYGBcbiAqXG4gKiAgQHBhcmFtIG1vZGVsQW5kV2VpZ2h0c0NvbmZpZyBKU09OIG9iamVjdCBvciBzdHJpbmcgZW5jb2RpbmcgYSBtb2RlbCBhbmRcbiAqICAgICAgIHdlaWdodHMgY29uZmlndXJhdGlvbi4gSXQgY2FuIGFsc28gYmUgb25seSB0aGUgdG9wb2xvZ3kgSlNPTiBvZiB0aGVcbiAqICAgICAgIG1vZGVsLCBpbiB3aGljaCBjYXNlIHRoZSB3ZWlnaHRzIHdpbGwgbm90IGJlIGxvYWRlZC5cbiAqICBAcGFyYW0gY3VzdG9tX29iamVjdHMgT3B0aW9uYWwgZGljdGlvbmFyeSBtYXBwaW5nIG5hbWVzXG4gKiAgICAgICAoc3RyaW5ncykgdG8gY3VzdG9tIGNsYXNzZXMgb3IgZnVuY3Rpb25zIHRvIGJlXG4gKiAgICAgICBjb25zaWRlcmVkIGR1cmluZyBkZXNlcmlhbGl6YXRpb24uXG4gKiBAcmV0dXJucyBBIFRlbnNvckZsb3cuanMgTGF5ZXJzIGB0Zi5MYXllcnNNb2RlbGAgaW5zdGFuY2UgKHVuY29tcGlsZWQpLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbW9kZWxGcm9tSlNPTihcbiAgICBtb2RlbEFuZFdlaWdodHNDb25maWc6IE1vZGVsQW5kV2VpZ2h0c0NvbmZpZ3xQeUpzb25EaWN0LFxuICAgIGN1c3RvbU9iamVjdHM/OiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QpOiBQcm9taXNlPExheWVyc01vZGVsPiB7XG4gIGlmICghKCdtb2RlbFRvcG9sb2d5JyBpbiBtb2RlbEFuZFdlaWdodHNDb25maWcpKSB7XG4gICAgbW9kZWxBbmRXZWlnaHRzQ29uZmlnID0ge21vZGVsVG9wb2xvZ3k6IG1vZGVsQW5kV2VpZ2h0c0NvbmZpZ307XG4gIH1cbiAgbW9kZWxBbmRXZWlnaHRzQ29uZmlnID0gbW9kZWxBbmRXZWlnaHRzQ29uZmlnIGFzIE1vZGVsQW5kV2VpZ2h0c0NvbmZpZztcblxuICBsZXQgbW9kZWxUb3BvbG9neSA9IG1vZGVsQW5kV2VpZ2h0c0NvbmZpZy5tb2RlbFRvcG9sb2d5O1xuICBpZiAobW9kZWxUb3BvbG9neVsnbW9kZWxfY29uZmlnJ10gIT0gbnVsbCkge1xuICAgIC8vIElmIHRoZSBtb2RlbC10b3BvbG9neSBKU09OIGNvbnRhaW5zIGEgJ21vZGVsX2NvbmZpZycgZmllbGQsIHRoZW4gaXQgaXNcbiAgICAvLyBhIGZ1bGwgbW9kZWwgSlNPTiAoZS5nLiwgZnJvbSBga2VyYXMuTW9kZWwuc2F2ZSgpYCksIHdoaWNoIGNvbnRhaW5zXG4gICAgLy8gbm90IG9ubHkgdGhlIG1vZGVsJ3MgYXJjaGl0ZWN0dXJlIGluIGl0cyAnbW9kZWxfY29uZmlnJyBmaWVsZCwgYnV0XG4gICAgLy8gYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBzdWNoIGFzIHRoZSBtb2RlbCdzIG9wdGltaXplci4gV2UgdXNlIG9ubHkgdGhlXG4gICAgLy8gJ21vZGVsX2NvbmZpZycgZmllbGQgY3VycmVudGx5LlxuICAgIG1vZGVsVG9wb2xvZ3kgPSBtb2RlbFRvcG9sb2d5Wydtb2RlbF9jb25maWcnXSBhcyBQeUpzb25EaWN0O1xuICB9XG4gIGNvbnN0IHRzQ29uZmlnID1cbiAgICAgIGNvbnZlcnRQeXRob25pY1RvVHMobW9kZWxUb3BvbG9neSkgYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0O1xuICBjb25zdCBtb2RlbCA9IGRlc2VyaWFsaXplKHRzQ29uZmlnLCBjdXN0b21PYmplY3RzKSBhcyBMYXllcnNNb2RlbDtcblxuICBpZiAobW9kZWxBbmRXZWlnaHRzQ29uZmlnLndlaWdodHNNYW5pZmVzdCAhPSBudWxsKSB7XG4gICAgLy8gTG9hZCB0aGUgd2VpZ2h0IHZhbHVlcyBrZXllZCBieSB0aGUgb3JpZ2luYWwgdGVuc29yIG5hbWVzIGluIHRoZSBtb2RlbFxuICAgIC8vIGZpbGUgdGhhdCB3YXMgbG9hZGVkLiAgVGhlc2Ugc2hvdWxkIG1hdGNoIHRoZSBrZXlzIG9mIHRoZSB3ZWlnaHRcbiAgICAvLyBtYW5pZmVzdC5cbiAgICBjb25zdCB3ZWlnaHRWYWx1ZXMgPSBhd2FpdCBpby5sb2FkV2VpZ2h0cyhcbiAgICAgICAgbW9kZWxBbmRXZWlnaHRzQ29uZmlnLndlaWdodHNNYW5pZmVzdCwgbW9kZWxBbmRXZWlnaHRzQ29uZmlnLnBhdGhQcmVmaXgsXG4gICAgICAgIG1vZGVsLndlaWdodHMubWFwKHdlaWdodCA9PiB3ZWlnaHQub3JpZ2luYWxOYW1lKSk7XG5cbiAgICAvLyBNYXAgdGhlIHdlaWdodHMgdG8gdGhlIHVuaXF1ZSB0ZW5zb3IgbmFtZXMgZ2VuZXJhdGVkIGR1cmluZyBtb2RlbCBsb2FkaW5nXG4gICAgY29uc3QgdW5pcXVlV2VpZ2h0VmFsdWVzOiBOYW1lZFRlbnNvck1hcCA9IHt9O1xuICAgIGZvciAoY29uc3Qgd2VpZ2h0IG9mIG1vZGVsLndlaWdodHMpIHtcbiAgICAgIHVuaXF1ZVdlaWdodFZhbHVlc1t3ZWlnaHQub3JpZ2luYWxOYW1lXSA9XG4gICAgICAgICAgd2VpZ2h0VmFsdWVzW3dlaWdodC5vcmlnaW5hbE5hbWVdO1xuICAgIH1cblxuICAgIG1vZGVsLmxvYWRXZWlnaHRzKHVuaXF1ZVdlaWdodFZhbHVlcyk7XG4gICAgLy8gRGlzcG9zZSB0ZW1wb3Jhcnkgd2VpZ2h0IHZhbHVlcy5cbiAgICBkaXNwb3NlKHdlaWdodFZhbHVlcyk7XG4gIH1cbiAgcmV0dXJuIG1vZGVsO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIGxvYWRpbmcgYSBzYXZlZCBtb2RlIGluIFRlbnNvckZsb3cuanMgZm9ybWF0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVsQW5kV2VpZ2h0c0NvbmZpZyB7XG4gIC8qKlxuICAgKiBBIEpTT04gb2JqZWN0IG9yIEpTT04gc3RyaW5nIGNvbnRhaW5pbmcgdGhlIG1vZGVsIGNvbmZpZy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgZWl0aGVyIG9mIHRoZSBmb2xsb3dpbmcgdHdvIGZvcm1hdHM6XG4gICAqICAgLSBBIG1vZGVsIGFyY2hpZWN0dXJlLW9ubHkgY29uZmlnLCAgaS5lLiwgYSBmb3JtYXQgY29uc2lzdGVudCB3aXRoIHRoZVxuICAgKiAgICAgcmV0dXJuIHZhbHVlIG9mYGtlcmFzLk1vZGVsLnRvX2pzb24oKWAuXG4gICAqICAgLSBBIGZ1bGwgbW9kZWwgY29uZmlnLCBjb250YWluaW5nIG5vdCBvbmx5IG1vZGVsIGFyY2hpdGVjdHVyZSwgYnV0IGFsc29cbiAgICogICAgIHRyYWluaW5nIG9wdGlvbnMgYW5kIHN0YXRlLCBpLmUuLCBhIGZvcm1hdCBjb25zaXN0ZW50IHdpdGggdGhlIHJldHVyblxuICAgKiAgICAgdmFsdWUgb2YgYGtlcmFzLm1vZGVscy5zYXZlX21vZGVsKClgLlxuICAgKi9cbiAgbW9kZWxUb3BvbG9neTogUHlKc29uRGljdDtcblxuICAvKipcbiAgICogQSB3ZWlnaHRzIG1hbmlmZXN0IGluIFRlbnNvckZsb3cuanMgZm9ybWF0LlxuICAgKi9cbiAgd2VpZ2h0c01hbmlmZXN0PzogaW8uV2VpZ2h0c01hbmlmZXN0Q29uZmlnO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHByZXBlbmQgdG8gdGhlIHBhdGhzIGluIGB3ZWlnaHRNYW5pZmVzdGAgYmVmb3JlIGZldGNoaW5nLlxuICAgKlxuICAgKiBUaGUgcGF0aCBtYXkgb3B0aW9uYWxseSBlbmQgaW4gYSBzbGFzaCAoJy8nKS5cbiAgICovXG4gIHBhdGhQcmVmaXg/OiBzdHJpbmc7XG59XG5cbi8vIFRPRE8obmllbHNlbmUpOiBSZW1vdmUgYWZ0ZXI6IGh0dHBzOi8vZ2l0aHViLmNvbS90ZW5zb3JmbG93L3RmanMvaXNzdWVzLzQwMFxuZXhwb3J0IGludGVyZmFjZSBNb2RlbFByZWRpY3RBcmdzIHtcbiAgLyoqXG4gICAqIE9wdGlvbmFsLiBCYXRjaCBzaXplIChJbnRlZ2VyKS4gSWYgdW5zcGVjaWZpZWQsIGl0IHdpbGwgZGVmYXVsdCB0byAzMi5cbiAgICovXG4gIGJhdGNoU2l6ZT86IG51bWJlcjtcblxuICAvKipcbiAgICogT3B0aW9uYWwuIFZlcmJvc2l0eSBtb2RlLiBEZWZhdWx0cyB0byBmYWxzZS5cbiAgICovXG4gIHZlcmJvc2U/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIExvYWQgYSBtb2RlbCBjb21wb3NlZCBvZiBMYXllciBvYmplY3RzLCBpbmNsdWRpbmcgaXRzIHRvcG9sb2d5IGFuZCBvcHRpb25hbGx5XG4gKiB3ZWlnaHRzLiBTZWUgdGhlIFR1dG9yaWFsIG5hbWVkIFwiSG93IHRvIGltcG9ydCBhIEtlcmFzIE1vZGVsXCIgZm9yIHVzYWdlXG4gKiBleGFtcGxlcy5cbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBhcHBsaWNhYmxlIHRvOlxuICpcbiAqIDEuIE1vZGVscyBjcmVhdGVkIHdpdGggdGhlIGB0Zi5sYXllcnMuKmAsIGB0Zi5zZXF1ZW50aWFsYCwgYW5kXG4gKiBgdGYubW9kZWxgIEFQSXMgb2YgVGVuc29yRmxvdy5qcyBhbmQgbGF0ZXIgc2F2ZWQgd2l0aCB0aGVcbiAqIGB0Zi5MYXllcnNNb2RlbC5zYXZlYCBtZXRob2QuXG4gKiAyLiBNb2RlbHMgY29udmVydGVkIGZyb20gS2VyYXMgb3IgVGVuc29yRmxvdyB0Zi5rZXJhcyB1c2luZyB0aGVcbiAqIFt0ZW5zb3JmbG93anNfY29udmVydGVyXShodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL3RyZWUvbWFzdGVyL3RmanMtY29udmVydGVyKS5cbiAqXG4gKiBUaGlzIG1vZGUgaXMgKm5vdCogYXBwbGljYWJsZSB0byBUZW5zb3JGbG93IGBTYXZlZE1vZGVsYHMgb3IgdGhlaXIgY29udmVydGVkXG4gKiBmb3Jtcy4gRm9yIHRob3NlIG1vZGVscywgdXNlIGB0Zi5sb2FkR3JhcGhNb2RlbGAuXG4gKlxuICogRXhhbXBsZSAxLiBMb2FkIGEgbW9kZWwgZnJvbSBhbiBIVFRQIHNlcnZlci5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgbW9kZWwgPSBhd2FpdCB0Zi5sb2FkTGF5ZXJzTW9kZWwoXG4gKiAgICAgJ2h0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS90ZmpzLW1vZGVscy90ZmpzL2lyaXNfdjEvbW9kZWwuanNvbicpO1xuICogbW9kZWwuc3VtbWFyeSgpO1xuICogYGBgXG4gKlxuICogRXhhbXBsZSAyOiBTYXZlIGBtb2RlbGAncyB0b3BvbG9neSBhbmQgd2VpZ2h0cyB0byBicm93c2VyIFtsb2NhbFxuICogc3RvcmFnZV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1dpbmRvdy9sb2NhbFN0b3JhZ2UpO1xuICogdGhlbiBsb2FkIGl0IGJhY2suXG4gKlxuICogYGBganNcbiAqIGNvbnN0IG1vZGVsID0gdGYuc2VxdWVudGlhbChcbiAqICAgICB7bGF5ZXJzOiBbdGYubGF5ZXJzLmRlbnNlKHt1bml0czogMSwgaW5wdXRTaGFwZTogWzNdfSldfSk7XG4gKiBjb25zb2xlLmxvZygnUHJlZGljdGlvbiBmcm9tIG9yaWdpbmFsIG1vZGVsOicpO1xuICogbW9kZWwucHJlZGljdCh0Zi5vbmVzKFsxLCAzXSkpLnByaW50KCk7XG4gKlxuICogY29uc3Qgc2F2ZVJlc3VsdHMgPSBhd2FpdCBtb2RlbC5zYXZlKCdsb2NhbHN0b3JhZ2U6Ly9teS1tb2RlbC0xJyk7XG4gKlxuICogY29uc3QgbG9hZGVkTW9kZWwgPSBhd2FpdCB0Zi5sb2FkTGF5ZXJzTW9kZWwoJ2xvY2Fsc3RvcmFnZTovL215LW1vZGVsLTEnKTtcbiAqIGNvbnNvbGUubG9nKCdQcmVkaWN0aW9uIGZyb20gbG9hZGVkIG1vZGVsOicpO1xuICogbG9hZGVkTW9kZWwucHJlZGljdCh0Zi5vbmVzKFsxLCAzXSkpLnByaW50KCk7XG4gKiBgYGBcbiAqXG4gKiBFeGFtcGxlIDMuIFNhdmluZyBgbW9kZWxgJ3MgdG9wb2xvZ3kgYW5kIHdlaWdodHMgdG8gYnJvd3NlclxuICogW0luZGV4ZWREQl0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0luZGV4ZWREQl9BUEkpO1xuICogdGhlbiBsb2FkIGl0IGJhY2suXG4gKlxuICogYGBganNcbiAqIGNvbnN0IG1vZGVsID0gdGYuc2VxdWVudGlhbChcbiAqICAgICB7bGF5ZXJzOiBbdGYubGF5ZXJzLmRlbnNlKHt1bml0czogMSwgaW5wdXRTaGFwZTogWzNdfSldfSk7XG4gKiBjb25zb2xlLmxvZygnUHJlZGljdGlvbiBmcm9tIG9yaWdpbmFsIG1vZGVsOicpO1xuICogbW9kZWwucHJlZGljdCh0Zi5vbmVzKFsxLCAzXSkpLnByaW50KCk7XG4gKlxuICogY29uc3Qgc2F2ZVJlc3VsdHMgPSBhd2FpdCBtb2RlbC5zYXZlKCdpbmRleGVkZGI6Ly9teS1tb2RlbC0xJyk7XG4gKlxuICogY29uc3QgbG9hZGVkTW9kZWwgPSBhd2FpdCB0Zi5sb2FkTGF5ZXJzTW9kZWwoJ2luZGV4ZWRkYjovL215LW1vZGVsLTEnKTtcbiAqIGNvbnNvbGUubG9nKCdQcmVkaWN0aW9uIGZyb20gbG9hZGVkIG1vZGVsOicpO1xuICogbG9hZGVkTW9kZWwucHJlZGljdCh0Zi5vbmVzKFsxLCAzXSkpLnByaW50KCk7XG4gKiBgYGBcbiAqXG4gKiBFeGFtcGxlIDQuIExvYWQgYSBtb2RlbCBmcm9tIHVzZXItc2VsZWN0ZWQgZmlsZXMgZnJvbSBIVE1MXG4gKiBbZmlsZSBpbnB1dFxuICogZWxlbWVudHNdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUTUwvRWxlbWVudC9pbnB1dC9maWxlKS5cbiAqXG4gKiBgYGBqc1xuICogLy8gTm90ZTogdGhpcyBjb2RlIHNuaXBwZXQgd2lsbCBub3Qgd29yayB3aXRob3V0IHRoZSBIVE1MIGVsZW1lbnRzIGluIHRoZVxuICogLy8gICBwYWdlXG4gKiBjb25zdCBqc29uVXBsb2FkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzb24tdXBsb2FkJyk7XG4gKiBjb25zdCB3ZWlnaHRzVXBsb2FkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dlaWdodHMtdXBsb2FkJyk7XG4gKlxuICogY29uc3QgbW9kZWwgPSBhd2FpdCB0Zi5sb2FkTGF5ZXJzTW9kZWwoXG4gKiAgICAgdGYuaW8uYnJvd3NlckZpbGVzKFtqc29uVXBsb2FkLmZpbGVzWzBdLCB3ZWlnaHRzVXBsb2FkLmZpbGVzWzBdXSkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhPcklPSGFuZGxlciBDYW4gYmUgZWl0aGVyIG9mIHRoZSB0d28gZm9ybWF0c1xuICogICAxLiBBIHN0cmluZyBwYXRoIHRvIHRoZSBgTW9kZWxBbmRXZWlnaHRzQ29uZmlnYCBKU09OIGRlc2NyaWJpbmdcbiAqICAgICAgdGhlIG1vZGVsIGluIHRoZSBjYW5vbmljYWwgVGVuc29yRmxvdy5qcyBmb3JtYXQuIEZvciBmaWxlOi8vXG4gKiAgICAgICh0ZmpzLW5vZGUtb25seSksIGh0dHA6Ly8gYW5kIGh0dHBzOi8vIHNjaGVtYXMsIHRoZSBwYXRoIGNhbiBiZVxuICogICAgICBlaXRoZXIgYWJzb2x1dGUgb3IgcmVsYXRpdmUuIFRoZSBjb250ZW50IG9mIHRoZSBKU09OIGZpbGUgaXMgYXNzdW1lZCB0b1xuICogICAgICBiZSBhIEpTT04gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHMgYW5kIHZhbHVlczpcbiAqICAgICAgLSAnbW9kZWxUb3BvbG9neSc6IEEgSlNPTiBvYmplY3QgdGhhdCBjYW4gYmUgZWl0aGVyIG9mOlxuICogICAgICAgIDEuIGEgbW9kZWwgYXJjaGl0ZWN0dXJlIEpTT04gY29uc2lzdGVudCB3aXRoIHRoZSBmb3JtYXQgb2YgdGhlIHJldHVyblxuICogICAgICAgICAgICB2YWx1ZSBvZiBga2VyYXMuTW9kZWwudG9fanNvbigpYFxuICogICAgICAgIDIuIGEgZnVsbCBtb2RlbCBKU09OIGluIHRoZSBmb3JtYXQgb2YgYGtlcmFzLm1vZGVscy5zYXZlX21vZGVsKClgLlxuICogICAgICAtICd3ZWlnaHRzTWFuaWZlc3QnOiBBIFRlbnNvckZsb3cuanMgd2VpZ2h0cyBtYW5pZmVzdC5cbiAqICAgICAgU2VlIHRoZSBQeXRob24gY29udmVydGVyIGZ1bmN0aW9uIGBzYXZlX21vZGVsKClgIGZvciBtb3JlIGRldGFpbHMuXG4gKiAgICAgIEl0IGlzIGFsc28gYXNzdW1lZCB0aGF0IG1vZGVsIHdlaWdodHMgY2FuIGJlIGFjY2Vzc2VkIGZyb20gcmVsYXRpdmVcbiAqICAgICAgcGF0aHMgZGVzY3JpYmVkIGJ5IHRoZSBgcGF0aHNgIGZpZWxkcyBpbiB3ZWlnaHRzIG1hbmlmZXN0LlxuICogICAyLiBBIGB0Zi5pby5JT0hhbmRsZXJgIG9iamVjdCB0aGF0IGxvYWRzIG1vZGVsIGFydGlmYWN0cyB3aXRoIGl0cyBgbG9hZGBcbiAqICAgICAgbWV0aG9kLlxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9uYWwgY29uZmlndXJhdGlvbiBhcmd1bWVudHMgZm9yIHRoZSBtb2RlbCBsb2FkaW5nLFxuICogICBpbmNsdWRpbmc6XG4gKiAgIC0gYHN0cmljdGA6IFJlcXVpcmUgdGhhdCB0aGUgcHJvdmlkZWQgd2VpZ2h0cyBleGFjdGx5IG1hdGNoIHRob3NlIHJlcXVpcmVkXG4gKiAgICAgYnkgdGhlIGxheWVycy4gIERlZmF1bHQgdHJ1ZS4gIFBhc3NpbmcgZmFsc2UgbWVhbnMgdGhhdCBib3RoIGV4dHJhXG4gKiAgICAgd2VpZ2h0cyBhbmQgbWlzc2luZyB3ZWlnaHRzIHdpbGwgYmUgc2lsZW50bHkgaWdub3JlZC5cbiAqICAgLSBgb25Qcm9ncmVzc2A6IEEgcHJvZ3Jlc3MgY2FsbGJhY2sgb2YgdGhlIGZvcm06XG4gKiAgICAgYChmcmFjdGlvbjogbnVtYmVyKSA9PiB2b2lkYC4gVGhpcyBjYWxsYmFjayBjYW4gYmUgdXNlZCB0byBtb25pdG9yIHRoZVxuICogICAgIG1vZGVsLWxvYWRpbmcgcHJvY2Vzcy5cbiAqIEByZXR1cm5zIEEgYFByb21pc2VgIG9mIGB0Zi5MYXllcnNNb2RlbGAsIHdpdGggdGhlIHRvcG9sb2d5IGFuZCB3ZWlnaHRzXG4gKiAgICAgbG9hZGVkLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdNb2RlbHMnLCBzdWJoZWFkaW5nOiAnTG9hZGluZyd9XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkTGF5ZXJzTW9kZWwoXG4gICAgcGF0aE9ySU9IYW5kbGVyOiBzdHJpbmd8aW8uSU9IYW5kbGVyLFxuICAgIG9wdGlvbnM/OiBpby5Mb2FkT3B0aW9ucyk6IFByb21pc2U8TGF5ZXJzTW9kZWw+IHtcbiAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBpZiAodHlwZW9mIHBhdGhPcklPSGFuZGxlciA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBoYW5kbGVycyA9IGlvLmdldExvYWRIYW5kbGVycyhwYXRoT3JJT0hhbmRsZXIsIG9wdGlvbnMpO1xuICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5OiBpZiBubyBsb2FkIGhhbmRsZXIgY2FuIGJlIGZvdW5kLFxuICAgICAgLy8gYXNzdW1lIGl0IGlzIGEgcmVsYXRpdmUgaHR0cCBwYXRoLlxuICAgICAgLy8gVE9ETyhjYWlzKTogUmVmb3JtYXQgdGhlIGFyZ3MgaW50byBhIHNpbmdsZSBgTG9hZE9wdGlvbnNgIG9uY2UgdGhlIGNvcmVcbiAgICAgIC8vIGlzIHJlZmFjdG9yZWQuXG4gICAgICBoYW5kbGVycy5wdXNoKGlvLmJyb3dzZXJIVFRQUmVxdWVzdChwYXRoT3JJT0hhbmRsZXIsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2UgaWYgKGhhbmRsZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgIGBGb3VuZCBtb3JlIHRoYW4gb25lICgke2hhbmRsZXJzLmxlbmd0aH0pIGxvYWQgaGFuZGxlcnMgZm9yIGAgK1xuICAgICAgICAgIGBVUkwgJyR7cGF0aE9ySU9IYW5kbGVyfSdgKTtcbiAgICB9XG4gICAgcGF0aE9ySU9IYW5kbGVyID0gaGFuZGxlcnNbMF07XG4gIH1cbiAgcmV0dXJuIGxvYWRMYXllcnNNb2RlbEZyb21JT0hhbmRsZXIocGF0aE9ySU9IYW5kbGVyLCB1bmRlZmluZWQsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIExvYWQgYSBtb2RlbCBhbmQgb3B0aW9uYWxseSBpdHMgd2VpZ2h0cywgdXNpbmcgYW4gSU9IYW5kbGVyIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gaGFuZGxlciBUaGUgaW5zdGFuY2Ugb2YgYElPSGFuZGxlcmAgdG8gYmUgdXNlZCBkdXJpbmcgdGhlIG1vZGVsXG4gKiAgIGxvYWRpbmcuXG4gKiBAcGFyYW0gY3VzdG9tT2JqZWN0cyBBbnkgb3B0aW9uYWwgY3VzdG9tIG9iamVjdHMgdG8gYmUgdXNlZCBkdXJpbmcgbW9kZWxcbiAqICAgbG9hZGluZy5cbiAqIEBwYXJhbSBzdHJpY3QgV2hldGhlciB0aGUgd2VpZ2h0IGxvYWRpbmcgd2lsbCBiZSBkb25lIGluIHN0cmljdCBtb2RlLlxuICogICBEZWZhdWx0OiBgdHJ1ZWAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkTGF5ZXJzTW9kZWxGcm9tSU9IYW5kbGVyKFxuICAgIGhhbmRsZXI6IGlvLklPSGFuZGxlciwgY3VzdG9tT2JqZWN0cz86IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCxcbiAgICBvcHRpb25zPzogaW8uTG9hZE9wdGlvbnMpOiBQcm9taXNlPExheWVyc01vZGVsPiB7XG4gIGlmIChvcHRpb25zID09IG51bGwpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgaWYgKGhhbmRsZXIubG9hZCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICdDYW5ub3QgcHJvY2VlZCB3aXRoIG1vZGVsIGxvYWRpbmcgYmVjYXVzZSB0aGUgSU9IYW5kbGVyIHByb3ZpZGVkICcgK1xuICAgICAgICAnZG9lcyBub3QgaGF2ZSB0aGUgYGxvYWRgIG1ldGhvZCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuICBjb25zdCBhcnRpZmFjdHMgPSBhd2FpdCBoYW5kbGVyLmxvYWQoKTtcbiAgbGV0IG1vZGVsVG9wb2xvZ3kgPSBhcnRpZmFjdHMubW9kZWxUb3BvbG9neSBhcyBQeUpzb25EaWN0O1xuICBpZiAobW9kZWxUb3BvbG9neVsnbW9kZWxfY29uZmlnJ10gIT0gbnVsbCkge1xuICAgIG1vZGVsVG9wb2xvZ3kgPSBtb2RlbFRvcG9sb2d5Wydtb2RlbF9jb25maWcnXSBhcyBQeUpzb25EaWN0O1xuICB9XG5cbiAgY29uc3Qgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3QgPT0gbnVsbCA/IHRydWUgOiBvcHRpb25zLnN0cmljdDtcbiAgLy8gSWYgd2VpZ2h0cyBhcmUgcHJvdmlkZWQgYW5kIHRoZSB3ZWlnaHQtbG9hZGluZyBtb2RlIGlzIHN0cmljdCwgdXNlXG4gIC8vIGZhc3Qgd2VpZ2h0IGluaXRpYWxpemF0aW9uLiBUaGlzIHNraXBzIGNvc3RseSBpbml0aWFsaXplcnMgc3VjaCBhc1xuICAvLyAnb3J0aG9nb25hbCcgYW5kIHNhdmVzIHVubmVjZXNzYXJ5IGNvbXB1dGF0aW9uIGluIGNhc2VzIHdoZXJlXG4gIC8vIHRoZSBpbml0aWFsaXplZCB3ZWlnaHQgdmFsdWVzIHdpbGwgaW1tZWRpYXRlbHkgYmUgb3ZlcndyaXR0ZW4gYnlcbiAgLy8gbG9hZGVkIHdlaWdodCB2YWx1ZXMuXG4gIGNvbnN0IGZhc3RXZWlnaHRJbml0ID1cbiAgICAgIGFydGlmYWN0cy53ZWlnaHREYXRhICE9IG51bGwgJiYgYXJ0aWZhY3RzLndlaWdodFNwZWNzICE9IG51bGwgJiYgc3RyaWN0O1xuICBjb25zdCBtb2RlbCA9XG4gICAgICBkZXNlcmlhbGl6ZShcbiAgICAgICAgICBjb252ZXJ0UHl0aG9uaWNUb1RzKG1vZGVsVG9wb2xvZ3kpIGFzIHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCxcbiAgICAgICAgICBjdXN0b21PYmplY3RzLCBmYXN0V2VpZ2h0SW5pdCkgYXMgTGF5ZXJzTW9kZWw7XG5cbiAgY29uc3QgdHJhaW5pbmdDb25maWcgPSBhcnRpZmFjdHMudHJhaW5pbmdDb25maWcgYXMgVHJhaW5pbmdDb25maWc7XG4gIGlmICh0cmFpbmluZ0NvbmZpZyAhPSBudWxsKSB7XG4gICAgbW9kZWwubG9hZFRyYWluaW5nQ29uZmlnKHRyYWluaW5nQ29uZmlnKTtcbiAgfVxuICBpZiAoYXJ0aWZhY3RzLnVzZXJEZWZpbmVkTWV0YWRhdGEgIT0gbnVsbCkge1xuICAgIG1vZGVsLnNldFVzZXJEZWZpbmVkTWV0YWRhdGEoYXJ0aWZhY3RzLnVzZXJEZWZpbmVkTWV0YWRhdGEpO1xuICB9XG5cbiAgLy8gSWYgd2VpZ2h0RGF0YSBpcyBwcmVzZW50LCBsb2FkIHRoZSB3ZWlnaHRzIGludG8gdGhlIG1vZGVsLlxuICBpZiAoYXJ0aWZhY3RzLndlaWdodERhdGEgIT0gbnVsbCkge1xuICAgIC8vIExvYWRpbmcgd2VpZ2h0cyByZXF1aXJlcyB3ZWlnaHRTcGVjcy5cbiAgICBpZiAoYXJ0aWZhY3RzLndlaWdodFNwZWNzID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICdMYXllcnNNb2RlbCBhcnRpZmFjdHMgY29udGFpbnMgd2VpZ2h0IGRhdGEsIGJ1dCBub3Qgd2VpZ2h0IHNwZWNzLiAnICtcbiAgICAgICAgICAnVGhlcmVmb3JlIGxvYWRpbmcgb2Ygd2VpZ2h0cyBjYW5ub3QgcHJvY2VlZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB7bW9kZWxXZWlnaHRzLCBvcHRpbWl6ZXJXZWlnaHRzfSA9IGRlY29kZU1vZGVsQW5kT3B0aW1pemVyV2VpZ2h0cyhcbiAgICAgICAgYXJ0aWZhY3RzLndlaWdodERhdGEsIGFydGlmYWN0cy53ZWlnaHRTcGVjcyk7XG4gICAgbW9kZWwubG9hZFdlaWdodHMobW9kZWxXZWlnaHRzLCBzdHJpY3QpO1xuXG4gICAgaWYgKG1vZGVsLm9wdGltaXplciAhPSBudWxsICYmIG9wdGltaXplcldlaWdodHMubGVuZ3RoID4gMCkge1xuICAgICAgYXdhaXQgbW9kZWwub3B0aW1pemVyLnNldFdlaWdodHMob3B0aW1pemVyV2VpZ2h0cyk7XG4gICAgfVxuXG4gICAgLy8gRGlzcG9zZSB0ZW1wb3Jhcnkgd2VpZ2h0IHZhbHVlcy5cbiAgICBkaXNwb3NlKG1vZGVsV2VpZ2h0cyk7XG4gICAgZGlzcG9zZShvcHRpbWl6ZXJXZWlnaHRzLm1hcCh3ID0+IHcudGVuc29yKSk7XG4gIH1cbiAgcmV0dXJuIG1vZGVsO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVNb2RlbEFuZE9wdGltaXplcldlaWdodHMoXG4gICAgd2VpZ2h0RGF0YTogaW8uV2VpZ2h0RGF0YSwgc3BlY3M6IGlvLldlaWdodHNNYW5pZmVzdEVudHJ5W10pOlxuICAgIHttb2RlbFdlaWdodHM6IE5hbWVkVGVuc29yTWFwLCBvcHRpbWl6ZXJXZWlnaHRzOiBOYW1lZFRlbnNvcltdfSB7XG4gIGNvbnN0IG5hbWUyVGVuc29yID0gaW8uZGVjb2RlV2VpZ2h0cyh3ZWlnaHREYXRhLCBzcGVjcyk7XG4gIGNvbnN0IG1vZGVsV2VpZ2h0czogTmFtZWRUZW5zb3JNYXAgPSB7fTtcbiAgY29uc3Qgb3B0aW1pemVyV2VpZ2h0czogTmFtZWRUZW5zb3JbXSA9IFtdO1xuICBzcGVjcy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgIGlmIChzcGVjLmdyb3VwID09PSAnb3B0aW1pemVyJykge1xuICAgICAgb3B0aW1pemVyV2VpZ2h0cy5wdXNoKHtuYW1lOiBzcGVjLm5hbWUsIHRlbnNvcjogbmFtZTJUZW5zb3Jbc3BlYy5uYW1lXX0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtb2RlbFdlaWdodHNbc3BlYy5uYW1lXSA9IG5hbWUyVGVuc29yW3NwZWMubmFtZV07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHttb2RlbFdlaWdodHMsIG9wdGltaXplcldlaWdodHN9O1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gZm9yIGEgU2VxdWVudGlhbCBtb2RlbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXF1ZW50aWFsQXJncyB7XG4gIC8qKiBTdGFjayBvZiBsYXllcnMgZm9yIHRoZSBtb2RlbC4gKi9cbiAgbGF5ZXJzPzogTGF5ZXJbXTtcblxuICAvKiogVGhlIG5hbWUgb2YgdGhpcyBtb2RlbC4gKi9cbiAgbmFtZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIG1vZGVsIHdpdGggYSBzdGFjayBvZiBsYXllcnMsIGZlZWRpbmcgbGluZWFybHkgZnJvbSBvbmUgdG8gdGhlIG5leHQuXG4gKlxuICogYHRmLnNlcXVlbnRpYWxgIGlzIGEgZmFjdG9yeSBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgYW4gaW5zdGFuY2Ugb2ZcbiAqIGB0Zi5TZXF1ZW50aWFsYC5cbiAqXG4gKiBgYGBqc1xuICogIC8vIERlZmluZSBhIG1vZGVsIGZvciBsaW5lYXIgcmVncmVzc2lvbi5cbiAqICBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoKTtcbiAqICBtb2RlbC5hZGQodGYubGF5ZXJzLmRlbnNlKHt1bml0czogMSwgaW5wdXRTaGFwZTogWzFdfSkpO1xuICpcbiAqICAvLyBQcmVwYXJlIHRoZSBtb2RlbCBmb3IgdHJhaW5pbmc6IFNwZWNpZnkgdGhlIGxvc3MgYW5kIHRoZSBvcHRpbWl6ZXIuXG4gKiAgbW9kZWwuY29tcGlsZSh7bG9zczogJ21lYW5TcXVhcmVkRXJyb3InLCBvcHRpbWl6ZXI6ICdzZ2QnfSk7XG4gKlxuICogIC8vIEdlbmVyYXRlIHNvbWUgc3ludGhldGljIGRhdGEgZm9yIHRyYWluaW5nLlxuICogIGNvbnN0IHhzID0gdGYudGVuc29yMmQoWzEsIDIsIDMsIDRdLCBbNCwgMV0pO1xuICogIGNvbnN0IHlzID0gdGYudGVuc29yMmQoWzEsIDMsIDUsIDddLCBbNCwgMV0pO1xuICpcbiAqICAvLyBUcmFpbiB0aGUgbW9kZWwgdXNpbmcgdGhlIGRhdGEgdGhlbiBkbyBpbmZlcmVuY2Ugb24gYSBkYXRhIHBvaW50IHRoZVxuICogIC8vIG1vZGVsIGhhc24ndCBzZWVuOlxuICogIGF3YWl0IG1vZGVsLmZpdCh4cywgeXMpO1xuICogIG1vZGVsLnByZWRpY3QodGYudGVuc29yMmQoWzVdLCBbMSwgMV0pKS5wcmludCgpO1xuICogYGBgXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAqL1xuZXhwb3J0IGNsYXNzIFNlcXVlbnRpYWwgZXh0ZW5kcyBMYXllcnNNb2RlbCB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgY2xhc3NOYW1lID0gJ1NlcXVlbnRpYWwnO1xuICBwcml2YXRlIG1vZGVsOiBMYXllcnNNb2RlbDtcbiAgY29uc3RydWN0b3IoYXJncz86IFNlcXVlbnRpYWxBcmdzKSB7XG4gICAgc3VwZXIoe2lucHV0czogW10sIG91dHB1dHM6IFtdfSk7XG4gICAgYXJncyA9IGFyZ3MgfHwge307XG5cbiAgICB0aGlzLnRyYWluYWJsZSA9IHRydWU7XG4gICAgdGhpcy5idWlsdCA9IGZhbHNlO1xuXG4gICAgLy8gU2V0IG1vZGVsIG5hbWUuXG4gICAgdGhpcy5uYW1lID0gKGFyZ3MubmFtZSAhPSBudWxsKSA/IGFyZ3MubmFtZSA6IGdldFVpZCgnc2VxdWVudGlhbF8nKTtcblxuICAgIC8vIEFkZCB0byB0aGUgbW9kZWwgYW55IGxheWVycyBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yLlxuICAgIGlmIChhcmdzLmxheWVycyAhPSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGxheWVyIG9mIGFyZ3MubGF5ZXJzKSB7XG4gICAgICAgIHRoaXMuYWRkKGxheWVyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gU2VxdWVudGlhbC5hZGQgIFRocm93cyBpZiB0aGUgbmV3IG91dHB1dCBzaGFwZSB3aWxsIGJlXG4gIC8vIGludmFsaWQuXG4gIHByaXZhdGUgY2hlY2tTaGFwZShsYXllcjogTGF5ZXIpIHtcbiAgICBjb25zdCBzaGFwZSA9IGxheWVyLmluYm91bmROb2Rlc1swXS5vdXRwdXRUZW5zb3JzWzBdLnNoYXBlO1xuICAgIGlmIChzaGFwZS5zb21lKHggPT4geCA8IDApKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnTmVnYXRpdmUgZGltZW5zaW9uIHNpemUgY2F1c2VkIGJ5IGFkZGluZyBsYXllciAnICtcbiAgICAgICAgICBgJHtsYXllci5uYW1lfSB3aXRoIGlucHV0IHNoYXBlIFtgICtcbiAgICAgICAgICBgJHtsYXllci5pbmJvdW5kTm9kZXNbMF0uaW5wdXRUZW5zb3JzWzBdLnNoYXBlfV1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGxheWVyIGluc3RhbmNlIG9uIHRvcCBvZiB0aGUgbGF5ZXIgc3RhY2suXG4gICAqXG4gICAqIGBgYGpzXG4gICAqICBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoKTtcbiAgICogIG1vZGVsLmFkZCh0Zi5sYXllcnMuZGVuc2Uoe3VuaXRzOiA4LCBpbnB1dFNoYXBlOiBbMV19KSk7XG4gICAqICBtb2RlbC5hZGQodGYubGF5ZXJzLmRlbnNlKHt1bml0czogNCwgYWN0aXZhdGlvbjogJ3JlbHU2J30pKTtcbiAgICogIG1vZGVsLmFkZCh0Zi5sYXllcnMuZGVuc2Uoe3VuaXRzOiAxLCBhY3RpdmF0aW9uOiAncmVsdTYnfSkpO1xuICAgKiAgLy8gTm90ZSB0aGF0IHRoZSB1bnRyYWluZWQgbW9kZWwgaXMgcmFuZG9tIGF0IHRoaXMgcG9pbnQuXG4gICAqICBtb2RlbC5wcmVkaWN0KHRmLnJhbmRvbU5vcm1hbChbMTAsIDFdKSkucHJpbnQoKTtcbiAgICogYGBgXG4gICAqIEBwYXJhbSBsYXllciBMYXllciBpbnN0YW5jZS5cbiAgICpcbiAgICogQGV4Y2VwdGlvbiBWYWx1ZUVycm9yIEluIGNhc2UgdGhlIGBsYXllcmAgYXJndW1lbnQgZG9lcyBub3Qga25vdyBpdHNcbiAgICogaW5wdXQgc2hhcGUuXG4gICAqIEBleGNlcHRpb24gVmFsdWVFcnJvciBJbiBjYXNlIHRoZSBgbGF5ZXJgIGFyZ3VtZW50IGhhcyBtdWx0aXBsZSBvdXRwdXRcbiAgICogICB0ZW5zb3JzLCBvciBpcyBhbHJlYWR5IGNvbm5lY3RlZCBzb21ld2hlcmUgZWxzZSAoZm9yYmlkZGVuIGluXG4gICAqICAgYFNlcXVlbnRpYWxgIG1vZGVscykuXG4gICAqXG4gICAqIEBkb2Mge2hlYWRpbmc6ICdNb2RlbHMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBhZGQobGF5ZXI6IExheWVyKTogdm9pZCB7XG4gICAgY29uc3QgaXNMYXllck1vZGVsSW5zdGFuY2UgPVxuICAgICAgICBsYXllciBpbnN0YW5jZW9mIFNlcXVlbnRpYWwgfHwgbGF5ZXIgaW5zdGFuY2VvZiBMYXllcnNNb2RlbDtcbiAgICBsZXQgbW9kZWxMYXllcjogTGF5ZXJzTW9kZWw7XG4gICAgaWYgKGlzTGF5ZXJNb2RlbEluc3RhbmNlKSB7XG4gICAgICBtb2RlbExheWVyID0gbGF5ZXIgYXMgTGF5ZXJzTW9kZWw7XG4gICAgICBpZiAobW9kZWxMYXllci5vdXRwdXRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICdBbGwgbGF5ZXJzIGluIGEgU2VxdWVudGlhbCBtb2RlbCAnICtcbiAgICAgICAgICAgICdzaG91bGQgaGF2ZSBhIHNpbmdsZSBvdXRwdXQgdGVuc29yLiAnICtcbiAgICAgICAgICAgICdGb3IgbXVsdGktb3V0cHV0IGxheWVycywgJyArXG4gICAgICAgICAgICAndXNlIHRoZSBmdW5jdGlvbmFsIEFQSS4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChtb2RlbExheWVyLmlucHV0cy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICAnQWxsIGxheWVycyBpbiBhIFNlcXVlbnRpYWwgbW9kZWwgJyArXG4gICAgICAgICAgICAnc2hvdWxkIGhhdmUgYSBzaW5nbGUgaW5wdXQgdGVuc29yLiAnICtcbiAgICAgICAgICAgICdGb3IgbXVsdGktaW5wdXQgbGF5ZXJzLCAnICtcbiAgICAgICAgICAgICd1c2UgdGhlIGZ1bmN0aW9uYWwgQVBJLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLm91dHB1dHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBmaXJzdCBsYXllciBpbiBtb2RlbDogY2hlY2sgdGhhdCBpdCBpcyBhbiBpbnB1dCBsYXllclxuICAgICAgaWYgKGxheWVyLmluYm91bmROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gY3JlYXRlIGFuIGlucHV0IGxheWVyXG4gICAgICAgIGlmIChsYXllci5iYXRjaElucHV0U2hhcGUgPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgICAnVGhlIGZpcnN0IGxheWVyIGluIGEgU2VxdWVudGlhbCBtb2RlbCBtdXN0ICcgK1xuICAgICAgICAgICAgICAnZ2V0IGFuIGBpbnB1dFNoYXBlYCBvciBgYmF0Y2hJbnB1dFNoYXBlYCBhcmd1bWVudC4nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbnN0YW50aWF0ZSB0aGUgaW5wdXQgbGF5ZXIuXG4gICAgICAgIGNvbnN0IHggPSBJbnB1dCh7XG4gICAgICAgICAgYmF0Y2hTaGFwZTogbGF5ZXIuYmF0Y2hJbnB1dFNoYXBlLFxuICAgICAgICAgIGR0eXBlOiBsYXllci5kdHlwZSxcbiAgICAgICAgICBuYW1lOiBsYXllci5uYW1lICsgJ19pbnB1dCdcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFRoaXMgd2lsbCBidWlsZCB0aGUgY3VycmVudCBsYXllciBhbmQgY3JlYXRlIHRoZSBub2RlIGNvbm5lY3RpbmdcbiAgICAgICAgLy8gdGhlIGN1cnJlbnQgbGF5ZXIgdG8gdGhlIGlucHV0IGxheWVyIHdlIGp1c3QgY3JlYXRlZC5cbiAgICAgICAgbGF5ZXIuYXBwbHkoeCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0xheWVyTW9kZWxJbnN0YW5jZSkge1xuICAgICAgICB0aGlzLm91dHB1dHMgPSBtb2RlbExheWVyLm91dHB1dHM7XG4gICAgICAgIHRoaXMuaW5wdXRzID0gbW9kZWxMYXllci5pbnB1dHM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobGF5ZXIuaW5ib3VuZE5vZGVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgICAnQSBsYXllciBhZGRlZCB0byBhIFNlcXVlbnRpYWwgbW9kZWwgbXVzdCBub3QgYWxyZWFkeSBiZSAnICtcbiAgICAgICAgICAgICAgYGNvbm5lY3RlZCBzb21ld2hlcmUgZWxzZS4gTGF5ZXJzTW9kZWwgcmVjZWl2ZWQgbGF5ZXIgJHtcbiAgICAgICAgICAgICAgICAgIGxheWVyLm5hbWV9IGAgK1xuICAgICAgICAgICAgICBgd2hpY2ggaGFzICR7bGF5ZXIuaW5ib3VuZE5vZGVzLmxlbmd0aH0gcHJlLWV4aXN0aW5nIGluYm91bmQgYCArXG4gICAgICAgICAgICAgICdjb25uZWN0aW9ucy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYXllci5pbmJvdW5kTm9kZXNbMF0ub3V0cHV0VGVuc29ycy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAgICAgJ0FsbCBsYXllcnMgaW4gYSBTZXF1ZW50aWFsIG1vZGVsICcgK1xuICAgICAgICAgICAgICAnc2hvdWxkIGhhdmUgYSBzaW5nbGUgb3V0cHV0IHRlbnNvci4gJyArXG4gICAgICAgICAgICAgICdGb3IgbXVsdGktb3V0cHV0IGxheWVycywgJyArXG4gICAgICAgICAgICAgICd1c2UgdGhlIGZ1bmN0aW9uYWwgQVBJLicpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2hlY2tTaGFwZShsYXllcik7XG4gICAgICAgIHRoaXMub3V0cHV0cyA9IFtsYXllci5pbmJvdW5kTm9kZXNbMF0ub3V0cHV0VGVuc29yc1swXV07XG4gICAgICAgIHRoaXMuaW5wdXRzID0gZ2V0U291cmNlSW5wdXRzKHRoaXMub3V0cHV0c1swXSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaW5ib3VuZE5vZGVzID0gW107XG4gICAgICAvLyBXZSBjcmVhdGUgYW4gaW5wdXQgbm9kZSwgd2hpY2ggd2Ugd2lsbCBrZWVwIHVwZGF0ZWRcbiAgICAgIC8vIGFzIHdlIGFkZCBtb3JlIGxheWVycy5cbiAgICAgIC8vIChUaGlzIGNhbGwgaGFzIHNpZGUgZWZmZWN0cy4pXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdW51c2VkLWV4cHJlc3Npb25cbiAgICAgIG5ldyBOb2RlKHtcbiAgICAgICAgb3V0Ym91bmRMYXllcjogdGhpcyxcbiAgICAgICAgaW5ib3VuZExheWVyczogW10sXG4gICAgICAgIG5vZGVJbmRpY2VzOiBbXSxcbiAgICAgICAgdGVuc29ySW5kaWNlczogW10sXG4gICAgICAgIGlucHV0VGVuc29yczogdGhpcy5pbnB1dHMsXG4gICAgICAgIG91dHB1dFRlbnNvcnM6IHRoaXMub3V0cHV0cyxcbiAgICAgICAgLy8gbm8gbW9kZWwtbGV2ZWwgbWFza2luZyBmb3Igbm93XG4gICAgICAgIGlucHV0TWFza3M6IGdlbmVyaWNfdXRpbHMucHlMaXN0UmVwZWF0KG51bGwsIHRoaXMuaW5wdXRzLmxlbmd0aCksXG4gICAgICAgIG91dHB1dE1hc2tzOiBbbnVsbF0sXG4gICAgICAgIGlucHV0U2hhcGVzOiB0aGlzLmlucHV0cy5tYXAoeCA9PiB4LnNoYXBlKSxcbiAgICAgICAgb3V0cHV0U2hhcGVzOiB0aGlzLm91dHB1dHNbMF0uc2hhcGVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBvdXRwdXRUZW5zb3IgPSBsYXllci5hcHBseSh0aGlzLm91dHB1dHNbMF0pO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3V0cHV0VGVuc29yKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgJ0FsbCBsYXllcnMgaW4gYSBTZXF1ZW50aWFsIG1vZGVsICcgK1xuICAgICAgICAgICAgJ3Nob3VsZCBoYXZlIGEgc2luZ2xlIG91dHB1dCB0ZW5zb3IuICcgK1xuICAgICAgICAgICAgJ0ZvciBtdWx0aS1vdXRwdXQgbGF5ZXJzLCAnICtcbiAgICAgICAgICAgICd1c2UgdGhlIGZ1bmN0aW9uYWwgQVBJLicpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja1NoYXBlKGxheWVyKTtcbiAgICAgIHRoaXMub3V0cHV0cyA9IFtvdXRwdXRUZW5zb3IgYXMgU3ltYm9saWNUZW5zb3JdO1xuICAgICAgLy8gdXBkYXRlIHNlbGYuaW5ib3VuZF9ub2Rlc1xuICAgICAgdGhpcy5pbmJvdW5kTm9kZXNbMF0ub3V0cHV0VGVuc29ycyA9IHRoaXMub3V0cHV0cztcbiAgICAgIHRoaXMuaW5ib3VuZE5vZGVzWzBdLm91dHB1dFNoYXBlcyA9IFt0aGlzLm91dHB1dHNbMF0uc2hhcGVdO1xuICAgIH1cblxuICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgIHRoaXMuYnVpbHQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBsYXN0IGxheWVyIGluIHRoZSBtb2RlbC5cbiAgICpcbiAgICogQGV4Y2VwdGlvbiBUeXBlRXJyb3IgaWYgdGhlcmUgYXJlIG5vIGxheWVycyBpbiB0aGUgbW9kZWwuXG4gICAqL1xuICBwb3AoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubGF5ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlcmUgYXJlIG5vIGxheWVycyBpbiB0aGUgbW9kZWwuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5sYXllcnMucG9wKCk7XG4gICAgaWYgKHRoaXMubGF5ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5vdXRwdXRzID0gW107XG4gICAgICB0aGlzLmluYm91bmROb2RlcyA9IFtdO1xuICAgICAgdGhpcy5vdXRib3VuZE5vZGVzID0gW107XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxhc3RMYXllckluZGV4ID0gdGhpcy5sYXllcnMubGVuZ3RoIC0gMTtcbiAgICAgIHRoaXMubGF5ZXJzW2xhc3RMYXllckluZGV4XS5vdXRib3VuZE5vZGVzID0gW107XG4gICAgICB0aGlzLm91dHB1dHMgPSBbdGhpcy5sYXllcnNbbGFzdExheWVySW5kZXhdLm91dHB1dCBhcyBTeW1ib2xpY1RlbnNvcl07XG4gICAgICAvLyB1cGRhdGUgc2VsZi5pbmJvdW5kX25vZGVzXG4gICAgICB0aGlzLmluYm91bmROb2Rlc1swXS5vdXRwdXRUZW5zb3JzID0gdGhpcy5vdXRwdXRzO1xuICAgICAgdGhpcy5pbmJvdW5kTm9kZXNbMF0ub3V0cHV0U2hhcGVzID0gW3RoaXMub3V0cHV0c1swXS5zaGFwZV07XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIGlmICh0aGlzLm1vZGVsID09IG51bGwpIHtcbiAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubW9kZWwuY2FsbChpbnB1dHMsIGt3YXJncyk7XG4gIH1cblxuICBvdmVycmlkZSBidWlsZChpbnB1dFNoYXBlPzogU2hhcGV8U2hhcGVbXSkge1xuICAgIC8vIENhbGwgYGdldEV4YWN0bHlPbmVTaGFwZWAgd2l0aG91dCB1c2luZyBpdHMgcmV0dXJuIHZhbHVlLFxuICAgIC8vIHRvIHZlcmlmeSB0aGF0IGV4YWN0bHkgb25lIGlucHV0IHNoYXBlIGlzIHByb3ZpZGVkLlxuICAgIGdldEV4YWN0bHlPbmVTaGFwZShpbnB1dFNoYXBlKTtcblxuICAgIGlmICh0aGlzLmlucHV0cy5sZW5ndGggPT09IDAgfHwgdGhpcy5vdXRwdXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAnU2VxdWVudGlhbCBtb2RlbCBjYW5ub3QgYmUgYnVpbHQ6IG1vZGVsIGlzIGVtcHR5LicgK1xuICAgICAgICAgICcgQWRkIHNvbWUgbGF5ZXJzIGZpcnN0LicpO1xuICAgIH1cbiAgICAvLyBhY3R1YWxseSBjcmVhdGUgdGhlIG1vZGVsXG4gICAgdGhpcy5tb2RlbCA9IG5ldyBMYXllcnNNb2RlbCh7XG4gICAgICBpbnB1dHM6IHRoaXMuaW5wdXRzLFxuICAgICAgb3V0cHV0czogdGhpcy5vdXRwdXRzWzBdLFxuICAgICAgbmFtZTogdGhpcy5uYW1lICsgJ19tb2RlbCdcbiAgICB9KTtcbiAgICB0aGlzLm1vZGVsLnRyYWluYWJsZSA9IHRoaXMudHJhaW5hYmxlO1xuXG4gICAgLy8gbWlycm9yIG1vZGVsIGF0dHJpYnV0ZXNcbiAgICB0aGlzLnN1cHBvcnRzTWFza2luZyA9IHRoaXMubW9kZWwuc3VwcG9ydHNNYXNraW5nO1xuICAgIC8vIFRPRE8obWljaGFlbHRlcnJ5KTogQWRkIGNhY2hlc1xuICAgIHRoaXMuaW5wdXRMYXllcnMgPSB0aGlzLm1vZGVsLmlucHV0TGF5ZXJzO1xuICAgIHRoaXMuaW5wdXRMYXllcnNOb2RlSW5kaWNlcyA9IHRoaXMubW9kZWwuaW5wdXRMYXllcnNOb2RlSW5kaWNlcztcbiAgICB0aGlzLmlucHV0TGF5ZXJzVGVuc29ySW5kaWNlcyA9IHRoaXMubW9kZWwuaW5wdXRMYXllcnNUZW5zb3JJbmRpY2VzO1xuICAgIHRoaXMub3V0cHV0TGF5ZXJzID0gdGhpcy5tb2RlbC5vdXRwdXRMYXllcnM7XG4gICAgdGhpcy5vdXRwdXRMYXllcnNOb2RlSW5kaWNlcyA9IHRoaXMubW9kZWwub3V0cHV0TGF5ZXJzTm9kZUluZGljZXM7XG4gICAgdGhpcy5vdXRwdXRMYXllcnNUZW5zb3JJbmRpY2VzID0gdGhpcy5tb2RlbC5vdXRwdXRMYXllcnNUZW5zb3JJbmRpY2VzO1xuICAgIHRoaXMubm9kZXNCeURlcHRoID0gdGhpcy5tb2RlbC5ub2Rlc0J5RGVwdGg7XG4gICAgdGhpcy5jb250YWluZXJOb2RlcyA9IHRoaXMubW9kZWwuY29udGFpbmVyTm9kZXM7XG4gICAgdGhpcy5vdXRwdXROYW1lcyA9IHRoaXMubW9kZWwub3V0cHV0TmFtZXM7XG4gICAgdGhpcy5pbnB1dE5hbWVzID0gdGhpcy5tb2RlbC5pbnB1dE5hbWVzO1xuICAgIC8vIFRPRE8obWljaGFlbHRlcnJ5KTogQWRkIGZlZWRJbnB1dE5hbWVzLCBmZWVkSW5wdXRzLCBpZiBuZWVkZWQuXG4gICAgLy8gVE9ETyhtaWNoYWVsdGVycnkpOiBBZGQgY2FsbGJhY2tNb2RlbCBpZiBuZWVkZWQuXG4gICAgdGhpcy5idWlsdCA9IHRydWU7XG4gIH1cblxuICBvdmVycmlkZSBjb3VudFBhcmFtcygpOiBudW1iZXIge1xuICAgIGlmICghdGhpcy5idWlsdCkge1xuICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuY291bnRQYXJhbXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmludCBhIHRleHQgc3VtbWFyeSBvZiB0aGUgU2VxdWVudGlhbCBtb2RlbCdzIGxheWVycy5cbiAgICpcbiAgICogVGhlIHN1bW1hcnkgaW5jbHVkZXNcbiAgICogLSBOYW1lIGFuZCB0eXBlIG9mIGFsbCBsYXllcnMgdGhhdCBjb21wcmlzZSB0aGUgbW9kZWwuXG4gICAqIC0gT3V0cHV0IHNoYXBlKHMpIG9mIHRoZSBsYXllcnNcbiAgICogLSBOdW1iZXIgb2Ygd2VpZ2h0IHBhcmFtZXRlcnMgb2YgZWFjaCBsYXllclxuICAgKiAtIFRoZSB0b3RhbCBudW1iZXIgb2YgdHJhaW5hYmxlIGFuZCBub24tdHJhaW5hYmxlIHBhcmFtZXRlcnMgb2YgdGhlXG4gICAqIG1vZGVsLlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoKTtcbiAgICogbW9kZWwuYWRkKFxuICAgKiAgICAgdGYubGF5ZXJzLmRlbnNlKHt1bml0czogMTAwLCBpbnB1dFNoYXBlOiBbMTBdLCBhY3RpdmF0aW9uOiAncmVsdSd9KSk7XG4gICAqIG1vZGVsLmFkZCh0Zi5sYXllcnMuZGVuc2Uoe3VuaXRzOiAxLCBhY3RpdmF0aW9uOiAnc2lnbW9pZCd9KSk7XG4gICAqXG4gICAqIG1vZGVsLnN1bW1hcnkoKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBsaW5lTGVuZ3RoIEN1c3RvbSBsaW5lIGxlbmd0aCwgaW4gbnVtYmVyIG9mIGNoYXJhY3RlcnMuXG4gICAqIEBwYXJhbSBwb3NpdGlvbnMgQ3VzdG9tIHdpZHRocyBvZiBlYWNoIG9mIHRoZSBjb2x1bW5zLCBhcyBlaXRoZXJcbiAgICogICBmcmFjdGlvbnMgb2YgYGxpbmVMZW5ndGhgIChlLmcuLCBgWzAuNSwgMC43NSwgMV1gKSBvciBhYnNvbHV0ZSBudW1iZXJcbiAgICogICBvZiBjaGFyYWN0ZXJzIChlLmcuLCBgWzMwLCA1MCwgNjVdYCkuIEVhY2ggbnVtYmVyIGNvcnJlc3BvbmRzIHRvXG4gICAqICAgcmlnaHQtbW9zdCAoaS5lLiwgZW5kaW5nKSBwb3NpdGlvbiBvZiBhIGNvbHVtbi5cbiAgICogQHBhcmFtIHByaW50Rm4gQ3VzdG9tIHByaW50IGZ1bmN0aW9uLiBDYW4gYmUgdXNlZCB0byByZXBsYWNlIHRoZSBkZWZhdWx0XG4gICAqICAgYGNvbnNvbGUubG9nYC4gRm9yIGV4YW1wbGUsIHlvdSBjYW4gdXNlIGB4ID0+IHt9YCB0byBtdXRlIHRoZSBwcmludGVkXG4gICAqICAgbWVzc2FnZXMgaW4gdGhlIGNvbnNvbGUuXG4gICAqXG4gICAqIEBkb2Mge2hlYWRpbmc6ICdNb2RlbHMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBvdmVycmlkZSBzdW1tYXJ5KFxuICAgICAgbGluZUxlbmd0aD86IG51bWJlciwgcG9zaXRpb25zPzogbnVtYmVyW10sXG4gICAgICBwcmludEZuOlxuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgIChtZXNzYWdlPzogYW55LCAuLi5vcHRpb25hbFBhcmFtczogYW55W10pID0+IHZvaWQgPSBjb25zb2xlLmxvZykge1xuICAgIGlmICghdGhpcy5idWlsdCkge1xuICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH1cbiAgICBzdXBlci5zdW1tYXJ5KGxpbmVMZW5ndGgsIHBvc2l0aW9ucywgcHJpbnRGbik7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgd2VpZ2h0cyBvZiB0aGUgbW9kZWwuXG4gICAqXG4gICAqIEBwYXJhbSB3ZWlnaHRzIFNob3VsZCBiZSBhIGxpc3Qgb2YgVGVuc29ycyB3aXRoIHNoYXBlcyBhbmQgdHlwZXMgbWF0Y2hpbmdcbiAgICogICB0aGUgb3V0cHV0IG9mIGBtb2RlbC5nZXRXZWlnaHRzKClgLlxuICAgKi9cbiAgb3ZlcnJpZGUgc2V0V2VpZ2h0cyh3ZWlnaHRzOiBUZW5zb3JbXSk6IHZvaWQge1xuICAgIGlmICh0aGlzLm1vZGVsID09IG51bGwpIHtcbiAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9XG4gICAgdGhpcy5tb2RlbC5zZXRXZWlnaHRzKHdlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGxvc3MgdmFsdWUgJiBtZXRyaWNzIHZhbHVlcyBmb3IgdGhlIG1vZGVsIGluIHRlc3QgbW9kZS5cbiAgICpcbiAgICogTG9zcyBhbmQgbWV0cmljcyBhcmUgc3BlY2lmaWVkIGR1cmluZyBgY29tcGlsZSgpYCwgd2hpY2ggbmVlZHMgdG8gaGFwcGVuXG4gICAqIGJlZm9yZSBjYWxscyB0byBgZXZhbHVhdGUoKWAuXG4gICAqXG4gICAqIENvbXB1dGF0aW9uIGlzIGRvbmUgaW4gYmF0Y2hlcy5cbiAgICpcbiAgICogYGBganNcbiAgICogY29uc3QgbW9kZWwgPSB0Zi5zZXF1ZW50aWFsKHtcbiAgICogICBsYXllcnM6IFt0Zi5sYXllcnMuZGVuc2Uoe3VuaXRzOiAxLCBpbnB1dFNoYXBlOiBbMTBdfSldXG4gICAqIH0pO1xuICAgKiBtb2RlbC5jb21waWxlKHtvcHRpbWl6ZXI6ICdzZ2QnLCBsb3NzOiAnbWVhblNxdWFyZWRFcnJvcid9KTtcbiAgICogY29uc3QgcmVzdWx0ID0gbW9kZWwuZXZhbHVhdGUodGYub25lcyhbOCwgMTBdKSwgdGYub25lcyhbOCwgMV0pLCB7XG4gICAqICAgYmF0Y2hTaXplOiA0LFxuICAgKiB9KTtcbiAgICogcmVzdWx0LnByaW50KCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0geCBgdGYuVGVuc29yYCBvZiB0ZXN0IGRhdGEsIG9yIGFuIGBBcnJheWAgb2YgYHRmLlRlbnNvcmBzIGlmIHRoZVxuICAgKiBtb2RlbCBoYXMgbXVsdGlwbGUgaW5wdXRzLlxuICAgKiBAcGFyYW0geSBgdGYuVGVuc29yYCBvZiB0YXJnZXQgZGF0YSwgb3IgYW4gYEFycmF5YCBvZiBgdGYuVGVuc29yYHMgaWYgdGhlXG4gICAqIG1vZGVsIGhhcyBtdWx0aXBsZSBvdXRwdXRzLlxuICAgKiBAcGFyYW0gYXJncyBBIGBNb2RlbEV2YWx1YXRlQ29uZmlnYCwgY29udGFpbmluZyBvcHRpb25hbCBmaWVsZHMuXG4gICAqXG4gICAqIEByZXR1cm4gYFNjYWxhcmAgdGVzdCBsb3NzIChpZiB0aGUgbW9kZWwgaGFzIGEgc2luZ2xlIG91dHB1dCBhbmQgbm9cbiAgICogICBtZXRyaWNzKSBvciBgQXJyYXlgIG9mIGBTY2FsYXJgcyAoaWYgdGhlIG1vZGVsIGhhcyBtdWx0aXBsZSBvdXRwdXRzXG4gICAqICAgYW5kL29yIG1ldHJpY3MpLiBUaGUgYXR0cmlidXRlIGBtb2RlbC5tZXRyaWNzTmFtZXNgXG4gICAqICAgd2lsbCBnaXZlIHlvdSB0aGUgZGlzcGxheSBsYWJlbHMgZm9yIHRoZSBzY2FsYXIgb3V0cHV0cy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAgICovXG4gIG92ZXJyaWRlIGV2YWx1YXRlKFxuICAgICAgeDogVGVuc29yfFRlbnNvcltdLCB5OiBUZW5zb3J8VGVuc29yW10sXG4gICAgICBhcmdzOiBNb2RlbEV2YWx1YXRlQXJncyA9IHt9KTogU2NhbGFyfFNjYWxhcltdIHtcbiAgICBpZiAoIXRoaXMuYnVpbHQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgJ1RoZSBtb2RlbCBuZWVkcyB0byBiZSBjb21waWxlZCBiZWZvcmUgYmVpbmcgdXNlZC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubW9kZWwuZXZhbHVhdGUoeCwgeSwgYXJncyk7XG4gIH1cblxuICAvLyBUT0RPKGNhaXMpOiBBZGQgY29kZSBzbmlwcGV0IGJlbG93IG9uY2UgcmVhbCBkYXRhc2V0IG9iamVjdHMgYXJlXG4gIC8vICAgYXZhaWxhYmxlLlxuICAvKipcbiAgICogRXZhbHVhdGUgbW9kZWwgdXNpbmcgYSBkYXRhc2V0IG9iamVjdC5cbiAgICpcbiAgICogTm90ZTogVW5saWtlIGBldmFsdWF0ZSgpYCwgdGhpcyBtZXRob2QgaXMgYXN5bmNocm9ub3VzIChgYXN5bmNgKS5cbiAgICpcbiAgICogQHBhcmFtIGRhdGFzZXQgQSBkYXRhc2V0IG9iamVjdC4gSXRzIGBpdGVyYXRvcigpYCBtZXRob2QgaXMgZXhwZWN0ZWRcbiAgICogICB0byBnZW5lcmF0ZSBhIGRhdGFzZXQgaXRlcmF0b3Igb2JqZWN0LCB0aGUgYG5leHQoKWAgbWV0aG9kIG9mIHdoaWNoXG4gICAqICAgaXMgZXhwZWN0ZWQgdG8gcHJvZHVjZSBkYXRhIGJhdGNoZXMgZm9yIGV2YWx1YXRpb24uIFRoZSByZXR1cm4gdmFsdWVcbiAgICogICBvZiB0aGUgYG5leHQoKWAgY2FsbCBvdWdodCB0byBjb250YWluIGEgYm9vbGVhbiBgZG9uZWAgZmllbGQgYW5kIGFcbiAgICogICBgdmFsdWVgIGZpZWxkLiBUaGUgYHZhbHVlYCBmaWVsZCBpcyBleHBlY3RlZCB0byBiZSBhbiBhcnJheSBvZiB0d29cbiAgICogICBgdGYuVGVuc29yYHMgb3IgYW4gYXJyYXkgb2YgdHdvIG5lc3RlZCBgdGYuVGVuc29yYCBzdHJ1Y3R1cmVzLiBUaGUgZm9ybWVyXG4gICAqICAgY2FzZSBpcyBmb3IgbW9kZWxzIHdpdGggZXhhY3RseSBvbmUgaW5wdXQgYW5kIG9uZSBvdXRwdXQgKGUuZy5cbiAgICogICBhIHNlcXVlbnRpYWwgbW9kZWwpLiBUaGUgbGF0dGVyIGNhc2UgaXMgZm9yIG1vZGVscyB3aXRoIG11bHRpcGxlXG4gICAqICAgaW5wdXRzIGFuZC9vciBtdWx0aXBsZSBvdXRwdXRzLiBPZiB0aGUgdHdvIGl0ZW1zIGluIHRoZSBhcnJheSwgdGhlXG4gICAqICAgZmlyc3QgaXMgdGhlIGlucHV0IGZlYXR1cmUocykgYW5kIHRoZSBzZWNvbmQgaXMgdGhlIG91dHB1dCB0YXJnZXQocykuXG4gICAqIEBwYXJhbSBhcmdzIEEgY29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRoZSBkYXRhc2V0LWJhc2VkIGV2YWx1YXRpb24uXG4gICAqIEByZXR1cm5zIExvc3MgYW5kIG1ldHJpYyB2YWx1ZXMgYXMgYW4gQXJyYXkgb2YgYFNjYWxhcmAgb2JqZWN0cy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ01vZGVscycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAgICovXG4gIG92ZXJyaWRlIGFzeW5jIGV2YWx1YXRlRGF0YXNldChkYXRhc2V0OiBEYXRhc2V0PHt9PixcbiAgICAgIGFyZ3M6IE1vZGVsRXZhbHVhdGVEYXRhc2V0QXJncyk6IFByb21pc2U8U2NhbGFyfFNjYWxhcltdPiB7XG4gICAgaWYgKCF0aGlzLmJ1aWx0KSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICdUaGUgbW9kZWwgbmVlZHMgdG8gYmUgY29tcGlsZWQgYmVmb3JlIGJlaW5nIHVzZWQuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZGVsLmV2YWx1YXRlRGF0YXNldChkYXRhc2V0LCBhcmdzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgb3V0cHV0IHByZWRpY3Rpb25zIGZvciB0aGUgaW5wdXQgc2FtcGxlcy5cbiAgICpcbiAgICogQ29tcHV0YXRpb24gaXMgZG9uZSBpbiBiYXRjaGVzLlxuICAgKlxuICAgKiBOb3RlOiB0aGUgXCJzdGVwXCIgbW9kZSBvZiBwcmVkaWN0KCkgaXMgY3VycmVudGx5IG5vdCBzdXBwb3J0ZWQuXG4gICAqICAgVGhpcyBpcyBiZWNhdXNlIHRoZSBUZW5zb3JGbG93LmpzIGNvcmUgYmFja2VuZCBpcyBpbXBlcmF0aXZlIG9ubHkuXG4gICAqXG4gICAqIGBgYGpzXG4gICAqIGNvbnN0IG1vZGVsID0gdGYuc2VxdWVudGlhbCh7XG4gICAqICAgbGF5ZXJzOiBbdGYubGF5ZXJzLmRlbnNlKHt1bml0czogMSwgaW5wdXRTaGFwZTogWzEwXX0pXVxuICAgKiB9KTtcbiAgICogbW9kZWwucHJlZGljdCh0Zi5vbmVzKFsyLCAxMF0pKS5wcmludCgpO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHggVGhlIGlucHV0IGRhdGEsIGFzIGEgVGVuc29yLCBvciBhbiBgQXJyYXlgIG9mIGB0Zi5UZW5zb3JgcyBpZlxuICAgKiAgIHRoZSBtb2RlbCBoYXMgbXVsdGlwbGUgaW5wdXRzLlxuICAgKiBAcGFyYW0gY29uaWZnIEEgYE1vZGVsUHJlZGljdENvbmZpZ2Agb2JqZWN0IGNvbnRhaW5pbmcgb3B0aW9uYWwgZmllbGRzLlxuICAgKlxuICAgKiBAcmV0dXJuIGB0Zi5UZW5zb3JgKHMpIG9mIHByZWRpY3Rpb25zLlxuICAgKlxuICAgKiBAZXhjZXB0aW9uIFZhbHVlRXJyb3IgSW4gY2FzZSBvZiBtaXNtYXRjaCBiZXR3ZWVuIHRoZSBwcm92aWRlZCBpbnB1dCBkYXRhXG4gICAqICAgYW5kIHRoZSBtb2RlbCdzIGV4cGVjdGF0aW9ucywgb3IgaW4gY2FzZSBhIHN0YXRlZnVsIG1vZGVsIHJlY2VpdmVzIGFcbiAgICogICBudW1iZXIgb2Ygc2FtcGxlcyB0aGF0IGlzIG5vdCBhIG11bHRpcGxlIG9mIHRoZSBiYXRjaCBzaXplLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgb3ZlcnJpZGUgcHJlZGljdCh4OiBUZW5zb3J8VGVuc29yW10sIGFyZ3M6IE1vZGVsUHJlZGljdEFyZ3MgPSB7fSk6XG4gICAgICBUZW5zb3J8VGVuc29yW10ge1xuICAgIGlmICh0aGlzLm1vZGVsID09IG51bGwpIHtcbiAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubW9kZWwucHJlZGljdCh4LCBhcmdzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHByZWRpY3Rpb25zIGZvciBhIHNpbmdsZSBiYXRjaCBvZiBzYW1wbGVzLlxuICAgKlxuICAgKiBAcGFyYW0geDogSW5wdXQgc2FtcGxlcywgYXMgYSBUZW5zb3IsIG9yIGxpc3Qgb2YgVGVuc29ycyAoaWYgdGhlIG1vZGVsXG4gICAqICAgaGFzIG11bHRpcGxlIGlucHV0cykuXG4gICAqIEByZXR1cm4gVGVuc29yKHMpIG9mIHByZWRpY3Rpb25zXG4gICAqL1xuICBvdmVycmlkZSBwcmVkaWN0T25CYXRjaCh4OiBUZW5zb3IpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIGlmICh0aGlzLm1vZGVsID09IG51bGwpIHtcbiAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubW9kZWwucHJlZGljdE9uQmF0Y2goeCk7XG4gIH1cblxuICAvKipcbiAgICogU2VlIGBMYXllcnNNb2RlbC5jb21waWxlYC5cbiAgICpcbiAgICogQHBhcmFtIGFyZ3NcbiAgICovXG4gIG92ZXJyaWRlIGNvbXBpbGUoYXJnczogTW9kZWxDb21waWxlQXJncyk6IHZvaWQge1xuICAgIHRoaXMuYnVpbGQoKTtcbiAgICB0aGlzLm1vZGVsLmNvbXBpbGUoYXJncyk7XG4gICAgdGhpcy5vcHRpbWl6ZXJfID0gdGhpcy5tb2RlbC5vcHRpbWl6ZXI7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIHRoaXMuaXNPcHRpbWl6ZXJPd25lZCA9ICh0aGlzLm1vZGVsIGFzIGFueSkuaXNPcHRpbWl6ZXJPd25lZDtcbiAgICB0aGlzLmxvc3MgPSB0aGlzLm1vZGVsLmxvc3M7XG4gICAgdGhpcy5tZXRyaWNzID0gdGhpcy5tb2RlbC5tZXRyaWNzO1xuICAgIC8vIFRPRE8oY2Fpcyk6IEFkZCB0aGlzLmxvc3NXZWlnaHRzLCB0aGlzLnNhbXBsZVdlaWdodE1vZGUsXG4gICAgLy8gICB0aGlzLndlaWdodGVkTWV0cmljcywgdGhpcy50YXJnZXRzLlxuICAgIHRoaXMubWV0cmljc1RlbnNvcnMgPSB0aGlzLm1vZGVsLm1ldHJpY3NUZW5zb3JzO1xuICAgIHRoaXMubWV0cmljc05hbWVzID0gdGhpcy5tb2RlbC5tZXRyaWNzTmFtZXM7XG4gICAgLy8gVE9ETyhjYWlzKTogQWRkIHNhbXBsZVdlaWdodHMuXG4gIH1cblxuICBvdmVycmlkZSBnZXQgb3B0aW1pemVyKCk6IE9wdGltaXplciB7XG4gICAgcmV0dXJuIHRoaXMubW9kZWwgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IHRoaXMubW9kZWwub3B0aW1pemVyO1xuICB9XG5cbiAgb3ZlcnJpZGUgc2V0IG9wdGltaXplcihvcHRpbWl6ZXI6IE9wdGltaXplcikge1xuICAgIHRoaXMubW9kZWwub3B0aW1pemVyID0gb3B0aW1pemVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWlucyB0aGUgbW9kZWwgZm9yIGEgZml4ZWQgbnVtYmVyIG9mIGVwb2NocyAoaXRlcmF0aW9ucyBvbiBhIGRhdGFzZXQpLlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoe1xuICAgKiAgIGxheWVyczogW3RmLmxheWVycy5kZW5zZSh7dW5pdHM6IDEsIGlucHV0U2hhcGU6IFsxMF19KV1cbiAgICogfSk7XG4gICAqIG1vZGVsLmNvbXBpbGUoe29wdGltaXplcjogJ3NnZCcsIGxvc3M6ICdtZWFuU3F1YXJlZEVycm9yJ30pO1xuICAgKiBjb25zdCBoaXN0b3J5ID0gYXdhaXQgbW9kZWwuZml0KHRmLm9uZXMoWzgsIDEwXSksIHRmLm9uZXMoWzgsIDFdKSwge1xuICAgKiAgIGJhdGNoU2l6ZTogNCxcbiAgICogICBlcG9jaHM6IDNcbiAgICogfSk7XG4gICAqIGNvbnNvbGUubG9nKGhpc3RvcnkuaGlzdG9yeS5sb3NzWzBdKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSB4IGB0Zi5UZW5zb3JgIG9mIHRyYWluaW5nIGRhdGEsIG9yIGFuIGFycmF5IG9mIGB0Zi5UZW5zb3JgcyBpZiB0aGVcbiAgICogbW9kZWwgaGFzIG11bHRpcGxlIGlucHV0cy4gSWYgYWxsIGlucHV0cyBpbiB0aGUgbW9kZWwgYXJlIG5hbWVkLCB5b3UgY2FuXG4gICAqIGFsc28gcGFzcyBhIGRpY3Rpb25hcnkgbWFwcGluZyBpbnB1dCBuYW1lcyB0byBgdGYuVGVuc29yYHMuXG4gICAqIEBwYXJhbSB5IGB0Zi5UZW5zb3JgIG9mIHRhcmdldCAobGFiZWwpIGRhdGEsIG9yIGFuIGFycmF5IG9mIGB0Zi5UZW5zb3JgcyBpZlxuICAgKiB0aGUgbW9kZWwgaGFzIG11bHRpcGxlIG91dHB1dHMuIElmIGFsbCBvdXRwdXRzIGluIHRoZSBtb2RlbCBhcmUgbmFtZWQsIHlvdVxuICAgKiAgY2FuIGFsc28gcGFzcyBhIGRpY3Rpb25hcnkgbWFwcGluZyBvdXRwdXQgbmFtZXMgdG8gYHRmLlRlbnNvcmBzLlxuICAgKiBAcGFyYW0gYXJncyAgQSBgTW9kZWxGaXRDb25maWdgLCBjb250YWluaW5nIG9wdGlvbmFsIGZpZWxkcy5cbiAgICpcbiAgICogQHJldHVybiBBIGBIaXN0b3J5YCBpbnN0YW5jZS4gSXRzIGBoaXN0b3J5YCBhdHRyaWJ1dGUgY29udGFpbnMgYWxsXG4gICAqICAgaW5mb3JtYXRpb24gY29sbGVjdGVkIGR1cmluZyB0cmFpbmluZy5cbiAgICpcbiAgICogQGV4Y2VwdGlvbiBWYWx1ZUVycm9yIEluIGNhc2Ugb2YgbWlzbWF0Y2ggYmV0d2VlbiB0aGUgcHJvdmlkZWQgaW5wdXQgZGF0YVxuICAgKiAgIGFuZCB3aGF0IHRoZSBtb2RlbCBleHBlY3RzLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgb3ZlcnJpZGUgYXN5bmMgZml0KFxuICAgICAgeDogVGVuc29yfFRlbnNvcltdfHtbaW5wdXROYW1lOiBzdHJpbmddOiBUZW5zb3J9LFxuICAgICAgeTogVGVuc29yfFRlbnNvcltdfHtbaW5wdXROYW1lOiBzdHJpbmddOiBUZW5zb3J9LFxuICAgICAgYXJnczogTW9kZWxGaXRBcmdzID0ge30pOiBQcm9taXNlPEhpc3Rvcnk+IHtcbiAgICBpZiAoIXRoaXMuYnVpbHQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgJ1RoZSBtb2RlbCBuZWVkcyB0byBiZSBjb21waWxlZCBiZWZvcmUgJyArXG4gICAgICAgICAgJ2JlaW5nIHVzZWQuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZGVsLmZpdCh4LCB5LCBhcmdzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFpbnMgdGhlIG1vZGVsIHVzaW5nIGEgZGF0YXNldCBvYmplY3QuXG4gICAqXG4gICAqIGBgYGpzXG4gICAqIGNvbnN0IHhBcnJheSA9IFtcbiAgICogICBbMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSwgMV0sXG4gICAqICAgWzEsIDEsIDEsIDEsIDEsIDEsIDEsIDEsIDFdLFxuICAgKiAgIFsxLCAxLCAxLCAxLCAxLCAxLCAxLCAxLCAxXSxcbiAgICogICBbMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSwgMV0sXG4gICAqIF07XG4gICAqIGNvbnN0IHlBcnJheSA9IFsxLCAxLCAxLCAxXTtcbiAgICogLy8gQ3JlYXRlIGEgZGF0YXNldCBmcm9tIHRoZSBKYXZhU2NyaXB0IGFycmF5LlxuICAgKiBjb25zdCB4RGF0YXNldCA9IHRmLmRhdGEuYXJyYXkoeEFycmF5KTtcbiAgICogY29uc3QgeURhdGFzZXQgPSB0Zi5kYXRhLmFycmF5KHlBcnJheSk7XG4gICAqIC8vIFppcCBjb21iaW5lcyB0aGUgYHhgIGFuZCBgeWAgRGF0YXNldHMgaW50byBhIHNpbmdsZSBEYXRhc2V0LCB0aGVcbiAgICogLy8gaXRlcmF0b3Igb2Ygd2hpY2ggd2lsbCByZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgb2YgdHdvIHRlbnNvcnMsXG4gICAqIC8vIGNvcnJlc3BvbmRpbmcgdG8gYHhgIGFuZCBgeWAuICBUaGUgY2FsbCB0byBgYmF0Y2goNClgIHdpbGwgYnVuZGxlXG4gICAqIC8vIGZvdXIgc3VjaCBzYW1wbGVzIGludG8gYSBzaW5nbGUgb2JqZWN0LCB3aXRoIHRoZSBzYW1lIGtleXMgbm93IHBvaW50aW5nXG4gICAqIC8vIHRvIHRlbnNvcnMgdGhhdCBob2xkIDQgZXhhbXBsZXMsIG9yZ2FuaXplZCBhbG9uZyB0aGUgYmF0Y2ggZGltZW5zaW9uLlxuICAgKiAvLyBUaGUgY2FsbCB0byBgc2h1ZmZsZSg0KWAgY2F1c2VzIGVhY2ggaXRlcmF0aW9uIHRocm91Z2ggdGhlIGRhdGFzZXQgdG9cbiAgICogLy8gaGFwcGVuIGluIGEgZGlmZmVyZW50IG9yZGVyLiAgVGhlIHNpemUgb2YgdGhlIHNodWZmbGUgd2luZG93IGlzIDQuXG4gICAqIGNvbnN0IHh5RGF0YXNldCA9IHRmLmRhdGEuemlwKHt4czogeERhdGFzZXQsIHlzOiB5RGF0YXNldH0pXG4gICAqICAgICAuYmF0Y2goNClcbiAgICogICAgIC5zaHVmZmxlKDQpO1xuICAgKiBjb25zdCBtb2RlbCA9IHRmLnNlcXVlbnRpYWwoe1xuICAgKiAgIGxheWVyczogW3RmLmxheWVycy5kZW5zZSh7dW5pdHM6IDEsIGlucHV0U2hhcGU6IFs5XX0pXVxuICAgKiB9KTtcbiAgICogbW9kZWwuY29tcGlsZSh7b3B0aW1pemVyOiAnc2dkJywgbG9zczogJ21lYW5TcXVhcmVkRXJyb3InfSk7XG4gICAqIGNvbnN0IGhpc3RvcnkgPSBhd2FpdCBtb2RlbC5maXREYXRhc2V0KHh5RGF0YXNldCwge1xuICAgKiAgIGVwb2NoczogNCxcbiAgICogICBjYWxsYmFja3M6IHtvbkVwb2NoRW5kOiAoZXBvY2gsIGxvZ3MpID0+IGNvbnNvbGUubG9nKGxvZ3MubG9zcyl9XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRhdGFzZXQgQSBkYXRhc2V0IG9iamVjdC4gSXRzIGBpdGVyYXRvcigpYCBtZXRob2QgaXMgZXhwZWN0ZWQgdG9cbiAgICogICBnZW5lcmF0ZSBhIGRhdGFzZXQgaXRlcmF0b3Igb2JqZWN0LCB0aGUgYG5leHQoKWAgbWV0aG9kIG9mIHdoaWNoIGlzXG4gICAqICAgZXhwZWN0ZWQgdG8gcHJvZHVjZSBkYXRhIGJhdGNoZXMgZm9yIGV2YWx1YXRpb24uIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhlXG4gICAqICAgYG5leHQoKWAgY2FsbCBvdWdodCB0byBjb250YWluIGEgYm9vbGVhbiBgZG9uZWAgZmllbGQgYW5kIGEgYHZhbHVlYFxuICAgKiAgIGZpZWxkLlxuICAgKlxuICAgKiAgIFRoZSBgdmFsdWVgIGZpZWxkIGlzIGV4cGVjdGVkIHRvIGJlIGFuIG9iamVjdCBvZiB3aXRoIGZpZWxkc1xuICAgKiAgIGB4c2AgYW5kIGB5c2AsIHdoaWNoIHBvaW50IHRvIHRoZSBmZWF0dXJlIHRlbnNvciBhbmQgdGhlIHRhcmdldCB0ZW5zb3IsXG4gICAqICAgcmVzcGVjdGl2ZWx5LiBUaGlzIGNhc2UgaXMgZm9yIG1vZGVscyB3aXRoIGV4YWN0bHkgb25lIGlucHV0IGFuZCBvbmVcbiAgICogICBvdXRwdXQgKGUuZy4gYSBzZXF1ZW50aWFsIG1vZGVsKS4gRm9yIGV4YW1wbGU6XG4gICAqICAgYGBganNcbiAgICogICB7dmFsdWU6IHt4czogeHNUZW5zb3IsIHlzOiB5c1RlbnNvcn0sIGRvbmU6IGZhbHNlfVxuICAgKiAgIGBgYFxuICAgKlxuICAgKiAgIElmIHRoZSBtb2RlbCBoYXMgbXVsdGlwbGUgaW5wdXRzLCB0aGUgYHhzYCBmaWVsZCBvZiBgdmFsdWVgIHNob3VsZFxuICAgKiAgIGJlIGFuIG9iamVjdCBtYXBwaW5nIGlucHV0IG5hbWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgZmVhdHVyZSB0ZW5zb3JzLlxuICAgKiAgIEZvciBleGFtcGxlOlxuICAgKiAgIGBgYGpzXG4gICAqICAge1xuICAgKiAgICAgdmFsdWU6IHtcbiAgICogICAgICAgeHM6IHtcbiAgICogICAgICAgICBpbnB1dF8xOiB4c1RlbnNvcjEsXG4gICAqICAgICAgICAgaW5wdXRfMjogeHNUZW5zb3IyXG4gICAqICAgICAgIH0sXG4gICAqICAgICAgIHlzOiB5c1RlbnNvclxuICAgKiAgICAgfSxcbiAgICogICAgIGRvbmU6IGZhbHNlXG4gICAqICAgfVxuICAgKiAgIGBgYFxuICAgKiAgIElmIHRoZSBtb2RlbCBoYXMgbXVsdGlwbGUgb3V0cHV0cywgdGhlIGB5c2AgZmllbGQgb2YgYHZhbHVlYCBzaG91bGRcbiAgICogICBiZSBhbiBvYmplY3QgbWFwcGluZyBvdXRwdXQgbmFtZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSB0YXJnZXQgdGVuc29ycy5cbiAgICogICBGb3IgZXhhbXBsZTpcbiAgICogICBgYGBqc1xuICAgKiAgIHtcbiAgICogICAgIHZhbHVlOiB7XG4gICAqICAgICAgIHhzOiB4c1RlbnNvcixcbiAgICogICAgICAgeXM6IHtcbiAgICogICAgICAgICBvdXRwdXRfMTogeXNUZW5zb3IxLFxuICAgKiAgICAgICAgIG91dHB1dF8yOiB5c1RlbnNvcjJcbiAgICogICAgICAgfSxcbiAgICogICAgIH0sXG4gICAqICAgICBkb25lOiBmYWxzZVxuICAgKiAgIH1cbiAgICogICBgYGBcbiAgICogQHBhcmFtIGFyZ3MgQSBgTW9kZWxGaXREYXRhc2V0QXJnc2AsIGNvbnRhaW5pbmcgb3B0aW9uYWwgZmllbGRzLlxuICAgKlxuICAgKiBAcmV0dXJuIEEgYEhpc3RvcnlgIGluc3RhbmNlLiBJdHMgYGhpc3RvcnlgIGF0dHJpYnV0ZSBjb250YWlucyBhbGxcbiAgICogICBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgZHVyaW5nIHRyYWluaW5nLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnLCBpZ25vcmVDSTogdHJ1ZX1cbiAgICovXG4gIG92ZXJyaWRlIGFzeW5jIGZpdERhdGFzZXQ8VD4oZGF0YXNldDogRGF0YXNldDxUPixcbiAgICAgIGFyZ3M6IE1vZGVsRml0RGF0YXNldEFyZ3M8VD4pOiBQcm9taXNlPEhpc3Rvcnk+IHtcbiAgICBpZiAoIXRoaXMuYnVpbHQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgJ1RoZSBtb2RlbCBuZWVkcyB0byBiZSBjb21waWxlZCBiZWZvcmUgJyArXG4gICAgICAgICAgJ2JlaW5nIHVzZWQuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZGVsLmZpdERhdGFzZXQoZGF0YXNldCwgYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogUnVucyBhIHNpbmdsZSBncmFkaWVudCB1cGRhdGUgb24gYSBzaW5nbGUgYmF0Y2ggb2YgZGF0YS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgZGlmZmVycyBmcm9tIGBmaXQoKWAgYW5kIGBmaXREYXRhc2V0KClgIGluIHRoZSBmb2xsb3dpbmdcbiAgICogcmVnYXJkczpcbiAgICogICAtIEl0IG9wZXJhdGVzIG9uIGV4YWN0bHkgb25lIGJhdGNoIG9mIGRhdGEuXG4gICAqICAgLSBJdCByZXR1cm5zIG9ubHkgdGhlIGxvc3MgYW5kIG1ldHJpYyB2YWx1ZXMsIGluc3RlYWQgb2ZcbiAgICogICAgIHJldHVybmluZyB0aGUgYmF0Y2gtYnktYmF0Y2ggbG9zcyBhbmQgbWV0cmljIHZhbHVlcy5cbiAgICogICAtIEl0IGRvZXNuJ3Qgc3VwcG9ydCBmaW5lLWdyYWluZWQgb3B0aW9ucyBzdWNoIGFzIHZlcmJvc2l0eSBhbmRcbiAgICogICAgIGNhbGxiYWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHggSW5wdXQgZGF0YS4gSXQgY291bGQgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4gICAqICAgLSBBIGB0Zi5UZW5zb3JgLCBvciBhbiBBcnJheSBvZiBgdGYuVGVuc29yYHMgKGluIGNhc2UgdGhlIG1vZGVsIGhhc1xuICAgKiAgICAgbXVsdGlwbGUgaW5wdXRzKS5cbiAgICogICAtIEFuIE9iamVjdCBtYXBwaW5nIGlucHV0IG5hbWVzIHRvIGNvcnJlc3BvbmRpbmcgYHRmLlRlbnNvcmAgKGlmIHRoZVxuICAgKiAgICAgbW9kZWwgaGFzIG5hbWVkIGlucHV0cykuXG4gICAqIEBwYXJhbSB5IFRhcmdldCBkYXRhLiBJdCBjb3VsZCBiZSBlaXRoZXIgYSBgdGYuVGVuc29yYCBvciBtdWx0aXBsZVxuICAgKiAgIGB0Zi5UZW5zb3Jgcy4gSXQgc2hvdWxkIGJlIGNvbnNpc3RlbnQgd2l0aCBgeGAuXG4gICAqIEByZXR1cm5zIFRyYWluaW5nIGxvc3Mgb3IgbG9zc2VzIChpbiBjYXNlIHRoZSBtb2RlbCBoYXNcbiAgICogICBtdWx0aXBsZSBvdXRwdXRzKSwgYWxvbmcgd2l0aCBtZXRyaWNzIChpZiBhbnkpLCBhcyBudW1iZXJzLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnTW9kZWxzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgb3ZlcnJpZGUgYXN5bmMgdHJhaW5PbkJhdGNoKFxuICAgICAgeDogVGVuc29yfFRlbnNvcltdfHtbaW5wdXROYW1lOiBzdHJpbmddOiBUZW5zb3J9LFxuICAgICAgeTogVGVuc29yfFRlbnNvcltdfFxuICAgICAge1tpbnB1dE5hbWU6IHN0cmluZ106IFRlbnNvcn0pOiBQcm9taXNlPG51bWJlcnxudW1iZXJbXT4ge1xuICAgIHJldHVybiB0aGlzLm1vZGVsLnRyYWluT25CYXRjaCh4LCB5KTtcbiAgfVxuXG4gIC8qIFNlZSBwYXJlbnQgY2xhc3MgZm9yIEpzRG9jICovXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgb3ZlcnJpZGUgZnJvbUNvbmZpZzxUIGV4dGVuZHMgc2VyaWFsaXphdGlvbi5TZXJpYWxpemFibGU+KFxuICAgICAgY2xzOiBzZXJpYWxpemF0aW9uLlNlcmlhbGl6YWJsZUNvbnN0cnVjdG9yPFQ+LFxuICAgICAgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QsXG4gICAgICBjdXN0b21PYmplY3RzID0ge30gYXMgc2VyaWFsaXphdGlvbi5Db25maWdEaWN0LFxuICAgICAgZmFzdFdlaWdodEluaXQgPSBmYWxzZSk6IFQge1xuICAgIGxldCBjb25maWdBcnJheTogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0QXJyYXk7XG4gICAgbGV0IGV4dHJhTW9kZWxDb25maWc6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHt9O1xuICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgaWYgKCEoY29uZmlnWzBdLmNsYXNzTmFtZSAhPSBudWxsKSB8fFxuICAgICAgICAgIGNvbmZpZ1swXVsnY2xhc3NOYW1lJ10gPT09ICdNZXJnZScpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoJ0xlZ2FjeSBzZXJpYWxpemF0aW9uIGZvcm1hdCBub3Qgc3VwcG9ydGVkIHlldC4nKTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZ0FycmF5ID0gY29uZmlnO1xuICAgIH0gZWxzZSB7XG4gICAgICB1dGlsLmFzc2VydChcbiAgICAgICAgICBjb25maWdbJ2xheWVycyddICE9IG51bGwsXG4gICAgICAgICAgKCkgPT5cbiAgICAgICAgICAgICAgYFdoZW4gdGhlIGNvbmZpZyBkYXRhIGZvciBhIFNlcXVlbnRpYWwgbW9kZWwgaXMgbm90IGFuIEFycmF5LCBgICtcbiAgICAgICAgICAgICAgYGl0IG11c3QgYmUgYW4gT2JqZWN0IHRoYXQgY29udGFpbnMgdGhlICdsYXllcnMnIGZpZWxkLmApO1xuICAgICAgY29uZmlnQXJyYXkgPSBjb25maWdbJ2xheWVycyddIGFzIHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdEFycmF5O1xuICAgICAgZGVsZXRlIGNvbmZpZ1snbGF5ZXJzJ107XG4gICAgICBleHRyYU1vZGVsQ29uZmlnID0gY29uZmlnO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZGVsID0gbmV3IGNscyhleHRyYU1vZGVsQ29uZmlnKTtcbiAgICBpZiAoIShtb2RlbCBpbnN0YW5jZW9mIFNlcXVlbnRpYWwpKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgICBgU2VxdWVudGlhbC5mcm9tQ29uZmlnIGNhbGxlZCBvbiBub24tU2VxdWVudGlhbCBpbnB1dDogJHttb2RlbH1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjb25mIG9mIGNvbmZpZ0FycmF5KSB7XG4gICAgICBjb25zdCBjdXN0b21PYmplY3RzOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBsYXllciA9IGRlc2VyaWFsaXplKFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZiBhcyBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QsIGN1c3RvbU9iamVjdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBmYXN0V2VpZ2h0SW5pdCkgYXMgTGF5ZXI7XG4gICAgICBpZiAoZmFzdFdlaWdodEluaXQpIHtcbiAgICAgICAgbGF5ZXIuc2V0RmFzdFdlaWdodEluaXREdXJpbmdCdWlsZCh0cnVlKTtcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFkZChsYXllcik7XG4gICAgfVxuICAgIHJldHVybiBtb2RlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXR0ZXIgdXNlZCBmb3IgZm9yY2Ugc3RvcHBpbmcgb2YgTGF5ZXJzTW9kZWwuZml0KCkgKGkuZS4sIHRyYWluaW5nKS5cbiAgICpcbiAgICogRXhhbXBsZTpcbiAgICpcbiAgICogYGBganNcbiAgICogY29uc3QgbW9kZWwgPSB0Zi5zZXF1ZW50aWFsKCk7XG4gICAqIG1vZGVsLmFkZCh0Zi5sYXllcnMuZGVuc2Uoe3VuaXRzOiAxLCBpbnB1dFNoYXBlOiBbMTBdfSkpO1xuICAgKiBtb2RlbC5jb21waWxlKHtsb3NzOiAnbWVhblNxdWFyZWRFcnJvcicsIG9wdGltaXplcjogJ3NnZCd9KTtcbiAgICogY29uc3QgeHMgPSB0Zi5vbmVzKFs4LCAxMF0pO1xuICAgKiBjb25zdCB5cyA9IHRmLnplcm9zKFs4LCAxXSk7XG4gICAqXG4gICAqIGNvbnN0IGhpc3RvcnkgPSBhd2FpdCBtb2RlbC5maXQoeHMsIHlzLCB7XG4gICAqICAgZXBvY2hzOiAxMCxcbiAgICogICBjYWxsYmFja3M6IHtcbiAgICogICAgIG9uRXBvY2hFbmQ6IGFzeW5jIChlcG9jaCwgbG9ncykgPT4ge1xuICAgKiAgICAgICBpZiAoZXBvY2ggPT09IDIpIHtcbiAgICogICAgICAgICBtb2RlbC5zdG9wVHJhaW5pbmcgPSB0cnVlO1xuICAgKiAgICAgICB9XG4gICAqICAgICB9XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gVGhlcmUgc2hvdWxkIGJlIG9ubHkgMyB2YWx1ZXMgaW4gdGhlIGxvc3MgYXJyYXksIGluc3RlYWQgb2YgMTAgdmFsdWVzLFxuICAgKiAvLyBkdWUgdG8gdGhlIHN0b3BwaW5nIGFmdGVyIDMgZXBvY2hzLlxuICAgKiBjb25zb2xlLmxvZyhoaXN0b3J5Lmhpc3RvcnkubG9zcyk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3ZlcnJpZGUgc2V0IHN0b3BUcmFpbmluZyhzdG9wOiBib29sZWFuKSB7XG4gICAgLy8gVE9ETyhjYWlzKTogV2hlbiByZWZhY3RvcmluZyB0byByZW1vdmUgdGhlIGNvbXBvc2l0aW9uIHBhdHRlcm4gaGFwcGVucyxcbiAgICAvLyByZW1vdmUgdGhpcyBtZXRob2Qgb3ZlcnJpZGluZy5cbiAgICBpZiAodGhpcy5tb2RlbCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnQ2Fubm90IHNldCB0aGUgc3RvcFRyYWluaW5nIHByb3BlcnR5IG9mIGEgc2VxdWVudGlhbCBtb2RlbCBiZWZvcmUgJyArXG4gICAgICAgICAgJ2l0IGlzIGNvbXBpbGVkLicpO1xuICAgIH1cbiAgICB0aGlzLm1vZGVsLnN0b3BUcmFpbmluZyA9IHN0b3A7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgc3RvcFRyYWluaW5nKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm1vZGVsID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICdDYW5ub3QgZ2V0IHRoZSBzdG9wVHJhaW5pbmcgcHJvcGVydHkgb2YgYSBzZXF1ZW50aWFsIG1vZGVsIGJlZm9yZSAnICtcbiAgICAgICAgICAnaXQgaXMgY29tcGlsZWQuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZGVsLnN0b3BUcmFpbmluZztcbiAgfVxuXG4gIC8vIFRPRE8oY2Fpcyk6IE92ZXJyaWRlIGdldCB0cmFpbmFibGVXZWlnaHRzKCkgaGVyZVxuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IGFueSB7XG4gICAgLy8gTk9URShjYWlzKTogV2Ugb3ZlcnJpZGUgdGhlIHJldHVybiB0eXBlIG9mIGdldENvbmZpZygpIHRvIGBhbnlgIGhlcmUsXG4gICAgLy8gICBiZWNhdXNlIHRoZSBgU2VxdWVudGlhbGAgY2xhc3MgaXMgYSBzcGVjaWFsIGNhc2UgYW1vbmcgYENvbnRhaW5lcmBcbiAgICAvLyAgIHN1YnR5cGVzIGluIHRoYXQgaXRzIGdldENvbmZpZygpIG1ldGhvZCByZXR1cm5zIGFuIEFycmF5IChub3QgYVxuICAgIC8vICAgZGljdCkuXG4gICAgY29uc3QgbGF5ZXJzOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3RbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgbGF5ZXIgb2YgdGhpcy5sYXllcnMpIHtcbiAgICAgIGNvbnN0IGRpY3Q6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCA9IHt9O1xuICAgICAgZGljdFsnY2xhc3NOYW1lJ10gPSBsYXllci5nZXRDbGFzc05hbWUoKTtcbiAgICAgIGRpY3RbJ2NvbmZpZyddID0gbGF5ZXIuZ2V0Q29uZmlnKCk7XG4gICAgICBsYXllcnMucHVzaChkaWN0KTtcbiAgICB9XG4gICAgcmV0dXJuIHtuYW1lOiB0aGlzLm5hbWUsIGxheWVyc307XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhTZXF1ZW50aWFsKTtcbiJdfQ==