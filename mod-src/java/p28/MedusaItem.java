package com.example.zitraksmode.items;

import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.ModEntities;
import com.example.zitraksmode.entities.MedusaOrbEntity;
import com.example.zitraksmode.events.MedusaAdvancementHelper;
import com.example.zitraksmode.events.PetrificationManager;
import net.minecraft.ChatFormatting;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.level.Level;

import javax.annotation.Nullable;
import java.util.List;
import java.util.Locale;

/**
 * Chargeable throwable Medusa.
 *
 * <p>LMB opens settings. RMB starts a throw. Shift + RMB starts an irreversible
 * countdown in the holder's hand; an already armed Medusa may still be thrown.
 * The charge is NBT data, not vanilla item durability.</p>
 */
public final class MedusaItem extends Item {
    public static final int MIN_RADIUS = 2;
    /** Normal Medusa without the Science Power enchantment. */
    public static final int MAX_RADIUS = 32;
    public static final int SCIENCE_POWER_I_RADIUS = 64;
    public static final int SCIENCE_POWER_II_RADIUS = 128;
    public static final int SCIENCE_POWER_III_RADIUS = 256;
    public static final int SCIENCE_POWER_IV_RADIUS = 512;

    /** 0.1 seconds at 20 game ticks per second. */
    public static final int MIN_DELAY_TICKS = 2;
    /** 60 seconds at 20 game ticks per second. */
    public static final int MAX_DELAY_TICKS = 20 * 60;
    /** The settings slider intentionally changes the delay in 0.1-second steps. */
    public static final int DELAY_STEP_TICKS = 2;

    /** 32 blocks take one second; larger enchanted radii take proportionally longer. */
    public static final double PETRIFICATION_WAVE_BLOCKS_PER_TICK = 1.6D;

    public static final String CHARGED_TAG = "MedusaCharged";
    public static final String RADIUS_TAG = "MedusaRadius";
    public static final String DELAY_TAG = "MedusaDelayTicks";
    public static final String ARMED_TAG = "MedusaArmed";
    public static final String DETONATE_AT_TAG = "MedusaDetonateAt";

    public MedusaItem(Properties properties) {
        /*
         * Stack size/durability is configured only in ModItems. Forge 1.19.2
         * rejects an Item.Properties instance that has both durability and a
         * stack size. Medusa's charge is stored in NBT, so it has no durability.
         */
        super(properties.rarity(Rarity.EPIC));
    }

    /**
     * Medusa has no vanilla durability because its charge lives in NBT. Vanilla
     * Item#isEnchantable would therefore reject it, so explicitly make it a
     * valid enchanting-table item. Only Science Power still passes its category
     * and canEnchant checks.
     */
    @Override
    public boolean isEnchantable(ItemStack stack) {
        return true;
    }

    @Override
    public int getEnchantmentValue() {
        return 22;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);

        if (player.isShiftKeyDown()) {
            if (isArmed(stack)) {
                if (!level.isClientSide) {
                    player.displayClientMessage(Component.literal("Таймер медузы уже запущен.")
                            .withStyle(ChatFormatting.YELLOW), true);
                }
                return InteractionResultHolder.fail(stack);
            }

            if (!level.isClientSide) {
                if (!isCharged(stack)) {
                    player.displayClientMessage(Component.literal("Медуза разряжена.")
                            .withStyle(ChatFormatting.GRAY), true);
                    return InteractionResultHolder.fail(stack);
                }

                arm(stack, level.getGameTime() + getDelayTicks(stack));
                if (player instanceof net.minecraft.server.level.ServerPlayer serverPlayer) {
                    MedusaAdvancementHelper.award(serverPlayer, MedusaAdvancementHelper.COUNTDOWN);
                }
                player.displayClientMessage(Component.literal("Таймер медузы запущен прямо в руке.")
                        .withStyle(ChatFormatting.GREEN), true);
            }
            return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
        }

