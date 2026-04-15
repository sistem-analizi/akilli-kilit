import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

export default function Loglar() {
  const [loglar, setLoglar] = useState([]);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      
      {/* BAŞLIK KISMI */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sistem Log Kayıtları</h2>
        <p className="text-gray-500 text-sm mt-1">Kapı kilit mekanizmasına yapılan tüm erişim denemeleri anlık olarak buradan izlenebilir.</p>
      </div>

      {/* LOG TABLOSU */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 text-sm">
              <th className="py-3 px-4 rounded-tl-lg font-semibold">Tarih & Saat</th>
              <th className="py-3 px-4 font-semibold">Kullanıcı / Sistem Bilgisi</th>
              <th className="py-3 px-4 font-semibold">Denenen PIN</th>
              <th className="py-3 px-4 rounded-tr-lg font-semibold">Sonuç Durumu</th>
            </tr>
          </thead>
          <tbody>
            {loglar.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Henüz hiçbir giriş denemesi kaydedilmedi.</span>
                  </div>
                </td>
              </tr>
            ) : (
              loglar.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="py-4 px-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                    {log.IslemZamani}
                  </td>
                  <td className="py-4 px-4 font-semibold text-gray-800">
                    {log.KullaniciAdi}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded tracking-widest">
                      {log.KullanilanPIN}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {getDurumEtiketi(log.Durum)}
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