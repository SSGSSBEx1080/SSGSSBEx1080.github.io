package com.example.zitraksmode.network;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.simple.SimpleChannel;

public final class VacuumNetwork {
    private static final String PROTOCOL = "1";
    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
            new ResourceLocation(ZitraksMode.MODID, "vacuum"),
            () -> PROTOCOL, PROTOCOL::equals, PROTOCOL::equals);
    private static int id;
    private static boolean registered;

    private VacuumNetwork() {
    }

    public static void register() {
        if (registered) return;
        registered = true;
        CHANNEL.messageBuilder(VacuumActionPacket.class, id++)
                .encoder(VacuumActionPacket::encode)
                .decoder(VacuumActionPacket::decode)
                .consumerMainThread(VacuumActionPacket::handle)
                .add();
        CHANNEL.messageBuilder(VacuumInputPacket.class, id++)
                .encoder(VacuumInputPacket::encode)
                .decoder(VacuumInputPacket::decode)
                .consumerMainThread(VacuumInputPacket::handle)
                .add();
    }
}
