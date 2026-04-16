import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../firebase';

export default function Sifreler() {
  const [sifreler, setSifreler] = useState([]);
  const [istatistik, setIstatistik] = useState({ toplam: 0, aktif: 0, bekleyen: 0 });
  
  // sıralam için state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // SAYFALAMA STATE'LERİ
  const [mevcutSayfa, setMevcutSayfa] = useState(1);
  const kayitSayisi = 5; // Her sayfada kaç kayıt gösterilecek


  // Tarih ve saat karşılaştırması yapan yardımcı fonksiyon
  const durumHesapla = (baslangicStr, bitisStr) => {
    // "2026-04-12 14:00" formatını JS Date objesine çeviriyoruz
    const baslangic = new Date(baslangicStr.replace(" ", "T"));
    const bitis = new Date(bitisStr.replace(" ", "T"));
    const suAn = new Date();

    if (suAn >= baslangic && suAn <= bitis) return { etiket: 'Şu An Aktif', renk: 'bg-green-100 text-green-700' };
    if (suAn < baslangic) return { etiket: 'Bekliyor', renk: 'bg-yellow-100 text-yellow-700' };
    if (suAn > bitis) return { etiket: 'Süresi Doldu', renk: 'bg-red-100 text-red-700' };
  };

  useEffect(() => {
    const sifrelerRef = ref(db, 'KilitSistemi/Sifreler');
    
    onValue(sifrelerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let aktifSayisi = 0;
        let bekleyenSayisi = 0;

        const liste = Object.keys(data).map(key => {
          const sifreObj = data[key];
          const durum = durumHesapla(sifreObj.Baslangic, sifreObj.Bitis);
          
          if (durum.etiket === 'Şu An Aktif') aktifSayisi++;
          if (durum.etiket === 'Bekliyor') bekleyenSayisi++;

          return { pin: key, ...sifreObj, durum };
        });

        // Tarihe göre sırala (En yakın bitiş tarihli olan en üstte çıksın)
        liste.sort((a, b) => new Date(a.Bitis.replace(" ", "T")) - new Date(b.Bitis.replace(" ", "T")));

        setSifreler(liste);
        setIstatistik({ toplam: liste.length, aktif: aktifSayisi, bekleyen: bekleyenSayisi });
      } else {
        setSifreler([]);
        setIstatistik({ toplam: 0, aktif: 0, bekleyen: 0 });
      }
    });
  }, []);

  // Süresi dolan veya iptal edilmek istenen şifreyi veritabanından kalıcı silme
  const handleSifreIptal = async (pin) => {
    if (window.confirm("Bu PIN kodunu kalıcı olarak iptal etmek istediğinize emin misiniz?")) {
      try {
        await remove(ref(db, `KilitSistemi/Sifreler/${pin}`));
      } catch (error) { 
        console.error("PIN atama hatası:", error);
        alert("Silme işlemi başarısız oldu.");
      }
    }
  };

  // --- BAŞLIĞA TIKLAYINCA ÇALIŞAN SIRALAMA FONKSİYONU ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'; // Zaten artansa, azalana çevir
    }
    setSortConfig({ key, direction });
    setMevcutSayfa(1);  // Sıralama değiştiğinde 1. sayfaya dön!
  };

  // Verileri sıralama konfigürasyonuna göre düzenliyoruz
  const siraliSifreler = [...sifreler].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Durum objesi içindeki metne (etikete) göre sıralamak için özel şart
    if (sortConfig.key === 'durum') {
      aValue = a.durum.etiket;
      bValue = b.durum.etiket;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const sonKayitIndeksi = mevcutSayfa * kayitSayisi;
  const ilkKayitIndeksi = sonKayitIndeksi - kayitSayisi;

  const gosterilecekSifreler = siraliSifreler.slice(ilkKayitIndeksi, sonKayitIndeksi);
  const toplamSayfa = Math.ceil(siraliSifreler.length / kayitSayisi);

  // Sıralama İkonunu Çizen Yardımcı Bileşen
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return ( // Tıklanmamış nötr durum (Senin attığın resimdeki gibi ↕)
        <svg className="w-4 h-4 text-gray-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
        </svg>
      );
    }
    if (sortConfig.direction === 'asc') {
      return ( // Artan sıralama (↑)
        <svg className="w-4 h-4 text-indigo-600 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path>
        </svg>
      );
    }
    return ( // Azalan sıralama (↓)
      <svg className="w-4 h-4 text-indigo-600 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
      </svg>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Atanan Şifreler</h2>
        <p className="text-gray-500 text-sm mt-1">Sisteme atanmış PIN kodlarının güncel durumları.</p>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="text-gray-500 text-sm font-medium mb-1">Toplam Atanan Şifre</div>
          <div className="text-3xl font-bold text-gray-800">{istatistik.toplam}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-green-500">
          <div className="text-gray-500 text-sm font-medium mb-1">Şu An Giriş Yapabilenler</div>
          <div className="text-3xl font-bold text-green-600">{istatistik.aktif}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-yellow-500">
          <div className="text-gray-500 text-sm font-medium mb-1">Saati Bekleyen Şifreler</div>
          <div className="text-3xl font-bold text-yellow-600">{istatistik.bekleyen}</div>
        </div>  
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Tüm PIN Kodları</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-gray-500 text-sm">
              
              {/* TIKLANABİLİR BAŞLIKLAR (Sıralama İşlemi) */}
              <th className="py-3 px-2 cursor-pointer hover:bg-gray-50 transition select-none" onClick={() => handleSort('pin')}>
                <div className="flex items-center gap-2">PIN Kodu <SortIcon columnKey="pin" /></div>
              </th>
              
              <th className="py-3 px-2 cursor-pointer hover:bg-gray-50 transition select-none" onClick={() => handleSort('KullaniciAdi')}>
                <div className="flex items-center gap-2">Kullanıcı <SortIcon columnKey="KullaniciAdi" /></div>
              </th>
              
              <th className="py-3 px-2 cursor-pointer hover:bg-gray-50 transition select-none" onClick={() => handleSort('Baslangic')}>
                <div className="flex items-center gap-2">Başlangıç <SortIcon columnKey="Baslangic" /></div>
              </th>
              
              <th className="py-3 px-2 cursor-pointer hover:bg-gray-50 transition select-none" onClick={() => handleSort('Bitis')}>
                <div className="flex items-center gap-2">Bitiş <SortIcon columnKey="Bitis" /></div>
              </th>
              
              <th className="py-3 px-2 cursor-pointer hover:bg-gray-50 transition select-none" onClick={() => handleSort('durum')}>
                <div className="flex items-center gap-2">Durum <SortIcon columnKey="durum" /></div>
              </th>
              
              <th className="py-3 px-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {siraliSifreler.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Sistemde kayıtlı şifre bulunmuyor.</td></tr>
            ) : (
              gosterilecekSifreler.map((sifre) => (
                <tr key={sifre.pin} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-2 font-mono font-bold text-indigo-600">{sifre.pin}</td>
                  <td className="py-4 px-2 font-medium text-gray-800">{sifre.KullaniciAdi}</td>
                  <td className="py-4 px-2 text-gray-600 text-sm">{sifre.Baslangic}</td>
                  <td className="py-4 px-2 text-gray-600 text-sm">{sifre.Bitis}</td>
                  <td className="py-4 px-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${sifre.durum.renk}`}>
                      {sifre.durum.etiket}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <button onClick={() => handleSifreIptal(sifre.pin)} className="text-red-500 hover:text-red-700 text-sm font-semibold hover:underline">
                      İptal Et
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* SAYFALAMA BUTONLARI */}
        {toplamSayfa > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6 mt-2 rounded-b-lg">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Toplam <span className="font-medium">{siraliSifreler.length}</span> kayıttan{' '}
                <span className="font-medium">{ilkKayitIndeksi + 1}</span> -{' '}
                <span className="font-medium">{Math.min(sonKayitIndeksi, siraliSifreler.length)}</span> arası gösteriliyor.
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setMevcutSayfa(prev => Math.max(prev - 1, 1))}
                  disabled={mevcutSayfa === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${mevcutSayfa === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${mevcutSayfa === index + 1 ? 'z-10 bg-indigo-600 text-white  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'}`}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  onClick={() => setMevcutSayfa(prev => Math.min(prev + 1, toplamSayfa))}
                  disabled={mevcutSayfa === toplamSayfa}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${mevcutSayfa === toplamSayfa ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Sonraki</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}