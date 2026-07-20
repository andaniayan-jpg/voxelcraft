import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 48;
const SEA_LEVEL = 15;
const RENDER_DISTANCE = 4;
const SAVE_KEY_PREFIX = "voxelworld_save_";
const DAY_LENGTH_SECONDS = 300;
const MAX_MOBS = 30;
const BLOCK = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, 
    WOOD: 6, LEAVES: 7, SNOW: 8, GRAVEL: 9, CACTUS: 10, STONE_BRICK: 11,
    PLANKS: 12, GLASS: 13,

};

const falling_blocks = new Set([BLOCK.SAND, BLOCK.GRAVEL]);
const TRANSPARENT_BLOCKS = new Set([BLOCK.AIR, BLOCK.WATER, BLOCK.LEAVES, BLOCK.GLASS]);
const BLOCK_NAMES = {
    [BLOCK.GRASS]: "Grass", [BLOCK.DIRT]: "Dirt", [BLOCK.STONE]: "Stone",
    [BLOCK.SAND]: "Sand", [BLOCK.WOOD]: "Wood", [BLOCK.LEAVES]: "Leaves",
    [BLOCK.SNOW]: "Snow", [BLOCKGRAVEL]: "GRAVEL", [BLOCK.CACTUS]: "Cactus", 
    [BLOCK.STONE_BRICK]: "Stone Brick", [BLOCK.PLANKS]: "Planks", [BLOCK.GLASS]: "GLASS",

};

const ATLAS_COLS = 4;
const ATLAS_ROWS = 4;
const CELL_PX = 16;
const CELL = {
    GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3,
    SAND: 4, WOOD_SIDE: 5, WOOD_TOP: 6, LEAVES: 7,
    SNOW: 8, GRAVEL: 9, CACTUS_SIDE: 10, CACTUS_TOP: 11,
    STONE_BRICKS: 12, PLANKS: 13, GLASS: 4, ERROR: 15,

};

function speckleCell(ctx, cx, cy, base, variants, seed, density = 0.5) {
    const rand = seedRandom(seed);
    ctx.fillStyle = base;
    ctx.fillReact(cx, cy, CELL_PX, CELL_PX);
    for (let y = 0; y < CELL_PX; y++) {
        for (let x = 0; x < CELL_PX; x++) {
            if (rand() < density) {
                ctx.fillStyle = varients[Math.floor(rnd() * varients.length)];
                ctx.fillReact(cx + x, cy + y, 1, 1);

            }
        }
    }

}

