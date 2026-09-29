# №11 · JBL-колонка — выжимка из Java (для сайта)

- Предмет `zitraksmode:jbl_speaker`, стак 1. ПКМ открывает экран «JBL Колонка».
- NBT: Playing, Paused, CurrentTrackId/Title/Author, Volume (1.0 по умолчанию), PlaybackStartGameTime, PlaybackDurationMs, PlaybackPositionMs.
- Подсказка: «▶ Играет»/«⏸ На паузе» + «♫ трек» или «⏹ Остановлено» + «ПКМ → Открыть плеер»; «Громкость: N%».
- Ачивка `jbl_full_volume`: играет, без паузы, громкость ≥ 1.0 — 300 тиков подряд (inventoryTick); пауза или меньше громкость обнуляет.
- Экран: список 308 px, строки 288×36, сортировка лайки↓ → дата↓ → название; двойной клик ≤ 250 мс играет; ❤ ✎ ↗ ✖; ⟳; ⏮ ▶/⏸ ⏭; перемотка 330×6. Статусы «Импорт...», «Обновление...», «Играет: X», «Выбери трек». Перетащить .ogg/.mp3 в окно = загрузить.
- HUD 140×35 слева снизу: фон 0xAA000000, рамка 0xFF00FF00, ♫ мигает 00FF00/00FFAA раз в 500 мс, громкость справа, бегущая строка (60 кадров ожидание, 1 px раз в 20 кадров, зазор 30), полоска 8 px: >66% зелёная, >33% жёлтая, иначе красная.
- Сеть `zitraksmode:jbl_speaker_channel`: UploadTrackStart/Chunk/Finish, Request/SyncSpeakerLibrary, Select/Pause/Seek/Like/Delete; звук `sendToTrackingAndSelf`.
- Рецепт IRI/BSB/IEI (I железо, R редстоун, B бамбук, S нотный блок, E тег `zitraksmode:jbl_buttons`).
