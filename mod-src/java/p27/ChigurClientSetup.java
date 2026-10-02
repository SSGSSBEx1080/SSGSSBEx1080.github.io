package com.example.zitraksmode.client;
import com.example.zitraksmode.ModEntities; import com.example.zitraksmode.ZitraksMode; import net.minecraft.client.renderer.entity.EntityRenderers; import net.minecraftforge.api.distmarker.Dist; import net.minecraftforge.eventbus.api.SubscribeEvent; import net.minecraftforge.fml.common.Mod; import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
@Mod.EventBusSubscriber(modid=ZitraksMode.MODID,bus=Mod.EventBusSubscriber.Bus.MOD,value=Dist.CLIENT)
public final class ChigurClientSetup {@SubscribeEvent public static void setup(FMLClientSetupEvent e){e.enqueueWork(()->EntityRenderers.register(ModEntities.ANTON_CHIGUR.get(),AntonChigurRenderer::new));}}
