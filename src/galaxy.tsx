import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import "./galaxy.css";
import { OrbitControls } from 'three-stdlib';
import getStar from "./helpers/getStar.ts";
import getStarfield from "./helpers/getStarfield.ts";

// Uhhh will parse from csv later, for testing
const testStars = [
  { x: 0, y: 0, z: 0, name: "Sol (Sun)", magnitude: -26.74, luminosity: 1, temperature: 5778, color: 0xffff00 },
  { x: 10, y: 5, z: -20, name: "Proxima Centauri", magnitude: 11.13, luminosity: 0.0017, temperature: 3042, color: 0xff6644 },
  { x: -25, y: 15, z: 40, name: "Sirius", magnitude: -1.46, luminosity: 25.4, temperature: 9940, color: 0xaaccff },
  { x: 50, y: -20, z: 30, name: "Betelgeuse", magnitude: 0.5, luminosity: 126000, temperature: 3500, color: 0xff4422 },
  { x: -40, y: 30, z: -50, name: "Vega", magnitude: 0.03, luminosity: 40.12, temperature: 9602, color: 0xccddff },
  { x: 70, y: 10, z: 60, name: "Rigel", magnitude: 0.13, luminosity: 120000, temperature: 11000, color: 0xaabbff },
  { x: -60, y: -40, z: 20, name: "Aldebaran", magnitude: 0.85, luminosity: 518, temperature: 3910, color: 0xff8855 },
  { x: 30, y: 50, z: -70, name: "Spica", magnitude: 1.04, luminosity: 12100, temperature: 22400, color: 0xbbccff },
  { x: -80, y: 20, z: 80, name: "Antares", magnitude: 1.09, luminosity: 57500, temperature: 3570, color: 0xff3311 },
  { x: 45, y: -60, z: -40, name: "Pollux", magnitude: 1.14, luminosity: 43, temperature: 4666, color: 0xffaa66 },
];

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const { scene, camera, renderer, controls } = setupScene(canvasRef.current);

        const galaxyGroup = createGalaxy(scene, testStars);

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

  return { scene, camera, renderer, controls };

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
       
        galaxyGroup.add(starObject);
    })
    scene.add(galaxyGroup);
    return galaxyGroup;
}

export default App;