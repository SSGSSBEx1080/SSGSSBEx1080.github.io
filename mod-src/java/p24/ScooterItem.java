package com.example.zitraksmode.items;

import com.example.zitraksmode.ModEntities;
import com.example.zitraksmode.entities.ScooterEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.gameevent.GameEvent;
import net.minecraft.world.phys.Vec3;

/**
 * Предмет-самокат. Не стакается.
 * Спавн строго лицом туда, куда смотрит игрок (yaw + yRotO).
 */
public class ScooterItem extends Item {

    public static final String TAG_SKIN = "ScooterSkin";
    public static final String TAG_CHARGE = "ScooterCharge";
    public static final String TAG_DURABILITY = "ScooterDurability";

    public ScooterItem(Properties properties) {
        super(properties.stacksTo(1));
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        if (!(level instanceof ServerLevel serverLevel)) {
            return InteractionResult.SUCCESS;
        }

        Player player = context.getPlayer();
        ItemStack stack = context.getItemInHand();
        BlockPos pos = context.getClickedPos();
        Direction face = context.getClickedFace();
        BlockPos spawnPos = pos.relative(face);

        ScooterEntity scooter = ModEntities.SCOOTER.get().create(serverLevel);
        if (scooter == null) {
            return InteractionResult.PASS;
        }

        applyTagDefaults(stack, serverLevel);
        applyTagToEntity(stack, scooter);

        double x = spawnPos.getX() + 0.5D;
        double y = spawnPos.getY();
        double z = spawnPos.getZ() + 0.5D;
        float yaw = player != null ? player.getYRot() : 0.0F;

        // moveTo ставит pos + rot; yRotO тоже, чтобы renderer не дёргался
        scooter.moveTo(x, y, z, yaw, 0.0F);
        scooter.setYRot(yaw);
        scooter.yRotO = yaw;
        scooter.setXRot(0.0F);
        scooter.xRotO = 0.0F;

        serverLevel.addFreshEntity(scooter);
        level.gameEvent(player, GameEvent.ENTITY_PLACE, spawnPos);

        if (player != null && !player.getAbilities().instabuild) {
            stack.shrink(1);
        }
        return InteractionResult.CONSUME;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level.isClientSide) {
            return InteractionResultHolder.success(stack);
        }

        Vec3 look = player.getLookAngle();
        Vec3 flat = new Vec3(look.x, 0.0D, look.z);
        if (flat.lengthSqr() < 1.0E-4D) {
            flat = Vec3.directionFromRotation(0.0F, player.getYRot());
        }
        flat = flat.normalize();
        Vec3 spawn = player.position().add(flat.scale(2.0D));

        ScooterEntity scooter = ModEntities.SCOOTER.get().create(level);
        if (scooter == null) {
            return InteractionResultHolder.fail(stack);
        }

        applyTagDefaults(stack, level);
        applyTagToEntity(stack, scooter);

        float yaw = player.getYRot();
        scooter.moveTo(spawn.x, player.getY() + 0.05D, spawn.z, yaw, 0.0F);
        scooter.setYRot(yaw);
        scooter.yRotO = yaw;
        scooter.setXRot(0.0F);
        scooter.xRotO = 0.0F;

        level.addFreshEntity(scooter);

        if (!player.getAbilities().instabuild) {
            stack.shrink(1);
        }
        return InteractionResultHolder.consume(stack);
    }

    private static void applyTagDefaults(ItemStack stack, Level level) {
        CompoundTag tag = stack.getOrCreateTag();
        // Актуальные дефолты entity (не старые 15000/500)
        if (!tag.contains(TAG_CHARGE)) {
            tag.putInt(TAG_CHARGE, ScooterEntity.MAX_CHARGE);
        }
        if (!tag.contains(TAG_DURABILITY)) {
            tag.putInt(TAG_DURABILITY, ScooterEntity.MAX_DURABILITY);
        }
        if (!tag.contains(TAG_SKIN)) {
            tag.putInt(TAG_SKIN, level.getRandom().nextInt(3));
        }
    }

    private static void applyTagToEntity(ItemStack stack, ScooterEntity scooter) {
        CompoundTag tag = stack.getOrCreateTag();
        scooter.setSkinId(tag.getInt(TAG_SKIN));
        scooter.setCharge(tag.getInt(TAG_CHARGE));
        scooter.setDurability(tag.getInt(TAG_DURABILITY));
    }
}
