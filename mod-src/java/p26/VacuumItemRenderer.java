package com.example.zitraksmode.client.renderer;

import com.example.zitraksmode.client.VacuumItemModel;
import com.example.zitraksmode.items.VacuumItem;
import software.bernie.geckolib3.renderers.geo.GeoItemRenderer;

/** GeckoLib renderer for the vacuum item held in hand and shown in inventory. */
public final class VacuumItemRenderer extends GeoItemRenderer<VacuumItem> {
    public VacuumItemRenderer() {
        super(new VacuumItemModel());
    }
}