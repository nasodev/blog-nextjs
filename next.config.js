const { withContentlayer } = require("next-contentlayer");

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, swcMinify: true, compiler: { removeConsole: true } };
// const nextConfig = {};

module.exports = withContentlayer(nextConfig);
