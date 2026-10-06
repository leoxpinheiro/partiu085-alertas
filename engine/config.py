"""Configuração do motor Partiu085.

Para adicionar/remover destinos, edite a lista DESTINOS.
`teto` = preço ida e volta (R$) a partir do qual NUNCA é alerta, mesmo com desconto.
"""

ORIGEM = "FOR"
ORIGEM_NOME = "Fortaleza"

# (IATA, nome, tipo, teto ida+volta em R$)
DESTINOS = [
    # Nacionais
    ("SAO", "São Paulo", "nacional", 1100),
    ("RIO", "Rio de Janeiro", "nacional", 1100),
    ("BSB", "Brasília", "nacional", 950),
    ("BHZ", "Belo Horizonte", "nacional", 1050),
    ("SSA", "Salvador", "nacional", 700),
    ("REC", "Recife", "nacional", 600),
    ("NAT", "Natal", "nacional", 600),
    ("JPA", "João Pessoa", "nacional", 650),
    ("MCZ", "Maceió", "nacional", 750),
    ("AJU", "Aracaju", "nacional", 800),
    ("SLZ", "São Luís", "nacional", 650),
    ("THE", "Teresina", "nacional", 600),
    ("BEL", "Belém", "nacional", 800),
    ("MAO", "Manaus", "nacional", 1100),
    ("POA", "Porto Alegre", "nacional", 1300),
    ("CWB", "Curitiba", "nacional", 1250),
    ("FLN", "Florianópolis", "nacional", 1300),
    ("VIX", "Vitória", "nacional", 1050),
    ("GYN", "Goiânia", "nacional", 1050),
    ("IGU", "Foz do Iguaçu", "nacional", 1400),
    ("FEN", "Fernando de Noronha", "nacional", 1600),
    ("JDO", "Juazeiro do Norte", "nacional", 550),
    # Internacionais
    ("LIS", "Lisboa", "internacional", 3800),
    ("OPO", "Porto", "internacional", 4000),
    ("MAD", "Madri", "internacional", 4200),
    ("PAR", "Paris", "internacional", 4500),
    ("ROM", "Roma", "internacional", 4600),
    ("LON", "Londres", "internacional", 4700),
    ("AMS", "Amsterdã", "internacional", 4500),
    ("MIA", "Miami", "internacional", 3600),
    ("ORL", "Orlando", "internacional", 3700),
    ("NYC", "Nova York", "internacional", 4000),
    ("BUE", "Buenos Aires", "internacional", 2500),
    ("SCL", "Santiago", "internacional", 2700),
    ("LIM", "Lima", "internacional", 2800),
    ("BOG", "Bogotá", "internacional", 2800),
    ("CTG", "Cartagena", "internacional", 3000),
    ("PTY", "Cidade do Panamá", "internacional", 2900),
    ("CUN", "Cancún", "internacional", 3600),
    ("MVD", "Montevidéu", "internacional", 2700),
    ("SID", "Cabo Verde (Sal)", "internacional", 3200),
]

# Quantos meses à frente procurar
MESES_A_FRENTE = 7

# Desconto mínimo vs. preço típico da rota para virar alerta (0.22 = 22% mais barato)
DESCONTO_MINIMO = 0.22

# Preços com diferença de até X% são considerados "mesmo valor" ao agrupar datas
TOLERANCIA_MESMO_VALOR = 0.04

# Não repetir o mesmo alerta (rota + faixa de preço) antes de N dias
DIAS_SEM_REPETIR = 3

# Máximo de alertas novos por rodada (o motor roda a cada 3h)
MAX_ALERTAS_POR_RODADA = 4

# Quantos candidatos conferir no Google Voos por rodada
MAX_VERIFICACOES = 14

# Viagem: duração mínima e máxima (dias) de uma ida e volta
DURACAO_MIN = 3
DURACAO_MAX = 21

# ---- Varredura no Google Voos ----
ROTAS_POR_RODADA = 11      # rotas por rodada (rodízio: cada rota é varrida ~2x por dia)
DIAS_INICIO = 7            # começa a procurar daqui a 7 dias
DIAS_FIM = 150             # até ~5 meses
PASSO_DIAS = 3             # testa uma data de ida a cada 3 dias
DURACAO_NACIONAL = 6       # dias de viagem (ida e volta) para nacionais
DURACAO_INTERNACIONAL = 10 # para internacionais
PAUSA_GOOGLE = 0.6         # segundos entre consultas
