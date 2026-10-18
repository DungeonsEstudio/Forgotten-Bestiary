import { world, system } from "@minecraft/server";

// ============================================================
//  CONSTANTES GLOBALES
// ============================================================
const WATER_BLOCKS = new Set(["minecraft:water", "minecraft:flowing_water"]);

const OFFSETS_ADYACENTES = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
];

// ============================================================
//  UTILIDADES
// ============================================================
function estaEnAgua(dimension, location) {
    for (const off of OFFSETS_ADYACENTES) {
        const checkBlock = dimension.getBlock({
            x: location.x + off.x,
            y: location.y + off.y,
            z: location.z + off.z
        });
        if (checkBlock && WATER_BLOCKS.has(checkBlock.typeId)) return true;
    }
    return false;
}

function spawnearParticulasFelices(dimension, centerLocation) {
    for (let i = 0; i < 20; i++) {
        dimension.spawnParticle("minecraft:villager_happy", {
            x: centerLocation.x + (Math.random() - 0.5) * 1.0,
            y: centerLocation.y + (Math.random() - 0.5) * 1.0,
            z: centerLocation.z + (Math.random() - 0.5) * 1.0
        });
    }
}

// ============================================================
//  1) HUEVOS TERRESTRES (2 FASES: grieta + eclosión)
// ============================================================
const HUEVOS_TERRESTRES = {
    "si:bearcroo_egg": {
        roto: "si:egg_bearcroo_hach",
        bebe: "si:baby_bearcroo",
        tiempo: 9000
    },
    "si:egg_dragonskin": {
        roto: "si:egg_dragonskin_hach",
        bebe: "si:baby_dragonskin",
        tiempo: 6000
    },
    "si:egg_venatosaurus_impavidus": {
        roto: "si:egg_venatosaurus_impavidus_hach",
        bebe: "si:baby_venatosaurus_impavidus",
        tiempo: 9000
    },
    // 🔥 TIEMPO RESTAURADO A 9000
    "si:dirusuchus_egg": {
        roto: "si:egg_dirusuchus_hach",
        bebe: "si:baby_diru",
        tiempo: 9000 
    }
};

// ============================================================
//  2) HUEVOS ACUÁTICOS (1 FASE: solo eclosión en agua)
// ============================================================
const HUEVOS_ACUATICOS = {
    "si:bloodfish_egg": { bebe: "si:bloodfish_baby", tiempo: 7200 },
    "si:sepulcro_egg":  { bebe: "si:sepulcro_baby",  tiempo: 7200 },
    "si:spinaculex_egg":{ bebe: "si:larva_agua",     tiempo: 7200 }
};

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { player, block } = event;
    const tipo = block.typeId;

    const dimension = player.dimension;
    const location = block.location;
    const centerLocation = {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5
    };

    // ----- HUEVOS ACUÁTICOS -----
    if (HUEVOS_ACUATICOS[tipo]) {
        const datos = HUEVOS_ACUATICOS[tipo];

        if (!estaEnAgua(dimension, location)) {
            dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
            return;
        }

        spawnearParticulasFelices(dimension, centerLocation);

        system.runTimeout(() => {
            const actual = dimension.getBlock(location);
            if (!actual || actual.typeId !== tipo) return;

            dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} air destroy`);

            system.runTimeout(() => {
                dimension.runCommand(`summon ${datos.bebe} ${centerLocation.x} ${centerLocation.y} ${centerLocation.z}`);
            }, 5);
        }, datos.tiempo);
        return;
    }

    // ----- HUEVOS TERRESTRES -----
    if (HUEVOS_TERRESTRES[tipo]) {
        const datos = HUEVOS_TERRESTRES[tipo];

        spawnearParticulasFelices(dimension, centerLocation);
        dimension.playSound("block.sniffer_egg.plop", centerLocation);

        // Primera fase: agrietar
        system.runTimeout(() => {
            const actual = dimension.getBlock(location);
            if (!actual || actual.typeId !== tipo) return;

            dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} ${datos.roto}`);
            dimension.playSound("block.sniffer_egg.crack", centerLocation);

            // Segunda fase: eclosionar
            system.runTimeout(() => {
                const roto = dimension.getBlock(location);
                if (!roto || roto.typeId !== datos.roto) return;

                dimension.playSound("block.sniffer_egg.hatch", centerLocation);
                dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} air destroy`);

                system.runTimeout(() => {
                    dimension.runCommand(`summon ${datos.bebe} ${centerLocation.x} ${centerLocation.y} ${centerLocation.z}`);
                }, 5);
            }, datos.tiempo);
        }, datos.tiempo);
    }
});

// ============================================================
//  3) SEPULCRO: se come peces cercanos
// ============================================================
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
const TICKS_COOLDOWN = 200;
const RADIO_COMER    = 1.6;
const DIMS           = ["overworld", "nether", "the_end"];

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

function engullirPez(sep, pez) {
    if (!sep.isValid || sep.hasTag(TAG_COMIENDO)) return;
    sep.addTag(TAG_COMIENDO);

    const dim = sep.dimension;

    try { pez.kill(); } catch {}

    try {
        dim.playSound("mob.guardian.attack", sep.location, { volume: 1.2, pitch: 0.6 });
    } catch {}

    system.runTimeout(() => {
        if (!sep.isValid) return;
        try {
            dim.playSound("random.splash", sep.location, { volume: 0.8, pitch: 0.5 });
        } catch {}
    }, 8);

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

    system.runTimeout(() => {
        if (!sep.isValid) return;
        try { sep.removeTag(TAG_COMIENDO); } catch {}
    }, TICKS_COOLDOWN);
}