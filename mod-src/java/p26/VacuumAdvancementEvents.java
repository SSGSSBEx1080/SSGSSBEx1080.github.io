package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.menu.VacuumMenus;
import com.example.zitraksmode.criteria.VacuumAdvancementHelper;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class VacuumAdvancementEvents {
    private VacuumAdvancementEvents() {
    }

    @SubscribeEvent
    public static void onCrafted(PlayerEvent.ItemCraftedEvent event) {
        if (event.getCrafting().is(ModItems.VACUUM.get())) {
            VacuumAdvancementHelper.grant(event.getEntity(), "vacuum/crafted");
        }
    }
}
