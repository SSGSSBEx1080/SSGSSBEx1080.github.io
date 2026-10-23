package com.example.zitraksmode;

import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.*;
import net.minecraft.world.item.enchantment.EnchantmentInstance;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import com.example.zitraksmode.items.MaxMessengerItem;
import com.example.zitraksmode.items.MedusaItem;
import net.minecraftforge.common.ForgeSpawnEggItem;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.common.ForgeSpawnEggItem;
import com.example.zitraksmode.items.MahoragaSummonItem;
import com.example.zitraksmode.items.ScooterItem;
import com.example.zitraksmode.items.VacuumItem;

import net.minecraft.world.item.enchantment.EnchantmentInstance;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import java.util.HashMap;
import java.util.Map;

// Импорты для оружия и брони
import com.example.zitraksmode.items.BulletItem;
import com.example.zitraksmode.items.SniperItem;
import com.example.zitraksmode.items.SpanishBootsItem;
import com.example.zitraksmode.items.SpermBucketItem;
import com.example.zitraksmode.items.SteelBallItem;
import com.example.zitraksmode.items.TntRepairKitItem;
import com.example.zitraksmode.items.ChigurShotgunItem;
import com.example.zitraksmode.items.ChigurCoinItem;
import com.example.zitraksmode.items.MinerHelmetItem;
import com.example.zitraksmode.items.Printer3DBlockItem;
import com.example.zitraksmode.weapons.ModToolTiers;
import com.example.zitraksmode.items.SuperTNTMinecartItem;

// Импорты для НОВОЙ системы лабубу
import com.example.zitraksmode.items.LabubuType;
import com.example.zitraksmode.items.LogiaCloakItem;
import com.example.zitraksmode.items.LogiaCloakType;
import com.example.zitraksmode.items.LabubuFigurineItem;
// ===== MADE IN HEAVEN =====
import com.example.zitraksmode.items.MadeInHeavenItem;

import com.example.zitraksmode.items.CreeperEggsItem;
import com.example.zitraksmode.items.DeathNoteItem;
import com.example.zitraksmode.items.DeathNoteRequiemItem;
import com.example.zitraksmode.items.DildoBlockItem;
import com.example.zitraksmode.items.CookedCreeperEggsItem;
import com.example.zitraksmode.items.ChargedCreeperEggsItem;

import com.example.zitraksmode.items.JBLSpeakerItem;
import com.example.zitraksmode.items.KoranItem;
import com.example.zitraksmode.items.katana.KatanaItem;
import com.example.zitraksmode.blocks.Printer3DBlock;
import com.example.zitraksmode.items.AqualungItem;
import com.example.zitraksmode.items.GostDoctorskayaSausageItem;
import com.example.zitraksmode.items.ImmunosuppressantItem;
import com.example.zitraksmode.items.BorschtItem;
import com.example.zitraksmode.items.NinaKnifeItem;
import com.example.zitraksmode.items.RadishItem;
import com.example.zitraksmode.items.SaltItem;
import com.example.zitraksmode.items.SandevistanItem;

