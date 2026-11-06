import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';

const MAX_RESPONSES = 25;
const DEFAULT_COLOR = '#720000';

function normalizeKeyword(value) {
  return String(value || '').trim().replace(/^!/, '').toLowerCase();
}

function buildResponseEmbed(item) {
  const embed = new EmbedBuilder()
    .setColor(/^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : DEFAULT_COLOR)
    .setTitle(item.title || 'FRAG.MN')
    .setDescription(item.description || 'Мэдээлэл байхгүй.');
  if (item.footer) embed.setFooter({ text: item.footer.slice(0, 2048) });
  if (item.image && /^https?:\/\//i.test(item.image)) embed.setImage(item.image);
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('autoresponse')
    .setDescription('Prefix keyword-д автоматаар Embed хариу тохируулах')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub
      .setName('add')
      .setDescription('Шинэ keyword болон Embed хариу нэмэх')
      .addStringOption((o) => o.setName('keyword').setDescription('Жишээ: clan').setRequired(true).setMaxLength(32))
      .addStringOption((o) => o.setName('title').setDescription('Embed гарчиг').setRequired(true).setMaxLength(256))
      .addStringOption((o) => o.setName('description').setDescription('Embed тайлбар').setRequired(true).setMaxLength(4000))
      .addStringOption((o) => o.setName('color').setDescription('Hex өнгө, жишээ: #720000').setRequired(false).setMaxLength(7))
      .addStringOption((o) => o.setName('image').setDescription('Зургийн URL (заавал биш)').setRequired(false).setMaxLength(500))
      .addStringOption((o) => o.setName('footer').setDescription('Embed footer (заавал биш)').setRequired(false).setMaxLength(200)))
    .addSubcommand((sub) => sub
      .setName('remove')
      .setDescription('Keyword устгах')
      .addStringOption((o) => o.setName('keyword').setDescription('Устгах keyword').setRequired(true).setMaxLength(32)))
    .addSubcommand((sub) => sub.setName('list').setDescription('Тохируулсан keyword-үүдийг харах'))
    .addSubcommand((sub) => sub
      .setName('toggle')
      .setDescription('Auto response асаах/унтраах')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Асаах эсвэл унтраах').setRequired(true))),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'Энэ командыг сервер дотор ашиглана уу.', ephemeral: true });
    }

    const config = await getGuildConfig(interaction.client, interaction.guildId);
    const responses = Array.isArray(config.autoResponses) ? [...config.autoResponses] : [];
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const keyword = normalizeKeyword(interaction.options.getString('keyword'));
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color') || DEFAULT_COLOR;
      const image = interaction.options.getString('image');
      const footer = interaction.options.getString('footer');

      if (!/^[a-z0-9_-]{1,32}$/i.test(keyword)) {
        return interaction.reply({ content: 'Keyword нь зөвхөн үсэг, тоо, _ болон - агуулна. Prefix-ээ бичих шаардлагагүй.', ephemeral: true });
      }
      if (!/^#[0-9a-f]{6}$/i.test(color)) {
        return interaction.reply({ content: 'Өнгөний формат буруу байна. Жишээ: #720000', ephemeral: true });
      }
      if (image && !/^https?:\/\//i.test(image)) {
        return interaction.reply({ content: 'Зургийн URL http:// эсвэл https://-ээр эхлэх ёстой.', ephemeral: true });
      }

      const existingIndex = responses.findIndex((item) => item.keyword === keyword);
      const item = { keyword, title, description, color, image: image || null, footer: footer || null, enabled: true };
      if (existingIndex >= 0) responses[existingIndex] = item;
      else if (responses.length >= MAX_RESPONSES) {
        return interaction.reply({ content: `Нэг серверт хамгийн ихдээ ${MAX_RESPONSES} keyword тохируулна.`, ephemeral: true });
      } else responses.push(item);

      await patchGuildConfig(interaction.client, interaction.guildId, { autoResponses: responses });
      return interaction.reply({ content: `✅ \`${config.prefix || '!'}${keyword}\` keyword-ийн Embed хариу хадгалагдлаа.`, ephemeral: true });
    }

    if (subcommand === 'remove') {
      const keyword = normalizeKeyword(interaction.options.getString('keyword'));
      const filtered = responses.filter((item) => item.keyword !== keyword);
      if (filtered.length === responses.length) {
        return interaction.reply({ content: 'Ийм keyword олдсонгүй.', ephemeral: true });
      }
      await patchGuildConfig(interaction.client, interaction.guildId, { autoResponses: filtered });
      return interaction.reply({ content: `🗑️ \`${keyword}\` keyword устгагдлаа.`, ephemeral: true });
    }

    if (subcommand === 'list') {
      if (!responses.length) {
        return interaction.reply({ content: 'Одоогоор keyword тохируулаагүй байна.', ephemeral: true });
      }
      const lines = responses.map((item) => `• \`${config.prefix || '!'}${item.keyword}\` — ${item.title} (${item.enabled === false ? 'OFF' : 'ON'})`);
      return interaction.reply({ content: `**Auto Response keywords**\n${lines.join('\n')}`, ephemeral: true });
    }

    if (subcommand === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      await patchGuildConfig(interaction.client, interaction.guildId, { autoResponsesEnabled: enabled });
      return interaction.reply({ content: `Auto Response ${enabled ? 'асаалаа' : 'унтарлаа'}.`, ephemeral: true });
    }
  },
};
