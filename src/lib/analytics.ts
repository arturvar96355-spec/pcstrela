// Обёртка над Яндекс Метрикой: если счётчик не загружен или заблокирован — ничего не делает.
declare global {
  interface Window {
    ym?: (id: number, action: string, goal?: string) => void
    __ymId?: number
  }
}

export type Goal =
  | 'lead_callback'
  | 'lead_quote'
  | 'lead_calculation'
  | 'click_phone'
  | 'click_email'
  | 'click_telegram'
  | 'download_catalog'
  | 'download_document'
  | 'open_lead_dialog'
  | 'search_used'

export function track(goal: Goal): void {
  try {
    if (typeof window !== 'undefined' && window.ym && window.__ymId) window.ym(window.__ymId, 'reachGoal', goal)
  } catch {
    // аналитика не должна ломать сайт
  }
}
