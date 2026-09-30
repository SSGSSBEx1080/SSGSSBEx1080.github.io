package com.example.zitraksmode.client;

import com.example.zitraksmode.entities.ScooterEntity;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiComponent;
import net.minecraft.util.Mth;
import net.minecraftforge.client.gui.overlay.IGuiOverlay;

/**
 * Спидометр на русском, только водитель.
 * Шкала до 150+ (с горки/весом бывает больше — bar просто полный).
 */
public class ScooterHudOverlay {

    /** Визуальная шкала; цифры показывают реальную скорость без потолка. */
    private static final float GAUGE_MAX_KMH = 150.0F;

    public static final IGuiOverlay HUD = (gui, poseStack, partialTick, width, height) -> {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) return;
        if (!(mc.player.getVehicle() instanceof ScooterEntity scooter)) return;
        if (scooter.getDriver() != mc.player) return;

        Font font = mc.font;
        float speedKmh = scooter.getDisplaySpeedKmh();
        boolean reverse = scooter.isReversing();
        boolean charging = scooter.isNearChargingPort() && Math.abs(scooter.getCurrentSpeed()) < 0.08F;

        final int panelW = 136;
        final int panelH = 72;
        final int margin = 10;
        final int left = width - panelW - margin;
        final int top = height - panelH - margin;
        final int right = left + panelW;
        final int bottom = top + panelH;
        final int cx = left + panelW / 2;

        GuiComponent.fill(poseStack, left, top, right, bottom, 0xD0101018);
        GuiComponent.fill(poseStack, left, top, right, top + 1, 0x55FFFFFF);

        int accent = reverse ? 0xFFFF4444 : (charging ? 0xFF33CCFF : colorForSpeed(speedKmh));
        GuiComponent.fill(poseStack, left, top, left + 3, bottom, accent | 0xFF000000);

        // Скорость — без clamp, реальное число
        String speedText = Integer.toString(Math.round(speedKmh));
        int speedColor = reverse ? 0xFFFF7777 : colorForSpeed(speedKmh);

        poseStack.pushPose();
        float scale = 1.85F;
        float tw = font.width(speedText) * scale;
        poseStack.translate(cx - tw / 2.0F, top + 4, 0);
        poseStack.scale(scale, scale, 1.0F);
        font.draw(poseStack, speedText, 0, 0, speedColor);
        poseStack.popPose();

        String unit = reverse ? "км/ч  НАЗАД" : (charging ? "км/ч  ЗАРЯДКА" : "км/ч");
        drawCentered(poseStack, font, unit, cx, top + 22, reverse ? 0xFFFF9999 : 0xFFBBBBBB);

        // Полоска 0..150 (выше 150 — полная)
        int barL = left + 8;
        int barR = right - 8;
        int barY = top + 33;
        int barH = 5;
        GuiComponent.fill(poseStack, barL, barY, barR, barY + barH, 0xFF222222);
        float t = Mth.clamp(speedKmh / GAUGE_MAX_KMH, 0.0F, 1.0F);
        int fill = barL + Math.round((barR - barL) * t);
        if (fill > barL) {
            GuiComponent.fill(poseStack, barL, barY, fill, barY + barH, speedColor | 0xFF000000);
        }
        // насечки 0 / 75 / 150
        tickMark(poseStack, barL, barY, barH);
        tickMark(poseStack, (barL + barR) / 2, barY, barH);
        tickMark(poseStack, barR - 1, barY, barH);

        int chargePct = pct(scooter.getCharge(), ScooterEntity.MAX_CHARGE);
        int hp = scooter.getDurability();
        int hpMax = ScooterEntity.MAX_DURABILITY;
        int seats = scooter.getPassengers().size();

        int row1 = top + 43;
        int row2 = top + 54;
        int textL = left + 8;

        int chargeColor = chargePct <= 15 ? 0xFFFF5555 : (chargePct <= 40 ? 0xFFFFAA00 : 0xFF55FFFF);
        if (charging) chargeColor = 0xFF66FFFF;
        font.draw(poseStack, "Заряд: " + chargePct + "%" + (charging ? " +" : ""), textL, row1, chargeColor);

        String pax = "Мест: " + seats + "/5";
        font.draw(poseStack, pax, right - 8 - font.width(pax), row1, 0xFFAAFFAA);

        int hpColor = hp <= hpMax * 0.2F ? 0xFFFF5555 : (hp <= hpMax * 0.5F ? 0xFFFFAA00 : 0xFFFF8888);
        font.draw(poseStack, "Прочность: " + hp + "/" + hpMax, textL, row2, hpColor);
    };

    private static void tickMark(PoseStack ps, int x, int barY, int barH) {
        GuiComponent.fill(ps, x, barY - 2, x + 1, barY + barH + 2, 0x77FFFFFF);
    }

    private static void drawCentered(PoseStack ps, Font font, String text, int cx, int y, int color) {
        font.draw(ps, text, cx - font.width(text) / 2.0F, y, color);
    }

    private static int pct(int value, int max) {
        return Math.max(0, Math.min(100, Math.round(value * 100.0F / Math.max(1, max))));
    }

    private static int colorForSpeed(float speed) {
        if (speed >= 120.0F) return 0xFFFF2222;
        if (speed >= 80.0F) return 0xFFFF5533;
        if (speed >= 50.0F) return 0xFFFFAA00;
        if (speed >= 25.0F) return 0xFF66FF66;
        return 0xFF99FF99;
    }
}
