# Studio DVC · analítica de Instagram

Página privada de @studio.dvc. Los números salen de la Instagram Graph API, en el servidor. Los textos (por qué, aprendizajes, recomendaciones y los follows que Daniela anota a mano) salen de `data/analysis.json`.

La interfaz está en español. No hay login de Instagram en el navegador: el token no sale del servidor.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `IG_ACCESS_TOKEN` | Token de la Instagram Graph API de @studio.dvc. El mismo que usa el script de lectura. Sin este valor, la página enseña la muestra del 21 nov 2026 y lo dice. |
| `APP_PASSWORD` | Contraseña única de la página. Sin ella, la app responde que falta configurarla. |

Copia `.env.example` a `.env.local` para probar en tu ordenador. No subas esos archivos. El token no se escribe en el repositorio, ni en los logs, ni en la página.

La cuenta que se lee es la de usuario de Instagram `17841407468921719` (@studio.dvc), Graph API `v27.0`.

## Abrir en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000 e introduce `APP_PASSWORD`.

```bash
npm test
npm run build
```

## Desplegar en Vercel (plan gratis)

1. En [Vercel](https://vercel.com), importa el repositorio `danivelezcortes-netizen/studio-dvc-hub`.
2. Framework: **Next.js**. El comando de build es `next build` (el que Vercel detecta solo).
3. En **Settings → Environment Variables**, añade:
   - `IG_ACCESS_TOKEN` (márcala como sensible)
   - `APP_PASSWORD` (márcala como sensible)
4. Aplícalas a Production (y a Preview si quieres ver las ramas).
5. Pulsa **Deploy**.
6. Abre la URL. La página pide la contraseña. No hace falta el «Password Protection» de pago de Vercel: esta app trae la suya.

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
