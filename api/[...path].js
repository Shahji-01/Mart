// This is the Vercel Serverless Function entry point.
// It imports the pre-built Express app from esbuild output and exports it as a default handler.
// Vercel automatically wraps this into an AWS Lambda-compatible serverless function.

// We need to use a dynamic import because the esbuild output is ESM
const handler = async (req, res) => {
  const { default: app } = await import("../apps/api/dist/vercel.mjs");
  return app(req, res);
};

export default handler;
