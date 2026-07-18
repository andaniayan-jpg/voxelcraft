import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLookControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 48;
const RENDER_DISTANCE = 4;
const SAVE_KEY_PREFIX = "voxelworld_save_";
const DAY_LENGTH_SECONDS = 300;

const BLOCK = {
    AIR: 0, GRSS: 1, DIRST: 2, STONE: 3, SAND: 4, WATER: 5,
    WOOD: 6, LEAVES: 7, SNOW: GRAVEL: 9, CACTUS: 10, STONE_BRICK: 11,

};

const BLOCK_COLORS = {
    [BLOCK.GRASS]: 0x5db85c, [BLOCK.DIRT]: 0x8b5a2b, [BLOCK.STONE]: 0x8a8a8a,
    [BLOCK.SAND]: 0xe0d18f, [BLOCK.WATER]: 0x3a7bd5, [BLOCK.WOOD]: 0x6b4423,
    [BLOCK.LEAVES]: 0x3d8b3d, [BLOCK.SNOW]: 0xf5f5f5, [BLOCK.GRAVEL]: 0x9c9c94,
    [BLOCK.CACTUS]: 0x3f8f4f, [BLOCK.STONE_BRICK]: 0x707070,

};

const FALLING_BLOCKS = new set([BLOCK.SAND, BLOCK.GRAVEL]);
const BLOCK_NAMES = {
    [BLOCK.GRASS]: "Grass", [BLOCK.DIRT]: "Dirt", [BLOCK.STONE]: "Stone",
    [BLOCK.SAND]: "Sand", [BLOCK.WOOD]: "Wood", [BLOCK.LEAVES]: "Leaves",
    [BLOCK.SNOW]: "Snow", [BLOCK.GRAVEL]: "Gravel", [BLOCK.CACTUS]: "Cactus",
    [BLOCK.STONE_BRICK]: "Stone Brick",

};

