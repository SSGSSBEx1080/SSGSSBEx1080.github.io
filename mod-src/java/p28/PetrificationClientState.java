package com.example.zitraksmode.client;

import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.LivingEntity;

import java.util.HashMap;
import java.util.Map;

/** Client-only entity ids currently rendered with the generic stone texture. */
public final class PetrificationClientState {
    private static final Map<Integer, Integer> END_TICKS = new HashMap<>();

    private PetrificationClientState() {
    }

    public static void set(int entityId, int remainingTicks) {
        if (remainingTicks <= 0) {
            END_TICKS.remove(entityId);
            return;
        }
        if (Minecraft.getInstance().level != null) {
            END_TICKS.put(entityId, (int) (Minecraft.getInstance().level.getGameTime() + remainingTicks));
        }
    }

    public static boolean isPetrified(LivingEntity entity) {
        if (Minecraft.getInstance().level == null) return false;
        long end = END_TICKS.getOrDefault(entity.getId(), 0);
        if (end <= Minecraft.getInstance().level.getGameTime()) {
            END_TICKS.remove(entity.getId());
            return false;
        }
        return true;
    }
}
