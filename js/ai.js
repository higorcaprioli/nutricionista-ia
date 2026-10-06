// Análise nutricional por foto/texto usando a API do Claude direto do navegador.
// A chave fica apenas no aparelho (localStorage) e é enviada só para api.anthropic.com.
import Anthropic from "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk/+esm";
import * as store from "./store.js";

const SYSTEM = `Você é um nutricionista esportivo brasileiro. Estime a composição nutricional de refeições a partir de fotos ou descrições.
Use porções e alimentos típicos do Brasil (TACO/IBGE como referência). Se houver objetos de referência na foto (talheres, prato, mão), use-os para estimar o tamanho das porções.
Seja realista: não subestime óleo, molhos, queijo e bebidas calóricas.
Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, no formato:
{"items":[{"name":"string","grams":number,"kcal":number,"p":number,"c":number,"f":number,"fiber":number}],
 "total":{"kcal":number,"p":number,"c":number,"f":number,"fiber":number},
 "confidence":"alta"|"média"|"baixa",
 "verdict":"ok"|"atenção"|"excesso",
 "comment":"1-2 frases em português sobre se a refeição cabe no restante do dia e uma dica prática"}
p = proteína (g), c = carboidrato (g), f = gordura (g), fiber = fibra (g).`;

function client() {
  const { apiKey } = store.get().settings;
  if (!apiKey) throw new Error("Configure sua chave da API do Claude em Ajustes (⚙️).");
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

// Reduz a foto para no máximo 1024 px (menos tokens, envio mais rápido).
export async function resizeImage(file, max = 1024, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function analyzeMeal({ imageDataUrl, text, context }) {
  const content = [];
  if (imageDataUrl) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageDataUrl.split(",")[1] } });
  }
  content.push({
    type: "text",
    text:
      (text ? `Descrição do usuário: ${text}\n` : "Analise o prato da foto.\n") +
      `Contexto do dia: restam ${context.kcalLeft} kcal de ${context.budget} kcal; ` +
      `proteína consumida ${context.p} g de ${context.pTarget} g; carboidrato ${context.c} g de no máx. ${context.cMax} g; ` +
      `gordura ${context.f} g (mínimo ${context.fMin} g).`,
  });

  const response = await client().beta.messages.create({
    model: store.get().settings.model || "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("A análise foi recusada. Tente outra foto ou descreva a refeição.");
  const txt = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const match = txt.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Não consegui interpretar a resposta. Tente novamente.");
  const data = JSON.parse(match[0]);
  data.items = (data.items || []).map((i) => ({
    name: i.name, grams: Math.round(+i.grams || 0), kcal: Math.round(+i.kcal || 0),
    p: Math.round(+i.p || 0), c: Math.round(+i.c || 0), f: Math.round(+i.f || 0), fiber: Math.round(+i.fiber || 0),
  }));
  return data;
}
