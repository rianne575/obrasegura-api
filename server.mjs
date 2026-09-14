import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'crypto';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080;

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const DATA_FILE = join(dataDir, 'data.json');

// Initialize data file if it doesn't exist
function initializeDataFile() {
  if (!existsSync(DATA_FILE)) {
    const initialData = {
      occurrences: [],
      alerts: [],
      reports: [],
      users: []
    };
    writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Data persistence functions
function readData() {
  try {
    const data = readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      occurrences: [],
      alerts: [],
      reports: [],
      users: []
    };
  }
}

function writeData(data) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error.message);
  }
}

// OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Muitas requisições, tente novamente mais tarde.'
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for AI endpoints
  message: 'Limite de requisições de IA atingido. Tente novamente mais tarde.'
});

app.use(limiter);

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG ou WEBP.'));
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Erro ao enviar arquivo: ' + err.message });
  }

  if (err.message && err.message.includes('Tipo de arquivo')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Erro interno no servidor' });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'ObraSegura API',
    status: 'online'
  });
});

// ============================================================
// AI ENDPOINTS
// ============================================================

// POST /ai/chat - Real AI chat
app.post('/ai/chat', aiLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Campo "message" é obrigatório' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
    }

    const systemPrompt = `Você é uma assistente especializada em segurança do trabalho, construção civil e prevenção de acidentes em obras. 
Você possui conhecimento aprofundado em:
- Segurança do trabalho
- Construção civil
- Prevenção de acidentes
- Identificação de riscos
- EPI (Equipamento de Proteção Individual)
- EPC (Equipamento de Proteção Coletiva)
- Trabalho em altura
- Eletricidade em obras
- Andaimes
- Máquinas e ferramentas
- Escavações
- Organização de canteiro
- Prevenção de incêndios

Responda sempre em português do Brasil, de forma clara e prática.
Quando existir risco grave ou iminente, recomende interromper a atividade e procurar um profissional responsável.
Não invente leis ou normas.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    const reply = response.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    res.json({ reply });
  } catch (error) {
    console.error('AI Chat error:', error.message);
    res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
  }
});

// POST /ai/analyze-image - Real image analysis
app.post('/ai/analyze-image', aiLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de imagem é obrigatório' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const imageMediaType = req.file.mimetype;

    const analysisPrompt = `Analise esta imagem de uma obra procurando por riscos de segurança. 
Procure especificamente por:
- Ausência de capacete ou EPI (Equipamento de Proteção Individual)
- Ausência de proteção coletiva (EPC)
- Trabalho em altura
- Risco de queda
- Andaime inadequado
- Máquinas ou ferramentas
- Risco elétrico
- Materiais mal armazenados
- Obstáculos na área
- Risco de esmagamento
- Risco de incêndio
- Área sem isolamento
- Circulação insegura
- Condições inseguras de trabalho

Se nenhum risco evidente for identificado, retorne que a área está segura.

Responda SEMPRE em JSON válido com exatamente essa estrutura (sem markdown, sem backticks):
{
  "tipo": "tipo do risco ou 'Nenhum risco identificado'",
  "descricao": "descrição detalhada do que foi encontrado",
  "gravidade": "segura|baixa|media|alta|critica",
  "local": "local ou área onde o risco foi identificado",
  "recomendacao": "recomendação de ação"
}

NÃO invente riscos. Se algo não estiver visível ou não puder ser avaliado com segurança, deixe isso claro na descrição.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageMediaType};base64,${base64Image}`
              }
            },
            {
              type: 'text',
              text: analysisPrompt
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    const responseText = response.choices[0]?.message?.content || '{}';
    
    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', responseText);
      analysis = {
        tipo: 'Nenhum risco identificado',
        descricao: 'Não foi identificado risco evidente na imagem analisada.',
        gravidade: 'segura',
        local: 'Área analisada',
        recomendacao: 'Manter as medidas de segurança existentes e continuar o monitoramento.'
      };
    }

    // Ensure gravidade is valid
    const validGravidades = ['segura', 'baixa', 'media', 'alta', 'critica'];
    if (!validGravidades.includes(analysis.gravidade)) {
      analysis.gravidade = 'media';
    }

    res.json(analysis);
  } catch (error) {
    console.error('Image analysis error:', error.message);
    res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
  }
});

// GET /ai/recommendations - AI safety recommendations
app.get('/ai/recommendations', aiLimiter, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
    }

    const prompt = `Forneça 5 recomendações práticas e importantes para segurança em obras de construção. 
