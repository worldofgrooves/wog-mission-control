"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const COLS = [
  { key: "inbox",             label: "INBOX",       color: "#64748b" },
  { key: "assigned",          label: "ASSIGNED",    color: "#6366f1" },
  { key: "in_progress",       label: "IN PROGRESS", color: "#06b6d4" },
  { key: "blocked",           label: "BLOCKED",     color: "#ef4444" },
  { key: "review",            label: "REVIEW",      color: "#f59e0b" },
  { key: "waiting_on_denver", label: "WAITING",     color: "#a855f7" },
  { key: "done",              label: "DONE",        color: "#10b981" },
];

const PRI = {
  immediate:     { label: "IMMEDIATE", color: "#ef4444" },
  this_week:     { label: "THIS WEEK", color: "#f59e0b" },
  when_capacity: { label: "CAPACITY",  color: "#475569" },
};

const BRD = {
  wog:             { label: "WoG",      color: "#d97706" },
  plume:           { label: "PLUME",    color: "#6366f1" },
  artifact:        { label: "ARTIFACT", color: "#06b6d4" },
  groove_dwellers: { label: "GD",       color: "#10b981" },
  shared:          { label: "SHARED",   color: "#64748b" },
};

const DPT = {
  content:    { label: "CONTENT",    color: "#f59e0b" },
  research:   { label: "RESEARCH",   color: "#06b6d4" },
  operations: { label: "OPS",        color: "#10b981" },
  build:      { label: "BUILD",      color: "#6366f1" },
};

const AGST = {
  idle:    { color: "#10b981", shadow: "0 0 8px rgba(16,185,129,0.6)" },
  active:  { color: "#06b6d4", shadow: "0 0 8px rgba(6,182,212,0.6)" },
  blocked: { color: "#ef4444", shadow: "0 0 8px rgba(239,68,68,0.6)" },
};

const CC = {
  status_update: "#06b6d4",
  escalation:    "#ef4444",
  decision:      "#f59e0b",
  blocker:       "#ef4444",
  note:          "#475569",
  system_event:  "#2d4a6b",
  checkin:       "#10b981",
};

const DLVR_TYPES = {
  document: { label: "DOC",   color: "#6366f1" },
  link:     { label: "LINK",  color: "#06b6d4" },
  file:     { label: "FILE",  color: "#f59e0b" },
  image:    { label: "IMG",   color: "#10b981" },
  code:     { label: "CODE",  color: "#a855f7" },
};

const C = {
  bg:     "#080c14",
  panel:  "#0a1628",
  card:   "#0d1824",
  border: "#1a2f4a",
  dim:    "#112238",
  cyan:   "#06b6d4",
  ghost:  "#2d4a6b",
  muted:  "#475569",
  sec:    "#94a3b8",
  pri:    "#e2e8f0",
  glow:   "rgba(6,182,212,0.08)",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ago(ts) {
  if (!ts) return "";
  const d = Date.now() - new Date(ts);
  if (d < 60000)    return "just now";
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function formatTokens(n) {
  if (!n) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatCost(n) {
  if (!n) return "—";
  return `$${n.toFixed(4)}`;
}

function deadlineUrgency(deadline_at) {
  if (!deadline_at) return null;
  const diff = new Date(deadline_at) - Date.now();
  if (diff < 0)           return { label: "OVERDUE",  color: "#ef4444" };
  if (diff < 86400000)    return { label: "DUE 24H",  color: "#f97316" };
  if (diff < 259200000)   return { label: "DUE 72H",  color: "#f59e0b" };
  if (diff < 604800000)   return { label: "DUE WEEK", color: "#84cc16" };
  return null;
}

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────

function Badge({ label, color, small }) {
  return (
    <span style={{
      fontSize: small ? 7 : 8,
      padding: small ? "1px 4px" : "2px 6px",
      borderRadius: 2,
      background: `${color}18`,
      color,
      border: `1px solid ${color}35`,
      letterSpacing: 0.5,
      whiteSpace: "nowrap",
      fontFamily: "inherit",
    }}>
      {label}
    </span>
  );
}

function Dot({ status, size = 7 }) {
  const s = AGST[status] || AGST.idle;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: s.color,
      boxShadow: s.shadow,
      flexShrink: 0,
    }} />
  );
}

