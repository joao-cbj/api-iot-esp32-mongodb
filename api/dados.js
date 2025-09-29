import mongoose from 'mongoose';

// Schema MongoDB - apenas campos essenciais
const DadosSchema = new mongoose.Schema({
  temperatura: { type: Number, required: true },
  umidade: { type: Number, required: true },
  dispositivo: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Variável global para manter a conexão
let cachedDb = null;
let Dados = null;

async function conectarMongoDB() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI não está definida');
    }

    const conn = await mongoose.connect(uri, {
      bufferCommands: false,
    });

    cachedDb = conn;
    
    // Criar modelo se não existir
    if (!Dados) {
      Dados = mongoose.models.Dados || mongoose.model('Dados', DadosSchema);
    }

    console.log('MongoDB conectado com sucesso');
    return cachedDb;
  } catch (error) {
    console.error('Erro ao conectar MongoDB:', error.message);
    throw error;
  }
}

export default async function handler(req, res) {
  // Configurar CORS manualmente
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Conectar ao MongoDB
    await conectarMongoDB();

    const { method } = req;

    // GET - Buscar dados
    if (method === 'GET') {
      const { limite = 50, dispositivo } = req.query;

      let filtros = {};
      if (dispositivo) {
        filtros.dispositivo = dispositivo;
      }

      const dados = await Dados
        .find(filtros)
        .sort({ timestamp: -1 })
        .limit(parseInt(limite))
        .lean();

      const total = await Dados.countDocuments(filtros);

      return res.status(200).json({
        success: true,
        total,
        dados
      });
    }

    // POST - Criar dados
    if (method === 'POST') {
      const { temperatura, umidade, dispositivo } = req.body;

      // Validação
      if (!temperatura || !umidade || !dispositivo) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: temperatura, umidade, dispositivo'
        });
      }

      const novosDados = new Dados({
        temperatura: parseFloat(temperatura),
        umidade: parseFloat(umidade),
        dispositivo: String(dispositivo)
      });

      const dadosSalvos = await novosDados.save();

      return res.status(201).json({
        success: true,
        message: 'Dados salvos com sucesso',
        id: dadosSalvos._id
      });
    }

    // Método não permitido
    return res.status(405).json({
      success: false,
      error: `Método ${method} não permitido`
    });

  } catch (error) {
    console.error('Erro na função:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
