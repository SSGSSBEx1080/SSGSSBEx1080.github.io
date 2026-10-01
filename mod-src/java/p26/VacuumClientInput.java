package com.example.zitraksmode.client;

import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.network.VacuumAction;
import com.example.zitraksmode.network.VacuumActionPacket;
import com.example.zitraksmode.network.VacuumInputPacket;
import com.example.zitraksmode.network.VacuumNetwork;
import com.example.zitraksmode.vacuum.VacuumData;
import net.minecraft.client.Minecraft;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/** Client LMB detector, wheel power controls and vacuum power HUD trigger. */
@Mod.EventBusSubscriber(
        modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE,
        value = Dist.CLIENT
)
public final class VacuumClientInput {
    private static final int POWER_OVERLAY_TICKS = 45;

    private static boolean lastHolding;
    private static VacuumLoopSound loopSound;
    private static int powerOverlayTicks;
    private static int displayedPower;

    private VacuumClientInput() {
    }

    public static boolean isSucking() {
        return lastHolding;
    }

    public static boolean shouldShowPowerOverlay() {
        return powerOverlayTicks > 0;
    }

    public static int getDisplayedPower() {
        return displayedPower;
    }

    public static int getPowerOverlayTicks() {
        return powerOverlayTicks;
    }

    private static void showPowerOverlay(int power) {
        displayedPower = power;
        powerOverlayTicks = POWER_OVERLAY_TICKS;
    }

    @SubscribeEvent
    public static void onMouseScroll(InputEvent.MouseScrollingEvent event) {
        Minecraft minecraft = Minecraft.getInstance();

        if (minecraft.player == null || minecraft.screen != null) {
            return;
        }

        ItemStack stack = minecraft.player.getMainHandItem();

        if (!stack.is(ModItems.VACUUM.get())) {
            return;
        }

        event.setCanceled(true);

        int current = VacuumData.getPower(stack);
        int next = Math.max(
                1,
                Math.min(
                        10,
                        current + (event.getScrollDelta() > 0.0D ? 1 : -1)
                )
        );

        // Показываем HUD даже когда игрок уже упёрся в 1 или 10.
        showPowerOverlay(next);

        if (next == current) {
            return;
        }

        VacuumData.setPower(stack, next);

        VacuumNetwork.CHANNEL.sendToServer(
                VacuumActionPacket.number(VacuumAction.SET_POWER, next)
        );
    }

    @SubscribeEvent
    public static void onAttackInput(InputEvent.InteractionKeyMappingTriggered event) {
        if (!event.isAttack()) {
            return;
        }

        Minecraft minecraft = Minecraft.getInstance();

        if (minecraft.player == null
                || !minecraft.player.getMainHandItem().is(ModItems.VACUUM.get())) {
            return;
        }

        event.setSwingHand(false);
        event.setCanceled(true);
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }

        if (powerOverlayTicks > 0) {
            powerOverlayTicks--;
        }

        Minecraft minecraft = Minecraft.getInstance();

        if (minecraft.player == null || minecraft.level == null) {
            return;
        }

        ItemStack stack = minecraft.player.getMainHandItem();

        boolean holding = minecraft.screen == null
                && minecraft.options.keyAttack.isDown()
                && stack.is(ModItems.VACUUM.get());

        if (holding != lastHolding) {
            VacuumNetwork.CHANNEL.sendToServer(
                    new VacuumInputPacket(holding)
            );

            lastHolding = holding;

            if (holding) {
                loopSound = new VacuumLoopSound(minecraft.player);
                minecraft.getSoundManager().play(loopSound);
            } else if (loopSound != null) {
                loopSound.stopLoop();
                loopSound = null;
            }
        }
    }
}