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

// ─── Tiny inline select ───────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: "#3a3a3a", letterSpacing: 1.5,
        marginBottom: 5, fontWeight: 700, textTransform: "uppercase",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const selectStyle = {
  background: "#111",
  border: "1px solid #222",
  borderRadius: 6,
  color: "#aaa",
  fontSize: 12,
  padding: "5px 8px",
  cursor: "pointer",
  outline: "none",
  width: "100%",
};

function Sel({ value, options, onChange, colorFn }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        ...selectStyle,
        color: colorFn ? (colorFn(value) || "#aaa") : "#aaa",
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Comment item ─────────────────────────────────────────────────────────────

function CommentItem({ comment }) {
  const isAgent   = comment.author_type === "agent";
  const isDenver  = comment.author_type === "denver";
  const isSystem  = comment.author_type === "system";

  const authorColor = isSystem ? "#444" : isDenver ? "#c9a96e" : "#6366f1";

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div style={{
      padding: "10px 0",
      borderBottom: "1px solid #0f0f0f",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: authorColor, fontWeight: 600 }}>
          {comment.author_name}
        </span>
        {comment.comment_type && comment.comment_type !== "note" && (
          <span style={{
            fontSize: 9, color: "#555",
            background: "#1a1a1a",
            padding: "1px 5px", borderRadius: 3,
            textTransform: "uppercase", letterSpacing: 1,
          }}>
            {comment.comment_type.replace("_", " ")}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#333", marginLeft: "auto" }}>
          {fmt(comment.created_at)}
        </span>
      </div>
      <p style={{
        fontSize: 13, color: "#999",
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

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  const typeColor = {
    code: "#06b6d4", document: "#6366f1", link: "#10b981",
    research_summary: "#f59e0b", spec: "#a855f7",
    draft: "#c9a96e", image: "#ec4899", status_report: "#64748b",
  };

  return (
    <div style={{
      background: "#0d0d0d",
      border: "1px solid #1a1a1a",
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 9, color: typeColor[deliverable.type] || "#555",
          background: `${typeColor[deliverable.type] || "#555"}18`,
          padding: "2px 6px", borderRadius: 3,
          textTransform: "uppercase", letterSpacing: 1,
          flexShrink: 0, marginTop: 1,
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
            {expanded ? "▼ Hide content" : "▶ View content"}
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

// ─── Main TaskDetail ───────────────────────────────────────────────────────────

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
  const [commentText,   setCommentText]   = useState("");
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [titleDraft,    setTitleDraft]    = useState("");
  const [activeTab,     setActiveTab]     = useState("comments");

  const isDone = task.status === "done";

  // Title editing
  const startEditTitle = () => {
    setTitleDraft(task.title);
    setEditingTitle(true);
  };
  const saveTitle = useCallback(() => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) {
      onUpdate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }, [titleDraft, task.title, onUpdate]);

  // Comment submit
  const submitComment = () => {
    if (commentText.trim()) {
      onAddComment(commentText.trim());
      setCommentText("");
    }
  };

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : null;

  // Option lists
  const statusOptions  = [{ value: "", label: "-- Status --" },    ...STATUSES.map(s => ({ value: s, label: STATUS_LABEL[s] }))];
  const priOptions     = PRIORITIES.map(p => ({ value: p, label: PRI_LABEL[p] }));
  const brandOptions   = [{ value: "", label: "No brand" },         ...BRANDS.map(b => ({ value: b, label: BRAND_LABEL[b] }))];
  const deptOptions    = [{ value: "", label: "No department" },     ...DEPARTMENTS.map(d => ({ value: d, label: DEPT_LABEL[d] }))];
  const agentOptions   = [{ value: "", label: "Unassigned (Denver)" }, ...agents.map(a => ({ value: a.id, label: a.display_name }))];

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#080808",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* Complete button */}
          <button
            onClick={onToggleComplete}
            title={isDone ? "Mark incomplete" : "Mark complete"}
            style={{
              width: 22, height: 22,
              borderRadius: "50%",
              border: isDone
                ? "2px solid #10b981"
                : `2px solid ${PRI_COLOR[task.priority] || "#555"}`,
              background: isDone ? "#10b981" : "transparent",
              cursor: "pointer",
              flexShrink: 0,
              marginTop: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {isDone && <span style={{ color: "#000", fontSize: 11, fontWeight: 700 }}>✓</span>}
          </button>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
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
                  color: "#f0f0f0",
                  fontSize: 17,
                  fontWeight: 600,
                  padding: "2px 0",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <h2
                onClick={startEditTitle}
                title="Click to edit"
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: isDone ? "#444" : "#f0f0f0",
                  textDecoration: isDone ? "line-through" : "none",
                  cursor: "text",
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {task.title}
              </h2>
            )}
            <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>
              #{task.task_number}
              {task.created_at && ` · ${fmt(task.created_at)}`}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <button
              onClick={onToggleStar}
              title="Toggle important"
              style={{
                background: "none", border: "none",
                color: task.priority === "immediate" ? "#c9a96e" : "#333",
                cursor: "pointer", fontSize: 17, padding: "4px 5px",
                transition: "color 0.12s",
              }}
            >
              ★
            </button>
            <button
              onClick={onToggleMyDay}
              title={task.flagged_today ? "Remove from My Day" : "Add to My Day"}
              style={{
                background: "none", border: "none",
                color: task.flagged_today ? "#f59e0b" : "#333",
                cursor: "pointer", fontSize: 17, padding: "4px 5px",
                transition: "color 0.12s",
              }}
            >
              ☀
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                style={{
                  background: "none", border: "none",
                  color: "#444", cursor: "pointer",
                  fontSize: 22, padding: "2px 4px", lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Meta fields grid */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}>
            <Field label="Status">
              <Sel
                value={task.status}
                options={statusOptions}
                onChange={(v) => onUpdate({ status: v })}
                colorFn={(v) => STATUS_COLOR[v]}
              />
            </Field>

            <Field label="Priority">
              <Sel
                value={task.priority}
                options={priOptions}
                onChange={(v) => onUpdate({ priority: v })}
                colorFn={(v) => PRI_COLOR[v]}
              />
            </Field>

            <Field label="Assigned To">
              <Sel
                value={task.assignee_agent_id || ""}
                options={agentOptions}
                onChange={(v) => onUpdate({ assignee_agent_id: v || null })}
              />
            </Field>

            <Field label="Brand">
              <Sel
                value={task.brand || ""}
                options={brandOptions}
                onChange={(v) => onUpdate({ brand: v || null })}
              />
            </Field>

            <Field label="Department">
              <Sel
                value={task.department || ""}
                options={deptOptions}
                onChange={(v) => onUpdate({ department: v || null })}
              />
            </Field>

            <Field label="Deadline">
              <input
                type="date"
                value={task.deadline_at ? task.deadline_at.slice(0, 10) : ""}
                onChange={(e) => {
                  const iso = e.target.value
                    ? new Date(e.target.value + "T12:00:00").toISOString()
                    : null;
                  onUpdate({ deadline_at: iso });
                }}
                style={{ ...selectStyle }}
              />
            </Field>
          </div>
        </div>

        {/* Description / Notes */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #111" }}>
          <Field label="Notes">
            <textarea
              value={task.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Add notes..."
              rows={4}
              style={{
                width: "100%",
                background: "#0d0d0d",
                border: "1px solid #1a1a1a",
                borderRadius: 6,
                color: "#999",
                fontSize: 13,
                padding: "8px 10px",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                marginTop: 2,
              }}
            />
          </Field>
        </div>

        {/* Blocked reason -- shown only when blocked */}
        {task.status === "blocked" && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #111" }}>
            <Field label="Blocked Reason">
              <textarea
                value={task.blocked_reason || ""}
                onChange={(e) => onUpdate({ blocked_reason: e.target.value })}
                placeholder="What is blocking this task?"
                rows={2}
                style={{
                  width: "100%",
                  background: "#0d0d0d",
                  border: "1px solid #ef444430",
                  borderRadius: 6,
                  color: "#ef4444",
                  fontSize: 13,
                  padding: "8px 10px",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  marginTop: 2,
                }}
              />
            </Field>
          </div>
        )}

        {/* Parked reason -- shown only when parked */}
        {task.status === "parked" && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #111" }}>
            <Field label="Parked Reason">
              <textarea
                value={task.parked_reason || ""}
                onChange={(e) => onUpdate({ parked_reason: e.target.value })}
                placeholder="Why is this parked?"
                rows={2}
                style={{
                  width: "100%",
                  background: "#0d0d0d",
                  border: "1px solid #64748b40",
                  borderRadius: 6,
                  color: "#64748b",
                  fontSize: 13,
                  padding: "8px 10px",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  marginTop: 2,
                }}
              />
            </Field>
          </div>
        )}

        {/* Comments + Deliverables tabs */}
        <div style={{ padding: "0 16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#2a2a2a", fontSize: 12 }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div style={{
                display: "flex",
                borderBottom: "1px solid #1a1a1a",
                marginTop: 12,
                gap: 0,
              }}>
                {[
                  { id: "comments",     label: `Notes (${comments.length})` },
                  { id: "deliverables", label: `Deliverables (${deliverables.length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab.id ? "2px solid #c9a96e" : "2px solid transparent",
                      color: activeTab === tab.id ? "#c9a96e" : "#444",
                      fontSize: 12,
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
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#2a2a2a", fontSize: 12 }}>
                      No notes yet.
                    </div>
                  )}
                  {comments.map(c => <CommentItem key={c.id} comment={c} />)}

                  {/* Add note */}
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitComment();
                        }
                      }}
                      placeholder="Add a note... (Enter to submit)"
                      rows={2}
                      style={{
                        flex: 1,
                        background: "#0d0d0d",
                        border: "1px solid #1a1a1a",
                        borderRadius: 6,
                        color: "#e0e0e0",
                        fontSize: 13,
                        padding: "8px 10px",
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
                        padding: "8px 14px",
                        background: commentText.trim() ? "#c9a96e" : "#1a1a1a",
                        border: "none",
                        borderRadius: 6,
                        color: commentText.trim() ? "#000" : "#444",
                        fontSize: 12,
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
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#2a2a2a", fontSize: 12 }}>
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
