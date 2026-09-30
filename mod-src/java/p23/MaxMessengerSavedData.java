package com.example.zitraksmode.max;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.saveddata.SavedData;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class MaxMessengerSavedData extends SavedData {

    private static final String DATA_NAME = "zitraksmode_max_messenger";

    private final Map<UUID, MaxUserProfile> profiles = new LinkedHashMap<>();
    private final List<MaxChatMessage> messages = new ArrayList<>();
    private final Map<UUID, MaxFileAttachment> attachments = new LinkedHashMap<>();
    private final Map<UUID, MaxGiftOffer> gifts = new LinkedHashMap<>();
    private long nextMessageId = 1L;

    public static MaxMessengerSavedData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(MaxMessengerSavedData::load, MaxMessengerSavedData::new, DATA_NAME);
    }

    public static MaxMessengerSavedData load(CompoundTag tag) {
        MaxMessengerSavedData data = new MaxMessengerSavedData();
        data.nextMessageId = Math.max(1L, tag.getLong("NextMessageId"));

        ListTag profilesTag = tag.getList("Profiles", Tag.TAG_COMPOUND);
        for (int i = 0; i < profilesTag.size(); i++) {
            MaxUserProfile profile = MaxUserProfile.load(profilesTag.getCompound(i));
            data.profiles.put(profile.getUserId(), profile);
        }

        ListTag messagesTag = tag.getList("Messages", Tag.TAG_COMPOUND);
        for (int i = 0; i < messagesTag.size(); i++) {
            data.messages.add(MaxChatMessage.load(messagesTag.getCompound(i)));
        }

        ListTag attachmentsTag = tag.getList("Attachments", Tag.TAG_COMPOUND);
        for (int i = 0; i < attachmentsTag.size(); i++) {
            MaxFileAttachment attachment = MaxFileAttachment.loadMetadata(attachmentsTag.getCompound(i));
            data.attachments.put(attachment.getAttachmentId(), attachment);
        }

        ListTag giftsTag = tag.getList("Gifts", Tag.TAG_COMPOUND);
        for (int i = 0; i < giftsTag.size(); i++) {
            MaxGiftOffer gift = MaxGiftOffer.load(giftsTag.getCompound(i));
            data.gifts.put(gift.getGiftId(), gift);
        }

        return data;
    }

    public void ensureOnlineProfiles(MinecraftServer server) {
        if (server == null) {
            return;
        }
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            ensureProfile(player);
        }
    }

    public MaxUserProfile ensureProfile(ServerPlayer player) {
        MaxUserProfile profile = profiles.computeIfAbsent(player.getUUID(), uuid -> new MaxUserProfile(uuid, player.getGameProfile().getName()));
        profile.setBaseName(player.getGameProfile().getName());
        refundPendingGifts(player);
        setDirty();
        return profile;
    }

    public MaxUserProfile ensureProfile(UUID userId, String baseName) {
        MaxUserProfile profile = profiles.computeIfAbsent(userId, uuid -> new MaxUserProfile(uuid, baseName));
        profile.setBaseName(baseName);
        setDirty();
        return profile;
    }

    public void updateProfile(ServerPlayer player, String displayName, String description, String avatarId, String showcaseItemId) {
        MaxUserProfile profile = ensureProfile(player);
        profile.setDisplayName(displayName);
        profile.setDescription(description);
        profile.setAvatarId(avatarId);
        profile.setShowcaseItemId(showcaseItemId);
        profile.setRegistered(true);
        setDirty();
    }

    public List<MaxUserProfile> getProfiles() {
        List<MaxUserProfile> list = new ArrayList<>(profiles.values());
        list.sort(Comparator.comparing(MaxUserProfile::getDisplayName, String.CASE_INSENSITIVE_ORDER));
        return list;
    }

    public MaxUserProfile getProfile(UUID userId) {
        return profiles.get(userId);
    }

    public MaxChatMessage sendTextMessage(ServerPlayer sender, UUID recipientId, String text, long replyToMessageId) {
        text = MaxAntiCensor.process(text);
        
        MaxUserProfile senderProfile = ensureProfile(sender);
        senderProfile.incrementSentMessages();
        if (senderProfile.getSentMessagesCount() == 100) {
            grantAdvancement(sender, "zitraksmode:23_max/max_100_messages");
        }
        
        if (profiles.get(recipientId) == null) {
            throw new IllegalStateException("Recipient profile not found: " + recipientId);
        }

        MaxChatMessage message = new MaxChatMessage(nextMessageId++, sender.getUUID(), recipientId, text, System.currentTimeMillis());
        message.setType(MaxChatMessage.MessageType.TEXT);
        message.setReplyToMessageId(replyToMessageId);
        if (sender.getUUID().equals(recipientId)) {
            message.setRead(true);
        }
        messages.add(message);
        setDirty();
        return message;
    }

    public MaxChatMessage sendAttachmentMessageMetadata(ServerPlayer sender, UUID recipientId, String text, long replyToMessageId, UUID attachmentId, String fileName, String mimeType, long sizeBytes, byte[] previewBytes) {
        text = MaxAntiCensor.process(text);
        
        MaxUserProfile senderProfile = ensureProfile(sender);
        senderProfile.incrementSentMessages();
        if (senderProfile.getSentMessagesCount() == 100) {
            grantAdvancement(sender, "zitraksmode:23_max/max_100_messages");
        }
        
        if (profiles.get(recipientId) == null) {
            throw new IllegalStateException("Recipient profile not found: " + recipientId);
        }

        MaxFileAttachment.AttachmentKind kind = detectAttachmentKind(fileName, mimeType);
        attachments.put(attachmentId, new MaxFileAttachment(attachmentId, sender.getUUID(), fileName, mimeType, sizeBytes, new byte[0], System.currentTimeMillis(), kind, previewBytes));

        MaxChatMessage message = new MaxChatMessage(nextMessageId++, sender.getUUID(), recipientId, text, System.currentTimeMillis());
        message.setType(MaxChatMessage.MessageType.FILE);
        message.setAttachmentId(attachmentId.toString());
        message.setReplyToMessageId(replyToMessageId);
        if (sender.getUUID().equals(recipientId)) {
            message.setRead(true);
        }
        messages.add(message);
        setDirty();
        return message;
    }

    public MaxChatMessage sendAttachmentMessage(ServerPlayer sender, UUID recipientId, String text, long replyToMessageId, String fileName, String mimeType, byte[] dataBytes) {
        if (sender == null || sender.getServer() == null) {
            throw new IllegalStateException("Sender server missing");
        }
        byte[] safeBytes = dataBytes == null ? new byte[0] : dataBytes;
        UUID attachmentId = UUID.randomUUID();
        MaxFileAttachment attachment = new MaxFileAttachment(attachmentId, sender.getUUID(), fileName, mimeType, safeBytes, System.currentTimeMillis());
        try {
            Path target = MaxAttachmentStorage.resolvePermanentPath(sender.getServer(), attachmentId);
            Files.createDirectories(target.getParent());
            Files.write(target, safeBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to store attachment", exception);
        }
        return sendAttachmentMessageMetadata(
                sender,
                recipientId,
                text,
                replyToMessageId,
                attachmentId,
                attachment.getFileName(),
                attachment.getMimeType(),
                attachment.getSizeBytesLong(),
                attachment.getPreviewImageBytes()
        );
    }

    public MaxChatMessage sendGiftMessage(ServerPlayer sender, UUID recipientId, List<ItemStack> offeredStacks, String text, long replyToMessageId) {
        text = MaxAntiCensor.process(text);
        
        MaxUserProfile senderProfile = ensureProfile(sender);
        senderProfile.incrementSentMessages();
        if (senderProfile.getSentMessagesCount() == 100) {
            grantAdvancement(sender, "zitraksmode:23_max/max_100_messages");
        }
        
        if (profiles.get(recipientId) == null) {
            throw new IllegalStateException("Recipient profile not found: " + recipientId);
        }

        List<ItemStack> cleanStacks = new ArrayList<>();
        if (offeredStacks != null) {
            for (ItemStack stack : offeredStacks) {
                if (stack != null && !stack.isEmpty()) {
                    cleanStacks.add(stack.copy());
                }
            }
        }
        if (cleanStacks.isEmpty()) {
            throw new IllegalArgumentException("Gift is empty");
        }
        if (!hasItems(sender, cleanStacks)) {
            throw new IllegalStateException("Sender lacks gift items");
        }

        consumeItems(sender, cleanStacks);
        sender.getInventory().setChanged();

        MaxGiftOffer offer = new MaxGiftOffer(UUID.randomUUID(), sender.getUUID(), recipientId, cleanStacks, System.currentTimeMillis());
        gifts.put(offer.getGiftId(), offer);

        MaxChatMessage message = new MaxChatMessage(nextMessageId++, sender.getUUID(), recipientId, text, System.currentTimeMillis());
        message.setType(MaxChatMessage.MessageType.GIFT);
        message.setGiftId(offer.getGiftId().toString());
        message.setReplyToMessageId(replyToMessageId);
        if (sender.getUUID().equals(recipientId)) {
            message.setRead(true);
        }
        messages.add(message);
        setDirty();
        return message;
    }

    public boolean editMessage(ServerPlayer sender, long messageId, String newText) {
        newText = MaxAntiCensor.process(newText);
        MaxChatMessage message = getMessage(messageId);
        if (message == null || message.isDeleted()) {
            return false;
        }
        if (!message.getSenderId().equals(sender.getUUID())) {
            return false;
        }
        if (message.getType() != MaxChatMessage.MessageType.TEXT) {
            return false;
        }
        message.setText(newText);
        setDirty();
        return true;
    }

    public boolean deleteMessage(ServerPlayer sender, long messageId) {
        MaxChatMessage message = getMessage(messageId);
        if (message == null || message.isDeleted()) {
            return false;
        }
        if (!message.getSenderId().equals(sender.getUUID())) {
            return false;
        }
        boolean selfChat = message.getSenderId().equals(message.getRecipientId());
        message.deleteForParticipants(true, selfChat);
        setDirty();
        return true;
    }

    public MaxChatMessage forwardMessage(ServerPlayer sender, UUID newRecipientId, long sourceMessageId) {
        MaxChatMessage source = getMessage(sourceMessageId);
        if (source == null || profiles.get(newRecipientId) == null) {
            return null;
        }

        MaxChatMessage forwarded = new MaxChatMessage(nextMessageId++, sender.getUUID(), newRecipientId, source.getRawText(), System.currentTimeMillis());
        forwarded.setType(source.getType());
        forwarded.setForwarded(true);
        MaxUserProfile sourceProfile = profiles.get(source.getSenderId());
        forwarded.setForwardSourceName(sourceProfile == null ? "" : sourceProfile.getDisplayName());
        forwarded.setAttachmentId(source.getAttachmentId());
        forwarded.setGiftId(source.getGiftId());
        if (sender.getUUID().equals(newRecipientId)) {
            forwarded.setRead(true);
        }
        messages.add(forwarded);
        setDirty();
        return forwarded;
    }

    public GiftResult respondToGift(ServerPlayer actor, UUID giftId, boolean accept) {
        MaxGiftOffer gift = gifts.get(giftId);
        if (gift == null) {
            return GiftResult.NOT_FOUND;
        }
        if (!gift.getRecipientId().equals(actor.getUUID())) {
            return GiftResult.NOT_ALLOWED;
        }
        if (gift.getState() != MaxGiftOffer.GiftState.PENDING && gift.getState() != MaxGiftOffer.GiftState.FAILED) {
            return GiftResult.ALREADY_FINALIZED;
        }

        if (!accept) {
            refundGiftToSender(actor.getServer(), gift, true);
            gift.setState(MaxGiftOffer.GiftState.REJECTED);
            setDirty();
            
            MaxUserProfile actorProfile = ensureProfile(actor);
            actorProfile.incrementRejectedTrades();
            if (actorProfile.getRejectedTradesCount() == 5) {
                grantAdvancement(actor, "zitraksmode:23_max/max_5_rejects");
            }
            
            return GiftResult.REJECTED;
        }

        for (ItemStack stack : gift.getEscrowStacks()) {
            ItemStack copy = stack.copy();
            if (!actor.getInventory().add(copy)) {
                actor.drop(copy, false);
            }
        }
        actor.getInventory().setChanged();
        gift.setState(MaxGiftOffer.GiftState.ACCEPTED);
        gift.setRefundPending(false);
        gift.setLastError("");
        setDirty();
        
        MaxUserProfile actorProfile = ensureProfile(actor);
        actorProfile.incrementCompletedTrades();
        if (actorProfile.getCompletedTradesCount() == 5) {
            grantAdvancement(actor, "zitraksmode:23_max/max_5_trades");
        }

        MaxUserProfile senderProfile = profiles.get(gift.getSenderId());
        if (senderProfile != null) {
            senderProfile.incrementCompletedTrades();
            ServerPlayer originalSender = actor.getServer().getPlayerList().getPlayer(gift.getSenderId());
            if (originalSender != null && senderProfile.getCompletedTradesCount() == 5) {
                grantAdvancement(originalSender, "zitraksmode:23_max/max_5_trades");
            }
        }
        
        return GiftResult.ACCEPTED;
    }

    public void refundGiftToSender(MinecraftServer server, MaxGiftOffer gift, boolean rejected) {
        if (gift == null) {
            return;
        }
        if (server == null) {
            gift.setRefundPending(true);
            gift.setLastError("Возврат будет при входе отправителя");
            return;
        }
        ServerPlayer sender = server.getPlayerList().getPlayer(gift.getSenderId());
        if (sender == null) {
            gift.setRefundPending(true);
            gift.setLastError("Возврат будет при входе отправителя");
            return;
        }
        for (ItemStack stack : gift.getEscrowStacks()) {
            ItemStack copy = stack.copy();
            if (!sender.getInventory().add(copy)) {
                sender.drop(copy, false);
            }
        }
        sender.getInventory().setChanged();
        gift.setRefundPending(false);
        gift.setLastError(rejected ? "" : gift.getLastError());
    }

    public void refundPendingGifts(ServerPlayer sender) {
        for (MaxGiftOffer gift : gifts.values()) {
            if (gift.getSenderId().equals(sender.getUUID()) && gift.isRefundPending()) {
                for (ItemStack stack : gift.getEscrowStacks()) {
                    ItemStack copy = stack.copy();
                    if (!sender.getInventory().add(copy)) {
                        sender.drop(copy, false);
                    }
                }
                sender.getInventory().setChanged();
                gift.setRefundPending(false);
                gift.setLastError("");
            }
        }
    }

    public List<MaxChatMessage> getConversation(UUID a, UUID b) {
        List<MaxChatMessage> result = new ArrayList<>();
        for (MaxChatMessage message : messages) {
            boolean samePair = (message.getSenderId().equals(a) && message.getRecipientId().equals(b))
                    || (message.getSenderId().equals(b) && message.getRecipientId().equals(a));
            if (samePair) {
                result.add(message);
            }
        }
        result.sort(Comparator.comparingLong(MaxChatMessage::getSentAtMillis));
        return result;
    }

    public void markConversationRead(UUID readerId, UUID otherId) {
        boolean changed = false;
        for (MaxChatMessage message : messages) {
            if (message.getSenderId().equals(otherId) && message.getRecipientId().equals(readerId) && !message.isRead()) {
                message.setRead(true);
                changed = true;
            }
        }
        if (changed) {
            setDirty();
        }
    }

    public int getUnreadCount(UUID readerId, UUID otherId) {
        int count = 0;
        for (MaxChatMessage message : messages) {
            if (message.getSenderId().equals(otherId) && message.getRecipientId().equals(readerId) && !message.isRead() && message.isVisibleTo(readerId)) {
                count++;
            }
        }
        return count;
    }

    public List<MaxChatMessage> getMessagesForUser(UUID userId) {
        List<MaxChatMessage> result = new ArrayList<>();
        for (MaxChatMessage message : messages) {
            if ((message.getSenderId().equals(userId) || message.getRecipientId().equals(userId)) && message.isVisibleTo(userId)) {
                result.add(message);
            }
        }
        result.sort(Comparator.comparingLong(MaxChatMessage::getSentAtMillis));
        return result;
    }

    public List<MaxFileAttachment> getAttachmentMetadataForUser(UUID userId) {
        Set<String> usedIds = new LinkedHashSet<>();
        for (MaxChatMessage message : getMessagesForUser(userId)) {
            if (!message.getAttachmentId().isBlank()) {
                usedIds.add(message.getAttachmentId());
            }
        }
        List<MaxFileAttachment> result = new ArrayList<>();
        for (String id : usedIds) {
            try {
                MaxFileAttachment attachment = attachments.get(UUID.fromString(id));
                if (attachment != null) {
                    result.add(MaxFileAttachment.loadMetadata(attachment.saveMetadata()));
                }
            } catch (Exception ignored) {
            }
        }
        return result;
    }

    public List<MaxGiftOffer> getGiftsForUser(UUID userId) {
        List<MaxGiftOffer> result = new ArrayList<>();
        for (MaxGiftOffer gift : gifts.values()) {
            if (gift.getSenderId().equals(userId) || gift.getRecipientId().equals(userId)) {
                result.add(gift);
            }
        }
        return result;
    }

    public MaxFileAttachment getAttachment(UUID attachmentId) {
        return attachments.get(attachmentId);
    }

    public boolean canUserDownloadAttachment(UUID userId, UUID attachmentId) {
        if (!attachments.containsKey(attachmentId)) {
            return false;
        }
        for (MaxChatMessage message : getMessagesForUser(userId)) {
            if (!message.getAttachmentId().isBlank()) {
                try {
                    if (UUID.fromString(message.getAttachmentId()).equals(attachmentId)) {
                        return true;
                    }
                } catch (Exception ignored) {
                }
            }
        }
        return false;
    }

    public MaxChatMessage getMessage(long messageId) {
        for (MaxChatMessage message : messages) {
            if (message.getMessageId() == messageId) {
                return message;
            }
        }
        return null;
    }

    @Override
    public CompoundTag save(CompoundTag tag) {
        tag.putLong("NextMessageId", nextMessageId);

        ListTag profilesTag = new ListTag();
        for (MaxUserProfile profile : profiles.values()) {
            profilesTag.add(profile.save());
        }
        tag.put("Profiles", profilesTag);

        ListTag messagesTag = new ListTag();
        for (MaxChatMessage message : messages) {
            messagesTag.add(message.save());
        }
        tag.put("Messages", messagesTag);

        ListTag attachmentsTag = new ListTag();
        for (MaxFileAttachment attachment : attachments.values()) {
            attachmentsTag.add(attachment.saveMetadata());
        }
        tag.put("Attachments", attachmentsTag);

        ListTag giftsTag = new ListTag();
        for (MaxGiftOffer gift : gifts.values()) {
            giftsTag.add(gift.save());
        }
        tag.put("Gifts", giftsTag);

        return tag;
    }

    private boolean hasItems(ServerPlayer sender, List<ItemStack> required) {
        List<ItemStack> remaining = copyStacks(required);
        for (ItemStack invStack : sender.getInventory().items) {
            if (invStack.isEmpty()) continue;
            int available = invStack.getCount();
            for (ItemStack need : remaining) {
                if (available > 0 && !need.isEmpty() && ItemStack.isSameItemSameTags(invStack, need)) {
                    int used = Math.min(available, need.getCount());
                    need.shrink(used);
                    available -= used;
                }
            }
        }
        for (ItemStack need : remaining) {
            if (!need.isEmpty()) return false;
        }
        return true;
    }

    private void consumeItems(ServerPlayer sender, List<ItemStack> required) {
        List<ItemStack> remaining = copyStacks(required);
        for (ItemStack invStack : sender.getInventory().items) {
            if (invStack.isEmpty()) continue;
            for (ItemStack need : remaining) {
                if (!invStack.isEmpty() && !need.isEmpty() && ItemStack.isSameItemSameTags(invStack, need)) {
                    int used = Math.min(invStack.getCount(), need.getCount());
                    invStack.shrink(used);
                    need.shrink(used);
                }
            }
        }
    }

    private List<ItemStack> copyStacks(List<ItemStack> source) {
        List<ItemStack> result = new ArrayList<>();
        for (ItemStack stack : source) {
            result.add(stack.copy());
        }
        return result;
    }

    public enum GiftResult {
        ACCEPTED,
        REJECTED,
        MISSING_ITEMS,
        SENDER_OFFLINE,
        NOT_FOUND,
        NOT_ALLOWED,
        ALREADY_FINALIZED,
        SERVER_MISSING
    }

    private MaxFileAttachment.AttachmentKind detectAttachmentKind(String fileName, String mimeType) {
        String mime = mimeType == null ? "" : mimeType.toLowerCase(java.util.Locale.ROOT);
        String lowerName = fileName == null ? "" : fileName.toLowerCase(java.util.Locale.ROOT);
        if (mime.startsWith("image/") || lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".bmp") || lowerName.endsWith(".gif") || lowerName.endsWith(".webp")) {
            return MaxFileAttachment.AttachmentKind.IMAGE;
        }
        if (mime.startsWith("video/") || lowerName.endsWith(".mp4") || lowerName.endsWith(".webm") || lowerName.endsWith(".mov") || lowerName.endsWith(".mkv") || lowerName.endsWith(".avi")) {
            return MaxFileAttachment.AttachmentKind.VIDEO;
        }
        if (mime.startsWith("audio/") || lowerName.endsWith(".mp3") || lowerName.endsWith(".ogg") || lowerName.endsWith(".wav") || lowerName.endsWith(".flac") || lowerName.endsWith(".m4a")) {
            return MaxFileAttachment.AttachmentKind.AUDIO;
        }
        return MaxFileAttachment.AttachmentKind.OTHER;
    }

    private void grantAdvancement(ServerPlayer player, String advancementId) {
        net.minecraft.resources.ResourceLocation id = new net.minecraft.resources.ResourceLocation(advancementId);
        net.minecraft.advancements.Advancement adv = player.getServer().getAdvancements().getAdvancement(id);
        if (adv != null) {
            net.minecraft.advancements.AdvancementProgress progress = player.getAdvancements().getOrStartProgress(adv);
            if (!progress.isDone()) {
                for (String criterion : progress.getRemainingCriteria()) {
                    player.getAdvancements().award(adv, criterion);
                }
            }
        }
    }
}
