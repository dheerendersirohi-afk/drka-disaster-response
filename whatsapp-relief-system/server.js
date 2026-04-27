import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const dataRoot = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : process.cwd();
const reportsDir = path.join(dataRoot, 'api-reports');

let reports = [];

app.use(express.json());

const DEFAULT_REQUEST_TYPES = [
    'food',
    'water',
    'shelter',
    'medical',
    'rescue',
    'transport',
    'clothing',
    'information',
    'general'
];

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function getTodayReportPath() {
    return path.join(reportsDir, `reports-${getTodayKey()}.json`);
}

async function ensureReportsDir() {
    await fs.mkdir(reportsDir, { recursive: true });
}

async function loadExistingReports() {
    await ensureReportsDir();

    const files = await fs.readdir(reportsDir);
    const reportFiles = files
        .filter(file => /^reports-\d{4}-\d{2}-\d{2}\.json$/.test(file))
        .sort()
        .reverse();

    if (reportFiles.length === 0) {
        reports = [];
        console.log('No existing report files found. Starting with an empty dashboard.');
        return;
    }

    const latestFile = path.join(reportsDir, reportFiles[0]);
    const content = await fs.readFile(latestFile, 'utf8');
    reports = JSON.parse(content.replace(/^\uFEFF/, ''));
    console.log(`Loaded ${reports.length} reports from ${latestFile}`);
}

async function saveReports() {
    await ensureReportsDir();
    await fs.writeFile(getTodayReportPath(), JSON.stringify(reports, null, 2), 'utf8');
}

function normalizeStringList(values, fallback = []) {
    if (Array.isArray(values)) {
        return values.filter(Boolean);
    }

    if (typeof values === 'string' && values.trim()) {
        return [values.trim()];
    }

    return fallback;
}

function uniqueRequestTypes(values = []) {
    return Array.from(
        new Set(
            values
                .map(value => String(value || '').trim().toLowerCase())
                .filter(Boolean)
        )
    );
}

function getReportRequestTypes(report) {
    const requestTypes = uniqueRequestTypes(
        Array.isArray(report?.allRequestTypes)
            ? report.allRequestTypes
            : [report?.requestType || 'general']
    );

    return requestTypes.length > 0 ? requestTypes : ['general'];
}

function hasRequestType(report, requestType) {
    return getReportRequestTypes(report).includes(requestType);
}

function sanitizeReport(report) {
    const requestTypes = getReportRequestTypes(report);

    return {
        ...report,
        reportId: report.reportId,
        requestType: requestTypes[0] || 'general',
        allRequestTypes: requestTypes,
        urgency: report.urgency || 'low',
        primaryLocation: report.primaryLocation || null,
        allLocations: normalizeStringList(report.allLocations, report.primaryLocation ? [report.primaryLocation] : []),
        primaryContact: report.primaryContact || null,
        allContacts: normalizeStringList(report.allContacts, report.primaryContact ? [report.primaryContact] : []),
        originalMessage: report.originalMessage || '',
        language: report.language || 'en',
        source: {
            platform: report.source?.platform || 'whatsapp',
            groupName: report.source?.groupName || 'Unknown Group',
            senderName: report.source?.senderName || 'Unknown',
            senderNumber: report.source?.senderNumber || 'Unknown'
        },
        messageTimestamp: report.messageTimestamp || new Date().toISOString(),
        processedTimestamp: report.processedTimestamp || new Date().toISOString(),
        status: report.status || 'pending',
        verified: Boolean(report.verified)
    };
}

