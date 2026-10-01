package com.example.zitraksmode.client;

import com.example.zitraksmode.vacuum.VacuumData;
import com.example.zitraksmode.menu.VacuumMenu;
import com.example.zitraksmode.network.VacuumAction;
import com.example.zitraksmode.network.VacuumActionPacket;
import com.example.zitraksmode.network.VacuumNetwork;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiComponent;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.player.Inventory;
import net.minecraftforge.registries.ForgeRegistries;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Compact wide layout: no overlapping panels, dedicated scroll rail and a protected custom-search field. */
public final class VacuumScreen extends AbstractContainerScreen<VacuumMenu> {
    private static final int STORAGE_X = 8;
    private static final int STORAGE_Y = 18;
    private static final int STORAGE_W = 162;
    private static final int STORAGE_H = 54;
    private static final int SCROLL_X = 166;
    private static final int RIGHT_X = 210;
    private static final int RIGHT_W = 142;

    private EditBox search;
    private final List<ResourceLocation> suggestions = new ArrayList<>();
    private boolean draggingScroll;

    public VacuumScreen(VacuumMenu menu, Inventory inventory, Component title) {
        super(menu, inventory, title);
        this.imageWidth = 360;
        this.imageHeight = 210;
        this.inventoryLabelY = -1000;
    }

    @Override
    protected void init() {
        super.init();

        int x = leftPos;
        int y = topPos;

        addRenderableWidget(
                new VacuumButton(
                        x + RIGHT_X,
                        y + 12,
                        68,
                        17,
                        Component.literal("Руды"),
                        button -> setMode(VacuumAction.MODE_ORES)
                )
        );

        addRenderableWidget(
                new VacuumButton(
                        x + RIGHT_X + 72,
                        y + 12,
                        68,
                        17,
                        Component.literal("Блоки"),
                        button -> setMode(VacuumAction.MODE_BLOCKS)
                )
        );

        addRenderableWidget(
                new VacuumButton(
                        x + RIGHT_X,
                        y + 32,
                        140,
                        17,
                        Component.literal("Еда"),
                        button -> setMode(VacuumAction.MODE_FOOD)
                )
        );

        addRenderableWidget(
                new VacuumButton(
                        x + 182,
                        y + 45,
                        18,
                        18,
                        Component.literal("+"),
                        button -> VacuumNetwork.CHANNEL.sendToServer(
                                VacuumActionPacket.simple(
                                        VacuumAction.INSTALL_CHEST_UPGRADE
                                )
                        )
                )
        );

        search = new EditBox(
                font,
                x + RIGHT_X,
                y + 53,
                104,
                16,
                Component.literal("Поиск предмета")
        );

        search.setValue("");
        search.setResponder(value -> refreshSuggestions());
        addRenderableWidget(search);

        addRenderableWidget(
                new VacuumButton(
                        x + RIGHT_X + 108,
                        y + 53,
                        32,
                        16,
                        Component.literal("OK"),
                        button -> chooseCustom(search.getValue())
                )
        );

        refreshSuggestions();
    }

    private void setMode(VacuumAction action) {
        switch (action) {
            case MODE_ORES -> VacuumData.setMode(
                    menu.getVacuum(),
                    com.example.zitraksmode.vacuum.VacuumFilterMode.ORES
            );

            case MODE_BLOCKS -> VacuumData.setMode(
                    menu.getVacuum(),
                    com.example.zitraksmode.vacuum.VacuumFilterMode.BLOCKS
            );

            case MODE_FOOD -> VacuumData.setMode(
                    menu.getVacuum(),
                    com.example.zitraksmode.vacuum.VacuumFilterMode.FOOD
            );

            default -> {
                return;
            }
        }

        VacuumNetwork.CHANNEL.sendToServer(
                VacuumActionPacket.simple(action)
        );
    }

    private void chooseCustom(String id) {
        ResourceLocation key = ResourceLocation.tryParse(id);

        if (key == null || !ForgeRegistries.ITEMS.containsKey(key)) {
            return;
        }

        VacuumData.setCustomItem(menu.getVacuum(), key.toString());

        VacuumNetwork.CHANNEL.sendToServer(
                VacuumActionPacket.text(
                        VacuumAction.CUSTOM_ITEM,
                        key.toString()
                )
        );
    }

    private void refreshSuggestions() {
        suggestions.clear();

        String query = search == null ? "" : search.getValue().toLowerCase();

        if (query.isBlank()) {
            for (String id : VacuumData.getHistory(menu.getVacuum())) {
                ResourceLocation key = ResourceLocation.tryParse(id);

                if (key != null && suggestions.size() < 10) {
                    suggestions.add(key);
                }
            }

            return;
        }

        ForgeRegistries.ITEMS.getKeys().stream()
                .filter(key -> matchesQuery(key, query))
                .sorted(Comparator.comparing(ResourceLocation::toString))
                .limit(10)
                .forEach(suggestions::add);
    }

