/**
 * Shared jsPDF + html2canvas pagination helpers.
 *
 * The common copy-pasted pattern:
 *   pdf.addImage(...); heightLeft -= pageHeight;
 *   while (heightLeft >= 0) { pdf.addPage(); ... }
 * adds a trailing blank page whenever content height is an exact multiple of the
 * page height (or when float rounding leaves heightLeft as 0). Use these helpers
 * for every canvas→PDF export instead.
 *
 * Additionally, a hairline overflow (table border / padding) used to force a
 * nearly-blank second page — when overflow is within `fitSinglePageSlopMm`,
 * content is scaled to fit a single page instead.
 */

/** Ignore sub-millimetre leftovers from float math / exact page multiples. */
export const PDF_PAGE_EPSILON_MM = 0.5

/**
 * If canvas content exceeds one page by at most this many mm, scale it onto a
 * single page rather than creating a near-blank spill page.
 */
export const PDF_FIT_SINGLE_PAGE_SLOP_MM = 25

/**
 * How many PDF pages a canvas image needs (never returns 0 for positive height).
 * @param {number} imgHeightMm
 * @param {number} pageHeightMm
 * @param {number} [epsilonMm]
 * @param {number} [fitSinglePageSlopMm] - treat near-one-page overflow as 1 page
 * @returns {number}
 */
export function countCanvasPdfPages(
  imgHeightMm,
  pageHeightMm,
  epsilonMm = PDF_PAGE_EPSILON_MM,
  fitSinglePageSlopMm = PDF_FIT_SINGLE_PAGE_SLOP_MM,
) {
  if (!(pageHeightMm > 0)) return 1
  if (!(imgHeightMm > 0)) return 1

  // Hairline / border spill: keep on one page (caller will scale to fit).
  if (imgHeightMm > pageHeightMm && imgHeightMm <= pageHeightMm + fitSinglePageSlopMm) {
    return 1
  }

  let heightLeft = imgHeightMm
  let pages = 0
  while (heightLeft > epsilonMm) {
    pages += 1
    heightLeft -= pageHeightMm
  }
  return Math.max(pages, 1)
}

/**
 * Stamp "Page X of Y" (centered) on every page of a jsPDF document.
 * Works with mm or pt units — uses the document's page size.
 *
 * @param {object} pdf - jsPDF instance
 * @param {object} [options]
 * @param {(page: number, total: number) => string} [options.label]
 * @param {number} [options.fontSize=8]
 * @param {number[]} [options.textColor=[75,85,99]]
 * @param {number} [options.yFromBottom=7] - distance from bottom edge (same unit as pdf)
 * @param {boolean} [options.withBackground=true] - white strip behind text for readability
 */
export function stampPdfPageNumbers(pdf, options = {}) {
  if (!pdf) return

  const {
    label = (page, total) => `Page ${page} of ${total}`,
    fontSize = 8,
    textColor = [75, 85, 99],
    yFromBottom = 7,
    withBackground = true,
  } = options

  const total =
    typeof pdf.getNumberOfPages === 'function'
      ? pdf.getNumberOfPages()
      : typeof pdf.internal?.getNumberOfPages === 'function'
        ? pdf.internal.getNumberOfPages()
        : 1

  if (!(total > 0)) return

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i)
    const text = label(i, total)
    pdf.setFontSize(fontSize)

    const textWidth =
      typeof pdf.getTextWidth === 'function'
        ? pdf.getTextWidth(text)
        : text.length * fontSize * 0.35

    const y = pageH - yFromBottom
    if (withBackground) {
      const padX = 3
      const padY = fontSize * 0.45
      pdf.setFillColor(255, 255, 255)
      pdf.rect(pageW / 2 - textWidth / 2 - padX, y - padY, textWidth + padX * 2, fontSize * 0.7, 'F')
    }

    if (Array.isArray(textColor)) {
      pdf.setTextColor(textColor[0], textColor[1], textColor[2])
    } else {
      pdf.setTextColor(textColor)
    }
    pdf.text(text, pageW / 2, y, { align: 'center' })
  }
}

/**
 * Slice a full-height canvas image onto a jsPDF document without trailing blank pages.
 * Near-one-page overflow is scaled to fit instead of spilling a blank page.
 * By default stamps "Page X of Y" on every page.
 *
 * @param {object} pdf - jsPDF instance
 * @param {string} imgData - image data accepted by pdf.addImage
 * @param {object} opts
 * @param {number} opts.imgWidth - image width in the PDF unit (usually mm)
 * @param {number} opts.imgHeight - image height in the PDF unit
 * @param {number} [opts.pageHeight] - defaults to pdf page height
 * @param {string} [opts.format='PNG']
 * @param {number} [opts.x=0]
 * @param {number} [opts.fitSinglePageSlopMm]
 * @param {boolean} [opts.pageNumbers=true]
 * @param {object} [opts.pageNumberOptions] - passed to stampPdfPageNumbers
 * @returns {number} number of pages written
 */
export function addCanvasImagePages(pdf, imgData, {
  imgWidth,
  imgHeight,
  pageHeight,
  format = 'PNG',
  x = 0,
  fitSinglePageSlopMm = PDF_FIT_SINGLE_PAGE_SLOP_MM,
  pageNumbers = true,
  pageNumberOptions = {},
} = {}) {
  const pageH = pageHeight ?? pdf.internal.pageSize.getHeight()

  // Scale slightly to absorb hairline overflow onto one page.
  if (imgHeight > pageH && imgHeight <= pageH + fitSinglePageSlopMm) {
    const scale = pageH / imgHeight
    pdf.addImage(imgData, format, x, 0, imgWidth * scale, imgHeight * scale)
    if (pageNumbers) stampPdfPageNumbers(pdf, pageNumberOptions)
    return 1
  }

  const pagesNeeded = countCanvasPdfPages(imgHeight, pageH, PDF_PAGE_EPSILON_MM, 0)

  let position = 0
  for (let pageIndex = 0; pageIndex < pagesNeeded; pageIndex += 1) {
    if (pageIndex > 0) {
      pdf.addPage()
    }
    pdf.addImage(imgData, format, x, position, imgWidth, imgHeight)
    position -= pageH
  }

  if (pageNumbers) stampPdfPageNumbers(pdf, pageNumberOptions)

  return pagesNeeded
}
