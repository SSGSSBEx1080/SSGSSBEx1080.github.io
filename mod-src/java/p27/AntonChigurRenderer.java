package com.example.zitraksmode.client;
import com.example.zitraksmode.entities.AntonChigurEntity; import net.minecraft.client.renderer.entity.EntityRendererProvider; import software.bernie.geckolib3.renderers.geo.GeoEntityRenderer;
public class AntonChigurRenderer extends GeoEntityRenderer<AntonChigurEntity>{public AntonChigurRenderer(EntityRendererProvider.Context c){super(c,new AntonChigurModel());this.shadowRadius=.45F;}}
