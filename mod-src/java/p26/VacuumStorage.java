package com.example.zitraksmode.vacuum;

import net.minecraft.core.NonNullList;
import net.minecraft.world.Container;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;

/** Chest-like storage persisted inside a single Vacuum ItemStack. */
public final class VacuumStorage implements Container {
    private final ItemStack vacuum;
    private final NonNullList<ItemStack> items;

    public VacuumStorage(ItemStack vacuum) {
        this.vacuum = vacuum;
        this.items = VacuumData.loadInventorySafe(vacuum);
    }

    public int getCapacity() {
        return VacuumData.getCapacity(vacuum);
    }

    public boolean isUnlockedSlot(int index) {
        return index >= 0 && index < getCapacity();
    }

    public void save() {
        VacuumData.saveInventory(vacuum, items);
    }

    @Override
    public int getContainerSize() {
        return VacuumData.MAX_SLOTS;
    }

    @Override
    public boolean isEmpty() {
        for (ItemStack item : items) if (!item.isEmpty()) return false;
        return true;
    }

    @Override
    public ItemStack getItem(int index) {
        return index >= 0 && index < items.size() ? items.get(index) : ItemStack.EMPTY;
    }

    @Override
    public ItemStack removeItem(int index, int amount) {
        if (!isUnlockedSlot(index)) return ItemStack.EMPTY;
        ItemStack result = net.minecraft.world.ContainerHelper.removeItem(items, index, amount);
        if (!result.isEmpty()) save();
        return result;
    }

    @Override
    public ItemStack removeItemNoUpdate(int index) {
        if (!isUnlockedSlot(index)) return ItemStack.EMPTY;
        ItemStack result = net.minecraft.world.ContainerHelper.takeItem(items, index);
        if (!result.isEmpty()) save();
        return result;
    }

    @Override
    public void setItem(int index, ItemStack stack) {
        if (!isUnlockedSlot(index)) return;
        items.set(index, stack);
        if (stack.getCount() > getMaxStackSize()) stack.setCount(getMaxStackSize());
        save();
    }

    @Override
    public void setChanged() {
        save();
    }

    @Override
    public boolean stillValid(Player player) {
        return true;
    }

    @Override
    public void clearContent() {
        for (int i = 0; i < items.size(); i++) items.set(i, ItemStack.EMPTY);
        save();
    }
}
