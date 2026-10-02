package com.example.zitraksmode.items;

import com.example.zitraksmode.ModSounds;
import net.minecraft.ChatFormatting;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

import javax.annotation.Nullable;
import java.util.List;

/** Rare Chigur trophy weapon: 300 shots total, six per drum, forced 10s reload. */
public final class ChigurShotgunItem extends Item {
    private static final String AMMO_TAG = "ChigurShotgunAmmo";
    private static final String PUMP_UNTIL_TAG = "ChigurShotgunPumpUntil";
    private static final String RELOAD_UNTIL_TAG = "ChigurShotgunReloadUntil";
    private static final int MAX_AMMO = 6;
    private static final int PUMP_TICKS = 8;
    private static final int RELOAD_TICKS = 20 * 10;

    public ChigurShotgunItem(Properties properties) {
        super(properties.stacksTo(1).durability(300).rarity(net.minecraft.world.item.Rarity.EPIC));
    }

    private int ammo(ItemStack stack) {
        CompoundTag tag = stack.getOrCreateTag();
        return tag.contains(AMMO_TAG) ? Mth.clamp(tag.getInt(AMMO_TAG), 0, MAX_AMMO) : MAX_AMMO;
    }

    private void setAmmo(ItemStack stack, int value) {
        stack.getOrCreateTag().putInt(AMMO_TAG, Mth.clamp(value, 0, MAX_AMMO));
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        CompoundTag tag = stack.getOrCreateTag();
        long now = level.getGameTime();
        long reloadUntil = tag.getLong(RELOAD_UNTIL_TAG);

        if (reloadUntil > now) {
            if (!level.isClientSide) {
                long seconds = Math.max(1L, (reloadUntil - now + 19L) / 20L);
                player.displayClientMessage(Component.literal("Перезарядка: " + seconds + "с").withStyle(ChatFormatting.RED), true);
            }
            return InteractionResultHolder.fail(stack);
        }

        if (reloadUntil != 0L) {
            tag.remove(RELOAD_UNTIL_TAG);
            setAmmo(stack, MAX_AMMO);
            level.playSound(null, player.blockPosition(), ModSounds.CHIGUR_RELOAD.get(), SoundSource.PLAYERS, 0.9F, 1.0F);
        }

        if (tag.getLong(PUMP_UNTIL_TAG) > now) return InteractionResultHolder.fail(stack);

        if (!level.isClientSide) {
            LivingEntity target = findTarget(player, 10.0D);
            if (target != null) {
                double distance = player.getEyePosition().distanceTo(target.getEyePosition());
                double progress = Mth.clamp((distance - 2.0D) / 8.0D, 0.0D, 1.0D);
                float damage = (float) (7.0D + 60.0D * Math.pow(1.0D - progress, 2.0D));
                target.hurt(net.minecraft.world.damagesource.DamageSource.playerAttack(player), damage);
            }

            int remainingAmmo = ammo(stack) - 1;
            setAmmo(stack, remainingAmmo);
            tag.putLong(PUMP_UNTIL_TAG, now + PUMP_TICKS);
            stack.hurtAndBreak(1, player, p -> p.broadcastBreakEvent(hand));
            level.playSound(null, player.blockPosition(), ModSounds.CHIGUR_SHOT.get(), SoundSource.PLAYERS, 1.0F, 1.0F);

            if (remainingAmmo <= 0) {
                tag.putLong(RELOAD_UNTIL_TAG, now + RELOAD_TICKS);
                level.playSound(null, player.blockPosition(), ModSounds.CHIGUR_RELOAD.get(), SoundSource.PLAYERS, 0.65F, 0.75F);
            }
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    @Nullable
    private LivingEntity findTarget(Player player, double maxDistance) {
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle().normalize();
        LivingEntity best = null;
        double bestDistance = maxDistance;
        for (LivingEntity entity : player.level.getEntitiesOfClass(LivingEntity.class,
                player.getBoundingBox().inflate(maxDistance), entity -> entity != player && entity.isAlive())) {
            Vec3 offset = entity.getEyePosition().subtract(eye);
            double distance = offset.length();
            if (distance < 0.01D || distance > bestDistance || look.dot(offset.normalize()) < 0.94D) continue;
            best = entity;
            bestDistance = distance;
        }
        return best;
    }

    @Override
    public boolean isValidRepairItem(ItemStack toRepair, ItemStack repair) {
        return repair.is(net.minecraft.world.item.Items.IRON_INGOT)
                || repair.is(net.minecraft.world.item.Items.GUNPOWDER)
                || super.isValidRepairItem(toRepair, repair);
    }

    @Override
    public void appendHoverText(ItemStack stack, @Nullable Level level, List<Component> tooltip, TooltipFlag flag) {
        long reload = level == null ? 0L : stack.getOrCreateTag().getLong(RELOAD_UNTIL_TAG) - level.getGameTime();
        tooltip.add(Component.literal("Патроны: " + ammo(stack) + "/6").withStyle(ChatFormatting.GOLD));
        tooltip.add(Component.literal("Прочность: " + (stack.getMaxDamage() - stack.getDamageValue()) + "/" + stack.getMaxDamage())
                .withStyle(ChatFormatting.GRAY));
        if (reload > 0) tooltip.add(Component.literal("Перезарядка: " + Math.max(1L, (reload + 19L) / 20L) + "с").withStyle(ChatFormatting.RED));
        tooltip.add(Component.literal("Чинится: железо или порох").withStyle(ChatFormatting.DARK_GRAY));
    }
}
