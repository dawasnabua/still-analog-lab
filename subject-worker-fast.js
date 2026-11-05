'use strict';
/* Local U2Net-p, unchanged learned weights. See FAST_MODEL_NOTICE.md.
 * Contract is identical to subject-worker.js; only internal spatial work shrinks.
 * Public fast mode is192; Detail uses the separate canonical320 worker. */
const SUBJECT_SIZE = 320;
const SUBJECT_PIXELS = SUBJECT_SIZE * SUBJECT_SIZE;
const FAST_SIZE = 192;
const FAST_PIXELS = FAST_SIZE * FAST_SIZE;
const MODEL_HASHES = {
  192: 'fd4d94ac0c91a8f2425af5f7bd9600e8befc5b2590d5487eecd1b72736779727'
};
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
      const response = await fetch(new URL(`models/u2netp-fast${FAST_SIZE}.onnx`, subjectRoot), {
        credentials: 'same-origin', redirect: 'error'
      });
      if (!response.ok) throw new Error(`Model fetch failed: HTTP ${response.status}`);
      return ort.InferenceSession.create(await response.arrayBuffer(), {
        executionProviders: ['wasm'], graphOptimizationLevel: 'all'
      });
    })().catch(error => { subjectSessionPromise = undefined; throw error; });
  }
  return subjectSessionPromise;
}
// Exact pixel-area averaging prevents extra aliasing during 320 -> 192/160.
// No OffscreenCanvas/secure-context dependency; RGBA alpha is intentionally ignored.
function downsampleRGB(pixels, stride) {
  const rgb = new Float32Array(FAST_PIXELS * 3);
  const scale = SUBJECT_SIZE / FAST_SIZE;
  const area = scale * scale;
  for (let y = 0; y < FAST_SIZE; y++) {
    const top = y * scale, bottom = (y + 1) * scale;
    for (let x = 0; x < FAST_SIZE; x++) {
      const left = x * scale, right = (x + 1) * scale;
      const target = (y * FAST_SIZE + x) * 3;
      for (let sy = Math.floor(top); sy < Math.ceil(bottom) && sy < SUBJECT_SIZE; sy++) {
        const wy = Math.max(0, Math.min(sy + 1, bottom) - Math.max(sy, top));
        for (let sx = Math.floor(left); sx < Math.ceil(right) && sx < SUBJECT_SIZE; sx++) {
          const weight = wy * Math.max(0, Math.min(sx + 1, right) - Math.max(sx, left)) / area;
          const source = (sy * SUBJECT_SIZE + sx) * stride;
          rgb[target] += pixels[source] * weight;
          rgb[target + 1] += pixels[source + 1] * weight;
          rgb[target + 2] += pixels[source + 2] * weight;
        }
      }
    }
  }
  return rgb;
}
// Bilinear half-pixel interpolation of raw float saliency, before uint8 conversion.
function rescalePrediction(raw) {
  const scaled = new Float32Array(SUBJECT_PIXELS);
  const scale = FAST_SIZE / SUBJECT_SIZE;
  for (let y = 0; y < SUBJECT_SIZE; y++) {
    const fy = Math.max(0, Math.min(FAST_SIZE - 1, (y + 0.5) * scale - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(FAST_SIZE - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < SUBJECT_SIZE; x++) {
      const fx = Math.max(0, Math.min(FAST_SIZE - 1, (x + 0.5) * scale - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(FAST_SIZE - 1, x0 + 1), wx = fx - x0;
      const a = raw[y0 * FAST_SIZE + x0] * (1 - wx) + raw[y0 * FAST_SIZE + x1] * wx;
      const b = raw[y1 * FAST_SIZE + x0] * (1 - wx) + raw[y1 * FAST_SIZE + x1] * wx;
      scaled[y * SUBJECT_SIZE + x] = a * (1 - wy) + b * wy;
    }
  }
  return scaled;
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
    const rgb = downsampleRGB(pixels, pixels.length / SUBJECT_PIXELS);
    let pixelMax = 0;
    for (const value of rgb) pixelMax = Math.max(pixelMax, value);
    const divisor = Math.max(pixelMax, 1e-6);
    const input = new Float32Array(FAST_PIXELS * 3);
    for (let i = 0, j = 0; i < FAST_PIXELS; i++, j += 3) {
      input[i] = (rgb[j] / divisor - 0.485) / 0.229;
      input[FAST_PIXELS + i] = (rgb[j + 1] / divisor - 0.456) / 0.224;
      input[2 * FAST_PIXELS + i] = (rgb[j + 2] / divisor - 0.406) / 0.225;
    }
    const session = await getSubjectSession();
    const tensor = new ort.Tensor('float32', input, [1, 3, FAST_SIZE, FAST_SIZE]);
    let outputs;
    try {
      const inferenceStart = performance.now();
      outputs = await session.run({[session.inputNames[0]]: tensor}, [session.outputNames[0]]);
      const inferenceMs = performance.now() - inferenceStart;
      const output = outputs[session.outputNames[0]];
      if (!output || output.type !== 'float32' || output.data.length !== FAST_PIXELS ||
          output.dims.join(',') !== `1,1,${FAST_SIZE},${FAST_SIZE}`) {
        throw new Error('Unexpected saliency output shape/type');
      }
      let rawMin = Infinity, rawMax = -Infinity;
      for (const value of output.data) {
        if (!Number.isFinite(value)) throw new Error('Model returned non-finite saliency');
        rawMin = Math.min(rawMin, value); rawMax = Math.max(rawMax, value);
      }
      if (!(rawMax - rawMin > 1e-12)) throw new Error('Model returned a degenerate constant saliency map');
      const scaled = rescalePrediction(output.data);
      let min = Infinity, max = -Infinity;
      for (const value of scaled) { min = Math.min(min, value); max = Math.max(max, value); }
      const range = max - min;
      if (!(range > 1e-12)) throw new Error('Rescaled saliency map is degenerate');
      const alpha = new Uint8Array(SUBJECT_PIXELS);
      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = Math.floor(Math.max(0, Math.min(1, (scaled[i] - min) / range)) * 255);
      }
      self.postMessage({id, alpha: alpha.buffer, width: SUBJECT_SIZE, height: SUBJECT_SIZE,
        inferenceMs, totalMs: performance.now() - started, model: `u2netp-fast${FAST_SIZE}`,
        modelSha256: MODEL_HASHES[FAST_SIZE], sourceModelSha256: '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8',
        modelInputWidth: FAST_SIZE, modelInputHeight: FAST_SIZE,
        runtime: 'onnxruntime-web@1.18.0', executionProvider: 'wasm', numThreads: 1,
        alphaType: 'uint8', rawMin, rawMax, rescaledMin: min, rescaledMax: max,
        inputPixelMax: pixelMax, meaning: 'salient-subject-opacity', localOnly: true}, [alpha.buffer]);
    } finally {
      tensor.dispose();
      if (outputs) for (const output of Object.values(outputs)) output.dispose();
    }
  } catch (error) {
    self.postMessage({id, error: error instanceof Error ? error.message : String(error)});
  }
}
self.onmessage = event => {
  subjectQueue = subjectQueue.then(() => segmentSubject(event.data));
};
