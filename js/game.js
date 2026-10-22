// =============================================================
// Dungeon RPG - JavaScript puro (sem Godot)
// Um roguelike 2D top-down em HTML5 Canvas.
//
// Teclado : WASD / setas = mover, encostar no monstro = atacar
//           Q = beber pocao, P = pausar, R = reiniciar, Espaco = golpe
// Mobile  : joystick virtual na metade esquerda da tela
//           botoes ATK / Q / P / R na direita
// =============================================================

// ---------- Configuracoes ----------
const TILE = 22;
const GRID_W = 48;
const GRID_H = 28;
const WINDOW_W = GRID_W * TILE;   // 1056
const WINDOW_H = GRID_H * TILE;   // 616

// ---------- Cores ----------
const COL_BG = "#15151f";
const COL_WALL = "#2b2b3c";
const COL_WALL_EDGE = "#1c1c28";
const COL_FLOOR = "#4a4a63";
const COL_FLOOR_ALT = "#444459";
const COL_PLAYER = "#5fd7ff";
const COL_POTION = "#7cfc9e";
const COL_TEXT_DIM = "#9a9ab5";
const COL_HP_BAR = "#7cfc00";

// ---------- Heroi ----------
const BASE_MAX_HP = 30;
const BASE_ATK_MIN = 4;
const BASE_ATK_MAX = 6;

// ---------- Tempos (segundos) ----------
const PLAYER_STEP_CD = 0.12;
const PLAYER_ATTACK_CD = 0.30;
const PLAYER_BLOCK_CD = 0.15;
const ENEMY_ATK_DELAY = 1.0;

// ---------- Regras ----------
const POTION_HEAL = 12;
const CHASE_RANGE = 9;
const FLOOR_CLEAR_HEAL = 0.20;
const MIN_DAMAGE = 1;

// ---------- Progressao ----------
const LEVEL_MAX_HP = 3;
const LEVEL_HEAL = 8;
const XP_BASE = 4;
const XP_PER_FLOOR = 2;

// ---------- Estados ----------
const State = { PLAYING: 0, DEAD: 1 };

// ---------- RNG ----------
const rng = {
    int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    randf() { return Math.random(); }
};

// ---------- Estado do jogo ----------
let state = State.PLAYING;
let isPaused = false;

let playerPos = { x: 1, y: 1 };
let playerHp = BASE_MAX_HP;
let playerMaxHp = BASE_MAX_HP;
let playerAtkMin = BASE_ATK_MIN;
let playerAtkMax = BASE_ATK_MAX;
let playerCd = 0.0;
let facing = { x: 1, y: 0 };
let playerWalkUntil = 0.0;

let armorId = "";

let level = 1;
let xp = 0;
let xpNext = 14;

let floorNum = 1;
let elapsed = 0.0;
let message = "";

let enemies = [];
let potions = [];
let potionCount = 0;
let armorPickups = [];

let dungeonGrid = [];
let dungeonRooms = [];
let safeRoom = null;

// efeitos visuais de dano
let playerHurt = 0.0;
let damageFlash = 0.0;
let shakeTime = 0.0;
let floaters = [];

// ---------- Monstros ----------
const monsterTypes = {
    rato:      { name: "Rato",      color: "#9ee37d", shape: "circle", hp_mult: 0.55, atk_mult: 0.70, xp_mult: 0.70, step_delay: 0.36, size: 0.26 },
    esqueleto: { name: "Esqueleto", color: "#e8e8f0", shape: "square", hp_mult: 1.00, atk_mult: 1.00, xp_mult: 1.00, step_delay: 0.50, size: 0.34 },
    orc:       { name: "Orc",       color: "#ff8a3d", shape: "square", hp_mult: 1.70, atk_mult: 1.30, xp_mult: 1.70, step_delay: 0.62, size: 0.40 },
    golem:     { name: "Golem",     color: "#b07cff", shape: "circle", hp_mult: 2.50, atk_mult: 1.10, xp_mult: 2.20, step_delay: 0.85, size: 0.44 }
};

// ---------- Armaduras ----------
const armorItems = {
    cobre: { name: "Armadura de Cobre", short: "Cobre", color: "#d98a5a", reduce: 2, tier: 1 },
    ferro: { name: "Armadura de Ferro", short: "Ferro", color: "#c9d3de", reduce: 4, tier: 2 }
};

// ---------- Sprites (pixel art 16x16, 2 quadros quando 32x16) ----------
const SPRITE_FILES = {
    heroi: "../assets/sprites/heroi.png",
    rato: "../assets/sprites/rato.png",
    esqueleto: "../assets/sprites/esqueleto.png",
    orc: "../assets/sprites/orc.png",
    golem: "../assets/sprites/golem.png",
    pocao: "../assets/sprites/pocao.png",
    cobre: "../assets/sprites/armadura_cobre.png",
    ferro: "../assets/sprites/armadura_ferro.png"
};

const sprites = {};

function loadSprites() {
    for (const key in SPRITE_FILES) {
        const img = new Image();
        img.src = SPRITE_FILES[key];
        sprites[key] = img;
    }
}

function spriteReady(key) {
    const img = sprites[key];
    return !!img && img.complete && img.naturalWidth > 0;
}

