import { useEffect, useMemo, useState } from "react";
import { DiscordSDK } from "@discord/embedded-app-sdk";

type Phase = "booting" | "ready" | "error";

type Status = {
  phase: Phase;
  inDiscord: boolean;
  authed: boolean;
  user: null;
  error: string | null;
};

function getQueryParam(name: string): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function App() {
  const frameId = useMemo(() => getQueryParam("frame_id"), []);
  const isInDiscord = frameId !== null && frameId.length > 0;

  const [status, setStatus] = useState<Status>({
    phase: "booting",
    inDiscord: isInDiscord,
    authed: false,
    user: null,
    error: null,
  });

  const sdk = useMemo(() => {
    if (!isInDiscord) return null;
    // frameId is guaranteed non-null here
    return new DiscordSDK(frameId);
  }, [isInDiscord, frameId]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        if (!isInDiscord || sdk === null) {
          if (!cancelled) {
            setStatus((s) => ({ ...s, phase: "ready", authed: false }));
          }
          return;
        }

        await sdk.ready();

        if (!cancelled) {
          setStatus((s) => ({ ...s, phase: "ready", authed: true }));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus((s) => ({
            ...s,
            phase: "error",
            error: errorToString(err),
          }));
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [isInDiscord, sdk]);

  async function onPingDiscord() {
    if (sdk === null) return;

    await sdk.commands.openExternalLink({
      url: "https://discord.com/developers/docs/activities/overview",
    });
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div>
            <div className="title">Your trajectory</div>
            <div className="subtitle">Discord Activity Shell</div>
          </div>
        </div>

        <div className={`pill ${status.phase}`}>
          {status.phase === "booting" && "Booting…"}
          {status.phase === "ready" &&
            (status.inDiscord ? "Connected (Discord)" : "Local Preview")}
          {status.phase === "error" && "Error"}
        </div>
      </header>

      <main className="main">
        <section className="card">
          <h2>Your trajectory</h2>
          <p>
            Minimal shell + Discord SDK wiring. Runs as a normal web app outside
            Discord.
          </p>

          <div className="row">
            <div className="kv">
              <div className="k">Environment</div>
              <div className="v">{status.inDiscord ? "Discord" : "Browser"}</div>
            </div>
            <div className="kv">
              <div className="k">SDK Ready</div>
              <div className="v">{status.phase === "ready" ? "Yes" : "No"}</div>
            </div>
          </div>

          {status.phase === "error" && status.error && (
            <pre className="error">{status.error}</pre>
          )}

          <div className="actions">
            <button
              className="btn"
              onClick={onPingDiscord}
              disabled={!status.inDiscord || status.phase !== "ready"}
              title={
                status.inDiscord
                  ? "Opens Discord docs in an external browser"
                  : "Only works when launched as a Discord Activity"
              }
            >
              Ping Discord SDK
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>v0 shell</span>
        <span className="dot" />
        <span>Next: show a trajectory chart + weekly goal settings.</span>
      </footer>
    </div>
  );
}
