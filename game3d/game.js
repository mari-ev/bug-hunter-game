import * as THREE from 'three';

// ===== СЦЕНА =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

// ===== КАМЕРА =====
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// ===== РЕНДЕРЕР =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ===== СВЕТ =====
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
// ИСПРАВЛЕНО ТУТ:
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// ===== МАТЕРИАЛЫ =====
const wallInnerMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.7 });
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });

const laptopBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const laptopScreenMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });

const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });

// ===== МАССИВЫ =====
const walls = [];
const doors = [];

// ===== БАЗОВЫЕ ФУНКЦИИ =====

function createWall(x, z, width, depth) {
    const geometry = new THREE.BoxGeometry(width, 3, depth);
    const wall = new THREE.Mesh(geometry, wallInnerMaterial);
    wall.position.set(x, 1.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    walls.push({ x, z, width, depth });
}

// СДВИЖНАЯ ДВЕРЬ
function createSlidingDoor(x, z, width, height, depth, rotY = 0) {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const door = new THREE.Mesh(geometry, doorMaterial);
    door.castShadow = true;
    door.receiveShadow = true;
    group.add(door);

    group.position.set(x, height / 2, z);
    group.rotation.y = rotY;
    scene.add(group);

    doors.push({
        group: group,
        startX: x,
        startZ: z,
        width: width,
        rotY: rotY,
        openAmount: 0,
        isHorizontal: rotY === 0
    });
}

function createLaptop(x, z, rotY = 0) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), laptopBodyMaterial);
    base.position.y = 1.06; group.add(base);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.02), laptopBodyMaterial);
    screen.position.set(0, 1.18, -0.14); screen.rotation.x = -0.3; group.add(screen);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.21), laptopScreenMaterial);
    display.position.set(0, 1.18, -0.13); display.rotation.x = -0.3; group.add(display);
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

function createTable(x, z, rotY = 0) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), woodMaterial);
    top.position.y = 1; top.castShadow = true; top.receiveShadow = true; group.add(top);
    const legPositions = [[-0.9, 0, -0.4], [0.9, 0, -0.4], [-0.9, 0, 0.4], [0.9, 0, 0.4]];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), darkMaterial);
        leg.position.set(lx, 0.5, lz); leg.castShadow = true; group.add(leg);
    });
    group.position.set(x, 0, z); group.rotation.y = rotY;
    scene.add(group);
    
    // Коллизия для стола
    if (rotY === 0) walls.push({ x, z, width: 2, depth: 1 });
    else walls.push({ x, z, width: 1, depth: 2 });
}

function createChair(x, z, rotY = 0) {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    seat.position.y = 0.5; seat.castShadow = true; group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    back.position.set(0, 0.9, -0.3); back.castShadow = true; group.add(back);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x666666 }));
    leg.position.y = 0.25; group.add(leg);
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0x666666 }));
        spoke.position.set(Math.cos(angle) * 0.2, 0.07, Math.sin(angle) * 0.2);
        spoke.rotation.y = -angle; group.add(spoke);
    }
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

function createCooler(x, z) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 16), metalMaterial);
    base.position.y = 0.5; base.castShadow = true; group.add(base);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16), waterMaterial);
    bottle.position.y = 1.3; bottle.castShadow = true; group.add(bottle);
    group.position.set(x, 0, z); scene.add(group); walls.push({ x, z, width: 0.6, depth: 0.6 });
}

function createPlant(x, z) {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.6, 8), potMaterial);
    pot.position.y = 0.3; pot.castShadow = true; pot.receiveShadow = true; group.add(pot);
    const leafPositions = [ { x: 0, y: 1.2, z: 0 }, { x: 0.3, y: 1.0, z: 0.2 }, { x: -0.3, y: 1.1, z: -0.2 }, { x: 0.2, y: 1.4, z: -0.2 }, { x: -0.2, y: 1.5, z: 0.2 } ];
    leafPositions.forEach(pos => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), leafMaterial);
        leaf.position.set(pos.x, pos.y, pos.z); leaf.castShadow = true; group.add(leaf);
    });
    group.position.set(x, 0, z); scene.add(group); walls.push({ x, z, width: 0.6, depth: 0.6 });
}

// ===== ПОЛ =====
const floorGeometry = new THREE.PlaneGeometry(65, 65);
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(32.5, 0, 32.5);
floor.receiveShadow = true;
scene.add(floor);



// =====================================================================
// ===== КОМНАТА 1: ОФИС №1 =====
// =====================================================================

const office1_X1 = 3;
const office1_X2 = 18;
const office1_Z1 = 0;
const office1_Z2 = 8;
const wallThickness = 0.5;

createWall((office1_X1 + office1_X2) / 2, office1_Z1, office1_X2 - office1_X1, wallThickness); // Верхняя
createWall(office1_X1, (office1_Z1 + office1_Z2) / 2, wallThickness, office1_Z2 - office1_Z1); // Левая
createWall(office1_X2, (office1_Z1 + office1_Z2) / 2, wallThickness, office1_Z2 - office1_Z1); // Правая

// НИЖНЯЯ СТЕНА (с проёмом для двери от X=10 до X=12 на Z=8)
createWall(6.5, office1_Z2, 7, wallThickness);  // Левая часть
createWall(15, office1_Z2, 6, wallThickness);   // Правая часть

// САМА ДВЕРЬ (сдвижная)
createSlidingDoor(11, 8, 2, 3, 0.2);

