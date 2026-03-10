import React from "react";
import { getCompanyLogo } from "../assets/logos";

const ServiceCard = ({ service }) => {
  const logo = getCompanyLogo(service.service);
  const FallbackIcon = logo?.fallback;

  const getStatusColor = (status) => {
    switch (status) {
      case "Operational":
        return {
          dot: "bg-[#2D6A4F]",
          text: "text-[#74C69D]",
          border: "border-white/8",
          badge: "bg-[#1B4332]/30",
        };
      case "Degraded":
        return {
          dot: "bg-[#B7950B]",
          text: "text-[#FFB703]",
          border: "border-[#453214]/40",
          badge: "bg-[#453214]/30",
        };
      case "Issue Reported":
      case "Major Outage":
        return {
          dot: "bg-[#7B241C]",
          text: "text-[#E5989B]",
          border: "border-[#4A1111]/40",
          badge: "bg-[#4A1111]/30",
        };
      default:
        return {
          dot: "bg-slate-700",
          text: "text-slate-500",
          border: "border-white/8",
          badge: "bg-slate-800/30",
        };
    }
  };

  const statusStyle = getStatusColor(service.status);
  const hasIssue =
    service.status !== "Operational" &&
    service.status !== "Unknown" &&
    service.status !== "Not Configured" &&
    service.status !== "No API Available";

  const metrics = service.metrics || {};
  const latency = metrics.latency !== null ? metrics.latency : "—";
  const uptime = metrics.uptime ? metrics.uptime.toFixed(2) : "—";
  const successRate = metrics.successRate
    ? metrics.successRate.toFixed(2)
    : "—";
  const isAvailable = metrics.available !== false;

  const formatLatency = (lat) => {
    if (lat === "—" || lat === null) return "—";
    if (lat < 1000) return `${lat} ms`;
    return `${(lat / 1000).toFixed(2)} s`;
  };

  const latencyCritical = latency !== "—" && latency > 1000;

  return (
    <div
      className={`glass p-6 rounded-lg ${
        hasIssue || !isAvailable
          ? `border ${statusStyle.border} hover:border-[#E5989B]/60`
          : "border-crisp hover:border-white/20"
      } transition-all cursor-pointer group`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {/* Logo - Works for both SVG and PNG */}
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            {logo?.src ? (
              <img
                src={logo.src}
                alt={service.service}
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error(`Failed to load logo for ${service.service}`);
                  e.target.style.display = 'none';
                }}
              />
            ) : FallbackIcon ? (
              <FallbackIcon className="w-8 h-8 text-slate-500" />
            ) : (
              <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-slate-600 text-xs font-bold">
                {service.service.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-100 mb-0.5">
              {service.service}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
              {!isAvailable
                ? "OFFLINE"
                : hasIssue
                ? "DEGRADED"
                : "PRODUCTION"}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded 
                      text-[9px] font-bold ${statusStyle.text} uppercase 
                      tracking-tighter ${statusStyle.badge}`}
        >
          <div className={`status-dot w-1.5 h-1.5 ${statusStyle.dot}`} />
          <span>
            {!isAvailable ? "Offline" : hasIssue ? "Issue" : "Online"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-y-3 mb-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Uptime (Recent)
          </span>
          <span className="text-[11px] font-mono text-slate-300">
            {uptime}%
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Response Time
          </span>
          <span
            className={`text-[11px] font-mono ${
              latencyCritical ? "text-[#E5989B]" : "text-slate-300"
            }`}
          >
            {formatLatency(latency)}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Success Rate
          </span>
          <span
            className={`text-[11px] font-mono ${
              parseFloat(successRate) < 95
                ? "text-[#E5989B]"
                : "text-slate-300"
            }`}
          >
            {successRate}%
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`flex justify-between text-[10px] font-mono 
                    tracking-tight uppercase ${
          hasIssue || !isAvailable
            ? statusStyle.text + "/80"
            : "text-slate-600"
        }`}
      >
        <span>
          {!isAvailable
            ? "Unreachable"
            : latencyCritical
            ? `High Latency`
            : `Live: ${formatLatency(latency)}`}
        </span>
        <span>
          {service.activeIncidents?.length > 0
            ? `${service.activeIncidents.length} Alert${
                service.activeIncidents.length > 1 ? "s" : ""
              }`
            : isAvailable
            ? "Nominal"
            : "Down"}
        </span>
      </div>

      {/* Error note */}
      {metrics.error && (
        <p className="text-[10px] text-[#E5989B] mt-3 italic">
          ⚠ {metrics.error}
        </p>
      )}

      {/* Config note */}
      {service.note && !metrics.error && (
        <p className="text-[10px] text-slate-600 mt-3 italic">{service.note}</p>
      )}

      {/* Real-time indicator */}
      {isAvailable && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">
            Real-time data
          </span>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;