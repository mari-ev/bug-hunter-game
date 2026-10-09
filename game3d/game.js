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
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// ===== МАТЕРИАЛЫ =====
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3a1a });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90d9,
    transparent: true,
    opacity: 0.7
});

// ===== ГРАНИЦЫ МИРА =====
const WORLD = {
    minX: -20,
    maxX: 20,
    minZ: -25,
    maxZ: 22.5
};

const worldWidth = WORLD.maxX - WORLD.minX;
const worldDepth = WORLD.maxZ - WORLD.minZ;
const worldCenterX = (WORLD.minX + WORLD.maxX) / 2;
const worldCenterZ = (WORLD.minZ + WORLD.maxZ) / 2;

// ===== ПОЛ =====
const floorGeometry = new THREE.PlaneGeometry(worldWidth, worldDepth);
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.x = worldCenterX;
floor.position.z = worldCenterZ;
floor.receiveShadow = true;
scene.add(floor);

// ===== МАССИВ СТЕН =====
const walls = [];

// ===== ФУНКЦИЯ СОЗДАНИЯ СТЕНЫ =====
function createWall(x, z, width, depth) {
    const geometry = new THREE.BoxGeometry(width, 3, depth);
    const wall = new THREE.Mesh(geometry, wallMaterial);
    wall.position.set(x, 1.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    walls.push({ x, z, width, depth });
}

// ===== ВНЕШНИЕ СТЕНЫ =====
createWall(worldCenterX, WORLD.minZ, worldWidth, 0.5);
createWall(worldCenterX, WORLD.maxZ, worldWidth, 0.5);
createWall(WORLD.minX, worldCenterZ, 0.5, worldDepth);
createWall(WORLD.maxX, worldCenterZ, 0.5, worldDepth);

// ===== ВНУТРЕННИЕ СТЕНЫ =====

// ===== КОМНАТА 1 (старт) =====
createWall(0, -5, 10, 0.5);          // задняя
createWall(-5, 0, 0.5, 10);          // левая
createWall(5, -3.25, 0.5, 3.5);      // правая (верхняя часть)
createWall(5, 3.25, 0.5, 3.5);       // правая (нижняя часть)
createWall(0, 5, 4, 0.5);            // передняя (с дырой)

// ===== КОМНАТА 2 (справа) =====
createWall(10, -3.25, 0.5, 3.5);     // левая (верхняя)
createWall(10, 3.25, 0.5, 3.5);      // левая (нижняя)
createWall(15, -5, 10, 0.5);         // задняя
createWall(20, 0, 0.5, 10);          // правая
createWall(15, 5, 10, 0.5);          // передняя

// ===== КОМНАТА 3 (снизу) =====
createWall(-3.25, -10, 3.5, 0.5);    // передняя (левая)
createWall(3.25, -10, 3.5, 0.5);     // передняя (правая)
createWall(0, -20, 10, 0.5);         // задняя
createWall(-5, -15, 0.5, 10);        // левая
createWall(5, -15, 0.5, 10);         // правая

// ===== КОМНАТА 4 (снизу-справа) =====
createWall(10, -15, 0.5, 10);        // левая
createWall(15, -20, 10, 0.5);        // задняя
createWall(20, -15, 0.5, 10);        // правая
createWall(15, -10, 10, 0.5);        // передняя

// ===== ДВЕРИ (открывающиеся, петли СПРАВА) =====
const doors = [];

function createDoor(x, z, width, height, depth, rotY = 0) {
    const group = new THREE.Group();

    // Меш двери — смещён ВЛЕВО от точки петли
    // (петля справа, поэтому дверь "висит" слева от группы)
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const door = new THREE.Mesh(geometry, doorMaterial);
    door.position.x = -width / 2;
    door.castShadow = true;
    door.receiveShadow = true;
    group.add(door);

    // Группа стоит в точке петли (правый край двери)
    group.position.set(x, height / 2, z);
    group.rotation.y = rotY;
    scene.add(group);

    const doorData = {
        group: group,
        door: door,
        rotY: rotY,
        open: false,
        openAmount: 0,
        width: width
    };
    doors.push(doorData);
    return doorData;
}

// Дверь между комнатой 1 и 2 (петля на правом краю, z=1.5)
createDoor(10, 1.5, 0.3, 2.5, 3, 0);

// Дверь между комнатой 1 и 3 (петля на правом краю, x=1.5)
createDoor(1.5, -10, 3, 2.5, 0.3, 0);

// ===== СТОЛ =====
function createTable(x, z, rotY = 0) {
    const group = new THREE.Group();

    const top = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 1),
        woodMaterial
    );
    top.position.y = 1;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legPositions = [
        [-0.9, 0, -0.4],
        [0.9, 0, -0.4],
        [-0.9, 0, 0.4],
        [0.9, 0, 0.4]
    ];

    legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 1, 0.1),
            darkMaterial
        );
        leg.position.set(lx, 0.5, lz);
        leg.castShadow = true;
        group.add(leg);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    walls.push({ x, z, width: 2, depth: 1 });
}

