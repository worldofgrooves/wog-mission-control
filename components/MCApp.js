"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "./Sidebar";
import TaskList from "./TaskList";
import TaskDetail from "./TaskDetail";
import AgentProfile from "./AgentProfile";
import LiveFeed from "./LiveFeed";
import IdeasPanel from "./IdeasPanel";

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
  backlog:           "#8b5cf6",
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
  backlog:           "Backlog",
  parked:            "Parked",
  done:              "Done",
};

export const AREA_LABEL = {
  wog:             "World of Grooves",
  plume:           "Plume Creative",
  artifact:        "ArtiFact",
  groove_dwellers: "Groove Dwellers",
  shared:          "Shared",
  house:           "House",
  personal:        "Personal",
  studio:          "Studio",
};
// Backwards-compatible alias
export const BRAND_LABEL = AREA_LABEL;
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
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + (7 - now.getDay())); weekEnd.setHours(23, 59, 59, 999);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const active = tasks.filter(t => t.status !== "done" && t.status !== "parked" && t.status !== "backlog");

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
      return active.filter(t => {
        if (!t.deadline_at) return false;
        const d = new Date(t.deadline_at);
        return d >= now && d <= weekEnd;
      });
    case "this-month":
      return active.filter(t => {
        if (!t.deadline_at) return false;
        const d = new Date(t.deadline_at);
        return d > weekEnd && d <= monthEnd;
      });
    case "backlog":
      return tasks.filter(t => t.status === "backlog");
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
        // Area views include backlog tasks (but not done/parked)
        const areaActive = tasks.filter(t => t.status !== "done" && t.status !== "parked");
        return areaActive.filter(t => t.brand === view.slice(6));
      }
      return active;
  }
}

