package com.example.zitraksmode.enchantment;

import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.Enchantment;

/**
 * Expands Medusa's selectable petrification radius. The category and canEnchant
 * check make it incompatible with every item except Medusa.
 */
public final class SciencePowerEnchantment extends Enchantment {
    public SciencePowerEnchantment() {
        super(Rarity.RARE, ModEnchantmentCategories.MEDUSA,
                new EquipmentSlot[]{EquipmentSlot.MAINHAND});
    }

    @Override
    public int getMaxLevel() {
        return 4;
    }

    /*
     * All four levels are deliberately reachable from a level-30 enchanting
     * table. The old 20 + 15 * level formula made level IV cost 65 and it could
     * never be rolled there.
     */
    @Override
    public int getMinCost(int level) {
        return 5 + (level - 1) * 8;
    }

    @Override
    public int getMaxCost(int level) {
        return getMinCost(level) + 12;
    }

    @Override
    public boolean canEnchant(ItemStack stack) {
        return ModEnchantmentCategories.MEDUSA.canEnchant(stack.getItem());
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return canEnchant(stack);
    }

    @Override
    public Component getFullname(int level) {
        return Component.literal("Сила науки " + romanLevel(level))
                .withStyle(ChatFormatting.GRAY);
    }

    private static String romanLevel(int level) {
        return switch (level) {
            case 1 -> "I";
            case 2 -> "II";
            case 3 -> "III";
            case 4 -> "IV";
            default -> Integer.toString(level);
        };
    }
}
