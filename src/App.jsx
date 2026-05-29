import { useState, useEffect, useRef } from "react";

const ANTHROPIC_API_URL = "/api/claude";

// ─── Prompts ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um especialista em leilões judiciais e extrajudiciais de imóveis no Brasil, com foco em São Paulo, Pernambuco,Paraíba, Goiás, Santa Catarina,Brasília e Paraná. Você tem profundo conhecimento em:

1. Avaliação de imóveis pelo método comparativo de mercado (sem necessidade de avaliador presencial)
2. Análise de viabilidade financeira para operações de "flip" (compra, reforma e revenda)
3. Legislação de leilões judiciais (Lei 9.514/97, CPC Art. 879-903) e extrajudiciais
4. Sites de leilão: Zuk, Sold, Leilão Vip, Caixa Econômica, Banco do Brasil, Santander, Itaú, Kronberg, Biasi, Lance Certo
5. Cálculo de custos ocultos: ITBI, registro, comissão leiloeiro (5%), laudêmio, débitos de IPTU/condomínio, reforma estimada
6. Análise de risco: ocupação, matrícula, ações judiciais, penhoras

Ao analisar um imóvel de leilão, siga este protocolo:

**ANÁLISE DE VALOR DE MERCADO** (método comparativo)
- Estime valores de imóveis similares na região usando seu treinamento
- Use como referência: ZAP Imóveis, OLX, Viva Real para a região informada
- Calcule o VMR (Valor de Mercado de Referência) com margem de +/-10%

**ANÁLISE DE VIABILIDADE DE FLIP**
- Lance máximo recomendado = VMR × 0,65 (máximo 65% do valor de mercado)
- Desconto mínimo viável = 30% abaixo do mercado
- Custos estimados: ITBI (3%), Registro (1%), Comissão leiloeiro (5%), Reforma (5-15% dependendo do estado), Holding (6-12 meses de IPTU+condomínio)
- Lucro estimado = VMR - Lance - Todos os custos
- ROI esperado e prazo estimado de revenda

**SCORE DE OPORTUNIDADE (0-100)**
- Desconto sobre mercado: até 40 pontos
- Liquidez da região: até 20 pontos  
- Risco jurídico estimado: até 20 pontos
- Potencial de valorização: até 20 pontos

**ALERTAS DE RISCO**
- Sinalizar: ocupação (aumenta custo em R$15-50k e 6-18 meses), débitos de condomínio (responsabilidade do arrematante), IPTU em atraso, fração ideal (mais difícil revender), imóvel em inventário, comarca distante

Sempre seja direto, use dados estimados com transparência, e termine com uma recomendação clara: ARREMATAR / AVALIAR MELHOR / EVITAR.

Responda em português brasileiro. Use emojis moderadamente para facilitar a leitura. Formate com seções claras.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => n != null && !isNaN(n)
  ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  : "—";
const fmtPct = (n) => n != null && !isNaN(n) ? `${Number(n).toFixed(1)}%` : "—";
const uid = () => Math.random().toString(36).slice(2, 8);

