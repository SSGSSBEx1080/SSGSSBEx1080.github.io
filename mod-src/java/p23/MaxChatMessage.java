package com.example.zitraksmode.max;

import net.minecraft.nbt.CompoundTag;

import java.util.UUID;

public class MaxChatMessage {

    private final long messageId;
    private final UUID senderId;
    private final UUID recipientId;
    private String text;
    private final long sentAtMillis;
    private boolean delivered;
    private boolean read;
    private boolean edited;
    private boolean deleted;
    private boolean hiddenForSender;
    private boolean hiddenForRecipient;
    private MessageType type;
    private long replyToMessageId;
    private boolean forwarded;
    private String forwardSourceName;
    private String attachmentId;
    private String giftId;

    public MaxChatMessage(long messageId, UUID senderId, UUID recipientId, String text, long sentAtMillis) {
        this.messageId = messageId;
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.text = normalizeText(text);
        this.sentAtMillis = sentAtMillis;
        this.delivered = true;
        this.read = false;
        this.edited = false;
        this.deleted = false;
        this.hiddenForSender = false;
        this.hiddenForRecipient = false;
        this.type = MessageType.TEXT;
        this.replyToMessageId = 0L;
        this.forwarded = false;
        this.forwardSourceName = "";
        this.attachmentId = "";
        this.giftId = "";
    }

    public long getMessageId() {
        return messageId;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public UUID getRecipientId() {
        return recipientId;
    }

    public String getText() {
        return deleted ? "Сообщение удалено" : text;
    }

    public String getRawText() {
        return text;
    }

    public void setText(String text) {
        this.text = normalizeText(text);
        this.edited = true;
    }

    public long getSentAtMillis() {
        return sentAtMillis;
    }

    public boolean isDelivered() {
        return delivered;
    }

    public void setDelivered(boolean delivered) {
        this.delivered = delivered;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public boolean isEdited() {
        return edited;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public boolean isHiddenForSender() {
        return hiddenForSender;
    }

    public boolean isHiddenForRecipient() {
        return hiddenForRecipient;
    }

    public boolean isVisibleTo(UUID viewerId) {
        if (viewerId == null) {
            return false;
        }
        if (viewerId.equals(senderId)) {
            return !hiddenForSender;
        }
        if (viewerId.equals(recipientId)) {
            return !hiddenForRecipient;
        }
        return false;
    }

    public void deleteForParticipants(boolean hideForSender, boolean hideForRecipient) {
        this.deleted = true;
        this.hiddenForSender = hideForSender;
        this.hiddenForRecipient = hideForRecipient;
        this.edited = false;
        if (hideForSender && hideForRecipient) {
            this.text = "";
        }
    }

    public MessageType getType() {
        return type == null ? MessageType.TEXT : type;
    }

    public void setType(MessageType type) {
        this.type = type == null ? MessageType.TEXT : type;
    }

    public long getReplyToMessageId() {
        return replyToMessageId;
    }

    public void setReplyToMessageId(long replyToMessageId) {
        this.replyToMessageId = Math.max(0L, replyToMessageId);
    }

    public boolean isForwarded() {
        return forwarded;
    }

    public void setForwarded(boolean forwarded) {
        this.forwarded = forwarded;
    }

    public String getForwardSourceName() {
        return forwardSourceName == null ? "" : forwardSourceName;
    }

    public void setForwardSourceName(String forwardSourceName) {
        this.forwardSourceName = normalizeText(forwardSourceName);
    }

    public String getAttachmentId() {
        return attachmentId == null ? "" : attachmentId;
    }

    public void setAttachmentId(String attachmentId) {
        this.attachmentId = attachmentId == null ? "" : attachmentId.trim();
    }

    public String getGiftId() {
        return giftId == null ? "" : giftId;
    }

    public void setGiftId(String giftId) {
        this.giftId = giftId == null ? "" : giftId.trim();
    }

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        tag.putLong("MessageId", messageId);
        tag.putUUID("SenderId", senderId);
        tag.putUUID("RecipientId", recipientId);
        tag.putString("Text", text);
        tag.putLong("SentAtMillis", sentAtMillis);
        tag.putBoolean("Delivered", delivered);
        tag.putBoolean("Read", read);
        tag.putBoolean("Edited", edited);
        tag.putBoolean("Deleted", deleted);
        tag.putBoolean("HiddenForSender", hiddenForSender);
        tag.putBoolean("HiddenForRecipient", hiddenForRecipient);
        tag.putString("Type", getType().name());
        tag.putLong("ReplyToMessageId", replyToMessageId);
        tag.putBoolean("Forwarded", forwarded);
        tag.putString("ForwardSourceName", getForwardSourceName());
        tag.putString("AttachmentId", getAttachmentId());
        tag.putString("GiftId", getGiftId());
        return tag;
    }

    public static MaxChatMessage load(CompoundTag tag) {
        MaxChatMessage message = new MaxChatMessage(
                tag.getLong("MessageId"),
                tag.getUUID("SenderId"),
                tag.getUUID("RecipientId"),
                tag.getString("Text"),
                tag.getLong("SentAtMillis")
        );
        message.delivered = tag.getBoolean("Delivered");
        message.read = tag.getBoolean("Read");
        message.edited = tag.getBoolean("Edited");
        message.deleted = tag.getBoolean("Deleted");
        message.hiddenForSender = tag.getBoolean("HiddenForSender");
        message.hiddenForRecipient = tag.getBoolean("HiddenForRecipient");
        try {
            message.type = MessageType.valueOf(tag.getString("Type"));
        } catch (Exception ignored) {
            message.type = MessageType.TEXT;
        }
        message.replyToMessageId = Math.max(0L, tag.getLong("ReplyToMessageId"));
        message.forwarded = tag.getBoolean("Forwarded");
        message.forwardSourceName = tag.getString("ForwardSourceName");
        message.attachmentId = tag.getString("AttachmentId");
        message.giftId = tag.getString("GiftId");
        return message;
    }

    public static String normalizeText(String value) {
        String text = value == null ? "" : value.replace("\r", "");
        if (text.length() > 4000) {
            text = text.substring(0, 4000);
        }
        return text;
    }

    public enum MessageType {
        TEXT,
        FILE,
        GIFT,
        SYSTEM
    }
}
