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
const statusNotice = document.getElementById("statusNotice");
const DATA_VERSION = "20260427-41";

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

function showNotice(message, tone = "info") {
    if (!statusNotice) {
        return;
    }

    statusNotice.textContent = message;
    statusNotice.className = `notice visible ${tone}`;
}

function clearNotice() {
    if (!statusNotice) {
        return;
    }

    statusNotice.textContent = "";
    statusNotice.className = "notice";
}

function normalizeWhatsAppNumber(value) {
    return String(value || "").replace(/\D/g, "");
}

function getLocationShareMessage(report, latitude, longitude) {
    const lat = Number(latitude).toFixed(6);
    const lng = Number(longitude).toFixed(6);
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`;
    const senderName = report?.source?.senderName || "Responder";
    const reportLocation = report?.primaryLocation || "reported area";

    return [
        `GPS location update from ${senderName}`,
        `For request: ${report?.reportId || "unknown"}`,
        `Reported area: ${reportLocation}`,
        `Current location: ${lat}, ${lng}`,
        `Map: ${mapUrl}`,
    ].join("\n");
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
        showNotice("Unable to read your location right now.", "error");
        return;
    }

    switch (error.code) {
        case error.PERMISSION_DENIED:
            showNotice("Location permission was denied. Allow location access and try again.", "error");
            break;
        case error.POSITION_UNAVAILABLE:
            showNotice("Location is unavailable on this device right now.", "error");
            break;
        case error.TIMEOUT:
            showNotice("Location request timed out. Please try again.", "error");
            break;
        default:
            showNotice("Unable to fetch your current location.", "error");
            break;
    }
}

function shareCurrentLocation(reportId) {
    const report = allReports.find(item => item.reportId === reportId);

    if (!report) {
        showNotice("Report could not be found for location sharing.", "error");
        return;
    }

    const contactNumber = normalizeWhatsAppNumber(report.primaryContact);

    if (!contactNumber) {
        showNotice("This report does not have a valid contact number for WhatsApp sharing.", "error");
        return;
    }

    if (!window.isSecureContext) {
        showNotice("GPS sharing needs a secure page. GitHub Pages should work over HTTPS.", "error");
        return;
    }

    if (!navigator.geolocation) {
        showNotice("This browser does not support GPS location access.", "error");
        return;
    }

    showNotice("Requesting your current GPS location...", "info");

    navigator.geolocation.getCurrentPosition(async position => {
        const message = getLocationShareMessage(
            report,
            position.coords.latitude,
            position.coords.longitude
        );
        const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`;
        const copied = await copyShareMessage(message);

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        showNotice(
            copied
                ? "WhatsApp draft opened and the GPS message was copied. Review it and press Send."
                : "WhatsApp draft opened. Review the GPS message and press Send.",
            "success"
        );
    }, handleLocationError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
    });
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
    clearNotice();

    if (reports.length === 0) {
        reportList.innerHTML = `<div class="empty">No sample reports match the current filters.</div>`;
        return;
    }

    reportList.innerHTML = reports.map(report => {
        const requestTypeBadges = getReportTypes(report)
            .map(type => `<span class="badge">${escapeHtml(formatRequestTypeLabel(type))}</span>`)
            .join("");
        const contactNumber = normalizeWhatsAppNumber(report.primaryContact);
        const canShareLocation = Boolean(contactNumber);
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
                    <div class="report-actions">
                        <div class="report-id">${escapeHtml(report.reportId)}</div>
                        <button class="location-share-btn" type="button" data-share-report-id="${escapeHtml(report.reportId)}" ${canShareLocation ? "" : "disabled"}>
                            Share My GPS
                        </button>
                    </div>
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

    document.querySelectorAll(".location-share-btn").forEach(button => {
        button.addEventListener("click", event => {
            const reportId = event.currentTarget.getAttribute("data-share-report-id");
            if (!reportId) {
                return;
            }
            shareCurrentLocation(reportId);
        });
    });
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
    showNotice("Showcase data failed to load. Please refresh and try again.", "error");
});
