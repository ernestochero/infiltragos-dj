# Guía para agentes

## Descripción del proyecto
Aplicación Next.js 14 con React 18 y TypeScript para recibir pedidos de canciones y permitir que el DJ las gestione en un tablero Kanban.

## Tareas obligatorias del agente
1. Preparar el entorno con **Node.js 18**.
2. Instalar dependencias.
3. Ejecutar `npm run lint`.
4. Ejecutar `npm run typecheck`.
5. Ejecutar `npm test`.
6. Ejecutar `npm run build`.

## Variables de entorno
### Requeridas
- `NEXT_PUBLIC_APP_URL`
- `DJ_ADMIN_TOKEN`
- `NODE_ENV`

### Opcionales
- `LOG_LEVEL`

## Configuración de proxy y certificados
Cuando se trabaje detrás de un proxy corporativo:
- Definir los proxies en `http_proxy` y `https_proxy`.
- Establecer la ruta del certificado en `CODEX_PROXY_CERT` o `NODE_EXTRA_CA_CERTS`.
- Exportar esas variables antes de ejecutar `npm` para que reconozca el proxy y los certificados.

## Política de versiones
Para evitar conflictos se deben respetar las siguientes versiones:
- `typescript@5.4.5`
- `ts-node@10.9.2` (opcional)
- `@types/node@20`
- `next@14`
- `react@18`
- `react-dom@18`

## Instalación limpia
1. Borrar `node_modules` y `package-lock.json`.
2. Instalar primero las versiones fijas indicadas en la política de versiones.
3. Instalar el resto de dependencias.

## Scripts esperados en `package.json`
- `"dev": "next dev"`
- `"build": "next build"`
- `"start": "next start -p 3000"`
- `"lint": "next lint"`
- `"typecheck": "tsc --noEmit"`
- `"test": "vitest --run"` (o `jest` si aplica)

## Flujo de trabajo del agente
`install → lint → typecheck → test → build → entregar artefactos`

## Buenas prácticas de caché
- Cachear solo `~/.npm`.
- **No** cachear `node_modules`.

## Guía de resolución de problemas
- **ERESOLVE**: usar `--legacy-peer-deps` o ajustar versiones.
- **ETARGET**: verificar que la versión exista en el registro.
- **Errores de proxy/SSL**: comprobar variables de proxy y certificados.

## Acciones permitidas y no permitidas
- ❌ No desactivar SSL salvo que sea absolutamente necesario.
- ❌ No subir `node_modules` al repositorio.
- ✅ Se pueden fijar versiones cuando sea requerido.
