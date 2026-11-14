import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    titulo?: string
    /** Epic em que a view real será construída; usado só pelo placeholder. */
    epic?: string
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}
