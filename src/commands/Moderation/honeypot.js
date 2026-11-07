import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { patchGuildConfig, getGuildConfig } from '../../services/config/guildConfig.js';
import { successEmbed, infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Configure the automatic honeypot softban channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Create and enable the honeypot channel'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disable')
        .setDescription('Disable the honeypot channel protection'),
    ),
  category: 'moderation',

  async execute(interaction, config, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'disable') {
      await patchGuildConfig(client, interaction.guildId, { honeypotChannelId: null });
      return InteractionHelper.universalReply(interaction, {
        embeds: [infoEmbed('Honeypot Disabled', 'Honeypot хамгаалалтыг унтраалаа. Channel устахгүй.')],
        ephemeral: true,
      });
    }

    const current = await getGuildConfig(client, interaction.guildId);
    const existing = current.honeypotChannelId
      ? await interaction.guild.channels.fetch(current.honeypotChannelId).catch(() => null)
      : null;

    if (existing) {
      return InteractionHelper.universalReply(interaction, {
        embeds: [infoEmbed('Honeypot Already Active', `Honeypot channel: ${existing}`)],
        ephemeral: true,
      });
    }

    const channel = await interaction.guild.channels.create({
      name: 'bot-trap',
      type: ChannelType.GuildText,
      topic: 'Honeypot security channel. Sending any message here triggers an automatic softban.',
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
      reason: `Honeypot channel configured by ${interaction.user.tag}`,
    });

    await patchGuildConfig(client, interaction.guildId, { honeypotChannelId: channel.id });

    return InteractionHelper.universalReply(interaction, {
      embeds: [
        successEmbed(
          'Honeypot Enabled',
          `Channel created: ${channel}\n**Action:** Message deleted → 7-day message purge → Ban → immediate Unban (Softban).\n**Exempt:** Server owner, Bot Owner, Administrator, Manage Server, Manage Messages.`,
        ),
      ],
      ephemeral: true,
    });
  },
};
