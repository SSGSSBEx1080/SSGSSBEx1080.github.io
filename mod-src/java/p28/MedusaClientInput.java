package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.client.gui.MedusaSettingsScreen;
import com.example.zitraksmode.items.MedusaItem;
import net.minecraft.client.Minecraft;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

/** Forge 1.19.2 LMB hook. ClickInputEvent does not exist in Forge 43.5.0. */
@Mod.EventBusSubscriber(modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE,
        value = Dist.CLIENT)
public final class MedusaClientInput {
    private MedusaClientInput() {
    }

    @SubscribeEvent
    public static void onMouseButton(InputEvent.MouseButton.Pre event) {
        if (event.getButton() != GLFW.GLFW_MOUSE_BUTTON_LEFT) return;
        if (event.getAction() != GLFW.GLFW_PRESS) return;

        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.player == null || minecraft.screen != null) return;

        ItemStack stack = minecraft.player.getMainHandItem();
        if (!(stack.getItem() instanceof MedusaItem)) return;

        event.setCanceled(true);
        minecraft.setScreen(new MedusaSettingsScreen(
                MedusaItem.getRadius(stack),
                MedusaItem.getDelayTicks(stack),
                MedusaItem.getMaxRadius(stack)
        ));
    }
}
