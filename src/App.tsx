// App.tsx

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import type { StarData } from './starRenderer';
import { createGalaxy, getStarDataFromIntersection } from './starRenderer';
import { CONFIG } from './constants';
import './App.css';

// TypeScript interface for backend API response structure
// This defines the shape of data we expect from GET /stars/all endpoint
interface BackendResponse {
  positions: number[][];     // 2D array: [[x1,y1,z1], [x2,y2,z2], ...]
  metadata: Array<{          // Array of star properties
    id: number;              // Unique star identifier
    name: string;            // Star name (or generated name)
    magnitude: number;       // Brightness value
  }>;
  bounds: {                  // Bounding box of entire dataset
    min: number[];           // [min_x, min_y, min_z]
    max: number[];           // [max_x, max_y, max_z]
  };
  count: number;             // Total number of stars
}

// TypeScript interface for Three.js scene components
interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
}

function App() {
  // React refs - persist across renders without causing re-renders when changed
  const canvasRef = useRef<HTMLCanvasElement>(null);  // Reference to canvas DOM element
  const lodSystemRef = useRef<any>(null);              // Reference to LOD system for star rendering
  
  // React state - triggers re-renders when changed
  const [stars, setStars] = useState<StarData[]>([]);        // Array of all star data
  const [loading, setLoading] = useState(true);               // Loading state for UI
  const [error, setError] = useState<string | null>(null);   // Error message if fetch fails
  const [detailedCount, setDetailedCount] = useState(0);     // Count of currently detailed stars

  // Effect hook - Fetch star data from backend on component mount
  useEffect(() => {
    const fetchStars = async () => {
      try {
        setLoading(true);
        
        // Fetch data from backend API endpoint
        const response = await fetch(CONFIG.BACKEND_URL);
        
        // Check if HTTP request was successful
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: BackendResponse = await response.json();
        
        // Transform backend format to StarData format
        const transformedStars: StarData[] = data.positions.map((pos, index) => ({
          id: data.metadata[index].id,           // Star ID
          x: pos[0],                             // X coordinate
          y: pos[1],                             // Y coordinate
          z: pos[2],                             // Z coordinate
          name: data.metadata[index].name,       // Star name
          magnitude: data.metadata[index].magnitude, // Brightness
        }));
        
        // Update state with loaded stars (triggers re-render)
        setStars(transformedStars);
        console.log(`Loaded ${transformedStars.length} stars from backend`);
      } catch (err) {
        console.error('Error fetching stars:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stars');
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  // Effect hook - Set up Three.js scene and animation loop
  // Runs when stars data changes (after fetch completes)
  useEffect(() => {
    if (!canvasRef.current || stars.length === 0) return;

    const { scene, camera, renderer, controls, raycaster } = setupScene(canvasRef.current);
    
    // Create the galaxy visualization with LOD system
    const lodSystem = createGalaxy(scene, stars, camera);
    lodSystemRef.current = lodSystem;

    // Animation loop variables
    let animationId: number;
    let lastLODUpdate = 0;
    
    const animate = (time: number) => {
      // Schedule next frame
      animationId = requestAnimationFrame(animate);
      
      // Update LOD based on time instead of frame count
      if (time - lastLODUpdate > CONFIG.LOD_UPDATE_INTERVAL) {
        lodSystem.updateLOD(camera);
        setDetailedCount(lodSystem.getDetailedStarCount()); // Update UI counter
        lastLODUpdate = time;
      }
      
      // Update camera controls
      controls.update();
      
      // Render the scene from camera perspective
      renderer.render(scene, camera);
    };
    animate(0);

    // Mouse interaction
    const mouseDownPos = { x: 0, y: 0 };
    
    const handleMouseDown = (event: MouseEvent) => {
      mouseDownPos.x = event.clientX;
      mouseDownPos.y = event.clientY;
    };

    const handleMouseUp = (event: MouseEvent) => {
      // Calculate distance mouse moved between down and up
      const dx = event.clientX - mouseDownPos.x;
      const dy = event.clientY - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only trigger star selection if mouse didn't move much
      if (distance < CONFIG.DRAG_THRESHOLD) {
        const pointer = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

        // Set up raycaster
        raycaster.setFromCamera(pointer, camera);
        
        // Set threshold for point detection
        raycaster.params.Points!.threshold = CONFIG.RAYCASTER_THRESHOLD;
        
        // Cast ray and find intersections with star objects
        const intersects = raycaster.intersectObjects(lodSystem.group.children, true);
        
        // Check if we hit any stars
        if (intersects.length > 0) {
          // Get the star data from the intersection
          const starData = getStarDataFromIntersection(intersects[0], stars);
          
          if (starData) {
            console.log('Clicked star:', starData.name, 'ID:', starData.id);
            
            // Highlight the selected star (changes color to green)
            lodSystem.selectStar(starData.id);
            
            const direction = camera.position.clone()
                .sub(new THREE.Vector3(starData.x, starData.y, starData.z))
                .normalize(); // Make it unit length (length = 1)
        
            const targetPosition = new THREE.Vector3(starData.x, starData.y, starData.z)
                .add(direction.multiplyScalar(CONFIG.CAMERA_ZOOM_DISTANCE));
            
            const lookAtPosition = new THREE.Vector3(starData.x, starData.y, starData.z);
            
            animateCameraToPosition(camera, controls, targetPosition, lookAtPosition);
          }
        }
      }
    };

    // Handle window resize
    const handleResize = () => {
      // Update camera aspect ratio to match new window dimensions
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      
      // Resize renderer to match window
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Limit pixel ratio to avoid excessive GPU load on high-DPI displays
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId); // Stop animation loop
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      controls.dispose(); // Cleanup controls
      renderer.dispose(); // Free GPU resources
      lodSystem.cleanup(); // Cleanup star meshes and geometries
    };
  }, [stars]);

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="center-container">
        <div>Loading stars from backend...</div>
        <div className="subtext">This may take a moment...</div>
      </div>
    );
  }

  // Show error state if fetch failed
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

  // Canvas for Three.js + UI overlay with stats
  return (
    <>
      <canvas ref={canvasRef} id="space" />
      <div className="info-box">
        <div>Stars loaded: {stars.length.toLocaleString()}</div>
        <div>Detailed stars: {detailedCount}</div>
      </div>
    </>
  );
}

// Set up the Three.js scene with camera, renderer, lights, and controls
function setupScene(canvas: HTMLCanvasElement): SceneSetup {
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_FOV,                            // Field of view in degrees
    window.innerWidth / window.innerHeight,       // Aspect ratio
    CONFIG.CAMERA_NEAR,                           // Near clipping plane
    CONFIG.CAMERA_FAR                             // Far clipping plane
  );
  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  
  camera.position.set(
    CONFIG.CAMERA_START_POSITION.x,
    CONFIG.CAMERA_START_POSITION.y,
    CONFIG.CAMERA_START_POSITION.z
  );
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  // Directional light
  const dirLight = new THREE.DirectionalLight(0x0099ff, 1);
  dirLight.position.set(0, 1, 0); // Light from above
  scene.add(dirLight);

  // Allows user to rotate, pan, and zoom the camera
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.DAMPING_FACTOR;
  controls.minDistance = CONFIG.MIN_DISTANCE;
  controls.maxDistance = CONFIG.MAX_DISTANCE;

  const raycaster = new THREE.Raycaster();

  return { scene, camera, renderer, controls, raycaster };
}

// For smooth camera animation
function easeInOutQuad(t: number): number {
  // From https://easings.net/#easeInOutQuad
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateCameraToPosition(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  lookAtPosition: THREE.Vector3
) {

  const startPosition = camera.position.clone();  // Clone to avoid reference issues
  const startTarget = controls.target.clone();
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / CONFIG.CAMERA_ANIMATION_DURATION, 1);
    
    const eased = easeInOutQuad(progress);
    
    // Linearly interpolate (lerp) between start and target positions using eased progress
    camera.position.lerpVectors(startPosition, targetPosition, eased);
    controls.target.lerpVectors(startTarget, lookAtPosition, eased);
    
    // Continue animation if not finished (progress < 1)
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  animate();
}

export default App;
