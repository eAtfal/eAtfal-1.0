import { useEffect } from 'react'

function Modal({ children, onClose }) {
  useEffect(() => {
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden'
    // Re-enable scrolling on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    // debug: confirm modal mounted
    // eslint-disable-next-line no-console
    console.debug('Modal mounted')
  }, [])

  const handleBackdropClick = (e) => {
    // eslint-disable-next-line no-console
    console.debug('Modal backdrop click', e.target, e.currentTarget)
    if (e.target === e.currentTarget && typeof onClose === 'function') {
      onClose()
    }
  }

  // Inline styles ensure modal is visible even if Tailwind isn't available
  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
  }

  const panelStyle = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  }

  const contentStyle = {
    padding: '24px',
  }

  return (
    <div
      style={backdropStyle}
      className="animate__animated animate__fadeIn"
      onClick={handleBackdropClick}
    >
      <div style={panelStyle} className="animate__animated animate__fadeInUp animate__faster">
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
