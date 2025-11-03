import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { CONFIG } from '../constants';
import type { StarData, SceneSetup } from '../types';

// Visual curve: https://easings.net/#easeInOutQuad
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function animateCameraToStar(
  star: StarData,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  onComplete?: () => void
) {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = Date.now();
  
  const direction = camera.position.clone()
    .sub(new THREE.Vector3(star.x, star.y, star.z))
    .normalize();
  
  const targetPosition = new THREE.Vector3(star.x, star.y, star.z)
    .add(direction.multiplyScalar(CONFIG.CAMERA_ZOOM_DISTANCE));
  
  const lookAtPosition = new THREE.Vector3(star.x, star.y, star.z);
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / CONFIG.CAMERA_ANIMATION_DURATION, 1);
    const eased = easeInOutQuad(progress);
    
    camera.position.lerpVectors(startPosition, targetPosition, eased);
    controls.target.lerpVectors(startTarget, lookAtPosition, eased);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };
  
  animate();
}

export function setupScene(canvas: HTMLCanvasElement): SceneSetup {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.CAMERA_NEAR,
    CONFIG.CAMERA_FAR
  );
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  
  camera.position.set(
    CONFIG.CAMERA_START_POSITION.x,
    CONFIG.CAMERA_START_POSITION.y,
    CONFIG.CAMERA_START_POSITION.z
  );
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  scene.add(new THREE.AmbientLight(0x404040, 0.5));
  
  const dirLight = new THREE.DirectionalLight(0x0099ff, 1);
  dirLight.position.set(0, 1, 0);
  scene.add(dirLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.DAMPING_FACTOR;
  controls.minDistance = CONFIG.MIN_DISTANCE;
  controls.maxDistance = CONFIG.MAX_DISTANCE;

  const raycaster = new THREE.Raycaster();

  return { scene, camera, renderer, controls, raycaster };
}