// ===== СТУЛ =====
function createChair(x, z, rotY = 0) {
    const group = new THREE.Group();

    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.15, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    seat.position.y = 0.5;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.8, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    back.position.set(0, 0.9, -0.3);
    back.castShadow = true;
    group.add(back);

    const headrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    headrest.position.set(0, 1.4, -0.3);
    headrest.castShadow = true;
    group.add(headrest);

    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
        legMaterial
    );
    leg.position.y = 0.25;
    leg.castShadow = true;
    group.add(leg);

    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.05, 0.08),
            legMaterial
        );
        spoke.position.set(
            Math.cos(angle) * 0.2,
            0.07,
            Math.sin(angle) * 0.2
        );
        spoke.rotation.y = -angle;
        spoke.castShadow = true;
        group.add(spoke);
    }

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8),
            wheelMaterial
        );
        wheel.position.set(
            Math.cos(angle) * 0.35,
            0.04,
            Math.sin(angle) * 0.35
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.rotation.y = -angle;
        group.add(wheel);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);
}

// ===== КУЛЕР =====
function createCooler(x, z) {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 1, 16),
        metalMaterial
    );
    base.position.y = 0.5;
    base.castShadow = true;
    group.add(base);

    const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16),
        waterMaterial
    );
    bottle.position.y = 1.3;
    bottle.castShadow = true;
    group.add(bottle);

    group.position.set(x, 0, z);
    scene.add(group);

    walls.push({ x, z, width: 0.6, depth: 0.6 });
}

// ===== РАССТАНОВКА =====

// Комната 1
createTable(-2, -2);
createTable(2, -2);
createChair(-2, -0.5, Math.PI);
createChair(2, -0.5, Math.PI);
createChair(-3, -2, Math.PI / 2);
createChair(3, -2, -Math.PI / 2);
createCooler(4, 4);

// Комната 2
createTable(13, -2);
createTable(17, -2);
createTable(15, 2);
createChair(13, -0.5, Math.PI);
createChair(17, -0.5, Math.PI);
createChair(15, 3.5, Math.PI);
createChair(15, 2, Math.PI / 2);
createCooler(19, 4);

// Комната 3
createTable(-2, -17);
createTable(2, -17);
createChair(-2, -15.5, Math.PI);
createChair(2, -15.5, Math.PI);
createChair(-3, -17, Math.PI / 2);
createChair(3, -17, -Math.PI / 2);
createCooler(4, -19);

// Комната 4
createTable(13, -17);
createTable(17, -17);
createChair(13, -15.5, Math.PI);
createChair(17, -15.5, Math.PI);
createCooler(19, -19);

// ===== ПЕРСОНАЖ =====
const playerTexture = new THREE.TextureLoader().load('assets/player.png');
playerTexture.magFilter = THREE.NearestFilter;
playerTexture.minFilter = THREE.NearestFilter;