export function getViewTitle(view, agents) {
  const map = {
    "my-day": "My Day", "important": "Important", "blocked": "Blocked",
    "waiting": "Waiting on Me", "all": "Planned",
    "today": "Today", "this-week": "This Week", "this-month": "This Month",
    "backlog": "Backlog", "parked": "Parked", "done": "Done",
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
  if (view.startsWith("brand:")) return AREA_LABEL[view.slice(6)] || view.slice(6);
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

function StatsBar({ stats, isMobile, onMenuOpen, onDashOpen }) {
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
      <div style={{ flex: 1 }} />
      <StatChip value={stats.agentsActive} label="Agents Active" color="#10b981" />
      {stats.agentsStuck > 0     && <StatChip value={stats.agentsStuck}     label="Stuck"   color="#ef4444" />}
      <StatChip value={stats.inQueue}      label="In Queue"      color="#c9a96e" />
      {stats.blocked > 0         && <StatChip value={stats.blocked}         label="Blocked" color="#ef4444" />}
      {stats.waitingOnDenver > 0 && <StatChip value={stats.waitingOnDenver} label="Waiting" color="#a855f7" />}
      {/* Agent health dashboard button -- desktop only (mobile uses sidebar) */}
      {!isMobile && (
        <button
          onClick={onDashOpen}
          title="Open health dashboard"
          style={{
            background: "none",
            border: "1px solid #222",
            borderRadius: 6,
            color: "#555",
            fontSize: 13,
            cursor: "pointer",
            padding: "5px 10px",
            lineHeight: 1,
            letterSpacing: 0.5,
            flexShrink: 0,
            transition: "border-color 0.12s, color 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#c9a96e"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#555"; }}
        >
          ◉ Dashboard
        </button>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function MCApp() {
  const [tasks,         setTasks]         = useState([]);
  const [agents,        setAgents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showDash,      setShowDash]      = useState(false);
  const [activeView,    setActiveView]    = useState("my-day");
  const [selectedId,    setSelectedId]    = useState(null);
  const [detailData,    setDetailData]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sidebarOpen,    setSidebarOpen]   = useState(false);
  const [isMobile,       setIsMobile]      = useState(false);
  const [isDesktop,      setIsDesktop]     = useState(false);
  const [profileAgentId, setProfileAgentId] = useState(null);
  const [toast,          setToast]          = useState(null);
  const [heartbeats,     setHeartbeats]     = useState([]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Ideas state ──
  const [ideas,   setIdeas]   = useState([]);
  const [folders, setFolders] = useState([]);

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

  // ── Lock body scroll when mobile sidebar is open ──
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sidebarOpen]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    const [ag, tk] = await Promise.all([
      sb.from("mc_agents").select("*").order("display_name"),
      sb.from("mc_tasks")
        .select("*, mc_agents(id, name, display_name)")
        .neq("status", "parked")
        .order("sort_order", { nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);
    if (ag.data) setAgents(ag.data);
    if (tk.data) setTasks(tk.data);
    setLoading(false);
  }, []);

  // Load all tasks (including parked) once on mount
  const loadAll = useCallback(async () => {
    const [ag, tk, fo, id, hb] = await Promise.all([
      sb.from("mc_agents").select("*").order("display_name"),
      sb.from("mc_tasks")
        .select("*, mc_agents(id, name, display_name)")
        .order("sort_order", { nullsFirst: false })
        .order("created_at", { ascending: false }),
      sb.from("mc_idea_folders").select("*").order("sort_order"),
      sb.from("mc_ideas").select("*").order("created_at", { ascending: false }),
      sb.from("agent_heartbeats").select("*"),
    ]);
    if (ag.data) setAgents(ag.data);
    if (tk.data) setTasks(tk.data);
    if (fo.data) setFolders(fo.data);
    if (id.data) setIdeas(id.data);
    if (hb.data) setHeartbeats(hb.data);
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

  // ── Global stats (derived from task data -- heartbeats not yet wired) ──
  const stats = useMemo(() => {
    // Count agents that have at least one in_progress task
    const agentIdsWorking = new Set();
    const agentIdsStuck   = new Set();
    for (const t of tasks) {
      if (t.assignee_agent_id && t.status === "in_progress") agentIdsWorking.add(t.assignee_agent_id);
      if (t.assignee_agent_id && t.status === "blocked")     agentIdsStuck.add(t.assignee_agent_id);
    }
    return {
      agentsActive:    agentIdsWorking.size,
      agentsStuck:     agentIdsStuck.size,
      inQueue:         tasks.filter(t => t.status !== "done" && t.status !== "parked" && t.status !== "backlog").length,
      blocked:         tasks.filter(t => t.status === "blocked").length,
      waitingOnDenver: tasks.filter(t => t.status === "waiting_on_denver").length,
    };
  }, [tasks]);

  // ── Mutations ──
  const updateTask = useCallback(async (id, fields) => {
    // Snapshot for rollback
    const snapshot = tasks.find(t => t.id === id);
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    const { error } = await sb.from("mc_tasks")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("updateTask failed:", error.message, fields);
      // Rollback optimistic update
      if (snapshot) setTasks(prev => prev.map(t => t.id === id ? snapshot : t));
      return { error };
    }
    return { error: null };
  }, [tasks]);

  const toggleComplete = useCallback(async (task) => {
    const isDone = task.status === "done";
    const fields = {
      status: isDone ? "inbox" : "done",
      completed_at: isDone ? null : new Date().toISOString(),
    };
    // Denver override: satisfy verification trigger when completing from UI.
    // Include all possible evidence fields so any verification_type passes.
    if (!isDone && task.verification_required) {
      fields.verification_evidence = {
        override: "Marked complete by Denver via Mission Control",
        completed_via: "mc_dashboard",
        completed_at: new Date().toISOString(),
        url: "n/a — completed manually",
        behavior: "Denver confirmed task complete from MC dashboard",
        file_path: "n/a — completed manually",
        description: "Denver confirmed task complete from MC dashboard",
        summary: "Denver confirmed task complete from MC dashboard",
      };
    }
    await updateTask(task.id, fields);
  }, [updateTask]);

  const toggleStar = useCallback(async (task) => {
    const isStarring = task.priority !== "immediate";
    const fields = {
      priority: isStarring ? "immediate" : "this_week",
    };
    // When starring: push to top of list by undercutting any existing sort_order
    if (isStarring) fields.sort_order = 0;
    await updateTask(task.id, fields);
  }, [updateTask]);

  const toggleMyDay = useCallback(async (task) => {
    await updateTask(task.id, { flagged_today: !task.flagged_today });
  }, [updateTask]);

  const reorderTasks = useCallback(async (reorderedList) => {
    // Assign sort_order values with gaps (x10) to allow future insertions
    const updates = reorderedList.map((task, idx) => ({
      id: task.id,
      sort_order: (idx + 1) * 10,
    }));
    // Optimistic update
    const orderMap = Object.fromEntries(updates.map(u => [u.id, u.sort_order]));
    setTasks(prev => prev.map(t =>
      orderMap[t.id] !== undefined ? { ...t, sort_order: orderMap[t.id] } : t
    ));
    // Persist to Supabase
    await Promise.all(updates.map(({ id, sort_order }) =>
      sb.from("mc_tasks").update({ sort_order, updated_at: new Date().toISOString() }).eq("id", id)
    ));
  }, []);

  // ── Ideas mutations ──
  const addIdea = useCallback(async (title, folderId) => {
    const fields = {
      title,
      folder_id: folderId || null,
      source: "denver",
    };
    const { data, error } = await sb.from("mc_ideas").insert(fields).select().single();
    if (error) { console.error("addIdea failed:", error.message); return; }
    if (data) setIdeas(prev => [data, ...prev]);
  }, []);

  const updateIdea = useCallback(async (id, fields) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
    await sb.from("mc_ideas").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const deleteIdea = useCallback(async (id) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    setSelectedId(null);
    await sb.from("mc_ideas").delete().eq("id", id);
  }, []);

  const promoteIdea = useCallback(async (idea) => {
    // Create a task from this idea
    const fields = {
      title:       idea.title,
      description: idea.body || "",
      status:      "inbox",
      priority:    "when_capacity",
      created_by:  "denver",
    };
    const { data: taskData, error } = await sb.from("mc_tasks")
      .insert(fields)
      .select("*, mc_agents(id, name, display_name)")
      .single();
    if (error) { console.error("promoteIdea failed:", error.message); return; }
    if (taskData) {
      setTasks(prev => [taskData, ...prev]);
      // Mark idea as promoted
      await updateIdea(idea.id, { promoted_to_task_id: taskData.id });
      // Navigate to the new task
      setSelectedId(taskData.id);
      setActiveView("all");
    }
  }, [updateIdea]);

  const addFolder = useCallback(async (name) => {
    const maxSort = folders.reduce((m, f) => Math.max(m, f.sort_order || 0), 0);
    const { data, error } = await sb.from("mc_idea_folders")
      .insert({ name, sort_order: maxSort + 10 })
      .select().single();
    if (error) { console.error("addFolder failed:", error.message); return; }
    if (data) setFolders(prev => [...prev, data]);
  }, [folders]);

  const deleteFolder = useCallback(async (folderId) => {
    // Unfolder ideas (set folder_id null) -- they move to "All Ideas" unfoldered
    await sb.from("mc_ideas").update({ folder_id: null }).eq("folder_id", folderId);
    setIdeas(prev => prev.map(i => i.folder_id === folderId ? { ...i, folder_id: null } : i));
    setFolders(prev => prev.filter(f => f.id !== folderId));
    await sb.from("mc_idea_folders").delete().eq("id", folderId);
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedId(null);
    await sb.from("mc_tasks").delete().eq("id", taskId);
  }, []);

  // ── Ideas derived state ──
  const ideasCount = useMemo(() => {
    const counts = {};
    for (const idea of ideas) {
      if (idea.folder_id) counts[idea.folder_id] = (counts[idea.folder_id] || 0) + 1;
    }
    return counts;
  }, [ideas]);

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
    if (activeView === "backlog")          { fields.status = "backlog"; }
    if (activeView.startsWith("brand:")) fields.brand = activeView.slice(6);

    const { data, error } = await sb.from("mc_tasks")
      .insert(fields)
      .select("*, mc_agents(id, name, display_name)")
      .single();
    if (error) { console.error("quickCapture failed:", error.message); return; }
    if (data)  setTasks(prev => [data, ...prev]);
  }, [activeView]);

  const wakeTask = useCallback(async (task) => {
    // Find the agent assigned to this task
    const agent = task.mc_agents || agents.find(a => a.id === task.assignee_agent_id);
    if (!agent) {
      console.error("[MC] Wake failed: no agent found for task", task.id, task.assignee_agent_id);
      setToast({ msg: "No agent assigned to this task", type: "error" });
      return;
    }
    try {
      setToast({ msg: `Waking ${agent.display_name || agent.name}...`, type: "info" });
      const res = await fetch("/api/agents/wake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: agent.name, taskNumber: task.task_number }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setToast({ msg: `${agent.display_name || agent.name} woken via ${data.method || "unknown"}`, type: "success" });
      } else {
        console.error("[MC] Wake API error:", res.status, data);
        setToast({ msg: `Wake failed: ${data.error || res.statusText}`, type: "error" });
      }
    } catch (err) {
      console.error("[MC] Wake fetch error:", err);
      setToast({ msg: `Wake failed: ${err.message}`, type: "error" });
    }
  }, [agents]);

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
  const isIdeasView = activeView === "ideas:all" || activeView.startsWith("ideas:folder:");

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
      {/* ── Toast ── */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: toast.type === "error" ? "#7f1d1d" : toast.type === "success" ? "#14532d" : "#1e293b",
            color: toast.type === "error" ? "#fca5a5" : toast.type === "success" ? "#86efac" : "#94a3b8",
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          {toast.msg}
        </div>
      )}
      {/* ── Stats bar ── */}
      <StatsBar stats={stats} isMobile={isMobile} onMenuOpen={() => setSidebarOpen(true)} onDashOpen={() => setShowDash(true)} />

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
          heartbeats={heartbeats}
          activeView={activeView}
          onViewChange={handleViewChange}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          folders={folders}
          ideasCount={ideasCount}
          onAddFolder={addFolder}
          onDeleteFolder={deleteFolder}
          onDashOpen={() => setShowDash(true)}
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

        {/* ── Ideas view ── */}
        {isIdeasView ? (
          <IdeasPanel
            ideas={ideas}
            folders={folders}
            activeView={activeView}
            selectedId={selectedId}
            isMobile={isMobile}
            onIdeaSelect={(idea) => setSelectedId(idea ? idea.id : null)}
            onAddIdea={addIdea}
            onUpdateIdea={updateIdea}
            onDeleteIdea={deleteIdea}
            onPromoteIdea={promoteIdea}
            onAddFolder={addFolder}
          />
        ) : (
          <>
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
                  onReorder={activeView !== "done" && activeView !== "parked" ? reorderTasks : undefined}
                  onWakeTask={wakeTask}
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
                  onDelete={deleteTask}
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
          </>
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
            heartbeats={heartbeats}
            onClose={() => setProfileAgentId(null)}
          />
        ) : null;
      })()}

      {/* ── Health dashboard overlay ── */}
      {showDash && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          background: "#000",
        }}>
          {/* Close bar */}
          <div style={{
            flexShrink: 0,
            height: 48,
            background: "#080808",
            borderBottom: "1px solid #161616",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 16,
          }}>
            <span style={{ fontSize: 9, color: "#c9a96e", letterSpacing: 3, fontWeight: 700 }}>
              ◉ DASHBOARD
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowDash(false)}
              style={{
                background: "none", border: "none",
                color: "#555", fontSize: 28, cursor: "pointer",
                padding: "2px 8px", lineHeight: 1,
                transition: "color 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#aaa"}
              onMouseLeave={e => e.currentTarget.style.color = "#555"}
            >
              ×
            </button>
          </div>
          {/* iframe */}
          <iframe
            src={process.env.NEXT_PUBLIC_DASH_URL}
            style={{
              flex: 1,
              border: "none",
              width: "100%",
              height: "100%",
              background: "#000",
            }}
            title="Health Dashboard"
          />
        </div>
      )}
    </div>
  );
}
