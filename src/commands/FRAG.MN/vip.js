export const commandGroupOnly = true;
import {
  SlashCommandSubcommandGroupBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags,
} from 'discord.js';
import { fragmnConfig } from '../../config/fragmn.js';
import { createVipInvoice, finalizeVipInvoice, getVipInvoiceForUser } from '../../services/qpayVipService.js';

export const vipGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('vip')
  .setDescription('FRAG.MN VIP багц болон QPay төлбөр')
  .addSubcommand((s) => s.setName('plans').setDescription('VIP багцуудын үнэ харах'))
  .addSubcommand((s) => s.setName('buy').setDescription('QPay QR нэхэмжлэх үүсгэх')
    .addStringOption((o) => o.setName('tier').setDescription('Авах VIP багц').setRequired(true)
      .addChoices(
        { name: 'VIP', value: 'vip' },
        { name: 'NOBLE', value: 'noble' },
        { name: 'BOSS', value: 'boss' },
      )))
  .addSubcommand((s) => s.setName('status').setDescription('Сүүлийн QPay төлбөрийн төлөв харах')
    .addStringOption((o) => o.setName('invoice_id').setDescription('Нэхэмжлэхийн ID (сонголтоор)').setRequired(false)));

function formatPrice(value) {
  return new Intl.NumberFormat('mn-MN').format(value) + '₮';
}

function buildPlansEmbed() {
  const packages = fragmnConfig.vipPackages;
  return new EmbedBuilder()
    .setColor(fragmnConfig.accentColor)
    .setTitle('⚡ FRAG.MN VIP багцууд')
    .setDescription('Өөрт тохирох багцаа сонгоод QPay QR-аар төлбөрөө төлнө үү.')
    .addFields(
      { name: 'VIP', value: formatPrice(packages.vip.price), inline: true },
      { name: 'NOBLE', value: formatPrice(packages.noble.price), inline: true },
      { name: 'BOSS', value: formatPrice(packages.boss.price), inline: true },
    )
    .setFooter({ text: 'Төлбөр баталгаажсаны дараа role автоматаар олгогдоно.' });
}

function buildStatusEmbed(invoice) {
  const labels = {
    pending: '🟡 Төлбөр хүлээгдэж байна',
    role_pending: '🟠 Төлбөр баталгаажсан • Role олгох хүлээгдэж байна',
    paid: '🟢 Төлбөр амжилттай • Role олгогдсон',
  };
  return new EmbedBuilder()
    .setColor(fragmnConfig.accentColor)
    .setTitle('FRAG.MN • QPay төлбөрийн төлөв')
    .addFields(
      { name: 'Багц', value: invoice.tierName, inline: true },
      { name: 'Дүн', value: formatPrice(invoice.amount), inline: true },
      { name: 'Төлөв', value: labels[invoice.status] || invoice.status, inline: false },
      { name: 'Нэхэмжлэх ID', value: String.fromCharCode(96) + invoice.invoiceId + String.fromCharCode(96), inline: false },
    )
    .setTimestamp(new Date(invoice.createdAt));
}

export async function executeVipCommand(interaction, config, client) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'Энэ командыг FRAG.MN Discord серверт ашиглана уу.', flags: MessageFlags.Ephemeral });
    }

    const action = interaction.options.getSubcommand();
    if (action === 'plans') {
      return interaction.reply({ embeds: [buildPlansEmbed()], flags: MessageFlags.Ephemeral });
    }

    if (action === 'buy') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const invoice = await createVipInvoice(client, {
          guildId: interaction.guildId,
          userId: interaction.user.id,
          tier: interaction.options.getString('tier', true),
        });
        const embed = new EmbedBuilder()
          .setColor(fragmnConfig.accentColor)
          .setTitle('💳 FRAG.MN • QPay нэхэмжлэх')
          .setDescription(
            '**' + invoice.tierName + '** багцын төлбөр: **' + formatPrice(invoice.amount) + '**\n' +
            'Төлбөрийг хийсний дараа role автоматаар олгогдоно.\n\n' +
            'Нэхэмжлэх: ' + String.fromCharCode(96) + invoice.invoiceId + String.fromCharCode(96),
          )
          .setFooter({ text: 'QR болон банкны аппын холбоосоор төлнө үү.' })
          .setTimestamp();

        const files = [];
        const rawQr = invoice.qrImage
          ? invoice.qrImage.replace(/^data:image\/png;base64,/i, '')
          : null;
        if (rawQr) {
          files.push(new AttachmentBuilder(Buffer.from(rawQr, 'base64'), { name: 'fragmn-qpay-qr.png' }));
          embed.setImage('attachment://fragmn-qpay-qr.png');
        }

        const buttons = [];
        if (invoice.shortUrl && /^https?:\/\//i.test(invoice.shortUrl)) {
          buttons.push(new ButtonBuilder().setLabel('QPay нээх').setStyle(ButtonStyle.Link).setURL(invoice.shortUrl));
        }
        for (const bank of invoice.urls.slice(0, 4)) {
          if (bank?.link && /^https?:\/\//i.test(bank.link)) {
            buttons.push(new ButtonBuilder().setLabel(String(bank.name || 'Банк').slice(0, 80)).setStyle(ButtonStyle.Link).setURL(bank.link));
          }
        }
        const components = buttons.length
          ? [new ActionRowBuilder().addComponents(buttons.slice(0, 5))]
          : [];
        return interaction.editReply({ embeds: [embed], files, components });
      } catch (error) {
        return interaction.editReply({
          content: 'Нэхэмжлэх үүсгэж чадсангүй: ' + String(error.message || 'QPay алдаа').slice(0, 500),
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      let invoice = await getVipInvoiceForUser(client, {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        invoiceId: interaction.options.getString('invoice_id'),
      });
      if (!invoice) {
        return interaction.editReply({ content: 'Таны энэ сервер дээр бүртгэлтэй QPay нэхэмжлэх олдсонгүй.' });
      }
      if (invoice.status !== 'paid') {
        await finalizeVipInvoice(client, invoice.invoiceId).catch(() => null);
        invoice = await getVipInvoiceForUser(client, {
          guildId: interaction.guildId,
          userId: interaction.user.id,
          invoiceId: invoice.invoiceId,
        }) || invoice;
      }
      return interaction.editReply({ embeds: [buildStatusEmbed(invoice)] });
    } catch (error) {
      return interaction.editReply({ content: 'Төлбөрийн төлөв шалгаж чадсангүй: ' + String(error.message || 'Алдаа').slice(0, 400) });
    }
}
