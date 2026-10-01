package com.example.zitraksmode.events;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** Server-side LMB state, fed by the client only while the vacuum is in the main hand. */
public final class VacuumSuctionState {
    private static final Set<UUID> HOLDING = new HashSet<>();

    private VacuumSuctionState() {
    }

    public static boolean isHolding(UUID playerId) {
        return HOLDING.contains(playerId);
    }

    public static void setHolding(UUID playerId, boolean holding) {
        if (holding) HOLDING.add(playerId);
        else HOLDING.remove(playerId);
    }

    public static void clear(UUID playerId) {
        HOLDING.remove(playerId);
    }
}
