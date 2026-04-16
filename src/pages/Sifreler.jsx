import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../firebase';

export default function Sifreler() {
  const [sifreler, setSifreler] = useState([]);
  const [istatistik, setIstatistik] = useState({ toplam: 0, aktif: 0, bekleyen: 0 });
  
  // sıralam için state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });


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
              siraliSifreler.map((sifre) => (
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
      </div>
    </div>
  );
}