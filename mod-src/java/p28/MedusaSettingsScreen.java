package com.example.zitraksmode.client.gui;

import com.example.zitraksmode.items.MedusaItem;
import com.example.zitraksmode.network.MedusaNetwork;
import com.example.zitraksmode.network.MedusaSettingsPacket;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** LMB configuration screen: radius and activation delay for the held Medusa. */
public final class MedusaSettingsScreen extends Screen {
    private int radius;
    private int delayTicks;
    private final int maxRadius;

    public MedusaSettingsScreen(int radius, int delayTicks, int maxRadius) {
        super(Component.literal("Настройка медузы"));
        this.maxRadius = Math.max(MedusaItem.MIN_RADIUS, maxRadius);
        this.radius = clamp(radius, MedusaItem.MIN_RADIUS, this.maxRadius);
        this.delayTicks = delayTicks;
    }

    @Override
    protected void init() {
        addRenderableWidget(new RadiusSlider(width / 2 - 100, height / 2 - 22));
        addRenderableWidget(new DelaySlider(width / 2 - 100, height / 2 + 10));
    }

    @Override
    public void onClose() {
        MedusaNetwork.CHANNEL.sendToServer(new MedusaSettingsPacket(radius, delayTicks));
        super.onClose();
    }

    @Override
    public void render(PoseStack poseStack, int mouseX, int mouseY, float partialTick) {
        renderBackground(poseStack);
        drawCenteredString(poseStack, font, "Медуза", width / 2, height / 2 - 52, 0x63FFB0);
        drawCenteredString(poseStack, font, "ЛКМ открывает настройки", width / 2, height / 2 + 48, 0xBBBBBB);
        super.render(poseStack, mouseX, mouseY, partialTick);
    }

    private final class RadiusSlider extends AbstractSliderButton {
        private RadiusSlider(int x, int y) {
            super(x, y, 200, 20, Component.empty(), (radius - MedusaItem.MIN_RADIUS)
                    / (double) (maxRadius - MedusaItem.MIN_RADIUS));
            updateMessage();
        }

        @Override
        protected void updateMessage() {
            setMessage(Component.literal("Радиус: " + radius + " блоков"));
        }

        @Override
        protected void applyValue() {
            radius = MedusaItem.MIN_RADIUS + (int) Math.round(value
                    * (maxRadius - MedusaItem.MIN_RADIUS));
            updateMessage();
        }
    }

    private final class DelaySlider extends AbstractSliderButton {
        private static final int DELAY_STEPS = (MedusaItem.MAX_DELAY_TICKS - MedusaItem.MIN_DELAY_TICKS)
                / MedusaItem.DELAY_STEP_TICKS;

        private DelaySlider(int x, int y) {
            super(x, y, 200, 20, Component.empty(), (delayTicks - MedusaItem.MIN_DELAY_TICKS)
                    / (double) (MedusaItem.MAX_DELAY_TICKS - MedusaItem.MIN_DELAY_TICKS));
            updateMessage();
        }

        @Override
        protected void updateMessage() {
            setMessage(Component.literal("Задержка: "
                    + MedusaItem.formatDelaySeconds(delayTicks) + " сек."));
        }

        @Override
        protected void applyValue() {
            int step = (int) Math.round(value * DELAY_STEPS);
            delayTicks = MedusaItem.MIN_DELAY_TICKS + step * MedusaItem.DELAY_STEP_TICKS;
            updateMessage();
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
