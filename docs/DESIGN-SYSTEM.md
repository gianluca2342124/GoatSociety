# GOAT EDITORIAL — sistema de diseño

> BLACK BACKGROUND. BIG WHITE TEXT. ONE STRONG ACCENT COLOR. ONE MESSAGE PER SLIDE.
> LARGE FOOTBALL VISUALS. IMMEDIATE IMPACT. MINIMAL DISTRACTIONS.

Este documento define el lenguaje visual de las plantillas de GOAT SOCIETY STUDIO.
Toda plantilla nueva o rediseñada debe cumplirlo. Se aprenden los principios de las
grandes cuentas de fútbol (jerarquía, tamaño, contraste, un solo mensaje), sin copiar
gráficos, logos ni maquetaciones de nadie.

## 0. Reglas de familia (v2, prioridad máxima)

Todas las plantillas forman una familia: misma retícula, mismo ritmo, misma lógica de alineación.

1. **Titulares centrados** por defecto (`hl()` ya centra y aplica acabado metálico). Solo se alinea
   a la izquierda cuando la composición lo exige de verdad (p. ej. un ranking o una lista).
2. **Cromo de marca en las páginas estándar**: `chrome(t)` = firma GOAT SOCIETY arriba a la izquierda
   + número de página «1/7» arriba a la derecha (`{pageof}`, se oculta solo en posts de una página).
   Las portadas con foto y las de comunidad pueden prescindir del número, nunca de la marca.
3. **Fondo**: `ink()` = negro con un degradado radial muy sutil arriba. `inkFlat()` solo bajo fotos.
4. **Titular metálico** (`effect: 'metallic'`): brillo plateado sutil por línea; la palabra en acento
   conserva su color. Nunca recargado.
5. **Formato principal: vertical 3:4 (1080×1440)**. También 9:16, 4:5, 1:1 y 16:9.
6. **Ritmo vertical común**: cromo → titular (zona superior) → visual o dato principal (centro) →
   apoyo / CTA (zona inferior). Márgenes de 72 px, espacios múltiplos de 24.

## 1. Principios

1. **Un mensaje por diapositiva**, legible en 2 segundos en un móvil (≈390 px de ancho, escala 0,36).
2. **5–15 palabras de texto principal.** Si algo no mejora la claridad, se elimina.
3. **Composición editorial abierta**, no un dashboard: sin tarjetas, sin rectángulos redondeados
   repetidos, sin píldoras/botones falsos, sin badges, sin divisores decorativos, sin etiquetas
   minúsculas espaciadas, sin UI falsa. Una tarjeta solo si está justificada.
4. **Un acento por diapositiva** (`$accent`). Todo lo demás: blanco, grises y negro.
5. **Nada de dorado** en detalles ordinarios (`$primary`/`$gold` queda solo para la marca si el usuario lo quiere).
6. **Nunca** se menciona Telegram, enlaces t.me, usuarios de mensajería ni plataformas externas
   en el contenido exportado. CTA neutros: «ENLACE EN LA BIO», «EL ANÁLISIS COMPLETO ESTÁ EN MI PERFIL»…
7. **Nunca** se insinúa que un pronóstico está garantizado o ha acertado.

## 2. Color

| Token | Valor | Uso |
|---|---|---|
| `$bg` | `#070707` | Fondo (siempre sólido) |
| `$text` | `#F5F5F5` | Texto principal |
| `$muted` | `#B9B9B9` | Texto secundario |
| `$dim` | `#6E6E6E` | Terciario / avisos legales |
| `$line` | `#242424` | Separadores finos |
| `$neutral` | `#3A3A3A` | Barras del lado que pierde, jugadores rivales atenuados |
| `$accent` | acento de la diapositiva | El único color vivo |
| `$green` `$yellow` `$red` `$blue` | `#2BE477` `#FFD43B` `#FF4055` `#3B8BFF` | Biblioteca de acentos |
| `$onAccent` | `#050505` | Texto sobre el acento |

El acento se resuelve así: `slide.accent` → `project.style.accent` → acento de la marca (verde).
Una plantilla puede sugerir un acento semántico devolviendo `accent: '$red'` (p. ej. una racha
negativa). Por defecto no se fija: manda el acento del proyecto.

## 3. Tipografía (locales, OFL)

| Rol | Familia | Token |
|---|---|---|
| Titulares / números enormes | Anton | `$headline`, `$numbers` |
| Etiquetas, nombres, CTA | Barlow Condensed 600–700 | `$label` |
| Frases de apoyo | Inter Tight 500–600 | `$body` |
| Display alternativo | Archivo Black | `$display` |

Escala (px en una story de 1080×1920; `TYPE` en `src/templates/kit.ts`, multiplicar por `t.s`):

