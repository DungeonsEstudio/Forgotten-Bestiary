import { world, system } from "@minecraft/server";

const SPINACULEX_ID = "si:spinaculex";
const TAG_BADOMEN = "derretimiento_cerebral";
const DURACION_MONTADO = 83; // 83 ticks = 4.125 segundos
const TAG_TEMP = "spina_temp_montado";

// Mapa: id del Spinaculex → tick en que se montó
const montados = new Map();

system.runInterval(() => {
    const dimensiones = ["overworld", "nether", "the_end"];

    for (const dimName of dimensiones) {
        let dim;
        try {
            dim = world.getDimension(dimName);
        } catch (e) { continue; }

        let spinas = [];
        try {
            spinas = dim.getEntities({ type: SPINACULEX_ID });
        } catch (e) { continue; }

        for (const spina of spinas) {
            try {
                const riding = spina.getComponent("minecraft:riding");
                const jinete = riding ? riding.entityRidingOn : undefined;

                if (!jinete) {
                    montados.delete(spina.id);
                    continue;
                }

                // Solo si el jinete es un jugador
                let esJugador = false;
                try {
                    esJugador = jinete.typeId === "minecraft:player";
                } catch (e) { esJugador = false; }

                if (!esJugador) {
                    montados.delete(spina.id);
                    continue;
                }

                // Primer tick montado
                if (!montados.has(spina.id)) {
                    montados.set(spina.id, system.currentTick);

                    // 50/50 entre veneno y tag
                    const aleatorio = Math.random();

                    if (aleatorio < 0.5) {
                        try {
                            jinete.addEffect("poison", 80, { amplifier: 4, showParticles: true });
                        } catch (e) {}
                    } else {
                        try {
                            jinete.addTag(TAG_BADOMEN);
                        } catch (e) {}
                        try {
                            dim.runCommand(`tag "${jinete.name}" add ${TAG_BADOMEN}`);
                        } catch (e) {}
                    }

                    continue;
                }

                // Calcular tiempo montado
                const tiempoMontado = system.currentTick - montados.get(spina.id);

                if (tiempoMontado >= DURACION_MONTADO) {
                    // Desmontar
                    try {
                        spina.addTag(TAG_TEMP);
                        dim.runCommand(`ride @e[tag=${TAG_TEMP},c=1] stop_riding`);
                        spina.removeTag(TAG_TEMP);
                    } catch (e) {
                        try { spina.removeTag(TAG_TEMP); } catch (e2) {}
                    }

                    montados.delete(spina.id);
                }
            } catch (e) {
                montados.delete(spina.id);
            }
        }
    }
}, 100); // revisa cada 0.25 s