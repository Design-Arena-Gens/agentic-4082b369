"use client";

import { useState } from "react";

type SubmitState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export default function HomePage() {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailTopic, setEmailTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ state: "idle" });
  const [log, setLog] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitState({ state: "submitting" });
    setLog("");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail,
          emailTopic,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      const payload: unknown = await response.json();

      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new Error("Unexpected response shape from server.");
      }

      if (!response.ok) {
        const message =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to send email.";
        throw new Error(message);
      }

      setSubmitState({
        state: "success",
        message:
          "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "Email sent successfully.",
      });
      setLog(
        "debugLog" in payload && payload.debugLog
          ? JSON.stringify(payload.debugLog, null, 2)
          : "",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setSubmitState({ state: "error", message });
      setLog("");
    }
  }

  return (
    <main>
      <h1>Email Automation Taskforce</h1>
      <p>
        Provide the recipient email and topic. The agent will draft an email
        with Gemini, finalize the copy, and deliver it via your configured SMTP
        provider.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Recipient Email
          <input
            type="email"
            name="recipientEmail"
            placeholder="someone@company.com"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Email Topic / Instruction
          <textarea
            name="emailTopic"
            placeholder="e.g. Send a follow-up about our meeting last Thursday covering the action items."
            rows={5}
            value={emailTopic}
            onChange={(event) => setEmailTopic(event.target.value)}
            required
          />
        </label>
        <label>
          Additional Context (optional)
          <textarea
            name="additionalContext"
            placeholder="Paste any extra details the agent should consider."
            rows={4}
            value={additionalContext}
            onChange={(event) => setAdditionalContext(event.target.value)}
          />
        </label>
        <button type="submit" disabled={submitState.state === "submitting"}>
          {submitState.state === "submitting" ? "Generating & Sending..." : "Generate Email"}
        </button>
      </form>

      {submitState.state !== "idle" && (
        <div
          className={[
            "status",
            submitState.state === "success"
              ? "status--success"
              : submitState.state === "error"
              ? "status--error"
              : "",
          ].join(" ")}
        >
          {submitState.state === "success" || submitState.state === "error"
            ? submitState.message
            : submitState.state === "submitting"
            ? "Working on it..."
            : "Ready."}
        </div>
      )}

      {log && (
        <div className="log">{log}</div>
      )}
    </main>
  );
}
