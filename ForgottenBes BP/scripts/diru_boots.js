import { world, system, EquipmentSlot } from "@minecraft/server";

const BOTAS_DIRU = "si:dirusuchus_boots";
const DURACION = 40;      // 2 segundos (se renueva cada 1s)
const AMPLIFICADOR = 4;   // Speed V (0=I, 1=II, 2=III, 3=IV, 4=V)

system.runInterval(() => {
    for (const jugador of world.getAllPlayers()) {
        const eq = jugador.getComponent("minecraft:equippable");
        if (!eq) continue;

        const botas = eq.getEquipment(EquipmentSlot.Feet);

        // ¿Lleva las botas de Diru?
        const llevaBotas = botas && botas.typeId === BOTAS_DIRU;

        // ¿Está en el agua?
        const enAgua = jugador.isSwimming || jugador.isInWater;

        if (llevaBotas && enAgua) {
            // SOLO dar Speed
            jugador.addEffect("speed", DURACION, {
                amplifier: AMPLIFICADOR,
                showParticles: false
            });
            
            // Forzar la eliminación del Poder del Conducto por si acaso
            jugador.removeEffect("conduit_power");
        } else {
            // Fuera del agua o sin botas -> quitar efecto
            jugador.removeEffect("speed");
        }
    }
}, 20); // 20 ticks = 1 segundo