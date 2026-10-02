package com.example.zitraksmode.entities;

import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ModSounds;
import com.example.zitraksmode.criteria.ChigurAdvancementHelper;
import com.example.zitraksmode.events.ChigurFreezeHandler;
import com.example.zitraksmode.network.chigur.ChigurNetwork;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.RandomStrollGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BedBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BedPart;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.Vec3;
import software.bernie.geckolib3.core.IAnimatable;
import software.bernie.geckolib3.core.PlayState;
import software.bernie.geckolib3.core.builder.AnimationBuilder;
import software.bernie.geckolib3.core.builder.ILoopType;
import software.bernie.geckolib3.core.controller.AnimationController;
import software.bernie.geckolib3.core.event.predicate.AnimationEvent;
import software.bernie.geckolib3.core.manager.AnimationData;
import software.bernie.geckolib3.core.manager.AnimationFactory;
import software.bernie.geckolib3.util.GeckoLibUtil;

import javax.annotation.Nullable;
import java.util.UUID;

/**
 * Neutral night NPC with three personal scenarios:
 * <ul>
 *     <li>the first dialogue answer starts a quiet, distant hunt;</li>
 *     <li>an ignored Chigur approaches a still player for a coin toss;</li>
 *     <li>during a hunt he can question a different player about the victim.</li>
 * </ul>
 * All decisions are made on the server. The client only displays the choice screens.
 */
public final class AntonChigurEntity extends Monster implements IAnimatable {
    public static final int STATE_IDLE = 0;
    public static final int STATE_OBSERVE = 1;
    public static final int STATE_STALK = 2;
    public static final int STATE_SHOOT = 3;
    public static final int STATE_RELOAD = 4;
    public static final int STATE_COIN = 5;
    public static final int STATE_KILL = 6;
    public static final int STATE_VANISH = 7;
    public static final int STATE_WALK = 8;

    private static final int MAX_AMMO = 6;
    private static final double PASSIVE_WALK_SPEED = 0.55D;
    private static final double APPROACH_SPEED = 0.65D;
    private static final double HUNT_SPEED = 0.85D;
    private static final int SHOOT_ANIMATION_TICKS = 7;
    private static final int RELOAD_ANIMATION_TICKS = 30;
    private static final int VANISH_ANIMATION_TICKS = 14;
    private static final int DIALOGUE_TICKS = 20 * 5;
    // The supplied coin and coin2 animations are both exactly two seconds long.
    private static final int COIN_TOSS_TICKS = 20 * 2;
    private static final int COIN_REWARD_TICKS = 20 * 5;
    private static final int COIN_LOSS_DELAY_TICKS = 20 * 2;
    private static final int EXECUTION_CHECK_TICKS = 8;
    /** Three seconds of silence before each spoken witness question. */
    private static final int WITNESS_QUESTION_DELAY_TICKS = 20 * 3;
    /** Speech 5 and 6 each last three seconds while he takes a small backward step. */
    private static final int WITNESS_REFUSAL_RETREAT_TICKS = 20 * 3;
    /** Third refusal has no line: he silently backs away for three seconds and abandons the hunt. */
    private static final int WITNESS_FINAL_RETREAT_TICKS = 20 * 3;
    private static final int WITNESS_SEARCH_DELAY_TICKS = 20 * 8;
    private static final int VANISH_AFTER_UNSEEN_TICKS = 20 * 120;

    private static final int COIN_ANIMATION_HEADS = 0;
    private static final int COIN_ANIMATION_TAILS = 1;

    private static final int COIN_NONE = 0;
    private static final int COIN_APPROACH = 1;
    private static final int COIN_SPEECH = 2;
    private static final int COIN_WAITING_FOR_CHOICE = 3;
    private static final int COIN_TOSS = 4;
    private static final int COIN_REWARD = 5;
    private static final int COIN_LOSS_DELAY = 6;
    private static final int COIN_EXECUTION_CHECK = 7;

    private static final int WITNESS_NONE = 0;
    private static final int WITNESS_APPROACH = 1;
    private static final int WITNESS_QUESTION_DELAY = 2;
    private static final int WITNESS_SPEECH_4 = 3;
    private static final int WITNESS_WAITING_FOR_CHOICE = 4;
    private static final int WITNESS_REFUSAL_RETREAT = 5;
    private static final int WITNESS_FINAL_RETREAT = 6;
    /** One-second kill animation and guaranteed death of the player who confessed. */
    private static final int WITNESS_EXECUTE_CONFESSOR = 7;
    /** Five seconds after the confessor has died, before teleporting to the hunted target. */
    private static final int WITNESS_TARGET_DELAY = 8;
    /** One-second kill animation after teleporting to the hunted target. */
    private static final int WITNESS_EXECUTE_TARGET = 9;

    private static final String[] WITNESS_REFUSALS = {
            "Извините, но мы не раскрываем информацию.",
            "Я не знаю, о ком вы говорите.",
            "Нет. Я не стану говорить, где он."
    };

    private static final EntityDataAccessor<Integer> STATE =
            SynchedEntityData.defineId(AntonChigurEntity.class, EntityDataSerializers.INT);
    private static final EntityDataAccessor<Integer> AGGRESSION =
            SynchedEntityData.defineId(AntonChigurEntity.class, EntityDataSerializers.INT);
    private static final EntityDataAccessor<Integer> AMMO =
            SynchedEntityData.defineId(AntonChigurEntity.class, EntityDataSerializers.INT);
    /** Synced so every client sees coin = heads and coin2 = tails. */
    private static final EntityDataAccessor<Integer> COIN_ANIMATION =
            SynchedEntityData.defineId(AntonChigurEntity.class, EntityDataSerializers.INT);

    private final AnimationFactory animationFactory = GeckoLibUtil.createFactory(this);

    @Nullable
    private UUID huntedPlayerId;
    @Nullable
    private UUID coinPlayerId;
    @Nullable
    private UUID witnessPlayerId;
    /** Current victim whose position must be followed while the shoot animation plays. */
    @Nullable
    private UUID actionLookTargetId;

