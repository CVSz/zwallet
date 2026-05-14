import http from "node:http";

import {
  createTransferPreview,
  createWalletAccount,
  enqueueTransferExecution,
  getRuntimeWalletOverview,
  getTransfer,
  markTransferQueued,
} from "@zwallet/wallet-engine";

const PORT = Number(
  process.env.PORT ?? 8081
);

async function readJsonBody(
  req: http.IncomingMessage
): Promise<any> {
  return await new Promise(
    (resolve, reject) => {
      let body = "";

      req.on(
        "data",
        (chunk) => {
          body += chunk;
        }
      );

      req.on(
        "end",
        () => {
          try {
            resolve(
              body
                ? JSON.parse(body)
                : {}
            );
          } catch (err) {
            reject(err);
          }
        }
      );

      req.on(
        "error",
        reject
      );
    }
  );
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  payload: unknown
) {
  res.writeHead(status, {
    "content-type":
      "application/json",
  });

  res.end(
    JSON.stringify(payload)
  );
}

const server =
  http.createServer(
    async (req, res) => {
      try {
        const method =
          req.method ?? "GET";

        const url = new URL(
          req.url ?? "/",
          `http://${req.headers.host}`
        );

        if (
          method === "GET" &&
          url.pathname ===
            "/healthz"
        ) {
          return sendJson(
            res,
            200,
            {
              status: "ok",
              service:
                "admin-wallet",
              runtime:
                process.env
                  .NODE_ENV ??
                "development",
            }
          );
        }

        if (
          method === "GET" &&
          url.pathname ===
            "/api/overview"
        ) {
          const overview =
            await getRuntimeWalletOverview();

          return sendJson(
            res,
            200,
            overview
          );
        }

        if (
          method === "POST" &&
          url.pathname ===
            "/api/wallets"
        ) {
          const body: any =
            await readJsonBody(
              req
            );

          const account =
            await createWalletAccount(
              {
                userId:
                  body.userId ??
                  "ops",

                chain:
                  body.chain,

                address:
                  body.address,

                label:
                  body.label,
              }
            );

          return sendJson(
            res,
            200,
            {
              account,
            }
          );
        }

        if (
          method === "POST" &&
          url.pathname ===
            "/api/transfers/preview"
        ) {
          const body: any =
            await readJsonBody(
              req
            );

          const transfer =
            await createTransferPreview(
              {
                chain:
                  body.chain,

                from:
                  body.from,

                to:
                  body.to,

                amountAtomic:
                  body.amountAtomic,
              }
            );

          return sendJson(
            res,
            200,
            {
              transfer,
            }
          );
        }

        const queueMatch =
          url.pathname.match(
            /^\/api\/transfers\/([^/]+)\/queue$/
          );

        if (
          method === "POST" &&
          queueMatch
        ) {
          const transferId =
            queueMatch[1];

          if (!transferId) {
            return sendJson(
              res,
              400,
              {
                error:
                  "missing transfer id",
              }
            );
          }

          const transfer =
            await getTransfer(
              transferId
            );

          if (!transfer) {
            return sendJson(
              res,
              404,
              {
                error:
                  "transfer not found",
              }
            );
          }

          const queued =
            await markTransferQueued(
              transfer.id
            );

          const job =
            await enqueueTransferExecution(
              {
                transferId:
                  queued.id,
              }
            );

          return sendJson(
            res,
            200,
            {
              transfer:
                queued,
              jobId:
                job.id,
            }
          );
        }

        return sendJson(
          res,
          404,
          {
            error:
              "not found",
          }
        );
      } catch (err) {
        console.error(err);

        return sendJson(
          res,
          500,
          {
            error:
              err instanceof Error
                ? err.message
                : "internal error",
          }
        );
      }
    }
  );

server.listen(PORT, () => {
  console.log(
    `zWallet admin runtime listening on :${PORT}`
  );
});
