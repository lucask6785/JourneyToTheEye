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
        setLoading(true); // Show loading UI
        
        // Fetch data from backend API endpoint
        const response = await fetch(CONFIG.BACKEND_URL);
        
        // Check if HTTP request was successful (status 200-299)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON response body
        const data: BackendResponse = await response.json();
        
        // Transform backend format to StarData format
        // Backend sends positions and metadata separately for efficiency
        // We combine them here into objects for easier frontend use
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
        // Handle any errors during fetch or parsing
        console.error('Error fetching stars:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stars');
      } finally {
        // Always hide loading UI, whether success or error
        setLoading(false);
      }
    };

    fetchStars(); // Execute the async function
  }, []); // Empty deps = run once on mount

  // Effect hook: Set up Three.js scene and animation loop
  // Runs when stars data changes (after fetch completes)
  useEffect(() => {
    // Don't run if canvas ref isn't ready or no stars loaded yet
    if (!canvasRef.current || stars.length === 0) return;

    // Initialize Three.js scene with camera, renderer, controls
    const { scene, camera, renderer, controls, raycaster } = setupScene(canvasRef.current);
    
    // Create the galaxy visualization with LOD system
    const lodSystem = createGalaxy(scene, stars, camera);
    lodSystemRef.current = lodSystem; // Store ref for access in event handlers

    // Animation loop variables
    let animationId: number;     // ID from requestAnimationFrame for cleanup
    let lastLODUpdate = 0;        // Timestamp of last LOD update (for throttling)
    
    /**
     * Main animation loop - called every frame (~60 FPS)
     * Handles LOD updates and rendering
     * 
     * @param time - High-resolution timestamp from requestAnimationFrame
     */
    const animate = (time: number) => {
      // Schedule next frame - this creates the loop
      animationId = requestAnimationFrame(animate);
      
      // Update LOD based on time instead of frame count
      // This throttles LOD updates to CONFIG.LOD_UPDATE_INTERVAL (100ms)
      // LOD updates are expensive (O(n) distance checks), so we don't do them every frame
      if (time - lastLODUpdate > CONFIG.LOD_UPDATE_INTERVAL) {
        lodSystem.updateLOD(camera);                      // Recalculate which stars should be detailed
        setDetailedCount(lodSystem.getDetailedStarCount()); // Update UI counter
        lastLODUpdate = time;                             // Record update time
      }
      
      // Update camera controls (handles damping/inertia)
      controls.update();
      
      // Render the scene from camera perspective
      renderer.render(scene, camera);
    };
    animate(0); // Start the animation loop

    // Mouse interaction: Click detection with drag prevention
    // We need to distinguish between clicks (select star) and drags (rotate view)
    const mouseDownPos = { x: 0, y: 0 }; // Store mouse position on mousedown
    
    /**
     * Record mouse position when user presses mouse button
     * This allows us to detect if they dragged or just clicked
     */
    const handleMouseDown = (event: MouseEvent) => {
      mouseDownPos.x = event.clientX;
      mouseDownPos.y = event.clientY;
    };

    /**
     * Handle mouse button release - check if it was a click or drag
     * If mouse didn't move much, treat as click and select star
     */
    const handleMouseUp = (event: MouseEvent) => {
      // Calculate distance mouse moved between down and up
      const dx = event.clientX - mouseDownPos.x;
      const dy = event.clientY - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy); // Euclidean distance in pixels
      
      // Only trigger star selection if mouse didn't move much (not a drag)
      // DRAG_THRESHOLD prevents accidental selection when user is rotating view
      if (distance < CONFIG.DRAG_THRESHOLD) {
        // Convert mouse coordinates to normalized device coordinates (NDC)
        // NDC: x and y range from -1 to +1, (0,0) is center of screen
        const pointer = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,   // Map [0, width] to [-1, 1]
          -(event.clientY / window.innerHeight) * 2 + 1  // Map [0, height] to [1, -1] (y inverted)
        );

        // Set up raycaster to shoot ray from camera through mouse position
        raycaster.setFromCamera(pointer, camera);
        
        // Set threshold for point detection - how close ray must be to point to register hit
        raycaster.params.Points!.threshold = CONFIG.RAYCASTER_THRESHOLD;
        
        // Cast ray and find intersections with star objects
        // 'true' parameter means recursively check children (point cloud + detailed stars)
        const intersects = raycaster.intersectObjects(lodSystem.group.children, true);
        
        // Check if we hit any stars
        if (intersects.length > 0) {
          // Get the star data from the intersection
          // Handles both point cloud and detailed mesh intersections
          const starData = getStarDataFromIntersection(intersects[0], stars);
          
          if (starData) {
            console.log('Clicked star:', starData.name, 'ID:', starData.id);
            
            // Highlight the selected star (changes color to green)
            lodSystem.selectStar(starData.id);
            
            // Calculate camera target position: position camera near the star
            // Direction: vector from star to current camera position (normalized)
            const direction = camera.position.clone()
                .sub(new THREE.Vector3(starData.x, starData.y, starData.z))
                .normalize(); // Make it unit length (length = 1)
            
            // Target position: star position + direction * distance
            // This places camera at specified distance from star, looking at it
            const targetPosition = new THREE.Vector3(starData.x, starData.y, starData.z)
                .add(direction.multiplyScalar(CONFIG.CAMERA_ZOOM_DISTANCE));
            
            // Look-at position: the star itself (camera will point here)
            const lookAtPosition = new THREE.Vector3(starData.x, starData.y, starData.z);
            
            // Smoothly animate camera to new position
            animateCameraToPosition(camera, controls, targetPosition, lookAtPosition);
          }
        }
      }
    };

    /**
     * Handle window resize - update camera and renderer to match new size
     * This prevents distortion when window size changes
     */
    const handleResize = () => {
      // Update camera aspect ratio to match new window dimensions
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix(); // Recalculate projection matrix with new aspect
      
      // Resize renderer to match window
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Limit pixel ratio to avoid excessive GPU load on high-DPI displays
      // min(devicePixelRatio, 2) means use native DPI but max out at 2x
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    // Register event listeners
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    // Cleanup function - called when component unmounts or stars change
    // This prevents memory leaks and stops animation loop
    return () => {
      cancelAnimationFrame(animationId);                // Stop animation loop
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      controls.dispose();                               // Cleanup controls
      renderer.dispose();                               // Free GPU resources
      lodSystem.cleanup();                              // Cleanup star meshes and geometries
    };
  }, [stars]); // Re-run when stars data changes

  // Conditional rendering: Show loading state while fetching data
  if (loading) {
    return (
      <div className="center-container">
        <div>Loading stars from backend...</div>
        <div className="subtext">This may take a moment...</div>
      </div>
    );
  }

  // Conditional rendering: Show error state if fetch failed
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

  // Main render: Canvas for Three.js + UI overlay with stats
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

