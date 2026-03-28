"use client";
import { useMemo, useState, useCallback } from "react";
import { DEPT_LABEL } from "./MCApp";

// ─── Dept + tier colors ────────────────────────────────────────────────────────

const DEPT_COLOR = {
  content:    "#ec4899",
  research:   "#f59e0b",
  operations: "#6366f1",
  build:      "#06b6d4",
};

const TIER_COLOR = {
  opus:   "#c9a96e",
  sonnet: "#6366f1",
  haiku:  "#06b6d4",
};

function deriveStatus(agent, tasks, heartbeats = []) {
  // Task-based status is the primary source of truth (heartbeats not yet wired)
  const t = tasks.filter(x => x.assignee_agent_id === agent.id && x.status !== "done" && x.status !== "parked");
  if (t.some(x => x.status === "in_progress")) return "working";
  if (t.some(x => x.status === "blocked"))     return "blocked";
  if (t.some(x => x.status === "assigned" || x.status === "review" || x.status === "waiting_on_denver")) return "standby";
  return "idle";
}

const STATUS_INFO = {
  working: { color: "#10b981", label: "WORKING" },
  stuck:   { color: "#ef4444", label: "STUCK" },
  blocked: { color: "#ef4444", label: "BLOCKED" },
  standby: { color: "#f59e0b", label: "STANDBY" },
  idle:    { color: "#3b82f6", label: "IDLE" },
  offline: { color: "#555",    label: "OFFLINE" },
};

// ─── AgentProfile ─────────────────────────────────────────────────────────────