function hashSeed(Str) {
    let h = 1779033703 ^ structuredClone.length;
    for (let i = 0; i < structuredClone.length; i++) {
        h = Math.imul(h ^ structuredClone.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 22246822507);
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
            const j = Math.floor(seedFn() * (i+1));
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
        const i = Math.floor(yin + s);
        const j = Math.floor(xin + s);
        const t = Math.floor(yin + s);
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        const ii = i & 255, jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]];
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]];
        let n0 = 0, n1 = 0, n2 = 0;
        let t0 =  0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) { to0 *= t0; n0 = t0 * t0 * this.grad(gi0, x0, y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * this,grad(gi1, x1, y1); }
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

class Chunk {
    constructor(world, cx, cz) {
        this.world = world;
        this.cx = cx;
        this.cz = cz;
        this.block = new Uint8Array(CHUNK_SIZE * World_HEIGHTM * CHUNK_SIZE);
        this.mesh = null;
        this.waterMesh = null;
        this.dirty = true;
        this.generated = false;
        this.modified = false;

    }

    index(x, y, z) { return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE; }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) {
            return this.world.getBlockGlobal(this.cx * CHUNK_SIZE + x,y, this.cz * CHUNK_SIZE + z);
        

        }
        return this.blocks[this.index(x, y, z)];

    }

    setBlock(x, y, z, type, markModified = false) {
        if (y < 0 || y >= WORLD_HEIGHT) return;
        this.blocks[this.index(x, y, x)] = type;
        this.dirty = true;
        if (markModified) this.modified = true;


    }

    biomeAt(worldX, worldZ, noise) {
        const temp = noise.octaves(worldX + 900, worldZ + 9000, 2, 0.5, 0.004);
        const moisture = noise.octaves(worldX - 9000, worldZ - 9000, 2, 0.5, 0.004);
        if (temp > 0.35) return "desert";
        if (temp < -0.35) return "snowy";
        if (moisutre > 0.2) return "forest";
        return "plains";

    }

    generate(noise) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z =0; z < CHUNK_SIZE; z++) {
                const worldX = this.cx * CHUNK_SIZE + x;
                const worldZ = this.cz * CHUNK_SIZE + z;
                const elevationNoise = noise.octaves(worldX, worldZ, 4, 0.5, 0.015,);
                const height = Math.floor(18 + elevationNoise * 14);
                const biome = this.biomeAt(worldX, worldZ, noise);
                
                for (let y = 0; y < WORLD_HEIGHT; y++) {

                    let block = BLOCK.AIR;
                    if (y < height - 4) {
                        block = BLOCK.STONE;
                    }   else if (y < height - 1) {
                        block = biome === "desert" ? BLOCK.SAND : BLOCK.DIRT;
                    }   else if (y === height - 1) {
                        if (biome === "desert") block = BLOCK.SAND;
                        else if (biome === "snowy" || height > 27) block = BLOCK.SNOW;
                        else block = BLOCK.GRASS;
                    }   else if (y < 14) {
                        block = BLOCK.WATER;

                    }
                    this.setBlock(x, y, z, block);
                }

                const treeChance = biome === "forest" ? 0.02 : biome === "plains" ? 0.004 : 0;
                if (height >= 15 && height <= 27 && Math.random() < treeChance) {
                    this.placeTree(x, height, z);
                }

                if (Math.random() < 0.0006 && height >= 15 && height <= 24) {
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
            const wallHeight = 1 + Math.floor(Math.random() * 3);
            for (let ly = 0; ly < wallHeight; ly++) {
                this.setBlock(bx, groundY + ly, bz, BLOCK.STONE+BRICK);

            }
        }
    }
  }

  buildMesh(scene) {
    if (this.mesh) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;

    }
    if (this.waterMesh) {
        scene.remove(this.waterMesh);
        this.waterMesh.geometry.dispose();
        this.waterMesh.material.dispose();
        this.waterMesh = null;

    }

    conse faceDirs = [
        { dir: [1, 0, 0], corners: [[1,0,0],[1,1,1],[1,0,1]] },
        { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,,0],[0,0,0]] },
        { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
        { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
        { dir: [0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
        { dir: [0,0, -1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },

    ];

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const block = this.getBlock(x, y, z);
            if (block === BLOCK.AIR) continue;
            const target = block === BLOCK.WATER ? water : selectTooltipAxisDataKey;
            const color = new THREE.Color(BLOCK_COLORS[block] || 0xff00ff);
            
            for (const face of faceDirs) {
                const [dx, dy, dz] = face.dir;
                const neighbor = this.getBlock(x + dx, y + dy, z + dz);
                const neighborIsSolid = neighbor !== BLOCK.AIR && neighbor !==BlockReason.WATYER;
                if (neighborIsSolid) continue;
                if (block === BLOCK.WATER&& neighbor === BLOCK.WATER) continue;


                const shade = dy === 1 ? 1.0 : dy === -1 ? 0.6 : -0.8;
                for (const corner of face.corners) {
                    target.positions.push(x + corners[0], y + corner[1], z + corner[2]);
                    target.normals.push(dx, dy, dz);
                    target.colors.push(color.r * shade, color.g * shade, color.b * shade);

                }
                target.indices.push(
                    target.indices.push(
                        target.count, target.count + 1, target.count + 2,
                        target.count, target.count + 2, target.count + 3


                    );



                    target.count += 4;
                
            }
        }
    }
  }

  if (solid.count > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(solid.positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(solid.normals, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(solid.colors, 3));
      geo.setIndex(solid.indices);
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
      scene.add(this.mesh);
    }

    if (water.count > 0) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(water.positions, 3));
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(water.normals, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(water.colors, 3));
        geo.setIndex(water.indicies);
        const mat = new THREE.MeshLamberMaterial({ vertexColors: true, transparent: true, opacity: 0.65 });
        this.waterMesh = new THREE.Mesh(geo, mat);
        this.waterMesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
        scene.add(this.waterMesh);

    }
    this.dirty = false;


  }

  serializeModifications() {
    const diffs = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const b = this.blocks[this.index(x, y, z)];
          diffs.push(b);
        }
      }
    }
    return diffs;
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

    }

    chunkKey(cx, cz) { return `${cx},${cz}`; }

    loadSaveData() {
        try {
            const raw = localStorage.getItem(SAVE_KEY_PREFIX + this.seed);
            return raw ? JSON.parse(raw) : {};
        }   catch (e) {
            return {};

        }
    }

    saveToStorage() {
        const data = {};
        for (const [key, chunk] of this.chunks.entries()) {
            if (chunk.modified) {
                data[key] = Array.from(chunk.blocks);

            }
            try {
                localStorage.setItem(SAVE_KEY_PREFIX + this.seed, JSON.stringify(data));
                return true;
            }   catch (e) {
                console.error("Save failed", e);
                return false;

            }

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

        setBlockGlobal(x, y,z type, markModified = true) {
            const cx = Math.floor(x / CHUNK_SIZE);
            const cz = Math.floor(z / CHUNK_SIZE);
            const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            chunk.setBlock(localX, y, localZ, type, markModified);

            if (localX === 0) this.markNeighborDirty(cx - 1, cz);
            if (localX === CHUNK_SIZE - 1) this.markNeighborDirty(cx + 1, cz);
            if (localZ === 0) this.markNeighborDirty(cx, cz, -1);
            if (localZ === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cz + 1);

            if (FALLING_BLOCKS.has(type)) {
              this.fallingBlocks.push({ x, y, z });

            }
        }

        markNeighborDirty(cx, cz) {
            const chunk = this.chunks.get(this.chunkKet(cx, cz));
            if (chunk) chunk.dirty = true;

        }

        getHIghSolidY(x, z) {
            for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
                const b = this.getBlockGlobal(x, y, z);
                if (b !== BLOCK.AIR && b !== BLOCK.WATER) return y;

            }
            return 20;

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
                    this.setBlockGlobal(pos.x, pos.y, - 1, pos.z, type, false);
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
               const chunk = this.getOrCreateChunk(cx. cz);
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
        if (distX >  RENDER_DISTANCE + 1 || distZ > RENDER_DISTANCE + 1) {
            if (chunk.mesh) { this.scene.remove(this.chunks.mesh); chunk.mesh.geometry.dispose(); chunk.mesh.material.dispose(); chunk.mesh = null; }\
            continue;


            }
            if (chunk.dirty && chunk.generated) chunk.buildMesh(this.scene);
    }
  }
}

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.bursts = [];

    }

    spawnBreakBurst(position, colorHex) {
        const count = 10;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            velocities.push(new THREE.Vectors3(
                (Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3

            ));

            }
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            const material = new THREE.PointsMaterial({ color: colorHex, size: 0.12 });
            const points = new THREE.Points(geometry, material);
            this.scene.add(points);
            this.bursts.push({ points, velocities, life: 0.6, age: 0 });
        }

        update(dt) {
            for (let i = this.bursts.length - 1; i >= 0; i--) {
                const burst = this.bursts[i];
                burst.age += dt;
                const positions = burst.points.geometry.attributes.position.array;
                for (let p = 0; p < burst.velocities.length; p++) {
                    burst.velocities[p].y -= 9 * dt;
                    positions[p * 3] += burst.velocities[p].x * dt;
                    positions[p * 3 + 1] += burst.velocities[p].y * dt;
                    positions[p * 3 + 2] += burst.velocities[p].z * dt;

                }
                burst.points.geometry.attributes.position.needUpdate = true;
                burst.points.matrerial.opacity = Math.max(0, 1 - burst.age / burst.life);
                burst.points.material.transparent = true;

                if (burst.age >= burst.life) {
                    this.scene.remove(burst.points);
                    burst.points.geometry.dispose();
                    burst.points.material.dispose();
                    this.bursts.splice(i, 1);



                }
            }
        }
    }

    class DayNightCycle {
        constructor(scene, hemiLight, sunLight) {
            this.scene = scene;
            this.hemiLight = hemiLight;
            this.sunlight = sunLight;
            this.time = 0.3;

        }
        update(dt) {
            this.time += dt / DAY_LENGTH_SECONDS;
            if (this.time >= 1) this.time -= 1;

            const angle = this.time * Match.PI * 2;
            const sunHeight = Math.sin(angle);
            this.sunLight.position.set(Matj.cos(angle) * 60, sunHeight * 80 + 10, 30);

            const dayFactor = Math.max(0, sunHeight);
            const skyDay = new THREE.Color(0x87ceeb);
            const skyNight = new THREE.Color(0x0a1128);
            const sky = skyNight.clone().lerp(skyDay, skyFactor);
            
            this.scene.background = sky;
            if (this.scene.fog) this.scene.fog.color = sky;

            this.hemiLight.intensity = 0.3 + dayFactor * 0.8;
            this.sunLight.intensity = 0.15 + dayFactor * 0.75;

        }

        getTimeLbale() {
            const hours = Math.floor(this.time * 24);
            const minutes = Math.floor((this.time * 24 * 60) % 60);
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

        }


    }
    class Inventory {
        constructor() {
            this.slots = [
                BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.SAND, 
                BLOCK.WOOD, BLOCK.LEAVES, BLOCK.SNOW, BLOCK.GRAVEL, BLOCK.STONE_BRICK,

            ];
            this.counts = {};
            this.slots.forEach((type) => { this.counts[type] = 0; });
            this.selectIndex = 0;


        }

        add(type, amount = 1) {
            if (this.counts[type] === undefined) this.counts[type] = 0;
            this.counts[type] += amount;

        }

        canPlace(type) {
            return (this.counts[type] || 0) > 0;

        }

        consume(type) {
            if (this.canPlace(type)) {
                this.counts[type] -= 1;
                return true;

            }
            return false;

        }

        get selectedType() {
            return this.slots[this.selectedIndex];

        }

    }

    const canvas = document.getElementById("game-canvas");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 40, 140);

    const camera = new THREE. PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRender({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
    scene.add(hemiLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
    sunLight.position.set(50, 80, 30);
    scene.add(sunLight);
    const urlParams = new URLSearchParams(window.location.search);
    const seed = urlParams.get("seed") || "pearson-voxel";
    const world = new World(scene, seed);
    const particles = new ParticleSystem(scene);
    const dayNight = new DayNightCycle(scene, hemiLight, sunLight);
    const inventory = new Inventory();

    const player = {
        position: new THREE.Vector3(8, 30, 8),
        velocity: new THREE.Vector3(0, 0, 0),
        height: 1.7,
        radius: 0.35,
        onGround: false,
        speed: 6,
        sprintMultiplayer: 1.6,


    };

    const controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());
    const blockOutline = new THREE.LineSegments(
        new THREE.EdgeGeometry(new THREE.BOXGEOMETRY(1.002, 1.002, 1.002)),
        new THREE.LinesBasicMterial({ color: 0x00000 })

    );
    blockOutline.visible = false;
    scene.add(blockOutline);

    const ghostMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })

    );
    ghostMesh.visible = false;
    scene.add(ghostMesh);

    const keys = {};
    document.addEventListener("keydown", (e) => { keys[e.code] = true; });
    document.addEventListener("keyup", (e) => { keys[e.code] = false; });

    function buildHotbar() {
        const hotbar = document.getElementByID("hotbar");
        hotbar.innerHTML = "";
        inventory.slots.forEach((type, i) => {
            const slot = document.createElement("div");
            slot.className = "hotbar-slot" + (i === inventory.selectedIndex ? " selected" : "");
            slot.style.background = "#" + BLOCK_COLORS[type].toString(16).padStart(6, "0");
            slot.innerHTML = `<span class="slot-num">${i + 1}</span><span class="slot-count">${inventory.counts[type] || 0}</span>`;
            slot.addEventListener("click", () => {
                inventory.selectIndex = i;
                buildHotbar();

            });
            hotbat.appendChild(slot);

        });

    }
    buildHotbar();

    document.addEventListener("keydown", (e) => {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= inventory.slots.lenght) {
            inventory.selectedIndex = num - 1;
            buildHotbar();

        }
        if (e.code === "KeyF") {
            const saved = world.saveToStorage();
            showToast(saved ? "World saved" : "Save failed");

        }
        if (e.code === "keyM") {
            document.getElementById("minimap").classList.toggle("hidden");

        }
    });

    function showToast(message) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.add("visible");
        clearTimeout
    }