declare module 'claude-code' {
  interface PluginState {
    pixpal: { scene: string; seq: number; rest: string; demo: boolean; debug: boolean; smart: boolean; source: string; agents: number; lang: 'pl' | 'en'; bubbles: boolean; theme: 'auto' | 'dark' | 'light'; systemTheme: 'dark' | 'light'; skin: 'robot' | 'cat' | 'claude' | 'owl' | 'ghost'; language: string; phrasebook: Record<string, string> | null; pending: { user: string; answer: string; isAborted: boolean; durationMs: number; at: number } | null }
  }
}