const playerGeometry = new THREE.PlaneGeometry(2, 2.4);
const playerMaterial = new THREE.MeshBasicMaterial({
    map: playerTexture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 1.2, 0);
scene.add(player);

// ===== ЖУКИ =====
const bugs = [];
let score = 0;
const scoreEl = document.getElementById('score');

function spawnBug(x, z) {
    const bugGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const bugMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    const bug = new THREE.Mesh(bugGeometry, bugMaterial);
    bug.position.set(x, 0.4, z);
    bug.castShadow = true;
    scene.add(bug);
    bugs.push({ mesh: bug, alive: true });
}

spawnBug(2, -2);
spawnBug(-3, 2);
spawnBug(15, 2);
spawnBug(17, -3);
spawnBug(2, -17);
spawnBug(-3, -13);

// ===== ПУЛИ =====
const bullets = [];

function shootBullet(targetX, targetY, targetZ) {
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x7ee787 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(player.position);
    bullet.position.y = 1.2;
    scene.add(bullet);

    const dx = targetX - bullet.position.x;
    const dy = targetY - bullet.position.y;
    const dz = targetZ - bullet.position.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    bullets.push({
        mesh: bullet,
        dx: (dx / length) * 0.4,
        dy: (dy / length) * 0.4,
        dz: (dz / length) * 0.4,
        life: 150
    });
}

// ===== КЛАВИАТУРА =====
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// ===== ТАП =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetPosition = new THREE.Vector3(0, 1.2, 0);
let hasTarget = false;

function onTap(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const bugMeshes = bugs.filter(b => b.alive).map(b => b.mesh);
    const bugIntersects = raycaster.intersectObjects(bugMeshes);

    if (bugIntersects.length > 0) {
        const hitBug = bugIntersects[0].object;
        shootBullet(hitBug.position.x, hitBug.position.y, hitBug.position.z);
        return;
    }

    const floorIntersects = raycaster.intersectObject(floor);
    if (floorIntersects.length > 0) {
        const point = floorIntersects[0].point;
        targetPosition.set(point.x, 1.2, point.z);
        hasTarget = true;
    }
}

renderer.domElement.addEventListener('click', (e) => onTap(e.clientX, e.clientY));
renderer.domElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onTap(touch.clientX, touch.clientY);
}, { passive: false });

// ===== СТОЛКНОВЕНИЯ =====
function canMoveTo(x, z) {
    const playerRadius = 0.5;

    for (const wall of walls) {
        const halfW = wall.width / 2 + playerRadius;
        const halfD = wall.depth / 2 + playerRadius;

        if (Math.abs(x - wall.x) < halfW && Math.abs(z - wall.z) < halfD) {
            return false;
        }
    }

    return true;
}

// ===== ДВИЖЕНИЕ =====
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

    // Двери открываются автоматически
    updateDoors(newX, newZ);

    // Коллизии
    if (canMoveTo(newX, player.position.z)) {
        player.position.x = newX;
    }
    if (canMoveTo(player.position.x, newZ)) {
        player.position.z = newZ;
    }

    player.lookAt(camera.position.x, player.position.y, camera.position.z);
    player.rotation.x = 0;
    player.rotation.z = 0;
}

// ===== ДВЕРИ (открывание, петли СПРАВА) =====
function updateDoors(playerX, playerZ) {
    const triggerDistance = 3;

    doors.forEach(doorData => {
        // Точка петли — позиция группы (правый край двери)
        const pivotX = doorData.group.position.x;
        const pivotZ = doorData.group.position.z;

        const dx = playerX - pivotX;
        const dz = playerZ - pivotZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        doorData.open = dist < triggerDistance;

        const targetAmount = doorData.open ? 1 : 0;
        doorData.openAmount += (targetAmount - doorData.openAmount) * 0.1;

        // Открываем: поворот вокруг правой петли (левый край отходит)
        const angle = doorData.openAmount * Math.PI / 2;
        doorData.group.rotation.y = doorData.rotY + angle;
    });
}

// ===== ПУЛИ =====
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.x += b.dx;
        b.mesh.position.y += b.dy;
        b.mesh.position.z += b.dz;
        b.life--;

        for (const bug of bugs) {
            if (!bug.alive) continue;
            const dx = b.mesh.position.x - bug.mesh.position.x;
            const dy = b.mesh.position.y - bug.mesh.position.y;
            const dz = b.mesh.position.z - bug.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 0.6) {
                bug.alive = false;
                scene.remove(bug.mesh);
                score++;
                scoreEl.textContent = score;
                scene.remove(b.mesh);
                bullets.splice(i, 1);
                break;
            }
        }

        if (b.life <= 0 && bullets[i] === b) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }
}

// ===== КАМЕРА =====
const cameraOffset = new THREE.Vector3(0, 6, 8);

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

// ===== АНИМАЦИЯ =====
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    updateBullets();
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