package com.example.zitraksmode.entities;

import com.example.zitraksmode.ModBlocks;
import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.items.ScooterItem;
import com.example.zitraksmode.util.ScooterAdvancementHelper;
import com.example.zitraksmode.util.ScooterMassHelper;
import com.example.zitraksmode.util.ScooterSkin;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntitySelector;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.MoverType;
import net.minecraft.world.entity.Pose;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.network.NetworkHooks;
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
import java.util.ArrayList;
import java.util.List;

/**
 * Пятиместный самокат. Обычный {@link Entity}, НЕ LivingEntity.
 *
 * Места (entity-local: +Z = нос, согласовано с renderer 180-yaw и моделью nose=-Z):
 *  0 driver  — bone player1
 *  1 mid     — bone player2
 *  2 tail    — bone player3
 *  3 left    — между 1 и 2, вылет влево ~45°
 *  4 right   — между 1 и 2, вылет вправо ~45°
 *
 * Гео-модель не меняется: кости player4/5 не требуются.
 */
public class ScooterEntity extends Entity implements IAnimatable {

    // ===================== БАЛАНС (промпт) =====================

    /**
     * Ёмкость батареи (абсолютные «единицы»). На процент почти не влияет,
     * если RANGE задан отдельно — см. FULL_TANK_RANGE_BLOCKS.
     *
     * ВАЖНО: НЕ крути только MAX_CHARGE, думая что «станет дальше».
     * Раньше было drain = dist * (MAX/500) → 100% всегда = 500 блоков
     * (~22 сек на 80 км/ч), сколько ни ставь MAX.
     */
    public static final int MAX_CHARGE = 1_000_000;

    /**
     * Запас хода на полном баке, в блоках по прямой (крейсер).
     * 80 км/ч ≈ 22.2 блока/сек →
     *   500   блоков ≈ 22 сек
     *   5000  блоков ≈ 3.7 мин
     *   15000 блоков ≈ 11 мин   ← комфортный дефолт
     *   30000 блоков ≈ 22 мин
     * КРУТИ ЭТО, если «быстро кончается».
     */
    public static final float FULL_TANK_RANGE_BLOCKS = 15_000.0F;

    /** Сколько единиц заряда снимать за 1 пройденный блок. */
    private static final float CHARGE_PER_BLOCK = MAX_CHARGE / FULL_TANK_RANGE_BLOCKS;

    /** Прочность. Отдельно от зарядки. */
    public static final int MAX_DURABILITY = 500;

    /**
     * Цифры спидометра: 1 единица DATA_SPEED = 72 «отображаемых» км/ч.
     * Реальное перемещение в мире = speed * MOVE_SCALE (0.5 = в 2 раза медленнее фактом).
     * Т.е. на HUD 80 км/ч, а едет как ~40 км/ч ванили.
     */
    private static final float KMH_PER_SPEED = 72.0F;
    /** Физика в 2 раза медленнее цифр. */
    public static final float MOVE_SCALE = 0.5F;

    private static final float MAX_FORWARD_SPEED = 80.0F / KMH_PER_SPEED; // display 80 на ровной
    private static final float MAX_REVERSE_SPEED = 18.0F / KMH_PER_SPEED;
    /** Только анти-бесконечность, не лимит геймплея (~500 display км/ч). */
    private static final float RUNAWAY_CAP_SPEED = 500.0F / KMH_PER_SPEED;

    private static final float BASE_ACCEL = 0.032F; // чуть живее разгон (цифры)
    private static final float BRAKE_FORCE = 0.085F;
    private static final float NATURAL_FRICTION = 0.965F;
    private static final float WATER_FRICTION = 0.88F;

    private static final float WALL_CRASH_KMH = 20.0F;
    /** Минимальная скорость для пробития мягких блоков */
    private static final float DIG_MIN_KMH = 22.0F;
    private static final float HITBOX_WIDTH = 1.35F;
    private static final float HITBOX_HEIGHT = 0.5F;
    private static final float HITBOX_LENGTH = 1.70F;

    /**
     * Сиденья в entity-local пространстве.
     * Центры player1/2/3 посчитаны из geometry.scooter (Z инвертирован model→entity).
     * 4 и 5 — между 1 и 2 по Z, вынесены вбок по диагонали 45°.
     */
    private static final Vec3[] SEAT_LOCAL = {
            new Vec3(0.00D, 0.32D, 0.40D),  // 0 driver  (player1)
            new Vec3(0.00D, 0.32D, -0.15D), // 1 mid     (player2)
            new Vec3(0.00D, 0.32D, -0.67D), // 2 tail    (player3)
            // Между driver(z=0.40) и player2(z=-0.15): zMid = 0.125
            // Вылезают вбок под 45°: смещение r=0.55 вдоль перпендикуляра + лёгкий сдвиг
            // left  = (-r·cos45, y, zMid) ; right = (+r·cos45, y, zMid)
            // cos45≈0.707 → lateral ≈ 0.39; для читаемого «вылета» берём r_lat=0.50
            new Vec3(-0.50D, 0.32D, 0.125D), // 3 left  (тело -45°)
            new Vec3( 0.50D, 0.32D, 0.125D)  // 4 right (тело +45°)
    };

    /** Доп. поворот тела пассажира (градусы): 4/5 смотрят наружу под 45°. */
    private static final float[] SEAT_BODY_YAW_OFFSET = {
            0.0F, 0.0F, 0.0F, -45.0F, 45.0F
    };

    // ===================== DATA =====================

    private static final EntityDataAccessor<Integer> DATA_SKIN =
            SynchedEntityData.defineId(ScooterEntity.class, EntityDataSerializers.INT);
    private static final EntityDataAccessor<Integer> DATA_CHARGE =
            SynchedEntityData.defineId(ScooterEntity.class, EntityDataSerializers.INT);
    private static final EntityDataAccessor<Integer> DATA_DURABILITY =
            SynchedEntityData.defineId(ScooterEntity.class, EntityDataSerializers.INT);
    private static final EntityDataAccessor<Float> DATA_SPEED =
            SynchedEntityData.defineId(ScooterEntity.class, EntityDataSerializers.FLOAT);
    /** Синхронизированный крен (Z) для клиентов/пассажиров, градусы. */
    private static final EntityDataAccessor<Float> DATA_ROLL =
            SynchedEntityData.defineId(ScooterEntity.class, EntityDataSerializers.FLOAT);
    /** Наклон нос вверх/вниз (X), градусы. + = нос вниз (спуск). clamp ±45. */
    private static final EntityDataAccessor<Float> DATA_PITCH =
            SynchedEntityData.defineId(ScooterEntity.class, EntityDataSerializers.FLOAT);

    private final AnimationFactory factory = GeckoLibUtil.createFactory(this);

    private boolean inputForward;
    private boolean inputBack;
    private boolean inputLeft;
    private boolean inputRight;

    private float impactMemory;
    private int hornCooldown;
    private int mobHitCooldown;
    private int scooterHitCooldown;
    private boolean speedAchievementGranted;

    /** Сглаженный крен — без дёрганья модели на каждом тике. */
    private float smoothRoll;
    private float prevSmoothRoll;
    /** Сглаженный pitch (нос вверх/вниз). */
    private float smoothPitch;
    private float prevSmoothPitch;
    /** Сглаженная скорость поворота (для стабильного visual roll). */
    private float smoothYawRate;
    /** Текущий уклон dy/dist (отриц. = спуск), для физики. */
    private float currentGrade;

    /** Предыдущая горизонтальная скорость для оценки оси столкновения. */
    private double prevMoveX;
    private double prevMoveZ;

    /** Накопитель зарядки на порту (дробные единицы). */
    private float chargeAccum;
    /** Накопитель расхода в езде (дробные единицы). */
    private float chargeDrainAccum;

    public ScooterEntity(EntityType<? extends ScooterEntity> type, Level level) {
        super(type, level);
        this.blocksBuilding = true;
        this.maxUpStep = 1.1F;
    }

    // ===================== VANILLA OVERRIDES =====================

    @Override
    protected void defineSynchedData() {
        this.entityData.define(DATA_SKIN, ScooterSkin.DEFAULT.getId());
        this.entityData.define(DATA_CHARGE, MAX_CHARGE);
        this.entityData.define(DATA_DURABILITY, MAX_DURABILITY);
        this.entityData.define(DATA_SPEED, 0.0F);
        this.entityData.define(DATA_ROLL, 0.0F);
        this.entityData.define(DATA_PITCH, 0.0F);
    }

    @Override
    public EntityDimensions getDimensions(Pose pose) {
        // Чуть уже — меньше залипаний в углах/текстурах
        return EntityDimensions.scalable(1.15F, 0.55F);
    }

    @Override
    public void readAdditionalSaveData(CompoundTag tag) {
        setSkinId(tag.getInt("ScooterSkin"));
        setCharge(tag.contains("ScooterCharge") ? tag.getInt("ScooterCharge") : MAX_CHARGE);
        setDurability(tag.contains("ScooterDurability") ? tag.getInt("ScooterDurability") : MAX_DURABILITY);
        this.entityData.set(DATA_SPEED, tag.getFloat("ScooterSpeed"));
        this.speedAchievementGranted = tag.getBoolean("ScooterSpeedAchievementGranted");
    }

