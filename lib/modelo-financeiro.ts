import type { FinDoc } from '@/lib/financeiro-tipos'

/** Categorias e itens padrão da planilha de acompanhamento financeiro (sem valores), para começar uma obra nova. */
export const MODELO_FINANCEIRO: FinDoc = {
  "mostrarDetalhe": false,
  "categorias": [
    {
      "nome": "Taxas e Impressões",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Projetos",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Outros",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Assessoria INSS",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Serviços preliminares",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Sondagem",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Topografia",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Telhas fechamento",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Barraco de obras tabuas de pinus",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "CERCA",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Ins. Provisoria de Energia",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Placa de Obra",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Fundação",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Aço",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Formas",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Estaqueamento",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Concreto",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Estrutura",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Formas",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Aço",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Concreto",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Pregos/Arames/Espaçadores/Isopor",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Lajes",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Malha Aço Lajes",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Pedrisco",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Areia",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Cimento Pilares",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Aditivo impermeabilizante",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Alvenaria",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Tijolos",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Argamassa",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Cimento",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Tela",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Areia",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Esquadrias",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Esquadrias",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Portas",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Fachada (Ripado)",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Porta Aluminio Entrada",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Guarda Corpo Escada",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Cobertura",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Calhas e Rufos",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Estrutura de madeira",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Telhas",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Manta Térmica",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Impermeabilização",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Impermeabilização areas molhadas",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Impermeabilização Cobertura",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Impermeabilização Baldrame",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Revestimento de paredes",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Areia",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Cimento",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Alvenarit (argamassa)",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Forros",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Outros",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Outros",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Pisos",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Pisos e Azulejos",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Piso Laminado",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Soleiras de Granito",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Espaçadores e Niveladores",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Projeto elétrico",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Ligação provisória",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Eletrodutos",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Cabos e Disjuntores",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Caixas de disjuntores",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Fiação Parte 1",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Acabamentos Eletricos",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Hidráulica",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Hidraulica Terreo",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Hidrômetro e Ligação prov.",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Caixa Dagua",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Tubos e Conexões",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Louças e metais",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Acabamento Registros",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Sanitários",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Outros",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Serviços complementares",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Infra Ar Condicionado",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Transporte aço",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Infra Gás",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Deck",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Tintas e massas",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Tintas",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Outros",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Outros",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Destinação de resíduos",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Papa entulho",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Lona/Saco de lixo",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Limpeza",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Equipamentos",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Andaime",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Banheiro químico / fossa",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Máquinas",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Extras",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Impressões",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "INSS",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Corretagem",
          "fornecedor": "",
          "lancamentos": []
        },
        {
          "nome": "Gerador",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Mão de obra",
      "grupo": "mao_de_obra",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Medições",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Jardim",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Serviço Jardinagem",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Limpeza",
      "grupo": "materiais",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Limpeza e Entrega da Obra",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    },
    {
      "nome": "Administração da obra",
      "grupo": "adm",
      "orcado": 0,
      "previsto": 0,
      "itens": [
        {
          "nome": "Mês 1",
          "fornecedor": "",
          "lancamentos": []
        }
      ]
    }
  ]
}
