package com.example.zitraksmode.events;

import com.example.zitraksmode.ZitraksMode;
import com.example.zitraksmode.caps.SandevistanCapability;
import com.example.zitraksmode.items.ImmunosuppressantItem;
import com.example.zitraksmode.network.SandevistanFreezePacket;
import com.example.zitraksmode.network.SandevistanNetwork;
import com.example.zitraksmode.network.SandevistanSyncPacket;
import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.ModSounds;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.item.PrimedTnt;
import net.minecraft.world.entity.monster.Creeper;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.levelgen.structure.BuiltinStructures;
import net.minecraft.sounds.SoundSource;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.living.LivingEvent;
import net.minecraftforge.event.entity.living.LivingEntityUseItemEvent;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraft.advancements.Advancement;
import net.minecraft.advancements.AdvancementProgress;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Mod.EventBusSubscriber(modid = ZitraksMode.MODID)
public class SandevistanEventHandler {

    private static final Set<Entity> FROZEN_ENTITIES = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public static void grantAdvancement(ServerPlayer player, String advancementPath) {
        Advancement adv = player.server.getAdvancements().getAdvancement(new ResourceLocation(ZitraksMode.MODID, advancementPath));
        if (adv != null) {
            AdvancementProgress progress = player.getAdvancements().getOrStartProgress(adv);
            for (String crit : progress.getRemainingCriteria()) {
                player.getAdvancements().award(adv, crit);
            }
        }
    }

    // ==========================================
    // МГНОВЕННОЕ ПОЕДАНИЕ ПИЩИ / ПИТЬЁ ЗЕЛИЙ
    // ==========================================
    @SubscribeEvent
    public static void onItemUseTick(LivingEntityUseItemEvent.Tick event) {
        if (event.getEntity() instanceof Player) {
            Player player = (Player) event.getEntity();
            SandevistanCapability.get(player).ifPresent(cap -> {
                if (cap.isAccelerating() && event.getDuration() > 1) {
                    event.setDuration(1); // Сокращаем время поедания/питья до 1 тика!
                }
            });
        }
    }

    // ==========================================
    // ОТКЛЮЧАЕМ ФРЕЙМЫ НЕУЯЗВИМОСТИ (БЕСКОНЕЧНЫЕ УДАРЫ)
    // ==========================================
    @SubscribeEvent
    public static void onPlayerAttack(AttackEntityEvent event) {
        Player player = event.getEntity();
        SandevistanCapability.get(player).ifPresent(cap -> {
            if (cap.isAccelerating()) {
                Entity target = event.getTarget();
                target.invulnerableTime = 0; // Снимаем бессмертие после удара
                if (target instanceof LivingEntity) {
                    ((LivingEntity) target).hurtTime = 0; // Сбрасываем красную анимацию боли
                }
            }
        });
    }

    @SubscribeEvent
    public static void onLivingDeath(LivingDeathEvent event) {
        if (event.getSource().getEntity() instanceof ServerPlayer) {
            ServerPlayer sp = (ServerPlayer) event.getSource().getEntity();
            SandevistanCapability.get(sp).ifPresent(cap -> {
                if (cap.isAccelerating()) grantAdvancement(sp, "29_sandevistan/05_kill");
            });
        }
    }

    @SubscribeEvent
    public static void onLivingTick(LivingEvent.LivingTickEvent event) {
        if (FROZEN_ENTITIES.contains(event.getEntity())) {
            event.setCanceled(true);
        }
    }