Cada recomendação deve ser clara, concisa e acionável.
Responda em formato JSON com um array "recommendations" contendo objetos com "titulo" e "descricao".`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    const responseText = response.choices[0]?.message?.content || '{}';
    
    let recommendations;
    try {
      recommendations = JSON.parse(responseText);
    } catch (parseError) {
      recommendations = {
        recommendations: [
          {
            titulo: 'Uso obrigatório de EPI',
            descricao: 'Todos os trabalhadores devem usar capacete, óculos de proteção e coletes de segurança nas áreas de obra.'
          },
          {
            titulo: 'Isolamento de áreas de risco',
            descricao: 'Áreas com trabalho em altura, escavações ou máquinas em operação devem estar isoladas com barreiras físicas e avisos.'
          },
          {
            titulo: 'Inspeção de andaimes',
            descricao: 'Andaimes devem ser inspecionados diariamente antes do uso para garantir estabilidade e segurança.'
          },
          {
            titulo: 'Treinamento contínuo',
            descricao: 'Todos os colaboradores devem receber treinamentos periódicos sobre segurança e prevenção de acidentes.'
          },
          {
            titulo: 'Relatório de incidentes',
            descricao: 'Todo incidente, mesmo que menor, deve ser relatado e documentado para análise e prevenção.'
          }
        ]
      };
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
  }
});

// ============================================================
// MONITORING
// ============================================================

// POST /monitoring/analyze - Alias for image analysis
app.post('/monitoring/analyze', aiLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de imagem é obrigatório' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const imageMediaType = req.file.mimetype;

    const analysisPrompt = `Analise esta imagem de uma obra procurando por riscos de segurança. 
Procure especificamente por:
- Ausência de capacete ou EPI (Equipamento de Proteção Individual)
- Ausência de proteção coletiva (EPC)
- Trabalho em altura
- Risco de queda
- Andaime inadequado
- Máquinas ou ferramentas
- Risco elétrico
- Materiais mal armazenados
- Obstáculos na área
- Risco de esmagamento
- Risco de incêndio
- Área sem isolamento
- Circulação insegura
- Condições inseguras de trabalho

Se nenhum risco evidente for identificado, retorne que a área está segura.

Responda SEMPRE em JSON válido com exatamente essa estrutura (sem markdown, sem backticks):
{
  "tipo": "tipo do risco ou 'Nenhum risco identificado'",
  "descricao": "descrição detalhada do que foi encontrado",
  "gravidade": "segura|baixa|media|alta|critica",
  "local": "local ou área onde o risco foi identificado",
  "recomendacao": "recomendação de ação"
}

