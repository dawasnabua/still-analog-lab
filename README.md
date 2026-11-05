# STILL — Analog Lab8

Browser-local photo editing with an analog feel. Open the HTTPS site in Safari and use Share → Add to Home Screen → Open as Web App. It is a web app, not an App Store binary.

## Editing

- Five original stylized film responses: Warm Tape400, Quiet Chrome100, Tungsten Night800, Sunday Instant80, Silver Grain3200. Not calibrated reproductions of named-brand stocks.
- Exposure/gain, contrast, highlights, shadows, white/black controls, temperature/tint, saturation and vibrance. This is rendered-photo/sRGB editing, not camera RAW development.
- Spatial Clarity, midtone tonal contrast and fine-edge sharpening.
- Four color wheels: shadows, midtones, highlights, global; individual hue/strength/luminance plus tonal balance.
- Golden Years, Harbor Teal and Copper Cyan: creative color recipes inspired by a private reference, not ICC/DCP camera calibrations or reconstructed exact LUTs. Reference photo pixels are not distributed.
- GPU directional Motion Blur with local subject masks, hand-painted brush/eraser refinement, feathering and strength. Masks protect only Motion Blur, not color/detail/film effects.
- Fast192 automatic subject saliency, explicit canonical320 Detail mode, background preparation after entering Motion and exact-pixel RAM caching. Results can omit subject parts and need review.
- Touch-aware sliders, double-tap look defaults, ± steps, fixed photo preview, zoom/pan, three preview sizes, hold-original comparison, local recipe saving and JPEG export up to2400px on the long edge.

## Privacy and offline

Photos and inference stay in the browser. No upload API, analytics, login or paid inference endpoint is used. Static hosting receives ordinary requests for app/model assets and may retain its normal access logs.

Only app/model files, demo and notices are cached. Original imported photos, open edits and masks are not restored on reload; export work before leaving. Saved recipes, preview size and detection-quality preference are local to the browser/origin. After the offline cache is ready, the app and both detection modes can restart without a connection.

Modern WebGL, Pointer Events, Workers and WebAssembly SIMD provide the full feature set. Phone/browser performance varies; no physical-iPhone performance guarantee is implied. CPU compatibility mode is slower. First use must download the locally run model/runtime assets.

Third-party licenses and source/provenance notices are retained under vendor/subject/, THIRD_PARTY_SUBJECT.md and FAST_MODEL_NOTICE.md. This repository intentionally excludes development tests, private reference images, analysis crops and QA logs. No application-source license is selected by this release process.
