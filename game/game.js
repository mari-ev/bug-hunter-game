const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');

// ===== ЗАГРУЗКА СПРАЙТА ПЕРСОНАЖА =====
const playerImg = new Image();
playerImg.src = 'assets/player.png';

// ===== РАЗМЕРЫ =====
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ===== МИР =====
const WORLD = {
    width: 3000,
    height: 2000,
    tileSize: 96
};

// ===== КАМЕРА =====
const camera = { x: 0, y: 0 };

// ===== ПЕРСОНАЖ =====
const player = {
    x: 200,
    y: WORLD.height - 300,
    width: 64,
    height: 128,
    speed: 5,
    targetX: 200,
    targetY: WORLD.height - 300,
    color: '#7ee787'
};

// ===== СТЕНЫ =====
const walls = [];

function generateWalls() {
    walls.length = 0;
    const tile = WORLD.tileSize;
    const cols = Math.floor(WORLD.width / tile);
    const rows = Math.floor(WORLD.height / tile);

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
                walls.push({ x: x * tile, y: y * tile, size: tile });
                continue;
            }
            if (Math.random() < 0.25) {
                walls.push({ x: x * tile, y: y * tile, size: tile });
            }
        }
    }

    for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        const dist = Math.sqrt((w.x - player.x) ** 2 + (w.y - player.y) ** 2);
        if (dist < 300) walls.splice(i, 1);
    }
}

// ===== ЖУКИ =====
const bugs = [];

function spawnBug() {
    let x, y, tries = 0;
    do {
        x = Math.random() * (WORLD.width - 200) + 100;
        y = Math.random() * (WORLD.height - 200) + 100;
        tries++;
    } while (isWall(x, y) && tries < 50);

    bugs.push({
        x, y,
        width: 40,
        height: 24,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        color: '#ff6b6b',
        alive: true
    });
}

for (let i = 0; i < 10; i++) spawnBug();

// ===== ПУЛИ =====
const bullets = [];

// ===== СЧЁТ =====
let score = 0;

// ===== КОЛЛИЗИИ =====
function isWall(x, y) {
    for (const w of walls) {
        if (x > w.x && x < w.x + w.size && y > w.y && y < w.y + w.size) {
            return true;
        }
    }
    return false;
}

function canMove(x, y, width, height) {
    const halfW = width / 2;
    const halfH = height / 2;
    return !isWall(x - halfW, y - halfH) &&
           !isWall(x + halfW, y - halfH) &&
           !isWall(x - halfW, y + halfH) &&
           !isWall(x + halfW, y + halfH);
}

// ===== УПРАВЛЕНИЕ =====
function handleTap(screenX, screenY) {
    const worldX = screenX + camera.x;
    const worldY = screenY + camera.y;

    let hitBug = false;
    for (const bug of bugs) {
        if (!bug.alive) continue;
        const dx = (worldX - bug.x) / (bug.width / 2);
        const dy = (worldY - bug.y) / (bug.height / 2);
        if (dx * dx + dy * dy < 1) {
            shootAt(bug.x, bug.y);
            hitBug = true;
            break;
        }
    }

    if (!hitBug) {
        player.targetX = worldX;
        player.targetY = worldY;
    }
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    handleTap(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    handleTap(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

function shootAt(targetX, targetY) {
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    bullets.push({
        x: player.x,
        y: player.y,
        dx: (dx / length) * 15,
        dy: (dy / length) * 15,
        size: 8,
        color: '#7ee787'
    });
}

// ===== ОБНОВЛЕНИЕ =====
function update() {
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
        const moveX = (dx / dist) * player.speed;
        const moveY = (dy / dist) * player.speed;

        if (canMove(player.x + moveX, player.y, player.width / 2, player.height / 2)) {
            player.x += moveX;
        }
        if (canMove(player.x, player.y + moveY, player.width / 2, player.height / 2)) {
            player.y += moveY;
        }
    }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD.width - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD.height - canvas.height, camera.y));

    bugs.forEach(bug => {
        if (!bug.alive) return;
        const nextX = bug.x + bug.dx;
        const nextY = bug.y + bug.dy;

        if (canMove(nextX, bug.y, bug.width, bug.height)) bug.x = nextX;
        else bug.dx *= -1;

        if (canMove(bug.x, nextY, bug.width, bug.height)) bug.y = nextY;
        else bug.dy *= -1;
    });

    bullets.forEach((bullet, index) => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        if (bullet.x < 0 || bullet.x > WORLD.width || bullet.y < 0 || bullet.y > WORLD.height) {
            bullets.splice(index, 1);
        }
    });

    bullets.forEach((bullet, bIndex) => {
        bugs.forEach((bug) => {
            if (!bug.alive) return;
            const dist = Math.sqrt((bullet.x - bug.x) ** 2 + (bullet.y - bug.y) ** 2);
            if (dist < bug.width) {
                bug.alive = false;
                score++;
                scoreEl.textContent = score;
                bullets.splice(bIndex, 1);
            }
        });
    });

    for (let i = bugs.length - 1; i >= 0; i--) {
        if (!bugs[i].alive) {
            bugs.splice(i, 1);
            spawnBug();
        }
    }
}

