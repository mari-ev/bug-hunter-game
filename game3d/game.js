/* =====================================================================
   1. ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКА THREE.JS
   ===================================================================== */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

// Сцена (тёмный фон)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

// Камера (вид от третьего лица)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraAngle = 0; 
let cameraDistance = 9; 
let cameraHeight = 4.5; 

// Рендерер (отрисовка графики)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Базовый рассеянный свет (чтобы тьма была не абсолютной)
const ambientLight = new THREE.AmbientLight(0x333333, 1.5); 
scene.add(ambientLight);

/* =====================================================================
   2. ТЕКСТУРЫ И МАТЕРИАЛЫ
   ===================================================================== */
// Генерация текстуры экрана с ошибкой 404
const errorCanvas = document.createElement('canvas');
errorCanvas.width = 256; errorCanvas.height = 256;
const eCtx = errorCanvas.getContext('2d');
eCtx.fillStyle = '#ff0000'; eCtx.fillRect(0, 0, 256, 256);
eCtx.fillStyle = '#ffffff'; eCtx.font = 'bold 40px "Courier New", monospace';
eCtx.textAlign = 'center'; eCtx.fillText('ERROR', 128, 100); eCtx.fillText('404', 128, 150);
eCtx.font = '16px "Courier New", monospace'; eCtx.fillText('BUG FOUND', 128, 200);
const screenTexture = new THREE.CanvasTexture(errorCanvas);

// Базовые материалы для комнат и мебели
const wallInnerMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const wireMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 }); 
const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.7 });
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });

// Материалы для техники и мебели
const laptopBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 }); 
const tvBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const standMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
const sofaMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000 }); 
const laptopScreenMaterial = new THREE.MeshStandardMaterial({ map: screenTexture, emissive: 0xff0000, emissiveIntensity: 2.5, side: THREE.DoubleSide });

// Декор
const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0xcccccc, emissiveIntensity: 0.8 });

/* =====================================================================
   3. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (Массивы объектов)
   ===================================================================== */
const walls = [];       // Массив стен (для коллизий)
const doors = [];       // Массив дверей (для анимации открытия)
const allLamps = [];    // Массив всех ламп (для умного включения света)

/* =====================================================================
   4. ФУНКЦИИ: СТЕНЫ И ДВЕРИ
   ===================================================================== */
function createWall(x, z, width, depth) {
    const geometry = new THREE.BoxGeometry(width, 3, depth);
    const wall = new THREE.Mesh(geometry, wallInnerMaterial);
    wall.position.set(x, 1.5, z);
    wall.castShadow = false; wall.receiveShadow = true;
    scene.add(wall); walls.push({ x, z, width, depth });
}

function createSlidingDoor(x, z, width, height, depth, rotY = 0) {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const door = new THREE.Mesh(geometry, doorMaterial);
    door.castShadow = true; door.receiveShadow = true; group.add(door);
    group.position.set(x, height / 2, z); group.rotation.y = rotY; scene.add(group);
    doors.push({ group, startX: x, startZ: z, width, rotY, openAmount: 0, isHorizontal: rotY === 0 });
    return group;
}

/* =====================================================================
   5. ФУНКЦИИ: ЛАМПЫ (Для умного света)
   ===================================================================== */
// Длинная офисная лампа
function createLamp(x, z) {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.2), lampMaterial);
    tube.position.set(x, 2.9, z); scene.add(tube);
    
    const light = new THREE.PointLight(0xaaccff, 0, 15); 
    light.position.set(x, 2.7, z); light.castShadow = false; 
    scene.add(light);
    
    // Добавляем в глобальный массив (intensity = 0, включится только рядом с игроком)
    allLamps.push({ light: light, tube: tube, x: x, z: z, baseIntensity: 3 });
}

// Лофтовая подвесная лампа
function createLoftLamp(x, z) {
    const group = new THREE.Group();
    // Провод стал еще короче (0.5 метра)
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), wireMaterial);
    wire.position.set(x, 2.75, z); group.add(wire);
    
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 16), darkMaterial);
    shade.position.set(x, 2.5, z); shade.castShadow = true; group.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), lampMaterial);
    bulb.position.set(x, 2.35, z); group.add(bulb);
    
    const light = new THREE.PointLight(0xffccaa, 0, 12); 
    light.position.set(x, 2.3, z); light.castShadow = false; 
    group.add(light);
    
    scene.add(group);
    allLamps.push({ light: light, tube: shade, x: x, z: z, baseIntensity: 2.5 });
}

