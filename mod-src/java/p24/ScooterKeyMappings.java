package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.client.KeyMapping;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterKeyMappingsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
public class ScooterKeyMappings {

    public static final String CATEGORY = "key.categories.zitraksmode.scooter";

    public static final KeyMapping HORN = new KeyMapping("Сигнал самоката (B)", GLFW.GLFW_KEY_B, CATEGORY);
    public static final KeyMapping MUSIC = new KeyMapping("Музыка самоката (ПКМ)", GLFW.GLFW_KEY_UNKNOWN, CATEGORY);
    public static final KeyMapping PICK_UP = new KeyMapping("Сложить самокат (Shift+ПКМ / G)", GLFW.GLFW_KEY_G, CATEGORY);
    public static final KeyMapping LIGHT = new KeyMapping("Фара самоката (N)", GLFW.GLFW_KEY_N, CATEGORY);

    @SubscribeEvent
    public static void onRegisterKeys(RegisterKeyMappingsEvent event) {
        event.register(HORN);
        event.register(MUSIC);
        event.register(PICK_UP);
        event.register(LIGHT);
    }
}
