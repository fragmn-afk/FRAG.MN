const readPrice = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

export const fragmnConfig = Object.freeze({
  name: process.env.FRAGMN_NAME || 'FRAG.MN',
  tagline: process.env.FRAGMN_TAGLINE || 'Монголын gaming & esports community',
  inviteUrl: process.env.FRAGMN_INVITE_URL || 'https://discord.gg/fragmn',
  websiteUrl: process.env.FRAGMN_WEBSITE_URL || null,
  accentColor: Number.parseInt((process.env.FRAGMN_COLOR || '#E53935').replace('#', ''), 16),
  timezone: process.env.FRAGMN_TIMEZONE || 'Asia/Ulaanbaatar',
  vipPackages: Object.freeze({
    vip: { name: 'VIP', price: readPrice('FRAGMN_VIP_PRICE', 350000), roleId: process.env.FRAGMN_VIP_ROLE_ID || null },
    noble: { name: 'EMPEROR', price: readPrice('FRAGMN_NOBLE_PRICE', 20000), roleId: process.env.FRAGMN_NOBLE_ROLE_ID || null },
    boss: { name: 'BOSS', price: readPrice('FRAGMN_BOSS_PRICE', 30000), roleId: process.env.FRAGMN_BOSS_ROLE_ID || null },
  }),
});
export const mnNumber = (value) => new Intl.NumberFormat('mn-MN').format(Number(value) || 0);
export const discordTime = (date, style='R') => `<t:${Math.floor(new Date(date).getTime()/1000)}:${style}>`;
