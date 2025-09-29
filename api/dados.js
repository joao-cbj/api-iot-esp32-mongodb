import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Habilita CORS para todas as origens

// Schema MongoDB - apenas campos essenciais
const DadosSchema = new mongoose.Schema({
  temperatura: { type: Number, required: true },
  umidade: { type: Number, required: true },
  dispositivo: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Modelo global
let Dados;
if (!mongoose.models.Dados) {
  Dados = mongoose.model('Dados', DadosSchema);
} else {
  Dados = mongoose.models.Dados;
}

// Conexão MongoDB
async function conectarMongoDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI não está definida');
  await mongoose.connect(uri, { bufferCommands: false });
  console.log('MongoDB conectado com sucesso');
}

// Middleware de conexão
app.use(async (req, res, next) => {
  try {
    await conectarMongoDB();
    next();
  } catch (err) {
    console.error('Erro ao conectar MongoDB:', err.message);
    res.status(500).json({ success: false, error: 'Erro de conexão com MongoDB' });
  }
});

// GET - Buscar dados
app.get('/api/dados', async (req, res) => {
  try {
    const { limite = 50, dispositivo } = req.query;
    let filtros = {};
    if (dispositivo) filtros.dispositivo = dispositivo;

    const dados = await Dados.find(filtros)
      .sort({ timestamp: -1 })
      .limit(parseInt(limite))
      .lean();

    const total = await Dados.countDocuments(filtros);

    res.status(200).json({ success: true, total, dados });
  } catch (err) {
    console.error('Erro GET:', err.message);
    res.status(500).json({ success: false, error: 'Erro interno', message: err.message });
  }
});

// POST - Criar dados
app.post('/api/dados', async (req, res) => {
  try {
    const { temperatura, umidade, dispositivo } = req.body;

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

    res.status(201).json({
      success: true,
      message: 'Dados salvos com sucesso',
      id: dadosSalvos._id
    });
  } catch (err) {
    console.error('Erro POST:', err.message);
    res.status(500).json({ success: false, error: 'Erro interno', message: err.message });
  }
});

// Render usa porta dinâmica
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
