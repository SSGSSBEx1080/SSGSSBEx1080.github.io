package com.example.zitraksmode.items;

import com.example.zitraksmode.caps.SandevistanCapability;
import com.example.zitraksmode.events.SandevistanEventHandler;
import com.example.zitraksmode.ModSounds;
import com.example.zitraksmode.ModItems;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.network.chat.Component;
import net.minecraft.ChatFormatting;
import org.jetbrains.annotations.Nullable;
import java.util.List;

public class ImmunosuppressantItem extends Item {
    public ImmunosuppressantItem(Properties properties) { super(properties); }

    @Override
    public int getUseDuration(ItemStack stack) { return 32; }

    @Override
    public UseAnim getUseAnimation(ItemStack stack) { return UseAnim.BOW; }

    @Override
    public void appendHoverText(ItemStack stack, @Nullable Level level, List<Component> tooltip, TooltipFlag flag) {
        super.appendHoverText(stack, level, tooltip, flag);
        tooltip.add(Component.literal("Подавляет отторжение имплантов (-50% психоза).").withStyle(ChatFormatting.GREEN));
        tooltip.add(Component.literal("Эффективность падает на 5% при каждом использовании.").withStyle(ChatFormatting.DARK_GREEN));
        tooltip.add(Component.literal("Организм восстанавливается со временем.").withStyle(ChatFormatting.GRAY));
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (player.getItemBySlot(EquipmentSlot.CHEST).getItem() != ModItems.SANDEVISTAN.get()) {
            return InteractionResultHolder.fail(stack);
        }
        SandevistanCapability.get(player).ifPresent(cap -> {
            if (!cap.isAccelerating()) player.startUsingItem(hand);
        });
        return InteractionResultHolder.consume(stack);
    }

    @Override
    public ItemStack finishUsingItem(ItemStack stack, Level level, LivingEntity entityLiving) {
        if (entityLiving instanceof Player player) {
            if (player.getItemBySlot(EquipmentSlot.CHEST).getItem() == ModItems.SANDEVISTAN.get()) {
                SandevistanCapability.get(player).ifPresent(cap -> {
                    if (!cap.isAccelerating()) {
                        cap.applyImmunosuppressant();
                        player.addEffect(new MobEffectInstance(MobEffects.CONFUSION, 40, 0)); // Тошнота
                        level.playSound(null, player.getX(), player.getY(), player.getZ(), ModSounds.SANDEVISTAN_INJECTION.get(), SoundSource.PLAYERS, 1.0F, 1.0F);
                        if (player instanceof ServerPlayer sp) {
                            SandevistanEventHandler.grantAdvancement(sp, "29_sandevistan/04_injected");
                        }
                    }
                });
            }
            if (!player.getAbilities().instabuild) stack.shrink(1);
        }
        return stack;
    }
}
