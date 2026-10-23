package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.caps.SandevistanCapability;
import com.example.zitraksmode.items.SandevistanItem;
import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiComponent;
import net.minecraft.client.renderer.GameRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderGuiEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE, value = Dist.CLIENT)
public final class SandevistanHudOverlay {

    private SandevistanHudOverlay() {}

    // ТА САМАЯ КАРТИНКА ИЗ ПАПКИ
    private static final ResourceLocation HUD_TEXTURE = new ResourceLocation(ZitraksMode.MODID, "textures/gui/sandevistan_hud.png");

    @SubscribeEvent
    public static void render(RenderGuiEvent.Post event) {
        Minecraft mc = Minecraft.getInstance();
        Player player = mc.player;
        if (player == null || mc.screen != null) return;

        ItemStack chestplate = player.getItemBySlot(EquipmentSlot.CHEST);
        if (!(chestplate.getItem() instanceof SandevistanItem)) return;

        SandevistanCapability.get(player).ifPresent(cap -> {
            PoseStack poseStack = event.getPoseStack();
            Font font = mc.font;

            int width = event.getWindow().getGuiScaledWidth();
            int height = event.getWindow().getGuiScaledHeight();

            boolean active = cap.isAccelerating();
            boolean psycho = cap.isPsychosisActive();
            float psychosis = cap.getPsychosis();

            // Тряска интерфейса при киберпсихозе
            int shakeX = psycho ? (int)((player.getRandom().nextFloat() - 0.5) * 12) : (psychosis > 80 && active ? (int)((player.getRandom().nextFloat() - 0.5) * 4) : 0);
            int shakeY = psycho ? (int)((player.getRandom().nextFloat() - 0.5) * 12) : (psychosis > 80 && active ? (int)((player.getRandom().nextFloat() - 0.5) * 4) : 0);

            poseStack.pushPose();
            poseStack.translate(shakeX, shakeY, 0);

            // 1. РИСУЕМ КАРТИНКУ-ФОН
            RenderSystem.setShader(GameRenderer::getPositionTexShader);
            RenderSystem.setShaderTexture(0, HUD_TEXTURE);
            RenderSystem.setShaderColor(1.0F, 1.0F, 1.0F, 1.0F);
            RenderSystem.enableBlend();
            RenderSystem.defaultBlendFunc();
            GuiComponent.blit(poseStack, 0, 0, 0, 0, width, height, width, height);
            RenderSystem.disableBlend();

            // 2. Анимированная сканирующая линия
            int scanlineY = (int) ((System.currentTimeMillis() / 15) % height);
            GuiComponent.fill(poseStack, 0, scanlineY, width, scanlineY + 2, 0x2200FFFF);

            // 3. Пульсирующий прицел-сканер по центру
            int cX = width / 2;
            int cY = height / 2;
            int gap = 12 + (int)(Math.sin(System.currentTimeMillis() / 150.0) * 6);
            int crossColor = psycho ? 0xAAFF0000 : 0xAA00FFFF;
            GuiComponent.fill(poseStack, cX - gap - 6, cY - 1, cX - gap, cY + 1, crossColor);
            GuiComponent.fill(poseStack, cX + gap, cY - 1, cX + gap + 6, cY + 1, crossColor);
            GuiComponent.fill(poseStack, cX - 1, cY - gap - 6, cX + 1, cY - gap, crossColor);
            GuiComponent.fill(poseStack, cX - 1, cY + gap, cX + 1, cY + gap + 6, crossColor);

            // 4. ПАНЕЛЬ 1: Статус и шкала Психоза (Слева Сверху)
            int tX = 15;
            int tY = 15;
            GuiComponent.fill(poseStack, tX, tY, tX + 180, tY + 65, 0x66001122);
            GuiComponent.fill(poseStack, tX, tY, tX + 180, tY + 2, 0xFF00FFFF);
            GuiComponent.fill(poseStack, tX, tY, tX + 2, tY + 65, 0xFF00FFFF);

            font.drawShadow(poseStack, "SANDEVISTAN OS v3.0", tX + 8, tY + 8, 0x00FFFF);
            String status = active ? "STATUS: ACTIVE" : "STATUS: STANDBY";
            font.drawShadow(poseStack, status, tX + 8, tY + 22, active ? 0x00FF00 : 0x00FFFF);
            font.drawShadow(poseStack, "TOLERANCE: " + String.format("%.0f", cap.getTolerance() * 100) + "%", tX + 8, tY + 34, 0x00FFFF);

            font.drawShadow(poseStack, "NEURAL LOAD", tX + 8, tY + 48, 0x00FFFF);
            int barColor = psychosis > 80 ? 0xFFFF0000 : (psychosis > 50 ? 0xFFFFFF00 : 0xFF00FF00);
            GuiComponent.fill(poseStack, tX + 90, tY + 48, tX + 170, tY + 55, 0x55000000); // Пустая
            int barWidth = (int) (80 * (psychosis / 100.0f));
            GuiComponent.fill(poseStack, tX + 90, tY + 48, tX + 90 + barWidth, tY + 55, barColor); // Заполненная

            // 5. ПАНЕЛЬ 2: Таймеры (Справа Снизу)
            int bX = width - 170;
            int bY = height - 35;
            GuiComponent.fill(poseStack, bX, bY, bX + 160, bY + 25, 0x66001122);
            GuiComponent.fill(poseStack, bX, bY + 23, bX + 160, bY + 25, 0xFF00FFFF);
            GuiComponent.fill(poseStack, bX + 158, bY, bX + 160, bY + 25, 0xFF00FFFF);

            if (active) {
                float timeLeft = (100 - cap.getAccelerationTicks()) / 20.0f;
                font.drawShadow(poseStack, "TIME: " + String.format("%.1f", timeLeft) + "s", bX + 10, bY + 8, 0x00FF00);
            } else if (cap.getCooldown() > 0) {
                float cd = cap.getCooldown() / 20.0f;
                font.drawShadow(poseStack, "COOLDOWN: " + String.format("%.1f", cd) + "s", bX + 10, bY + 8, 0xFF0000);
            } else {
                font.drawShadow(poseStack, "READY - PRESS [V]", bX + 10, bY + 8, 0x00FFFF);
            }

            // 6. ОШИБКИ И ВАРНИНГИ (Глитчи на экране)
            if (psycho) {
                String warning = "CRITICAL ERROR: CYBERPSYCHOSIS";
                if ((mc.level.getGameTime() % 10) < 5) {
                    font.drawShadow(poseStack, warning, (width - font.width(warning)) / 2f, height / 4f, 0xFF0000);
                }
                for (int i = 0; i < 15; i++) {
                    int gx = player.getRandom().nextInt(width);
                    int gy = player.getRandom().nextInt(height);
                    int gw = 10 + player.getRandom().nextInt(100);
                    int gh = 2 + player.getRandom().nextInt(8);
                    GuiComponent.fill(poseStack, gx, gy, gx + gw, gy + gh, 0x88FF0000);
                }
            } else if (psychosis >= 80) {
                String warning = "WARNING: NEURAL OVERLOAD IMMINENT";
                if ((mc.level.getGameTime() % 10) < 5) {
                    font.drawShadow(poseStack, warning, (width - font.width(warning)) / 2f, height / 4f, 0xFFFF0000);
                }
            }

            poseStack.popPose();
        });
    }
}
