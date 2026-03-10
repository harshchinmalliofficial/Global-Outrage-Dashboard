const axios = require("axios");
const Parser = require("rss-parser");
require("dotenv").config();

const parser = new Parser();

const http = axios.create({
  timeout: 10000,
  headers: { "User-Agent": "CloudStatusDashboard/1.0" }
});

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

async function safeFetch(serviceName, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${serviceName}] Error: ${err.message}`);
    return {
      service: serviceName,
      status: "Unknown",
      activeIncidents: [],
      recentIncidents: [],
      error: err.message
    };
  }
}

// ══════════════════════════════════════════════════════
// Statuspage helper (Cloudflare, ServiceNow, Oracle, etc.)
// ══════════════════════════════════════════════════════
async function fetchStatuspage(serviceName, baseUrl) {
  const [statusRes, unresolvedRes, allRes] = await Promise.all([
    http.get(`${baseUrl}/api/v2/status.json`),
    http.get(`${baseUrl}/api/v2/incidents/unresolved.json`),
    http.get(`${baseUrl}/api/v2/incidents.json`)
  ]);

  const indicator = statusRes.data.status.indicator;

  let status = "Operational";
  if (indicator === "minor") status = "Degraded";
  else if (indicator === "major") status = "Major Outage";
  else if (indicator === "critical") status = "Critical Outage";

  // Active (unresolved) incidents
  const activeIncidents = (unresolvedRes.data.incidents || [])
    .slice(0, 5)
    .map((i) => ({
      service: serviceName,
      title: i.name,
      time: i.created_at,
      impact: i.impact,
      resolved: false,
      status: "Active"
    }));

  // Recent (last 7 days) — includes resolved ones
  const cutoff = Date.now() - SEVEN_DAYS;
  const recentIncidents = (allRes.data.incidents || [])
    .filter((i) => new Date(i.created_at).getTime() > cutoff)
    .slice(0, 5)
    .map((i) => ({
      service: serviceName,
      title: i.name,
      time: i.created_at,
      impact: i.impact,
      resolved: i.status === "resolved" || i.status === "postmortem",
      status: i.status === "resolved" ? "Resolved" : "Active"
    }));

  return {
    service: serviceName,
    status,
    activeIncidents,
    recentIncidents
  };
}

// ══════════════════════════════════════════════════════
// 1. AWS
// ══════════════════════════════════════════════════════
function getAWSStatus() {
  return safeFetch("AWS", async () => {
    const feed = await parser.parseURL(
      "https://status.aws.amazon.com/rss/all.rss"
    );

    const now = Date.now();
    const cutoff48h = now - 48 * 60 * 60 * 1000;
    const cutoff7d = now - SEVEN_DAYS;

    const active = feed.items.filter(
      (item) => new Date(item.pubDate).getTime() > cutoff48h
    );

    const recent = feed.items.filter(
      (item) => new Date(item.pubDate).getTime() > cutoff7d
    );

    return {
      service: "AWS",
      status: active.length > 0 ? "Issue Reported" : "Operational",
      activeIncidents: active.slice(0, 5).map((item) => ({
        service: "AWS",
        title: item.title,
        time: item.pubDate,
        resolved: false,
        status: "Active"
      })),
      recentIncidents: recent.slice(0, 5).map((item) => ({
        service: "AWS",
        title: item.title,
        time: item.pubDate,
        resolved: !active.includes(item),
        status: active.includes(item) ? "Active" : "Resolved"
      }))
    };
  });
}

// ══════════════════════════════════════════════════════
// 2. GCP
// ══════════════════════════════════════════════════════
function getGCPStatus() {
  return safeFetch("GCP", async () => {
    const res = await http.get(
      "https://status.cloud.google.com/incidents.json"
    );

    const cutoff = Date.now() - SEVEN_DAYS;

    // Active = no end date
    const active = res.data.filter((i) => !i.end);

    // Recent = started in last 7 days (active OR resolved)
    const recent = res.data.filter(
      (i) => new Date(i.begin).getTime() > cutoff
    );

    return {
      service: "GCP",
      status: active.length > 0 ? "Issue Reported" : "Operational",
      activeIncidents: active.slice(0, 5).map((i) => ({
        service: "GCP",
        title: i.external_desc,
        time: i.begin,
        severity: i.severity,
        resolved: false,
        status: "Active"
      })),
      recentIncidents: recent.slice(0, 5).map((i) => ({
        service: "GCP",
        title: i.external_desc,
        time: i.begin,
        severity: i.severity,
        resolved: !!i.end,
        status: i.end ? "Resolved" : "Active"
      }))
    };
  });
}

// ══════════════════════════════════════════════════════
// 3. Cloudflare
// ══════════════════════════════════════════════════════
function getCloudflareStatus() {
  return safeFetch("Cloudflare", () =>
    fetchStatuspage("Cloudflare", "https://www.cloudflarestatus.com")
  );
}

// ══════════════════════════════════════════════════════
// 4. Salesforce
// ══════════════════════════════════════════════════════
function getSalesforceStatus() {
  return safeFetch("Salesforce", async () => {
    const [activeRes, recentRes] = await Promise.all([
      http.get("https://api.status.salesforce.com/v1/incidents/active"),
      http.get("https://api.status.salesforce.com/v1/incidents")
    ]);

    const activeList = Array.isArray(activeRes.data) ? activeRes.data : [];
    const allList = Array.isArray(recentRes.data) ? recentRes.data : [];

    const cutoff = Date.now() - SEVEN_DAYS;
    const recentList = allList.filter(
      (i) => new Date(i.createdAt).getTime() > cutoff
    );

    return {
      service: "Salesforce",
      status: activeList.length > 0 ? "Issue Reported" : "Operational",
      activeIncidents: activeList.slice(0, 5).map((i) => ({
        service: "Salesforce",
        title:
          i.IncidentEvents?.[0]?.message ||
          i.externalMessage ||
          "Incident reported",
        time: i.createdAt,
        resolved: false,
        status: "Active"
      })),
      recentIncidents: recentList.slice(0, 5).map((i) => ({
        service: "Salesforce",
        title:
          i.IncidentEvents?.[0]?.message ||
          i.externalMessage ||
          "Incident reported",
        time: i.createdAt,
        resolved: !activeList.find((a) => a.id === i.id),
        status: activeList.find((a) => a.id === i.id)
          ? "Active"
          : "Resolved"
      }))
    };
  });
}

// ══════════════════════════════════════════════════════
// 5. Gmail
// ══════════════════════════════════════════════════════
function getGmailStatus() {
  return safeFetch("Gmail", async () => {
    const res = await http.get(
      "https://status.cloud.google.com/incidents.json"
    );

    const cutoff = Date.now() - SEVEN_DAYS;

    const gmailFilter = (i) =>
      i.service_name?.toLowerCase().includes("gmail") ||
      i.external_desc?.toLowerCase().includes("gmail") ||
      i.service_key === "gmail" ||
      i.service_name?.toLowerCase().includes("google workspace");

    const allGmail = res.data.filter(gmailFilter);
    const active = allGmail.filter((i) => !i.end);
    const recent = allGmail.filter(
      (i) => new Date(i.begin).getTime() > cutoff
    );

    return {
      service: "Gmail",
      status: active.length > 0 ? "Issue Reported" : "Operational",
      activeIncidents: active.slice(0, 5).map((i) => ({
        service: "Gmail",
        title: i.external_desc,
        time: i.begin,
        resolved: false,
        status: "Active"
      })),
      recentIncidents: recent.slice(0, 5).map((i) => ({
        service: "Gmail",
        title: i.external_desc,
        time: i.begin,
        resolved: !!i.end,
        status: i.end ? "Resolved" : "Active"
      }))
    };
  });
}

// ══════════════════════════════════════════════════════
// 6–7. Microsoft (M365, Outlook, Teams)
// ══════════════════════════════════════════════════════
let msTokenCache = { token: null, expiry: 0 };
let msDataCache = { data: null, expiry: 0 };

async function getMicrosoftToken() {
  if (msTokenCache.token && Date.now() < msTokenCache.expiry) {
    return msTokenCache.token;
  }

  const res = await http.post(
    `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  msTokenCache = {
    token: res.data.access_token,
    expiry: Date.now() + (res.data.expires_in - 120) * 1000
  };

  return msTokenCache.token;
}