        // An armed Medusa remains throwable: pickup must not cancel its deadline.
        player.startUsingItem(hand);
        return InteractionResultHolder.consume(stack);
    }

    @Override
    public void releaseUsing(ItemStack stack, Level level, LivingEntity user, int timeLeft) {
        if (!(user instanceof Player player) || level.isClientSide) return;

        int usedTicks = getUseDuration(stack) - timeLeft;
        if (usedTicks < 3) return;

        ItemStack thrownStack = stack.copy();
        thrownStack.setCount(1);

        /*
         * Never calculate a second deadline for an armed Medusa. Shift + RMB
         * writes one absolute world time into NBT; the same number is copied to
         * the orb, so throwing after 2 seconds leaves only the remaining time.
         */
        long detonateAt;
        if (isArmed(stack)) {
            detonateAt = getDetonateAt(stack);
            arm(thrownStack, detonateAt);
        } else {
            detonateAt = level.getGameTime() + getDelayTicks(stack);
        }

        MedusaOrbEntity orb = new MedusaOrbEntity(
                ModEntities.MEDUSA_ORB.get(),
                (ServerLevel) level,
                player,
                thrownStack,
                detonateAt
        );

        float power = Math.min(1.0F, usedTicks / 20.0F);
        orb.shootFromRotation(player, player.getXRot(), player.getYRot(), 0.0F,
                0.45F + power * 1.85F, 1.0F - power * 0.5F);
        level.addFreshEntity(orb);

        if (!player.getAbilities().instabuild) {
            stack.shrink(1);
        } else {
            // Creative keeps the original stack, but it is no longer the armed device.
            // Otherwise it would create a duplicate second detonation in the inventory.
            clearArmed(stack);
        }
    }

    @Override
    public int getUseDuration(ItemStack stack) {
        return 72_000;
    }

    @Override
    public UseAnim getUseAnimation(ItemStack stack) {
        return UseAnim.BOW;
    }

    @Override
    public void inventoryTick(ItemStack stack, Level level, Entity holder, int slot, boolean selected) {
        if (level.isClientSide || !isArmed(stack)) return;
        if (level.getGameTime() < getDetonateAt(stack)) return;

        if (holder instanceof LivingEntity living && level instanceof ServerLevel serverLevel) {
            net.minecraft.server.level.ServerPlayer activator = holder instanceof net.minecraft.server.level.ServerPlayer serverPlayer
                    ? serverPlayer : null;
            PetrificationManager.petrifySphere(serverLevel, living.position(), getRadius(stack), activator);
            setCharged(stack, false);
        }
        clearArmed(stack);
    }

    public static boolean isCharged(ItemStack stack) {
        CompoundTag tag = stack.getTag();
        return tag == null || !tag.contains(CHARGED_TAG) || tag.getBoolean(CHARGED_TAG);
    }

    public static void setCharged(ItemStack stack, boolean charged) {
        stack.getOrCreateTag().putBoolean(CHARGED_TAG, charged);
    }

    public static int getRadius(ItemStack stack) {
        CompoundTag tag = stack.getOrCreateTag();
        return clamp(tag.contains(RADIUS_TAG) ? tag.getInt(RADIUS_TAG) : 8,
                MIN_RADIUS, getMaxRadius(stack));
    }

    /**
     * Science Power expands the slider and the actual server-side effect cap.
     * I → 64, II → 128, III → 256, IV → 512 blocks.
     */
    public static int getMaxRadius(ItemStack stack) {
        int level = Math.min(4, EnchantmentHelper.getItemEnchantmentLevel(
                ModEnchantments.SCIENCE_POWER.get(), stack));
        return switch (level) {
            case 1 -> SCIENCE_POWER_I_RADIUS;
            case 2 -> SCIENCE_POWER_II_RADIUS;
            case 3 -> SCIENCE_POWER_III_RADIUS;
            case 4 -> SCIENCE_POWER_IV_RADIUS;
            default -> MAX_RADIUS;
        };
    }

    public static int getDelayTicks(ItemStack stack) {
        CompoundTag tag = stack.getOrCreateTag();
        int storedDelay = tag.contains(DELAY_TAG) ? tag.getInt(DELAY_TAG) : 20 * 3;
        return normalizeDelayTicks(storedDelay);
    }

    public static void setSettings(ItemStack stack, int radius, int delayTicks) {
        CompoundTag tag = stack.getOrCreateTag();
        // Server-side clamp: a packet cannot grant a larger radius than the
        // Science Power level actually present on this exact Medusa stack.
        tag.putInt(RADIUS_TAG, clamp(radius, MIN_RADIUS, getMaxRadius(stack)));
        tag.putInt(DELAY_TAG, normalizeDelayTicks(delayTicks));
    }

    public static boolean isArmed(ItemStack stack) {
        return stack.hasTag() && stack.getTag().getBoolean(ARMED_TAG);
    }

    public static long getDetonateAt(ItemStack stack) {
        return stack.hasTag() ? stack.getTag().getLong(DETONATE_AT_TAG) : 0L;
    }

    public static void arm(ItemStack stack, long detonateAt) {
        CompoundTag tag = stack.getOrCreateTag();
        tag.putBoolean(ARMED_TAG, true);
        tag.putLong(DETONATE_AT_TAG, detonateAt);
    }

    public static void clearArmed(ItemStack stack) {
        if (!stack.hasTag()) return;
        stack.getTag().remove(ARMED_TAG);
        stack.getTag().remove(DETONATE_AT_TAG);
    }

    public static String formatDelaySeconds(int delayTicks) {
        return String.format(Locale.ROOT, "%.1f", delayTicks / 20.0D);
    }

    private static int normalizeDelayTicks(int delayTicks) {
        int clamped = clamp(delayTicks, MIN_DELAY_TICKS, MAX_DELAY_TICKS);
        int steps = (int) Math.round((clamped - MIN_DELAY_TICKS) / (double) DELAY_STEP_TICKS);
        return clamp(MIN_DELAY_TICKS + steps * DELAY_STEP_TICKS, MIN_DELAY_TICKS, MAX_DELAY_TICKS);
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    @Override
    public void appendHoverText(ItemStack stack, @Nullable Level level,
                                List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.literal(isCharged(stack) ? "Заряжена" : "Разряжена")
                .withStyle(isCharged(stack) ? ChatFormatting.GREEN : ChatFormatting.RED));
        int maxRadius = getMaxRadius(stack);
        tooltip.add(Component.literal("Радиус: " + getRadius(stack) + " / " + maxRadius + " блоков")
                .withStyle(ChatFormatting.GRAY));
        if (maxRadius > MAX_RADIUS) {
            tooltip.add(Component.literal("Сила науки: максимум " + maxRadius + " блоков")
                    .withStyle(ChatFormatting.AQUA));
        }
        tooltip.add(Component.literal("Задержка: " + formatDelaySeconds(getDelayTicks(stack)) + " сек.")
                .withStyle(ChatFormatting.GRAY));
        tooltip.add(Component.literal("ЛКМ: настройки | Shift + ПКМ: в руке")
                .withStyle(ChatFormatting.DARK_GRAY));
    }
}
