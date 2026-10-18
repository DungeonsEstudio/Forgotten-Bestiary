import { world, system } from "@minecraft/server";

// Mapa para guardar el cooldown de cada jugador
const cooldowns = new Map();
const COOLDOWN_TICKS = 40; // 2 segundos de espera entre cada larva consumida

world.afterEvents.itemCompleteUse.subscribe((event) => {
    const { source, itemStack } = event;

    // Solo actuar si el ítem consumido es si:larva
    if (!itemStack || itemStack.typeId !== "si:larva") return;

    // === SISTEMA DE COOLDOWN ===
    // Si el jugador ya está en cooldown, no hacer nada
    if (cooldowns.has(source.id)) {
        return;
    }

    // Añadir al jugador al cooldown
    cooldowns.set(source.id, system.currentTick);

    // Quitar el cooldown después del tiempo establecido
    system.runTimeout(() => {
        cooldowns.delete(source.id);
    }, COOLDOWN_TICKS);
    // ===========================

    // Efecto Fuerza por 30 segundos (600 ticks)
    source.addEffect("strength", 600, {
        amplifier: 0,
        showParticles: true
    });

    // Efecto Velocidad por 30 segundos (600 ticks)
    source.addEffect("speed", 600, {
        amplifier: 0,
        showParticles: true
    });

    // Efecto Nauseas por 10 segundos (200 ticks)
    source.addEffect("nausea", 200, {
        amplifier: 0,
        showParticles: true
    });

    const dim = source.dimension;
    const loc = source.location;

    // === CUERNO DE CABRA "REFLEXIONAR" (horn.call.0) ===
    // Se reproduce una sola vez para evitar el efecto de sonido doble
    system.runTimeout(() => {
        dim.playSound("horn.call.0", loc, { volume: 1.0, pitch: 1.0 });
    }, 0);

    // === CAMPANA DE PELEA DE BOXEO: 3 TOQUES ===
    const toques = 3;
    const pausa = 9; // ticks entre toque y toque (9 ticks = 0.45s)

    for (let i = 0; i < toques; i++) {
        const esUltimo = (i === toques - 1);

        system.runTimeout(() => {
            // Cuerpo de bronce de la campana
            dim.playSound("block.bell.hit", loc, {
                volume: 0.5,
                pitch: esUltimo ? 1.2 : 1.3
            });

            // Brillo metalico agudo del martillazo
            dim.playSound("note.bell", loc, {
                volume: 0.35,
                pitch: esUltimo ? 1.6 : 1.8
            });

            // El ultimo toque se deja resonar un poco mas
            if (esUltimo) {
                dim.playSound("block.bell.resonate", loc, {
                    volume: 0.3,
                    pitch: 1.2
                });
            }
        }, i * pausa);
    }
});