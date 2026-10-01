package com.example.zitraksmode.world.scooter;

import com.example.zitraksmode.ModBlocks;
import com.example.zitraksmode.ModEntities;
import com.example.zitraksmode.entities.ScooterEntity;
import com.example.zitraksmode.util.ScooterSkin;
import com.mojang.logging.LogUtils;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.HorizontalDirectionalBlock;
import net.minecraft.world.level.block.Mirror;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructurePlaceSettings;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureTemplate;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureTemplateManager;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.slf4j.Logger;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Станции — сетка Overworld, ОДИН раз на ячейку (SavedData).
 *
 * ВАЖНО: раньше getCellStationPos делал hasChunkAt(center) и тихо выходил,
 * если центр ячейки (до ~384 блоков от края) не в loaded chunks.
 * Игрок стоял в cell[0,0] у x=31, а центр ~384 — чанк не загружен → станций 0.
 *
 * Теперь: FORCE LOAD чанка центра через getChunk(), heightmap, place, mark.
 *
 * Лог: [ScooterStation]
 * /scooterstation status | place
 */
@Mod.EventBusSubscriber(modid = "zitraksmode", bus = Mod.EventBusSubscriber.Bus.FORGE)
public class ScooterStationSpawner {

    private static final Logger LOGGER = LogUtils.getLogger();
    private static final String LOG = "[ScooterStation]";

    public static final ResourceLocation STATION_STRUCTURE =
            new ResourceLocation("zitraksmode", "scooter_station");

    /** ~500–1000 между станциями */
    private static final int GRID = 768;
    private static final int JITTER = 120;

    /**
     * Взаимоисключающий roll количества самокатов на станции:
     *   P(1) = 15%
     *   P(2) =  6%
     *   P(3) =  2%
     *   P(0) = 77%
     * Сумма «хоть один» = 23%.
     * (Порядок проверки: сначала 3, потом 2, потом 1.)
     */
    private static final float CHANCE_3_SCOOTERS = 0.02F;
    private static final float CHANCE_2_SCOOTERS = 0.06F;
    private static final float CHANCE_1_SCOOTER  = 0.15F;

    private static final int CHECK_INTERVAL = 40;

    private static boolean templateStatusLogged = false;

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;
        if (!(event.player instanceof ServerPlayer player)) return;
        if (player.tickCount % CHECK_INTERVAL != 0) return;
        if (player.level.dimension() != Level.OVERWORLD) return;

        ServerLevel level = (ServerLevel) player.level;
        logTemplateStatusOnce(level);

        BlockPos bp = player.blockPosition();
        int cellX = floorDiv(bp.getX(), GRID);
        int cellZ = floorDiv(bp.getZ(), GRID);