async function fetchMicrosoftData() {
  if (msDataCache.data && Date.now() < msDataCache.expiry) {
    return msDataCache.data;
  }

  const token = await getMicrosoftToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [healthRes, activeRes, resolvedRes] = await Promise.all([
    http.get(
      "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews",
      { headers }
    ),
    http.get(
      "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues" +
        "?$filter=isResolved eq false&$top=15",
      { headers }
    ),
    http.get(
      "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues" +
        "?$top=15&$orderby=startDateTime desc",
      { headers }
    )
  ]);

  msDataCache = {
    data: {
      health: healthRes.data.value || [],
      activeIssues: activeRes.data.value || [],
      allIssues: resolvedRes.data.value || []
    },
    expiry: Date.now() + 60000
  };

  return msDataCache.data;
}

function mapMicrosoftStatus(graphStatus) {
  if (!graphStatus || graphStatus === "serviceOperational")
    return "Operational";
  if (
    ["investigating", "serviceDegradation", "verifyingService"].includes(
      graphStatus
    )
  )
    return "Degraded";
  return "Issue Reported";
}

async function getMicrosoftServiceStatus(displayName, serviceId) {
  if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID) {
    return {
      service: displayName,
      status: "Not Configured",
      activeIncidents: [],
      recentIncidents: [],
      note: "Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET in .env"
    };
  }

  return safeFetch(displayName, async () => {
    const data = await fetchMicrosoftData();
    const health = data.health.find((h) => h.id === serviceId);

    const cutoff = Date.now() - SEVEN_DAYS;

    const activeIssues = data.activeIssues.filter(
      (i) => i.service === health?.service || i.service === displayName
    );

    const recentIssues = data.allIssues.filter(
      (i) =>
        (i.service === health?.service || i.service === displayName) &&
        new Date(i.startDateTime).getTime() > cutoff
    );

    return {
      service: displayName,
      status: mapMicrosoftStatus(health?.status),
      activeIncidents: activeIssues.slice(0, 5).map((i) => ({
        service: displayName,
        title: i.title,
        time: i.startDateTime,
        resolved: false,
        status: "Active"
      })),
      recentIncidents: recentIssues.slice(0, 5).map((i) => ({
        service: displayName,
        title: i.title,
        time: i.startDateTime,
        resolved: i.isResolved,
        status: i.isResolved ? "Resolved" : "Active"
      }))
    };
  });
}

