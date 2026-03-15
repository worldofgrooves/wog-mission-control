"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "./Sidebar";
import TaskList from "./TaskList";
import TaskDetail from "./TaskDetail";
import AgentProfile from "./AgentProfile";
import LiveFeed from "./LiveFeed";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── Constants (shared across components via export) ──────────────────────────

export const PRI_ORDER = { immediate: 1, this_week: 2, when_capacity: 3 };
export const PRI_COLOR = { immediate: "#ef4444", this_week: "#f59e0b", when_capacity: "#484848" };
export const PRI_LABEL = { immediate: "Immediate", this_week: "This Week", when_capacity: "When Capacity" };

export const STATUS_COLOR = {
  inbox:             "#666",
  assigned:          "#6366f1",
  in_progress:       "#06b6d4",
  blocked:           "#ef4444",
  review:            "#f59e0b",
  waiting_on_denver: "#a855f7",
  parked:            "#64748b",
  done:              "#10b981",
};
export const STATUS_LABEL = {
  inbox:             "Inbox",
  assigned:          "Assigned",
  in_progress:       "In Progress",
  blocked:           "Blocked",
  review:            "Review",
  waiting_on_denver: "Waiting on Me",
  parked:            "Parked",
  done:              "Done",
};

export const BRAND_LABEL = {
  wog:             "World of Grooves",
  plume:           "Plume Creative",
  artifact:        "ArtiFact",
  groove_dwellers: "Groove Dwellers",
  shared:          "Shared",
};
export const DEPT_LABEL = {
  content:    "Content",
  research:   "Research",
  operations: "Operations",
  build:      "Build",
};

// ─── Task filtering per view ──────────────────────────────────────────────────

export function filterTasks(tasks, view) {
  const now    = new Date();
  const todayS = now.toDateString();
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + (6 - now.getDay()) + 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const active = tasks.filter(t => t.status !== "done" && t.status !== "parked");

  switch (view) {
    case "my-day":
      return active.filter(t => t.flagged_today || t.priority === "immediate");
    case "important":
      return active.filter(t => t.priority === "immediate");
    case "blocked":
      return tasks.filter(t => t.status === "blocked");
    case "waiting":
      return tasks.filter(t => t.status === "waiting_on_denver");
    case "all":
      return active;
    case "today":
      return active.filter(t => {
        if (t.flagged_today) return true;
        if (t.deadline_at && new Date(t.deadline_at).toDateString() === todayS) return true;
        return false;
      });
    case "this-week":
      return active.filter(t => t.deadline_at && new Date(t.deadline_at) >= now && new Date(t.deadline_at) <= weekEnd);
    case "this-month":
      return active.filter(t => t.deadline_at && new Date(t.deadline_at) >= now && new Date(t.deadline_at) <= monthEnd);
    case "parked":
      return tasks.filter(t => t.status === "parked");
    case "done":
      return tasks.filter(t => t.status === "done");
    default:
      if (view.startsWith("agent:")) {
        const rest = view.slice(6);
        // Per-agent completed view
        if (rest.endsWith(":done")) {
          const id = rest.slice(0, -5);
          if (id === "unassigned") return tasks.filter(t => t.status === "done" && !t.assignee_agent_id);
          return tasks.filter(t => t.status === "done" && t.assignee_agent_id === id);
        }
        if (rest === "unassigned") return active.filter(t => !t.assignee_agent_id);
        return active.filter(t => t.assignee_agent_id === rest);
      }
      if (view.startsWith("brand:")) {
        return active.filter(t => t.brand === view.slice(6));
      }
      return active;
  }
}

