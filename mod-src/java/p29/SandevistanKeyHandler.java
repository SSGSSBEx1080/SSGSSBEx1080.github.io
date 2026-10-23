package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.network.SandevistanNetwork;
import com.example.zitraksmode.network.SandevistanTogglePacket;
import com.example.zitraksmode.items.SandevistanItem;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, value = Dist.CLIENT)
public class SandevistanKeyHandler {
    @SubscribeEvent
    public static void onKeyInput(InputEvent.Key event) {
        if (Minecraft.getInstance().player == null) return;
        if (SandevistanKeyMappings.SANDEVISTAN_TOGGLE.consumeClick()) {
            ItemStack chestplate = Minecraft.getInstance().player.getItemBySlot(EquipmentSlot.CHEST);
            if (chestplate.getItem() instanceof SandevistanItem) {
                SandevistanNetwork.sendToServer(new SandevistanTogglePacket());
            }
        }
    }
}
