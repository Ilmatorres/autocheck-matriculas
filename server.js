const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./database.db");

// ========== CRIAR TABELAS ==========
db.serialize(() => {
  // Clientes
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    nif TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Viaturas
  db.run(`CREATE TABLE IF NOT EXISTS viaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL UNIQUE,
    marca TEXT,
    modelo TEXT,
    ano INTEGER,
    cor TEXT,
    km INTEGER DEFAULT 0,
    cliente_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )`);

  // Manutencoes
  db.run(`CREATE TABLE IF NOT EXISTS manutencoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viatura_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT,
    km_atual INTEGER,
    km_proxima INTEGER,
    data_servico DATE DEFAULT CURRENT_DATE,
    data_proxima DATE,
    valor REAL DEFAULT 0,
    estado TEXT DEFAULT 'concluido',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (viatura_id) REFERENCES viaturas(id)
  )`);

  // Faturas
  db.run(`CREATE TABLE IF NOT EXISTS faturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    viatura_id INTEGER NOT NULL,
    manutencao_id INTEGER,
    valor REAL NOT NULL,
    descricao TEXT,
    pago INTEGER DEFAULT 0,
    data_fatura DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (viatura_id) REFERENCES viaturas(id),
    FOREIGN KEY (manutencao_id) REFERENCES manutencoes(id)
  )`);

  // Dados de exemplo
  db.get("SELECT COUNT(*) as count FROM clientes", (err, row) => {
    if (row && row.count === 0) {
      // Clientes
      db.run("INSERT INTO clientes (nome, telefone, email, nif) VALUES ('Carlos Silva', '+351 912 345 678', 'carlos@email.com', '123456789')");
      db.run("INSERT INTO clientes (nome, telefone, email, nif) VALUES ('Ana Santos', '+351 923 456 789', 'ana@email.com', '987654321')");
      db.run("INSERT INTO clientes (nome, telefone, email, nif) VALUES ('Miguel Costa', '+351 934 567 890', 'miguel@email.com', '456789123')");

      // Viaturas
      db.run("INSERT INTO viaturas (matricula, marca, modelo, ano, cor, km, cliente_id) VALUES ('AA-12-BB', 'BMW', 'Serie 3', 2020, 'Preto', 45000, 1)");
      db.run("INSERT INTO viaturas (matricula, marca, modelo, ano, cor, km, cliente_id) VALUES ('CC-34-DD', 'Volkswagen', 'Golf', 2019, 'Branco', 62000, 2)");
      db.run("INSERT INTO viaturas (matricula, marca, modelo, ano, cor, km, cliente_id) VALUES ('EE-56-FF', 'Mercedes', 'Classe A', 2021, 'Cinza', 28000, 3)");
      db.run("INSERT INTO viaturas (matricula, marca, modelo, ano, cor, km, cliente_id) VALUES ('GG-78-HH', 'Renault', 'Clio', 2018, 'Vermelho', 89000, 1)");

      // Manutencoes
      db.run("INSERT INTO manutencoes (viatura_id, tipo, descricao, km_atual, km_proxima, data_servico, data_proxima, valor) VALUES (1, 'Revisao', 'Mudanca de oleo e filtros', 40000, 50000, '2025-11-15', '2026-05-15', 120.00)");
      db.run("INSERT INTO manutencoes (viatura_id, tipo, descricao, km_atual, km_proxima, data_servico, data_proxima, valor) VALUES (1, 'Travoes', 'Substituicao pastilhas dianteiras', 42000, 70000, '2026-01-10', '2027-01-10', 280.00)");
      db.run("INSERT INTO manutencoes (viatura_id, tipo, descricao, km_atual, km_proxima, data_servico, data_proxima, valor) VALUES (2, 'Revisao', 'Revisao geral 60.000km', 60000, 70000, '2026-02-20', '2026-08-20', 350.00)");
      db.run("INSERT INTO manutencoes (viatura_id, tipo, descricao, km_atual, km_proxima, data_servico, data_proxima, valor) VALUES (3, 'Pneus', 'Troca de 4 pneus', 25000, 65000, '2026-03-05', '2027-09-05', 480.00)");
      db.run("INSERT INTO manutencoes (viatura_id, tipo, descricao, km_atual, km_proxima, data_servico, data_proxima, valor, estado) VALUES (4, 'Revisao', 'Mudanca oleo e filtros', 85000, 95000, '2025-09-01', '2026-03-01', 95.00, 'pendente')");

      // Faturas
      db.run("INSERT INTO faturas (cliente_id, viatura_id, manutencao_id, valor, descricao, pago) VALUES (1, 1, 1, 120.00, 'Revisao - Oleo e filtros', 1)");
      db.run("INSERT INTO faturas (cliente_id, viatura_id, manutencao_id, valor, descricao, pago) VALUES (1, 1, 2, 280.00, 'Travoes dianteiros', 1)");
      db.run("INSERT INTO faturas (cliente_id, viatura_id, manutencao_id, valor, descricao, pago) VALUES (2, 2, 3, 350.00, 'Revisao 60.000km', 0)");
      db.run("INSERT INTO faturas (cliente_id, viatura_id, manutencao_id, valor, descricao, pago) VALUES (3, 3, 4, 480.00, 'Troca pneus', 1)");
    }
  });
});

