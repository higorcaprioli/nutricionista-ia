# Nutri IA — seu nutricionista no celular

App web instalável (PWA) para seguir um protocolo de déficit calórico com preservação de massa magra.

## Abas

| Aba | O que faz |
|---|---|
| **Dieta** | Agenda do dia (08:00 café, 11:00 lanche, 13:30 almoço, 16:30 pré-treino, 20:00 jantar, 22:45 ceia) com 3 opções por refeição, ingredientes, preparo e macros. "✓ Comi esta" registra no dia. |
| **Métricas** | Peso e bioimpedância (Galaxy Watch: % gordura, massa muscular esquelética, massa gorda, água, TMB), gráfico de evolução, ritmo kg/semana, previsão da meta e a reavaliação de 4 semanas do protocolo. |
| **Treino** | Plano de musculação 4×/semana com checklist, registro de esteira (velocidade + inclinação, equação ACSM) e outras atividades (MET), passos do relógio. As kcal gastas liberam parte do orçamento do dia. |
| **Jejum** | Cronômetro do jejum de 24 h com fases, meta de 1×/semana e histórico. |
| **Hoje** | Barra de kcal do dia (meta + exercício), botão de câmera para fotografar o prato, resumo do que falta de proteína/carbo/gordura/fibra/água e alertas em amarelo/vermelho quando se aproxima ou passa do limite. |

## Contagem de calorias por foto

Usa a API do Claude (visão). Em ⚙️ Ajustes, cole uma chave criada em <https://console.anthropic.com/settings/keys>.
A chave fica salva **só no seu aparelho** e é enviada apenas para `api.anthropic.com`.

## Privacidade

Todos os dados (peso, bioimpedância, refeições, fotos) ficam no `localStorage` do navegador do celular. Nada é enviado para o GitHub. Use **Ajustes → Exportar** para fazer backup.

## Instalar no celular (Android)

1. Abra o link do GitHub Pages no Chrome.
2. Menu ⋮ → **Instalar app** / **Adicionar à tela inicial**.

## Rodar localmente

```bash
python -m http.server 8080
```

Abra <http://localhost:8080>.

> Ferramenta de apoio — não substitui acompanhamento de nutricionista/médico.