function spriteFrameCount(key) {
    const img = sprites[key];
    if (!img || !img.naturalWidth) return 1;
    return Math.max(1, Math.floor(img.naturalWidth / 16));
}

// =============================================================
// GERADOR DE MASMORRA
// =============================================================

function roomOverlaps(room, rooms) {
    const padded = { x: room.x - 1, y: room.y - 1, w: room.w + 2, h: room.h + 2 };
    for (let i = 0; i < rooms.length; i++) {
        const o = rooms[i];
        if (padded.x < o.x + o.w && padded.x + padded.w > o.x &&
            padded.y < o.y + o.h && padded.y + padded.h > o.y) return true;
    }
    return false;
}

function carveRoom(grid, room) {
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            if (grid[y] && grid[y][x] !== undefined) grid[y][x] = 1;
        }
    }
}

function carveH(grid, x0, x1, y) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        if (grid[y] && grid[y][x] !== undefined) grid[y][x] = 1;
    }
}

function carveV(grid, y0, y1, x) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        if (grid[y] && grid[y][x] !== undefined) grid[y][x] = 1;
    }
}

function carveCorridor(grid, a, b) {
    if (rng.randf() < 0.5) {
        carveH(grid, a.x, b.x, a.y);
        carveV(grid, a.y, b.y, b.x);
    } else {
        carveV(grid, a.y, b.y, a.x);
        carveH(grid, a.x, b.x, b.y);
    }
}

function generateDungeon(w, h) {
    const grid = [];
    for (let y = 0; y < h; y++) grid[y] = new Array(w).fill(0); // 0 = parede

    const rooms = [];
    for (let i = 0; i < 60; i++) {
        const rw = rng.int(4, 9);
        const rh = rng.int(4, 9);
        const rx = rng.int(1, Math.max(1, w - rw - 1));
        const ry = rng.int(1, Math.max(1, h - rh - 1));
        const room = { x: rx, y: ry, w: rw, h: rh };

        if (roomOverlaps(room, rooms)) continue;

        carveRoom(grid, room);
        if (rooms.length > 0) {
            const prev = rooms[rooms.length - 1];
            carveCorridor(grid,
                { x: prev.x + Math.floor(prev.w / 2), y: prev.y + Math.floor(prev.h / 2) },
                { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) });
        }
        rooms.push(room);
    }

    if (rooms.length === 0) {
        const fallback = { x: 2, y: 2, w: 12, h: 8 };
        carveRoom(grid, fallback);
        rooms.push(fallback);
    }

    dungeonGrid = grid;
    dungeonRooms = rooms;

    return {
        startPos: {
            x: rooms[0].x + Math.floor(rooms[0].w / 2),
            y: rooms[0].y + Math.floor(rooms[0].h / 2)
        }
    };
}

function isFloorCell(x, y) {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
    if (!dungeonGrid[y]) return false;
    return dungeonGrid[y][x] === 1;
}

// Zona segura = sala onde o jogador nasce. Monstros nao entram e nao atacam aqui.
function isSafeCell(x, y) {
    if (!safeRoom) return false;
    return x >= safeRoom.x && x < safeRoom.x + safeRoom.w &&
           y >= safeRoom.y && y < safeRoom.y + safeRoom.h;
}

function randomFloorCell() {
    if (dungeonRooms.length === 0) return { x: -1, y: -1 };
    const room = dungeonRooms[rng.int(0, dungeonRooms.length - 1)];
    const x = rng.int(room.x, room.x + room.w - 1);
    const y = rng.int(room.y, room.y + room.h - 1);
    if (!isFloorCell(x, y)) return { x: -1, y: -1 };
    return { x: x, y: y };
}

// =============================================================
// CONSTRUCAO DO ANDAR
// =============================================================

function buildFloor(first) {
    const info = generateDungeon(GRID_W, GRID_H);
    playerPos = { x: info.startPos.x, y: info.startPos.y };
    facing = { x: 1, y: 0 };

    safeRoom = {
        x: dungeonRooms[0].x,
        y: dungeonRooms[0].y,
        w: dungeonRooms[0].w,
        h: dungeonRooms[0].h
    };

    enemies = [];
    potions = [];
    armorPickups = [];
    playerCd = 0.0;
    playerWalkUntil = 0.0;

    playerHurt = 0.0;
    damageFlash = 0.0;
    shakeTime = 0.0;
    floaters = [];

    spawnEnemies();
    spawnPotions();
    spawnArmors();

    if (first) {
        message = "Bem-vindo! Ache pocoes (Q) e armaduras. Ande contra um monstro para atacar.";
    } else {
        message = "Andar " + floorNum + "! Vida recuperada em 20%. Monstros mais fortes.";
    }

    updateHUD();
}

function allowedTypes() {
    const t = ["rato", "esqueleto"];
    if (floorNum >= 2) t.push("orc");
    if (floorNum >= 3) t.push("golem");
    return t;
}

