/** ตั้งค่า proxy บน Vercel — ไม่เกี่ยวกับรัน gateway บน VM */

export function isGatewayProxyConfigured(): boolean {
  const url = process.env.KTIS_AI_GATEWAY_URL?.trim();
  return Boolean(url);
}

export function getGatewayProxyConfig() {
  return {
    url: process.env.KTIS_AI_GATEWAY_URL?.trim() ?? "",
    secret: process.env.KTIS_AI_GATEWAY_SECRET?.trim() ?? "",
  };
}
