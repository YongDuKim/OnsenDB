/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/OnsenDB/',
  build: {
    // フォントをCSSへbase64埋め込みしない(CSS肥大化を防ぎ、使うサブセットだけDLさせる)
    assetsInlineLimit: 0,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '温泉分析帳',
        short_name: '温泉分析帳',
        description: '私設・温泉分析書データベース',
        lang: 'ja',
        theme_color: '#35577D',
        background_color: '#EDF1F0',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // 日本語フォントは unicode-range で多数の woff2 に分割されており全事前キャッシュは
        // 重すぎるため、実際に使われたサブセットだけを実行時にキャッシュする
        runtimeCaching: [
          {
            urlPattern: /\.woff2?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // 産総研データセット(約2MB)。事前キャッシュせず、初回閲覧時に取得して保持する。
            // ファイル名にバージョンを含むため CacheFirst で安全にオフライン対応できる
            urlPattern: /\/gsj\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gsj-data',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
