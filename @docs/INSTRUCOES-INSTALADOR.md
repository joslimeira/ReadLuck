# Instruções para Criar o Instalador do ReadLuck

## Status Atual

✅ **Versão Portátil Criada com Sucesso!**
- Localização: `dist\ReadLuck-win32-x64\`
- Arquivo ZIP: `dist\ReadLuck-Portable-v1.0.0.zip`
- Executável: `dist\ReadLuck-win32-x64\ReadLuck.exe`

## Para Criar o Instalador NSIS

### 1. Instalar o NSIS

1. Baixe o NSIS em: https://nsis.sourceforge.io/Download
2. Execute o instalador e siga as instruções
3. Adicione o NSIS ao PATH do sistema (geralmente `C:\Program Files (x86)\NSIS`)

### 2. Gerar o Instalador

Após instalar o NSIS, execute no PowerShell:

```powershell
makensis ReadLuck-Installer.nsi
```

Ou use o caminho completo:

```powershell
"C:\Program Files (x86)\NSIS\makensis.exe" ReadLuck-Installer.nsi
```

### 3. Resultado

O instalador será criado como: `ReadLuck-Setup-v1.0.0.exe`

## Arquivos Disponíveis

1. **Versão Portátil**: `dist\ReadLuck-Portable-v1.0.0.zip`
   - Descompacte e execute `ReadLuck.exe`
   - Não requer instalação

2. **Script do Instalador**: `ReadLuck-Installer.nsi`
   - Pronto para gerar o instalador com NSIS

3. **Guia Completo**: `GUIA-BUILD-WINDOWS.md`
   - Instruções detalhadas do processo de build

## Testando a Versão Portátil

Para testar a versão portátil:

```powershell
.\dist\ReadLuck-win32-x64\ReadLuck.exe
```

## Próximos Passos

1. Instale o NSIS se desejar criar o instalador
2. Teste a versão portátil
3. Distribua o arquivo ZIP ou o instalador conforme necessário