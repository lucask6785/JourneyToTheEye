import * as THREE from 'three';

export interface StarData {
  id: number;
  x: number;
  y: number;
  z: number;
  name: string;
  magnitude: number;
}

export interface LODSystem {
  group: THREE.Group;
  updateLOD: (camera: THREE.Camera) => void;
  cleanup: () => void;
  getDetailedStarCount: () => number;
  selectStar: (starId: number | null) => void;
  setStartingStar: (starId: number | null) => void;
  setDestinationStar: (starId: number | null) => void;
}

export interface BackendResponse {
  positions: number[][];
  metadata: Array<{
    id: number;
    name: string;
    magnitude: number;
  }>;
  bounds: { min: number[]; max: number[] };
  count: number;
}

export interface PopupPosition {
  x: number;
  y: number;
  starScreenPos: { x: number; y: number };
  connectionPoint?: { x: number; y: number };
}

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: any; // OrbitControls type
  raycaster: THREE.Raycaster;
}

export interface DijkstraResponse {
  sequence: number[];
  distance: number;
}