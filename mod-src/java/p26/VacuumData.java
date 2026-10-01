package com.example.zitraksmode.vacuum;

import net.minecraft.core.NonNullList;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.ContainerHelper;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.registries.ForgeRegistries;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** All state is item-local: two vacuums never share storage, history or settings. */
public final class VacuumData {
    public static final String TAG_STORAGE = "VacuumStorage";
    public static final String TAG_MODE = "VacuumMode";
    public static final String TAG_CUSTOM = "VacuumCustomItem";
    public static final String TAG_POWER = "VacuumPower";
    public static final String TAG_UPGRADES = "VacuumChestUpgrades";
    public static final String TAG_HISTORY = "VacuumHistory";
    public static final String TAG_MAX_TICKS = "VacuumMaxPowerTicks";

    public static final int BASE_SLOTS = 27;
    public static final int SLOTS_PER_CHEST = 10;
    public static final int MAX_CHESTS = 15;
    public static final int MAX_SLOTS = BASE_SLOTS + MAX_CHESTS * SLOTS_PER_CHEST;

    private VacuumData() {
    }

    public static CompoundTag tag(ItemStack stack) {
        return stack.getOrCreateTag();
    }

    public static VacuumFilterMode getMode(ItemStack stack) {
        return VacuumFilterMode.byId(tag(stack).getString(TAG_MODE));
    }

    public static void setMode(ItemStack stack, VacuumFilterMode mode) {
        tag(stack).putString(TAG_MODE, mode.id);
    }

    public static String getCustomItem(ItemStack stack) {
        return tag(stack).getString(TAG_CUSTOM);
    }

    public static void setCustomItem(ItemStack stack, String itemId) {
        tag(stack).putString(TAG_CUSTOM, itemId == null ? "" : itemId);

        if (itemId != null && !itemId.isBlank()) {
            pushHistory(stack, itemId);
        }
    }

    public static int getPower(ItemStack stack) {
        int raw = tag(stack).getInt(TAG_POWER);
        return raw <= 0 ? 1 : Math.max(1, Math.min(10, raw));
    }

    public static void setPower(ItemStack stack, int power) {
        tag(stack).putInt(TAG_POWER, Math.max(1, Math.min(10, power)));
    }

    public static int getUpgradeLevel(ItemStack stack) {
        return Math.max(0, Math.min(MAX_CHESTS, tag(stack).getInt(TAG_UPGRADES)));
    }

    public static boolean installChestUpgrade(ItemStack stack) {
        int level = getUpgradeLevel(stack);

        if (level >= MAX_CHESTS) {
            return false;
        }

        tag(stack).putInt(TAG_UPGRADES, level + 1);
        return true;
    }

    public static int getCapacity(ItemStack stack) {
        return BASE_SLOTS + getUpgradeLevel(stack) * SLOTS_PER_CHEST;
    }

    public static int getMaxPowerTicks(ItemStack stack) {
        return Math.max(0, tag(stack).getInt(TAG_MAX_TICKS));
    }

    public static void setMaxPowerTicks(ItemStack stack, int ticks) {
        tag(stack).putInt(TAG_MAX_TICKS, Math.max(0, ticks));
    }

    public static void saveInventory(ItemStack stack, NonNullList<ItemStack> inventory) {
        CompoundTag tag = tag(stack);
        tag.remove(TAG_STORAGE);

        CompoundTag storage = new CompoundTag();
        ContainerHelper.saveAllItems(storage, inventory, false);
        tag.put(TAG_STORAGE, storage);
    }

    public static NonNullList<ItemStack> loadInventorySafe(ItemStack stack) {
        NonNullList<ItemStack> inventory = NonNullList.withSize(MAX_SLOTS, ItemStack.EMPTY);
        CompoundTag root = stack.getTag();

        if (root != null && root.contains(TAG_STORAGE)) {
            ContainerHelper.loadAllItems(root.getCompound(TAG_STORAGE), inventory);
        }

        return inventory;
    }

