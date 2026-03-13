"use client";
import { useState, useCallback } from "react";
import {
  STATUS_COLOR, STATUS_LABEL,
  PRI_COLOR, PRI_LABEL,
  BRAND_LABEL, DEPT_LABEL,
} from "./MCApp";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES    = ["inbox","assigned","in_progress","blocked","review","waiting_on_denver","parked","done"];
const PRIORITIES  = ["immediate","this_week","when_capacity"];
const BRANDS      = ["wog","plume","artifact","groove_dwellers","shared"];
const DEPARTMENTS = ["content","research","operations","build"];

// ─── Field Row (icon + label + right-side control) ────────────────────────────

function FieldRow({ icon, label, children }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 20px",
      borderBottom: "1px solid #1e1e1e",
      minHeight: 52,
    }}>
      <span style={{
        fontSize: 16,
        color: "#555",
        width: 22,
        textAlign: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 15,
        color: "#777",
        flex: 1,
      }}>
        {label}
      </span>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Row Select (transparent, right-aligned value) ───────────────────────────

function RowSelect({ value, options, onChange, colorFn }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        background: "transparent",
        border: "none",
        outline: "none",
        color: colorFn ? (colorFn(value) || "#c8c8c8") : "#c8c8c8",
        fontSize: 14,
        cursor: "pointer",
        padding: "4px 0",
        maxWidth: 140,
        textAlignLast: "right",
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: "#1e1e1e", color: "#e0e0e0" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Comment item ─────────────────────────────────────────────────────────────

function CommentItem({ comment }) {
  const authorColor =
    comment.author_type === "system"  ? "#444" :
    comment.author_type === "denver"  ? "#c9a96e" : "#6366f1";

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: authorColor, fontWeight: 600 }}>
          {comment.author_name}
        </span>
        {comment.comment_type && comment.comment_type !== "note" && (
          <span style={{
            fontSize: 9, color: "#555",
            background: "#1e1e1e",
            padding: "1px 5px", borderRadius: 3,
            textTransform: "uppercase", letterSpacing: 1,
          }}>
            {comment.comment_type.replace("_", " ")}
          </span>
        )}
        <span style={{ fontSize: 11, color: "#333", marginLeft: "auto" }}>
          {fmt(comment.created_at)}
        </span>
      </div>
      <p style={{
        fontSize: 14, color: "#999",
        margin: 0, lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {comment.body}
      </p>
    </div>
  );
}

// ─── Deliverable item ─────────────────────────────────────────────────────────

function DeliverableItem({ deliverable }) {
  const [expanded, setExpanded] = useState(false);

  const typeColor = {
    code: "#06b6d4", document: "#6366f1", link: "#10b981",
    research_summary: "#f59e0b", spec: "#a855f7",
    draft: "#c9a96e", image: "#ec4899", status_report: "#64748b",
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div style={{
      background: "#191919",
      border: "1px solid #222",
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 9,
          color: typeColor[deliverable.type] || "#555",
          background: `${typeColor[deliverable.type] || "#555"}20`,
          padding: "2px 6px", borderRadius: 3,
          textTransform: "uppercase", letterSpacing: 1,
          flexShrink: 0, marginTop: 2,
        }}>
          {deliverable.type?.replace("_", " ")}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", lineHeight: 1.3 }}>
          {deliverable.title}
        </span>
      </div>
      {deliverable.summary && (
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 6px", lineHeight: 1.4 }}>
          {deliverable.summary}
        </p>
      )}
      {deliverable.content && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none", border: "none",
              color: "#555", fontSize: 11, cursor: "pointer",
              padding: 0, marginBottom: expanded ? 8 : 0,
            }}
          >
            {expanded ? "▼ Hide" : "▶ View content"}
          </button>
          {expanded && (
            <pre style={{
              fontSize: 11, color: "#777",
              background: "#111", borderRadius: 6,
              padding: "8px 10px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.5,
              margin: 0,
              fontFamily: "monospace",
            }}>
              {deliverable.content}
            </pre>
          )}
        </>
      )}
      <div style={{ fontSize: 10, color: "#333", marginTop: 6 }}>
        by {deliverable.created_by} · {fmt(deliverable.created_at)}
      </div>
    </div>
  );
}

// ─── Main TaskDetail ──────────────────────────────────────────────────────────

