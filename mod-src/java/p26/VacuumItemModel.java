package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.items.VacuumItem;
import net.minecraft.resources.ResourceLocation;
import software.bernie.geckolib3.model.AnimatedGeoModel;

public final class VacuumItemModel extends AnimatedGeoModel<VacuumItem> {
    @Override
    public ResourceLocation getModelResource(VacuumItem object) {
        return new ResourceLocation(ZitraksMode.MODID, "geo/vacuum.geo.json");
    }

    @Override
    public ResourceLocation getTextureResource(VacuumItem object) {
        return new ResourceLocation(ZitraksMode.MODID, "textures/item/vacuum.png");
    }

    @Override
    public ResourceLocation getAnimationResource(VacuumItem animatable) {
        return new ResourceLocation(ZitraksMode.MODID, "animations/vacuum.animation.json");
    }
}
