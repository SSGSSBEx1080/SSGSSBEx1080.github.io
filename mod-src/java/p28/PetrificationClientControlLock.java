package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

/**
 * Client-side half of petrification. The server already rejects movement and
 * actions; this prevents client camera/input animation while preserving F5.
 */
@Mod.EventBusSubscriber(modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE,
        value = Dist.CLIENT)
public final class PetrificationClientControlLock {
    private static boolean wasPetrified;
    private static float lockedYaw;
    private static float lockedPitch;

    private PetrificationClientControlLock() {
    }

    @SubscribeEvent
    public static void lockLocalControls(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;

        LocalPlayer player = Minecraft.getInstance().player;
        if (player == null || !PetrificationClientState.isPetrified(player)) {
            wasPetrified = false;
            return;
        }

        if (!wasPetrified) {
            wasPetrified = true;
            lockedYaw = player.getYRot();
            lockedPitch = player.getXRot();
        }

        // Keep the viewpoint/body fixed. F5 remains a normal vanilla key and
        // simply changes the perspective of this same frozen rotation.
        player.setYRot(lockedYaw);
        player.setXRot(lockedPitch);
        player.setSprinting(false);
        player.stopUsingItem();

        player.input.forwardImpulse = 0.0F;
        player.input.leftImpulse = 0.0F;
        player.input.jumping = false;
        player.input.shiftKeyDown = false;
    }

    @SubscribeEvent
    public static void cancelPetrifiedMouseUse(InputEvent.MouseButton.Pre event) {
        if (event.getAction() != GLFW.GLFW_PRESS) return;
        if (event.getButton() != GLFW.GLFW_MOUSE_BUTTON_LEFT
                && event.getButton() != GLFW.GLFW_MOUSE_BUTTON_RIGHT) return;

        LocalPlayer player = Minecraft.getInstance().player;
        if (player != null && PetrificationClientState.isPetrified(player)) {
            event.setCanceled(true);
        }
    }
}