function getMicrosoft365Status() {
  if (!process.env.MS_TENANT_ID) {
    return Promise.resolve({
      service: "Microsoft 365",
      status: "Not Configured",
      activeIncidents: [],
      recentIncidents: []
    });
  }

  return safeFetch("Microsoft 365", async () => {
    const data = await fetchMicrosoftData();

    const hasIssues = data.health.some(
      (s) => s.status !== "serviceOperational"
    );

    const cutoff = Date.now() - SEVEN_DAYS;
    const recentIssues = data.allIssues.filter(
      (i) => new Date(i.startDateTime).getTime() > cutoff
    );

    return {
      service: "Microsoft 365",
      status: hasIssues ? "Degraded" : "Operational",
      activeIncidents: data.activeIssues.slice(0, 5).map((i) => ({
        service: "Microsoft 365",
        title: i.title,
        time: i.startDateTime,
        resolved: false,
        status: "Active"
      })),
      recentIncidents: recentIssues.slice(0, 5).map((i) => ({
        service: "Microsoft 365",
        title: i.title,
        time: i.startDateTime,
        resolved: i.isResolved,
        status: i.isResolved ? "Resolved" : "Active"
      }))
    };
  });
}

function getOutlookStatus() {
  return getMicrosoftServiceStatus("Outlook", "Exchange");
}

