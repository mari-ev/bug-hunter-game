import * as THREE from 'three';

// ===== СЦЕНА =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

// ===== КАМЕРА =====
const camera = new THREE.PerspectiveCamera(
    60,                              // угол обзора
    window.innerWidth / window.innerHeight,
    0.1,                             // ближняя граница
    1000                             // дальняя граница
);

// ===== РЕНДЕРЕР =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ===== СВЕТ =====
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// ===== ПОЛ =====
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ===== СТЕНЫ =====
function createWall(x, z, rotY) {
    const geometry = new THREE.BoxGeometry(20, 3, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, 1.5, z);
    wall.rotation.y = rotY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
}

// 4 стены вокруг комнаты
createWall(0, -10, 0);          // задняя
createWall(0, 10, 0);           // передняя
createWall(-10, 0, Math.PI / 2); // левая
createWall(10, 0, Math.PI / 2);  // правая

// ===== ПЕРСОНАЖ (заглушка — куб) =====
const playerGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x7ee787 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 0.8, 0);
player.castShadow = true;
scene.add(player);

// ===== ЖУК (заглушка — красный шар) =====
const bugGeometry = new THREE.SphereGeometry(0.4, 16, 16);
const bugMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
const bug = new THREE.Mesh(bugGeometry, bugMaterial);
bug.position.set(3, 0.4, -3);
bug.castShadow = true;
scene.add(bug);

// ===== УПРАВЛЕНИЕ =====
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ===== КАМЕРА СЛЕДУЕТ ЗА ПЕРСОНАЖЕМ =====
const cameraOffset = new THREE.Vector3(0, 4, 6);

function updateCamera() {
    const targetX = player.position.x + cameraOffset.x;
    const targetY = player.position.y + cameraOffset.y;
    const targetZ = player.position.z + cameraOffset.z;

    camera.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ),
        0.1
    );
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}

// ===== ДВИЖЕНИЕ =====
const speed = 0.1;

function updatePlayer() {
    if (keys['w'] || keys['arrowup']) player.position.z -= speed;
    if (keys['s'] || keys['arrowdown']) player.position.z += speed;
    if (keys['a'] || keys['arrowleft']) player.position.x -= speed;
    if (keys['d'] || keys['arrowright']) player.position.x += speed;

    // Границы комнаты
    player.position.x = Math.max(-9, Math.min(9, player.position.x));
    player.position.z = Math.max(-9, Math.min(9, player.position.z));
}

// ===== АНИМАЦИЯ =====
function animate() {
    requestAnimationFrame(animate);

    updatePlayer();
    updateCamera();

    renderer.render(scene, camera);
}

animate();

// ===== РАЗМЕР ОКНА =====
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});