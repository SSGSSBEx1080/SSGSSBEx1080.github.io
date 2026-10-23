package com.example.zitraksmode.network;

import com.example.zitraksmode.items.MedusaItem;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

/** Saves the two LMB-screen sliders onto the Medusa stack in the player's hand. */
public record MedusaSettingsPacket(int radius, int delayTicks) {
    static void encode(MedusaSettingsPacket packet, FriendlyByteBuf buffer) {
        buffer.writeVarInt(packet.radius);
        buffer.writeVarInt(packet.delayTicks);
    }

    static MedusaSettingsPacket decode(FriendlyByteBuf buffer) {
        return new MedusaSettingsPacket(buffer.readVarInt(), buffer.readVarInt());
    }

    static void handle(MedusaSettingsPacket packet, Supplier<NetworkEvent.Context> contextSupplier) {
        NetworkEvent.Context context = contextSupplier.get();
        context.enqueueWork(() -> {
            if (context.getSender() == null) return;

            ItemStack mainHand = context.getSender().getMainHandItem();
            ItemStack offHand = context.getSender().getOffhandItem();
            if (mainHand.getItem() instanceof MedusaItem) {
                MedusaItem.setSettings(mainHand, packet.radius, packet.delayTicks);
            } else if (offHand.getItem() instanceof MedusaItem) {
                MedusaItem.setSettings(offHand, packet.radius, packet.delayTicks);
            }
        });
        context.setPacketHandled(true);
    }
}
