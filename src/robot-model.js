/* Bundled locally into vendor/robot-renderer.js; no runtime CDN or build step. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

function disposeModel(model) {
  const textures = new Set(), materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    for (const material of [].concat(object.material)) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  textures.forEach(texture => texture.dispose());
}

export async function mountRobot(stage, onFailure) {
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .85;
  renderer.domElement.className = 'robot-model-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.pointerEvents = 'none';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 50);
  const hemisphere = new THREE.HemisphereLight(0xece6ff, 0x16121e, 1.1);
  const key = new THREE.DirectionalLight(0xf5f3ff, 2.1);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0xb19aff, 2);
  rim.position.set(-3, 2, -2);
  scene.add(hemisphere, key, rim);
  let disposed = false, active = true, frame = 0, model, head, environment, observer;
  let targetQuaternion = new THREE.Quaternion();
  let previousTime = 0;
  const clock = window;
  function stop() {
    if (frame) clock.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    stop();
    observer?.disconnect();
    if (model) disposeModel(model);
    environment?.dispose();
    scene.clear();
    renderer.dispose();
    renderer.domElement.remove();
    stage.classList.remove('has-robot-model');
  }
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (!disposed) { destroy(); onFailure(); }
  });
  let timeout;
  try {
    const load = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/Assets/hero-robot.glb').then(gltf => {
      if (disposed) { disposeModel(gltf.scene); throw new Error('Model load cancelled.'); }
      return gltf.scene;
    });
    model = await Promise.race([load, new Promise((_, reject) => {
      timeout = clock.setTimeout(() => reject(new Error('Model load timed out.')), 20000);
    })]);
    clock.clearTimeout(timeout);
    head = model.getObjectByName('Head');
    if (!head) throw new Error('The prepared head pivot is missing.');
    model.traverse(object => {
      if (!object.isMesh) return;
      for (const material of [].concat(object.material)) {
        if ('emissiveIntensity' in material) material.emissiveIntensity = .15;
        if ('roughness' in material) material.roughness = Math.max(material.roughness, .25);
      }
    });
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    scene.environmentIntensity = .65;
    room.dispose();
    pmrem.dispose();
    scene.add(model);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // Portrait framing: keep the head and chest visible, cropping above the waist.
    const visibleHeight = size.y * .40;
    const targetY = bounds.max.y - visibleHeight * .5;
    function render(time = 0) {
      frame = 0;
      if (disposed || !active) return;
      const delta = previousTime ? Math.min((time - previousTime) / 1000, .05) : 1 / 60;
      previousTime = time;
      head.quaternion.slerp(targetQuaternion, 1 - Math.exp(-12 * delta));
      renderer.render(scene, camera);
      if (head.quaternion.angleTo(targetQuaternion) > .0005) frame = clock.requestAnimationFrame(render);
      else previousTime = 0;
    }
    function requestRender() {
      if (!disposed && active && !frame) frame = clock.requestAnimationFrame(render);
    }
    function resize() {
      if (disposed || !stage.clientWidth || !stage.clientHeight) return;
      camera.aspect = stage.clientWidth / stage.clientHeight;
      const fov = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = Math.max(visibleHeight / (2 * Math.tan(fov)), size.x / (2 * Math.tan(fov) * camera.aspect)) * 1.08;
      camera.position.set(center.x, targetY + .025, center.z + distance);
      camera.lookAt(center.x, targetY, center.z);
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      requestRender();
    }
    stage.append(renderer.domElement);
    observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    // Keep the CSS fallback until a complete model frame has rendered.
    renderer.render(scene, camera);
    stage.classList.add('has-robot-model');
    return {
      setLook(yaw, pitch, immediate = false) {
        if (disposed) return;
        targetQuaternion.setFromEuler(new THREE.Euler(-THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw), 0, 'YXZ'));
        if (immediate) head.quaternion.copy(targetQuaternion);
        requestRender();
      },
      setActive(value) {
        active = value;
        if (active) requestRender(); else stop();
      },
      destroy
    };
  } catch (error) {
    clock.clearTimeout(timeout);
    destroy();
    throw error;
  }
}