// Квадратная LED панель (в коридоре)
function createCeilingPanel(x, z) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 1.2), lampMaterial);
    panel.position.set(x, 2.95, z); scene.add(panel);
    
    const light = new THREE.PointLight(0xeeeeff, 0, 12); 
    light.position.set(x, 2.8, z); light.castShadow = false; 
    scene.add(light);
    
    allLamps.push({ light: light, tube: panel, x: x, z: z, baseIntensity: 2.5 });
}

// Маркерная доска (со своим светом)
function createWhiteboard(x, z, rotY = 0) {
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.1), boardMaterial);
    board.position.set(0, 1.5, 0); group.add(board);
    const boardLight = new THREE.PointLight(0xffffff, 2, 8);
    boardLight.position.set(0, 1.5, 0.5); boardLight.castShadow = false; 
    group.add(boardLight);
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

/* =====================================================================
   6. ФУНКЦИИ: МЕБЕЛЬ И ТЕХНИКА
   ===================================================================== */
// Ноутбук с ошибкой 404
function createLaptop(x, z, rotY = 0) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), laptopBodyMaterial);
    base.position.set(0, 1.06, 0); group.add(base);
    const screenBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.02), laptopBodyMaterial);
    screenBack.position.set(0, 1.18, 0.13); screenBack.rotation.x = 0.3; group.add(screenBack);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.21), laptopScreenMaterial);
    display.position.set(0, 1.18, 0.11); display.rotation.x = 0.3; group.add(display);
    
    // Красный свет от экрана
    const screenLight = new THREE.RectAreaLight(0xff0000, 2, 0.36, 0.21); 
    screenLight.position.set(0, 1.18, 0.1); screenLight.rotation.x = 0.3; group.add(screenLight);
    
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

// Обычный офисный стол
function createTable(x, z, rotY = 0) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), woodMaterial);
    top.position.y = 1; top.castShadow = true; top.receiveShadow = true; group.add(top);
    const legPositions = [[-0.9, 0, -0.4], [0.9, 0, -0.4], [-0.9, 0, 0.4], [0.9, 0, 0.4]];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), darkMaterial);
        leg.position.set(lx, 0.5, lz); leg.castShadow = true; group.add(leg);
    });
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
    // Коллизия стола (в зависимости от поворота)
    if (rotY === 0) walls.push({ x, z, width: 2, depth: 1 });
    else walls.push({ x, z, width: 1, depth: 2 });
}

// Офисный стул на колёсиках
function createChair(x, z, rotY = 0) {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    seat.position.y = 0.5; seat.castShadow = true; group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    back.position.set(0, 0.9, -0.3); back.castShadow = true; group.add(back);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x666666 }));
    leg.position.y = 0.25; group.add(leg);
    // Колёсики
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0x666666 }));
        spoke.position.set(Math.cos(angle) * 0.2, 0.07, Math.sin(angle) * 0.2); spoke.rotation.y = -angle; group.add(spoke);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        wheel.position.set(Math.cos(angle) * 0.35, 0.08, Math.sin(angle) * 0.35); wheel.rotation.z = Math.PI / 2; wheel.rotation.y = -angle; wheel.castShadow = true; group.add(wheel);
    }
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

