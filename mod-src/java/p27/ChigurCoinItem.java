package com.example.zitraksmode.items;

import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;

import javax.annotation.Nullable;
import java.util.List;

/**
 * Normal item without GeckoLib renderer or animations.
 * Right-click only announces a random heads/tails result to nearby players.
 */
public final class ChigurCoinItem extends Item {
    private static final double ANNOUNCE_RADIUS = 5.0D;
    private static final double ANNOUNCE_RADIUS_SQR = ANNOUNCE_RADIUS * ANNOUNCE_RADIUS;

    public ChigurCoinItem(Properties properties) {
        super(properties.stacksTo(1).rarity(Rarity.EPIC));
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);

        if (!level.isClientSide && level instanceof ServerLevel serverLevel) {
            boolean heads = RandomSource.create().nextBoolean();
            Component result = Component.literal(heads ? "Орёл" : "Решка")
                    .withStyle(ChatFormatting.GOLD);

            for (ServerPlayer nearbyPlayer : serverLevel.getEntitiesOfClass(
                    ServerPlayer.class,
                    player.getBoundingBox().inflate(ANNOUNCE_RADIUS),
                    candidate -> candidate.isAlive() && candidate.distanceToSqr(player) <= ANNOUNCE_RADIUS_SQR
            )) {
                // true = надпись над хотбаром, а не засорение чата.
                nearbyPlayer.displayClientMessage(result, true);
            }
        }

        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    @Override
    public void appendHoverText(ItemStack stack, @Nullable Level level,
                                List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.literal("Выиграна у Антона Чигура").withStyle(ChatFormatting.GOLD));
        tooltip.add(Component.literal("ПКМ: Орёл или Решка для игроков рядом").withStyle(ChatFormatting.GRAY));
        tooltip.add(Component.literal("Радиус объявления: 5 блоков").withStyle(ChatFormatting.DARK_GRAY));
    }
}
