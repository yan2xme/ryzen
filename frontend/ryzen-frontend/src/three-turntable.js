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

// ─────────────────────────────────────────
// YOUR FINAL CALIBRATION CONFIG
// ─────────────────────────────────────────
const config = {
  DEBUG_MODE: false, 
  
  noteScale: 0.08, 
  
  scale: 0.22,
  pivotX: 0.88,
  pivotY: 0.89,
  offsetX: -0.11,
  offsetY: 0.02,
  modelRotX: 1.50840734641021,
  modelRotY: -2.94,
  modelRotZ: 0.01,
  
  restAngle: -1.20159265358979,
  playAngle: -0.431592653589793
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

  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
  frontLight.position.set(0, 0, 5);
  scene.add(frontLight);

  const loader = new GLTFLoader();

  // ─── LOAD TONEARM ───
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

    tonearmPivot = new THREE.Group();
    tonearmPivot.position.set(config.pivotX, config.pivotY, 0.1);
    tonearmPivot.rotation.z = config.restAngle; 

    if (config.DEBUG_MODE) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false })
      );
      dot.renderOrder = 999; 
      tonearmPivot.add(dot);
      createCalibrationUI();
    }

    tonearmOffsetGroup = new THREE.Group();
    tonearmOffsetGroup.position.set(config.offsetX, config.offsetY, 0);
    tonearmPivot.add(tonearmOffsetGroup);

    tonearmGroup.scale.setScalar(config.scale);
    tonearmGroup.rotation.set(config.modelRotX, config.modelRotY, config.modelRotZ);
    tonearmOffsetGroup.add(tonearmGroup);

    scene.add(tonearmPivot);
    tonearmLoaded = true;

  }, undefined, (err) => console.error('[Ryzen] Tonearm GLB error:', err));

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

// ─── LOAD FOIL BALLOONS ───
function createMusicNotes() {
  const loader = new GLTFLoader();
  
  const foilMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffeb3b,         
    metalness: 0.3,          
    roughness: 0.4,         
    clearcoat: 1.0,          
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide   
  });

  loader.load('/models/music.glb', (gltf) => {
    const baseNote = gltf.scene;

    baseNote.traverse((child) => {
      if (child.isMesh) {
        if (child.material) child.material.dispose();
        child.material = foilMaterial;
      }
    });

    for (let i = 0; i < 6; i++) {
      const note = baseNote.clone();
      note.scale.set(0, 0, 0); 
      
      // ✨ FIXED: Centered around the disc!
      // X stays between -0.5 and 0.5 (center of screen)
      const randomX = -0.5 + Math.random() * 1.0; 
      // Y stays between -0.4 and 0.1 (bottom half of the disc)
      const randomY = -0.4 + Math.random() * 0.5;

      note.position.set(randomX, randomY, 0.05);

      note.userData = { 
        baseY: randomY, 
        baseX: randomX, 
        offset: i * 0.45, 
        playScale: 0 
      };
      
      scene.add(note);
      notes.push(note);
    }
  }, undefined, (err) => console.warn('[Ryzen] music.glb error:', err));
}

function animate() {
  requestAnimationFrame(animate);
  const realTime = Date.now() * 0.001;

  // ─── BINARY TONEARM MOVEMENT ───
  if (tonearmPivot && tonearmLoaded) {
    const targetZ = isPlaying ? config.playAngle : config.restAngle;
    tonearmPivot.rotation.z += (targetZ - tonearmPivot.rotation.z) * 0.05;
  }

  // ─── BUMP APP BALLOON EFFECT ───
  const fps = 24; 
  const steppedTime = Math.floor(realTime * fps) / fps;

  notes.forEach((note) => {
    const life = (steppedTime * 0.35 + note.userData.offset) % 1.0;

    if (!isPlaying) {
      note.userData.playScale = THREE.MathUtils.lerp(note.userData.playScale, 0, 0.1);
    } else {
      note.userData.playScale = THREE.MathUtils.lerp(note.userData.playScale, 1, 0.1);
    }

    const popScale = Math.sin(life * Math.PI) * note.userData.playScale * config.noteScale;
    
    note.scale.set(popScale, popScale, popScale);
    note.visible = popScale > 0.001;

    // ✨ FIXED: Float height reduced to 0.8 so they don't clip at the top
    note.position.y = note.userData.baseY + (life * 0.8);
    // Drift gently left and right
    note.position.x = note.userData.baseX + Math.sin(life * Math.PI * 2) * 0.2;
    
    note.rotation.y = steppedTime * 2.0 + note.userData.offset;
    note.rotation.z = Math.sin(steppedTime * 3 + note.userData.offset) * 0.3;
  });

  renderer.render(scene, camera);
}

// Update Playback from main.js
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