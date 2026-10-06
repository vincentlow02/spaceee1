/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include the fixed input in the server bundle, including serverless builds.
  outputFileTracingIncludes: {
    '/api/generate-space': ['./public/images/space-base.png'],
  },
};

export default nextConfig;
