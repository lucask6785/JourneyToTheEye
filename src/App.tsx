import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import type { StarData } from './starRenderer';
import { createGalaxy, getStarDataFromIntersection } from './starRenderer';
import { CONFIG } from './constants';
import './App.css';

interface BackendResponse {
  positions: number[][];
  metadata: Array<{
    id: number;
    name: string;
    magnitude: number;
  }>;
  bounds: { min: number[]; max: number[] };
  count: number;
}

interface DjikstraResponse {
  sequence: number[];
  distance: number;
}

interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lodSystemRef = useRef<any>(null);
  
  const [stars, setStars] = useState<StarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedCount, setDetailedCount] = useState(0);
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const [pathStarIds, setPathStarIds] = useState<Set<number> | null>(null);
  const [pathSequence, setPathSequence] = useState<number[]>([]);
  const hasAnimatedToFirstStar = useRef(false); // Track if we've animated to first star

  // Fetch stars and run pathfinding
  useEffect(() => {
    const fetchStars = async () => {
      try {
        setLoading(true);
        const response = await fetch(CONFIG.BACKEND_URL);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: BackendResponse = await response.json();
        const transformedStars: StarData[] = data.positions.map((pos, index) => ({
          id: data.metadata[index].id,
          x: pos[0],
          y: pos[1],
          z: pos[2],
          name: data.metadata[index].name,
          magnitude: data.metadata[index].magnitude,
        }));
        
        setStars(transformedStars);
        console.log(`Loaded ${transformedStars.length} stars`);
        
        // Run pathfinding
        await runDijkstra(transformedStars);
      } catch (err) {
        console.error('Error fetching stars:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stars');
      } finally {
        setLoading(false);
      }
    };

    const runDijkstra = async (allStars: StarData[]) => {
      try {
        const response = await fetch(CONFIG.DJIKSTRA_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data: DjikstraResponse = await response.json();
        console.log(`Path found: ${data.sequence.length} stars, distance: ${data.distance}`);
        
        setPathStarIds(new Set(data.sequence));
        setPathSequence(data.sequence);
        
        const firstStar = allStars.find(star => star.id === data.sequence[0]);
        if (firstStar) setSelectedStar(firstStar);
      } catch (err) {
        console.error('Pathfinding error:', err);
      }
    };

    fetchStars();
  }, []);

  // Setup Three.js scene
  useEffect(() => {
    if (!canvasRef.current || stars.length === 0) return;

    const { scene, camera, renderer, controls, raycaster } = setupScene(canvasRef.current);
    const lodSystem = createGalaxy(scene, stars, camera, pathStarIds, pathSequence);
    lodSystemRef.current = lodSystem;

    // Animate to first star once
    if (selectedStar && pathStarIds && !hasAnimatedToFirstStar.current) {
      hasAnimatedToFirstStar.current = true;
      lodSystem.selectStar(selectedStar.id);
      
      const direction = camera.position.clone()
        .sub(new THREE.Vector3(selectedStar.x, selectedStar.y, selectedStar.z))
        .normalize();
      
      const targetPos = new THREE.Vector3(selectedStar.x, selectedStar.y, selectedStar.z)
        .add(direction.multiplyScalar(CONFIG.CAMERA_ZOOM_DISTANCE));
      
      animateCameraToPosition(camera, controls, targetPos, new THREE.Vector3(selectedStar.x, selectedStar.y, selectedStar.z));
    }

    // Animation loop
    let animationId: number;
    let lastUpdate = 0;
    
    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);
      
      if (time - lastUpdate > CONFIG.LOD_UPDATE_INTERVAL) {
        lodSystem.updateLOD(camera);
        setDetailedCount(lodSystem.getDetailedStarCount());
        lastUpdate = time;
      }
      
      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);

    // Mouse interaction for star selection
    const mouseDownPos = { x: 0, y: 0 };
    
    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPos.x = e.clientX;
      mouseDownPos.y = e.clientY;
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      const dragDist = Math.sqrt(dx * dx + dy * dy);
      
      // Only click if not dragging
      if (dragDist < CONFIG.DRAG_THRESHOLD) {
        const pointer = new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1
        );

        raycaster.setFromCamera(pointer, camera);
        raycaster.params.Points!.threshold = CONFIG.RAYCASTER_THRESHOLD;
        
        // In path mode, only check detailed stars
        const detailedGroup = lodSystem.group.children.find((c: any) => c.name === 'detailedStars');
        const targets = pathStarIds && detailedGroup ? [detailedGroup] : lodSystem.group.children;
        
        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
          const star = getStarDataFromIntersection(hits[0], stars);
          if (star) {
            console.log('Selected:', star.name, 'ID:', star.id);
            setSelectedStar(star);
            lodSystem.selectStar(star.id);
            
            const dir = camera.position.clone().sub(new THREE.Vector3(star.x, star.y, star.z)).normalize();
            const targetPos = new THREE.Vector3(star.x, star.y, star.z).add(dir.multiplyScalar(CONFIG.CAMERA_ZOOM_DISTANCE));
            
            animateCameraToPosition(camera, controls, targetPos, new THREE.Vector3(star.x, star.y, star.z));
          }
        }
      }
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      lodSystem.cleanup();
    };
  }, [stars, pathStarIds, pathSequence]);

  if (loading) {
    return (
      <div className="center-container">
        <div>Loading stars from backend...</div>
        <div className="subtext">This may take a moment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-container error">
        <div>Error loading stars:</div>
        <div>{error}</div>
        <div className="subtext">
          Make sure backend is running: uvicorn api:app --reload
        </div>
      </div>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} id="space" />
      <div className="info-box">
        <div>Total stars: {stars.length.toLocaleString()}</div>
        <div>Detailed stars: {detailedCount}</div>
        {pathStarIds && <div>Path stars: {pathStarIds.size}</div>}
        <div>Selected: {selectedStar ? `${selectedStar.name} (ID: ${selectedStar.id})` : 'None'}</div>
      </div>
    </>
  );
}

function setupScene(canvas: HTMLCanvasElement): SceneSetup {
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
  
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
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

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateCameraToPosition(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  lookAtPosition: THREE.Vector3
) {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / CONFIG.CAMERA_ANIMATION_DURATION, 1);
    const eased = easeInOutQuad(progress);
    
    camera.position.lerpVectors(startPosition, targetPosition, eased);
    controls.target.lerpVectors(startTarget, lookAtPosition, eased);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  animate();
}

export default App;