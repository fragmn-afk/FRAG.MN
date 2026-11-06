import { handleAntiNukeAuditEntry } from '../services/fragmnSecurityService.js';

export default {
  name: 'guildAuditLogEntryCreate',
  async execute(entry, guild) {
    await handleAntiNukeAuditEntry(entry, guild);
  },
};
