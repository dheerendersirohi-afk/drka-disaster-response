import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

export class ApiClient {
    constructor() {
        this.endpoint = process.env.API_ENDPOINT;
        this.apiKey = process.env.API_KEY;
        this.dataRoot = process.env.DATA_DIR
            ? path.resolve(process.env.DATA_DIR)
            : process.cwd();
        this.localReportsDir = path.join(this.dataRoot, 'reports');
    }

    async sendReport(parsedData) {
        const report = this.formatReport(parsedData);

        if (!this.endpoint) {
            console.warn('API_ENDPOINT is not configured. Saving report locally only.');
            await this.saveReportToFile(this.localReportsDir, report);
            return { success: true, savedLocally: true };
        }

        try {
            const response = await axios.post(this.endpoint, report, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
                },
                timeout: 10000
            });

            return {
                success: true,
                statusCode: response.status,
                data: response.data
            };
        } catch (error) {
            console.error(`API delivery failed: ${error.message}`);
            await this.saveReportToFile(this.localReportsDir, report);
            return {
                success: false,
                error: error.message,
                savedLocally: true
            };
        }
    }

    formatReport(parsedData) {
        return {
            reportId: this.generateReportId(parsedData),
            requestType: parsedData.requestType,
            allRequestTypes: parsedData.allRequestTypes,
            urgency: parsedData.urgency,
            primaryLocation: parsedData.location,
            allLocations: parsedData.allLocations,
            primaryContact: parsedData.contactNumber,
            allContacts: parsedData.allContactNumbers,
            originalMessage: parsedData.originalMessage,
            language: parsedData.language,
            source: {
                platform: 'whatsapp',
                groupName: parsedData.groupName,
                senderName: parsedData.senderName,
                senderNumber: parsedData.senderNumber
            },
            messageTimestamp: new Date(parsedData.timestamp).toISOString(),
            processedTimestamp: new Date(parsedData.parsedAt).toISOString(),
            status: 'pending',
            verified: false
        };
    }

    generateReportId(parsedData) {
        const timestamp = parsedData.timestamp || Date.now();
        const sender = String(parsedData.senderNumber || 'unknown').replace(/\D/g, '') || 'unknown';
        return `WA-${timestamp}-${sender.slice(-4)}`;
    }

    async saveReportToFile(directory, report) {
        await fs.mkdir(directory, { recursive: true });

        const dateKey = new Date().toISOString().split('T')[0];
        const filename = path.join(directory, `reports-${dateKey}.json`);

        let reports = [];

        try {
            const existing = await fs.readFile(filename, 'utf8');
            reports = JSON.parse(existing.replace(/^\uFEFF/, ''));
        } catch {
            reports = [];
        }

        reports.push(report);
        await fs.writeFile(filename, JSON.stringify(reports, null, 2), 'utf8');
        console.log(`Saved report to ${filename}`);
    }
}
