const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { getAllStatus } = require("./statusService");

const app = express();

app.use(cors());
app.use(express.json());

// Store for real-time metrics
const metricsStore = new Map();

// ═══════════════════════════════════════════════════════
// Real-time latency checker
// ═══════════════════════════════════════════════════════
async function measureLatency(url, timeout = 5000) {
  const start = Date.now();
  try {
    await axios.get(url, {
      timeout,
      headers: { "User-Agent": "StatusMonitor/1.0" },
    });
    return Date.now() - start;
  } catch (err) {
    return null;
  }
}

async function getRealTimeMetrics() {
  const endpoints = {
    AWS: "https://status.aws.amazon.com/rss/all.rss",
    GCP: "https://status.cloud.google.com/incidents.json",
    Cloudflare: "https://www.cloudflarestatus.com/api/v2/status.json",
    Salesforce: "https://api.status.salesforce.com/v1/instances",
    "Microsoft 365": null,
    Gmail: "https://www.google.com/gmail/about/",
    ServiceNow: "https://status.servicenow.com",
    Zscaler: "https://trust.zscaler.com",
    "Oracle Cloud": "https://ocistatus.oraclecloud.com/api/v2/status.json",
    AutomationEdge: null,
    Outlook: "https://outlook.live.com",
    "Microsoft Teams": null,
  };

  const results = await Promise.all(
    Object.entries(endpoints).map(async ([service, url]) => {
      if (!url) {
        return {
          service,
          latency: null,
          available: false,
          error: "No endpoint configured",
        };
      }

      const latency = await measureLatency(url);

      return {
        service,
        latency,
        available: latency !== null,
        error: latency === null ? "Request failed" : null,
      };
    })
  );

  const metrics = {};
  results.forEach((r) => {
    metrics[r.service] = {
      latency: r.latency,
      available: r.available,
      timestamp: Date.now(),
      error: r.error,
    };
  });

  return metrics;
}

function calculateUptime(service) {
  const history = metricsStore.get(service) || [];
  if (history.length === 0) return 100;

  const successful = history.filter((m) => m.available).length;
  return ((successful / history.length) * 100).toFixed(2);
}

function calculateSuccessRate(service) {
  const history = metricsStore.get(service) || [];
  if (history.length === 0) return 100;

  const successful = history.filter((m) => m.latency !== null).length;
  return ((successful / history.length) * 100).toFixed(2);
}

function storeMetrics(metrics) {
  Object.entries(metrics).forEach(([service, data]) => {
    if (!metricsStore.has(service)) {
      metricsStore.set(service, []);
    }

    const history = metricsStore.get(service);
    history.push(data);

    if (history.length > 100) {
      history.shift();
    }
  });
}

// ═══════════════════════════════════════════════════════
// Serve frontend static files (production)
// ═══════════════════════════════════════════════════════
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// ═══════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════
app.get("/api/status", async (req, res) => {
  try {
    const [statusData, metrics] = await Promise.all([
      getAllStatus(),
      getRealTimeMetrics(),
    ]);

    storeMetrics(metrics);

    const enrichedServices = statusData.services.map((service) => {
      const metric = metrics[service.service];
      const uptime = calculateUptime(service.service);
      const successRate = calculateSuccessRate(service.service);

      return {
        ...service,
        metrics: {
          latency: metric?.latency || null,
          available: metric?.available || false,
          uptime: parseFloat(uptime),
          successRate: parseFloat(successRate),
          error: metric?.error || null,
          lastChecked: metric?.timestamp || Date.now(),
        },
      };
    });

    res.json({
      ...statusData,
      services: enrichedServices,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════
// Serve React app for all other routes
// ═══════════════════════════════════════════════════════
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ═══════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Frontend served from: ${frontendPath}`);
});

// Background metrics collection (every 30 seconds)
setInterval(async () => {
  try {
    const metrics = await getRealTimeMetrics();
    storeMetrics(metrics);
    console.log(
      `[${new Date().toISOString()}] Metrics collected for ${
        Object.keys(metrics).length
      } services`
    );
  } catch (err) {
    console.error("Background metrics collection failed:", err.message);
  }
}, 30000);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});