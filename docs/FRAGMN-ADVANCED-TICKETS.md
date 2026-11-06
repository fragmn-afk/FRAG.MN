# FRAG.MN Advanced Ticket Panels

The legacy `/ticket setup` panel remains supported. Additional panels are managed separately and do not replace or delete the legacy panel.

## Commands

- `/ticket panel-create`: create a panel in a text channel with its own open/closed categories, staff role, required role, escalation role, per-panel open ticket limit, DM-on-close setting, staff ping setting, transcript channel, and ticket log channel.
- `/ticket panels`: list configured additional panels and their IDs.
- `/ticket panel-access`: allow a role, remove an allowed role, block/unblock a role, or block/unblock a user for a panel.
- `/ticket panel-delete`: remove a panel and its panel message. Existing tickets created from that panel are not deleted.
- `/ticket escalate`: from an open ticket channel, notify the configured escalation role and grant it channel access.

The existing ticket lifecycle remains available: create, claim, unclaim, close, reopen, delete, transcript generation, ticket logs, and feedback collection.

## Access rules

A panel can require a role. Optional allowed-role entries act as an allowlist: when the list is non-empty, the user must have at least one allowed role. Blocked roles and users are denied. The access check is repeated when the ticket modal is submitted so a removed panel or changed access rule cannot be bypassed with an already-open modal.

## Per-panel settings

Ticket records store their originating panel ID and relevant category, staff role, escalation role, max-ticket, notification and transcript settings. These settings remain attached to existing tickets even if the panel is later edited or removed.

## Permissions

The bot needs Manage Channels, Manage Roles where applicable, View Channel, Send Messages, Read Message History, Attach Files and Embed Links in the selected channels. Its top role should be above each configured ticket staff role.

## Current scope

Additional panels currently create private text channels. Thread/forum ticket channel types and staff escalation workflows are not part of this implementation yet. Test panel access, permissions, close/reopen and transcript routing in a private test server before using it for production support.
