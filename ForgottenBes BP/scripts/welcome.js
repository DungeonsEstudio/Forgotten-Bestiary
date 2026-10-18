import { world } from "@minecraft/server";

// ========== MENSAJE DE BIENVENIDA ==========
world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) {
        const player = event.player;
        
        // Enviamos el texto usando rawtext y translate para jalar el archivo .lang
        player.sendMessage({
            rawtext: [
                { text: "§6[!]§r §e" }, // Prefijo de color antes del texto
                { 
                    translate: "si.welcome.message", 
                    with: [ player.name ] // Esto reemplaza el %s con el nombre del jugador
                }
            ]
        });
    }
});
