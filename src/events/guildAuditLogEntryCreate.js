import { handleAntiNukeAuditEntry } from '../services/fragmnSecurityService.js';

export default {
  name: 'guildAuditLogEntryCreate',
  async execute(entry) {
    await handleAntiNukeAuditEntry(entry);
  },
};
