'use strict';
/* Classic dedicated worker. No image data leaves this worker/browser. */
const SUBJECT_SIZE = 320;
const SUBJECT_PIXELS = SUBJECT_SIZE * SUBJECT_SIZE;
const SUBJECT_MODEL_SHA256 = '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
const subjectRoot = new URL('.', self.location.href);
const runtimeRoot = new URL('vendor/subject/', subjectRoot);
let subjectSessionPromise;
let subjectQueue = Promise.resolve();

function getSubjectSession() {
  if (!subjectSessionPromise) {
    subjectSessionPromise = (async () => {
      importScripts(new URL('ort.wasm.min.js', runtimeRoot).href);
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.simd = true;
      ort.env.wasm.wasmPaths = runtimeRoot.href;
      const response = await fetch(new URL('models/u2netp.onnx', subjectRoot), {
        credentials: 'same-origin', redirect: 'error'
      });
      if (!response.ok) throw new Error(`Model fetch failed: HTTP ${response.status}`);
      return ort.InferenceSession.create(await response.arrayBuffer(), {
        executionProviders: ['wasm'], graphOptimizationLevel: 'all'
      });
    })().catch(error => {
      // Permit a retry after e.g. a temporary missing local asset, not a fallback mask.
      subjectSessionPromise = undefined;
      throw error;
    });
  }
  return subjectSessionPromise;
}

async function segmentSubject(message) {
  const {id, rgba, width, height} = message || {};
  const started = performance.now();
  try {
    if (width !== SUBJECT_SIZE || height !== SUBJECT_SIZE) {
      throw new Error('Expected width:320 and height:320; resize on the main thread first');
    }
    if (!(rgba instanceof ArrayBuffer) ||
        (rgba.byteLength !== SUBJECT_PIXELS * 4 && rgba.byteLength !== SUBJECT_PIXELS * 3)) {
      throw new Error('rgba must be an ArrayBuffer with exactly 320*320*4 RGBA or 320*320*3 RGB bytes');
    }
    const pixels = new Uint8Array(rgba);
    const stride = pixels.length / SUBJECT_PIXELS;
    let pixelMax = 0;
    for (let i = 0; i < pixels.length; i += stride) {
      pixelMax = Math.max(pixelMax, pixels[i], pixels[i + 1], pixels[i + 2]);
    }
    // rembg BaseSession.normalize: image / max(max(image), 1e-6), then
    // ImageNet means/std, transpose HWC -> NCHW, cast float32. Ignore alpha.
    const divisor = Math.max(pixelMax, 1e-6);
    const input = new Float32Array(SUBJECT_PIXELS * 3);
    for (let i = 0, j = 0; i < SUBJECT_PIXELS; i++, j += stride) {
      input[i] = (pixels[j] / divisor - 0.485) / 0.229;
      input[SUBJECT_PIXELS + i] = (pixels[j + 1] / divisor - 0.456) / 0.224;
      input[2 * SUBJECT_PIXELS + i] = (pixels[j + 2] / divisor - 0.406) / 0.225;
    }
    const session = await getSubjectSession();
    const tensor = new ort.Tensor('float32', input, [1, 3, SUBJECT_SIZE, SUBJECT_SIZE]);
    let outputs;
    try {
      const inferenceStart = performance.now();
      outputs = await session.run({[session.inputNames[0]]: tensor}, [session.outputNames[0]]);
      const inferenceMs = performance.now() - inferenceStart;
      const output = outputs[session.outputNames[0]];
      if (!output || output.type !== 'float32' || output.data.length !== SUBJECT_PIXELS ||
          output.dims.join(',') !== '1,1,320,320') {
        throw new Error('Unexpected saliency output shape/type');
      }
      let min = Infinity, max = -Infinity;
      for (const value of output.data) {
        if (!Number.isFinite(value)) throw new Error('Model returned non-finite saliency');
        min = Math.min(min, value); max = Math.max(max, value);
      }
      // Copy before disposing ORT tensors. uint8 truncation matches rembg.
      const alpha = new Uint8Array(SUBJECT_PIXELS);
      const range = max - min;
      if (!(range > 1e-12)) throw new Error('Model returned a degenerate constant saliency map');
      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = Math.floor(Math.max(0, Math.min(1, (output.data[i] - min) / range)) * 255);
      }
      self.postMessage({id, alpha: alpha.buffer, width: SUBJECT_SIZE, height: SUBJECT_SIZE,
        inferenceMs, totalMs: performance.now() - started, model: 'u2netp',
        modelSha256: SUBJECT_MODEL_SHA256, runtime: 'onnxruntime-web@1.18.0',
        executionProvider: 'wasm', numThreads: 1, alphaType: 'uint8',
        rawMin: min, rawMax: max, inputPixelMax: pixelMax,
        meaning: 'salient-subject-opacity', localOnly: true}, [alpha.buffer]);
    } finally {
      tensor.dispose();
      if (outputs) for (const output of Object.values(outputs)) output.dispose();
    }
  } catch (error) {
    self.postMessage({id, error: error instanceof Error ? error.message : String(error)});
  }
}

self.onmessage = event => {
  // A single session runs sequentially even if the caller posts multiple jobs.
  subjectQueue = subjectQueue.then(() => segmentSubject(event.data));
};
