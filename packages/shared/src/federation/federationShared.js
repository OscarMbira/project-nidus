/** Shared Module Federation dependency config — singleton React across shell + remotes. */
export const FEDERATION_SHARED = {
  react: { singleton: true, requiredVersion: '^18.3.1' },
  'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
  'react-router-dom': { singleton: true, requiredVersion: '^6.30.2' },
}

export const FEDERATION_BUILD = {
  target: 'esnext',
  minify: false,
  cssCodeSplit: false,
}
