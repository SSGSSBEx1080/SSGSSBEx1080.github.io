package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.menu.VacuumMenu;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/** Runs the middle-click transfer at one vacuum storage cell per server tick. */
@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class VacuumTransferHandler {
    private VacuumTransferHandler() {
    }

    @SubscribeEvent
    public static void tickTransfer(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || event.player.level.isClientSide) {
            return;
        }

        if (!(event.player.containerMenu instanceof VacuumMenu menu)) {
            return;
        }

        if (menu.transferOneSlotToPlayer(event.player)) {
            menu.broadcastChanges();
        }
    }
}