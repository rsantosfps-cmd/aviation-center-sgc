Aviation Center SGC v1.2.1 — CORREÇÃO DEFINITIVA

Base preservada: estrutura do SGC v1.1, com correções pontuais.

CORREÇÕES:
1. Seleção de relatórios na Nova Sessão:
   - Altímetro
   - Integração do Transponder e Altitude Encoder
   - Encoder
   - Transponder
   - Air Data
   Apenas os relatórios selecionados aparecem e são impressos.

2. Transponder:
   A estrutura foi restaurada para seguir o documento original, incluindo:
   - Rádio frequência de resposta
   - Supressão Modo 3/A
   - Sensibilidade do receptor
   - Potência de pico de saída de RF
   - Outras medições
   - Parâmetros de recepção Mode A / Mode C
   - Testes somente para Transponder Mode S

3. Air Data:
   Incluído como relatório selecionável.
   100% MANUAL: nenhum valor do Air Data é copiado de outro relatório.
   Inclui Teste #1 — Erro de Escala e Teste #4 — Vazamento da Linha.

4. Automatizações acordadas:
   - Altímetro: Valor com vibração do Teste de Atrito -> Valor lido do Erro de Escala somente quando a altitude for exatamente igual.
   - Histerese: Valor lido durante o teste vem do Erro de Escala na mesma altitude; diferença = crescente - decrescente.
   - Integração: leitura do altímetro vem da escala correspondente por altitude exata.

5. Dados da sessão permanecem locais/offline.


v1.2.2 — Segurança e impressão: relatórios podem ser apagados individualmente e vão para a Lixeira por 7 dias, com restauração ou exclusão definitiva. Impressão refeita em janela própria, formato Letter, somente com os relatórios selecionados.