    @Override
    public void addAdditionalSaveData(CompoundTag tag) {
        tag.putInt("ScooterSkin", getSkinId());
        tag.putInt("ScooterCharge", getCharge());
        tag.putInt("ScooterDurability", getDurability());
        tag.putFloat("ScooterSpeed", getCurrentSpeed());
        tag.putBoolean("ScooterSpeedAchievementGranted", this.speedAchievementGranted);
    }

    @Override
    public Packet<?> getAddEntityPacket() {
        return NetworkHooks.getEntitySpawningPacket(this);
    }

    @Override
    public boolean isPickable() {
        return true;
    }

    @Override
    public boolean canBeCollidedWith() {
        return true;
    }

    @Override
    public boolean isPushable() {
        return true;
    }

    // ===================== TICK =====================

    @Override
    public void tick() {
        this.yRotO = this.getYRot();
        this.xRotO = this.getXRot();
        super.tick();

        // НЕ перетираем AABB каждый тик квадратом — из-за этого «застревание в текстурах» и дёрганье.
        // Хитбокс = getDimensions() / makeBoundingBox.

        // Все пассажиры стоят (не сидят)
        forcePassengersStanding();

        if (hornCooldown > 0) hornCooldown--;
        if (mobHitCooldown > 0) mobHitCooldown--;
        if (scooterHitCooldown > 0) scooterHitCooldown--;
        this.fallDistance = 0.0F;

        if (!this.isAlive()) return;

        if (!this.level.isClientSide) {
            handleCharging();
        }

        tickMovement();

        if (!this.level.isClientSide) {
            handleEnvironmentEffects();
            // Только листва/трава впереди (не земля) — пока едем
            if (Math.abs(getCurrentSpeed()) > 0.06F) {
                clearFoliageAhead(false);
            }
            tryBoardNearbyMobs();
            handleMobCollisions();
            handleScooterCollisions();

            if (this.horizontalCollision) {
                // Листва → снести. Мягкие блоки → покопать. ИНАЧЕ/всегда → slide, БЕЗ eject.
                clearFoliageAhead(true);
                float speedKmh = getDisplaySpeedKmh();
                if (speedKmh > WALL_CRASH_KMH) {
                    tryDigSoftWall(speedKmh); // только dig, никогда eject
                }
                // На любой скорости (в т.ч. 55+) — скольжение, пассажиры на борту
                slideAlongWall();
            }

            if (getDurability() <= 0) {
                breakScooter(true);
            }
        }
    }

    /** Принудительно Pose.STANDING у всех на борту. */
    private void forcePassengersStanding() {
        for (Entity passenger : this.getPassengers()) {
            if (passenger instanceof LivingEntity living) {
                living.setPose(Pose.STANDING);
            }
        }
    }

    // ===================== MOVEMENT =====================

    private void tickMovement() {
        Entity driver = getDriver();
        float speed = getCurrentSpeed();
        int passengerCount = this.getPassengers().size();
        double totalMass = getTotalMass();

        // Step как у лодки — стабильно
        if (passengerCount <= 3) this.maxUpStep = 1.0F;
        else if (passengerCount == 4) this.maxUpStep = 0.6F;
        else this.maxUpStep = 0.5F;

        // Клиент: только сглаживание synced tilt (без физики) + prev для lerp
        if (this.level.isClientSide) {
            this.prevSmoothPitch = this.smoothPitch;
            this.prevSmoothRoll = this.smoothRoll;
            this.smoothPitch += (getSyncedPitch() - this.smoothPitch) * 0.40F;
            this.smoothRoll += (getSyncedRoll() - this.smoothRoll) * 0.40F;
            return;
        }

        float slopeFactor = updateSlopeAndPitch(passengerCount, totalMass);
        float maxForward = MAX_FORWARD_SPEED * slopeFactor;
        float maxReverse = MAX_REVERSE_SPEED;
        boolean hasPower = getCharge() > 0;

        float grade = this.currentGrade; // +вверх −вниз
        float downFactor = grade < -0.04F ? Mth.clamp(-grade / 0.65F, 0.0F, 1.0F) : 0.0F;
        float upFactor = grade > 0.04F ? Mth.clamp(grade / 0.65F, 0.0F, 1.0F) : 0.0F;

        // Масса: сильное влияние (4 голема mass~33 → heavy≈1)
        float heavy = Mth.clamp((float) ((totalMass - 1.0D) / 24.0D), 0.0F, 1.0F);
        // спуск: тяжёлые разгоняются сильнее; подъём/разгон: тяжелее = тупее
        float massAccelMul = Mth.lerp(heavy, 1.0F, 0.45F);          // разгон по ровной
        float massDownMul = Mth.lerp(heavy, 1.0F, 1.85F);           // накат с горы
        float massUpMul = Mth.lerp(heavy, 1.0F, 0.35F);             // в гору
        float massTurnMul = Mth.lerp(heavy, 1.0F, 0.40F);           // руль
        float packBoost = 1.0F + passengerCount * 0.08F + heavy * 0.55F;

        float accel = BASE_ACCEL * massAccelMul;
        if (downFactor > 0.0F) accel *= 1.0F + 0.70F * downFactor * packBoost * massDownMul;
        else if (upFactor > 0.0F) accel *= (1.0F - 0.30F * upFactor) * massUpMul;

        float targetSpeed = speed;
        if (driver instanceof Player && hasPower) {
            boolean isFwd = this.inputForward;
            boolean isBack = this.inputBack;
            boolean isLft = this.inputLeft;
            boolean isRgt = this.inputRight;

            if (isFwd) {
                targetSpeed = speed + accel;
                if (downFactor > 0.0F) {
                    targetSpeed += BASE_ACCEL * 0.55F * downFactor * packBoost * massDownMul;
                }
            } else if (isBack) {
                // тяжёлые хуже тормозят
                float brake = BRAKE_FORCE * Mth.lerp(heavy, 1.0F, 0.55F);
                targetSpeed = speed > 0.03F ? speed - brake : speed - accel * 1.15F;
            } else if (downFactor > 0.0F) {
                // накат: тяжёлые почти не теряют скорость + сильный гравитационный push
                targetSpeed = speed * Mth.lerp(downFactor, NATURAL_FRICTION, Mth.lerp(heavy, 0.992F, 0.998F))
                        + BASE_ACCEL * 0.75F * downFactor * packBoost * massDownMul;
            } else if (upFactor > 0.0F) {
                targetSpeed = speed * Mth.lerp(upFactor, NATURAL_FRICTION, Mth.lerp(heavy, 0.94F, 0.88F));
            } else {
                targetSpeed = speed * NATURAL_FRICTION;
            }

            // Поворот резче (управление), visual roll сглаживается отдельно
            float turnSpeed = 8.5F * massTurnMul;
            if (Math.abs(speed) > 0.12F) turnSpeed = 10.5F * massTurnMul;
            if (Math.abs(speed) > 1.0F) turnSpeed *= 0.88F; // на очень высокой — чуть тяжелее
            if (passengerCount >= 5) turnSpeed *= 0.72F;
            else if (passengerCount == 4) turnSpeed *= 0.90F;

            float turn = 0.0F;
            if (isLft) turn -= turnSpeed;
            if (isRgt) turn += turnSpeed;
            if (speed < -0.01F) turn = -turn;
            this.setYRot(this.getYRot() + turn);
        } else if (downFactor > 0.0F) {
            targetSpeed = speed * Mth.lerp(heavy, 0.994F, 0.998F)
                    + BASE_ACCEL * 0.80F * downFactor * packBoost * massDownMul;
        } else {
            targetSpeed = speed * NATURAL_FRICTION;
        }

        if (Math.abs(targetSpeed) < 0.005F) targetSpeed = 0.0F;
        // сглаживание: тяжёлые инертнее
        float smooth = Mth.lerp(heavy, 0.34F, 0.18F);
        speed = speed + (targetSpeed - speed) * smooth;

        boolean downhill = downFactor > 0.04F || (this.yo - this.getY()) > 0.02D;
        if (downhill) speed = Mth.clamp(speed, -maxReverse, RUNAWAY_CAP_SPEED);
        else speed = Mth.clamp(speed, -maxReverse, maxForward);

        // --- Движение: XZ + сильный прижим на скорости/спуске (анти-полёт 150+) ---
        Vec3 forward = getForwardVector();
        double moveSpeed = (double) speed * (double) MOVE_SCALE;
        double mx = forward.x * moveSpeed;
        double mz = forward.z * moveSpeed;

        // display km/h для прижима
        float kmhNow = Math.abs(speed) * KMH_PER_SPEED;
        // чем быстрее / тяжелее / круче спуск — тем сильнее «прилипание»
        float grip = 0.0F;
        if (downhill) grip += 0.35F + 0.45F * downFactor;
        if (kmhNow > 80.0F) grip += Mth.clamp((kmhNow - 80.0F) / 120.0F, 0.0F, 0.55F);
        grip += heavy * 0.35F;
        grip = Mth.clamp(grip, 0.0F, 1.15F);

        double yMotion;
        if (this.isInWater()) {
            yMotion = Math.max(-0.10D, this.getDeltaMovement().y - 0.03D);
        } else if (this.onGround) {
            // на земле: лёгкий прижим (не 0 — чтобы не «трамплинить» со ступенек вниз)
            // тяжёлые + спуск + скорость → сильнее вниз
            yMotion = -0.04D - 0.10D * grip;
        } else {
            // в воздухе: сильная гравитация на скорости, иначе «едет вперёд по воздуху»
            double g = 0.10D + 0.16D * grip;
            yMotion = this.getDeltaMovement().y - g;
            if (yMotion < -1.05D) yMotion = -1.05D;
            // лёгкий air-drag только когда высоко и быстро (не режем накат по склону)
            if (!this.onGround && kmhNow > 100.0F) {
                double drag = Mth.lerp(grip, 0.985D, 0.96D);
                mx *= drag;
                mz *= drag;
            }
        }

        this.prevMoveX = mx;
        this.prevMoveZ = mz;
        this.setDeltaMovement(mx, yMotion, mz);
        this.move(MoverType.SELF, this.getDeltaMovement());

        // Посадка + дожим вниз на спуске/скорости
        stickForHighSpeed(downhill, kmhNow, heavy);

        // заряд
        if (Math.abs(speed) > 0.001F && hasPower) {
            double dx = this.getX() - this.xo;
            double dz = this.getZ() - this.zo;
            double moved = Math.sqrt(dx * dx + dz * dz);
            if (moved > 0.001D) {
                float drainMul = 1.0F;
                if (slopeFactor < 0.85F) drainMul += 0.20F;
                if (totalMass >= 5.0D) drainMul += 0.10F;
                this.chargeDrainAccum += (float) moved * CHARGE_PER_BLOCK * drainMul;
                if (this.chargeDrainAccum >= 1.0F) {
                    int drain = (int) this.chargeDrainAccum;
                    this.chargeDrainAccum -= drain;
                    setCharge(Math.max(0, getCharge() - drain));
                }
            }
        }

        // yaw без скачка через ±180 в одном тике больше ~90°
        float wrapped = Mth.wrapDegrees(this.getYRot());
        this.setYRot(wrapped);
        this.setXRot(0.0F);

        setSpeedValue(speed);
        this.impactMemory = Math.max(this.impactMemory * 0.88F, Math.abs(speed));

        // --- Visual tilt: сильный low-pass, чтобы модель не дёргалась ---
        // (руль резкий, а крен/pitch картинки — инерционные)
        this.prevSmoothRoll = this.smoothRoll;
        this.prevSmoothPitch = this.smoothPitch;

        float dYaw = Mth.wrapDegrees(this.getYRot() - this.yRotO);
        this.smoothYawRate += (dYaw - this.smoothYawRate) * 0.28F;
        float targetRoll = Mth.clamp(this.smoothYawRate * 0.55F, -10.0F, 10.0F);
        if (passengerCount == 4) targetRoll -= 2.0F;
        // тяжёлые кренятся меньше
        targetRoll *= Mth.lerp(heavy, 1.0F, 0.65F);

        this.smoothRoll += (targetRoll - this.smoothRoll) * 0.18F;
        if (Math.abs(this.smoothRoll) < 0.15F) this.smoothRoll = 0.0F;

        // pitch уже сглажен в updateSlopeAndPitch; ещё раз мягко
        if (Math.abs(this.smoothPitch) < 0.20F) this.smoothPitch = 0.0F;

        this.entityData.set(DATA_ROLL, this.smoothRoll);
        this.entityData.set(DATA_PITCH, this.smoothPitch);

        // Ачивка 100+ км/ч по спидометру
        if (driver instanceof ServerPlayer sp && getDisplaySpeedKmh() >= 99.5F) {
            if (!this.speedAchievementGranted) {
                // пробуем несколько id — как файл лежит в datapack
                boolean ok = ScooterAdvancementHelper.grant(sp,
                        "24_scooter/speed_320",
                        "24_scooter/speed_100",
                        "scooter/speed_320",
                        "scooter/speed_100");
                if (ok) {
                    this.speedAchievementGranted = true;
                }
            }
        }
    }

