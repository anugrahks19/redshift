import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function analogSubappMiddleware(): Plugin {
  const analogHtml = path.join(rootDir, 'public', 'analog', 'index.html')

  const register = (middlewares: { use: (fn: (req: { url?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b?: string | Buffer) => void }, next: () => void) => void) => void }) => {
    middlewares.use((req, res, next) => {
      const rawUrl = req.url ?? '/'
      const pathname = rawUrl.split('?')[0]

      if (pathname === '/analog') {
        res.statusCode = 302
        res.setHeader('Location', '/analog/')
        res.end()
        return
      }

      if (pathname.startsWith('/analog/') && !path.extname(pathname)) {
        if (fs.existsSync(analogHtml)) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(fs.readFileSync(analogHtml))
          return
        }
      }

      next()
    })
  }

  return {
    name: 'analog-subapp-spa',
    configureServer(server) {
      register(server.middlewares)
    },
    configurePreviewServer(server) {
      register(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), analogSubappMiddleware()],
  server: {
    host: true,
    allowedHosts: true,
  },
})
