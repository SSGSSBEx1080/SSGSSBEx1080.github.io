package com.example.zitraksmode.client.renderer;

import com.example.zitraksmode.entities.ScooterEntity;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Vector3f;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.util.Mth;
import software.bernie.geckolib3.renderers.geo.GeoProjectilesRenderer;

/**
 * Yaw: NOSE_OFFSET - yaw (как работало).
 * Pitch/roll: getRenderPitch/Roll(partialTick) — без дёрганья между тиками.
 */
public class ScooterRenderer extends GeoProjectilesRenderer<ScooterEntity> {

    private static final float NOSE_OFFSET = 180.0F;

    /** После yaw 180 ось X зеркалится. Если спуск/подъём перепутаны — 1.0F. */
    public static final float PITCH_SIGN = -1.0F;

    public ScooterRenderer(EntityRendererProvider.Context context) {
        super(context, new ScooterModel());
        this.shadowRadius = 1.05F;
    }

    @Override
    public void renderEarly(ScooterEntity entity,
                            PoseStack poseStack,
                            float partialTick,
                            MultiBufferSource bufferSource,
                            VertexConsumer buffer,
                            int packedLight,
                            int packedOverlay,
                            float red, float green, float blue, float alpha) {

        // yaw с rotLerp — без щелчков
        float yaw = Mth.rotLerp(partialTick, entity.yRotO, entity.getYRot());
        float arrowPitch = Mth.lerp(partialTick, entity.xRotO, entity.getXRot());

        // 1) undo стрелы parent
        poseStack.mulPose(Vector3f.ZP.rotationDegrees(-arrowPitch));
        poseStack.mulPose(Vector3f.YP.rotationDegrees(-(yaw - 90.0F)));

        // 2) yaw entity
        poseStack.mulPose(Vector3f.YP.rotationDegrees(NOSE_OFFSET - yaw));

        // 3) pitch/roll — интерполяция между тиками (анти-jitter)
        float pitch = Mth.clamp(entity.getRenderPitch(partialTick), -20.0F, 20.0F);
        float roll = Mth.clamp(entity.getRenderRoll(partialTick), -10.0F, 10.0F);

        if (Math.abs(pitch) > 0.15F) {
            poseStack.mulPose(Vector3f.XP.rotationDegrees(pitch * PITCH_SIGN));
        }
        if (Math.abs(roll) > 0.10F) {
            poseStack.mulPose(Vector3f.ZP.rotationDegrees(roll));
        }

        super.renderEarly(entity, poseStack, partialTick, bufferSource, buffer,
                packedLight, packedOverlay, red, green, blue, alpha);
    }
}
