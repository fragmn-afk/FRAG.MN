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
