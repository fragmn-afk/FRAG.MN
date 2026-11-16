import createTicketHandler from '../../../handlers/ticketButtons.js';

export default {
  name: 'ticket_type',
  async execute(interaction, client, args = []) {
    const panelId = args[0] || 'default';
    const selectedType = interaction.values?.[0];
    if (!selectedType) {
      return interaction.reply({ content: 'Хүсэлтийн төрлөө сонгоно уу.', ephemeral: true });
    }
    return createTicketHandler.execute(interaction, client, [panelId, selectedType]);
  },
};
