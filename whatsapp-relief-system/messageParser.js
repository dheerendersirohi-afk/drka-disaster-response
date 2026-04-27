const REQUEST_KEYWORDS = {
    food: [
        'food', 'meal', 'hungry', 'rice', 'ration', 'dry ration',
        '\u0916\u093e\u0928\u093e', '\u092d\u094b\u091c\u0928', '\u0930\u093e\u0936\u0928',
        '\u0b89\u0ba3\u0bb5\u0bc1', '\u0b9a\u0bbe\u0baa\u0bcd\u0baa\u0bbe\u0b9f\u0bc1', '\u0b85\u0bb0\u0bbf\u0b9a\u0bbf'
    ],
    water: [
        'water', 'drinking water', 'clean water',
        '\u092a\u093e\u0928\u0940', '\u092a\u0940\u0928\u0947 \u0915\u093e \u092a\u093e\u0928\u0940',
        '\u0ba4\u0ba3\u0bcd\u0ba3\u0bc0\u0bb0\u0bcd', '\u0b95\u0bc1\u0b9f\u0bbf\u0ba8\u0bc0\u0bb0\u0bcd'
    ],
    shelter: [
        'shelter', 'accommodation', 'place to stay', 'room', 'camp',
        '\u0906\u0936\u094d\u0930\u092f', '\u0930\u0939\u0928\u0947 \u0915\u0940 \u091c\u0917\u0939', '\u0936\u0930\u0923',
        '\u0ba4\u0b99\u0bcd\u0b95\u0bc1\u0bae\u0bbf\u0b9f\u0bae\u0bcd', '\u0ba4\u0b99\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0b87\u0b9f\u0bae\u0bcd'
    ],
    medical: [
        'medical', 'medicine', 'doctor', 'hospital', 'injured', 'sick',
        '\u0926\u0935\u093e\u0908', '\u0921\u0949\u0915\u094d\u091f\u0930', '\u0905\u0938\u094d\u092a\u0924\u093e\u0932', '\u091a\u093f\u0915\u093f\u0924\u094d\u0938\u093e',
        '\u0bae\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0bb5', '\u0bae\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1', '\u0bae\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0bb5\u0bb0\u0bcd'
    ],
    rescue: [
        'rescue', 'help', 'emergency', 'stuck', 'trapped', 'stranded', 'missing', 'boat',
        '\u092e\u0926\u0926', '\u092b\u0902\u0938\u0947', '\u0906\u092a\u093e\u0924\u0915\u093e\u0932', '\u092c\u091a\u093e\u090f\u0902',
        '\u0bae\u0bc0\u0b9f\u0bcd\u0baa\u0bc1', '\u0b89\u0ba4\u0bb5\u0bbf', '\u0b9a\u0bbf\u0b95\u0bcd\u0b95\u0bbf\u0baf\u0bc1\u0bb3\u0bcd\u0bb3\u0ba9\u0bb0\u0bcd'
    ],
    transport: [
        'transport', 'vehicle', 'ride', 'evacuation', 'boat',
        '\u0935\u093e\u0939\u0928', '\u092f\u093e\u0924\u093e\u092f\u093e\u0924', '\u0928\u093f\u0915\u093e\u0938\u0940',
        '\u0baa\u0bcb\u0b95\u0bcd\u0b95\u0bc1\u0bb5\u0bb0\u0ba4\u0bcd\u0ba4\u0bc1', '\u0bb5\u0bbe\u0b95\u0ba9\u0bae\u0bcd', '\u0baa\u0b9f\u0b95\u0bc1'
    ],
    clothing: [
        'clothes', 'clothing', 'dress', 'blanket', 'wear',
        '\u0915\u092a\u0921\u093c\u0947', '\u0915\u092e\u094d\u092c\u0932',
        '\u0b89\u0b9f\u0bc8', '\u0b86\u0b9f\u0bc8', '\u0baa\u0bbf\u0bb3\u0bbe\u0b99\u0bcd\u0b95\u0bc6\u0b9f\u0bcd'
    ],
    information: [
        'information', 'contact', 'phone', 'call', 'reach', 'number',
        '\u091c\u093e\u0928\u0915\u093e\u0930\u0940', '\u0938\u0902\u092a\u0930\u094d\u0915', '\u092b\u094b\u0928', '\u0928\u0902\u092c\u0930',
        '\u0ba4\u0b95\u0bb5\u0bb2\u0bcd', '\u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1', '\u0b8e\u0ba3\u0bcd'
    ]
};

