# Publicação de versão Web/PWA

Este procedimento controla a verificação automática de versão via `version.json`.

## Antes de publicar

1. Atualize `constants/app-version.ts`:
   - `APP_VERSION`
   - `APP_BUILD`
2. Sincronize `public/version.json` com os mesmos valores (`version` e `build`).
3. Gere o export web:

```bash
npx expo export -p web
```

4. Confirme que `dist/version.json` e o bundle em `dist/_expo/static/js/web/` refletem a versão correta.

**Importante:** publicar apenas `version.json` sem rebuild deixa o app preso no modal de atualização, porque a versão embutida no JavaScript continua antiga.

## Ordem recomendada no FTP

Para evitar aviso de nova versão antes dos arquivos estarem disponíveis:

1. Envie primeiro as pastas e assets (`_expo`, `assets`, etc.).
2. Envie depois o `index.html` e demais páginas `.html`.
3. Envie o `version.json` por último.

## URL publicada

Site de produção:

`https://matchcondo.com.br`

O arquivo de versão deve ficar acessível em:

`https://matchcondo.com.br/version.json`

## Regras importantes

- A versão exibida no app vem de `APP_VERSION` e `APP_BUILD` embutidos no código.
- O modal só aparece quando `version.json` > `APP_VERSION`.
- Não publique um `version.json` com versão maior antes que os demais arquivos da nova versão estejam no servidor.
