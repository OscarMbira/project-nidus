import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ZoomableImage from '../ZoomableImage.jsx'

describe('ZoomableImage', () => {
  it('renders the thumbnail and opens a lightbox on click', () => {
    render(<ZoomableImage src="https://example.com/pic.png" alt="Your profile picture" imgClassName="h-20 w-20" />)
    expect(screen.getByAltText('Your profile picture')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /enlarge your profile picture/i }))
    expect(screen.getByRole('dialog', { name: 'Your profile picture' })).toBeInTheDocument()
  })

  it('shows an enlarged preview on hover at 1.5 times the thumbnail', () => {
    render(<ZoomableImage src="https://example.com/pic.png" alt="Your profile picture" />)
    expect(screen.queryByTestId('zoomable-hover-preview')).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: /enlarge your profile picture/i })
    trigger.getBoundingClientRect = () => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 50,
      bottom: 60,
      width: 40,
      height: 40,
      toJSON() { return {} },
    })
    fireEvent.mouseEnter(trigger)
    const preview = screen.getByTestId('zoomable-hover-preview')
    expect(preview.querySelector('img')).toHaveStyle({ width: '60px', height: '60px' })
    fireEvent.mouseLeave(trigger)
    expect(screen.queryByTestId('zoomable-hover-preview')).not.toBeInTheDocument()
  })

  it('closes the lightbox on Escape', () => {
    render(<ZoomableImage src="https://example.com/pic.png" alt="Your saved signature" />)
    fireEvent.click(screen.getByRole('button', { name: /enlarge your saved signature/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
