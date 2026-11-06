import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fragmnConfig } from '../../config/fragmn.js';

const WEBSITE_URL = 'https://frag.mn';

function buildWebsiteEmbed() {
  return new EmbedBuilder()
    .setColor(fragmnConfig.accentColor)
    .setTitle('🌐 FRAG.MN — OFFICIAL WEBSITE')
    .setURL(WEBSITE_URL)
    .setDescription(
      'FRAG.MN-ийн албан ёсны вебсайтаар зочлоорой.\n\n' +
      '**Website sections**\n' +
      '• Play\n' +
      '• Skin Changer\n' +
      '• Shop\n' +
      '• Clans\n' +
      '• Leaderboard\n' +
      '• Matches\n' +
      '• Staff\n' +
      '• Fair play\n' +
      '• Guide\n' +
      '• Terms of Service\n' +
      '• Admin\n' +
      '• Discord'
    )
    .addFields({
      name: '🔗 Official Website',
      value: '[https://frag.mn](https://frag.mn)',
      inline: false,
    })
    .setFooter({ text: 'FRAG.MN • Official Website' })
    .setTimestamp();
}

export default {
  data: new SlashCommandBuilder()
    .setName('website')
    .setDescription('FRAG.MN албан ёсны website холбоосыг Embed хэлбэрээр харуулах'),

  async prefixExecute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Visit Website')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL)
        .setEmoji('🌐')
    );

    return interaction.reply({
      embeds: [buildWebsiteEmbed()],
      components: [row],
      allowedMentions: { parse: [] },
    });
  },

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Энэ командыг FRAG.MN Discord серверт ашиглана уу.',
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Visit Website')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL)
        .setEmoji('🌐')
    );

    return interaction.reply({
      embeds: [buildWebsiteEmbed()],
      components: [row],
      allowedMentions: { parse: [] },
    });
  },
};