function makeEnemy(cell) {
    const types = allowedTypes();
    const typeId = types[rng.int(0, types.length - 1)];
    const t = monsterTypes[typeId];

    const baseHp = 5 + (floorNum - 1) * 2;
    const baseMin = 1 + Math.floor(floorNum / 2);
    const baseMax = 2 + floorNum;

    const hp = Math.max(1, Math.round(baseHp * t.hp_mult));
    const atkMin = Math.max(1, Math.round(baseMin * t.atk_mult));
    const atkMax = Math.max(atkMin + 1, Math.round(baseMax * t.atk_mult));

    return {
        type: typeId,
        pos: { x: cell.x, y: cell.y },
        hp: hp,
        maxHp: hp,
        atk_min: atkMin,
        atk_max: atkMax,
        step_delay: t.step_delay,
        step_timer: rng.randf() * t.step_delay,
        atk_delay: ENEMY_ATK_DELAY,
        atk_timer: rng.randf() * ENEMY_ATK_DELAY,
        flash: 0.0,
        walk_until: 0.0
    };
}

function enemyIndexAt(x, y) {
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].pos.x === x && enemies[i].pos.y === y) return i;
    }
    return -1;
}

function armorIndexAt(cell) {
    for (let i = 0; i < armorPickups.length; i++) {
        if (armorPickups[i].pos.x === cell.x && armorPickups[i].pos.y === cell.y) return i;
    }
    return -1;
}

function spawnEnemies() {
    const count = 3 + floorNum;
    let attempts = 0;
    while (enemies.length < count && attempts < 1200) {
        attempts++;
        const cell = randomFloorCell();
        if (cell.x === -1) continue;
        if (Math.hypot(cell.x - playerPos.x, cell.y - playerPos.y) < 7) continue;
        if (isSafeCell(cell.x, cell.y)) continue;
        if (enemyIndexAt(cell.x, cell.y) >= 0) continue;
        enemies.push(makeEnemy(cell));
    }
}

function spawnPotions() {
    const count = 2 + Math.floor(floorNum / 3);
    let attempts = 0;
    while (potions.length < count && attempts < 600) {
        attempts++;
        const cell = randomFloorCell();
        if (cell.x === -1) continue;
        if (cell.x === playerPos.x && cell.y === playerPos.y) continue;
        if (isSafeCell(cell.x, cell.y)) continue;
        if (enemyIndexAt(cell.x, cell.y) >= 0) continue;
        if (potions.some(p => p.x === cell.x && p.y === cell.y)) continue;
        potions.push(cell);
    }
}

function armorTier() {
    if (armorId === "") return 0;
    return armorItems[armorId].tier;
}

function spawnArmors() {
    let wanted = "cobre";
    if (floorNum >= 3) wanted = "ferro";
    if (armorItems[wanted].tier <= armorTier()) return;

    const chance = wanted === "cobre" ? 0.75 : 0.65;
    if (rng.randf() > chance) return;

    let attempts = 0;
    while (attempts < 400) {
        attempts++;
        const cell = randomFloorCell();
        if (cell.x === -1) continue;
        if (cell.x === playerPos.x && cell.y === playerPos.y) continue;
        if (isSafeCell(cell.x, cell.y)) continue;
        if (enemyIndexAt(cell.x, cell.y) >= 0) continue;
        if (armorIndexAt(cell) >= 0) continue;
        armorPickups.push({ pos: cell, id: wanted });
        break;
    }
}

// =============================================================
// ACOES DO JOGADOR
// =============================================================

function readKeyboardDirection() {
    if (keysDown["w"] || keysDown["arrowup"]) return { x: 0, y: -1 };
    if (keysDown["s"] || keysDown["arrowdown"]) return { x: 0, y: 1 };
    if (keysDown["a"] || keysDown["arrowleft"]) return { x: -1, y: 0 };
    if (keysDown["d"] || keysDown["arrowright"]) return { x: 1, y: 0 };
    return { x: 0, y: 0 };
}

function readJoystickDirection() {
    if (!touchState.active) return { x: 0, y: 0 };
    const dx = touchState.dx;
    const dy = touchState.dy;
    if (Math.hypot(dx, dy) < 18) return { x: 0, y: 0 };
    if (Math.abs(dx) >= Math.abs(dy)) return { x: dx > 0 ? 1 : -1, y: 0 };
    return { x: 0, y: dy > 0 ? 1 : -1 };
}

function currentDirection() {
    const joy = readJoystickDirection();
    if (joy.x !== 0 || joy.y !== 0) return joy;
    const key = readKeyboardDirection();
    if (key.x !== 0 || key.y !== 0) return key;
    return { x: facing.x, y: facing.y };
}

