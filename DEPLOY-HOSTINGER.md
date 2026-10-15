# Instalação no VPS da Hostinger

O painel roda inteiro no seu servidor: o site, o banco (SQLite, um arquivo), as fotos (uma pasta) e o login. Não depende mais do Supabase nem da Vercel. O HTTPS é automático.

## O que você precisa

- Um VPS na Hostinger (Ubuntu 24.04; 1 vCPU e 1 GB de memória já bastam para este painel).
- Um endereço do painel, por exemplo `obras.seudominio.com.br`.

## 1. Preparar o VPS

1. No hPanel da Hostinger, abra o VPS. Se ainda for instalar o sistema, escolha **Ubuntu 24.04 com Docker**. Se já estiver instalado, entre pelo **Terminal do navegador** (ou por SSH) e rode: `curl -fsSL https://get.docker.com | sh`.
2. No firewall do VPS (hPanel → VPS → Segurança → Firewall), deixe abertas as portas **22, 80 e 443**.
3. Anote o **IP** do VPS.

## 2. Apontar o endereço para o VPS

No DNS do seu domínio, crie um registro:

| Tipo | Nome | Valor |
|---|---|---|
| A | `obras` (ou o subdomínio que preferir) | IP do VPS |

Espere alguns minutos até propagar.

## 3. Baixar o painel no VPS

No terminal do VPS:

```bash
git clone -b vps https://github.com/jotapontoconsultoria-alt/quintalconstrutora.git
cd quintalconstrutora
```

Se o repositório for privado, o GitHub pedirá usuário e senha: use seu usuário e, no lugar da senha, um **token** (GitHub → Settings → Developer settings → Personal access tokens, com permissão só de leitura do repositório).

## 4. Configurar

```bash
cp .env.example .env
nano .env        # preencha DOMINIO, ADMIN_EMAIL e ADMIN_SENHA (Ctrl+O, Enter, Ctrl+X para salvar)
mkdir -p dados && chown 1000:1000 dados
```

`ADMIN_EMAIL` e `ADMIN_SENHA` criam o primeiro administrador no primeiro acesso. Depois que o painel estiver no ar, você pode apagar a senha do `.env`.

## 5. Subir

```bash
docker compose up -d --build
```

A primeira vez leva alguns minutos. Quando terminar, abra `https://obras.seudominio.com.br` e entre com o e-mail e a senha do `.env`.

## 6. Levar os dados do Supabase

O arquivo `quadro-supabase.json` (enviado junto) tem as obras e prazos atuais. Para importar:

1. Envie o arquivo para a pasta `dados` do VPS (pelo gerenciador de arquivos da Hostinger ou com `scp quadro-supabase.json root@IP:~/quintalconstrutora/dados/`).
2. Rode:
   ```bash
   docker compose exec app node scripts/importar-quadro.mjs /data/quadro-supabase.json
   ```
3. Atualize a página do painel.

Os usuários não são levados (as senhas ficam criptografadas no Supabase e não saem de lá). Cadastre cada pessoa de novo em **Configurações → Cadastrar usuário**. Hoje são `charles@jotaponto.tech` e `teste@jotaponto.tech`, ambos como Editor.

## 7. Backup diário

```bash
chmod +x scripts/backup.sh
crontab -e
```

Acrescente a linha (backup todo dia às 3h; guarda os 14 mais recentes em `~/backups-quintal`):

```
0 3 * * * /root/quintalconstrutora/scripts/backup.sh >> /root/backup-quintal.log 2>&1
```

Ajuste `/root/` se o seu usuário for outro. Também vale ativar os **backups automáticos do VPS** no hPanel, que guardam o servidor inteiro.

## Atualizar o painel no futuro

```bash
cd quintalconstrutora
git pull
docker compose up -d --build
```

Os dados ficam na pasta `dados` e não são afetados.

## Ver se está tudo bem

- `docker compose ps`: os dois serviços devem estar "running".
- `docker compose logs -f app`: mensagens do painel.
- `docker compose logs -f caddy`: emissão do certificado HTTPS (se falhar, quase sempre é o DNS ainda não apontado ou a porta 80/443 fechada).

## Desligar o Supabase e a Vercel

Faça isso só depois de usar o painel novo por alguns dias. Mantenha o Supabase pausado por um tempo como segurança. As fotos novas ficam em `dados/fotos`, e o banco em `dados/quintal.db`.
