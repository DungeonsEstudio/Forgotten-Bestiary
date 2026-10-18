import { world } from "@minecraft/server";

world.afterEvents.itemCompleteUse.subscribe((eventData) => {
    const player = eventData.source;
    const itemStack = eventData.itemStack;

    if (!player || !itemStack) return;

    // Poción de veneno de Spinaculex
    if (itemStack.typeId === "si:posion_spinaculex") {
        player.addEffect("poison", 200, { amplifier: 0, showParticles: true });      // 10 s veneno
        player.addEffect("hunger", 300, { amplifier: 1, showParticles: true });      // 15 s hambre
        player.addEffect("weakness", 200, { amplifier: 0, showParticles: true });    // 10 s debilidad
        player.addEffect("nausea", 120, { amplifier: 0, showParticles: true });      // 6 s náuseas
        // Se eliminó la regeneración
    }
});