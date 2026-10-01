package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiComponent;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderGuiEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/** Brief HUD panel shown only after the player changes vacuum power with the wheel. */
@Mod.EventBusSubscriber(
        modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE,
        value = Dist.CLIENT
)
public final class VacuumPowerOverlay {
    private VacuumPowerOverlay() {
    }

    @SubscribeEvent
    public static void render(RenderGuiEvent.Post event) {
        Minecraft minecraft = Minecraft.getInstance();

        if (!VacuumClientInput.shouldShowPowerOverlay()
                || minecraft.screen != null) {
            return;
        }

        PoseStack poseStack = event.getPoseStack();
        Font font = minecraft.font;

        int width = event.getWindow().getGuiScaledWidth();
        int height = event.getWindow().getGuiScaledHeight();

        int remaining = VacuumClientInput.getPowerOverlayTicks();
        int alpha = Math.min(220, 70 + remaining * 5);
        int power = VacuumClientInput.getDisplayedPower();

        int panelWidth = 132;
        int panelHeight = 32;
        int x = width / 2 - panelWidth / 2;
        int y = height - 62;

        GuiComponent.fill(
                poseStack,
                x - 1,
                y - 1,
                x + panelWidth + 1,
                y + panelHeight + 1,
                color(alpha, 74, 220, 238)
        );

        GuiComponent.fill(
                poseStack,
                x,
                y,
                x + panelWidth,
                y + panelHeight,
                color(alpha, 8, 20, 26)
        );

        GuiComponent.fill(
                poseStack,
                x + 3,
                y + 3,
                x + panelWidth - 3,
                y + 14,
                color(alpha, 20, 62, 72)
        );

        String title = "ПЫЛЕСОС  •  СИЛА " + power + "/10";

        font.drawShadow(
                poseStack,
                title,
                x + 7,
                y + 5,
                color(alpha, 226, 251, 255)
        );

        int barX = x + 7;
        int barY = y + 20;
        int segmentWidth = 11;

        for (int index = 0; index < 10; index++) {
            boolean active = index < power;

            int segmentColor = active
                    ? color(alpha, 84, 228, 244)
                    : color(alpha, 31, 53, 60);

            GuiComponent.fill(
                    poseStack,
                    barX + index * (segmentWidth + 1),
                    barY,
                    barX + index * (segmentWidth + 1) + segmentWidth,
                    barY + 6,
                    segmentColor
            );
        }
    }

    private static int color(int alpha, int red, int green, int blue) {
        return (alpha & 0xFF) << 24
                | (red & 0xFF) << 16
                | (green & 0xFF) << 8
                | (blue & 0xFF);
    }
}