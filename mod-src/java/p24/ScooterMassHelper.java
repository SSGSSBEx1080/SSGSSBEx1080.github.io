package com.example.zitraksmode.util;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.player.Player;

/**
 * Масса пассажиров. Сильно влияет на разгон / спуск / поворот / прижим.
 *
 * Игрок = 1.0
 * 4 железных голема ≈ 32 → тяжёлый «танк» с горы.
 */
public final class ScooterMassHelper {

    private ScooterMassHelper() {}

    public static double getMass(Entity entity) {
        if (entity instanceof Player) {
            return 1.0D;
        }

        EntityType<?> type = entity.getType();

        if (type == EntityType.IRON_GOLEM) return 8.0D;
        if (type == EntityType.RAVAGER) return 7.0D;
        if (type == EntityType.HOGLIN || type == EntityType.ZOGLIN) return 6.0D;
        if (type == EntityType.POLAR_BEAR) return 5.5D;
        if (type == EntityType.HORSE || type == EntityType.DONKEY
                || type == EntityType.MULE || type == EntityType.SKELETON_HORSE
                || type == EntityType.ZOMBIE_HORSE) return 4.5D;
        if (type == EntityType.COW || type == EntityType.MOOSHROOM) return 3.5D;
        if (type == EntityType.PIG || type == EntityType.SHEEP) return 2.2D;
        if (type == EntityType.WOLF || type == EntityType.CAT
                || type == EntityType.FOX || type == EntityType.OCELOT) return 0.5D;
        if (type == EntityType.CHICKEN || type == EntityType.RABBIT
                || type == EntityType.PARROT || type == EntityType.BAT) return 0.2D;
        if (type == EntityType.VILLAGER || type == EntityType.WANDERING_TRADER) return 1.1D;
        if (type == EntityType.ZOMBIE || type == EntityType.SKELETON
                || type == EntityType.CREEPER || type == EntityType.SPIDER) return 1.2D;
        if (type == EntityType.ENDERMAN) return 2.5D;
        if (type == EntityType.PANDA) return 4.0D;
        if (type == EntityType.LLAMA || type == EntityType.TRADER_LLAMA) return 3.5D;
        if (type == EntityType.GOAT) return 2.5D;

        String key = EntityType.getKey(type).getPath();
        if (key.contains("sniffer")) return 5.5D;
        if (key.contains("camel")) return 5.0D;
        if (key.contains("warden")) return 12.0D;
        if (key.contains("golem")) return 8.0D;
        if (key.contains("ravager")) return 7.0D;
        if (key.contains("horse") || key.contains("mule") || key.contains("donkey")) return 4.5D;
        if (key.contains("cow") || key.contains("mooshroom")) return 3.5D;
        if (key.contains("pig") || key.contains("sheep")) return 2.2D;
        if (key.contains("chicken") || key.contains("rabbit") || key.contains("parrot")) return 0.2D;
        if (key.contains("cat") || key.contains("wolf") || key.contains("fox")) return 0.5D;
        if (key.contains("villager")) return 1.1D;

        return 1.3D;
    }
}
