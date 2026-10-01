package com.example.zitraksmode.enchantment;

import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.Enchantment;

/** Normal gameplay can place this enchantment only on the vacuum. */
public final class AiruhanEnchantment extends Enchantment {
    public AiruhanEnchantment() {
        super(
                Rarity.RARE,
                ModEnchantmentCategories.VACUUM,
                new EquipmentSlot[]{EquipmentSlot.MAINHAND}
        );
    }

    @Override
    public int getMaxLevel() {
        return 3;
    }

    @Override
    public int getMinCost(int level) {
        return 6 + (level - 1) * 10;
    }

    @Override
    public int getMaxCost(int level) {
        return getMinCost(level) + 12;
    }

    @Override
    public boolean canEnchant(ItemStack stack) {
        return ModEnchantmentCategories.VACUUM.canEnchant(stack.getItem());
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return canEnchant(stack);
    }
}