// Автомат со снеками
function createSnackMachine(x, z, rotY = 0) {
    const group = new THREE.Group();
    
    // Корпус автомата
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshStandardMaterial({ color: 0x8b0000 })); // Темно-красный
    body.position.y = 1; body.castShadow = true; body.receiveShadow = true; group.add(body);
    
    // Стекло (витрина)
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 }));
    glass.position.set(0, 1.2, 0.42); group.add(glass);
    
    // Внутренняя подсветка витрины
    const light = new THREE.PointLight(0xffffff, 1.5, 3);
    light.position.set(0, 1.2, 0.5); group.add(light);
    
    // Панель управления (справа)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    panel.position.set(0.45, 1.2, 0.43); group.add(panel);
    
    // Кнопки
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 });
    for(let i=0; i<3; i++) {
        const btn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), btnMat);
        btn.position.set(0.45, 1.4 - i*0.2, 0.45); group.add(btn);
    }
    
    // Полка с снеками (просто цветные кубики внутри)
    const snackColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const snack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: snackColors[(i+j)%5] }));
            snack.position.set(-0.3 + i*0.25, 0.7 + j*0.4, 0.35); group.add(snack);
        }
    }

    group.position.set(x, 0, z); 
    group.rotation.y = rotY; 
    scene.add(group); 
    
    // Коллизия (чтобы игрок не проходил сквозь него)
    if (rotY === 0) walls.push({ x, z, width: 1.2, depth: 0.8 });
    else walls.push({ x, z, width: 0.8, depth: 1.2 });
}

// Картонная коробка (для склада/каморки)
function createBox(x, z, sizeX = 0.8, sizeY = 0.8, sizeZ = 0.8, rotY = 0) {
    const group = new THREE.Group();
    
    // Материал картона
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.9 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.5 });
    
    // Основа коробки
    const box = new THREE.Mesh(new THREE.BoxGeometry(sizeX, sizeY, sizeZ), boxMat);
    box.position.y = sizeY / 2; 
    box.castShadow = true; box.receiveShadow = true; 
    group.add(box);
    
    // Скотч (полоска сверху)
    const tape = new THREE.Mesh(new THREE.BoxGeometry(sizeX * 1.01, 0.01, sizeZ * 0.2), tapeMat);
    tape.position.y = sizeY + 0.005; 
    group.add(tape);
    
    // Вторая полоска скотча (крест-накрест)
    const tape2 = new THREE.Mesh(new THREE.BoxGeometry(sizeX * 0.2, 0.01, sizeZ * 1.01), tapeMat);
    tape2.position.y = sizeY + 0.006; 
    group.add(tape2);

    group.position.set(x, 0, z); 
    group.rotation.y = rotY; 
    scene.add(group); 
    
    // Коллизия (чтобы игрок не проходил сквозь коробку)
    walls.push({ x, z, width: sizeX, depth: sizeZ });
}

// Кулер с водой
function createCooler(x, z) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16), metalMaterial);
    base.position.y = 0.4; base.castShadow = true; group.add(base);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), waterMaterial);
    bottle.position.y = 1.05; bottle.castShadow = true; group.add(bottle);
    group.position.set(x, 0, z); scene.add(group); walls.push({ x, z, width: 0.5, depth: 0.5 });
}

// Цветок в горшке
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

// Большой стол для переговорки
function createConferenceTable(x, z) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 6), woodMaterial);
    top.position.y = 1; top.castShadow = true; top.receiveShadow = true; group.add(top);
    const legPositions = [[-0.8, 0, -2.8], [0.8, 0, -2.8], [-0.8, 0, 2.8], [0.8, 0, 2.8]];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMaterial);
        leg.position.set(lx, 0.5, lz); leg.castShadow = true; group.add(leg);
    });
    group.position.set(x, 0, z); scene.add(group); walls.push({ x, z, width: 2, depth: 6 });
}

// Телевизор на ножке
function createTVOnStand(x, z, rotY = 0) {
    const group = new THREE.Group();
    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.15), tvBodyMaterial);
    tvBody.position.y = 1.8; tvBody.castShadow = true; group.add(tvBody);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), laptopScreenMaterial);
    screen.position.set(0, 1.8, 0.08); group.add(screen);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), standMaterial);
    pole.position.y = 0.6; pole.castShadow = true; group.add(pole);
    for(let i=0; i<4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.15), standMaterial);
        leg.position.y = 0.05; leg.rotation.y = (i * Math.PI / 2); leg.castShadow = true; group.add(leg);
    }
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group); walls.push({ x, z, width: 1.5, depth: 1.5 });
}

