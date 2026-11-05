# FRAG.MN Staff and Security Controls

## Staff management

- /frag-staff role-add and /frag-staff role-remove manage staff roles.
- /frag-staff record records a note, warning, or strike.
- /frag-staff records shows recent records for a staff member.
- Role changes are restricted to role IDs listed in FRAGMN_STAFF_ROLE_IDS. Roles with Administrator permission are blocked.
- Staff applications continue to use the existing /apply and /app-admin workflow.

Set FRAGMN_STAFF_ROLE_IDS to comma-separated staff role IDs in hosting environment settings. The bot needs Manage Roles and its highest role must be above the configured staff roles.

## Anti-Raid

Disabled by default. Enable with FRAGMN_ANTI_RAID_ENABLED=true. The bot detects join bursts using FRAGMN_ANTI_RAID_THRESHOLD and FRAGMN_ANTI_RAID_WINDOW_MS.

Optional FRAGMN_ANTI_RAID_QUARANTINE_ROLE_ID applies a quarantine role to recent joiners after the threshold is reached. Configure that role manually so it grants no privileged permissions and restricts access only to the intended channels.

## Anti-Nuke

Disabled by default. Enable with FRAGMN_ANTI_NUKE_ENABLED=true. The bot watches destructive audit-log actions and counts repeated actions per executor during the configured window. At the threshold it alerts the security log channel and attempts to remove that executor's roles that carry privileged permissions, provided Discord role hierarchy allows it.

Set FRAGMN_SECURITY_LOG_CHANNEL_ID for alerts and FRAGMN_SECURITY_ALLOWED_USER_IDS to comma-separated trusted operator IDs. The server owner is always allowlisted. The bot needs View Audit Log and Manage Roles; its top role must be above roles it may remove.

These protections are intentionally opt-in. Test in a private server before enabling them on a production community.
