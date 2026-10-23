# Local robot renderer

`robot-renderer.js` bundles Three.js 0.180.0, its GLTFLoader and RoomEnvironment, and
its Meshopt decoder. It is loaded on demand by `hero-robot.js`; no runtime CDN or
Vercel build is required. Editable source: `src/robot-model.js`.

Three.js and Meshoptimizer use the MIT license. Their license notices are included
in this directory. The model has a separate CC BY 4.0 attribution at
`Assets/robot-model-attribution.txt` and a visible credits link in the footer.

Optional asset maintenance, from the repository root:

```sh
npm install --no-save --package-lock=false three@0.180.0 esbuild@0.25.11 @gltf-transform/core@4.2.1 @gltf-transform/extensions@4.2.1 @gltf-transform/functions@4.2.1 meshoptimizer@0.25.0 sharp@0.34.4
node scripts/prepare_robot.mjs
node scripts/build_robot_renderer.mjs
```

Commit the resulting `Assets/hero-robot.glb` and `vendor/robot-renderer.js` together.
The original upload remains untouched. The model preparation script is specific
to this model's upright axis and mechanical neck, rather than a general rigging tool.
