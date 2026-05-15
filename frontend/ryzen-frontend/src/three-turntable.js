import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let tonearmPivot, tonearmOffsetGroup, tonearmGroup;
let notes = [];
let tonearmTextures = [];
let y2kNoteMaterial;
let animationFrameId;

let isPlaying = false;
let progress = 0;
let duration = 1;
let tonearmLoaded = false;
const frustumSize = 2.2;

const config = {
  noteScale: 0.05, 
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

function balloonEnvelope(t) {
  if (t < 0.1) {
    const x = t / 0.1;
    return 1 - Math.pow(1 - x, 3);
  } else if (t < 0.75) {
    return 1.0;
  } else {
    const x = (t - 0.75) / 0.25;
    return 1 - x * x;
  }
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

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
  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFShadowMap; 
  
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none';
  renderer.domElement.style.zIndex = '10';

  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 1.2); 
  scene.add(hemiLight);

  const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
  frontLight.position.set(0, .5, 3.0); 
  frontLight.castShadow = true;
  frontLight.shadow.camera.left = -2;
  frontLight.shadow.camera.right = 2;
  frontLight.shadow.camera.top = 2;
  frontLight.shadow.camera.bottom = -2;
  frontLight.shadow.camera.near = 0.1;
  frontLight.shadow.camera.far = 20;
  frontLight.shadow.mapSize.width = 1024;
  frontLight.shadow.mapSize.height = 1024;
  frontLight.shadow.bias = -0.002;
  frontLight.shadow.radius = 4; 
  scene.add(frontLight);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.25, depthWrite: false }) 
  );
  shadowPlane.position.set(0, 0, -0.02); 
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);




  // ─── THE CHUNKY, FAKE SYSTEM BOOT LOADER ───
let currentP = 0;
  let isRealLoaded = false;
  const manager = new THREE.LoadingManager();

  // Check if they already sat through the boot sequence this session
  const hasBooted = sessionStorage.getItem('ryzenBooted') === 'true';

  manager.onLoad = function () {
    isRealLoaded = true;
  };
  manager.onError = function (url) {
    console.warn(`[Ryzen] Asset failed: ${url}`);
    isRealLoaded = true; 
  };

  function runFakeBoot() {
    if (currentP >= 100) return;

    // Wait for real assets to load
    if (currentP >= 92 && !isRealLoaded) {
      setTimeout(runFakeBoot, hasBooted ? 50 : 200); 
      return;
    }

    // If already booted before, instantly jump to 100%
    if (hasBooted) {
      currentP = 100;
    } else {
      // Otherwise, do the chunky random jumps
      const jump = Math.random() * 20 + 5;
      currentP += jump;
      if (currentP > 100) currentP = 100;
    }

    const loaderBar = document.getElementById('loader-bar');
    const percentText = document.getElementById('loader-percent');
    if (loaderBar) loaderBar.style.width = currentP + '%';
    if (percentText) percentText.innerText = `[ ${Math.floor(currentP)}% ]`;

    if (currentP === 100) {
      // Save that they have booted
      sessionStorage.setItem('ryzenBooted', 'true'); 
      
      setTimeout(() => {
        const loaderEl = document.getElementById('brutal-loader');
        if (loaderEl) {
          if (hasBooted) {
            // Instant vanish if they are just clicking around pages
            loaderEl.style.display = 'none';
          } else {
            // Smooth fade for the first time
            loaderEl.style.opacity = '0';
            setTimeout(() => loaderEl.style.display = 'none', 600);
          }
        }
      }, hasBooted ? 0 : 400); 
    } else {
      const delay = Math.random() * 400 + 200;
      setTimeout(runFakeBoot, delay);
    }
  }
  
  runFakeBoot();




  const texLoader = new THREE.TextureLoader(manager);
  const loader = new GLTFLoader(manager);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  function loadTex(path, srgb = false) {
    const tex = texLoader.load(path);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(maxAniso, 8);
    tonearmTextures.push(tex);
    return tex;
  }

  const albedoMap = loadTex('/models/Tonearm_albedo.png', true);
  const metallicMap = loadTex('/models/Tonearm_metallic.png');
  const roughnessMap = loadTex('/models/Tonearm_roughness.png');
  const normalMap = loadTex('/models/Tonearm_normal.png');
  const aoMap = loadTex('/models/Tonearm_AO.png');

  loader.load('/models/tonearm.glb', (gltf) => {
    tonearmGroup = gltf.scene;

    tonearmGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true; 
        child.receiveShadow = true;

        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
        
        child.material = new THREE.MeshStandardMaterial({
          map: albedoMap,
          metalnessMap: metallicMap,
          roughnessMap: roughnessMap,
          normalMap: normalMap,
          aoMap: aoMap,
          metalness: 0.05,
          roughness: 0.95,
          emissive: 0x111111
        });
      }
    });

    tonearmPivot = new THREE.Group();
    tonearmPivot.position.set(config.pivotX, config.pivotY, 0.1); 
    tonearmPivot.rotation.z = config.restAngle; 

    tonearmOffsetGroup = new THREE.Group();
    tonearmOffsetGroup.position.set(config.offsetX, config.offsetY, 0);
    tonearmPivot.add(tonearmOffsetGroup);

    tonearmGroup.scale.setScalar(config.scale);
    tonearmGroup.rotation.set(config.modelRotX, config.modelRotY, config.modelRotZ);
    tonearmOffsetGroup.add(tonearmGroup);

    scene.add(tonearmPivot);
    tonearmLoaded = true;

  }, undefined, (err) => console.error('[Ryzen] Tonearm GLB error:', err));

  y2kNoteMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xFFEF5E,        
    emissive: 0x332B00,     
    metalness: 0.0,          
    roughness: 0.6,          
    clearcoat: 0.4,          
    clearcoatRoughness: 0.5, 
    side: THREE.DoubleSide   
  });

  createMusicNotes(loader); 
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

