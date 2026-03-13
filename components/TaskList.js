"use client";
import { useState, useRef, useEffect } from "react";
import { PRI_COLOR, PRI_ORDER, STATUS_COLOR, STATUS_LABEL, BRAND_LABEL } from "./MCApp";

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskRow({ task, agents, isSelected, onSelect, onToggleComplete, onToggleStar }) {
  const isDone      = task.status === "done";
  const isImportant = task.priority === "immediate";

  const agent = task.mc_agents || agents.find(a => a.id === task.assignee_agent_id);

  const deadlineMeta = task.deadline_at ? (() => {
    const d    = new Date(task.deadline_at);
    const now  = new Date();
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (d.toDateString() === now.toDateString()) return { text: "Today",    color: "#f59e0b" };
    if (diff === 1)                              return { text: "Tomorrow", color: "#f59e0b" };
    if (diff < 0)                               return { text: `${Math.abs(diff)}d overdue`, color: "#ef4444" };
    if (diff <= 7)                              return { text: `${diff}d`,  color: "#888" };
    return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#555" };
  })() : null;

  const showStatus = task.status !== "inbox" && task.status !== "done";

  return (
    <div
      onClick={() => onSelect(task)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 14px",
        background: isSelected ? "#2a2a2a" : "#1c1c1c",
        cursor: "pointer",
        borderRadius: 10,
        margin: "0 12px 5px",
        border: isSelected ? "1px solid rgba(201,169,110,0.25)" : "1px solid transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Complete circle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: isDone
            ? "2px solid #10b981"
            : `2px solid ${PRI_COLOR[task.priority] || "#555"}`,
          background: isDone ? "#10b981" : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {isDone && <span style={{ color: "#000", fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 16,
          color: isDone ? "#444" : "#f0f0f0",
          textDecoration: isDone ? "line-through" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.4,
        }}>
          {task.title}
        </div>

        {/* Meta */}
        {(showStatus || agent || deadlineMeta || (task.brand && task.brand !== "shared")) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 3,
            overflow: "hidden",
          }}>
            {showStatus && (
              <span style={{
                fontSize: 11,
                color: STATUS_COLOR[task.status] || "#666",
                background: `${STATUS_COLOR[task.status]}1a`,
                padding: "1px 5px",
                borderRadius: 3,
                flexShrink: 0,
              }}>
                {STATUS_LABEL[task.status]}
              </span>
            )}
            {agent && (
              <span style={{ fontSize: 12, color: "#666", flexShrink: 0 }}>
                {agent.display_name || agent.name}
              </span>
            )}
            {deadlineMeta && (
              <span style={{ fontSize: 12, color: deadlineMeta.color, flexShrink: 0 }}>
                {deadlineMeta.text}
              </span>
            )}
            {task.brand && task.brand !== "shared" && (
              <span style={{
                fontSize: 11,
                color: "#444",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {BRAND_LABEL[task.brand] || task.brand}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Star -- always visible: outline normally, filled when important */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar(task); }}
        style={{
          background: "none",
          border: "none",
          color: isImportant ? "#c9a96e" : "#3a3a3a",
          cursor: "pointer",
          fontSize: 19,
          flexShrink: 0,
          padding: "4px 4px",
          transition: "color 0.12s",
          lineHeight: 1,
        }}
      >
        {isImportant ? "★" : "☆"}
      </button>
    </div>
  );
}

// ─── Task List ────────────────────────────────────────────────────────────────

export default function TaskList({
  tasks,
  completedTasks = [],
  viewTitle,
  activeView,
  agents,
  selectedId,
  isMobile,
  onTaskSelect,
  onToggleComplete,
  onToggleStar,
  onQuickCapture,
  onMenuOpen,
  onAgentProfile,
}) {
  const [captureText, setCaptureText] = useState("");
  const [showDone, setShowDone]       = useState(false);
  const inputRef = useRef(null);

  // Collapse completed section whenever the view changes
  useEffect(() => { setShowDone(false); }, [activeView]);

  // tasks prop only contains active tasks (filtered by MCApp)
  // completedTasks is passed separately for agent views
  const activeTasks = tasks;
  const doneTasks   = completedTasks;

  const sorted = [...activeTasks].sort((a, b) => {
    const pA = PRI_ORDER[a.priority] ?? 3;
    const pB = PRI_ORDER[b.priority] ?? 3;
    if (pA !== pB) return pA - pB;
    const posA = a.position ?? 9999;
    const posB = b.position ?? 9999;
    if (posA !== posB) return posA - posB;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const handleCapture = (e) => {
    if (e.key === "Enter" && captureText.trim()) {
      onQuickCapture(captureText.trim());
      setCaptureText("");
    }
    if (e.key === "Escape") {
      setCaptureText("");
      inputRef.current?.blur();
    }
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#000",
    }}>
      {/* ── Header ── */}
      <div style={{ padding: "24px 20px 10px", flexShrink: 0 }}>
        {isMobile && (
          <button
            onClick={onMenuOpen}
            style={{
              background: "none", border: "none",
              color: "#f0f0f0", fontSize: 26, cursor: "pointer",
              padding: 0, marginBottom: 10, display: "block",
              lineHeight: 1,
            }}
          >
            ☰
          </button>
        )}
        <h1 style={{
          fontSize: 34,
          fontWeight: 700,
          color: "#c9a96e",
          margin: 0,
          lineHeight: 1.15,
          letterSpacing: -0.5,
        }}>
          {viewTitle}
        </h1>

        {/* Agent profile trigger -- only on agent views with a real agent */}
        {(() => {
          if (!activeView.startsWith("agent:")) return null;
          const agentPart = activeView.slice(6);
          if (agentPart === "unassigned" || agentPart.endsWith(":done")) return null;
          const agent = agents.find(a => a.id === agentPart);
          if (!agent) return null;
          return (
            <button
              onClick={() => onAgentProfile?.(agentPart)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                marginTop: 8, padding: "5px 12px",
                background: "transparent",
                border: "1px solid #2a2a2a",
                borderRadius: 20, cursor: "pointer",
                color: "#666", fontSize: 12,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#999"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#666"; }}
            >
              <span style={{ fontSize: 10 }}>◉</span>
              {agent.role}
              <span style={{ fontSize: 11 }}>›</span>
            </button>
          );
        })()}
      </div>

      {/* ── Scrollable task list ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 6 }}>

        {sorted.length === 0 && doneTasks.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#252525",
            fontSize: 14,
          }}>
            No tasks here.
          </div>
        )}

        {sorted.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            agents={agents}
            isSelected={task.id === selectedId}
            onSelect={onTaskSelect}
            onToggleComplete={onToggleComplete}
            onToggleStar={onToggleStar}
          />
        ))}

        {/* Completed -- pill button */}
        {doneTasks.length > 0 && (
          <div style={{ padding: "10px 12px 4px" }}>
            <button
              onClick={() => setShowDone(!showDone)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "#1a1a1a",
                border: "none",
                borderRadius: 22,
                color: "#777",
                fontSize: 14,
                cursor: "pointer",
                transition: "background 0.1s",
              }}
            >
              <span style={{
                display: "inline-block",
                transform: showDone ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
                fontSize: 10,
              }}>
                ▶
              </span>
              Completed ({doneTasks.length})
            </button>
          </div>
        )}

        {showDone && doneTasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            agents={agents}
            isSelected={task.id === selectedId}
            onSelect={onTaskSelect}
            onToggleComplete={onToggleComplete}
            onToggleStar={onToggleStar}
          />
        ))}

        <div style={{ height: 12 }} />
      </div>

      {/* ── Fixed bottom capture bar ── */}
      <div style={{
        flexShrink: 0,
        padding: "8px 12px 14px",
        background: "#000",
        borderTop: "1px solid #1a1a1a",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "#1c1c1c",
          borderRadius: 10,
          padding: "14px 14px",
          border: "1px solid transparent",
        }}>
          <span style={{
            color: "#c9a96e",
            fontSize: 24,
            lineHeight: 1,
            flexShrink: 0,
            fontWeight: 300,
          }}>
            +
          </span>
          <input
            ref={inputRef}
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            onKeyDown={handleCapture}
            placeholder="Add a task"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#f0f0f0",
              fontSize: 16,
            }}
          />
          {captureText && (
            <span style={{ fontSize: 12, color: "#555", flexShrink: 0 }}>↵</span>
          )}
        </div>
      </div>
    </div>
  );
}
