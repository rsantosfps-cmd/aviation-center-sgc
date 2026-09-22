# Backend — Aviation Center Calibrações v1.9

O aplicativo continua **offline-first**. O backend é uma camada adicional para sincronizar as calibrações entre o PWA e o navegador quando houver internet.

## Backend escolhido

Supabase: autenticação por e-mail/senha + PostgreSQL via REST. O app não usa biblioteca externa para isso, portanto continua funcionando offline.

## Configuração única

1. Crie um projeto no Supabase.
2. No SQL Editor, execute `supabase-schema.sql`.
3. Nas configurações da autenticação, deixe habilitado o cadastro por e-mail. Se a confirmação de e-mail estiver habilitada, confirme o e-mail antes do primeiro login.
4. Abra `backend-config.js` e preencha:
   - `url`: URL do projeto Supabase.
   - `anonKey`: chave pública ANON.
5. **Nunca** coloque `service_role` no `backend-config.js`.
6. Publique novamente o PWA/site no GitHub Pages.

## Como fica o uso

- Sem internet: continua salvando localmente e gerando os relatórios normalmente.
- Com internet + conta conectada: alterações locais são enviadas para a nuvem.
- No outro aparelho: entre com a mesma conta e a aplicação mescla os registros locais e da nuvem.
- A sincronização preserva calibrações por `id` e usa `updatedAt` para decidir qual versão é mais recente.
- A Lixeira também é sincronizada.

## Importante

O backend não é "simulado". Sem preencher `backend-config.js` e criar o projeto Supabase, a aplicação permanece local. Isso é intencional: não há como criar uma conta/projeto externo ou obter credenciais reais sem acesso à sua conta.
