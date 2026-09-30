package com.example.zitraksmode.max;

import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.storage.LevelResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

public class MaxAttachmentStorage {

    private static final long MAX_STORAGE_BYTES = 500L * 1024L * 1024L; // 500 MB

    private MaxAttachmentStorage() {
    }

    public static Path baseDir(MinecraftServer server) throws IOException {
        Path dir = server.getWorldPath(LevelResource.ROOT).resolve("zitraksmode").resolve("max_attachments");
        Files.createDirectories(dir);
        return dir;
    }

    public static Path resolvePermanentPath(MinecraftServer server, UUID attachmentId) throws IOException {
        return baseDir(server).resolve(attachmentId.toString() + ".bin");
    }

    public static void storeFromTemp(MinecraftServer server, UUID attachmentId, Path tempPath) throws IOException {
        Path target = resolvePermanentPath(server, attachmentId);
        Files.createDirectories(target.getParent());
        Files.move(tempPath, target, StandardCopyOption.REPLACE_EXISTING);
        cleanupOldFiles(server);
    }

    public static Path createTempPath(MinecraftServer server, UUID attachmentId) throws IOException {
        Path dir = baseDir(server).resolve("incoming");
        Files.createDirectories(dir);
        return dir.resolve(attachmentId.toString() + ".part");
    }

    public static InputStream openForRead(MinecraftServer server, UUID attachmentId) throws IOException {
        return Files.newInputStream(resolvePermanentPath(server, attachmentId));
    }

    public static long size(MinecraftServer server, UUID attachmentId) throws IOException {
        return Files.size(resolvePermanentPath(server, attachmentId));
    }

    public static void cleanupOldFiles(MinecraftServer server) {
        try {
            Path dir = baseDir(server);
            try (Stream<Path> stream = Files.list(dir)) {
                List<Path> files = stream.filter(p -> p.getFileName().toString().endsWith(".bin"))
                        .sorted(Comparator.comparing((Path p) -> {
                            try {
                                return Files.readAttributes(p, BasicFileAttributes.class).lastModifiedTime().toMillis();
                            } catch (IOException e) {
                                return Long.MAX_VALUE;
                            }
                        })).toList();
                
                long totalSize = 0;
                for (Path p : files) {
                    totalSize += Files.size(p);
                }

                for (Path p : files) {
                    if (totalSize <= MAX_STORAGE_BYTES) {
                        break;
                    }
                    long size = Files.size(p);
                    Files.deleteIfExists(p);
                    totalSize -= size;
                }
            }
        } catch (Exception ignored) {
        }
    }
}
