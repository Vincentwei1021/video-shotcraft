#!/usr/bin/env bash
# tsc-demos.sh [demos 下相对路径或目录…] — 用工作台 node_modules 按 CI 同口径（strict）类型检查 demo。
# 不给参数 = 全部 demos。例：shot-polish/tsc-demos.sh camera/crash-zoom-punch data
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WB="$ROOT/workbench"
DIR="$WB/.check/tsc-$$"
mkdir -p "$DIR"
trap 'rm -rf "$DIR"' EXIT
targets=("$@"); [ ${#targets[@]} -eq 0 ] && targets=(.)
files=()
for t in "${targets[@]}"; do
  t="${t#demos/}"
  while IFS= read -r f; do files+=("\"../../demosrc/${f#$ROOT/demos/}\""); done < <(find "$ROOT/demos/$t" -name '*.tsx' | sort)
done
list=$(IFS=,; echo "${files[*]}")
cat > "$DIR/tsconfig.json" <<JSON
{ "compilerOptions": { "noEmit": true, "strict": true, "skipLibCheck": true, "esModuleInterop": true,
  "jsx": "react-jsx", "target": "es2022", "module": "esnext", "moduleResolution": "bundler",
  "lib": ["dom", "es2022"], "resolveJsonModule": true, "preserveSymlinks": true, "types": [] },
  "files": [$list] }
JSON
cd "$DIR" && "$WB/node_modules/.bin/tsc" -p tsconfig.json && echo "tsc OK (${#files[@]} files)"
