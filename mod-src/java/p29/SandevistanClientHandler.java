package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.caps.SandevistanCapability;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderLevelLastEvent;
import net.minecraftforge.client.event.ScreenEvent;
import net.minecraftforge.client.event.ViewportEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.resources.ResourceLocation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, value = Dist.CLIENT)
public class SandevistanClientHandler {

    private static class AfterImage {
        Vec3 pos;
        float yRot, yBodyRot, xRot;
        float swing, swingAmount;
        int capturedTick;
        int age;

        public AfterImage(Vec3 pos, float yRot, float yBodyRot, float xRot, float swing, float swingAmount, int capturedTick) {
            this.pos = pos; this.yRot = yRot; this.yBodyRot = yBodyRot; this.xRot = xRot;
            this.swing = swing; this.swingAmount = swingAmount; this.capturedTick = capturedTick;
            this.age = 0;
        }
    }

    private static class TrailData {
        List<AfterImage> afterImages = new ArrayList<>();
        boolean fadingOut = false;
    }

    private static final Map<UUID, TrailData> playerTrails = new HashMap<>();

    // Блокировка управления от пакета
    private static boolean isTimeStopped = false;
    private static float frozenX, frozenY;

    // Метод блокировки камеры и кнопок
    public static void setTimeStopped(boolean freeze) {
        isTimeStopped = freeze;
        Minecraft mc = Minecraft.getInstance();
        if (freeze && mc.player != null) {
            // Запоминаем куда смотрел игрок, чтобы намертво заблокировать камеру
            frozenX = mc.player.getXRot();
            frozenY = mc.player.getYRot();
            mc.player.setNoGravity(true); // Зависает в воздухе
        } else if (!freeze && mc.player != null) {
            mc.player.setNoGravity(false); // Отпускаем на землю
        }
    }

    // Запрещаем открывать инвентарь или сундуки (режим овоща), разрешаем только ESC
    @SubscribeEvent
    public static void onScreenOpen(ScreenEvent.Opening event) {
        if (isTimeStopped && !(event.getScreen() instanceof PauseScreen)) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) return;

        // Жесткая блокировка локального игрока
        if (mc.player != null) {
            SandevistanCapability.get(mc.player).ifPresent(cap -> {
                if (cap.isInCutscene() || isTimeStopped) {
                    mc.player.input.up = false;
                    mc.player.input.down = false;
                    mc.player.input.left = false;
                    mc.player.input.right = false;
                    mc.player.input.jumping = false;
                    mc.player.input.shiftKeyDown = false;

                    if (isTimeStopped) {
                        mc.player.setDeltaMovement(0, 0, 0);
                        // Блокируем поворот мыши намертво
                        mc.player.setXRot(frozenX);
                        mc.player.setYRot(frozenY);
                        mc.player.yHeadRot = frozenY;
                        mc.player.yBodyRot = frozenY;
                        mc.player.xRotO = frozenX;
                        mc.player.yRotO = frozenY;

                        // Если уже был открыт инвентарь - принудительно закрываем
                        if (mc.screen != null && !(mc.screen instanceof PauseScreen)) {
                            mc.setScreen(null);
                        }
                    }
                }
            });
        }

        // Обновляем шлейфы ВСЕХ игроков вокруг
        for (AbstractClientPlayer player : mc.level.players()) {
            UUID uuid = player.getUUID();
            TrailData trail = playerTrails.computeIfAbsent(uuid, k -> new TrailData());

            SandevistanCapability.get(player).ifPresent(cap -> {
                if (cap.isAccelerating()) {
                    trail.fadingOut = false;

                    // Сдвигаем координаты спавна шлейфа за спину (на 0.6 блока)
                    float rad = player.yBodyRot * ((float)Math.PI / 180F);
                    double backX = Math.sin(rad) * 0.6;
                    double backZ = -Math.cos(rad) * 0.6;
                    Vec3 spawnPos = player.position().add(backX, 0, backZ);

                    // Высчитываем фазу бега, чтобы клон замер именно в этой позе бега
                    float swingAmount = (float) player.getDeltaMovement().horizontalDistance() * 3.0f;
                    if (swingAmount > 1.0f) swingAmount = 1.0f;
                    float swing = player.tickCount * 0.3f;

                    trail.afterImages.add(new AfterImage(spawnPos, player.getYHeadRot(), player.yBodyRot, player.getXRot(), swing, swingAmount, player.tickCount));

                    // Шлейф теперь длинный и остается до конца
                    if (trail.afterImages.size() > 100) {
                        trail.afterImages.remove(0);
                    }
                } else if (!trail.afterImages.isEmpty()) {
                    trail.fadingOut = true;
                }
            });

            // Красиво и плавно удаляем шлейф с хвоста, когда скорость кончилась
            if (trail.fadingOut) {
                for (int i = 0; i < 4 && !trail.afterImages.isEmpty(); i++) {
                    trail.afterImages.remove(0);
                }
                if (trail.afterImages.isEmpty()) {
                    trail.fadingOut = false;
                }
            }
        }