// Диван
function createSofa(x, z, rotY = 0) {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1), sofaMaterial);
    seat.position.y = 0.4; seat.castShadow = true; seat.receiveShadow = true; group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.2), sofaMaterial);
    back.position.set(0, 0.8, -0.4); back.castShadow = true; group.add(back);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1), sofaMaterial);
    armL.position.set(-1.4, 0.6, 0); armL.castShadow = true; group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1), sofaMaterial);
    armR.position.set(1.4, 0.6, 0); armR.castShadow = true; group.add(armR);
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
    if (rotY === 0) walls.push({ x, z, width: 3, depth: 1 });
    else walls.push({ x, z, width: 1, depth: 3 });
}

// Кофейный столик
function createCoffeeTable(x, z) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), woodMaterial);
    top.position.y = 0.5; top.castShadow = true; top.receiveShadow = true; group.add(top);
    const legPositions = [[-0.4, 0, -0.4], [0.4, 0, -0.4], [-0.4, 0, 0.4], [0.4, 0, 0.4]];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), darkMaterial);
        leg.position.set(lx, 0.25, lz); leg.castShadow = true; group.add(leg);
    });
    group.position.set(x, 0, z); scene.add(group); walls.push({ x, z, width: 1, depth: 1 });
}

// Лестница (пока просто декор)
function createStairs(x, z) {
    const group = new THREE.Group();
    const steps = 5; // 5 ступенек
    
    for (let i = 0; i < steps; i++) {
        // Ширина 1м, высота 0.2м, глубина 2м
        const step = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 2), darkMaterial);
        // Сдвигаем вправо (по X) и вверх (по Y)
        step.position.set(i * 1, 0.1 + i * 0.2, 0); 
        step.castShadow = true; 
        step.receiveShadow = true;
        group.add(step);
    }
    
    group.position.set(x, 0, z); 
    scene.add(group);
    
    // Коллизия: центр лестницы сдвинут на половину ширины (2.5) и глубины (1)
    walls.push({ x: x + 2.5, z: z + 1, width: 5, depth: 2 }); 
}

/* =====================================================================
   7. СБОРКА ИГРОВОГО МИРА (УРОВНИ)
   ===================================================================== */
const floorGeometry = new THREE.PlaneGeometry(65, 65);
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(32.5, 0, 32.5);
floor.receiveShadow = true;
scene.add(floor);

// --- КОМНАТА 1: ОФИС №1 ---
const office1_X1 = 3; const office1_X2 = 18; const office1_Z1 = 0; const office1_Z2 = 8; const wallThickness = 0.2; 
createWall((office1_X1 + office1_X2) / 2, office1_Z1, office1_X2 - office1_X1, wallThickness); createWall(office1_X1, (office1_Z1 + office1_Z2) / 2, wallThickness, office1_Z2 - office1_Z1); createWall(office1_X2, (office1_Z1 + office1_Z2) / 2, wallThickness, office1_Z2 - office1_Z1); createWall(6.5, office1_Z2, 7, wallThickness); createWall(15, office1_Z2, 6, wallThickness); createSlidingDoor(11, 8, 2, 3, 0.2);
createTable(7, 1, Math.PI / 2); createLaptop(7, 1, Math.PI / 2); createTable(8, 1, Math.PI / 2); createLaptop(8, 1, -Math.PI / 2); createTable(7, 3, Math.PI / 2); createLaptop(7, 3, Math.PI / 2); createTable(8, 3, Math.PI / 2); createLaptop(8, 3, -Math.PI / 2); createTable(7.5, 5); createLaptop(7.5, 5, Math.PI); 
createChair(6, 1, Math.PI / 2); createChair(6, 3, Math.PI / 2); createChair(9, 1, -Math.PI / 2); createChair(9, 3, -Math.PI / 2); createChair(7.5, 6, Math.PI); 
createTable(13, 1, Math.PI / 2); createLaptop(13, 1, Math.PI / 2); createTable(14, 1, Math.PI / 2); createLaptop(14, 1, -Math.PI / 2); createTable(13, 3, Math.PI / 2); createLaptop(13, 3, Math.PI / 2); createTable(14, 3, Math.PI / 2); createLaptop(14, 3, -Math.PI / 2); createTable(13.5, 5); createLaptop(13.5, 5, Math.PI);
createChair(12, 1, Math.PI / 2); createChair(12, 3, Math.PI / 2); createChair(15, 1, -Math.PI / 2); createChair(15, 3, -Math.PI / 2); createChair(13.5, 6, Math.PI);
createCooler(4, 1); createPlant(17, 7); createLamp(7, 3); createLamp(13, 3);  

