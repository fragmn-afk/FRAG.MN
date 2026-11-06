import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { getTicketData } from '../../utils/database.js';
import { escalateTicket } from '../../services/ticket.js';

export async function executeTicketEscalation(interaction, client) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Энэ командыг ticket сувгийн дотор серверт ашиглана уу.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticketData = await getTicketData(interaction.guildId, interaction.channelId);
    if (!ticketData) {
      return interaction.reply({
        content: 'Энэ суваг бүртгэлтэй ticket биш байна.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildConfig = await getGuildConfig(client, interaction.guildId);
    const staffRoleId = ticketData.panelId
      ? (ticketData.staffRoleId || null)
      : (guildConfig.ticketStaffRoleId || null);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isManager = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels));
    const isTicketStaff = Boolean(staffRoleId && member?.roles.cache.has(staffRoleId));

    if (!isManager && !isTicketStaff) {
      return interaction.reply({
        content: 'Зөвхөн ticket staff эсвэл Manage Channels эрхтэй хүн эскалац хийх боломжтой.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await escalateTicket(
        interaction.channel,
        interaction.user,
        interaction.options.getString('reason') || 'Staff escalation requested',
      );
      return interaction.editReply('🚨 Ticket escalation амжилттай. Тохируулсан escalation role-д мэдэгдэл илгээлээ.');
    } catch (error) {
      return interaction.editReply('Эскалац амжилтгүй: ' + String(error.message || 'Алдаа').slice(0, 350));
    }
}
