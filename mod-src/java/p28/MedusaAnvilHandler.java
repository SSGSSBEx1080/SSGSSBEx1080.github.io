package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.items.MedusaItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraftforge.event.AnvilUpdateEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * Зарядка Медузы алмазом в наковальне.
 *
 * Разряженная Медуза + алмаз = заряженная Медуза.
 * Алмаз расходуется, стоимость — ровно 1 уровень опыта.
 */
@Mod.EventBusSubscriber(
        modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class MedusaAnvilHandler {

    private MedusaAnvilHandler() {
    }

    @SubscribeEvent
    public static void rechargeMedusa(
            AnvilUpdateEvent event
    ) {
        ItemStack left =
                event.getLeft();

        ItemStack right =
                event.getRight();

        if (!(left.getItem()
                instanceof MedusaItem)) {
            return;
        }

        if (!right.is(Items.DIAMOND)) {
            return;
        }

        /*
         * Заряженную Медузу повторно заряжать нельзя.
         */
        if (MedusaItem.isCharged(left)) {
            return;
        }

        ItemStack output =
                left.copy();

        MedusaItem.setCharged(
                output,
                true
        );

        /*
         * На всякий случай сбрасываем старый таймер.
         */
        MedusaItem.clearArmed(
                output
        );

        event.setOutput(
                output
        );

        /*
         * Один алмаз расходуется.
         */
        event.setMaterialCost(
                1
        );

        /*
         * Минимальная стоимость наковальни —
         * один уровень опыта.
         */
        event.setCost(
                1
        );
    }
}