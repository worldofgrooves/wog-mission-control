"use client";
import { useState, useRef } from "react";
import { PRI_COLOR, PRI_ORDER, STATUS_COLOR, STATUS_LABEL, BRAND_LABEL } from "./MCApp";

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, agents, isSelected, onSelect, onToggleComplete, onToggleStar }) {
  const [hovered, setHovered] = useState(false);
  const isDone = task.status === "done";

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: isSelected ? "#141414" : hovered ? "#0c0c0c" : "transparent",
        cursor: "pointer",
        borderLeft: isSelected ? "2px solid #c9a96e" : "2px solid transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Complete circle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: isDone
            ? "2px solid #10b981"
            : `2px solid ${PRI_COLOR[task.priority] || "#444"}`,
          background: isDone ? "#10b981" : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {isDone && (
          <span style={{ color: "#000", fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          color: isDone ? "#444" : "#e8e8e8",
          textDecoration: isDone ? "line-through" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.4,
        }}>
          {task.title}
        </div>

        {/* Meta row */}
        {(showStatus || agent || deadlineMeta || (task.brand && task.brand !== "shared")) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
            flexWrap: "nowrap",
            overflow: "hidden",
          }}>
            {showStatus && (
              <span style={{
                fontSize: 10,
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
              <span style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>
                {agent.display_name || agent.name}
              </span>
            )}
            {deadlineMeta && (
              <span style={{ fontSize: 11, color: deadlineMeta.color, flexShrink: 0 }}>
                {deadlineMeta.text}
              </span>
            )}
            {task.brand && task.brand !== "shared" && (
              <span style={{
                fontSize: 10,
                color: "#3a3a3a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {BRAND_LABEL[task.brand] || task.brand}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar(task); }}
        style={{
          background: "none",
          border: "none",
          color: task.priority === "immediate"
            ? "#c9a96e"
            : hovered ? "#2a2a2a" : "transparent",
          cursor: "pointer",
          fontSize: 15,
          flexShrink: 0,
          padding: "2px 4px",
          transition: "color 0.12s",
          lineHeight: 1,
        }}
      >
        ★
      </button>
    </div>
  );
}

// ─── Task List ────────────────────────────────────────────────────────────────

export default function TaskList({
  tasks,
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
}) {
  const [captureText, setCaptureText] = useState("");
  const [showDone, setShowDone]       = useState(false);
  const inputRef = useRef(null);

  const activeTasks = tasks.filter(t => t.status !== "done");
  const doneTasks   = tasks.filter(t => t.status === "done");

  // Sort active: priority first, then position, then created_at
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
      {/* Header */}
      <div style={{
        padding: "20px 16px 12px",
        borderBottom: "1px solid #161616",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        {isMobile && (
          <button
            onClick={onMenuOpen}
            style={{
              background: "none", border: "none",
              color: "#555", fontSize: 18, cursor: "pointer",
              padding: "0 2px", lineHeight: 1, flexShrink: 0,
            }}
          >
            ☰
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#f0f0f0",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {viewTitle}
          </h1>
          {activeTasks.length > 0 && (
            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
              {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Quick capture */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid #0f0f0f",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#0d0d0d",
          borderRadius: 8,
          padding: "8px 12px",
          border: "1px solid #1a1a1a",
          transition: "border-color 0.15s",
        }}>
          <span style={{ color: "#444", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>+</span>
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
              fontSize: 13,
            }}
          />
          {captureText && (
            <span style={{ fontSize: 11, color: "#444" }}>↵</span>
          )}
        </div>
      </div>

      {/* Task rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {sorted.length === 0 && doneTasks.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#2a2a2a",
            fontSize: 13,
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

        {/* Completed section */}
        {doneTasks.length > 0 && (
          <div style={{ marginTop: sorted.length > 0 ? 8 : 0 }}>
            <button
              onClick={() => setShowDone(!showDone)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "none",
                border: "none",
                color: "#444",
                fontSize: 12,
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <span style={{
                display: "inline-block",
                transform: showDone ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
                fontSize: 9,
              }}>
                ▶
              </span>
              Completed ({doneTasks.length})
            </button>
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
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
