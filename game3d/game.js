import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

// ===== СЦЕНА =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

// ===== КАМЕРА =====
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraAngle = 0; 
let cameraDistance = 9; 
let cameraHeight = 4.5; 

// ===== РЕНДЕРЕР =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ===== СВЕТ (Базовый) =====
const ambientLight = new THREE.AmbientLight(0x333333, 1.5); 
scene.add(ambientLight);

// ===== ТЕКСТУРА ЭКРАНА =====
function createErrorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000'; 
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff'; 
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.textAlign = 'center'; 
    ctx.fillText('ERROR', 128, 100); 
    ctx.fillText('404', 128, 150);
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('BUG FOUND', 128, 200);
    return new THREE.CanvasTexture(canvas);
}

// ===== МАТЕРИАЛЫ =====
const wallInnerMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.7 });
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });
const laptopBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

const laptopScreenMaterial = new THREE.MeshStandardMaterial({ 
    map: createErrorTexture(), 
    emissive: 0xff0000, 
    emissiveIntensity: 1.5 
});

const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0xcccccc, emissiveIntensity: 0.8 });

// ===== МАССИВЫ =====
const walls = [];
const doors = [];
const flickerLights = []; 

// ===== ФУНКЦИИ =====
function createWall(x, z, width, depth) {
    const geometry = new THREE.BoxGeometry(width, 3, depth);
    const wall = new THREE.Mesh(geometry, wallInnerMaterial);
    wall.position.set(x, 1.5, z);
    wall.castShadow = false; 
    wall.receiveShadow = true;
    scene.add(wall);
    walls.push({ x, z, width, depth });
}

function createSlidingDoor(x, z, width, height, depth, rotY = 0) {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const door = new THREE.Mesh(geometry, doorMaterial);
    door.castShadow = true; door.receiveShadow = true;
    group.add(door);
    group.position.set(x, height / 2, z);
    group.rotation.y = rotY;
    scene.add(group);
    doors.push({ 
        group, 
        startX: x, 
        startZ: z, 
        width, 
        rotY, 
        openAmount: 0, 
        isHorizontal: rotY === 0 
    });
}

function createLamp(x, z) {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.2), lampMaterial);
    tube.position.set(x, 2.9, z); 
    scene.add(tube);

    const light = new THREE.PointLight(0xaaccff, 3, 15); 
    light.position.set(x, 2.7, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    scene.add(light);

    flickerLights.push({
        light: light,
        baseIntensity: 3, 
        flickerSpeed: 0.05 + Math.random() * 0.05, 
        offset: Math.random() * 100
    });
}

function createWhiteboard(x, z, rotY = 0) {
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.1), boardMaterial);
    board.position.set(0, 1.5, 0);
    group.add(board);
    const boardLight = new THREE.PointLight(0xffffff, 2, 8);
    boardLight.position.set(0, 1.5, 0.5); 
    boardLight.castShadow = true;
    group.add(boardLight);
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);
}

function createCeilingPanel(x, z) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 1.2), lampMaterial);
    panel.position.set(x, 2.95, z); 
    scene.add(panel);

    const light = new THREE.PointLight(0xeeeeff, 2.5, 12); 
    light.position.set(x, 2.8, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    scene.add(light);

    flickerLights.push({
        light: light,
        baseIntensity: 2.5, 
        flickerSpeed: 0.04 + Math.random() * 0.04, 
        offset: Math.random() * 100
    });
}

function createLaptop(x, z, rotY = 0) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), laptopBodyMaterial);
    base.position.set(0, 1.06, 0); group.add(base);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.02), laptopBodyMaterial);
    screen.position.set(0, 1.18, 0.14); screen.rotation.x = 0.3; group.add(screen);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.21), laptopScreenMaterial);
    display.position.set(0, 1.18, 0.13); display.rotation.x = 0.3; group.add(display);
    const screenLight = new THREE.RectAreaLight(0xff0000, 3, 0.36, 0.21); 
    screenLight.position.set(0, 1.18, 0.15); screenLight.rotation.x = 0.3; screenLight.lookAt(0, 0, 0); group.add(screenLight);
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
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        wheel.position.set(Math.cos(angle) * 0.35, 0.08, Math.sin(angle) * 0.35);
        wheel.rotation.z = Math.PI / 2; wheel.rotation.y = -angle; wheel.castShadow = true; group.add(wheel);
    }
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