function TokenBar({ used, total, color = C.cyan }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 2, background: C.dim, borderRadius: 1, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 1, transition: "width 0.3s" }} />
    </div>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }) {
  const [hov, setHov] = useState(false);
  const p   = PRI[task.priority]  || PRI.when_capacity;
  const b   = task.brand          ? BRD[task.brand] : null;
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const urgency = deadlineUrgency(task.deadline_at);
  const hasTokens = task.token_usage > 0;

  return (
    <div
      onClick={() => onClick(task)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "10px 10px 8px",
        background: hov ? "#0f1e33" : C.card,
        borderRadius: 4,
        border: `1px solid ${hov ? C.border : C.dim}`,
        borderLeft: `3px solid ${p.color}`,
        cursor: "pointer",
        transition: "background .12s, border-color .12s",
      }}
    >
      <div style={{ fontSize: 8, color: C.ghost, marginBottom: 4, letterSpacing: 1 }}>
        #{task.task_number}
        {hasTokens && (
          <span style={{ float: "right", color: C.muted }}>
            ◈ {formatTokens(task.token_usage)}
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.pri, lineHeight: 1.45, marginBottom: 7, fontWeight: 500 }}>
        {task.title}
      </div>

      {/* Badges row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
        {b && <Badge label={b.label} color={b.color} small />}
        {tags.slice(0, 2).map(t => (
          <span key={t} style={{ fontSize: 7, padding: "1px 4px", borderRadius: 2, background: "rgba(255,255,255,0.03)", color: C.ghost }}>
            {t}
          </span>
        ))}
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
        {urgency ? (
          <span style={{ fontSize: 7, color: urgency.color, letterSpacing: 0.5, fontWeight: 700 }}>
            ⚠ {urgency.label}
          </span>
        ) : task.deadline_at ? (
          <span style={{ fontSize: 7, color: C.ghost }}>
            ⏰ {new Date(task.deadline_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ) : <span />}

        {task.agents?.display_name && (
          <span style={{ fontSize: 8, color: C.ghost }}>→ {task.agents.display_name}</span>
        )}
      </div>

      {/* Cost bar if tokens exist */}
      {hasTokens && (
        <div style={{ marginTop: 6 }}>
          <TokenBar used={task.token_usage} total={100000} color={p.color} />
        </div>
      )}
    </div>
  );
}

// ─── TASK MODAL ───────────────────────────────────────────────────────────────

