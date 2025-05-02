@echo off
echo Creando estructura de carpetas...
echo.

:: Definir variables
set "RUTA_BASE=C:\"
echo Ruta predeterminada: %RUTA_BASE%
set /p RUTA_BASE="Ingresa la ruta donde crear las carpetas (Ejemplo: D:\ o C:\Proyectos) o presiona ENTER para usar C:\: "

:: Crear carpetas con CMD directamente
if not exist "%RUTA_BASE%RMS\" (
  mkdir "%RUTA_BASE%RMS"
  echo Carpeta creada: %RUTA_BASE%RMS
) else (
  echo Ya existe: %RUTA_BASE%RMS
)

if not exist "%RUTA_BASE%RMS\Backup\" (
  mkdir "%RUTA_BASE%RMS\Backup"
  echo Carpeta creada: %RUTA_BASE%RMS\Backup
) else (
  echo Ya existe: %RUTA_BASE%RMS\Backup
)

if not exist "%RUTA_BASE%RMS\Polling\" (
  mkdir "%RUTA_BASE%RMS\Polling"
  echo Carpeta creada: %RUTA_BASE%RMS\Polling
) else (
  echo Ya existe: %RUTA_BASE%RMS\Polling
)

if not exist "%RUTA_BASE%RMS\Polling\Backup\" (
  mkdir "%RUTA_BASE%RMS\Polling\Backup"
  echo Carpeta creada: %RUTA_BASE%RMS\Polling\Backup
) else (
  echo Ya existe: %RUTA_BASE%RMS\Polling\Backup
)

if not exist "%RUTA_BASE%RMS\Polling\Receive\" (
  mkdir "%RUTA_BASE%RMS\Polling\Receive"
  echo Carpeta creada: %RUTA_BASE%RMS\Polling\Receive
) else (
  echo Ya existe: %RUTA_BASE%RMS\Polling\Receive
)

if not exist "%RUTA_BASE%RMS\Polling\Send\" (
  mkdir "%RUTA_BASE%RMS\Polling\Send"
  echo Carpeta creada: %RUTA_BASE%RMS\Polling\Send
) else (
  echo Ya existe: %RUTA_BASE%RMS\Polling\Send
)

if not exist "%RUTA_BASE%RMS\Polling\Update\" (
  mkdir "%RUTA_BASE%RMS\Polling\Update"
  echo Carpeta creada: %RUTA_BASE%RMS\Polling\Update
) else (
  echo Ya existe: %RUTA_BASE%RMS\Polling\Update
)

if not exist "%RUTA_BASE%RMS\RMSUpdate\" (
  mkdir "%RUTA_BASE%RMS\RMSUpdate"
  echo Carpeta creada: %RUTA_BASE%RMS\RMSUpdate
) else (
  echo Ya existe: %RUTA_BASE%RMS\RMSUpdate
)

if not exist "%RUTA_BASE%RMS\RMSInstall\" (
  mkdir "%RUTA_BASE%RMS\RMSInstall"
  echo Carpeta creada: %RUTA_BASE%RMS\RMSInstall
) else (
  echo Ya existe: %RUTA_BASE%RMS\RMSInstall
)

if not exist "%RUTA_BASE%RMS\FE\" (
  mkdir "%RUTA_BASE%RMS\FE"
  echo Carpeta creada: %RUTA_BASE%RMS\FE
) else (
  echo Ya existe: %RUTA_BASE%RMS\FE
)

:: Crear archivo Poll_Log.txt dentro de Polling
if not exist "%RUTA_BASE%RMS\Polling\Poll_Log.txt" (
  echo. > "%RUTA_BASE%RMS\Polling\Poll_Log.txt"
  echo Archivo creado: %RUTA_BASE%RMS\Polling\Poll_Log.txt
) else (
  echo Ya existe: %RUTA_BASE%RMS\Polling\Poll_Log.txt
)

:: Preguntar por permisos
set /p COMPARTIR="¿Deseas compartir la carpeta RMS con permisos de lectura/escritura? (S/N): "
if /i "%COMPARTIR%"=="S" (
  echo Configurando permisos...
  icacls "%RUTA_BASE%RMS" /grant Everyone:(OI)(CI)F /T
  net share RMS="%RUTA_BASE%RMS" /GRANT:Everyone,FULL
  echo Carpeta RMS compartida con permisos completos.
)

echo.
echo === RESUMEN ===
echo Estructura creada en: %RUTA_BASE%
echo.
echo Listado de carpetas creadas:
dir /s /b /AD "%RUTA_BASE%RMS"
echo.
echo Archivo Poll_Log.txt creado en: %RUTA_BASE%RMS\Polling\Poll_Log.txt

echo.
echo Operación completada.
pause