function createCooler(x, z) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16), metalMaterial);
    base.position.y = 0.4; base.castShadow = true; group.add(base);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), waterMaterial);
    bottle.position.y = 1.05; bottle.castShadow = true; group.add(bottle);
    group.position.set(x, 0, z); scene.add(group); walls.push({ x, z, width: 0.5, depth: 0.5 });
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

function createConferenceTable(x, z) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 6), woodMaterial);
    top.position.y = 1; top.castShadow = true; top.receiveShadow = true; group.add(top);
    const legPositions = [[-0.8, 0, -2.8], [0.8, 0, -2.8], [-0.8, 0, 2.8], [0.8, 0, 2.8]];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMaterial);
        leg.position.set(lx, 0.5, lz); leg.castShadow = true; group.add(leg);
    });
    group.position.set(x, 0, z);
    scene.add(group);
    walls.push({ x, z, width: 2, depth: 6 });
}

function createTVOnStand(x, z, rotY = 0) {
    const group = new THREE.Group();
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.1), laptopScreenMaterial);
    screen.position.y = 1.8; screen.castShadow = true; group.add(screen);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), metalMaterial);
    pole.position.y = 0.6; pole.castShadow = true; group.add(pole);
    for(let i=0; i<4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.15), darkMaterial);
        leg.position.y = 0.05;
        leg.rotation.y = (i * Math.PI / 2);
        leg.castShadow = true;
        group.add(leg);
    }
    group.position.set(x, 0, z);
    group.rotation.y = rotY; 
    scene.add(group);
    walls.push({ x, z, width: 1.5, depth: 1.5 });
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
const wallThickness = 0.2; 

createWall((office1_X1 + office1_X2) / 2, office1_Z1, office1_X2 - office1_X1, wallThickness); 
createWall(office1_X1, (office1_Z1 + office1_Z2) / 2, wallThickness, office1_Z2 - office1_Z1); 
createWall(office1_X2, (office1_Z1 + office1_Z2) / 2, wallThickness, office1_Z2 - office1_Z1); 
createWall(6.5, office1_Z2, 7, wallThickness);  
createWall(15, office1_Z2, 6, wallThickness);   
createSlidingDoor(11, 8, 2, 3, 0.2);

createTable(7, 1, Math.PI / 2); createLaptop(7, 1, Math.PI / 2); 
createTable(8, 1, Math.PI / 2); createLaptop(8, 1, -Math.PI / 2); 
createTable(7, 3, Math.PI / 2); createLaptop(7, 3, Math.PI / 2);
createTable(8, 3, Math.PI / 2); createLaptop(8, 3, -Math.PI / 2);
createTable(7.5, 5); createLaptop(7.5, 5, Math.PI); 
createChair(6, 1, Math.PI / 2); createChair(6, 3, Math.PI / 2); createChair(9, 1, -Math.PI / 2); createChair(9, 3, -Math.PI / 2); createChair(7.5, 6, Math.PI); 
createTable(13, 1, Math.PI / 2); createLaptop(13, 1, Math.PI / 2);
createTable(14, 1, Math.PI / 2); createLaptop(14, 1, -Math.PI / 2);
createTable(13, 3, Math.PI / 2); createLaptop(13, 3, Math.PI / 2);
createTable(14, 3, Math.PI / 2); createLaptop(14, 3, -Math.PI / 2);
createTable(13.5, 5); createLaptop(13.5, 5, Math.PI);
createChair(12, 1, Math.PI / 2); createChair(12, 3, Math.PI / 2); createChair(15, 1, -Math.PI / 2); createChair(15, 3, -Math.PI / 2); createChair(13.5, 6, Math.PI);
createCooler(4, 1);
createPlant(17, 7);
createLamp(7, 3);   
createLamp(13, 3);  
// =====================================================================
// ===== КОНЕЦ КОМНАТЫ 1 =====
// =====================================================================


// =====================================================================
// ===== КОМНАТА 2: ПЕРЕГОВОРКА =====
// =====================================================================
const conf_X1 = 18;
const conf_X2 = 30;
const conf_Z1 = 0;
const conf_Z2 = 8;

createWall((conf_X1 + conf_X2) / 2, conf_Z1, conf_X2 - conf_X1, wallThickness); 
createWall(conf_X2, (conf_Z1 + conf_Z2) / 2, wallThickness, conf_Z2 - conf_Z1); 
createWall(conf_X1, (conf_Z1 + conf_Z2) / 2, wallThickness, conf_Z2 - conf_Z1); 

