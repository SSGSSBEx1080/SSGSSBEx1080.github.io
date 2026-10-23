package com.example.zitraksmode.client.armor;

import com.example.zitraksmode.items.SandevistanItem;
import net.minecraft.resources.ResourceLocation;
import software.bernie.geckolib3.model.AnimatedGeoModel;

public class SandevistanArmorModel extends AnimatedGeoModel<SandevistanItem> {
    @Override
    public ResourceLocation getModelResource(SandevistanItem object) {
        return new ResourceLocation("zitraksmode", "geo/sandevistan.geo.json");
    }
    @Override
    public ResourceLocation getTextureResource(SandevistanItem object) {
        return new ResourceLocation("zitraksmode", "textures/armor/sandevistan.png");
    }
    @Override
    public ResourceLocation getAnimationResource(SandevistanItem object) {
        return null; // Без анимаций
    }
}
