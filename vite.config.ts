import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return path.resolve(__dirname, "src/assets", filename);
      }
    },
  };
}

export default defineConfig({
  base: "/digital-clinic/",

  plugins: [figmaAssetResolver(), react(), tailwindcss()],

  // Porta fixa (em vez de deixar o Vite flutuar pra 5174, 5175... sempre
  // que a 5173 já estiver ocupada), pra que a URL configurada no Supabase
  // como Site URL / Redirect URL (usada nos e-mails de convite e de
  // recuperação de senha) sempre bata com onde o servidor local realmente
  // está. strictPort: true falha na hora em vez de silenciosamente escolher
  // outra porta — foi exatamente isso que fez os links de convite
  // redirecionarem pra uma porta onde nada estava rodando.
  server: {
    port: 5174,
    strictPort: true,
  },

  build: {
    outDir: "docs",
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  assetsInclude: ["**/*.svg", "**/*.csv"],
});
