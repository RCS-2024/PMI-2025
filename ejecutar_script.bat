@echo off
echo Ejecutando el script de creación de estructura de carpetas...
echo.

:: Ejecutar PowerShell con ventana abierta y esperar resultados
powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0crear_estructura.ps1' -Verb RunAs -Wait"

echo.
echo El script ha finalizado. Si no ves resultados, puede ser que aún esté ejecutándose como administrador.
echo.
pause
