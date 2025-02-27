import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import Stats from '/node_modules/three/examples/jsm/libs/stats.module.js';

import { RenderPass } from "/node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { EffectComposer } from "/node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { GammaCorrectionShader } from "/node_modules/three/examples/jsm/shaders/GammaCorrectionShader.js";
import { ShaderPass } from "/node_modules/three/examples/jsm/postprocessing/ShaderPass.js";
import { RGBShiftShader } from "/node_modules/three/examples/jsm/shaders/RGBShiftShader.js";

const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

const fog = new THREE.Fog('#000000', 1, 2.5);
scene.fog = fog;

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Camera
const camera = new THREE.PerspectiveCamera(
  // field of view
  75,
  // aspect ratio
  sizes.width / sizes.height,
  // near planeFront: it's low since we want our mesh to be visible even from very close
  0.01,
  // far planeFront: how far we're rendering
  20
);

camera.position.set(0, 0.06, 1.1);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ---- Resize

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera's aspect ratio and projection matrix
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  // Note: We set the pixel ratio of the renderer to at most 2
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Stats info
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Light
/**
 * We define an ambient light: a light that globally illuminates 
 * all objects in the scene equally
 * 
 * Here we set the color to white and the intensity to 10
 * You can tweak this value to see how bright/dim the scene
 * gets depending on the values passed
 */
const ambientLight = new THREE.AmbientLight("#ffffff", 10);
scene.add(ambientLight);

// Right Spotlight aiming to the left
const spotlight = new THREE.SpotLight('#d53c3d', 20, 25, Math.PI * 0.1, 0.25);
spotlight.position.set(0.5, 0.75, 2.2);
// Target the spotlight to a specific point to the left of the scene
spotlight.target.position.x = -0.25;
spotlight.target.position.y = 0.25;
spotlight.target.position.z = 0.25;
scene.add(spotlight);
scene.add(spotlight.target);

// Left Spotlight aiming to the right
const spotlight2 = new THREE.SpotLight('#d53c3d', 20, 25, Math.PI * 0.1, 0.25);
spotlight2.position.set(-0.5, 0.75, 2.2);
// Target the spotlight to a specific point to the right side of the scene
spotlight2.target.position.x = 0.25;
spotlight2.target.position.y = 0.25;
spotlight2.target.position.z = 0.25;
scene.add(spotlight2);
scene.add(spotlight2.target);

// ---- Build planeFront

// Textures
const textureLoader = new THREE.TextureLoader();
const gridTexture = textureLoader.load('./assets/grid.png');
const terrainTexture = textureLoader.load('./assets/displacement.png');

const geometry = new THREE.PlaneGeometry(1, 2, 24, 24);
const material = new THREE.MeshStandardMaterial({
  map: gridTexture,
  displacementMap: terrainTexture,
  displacementScale: 0.4,
});

const planeFront = new THREE.Mesh(geometry, material);

planeFront.rotation.x = -Math.PI * 0.5;
planeFront.position.z = 0.15;

scene.add(planeFront);

const planeBack = planeFront.clone();

scene.add(planeBack);

// ----- Post Processing

// Add the effectComposer
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(sizes.width, sizes.height);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0015;

effectComposer.addPass(rgbShiftPass);

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
effectComposer.addPass(gammaCorrectionPass);



const clock = new THREE.Clock();

// ----- Animate: we call this tick function on every frame
const tick = () => {

  const elapsedTime = clock.getElapsedTime();

  stats.begin();

  // Update controls
  controls.update();

  planeFront.position.z = (elapsedTime * 0.15) % 2;
  planeBack.position.z = ((elapsedTime * 0.15) % 2) - 2;

  // Update the rendered scene
  //renderer.render(scene, camera);
  effectComposer.render();

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);

  stats.end();
};

// Calling tick will initiate the rendering of the scene
tick();