function playerAct(dir) {
    if (state !== State.PLAYING || isPaused || playerCd > 0) return;

    facing = { x: dir.x, y: dir.y };

    const targetX = playerPos.x + dir.x;
    const targetY = playerPos.y + dir.y;

    const idx = enemyIndexAt(targetX, targetY);
    if (idx >= 0) {
        playerCd = PLAYER_ATTACK_CD;
        attackEnemy(idx);
        return;
    }

    if (!isFloorCell(targetX, targetY)) {
        playerCd = PLAYER_BLOCK_CD;
        message = "Uma parede bloqueia o caminho.";
        updateHUD();
        return;
    }

    playerCd = PLAYER_STEP_CD;
    playerPos = { x: targetX, y: targetY };
    playerWalkUntil = elapsed + 0.18;
    message = isSafeCell(targetX, targetY)
        ? "Zona segura: monstros nao entram aqui."
        : "";

    const pIdx = potions.findIndex(p => p.x === targetX && p.y === targetY);
    if (pIdx >= 0) {
        potions.splice(pIdx, 1);
        potionCount++;
        message = "Voce pegou uma pocao! (tem " + potionCount + ") - aperte Q";
    }

    const aIdx = armorIndexAt({ x: targetX, y: targetY });
    if (aIdx >= 0) {
        const it = armorPickups[aIdx];
        armorPickups.splice(aIdx, 1);
        equipArmor(it.id);
    }

    updateHUD();
}