function getTeamsStatus() {
  return getMicrosoftServiceStatus("Microsoft Teams", "microsoftteams");
}

// ══════════════════════════════════════════════════════
// 8. ServiceNow
// ══════════════════════════════════════════════════════
function getServiceNowStatus() {
  return safeFetch("ServiceNow", async () => {
    try {
      return await fetchStatuspage(
        "ServiceNow",
        "https://status.servicenow.com"
      );
    } catch {
      return {
        service: "ServiceNow",
        status: "Unknown",
        activeIncidents: [],
        recentIncidents: [],
        statusUrl: "https://status.servicenow.com"
      };
    }
  });
}

// ══════════════════════════════════════════════════════
// 9. Zscaler
// ══════════════════════════════════════════════════════
function getZscalerStatus() {
  return safeFetch("Zscaler", async () => {
    try {
      await http.get("https://trust.zscaler.com", { timeout: 5000 });
      return {
        service: "Zscaler",
        status: "Operational",
        activeIncidents: [],
        recentIncidents: [],
        statusUrl: "https://trust.zscaler.com"
      };
    } catch {
      return {
        service: "Zscaler",
        status: "Unknown",
        activeIncidents: [],
        recentIncidents: [],
        statusUrl: "https://trust.zscaler.com"
      };
    }
  });
}

// ══════════════════════════════════════════════════════
// 10. Oracle Cloud
// ══════════════════════════════════════════════════════
function getOracleStatus() {
  return safeFetch("Oracle Cloud", async () => {
    try {
      return await fetchStatuspage(
        "Oracle Cloud",
        "https://ocistatus.oraclecloud.com"
      );
    } catch {
      return {
        service: "Oracle Cloud",
        status: "Unknown",
        activeIncidents: [],
        recentIncidents: [],
        statusUrl: "https://ocistatus.oraclecloud.com"
      };
    }
  });
}

// ══════════════════════════════════════════════════════
// 11. AutomationEdge
// ══════════════════════════════════════════════════════
function getAutomationEdgeStatus() {
  return Promise.resolve({
    service: "AutomationEdge",
    status: "No API Available",
    activeIncidents: [],
    recentIncidents: []
  });
}

// ══════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════
async function getAllStatus() {
  const start = Date.now();

  const results = await Promise.all([
    getAWSStatus(),
    getGCPStatus(),
    getCloudflareStatus(),
    getSalesforceStatus(),
    getMicrosoft365Status(),
    getGmailStatus(),
    getServiceNowStatus(),
    getZscalerStatus(),
    getOracleStatus(),
    getAutomationEdgeStatus(),
    getOutlookStatus(),
    getTeamsStatus()
  ]);

  const elapsed = Date.now() - start;
  console.log(`[StatusFetcher] ${results.length} services in ${elapsed}ms`);

  // Combine all incidents
  const activeIncidents = results.flatMap(
    (s) => s.activeIncidents || []
  );
  const recentIncidents = results.flatMap(
    (s) => s.recentIncidents || []
  );

  // Sort by time (newest first)
  recentIncidents.sort(
    (a, b) => new Date(b.time) - new Date(a.time)
  );
  activeIncidents.sort(
    (a, b) => new Date(b.time) - new Date(a.time)
  );

  return {
    services: results,
    activeIncidents,
    recentIncidents,
    lastChecked: new Date().toISOString()
  };
}

module.exports = { getAllStatus };