// ===== РАССТАНОВКА СТОЛОВ (Строго по твоим координатам) =====

// --- ЛЕВАЯ ГРУППА ---
// Верхний ряд (спинка к спинке, у самой стены Z=0)
createTable(7, 1, Math.PI / 2); 
createLaptop(7, 1, Math.PI / 2);
createTable(8, 1, Math.PI / 2); 
createLaptop(8, 1, Math.PI / 2);

// Средний ряд (спинка к спинке, Z=2)
createTable(7, 3, Math.PI / 2); 
createLaptop(7, 3, Math.PI / 2);
createTable(8, 3, Math.PI / 2); 
createLaptop(8, 3, Math.PI / 2);

// Нижний горизонтальный стол (Z=5)
createTable(7.5, 5); 
createLaptop(7.5, 5);

// Стулья вокруг левой группы (5 кружочков)
createChair(6, 1, Math.PI / 2);
createChair(6, 3, Math.PI / 2);
createChair(9, 1, -Math.PI / 2);
createChair(9, 3, -Math.PI / 2);
createChair(7.5, 6, 0);


// --- ПРАВАЯ ГРУППА ---
// Верхний ряд (спинка к спинке, у самой стены Z=0)
createTable(13, 1, Math.PI / 2); 
createLaptop(13, 1, Math.PI / 2);
createTable(14, 1, Math.PI / 2); 
createLaptop(14, 1, Math.PI / 2);

// Средний ряд (спинка к спинке, Z=2)
createTable(13, 3, Math.PI / 2); 
createLaptop(13, 3, Math.PI / 2);
createTable(14, 3, Math.PI / 2); 
createLaptop(14, 3, Math.PI / 2);

// Нижний горизонтальный стол (Z=5)
createTable(13.5, 5); 
createLaptop(13.5, 5);

// Стулья вокруг правой группы (5 кружочков)
createChair(12, 1, Math.PI / 2);
createChair(12, 3, Math.PI / 2);
createChair(15, 1, -Math.PI / 2);
createChair(15, 3, -Math.PI / 2);
createChair(13.5, 6, 0);

// Кулер и Цветок
createCooler(4, 1);
createPlant(17, 7);

// =====================================================================
// ===== КОНЕЦ КОМНАТЫ 1 =====
// =====================================================================


// ===== ПЕРСОНАЖ =====
const playerTexture = new THREE.TextureLoader().load('assets/player.png');
const playerGeometry = new THREE.PlaneGeometry(2, 2.4);
const playerMaterial = new THREE.MeshBasicMaterial({ map: playerTexture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(5, 1.2, 4);
scene.add(player);

// ===== УПРАВЛЕНИЕ =====
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetPosition = new THREE.Vector3(player.position.x, 1.2, player.position.z);
let hasTarget = false;

renderer.domElement.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
        const point = intersects[0].point;
        targetPosition.set(point.x, 1.2, point.z);
        hasTarget = true;
    }
});

// ===== КОЛЛИЗИИ =====
function canMoveTo(x, z) {
    const radius = 0.5;
    for (const wall of walls) {
        const halfW = wall.width / 2 + radius;
        const halfD = wall.depth / 2 + radius;
        if (Math.abs(x - wall.x) < halfW && Math.abs(z - wall.z) < halfD) {
            return false;
        }
    }
    return true;
}

// ===== ЛОГИКА ДВЕРЕЙ =====
function updateDoors() {
    const triggerDist = 3;

    doors.forEach(door => {
        const dx = player.position.x - door.group.position.x;
        const dz = player.position.z - door.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        const targetAmount = dist < triggerDist ? 1 : 0;
        door.openAmount += (targetAmount - door.openAmount) * 0.1;

        if (door.isHorizontal) {
            door.group.position.x = door.startX + (door.openAmount * door.width);
        } else {
            door.group.position.z = door.startZ + (door.openAmount * door.width);
        }
    });
}

// ===== ДВИЖЕНИЕ И КАМЕРА =====
const speed = 0.1;
const cameraOffset = new THREE.Vector3(0, 6, 8);

function updatePlayer() {
    let newX = player.position.x;
    let newZ = player.position.z;
    let moved = false;

    if (keys['w'] || keys['arrowup']) { newZ -= speed; moved = true; }
    if (keys['s'] || keys['arrowdown']) { newZ += speed; moved = true; }
    if (keys['a'] || keys['arrowleft']) { newX -= speed; moved = true; }
    if (keys['d'] || keys['arrowright']) { newX += speed; moved = true; }

    if (!moved && hasTarget) {
        const dx = targetPosition.x - player.position.x;
        const dz = targetPosition.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.1) {
            newX += (dx / dist) * speed;
            newZ += (dz / dist) * speed;
        } else {
            hasTarget = false;
        }
    }

    if (canMoveTo(newX, player.position.z)) player.position.x = newX;
    if (canMoveTo(player.position.x, newZ)) player.position.z = newZ;

    player.lookAt(camera.position.x, player.position.y, camera.position.z);
    player.rotation.x = 0;
    player.rotation.z = 0;
}

function updateCamera() {
    camera.position.lerp(
        new THREE.Vector3(
            player.position.x + cameraOffset.x,
            player.position.y + cameraOffset.y,
            player.position.z + cameraOffset.z
        ),
        0.05
    );
    camera.lookAt(player.position.x, player.position.y, player.position.z);
}

// ===== ЦИКЛ =====
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    updateDoors();
    updateCamera();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});