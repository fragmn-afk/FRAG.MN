import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { fragmnConfig } from '../../config/fragmn.js';

function formatPrice(value) {
  return new Intl.NumberFormat('mn-MN').format(value) + '₮';
}

function buildMembershipEmbed() {
  const vipPrice = fragmnConfig.vipPackages.vip.price;

  return new EmbedBuilder()
    .setColor(fragmnConfig.accentColor)
    .setTitle('⚡ FRAG.MN • MEMBERSHIP')
    .setDescription(
      'FRAG.MN community-ийн онцгой membership багцуудтай танилцана уу.\n' +
      'Өөрийн зэрэглэлээ сонгож, community-ийн нэг хэсэг болоорой.'
    )
    .addFields(
      {
        name: '💎 VIP — 1 MONTH',
        value: '**' + formatPrice(vipPrice) + '**\nQPay-аар худалдан авах боломжтой.',
        inline: false,
      },
      {
        name: '👑 EMPEROR',
        value: '**0₮-с эхлэх үнэ**\nДуудлага худалдаагаар олгоно.',
        inline: false,
      },
      {
        name: '🔥 BOSS',
        value: '**400,000₮-с эхлэх үнэ**\nДуудлага худалдаагаар олгоно.',
        inline: false,
      },
    )
    .addFields({
      name: '📩 Худалдан авалт',
      value: 'VIP авахдаа `/fragmn vip buy` командыг ашиглана уу.\nEMPEROR болон BOSS-ийн дуудлага худалдааны мэдээллийг staff-аас авна уу.',
      inline: false,
    })
    .setFooter({ text: 'FRAG.MN • Membership' })
    .setTimestamp();
}

export default {
  data: new SlashCommandBuilder()
    .setName('membership')
    .setDescription('FRAG.MN membership багц болон үнийн мэдээлэл харах'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Энэ командыг FRAG.MN Discord серверт ашиглана уу.',
        ephemeral: true,
      });
    }

    return interaction.reply({
      embeds: [buildMembershipEmbed()],
      allowedMentions: { parse: [] },
    });
  },
};
