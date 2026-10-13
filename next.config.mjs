/** @type {import('next').NextConfig} */
const nextConfig = {
  // ssh2 ships optional native add-ons; keep it out of the bundle and load it from node_modules.
  serverExternalPackages: ["ssh2", "ssh2-sftp-client"],
};

export default nextConfig;
