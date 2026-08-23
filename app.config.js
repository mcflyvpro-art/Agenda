/**
 * Reprend app.json et permet de préfixer les chemins du build web
 * (nécessaire sur GitHub Pages, qui sert le site depuis /<nom-du-repo>/).
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