    private int shootCooldown;
    private int huntStartTicks;
    private int cinematicTicks;
    private int unseenTicks;
    private int coinStage = COIN_NONE;
    private int coinStageTicks;
    private int witnessStage = WITNESS_NONE;
    private int witnessStageTicks;
    private int witnessSearchCooldown;
    private int approachTicks;
    private int postDialogueHuntDelay;
    private int leavingTicks;
    /** Holds short one-shot state animations long enough for clients to see them. */
    private int actionStateTicks;
    private int actionState = STATE_IDLE;
    /** Keeps the entity alive for the complete vanish animation before discard(). */
    private int vanishTicks;

    private long reloadOnDay = -1L;
    private boolean coinWasUsed;
    private boolean silentHunt;
    /** Side selected in the GUI by the player. true = heads. */
    private boolean chosenCoinSide;
    /** Actual 50/50 result decided before the visible toss begins. */
    private boolean coinTossHeads;
    /** Number of already chosen refusal answers in the current witness questioning. */
    private int witnessRefusalCount;
    /** Speech 4 is only allowed once during a whole witness interrogation. */
    private boolean witnessQuestionSpoken;
    private String witnessRefusalText = WITNESS_REFUSALS[0];

    public AntonChigurEntity(EntityType<? extends Monster> type, Level level) {
        super(type, level);
        this.xpReward = 25;
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Monster.createMonsterAttributes()
                .add(Attributes.MAX_HEALTH, 80.0D)
                .add(Attributes.ARMOR, 6.0D)
                .add(Attributes.KNOCKBACK_RESISTANCE, 0.7D)
                // Faster than the earlier 0.30 value, while still allowing scenes and
                // backward witness retreats to stay deliberately slow.
                .add(Attributes.MOVEMENT_SPEED, 0.38D)
                .add(Attributes.FOLLOW_RANGE, 32.0D)
                .add(Attributes.ATTACK_DAMAGE, 7.0D);
    }

    @Override
    protected void registerGoals() {
        goalSelector.addGoal(0, new FloatGoal(this));
        goalSelector.addGoal(7, new RandomStrollGoal(this, PASSIVE_WALK_SPEED));
        goalSelector.addGoal(8, new LookAtPlayerGoal(this, Player.class, 12.0F));
    }

    @Override
    protected void defineSynchedData() {
        super.defineSynchedData();
        entityData.define(STATE, STATE_IDLE);
        entityData.define(AGGRESSION, 0);
        entityData.define(AMMO, MAX_AMMO);
        entityData.define(COIN_ANIMATION, COIN_ANIMATION_HEADS);
    }

    public int getState() {
        return entityData.get(STATE);
    }

    public int getAggression() {
        return entityData.get(AGGRESSION);
    }

    public int getAmmo() {
        return entityData.get(AMMO);
    }

    /** 0 renders animation.chigur.coin (heads), 1 renders coin2 (tails). */
    public int getCoinAnimationVariant() {
        return entityData.get(COIN_ANIMATION);
    }

    private void setState(int state) {
        entityData.set(STATE, state);
    }

    private void setAggression(int amount) {
        entityData.set(AGGRESSION, Mth.clamp(amount, 0, 100));
    }

    private void playActionAnimation(int state, int ticks) {
        actionState = state;
        actionStateTicks = Math.max(1, ticks);
        setState(state);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
    }

    private void tickActionAnimation() {
        setState(actionState);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);

        if (actionState == STATE_SHOOT) {
            ServerPlayer target = getServerPlayer(actionLookTargetId);
            if (target != null) faceTargetImmediately(target);
        }

