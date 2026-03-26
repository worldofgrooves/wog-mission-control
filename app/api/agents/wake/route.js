import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Map MC agent names to ClaudeClaw agent IDs (folder names)
const MC_TO_CLAUDECLAW = {
  janet: "main",
  jean: "jean-grey",
  fury: "nick-fury",
  natasha: "black-widow",
  vision: "vision",
  wanda: "wanda",
  jarvis: "jarvis",
  loki: "loki",
  pepper: "pepper",
  "tony-stark": "tony-stark",
  mantis: "mantis",
  peter: "spider-man",
  happy: "happy-hogan",
};

// ClaudeClaw dashboard URL (internal -- Mac Mini)
const CLAUDECLAW_DASHBOARD = process.env.CLAUDECLAW_DASHBOARD_URL || "https://dash.worldofgrooves.com";
const CLAUDECLAW_TOKEN = process.env.DASHBOARD_TOKEN;

export async function POST(request) {
  try {
    const { agentName, taskNumber } = await request.json();
    if (!agentName) {
      return NextResponse.json({ error: "agentName required" }, { status: 400 });
    }

    // If a specific task was requested, fetch it for the targeted message
    let targetTask = null;
    if (taskNumber) {
      const { data: td } = await sb
        .from("mc_tasks")
        .select("task_number, title, description, status, priority")
        .eq("task_number", taskNumber)
        .single();
      targetTask = td || null;
    }

    // Look up agent display name for the response
    const { data: agent, error: agentErr } = await sb
      .from("mc_agents")
      .select("name, display_name, telegram_chat_id, telegram_bot_token_env")
      .eq("name", agentName)
      .single();

    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Map MC name to ClaudeClaw agent ID
    const claudeClawId = MC_TO_CLAUDECLAW[agentName];
    if (!claudeClawId) {
      return NextResponse.json(
        { error: `No ClaudeClaw mapping for agent "${agentName}"` },
        { status: 422 }
      );
    }

    // Try ClaudeClaw dashboard wake endpoint first (injects task into scheduler)
    if (CLAUDECLAW_TOKEN) {
      try {
        const wakeUrl = `${CLAUDECLAW_DASHBOARD}/api/agents/${claudeClawId}/wake?token=${CLAUDECLAW_TOKEN}`;
        const wakeRes = await fetch(wakeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
        });

        if (wakeRes.ok) {
          // Also send Telegram notification so Denver knows the wake was sent
          if (agent.telegram_bot_token_env && agent.telegram_chat_id) {
            const botToken = process.env[agent.telegram_bot_token_env];
            if (botToken) {
              await fetch(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: agent.telegram_chat_id,
                    text: targetTask
                      ? `▶ Wake signal sent to ${agent.display_name} for Task #${targetTask.task_number}: ${targetTask.title}`
                      : `⚡ Wake signal sent to ${agent.display_name} via Mission Control. Task will fire within 60 seconds.`,
                  }),
                }
              ).catch(() => {}); // Best-effort notification
            }
          }

          return NextResponse.json({ ok: true, agent: agent.display_name, method: "scheduler" });
        }

        console.error("ClaudeClaw wake failed:", await wakeRes.text());
      } catch (err) {
        console.error("ClaudeClaw wake error:", err.message);
      }
    }

    // Fallback: send Telegram message directly (original behavior)
    if (!agent.telegram_bot_token_env || !agent.telegram_chat_id) {
      return NextResponse.json(
        { error: `${agent.display_name} has no Telegram config and ClaudeClaw wake failed.` },
        { status: 422 }
      );
    }

    const botToken = process.env[agent.telegram_bot_token_env];
    if (!botToken) {
      return NextResponse.json(
        { error: `Bot token not found. Add ${agent.telegram_bot_token_env} to Vercel environment variables.` },
        { status: 422 }
      );
    }

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: agent.telegram_chat_id,
          text: targetTask
            ? `▶ Denver wants you to start on this now:\n\nTask #${targetTask.task_number}: ${targetTask.title}${targetTask.description ? `\n\n${targetTask.description}` : ""}\n\nMark it in_progress and get to work. Report back when done.`
            : `⚡ Wake signal from Mission Control. Check your MC task queue for assigned tasks, run your Session Boot queries, and begin working on your next task.`,
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("Telegram API error:", detail);
      return NextResponse.json(
        { error: "Telegram API error", detail },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, agent: agent.display_name, method: "telegram_fallback" });
  } catch (err) {
    console.error("Wake route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