function playerAttack() {
    if (state !== State.PLAYING || isPaused || playerCd > 0) return;

    const dir = currentDirection();
    facing = { x: dir.x, y: dir.y };

    const tries = [
        { x: dir.x, y: dir.y },
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    for (let i = 0; i < tries.length; i++) {
        const t = tries[i];
        if (t.x === 0 && t.y === 0) continue;
        const idx = enemyIndexAt(playerPos.x + t.x, playerPos.y + t.y);
        if (idx >= 0) {
            facing = { x: t.x, y: t.y };
            playerCd = PLAYER_ATTACK_CD;
            attackEnemy(idx);
            return;
        }
    }

    playerCd = 0.18;
    message = "Golpe no ar. Encoste em um monstro para atacar.";
    updateHUD();
}

function attackEnemy(idx) {
    const e = enemies[idx];
    const t = monsterTypes[e.type];
    const dmg = rng.int(playerAtkMin, playerAtkMax);

    e.hp -= dmg;
    e.flash = 0.16;

    if (e.hp <= 0) {
        const gained = Math.floor((XP_BASE + floorNum * XP_PER_FLOOR) * t.xp_mult);
        const dropId = rollArmorDrop(e.type);
        const dropPos = { x: e.pos.x, y: e.pos.y };

        enemies.splice(idx, 1);

        message = t.name + " derrotado! (-" + dmg + ")  +" + gained + " XP";
        if (dropId !== "") {
            armorPickups.push({ pos: dropPos, id: dropId });
            message += "  DROPOU " + armorItems[dropId].short + "!";
        }

        gainXp(gained);
        if (!checkFloorClear()) updateHUD();
    } else {
        message = "Voce acertou o " + t.name + ". (-" + dmg + ")";
        updateHUD();
    }
}

function rollArmorDrop(typeId) {
    let chance = 0.0;
    let id = "";
    if (typeId === "esqueleto") { chance = 0.06; id = "cobre"; }
    else if (typeId === "orc") { chance = 0.30; id = "cobre"; }
    else if (typeId === "golem") { chance = 0.40; id = "ferro"; }

    if (id === "" || rng.randf() > chance) return "";
    if (armorItems[id].tier <= armorTier()) return "";
    return id;
}

function equipArmor(id) {
    if (armorItems[id].tier <= armorTier()) {
        message = "Achou " + armorItems[id].name + ", mas a sua armadura ja e melhor.";
        return;
    }
    armorId = id;
    message = "Equipou " + armorItems[id].name + "! Dano recebido -" + armorItems[id].reduce + ".";
}

function drinkPotion() {
    if (state !== State.PLAYING || isPaused) return;

    if (potionCount <= 0) {
        message = "Sem pocoes. Procure as bolinhas verdes no chao.";
    } else if (playerHp >= playerMaxHp) {
        message = "Sua vida ja esta cheia.";
    } else {
        potionCount--;
        const before = playerHp;
        playerHp = Math.min(playerMaxHp, playerHp + POTION_HEAL);
        message = "Pocao: +" + (playerHp - before) + " de vida. (restam " + potionCount + ")";
    }
    updateHUD();
}

function togglePause() {
    if (state !== State.PLAYING) return;
    isPaused = !isPaused;
    message = isPaused ? "PAUSADO - aperte P para continuar." : "Continuando...";
    updateHUD();
}

function gainXp(amount) {
    xp += amount;
    while (xp >= xpNext) {
        xp -= xpNext;
        level++;
        playerMaxHp += LEVEL_MAX_HP;
        playerAtkMin += 1;
        playerAtkMax += 1;
        playerHp = Math.min(playerMaxHp, playerHp + LEVEL_HEAL);
        xpNext = 14 + (level - 1) * 10;
        message = "NIVEL " + level + "! +" + LEVEL_MAX_HP + " vida max, +" + LEVEL_HEAL +
                  " vida, dano " + playerAtkMin + "-" + playerAtkMax + ".";
    }
}

function checkFloorClear() {
    if (enemies.length > 0) return false;

    floorNum++;
    const heal = Math.floor(playerMaxHp * FLOOR_CLEAR_HEAL);
    playerHp = Math.min(playerMaxHp, playerHp + heal);

    buildFloor(false);
    return true;
}

// =============================================================
// ACOES DOS MONSTROS
// =============================================================

function armorReduce() {
    if (armorId === "") return 0;
    return armorItems[armorId].reduce;
}

function enemyAttack(e) {
    const t = monsterTypes[e.type];
    const raw = rng.int(e.atk_min, e.atk_max);
    const blocked = armorReduce();
    const dmg = Math.max(MIN_DAMAGE, raw - blocked);

    playerHp -= dmg;

    // animacao de dano: piscada, tremor, vinheta vermelha e numero flutuante
    playerHurt = 0.5;
    damageFlash = 1.0;
    shakeTime = 0.22;
    floaters.push({
        x: playerPos.x,
        y: playerPos.y,
        text: "-" + dmg,
        life: 0.9,
        maxLife: 0.9,
        color: "#ff8080"
    });

    let extra = "";
    if (blocked > 0) {
        extra = " (armadura segurou " + Math.min(blocked, Math.max(0, raw - MIN_DAMAGE)) + ")";
    }

    if (playerHp <= 0) {
        playerHp = 0;
        state = State.DEAD;
        message = "Voce morreu no andar " + floorNum + " (nivel " + level + ", " +
                  fmtTime(elapsed) + "). Pressione R.";
        updateHUD();
        return;
    }

    message = "O " + t.name + " te atacou! (-" + dmg + " de vida)" + extra;
    updateHUD();
}

function canEnemyStep(cell) {
    if (!isFloorCell(cell.x, cell.y)) return false;
    if (isSafeCell(cell.x, cell.y)) return false;
    if (cell.x === playerPos.x && cell.y === playerPos.y) return false;
    if (enemyIndexAt(cell.x, cell.y) >= 0) return false;
    return true;
}

function moveEnemy(e, d) {
    const dist = Math.max(Math.abs(d.x), Math.abs(d.y));
    let step = { x: 0, y: 0 };

    if (dist <= CHASE_RANGE) {
        if (Math.abs(d.x) >= Math.abs(d.y)) {
            step = { x: Math.sign(d.x), y: 0 };
        } else {
            step = { x: 0, y: Math.sign(d.y) };
        }

        if (!canEnemyStep({ x: e.pos.x + step.x, y: e.pos.y + step.y })) {
            const alt = step.x !== 0
                ? { x: 0, y: Math.sign(d.y) }
                : { x: Math.sign(d.x), y: 0 };

            if ((alt.x !== 0 || alt.y !== 0) &&
                canEnemyStep({ x: e.pos.x + alt.x, y: e.pos.y + alt.y })) {
                step = alt;
            } else {
                step = { x: 0, y: 0 };
            }
        }
    } else if (rng.randf() < 0.35) {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        step = dirs[rng.int(0, dirs.length - 1)];
        if (!canEnemyStep({ x: e.pos.x + step.x, y: e.pos.y + step.y })) {
            step = { x: 0, y: 0 };
        }
    }

    if (step.x === 0 && step.y === 0) return false;

    e.pos = { x: e.pos.x + step.x, y: e.pos.y + step.y };
    e.walk_until = elapsed + 0.22;
    return true;
}

// =============================================================
// HUD
// =============================================================

function fmtTime(s) {
    const total = Math.floor(s);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m + ":" + (sec < 10 ? "0" : "") + sec;
}

function armorLabel() {
    if (armorId === "") return "nenhuma";
    return armorItems[armorId].short + " (-" + armorItems[armorId].reduce + ")";
}

function buildLegend() {
    const el = document.getElementById("hudLegend");
    if (!el) return;
    let html = "Monstros: ";
    const parts = [];
    for (const key in monsterTypes) {
        const m = monsterTypes[key];
        parts.push('<span style="color:' + m.color + '">' + m.name + "</span>");
    }
    el.innerHTML = html + parts.join(" &middot; ");
}

let lastHud = {};

function setText(id, value) {
    if (lastHud[id] === value) return;
    lastHud[id] = value;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateHUD() {
    setText("hudLevel", "Nv " + level);
    setText("hudHp", "HP " + Math.max(0, playerHp) + "/" + playerMaxHp);
    setText("hudXp", "XP " + xp + "/" + xpNext);
    setText("hudArmor", "Armadura: " + armorLabel());
    setText("hudFloor", "Andar " + floorNum);
    setText("hudEnemies", "Inimigos " + enemies.length);
    setText("hudPotions", "Pocoes " + potionCount);
    setText("hudTime", "Tempo " + fmtTime(elapsed));
    setText("hudMsg", message || "\u00a0");
}

// =============================================================
// DESENHO
// =============================================================

function cellCenter(x, y) {
    return { x: x * TILE + TILE * 0.5, y: y * TILE + TILE * 0.5 };
}

function drawEllipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, WINDOW_W, WINDOW_H);

    // tremor de tela ao levar dano
    let shakeX = 0;
    let shakeY = 0;
    if (shakeTime > 0) {
        const power = 4.2 * (shakeTime / 0.22);
        shakeX = (Math.random() * 2 - 1) * power;
        shakeY = (Math.random() * 2 - 1) * power;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // chao e paredes
    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            const rx = x * TILE;
            const ry = y * TILE;
            if (isFloorCell(x, y)) {
                ctx.fillStyle = (x + y) % 2 === 0 ? COL_FLOOR : COL_FLOOR_ALT;
                ctx.fillRect(rx, ry, TILE, TILE);
            } else {
                ctx.fillStyle = COL_WALL;
                ctx.fillRect(rx, ry, TILE, TILE);
                ctx.fillStyle = COL_WALL_EDGE;
                ctx.fillRect(rx, ry, TILE, 2);
            }
        }
    }

    // zona segura (sala inicial): monstros nao entram
    if (safeRoom) {
        ctx.fillStyle = "rgba(124,252,158,0.055)";
        for (let y = safeRoom.y; y < safeRoom.y + safeRoom.h; y++) {
            for (let x = safeRoom.x; x < safeRoom.x + safeRoom.w; x++) {
                ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            }
        }

        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "rgba(124,252,158,0.40)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            safeRoom.x * TILE + 1,
            safeRoom.y * TILE + 1,
            safeRoom.w * TILE - 2,
            safeRoom.h * TILE - 2
        );
        ctx.setLineDash([]);
        ctx.lineWidth = 1;

        if (safeRoom.w >= 5) {
            ctx.fillStyle = "rgba(124,252,158,0.55)";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
                "ZONA SEGURA",
                (safeRoom.x + safeRoom.w / 2) * TILE,
                safeRoom.y * TILE + 11
            );
            ctx.textAlign = "left";
        }
    }

    // pocoes
    for (const p of potions) {
        const c = cellCenter(p.x, p.y);
        if (spriteReady("pocao")) {
            const s = 20;
            ctx.drawImage(sprites.pocao, 0, 0, 16, 16, c.x - s / 2, c.y - s / 2, s, s);
        } else {
            ctx.fillStyle = COL_POTION;
            ctx.beginPath();
            ctx.arc(c.x, c.y, TILE * 0.28, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // armaduras no chao
    for (const ap of armorPickups) {
        const c = cellCenter(ap.pos.x, ap.pos.y);
        if (spriteReady(ap.id)) {
            const s = 21;
            ctx.drawImage(sprites[ap.id], 0, 0, 16, 16, c.x - s / 2, c.y - s / 2, s, s);
        } else {
            ctx.fillStyle = armorItems[ap.id].color;
            ctx.fillRect(c.x - 6, c.y - 7, 12, 14);
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(c.x - 3, c.y - 7, 3, 14);
        }
    }

    // sombras
    for (const e of enemies) {
        const c = cellCenter(e.pos.x, e.pos.y);
        drawEllipse(ctx, c.x, c.y + 6, 6.5, 2.6, "rgba(0,0,0,0.30)");
    }
    const pc = cellCenter(playerPos.x, playerPos.y);
    drawEllipse(ctx, pc.x, pc.y + 6, 7.2, 2.9, "rgba(0,0,0,0.32)");

    // monstros
    for (const e of enemies) {
        const c = cellCenter(e.pos.x, e.pos.y);
        const t = monsterTypes[e.type];
        const walkBob = elapsed < e.walk_until ? -1.5 : 0;
        const frames = spriteFrameCount(e.type);
        const walking = elapsed < e.walk_until;

        if (spriteReady(e.type)) {
            const size = TILE * (0.75 + t.size);
            const frame = frames > 1 && walking
                ? (Math.floor(elapsed * 8) + e.pos.x + e.pos.y) % frames
                : 0;

            ctx.drawImage(
                sprites[e.type],
                frame * 16, 0, 16, 16,
                c.x - size / 2, c.y - size / 2 + walkBob,
                size, size
            );

            if (e.flash > 0) {
                ctx.fillStyle = "rgba(255,80,80,0.45)";
                ctx.beginPath();
                ctx.arc(c.x, c.y + walkBob, size * 0.42, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            const size = t.size * TILE;
            const tint = e.flash > 0 ? "#ff5959" : t.color;

            ctx.fillStyle = tint;
            if (t.shape === "circle") {
                ctx.beginPath();
                ctx.arc(c.x, c.y + walkBob, size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(c.x - size, c.y - size + walkBob, size * 2, size * 2);
            }
        }

        const ratio = e.hp / e.maxHp;
        if (ratio < 0.999) {
            const barW = TILE - 6;
            const barX = c.x - barW / 2;
            const barY = e.pos.y * TILE + 2;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(barX, barY, barW, 3);
            ctx.fillStyle = COL_HP_BAR;
            ctx.fillRect(barX, barY, barW * Math.max(0, ratio), 3);
        }
    }

    // jogador
    if (armorId !== "") {
        drawEllipse(ctx, pc.x, pc.y + 6, 7.8, 3.4, armorItems[armorId].color);
    }

    // piscada/aura vermelha ao levar dano
    if (playerHurt > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 55);
        ctx.fillStyle = "rgba(255,70,70," + (0.18 + 0.30 * pulse).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(pc.x, pc.y, TILE * 0.5 + 3 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (spriteReady("heroi")) {
        const frames = spriteFrameCount("heroi");
        const walking = elapsed < playerWalkUntil;
        const frame = frames > 1 && walking ? Math.floor(elapsed * 10) % frames : 0;
        const size = TILE + 4;
        const blink = playerHurt > 0 && Math.floor(playerHurt * 24) % 2 === 0;

        ctx.globalAlpha = blink ? 0.45 : 1;
        ctx.drawImage(
            sprites.heroi,
            frame * 16, 0, 16, 16,
            pc.x - size / 2, pc.y - size / 2,
            size, size
        );
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = playerHurt > 0 && Math.floor(playerHurt * 24) % 2 === 0
            ? "#ff7b7b"
            : COL_PLAYER;
        ctx.beginPath();
        ctx.arc(pc.x, pc.y, TILE * 0.5 - 3.5, 0, Math.PI * 2);
        ctx.fill();

        // indicador de direcao (olhos)
        ctx.fillStyle = "#0b0b12";
        const ex = pc.x + facing.x * 3;
        const ey = pc.y + facing.y * 3;
        ctx.beginPath();
        ctx.arc(ex - (facing.y !== 0 ? 3 : 0), ey - (facing.x !== 0 ? 3 : 0), 1.6, 0, Math.PI * 2);
        ctx.arc(ex + (facing.y !== 0 ? 3 : 0), ey + (facing.x !== 0 ? 3 : 0), 1.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // numeros de dano flutuando
    for (const f of floaters) {
        const t = 1 - f.life / f.maxLife;
        const fx = f.x * TILE + TILE / 2;
        const fy = f.y * TILE + 8 - t * 22;
        ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
        ctx.fillStyle = f.color;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, fx, fy);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
    }

    ctx.restore();

    // vinheta vermelha ao levar dano
    if (damageFlash > 0) {
        const g = ctx.createRadialGradient(
            WINDOW_W / 2, WINDOW_H / 2, WINDOW_H * 0.30,
            WINDOW_W / 2, WINDOW_H / 2, WINDOW_W * 0.62
        );
        g.addColorStop(0, "rgba(255,0,0,0)");
        g.addColorStop(1, "rgba(255,0,0," + (0.35 * damageFlash).toFixed(3) + ")");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, WINDOW_W, WINDOW_H);
    }

    // overlays
    if (state === State.DEAD) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, WINDOW_W, WINDOW_H);
        ctx.fillStyle = "#ff8080";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VOCE MORREU", WINDOW_W / 2, WINDOW_H / 2 - 12);
        ctx.fillStyle = COL_TEXT_DIM;
        ctx.font = "20px sans-serif";
        ctx.fillText("Pressione R (ou toque em R) para recomecar", WINDOW_W / 2, WINDOW_H / 2 + 40);
        ctx.textAlign = "left";
    } else if (isPaused) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, WINDOW_W, WINDOW_H);
        ctx.fillStyle = "#ffe08a";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAUSADO", WINDOW_W / 2, WINDOW_H / 2 - 12);
        ctx.fillStyle = COL_TEXT_DIM;
        ctx.font = "20px sans-serif";
        ctx.fillText("Pressione P para continuar", WINDOW_W / 2, WINDOW_H / 2 + 40);
        ctx.textAlign = "left";
    }
}

// =============================================================
// ENTRADA
// =============================================================

const keysDown = {};

const touchState = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0
};

function setupKeyboard() {
    window.addEventListener("keydown", (e) => {
        const k = e.key.toLowerCase();

        if (k === "arrowup" || k === "arrowdown" || k === "arrowleft" ||
            k === "arrowright" || k === " ") {
            e.preventDefault();
        }

        if (state === State.DEAD) {
            if (k === "r") newGame();
            return;
        }

        keysDown[k] = true;

        if (k === "p") {
            togglePause();
        } else if (k === "q") {
            drinkPotion();
        } else if (k === "r") {
            newGame();
        } else if (k === " " || k === "enter") {
            playerAttack();
        }
    });

    window.addEventListener("keyup", (e) => {
        keysDown[e.key.toLowerCase()] = false;
    });

    window.addEventListener("blur", () => {
        for (const k in keysDown) keysDown[k] = false;
        touchState.active = false;
        touchState.pointerId = null;
        touchState.dx = 0;
        touchState.dy = 0;
        hideJoystick();
    });
}

const joystickEls = { base: null, knob: null };

function hideJoystick() {
    if (joystickEls.base) joystickEls.base.style.display = "none";
    if (joystickEls.knob) joystickEls.knob.style.display = "none";
}

function setupTouchControls() {
    const zone = document.getElementById("joyZone");
    const base = document.getElementById("joyBase");
    const knob = document.getElementById("joyKnob");

    if (!zone || !base || !knob) return;

    joystickEls.base = base;
    joystickEls.knob = knob;

    function showJoystick() {
        base.style.display = "block";
        knob.style.display = "block";
        base.style.left = touchState.startX + "px";
        base.style.top = touchState.startY + "px";
        knob.style.left = touchState.startX + "px";
        knob.style.top = touchState.startY + "px";
    }

    zone.addEventListener("pointerdown", (e) => {
        if (touchState.active) return;
        e.preventDefault();

        try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

        const r = zone.getBoundingClientRect();
        touchState.active = true;
        touchState.pointerId = e.pointerId;
        touchState.startX = e.clientX - r.left;
        touchState.startY = e.clientY - r.top;
        touchState.dx = 0;
        touchState.dy = 0;
        showJoystick();
    });

    zone.addEventListener("pointermove", (e) => {
        if (!touchState.active || e.pointerId !== touchState.pointerId) return;
        e.preventDefault();

        const r = zone.getBoundingClientRect();
        let dx = e.clientX - r.left - touchState.startX;
        let dy = e.clientY - r.top - touchState.startY;

        const len = Math.hypot(dx, dy);
        const max = 52;
        if (len > max) {
            dx = (dx / len) * max;
            dy = (dy / len) * max;
        }

        touchState.dx = dx;
        touchState.dy = dy;

        knob.style.left = (touchState.startX + dx) + "px";
        knob.style.top = (touchState.startY + dy) + "px";
    });

    function endJoystick(e) {
        if (e.pointerId !== touchState.pointerId) return;
        touchState.active = false;
        touchState.pointerId = null;
        touchState.dx = 0;
        touchState.dy = 0;
        hideJoystick();
    }

    zone.addEventListener("pointerup", endJoystick);
    zone.addEventListener("pointercancel", endJoystick);
    zone.addEventListener("lostpointercapture", endJoystick);

    function bindButton(id, action) {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            action();
        });

        el.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    bindButton("btnAtk", playerAttack);
    bindButton("btnQ", drinkPotion);
    bindButton("btnP", togglePause);
    bindButton("btnR", newGame);
}

