package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.client.KeyMapping;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterKeyMappingsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
public class SandevistanKeyMappings {
    public static final KeyMapping SANDEVISTAN_TOGGLE = new KeyMapping(
            "key.zitraksmode.sandevistan_activate", GLFW.GLFW_KEY_V, "key.categories.zitraksmode.sandevistan"
    );

    @SubscribeEvent
    public static void registerKeyMappings(RegisterKeyMappingsEvent event) {
        event.register(SANDEVISTAN_TOGGLE);
    }
}
