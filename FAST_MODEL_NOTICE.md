# Local subject-model modification notice

STILL includes the canonical U2Net-p 320×320 model and a derived 192×192 fast variant. Both run locally through the bundled ONNX Runtime Web. No image-upload or inference service is used.

## Original

- Work: U²-Net: Going Deeper with Nested U-Structure for Salient Object Detection, Xuebin Qin and coauthors (2020).
- Upstream: https://github.com/xuebinqin/U-2-Net
- License: Apache-2.0, retained in `vendor/subject/U2NET-LICENSE`.
- ONNX distribution: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
- Canonical asset: `models/u2netp.onnx`
- Canonical SHA256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`

## Modified fast variant

- Asset: `models/u2netp-fast192.onnx`
- SHA256: `fd4d94ac0c91a8f2425af5f7bd9600e8befc5b2590d5487eecd1b72736779727`
- Modified input/output spatial metadata from 320 to 192, retaining all 1,055 graph nodes and all 238 learned initializers unchanged. A modification/provenance notice is embedded in the ONNX doc string. Internal Resize paths use tensor shapes; this is genuine smaller-graph inference, not a resized output substituted for inference.
- The application area-downsamples the input, performs the real model run, then bilinearly interpolates float saliency to the application's 320×320 mask grid.
- It is a faster saliency approximation, not perfect object recognition or hair matting. Input resolution can change which subject parts are selected. Review the overlay, use Detail mode if needed, and refine with the brush/eraser. The 320 prediction is not ground truth either.

The rembg conversion code is MIT; it does not relicense the original learned weights. Pinned rembg source snapshots, ONNX Runtime Web MIT license, third-party notices, and package provenance remain in `vendor/subject/` and `THIRD_PARTY_SUBJECT.md`.
