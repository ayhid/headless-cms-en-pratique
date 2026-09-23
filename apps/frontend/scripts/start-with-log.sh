#!/usr/bin/env bash
# `npm run demo:start` du front (lancé par turbo après `next build`) : next start, et copie de
# toute la sortie dans logs/front.log. Le terminal T2 de DEMO.md y suit les lignes [webhook]
# (tail -F apps/frontend/logs/front.log | grep '\[webhook\]') sans projeter la TUI.
# Le fichier est vidé à chaque démarrage. Port : FRONT_PORT (3000 par défaut).
set -euo pipefail
cd "$(dirname "$0")/.."
# Cache de données Next vidé à chaque démarrage : il survit sur disque à un redémarrage (et à
# next build) alors que les invalidations par webhook (revalidateTag) sont gardées en mémoire. Sans
# cela, après un demo:reset ou un redémarrage, le front peut resservir le contenu d'avant.
rm -rf .next/cache/fetch-cache
mkdir -p logs
: > logs/front.log
next start -p "${FRONT_PORT:-3000}" 2>&1 | tee -a logs/front.log
