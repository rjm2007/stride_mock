/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served under a path on the demo server (https://demo.aibolt.ai/mock-stride). Fixed at build
  // time, so the Dockerfile takes it as a build arg; empty (the default) for Vercel and local runs.
  basePath: process.env.BASE_PATH || "",
  // ssh2 ships optional native add-ons; keep it out of the bundle and load it from node_modules.
  serverExternalPackages: ["ssh2", "ssh2-sftp-client"],
};

export default nextConfig;
