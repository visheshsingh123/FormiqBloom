'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const root = join(__dirname, '..');
function readGLB(name) {
  const bytes = readFileSync(join(root, 'Assets', name));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  return {bytes, model: JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())};
}
function triangleCount(model) {
  return model.meshes.flatMap(mesh => mesh.primitives).reduce((sum, primitive) => sum + model.accessors[primitive.indices].count / 3, 0);
}
test('optimized GLB is self-contained and substantially smaller with a named head pivot', () => {
  const source = readGLB('humanoid_robot_ai.glb');
  const optimized = readGLB('hero-robot.glb');
  assert(optimized.bytes.length < 1024 * 1024);
  assert(optimized.bytes.length < source.bytes.length * .15);
  assert(triangleCount(optimized.model) < 35000);
  assert(triangleCount(optimized.model) < triangleCount(source.model) * .2);
  const head = optimized.model.nodes.find(node => node.name === 'Head');
  const body = optimized.model.nodes.find(node => node.name === 'Body');
  assert(head && body);
  assert.equal(head.mesh, undefined);
  assert.notEqual(optimized.model.nodes[head.children[0]].mesh, body.mesh);
  assert.deepEqual(head.translation, [0, .7, 0]);
  assert(optimized.model.buffers.every(buffer => !buffer.uri));
  assert(optimized.model.images.every(image => image.bufferView !== undefined && !image.uri));
  assert(!optimized.model.extensionsUsed.includes('KHR_materials_pbrSpecularGlossiness'));
});
test('model attribution and self-hosted runtime licenses remain available', () => {
  const {model} = readGLB('hero-robot.glb');
  assert.match(model.asset.extras.author, /3dUVpro/);
  assert.match(model.asset.extras.license, /CC-BY-4.0/);
  const attribution = readFileSync(join(root, 'Assets/robot-model-attribution.txt'), 'utf8');
  assert.match(attribution, /3dUVpro/);
  assert.match(attribution, /creativecommons.org\/licenses\/by\/4.0/);
  assert.match(attribution, /Separated the head/);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /class="robot-credits"/);
  assert.match(html, /href="https:\/\/sketchfab.com\/3dUVpro"/);
  assert.match(readFileSync(join(root, 'vendor/three-LICENSE.txt'), 'utf8'), /MIT License/);
  assert.match(readFileSync(join(root, 'vendor/meshoptimizer-LICENSE.md'), 'utf8'), /MIT License/);
});
