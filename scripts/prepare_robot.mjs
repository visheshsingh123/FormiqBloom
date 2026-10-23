/* Optional asset maintenance: deploy the checked-in GLB; no server build is needed. */
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {NodeIO, Accessor} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {metalRough, flatten, join, weld, simplify, textureCompress, dedup, prune, meshopt, compactPrimitive} from '@gltf-transform/functions';
import {MeshoptSimplifier, MeshoptEncoder} from 'meshoptimizer';
import sharp from 'sharp';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder});
const document = await io.read(resolve(root, 'Assets/humanoid_robot_ai.glb'));
await document.transform(metalRough(), flatten(), join(), weld(),
  simplify({simplifier: MeshoptSimplifier, ratio: .18, error: .004}),
  textureCompress({encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82}), dedup(), prune());
const bodyMesh = document.getRoot().listMeshes()[0];
const primitive = bodyMesh.listPrimitives()[0];
const positions = primitive.getAttribute('POSITION').getArray();
const indices = primitive.getIndices().getArray();
const headIndices = [], bodyIndices = [];
// This model is upright on Y. Separate at its mechanical neck; preserve materials.
const neckHeight = .70;
for (let offset = 0; offset < indices.length; offset += 3) {
  const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]];
  const height = triangle.reduce((sum, index) => sum + positions[index * 3 + 1], 0) / 3;
  (height > neckHeight ? headIndices : bodyIndices).push(...triangle);
}
const buffer = primitive.getIndices().getBuffer();
const accessor = (values, name) => document.createAccessor(name, buffer).setType(Accessor.Type.SCALAR).setArray(new Uint32Array(values));
const headPrimitive = primitive.clone().setIndices(accessor(headIndices, 'head-indices'));
primitive.setIndices(accessor(bodyIndices, 'body-indices'));
compactPrimitive(headPrimitive);
compactPrimitive(primitive);
const headPositions = headPrimitive.getAttribute('POSITION').getArray();
for (let index = 1; index < headPositions.length; index += 3) headPositions[index] -= neckHeight;
const headMesh = document.createMesh('HeadMesh').addPrimitive(headPrimitive);
const headGeometry = document.createNode('HeadGeometry').setMesh(headMesh);
document.getRoot().listScenes()[0].addChild(document.createNode('Head').setTranslation([0, neckHeight, 0]).addChild(headGeometry));
for (const node of document.getRoot().listNodes()) if (node.getMesh() === bodyMesh) node.setName('Body');
bodyMesh.setName('BodyMesh');
document.getRoot().getAsset().extras = {...document.getRoot().getAsset().extras,
  modifications: 'Optimized geometry and textures, converted to metallic-roughness materials, and separated the head at the mechanical neck for cursor tracking.'};
await document.transform(prune(), meshopt({encoder: MeshoptEncoder, level: 'high'}));
await io.write(resolve(root, 'Assets/hero-robot.glb'), document);
console.log('Prepared', (headIndices.length + bodyIndices.length) / 3, 'triangles with an independent Head pivot.');