        actionStateTicks--;
        if (actionStateTicks <= 0) actionLookTargetId = null;
    }

    /** Makes the whole model body/head face the live target, not only its LookControl. */
    private void faceTargetImmediately(ServerPlayer target) {
        double dx = target.getX() - getX();
        double dz = target.getZ() - getZ();
        float yaw = (float) (Mth.atan2(dz, dx) * (180.0D / Math.PI)) - 90.0F;

        setYRot(yaw);
        setYHeadRot(yaw);
        setYBodyRot(yaw);
        getLookControl().setLookAt(target, 180.0F, 180.0F);
    }

    private void tickVanishAnimation() {
        setState(STATE_VANISH);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        vanishTicks--;
        if (vanishTicks <= 0) discard();
    }

    @Override
    public void aiStep() {
        super.aiStep();
        if (level.isClientSide) return;

        grantFirstMeetingToNearbyPlayers();

        if (shootCooldown > 0) shootCooldown--;

        // vanish() must not discard immediately: otherwise GeckoLib has no frame
        // in which to render animation.chigur.vanish.
        if (vanishTicks > 0) {
            tickVanishAnimation();
            return;
        }

        if (cinematicTicks > 0) {
            tickBedCinematic();
            return;
        }

        if (huntStartTicks > 0) {
            tickFirstDialogueScene();
            return;
        }

        if (coinStage != COIN_NONE) {
            tickCoinSequence();
            return;
        }

        if (witnessStage != WITNESS_NONE) {
            tickWitnessSequence();
            return;
        }

        if (actionStateTicks > 0) {
            tickActionAnimation();
            return;
        }

        if (leavingTicks > 0) {
            leavingTicks--;
            setState(STATE_STALK);
            return;
        }

        reloadEmptyShotgunOnNextNight();
        if (actionStateTicks > 0) {
            tickActionAnimation();
            return;
        }

        ServerPlayer huntedPlayer = getHuntedPlayer();
        if (huntedPlayerId != null && huntedPlayer == null) {
            // A personal hunt never transfers to a random replacement target.
            resetHunt();
        }

        if (huntedPlayer != null && isHuntingAnyone()) {
            if (getAggression() >= 100) {
                setTarget(huntedPlayer);
            } else {
                // The first-dialogue hunt is deliberately not a normal hostile mob target.
                setTarget(null);
            }

            tickHunt(huntedPlayer);
            tryStartWitnessQuestion(huntedPlayer);
            return;
        }

        ServerPlayer nearbyPlayer = findNearbyPlayer();
        if (nearbyPlayer != null) {
            // A neutral Chigur may approach an ignored, still player for the coin game.
            tickPassiveCoinOffer();
            if (coinStage == COIN_NONE) {
                setState(STATE_OBSERVE);
                getLookControl().setLookAt(nearbyPlayer, 20.0F, 20.0F);
            }
            return;
        }

        setState(STATE_IDLE);
        tickUnseenDespawn();
    }

    /**
     * "Первая встреча" is proximity-based, not spawn-based: it is granted only
     * after a player has actually come within five blocks of a living Chigur.
     */
    private void grantFirstMeetingToNearbyPlayers() {
        if (tickCount % 10 != 0) return;

        for (Player candidate : level.getEntitiesOfClass(Player.class,
                getBoundingBox().inflate(5.0D), Player::isAlive)) {
            if (!(candidate instanceof ServerPlayer player)) continue;
            if (distanceToSqr(player) > 25.0D) continue;
            ChigurAdvancementHelper.grant(player, "27_chigur/first_meeting");
        }
    }

    /** The five seconds after choosing "Откуда ты?". */
    private void tickFirstDialogueScene() {
        ServerPlayer player = getHuntedPlayer();
        if (player == null) {
            resetHunt();
            huntStartTicks = 0;
            return;
        }

        holdFaceToFace(player);
        ChigurFreezeHandler.freeze(player, 2);
        huntStartTicks--;

        if (huntStartTicks <= 0) {
            ChigurFreezeHandler.release(player);
            beginSilentHunt(player);
        }
    }

    private void holdFaceToFace(ServerPlayer player) {
        setState(STATE_OBSERVE);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        getLookControl().setLookAt(player, 30.0F, 30.0F);
        facePlayerTowardChigur(player);
    }

    /**
     * The speech is over: he disappears from the close conversation and is moved
     * to a distant position. He remains tied to this player but has no vanilla anger.
     */
    private void beginSilentHunt(ServerPlayer player) {
        silentHunt = true;
        setAggression(0);
        setTarget(null);
        setState(STATE_STALK);
        witnessSearchCooldown = WITNESS_SEARCH_DELAY_TICKS;
        approachTicks = 0;
        postDialogueHuntDelay = 20 * 6;
        teleportAwayFrom(player);
    }

    private void teleportAwayFrom(ServerPlayer player) {
        if (!(level instanceof ServerLevel serverLevel)) return;

        double originalX = getX();
        double originalY = getY();
        double originalZ = getZ();

        Vec3 away = position().subtract(player.position());
        away = new Vec3(away.x, 0.0D, away.z);
        if (away.lengthSqr() < 0.001D) {
            double angle = random.nextDouble() * Math.PI * 2.0D;
            away = new Vec3(Math.cos(angle), 0.0D, Math.sin(angle));
        } else {
            away = away.normalize();
        }

        double side = (random.nextDouble() - 0.5D) * 0.85D;
        double rotatedX = away.x * Math.cos(side) - away.z * Math.sin(side);
        double rotatedZ = away.x * Math.sin(side) + away.z * Math.cos(side);
        int destinationX = Mth.floor(player.getX() + rotatedX * 26.0D);
        int destinationZ = Mth.floor(player.getZ() + rotatedZ * 26.0D);
        int destinationY = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, destinationX, destinationZ);

        serverLevel.sendParticles(ParticleTypes.POOF, originalX, originalY + 1.0D, originalZ,
                24, 0.45D, 0.75D, 0.45D, 0.03D);
        playSound(ModSounds.CHIGUR_VANISH.get(), 0.7F, 1.0F);
        teleportTo(destinationX + 0.5D, destinationY, destinationZ + 0.5D);
        getNavigation().stop();
    }

    private void reloadEmptyShotgunOnNextNight() {
        if (getAmmo() > 0 || reloadOnDay < 0L) return;
        if (level.getDayTime() / 24_000L < reloadOnDay || !isNight()) return;

        entityData.set(AMMO, MAX_AMMO);
        reloadOnDay = -1L;
        playActionAnimation(STATE_RELOAD, RELOAD_ANIMATION_TICKS);
        playSound(ModSounds.CHIGUR_RELOAD.get(), 0.8F, 1.0F);
    }

    private void tickHunt(ServerPlayer target) {
        double distance = distanceTo(target);
        getLookControl().setLookAt(target, 30.0F, 30.0F);

        if (getAmmo() <= 0) {
            approachTicks = 0;
            setState(STATE_STALK);
            avoidTargetAtDistance(target, 28.0D);
            return;
        }

        if (distance >= 2.0D && distance <= 10.0D && hasLineOfSight(target) && shootCooldown <= 0) {
            fireShotgun(target);
            return;
        }

        setState(STATE_STALK);

        // Immediately after speech 1 he stays far away instead of shooting at once.
        if (postDialogueHuntDelay > 0) {
            postDialogueHuntDelay--;
            stalkAtDistance(target);
            return;
        }

        // Most of the time he holds a distant stalking position. Occasionally he
        // closes in for a short moment; that is the only window in which a shot is possible.
        if (approachTicks > 0) {
            approachTicks--;
            if (distance > 8.0D) {
                getNavigation().moveTo(target, HUNT_SPEED);
            } else {
                getNavigation().stop();
            }
            return;
        }

        if (distance > 10.0D && random.nextInt(80) == 0) {
            approachTicks = 20 * 3;
            getNavigation().moveTo(target, HUNT_SPEED);
            return;
        }

        stalkAtDistance(target);
    }

    private void stalkAtDistance(ServerPlayer target) {
        double distance = distanceTo(target);
        if (distance < 14.0D) {
            moveAwayFrom(target, 20.0D, HUNT_SPEED);
        } else if (distance > 24.0D) {
            getNavigation().moveTo(target, HUNT_SPEED);
        } else {
            getNavigation().stop();
        }
    }

    private void avoidTargetAtDistance(ServerPlayer target, double distance) {
        if (distanceTo(target) < distance) {
            moveAwayFrom(target, distance + 8.0D, HUNT_SPEED);
        } else {
            getNavigation().stop();
        }
    }

    private void moveAwayFrom(ServerPlayer target, double desiredDistance, double speed) {
        Vec3 away = position().subtract(target.position());
        away = new Vec3(away.x, 0.0D, away.z);
        if (away.lengthSqr() < 0.001D) {
            away = new Vec3(random.nextDouble() - 0.5D, 0.0D, random.nextDouble() - 0.5D);
        }
        away = away.normalize();
        Vec3 position = target.position().add(away.scale(desiredDistance));
        getNavigation().moveTo(position.x, position.y, position.z, speed);
    }

    private void fireShotgun(ServerPlayer target) {
        actionLookTargetId = target.getUUID();
        faceTargetImmediately(target);
        playActionAnimation(STATE_SHOOT, SHOOT_ANIMATION_TICKS);
        approachTicks = 0;
        shootCooldown = 20 * 2;

        int remainingAmmo = getAmmo() - 1;
        entityData.set(AMMO, remainingAmmo);

        double progress = Mth.clamp((distanceTo(target) - 2.0D) / 8.0D, 0.0D, 1.0D);
        float damage = (float) (7.0D + 60.0D * Math.pow(1.0D - progress, 2.0D));
        damage *= 0.90F + random.nextFloat() * 0.20F;
        target.hurt(DamageSource.mobAttack(this), damage);

        playSound(ModSounds.CHIGUR_SHOT.get(), 1.0F, 0.9F + random.nextFloat() * 0.15F);
        if (level instanceof ServerLevel serverLevel) {
            serverLevel.sendParticles(ParticleTypes.SMOKE, getX(), getY() + 1.35D, getZ(),
                    8, 0.16D, 0.16D, 0.16D, 0.02D);
        }

        if (remainingAmmo <= 0) {
            reloadOnDay = level.getDayTime() / 24_000L + 1L;
            setState(STATE_STALK);
        }
    }

    /** Starts only when the player has ignored Chigur and stood still for ten seconds. */
    private void tickPassiveCoinOffer() {
        if (coinWasUsed) return;

        for (Player candidate : level.getEntitiesOfClass(Player.class,
                getBoundingBox().inflate(32.0D), Player::isAlive)) {
            if (!(candidate instanceof ServerPlayer player)) continue;
            if (!ChigurFreezeHandler.hasStoodStill(player, 20 * 10)) continue;

            coinPlayerId = player.getUUID();
            coinStage = COIN_APPROACH;
            setState(STATE_STALK);
            return;
        }
    }

    private void tickCoinSequence() {
        ServerPlayer player = getCoinPlayer();
        if (player == null) {
            boolean executionWasRunning = coinStage == COIN_EXECUTION_CHECK;
            clearCoinSequence();
            if (executionWasRunning) vanish();
            return;
        }

        switch (coinStage) {
            case COIN_APPROACH -> tickCoinApproach(player);
            case COIN_SPEECH -> tickCoinSpeech(player);
            case COIN_WAITING_FOR_CHOICE -> holdCoinPlayer(player);
            case COIN_TOSS -> tickCoinToss(player);
            case COIN_REWARD -> tickCoinReward(player);
            case COIN_LOSS_DELAY -> tickCoinLossDelay(player);
            case COIN_EXECUTION_CHECK -> tickCoinExecutionCheck(player);
            default -> clearCoinSequence();
        }
    }

    private void tickCoinApproach(ServerPlayer player) {
        getLookControl().setLookAt(player, 30.0F, 30.0F);
        if (distanceTo(player) > 2.6D) {
            setState(STATE_WALK);
            getNavigation().moveTo(player, APPROACH_SPEED);
            return;
        }

        getNavigation().stop();
        // Speech 2 plays first. coin/coin2 must not begin until the player has
        // seen the choice screen and the server has made the 50/50 result.
        setState(STATE_OBSERVE);
        coinStage = COIN_SPEECH;
        coinStageTicks = DIALOGUE_TICKS;
        ChigurFreezeHandler.freeze(player, DIALOGUE_TICKS);
        facePlayerTowardChigur(player);
        playSound(ModSounds.CHIGUR_SPEECH_2.get(), 1.0F, 1.0F);
    }

    private void tickCoinSpeech(ServerPlayer player) {
        holdCoinPlayer(player);
        coinStageTicks--;
        if (coinStageTicks > 0) return;

        coinStage = COIN_WAITING_FOR_CHOICE;
        ChigurNetwork.openCoin(player, getId());
    }

    private void tickCoinToss(ServerPlayer player) {
        holdCoinPlayer(player);
        coinStageTicks--;
        if (coinStageTicks > 0) return;

        if (coinTossHeads == chosenCoinSide) {
            beginCoinReward(player);
        } else {
            coinStage = COIN_LOSS_DELAY;
            coinStageTicks = COIN_LOSS_DELAY_TICKS;
            setState(STATE_OBSERVE);
        }
    }

    private void beginCoinReward(ServerPlayer player) {
        // The result is known, but he does not hand over the item yet. The player
        // stays frozen through all five seconds of speech 3 first.
        setState(STATE_OBSERVE);
        coinStage = COIN_REWARD;
        coinStageTicks = COIN_REWARD_TICKS;
        playSound(ModSounds.CHIGUR_SPEECH_3.get(), 1.0F, 1.0F);
    }

    private void tickCoinReward(ServerPlayer player) {
        holdCoinPlayer(player);
        coinStageTicks--;
        if (coinStageTicks > 0) return;

        ItemStack reward = new ItemStack(ModItems.CHIGUR_COIN.get());
        if (!player.getInventory().add(reward)) {
            player.drop(reward, false);
        }
        ChigurAdvancementHelper.grant(player, "27_chigur/coin_luck");

        ChigurFreezeHandler.release(player);
        clearCoinSequence();
        vanish();
    }

    private void tickCoinLossDelay(ServerPlayer player) {
        holdCoinPlayer(player);
        coinStageTicks--;
        if (coinStageTicks > 0) return;

        setState(STATE_SHOOT);
        getLookControl().setLookAt(player, 30.0F, 30.0F);
        playSound(ModSounds.CHIGUR_SHOT.get(), 1.0F, 1.0F);
        player.hurt(DamageSource.mobAttack(this), 1000.0F);

        // A totem may leave the player alive. The next short check uses the void
        // damage source, which has no totem rescue path in vanilla 1.19.2.
        coinStage = COIN_EXECUTION_CHECK;
        coinStageTicks = EXECUTION_CHECK_TICKS;
    }

    private void tickCoinExecutionCheck(ServerPlayer player) {
        holdCoinPlayer(player);
        coinStageTicks--;
        if (coinStageTicks > 0) return;

        if (player.isAlive()) {
            player.hurt(DamageSource.OUT_OF_WORLD, Float.MAX_VALUE);
        }

        ChigurFreezeHandler.release(player);
        clearCoinSequence();
        vanish();
    }

    private void holdCoinPlayer(ServerPlayer player) {
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        getLookControl().setLookAt(player, 30.0F, 30.0F);
        facePlayerTowardChigur(player);
        ChigurFreezeHandler.freeze(player, 2);
    }

    private void clearCoinSequence() {
        ServerPlayer player = getCoinPlayer();
        if (player != null) ChigurFreezeHandler.release(player);
        coinPlayerId = null;
        coinStage = COIN_NONE;
        coinStageTicks = 0;
    }

    /**
     * The client may only answer while the dedicated coin screen is open and only
     * the exact player selected by this Chigur may send that answer.
     */
    public void handleCoinChoice(ServerPlayer player, boolean heads) {
        if (coinStage != COIN_WAITING_FOR_CHOICE || !player.getUUID().equals(coinPlayerId)) return;

        chosenCoinSide = heads;
        coinTossHeads = random.nextBoolean();
        coinWasUsed = true;
        coinStage = COIN_TOSS;
        coinStageTicks = COIN_TOSS_TICKS;

        // This value is SynchedEntityData, therefore clients choose the same
        // supplied animation: coin = heads, coin2 = tails.
        entityData.set(COIN_ANIMATION, coinTossHeads ? COIN_ANIMATION_HEADS : COIN_ANIMATION_TAILS);
        setState(STATE_COIN);
        getNavigation().stop();
        playSound(ModSounds.CHIGUR_COIN.get(), 0.8F, 1.0F);
    }

    /** Searches for a witness only while a named player is currently being hunted. */
    private void tryStartWitnessQuestion(ServerPlayer huntedPlayer) {
        if (witnessSearchCooldown > 0) {
            witnessSearchCooldown--;
            return;
        }

        ServerPlayer witness = findWitness(huntedPlayer);
        if (witness == null) return;

        witnessPlayerId = witness.getUUID();
        witnessRefusalCount = 0;
        witnessQuestionSpoken = false;
        witnessStage = WITNESS_APPROACH;
        setState(STATE_STALK);
    }

    @Nullable
    private ServerPlayer findWitness(ServerPlayer huntedPlayer) {
        ServerPlayer nearest = null;
        double nearestDistance = 32.0D * 32.0D;

        for (Player candidate : level.getEntitiesOfClass(Player.class,
                getBoundingBox().inflate(32.0D), Player::isAlive)) {
            if (!(candidate instanceof ServerPlayer player)) continue;
            if (player.getUUID().equals(huntedPlayer.getUUID())) continue;

            double distance = distanceToSqr(player);
            if (distance < nearestDistance) {
                nearest = player;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    private void tickWitnessSequence() {
        ServerPlayer witness = getWitnessPlayer();
        ServerPlayer huntedPlayer = getHuntedPlayer();
        if (huntedPlayer == null) {
            clearWitnessSequence();
            resetHunt();
            return;
        }

        /*
         * After the confession the witness is intentionally already dead. Do not
         * abort the sequence just because getWitnessPlayer() becomes null: Chigur
         * must still wait five seconds, teleport to the original target and kill it.
         */
        if (witness == null
                && witnessStage != WITNESS_TARGET_DELAY
                && witnessStage != WITNESS_EXECUTE_TARGET) {
            clearWitnessSequence();
            return;
        }

        switch (witnessStage) {
            case WITNESS_APPROACH -> tickWitnessApproach(witness);
            case WITNESS_QUESTION_DELAY -> tickWitnessQuestionDelay(witness);
            case WITNESS_SPEECH_4 -> tickWitnessSpeech4(witness, huntedPlayer);
            case WITNESS_WAITING_FOR_CHOICE -> holdWitness(witness);
            case WITNESS_REFUSAL_RETREAT -> tickWitnessRefusalRetreat(witness);
            case WITNESS_FINAL_RETREAT -> tickWitnessFinalRetreat(witness);
            case WITNESS_EXECUTE_CONFESSOR -> tickWitnessConfessorExecution(witness, huntedPlayer);
            case WITNESS_TARGET_DELAY -> tickWitnessTargetDelay(huntedPlayer);
            case WITNESS_EXECUTE_TARGET -> tickWitnessTargetExecution(huntedPlayer);
            default -> clearWitnessSequence();
        }
    }

    private void tickWitnessApproach(ServerPlayer witness) {
        getLookControl().setLookAt(witness, 30.0F, 30.0F);
        if (distanceTo(witness) > 2.8D) {
            setState(STATE_WALK);
            getNavigation().moveTo(witness, APPROACH_SPEED);
            return;
        }

        beginWitnessQuestionDelay(witness);
    }

    /**
     * Speech 4 belongs only to the first question. Repeated questions after
     * refusals reopen the buttons directly, with no repeated speech 4.
     */
    private void beginWitnessQuestionDelay(ServerPlayer witness) {
        getNavigation().stop();
        setState(STATE_OBSERVE);
        facePlayerTowardChigur(witness);

        if (witnessQuestionSpoken) {
            ServerPlayer huntedPlayer = getHuntedPlayer();
            if (huntedPlayer == null) {
                clearWitnessSequence();
                resetHunt();
                return;
            }
            openWitnessQuestion(witness, huntedPlayer);
            return;
        }

        witnessStage = WITNESS_QUESTION_DELAY;
        witnessStageTicks = WITNESS_QUESTION_DELAY_TICKS;
        ChigurFreezeHandler.freeze(witness, WITNESS_QUESTION_DELAY_TICKS);
    }

    /** Three silent AFK seconds before the first spoken question. */
    private void tickWitnessQuestionDelay(ServerPlayer witness) {
        holdWitness(witness);
        witnessStageTicks--;
        if (witnessStageTicks > 0) return;

        witnessQuestionSpoken = true;
        witnessStage = WITNESS_SPEECH_4;
        witnessStageTicks = WITNESS_QUESTION_DELAY_TICKS;
        playSound(ModSounds.CHIGUR_SPEECH_4.get(), 1.0F, 1.0F);
    }

    /** Speech 4 gets a full three-second AFK window before the first buttons appear. */
    private void tickWitnessSpeech4(ServerPlayer witness, ServerPlayer huntedPlayer) {
        holdWitness(witness);
        witnessStageTicks--;
        if (witnessStageTicks > 0) return;
        openWitnessQuestion(witness, huntedPlayer);
    }

    private void openWitnessQuestion(ServerPlayer witness, ServerPlayer huntedPlayer) {
        witnessStage = WITNESS_WAITING_FOR_CHOICE;
        witnessRefusalText = WITNESS_REFUSALS[random.nextInt(WITNESS_REFUSALS.length)];
        ChigurNetwork.openWitnessQuestion(witness, getId(), huntedPlayer.getName().getString(), witnessRefusalText);
    }

    private void holdWitness(ServerPlayer witness) {
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        getLookControl().setLookAt(witness, 30.0F, 30.0F);
        facePlayerTowardChigur(witness);
        ChigurFreezeHandler.freeze(witness, 2);
    }

    private void tickWitnessRefusalRetreat(ServerPlayer witness) {
        // Refusal one and two: a small backward step, then the same question begins again.
        getNavigation().stop();
        getLookControl().setLookAt(witness, 30.0F, 30.0F);
        stepBackFrom(witness, 0.055D);
        facePlayerTowardChigur(witness);
        ChigurFreezeHandler.freeze(witness, 2);
        witnessStageTicks--;

        if (witnessStageTicks > 0) return;
        beginWitnessQuestionDelay(witness);
    }

    private void tickWitnessFinalRetreat(ServerPlayer witness) {
        // The third refusal deliberately has no speech: he silently backs away,
        // keeps eye contact, gives up on the hunt, then leaves.
        getNavigation().stop();
        getLookControl().setLookAt(witness, 30.0F, 30.0F);
        stepBackFrom(witness, 0.055D);
        facePlayerTowardChigur(witness);
        ChigurFreezeHandler.freeze(witness, 2);
        witnessStageTicks--;

        if (witnessStageTicks > 0) return;

        ChigurFreezeHandler.release(witness);
        moveAwayFrom(witness, 18.0D, 0.16D);
        leavingTicks = 20 * 4;
        clearWitnessSequence();
        resetHunt();
        setState(STATE_STALK);
    }

    private void stepBackFrom(ServerPlayer player, double speed) {
        Vec3 away = position().subtract(player.position());
        away = new Vec3(away.x, 0.0D, away.z);
        if (away.lengthSqr() < 0.001D) return;
        away = away.normalize();
        setDeltaMovement(away.x * speed, getDeltaMovement().y, away.z * speed);
    }

    /**
     * The informant is killed first. A totem cannot turn the fixed "tell him"
     * answer into survival: any survivor receives the void finishing damage.
     */
    private void tickWitnessConfessorExecution(ServerPlayer witness, ServerPlayer huntedPlayer) {
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        faceTargetImmediately(witness);
        setState(STATE_KILL);
        ChigurFreezeHandler.freeze(witness, 2);
        ChigurFreezeHandler.freeze(huntedPlayer, 2);
        witnessStageTicks--;
        if (witnessStageTicks > 0) return;

        killGuaranteed(witness);
        ChigurFreezeHandler.release(witness);

        // The original hunted player stays locked while Chigur waits by the body.
        witnessStage = WITNESS_TARGET_DELAY;
        witnessStageTicks = DIALOGUE_TICKS;
        setState(STATE_OBSERVE);
        ChigurFreezeHandler.freeze(huntedPlayer, DIALOGUE_TICKS + 20);
    }

    /** Five seconds after the confession, then he appears directly beside the target. */
    private void tickWitnessTargetDelay(ServerPlayer huntedPlayer) {
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        ChigurFreezeHandler.freeze(huntedPlayer, 2);
        witnessStageTicks--;
        if (witnessStageTicks > 0) return;

        teleportTo(huntedPlayer.getX() + 0.75D, huntedPlayer.getY(), huntedPlayer.getZ() + 0.75D);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        faceTargetImmediately(huntedPlayer);
        setState(STATE_KILL);
        witnessStage = WITNESS_EXECUTE_TARGET;
        witnessStageTicks = 20;
    }

    /** One visible kill animation after teleport, then a guaranteed final death. */
    private void tickWitnessTargetExecution(ServerPlayer huntedPlayer) {
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        faceTargetImmediately(huntedPlayer);
        setState(STATE_KILL);
        ChigurFreezeHandler.freeze(huntedPlayer, 2);
        witnessStageTicks--;
        if (witnessStageTicks > 0) return;

        killGuaranteed(huntedPlayer);
        ChigurFreezeHandler.release(huntedPlayer);
        clearWitnessSequence();
        resetHunt();
        vanish();
    }

    private void killGuaranteed(ServerPlayer player) {
        playSound(ModSounds.CHIGUR_SHOT.get(), 1.0F, 1.0F);
        player.hurt(DamageSource.mobAttack(this), 1000.0F);
        if (player.isAlive()) {
            player.hurt(DamageSource.OUT_OF_WORLD, Float.MAX_VALUE);
        }
    }

    /**
     * Choice 0 is permanently "Рассказать, где он". A refusal can be made
     * three times: speech 5 on the first, speech 6 on the second, then silence.
     */
    public void handleWitnessChoice(ServerPlayer witness, int choice) {
        if (witnessStage != WITNESS_WAITING_FOR_CHOICE || !witness.getUUID().equals(witnessPlayerId)) return;

        if (choice == 0) {
            setState(STATE_KILL);
            witnessStage = WITNESS_EXECUTE_CONFESSOR;
            witnessStageTicks = 20;
            return;
        }

        witnessRefusalCount++;
        if (witnessRefusalCount == 1) {
            witnessStage = WITNESS_REFUSAL_RETREAT;
            witnessStageTicks = WITNESS_REFUSAL_RETREAT_TICKS;
            playSound(ModSounds.CHIGUR_SPEECH_5.get(), 1.0F, 1.0F);
            return;
        }

        if (witnessRefusalCount == 2) {
            witnessStage = WITNESS_REFUSAL_RETREAT;
            witnessStageTicks = WITNESS_REFUSAL_RETREAT_TICKS;
            playSound(ModSounds.CHIGUR_SPEECH_6.get(), 1.0F, 1.0F);
            return;
        }

        witnessStage = WITNESS_FINAL_RETREAT;
        witnessStageTicks = WITNESS_FINAL_RETREAT_TICKS;
    }

    private void clearWitnessSequence() {
        ServerPlayer witness = getWitnessPlayer();
        if (witness != null) ChigurFreezeHandler.release(witness);
        witnessPlayerId = null;
        witnessStage = WITNESS_NONE;
        witnessStageTicks = 0;
        witnessRefusalCount = 0;
        witnessQuestionSpoken = false;
        witnessSearchCooldown = WITNESS_SEARCH_DELAY_TICKS;
    }

    @Override
    public InteractionResult mobInteract(Player player, InteractionHand hand) {
        if (level.isClientSide) return InteractionResult.SUCCESS;
        if (!(player instanceof ServerPlayer serverPlayer)) return InteractionResult.CONSUME;

        // During any directed scene there is no second RMB interaction or dialogue.
        if (ChigurFreezeHandler.isFrozen(serverPlayer)
                || huntStartTicks > 0
                || coinStage != COIN_NONE
                || witnessStage != WITNESS_NONE
                || cinematicTicks > 0
                || isHuntingAnyone()) {
            return InteractionResult.CONSUME;
        }

        ChigurNetwork.openDialog(serverPlayer, getId(), getAggression());
        return InteractionResult.CONSUME;
    }

    public void handleDialogChoice(ServerPlayer player, int choice) {
        if (huntStartTicks > 0 || coinStage != COIN_NONE || witnessStage != WITNESS_NONE || isHuntingAnyone()) return;
        if (distanceToSqr(player) > 36.0D) return;

        if (choice == 0) {
            ChigurAdvancementHelper.grant(player, "27_chigur/dialogue_mistake");
            huntedPlayerId = player.getUUID();
            silentHunt = false;
            setAggression(0);
            setTarget(null);
            huntStartTicks = DIALOGUE_TICKS;
            setState(STATE_OBSERVE);
            getNavigation().stop();
            setDeltaMovement(Vec3.ZERO);
            ChigurFreezeHandler.freeze(player, DIALOGUE_TICKS);
            facePlayerTowardChigur(player);
            getLookControl().setLookAt(player, 30.0F, 30.0F);
            playSound(ModSounds.CHIGUR_SPEECH_1.get(), 1.0F, 1.0F);
            return;
        }

        if (choice == 1) {
            setAggression(getAggression() + 34);
            if (getAggression() >= 100) {
                silentHunt = false;
                huntedPlayerId = player.getUUID();
                witnessSearchCooldown = WITNESS_SEARCH_DELAY_TICKS;
            }
        }
    }

    /** Keeps the player camera on Chigur for every server tick of a scene. */
    private void facePlayerTowardChigur(ServerPlayer player) {
        double dx = getX() - player.getX();
        double dz = getZ() - player.getZ();
        float yaw = (float) (Mth.atan2(dz, dx) * (180.0D / Math.PI)) - 90.0F;
        player.connection.teleport(player.getX(), player.getY(), player.getZ(), yaw, player.getXRot());
    }

    public boolean isHunting(ServerPlayer player) {
        return isHuntingAnyone() && player.getUUID().equals(huntedPlayerId);
    }

    private boolean isHuntingAnyone() {
        return silentHunt || getAggression() >= 100;
    }

    private void resetHunt() {
        huntedPlayerId = null;
        silentHunt = false;
        approachTicks = 0;
        postDialogueHuntDelay = 0;
        setAggression(0);
        setTarget(null);
    }

    /**
     * Called from the bed right-click event during an active personal hunt.
     * The sequence is intentionally immediate: break the bed, stand one block
     * in front of the player, play kill once, execute, then vanish.
     */
    public void startBedCinematic(ServerPlayer player, BlockPos bedPos) {
        huntedPlayerId = player.getUUID();
        breakEntireBed(bedPos);
        teleportInFrontOfPlayer(player);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        faceTargetImmediately(player);

        cinematicTicks = 20;
        setState(STATE_KILL);
        ChigurFreezeHandler.freeze(player, cinematicTicks);
        ChigurNetwork.cinematic(player, cinematicTicks);
        ChigurAdvancementHelper.grant(player, "27_chigur/night_visit");
        playSound(ModSounds.CHIGUR_AIRGUN.get(), 1.0F, 1.0F);
    }

    private void breakEntireBed(BlockPos clickedBedPos) {
        BlockState state = level.getBlockState(clickedBedPos);
        if (!(state.getBlock() instanceof BedBlock)) return;

        Direction facing = state.getValue(BedBlock.FACING);
        BedPart part = state.getValue(BedBlock.PART);
        BlockPos otherPart = part == BedPart.HEAD
                ? clickedBedPos.relative(facing.getOpposite())
                : clickedBedPos.relative(facing);

        // false: this is a destruction scene, not a bed-item duplication/drop.
        level.destroyBlock(clickedBedPos, false);
        if (level.getBlockState(otherPart).getBlock() instanceof BedBlock) {
            level.destroyBlock(otherPart, false);
        }
    }

    private void teleportInFrontOfPlayer(ServerPlayer player) {
        Direction direction = player.getDirection();
        teleportTo(
                player.getX() + direction.getStepX(),
                player.getY(),
                player.getZ() + direction.getStepZ()
        );
    }

    private void tickBedCinematic() {
        ServerPlayer player = getHuntedPlayer();
        if (player != null) {
            getNavigation().stop();
            setDeltaMovement(Vec3.ZERO);
            faceTargetImmediately(player);
            facePlayerTowardChigur(player);
            ChigurFreezeHandler.freeze(player, 2);
        }

        setState(STATE_KILL);
        cinematicTicks--;
        if (cinematicTicks > 0) return;

        if (player != null) {
            killGuaranteed(player);
            ChigurFreezeHandler.release(player);
        }
        vanish();
    }

    @Override
    public boolean hurt(DamageSource source, float amount) {
        if (!level.isClientSide && source.getEntity() instanceof Player player) {
            clearCoinSequence();
            clearWitnessSequence();
            huntStartTicks = 0;
            leavingTicks = 0;
            silentHunt = false;
            setAggression(100);
            huntedPlayerId = player.getUUID();
            witnessSearchCooldown = WITNESS_SEARCH_DELAY_TICKS;
            setTarget(player);
        }
        return super.hurt(source, amount);
    }

    @Nullable
    private ServerPlayer getHuntedPlayer() {
        return getServerPlayer(huntedPlayerId);
    }

    @Nullable
    private ServerPlayer getCoinPlayer() {
        return getServerPlayer(coinPlayerId);
    }

    @Nullable
    private ServerPlayer getWitnessPlayer() {
        return getServerPlayer(witnessPlayerId);
    }

    @Nullable
    private ServerPlayer getServerPlayer(@Nullable UUID playerId) {
        if (playerId == null) return null;
        Player player = level.getPlayerByUUID(playerId);
        return player instanceof ServerPlayer serverPlayer && serverPlayer.isAlive() ? serverPlayer : null;
    }

    @Nullable
    private ServerPlayer findNearbyPlayer() {
        ServerPlayer nearest = null;
        double bestDistance = 32.0D * 32.0D;

        for (Player candidate : level.getEntitiesOfClass(Player.class,
                getBoundingBox().inflate(32.0D), Player::isAlive)) {
            if (!(candidate instanceof ServerPlayer player)) continue;
            double distance = distanceToSqr(player);
            if (distance < bestDistance) {
                nearest = player;
                bestDistance = distance;
            }
        }
        return nearest;
    }

    private boolean isNight() {
        long time = level.getDayTime() % 24_000L;
        return time >= 13_000L && time <= 23_000L;
    }

    private void tickUnseenDespawn() {
        boolean seen = false;
        for (Player player : level.getEntitiesOfClass(Player.class,
                getBoundingBox().inflate(48.0D), Player::isAlive)) {
            if (hasLineOfSight(player)) {
                seen = true;
                break;
            }
        }
        if (seen) {
            unseenTicks = 0;
        } else if (++unseenTicks >= VANISH_AFTER_UNSEEN_TICKS) {
            vanish();
        }
    }

    public void vanish() {
        if (isRemoved() || vanishTicks > 0) return;

        setState(STATE_VANISH);
        getNavigation().stop();
        setDeltaMovement(Vec3.ZERO);
        vanishTicks = VANISH_ANIMATION_TICKS;

        if (level instanceof ServerLevel serverLevel) {
            serverLevel.sendParticles(ParticleTypes.POOF, getX(), getY() + 1.0D, getZ(),
                    24, 0.5D, 0.8D, 0.5D, 0.03D);
        }
        playSound(ModSounds.CHIGUR_VANISH.get(), 0.8F, 1.0F);
    }

    @Override
    public void die(DamageSource source) {
        super.die(source);
        if (!level.isClientSide) {
            spawnAtLocation(new ItemStack(ModItems.CHIGUR_SHOTGUN.get()));
        }
        if (source.getEntity() instanceof ServerPlayer player) {
            ChigurAdvancementHelper.grant(player, "27_chigur/hunter");
        }
    }

    @Override
    public void addAdditionalSaveData(CompoundTag tag) {
        super.addAdditionalSaveData(tag);
        tag.putInt("ChigurAggression", getAggression());
        tag.putInt("ChigurAmmo", getAmmo());
        tag.putBoolean("ChigurCoinUsed", coinWasUsed);
        tag.putBoolean("ChigurSilentHunt", silentHunt);
        tag.putBoolean("ChigurCoinTossHeads", coinTossHeads);
        tag.putInt("ChigurCoinAnimation", getCoinAnimationVariant());
        tag.putLong("ChigurReloadOnDay", reloadOnDay);
        if (huntedPlayerId != null) tag.putUUID("ChigurTarget", huntedPlayerId);
    }

    @Override
    public void readAdditionalSaveData(CompoundTag tag) {
        super.readAdditionalSaveData(tag);
        setAggression(tag.getInt("ChigurAggression"));
        entityData.set(AMMO, tag.contains("ChigurAmmo") ? tag.getInt("ChigurAmmo") : MAX_AMMO);
        coinWasUsed = tag.getBoolean("ChigurCoinUsed");
        silentHunt = tag.getBoolean("ChigurSilentHunt");
        coinTossHeads = tag.getBoolean("ChigurCoinTossHeads");
        entityData.set(COIN_ANIMATION, tag.contains("ChigurCoinAnimation")
                ? tag.getInt("ChigurCoinAnimation")
                : COIN_ANIMATION_HEADS);
        reloadOnDay = tag.contains("ChigurReloadOnDay") ? tag.getLong("ChigurReloadOnDay") : -1L;
        huntedPlayerId = tag.hasUUID("ChigurTarget") ? tag.getUUID("ChigurTarget") : null;
    }

    @Override
    public void registerControllers(AnimationData data) {
        data.addAnimationController(new AnimationController<>(this, "chigur_main", 5, this::animationPredicate));
    }

    private <P extends IAnimatable> PlayState animationPredicate(AnimationEvent<P> event) {
        String animation = switch (getState()) {
            case STATE_SHOOT -> "animation.chigur.shoot";
            case STATE_RELOAD -> "animation.chigur.reload";
            case STATE_COIN -> getCoinAnimationVariant() == COIN_ANIMATION_HEADS
                    ? "animation.chigur.coin"
                    : "animation.chigur.coin2";
            case STATE_KILL -> "animation.chigur.kill";
            case STATE_VANISH -> "animation.chigur.vanish";
            case STATE_STALK -> "animation.chigur.stalk";
            case STATE_WALK -> "animation.chigur.walk";
            default -> event.isMoving() ? "animation.chigur.walk" : "animation.chigur.idle";
        };

        boolean loop = getState() == STATE_IDLE
                || getState() == STATE_OBSERVE
                || getState() == STATE_STALK
                || getState() == STATE_WALK
                || event.isMoving();
        event.getController().setAnimation(new AnimationBuilder().addAnimation(animation,
                loop ? ILoopType.EDefaultLoopTypes.LOOP : ILoopType.EDefaultLoopTypes.PLAY_ONCE));
        return PlayState.CONTINUE;
    }

    @Override
    public AnimationFactory getFactory() {
        return animationFactory;
    }
}
