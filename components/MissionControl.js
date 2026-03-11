'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const STATUS_COLUMNS = [
  { key: 'inbox',             label: 'INBOX',       color: '#64748b' },
  { key: 'assigned',          label: 'ASSIGNED',    color: '#6366f1' },
  { key: 'in_progress',       label: 'IN PROGRESS', color: '#06b6d4' },
  { key: 'blocked',           label: 'BLOCKED',     color: '#ef4444' },
  { key: 'review',            label: 'REVIEW',      color: '#f59e0b' },
  { key: 'waiting_on_denver', label: 'WAITING',     color: '#a855f7' },
  { key: 'done',              label: 'DONE',        color: '#10b981' },
]

const PRIORITY = {
  immediate:     { label: 'IMMEDIATE', color: '#ef4444' },
  this_week:     { label: 'THIS WEEK', color: '#f59e0b' },
  when_capacity: { label: 'CAPACITY',  color: '#475569' },
}

const BRAND = {
  wog:             { label: 'WoG',      color: '#d97706' },
  plume:           { label: 'PLUME',    color: '#6366f1' },
  artifact:        { label: 'ARTIFACT', color: '#06b6d4' },
  groove_dwellers: { label: 'GD',       color: '#10b981' },
  shared:          { label: 'SHARED',   color: '#64748b' },
}

const DEPT = {
  content:    { label: 'CONTENT',  color: '#f59e0b' },
  research:   { label: 'RESEARCH', color: '#06b6d4' },
  operations: { label: 'OPS',      color: '#10b981' },
  build:      { label: 'BUILD',    color: '#6366f1' },
}

const AGENT_STATUS_STYLE = {
  idle:    { color: '#10b981', shadow: '0 0 6px #10b981' },
  active:  { color: '#06b6d4', shadow: '0 0 6px #06b6d4' },
  blocked: { color: '#ef4444', shadow: '0 0 6px #ef4444' },
}

