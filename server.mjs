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

function headerValue(headers, name) {
  const value = headers[name];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }
  return undefined;
}

function normalizeIp(ip) {
  if (!ip) {
    return undefined;
  }
  const trimmed = ip.trim().replace(/^\[|\]$/g, "");
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }
  return trimmed || undefined;
}

function clientIp(req) {
  const forwardedFor = headerValue(req.headers, "x-forwarded-for");
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0]);
  }

  const realIp = headerValue(req.headers, "x-real-ip");
  if (realIp) {
    return normalizeIp(realIp);
  }

  const forwarded = headerValue(req.headers, "forwarded");
  if (forwarded) {
    const match = forwarded.match(/for=(?:"?\[?)([^\]";,]+)/i);
    if (match) {
      return normalizeIp(match[1]);
    }
  }

  return normalizeIp(req.socket.remoteAddress);
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
