import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

export default function Loglar() {
  const [loglar, setLoglar] = useState([]);

  // FİLTRELEME VE ARAMA STATE'LERİ
  const [aramaMetni, setAramaMetni] = useState('');
  const [filtreDurum, setFiltreDurum] = useState('Tümü');
  const [filtreBaslangic, setFiltreBaslangic] = useState('');
  const [filtreBitis, setFiltreBitis] = useState('');

  // SAYFALAMA STATE'LERİ
  const [mevcutSayfa, setMevcutSayfa] = useState(1);
  const kayitSayisi = 5; // Her sayfada kaç kayıt gösterilecek

  useEffect(() => {
    // Firebase'den Giriş Logları düğümünü dinliyoruz
    const logRef = ref(db, 'KilitSistemi/GirisLoglari');
    
    onValue(logRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Gelen objeyi React'in sevdiği bir Diziye (Array) çeviriyoruz
        const liste = Object.keys(data).map(key => ({
          id: key, // Firebase'in ürettiği uzun push ID'si (örn: -Nx1a2B3...)
          ...data[key]
        }));

        // ZAMAN SIRALAMASI: En yeni log en üstte görünsün (Ters Kronolojik)
        // YYYY-MM-DD HH:MM:SS formatı metin karşılaştırmasına kusursuz uyar
        liste.sort((a, b) => {
          if (a.IslemZamani > b.IslemZamani) return -1;
          if (a.IslemZamani < b.IslemZamani) return 1;
          return 0;
        });

        setLoglar(liste);
      } else {
        setLoglar([]);
      }
    });
  }, []);

  // FİLTRE TEMİZLEME
  const filtreleriTemizle = () => {
    setAramaMetni('');
    setFiltreDurum('Tümü');
    setFiltreBaslangic('');
    setFiltreBitis('');
    setMevcutSayfa(1); // Sayfayı da ilk sayfaya sıfırla
  };

  // FİLTRELEME MANTIĞI
  const filtrelenmisLoglar = loglar.filter((log) => {
    // 1. Arama Metni (İsim veya PIN)
    const aramaKucuk = aramaMetni.toLowerCase();
    const isimEslesmesi = log.KullaniciAdi?.toLowerCase().includes(aramaKucuk);
    const pinEslesmesi = log.KullanilanPIN?.includes(aramaMetni);
    const aramaUygun = aramaMetni === '' || isimEslesmesi || pinEslesmesi;

    // 2. Durum Filtresi
    const durumUygun = filtreDurum === 'Tümü' || log.Durum === filtreDurum;

    // 3. Tarih Filtreleri (YYYY-MM-DD HH:MM:SS formatından sadece tarihi alıyoruz)
    const logTarihi = log.IslemZamani ? log.IslemZamani.split(' ')[0] : '';
    const baslangicUygun = !filtreBaslangic || logTarihi >= filtreBaslangic;
    const bitisUygun = !filtreBitis || logTarihi <= filtreBitis;

    return aramaUygun && durumUygun && baslangicUygun && bitisUygun;
  });

  const sonKayitIndeksi = mevcutSayfa * kayitSayisi;
  const ilkKayitIndeksi = sonKayitIndeksi - kayitSayisi;
  
  // Tabloda filtrelenmisLoglar yerine bu yeni dilimlenmis listeyi döneceğiz
  const gosterilecekLoglar = filtrelenmisLoglar.slice(ilkKayitIndeksi, sonKayitIndeksi);
  const toplamSayfa = Math.ceil(filtrelenmisLoglar.length / kayitSayisi);

  

  // Duruma göre özel renkli etiketler (Badge) döndüren yardımcı fonksiyon
  const getDurumEtiketi = (durum) => {
    switch (durum) {
      case 'Basarili Giris':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">Giriş Başarılı</span>;
      case 'Hatali Sifre':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">Hatalı Şifre</span>;
      case 'Yetkisiz Saat':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold border border-orange-200">Saat Dışı/Yetkisiz Deneme</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">{durum}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
      
      {/* BAŞLIK KISMI */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">Sistem Giriş Logları</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">Kapı kilit mekanizmasına yapılan tüm erişim denemeleri anlık olarak buradan izlenebilir.</p>
      </div>

      {/* FİLTRELEME ÇUBUĞU */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-end transition-colors">
        
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Arama</label>
          <input 
            type="text" 
            placeholder="İsim veya PIN ara..." 
            value={aramaMetni}
            onChange={(e) => { setAramaMetni(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Duruma Göre</label>
          <select 
            value={filtreDurum}
            onChange={(e) => { setFiltreDurum(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          >
            <option value="Tümü">Tümü (Filtresiz)</option>
            <option value="Basarili Giris">Giriş Başarılı</option>
            <option value="Hatali Sifre">Hatalı Şifre</option>
            <option value="Yetkisiz Saat">Saat Dışı Deneme</option>
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tarihten İtibaren</label>
          <input 
            type="date" 
            value={filtreBaslangic}
            onChange={(e) => { setFiltreBaslangic(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tarihine Kadar</label>
          <input 
            type="date" 
            value={filtreBitis}
            onChange={(e) => { setFiltreBitis(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          />
        </div>

        <div className="w-full md:w-auto flex justify-end">
          <button 
            onClick={filtreleriTemizle}
            className="w-full md:w-auto px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition whitespace-nowrap"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      {/* SONUÇ SAYISI */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors">Log Kayıtları</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium transition-colors">Listelenen: {filtrelenmisLoglar.length} kayıt</span>
      </div>

      {/* LOG TABLOSU / MOBİLDE KART YAPISI */}
      <div className="w-full">
        <table className="w-full text-left block md:table">
          
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-sm transition-colors">
              <th className="py-3 px-4 rounded-tl-lg font-semibold">Tarih & Saat</th>
              <th className="py-3 px-4 font-semibold">Kullanıcı / Sistem Bilgisi</th>
              <th className="py-3 px-4 font-semibold">Denenen PIN</th>
              <th className="py-3 px-4 rounded-tr-lg font-semibold text-right">Sonuç Durumu</th>
            </tr>
          </thead>
          
          <tbody className="block md:table-row-group">
            {gosterilecekLoglar.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan="4" className="block md:table-cell text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{loglar.length === 0 ? "Henüz hiçbir giriş denemesi kaydedilmedi." : "Filtreleme kriterlerinize uyan log bulunamadı."}</span>
                  </div>
                </td>
              </tr>
            ) : (
              gosterilecekLoglar.map((log) => (
                <tr key={log.id} className="block md:table-row border border-gray-200 dark:border-gray-700 md:border-0 md:border-b md:border-gray-50 md:dark:border-gray-700/50 bg-white dark:bg-transparent rounded-xl md:rounded-none shadow-sm md:shadow-none mb-4 md:mb-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors p-4 md:p-0">
                  
                  {/* Tarih & Saat */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Tarih / Saat</span>
                    <span className="whitespace-nowrap">{log.IslemZamani}</span>
                  </td>
                  
                  {/* Kullanıcı */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 font-semibold text-gray-800 dark:text-white border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                    <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Kullanıcı</span>
                    <span className="text-right md:text-left">{log.KullaniciAdi}</span>
                  </td>
                  
                  {/* Denenen PIN */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                    <span className="md:hidden text-xs font-bold text-gray-500 uppercase">PIN</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded tracking-widest">
                      {log.KullanilanPIN}
                    </span>
                  </td>
                  
                  {/* Durum */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 md:text-right border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                    <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Durum</span>
                    <div>{getDurumEtiketi(log.Durum)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* SAYFALAMA KONTROLLERİ (MOBİL UYUMLU) */}
        {toplamSayfa > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 mt-4 md:mt-2 rounded-b-lg transition-colors gap-4 md:gap-0">
          <div className="w-full md:flex-1 flex justify-center md:justify-start">
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center md:text-left">
              Toplam <span className="font-medium">{filtrelenmisLoglar.length}</span> kayıttan{' '}
              <span className="font-medium">{ilkKayitIndeksi + 1}</span> -{' '}
              <span className="font-medium">{Math.min(sonKayitIndeksi, filtrelenmisLoglar.length)}</span> arası gösteriliyor.
            </p>
          </div>
          <div className="w-full md:w-auto flex justify-center">
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm overflow-x-auto" aria-label="Pagination">
              <button
                onClick={() => setMevcutSayfa(prev => Math.max(prev - 1, 1))}
                disabled={mevcutSayfa === 1}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 transition-colors ${mevcutSayfa === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="sr-only">Önceki</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Sayfa Numaraları */}
              {[...Array(toplamSayfa)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setMevcutSayfa(index + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 transition-colors ${mevcutSayfa === index + 1 ? 'z-10 bg-indigo-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-offset-0'}`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setMevcutSayfa(prev => Math.min(prev + 1, toplamSayfa))}
                disabled={mevcutSayfa === toplamSayfa}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 transition-colors ${mevcutSayfa === toplamSayfa ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="sr-only">Sonraki</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5-4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
        )}

      </div>
      
    </div>
  );
}