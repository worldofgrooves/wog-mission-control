"use client";
import { useMemo } from "react";
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
          gap: 8,
          width: "100%",
          padding: "6px 12px",
          background: isActive ? "rgba(201,169,110,0.12)" : "transparent",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          color: isActive ? "#c9a96e" : "#888",
          fontSize: 13,
          textAlign: "left",
          transition: "background 0.1s, color 0.1s",
        }}
      >
        {icon && (
          <span style={{ width: 16, textAlign: "center", fontSize: 13, flexShrink: 0 }}>
            {icon}
          </span>
        )}
        {!icon && <span style={{ width: 16, flexShrink: 0 }} />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 11,
            color: isActive ? "#c9a96e" : "#444",
            minWidth: 16,
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
      fontSize: 10,
      color: "#333",
      letterSpacing: 2,
      padding: "0 12px",
      marginBottom: 2,
      marginTop: 4,
      fontWeight: 700,
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
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 20px" }}>

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
          {renderItem("agent:unassigned", "Denver", "○")}
          {agents.map(a => renderItem(`agent:${a.id}`, a.display_name, "●"))}
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
    </div>
  );
}
