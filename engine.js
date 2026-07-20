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

const FALLING_BLOCKS = new Set([BLOCK.SAND, BLOCK.GRAVEL]);
const TRANSPARENT_BLOCKS = new Set([BLOCK.AIR, BLOCK.WATER, BLOCK.LEAVES, BLOCK.GLASS]);

const BLOCK_NAMES = {
  [BLOCK.GRASS]: "Grass", [BLOCK.DIRT]: "Dirt", [BLOCK.STONE]: "Stone",
  [BLOCK.SAND]: "Sand", [BLOCK.WOOD]: "Wood", [BLOCK.LEAVES]: "Leaves",
  [BLOCK.SNOW]: "Snow", [BLOCK.GRAVEL]: "Gravel", [BLOCK.CACTUS]: "Cactus",
  [BLOCK.STONE_BRICK]: "Stone Brick", [BLOCK.PLANKS]: "Planks", [BLOCK.GLASS]: "Glass",
};



const ATLAS_COLS = 4;
const ATLAS_ROWS = 4;
const CELL_PX = 16;

const CELL = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3,
  SAND: 4, WOOD_SIDE: 5, WOOD_TOP: 6, LEAVES: 7,
  SNOW: 8, GRAVEL: 9, CACTUS_SIDE: 10, CACTUS_TOP: 11,
  STONE_BRICK: 12, PLANKS: 13, GLASS: 14, ERROR: 15,
};

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function speckleCell(ctx, cx, cy, base, variants, seed, density = 0.5) {
  const rand = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(cx, cy, CELL_PX, CELL_PX);
  for (let y = 0; y < CELL_PX; y++) {
    for (let x = 0; x < CELL_PX; x++) {
      if (rand() < density) {
        ctx.fillStyle = variants[Math.floor(rand() * variants.length)];
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
}

function buildTextureAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * CELL_PX;
  canvas.height = ATLAS_ROWS * CELL_PX;
  const ctx = canvas.getContext("2d");

  const cellXY = (index) => [(index % ATLAS_COLS) * CELL_PX, Math.floor(index / ATLAS_COLS) * CELL_PX];

  let [x, y] = cellXY(CELL.GRASS_TOP);
  speckleCell(ctx, x, y, "#5db85c", ["#6bc76a", "#4fa64e", "#7dd07a"], 1, 0.55);

  [x, y] = cellXY(CELL.GRASS_SIDE);
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  speckleCell(ctx, x, y, "#8b5a2b", ["#7a4d24", "#96633a"], 2, 0.35);
  ctx.fillStyle = "#5db85c";
  ctx.fillRect(x, y, CELL_PX, 5);
  speckleCell(ctx, x, y, "#5db85c", ["#6bc76a", "#4fa64e"], 3, 0.4);
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
  for (let i = 0; i < CELL_PX; i += 3) {
    ctx.fillStyle = i % 6 === 0 ? "#5a3a1d" : "#7a4d28";
    ctx.fillRect(x + i, y, 2, CELL_PX);
  }

  [x, y] = cellXY(CELL.WOOD_TOP);
  ctx.fillStyle = "#a9793f";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "#7a4d28";
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

  [x, y] = cellXY(CELL.STONE_BRICK);
  ctx.fillStyle = "#707070";
  ctx.fillRect(x, y, CELL_PX, CELL_PX);
  ctx.strokeStyle = "#5a5a5a";
  ctx.lineWidth = 1;
  for (let ly = 0; ly < CELL_PX; ly += 4) {
    ctx.beginPath(); ctx.moveTo(x, y + ly); ctx.lineTo(x + CELL_PX, y + ly); ctx.stroke();
  }
  for (let lx = 0; lx < CELL_PX; lx += 8) {
    ctx.beginPath(); ctx.moveTo(x + lx, y); ctx.lineTo(x + lx, y + CELL_PX); ctx.stroke();
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
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cellUV(index) {
  const cx = (index % ATLAS_COLS) / ATLAS_COLS;
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
  [BLOCK.SNOW]: "#f5f5f5", [BLOCK.GRAVEL]: "#9c9c94", [BLOCK.CACTUS]: "#3f8f4f",
  [BLOCK.STONE_BRICK]: "#707070", [BLOCK.PLANKS]: "#c99a58", [BLOCK.GLASS]: "#c8e6ff",
};



function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
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

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }

  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
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
}



const FACE_DIRS = [
  { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [0, 0, -1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

const AO_LEVELS = [0.35, 0.55, 0.78, 1.0];



class Chunk {
  constructor(world, cx, cz) {
    this.world = world;
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
    this.mesh = null;
    this.waterMesh = null;
    this.glassMesh = null;
    this.dirty = true;
    this.generated = false;
    this.modified = false;
  }

  index(x, y, z) { return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE; }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) {
      return this.world.getBlockGlobal(this.cx * CHUNK_SIZE + x, y, this.cz * CHUNK_SIZE + z);
    }
    return this.blocks[this.index(x, y, z)];
  }

  setBlock(x, y, z, type, markModified = false) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    this.blocks[this.index(x, y, z)] = type;
    this.dirty = true;
    if (markModified) this.modified = true;
  }

  biomeAt(worldX, worldZ, noise) {
    const temp = noise.octaves(worldX + 9000, worldZ + 9000, 2, 0.5, 0.004);
    const moisture = noise.octaves(worldX - 9000, worldZ - 9000, 2, 0.5, 0.004);
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
          if (this.getBlock(x, y, z) === BLOCK.AIR) {
            this.setBlock(x, y, z, BLOCK.WATER);
          }
        }

        const treeChance = biome === "forest" ? 0.045 : biome === "plains" ? 0.01 : 0;
        if (height > SEA_LEVEL + 1 && height <= 27 && Math.random() < treeChance) {
          this.placeTree(x, height, z);
        }
        if (biome === "desert" && height > SEA_LEVEL && Math.random() < 0.006) {
          this.placeCactus(x, height, z);
        }
        if (Math.random() < 0.0006 && height > SEA_LEVEL + 2 && height <= 24) {
          this.placeRuin(x, height, z);
        }
      }
    }
    this.generated = true;
  }

  placeTree(x, groundY, z) {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < trunkHeight; i++) this.setBlock(x, groundY + i, z, BLOCK.WOOD);
    for (let ly = -2; ly <= 1; ly++) {
      for (let lx = -2; lx <= 2; lx++) {
        for (let lz = -2; lz <= 2; lz++) {
          if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
          const bx = x + lx, by = groundY + trunkHeight + ly, bz = z + lz;
          if (bx >= 0 && bx < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE) {
            if (this.getBlock(bx, by, bz) === BLOCK.AIR) this.setBlock(bx, by, bz, BLOCK.LEAVES);
          }
        }
      }
    }
  }

  placeCactus(x, groundY, z) {
    const h = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < h; i++) this.setBlock(x, groundY + i, z, BLOCK.CACTUS);
  }

  placeRuin(x, groundY, z) {
    const size = 3;
    for (let lx = 0; lx < size; lx++) {
      for (let lz = 0; lz < size; lz++) {
        const bx = x + lx, bz = z + lz;
        if (bx < 0 || bx >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE) continue;
        const isEdge = lx === 0 || lz === 0 || lx === size - 1 || lz === size - 1;
        if (isEdge && Math.random() < 0.8) {
          const wallHeight = 1 + Math.floor(Math.random() * 3);
          for (let ly = 0; ly < wallHeight; ly++) {
            this.setBlock(bx, groundY + ly, bz, BLOCK.STONE_BRICK);
          }
        }
      }
    }
  }

  isOccluderFor(neighborBlock, currentBlock) {
    if (neighborBlock === BLOCK.AIR) return false;
    if (TRANSPARENT_BLOCKS.has(neighborBlock) && neighborBlock !== currentBlock) return false;
    if (neighborBlock === currentBlock && TRANSPARENT_BLOCKS.has(neighborBlock)) return false;
    return true;
  }

  isSolidForAO(x, y, z) {
    const b = this.getBlock(x, y, z);
    return b !== BLOCK.AIR && b !== BLOCK.WATER && b !== BLOCK.GLASS;
  }

  vertexAO(bx, by, bz, faceDir, cornerCoord) {
    const axes = [0, 1, 2].filter((i) => faceDir[i] === 0);
    const [a1, a2] = axes;
    const t1 = cornerCoord[a1] === 1 ? 1 : -1;
    const t2 = cornerCoord[a2] === 1 ? 1 : -1;

    const base = [bx + faceDir[0], by + faceDir[1], bz + faceDir[2]];
    const side1Pos = [...base]; side1Pos[a1] += t1;
    const side2Pos = [...base]; side2Pos[a2] += t2;
    const cornerPos = [...base]; cornerPos[a1] += t1; cornerPos[a2] += t2;

    const side1 = this.isSolidForAO(...side1Pos) ? 1 : 0;
    const side2 = this.isSolidForAO(...side2Pos) ? 1 : 0;
    const cornerB = this.isSolidForAO(...cornerPos) ? 1 : 0;

    if (side1 && side2) return 0;
    return 3 - (side1 + side2 + cornerB);
  }

  buildMesh(scene) {
    if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.waterMesh) { scene.remove(this.waterMesh); this.waterMesh.geometry.dispose(); this.waterMesh = null; }
    if (this.glassMesh) { scene.remove(this.glassMesh); this.glassMesh.geometry.dispose(); this.glassMesh = null; }

    const solid = { positions: [], normals: [], uvs: [], aos: [], indices: [], count: 0 };
    const water = { positions: [], normals: [], uvs: [], indices: [], count: 0 };
    const glass = { positions: [], normals: [], uvs: [], aos: [], indices: [], count: 0 };

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const block = this.getBlock(x, y, z);
          if (block === BLOCK.AIR) continue;

          const target = block === BLOCK.WATER ? water : block === BLOCK.GLASS ? glass : solid;

          for (const face of FACE_DIRS) {
            const [dx, dy, dz] = face.dir;
            const neighbor = this.getBlock(x + dx, y + dy, z + dz);
            if (this.isOccluderFor(neighbor, block)) continue;
            if (block === BLOCK.WATER && neighbor === BLOCK.WATER) continue;
            if (block === BLOCK.GLASS && neighbor === BLOCK.GLASS) continue;

            const cell = getFaceCell(block, dy);
            const { u0, v0, u1, v1 } = cellUV(cell);
            const faceUVs = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
            const baseShade = dy === 1 ? 1.0 : dy === -1 ? 0.55 : 0.78;

            let aos = [3, 3, 3, 3];
            if (target !== water) {
              aos = face.corners.map((c) => this.vertexAO(x, y, z, face.dir, c));
            }

            for (let ci = 0; ci < 4; ci++) {
              const corner = face.corners[ci];
              target.positions.push(x + corner[0], y + corner[1], z + corner[2]);
              target.normals.push(dx, dy, dz);
              target.uvs.push(faceUVs[ci][0], faceUVs[ci][1]);
              if (target.aos) {
                target.aos.push(AO_LEVELS[aos[ci]] * baseShade);
              }
            }

            const flip = target.aos && (aos[0] + aos[2] > aos[1] + aos[3]);
            if (flip) {
              target.indices.push(
                target.count + 1, target.count + 2, target.count + 3,
                target.count + 1, target.count + 3, target.count
              );
            } else {
              target.indices.push(
                target.count, target.count + 1, target.count + 2,
                target.count, target.count + 2, target.count + 3
              );
            }
            target.count += 4;
          }
        }
      }
    }

    if (solid.count > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(solid.positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(solid.normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(solid.uvs, 2));
      geo.setAttribute("ao", new THREE.Float32BufferAttribute(solid.aos, 1));
      geo.setIndex(solid.indices);
      this.mesh = new THREE.Mesh(geo, this.world.solidMaterial);
      this.mesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      scene.add(this.mesh);
    }

    if (water.count > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(water.positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(water.normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(water.uvs, 2));
      geo.setIndex(water.indices);
      this.waterMesh = new THREE.Mesh(geo, this.world.waterMaterial);
      this.waterMesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
      scene.add(this.waterMesh);
    }

    if (glass.count > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(glass.positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(glass.normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(glass.uvs, 2));
      geo.setAttribute("ao", new THREE.Float32BufferAttribute(glass.aos, 1));
      geo.setIndex(glass.indices);
      this.glassMesh = new THREE.Mesh(geo, this.world.glassMaterial);
      this.glassMesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
      scene.add(this.glassMesh);
    }

    this.dirty = false;
  }
}



class World {
  constructor(scene, seed) {
    this.scene = scene;
    this.chunks = new Map();
    this.seed = seed || "pearson-voxel";
    this.noise = new SimplexNoise(hashSeed(this.seed));
    this.fallingBlocks = [];
    this.saveData = this.loadSaveData();

    this.atlasTexture = buildTextureAtlas();

    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      vertexColors: false,
    });
    this.solidMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float ao;\nvarying float vAo;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAo = ao;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vAo;")
        .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb *= vAo;");
    };

    this.glassMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    this.waterMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColorShallow: { value: new THREE.Color(0x4fa8e0) },
        uColorDeep: { value: new THREE.Color(0x1c4f8a) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec3 pos = position;
          float wave = sin((pos.x + uTime * 1.2) * 1.3) * 0.06 + cos((pos.z + uTime * 0.9) * 1.6) * 0.06;
          if (normal.y > 0.5) {
            pos.y += wave;
          }
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorShallow;
        uniform vec3 uColorDeep;
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          float shimmer = sin(vWorldPos.x * 2.0 + uTime * 2.0) * 0.05 + cos(vWorldPos.z * 2.0 + uTime * 1.7) * 0.05;
          vec3 color = mix(uColorDeep, uColorShallow, 0.5 + shimmer);
          float alpha = vNormal.y > 0.5 ? 0.72 : 0.55;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }

  chunkKey(cx, cz) { return `${cx},${cz}`; }

  loadSaveData() {
    try {
      const raw = localStorage.getItem(SAVE_KEY_PREFIX + this.seed);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveToStorage() {
    const data = {};
    for (const [key, chunk] of this.chunks.entries()) {
      if (chunk.modified) data[key] = Array.from(chunk.blocks);
    }
    try {
      localStorage.setItem(SAVE_KEY_PREFIX + this.seed, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Save failed", e);
      return false;
    }
  }

  getOrCreateChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(this, cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getBlockGlobal(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk || !chunk.generated) return BLOCK.AIR;
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.blocks[chunk.index(localX, y, localZ)];
  }

  setBlockGlobal(x, y, z, type, markModified = true) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getOrCreateChunk(cx, cz);
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(localX, y, localZ, type, markModified);

    if (localX === 0) this.markNeighborDirty(cx - 1, cz);
    if (localX === CHUNK_SIZE - 1) this.markNeighborDirty(cx + 1, cz);
    if (localZ === 0) this.markNeighborDirty(cx, cz - 1);
    if (localZ === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cz + 1);

    if (FALLING_BLOCKS.has(type)) this.fallingBlocks.push({ x, y, z });
  }

  markNeighborDirty(cx, cz) {
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  getHighestSolidY(x, z) {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      const b = this.getBlockGlobal(x, y, z);
      if (b !== BLOCK.AIR && b !== BLOCK.WATER) return y;
    }
    return SEA_LEVEL;
  }

  processFallingBlocks() {
    if (this.fallingBlocks.length === 0) return;
    const next = [];
    for (const pos of this.fallingBlocks) {
      const type = this.getBlockGlobal(pos.x, pos.y, pos.z);
      if (!FALLING_BLOCKS.has(type)) continue;
      const below = this.getBlockGlobal(pos.x, pos.y - 1, pos.z);
      if (below === BLOCK.AIR && pos.y > 0) {
        this.setBlockGlobal(pos.x, pos.y, pos.z, BLOCK.AIR, false);
        this.setBlockGlobal(pos.x, pos.y - 1, pos.z, type, false);
        next.push({ x: pos.x, y: pos.y - 1, z: pos.z });
      }
    }
    this.fallingBlocks = next;
  }

  update(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = pcx + dx, cz = pcz + dz;
        const chunk = this.getOrCreateChunk(cx, cz);
        if (!chunk.generated) {
          chunk.generate(this.noise);
          const key = this.chunkKey(cx, cz);
          if (this.saveData[key]) {
            chunk.blocks = new Uint8Array(this.saveData[key]);
            chunk.modified = true;
            chunk.dirty = true;
          }
        }
      }
    }

    for (const chunk of this.chunks.values()) {
      const distX = Math.abs(chunk.cx - pcx);
      const distZ = Math.abs(chunk.cz - pcz);
      if (distX > RENDER_DISTANCE + 1 || distZ > RENDER_DISTANCE + 1) {
        if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); chunk.mesh = null; }
        if (chunk.waterMesh) { this.scene.remove(chunk.waterMesh); chunk.waterMesh.geometry.dispose(); chunk.waterMesh = null; }
        if (chunk.glassMesh) { this.scene.remove(chunk.glassMesh); chunk.glassMesh.geometry.dispose(); chunk.glassMesh = null; }
        continue;
      }
      if (chunk.dirty && chunk.generated) chunk.buildMesh(this.scene);
    }
  }
}

export {
  THREE, PointerLockControls, World, BLOCK, BLOCK_NAMES, BLOCK_SWATCH,
  FALLING_BLOCKS, CHUNK_SIZE, WORLD_HEIGHT, SEA_LEVEL, MAX_MOBS,
};