// --- КОМНАТА 2: ПЕРЕГОВОРКА ---
const conf_X1 = 18; const conf_X2 = 30; const conf_Z1 = 0; const conf_Z2 = 8;
createWall((conf_X1 + conf_X2) / 2, conf_Z1, conf_X2 - conf_X1, wallThickness); createWall(conf_X2, (conf_Z1 + conf_Z2) / 2, wallThickness, conf_Z2 - conf_Z1); createWall(conf_X1, (conf_Z1 + conf_Z2) / 2, wallThickness, conf_Z2 - conf_Z1); 
createWall(19.5, conf_Z2, 3, wallThickness); createWall(26.5, conf_Z2, 7, wallThickness); createSlidingDoor(22, conf_Z2, 2, 3, 0.2); 
createCooler(19, 7); createConferenceTable(26, 3);
createChair(24.5, 1, Math.PI / 2); createChair(24.5, 3, Math.PI / 2); createChair(24.5, 5, Math.PI / 2); createChair(27.5, 1, -Math.PI / 2); createChair(27.5, 3, -Math.PI / 2); createChair(27.5, 5, -Math.PI / 2);
createTVOnStand(21, 2, Math.PI / 4); createWhiteboard(18.1, 4, Math.PI / 2); createLamp(26, 3); createLamp(22, 2); 

// --- КОМНАТА 3: ХОЛЛ / ЛОББИ ---
const hall_X1 = 30; const hall_X2 = 50; const hall_Z1 = 0; const hall_Z2 = 15;
createWall((hall_X1 + hall_X2) / 2, hall_Z1, hall_X2 - hall_X1, wallThickness); 
createWall(hall_X2, (hall_Z1 + hall_Z2) / 2, wallThickness, hall_Z2 - hall_Z1); 
createWall(hall_X1, (hall_Z1 + hall_Z2) / 2, wallThickness, hall_Z2 - hall_Z1); 
createWall(36.5, hall_Z2, 13, wallThickness); 
createWall(47.5, hall_Z2, 5, wallThickness); 
createSlidingDoor(44, hall_Z2, 2, 3, 0.2);    

// Лестница вдоль верхней стены (вход от стены)
createStairs(35, 1);

// Диваны развернуты лицом к столикам
createSofa(35, 6, 0);        // Смотрит на столик вниз
createCoffeeTable(35, 8);

createSofa(47, 5, -Math.PI / 2); // Смотрит на столик влево
createCoffeeTable(45, 5);

createPlant(48, 1); 
createCooler(49, 14); 

// 4 ЛОФТОВЫЕ ЛАМПЫ
createLoftLamp(35, 4); 
createLoftLamp(45, 4);
createLoftLamp(35, 10);
createLoftLamp(45, 10);

// --- КОМНАТА 4: ОФИС С КАМОРКОЙ (Финальная версия) ---
const newOffice_X1 = 50; 
const newOffice_X2 = 65; 
const newOffice_Z1 = 0;  
const newOffice_Z2 = 7;  

// 1. Внешние стены офиса
createWall((newOffice_X1 + newOffice_X2) / 2, newOffice_Z1, 15, wallThickness); // Верхняя стена
createWall(newOffice_X2, 3.5, wallThickness, 7); // Правая стена (X=65)

// Нижняя стена (Z=7) с дверью 2 метра (с 57 до 59)
createWall(53.5, newOffice_Z2, 7, wallThickness); // Левая часть (50-57)
createWall(62, newOffice_Z2, 6, wallThickness);   // Правая часть (59-65)
createSlidingDoor(58, newOffice_Z2, 2, 3, 0.2);   // Входная дверь (центр 58)

// 2. СТЕНЫ И ДВЕРЬ КАМОРКИ
// Правая стена каморки (сплошная часть от Z=0 до Z=2)
createWall(54, 1, wallThickness, 2); 

