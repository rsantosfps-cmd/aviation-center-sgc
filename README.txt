Aviation Center Calibrações — v1.9 Backend

Fluxo da Nova calibração:
1. Cadastro dos dados + seleção dos laudos.
2. Salvar calibração.
3. O sistema abre somente os laudos selecionados para preenchimento.

A aba Instrumentos foi removida da interface sem apagar os dados existentes nas calibrações.

Impressão/PDF: mantém o gerador PDF local da versão anterior.

Backend:
- Offline-first continua ativo.
- Supabase Auth + PostgreSQL/REST foi integrado como camada de sincronização.
- Preencha backend-config.js com a URL e a chave pública ANON do projeto Supabase.
- Execute supabase-schema.sql no SQL Editor do Supabase.
- Não use service_role no frontend.

Consulte BACKEND-INSTRUCOES.md para a configuração.
