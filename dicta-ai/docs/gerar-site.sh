#!/usr/bin/env bash
# Gera a página pública da política de privacidade (GitHub Pages) a partir do .md.
# Saída: <raiz do repositório>/docs/privacidade.html e docs/index.html
# Uso:   ./dicta-ai/docs/gerar-site.sh        (requer pandoc)
set -euo pipefail
export LC_ALL=C.UTF-8 LANG=C.UTF-8
cd "$(dirname "$0")"
SRC=politica-de-privacidade.md
if grep -q '{{' "$SRC"; then
  echo "ERRO: preencha os campos {{...}} (nome e e-mail de contato) em $SRC antes de publicar." >&2
  grep -n '{{' "$SRC" >&2
  exit 1
fi
OUT=../../docs
mkdir -p "$OUT"
CSS_FILE=$(mktemp)
trap 'rm -f "$CSS_FILE"' EXIT
cat > "$CSS_FILE" <<'CSS'
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 760px;
         margin: 0 auto; padding: 24px 16px 64px; line-height: 1.6; background: #fff; color: #1f2937; }
  @media (prefers-color-scheme: dark) { body { background: #0b0c12; color: #e5e7eb; } a { color: #c4b5fd; } }
  h1 { font-size: 1.8rem; } table { border-collapse: collapse; width: 100%; font-size: .92rem; display: block; overflow-x: auto; }
  th, td { border: 1px solid #8884; padding: 6px 8px; vertical-align: top; text-align: left; }
</style>
CSS
pandoc "$SRC" -s --metadata title="Política de Privacidade — Dicta AI" --metadata lang=pt-BR \
  -H "$CSS_FILE" -o "$OUT/privacidade.html"
# Remove o título duplicado que o pandoc gera a partir do metadata
sed -i '/<header id="title-block-header">/,/<\/header>/d' "$OUT/privacidade.html"
cat > "$OUT/index.html" <<'HTML'
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=privacidade.html"><title>Dicta AI</title></head>
<body><a href="privacidade.html">Política de Privacidade do Dicta AI</a></body></html>
HTML
touch "$OUT/.nojekyll"
echo "Gerado: $OUT/privacidade.html"
