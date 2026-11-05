import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
const data=new SlashCommandBuilder().setName('frag-staff').setDescription('FRAG.MN staff хэрэгслүүд')
.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
.addSubcommand(s=>s.setName('purge').setDescription('Сүүлийн мессежүүд устгах').addIntegerOption(o=>o.setName('amount').setDescription('1–100 мессеж').setMinValue(1).setMaxValue(100).setRequired(true)))
.addSubcommand(s=>s.setName('slowmode').setDescription('Slowmode тохируулах').addIntegerOption(o=>o.setName('seconds').setDescription('0–21600 секунд').setMinValue(0).setMaxValue(21600).setRequired(true)))
.addSubcommand(s=>s.setName('lock').setDescription('Энэ сувгийг түгжих'))
.addSubcommand(s=>s.setName('unlock').setDescription('Энэ сувгийг нээх'));
export default {data,async execute(i){
 if(!i.inGuild()||!i.channel?.permissionOverwrites)return i.reply({content:'Энэ командыг текст сувагт ашиглана уу.',flags:MessageFlags.Ephemeral});
 const action=i.options.getSubcommand(), perms=i.memberPermissions;
 if(!perms?.has(PermissionFlagsBits.ManageMessages))return i.reply({content:'Manage Messages эрх шаардлагатай.',flags:MessageFlags.Ephemeral});
 try{
  if(action==='purge'){const deleted=await i.channel.bulkDelete(i.options.getInteger('amount',true),true);return i.reply({content:`🧹 ${deleted.size} мессеж устгалаа. 14 хоногоос хуучин мессежийг Discord bulk delete хийхгүй.`,flags:MessageFlags.Ephemeral});}
  if(!perms.has(PermissionFlagsBits.ManageChannels))return i.reply({content:'Manage Channels эрх шаардлагатай.',flags:MessageFlags.Ephemeral});
  if(action==='slowmode'){const seconds=i.options.getInteger('seconds',true);await i.channel.setRateLimitPerUser(seconds,`FRAG.MN staff: ${i.user.tag}`);return i.reply({content:seconds? `✅ Slowmode: ${seconds} секунд.`:'✅ Slowmode унтарлаа.',flags:MessageFlags.Ephemeral});}
  await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:action==='lock'?false:null},{reason:`FRAG.MN staff action by ${i.user.tag}`});
  return i.reply({content:action==='lock'?'🔒 Сувгийг түгжлээ.':'🔓 Сувгийг нээлээ.',allowedMentions:{parse:[]}});
 }catch(e){return i.reply({content:`Үйлдэл амжилтгүй: ${String(e.message).slice(0,150)}`,flags:MessageFlags.Ephemeral}).catch(()=>{});}
}};