// =============================================================
// LOOP PRINCIPAL
// =============================================================

let lastTs = 0;
let hudTimer = 0;

function processGame(delta) {
    if (state !== State.PLAYING || isPaused) return;

    elapsed += delta;
    playerCd = Math.max(0.0, playerCd - delta);

    playerHurt = Math.max(0.0, playerHurt - delta);
    damageFlash = Math.max(0.0, damageFlash - delta * 2.2);
    shakeTime = Math.max(0.0, shakeTime - delta);

    for (let i = floaters.length - 1; i >= 0; i--) {
        floaters[i].life -= delta;
        if (floaters[i].life <= 0) floaters.splice(i, 1);
    }

    if (playerCd <= 0.0) {
        let dir = readKeyboardDirection();
        if (dir.x === 0 && dir.y === 0) dir = readJoystickDirection();
        if (dir.x !== 0 || dir.y !== 0) {
            playerAct({ x: Math.sign(dir.x), y: Math.sign(dir.y) });
            if (state === State.DEAD) return;
        }
    }

    let changed = false;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.step_timer += delta;
        e.atk_timer += delta;

        if (e.flash > 0) {
            e.flash = Math.max(0, e.flash - delta);
            changed = true;
        }

        const d = { x: playerPos.x - e.pos.x, y: playerPos.y - e.pos.y };
        const dist = Math.max(Math.abs(d.x), Math.abs(d.y));
        const orthogonal = Math.abs(d.x) + Math.abs(d.y) === 1;
        const playerSafe = isSafeCell(playerPos.x, playerPos.y);

        if (orthogonal && !playerSafe) {
            if (e.atk_timer >= e.atk_delay) {
                e.atk_timer = 0;
                enemyAttack(e);
                changed = true;
                if (state === State.DEAD) return;
            }
        } else if (dist <= 1) {
            // diagonal: aproxima para ficar frente a frente
            if (e.step_timer >= e.step_delay) {
                e.step_timer = 0;
                if (moveEnemy(e, d)) changed = true;
            }
        } else if (e.step_timer >= e.step_delay) {
            e.step_timer = 0;
            if (moveEnemy(e, d)) changed = true;
        }
    }

    if (changed) updateHUD();
}

