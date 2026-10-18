import { world, system, ItemStack } from "@minecraft/server";

const BLOODFISH_ID = "si:bloodfish";
const BLOODFISH_BUCKET_ID = "si:bloodfish_buket";
const EMPTY_BUCKET_ID = "minecraft:bucket";

// ─── CAPTURA ─────────────────────────────────────────────────────────────────
// beforeEvents + ev.cancel = patrón correcto en 2.x para evitar la interacción nativa
const capturing = new Set();

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    const player = ev.player;
    const victim = ev.target;

    if (victim.typeId !== BLOODFISH_ID) return;
    if (capturing.has(player.id)) return;

    const inv = player.getComponent("inventory");
    const container = inv?.container;
    if (!container) return;

    const item = container.getItem(player.selectedSlotIndex);
    if (!item || item.typeId !== EMPTY_BUCKET_ID) return;

    ev.cancel = true;
    capturing.add(player.id);

    system.run(() => {
        capturing.delete(player.id);
        if (!victim.isValid()) return;

        victim.remove();
        container.setItem(player.selectedSlotIndex, new ItemStack(BLOODFISH_BUCKET_ID, 1));
        player.sendMessage("§a¡Has capturado un Bloodfish!");
    });
});

// ─── SUELTA ───────────────────────────────────────────────────────────────────
// itemUseOn no existe en 2.x → playerInteractWithBlock
// itemUse no existe en 2.x → playerInteractWithBlock cubre el caso principal
const releasing = new Set();

function handleRelease(player, spawnLoc) {
    if (releasing.has(player.id)) return;
    releasing.add(player.id);

    system.run(() => {
        releasing.delete(player.id);

        const inv = player.getComponent("inventory");
        const container = inv?.container;
        if (!container) return;

        player.dimension.spawnEntity(BLOODFISH_ID, spawnLoc);
        container.setItem(player.selectedSlotIndex, new ItemStack(EMPTY_BUCKET_ID, 1));
        player.sendMessage("§a¡Has liberado al Bloodfish!");
    });
}

world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
    if (ev.itemStack?.typeId !== BLOODFISH_BUCKET_ID) return;
    const block = ev.block;
    handleRelease(ev.player, {
        x: block.location.x + 0.5,
        y: block.location.y + 1,
        z: block.location.z + 0.5
    });
});