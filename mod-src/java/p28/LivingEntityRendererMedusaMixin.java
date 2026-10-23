package com.example.zitraksmode.mixin;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.client.PetrificationClientState;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * One common stone tile replaces the texture of every petrified LivingEntity.
 * Their own model, current pose and rotation remain untouched.
 */
@Mixin(LivingEntityRenderer.class)
public abstract class LivingEntityRendererMedusaMixin {
    private static final ResourceLocation PETRIFIED_STONE =
            new ResourceLocation(ZitraksMode.MODID, "textures/misc/petrified_stone.png");

    @Inject(method = "getRenderType", at = @At("HEAD"), cancellable = true)
    private void usePetrifiedStoneTexture(LivingEntity entity, boolean bodyVisible,
                                          boolean translucent, boolean glowing,
                                          CallbackInfoReturnable<RenderType> callback) {
        if (PetrificationClientState.isPetrified(entity)) {
            callback.setReturnValue(RenderType.entitySolid(PETRIFIED_STONE));
        }
    }
}
