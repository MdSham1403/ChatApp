import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'

function makeIcon(size, outPath) {
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#4f46e5'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.22)
  ctx.fill()

  // Chat bubble shape
  const s = size * 0.55
  const x = (size - s) / 2
  const y = (size - s) / 2 - size * 0.04
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(x, y, s, s * 0.75, s * 0.15)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + s * 0.2, y + s * 0.75)
  ctx.lineTo(x + s * 0.08, y + s * 0.98)
  ctx.lineTo(x + s * 0.45, y + s * 0.75)
  ctx.fill()

  writeFileSync(outPath, canvas.toBuffer('image/png'))
  console.log(`Generated ${outPath}`)
}

mkdirSync('public/icons', { recursive: true })
makeIcon(192, 'public/icons/icon-192.png')
makeIcon(512, 'public/icons/icon-512.png')