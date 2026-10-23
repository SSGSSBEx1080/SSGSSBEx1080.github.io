package com.example.zitraksmode;

import com.example.zitraksmode.recipe.ImmunosuppressantRecipe;
import com.example.zitraksmode.network.SandevistanNetwork;
import net.minecraftforge.common.brewing.BrewingRecipeRegistry;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
public class SandevistanSetup {

    @SubscribeEvent
    public static void onCommonSetup(FMLCommonSetupEvent event) {

        // Заставляем класс инициализировать свою статику (создать SimpleChannel) во время настройки мода
        SandevistanNetwork.register();

        event.enqueueWork(() -> {
            BrewingRecipeRegistry.addRecipe(new ImmunosuppressantRecipe());
        });
    }
}
