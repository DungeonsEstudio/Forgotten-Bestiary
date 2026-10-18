import { world, system } from "@minecraft/server";

// ============================================
// CONFIGURACIÓN
// ============================================
const BADOMEN_TAG = "derretimiento_cerebral";
const NOMBRE_TRAD = "effect.si.derretimiento_cerebral";

const EFECTOS = [
    { id: "poison",         amplifier: 4 },
    { id: "nausea",         amplifier: 4 },
    { id: "slowness",       amplifier: 4 },
    { id: "blindness",      amplifier: 4 },
    { id: "mining_fatigue", amplifier: 4 },
    { id: "darkness",       amplifier: 4 },
    { id: "weakness",       amplifier: 4 }
];
const DURACION = 200; // 10 s por efecto

const progreso = new Map();


// ============================================
// BUCLE PRINCIPAL
// ============================================
system.runInterval(() => {
    const players = world.getAllPlayers();

    for (const player of players) {
        // Comprobar tag con protección
        let tieneTag = false;
        try {
            tieneTag = player.hasTag(BADOMEN_TAG);
        } catch (e) {
            progreso.delete(player.id);
            continue;
        }

        if (!tieneTag) {
            progreso.delete(player.id);
            continue;
        }

        // Primera vez: badOmen:1 (por comando, para la UI)
        if (!progreso.has(player.id)) {
            progreso.set(player.id, 0);
            try {
                player.runCommand(`title @s title "badOmen:1"`);
            } catch (e) {}
            aplicarEfecto(player, 0);
            continue;
        }

        // Actionbar persistente con traducción
        try {
            player.onScreenDisplay.setActionBar({ translate: NOMBRE_TRAD });
        } catch (e) {}

        // Ciclo de efectos
        const indice = progreso.get(player.id);
        const actual = EFECTOS[indice];

        let efecto = undefined;
        try {
            efecto = player.getEffect(actual.id);
        } catch (e) {
            progreso.delete(player.id);
            continue;
        }

        if (!efecto || efecto.duration <= 40) {
            try {
                player.removeEffect(actual.id);
            } catch (e) {}

            const siguiente = (indice + 1) % EFECTOS.length;
            progreso.set(player.id, siguiente);
            aplicarEfecto(player, siguiente);
        }
    }
}, 20); // cada 1 segundo


// ============================================
// APLICAR EFECTO
// ============================================
function aplicarEfecto(player, indice) {
    const efecto = EFECTOS[indice];
    if (!efecto) return;
    try {
        player.addEffect(efecto.id, DURACION, {
            amplifier: efecto.amplifier,
            showParticles: true
        });
    } catch (e) {}
}


// ============================================
// LIMPIAR AL MORIR (con badOmen:0 para la UI)
// ============================================
world.afterEvents.entityDie.subscribe((eventData) => {
    const entity = eventData.deadEntity;
    if (!entity) return;

    // Comprobar tag con protección
    let tieneTag = false;
    try {
        tieneTag = entity.hasTag(BADOMEN_TAG);
    } catch (e) {
        return;
    }
    if (!tieneTag) return;

    // Guardar datos ANTES de que la entidad sea inválida
    const nombreJugador = entity.name;
    const dimension = entity.dimension;
    const idJugador = entity.id;

    // Limpiar Map
    progreso.delete(idJugador);

    // Limpiar tag y efectos (todavía válido en este punto)
    try {
        entity.removeTag(BADOMEN_TAG);
        for (const efecto of EFECTOS) {
            entity.removeEffect(efecto.id);
        }
    } catch (e) {}

    // Ejecutar los comandos de UI con un pequeño delay
    // usando el nombre del jugador, no @s
    system.runTimeout(() => {
        try {
            dimension.runCommand(`title "${nombreJugador}" title "badOmen:0"`);
            dimension.runCommand(`title "${nombreJugador}" actionbar ""`);
        } catch (e) {}
    }, 1); // 1 tick de delay
});