const URGENCY_KEYWORDS = {
    high: [
        'urgent', 'emergency', 'critical', 'immediately', 'asap',
        '\u0924\u0941\u0930\u0902\u0924', '\u091c\u0930\u0942\u0930\u0940', '\u0906\u092a\u093e\u0924\u0915\u093e\u0932',
        '\u0b85\u0bb5\u0b9a\u0bb0\u0bae\u0bcd', '\u0b85\u0bb5\u0b9a\u0bb0\u0bae\u0bbe\u0b95', '\u0b89\u0b9f\u0ba9\u0bc7'
    ],
    medium: [
        'needed', 'required', 'soon',
        '\u091a\u093e\u0939\u093f\u090f', '\u091c\u0930\u0942\u0930\u0924',
        '\u0ba4\u0bc7\u0bb5\u0bc8', '\u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd'
    ]
};

const LOCATIONS = [
    // States
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal',

    // Union territories
    'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',

    // Common aliases
    'New Delhi', 'Jammu', 'Kashmir', 'Leh', 'Pondicherry', 'Bangalore',
    'Bombay', 'Calcutta', 'Orissa',

    // Major cities and capitals
    'Itanagar', 'Dispur', 'Patna', 'Raipur', 'Panaji', 'Gandhinagar',
    'Chandigarh', 'Shimla', 'Ranchi', 'Bengaluru', 'Thiruvananthapuram',
    'Bhopal', 'Mumbai', 'Imphal', 'Shillong', 'Aizawl', 'Kohima',
    'Bhubaneswar', 'Jaipur', 'Gangtok', 'Chennai', 'Hyderabad',
    'Agartala', 'Lucknow', 'Dehradun', 'Kolkata', 'Srinagar',
    'Jammu', 'Leh', 'Kavaratti', 'Puducherry',

    // Large and operationally important cities
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool',
    'Tirupati', 'Rajahmundry', 'Kakinada', 'Anantapur', 'Kadapa',
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur',
    'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Purnia',
    'Bilaspur', 'Durg', 'Bhilai', 'Korba', 'Jagdalpur',
    'Margao', 'Vasco da Gama',
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Faridabad', 'Gurugram', 'Hisar', 'Panipat', 'Ambala',
    'Dharamshala', 'Mandi', 'Solan',
    'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh',
    'Mysuru', 'Mangalore', 'Hubballi', 'Belagavi', 'Shivamogga',
    'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Kannur',
    'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa',
    'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Kolhapur',
    'Nanded', 'Solapur',
    'Aizawl', 'Lunglei',
    'Dimapur', 'Mokokchung',
    'Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda',
    'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar',
    'Salem', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Tirunelveli',
    'Vellore', 'Erode', 'Thoothukudi',
    'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
    'Agra', 'Kanpur', 'Varanasi', 'Prayagraj', 'Noida', 'Ghaziabad',
    'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur',
    'Saharanpur', 'Jhansi', 'Ayodhya',
    'Haridwar', 'Rishikesh', 'Roorkee', 'Haldwani', 'Nainital',
    'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Darjeeling',

    // Disaster-response coverage extras
    'Cuttack', 'Puri', 'Balasore', 'Sambalpur', 'Rourkela',
    'Anantnag', 'Baramulla', 'Kupwara', 'Pulwama', 'Udhampur',
    'Kargil', 'Tawang', 'Port Blair'
];

