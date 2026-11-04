# STILL — Analog Lab

A browser-local photo editor with film looks, GPU directional Motion Blur, hand-painted protection masks and local automatic subject protection.

Open the published HTTPS site in Safari and use Share → Add to Home Screen → Open as Web App. No App Store purchase or account is needed for editing. After the offline cache is ready, the editor and the model can be opened without a server connection.

## Privacy

Imported photos and subject segmentation are processed on the device. There is no photo-upload API, app analytics, login or paid inference service. The static hosting provider receives ordinary requests for app/model files. This does not prevent the hosting provider from keeping its normal access logs.

Only app assets, the bundled demo, the model and legal notices are cached. Imported photos, unsaved edits and masks are not restored after closing/reloading; export work before leaving. Presets and view size are stored locally per browser/origin.

## Notes

Modern WebGL, Pointer Events, Web Workers and WebAssembly SIMD are required for the full feature set. Automatic subject detection can be imperfect and may take a few seconds. Model/runtime files are approximately 15 MB. The app is a web app, not a native App Store binary.

Third-party licenses and attributions are included in THIRD_PARTY_SUBJECT.md and vendor/subject/. This repository publishes only the static release, not development fixtures, private photos or local QA logs.
