import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 50, 300);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(50, 60, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const hemisphereLight = new THREE.HemisphereLight(0xcceeff, 0x957D5F, 1.2);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xfff5e1, 1.0);
directionalLight.position.set(100, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

const worldParams = {
    width: 200,
    height: 200,
    segments: 256,
    noise: {
        scale: 250,
        octaves: 6,
        persistence: 0.5,
        lacunarity: 2.0,
        height: 40,
    },
    river: {
        scale: 150,
        threshold: 0.03,
        depth: 5,
    }
};

function generateTerrain() {
    const noise2D = createNoise2D();
    const riverNoise2D = createNoise2D();

    const geometry = new THREE.PlaneGeometry(
        worldParams.width,
        worldParams.height,
        worldParams.segments,
        worldParams.segments
    );

    const positions = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    const biome = {
        levels: {
            water_deep: -5.0,
            water_shallow: -2.0,
            sand: 0.0,
            grass: 15.0,
            rock: 25.0,
            snow: 30.0,
        },
        colors: {
            water_deep: new THREE.Color(0x000066),
            water_shallow: new THREE.Color(0x0066ff),
            sand: new THREE.Color(0xf2d16d),
            grass: new THREE.Color(0x38761d),
            rock: new THREE.Color(0x737373),
            snow: new THREE.Color(0xffffff),
        }
    };

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        
        let amplitude = 1;
        let frequency = 1;
        let elevation = 0;

        for (let j = 0; j < worldParams.noise.octaves; j++) {
            const noiseVal = noise2D(
                (x / worldParams.noise.scale) * frequency, 
                (y / worldParams.noise.scale) * frequency
            );
            elevation += noiseVal * amplitude;
            
            amplitude *= worldParams.noise.persistence;
            frequency *= worldParams.noise.lacunarity;
        }

        const riverVal = Math.abs(riverNoise2D(x / worldParams.river.scale, y / worldParams.river.scale));
        
        if (riverVal < worldParams.river.threshold) {
            elevation -= worldParams.river.depth * (1 - riverVal / worldParams.river.threshold);
        }

        const finalElevation = elevation * worldParams.noise.height;
        positions.setZ(i, finalElevation);

        if (finalElevation < biome.levels.water_deep)   color.copy(biome.colors.water_deep);
        else if (finalElevation < biome.levels.water_shallow) color.copy(biome.colors.water_shallow);
        else if (finalElevation < biome.levels.sand)     color.copy(biome.colors.sand);
        else if (finalElevation < biome.levels.grass)    color.copy(biome.colors.grass);
        else if (finalElevation < biome.levels.rock)     color.copy(biome.colors.rock);
        else                                             color.copy(biome.colors.snow);
        
        if (riverVal < worldParams.river.threshold && finalElevation < biome.levels.sand) {
            color.copy(biome.colors.water_shallow);
        }

        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.0
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    
    scene.add(terrainMesh);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function init() {
    generateTerrain();
    animate();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