function createMusicNotes(loader) {
  loader.load('/models/music.glb', (gltf) => {
    const baseNote = gltf.scene;

    baseNote.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });

    for (let i = 0; i < 6; i++) {
      const note = baseNote.clone();
      
      note.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true; 
          child.material = y2kNoteMaterial;
        }
      });

      note.scale.set(0, 0, 0); 
      
      const randomX = -0.5 + Math.random() * 1.0; 
      const randomY = -0.3 + Math.random() * 0.4;

      note.userData = { 
        baseY: randomY, 
        baseX: randomX, 
        phaseOffset: i * 0.45, 
        buoyancy: 0.6 + Math.random() * 0.2,
        wobbleFreq: 1.2 + Math.random() * 0.8,      
        wobbleAmp: 0.05 + Math.random() * 0.08,      
        spinSpeed: 0.4 + Math.random() * 0.6,        
        sizeVariance: 0.85 + Math.random() * 0.3,    
        speed: 0.25 + Math.random() * 0.1,            
        playScale: 0 
      };
      
      scene.add(note);
      notes.push(note);
    }
  }, undefined, (err) => console.warn('[Ryzen] music.glb error:', err));
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const realTime = Date.now() * 0.001; 

  if (tonearmPivot && tonearmLoaded) {
    const targetZ = isPlaying ? config.playAngle : config.restAngle;
    tonearmPivot.rotation.z += (targetZ - tonearmPivot.rotation.z) * 0.04;
  }

  notes.forEach((note) => {
    const ud = note.userData;
    const life = (realTime * ud.speed + ud.phaseOffset) % 1.0;

    if (!isPlaying) {
      ud.playScale = THREE.MathUtils.lerp(ud.playScale, 0, 0.08);
    } else {
      ud.playScale = THREE.MathUtils.lerp(ud.playScale, 1, 0.08);
    }

    const envelope = balloonEnvelope(life);
    const popScale = envelope * ud.playScale * config.noteScale * ud.sizeVariance;
    
    note.scale.set(popScale, popScale, popScale);
    note.visible = popScale > 0.001;

    const riseEased = smoothstep(life);
    note.position.y = ud.baseY + riseEased * 0.8 * ud.buoyancy;

    const bob = Math.sin(realTime * 2.0 + ud.phaseOffset) * 0.02 * ud.playScale;
    note.position.y += bob;

    const wobbleEnvelope = Math.sin(life * Math.PI);
    note.position.x = ud.baseX + Math.sin(life * Math.PI * ud.wobbleFreq + ud.phaseOffset) * ud.wobbleAmp * wobbleEnvelope;
    
    note.rotation.y = Math.sin(realTime * ud.spinSpeed + ud.phaseOffset) * 0.5;
    note.rotation.z = Math.cos(realTime * ud.spinSpeed * 0.7 + ud.phaseOffset * 1.3) * 0.15;
    note.rotation.x = Math.sin(realTime * ud.spinSpeed * 0.5 + ud.phaseOffset * 0.7) * 0.1;
  });

  renderer.render(scene, camera);
}

export function updatePlayback(playing, progressMs, durationMs) {
  isPlaying = playing;
  progress = progressMs || 0;
  duration = durationMs || 1;
}

export function cleanup() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  tonearmTextures.forEach(tex => tex.dispose());
  tonearmTextures = [];

  if (y2kNoteMaterial) y2kNoteMaterial.dispose();

  notes.forEach(note => {
    note.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
      }
    });
    scene.remove(note);
  });
  notes = [];

  if (tonearmGroup) {
    tonearmGroup.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });
  }

  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
}