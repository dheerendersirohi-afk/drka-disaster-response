from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import requests
import streamlit as st


PROJECT_ROOT = Path(__file__).resolve().parent
RELIEF_ROOT = PROJECT_ROOT / "whatsapp-relief-system"
API_REPORTS_DIR = RELIEF_ROOT / "api-reports"
REPORT_API_URL = "http://localhost:3000/api/disaster-reports"
DEFAULT_REQUEST_TYPES = [
    "food",
    "water",
    "shelter",
    "medical",
    "rescue",
    "transport",
    "clothing",
    "information",
    "general",
]


def _safe_rerun():
    if hasattr(st, "rerun"):
        st.rerun()
    else:
        st.experimental_rerun()


def _dashboard_styles():
    st.markdown(
        """
        <style>
        .dashboard-shell {
            margin-top: 0.35rem;
        }
        .dashboard-hero {
            border: 1px solid #2a355c;
            border-radius: 18px;
            padding: 1rem 1.1rem;
            background: linear-gradient(180deg, #172041 0%, #121a34 100%);
            margin-bottom: 0.9rem;
        }
        .dashboard-hero h3 {
            margin: 0 0 0.2rem 0;
            color: #e9edff;
            font-size: 1.08rem;
        }
        .dashboard-hero p {
            margin: 0;
            color: #a6b0d8;
            font-size: 0.92rem;
        }
        .dash-card {
            border: 1px solid #2a355c;
            border-radius: 16px;
            background: rgba(20, 27, 52, 0.92);
            padding: 0.95rem 1rem;
            min-height: 108px;
        }
        .dash-card-label {
            color: #a6b0d8;
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 0.55rem;
        }
        .dash-card-value {
            color: #e9edff;
            font-size: 2rem;
            font-weight: 700;
            line-height: 1;
        }
        .report-shell {
            border: 1px solid #2a355c;
            border-left: 4px solid #33518f;
            border-radius: 16px;
            background: rgba(20, 27, 52, 0.92);
            padding: 1rem;
            margin-bottom: 0.85rem;
        }
        .report-shell.high {
            border-left-color: #ff6b6b;
        }
        .report-shell.medium {
            border-left-color: #ffb454;
        }
        .report-shell.low {
            border-left-color: #63d2b0;
        }
        .report-top {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            align-items: center;
            margin-bottom: 0.7rem;
        }
        .badge-row {
            display: flex;
            gap: 0.45rem;
            flex-wrap: wrap;
        }
        .badge-pill {
            display: inline-block;
            border-radius: 999px;
            padding: 0.28rem 0.7rem;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(97, 169, 255, 0.16);
            color: #bfd1ff;
            border: 1px solid rgba(97, 169, 255, 0.24);
        }
        .badge-pill.high {
            color: #ffd7d7;
            background: rgba(255, 107, 107, 0.18);
            border-color: rgba(255, 107, 107, 0.28);
        }
        .badge-pill.medium {
            color: #ffe2b8;
            background: rgba(255, 180, 84, 0.18);
            border-color: rgba(255, 180, 84, 0.28);
        }
        .badge-pill.low {
            color: #cff4e9;
            background: rgba(99, 210, 176, 0.16);
            border-color: rgba(99, 210, 176, 0.26);
        }
        .report-id {
            color: #a6b0d8;
            font-size: 0.78rem;
        }
        .report-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 0.7rem;
            margin-bottom: 0.85rem;
        }
        .report-cell {
            border: 1px solid #243056;
            border-radius: 12px;
            background: rgba(26, 35, 66, 0.9);
            padding: 0.7rem 0.78rem;
        }
        .report-cell-label {
            color: #a6b0d8;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 0.28rem;
        }
        .report-cell-value {
            color: #e9edff;
            font-size: 0.92rem;
            font-weight: 600;
            word-break: break-word;
        }
        .message-box {
            border: 1px solid #243056;
            border-radius: 12px;
            background: rgba(26, 35, 66, 0.9);
            padding: 0.8rem;
        }
        .message-box .label {
            color: #a6b0d8;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 0.35rem;
        }
        .message-box .text {
            color: #e9edff;
            font-size: 0.92rem;
            line-height: 1.5;
            white-space: pre-wrap;
        }
        .report-meta {
            color: #a6b0d8;
            font-size: 0.76rem;
            margin-top: 0.7rem;
            text-align: right;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _latest_report_file() -> Path | None:
    if not API_REPORTS_DIR.exists():
        return None
    files = sorted(API_REPORTS_DIR.glob("reports-*.json"))
    return files[-1] if files else None


def _normalize_request_types(values: list[str] | None) -> list[str]:
    normalized: list[str] = []

    for value in values or []:
        cleaned = str(value or "").strip().lower()
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)

    return normalized or ["general"]


def _get_report_request_types(report: dict) -> list[str]:
    raw_types = report.get("allRequestTypes") or [report.get("requestType", "general")]
    return _normalize_request_types(raw_types)


def _has_request_type(report: dict, request_type: str) -> bool:
    return request_type in _get_report_request_types(report)


def _format_request_type_label(value: str) -> str:
    return value.replace("_", " ").title()


def _get_request_type_options(reports: list[dict]) -> list[str]:
    discovered = {
        request_type
        for report in reports
        for request_type in _get_report_request_types(report)
    }
    extra_types = sorted(discovered.difference(DEFAULT_REQUEST_TYPES))
    return ["all", *DEFAULT_REQUEST_TYPES, *extra_types]


def _normalize_report(report: dict) -> dict:
    request_types = _normalize_request_types(
        report.get("allRequestTypes") or [report.get("requestType", "general")]
    )

    return {
        "reportId": report.get("reportId", "unknown"),
        "requestType": request_types[0],
        "allRequestTypes": request_types,
        "urgency": report.get("urgency", "low"),
        "primaryLocation": report.get("primaryLocation"),
        "allLocations": report.get("allLocations") or [],
        "primaryContact": report.get("primaryContact"),
        "allContacts": report.get("allContacts") or [],
        "originalMessage": report.get("originalMessage", ""),
        "language": report.get("language", "en"),
        "source": report.get("source")
        or {
            "platform": "whatsapp",
            "groupName": "Unknown Group",
            "senderName": "Unknown",
            "senderNumber": "Unknown",
        },
        "messageTimestamp": report.get("messageTimestamp"),
        "processedTimestamp": report.get("processedTimestamp"),
        "status": report.get("status", "pending"),
        "verified": bool(report.get("verified", False)),
    }


def _load_from_api():
    response = requests.get(REPORT_API_URL, timeout=2)
    response.raise_for_status()
    payload = response.json()
    reports = [_normalize_report(item) for item in payload.get("reports", [])]
    return reports, {
        "source": "Live API",
        "path": None,
        "updated_at": datetime.now(),
    }


def _load_from_file():
    report_file = _latest_report_file()
    if report_file is None:
        return [], {
            "source": "No data",
            "path": None,
            "updated_at": None,
        }

    reports = json.loads(report_file.read_text(encoding="utf-8-sig"))
    return [_normalize_report(item) for item in reports], {
        "source": "Saved file",
        "path": report_file,
        "updated_at": datetime.fromtimestamp(report_file.stat().st_mtime),
    }


def load_relief_reports():
    try:
        return _load_from_api()
    except Exception:
        return _load_from_file()


def _save_reports_to_file(report_file: Path, reports: list[dict]):
    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(json.dumps(reports, indent=2), encoding="utf-8")


def delete_report(report_id: str, meta: dict):
    try:
        if meta.get("source") == "Live API":
            response = requests.delete(f"{REPORT_API_URL}/{report_id}", timeout=2)
            response.raise_for_status()
            return True, "Report deleted."

        report_file = meta.get("path")
        if not report_file:
            return False, "No report file available."

        reports = json.loads(Path(report_file).read_text(encoding="utf-8-sig"))
        filtered = [report for report in reports if report.get("reportId") != report_id]
        if len(filtered) == len(reports):
            return False, "Report not found."

        _save_reports_to_file(Path(report_file), filtered)
        return True, "Report deleted from saved file."
    except Exception as exc:
        return False, f"Delete failed: {exc}"


def _filter_reports(reports: list[dict], request_type: str, urgency: str, search_term: str):
    lowered_search = search_term.strip().lower()
    filtered = []

    for report in reports:
        if request_type != "all" and not _has_request_type(report, request_type):
            continue
        if urgency != "all" and report["urgency"] != urgency:
            continue

        haystack = " ".join(
            [
                report.get("primaryLocation") or "",
                report.get("primaryContact") or "",
                report.get("originalMessage") or "",
                report.get("source", {}).get("groupName", ""),
                report.get("source", {}).get("senderName", ""),
            ]
        ).lower()
        if lowered_search and lowered_search not in haystack:
            continue

        filtered.append(report)

    return filtered


def _render_stat_cards(reports: list[dict]):
    stats = [
        ("Total Reports", len(reports)),
        ("High Urgency", sum(1 for report in reports if report["urgency"] == "high")),
        ("Pending", sum(1 for report in reports if report["status"] == "pending")),
        ("Food Requests", sum(1 for report in reports if _has_request_type(report, "food"))),
        ("Medical Requests", sum(1 for report in reports if _has_request_type(report, "medical"))),
        ("Rescue Requests", sum(1 for report in reports if _has_request_type(report, "rescue"))),
    ]

    columns = st.columns(len(stats))
    for column, (label, value) in zip(columns, stats):
        with column:
            st.markdown(
                f"<div class='dash-card'>"
                f"<div class='dash-card-label'>{label}</div>"
                f"<div class='dash-card-value'>{value}</div>"
                f"</div>",
                unsafe_allow_html=True,
            )


def _render_report_card(report: dict, meta: dict, index: int):
    header_col, action_col = st.columns([7, 1])
    with header_col:
        escaped_message = (
            report.get("originalMessage", "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        request_type_badges = "".join(
            f"<span class='badge-pill'>{_format_request_type_label(request_type)}</span>"
            for request_type in _get_report_request_types(report)
        )
        html = (
            f"<div class='report-shell {report['urgency']}'>"
            f"<div class='report-top'>"
            f"<div class='badge-row'>"
            f"{request_type_badges}"
            f"<span class='badge-pill {report['urgency']}'>{report['urgency']} urgency</span>"
            f"</div>"
            f"<div class='report-id'>{report['reportId']}</div>"
            f"</div>"
            "<div class='report-grid'>"
            f"<div class='report-cell'><div class='report-cell-label'>Location</div><div class='report-cell-value'>{report.get('primaryLocation') or 'Not specified'}</div></div>"
            f"<div class='report-cell'><div class='report-cell-label'>Contact</div><div class='report-cell-value'>{report.get('primaryContact') or 'Not specified'}</div></div>"
            f"<div class='report-cell'><div class='report-cell-label'>Reporter</div><div class='report-cell-value'>{report.get('source', {}).get('senderName', 'Unknown')}</div></div>"
            f"<div class='report-cell'><div class='report-cell-label'>Source</div><div class='report-cell-value'>{report.get('source', {}).get('groupName', 'Unknown Group')}</div></div>"
            "</div>"
            f"<div class='message-box'>"
            f"<div class='label'>Original Message</div>"
            f"<div class='text'>{escaped_message}</div>"
            f"</div>"
        )
        timestamp = report.get("messageTimestamp") or report.get("processedTimestamp") or "Unknown time"
        html += f"<div class='report-meta'>{timestamp}</div></div>"
        st.markdown(
            html,
            unsafe_allow_html=True,
        )

    with action_col:
        if st.button("Delete", key=f"delete_{index}_{report['reportId']}", use_container_width=True):
            ok, message = delete_report(report["reportId"], meta)
            if ok:
                st.success(message)
                _safe_rerun()
            else:
                st.error(message)


def render_relief_dashboard():
    _dashboard_styles()

    reports, meta = load_relief_reports()

    st.markdown(
        "<div class='dashboard-hero'>"
        "<h3>Relief Response Dashboard</h3>"
        "<p>Track incoming field reports, filter urgent requests, and manage response signals inside the MVP.</p>"
        "</div>",
        unsafe_allow_html=True,
    )

    top_left, top_right = st.columns([4, 1])
    with top_left:
        updated_at = meta.get("updated_at")
        updated_label = updated_at.strftime("%Y-%m-%d %H:%M:%S") if updated_at else "n/a"
        path = meta.get("path")
        path_label = str(path) if path else REPORT_API_URL
        st.caption(f"Source: {meta.get('source', 'Unknown')} | Updated: {updated_label}")
        st.caption(f"Backing store: {path_label}")
    with top_right:
        if st.button("Refresh Reports", use_container_width=True):
            _safe_rerun()

    _render_stat_cards(reports)

    filter_col1, filter_col2, filter_col3 = st.columns([1.1, 1.1, 2.2])
    with filter_col1:
        type_filter = st.selectbox(
            "Request type",
            options=_get_request_type_options(reports),
            format_func=lambda value: "All Types" if value == "all" else _format_request_type_label(value),
        )
    with filter_col2:
        urgency_filter = st.selectbox(
            "Urgency",
            options=["all", "high", "medium", "low"],
            format_func=lambda value: "All Urgency" if value == "all" else value.title(),
        )
    with filter_col3:
        search_term = st.text_input("Search reports", placeholder="Location, contact, source, or message")

    filtered_reports = _filter_reports(reports, type_filter, urgency_filter, search_term)
    st.markdown(f"**Recent Reports**  \n{len(filtered_reports)} visible report(s)")

    if not filtered_reports:
        st.info("No reports match the current filters.")
        return

    for index, report in enumerate(reversed(filtered_reports)):
        _render_report_card(report, meta, index)