async function callClaude(messages, systemOverride, maxTokens = 1000) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system: systemOverride || SYSTEM_PROMPT,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map((b) => b.text || "").join("") || "";
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = {
  root: { minHeight: "100vh", background: "#080c18", color: "#e2ddd4", fontFamily: "'DM Mono','Courier New',monospace", position: "relative" },
  grid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,196,46,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,196,46,0.025) 1px,transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none", zIndex: 0 },
  wrap: { maxWidth: 1020, margin: "0 auto", padding: "0 20px 80px", position: "relative", zIndex: 1 },
  hdr: { borderBottom: "1px solid rgba(255,196,46,0.18)", padding: "26px 0 18px", marginBottom: 28 },
  badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,196,46,0.1)", border: "1px solid rgba(255,196,46,0.28)", borderRadius: 4, padding: "2px 10px", fontSize: 10, color: "#ffc42e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  h1: { fontSize: "clamp(20px,4vw,34px)", fontWeight: 700, color: "#fff", margin: 0, letterSpacing: -1, lineHeight: 1.1 },
  accent: { color: "#ffc42e" },
  sub: { color: "#6e6a60", fontSize: 12, marginTop: 6 },
  tabs: { display: "flex", gap: 2, marginBottom: 24, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 8, padding: 4, flexWrap: "wrap" },
  tab: (a) => ({ flex: 1, minWidth: 100, padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700, letterSpacing: 0.4, transition: "all .18s", background: a ? "#ffc42e" : "transparent", color: a ? "#080c18" : "#6e6a60", whiteSpace: "nowrap" }),
  card: { background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.065)", borderRadius: 10, padding: 20, marginBottom: 14 },
  cardHL: { background: "rgba(255,196,46,0.06)", border: "1px solid rgba(255,196,46,0.22)", borderRadius: 10, padding: 20, marginBottom: 14 },
  ctitle: { fontSize: 10, letterSpacing: 2.2, color: "#ffc42e", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
  lbl: { fontSize: 10, color: "#6e6a60", marginBottom: 5, letterSpacing: 1, textTransform: "uppercase" },
  inp: { width: "100%", background: "rgba(255,255,255,0.038)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "9px 11px", color: "#e2ddd4", fontFamily: "inherit", fontSize: 12, outline: "none", boxSizing: "border-box" },
  sel: { width: "100%", background: "#0d1220", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "9px 11px", color: "#e2ddd4", fontFamily: "inherit", fontSize: 12, outline: "none", boxSizing: "border-box" },
  ta: { width: "100%", background: "rgba(255,255,255,0.038)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "9px 11px", color: "#e2ddd4", fontFamily: "inherit", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 70 },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 },
  g4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 11 },
  btn: (v = "p") => ({ padding: v === "sm" ? "7px 14px" : "11px 22px", borderRadius: 7, border: v === "gh" ? "1px solid rgba(255,255,255,0.1)" : "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: v === "sm" ? 11 : 13, letterSpacing: 0.4, transition: "all .18s", ...(v === "p" ? { background: "#ffc42e", color: "#080c18" } : v === "ac" ? { background: "rgba(255,196,46,0.12)", color: "#ffc42e", border: "1px solid rgba(255,196,46,0.28)" } : v === "red" ? { background: "rgba(244,67,54,0.12)", color: "#f44336", border: "1px solid rgba(244,67,54,0.25)" } : { background: "transparent", color: "#6e6a60" }) }),
  pill: (t) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, ...(t === "g" ? { background: "rgba(76,175,80,0.14)", color: "#4caf50", border: "1px solid rgba(76,175,80,0.28)" } : t === "y" ? { background: "rgba(255,196,46,0.14)", color: "#ffc42e", border: "1px solid rgba(255,196,46,0.28)" } : { background: "rgba(244,67,54,0.14)", color: "#f44336", border: "1px solid rgba(244,67,54,0.28)" }) }),
  ring: (s) => ({ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${s >= 70 ? "#4caf50" : s >= 50 ? "#ffc42e" : "#f44336"}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", flexShrink: 0, background: `${s >= 70 ? "rgba(76,175,80,0.08)" : s >= 50 ? "rgba(255,196,46,0.08)" : "rgba(244,67,54,0.08)"}` }),
  divider: { height: 1, background: "rgba(255,255,255,0.05)", margin: "12px 0" },
  msgU: { alignSelf: "flex-end", background: "rgba(255,196,46,0.1)", border: "1px solid rgba(255,196,46,0.18)", borderRadius: "10px 10px 2px 10px", padding: "9px 13px", maxWidth: "84%", fontSize: 12, lineHeight: 1.6 },
  msgA: { alignSelf: "flex-start", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px 10px 10px 2px", padding: "11px 15px", maxWidth: "91%", fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap" },
};

// ─── CalcLance ────────────────────────────────────────────────────────────────
function CalcLance({ vmc, lanceAtual }) {
  const rows = [0.45, 0.50, 0.55, 0.60, 0.65, 0.70].map((pct) => {
    const lance = vmc * pct;
    const custos = lance * 0.09 + vmc * 0.06; // 9% entrada + 6% reforma/holding
    const lucro = vmc - lance - custos;
    const roi = (lucro / (lance + custos)) * 100;
    return { pct, lance, custos, lucro, roi };
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["%VMR", "Lance", "Custos", "Lucro Est.", "ROI", "Sinal"].map(h => (
              <th key={h} style={{ padding: "7px 9px", textAlign: "right", color: "#6e6a60", fontWeight: 600, letterSpacing: 1, fontSize: 9 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const ok = r.lucro > 0 && r.pct <= 0.65;
            const cur = lanceAtual && Math.abs(r.lance - lanceAtual) < vmc * 0.035;
            return (
              <tr key={r.pct} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: cur ? "rgba(255,196,46,0.06)" : "transparent" }}>
                <td style={{ padding: "8px 9px", textAlign: "right", color: "#ffc42e", fontWeight: 700 }}>{fmtPct(r.pct * 100)}</td>
                <td style={{ padding: "8px 9px", textAlign: "right", fontSize: 11 }}>{fmt(r.lance)}</td>
                <td style={{ padding: "8px 9px", textAlign: "right", color: "#f44336" }}>{fmt(r.custos)}</td>
                <td style={{ padding: "8px 9px", textAlign: "right", color: r.lucro > 0 ? "#4caf50" : "#f44336", fontWeight: 700 }}>{fmt(r.lucro)}</td>
                <td style={{ padding: "8px 9px", textAlign: "right", color: r.roi > 15 ? "#4caf50" : "#ffc42e" }}>{fmtPct(r.roi)}</td>
                <td style={{ padding: "8px 9px", textAlign: "right" }}>
                  <span style={S.pill(ok ? "g" : r.lucro > 0 ? "y" : "r")}>{ok ? "✓" : r.lucro > 0 ? "⚠" : "✗"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: "#6e6a60", marginTop: 10 }}>Custos: 9% sobre lance (ITBI+Registro+Comissão) + 6% VMR (reforma/holding estimada)</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA 1 — ANALISAR IMÓVEL
// ═══════════════════════════════════════════════════════════════════════════════
function AbaAnalise({ onAddToComparador }) {
  const [form, setForm] = useState({ tipo: "Apartamento", bairro: "", cidade: "São Paulo", area: "", quartos: "2", lance_inicial: "", valor_avaliacao: "", lote: "1ª praça", observacoes: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [vmc, setVmc] = useState(null);
  const [score, setScore] = useState(null);
  const [rec, setRec] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function analisar() {
    if (!form.bairro || !form.area || !form.lance_inicial) { alert("Preencha: bairro, área e lance inicial."); return; }
    setLoading(true); setResult(null); setVmc(null); setScore(null); setRec(null);
    try {
      const prompt = `Analise este imóvel em leilão para flip em ${form.cidade}:

TIPO: ${form.tipo} | LOCAL: ${form.bairro}, ${form.cidade} | ÁREA: ${form.area}m² | QUARTOS: ${form.quartos}
LANCE INICIAL: R$${form.lance_inicial} | AVALIAÇÃO EDITAL: ${form.valor_avaliacao ? "R$" + form.valor_avaliacao : "não informado"}
PRAÇA: ${form.lote} | OBS: ${form.observacoes || "nenhuma"}

Faça análise completa incluindo:
1. Estimativa de Valor de Mercado (VMR) com método comparativo
2. Viabilidade do flip com todos os custos detalhados
3. Lance máximo recomendado
4. Score de oportunidade 0-100
5. Riscos identificados
6. Recomendação: ARREMATAR / AVALIAR MELHOR / EVITAR

Ao final escreva EXATAMENTE (sem formatação extra):
VMC_ESTIMADO: [número inteiro]
SCORE: [número 0-100]
RECOMENDACAO: [ARREMATAR|AVALIAR MELHOR|EVITAR]`;

      const resp = await callClaude([{ role: "user", content: prompt }]);
      setResult(resp);
      const vmcM = resp.match(/VMC_ESTIMADO:\s*(\d+)/); if (vmcM) setVmc(Number(vmcM[1]));
      const scoreM = resp.match(/SCORE:\s*(\d+)/); if (scoreM) setScore(Number(scoreM[1]));
      const recM = resp.match(/RECOMENDACAO:\s*([A-ZÁÉÍÓÚ ]+)/); if (recM) setRec(recM[1].trim());
    } catch (e) { setResult("Erro ao conectar com a IA: " + e.message); }
    setLoading(false);
  }

  function addComparador() {
    if (!vmc) { alert("Analise o imóvel primeiro."); return; }
    const lance = Number(form.lance_inicial);
    const custos = lance * 0.09 + vmc * 0.06;
    const lucro = vmc - lance - custos;
    onAddToComparador({
      id: uid(), nome: `${form.tipo} – ${form.bairro}`, tipo: form.tipo,
      bairro: form.bairro, area: Number(form.area), quartos: form.quartos,
      lance, vmc, lucro, roi: (lucro / (lance + custos)) * 100,
      desconto: ((vmc - lance) / vmc) * 100, score: score || 0,
      rec: rec || "—", obs: form.observacoes, lote: form.lote,
    });
    alert("✅ Imóvel adicionado ao Comparador!");
  }

  const recColor = rec === "ARREMATAR" ? "#4caf50" : rec === "AVALIAR MELHOR" ? "#ffc42e" : rec ? "#f44336" : "#6e6a60";

  return (
    <div>
      <div style={S.card}>
        <div style={S.ctitle}>📋 Dados do Imóvel em Leilão</div>
        <div style={{ ...S.g3, marginBottom: 11 }}>
          <div><div style={S.lbl}>Tipo</div>
            <select style={S.sel} value={form.tipo} onChange={e => set("tipo", e.target.value)}>
              {["Apartamento","Casa","Sobrado","Kitnet/Studio","Cobertura"].map(t => <option key={t}>{t}</option>)}
            </select></div>
          <div><div style={S.lbl}>Área (m²)</div>
            <input style={S.inp} type="number" placeholder="72" value={form.area} onChange={e => set("area", e.target.value)} /></div>
          <div><div style={S.lbl}>Quartos</div>
            <select style={S.sel} value={form.quartos} onChange={e => set("quartos", e.target.value)}>
              {["1","2","3","4","5+"].map(q => <option key={q}>{q}</option>)}
            </select></div>
        </div>
        <div style={{ ...S.g2, marginBottom: 11 }}>
          <div><div style={S.lbl}>Bairro</div>
            <input style={S.inp} placeholder="Ex: Tatuapé, Mooca, Lapa..." value={form.bairro} onChange={e => set("bairro", e.target.value)} /></div>
          <div><div style={S.lbl}>Cidade</div>
            <input style={S.inp} value={form.cidade} onChange={e => set("cidade", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g3, marginBottom: 11 }}>
          <div><div style={S.lbl}>Lance Inicial (R$)</div>
            <input style={S.inp} type="number" placeholder="280000" value={form.lance_inicial} onChange={e => set("lance_inicial", e.target.value)} /></div>
          <div><div style={S.lbl}>Avaliação Edital (R$)</div>
            <input style={S.inp} type="number" placeholder="480000" value={form.valor_avaliacao} onChange={e => set("valor_avaliacao", e.target.value)} /></div>
          <div><div style={S.lbl}>Praça</div>
            <select style={S.sel} value={form.lote} onChange={e => set("lote", e.target.value)}>
              {["1ª praça","2ª praça","Extrajudicial"].map(t => <option key={t}>{t}</option>)}
            </select></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={S.lbl}>Observações (ocupação, débitos, estado...)</div>
          <textarea style={S.ta} placeholder="Ex: Imóvel ocupado, condomínio atrasado R$12k, precisa reforma..." value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
        </div>
        <button style={{ ...S.btn("p"), width: "100%", opacity: loading ? 0.7 : 1 }} onClick={analisar} disabled={loading}>
          {loading ? "⏳ Analisando com IA..." : "🔍 Analisar Oportunidade"}
        </button>
      </div>

      {loading && (
        <div style={{ ...S.card, textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🤖</div>
          <div style={{ color: "#ffc42e", marginBottom: 6 }}>Processando análise completa...</div>
          <div style={{ color: "#6e6a60", fontSize: 11 }}>Estimando VMR · Calculando custos · Avaliando riscos jurídicos</div>
        </div>
      )}

      {result && (
        <>
          {(score !== null || rec) && (
            <div style={{ ...S.cardHL, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {score !== null && (
                <div style={S.ring(score)}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: score >= 70 ? "#4caf50" : score >= 50 ? "#ffc42e" : "#f44336" }}>{score}</span>
                  <span style={{ fontSize: 8, color: "#6e6a60", letterSpacing: 1 }}>SCORE</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                {rec && <div style={{ fontSize: 16, fontWeight: 700, color: recColor, marginBottom: 4 }}>
                  {rec === "ARREMATAR" ? "✅" : rec === "AVALIAR MELHOR" ? "⚠️" : "❌"} {rec}
                </div>}
                {vmc && <div style={{ fontSize: 12, color: "#6e6a60" }}>VMR estimado: <span style={{ color: "#ffc42e", fontWeight: 700 }}>{fmt(vmc)}</span></div>}
              </div>
              {vmc && (
                <button style={S.btn("ac")} onClick={addComparador}>
                  + Adicionar ao Comparador
                </button>
              )}
            </div>
          )}

          <div style={S.card}>
            <div style={S.ctitle}>🎯 Análise Completa da IA</div>
            <div style={{ fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#e2ddd4" }}>
              {result.replace(/VMC_ESTIMADO:\s*\d+/, "").replace(/SCORE:\s*\d+/, "").replace(/RECOMENDACAO:\s*[A-ZÁÉÍÓÚ ]+/, "").trim()}
            </div>
          </div>

          {vmc && (
            <div style={S.card}>
              <div style={S.ctitle}>📊 Tabela de Viabilidade por Lance</div>
              <CalcLance vmc={vmc} lanceAtual={Number(form.lance_inicial)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA 2 — MONITORAMENTO DE LEILÕES
// ═══════════════════════════════════════════════════════════════════════════════
const SITES_LEILAO = [
  { id: "zuk", nome: "Zuk Leilões", url: "https://www.zuk.com.br", icone: "🏛️", tipo: "Judicial + Extrajudicial", destaque: "Maior volume em SP", cor: "#3b82f6" },
  { id: "sold", nome: "Sold Leilões", url: "https://www.sold.com.br", icone: "🔨", tipo: "Judicial + Extrajudicial", destaque: "Excelente curadoria", cor: "#8b5cf6" },
  { id: "leilao-vip", nome: "Leilão Vip", url: "https://www.leilaovip.com.br", icone: "⭐", tipo: "Extrajudicial", destaque: "Foco em alto padrão", cor: "#f59e0b" },
  { id: "caixa", nome: "CEF Imóveis", url: "https://www.caixa.gov.br/voce/habitacao/imoveis-a-venda", icone: "🏦", tipo: "Extrajudicial (banco)", destaque: "Descontos até 70%", cor: "#10b981" },
  { id: "bb", nome: "Banco do Brasil", url: "https://www.bb.com.br/site/leiloes", icone: "🏦", tipo: "Extrajudicial (banco)", destaque: "FGTS aceito", cor: "#facc15" },
  { id: "kronberg", nome: "Kronberg", url: "https://www.kronberg.com.br", icone: "⚖️", tipo: "Judicial", destaque: "Leilões judiciais TJ-SP", cor: "#ef4444" },
  { id: "biasi", nome: "Biasi", url: "https://www.biasi.com.br", icone: "📜", tipo: "Judicial", destaque: "Grande acervo judicial", cor: "#f97316" },
  { id: "lance-certo", nome: "Lance Certo", url: "https://www.lancecerto.com.br", icone: "🎯", tipo: "Judicial + Extrajudicial", destaque: "Filtros avançados", cor: "#06b6d4" },
  { id: "santander", nome: "Santander", url: "https://www.santander.com.br/leiloes", icone: "🏦", tipo: "Extrajudicial (banco)", destaque: "Imóveis retomados", cor: "#dc2626" },
  { id: "itau", nome: "Itaú", url: "https://www.itau.com.br/imoveis-leilao", icone: "🏦", tipo: "Extrajudicial (banco)", destaque: "Carteira própria", cor: "#ea580c" },
];

const CRITERIOS_DEFAULT = { tipos: ["Apartamento", "Casa"], bairros: "", areaMin: 50, areaMax: 200, lanceMax: 600000, descontoMin: 30, praça: "Ambas" };

function AbaMonitoramento() {
  const [criterios, setCriterios] = useState(CRITERIOS_DEFAULT);
  const [sitesSel, setSitesSel] = useState(["zuk", "sold", "leilao-vip", "caixa", "kronberg"]);
  const [alertas, setAlertas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [garimpado, setGarimpado] = useState(null);

  const setC = (k, v) => setCriterios(p => ({ ...p, [k]: v }));
  const toggleSite = (id) => setSitesSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleTipo = (t) => setC("tipos", criterios.tipos.includes(t) ? criterios.tipos.filter(x => x !== t) : [...criterios.tipos, t]);

  async function garimpar() {
    setBuscando(true); setGarimpado(null);
    const siteNomes = SITES_LEILAO.filter(s => sitesSel.includes(s.id)).map(s => s.nome).join(", ");
    try {
      const prompt = `Você é um garimpador especialista de leilões de imóveis em São Paulo.

CRITÉRIOS DO INVESTIDOR:
- Tipos de imóvel: ${criterios.tipos.join(", ")}
- Bairros de interesse: ${criterios.bairros || "toda São Paulo"}
- Área: ${criterios.areaMin}m² a ${criterios.areaMax}m²
- Lance máximo: ${fmt(criterios.lanceMax)}
- Desconto mínimo sobre mercado: ${criterios.descontoMin}%
- Praça preferida: ${criterios.praça}
- Sites a monitorar: ${siteNomes}

Com base no seu conhecimento sobre o mercado de leilões em São Paulo e nos critérios acima, gere 5 perfis de oportunidades REALISTAS que um investidor poderia encontrar nos sites indicados agora em 2025. Para cada uma:

1. Descreva o imóvel (tipo, bairro, área, quartos)
2. Lance estimado inicial e valor de mercado
3. Qual site provavelmente teria esse tipo de imóvel
4. Score de oportunidade (0-100)
5. Principais riscos
6. Recomendação

Ao final de cada imóvel escreva nesta linha:
IMOVEL_JSON: {"nome":"...","bairro":"...","tipo":"...","area":0,"lance":0,"vmc":0,"score":0,"site":"...","rec":"...","risco":"..."}

Seja realista e específico com bairros de SP.`;

      const resp = await callClaude([{ role: "user", content: prompt }], null, 1000);
      setGarimpado(resp);

      // Extrair alertas dos JSONs
      const matches = [...resp.matchAll(/IMOVEL_JSON:\s*({[^}]+})/g)];
      const novos = matches.map(m => {
        try { return { id: uid(), ...JSON.parse(m[1]) }; } catch { return null; }
      }).filter(Boolean);
      setAlertas(p => [...novos, ...p].slice(0, 20));
    } catch (e) { setGarimpado("Erro: " + e.message); }
    setBuscando(false);
  }

  return (
    <div>
      {/* Painel de critérios */}
      <div style={S.card}>
        <div style={S.ctitle}>🎯 Critérios de Garimpagem</div>
        <div style={{ marginBottom: 11 }}>
          <div style={S.lbl}>Tipos de Imóvel</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Apartamento","Casa","Sobrado","Kitnet/Studio","Cobertura"].map(t => (
              <button key={t} onClick={() => toggleTipo(t)} style={{ ...S.btn(criterios.tipos.includes(t) ? "ac" : "gh"), padding: "5px 12px", fontSize: 11 }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 11 }}>
          <div style={S.lbl}>Bairros de Interesse (separados por vírgula)</div>
          <input style={S.inp} placeholder="Ex: Tatuapé, Mooca, Vila Mariana, Lapa, Santo André..." value={criterios.bairros} onChange={e => setC("bairros", e.target.value)} />
        </div>
        <div style={{ ...S.g4, marginBottom: 11 }}>
          <div><div style={S.lbl}>Área Mín (m²)</div>
            <input style={S.inp} type="number" value={criterios.areaMin} onChange={e => setC("areaMin", e.target.value)} /></div>
          <div><div style={S.lbl}>Área Máx (m²)</div>
            <input style={S.inp} type="number" value={criterios.areaMax} onChange={e => setC("areaMax", e.target.value)} /></div>
          <div><div style={S.lbl}>Lance Máx (R$)</div>
            <input style={S.inp} type="number" value={criterios.lanceMax} onChange={e => setC("lanceMax", e.target.value)} /></div>
          <div><div style={S.lbl}>Desconto Mín (%)</div>
            <input style={S.inp} type="number" value={criterios.descontoMin} onChange={e => setC("descontoMin", e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={S.lbl}>Praça</div>
          <select style={{ ...S.sel, maxWidth: 220 }} value={criterios.praça} onChange={e => setC("praça", e.target.value)}>
            {["Ambas","1ª praça","2ª praça","Extrajudicial"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Sites */}
      <div style={S.card}>
        <div style={S.ctitle}>🌐 Sites a Monitorar</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 9 }}>
          {SITES_LEILAO.map(s => {
            const sel = sitesSel.includes(s.id);
            return (
              <div key={s.id} onClick={() => toggleSite(s.id)} style={{
                border: `1px solid ${sel ? s.cor + "55" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 8, padding: "10px 13px", cursor: "pointer",
                background: sel ? s.cor + "12" : "rgba(255,255,255,0.02)",
                transition: "all .15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{s.icone}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sel ? "#e2ddd4" : "#6e6a60" }}>{s.nome}</span>
                  {sel && <span style={{ marginLeft: "auto", color: "#4caf50", fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ fontSize: 9, color: "#6e6a60", lineHeight: 1.4 }}>{s.tipo}</div>
                <div style={{ fontSize: 9, color: sel ? s.cor : "#4a4740", marginTop: 3 }}>{s.destaque}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <button style={{ ...S.btn("p"), flex: 1, opacity: buscando ? 0.7 : 1 }} onClick={garimpar} disabled={buscando}>
            {buscando ? "⏳ Garimpando oportunidades..." : "💎 Garimpar Oportunidades Agora"}
          </button>
          <div style={{ fontSize: 10, color: "#6e6a60" }}>{sitesSel.length} sites selecionados</div>
        </div>
      </div>

      {buscando && (
        <div style={{ ...S.card, textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
          <div style={{ color: "#ffc42e", marginBottom: 8 }}>Garimpando nos {sitesSel.length} sites selecionados...</div>
          <div style={{ color: "#6e6a60", fontSize: 11 }}>Aplicando seus critérios · Filtrando oportunidades · Analisando viabilidade</div>
        </div>
      )}

      {/* Alertas salvos */}
      {alertas.length > 0 && (
        <div style={S.card}>
          <div style={{ ...S.ctitle, justifyContent: "space-between" }}>
            <span>🔔 Oportunidades Encontradas ({alertas.length})</span>
            <button style={{ ...S.btn("red"), padding: "4px 10px", fontSize: 10 }} onClick={() => setAlertas([])}>Limpar</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertas.map(a => {
              const desc = a.vmc > 0 ? ((a.vmc - a.lance) / a.vmc * 100) : 0;
              return (
                <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={S.ring(a.score)}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: a.score >= 70 ? "#4caf50" : a.score >= 50 ? "#ffc42e" : "#f44336" }}>{a.score}</span>
                      <span style={{ fontSize: 7, color: "#6e6a60" }}>SCORE</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, color: "#e2ddd4", marginBottom: 4 }}>{a.nome || `${a.tipo} – ${a.bairro}`}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: "#6e6a60" }}>📍 {a.bairro}</span>
                        <span style={{ fontSize: 10, color: "#6e6a60" }}>📐 {a.area}m²</span>
                        <span style={{ fontSize: 10, color: "#6e6a60" }}>🏛️ {a.site}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={S.pill(desc >= 35 ? "g" : desc >= 25 ? "y" : "r")}>▼{fmtPct(desc)} desconto</span>
                        <span style={S.pill(a.rec === "ARREMATAR" ? "g" : a.rec === "AVALIAR MELHOR" ? "y" : "r")}>{a.rec}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 110 }}>
                      <div style={{ fontSize: 10, color: "#6e6a60", marginBottom: 2 }}>Lance estimado</div>
                      <div style={{ fontWeight: 700, color: "#ffc42e", fontSize: 14 }}>{fmt(a.lance)}</div>
                      {a.vmc > 0 && <div style={{ fontSize: 10, color: "#6e6a60" }}>VMR: {fmt(a.vmc)}</div>}
                    </div>
                  </div>
                  {a.risco && <div style={{ marginTop: 8, fontSize: 10, color: "#f44336", background: "rgba(244,67,54,0.07)", borderRadius: 5, padding: "5px 9px" }}>⚠ {a.risco}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Texto bruto da IA */}
      {garimpado && (
        <div style={S.card}>
          <div style={S.ctitle}>📋 Análise Detalhada do Garimpo</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#e2ddd4" }}>
            {garimpado.replace(/IMOVEL_JSON:[^\n]+/g, "").trim()}
          </div>
        </div>
      )}

      {/* Links diretos */}
      <div style={S.card}>
        <div style={S.ctitle}>🔗 Acesso Direto aos Sites</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 8 }}>
          {SITES_LEILAO.filter(s => sitesSel.includes(s.id)).map(s => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 7, border: `1px solid ${s.cor}33`, background: s.cor + "0d", textDecoration: "none", color: "#e2ddd4", fontSize: 11, fontWeight: 600 }}>
              <span>{s.icone}</span>{s.nome}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA 3 — COMPARADOR DE IMÓVEIS
// ═══════════════════════════════════════════════════════════════════════════════
const IMOVEL_BLANK = { id: "", nome: "", tipo: "Apartamento", bairro: "", area: "", quartos: "2", lance: "", vmc: "", obs: "", lote: "2ª praça" };

function AbaComparador({ imoveis, setImoveis }) {
  const [analisando, setAnalisando] = useState(false);
  const [rankIA, setRankIA] = useState(null);
  const [form, setForm] = useState({ ...IMOVEL_BLANK });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function addManual() {
    if (!form.bairro || !form.lance || !form.vmc) { alert("Preencha: bairro, lance e VMR."); return; }
    const lance = Number(form.lance), vmc = Number(form.vmc);
    const custos = lance * 0.09 + vmc * 0.06;
    const lucro = vmc - lance - custos;
    const desc = ((vmc - lance) / vmc) * 100;
    setImoveis(p => [...p, {
      id: uid(), nome: form.nome || `${form.tipo} – ${form.bairro}`,
      tipo: form.tipo, bairro: form.bairro, area: Number(form.area), quartos: form.quartos,
      lance, vmc, lucro, roi: (lucro / (lance + custos)) * 100, desconto: desc, score: 0,
      rec: desc >= 35 && lucro > 0 ? "ARREMATAR" : desc >= 25 ? "AVALIAR MELHOR" : "EVITAR",
      obs: form.obs, lote: form.lote,
    }]);
    setForm({ ...IMOVEL_BLANK });
  }

  function remover(id) { setImoveis(p => p.filter(x => x.id !== id)); }

  async function rankear() {
    if (imoveis.length < 2) { alert("Adicione pelo menos 2 imóveis."); return; }
    setAnalisando(true); setRankIA(null);
    try {
      const lista = imoveis.map((im, i) => `
IMÓVEL ${i + 1}: ${im.nome}
- Localização: ${im.bairro} | Área: ${im.area}m² | Quartos: ${im.quartos} | Praça: ${im.lote}
- Lance: ${fmt(im.lance)} | VMR: ${fmt(im.vmc)} | Desconto: ${fmtPct(im.desconto)}
- Lucro estimado: ${fmt(im.lucro)} | ROI: ${fmtPct(im.roi)}
- Obs: ${im.obs || "nenhuma"}`).join("\n");

      const prompt = `Compare estes ${imoveis.length} imóveis em leilão para uma estratégia de flip em São Paulo e rankeie-os do melhor para o pior investimento:

${lista}

Para cada imóvel analise:
1. Qualidade do desconto vs. mercado local
2. Liquidez esperada (facilidade de revender)
3. Risco jurídico e operacional
4. Potencial de valorização na região
5. Prazo esperado de revenda

Depois apresente:
- RANKING FINAL com justificativa clara de cada posição
- VEREDICTO: qual comprar primeiro e por quê
- ALERTA: algum devo evitar absolutamente?
- ESTRATÉGIA: posso arrematar mais de um? Em qual ordem?

Seja direto e decisivo — como um investidor experiente aconselhando um amigo.`;

      const resp = await callClaude([{ role: "user", content: prompt }], null, 1000);
      setRankIA(resp);
    } catch (e) { setRankIA("Erro: " + e.message); }
    setAnalisando(false);
  }

  // Métricas para barras de comparação
  const maxLucro = Math.max(...imoveis.map(x => x.lucro || 0), 1);
  const maxScore = Math.max(...imoveis.map(x => x.score || 0), 1);

  const COLS = [
    { k: "desconto", label: "Desconto", fmt: fmtPct, color: (v) => v >= 35 ? "#4caf50" : v >= 25 ? "#ffc42e" : "#f44336" },
    { k: "lucro", label: "Lucro Est.", fmt: fmt, color: (v) => v > 0 ? "#4caf50" : "#f44336" },
    { k: "roi", label: "ROI", fmt: fmtPct, color: (v) => v >= 20 ? "#4caf50" : v >= 10 ? "#ffc42e" : "#f44336" },
    { k: "score", label: "Score IA", fmt: (v) => v || "—", color: (v) => v >= 70 ? "#4caf50" : v >= 50 ? "#ffc42e" : "#6e6a60" },
  ];

  return (
    <div>
      {/* Formulário manual */}
      <div style={S.card}>
        <div style={S.ctitle}>➕ Adicionar Imóvel Manualmente</div>
        <div style={{ ...S.g3, marginBottom: 11 }}>
          <div><div style={S.lbl}>Nome / Apelido</div>
            <input style={S.inp} placeholder="Ex: Apto Tatuapé 72m²" value={form.nome} onChange={e => setF("nome", e.target.value)} /></div>
          <div><div style={S.lbl}>Tipo</div>
            <select style={S.sel} value={form.tipo} onChange={e => setF("tipo", e.target.value)}>
              {["Apartamento","Casa","Sobrado","Kitnet/Studio","Cobertura"].map(t => <option key={t}>{t}</option>)}
            </select></div>
          <div><div style={S.lbl}>Bairro</div>
            <input style={S.inp} placeholder="Ex: Tatuapé" value={form.bairro} onChange={e => setF("bairro", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g4, marginBottom: 11 }}>
          <div><div style={S.lbl}>Área (m²)</div>
            <input style={S.inp} type="number" value={form.area} onChange={e => setF("area", e.target.value)} /></div>
          <div><div style={S.lbl}>Quartos</div>
            <select style={S.sel} value={form.quartos} onChange={e => setF("quartos", e.target.value)}>
              {["1","2","3","4","5+"].map(q => <option key={q}>{q}</option>)}
            </select></div>
          <div><div style={S.lbl}>Lance (R$)</div>
            <input style={S.inp} type="number" value={form.lance} onChange={e => setF("lance", e.target.value)} /></div>
          <div><div style={S.lbl}>VMR (R$)</div>
            <input style={S.inp} type="number" value={form.vmc} onChange={e => setF("vmc", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g2, marginBottom: 11 }}>
          <div><div style={S.lbl}>Praça</div>
            <select style={S.sel} value={form.lote} onChange={e => setF("lote", e.target.value)}>
              {["1ª praça","2ª praça","Extrajudicial"].map(p => <option key={p}>{p}</option>)}
            </select></div>
          <div><div style={S.lbl}>Observações</div>
            <input style={S.inp} placeholder="Riscos, estado, ocupação..." value={form.obs} onChange={e => setF("obs", e.target.value)} /></div>
        </div>
        <button style={{ ...S.btn("ac"), width: "100%" }} onClick={addManual}>+ Adicionar ao Comparador</button>
        <p style={{ fontSize: 10, color: "#6e6a60", marginTop: 8, textAlign: "center" }}>
          💡 Imóveis analisados na aba "Analisar Imóvel" são adicionados automaticamente aqui
        </p>
      </div>

      {imoveis.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ color: "#6e6a60", fontSize: 13 }}>Nenhum imóvel no comparador ainda.</div>
          <div style={{ color: "#4a4740", fontSize: 11, marginTop: 6 }}>Adicione manualmente acima ou analise imóveis na aba "Analisar Imóvel"</div>
        </div>
      ) : (
        <>
          {/* Cards dos imóveis */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 14 }}>
            {imoveis.map((im, idx) => {
              const recC = im.rec === "ARREMATAR" ? "#4caf50" : im.rec === "AVALIAR MELHOR" ? "#ffc42e" : "#f44336";
              return (
                <div key={im.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16, background: "rgba(255,255,255,0.025)", position: "relative" }}>
                  <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#6e6a60" }}>#{idx + 1}</span>
                    <button onClick={() => remover(im.id)} style={{ ...S.btn("red"), padding: "2px 7px", fontSize: 10 }}>✕</button>
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: 6, paddingRight: 60, color: "#e2ddd4", fontSize: 13 }}>{im.nome}</div>
                  <div style={{ fontSize: 10, color: "#6e6a60", marginBottom: 10 }}>📍 {im.bairro} · {im.area}m² · {im.quartos} qts · {im.lote}</div>

                  {COLS.map(col => (
                    <div key={col.k} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: "#6e6a60" }}>{col.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col.color(im[col.k]) }}>{col.fmt(im[col.k])}</span>
                      </div>
                      {col.k !== "score" && (
                        <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: col.color(im[col.k]), width: col.k === "lucro" ? `${Math.max(0, (im.lucro / maxLucro) * 100)}%` : col.k === "desconto" ? `${Math.min(100, im.desconto / 50 * 100)}%` : `${Math.min(100, im.roi / 30 * 100)}%`, transition: "width .4s" }} />
                        </div>
                      )}
                    </div>
                  ))}

                  <div style={S.divider} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#6e6a60" }}>Lance</div>
                      <div style={{ fontWeight: 700, color: "#ffc42e" }}>{fmt(im.lance)}</div>
                    </div>
                    <span style={{ ...S.pill(im.rec === "ARREMATAR" ? "g" : im.rec === "AVALIAR MELHOR" ? "y" : "r"), fontSize: 9 }}>{im.rec}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#6e6a60" }}>VMR</div>
                      <div style={{ fontWeight: 700, color: "#e2ddd4" }}>{fmt(im.vmc)}</div>
                    </div>
                  </div>
                  {im.obs && <div style={{ marginTop: 8, fontSize: 10, color: "#f44336", background: "rgba(244,67,54,0.07)", borderRadius: 5, padding: "4px 8px" }}>⚠ {im.obs}</div>}
                </div>
              );
            })}
          </div>

          {/* Tabela comparativa */}
          <div style={S.card}>
            <div style={S.ctitle}>📊 Tabela Comparativa</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["#","Imóvel","Bairro","Área","Lance","VMR","Desconto","Lucro Est.","ROI","Rec."].map(h => (
                      <th key={h} style={{ padding: "7px 9px", textAlign: h === "Imóvel" || h === "Bairro" ? "left" : "right", color: "#6e6a60", fontSize: 9, fontWeight: 600, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...imoveis].sort((a, b) => b.desconto - a.desconto).map((im, i) => (
                    <tr key={im.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i === 0 ? "rgba(76,175,80,0.05)" : "transparent" }}>
                      <td style={{ padding: "8px 9px", textAlign: "right", color: i === 0 ? "#ffc42e" : "#6e6a60", fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</td>
                      <td style={{ padding: "8px 9px", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#e2ddd4" }}>{im.nome}</td>
                      <td style={{ padding: "8px 9px", color: "#6e6a60" }}>{im.bairro}</td>
                      <td style={{ padding: "8px 9px", textAlign: "right" }}>{im.area}m²</td>
                      <td style={{ padding: "8px 9px", textAlign: "right", color: "#ffc42e", fontWeight: 700 }}>{fmt(im.lance)}</td>
                      <td style={{ padding: "8px 9px", textAlign: "right" }}>{fmt(im.vmc)}</td>
                      <td style={{ padding: "8px 9px", textAlign: "right", color: im.desconto >= 35 ? "#4caf50" : im.desconto >= 25 ? "#ffc42e" : "#f44336", fontWeight: 700 }}>{fmtPct(im.desconto)}</td>
                      <td style={{ padding: "8px 9px", textAlign: "right", color: im.lucro > 0 ? "#4caf50" : "#f44336", fontWeight: 700 }}>{fmt(im.lucro)}</td>
                      <td style={{ padding: "8px 9px", textAlign: "right", color: im.roi >= 20 ? "#4caf50" : im.roi >= 10 ? "#ffc42e" : "#f44336" }}>{fmtPct(im.roi)}</td>
                      <td style={{ padding: "8px 9px", textAlign: "right" }}>
                        <span style={S.pill(im.rec === "ARREMATAR" ? "g" : im.rec === "AVALIAR MELHOR" ? "y" : "r")}>{im.rec === "ARREMATAR" ? "✓" : im.rec === "AVALIAR MELHOR" ? "⚠" : "✗"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botão ranking IA */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <button style={{ ...S.btn("p"), flex: 1, opacity: analisando ? 0.7 : 1 }} onClick={rankear} disabled={analisando || imoveis.length < 2}>
              {analisando ? "⏳ Rankeando com IA..." : `🤖 Rankear com IA (${imoveis.length} imóveis)`}
            </button>
            <button style={S.btn("red")} onClick={() => { if (confirm("Limpar todos os imóveis?")) setImoveis([]); }}>🗑 Limpar</button>
          </div>

          {analisando && (
            <div style={{ ...S.card, textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⚖️</div>
              <div style={{ color: "#ffc42e", marginBottom: 6 }}>IA comparando todos os imóveis...</div>
              <div style={{ color: "#6e6a60", fontSize: 11 }}>Analisando liquidez · Riscos · ROI · Estratégia de aquisição</div>
            </div>
          )}

          {rankIA && (
            <div style={S.cardHL}>
              <div style={S.ctitle}>🏆 Ranking & Estratégia da IA</div>
              <div style={{ fontSize: 12, lineHeight: 1.85, whiteSpace: "pre-wrap", color: "#e2ddd4" }}>{rankIA}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA 4 — CHECKLIST DUE DILIGENCE
// ═══════════════════════════════════════════════════════════════════════════════
const CHECKLIST = [
  { cat: "📄 Documentação", items: ["Ler edital completo", "Verificar matrícula no cartório (e-Cartório SP)", "Checar ações judiciais no TJ-SP (e-SAJ)", "Verificar débitos de IPTU (Prefeitura SP)", "Checar débitos de condomínio (síndico)", "Confirmar prazo para pagamento do arremate", "Verificar se há ônus reais na matrícula"] },
  { cat: "🏠 Imóvel Físico", items: ["Visitar o imóvel (quando possível)", "Verificar se está ocupado", "Estimar custos de reforma", "Avaliar estado de conservação", "Verificar vagas de garagem na matrícula", "Checar área privativa vs. útil"] },
  { cat: "📍 Mercado", items: ["Pesquisar similares no ZAP/Viva Real/OLX", "Verificar tempo médio de venda no bairro", "Consultar valores de aluguel na região", "Analisar tendência de valorização", "Identificar concorrência no mercado"] },
  { cat: "💰 Financeiro", items: ["Calcular ITBI (3%)", "Calcular comissão do leiloeiro (5%)", "Estimar custos de cartório (1%)", "Provisionar reforma (mín. 5% VMR)", "Calcular holding (IPTU + condomínio × meses)", "Definir capital de giro disponível", "Calcular lucro líquido e ROI"] },
  { cat: "⚖️ Risco Jurídico", items: ["Verificar laudêmio (marinha/SPU)", "Confirmar se é fração ideal ou total", "Checar outros credores com prioridade", "Avaliar risco de evicção", "Verificar leilões anteriores frustrados", "Confirmar inexistência de usufruto"] },
];

function AbaChecklist() {
  const [ck, setCk] = useState({});
  const total = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const done = Object.values(ck).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const toggle = (id) => setCk(p => ({ ...p, [id]: !p[id] }));
  return (
    <div>
      <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div style={S.ring(pct)}>
          <span style={{ fontSize: 17, fontWeight: 700, color: pct >= 70 ? "#4caf50" : pct >= 50 ? "#ffc42e" : "#f44336" }}>{pct}%</span>
          <span style={{ fontSize: 7, color: "#6e6a60" }}>DONE</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>Due Diligence</div>
          <div style={{ color: "#6e6a60", fontSize: 11, marginBottom: 8 }}>{done} de {total} itens verificados</div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 3, maxWidth: 240 }}>
            <div style={{ height: "100%", background: pct >= 70 ? "#4caf50" : "#ffc42e", borderRadius: 3, width: `${pct}%`, transition: "width .3s" }} />
          </div>
        </div>
        <button style={S.btn("gh")} onClick={() => setCk({})}>Limpar</button>
      </div>
      {CHECKLIST.map(cat => (
        <div key={cat.cat} style={S.card}>
          <div style={S.ctitle}>{cat.cat}</div>
          {cat.items.map(item => {
            const id = `${cat.cat}-${item}`;
            const ok = ck[id];
            return (
              <div key={item} onClick={() => toggle(id)} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", alignItems: "flex-start" }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1, border: ok ? "none" : "1px solid rgba(255,255,255,0.18)", background: ok ? "#4caf50" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ok && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: ok ? "#4a4740" : "#e2ddd4", textDecoration: ok ? "line-through" : "none" }}>{item}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA 5 — CALCULADORA DE FLIP
// ═══════════════════════════════════════════════════════════════════════════════
function AbaCalculadora() {
  const [v, setV] = useState({ vmc: "", lance: "", comissao: 5, itbi: 3, registro: 1, reforma: "", holding: 8, condominio: "", iptu: "", outros: "", precoVenda: "", comissaoVenda: 6 });
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const n = (k) => Number(v[k]) || 0;
  const custoEntrada = n("lance") * ((n("comissao") + n("itbi") + n("registro")) / 100);
  const custoHolding = (n("condominio") + n("iptu")) * n("holding");
  const custoSaida = n("precoVenda") * (n("comissaoVenda") / 100);
  const totalCustos = custoEntrada + n("reforma") + custoHolding + custoSaida + n("outros");
  const investimento = n("lance") + totalCustos - custoSaida;
  const lucroLiquido = n("precoVenda") - n("lance") - totalCustos;
  const roi = investimento > 0 ? (lucroLiquido / investimento) * 100 : 0;
  const desconto = n("vmc") > 0 ? ((n("vmc") - n("lance")) / n("vmc")) * 100 : 0;
  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
      <span style={{ color: "#6e6a60" }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || "#e2ddd4" }}>{fmt(value)}</span>
    </div>
  );
  const viavel = desconto >= 30 && lucroLiquido > 0;
  return (
    <div>
      <div style={S.card}>
        <div style={S.ctitle}>💰 Dados da Operação de Flip</div>
        <div style={{ ...S.g2, marginBottom: 11 }}>
          <div><div style={S.lbl}>Valor de Mercado – VMR (R$)</div>
            <input style={S.inp} type="number" placeholder="500000" value={v.vmc} onChange={e => set("vmc", e.target.value)} /></div>
          <div><div style={S.lbl}>Lance / Arremate (R$)</div>
            <input style={S.inp} type="number" placeholder="280000" value={v.lance} onChange={e => set("lance", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g3, marginBottom: 11 }}>
          <div><div style={S.lbl}>Comissão Leiloeiro (%)</div>
            <input style={S.inp} type="number" value={v.comissao} onChange={e => set("comissao", e.target.value)} /></div>
          <div><div style={S.lbl}>ITBI (%)</div>
            <input style={S.inp} type="number" value={v.itbi} onChange={e => set("itbi", e.target.value)} /></div>
          <div><div style={S.lbl}>Registro (%)</div>
            <input style={S.inp} type="number" value={v.registro} onChange={e => set("registro", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g2, marginBottom: 11 }}>
          <div><div style={S.lbl}>Custo de Reforma (R$)</div>
            <input style={S.inp} type="number" placeholder="30000" value={v.reforma} onChange={e => set("reforma", e.target.value)} /></div>
          <div><div style={S.lbl}>Meses até Venda</div>
            <input style={S.inp} type="number" value={v.holding} onChange={e => set("holding", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g3, marginBottom: 11 }}>
          <div><div style={S.lbl}>Condomínio/mês (R$)</div>
            <input style={S.inp} type="number" placeholder="600" value={v.condominio} onChange={e => set("condominio", e.target.value)} /></div>
          <div><div style={S.lbl}>IPTU/mês (R$)</div>
            <input style={S.inp} type="number" placeholder="220" value={v.iptu} onChange={e => set("iptu", e.target.value)} /></div>
          <div><div style={S.lbl}>Outros (R$)</div>
            <input style={S.inp} type="number" placeholder="5000" value={v.outros} onChange={e => set("outros", e.target.value)} /></div>
        </div>
        <div style={{ ...S.g2 }}>
          <div><div style={S.lbl}>Preço de Venda Estimado (R$)</div>
            <input style={S.inp} type="number" placeholder="490000" value={v.precoVenda} onChange={e => set("precoVenda", e.target.value)} /></div>
          <div><div style={S.lbl}>Comissão Imobiliária (%)</div>
            <input style={S.inp} type="number" value={v.comissaoVenda} onChange={e => set("comissaoVenda", e.target.value)} /></div>
        </div>
      </div>
      {n("lance") > 0 && (
        <div style={S.card}>
          <div style={S.ctitle}>📊 Resultado</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            {[
              { l: "Desconto s/ Mercado", v: fmtPct(desconto), c: desconto >= 30 ? "#4caf50" : "#f44336" },
              { l: "Lucro Líquido", v: fmt(lucroLiquido), c: lucroLiquido > 0 ? "#4caf50" : "#f44336" },
              { l: "ROI", v: fmtPct(roi), c: roi >= 15 ? "#4caf50" : roi > 0 ? "#ffc42e" : "#f44336" },
            ].map(m => (
              <div key={m.l} style={{ flex: 1, minWidth: 110, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "11px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#6e6a60", marginBottom: 5, letterSpacing: 1 }}>{m.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.c }}>{m.v}</div>
              </div>
            ))}
          </div>
          <Row label="Lance" value={n("lance")} />
          <Row label="Custos de entrada (comissão + ITBI + reg.)" value={custoEntrada} color="#f44336" />
          <Row label="Reforma" value={n("reforma")} color="#f44336" />
          <Row label={`Holding (${n("holding")} meses)`} value={custoHolding} color="#f44336" />
          <Row label="Comissão de venda" value={custoSaida} color="#f44336" />
          <Row label="Outros" value={n("outros")} color="#f44336" />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 13 }}>
            <span style={{ color: "#6e6a60", fontWeight: 600 }}>Total de Custos</span>
            <span style={{ fontWeight: 700, color: "#f44336" }}>{fmt(totalCustos)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderTop: "2px solid rgba(255,196,46,0.25)", fontSize: 15 }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>LUCRO LÍQUIDO</span>
            <span style={{ fontWeight: 700, color: lucroLiquido > 0 ? "#4caf50" : "#f44336", fontSize: 19 }}>{fmt(lucroLiquido)}</span>
          </div>
          <div style={{ padding: "10px 13px", borderRadius: 7, background: viavel ? "rgba(76,175,80,0.09)" : "rgba(244,67,54,0.09)", border: `1px solid ${viavel ? "rgba(76,175,80,0.28)" : "rgba(244,67,54,0.28)"}`, marginTop: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: viavel ? "#4caf50" : "#f44336" }}>
              {viavel ? "✅ OPERAÇÃO VIÁVEL" : desconto < 30 ? "⚠️ DESCONTO INSUFICIENTE — mín. 30% abaixo do mercado" : "❌ OPERAÇÃO INVIÁVEL — prejuízo estimado"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA 6 — CONSULTORIA IA
// ═══════════════════════════════════════════════════════════════════════════════
function AbaConsultoria() {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Olá! Sou seu consultor especializado em leilões de imóveis em São Paulo. Pergunte sobre estratégias de lance, como interpretar editais, custos ocultos, riscos jurídicos, ou descreva um imóvel para análise rápida. Como posso ajudar?" }]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);
  async function send() {
    if (!inp.trim() || loading) return;
    const txt = inp.trim(); setInp("");
    const next = [...msgs, { role: "user", content: txt }];
    setMsgs(next); setLoading(true);
    try {
      const resp = await callClaude(next.map(m => ({ role: m.role, content: m.content })));
      setMsgs(p => [...p, { role: "assistant", content: resp }]);
    } catch { setMsgs(p => [...p, { role: "assistant", content: "Erro na conexão. Tente novamente." }]); }
    setLoading(false);
  }
  const SUGS = ["Como interpretar um edital judicial?", "Riscos em imóveis ocupados?", "Como calcular o lance máximo?", "Quais sites têm melhores leilões em SP?", "O que é laudêmio e quando ocorre?"];
  return (
    <div>
      <div style={S.card}>
        <div style={S.ctitle}>💬 Consultoria IA — Especialista em Leilões SP</div>
        <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 13, maxHeight: 480, overflowY: "auto", paddingRight: 4, marginBottom: 13 }}>
          {msgs.map((m, i) => <div key={i} style={m.role === "user" ? S.msgU : S.msgA}>{m.content}</div>)}
          {loading && <div style={{ ...S.msgA, color: "#ffc42e" }}>⏳ Analisando...</div>}
        </div>
        {msgs.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 11 }}>
            {SUGS.map(s => <button key={s} style={{ ...S.btn("ac"), padding: "5px 11px", fontSize: 10 }} onClick={() => setInp(s)}>{s}</button>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.inp, flex: 1 }} placeholder="Pergunte sobre leilões, editais, riscos, estratégias..." value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
          <button style={{ ...S.btn("p"), flexShrink: 0 }} onClick={send} disabled={loading}>Enviar</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState(0);
  const [imoveisComp, setImoveisComp] = useState([]);

  const TABS = [
    { label: "🔍 Analisar", title: "Analisar Imóvel" },
    { label: "📡 Monitorar", title: "Monitoramento" },
    { label: "⚖️ Comparar", title: "Comparador", badge: imoveisComp.length > 0 ? imoveisComp.length : null },
    { label: "✅ Diligência", title: "Due Diligence" },
    { label: "💰 Calcular", title: "Calculadora" },
    { label: "🤖 Consultor", title: "Consultoria IA" },
  ];

  return (
    <div style={S.root}>
      <div style={S.grid} />
      <div style={S.wrap}>
        <header style={S.hdr}>
          <div style={S.badge}>⚡ IA Powered · São Paulo · Flip</div>
          <h1 style={S.h1}>Leilão <span style={S.accent}>Inteligente</span> <span style={{ fontSize: "0.55em", color: "#4a4740", fontWeight: 400 }}>v2</span></h1>
          <p style={S.sub}>Garimpe · Monitore · Compare · Calcule · Decida com inteligência</p>
        </header>

        <div style={S.tabs}>
          {TABS.map((t, i) => (
            <button key={t.label} style={{ ...S.tab(tab === i), position: "relative" }} onClick={() => setTab(i)}>
              {t.label}
              {t.badge && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "#ffc42e", color: "#080c18", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 0 && <AbaAnalise onAddToComparador={(im) => { setImoveisComp(p => [...p, im]); }} />}
        {tab === 1 && <AbaMonitoramento />}
        {tab === 2 && <AbaComparador imoveis={imoveisComp} setImoveis={setImoveisComp} />}
        {tab === 3 && <AbaChecklist />}
        {tab === 4 && <AbaCalculadora />}
        {tab === 5 && <AbaConsultoria />}
      </div>
    </div>
  );
}
