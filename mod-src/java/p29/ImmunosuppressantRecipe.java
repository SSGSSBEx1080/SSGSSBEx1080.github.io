package com.example.zitraksmode.recipe;

import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.alchemy.PotionUtils;
import net.minecraft.world.item.alchemy.Potions;
import net.minecraft.world.item.Items;
import net.minecraftforge.common.brewing.IBrewingRecipe;
import com.example.zitraksmode.ModItems;

public class ImmunosuppressantRecipe implements IBrewingRecipe {
    @Override
    public boolean isInput(ItemStack input) {
        // Regeneration II potion
        return input.getItem() == Items.POTION && PotionUtils.getPotion(input) == Potions.STRONG_REGENERATION;
    }

    @Override
    public boolean isIngredient(ItemStack ingredient) {
        return ingredient.getItem() == Items.ENDER_EYE;
    }

    @Override
    public ItemStack getOutput(ItemStack input, ItemStack ingredient) {
        if (isInput(input) && isIngredient(ingredient)) {
            return new ItemStack(ModItems.IMMUNOSUPPRESSANT.get());
        }
        return ItemStack.EMPTY;
    }
}
