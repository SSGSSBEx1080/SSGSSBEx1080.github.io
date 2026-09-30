package com.example.zitraksmode.client;

import com.example.zitraksmode.entities.ScooterEntity;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Vector3f;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Pose;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderPlayerEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * Стойка + мягкий pitch/roll mesh = дека самоката.
 * 1.19.2: event.getEntity() (не getPlayer).
 */
@Mod.EventBusSubscriber(modid = "zitraksmode", bus = Mod.EventBusSubscriber.Bus.FORGE, value = Dist.CLIENT)
public final class ScooterClientEvents {

    private ScooterClientEvents() {}

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;
        LocalPlayer player = Minecraft.getInstance().player;
        if (player != null && player.getVehicle() instanceof ScooterEntity) {
            player.setPose(Pose.STANDING);
        }
    }

    @SubscribeEvent(priority = EventPriority.HIGH)
    public static void onRenderPlayerPre(RenderPlayerEvent.Pre event) {
        Entity entity = event.getEntity();
        if (!(entity instanceof AbstractClientPlayer player)) return;
        if (!(player.getVehicle() instanceof ScooterEntity scooter)) return;

        player.setPose(Pose.STANDING);
        player.setShiftKeyDown(false);

        // 1.19.2: partial tick из MC (у Pre event может не быть getPartialTick)
        float pt = Minecraft.getInstance().getFrameTime();
        float pitch = Mth.clamp(
                scooter.getRenderPitch(pt) * ScooterEntity.PASSENGER_PITCH_SIGN * ScooterEntity.PASSENGER_TILT_SCALE,
                -6.0F, 6.0F);
        float roll = Mth.clamp(
                scooter.getRenderRoll(pt) * ScooterEntity.PASSENGER_ROLL_SIGN * ScooterEntity.PASSENGER_TILT_SCALE,
                -4.0F, 4.0F);

        if (Math.abs(pitch) < 0.12F && Math.abs(roll) < 0.12F) return;

        PoseStack ps = event.getPoseStack();
        float yaw = Mth.rotLerp(pt, scooter.yRotO, scooter.getYRot());

        ps.translate(0.0D, 0.28D, 0.0D);
        ps.mulPose(Vector3f.YP.rotationDegrees(-yaw));
        ps.mulPose(Vector3f.XP.rotationDegrees(pitch));
        ps.mulPose(Vector3f.ZP.rotationDegrees(roll));
        ps.mulPose(Vector3f.YP.rotationDegrees(yaw));
        ps.translate(0.0D, -0.28D, 0.0D);
    }
}
