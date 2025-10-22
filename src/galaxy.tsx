import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import "./galaxy.css";
import { OrbitControls } from 'three-stdlib';
import getStar from "./helpers/getStar.ts";
import getStarfield from "./helpers/getStarfield.ts";

// Uhhh will parse from csv later, for testing
const testStars = [
  { id: 1, x: 0, y: 0, z: 0, name: "Sol (Sun)", magnitude: -26.74, luminosity: 1, temperature: 5778, color: 0xffff00 },
  { id: 2, x: 10, y: 5, z: -20, name: "Proxima Centauri", magnitude: 11.13, luminosity: 0.0017, temperature: 3042, color: 0xff6644 },
  { id: 3, x: -25, y: 15, z: 40, name: "Sirius", magnitude: -1.46, luminosity: 25.4, temperature: 9940, color: 0xaaccff },
  { id: 4, x: 50, y: -20, z: 30, name: "Betelgeuse", magnitude: 0.5, luminosity: 126000, temperature: 3500, color: 0xff4422 },
  { id: 5, x: -40, y: 30, z: -50, name: "Vega", magnitude: 0.03, luminosity: 40.12, temperature: 9602, color: 0xccddff },
  { id: 6, x: 70, y: 10, z: 60, name: "Rigel", magnitude: 0.13, luminosity: 120000, temperature: 11000, color: 0xaabbff },
  { id: 7, x: -60, y: -40, z: 20, name: "Aldebaran", magnitude: 0.85, luminosity: 518, temperature: 3910, color: 0xff8855 },
  { id: 8, x: 30, y: 50, z: -70, name: "Spica", magnitude: 1.04, luminosity: 12100, temperature: 22400, color: 0xbbccff },
  { id: 9, x: -80, y: 20, z: 80, name: "Antares", magnitude: 1.09, luminosity: 57500, temperature: 3570, color: 0xff3311 },
  { id: 10, x: 45, y: -60, z: -40, name: "Pollux", magnitude: 1.14, luminosity: 43, temperature: 4666, color: 0xffaa66 },
];

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const galaxyGroupRef = useRef<THREE.Group | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const { scene, camera, renderer, controls, pointer, raycaster } = setupScene(canvasRef.current);

        const galaxyGroup = createGalaxy(scene, testStars);
        galaxyGroupRef.current = galaxyGroup;

        // Animation loop
        let animationId: number;
        const animate = (t = 0) => {
            const time = t * 0.0002;
            animationId = requestAnimationFrame(animate);
            
            galaxyGroup.userData.update(time);
            
            controls.update();
            renderer.render(scene, camera);
        };
        animate();


        const onMouseClick = (event: MouseEvent) => {
            if (!galaxyGroupRef.current) return;
            
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(galaxyGroupRef.current.children, false);
            
            if (intersects.length > 0) {
                const star = intersects[0].object;
                const starData = star.userData.starData;
                
                console.log('Clicked star:', starData.name, 'ID:', starData.id);
                
                const offset = new THREE.Vector3(10, 5, 10);
                const targetPosition = new THREE.Vector3()
                    .copy(star.position)
                    .add(offset);
                
                animateCameraToPosition(camera, controls, targetPosition, star.position);
            
            }
        };

        window.addEventListener('click', onMouseClick);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', onMouseClick);
            controls.dispose();
            renderer.dispose();
        };
    }, []);
    
    return (
            <canvas ref={canvasRef} id="space" />
    );
}

function setupScene(canvas: HTMLCanvasElement) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    camera.position.set(0, 20, 100);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // background stars
    const starfield = getStarfield({ numStars: 500, size: 0.35 });
    scene.add(starfield);

    const dirLight = new THREE.DirectionalLight(0x0099ff, 1);
    dirLight.position.set(0, 1, 0);
    scene.add(dirLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 500;

    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

  return { scene, camera, renderer, controls, pointer, raycaster };

}

function createGalaxy(scene: THREE.Scene, starData: typeof testStars) {
    const galaxyGroup = new THREE.Group();
    galaxyGroup.userData.update = (t: number) => {
        galaxyGroup.children.forEach((child) => { // update all stars in the scene w animations
            child.userData.update?.(t);
        });
    };

    starData.forEach(star => {
        //const baseSize = Math.pow(star.luminosity, 0.25) * 0.3; // random ah formula to make sizes based on luminosity
        //const size = Math.max(0.5, Math.min(baseSize, 5));
        
        const starObject = getStar();

        starObject.position.set(star.x, star.y, star.z);
       
        starObject.userData.starData = star;
        starObject.userData.type = 'star'

        galaxyGroup.add(starObject);
    })
    scene.add(galaxyGroup);
    return galaxyGroup;
}

function animateCameraToPosition(camera: THREE.PerspectiveCamera, controls: OrbitControls, targetPosition: THREE.Vector3, lookAtPosition: THREE.Vector3) {
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    
    const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-in-out function
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Interpolate camera position
        camera.position.lerpVectors(startPosition, targetPosition, eased);
        
        // Interpolate controls target (what camera looks at)
        controls.target.lerpVectors(startTarget, lookAtPosition, eased);
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    };
    
    animateCamera();
}

export default App;