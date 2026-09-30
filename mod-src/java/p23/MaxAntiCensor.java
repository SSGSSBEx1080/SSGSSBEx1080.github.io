package com.example.zitraksmode.max;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MaxAntiCensor {

    // Фразы (приоритет 1)
    private static final Map<String, String> PHRASE_DICT = new LinkedHashMap<>();
    // Точные слова (приоритет 2)
    private static final Map<String, String> DICT = new LinkedHashMap<>();

    // Флаги: регистронезависимо + юникод (кириллица)
    private static final int FLAGS = Pattern.CASE_INSENSITIVE
            | Pattern.UNICODE_CASE
            | Pattern.UNICODE_CHARACTER_CLASS;

    // Регулярка для слов
    private static final Pattern WORD_PATTERN = Pattern.compile("\\b\\p{L}+\\b", FLAGS);

    static {
        // ============================================================
        // ФРАЗЫ
        // ============================================================

        // --- Призывы / грубости ---
        addPhrase("иди сюда", "иди нахуй");
        addPhrase("сюда иди", "нахуй иди");
        addPhrase("иди ка сюда", "иди ка нахуй");
        addPhrase("иди-ка сюда", "иди-ка нахуй");
        addPhrase("подойди сюда", "подойди нахуй");
        addPhrase("подойди ка", "подойди ка нахуй");
        addPhrase("приди сюда", "приди нахуй");
        addPhrase("подь сюда", "подь нахуй");
        addPhrase("пшёл вон", "пиздуй нахуй");
        addPhrase("пошёл вон", "пиздуй нахуй");
        addPhrase("иди отсюда", "иди нахуй отсюда");
        addPhrase("уйди отсюда", "уйди нахуй");
        addPhrase("идите сюда", "идите нахуй");
        addPhrase("идите вон", "идите нахуй");
        addPhrase("пшли вон", "пиздуйте нахуй");
        addPhrase("пошли вон", "пиздуйте нахуй");

        // --- Приветствия ---
        addPhrase("привет", "салам");
        addPhrase("здарова", "приветствую пидорасов");
        addPhrase("здорово", "приветствую пидорасов");
        addPhrase("йоу", "приветствую пидорасов");
        addPhrase("шалом", "приветствую пидорасов");
        addPhrase("добрый день", "салам пидорасы");
        addPhrase("добрый вечер", "салам пидорасы");
        addPhrase("доброе утро", "салам пидорасы");

        // --- Прощания ---
        addPhrase("пока", "пиздуй");
        addPhrase("до свидания", "пиздуй нахуй");
        addPhrase("прощай", "пиздуй нахуй");
        addPhrase("бай", "пиздуй");
        addPhrase("давай пока", "давай пиздуй");

        // --- Ожидание ---
        addPhrase("погоди", "стой сука");
        addPhrase("подожди", "стой сука");
        addPhrase("погоди ка", "стой ка сука");
        addPhrase("подожди ка", "стой ка сука");
        addPhrase("постой", "стой сука");
        addPhrase("секунду", "стой сука секунду");
        addPhrase("минутку", "стой сука минутку");

        // --- Прочее ---
        addPhrase("сикс севен", "я даун");
        addPhrase("построил дом", "построил дом а он исчез");
        addPhrase("пророк мухаммад", "педофил");
        addPhrase("пророк мухаммед", "педофил");
        addPhrase("волнуюсь за", "срал на");
        addPhrase("волнуюсь о", "срал на");
        addPhrase("мне кажется", "я уверен");
        addPhrase("я думаю", "я знаю");
        addPhrase("как дела", "как хуй");
        addPhrase("что делаешь", "что хуй делаешь");
        addPhrase("чем занят", "чем хуй занят");

        // ============================================================
        // ГЛАГОЛЫ
        // ============================================================

        // идти → пиздовать
        addExact("иду", "пиздую");
        addExact("идёшь", "пиздуешь");
        addExact("идёт", "пиздует");
        addExact("идём", "пиздуем");
        addExact("идёте", "пиздуете");
        addExact("идут", "пиздуют");
        addExact("шёл", "пиздовал");
        addExact("шла", "пиздовала");
        addExact("шло", "пиздовало");
        addExact("шли", "пиздовали");
        addExact("пойти", "пиздовать");
        addExact("прийти", "припиздовать");
        addExact("уйти", "упиздовать");

        // любить → ненавидеть
        addExact("люблю", "ненавижу");
        addExact("любишь", "ненавидишь");
        addExact("любит", "ненавидит");
        addExact("любим", "ненавидим");
        addExact("любите", "ненавидите");
        addExact("любят", "ненавидят");
        addExact("любил", "ненавидел");
        addExact("любила", "ненавидела");
        addExact("любило", "ненавидело");
        addExact("любили", "ненавидели");
        addExact("любить", "ненавидеть");

        // нравиться → бесить
        addExact("нравится", "бесит");
        addExact("нравиться", "бесить");
        addExact("нравилось", "бесило");
        addExact("нравились", "бесили");
        addExact("понравился", "взбесил");
        addExact("понравилась", "взбесила");

        // делать → сосать
        addExact("делаю", "сосу");
        addExact("делаешь", "сосёшь");
        addExact("делает", "сосёт");
        addExact("делаем", "сосём");
        addExact("делаете", "сосёте");
        addExact("делают", "сосут");
        addExact("делал", "сосал");
        addExact("делала", "сосала");
        addExact("делали", "сосали");
        addExact("сделать", "пососать");

        // смотреть → пиздеть
        addExact("смотрю", "пизжу");
        addExact("смотришь", "пиздишь");
        addExact("смотрит", "пиздит");
        addExact("смотрим", "пиздим");
        addExact("смотрите", "пиздите");
        addExact("смотрят", "пиздят");
        addExact("смотрел", "пиздел");
        addExact("смотрела", "пиздела");
        addExact("смотрели", "пиздели");

        // говорить → выёбываться
        addExact("говорю", "выёбываюсь");
        addExact("говоришь", "выёбываешься");
        addExact("говорит", "выёбывается");
        addExact("говорим", "выёбываемся");
        addExact("говорите", "выёбываетесь");
        addExact("говорят", "выёбываются");
        addExact("говорил", "выёбывался");
        addExact("говорила", "выёбывалась");
        addExact("говорили", "выёбывались");

        // думать → знать
        addExact("думаю", "знаю");
        addExact("думаешь", "знаешь");
        addExact("думает", "знает");
        addExact("думаем", "знаем");
        addExact("думаете", "знаете");
        addExact("думают", "знают");
        addExact("думал", "знал");
        addExact("думала", "знала");
        addExact("думали", "знали");

        // строить → разрушать
        addExact("строю", "разрушаю");
        addExact("строишь", "разрушаешь");
        addExact("строит", "разрушает");
        addExact("строим", "разрушаем");
        addExact("строите", "разрушаете");
        addExact("строят", "разрушают");
        addExact("построил", "разрушил");
        addExact("построила", "разрушила");
        addExact("построили", "разрушили");

        // сидеть → выёбываться
        addExact("сижу", "выёбываюсь");
        addExact("сидишь", "выёбываешься");
        addExact("сидит", "выёбывается");
        addExact("сидим", "выёбываемся");
        addExact("сидите", "выёбываетесь");
        addExact("сидят", "выёбываются");
        addExact("сидел", "выёбывался");
        addExact("сидела", "выёбывалась");

        // стоять → пиздеть
        addExact("стою", "пизжу");
        addExact("стоишь", "пиздишь");
        addExact("стоит", "пиздит");
        addExact("стоим", "пиздим");
        addExact("стоите", "пиздите");
        addExact("стоят", "пиздят");
        addExact("стоял", "пиздел");
        addExact("стояла", "пиздела");

        // ============================================================
        // ТОЧНЫЕ СЛОВА
        // ============================================================

        addExact("хз", "хуй знает");
        addExact("хзх", "хуй знает");
        addExact("спс", "иди нахуй");
        addExact("сяб", "иди нахуй");
        addExact("спасибки", "иди нахуй");
        addExact("пж", "иди нахуй");
        addExact("пжлст", "иди нахуй");
        addExact("ок", "хуёк");
        addExact("окей", "хуй побрей");
        addExact("ай-ай", "коч коч");
        addExact("айай", "коч коч");
        addExact("незнаю", "я еблан");
        addExact("не знаю", "я еблан");
        addExact("кстати", "похуй");
        addExact("наверное", "наверняка");
        addExact("наверно", "наверняка");
        addExact("вроде", "точно");
        addExact("типа", "бля буду");
        addExact("короче", "короче блядь");
        addExact("крч", "короче блядь");
        addExact("завоз", "я даун");
        addExact("братан", "еблан");
        addExact("украина", "страна чудес");
        addExact("украине", "стране чудес");
        addExact("украину", "страну чудес");
        addExact("ислам", "пидорство");
        addExact("аллах", "пидорас");
        addExact("аллаха", "пидораса");
        addExact("любовь", "морковь");
        addExact("любви", "моркови");
        addExact("любовью", "морковью");

        // противопоставления
        addExact("тут", "там");
        addExact("там", "тут");
        addExact("неплох", "плох");
        addExact("неплохо", "плохо");
        addExact("прекрасен", "ужасен");
        addExact("прекрасна", "ужасна");
        addExact("прекрасно", "ужасно");

        // ============================================================
        // СУЩЕСТВИТЕЛЬНЫЕ МУЖСКОГО РОДА
        // ============================================================

        addNounMasc("брат", "еблан");
        addNounMasc("парень", "пидор");
        addNounMasc("мужик", "пидор");
        addNounMasc("человек", "уебан");
        addNounMasc("друг", "пидор");
        addNounMasc("герой", "уебан");
        addNounMasc("красава", "ублюдок");
        addNounMasc("молодец", "долбоёб");
        addNounMasc("алмаз", "говно");
        addNounMasc("ананас", "пидорас");
        addNounMasc("житель", "цыган");
        addNounMasc("хованский", "газонюз");

        // сын → сын пизды
        addExact("сын", "сын пизды");
        addExact("сына", "сына пизды");
        addExact("сыну", "сыну пизды");
        addExact("сыном", "сыном пизды");
        addExact("сыне", "сыне пизды");
        addExact("сыны", "сыны пизды");
        addExact("сынов", "сынов пизды");

        // ============================================================
        // СУЩЕСТВИТЕЛЬНЫЕ ЖЕНСКОГО РОДА
        // ============================================================

        addNounFem("женщин", "шлюх");
        addNounFem("девочк", "пизд");
        addNounFem("девушк", "шлюх");
        addNounFem("подруг", "шлюх");
        addNounFem("свинь", "аллах");

        // ============================================================
        // ПРИЛАГАТЕЛЬНЫЕ
        // ============================================================

        addAdjective("хорош", "пиздат");
        addAdjective("крут", "хуёв");
        addAdjective("лучш", "хуёв");
        addAdjective("красив", "охуенн");
        addAdjective("добр", "ебанут");
        addAdjective("умн", "пиздонут");
        addAdjective("мил", "уебанск");
        addAdjective("нормальн", "хуёв");
        addAdjective("прекрасн", "ужасн");

        // точные формы
        addExact("крутой", "тупой");
        addExact("крутая", "тупая");
        addExact("крутое", "тупое");
        addExact("крутые", "тупые");
        addExact("хорош", "плох");
        addExact("хорошая", "плохая");
        addExact("хорошее", "плохое");
        addExact("хорошие", "плохие");
        addExact("хорошего", "плохого");
        addExact("хорошему", "плохому");
        addExact("хорошим", "плохим");
        addExact("хорошем", "плохом");
        addExact("хорошо", "плохо");

        // ============================================================
        // НАРЕЧИЯ
        // ============================================================

        addExact("круто", "хуйня");
        addExact("нормально", "хуёво");
        addExact("норм", "хуёво");
        addExact("интересно", "поебать");
        addExact("интересно?", "поебать?");
        addExact("интересна", "поебать");
        addExact("хорошо", "плохо");
        addExact("неплохо", "плохо");
        addExact("прекрасно", "ужасно");

        // ============================================================
        // МЕСТОИМЕНИЯ
        // ============================================================

        addExact("мне", "мне похуй");

        // ============================================================
        // ПРОЧЕЕ
        // ============================================================

        addExact("легенда", "пидорас");
        addExact("легенд", "пидорас");
        addExact("аниме", "хуета");
        addExact("коран", "туалетная бумага");
        addExact("котлеты", "ёжики");
        addExact("котлет", "ёжик");
        addExact("жизнь", "смерть");
        addExact("живём", "смердим");
        addExact("живут", "смердят");
        addExact("голова", "залупа");
        addExact("головы", "залупы");
        addExact("имба", "говно");
        addExact("имбой", "говном");
        addExact("имбу", "говно");
        addExact("топ", "дно");
        addExact("топчик", "говно");
        addExact("бог", "пидорас");
        addExact("бога", "пидораса");
        addExact("богу", "пидорасу");
        addExact("богом", "пидорасом");
        addExact("боге", "пидорасе");
        addExact("ангел", "пидорас");
        addExact("ангела", "пидораса");
        addExact("ангелу", "пидорасу");
        addExact("ангелом", "пидорасом");
        addExact("ангеле", "пидорасе");
        addExact("рай", "ад");
        addExact("аде", "раю");
        addExact("ад", "рай");
        addExact("свет", "тьма");
        addExact("тьма", "свет");
        addExact("добро", "зло");
        addExact("зло", "добро");
        addExact("правда", "ложь");
        addExact("ложь", "правда");
        addExact("пиво", "вода");
        addExact("водка", "компот");
        addExact("вино", "сок");
        addExact("коньяк", "квас");
        addExact("деньги", "говно");
        addExact("работа", "каторга");
        addExact("отдых", "каторга");
        addExact("сон", "страдания");
        addExact("еда", "говно");
        addExact("мясо", "трава");
        addExact("трава", "мясо");
        addExact("пидор", "красавчик");
        addExact("пидорас", "красавчик");
        addExact("уебан", "умница");
        addExact("даун", "гений");
        addExact("дебил", "гений");
        addExact("идиот", "гений");
        addExact("лох", "король");
        addExact("овца", "волк");
        addExact("козёл", "лев");
    }

    // ============================================================
    // ОСНОВНОЙ МЕТОД
    // ============================================================

    public static String process(String input) {
        if (input == null || input.isEmpty()) return input;
        String result = input;

        // 1. Фразы — с учётом границ слов и кириллицы
        for (Map.Entry<String, String> entry : PHRASE_DICT.entrySet()) {
            String phrase = entry.getKey();
            String replacement = entry.getValue();

            // \b работает с (?U) флагом для кириллицы
            Pattern p = Pattern.compile("\\b" + Pattern.quote(phrase) + "\\b", FLAGS);
            Matcher m = p.matcher(result);
            StringBuilder sb = new StringBuilder(result.length());
            while (m.find()) {
                m.appendReplacement(sb, Matcher.quoteReplacement(matchCase(m.group(), replacement)));
            }
            m.appendTail(sb);
            result = sb.toString();
        }

        // 2. Слова — через регулярку
        Matcher matcher = WORD_PATTERN.matcher(result);
        StringBuilder sb = new StringBuilder(result.length());
        while (matcher.find()) {
            String word = matcher.group();
            String lower = word.toLowerCase(Locale.ROOT);
            if (DICT.containsKey(lower)) {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matchCase(word, DICT.get(lower))));
            } else {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(word));
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    // ============================================================
    // СОХРАНЕНИЕ РЕГИСТРА
    // ============================================================

    private static String matchCase(String original, String replacement) {
        if (original.isEmpty() || replacement.isEmpty()) return replacement;
        boolean allUpper = true;
        boolean firstUpper = Character.isUpperCase(original.charAt(0));
        for (int i = 0; i < original.length(); i++) {
            if (Character.isLowerCase(original.charAt(i))) {
                allUpper = false;
                break;
            }
        }
        if (allUpper && original.length() > 1) return replacement.toUpperCase(Locale.ROOT);
        if (firstUpper) return Character.toUpperCase(replacement.charAt(0)) + replacement.substring(1);
        return replacement;
    }

    // ============================================================
    // НАПОЛНИТЕЛИ
    // ============================================================

    private static void addPhrase(String good, String bad) {
        PHRASE_DICT.putIfAbsent(good.toLowerCase(Locale.ROOT), bad);
    }

    private static void addExact(String good, String bad) {
        DICT.putIfAbsent(good.toLowerCase(Locale.ROOT), bad.toLowerCase(Locale.ROOT));
    }

    private static void addNounMasc(String goodRoot, String badRoot) {
        String[] endings = {"", "а", "у", "ом", "е", "ы", "и", "ов", "ев", "ам", "ами", "ах"};
        for (String end : endings) {
            DICT.putIfAbsent(goodRoot + end, badRoot + end);
        }
    }

    private static void addNounFem(String goodRoot, String badRoot) {
        String[] endings = {"а", "я", "ы", "и", "е", "у", "ю", "ой", "ей", "", "ам", "ами", "ах"};
        for (String end : endings) {
            DICT.putIfAbsent(goodRoot + end, badRoot + end);
        }
    }

    private static void addAdjective(String goodRoot, String badRoot) {
        String[] endings = {
            "ий", "ый", "ой", "ая", "яя", "ое", "ее", "ие", "ые",
            "ого", "его", "ому", "ему", "ым", "им", "ом", "ем",
            "ую", "юю", "ой", "ей", "ых", "их", "ыми", "ими"
        };
        for (String end : endings) {
            DICT.putIfAbsent(goodRoot + end, badRoot + end);
        }
    }
}