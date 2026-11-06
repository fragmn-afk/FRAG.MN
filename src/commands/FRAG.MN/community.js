import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { fragmnConfig, mnNumber, discordTime } from '../../config/fragmn.js';
import { staffGroup, executeStaffCommand } from './staff.js';
import { vipGroup, executeVipCommand } from './vip.js';

const data = new SlashCommandBuilder()
  .setName('fragmn').setDescription('FRAG.MN community мэдээлэл')
  .addSubcommand(s => s.setName('info').setDescription('Community-ийн тухай'))
  .addSubcommand(s => s.setName('server').setDescription('Серверийн мэдээлэл'))
  .addSubcommand(s => s.setName('member').setDescription('Гишүүний мэдээлэл')
    .addUserOption(o => o.setName('user').setDescription('Мэдээллийг харах гишүүн').setRequired(false)))
  .addSubcommandGroup(staffGroup)
  .addSubcommandGroup(vipGroup);

const embed = (title, description) => new EmbedBuilder().setColor(fragmnConfig.accentColor)
  .setTitle(title).setDescription(description).setFooter({text:'FRAG.MN • Монголын gaming community'}).setTimestamp();

export default {
  data,
  async execute(i, config, client) {
    if (!i.inGuild()) return i.reply({content:'Энэ командыг сервер дотор ашиглана уу.',flags:MessageFlags.Ephemeral});
    const group = i.options.getSubcommandGroup(false);
    if (group === 'staff') return executeStaffCommand(i);
    if (group === 'vip') return executeVipCommand(i, config, client);
    const action=i.options.getSubcommand();
    if(action==='info'){
      const e=embed('⚡ FRAG.MN','**Монголын gaming & esports community**\nТоглоом, esports, найз нөхөд, community event-үүд нэг дор.')
        .addFields({name:'Discord',value:`[Нэгдэх холбоос](${fragmnConfig.inviteUrl})`,inline:true},{name:'Хэл',value:'Монгол 🇲🇳',inline:true},{name:'Чиглэл',value:'CS2 • Gaming • Community',inline:true});
      if(fragmnConfig.websiteUrl)e.addFields({name:'Website',value:fragmnConfig.websiteUrl});
      return i.reply({embeds:[e],allowedMentions:{parse:[]}});
    }
    if(action==='server'){
      const g=i.guild, owner=await g.fetchOwner().catch(()=>null);
      return i.reply({embeds:[embed('🏆 Серверийн мэдээлэл',`**${g.name}**`).setThumbnail(g.iconURL({size:256})).addFields(
        {name:'Эзэмшигч',value:owner?.user.tag||'Тодорхойгүй',inline:true},
        {name:'Гишүүд',value:mnNumber(g.memberCount),inline:true},
        {name:'Суваг',value:mnNumber(g.channels.cache.size),inline:true},
        {name:'Role',value:mnNumber(g.roles.cache.size),inline:true},
        {name:'Boost',value:String(g.premiumTier),inline:true},
        {name:'Үүссэн',value:discordTime(g.createdAt,'D'),inline:true})]});
    }
    const user=i.options.getUser('user')||i.user, member=await i.guild.members.fetch(user.id).catch(()=>null);
    const roles=member?.roles.cache.filter(r=>r.id!==i.guild.id).map(r=>r.toString()).slice(0,12)||[];
    return i.reply({embeds:[embed('👤 Гишүүний мэдээлэл',`**${user.tag}**`).setThumbnail(user.displayAvatarURL({size:256})).addFields(
      {name:'Discord ID',value:user.id,inline:true},{name:'Бүртгүүлсэн',value:discordTime(user.createdAt),inline:true},
      {name:'Серверт нэгдсэн',value:member?.joinedAt?discordTime(member.joinedAt):'Мэдээлэл алга',inline:true},
      {name:'Role',value:roles.join(' ')||'Нэмэлт role байхгүй'})]});
  }
};
