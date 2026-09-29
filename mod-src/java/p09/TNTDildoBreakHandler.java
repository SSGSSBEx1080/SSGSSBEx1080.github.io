package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.blocks.TNTDildoBlock;
import net.minecraft.world.level.block.Block;
import net.minecraftforge.event.level.BlockEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public class TNTDildoBreakHandler {

    @SubscribeEvent
    public static void onBlockBreak(BlockEvent.BreakEvent event) {
        Block block = event.getState().getBlock();
        if (block instanceof TNTDildoBlock) {
            if (event.getPlayer() instanceof net.minecraft.server.level.ServerPlayer player) {
                ZitraksMode.TNT_DILDO_BROKEN.trigger(player);
            }
        }
    }
}