const COMMENT_COLORS = {
  status_update: '#06b6d4',
  escalation:    '#ef4444',
  decision:      '#f59e0b',
  blocker:       '#ef4444',
  note:          '#475569',
  system_event:  '#2d4a6b',
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts)
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function Badge({ label, color, small }) {
  return (
    <span style={{
      fontSize: small ? 7 : 8,
      padding: small ? '1px 4px' : '2px 6px',
      borderRadius: 2,
      background: `${color}18`,
      color,
      border: `1px solid ${color}35`,
      letterSpacing: 0.5,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function StatusDot({ status }) {
  const s = AGENT_STATUS_STYLE[status] || AGENT_STATUS_STYLE.idle
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%',
      background: s.color, boxShadow: s.shadow, flexShrink: 0,
      animation: status === 'active' ? 'pulse-glow 2s ease-in-out infinite' : 'none',
    }} />
  )
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }) {
  const p = PRIORITY[task.priority] || PRIORITY.when_capacity
  const b = task.brand ? BRAND[task.brand] : null
  const tags = Array.isArray(task.tags) ? task.tags : []
  const isOverdue = task.deadline_at && new Date(task.deadline_at) < new Date()

  return (
    <div
      className="fade-in"
      onClick={() => onClick(task)}
      style={{
        padding: '10px 10px 8px',
        background: 'var(--bg-card)',
        borderRadius: 4,
        border: '1px solid var(--border-dim)',
        borderLeft: `3px solid ${p.color}`,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#0f1e33'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.borderColor = 'var(--border-dim)'
      }}
    >
      <div style={{ fontSize: 8, color: 'var(--text-ghost)', marginBottom: 4, letterSpacing: 1 }}>
        #{task.task_number || '—'}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: 7,
        fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
      }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
        {b && <Badge label={b.label} color={b.color} small />}
        {tags.slice(0, 2).map(tag => (
          <span key={tag} style={{
            fontSize: 7, padding: '1px 4px', borderRadius: 2,
            background: 'rgba(255,255,255,0.03)', color: 'var(--text-ghost)',
          }}>
            {tag}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {task.deadline_at && (
          <span style={{ fontSize: 8, color: isOverdue ? '#ef4444' : 'var(--text-ghost)' }}>
            {isOverdue ? '⚠' : '⏰'} {new Date(task.deadline_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.agents?.display_name && (
          <span style={{ fontSize: 8, color: 'var(--text-ghost)', marginLeft: 'auto' }}>
            → {task.agents.display_name}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── TASK MODAL ───────────────────────────────────────────────────────────────

function TaskModal({ task, comments, onClose }) {
  if (!task) return null
  const col = STATUS_COLUMNS.find(c => c.key === task.status)
  const p = PRIORITY[task.priority] || PRIORITY.when_capacity
  const b = task.brand ? BRAND[task.brand] : null
  const d = task.department ? DEPT[task.department] : null
  const tags = Array.isArray(task.tags) ? task.tags : []

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(4,8,16,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 580, maxHeight: '84vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 0 100px rgba(6,182,212,0.08), 0 40px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-dim)',
          flexShrink: 0,
          background: col ? `${col.color}08` : 'transparent',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingRight: 16 }}>
              <div style={{ fontSize: 8, color: col?.color || 'var(--text-muted)', letterSpacing: 2, marginBottom: 6 }}>
                TASK #{task.task_number} · {task.status?.toUpperCase().replace(/_/g, ' ')}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, color: '#f0f9ff',
                fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.3,
              }}>
                {task.title}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              width: 28, height: 28, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
            <Badge label={p.label} color={p.color} />
            {b && <Badge label={b.label} color={b.color} />}
            {d && <Badge label={d.label} color={d.color} />}
            {tags.map(tag => (
              <span key={tag} style={{
                fontSize: 8, padding: '2px 6px', borderRadius: 2,
                background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                border: '1px solid var(--border-dim)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {task.description && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 8, color: 'var(--text-ghost)', letterSpacing: 2, marginBottom: 8 }}>DESCRIPTION</div>
              <div style={{
                fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                {task.description}
              </div>
            </div>
          )}

          {task.blocked_reason && (
            <div style={{
              padding: '10px 12px', marginBottom: 16,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 4, fontSize: 11, color: '#fca5a5',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              ⚠ <strong>BLOCKED:</strong> {task.blocked_reason}
            </div>
          )}

          {task.parked_reason && (
            <div style={{
              padding: '10px 12px', marginBottom: 16,
              background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 4, fontSize: 11, color: '#d8b4fe',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              ⏸ <strong>PARKED:</strong> {task.parked_reason}
            </div>
          )}

          {/* Timestamps */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'STARTED',       val: task.started_at },
              { label: 'DEADLINE',      val: task.deadline_at, isDeadline: true },
              { label: 'LAST ACTIVITY', val: task.last_activity_at },
            ].filter(f => f.val).map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 7, color: 'var(--text-ghost)', letterSpacing: 1, marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 10, color: f.isDeadline && new Date(f.val) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>
                  {f.isDeadline
                    ? new Date(f.val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : timeAgo(f.val)
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div style={{ fontSize: 8, color: 'var(--text-ghost)', letterSpacing: 2, marginBottom: 10 }}>
            ACTIVITY — {comments.length}
          </div>
          {comments.length === 0 && (
            <div style={{ fontSize: 10, color: 'var(--text-ghost)', letterSpacing: 1 }}>— NO COMMENTS —</div>
          )}
          {comments.map(c => {
            const tc = COMMENT_COLORS[c.comment_type] || '#475569'
            return (
              <div key={c.id} style={{
                marginBottom: 8, padding: '10px 12px',
                background: 'var(--bg-card)', borderRadius: 4,
                border: '1px solid var(--border-dim)',
                borderLeft: `2px solid ${tc}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: tc, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>
                    {c.author_name}
                    {c.comment_type !== 'note' && (
                      <span style={{ fontWeight: 400, color: 'var(--text-ghost)', marginLeft: 6 }}>
                        · {c.comment_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 8, color: 'var(--text-ghost)' }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {c.body}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function MissionControl() {
  const supabase = getSupabase()
  const intervalRef = useRef(null)

  const [agents, setAgents]               = useState([])
  const [tasks, setTasks]                 = useState([])
  const [comments, setComments]           = useState([])
  const [taskComments, setTaskComments]   = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedTask, setSelectedTask]   = useState(null)
  const [activeFilter, setActiveFilter]   = useState('all')
  const [lastRefresh, setLastRefresh]     = useState(null)
  const [loading, setLoading]             = useState(true)

  const loadAll = useCallback(async () => {
    const [{ data: a }, { data: t }, { data: c }] = await Promise.all([
      supabase.from('agents').select('*').order('department').order('display_name'),
      supabase.from('tasks')
        .select('*, agents(display_name, avatar, status)')
        .order('position').order('created_at'),
      supabase.from('task_comments')
        .select('*, tasks(title, task_number)')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (a) setAgents(a)
    if (t) setTasks(t)
    if (c) setComments(c)
    setLastRefresh(new Date())
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll()
    intervalRef.current = setInterval(loadAll, 20000)
    return () => clearInterval(intervalRef.current)
  }, [loadAll])

  const openTask = useCallback(async (task) => {
    setSelectedTask(task)
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setTaskComments(data || [])
  }, [supabase])

  // Filtering
  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'agent' && selectedAgent) return t.assignee_agent_id === selectedAgent.id
    if (activeFilter !== 'all') return t.brand === activeFilter
    return true
  })

  const byStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key)
    return acc
  }, {})

  const stats = {
    active:  tasks.filter(t => !['done','parked'].includes(t.status)).length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    waiting: tasks.filter(t => t.status === 'waiting_on_denver').length,
    done:    tasks.filter(t => t.status === 'done').length,
  }

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: 3 }}>◈</div>
        <div style={{ fontSize: 9, color: 'var(--text-ghost)', letterSpacing: 4 }}>LOADING...</div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 46,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 18px', gap: 14, flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: 'var(--cyan)' }}>
          ◈ MISSION CONTROL
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div style={{ fontSize: 8, color: 'var(--text-ghost)', letterSpacing: 2 }}>
          JANET AI · {lastRefresh ? `SYNCED ${timeAgo(lastRefresh)}` : '—'}
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        {[
          { label: 'ACTIVE',  val: stats.active,  color: 'var(--cyan)' },
          { label: 'BLOCKED', val: stats.blocked, color: '#ef4444' },
          { label: 'WAITING', val: stats.waiting, color: '#a855f7' },
          { label: 'DONE',    val: stats.done,    color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 4, border: '1px solid var(--border-dim)',
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
            <span style={{ fontSize: 8, color: 'var(--text-ghost)', letterSpacing: 1 }}>{s.label}</span>
          </div>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* Brand filters */}
        {['all', 'wog', 'plume', 'artifact'].map(f => (
          <button key={f} onClick={() => { setActiveFilter(f); setSelectedAgent(null) }} style={{
            padding: '3px 10px', borderRadius: 20,
            border: `1px solid ${activeFilter === f ? 'var(--cyan)' : 'var(--border-dim)'}`,
            background: activeFilter === f ? 'var(--cyan-dim)' : 'transparent',
            color: activeFilter === f ? 'var(--cyan)' : 'var(--text-ghost)',
            fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', transition: 'all 0.15s',
          }}>
            {f}
          </button>
        ))}

        <button onClick={loadAll} style={{
          padding: '3px 10px', background: 'transparent',
          border: '1px solid var(--border-dim)', borderRadius: 4,
          color: 'var(--text-ghost)', fontSize: 10, letterSpacing: 1,
        }}>
          ↻
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT: AGENTS */}
        <div style={{
          width: 196, background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px 8px',
            fontSize: 8, letterSpacing: 3, color: 'var(--text-ghost)',
            borderBottom: '1px solid var(--border-dim)', flexShrink: 0,
          }}>
            AGENTS — {agents.length}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {agents.map(agent => {
              const openCount = tasks.filter(
                t => t.assignee_agent_id === agent.id && !['done','parked'].includes(t.status)
              ).length
              const dept = agent.department ? DEPT[agent.department] : null
              const isSelected = selectedAgent?.id === agent.id

              return (
                <div
                  key={agent.id}
                  onClick={() => {
                    if (isSelected) { setSelectedAgent(null); setActiveFilter('all') }
                    else { setSelectedAgent(agent); setActiveFilter('agent') }
                  }}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(6,182,212,0.06)' : 'transparent',
                    borderLeft: `2px solid ${isSelected ? 'var(--cyan)' : 'transparent'}`,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <StatusDot status={agent.status} />
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: isSelected ? 'var(--cyan)' : 'var(--text-primary)',
                      letterSpacing: 0.3,
                    }}>
                      {agent.display_name}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', paddingLeft: 14, lineHeight: 1.3 }}>
                    {agent.role}
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 5, paddingLeft: 14, flexWrap: 'wrap' }}>
                    {dept && <Badge label={dept.label} color={dept.color} small />}
                    {openCount > 0 && (
                      <span style={{
                        fontSize: 7, padding: '1px 5px', borderRadius: 2,
                        background: 'rgba(6,182,212,0.1)', color: 'var(--cyan)',
                        letterSpacing: 0.5,
                      }}>
                        {openCount} open
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER: KANBAN */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            flex: 1, display: 'flex', gap: 8,
            padding: '10px 10px 0',
            overflowX: 'auto', overflowY: 'hidden', minHeight: 0,
          }}>
            {STATUS_COLUMNS.map(col => {
              const colTasks = byStatus[col.key] || []
              return (
                <div key={col.key} style={{
                  minWidth: 196, flex: '0 0 196px',
                  display: 'flex', flexDirection: 'column',
                  background: 'var(--bg-panel)',
                  borderRadius: '6px 6px 0 0',
                  border: '1px solid var(--border)',
                  borderBottom: 'none', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '7px 10px',
                    background: `${col.color}12`,
                    borderBottom: `1px solid ${col.color}30`,
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 8, letterSpacing: 2, color: col.color, fontWeight: 700 }}>
                      {col.label}
                    </span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 9, color: 'var(--text-ghost)',
                      background: 'var(--bg-card)', padding: '0 5px',
                      borderRadius: 8, border: '1px solid var(--border-dim)',
                    }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '7px',
                    display: 'flex', flexDirection: 'column', gap: 5,
                  }}>
                    {colTasks.length === 0 && (
                      <div style={{
                        fontSize: 8, color: 'var(--border)',
                        textAlign: 'center', paddingTop: 18, letterSpacing: 2,
                      }}>
                        EMPTY
                      </div>
                    )}
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={openTask} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: LIVE FEED */}
        <div style={{
          width: 230, background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px 8px',
            fontSize: 8, letterSpacing: 3, color: 'var(--text-ghost)',
            borderBottom: '1px solid var(--border-dim)', flexShrink: 0,
          }}>
            LIVE FEED
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {comments.length === 0 && (
              <div style={{ fontSize: 9, color: 'var(--border)', textAlign: 'center', paddingTop: 20, letterSpacing: 2 }}>
                NO ACTIVITY
              </div>
            )}
            {comments.map(c => {
              const tc = COMMENT_COLORS[c.comment_type] || '#475569'
              return (
                <div key={c.id} style={{
                  padding: '8px 10px', marginBottom: 4,
                  background: 'var(--bg-card)', borderRadius: 4,
                  border: '1px solid var(--border-dim)',
                  borderLeft: `2px solid ${tc}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: tc, letterSpacing: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>
                      {c.author_name}
                    </span>
                    <span style={{ fontSize: 7, color: 'var(--text-ghost)' }}>{timeAgo(c.created_at)}</span>
                  </div>
                  {c.tasks && (
                    <div style={{ fontSize: 7, color: 'var(--text-ghost)', marginBottom: 3 }}>
                      #{c.tasks.task_number} · {c.tasks.title?.slice(0, 26)}{c.tasks.title?.length > 26 ? '…' : ''}
                    </div>
                  )}
                  <div style={{
                    fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>
                    {c.body?.slice(0, 90)}{c.body?.length > 90 ? '…' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* TASK MODAL */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          comments={taskComments}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
