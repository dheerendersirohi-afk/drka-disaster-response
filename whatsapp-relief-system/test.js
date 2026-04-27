import { MessageParser } from './messageParser.js';

const parser = new MessageParser();

const testCases = [
    {
        name: 'English medical request',
        text: 'Need urgent medical supplies in Jaipur. Contact 9876543210',
        expectRelevant: true,
        expectType: 'medical',
        expectUrgency: 'high',
        expectLanguage: 'en',
        expectLocation: 'Jaipur',
        expectContact: '+919876543210'
    },
    {
        name: 'Hindi rescue request',
        text: '\u0924\u0941\u0930\u0902\u0924 \u092e\u0926\u0926 \u091a\u093e\u0939\u093f\u090f, 5 \u0932\u094b\u0917 \u092b\u0902\u0938\u0947 \u0939\u0948\u0902, Delhi, \u0928\u0902\u092c\u0930 9876501234',
        expectRelevant: true,
        expectType: 'rescue',
        expectUrgency: 'high',
        expectLanguage: 'hi',
        expectLocation: 'Delhi',
        expectContact: '+919876501234'
    },
    {
        name: 'Tamil food request',
        text: '\u0b85\u0bb5\u0b9a\u0bb0\u0bae\u0bbe\u0b95 \u0b89\u0ba3\u0bb5\u0bc1 \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0ba4\u0ba3\u0bcd\u0ba3\u0bc0\u0bb0\u0bcd \u0ba4\u0bc7\u0bb5\u0bc8, Delhi, 9123456789',
        expectRelevant: true,
        expectType: 'food',
        expectUrgency: 'high',
        expectLanguage: 'ta',
        expectLocation: 'Delhi',
        expectContact: '+919123456789'
    },
    {
        name: 'English shelter request',
        text: 'Families need shelter and blankets in Uttarakhand. Call 9090909090',
        expectRelevant: true,
        expectType: 'shelter',
        expectUrgency: 'low',
        expectLanguage: 'en',
        expectLocation: 'Uttarakhand',
        expectContact: '+919090909090'
    },
    {
        name: 'Non-relevant casual message',
        text: 'Happy birthday and see you tomorrow',
        expectRelevant: false
    }
];

function assertEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label}: expected "${expected}" but got "${actual}"`);
    }
}

async function runTests() {
    let passed = 0;

    for (const testCase of testCases) {
        const result = await parser.parseMessage(testCase.text, {
            groupName: 'Test Group',
            senderName: 'Test User',
            senderNumber: '+919999999999',
            timestamp: Math.floor(Date.now() / 1000)
        });

        assertEqual(result.isRelevant, testCase.expectRelevant, `${testCase.name} relevant`);

        if (testCase.expectRelevant) {
            assertEqual(result.requestType, testCase.expectType, `${testCase.name} requestType`);
            assertEqual(result.urgency, testCase.expectUrgency, `${testCase.name} urgency`);
            assertEqual(result.language, testCase.expectLanguage, `${testCase.name} language`);
            assertEqual(result.location, testCase.expectLocation, `${testCase.name} location`);
            assertEqual(result.contactNumber, testCase.expectContact, `${testCase.name} contact`);
        }

        console.log(`PASS: ${testCase.name}`);
        passed += 1;
    }

    console.log(`\n${passed}/${testCases.length} tests passed.`);
}

runTests().catch(error => {
    console.error(`TEST FAILURE: ${error.message}`);
    process.exitCode = 1;
});
