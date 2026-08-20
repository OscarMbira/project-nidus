import { describe, it, expect, vi } from 'vitest'
import {
  countCanvasPdfPages,
  addCanvasImagePages,
  stampPdfPageNumbers,
  PDF_PAGE_EPSILON_MM,
  PDF_FIT_SINGLE_PAGE_SLOP_MM,
} from '../pdfCanvasPagination.js'

describe('countCanvasPdfPages', () => {
  it('returns 1 for content that fits on a single page', () => {
    expect(countCanvasPdfPages(200, 297)).toBe(1)
    expect(countCanvasPdfPages(297, 297)).toBe(1)
    expect(countCanvasPdfPages(297 - PDF_PAGE_EPSILON_MM / 2, 297)).toBe(1)
  })

  it('treats hairline overflow as a single page (no blank spill page)', () => {
    expect(countCanvasPdfPages(297 + 2, 297)).toBe(1)
    expect(countCanvasPdfPages(297 + PDF_FIT_SINGLE_PAGE_SLOP_MM, 297)).toBe(1)
  })

  it('does not invent a blank page when height is an exact multiple of page height', () => {
    expect(countCanvasPdfPages(594, 297)).toBe(2)
    expect(countCanvasPdfPages(891, 297)).toBe(3)
  })

  it('counts a real second page when overflow exceeds the fit slop', () => {
    expect(countCanvasPdfPages(297 + PDF_FIT_SINGLE_PAGE_SLOP_MM + 1, 297)).toBe(2)
    expect(countCanvasPdfPages(400, 297)).toBe(2)
  })

  it('guards invalid inputs', () => {
    expect(countCanvasPdfPages(0, 297)).toBe(1)
    expect(countCanvasPdfPages(100, 0)).toBe(1)
  })
})

describe('stampPdfPageNumbers', () => {
  function makePdfMock(pages = 1) {
    return {
      internal: {
        pageSize: {
          getHeight: () => 297,
          getWidth: () => 210,
        },
      },
      getNumberOfPages: vi.fn(() => pages),
      setPage: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      getTextWidth: vi.fn((t) => String(t).length * 2),
      rect: vi.fn(),
      text: vi.fn(),
      addPage: vi.fn(),
      addImage: vi.fn(),
    }
  }

  it('stamps each page with Page X of Y', () => {
    const pdf = makePdfMock(3)
    stampPdfPageNumbers(pdf)
    expect(pdf.setPage).toHaveBeenCalledTimes(3)
    expect(pdf.text).toHaveBeenCalledTimes(3)
    expect(pdf.text.mock.calls[0][0]).toBe('Page 1 of 3')
    expect(pdf.text.mock.calls[2][0]).toBe('Page 3 of 3')
  })
})

describe('addCanvasImagePages', () => {
  function makePdfMock() {
    let pages = 1
    return {
      internal: {
        pageSize: {
          getHeight: () => 297,
          getWidth: () => 210,
        },
      },
      getNumberOfPages: vi.fn(() => pages),
      setPage: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      getTextWidth: vi.fn((t) => String(t).length * 2),
      rect: vi.fn(),
      text: vi.fn(),
      addPage: vi.fn(() => {
        pages += 1
      }),
      addImage: vi.fn(),
    }
  }

  it('writes a single page and never calls addPage for one-page content', () => {
    const pdf = makePdfMock()
    const pages = addCanvasImagePages(pdf, 'data:image/png;base64,AA==', {
      imgWidth: 210,
      imgHeight: 297,
    })
    expect(pages).toBe(1)
    expect(pdf.addPage).not.toHaveBeenCalled()
    expect(pdf.addImage).toHaveBeenCalledTimes(1)
    expect(pdf.text).toHaveBeenCalledWith('Page 1 of 1', 105, 290, { align: 'center' })
  })

  it('scales hairline overflow onto one page instead of adding a blank page', () => {
    const pdf = makePdfMock()
    const imgHeight = 305
    const pages = addCanvasImagePages(pdf, 'data:image/png;base64,AA==', {
      imgWidth: 210,
      imgHeight,
      pageHeight: 297,
    })
    expect(pages).toBe(1)
    expect(pdf.addPage).not.toHaveBeenCalled()
    expect(pdf.addImage).toHaveBeenCalledTimes(1)
    const [, , , , width, height] = pdf.addImage.mock.calls[0]
    expect(height).toBeCloseTo(297, 5)
    expect(width).toBeCloseTo(210 * (297 / imgHeight), 5)
  })

  it('writes two pages without a trailing blank for exact double-height content', () => {
    const pdf = makePdfMock()
    const pages = addCanvasImagePages(pdf, 'data:image/png;base64,AA==', {
      imgWidth: 210,
      imgHeight: 594,
      pageHeight: 297,
    })
    expect(pages).toBe(2)
    expect(pdf.addPage).toHaveBeenCalledTimes(1)
    expect(pdf.addImage).toHaveBeenCalledTimes(2)
    expect(pdf.addImage.mock.calls[0][3]).toBe(0)
    expect(pdf.addImage.mock.calls[1][3]).toBe(-297)
    expect(pdf.text.mock.calls.some((c) => c[0] === 'Page 1 of 2')).toBe(true)
    expect(pdf.text.mock.calls.some((c) => c[0] === 'Page 2 of 2')).toBe(true)
  })

  it('can disable page numbers', () => {
    const pdf = makePdfMock()
    addCanvasImagePages(pdf, 'data:image/png;base64,AA==', {
      imgWidth: 210,
      imgHeight: 297,
      pageNumbers: false,
    })
    expect(pdf.text).not.toHaveBeenCalled()
  })
})
