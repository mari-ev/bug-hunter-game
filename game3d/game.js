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

// ===== ПОЛ =====
const floorGeometry = new THREE.PlaneGeometry(40, 40);
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ===== СТЕНЫ И ДВЕРИ =====
const walls = [];
const doors = [];

function createWall(x, z, width, depth) {
    const geometry = new THREE.BoxGeometry(width, 3, depth);
    const wall = new THREE.Mesh(geometry, wallMaterial);
    wall.position.set(x, 1.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    walls.push({ mesh: wall, x, z, width, depth });
}

// ===== СОЗДАЁМ КОМНАТЫ =====
// Комната 1 (стартовая) — центр (0, 0)
createWall(0, -5, 10, 0.5);      // задняя
createWall(-5, 0, 0.5, 10);      // левая
createWall(5, 0, 0.5, 10);       // правая
createWall(0, 5, 4, 0.5);        // передняя (с дырой под дверь)

// Комната 2 (справа) — центр (15, 0)
createWall(15, -5, 10, 0.5);     // задняя
createWall(10, 0, 0.5, 10);      // левая (общая со стеной комнаты 1)
createWall(20, 0, 0.5, 10);      // правая
createWall(15, 5, 10, 0.5);      // передняя

// Комната 3 (снизу) — центр (0, -15)
createWall(0, -20, 10, 0.5);     // задняя
createWall(-5, -15, 0.5, 10);    // левая
createWall(5, -15, 0.5, 10);     // правая
createWall(0, -10, 4, 0.5);      // передняя (с дырой)

// Коридор между комнатами (двери)
// Дверь между комнатой 1 и 2
const door1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 2.5, 3),
    doorMaterial
);
door1.position.set(10, 1.25, 0);
door1.castShadow = true;
scene.add(door1);

// Дверь между комнатой 1 и 3
const door2 = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.5, 0.3),
    doorMaterial
);
door2.position.set(0, 1.25, -10);
door2.castShadow = true;
scene.add(door2);

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

// Жуки в разных комнатах
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

    // Проверка попадания в жуков
    const bugMeshes = bugs.filter(b => b.alive).map(b => b.mesh);
    const bugIntersects = raycaster.intersectObjects(bugMeshes);

    if (bugIntersects.length > 0) {
        const hitBug = bugIntersects[0].object;
        shootBullet(hitBug.position.x, hitBug.position.y, hitBug.position.z);
        return;
    }

    // Проверка попадания в пол
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

// ===== СТОЛКНОВЕНИЯ СО СТЕНАМИ =====
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

    // Проверка столкновений (раздельно по X и Z)
    if (canMoveTo(newX, player.position.z)) {
        player.position.x = newX;
    }
    if (canMoveTo(player.position.x, newZ)) {
        player.position.z = newZ;
    }

    // Спрайт всегда смотрит на камеру (без наклона)
    player.lookAt(camera.position.x, player.position.y, camera.position.z);
    player.rotation.x = 0;
    player.rotation.z = 0;
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