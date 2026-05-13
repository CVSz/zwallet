import http from "node:http";

const port = Number(process.env.PORT || 8081);

const html = `
<!doctype html>
<html>
<head>
  <title>zWallet Runtime</title>
  <meta charset="utf-8" />
</head>
<body style="font-family:sans-serif;padding:40px">
  <h1>zWallet Runtime Online</h1>
  <p>admin-wallet.zeaz.dev is now served by the real zWallet runtime.</p>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(200, { "content-type": "text/html" });
  res.end(html);
});

server.listen(port, () => {
  console.log(`zWallet admin runtime listening on :${port}`);
});
