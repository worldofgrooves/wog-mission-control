"use client";
import { useState, useCallback } from "react";
import { STATUS_COLOR, STATUS_LABEL, PRI_COLOR, BRAND_LABEL } from "./MCApp";

// ─── Column order ──────────────────────────────────────────────────────────────

const COLUMNS = [
  "inbox",
  "assigned",
  "in_progress",
  "blocked",
  "review",
  "waiting_on_denver",
  "done",
];

const DEPT_COLOR = {
  content:    "#ec4899",
  research:   "#f59e0b",
  operations: "#6366f1",
  build:      "#06b6d4",
};

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ task, agents, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const agent = task.mc_agents || agents.find(a => a.id === task.assignee_agent_id);
  const priColor     = PRI_COLOR[task.priority] || "#444";
  const agentColor   = DEPT_COLOR[agent?.department] || "#555";
  const agentInitials = agent?.display_name?.slice(0, 2).toUpperCase() || null;
  const isDone = task.status === "done";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onSelect(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSelected ? "#2a2a2a" : hovered ? "#232323" : "#1c1c1c",
        border: isSelected
          ? "1px solid rgba(201,169,110,0.3)"
          : "1px solid transparent",
        borderRadius: 8,
        padding: "10px 11px",
        cursor: "grab",
        marginBottom: 5,
        transition: "background 0.1s, border-color 0.1s",
        userSelect: "none",
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: 13,
        color: isDone ? "#444" : "#e4e4e4",
        textDecoration: isDone ? "line-through" : "none",
        lineHeight: 1.45,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        marginBottom: agent || task.brand ? 8 : 0,
      }}>
        {task.title}
      </div>

      {/* Footer: priority dot + brand + task # + assignee */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
          {/* Priority dot */}
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: priColor, flexShrink: 0, display: "inline-block",
          }} />
          {/* Brand */}
          {task.brand && task.brand !== "shared" && (
            <span style={{
              fontSize: 10, color: "#3a3a3a",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {BRAND_LABEL[task.brand] || task.brand}
            </span>
          )}
          {/* Task number */}
          <span style={{ fontSize: 10, color: "#2e2e2e", flexShrink: 0 }}>
            #{task.task_number}
          </span>
        </div>

        {/* Assignee initials bubble */}
        {agentInitials && (
          <div style={{
            width: 20, height: 20, borderRadius: 4, flexShrink: 0,
            background: `${agentColor}18`,
            border: `1px solid ${agentColor}38`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: agentColor, letterSpacing: -0.3 }}>
              {agentInitials}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ status, tasks, agents, selectedId, onTaskSelect, onStatusChange }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const color = STATUS_COLOR[status] || "#555";
  const label = STATUS_LABEL[status] || status;

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) onStatusChange(taskId, status);
  }, [status, onStatusChange]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: 248,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: isDragOver ? "#141414" : "#0d0d0d",
        borderRadius: 10,
        border: `1px solid ${isDragOver ? color + "55" : "#1a1a1a"}`,
        overflow: "hidden",
        transition: "background 0.12s, border-color 0.12s",
        // Columns fill the height of the board row
        maxHeight: "100%",
      }}
    >
      {/* Column header */}
      <div style={{
        padding: "10px 12px 9px",
        borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 7,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: color, flexShrink: 0, display: "inline-block",
          boxShadow: isDragOver ? `0 0 6px ${color}` : "none",
          transition: "box-shadow 0.12s",
        }} />
        <span style={{
          fontSize: 10, color: "#505050",
          letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase",
          flex: 1,
        }}>
          {label}
        </span>
        {tasks.length > 0 && (
          <span style={{
            fontSize: 11, color: "#2e2e2e",
            background: "#161616",
            padding: "1px 7px", borderRadius: 10,
          }}>
            {tasks.length}
          </span>
        )}
      </div>

      {/* Cards scroll area */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "7px 7px",
        // Drop target hint when empty
        minHeight: 52,
      }}>
        {tasks.length === 0 && (
          <div style={{
            height: 44,
            border: `1px dashed ${isDragOver ? color + "33" : "#191919"}`,
            borderRadius: 6,
            transition: "border-color 0.12s",
          }} />
        )}
        {tasks.map(t => (
          <KanbanCard
            key={t.id}
            task={t}
            agents={agents}
            isSelected={t.id === selectedId}
            onSelect={onTaskSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Kanban Board ──────────────────────────────────────────────────────────────

export default function KanbanBoard({ tasks, agents, selectedId, onTaskSelect, onStatusChange }) {
  // Group tasks by status
  const grouped = {};
  for (const col of COLUMNS) grouped[col] = [];
  for (const t of tasks) {
    if (grouped[t.status] !== undefined) {
      grouped[t.status].push(t);
    } else {
      grouped["inbox"].push(t); // fallback for unknown status
    }
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      padding: "14px 16px 16px",
      overflowX: "auto",
      overflowY: "hidden",
      height: "100%",
    }}>
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col}
          status={col}
          tasks={grouped[col]}
          agents={agents}
          selectedId={selectedId}
          onTaskSelect={onTaskSelect}
          onStatusChange={onStatusChange}
        />
      ))}
      {/* Trailing spacer so last column isn't flush against the edge */}
      <div style={{ width: 4, flexShrink: 0 }} />
    </div>
  );
}
