const BotService = require('../botService');
const botConfig = require('../botConfig');
const { MessagingResponse } = require('twilio').twiml;

const botService = new BotService(
    botConfig.botName,
    botConfig.botId,
    botConfig.tenantId,
    botConfig.tokenEndPoint
);

let userConversations = {}; // In-memory store for conversation IDs and tokens

function extractTextFromAdaptiveCard(adaptiveCard) {
    let text = '';
    adaptiveCard.body.forEach(item => {
        if (item.items) {
            item.items.forEach(subItem => {
                if (subItem.label) {
                    text += subItem.label + '\n';
                }
                if (subItem.text) {
                    text += subItem.text + '\n';
                }
            });
        } else {
            if (item.label) {
                text += item.label + '\n';
            }
            if (item.text) {
                text += item.text + '\n';
            }
        }
    });
    return text.trim();
}

async function startBot(req, res) {
    const { From, Body } = req.body;
    if (!From || !Body) {
        console.log('startBot: Missing required fields');
        return res.status(400).json({ success: false, message: 'Missing required fields: From, Body' });
    }

    try {
        // Request a new token for each interaction
        const token = await botService.getTokenAsync();
        if (!token) {
            console.error('startBot: Failed to retrieve bot token');
            return res.status(401).json({ success: false, message: 'Failed to retrieve bot token' });
        }

        let conversationId = userConversations[From]?.conversationId;
        let conversationToken = userConversations[From]?.conversationToken;
        let response;

        if (conversationId && conversationToken) {
            console.log(`Reusing conversation ID: ${conversationId}`);
            try {
                response = await botService.sendMessage(conversationId, Body, conversationToken);
            } catch (error) {
                if (error.message.includes('Token not valid for this conversation')) {
                    console.log(`Token not valid for conversation ID: ${conversationId}. Starting a new conversation.`);
                    const newConversation = await botService.startConversation(token);
                    userConversations[From] = newConversation;
                    response = await botService.sendMessage(newConversation.conversationId, Body, newConversation.conversationToken);
                } else {
                    throw error;
                }
            }
        } else {
            const newConversation = await botService.startConversation(token);
            userConversations[From] = newConversation;
            response = await botService.sendMessage(newConversation.conversationId, Body, newConversation.conversationToken);
            console.log(`Started new conversation ID: ${newConversation.conversationId}`);
        }

        if (response.activities && response.activities.length > 0) {
            let lastBotMessage = '';
            let actionTexts = '';
            let lastBotAttachment = '';
            let adaptiveCard = null;

            // Regular expression to match and remove citations
            const citationRegex = /\[\d+\](?:\: cite\:\d+ ".*?")?/g;

            // Get the last message from the bot
            for (let i = response.activities.length - 1; i >= 0; i--) {
                const activity = response.activities[i];
                if (activity.from.role === 'bot' && activity.type === 'message') {
                    lastBotMessage = activity.text ? activity.text.replace(citationRegex, '').trim() : '';

                    // Handle suggested actions from the last relevant message
                    if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
                        actionTexts = 'Choose an option:\n' + activity.suggestedActions.actions.map(action => `- ${action.title}`).join('\n');
                    }

                    // Handle attachments
                    if (activity.attachments && activity.attachments.length > 0) {
                        console.log('Attachments:', JSON.stringify(activity.attachments, null, 2));
                        lastBotAttachment = activity.attachments.map(attachment => {
                            if (attachment.contentType === 'application/vnd.microsoft.card.adaptive') {
                                adaptiveCard = attachment.content;
                                return extractTextFromAdaptiveCard(adaptiveCard);
                            } else {
                                return attachment.contentUrl || attachment.content;
                            }
                        }).join('\n');
                    }
                    break;
                }
            }

            // Check if the user's response should be submitted as an action
            if (adaptiveCard) {
                const submitAction = adaptiveCard.actions.find(action => action.type === 'Action.Submit');
                if (submitAction) {
                    const submitData = {
                        ...submitAction.data,
                        userEmailAddress: Body // Assuming the user email is the Body
                    };
                    response = await botService.sendSubmitAction(conversationId, submitData, conversationToken);
                }
            }

            console.log('Last bot message:', lastBotMessage);
            console.log('Action texts:', actionTexts);
            console.log('Last bot attachment:', lastBotAttachment);
            const fullMessageText = (lastBotMessage || '') + (actionTexts ? '\n' + actionTexts : '') + (lastBotAttachment ? '\n' + lastBotAttachment : '');

            const twiml = new MessagingResponse();
            twiml.message(fullMessageText || 'No response from bot');
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml.toString());
        } else {
            console.log('No messages received from the bot yet.');
            const twiml = new MessagingResponse();
            twiml.message('No messages received yet');
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml.toString());
        }
    } catch (error) {
        console.error('Error in startBot:', error);
        res.status(500).json({ success: false, message: `Failed to start conversation with bot: ${error.toString()}` });
    }
}

module.exports = {
    startBot
};
