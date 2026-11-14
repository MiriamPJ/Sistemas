# Sistemas · Registro de asistencia CONECTATEC 2026

Sistema gratuito de registro de asistencia para el Ciclo de Conferencias CONECTATEC 2026 del Instituto Tecnológico de Reynosa. Funciona con **Google Sheets + Google Apps Script**: cada conferencia tiene un código QR que abre la aplicación web con `?conf=N`, el alumno escribe sus datos y el servidor valida antes de guardar.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `Code.gs` | Servidor: programa de conferencias, validaciones (formato, horario, sede, bloqueo de envíos simultáneos, duplicados y empalmes), menú **CONECTATEC** en Sheets, hoja de QR y resumen por alumno |
| `Index.html` | Formulario para celular con confirmación y folio |
| `appsscript.json` | Manifiesto: zona horaria `America/Matamoros` y acceso público a la aplicación web |
| `INSTRUCCIONES.md` | Guía completa: instalación, QR, exportación y constancias |
| `pruebas/simulacion.js` | Simulación local en Node de las reglas del servidor |

## Publicar en Apps Script (resumen)

1. Crea una hoja de cálculo nueva en <https://sheets.new> y abre **Extensiones → Apps Script**.
2. Pega `Code.gs` en `Código.gs`. Crea un archivo HTML llamado exactamente **`Index`** y pega `Index.html`.
3. En **⚙ Configuración del proyecto** activa "Mostrar el archivo de manifiesto appsscript.json" y reemplaza su contenido con `appsscript.json`.
4. Guarda, elige la función **`inicializar`** y pulsa **▶ Ejecutar**. Acepta los permisos. Se crean las hojas *Conferencias* y *Asistencia*.
5. En la hoja *Conferencias* completa las sedes y semestres que dicen *Por confirmar*.
6. **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*. Copia la URL que termina en `/exec`.
7. Imprime los carteles con QR abriendo `TU_URL/exec?vista=carteles`, o usa el menú **CONECTATEC → Generar hoja de códigos QR**.
8. Para publicar cambios sin que cambie la URL (y sin reimprimir QR): **Implementar → Gestionar implementaciones → ✏ → Versión: Nueva versión → Implementar**.

Los detalles, las pruebas con celular y la exportación de constancias están en [INSTRUCCIONES.md](INSTRUCCIONES.md).

## Probar antes de publicar

Requiere Node.js (cualquier versión reciente), sin instalar paquetes:

```bash
node pruebas/simulacion.js
```

Simula registros contra el programa real y revisa empalmes, duplicados, horarios contiguos, ventana de registro, aviso de sede y formato de datos. Termina con código 1 si alguna regla no se comporta como se espera.
