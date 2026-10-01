package com.example.zitraksmode.menu;

import com.example.zitraksmode.ModItems;
import com.example.zitraksmode.vacuum.VacuumData;
import com.example.zitraksmode.vacuum.VacuumFilterMode;
import com.example.zitraksmode.vacuum.VacuumStorage;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.world.Container;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.MenuProvider;
import net.minecraft.world.SimpleContainer;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.DataSlot;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

public final class VacuumMenu extends AbstractContainerMenu {
    public static final int VISIBLE_ROWS = 3;
    public static final int STORAGE_COLUMNS = 9;
    public static final int VISIBLE_SLOTS = VISIBLE_ROWS * STORAGE_COLUMNS;

    private final ItemStack vacuum;
    private final VacuumStorage storage;
    private final Container upgradeInput = new SimpleContainer(1);
    private final InteractionHand hand;
    private final int sourceSlot;

    private int displayUpgradeLevel;
    private int scrollRow;

    private boolean transferAllActive;
    private int transferIndex;

    public static VacuumMenu fromNetwork(
            int id,
            Inventory inventory,
            FriendlyByteBuf buffer
    ) {
        InteractionHand hand = buffer.readEnum(InteractionHand.class);
        int slot = buffer.readVarInt();

        ItemStack stack = hand == InteractionHand.MAIN_HAND
                ? inventory.getItem(Math.max(0, Math.min(slot, 35)))
                : inventory.offhand.get(0);

        return new VacuumMenu(id, inventory, stack, hand, slot);
    }

    public static MenuProvider provider(
            ItemStack vacuum,
            InteractionHand hand,
            int sourceSlot
    ) {
        return new MenuProvider() {
            @Override
            public Component getDisplayName() {
                return Component.translatable("container.zitraksmode.vacuum");
            }

            @Override
            public AbstractContainerMenu createMenu(
                    int id,
                    Inventory inventory,
                    Player player
            ) {
                return new VacuumMenu(id, inventory, vacuum, hand, sourceSlot);
            }
        };
    }

    public VacuumMenu(
            int id,
            Inventory playerInventory,
            ItemStack vacuum,
            InteractionHand hand,
            int sourceSlot
    ) {
        super(VacuumMenus.VACUUM_MENU.get(), id);

        this.vacuum = vacuum;
        this.hand = hand;
        this.sourceSlot = sourceSlot;
        this.storage = new VacuumStorage(vacuum);
        this.displayUpgradeLevel = VacuumData.getUpgradeLevel(vacuum);

        addDataSlot(new DataSlot() {
            @Override
            public int get() {
                return VacuumData.getUpgradeLevel(VacuumMenu.this.vacuum);
            }

            @Override
            public void set(int value) {
                VacuumMenu.this.displayUpgradeLevel = value;
            }
        });

        for (int row = 0; row < VISIBLE_ROWS; row++) {
            for (int column = 0; column < STORAGE_COLUMNS; column++) {
                int visibleIndex = column + row * STORAGE_COLUMNS;

                addSlot(
                        new VisibleVacuumSlot(
                                this,
                                visibleIndex,
                                8 + column * 18,
                                18 + row * 18
                        )
                );
            }
        }

        // Сдвинуто на 2 пикселя вправо и вниз.
        addSlot(new UpgradeSlot(upgradeInput, 0, 182, 20));

        for (int row = 0; row < 3; row++) {
            for (int column = 0; column < 9; column++) {
                addSlot(
                        new Slot(
                                playerInventory,
                                column + row * 9 + 9,
                                8 + column * 18,
                                126 + row * 18
                        )
                );
            }
        }

        for (int column = 0; column < 9; column++) {
            addSlot(new Slot(playerInventory, column, 8 + column * 18, 184));
        }
    }

    public ItemStack getVacuum() {
        return vacuum;
    }

    public int getScrollRow() {
        return scrollRow;
    }

    public int getDisplayUpgradeLevel() {
        return displayUpgradeLevel;
    }

    public int getDisplayCapacity() {
        return VacuumData.BASE_SLOTS
                + displayUpgradeLevel * VacuumData.SLOTS_PER_CHEST;
    }

    public int getMaxScrollRow() {
        int rows = (getDisplayCapacity() + STORAGE_COLUMNS - 1)
                / STORAGE_COLUMNS;

        return Math.max(0, rows - VISIBLE_ROWS);
    }

    public boolean isDisplayUnlockedSlot(int index) {
        return index >= 0 && index < getDisplayCapacity();
    }

    public void setScrollRow(int row) {
        scrollRow = Math.max(0, Math.min(getMaxScrollRow(), row));
    }

    public int storageIndexForVisibleSlot(int visibleSlot) {
        return scrollRow * STORAGE_COLUMNS + visibleSlot;
    }

    public VacuumStorage getStorage() {
        return storage;
    }

    public void selectMode(VacuumFilterMode mode) {
        VacuumData.setMode(vacuum, mode);
    }

    public void selectCustomItem(String itemId) {
        VacuumData.setMode(vacuum, VacuumFilterMode.CUSTOM);
        VacuumData.setCustomItem(vacuum, itemId);
    }

    public void setPower(int power) {
        VacuumData.setPower(vacuum, power);
    }

