import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

function Layout() {
  return (
    <div className="app-layout flex flex-col min-h-screen" style={{ background: 'linear-gradient(120deg, #f8f9fa 80%, #e3f2fd 100%)' }}>
      <Navbar />
      <main className="main-content flex-1 animate__animated animate__fadeIn">
        {/* Render children full-width; individual pages/components should opt into max-width or padding as needed */}
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout
