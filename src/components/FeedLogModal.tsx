import { useState, useRef, useCallback } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { useStarters } from '../context/StarterContext'
import { useAuth } from '../context/AuthContext'
import { compressImage } from '../lib/imageCompressor'
import type { StarterProfile } from '../types'

interface Props {
  starter: StarterProfile
  onClose: () => void
}

export default function FeedLogModal({ starter, onClose }: Props) {
  const { user } = useAuth()
  const { addFeed } = useStarters()
  const fileRef = useRef<HTMLInputElement>(null)

  const [ratio, setRatio] = useState('')
  const [riseMultiplier, setRiseMultiplier] = useState('')
  const [peakTime, setPeakTime] = useState('')
  const [roomTemp, setRoomTemp] = useState(22)
  const [note, setNote] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const compressed = await compressImage(file)
    const dataUrl = `data:${compressed.mimeType};base64,${compressed.base64}`
    setImagePreview(dataUrl)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleSave = () => {
    setSaving(true)
    addFeed({
      userId: user!.id,
      starterId: starter.id,
      starterName: starter.name,
      ratio,
      riseMultiplier,
      peakTime,
      roomTemp,
      note,
      imageUrl: imagePreview || undefined,
    })
    setTimeout(() => { setSaving(false); onClose() }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-sm">Log New Feed — {starter.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-500 mb-1 font-medium">Ratio (flour / water)</label>
            <input
              type="text" value={ratio} onChange={e => setRatio(e.target.value)}
              placeholder="e.g. 50g T65 / 50g water"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D69A3A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Rise multiplier</label>
              <input
                type="text" value={riseMultiplier} onChange={e => setRiseMultiplier(e.target.value)}
                placeholder="e.g. 3.1×"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D69A3A]"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Peak time</label>
              <input
                type="text" value={peakTime} onChange={e => setPeakTime(e.target.value)}
                placeholder="e.g. +5h"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D69A3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-500 mb-1 font-medium">Room temperature: {roomTemp}°C</label>
            <input
              type="range" min={14} max={32} value={roomTemp}
              onChange={e => setRoomTemp(Number(e.target.value))}
              className="w-full accent-[#D69A3A]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>14°C</span><span>32°C</span></div>
          </div>

          <div>
            <label className="block text-gray-500 mb-1 font-medium">Notes</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Observations about aroma, surface, activity..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D69A3A] resize-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-1 font-medium">Photo (optional)</label>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${dragOver ? 'border-[#D69A3A] bg-[rgba(214,154,58,0.04)]' : 'border-gray-200 hover:border-gray-300'}`}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="" className="max-h-32 mx-auto rounded-lg object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-gray-400 py-2">
                  <Upload size={20} />
                  <span className="text-[11px]">Drop photo or click to browse</span>
                  <span className="text-[10px] text-gray-300">JPG, PNG, HEIC — auto-compressed</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-xs font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#D69A3A] hover:bg-[#C98A3D] disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5">
            {saving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : 'Save Feed'}
          </button>
        </div>
      </div>
    </div>
  )
}