    public boolean installChestUpgrade(Player player) {
        if (VacuumData.getUpgradeLevel(vacuum) >= VacuumData.MAX_CHESTS) {
            return false;
        }

        ItemStack chest = upgradeInput.getItem(0);

        if (!chest.is(Items.CHEST)) {
            return false;
        }

        chest.shrink(1);
        upgradeInput.setChanged();

        boolean upgraded = VacuumData.installChestUpgrade(vacuum);

        if (upgraded) {
            displayUpgradeLevel = VacuumData.getUpgradeLevel(vacuum);
            setScrollRow(scrollRow);
        }

        return upgraded;
    }

    @Override
    public boolean stillValid(Player player) {
        ItemStack current = hand == InteractionHand.MAIN_HAND
                ? player.getInventory().getItem(Math.max(0, Math.min(sourceSlot, 35)))
                : player.getOffhandItem();

        return current == vacuum && current.is(ModItems.VACUUM.get());
    }

    @Override
    public void removed(Player player) {
        super.removed(player);

        storage.save();

        if (!player.level.isClientSide) {
            ItemStack remainder = upgradeInput.removeItemNoUpdate(0);

            if (!remainder.isEmpty() && !player.getInventory().add(remainder)) {
                player.drop(remainder, false);
            }
        }
    }

    public void startTransferAllToPlayer() {
        transferIndex = 0;
        transferAllActive = true;
    }

    /**
     * Вызывается раз в серверный тик.
     * За один тик обрабатывается ровно одна ячейка пылесоса.
     */
    public boolean transferOneSlotToPlayer(Player player) {
        if (!transferAllActive) {
            return false;
        }

        int capacity = VacuumData.getCapacity(vacuum);

        if (transferIndex >= capacity) {
            transferAllActive = false;
            return false;
        }

        int storageIndex = transferIndex++;
        ItemStack stored = storage.getItem(storageIndex);
        boolean changed = false;

        if (!stored.isEmpty()) {
            ItemStack remainder = stored.copy();
            int playerStart = VISIBLE_SLOTS + 1;

            /*
             * Ванильная логика переноса: сначала группирует предметы
             * в существующие стаки, затем занимает свободные ячейки.
             */
            if (moveItemStackTo(remainder, playerStart, slots.size(), true)) {
                storage.setItem(
                        storageIndex,
                        remainder.isEmpty() ? ItemStack.EMPTY : remainder
                );

                changed = true;
            }
        }

        if (transferIndex >= capacity) {
            transferAllActive = false;
        }

        return changed;
    }

    @Override
    public ItemStack quickMoveStack(Player player, int index) {
        if (index < 0 || index >= slots.size()) {
            return ItemStack.EMPTY;
        }

        Slot slot = slots.get(index);

        if (!slot.hasItem()) {
            return ItemStack.EMPTY;
        }

        ItemStack clicked = slot.getItem();
        ItemStack result = clicked.copy();

        int upgradeSlot = VISIBLE_SLOTS;
        int playerStart = upgradeSlot + 1;

        if (index < VISIBLE_SLOTS || index == upgradeSlot) {
            if (!moveItemStackTo(clicked, playerStart, slots.size(), true)) {
                return ItemStack.EMPTY;
            }
        } else {
            if (!clicked.is(Items.CHEST) || slots.get(upgradeSlot).hasItem()) {
                return ItemStack.EMPTY;
            }

            if (!moveItemStackTo(clicked, upgradeSlot, upgradeSlot + 1, false)) {
                return ItemStack.EMPTY;
            }
        }

        if (clicked.isEmpty()) {
            slot.set(ItemStack.EMPTY);
        } else {
            slot.setChanged();
        }

        return result;
    }

    private static final class VisibleVacuumSlot extends Slot {
        private final VacuumMenu menu;
        private final int visibleIndex;

        private VisibleVacuumSlot(
                VacuumMenu menu,
                int visibleIndex,
                int x,
                int y
        ) {
            super(menu.storage, 0, x, y);
            this.menu = menu;
            this.visibleIndex = visibleIndex;
        }

        private int storageIndex() {
            return menu.storageIndexForVisibleSlot(visibleIndex);
        }

        @Override
        public ItemStack getItem() {
            int index = storageIndex();

            return menu.isDisplayUnlockedSlot(index)
                    ? menu.storage.getItem(index)
                    : ItemStack.EMPTY;
        }

        @Override
        public boolean hasItem() {
            return !getItem().isEmpty();
        }

        @Override
        public void set(ItemStack stack) {
            int index = storageIndex();

            if (menu.storage.isUnlockedSlot(index)) {
                menu.storage.setItem(index, stack);
            }
        }

        @Override
        public ItemStack remove(int amount) {
            int index = storageIndex();

            return menu.storage.isUnlockedSlot(index)
                    ? menu.storage.removeItem(index, amount)
                    : ItemStack.EMPTY;
        }

        @Override
        public void setChanged() {
            menu.storage.setChanged();
        }

        @Override
        public boolean mayPlace(ItemStack stack) {
            return false;
        }

        @Override
        public boolean mayPickup(Player player) {
            return menu.isDisplayUnlockedSlot(storageIndex());
        }
    }

    private static final class UpgradeSlot extends Slot {
        private UpgradeSlot(Container container, int index, int x, int y) {
            super(container, index, x, y);
        }

        @Override
        public boolean mayPlace(ItemStack stack) {
            return stack.is(Items.CHEST);
        }
    }
}