    /**
     * Скольжение по стене (boat/car style): обнуляем нормаль к стене, оставляем тангент.
     * НИКОГДА не eject пассажиров (55, 100, 150+ — без разницы).
     */
    private void slideAlongWall() {
        Vec3 m = this.getDeltaMovement();
        // Если почти стоим — просто чуть гасим
        double h2 = m.x * m.x + m.z * m.z;
        if (h2 < 1.0E-6D) {
            setSpeedValue(getCurrentSpeed() * 0.9F);
            return;
        }

        // Оценка нормали стены: куда «съели» движение
        double ax = Math.abs(this.prevMoveX);
        double az = Math.abs(this.prevMoveZ);
        boolean hitX = ax > 1.0E-4D && Math.abs(m.x) < ax * 0.5D;
        boolean hitZ = az > 1.0E-4D && Math.abs(m.z) < az * 0.5D;
        if (!hitX && !hitZ) {
            // fallback — гасим вперёд
            hitX = true;
            hitZ = true;
        }

        double nx = hitX ? 0.0D : m.x;
        double nz = hitZ ? 0.0D : m.z;
        // лёгкое трение о стену
        nx *= 0.92D;
        nz *= 0.92D;
        this.setDeltaMovement(nx, m.y, nz);

        // DATA_SPEED плавно, не в ноль (иначе «дёрганье» и слёт логики)
        float s = getCurrentSpeed();
        float keep = (hitX && hitZ) ? 0.55F : 0.82F;
        float newS = s * keep;
        if (Math.abs(newS) < 0.015F) newS = 0.0F;
        setSpeedValue(newS);
        this.impactMemory *= 0.75F;
    }

    /**
     * Прижим к земле: на 150+ / спуске / тяжёлой загрузке — сильнее вниз,
     * но БЕЗ look-ahead (look-ahead = полёт «вперёд»).
     */
    private void stickForHighSpeed(boolean downhill, float kmh, float heavy) {
        if (this.isInWater()) return;

        double ground = sampleGroundY(this.getX(), this.getY() + 1.0D, this.getZ());
        double feet = this.getY();
        double gap = feet - ground;

        if (gap < -0.02D && gap > -0.45D) {
            this.setPos(this.getX(), ground, this.getZ());
            this.onGround = true;
            return;
        }

        // max gap to stick: растёт со скоростью/спуском/массой, но capped
        double maxGap = 0.30D
                + (downhill ? 0.55D : 0.0D)
                + Math.min(0.70D, Math.max(0.0D, (kmh - 60.0D) / 100.0D) * 0.55D)
                + heavy * 0.35D;

        if (gap >= 0.0D && gap <= maxGap) {
            // чем больше gap/скорость — тем жёстче snap (но lerp, не телепорт-щелчок)
            double t = 0.50D + Math.min(0.40D, gap * 0.8D) + (kmh > 120.0F ? 0.15D : 0.0D);
            t = Mth.clamp((float) t, 0.45F, 0.92F);
            double newY = feet + (ground - feet) * t;
            if (newY < ground) newY = ground;
            this.setPos(this.getX(), newY, this.getZ());
            Vec3 m = this.getDeltaMovement();
            this.setDeltaMovement(m.x, Math.min(0.0D, m.y), m.z);
            this.onGround = true;
        } else if (gap > maxGap && gap < maxGap + 0.80D && (downhill || kmh > 100.0F)) {
            // оторвался — дотягиваем вниз сильнее
            double pull = Math.min(0.40D + heavy * 0.15D, gap * 0.55D);
            double newY = feet - pull;
            if (newY < ground) newY = ground;
            this.setPos(this.getX(), newY, this.getZ());
            Vec3 m = this.getDeltaMovement();
            this.setDeltaMovement(m.x, Math.min(-0.05D, m.y), m.z);
            this.onGround = (this.getY() - ground) < 0.08D;
        }
    }

    private void settleGently() {
        stickForHighSpeed(this.currentGrade < -0.04F, getDisplaySpeedKmh(), 0.0F);
    }

    private void landIfCloseToGround(float speed) {
        stickForHighSpeed(this.currentGrade < -0.04F, Math.abs(speed) * KMH_PER_SPEED, 0.0F);
    }

    private void stickSmoothToGround(boolean downhill, float absSpeed) {
        stickForHighSpeed(downhill, absSpeed * KMH_PER_SPEED, 0.0F);
    }