function frame(ts) {
    if (!lastTs) lastTs = ts;
    let delta = (ts - lastTs) / 1000;
    lastTs = ts;

    if (delta > 0.1) delta = 0.1;
    if (delta < 0) delta = 0;

    processGame(delta);
    draw();

    hudTimer += delta;
    if (hudTimer >= 0.15) {
        hudTimer = 0;
        updateHUD();
    }

    requestAnimationFrame(frame);
}

// =============================================================
// NOVO JOGO
// =============================================================

function newGame() {
    state = State.PLAYING;
    isPaused = false;

    floorNum = 1;
    elapsed = 0.0;
    playerCd = 0.0;

    level = 1;
    xp = 0;
    xpNext = 14;
    playerMaxHp = BASE_MAX_HP;
    playerHp = BASE_MAX_HP;
    playerAtkMin = BASE_ATK_MIN;
    playerAtkMax = BASE_ATK_MAX;
    potionCount = 2;
    armorId = "";

    for (const k in keysDown) keysDown[k] = false;
    touchState.active = false;
    touchState.pointerId = null;
    touchState.dx = 0;
    touchState.dy = 0;
    hideJoystick();

    lastHud = {};
    lastTs = 0;
    hudTimer = 0;

    buildFloor(true);
    updateHUD();
}

// =============================================================
// INICIALIZACAO
// =============================================================

window.addEventListener("load", () => {
    loadSprites();
    buildLegend();
    setupKeyboard();
    setupTouchControls();
    newGame();
    requestAnimationFrame(frame);
});
