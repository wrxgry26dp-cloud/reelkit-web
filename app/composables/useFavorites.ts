const FAVS_KEY = 'reelkit-web-favorites'

function readIds(): string[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(FAVS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  if (!import.meta.client) return
  localStorage.setItem(FAVS_KEY, JSON.stringify(ids))
}

export function useFavorites() {
  const favoritedIds = useState<string[]>('web-fav-ids', () => [])
  const hydrated = useState('web-favs-hydrated', () => false)

  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    favoritedIds.value = readIds()
    hydrated.value = true
  }

  onMounted(hydrate)

  function isFavorited(dramaId: string) {
    hydrate()
    return favoritedIds.value.includes(dramaId)
  }

  function toggleFavorite(dramaId: string) {
    hydrate()
    const set = new Set(favoritedIds.value)
    if (set.has(dramaId)) set.delete(dramaId)
    else set.add(dramaId)
    favoritedIds.value = [...set]
    writeIds(favoritedIds.value)
    return set.has(dramaId)
  }

  return { favoritedIds, isFavorited, toggleFavorite }
}
