"use client";
import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { filterTasks, BRAND_LABEL } from "./MCApp";

const SMART_VIEWS = [
  { id: "my-day",    label: "My Day",       icon: "☀" },
  { id: "important", label: "Important",     icon: "★" },
  { id: "blocked",   label: "Blocked",       icon: "⊘" },
  { id: "waiting",   label: "Waiting on Me", icon: "⏳" },
];

const TIME_VIEWS = [
  { id: "today",      label: "Today" },
  { id: "this-week",  label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "all",        label: "All Tasks" },
];

const BRAND_VIEWS = [
  { id: "brand:wog",    label: "World of Grooves" },
  { id: "brand:plume",  label: "Plume Creative" },
  { id: "brand:shared", label: "Shared" },
];

const ARCHIVE_VIEWS = [
  { id: "parked", label: "Parked" },
  { id: "done",   label: "Done" },
];

export default function Sidebar({ tasks, agents, activeView, onViewChange, onClose, isMobile }) {
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }, [router]);
  // Pre-compute counts for all views
  const counts = useMemo(() => {
    const result = {};
    const staticViews = [
      ...SMART_VIEWS.map(v => v.id),
      ...TIME_VIEWS.map(v => v.id),
      ...BRAND_VIEWS.map(v => v.id),
      ...ARCHIVE_VIEWS.map(v => v.id),
    ];
    for (const id of staticViews) {
      result[id] = filterTasks(tasks, id).length;
    }
    result["agent:unassigned"] = filterTasks(tasks, "agent:unassigned").length;
    for (const agent of agents) {
      result[`agent:${agent.id}`] = filterTasks(tasks, `agent:${agent.id}`).length;
    }
    return result;
  }, [tasks, agents]);

  const renderItem = (id, label, icon) => {
    const isActive = activeView === id;
    const count = counts[id] || 0;
    return (
      <button
        key={id}
        onClick={() => onViewChange(id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          background: isActive ? "rgba(201,169,110,0.14)" : "transparent",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          color: isActive ? "#c9a96e" : "#c8c8c8",
          fontSize: 16,
          textAlign: "left",
          transition: "background 0.1s, color 0.1s",
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {icon && (
          <span style={{ width: 20, textAlign: "center", fontSize: 16, flexShrink: 0 }}>
            {icon}
          </span>
        )}
        {!icon && <span style={{ width: 20, flexShrink: 0 }} />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 14,
            color: isActive ? "#c9a96e" : "#666",
            minWidth: 20,
            textAlign: "right",
            flexShrink: 0,
          }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  const SectionLabel = ({ children }) => (
    <div style={{
      fontSize: 11,
      color: "#555",
      letterSpacing: 1.5,
      padding: "0 12px",
      marginBottom: 2,
      marginTop: 6,
      fontWeight: 600,
      textTransform: "uppercase",
    }}>
      {children}
    </div>
  );

  return (
    <div style={{
      height: "100%",
      background: "#0d0d0d",
      borderRight: "1px solid #1a1a1a",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 16px 14px",
        borderBottom: "1px solid #161616",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            fontSize: 11,
            color: "#c9a96e",
            letterSpacing: 3,
            fontWeight: 700,
          }}>
            ◈ MISSION CONTROL
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none",
                color: "#555", fontSize: 22, cursor: "pointer",
                padding: "0 2px", lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 12px" }}>

        {/* Smart views -- no section label, top level */}
        <div style={{ marginBottom: 8 }}>
          {SMART_VIEWS.map(v => renderItem(v.id, v.label, v.icon))}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Time views */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Time</SectionLabel>
          {TIME_VIEWS.map(v => renderItem(v.id, v.label, null))}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Agents */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Agents</SectionLabel>
          {(() => {
            const id = "agent:unassigned";
            const isActive = activeView === id;
            const count = counts[id] || 0;
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px",
                  background: isActive ? "rgba(201,169,110,0.14)" : "transparent",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  color: isActive ? "#c9a96e" : "#c8c8c8",
                  fontSize: 16, textAlign: "left",
                  transition: "background 0.1s, color 0.1s",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {/* Gold dot -- Denver is always present */}
                <span style={{
                  width: 20, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{
                    display: "inline-block",
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#c9a96e",
                    boxShadow: "0 0 6px #c9a96e88",
                    flexShrink: 0,
                  }} />
                </span>
                <span style={{
                  flex: 1, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  Denver
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: 14,
                    color: isActive ? "#c9a96e" : "#666",
                    minWidth: 20, textAlign: "right", flexShrink: 0,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })()}
          {agents.map(a => {
            const id = `agent:${a.id}`;
            const isActive = activeView === id;
            const agentTasks = tasks.filter(t => t.assignee_agent_id === a.id);
            const isWorking  = agentTasks.some(t => t.status === "in_progress");
            const isQueued   = agentTasks.some(t => t.status === "assigned");
            const dotColor   = isWorking ? "#10b981" : isQueued ? "#c9a96e" : "#2a2a2a";
            const dotGlow    = isWorking ? "0 0 6px #10b981" : "none";
            const count      = counts[id] || 0;
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px",
                  background: isActive ? "rgba(201,169,110,0.14)" : "transparent",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  color: isActive ? "#c9a96e" : "#c8c8c8",
                  fontSize: 16, textAlign: "left",
                  transition: "background 0.1s, color 0.1s",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {/* Status dot */}
                <span style={{
                  width: 20, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{
                    display: "inline-block",
                    width: 7, height: 7, borderRadius: "50%",
                    background: dotColor,
                    boxShadow: dotGlow,
                    flexShrink: 0,
                    transition: "background 0.3s, box-shadow 0.3s",
                  }} />
                </span>
                <span style={{
                  flex: 1, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {a.display_name}
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: 14,
                    color: isActive ? "#c9a96e" : "#666",
                    minWidth: 20, textAlign: "right", flexShrink: 0,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Brands */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Brands</SectionLabel>
          {BRAND_VIEWS.map(v => renderItem(v.id, v.label, null))}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Archive */}
        <div>
          <SectionLabel>Archive</SectionLabel>
          {ARCHIVE_VIEWS.map(v => renderItem(v.id, v.label, null))}
        </div>
      </div>

      {/* Sign out */}
      <div style={{
        padding: "10px 8px",
        borderTop: "1px solid #161616",
        flexShrink: 0,
      }}>
        <button
          onClick={handleSignOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "10px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            color: "#444",
            fontSize: 14,
            textAlign: "left",
            transition: "color 0.1s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#888"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#444"}
        >
          <span style={{ width: 20, textAlign: "center", fontSize: 14, flexShrink: 0 }}>⎋</span>
          Sign out
        </button>
      </div>
    </div>
  );
}
