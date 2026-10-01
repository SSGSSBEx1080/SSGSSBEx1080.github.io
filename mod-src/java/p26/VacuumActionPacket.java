package com.example.zitraksmode.network;

import com.example.zitraksmode.menu.VacuumMenu;
import com.example.zitraksmode.vacuum.VacuumData;
import com.example.zitraksmode.vacuum.VacuumFilterMode;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.network.NetworkEvent;
import net.minecraftforge.registries.ForgeRegistries;

import java.util.function.Supplier;

/** Menu-only configuration packet. Server validates the open menu and custom item ID. */
public final class VacuumActionPacket {
    private final VacuumAction action;
    private final int number;
    private final String text;

    public VacuumActionPacket(VacuumAction action, int number, String text) {
        this.action = action;
        this.number = number;
        this.text = text == null ? "" : text;
    }

    public static VacuumActionPacket simple(VacuumAction action) {
        return new VacuumActionPacket(action, 0, "");
    }

    public static VacuumActionPacket number(VacuumAction action, int number) {
        return new VacuumActionPacket(action, number, "");
    }

    public static VacuumActionPacket text(VacuumAction action, String text) {
        return new VacuumActionPacket(action, 0, text);
    }

    static void encode(VacuumActionPacket packet, FriendlyByteBuf buffer) {
        buffer.writeEnum(packet.action);
        buffer.writeVarInt(packet.number);
        buffer.writeUtf(packet.text, 256);
    }

    static VacuumActionPacket decode(FriendlyByteBuf buffer) {
        return new VacuumActionPacket(
                buffer.readEnum(VacuumAction.class),
                buffer.readVarInt(),
                buffer.readUtf(256)
        );
    }

    static void handle(
            VacuumActionPacket packet,
            Supplier<NetworkEvent.Context> supplier
    ) {
        NetworkEvent.Context context = supplier.get();

        context.enqueueWork(() -> {
            if (context.getSender() == null) {
                return;
            }

            if (packet.action == VacuumAction.SET_POWER
                    && context.getSender()
                    .getMainHandItem()
                    .is(com.example.zitraksmode.ModItems.VACUUM.get())) {
                VacuumData.setPower(
                        context.getSender().getMainHandItem(),
                        packet.number
                );
                return;
            }

            if (!(context.getSender().containerMenu instanceof VacuumMenu menu)) {
                return;
            }

            switch (packet.action) {
                case MODE_ORES -> menu.selectMode(VacuumFilterMode.ORES);
                case MODE_BLOCKS -> menu.selectMode(VacuumFilterMode.BLOCKS);
                case MODE_FOOD -> menu.selectMode(VacuumFilterMode.FOOD);
                case MODE_MISC -> menu.selectMode(VacuumFilterMode.MISC);
                case SET_POWER -> menu.setPower(packet.number);
                case SET_SCROLL_ROW -> menu.setScrollRow(packet.number);

                case TRANSFER_ALL_TO_PLAYER -> {
                    menu.startTransferAllToPlayer();
                }

                case INSTALL_CHEST_UPGRADE -> {
                    menu.installChestUpgrade(context.getSender());
                }

                case CUSTOM_ITEM -> {
                    ResourceLocation id = ResourceLocation.tryParse(packet.text);

                    if (id != null && ForgeRegistries.ITEMS.containsKey(id)) {
                        menu.selectCustomItem(id.toString());
                    }
                }
            }

            menu.broadcastChanges();
        });

        context.setPacketHandled(true);
    }
}