    private static boolean matchesQuery(ResourceLocation key, String query) {
        if (key.toString().toLowerCase().contains(query)) {
            return true;
        }

        var item = ForgeRegistries.ITEMS.getValue(key);

        return item != null
                && new net.minecraft.world.item.ItemStack(item)
                .getHoverName()
                .getString()
                .toLowerCase()
                .contains(query);
    }

    @Override
    protected void renderBg(
            PoseStack poseStack,
            float partialTick,
            int mouseX,
            int mouseY
    ) {
        fill(
                poseStack,
                leftPos - 2,
                topPos - 2,
                leftPos + imageWidth + 2,
                topPos + imageHeight + 2,
                0xFF0D1217
        );

        fill(
                poseStack,
                leftPos,
                topPos,
                leftPos + imageWidth,
                topPos + imageHeight,
                0xFF2B343C
        );

        fill(
                poseStack,
                leftPos + 5,
                topPos + 14,
                leftPos + 171,
                topPos + 75,
                0xFF0D151A
        );

        fill(
                poseStack,
                leftPos + 174,
                topPos + 14,
                leftPos + 205,
                topPos + 76,
                0xFF1A242A
        );

        // Рамка слота сундука: соответствует UpgradeSlot(182, 20).
        fill(
                poseStack,
                leftPos + 180,
                topPos + 18,
                leftPos + 202,
                topPos + 40,
                0xFF0A1014
        );

        fill(
                poseStack,
                leftPos + 181,
                topPos + 19,
                leftPos + 201,
                topPos + 39,
                0xFF3D6D78
        );

        fill(
                poseStack,
                leftPos + 183,
                topPos + 21,
                leftPos + 199,
                topPos + 37,
                0xFF10191E
        );

        fill(
                poseStack,
                leftPos + 5,
                topPos + 121,
                leftPos + 171,
                topPos + 204,
                0xFF1E272D
        );

        fill(
                poseStack,
                leftPos + 206,
                topPos + 7,
                leftPos + 355,
                topPos + 204,
                0xFF152027
        );

        fill(
                poseStack,
                leftPos + 208,
                topPos + 74,
                leftPos + 353,
                topPos + 184,
                0xFF0B1217
        );

        drawStorageSlotFrames(poseStack);
        drawCapacityIndicator(poseStack);

        drawSmall(
                poseStack,
                "Сила: " + VacuumData.getPower(menu.getVacuum()) + "/10",
                leftPos + 8,
                topPos + 4,
                0xFFE6FBFF
        );

        drawSmall(
                poseStack,
                "Колесо: листать | СКМ: всё",
                leftPos + 8,
                topPos + 78,
                0xFF9DB1BC
        );

        drawSmall(
                poseStack,
                "Сундук",
                leftPos + 176,
                topPos + 4,
                0xFFE6FBFF
        );

        drawSmall(
                poseStack,
                "Ур. " + menu.getDisplayUpgradeLevel() + "/15",
                leftPos + 176,
                topPos + 77,
                0xFFBFC9D8
        );

        drawSmall(
                poseStack,
                "Поиск / история",
                leftPos + RIGHT_X,
                topPos + 4,
                0xFFE6FBFF
        );

        drawScrollBar(poseStack);
    }

    @Override
    public void render(PoseStack poseStack, int mouseX, int mouseY, float partialTick) {
        renderBackground(poseStack);
        super.render(poseStack, mouseX, mouseY, partialTick);

        int suggestionY = topPos + 76;

        for (int i = 0; i < suggestions.size(); i++) {
            ResourceLocation key = suggestions.get(i);
            int y = suggestionY + i * 10;

            fill(
                    poseStack,
                    leftPos + RIGHT_X + 2,
                    y,
                    leftPos + RIGHT_X + RIGHT_W - 2,
                    y + 9,
                    0xD018252C
            );

            var item = ForgeRegistries.ITEMS.getValue(key);

            String name = item == null
                    ? key.toString()
                    : new net.minecraft.world.item.ItemStack(item)
                    .getHoverName()
                    .getString();

            drawSmall(
                    poseStack,
                    name,
                    leftPos + RIGHT_X + 4,
                    y + 1,
                    0xFF9DEBFF
            );
        }

        renderTooltip(poseStack, mouseX, mouseY);
    }

