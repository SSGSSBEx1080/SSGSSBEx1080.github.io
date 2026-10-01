package com.example.zitraksmode.world.scooter;

import com.example.zitraksmode.ZitraksMode;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.saveddata.SavedData;

import java.util.HashSet;
import java.util.Set;

/**
 * Какие ячейки сетки станций уже сгенерированы (overworld).
 * Без изменений по логике — только чистота.
 */
public class ScooterStationSavedData extends SavedData {

    private static final String DATA_NAME = ZitraksMode.MODID + "_scooter_stations";
    private final Set<String> generatedCells = new HashSet<>();

    public static ScooterStationSavedData get(ServerLevel level) {
        return level.getServer().overworld().getDataStorage()
                .computeIfAbsent(ScooterStationSavedData::load, ScooterStationSavedData::new, DATA_NAME);
    }

    public static ScooterStationSavedData load(CompoundTag tag) {
        ScooterStationSavedData data = new ScooterStationSavedData();
        ListTag list = tag.getList("Cells", 8);
        for (int i = 0; i < list.size(); i++) {
            data.generatedCells.add(list.getString(i));
        }
        return data;
    }

    public boolean isGenerated(int cellX, int cellZ) {
        return generatedCells.contains(key(cellX, cellZ));
    }

    public void markGenerated(int cellX, int cellZ) {
        generatedCells.add(key(cellX, cellZ));
        setDirty();
    }

    @Override
    public CompoundTag save(CompoundTag tag) {
        ListTag list = new ListTag();
        for (String cell : generatedCells) {
            list.add(StringTag.valueOf(cell));
        }
        tag.put("Cells", list);
        return tag;
    }

    private static String key(int cellX, int cellZ) {
        return cellX + ":" + cellZ;
    }
}
