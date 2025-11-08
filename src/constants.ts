// config values
export const CONFIG = {
  // URL where FastAPI backend serves star data
  BACKEND_URL: `${import.meta.env.VITE_BACKEND_URL}/api/stars/all`,
  DIJKSTRA_URL: `${import.meta.env.VITE_BACKEND_URL}/api/dijkstra`,
  ASTAR_URL: `${import.meta.env.VITE_BACKEND_URL}/api/astar`,
  
  // Performance
  LOD_UPDATE_INTERVAL: 100, // How often (in milliseconds) to recalculate which stars should be rendered in detail
  DETAIL_DISTANCE: 50, // Distance from camera where stars switch from simple points to detailed 3D spheres
  MAX_DETAILED_STARS: 100, // Maximum number of stars to render as detailed 3D objects at once
  
  // Interaction Settings
  DRAG_THRESHOLD: 5, // Maximum pixel distance mouse can move between mousedown/mouseup to count as a click (not a drag)
  CAMERA_ANIMATION_DURATION: 1500, // Duration of smooth camera animation when zooming to a selected star
  CAMERA_ZOOM_DISTANCE: 2, // How far away from the star to position camera when zooming in
  
  // Rendering Settings
  POINT_SIZE: 0.05, // Size of each point in the point cloud (small dots for distant stars)
  POINT_OPACITY: 0.8, // Transparency of point cloud stars (0 = invisible, 1 = fully opaque)

  DETAILED_STAR_SIZE: 0.05, // Radius of the sphere mesh used for detailed star rendering
  DETAILED_STAR_SEGMENTS: 16, // Number of width/height segments in sphere geometry
  GLOW_SIZE: 0.08, // Radius of the glow sphere that surrounds each detailed star
  GLOW_OPACITY: 0.3, // Transparency of the glow effect (lower = more subtle)
  
  // Camera Configuration
  CAMERA_FOV: 75, // Field of view in degrees
  CAMERA_NEAR: 0.1, // Nearest distance camera can see (prevents z-fighting with near objects)
  CAMERA_FAR: 1000, // Farthest distance camera can see (culls distant objects for performance)
  CAMERA_START_POSITION: { x: 0, y: 20, z: 100 }, // Starting position of camera when app loads
  
  // OrbitControls Configuration
  DAMPING_FACTOR: 0.05, // Slightly damped for responsive feel
  MIN_DISTANCE: 1, // Minimum distance camera can be from the orbit target (prevents clipping into geometry)
  MAX_DISTANCE: 500, // Maximum distance camera can be from the orbit target (limits how far you can zoom out)
  
  // Raycasting Configuration
  RAYCASTER_THRESHOLD: 1.0, // Threshold for raycaster point detection - how close mouse must be to point to register hit

} as const;
