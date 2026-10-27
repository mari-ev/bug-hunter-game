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

const counterDiv = document.createElement('div');
counterDiv.id = 'bug-counter';
counterDiv.style.position = 'absolute';
counterDiv.style.top = '20px';
counterDiv.style.left = '20px';
counterDiv.style.color = '#00ff00';
counterDiv.style.fontSize = '24px';
counterDiv.style.fontFamily = 'monospace';
counterDiv.style.fontWeight = 'bold';
counterDiv.style.textShadow = '2px 2px 4px #000000';
counterDiv.innerText = 'Убито багов: 0';
document.body.appendChild(counterDiv);

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
const activeBugs = [];
let bugsKilled = 0;

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

// Длинный стол под заказ (для переговорок/опенспейсов)
function createLongTable(x, z, length, width) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, width), woodMaterial);
    top.position.y = 1; 
    top.castShadow = true; 
    top.receiveShadow = true; 
    group.add(top);
    
    const legPositions = [
        [-length/2 + 0.2, 0, -width/2 + 0.2], 
        [length/2 - 0.2, 0, -width/2 + 0.2], 
        [-length/2 + 0.2, 0, width/2 - 0.2], 
        [length/2 - 0.2, 0, width/2 - 0.2]
    ];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), darkMaterial);
        leg.position.set(lx, 0.5, lz); 
        leg.castShadow = true; 
        group.add(leg);
    });
    
    group.position.set(x, 0, z); 
    scene.add(group); 
    walls.push({ x, z, width: length, depth: width });
}

// Мусорное ведро
function createTrashBin(x, z) {
    const group = new THREE.Group();
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    bin.position.y = 0.3; bin.castShadow = true; bin.receiveShadow = true; group.add(bin);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    lid.position.y = 0.62; lid.castShadow = true; group.add(lid);
    
    group.position.set(x, 0, z); 
    scene.add(group); 
    walls.push({ x, z, width: 0.5, depth: 0.5 });
}

// --- ФУНКЦИИ ДЛЯ COFFEE POINT ---

// Обычный стул для кафе (без колесиков)
function createCafeChair(x, z, rotY = 0) {
    const group = new THREE.Group();
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), chairMat);
    seat.position.y = 0.45; seat.castShadow = true; seat.receiveShadow = true; group.add(seat);
    const back1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), chairMat);
    back1.position.set(0, 0.7, -0.2); back1.castShadow = true; group.add(back1);
    const back2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), chairMat);
    back2.position.set(0, 0.5, -0.2); back2.castShadow = true; group.add(back2);
    const legPositions = [[-0.18, 0, -0.18], [0.18, 0, -0.18], [-0.18, 0, 0.18], [0.18, 0, 0.18]];
    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), metalMat);
        leg.position.set(lx, 0.225, lz); leg.castShadow = true; group.add(leg);
    });
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
}

// Кухонная тумба (низкая)
function createKitchenCounter(x, z, width, depth, rotY = 0) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    top.position.y = 0.9; top.castShadow = true; top.receiveShadow = true; group.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(width - 0.05, 0.85, depth - 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
    base.position.y = 0.45; base.castShadow = true; group.add(base);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
    for (let i = 1; i < 4; i++) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), handleMat);
        handle.position.set(-width/2 + (width/4)*i, 0.5, depth/2); group.add(handle);
    }
    group.position.set(x, 0, z); group.rotation.y = rotY; scene.add(group);
    if (rotY === 0) walls.push({ x, z, width: width, depth: depth });
    else walls.push({ x, z, width: depth, depth: width });
}

// Кофемашина (с поддержкой поворота)
function createCoffeeMachine(x, z, rotY = 0) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 }));
    body.position.y = 1.4; body.castShadow = true; group.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    panel.position.set(0, 1.6, 0.26); group.add(panel);
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 }));
    btn.position.set(0.1, 1.6, 0.28); group.add(btn);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    tray.position.set(0, 1.05, 0.2); group.add(tray);
    
    group.position.set(x, 0, z); 
    group.rotation.y = rotY; // <-- ДОБАВЛЕНО
    scene.add(group);
    walls.push({ x, z, width: 0.6, depth: 0.5 });
}

