// starRenderer.ts - Three.js rendering logic with Level-of-Detail (LOD) system

import * as THREE from 'three';
import { CONFIG } from './constants';

// Defines the structure of star data from backend
export interface StarData {
  id: number;        // Unique star identifier
  x: number;         // X-coordinate
  y: number;         // Y-coordinate
  z: number;         // Z-coordinate
  name?: string;     // Optional: Star name
  magnitude?: number; // Optional: Brightness value
}

// Interface for the LOD system object returned by createGalaxy
// This provides methods to control and interact with the star rendering
interface LODSystem {
  group: THREE.Group;                           // Three.js group containing all star objects
  updateLOD: (camera: THREE.Camera) => void;    // Function to recalculate which stars should be detailed
  cleanup: () => void;                          // Function to dispose of GPU resources when done
  getDetailedStarCount: () => number;           // Function to get count of currently detailed stars
  selectStar: (starId: number) => void;         // Function to highlight a selected star
}

/**
 * LOD Strategy: O(n)
 * 1. All stars start as simple points in a point cloud
 * 2. Stars within DETAIL_DISTANCE become individual sphere meshes with glow
 * 3. As camera moves, stars dynamically switch between point and detailed representation
 * 4. Limit to MAX_DETAILED_STARS to prevent GPU overload
 * @returns LODSystem object with methods to control star rendering
 */
