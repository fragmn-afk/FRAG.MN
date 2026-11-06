# FRAG.MN Discord Bot

Монгол хэлтэй FRAG.MN community нэмэлтүүд. Одоогийн TitanBot модуль, database, interaction loader болон command routing-ийг хэвээр ашиглана.

## Шинэ slash командууд
- `/fragmn info` — community танилцуулга, invite холбоос
- `/fragmn server` — серверийн мэдээлэл
- `/fragmn member [user]` — гишүүний мэдээлэл, role, нэгдсэн огноо
- `/fragmn staff purge amount`, `/fragmn staff slowmode seconds`, `/fragmn staff lock`, `/fragmn staff unlock` — staff сувгийн хэрэгслүүд
- `/fragmn staff role-add`, `/fragmn staff role-remove`, `/fragmn staff record`, `/fragmn staff records` — staff role болон бүртгэл
- `/fragmn vip plans`, `/fragmn vip buy`, `/fragmn vip status` — QPay VIP багц, худалдан авалт, төлөв

Staff командууд Discord-ийн Manage Messages, Manage Channels болон Manage Roles эрхээр дэд командаас хамааран хамгаалагдсан. Purge нь Discord-ийн 14 хоногийн bulk-delete хязгаарыг дагана.

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


## Түр идэвхгүй Slash Command ангиллууд

Discord-ийн global slash command жагсаалтыг цөөлөх зорилгоор дараах ангиллын командуудыг loader-оос түр хассан:
- Birthday
- Leveling
- Economy
- Fun

Эдгээрийн command файлууд, service, event болон database өгөгдлийг устгаагүй. Зөвхөн slash command-уудыг Discord-д бүртгүүлэхгүй. Дахин идэвхжүүлэхдээ `src/handlers/loaders/commandLoader.js` доторх `DISABLED_COMMAND_CATEGORIES` жагсаалтаас тухайн ангиллыг хасна.