// Холодильник-витрина с улучшенной едой
function createFridge(x, z, rotY = 0) {
    const group = new THREE.Group();
    
    // --- 1. КОРПУС (Открытый с передней части) ---
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Задняя стенка
    const back = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.05), bodyMat);
    back.position.set(0, 1, -0.375); back.castShadow = true; group.add(back);
    // Боковые стенки
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 0.8), bodyMat);
    left.position.set(-0.475, 1, 0); left.castShadow = true; group.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 0.8), bodyMat);
    right.position.set(0.475, 1, 0); right.castShadow = true; group.add(right);
    // Верх и низ
    const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.8), bodyMat);
    top.position.set(0, 1.975, 0); top.castShadow = true; group.add(top);
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.8), bodyMat);
    bottom.position.set(0, 0.025, 0); bottom.castShadow = true; group.add(bottom);
    
    // Внутренняя задняя стенка (белая, чтобы отражать свет)
    const innerBack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.02), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    innerBack.position.set(0, 1, -0.34); group.add(innerBack);

    // Полки
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    for(let i=0; i<3; i++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.7), shelfMat);
        shelf.position.set(0, 0.4 + i*0.5, 0); group.add(shelf);
    }
    
    // --- 2. ЕДА ---
    
    // 1. ТОРТИК
    const cakeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xffb6c1 }));
    cakeBase.position.set(0.2, 0.46, 0); group.add(cakeBase);
    const cakeCream = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    cakeCream.position.set(0.2, 0.54, 0); group.add(cakeCream);
    const cakeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0xff69b4 }));
    cakeTop.position.set(0.2, 0.59, 0); group.add(cakeTop);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: 0xcc0000 }));
    cherry.position.set(0.2, 0.64, 0); group.add(cherry);

    // 2. БУЛОЧКИ
    const bunMat = new THREE.MeshStandardMaterial({ color: 0xffd700 }); 
    const crustMat = new THREE.MeshStandardMaterial({ color: 0xcd853f }); 
    
    const bun1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), bunMat); 
    bun1.position.set(-0.2, 0.95, 0.1); bun1.scale.set(1, 0.7, 1); group.add(bun1); 
    const crust1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), crustMat);
    crust1.position.set(-0.2, 1.02, 0.1); crust1.scale.set(1, 0.3, 1); group.add(crust1); 
    
    const bun2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), bunMat); 
    bun2.position.set(-0.05, 0.95, -0.05); bun2.scale.set(1, 0.7, 1); group.add(bun2);
    const crust2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), crustMat);
    crust2.position.set(-0.05, 1.02, -0.05); crust2.scale.set(1, 0.3, 1); group.add(crust2);

    // 3. БАНКИ
    const can1Body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x4682b4 })); 
    can1Body.position.set(0.2, 1.45, 0.1); group.add(can1Body);
    const can1Label = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xffffff })); 
    can1Label.position.set(0.2, 1.45, 0.1); group.add(can1Label);
    const can1Lid = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 })); 
    can1Lid.position.set(0.2, 1.58, 0.1); group.add(can1Lid);

    const can2Body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0xff4500 })); 
    can2Body.position.set(0.2, 1.45, -0.1); group.add(can2Body);
    const can2Label = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xffd700 })); 
    can2Label.position.set(0.2, 1.45, -0.1); group.add(can2Label);
    const can2Lid = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 })); 
    can2Lid.position.set(0.2, 1.58, -0.1); group.add(can2Lid);

    // 4. ЙОГУРТ
    const yogurt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0xf5f5dc })); 
    yogurt.position.set(-0.2, 0.48, -0.1); group.add(yogurt);
    const yogurtLid = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.01, 12), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 })); 
    yogurtLid.position.set(-0.2, 0.56, -0.1); group.add(yogurtLid);

    // 5. ПАКЕТЫ МОЛОКА
    const milkMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); 
    const milkLabelMatBlue = new THREE.MeshStandardMaterial({ color: 0x1e90ff }); 
    const milkLabelMatRed = new THREE.MeshStandardMaterial({ color: 0xdc143c }); 

    const milk1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), milkMat);
    milk1.position.set(-0.05, 0.51, 0.1); group.add(milk1);
    const milkLabel1 = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.1, 0.125), milkLabelMatBlue);
    milkLabel1.position.set(-0.05, 0.51, 0.1); group.add(milkLabel1);
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 4), milkMat);
    roof1.position.set(-0.05, 0.65, 0.1); roof1.rotation.y = Math.PI / 4; group.add(roof1);

    const milk2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), milkMat);
    milk2.position.set(-0.2, 0.51, -0.15); group.add(milk2);
    const milkLabel2 = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.1, 0.125), milkLabelMatRed);
    milkLabel2.position.set(-0.2, 0.51, -0.15); group.add(milkLabel2);
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 4), milkMat);
    roof2.position.set(-0.2, 0.65, -0.15); roof2.rotation.y = Math.PI / 4; group.add(roof2);

    // 6. СЫРКИ
    const cheeseMat1 = new THREE.MeshStandardMaterial({ color: 0xffd700 }); 
    const cheeseMat2 = new THREE.MeshStandardMaterial({ color: 0x00bfff }); 
    const cheeseLabelMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); 

    const cheese1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), cheeseMat1);
    cheese1.position.set(0.1, 0.43, 0.15); group.add(cheese1);
    const cheeseLabel1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.04), cheeseLabelMat);
    cheeseLabel1.position.set(0.1, 0.451, 0.15); group.add(cheeseLabel1);

    const cheese2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), cheeseMat2);
    cheese2.position.set(0.1, 0.43, 0.02); group.add(cheese2);
    const cheeseLabel2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.04), cheeseLabelMat);
    cheeseLabel2.position.set(0.1, 0.451, 0.02); group.add(cheeseLabel2);
    
    const cheese3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), cheeseMat1);
    cheese3.position.set(-0.3, 0.46, 0.15); cheese3.rotation.x = Math.PI / 2; group.add(cheese3);
    const cheeseLabel3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.04), cheeseLabelMat);
    cheeseLabel3.position.set(-0.3, 0.46, 0.181); cheeseLabel3.rotation.x = Math.PI / 2; group.add(cheeseLabel3);
    
    // --- 3. КАРКАС ДВЕРИ И РУЧКА ---
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), frameMat);
    frameTop.position.set(0, 1.95, 0.4); group.add(frameTop);
    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), frameMat);
    frameBottom.position.set(0, 0.05, 0.4); group.add(frameBottom);
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), frameMat);
    frameLeft.position.set(-0.45, 1, 0.4); group.add(frameLeft);
    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), frameMat);
    frameRight.position.set(0.45, 1, 0.4); group.add(frameRight);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
    handle.position.set(0.4, 1, 0.45); group.add(handle);

    // --- 4. СВЕТ ---
    // Лампочка
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff });
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), bulbMat);
    bulb.position.set(0, 1.8, 0); 
    group.add(bulb);

    // Источник света внутри
    const fridgeLight = new THREE.PointLight(0xffffff, 2, 2);
    fridgeLight.position.set(0, 1.7, 0.2);
    group.add(fridgeLight);
    
    // --- 5. ФИНАЛЬНАЯ УСТАНОВКА ---
    group.position.set(x, 0, z); 
    group.rotation.y = rotY; 
    scene.add(group);
    
    // Коллизия
    if (rotY === 0) walls.push({ x, z, width: 1, depth: 0.8 });
    else walls.push({ x, z, width: 0.8, depth: 1 });
}

