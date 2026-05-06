import jsPDF from 'jspdf'
import type { Analysis, StarterProfile } from '../types'

export const AGE_LABELS: Record<string, string> = {
  'under-2-weeks':  '< 2 weeks',
  '2-8-weeks':      '2–8 weeks',
  '2-6-months':     '2–6 months',
  '6-plus-months':  '6+ months',
  'under-1-month':  '< 1 month',
  '1-6-months':     '1–6 months',
  '6-12-months':    '6–12 months',
  '1-5-years':      '1–5 years',
  'custom':         'Custom',
  '1-year':         '1 year',
  '3-years':        '3 years',
  '5-plus-years':   '5+ years',
}

const gold = [214, 154, 58] as const
const dark = [17, 17, 17]  as const
const mid  = [100, 100, 100] as const

// ─────────────────────────────────────────────────────────────
// Appends one analysis report to an existing jsPDF document.
// Returns the updated `y` cursor position.
// Pass firstPage=true to write the top header band; for
// subsequent analyses in an "all" export the header is skipped
// and a section divider is added instead.
// ─────────────────────────────────────────────────────────────
function appendAnalysis(
  doc: jsPDF,
  analysis: Analysis,
  starter: StarterProfile | undefined,
  ownerName: string,
  isFirstOnDoc: boolean,
): void {
  const { aiResult, starterName, createdAt, questionnaireData } = analysis
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  const colW = pageW - margin * 2 - 4   // −4 mm safety buffer: jsPDF underestimates width for em-dashes, °, etc.
  const date = new Date(createdAt)
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  let y = 0

  const addPage = () => { doc.addPage(); y = 18 }
  const checkY = (need = 10) => { if (y + need > 275) addPage() }

  const section = (title: string) => {
    checkY(12)
    y += 4
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...gold)
    doc.text(title.toUpperCase(), margin, y)
    y += 6
  }

  const row = (label: string, value: string) => {
    const valW = colW - 42
    const valLines = doc.splitTextToSize(value, valW) as string[]
    checkY(valLines.length * 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...mid)
    doc.text(label, margin, y)
    doc.setTextColor(...dark)
    valLines.forEach((l: string, i: number) => {
      doc.text(l, margin + 42, y + i * 5.5)
    })
    y += valLines.length * 5.5
  }

  const bodyText = (text: string) => {
    const lines = doc.splitTextToSize(text, colW) as string[]
    lines.forEach((l: string) => {
      checkY(5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...dark)
      doc.text(l, margin, y)
      y += 5
    })
  }

  if (isFirstOnDoc) {
    // ── Header band ──
    doc.setFillColor(...dark)
    doc.rect(0, 0, pageW, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('BREADAGAIN', margin, 12)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gold)
    doc.text('STARTER ANALYSIS REPORT', margin, 19)
    doc.setTextColor(180, 180, 180)
    doc.text(`${dateStr}  ${timeStr}`, pageW - margin, 19, { align: 'right' })
    y = 36
  } else {
    // ── New-page divider for multi-analysis PDF ──
    doc.addPage()
    doc.setFillColor(...dark)
    doc.rect(0, 0, pageW, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...gold)
    doc.text('BREADAGAIN  ·  ANALYSIS REPORT', margin, 10)
    doc.setTextColor(180, 180, 180)
    doc.text(`${dateStr}  ${timeStr}`, pageW - margin, 10, { align: 'right' })
    y = 24
  }

  // ── Starter name + score pill ──
  doc.setTextColor(...dark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(starterName, margin, y)
  const pill = `${aiResult.overallScore}  ${aiResult.scoreLabel}`
  doc.setFillColor(...gold)
  doc.roundedRect(pageW - margin - 44, y - 8, 44, 11, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(pill, pageW - margin - 22, y - 1.5, { align: 'center' })
  y += 10

  // ── Health Metrics ──
  section('Health Metrics')
  const metrics: [string, number][] = [
    ['Rise Activity',      aiResult.subScores.fermentationActivity],
    ['Aroma Integrity',    aiResult.subScores.aromaProfileHealth],
    ['Surface Structure',  aiResult.subScores.visualStructureScore],
    ['Fermentation Speed', aiResult.subScores.feedingRegularityScore],
  ]
  metrics.forEach(([label, score]) => {
    checkY(9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...mid)
    doc.text(label, margin, y)
    doc.setTextColor(...dark)
    doc.setFont('helvetica', 'bold')
    doc.text(String(score), margin + 46, y, { align: 'right' })
    const barX = margin + 50
    const barW = colW - 50
    doc.setFillColor(230, 230, 230)
    doc.roundedRect(barX, y - 3.5, barW, 3.5, 1, 1, 'F')
    doc.setFillColor(...gold)
    doc.roundedRect(barX, y - 3.5, barW * score / 100, 3.5, 1, 1, 'F')
    y += 7
  })

  // ── Session ──
  section('This Session')
  row('Fed',         `${questionnaireData.hoursSinceLastFeed}h ago`)
  row('Ratio',       questionnaireData.feedingRatio)
  row('Temperature', `${questionnaireData.roomTemp}°C`)
  row('Surface',     questionnaireData.surfaceAppearance.replace(/_/g, ' '))
  row('Aroma',       questionnaireData.aroma.replace(/_/g, ' '))
  if (questionnaireData.floatTest && questionnaireData.floatTest !== 'untested')
    row('Float Test', questionnaireData.floatTest === 'yes' ? 'Floated ✓' : 'Sank')
  if (questionnaireData.symptoms.length > 0)
    row('Symptoms', questionnaireData.symptoms.join(', '))

  // ── Diagnosis ──
  section('Diagnosis')
  bodyText(aiResult.diagnosis)

  // ── Action Steps ──
  section('Action Steps')
  aiResult.actionSteps.forEach(({ step, title, detail }) => {
    checkY(14)
    doc.setFillColor(...gold)
    doc.circle(margin + 3, y - 1.5, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(String(step), margin + 3, y - 0.2, { align: 'center' })
    doc.setTextColor(...dark)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(title, margin + 9, y)
    y += 5.5
    const dLines = doc.splitTextToSize(detail, colW - 9) as string[]
    dLines.forEach((l: string) => {
      checkY(5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...mid)
      doc.text(l, margin + 9, y)
      y += 4.5
    })
    y += 1.5
  })

  // ── Bake Readiness ──
  if (aiResult.bakeReadinessHours !== null || aiResult.bakeReadinessNote) {
    section('Bake Readiness')
    if (aiResult.bakeReadinessHours !== null) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(...gold)
      doc.text(`~${aiResult.bakeReadinessHours}h`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...mid)
      doc.text('until peak', margin + 16, y)
      y += 6
    }
    bodyText(aiResult.bakeReadinessNote)
  }

  // ── Flags ──
  const activeFlags = Object.entries(aiResult.flags)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase())
  if (activeFlags.length > 0) {
    section('Flags')
    activeFlags.forEach(f => {
      checkY(6)
      doc.setFillColor(254, 226, 226)
      doc.roundedRect(margin, y - 3.5, colW, 5.5, 1.5, 1.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(185, 28, 28)
      doc.text(`! ${f}`, margin + 3, y)
      y += 7
    })
  }

  // ── Starter Profile ──
  section('Starter Profile')
  if (ownerName) row('Owner', ownerName)
  if (starter) {
    row('Age',       AGE_LABELS[starter.age] ?? starter.age)
    row('Flour',     starter.flourType.join(', '))
    row('Water',     starter.waterType)
    row('Hydration', `${starter.targetHydration}%`)
  }

  // ── Encouragement note ──
  if (aiResult.encouragementNote) {
    y += 4
    checkY(16)
    doc.setFillColor(250, 247, 240)
    const noteLines = doc.splitTextToSize(`"${aiResult.encouragementNote}"`, colW - 10) as string[]
    const noteH = noteLines.length * 5 + 8
    doc.roundedRect(margin, y, colW, noteH, 3, 3, 'F')
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.6)
    doc.line(margin, y, margin, y + noteH)
    y += 6
    noteLines.forEach((l: string) => {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(100, 80, 40)
      doc.text(l, margin + 4, y)
      y += 5
    })
  }
}

function addPageFooters(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 245, 245)
    doc.rect(0, 287, pageW, 10, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Breadagain Starter Analyzer', margin, 293)
    doc.text(`Page ${p} of ${pages}`, pageW - margin, 293, { align: 'right' })
  }
}

// ─── Export a single analysis ───────────────────────────────
export function exportSinglePDF(
  analysis: Analysis,
  starter: StarterProfile | undefined,
  ownerName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  appendAnalysis(doc, analysis, starter, ownerName, true)
  addPageFooters(doc)
  const date = new Date(analysis.createdAt).toISOString().slice(0, 10)
  doc.save(`${analysis.starterName.replace(/\s+/g, '_')}_${date}.pdf`)
}

// ─── Export all analyses for one or more starters ──────────
export function exportAllPDF(
  analyses: Analysis[],
  starters: StarterProfile[],
  ownerName: string,
  filename: string,
) {
  const sorted = [...analyses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  if (sorted.length === 0) return
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  sorted.forEach((a, i) => {
    const starter = starters.find(s => s.id === a.starterId)
    appendAnalysis(doc, a, starter, ownerName, i === 0)
  })
  addPageFooters(doc)
  doc.save(filename)
}
