import { useState, useEffect } from 'react';
import { ref, onValue, update, set, get } from 'firebase/database';
import { db } from '../firebase';

const rastgelePinUret = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export default function Istekler() {
  const [istekler, setIstekler] = useState([]);
  
  // ARAMA VE FİLTRE STATE'LERİ
  const [aramaMetni, setAramaMetni] = useState('');
  const [filtreDurum, setFiltreDurum] = useState('Tümü');
  
  // SAYFALAMA STATE'LERİ
  const [mevcutSayfa, setMevcutSayfa] = useState(1);
  const kayitSayisi = 10;
  
  // MESAJ STATE'İ
  const [mesaj, setMesaj] = useState({ tip: '', metin: '' });

  useEffect(() => {
    const isteklerRef = ref(db, 'KilitSistemi/Istekler');
    
    onValue(isteklerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liste = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));

        // Sıralama: Önce "Bekliyor" olanlar üstte çıksın, sonra tarihe göre dizilsin
        liste.sort((a, b) => {
          if (a.Durum === 'Bekliyor' && b.Durum !== 'Bekliyor') return -1;
          if (a.Durum !== 'Bekliyor' && b.Durum === 'Bekliyor') return 1;
          return new Date(b.TalepBaslangic.replace(" ", "T")) - new Date(a.TalepBaslangic.replace(" ", "T"));
        });

        setIstekler(liste);
      } else {
        setIstekler([]);
      }
    });
  }, []);

  // MESAJ GÖSTERİCİ YARDIMCI FONKSİYON
  const mesajGoster = (tip, metin) => {
    setMesaj({ tip, metin });
    setTimeout(() => setMesaj({ tip: '', metin: '' }), 3000);
  };

  // --- ONAYLAMA VE OTOMATİK PIN ATAMA MANTIĞI ---
  const handleOnayla = async (istek) => {
    try {
      const sifrelerRef = ref(db, 'KilitSistemi/Sifreler');
      const snapshot = await get(sifrelerRef);
      const mevcutSifreler = snapshot.exists() ? snapshot.val() : {};
      const suAn = new Date();

      // 1. Kullanıcının şu an GEÇERLİ/AKTİF bir şifresi var mı?
      const kullanicininAktifSifresiVarMi = Object.values(mevcutSifreler).some((sifre) => {
        const bitisTarihi = new Date(sifre.Bitis.replace(" ", "T"));
        return sifre.UserID === istek.UserID && bitisTarihi > suAn;
      });

      if (kullanicininAktifSifresiVarMi) {
        mesajGoster('hata', `${istek.KullaniciAdi} isimli kullanıcının şu an aktif bir şifresi zaten var!`);
        return;
      }

      // 2. Rastgele ve Benzersiz 4 Haneli PIN Üretme (Süresi dolanları boşta sayar)
      let yeniPin;
      let pinBenzersizMi = false;
      
      while (!pinBenzersizMi) {
        yeniPin = rastgelePinUret(); // Bileşen dışındaki fonksiyondan geliyor
        
        if (!mevcutSifreler[yeniPin]) {
          // PIN veritabanında hiç yoksa kullan
          pinBenzersizMi = true;
        } else {
          // PIN var ama süresi dolmuşsa kullan
          const eskiSifreBitis = new Date(mevcutSifreler[yeniPin].Bitis.replace(" ", "T"));
          if (eskiSifreBitis < suAn) {
            pinBenzersizMi = true;
          }
        }
      }

      // 3. Şifreyi Veritabanına Kaydet (Eski PIN'in üzerine yazar)
      await set(ref(db, `KilitSistemi/Sifreler/${yeniPin}`), {
        UserID: istek.UserID,
        KullaniciAdi: istek.KullaniciAdi,
        Baslangic: istek.TalepBaslangic,
        Bitis: istek.TalepBitis
      });

      // 4. İsteğin Durumunu Güncelle
      await update(ref(db, `KilitSistemi/Istekler/${istek.id}`), {
        Durum: 'Onaylandı',
        AtananPIN: yeniPin
      });

      mesajGoster('basari', `İstek onaylandı! Atanan PIN: ${yeniPin}`);

    } catch (error) {
      console.error("Onaylama Hatası:", error);
      mesajGoster('hata', 'İşlem sırasında bir hata oluştu.');
    }
  };

  // --- REDDETME MANTIĞI ---
  const handleReddet = async (id) => {
    if (window.confirm("Bu yetki talebini reddetmek istediğinize emin misiniz?")) {
      try {
        await update(ref(db, `KilitSistemi/Istekler/${id}`), { Durum: 'Reddedildi' });
        mesajGoster('basari', 'İstek başarıyla reddedildi.');
      } catch (error) {
        console.error("Reddetme Hatası:", error);
        mesajGoster('hata', 'Reddetme işlemi sırasında hata oluştu.');
      }
    }
  };

  // --- FİLTRELEME MANTIĞI ---
  const filtrelenmisIstekler = istekler.filter((istek) => {
    const aramaKucuk = aramaMetni.toLowerCase();
    const isimEslesmesi = istek.KullaniciAdi?.toLowerCase().includes(aramaKucuk);
    const aciklamaEslesmesi = istek.Aciklama?.toLowerCase().includes(aramaKucuk);
    
    const aramaUygun = aramaMetni === '' || isimEslesmesi || aciklamaEslesmesi;
    const durumUygun = filtreDurum === 'Tümü' || istek.Durum === filtreDurum;
    
    return aramaUygun && durumUygun;
  });

  // --- SAYFALAMA MATEMATİĞİ ---
  const sonKayitIndeksi = mevcutSayfa * kayitSayisi;
  const ilkKayitIndeksi = sonKayitIndeksi - kayitSayisi;
  
  const gosterilecekIstekler = filtrelenmisIstekler.slice(ilkKayitIndeksi, sonKayitIndeksi);
  const toplamSayfa = Math.ceil(filtrelenmisIstekler.length / kayitSayisi);

  // ROZET TASARIMLARI
  const getDurumEtiketi = (durum) => {
    switch (durum) {
      case 'Onaylandı': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">Onaylandı</span>;
      case 'Reddedildi': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">Reddedildi</span>;
      default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200 animate-pulse">Bekliyor</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      
      {/* BAŞLIK VE MESAJ ALANI */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kapı Yetki Talepleri</h2>
        <p className="text-gray-500 text-sm mt-1">Kullanıcıların mobil uygulama üzerinden gönderdiği şifre taleplerini buradan yönetebilirsiniz.</p>
      </div>

      {mesaj.metin && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${mesaj.tip === 'basari' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mesaj.metin}
        </div>
      )}

      {/* FİLTRELEME ÇUBUĞU */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="İsim veya açıklama ara..." 
            value={aramaMetni}
            onChange={(e) => { setAramaMetni(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <div className="w-full md:w-64">
          <select 
            value={filtreDurum}
            onChange={(e) => { setFiltreDurum(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="Tümü">Tüm Durumlar</option>
            <option value="Bekliyor">Bekleyenler</option>
            <option value="Onaylandı">Onaylananlar</option>
            <option value="Reddedildi">Reddedilenler</option>
          </select>
        </div>
      </div>

      {/* İSTEKLER TABLOSU */}
      <div className="overflow-x-auto min-h-[250px]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 text-sm">
              <th className="py-3 px-4 rounded-tl-lg font-semibold whitespace-nowrap">Kullanıcı Bilgisi</th>
              <th className="py-3 px-4 font-semibold min-w-[200px]">Talep Açıklaması</th>
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Talep Edilen Aralığı</th>
              <th className="py-3 px-4 font-semibold">Durum</th>
              <th className="py-3 px-4 rounded-tr-lg font-semibold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {gosterilecekIstekler.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-gray-500">Kayıtlı talep bulunamadı.</td>
              </tr>
            ) : (
              gosterilecekIstekler.map((istek) => (
                <tr key={istek.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="py-4 px-4 font-semibold text-gray-800 whitespace-nowrap">
                    {istek.KullaniciAdi}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {istek.Aciklama}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span><span className="font-semibold text-gray-700">Baş:</span> {istek.TalepBaslangic}</span>
                      <span><span className="font-semibold text-gray-700">Bit:</span> {istek.TalepBitis}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getDurumEtiketi(istek.Durum)}
                    {istek.AtananPIN && (
                      <div className="text-xs text-indigo-600 font-bold mt-1 font-mono tracking-wider">PIN: {istek.AtananPIN}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    {istek.Durum === 'Bekliyor' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOnayla(istek)} className="bg-green-100 text-green-700 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Onayla</button>
                        <button onClick={() => handleReddet(istek.id)} className="bg-red-100 text-red-700 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Reddet</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">İşlem Tamamlandı</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SAYFALAMA BUTONLARI */}
      {toplamSayfa > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6 mt-2 rounded-b-lg">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Toplam <span className="font-medium">{filtrelenmisIstekler.length}</span> kayıttan <span className="font-medium">{ilkKayitIndeksi + 1}</span> - <span className="font-medium">{Math.min(sonKayitIndeksi, filtrelenmisIstekler.length)}</span> arası.
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button onClick={() => setMevcutSayfa(prev => Math.max(prev - 1, 1))} disabled={mevcutSayfa === 1} className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${mevcutSayfa === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                </button>
                {[...Array(toplamSayfa)].map((_, index) => (
                  <button key={index} onClick={() => setMevcutSayfa(index + 1)} className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${mevcutSayfa === index + 1 ? 'z-10 bg-indigo-600 text-white' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>{index + 1}</button>
                ))}
                <button onClick={() => setMevcutSayfa(prev => Math.min(prev + 1, toplamSayfa))} disabled={mevcutSayfa === toplamSayfa} className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${mevcutSayfa === toplamSayfa ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}