    private void drawSmall(PoseStack poseStack, String text, float x, float y, int color) {
        poseStack.pushPose();
        poseStack.translate(x, y, 0.0D);
        poseStack.scale(0.72F, 0.72F, 1.0F);
        font.draw(poseStack, text, 0.0F, 0.0F, color);
        poseStack.popPose();
    }

    private void drawStorageSlotFrames(PoseStack poseStack) {
        for (int row = 0; row < VacuumMenu.VISIBLE_ROWS; row++) {
            for (int column = 0; column < VacuumMenu.STORAGE_COLUMNS; column++) {
                int visibleIndex = column + row * VacuumMenu.STORAGE_COLUMNS;
                int storageIndex = menu.storageIndexForVisibleSlot(visibleIndex);
                boolean unlocked = menu.isDisplayUnlockedSlot(storageIndex);

                int x = leftPos + STORAGE_X + column * 18;
                int y = topPos + STORAGE_Y + row * 18;

                int border = unlocked ? 0xFF4D8A97 : 0xFF2D3539;
                int inside = unlocked ? 0xFF12272E : 0xFF0C1012;

                fill(poseStack, x - 1, y - 1, x + 17, y + 17, border);
                fill(poseStack, x, y, x + 16, y + 16, inside);

                if (!unlocked) {
                    fill(poseStack, x + 3, y + 7, x + 13, y + 9, 0xFF1A2225);
                }
            }
        }
    }

    private void drawCapacityIndicator(PoseStack poseStack) {
        int capacity = menu.getDisplayCapacity();

        int first = menu.storageIndexForVisibleSlot(0) + 1;
        int last = Math.min(
                capacity,
                menu.storageIndexForVisibleSlot(VacuumMenu.VISIBLE_SLOTS - 1) + 1
        );

        drawSmall(
                poseStack,
                "Ячейки: " + first + "-" + last + " / " + capacity,
                leftPos + 8,
                topPos + 95,
                0xFFBCEBF3
        );

        int x = leftPos + 8;
        int y = topPos + 106;
        int width = 162;

        int filled = Math.max(
                1,
                width * capacity / VacuumData.MAX_SLOTS
        );

        fill(poseStack, x - 1, y - 1, x + width + 1, y + 6, 0xFF0A1114);
        fill(poseStack, x, y, x + width, y + 5, 0xFF26383E);
        fill(poseStack, x, y, x + filled, y + 5, 0xFF52C9DD);

        for (int level = 1; level < VacuumData.MAX_CHESTS; level++) {
            int tickX = x + width * level / VacuumData.MAX_CHESTS;

            fill(
                    poseStack,
                    tickX,
                    y,
                    tickX + 1,
                    y + 5,
                    0xFF14242A
            );
        }
    }

    private void drawScrollBar(PoseStack poseStack) {
        int x = leftPos + SCROLL_X;
        int y = topPos + STORAGE_Y;
        int max = menu.getMaxScrollRow();

        fill(poseStack, x, y, x + 3, y + STORAGE_H, 0xFF101B20);

        if (max <= 0) {
            fill(poseStack, x, y, x + 3, y + STORAGE_H, 0xFF6BEAF5);
            return;
        }

        int totalRows = max + VacuumMenu.VISIBLE_ROWS;

        int thumbH = Math.max(
                8,
                STORAGE_H * VacuumMenu.VISIBLE_ROWS / totalRows
        );

        int thumbY = y + (STORAGE_H - thumbH) * menu.getScrollRow() / max;

        fill(
                poseStack,
                x,
                thumbY,
                x + 3,
                thumbY + thumbH,
                0xFF6BEAF5
        );
    }

    private void setScrollFromMouse(double mouseY) {
        int max = menu.getMaxScrollRow();

        if (max <= 0) {
            return;
        }

        int y = topPos + STORAGE_Y;
        int totalRows = max + VacuumMenu.VISIBLE_ROWS;

        int thumbH = Math.max(
                8,
                STORAGE_H * VacuumMenu.VISIBLE_ROWS / totalRows
        );

        double fraction = Math.max(
                0.0D,
                Math.min(
                        1.0D,
                        (mouseY - y - thumbH / 2.0D)
                                / (STORAGE_H - thumbH)
                )
        );

        menu.setScrollRow((int) Math.round(fraction * max));

        VacuumNetwork.CHANNEL.sendToServer(
                VacuumActionPacket.number(
                        VacuumAction.SET_SCROLL_ROW,
                        menu.getScrollRow()
                )
        );
    }