// ========== API MATRICULA - BUSCAR POR MATRICULA ==========
app.get("/api/matricula/:matricula", (req, res) => {
  const mat = req.params.matricula.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const matFormatted = mat.replace(/(.{2})/g, '$1-').slice(0, -1);

  db.get(`SELECT v.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email, c.nif as cliente_nif
    FROM viaturas v LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE REPLACE(v.matricula, '-', '') = ?`, [mat], (err, viatura) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!viatura) return res.status(404).json({ found: false, matricula: matFormatted });

    // Buscar manutencoes
    db.all("SELECT * FROM manutencoes WHERE viatura_id = ? ORDER BY data_servico DESC", [viatura.id], (err, manutencoes) => {
      // Buscar faturas
      db.all("SELECT * FROM faturas WHERE viatura_id = ? ORDER BY data_fatura DESC", [viatura.id], (err, faturas) => {
        // Gerar alertas
        const alertas = [];
        const hoje = new Date();

        manutencoes.forEach(m => {
          if (m.data_proxima) {
            const proxima = new Date(m.data_proxima);
            const diffDias = Math.ceil((proxima - hoje) / (1000 * 60 * 60 * 24));
            if (diffDias < 0) {
              alertas.push({ tipo: 'urgente', msg: `${m.tipo} em atraso! Deveria ter sido feita ha ${Math.abs(diffDias)} dias.` });
            } else if (diffDias <= 30) {
              alertas.push({ tipo: 'atencao', msg: `${m.tipo} prevista para daqui a ${diffDias} dias.` });
            }
          }
          if (m.km_proxima && viatura.km >= m.km_proxima) {
            alertas.push({ tipo: 'urgente', msg: `${m.tipo}: KM atual (${viatura.km}) ja ultrapassou o previsto (${m.km_proxima} km).` });
          } else if (m.km_proxima && (m.km_proxima - viatura.km) <= 3000) {
            alertas.push({ tipo: 'atencao', msg: `${m.tipo}: Faltam apenas ${m.km_proxima - viatura.km} km para a proxima ${m.tipo.toLowerCase()}.` });
          }
        });

        const faturasPendentes = faturas.filter(f => !f.pago);
        if (faturasPendentes.length > 0) {
          const total = faturasPendentes.reduce((s, f) => s + f.valor, 0);
          alertas.push({ tipo: 'info', msg: `${faturasPendentes.length} fatura(s) pendente(s) no valor total de ${total.toFixed(2)} EUR.` });
        }

        res.json({
          found: true,
          viatura,
          manutencoes,
          faturas,
          alertas,
          insights: {
            total_gasto: faturas.reduce((s, f) => s + f.valor, 0),
            total_manutencoes: manutencoes.length,
            ultima_visita: manutencoes.length > 0 ? manutencoes[0].data_servico : null
          }
        });
      });
    });
  });
});

// ========== CRUD CLIENTES ==========
app.get("/api/clientes", (req, res) => {
  db.all("SELECT * FROM clientes ORDER BY nome", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/clientes", (req, res) => {
  const { nome, telefone, email, nif } = req.body;
  db.run("INSERT INTO clientes (nome, telefone, email, nif) VALUES (?, ?, ?, ?)",
    [nome, telefone, email, nif], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, nome, telefone, email, nif });
    });
});

