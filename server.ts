import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS inputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_count INTEGER,
    memory_usage INTEGER,
    parallelism INTEGER,
    operation_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    input_id INTEGER,
    architecture TEXT,
    execution_time REAL,
    cpi REAL,
    speedup REAL,
    FOREIGN KEY(input_id) REFERENCES inputs(id)
  );
`);

// Migration: Add code_content if missing
try {
  db.exec("ALTER TABLE inputs ADD COLUMN code_content TEXT");
} catch (e) {
  // Column already exists or table doesn't exist yet
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 10000;

  app.use(express.json());

  // --- Code Analysis Engine ---
  function analyzeProgramCharacteristics(code: string) {
    const lines = code.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('//'));
    const lineCount = lines.length;

    // Detection patterns
    const arithmeticPatterns = /\b(add|sub|mul|div|sin|cos|sqrt|pow|\+|\-|\*|\/)\b/gi;
    const memoryPatterns = /\b(malloc|free|new|delete|pointer|\[|\]|memcpy|memmove|load|store|buffer|array|list|map|set)\b/gi;
    const controlPatterns = /\b(if|else|switch|case|goto|jmp|branch|return|break|continue)\b/gi;
    const loopPatterns = /\b(for|while|foreach|do|loop)\b/gi;

    const arithmeticHits = (code.match(arithmeticPatterns) || []).length;
    const memoryHits = (code.match(memoryPatterns) || []).length;
    const controlHits = (code.match(controlPatterns) || []).length;
    const loopHits = (code.match(loopPatterns) || []).length;

    // Heuristics
    let operation_type = 'Arithmetic';
    if (memoryHits > arithmeticHits && memoryHits > controlHits) operation_type = 'Memory';
    if (controlHits > arithmeticHits && controlHits > memoryHits) operation_type = 'Control';

    let parallelism = 1;
    if (loopHits > 0) parallelism = 32; // Medium
    if (loopHits > 2 || code.toLowerCase().includes('parallel') || code.toLowerCase().includes('omp')) parallelism = 128; // High

    const instruction_count = (lineCount * 1000) + (loopHits * 5000);
    const memory_usage = (memoryHits * 64) + 128;

    return {
      instruction_count,
      memory_usage,
      parallelism,
      operation_type,
      analysis: { arithmeticHits, memoryHits, controlHits, loopHits }
    };
  }

  // --- Simulation Logic ---
  function simulatePerformance(inputs: {
    instruction_count: number;
    memory_usage: number;
    parallelism: number;
    operation_type: string;
  }) {
    const { instruction_count, memory_usage, parallelism, operation_type } = inputs;
    const clock_speed_ghz = 3.5;
    
    // CPU: Good for Control and Sequential
    let cpu_cpi = 1.2;
    if (operation_type === 'Memory') cpu_cpi *= 1.4;
    const cpu_time = (instruction_count * cpu_cpi) / (clock_speed_ghz * Math.min(parallelism, 8));

    // GPU: Peak at High Parallelism
    let gpu_cpi = 8.5; 
    let gpu_eff = parallelism >= 128 ? 0.98 : (parallelism / 128);
    const gpu_time = (instruction_count * gpu_cpi) / (clock_speed_ghz * (parallelism * gpu_eff + 1));

    // RISC: Efficient cycles
    const risc_time = (instruction_count * 1.3 * 1.05) / (clock_speed_ghz * Math.min(parallelism, 4));

    // CISC: Complex code
    const cisc_time = (instruction_count * 0.75 * 3.2) / (clock_speed_ghz * Math.min(parallelism, 4));

    const metrics = {
      CPU: { execution_time: cpu_time, cpi: cpu_cpi },
      GPU: { execution_time: gpu_time, cpi: gpu_cpi },
      RISC: { execution_time: risc_time, cpi: 1.05 },
      CISC: { execution_time: cisc_time, cpi: 3.2 }
    };

    let best_arch = "CPU";
    let min_time = Infinity;
    Object.entries(metrics).forEach(([arch, data]) => {
      if (data.execution_time < min_time) {
        min_time = data.execution_time;
        best_arch = arch;
      }
    });

    const resultMetrics: any = {};
    Object.entries(metrics).forEach(([arch, data]) => {
      resultMetrics[arch] = {
        ...data,
        speedup: cpu_time / data.execution_time
      };
    });

    return { best_architecture: best_arch, metrics: resultMetrics };
  }

  // API Routes
  app.post("/api/analyze", (req, res) => {
    try {
      const { code, memory_usage, parallelism, instruction_count, operation_type: manualType } = req.body;
      
      let finalParams;
      let analysisSummary = null;

      if (code) {
        const analyzed = analyzeProgramCharacteristics(code);
        analysisSummary = analyzed.analysis;
        finalParams = {
           instruction_count: analyzed.instruction_count,
           memory_usage: analyzed.memory_usage,
           parallelism: analyzed.parallelism,
           operation_type: analyzed.operation_type
        };
      } else {
        finalParams = {
          instruction_count: Number(instruction_count),
          memory_usage: Number(memory_usage),
          parallelism: Number(parallelism),
          operation_type: manualType
        };
      }
      
      const simulationResults = simulatePerformance(finalParams);

      const stmtInput = db.prepare("INSERT INTO inputs (code_content, instruction_count, memory_usage, parallelism, operation_type) VALUES (?, ?, ?, ?, ?)");
      const inputRes = stmtInput.run(code || null, finalParams.instruction_count, finalParams.memory_usage, finalParams.parallelism, finalParams.operation_type);
      const inputId = inputRes.lastInsertRowid;

      const stmtResult = db.prepare("INSERT INTO results (input_id, architecture, execution_time, cpi, speedup) VALUES (?, ?, ?, ?, ?)");
      Object.entries(simulationResults.metrics).forEach(([arch, data]: [string, any]) => {
        stmtResult.run(inputId, arch, data.execution_time, data.cpi, data.speedup);
      });

      res.json({
        ...simulationResults,
        detected_characteristics: finalParams,
        analysis_summary: analysisSummary
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
