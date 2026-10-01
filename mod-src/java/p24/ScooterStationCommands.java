package com.example.zitraksmode.world.scooter;

import com.mojang.brigadier.CommandDispatcher;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * Команды для проверки станций (op / singleplayer cheats).
 *
 * /scooterstation status  — NBT загружен? эта ячейка уже gen?
 * /scooterstation place   — форс-поставить станцию под ногами (+ самокаты), лог в console
 *
 * В latest.log ищи: [ScooterStation]
 */
@Mod.EventBusSubscriber(modid = "zitraksmode", bus = Mod.EventBusSubscriber.Bus.FORGE)
public class ScooterStationCommands {

    @SubscribeEvent
    public static void onRegisterCommands(RegisterCommandsEvent event) {
        CommandDispatcher<CommandSourceStack> d = event.getDispatcher();

        d.register(Commands.literal("scooterstation")
                .requires(src -> src.hasPermission(2))
                .then(Commands.literal("status")
                        .executes(ctx -> {
                            ServerPlayer p = ctx.getSource().getPlayerOrException();
                            ScooterStationSpawner.debugLogStatus(p);
                            ctx.getSource().sendSuccess(
                                    Component.literal("Смотри также latest.log → [ScooterStation]"), true);
                            return 1;
                        }))
                .then(Commands.literal("place")
                        .executes(ctx -> {
                            ServerPlayer p = ctx.getSource().getPlayerOrException();
                            BlockPos at = ScooterStationSpawner.debugForcePlaceNear(p);
                            ctx.getSource().sendSuccess(
                                    Component.literal("Станция поставлена около " + at.toShortString()
                                            + " (см. лог [ScooterStation])"), true);
                            return 1;
                        }))
        );
    }
}