// ========== CRUD VIATURAS ==========
app.get("/api/viaturas", (req, res) => {
  db.all(`SELECT v.*, c.nome as cliente_nome FROM viaturas v
    LEFT JOIN clientes c ON v.cliente_id = c.id ORDER BY v.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/viaturas", (req, res) => {
  const { matricula, marca, modelo, ano, cor, km, cliente_id } = req.body;
  db.run("INSERT INTO viaturas (matricula, marca, modelo, ano, cor, km, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [matricula, marca, modelo, ano, cor, km, cliente_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, matricula });
    });
});

// ========== CRUD MANUTENCOES ==========
app.post("/api/manutencoes", (req, res) => {
  const { viatura_id, tipo, descricao, km_atual, km_proxima, data_proxima, valor } = req.body;
  db.run(`INSERT INTO manutencoes (viatura_id, tipo, descricao, km_atual, km_proxima, data_proxima, valor)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [viatura_id, tipo, descricao, km_atual, km_proxima, data_proxima, valor], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// ========== DASHBOARD STATS ==========
app.get("/api/dashboard", (req, res) => {
  const stats = {};
  db.get("SELECT COUNT(*) as total FROM clientes", (err, r) => {
    stats.total_clientes = r ? r.total : 0;
    db.get("SELECT COUNT(*) as total FROM viaturas", (err, r) => {
      stats.total_viaturas = r ? r.total : 0;
      db.get("SELECT COUNT(*) as total FROM manutencoes", (err, r) => {
        stats.total_manutencoes = r ? r.total : 0;
        db.get("SELECT SUM(valor) as total FROM faturas WHERE pago = 1", (err, r) => {
          stats.receita_total = r ? r.total || 0 : 0;
          db.get("SELECT SUM(valor) as total FROM faturas WHERE pago = 0", (err, r) => {
            stats.pendente_total = r ? r.total || 0 : 0;
            db.all(`SELECT m.*, v.matricula, v.marca, v.modelo, c.nome as cliente_nome
              FROM manutencoes m
              JOIN viaturas v ON m.viatura_id = v.id
              LEFT JOIN clientes c ON v.cliente_id = c.id
              WHERE m.data_proxima <= date('now', '+30 days') OR m.estado = 'pendente'
              ORDER BY m.data_proxima ASC`, (err, alertas) => {
              stats.alertas_proximos = alertas || [];
              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// ========== NOTIFICACOES - ALERTAS AUTOMATICOS ==========
app.get("/api/notificacoes", (req, res) => {
  db.all(`
    SELECT m.*, v.matricula, v.marca, v.modelo, v.km,
           c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email, c.id as cliente_id
    FROM manutencoes m
    JOIN viaturas v ON m.viatura_id = v.id
    LEFT JOIN clientes c ON v.cliente_id = c.id
    ORDER BY m.data_proxima ASC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const hoje = new Date();
    const notificacoes = [];

    rows.forEach(m => {
      const alertas = [];

      // Check by date
      if (m.data_proxima) {
        const proxima = new Date(m.data_proxima);
        const diffDias = Math.ceil((proxima - hoje) / (1000 * 60 * 60 * 24));
        if (diffDias < 0) {
          alertas.push({ prioridade: 'urgente', msg: `${m.tipo} em ATRASO ha ${Math.abs(diffDias)} dias` });
        } else if (diffDias <= 7) {
          alertas.push({ prioridade: 'urgente', msg: `${m.tipo} em ${diffDias} dias` });
        } else if (diffDias <= 30) {
          alertas.push({ prioridade: 'atencao', msg: `${m.tipo} em ${diffDias} dias` });
        } else if (diffDias <= 60) {
          alertas.push({ prioridade: 'info', msg: `${m.tipo} em ${diffDias} dias` });
        }
      }

      // Check by km
      if (m.km_proxima && m.km) {
        const faltam = m.km_proxima - m.km;
        if (faltam <= 0) {
          alertas.push({ prioridade: 'urgente', msg: `KM ultrapassado para ${m.tipo}` });
        } else if (faltam <= 3000) {
          alertas.push({ prioridade: 'atencao', msg: `Faltam ${faltam} km para ${m.tipo}` });
        }
      }

      // Pending status
      if (m.estado === 'pendente') {
        alertas.push({ prioridade: 'urgente', msg: `${m.tipo} com estado pendente` });
      }

      if (alertas.length > 0) {
        notificacoes.push({
          manutencao: m,
          matricula: m.matricula,
          marca: m.marca,
          modelo: m.modelo,
          cliente_nome: m.cliente_nome,
          cliente_telefone: m.cliente_telefone,
          cliente_email: m.cliente_email,
          tipo: m.tipo,
          descricao: m.descricao,
          data_proxima: m.data_proxima,
          km_proxima: m.km_proxima,
          alertas
        });
      }
    });

    // Sort by priority
    const prioOrder = { urgente: 0, atencao: 1, info: 2 };
    notificacoes.sort((a, b) => {
      const pa = Math.min(...a.alertas.map(al => prioOrder[al.prioridade] || 3));
      const pb = Math.min(...b.alertas.map(al => prioOrder[al.prioridade] || 3));
      return pa - pb;
    });

    res.json(notificacoes);
  });
});

// Log de notificacoes enviadas
db.run(`CREATE TABLE IF NOT EXISTS notificacoes_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  viatura_matricula TEXT,
  tipo TEXT,
  canal TEXT,
  mensagem TEXT,
  enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.post("/api/notificacoes/log", (req, res) => {
  const { cliente_id, viatura_matricula, tipo, canal, mensagem } = req.body;
  db.run("INSERT INTO notificacoes_log (cliente_id, viatura_matricula, tipo, canal, mensagem) VALUES (?, ?, ?, ?, ?)",
    [cliente_id, viatura_matricula, tipo, canal, mensagem], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    });
});

app.get("/api/notificacoes/log", (req, res) => {
  db.all("SELECT * FROM notificacoes_log ORDER BY enviado_em DESC LIMIT 50", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Servidor
app.listen(3001, () => {
  console.log("Sistema de Matriculas rodando em http://localhost:3001");
});
