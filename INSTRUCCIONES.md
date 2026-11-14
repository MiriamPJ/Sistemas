# CONECTATEC 2026 · Registro de asistencia con QR

**Arquitectura:** Google Sheets (base de datos) + Google Apps Script (servidor y validaciones) + aplicación web HTML responsiva.
Es gratis y los alumnos no necesitan iniciar sesión con Google.

```
Celular del alumno ──QR──> URL de la Web App (?conf=12)
                              │  google.script.run.registrar()
                              ▼
                   Code.gs (Apps Script)
                   • valida formato de No. control, nombre y semestre
                   • valida la ventana de horario (reloj del servidor)
                   • LockService: un registro a la vez (sin condiciones de carrera)
                   • bloquea duplicados y empalmes de horario
                              ▼
                   Google Sheets: hoja "Asistencia" (1 renglón por asistencia)
```

**¿Por qué no Google Forms?** Forms no puede consultar los registros anteriores en tiempo real, así que no puede bloquear empalmes ni duplicados antes de guardar.

---

## 1. Instalación (unos 10 minutos)

1. Con la cuenta institucional (o la del departamento) crea una hoja nueva en <https://sheets.new> y nómbrala **CONECTATEC 2026 – Asistencia**.
2. Menú **Extensiones → Apps Script**.
3. En el editor:
   - Borra el contenido de `Código.gs` y pega todo el contenido de **`Code.gs`**.
   - Haz clic en **+ → HTML** y nombra el archivo exactamente **`Index`** (sin `.html`). Pega el contenido de **`Index.html`**.
   - *(Recomendado)* **⚙ Configuración del proyecto → marca "Mostrar el archivo de manifiesto appsscript.json"**. Abre `appsscript.json` y reemplázalo con el archivo incluido (fija la zona horaria `America/Matamoros`).
4. Guarda (💾). En la barra superior elige la función **`inicializar`** y pulsa **▶ Ejecutar**. Acepta los permisos (Avanzado → Ir al proyecto → Permitir).
   Esto crea las hojas **Conferencias** y **Asistencia** con el programa oficial cargado.
5. Recarga la hoja de cálculo: aparecerá el menú **CONECTATEC**.

### Revisa el programa
En la hoja **Conferencias** completa lo que está como *Por confirmar*:

| Columna | Uso |
|---|---|
| **Sede** | Ej. `Sala de Usos Múltiples`, `Auditorio de Fundadores`, `Unidad 5 Lab 1` |
| **Semestres** | `Todos`, `7,9` (Sala de Usos Múltiples) o `1,3,5` (Auditorio de Fundadores) |
| **Activa** | Pon `NO` para ocultar una conferencia sin borrarla |

No cambies la columna **ID** después de imprimir los QR. Tras editar, usa **CONECTATEC → Refrescar programa** (o espera 2 minutos).

## 2. Publicar la aplicación web

1. En Apps Script: **Implementar → Nueva implementación → ⚙ Tipo: Aplicación web**.
2. **Ejecutar como:** *Yo* · **Quién tiene acceso:** *Cualquier usuario* (si usas una cuenta del dominio institucional y no aparece esa opción, el administrador de Google Workspace tiene que permitirla; si no, usa una cuenta @gmail.com del departamento).
3. **Implementar** y copia la URL que termina en **`/exec`**.
4. Si cambias el código después: **Implementar → Gestionar implementaciones → ✏ → Versión: Nueva versión → Implementar**. Así **la URL no cambia** y los QR impresos siguen sirviendo.

## 3. Generar los códigos QR

Cada conferencia tiene su propia URL con el parámetro `conf` = ID de la hoja *Conferencias*:

```
https://script.google.com/macros/s/XXXXXXXX/exec?conf=1    ← INAUGURACIÓN 18 nov 09:00
https://script.google.com/macros/s/XXXXXXXX/exec?conf=12   ← Deep Learning / SIARR 19 nov 16:00
https://script.google.com/macros/s/XXXXXXXX/exec           ← general: lista filtrada por la hora actual
```

**Opción A – Carteles listos para imprimir (recomendada):** abre `TU_URL/exec?vista=carteles` en la computadora e imprime (Ctrl+P). Sale un cartel tamaño carta por conferencia con título, ponente, horario, sede y QR.

**Opción B – Hoja QR:** menú **CONECTATEC → 2. Generar hoja de códigos QR**. Crea la hoja **QR** con la URL y la imagen del QR de cada conferencia (fórmula `IMAGE()`), útil para copiar a presentaciones o diapositivas.

**Opción C – Manual:** pega cada URL en cualquier generador de QR (p. ej. el de Canva o `qr-code-generator.com`).

