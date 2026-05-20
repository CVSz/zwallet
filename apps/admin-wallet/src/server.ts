import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { buildTransferDigest } from "@zwallet/wallet-engine/walletEngine";

const port = Number(process.env.PORT ?? 8081);

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "admin-wallet" }));
    return;
  }

  if (req.url === "/transfer/preview" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    req.on("end", () => {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
        return;
      }

      const preview = buildTransferDigest(parsed);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, preview }));
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`admin-wallet listening on :${port}`);
});
