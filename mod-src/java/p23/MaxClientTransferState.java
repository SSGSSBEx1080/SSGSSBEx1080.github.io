package com.example.zitraksmode.max;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class MaxClientTransferState {

    private static final Map<UUID, TransferProgress> UPLOADS = new HashMap<>();
    private static final Map<UUID, TransferProgress> DOWNLOADS = new HashMap<>();

    private MaxClientTransferState() {
    }

    public static synchronized void startUpload(UUID attachmentId, String fileName, long totalBytes) {
        UPLOADS.put(attachmentId, new TransferProgress(attachmentId, fileName, Direction.UPLOAD, totalBytes));
    }

    public static synchronized void advanceUpload(UUID attachmentId, long bytes) {
        TransferProgress progress = UPLOADS.get(attachmentId);
        if (progress != null) {
            progress.advance(bytes);
        }
    }

    public static synchronized void finishUpload(UUID attachmentId, boolean success, String status) {
        TransferProgress progress = UPLOADS.get(attachmentId);
        if (progress != null) {
            progress.finish(success, status, null);
        }
    }

    public static synchronized void startDownload(UUID attachmentId, String fileName, long totalBytes, Path targetFile) {
        TransferProgress progress = new TransferProgress(attachmentId, fileName, Direction.DOWNLOAD, totalBytes);
        progress.setTargetFile(targetFile);
        DOWNLOADS.put(attachmentId, progress);
    }

    public static synchronized void advanceDownload(UUID attachmentId, long bytes) {
        TransferProgress progress = DOWNLOADS.get(attachmentId);
        if (progress != null) {
            progress.advance(bytes);
        }
    }

    public static synchronized void finishDownload(UUID attachmentId, boolean success, String status, Path targetFile) {
        TransferProgress progress = DOWNLOADS.get(attachmentId);
        if (progress != null) {
            progress.finish(success, status, targetFile);
        }
    }

    public static synchronized List<TransferProgressSnapshot> getSnapshots() {
        List<TransferProgressSnapshot> result = new ArrayList<>();
        for (TransferProgress progress : UPLOADS.values()) {
            result.add(progress.snapshot());
        }
        for (TransferProgress progress : DOWNLOADS.values()) {
            result.add(progress.snapshot());
        }
        result.sort(Comparator.comparingLong(TransferProgressSnapshot::updatedAt).reversed());
        return result;
    }

    public static synchronized void cleanupFinished() {
        UPLOADS.values().removeIf(TransferProgress::shouldRemove);
        DOWNLOADS.values().removeIf(TransferProgress::shouldRemove);
    }

    public enum Direction {
        UPLOAD,
        DOWNLOAD
    }

    private static final class TransferProgress {
        private final UUID attachmentId;
        private final String fileName;
        private final Direction direction;
        private final long totalBytes;
        private long transferredBytes;
        private boolean finished;
        private boolean success;
        private String status;
        private long updatedAt;
        private Path targetFile;

        private TransferProgress(UUID attachmentId, String fileName, Direction direction, long totalBytes) {
            this.attachmentId = attachmentId;
            this.fileName = fileName == null ? "file.bin" : fileName;
            this.direction = direction;
            this.totalBytes = Math.max(1L, totalBytes);
            this.transferredBytes = 0L;
            this.finished = false;
            this.success = false;
            this.status = direction == Direction.UPLOAD ? "Загрузка" : "Скачивание";
            this.updatedAt = System.currentTimeMillis();
            this.targetFile = null;
        }

        private void advance(long bytes) {
            transferredBytes = Math.min(totalBytes, transferredBytes + Math.max(0L, bytes));
            updatedAt = System.currentTimeMillis();
        }

        private void finish(boolean success, String status, Path targetFile) {
            this.finished = true;
            this.success = success;
            this.transferredBytes = totalBytes;
            this.status = status == null ? (success ? "Готово" : "Ошибка") : status;
            this.updatedAt = System.currentTimeMillis();
            if (targetFile != null) {
                this.targetFile = targetFile;
            }
        }

        private void setTargetFile(Path targetFile) {
            this.targetFile = targetFile;
        }

        private boolean shouldRemove() {
            return finished && System.currentTimeMillis() - updatedAt > 8000L;
        }

        private TransferProgressSnapshot snapshot() {
            return new TransferProgressSnapshot(
                    attachmentId,
                    fileName,
                    direction,
                    totalBytes,
                    transferredBytes,
                    finished,
                    success,
                    status,
                    updatedAt,
                    targetFile == null ? "" : targetFile.toAbsolutePath().toString()
            );
        }
    }

    public record TransferProgressSnapshot(
            UUID attachmentId,
            String fileName,
            Direction direction,
            long totalBytes,
            long transferredBytes,
            boolean finished,
            boolean success,
            String status,
            long updatedAt,
            String targetPath
    ) {
        public int percent() {
            return totalBytes <= 0L ? 0 : (int) Math.min(100L, (transferredBytes * 100L) / totalBytes);
        }
    }
}
