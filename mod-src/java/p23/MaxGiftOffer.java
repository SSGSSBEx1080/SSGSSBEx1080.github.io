package com.example.zitraksmode.max;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.world.item.ItemStack;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class MaxGiftOffer {

    private final UUID giftId;
    private final UUID senderId;
    private final UUID recipientId;
    private final List<ItemStack> escrowStacks = new ArrayList<>();
    private final long createdAt;
    private GiftState state;
    private String lastError;
    private boolean refundPending;

    public MaxGiftOffer(UUID giftId, UUID senderId, UUID recipientId, List<ItemStack> offeredStacks, long createdAt) {
        this.giftId = giftId;
        this.senderId = senderId;
        this.recipientId = recipientId;
        if (offeredStacks != null) {
            for (ItemStack stack : offeredStacks) {
                if (stack != null && !stack.isEmpty()) {
                    this.escrowStacks.add(stack.copy());
                }
            }
        }
        this.createdAt = createdAt;
        this.state = GiftState.PENDING;
        this.lastError = "";
        this.refundPending = false;
    }

    public UUID getGiftId() {
        return giftId;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public UUID getRecipientId() {
        return recipientId;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public GiftState getState() {
        return state;
    }

    public void setState(GiftState state) {
        this.state = state == null ? GiftState.PENDING : state;
    }

    public String getLastError() {
        return lastError == null ? "" : lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError == null ? "" : lastError;
    }

    public boolean isRefundPending() {
        return refundPending;
    }

    public void setRefundPending(boolean refundPending) {
        this.refundPending = refundPending;
    }

    public List<ItemStack> getEscrowStacks() {
        List<ItemStack> copies = new ArrayList<>();
        for (ItemStack stack : escrowStacks) {
            copies.add(stack.copy());
        }
        return copies;
    }

    public List<ItemStack> getOfferedStacks() {
        return getEscrowStacks();
    }

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        tag.putUUID("GiftId", giftId);
        tag.putUUID("SenderId", senderId);
        tag.putUUID("RecipientId", recipientId);
        tag.putLong("CreatedAt", createdAt);
        tag.putString("State", state.name());
        tag.putString("LastError", getLastError());
        tag.putBoolean("RefundPending", refundPending);

        ListTag stacksTag = new ListTag();
        for (ItemStack stack : escrowStacks) {
            stacksTag.add(stack.save(new CompoundTag()));
        }
        tag.put("EscrowStacks", stacksTag);
        return tag;
    }

    public static MaxGiftOffer load(CompoundTag tag) {
        UUID giftId = tag.hasUUID("GiftId") ? tag.getUUID("GiftId") : UUID.randomUUID();
        UUID senderId = tag.hasUUID("SenderId") ? tag.getUUID("SenderId") : new UUID(0L, 0L);
        UUID recipientId = tag.hasUUID("RecipientId") ? tag.getUUID("RecipientId") : new UUID(0L, 0L);

        List<ItemStack> stacks = new ArrayList<>();
        String key = tag.contains("EscrowStacks", Tag.TAG_LIST) ? "EscrowStacks" : "OfferedStacks";
        ListTag stacksTag = tag.getList(key, Tag.TAG_COMPOUND);
        for (int i = 0; i < stacksTag.size(); i++) {
            stacks.add(ItemStack.of(stacksTag.getCompound(i)));
        }

        MaxGiftOffer offer = new MaxGiftOffer(giftId, senderId, recipientId, stacks, tag.getLong("CreatedAt"));
        try {
            offer.state = GiftState.valueOf(tag.getString("State"));
        } catch (Exception ignored) {
            offer.state = GiftState.PENDING;
        }
        offer.lastError = tag.getString("LastError");
        offer.refundPending = tag.getBoolean("RefundPending");
        return offer;
    }

    public enum GiftState {
        PENDING,
        ACCEPTED,
        REJECTED,
        FAILED
    }
}
