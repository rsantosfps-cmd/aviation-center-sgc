# Aviation Center SGC — v1.2 Definitivo

Arquivos do sistema offline-first:
- index.html
- style.css
- app.js
- manifest.json
- sw.js

Relatórios disponíveis na seleção da sessão:
1. Altímetro
2. Integração do Transponder e Altitude Encoder
3. Encoder
4. Transponder
5. Air Data (100% manual)

Regras implementadas:
- Somente relatórios selecionados aparecem e são impressos.
- Altímetro: relação automática entre Atrito → Erro de Escala somente por altitude correspondente.
- Histerese: leitura durante o teste vem do Erro de Escala e diferença = crescente − decrescente.
- Integração: leitura do altímetro vem da escala correspondente.
- Air Data não recebe automações.
- Células: verde claro dentro da margem, amarelo a até 2 unidades do limite, vermelho fora.
- Na impressão as cores são removidas.
- Histórico por aeronave e agrupamento por cliente.
- Backup/importação JSON local.
- PWA/service worker para uso offline após carregamento inicial em HTTPS.

Observação importante:
A sincronização automática real entre dispositivos exige um backend/cloud. O sistema mantém a fila local (`outbox`) e um ponto de integração (`settings.syncEndpoint`), mas não inventa um servidor inexistente.
