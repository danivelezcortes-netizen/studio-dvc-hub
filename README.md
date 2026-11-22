# Studio DVC

Una sola página privada, una sola contraseña. El logo `studio.dvc` vuelve al inicio.

- `/` inicio, con Analítica e Inspo
- `/analitica` los números de Instagram. Los textos salen de `data/analysis.json`
- `/inspo` el tablero visual: hooks, esta semana, agregar y el panel de cada ítem
- `POST /api/ingest` para que las rutinas agreguen inspiración (bearer `INGEST_TOKEN`)

Los números salen de la Instagram Graph API, en el servidor. La interfaz está en español. No hay login de Instagram en el navegador: el token no sale del servidor.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `IG_ACCESS_TOKEN` | Token de la Instagram Graph API de @studio.dvc. Sin este valor, la página enseña la muestra del 21 nov 2026 y lo dice. |
| `APP_PASSWORD` | Contraseña única de la página. Sin ella, la app responde que falta configurarla. La cookie de sesión es un HMAC con caducidad, no la contraseña. |
| `INGEST_TOKEN` | Bearer de `POST /api/ingest`. Mínimo 32 caracteres. Si falta o no coincide, esa ruta responde 401. Si es más corto, responde 503. El resto de la app sigue funcionando. |
| `DATABASE_URL` | Postgres de Neon, inyectada al conectar la integración de Vercel. Es el almacén de Inspo. |
| `BLOB_STORE_ID` | Id del Blob privado. En Vercel el SDK lo usa con `VERCEL_OIDC_TOKEN`, que Vercel rota solo. |
| `BLOB_READ_WRITE_TOKEN` | Token estático del Blob. Hace falta fuera de Vercel. En Vercel no lo pases a mano si ya está `BLOB_STORE_ID`. |
| `NOTION_TOKEN`, `NOTION_DATABASE_ID` | Copia de cada ítem en Notion. Si Notion falla, el ítem sigue en Postgres y el tablero lo dice. |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `DRIVE_FOLDER_ID` | Copia opcional de la imagen en Drive. Si están y Drive falla, la subida falla en voz alta. |

Copia `.env.example` a `.env.local` para probar en tu ordenador. No subas esos archivos. El token no se escribe en el repositorio, ni en los logs, ni en la página.

La cuenta que se lee es la de usuario de Instagram `17841407468921719` (@studio.dvc), Graph API `v27.0`.

## Abrir en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000 e introduce `APP_PASSWORD`. El inicio deja elegir Analítica o Inspo.

En local, sin `DATABASE_URL`, Inspo usa `data/board.json` y `data/uploads`. Ese archivo no se despliega. En producción esas escrituras responden 503: hacen falta Neon, Blob privado y Notion. La semilla visual está en `public/seed`.

```bash
npm test
npm run build
```

## Desplegar en Vercel (plan gratis)

