import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
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
              if (canvasApiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${canvasApiKey}`);
              }
            });
          },
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