// Дверь в каморку (в проеме от Z=2 до Z=4)
// Ставим её вертикально (rotY = Math.PI / 2). 
// Чтобы она уезжала в сторону Z=0 (вверх), мы даем ей отрицательную ширину сдвига.
const kamorkaDoor = createSlidingDoor(54, 3, 2, 3, 0.2, Math.PI / 2); 
kamorkaDoor.isHorizontal = false; // Говорим функции, что она двигается по оси Z
// Функция по умолчанию сдвигает по Z в плюс. Чтобы она ехала вверх (в минус), 
// мы вручную меняем её начальную точку и направление сдвига при инициализации.
kamorkaDoor.startZ = 3; 
kamorkaDoor.openDir = 1; // <--- Вот эта переменная заставит её ехать вверх (к Z=0)

// Нижняя стена каморки (сплошная, от X=50 до X=54)
createWall(52, 4, 4, wallThickness); 

// 3. СТОЛ В ЛЕВОМ НИЖНЕМ УГЛУ
createTable(50.5, 5, Math.PI / 2); 
createLaptop(50.5, 5, -Math.PI / 2);
createChair(51.5, 5, -Math.PI / 2); 

// 4. СТОЛЫ В ПРАВОЙ ЧАСТИ
createTable(60.5, 1, Math.PI / 2);
createLaptop(60.5, 1, Math.PI / 2);
createChair(59.5, 1, Math.PI / 2);

createTable(61.5, 1, Math.PI / 2);
createLaptop(61.5, 1, -Math.PI / 2);
createChair(62.5, 1, -Math.PI / 2);

createTable(60.5, 3, Math.PI / 2);
createLaptop(60.5, 3, Math.PI / 2);
createChair(59.5, 3, Math.PI / 2);

createTable(61.5, 3, Math.PI / 2);
createLaptop(61.5, 3, -Math.PI / 2);
createChair(62.5, 3, -Math.PI / 2);

// 5. ДЕКОР И СВЕТ
createBox(51, 1, 1, 1, 1);         
createBox(52, 1.2, 0.6, 0.6, 0.6); 
createBox(51.2, 2, 0.5, 0.5, 0.5); 
createBox(52, 2.5, 0.8, 0.8, 0.8); 

createCooler(64.4, 6.4); 
createPlant(64, 2);      
createSnackMachine(60.2, 6.5, Math.PI); 
      
createLamp(51, 5);       
createLamp(61, 2);

// АВТОМАТ СО СНЕКАМИ (Справа от входной двери)
createSnackMachine(60.2, 6.5, Math.PI); 

createLamp(58, 2);       // Лампа над входом
createLamp(51, 5);       // Лампа над новым столом
createLamp(55, 5);       // Лампа над столами у каморки
createLamp(61, 2);       // Лампа над правым рядом
createLamp(52, 2);       // Лампа в каморке

// --- КОРИДОР (LED Панели) ---
// Прямой участок (вдоль офисов и переговорки)
createCeilingPanel(8, 9.5); 
createCeilingPanel(12, 9.5); 
createCeilingPanel(16, 9.5); 
createCeilingPanel(20, 9.5); 
createCeilingPanel(24, 9.5); 
createCeilingPanel(28, 9.5); 

// Поворот направо (вдоль нижней стены холла)
createCeilingPanel(32, 16.5);
createCeilingPanel(36, 16.5);
createCeilingPanel(40, 16.5);
createCeilingPanel(44, 16.5);
createCeilingPanel(48, 16.5);

// Поворот налево (вдоль правой стены холла)
createCeilingPanel(51.5, 12);
createCeilingPanel(51.5, 8);

/* =====================================================================
   8. ПЕРСОНАЖ
   ===================================================================== */
const playerTexture = new THREE.TextureLoader().load('assets/player.png');
const playerGeometry = new THREE.PlaneGeometry(1.6, 2.0); 
const playerMaterial = new THREE.MeshBasicMaterial({ map: playerTexture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(5, 1.0, 4);
scene.add(player);

/* =====================================================================
   9. УПРАВЛЕНИЕ (Мышь, Тач, Клавиатура)
   ===================================================================== */
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
    if (isDragging) { const deltaX = e.offsetX - previousMousePosition.x; cameraAngle -= deltaX * 0.01; previousMousePosition = { x: e.offsetX, y: e.offsetY }; }
});
renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });

renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { isDragging = true; previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
}, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) { const deltaX = e.touches[0].clientX - previousMousePosition.x; cameraAngle -= deltaX * 0.01; previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => { isDragging = false; });

renderer.domElement.addEventListener('click', (e) => {
    if (isDragging) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) { targetPosition.set(intersects[0].point.x, 1.0, intersects[0].point.z); hasTarget = true; }
});

/* =====================================================================
   10. ИГРОВАЯ ЛОГИКА (Коллизии, Двери, Движение)
   ===================================================================== */
function canMoveTo(x, z) {
    const radius = 0.5;
    for (const wall of walls) {
        if (Math.abs(x - wall.x) < wall.width / 2 + radius && Math.abs(z - wall.z) < wall.depth / 2 + radius) return false;
    }
    return true;
}

function updateDoors() {
    const triggerDist = 4; 
    doors.forEach(door => {
        const dx = player.position.x - door.group.position.x; const dz = player.position.z - door.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const targetAmount = dist < triggerDist ? 1 : 0;
        door.openAmount += (targetAmount - door.openAmount) * 0.08;
        if (Math.abs(targetAmount - door.openAmount) > 0.01) {
            if (door.isHorizontal) door.group.position.x = door.startX + (door.openAmount * door.width);
            else door.group.position.z = door.startZ + (door.openAmount * door.width * (door.openDir || 1));
        }
    });
}

const speed = 0.1;

function updatePlayer() {
    let newX = player.position.x; let newZ = player.position.z; let moved = false;
    if (keys['w'] || keys['arrowup']) { newZ -= speed; moved = true; }
    if (keys['s'] || keys['arrowdown']) { newZ += speed; moved = true; }
    if (keys['a'] || keys['arrowleft']) { newX -= speed; moved = true; }
    if (keys['d'] || keys['arrowright']) { newX += speed; moved = true; }
    if (!moved && hasTarget) {
        const dx = targetPosition.x - player.position.x; const dz = targetPosition.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.1) { newX += (dx / dist) * speed; newZ += (dz / dist) * speed; } else { hasTarget = false; }
    }
    if (canMoveTo(newX, player.position.z)) player.position.x = newX;
    if (canMoveTo(player.position.x, newZ)) player.position.z = newZ;
    player.lookAt(camera.position.x, camera.position.y, camera.position.z);
    player.rotation.x = 0; player.rotation.z = 0;
}

function updateCamera() {
    const targetCamX = player.position.x + Math.sin(cameraAngle) * cameraDistance;
    const targetCamZ = player.position.z + Math.cos(cameraAngle) * cameraDistance;
    camera.position.lerp(new THREE.Vector3(targetCamX, player.position.y + cameraHeight, targetCamZ), 0.1);
    camera.lookAt(player.position.x, player.position.y + 0.6, player.position.z);
}

/* =====================================================================
   11. УМНЫЙ СВЕТ
===================================================================== */
let time = 0;
function updateLamps() {
    time += 0.05; 
    const lightRadius = 18; // Радиус, в котором включается свет

    allLamps.forEach(l => {
        // Считаем расстояние от игрока до лампы
        const dist = Math.sqrt((player.position.x - l.x) ** 2 + (player.position.z - l.z) ** 2);

        if (dist < lightRadius) {
            // Игрок близко — включаем свет и анимацию мерцания
            l.light.intensity = l.baseIntensity;
            l.tube.visible = true;

            // Мерцание
            const noise = Math.sin(time * 0.05 + l.x) * Math.cos(time * 0.1 + l.z);
            if (noise > 0.3) {
                l.light.intensity = l.baseIntensity + 1; 
            } else if (noise < -0.3) {
                l.light.intensity = 0.5; 
            }
            
        } else {
            // Игрок далеко — выключаем свет (экономия ресурсов)
            l.light.intensity = 0;
            l.tube.visible = false; // Выключаем видимость абажура
        }
    });
}

// =====================================================================
// 12. ЗАПУСК ИГРОВОГО ЦИКЛА
// =====================================================================
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    updateDoors();
    updateCamera();
    updateLamps(); 
    renderer.render(scene, camera);
}
animate();

// Обработка изменения размера окна (для iPad и ПК)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});