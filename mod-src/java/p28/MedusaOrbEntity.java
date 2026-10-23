package com.example.zitraksmode.entities;

import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.events.PetrificationManager;
import com.example.zitraksmode.items.MedusaItem;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.DustParticleOptions;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.ThrowableItemProjectile;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.Vec3;

/**
 * A thrown Medusa with the same heavy, curved, bouncing flight style as the
 * Steel Ball. Its absolute activation time is retained on pickup, so a player
 * cannot cancel a started timer by taking it back into the inventory.
 */
public final class MedusaOrbEntity extends ThrowableItemProjectile {
    private static final DustParticleOptions INNER_GREEN =
            new DustParticleOptions(new com.mojang.math.Vector3f(0.18F, 1.0F, 0.42F), 0.85F);

    private static final int OWNER_COLLISION_GRACE_TICKS = 10;
    private static final int ENTITY_BOUNCE_COOLDOWN_TICKS = 5;

    private static final double GRAVITY = 0.075D;
    private static final double AIR_DRAG = 0.992D;
    private static final double MAGNUS_FORCE = 0.0035D;

    private static final double GROUND_FRICTION = 0.88D;
    private static final double WALL_BOUNCE_WEAK = 0.60D;
    private static final double WALL_BOUNCE_CHARGED = 0.74D;
    private static final double FLOOR_BOUNCE_WEAK = 0.38D;
    private static final double FLOOR_BOUNCE_CHARGED = 0.52D;
    private static final double SLIDE_AFTER_FLOOR_BOUNCE = 0.96D;
    private static final double MIN_SPEED_TO_BOUNCE = 0.10D;
    private static final double STOP_SPEED = 0.045D;

    private long detonateAt;
    private int groundTicks;
    private int lastBouncedEntityId = -1;
    private int entityBounceCooldown;
    private int spinDirection = 1;

    public MedusaOrbEntity(EntityType<? extends MedusaOrbEntity> type, Level level) {
        super(type, level);
        spinDirection = level.random.nextBoolean() ? 1 : -1;
    }

    public MedusaOrbEntity(EntityType<? extends MedusaOrbEntity> type, ServerLevel level,
                           LivingEntity owner, ItemStack stack, long detonateAt) {
        super(type, owner, level);
        ItemStack carriedStack = stack.copy();
        carriedStack.setCount(1);
        if (MedusaItem.isCharged(carriedStack)) {
            // The projectile keeps the original absolute deadline in its own
            // stack as well as in the entity field. Pickup can therefore never
            // restart a hand-started countdown.
            MedusaItem.arm(carriedStack, detonateAt);
        }
        setItem(carriedStack);
        this.detonateAt = detonateAt;
        spinDirection = level.random.nextBoolean() ? 1 : -1;
    }

    @Override
    protected Item getDefaultItem() {
        return ModItems.MEDUSA.get();
    }

    @Override
    protected float getGravity() {
        return (float) GRAVITY;
    }

    @Override
    public void tick() {
        super.tick();

        if (entityBounceCooldown > 0) {
            entityBounceCooldown--;
            if (entityBounceCooldown == 0) {
                lastBouncedEntityId = -1;
            }
        }

        if (!onGround) {
            applyAirPhysics();
            groundTicks = 0;
        } else {
            applyGroundPhysics();
        }

        if (level.isClientSide) return;

        ItemStack stack = getItem();
        if (!MedusaItem.isCharged(stack)) return;

        if (level instanceof ServerLevel serverLevel) {
            long remaining = detonateAt - level.getGameTime();
            if (remaining > 0) {
                serverLevel.sendParticles(INNER_GREEN, getX(), getY() + 0.15D, getZ(),
                        3, 0.12D, 0.12D, 0.12D, 0.01D);
            } else {
                net.minecraft.server.level.ServerPlayer activator = getOwner()
                        instanceof net.minecraft.server.level.ServerPlayer serverPlayer ? serverPlayer : null;
                PetrificationManager.petrifySphere(serverLevel, position(), MedusaItem.getRadius(stack), activator);
                dischargeInPlace(stack);
            }
        }
    }

    /**
     * Detonation consumes only the charge. The physical Medusa stays exactly at
     * the activation point as a harmless, pickable item that can be recharged
     * with a diamond in an anvil.
     */
    private void dischargeInPlace(ItemStack stack) {
        MedusaItem.setCharged(stack, false);
        MedusaItem.clearArmed(stack);
        detonateAt = 0L;
        setDeltaMovement(Vec3.ZERO);
        // An activation in mid-air becomes an ordinary discharged object: it
        // falls under gravity and settles on the ground instead of hanging.
        setNoGravity(false);
        noPhysics = false;
        groundTicks = 0;
    }

    private void applyAirPhysics() {
        Vec3 motion = getDeltaMovement();
        if (motion.lengthSqr() <= 1.0E-5D) return;

        motion = motion.scale(AIR_DRAG);
        if (tickCount > 2 && motion.lengthSqr() > 0.04D) {
            Vec3 sideways = motion.cross(new Vec3(0.0D, 1.0D, 0.0D));
            if (sideways.lengthSqr() > 1.0E-5D) {
                motion = motion.add(sideways.normalize().scale(MAGNUS_FORCE * spinDirection));
            }
        }
        setDeltaMovement(motion);
    }

    private void applyGroundPhysics() {
        groundTicks++;

        Vec3 motion = getDeltaMovement();
        Vec3 horizontal = new Vec3(motion.x, 0.0D, motion.z);
        if (horizontal.length() > STOP_SPEED) {
            horizontal = horizontal.scale(GROUND_FRICTION);
        } else {
            horizontal = Vec3.ZERO;
        }
        setDeltaMovement(horizontal.x, 0.0D, horizontal.z);
    }

