import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas Personalizadas
export const tempoChamadaGET = new Trend('tempo_chamada_GET', true);
export const taxaErro = new Rate('taxa_erro');

// Configurações do Teste
export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Ramp-up para 10 VUs em 1 minuto
    { duration: '3m', target: 300 },   // Ramp-up para 300 VUs em 3 minutos
    { duration: '1m', target: 0 }      // Ramp-down para 0 VUs em 1 minuto
  ],
  thresholds: {
    'tempo_chamada_GET': ['p(95)<5700'], // 95% das respostas abaixo de 5700ms
    'taxa_erro': ['rate<0.12']           // Menos de 12% de erros nas requisições
  }
};

// Função para Gerar Relatórios
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// Função Principal do Teste
export default function () {
  const baseUrl = 'https://catfact.ninja/fact'; // URL da API Cat Facts

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Realiza a requisição GET
  const res = http.get(`${baseUrl}`, params);

  // Registra a duração da chamada GET
  tempoChamadaGET.add(res.timings.duration);

  // Verifica se o status code indica sucesso (200-399)
  const sucesso = res.status >= 200 && res.status < 400;

  // Registra a taxa de erro
  taxaErro.add(!sucesso);

  // Verifica se o status code é 200
  check(res, {
    'GET - Status 200': () => res.status === 200
  });

  sleep(1); // Simula o tempo entre as requisições
}
