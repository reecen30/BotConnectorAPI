const BotService = require('../botService');
const botConfig = require('../botConfig');
const { MessagingResponse } = require('twilio').twiml;


// Instantiate the BotService with the necessary configuration
const botService = new BotService(
    botConfig.botName,
    botConfig.botId,
    botConfig.tenantId,
    botConfig.tokenEndPoint
);

async function startBot(req, res) {
    const { From, Body } = req.body;
    if (!From || !Body) {
        console.log('startBot: Missing required fields');
        return res.status(400).json({ success: false, message: 'Missing required fields: From, Body' });
    }

    try {
        const token = await botService.getTokenAsync();
        if (!token) {
            console.error('startBot: Failed to retrieve bot token');
            return res.status(401).json({ success: false, message: 'Failed to retrieve bot token' });
        }
        
        const response = await botService.startConversation(Body, token);
        console.log('startBot: Conversation started successfully');

        if (response.activities && response.activities.length > 0) {
            let fullMessageText = '';
            let actionTexts = '';

            // Regular expression to match and remove citations
            const citationRegex = /\[\d+\](?:\: cite\:\d+ ".*?")?/g;

            // Process each message except the ones matching the user's input
            response.activities.forEach((activity, index) => {
                console.log('Activity ID:', activity.id);
                console.log('Text:', activity.text);
                console.log('Attachments:', JSON.stringify(activity.attachments));  // Display details of attachments
                console.log('Conversation Details:', JSON.stringify(activity.conversation));  // Log conversation object details

                if (activity.from.role === 'bot' && activity.type === 'message' && activity.text && activity.text.trim() !== Body.trim()) {
                    // Remove citations from the text
                    const cleanedText = activity.text.replace(citationRegex, '').trim();
                    fullMessageText += cleanedText + '\n';
                }
                // Handle suggested actions from the last relevant message
                if (activity.suggestedActions && activity.suggestedActions.actions.length > 0 && index === response.activities.length - 1) {
                    actionTexts = 'Choose an option:\n' + activity.suggestedActions.actions.map(action => `- ${action.title}`).join('\n');
                }
            });

            // Concatenate messages and actions
            fullMessageText = fullMessageText.trim() + (actionTexts ? '\n' + actionTexts : '');

            // Create TwiML response
            const twiml = new MessagingResponse();
            twiml.message(fullMessageText || 'No response from bot');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        } else {
            console.log('No messages received from the bot yet.');
            const twiml = new MessagingResponse();
            twiml.message('No messages received yet');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        }
    } catch (error) {
        console.error('Error in startBot:', error);
        res.status(500).json({ success: false, message: `Failed to start conversation with bot: ${error.toString()}` });
    }
}


// Function to handle sending a message to the bot (if applicable)
async function sendMessage(req, res) {
    const { conversationId, message } = req.body;
    if (!conversationId || !message) {
        console.log('sendMessage: Missing required fields');
        return res.status(400).json({ success: false, message: 'Missing required fields: conversationId, message' });
    }

    try {
        console.log(`sendMessage: Attempting to send message to conversationId: ${conversationId}`);
        const token = await botService.getTokenAsync();
        const response = await botService.sendMessage(conversationId, message, token);
        console.log('sendMessage: Message sent successfully');
        res.json({ success: true, response: response });
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ success: false, message: 'Failed to send message to bot', error: error.toString() });
    }
}

module.exports = {
    startBot,
    sendMessage
};