    @SubscribeEvent
    public static void onLevelTick(TickEvent.LevelTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;
        List<Entity> toRemove = new ArrayList<>();

        for (Entity e : FROZEN_ENTITIES) {
            if (e.level != event.level) continue;
            if (e.isRemoved()) {
                toRemove.add(e);
                continue;
            }

            CompoundTag data = e.getPersistentData();
            int ticks = data.getInt("SandyFreezeTicks");

            if (ticks > 0) {
                ticks--;
                data.putInt("SandyFreezeTicks", ticks);

                // Жесткая заморозка скорости и камеры
                e.setDeltaMovement(0, 0, 0);
                e.setXRot(data.getFloat("SandyRotX"));
                e.setYRot(data.getFloat("SandyRotY"));
                e.xRotO = e.getXRot();
                e.yRotO = e.getYRot();

                if (e instanceof LivingEntity) {
                    LivingEntity le = (LivingEntity) e;
                    le.setYHeadRot(data.getFloat("SandyYHeadRot"));
                    le.yBodyRot = data.getFloat("SandyYBodyRot");
                    le.yHeadRotO = le.getYHeadRot();
                    le.yBodyRotO = le.yBodyRot;
                }

                // Замораживаем таймер обычного динамита
                if (e instanceof PrimedTnt) {
                    PrimedTnt tnt = (PrimedTnt) e;
                    tnt.setFuse(data.getInt("SandyFuse"));
                }

                // ОТМАТЫВАЕМ ВРЕМЯ ВЗРЫВА КРИПЕРОВ НАЗАД
                if (e instanceof Creeper) {
                    ((Creeper) e).setSwellDir(-1);
                }

                e.hasImpulse = true;
            }

            // ЕСЛИ ВРЕМЯ РАЗМОРАЖИВАЕТСЯ:
            if (ticks <= 0) {
                data.putBoolean("SandyFrozen", false);

                // Восстанавливаем сохраненную скорость и гравитацию
                e.setDeltaMovement(
                    data.getDouble("SandyMotX"),
                    data.getDouble("SandyMotY"),
                    data.getDouble("SandyMotZ")
                );
                e.setNoGravity(data.getBoolean("SandyNoGrav"));
                e.hasImpulse = true;

                if (e instanceof LivingEntity) {
                    LivingEntity le = (LivingEntity) e;
                    le.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
                    le.removeEffect(MobEffects.DIG_SLOWDOWN);
                    le.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 60, 0, false, false, false));
                }

                if (e instanceof Mob) {
                    Mob mob = (Mob) e;
                    mob.setNoAi(data.getBoolean("SandyNoAi"));
                }

                if (e instanceof ServerPlayer) {
                    ServerPlayer sp = (ServerPlayer) e;
                    SandevistanNetwork.sendToClient(new SandevistanFreezePacket(false), sp);
                }

                toRemove.add(e);
            }
        }
        FROZEN_ENTITIES.removeAll(toRemove);
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;
        Player player = event.player;
        if (player.level.isClientSide) return;

        SandevistanCapability.get(player).ifPresent(cap -> {
            boolean wasAccelerating = cap.isAccelerating();
            boolean wasPsychosis = cap.isPsychosisActive();
            boolean wasCutscene = cap.isInCutscene();

            cap.tick(player);
            boolean isAccelerating = cap.isAccelerating();

            if (!wasAccelerating && isAccelerating) {
                player.level.playSound(null, player.blockPosition(), ModSounds.SANDEVISTAN_ACTIVATE.get(), SoundSource.PLAYERS, 1.0F, 1.0F);
                if (player instanceof ServerPlayer) grantAdvancement((ServerPlayer) player, "29_sandevistan/03_activated");
            } else if (wasAccelerating && !isAccelerating && !cap.isPsychosisActive()) {
                player.level.playSound(null, player.blockPosition(), ModSounds.SANDEVISTAN_DEACTIVATE.get(), SoundSource.PLAYERS, 1.0F, 1.0F);
            }

            if (isAccelerating != wasAccelerating || cap.isPsychosisActive() != wasPsychosis || cap.isInCutscene() != wasCutscene || player.tickCount % 10 == 0) {
                CompoundTag nbt = new CompoundTag();
                cap.saveNBTData(nbt);
                SandevistanNetwork.sendToTrackingAndSelf(new SandevistanSyncPacket(player.getId(), nbt), player);
            }

            if (cap.isInCutscene()) {
                int ticks = cap.getCutsceneTicks();
                if (ticks < 40) player.setDeltaMovement(0, 0.05, 0);
                else if (ticks < 90) player.setDeltaMovement(0, 0, 0);
                else player.setDeltaMovement(0, -0.2, 0);
                player.hurtMarked = true;

                if (player.level instanceof ServerLevel) {
                    ServerLevel sl = (ServerLevel) player.level;
                    if (ticks % 2 == 0) {
                        for (int y = 0; y < 40; y += 2) {
                            sl.sendParticles(ParticleTypes.END_ROD, player.getX(), player.getY() + y, player.getZ(), 2, 0.2, 0.5, 0.2, 0);
                            sl.sendParticles(ParticleTypes.WITCH, player.getX(), player.getY() + y, player.getZ(), 2, 0.3, 0.5, 0.3, 0);
                        }
                    }
                    if (ticks == 1) {
                        sl.playSound(null, player.blockPosition(), SoundEvents.BEACON_ACTIVATE, SoundSource.PLAYERS, 2.0f, 0.8f);
                        player.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 100, 0, false, false, false));
                    }
                    if (ticks == 99) {
                        sl.sendParticles(ParticleTypes.FLASH, player.getX(), player.getY() + 1, player.getZ(), 50, 0.5, 2.0, 0.5, 0.1);
                        sl.sendParticles(ParticleTypes.EXPLOSION_EMITTER, player.getX(), player.getY() + 1, player.getZ(), 1, 0, 0, 0, 0);
                        sl.playSound(null, player.blockPosition(), SoundEvents.ANVIL_DESTROY, SoundSource.PLAYERS, 2.0f, 0.5f);
                        sl.playSound(null, player.blockPosition(), SoundEvents.ZOMBIE_BREAK_WOODEN_DOOR, SoundSource.PLAYERS, 1.0f, 1.0f);
                        player.setItemSlot(EquipmentSlot.CHEST, new ItemStack(ModItems.SANDEVISTAN.get()));
                        if (player instanceof ServerPlayer) grantAdvancement((ServerPlayer) player, "29_sandevistan/02_obtained");
                    }
                }
            }

            if (cap.isPsychosisActive()) {
                int ticks = cap.getPsychosisTicks();
                float progress = Math.min(1.0f, ticks / 200.0f);
                if (ticks == 1) player.level.playSound(null, player.getX(), player.getY(), player.getZ(), ModSounds.SANDEVISTAN_PSYCHOSIS.get(), SoundSource.PLAYERS, 1.0F, 1.0F);

                if (ticks > 0) {
                    if (player.getRandom().nextFloat() < (0.1f + progress * 0.9f)) {
                        float power = 0.5f + progress * 2.5f;
                        player.setDeltaMovement((player.getRandom().nextFloat() - 0.5) * power, (player.getRandom().nextFloat() - 0.5) * power * 0.5f, (player.getRandom().nextFloat() - 0.5) * power);
                        player.hurtMarked = true;
                    }
                    if (ticks % 5 == 0) {
                        float radius = 2.0f + progress * 13.0f;
                        float dmg = 5.0f + progress * 45.0f;
                        for (LivingEntity e : player.level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(radius))) {
                            if (e != player) e.hurt(DamageSource.playerAttack(player), dmg);
                        }
                        if (player.level instanceof ServerLevel) {
                            ((ServerLevel) player.level).sendParticles(ParticleTypes.EXPLOSION, player.getX(), player.getY(), player.getZ(), (int)(progress * 10) + 1, radius/2, radius/2, radius/2, 0);
                        }
                    }
                    if (ticks % 10 == 0) {
                        player.hurt(DamageSource.MAGIC, 1.0f + progress * 4.0f);
                    }
                    if (ticks >= 200) {
                        player.setItemSlot(EquipmentSlot.CHEST, ItemStack.EMPTY);
                        player.hurt(DamageSource.OUT_OF_WORLD, Float.MAX_VALUE);
                        player.setHealth(0);
                        if (player instanceof ServerPlayer) grantAdvancement((ServerPlayer) player, "29_sandevistan/06_death");
                    } else if (player.isDeadOrDying()) {
                        player.setItemSlot(EquipmentSlot.CHEST, ItemStack.EMPTY);
                        if (player instanceof ServerPlayer) grantAdvancement((ServerPlayer) player, "29_sandevistan/06_death");
                    }
                }
            }

            if (isAccelerating) {
                player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 2, 4, false, false, false));
                player.addEffect(new MobEffectInstance(MobEffects.DIG_SPEED, 2, 3, false, false, false));
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 2, 2, false, false, false));

                // РАДИУС 20 БЛОКОВ
                for (Entity e : player.level.getEntitiesOfClass(Entity.class, player.getBoundingBox().inflate(20.0))) {
                    if (e != player) {
                        boolean hasSandy = false;
                        if (e instanceof Player) {
                            Player p2 = (Player) e;
                            hasSandy = SandevistanCapability.get(p2).map(SandevistanCapability::isAccelerating).orElse(false);
                        }

                        if (!hasSandy) {
                            CompoundTag data = e.getPersistentData();
                            if (!data.getBoolean("SandyFrozen")) {
                                data.putBoolean("SandyFrozen", true);
                                data.putDouble("SandyMotX", e.getDeltaMovement().x);
                                data.putDouble("SandyMotY", e.getDeltaMovement().y);
                                data.putDouble("SandyMotZ", e.getDeltaMovement().z);
                                data.putFloat("SandyRotX", e.getXRot());
                                data.putFloat("SandyRotY", e.getYRot());

                                data.putBoolean("SandyNoGrav", e.isNoGravity());
                                e.setNoGravity(true);

                                if (e instanceof Mob) {
                                    Mob mob = (Mob) e;
                                    data.putBoolean("SandyNoAi", mob.isNoAi());
                                    mob.setNoAi(true);
                                    mob.setTarget(null); // Забывают цель
                                }

                                if (e instanceof PrimedTnt) {
                                    PrimedTnt tnt = (PrimedTnt) e;
                                    data.putInt("SandyFuse", tnt.getFuse());
                                }

                                if (e instanceof LivingEntity) {
                                    LivingEntity le = (LivingEntity) e;
                                    data.putFloat("SandyYHeadRot", le.getYHeadRot());
                                    data.putFloat("SandyYBodyRot", le.yBodyRot);
                                }

                                if (e instanceof ServerPlayer) {
                                    ServerPlayer sp = (ServerPlayer) e;
                                    SandevistanNetwork.sendToClient(new SandevistanFreezePacket(true), sp);
                                }
                            }

                            e.setDeltaMovement(0, 0, 0);
                            e.setXRot(data.getFloat("SandyRotX"));
                            e.setYRot(data.getFloat("SandyRotY"));
                            e.xRotO = e.getXRot();
                            e.yRotO = e.getYRot();
                            if (e instanceof LivingEntity) {
                                LivingEntity le = (LivingEntity) e;
                                le.setYHeadRot(data.getFloat("SandyYHeadRot"));
                                le.yBodyRot = data.getFloat("SandyYBodyRot");
                                le.yHeadRotO = le.getYHeadRot();
                                le.yBodyRotO = le.yBodyRot;
                                le.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 5, 255, false, false, false));
                                le.addEffect(new MobEffectInstance(MobEffects.DIG_SLOWDOWN, 5, 255, false, false, false));
                            }

                            e.hasImpulse = true;
                            data.putInt("SandyFreezeTicks", 3);
                            FROZEN_ENTITIES.add(e);
                        }
                    }
                }
            }
        });

        if (player.tickCount % 20 == 0 && !SandevistanCapability.get(player).map(SandevistanCapability::isInCutscene).orElse(false)) {
            ItemStack chest = player.getItemBySlot(EquipmentSlot.CHEST);
            if (chest.getItem() == Items.NETHERITE_CHESTPLATE) {
                if (player.getItemInHand(InteractionHand.MAIN_HAND).getItem() == com.example.zitraksmode.ModItems.IMMUNOSUPPRESSANT.get() &&
                    player.getItemInHand(InteractionHand.OFF_HAND).getItem() == com.example.zitraksmode.ModItems.IMMUNOSUPPRESSANT.get()) {
                    if (player.getLevel() instanceof ServerLevel) {
                        ServerLevel sl = (ServerLevel) player.getLevel();
                        if (sl.structureManager().getStructureWithPieceAt(player.blockPosition(), BuiltinStructures.END_CITY).isValid()) {
                            player.getItemInHand(InteractionHand.MAIN_HAND).shrink(1);
                            player.getItemInHand(InteractionHand.OFF_HAND).shrink(1);
                            SandevistanCapability.get(player).ifPresent(SandevistanCapability::startCutscene);
                        }
                    }
                }
            }
        }
    }
}