// Круглый столик
function createRoundTable(x, z) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16), woodMaterial);
    top.position.y = 0.7; top.castShadow = true; group.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), metalMaterial);
    leg.position.y = 0.35; leg.castShadow = true; group.add(leg);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), metalMaterial);
    base.position.y = 0.02; group.add(base);
    group.position.set(x, 0, z); scene.add(group);
    walls.push({ x, z, width: 1, depth: 1 });
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

// --- ВИЗУАЛИЗАЦИЯ БАГОВ ---

// 1. ГЛЮЧНЫЙ ПИКСЕЛЬ (Зеленый)
function createBugPixel(x, y, z, baseColor) {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({ color: baseColor, emissive: baseColor, emissiveIntensity: 2.0 }); 
    const pixel = new THREE.Mesh(geometry, material);
    pixel.position.set(x, y, z);
    const light = new THREE.PointLight(baseColor, 0.5, 1);
    pixel.add(light);
    scene.add(pixel);
    return pixel;
}

// 2. КРИВАЯ КЛЯКСА (Желтая, плоская со стороны стены)
function createBugSpill(x, y, z, baseColor, rotY = 0) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.1, metalness: 0.8, emissive: baseColor, emissiveIntensity: 1.0 });
    
    const blob1 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), material);
    const blob2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), material);
    blob2.position.set(0.12, -0.05, 0.05);
    const blob3 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), material);
    blob3.position.set(-0.1, -0.08, -0.08);
    group.add(blob1, blob2, blob3);
    
    group.scale.set(0.2, 1, 1); // Сплющили по оси X
    group.position.set(x, y, z);
    group.rotation.y = rotY; 
    
    const light = new THREE.PointLight(baseColor, 1.5, 2);
    light.position.set(0.1, 0, 0); 
    group.add(light);
    
    scene.add(group);
    return group;
}

// 3. ОШИБКА ИНТЕРФЕЙСА (Красная, телепорт)
function createBugError(x, y, z, baseColor) {
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: baseColor, emissive: baseColor, emissiveIntensity: 1.5 }));
    group.add(sphere);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 8, 32), new THREE.MeshBasicMaterial({ color: baseColor }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    group.position.set(x, y, z);
    const light = new THREE.PointLight(baseColor, 2, 3);
    group.add(light);
    scene.add(group);
    return { group, ring }; 
}

// 4. МИКРОБ-КОФЕИН (Синий, летает сквозь стены)
function createBugCaffeine(x, y, z, baseColor) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.5, emissive: baseColor, emissiveIntensity: 0.5 }));
    group.add(body);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for(let i=0; i<10; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), spikeMat);
        const phi = Math.acos(-1 + (2 * i) / 10);
        const theta = Math.sqrt(10 * Math.PI) * phi;
        spike.position.setFromSphericalCoords(0.18, phi, theta);
        spike.lookAt(0, 0, 0);
        spike.rotateX(Math.PI / 2);
        group.add(spike);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eye.position.set(0, 0, 0.18);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    pupil.position.set(0, 0, 0.23);
    group.add(pupil);
    group.position.set(x, y, z);
    const light = new THREE.PointLight(baseColor, 1.5, 2);
    group.add(light);
    scene.add(group);
    return group;
}


