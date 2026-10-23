package com.example.zitraksmode.network;

import com.example.zitraksmode.caps.SandevistanCapability;
import com.example.zitraksmode.items.SandevistanItem;
import com.example.zitraksmode.events.SandevistanEventHandler;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.network.NetworkEvent;
import java.util.function.Supplier;
import com.example.zitraksmode.ModSounds;
import net.minecraft.sounds.SoundSource;

public class SandevistanTogglePacket {
    public SandevistanTogglePacket() {}
    public SandevistanTogglePacket(FriendlyByteBuf buf) {}
    public void toBytes(FriendlyByteBuf buf) {}

    public void handle(Supplier<NetworkEvent.Context> supplier) {
        NetworkEvent.Context context = supplier.get();
        context.enqueueWork(() -> {
            ServerPlayer player = context.getSender();
            if (player != null) {
                ItemStack chestplate = player.getItemBySlot(EquipmentSlot.CHEST);
                if (chestplate.getItem() instanceof SandevistanItem) {
                    SandevistanCapability.get(player).ifPresent(cap -> {
                        boolean wasAccelerating = cap.isAccelerating();
                        cap.toggleAcceleration(player);
                        boolean isAccelerating = cap.isAccelerating();

                        // Идеальная защита от спама: звук играет ТОЛЬКО если имплант реально включился или выключился
                        if (wasAccelerating != isAccelerating) {
                            if (isAccelerating) {
                                player.level.playSound(null, player.getX(), player.getY(), player.getZ(), ModSounds.SANDEVISTAN_ACTIVATE.get(), SoundSource.PLAYERS, 1.0F, 1.0F);
                                SandevistanEventHandler.grantAdvancement(player, "29_sandevistan/03_activated");
                            } else {
                                player.level.playSound(null, player.getX(), player.getY(), player.getZ(), ModSounds.SANDEVISTAN_DEACTIVATE.get(), SoundSource.PLAYERS, 1.0F, 1.0F);
                            }
                        }
                    });
                }
            }
        });
        supplier.get().setPacketHandled(true);
    }
}
