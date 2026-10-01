package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ModEnchantments;
import com.example.zitraksmode.menu.VacuumMenus;
import com.example.zitraksmode.vacuum.VacuumData;
import com.example.zitraksmode.vacuum.VacuumFilterMode;
import com.example.zitraksmode.criteria.VacuumAdvancementHelper;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.FluidTags;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.inventory.AnvilMenu;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.level.block.AnvilBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.AnvilUpdateEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.EntityItemPickupEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.registries.ForgeRegistries;

import java.util.List;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class VacuumServerEvents {
    private static final String PULL_TICKS = "ZitraksVacuumPullTicks";
    private static final int MAX_POWER_ACHIEVEMENT_TICKS = 20 * 60;

    private VacuumServerEvents() {
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || event.player.level.isClientSide) return;
        Player player = event.player;
        if (player.tickCount % 20 == 0) {
            for (ItemStack stack : player.getInventory().items) {
                if (stack.is(ModItems.VACUUM.get())
                        && EnchantmentHelper.getItemEnchantmentLevel(ModEnchantments.AIRUHAN.get(), stack) >= 3) {
                    VacuumAdvancementHelper.grant(player, "26_vacuum/airuhan_3");
                }
            }
        }
        ItemStack vacuum = player.getMainHandItem();

        boolean active = vacuum.is(ModItems.VACUUM.get())
                && VacuumSuctionState.isHolding(player.getUUID());
        if (!active) {
            if (vacuum.is(ModItems.VACUUM.get())) VacuumData.setMaxPowerTicks(vacuum, 0);
            else VacuumSuctionState.clear(player.getUUID());
            return;
        }

        int power = VacuumData.getPower(vacuum);
        int airuhan = EnchantmentHelper.getItemEnchantmentLevel(ModEnchantments.AIRUHAN.get(), vacuum);
        double range = power + airuhan * 5.0D;

        pullMatchingItems(player, vacuum, power, range);
        applyBackExhaust(player, airuhan);
        applySubtleMovementAssist(player);
        if (player.tickCount % 10 == 0 && VacuumData.getMode(vacuum) == VacuumFilterMode.FOOD) {
            harvestFoodCropsInCone(player, range);
        }

        if (power == 10) {
            int ticks = VacuumData.getMaxPowerTicks(vacuum) + 1;
            VacuumData.setMaxPowerTicks(vacuum, ticks);
            if (ticks >= MAX_POWER_ACHIEVEMENT_TICKS) {
                VacuumAdvancementHelper.grant(player, "26_vacuum/max_power_60s");
            }
        } else {
            VacuumData.setMaxPowerTicks(vacuum, 0);
        }

        if (airuhan >= 3) VacuumAdvancementHelper.grant(player, "26_vacuum/airuhan_3");
    }

    private static void pullMatchingItems(Player player, ItemStack vacuum, int power, double range) {
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle().normalize();
        AABB search = player.getBoundingBox().expandTowards(look.scale(range)).inflate(range * 0.55D);

        List<ItemEntity> items = player.level.getEntitiesOfClass(ItemEntity.class, search,
                ItemEntity::isAlive);
        for (ItemEntity entity : items) {
            ItemStack stack = entity.getItem();
            if (!matches(vacuum, stack)) continue;

            Vec3 center = entity.position().add(0.0D, entity.getBbHeight() * 0.5D, 0.0D);
            double distance = center.distanceTo(eye);
            if (!isInsideSuctionCone(eye, look, center, range, power)) continue;

            // Insert before applying another pull. This prevents fast items from
            // overshooting the player and flying behind the nozzle at high power.
            if (distance <= 1.80D) {
                ItemStack remainder = VacuumData.insert(vacuum, stack);
                if (remainder.isEmpty()) {
                    entity.discard();
                    continue;
                }
                entity.setItem(remainder);
            }

            CompoundTag entityTag = entity.getPersistentData();
            int pullTicks = entityTag.getInt(PULL_TICKS) + 1;
            entityTag.putInt(PULL_TICKS, pullTicks);

            // At power 10 the pull begins gently and visibly accelerates, but the
            // speed is capped relative to remaining distance so it cannot cross player.
            double acceleration = 0.015D + power * 0.006D + Math.min(0.34D, pullTicks * 0.006D);
            double safeSpeed = Math.min(acceleration, distance * 0.30D);
            Vec3 velocity = eye.subtract(center).normalize().scale(safeSpeed);
            entity.setDeltaMovement(entity.getDeltaMovement().scale(0.50D).add(velocity));
            entity.hurtMarked = true;
        }
    }

    /** Harvests mature food crops inside the same cone formula that pulls item entities. */
    private static void harvestFoodCropsInCone(Player player, double range) {
        if (!(player.level instanceof ServerLevel level)) return;
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle().normalize();
        int power = VacuumData.getPower(player.getMainHandItem());
        double coneAngle = 0.30D + power * 0.025D;
        int harvested = 0;

        // Trace the entire cone. At each distance the scan radius matches tan(coneAngle),
        // unlike the old thin ray which missed most of a farm.
        for (int distance = 1; distance <= (int) Math.ceil(range); distance++) {
            Vec3 line = eye.add(look.scale(distance));
            int spread = Math.max(1, (int) Math.ceil(distance * Math.tan(coneAngle)));
            for (int dx = -spread; dx <= spread; dx++) {
                for (int dz = -spread; dz <= spread; dz++) {
                    if (dx * dx + dz * dz > spread * spread) continue;
                    // Mature crop blocks are usually 1–2 blocks below eye line; wider
                    // vertical range also works while the player looks down a slope.
                    for (int dy = -3; dy <= 2; dy++) {
                        BlockPos pos = new BlockPos(line.x + dx, line.y + dy, line.z + dz);
                        BlockState state = level.getBlockState(pos);
                        if (!(state.getBlock() instanceof CropBlock crop) || !crop.isMaxAge(state)) continue;

                        Vec3 cropCenter = Vec3.atCenterOf(pos);
                        if (!isInsideSuctionCone(eye, look, cropCenter, range, power)) continue;
                        List<ItemStack> drops = Block.getDrops(state, level, pos, null, player, ItemStack.EMPTY);
                        if (drops.stream().noneMatch(VacuumServerEvents::isFoodLike)) continue;

                        // Leave the plant in place, but force it back to an unripe state.
                        level.setBlock(pos, crop.getStateForAge(0), 3);
                        for (ItemStack drop : drops) {
                            if (drop.isEmpty()) continue;
                            ItemEntity entity = new ItemEntity(level, cropCenter.x, cropCenter.y, cropCenter.z, drop.copy());
                            entity.setPickUpDelay(0);
                            entity.setDeltaMovement(eye.subtract(entity.position()).normalize().scale(0.12D));
                            level.addFreshEntity(entity);
                        }

                        if (++harvested >= 32) return; // prevents a huge farm from stalling one server tick
                    }
                }
            }
        }
    }

    private static boolean isInsideSuctionCone(Vec3 apex, Vec3 look, Vec3 target, double range, int power) {
        Vec3 offset = target.subtract(apex);
        double distance = offset.length();
        if (distance < 0.001D || distance > range) return false;
        double angle = 0.30D + power * 0.025D;
        return look.dot(offset.normalize()) >= Math.cos(angle);
    }

    private static void applyBackExhaust(Player player, int airuhan) {
        Vec3 look = player.getLookAngle().normalize();
        Vec3 back = look.scale(-1.0D);
        double strength = 0.008D * (airuhan + 1); // Airuhan I/II/III = 2x/3x/4x base exhaust.
        AABB behind = player.getBoundingBox().inflate(2.2D);

        for (Entity entity : player.level.getEntities(player, behind, Entity::isAlive)) {
            Vec3 offset = entity.position().subtract(player.position());
            if (offset.lengthSqr() > 0.001D && offset.normalize().dot(back) > 0.35D) {
                entity.setDeltaMovement(entity.getDeltaMovement().add(back.scale(strength)));
                entity.hurtMarked = true;
            }
        }
    }

    private static void applySubtleMovementAssist(Player player) {
        Vec3 motion = player.getDeltaMovement();
        Vec3 flatLook = new Vec3(player.getLookAngle().x, 0.0D, player.getLookAngle().z);
        if (flatLook.lengthSqr() < 0.0001D) return;
        flatLook = flatLook.normalize();
        double signedSpeed = new Vec3(motion.x, 0.0D, motion.z).dot(flatLook);
        if (signedSpeed > 0.01D) player.setDeltaMovement(motion.add(flatLook.scale(0.004D)));
        else if (signedSpeed < -0.01D) player.setDeltaMovement(motion.add(flatLook.scale(0.006D)));
    }

    public static boolean matches(ItemStack vacuum, ItemStack stack) {
        VacuumFilterMode mode = VacuumData.getMode(vacuum);
        return switch (mode) {
            case FOOD -> isFoodLike(stack);
            case BLOCKS -> isSolidNonBlockEntity(stack);
            case ORES -> isOreLike(stack);
            // "Прочее" explicitly excludes every stock filter category.
            case MISC -> !stack.isEdible() && !isSolidNonBlockEntity(stack) && !isOreLike(stack);
            case CUSTOM -> matchesCustomItem(vacuum, stack);
        };
    }

    private static boolean matchesCustomItem(ItemStack vacuum, ItemStack stack) {
        ResourceLocation id = ResourceLocation.tryParse(VacuumData.getCustomItem(vacuum));
        return id != null && stack.getItem() == ForgeRegistries.ITEMS.getValue(id);
    }

    /** Wheat is harvestable food for the vacuum even though vanilla marks it as an ingredient, not edible. */
    private static boolean isFoodLike(ItemStack stack) {
        return stack.isEdible() || stack.is(Items.WHEAT);
    }

    private static boolean isOreLike(ItemStack stack) {
        ResourceLocation id = ForgeRegistries.ITEMS.getKey(stack.getItem());
        if (id == null) return false;
        String path = id.getPath();
        return path.contains("ore") || path.startsWith("raw_")
                || path.contains("coal") || path.contains("diamond") || path.contains("emerald")
                || path.contains("lapis") || path.contains("quartz") || path.contains("amethyst")
                || path.contains("ancient_debris") || path.contains("copper") || path.contains("iron")
                || path.contains("gold") || path.contains("tin") || path.contains("silver")
                || path.contains("lead") || path.contains("nickel") || path.contains("uranium");
    }

    private static boolean isSolidNonBlockEntity(ItemStack stack) {
        if (!(stack.getItem() instanceof BlockItem blockItem)) return false;
        Block block = blockItem.getBlock();
        BlockState state = block.defaultBlockState();
        return !(block instanceof EntityBlock)
                && !(block instanceof AnvilBlock)
                && state.getMaterial().isSolid();
    }

    @SubscribeEvent
    public static void onItemPickup(EntityItemPickupEvent event) {
        Player player = event.getEntity();
        ItemStack vacuum = player.getMainHandItem();
        if (!vacuum.is(ModItems.VACUUM.get())) return;
        if (!VacuumSuctionState.isHolding(player.getUUID())) return;
        if (matches(vacuum, event.getItem().getItem())) event.setCanceled(true);
    }

    @SubscribeEvent
    public static void onLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        VacuumSuctionState.clear(event.getEntity().getUUID());
    }

    @SubscribeEvent
    public static void onAnvil(AnvilUpdateEvent event) {
        // Normal enchanting table/anvil handles Airuhan; this hook merely keeps the class loaded for Forge event discovery.
    }
}
