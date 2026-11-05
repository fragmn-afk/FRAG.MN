# FRAG.MN Discord Bot

Монгол хэлтэй FRAG.MN community нэмэлтүүд. Одоогийн TitanBot модуль, database, interaction loader болон command routing-ийг хэвээр ашиглана.

## Шинэ slash командууд
- `/fragmn info` — community танилцуулга, invite холбоос
- `/fragmn server` — серверийн мэдээлэл
- `/fragmn member [user]` — гишүүний мэдээлэл, role, нэгдсэн огноо
- `/frag-staff purge amount` — сүүлийн 1–100 мессежийг устгах
- `/frag-staff slowmode seconds` — 0–21600 секунд slowmode
- `/frag-staff lock`, `/frag-staff unlock` — сувгийн бичих эрхийг удирдах

Staff командууд Discord-ийн Manage Messages болон Manage Channels эрхээр хамгаалагдсан. Purge нь Discord-ийн 14 хоногийн bulk-delete хязгаарыг дагана.

## Нэмэлт environment тохиргоо
```env
FRAGMN_NAME=FRAG.MN
FRAGMN_TAGLINE=Монголын gaming & esports community
FRAGMN_INVITE_URL=https://discord.gg/fragmn
FRAGMN_WEBSITE_URL=
FRAGMN_COLOR=#E53935
FRAGMN_TIMEZONE=Asia/Ulaanbaatar
```

Токен, database нууц үг, webhook URL-ийг repository-д бүү commit хий.

## Ажиллуулах
1. Hosting environment-д DISCORD_TOKEN болон CLIENT_ID тохируул.
2. Bot role-ийн hierarchy болон channel permission-ийг шалга.
3. Bot-оо restart/deploy хий. Existing command loader шинэ FRAG.MN command файлуудыг автоматаар ачаална.
4. Discord дээр slash command бүртгэгдсэний дараа дээрх командуудыг турш.

## Existing feature-үүд
Ticket, moderation, logging, welcome, verification, leveling, giveaway, economy, music, server stats зэрэг TitanBot системийг солихгүй, дахин эхлүүлэхгүй.


## 3. Автомат moderation, warning, logging
- `/frag-automod status` — AutoMod төлөв харах.
- `/frag-automod enable` — Спам хамгаалалт асаах.
- `/frag-automod disable` — Спам хамгаалалт унтраах.
- Асаасан үед 8 секундэд 6 ба түүнээс олон мессеж, эсвэл ижил мессежийг 3 удаа давтахыг илрүүлнэ.
- Илэрсэн мессежийг устгах, WARN бүртгэх, боломжтой бөгөөд тохиргоо зөвшөөрсөн үед 2 минут timeout хийхийг оролдоно.
- Audit log-д үйлдлийг бүртгэхийн тулд Logging системийн audit channel тохируулсан байх шаардлагатай.
- AutoMod нь анхдагчаар унтраалттай; серверийн админ өөрөө асаана.

## 6. Giveaway, Leveling, Economy
Эдгээр системүүд repository-д аль хэдийн байна. Гол командууд:
- Giveaway: `/gcreate`, `/gend`, `/gdelete`, `/greroll`
- Leveling: `/rank`, `/leaderboard`, `/level`, `/levelset`
- Economy: `/balance`, `/daily`, `/work`, `/pay`, `/shop`, `/inventory`
Эдгээрийн өгөгдөл одоогийн database/storage service-ээр хадгалагдана.

## 7. Music
Music систем Riffy + Lavalink ашиглана:
- `/play query` — дуу хайж тоглуулах
- `/music pause|resume|skip|stop|shuffle|loop|volume|seek|remove|move|clear|leave|247`
- `/queue`, `/nowplaying`, `/join`
Production орчинд Lavalink node ажиллаж байх ёстой. `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD`, `LAVALINK_SECURE` эсвэл `LAVALINK_NODES` тохируулна. Нууц үг болон bot token-ийг git-д бүү commit хий.