export function createGalaxy(
  scene: THREE.Scene,
  starData: StarData[],
  camera: THREE.Camera
): LODSystem {
  console.log('Creating galaxy with LOD rendering...');
  const startTime = performance.now(); // performance monitoring

  // Group to hold all star-related objects (point cloud + detailed stars)
  const galaxyGroup = new THREE.Group();

  // 1. Create point cloud for ALL stars
  const { pointCloud, positions, originalPositions } = createPointCloud(starData);
  galaxyGroup.add(pointCloud);

  // 2. Create a separate group to hold detailed star meshes
  const detailedStarsGroup = new THREE.Group();
  detailedStarsGroup.name = 'detailedStars'; // for debugging
  galaxyGroup.add(detailedStarsGroup);

  const detailedStarMap = new Map<number, THREE.Group>(); // Maps star index -> Three.js mesh group
  const starIndexMap = new Map<number, number>();         // Maps star ID -> array index for quick lookup
  let selectedStarId: number | null = null;               // Currently selected star (for highlighting)
  
  // Build the star ID
  starData.forEach((star, index) => {
    starIndexMap.set(star.id, index);
  });

  /**
   * Update which stars are rendered in detail based on camera position.
   * Algorithm:
   * 1. Calculate squared distance from camera to each star
   * 2. Filter stars within DETAIL_DISTANCE
   * 3. Sort by distance and take closest MAX_DETAILED_STARS
   * 4. Add new detailed stars, remove ones that moved too far
   * 5. Update point cloud to hide/show corresponding points
   */
  const updateLOD = (camera: THREE.Camera) => {
    const cameraPos = camera.position;
    const detailDistSq = CONFIG.DETAIL_DISTANCE * CONFIG.DETAIL_DISTANCE;

    // Find all stars within the detail distance threshold
    const candidateStars: Array<{ index: number; distSq: number }> = [];
    
    // Check distance to every star
    for (let i = 0; i < starData.length; i++) {
      const star = starData[i];
      
      const dx = star.x - cameraPos.x;
      const dy = star.y - cameraPos.y;
      const dz = star.z - cameraPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      // Only consider stars within the detail distance
      if (distSq <= detailDistSq) {
        candidateStars.push({ index: i, distSq });
      }
    }

    // Sort candidates by distance (closest first) for prioritization
    // If we have more candidates than MAX_DETAILED_STARS, we want the closest ones
    candidateStars.sort((a, b) => a.distSq - b.distSq);
    
    const shouldBeDetailed = new Set<number>(
      candidateStars.slice(0, CONFIG.MAX_DETAILED_STARS).map(s => s.index)
    );

    // Always keep the selected star detailed, even if it's far away
    if (selectedStarId !== null) {
      const selectedIndex = starIndexMap.get(selectedStarId);
      if (selectedIndex !== undefined) {
        shouldBeDetailed.add(selectedIndex); // Force-include selected star
      }
    }

    let addedCount = 0;
    let removedCount = 0;

    // Remove stars that are no longer close enough to be detailed
    detailedStarMap.forEach((starMesh, index) => {
      if (!shouldBeDetailed.has(index)) {
        detailedStarsGroup.remove(starMesh);
        detailedStarMap.delete(index);
        
        // Restore the point in the point cloud by resetting its position
        positions[index * 3] = originalPositions[index * 3];       // x
        positions[index * 3 + 1] = originalPositions[index * 3 + 1]; // y
        positions[index * 3 + 2] = originalPositions[index * 3 + 2]; // z
        
        removedCount++;
      }
    });

    // Add new detailed stars that just came within range
    shouldBeDetailed.forEach(index => {
      if (!detailedStarMap.has(index)) {
        // Star is newly within detail range - create detailed mesh
        const star = starData[index];
        const detailedStar = createDetailedStar(); // Create sphere + glow mesh
        detailedStar.position.set(star.x, star.y, star.z); // Position in 3D space
        
        // Store star data in userData for raycasting/selection
        detailedStar.userData.starData = star;
        detailedStar.userData.starIndex = index;
        
        // Add to scene and tracking map
        detailedStarsGroup.add(detailedStar);
        detailedStarMap.set(index, detailedStar);
        
        // Hide the corresponding point in the point cloud
        // Move it far away (off-screen) instead of removing it (more efficient)
        positions[index * 3] = 10000;     // x - far away
        positions[index * 3 + 1] = 10000; // y - far away
        positions[index * 3 + 2] = 10000; // z - far away
        
        addedCount++;
      }
    });

    // Update point cloud geometry if any changes were made
    // This tells Three.js to re-upload the position data to the GPU
    if (addedCount > 0 || removedCount > 0) {
      pointCloud.geometry.attributes.position.needsUpdate = true; // Flag for GPU update
      console.log(`LOD update: +${addedCount} -${removedCount} stars, total detailed: ${detailedStarMap.size}`);
    }
  };

  /**
   * Select and highlight a specific star.
   * Changes the star's color to indicate selection and forces it to be rendered in detail.
   * 
   * @param starId - The ID of the star to select
   */
  const selectStar = (starId: number) => {
    // Deselect previous star if one was selected
    if (selectedStarId !== null) {
      const prevIndex = starIndexMap.get(selectedStarId);
      if (prevIndex !== undefined) {
        const prevStarMesh = detailedStarMap.get(prevIndex);
        if (prevStarMesh) {
          setStarColor(prevStarMesh, 0xffff00); // Restore to yellow (default star color)
        }
      }
    }
    
    // Update the selected star ID
    selectedStarId = starId;
    
    // Force immediate LOD update to ensure selected star is rendered as detailed mesh
    // This is necessary because the selected star might be outside the normal detail range
    updateLOD(camera);
    
    // Now highlight the newly selected star with a different color
    const newIndex = starIndexMap.get(starId);
    if (newIndex !== undefined) {
      const newStarMesh = detailedStarMap.get(newIndex);
      if (newStarMesh) {
        setStarColor(newStarMesh, 0x00ff88); // Light green/cyan for selection highlight
      } else {
        console.warn('Selected star not in detailed map after LOD update:', starId);
      }
    }
  };

  // Log creation performance
  console.log(
    `Galaxy created in ${(performance.now() - startTime).toFixed(2)}ms with ${starData.length} stars`
  );

  // Add the galaxy group to the scene
  scene.add(galaxyGroup);

  // Perform initial LOD update to render stars near starting camera position
  // IMPORTANT: Do this AFTER adding to scene, or Three.js might not render properly
  updateLOD(camera);

  // Return the LOD system interface for the caller to use
  return {
    group: galaxyGroup,                // Access to the Three.js group
    updateLOD,                        // Function to update LOD
    selectStar,                       // Function to select/highlight stars
    cleanup: () => {                  // Cleanup function to free GPU resources
      // Dispose of point cloud resources
      pointCloud.geometry.dispose();
      (pointCloud.material as THREE.Material).dispose();
      
      // Dispose of all detailed star meshes
      detailedStarMap.forEach(starMesh => {
        starMesh.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();          // Free geometry buffers
            (child.material as THREE.Material).dispose(); // Free material resources
          }
        });
      });
    },
    getDetailedStarCount: () => detailedStarMap.size, // Get current detailed star count
  };
}

/**
 * Create a point cloud containing all stars.
 * Point clouds are extremely efficient - all points rendered in a single draw call.
 * 
 * How it works:
 * - All star positions stored in a single Float32Array (flat array: [x1,y1,z1, x2,y2,z2, ...])
 * - GPU renders all points in one operation
 * - Individual points can be "hidden" by moving them off-screen
 * 
 * @param starData - Array of star data with positions
 * @returns Object containing the point cloud, mutable positions array, and original positions backup
 */