const PHONE_PATTERN = /(?:\+91|0)?[6-9]\d{9}/g;
const DEVANAGARI_PATTERN = /[\u0900-\u097F]/;
const TAMIL_PATTERN = /[\u0B80-\u0BFF]/;

function normalizeText(text) {
    return String(text || '').toLowerCase();
}

function includesKeyword(text, keyword) {
    return normalizeText(text).includes(keyword.toLowerCase());
}

function normalizePhoneNumber(number) {
    const digits = String(number).replace(/\D/g, '');

    if (digits.startsWith('91') && digits.length === 12) {
        return `+${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('0')) {
        return `+91${digits.slice(1)}`;
    }

    if (digits.length === 10) {
        return `+91${digits}`;
    }

    return `+${digits}`;
}

export class MessageParser {
    detectLanguage(text) {
        if (DEVANAGARI_PATTERN.test(text)) {
            return 'hi';
        }

        if (TAMIL_PATTERN.test(text)) {
            return 'ta';
        }

        return 'en';
    }

    detectRequestTypes(text) {
        const detected = [];

        for (const [type, keywords] of Object.entries(REQUEST_KEYWORDS)) {
            if (keywords.some(keyword => includesKeyword(text, keyword))) {
                detected.push(type);
            }
        }

        return detected;
    }

    detectUrgency(text) {
        if (URGENCY_KEYWORDS.high.some(keyword => includesKeyword(text, keyword))) {
            return 'high';
        }

        if (URGENCY_KEYWORDS.medium.some(keyword => includesKeyword(text, keyword))) {
            return 'medium';
        }

        return 'low';
    }

    extractLocations(text) {
        const detected = new Set();
        const lowered = normalizeText(text);
        const orderedLocations = [...LOCATIONS].sort((a, b) => b.length - a.length);

        for (const location of orderedLocations) {
            if (lowered.includes(location.toLowerCase())) {
                detected.add(location);
            }
        }

        return Array.from(detected);
    }

    extractPhoneNumbers(text) {
        const matches = String(text || '').match(PHONE_PATTERN) || [];
        return Array.from(new Set(matches.map(normalizePhoneNumber)));
    }

    isRelevantMessage(text) {
        const requestTypes = this.detectRequestTypes(text);
        const phoneNumbers = this.extractPhoneNumbers(text);
        const locations = this.extractLocations(text);
        const urgency = this.detectUrgency(text);

        return (
            requestTypes.length > 0 ||
            (phoneNumbers.length > 0 && locations.length > 0) ||
            (phoneNumbers.length > 0 && urgency === 'high')
        );
    }

    async parseMessage(messageText, metadata = {}) {
        const requestTypes = this.detectRequestTypes(messageText);
        const phoneNumbers = this.extractPhoneNumbers(messageText);
        const locations = this.extractLocations(messageText);
        const urgency = this.detectUrgency(messageText);
        const language = this.detectLanguage(messageText);
        const isRelevant = this.isRelevantMessage(messageText);

        if (!isRelevant) {
            return { isRelevant: false };
        }

        return {
            isRelevant: true,
            requestType: requestTypes[0] || 'general',
            allRequestTypes: requestTypes.length > 0 ? requestTypes : ['general'],
            urgency,
            location: locations[0] || null,
            allLocations: locations,
            contactNumber: phoneNumbers[0] || null,
            allContactNumbers: phoneNumbers,
            originalMessage: messageText,
            groupName: metadata.groupName || 'Unknown Group',
            senderName: metadata.senderName || 'Unknown',
            senderNumber: metadata.senderNumber || 'Unknown',
            timestamp: metadata.timestamp ? metadata.timestamp * 1000 : Date.now(),
            parsedAt: Date.now(),
            language
        };
    }
}
