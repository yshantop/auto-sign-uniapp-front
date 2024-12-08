module.exports = {
  transpileDependencies: ['@dcloudio/uni-ui'],
  chainWebpack: (config) => {
    // 生产环境配置
    if (process.env.NODE_ENV === 'production') {
      config.optimization.minimize(true);
      config.optimization.splitChunks({
        chunks: 'all'
      });
    }
  }
}