// Создание 3D-персонажа (Максимально похож на арт)
function create3DPlayer() {
    const playerGroup = new THREE.Group();
    
    // Цвета (взяты с твоего арта)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // Кожа
    const hoodieMat = new THREE.MeshStandardMaterial({ color: 0x151515 }); // Черная толстовка
    const hoodieDarkMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a }); // Тени на одежде
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a }); // Темные джинсы
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Черные кроссовки
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee }); // Белая подошва
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a }); // Темные волосы
    const headphoneMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Наушники
    const backpackMat = new THREE.MeshStandardMaterial({ color: 0x4a4035 }); // Коричневатый рюкзак
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 }); // Кофе-ган

    // --- НОГИ (Джинсы) ---
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 12), pantsMat);
    leftLeg.position.set(-0.15, 0.4, 0); 
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 12), pantsMat);
    rightLeg.position.set(0.15, 0.4, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    // --- КРОССОВКИ (Черные с белой подошвой) ---
    const createSneaker = (xPos) => {
        const group = new THREE.Group();
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), shoeMat);
        toe.scale.set(1, 0.6, 1.4);
        toe.position.set(0, 0.1, 0.15); 
        group.add(toe);
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.45), soleMat);
        sole.position.set(0, 0.025, 0.05); 
        group.add(sole);
        group.position.set(xPos, 0.05, 0);
        return group;
    };
    playerGroup.add(createSneaker(-0.15));
    playerGroup.add(createSneaker(0.15));

    // --- ТЕЛО (Объемная толстовка) ---
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.75, 16), hoodieMat);
    torso.position.set(0, 1.05, 0); 
    torso.castShadow = true;
    playerGroup.add(torso);

    // Карман-кенгуру
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.05), hoodieDarkMat);
    pocket.position.set(0, 0.85, 0.33);
    playerGroup.add(pocket);

    // --- РУКИ ---
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.55, 12), hoodieMat);
    leftArm.position.set(-0.45, 1.05, 0);
    leftArm.castShadow = true;
    playerGroup.add(leftArm);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMat);
    leftHand.position.set(-0.45, 0.7, 0);
    playerGroup.add(leftHand);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.55, 12), hoodieMat);
    rightArm.position.set(0.45, 1.05, 0);
    rightArm.castShadow = true;
    playerGroup.add(rightArm);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMat);
    rightHand.position.set(0.45, 0.7, 0);
    playerGroup.add(rightHand);

    // --- ОРУЖИЕ И КРУЖКА (В руках) ---
    // Кофе-ган в правой руке
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.35), gunMat);
    gunBody.position.set(0, 0, 0.15);
    gunGroup.add(gunBody);
    const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), gunMat);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.03, 0.4);
    gunGroup.add(gunBarrel);
    gunGroup.position.set(0.45, 0.7, 0.1); // Привязали к правой руке
    playerGroup.add(gunGroup);

    // Кружка кофе в левой руке
    const mugGroup = new THREE.Group();
    const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    mugGroup.add(mugBody);
    const mugLabel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mugLabel.position.set(0, 0, 0.08);
    mugGroup.add(mugLabel);
    mugGroup.position.set(-0.45, 0.6, 0.05); // Привязали к левой руке
    playerGroup.add(mugGroup);

    // --- ГОЛОВА И ЛИЦО ---
    const headGroup = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
    skull.scale.set(0.9, 1.1, 0.95);
    skull.castShadow = true;
    headGroup.add(skull);
    
    // Глаза (анимешные, большие)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eyeL.position.set(-0.08, 0.05, 0.19);
    headGroup.add(eyeL);
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), pupilMat);
    pupilL.position.set(-0.08, 0.05, 0.22);
    headGroup.add(pupilL);
    
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eyeR.position.set(0.08, 0.05, 0.19);
    headGroup.add(eyeR);
    const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), pupilMat);
    pupilR.position.set(0.08, 0.05, 0.22);
    headGroup.add(pupilR);

    // Рот
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), pupilMat);
    mouth.position.set(0, -0.1, 0.2);
    headGroup.add(mouth);

    // Волосы (торчат из-под капюшона)
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.12), hairMat);
    bangs.position.set(0, 0.12, 0.18);
    bangs.rotation.x = 0.2;
    headGroup.add(bangs);

    headGroup.position.set(0, 1.65, 0);
    playerGroup.add(headGroup);

    // --- КАПЮШОН ---
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.5), hoodieMat);
    hood.position.set(0, 0.05, -0.05); 
    hood.scale.set(1.1, 1.1, 1.1);
    headGroup.add(hood);

    // --- НАУШНИКИ ПОВЕРХ КАПЮШОНА ---
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 16, Math.PI), headphoneMat);
    band.rotation.z = Math.PI;
    band.position.set(0, 0.1, 0);
    headGroup.add(band);
    
    const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), headphoneMat);
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(-0.3, 0, 0);
    headGroup.add(cupL);
    const cupR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), headphoneMat);
    cupR.rotation.z = Math.PI / 2;
    cupR.position.set(0.3, 0, 0);
    headGroup.add(cupR);

    // --- РЮКЗАК ---
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), backpackMat);
    backpack.position.set(0, 1.05, -0.35); 
    backpack.castShadow = true;
    playerGroup.add(backpack);
    
    // Труба на рюкзаке (как на арте)
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), hoodieMat);
    tube.rotation.z = -0.3;
    tube.position.set(0.15, 1.35, -0.35);
    playerGroup.add(tube);

    // Лямки рюкзака
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.05), hoodieDarkMat);
    strapL.position.set(-0.2, 1.15, 0.3);
    playerGroup.add(strapL);
    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.05), hoodieDarkMat);
    strapR.position.set(0.2, 1.15, 0.3);
    playerGroup.add(strapR);

    // Сохраняем ссылки для анимации
    playerGroup.userData = {
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        leftArm: leftArm,
        rightArm: rightArm,
        leftHand: leftHand,
        rightHand: rightHand
    };

    return playerGroup;
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

