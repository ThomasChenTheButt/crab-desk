export type Project = {
  id: string
  name: string
  progress: number
  note: string
  isShown: boolean
  // Folder names (the last part of a session's working folder) that count as this project.
  folders?: string[]
}

export type LiveSession = {
  id: string
  title: string
  folder: string
  link: string
  kind: 'working' | 'waiting'
  // The question a waiting session left for you.
  asks: string
  lastActivityAt: number
  // When you last wrote in it: a chat you closed only comes back after you write in it again.
  lastUserAt: number
  // You pinned it: it stays under Waiting, whatever it needs, until you unpin or close it.
  isPinned?: boolean
  // How far a working chat is through its task list, with a rough time left (scripts/progress.py).
  progress?: { done: number; total: number; step: string; minutesLeft: number | null }
}

// Active Claude Code minutes: today so far, and your own daily average over the last 15 days.
export type Usage = {
  today: number
  average: number
  // Minutes on every day on record, by local date (YYYY-MM-DD).
  daily: Record<string, number>
  // Today's minutes in each hour, midnight first.
  hours: number[]
  // What a usual recent day had done by this time of day, and its minutes per hour.
  usualByNow: number
  usualHours: number[]
}

declare module 'claude-code' {
  interface PluginState {
    'crab-desk': {
      projects: Project[]
      openNotes: string[]
      isManaging: boolean
      expanded: string[]
      live: LiveSession[]
      liveError: string
      // Chats you closed in the panel, by id, with when you closed them.
      dismissed: Record<string, number>
      // Chats you pinned under Waiting, by id, with when you pinned them.
      pinned: Record<string, number>
      now: number
      usage: Usage | null
      // Whether the usage view under the Today tile is open.
      isUsageOpen: boolean
      // The usage view's range, the bar under the pointer, and whether its bars rise in on the next draw.
      usageRange: 'D' | 'W' | 'M' | '6M' | 'Y'
      usagePick: number | null
      usageRise: boolean
      // Which place the Working and Waiting scenes show.
      scene: 'studio' | 'ocean' | 'camp'
      // Crabs on their way across the picture: which chat, where to, since when, and its place before.
      trips: { id: string; to: 'working' | 'waiting'; at: number; fromIndex: number }[]
      // Which count tile is the open tab: everything, every live chat, or one group.
      tab: 'projects' | 'chats' | 'working' | 'waiting'
      // Reduce Motion is on (the Motion setting, or macOS's own): every drawing holds still.
      calm: boolean
    }
  }
}
