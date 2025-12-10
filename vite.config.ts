import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Debug: Check if Canvas API key is loaded
  console.log('🔑 Canvas API Key loaded:', env.VITE_CANVAS_API_KEY ? 'YES ✅' : 'NO ❌');
  if (env.VITE_CANVAS_API_KEY) {
    console.log('🔑 Key preview:', env.VITE_CANVAS_API_KEY.substring(0, 10) + '...');
  }
  
  return {
    server: {
      host: "localhost",
      port: 8080,
      proxy: {
        '/api/canvas': {
          target: 'https://canvas.instructure.com/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/canvas/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Add Canvas API key to requests from environment
              const canvasApiKey = env.VITE_CANVAS_API_KEY;
              console.log('🔄 Proxy request to:', req.url);
              console.log('🔑 Adding auth header:', canvasApiKey ? 'YES ✅' : 'NO ❌');
              if (canvasApiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${canvasApiKey}`);
              }
            });
          },
        },
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
