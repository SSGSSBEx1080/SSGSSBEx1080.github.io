package com.example.zitraksmode.network;

import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.menu.VacuumMenus;
import com.example.zitraksmode.events.VacuumSuctionState;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

/** Sent only when LMB state changes, never every frame. */
public final class VacuumInputPacket {
    private final boolean holding;

    public VacuumInputPacket(boolean holding) {
        this.holding = holding;
    }

    static void encode(VacuumInputPacket packet, FriendlyByteBuf buffer) {
        buffer.writeBoolean(packet.holding);
    }

    static VacuumInputPacket decode(FriendlyByteBuf buffer) {
        return new VacuumInputPacket(buffer.readBoolean());
    }

    static void handle(VacuumInputPacket packet, Supplier<NetworkEvent.Context> supplier) {
        NetworkEvent.Context context = supplier.get();
        context.enqueueWork(() -> {
            if (context.getSender() == null) return;
            boolean validVacuum = context.getSender().getMainHandItem().is(ModItems.VACUUM.get());
            VacuumSuctionState.setHolding(context.getSender().getUUID(), packet.holding && validVacuum);
        });
        context.setPacketHandled(true);
    }
}
