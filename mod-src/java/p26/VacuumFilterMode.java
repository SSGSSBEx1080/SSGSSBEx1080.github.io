package com.example.zitraksmode.vacuum;

public enum VacuumFilterMode {
    ORES("ores"),
    BLOCKS("blocks"),
    FOOD("food"),
    MISC("misc"),
    CUSTOM("custom");

    public final String id;

    VacuumFilterMode(String id) {
        this.id = id;
    }

    public static VacuumFilterMode byId(String id) {
        for (VacuumFilterMode mode : values()) {
            if (mode.id.equals(id)) return mode;
        }
        return ORES;
    }
}
