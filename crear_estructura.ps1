# Solicita privilegios de administrador si no los tiene
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Reiniciando script como Administrador..."
    # Usar -NoExit para que la ventana no se cierre
    Start-Process powershell -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\"" -Verb RunAs
    exit
}

# Mostrar información del directorio actual
Write-Host "Directorio actual: $PWD"

# Preguntar al usuario la unidad o ruta donde crear la estructura
$defaultDrive = "C:\\"
$targetRoot = Read-Host "¿En qué ruta o disco quieres crear la estructura de carpetas? (Ejemplo: D:\\ o C:\\Proyectos) [Por defecto: $defaultDrive]"
if ([string]::IsNullOrWhiteSpace($targetRoot)) {
    $targetRoot = $defaultDrive
}

# Verificar y crear la ruta si no existe
if (-not (Test-Path $targetRoot)) {
    $crear = Read-Host "La ruta '$targetRoot' no existe. ¿Deseas crearla? (S/N)"
    if ($crear -eq 'S' -or $crear -eq 's') {
        New-Item -ItemType Directory -Path $targetRoot | Out-Null
        Write-Host "Ruta creada: $targetRoot"
    } else {
        Write-Host "Operación cancelada."
        exit
    }
}

# Definir las carpetas a crear con rutas absolutas
$rmsBase = Join-Path $targetRoot "RMS"
$folders = @(
    $rmsBase,
    (Join-Path $rmsBase "Backup"),
    (Join-Path $rmsBase "Polling"),
    (Join-Path $rmsBase "Polling\Backup"),
    (Join-Path $rmsBase "Polling\Receive"),
    (Join-Path $rmsBase "Polling\Send"),
    (Join-Path $rmsBase "Polling\Update"),
    (Join-Path $targetRoot "RMSUpdate"),
    (Join-Path $targetRoot "RMSInstall"),
    (Join-Path $targetRoot "FE")
)

# Crear las carpetas
Write-Host "Creando carpetas en: $targetRoot"
foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "Carpeta creada: $folder"
    } else {
        Write-Host "Ya existe: $folder"
    }
}

# Crear archivo Poll_Log.txt si no existe
$logFile = Join-Path $rmsBase "Polling\Poll_Log.txt"
if (-not (Test-Path $logFile)) {
    New-Item -ItemType File -Path $logFile | Out-Null
    Write-Host "Archivo creado: $logFile"
} else {
    Write-Host "Ya existe: $logFile"
}

# Obtener el usuario actual
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Intentar asignar permisos NTFS a Everyone/Todos y usuario actual
$permisosAplicados = $false
$grupos = @("Everyone", "Todos", $user)
foreach ($grupo in $grupos) {
    try {
        icacls $rmsBase /grant "$grupo:(OI)(CI)F" /T > $null
        Write-Host "Permisos NTFS aplicados a: $grupo"
        $permisosAplicados = $true
    } catch {
        Write-Host "No se pudo aplicar permisos a: $grupo"
    }
}

if (-not $permisosAplicados) {
    Write-Host "Advertencia: No se pudieron aplicar permisos NTFS a ningún grupo conocido."
}

# Preguntar si desea compartir la carpeta RMS
$share = Read-Host "¿Desea compartir la carpeta RMS con permisos de lectura/escritura para todos los usuarios? (S/N)"
if ($share -eq 'S' -or $share -eq 's') {
    $shareName = "RMS"
    $compartido = $false
    Write-Host "Intentando compartir: $rmsBase como $shareName"
    try {
        net share $shareName="$rmsBase" /GRANT:Everyone,FULL > $null
        Write-Host "La carpeta RMS ha sido compartida como 'Everyone'."
        $compartido = $true
    } catch {
        try {
            net share $shareName="$rmsBase" /GRANT:Todos,FULL > $null
            Write-Host "La carpeta RMS ha sido compartida como 'Todos'."
            $compartido = $true
        } catch {
            Write-Host "No se pudo compartir la carpeta RMS automáticamente. Hágalo manualmente si es necesario."
        }
    }
} else {
    Write-Host "No se compartió la carpeta RMS."
}

# Mostrar resumen
Write-Host "\n==========================================="
Write-Host "RESUMEN DE OPERACIÓN"
Write-Host "==========================================="
Write-Host "Directorio base: $targetRoot"
Write-Host "Carpeta RMS creada en: $rmsBase"

# Lista las carpetas creadas para verificación
Write-Host "\nListado de carpetas creadas:"
Get-ChildItem -Path $targetRoot -Recurse -Directory | Select-Object FullName | ForEach-Object { Write-Host "  - $($_.FullName)" }

# Pausa para ver resultados
Write-Host "\nPresiona cualquier tecla para cerrar..."
$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
