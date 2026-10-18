import { world, system } from "@minecraft/server";

// ============================================================
//  CONFIGURACIÓN
// ============================================================
const THROWN_BILE_ID   = "si:thrown_bile";
const POISON_DURATION  = 200;   // 10 segundos
const POISON_AMPLIFIER = 2;     // Veneno III (0=I, 1=II, 2=III, 3=IV)
const EFFECT_RADIUS    = 4.0;

console.warn("[BilisVeneno] Script cargado correctamente.");

// ============================================================
//  APLICAR VENENO + PARTÍCULAS EN ÁREA
// ============================================================
function aplicarEfectosEnArea(dimension, location, ownerId = null) {
    let entidades = [];
    try {
        entidades = dimension.getEntities({
            location,
            maxDistance: EFFECT_RADIUS,
            excludeTypes: [THROWN_BILE_ID, "minecraft:item", "minecraft:xp_orb"]
        });
    } catch { return; }

    for (const ent of entidades) {
        if (!ent.isValid) continue;
        if (ownerId && ent.id === ownerId) continue;

        // Veneno potente
        try {
            ent.addEffect("poison", POISON_DURATION, {
                amplifier: POISON_AMPLIFIER,
                showParticles: true
            });
        } catch {}
    }

    // ============================================================
    //  PARTÍCULAS DE LA EXPLOSIÓN (nube verde + veneno)
    // ============================================================
    try {
        // Nube verde de partículas "villager_happy"
        for (let i = 0; i < 25; i++) {
            dimension.spawnParticle("minecraft:villager_happy", {
                x: location.x + (Math.random() - 0.5) * EFFECT_RADIUS,
                y: location.y + Math.random() * 1.5,
                z: location.z + (Math.random() - 0.5) * EFFECT_RADIUS
            });
        }
        // Partículas de veneno
        for (let i = 0; i < 20; i++) {
            dimension.spawnParticle("minecraft:poison", {
                x: location.x + (Math.random() - 0.5) * EFFECT_RADIUS,
                y: location.y + (Math.random() - 0.5) * EFFECT_RADIUS,
                z: location.z + (Math.random() - 0.5) * EFFECT_RADIUS
            });
        }
        
        // 🔥 Sonido de impacto tipo Slime (baboso)
        dimension.playSound("mob.slime.attack", location, { volume: 1.2, pitch: 0.8 });
        
    } catch {}
}

// ============================================================
//  EVENTO: IMPACTO CONTRA BLOQUE
// ============================================================
world.afterEvents.projectileHitBlock.subscribe((event) => {
    const { projectile, dimension, location, source } = event;

    if (!projectile || projectile.typeId !== THROWN_BILE_ID) return;

    const impactLoc = location ?? projectile.location;
    aplicarEfectosEnArea(dimension, impactLoc);
});

// ============================================================
//  EVENTO: IMPACTO CONTRA ENTIDAD
// ============================================================
world.afterEvents.projectileHitEntity.subscribe((event) => {
    const { projectile, dimension, source } = event;

    if (!projectile || projectile.typeId !== THROWN_BILE_ID) return;

    // Obtener entidad golpeada
    let objetivo = null;
    try {
        const hit = event.getEntityHit();
        if (hit && hit.entity) objetivo = hit.entity;
    } catch {}

    const impactLoc = objetivo?.location ?? projectile.location;

    // Filtrar al lanzador
    let ownerId = null;
    try { ownerId = source?.id; } catch {}

    aplicarEfectosEnArea(dimension, impactLoc, ownerId);

    // Asegurar que el objetivo directo reciba veneno aunque esté fuera del radio
    if (objetivo && objetivo.isValid) {
        try {
            objetivo.addEffect("poison", POISON_DURATION, {
                amplifier: POISON_AMPLIFIER,
                showParticles: true
            });
        } catch {}
    }
});

// ============================================================
//  RESPALDO: DETECCIÓN POR POLLING (por si el evento falla)
// ============================================================
const DIMENSIONES = ["overworld", "nether", "the_end"]
    .map(n => { try { return world.getDimension(n); } catch { return null; } })
    .filter(Boolean);

const OFFSETS = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
];

function haImpactadoContraBloque(dimension, location) {
    for (const off of OFFSETS) {
        try {
            const b = dimension.getBlock({
                x: Math.floor(location.x) + off.x,
                y: Math.floor(location.y) + off.y,
                z: Math.floor(location.z) + off.z
            });
            if (!b) continue;
            const id = b.typeId;
            if (id === "minecraft:air" || id === "minecraft:water" || id === "minecraft:flowing_water") continue;
            return true;
        } catch {}
    }
    return false;
}

system.runInterval(() => {
    for (const dimension of DIMENSIONES) {
        let proyectiles = [];
        try { proyectiles = dimension.getEntities({ type: THROWN_BILE_ID }); } catch { continue; }

        for (const p of proyectiles) {
            if (!p.isValid) continue;
            const loc = p.location;

            if (haImpactadoContraBloque(dimension, loc)) {
                aplicarEfectosEnArea(dimension, loc);
                try { p.remove(); } catch {}
            }
        }
    }
}, 1);