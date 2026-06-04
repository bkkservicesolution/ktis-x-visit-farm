/** หยุด RAG embed ชั่วคราวขณะแชท — ให้ qwen ได้ GPU เต็มที่เหมือน `ollama run` */
let chatInFlight = 0;

export function beginGatewayChat(): void {
  chatInFlight++;
}

export function endGatewayChat(): void {
  chatInFlight = Math.max(0, chatInFlight - 1);
}

export async function waitUntilNoGatewayChat(): Promise<void> {
  while (chatInFlight > 0) {
    await new Promise((r) => setTimeout(r, 150));
  }
}
