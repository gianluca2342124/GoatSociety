# Identidad GOAT SOCIETY · propuestas

Propuestas para comparar antes de cambiar nada en la aplicación (sus logos no se han tocado).

- `proposals/avatar-*.png`: foto de perfil 1024 × 1024 para TikTok e Instagram, pensada para el recorte circular.
  - A · Marfil, B · Obsidiana, C · Halo verde.
- `proposals/crest-*.png`: escudo circular para Telegram y Linktree, transparente fuera del círculo.
  - 1 · Anillo, 2 · Bicolor, 3 · Minimal.
- `proposals/comparativa-instagram.png`: todas las propuestas a tamaño real (150, 110, 77, 56, 40, 32 y 24 px) en modo claro y oscuro.

La cabeza es la cabra de las plantillas (`src/brand/goat.ts`): la misma malla facetada, renderizada en 3D con Three.js, con los cuernos un poco más anchos para que se lean a 40 px. El avatar y el escudo usan exactamente la misma cabeza.

Para regenerarlas: arranca el servidor de desarrollo (`npx vite --port 5173`) y ejecuta `node scripts/brand/export.mjs`.