/**
 * Set up the Three.js scene with camera, renderer, lights, and controls
 * This is called once when the component mounts with star data
 * 
 * @param canvas - HTMLCanvasElement to render into
 * @returns Object containing all scene components
 */
function setupScene(canvas: HTMLCanvasElement): SceneSetup {
  // Create the scene - container for all 3D objects
  const scene = new THREE.Scene();
  
  // Create perspective camera (simulates human eye perspective)
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_FOV,                            // Field of view in degrees
    window.innerWidth / window.innerHeight,       // Aspect ratio
    CONFIG.CAMERA_NEAR,                           // Near clipping plane
    CONFIG.CAMERA_FAR                             // Far clipping plane
  );
  
  // Create WebGL renderer with antialiasing for smoother edges
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  
  // Position camera at starting location
  camera.position.set(
    CONFIG.CAMERA_START_POSITION.x,
    CONFIG.CAMERA_START_POSITION.y,
    CONFIG.CAMERA_START_POSITION.z
  );
  
  // Set renderer size to fill window
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Set pixel ratio for high-DPI displays (but cap at 2x for performance)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Add ambient light - provides base illumination from all directions
  // Low intensity (0.5) creates subtle lighting without washing out stars
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  // Add directional light - simulates distant light source (like sun)
  // Blue tint (0x0099ff) gives a cool space atmosphere
  const dirLight = new THREE.DirectionalLight(0x0099ff, 1);
  dirLight.position.set(0, 1, 0); // Light from above
  scene.add(dirLight);

  // Set up OrbitControls for mouse/touch interaction
  // Allows user to rotate, pan, and zoom the camera
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;                  // Smooth camera movement with inertia
  controls.dampingFactor = CONFIG.DAMPING_FACTOR; // How much inertia (0 = none, 1 = infinite)
  controls.minDistance = CONFIG.MIN_DISTANCE;     // Can't zoom closer than this
  controls.maxDistance = CONFIG.MAX_DISTANCE;     // Can't zoom farther than this

  // Create raycaster for mouse picking (detecting clicks on objects)
  const raycaster = new THREE.Raycaster();

  return { scene, camera, renderer, controls, raycaster };
}

/**
 * Easing function for smooth camera animations
 * Implements ease-in-out quadratic easing (slow start, fast middle, slow end)
 * 
 * Visual curve: https://easings.net/#easeInOutQuad
 * 
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
function easeInOutQuad(t: number): number {
  // First half (0 to 0.5): Ease in with y = 2t²
  // Second half (0.5 to 1): Ease out with y = 1 - (2-2t)²/2
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Animate camera to a new position with smooth easing
 * Used when user clicks on a star to zoom to it
 * 
 * This uses requestAnimationFrame to create smooth interpolation
 * between current and target camera positions
 * 
 * @param camera - The camera to animate
 * @param controls - OrbitControls (to update target/look-at point)
 * @param targetPosition - Where the camera should end up
 * @param lookAtPosition - What point the camera should look at
 */
function animateCameraToPosition(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  lookAtPosition: THREE.Vector3
) {
  // Store starting positions for interpolation
  const startPosition = camera.position.clone();  // Clone to avoid reference issues
  const startTarget = controls.target.clone();    // Current orbit center
  const startTime = Date.now();                   // Animation start time
  
  /**
   * Recursive animation function - called each frame
   * Interpolates camera position from start to target over time
   */
  const animate = () => {
    // Calculate elapsed time and progress (0 to 1)
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / CONFIG.CAMERA_ANIMATION_DURATION, 1);
    
    // Apply easing function for smooth acceleration/deceleration
    const eased = easeInOutQuad(progress);
    
    // Linearly interpolate (lerp) between start and target positions using eased progress
    // lerpVectors: result = start + (target - start) * eased
    // This creates smooth motion following the easing curve
    camera.position.lerpVectors(startPosition, targetPosition, eased);
    controls.target.lerpVectors(startTarget, lookAtPosition, eased);
    
    // Continue animation if not finished (progress < 1)
    if (progress < 1) {
      requestAnimationFrame(animate); // Schedule next frame
    }
  };
  
  animate(); // Start the animation
}

export default App;
