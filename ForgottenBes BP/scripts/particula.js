import { world, system } from "@minecraft/server";

const CONFIG = {
  biomeIds: ["si:super_selva", "si:pantano_profundo"],
  particleId: "si:smokeparticle",
  intervalTicks: 20, // 5 segundos (20 ticks = 1 segundo)
  chance: 0.5,        // 50 % de probabilidad en cada intento
  minDist: 6,         // distancia mínima al jugador
  maxDist: 28,        // distancia máxima al jugador
};

function isTargetBiome(dimension, location) {
  try {
    return CONFIG.biomeIds.includes(dimension.getBiome(location).id);
  } catch {
    return false; // chunk no cargado u otro error
  }
}

function randomPointAround(center) {
  const angle = Math.random() * Math.PI * 2;
  const dist = CONFIG.minDist + Math.random() * (CONFIG.maxDist - CONFIG.minDist);
  return {
    x: center.x + Math.cos(angle) * dist,
    y: center.y,
    z: center.z + Math.sin(angle) * dist,
  };
}

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (Math.random() > CONFIG.chance) continue; // falla el 50 %

    const pos = randomPointAround(player.location);
    if (!isTargetBiome(player.dimension, pos)) continue; // solo dentro de los biomas

    try {
      player.dimension.spawnParticle(CONFIG.particleId, pos);
    } catch {}
  }
}, CONFIG.intervalTicks);