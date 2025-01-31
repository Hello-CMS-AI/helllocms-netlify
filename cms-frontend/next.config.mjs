import withTM from 'next-transpile-modules';

const transpileModules = ['@babel/runtime', 'rc-util', 'rc-picker', 'rc-tree', 'rc-table'];

const nextConfig = withTM(transpileModules)({
  reactStrictMode: true,
  images: {
    domains: ['localhost'], // Add 'localhost' for local development
  },
  webpack: (config) => config,
});

export default nextConfig;