    /**
     * Inserts as much as possible, groups identical stacks and then sorts the
     * complete vacuum inventory by registry id and NBT.
     */
    public static ItemStack insert(ItemStack vacuum, ItemStack incoming) {
        if (incoming.isEmpty()) {
            return ItemStack.EMPTY;
        }

        NonNullList<ItemStack> inventory = loadInventorySafe(vacuum);
        int capacity = getCapacity(vacuum);
        ItemStack remaining = incoming.copy();

        for (int index = 0; index < capacity && !remaining.isEmpty(); index++) {
            ItemStack current = inventory.get(index);

            if (!current.isEmpty() && ItemStack.isSameItemSameTags(current, remaining)) {
                int accepted = Math.min(
                        remaining.getCount(),
                        current.getMaxStackSize() - current.getCount()
                );

                if (accepted > 0) {
                    current.grow(accepted);
                    remaining.shrink(accepted);
                }
            }
        }

        for (int index = 0; index < capacity && !remaining.isEmpty(); index++) {
            if (inventory.get(index).isEmpty()) {
                int accepted = Math.min(
                        remaining.getCount(),
                        remaining.getMaxStackSize()
                );

                ItemStack inserted = remaining.copy();
                inserted.setCount(accepted);

                inventory.set(index, inserted);
                remaining.shrink(accepted);
            }
        }

        // Автосортировка запускается только если что-то реально попало внутрь.
        if (remaining.getCount() != incoming.getCount()) {
            sortInventory(inventory, capacity);
        }

        saveInventory(vacuum, inventory);
        return remaining;
    }

    /** Можно вызвать после другой операции с хранилищем. */
    public static void sortInventory(ItemStack vacuum) {
        NonNullList<ItemStack> inventory = loadInventorySafe(vacuum);

        sortInventory(inventory, getCapacity(vacuum));
        saveInventory(vacuum, inventory);
    }

    private static void sortInventory(
            NonNullList<ItemStack> inventory,
            int capacity
    ) {
        List<ItemStack> source = new ArrayList<>();

        for (int index = 0; index < capacity; index++) {
            ItemStack stack = inventory.get(index);

            if (!stack.isEmpty()) {
                source.add(stack.copy());
            }
        }

        /*
         * Одинаковые блоки и предметы сортируются рядом:
         * сначала namespace/id предмета, потом его NBT.
         */
        source.sort(Comparator.comparing(VacuumData::sortKey));

        List<ItemStack> ordered = new ArrayList<>();

        for (ItemStack sourceStack : source) {
            ItemStack remaining = sourceStack.copy();

            if (!ordered.isEmpty()) {
                ItemStack previous = ordered.get(ordered.size() - 1);

                if (ItemStack.isSameItemSameTags(previous, remaining)
                        && previous.getCount() < previous.getMaxStackSize()) {
                    int moved = Math.min(
                            remaining.getCount(),
                            previous.getMaxStackSize() - previous.getCount()
                    );

                    previous.grow(moved);
                    remaining.shrink(moved);
                }
            }

            while (!remaining.isEmpty()) {
                int amount = Math.min(
                        remaining.getCount(),
                        remaining.getMaxStackSize()
                );

                ItemStack part = remaining.copy();
                part.setCount(amount);

                ordered.add(part);
                remaining.shrink(amount);
            }
        }

        for (int index = 0; index < capacity; index++) {
            inventory.set(index, ItemStack.EMPTY);
        }

        for (int index = 0; index < ordered.size() && index < capacity; index++) {
            inventory.set(index, ordered.get(index));
        }
    }

    private static String sortKey(ItemStack stack) {
        ResourceLocation id = ForgeRegistries.ITEMS.getKey(stack.getItem());

        String itemId = id == null ? "" : id.toString();
        String nbt = stack.hasTag() ? stack.getTag().toString() : "";

        return itemId + "\u0000" + nbt;
    }

    public static List<String> getHistory(ItemStack stack) {
        List<String> result = new ArrayList<>();
        CompoundTag tag = stack.getTag();

        if (tag == null || !tag.contains(TAG_HISTORY)) {
            return result;
        }

        ListTag history = tag.getList(TAG_HISTORY, 8);

        for (int index = 0; index < history.size(); index++) {
            result.add(history.getString(index));
        }

        return result;
    }

    private static void pushHistory(ItemStack stack, String itemId) {
        List<String> old = getHistory(stack);

        old.remove(itemId);
        old.add(0, itemId);

        while (old.size() > 10) {
            old.remove(old.size() - 1);
        }

        ListTag result = new ListTag();

        for (String entry : old) {
            result.add(StringTag.valueOf(entry));
        }

        tag(stack).put(TAG_HISTORY, result);
    }
}