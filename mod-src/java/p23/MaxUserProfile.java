package com.example.zitraksmode.max;

import net.minecraft.nbt.CompoundTag;

import java.util.UUID;

public class MaxUserProfile {

    private final UUID userId;
    private String baseName;
    private String displayName;
    private String description;
    private String avatarId;
    private boolean registered;
    private String showcaseItemId;

    private int sentMessagesCount = 0;
    private int completedTradesCount = 0;
    private int rejectedTradesCount = 0;

    public MaxUserProfile(UUID userId, String baseName) {
        this.userId = userId;
        this.baseName = sanitizeBaseName(baseName);
        this.displayName = this.baseName;
        this.description = "";
        this.avatarId = "stock_steve";
        this.registered = false;
        this.showcaseItemId = "";
    }

    public UUID getUserId() {
        return userId;
    }

    public String getBaseName() {
        return baseName;
    }

    public void setBaseName(String baseName) {
        this.baseName = sanitizeBaseName(baseName);
        if (!registered && (displayName == null || displayName.isBlank())) {
            this.displayName = this.baseName;
        }
    }

    public String getDisplayName() {
        return normalize(displayName, 24, baseName);
    }

    public void setDisplayName(String displayName) {
        this.displayName = normalize(displayName, 24, baseName);
    }

    public String getDescription() {
        return normalize(description, 120, "");
    }

    public void setDescription(String description) {
        this.description = normalize(description, 120, "");
    }

    public String getAvatarId() {
        String normalized = normalizeAvatar(avatarId);
        return upgradeLegacyAvatarId(normalized);
    }

    public void setAvatarId(String avatarId) {
        this.avatarId = upgradeLegacyAvatarId(normalizeAvatar(avatarId));
    }

    public boolean isRegistered() {
        return registered;
    }

    public void setRegistered(boolean registered) {
        this.registered = registered;
    }

    public String getShowcaseItemId() {
        return normalize(showcaseItemId, 256, "");
    }

    public void setShowcaseItemId(String showcaseItemId) {
        this.showcaseItemId = normalize(showcaseItemId, 256, "");
    }

    public int getSentMessagesCount() { return sentMessagesCount; }
    public void incrementSentMessages() { this.sentMessagesCount++; }

    public int getCompletedTradesCount() { return completedTradesCount; }
    public void incrementCompletedTrades() { this.completedTradesCount++; }

    public int getRejectedTradesCount() { return rejectedTradesCount; }
    public void incrementRejectedTrades() { this.rejectedTradesCount++; }

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        tag.putUUID("UserId", userId);
        tag.putString("BaseName", getBaseName());
        tag.putString("DisplayName", getDisplayName());
        tag.putString("Description", getDescription());
        tag.putString("AvatarId", getAvatarId());
        tag.putBoolean("Registered", registered);
        tag.putString("ShowcaseItemId", getShowcaseItemId());
        tag.putInt("SentMessagesCount", sentMessagesCount);
        tag.putInt("CompletedTradesCount", completedTradesCount);
        tag.putInt("RejectedTradesCount", rejectedTradesCount);
        return tag;
    }

    public static MaxUserProfile load(CompoundTag tag) {
        UUID userId = tag.hasUUID("UserId") ? tag.getUUID("UserId") : UUID.randomUUID();
        MaxUserProfile profile = new MaxUserProfile(userId, tag.getString("BaseName"));
        profile.displayName = tag.getString("DisplayName");
        profile.description = tag.getString("Description");
        profile.avatarId = upgradeLegacyAvatarId(normalizeAvatar(tag.getString("AvatarId")));
        profile.registered = tag.getBoolean("Registered");
        profile.showcaseItemId = tag.getString("ShowcaseItemId");
        profile.sentMessagesCount = tag.getInt("SentMessagesCount");
        profile.completedTradesCount = tag.getInt("CompletedTradesCount");
        profile.rejectedTradesCount = tag.getInt("RejectedTradesCount");
        return profile;
    }

    private static String sanitizeBaseName(String baseName) {
        return normalize(baseName, 24, "Player");
    }

    private static String upgradeLegacyAvatarId(String avatarId) {
        return switch (avatarId == null ? "" : avatarId) {
            case "steve" -> "stock_steve";
            case "alex" -> "stock_alex";
            case "max_red" -> "stock_smile";
            case "max_blue" -> "stock_steve";
            case "max_purple" -> "stock_cat";
            case "max_black" -> "stock_skull";
            default -> avatarId == null || avatarId.isBlank() ? "stock_steve" : avatarId;
        };
    }

    private static String normalizeAvatar(String value) {
        if (value == null) {
            return "stock_steve";
        }
        String text = value.trim();
        if (text.startsWith("image:")) {
            return text.length() > 32700 ? text.substring(0, 32700) : text;
        }
        return normalize(text, 256, "stock_steve");
    }

    private static String normalize(String value, int maxLength, String fallback) {
        String text = value == null ? "" : value.trim();
        text = text.replace("\r", "").replace("\n", " ").replaceAll("\\s+", " ");
        if (text.length() > maxLength) {
            text = text.substring(0, maxLength);
        }
        if (text.isBlank()) {
            return fallback;
        }
        return text;
    }
}