createLamp(51, 5);       // Лампа над новым столом
createLamp(55, 5);       // Лампа над столами у каморки
createLamp(61, 2);       // Лампа над правым рядом
createLamp(52, 2);       // Лампа в каморке

// --- КОМНАТА 5: ПЕРЕГОВОРКА №2 (С большим столом) ---
const office5_X1 = 53;
const office5_X2 = 65;
const office5_Z1 = 10;
const office5_Z2 = 18;

// 1. Основные стены комнаты
createWall((office5_X1 + office5_X2) / 2, office5_Z1, 12, wallThickness); // Верхняя стена (Z=10)
createWall((office5_X1 + office5_X2) / 2, office5_Z2, 12, wallThickness); // Нижняя стена (Z=18)
createWall(office5_X2, 14, wallThickness, 8); // Правая стена (X=65)

// Левая стена (X=53) с дверью от Z=14 до Z=16
createWall(office5_X1, 12, wallThickness, 4); // Стена от Z=10 до Z=14
createWall(office5_X1, 17, wallThickness, 2); // Стена от Z=16 до Z=18
createSlidingDoor(office5_X1, 15, 2, 3, 0.2, Math.PI / 2); // Дверь

// 2. БОЛЬШОЙ СТОЛ
createLongTable(57.5, 14, 5, 2); 

// 3. СТУЛЬЯ (По 3 штуки с каждой длинной стороны)
// Верхняя сторона (смотрят вниз, на стол)
createChair(56, 12.5, 0);   
createChair(57.5, 12.5, 0); 
createChair(59, 12.5, 0);   

// Нижняя сторона (смотрят вверх, на стол)
createChair(56, 15.5, Math.PI);   
createChair(57.5, 15.5, Math.PI); 
createChair(59, 15.5, Math.PI);   

// 4. ДЕКОР, ТЕХНИКА И СВЕТ
createCooler(53.5, 10.5); // Кулер в левом верхнем углу
createTrashBin(64.5, 10.5); // Мусорное ведро в правом верхнем углу

// ТЕЛЕВИЗОР (Вертикально, экраном к столу)
createTVOnStand(62.5, 13, -Math.PI / 2);

createLamp(57.5, 14); // Лампа над большим столом

// --- КОМНАТА 6: ЩИТОВАЯ (Техническая комната) ---
const shchit_X1 = 53;
const shchit_X2 = 56;
const shchit_Z1 = 21;
const shchit_Z2 = 24;

// 1. Стены комнаты
createWall((shchit_X1 + shchit_X2) / 2, shchit_Z1, 3, wallThickness); // Верхняя (Z=21)
createWall((shchit_X1 + shchit_X2) / 2, shchit_Z2, 3, wallThickness); // Нижняя (Z=24)
createWall(shchit_X2, 22.5, wallThickness, 3); // Правая (X=56)

// Левая стена (X=53) с дверью 2 метра (от Z=22 до Z=24)
createWall(shchit_X1, 21.5, wallThickness, 1); // Верхний кусок стены
createSlidingDoor(shchit_X1, 23, 2, 3, 0.2, Math.PI / 2); // Дверь (внизу)

// 2. ЭЛЕКТРОЩИТОК НА СТЕНЕ (Создаем визуально)
// Корпус щитка (висит на правой стене X=56)
const panelBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x444444 }));
panelBox.position.set(55.8, 1.8, 22.5); 
panelBox.castShadow = true; 
scene.add(panelBox); 
walls.push({ x: 55.8, z: 22.5, width: 0.2, depth: 2 });

// Мигающие индикаторы на щитке (красные и зеленые)
const indMatRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
const indMatGreen = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 2 });
for (let i = 0; i < 3; i++) {
    const indR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.1), indMatRed);
    indR.position.set(55.7, 2.2, 22.2 + (i * 0.3)); 
    scene.add(indR);
    const indG = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.1), indMatGreen);
    indG.position.set(55.7, 2.0, 22.2 + (i * 0.3)); 
    scene.add(indG);
}

