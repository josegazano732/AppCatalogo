# Deploy en GitHub Pages

## Comando principal

Desde la carpeta raiz del proyecto ejecutar:

```powershell
npm run deploy
```

Este comando realiza dos acciones:

1. Compila Angular en modo produccion.
2. Publica el contenido de `dist/app-catalogo` en la rama `gh-pages`.

## Primera instalacion

Si es la primera vez que se usa el proyecto en una computadora:

```powershell
npm install
```

Luego ejecutar el deploy:

```powershell
npm run deploy
```

## Flujo recomendado

Antes de publicar, validar y subir el codigo fuente:

```powershell
npm test
npm run build
git status
git add .
git commit -m "Actualiza catalogos y precios"
git push
npm run deploy
```

`git push` actualiza la rama principal con el codigo fuente. `npm run deploy` publica por separado la aplicacion compilada en `gh-pages`.

## Configuracion del repositorio

En GitHub abrir:

1. `Settings`.
2. `Pages`.
3. En `Build and deployment`, seleccionar `Deploy from a branch`.
4. Elegir la rama `gh-pages` y la carpeta `/ (root)`.
5. Guardar la configuracion.

## URL publica

La aplicacion se publica en:

```text
https://josegazano732.github.io/AppCatalogo/
```

GitHub Pages puede demorar algunos minutos en reflejar una nueva version.

## Configuracion actual del proyecto

El script definido en `package.json` es:

```text
ng build --configuration production && angular-cli-ghpages --dir=dist/app-catalogo
```

La configuracion de produccion usa:

```text
baseHref: /AppCatalogo/
deployUrl: /AppCatalogo/
```

Estos valores deben coincidir con el nombre del repositorio de GitHub.

## Solucion de problemas

### La pagina muestra una version anterior

Esperar unos minutos y recargar ignorando cache con `Ctrl + F5`.

### Error de autenticacion de Git

Verificar que Git tenga acceso al repositorio y que el remoto sea correcto:

```powershell
git remote -v
```

### Recursos o imagenes con error 404

Confirmar que el repositorio siga llamandose `AppCatalogo` y que `baseHref` y `deployUrl` continúen configurados como `/AppCatalogo/`.

### El deploy falla durante la compilacion

Ejecutar primero:

```powershell
npm run build
```

Corregir los errores informados y volver a ejecutar `npm run deploy`.