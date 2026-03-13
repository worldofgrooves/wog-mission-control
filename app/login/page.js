"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Incorrect password.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 360,
      }}>
        {/* Branding */}
        <div style={{
          textAlign: "center",
          marginBottom: 40,
        }}>
          <div style={{
            fontSize: 18,
            color: "#ffffff",
            letterSpacing: 4,
            fontWeight: 700,
            marginBottom: 8,
            textTransform: "uppercase",
          }}>
            World of Grooves
          </div>
          <div style={{
            fontSize: 13,
            color: "#c9a96e",
            letterSpacing: 4,
            fontWeight: 700,
          }}>
            ◈ MISSION CONTROL
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              autoComplete="current-password"
              style={{
                width: "100%",
                background: "#111",
                border: error ? "1px solid #ef4444" : "1px solid #2a2a2a",
                borderRadius: 8,
                color: "#f0f0f0",
                fontSize: 16,
                padding: "14px 16px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13,
              color: "#ef4444",
              marginBottom: 14,
              textAlign: "center",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: "100%",
              padding: "14px",
              background: (loading || !password.trim()) ? "#1a1a1a" : "#c9a96e",
              border: "none",
              borderRadius: 8,
              color: (loading || !password.trim()) ? "#444" : "#000",
              fontSize: 15,
              fontWeight: 700,
              cursor: (loading || !password.trim()) ? "default" : "pointer",
              transition: "all 0.15s",
              letterSpacing: 0.5,
            }}
          >
            {loading ? "Verifying..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
