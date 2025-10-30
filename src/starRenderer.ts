import * as THREE from 'three';
import { CONFIG } from './constants';

export interface StarData {
  id: number;
  x: number;
  y: number;
  z: number;
  name?: string;
  magnitude?: number;
}

interface LODSystem {
  group: THREE.Group;
  updateLOD: (camera: THREE.Camera) => void;
  cleanup: () => void;
  getDetailedStarCount: () => number;
  selectStar: (starId: number) => void;
}

/**
 * Create the galaxy visualization with LOD system
 */
export function createGalaxy(
  scene: THREE.Scene,
  starData: StarData[],
  camera: THREE.Camera,
  pathStarIds: Set<number> | null = null,
  pathSequence: number[] = []
): LODSystem {
  console.log(`Creating galaxy with ${starData.length} stars`);
  const startTime = performance.now();

  const galaxyGroup = new THREE.Group();

  // Point cloud for all stars
  const { pointCloud, positions, originalPositions } = createPointCloud(starData);
  galaxyGroup.add(pointCloud);

  // Group for detailed star spheres
  const detailedStarsGroup = new THREE.Group();
  detailedStarsGroup.name = 'detailedStars';
  galaxyGroup.add(detailedStarsGroup);

  // Path line if in path mode
  let pathLine: THREE.Line | null = null;
  if (pathSequence.length > 0) {
    pathLine = createPathLine(starData, pathSequence);
    galaxyGroup.add(pathLine);
  }

  // Track detailed stars and selection
  const detailedStarMap = new Map<number, THREE.Group>();
  const starIndexMap = new Map<number, number>();
  let selectedStarId: number | null = null;
  
  starData.forEach((star, idx) => {
    starIndexMap.set(star.id, idx);
  });

  // Update LOD based on camera position
  const updateLOD = (camera: THREE.Camera) => {
    const cameraPos = camera.position;
    const isPathMode = pathStarIds !== null && pathStarIds.size > 0;
    let shouldBeDetailed: Set<number>;

    if (isPathMode) {
      // Path mode: show all path stars
      shouldBeDetailed = new Set<number>();
      starData.forEach((star, idx) => {
        if (pathStarIds!.has(star.id)) {
          shouldBeDetailed.add(idx);
        }
      });
    } else {
      // Normal mode: show nearby stars
      const nearby: Array<{ index: number; distSq: number }> = [];
      const distSq = CONFIG.DETAIL_DISTANCE * CONFIG.DETAIL_DISTANCE;
      
      for (let i = 0; i < starData.length; i++) {
        const star = starData[i];
        const dx = star.x - cameraPos.x;
        const dy = star.y - cameraPos.y;
        const dz = star.z - cameraPos.z;
        const d = dx * dx + dy * dy + dz * dz;
        
        if (d <= distSq) nearby.push({ index: i, distSq: d });
      }

      nearby.sort((a, b) => a.distSq - b.distSq);
      shouldBeDetailed = new Set(nearby.slice(0, CONFIG.MAX_DETAILED_STARS).map(s => s.index));
    }

    // Always include selected star
    if (selectedStarId !== null) {
      const idx = starIndexMap.get(selectedStarId);
      if (idx !== undefined) shouldBeDetailed.add(idx);
    }

    // Remove stars no longer in range
    let added = 0, removed = 0;
    detailedStarMap.forEach((mesh, idx) => {
      if (!shouldBeDetailed.has(idx)) {
        detailedStarsGroup.remove(mesh);
        detailedStarMap.delete(idx);
        
        // Restore point in cloud
        positions[idx * 3] = originalPositions[idx * 3];
        positions[idx * 3 + 1] = originalPositions[idx * 3 + 1];
        positions[idx * 3 + 2] = originalPositions[idx * 3 + 2];
        removed++;
      }
    });

    // Add or update detailed stars
    shouldBeDetailed.forEach(idx => {
      const star = starData[idx];
      const color = selectedStarId === star.id ? 0x00ff88 : 0xffff00;
      
      if (!detailedStarMap.has(idx)) {
        const mesh = createDetailedStar();
        mesh.position.set(star.x, star.y, star.z);
        mesh.userData.starData = star;
        mesh.userData.starIndex = idx;
        setStarColor(mesh, color);
        
        detailedStarsGroup.add(mesh);
        detailedStarMap.set(idx, mesh);
        
        // Hide from point cloud
        positions[idx * 3] = 10000;
        positions[idx * 3 + 1] = 10000;
        positions[idx * 3 + 2] = 10000;
        added++;
      } else {
        setStarColor(detailedStarMap.get(idx)!, color);
      }
    });

    if (added > 0 || removed > 0) {
      pointCloud.geometry.attributes.position.needsUpdate = true;
    }
  };

  const selectStar = (starId: number) => {
    selectedStarId = starId;
    updateLOD(camera);
  };

  console.log(`Galaxy created in ${(performance.now() - startTime).toFixed(0)}ms`);

  scene.add(galaxyGroup);
  updateLOD(camera);

  return {
    group: galaxyGroup,
    updateLOD,
    selectStar,
    cleanup: () => {
      pointCloud.geometry.dispose();
      (pointCloud.material as THREE.Material).dispose();
      
      if (pathLine) {
        pathLine.geometry.dispose();
        (pathLine.material as THREE.Material).dispose();
      }
      
      detailedStarMap.forEach(mesh => {
        mesh.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      });
    },
    getDetailedStarCount: () => detailedStarMap.size,
  };
}

