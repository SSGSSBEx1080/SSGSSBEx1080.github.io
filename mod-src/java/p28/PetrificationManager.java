package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.items.MedusaItem;
import com.example.zitraksmode.mixin.ZombieVillagerInvokerMixin;
import com.example.zitraksmode.network.MedusaNetwork;
import com.example.zitraksmode.network.MedusaWavePacket;
import com.example.zitraksmode.network.PetrificationStatePacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MoverType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.ZombieVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.PickaxeItem;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.TieredItem;
import net.minecraft.world.item.Tiers;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.EntityTeleportEvent;
import net.minecraftforge.event.entity.living.LivingAttackEvent;
import net.minecraftforge.event.entity.living.LivingEvent;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.event.entity.living.LivingKnockBackEvent;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.level.BlockEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.network.PacketDistributor;

import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class PetrificationManager {
    private static final int PLAYER_BASE_DURATION_TICKS = 20 * 45;
    private static final int PLAYER_MIN_DURATION_TICKS = 20 * 8;
    private static final int MOB_BASE_DURATION_TICKS = 20 * 60;
    private static final int MOB_MIN_DURATION_TICKS = 20 * 15;

    private static final Map<UUID, PetrifiedState> PETRIFIED = new HashMap<>();
    private static final List<PetrificationWave> ACTIVE_WAVES = new ArrayList<>();

    private PetrificationManager() {
    }

    public static void petrifySphere(ServerLevel level, Vec3 center, int radius) {
        petrifySphere(level, center, radius, null);
    }

    public static void petrifySphere(
            ServerLevel level,
            Vec3 center,
            int radius,
            @Nullable ServerPlayer activator
    ) {
        int safeRadius = Math.max(1, radius);
        ACTIVE_WAVES.add(new PetrificationWave(
                level,
                center,
                safeRadius,
                level.getGameTime(),
                activator == null ? null : activator.getUUID()
        ));

        MedusaNetwork.CHANNEL.send(
                PacketDistributor.NEAR.with(() -> new PacketDistributor.TargetPoint(
                        center.x,
                        center.y,
                        center.z,
                        safeRadius + 64.0D,
                        level.dimension()
                )),
                new MedusaWavePacket(
                        center.x,
                        center.y,
                        center.z,
                        safeRadius
                )
        );

        if (activator != null) {
            MedusaAdvancementHelper.award(activator, MedusaAdvancementHelper.GREEN_WAVE);
            if (safeRadius > MedusaItem.MAX_RADIUS) {
                MedusaAdvancementHelper.award(activator, MedusaAdvancementHelper.SCIENCE_RADIUS);
            }
            if (safeRadius >= MedusaItem.SCIENCE_POWER_IV_RADIUS) {
                MedusaAdvancementHelper.award(activator, MedusaAdvancementHelper.LIMIT_512);
            }
        }

        level.playSound(
                null,
                center.x,
                center.y,
                center.z,
                SoundEvents.RESPAWN_ANCHOR_DEPLETE,
                SoundSource.PLAYERS,
                1.2F,
                0.65F
        );
    }

    @SubscribeEvent
    public static void tickPetrificationWaves(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || ACTIVE_WAVES.isEmpty()) {
            return;
        }

        Iterator<PetrificationWave> iterator = ACTIVE_WAVES.iterator();
        while (iterator.hasNext()) {
            if (iterator.next().advanceWave()) {
                iterator.remove();
            }
        }
    }

    private static void petrify(
            LivingEntity entity,
            int durationTicks,
            @Nullable UUID curePlayerUuid
    ) {
        long endAt = entity.level.getGameTime() + durationTicks;
        PetrifiedState old = PETRIFIED.get(entity.getUUID());

        if (old != null) {
            old.endAt = Math.max(old.endAt, endAt);
            sync(entity, (int) (old.endAt - entity.level.getGameTime()));
            return;
        }

        boolean originalNoAi = entity instanceof Mob mob && mob.isNoAi();
        boolean originalNoGravity = entity.isNoGravity();
        List<MobEffectInstance> suspendedEffects = new ArrayList<>();

        for (MobEffectInstance effect : entity.getActiveEffects()) {
            if (effect.getEffect().getCategory() != MobEffectCategory.HARMFUL) {
                suspendedEffects.add(copyEffect(effect));
            }
        }

        removeAllEffects(entity);

        PetrifiedState state = new PetrifiedState(
                endAt,
                originalNoAi,
                originalNoGravity,
                entity.getX(),
                entity.getZ(),
                entity.getYRot(),
                entity.getXRot(),
                entity.getDeltaMovement().y,
                suspendedEffects,
                curePlayerUuid
        );

        PETRIFIED.put(entity.getUUID(), state);

        if (entity instanceof Mob mob) {
            mob.setNoAi(true);
            mob.getNavigation().stop();
        }

        entity.setDeltaMovement(Vec3.ZERO);
        sync(entity, durationTicks);
    }

    private static int getDurationTicks(LivingEntity entity) {
        if (entity instanceof Player player) {
            double armor = player.getAttributeValue(Attributes.ARMOR);
            double toughness = player.getAttributeValue(Attributes.ARMOR_TOUGHNESS);
            double xpReduction = Math.min(0.70D, player.experienceLevel * 0.0125D);
            double armorReduction = Math.min(0.30D, armor * 0.009D + toughness * 0.006D);
            double reduction = Math.min(0.80D, xpReduction + armorReduction);
            int duration = (int) Math.round(PLAYER_BASE_DURATION_TICKS * (1.0D - reduction));
            return Math.max(PLAYER_MIN_DURATION_TICKS, duration);
        }

        int healthReductionSeconds = (int) Math.floor(entity.getMaxHealth() / 20.0F);
        return Math.max(
                MOB_MIN_DURATION_TICKS,
                MOB_BASE_DURATION_TICKS - healthReductionSeconds * 20
        );
    }

    @SubscribeEvent
    public static void tickPetrified(LivingEvent.LivingTickEvent event) {
        LivingEntity entity = event.getEntity();
        if (entity.level.isClientSide) {
            return;
        }

        PetrifiedState state = PETRIFIED.get(entity.getUUID());
        if (state == null) {
            return;
        }

        if (!entity.isAlive() || entity.level.getGameTime() >= state.endAt) {
            release(entity, state);
            return;
        }

        // Эффекты не работают во время окаменения.
        removeAllEffects(entity);

        entity.clearFire();
        entity.setTicksFrozen(0);
        entity.setAirSupply(entity.getMaxAirSupply());
        entity.stopUsingItem();
        entity.setNoGravity(false);
        applyStoneGravity(entity, state);
        entity.setYRot(state.lockedYRot);
        entity.setXRot(state.lockedXRot);
        entity.hurtMarked = true;

        if (entity.level.getGameTime() % 20L == 0L) {
            entity.heal((float) (entity.getMaxHealth() * 0.15D));
        }

        if (entity instanceof Mob mob) {
            mob.setNoAi(true);
            mob.getNavigation().stop();
        }
    }

    private static void applyStoneGravity(LivingEntity entity, PetrifiedState state) {
        double verticalSpeed;
        if (entity.isInWater()) {
            verticalSpeed = -0.42D;
        } else {
            verticalSpeed = Math.max(-0.80D, state.verticalVelocity - 0.08D);
        }

        entity.setDeltaMovement(Vec3.ZERO);
        entity.move(MoverType.SELF, new Vec3(0.0D, verticalSpeed, 0.0D));
        state.verticalVelocity = entity.isOnGround() ? 0.0D : verticalSpeed;
        entity.setDeltaMovement(Vec3.ZERO);
    }

    @SubscribeEvent
    public static void lockPetrifiedPlayers(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || !(event.player instanceof ServerPlayer player)) {
            return;
        }

        PetrifiedState state = PETRIFIED.get(player.getUUID());
        if (state == null || player.level.getGameTime() >= state.endAt) {
            return;
        }

        double dx = player.getX() - state.lockedX;
        double dz = player.getZ() - state.lockedZ;
        if (dx * dx + dz * dz > 0.0001D) {
            player.connection.teleport(
                    state.lockedX,
                    player.getY(),
                    state.lockedZ,
                    state.lockedYRot,
                    state.lockedXRot
            );
        }

        player.setYRot(state.lockedYRot);
        player.setXRot(state.lockedXRot);
        player.stopUsingItem();
        Vec3 motion = player.getDeltaMovement();
        player.setDeltaMovement(0.0D, motion.y, 0.0D);
    }

    @SubscribeEvent
    public static void preventPetrifiedAttack(LivingAttackEvent event) {
        if (event.getSource().getEntity() instanceof LivingEntity attacker
                && isPetrified(attacker)) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void modifyPetrifiedDamage(LivingHurtEvent event) {
        LivingEntity victim = event.getEntity();
        if (!isPetrified(victim)) {
            return;
        }

        DamageSource source = event.getSource();
        if (source == DamageSource.IN_FIRE
                || source == DamageSource.ON_FIRE
                || source == DamageSource.LAVA
                || source == DamageSource.HOT_FLOOR
                || source == DamageSource.DROWN
                || source == DamageSource.FREEZE
                || source == DamageSource.STARVE) {
            event.setCanceled(true);
            return;
        }

        if (source.getEntity() instanceof Player attacker) {
            ItemStack tool = attacker.getMainHandItem();
            if (tool.getItem() instanceof PickaxeItem
                    && tool.getItem() instanceof TieredItem tiered) {
                event.setAmount(event.getAmount() * pickaxeMultiplier(tiered.getTier()));
            } else {
                event.setAmount(event.getAmount() * 0.15F);
            }
        } else {
            event.setAmount(event.getAmount() * 0.15F);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedKnockback(LivingKnockBackEvent event) {
        if (isPetrified(event.getEntity())) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedTeleport(EntityTeleportEvent.EnderEntity event) {
        if (event.getEntity() instanceof LivingEntity living && isPetrified(living)) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedJump(LivingEvent.LivingJumpEvent event) {
        LivingEntity entity = event.getEntity();
        if (!isPetrified(entity)) {
            return;
        }

        Vec3 motion = entity.getDeltaMovement();
        if (motion.y > 0.0D) {
            entity.setDeltaMovement(Vec3.ZERO);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedPlayerInteract(PlayerInteractEvent event) {
        if (isPetrified(event.getEntity())) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedPlayerAttack(AttackEntityEvent event) {
        if (isPetrified(event.getEntity())) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedTargetInteract(PlayerInteractEvent.EntityInteract event) {
        if (event.getTarget() instanceof LivingEntity target && isPetrified(target)) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void preventPetrifiedBlockBreak(BlockEvent.BreakEvent event) {
        if (isPetrified(event.getPlayer())) {
            event.setCanceled(true);
        }
    }

    public static boolean isPetrified(LivingEntity entity) {
        return PETRIFIED.containsKey(entity.getUUID());
    }

    private static float pickaxeMultiplier(Tier tier) {
        if (tier == Tiers.NETHERITE) return 14.0F;
        if (tier == Tiers.DIAMOND) return 10.0F;
        if (tier == Tiers.IRON) return 6.0F;
        if (tier == Tiers.STONE) return 4.0F;
        return 2.5F;
    }

    private static MobEffectInstance copyEffect(MobEffectInstance original) {
        return new MobEffectInstance(
                original.getEffect(),
                original.getDuration(),
                original.getAmplifier(),
                original.isAmbient(),
                original.isVisible(),
                original.showIcon()
        );
    }

    private static void removeAllEffects(LivingEntity entity) {
        List<MobEffectInstance> effects = new ArrayList<>(entity.getActiveEffects());
        for (MobEffectInstance effect : effects) {
            entity.removeEffect(effect.getEffect());
        }
    }

    private static void release(LivingEntity entity, PetrifiedState state) {
        PETRIFIED.remove(entity.getUUID());

        if (entity instanceof Mob mob) {
            mob.setNoAi(state.originalNoAi);
            mob.getNavigation().stop();
        }

        entity.setNoGravity(state.originalNoGravity);
        removeAllEffects(entity);

        // Возвращаем только позитивные эффекты с замороженным таймером.
        for (MobEffectInstance effect : state.suspendedBeneficialEffects) {
            entity.addEffect(copyEffect(effect));
        }

        // Лечим зомби-жителя через invoker, потому что метод private в 1.19.2.
        if (entity instanceof ZombieVillager zombieVillager
                && !zombieVillager.isConverting()) {
            ((ZombieVillagerInvokerMixin) (Object) zombieVillager)
                    .zitraksmode$startConverting(
                            state.curePlayerUuid,
                            0
                    );
        }

        sync(entity, 0);
    }

    private static void sync(LivingEntity entity, int remainingTicks) {
        MedusaNetwork.CHANNEL.send(
                PacketDistributor.TRACKING_ENTITY_AND_SELF.with(() -> entity),
                new PetrificationStatePacket(entity.getId(), remainingTicks)
        );
    }

    private static final class PetrificationWave {
        private final ServerLevel level;
        private final Vec3 center;
        private final int radius;
        private final long startedAt;

        @Nullable
        private final UUID curePlayerUuid;

        private final List<LivingEntity> candidates;
        private final Set<UUID> affectedEntities = new HashSet<>();

        private PetrificationWave(
                ServerLevel level,
                Vec3 center,
                int radius,
                long startedAt,
                @Nullable UUID curePlayerUuid
        ) {
            this.level = level;
            this.center = center;
            this.radius = radius;
            this.startedAt = startedAt;
            this.curePlayerUuid = curePlayerUuid;

            AABB maximumArea = new AABB(center, center).inflate(radius);
            this.candidates = level.getEntitiesOfClass(
                    LivingEntity.class,
                    maximumArea,
                    LivingEntity::isAlive
            );
        }

        private boolean advanceWave() {
            long elapsedTicks = level.getGameTime() - startedAt + 1L;
            double currentRadius = Math.min(
                    radius,
                    elapsedTicks * MedusaItem.PETRIFICATION_WAVE_BLOCKS_PER_TICK
            );

            petrifyEntitiesReachedBy(currentRadius);
            return currentRadius >= radius;
        }

        private void petrifyEntitiesReachedBy(double currentRadius) {
            double radiusSquared = currentRadius * currentRadius;

            for (LivingEntity entity : candidates) {
                if (!entity.isAlive() || !isInsideWave(entity, radiusSquared)) {
                    continue;
                }

                if (affectedEntities.add(entity.getUUID())) {
                    petrify(entity, getDurationTicks(entity), curePlayerUuid);
                }
            }
        }

        private boolean isInsideWave(LivingEntity entity, double radiusSquared) {
            Vec3 bodyCenter = entity.position().add(
                    0.0D,
                    entity.getBbHeight() * 0.5D,
                    0.0D
            );

            double dx = bodyCenter.x - center.x;
            double dy = bodyCenter.y - center.y;
            double dz = bodyCenter.z - center.z;

            return dx * dx + dy * dy + dz * dz <= radiusSquared;
        }
    }

    private static final class PetrifiedState {
        private long endAt;
        private final boolean originalNoAi;
        private final boolean originalNoGravity;
        private final double lockedX;
        private final double lockedZ;
        private final float lockedYRot;
        private final float lockedXRot;
        private double verticalVelocity;
        private final List<MobEffectInstance> suspendedBeneficialEffects;

        @Nullable
        private final UUID curePlayerUuid;

        private PetrifiedState(
                long endAt,
                boolean originalNoAi,
                boolean originalNoGravity,
                double lockedX,
                double lockedZ,
                float lockedYRot,
                float lockedXRot,
                double verticalVelocity,
                List<MobEffectInstance> suspendedBeneficialEffects,
                @Nullable UUID curePlayerUuid
        ) {
            this.endAt = endAt;
            this.originalNoAi = originalNoAi;
            this.originalNoGravity = originalNoGravity;
            this.lockedX = lockedX;
            this.lockedZ = lockedZ;
            this.lockedYRot = lockedYRot;
            this.lockedXRot = lockedXRot;
            this.verticalVelocity = Math.min(0.0D, verticalVelocity);
            this.suspendedBeneficialEffects = suspendedBeneficialEffects;
            this.curePlayerUuid = curePlayerUuid;
        }
    }
}