export function getViewTitle(view, agents) {
  const map = {
    "my-day": "My Day", "important": "Important", "blocked": "Blocked",
    "waiting": "Waiting on Me", "all": "All Tasks",
    "today": "Today", "this-week": "This Week", "this-month": "This Month",
    "parked": "Parked", "done": "Done",
  };
  if (map[view]) return map[view];
  if (view.startsWith("agent:")) {
    const rest = view.slice(6);
    if (rest.endsWith(":done")) {
      const id = rest.slice(0, -5);
      const name = id === "unassigned" ? "Denver" : agents.find(a => a.id === id)?.display_name || "Agent";
      return `${name} -- Completed`;
    }
    if (rest === "unassigned") return "Denver";
    return agents.find(a => a.id === rest)?.display_name || "Agent";
  }
  if (view.startsWith("brand:")) return BRAND_LABEL[view.slice(6)] || view.slice(6);
  return "Tasks";
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatChip({ value, label, color = "#c9a96e" }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
      <span style={{ fontSize: 19, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, color: "#444", letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function StatsBar({ stats, isMobile, onMenuOpen }) {
  return (
    <div style={{
      flexShrink: 0,
      height: 48,
      background: "#080808",
      borderBottom: "1px solid #161616",
      display: "flex",
      alignItems: "center",
      padding: isMobile ? "0 16px 0 4px" : "0 20px",
      gap: isMobile ? 16 : 24,
    }}>
      {/* On mobile: hamburger menu button. On desktop: ◈ MC monogram. */}
      {isMobile ? (
        <button
          onClick={onMenuOpen}
          style={{
            background: "none", border: "none",
            color: "#e0e0e0", fontSize: 28, cursor: "pointer",
            padding: "4px 12px", lineHeight: 1, flexShrink: 0,
            display: "flex", alignItems: "center",
          }}
        >
          ☰
        </button>
      ) : (
        <div style={{
          fontSize: 9, color: "#c9a96e", letterSpacing: 3,
          fontWeight: 700, marginRight: 4, flexShrink: 0,
        }}>
          ◈ MC
        </div>
      )}
      <StatChip value={stats.agentsActive} label="Agents Active" color="#10b981" />
      <StatChip value={stats.inQueue}      label="In Queue"      color="#c9a96e" />
      {stats.blocked > 0         && <StatChip value={stats.blocked}         label="Blocked" color="#ef4444" />}
      {stats.waitingOnDenver > 0 && <StatChip value={stats.waitingOnDenver} label="Waiting" color="#a855f7" />}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function MCApp() {
  const [tasks,         setTasks]         = useState([]);
  const [agents,        setAgents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeView,    setActiveView]    = useState("my-day");
  const [selectedId,    setSelectedId]    = useState(null);
  const [detailData,    setDetailData]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sidebarOpen,    setSidebarOpen]   = useState(false);
  const [isMobile,       setIsMobile]      = useState(false);
  const [isDesktop,      setIsDesktop]     = useState(false);
  const [profileAgentId, setProfileAgentId] = useState(null);

  // ── Responsive ──
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsDesktop(window.innerWidth >= 1280);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Load data ──
  const loadData = useCallback(async () => {
    const [ag, tk] = await Promise.all([
      sb.from("mc_agents").select("*").order("display_name"),
      sb.from("mc_tasks")
        .select("*, mc_agents(id, name, display_name)")
        .neq("status", "parked") // load parked lazily via view filter workaround
        .order("position")
        .order("created_at", { ascending: false }),
    ]);
    if (ag.data) setAgents(ag.data);
    if (tk.data) setTasks(tk.data);
    setLoading(false);
  }, []);

  // Load all tasks (including parked) once on mount
  const loadAll = useCallback(async () => {
    const [ag, tk] = await Promise.all([
      sb.from("mc_agents").select("*").order("display_name"),
      sb.from("mc_tasks")
        .select("*, mc_agents(id, name, display_name)")
        .order("position")
        .order("created_at", { ascending: false }),
    ]);
    if (ag.data) setAgents(ag.data);
    if (tk.data) setTasks(tk.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  // ── Load task detail on selection ──
  useEffect(() => {
    if (!selectedId) { setDetailData(null); return; }
    setDetailLoading(true);
    Promise.all([
      sb.from("mc_task_comments").select("*").eq("task_id", selectedId).order("created_at"),
      sb.from("mc_task_deliverables").select("*").eq("task_id", selectedId).order("created_at", { ascending: false }),
    ]).then(([cm, dv]) => {
      setDetailData({ comments: cm.data || [], deliverables: dv.data || [] });
      setDetailLoading(false);
    });
  }, [selectedId]);

  // ── Derived state ──
  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedId) || null,
    [tasks, selectedId]
  );

  const viewTasks = useMemo(
    () => filterTasks(tasks, activeView),
    [tasks, activeView]
  );

  // Completed tasks for the current agent view (shown as collapsible section in TaskList)
  const agentCompletedTasks = useMemo(() => {
    if (!activeView.startsWith("agent:")) return [];
    const agentPart = activeView.slice(6);
    if (agentPart.endsWith(":done")) return [];
    if (agentPart === "unassigned") return tasks.filter(t => t.status === "done" && !t.assignee_agent_id);
    return tasks.filter(t => t.status === "done" && t.assignee_agent_id === agentPart);
  }, [tasks, activeView]);

  const viewTitle = useMemo(
    () => getViewTitle(activeView, agents),
    [activeView, agents]
  );

  // ── Global stats ──
  const stats = useMemo(() => {
    const activeAgentIds = new Set(
      tasks
        .filter(t => t.status === "in_progress" || t.status === "assigned")
        .filter(t => t.assignee_agent_id)
        .map(t => t.assignee_agent_id)
    );
    return {
      agentsActive:    activeAgentIds.size,
      inQueue:         tasks.filter(t => t.status !== "done" && t.status !== "parked").length,
      blocked:         tasks.filter(t => t.status === "blocked").length,
      waitingOnDenver: tasks.filter(t => t.status === "waiting_on_denver").length,
    };
  }, [tasks]);

  // ── Mutations ──
  const updateTask = useCallback(async (id, fields) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    const { error } = await sb.from("mc_tasks")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("updateTask failed:", error.message, fields);
  }, []);

  const toggleComplete = useCallback(async (task) => {
    const isDone = task.status === "done";
    const fields = {
      status: isDone ? "inbox" : "done",
      completed_at: isDone ? null : new Date().toISOString(),
    };
    await updateTask(task.id, fields);
  }, [updateTask]);

  const toggleStar = useCallback(async (task) => {
    await updateTask(task.id, {
      priority: task.priority === "immediate" ? "this_week" : "immediate",
    });
  }, [updateTask]);

  const toggleMyDay = useCallback(async (task) => {
    await updateTask(task.id, { flagged_today: !task.flagged_today });
  }, [updateTask]);

  const quickCapture = useCallback(async (title) => {
    if (!title.trim()) return;
    const fields = {
      title:       title.trim(),
      description: "",           // NOT NULL column -- required
      status:      "inbox",
      priority:    "when_capacity",
      created_by:  "denver",
    };
    // Pre-fill context from active view
    if (activeView === "my-day")       { fields.flagged_today = true; fields.priority = "immediate"; }
    if (activeView === "important")    { fields.priority = "immediate"; }
    if (activeView.startsWith("agent:")) {
      const agentPart = activeView.slice(6);
      const isDone = agentPart.endsWith(":done");
      const agentId = isDone ? agentPart.slice(0, -5) : agentPart;
      if (!isDone && agentId !== "unassigned") {
        fields.assignee_agent_id = agentId;
        fields.status = "assigned";
      }
    }
    if (activeView.startsWith("brand:")) fields.brand = activeView.slice(6);

    const { data, error } = await sb.from("mc_tasks")
      .insert(fields)
      .select("*, mc_agents(id, name, display_name)")
      .single();
    if (error) { console.error("quickCapture failed:", error.message); return; }
    if (data)  setTasks(prev => [data, ...prev]);
  }, [activeView]);

  const addComment = useCallback(async (taskId, body) => {
    if (!body.trim()) return;
    const { data } = await sb.from("mc_task_comments").insert({
      task_id:      taskId,
      author_type:  "denver",
      author_name:  "Denver",
      comment_type: "note",
      body:         body.trim(),
    }).select().single();
    if (data) {
      setDetailData(prev => prev ? { ...prev, comments: [...prev.comments, data] } : prev);
    }
    await sb.from("mc_tasks")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", taskId);
  }, []);

  // ── Navigation ──
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
    setSelectedId(null);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleAgentProfile = useCallback((agentId) => {
    setProfileAgentId(agentId);
  }, []);

  const handleTaskSelect = useCallback((task) => {
    setSelectedId(task ? task.id : null);
  }, []);

  // ── Loading screen ──
  if (loading) {
    return (
      <div style={{
        height: "100dvh", background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#c9a96e", letterSpacing: 3, marginBottom: 10 }}>◈ MISSION CONTROL</div>
          <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>LOADING...</div>
        </div>
      </div>
    );
  }

  const showDetail = !!selectedId && !!selectedTask;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "#000",
      overflow: "hidden",
      color: "#f0f0f0",
    }}>
      {/* ── Stats bar ── */}
      <StatsBar stats={stats} isMobile={isMobile} onMenuOpen={() => setSidebarOpen(true)} />

      {/* ── Main layout (sidebar + content) ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>

      {/* Mobile sidebar overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 40,
            animation: "fadeIn 0.15s ease",
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position:   isMobile ? "fixed" : "relative",
        left:       isMobile ? (sidebarOpen ? 0 : -290) : 0,
        top: 0, bottom: 0,
        width:      272,
        zIndex:     isMobile ? 50 : "auto",
        transition: isMobile ? "left 0.22s ease" : "none",
        flexShrink: 0,
      }}>
        <Sidebar
          tasks={tasks}
          agents={agents}
          activeView={activeView}
          onViewChange={handleViewChange}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          onWakeAgent={async (agentName) => {
            await fetch("/api/agents/wake", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agentName }),
            });
          }}
        />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0, position: "relative" }}>
        {/* Task list -- hidden on mobile when detail is open */}
        {(!isMobile || !showDetail) && (
          <div style={{
            flex:     showDetail && !isMobile ? "0 0 auto" : 1,
            width:    showDetail && !isMobile
              ? `calc(100% - 400px${isDesktop ? " - 280px" : ""})`
              : "100%",
            minWidth: 0,
            display:  "flex",
            flexDirection: "column",
          }}>
            <TaskList
              tasks={viewTasks}
              completedTasks={agentCompletedTasks}
              viewTitle={viewTitle}
              activeView={activeView}
              agents={agents}
              selectedId={selectedId}
              isMobile={isMobile}
              onTaskSelect={handleTaskSelect}
              onToggleComplete={toggleComplete}
              onToggleStar={toggleStar}
              onToggleMyDay={toggleMyDay}
              onQuickCapture={quickCapture}
              onMenuOpen={() => setSidebarOpen(true)}
              onAgentProfile={handleAgentProfile}
              onStatusChange={(id, status) => updateTask(id, { status })}
            />
          </div>
        )}

        {/* Task detail */}
        {showDetail && (
          <div style={{
            width:       isMobile ? "100%" : 400,
            flexShrink:  0,
            borderLeft:  isMobile ? "none" : "1px solid #1a1a1a",
            overflow:    "hidden",
            display:     "flex",
            flexDirection: "column",
          }}>
            <TaskDetail
              task={selectedTask}
              agents={agents}
              comments={detailData?.comments || []}
              deliverables={detailData?.deliverables || []}
              loading={detailLoading}
              isMobile={isMobile}
              onClose={() => setSelectedId(null)}
              onUpdate={(fields) => updateTask(selectedTask.id, fields)}
              onToggleComplete={() => toggleComplete(selectedTask)}
              onToggleStar={() => toggleStar(selectedTask)}
              onToggleMyDay={() => toggleMyDay(selectedTask)}
              onAddComment={(body) => addComment(selectedTask.id, body)}
            />
          </div>
        )}

        {/* Live Feed -- desktop right rail (>= 1280px) */}
        {isDesktop && (
          <LiveFeed
            agents={agents}
            onTaskSelect={handleTaskSelect}
            onAgentProfile={handleAgentProfile}
          />
        )}
      </div>

      </div> {/* end main layout */}

      {/* ── Agent profile modal ── */}
      {profileAgentId && (() => {
        const agent = agents.find(a => a.id === profileAgentId);
        return agent ? (
          <AgentProfile
            agent={agent}
            tasks={tasks}
            onClose={() => setProfileAgentId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}