    @Override
    protected boolean canHitEntity(Entity target) {
        if (target == getOwner()) {
            return false;
        }
        if (target.getId() == lastBouncedEntityId && entityBounceCooldown > 0) {
            return false;
        }
        return super.canHitEntity(target);
    }

    @Override
    protected void onHitEntity(EntityHitResult result) {
        if (isSpent()) {
            setDeltaMovement(Vec3.ZERO);
            return;
        }

        Entity target = result.getEntity();
        Vec3 targetCenter = target.position().add(0.0D, target.getBbHeight() * 0.5D, 0.0D);
        Vec3 normal = position().subtract(targetCenter);

        if (normal.lengthSqr() < 1.0E-5D) {
            Vec3 motion = getDeltaMovement();
            normal = motion.lengthSqr() > 1.0E-5D
                    ? motion.normalize().scale(-1.0D)
                    : new Vec3(0.0D, 1.0D, 0.0D);
        } else {
            normal = normal.normalize();
        }

        bounceFromSurface(result.getLocation(), normal, false);
        lastBouncedEntityId = target.getId();
        entityBounceCooldown = ENTITY_BOUNCE_COOLDOWN_TICKS;
    }

    @Override
    protected void onHitBlock(BlockHitResult result) {
        super.onHitBlock(result);

        Direction side = result.getDirection();
        Vec3 normal = Vec3.atLowerCornerOf(side.getNormal()).normalize();
        if (isSpent()) {
            // Spent Medusa is a recoverable object, not a bouncing decoy.
            setPos(result.getLocation().add(normal.scale(0.051D)));
            setDeltaMovement(Vec3.ZERO);
            return;
        }

        bounceFromSurface(result.getLocation(), normal, side.getAxis().isVertical());
    }

    private void bounceFromSurface(Vec3 impactLocation, Vec3 surfaceNormal, boolean horizontalSurface) {
        Vec3 motion = getDeltaMovement();
        double speed = motion.length();

        if (speed < MIN_SPEED_TO_BOUNCE) {
            setPos(impactLocation.add(surfaceNormal.scale(0.051D)));
            setDeltaMovement(Vec3.ZERO);
            return;
        }

        double dot = motion.dot(surfaceNormal);
        if (dot >= 0.0D) {
            surfaceNormal = surfaceNormal.scale(-1.0D);
            dot = motion.dot(surfaceNormal);
        }

        Vec3 reflected = motion.subtract(surfaceNormal.scale(2.0D * dot));
        boolean charged = MedusaItem.isCharged(getItem());
        double bounceFactor = horizontalSurface
                ? (charged ? FLOOR_BOUNCE_CHARGED : FLOOR_BOUNCE_WEAK)
                : (charged ? WALL_BOUNCE_CHARGED : WALL_BOUNCE_WEAK);
        Vec3 bounced = reflected.scale(bounceFactor);

        if (horizontalSurface) {
            bounced = new Vec3(
                    bounced.x * SLIDE_AFTER_FLOOR_BOUNCE,
                    Math.abs(bounced.y),
                    bounced.z * SLIDE_AFTER_FLOOR_BOUNCE
            );
        } else {
            bounced = new Vec3(bounced.x, bounced.y * 0.98D, bounced.z);
        }

        if (bounced.length() < MIN_SPEED_TO_BOUNCE) {
            bounced = Vec3.ZERO;
        }

        setPos(impactLocation.add(surfaceNormal.scale(0.061D)));
        setDeltaMovement(bounced);
        spinDirection *= -1;

        if (!level.isClientSide) {
            level.playSound(null, getX(), getY(), getZ(), SoundEvents.AMETHYST_BLOCK_HIT,
                    SoundSource.NEUTRAL, 0.45F,
                    0.85F + level.random.nextFloat() * 0.25F);
        }
    }

    private boolean isSpent() {
        return !MedusaItem.isCharged(getItem()) && detonateAt == 0L;
    }

    @Override
    public void playerTouch(Player player) {
        if (level.isClientSide || tickCount < OWNER_COLLISION_GRACE_TICKS) return;
        if (getDeltaMovement().lengthSqr() > 0.18D) return;

        ItemStack recovered = getItem().copy();
        recovered.setCount(1);
        if (MedusaItem.isCharged(recovered)) {
            MedusaItem.arm(recovered, detonateAt);
        }

        if (!player.getInventory().add(recovered)) {
            spawnAtLocation(recovered);
        }
        discard();
    }

    @Override
    public boolean isPickable() {
        return true;
    }

    @Override
    public void addAdditionalSaveData(CompoundTag tag) {
        super.addAdditionalSaveData(tag);
        tag.putLong("MedusaDetonateAt", detonateAt);
        tag.putInt("MedusaGroundTicks", groundTicks);
        tag.putInt("MedusaLastBouncedEntity", lastBouncedEntityId);
        tag.putInt("MedusaEntityBounceCooldown", entityBounceCooldown);
        tag.putInt("MedusaSpinDirection", spinDirection);
    }

    @Override
    public void readAdditionalSaveData(CompoundTag tag) {
        super.readAdditionalSaveData(tag);
        detonateAt = tag.getLong("MedusaDetonateAt");
        groundTicks = tag.getInt("MedusaGroundTicks");
        lastBouncedEntityId = tag.getInt("MedusaLastBouncedEntity");
        entityBounceCooldown = tag.getInt("MedusaEntityBounceCooldown");
        spinDirection = tag.contains("MedusaSpinDirection") ? tag.getInt("MedusaSpinDirection") : 1;
        if (spinDirection == 0) spinDirection = 1;
    }
}
