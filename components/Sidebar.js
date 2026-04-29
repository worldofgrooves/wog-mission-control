"use client";
import { useMemo, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { filterTasks } from "./MCApp";

const SMART_VIEWS = [
  { id: "my-day",    label: "My Day",       icon: "☀︎" },
  { id: "important", label: "Important",     icon: "★" },
  { id: "blocked",   label: "Blocked",       icon: "⊘" },
  { id: "waiting",   label: "Waiting on Me", icon: "⏳" },
];

const TIME_VIEWS = [
  { id: "today",      label: "Today" },
  { id: "this-week",  label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "all",        label: "Planned" },
];

const AREA_VIEWS = [
  { id: "brand:wog",      label: "World of Grooves" },
  { id: "brand:plume",    label: "Plume Creative" },
  { id: "brand:shared",   label: "Shared" },
  { id: "brand:house",    label: "House" },
  { id: "brand:personal", label: "Personal" },
  { id: "brand:studio",   label: "Studio" },
];

const ARCHIVE_VIEWS = [
  { id: "parked", label: "Parked" },
  { id: "done",   label: "Done" },
];

// Derive agent status from task data (reliable) instead of heartbeats (not wired yet)
function getAgentTaskStatus(agentId, tasks) {
  const agentTasks = tasks.filter(t => t.assignee_agent_id === agentId && t.status !== "done" && t.status !== "parked");
  if (agentTasks.some(t => t.status === "in_progress")) return "working";
  if (agentTasks.some(t => t.status === "blocked"))     return "stuck";
  if (agentTasks.some(t => t.status === "assigned" || t.status === "review" || t.status === "waiting_on_denver")) return "queued";
  return "idle";
}

const TASK_STATUS_DOT = {
  working: { color: "#10b981", glow: "0 0 6px #10b981" },   // green -- actively working
  stuck:   { color: "#ef4444", glow: "0 0 6px #ef4444" },   // red -- blocked
  queued:  { color: "#f59e0b", glow: "none" },                // yellow -- has tasks but none in_progress
  idle:    { color: "#2a2a2a", glow: "none" },                // gray -- no active tasks
};

export default function Sidebar({ tasks, agents, heartbeats = [], activeView, onViewChange, onClose, isMobile, onWakeAgent, folders, ideasCount, onAddFolder, onDeleteFolder, onDashOpen }) {
  const router = useRouter();
  const [ideasOpen, setIdeasOpen] = useState(
    activeView === "ideas:all" || activeView.startsWith("ideas:folder:")
  );
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const folderSubmittedRef = useRef(false);

  // Keep Ideas section open if an ideas view is active
  const isIdeasActive = activeView === "ideas:all" || activeView.startsWith("ideas:folder:");

  const submitFolder = () => {
    if (folderSubmittedRef.current) return; // guard against double-fire
    const name = newFolderName.trim();
    if (!name) { setAddingFolder(false); return; }
    folderSubmittedRef.current = true;
    onAddFolder?.(name);
    setNewFolderName("");
    setAddingFolder(false);
  };

  const dismissFolder = () => {
    // Blur: only dismiss, do NOT save (avoids double-call with Enter)
    setAddingFolder(false);
    setNewFolderName("");
  };

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
      ...AREA_VIEWS.map(v => v.id),
      ...ARCHIVE_VIEWS.map(v => v.id),
      "backlog",
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
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 12px", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>

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

        {/* Backlog */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Backlog</SectionLabel>
          {renderItem("backlog", "All Backlog", "📋")}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Agents */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Agents</SectionLabel>
          {renderItem("agent:unassigned", "Denver", "◈")}
          {agents.map(a => {
            const id = `agent:${a.id}`;
            const isActive = activeView === id;
            // Task-derived status (reliable -- no heartbeat dependency)
            const taskStatus = getAgentTaskStatus(a.id, tasks);
            const dot = TASK_STATUS_DOT[taskStatus];
            const count = counts[id] || 0;
            // Find the in_progress task number for working agents
            const activeTask = taskStatus === "working"
              ? tasks.find(t => t.assignee_agent_id === a.id && t.status === "in_progress")
              : null;
            return (
              <div key={id} style={{ position: "relative", display: "flex", alignItems: "center" }}
                className="agent-row">
                <button
                  onClick={() => onViewChange(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    flex: 1, padding: "10px 12px",
                    background: isActive ? "rgba(201,169,110,0.14)" : "transparent",
                    border: "none", borderRadius: 8, cursor: "pointer",
                    color: isActive ? "#c9a96e" : "#c8c8c8",
                    fontSize: 16, textAlign: "left",
                    transition: "background 0.1s, color 0.1s",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {/* Status dot -- derived from task data */}
                  <span title={taskStatus + (activeTask ? `: #${activeTask.task_number} ${activeTask.title}` : "")} style={{
                    width: 20, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{
                      display: "inline-block",
                      width: 7, height: 7, borderRadius: "50%",
                      background: dot.color,
                      boxShadow: dot.glow,
                      flexShrink: 0,
                      transition: "background 0.3s, box-shadow 0.3s",
                    }} />
                  </span>
                  <span style={{
                    flex: 1, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {a.display_name}
                    {activeTask && (
                      <span style={{ fontSize: 10, color: "#10b981", marginLeft: 6 }}>
                        #{activeTask.task_number}
                      </span>
                    )}
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
                {/* Wake button */}
                {onWakeAgent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onWakeAgent(a.name); }}
                    title={`Wake ${a.display_name}`}
                    style={{
                      background: "none", border: "none",
                      color: "#333", fontSize: 10,
                      cursor: "pointer", padding: "6px 8px",
                      flexShrink: 0, lineHeight: 1,
                      borderRadius: 6,
                      transition: "color 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#10b981"}
                    onMouseLeave={e => e.currentTarget.style.color = "#333"}
                  >
                    ▶
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Ideas */}
        <div style={{ marginBottom: 8 }}>
          {/* Section header -- clickable to collapse */}
          <button
            onClick={() => setIdeasOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%",
              padding: "0 12px 2px",
              background: "none", border: "none",
              cursor: "pointer",
            }}
          >
            <span style={{
              fontSize: 11, color: isIdeasActive ? "#c9a96e" : "#555",
              letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase",
            }}>
              Ideas
            </span>
            <span style={{
              fontSize: 10, color: "#333",
              transform: ideasOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              display: "inline-block",
            }}>
              ▶
            </span>
          </button>

          {ideasOpen && (
            <>
              {/* All Ideas */}
              {renderItem("ideas:all", "All Ideas", "💡")}

              {/* Folders */}
              {folders.map(folder => {
                const id = `ideas:folder:${folder.id}`;
                const isActive = activeView === id;
                const count = ideasCount?.[folder.id] || 0;
                return (
                  <div
                    key={id}
                    className="folder-row"
                    style={{ position: "relative", display: "flex", alignItems: "center" }}
                  >
                    <button
                      onClick={() => onViewChange(id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        flex: 1, padding: "9px 4px 9px 14px",
                        background: isActive ? "rgba(201,169,110,0.14)" : "transparent",
                        border: "none", borderRadius: 8, cursor: "pointer",
                        color: isActive ? "#c9a96e" : "#999",
                        fontSize: 15, textAlign: "left",
                        transition: "background 0.1s, color 0.1s",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <span style={{ width: 20, textAlign: "center", fontSize: 11, color: "#444", flexShrink: 0 }}>
                        ▸
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {folder.name}
                      </span>
                      {count > 0 && (
                        <span style={{ fontSize: 13, color: isActive ? "#c9a96e" : "#555", flexShrink: 0, paddingRight: 4 }}>
                          {count}
                        </span>
                      )}
                    </button>
                    {/* Delete folder button -- shown on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = count > 0
                          ? `Delete "${folder.name}"? The ${count} idea${count > 1 ? "s" : ""} inside will be unfoldered.`
                          : `Delete folder "${folder.name}"?`;
                        if (confirm(msg)) {
                          // If this folder is active, navigate away first
                          if (isActive) onViewChange("ideas:all");
                          onDeleteFolder?.(folder.id);
                        }
                      }}
                      title="Delete folder"
                      style={{
                        background: "none", border: "none",
                        color: "#2a2a2a", fontSize: 14,
                        cursor: "pointer", padding: "6px 8px",
                        flexShrink: 0, lineHeight: 1,
                        borderRadius: 6,
                        transition: "color 0.1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "#2a2a2a"}
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Add folder input */}
              {addingFolder ? (
                <div style={{ padding: "4px 12px", display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={e => { setNewFolderName(e.target.value); folderSubmittedRef.current = false; }}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitFolder();
                      if (e.key === "Escape") dismissFolder();
                    }}
                    onBlur={dismissFolder}
                    placeholder="Folder name..."
                    style={{
                      flex: 1,
                      background: "#1a1a1a", border: "1px solid #333",
                      borderRadius: 6, outline: "none",
                      color: "#f0f0f0", fontSize: 14,
                      padding: "7px 10px",
                    }}
                  />
                  <button
                    onTouchStart={e => { e.preventDefault(); submitFolder(); }}
                    onMouseDown={e => { e.preventDefault(); submitFolder(); }} // mousedown fires before blur on desktop
                    style={{
                      background: "#c9a96e", border: "none",
                      borderRadius: 6, color: "#000",
                      fontSize: 13, fontWeight: 600,
                      padding: "0 10px", cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { folderSubmittedRef.current = false; setAddingFolder(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "8px 12px",
                    background: "none", border: "none",
                    cursor: "pointer", color: "#333",
                    fontSize: 13, textAlign: "left",
                    transition: "color 0.1s",
                    borderRadius: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#666"}
                  onMouseLeave={e => e.currentTarget.style.color = "#333"}
                >
                  <span style={{ width: 20, textAlign: "center", flexShrink: 0 }}>+</span>
                  New Folder
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Areas */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Areas</SectionLabel>
          {AREA_VIEWS.map(v => renderItem(v.id, v.label, null))}
        </div>

        <div style={{ height: 1, background: "#161616", margin: "6px 8px 10px" }} />

        {/* Archive */}
        <div>
          <SectionLabel>Archive</SectionLabel>
          {ARCHIVE_VIEWS.map(v => renderItem(v.id, v.label, null))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{
        padding: "10px 8px",
        borderTop: "1px solid #161616",
        flexShrink: 0,
      }}>
        {/* Health dashboard */}
        {onDashOpen && (
          <button
            onClick={() => { onDashOpen(); onClose?.(); }}
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
              color: "#555",
              fontSize: 14,
              textAlign: "left",
              transition: "color 0.1s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#c9a96e"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#555"}
          >
            <span style={{ width: 20, textAlign: "center", fontSize: 14, flexShrink: 0 }}>◉</span>
            Dashboard
          </button>
        )}
        {/* Sign out */}
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
