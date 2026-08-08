import http from "node:http";
import { performance } from "node:perf_hooks";
import process from "node:process";
import handler from "serve-handler";

const port = Number(process.env.PORT) || 3000;

function log(level, msg, fields = {}) {
  process.stdout.write(
    `${JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields })}\n`,
  );
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? undefined;
}

const server = http.createServer(async (req, res) => {
  const started = performance.now();

  res.on("finish", () => {
    log("info", "request", {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration_ms: Math.round(performance.now() - started),
      ip: clientIp(req),
    });
  });

  try {
    await handler(req, res, {
      public: "dist",
      rewrites: [{ source: "**", destination: "/index.html" }],
    });
  } catch (err) {
    log("error", "request_handler_failed", {
      method: req.method,
      url: req.url,
      ip: clientIp(req),
      err: err instanceof Error ? err.message : String(err),
    });
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
});

server.on("error", (err) => {
  log("error", "server_error", { err: err.message });
});

server.listen(port, () => {
  log("info", "listening", { port });
});
