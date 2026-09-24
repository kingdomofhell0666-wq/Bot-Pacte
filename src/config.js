const dotenv = require('dotenv');

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID;

if (!DISCORD_TOKEN || DISCORD_TOKEN === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
  throw new Error('DISCORD_TOKEN is missing. Put your Discord bot token in .env');
}

if (!/^\d{17,20}$/.test(MEMBER_ROLE_ID || '')) {
  throw new Error('MEMBER_ROLE_ID is missing or invalid in .env');
}

module.exports = {
  DISCORD_TOKEN,
  MEMBER_ROLE_ID,
};
