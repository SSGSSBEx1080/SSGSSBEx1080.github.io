package com.example.zitraksmode.enchantment;

import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.ModItems;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.enchantment.Enchantment;
import net.minecraft.world.item.enchantment.EnchantmentCategory;

public class YobyrMamokEnchantment extends Enchantment {

    public YobyrMamokEnchantment() {
        super(Rarity.RARE, ModEnchantmentCategories.MADE_IN_HEAVEN, new EquipmentSlot[0]);
    }

    @Override public int getMaxLevel() { return 1; }

    @Override
    public boolean canEnchant(ItemStack stack) {
        if (stack.is(Items.BOOK) || stack.is(Items.ENCHANTED_BOOK)) return true;
        return stack.getItem() == ModItems.MADE_IN_HEAVEN.get();
    }

    @Override public boolean isAllowedOnBooks() { return true; }
    @Override public boolean isDiscoverable() { return true; }
    @Override public boolean isTreasureOnly() { return false; }

    @Override
    protected boolean checkCompatibility(Enchantment other) {
        if (other == ModEnchantments.HOCHU_LABUBU.get()) return true;
        return super.checkCompatibility(other);
    }

    @Override public int getMinCost(int level) { return 12; }
    @Override public int getMaxCost(int level) { return 35; }
}
