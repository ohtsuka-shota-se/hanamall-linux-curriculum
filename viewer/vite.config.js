import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// リポジトリ名に合わせて base を設定する
// 例: https://your-name.github.io/hanamall-linux-curriculum/
// の場合は base: '/hanamall-linux-curriculum/'
export default defineConfig({
  plugins: [react()],
  base: '/hanamall-linux-curriculum/',
  server: {
    fs: {
      allow: ['../..'],
    },
  },
})
