import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Istekler from './pages/Istekler';
import Loglar from './pages/Loglar';
import Kullanicilar from './pages/Kullanicilar';
import Sifreler from './pages/Sifreler';

// Vite, vite.config.js'deki `base` değerini import.meta.env.BASE_URL'e koyar.
// React Router basename'i sondaki slash'sız ister.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  // --- KOYU TEMA (DARK MODE) STATE VE MANTIĞI ---
  const [darkTema, setDarkTema] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tema') === 'dark' ||
        (!('tema' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    // darkTema değiştiğinde HTML etiketine 'dark' class'ını ekle veya çıkar
    if (darkTema) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tema', 'dark');
      // YENİ: Eğer WebView içindeyse Mobile 'dark' mesajı gönder
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('dark');
      }
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tema', 'light');
      // YENİ: Eğer WebView içindeyse Mobile 'light' mesajı gönder
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('light');
      }
    }
  }, [darkTema]);

  return (
    // Hocanın eklediği basename ayarı buraya eklendi
    <Router basename={BASENAME}>
      {/* Ana kapsayıcı: Senin eklediğin mobil uyumlu sınıflar */}
      <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 overflow-hidden">
        
        {/* Sol Menü (Sidebar) */}
        <div className="w-full md:w-64 bg-white dark:bg-gray-800 shadow-lg transition-colors duration-300 flex-shrink-0 flex flex-col">
          <div className="p-4 md:p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400">Akıllı Kilit</h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Yönetim Paneli</p>
            </div>
          </div>

          {/* Menü Linkleri */}
          <nav className="mt-2 md:mt-6 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 px-2 md:px-4 pb-2 md:pb-0 scrollbar-hide">
            
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              Dashboard
            </NavLink>

            <NavLink 
              to="/istekler" 
              className={({ isActive }) => 
                `px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              Gelen İstekler
            </NavLink>

            <NavLink 
              to="/loglar" 
              className={({ isActive }) => 
                `px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              Log Kayıtları
            </NavLink>

            <NavLink 
              to="/kullanicilar" 
              className={({ isActive }) => 
                `px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              Kullanıcılar
            </NavLink>

            <NavLink 
              to="/sifreler" 
              className={({ isActive }) => 
                `px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              Şifreler
            </NavLink>
          </nav>
        </div>

        {/* Sağ Taraf (Değişen Sayfa İçeriği) */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 shadow-sm px-4 md:px-8 py-4 flex items-center justify-between transition-colors duration-300">
            <div className="flex-1 hidden md:block"></div> 
            
            <h1 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white truncate">Hoş Geldin, Admin</h1>
            
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setDarkTema(!darkTema)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title={darkTema ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
              >
                {darkTema ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                )}
              </button>
            </div>
          </header>
          
          <main className="p-4 md:p-8">
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
  );
}

export default App;