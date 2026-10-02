package com.example.zitraksmode.events;

import com.example.zitraksmode.ModEntities;
import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.entities.AntonChigurEntity;
import com.mojang.logging.LogUtils;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.AABB;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.jetbrains.annotations.Nullable;
import org.slf4j.Logger;

import java.util.List;
import java.util.UUID;

@Mod.EventBusSubscriber(
        modid = ZitraksMode.MODID,
        bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class ChigurSpawnHandler {

    private static final Logger LOGGER =
            LogUtils.getLogger();

    private static final String LAST_ROLLED_NIGHT_KEY =
            "ChigurLastRolledNight";

    private static final String CHANCE_PERCENT_KEY =
            "ChigurNightChancePercent";

    /*
     * Сохраняем владельца именно заспавненного Чигура.
     * Благодаря этому Чигур одного игрока не блокирует другого.
     */
    private static final String SPAWN_OWNER_KEY =
            "ChigurSpawnOwner";

    /*
     * Новые шансы:
     *
     * Первая ночь: 20%.
     * Каждая неудача: +10%.
     * Максимум: 100%.
     */
    private static final int INITIAL_NIGHT_CHANCE =
            20;

    private static final int FAILED_NIGHT_INCREMENT =
            10;

    private static final int MAX_NIGHT_CHANCE =
            100;

    /*
     * Чигур появляется не дальше 20 блоков.
     */
    private static final double MIN_SPAWN_DISTANCE =
            12.0D;

    private static final double MAX_SPAWN_DISTANCE =
            20.0D;

    /*
     * Проверяем уже существующего личного Чигура
     * в пределах 64 блоков от игрока.
     */
    private static final double EXISTING_CHIGUR_RADIUS =
            64.0D;

    private static final int NIGHT_START =
            13_000;

    private static final int NIGHT_END =
            23_000;

    private ChigurSpawnHandler() {
    }

    @SubscribeEvent
    public static void onPlayerTick(
            TickEvent.PlayerTickEvent event
    ) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }

        if (!(event.player instanceof ServerPlayer player)) {
            return;
        }

        if (!(player.level instanceof ServerLevel level)) {
            return;
        }

        /*
         * Проверка раз в секунду вместо каждого тика.
         */
        if (player.tickCount % 20 != 0) {
            return;
        }

        long dayTime =
                level.getDayTime();

        long timeOfDay =
                dayTime % 24_000L;

        long currentNight =
                dayTime / 24_000L;

        if (timeOfDay < NIGHT_START
                || timeOfDay > NIGHT_END) {
            return;
        }

        CompoundTag playerData =
                player.getPersistentData();

        /*
         * У каждого игрока свой LAST_ROLLED_NIGHT.
         */
        if (playerData.contains(LAST_ROLLED_NIGHT_KEY)
                && playerData.getLong(
                        LAST_ROLLED_NIGHT_KEY
                ) == currentNight) {

            LOGGER.debug(
                    "[ChigurSpawn] Player {} already processed "
                            + "for night {}",
                    player.getName().getString(),
                    currentNight
            );

            return;
        }

        /*
         * Проверяем только личного Чигура этого игрока.
         * Чигуры других игроков не учитываются.
         */
        List<AntonChigurEntity> personalChigurs =
                level.getEntitiesOfClass(
                        AntonChigurEntity.class,
                        player.getBoundingBox().inflate(
                                EXISTING_CHIGUR_RADIUS
                        ),
                        chigur ->
                                chigur.isAlive()
                                        && isOwnedBy(
                                                chigur,
                                                player
                                        )
                );

        if (!personalChigurs.isEmpty()) {
            playerData.putLong(
                    LAST_ROLLED_NIGHT_KEY,
                    currentNight
            );

            LOGGER.info(
                    "[ChigurSpawn] Spawn skipped for {}: "
                            + "personal Chigur already exists. Count={}",
                    player.getName().getString(),
                    personalChigurs.size()
            );

            for (AntonChigurEntity chigur : personalChigurs) {
                LOGGER.info(
                        "[ChigurSpawn] Personal Chigur: "
                                + "uuid={}, position={}, distance={}",
                        chigur.getUUID(),
                        chigur.blockPosition(),
                        Math.sqrt(
                                chigur.distanceToSqr(player)
                        )
                );
            }

            return;
        }

        /*
         * Получаем личный шанс игрока.
         */
        int storedChance =
                playerData.contains(CHANCE_PERCENT_KEY)
                        ? playerData.getInt(
                                CHANCE_PERCENT_KEY
                        )
                        : INITIAL_NIGHT_CHANCE;

        /*
         * Миграция старых сохранённых шансов.
         *
         * Старые значения вроде 10, 15, 20
         * превращаются примерно в 20, 30, 40.
         */
        int chance;

        if (storedChance <= 0) {
            chance =
                    INITIAL_NIGHT_CHANCE;
        } else {
            chance =
                    Math.min(
                            MAX_NIGHT_CHANCE,
                            Math.max(
                                    INITIAL_NIGHT_CHANCE,
                                    storedChance * 2
                            )
                    );
        }

        playerData.putLong(
                LAST_ROLLED_NIGHT_KEY,
                currentNight
        );

        playerData.putInt(
                CHANCE_PERCENT_KEY,
                chance
        );

        LOGGER.info(
                "[ChigurSpawn] Night attempt: "
                        + "player={}, night={}, chance={}%, "
                        + "time={}, position={}",
                player.getName().getString(),
                currentNight,
                chance,
                timeOfDay,
                player.blockPosition()
        );

        int roll =
                player.getRandom().nextInt(100);

        LOGGER.info(
                "[ChigurSpawn] Roll for {}: {}. "
                        + "Success when roll < {}",
                player.getName().getString(),
                roll,
                chance
        );

        if (roll >= chance) {
            int nextChance =
                    Math.min(
                            MAX_NIGHT_CHANCE,
                            chance + FAILED_NIGHT_INCREMENT
                    );

            playerData.putInt(
                    CHANCE_PERCENT_KEY,
                    nextChance
            );

            LOGGER.info(
                    "[ChigurSpawn] Roll failed for {}. "
                            + "Next chance={}%",
                    player.getName().getString(),
                    nextChance
            );

            return;
        }

        LOGGER.info(
                "[ChigurSpawn] Roll succeeded for {}. "
                        + "Finding position within {} blocks...",
                player.getName().getString(),
                MAX_SPAWN_DISTANCE
        );

        double angle =
                player.getRandom().nextDouble()
                        * Math.PI
                        * 2.0D;

        double distance =
                MIN_SPAWN_DISTANCE
                        + player.getRandom().nextDouble()
                        * (
                                MAX_SPAWN_DISTANCE
                                        - MIN_SPAWN_DISTANCE
                        );

        int requestedX =
                Mth.floor(
                        player.getX()
                                + Math.cos(angle)
                                * distance
                );

        int requestedZ =
                Mth.floor(
                        player.getZ()
                                + Math.sin(angle)
                                * distance
                );

        BlockPos requestedPos =
                new BlockPos(
                        requestedX,
                        0,
                        requestedZ
                );

        BlockPos spawnPos =
                level.getHeightmapPos(
                        Heightmap.Types.MOTION_BLOCKING_NO_LEAVES,
                        requestedPos
                );

        LOGGER.info(
                "[ChigurSpawn] Requested position={}, "
                        + "distance={}, heightmap position={}",
                requestedPos,
                distance,
                spawnPos
        );

        BlockState feetState =
                level.getBlockState(
                        spawnPos
                );

        BlockState headState =
                level.getBlockState(
                        spawnPos.above()
                );

        LOGGER.info(
                "[ChigurSpawn] Spawn blocks: feet={}, head={}",
                feetState,
                headState
        );

        AntonChigurEntity chigur =
                ModEntities.ANTON_CHIGUR
                        .get()
                        .create(level);

        if (chigur == null) {
            LOGGER.error(
                    "[ChigurSpawn] Failed: "
                            + "ANTON_CHIGUR.create(level) returned null"
            );

            return;
        }

        chigur.moveTo(
                spawnPos.getX() + 0.5D,
                spawnPos.getY(),
                spawnPos.getZ() + 0.5D,
                player.getYRot(),
                0.0F
        );

        boolean noCollision =
                level.noCollision(
                        chigur,
                        chigur.getBoundingBox()
                );

        LOGGER.info(
                "[ChigurSpawn] Created entity: "
                        + "uuid={}, position={}, noCollision={}",
                chigur.getUUID(),
                chigur.position(),
                noCollision
        );

        if (!noCollision) {
            LOGGER.warn(
                    "[ChigurSpawn] Original spawn position "
                            + "has collision. Searching alternative..."
            );

            BlockPos alternative =
                    findAlternativeSpawnPosition(
                            level,
                            spawnPos
                    );

            if (alternative == null) {
                LOGGER.error(
                        "[ChigurSpawn] Failed: no free position "
                                + "near {}",
                        spawnPos
                );

                return;
            }

            spawnPos =
                    alternative;

            chigur.moveTo(
                    spawnPos.getX() + 0.5D,
                    spawnPos.getY(),
                    spawnPos.getZ() + 0.5D,
                    player.getYRot(),
                    0.0F
            );

            LOGGER.info(
                    "[ChigurSpawn] Alternative position: {}",
                    spawnPos
            );
        }

        /*
         * Записываем личного владельца Чигура.
         */
        chigur.getPersistentData().putUUID(
                SPAWN_OWNER_KEY,
                player.getUUID()
        );

        boolean added =
                level.addFreshEntity(
                        chigur
                );

        LOGGER.info(
                "[ChigurSpawn] addFreshEntity: "
                        + "result={}, uuid={}, position={}, "
                        + "alive={}, removed={}, owner={}",
                added,
                chigur.getUUID(),
                chigur.blockPosition(),
                chigur.isAlive(),
                chigur.isRemoved(),
                player.getUUID()
        );

        if (!added) {
            LOGGER.error(
                    "[ChigurSpawn] Failed: addFreshEntity returned false"
            );

            return;
        }

        /*
         * После успешного спавна личный шанс сбрасывается на 20%.
         */
        playerData.putInt(
                CHANCE_PERCENT_KEY,
                INITIAL_NIGHT_CHANCE
        );

        LOGGER.info(
                "[ChigurSpawn] SUCCESS: personal Chigur spawned "
                        + "for player={} at {}. "
                        + "Next chance={}%",
                player.getName().getString(),
                chigur.blockPosition(),
                INITIAL_NIGHT_CHANCE
        );
    }

    private static boolean isOwnedBy(
            AntonChigurEntity chigur,
            ServerPlayer player
    ) {
        CompoundTag data =
                chigur.getPersistentData();

        /*
         * Старые Чигуры без владельца не блокируют
         * спавн новых личных Чигуров.
         */
        if (!data.hasUUID(SPAWN_OWNER_KEY)) {
            return false;
        }

        return data.getUUID(
                SPAWN_OWNER_KEY
        ).equals(
                player.getUUID()
        );
    }

    @Nullable
    private static BlockPos findAlternativeSpawnPosition(
            ServerLevel level,
            BlockPos original
    ) {
        for (int dx = -4; dx <= 4; dx++) {
            for (int dz = -4; dz <= 4; dz++) {
                if (dx == 0 && dz == 0) {
                    continue;
                }

                BlockPos requested =
                        new BlockPos(
                                original.getX() + dx,
                                0,
                                original.getZ() + dz
                        );

                BlockPos candidate =
                        level.getHeightmapPos(
                                Heightmap.Types.MOTION_BLOCKING_NO_LEAVES,
                                requested
                        );

                BlockState feet =
                        level.getBlockState(
                                candidate
                        );

                BlockState head =
                        level.getBlockState(
                                candidate.above()
                        );

                if (!feet.getFluidState().isEmpty()
                        || !head.getFluidState().isEmpty()) {
                    continue;
                }

                AABB box =
                        new AABB(
                                candidate.getX() + 0.2D,
                                candidate.getY(),
                                candidate.getZ() + 0.2D,
                                candidate.getX() + 0.8D,
                                candidate.getY() + 2.0D,
                                candidate.getZ() + 0.8D
                        );

                if (level.noCollision(box)) {
                    return candidate;
                }
            }
        }

        return null;
    }
}