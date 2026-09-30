package com.example.zitraksmode.max;

import net.minecraft.nbt.CompoundTag;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Locale;
import java.util.UUID;

public class MaxFileAttachment {

    private final UUID attachmentId;
    private final UUID ownerId;
    private final String fileName;
    private final String mimeType;
    private final long sizeBytes;
    private final byte[] data;
    private final long uploadedAt;
    private final AttachmentKind kind;
    private final byte[] previewImageBytes;

    public MaxFileAttachment(UUID attachmentId, UUID ownerId, String fileName, String mimeType, byte[] data, long uploadedAt) {
        this(attachmentId, ownerId, fileName, mimeType, data == null ? 0L : data.length, data, uploadedAt, detectKind(fileName, mimeType), buildPreviewBytes(fileName, mimeType, data));
    }

    public MaxFileAttachment(UUID attachmentId, UUID ownerId, String fileName, String mimeType, long sizeBytes, byte[] data, long uploadedAt, AttachmentKind kind, byte[] previewImageBytes) {
        this.attachmentId = attachmentId;
        this.ownerId = ownerId;
        this.fileName = normalize(fileName, 256, "file.bin");
        this.mimeType = normalize(mimeType, 128, "application/octet-stream");
        this.sizeBytes = Math.max(0L, sizeBytes);
        this.data = data == null ? new byte[0] : data;
        this.uploadedAt = uploadedAt;
        this.kind = kind == null ? detectKind(fileName, mimeType) : kind;
        this.previewImageBytes = previewImageBytes == null ? new byte[0] : previewImageBytes;
    }

    public UUID getAttachmentId() {
        return attachmentId;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public byte[] getData() {
        return data;
    }

    public int getSizeBytes() {
        return (int) Math.min(Integer.MAX_VALUE, sizeBytes);
    }

    public long getSizeBytesLong() {
        return sizeBytes;
    }

    public long getUploadedAt() {
        return uploadedAt;
    }

    public AttachmentKind getKind() {
        return kind;
    }

    public boolean isImage() {
        return kind == AttachmentKind.IMAGE;
    }

    public boolean isVideo() {
        return kind == AttachmentKind.VIDEO;
    }

    public boolean isAudio() {
        return kind == AttachmentKind.AUDIO;
    }

    public byte[] getPreviewImageBytes() {
        return previewImageBytes;
    }

    public CompoundTag saveFull() {
        CompoundTag tag = saveMetadata();
        tag.putByteArray("Data", data);
        return tag;
    }

    public CompoundTag saveMetadata() {
        CompoundTag tag = new CompoundTag();
        tag.putUUID("AttachmentId", attachmentId);
        tag.putUUID("OwnerId", ownerId);
        tag.putString("FileName", fileName);
        tag.putString("MimeType", mimeType);
        tag.putInt("SizeBytes", getSizeBytes());
        tag.putLong("UploadedAt", uploadedAt);
        tag.putString("Kind", kind.name());
        tag.putByteArray("PreviewImageBytes", previewImageBytes);
        return tag;
    }

    public static MaxFileAttachment loadFull(CompoundTag tag) {
        UUID attachmentId = tag.hasUUID("AttachmentId") ? tag.getUUID("AttachmentId") : UUID.randomUUID();
        UUID ownerId = tag.hasUUID("OwnerId") ? tag.getUUID("OwnerId") : new UUID(0L, 0L);
        return new MaxFileAttachment(
                attachmentId,
                ownerId,
                tag.getString("FileName"),
                tag.getString("MimeType"),
                Math.max(0L, tag.getInt("SizeBytes")),
                tag.getByteArray("Data"),
                tag.getLong("UploadedAt"),
                parseKind(tag.getString("Kind")),
                tag.getByteArray("PreviewImageBytes")
        );
    }

    public static MaxFileAttachment loadMetadata(CompoundTag tag) {
        UUID attachmentId = tag.hasUUID("AttachmentId") ? tag.getUUID("AttachmentId") : UUID.randomUUID();
        UUID ownerId = tag.hasUUID("OwnerId") ? tag.getUUID("OwnerId") : new UUID(0L, 0L);
        long size = Math.max(0L, tag.getInt("SizeBytes"));
        return new MaxFileAttachment(
                attachmentId,
                ownerId,
                tag.getString("FileName"),
                tag.getString("MimeType"),
                size,
                new byte[0],
                tag.getLong("UploadedAt"),
                parseKind(tag.getString("Kind")),
                tag.getByteArray("PreviewImageBytes")
        );
    }

    private static AttachmentKind detectKind(String fileName, String mimeType) {
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        String lowerName = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (mime.startsWith("image/") || lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".bmp") || lowerName.endsWith(".gif") || lowerName.endsWith(".webp")) {
            return AttachmentKind.IMAGE;
        }
        if (mime.startsWith("video/") || lowerName.endsWith(".mp4") || lowerName.endsWith(".webm") || lowerName.endsWith(".mov") || lowerName.endsWith(".mkv") || lowerName.endsWith(".avi")) {
            return AttachmentKind.VIDEO;
        }
        if (mime.startsWith("audio/") || lowerName.endsWith(".mp3") || lowerName.endsWith(".ogg") || lowerName.endsWith(".wav") || lowerName.endsWith(".flac") || lowerName.endsWith(".m4a")) {
            return AttachmentKind.AUDIO;
        }
        return AttachmentKind.OTHER;
    }

    private static byte[] buildPreviewBytes(String fileName, String mimeType, byte[] data) {
        if (detectKind(fileName, mimeType) != AttachmentKind.IMAGE || data == null || data.length == 0) {
            return new byte[0];
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(data));
            if (image == null) {
                return new byte[0];
            }
            int targetW = 256;
            int targetH = 192;
            double scale = Math.min(targetW / (double) image.getWidth(), targetH / (double) image.getHeight());
            int drawW = Math.max(1, (int) Math.round(image.getWidth() * scale));
            int drawH = Math.max(1, (int) Math.round(image.getHeight() * scale));
            int drawX = (targetW - drawW) / 2;
            int drawY = (targetH - drawH) / 2;

            BufferedImage scaled = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = scaled.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(image, drawX, drawY, drawW, drawH, null);
            g.dispose();

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(scaled, "png", output);
            return output.toByteArray();
        } catch (Exception ignored) {
            return new byte[0];
        }
    }

    private static AttachmentKind parseKind(String value) {
        try {
            return AttachmentKind.valueOf(value);
        } catch (Exception ignored) {
            return AttachmentKind.OTHER;
        }
    }

    private static String normalize(String value, int maxLen, String fallback) {
        String text = value == null ? "" : value.trim();
        if (text.length() > maxLen) {
            text = text.substring(0, maxLen);
        }
        return text.isBlank() ? fallback : text;
    }

    public enum AttachmentKind {
        IMAGE,
        VIDEO,
        AUDIO,
        OTHER
    }
}
