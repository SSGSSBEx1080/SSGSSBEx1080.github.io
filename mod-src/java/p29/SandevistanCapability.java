package com.example.zitraksmode.caps;

import net.minecraft.core.Direction;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.CapabilityToken;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;
import net.minecraftforge.common.util.LazyOptional;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public class SandevistanCapability {
    public static final Capability<SandevistanCapability> INSTANCE = CapabilityManager.get(new CapabilityToken<>() {});

    private boolean accelerating = false;
    private int accelerationTicks = 0;
    private float psychosis = 0.0f;
    private boolean psychosisActive = false;
    private int psychosisTicks = 0;
    private int cooldown = 0;
    private boolean inCutscene = false;
    private int cutsceneTicks = 0;

    private float tolerance = 1.0f;
    private int ticksSinceLastUse = 0;
    private float psychosisToReduce = 0.0f;

    public void tick(Player player) {
        ticksSinceLastUse++;

        // Восстановление эффективности: 5% каждые 5 минут
        if (ticksSinceLastUse > 0 && ticksSinceLastUse % 6000 == 0) {
            tolerance = Math.min(1.0f, tolerance + 0.05f);
        }

        if (inCutscene) {
            cutsceneTicks++;
            if (cutsceneTicks > 100) {
                inCutscene = false;
                cutsceneTicks = 0;
            }
        }

        if (cooldown > 0) cooldown--;

        if (psychosisToReduce > 0) {
            float reduction = Math.min(psychosisToReduce, 1.0f);
            psychosis = Math.max(0.0f, psychosis - reduction);
            psychosisToReduce -= reduction;
        }

        if (accelerating) {
            accelerationTicks++;
            psychosis += 20.0f / 100.0f; // 20% за 5 секунд
            if (psychosis >= 100.0f) {
                psychosis = 100.0f;
                accelerating = false;
                startPsychosis();
            } else if (accelerationTicks >= 100) {
                accelerating = false;
                cooldown = 100;
            }
        }

        if (psychosisActive) {
            psychosisTicks++;
        }
    }

    public void toggleAcceleration(Player player) {
        if (psychosisActive || inCutscene) return;

        if (accelerating) {
            accelerating = false;
            cooldown = 100;
        } else {
            if (cooldown == 0 && psychosis < 100.0f) {
                accelerating = true;
                accelerationTicks = 0;
                ticksSinceLastUse = 0;
                if (cooldown > 0) {
                    psychosis += 5.0f;
                }
            }
        }
    }

    public void applyImmunosuppressant() {
        if (!psychosisActive) {
            float actualReduction = 50.0f * tolerance;
            psychosisToReduce += actualReduction;
            tolerance = Math.max(0.0f, tolerance - 0.05f);
        }
    }

    public void startCutscene() {
        inCutscene = true;
        cutsceneTicks = 0;
    }

    public void startPsychosis() {
        psychosisActive = true;
        psychosisTicks = 0;
    }

    public boolean isAccelerating() { return accelerating; }
    public boolean isPsychosisActive() { return psychosisActive; }
    public boolean isInCutscene() { return inCutscene; }
    public float getPsychosis() { return psychosis; }
    public int getCooldown() { return cooldown; }
    public int getAccelerationTicks() { return accelerationTicks; }
    public int getCutsceneTicks() { return cutsceneTicks; }
    public int getPsychosisTicks() { return psychosisTicks; }
    public float getTolerance() { return tolerance; }

    public void copyFrom(SandevistanCapability source) {
        this.accelerating = source.accelerating;
        this.accelerationTicks = source.accelerationTicks;
        this.psychosis = source.psychosis;
        this.psychosisActive = source.psychosisActive;
        this.psychosisTicks = source.psychosisTicks;
        this.cooldown = source.cooldown;
        this.inCutscene = source.inCutscene;
        this.cutsceneTicks = source.cutsceneTicks;
        this.tolerance = source.tolerance;
        this.ticksSinceLastUse = source.ticksSinceLastUse;
        this.psychosisToReduce = source.psychosisToReduce;
    }

    public void saveNBTData(CompoundTag nbt) {
        nbt.putBoolean("accelerating", accelerating);
        nbt.putInt("accelerationTicks", accelerationTicks);
        nbt.putFloat("psychosis", psychosis);
        nbt.putBoolean("psychosisActive", psychosisActive);
        nbt.putInt("psychosisTicks", psychosisTicks);
        nbt.putInt("cooldown", cooldown);
        nbt.putBoolean("inCutscene", inCutscene);
        nbt.putInt("cutsceneTicks", cutsceneTicks);
        nbt.putFloat("tolerance", tolerance);
        nbt.putInt("ticksSinceLastUse", ticksSinceLastUse);
        nbt.putFloat("psychosisToReduce", psychosisToReduce);
    }

    public void loadNBTData(CompoundTag nbt) {
        accelerating = nbt.getBoolean("accelerating");
        accelerationTicks = nbt.getInt("accelerationTicks");
        psychosis = nbt.getFloat("psychosis");
        psychosisActive = nbt.getBoolean("psychosisActive");
        psychosisTicks = nbt.getInt("psychosisTicks");
        cooldown = nbt.getInt("cooldown");
        inCutscene = nbt.getBoolean("inCutscene");
        cutsceneTicks = nbt.getInt("cutsceneTicks");
        tolerance = nbt.contains("tolerance") ? nbt.getFloat("tolerance") : 1.0f;
        ticksSinceLastUse = nbt.getInt("ticksSinceLastUse");
        psychosisToReduce = nbt.getFloat("psychosisToReduce");
    }

    public static LazyOptional<SandevistanCapability> get(Player player) {
        return player.getCapability(INSTANCE);
    }

    public static class Provider implements ICapabilitySerializable<CompoundTag> {
        private final SandevistanCapability capability = new SandevistanCapability();
        private final LazyOptional<SandevistanCapability> optional = LazyOptional.of(() -> capability);

        @NotNull
        @Override
        public <T> LazyOptional<T> getCapability(@NotNull Capability<T> cap, @Nullable Direction side) {
            return INSTANCE.orEmpty(cap, optional);
        }

        @Override
        public CompoundTag serializeNBT() {
            CompoundTag nbt = new CompoundTag();
            capability.saveNBTData(nbt);
            return nbt;
        }

        @Override
        public void deserializeNBT(CompoundTag nbt) {
            capability.loadNBTData(nbt);
        }
    }
}
