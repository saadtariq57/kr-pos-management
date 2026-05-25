/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Skip in-build type checking — the worker process hits the 4 GB V8 heap
  // limit on this project's type graph. Types are verified by the IDE and
  // can be checked standalone with:  npx tsc --noEmit
  typescript: {
    ignoreBuildErrors: true,
  },


  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

