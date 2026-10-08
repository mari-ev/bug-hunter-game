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
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
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

createWall(0, -10, 0);
createWall(0, 10, 0);
createWall(-10, 0, Math.PI / 2);
createWall(10, 0, Math.PI / 2);

// ===== ПЕРСОНАЖ =====
const playerGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x7ee787 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 0.8, 0);
player.castShadow = true;
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

    bugs.push({
        mesh: bug,
        alive: true
    });
}

// Три жука в разных местах
spawnBug(3, -3);
spawnBug(-4, 2);
spawnBug(5, 4);

// ===== ПУЛИ =====
const bullets = [];

function shootBullet(targetX, targetY, targetZ) {
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0x7ee787,
        emissive: 0x7ee787,
        emissiveIntensity: 1
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(player.position);
    bullet.position.y = 1;
    scene.add(bullet);

    // Направление к цели
    const dx = targetX - bullet.position.x;
    const dy = targetY - bullet.position.y;
    const dz = targetZ - bullet.position.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    bullets.push({
        mesh: bullet,
        dx: (dx / length) * 0.4,
        dy: (dy / length) * 0.4,
        dz: (dz / length) * 0.4,
        life: 100
    });
}

// ===== УПРАВЛЕНИЕ КЛАВИАТУРОЙ =====
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ===== УПРАВЛЕНИЕ ТАПОМ =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetPosition = new THREE.Vector3(0, 0.8, 0);
let hasTarget = false;

function onTap(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Проверка попадания в жуков
    const bugMeshes = bugs.filter(b => b.alive).map(b => b.mesh);
    const bugIntersects = raycaster.intersectObjects(bugMeshes);

    if (bugIntersects.length > 0) {
        // Попал в жука — стреляем
        const hitBug = bugIntersects[0].object;
        shootBullet(hitBug.position.x, hitBug.position.y, hitBug.position.z);
        return;
    }

    // Проверка попадания в пол
    const floorIntersects = raycaster.intersectObject(floor);

    if (floorIntersects.length > 0) {
        const point = floorIntersects[0].point;
        targetPosition.set(point.x, 0.8, point.z);
        hasTarget = true;

        targetPosition.x = Math.max(-9, Math.min(9, targetPosition.x));
        targetPosition.z = Math.max(-9, Math.min(9, targetPosition.z));
    }
}

renderer.domElement.addEventListener('click', (e) => {
    onTap(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onTap(touch.clientX, touch.clientY);
}, { passive: false });

// ===== ДВИЖЕНИЕ =====
const speed = 0.08;

function updatePlayer() {
    let moved = false;

    if (keys['w'] || keys['arrowup']) { player.position.z -= speed; moved = true; }
    if (keys['s'] || keys['arrowdown']) { player.position.z += speed; moved = true; }
    if (keys['a'] || keys['arrowleft']) { player.position.x -= speed; moved = true; }
    if (keys['d'] || keys['arrowright']) { player.position.x += speed; moved = true; }

    if (!moved && hasTarget) {
        const dx = targetPosition.x - player.position.x;
        const dz = targetPosition.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
            player.position.x += (dx / dist) * speed;
            player.position.z += (dz / dist) * speed;
        } else {
            hasTarget = false;
        }
    }

    player.position.x = Math.max(-9, Math.min(9, player.position.x));
    player.position.z = Math.max(-9, Math.min(9, player.position.z));
}

// ===== ПУЛИ (ОБНОВЛЕНИЕ) =====
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.x += b.dx;
        b.mesh.position.y += b.dy;
        b.mesh.position.z += b.dz;
        b.life--;

        // Проверка попадания в жука
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
const cameraOffset = new THREE.Vector3(0, 5, 7);

function updateCamera() {
    const targetX = player.position.x + cameraOffset.x;
    const targetY = player.position.y + cameraOffset.y;
    const targetZ = player.position.z + cameraOffset.z;

    camera.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ),
        0.05
    );
    camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
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