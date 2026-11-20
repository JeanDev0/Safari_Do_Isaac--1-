# Safári do Isaac — 1 aninho

Convite de aniversário com abertura de safári, seleção de convidados por família e confirmação por e-mail.

## Abrir no VS Code

1. Extraia o ZIP e abra a pasta `Safari_Do_Isaac` no VS Code.
2. Instale o Node.js 22 ou superior, se necessário.
3. No terminal do VS Code, execute `npm ci` na primeira vez e depois `npm start`.
4. Abra [localhost:3000](http://localhost:3000).

Use `npm run dev` para reiniciar o servidor ao salvar mudanças nos arquivos JavaScript. Se editar os JSONs de configuração, reinicie o servidor e atualize a página.

## Onde editar

| Arquivo | Conteúdo |
| --- | --- |
| `data/convidados.json` | Nome principal de cada convite e pessoas vinculadas |
| `data/festa.json` | Data, hora, nome do espaço e endereço usado no mapa e na rota |
| `public/index.html` | Estrutura e textos da página |
| `public/css/estilos.css` | Cores, layout e animação das folhas |
| `public/css/animais.css` | Balanço dos macacos, cena ilustrada da savana |
| `public/js/principal.js` | Rolagem, preenchimento da lista e envio da confirmação |
| `public/assets/` | Ilustrações para computador e celular |
| `server.js` | Servidor e rotas HTTP |
| `src/convite.js` | Leitura da lista e validação das presenças |
| `src/email.js` | Envio de e-mail |
| `.env.example` | Modelo de configuração do envio |

## Cadastrar os convidados

Substitua os grupos fictícios de `data/convidados.json` pelos grupos da festa. Cada grupo tem um `id` único, um nome principal em `responsavel` e uma lista `pessoas`. Inclua o próprio responsável em `pessoas` quando ele também puder marcar presença. Use um ID diferente para cada pessoa dentro do grupo.

```json
[
  {
    "id": "familia-silva",
    "responsavel": "Ana Silva",
    "pessoas": [
      { "id": "ana", "nome": "Ana Silva" },
      { "id": "pedro", "nome": "Pedro Silva" }
    ]
  }
]
```

## Receber as confirmações por e-mail

O projeto começa em demonstração. Você pode selecionar nomes e concluir o fluxo na tela com os convidados fictícios.

1. Ative a verificação em duas etapas na conta Google que vai enviar as confirmações.
2. Gere uma [senha de app do Google](https://myaccount.google.com/apppasswords).
3. Duplique `.env.example` com o nome `.env`. Altere `RSVP_MODE` para `email` e preencha `GMAIL_APP_PASSWORD` com a senha de app. Guarde o valor no `.env` da sua máquina ou no painel de hospedagem.
4. Reinicie o servidor, faça uma confirmação de teste e confira a caixa de entrada da conta.

```dotenv
RSVP_MODE=email
EMAIL_PROVIDER=gmail
GMAIL_USER=rodrigocarvalho272012@gmail.com
GMAIL_APP_PASSWORD=sua_senha_de_app
EMAIL_TO=rodrigocarvalho272012@gmail.com
PORT=3000
```

O assunto tem o formato “Safári do Isaac | Camila Andrade confirmou presença”. O corpo lista somente os convidados marcados, junto do total e do nome principal do convite. As mensagens vão para `EMAIL_TO`. O projeto usa o histórico de mensagens como registro das respostas.

Configurações anteriores do Resend continuam disponíveis com `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` e `EMAIL_TO`.

## Disponibilizar o convite para os convidados

Hospede a pasta em um serviço com suporte a Node.js 22 ou superior. Use `npm ci` para instalar as dependências e `npm start` para iniciar. Cadastre as variáveis do `.env` no painel do serviço e mantenha as credenciais fora dos arquivos enviados ao Git. Para o Gmail, o servidor precisa permitir conexões a `smtp.gmail.com` na porta TCP 465. Se o serviço definir `PORT` automaticamente, mantenha o valor gerenciado por ele.

Compartilhe o endereço HTTPS fornecido pela hospedagem. Quem tiver acesso ao convite poderá abrir os nomes principais e ver os integrantes vinculados. O acesso por HTTPS também permite que o navegador gere o identificador usado para reenviar a confirmação em caso de falha transitória.
