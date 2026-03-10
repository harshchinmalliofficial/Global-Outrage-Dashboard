import React, { useEffect, useRef } from "react";
import { getCompanyLogo } from "../assets/logo";

const IncidentPanel = ({ activeIncidents, recentIncidents }) => {
  const scrollRef = useRef(null);

  const getTimeAgo = (time) => {
    if (!time) return "";
    const seconds = Math.floor((Date.now() - new Date(time)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || recentIncidents.length === 0) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.3;
    let animationId;

    const scroll = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) return;

      scrollPosition += scrollSpeed;
      if (scrollPosition >= maxScroll) scrollPosition = 0;

      container.scrollTop = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    const timeout = setTimeout(() => {
      animationId = requestAnimationFrame(scroll);
    }, 2000);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeout);
    };
  }, [recentIncidents]);

  const IncidentItem = ({ incident, isActive }) => {
    const logo = getCompanyLogo(incident.service);
    const FallbackIcon = logo?.fallback;

    return (
      <div
        className={`${
          isActive
            ? "bg-[#4A1111]/20 border border-[#4A1111]/40 rounded p-5 space-y-3"
            : "border-l border-slate-800 pl-5 py-0.5 relative"
        }`}
      >
        {!isActive && (
          <div className="absolute -left-[4.5px] top-2 status-dot bg-slate-700" />
        )}

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {/* Mini logo - handles both SVG and PNG */}
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {logo?.src ? (
                <img
                  src={logo.src}
                  alt={incident.service}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : FallbackIcon ? (
                <FallbackIcon className="w-4 h-4 text-slate-500" />
              ) : (
                <div className="w-4 h-4 bg-slate-700 rounded text-slate-400 text-[8px] flex items-center justify-center font-bold">
                  {incident.service.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <h4 className={`${isActive ? 'text-xs' : 'text-[11px]'} font-bold text-slate-100`}>
              {isActive
                ? `${incident.service}-${String(
                    activeIncidents.indexOf(incident) + 1
                  ).padStart(2, "0")}`
                : incident.service}
            </h4>
          </div>

          <span className="text-[9px] text-[#E5989B]/60 font-mono tracking-tighter">
            {getTimeAgo(incident.time)}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
          {incident.title?.substring(0, isActive ? 120 : 40)}
          {incident.title?.length > (isActive ? 120 : 40) ? "..." : ""}
        </p>

        {isActive && (
          <div className="pt-2 flex gap-2">
            <span className="text-[9px] px-2 py-0.5 bg-[#E5989B] text-[#121212] font-bold rounded-sm uppercase tracking-tighter">
              P1
            </span>
            <span className="text-[9px] px-2 py-0.5 border border-white/10 text-slate-400 rounded-sm uppercase tracking-tighter">
              Investigating
            </span>
          </div>
        )}

        {!isActive && (
          <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">
            {incident.resolved ? "Resolved" : "Recent"} •{" "}
            {getTimeAgo(incident.time)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="glass h-full rounded-lg p-7 border-crisp flex flex-col">
      <h2 className="text-slate-100 text-xs font-bold mb-8 flex items-center gap-2 uppercase tracking-widest">
        <svg
          className="w-4 h-4 text-[#E5989B]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        Incidents
      </h2>

      <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-grow">
        <div>
          <span className="text-[9px] font-bold text-[#E5989B] uppercase tracking-[0.2em] block mb-4">
            Active ({activeIncidents.length})
          </span>

          {activeIncidents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[#74C69D] text-xs font-medium">
                ✓ No active incidents
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeIncidents.slice(0, 3).map((inc, i) => (
                <IncidentItem key={i} incident={inc} isActive={true} />
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block mb-4">
            Resolved
          </span>

          <div
            ref={scrollRef}
            className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar"
          >
            {recentIncidents.length === 0 ? (
              <p className="text-[10px] text-slate-600 text-center py-4">
                No recent incidents
              </p>
            ) : (
              <>
                {[...recentIncidents, ...recentIncidents].map((inc, i) => (
                  <IncidentItem key={i} incident={inc} isActive={false} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <button className="mt-8 w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase rounded border border-white/5 transition-colors">
        Archive
      </button>
    </div>
  );
};

export default IncidentPanel;