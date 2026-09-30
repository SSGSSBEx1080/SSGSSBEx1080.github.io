package com.example.zitraksmode.client.renderer;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.entities.ScooterEntity;
import net.minecraft.resources.ResourceLocation;
import software.bernie.geckolib3.model.AnimatedGeoModel;

public class ScooterModel extends AnimatedGeoModel<ScooterEntity> {

    @Override
    public ResourceLocation getModelResource(ScooterEntity object) {
        return new ResourceLocation(ZitraksMode.MODID, "geo/scooter.geo.json");
    }

    @Override
    public ResourceLocation getTextureResource(ScooterEntity object) {
        return new ResourceLocation(ZitraksMode.MODID, "textures/entity/scooters.png");
    }

    @Override
    public ResourceLocation getAnimationResource(ScooterEntity animatable) {
        return new ResourceLocation(ZitraksMode.MODID, "animations/scooter.animation.json");
    }
}