/**
 * Create point cloud for all stars
 */
function createPointCloud(starData: StarData[]) {
  const positions = new Float32Array(starData.length * 3);
  
  starData.forEach((star, i) => {
    positions[i * 3] = star.x;
    positions[i * 3 + 1] = star.y;
    positions[i * 3 + 2] = star.z;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: CONFIG.POINT_SIZE,
    sizeAttenuation: true,
    transparent: true,
    opacity: CONFIG.POINT_OPACITY,
  });

  const pointCloud = new THREE.Points(geometry, material);
  pointCloud.userData.starData = starData;
  pointCloud.name = 'pointCloud';

  return { pointCloud, positions, originalPositions: new Float32Array(positions) };
}

/**
 * Create detailed star sphere with glow
 */
function createDetailedStar(): THREE.Group {
  const group = new THREE.Group();
  
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(CONFIG.DETAILED_STAR_SIZE, CONFIG.DETAILED_STAR_SEGMENTS, CONFIG.DETAILED_STAR_SEGMENTS),
    coreMat
  );
  core.name = 'starCore';
  group.add(core);
  
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: CONFIG.GLOW_OPACITY
  });
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(CONFIG.GLOW_SIZE, CONFIG.DETAILED_STAR_SEGMENTS, CONFIG.DETAILED_STAR_SEGMENTS),
    glowMat
  );
  glow.name = 'starGlow';
  group.add(glow);
  
  return group;
}

/**
 * Set the color of a star mesh (both core and glow)
 */
function setStarColor(starGroup: THREE.Group, color: number) {
  starGroup.children.forEach(child => {
    if (child instanceof THREE.Mesh) {
      (child.material as THREE.MeshBasicMaterial).color.setHex(color);
    }
  });
}

/**
 * Helper to get star data from raycaster intersection
 */
export function getStarDataFromIntersection(
  intersection: THREE.Intersection,
  allStars: StarData[]
): StarData | null {
  // Check if it's a point cloud
  if (intersection.index !== undefined && intersection.object instanceof THREE.Points) {
    return allStars[intersection.index];
  }
  
  // Check if it's a detailed star - look up the parent chain for userData
  let obj: THREE.Object3D | null = intersection.object;
  while (obj && !obj.userData.starData) {
    obj = obj.parent;
  }
  
  return obj?.userData.starData ?? null;
}

/**
 * Create a line connecting all stars in the path sequence
 */
function createPathLine(starData: StarData[], pathSequence: number[]): THREE.Line {
  const starIdToData = new Map<number, StarData>();
  starData.forEach(star => starIdToData.set(star.id, star));
  
  // Build positions array from path sequence
  const positions: number[] = [];
  let missingStars = 0;
  let totalDistance = 0;
  
  pathSequence.forEach((starId, i) => {
    const star = starIdToData.get(starId);
    if (star) {
      positions.push(star.x, star.y, star.z);
      
      // Calculate distance to previous star
      if (i > 0) {
        const prevStarId = pathSequence[i - 1];
        const prevStar = starIdToData.get(prevStarId);
        if (prevStar) {
          const dx = star.x - prevStar.x;
          const dy = star.y - prevStar.y;
          const dz = star.z - prevStar.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          totalDistance += dist;
          
          // Log first few segments for debugging
          if (i <= 5) {
            console.log(`Segment ${i-1}→${i}: Star ${prevStarId} (${prevStar.x.toFixed(1)}, ${prevStar.y.toFixed(1)}, ${prevStar.z.toFixed(1)}) → Star ${starId} (${star.x.toFixed(1)}, ${star.y.toFixed(1)}, ${star.z.toFixed(1)}) = ${dist.toFixed(2)} units`);
          }
        }
      }
    } else {
      missingStars++;
      console.warn(`Star ID ${starId} in path not found in starData`);
    }
  });
  
  if (missingStars > 0) {
    console.warn(`Path line missing ${missingStars} stars out of ${pathSequence.length}`);
  }
  
  console.log(`Created path line with ${positions.length / 3} points, total distance: ${totalDistance.toFixed(2)}`);
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  
  const material = new THREE.LineBasicMaterial({
    color: 0x00ccff, // Cyan color
    linewidth: 2,
    transparent: true,
    opacity: 0.6
  });
  
  const line = new THREE.Line(geometry, material);
  line.name = 'pathLine';
  
  return line;
}