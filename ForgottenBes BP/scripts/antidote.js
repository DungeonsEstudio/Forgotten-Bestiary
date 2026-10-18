import { world, ItemStack } from "@minecraft/server";

const BADOMEN_TAG = "derretimiento_cerebral";

const EFECTOS = [
    "poison",
    "nausea",
    "slowness",
    "blindness",
    "mining_fatigue",
    "darkness",
    "weakness"
];

world.afterEvents.itemUse.subscribe((eventData) => {
    const player = eventData.source;
    const itemStack = eventData.itemStack;

    if (!player || !itemStack) return;
    if (itemStack.typeId !== "si:antidote") return;

    try {
        // Quitar tag y efectos
        player.removeTag(BADOMEN_TAG);
        for (const efecto of EFECTOS) {
            player.removeEffect(efecto);
        }

        // badOmen:0 para la UI
        player.runCommand(`title @s title "badOmen:0"`);

        // "Curado" traducido
        player.onScreenDisplay.setTitle({ translate: "effect.si.curado" });

        // Limpiar actionbar
        player.onScreenDisplay.setActionBar("");

        // Efectos del antídoto
        player.playSound("mob.pocion.use");
        player.addEffect("regeneration", 80, { amplifier: 0, showParticles: true });
        player.addEffect("night_vision", 10, { amplifier: 0, showParticles: false });

        // Reemplazar antídoto por botella vacía
        const inventory = player.getComponent("minecraft:inventory");
        if (!inventory) return;

        const container = inventory.container;
        const slotIndex = player.selectedSlotIndex;
        const slotItem = container.getItem(slotIndex);

        if (slotItem && slotItem.typeId === "si:antidote") {
            if (slotItem.amount > 1) {
                slotItem.amount -= 1;
                container.setItem(slotIndex, slotItem);
                container.addItem(new ItemStack("minecraft:glass_bottle", 1));
            } else {
                container.setItem(slotIndex, new ItemStack("minecraft:glass_bottle", 1));
            }
        }
    } catch (e) {
        player.sendMessage(`§c[ERROR] ${e.message}`);
    }
});