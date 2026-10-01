package com.example.zitraksmode.items;

import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.client.VacuumClientInput;
import com.example.zitraksmode.menu.VacuumMenu;
import com.example.zitraksmode.vacuum.VacuumData;
import com.example.zitraksmode.vacuum.VacuumFilterMode;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.level.Level;
import net.minecraftforge.client.extensions.common.IClientItemExtensions;
import net.minecraftforge.network.NetworkHooks;
import software.bernie.geckolib3.core.IAnimatable;
import software.bernie.geckolib3.core.PlayState;
import software.bernie.geckolib3.core.builder.AnimationBuilder;
import software.bernie.geckolib3.core.builder.ILoopType;
import software.bernie.geckolib3.core.controller.AnimationController;
import software.bernie.geckolib3.core.event.predicate.AnimationEvent;
import software.bernie.geckolib3.core.manager.AnimationData;
import software.bernie.geckolib3.core.manager.AnimationFactory;
import software.bernie.geckolib3.util.GeckoLibUtil;

import javax.annotation.Nullable;
import java.util.List;
import java.util.function.Consumer;

/** Right-click opens configuration/storage; LMB hold is handled by VacuumClientInput + server events. */
public final class VacuumItem extends Item implements IAnimatable {
    private final AnimationFactory factory = GeckoLibUtil.createFactory(this);

    public VacuumItem(Properties properties) {
        super(properties);
    }

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

        if (!level.isClientSide && player instanceof ServerPlayer serverPlayer) {
            int inventorySlot = hand == InteractionHand.MAIN_HAND
                    ? player.getInventory().selected
                    : 40;

            NetworkHooks.openScreen(
                    serverPlayer,
                    VacuumMenu.provider(stack, hand, inventorySlot),
                    buffer -> {
                        buffer.writeEnum(hand);
                        buffer.writeVarInt(inventorySlot);
                    }
            );
        }

        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    @Override
    public void appendHoverText(
            ItemStack stack,
            @Nullable Level level,
            List<Component> tooltip,
            TooltipFlag flag
    ) {
        VacuumFilterMode mode = VacuumData.getMode(stack);
        int power = VacuumData.getPower(stack);

        int airuhan = EnchantmentHelper.getItemEnchantmentLevel(
                ModEnchantments.AIRUHAN.get(),
                stack
        );

        int suctionRange = power + airuhan * 5;

        tooltip.add(
                Component.literal("Режим: " + mode.id)
                        .withStyle(ChatFormatting.AQUA)
        );

        tooltip.add(
                Component.literal(
                        "Сила: " + power + "/10 • дальность: " + suctionRange
                ).withStyle(ChatFormatting.GRAY)
        );

        tooltip.add(
                Component.literal(
                        "Уровень: " + VacuumData.getUpgradeLevel(stack) + "/15"
                ).withStyle(ChatFormatting.GOLD)
        );

        tooltip.add(
                Component.literal(
                        "Хранилище: " + VacuumData.getCapacity(stack)
                                + "/" + VacuumData.MAX_SLOTS + " ячеек"
                ).withStyle(ChatFormatting.GRAY)
        );

        tooltip.add(
                Component.literal("Удерживай ЛКМ для всасывания")
                        .withStyle(ChatFormatting.AQUA)
        );
    }

    @Override
    public void initializeClient(Consumer<IClientItemExtensions> consumer) {
        consumer.accept(new IClientItemExtensions() {
            private com.example.zitraksmode.client.renderer.VacuumItemRenderer renderer;

            @Override
            public net.minecraft.client.renderer.BlockEntityWithoutLevelRenderer getCustomRenderer() {
                if (renderer == null) {
                    renderer = new com.example.zitraksmode.client.renderer.VacuumItemRenderer();
                }

                return renderer;
            }
        });
    }

    @Override
    public void registerControllers(AnimationData data) {
        data.addAnimationController(
                new AnimationController<>(
                        this,
                        "vacuum_idle",
                        5,
                        this::idlePredicate
                )
        );
    }

    private <P extends IAnimatable> PlayState idlePredicate(AnimationEvent<P> event) {
        String animation = VacuumClientInput.isSucking()
                ? "animation.vacuum.suck"
                : "animation.vacuum.idle";

        event.getController().setAnimation(
                new AnimationBuilder().addAnimation(
                        animation,
                        ILoopType.EDefaultLoopTypes.LOOP
                )
        );

        return PlayState.CONTINUE;
    }

    @Override
    public AnimationFactory getFactory() {
        return factory;
    }
}