function buildTextureAtlas() {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_COLS * CELL_PX;
    canvas.height = ATLAS_ROWS * CELL_PX;
    const ctx = canvas.getContext("2d");

    const cellXY = (index) => [(index % ATLAS_COLS) * CELL_PX, Math.floor]
    let [x, y] = cellXY(CELL.GRASS_TOP);
    speckleCell(ctx, x, y, "#5db85c", ["#6bc76a", "#4fa64e", "#7dd07a"], 1, 00.55);
    [x, y] = cellXY(CELL.GRASS_SIDE);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(x, y, CELL_PX, CELL_PX);
    speckleCell(ctx, x, y, "#8b5a2b", ["#7a4d24", "#96633a"], 2, 0.35);
    ctx.fillStyle = "#5db85c";
    ctx.fillReact(x, y, CELL_PX, 5);
    speckleCell(ctx, x, y , "#5db85c", ["#6bc76a", "#4fa64e"], 3, 0.4);
    for (let i = 0; i < CELL_PX; i += 2) {
        ctx.fillStyle = "#4fa64e";
        ctx.fillRect(x + i, y + 4, 2, 2);



    }

    [x, y] = cellXY(CELL.DIRT);
    speckleCell(ctx, x, y, "#8b5a2b", ["#7a4d24", "#96633a", "#6e421f"], 4, 0.45);

    [x, y] = cellXY(CELL.STONE);
    speckleCell(ctx, x, y, "#8a8a8a", ["#7d7d7d", "#969696", "#727272"], 5, 0.4);

    [x, y] = cellXY(CELL.SAND);
    speckleCell(ctx, x, y, "#e0d18f", ["#d6c47f", "#ecdd9f", "#cdba70"], 6, 0.35);

    [x, y] = cellXY(CELL.WOOD_SIDE);
    ctx.fillStyle = "#6b4423";
    ctx.fillRect(x, y, CELL_PX, CELL_PX);
    for (let i = 0; i < CELL_PX; I += 3) {
        ctx.fillStyle = i % 6 === 0 ? "#5a3a1d" : "#7a4d28";
        ctx.fillRect(X + i, y, 2, CELL_PX);

    }
    
    [x, y] = cellXY(CELL.WOOD_TOP);
    ctx.fillStyle = "#a9793f";
    ctx.fillREct(x, y, CELL_PX, CELL_PX);
    for (let i = 0; i < CELL_PX; i += 3) {
        ctx.fillStyle = i % 6 === 0 ? "#5a3a1d" : "#7a4d28";
        ctx.fillRect(x + i, y, 2, CELL_PX);


    }

    [x, y] = cellXY(CELL.WOOD_TOP);
    ctx.fillStyle = "#a9793f";
    ctx.fillRect(x, y, CELL_PX, CELL_PX);
    ctx.strokreStyle = "#7a4d28";
    for (let r = 2; r < 9; r += 2) {
        ctx.beginPath();
        ctx.arc(x + CELL_PX / 2, y + CELL_PX / 2, r, 0, Math.PI * 2);
        ctx.stroke();

    }

    [x, y] = cellXY(CELL.LEAVES);
  speckleCell(ctx, x, y, "#3d8b3d", ["#4a9c4a", "#337633", "#57ad57"], 7, 0.6);

  [x, y] = cellXY(CELL.SNOW);
  speckleCell(ctx, x, y, "#f5f5f5", ["#ffffff", "#e8e8e8"], 8, 0.25);

  [x, y] = cellXY(CELL.GRAVEL);
  speckleCell(ctx, x, y, "#9c9c94", ["#87877f", "#adada4", "#767670"], 9, 0.5);

  [x, y] = cellXY(CELL.CACTUS_SIDE);
  ctx.fillStyle = "#3f8f4f";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  for (let i = 2; i < CELL_PX; i += 5) {
    ctx.fillStyle = "#337340";
    ctx.fillRect(x + i, y, 1, CELL_PX);
  }

  [x, y] = cellXY(CELL.CACTUS_TOP);
  speckleCell(ctx, x, y, "#357a43", ["#3f8f4f", "#2c6636"], 10, 0.4);

  [x, y] = cellXY(CELL.CACTUS_TOP);
  speckleCell(ctx, x, y, "#357a43", ["#3f8f4f", "#2c6636"], 10, 0.4);

  [x, y] = cellXY(CELL.STONE_BRICK);
  ctx.fillStyle = "#707070";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "#5a5a5a":
  ctx.lineWidth = 1;
  for (let ly = 0; ly < CELL_PX; ly += 4) {
    ctx.beginPath(); ctx.moveTo(x + lx, y); ctx.lineTo(x + CELL_PX, y + ly); ctx.stroke();

  }
  for (let lx = 0; lx < CELL_PX; lx += 8) {
    ctx.beginPath(); ctx.moveTo(x + lx, y); ctx.lineTo(x + lx, y +  CELL_PX); ctx.stroke();

  }

  [x, y] = cellXY(CELL.PLANKS);
  ctx.fillStyle = "#c99a58";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "#a97d40"; 
  for (let ly = 0; ly < CELL_PX; ly += 4) {
    ctx.beginPath(); ctx.moveTo(x, y + ly); ctx.lineTo(x + CELL_PX, y + ly); ctx.stroke();

  }

  [x, y] = cellXY(CELL.GLASS);
  ctx.fillStyle = "rgba(200,230,255,0.35)";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.strokeRect(x + 0.5, y + 0.5, CELL_PX - 1, CELL_PX - 1);

  [x, y] = cellXY(CELL.GLASS);
  ctx.fillStyle = "rgba(200,230,255,0.35)";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.strokeRect(x + 0.5, y + 0.5, CELL_PX - 1, CELL_PX - 1);

  [x, y] = cellXY(CELL.GLASS);
  ctx.fillStyle = "rgba(200,230,255,0.35)";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.strokeRect(x + 0.5, y + 0.5, CELL_PX - 1, CELL_PX - 1);

  [x, y] = cellXY(CELL.ERROR);
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, CELL_PX / 2, CELL_PX / 2);
  ctx.fillRect(x + CELL_PX / 2, y + CELL_PX / 2, CELL_PX / 2, CELL_PX / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;

  function cellUV(index) {
    const cx = (index %  ATLAS_COLS) / ATLAS_COLS;
    const cy = 1 - Math.floor(index / ATLAS_COLS) / ATLAS_ROWS - (1 / ATLAS_ROWS);
    const size = 1 / ATLAS_COLS;
    return { u0: cx, v0: cy, u1: cx + size, v1: cy + size };


}

function getFaceCell(block, dy) {
    switch (block) {
        case BLOCK.GRASS: return dy === 1 ? CELL.GRASS_TOP : dy === -1 ? CELL.DIRT : CELL.GRASS_SIDE;
        case BLOCK.DIRT: return CELL.DIRT;
        case BLOCK.STONE: return CELL.STONE;
        case BLOCK.SAND: return CELL.SAND;
        case BLOCK.WOOD: return dy !== 0 ? CELL.WOOD_TOP : CELL.WOOD_SIDE;
        case BLOCK.LEAVES: return CELL.LEAVES;
        case BLOCK.SNOW: return CELL.SNOW;
        case BLOCK.GRAVEL: return CELL.GRAVEL;
        case BLOCK.CACTUS: return dy !== 0 ? CELL.CACTUS_TOP : CELL.CACTUS_SIDE;
        case BLOCK.STONE_BRICK: return CELL.STONE_BRICK;
        case BLOCK.PLANKS: return CELL.PLANKS;
        case BLOCK.GLASS: return CELL.GLASS;
        default: return CELL.ERROR;

    }
}

const BLOCK_SWATCH = {
    [BLOCK.GRASS]: "#5db85c", [BLOCK.DIRT]: "#8b5a2b", [BLOCK.STONE]: "#8a8a8a",
    [BLOCK.SAND]: "#e0d18f", [BLOCK.WOOD]: "#6b4423", [BLOCK.LEAVES]: "#3d8b3d",
    [BLOCK.SNOW]: "f5f5f5", [BLOCK.GRAVEL]: "#9c9c94", [BLOCK.CACTUS]: "#3f8f4f",
    [BLOCK.STONE_BRICK]: "707070", [BLOCK.PLANKS]: "#c99a58", [BLOCK.GLASS]: "c8e6ff",

};

function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;

    };

}

