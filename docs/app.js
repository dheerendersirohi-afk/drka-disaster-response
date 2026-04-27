const DEFAULT_REQUEST_TYPES = [
    "food",
    "water",
    "shelter",
    "medical",
    "rescue",
    "transport",
    "clothing",
    "information",
    "general",
];

const statsGrid = document.getElementById("statsGrid");
const reportList = document.getElementById("reportList");
const reportCount = document.getElementById("reportCount");
const filterType = document.getElementById("filterType");
const filterUrgency = document.getElementById("filterUrgency");
const searchBox = document.getElementById("searchBox");
const DATA_VERSION = "20260427-40";

let allReports = [];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatRequestTypeLabel(value) {
    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getReportTypes(report) {
    const rawTypes = Array.isArray(report?.allRequestTypes) && report.allRequestTypes.length > 0
        ? report.allRequestTypes
        : [report?.requestType || "general"];

    const normalized = rawTypes
        .map(type => String(type || "").trim().toLowerCase())
        .filter(Boolean);

    return Array.from(new Set(normalized.length > 0 ? normalized : ["general"]));
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
        .filter(type => !DEFAULT_REQUEST_TYPES.includes(type))
        .sort((left, right) => left.localeCompare(right));

    return ["all", ...DEFAULT_REQUEST_TYPES, ...extraTypes];
}

function renderTypeOptions() {
    const currentValue = filterType.value || "all";
    const options = getTypeOptions();

    filterType.innerHTML = options
        .map(type => {
            const label = type === "all" ? "All Types" : formatRequestTypeLabel(type);
            return `<option value="${escapeHtml(type)}">${escapeHtml(label)}</option>`;
        })
        .join("");

    filterType.value = options.includes(currentValue) ? currentValue : "all";
}

function renderStats(reports) {
    const stats = [
        ["Total Reports", reports.length],
        ["High Urgency", reports.filter(report => report.urgency === "high").length],
        ["Pending", reports.filter(report => report.status === "pending").length],
        ["Food Requests", reports.filter(report => hasRequestType(report, "food")).length],
        ["Shelter Requests", reports.filter(report => hasRequestType(report, "shelter")).length],
        ["Rescue Requests", reports.filter(report => hasRequestType(report, "rescue")).length],
    ];

    statsGrid.innerHTML = stats.map(([label, value]) => `
        <section class="panel stat-card">
            <div class="stat-label">${escapeHtml(label)}</div>
            <div class="stat-value">${escapeHtml(value)}</div>
        </section>
    `).join("");
}

function getFilteredReports() {
    const selectedType = filterType.value;
    const selectedUrgency = filterUrgency.value;
    const search = searchBox.value.trim().toLowerCase();

    return allReports.filter(report => {
        const matchesType = selectedType === "all" || hasRequestType(report, selectedType);
        const matchesUrgency = selectedUrgency === "all" || report.urgency === selectedUrgency;
        const haystack = [
            report.primaryLocation || "",
            report.primaryContact || "",
            report.originalMessage || "",
            report.source?.groupName || "",
            report.source?.senderName || "",
        ].join(" ").toLowerCase();
        const matchesSearch = !search || haystack.includes(search);

        return matchesType && matchesUrgency && matchesSearch;
    });
}

function renderReports() {
    const reports = getFilteredReports().slice().reverse();
    reportCount.textContent = `${reports.length} report${reports.length === 1 ? "" : "s"}`;

    if (reports.length === 0) {
        reportList.innerHTML = `<div class="empty">No sample reports match the current filters.</div>`;
        return;
    }

    reportList.innerHTML = reports.map(report => {
        const requestTypeBadges = getReportTypes(report)
            .map(type => `<span class="badge">${escapeHtml(formatRequestTypeLabel(type))}</span>`)
            .join("");

        const timestamp = report.messageTimestamp
            ? new Date(report.messageTimestamp).toLocaleString()
            : "Unknown time";

        return `
            <article class="report-card ${escapeHtml(report.urgency)}">
                <div class="report-top">
                    <div class="badge-row">
                        ${requestTypeBadges}
                        <span class="badge urgency-${escapeHtml(report.urgency)}">${escapeHtml(report.urgency)} urgency</span>
                    </div>
                    <div class="report-id">${escapeHtml(report.reportId)}</div>
                </div>
                <div class="report-grid">
                    <div class="detail">
                        <div class="detail-label">Location</div>
                        <div class="detail-value">${escapeHtml(report.primaryLocation || "Not specified")}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-label">Contact</div>
                        <div class="detail-value">${escapeHtml(report.primaryContact || "Not specified")}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-label">Reporter</div>
                        <div class="detail-value">${escapeHtml(report.source?.senderName || "Unknown")}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-label">Source</div>
                        <div class="detail-value">${escapeHtml(report.source?.groupName || "Unknown Group")}</div>
                    </div>
                </div>
                <div class="message-box">
                    <div class="detail-label">Original Message</div>
                    <div class="message-text">${escapeHtml(report.originalMessage || "")}</div>
                </div>
                <div class="report-meta">${escapeHtml(timestamp)}</div>
            </article>
        `;
    }).join("");
}

async function loadReports() {
    const response = await fetch(`./sample-reports.json?v=${DATA_VERSION}`, { cache: "no-store" });
    allReports = await response.json();
    renderTypeOptions();
    renderStats(allReports);
    renderReports();
}

filterType.addEventListener("change", renderReports);
filterUrgency.addEventListener("change", renderReports);
searchBox.addEventListener("input", renderReports);

loadReports().catch(error => {
    reportList.innerHTML = `<div class="empty">Failed to load showcase data: ${escapeHtml(error.message)}</div>`;
});