// 3. ТРАНСФОРМАТОР (Большой ящик в углу)
createBox(54.5, 23.2, 1.2, 1.5, 1); // Используем нашу функцию коробки
// Сверху на него поставим еще одну коробку для вида

// 4. ОСВЕЩЕНИЕ И ДЕКОР
// В щитовой не нужен яркий уютный свет, сделаем холодную лампу
createLamp(54.5, 22.5);

// --- КОМНАТА 7: COFFEE POINT ---
const coffee_X1 = 59;
const coffee_X2 = 65;
const coffee_Z1 = 21;
const coffee_Z2 = 27;

// 1. Стены комнаты
createWall((coffee_X1 + coffee_X2) / 2, coffee_Z1, 6, wallThickness); // Верхняя (Z=21)
createWall((coffee_X1 + coffee_X2) / 2, coffee_Z2, 6, wallThickness); // Нижняя (Z=27)
createWall(coffee_X2, 24, wallThickness, 6); // Правая (X=65)

// Левая стена (X=59) с дверью от Z=23 до Z=25
createWall(coffee_X1, 22, wallThickness, 2); // Стена от Z=21 до Z=23
createWall(coffee_X1, 26, wallThickness, 2); // Стена от Z=25 до Z=27
createSlidingDoor(coffee_X1, 24, 2, 3, 0.2, Math.PI / 2); // Дверь

// 2. КУХОННАЯ ЗОНА (Вдоль правой стены)
createKitchenCounter(64.5, 23, 4, 1, Math.PI / 2);

// Кофемашина и холодильник: разворачиваем на -Math.PI / 2, чтобы они смотрели внутрь комнаты (налево)
createCoffeeMachine(64.5, 21.5, -Math.PI / 2); 
createFridge(64.5, 25.5, -Math.PI / 2);

// 3. ЗОНА ОТДЫХА (Круглый стол по центру)
createRoundTable(60.5, 22.5);
createCafeChair(60.5, 21.5, 0);           
createCafeChair(59.5, 22.5, Math.PI / 2); 
createCafeChair(61.5, 22.5, -Math.PI / 2);

// 4. ДЕКОР
createPlant(60, 26); 
createTrashBin(61, 26); 
createCooler(60, 21.5); 

// 5. ОСВЕЩЕНИЕ
// Подвесная лампа (на проводе) ровно по центру стола
createLoftLamp(60.5, 22.5); 
// Офисные лампы вдоль тумбы
createLamp(64, 22); 
createLamp(64, 24);

// --- КОРИДОР (LED Панели) ---
// 1. Прямой участок (вдоль офисов и переговорки). Ось Z=8.5.
createCeilingPanel(8, 8.5);  // Подняли на 8.5, чтобы было по центру коридора
createCeilingPanel(11, 8.5); // Шаг 3 метра
createCeilingPanel(14, 8.5);
createCeilingPanel(17, 8.5);
createCeilingPanel(20, 8.5);
createCeilingPanel(23, 8.5);
createCeilingPanel(26, 8.5);
createCeilingPanel(29, 8.5);

// 2. Поворот направо (вдоль нижней стены холла). Ось Z=16.5.
// (Здесь у тебя было 32, 36, 40... сделаем шаг 3)
createCeilingPanel(32, 16.5);
createCeilingPanel(35, 16.5);
createCeilingPanel(38, 16.5);
createCeilingPanel(41, 16.5);
createCeilingPanel(44, 16.5);
createCeilingPanel(47, 16.5);

// 3. Поворот налево (вдоль правой стены холла). Ось X=51.5.
// Идем сверху вниз с шагом 3: 4 -> 8 -> 12 -> 16 -> 20
createCeilingPanel(51.5, 4);
createCeilingPanel(51.5, 8);
createCeilingPanel(51.5, 12);
createCeilingPanel(51.5, 16);
createCeilingPanel(51.5, 20);

// 4. Новый участок СВЕРХУ от Переговорки №2 (Ось Z=8.5, шаг 3)
createCeilingPanel(54, 8.5); 
createCeilingPanel(57, 8.5); 
createCeilingPanel(60, 8.5); 
createCeilingPanel(63, 8.5); 

// 5. Новый участок СНИЗУ от Переговорки №2 (Ось Z=19.5, шаг 3)
// Добавляем панель в самый угол (X=51.5, Z=19.5) для равномерности
createCeilingPanel(51.5, 19.5); 
createCeilingPanel(54, 19.5);
createCeilingPanel(57, 19.5);
createCeilingPanel(60, 19.5);
createCeilingPanel(63, 19.5);

// ==========================================
// ГЕНЕРАТОР БАГОВ (Рандомная расстановка по карте)
// ==========================================


// 10 Зеленых (на полу, прячутся по углам и за мебелью)
const roomsForBugs = [
    {x: 7, z: 4}, {x: 24, z: 4}, {x: 40, z: 7}, {x: 55, z: 3}, 
    {x: 59, z: 14}, {x: 62, z: 24}, {x: 54, z: 22}
];