> Prueba cada QR con tu celular antes de imprimir. Mientras pruebas fuera de horario, pon `VALIDAR_VENTANA: false` en `CONFIG`, crea una nueva versión de la implementación, haz las pruebas, borra los renglones de prueba de *Asistencia* y vuelve a `true` (con nueva versión).

## 4. Reglas que aplica el sistema

| Regla | Comportamiento |
|---|---|
| **Formato del No. control** | Se quitan espacios y guiones; debe quedar `12345678` o `L12345678` (1 letra + 8 dígitos). Se guarda como texto (no pierde ceros). Ajusta `REGEX_CONTROL` si tu formato es distinto. |
| **Nombre** | Se guarda en MAYÚSCULAS, solo letras, mínimo nombre + apellido. |
| **Duplicado** | El mismo No. control no puede registrar dos veces la misma conferencia. |
| **Empalme** | Bloquea si ya hay registro el mismo día con rango traslapado (`inicio1 < fin2 y inicio2 < fin1`). Ej.: 16:00–17:30 vs 17:00–18:00 → **bloqueado**. Horarios contiguos (10:00–11:00 y 11:00–12:00) **sí se permiten**. |
| **Ventana de registro** | Solo desde 15 min antes del inicio hasta 20 min después del fin (`MIN_ANTES`, `MIN_DESPUES`). Usa el reloj del servidor, no el del celular. |
| **Sede / semestre** | Si la conferencia dice `7,9` y el alumno es de 3.º, se muestra un aviso y se guarda. Con `BLOQUEAR_SEDE: true` se rechaza. |
| **Concurrencia** | `LockService` serializa los registros: dos envíos simultáneos del mismo alumno no pueden duplicarse. |

## 5. Exportar para combinación de correspondencia (constancias)

La hoja **Asistencia** ya está limpia: **1 renglón = 1 constancia**.

| Folio | Timestamp | No. Control | Nombre completo | Semestre | ID Conf | Conferencia | Ponente | Fecha conferencia | Horario | Sede |
|---|---|---|---|---|---|---|---|---|---|---|
| CTEC26-0001 | 19/11/2026 16:05:12 | 21580123 | JUAN PÉREZ LÓPEZ | 7 | 12 | Implementación de un modelo… | Dr. Samuel Martínez Ramos | 19 de noviembre de 2026 | 16:00 - 17:30 | Sala de Usos Múltiples |

- **Excel (.xlsx):** Archivo → Descargar → Microsoft Excel. Para dejar solo una hoja, haz clic derecho en la pestaña **Asistencia → Copiar en → Hoja de cálculo nueva** y descarga esa.
- **CSV:** colócate en la hoja **Asistencia** → Archivo → Descargar → Valores separados por comas (.csv). Solo exporta la hoja activa.
  Si Excel muestra mal los acentos al abrir el CSV, usa **Datos → Desde texto/CSV → Origen: 65001 UTF-8**, o descarga mejor el .xlsx.
- **Una constancia por alumno** (con todas sus actividades): menú **CONECTATEC → 3. Generar resumen por alumno** → hoja **Resumen_Constancias** (No. control, nombre, semestre, total de asistencias y lista de actividades).

### Combinar correspondencia en Word
1. Diseña la constancia en Word → **Correspondencia → Seleccionar destinatarios → Usar una lista existente** → elige el `.xlsx` → hoja **Asistencia**.
2. Inserta los campos `Nombre_completo`, `Conferencia`, `Ponente`, `Fecha_conferencia`, `Horario`, `Folio`.
3. Opcional: **Editar lista de destinatarios → Filtrar** (ej. `ID Conf = 12`) para imprimir por conferencia.
4. **Finalizar y combinar → Editar documentos individuales** o exportar a PDF.

(Si prefieres hacerlo todo en Google, el complemento gratuito *Autocrat* genera los PDF directamente desde la hoja.)

## 6. Lista de verificación para el día del evento
- [ ] `VALIDAR_VENTANA: true` y versión nueva publicada.
- [ ] Hoja *Asistencia* sin registros de prueba.
- [ ] Sedes/semestres completados en *Conferencias*.
- [ ] Cada QR impreso probado con un celular (abre la conferencia correcta).
- [ ] Un QR "general" (sin `?conf=`) de respaldo en cada sede.
- [ ] Wi-Fi o datos disponibles en la sede.

**Límites gratuitos de Google:** unas 30 ejecuciones simultáneas. Cada registro tarda menos de 1 segundo, así que 200 alumnos registrándose en pocos minutos funciona; si alguno ve "Hay mucha gente registrándose", solo tiene que volver a intentar.