public class ModItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, ZitraksMode.MODID);

    // Список для числовых блоков (оставляем как было)
    public static final List<RegistryObject<Item>> NUMBER_BLOCK_ITEMS = new ArrayList<>();

    // === ЧИСЛОВЫЕ БЛОКИ ===
    // Исправлены ссылки на ModBlocks (ONE вместо ONE_BLOCK), согласно твоему ModBlocks.java
    public static final RegistryObject<Item> ONE_BLOCK_ITEM = registerBlockItem("one", ModBlocks.ONE);
    public static final RegistryObject<Item> TWO_BLOCK_ITEM = registerBlockItem("two", ModBlocks.TWO);
    public static final RegistryObject<Item> THREE_BLOCK_ITEM = registerBlockItem("three", ModBlocks.THREE);
    public static final RegistryObject<Item> FOUR_BLOCK_ITEM = registerBlockItem("four", ModBlocks.FOUR);
    public static final RegistryObject<Item> FIVE_BLOCK_ITEM = registerBlockItem("five", ModBlocks.FIVE);
    public static final RegistryObject<Item> SIX_BLOCK_ITEM = registerBlockItem("six", ModBlocks.SIX);
    public static final RegistryObject<Item> SEVEN_BLOCK_ITEM = registerBlockItem("seven", ModBlocks.SEVEN);
    public static final RegistryObject<Item> EIGHT_BLOCK_ITEM = registerBlockItem("eight", ModBlocks.EIGHT);
    public static final RegistryObject<Item> NINE_BLOCK_ITEM = registerBlockItem("nine", ModBlocks.NINE);
    public static final RegistryObject<Item> ZERO_BLOCK_ITEM = registerBlockItem("zero", ModBlocks.ZERO);

    // === БРОНЯ (БЕЗ ИЗМЕНЕНИЙ) ===


    public static final RegistryObject<Item> MINER_HELMET = ITEMS.register("miner_helmet",
        () -> new MinerHelmetItem(
            ModArmorMaterials.MINER,
            new Item.Properties()
                .tab(ModCreativeTabs.ZITRAKS_TAB)
                .durability(900) // 15 минут при расходе 1 прочности в секунду
        )
    );

    public static final RegistryObject<Item> ZITRAKS_CHESTPLATE = ITEMS.register("tnt_chestplate",
        () -> new ArmorItem(ModArmorMaterials.ZITRAKS, EquipmentSlot.CHEST,
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> ZITRAKS_LEGGINGS = ITEMS.register("tnt_leggings",
        () -> new ArmorItem(ModArmorMaterials.ZITRAKS, EquipmentSlot.LEGS,
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> ZITRAKS_BOOTS = ITEMS.register("tnt_boots",
        () -> new ArmorItem(ModArmorMaterials.ZITRAKS, EquipmentSlot.FEET,
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> TNT_REPAIR_KIT = ITEMS.register("tnt_repair_kit",
    () -> new TntRepairKitItem(new Item.Properties()
        .tab(ModCreativeTabs.ZITRAKS_TAB)
        .stacksTo(16)
    ));



    // === СНАЙПЕРСКИЕ ВИНТОВКИ И ПУЛИ (БЕЗ ИЗМЕНЕНИЙ) ===
    public static final RegistryObject<Item> BULLET = ITEMS.register("bullet",
        () -> new BulletItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> IRON_SNIPER = ITEMS.register("iron_sniper",
        () -> new SniperItem(ModToolTiers.SNIPER_IRON, new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).durability(500)));

    public static final RegistryObject<Item> GOLDEN_SNIPER = ITEMS.register("golden_sniper",
        () -> new SniperItem(ModToolTiers.SNIPER_GOLD, new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).durability(300)));

    public static final RegistryObject<Item> DIAMOND_SNIPER = ITEMS.register("diamond_sniper",
        () -> new SniperItem(ModToolTiers.SNIPER_DIAMOND, new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).durability(1800)));

    public static final RegistryObject<Item> NETHERITE_SNIPER = ITEMS.register("netherite_sniper",
        () -> new SniperItem(ModToolTiers.SNIPER_NETHERITE, new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).durability(2200).fireResistant()));

    public static final RegistryObject<Item> ZITRAKS_HELMET = ITEMS.register("tnt_helmet",
        () -> new ArmorItem(ModArmorMaterials.ZITRAKS, EquipmentSlot.HEAD, new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // === ЯЙЦО СПАВНА ЖИТЕЛЯ-АДУНА (БЕЗ ИЗМЕНЕНИЙ) ===
    public static final RegistryObject<Item> ADUN_VILLAGER_SPAWN_EGG = ITEMS.register("adun_villager_spawn_egg",
        () -> new ForgeSpawnEggItem(ModEntities.ADUN_VILLAGER,
            0x8B4513, // Основной цвет
            0xFFD700, // Цвет пятен
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // === ЛАБУБУ-СИСТЕМА (БЕЗ ИЗМЕНЕНИЙ) ===
    public static final RegistryObject<Item> LABUBU_BOX_ITEM = ITEMS.register("labubu_box",
        () -> new BlockItem(ModBlocks.LABUBU_BOX.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final Map<LabubuType, RegistryObject<Item>> LABUBU_FIGURINES = new HashMap<>();

    static {
        for (LabubuType type : LabubuType.values()) {
            RegistryObject<Item> figurine = ITEMS.register("labubu_" + type.name,
                    () -> new LabubuFigurineItem(
                            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(32),
                            type
                    ));
            LABUBU_FIGURINES.put(type, figurine);
        }
    }

    // === ЭНДЕР-ПРЕДМЕТЫ (Пункт №7) ===

    // 1. Усиленное Эндер-стекло
    public static final RegistryObject<Item> REINFORCED_ENDER_GLASS_ITEM = ITEMS.register("reinforced_ender_glass",
        () -> new BlockItem(ModBlocks.REINFORCED_ENDER_GLASS.get(),
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 2. Эндер-печь
    public static final RegistryObject<Item> ENDER_FURNACE_ITEM = ITEMS.register("ender_furnace",
        () -> new BlockItem(ModBlocks.ENDER_FURNACE.get(),
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 3. ЭНДЕР-СЕЙФ (Вместо двойного сундука)
    public static final RegistryObject<Item> ENDER_SAFE_ITEM = ITEMS.register("ender_safe",
            () -> new BlockItem(ModBlocks.ENDER_SAFE.get(),
                new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 4. Эндер-дверь (Двери требуют DoubleHighBlockItem для корректной установки)
    public static final RegistryObject<Item> ENDER_DOOR_ITEM = ITEMS.register("ender_door",
        () -> new DoubleHighBlockItem(ModBlocks.ENDER_DOOR.get(),
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 5. Эндер-люк
    public static final RegistryObject<Item> ENDER_TRAPDOOR_ITEM = ITEMS.register("ender_trapdoor",
        () -> new BlockItem(ModBlocks.ENDER_TRAPDOOR.get(),
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 6. Эндер-кнопка
    public static final RegistryObject<Item> ENDER_BUTTON_ITEM = ITEMS.register("ender_button",
        () -> new BlockItem(ModBlocks.ENDER_BUTTON.get(),
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 7. Эндер-плита
    public static final RegistryObject<Item> ENDER_PRESSURE_PLATE_ITEM = ITEMS.register("ender_pressure_plate",
        () -> new BlockItem(ModBlocks.ENDER_PRESSURE_PLATE.get(),
            new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // ===== MADE IN HEAVEN (Пункт №8) - ИДЁТ ПОСЛЕ ВСЕХ ЭНДЕР-ПРЕДМЕТОВ =====
    public static final RegistryObject<Item> MADE_IN_HEAVEN = ITEMS.register("made_in_heaven",
        () -> new MadeInHeavenItem(new Item.Properties()
            .tab(ModCreativeTabs.ZITRAKS_TAB)
            .stacksTo(1)
            .rarity(Rarity.EPIC)));

    // ===== DILDO BLOCK ITEMS (Пункт №9) =====
    public static final RegistryObject<Item> MUD_DILDO = ITEMS.register("mud_dildo",
        () -> new DildoBlockItem(ModBlocks.MUD_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> STONE_DILDO = ITEMS.register("stone_dildo",
        () -> new DildoBlockItem(ModBlocks.STONE_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> IRON_DILDO = ITEMS.register("iron_dildo",
        () -> new DildoBlockItem(ModBlocks.IRON_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> GOLD_DILDO = ITEMS.register("gold_dildo",
        () -> new DildoBlockItem(ModBlocks.GOLD_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> DIAMOND_DILDO = ITEMS.register("diamond_dildo",
        () -> new DildoBlockItem(ModBlocks.DIAMOND_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> EMERALD_DILDO = ITEMS.register("emerald_dildo",
        () -> new DildoBlockItem(ModBlocks.EMERALD_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> OBSIDIAN_DILDO = ITEMS.register("obsidian_dildo",
        () -> new DildoBlockItem(ModBlocks.OBSIDIAN_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> NETHERITE_DILDO = ITEMS.register("netherite_dildo",
        () -> new DildoBlockItem(ModBlocks.NETHERITE_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> TNT_DILDO = ITEMS.register("tnt_dildo",
        () -> new DildoBlockItem(ModBlocks.TNT_DILDO.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));
    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    // ===== CREEPER CASTRATION ITEMS =====

    // 1. Сырые яйца крипера
    public static final RegistryObject<Item> CREEPER_EGGS = ITEMS.register("creeper_eggs",
        () -> new CreeperEggsItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 2. Жареные яйца крипера
    public static final RegistryObject<Item> COOKED_CREEPER_EGGS = ITEMS.register("cooked_creeper_eggs",
        () -> new CookedCreeperEggsItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 3. Заряженные яйца крипера (светятся)
    public static final RegistryObject<Item> CHARGED_CREEPER_EGGS = ITEMS.register("charged_creeper_eggs",
        () -> new ChargedCreeperEggsItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // 4. Статуя крипера (блок-предмет)
    public static final RegistryObject<Item> CREEPER_STATUE = ITEMS.register("creeper_statue",
        () -> new BlockItem(ModBlocks.CREEPER_STATUE.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));


    // 5. Супер TNT (блок-предмет)
    public static final RegistryObject<Item> SUPER_TNT = ITEMS.register("super_tnt",
        () -> new BlockItem(ModBlocks.SUPER_TNT.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> SUPER_TNT_MINECART = ITEMS.register("super_tnt_minecart",
        () -> new SuperTNTMinecartItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // ===== JBL SPEAKER =====
    public static final RegistryObject<Item> JBL_SPEAKER = ITEMS.register("jbl_speaker",
        () -> new JBLSpeakerItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> AQUALUNG = ITEMS.register("aqualung",
        () -> new AqualungItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> MAX_MESSENGER = ITEMS.register("max_messenger",
        () -> new MaxMessengerItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1)));

    public static final RegistryObject<Item> KATANA = ITEMS.register("katana",
    () -> new KatanaItem(
        Tiers.IRON,
        5,
        -2.0f,
        new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).durability(500)
    )
);
        // ===== 3D ПРИНТЕР =====
    public static final RegistryObject<Item> PRINTER_3D_ITEM = ITEMS.register("printer_3d",
    () -> new Printer3DBlockItem((Printer3DBlock) ModBlocks.PRINTER_3D.get(),
        new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> HENTAI_BLOCK = ITEMS.register("hentai_block",
    () -> new BlockItem(ModBlocks.HENTAI_BLOCK.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // Метод для регистрации блоков-предметов (ИСПОЛЬЗУЕТСЯ ТОЛЬКО ДЛЯ ЧИСЛОВЫХ БЛОКОВ)
    private static RegistryObject<Item> registerBlockItem(String name, Supplier<Block> block) {
        RegistryObject<Item> item = ITEMS.register(name,
            () -> new BlockItem(block.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));
        NUMBER_BLOCK_ITEMS.add(item);
        return item;
    }

        // Компоненты
    public static final RegistryObject<Item> VETKHIY_MINET = ITEMS.register("vetkhiy_minet",
        () -> new Item(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> NOVIY_OMLET = ITEMS.register("noviy_omlet",
        () -> new Item(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // Коран (книга с пером)
    public static final RegistryObject<Item> KORAN = ITEMS.register("koran",
        () -> new KoranItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1)));

    public static final RegistryObject<Item> DEATH_NOTE = ITEMS.register("death_note",
        () -> new DeathNoteItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1).defaultDurability(10)));
    public static final RegistryObject<Item> DEATH_NOTE_REQUIEM = ITEMS.register("death_note_requiem",
        () -> new DeathNoteRequiemItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1).defaultDurability(25)));

    public static final RegistryObject<Item> STEEL_BALL = ITEMS.register("steel_ball",
    () -> new SteelBallItem(new Item.Properties()
        .tab(CreativeModeTab.TAB_COMBAT)
        .stacksTo(1) // Только 1 в слоте!
    ));
    public static final RegistryObject<Item> GAZAN_SPAWN_EGG = ITEMS.register("gazan_spawn_egg",
    () -> new ForgeSpawnEggItem(ModEntities.GAZAN, 0xFFD700, 0x8B4513,
        new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    // Предмет призыва
    public static final RegistryObject<Item> MAHORAGA_SCROLL = ITEMS.register("mahoraga_scroll",
        () -> new MahoragaSummonItem(new Item.Properties()
            .tab(ModCreativeTabs.ZITRAKS_TAB)
            .stacksTo(1)
            .rarity(Rarity.EPIC)));

    public static final RegistryObject<Item> SPERM_BUCKET =
    ITEMS.register("sperm_bucket", SpermBucketItem::new);

    public static final RegistryObject<Item> COPPER_WOOL = ITEMS.register("copper_wool",
        () -> new BlockItem(ModBlocks.COPPER_WOOL.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> SPANISH_BOOTS = ITEMS.register("spanish_boots",
        () -> new SpanishBootsItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1)));

    public static final RegistryObject<Item> CHARGING_PORT = ITEMS.register("charging_port",
    () -> new BlockItem(ModBlocks.CHARGING_PORT.get(), new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> SCOOTER = ITEMS.register("scooter",
        () -> new ScooterItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1).rarity(Rarity.RARE)));

        // === ONE PIECE CLOAKS ===
    public static final RegistryObject<Item> CLOAK_CROCODILE = ITEMS.register("cloak_crocodile",
            () -> new LogiaCloakItem(LogiaCloakType.CROCODILE,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> CLOAK_AKAINU = ITEMS.register("cloak_akainu",
            () -> new LogiaCloakItem(LogiaCloakType.AKAINU,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> CLOAK_AOKIJI = ITEMS.register("cloak_aokiji",
            () -> new LogiaCloakItem(LogiaCloakType.AOKIJI,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> CLOAK_KIZARU = ITEMS.register("cloak_kizaru",
            () -> new LogiaCloakItem(LogiaCloakType.KIZARU,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> CLOAK_SENGOKU = ITEMS.register("cloak_sengoku",
            () -> new LogiaCloakItem(LogiaCloakType.SENGOKU,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));

    public static final RegistryObject<Item> CLOAK_WHITEBEARD = ITEMS.register("cloak_whitebeard",
            () -> new LogiaCloakItem(LogiaCloakType.WHITEBEARD,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)));


    public static final RegistryObject<Item> VACUUM = ITEMS.register("vacuum",
        () -> new VacuumItem(
                new Item.Properties()
                        .tab(ModCreativeTabs.ZITRAKS_TAB)
                        .stacksTo(1)
                        .durability(1200)
                        .rarity(Rarity.RARE)
        ));

    public static final RegistryObject<Item> ANTON_CHIGUR_SPAWN_EGG = ITEMS.register(
            "anton_chigur_spawn_egg",
            () -> new ForgeSpawnEggItem(
                    ModEntities.ANTON_CHIGUR,
                    0x18212A,
                    0x9D7255,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)
                )
        );


    public static final RegistryObject<Item> CHIGUR_SHOTGUN = ITEMS.register(
            "chigur_shotgun",
            () -> new ChigurShotgunItem(
                    new Item.Properties()
                            .tab(ModCreativeTabs.ZITRAKS_TAB)
            )
    );

    public static final RegistryObject<Item> CHIGUR_COIN = ITEMS.register(
            "chigur_coin",
            () -> new ChigurCoinItem(
                    new Item.Properties()
                            .tab(ModCreativeTabs.ZITRAKS_TAB)
            )
    );

    // ===== ГОСТЕВОЙ ПУНКТ ОТ БАБУШКИ ВАЛИ =====
    // Не имеет рецепта: получить можно только через торговлю с жителем.
    public static final RegistryObject<Item> GOST_DOCTORSKAYA_SAUSAGE = ITEMS.register(
            "gost_doctorskaya_sausage",
            () -> new GostDoctorskayaSausageItem(
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)
            )
    );

    // ===== ГОСТЕВОЙ ПУНКТ ОТ ПРАБАБУШКИ НИНЫ =====
    public static final RegistryObject<Item> SALT = ITEMS.register(
            "salt",
            () -> new SaltItem(ModBlocks.SALT_TRAIL.get(),
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB))
    );

    public static final RegistryObject<Item> SALT_ORE_ITEM = ITEMS.register(
            "salt_ore",
            () -> new BlockItem(ModBlocks.SALT_ORE.get(),
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB))
    );

    public static final RegistryObject<Item> RADISH = ITEMS.register(
            "radish",
            () -> new RadishItem(ModBlocks.RADISH_CROP.get(),
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)
                            .food(new FoodProperties.Builder().nutrition(3).saturationMod(0.4F).build()))
    );

    public static final RegistryObject<Item> FRIED_RADISH = ITEMS.register(
            "fried_radish",
            () -> new Item(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)
                    .food(new FoodProperties.Builder().nutrition(6).saturationMod(0.7F).build()))
    );

    public static final RegistryObject<Item> BORSCHT = ITEMS.register(
            "borscht",
            () -> new BorschtItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB)
                    .stacksTo(1)
                    .food(new FoodProperties.Builder().nutrition(10).saturationMod(0.8F).build()))
    );

    public static final RegistryObject<Item> NINA_KNIFE = ITEMS.register(
            "nina_knife",
            () -> new NinaKnifeItem(Tiers.IRON, 0, -0.8F,
                    new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).durability(500))
    );

    public static final RegistryObject<Item> MEDUSA = ITEMS.register(
        "medusa",
        () -> new MedusaItem(
                new Item.Properties()
                        .tab(ModCreativeTabs.ZITRAKS_TAB)
                        .stacksTo(1)
                        .durability(1_024)
                        .rarity(Rarity.EPIC)
        )
    );
    public static final RegistryObject<Item> IMMUNOSUPPRESSANT = ITEMS.register("immunosuppressant",
        () -> new ImmunosuppressantItem(new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(16)));

    public static final RegistryObject<Item> SANDEVISTAN = ITEMS.register("sandevistan",
        () -> new SandevistanItem(ArmorMaterials.NETHERITE, EquipmentSlot.CHEST, new Item.Properties().tab(ModCreativeTabs.ZITRAKS_TAB).stacksTo(1).defaultDurability(100)));

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
