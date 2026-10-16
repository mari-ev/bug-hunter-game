const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');
const rotateLeftBtn = document.getElementById('rotate-left');
const rotateRightBtn = document.getElementById('rotate-right');

// ===== ТЕКСТУРЫ =====
const playerImg = new Image();
playerImg.src = 'assets/player.png';

const wallOuterImg = new Image();
wallOuterImg.src = 'assets/wall-outer.png';

// ===== РАЗМЕРЫ =====
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE = 96;
const WALL_HEIGHT = 120;   // высота вертикальной стены

// ===== КАРТА =====
const MAP = [
    "####################",
    "#..................#",
    "#..B....#....B.....#",
    "#.......#..........#",
    "#.......D..........#",
    "#.......#..........#",
    "#########..........#",
    "#..................#",
    "#....B.............#",
    "#..................#",
    "#..................#",
    "######D#############",
    "#..................#",
    "#..................#",
    "#.......B..........#",
    "#..................#",
    "####################"
];

// ===== МИР =====
const WORLD = {
    width: MAP[0].length * TILE,
    height: MAP.length * TILE
};

// ===== КАМЕРА =====
const camera = { x: 0, y: 0 };

// ===== УГОЛ =====
let rotationAngle = 0;

// ===== СТЕНЫ, ДВЕРИ =====
const walls = [];
const doors = [];

// ===== ПЕРСОНАЖ =====
const player = {
    x: 200,
    y: 200,
    width: 96,
    height: 96,
    speed: 8,
    targetX: 200,
    targetY: 200
};

// ===== ЖУКИ =====
const bugs = [];

// ===== ПУЛИ =====
const bullets = [];

// ===== СЧЁТ =====
let score = 0;

// ===== ПОСТРОЙКА =====
function buildMap() {
    walls.length = 0;
    doors.length = 0;
    bugs.length = 0;
    bullets.length = 0;

    for (let row = 0; row < MAP.length; row++) {
        for (let col = 0; col < MAP[row].length; col++) {
            const char = MAP[row][col];
            const x = col * TILE;
            const y = row * TILE;

            // Внешняя стена (по краям)
            const isOuter = row === 0 || row === MAP.length - 1 ||
                            col === 0 || col === MAP[0].length - 1;

            if (char === '#') {
                walls.push({ x, y, size: TILE, isOuter });
            } else if (char === 'D') {
                doors.push({ x, y, size: TILE });
            } else if (char === 'B') {
                bugs.push({
                    x: x + TILE / 2,
                    y: y + TILE / 2,
                    width: 40,
                    height: 24,
                    dx: (Math.random() - 0.5) * 1.5,
                    dy: (Math.random() - 0.5) * 1.5,
                    color: '#ff6b6b',
                    alive: true
                });
            }
        }
    }

    player.x = TILE * 1.5;
    player.y = TILE * 1.5;
    player.targetX = player.x;
    player.targetY = player.y;
}

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
    const half = width / 2;
    return !isWall(x - half, y - half) &&
           !isWall(x + half, y - half) &&
           !isWall(x - half, y + half) &&
           !isWall(x + half, y + half);
}

// ===== ЭКРАН → МИР =====
function screenToWorld(screenX, screenY) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let dx = screenX - centerX;
    let dy = screenY - centerY;

    const angle = -rotationAngle * Math.PI / 180;
    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

    return {
        x: rotatedX + centerX + camera.x,
        y: rotatedY + centerY + camera.y
    };
}

// ===== МИР → ЭКРАН =====
function worldToScreen(wx, wy) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = rotationAngle * Math.PI / 180;

    const dx = wx - camera.x - centerX;
    const dy = wy - camera.y - centerY;

    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

    return {
        x: rotatedX + centerX,
        y: rotatedY + centerY
    };
}

