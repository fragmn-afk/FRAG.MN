import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { patchGuildConfig, getGuildConfig } from '../../services/config/guildConfig.js';
import { successEmbed, infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Автомат softban хийх хамгаалалтын сувгийг тохируулна')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Хамгаалалтын сувгийг үүсгэж идэвхжүүлнэ'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disable')
        .setDescription('Хамгаалалтын сувгийг унтраана protection'),
    ),
  category: 'moderation',

  async execute(interaction, config, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'disable') {
      await patchGuildConfig(client, interaction.guildId, { honeypotChannelId: null });
      return InteractionHelper.universalReply(interaction, {
        embeds: [infoEmbed('Honeypot унтарлаа', 'Honeypot хамгаалалтыг унтраалаа. Суваг устахгүй.')],
        ephemeral: true,
      });
    }

    const current = await getGuildConfig(client, interaction.guildId);
    const existing = current.honeypotChannelId
      ? await interaction.guild.channels.fetch(current.honeypotChannelId).catch(() => null)
      : null;

    if (existing) {
      let warningMessage = current.honeypotMessageId
        ? await existing.messages.fetch(current.honeypotMessageId).catch(() => null)
        : null;

      if (!warningMessage) {
        const warningEmbed = new EmbedBuilder()
          .setColor('#2B2D31')
          .setTitle('🍯 ЭНЭ СУВАГТ МЕССЕЖ БҮҮ БИЧ')
          .setDescription('Энэ суваг нь спам бот илрүүлэх зориулалттай. Энд ямар нэгэн мессеж бичвэл **softban** хийгдэнэ.')
          .addFields({ name: '🍯 Softban тоо', value: String(current.honeypotKicks || 0), inline: false });

        warningMessage = await existing.send({ embeds: [warningEmbed] });
        await warningMessage.pin().catch(() => {});
        await patchGuildConfig(client, interaction.guildId, { honeypotMessageId: warningMessage.id });
      }

      return InteractionHelper.universalReply(interaction, {
        embeds: [successEmbed('Honeypot анхааруулга бэлэн', `Анхааруулгын Embed байршуулсан суваг: ${existing}.`)],
        ephemeral: true,
      });
    }

    const channel = await interaction.guild.channels.create({
      name: 'bot-trap',
      type: ChannelType.GuildText,
      topic: 'Honeypot хамгаалалтын суваг. Энд мессеж илгээвэл автоматаар softban хийнэ.',
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

    const warningEmbed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle('🍯 ЭНЭ СУВАГТ МЕССЕЖ БҮҮ БИЧ')
      .setDescription('Энэ суваг нь спам бот илрүүлэх зориулалттай. Энд ямар нэгэн мессеж бичвэл **softban** хийгдэнэ.')
      .addFields({ name: '🍯 Softban тоо', value: String(current.honeypotKicks || 0), inline: false });

    const warningMessage = await channel.send({ embeds: [warningEmbed] });
    await warningMessage.pin().catch(() => {});

    await patchGuildConfig(client, interaction.guildId, {
      honeypotChannelId: channel.id,
      honeypotMessageId: warningMessage.id,
      honeypotKicks: current.honeypotKicks || 0,
    });

    return InteractionHelper.universalReply(interaction, {
      embeds: [
        successEmbed(
          'Honeypot идэвхжлээ',
          `Үүсгэсэн суваг: ${channel}\n**Үйлдэл:** Мессеж устгах → Сүүлийн 7 хоногийн мессеж устгах → Ban → шууд Unban (Softban).\n**Хамаарахгүй:** Сервер эзэмшигч, Bot Owner болон админ эрхтэй ажилтнууд.`,
        ),
      ],
      ephemeral: true,
    });
  },
};
