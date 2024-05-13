// botConfig.js
// Load environment variables if .env file is used in the project
require('dotenv').config();

const botConfig = {
    botId: process.env.BOT_ID,
    tenantId: process.env.TENANT_ID,
    tokenEndPoint: process.env.BOT_TOKEN_ENDPOINT,
    botName: process.env.BOT_NAME,
    endConversationMessage: process.env.END_CONVERSATION_MESSAGE
};

// Checking if any essential configuration is missing
const requiredConfig = ['botId', 'tenantId', 'tokenEndPoint', 'botName', 'endConversationMessage'];
const isConfigMissing = requiredConfig.some(key => !botConfig[key]);

if (isConfigMissing) {
    console.error("Missing required configurations in .env");
    process.exit(1); // Exit the process if configuration is incomplete
}

module.exports = botConfig;

