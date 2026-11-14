import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Divide o bundle: bibliotecas pesadas em arquivos separados (carregamento mais rápido no celular)
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Só o Recharts e as libs d3 vão para o pacote de gráficos. Antes, dependências
          // compartilhadas (ex.: clsx) caíam nele e o app baixava os gráficos já na abertura.
          manualChunks(id) {
            // Ajudantes de CommonJS e o React ficam num pacote comum, usado por todos
            if (id.includes('commonjsHelpers') || /node_modules\/(react|react-dom|scheduler|clsx|use-sync-external-store)\//.test(id)) return 'vendor';
            if (!id.includes('node_modules')) return undefined;
            if (/node_modules\/(recharts|d3-[^/]+|victory-vendor|decimal\.js-light|internmap)\//.test(id)) return 'charts';
            if (id.includes('node_modules/lucide-react/')) return 'icons';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
