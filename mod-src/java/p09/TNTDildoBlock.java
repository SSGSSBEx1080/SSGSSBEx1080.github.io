package com.example.zitraksmode.blocks;

import com.example.zitraksmode.items.DildoMaterial;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.PrimedTnt;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.level.Explosion;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

import javax.annotation.Nullable;

public class TNTDildoBlock extends DildoBlock {

    public TNTDildoBlock() {
        super(DildoMaterial.TNT);
    }

    @Override
    public void onCaughtFire(BlockState state, Level level, BlockPos pos,
                            @Nullable net.minecraft.core.Direction face, @Nullable LivingEntity igniter) {
        explode(level, pos, igniter);
    }

    @Override
    public void wasExploded(Level level, BlockPos pos, Explosion explosion) {
        if (!level.isClientSide) {
            PrimedTnt primedtnt = new PrimedTnt(level,
                (double)pos.getX() + 0.5D,
                (double)pos.getY(),
                (double)pos.getZ() + 0.5D,
                explosion.getSourceMob());
            int fuse = level.random.nextInt(primedtnt.getFuse() / 4) + primedtnt.getFuse() / 8;
            primedtnt.setFuse(fuse);
            level.addFreshEntity(primedtnt);
        }
    }

    @Override
    public void stepOn(Level level, BlockPos pos, BlockState state, Entity entity) {
        super.stepOn(level, pos, state, entity);
    }

    @Override
    public void onProjectileHit(Level level, BlockState state, BlockHitResult hit, Projectile projectile) {
        if (!level.isClientSide) {
            BlockPos blockpos = hit.getBlockPos();
            Entity entity = projectile.getOwner();
            if (projectile.isOnFire() && projectile.mayInteract(level, blockpos)) {
                explode(level, blockpos, entity instanceof LivingEntity ? (LivingEntity)entity : null);
            }
        }
    }

    public static void explode(Level level, BlockPos pos, @Nullable LivingEntity igniter) {
        if (!level.isClientSide) {
            PrimedTnt primedtnt = new PrimedTnt(level,
                (double)pos.getX() + 0.5D,
                (double)pos.getY(),
                (double)pos.getZ() + 0.5D,
                igniter);
            level.addFreshEntity(primedtnt);
            level.playSound((Player)null, primedtnt.getX(), primedtnt.getY(), primedtnt.getZ(),
                SoundEvents.TNT_PRIMED, SoundSource.BLOCKS, 1.0F, 1.0F);
        }
    }

    @Override
    public void playerWillDestroy(Level level, BlockPos pos, BlockState state, Player player) {
        if (!level.isClientSide() && !player.isCreative() && level.getBlockState(pos).is(this)) {
            explode(level, pos, player);
        }
        super.playerWillDestroy(level, pos, state, player);
    }
}
