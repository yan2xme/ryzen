import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let tonearmPivot, tonearmOffsetGroup, tonearmGroup;
let notes = [];

let isPlaying = false;
let progress = 0;
let duration = 1;
let tonearmLoaded = false;
const frustumSize = 2.2;

// EXACT values from your final successful calibration!
const config = {
  scale: 0.40,
  pivotX: -0.80,         // The screen position of the base (Red Dot)
  pivotY: 0.65,          // The screen position of the base (Red Dot)
  offsetX: -1.16,        // Shifts the 3D model to align perfectly with the pivot
  offsetY: 1.49,         // Shifts the 3D model to align perfectly with the pivot
  modelRotX: 1.66,
  modelRotY: -2.94,
  modelRotZ: 0.01,
  restAngle: 3.01,       // Stop state angle
  playAngleStart: 2.16,  // Play state starting angle
  playAngleEnd: 1.90     // Slowly tracks slightly inward as the song plays
};

export function initThreeTurntable(container) {
  const rect = container.getBoundingClientRect();
  const width = rect.width || 500;
  const height = rect.height || 500;
  const aspect = width / height;

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  );
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none';
  renderer.domElement.style.zIndex = '10';

  container.appendChild(renderer.domElement);

  // Strong lighting to make the metallic material look good
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
  frontLight.position.set(0, 0, 5);
  scene.add(frontLight);

  const loader = new GLTFLoader();

  loader.load('/models/tonearm.glb', (gltf) => {
    tonearmGroup = gltf.scene;

    tonearmGroup.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
        child.material = new THREE.MeshStandardMaterial({
          color: 0xd4d4d4,
          metalness: 0.7,
          roughness: 0.25,
        });
      }
    });

    // 1. The Main Pivot (This stays permanently locked in place)
    tonearmPivot = new THREE.Group();
    tonearmPivot.position.set(config.pivotX, config.pivotY, 0.1);
    tonearmPivot.rotation.z = config.restAngle; 

    // 2. The Offset Group (This permanently shifts the model to center on the pivot)
    tonearmOffsetGroup = new THREE.Group();
    tonearmOffsetGroup.position.set(config.offsetX, config.offsetY, 0);
    tonearmPivot.add(tonearmOffsetGroup);

    // 3. The 3D Model (Scaled and rotated to look correct)
    tonearmGroup.scale.setScalar(config.scale);
    tonearmGroup.rotation.set(config.modelRotX, config.modelRotY, config.modelRotZ);
    tonearmOffsetGroup.add(tonearmGroup);

    scene.add(tonearmPivot);
    tonearmLoaded = true;

  }, undefined, (err) => {
    console.error('GLB failed:', err);
    createFallbackTonearm();
  });

  createMusicNotes();
  animate();

  window.addEventListener('resize', () => {
    const r = container.getBoundingClientRect();
    const w = r.width || 500;
    const h = r.height || 500;
    const a = w / h;
    camera.left = frustumSize * a / -2;
    camera.right = frustumSize * a / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function createFallbackTonearm() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, metalness: 0.7, roughness: 0.25 });
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 24), mat);
  base.rotation.x = Math.PI / 2; 
  group.add(base);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.02), mat);
  arm.position.y = -0.5;
  group.add(arm);
  
  tonearmGroup = group;
  tonearmPivot = new THREE.Group();
  tonearmPivot.add(tonearmGroup);
  
  tonearmPivot.position.set(config.pivotX, config.pivotY, 0.1);
  tonearmPivot.rotation.z = config.restAngle;
  
  scene.add(tonearmPivot);
  tonearmLoaded = true;
}

function createMusicNotes() {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x4CAF50 });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat);
    head.scale.set(1.2, 0.8, 0.5);
    g.add(head);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.01), mat);
    stem.position.set(0.045, 0.07, 0);
    g.add(stem);
    g.position.set(-0.3 + i * 0.15, 0.1 + i * 0.15, 0.05);
    g.visible = false;
    g.userData = { baseY: g.position.y, baseX: g.position.x, offset: i * 1.2 };
    scene.add(g);
    notes.push(g);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  if (tonearmPivot && tonearmLoaded) {
    let targetZ = config.restAngle;
    
    if (isPlaying) {
      // Swings the angle based on song progress
      const trackProgress = (progress / Math.max(duration, 1));
      targetZ = config.playAngleStart + ((config.playAngleEnd - config.playAngleStart) * trackProgress);
    }

    // Smoothly animate ONLY the rotation of the main pivot
    tonearmPivot.rotation.z += (targetZ - tonearmPivot.rotation.z) * 0.05;
  }

  notes.forEach((note) => {
    if (!isPlaying) {
      note.visible = false;
      return;
    }
    note.visible = true;
    const t = (time + note.userData.offset) % 2;
    const cycle = Math.sin(t * Math.PI / 2);
    note.position.y = note.userData.baseY + cycle * 0.15;
    note.position.x = note.userData.baseX + Math.sin(t * 1.5) * 0.06;
  });

  renderer.render(scene, camera);
}

export function updatePlayback(playing, progressMs, durationMs) {
  isPlaying = playing;
  progress = progressMs || 0;
  duration = durationMs || 1;
}

export function cleanup() {
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
}