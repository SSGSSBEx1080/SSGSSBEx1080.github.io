package com.example.zitraksmode.menu;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.menu.VacuumMenu;
import net.minecraft.world.inventory.MenuType;
import net.minecraftforge.common.extensions.IForgeMenuType;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

/** Only menus stay in their own register; item/enchantment use ModItems/ModEnchantments. */
public final class VacuumMenus {
    public static final DeferredRegister<MenuType<?>> MENUS =
            DeferredRegister.create(ForgeRegistries.MENU_TYPES, ZitraksMode.MODID);

    public static final RegistryObject<MenuType<VacuumMenu>> VACUUM_MENU = MENUS.register("vacuum_menu",
            () -> IForgeMenuType.create(VacuumMenu::fromNetwork));

    private VacuumMenus() {
    }

    public static void register(IEventBus bus) {
        MENUS.register(bus);
    }
}
