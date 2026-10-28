import { useEffect, useState } from 'react'
import { loadFonts } from './fonts'
import { closeProject, openProject } from './state/session'
import { Editor } from './ui/Editor'
import { Home } from './ui/Home'

export function App() {
  const [fontsReady, setFontsReady] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  // Canvas text must never fall back to another font, so nothing renders until fonts load.
  useEffect(() => {
    loadFonts().then(() => setFontsReady(true))
  }, [])

  async function open(id: string) {
    try {
      await openProject(id)
      setOpenId(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  async function back() {
    // Leave the editor before the project is cleared from the store.
    setOpenId(null)
    await closeProject()
  }

  if (!fontsReady) return null
  return openId ? <Editor onBack={back} /> : <Home onOpen={open} />
}