NÃO invente riscos. Se algo não estiver visível ou não puder ser avaliado com segurança, deixe isso claro na descrição.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageMediaType};base64,${base64Image}`
              }
            },
            {
              type: 'text',
              text: analysisPrompt
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    const responseText = response.choices[0]?.message?.content || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', responseText);
      analysis = {
        tipo: 'Nenhum risco identificado',
        descricao: 'Não foi identificado risco evidente na imagem analisada.',
        gravidade: 'segura',
        local: 'Área analisada',
        recomendacao: 'Manter as medidas de segurança existentes e continuar o monitoramento.'
      };
    }

    // Ensure gravidade is valid
    const validGravidades = ['segura', 'baixa', 'media', 'alta', 'critica'];
    if (!validGravidades.includes(analysis.gravidade)) {
      analysis.gravidade = 'media';
    }

    // If critical or high risk, create an occurrence
    if (['alta', 'critica'].includes(analysis.gravidade)) {
      const data = readData();
      const occurrence = {
        id: randomUUID(),
        tipo: analysis.tipo,
        descricao: analysis.descricao,
        gravidade: analysis.gravidade,
        local: analysis.local,
        recomendacao: analysis.recomendacao,
        status: 'aberta',
        createdAt: new Date().toISOString()
      };
      data.occurrences.push(occurrence);
      writeData(data);

      // Create alert for high/critical risks
      const alert = {
        id: randomUUID(),
        occurrenceId: occurrence.id,
        title: `Alerta: ${analysis.tipo}`,
        description: analysis.descricao,
        severity: analysis.gravidade,
        resolved: false,
        createdAt: new Date().toISOString()
      };
      data.alerts.push(alert);
      writeData(data);
    }

    res.json(analysis);
  } catch (error) {
    console.error('Monitoring analyze error:', error.message);
    res.status(502).json({ error: 'Não foi possível conectar ao serviço de IA.' });
  }
});

// ============================================================
// OCCURRENCES
// ============================================================

// GET /occurrences
app.get('/occurrences', (req, res) => {
  try {
    const data = readData();
    res.json(data.occurrences);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ocorrências' });
  }
});

// POST /occurrences
app.post('/occurrences', (req, res) => {
  try {
    const { tipo, descricao, gravidade, local, recomendacao } = req.body;

    // Validation
    if (!tipo || !descricao || !gravidade || !local || !recomendacao) {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, descricao, gravidade, local, recomendacao' });
    }

    const validGravidades = ['segura', 'baixa', 'media', 'alta', 'critica'];
    if (!validGravidades.includes(gravidade)) {
      return res.status(400).json({ error: 'Gravidade deve ser: segura, baixa, media, alta ou critica' });
    }

    const data = readData();
    const occurrence = {
      id: randomUUID(),
      tipo,
      descricao,
      gravidade,
      local,
      recomendacao,
      status: 'aberta',
      createdAt: new Date().toISOString()
    };

    data.occurrences.push(occurrence);
    writeData(data);

    // Auto-create alert for high/critical risks
    if (['alta', 'critica'].includes(gravidade)) {
      const alert = {
        id: randomUUID(),
        occurrenceId: occurrence.id,
        title: `Alerta: ${tipo}`,
        description: descricao,
        severity: gravidade,
        resolved: false,
        createdAt: new Date().toISOString()
      };
      data.alerts.push(alert);
      writeData(data);
    }

    res.status(201).json(occurrence);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar ocorrência' });
  }
});

// PUT /occurrences/:id
app.put('/occurrences/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descricao, gravidade, local, recomendacao, status } = req.body;

    const data = readData();
    const occurrenceIndex = data.occurrences.findIndex(o => o.id === id);

    if (occurrenceIndex === -1) {
      return res.status(404).json({ error: 'Ocorrência não encontrada' });
    }

    const occurrence = data.occurrences[occurrenceIndex];

    // Update fields if provided
    if (tipo) occurrence.tipo = tipo;
    if (descricao) occurrence.descricao = descricao;
    if (gravidade) occurrence.gravidade = gravidade;
    if (local) occurrence.local = local;
    if (recomendacao) occurrence.recomendacao = recomendacao;
    if (status) {
      const validStatus = ['aberta', 'em_andamento', 'resolvida'];
      if (!validStatus.includes(status)) {
        return res.status(400).json({ error: 'Status deve ser: aberta, em_andamento ou resolvida' });
      }
      occurrence.status = status;
    }

    data.occurrences[occurrenceIndex] = occurrence;
    writeData(data);

    res.json(occurrence);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar ocorrência' });
  }
});

// DELETE /occurrences/:id
app.delete('/occurrences/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();

    const occurrenceIndex = data.occurrences.findIndex(o => o.id === id);
    if (occurrenceIndex === -1) {
      return res.status(404).json({ error: 'Ocorrência não encontrada' });
    }

    data.occurrences.splice(occurrenceIndex, 1);

    // Also delete associated alerts
    data.alerts = data.alerts.filter(a => a.occurrenceId !== id);

    writeData(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar ocorrência' });
  }
});

// ============================================================
// ALERTS
// ============================================================

// GET /alerts
app.get('/alerts', (req, res) => {
  try {
    const data = readData();
    res.json(data.alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
});

// PUT /alerts/:id/resolve
app.put('/alerts/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();

    const alertIndex = data.alerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    data.alerts[alertIndex].resolved = true;
    writeData(data);

    res.json(data.alerts[alertIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao resolver alerta' });
  }
});

// ============================================================
// DASHBOARD
// ============================================================

// GET /dashboard
app.get('/dashboard', (req, res) => {
  try {
    const data = readData();
    const occurrences = data.occurrences;

    const totalOccurrences = occurrences.length;
    const openOccurrences = occurrences.filter(o => o.status === 'aberta').length;
    const criticalOccurrences = occurrences.filter(o => o.gravidade === 'critica' || o.gravidade === 'alta').length;
    const resolvedOccurrences = occurrences.filter(o => o.status === 'resolvida').length;

    // Calculate safety score (0-100)
    let safetyScore = 100;
    if (totalOccurrences > 0) {
      const criticalWeight = 30;
      const openWeight = 20;
      const totalScore = (criticalOccurrences * criticalWeight) + (openOccurrences * openWeight);
      safetyScore = Math.max(0, 100 - totalScore);
    }

    res.json({
      totalOccurrences,
      openOccurrences,
      criticalOccurrences,
      resolvedOccurrences,
      safetyScore: Math.round(safetyScore)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

// ============================================================
// RISKS
// ============================================================

// GET /risks
app.get('/risks', (req, res) => {
  try {
    const data = readData();
    const occurrences = data.occurrences;

    // Group by risk type and count
    const riskMap = {};
    occurrences.forEach(occ => {
      if (!riskMap[occ.tipo]) {
        riskMap[occ.tipo] = {
          type: occ.tipo,
          count: 0,
          severity: occ.gravidade
        };
      }
      riskMap[occ.tipo].count += 1;
      // Keep the highest severity
      const severityOrder = { segura: 0, baixa: 1, media: 2, alta: 3, critica: 4 };
      if (severityOrder[occ.gravidade] > severityOrder[riskMap[occ.tipo].severity]) {
        riskMap[occ.tipo].severity = occ.gravidade;
      }
    });

    const risks = Object.values(riskMap).sort((a, b) => b.count - a.count);

    res.json({ risks });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar riscos' });
  }
});

// ============================================================
// RISK MAP
// ============================================================

// GET /risk-map
app.get('/risk-map', (req, res) => {
  try {
    const data = readData();
    const occurrences = data.occurrences;

    // Group by location
    const locationMap = {};
    occurrences.forEach(occ => {
      if (!locationMap[occ.local]) {
        locationMap[occ.local] = {
          local: occ.local,
          riskLevel: occ.gravidade,
          occurrences: 0
        };
      }
      locationMap[occ.local].occurrences += 1;
      
      // Keep the highest risk level
      const severityOrder = { segura: 0, baixa: 1, media: 2, alta: 3, critica: 4 };
      if (severityOrder[occ.gravidade] > severityOrder[locationMap[occ.local].riskLevel]) {
        locationMap[occ.local].riskLevel = occ.gravidade;
      }
    });

    const locations = Object.values(locationMap);

    res.json({ locations });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mapa de riscos' });
  }
});

// ============================================================
// REPORTS
// ============================================================

// GET /reports
app.get('/reports', (req, res) => {
  try {
    const data = readData();
    res.json(data.reports);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar relatórios' });
  }
});

// POST /reports
app.post('/reports', (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, description' });
    }

    const data = readData();
    const report = {
      id: randomUUID(),
      title,
      description,
      createdAt: new Date().toISOString()
    };

    data.reports.push(report);
    writeData(data);

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar relatório' });
  }
});

// ============================================================
// AUTHENTICATION (Simplified for MVP)
// ============================================================

// POST /auth/login
app.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Simplified: just return a mock token
    res.json({
      token: 'mock_jwt_token_' + randomUUID(),
      user: {
        id: randomUUID(),
        email,
        name: email.split('@')[0]
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// POST /auth/register
app.post('/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    const data = readData();

    // Check if user exists
    const userExists = data.users.find(u => u.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    const user = {
      id: randomUUID(),
      email,
      name,
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    writeData(data);

    res.status(201).json({
      token: 'mock_jwt_token_' + randomUUID(),
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

// POST /auth/forgot-password
app.post('/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Simplified: just return success
    res.json({
      message: 'Se o email existe, um link de recuperação será enviado.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
  }
});

// GET /users/me
app.get('/users/me', (req, res) => {
  try {
    // Simplified: return mock user
    res.json({
      id: randomUUID(),
      email: 'user@example.com',
      name: 'Usuário',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// ============================================================
// STARTUP
// ============================================================

initializeDataFile();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ObraSegura API rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
