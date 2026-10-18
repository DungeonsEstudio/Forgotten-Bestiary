import { world, system } from "@minecraft/server";

// ============================================
// TIEMPOS UNIFICADOS (en ms) - MODO TEST
// ============================================
const TIEMPO_FASE = 1000;
const TIEMPO_SIN_GRIETAS = 1200;

// ============================================
// CONFIGURACIÓN DE HUEVOS
// El Spinaculex NO está aquí porque su larva
// se spawna directamente desde reproduccion.js
// ============================================
export const EGG_CONFIG = {
    "si:egg_venatosaurus_impavidus": {
        cracked: "si:egg_venatosaurus_impavidus_hach",
        baby: "si:baby_venatosaurus_impavidus"
    },
    "si:bloodfish_egg": {
        cracked: null,
        baby: "si:bloodfish_baby"
    },
    "si:egg_dragonskin": {
        cracked: "si:egg_dragonskin_hach",
        baby: "si:baby_dragonskin"
    },
    "si:bearcroo_egg": {
        cracked: "si:egg_bearcroo_hach",
        baby: "si:baby_bearcroo"
    },
    "si:sepulcro_egg": {
        cracked: null,
        baby: "si:sepulcro_baby"
    },
    // 🔥 NUEVO: Huevo de Dirusuchus
    "si:dirusuchus_egg": {
        cracked: "si:egg_dirusuchus_hach",
        baby: "si:baby_diru"
    }
};


// ============================================
// FUNCIÓN PRINCIPAL DE ECLOSIÓN
// ============================================
export function iniciarEclosion(dimension, location) {
    const block = dimension.getBlock(location);
    if (!block) return;

    const config = EGG_CONFIG[block.typeId];
    if (!config) return;

    const centerLocation = {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5
    };

    // 1. Partículas y sonido al colocar
    for (let i = 0; i < 20; i++) {
        dimension.spawnParticle("minecraft:villager_happy", {
            x: centerLocation.x + (Math.random() - 0.5) * 1.0,
            y: centerLocation.y + (Math.random() - 0.5) * 1.0,
            z: centerLocation.z + (Math.random() - 0.5) * 1.0
        });
    }
    dimension.playSound("block.sniffer_egg.plop", centerLocation);

    // 2. Con grietas o sin grietas
    if (config.cracked) {
        system.runTimeout(() => {
            const currentBlock = dimension.getBlock(location);
            if (!currentBlock || currentBlock.typeId !== block.typeId) return;

            dimension.runCommand(
                `setblock ${location.x} ${location.y} ${location.z} ${config.cracked}`
            );
            dimension.playSound("block.sniffer_egg.crack", centerLocation);

            system.runTimeout(() => {
                const crackedBlock = dimension.getBlock(location);
                if (!crackedBlock || crackedBlock.typeId !== config.cracked) return;
                eclosionar(dimension, location, centerLocation, config);
            }, TIEMPO_FASE);
        }, TIEMPO_FASE);
    } else {
        system.runTimeout(() => {
            const currentBlock = dimension.getBlock(location);
            if (!currentBlock || currentBlock.typeId !== block.typeId) return;
            eclosionar(dimension, location, centerLocation, config);
        }, TIEMPO_SIN_GRIETAS);
    }
}


// ============================================
// FUNCIÓN INTERNA DE ECLOSIÓN
// ============================================
function eclosionar(dimension, location, centerLocation, config) {
    dimension.playSound("block.sniffer_egg.hatch", centerLocation);

    dimension.runCommand(
        `setblock ${location.x} ${location.y} ${location.z} air destroy`
    );

    system.runTimeout(() => {
        dimension.runCommand(
            `summon ${config.baby} ${centerLocation.x} ${centerLocation.y} ${centerLocation.z}`
        );
    }, 5);
}


// ============================================
// DETECTAR HUEVOS COLOCADOS POR JUGADOR
// ============================================
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    if (!EGG_CONFIG[block.typeId]) return;
    iniciarEclosion(player.dimension, block.location);
});