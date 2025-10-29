// config values
export const CONFIG = {
  // URL where FastAPI backend serves star data
  BACKEND_URL: 'http://localhost:8000/stars/all',
  
  // Performance
  LOD_UPDATE_INTERVAL: 100, // How often (in milliseconds) to recalculate which stars should be rendered in detail
  DETAIL_DISTANCE: 50, // Distance from camera where stars switch from simple points to detailed 3D spheres
  MAX_DETAILED_STARS: 100, // Maximum number of stars to render as detailed 3D objects at once
  
  // Interaction Settings
  DRAG_THRESHOLD: 5, // Maximum pixel distance mouse can move between mousedown/mouseup to count as a click (not a drag)
  CAMERA_ANIMATION_DURATION: 1500, // Duration of smooth camera animation when zooming to a selected star
  
  
  // Smaller = closer view, larger = more context around the star
  CAMERA_ZOOM_DISTANCE: 2, // How far away from the star to position camera when zooming in
  
  // Rendering Settings - Point Cloud (distant stars)
  // Size of each point in the point cloud (small dots for distant stars)
  POINT_SIZE: 0.05, // Three.js units
  
  // Transparency of point cloud stars (0 = invisible, 1 = fully opaque)
  POINT_OPACITY: 0.8,
  
  // Rendering Settings - Detailed Stars (nearby stars)
  // Radius of the sphere mesh used for detailed star rendering
  DETAILED_STAR_SIZE: 0.05, // Three.js units
  
  // Number of width/height segments in sphere geometry (higher = smoother but more polygons)
  DETAILED_STAR_SEGMENTS: 16, // good balance between quality and performance
  
  // Radius of the glow sphere that surrounds each detailed star
  GLOW_SIZE: 0.08, // Larger than star itself to create halo effect
  
  // Transparency of the glow effect (lower = more subtle)
  GLOW_OPACITY: 0.3, // Semi-transparent for soft glow appearance
  
  // Camera Configuration
  // Field of view in degrees - higher = wider view (fisheye effect), lower = zoomed in
  CAMERA_FOV: 75, // degrees - standard perspective
  
  // Nearest distance camera can see (prevents z-fighting with near objects)
  CAMERA_NEAR: 0.1, // Three.js units
  
  // Farthest distance camera can see (culls distant objects for performance)
  CAMERA_FAR: 1000, // Three.js units - large enough to see all stars
  
  // Starting position of camera when app loads (x, y, z coordinates)
  CAMERA_START_POSITION: { x: 0, y: 20, z: 100 }, // Slightly elevated, looking at origin
  
  // OrbitControls Configuration
  // Damping factor for smooth camera movement (0 = instant stop, 1 = never stops)
  // Lower = snappier, higher = more momentum/inertia
  DAMPING_FACTOR: 0.05, // Slightly damped for responsive feel
  
  // Minimum distance camera can be from the orbit target (prevents clipping into geometry)
  MIN_DISTANCE: 1, // Three.js units
  
  // Maximum distance camera can be from the orbit target (limits how far you can zoom out)
  MAX_DISTANCE: 500, // Three.js units - can see entire galaxy
  
  // Raycasting Configuration
  // Threshold for raycaster point detection - how close mouse must be to point to register hit
  // Higher = easier to click stars but less precise, lower = harder to click but more accurate
  RAYCASTER_THRESHOLD: 1.0, // Three.js units
  
  // Spatial Indexing (Future Optimization - Currently Unused)
  // Maximum depth of octree for spatial partitioning (more depth = finer subdivision)
  OCTREE_MAX_DEPTH: 8, // levels deep
  
  // Maximum number of objects per octree node before subdividing
  OCTREE_MAX_OBJECTS: 100, // objects per node
} as const; // 'as const' makes this object immutable and provides better TypeScript inference
