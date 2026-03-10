import React, { useEffect, useState } from "react";
import axios from "axios";
import ServiceCard from "./ServiceCard";
import IncidentPanel from "./IncidentPanel";

const Dashboard = () => {
  const [services, setServices] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get("/api/status"); // Relative URL
      setServices(res.data.services);
      setActiveIncidents(res.data.activeIncidents);
      setRecentIncidents(res.data.recentIncidents);
      setLastChecked(res.data.lastChecked);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Live clock
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const operationalCount = services.filter(
    (s) => s.status === "Operational" && s.metrics?.available !== false
  ).length;

  const issueCount = services.filter(
    (s) =>
      s.status === "Issue Reported" ||
      s.status === "Major Outage" ||
      s.status === "Degraded" ||
      s.metrics?.available === false
  ).length;

  const totalServices = services.length;
  const uptimePercent =
    totalServices > 0
      ? ((operationalCount / totalServices) * 100).toFixed(2)
      : "0.00";

  // Calculate average latency
  const avgLatency = services.length > 0
    ? (
        services
          .filter((s) => s.metrics?.latency !== null)
          .reduce((sum, s) => sum + (s.metrics?.latency || 0), 0) /
        services.filter((s) => s.metrics?.latency !== null).length
      ).toFixed(0)
    : "—";

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 font-sans antialiased relative overflow-x-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      {/* HEADER */}
      <header className="glass sticky top-0 z-50 border-b border-white/5 px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`status-dot ${
              isRefreshing ? "bg-[#FFB703] animate-pulse" : "bg-[#2D6A4F]"
            }`}
          />
          <h1 className="text-sm font-semibold tracking-[0.2em] text-slate-100 uppercase">
            Infrastructure Health Monitor
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-sm font-mono text-slate-500 tracking-wider">
            {clock.toISOString().substr(11, 8)} UTC
          </div>
          <div className="flex items-center gap-3 px-4 py-1.5 bg-white/[0.03] border border-white/10 rounded">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              System:
            </span>
            <span className="text-[10px] font-bold text-[#74C69D] tracking-widest uppercase">
              {issueCount > 0 ? "Degraded" : "Nominal"}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-1.5 bg-white/[0.03] border border-white/10 rounded">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Avg Latency:
            </span>
            <span className="text-[10px] font-bold text-white tracking-widest uppercase">
              {avgLatency === "—" ? "—" : `${avgLatency}ms`}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-10 grid grid-cols-12 gap-10 max-w-[1600px] mx-auto w-full relative z-10">
        {/* Left side - Services */}
        <div className="col-span-12 lg:col-span-9 space-y-10">
          {/* Status Summary */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Operational Card */}
            <div className="glass p-7 rounded-lg border-crisp flex flex-col gap-3">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                Operational
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light text-white">
                  {operationalCount}
                </span>
                <span className="text-slate-500 text-xs">
                  / {totalServices} Services
                </span>
              </div>
            </div>

            {/* Issues Card */}
            <div className="glass p-7 rounded-lg border-crisp flex flex-col gap-3">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                Active Issues
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-light ${
                    issueCount > 0 ? "text-[#E5989B]" : "text-white"
                  }`}
                >
                  {issueCount}
                </span>
                <span className="text-slate-500 text-xs">
                  {issueCount === 1 ? "Critical" : "Total"}
                </span>
              </div>
            </div>

            {/* Uptime Card */}
            <div className="glass p-7 rounded-lg border-crisp flex flex-col gap-3">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                Uptime (Live)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light text-white">
                  {uptimePercent}
                </span>
                <span className="text-slate-500 text-xs">%</span>
              </div>
            </div>
          </section>

          {/* Service Grid */}
          <section>
            <h2 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.25em] mb-8">
              Core Services
              {isRefreshing && (
                <span className="ml-4 text-[#FFB703]">● Refreshing...</span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <ServiceCard key={index} service={service} />
              ))}
            </div>
          </section>
        </div>

        {/* Right side - Incidents */}
        <aside className="col-span-12 lg:col-span-3">
          <IncidentPanel
            activeIncidents={activeIncidents}
            recentIncidents={recentIncidents}
          />
        </aside>
      </main>

      {/* TICKER FOOTER */}
      {activeIncidents.length > 0 && (
        <footer className="glass border-t border-white/5 bg-[#121212]/40 py-2.5 overflow-hidden">
          <div className="flex items-center gap-16 animate-ticker whitespace-nowrap px-10">
            {[...activeIncidents, ...activeIncidents].map((inc, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="status-dot bg-[#E5989B]" />
                <span className="text-[10px] font-bold text-[#E5989B] uppercase tracking-[0.2em]">
                  Critical:
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-[0.1em] font-medium">
                  {inc.service} - {inc.title?.substring(0, 80)}
                  {inc.title?.length > 80 ? "..." : ""}
                </span>
              </div>
            ))}
          </div>
        </footer>
      )}

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
                       "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .glass {
          background: rgba(18, 18, 18, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .border-crisp {
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .bg-grid {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;