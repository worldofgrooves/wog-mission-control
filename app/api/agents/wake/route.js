import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Wake message -- matches the ClaudeClaw session boot prompt
const WAKE_MESSAGE =
  "⚡ Wake signal from Mission Control. Check your MC task queue for assigned tasks, run your Session Boot queries, and begin working on your next task.";

export async function POST(request) {
  try {
    const { agentName } = await request.json();
    if (!agentName) {
      return NextResponse.json({ error: "agentName required" }, { status: 400 });
    }

    // Look up the agent's Telegram chat ID and bot token env var name
    const { data: agent, error: agentErr } = await sb
      .from("mc_agents")
      .select("name, display_name, telegram_chat_id, telegram_bot_token_env")
      .eq("name", agentName)
      .single();

    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.telegram_chat_id) {
      return NextResponse.json(
        { error: `${agent.display_name} has no Telegram chat ID configured.` },
        { status: 422 }
      );
    }

    if (!agent.telegram_bot_token_env) {
      return NextResponse.json(
        { error: `${agent.display_name} has no bot token env var configured.` },
        { status: 422 }
      );
    }

    // Token env var name comes from the DB (e.g. BUILD_BOT_TOKEN, CONTENT_BOT_TOKEN)
    const botToken = process.env[agent.telegram_bot_token_env];

    if (!botToken) {
      return NextResponse.json(
        { error: `Bot token not found. Add ${agent.telegram_bot_token_env} to Vercel environment variables.` },
        { status: 422 }
      );
    }

    // Fire the Telegram message
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: agent.telegram_chat_id,
          text: WAKE_MESSAGE,
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

    return NextResponse.json({ ok: true, agent: agent.display_name });
  } catch (err) {
    console.error("Wake route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
