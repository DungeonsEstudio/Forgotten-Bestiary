import { world, system } from "@minecraft/server";
import { EGG_CONFIG, iniciarEclosion } from "./huevos.js";

// ============================================
// CONFIGURACIÓN DE REPRODUCCIÓN
// directSpawn: true → hace summon de la cría directamente
//               (no coloca bloque huevo)
// ============================================
const CONFIG = {
    "si:spinaculex": {
        adultos: 2,
        radio: 16,
        maxPoblacion: 2,
        cooldown: 6000,
        eggBlock: "si:spinaculex_egg",
        requiresWater: true,
        avoidWater: false,
        directSpawn: true,          // ← summon directo de larva_agua
        directBaby: "si:larva_agua" // ← cría a spawnear
    },
    "si:venatosaurus_impavidus": {
        adultos: 2,
        radio: 20,
        maxPoblacion: 2,
        cooldown: 9600,
        eggBlock: "si:egg_venatosaurus_impavidus",
        requiresWater: false,
        avoidWater: true,
        directSpawn: false
    },
    "si:bloodfish": {
        adultos: 2,
        radio: 10,
        maxPoblacion: 2,
        cooldown: 6000,
        eggBlock: "si:bloodfish_egg",
        requiresWater: true,
        avoidWater: false,
        directSpawn: false
    },
    "si:dragonskin": {
        adultos: 2,
        radio: 20,
        maxPoblacion: 2,
        cooldown: 9600,
        eggBlock: "si:egg_dragonskin",
        requiresWater: false,
        avoidWater: true,
        directSpawn: false
    },
    "si:bearcroo": {
        adultos: 2,
        radio: 20,
        maxPoblacion: 2,
        cooldown: 9600,
        eggBlock: "si:bearcroo_egg",
        requiresWater: false,
        avoidWater: true,
        directSpawn: false
    },
    "si:sepulcro": {
        adultos: 2,
        radio: 16,
        maxPoblacion: 2,
        cooldown: 9600,
        eggBlock: "si:sepulcro_egg",
        requiresWater: true,
        avoidWater: false,
        directSpawn: false
    },
    // 🔥 NUEVO: Dirusuchus (Solo en tierra)
    "si:dirusuchus": {
        adultos: 2,
        radio: 20,
        maxPoblacion: 2,
        cooldown: 9600,
        eggBlock: "si:dirusuchus_egg",
        requiresWater: false,
        avoidWater: true, // ← Esto hace que SOLO ponga huevos en tierra
        directSpawn: false
    }
};

const cooldowns = new Map();

