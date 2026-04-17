import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

export default function Dashboard() {
  // İSTATİSTİK STATE'LERİ
  const [istatistikler, setIstatistikler] = useState({
    toplamKullanici: 0,
    aktifSifreler: 0,
    bekleyenIstekler: 0,
    bugunkuGirisler: 0,
    bugunkuHatalar: 0
  });

  // SON HAREKETLER (LOGLAR) İÇİN STATE
  const [sonLoglar, setSonLoglar] = useState([]);

  useEffect(() => {
    const kilitSistemiRef = ref(db, 'KilitSistemi');

    onValue(kilitSistemiRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const suAn = new Date();
      const bugunStr = suAn.toISOString().split('T')[0]; // "2026-04-18" formatı

      let aktifSifreSayisi = 0;
      let bekleyenIstekSayisi = 0;
      let bugunkuGirisSayisi = 0;
      let bugunkuHataSayisi = 0;

      // 1. KULLANICILAR HESAPLAMASI
      const toplamKullaniciSayisi = data.Kullanicilar ? Object.keys(data.Kullanicilar).length : 0;

      // 2. AKTİF ŞİFRE HESAPLAMASI
      if (data.Sifreler) {
        Object.values(data.Sifreler).forEach(sifre => {
          const baslangic = new Date(sifre.Baslangic.replace(" ", "T"));
          const bitis = new Date(sifre.Bitis.replace(" ", "T"));
          if (suAn >= baslangic && suAn <= bitis) {
            aktifSifreSayisi++;
          }
        });
      }

      // 3. BEKLEYEN İSTEKLER HESAPLAMASI yapılıyor 
      if (data.Istekler) {
        Object.values(data.Istekler).forEach(istek => {
          if (istek.Durum === 'Bekliyor') {
            bekleyenIstekSayisi++;
          }
        });
      }

      // 4. LOGLAR VE SON HAREKETLER HESAPLAMASI
      let logListesi = [];
      if (data.GirisLoglari) {
        Object.keys(data.GirisLoglari).forEach(key => {
          const log = data.GirisLoglari[key];
          logListesi.push({ id: key, ...log });

          // Bugünün verilerini say
          const logTarihi = log.IslemZamani.split(' ')[0];
          if (logTarihi === bugunStr) {
            if (log.Durum === 'Basarili Giris') bugunkuGirisSayisi++;
            if (log.Durum === 'Hatali Sifre' || log.Durum === 'Yetkisiz Saat') bugunkuHataSayisi++;
          }
        });

        // Logları en yeniden eskiye sırala ve sadece son 5 tanesini al
        logListesi.sort((a, b) => (a.IslemZamani > b.IslemZamani ? -1 : 1));
        logListesi = logListesi.slice(0, 5);
      }

      // State'leri güncelle
      setIstatistikler({
        toplamKullanici: toplamKullaniciSayisi,
        aktifSifreler: aktifSifreSayisi,
        bekleyenIstekler: bekleyenIstekSayisi,
        bugunkuGirisler: bugunkuGirisSayisi,
        bugunkuHatalar: bugunkuHataSayisi
      });
      setSonLoglar(logListesi);
    });
  }, []);

  return (
    <div className="space-y-6">
      
      {/* KARŞILAMA VE BAŞLIK */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Sistem Özeti</h2>
        <p className="text-gray-500 text-sm mt-1">Akıllı Kapı Kilit Sisteminin anlık durum raporu.</p>
      </div>

      {/* İSTATİSTİK KARTLARI GRİDİ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Kart 1: Aktif Şifreler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Şu Anki Aktif Şifreler</p>
            <p className="text-2xl font-bold text-gray-800">{istatistikler.aktifSifreler}</p>
          </div>
        </div>

        {/* Kart 2: Bekleyen İstekler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-4 bg-yellow-50 text-yellow-600 rounded-lg relative">
            {istatistikler.bekleyenIstekler > 0 && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            )}
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Bekleyen İstekler</p>
            <p className="text-2xl font-bold text-gray-800">{istatistikler.bekleyenIstekler}</p>
          </div>
        </div>

        {/* Kart 3: Bugünkü Başarılı Girişler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Bugün Başarılı Giriş</p>
            <p className="text-2xl font-bold text-gray-800">{istatistikler.bugunkuGirisler}</p>
          </div>
        </div>

        {/* Kart 4: Bugünkü Hatalı Denemeler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Bugün Hatalı Deneme</p>
            <p className="text-2xl font-bold text-gray-800">{istatistikler.bugunkuHatalar}</p>
          </div>
        </div>

      </div>

      {/* İKİNCİ SATIR: Son Loglar ve Sistem Bilgisi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SON HAREKETLER TABLOSU */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Son Sistem Hareketleri</h3>
            <span className="text-xs text-gray-400">Canlı Akış</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Tarih & Saat</th>
                  <th className="py-3 px-4 font-semibold">Kullanıcı / PIN</th>
                  <th className="py-3 px-4 font-semibold text-right">Durum</th>
                </tr>
              </thead>
              <tbody>
                {sonLoglar.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-gray-400 text-sm">Henüz sistem hareketi yok.</td>
                  </tr>
                ) : (
                  sonLoglar.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{log.IslemZamani}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-semibold text-gray-800">{log.KullaniciAdi || 'Bilinmeyen'}</div>
                        <div className="text-xs text-indigo-500 font-mono mt-0.5">{log.KullanilanPIN}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.Durum === 'Basarili Giris' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Başarılı</span>}
                        {log.Durum === 'Hatali Sifre' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Hatalı</span>}
                        {log.Durum === 'Yetkisiz Saat' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Yetkisiz</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SİSTEM KISA BİLGİ KARTI */}
        <div className="bg-linear-to-br from-indigo-600 to-indigo-800 rounded-xl shadow-sm p-6 text-white flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2 text-indigo-100">Kullanıcı Kapasitesi</h3>
            <p className="text-sm text-indigo-200 mb-6">Sisteme kayıtlı toplam kullanıcı ve yetki durumu özetiniz.</p>
            <div className="text-5xl font-extrabold tracking-tight mb-2">
              {istatistikler.toplamKullanici} <span className="text-lg font-medium text-indigo-300">Kişi</span>
            </div>
            <p className="text-sm text-indigo-200">Veritabanına kayıtlı personel/öğrenci sayısı.</p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-indigo-500/30">
            <div className="flex items-center text-sm text-indigo-200">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Sistem şu anda aktif ve dinlemede
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}