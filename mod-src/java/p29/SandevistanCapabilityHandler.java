package com.example.zitraksmode.caps;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID)
public class SandevistanCapabilityHandler {

    @SubscribeEvent
    public static void onAttachCapabilitiesPlayer(AttachCapabilitiesEvent<Entity> event) {
        if (event.getObject() instanceof Player) {
            if (!event.getObject().getCapability(SandevistanCapability.INSTANCE).isPresent()) {
                event.addCapability(new ResourceLocation(ZitraksMode.MODID, "sandevistan"), new SandevistanCapability.Provider());
            }
        }
    }

    @SubscribeEvent
    public static void onPlayerCloned(PlayerEvent.Clone event) {
        event.getOriginal().getCapability(SandevistanCapability.INSTANCE).ifPresent(oldStore -> {
            event.getEntity().getCapability(SandevistanCapability.INSTANCE).ifPresent(newStore -> {
                newStore.copyFrom(oldStore);
                if (event.isWasDeath() && oldStore.isPsychosisActive()) {
                    newStore.loadNBTData(new net.minecraft.nbt.CompoundTag()); // Сброс при смерти от психоза
                }
            });
        });
    }
}