// ============================================
// COMPROBAR SI EL MOB ESTÁ EN/SOBRE AGUA
// ============================================
function estaEnAgua(mob) {
    try {
        if (mob.isInWater) return true;

        const dim = mob.dimension;
        const loc = mob.location;

        for (let i = 1; i <= 3; i++) {
            const bloque = dim.getBlock({
                x: Math.floor(loc.x),
                y: Math.floor(loc.y) - i,
                z: Math.floor(loc.z)
            });
            if (bloque) {
                const id = bloque.typeId;
                if (id === "minecraft:water" || id === "minecraft:flowing_water") {
                    return true;
                }
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

// ============================================
// COMPROBAR SI LA POSICIÓN ES AGUA
// ============================================
function posEsAgua(dim, pos) {
    try {
        const bloque = dim.getBlock(pos);
        if (!bloque) return false;
        const id = bloque.typeId;
        return id === "minecraft:water" || id === "minecraft:flowing_water";
    } catch (e) {
        return false;
    }
}

// ============================================
// BUCLE PRINCIPAL
// ============================================
system.runInterval(() => {
    const dimensiones = ["overworld", "nether", "the_end"];

    for (const dimName of dimensiones) {
        let dim;
        try { dim = world.getDimension(dimName); } catch (e) { continue; }

        for (const [mobId, cfg] of Object.entries(CONFIG)) {
            let mobs = [];
            try {
                mobs = dim.getEntities({ type: mobId });
            } catch (e) { continue; }

            for (const mob of mobs) {
                try {
                    // Cooldown
                    if (cooldowns.has(mob.id)) {
                        const ultimo = cooldowns.get(mob.id);
                        if (system.currentTick - ultimo < cfg.cooldown) continue;
                    }

                    // requiresWater: solo si toca agua
                    if (cfg.requiresWater && !estaEnAgua(mob)) continue;

                    // avoidWater: solo si NO está en agua
                    if (cfg.avoidWater && estaEnAgua(mob)) continue;

                    // Contar población total
                    const cerca = dim.getEntities({
                        type: mobId,
                        location: mob.location,
                        maxDistance: cfg.radio
                    });

                    let poblacion = cerca.length;

                    // Contar crías (bloque o directa)
                    const babyId = cfg.directSpawn ? cfg.directBaby : EGG_CONFIG[cfg.eggBlock]?.baby;
                    if (babyId && babyId !== mobId) {
                        try {
                            const bebes = dim.getEntities({
                                type: babyId,
                                location: mob.location,
                                maxDistance: cfg.radio
                            });
                            poblacion += bebes.length;
                        } catch (e) {}
                    }

                    if (cerca.length < cfg.adultos) continue;
                    if (poblacion > cfg.maxPoblacion) continue;

                    // ─────────────────────────────────────
                    // MODO DIRECT SPAWN (Spinaculex)
                    // Busca agua debajo y spawn larva directo
                    // ─────────────────────────────────────
                    if (cfg.directSpawn) {
                        // Buscar agua hasta 5 bloques debajo
                        let posAgua = null;
                        for (let i = 1; i <= 5; i++) {
                            const check = {
                                x: Math.floor(mob.location.x),
                                y: Math.floor(mob.location.y) - i,
                                z: Math.floor(mob.location.z)
                            };
                            if (posEsAgua(dim, check)) {
                                posAgua = check;
                                break;
                            }
                        }

                        if (!posAgua) continue;

                        // Spawn de la larva justo encima del agua
                        const spawnPos = {
                            x: posAgua.x + 0.5,
                            y: posAgua.y + 1,
                            z: posAgua.z + 0.5
                        };

                        try {
                            dim.runCommand(
                                `summon ${cfg.directBaby} ${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`
                            );
                        } catch (e) {
                            continue;
                        }

                        // Partículas y sonido
                        try {
                            for (let i = 0; i < 15; i++) {
                                dim.spawnParticle("minecraft:bubble_column_up_particle", {
                                    x: spawnPos.x + (Math.random() - 0.5),
                                    y: spawnPos.y + Math.random() * 0.5,
                                    z: spawnPos.z + (Math.random() - 0.5)
                                });
                            }
                            dim.playSound("random.splash", spawnPos, { volume: 0.8, pitch: 0.7 });
                        } catch (e) {}

                        // Cooldown a todos los adultos cercanos
                        for (const adulto of cerca) {
                            cooldowns.set(adulto.id, system.currentTick);
                        }
                        break;
                    }

                    // ─────────────────────────────────────
                    // MODO BLOQUE HUEVO (los demás)
                    // ─────────────────────────────────────
                    const pos = {
                        x: Math.floor(mob.location.x),
                        y: Math.floor(mob.location.y),
                        z: Math.floor(mob.location.z)
                    };

                    if (cfg.avoidWater && posEsAgua(dim, pos)) continue;

                    try {
                        dim.runCommand(
                            `setblock ${pos.x} ${pos.y} ${pos.z} ${cfg.eggBlock} replace`
                        );
                    } catch (e) {
                        continue;
                    }

                    system.runTimeout(() => {
                        iniciarEclosion(dim, pos);
                    }, 1);

                    for (const adulto of cerca) {
                        cooldowns.set(adulto.id, system.currentTick);
                    }
                    break;
                } catch (e) {
                    // silencioso
                }
            }
        }
    }
}, 100);


// ============================================
// LIMPIAR COOLDOWNS AL MORIR
// ============================================
world.afterEvents.entityDie.subscribe((eventData) => {
    const entity = eventData.deadEntity;
    if (!entity) return;
    cooldowns.delete(entity.id);
});