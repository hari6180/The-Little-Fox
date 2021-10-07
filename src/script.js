import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KeyDisplay } from "./utils";
import { CharacterControls } from "./characterControls";

/**
 * Loaders
 */
const loadingBarElement = document.querySelector(".loading-bar");
let sceneReady = false;
const loadingManager = new THREE.LoadingManager(
  // Loaded
  () => {
    // Wait a little
    window.setTimeout(() => {
      // Animate overlay
      gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 });

      // Update loadingBarElement
      loadingBarElement.classList.add("ended");
      loadingBarElement.style.transform = "";
    }, 500);
    window.setTimeout(() => {
      sceneReady = true;
    }, 2000);
  },

  // Progress
  (itemUrl, itemsLoaded, itemsTotal) => {
    // Calculate the progress and update the loadingBarElement
    const progressRatio = itemsLoaded / itemsTotal;
    loadingBarElement.style.transform = `scaleX(${progressRatio})`;
  }
);

/**
 * Base
 */
// Debug
const gui = new dat.GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Sphere
 */
// const sphere = new THREE.Mesh(
//   new THREE.SphereGeometry(2, 32, 16),
//   new THREE.MeshBasicMaterial({ color: 0x6699ff })
// );
// sphere.position.y = -2;
// sphere.receiveShadow = true;
// sphere.castShadow = true;
// scene.add(sphere);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xff5577, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(2, 2, 6);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.75, 0);
controls.enableDamping = true;

// Control Keys
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener(
  "keydown",
  (event) => {
    keyDisplayQueue.down(event.key);
    if (event.shiftKey && characterControls) {
      characterControls.switchRunToggle();
    } else {
      keysPressed[event.key.toLowerCase()] = true;
    }
  },
  false
);
document.addEventListener(
  "keyup",
  (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
  },
  false
);

// create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// create a global audio source
const sound = new THREE.Audio(listener);

// load a sound and set it as the Audio object's buffer
const audioLoader = new THREE.AudioLoader();
audioLoader.load("music/bensound-smile.mp3", function (buffer) {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.3);
  sound.play();
});

/**
 * Model with animations
 */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let mixer = null;
let characterControls;
gltfLoader.load("/models/Fox/glTF/Fox.gltf", (gltf) => {
  const model = gltf.scene;

  model.traverse(function (object) {
    if (object.isMesh) object.castShadow = true;
  });

  model.scale.set(0.025, 0.025, 0.025);
  scene.add(model);

  const gltfAnimations = gltf.animations;
  mixer = new THREE.AnimationMixer(model);
  const animationMap = new Map();
  gltfAnimations
    .filter((a) => a.name != "Survey")
    .forEach((a) => {
      animationMap.set(a.name, mixer.clipAction(a));
    });
  characterControls = new CharacterControls(model, mixer, animationMap, controls, camera, "Survey");
  const action = mixer.clipAction(gltf.animations[1]);
  action.play();
});

/**
 * Particles
 */
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load("/textures/particles/9.png");

// Geometry
const particlesGeometry = new THREE.BufferGeometry();
const count = 20000;

const positions = new Float32Array(count * 3); // Multiply by 3 because each position is composed of 3 value (x, y, z)
const colors = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 10; // between -0.5 and +0.5
  colors[i] = Math.random();
}

particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

// Material
const particleMaterial = new THREE.PointsMaterial({
  size: 0.1,
  sizeAttenuation: true,
  map: particleTexture,
  transparent: true,
  alphaMap: particleTexture,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
});

// Points
const particles = new THREE.Points(particlesGeometry, particleMaterial);
scene.add(particles);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 0);

/**
 * Animate
 */
const clock = new THREE.Clock();
function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();