for (let i = 0; i < 10; i++) {
    const room = roomsForBugs[Math.floor(Math.random() * roomsForBugs.length)];
    
    // Сдвигаем к краю комнаты (от 2 до 4 метров от центра)
    const offset = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
    const isX = Math.random() > 0.5; // Двигаем либо по X, либо по Z
    
    const x = isX ? room.x + offset : room.x + (Math.random() - 0.5) * 2;
    const z = isX ? room.z + (Math.random() - 0.5) * 2 : room.z + offset;
    
    // Y = 0.2, чтобы ползали по полу
    const bug = createBugPixel(x, 0.2, z, 0x00ff00);
    activeBugs.push({ type: 'pixel', mesh: bug, baseX: x, baseZ: z });
}

// 8 Желтых (на стенах, как жвачка)
const wallPositions = [
    {x: 3, z: 4, rotY: Math.PI / 2}, {x: 18, z: 4, rotY: -Math.PI / 2},
    {x: 18, z: 4, rotY: Math.PI / 2}, {x: 30, z: 4, rotY: -Math.PI / 2},
    {x: 30, z: 7, rotY: Math.PI / 2}, {x: 50, z: 7, rotY: -Math.PI / 2},
    {x: 50, z: 3, rotY: Math.PI / 2}, {x: 65, z: 3, rotY: -Math.PI / 2},
    {x: 53, z: 14, rotY: Math.PI / 2}, {x: 65, z: 14, rotY: -Math.PI / 2},
    {x: 59, z: 24, rotY: Math.PI / 2}, {x: 65, z: 24, rotY: -Math.PI / 2}
];

const shuffledWalls = [...wallPositions].sort(() => Math.random() - 0.5);

for (let i = 0; i < 8; i++) {
    const wall = shuffledWalls[i % shuffledWalls.length];
    
    // Высота от 1.5 до 2.5 метров (могут висеть над дверьми или под потолком)
    const y = 1.5 + Math.random() * 1.0; 
    let x = wall.x;
    let z = wall.z;
    
    if (wall.rotY === Math.PI / 2 || wall.rotY === -Math.PI / 2) {
        z += (Math.random() - 0.5) * 4; 
    } else {
        x += (Math.random() - 0.5) * 4; 
    }

    if (wall.rotY === Math.PI / 2) x += 0.1;
    else if (wall.rotY === -Math.PI / 2) x -= 0.1;

    const bug = createBugSpill(x, y, z, 0xffff00, wall.rotY);
    activeBugs.push({ type: 'spill', mesh: bug, baseX: x, baseZ: z });
}

// 3 Красных (телепорт по всей карте)
for (let i = 0; i < 3; i++) {
    const bugData = createBugError(32.5, 2.0, 32.5, 0xff0000);
    activeBugs.push({ type: 'error', mesh: bugData.group, ring: bugData.ring, baseX: 32.5, baseZ: 32.5 });
}

// 2 Синих (летают сквозь стены)
for (let i = 0; i < 2; i++) {
    const bug = createBugCaffeine(10, 1.5, 10, 0x00ffff);
    activeBugs.push({ type: 'caffeine', mesh: bug, baseX: 10, baseZ: 10 });
}

/* =====================================================================
   8. ПЕРСОНАЖ
   ===================================================================== */
// === НОВЫЙ 3D ПЕРСОНАЖ ===
const player = create3DPlayer();
// Ставим его на пол (Y = 0) в стартовую точку
player.position.set(5, 0, 4);
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
let wasDragging = false; // Флаг, чтобы отличить клик от вращения камеры

// --- 1. ПК: Вращение камеры правой кнопкой мыши ---
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault()); // Отключаем меню ПКМ

renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Правая кнопка мыши
        isDragging = true; 
        wasDragging = false;
        previousMousePosition = { x: e.offsetX, y: e.offsetY }; 
    }
});

renderer.domElement.addEventListener('mousemove', (e) => {
    if (isDragging) { 
        const deltaX = e.offsetX - previousMousePosition.x; 
        cameraAngle -= deltaX * 0.01; 
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
        wasDragging = true; 
    }
});

renderer.domElement.addEventListener('mouseup', (e) => { 
    if (e.button === 2) isDragging = false; 
});

// --- 2. ПЛАНШЕТ: Вращение камеры двумя пальцами ---
renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { 
        isDragging = true; 
        wasDragging = false;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        previousMousePosition = { x: midX, y: 0 }; 
    }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 2) { 
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const deltaX = midX - previousMousePosition.x; 
        cameraAngle -= deltaX * 0.01; 
        previousMousePosition = { x: midX, y: 0 };
        wasDragging = true;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => { 
    if (e.touches.length < 2) isDragging = false; 
});

