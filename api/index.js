/**
 * Vercel serverless entry: run the Express app for all /api/* requests.
 * Rewrites send /api/:path* here with path in query; we restore req.url so Express routes correctly.
 */
import serverless from "serverless-http";
import app from "../server/index.js";

const handler = serverless(app);

export default function (req, res) {
  // Restore path for Express: rewrite sends /api?path=auth/signup (and keeps other query params)
  const path = req.query.path;
  if (path) {
    const pathStr = Array.isArray(path) ? path.join("/") : path;
    const qs = new URLSearchParams(req.query);
    qs.delete("path");
    const rest = qs.toString();
    req.url = `/api/${pathStr}${rest ? `?${rest}` : ""}`;
  }
  return handler(req, res);
}