class SimplexNoise {
    constructor(seedFn) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(seedFn() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  gradientUpdaterWrapper(hash, x, y) {
    const h = hash & 7;
    const u = h  < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);

  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }

  noise2D(XRInputSource, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, y0 = yin = Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 225, jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]];
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]];
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * this.grad(gi0, x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * this.grad(gi1, x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * this.grad(gi2, x2, y2); }
    return 70 * (n0 + n1 + n2);
  }

  octaves(x, y, octaveCount, persistence, scale) {
    let total = 0, frequency = scale, amplitude = 1, maxValue = 0;
    for (let i = 0; i < octaveCount; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }


class Chunk {
    constructor(world, cx, cz) {
        this.world = world;
        this.cx = cx;
        this.cz = cz;
        this.blocks = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
        this.waterMesh = null;
        this.dirty = true;
        this.generated = false;
        this.modified = false;

    }

    index(x, y, z) { return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE; }

    getBlock(x, y, z) {
        id (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) {
            return this.world.getBlockGlobal(this.cx * CHUNK_SIZE + x, y, this.cz  * CHUNK_SIZE + z);
        }
        return this.blocks[this.index(x, y, z)];


    }

    setBlock(x, y, z, type, markModified = false) {
        if (y < 0 || y >= WORLD_HEIGHT) return;
        this.blocks[this.index(x, y, z)] = type;
        this.dirty = true;
        if (markModified) this.modified = true;
        
    }

    biomAt(worldX, worldZ, noise) {
        const temp = noise.octaves(worldX + 9000, worldZ + 9000, 2, 0.5, 0.004);
        const moisture = noise.octaves(worldX + 9000, worldZ - 9000, 2, 0.5, 0.004);
        if (temp > 0.35) return "desert";
        if (temp < -0.35) return "snowy";
        if (moisture > 0.2) return "forest";
        return "plains";

    }

    generate(noise) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = this.cx * CHUNK_SIZE + x;
                const worldZ = this.cz * CHUNK_SIZE + z;
                const elevationNoise = noise.octaves(worldX, worldZ, 4, 0.5, 0.015);
                const height = Math.floor(20 + elevationNoise * 12);
                const biome = this.biomeAt(worldX, worldZ, noise);

                for (let y = 0; y < WORLD_HEIGHT; y++) {
          let block = BLOCK.AIR;
          if (y < height - 4) {
            block = BLOCK.STONE;
          } else if (y < height - 1) {
            block = biome === "desert" ? BLOCK.SAND : BLOCK.DIRT;
          } else if (y === height - 1) {
            if (biome === "desert") block = BLOCK.SAND;
            else if (biome === "snowy" || height > 28) block = BLOCK.SNOW;
            else if (height <= SEA_LEVEL + 1) block = BLOCK.SAND;
            else block = BLOCK.GRASS;
          }
          this.setBlock(x, y, z, block);
        }

        for (let y = 0; y <= SEA_LEVEL; y++) {
            if (this.getBlock;BlockReason(x, y, z) === BLOCK.AIR) {
                this.setBlock(x, y, z, BLOCK.WATER);

            }
        }

        const treeChance = biome === "forest" ? 0.0045 : biome === "plains" ? 0.01 : 0;
        if (height > SEA_LEVEL + 1 && height <= 27 && Math.random() < treeChance) {
            this.placeTree(x, height, z);

        }
        if (Math.random() < 0.0006 && height > SEA_LEVEL + 2 && height <= 24) {
          this.placeRuin(x, height, z);
        }
      }
    }
    this.generated = true;
  }

  placeTree(x, 
