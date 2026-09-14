# ObraSegura API

A API REST oficial do backend do aplicativo **ObraSegura** — uma plataforma inteligente de segurança para obras de construção civil.

## 📋 Descrição

ObraSegura API é um backend Node.js/Express que fornece recursos avançados de:

- 🤖 **Conversa com Inteligência Artificial** — Chat especializado em segurança do trabalho
- 📸 **Análise de Imagens em Tempo Real** — Detecta riscos de segurança via IA
- ⚠️ **Identificação de Riscos** — Classifica gravidade de riscos
- 📊 **Dashboard de Segurança** — Dados em tempo real
- 📋 **Gerenciamento de Ocorrências** — CRUD completo
- 🚨 **Sistema de Alertas** — Alertas automáticos para riscos críticos
- 🗺️ **Mapa de Riscos** — Visualização geográfica de riscos
- 📈 **Relatórios e Recomendações** — Análise e sugestões de segurança

## 🛠️ Tecnologias

- **Node.js 20+** — Runtime JavaScript
- **Express** — Framework web
- **OpenAI SDK** — Inteligência artificial
- **Multer** — Upload de imagens
- **CORS** — Compartilhamento de recursos
- **dotenv** — Variáveis de ambiente
- **express-rate-limit** — Limitação de requisições

## 📦 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/rianne575/obrasegura-api.git
cd obrasegura-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da OpenAI:

```
PORT=8080
OPENAI_API_KEY=sk-... (sua chave aqui)
OPENAI_MODEL=gpt-4
OPENAI_VISION_MODEL=gpt-4-vision-preview
CORS_ORIGIN=*
```

**⚠️ IMPORTANTE:** Nunca coloque a chave da OpenAI diretamente no código ou no repositório. Use apenas variáveis de ambiente.

## 🚀 Execução

### Modo produção

```bash
npm start
```

### Modo desenvolvimento (com reload automático)

```bash
npm run dev
```

O servidor iniciará em `http://localhost:8080` (ou a porta definida em `PORT`).

## 🏥 Health Check

Verifique se a API está online:

```bash
GET http://localhost:8080/health
```

Resposta esperada:

```json
{
  "ok": true,
  "service": "ObraSegura API",
  "status": "online"
}
```

## 📚 Endpoints

### 🤖 Inteligência Artificial

#### Chat com IA

```
POST /ai/chat
```

Envie uma mensagem para a IA especializada em segurança.

**Corpo da requisição:**

```json
{
  "message": "Quais são os principais riscos em uma obra?"
}
```

**Resposta:**

```json
{
  "reply": "Resposta detalhada da IA sobre segurança..."
}
```

#### Análise de Imagem

```
POST /ai/analyze-image
```

Envie uma imagem para análise de riscos de segurança.

**Tipo:** `multipart/form-data`

**Campo:** `image` (arquivo)

**Formatos aceitos:** JPEG, PNG, WEBP

**Limite:** 10 MB

**Resposta:**

```json
{
  "tipo": "Ausência de capacete",
  "descricao": "Trabalhador sem capacete de proteção identificado.",
  "gravidade": "alta",
  "local": "Setor A",
  "recomendacao": "Interromper atividade e equipar imediatamente."
}
```

**Níveis de gravidade:**
- `segura` — Sem riscos
- `baixa` — Risco mínimo
- `media` — Risco moderado
- `alta` — Risco significativo
- `critica` — Risco iminente

#### Monitoramento

```
POST /monitoring/analyze
```

Mesmo endpoint de análise de imagem, para monitoramento contínuo.

**Tipo:** `multipart/form-data`

**Campo:** `image` (arquivo)

#### Recomendações de IA

```
GET /ai/recommendations
```

Obtém recomendações de segurança geradas pela IA.

**Resposta:**

```json
{
  "recommendations": [
    {
      "titulo": "Uso obrigatório de EPI",
      "descricao": "Todos os trabalhadores devem usar capacete..."
    }
  ]
}
```

### 📋 Ocorrências

#### Listar ocorrências

```
GET /occurrences
```

#### Criar ocorrência

```
POST /occurrences
```

**Corpo:**

```json
{
  "tipo": "Trabalho em altura",
  "descricao": "Trabalhador em altura sem proteção",
  "gravidade": "critica",
  "local": "Setor A - Andaime 3",
  "recomendacao": "Interromper imediatamente e procurar profissional"
}
```

#### Atualizar ocorrência

```
PUT /occurrences/:id
```

**Corpo:**

```json
{
  "status": "em_andamento",
  "descricao": "Situação atualizada..."
}
```

**Status válidos:** `aberta`, `em_andamento`, `resolvida`

#### Deletar ocorrência

```
DELETE /occurrences/:id
```

### 🚨 Alertas

#### Listar alertas

```
GET /alerts
```

#### Resolver alerta

```
PUT /alerts/:id/resolve
```

Marca um alerta como resolvido.

### 📊 Dashboard

