import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        article: resolve(__dirname, 'article.html'), 
        about: resolve(__dirname, 'about.html'),
        blogs: resolve(__dirname, 'blogs.html')// Add this line!
      },
    },
  },
})