        // 3×3 ячейки вокруг игрока — force-load + place если ещё не marked
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                ensureStation(level, cellX + dx, cellZ + dz);
            }
        }
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) return;
        if (player.level.dimension() != Level.OVERWORLD) return;

        ServerLevel level = (ServerLevel) player.level;
        logTemplateStatusOnce(level);

        BlockPos bp = player.blockPosition();
        int cellX = floorDiv(bp.getX(), GRID);
        int cellZ = floorDiv(bp.getZ(), GRID);
        ScooterStationSavedData data = ScooterStationSavedData.get(level);

        LOGGER.info("{} Login {}: cell=[{},{}] alreadyGenerated={} grid={} pos={} seed={}",
                LOG, player.getGameProfile().getName(), cellX, cellZ,
                data.isGenerated(cellX, cellZ), GRID, bp.toShortString(), level.getSeed());

        // сразу своя + соседи
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                ensureStation(level, cellX + dx, cellZ + dz);
            }
        }
    }

    private static void logTemplateStatusOnce(ServerLevel level) {
        if (templateStatusLogged) return;
        templateStatusLogged = true;

        Optional<StructureTemplate> opt = level.getStructureManager().get(STATION_STRUCTURE);
        if (opt.isPresent() && opt.get().getSize().getX() > 0) {
            StructureTemplate t = opt.get();
            LOGGER.info("{} NBT structure LOADED: {} size={}x{}x{}",
                    LOG, STATION_STRUCTURE, t.getSize().getX(), t.getSize().getY(), t.getSize().getZ());
        } else {
            LOGGER.warn("{} NBT structure MISSING: {} — fallback 6 ports. "
                            + "File must be at data/zitraksmode/structures/scooter_station.nbt",
                    LOG, STATION_STRUCTURE);
        }
    }

    /**
     * Один раз на cell. После markGenerated — навсегда skip.
     */
    private static void ensureStation(ServerLevel level, int cellX, int cellZ) {
        ScooterStationSavedData data = ScooterStationSavedData.get(level);
        if (data.isGenerated(cellX, cellZ)) {
            return;
        }

        // Детерминированная точка в ячейке
        long seed = level.getSeed()
                ^ (((long) cellX) * 341873128712L)
                ^ (((long) cellZ) * 132897987541L);
        RandomSource random = RandomSource.create(seed);
        int centerX = cellX * GRID + GRID / 2 + random.nextInt(JITTER * 2 + 1) - JITTER;
        int centerZ = cellZ * GRID + GRID / 2 + random.nextInt(JITTER * 2 + 1) - JITTER;

        // ===== FORCE LOAD чанка (вот почему раньше станций не было) =====
        ChunkPos chunkPos = new ChunkPos(centerX >> 4, centerZ >> 4);
        LevelChunk chunk;
        try {
            chunk = level.getChunk(chunkPos.x, chunkPos.z); // блокирующая подгрузка/ген
        } catch (Exception e) {
            LOGGER.warn("{} cell[{},{}] chunk load failed at {},{}: {}",
                    LOG, cellX, cellZ, centerX, centerZ, e.toString());
            return; // не mark — попробуем позже
        }

        int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, centerX, centerZ);
        if (y <= level.getMinBuildHeight() + 2) {
            data.markGenerated(cellX, cellZ);
            LOGGER.info("{} SKIP cell[{},{}] y too low (y={}) at {},{} — marked forever",
                    LOG, cellX, cellZ, y, centerX, centerZ);
            return;
        }

        BlockPos ground = new BlockPos(centerX, y - 1, centerZ);
        BlockState below = level.getBlockState(ground);

        if (below.is(Blocks.WATER) || below.is(Blocks.LAVA)
                || below.is(Blocks.ICE) || below.is(Blocks.PACKED_ICE)
                || below.is(Blocks.BLUE_ICE) || !below.isSolidRender(level, ground)) {
            // попробуем сдвинуться по ячейке в поисках суши
            BlockPos alt = findSolidNearby(level, cellX, cellZ, random);
            if (alt == null) {
                data.markGenerated(cellX, cellZ);
                LOGGER.info("{} SKIP cell[{},{}] no solid ground near {},{} block={} — marked forever",
                        LOG, cellX, cellZ, centerX, centerZ, below.getBlock().getDescriptionId());
                return;
            }
            ground = alt;
            centerX = ground.getX();
            centerZ = ground.getZ();
        }

        // мягкая проверка уклона (не жёсткий skip)
        int maxDy = 0;
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                int hy = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, centerX + dx, centerZ + dz);
                maxDy = Math.max(maxDy, Math.abs(hy - (ground.getY() + 1)));
            }
        }
        // если очень круто — чуть сдвинем, но не отменим всю ячейку
        if (maxDy > 4) {
            LOGGER.info("{} cell[{},{}] steep slope maxDy={} at {} — placing anyway",
                    LOG, cellX, cellZ, maxDy, ground.toShortString());
        }

        int scooterCount = rollScooterCount(level.random);
        BuildResult result = buildStation(level, ground, scooterCount, level.random);

        data.markGenerated(cellX, cellZ);

        LOGGER.info("{} PLACED cell[{},{}] ground={} rot={} structure={} ports={} scooters={} chunk=[{},{}] (ONCE forever)",
                LOG, cellX, cellZ, ground.toShortString(), result.rotation,
                result.usedNbt ? "NBT" : "FALLBACK",
                result.portsFound, result.scootersSpawned,
                chunkPos.x, chunkPos.z);
    }

    /**
     * Взаимоисключающий roll:
     * 2% → 3, 6% → 2, 15% → 1, иначе 0.
     */
    private static int rollScooterCount(RandomSource random) {
        float r = random.nextFloat();
        if (r < CHANCE_3_SCOOTERS) {
            return 3;
        }
        r -= CHANCE_3_SCOOTERS;
        if (r < CHANCE_2_SCOOTERS) {
            return 2;
        }
        r -= CHANCE_2_SCOOTERS;
        if (r < CHANCE_1_SCOOTER) {
            return 1;
        }
        return 0;
    }

    /** Поиск суши в ячейке, если primary point в воде. */
    private static BlockPos findSolidNearby(ServerLevel level, int cellX, int cellZ, RandomSource random) {
        for (int attempt = 0; attempt < 12; attempt++) {
            int x = cellX * GRID + 16 + random.nextInt(Math.max(1, GRID - 32));
            int z = cellZ * GRID + 16 + random.nextInt(Math.max(1, GRID - 32));
            level.getChunk(x >> 4, z >> 4);
            int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
            if (y <= level.getMinBuildHeight() + 2) continue;
            BlockPos g = new BlockPos(x, y - 1, z);
            BlockState st = level.getBlockState(g);
            if (st.isSolidRender(level, g) && !st.is(Blocks.WATER) && !st.is(Blocks.LAVA)
                    && !st.is(Blocks.ICE) && !st.is(Blocks.PACKED_ICE)) {
                return g;
            }
        }
        return null;
    }

    private static BuildResult buildStation(ServerLevel level, BlockPos groundCenter,
                                            int scooterCount, RandomSource random) {
        BuildResult result = new BuildResult();
        StructureTemplateManager mgr = level.getStructureManager();
        Optional<StructureTemplate> opt = mgr.get(STATION_STRUCTURE);

        BlockPos placePos = groundCenter.above();
        StructureTemplate template = null;
        Rotation rotation = Rotation.getRandom(random);
        result.rotation = rotation;

        if (opt.isPresent() && opt.get().getSize().getX() > 0) {
            template = opt.get();
            int sx = template.getSize().getX();
            int sy = template.getSize().getY();
            int sz = template.getSize().getZ();

            // Пивот по центру footprint — станция крутится вокруг своей середины
            BlockPos pivot = new BlockPos(sx / 2, 0, sz / 2);
            StructurePlaceSettings settings = new StructurePlaceSettings()
                    .setIgnoreEntities(true)
                    .setMirror(Mirror.NONE)
                    .setRotation(rotation)
                    .setRotationPivot(pivot);

            // origin так, чтобы пивот лёг на groundCenter.above()
            placePos = groundCenter.above().offset(-pivot.getX(), 0, -pivot.getZ());

            // bounding под load: с запасом под любой поворот
            int pad = Math.max(sx, sz);
            forceLoadBox(level,
                    groundCenter.offset(-pad, 0, -pad),
                    groundCenter.offset(pad, sy + 2, pad));

            boolean ok = template.placeInWorld(level, placePos, placePos, settings, random, 3);
            result.usedNbt = true;
            LOGGER.info("{} structure placeInWorld={} origin={} rot={} size={}x{}x{}",
                    LOG, ok, placePos.toShortString(), rotation, sx, sy, sz);
        } else {
            forceLoadBox(level, groundCenter.offset(-4, 0, -4), groundCenter.offset(4, 4, 4));
            placeFallbackPorts(level, groundCenter.above(), rotation);
            result.usedNbt = false;
            LOGGER.warn("{} FALLBACK ports at {} rot={}", LOG, groundCenter.above().toShortString(), rotation);
        }

        // порты ищем вокруг центра (после поворота AABB структуры съезжает)
        List<BlockPos> ports = findPorts(level, groundCenter);
        result.portsFound = ports.size();

        if (scooterCount > 0) {
            result.scootersSpawned = spawnScootersOnPorts(level, groundCenter, ports, scooterCount);
        }
        return result;
    }

    private static void forceLoadBox(ServerLevel level, BlockPos a, BlockPos b) {
        int minCx = Math.min(a.getX(), b.getX()) >> 4;
        int maxCx = Math.max(a.getX(), b.getX()) >> 4;
        int minCz = Math.min(a.getZ(), b.getZ()) >> 4;
        int maxCz = Math.max(a.getZ(), b.getZ()) >> 4;
        for (int cx = minCx; cx <= maxCx; cx++) {
            for (int cz = minCz; cz <= maxCz; cz++) {
                level.getChunk(cx, cz);
            }
        }
    }

    /** Fallback 6 портов, повёрнутых вместе со станцией. */
    private static void placeFallbackPorts(ServerLevel level, BlockPos origin, Rotation rotation) {
        BlockState portBase = ModBlocks.CHARGING_PORT.get().defaultBlockState();
        // локальные оффсеты до поворота (как 2 ряда по 3)
        int[][] local = {
                {-2, 0}, {0, 0}, {2, 0},
                {-2, 3}, {0, 3}, {2, 3}
        };
        Direction baseFace = Direction.SOUTH;
        for (int[] xz : local) {
            BlockPos localPos = new BlockPos(xz[0], 0, xz[1]);
            BlockPos rotated = StructureTemplate.transform(localPos, Mirror.NONE, rotation, BlockPos.ZERO);
            BlockPos p = origin.offset(rotated);
            Direction face = rotation.rotate(baseFace);
            // второй ряд смотрит навстречу
            if (xz[1] > 0) {
                face = face.getOpposite();
            }
            level.setBlock(p, portBase.setValue(HorizontalDirectionalBlock.FACING, face), 3);
            if (level.getBlockState(p.below()).isAir()) {
                level.setBlock(p.below(), Blocks.SMOOTH_STONE.defaultBlockState(), 3);
            }
        }
    }

    /** Ищем порты в радиусе вокруг центра станции (учитывает любой поворот NBT). */
    private static List<BlockPos> findPorts(ServerLevel level, BlockPos groundCenter) {
        List<BlockPos> ports = new ArrayList<>();
        BlockPos min = groundCenter.offset(-10, 0, -10);
        BlockPos max = groundCenter.offset(10, 6, 10);
        for (BlockPos p : BlockPos.betweenClosed(min, max)) {
            if (level.getBlockState(p).is(ModBlocks.CHARGING_PORT.get())) {
                ports.add(p.immutable());
            }
        }
        return ports;
    }

    private static int spawnScootersOnPorts(ServerLevel level, BlockPos groundCenter,
                                            List<BlockPos> ports, int count) {
        if (ports.isEmpty()) {
            for (int i = 0; i < count; i++) {
                spawnOneAt(level,
                        groundCenter.getX() + 0.5 + i * 1.4 - 1.4,
                        groundCenter.getY() + 1.05,
                        groundCenter.getZ() + 0.5,
                        i * 90.0F);
            }
            LOGGER.info("{} scooters at center (no ports): {}", LOG, count);
            return count;
        }

        Collections.shuffle(ports, new java.util.Random(level.random.nextLong()));
        int n = Math.min(count, ports.size());
        for (int i = 0; i < n; i++) {
            spawnScooterAtPort(level, ports.get(i));
        }
        LOGGER.info("{} scooters on ports: {} / available={}", LOG, n, ports.size());
        return n;
    }

    /**
     * Самокат на плоскости у зарядки:
     *  - ноги на верхней грани порта / платформы перед ним
     *  - чуть сдвинут в сторону FACING порта (на деку)
     *  - нос смотрит на порт (удобно «втыкаться» в зарядку)
     */
    private static void spawnScooterAtPort(ServerLevel level, BlockPos port) {
        BlockState st = level.getBlockState(port);
        Direction facing = Direction.NORTH;
        if (st.hasProperty(HorizontalDirectionalBlock.FACING)) {
            facing = st.getValue(HorizontalDirectionalBlock.FACING);
        }

        // На плоскость: верх порта, если полный блок; иначе сам y порта
        double y;
        boolean solidPort = !st.getCollisionShape(level, port).isEmpty();
        if (solidPort && level.getBlockState(port.above()).isAir()) {
            y = port.getY() + 1.0D;
        } else if (solidPort) {
            // над портом занято — встаём спереди на соседний блок платформы
            BlockPos front = port.relative(facing);
            y = front.getY() + (level.getBlockState(front).getCollisionShape(level, front).isEmpty()
                    ? 0.05D : 1.0D);
        } else {
            y = port.getY() + 0.05D;
        }

        // Сдвиг на деку: 0.55 блока по facing (от «стенки» зарядки на плоскость)
        double x = port.getX() + 0.5D + facing.getStepX() * 0.55D;
        double z = port.getZ() + 0.5D + facing.getStepZ() * 0.55D;

        // Нос к порту = смотрим против facing порта (на зарядку)
        float yaw = facing.getOpposite().toYRot();

        spawnOneAt(level, x, y, z, yaw);
    }

    private static void spawnOneAt(ServerLevel level, double x, double y, double z, float yaw) {
        ScooterEntity scooter = ModEntities.SCOOTER.get().create(level);
        if (scooter == null) return;

        scooter.moveTo(x, y, z, yaw, 0.0F);
        scooter.setYRot(yaw);
        scooter.yRotO = yaw;
        scooter.setSkinId(ScooterSkin.random(new java.util.Random(level.random.nextLong())).getId());
        float chargeFrac = 0.50F + level.random.nextFloat() * 0.50F;
        scooter.setCharge(Math.round(ScooterEntity.MAX_CHARGE * chargeFrac));
        scooter.setDurability(ScooterEntity.MAX_DURABILITY);
        level.addFreshEntity(scooter);
    }

    private static int floorDiv(int a, int b) {
        int r = a / b;
        if ((a ^ b) < 0 && r * b != a) r--;
        return r;
    }

    private static final class BuildResult {
        boolean usedNbt;
        int portsFound;
        int scootersSpawned;
        Rotation rotation = Rotation.NONE;
    }

    public static BlockPos debugForcePlaceNear(ServerPlayer player) {
        ServerLevel level = (ServerLevel) player.level;
        BlockPos ground = player.blockPosition().below();
        if (level.getBlockState(ground).isAir()) {
            ground = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, player.blockPosition()).below();
        }
        // дебаг: всегда 2 самоката, чтобы сразу видеть посадку у портов
        BuildResult r = buildStation(level, ground, 2, level.random);
        int cx = floorDiv(player.blockPosition().getX(), GRID);
        int cz = floorDiv(player.blockPosition().getZ(), GRID);
        ScooterStationSavedData.get(level).markGenerated(cx, cz);

        LOGGER.info("{} DEBUG force place near {} at {} rot={} nbt={} ports={} scooters={} marked cell=[{},{}]",
                LOG, player.getGameProfile().getName(), ground.toShortString(),
                r.rotation, r.usedNbt, r.portsFound, r.scootersSpawned, cx, cz);
        return ground.above();
    }

    public static void debugLogStatus(ServerPlayer player) {
        ServerLevel level = (ServerLevel) player.level;
        logTemplateStatusOnce(level);
        BlockPos bp = player.blockPosition();
        int cx = floorDiv(bp.getX(), GRID);
        int cz = floorDiv(bp.getZ(), GRID);
        ScooterStationSavedData data = ScooterStationSavedData.get(level);
        Optional<StructureTemplate> opt = level.getStructureManager().get(STATION_STRUCTURE);
        boolean nbt = opt.isPresent() && opt.get().getSize().getX() > 0;

        // где должна быть станция этой ячейки
        long seed = level.getSeed() ^ (((long) cx) * 341873128712L) ^ (((long) cz) * 132897987541L);
        RandomSource random = RandomSource.create(seed);
        int tx = cx * GRID + GRID / 2 + random.nextInt(JITTER * 2 + 1) - JITTER;
        int tz = cz * GRID + GRID / 2 + random.nextInt(JITTER * 2 + 1) - JITTER;

        String msg = LOG + " cell=[" + cx + "," + cz + "] generated=" + data.isGenerated(cx, cz)
                + " nbt=" + nbt + " grid=" + GRID
                + " you=" + bp.toShortString()
                + " stationShouldBe~=" + tx + ",?" + "," + tz;
        player.displayClientMessage(net.minecraft.network.chat.Component.literal(msg), false);
        LOGGER.info("{} STATUS {}", LOG, msg);
    }
}
