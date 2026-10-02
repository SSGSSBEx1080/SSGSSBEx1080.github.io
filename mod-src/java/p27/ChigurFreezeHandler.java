package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.level.BlockEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Server-authoritative lock used by Chigur scenes. While a player is locked, the
 * server rejects movement, block breaking, attacks and RMB interactions. The GUI
 * answer packets are not world interactions, so a coin/witness choice still works.
 */
@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class ChigurFreezeHandler {
    private static final Map<UUID, Long> UNTIL = new HashMap<>();
    private static final Map<UUID, Vec3> LOCKED_POSITION = new HashMap<>();
    private static final Map<UUID, Vec3> LAST_POSITION = new HashMap<>();
    private static final Map<UUID, Integer> STILL_TICKS = new HashMap<>();

    private ChigurFreezeHandler() {
    }

    /** Extends an existing freeze; a short keep-alive call cannot shorten it. */
    public static void freeze(ServerPlayer player, int ticks) {
        UUID id = player.getUUID();
        long until = player.level.getGameTime() + Math.max(1, ticks);
        UNTIL.merge(id, until, Math::max);
        LOCKED_POSITION.putIfAbsent(id, player.position());
    }

    public static void release(ServerPlayer player) {
        UUID id = player.getUUID();
        UNTIL.remove(id);
        LOCKED_POSITION.remove(id);
    }

    public static boolean isFrozen(ServerPlayer player) {
        UUID id = player.getUUID();
        long until = UNTIL.getOrDefault(id, 0L);
        if (until <= player.level.getGameTime()) {
            UNTIL.remove(id);
            LOCKED_POSITION.remove(id);
            return false;
        }
        return true;
    }

    public static boolean hasStoodStill(ServerPlayer player, int ticks) {
        return STILL_TICKS.getOrDefault(player.getUUID(), 0) >= ticks;
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || !(event.player instanceof ServerPlayer player)) return;

        UUID id = player.getUUID();
        Vec3 previous = LAST_POSITION.put(id, player.position());
        if (previous != null && previous.distanceToSqr(player.position()) < 0.0025D) {
            STILL_TICKS.put(id, STILL_TICKS.getOrDefault(id, 0) + 1);
        } else {
            STILL_TICKS.put(id, 0);
        }

        if (!isFrozen(player)) return;

        Vec3 lockedPosition = LOCKED_POSITION.get(id);
        if (lockedPosition != null && player.position().distanceToSqr(lockedPosition) > 0.0001D) {
            player.connection.teleport(
                    lockedPosition.x,
                    lockedPosition.y,
                    lockedPosition.z,
                    player.getYRot(),
                    player.getXRot()
            );
        }
        player.setDeltaMovement(Vec3.ZERO);
        player.hurtMarked = true;
    }

    @SubscribeEvent
    public static void onPlayerInteract(PlayerInteractEvent event) {
        if (event.getEntity() instanceof ServerPlayer player && isFrozen(player)) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onAttackEntity(AttackEntityEvent event) {
        if (event.getEntity() instanceof ServerPlayer player && isFrozen(player)) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onBlockBreak(BlockEvent.BreakEvent event) {
        Player player = event.getPlayer();
        if (player instanceof ServerPlayer serverPlayer && isFrozen(serverPlayer)) {
            event.setCanceled(true);
        }
    }
}
