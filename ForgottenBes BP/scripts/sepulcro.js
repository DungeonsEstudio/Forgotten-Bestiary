import { world, system } from "@minecraft/server";

const PECES = new Set([
    "minecraft:cod",
    "minecraft:salmon",
    "minecraft:tropical_fish",
    "minecraft:pufferfish",
    "minecraft:axolotl",
    "si:bloodfish"
]);


const SEPULCRO_ID    = "si:sepulcro";
const TAG_COMIENDO   = "si_comiendo";
const TICKS_COOLDOWN = 200; // 10 s entre tragos de peces
const RADIO_COMER    = 1.6;
const DIMS           = ["overworld", "nether", "the_end"];

// ─── Bucle: sepulcro toca un pez → engullir ─────────────────────────────────
system.runInterval(() => {
    for (const nombre of DIMS) {
        let dim;
        try { dim = world.getDimension(nombre); } catch { continue; }

        let sepulcros;
        try { sepulcros = dim.getEntities({ type: SEPULCRO_ID }); } catch { continue; }

        for (const sep of sepulcros) {
            if (!sep.isValid) continue;
            if (sep.hasTag(TAG_COMIENDO)) continue;

            let peces = [];
            try {
                peces = dim.getEntities({
                    location: sep.location,
                    maxDistance: RADIO_COMER
                }).filter(e => PECES.has(e.typeId) && e.isValid);
            } catch { continue; }

            if (peces.length > 0) engullirPez(sep, peces[0]);
        }
    }
}, 2);

// ─── Engullir pez: mata + sonido + burbujas + cooldown ───────────────────────
function engullirPez(sep, pez) {
    if (!sep.isValid || sep.hasTag(TAG_COMIENDO)) return;
    sep.addTag(TAG_COMIENDO);

    const dim = sep.dimension;

    try { pez.kill(); } catch {}

    // Sonido de trago
    try {
        dim.playSound("mob.guardian.attack", sep.location, { volume: 1.2, pitch: 0.6 });
    } catch {}
    system.runTimeout(() => {
        if (!sep.isValid) return;
        try {
            dim.playSound("random.splash", sep.location, { volume: 0.8, pitch: 0.5 });
        } catch {}
    }, 8);

    // Burbujas 2 s
    const burbujas = system.runInterval(() => {
        if (!sep.isValid) { system.clearRun(burbujas); return; }
        try {
            const loc = sep.location;
            for (let i = 0; i < 6; i++) {
                dim.spawnParticle("minecraft:bubble_column_up_particle", {
                    x: loc.x + (Math.random() - 0.5) * 0.8,
                    y: loc.y + 0.6 + Math.random() * 0.8,
                    z: loc.z + (Math.random() - 0.5) * 0.8
                });
            }
        } catch {}
    }, 4);
    system.runTimeout(() => { system.clearRun(burbujas); }, 40);

    // Cooldown 10 s → puede volver a comer
    system.runTimeout(() => {
        if (!sep.isValid) return;
        try { sep.removeTag(TAG_COMIENDO); } catch {}
    }, TICKS_COOLDOWN);
}