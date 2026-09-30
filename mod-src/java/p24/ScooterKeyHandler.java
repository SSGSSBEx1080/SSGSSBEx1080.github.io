package com.example.zitraksmode.client;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.entities.ScooterEntity;
import com.example.zitraksmode.network.scooter.ScooterActionPacket;
import com.example.zitraksmode.network.scooter.ScooterInputPacket;
import com.example.zitraksmode.network.scooter.ScooterPackets;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE, value = Dist.CLIENT)
public class ScooterKeyHandler {

    private static boolean wasForward;
    private static boolean wasBack;
    private static boolean wasLeft;
    private static boolean wasRight;

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;

        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || !(mc.player.getVehicle() instanceof ScooterEntity scooter)) {
            return;
        }

        if (scooter.getDriver() != mc.player) {
            return;
        }

        LocalPlayer lp = mc.player;
        boolean fwd = lp.input.up;
        boolean bck = lp.input.down;
        boolean lft = lp.input.left;
        boolean rgt = lp.input.right;

        scooter.setInputState(fwd, bck, lft, rgt);

        if (fwd != wasForward || bck != wasBack || lft != wasLeft || rgt != wasRight) {
            wasForward = fwd;
            wasBack = bck;
            wasLeft = lft;
            wasRight = rgt;
            ScooterPackets.sendToServer(new ScooterInputPacket(scooter.getId(), fwd, bck, lft, rgt));
        }
    }

    @SubscribeEvent
    public static void onKeyInput(InputEvent.Key event) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || !(mc.player.getVehicle() instanceof ScooterEntity scooter)) {
            return;
        }

        if (scooter.getDriver() != mc.player) {
            return;
        }

        if (event.getAction() == 1) { // Press
            if (ScooterKeyMappings.PICK_UP.consumeClick()) {
                ScooterPackets.sendToServer(new ScooterActionPacket(scooter.getId(), ScooterActionPacket.PICK_UP));
            }
        }
    }

    @SubscribeEvent
    public static void onMouseInput(InputEvent.MouseButton event) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || !(mc.player.getVehicle() instanceof ScooterEntity scooter)) {
            return;
        }

        if (scooter.getDriver() != mc.player) {
            return;
        }

        if (event.getAction() == 1) { // Клик мыши
            if (event.getButton() == 1) { // ПКМ - Гудок
                ScooterPackets.sendToServer(new ScooterActionPacket(scooter.getId(), ScooterActionPacket.HORN));
            }
        }
    }
}