app.post('/api/disaster-reports', async (req, res) => {
    try {
        const incoming = req.body;

        if (!incoming?.reportId || !incoming?.originalMessage || !incoming?.source?.groupName) {
            return res.status(400).json({
                success: false,
                error: 'Invalid report payload'
            });
        }

        const report = sanitizeReport(incoming);
        const existingIndex = reports.findIndex(item => item.reportId === report.reportId);

        if (existingIndex >= 0) {
            reports[existingIndex] = report;
        } else {
            reports.push(report);
        }

        await saveReports();

        console.log(`Stored report ${report.reportId} from ${report.source.groupName}`);

        return res.status(200).json({
            success: true,
            reportId: report.reportId
        });
    } catch (error) {
        console.error('Failed to store report:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/disaster-reports', (req, res) => {
    res.json({
        total: reports.length,
        reports
    });
});

app.get('/health', async (req, res) => {
    try {
        await ensureReportsDir();
        res.status(200).json({
            ok: true,
            host: HOST,
            port: PORT,
            reports: reports.length,
            reportsDir
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.delete('/api/disaster-reports/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const nextReports = reports.filter(report => report.reportId !== reportId);

        if (nextReports.length === reports.length) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        reports = nextReports;
        await saveReports();

        return res.json({
            success: true,
            message: 'Report deleted'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Disaster Response Dashboard</title>
    <style>
        :root {
            --bg-1: #0b1f3a;
            --bg-2: #144a7c;
            --panel: rgba(255, 255, 255, 0.96);
            --panel-soft: rgba(255, 255, 255, 0.88);
            --text: #18324d;
            --muted: #5f7387;
            --border: rgba(24, 50, 77, 0.12);
            --high: #c93c2d;
            --medium: #e49425;
            --low: #2f9d63;
            --accent: #2d6cdf;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 28%),
                linear-gradient(135deg, var(--bg-1), var(--bg-2));
            min-height: 100vh;
            padding: 28px;
        }

        .shell {
            max-width: 1380px;
            margin: 0 auto;
        }

        .panel {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 22px;
            box-shadow: 0 18px 50px rgba(8, 19, 36, 0.18);
        }

        .hero {
            padding: 30px 34px;
            margin-bottom: 20px;
        }

        .hero-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
            flex-wrap: wrap;
        }

        h1 {
            margin: 0 0 8px;
            font-size: 2rem;
            line-height: 1.1;
        }

        .subtitle,
        .last-update,
        .meta {
            color: var(--muted);
        }

        .controls {
            display: grid;
            grid-template-columns: auto auto auto 1fr;
            gap: 14px;
            padding: 18px;
            margin-bottom: 20px;
        }

        .notice {
            display: none;
            margin-bottom: 20px;
            padding: 14px 18px;
            border-radius: 16px;
            border: 1px solid transparent;
            font-weight: 600;
        }

        .notice.visible {
            display: block;
        }

        .notice.info {
            background: rgba(45, 108, 223, 0.12);
            border-color: rgba(45, 108, 223, 0.24);
            color: #1f4f9f;
        }

        .notice.success {
            background: rgba(47, 157, 99, 0.14);
            border-color: rgba(47, 157, 99, 0.26);
            color: #1f7348;
        }

        .notice.error {
            background: rgba(201, 60, 45, 0.14);
            border-color: rgba(201, 60, 45, 0.24);
            color: var(--high);
        }

        button,
        select,
        input {
            border-radius: 14px;
            border: 1px solid rgba(45, 108, 223, 0.16);
            font-size: 0.96rem;
        }

        button {
            border: none;
            background: linear-gradient(135deg, #4b7cff, #6f64f8);
            color: white;
            padding: 0 18px;
            font-weight: 700;
            cursor: pointer;
            min-height: 52px;
        }

        select,
        input {
            min-height: 52px;
            padding: 0 14px;
            background: white;
            color: var(--text);
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 18px;
            margin-bottom: 20px;
        }

        .stat-card {
            padding: 22px;
            min-height: 142px;
        }

        .stat-label {
            text-transform: uppercase;
            font-size: 0.78rem;
            letter-spacing: 0.06em;
            color: var(--muted);
            margin-bottom: 14px;
        }

        .stat-value {
            font-size: 3rem;
            font-weight: 800;
            line-height: 1;
            color: var(--accent);
        }

        .reports {
            padding: 24px;
        }

        .reports-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
        }

        .report-list {
            display: grid;
            gap: 16px;
        }

        .report-card {
            border-radius: 18px;
            padding: 18px 18px 16px;
            background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(249,252,255,0.98));
            border: 1px solid var(--border);
            border-left: 6px solid #c7d4e3;
        }

        .report-card.high { border-left-color: var(--high); }
        .report-card.medium { border-left-color: var(--medium); }
        .report-card.low { border-left-color: var(--low); }

        .report-top {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: center;
            margin-bottom: 14px;
            flex-wrap: wrap;
        }

        .badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            border-radius: 999px;
            padding: 0 12px;
            font-size: 0.74rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            background: #eef4fb;
            color: #34506d;
        }

        .badge.urgency-high { background: rgba(201, 60, 45, 0.14); color: var(--high); }
        .badge.urgency-medium { background: rgba(228, 148, 37, 0.16); color: #9d5b00; }
        .badge.urgency-low { background: rgba(47, 157, 99, 0.16); color: #1f7348; }

        .report-id {
            font-size: 0.78rem;
            color: var(--muted);
        }

        .report-actions {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .delete-btn {
            width: 38px;
            height: 38px;
            min-height: 38px;
            padding: 0;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff8f86, #ff5f7b);
        }

        .location-share-btn {
            min-height: 38px;
            padding: 0 14px;
            border-radius: 999px;
            background: linear-gradient(135deg, #1f9d68, #149e9b);
            font-size: 0.82rem;
            font-weight: 700;
        }

        .location-share-btn[disabled] {
            cursor: not-allowed;
            opacity: 0.55;
            background: linear-gradient(135deg, #7f90a3, #9ca8b5);
        }

        .details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
            margin-bottom: 14px;
        }

        .detail {
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--panel-soft);
            border: 1px solid rgba(24, 50, 77, 0.08);
        }

        .detail-label {
            font-size: 0.74rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--muted);
            margin-bottom: 6px;
        }

        .detail-value {
            font-weight: 700;
            word-break: break-word;
        }

        .message-box {
            background: white;
            border: 1px solid rgba(24, 50, 77, 0.08);
            border-radius: 14px;
            padding: 14px;
        }

        .message-text {
            line-height: 1.55;
            white-space: pre-wrap;
            color: #2f4356;
        }

        .empty {
            text-align: center;
            padding: 64px 16px;
            color: var(--muted);
        }

        @media (max-width: 900px) {
            body {
                padding: 16px;
            }

            .controls {
                grid-template-columns: 1fr;
            }

            .hero,
            .reports {
                padding: 20px;
            }

            .stat-value {
                font-size: 2.4rem;
            }
        }
    </style>
</head>
<body>
    <div class="shell">
        <section class="panel hero">
            <div class="hero-row">
                <div>
                    <h1>Disaster Response Dashboard</h1>
                    <div class="subtitle">Real-time monitoring of WhatsApp disaster requests</div>
                </div>
                <div class="last-update" id="lastUpdate">Last updated: never</div>
            </div>
        </section>

        <section class="panel controls">
            <button id="refreshBtn" type="button">Refresh</button>
            <select id="filterType">
                <option value="all">All Types</option>
            </select>
            <select id="filterUrgency">
                <option value="all">All Urgency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
            </select>
            <input id="searchBox" type="text" placeholder="Search location, contact, source, or message">
        </section>

        <div id="statusNotice" class="notice" role="status" aria-live="polite"></div>

        <section class="stats" id="statsGrid"></section>

        <section class="panel reports">
            <div class="reports-header">
                <h2>Recent Reports</h2>
                <div class="meta" id="reportCount">0 reports</div>
            </div>
            <div id="reportList" class="report-list"></div>
        </section>
    </div>

    <script>
        let allReports = [];
        const defaultRequestTypes = ${JSON.stringify(DEFAULT_REQUEST_TYPES)};

        const statsGrid = document.getElementById('statsGrid');
        const reportList = document.getElementById('reportList');
        const reportCount = document.getElementById('reportCount');
        const lastUpdate = document.getElementById('lastUpdate');
        const filterType = document.getElementById('filterType');
        const filterUrgency = document.getElementById('filterUrgency');
        const searchBox = document.getElementById('searchBox');
        const refreshBtn = document.getElementById('refreshBtn');
        const statusNotice = document.getElementById('statusNotice');

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatRequestTypeLabel(value) {
            return String(value)
                .replace(/_/g, ' ')
                .replace(/\\b\\w/g, letter => letter.toUpperCase());
        }

        function showNotice(message, tone = 'info') {
            statusNotice.textContent = message;
            statusNotice.className = 'notice visible ' + tone;
        }

        function clearNotice() {
            statusNotice.textContent = '';
            statusNotice.className = 'notice';
        }

        function normalizeWhatsAppNumber(value) {
            return String(value || '').replace(/\\D/g, '');
        }

        function getLocationShareMessage(report, latitude, longitude) {
            const lat = Number(latitude).toFixed(6);
            const lng = Number(longitude).toFixed(6);
            const mapUrl = 'https://maps.google.com/?q=' + encodeURIComponent(lat + ',' + lng);
            const senderName = report.source?.senderName || 'Responder';
            const reportLocation = report.primaryLocation || 'reported area';

            return [
                'GPS location update from ' + senderName,
                'For request: ' + report.reportId,
                'Reported area: ' + reportLocation,
                'Current location: ' + lat + ', ' + lng,
                'Map: ' + mapUrl
            ].join('\\n');
        }

        async function copyShareMessage(message) {
            if (!navigator.clipboard?.writeText) {
                return false;
            }

            try {
                await navigator.clipboard.writeText(message);
                return true;
            } catch (error) {
                return false;
            }
        }

        function handleLocationError(error) {
            if (!error) {
                showNotice('Unable to read your location right now.', 'error');
                return;
            }

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    showNotice('Location permission was denied. Allow location access and try again.', 'error');
                    break;
                case error.POSITION_UNAVAILABLE:
                    showNotice('Location is unavailable on this device right now.', 'error');
                    break;
                case error.TIMEOUT:
                    showNotice('Location request timed out. Please try again.', 'error');
                    break;
                default:
                    showNotice('Unable to fetch your current location.', 'error');
                    break;
            }
        }

        function shareCurrentLocation(reportId) {
            const report = allReports.find(item => item.reportId === reportId);

            if (!report) {
                showNotice('Report could not be found for location sharing.', 'error');
                return;
            }

            const contactNumber = normalizeWhatsAppNumber(report.primaryContact);

            if (!contactNumber) {
                showNotice('This report does not have a valid contact number for WhatsApp sharing.', 'error');
                return;
            }

            if (!window.isSecureContext) {
                showNotice('GPS sharing needs a secure page. Localhost usually works, but public deployment should use HTTPS.', 'error');
                return;
            }

            if (!navigator.geolocation) {
                showNotice('This browser does not support GPS location access.', 'error');
                return;
            }

            showNotice('Requesting your current GPS location...', 'info');

            navigator.geolocation.getCurrentPosition(async position => {
                const message = getLocationShareMessage(
                    report,
                    position.coords.latitude,
                    position.coords.longitude
                );
                const whatsappUrl = 'https://wa.me/' + contactNumber + '?text=' + encodeURIComponent(message);
                const copied = await copyShareMessage(message);

                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

                showNotice(
                    copied
                        ? 'WhatsApp draft opened and the GPS message was copied. Review it and press Send.'
                        : 'WhatsApp draft opened. Review the GPS message and press Send.',
                    'success'
                );
            }, handleLocationError, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            });
        }

        function getReportTypes(report) {
            const rawTypes = Array.isArray(report?.allRequestTypes) && report.allRequestTypes.length > 0
                ? report.allRequestTypes
                : [report?.requestType || 'general'];

            const normalizedTypes = rawTypes
                .map(type => String(type || '').trim().toLowerCase())
                .filter(Boolean);

            return Array.from(new Set(normalizedTypes.length > 0 ? normalizedTypes : ['general']));
        }

        function hasRequestType(report, requestType) {
            return getReportTypes(report).includes(requestType);
        }

        function getTypeOptions() {
            const discoveredTypes = new Set();

            allReports.forEach(report => {
                getReportTypes(report).forEach(type => discoveredTypes.add(type));
            });

            const extraTypes = Array.from(discoveredTypes)
                .filter(type => !defaultRequestTypes.includes(type))
                .sort((left, right) => left.localeCompare(right));

            return ['all', ...defaultRequestTypes, ...extraTypes];
        }

        function renderTypeOptions() {
            const currentValue = filterType.value || 'all';
            const options = getTypeOptions();

            filterType.innerHTML = options
                .map(type => {
                    const label = type === 'all' ? 'All Types' : formatRequestTypeLabel(type);
                    return '<option value="' + escapeHtml(type) + '">' + escapeHtml(label) + '</option>';
                })
                .join('');

            filterType.value = options.includes(currentValue) ? currentValue : 'all';
        }

        function renderStats(reports) {
            const stats = [
                ['Total Reports', reports.length],
                ['High Urgency', reports.filter(report => report.urgency === 'high').length],
                ['Pending', reports.filter(report => report.status === 'pending').length],
                ['Food Requests', reports.filter(report => hasRequestType(report, 'food')).length],
                ['Shelter Requests', reports.filter(report => hasRequestType(report, 'shelter')).length],
                ['Rescue Requests', reports.filter(report => hasRequestType(report, 'rescue')).length]
            ];

            statsGrid.innerHTML = stats
                .map(([label, value]) => {
                    return '<section class="panel stat-card">' +
                        '<div class="stat-label">' + escapeHtml(label) + '</div>' +
                        '<div class="stat-value">' + escapeHtml(value) + '</div>' +
                    '</section>';
                })
                .join('');
        }

        function getFilteredReports() {
            const selectedType = filterType.value;
            const selectedUrgency = filterUrgency.value;
            const search = searchBox.value.trim().toLowerCase();

            return allReports.filter(report => {
                const matchesType = selectedType === 'all' || hasRequestType(report, selectedType);
                const matchesUrgency = selectedUrgency === 'all' || report.urgency === selectedUrgency;
                const haystack = [
                    report.primaryLocation || '',
                    report.primaryContact || '',
                    report.originalMessage || '',
                    report.source?.groupName || '',
                    report.source?.senderName || ''
                ].join(' ').toLowerCase();
                const matchesSearch = !search || haystack.includes(search);
                return matchesType && matchesUrgency && matchesSearch;
            });
        }

        function renderReports() {
            const reports = getFilteredReports().slice().reverse();
            reportCount.textContent = reports.length + ' report' + (reports.length === 1 ? '' : 's');

            if (reports.length === 0) {
                reportList.innerHTML = '<div class="empty">No reports match the current filters.</div>';
                return;
            }

            reportList.innerHTML = reports.map(report => {
                const requestTypeBadges = getReportTypes(report)
                    .map(type => '<span class="badge">' + escapeHtml(formatRequestTypeLabel(type)) + '</span>')
                    .join('');
                const contactNumber = normalizeWhatsAppNumber(report.primaryContact);
                const canShareLocation = Boolean(contactNumber);

                return '<article class="report-card ' + escapeHtml(report.urgency) + '">' +
                    '<div class="report-top">' +
                        '<div class="badges">' +
                            requestTypeBadges +
                            '<span class="badge urgency-' + escapeHtml(report.urgency) + '">' + escapeHtml(report.urgency) + ' urgency</span>' +
                        '</div>' +
                        '<div class="report-actions">' +
                            '<span class="report-id">' + escapeHtml(report.reportId) + '</span>' +
                            '<button class="location-share-btn" type="button" data-share-report-id="' + escapeHtml(report.reportId) + '"' + (canShareLocation ? '' : ' disabled') + '>Share My GPS</button>' +
                            '<button class="delete-btn" type="button" data-report-id="' + escapeHtml(report.reportId) + '">X</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="details">' +
                        '<div class="detail"><div class="detail-label">Location</div><div class="detail-value">' + escapeHtml(report.primaryLocation || 'Not specified') + '</div></div>' +
                        '<div class="detail"><div class="detail-label">Contact</div><div class="detail-value">' + escapeHtml(report.primaryContact || 'Not specified') + '</div></div>' +
                        '<div class="detail"><div class="detail-label">Reporter</div><div class="detail-value">' + escapeHtml(report.source?.senderName || 'Unknown') + '</div></div>' +
                        '<div class="detail"><div class="detail-label">Source</div><div class="detail-value">' + escapeHtml(report.source?.groupName || 'Unknown Group') + '</div></div>' +
                    '</div>' +
                    '<div class="message-box">' +
                        '<div class="detail-label">Original Message</div>' +
                        '<div class="message-text">' + escapeHtml(report.originalMessage || '') + '</div>' +
                    '</div>' +
                    '<div class="meta" style="margin-top: 12px; text-align: right;">' + escapeHtml(new Date(report.messageTimestamp).toLocaleString()) + '</div>' +
                '</article>';
            }).join('');

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async event => {
                    const reportId = event.currentTarget.getAttribute('data-report-id');
                    if (!confirm('Delete this report?')) {
                        return;
                    }

                    const response = await fetch('/api/disaster-reports/' + encodeURIComponent(reportId), {
                        method: 'DELETE'
                    });
                    const result = await response.json();

                    if (!result.success) {
                        alert(result.message || 'Delete failed');
                        return;
                    }

                    await loadReports();
                });
            });

            document.querySelectorAll('.location-share-btn').forEach(button => {
                button.addEventListener('click', event => {
                    const reportId = event.currentTarget.getAttribute('data-share-report-id');
                    if (!reportId) {
                        return;
                    }
                    shareCurrentLocation(reportId);
                });
            });
        }

        async function loadReports() {
            try {
                clearNotice();
                const response = await fetch('/api/disaster-reports');
                const data = await response.json();
                allReports = Array.isArray(data.reports) ? data.reports : [];
                renderTypeOptions();
                renderStats(allReports);
                renderReports();
                lastUpdate.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
            } catch (error) {
                reportList.innerHTML = '<div class="empty">Failed to load reports: ' + escapeHtml(error.message) + '</div>';
            }
        }

        refreshBtn.addEventListener('click', loadReports);
        filterType.addEventListener('change', renderReports);
        filterUrgency.addEventListener('change', renderReports);
        searchBox.addEventListener('input', renderReports);

        loadReports();
        setInterval(loadReports, 5000);
    </script>
</body>
</html>`);
});

await loadExistingReports();

app.listen(PORT, HOST, () => {
    console.log(`Disaster Response server running on ${HOST}:${PORT}`);
    console.log(`Dashboard: http://${HOST}:${PORT}`);
    console.log(`API: http://${HOST}:${PORT}/api/disaster-reports`);
    console.log(`Health: http://${HOST}:${PORT}/health`);
    console.log(`Data directory: ${reportsDir}`);
});
