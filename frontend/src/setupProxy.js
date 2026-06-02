const { createProxyMiddleware } = require("http-proxy-middleware");

// The @emergentbase/visual-edits dev server middleware reads and parses every
// POST JSON body (to support /edit-file). This exhausts the Node stream before
// CRA's default proxy can pipe it upstream, causing all POST /api/* requests to
// hang. This setupProxy.js replaces the package.json "proxy" field with an
// explicit proxy that re-writes the body from req.body after it has been parsed.
module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req) => {
          if (
            req.body &&
            req.method !== "GET" &&
            req.method !== "HEAD"
          ) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader("Content-Type", "application/json");
            proxyReq.setHeader(
              "Content-Length",
              Buffer.byteLength(bodyData)
            );
            proxyReq.write(bodyData);
          }
        },
      },
    })
  );
};