#### Obter dados do dashboard

```
GET /dashboard
```

**Resposta:**

```json
{
  "totalOccurrences": 5,
  "openOccurrences": 2,
  "criticalOccurrences": 1,
  "resolvedOccurrences": 2,
  "safetyScore": 75
}
```

### 🗺️ Riscos

#### Listar riscos identificados

```
GET /risks
```

**Resposta:**

```json
{
  "risks": [
    {
      "type": "Trabalho em altura",
      "count": 3,
      "severity": "alta"
    }
  ]
}
```

#### Mapa de riscos

```
GET /risk-map
```

**Resposta:**

```json
{
  "locations": [
    {
      "local": "Setor A",
      "riskLevel": "alta",
      "occurrences": 3
    }
  ]
}
```

### 📈 Relatórios

#### Listar relatórios

```
GET /reports
```

#### Criar relatório

```
POST /reports
```

**Corpo:**

```json
{
  "title": "Relatório de Segurança - Setembro",
  "description": "Análise de riscos identificados no mês..."
}
```

### 🔐 Autenticação

#### Login

```
POST /auth/login
```

**Corpo:**

```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

#### Registro

```
POST /auth/register
```

**Corpo:**

```json
{
  "email": "novo@example.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

#### Recuperação de Senha

```
POST /auth/forgot-password
```

**Corpo:**

```json
{
  "email": "usuario@example.com"
}
```

#### Obter Usuário Atual

```
GET /users/me
```

## 💾 Armazenamento de Dados

Nesta versão, os dados são persistidos em `data/data.json`. Em produção, será necessário migrar para um banco de dados real (MongoDB, PostgreSQL, etc).

Estrutura do arquivo:

```json
{
  "occurrences": [],
  "alerts": [],
  "reports": [],
  "users": []
}
```

## 🔒 Segurança

- ✅ CORS configurado
- ✅ Rate limiting ativo (100 req/15min, 20 req/15min para IA)
- ✅ Validação de entrada
- ✅ Limite de upload (10 MB)
- ✅ Validação de MIME type
- ✅ Tratamento global de erros
- ✅ Nenhuma informação sensível exposta

## 🌐 Publicação no Render

### 1. Conecte seu repositório ao Render

- Acesse [render.com](https://render.com)
- Crie uma nova Web Service
- Selecione este repositório
- Configure como Node.js

### 2. Variáveis de Ambiente no Render

Na dashboard do Render, adicione:

- `OPENAI_API_KEY` — Sua chave da OpenAI
- `OPENAI_MODEL` — `gpt-4`
- `OPENAI_VISION_MODEL` — `gpt-4-vision-preview`
- `CORS_ORIGIN` — `*` ou o domínio do seu app Flutter
- `PORT` — `8080` (opcional, Render define automaticamente)

### 3. Deploy Automático

Cada push para `main` dispara o deploy automático.

## 📱 Integração com Flutter

O aplicativo Flutter ObraSegura usará todos esses endpoints. Exemplos:

### Análise de Foto da Câmera

```dart
final imageFile = File('/path/to/image.jpg');
final request = http.MultipartRequest(
  'POST',
  Uri.parse('https://api.example.com/ai/analyze-image'),
);
request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
final response = await request.send();
```

### Chat com IA

```dart
final response = await http.post(
  Uri.parse('https://api.example.com/ai/chat'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'message': 'Quais são os riscos em uma obra?'}),
);
```

### Obter Dashboard

```dart
final response = await http.get(
  Uri.parse('https://api.example.com/dashboard'),
);
```

## ⚠️ Notas Importantes

1. **Chave da OpenAI:** Nunca coloque a chave no Flutter ou em arquivos do repositório. Use apenas no servidor.

2. **Autenticação MVP:** A autenticação nesta versão é simplificada. Antes de colocar em produção, implemente:
   - JWT tokens reais
   - Hash de senhas (bcrypt)
   - Refresh tokens
   - Validação de email

3. **Banco de Dados:** Migre de `data.json` para um banco de dados real antes da produção.

4. **CORS:** Ajuste `CORS_ORIGIN` para o domínio específico do seu app em produção.

## 🐛 Troubleshooting

### Erro: "OPENAI_API_KEY não definida"

Certifique-se de que a chave está configurada em `.env` (desenvolvimento) ou nas variáveis do Render (produção).

### Erro: "Tipo de arquivo não permitido"

Apenas JPEG, PNG e WEBP são aceitos. Tamanho máximo: 10 MB.

### Erro: "Rate limit atingido"

Aguarde 15 minutos ou use outra chave/IP.

## 📞 Suporte

Para dúvidas ou issues, abra um issue no GitHub: [rianne575/obrasegura-api](https://github.com/rianne575/obrasegura-api/issues)

## 📄 Licença

Privado — Todos os direitos reservados.

---

**ObraSegura API v1.0.0** | Desenvolvido com ❤️ para segurança em obras.
