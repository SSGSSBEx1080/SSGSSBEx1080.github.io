package com.example.zitraksmode.mixin;

import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.ModItems;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.EnchantmentInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.List;

/**
 * The enchanting table must offer exactly Science Power for Medusa. This also
 * protects it from general EnchantmentHelper mixins that may add Unbreaking or
 * other unrelated enchantments to every enchantable item.
 */
@Mixin(EnchantmentHelper.class)
public abstract class MedusaEnchantmentHelperMixin {
    @Inject(method = "getAvailableEnchantmentResults", at = @At("RETURN"))
    private static void zitraksmode$medusaOnlySciencePower(int level, ItemStack stack,
                                                            boolean allowTreasure,
                                                            CallbackInfoReturnable<List<EnchantmentInstance>> callback) {
        if (!stack.is(ModItems.MEDUSA.get())) return;

        List<EnchantmentInstance> results = callback.getReturnValue();
        results.clear();

        int scienceLevel = level >= 29 ? 4 : level >= 21 ? 3 : level >= 13 ? 2 : 1;
        results.add(new EnchantmentInstance(ModEnchantments.SCIENCE_POWER.get(), scienceLevel));
    }
}