function createPointCloud(starData: StarData[]) {
  // Create a flat array of positions: [x1, y1, z1, x2, y2, z2, ...]
  // Float32Array is more memory-efficient and faster for GPU than regular arrays
  const positions = new Float32Array(starData.length * 3);
  
  // Fill the positions array with star coordinates
  starData.forEach((star, i) => {
    positions[i * 3] = star.x;       // x coordinate at index i*3
    positions[i * 3 + 1] = star.y;   // y coordinate at index i*3+1
    positions[i * 3 + 2] = star.z;   // z coordinate at index i*3+2
  });

  // Create Three.js geometry and attach positions as an attribute
  const geometry = new THREE.BufferGeometry();
  // BufferAttribute tells Three.js how to interpret the positions array:
  // - positions: the data array
  // - 3: each vertex has 3 components (x, y, z)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Create material for point rendering
  const material = new THREE.PointsMaterial({
    color: 0xffffff,                    // White color
    size: CONFIG.POINT_SIZE,            // Size of each point in Three.js units
    sizeAttenuation: true,              // Points get smaller with distance (perspective)
    transparent: true,                  // Enable transparency
    opacity: CONFIG.POINT_OPACITY,      // Opacity value (0-1)
  });

  // Create the point cloud object
  const pointCloud = new THREE.Points(geometry, material);
  pointCloud.userData.starData = starData; // Store reference to star data for raycasting
  pointCloud.name = 'pointCloud'; // Name for debugging

  // Keep a copy of original positions for restoring points when they return to point cloud
  // This is necessary because we modify 'positions' array to hide/show points
  const originalPositions = new Float32Array(positions);

  return { pointCloud, positions, originalPositions };
}

/**
 * Create a detailed star mesh with a core sphere and glow effect.
 * This is used for stars that are close to the camera.
 * 
 * Structure:
 * Group
 * ├── Star Core (solid yellow sphere)
 * └── Glow (larger transparent sphere)
 * 
 * @returns Three.js Group containing the star core and glow meshes
 */
function createDetailedStar(): THREE.Group {
  // Create a group to hold both the core and glow
  const group = new THREE.Group();
  
  // Create the star core - solid sphere
  const geometry = new THREE.SphereGeometry(
    CONFIG.DETAILED_STAR_SIZE,        // Radius of the sphere
    CONFIG.DETAILED_STAR_SEGMENTS,    // Width segments (higher = smoother but more polygons)
    CONFIG.DETAILED_STAR_SEGMENTS     // Height segments
  );
  // MeshBasicMaterial: unaffected by lights, always same brightness (good for glowing objects)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow
  const star = new THREE.Mesh(geometry, material);
  star.name = 'starCore'; // Name for debugging/identification
  group.add(star);
  
  // Create the glow effect - larger transparent sphere around the core
  const glowGeometry = new THREE.SphereGeometry(
    CONFIG.GLOW_SIZE,                 // Larger than core to create halo effect
    CONFIG.DETAILED_STAR_SEGMENTS,
    CONFIG.DETAILED_STAR_SEGMENTS
  );
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,                  // Same yellow color as core
    transparent: true,                // Enable transparency
    opacity: CONFIG.GLOW_OPACITY      // Semi-transparent for soft glow
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.name = 'starGlow'; // Name for debugging/identification
  group.add(glow);
  
  return group; // Return group containing both meshes
}

/**
 * Set the color of a star mesh (both core and glow).
 * Updates the material color for all child meshes in the star group.
 * 
 * @param starGroup - The Three.js group containing star meshes
 * @param color - Hex color value (e.g., 0xffff00 for yellow)
 */
function setStarColor(starGroup: THREE.Group, color: number) {
  // Iterate through all children in the group (core and glow)
  starGroup.children.forEach(child => {
    if (child instanceof THREE.Mesh) {
      // Update the material color using setHex() for efficiency
      (child.material as THREE.MeshBasicMaterial).color.setHex(color);
    }
  });
}

/**
 * Helper to extract star data from a raycaster intersection.
 * Handles both point cloud clicks and detailed star mesh clicks.
 * 
 * When clicking:
 * - Point cloud: intersection.index gives us the star index directly
 * - Detailed star: need to traverse up parent chain to find userData
 * 
 * @param intersection - Three.js raycaster intersection object
 * @param allStars - Array of all star data for lookup
 * @returns StarData object if found, null otherwise
 */
export function getStarDataFromIntersection(
  intersection: THREE.Intersection,
  allStars: StarData[]
): StarData | null {
  // Check if the intersection is with a point in the point cloud
  // Points have an 'index' property that directly maps to the star array
  if (intersection.index !== undefined && intersection.object instanceof THREE.Points) {
    return allStars[intersection.index]; // Direct lookup by index
  }
  
  // Check if it's a detailed star mesh
  // Detailed stars store their data in userData, but the intersection might be
  // with a child mesh (core or glow), so traverse up the parent chain
  let obj: THREE.Object3D | null = intersection.object;
  while (obj && !obj.userData.starData) {
    obj = obj.parent; // Move up the hierarchy
  }
  
  // Return the star data if found, null otherwise
  return obj?.userData.starData ?? null;
}