| Nivel | Tamaño |
|---|---|
| Cifra gigante | 230–320 |
| Titular héroe | 130–170 |
| Secundario | 55–85 |
| Apoyo | 38–55 |
| Etiquetas | 32–45 |
| Aviso legal | 26–30 (`$dim`) |

Tracking mínimo (≤ 0,04 em). Mayúsculas en titulares y etiquetas; frases de apoyo en
minúsculas. Interlineado de titulares 1,04 (Anton compacto). La cedilla de Anton (BARÇA)
puede rozar la línea siguiente: termina el titular con la palabra que lleva Ç o sube el
interlineado a 1,12 en esa plantilla.

## 4. Retícula y zonas seguras (story 1080×1920)

- Márgenes laterales 72 px (columna de 936).
- Firma de marca en `t.top` (y=150).
- Contenido principal entre `t.contentTop` (270) y `t.contentBottom` (1600). Por debajo quedan
  el pie de foto y los botones de TikTok/Instagram: nada importante ahí.
- Lado derecho inferior (x>940, y 900–1550) lo tapan los botones de TikTok: evita colocar
  datos clave pegados al borde derecho en esa franja.
- Los formatos 4:5, 1:1 y 16:9 se adaptan con `t.s`, `t.v`, `px()` y `zone()`.

## 5. Componentes (pintores)

| Componente | Elemento | Ajustes editoriales |
|---|---|---|
| A · Comparativa audaz | `statBars` | `style: 'editorial'`, `colorMode: 'leader'`, `barHeight` 22–30, `valueSize` 110–150 |
| B · Cifra dominante | `statNumber` | `layout: 'hero'`, `valueSize` 260–340, `valueColor: '$accent'` |
| C · Cara a cara | `statNumber` ×3 o `statBars` de 1 fila | números 200+ |
| D · Racha | `formRow` | `shape: 'letter'` (o `'dot'`), victorias en acento, resto gris |
| E · Ranking | `ranking` | barras gruesas proporcionales, fila destacada en acento |
| Probabilidad 1X2 | `probability` | tres cifras y una barra segmentada proporcional |
| Listas | `playerList` / `matchList` / `resultsList` | `variant: 'editorial'` (filas abiertas, separadores `$line`) |
| Pronóstico | `prediction` | `chrome: 'none'` (sin tarjeta). Bloqueado = texto señuelo desenfocado + candado sólido en acento |
| Táctica | `tactics` | campo realista, `playerStyle: 'flat'`, `labelStyle: 'text'`, `dimOthers` 0.3–0.4, una flecha gruesa (`width` 0.8–1.1) en `$accent` |
| Marca | `brandMark` | `variant: 'editorial'` (firma) o `'icon'` (logo pequeño) |
| Mascota | `mascot` | solo en diapositivas de comunidad; en el resto, como mucho el logo pequeño |

Ayudantes de plantilla (`src/templates/kit.ts`): `ink()`, `inkFlat()`, `chrome()`, `signature()`,
`pageNo()`, `goatMark()`, `hl()`, `support()`, `label()`, `cta()`, `disclaimer()`, `rule()`, `crestOf()`,
`cinematic()`, `px()`, `TYPE`.

Bloques nuevos: `badge` (etiqueta sólida, contorno, mini-tarjeta iluminada o texto: «ACERTADO»,
«SOLO EN MI COMUNIDAD», «RESULTADO FINAL», «GANADO»…) y `scoreboard` (marcador enlazado a
`match.score`: fila, apilado o píldora). Tokens `{score}`, `{score.home}`, `{score.away}`, `{score.note}`.

## 6. Intensidad visual

Cada diapositiva tiene una intensidad: **Mínimo**, **Editorial** (por defecto) o **Cinemático**.
Los elementos llevan `minIntensity` opcional: `'editorial'` se oculta en Mínimo; `'cinematic'`
solo aparece en Cinemático. Nunca se borra nada, solo se oculta. `cinematic()` añade una
atmósfera sutil (foco, viñeta, grano) visible únicamente en Cinemático.

## 7. Composiciones disponibles

A titular gigante · B cifra gigante · C enfrentamiento de dos equipos · D editorial con imagen ·
E táctica a pantalla completa · F gráfico mínimo · G revelación bloqueada · H declaración de marca.

## 8. Lista de control antes de dar por buena una plantilla

- [ ] ¿Se entiende el mensaje en 2 s a 390 px de ancho?
- [ ] ¿Un único foco visual claramente dominante?
- [ ] ¿Un único color de acento?
- [ ] ¿Ningún texto por debajo de 32 px (salvo el aviso legal)?
- [ ] ¿Sin tarjetas, píldoras, brillos, degradados ni texturas innecesarias?
- [ ] ¿Sin solapes ni textos cortados en 9:16, 4:5, 1:1 y 16:9?
- [ ] ¿Todo sigue siendo editable y enlazado a los datos del partido?
- [ ] ¿Sin menciones a Telegram ni promesas de acierto?