// --- 3. КЛИК (Стрельба или Ходьба) ---
renderer.domElement.addEventListener('click', (e) => {
    // Если мы только что крутили камеру, клик игнорируется
    if (wasDragging) {
        wasDragging = false;
        return; 
    }
    if (isDragging) return;

    // Получаем координаты мыши
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; 
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Сначала проверяем, попали ли мы в багов
    const bugMeshes = activeBugs.map(bug => bug.type === 'error' ? bug.mesh : bug.mesh);
    const bugIntersects = raycaster.intersectObjects(bugMeshes, true);

    if (bugIntersects.length > 0) {
        const hitObject = bugIntersects[0].object;
        
        let bugToKill = activeBugs.find(b => {
            if (b.type === 'error') return b.mesh === hitObject.parent || b.mesh === hitObject;
            if (b.type === 'caffeine' || b.type === 'spill') return b.mesh === hitObject.parent || b.mesh === hitObject;
            return b.mesh === hitObject;
        });

        if (bugToKill) {
            scene.remove(bugToKill.mesh);
            activeBugs.splice(activeBugs.indexOf(bugToKill), 1);
            
            bugsKilled++;
            const counterEl = document.getElementById('bug-counter');
            if (counterEl) counterEl.innerText = `Убито багов: ${bugsKilled}`;
            console.log("Баг убит! Всего:", bugsKilled);
            
            return; // Выходим, чтобы персонаж не пошел в точку клика
        }
    }

    // Если не попали в бага — идем по полу
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) { 
        targetPosition.set(intersects[0].point.x, 1.0, intersects[0].point.z); 
        hasTarget = true; 
    }
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
    // Поворачиваем 3D-модель в сторону движения или камеры
    const angle = Math.atan2(camera.position.x - player.position.x, camera.position.z - player.position.z);
    player.rotation.y = angle;
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
    
    
    // Анимация ходьбы персонажа
    if (keys['w'] || keys['s'] || keys['a'] || keys['d'] || hasTarget) {
        // Если персонаж движется, качаем руками и ногами
        const walkTime = performance.now() * 0.008;
        player.userData.leftLeg.rotation.x = Math.sin(walkTime) * 0.5;
        player.userData.rightLeg.rotation.x = -Math.sin(walkTime) * 0.5;
        player.userData.leftArm.rotation.x = -Math.sin(walkTime) * 0.5;
        player.userData.rightArm.rotation.x = Math.sin(walkTime) * 0.5;
    } else {
        // Если стоит на месте — плавно возвращаем в исходное положение
        player.userData.leftLeg.rotation.x *= 0.8;
        player.userData.rightLeg.rotation.x *= 0.8;
        player.userData.leftArm.rotation.x *= 0.8;
        player.userData.rightArm.rotation.x *= 0.8;
    }
    
    // --- АНИМАЦИЯ И ПОВЕДЕНИЕ ВСЕХ БАГОВ ---
    // Замедлили время в 2 раза (было 0.002, стало 0.001)
    const bugTime = performance.now() * 0.001;

    activeBugs.forEach(bug => {
        const b = bug.mesh;

        if (bug.type === 'pixel') {
            // Зеленые: Ползают медленно (амплитуда 0.5 вместо 1.5) и глючат
            b.rotation.x += 0.02; 
            b.rotation.y += 0.02;
            b.scale.setScalar(1 + Math.sin(bugTime * 10) * 0.2);
            b.position.z = bug.baseZ + Math.sin(bugTime * 1.5) * 0.5; 
        } 
        else if (bug.type === 'spill') {
            // Желтые: Медленно пульсируют на стене
            const scaleX = 0.2 + Math.sin(bugTime * 2) * 0.05; 
            const scaleYZ = 1 + Math.sin(bugTime * 2) * 0.1;   
            b.scale.set(scaleX, scaleYZ, scaleYZ);
        }
        else if (bug.type === 'error') {
            // Красные: Телепорт реже (шанс 0.001 вместо 0.005)
            bug.ring.rotation.z += 0.02;
            b.rotation.y += 0.01;
            if (Math.random() < 0.001) { 
                b.position.x = 5 + Math.random() * 55;
                b.position.z = 5 + Math.random() * 55;
                b.position.y = 1.0 + Math.random() * 2.0;
            }
        }
        else if (bug.type === 'caffeine') {
            // Синие: Летают медленнее (скорость 0.2 вместо 0.5)
            b.rotation.y += 0.01;
            b.rotation.x += 0.005;
            b.position.x = 32.5 + Math.sin(bugTime * 0.2 + bug.baseX) * 25;
            b.position.z = 32.5 + Math.cos(bugTime * 0.15 + bug.baseZ) * 25;
            b.position.y = 1.5 + Math.sin(bugTime * 0.5) * 1.5;
            // Дрожание тоже замедлили
            b.position.x += (Math.random() - 0.5) * 0.05;
            b.position.z += (Math.random() - 0.5) * 0.05;
        }
    });
    
    renderer.render(scene, camera);
}
animate();

// Обработка изменения размера окна (для iPad и ПК)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});