declare module 'claude-code' {
  interface PluginState {
    pixpal: { scene: string; seq: number; rest: string; demo: boolean; debug: boolean; smart: boolean; source: string; agents: number; workflowAgents: Record<string, number>; lang: 'pl' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'uk' | 'ru' | 'ja' | 'zh' | 'ko'; bubbles: boolean; visible: boolean; theme: 'auto' | 'dark' | 'light'; systemTheme: 'dark' | 'light'; skin: 'robot' | 'cat' | 'claude' | 'owl' | 'ghost'; language: string; phrasebook: Record<string, string> | null; picker: { setting: string; options: Array<{ value: string; label: string }>; current: string; other?: string } | null; pickerTop: number; pickerFocus: string | null; pending: { user: string; answer: string; isAborted: boolean; durationMs: number; at: number } | null }
  }
}
