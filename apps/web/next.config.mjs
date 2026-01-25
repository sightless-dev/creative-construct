import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  webpack(config, {isServer}) {
    if (isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        canvas: false,
        "konva/lib/index-node": false
      };
    }

    return config;
  }
};

export default withNextIntl(nextConfig);