    private boolean isOverStoragePanel(double mouseX, double mouseY) {
        return mouseX >= leftPos + 5
                && mouseX <= leftPos + 171
                && mouseY >= topPos + 14
                && mouseY <= topPos + 75;
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double delta) {
        if (isOverStoragePanel(mouseX, mouseY)) {
            menu.setScrollRow(
                    menu.getScrollRow() + (delta < 0.0D ? 1 : -1)
            );

            VacuumNetwork.CHANNEL.sendToServer(
                    VacuumActionPacket.number(
                            VacuumAction.SET_SCROLL_ROW,
                            menu.getScrollRow()
                    )
            );

            return true;
        }

        int next = Math.max(
                1,
                Math.min(
                        10,
                        VacuumData.getPower(menu.getVacuum())
                                + (delta > 0.0D ? 1 : -1)
                )
        );

        VacuumData.setPower(menu.getVacuum(), next);

        VacuumNetwork.CHANNEL.sendToServer(
                VacuumActionPacket.number(VacuumAction.SET_POWER, next)
        );

        return true;
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button == GLFW.GLFW_MOUSE_BUTTON_MIDDLE
                && isOverStoragePanel(mouseX, mouseY)) {
            VacuumNetwork.CHANNEL.sendToServer(
                    VacuumActionPacket.simple(
                            VacuumAction.TRANSFER_ALL_TO_PLAYER
                    )
            );

            return true;
        }

        if (mouseX >= leftPos + SCROLL_X - 3
                && mouseX <= leftPos + SCROLL_X + 6
                && mouseY >= topPos + STORAGE_Y
                && mouseY <= topPos + STORAGE_Y + STORAGE_H) {
            draggingScroll = true;
            setScrollFromMouse(mouseY);
            return true;
        }

        if (button == GLFW.GLFW_MOUSE_BUTTON_RIGHT
                && (search == null || !search.isFocused())) {
            onClose();
            return true;
        }

        int suggestionY = topPos + 76;

        for (int i = 0; i < suggestions.size(); i++) {
            int y = suggestionY + i * 10;

            if (mouseX >= leftPos + RIGHT_X + 2
                    && mouseX <= leftPos + RIGHT_X + RIGHT_W - 2
                    && mouseY >= y
                    && mouseY <= y + 9) {
                search.setValue(suggestions.get(i).toString());
                chooseCustom(search.getValue());
                return true;
            }
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseDragged(
            double mouseX,
            double mouseY,
            int button,
            double dragX,
            double dragY
    ) {
        if (draggingScroll) {
            setScrollFromMouse(mouseY);
            return true;
        }

        return super.mouseDragged(mouseX, mouseY, button, dragX, dragY);
    }

    @Override
    public boolean mouseReleased(double mouseX, double mouseY, int button) {
        draggingScroll = false;
        return super.mouseReleased(mouseX, mouseY, button);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (search != null && search.isFocused()) {
            if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                onClose();
                return true;
            }

            search.keyPressed(keyCode, scanCode, modifiers);
            return true;
        }

        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    @Override
    public boolean charTyped(char codePoint, int modifiers) {
        if (search != null && search.isFocused()) {
            return search.charTyped(codePoint, modifiers);
        }

        return super.charTyped(codePoint, modifiers);
    }

    private static final class VacuumButton extends Button {
        private VacuumButton(
                int x,
                int y,
                int width,
                int height,
                Component message,
                Button.OnPress onPress
        ) {
            super(x, y, width, height, message, onPress);
        }

        @Override
        public void renderButton(
                PoseStack poseStack,
                int mouseX,
                int mouseY,
                float partialTick
        ) {
            boolean hovered = isHoveredOrFocused();

            int border = hovered ? 0xFF70E6F4 : 0xFF315F6B;
            int background = hovered ? 0xFF1E5965 : 0xFF12323B;
            int inner = hovered ? 0xFF286D78 : 0xFF183E47;

            int textColor = active
                    ? (hovered ? 0xFFFFFFFF : 0xFFD4F8FF)
                    : 0xFF65747A;

            GuiComponent.fill(
                    poseStack,
                    x,
                    y,
                    x + width,
                    y + height,
                    border
            );

            GuiComponent.fill(
                    poseStack,
                    x + 1,
                    y + 1,
                    x + width - 1,
                    y + height - 1,
                    background
            );

            GuiComponent.fill(
                    poseStack,
                    x + 2,
                    y + 2,
                    x + width - 2,
                    y + height / 2,
                    inner
            );

            net.minecraft.client.gui.Font buttonFont = Minecraft.getInstance().font;

            buttonFont.draw(
                    poseStack,
                    getMessage(),
                    x + width / 2.0F - buttonFont.width(getMessage()) / 2.0F,
                    y + (height - 8) / 2.0F,
                    textColor
            );
        }
    }
}