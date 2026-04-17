import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Istekler from './pages/Istekler';
import Loglar from './pages/Loglar';
import Kullanicilar from './pages/Kullanicilar';
import Sifreler from './pages/Sifreler';

function App() {
  
  return (

    <Router>
      <div className="flex h-screen bg-gray-100">
        
        {/* Sol Menü (Sidebar) */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-2xl font-black text-indigo-600">Akıllı Kilit</h2>
            <p className="text-sm text-gray-500">Yönetim Paneli</p>
          </div>
          <nav className="mt-6 flex flex-col gap-2 px-4">
            <Link to="/" className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition">
              Dashboard
            </Link>
            <Link to="/istekler" className="px-4 py-3 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition">
              Gelen İstekler
            </Link>
            <Link to="/loglar" className="px-4 py-3 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition">
              Log Kayıtları
            </Link>
            <Link to="/kullanicilar" className="px-4 py-3 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition">
              Kullanıcılar
            </Link>
            <Link to="/sifreler" className="px-4 py-3 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition">
              Şifreler
            </Link>
          </nav>
        </div>

        {/* Sağ Taraf (Değişen Sayfa İçeriği) */}
        <div className="flex-1 overflow-y-auto">
          <header className="bg-white shadow-sm px-8 py-4 items-center flex justify-center">
            <h1 className="text-xl font-semibold text-gray-800">Hoş Geldin, Admin</h1>
          </header>
          
          <main className="p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/istekler" element={<Istekler />} />
              <Route path="/loglar" element={<Loglar />} />
              <Route path="/kullanicilar" element={<Kullanicilar />} />
              <Route path="/sifreler" element={<Sifreler />} />
            </Routes>
          </main>
        </div>

      </div>
    </Router>

  )
}

export default App
