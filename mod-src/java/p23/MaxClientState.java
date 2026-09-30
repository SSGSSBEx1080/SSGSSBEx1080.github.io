package com.example.zitraksmode.max;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class MaxClientState {

    private static UUID selfId = null;
    private static final Map<UUID, MaxUserProfile> profiles = new HashMap<>();
    private static final List<MaxChatMessage> messages = new ArrayList<>();
    private static final Map<String, MaxFileAttachment> attachments = new HashMap<>();
    private static final Map<String, MaxGiftOffer> gifts = new HashMap<>();

    private MaxClientState() {
    }

    public static void replace(UUID newSelfId, List<MaxUserProfile> newProfiles, List<MaxChatMessage> newMessages, List<MaxFileAttachment> newAttachments, List<MaxGiftOffer> newGifts) {
        selfId = newSelfId;
        profiles.clear();
        for (MaxUserProfile profile : newProfiles) {
            profiles.put(profile.getUserId(), profile);
        }
        messages.clear();
        messages.addAll(newMessages);
        messages.sort(Comparator.comparingLong(MaxChatMessage::getSentAtMillis));
        attachments.clear();
        for (MaxFileAttachment attachment : newAttachments) {
            attachments.put(attachment.getAttachmentId().toString(), attachment);
        }
        gifts.clear();
        for (MaxGiftOffer gift : newGifts) {
            gifts.put(gift.getGiftId().toString(), gift);
        }
    }

    public static UUID getSelfId() {
        return selfId;
    }

    public static MaxUserProfile getSelfProfile() {
        return selfId == null ? null : profiles.get(selfId);
    }

    public static List<MaxUserProfile> getContacts() {
        List<MaxUserProfile> result = new ArrayList<>();
        for (MaxUserProfile profile : profiles.values()) {
            if (selfId == null || !profile.getUserId().equals(selfId)) {
                result.add(profile);
            }
        }
        result.sort(Comparator.comparing(MaxUserProfile::getDisplayName, String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    public static MaxUserProfile getProfile(UUID userId) {
        return profiles.get(userId);
    }

    public static MaxChatMessage getMessage(long messageId) {
        for (MaxChatMessage message : messages) {
            if (message.getMessageId() == messageId) {
                return message;
            }
        }
        return null;
    }

    public static List<MaxChatMessage> getConversation(UUID otherId) {
        List<MaxChatMessage> result = new ArrayList<>();
        if (selfId == null || otherId == null) {
            return result;
        }
        for (MaxChatMessage message : messages) {
            boolean samePair = (message.getSenderId().equals(selfId) && message.getRecipientId().equals(otherId))
                    || (message.getSenderId().equals(otherId) && message.getRecipientId().equals(selfId));
            if (samePair && message.isVisibleTo(selfId)) {
                result.add(message);
            }
        }
        result.sort(Comparator.comparingLong(MaxChatMessage::getSentAtMillis));
        return result;
    }

    public static String getLastMessagePreview(UUID otherId) {
        List<MaxChatMessage> conversation = getConversation(otherId);
        if (conversation.isEmpty()) {
            return "";
        }
        MaxChatMessage last = conversation.get(conversation.size() - 1);
        if (last.isDeleted()) {
            return "Сообщение удалено";
        }
        return switch (last.getType()) {
            case FILE -> "Файл: " + getAttachmentName(last.getAttachmentId());
            case GIFT -> "Подарок";
            case SYSTEM -> last.getText();
            default -> {
                String text = last.getText().replace("\n", " ").trim();
                yield text.length() > 40 ? text.substring(0, 40) + "…" : text;
            }
        };
    }

    public static int getUnreadCount(UUID otherId) {
        int count = 0;
        if (selfId == null || otherId == null) {
            return 0;
        }
        for (MaxChatMessage message : messages) {
            if (message.getSenderId().equals(otherId) && message.getRecipientId().equals(selfId) && !message.isRead() && message.isVisibleTo(selfId)) {
                count++;
            }
        }
        return count;
    }

    public static MaxFileAttachment getAttachment(String attachmentId) {
        return attachmentId == null ? null : attachments.get(attachmentId);
    }

    public static String getAttachmentName(String attachmentId) {
        MaxFileAttachment attachment = getAttachment(attachmentId);
        return attachment == null ? "file.bin" : attachment.getFileName();
    }

    public static MaxGiftOffer getGift(String giftId) {
        return giftId == null ? null : gifts.get(giftId);
    }

    public static List<MaxGiftOffer> getGifts() {
        return new ArrayList<>(gifts.values());
    }
}
