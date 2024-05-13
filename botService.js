const axios = require('axios');

class BotService {
    constructor(botName, botId, tenantId, tokenEndPoint) {
        this.botName = botName;
        this.botId = botId;
        this.tenantId = tenantId;
        this.tokenEndPoint = tokenEndPoint;
    }

    async getTokenAsync() {
        try {
            const params = { 'botId': this.botId, 'tenantId': this.tenantId };
            console.log(`Requesting token from: ${this.tokenEndPoint}`, params);

            const response = await axios.get(this.tokenEndPoint, { params });
            if (response.status !== 200) {
                console.error(`Failed to retrieve token: Status ${response.status}`, response.data);
                return null;
            }
            return response.data.token;
        } catch (error) {
            console.error('Error fetching token:', error.response ? error.response.data : error.message);
            throw new Error('Failed to fetch token: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
        }
    }

    async startConversation(inputMsg, token) {
        if (!token) {
            throw new Error('Token is required to start conversation');
        }

        const directLineApiEndpoint = 'https://europe.directline.botframework.com/v3/directline/conversations';
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            // Start a new conversation
            const conversationResponse = await axios.post(directLineApiEndpoint, {}, { headers });
            const conversationId = conversationResponse.data.conversationId;
            console.log(`Conversation started with ID: ${conversationId}`);

            if (inputMsg) {
                const postMessageUrl = `${directLineApiEndpoint}/${conversationId}/activities`;
                const messageData = {
                    type: 'message',
                    from: { id: 'userId', name: this.botName },
                    text: inputMsg
                };
                await axios.post(postMessageUrl, messageData, { headers });

                // Delay to wait for the bot to respond
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

                const getActivityUrl = `${directLineApiEndpoint}/${conversationId}/activities`;
                const getResponse = await axios.get(getActivityUrl, { headers });
                console.log('Activities received:', getResponse.data);

                return getResponse.data; // This contains all messages exchanged in the conversation
            } else {
                return "No message sent. Conversation started with ID: " + conversationId;
            }
        } catch (error) {
            console.error('Error in conversation with bot:', error.response ? error.response.data : error.message);
            throw new Error('Failed to start conversation: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
        }
    }
}

module.exports = BotService;