    /**
     * Уклон + pitch.
     * grade > 0 = едем ВВЕРХ, grade < 0 = ВНИЗ.
     * DATA_PITCH: + = нос ВНИЗ, − = нос ВВЕРХ (для renderer с PITCH_SIGN).
     *
     * На ступеньках heightmap врёт → смешиваем с фактическим dy за тик.
     */
    private float updateSlopeAndPitch(int passengerCount, double totalMass) {
        Vec3 forward = getForwardVector();

        double yProbe = this.getY() + 1.25D;
        double g0 = sampleGroundY(this.getX(), yProbe, this.getZ());
        double gNear = sampleGroundY(this.getX() + forward.x * 0.9D, yProbe, this.getZ() + forward.z * 0.9D);
        double gFar = sampleGroundY(this.getX() + forward.x * 1.8D, yProbe, this.getZ() + forward.z * 1.8D);
        double gBack = sampleGroundY(this.getX() - forward.x * 0.9D, yProbe, this.getZ() - forward.z * 0.9D);

        double gradeFwd = ((gNear - g0) / 0.9D) * 0.4D + ((gFar - g0) / 1.8D) * 0.6D;
        double gradeBack = (g0 - gBack) / 0.9D;
        double grade = gradeFwd * 0.8D + gradeBack * 0.2D;

        // motion grade — меньше веса (шум = дёрганье pitch)
        double movedXz = Math.sqrt(
                (this.getX() - this.xo) * (this.getX() - this.xo)
                        + (this.getZ() - this.zo) * (this.getZ() - this.zo));
        double movedY = this.getY() - this.yo;
        if (movedXz > 0.05D) {
            double gradeMotion = Mth.clamp(movedY / movedXz, -1.0D, 1.0D);
            grade = grade * 0.65D + gradeMotion * 0.35D;
        }

        if (!this.onGround && Math.abs(this.getDeltaMovement().y) > 0.08D) {
            double airG = Mth.clamp(this.getDeltaMovement().y * 1.8D, -1.0D, 1.0D);
            grade = grade * 0.4D + airG * 0.6D;
        }

        // clamp изменение grade за тик — главный анти-jitter модели
        float newGrade = (float) Mth.clamp(grade, -1.10D, 1.10D);
        float dg = newGrade - this.currentGrade;
        this.currentGrade += Mth.clamp(dg, -0.07F, 0.07F);

        float targetPitch = (float) -Math.toDegrees(Math.atan(this.currentGrade));
        targetPitch = Mth.clamp(targetPitch, -20.0F, 20.0F);
        this.smoothPitch += (targetPitch - this.smoothPitch) * 0.14F;
        if (Math.abs(this.smoothPitch) < 0.20F) this.smoothPitch = 0.0F;

        // --- slopeFactor для max speed (как раньше по смыслу, но от дробного grade) ---
        float massBoost = (float) Mth.clamp((totalMass - 1.0D) / 10.0D, 0.0D, 2.0D);

        if (this.currentGrade > 0.06F) {
            // В горку / на рампу
            float steep = Mth.clamp(this.currentGrade / 0.70F, 0.0F, 1.0F);
            float byCount;
            switch (passengerCount) {
                case 0:
                case 1:
                    byCount = 0.90F;
                    break;
                case 2:
                    byCount = 0.80F;
                    break;
                case 3:
                    byCount = 0.70F;
                    break;
                case 4:
                    byCount = 0.58F;
                    break;
                default:
                    byCount = 0.45F;
                    break;
            }
            // чем круче — тем сильнее штраф
            float base = Mth.lerp(steep, 1.0F, byCount);
            return Mth.clamp(base - massBoost * 0.10F * steep, 0.28F, 1.0F);
        }

        if (this.currentGrade < -0.06F) {
            // Спуск: factor только для «ровной» ветки не используется как hard cap
            // (на спуске hardCap = RUNAWAY). Оставляем высокий boost для maxForward fallback.
            float steep = Mth.clamp(-this.currentGrade / 0.50F, 0.0F, 1.0F);
            float byCount = 1.4F + passengerCount * 0.25F; // 5 → 2.65
            float byMass = 1.4F + massBoost * 1.4F;
            float boost = Math.max(byCount, byMass) + (byCount - 1.0F) * massBoost * 0.5F;
            boost = Mth.lerp(steep, 1.35F, boost);
            return Mth.clamp(boost, 1.25F, 6.0F); // display до ~480, fact *0.5
        }

        // почти прямо
        if (passengerCount >= 5) return 0.98F;
        if (passengerCount == 4) return 0.99F;
        return 1.0F;
    }

    /** Высота верха твёрдого блока под (x,y,z), double для полублоков. */
    private double sampleGroundY(double x, double y, double z) {
        int bx = Mth.floor(x);
        int bz = Mth.floor(z);
        int startY = Mth.floor(y + 0.5D);
        for (int dy = 0; dy <= 6; dy++) {
            int iy = startY - dy;
            BlockPos pos = new BlockPos(bx, iy, bz);
            BlockState state = this.level.getBlockState(pos);
            if (state.isAir()) continue;
            var shape = state.getCollisionShape(this.level, pos);
            if (shape.isEmpty()) continue;
            // верх коллизии блока
            return iy + shape.max(Direction.Axis.Y);
        }
        return y;
    }

    /** Для crash power и т.п. — factor от уже посчитанного currentGrade (без повторного sample). */
    private float getSlopeFactor(int passengerCount, double totalMass) {
        float massBoost = (float) Mth.clamp((totalMass - 1.0D) / 10.0D, 0.0D, 2.0D);
        if (this.currentGrade > 0.06F) {
            float steep = Mth.clamp(this.currentGrade / 0.70F, 0.0F, 1.0F);
            float byCount = passengerCount <= 1 ? 0.90F
                    : passengerCount == 2 ? 0.80F
                    : passengerCount == 3 ? 0.70F
                    : passengerCount == 4 ? 0.58F : 0.45F;
            return Mth.clamp(Mth.lerp(steep, 1.0F, byCount) - massBoost * 0.10F * steep, 0.28F, 1.0F);
        }
        if (this.currentGrade < -0.06F) {
            float steep = Mth.clamp(-this.currentGrade / 0.50F, 0.0F, 1.0F);
            float byCount = 1.4F + passengerCount * 0.25F;
            float byMass = 1.4F + massBoost * 1.4F;
            float boost = Math.max(byCount, byMass) + (byCount - 1.0F) * massBoost * 0.5F;
            return Mth.clamp(Mth.lerp(steep, 1.35F, boost), 1.25F, 6.0F);
        }
        return passengerCount >= 5 ? 0.98F : (passengerCount == 4 ? 0.99F : 1.0F);
    }

    public float computeVisualRoll() {
        return Mth.clamp(this.smoothYawRate * 0.55F, -10.0F, 10.0F);
    }

    // ===================== CHARGE =====================

    /**
     * Зарядка 1% в секунду на порту (или на блоке над/под портом).
     * Ищем порт в радиусе 2 блоков по XZ и ±1 по Y — самокат не обязан
     * стоять «впиксель» на порту.
     */
    private boolean handleCharging() {
        if (getCharge() >= MAX_CHARGE) return false;
        // можно чуть катиться / стоять
        if (Math.abs(getCurrentSpeed()) > 0.08F) return false;

        if (!isNearChargingPort()) return false;

        // 1% / сек = MAX_CHARGE/100 за 20 тиков → MAX_CHARGE/2000 за тик
        this.chargeAccum += MAX_CHARGE / 2000.0F;
        if (this.chargeAccum >= 1.0F) {
            int add = (int) this.chargeAccum;
            this.chargeAccum -= add;
            setCharge(Math.min(MAX_CHARGE, getCharge() + add));
        }
        return true;
    }