export default function AgentProfile({ agent, tasks, heartbeats = [], onClose }) {
  const [wakeState, setWakeState] = useState("idle"); // idle | sending | sent | error
  const [wakeError, setWakeError] = useState("");

  const handleWake = useCallback(async () => {
    setWakeState("sending");
    setWakeError("");
    try {
      const res = await fetch("/api/agents/wake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: agent.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWakeError(data.error || "Failed to wake agent");
        setWakeState("error");
        setTimeout(() => setWakeState("idle"), 4000);
      } else {
        setWakeState("sent");
        setTimeout(() => setWakeState("idle"), 3000);
      }
    } catch (err) {
      setWakeError(err.message);
      setWakeState("error");
      setTimeout(() => setWakeState("idle"), 4000);
    }
  }, [agent.name]);

  const status     = useMemo(() => deriveStatus(agent, tasks, heartbeats), [agent, tasks, heartbeats]);
  const statusInfo = STATUS_INFO[status];
  const deptColor  = DEPT_COLOR[agent.department] || "#c9a96e";
  const initials   = agent.avatar || agent.display_name?.slice(0, 2).toUpperCase() || "??";
  const skills     = Array.isArray(agent.skills) ? agent.skills : [];

  const agentTasks = useMemo(() =>
    tasks.filter(t => t.assignee_agent_id === agent.id),
    [agent, tasks]
  );

  const stats = useMemo(() => ({
    assigned:   agentTasks.filter(t => t.status === "assigned").length,
    inProgress: agentTasks.filter(t => t.status === "in_progress").length,
    blocked:    agentTasks.filter(t => t.status === "blocked").length,
    waiting:    agentTasks.filter(t => t.status === "waiting_on_denver").length,
    done:       tasks.filter(t => t.assignee_agent_id === agent.id && t.status === "done").length,
  }), [agentTasks, tasks, agent]);

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.72)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
    >
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460,
          maxHeight: "88dvh",
          overflowY: "auto",
          background: "#141414",
          borderRadius: 16,
          border: "1px solid #222",
          boxShadow: "0 32px 96px rgba(0,0,0,0.85)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 20px 18px",
          borderBottom: "1px solid #1e1e1e",
          display: "flex", alignItems: "flex-start", gap: 16,
        }}>
          {/* Avatar circle */}
          <div style={{
            width: 58, height: 58, borderRadius: 14, flexShrink: 0,
            background: `${deptColor}1a`,
            border: `2px solid ${deptColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: deptColor, letterSpacing: -0.5 }}>
              {initials}
            </span>
          </div>

          {/* Name + role + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.2, marginBottom: 3 }}>
              {agent.display_name}
            </div>
            <div style={{ fontSize: 13, color: "#777", marginBottom: 10 }}>
              {agent.role}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {agent.department && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                  color: deptColor, background: `${deptColor}18`,
                  padding: "3px 9px", borderRadius: 20, textTransform: "uppercase",
                }}>
                  {DEPT_LABEL[agent.department] || agent.department}
                </span>
              )}
              {agent.model_tier && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                  color: TIER_COLOR[agent.model_tier] || "#555",
                  background: `${TIER_COLOR[agent.model_tier] || "#555"}18`,
                  padding: "3px 9px", borderRadius: 20, textTransform: "uppercase",
                }}>
                  {agent.model_tier}
                </span>
              )}
              {/* Status pill */}
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20,
                background: `${statusInfo.color}12`,
                border: `1px solid ${statusInfo.color}30`,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: statusInfo.color,
                  boxShadow: status === "working" ? `0 0 5px ${statusInfo.color}` : "none",
                }} />
                <span style={{ fontSize: 10, color: statusInfo.color, fontWeight: 700, letterSpacing: 1 }}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              color: "#555", fontSize: 22, cursor: "pointer",
              padding: "0 2px", lineHeight: 1, flexShrink: 0,
              marginTop: -2,
            }}
          >×</button>
        </div>

        {/* ── About ── */}
        {agent.about && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{
              fontSize: 10, color: "#555", letterSpacing: 1.5,
              fontWeight: 600, textTransform: "uppercase", marginBottom: 8,
            }}>
              About
            </div>
            <p style={{
              fontSize: 14, color: "#888",
              lineHeight: 1.7, margin: 0,
            }}>
              {agent.about}
            </p>
          </div>
        )}

        {/* ── Skills ── */}
        {skills.length > 0 && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{
              fontSize: 10, color: "#555", letterSpacing: 1.5,
              fontWeight: 600, textTransform: "uppercase", marginBottom: 10,
            }}>
              Skills
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {skills.map(s => (
                <span key={s} style={{
                  fontSize: 12, color: "#999",
                  background: "#1c1c1c", border: "1px solid #2a2a2a",
                  padding: "4px 11px", borderRadius: 20,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Workload stats ── */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e" }}>
          <div style={{
            fontSize: 10, color: "#555", letterSpacing: 1.5,
            fontWeight: 600, textTransform: "uppercase", marginBottom: 12,
          }}>
            Workload
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Assigned",    value: stats.assigned,   color: "#6366f1" },
              { label: "In Progress", value: stats.inProgress,  color: "#06b6d4" },
              { label: "Blocked",     value: stats.blocked,     color: "#ef4444" },
              { label: "Waiting",     value: stats.waiting,     color: "#a855f7" },
              { label: "Completed",   value: stats.done,        color: "#10b981" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                flex: "1 0 72px",
                background: "#1a1a1a",
                borderRadius: 10,
                padding: "10px 8px",
                textAlign: "center",
                border: "1px solid #222",
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 5, letterSpacing: 0.3 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* ── Wake button ── */}
        <div style={{ padding: "16px 20px" }}>
          <button
            onClick={handleWake}
            disabled={wakeState === "sending" || wakeState === "sent"}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: 10,
              border: wakeState === "error"
                ? "1px solid #ef444440"
                : wakeState === "sent"
                ? "1px solid #10b98140"
                : "1px solid #2a2a2a",
              background: wakeState === "error"
                ? "#ef444410"
                : wakeState === "sent"
                ? "#10b98110"
                : "#1c1c1c",
              color: wakeState === "error"
                ? "#ef4444"
                : wakeState === "sent"
                ? "#10b981"
                : wakeState === "sending"
                ? "#555"
                : "#e0e0e0",
              fontSize: 14, fontWeight: 600,
              cursor: wakeState === "sending" || wakeState === "sent" ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 16 }}>
              {wakeState === "sent" ? "✓" : wakeState === "error" ? "⚠" : "▶"}
            </span>
            {wakeState === "sending" ? "Sending wake signal..." :
             wakeState === "sent"    ? `${agent.display_name} has been woken` :
             wakeState === "error"   ? "Failed" :
             `Wake ${agent.display_name}`}
          </button>
          {wakeState === "error" && wakeError && (
            <div style={{
              marginTop: 8, fontSize: 11, color: "#ef4444",
              lineHeight: 1.5, textAlign: "center",
            }}>
              {wakeError}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