// ===== ОТРИСОВКА =====
function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Пол
    const horizonY = camera.y - 800;
    const floorBottom = camera.y + canvas.height + 300;
    const vanishingX = camera.x + canvas.width / 2;
    const vanishingY = horizonY;

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(camera.x - 800, floorBottom);
    ctx.lineTo(camera.x + canvas.width + 800, floorBottom);
    ctx.lineTo(vanishingX, vanishingY);
    ctx.closePath();
    ctx.fill();

    const tile = WORLD.tileSize;
    const startX = Math.floor(camera.x / tile) * tile - tile * 2;
    const endX = camera.x + canvas.width + tile * 2;
    const startY = Math.floor(camera.y / tile) * tile - tile * 2;
    const endY = camera.y + canvas.height + tile * 2;

    for (let x = startX; x < endX; x += tile) {
        for (let y = startY; y < endY; y += tile) {
            const screenX = x;
            const screenY = y + (y - camera.y) * 0.4;
            ctx.strokeStyle = '#252525';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, tile, tile * 0.5);
        }
    }

    // Сортировка объектов
    const allObjects = [
        ...walls.map(w => ({ type: 'wall', y: w.y + w.size, data: w })),
        ...bugs.filter(b => b.alive).map(b => ({ type: 'bug', y: b.y + b.height / 2, data: b })),
        { type: 'player', y: player.y + player.height / 2, data: player }
    ].sort((a, b) => a.y - b.y);

    allObjects.forEach(obj => {
        if (obj.type === 'wall') drawWall(obj.data);
        else if (obj.type === 'bug') drawBug(obj.data);
        else if (obj.type === 'player') drawPlayer(obj.data);
    });

    // Пули
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    ctx.restore();
}

// ===== СТЕНА =====
function drawWall(wall) {
    const size = wall.size;
    const depth = 24;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(wall.x + size, wall.y + size);
    ctx.lineTo(wall.x + size + 20, wall.y + size);
    ctx.lineTo(wall.x + size + 20, wall.y + size + 10);
    ctx.lineTo(wall.x + size, wall.y + size + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(wall.x, wall.y - depth, size, depth);

    ctx.fillStyle = '#333';
    ctx.fillRect(wall.x, wall.y - depth, size, size);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x, wall.y - depth, size, size);
}

// ===== ЖУК =====
function drawBug(bug) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(bug.x + 8, bug.y + 8, bug.width / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bug.color;
    ctx.beginPath();
    ctx.ellipse(bug.x, bug.y, bug.width / 2, bug.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
}

// ===== ПЕРСОНАЖ (СПРАЙТ) =====
function drawPlayer(p) {
    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(p.x + 10, p.y + p.height / 2 + 10, p.width / 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Спрайт персонажа
    if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(
            playerImg,
            p.x - p.width / 2,
            p.y - p.height / 2,
            p.width,
            p.height
        );
    } else {
        // Заглушка, пока спрайт не загрузился
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
    }
}

// ===== ЦИКЛ =====
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// ===== РЕСТАРТ =====
restartBtn.addEventListener('click', () => {
    score = 0;
    scoreEl.textContent = 0;
    bugs.length = 0;
    bullets.length = 0;
    player.x = 200;
    player.y = WORLD.height - 300;
    player.targetX = 200;
    player.targetY = WORLD.height - 300;
    generateWalls();
    for (let i = 0; i < 10; i++) spawnBug();
});

// ===== РАЗМЕР ОКНА =====
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ===== СТАРТ =====
generateWalls();
loop();