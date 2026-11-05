import type { ClientModule, JsonValue } from 'claude-code'

type Props = {
  message: { [key: string]: JsonValue }
  // Split the area into this many equal columns and add the one under the pointer as `index`.
  slots?: number
  // Where the columns start and end, as fractions of the area's width (a chart's plot area).
  plot?: [number, number]
  // Report `index` while the pointer moves over the area (null when it leaves), not only on click.
  scrub?: boolean
  // Draw these lines as the area itself (a chat row), so the whole drawing answers the pointer.
  // How many text rows tall the area is. The laid-out size can come back as one row over a
  // picture, which left only a tile's top strip answering the pointer.
  rows?: number
  row?: { mark: string; markColor: string; title: string; line: string; bar?: string; isBlinking?: boolean; isPinned?: boolean }
  // Posted instead of `message` when a pinned row's pin is clicked: pulling the pin out.
  unpin?: { [key: string]: JsonValue }
}
type State = { isPressed: boolean; isHovered: boolean; index: number | null; isDim?: boolean; isOverPin?: boolean; wasPinned?: boolean; isFlashing?: boolean }

// The pin sits in a pinned row's first columns, where the mark is otherwise.
const PIN_COLS = 3

// An invisible layer over something drawn as a picture (a chat row, a tile, a chart). It tints on
// hover, darkens the moment the pointer goes down, and posts `message` to the hooks module when
// the click lands, so the whole area answers like a button. With `slots` it also says which part
// of the area was hit; with `scrub` it follows the pointer, as Health's charts do.
const Hit: ClientModule<Props, State> = (props, surface) => {
  const { Box } = surface.elements
  const state = surface.state ?? { isPressed: false, isHovered: false, index: null }
  const isFirstDraw = !surface.state

  const indexAt = (x: number) => {
    if (!props.slots) return null
    const width = surface.columns || 1
    const [start, end] = props.plot ?? [0, 1]
    const at = (x / width - start) / (end - start)
    return Math.max(0, Math.min(props.slots - 1, Math.floor(at * props.slots)))
  }

  if (!surface.state) {
    surface.onPointer(e => {
      const now = surface.state ?? state
      const x = e.fine?.x ?? e.x + 0.5
      if (e.type === 'leave') {
        surface.setState({ isPressed: false, isHovered: false, index: null })
        if (props.scrub) surface.post({ ...props.message, index: null })
        return
      }
      if (e.type === 'enter') {
        surface.setState({ ...now, isHovered: true })
        return
      }
      if (e.type === 'move' && props.row) {
        const isOverPin = Boolean(props.row.isPinned) && e.x < PIN_COLS
        if (isOverPin !== Boolean(now.isOverPin)) surface.setState({ ...now, isOverPin })
        return
      }
      if (e.type === 'move' && props.scrub) {
        const index = indexAt(x)
        if (index !== now.index) {
          surface.setState({ ...now, index })
          surface.post({ ...props.message, index })
        }
        return
      }
      if (e.type === 'down' && e.button === 'left') {
        surface.setState({ ...now, isPressed: true })
        return
      }
      if (e.type === 'up' && e.button === 'left') {
        surface.setState({ ...now, isPressed: false })
        // Released outside the area cancels, as a button does.
        const isLaidOut = surface.columns > 0 && surface.rows > 0
        const isInside = !isLaidOut || (e.x >= 0 && e.y >= 0 && e.x < surface.columns && e.y < Math.max(surface.rows, props.rows ?? 0))
        if (!isInside) return
        if (props.row?.isPinned && props.unpin && e.x < PIN_COLS) surface.post(props.unpin)
        else surface.post(props.slots ? { ...props.message, index: indexAt(x) } : props.message)
      }
    })
    // A working chat's mark blinks, as the drawn dot used to pulse. Every row keeps the clock, since
    // a chat can start working after its row is drawn; only a working one shows it.
    if (props.row)
      surface.every(700, () => {
        const now = surface.state ?? state
        surface.setState({ ...now, isDim: !now.isDim, isFlashing: false })
      })
    surface.setState({ ...state, wasPinned: Boolean(props.row?.isPinned) })
  }
  // The moment a pin goes in, the row flashes once, as a note does when it's pressed onto a board.
  if (props.row && !isFirstDraw && Boolean(props.row.isPinned) !== Boolean(state.wasPinned))
    surface.setState({ ...state, wasPinned: Boolean(props.row.isPinned), isFlashing: Boolean(props.row.isPinned) })

  // A chart shows its own highlight, so it takes no tint.
  const tint = props.scrub
    ? undefined
    : state.isPressed
      ? 'rgba(255,255,255,0.10)'
      : state.isHovered
        ? 'rgba(255,255,255,0.04)'
        : undefined

  if (props.row) {
    const { Text } = surface.elements
    const { mark, markColor, title, line, isPinned } = props.row
    // A pinned row is a note pinned to the board: a red pin in its corner, no background of its own.
    const paper = state.isFlashing ? 'rgba(217,119,87,0.30)' : undefined
    return (
      <Box flexDirection="row" gap={1} paddingX={1} width="100%" backgroundColor={tint ?? paper}>
        {isPinned ? <Text>📌</Text> : <Text color={markColor}>{props.row.isBlinking && state.isDim ? '○' : mark}</Text>}
        <Box flexDirection="column" flexGrow={1}>
          <Text bold wrap="truncate">{title}</Text>
          <Text dimColor wrap="truncate">{isPinned && state.isOverPin ? 'click the pin to pull it out' : line}</Text>
          {props.row.bar ? <Text color={markColor} wrap="truncate">{props.row.bar}</Text> : null}
        </Box>
      </Box>
    )
  }

  // Sized from the laid-out region in cells: a percentage height draws only one row here.
  return <Box width="100%" height={Math.max(1, props.rows ?? 0, surface.rows)} backgroundColor={tint} />
}

export default Hit
