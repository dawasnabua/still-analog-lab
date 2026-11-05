# Third-party components and model attribution

STILL performs subject segmentation locally in the browser with U2Net-p and ONNX Runtime Web. No image-upload or external inference endpoint is used.

## U2Net-p

Original work: Xuebin Qin and coauthors, U²-Net: Going Deeper with Nested U-Structure for Salient Object Detection, Pattern Recognition (2020).

- Original repository: https://github.com/xuebinqin/U-2-Net
- Original license: Apache-2.0; copy included at vendor/subject/U2NET-LICENSE.
- ONNX asset distributed by rembg: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
- Asset size: 4,574,861 bytes.
- SHA256: 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8
- rembg code license: MIT; included at vendor/subject/rembg-LICENSE.txt. Its license does not relicense the model weights.
- Pinned preprocessing/source snapshots are included under vendor/subject/.

## ONNX Runtime Web

- Microsoft ONNX Runtime Web, pinned version 1.18.0.
- Official repository: https://github.com/microsoft/onnxruntime
- MIT license and third-party notices: vendor/subject/ONNXRUNTIME-LICENSE and vendor/subject/ONNXRUNTIME-ThirdPartyNotices.txt.
- Matching local JS/non-threaded SIMD WASM files are vendored. npm package integrity/provenance is recorded in vendor/subject/package-provenance.json.

## Demo photo

The bundled microphone photo was obtained from Unsplash:
https://images.unsplash.com/photo-1516280440614-37939bbacd81
Unsplash license: https://unsplash.com/license

## Model limitations

This small model detects salient foreground, not a guaranteed semantic subject or perfect hair/alpha matting. Review and refine the mask. The application rejects nearly uniform inputs rather than presenting a geometric fallback as a detected subject. Browser SIMD/worker support is required for automatic segmentation. User-created mask edits and photos remain session-local unless exported.


## Modified fast model

The192-pixel variant retains the original learned weights and license. See FAST_MODEL_NOTICE.md for the modification notice, exact derived hash and quality limits. Canonical320 remains available as Detail mode.
