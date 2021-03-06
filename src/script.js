import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KeyDisplay } from "./utils";
import { CharacterControls } from "./characterControls";

/**
 * Loaders
 */
let sceneReady = false;

const loadingManager = new THREE.LoadingManager(() => {
  const loadingScreen = document.getElementById("loading-screen");
  loadingScreen.classList.add("fade-out");
  window.setTimeout(() => {
    sceneReady = true;
  }, 2000);
});
const textureLoader = new THREE.TextureLoader(loadingManager);

/**
 * Base
 */

// Scene
const scene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
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
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(2, 2, 6);
camera.lookAt(scene.position);
scene.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = 0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 0);
document.body.appendChild(renderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableZoom = true;
orbitControls.zoomSpeed = 2;

/**
 * Audio
 */

// create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// create a global audio source
const sound = new THREE.Audio(listener);

// load a sound and set it as the Audio object's buffer
const audioLoader = new THREE.AudioLoader(loadingManager);
audioLoader.load("music/bensound-smile.mp3", function (buffer) {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.3);
  sound.play();
});

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

const object = new THREE.Object3D();

/**
 * Particles
 */
const particleTexture = textureLoader.load("/textures/particles/9.png");

// Geometry
const particlesGeometry = new THREE.BufferGeometry();
const count = 2000000;

const positions = new Float32Array(count * 3); // Multiply by 3 because each position is composed of 3 value (x, y, z)
const colors = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 200; // between -0.5 and +0.5
  colors[i] = Math.random();
}

particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

// Material
const particleMaterial = new THREE.PointsMaterial({
  size: 0.5,
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
object.add(particles);
orbitControls.update();

/**
 * Model with animations
 */
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

let mixer = null;
let characterControls;

gltfLoader.load("/models/Fox/glTF/Fox.gltf", (gltf) => {
  const model = gltf.scene;

  model.traverse(function (object) {
    if (object.isMesh) object.castShadow = true;
  });

  model.scale.set(0.02, 0.02, 0.02);
  model.position.set(0, 0, 0);
  object.add(model);

  const gltfAnimations = gltf.animations;
  mixer = new THREE.AnimationMixer(model);
  const animationMap = new Map();
  gltfAnimations
    .filter((a) => a.name != "Survey")
    .forEach((a) => {
      animationMap.set(a.name, mixer.clipAction(a));
    });
  characterControls = new CharacterControls(
    model,
    mixer,
    animationMap,
    orbitControls,
    camera,
    "Survey"
  );
  const action = mixer.clipAction(gltf.animations[1]);
  action.play();

  const reset = document.querySelector("#reset");
  reset.addEventListener("click", () => {
    model.position.set(0, 0, 0);
    camera.position.set(2, 2, 6);
    orbitControls.target.set(0, 0.75, 0);
    orbitControls.update();
  });
});

// Planets
gltfLoader.load("/models/little_prince/scene.gltf", (gltf) => {
  const model = gltf.scene;

  model.traverse(function (object) {
    if (object.isMesh) object.castShadow = true;
  });

  model.position.set(30, 1, -10);
  model.rotateY(30);

  object.add(model);
  orbitControls.update();
});

const objectX = 0;
const objectY = 0;
const objectZ = 0;
object.position.set(objectX, objectY, objectZ);
scene.add(object);

/**
 * Resize
 */

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

let raycaster = new THREE.Raycaster();

function Point3DToScreen2D(point3D, camera) {
  let p = point3D.clone();
  camera.updateMatrix();
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.getInverse(camera.matrixWorld);

  let frustum = new THREE.Frustum();
  frustum.setFromMatrix(
    new THREE.Matrix4().multiply(camera.projectionMatrix, camera.matrixWorldInverse)
  );

  if (frustum.containsPoint(p)) {
    let vector = p.project(camera);
    vector.x = ((vector.x + 1) / 2) * window.innerWidth;
    vector.y = (-(vector.y - 1) / 2) * window.innerHeight;

    return vector;
  } else {
    return false;
  }
}

/**
 * Animate
 */
const clock = new THREE.Clock();

function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
  requestAnimationFrame(animate);
  orbitControls.update();

  // var tmpV = Point3DToScreen2D(object.position, camera);
  // if (tmpV) {
  //   document.querySelector(".objects").setAttribute(
  //     "style",
  //     //   "display:block;transform:translate(" +
  //     //     tmpV.x +
  //     //     "px," +
  //     //     tmpV.y +
  //     //     "px) translateZ(0px) translate(-32px, -32px) rotate(0deg) translate(0px, 0px) scale(1, 1) translate(0px, 0px); transform-origin: 50% 50% 0;"
  //     //
  //     `display:block; left:${tmpV.x}px; top:${tmpV.y}px;`
  //   );
  // } else {
  //   document.querySelector(".objects").style.display = "none";
  // }

  renderer.render(scene, camera);
}

animate();
