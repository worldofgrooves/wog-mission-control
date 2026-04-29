"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { PRI_COLOR, PRI_ORDER, STATUS_COLOR, STATUS_LABEL, BRAND_LABEL, AREA_LABEL } from "./MCApp";
import KanbanBoard from "./KanbanBoard";

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskRow({ task, agents, isSelected, onSelect, onToggleComplete, onToggleStar, onToggleMyDay, onWakeTask }) {
  const isDone      = task.status === "done";
  const isImportant = task.priority === "immediate";

  const agent = task.mc_agents || agents.find(a => a.id === task.assignee_agent_id);
  // Unassigned tasks belong to Denver -- show his name in the meta row
  const assigneeLabel = agent ? (agent.display_name || agent.name) : (!task.assignee_agent_id ? "Denver" : null);

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
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.4,
        }}>
          {task.title}
        </div>

        {/* Meta */}
        {(showStatus || assigneeLabel || deadlineMeta || task.flagged_today || (task.brand && task.brand !== "shared")) && (
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
            {assigneeLabel && (
              <span style={{ fontSize: 12, color: "#666", flexShrink: 0 }}>
                {assigneeLabel}
              </span>
            )}
            {task.flagged_today && !deadlineMeta && (
              <span style={{ fontSize: 11, color: "#f59e0b", flexShrink: 0 }}>My Day</span>
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

      {/* My Day sun -- lit when flagged_today */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleMyDay?.(task); }}
        title={task.flagged_today ? "Remove from My Day" : "Add to My Day"}
        style={{
          background: "none",
          border: "none",
          color: task.flagged_today ? "#f59e0b" : "#2a2a2a",
          cursor: "pointer",
          fontSize: 17,
          flexShrink: 0,
          padding: "4px 2px",
          transition: "color 0.12s",
          lineHeight: 1,
        }}
        onMouseEnter={e => { if (!task.flagged_today) e.currentTarget.style.color = "#f59e0b"; }}
        onMouseLeave={e => { if (!task.flagged_today) e.currentTarget.style.color = "#2a2a2a"; }}
      >
        ☀︎
      </button>

      {/* Play button -- only on tasks assigned to an agent, not done */}
      {onWakeTask && task.assignee_agent_id && !isDone && (
        <button
          onClick={(e) => { e.stopPropagation(); onWakeTask(task); }}
          title="Send to agent now"
          style={{
            background: "none",
            border: "none",
            color: "#2a2a2a",
            cursor: "pointer",
            fontSize: 18,
            flexShrink: 0,
            padding: "4px 3px",
            transition: "color 0.12s",
            lineHeight: 1,
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#10b981"}
          onMouseLeave={e => e.currentTarget.style.color = "#2a2a2a"}
        >
          ▶
        </button>
      )}

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
        onMouseEnter={e => { if (!isImportant) e.currentTarget.style.color = "#c9a96e"; }}
        onMouseLeave={e => { if (!isImportant) e.currentTarget.style.color = "#3a3a3a"; }}
      >
        {isImportant ? "★" : "☆"}
      </button>
    </div>
  );
}

// ─── Drag Handle ──────────────────────────────────────────────────────────────

function DragHandle({ onPointerDown }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        color: "#333",
        fontSize: 16,
        cursor: "grab",
        flexShrink: 0,
        lineHeight: 1,
        userSelect: "none",
        touchAction: "none",      // critical: tells browser not to scroll on this element
        padding: "0 6px 0 10px",
        display: "flex",
        alignItems: "center",
        alignSelf: "stretch",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "#666"}
      onMouseLeave={e => e.currentTarget.style.color = "#333"}
    >
      ⠿
    </div>
  );
}

// ─── View toggle (list / board) ───────────────────────────────────────────────

function ViewToggle({ viewMode, onChange }) {
  const btn = (mode, icon, label) => {
    const active = viewMode === mode;
    return (
      <button
        onClick={() => onChange(mode)}
        title={label}
        style={{
          background: active ? "#2a2a2a" : "transparent",
          border: "none",
          borderRadius: 6,
          padding: "5px 8px",
          cursor: "pointer",
          color: active ? "#c9a96e" : "#444",
          fontSize: 16,
          lineHeight: 1,
          transition: "background 0.1s, color 0.1s",
        }}
      >
        {icon}
      </button>
    );
  };
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: "#111",
      border: "1px solid #1e1e1e",
      borderRadius: 8,
      padding: 2,
      gap: 1,
      flexShrink: 0,
    }}>
      {btn("list",  "≡", "List view")}
      {btn("board", "⊞", "Board view")}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ label, count, color = "#666" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "16px 24px 6px",
    }}>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color,
        letterSpacing: 0.5,
      }}>
        {label}
      </span>
      {count > 0 && (
        <span style={{
          fontSize: 12,
          color: "#444",
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Time-based grouping for Planned view ───────────────────────────────────

function groupByTimeHorizon(tasks) {
  const now     = new Date();
  const todayS  = now.toDateString();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - now.getDay()));
  weekEnd.setHours(23, 59, 59, 999);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const groups = {
    overdue:   { label: "Overdue",   color: "#ef4444", tasks: [] },
    today:     { label: "Today",     color: "#f59e0b", tasks: [] },
    thisWeek:  { label: "This Week", color: "#c9a96e", tasks: [] },
    thisMonth: { label: "This Month",color: "#888",    tasks: [] },
    later:     { label: "Later",     color: "#555",    tasks: [] },
    unplanned: { label: "Unplanned", color: "#333",    tasks: [] },
  };

  for (const task of tasks) {
    const hasDL = !!task.deadline_at;
    const dl    = hasDL ? new Date(task.deadline_at) : null;

    if (hasDL && dl < now && dl.toDateString() !== todayS) {
      groups.overdue.tasks.push(task);
    } else if (task.flagged_today || (hasDL && dl.toDateString() === todayS)) {
      groups.today.tasks.push(task);
    } else if (hasDL && dl >= now && dl <= weekEnd) {
      groups.thisWeek.tasks.push(task);
    } else if (hasDL && dl > weekEnd && dl <= monthEnd) {
      groups.thisMonth.tasks.push(task);
    } else if (hasDL && dl > monthEnd) {
      groups.later.tasks.push(task);
    } else {
      groups.unplanned.tasks.push(task);
    }
  }

  return Object.values(groups).filter(g => g.tasks.length > 0);
}

// ─── Group by Area (for Backlog view) ────────────────────────────────────────

function groupByArea(tasks) {
  const areaOrder = ["wog", "plume", "house", "studio", "personal", "shared", "groove_dwellers", "artifact"];
  const groups = {};

  for (const task of tasks) {
    const area = task.brand || "shared";
    if (!groups[area]) groups[area] = { label: AREA_LABEL[area] || area, tasks: [] };
    groups[area].tasks.push(task);
  }

  const ordered = areaOrder.filter(a => groups[a]).map(a => groups[a]);
  const remaining = Object.keys(groups).filter(a => !areaOrder.includes(a));
  for (const a of remaining) ordered.push(groups[a]);
  return ordered;
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
  onToggleMyDay,
  onQuickCapture,
  onMenuOpen,
  onAgentProfile,
  onStatusChange,
  onReorder,
  onWakeTask,
}) {
  const [captureText, setCaptureText] = useState("");
  const [showDone, setShowDone]       = useState(false);
  const [viewMode,  setViewMode]      = useState("list");
  const [dropIdx,   setDropIdx]       = useState(null);

  // Drag state refs (not state -- we don't want re-renders on every drag event)
  const dragFromIdx  = useRef(null);   // index being dragged
  const dropIdxRef   = useRef(null);   // current drop target (mirrors state for use in listeners)
  const itemRefs     = useRef([]);     // DOM refs for each draggable row wrapper
  const sortedRef    = useRef([]);     // current sorted list (for use in event listeners)
  const isDragging   = useRef(false);  // true during an active pointer drag

  const inputRef = useRef(null);

  // Keep dropIdxRef in sync with state
  useEffect(() => { dropIdxRef.current = dropIdx; }, [dropIdx]);

  // Collapse completed section whenever the view changes
  useEffect(() => { setShowDone(false); }, [activeView]);

  // tasks prop only contains active tasks (filtered by MCApp)
  // completedTasks is passed separately for agent views
  const activeTasks = tasks;
  const doneTasks   = completedTasks;

  const isAgentView = activeView.startsWith("agent:");
  const sorted = [...activeTasks].sort((a, b) => {
    // sort_order is authoritative across all views -- drag order always wins
    const sA = a.sort_order, sB = b.sort_order;
    if (sA != null && sB != null) return sA - sB;
    if (sA != null) return -1;
    if (sB != null) return 1;
    // Fallback when neither task has a sort_order yet
    if (isAgentView) {
      // Agent views: fall back to task number (queue order)
      return (a.task_number || 0) - (b.task_number || 0);
    }
    // All other views: fall back to priority, then newest first
    const pA = PRI_ORDER[a.priority] ?? 3, pB = PRI_ORDER[b.priority] ?? 3;
    if (pA !== pB) return pA - pB;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Keep sortedRef up to date
  useEffect(() => { sortedRef.current = sorted; });

  // ── Unified pointer drag (works for both mouse and touch) ──────────────────
  // We use Pointer Events API: pointerdown on drag handle, pointermove/up on document.
  // Pointer events are the modern unified API (mouse + touch + stylus).
  // Using { passive: false } on pointermove lets us call preventDefault() to block scroll.

  const commitDrag = useCallback(() => {
    const from = dragFromIdx.current;
    const to   = dropIdxRef.current;

    // Reset visual state on the dragged item
    if (itemRefs.current[from]) {
      itemRefs.current[from].style.opacity = "1";
      itemRefs.current[from].style.transform = "";
    }

    dragFromIdx.current = null;
    isDragging.current  = false;
    setDropIdx(null);

    if (to !== null && to !== from) {
      const reordered = [...sortedRef.current];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      onReorder?.(reordered);
    }
  }, [onReorder]);

  useEffect(() => {
    if (!onReorder) return;

    const onPointerMove = (e) => {
      if (dragFromIdx.current === null) return;
      e.preventDefault(); // blocks scroll during drag -- only works with passive: false

      isDragging.current = true;

      // Dim the dragging row
      if (itemRefs.current[dragFromIdx.current]) {
        itemRefs.current[dragFromIdx.current].style.opacity = "0.4";
      }

      // Find which row the pointer is over
      const y = e.clientY;
      let target = null;
      itemRefs.current.forEach((ref, i) => {
        if (!ref || i === dragFromIdx.current) return;
        const rect = ref.getBoundingClientRect();
        if (y >= rect.top && y < rect.bottom) target = i;
      });

      if (target !== null && target !== dropIdxRef.current) {
        setDropIdx(target);
      }
    };

    const onPointerUp = () => {
      if (dragFromIdx.current === null) return;
      commitDrag();
    };

    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup",   onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup",   onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onReorder, commitDrag]);

  const submitCapture = () => {
    if (!captureText.trim()) return;
    onQuickCapture(captureText.trim());
    setCaptureText("");
    inputRef.current?.focus();
  };

  const handleCapture = (e) => {
    if (e.key === "Enter") submitCapture();
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
        {/* Title row -- toggle only on desktop */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
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
          {!isMobile && (
            <div style={{ paddingTop: 6 }}>
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            </div>
          )}
        </div>

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

      {/* ── Board view ── */}
      {viewMode === "board" && (
        <KanbanBoard
          tasks={[...tasks, ...completedTasks]}
          agents={agents}
          selectedId={selectedId}
          onTaskSelect={onTaskSelect}
          onStatusChange={onStatusChange}
        />
      )}

      {/* ── Scrollable task list (list mode only) ── */}
      {viewMode === "list" && <div style={{ flex: 1, overflowY: "auto", paddingTop: 6 }}>

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

        {/* Grouped rendering for Planned view (by time horizon) */}
        {activeView === "all" && sorted.length > 0 && (() => {
          const groups = groupByTimeHorizon(sorted);
          return groups.map(group => (
            <div key={group.label}>
              <SectionHeader label={group.label} count={group.tasks.length} color={group.color} />
              {group.tasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TaskRow
                      task={task}
                      agents={agents}
                      isSelected={task.id === selectedId}
                      onSelect={onTaskSelect}
                      onToggleComplete={onToggleComplete}
                      onToggleStar={onToggleStar}
                      onToggleMyDay={onToggleMyDay}
                      onWakeTask={onWakeTask}
                    />
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}

        {/* Grouped rendering for Backlog view (by area) */}
        {activeView === "backlog" && sorted.length > 0 && (() => {
          const groups = groupByArea(sorted);
          return groups.map(group => (
            <div key={group.label}>
              <SectionHeader label={group.label} count={group.tasks.length} />
              {group.tasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TaskRow
                      task={task}
                      agents={agents}
                      isSelected={task.id === selectedId}
                      onSelect={onTaskSelect}
                      onToggleComplete={onToggleComplete}
                      onToggleStar={onToggleStar}
                      onToggleMyDay={onToggleMyDay}
                      onWakeTask={onWakeTask}
                    />
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}

        {/* Flat rendering for all other views */}
        {activeView !== "all" && activeView !== "backlog" && sorted.map((task, idx) => {
          const showDropLine = dropIdx === idx && dragFromIdx.current !== null && dragFromIdx.current !== idx;

          return (
            <div
              key={task.id}
              ref={el => { itemRefs.current[idx] = el; }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
              }}
            >
              {showDropLine && (
                <div style={{
                  position: "absolute",
                  top: 0, left: 24, right: 24,
                  height: 2,
                  background: "#c9a96e",
                  borderRadius: 1,
                  zIndex: 10,
                  pointerEvents: "none",
                }} />
              )}

              {onReorder && (
                <DragHandle
                  onPointerDown={(e) => {
                    if (e.button !== undefined && e.button !== 0) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    dragFromIdx.current = idx;
                    isDragging.current  = false;
                  }}
                />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <TaskRow
                  task={task}
                  agents={agents}
                  isSelected={task.id === selectedId}
                  onSelect={(t) => {
                    if (isDragging.current) { isDragging.current = false; return; }
                    onTaskSelect(t);
                  }}
                  onToggleComplete={onToggleComplete}
                  onToggleStar={onToggleStar}
                  onToggleMyDay={onToggleMyDay}
                  onWakeTask={onWakeTask}
                />
              </div>
            </div>
          );
        })}

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
            onToggleMyDay={onToggleMyDay}
          />
        ))}

        <div style={{ height: 12 }} />
      </div>}

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
            <button
              onMouseDown={e => { e.preventDefault(); submitCapture(); }}
              onTouchStart={e => { e.preventDefault(); submitCapture(); }}
              style={{
                background: "none", border: "none",
                color: "#c9a96e", fontSize: 22,
                cursor: "pointer", flexShrink: 0,
                padding: "0 2px", lineHeight: 1,
              }}
            >
              ↵
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