function TaskModal({ task, onClose }) {
  const [comments, setComments]     = useState([]);
  const [deliverables, setDelivs]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const col     = COLS.find(c => c.key === task.status);
  const p       = PRI[task.priority] || PRI.when_capacity;
  const b       = task.brand ? BRD[task.brand] : null;
  const d       = task.department ? DPT[task.department] : null;
  const tags    = Array.isArray(task.tags) ? task.tags : [];
  const urgency = deadlineUrgency(task.deadline_at);

  useEffect(() => {
    async function load() {
      const [cm, dv] = await Promise.all([
        supabase.from("task_comments").select("*").eq("task_id", task.id).order("created_at", { ascending: true }),
        supabase.from("task_deliverables").select("*").eq("task_id", task.id).order("created_at", { ascending: false }),
      ]);
      setComments(cm.data || []);
      setDelivs(dv.data || []);
      setLoading(false);
    }
    load();
  }, [task.id]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(4,8,16,.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(6,182,212,.12), 0 40px 80px rgba(0,0,0,.7)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${C.dim}`,
          background: col ? `${col.color}08` : "transparent",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, color: col?.color || C.muted, letterSpacing: 2, marginBottom: 6 }}>
                TASK #{task.task_number} · {task.status.toUpperCase().replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f9ff", lineHeight: 1.3 }}>
                {task.title}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer", width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >✕</button>
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
            <Badge label={p.label} color={p.color} />
            {b && <Badge label={b.label} color={b.color} />}
            {d && <Badge label={d.label} color={d.color} />}
            {urgency && <Badge label={urgency.label} color={urgency.color} />}
            {tags.map(t => (
              <span key={t} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 2, background: "rgba(255,255,255,.04)", color: C.muted, border: `1px solid ${C.dim}` }}>
                {t}
              </span>
            ))}
          </div>

          {/* Token stats if present */}
          {(task.token_usage > 0 || task.estimated_cost > 0) && (
            <div style={{ display: "flex", gap: 16, marginTop: 12, padding: "8px 10px", background: "rgba(6,182,212,.05)", borderRadius: 4, border: `1px solid rgba(6,182,212,.12)` }}>
              <div>
                <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>TOKENS USED</div>
                <div style={{ fontSize: 13, color: C.cyan, fontWeight: 700 }}>{formatTokens(task.token_usage)}</div>
              </div>
              <div>
                <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>EST. COST</div>
                <div style={{ fontSize: 13, color: C.cyan, fontWeight: 700 }}>{formatCost(task.estimated_cost)}</div>
              </div>
              {task.assignee_agent_id && (
                <div>
                  <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>AGENT</div>
                  <div style={{ fontSize: 13, color: C.sec, fontWeight: 700 }}>{task.agents?.display_name || "—"}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* Blocked / parked alerts */}
          {task.blocked_reason && (
            <div style={{ margin: "12px 20px 0", padding: "8px 12px", background: "rgba(239,68,68,.08)", borderRadius: 4, border: "1px solid rgba(239,68,68,.25)", borderLeft: "3px solid #ef4444" }}>
              <div style={{ fontSize: 8, color: "#ef4444", letterSpacing: 1, marginBottom: 3 }}>BLOCKED</div>
              <div style={{ fontSize: 11, color: C.sec }}>{task.blocked_reason}</div>
            </div>
          )}
          {task.parked_reason && (
            <div style={{ margin: "12px 20px 0", padding: "8px 12px", background: "rgba(100,116,139,.08)", borderRadius: 4, border: "1px solid rgba(100,116,139,.25)", borderLeft: "3px solid #64748b" }}>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, marginBottom: 3 }}>PARKED</div>
              <div style={{ fontSize: 11, color: C.sec }}>{task.parked_reason}</div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div style={{ padding: "14px 20px 0" }}>
              <div style={{ fontSize: 8, color: C.ghost, letterSpacing: 2, marginBottom: 8 }}>DESCRIPTION</div>
              <div style={{ fontSize: 11, color: C.sec, lineHeight: 1.65 }}>{task.description}</div>
            </div>
          )}

          {/* Deliverables */}
          <div style={{ padding: "14px 20px 0" }}>
            <div style={{ fontSize: 8, color: C.ghost, letterSpacing: 2, marginBottom: 8 }}>
              DELIVERABLES — {deliverables.length}
            </div>
            {deliverables.length === 0 ? (
              <div style={{ fontSize: 9, color: C.ghost, letterSpacing: 1, padding: "8px 0" }}>
                {task.status === "done" ? "— NO DELIVERABLES ATTACHED —" : "— PENDING —"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {deliverables.map(dv => {
                  const dt = DLVR_TYPES[dv.type] || DLVR_TYPES.document;
                  return (
                    <div key={dv.id} style={{ padding: "8px 10px", background: C.card, borderRadius: 4, border: `1px solid ${C.dim}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Badge label={dt.label} color={dt.color} small />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: C.pri, fontWeight: 600, marginBottom: 2 }}>{dv.title}</div>
                        {dv.summary && <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.4 }}>{dv.summary}</div>}
                        {dv.url && (
                          <a href={dv.url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: C.cyan, textDecoration: "none" }}>
                            ↗ Open
                          </a>
                        )}
                      </div>
                      <span style={{ fontSize: 7, color: C.ghost, flexShrink: 0 }}>{ago(dv.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity thread */}
          <div style={{ padding: "14px 20px 16px" }}>
            <div style={{ fontSize: 8, color: C.ghost, letterSpacing: 2, marginBottom: 8 }}>
              ACTIVITY — {comments.length}
            </div>
            {loading && <div style={{ fontSize: 9, color: C.ghost }}>Loading...</div>}
            {!loading && comments.length === 0 && (
              <div style={{ fontSize: 9, color: C.ghost, letterSpacing: 1 }}>— NO COMMENTS YET —</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {comments.map(cm => {
                const tc = CC[cm.comment_type] || C.muted;
                return (
                  <div key={cm.id} style={{ padding: "9px 12px", background: C.card, borderRadius: 4, border: `1px solid ${C.dim}`, borderLeft: `2px solid ${tc}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 9, color: tc, letterSpacing: 0.5, fontWeight: 700, textTransform: "uppercase" }}>
                        {cm.author_name}
                        {cm.comment_type !== "note" && (
                          <span style={{ fontWeight: 400, color: C.ghost, marginLeft: 6 }}>
                            · {cm.comment_type.replace(/_/g, " ")}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 7, color: C.ghost }}>{ago(cm.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.sec, lineHeight: 1.55 }}>{cm.body}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AGENT PANEL ──────────────────────────────────────────────────────────────

function AgentPanel({ agents, selAgent, onSelect, tasks, isMobile, onClose }) {
  return (
    <div style={{
      width: isMobile ? "100%" : 196,
      height: isMobile ? "100%" : "auto",
      background: C.panel,
      borderRight: isMobile ? "none" : `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 14px 8px",
        fontSize: 8,
        letterSpacing: 3,
        color: C.ghost,
        borderBottom: `1px solid ${C.dim}`,
        flexShrink: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span>AGENTS — {agents.length}</span>
        {isMobile && (
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {agents.map(a => {
          const open = tasks.filter(t => t.assignee_agent_id === a.id && !["done", "parked"].includes(t.status)).length;
          const dept = a.department ? DPT[a.department] : null;
          const sel  = selAgent?.id === a.id;
          // Rough token total across agent's tasks
          const agentTokens = tasks.filter(t => t.assignee_agent_id === a.id).reduce((sum, t) => sum + (t.token_usage || 0), 0);

          return (
            <div
              key={a.id}
              onClick={() => onSelect(sel ? null : a)}
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${C.dim}`,
                cursor: "pointer",
                background: sel ? "rgba(6,182,212,.06)" : "transparent",
                borderLeft: `2px solid ${sel ? C.cyan : "transparent"}`,
                transition: "background .12s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                <Dot status={a.status} />
                <div style={{ fontSize: 11, fontWeight: 700, color: sel ? C.cyan : C.pri }}>{a.display_name}</div>
                {a.status === "blocked" && <span style={{ fontSize: 7, color: "#ef4444", marginLeft: "auto" }}>BLOCKED</span>}
              </div>
              <div style={{ fontSize: 9, color: C.muted, paddingLeft: 14, lineHeight: 1.3 }}>{a.role}</div>
              <div style={{ display: "flex", gap: 3, marginTop: 5, paddingLeft: 14, flexWrap: "wrap", alignItems: "center" }}>
                {dept && <Badge label={dept.label} color={dept.color} small />}
                {open > 0 && (
                  <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 2, background: "rgba(6,182,212,.1)", color: C.cyan }}>
                    {open} open
                  </span>
                )}
                {agentTokens > 0 && (
                  <span style={{ fontSize: 7, color: C.ghost, marginLeft: "auto" }}>
                    ◈ {formatTokens(agentTokens)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

function LiveFeed({ comments, isMobile, onClose }) {
  // Separate check-ins from regular activity
  const checkins  = comments.filter(c => c.comment_type === "checkin");
  const activity  = comments.filter(c => c.comment_type !== "checkin");

  return (
    <div style={{
      width: isMobile ? "100%" : 224,
      background: C.panel,
      borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 13px 8px",
        borderBottom: `1px solid ${C.dim}`,
        flexShrink: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 8, letterSpacing: 3, color: C.ghost }}>LIVE FEED</span>
        {isMobile && (
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Agent check-ins section */}
        {checkins.length > 0 && (
          <div style={{ padding: "8px 8px 0" }}>
            <div style={{ fontSize: 7, color: "#10b981", letterSpacing: 2, marginBottom: 6, padding: "0 4px" }}>
              ● AGENT CHECK-INS
            </div>
            {checkins.map(cm => (
              <div key={cm.id} style={{ marginBottom: 4, padding: "7px 9px", background: "rgba(16,185,129,.05)", borderRadius: 4, border: "1px solid rgba(16,185,129,.15)", borderLeft: "2px solid #10b981" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>{cm.author_name}</span>
                  <span style={{ fontSize: 7, color: C.ghost }}>{ago(cm.created_at)}</span>
                </div>
                <div style={{ fontSize: 10, color: C.sec, lineHeight: 1.4 }}>{cm.body?.slice(0, 100)}{cm.body?.length > 100 ? "…" : ""}</div>
              </div>
            ))}
          </div>
        )}

        {/* Activity feed */}
        <div style={{ padding: "8px" }}>
          {checkins.length > 0 && (
            <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 2, marginBottom: 6, padding: "4px 4px 0" }}>
              ACTIVITY
            </div>
          )}
          {activity.length === 0 && checkins.length === 0 && (
            <div style={{ fontSize: 8, color: C.ghost, padding: "12px 4px", letterSpacing: 1 }}>— NO ACTIVITY —</div>
          )}
          {activity.map(cm => {
            const tc = CC[cm.comment_type] || C.muted;
            return (
              <div key={cm.id} style={{ marginBottom: 4, padding: "7px 9px", background: C.card, borderRadius: 4, border: `1px solid ${C.dim}`, borderLeft: `2px solid ${tc}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 8, color: tc, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{cm.author_name}</span>
                  <span style={{ fontSize: 7, color: C.ghost }}>{ago(cm.created_at)}</span>
                </div>
                {cm.tasks && (
                  <div style={{ fontSize: 7, color: C.ghost, marginBottom: 3 }}>
                    #{cm.tasks.task_number} · {cm.tasks.title?.slice(0, 24)}{cm.tasks.title?.length > 24 ? "…" : ""}
                  </div>
                )}
                <div style={{ fontSize: 10, color: C.sec, lineHeight: 1.4 }}>
                  {cm.body?.slice(0, 90)}{cm.body?.length > 90 ? "…" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── COST SUMMARY BAR ─────────────────────────────────────────────────────────

function CostBar({ tasks }) {
  const totalTokens = tasks.reduce((s, t) => s + (t.token_usage || 0), 0);
  const totalCost   = tasks.reduce((s, t) => s + (t.estimated_cost || 0), 0);
  const today = tasks
    .filter(t => t.last_activity_at && new Date(t.last_activity_at) > new Date(Date.now() - 86400000))
    .reduce((s, t) => s + (t.token_usage || 0), 0);

  if (totalTokens === 0) return null;

  return (
    <div style={{
      display: "flex",
      gap: 16,
      padding: "0 16px",
      alignItems: "center",
      borderLeft: `1px solid ${C.border}`,
      marginLeft: 8,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>{formatTokens(totalTokens)}</div>
        <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>TOTAL TOKENS</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{formatCost(totalCost)}</div>
        <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>TOTAL COST</div>
      </div>
      {today > 0 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{formatTokens(today)}</div>
          <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>TODAY</div>
        </div>
      )}
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────

function MobileNav({ view, setView, stats }) {
  const tabs = [
    { key: "board",  label: "BOARD",  icon: "⊞" },
    { key: "agents", label: "AGENTS", icon: "◉" },
    { key: "feed",   label: "FEED",   icon: "◈" },
  ];
  return (
    <div style={{
      display: "flex",
      borderTop: `1px solid ${C.border}`,
      background: C.panel,
      flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => setView(t.key)}
          style={{
            flex: 1,
            padding: "10px 4px",
            background: "transparent",
            border: "none",
            borderTop: `2px solid ${view === t.key ? C.cyan : "transparent"}`,
            color: view === t.key ? C.cyan : C.ghost,
            cursor: "pointer",
            fontSize: 9,
            letterSpacing: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── KANBAN BOARD ─────────────────────────────────────────────────────────────

function KanbanBoard({ tasks, onTaskClick, isMobile, brandFilter }) {
  const filtered = tasks.filter(t => {
    if (brandFilter !== "all") return t.brand === brandFilter;
    return true;
  });

  if (isMobile) {
    // Mobile: single scrollable list grouped by status
    const active = COLS.filter(c => c.key !== "done" && c.key !== "parked");
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {active.map(col => {
          const colTasks = filtered.filter(t => t.status === col.key);
          if (colTasks.length === 0) return null;
          return (
            <div key={col.key} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 2px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: col.color }} />
                <span style={{ fontSize: 8, letterSpacing: 2, color: col.color, fontWeight: 700 }}>{col.label}</span>
                <span style={{ fontSize: 9, color: C.ghost }}>({colTasks.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {colTasks.map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} />)}
              </div>
            </div>
          );
        })}
        {/* Done section collapsed */}
        {(() => {
          const doneTasks = filtered.filter(t => t.status === "done");
          if (doneTasks.length === 0) return null;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 2px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: 8, letterSpacing: 2, color: "#10b981", fontWeight: 700 }}>DONE</span>
                <span style={{ fontSize: 9, color: C.ghost }}>({doneTasks.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doneTasks.slice(0, 3).map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} />)}
                {doneTasks.length > 3 && (
                  <div style={{ fontSize: 9, color: C.ghost, textAlign: "center", padding: "4px 0" }}>
                    +{doneTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // Desktop: horizontal scroll kanban
  return (
    <div style={{ flex: 1, display: "flex", gap: 7, padding: "9px 9px 0", overflowX: "auto", overflowY: "hidden", minHeight: 0 }}>
      {COLS.map(col => {
        const colTasks = filtered.filter(t => t.status === col.key);
        return (
          <div
            key={col.key}
            style={{
              minWidth: 188,
              flex: "0 0 188px",
              display: "flex",
              flexDirection: "column",
              background: C.panel,
              borderRadius: "5px 5px 0 0",
              border: `1px solid ${C.border}`,
              borderBottom: "none",
              overflow: "hidden",
            }}
          >
            <div style={{
              padding: "6px 9px",
              background: `${col.color}12`,
              borderBottom: `1px solid ${col.color}28`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: col.color }} />
              <span style={{ fontSize: 8, letterSpacing: 2, color: col.color, fontWeight: 700 }}>{col.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 9, color: C.ghost, background: C.card, padding: "0 5px", borderRadius: 8, border: `1px solid ${C.dim}` }}>
                {colTasks.length}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 5 }}>
              {colTasks.length === 0 && (
                <div style={{ fontSize: 8, color: C.border, textAlign: "center", paddingTop: 16, letterSpacing: 2 }}>EMPTY</div>
              )}
              {colTasks.map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function MissionControl() {
  const [agents,      setAgents]      = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [comments,    setComments]    = useState([]);
  const [selAgent,    setSelAgent]    = useState(null);
  const [selTask,     setSelTask]     = useState(null);
  const [brandFilter, setBrandFilter] = useState("all");
  const [syncTime,    setSyncTime]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [mobileView,  setMobileView]  = useState("board");
  const [isMobile,    setIsMobile]    = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadAll = useCallback(async () => {
    const [ag, tk, cm] = await Promise.all([
      supabase.from("agents").select("*").order("department").order("display_name"),
      supabase.from("tasks").select("*, agents(display_name, avatar, status)").order("position").order("created_at"),
      supabase.from("task_comments").select("*, tasks(title, task_number)").order("created_at", { ascending: false }).limit(60),
    ]);
    if (ag.data) setAgents(ag.data);
    if (tk.data) setTasks(tk.data);
    if (cm.data) setComments(cm.data);
    setSyncTime(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 20000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const displayTasks = selAgent
    ? tasks.filter(t => t.assignee_agent_id === selAgent.id)
    : tasks;

  const stats = {
    active:  tasks.filter(t => !["done", "parked"].includes(t.status)).length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    waiting: tasks.filter(t => t.status === "waiting_on_denver").length,
    done:    tasks.filter(t => t.status === "done").length,
  };

  const totalTokens = tasks.reduce((s, t) => s + (t.token_usage || 0), 0);
  const totalCost   = tasks.reduce((s, t) => s + (t.estimated_cost || 0), 0);

  if (loading) {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 4, marginBottom: 12 }}>◈ MISSION CONTROL</div>
          <div style={{ fontSize: 9, color: C.ghost, letterSpacing: 2 }}>LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: "100vh",
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Courier New', monospace",
      fontSize: 12,
      color: C.pri,
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        height: isMobile ? 44 : 48,
        background: C.panel,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: `0 ${isMobile ? 12 : 16}px`,
        gap: isMobile ? 8 : 12,
        flexShrink: 0,
        overflow: "hidden",
      }}>
        <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, letterSpacing: 3, color: C.cyan, whiteSpace: "nowrap" }}>
          ◈ {isMobile ? "MC" : "MISSION CONTROL"}
        </div>

        {!isMobile && (
          <>
            <div style={{ width: 1, height: 16, background: C.border }} />
            <div style={{ fontSize: 8, color: C.ghost, letterSpacing: 2, whiteSpace: "nowrap" }}>
              JANET AI · {syncTime ? `SYNCED ${ago(syncTime)}` : "SYNCING..."}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Stats */}
        {!isMobile && (
          <>
            {[
              { l: "ACTIVE",  v: stats.active,  c: C.cyan      },
              { l: "BLOCKED", v: stats.blocked, c: "#ef4444"   },
              { l: "WAITING", v: stats.waiting, c: "#a855f7"   },
              { l: "DONE",    v: stats.done,    c: "#10b981"   },
            ].map(s => (
              <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "rgba(255,255,255,.02)", borderRadius: 4, border: `1px solid ${C.dim}` }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</span>
                <span style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>{s.l}</span>
              </div>
            ))}
            <div style={{ width: 1, height: 16, background: C.border }} />
          </>
        )}

        {isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 10, color: C.cyan, fontWeight: 700 }}>{stats.active}</span>
            <span style={{ fontSize: 8, color: C.ghost }}>ACTIVE</span>
            {stats.blocked > 0 && <>
              <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>{stats.blocked}</span>
              <span style={{ fontSize: 8, color: C.ghost }}>BLOCKED</span>
            </>}
          </div>
        )}

        {/* Token burn summary (desktop) */}
        {!isMobile && totalTokens > 0 && (
          <>
            <div style={{ display: "flex", gap: 12, padding: "0 12px", alignItems: "center", borderLeft: `1px solid ${C.border}` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>{formatTokens(totalTokens)}</div>
                <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>TOKENS</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{formatCost(totalCost)}</div>
                <div style={{ fontSize: 7, color: C.ghost, letterSpacing: 1 }}>COST</div>
              </div>
            </div>
            <div style={{ width: 1, height: 16, background: C.border }} />
          </>
        )}

        {/* Brand filters */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "wog", "plume", "artifact"].map(f => (
              <button
                key={f}
                onClick={() => setBrandFilter(f)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 20,
                  border: `1px solid ${brandFilter === f ? C.cyan : C.dim}`,
                  background: brandFilter === f ? "rgba(6,182,212,.12)" : "transparent",
                  color: brandFilter === f ? C.cyan : C.ghost,
                  fontSize: 8,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={loadAll}
          style={{ background: "transparent", border: `1px solid ${C.dim}`, color: C.ghost, cursor: "pointer", padding: "3px 8px", borderRadius: 4, fontSize: isMobile ? 14 : 12 }}
        >
          ↻
        </button>
      </div>

      {/* ── BODY ── */}
      {isMobile ? (
        // ── MOBILE LAYOUT ──
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Mobile brand filter bar */}
          <div style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: `1px solid ${C.dim}`, flexShrink: 0, overflowX: "auto" }}>
            {["all", "wog", "plume", "artifact", "groove_dwellers"].map(f => (
              <button
                key={f}
                onClick={() => setBrandFilter(f)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 20,
                  border: `1px solid ${brandFilter === f ? C.cyan : C.dim}`,
                  background: brandFilter === f ? "rgba(6,182,212,.12)" : "transparent",
                  color: brandFilter === f ? C.cyan : C.ghost,
                  fontSize: 8,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            {mobileView === "board" && (
              <KanbanBoard tasks={displayTasks} onTaskClick={setSelTask} isMobile={true} brandFilter={brandFilter} />
            )}
            {mobileView === "agents" && (
              <AgentPanel
                agents={agents}
                selAgent={selAgent}
                onSelect={a => { setSelAgent(a); setMobileView("board"); }}
                tasks={tasks}
                isMobile={true}
                onClose={() => setMobileView("board")}
              />
            )}
            {mobileView === "feed" && (
              <LiveFeed comments={comments} isMobile={true} onClose={() => setMobileView("board")} />
            )}
          </div>

          <MobileNav view={mobileView} setView={setMobileView} stats={stats} />
        </div>
      ) : (
        // ── DESKTOP LAYOUT ──
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          <AgentPanel
            agents={agents}
            selAgent={selAgent}
            onSelect={a => setSelAgent(a === selAgent ? null : a)}
            tasks={tasks}
            isMobile={false}
          />

          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <KanbanBoard tasks={displayTasks} onTaskClick={setSelTask} isMobile={false} brandFilter={brandFilter} />
          </div>

          <LiveFeed comments={comments} isMobile={false} />
        </div>
      )}

      {/* ── TASK MODAL ── */}
      {selTask && <TaskModal task={selTask} onClose={() => setSelTask(null)} />}
    </div>
  );
}
