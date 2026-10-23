package com.example.zitraksmode.mixin;

import com.example.zitraksmode.client.PetrificationClientState;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.EyesLayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Endermen, spiders and other vanilla/modded layers based on EyesLayer normally
 * draw emissive eyes after the main LivingEntity texture. A petrified creature
 * must be stone all the way through, so that extra overlay is skipped.
 */
@Mixin(EyesLayer.class)
public abstract class EyesLayerMedusaMixin {
    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void hidePetrifiedEyes(PoseStack poseStack, MultiBufferSource bufferSource, int packedLight,
                                   Entity entity, float limbSwing, float limbSwingAmount,
                                   float partialTick, float ageInTicks, float netHeadYaw,
                                   float headPitch, CallbackInfo callback) {
        if (entity instanceof LivingEntity living && PetrificationClientState.isPetrified(living)) {
            callback.cancel();
        }
    }
}
