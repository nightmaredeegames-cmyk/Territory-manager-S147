import React, { useEffect, useRef, useState } from 'react'

const DEFAULT_ALLIANCES = [
  { id: 'UTD', name: 'UTD', color: '#e02424' },
  { id: 'LØV', name: 'LØV', color: '#ff69b4' },
  { id: 'DRK!', name: 'DRK!', color: '#22c55e' },
  { id: 'NW_', name: 'NW_', color: '#14b8a6' },
  { id: 'CAP', name: 'CAP', color: '#9ca3af' }
]

export default function App() {
  const APP_NAME = 'S147 Territory Management'
  const [alliances, setAlliances] = useState(() => {
    try {
      const r = localStorage.getItem('s147_alliances_v1')
      return r ? JSON.parse(r) : DEFAULT_ALLIANCES
    } catch {
      return DEFAULT_ALLIANCES
    }
  })
  const [zones, setZones] = useState(() => {
    try {
      const r = localStorage.getItem('s147_zones_v1')
      return r ? JSON.parse(r) : []
    } catch {
      return []
    }
  })
  const [imageDataUrl, setImageDataUrl] = useState('/map.svg')
  const [mode, setMode] = useState('idle')
  const [currentPoints, setCurrentPoints] = useState([])
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null)
  const [newAllianceName, setNewAllianceName] = useState('')
  const [newAllianceColor, setNewAllianceColor] = useState('#ffffff')
  const svgRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('s147_zones_v1', JSON.stringify(zones))
  }, [zones])

  useEffect(() => {
    localStorage.setItem('s147_alliances_v1', JSON.stringify(alliances))
  }, [alliances])

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(reader.result)
    reader.readAsDataURL(file)
  }

  function getSvgPoint(clientX, clientY) {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse())
    return { x: cursorpt.x, y: cursorpt.y }
  }

  function onMapClick(e) {
    if (mode !== 'drawing') return
    const p = getSvgPoint(e.clientX, e.clientY)
    if (!p) return
    setCurrentPoints(points => [...points, p])
  }

  function startDrawing() {
    setMode('drawing')
    setCurrentPoints([])
    setSelectedZoneIndex(null)
  }

  function finishZone() {
    if (currentPoints.length < 3) {
      alert('A zone needs at least 3 points.')
      return
    }
    const newZone = {
      id: `zone_${Date.now()}`,
      name: `Zone ${zones.length + 1}`,
      points: currentPoints,
      alliance: null
    }
    setZones(z => [...z, newZone])
    setCurrentPoints([])
    setMode('idle')
  }

  function cancelDrawing() {
    setCurrentPoints([])
    setMode('idle')
  }

  function polygonPointsString(points) {
    return points.map(p => `${p.x},${p.y}`).join(' ')
  }

  function selectZone(idx) {
    setSelectedZoneIndex(idx)
    setMode('editing')
  }

  function pickAllianceForSelected(allianceId) {
    if (selectedZoneIndex == null) return
    setZones(z =>
      z.map((zone, idx) =>
        idx === selectedZoneIndex ? { ...zone, alliance: allianceId } : zone
      )
    )
  }

  function deleteSelectedZone() {
    if (selectedZoneIndex == null) return
    if (!confirm('Delete selected zone?')) return
    setZones(z => z.filter((_, i) => i !== selectedZoneIndex))
    setSelectedZoneIndex(null)
    setMode('idle')
  }

  function exportJSON() {
    const payload = { meta: { app: APP_NAME, alliances }, zones }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 's147_map_export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJSON(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!data.zones) throw new Error('No zones found')
        if (data.meta?.alliances) setAlliances(data.meta.alliances)
        setZones(data.zones)
        alert('Imported zones successfully.')
      } catch (err) {
        alert('Invalid file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  function clearAll() {
    if (!confirm('Clear all zones?')) return
    setZones([])
    setSelectedZoneIndex(null)
  }

  function addAlliance() {
    if (!newAllianceName.trim()) return alert('Alliance needs a name')
    setAlliances(a => [
      ...a,
      {
        id: newAllianceName.trim().slice(0, 6),
        name: newAllianceName.trim(),
        color: newAllianceColor
      }
    ])
    setNewAllianceName('')
    setNewAllianceColor('#ffffff')
  }

  function removeAlliance(idx) {
    if (
      !confirm('Remove alliance? This will not change existing zone alliance values.')
    )
      return
    setAlliances(a => a.filter((_, i) => i !== idx))
  }

  function updateAlliance(idx, key, value) {
    setAlliances(a =>
      a.map((al, i) => (i === idx ? { ...al, [key]: value } : al))
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <div className="text-sm text-gray-300">
            Starter app — upload your map and draw zones
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          <aside className="col-span-3 bg-gray-800 p-4 rounded-lg space-y-3">
            <div>
              <label className="block text-xs text-gray-400">Upload map image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-2 text-sm"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={startDrawing}
                className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700"
              >
                Add Zone
              </button>
              <button
                onClick={finishZone}
                disabled={mode !== 'drawing'}
                className="px-3 py-2 rounded bg-green-600 disabled:opacity-50"
              >
                Finish Zone
              </button>
              <button
                onClick={cancelDrawing}
                disabled={mode !== 'drawing'}
                className="px-3 py-2 rounded bg-red-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="pt-2">
              <div className="text-sm text-gray-300">Alliances</div>
              <div className="mt-2 space-y-2 max-h-44 overflow-auto">
                {alliances.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-700 p-2 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        value={a.name}
                        onChange={e => updateAlliance(idx, 'name', e.target.value)}
                        className="text-sm bg-transparent w-20"
                      />
                      <input
                        type="color"
                        value={a.color}
                        onChange={e => updateAlliance(idx, 'color', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => pickAllianceForSelected(a.id)}
                        className="px-2 py-1 rounded bg-gray-600 text-xs"
                      >
                        Paint
                      </button>
                      <button
                        onClick={() => removeAlliance(idx)}
                        className="px-2 py-1 rounded bg-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <input
                  placeholder="Alliance name"
                  value={newAllianceName}
                  onChange={e => setNewAllianceName(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-sm"
                />
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="color"
                    value={newAllianceColor}
                    onChange={e => setNewAllianceColor(e.target.value)}
                  />
                  <button
                    onClick={addAlliance}
                    className="px-3 py-2 rounded bg-green-600"
                  >
                    Add Alliance
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <div className="flex flex-col space-y-2">
                <div className="text-sm">Selected Zone:</div>
                <div className="text-sm text-gray-200">
                  {selectedZoneIndex == null
                    ? 'None'
                    : zones[selectedZoneIndex]?.name}
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={deleteSelectedZone}
                    className="px-3 py-2 rounded bg-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-2 rounded bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <button
                onClick={exportJSON}
                className="w-full px-3 py-2 rounded bg-yellow-500 text-black"
              >
                Export JSON
              </button>
              <label className="mt-2 block">
                <input
                  type="file"
                  accept="application/json"
                  onChange={importJSON}
                  className="text-sm mt-2"
                />
              </label>
            </div>

            <div className="pt-3 text-xs text-gray-400">
              Legend & alliance manager shown here. Zones are autosaved in your
              browser.
            </div>
          </aside>

          <main className="col-span-9 bg-gray-800 rounded-lg p-3">
            <div className="w-full h-[720px] bg-black rounded overflow-hidden relative">
              {imageDataUrl ? (
                <svg
                  ref={svgRef}
                  onClick={onMapClick}
                  className="w-full h-full"
                  viewBox={'0 0 1000 1000'}
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <pattern
                      id="bgImage"
                      patternUnits="userSpaceOnUse"
                      width="1000"
                      height="1000"
                    >
                      <image
                        href={imageDataUrl}
                        x="0"
                        y="0"
                        width="1000"
                        height="1000"
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </pattern>
                  </defs>

                  <rect x="0" y="0" width="1000" height="1000" fill="url(#bgImage)" />

                  {zones.map((z, idx) => {
                    const alliance = alliances.find(a => a.id === z.alliance)
                    const fill = alliance ? alliance.color : 'rgba(255,255,255,0.0)'
                    const stroke = selectedZoneIndex === idx ? '#ffffff' : '#000000'
                    return (
                      <g
                        key={z.id}
                        onClick={e => {
                          e.stopPropagation()
                          selectZone(idx)
                        }}
                      >
                        <polygon
                          points={polygonPointsString(z.points)}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={selectedZoneIndex === idx ? 3 : 1}
                          opacity={alliance ? 0.7 : 0.35}
                        />
                        <text
                          x={z.points[0].x}
                          y={z.points[0].y}
                          fontSize={20}
                          fill="#ffffff"
                          stroke="#000000"
                          strokeWidth={0.5}
                        >
                          {z.name}
                        </text>
                      </g>
                    )
                  })}

                  {currentPoints.length > 0 && (
                    <g>
                      <polygon
                        points={polygonPointsString(currentPoints)}
                        fill="rgba(100,100,255,0.25)"
                        stroke="#66a3ff"
                        strokeWidth={2}
                      />
                      {currentPoints.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={4}
                          fill="#ffffff"
                          stroke="#000"
                        />
                      ))}
                    </g>
                  )}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Upload your map image to start
                </div>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-300">
              <strong>How to:</strong>
              <ol className="list-decimal list-inside">
                <li>Upload image (use your clear base map).</li>
                <li>
                  Click <em>Add Zone</em>, then click around a tile to create polygon
                  points.
                </li>
                <li>
                  Click <em>Finish Zone</em> to save. Click the zone to select it.
                </li>
                <li>
                  With a zone selected, click <em>Paint</em> next to an alliance to
                  color it.
                </li>
                <li>
                  Export JSON to share with your alliance or save a backup.
                </li>
              </ol>
            </div>
          </main>
        </div>

        <footer className="mt-6 text-sm text-gray-400">
          Tip: Import the exported JSON on another browser or device to share
          progress.
        </footer>
      </div>
    </div>
  )
   }