    public boolean isNearChargingPort() {
        BlockPos base = this.blockPosition();
        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
                for (int dz = -2; dz <= 2; dz++) {
                    BlockPos check = base.offset(dx, dy, dz);
                    if (this.level.getBlockState(check).is(ModBlocks.CHARGING_PORT.get())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // ===================== ENVIRONMENT =====================

    private void handleEnvironmentEffects() {
        BlockState below = this.level.getBlockState(this.blockPosition().below());
        BlockState at = this.level.getBlockState(this.blockPosition());

        if (at.is(Blocks.HONEY_BLOCK) || below.is(Blocks.HONEY_BLOCK)
                || at.is(Blocks.HONEYCOMB_BLOCK) || below.is(Blocks.HONEYCOMB_BLOCK)) {
            setSpeedValue(getCurrentSpeed() * 0.55F);
            this.setDeltaMovement(this.getDeltaMovement().multiply(0.55D, 1.0D, 0.55D));
        }

        if (at.is(Blocks.HAY_BLOCK) || below.is(Blocks.HAY_BLOCK)) {
            setSpeedValue(getCurrentSpeed() * 0.75F);
            this.setDeltaMovement(this.getDeltaMovement().multiply(0.75D, 1.0D, 0.75D));
        }

        // Слизь: угол падения = угол отражения, скорость сохраняется
        if ((at.is(Blocks.SLIME_BLOCK) || below.is(Blocks.SLIME_BLOCK))
                && this.horizontalCollision
                && this.impactMemory > 0.15F) {
            reflectOffWall(true);
            this.level.playSound(null, this.blockPosition(), SoundEvents.SLIME_BLOCK_HIT, SoundSource.BLOCKS, 1.0F, 1.0F);
        }

        if (this.isInWater()) {
            this.setDeltaMovement(this.getDeltaMovement().multiply(WATER_FRICTION, 0.92D, WATER_FRICTION));
            // Быстро ломается в воде: ~4 HP/сек при 200 HP ≈ 50 сек до смерти
            if (this.tickCount % 5 == 0) {
                damageDurability(1);
            }
        }
    }

    /**
     * Отражение velocity от стены. Сохраняет модуль горизонтальной скорости.
     * @param keepSpeed если true — DATA_SPEED не режется (слизь)
     */
    private void reflectOffWall(boolean keepSpeed) {
        Vec3 motion = this.getDeltaMovement();
        double mx = motion.x;
        double mz = motion.z;
        double mag = Math.sqrt(mx * mx + mz * mz);
        if (mag < 1.0E-4D) return;

        // Ось столкновения: где движение «съели»
        double ax = Math.abs(this.prevMoveX);
        double az = Math.abs(this.prevMoveZ);
        boolean hitX = ax > 1.0E-4D && Math.abs(mx) < ax * 0.5D;
        boolean hitZ = az > 1.0E-4D && Math.abs(mz) < az * 0.5D;

        if (!hitX && !hitZ) {
            // fallback — разворот обоих
            hitX = true;
            hitZ = true;
        }

        if (hitX) mx = -mx;
        if (hitZ) mz = -mz;

        // Нормализуем обратно к прежнему модулю (без потери скорости на слизи)
        double newMag = Math.sqrt(mx * mx + mz * mz);
        if (newMag > 1.0E-4D) {
            double scale = mag / newMag;
            mx *= scale;
            mz *= scale;
        }

        this.setDeltaMovement(mx, Math.max(0.05D, motion.y), mz);

        // Нос по новому направлению движения
        float newYaw = (float) (Mth.atan2(-mx, mz) * (180.0D / Math.PI));
        this.setYRot(newYaw);

        if (keepSpeed) {
            // знак speed сохраняем как «едем вперёд» после разворота носа
            setSpeedValue(Math.abs(getCurrentSpeed()));
        }
    }

    // ===================== COLLISIONS =====================

    private void tryBoardNearbyMobs() {
        // Как лодка: подбираем рядом стоящих животных/мобов, не пылесосим агрессивно
        if (this.getPassengers().size() >= 5) return;
        if (Math.abs(getCurrentSpeed()) > 0.35F) return; // на скорости не затягиваем

        List<Entity> candidates = this.level.getEntities(this, this.getBoundingBox().inflate(0.35D, 0.1D, 0.35D),
                e -> e instanceof LivingEntity
                        && !(e instanceof Player)
                        && !e.isPassenger()
                        && e.isAlive()
                        && EntitySelector.pushableBy(this).test(e));

        for (Entity e : candidates) {
            if (this.getPassengers().size() >= 5) break;
            // Животных — охотнее; прочих мобов только если совсем вплотную
            boolean close = e.getBoundingBox().intersects(this.getBoundingBox().inflate(0.05D));
            if (e instanceof Animal || close) {
                e.startRiding(this);
            }
        }
    }

    private void handleMobCollisions() {
        if (mobHitCooldown > 0 || Math.abs(getCurrentSpeed()) < 0.12F) return;

        List<LivingEntity> targets = this.level.getEntitiesOfClass(
                LivingEntity.class,
                this.getBoundingBox().inflate(0.35D),
                e -> e != getDriver() && !this.hasPassenger(e) && e.isAlive()
        );
        if (targets.isEmpty()) return;

        float speedKmh = getDisplaySpeedKmh();
        float damage = Mth.clamp(speedKmh / 22.0F, 2.0F, 14.0F);
        double mass = getTotalMass();

        for (LivingEntity target : targets) {
            DamageSource source = getDriver() instanceof LivingEntity
                    ? DamageSource.mobAttack((LivingEntity) getDriver())
                    : DamageSource.GENERIC;
            target.hurt(source, damage);

            Vec3 push = target.position().subtract(this.position());
            if (push.lengthSqr() < 1.0E-4D) push = getForwardVector();
            push = push.normalize().scale(0.55D + speedKmh / 130.0F);
            target.setDeltaMovement(push.x, 0.28D, push.z);
            target.hasImpulse = true;
        }

        // До 5% HP за столкновение с мобом
        int maxLoss = Math.max(1, Math.round(MAX_DURABILITY * 0.05F)); // 5% за удар с мобом
        float rawLoss = (float) (this.impactMemory * 4.0F / Math.max(1.0D, mass * 0.35D));
        int loss = Mth.clamp(Math.round(rawLoss), 1, maxLoss);
        damageDurability(loss);

        // Замедление обратно массе
        float slow = (float) (0.10D / Math.max(1.0D, mass));
        float s = getCurrentSpeed();
        if (s > 0) setSpeedValue(Math.max(0.0F, s - slow));
        else setSpeedValue(Math.min(0.0F, s + slow));

        mobHitCooldown = 6;
    }

    /** Столкновение двух самокатов: отскок, сброс пассажиров, урон. */
    private void handleScooterCollisions() {
        if (scooterHitCooldown > 0) return;
        if (Math.abs(getCurrentSpeed()) < 0.10F) return;

        List<ScooterEntity> others = this.level.getEntitiesOfClass(
                ScooterEntity.class,
                this.getBoundingBox().inflate(0.25D),
                s -> s != this && s.isAlive()
        );
        if (others.isEmpty()) return;

        for (ScooterEntity other : others) {
            collideScooters(this, other);
        }
        scooterHitCooldown = 12;
    }

    private static void collideScooters(ScooterEntity a, ScooterEntity b) {
        float kmh = Math.max(a.getDisplaySpeedKmh(), b.getDisplaySpeedKmh());
        float dmg = Mth.clamp(kmh / 20.0F, 2.0F, 18.0F);

        // Без eject — только отскок и урон корпусу (как wall slide)
        a.damageDurability(Math.round(dmg));
        b.damageDurability(Math.round(dmg));

        Vec3 mid = a.position().subtract(b.position());
        if (mid.lengthSqr() < 1.0E-4D) mid = a.getForwardVector();
        Vec3 push = mid.normalize().scale(0.45D + kmh / 160.0F);

        a.setDeltaMovement(push.x, 0.12D, push.z);
        b.setDeltaMovement(-push.x, 0.12D, -push.z);
        a.setSpeedValue(a.getCurrentSpeed() * 0.35F);
        b.setSpeedValue(b.getCurrentSpeed() * 0.35F);
        a.impactMemory *= 0.4F;
        b.impactMemory *= 0.4F;

        a.level.playSound(null, a.blockPosition(), SoundEvents.ANVIL_LAND, SoundSource.NEUTRAL, 0.45F, 1.1F);
    }

    /**
     * Чистит ТОЛЬКО листву/траву/цветы строго ВПЕРЕДИ.
     * Землю здесь НЕ трогаем — земля только в handleBlockCrash при таране.
     */
    private boolean clearFoliageAhead(boolean fromWall) {
        Vec3 fwd = getForwardVector();
        int reach = fromWall ? 2 : 1;
        int broken = 0;

        for (int i = 0; i <= reach; i++) {
            double dist = 0.85D + i * 0.65D;
            double px = this.getX() + fwd.x * dist;
            double pz = this.getZ() + fwd.z * dist;
            // 2 слоя: дека и чуть выше (не под полом)
            for (int yi = 0; yi <= 1; yi++) {
                BlockPos p = new BlockPos(px, this.getY() + 0.15D + yi * 0.7D, pz);
                BlockState st = this.level.getBlockState(p);
                if (st.isAir()) continue;
                if (isFoliageIgnored(st)) {
                    this.level.destroyBlock(p, true);
                    broken++;
                }
            }
        }

        if (broken <= 0) return false;
        // почти не тормозим от листвы
        float keep = 1.0F - Mth.clamp(broken * 0.004F, 0.0F, 0.06F);
        setSpeedValue(getCurrentSpeed() * keep);
        return true;
    }

    /** Впереди всё ещё твёрдая преграда (не воздух / не то что мы считаем «пустым»)? */
    private boolean stillBlockedAhead() {
        BlockPos front = getFrontBlockPos();
        BlockState st = this.level.getBlockState(front);
        if (st.isAir()) return false;
        if (isFoliageIgnored(st)) return false;
        return !st.getCollisionShape(this.level, front).isEmpty();
    }

    /**
     * Листва, трава, цветы, посевы, ковра, паутина… — самокат «не замечает».
     */
    private static boolean isFoliageIgnored(BlockState state) {
        if (state.is(BlockTags.LEAVES)) return true;
        if (state.is(BlockTags.FLOWERS)) return true;
        if (state.is(BlockTags.CROPS)) return true;
        if (state.is(BlockTags.REPLACEABLE_PLANTS)) return true;
        if (state.is(BlockTags.CLIMBABLE)) return true; // лоза / лианы
        if (state.is(Blocks.GRASS) || state.is(Blocks.TALL_GRASS)
                || state.is(Blocks.FERN) || state.is(Blocks.LARGE_FERN)
                || state.is(Blocks.DEAD_BUSH) || state.is(Blocks.SWEET_BERRY_BUSH)
                || state.is(Blocks.SUGAR_CANE) || state.is(Blocks.BAMBOO)
                || state.is(Blocks.BAMBOO_SAPLING) || state.is(Blocks.COBWEB)
                || state.is(Blocks.VINE) || state.is(Blocks.GLOW_LICHEN)
                || state.is(Blocks.MOSS_CARPET) || state.is(Blocks.SNOW)
                || state.is(Blocks.POWDER_SNOW) || state.is(Blocks.KELP)
                || state.is(Blocks.KELP_PLANT) || state.is(Blocks.SEAGRASS)
                || state.is(Blocks.TALL_SEAGRASS) || state.is(Blocks.LILY_PAD)
                || state.is(Blocks.BROWN_MUSHROOM) || state.is(Blocks.RED_MUSHROOM)
                || state.is(Blocks.CRIMSON_FUNGUS) || state.is(Blocks.WARPED_FUNGUS)
                || state.is(Blocks.NETHER_SPROUTS) || state.is(Blocks.CRIMSON_ROOTS)
                || state.is(Blocks.WARPED_ROOTS) || state.is(Blocks.TWISTING_VINES)
                || state.is(Blocks.TWISTING_VINES_PLANT) || state.is(Blocks.WEEPING_VINES)
                || state.is(Blocks.WEEPING_VINES_PLANT) || state.is(Blocks.SPORE_BLOSSOM)
                || state.is(Blocks.BIG_DRIPLEAF) || state.is(Blocks.BIG_DRIPLEAF_STEM)
                || state.is(Blocks.SMALL_DRIPLEAF) || state.is(Blocks.HANGING_ROOTS)
                || state.is(Blocks.CAVE_VINES) || state.is(Blocks.CAVE_VINES_PLANT)
                || state.is(Blocks.AZALEA) || state.is(Blocks.FLOWERING_AZALEA)
                || state.is(Blocks.MANGROVE_PROPAGULE) || state.is(Blocks.MOSS_BLOCK)
                || state.is(Blocks.MELON) || state.is(Blocks.PUMPKIN)
                || state.is(Blocks.CARVED_PUMPKIN) || state.is(Blocks.JACK_O_LANTERN)
                || state.is(Blocks.COCOA) || state.is(Blocks.CHORUS_PLANT)
                || state.is(Blocks.CHORUS_FLOWER)) {
            return true;
        }
        // саженцы
        if (state.is(BlockTags.SAPLINGS)) return true;
        return false;
    }

    /** Земля и сыпучее — плуг при нагрузке. */
    private static boolean isPlowableDirt(BlockState state) {
        return state.is(Blocks.DIRT) || state.is(Blocks.GRASS_BLOCK) || state.is(Blocks.PODZOL)
                || state.is(Blocks.MYCELIUM) || state.is(Blocks.COARSE_DIRT)
                || state.is(Blocks.ROOTED_DIRT) || state.is(Blocks.MUD)
                || state.is(Blocks.MUDDY_MANGROVE_ROOTS) || state.is(Blocks.FARMLAND)
                || state.is(Blocks.DIRT_PATH) || state.is(Blocks.SAND)
                || state.is(Blocks.RED_SAND) || state.is(Blocks.GRAVEL)
                || state.is(Blocks.CLAY) || state.is(Blocks.SOUL_SAND)
                || state.is(Blocks.SOUL_SOIL) || state.is(Blocks.SNOW_BLOCK)
                || state.is(Blocks.NETHERRACK);
    }

    /**
     * Землю пашем если:
     *  - mass >= 4 (типа 3+ игрока / корова+ / голем) И скорость > 25, или
     *  - mass >= 8 (голем+) и скорость > 15, или
     *  - скорость > 70 даже соло (таран на максе).
     */
    private static boolean canPlowDirt(double mass, float speedKmh) {
        if (speedKmh >= 70.0F) return true;
        if (mass >= 8.0D && speedKmh >= 15.0F) return true;
        if (mass >= 4.0D && speedKmh >= 25.0F) return true;
        return false;
    }

    /**
     * Таран: копаем только мягкое. Твёрдое = потом slideAlongWall (без eject).
     * Никогда не сбрасывает пассажиров.
     */
    private void tryDigSoftWall(float speedKmh) {
        float speed = this.impactMemory > 0.01F ? this.impactMemory : Math.abs(getCurrentSpeed());
        double mass = getTotalMass();
        float slopeBoost = Math.max(1.0F, getSlopeFactor(this.getPassengers().size(), mass));
        float power = computeCrashPower(speedKmh, mass, slopeBoost);

        BlockPos frontPos = getFrontBlockPos();
        BlockState frontState = this.level.getBlockState(frontPos);

        if (isFoliageIgnored(frontState)) {
            clearFoliageAhead(true);
            return;
        }

        // сено/мёд — мягкий тормоз
        if (isSoftSafe(frontState) || isSoftSafe(this.level.getBlockState(frontPos.below()))) {
            setSpeedValue(getCurrentSpeed() * 0.55F);
            this.setDeltaMovement(this.getDeltaMovement().scale(0.55D));
            this.impactMemory *= 0.5F;
            return;
        }

        // обсидиан на extreme — ломаем самокат, но пассажиров снимаем только при break
        if ((frontState.is(Blocks.OBSIDIAN) || frontState.is(Blocks.CRYING_OBSIDIAN))
                && power >= 2.85F && speedKmh >= 70.0F) {
            this.level.destroyBlock(frontPos, true);
            damageDurability(MAX_DURABILITY);
            if (getDurability() <= 0) {
                // breakScooter сам eject'ит
                breakScooter(true);
            }
            return;
        }

        int maxDepth = computeMaxDigDepth(power, speedKmh);
        int brokenSoft = 0;
        int brokenHard = 0;

        if (maxDepth > 0 && speedKmh >= DIG_MIN_KMH) {
            Vec3 fwd = getForwardVector();
            for (int i = 0; i < maxDepth; i++) {
                double dist = 0.85D + i * 0.85D;
                BlockPos dig = new BlockPos(
                        this.getX() + fwd.x * dist,
                        this.getY() + 0.05D,
                        this.getZ() + fwd.z * dist
                );
                for (int yi = 0; yi <= 1; yi++) {
                    BlockPos p = dig.below(yi);
                    BlockState st = this.level.getBlockState(p);
                    if (st.isAir()) continue;
                    if (isFoliageIgnored(st)) {
                        this.level.destroyBlock(p, true);
                        brokenSoft++;
                        continue;
                    }
                    if (isPlowableDirt(st) && canPlowDirt(mass, speedKmh)) {
                        this.level.destroyBlock(p, true);
                        brokenSoft++;
                        continue;
                    }
                    // твёрдое — не копаем, выходим (slide снаружи)
                    float need = blockBreakThreshold(st);
                    if (need < 0.0F || power < need) {
                        if (brokenSoft + brokenHard > 0) {
                            applyPlowSlowdown(brokenSoft, brokenHard, power);
                        }
                        return;
                    }
                    // достаточно power для среднего блока — копаем 1
                    if (need <= 1.2F) {
                        this.level.destroyBlock(p, true);
                        brokenHard++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (brokenSoft + brokenHard > 0) {
            applyPlowSlowdown(brokenSoft, brokenHard, power);
        }
        // пассажиры всегда на борту
    }

    /** @deprecated use tryDigSoftWall — оставлено если где-то вызывается */
    private void handleBlockCrash() {
        tryDigSoftWall(getDisplaySpeedKmh());
    }

    /** Замедление + лёгкий урон после пробития, без сброса людей. */
    private void applyPlowSlowdown(int soft, int hard, float power) {
        float slow = soft * 0.02F + hard * 0.08F + power * 0.03F;
        slow = Mth.clamp(slow, 0.05F, 0.45F);
        float keep = 1.0F - slow;
        setSpeedValue(getCurrentSpeed() * keep);
        this.setDeltaMovement(this.getDeltaMovement().multiply(keep, 1.0D, keep));
        this.impactMemory *= keep;
        int dmg = hard > 0
                ? Math.max(2, Math.round(2.0F + hard * 3.0F + power * 2.0F))
                : (soft > 3 ? 1 : 0);
        if (dmg > 0) damageDurability(dmg);
        this.level.playSound(null, this.blockPosition(),
                hard > 0 ? SoundEvents.GRAVEL_BREAK : SoundEvents.GRASS_BREAK,
                SoundSource.BLOCKS, 0.9F, 1.0F);
    }

    private void doFullCrashImpact(float speed, float speedKmh, boolean obsidianKill) {
        // Только «смертельные» кейсы (обсидиан / вызов из break).
        // Обычная стена больше сюда не ходит — slideAlongWall без eject.
        if (obsidianKill) {
            damageDurability(MAX_DURABILITY);
        } else {
            damageDurability(Math.round(Mth.clamp(speedKmh * 0.40F, 5.0F, 40.0F)));
        }

        // eject только если самокат умирает
        if (getDurability() <= 0 || obsidianKill) {
            ejectPassengersWithCrashDamage(speedKmh, speed);
            setSpeedValue(0.0F);
            this.setDeltaMovement(Vec3.ZERO);
            this.level.playSound(null, this.blockPosition(), SoundEvents.ANVIL_LAND, SoundSource.NEUTRAL, 0.7F, 1.1F);
            this.impactMemory = 0.0F;
            breakScooter(true);
            return;
        }

        // иначе — остаёмся на борту, сильный тормоз
        setSpeedValue(getCurrentSpeed() * 0.2F);
        this.setDeltaMovement(this.getDeltaMovement().multiply(0.15D, 1.0D, 0.15D));
        this.impactMemory = 0.0F;
        this.level.playSound(null, this.blockPosition(), SoundEvents.ANVIL_LAND, SoundSource.NEUTRAL, 0.45F, 1.2F);
    }

    private void ejectPassengersWithCrashDamage(float speedKmh, float speed) {
        List<Entity> passengers = new ArrayList<>(this.getPassengers());
        this.ejectPassengers();
        float passengerDamage = Mth.clamp(speedKmh / 16.0F, 2.0F, 24.0F);
        Vec3 push = getForwardVector().scale(0.55D + speed * 0.7D);
        for (Entity passenger : passengers) {
            passenger.setDeltaMovement(
                    push.x + (this.random.nextDouble() - 0.5D) * 0.25D,
                    0.40D,
                    push.z + (this.random.nextDouble() - 0.5D) * 0.25D
            );
            if (passenger instanceof LivingEntity living) {
                living.hurt(DamageSource.FLY_INTO_WALL, passengerDamage);
            }
        }
    }

    private static boolean isSoftSafe(BlockState state) {
        return state.is(Blocks.HAY_BLOCK)
                || state.is(Blocks.HONEY_BLOCK)
                || state.is(Blocks.HONEYCOMB_BLOCK)
                || state.is(Blocks.SLIME_BLOCK)
                || state.is(Blocks.MOSS_BLOCK)
                || state.is(Blocks.MOSS_CARPET)
                || state.is(Blocks.SNOW)
                || state.is(Blocks.SNOW_BLOCK)
                || state.is(BlockTags.WOOL);
    }

    /**
     * Мощность удара.
     * 80 км/ч соло mass≈2 → ~1.0
     * 80 км/ч + 4 голема mass≈33 → ~3.5+
     * с горки slope 3.0 → ещё ×slope
     */
    private static float computeCrashPower(float speedKmh, double mass, float slopeBoost) {
        float speedFactor = speedKmh / 80.0F;                 // 1.0 на «номинале»
        float massFactor = 1.0F + (float) Math.max(0.0D, mass - 1.0D) * 0.085F;
        float slope = Math.max(1.0F, slopeBoost);
        return speedFactor * massFactor * slope;
    }

    /** Сколько блоков вглубь максимум при данной мощности. */
    private static int computeMaxDigDepth(float power, float speedKmh) {
        if (speedKmh < DIG_MIN_KMH) return 0;
        // power 1.0 → 5 (земля соло на 80), power 0.5 → 2, power 2.5 → 5 cap
        return Mth.clamp(Math.round(power * 5.0F), 0, 5);
    }

    /** Порог power для разрушения блока. &lt;0 = неломаемое. */
    private float blockBreakThreshold(BlockState state) {
        if (state.is(Blocks.BEDROCK) || state.is(Blocks.BARRIER)
                || state.is(Blocks.COMMAND_BLOCK) || state.is(Blocks.CHAIN_COMMAND_BLOCK)
                || state.is(Blocks.REPEATING_COMMAND_BLOCK) || state.is(Blocks.END_PORTAL_FRAME)
                || state.is(Blocks.REINFORCED_DEEPSLATE)) {
            return -1.0F;
        }
        if (state.is(Blocks.OBSIDIAN) || state.is(Blocks.CRYING_OBSIDIAN)) {
            return 2.85F; // ~300% + масса
        }
        // очень мягкие
        if (state.is(Blocks.DIRT) || state.is(Blocks.GRASS_BLOCK) || state.is(Blocks.SAND)
                || state.is(Blocks.RED_SAND) || state.is(Blocks.GRAVEL) || state.is(Blocks.CLAY)
                || state.is(Blocks.SOUL_SAND) || state.is(Blocks.SOUL_SOIL)
                || state.is(Blocks.FARMLAND) || state.is(Blocks.DIRT_PATH)
                || state.is(Blocks.PODZOL) || state.is(Blocks.MYCELIUM) || state.is(Blocks.COARSE_DIRT)
                || state.is(Blocks.ROOTED_DIRT) || state.is(Blocks.MUD)
                || state.is(BlockTags.LEAVES) || state.is(Blocks.GLASS) || state.is(Blocks.GLASS_PANE)
                || state.is(BlockTags.WOOL) || state.is(Blocks.SNOW) || state.is(Blocks.SNOW_BLOCK)
                || state.is(Blocks.NETHERRACK) || state.is(Blocks.MAGMA_BLOCK)) {
            return 0.55F;
        }
        // дерево / лёд
        if (state.is(BlockTags.LOGS) || state.is(BlockTags.PLANKS) || state.is(BlockTags.FENCES)
                || state.is(Blocks.ICE) || state.is(Blocks.PACKED_ICE) || state.is(Blocks.BLUE_ICE)
                || state.is(BlockTags.WOODEN_DOORS) || state.is(BlockTags.WOODEN_TRAPDOORS)) {
            return 1.05F;
        }
        // камень / deepslate
        if (state.is(Blocks.STONE) || state.is(Blocks.COBBLESTONE) || state.is(Blocks.DEEPSLATE)
                || state.is(Blocks.COBBLED_DEEPSLATE) || state.is(BlockTags.BASE_STONE_OVERWORLD)
                || state.is(Blocks.ANDESITE) || state.is(Blocks.DIORITE) || state.is(Blocks.GRANITE)
                || state.is(Blocks.TUFF) || state.is(Blocks.CALCITE) || state.is(Blocks.DRIPSTONE_BLOCK)
                || state.is(Blocks.BLACKSTONE) || state.is(Blocks.BASALT)) {
            return 1.85F;
        }
        // руды / железо
        if (state.is(Blocks.IRON_BLOCK) || state.is(Blocks.GOLD_BLOCK) || state.is(Blocks.LAPIS_BLOCK)
                || state.is(Blocks.COPPER_BLOCK) || state.is(Blocks.RAW_IRON_BLOCK)) {
            return 2.20F;
        }
        // по destroySpeed
        float ds = state.getDestroySpeed(this.level, this.blockPosition());
        if (ds < 0) return -1.0F;
        if (ds <= 0.5F) return 0.50F;
        if (ds <= 1.0F) return 0.85F;
        if (ds <= 2.0F) return 1.20F;
        if (ds <= 3.5F) return 1.70F;
        if (ds <= 5.0F) return 2.20F;
        return 2.60F;
    }

    // ===================== INPUT / HORN / PACK =====================

    public void setInputState(boolean forward, boolean back, boolean left, boolean right) {
        this.inputForward = forward;
        this.inputBack = back;
        this.inputLeft = left;
        this.inputRight = right;
    }

    public void honk() {
        if (this.hornCooldown > 0) return;
        this.hornCooldown = 12;
        this.level.playSound(null, this.getX(), this.getY(), this.getZ(),
                SoundEvents.NOTE_BLOCK_BASS, SoundSource.PLAYERS, 1.4F, 0.55F);
        this.level.playSound(null, this.getX(), this.getY(), this.getZ(),
                SoundEvents.NOTE_BLOCK_PLING, SoundSource.PLAYERS, 0.8F, 1.4F);
    }

    public boolean packUpToPlayer(ServerPlayer player) {
        if (!this.isAlive() || !this.getPassengers().isEmpty() || Math.abs(getCurrentSpeed()) > 0.08F) {
            return false;
        }

        ItemStack stack = new ItemStack(ModItems.SCOOTER.get());
        CompoundTag tag = stack.getOrCreateTag();
        tag.putInt(ScooterItem.TAG_SKIN, getSkinId());
        tag.putInt(ScooterItem.TAG_CHARGE, getCharge());
        tag.putInt(ScooterItem.TAG_DURABILITY, getDurability());

        if (!player.getInventory().add(stack)) {
            player.drop(stack, false);
        }
        this.discard();
        this.level.playSound(null, this.blockPosition(), SoundEvents.ITEM_FRAME_REMOVE_ITEM, SoundSource.PLAYERS, 1.0F, 0.9F);
        return true;
    }

    @Override
    public InteractionResult interact(Player player, InteractionHand hand) {
        // Водитель ПКМ → гудок
        if (!this.level.isClientSide && getDriver() == player) {
            honk();
            return InteractionResult.SUCCESS;
        }

        // Shift + ПКМ → свернуть (как альтернатива удару рукой)
        if (player.isShiftKeyDown() && hand == InteractionHand.MAIN_HAND && player instanceof ServerPlayer sp) {
            if (packUpToPlayer(sp)) return InteractionResult.CONSUME;
        }

        if (this.getPassengers().size() >= 5) {
            return InteractionResult.FAIL;
        }

        if (!this.level.isClientSide) {
            boolean mounted = player.startRiding(this, true);
            if (mounted) return InteractionResult.CONSUME;
        }
        return InteractionResult.sidedSuccess(this.level.isClientSide);
    }

    @Override
    protected boolean canAddPassenger(Entity passenger) {
        return this.getPassengers().size() < 5;
    }

    @Override
    protected void removePassenger(Entity passenger) {
        boolean wasDriver = !this.getPassengers().isEmpty() && this.getPassengers().get(0) == passenger;
        super.removePassenger(passenger);
        if (wasDriver) {
            setInputState(false, false, false, false);
        }
    }

    /**
     * Пассажиры (не водитель) свободно юзают предметы — ваниль это позволяет,
     * если не перехватывать input. Водитель управляет самокатом.
     */
    @Override
    public boolean canRiderInteract() {
        return true;
    }

    /**
     * Все стоят на деке, никто не «сидит» в позе sitting.
     * Без этого PlayerRenderer рисует согнутые ноги.
     */
    @Override
    public boolean shouldRiderSit() {
        return false;
    }

    // ===================== DAMAGE / BREAK =====================

    @Override
    public boolean hurt(DamageSource source, float amount) {
        if (this.level.isClientSide || !this.isAlive()) return true;
        if (this.isInvulnerableTo(source)) return false;

        // Пустая рука игрока → свернуть в предмет (как лодка), без «боя»
        if (source.getEntity() instanceof Player player) {
            if (player.getMainHandItem().isEmpty() && player instanceof ServerPlayer sp) {
                if (packUpToPlayer(sp)) return true;
            }
        }

        damageDurability((int) Math.max(1, Math.ceil(amount * 5.0F)));
        this.level.playSound(null, this.blockPosition(), SoundEvents.ANVIL_HIT, SoundSource.NEUTRAL, 0.5F, 1.0F);

        if (getDurability() <= 0) {
            breakScooter(false);
        }
        return true;
    }

    private void damageDurability(int amount) {
        setDurability(Math.max(0, getDurability() - Math.max(1, amount)));
    }

    /**
     * Распад на запчасти.
     * Серьёзное ДТП (crashDeath): меньше целых деталей — от nugget-эквивалента до пары слитков.
     * Обычная поломка: больше лута, до 9 слитков.
     */
    private void breakScooter(boolean crashDeath) {
        if (!this.isAlive()) return;

        List<Entity> passengers = new ArrayList<>(this.getPassengers());
        this.ejectPassengers();
        for (Entity p : passengers) {
            if (p instanceof LivingEntity living) {
                living.hurt(DamageSource.GENERIC, 4.0F);
            }
        }

        // seriousness 0..1
        float seriousness = crashDeath
                ? Mth.clamp(this.impactMemory / MAX_FORWARD_SPEED, 0.35F, 1.0F)
                : 0.15F + this.random.nextFloat() * 0.25F;

        // total «iron units» where 9 nuggets = 1 ingot. Range: 1 nugget .. 9 ingots
        int maxUnits = 9 * 9; // 81 nuggets = 9 ingots
        int minUnits = 1;
        // stronger crash → fewer recoverable parts
        int units = Math.round(Mth.lerp(seriousness, maxUnits, minUnits));
        units = Mth.clamp(units + this.random.nextInt(5) - 2, minUnits, maxUnits);

        int ingots = units / 9;
        int nuggets = units % 9;
        if (ingots > 0) this.spawnAtLocation(new ItemStack(Items.IRON_INGOT, ingots));
        if (nuggets > 0) this.spawnAtLocation(new ItemStack(Items.IRON_NUGGET, nuggets));

        this.level.playSound(null, this.blockPosition(), SoundEvents.IRON_GOLEM_DAMAGE, SoundSource.NEUTRAL, 1.0F, 0.7F);
        this.discard();
    }

    // ===================== PASSENGERS / SEATS =====================

    @Nullable
    public Entity getDriver() {
        return this.getPassengers().isEmpty() ? null : this.getPassengers().get(0);
    }

    @Override
    public double getPassengersRidingOffset() {
        return 0.0D; // позиции полностью задаём в positionRider
    }

    @Override
    public void positionRider(Entity passenger) {
        if (!this.hasPassenger(passenger)) return;

        int index = this.getPassengers().indexOf(passenger);
        if (index < 0) return;
        if (index >= SEAT_LOCAL.length) index = SEAT_LOCAL.length - 1;

        Vec3 local = SEAT_LOCAL[index];

        // Лёгкий наклон сидений = visual деки (тот же знак что renderer)
        float visualPitch = getSyncedPitch() * PASSENGER_PITCH_SIGN * PASSENGER_TILT_SCALE;
        float visualRoll = getSyncedRoll() * PASSENGER_ROLL_SIGN * PASSENGER_TILT_SCALE;
        visualPitch = Mth.clamp(visualPitch, -8.0F, 8.0F);
        visualRoll = Mth.clamp(visualRoll, -5.0F, 5.0F);

        float pR = visualPitch * ((float) Math.PI / 180.0F);
        float rR = visualRoll * ((float) Math.PI / 180.0F);
        float cP = Mth.cos(pR);
        float sP = Mth.sin(pR);
        float cR = Mth.cos(rR);
        float sR = Mth.sin(rR);

        double x1 = local.x;
        double y1 = local.y * cP - local.z * sP;
        double z1 = local.y * sP + local.z * cP;
        double lx = x1 * cR - y1 * sR;
        double ly = x1 * sR + y1 * cR;
        double lz = z1;
        float yawRad = -this.getYRot() * ((float) Math.PI / 180.0F);
        float cY = Mth.cos(yawRad);
        float sY = Mth.sin(yawRad);
        double wx = lx * cY + lz * sY;
        double wz = lz * cY - lx * sY;

        passenger.setPos(this.getX() + wx, this.getY() + ly, this.getZ() + wz);

        float bodyYaw = this.getYRot() + SEAT_BODY_YAW_OFFSET[index];
        if (passenger instanceof LivingEntity living) {
            living.setPose(Pose.STANDING);
            living.yBodyRot = bodyYaw;
            living.yBodyRotO = bodyYaw;
        }
        if (!(passenger instanceof Player)) {
            passenger.setYRot(bodyYaw);
            passenger.setXRot(visualPitch);
            passenger.setYHeadRot(bodyYaw);
        }
    }

    /**
     * Наклон людей = visual самоката.
     * Модель: DATA_PITCH * ScooterRenderer.PITCH_SIGN (−1).
     * PASSENGER_PITCH_SIGN = −1 → в ту же сторону.
     * SCALE 0.25 → мягко (~±5–6°). Если «наоборот» → +1.0F.
     */
    public static final float PASSENGER_PITCH_SIGN = -1.0F;
    public static final float PASSENGER_ROLL_SIGN = 1.0F;
    public static final float PASSENGER_TILT_SCALE = 0.25F;

    /**
     * Точка спешивания — рядом, не внутри модели.
     */
    @Override
    public Vec3 getDismountLocationForPassenger(LivingEntity passenger) {
        Vec3 right = getForwardVector().yRot((float) (Math.PI / 2.0));
        Vec3 spot = this.position().add(right.scale(1.1D));
        BlockPos bp = new BlockPos(spot);
        if (!this.level.getBlockState(bp).getCollisionShape(this.level, bp).isEmpty()) {
            spot = this.position().add(getForwardVector().scale(-1.2D));
        }
        return new Vec3(spot.x, this.getY(), spot.z);
    }

    // ===================== GETTERS / SETTERS =====================

    public int getSkinId() {
        return this.entityData.get(DATA_SKIN);
    }

    public void setSkinId(int id) {
        this.entityData.set(DATA_SKIN, id);
    }

    public int getCharge() {
        return this.entityData.get(DATA_CHARGE);
    }

    public void setCharge(int charge) {
        this.entityData.set(DATA_CHARGE, Mth.clamp(charge, 0, MAX_CHARGE));
    }

    public int getDurability() {
        return this.entityData.get(DATA_DURABILITY);
    }

    public void setDurability(int durability) {
        this.entityData.set(DATA_DURABILITY, Mth.clamp(durability, 0, MAX_DURABILITY));
    }

    public float getCurrentSpeed() {
        return this.entityData.get(DATA_SPEED);
    }

    private void setSpeedValue(float speed) {
        this.entityData.set(DATA_SPEED, speed);
    }

    /**
     * Скорость для HUD (цифры).
     * Физика в мире = speed * MOVE_SCALE, цифры без /2.
     */
    public float getDisplaySpeedKmh() {
        return Math.abs(getCurrentSpeed()) * KMH_PER_SPEED;
    }

    public float getSyncedRoll() {
        return this.entityData.get(DATA_ROLL);
    }

    /** Наклон нос вниз (+), нос вверх (−), градусы. */
    public float getSyncedPitch() {
        return this.entityData.get(DATA_PITCH);
    }

    /** Плавный pitch для рендера (между тиками). */
    public float getRenderPitch(float partialTick) {
        if (this.level.isClientSide) {
            return Mth.lerp(partialTick, this.prevSmoothPitch, this.smoothPitch);
        }
        return getSyncedPitch();
    }

    /** Плавный roll для рендера (между тиками). */
    public float getRenderRoll(float partialTick) {
        if (this.level.isClientSide) {
            return Mth.lerp(partialTick, this.prevSmoothRoll, this.smoothRoll);
        }
        return getSyncedRoll();
    }

    public boolean isReversing() {
        return getCurrentSpeed() < -0.02F;
    }

    public Vec3 getForwardVector() {
        float radians = this.getYRot() * ((float) Math.PI / 180.0F);
        return new Vec3(-Mth.sin(radians), 0.0D, Mth.cos(radians));
    }

    private BlockPos getFrontBlockPos() {
        Vec3 forward = getForwardVector();
        return new BlockPos(this.getX() + forward.x * 1.15D, this.getY() + 0.2D, this.getZ() + forward.z * 1.15D);
    }

    public double getTotalMass() {
        double mass = 1.0D; // сам самокат
        for (Entity passenger : getPassengers()) {
            mass += ScooterMassHelper.getMass(passenger);
        }
        return mass;
    }

    // ===================== GECKOLIB =====================

    @Override
    public AnimationFactory getFactory() {
        return this.factory;
    }

    @Override
    public void registerControllers(AnimationData data) {
        data.addAnimationController(new AnimationController<>(this, "main", 3, this::predicate));
    }

    private <T extends IAnimatable> PlayState predicate(AnimationEvent<T> event) {
        float speed = getCurrentSpeed();
        if (speed > 0.05F) {
            event.getController().setAnimation(new AnimationBuilder()
                    .addAnimation("animation.scooter.forward", ILoopType.EDefaultLoopTypes.LOOP));
            return PlayState.CONTINUE;
        }
        if (speed < -0.05F) {
            event.getController().setAnimation(new AnimationBuilder()
                    .addAnimation("animation.scooter.backward", ILoopType.EDefaultLoopTypes.LOOP));
            return PlayState.CONTINUE;
        }
        // idle_mounted в geo нет → всегда idle (без спама в лог)
        event.getController().setAnimation(new AnimationBuilder()
                .addAnimation("animation.scooter.idle", ILoopType.EDefaultLoopTypes.LOOP));
        return PlayState.CONTINUE;
    }
}