export default function TaskDetail({
  task,
  agents,
  comments,
  deliverables,
  loading,
  isMobile,
  onClose,
  onUpdate,
  onToggleComplete,
  onToggleStar,
  onToggleMyDay,
  onAddComment,
}) {
  const [commentText,  setCommentText]  = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft,   setTitleDraft]   = useState("");
  const [activeTab,    setActiveTab]    = useState("comments");

  const isDone      = task.status === "done";
  const isImportant = task.priority === "immediate";

  const startEditTitle = () => { setTitleDraft(task.title); setEditingTitle(true); };
  const saveTitle = useCallback(() => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) {
      onUpdate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }, [titleDraft, task.title, onUpdate]);

  const submitComment = () => {
    if (commentText.trim()) {
      onAddComment(commentText.trim());
      setCommentText("");
    }
  };

  // Option lists
  const statusOptions = [{ value: "", label: "No status" }, ...STATUSES.map(s => ({ value: s, label: STATUS_LABEL[s] }))];
  const priOptions    = PRIORITIES.map(p => ({ value: p, label: PRI_LABEL[p] }));
  const brandOptions  = [{ value: "", label: "No brand" }, ...BRANDS.map(b => ({ value: b, label: BRAND_LABEL[b] }))];
  const deptOptions   = [{ value: "", label: "No dept" }, ...DEPARTMENTS.map(d => ({ value: d, label: DEPT_LABEL[d] }))];
  const agentOptions  = [{ value: "", label: "Unassigned" }, ...agents.map(a => ({ value: a.id, label: a.display_name }))];

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#141414",
    }}>
      {/* ── Title area ── */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #1e1e1e",
        flexShrink: 0,
      }}>
        {/* Top row: complete circle + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button
            onClick={onToggleComplete}
            style={{
              width: 28, height: 28,
              borderRadius: "50%",
              border: isDone
                ? "2px solid #10b981"
                : `2px solid ${PRI_COLOR[task.priority] || "#555"}`,
              background: isDone ? "#10b981" : "transparent",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {isDone && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={onToggleStar}
              style={{
                background: "none", border: "none",
                color: isImportant ? "#c9a96e" : "#3a3a3a",
                cursor: "pointer", fontSize: 20, padding: "6px",
                transition: "color 0.12s",
                lineHeight: 1,
              }}
            >
              {isImportant ? "★" : "☆"}
            </button>
            <button
              onClick={onToggleMyDay}
              style={{
                background: "none", border: "none",
                color: task.flagged_today ? "#f59e0b" : "#3a3a3a",
                cursor: "pointer", fontSize: 18, padding: "6px",
                transition: "color 0.12s",
                lineHeight: 1,
              }}
            >
              ☀
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                style={{
                  background: "none", border: "none",
                  color: "#555", cursor: "pointer",
                  fontSize: 24, padding: "4px 6px", lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter")  saveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              borderBottom: "1px solid #c9a96e",
              outline: "none",
              color: "#f8f8f8",
              fontSize: 22,
              fontWeight: 700,
              padding: "2px 0",
              fontFamily: "inherit",
              lineHeight: 1.3,
              boxSizing: "border-box",
            }}
          />
        ) : (
          <h2
            onClick={startEditTitle}
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: isDone ? "#555" : "#f8f8f8",
              textDecoration: isDone ? "line-through" : "none",
              cursor: "text",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {task.title}
          </h2>
        )}

        <div style={{ fontSize: 12, color: "#3a3a3a", marginTop: 6 }}>
          #{task.task_number}
          {task.created_at && ` · ${fmtDate(task.created_at)}`}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Field rows ── */}
        <FieldRow icon="◎" label="Status">
          <RowSelect
            value={task.status}
            options={statusOptions}
            onChange={(v) => onUpdate({ status: v })}
            colorFn={(v) => STATUS_COLOR[v]}
          />
        </FieldRow>

        <FieldRow icon="▲" label="Priority">
          <RowSelect
            value={task.priority}
            options={priOptions}
            onChange={(v) => onUpdate({ priority: v })}
            colorFn={(v) => PRI_COLOR[v]}
          />
        </FieldRow>

        <FieldRow icon="●" label="Assigned to">
          <RowSelect
            value={task.assignee_agent_id || ""}
            options={agentOptions}
            onChange={(v) => onUpdate({ assignee_agent_id: v || null })}
          />
        </FieldRow>

        <FieldRow icon="◈" label="Brand">
          <RowSelect
            value={task.brand || ""}
            options={brandOptions}
            onChange={(v) => onUpdate({ brand: v || null })}
          />
        </FieldRow>

        <FieldRow icon="⊞" label="Department">
          <RowSelect
            value={task.department || ""}
            options={deptOptions}
            onChange={(v) => onUpdate({ department: v || null })}
          />
        </FieldRow>

        <FieldRow icon="◻" label="Due date">
          <input
            type="date"
            value={task.deadline_at ? task.deadline_at.slice(0, 10) : ""}
            onChange={(e) => {
              const iso = e.target.value
                ? new Date(e.target.value + "T12:00:00").toISOString()
                : null;
              onUpdate({ deadline_at: iso });
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: task.deadline_at ? "#c8c8c8" : "#555",
              fontSize: 14,
              cursor: "pointer",
              padding: "4px 0",
              maxWidth: 130,
            }}
          />
        </FieldRow>

        {/* My Day toggle row */}
        <div
          onClick={onToggleMyDay}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 20px",
            borderBottom: "1px solid #1e1e1e",
            minHeight: 52,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, color: task.flagged_today ? "#f59e0b" : "#555", width: 22, textAlign: "center", flexShrink: 0 }}>
            ☀
          </span>
          <span style={{ fontSize: 15, color: task.flagged_today ? "#f59e0b" : "#777", flex: 1 }}>
            {task.flagged_today ? "In My Day" : "Add to My Day"}
          </span>
          {task.flagged_today && (
            <span style={{ fontSize: 12, color: "#f59e0b" }}>✓</span>
          )}
        </div>

        {/* Blocked reason */}
        {task.status === "blocked" && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 11, color: "#ef4444", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>BLOCKED REASON</div>
            <textarea
              value={task.blocked_reason || ""}
              onChange={(e) => onUpdate({ blocked_reason: e.target.value })}
              placeholder="What is blocking this?"
              rows={2}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #ef444430",
                outline: "none",
                color: "#ef4444",
                fontSize: 14,
                padding: "4px 0",
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Parked reason */}
        {task.status === "parked" && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>PARKED REASON</div>
            <textarea
              value={task.parked_reason || ""}
              onChange={(e) => onUpdate({ parked_reason: e.target.value })}
              placeholder="Why is this parked?"
              rows={2}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #64748b40",
                outline: "none",
                color: "#64748b",
                fontSize: 14,
                padding: "4px 0",
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* ── Notes (plain, no label) ── */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e" }}>
          <textarea
            value={task.description || ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Add note"
            rows={4}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: task.description ? "#c0c0c0" : "#555",
              fontSize: 15,
              padding: 0,
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.65,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ── Comments + Deliverables ── */}
        <div style={{ padding: "0 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#2a2a2a", fontSize: 12 }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div style={{
                display: "flex",
                borderBottom: "1px solid #1e1e1e",
                marginTop: 4,
              }}>
                {[
                  { id: "comments",     label: `Notes (${comments.length})` },
                  { id: "deliverables", label: `Deliverables (${deliverables.length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab.id ? "2px solid #c9a96e" : "2px solid transparent",
                      color: activeTab === tab.id ? "#c9a96e" : "#444",
                      fontSize: 13,
                      cursor: "pointer",
                      marginBottom: -1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Comments tab */}
              {activeTab === "comments" && (
                <div style={{ paddingTop: 4, paddingBottom: 20 }}>
                  {comments.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#2a2a2a", fontSize: 13 }}>
                      No notes yet.
                    </div>
                  )}
                  {comments.map(c => <CommentItem key={c.id} comment={c} />)}

                  <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitComment();
                        }
                      }}
                      placeholder="Add a note..."
                      rows={2}
                      style={{
                        flex: 1,
                        background: "#1c1c1c",
                        border: "1px solid #252525",
                        borderRadius: 8,
                        color: "#e0e0e0",
                        fontSize: 14,
                        padding: "10px 12px",
                        resize: "none",
                        outline: "none",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                      }}
                    />
                    <button
                      onClick={submitComment}
                      disabled={!commentText.trim()}
                      style={{
                        padding: "10px 16px",
                        background: commentText.trim() ? "#c9a96e" : "#1e1e1e",
                        border: "none",
                        borderRadius: 8,
                        color: commentText.trim() ? "#000" : "#444",
                        fontSize: 13,
                        cursor: commentText.trim() ? "pointer" : "default",
                        fontWeight: 700,
                        transition: "all 0.15s",
                        flexShrink: 0,
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Deliverables tab */}
              {activeTab === "deliverables" && (
                <div style={{ paddingTop: 12, paddingBottom: 20 }}>
                  {deliverables.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#2a2a2a", fontSize: 13 }}>
                      No deliverables attached.
                    </div>
                  )}
                  {deliverables.map(d => <DeliverableItem key={d.id} deliverable={d} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
