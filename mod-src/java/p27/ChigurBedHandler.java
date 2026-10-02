package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.entities.AntonChigurEntity;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.block.BedBlock;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * Replaces an attempted night sleep with Chigur's bed scene whenever this exact
 * player is currently his hunt target. Ammunition is intentionally irrelevant.
 */
@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class ChigurBedHandler {
    private ChigurBedHandler() {
    }

    @SubscribeEvent
    public static void onBedRightClick(PlayerInteractEvent.RightClickBlock event) {
        if (event.getLevel().isClientSide || !(event.getEntity() instanceof ServerPlayer player)) return;
        if (!(event.getLevel().getBlockState(event.getPos()).getBlock() instanceof BedBlock)) return;

        long time = event.getLevel().getDayTime() % 24_000L;
        if (time < 13_000L || time > 23_000L) return;

        ServerLevel serverLevel = (ServerLevel) player.level;
        for (AntonChigurEntity chigur : serverLevel.getEntitiesOfClass(
                AntonChigurEntity.class, player.getBoundingBox().inflate(256.0D))) {
            // Before this fix the empty-magazine check blocked the scene for a
            // fully loaded hunter. Personal active hunt is the only requirement.
            if (!chigur.isHunting(player)) continue;

            event.setCanceled(true);
            chigur.startBedCinematic(player, event.getPos());
            return;
        }
    }
}
