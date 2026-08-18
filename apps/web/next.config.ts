import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the workspace package (ships raw .ts) so cloud builds resolve it.
  transpilePackages: ["@chatgrp/shared"],
};

export default nextConfig;
