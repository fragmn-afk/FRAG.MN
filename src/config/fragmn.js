export const fragmnConfig = Object.freeze({
  name: process.env.FRAGMN_NAME || 'FRAG.MN',
  tagline: process.env.FRAGMN_TAGLINE || 'Монголын gaming & esports community',
  inviteUrl: process.env.FRAGMN_INVITE_URL || 'https://discord.gg/fragmn',
  websiteUrl: process.env.FRAGMN_WEBSITE_URL || null,
  accentColor: Number.parseInt((process.env.FRAGMN_COLOR || '#E53935').replace('#', ''), 16),
  timezone: process.env.FRAGMN_TIMEZONE || 'Asia/Ulaanbaatar',
});
export const mnNumber = (value) => new Intl.NumberFormat('mn-MN').format(Number(value) || 0);
export const discordTime = (date, style='R') => `<t:${Math.floor(new Date(date).getTime()/1000)}:${style}>`;