createCooler(19, 7);
createWall(21.5, conf_Z2, 5, wallThickness); 
createWall(28, conf_Z2, 4, wallThickness);   
createSlidingDoor(23, conf_Z2, 2, 3, 0.2); 

// СТОЛ НА КООРДИНАТАХ X=26 (от 25 до 27)
createConferenceTable(26, 4);

// Стулья слева (смотрят вправо)
createChair(24.5, 2, -Math.PI / 2); 
createChair(24.5, 4, -Math.PI / 2); 
createChair(24.5, 6, -Math.PI / 2);

// Стулья справа (смотрят влево)
createChair(27.5, 2, Math.PI / 2); 
createChair(27.5, 4, Math.PI / 2); 
createChair(27.5, 6, Math.PI / 2);

createTVOnStand(21, 2, Math.PI / 4); 
createWhiteboard(18.1, 4, Math.PI / 2);

// ИСПРАВЛЕННЫЕ ЛАМПЫ:
createLamp(26, 4); // Ровно по центру стола
createLamp(22, 2); // Над ТВ и доской

// =====================================================================
// ===== КОНЕЦ КОМНАТЫ 2 =====
// =====================================================================


// =====================================================================
// ===== КОРИДОР =====
// =====================================================================
createCeilingPanel(8, 9.5);   
createCeilingPanel(12, 9.5);  
createCeilingPanel(16, 9.5);  
createCeilingPanel(20, 9.5);  
createCeilingPanel(24, 9.5);  
createCeilingPanel(28, 9.5);  
// =====================================================================


// ===== ПЕРСОНАЖ =====
const playerTexture = new THREE.TextureLoader().load('assets/player.png');
const playerGeometry = new THREE.PlaneGeometry(1.6, 2.0); 
const playerMaterial = new THREE.MeshBasicMaterial({ map: playerTexture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(5, 1.0, 4);
scene.add(player);

// ===== УПРАВЛЕНИЕ =====
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetPosition = new THREE.Vector3(player.position.x, 1.0, player.position.z);
let hasTarget = false;

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 0) { isDragging = true; previousMousePosition = { x: e.offsetX, y: e.offsetY }; }
});
renderer.domElement.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaX = e.offsetX - previousMousePosition.x;
        cameraAngle -= deltaX * 0.01; 
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    }
});
renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });

renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { isDragging = true; previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
}, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        cameraAngle -= deltaX * 0.01;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => { isDragging = false; });

renderer.domElement.addEventListener('click', (e) => {
    if (isDragging) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
        const point = intersects[0].point;
        targetPosition.set(point.x, 1.0, point.z);
        hasTarget = true;
    }
});

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

let doorTimer = 0;
function updateDoors() {
    const triggerDist = 4; 
    doors.forEach(door => {
        const dx = player.position.x - door.group.position.x;
        const dz = player.position.z - door.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        const targetAmount = dist < triggerDist ? 1 : 0;
        door.openAmount += (targetAmount - door.openAmount) * 0.08;
        
        if (Math.abs(targetAmount - door.openAmount) > 0.01) {
            if (door.isHorizontal) {
                door.group.position.x = door.startX + (door.openAmount * door.width);
            } else {
                door.group.position.z = door.startZ + (door.openAmount * door.width);
            }
        }
    });
}

const speed = 0.1;

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
    const targetCamX = player.position.x + Math.sin(cameraAngle) * cameraDistance;
    const targetCamZ = player.position.z + Math.cos(cameraAngle) * cameraDistance;
    camera.position.lerp(new THREE.Vector3(targetCamX, player.position.y + cameraHeight, targetCamZ), 0.1);
    camera.lookAt(player.position.x, player.position.y + 0.6, player.position.z);
}

let time = 0;
function updateLamps() {
    time += 0.05; 
    flickerLights.forEach(l => {
        const noise = Math.sin(time * l.flickerSpeed + l.offset) * Math.cos(time * l.flickerSpeed * 2.3 + l.offset);
        if (noise > 0.3) {
            l.light.intensity = l.baseIntensity + 1; 
        } else if (noise < -0.3) {
            l.light.intensity = 0.5; 
        } else {
            l.light.intensity = l.baseIntensity;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    updateDoors();
    updateCamera();
    updateLamps(); 
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});