        // Очищаем отключившихся игроков
        playerTrails.entrySet().removeIf(entry ->
            entry.getValue().afterImages.isEmpty() && mc.level.getPlayerByUUID(entry.getKey()) == null
        );
    }

    @SubscribeEvent
    public static void onFOVUpdate(ViewportEvent.ComputeFov event) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null && SandevistanCapability.get(mc.player).map(SandevistanCapability::isAccelerating).orElse(false)) {
            event.setFOV(mc.options.fov().get());
        }
    }

    @SuppressWarnings("deprecation")
    @SubscribeEvent
    public static void onRenderLevelLast(RenderLevelLastEvent event) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null || playerTrails.isEmpty()) return;

        PoseStack poseStack = event.getPoseStack();
        MultiBufferSource.BufferSource buffer = mc.renderBuffers().bufferSource();
        EntityRenderDispatcher dispatcher = mc.getEntityRenderDispatcher();

        for (AbstractClientPlayer player : mc.level.players()) {
            TrailData trail = playerTrails.get(player.getUUID());
            if (trail == null || trail.afterImages.isEmpty()) continue;

            if ((Object) dispatcher.getRenderer(player) instanceof PlayerRenderer) {
                PlayerRenderer pr = (PlayerRenderer) (Object) dispatcher.getRenderer(player);

                // Идеально получаем нужный скин именно для этого игрока из рендерера
                ResourceLocation skin = pr.getTextureLocation(player);
                RenderType renderType = RenderType.entityTranslucentCull(skin);

                for (int i = 0; i < trail.afterImages.size(); i++) {
                    AfterImage img = trail.afterImages.get(i);
                    poseStack.pushPose();

                    Vec3 cam = mc.gameRenderer.getMainCamera().getPosition();
                    poseStack.translate(img.pos.x - cam.x, img.pos.y - cam.y, img.pos.z - cam.z);

                    // ПРАВИЛЬНЫЙ поворот: теперь клоны смотрят туда же, куда и игрок!
                    poseStack.mulPose(com.mojang.math.Vector3f.YP.rotationDegrees(180.0F - img.yBodyRot));
                    poseStack.scale(-1.0F, -1.0F, 1.0F);
                    poseStack.translate(0, -1.501F, 0);

                    float scale = 1.05f;
                    poseStack.scale(scale, scale, scale);

                    PlayerModel<AbstractClientPlayer> model = pr.getModel();
                    model.prepareMobModel(player, 0, 0, event.getPartialTick());

                    // Вставляем зафиксированные анимации конечностей, чтобы поза была точной
                    model.setupAnim(player, img.swing, img.swingAmount, img.capturedTick, img.yRot - img.yBodyRot, img.xRot);

                    float progress = (float) i / trail.afterImages.size();
                    float alpha = progress * 0.5f;

                    if (trail.fadingOut) {
                        alpha *= ((float) trail.afterImages.size() / 100.0f);
                    }

                    float r = progress;
                    float g = 1.0f;
                    float b = 1.0f - progress;

                    model.renderToBuffer(poseStack, buffer.getBuffer(renderType), 15728880, OverlayTexture.NO_OVERLAY, r, g, b, alpha);

                    poseStack.popPose();
                }
            }
        }
        buffer.endBatch();
    }
}
