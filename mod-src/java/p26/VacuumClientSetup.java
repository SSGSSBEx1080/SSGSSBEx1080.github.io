package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.menu.VacuumMenus;
import net.minecraft.client.gui.screens.MenuScreens;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
public final class VacuumClientSetup {
    private VacuumClientSetup() {
    }

    @SubscribeEvent
    public static void onClientSetup(FMLClientSetupEvent event) {
        event.enqueueWork(() -> MenuScreens.register(VacuumMenus.VACUUM_MENU.get(), VacuumScreen::new));
    }
}