1. En [Vercel](https://vercel.com), importa el repositorio `danivelezcortes-netizen/studio-dvc-hub`.
2. Framework: **Next.js**. El comando de build es `next build` (el que Vercel detecta solo).
3. En **Settings → Environment Variables**, añade `IG_ACCESS_TOKEN` y `APP_PASSWORD` como sensibles, y un `INGEST_TOKEN` de al menos 32 caracteres si vas a usar la ingesta.
4. Conecta Neon, un Blob privado y Notion como dice la sección de abajo. No hace falta desplegar desde aquí: el deploy se hace aparte.
5. Abre la URL. La página pide la contraseña. No hace falta el «Password Protection» de pago de Vercel: esta app trae la suya.

## Almacenamiento de Inspo

Postgres es el registro. Las imágenes nuevas van a un Blob privado y solo se sirven por `/api/inspo/media` después de la sesión. Notion recibe una copia de cada ítem, nota, corazón e historial de semana. Si Notion no responde, el dato queda en Postgres, queda anotado para reintentarlo, y el tablero muestra que la copia está pendiente.

Un archivo local no se usa en producción. Si falta `DATABASE_URL`, el Blob o Notion, Inspo enseña qué variable falta y no escribe.

### Neon

La integración gestionada por Vercel se llama Neon Postgres Native Integration. Abre la integración de Neon en el Marketplace de Vercel y pulsa Install.

1. En el modal, elige **Create New Neon Account** y Continue. Si ya tienes cuenta de Neon y quieres otra organización facturada por Vercel, el mismo camino crea una organización `Vercel: …`.
2. Elige el equipo de Vercel y Continue.
3. En Configuration and Plan elige la región. Deja **Auth** apagado y **Realtime** apagado: esta app no usa Neon Auth ni Neon Realtime. Elige el plan y Continue.
4. En Confirmation, revisa el nombre y pulsa Create. Cuando aparezca que la base está lista, Continue.
5. En Connect a Project, elige este proyecto y los entornos Production y Preview. Deja el prefijo vacío para que la variable se llame `DATABASE_URL`. Preview branching es opcional: bajo **Create database branch for deployment**, Preview crea una rama de la base por cada preview.
6. Pulsa Connect.

La integración inyecta `DATABASE_URL` (conexión con pool) y `DATABASE_URL_UNPOOLED`. Esta app usa `DATABASE_URL`.

### Blob privado

En el proyecto, Storage → Create Storage → Blob. Elige acceso **Private**, ponle nombre y Create. Conecta el store al proyecto en Production y Preview.

En Vercel el SDK autentica con OIDC: la conexión añade `BLOB_STORE_ID` y Vercel emite `VERCEL_OIDC_TOKEN`. No copies ese token en el código. El código llama a `put` sin pasarle un token, para no pisar el OIDC.

Si vas a escribir imágenes desde tu ordenador, en el store marca **Add a read-write token env var to this connection** o, desde el directorio enlazado:

```bash
vercel blob create-store inspo --access private --yes
vercel env pull
```

Eso deja `BLOB_READ_WRITE_TOKEN` en `.env.local`. No lo subas.

### Notion

Hace falta ser propietaria del workspace.

1. Abre el Developer portal de Notion, pestaña **Developer connections**, **New connection**.
2. Ponle nombre. En Authentication method elige **API token** y Create connection.
3. En Configuration, copia el API token a `NOTION_TOKEN`. Confirma que la conexión puede leer, actualizar e insertar contenido.
4. En Notion crea una base a página completa para Inspo.
5. Comparte esa base con la conexión: en la conexión, pestaña **Content access** → **Edit access**, o en la base abre `•••` → **Connections** → **Add connection**. Sin este paso Notion responde que no hay acceso.
6. Copia el id de 32 caracteres del final de la URL de la base (antes de `?v=`) a `NOTION_DATABASE_ID`.

La primera escritura añade las columnas que faltan (tipo, etiquetas, pilar, semana, usada, historial, etc.) y usa la columna de título que ya tenga la base. No borra columnas. Las imágenes no se cuelgan en Notion: el enlace público caduca y el Blob es privado. Notion guarda el texto, las notas y el enlace de origen.

El token de la conexión no caduca solo. Si lo regeneras, actualiza `NOTION_TOKEN` en Vercel. Un token personal de Notion sí caduca (como máximo a un año); esta app no lo usa.

Si cambias el token o la contraseña, vuelve a desplegar o usa **Redeploy** para que el servidor las tome.

Los números de Instagram se guardan como mucho una hora, para no gastar el límite de la API. Las miniaturas se piden de nuevo en esa misma ventana, porque las direcciones de Instagram caducan.

## Actualizar los textos cada semana

Edita `data/analysis.json` y súbelo a `main`. No hace falta tocar el código.

Ahí viven:

- el «por qué» de los mejores y de los que menos llegaron, y qué publicaciones son (`best` y `worst`, por `mediaId`)
- «Lo que hemos aprendido» y «Recomendaciones»
- las notas de horario y de follows
- por publicación, si nació como trial (`wasTrial`), el título corto, y el recorte manual de `follows` y `nonFollowerPercent`

`follows` es el número del recorte. `nonFollowerPercent` puede ir como fracción (`0.927`) o como porcentaje (`92.7`). `snapshot` es la fecha de ese recorte, por ejemplo `"15 nov 2026"`.

Si un campo no está, la página muestra un guión. Un `0` solo cuando el recorte dice cero.

Solo entran publicaciones desde el 29 oct 2026.

Un Reel con `is_shared_to_feed: false` se etiqueta «Trial (no en el grid)». Si está en el grid y en el JSON `wasTrial` es true, se etiqueta «Grid (fue trial)». La API no recuerda que nació como trial.
