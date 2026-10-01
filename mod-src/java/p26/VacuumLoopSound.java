package com.example.zitraksmode.client;

import com.example.zitraksmode.ModSounds;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.resources.sounds.AbstractTickableSoundInstance;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;

/** Real loop, stopped on the exact tick LMB is released. */
public final class VacuumLoopSound extends AbstractTickableSoundInstance {
    private final LocalPlayer player;

    public VacuumLoopSound(LocalPlayer player) {
        super(ModSounds.VACUUM_LOOP.get(), SoundSource.PLAYERS, RandomSource.create());
        this.player = player;
        this.looping = true;
        this.delay = 0;
        this.volume = 0.75F;
        this.pitch = 1.0F;
        this.x = player.getX();
        this.y = player.getY();
        this.z = player.getZ();
    }

    /** Public bridge: AbstractTickableSoundInstance.stop() is protected in this Minecraft version. */
    public void stopLoop() {
        stop();
    }

    @Override
    public void tick() {
        this.x = player.getX();
        this.y = player.getY();
        this.z = player.getZ();
        if (!VacuumClientInput.isSucking() || player.isRemoved()) stopLoop();
    }
}
