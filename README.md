# Mamba Negra — Metas Individuais

Painel de acompanhamento de metas de vendas (mensal, por vendedor e em equipe).

## Estrutura

```
├── index.html      # estrutura da página
├── css/style.css   # estilos
├── js/app.js       # lógica (calendário, metas, registro de fechamentos)
└── README.md
```

## Rodando localmente

Basta abrir o `index.html` em um navegador, ou servir a pasta com qualquer servidor estático:

```bash
npx serve .
```

## Deploy no Vercel

1. Suba esta pasta para um repositório no GitHub.
2. No [Vercel](https://vercel.com), clique em **New Project** e importe o repositório.
3. Como é um site estático (sem framework/build), o Vercel detecta automaticamente — não é preciso configurar build command nem output directory.
4. Deploy.

## Persistência de dados

Os dados (metas e fechamentos) ficam salvos no `localStorage` do navegador de quem estiver usando a página. Ou seja:

- Os dados **não são compartilhados entre pessoas/dispositivos diferentes** — cada navegador guarda os próprios dados.
- Limpar o cache/dados do site apaga o histórico salvo.

Se for necessário compartilhar os dados entre várias pessoas (ex: toda a equipe vendo o mesmo painel em tempo real), é preciso trocar o `localStorage` por um backend/banco de dados (ex: Supabase, Firebase) — a lógica de leitura/gravação está isolada nas funções `loadAll`, `saveGoals` e `saveProgress` em `js/app.js`, então é só substituir a implementação dessas funções.
