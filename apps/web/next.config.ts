import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@devsync/shared'],
  turbopack: {
    resolveAlias: {
      '@devsync/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
};

export default nextConfig;
