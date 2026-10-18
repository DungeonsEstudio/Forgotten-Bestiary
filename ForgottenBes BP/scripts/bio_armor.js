import { world, system, EquipmentSlot } from "@minecraft/server";

const ARMADURA_BIO = {
    [EquipmentSlot.Head]:  "si:bio_helmet",
    [EquipmentSlot.Chest]: "si:bio_chestplate",
    [EquipmentSlot.Legs]:  "si:bio_leggings",
    [EquipmentSlot.Feet]:  "si:bio_boots"
};

const BOTAS_DIRU = "si:dirusuchus_boots";
const DURACION = 200;      // 10s (se renueva cada 1s = infinito mientras lo lleves)
const AMPLIFICADOR = 2;    // Resistencia III (60% reduccion)

system.runInterval(() => {
    for (const jugador of world.getAllPlayers()) {
        const eq = jugador.getComponent("minecraft:equippable");
        if (!eq) continue;

        // ============================================
        // SET BIO COMPLETO -> Resistencia III
        // ============================================
        const completo =
            eq.getEquipment(EquipmentSlot.Head)?.typeId  === ARMADURA_BIO[EquipmentSlot.Head]  &&
            eq.getEquipment(EquipmentSlot.Chest)?.typeId === ARMADURA_BIO[EquipmentSlot.Chest] &&
            eq.getEquipment(EquipmentSlot.Legs)?.typeId  === ARMADURA_BIO[EquipmentSlot.Legs]  &&
            eq.getEquipment(EquipmentSlot.Feet)?.typeId  === ARMADURA_BIO[EquipmentSlot.Feet];

        if (completo) {
            jugador.addEffect("resistance", DURACION, {
                amplifier: AMPLIFICADOR,
                showParticles: false
            });
        } else {
            // Se quita AL INSTANTE al perder cualquier pieza
            jugador.removeEffect("resistance");
        }

        // ============================================
        // BOTAS DE DIRU -> Velocidad de nado (Conduit Power)
        // ============================================
        if (eq.getEquipment(EquipmentSlot.Feet)?.typeId === BOTAS_DIRU) {
            jugador.addEffect("conduit_power", DURACION, {
                amplifier: 1,
                showParticles: false
            });
        } else {
            jugador.removeEffect("conduit_power");
        }
    }
}, 20); // 20 ticks = 1 segundo