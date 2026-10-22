@echo off
REM Sobe o servidor local e abre o jogo no navegador.
REM NAO feche esta janela enquanto estiver jogando.

setlocal
set "PY=C:\Users\janaina.sousa\AppData\Local\Programs\Python\Python315\python.exe"
if not exist "%PY%" set "PY=python"

if not exist "%~dp0js\index.html" (
  echo.
  echo  Nao encontrei o jogo em:  %~dp0js\index.html
  echo.
  pause
  exit /b 1
)

echo Abrindo o jogo em http://localhost:8060/ ...
start "" "http://localhost:8060/"

echo.
echo  Servidor rodando. NAO feche esta janela enquanto estiver jogando.
echo  Para parar: feche a janela ou aperte Ctrl+C.
echo.
echo  Dica: para testar no celular, rode:
echo    "%PY%" "%~dp0servir_web.py" --host
echo.

"%PY%" "%~dp0servir_web.py"
pause