// ===== УПРАВЛЕНИЕ =====
function handleTap(screenX, screenY) {
    const world = screenToWorld(screenX, screenY);

    let hitBug = false;
    let closestBug = null;
    let closestDist = Infinity;

    for (const bug of bugs) {
        if (!bug.alive) continue;
        const distToBug = Math.sqrt(
            (world.x - bug.x) ** 2 + (world.y - bug.y) ** 2
        );
        const hitRadius = Math.max(bug.width, bug.height) / 2 + 50;
        if (distToBug < hitRadius && distToBug < closestDist) {
            closestBug = bug;
            closestDist = distToBug;
        }
    }

    if (closestBug) {
        shootAt(closestBug.x, closestBug.y);
        hitBug = true;
    }

    if (!hitBug) {
        player.targetX = world.x;
        player.targetY = world.y;
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

// ===== КНОПКИ =====
rotateLeftBtn.addEventListener('click', () => {
    rotationAngle = (rotationAngle - 90 + 360) % 360;
});

rotateRightBtn.addEventListener('click', () => {
    rotationAngle = (rotationAngle + 90) % 360;
});

// ===== СТРЕЛЬБА =====
function shootAt(targetX, targetY) {
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    bullets.push({
        x: player.x,
        y: player.y,
        dx: (dx / length) * 18,
        dy: (dy / length) * 18,
        size: 10,
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

    const margin = 100;
    camera.x = Math.max(-margin, Math.min(WORLD.width - canvas.width + margin, camera.x));
    camera.y = Math.max(-margin, Math.min(WORLD.height - canvas.height + margin, camera.y));

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
}

// ===== ОТРИСОВКА =====
function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = rotationAngle * Math.PI / 180;

    // ===== ПОВЁРНУТЫЙ МИР (пол, жуки, пули) =====
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.translate(-centerX, -centerY);
    ctx.translate(-camera.x, -camera.y);

    // Пол
    for (let row = 0; row < MAP.length; row++) {
        for (let col = 0; col < MAP[row].length; col++) {
            const char = MAP[row][col];
            const x = col * TILE;
            const y = row * TILE;

            if (char !== '#') {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(x, y, TILE, TILE);
                ctx.strokeStyle = '#252525';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, TILE, TILE);
            }
        }
    }

    // Тёмное основание стен (пол под стеной)
    walls.forEach(wall => {
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(wall.x, wall.y, wall.size, wall.size);
    });

    // Жуки
    bugs.forEach(bug => {
        if (bug.alive) drawBug(bug);
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

    // ===== ВЕРТИКАЛЬНЫЕ СТЕНЫ + ПЕРСОНАЖ (с сортировкой) =====
    const verticalObjects = [];

    walls.forEach(w => {
        verticalObjects.push({
            type: 'wall',
            worldX: w.x + w.size / 2,
            worldY: w.y + w.size,
            size: w.size,
            isOuter: w.isOuter
        });
    });

    doors.forEach(d => {
        verticalObjects.push({
            type: 'door',
            worldX: d.x + d.size / 2,
            worldY: d.y + d.size,
            size: d.size
        });
    });

    verticalObjects.push({
        type: 'player',
        worldX: player.x,
        worldY: player.y + player.height / 2
    });

    // Сортировка по экранному Y
    verticalObjects.forEach(obj => {
        const pos = worldToScreen(obj.worldX, obj.worldY);
        obj.screenY = pos.y;
        obj.screenX = pos.x;
    });

    verticalObjects.sort((a, b) => a.screenY - b.screenY);

    // Рисуем по порядку
    verticalObjects.forEach(obj => {
        if (obj.type === 'wall') {
            drawWallVertical(obj.screenX, obj.screenY, obj.size, obj.isOuter);
        } else if (obj.type === 'door') {
            drawDoorVertical(obj.screenX, obj.screenY, obj.size);
        } else if (obj.type === 'player') {
            drawPlayerVertical(obj.screenX, obj.screenY);
        }
    });
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

// ===== ВЕРТИКАЛЬНАЯ СТЕНА =====
function drawWallVertical(x, y, size, isOuter) {
    const height = WALL_HEIGHT;

    // Передняя грань
    if (isOuter && wallOuterImg.complete && wallOuterImg.naturalWidth > 0) {
        // Внешняя стена — текстура с окном
        ctx.drawImage(
            wallOuterImg,
            x - size / 2,
            y - height,
            size,
            height
        );
    } else {
        // Внутренняя стена — тёмно-серая
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x - size / 2, y - height, size, height);
    }

    // Верхняя грань (крыша)
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x - size / 2, y - height - 8, size, 8);

    // Обводка
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - size / 2, y - height - 8, size, height + 8);
}

// ===== ВЕРТИКАЛЬНАЯ ДВЕРЬ =====
function drawDoorVertical(x, y, size) {
    const height = WALL_HEIGHT;
    const doorWidth = size - 24;

    // Передняя грань
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x - doorWidth / 2, y - height, doorWidth, height);

    // Верхняя грань
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x - doorWidth / 2, y - height - 8, doorWidth, 8);

    // Ручка
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(x + doorWidth / 2 - 10, y - height / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Обводка
    ctx.strokeStyle = '#3a1a00';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - doorWidth / 2, y - height - 8, doorWidth, height + 8);
}

// ===== ВЕРТИКАЛЬНЫЙ ПЕРСОНАЖ =====
function drawPlayerVertical(x, y) {
    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 5, player.width / 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Спрайт
    if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(
            playerImg,
            x - player.width / 2,
            y - player.height,
            player.width,
            player.height
        );
    } else {
        ctx.fillStyle = '#7ee787';
        ctx.fillRect(x - player.width / 2, y - player.height, player.width, player.height);
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
    buildMap();
});

// ===== РАЗМЕР ОКНА =====
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ===== СТАРТ =====
buildMap();
loop();
