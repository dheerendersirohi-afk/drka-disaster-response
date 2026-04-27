import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import fs from 'fs';
import { MessageParser } from './messageParser.js';
import { ApiClient } from './apiClient.js';

dotenv.config();

const { Client, LocalAuth } = pkg;

function resolveBrowserPath() {
    const configuredPath = process.env.BROWSER_PATH || process.env.CHROME_PATH;
    const candidates = [
        configuredPath,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ].filter(Boolean);

    return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

class DisasterResponseBot {
    constructor() {
        this.parser = new MessageParser();
        this.apiClient = new ApiClient();
        this.monitoredGroups = (process.env.MONITORED_GROUPS || '')
            .split(',')
            .map(name => name.trim())
            .filter(Boolean);
        this.autoReply = process.env.AUTO_REPLY === 'true';
        this.browserPath = resolveBrowserPath();
        this.headless = process.env.BOT_HEADLESS === 'true';

        if (!this.browserPath) {
            console.warn('No Chrome or Edge executable was found. Set BROWSER_PATH in .env if needed.');
        } else {
            console.log(`Using browser executable: ${this.browserPath}`);
        }
        console.log(`Launching browser in ${this.headless ? 'headless' : 'visible'} mode.`);

        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                executablePath: this.browserPath || undefined,
                headless: this.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            }
        });

        this.registerHandlers();
    }

    registerHandlers() {
        this.client.on('qr', qr => {
            console.log('Scan this QR code with WhatsApp Linked Devices:');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('WhatsApp bot is ready.');
            console.log(
                this.monitoredGroups.length > 0
                    ? `Monitoring groups matching: ${this.monitoredGroups.join(', ')}`
                    : 'Monitoring all groups.'
            );
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp authentication succeeded.');
        });

        this.client.on('loading_screen', (percent, message) => {
            console.log(`WhatsApp loading: ${percent}% ${message}`);
        });

        this.client.on('change_state', state => {
            console.log(`WhatsApp state changed: ${state}`);
        });

        this.client.on('auth_failure', () => {
            console.error('Authentication failed. Delete .wwebjs_auth and scan again.');
        });

        this.client.on('disconnected', reason => {
            console.error(`WhatsApp client disconnected: ${reason}`);
        });

        this.client.on('message', async message => {
            await this.handleMessage(message);
        });
    }

    shouldMonitorGroup(chatName) {
        if (this.monitoredGroups.length === 0) {
            return true;
        }

        return this.monitoredGroups.some(groupName =>
            chatName.toLowerCase().includes(groupName.toLowerCase())
        );
    }

    async handleMessage(message) {
        try {
            if (message.fromMe) {
                return;
            }

            if (!message.body || !message.body.trim()) {
                return;
            }

            const chat = await message.getChat();

            if (!chat.isGroup) {
                return;
            }

            if (!this.shouldMonitorGroup(chat.name)) {
                return;
            }

            let senderName = 'Unknown';
            let senderNumber = 'Unknown';

            try {
                const contact = await message.getContact();
                senderName = contact.pushname || contact.name || contact.number || 'Unknown';
                senderNumber = contact.number || message.author || message.from || 'Unknown';
            } catch (error) {
                senderNumber = (message.author || message.from || 'Unknown').split('@')[0];
            }

            const parsedData = await this.parser.parseMessage(message.body, {
                groupName: chat.name,
                senderName,
                senderNumber,
                timestamp: message.timestamp
            });

            if (!parsedData.isRelevant) {
                return;
            }

            console.log(`Relevant report detected in "${chat.name}" from ${senderName}`);
            console.log(`Type: ${parsedData.requestType} | Urgency: ${parsedData.urgency}`);

            const result = await this.apiClient.sendReport(parsedData);

            if (!result.success) {
                console.error(`API delivery failed: ${result.error}`);
                return;
            }

            console.log('Report delivered successfully.');

            if (this.autoReply) {
                const replyMessage =
                    process.env.REPLY_MESSAGE ||
                    'Thank you. Your message has been recorded and will be processed.';
                await message.reply(replyMessage);
            }
        } catch (error) {
            console.error('Error while handling a WhatsApp message:', error);
        }
    }

    async start() {
        console.log('Starting WhatsApp Disaster Response Bot...');
        await this.client.initialize();
    }
}

const bot = new DisasterResponseBot();
bot.start().catch(error => {
    console.error('Failed to start WhatsApp bot:', error);
    console.error('If this is a browser launch error, set BROWSER_PATH in .env to your Chrome/Edge executable.');
});
