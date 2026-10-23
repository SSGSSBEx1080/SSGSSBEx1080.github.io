package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.advancements.Advancement;
import net.minecraft.advancements.AdvancementProgress;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;

/** Awards Medusa's action-based advancement criteria from server-side gameplay. */
public final class MedusaAdvancementHelper {
    public static final String COUNTDOWN = "28_medusa/02_countdown";
    public static final String GREEN_WAVE = "28_medusa/03_green_wave";
    public static final String SCIENCE_RADIUS = "28_medusa/04_science_radius";
    public static final String LIMIT_512 = "28_medusa/05_limit_512";

    private MedusaAdvancementHelper() {
    }

    public static void award(ServerPlayer player, String path) {
        if (player.getServer() == null) return;
        Advancement advancement = player.getServer().getAdvancements()
                .getAdvancement(new ResourceLocation(ZitraksMode.MODID, path));
        if (advancement == null) return;

        AdvancementProgress progress = player.getAdvancements().getOrStartProgress(advancement);
        for (String criterion : progress.getRemainingCriteria()) {
            player.getAdvancements().award(advancement, criterion);
        }
    }
}
