import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
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

  const [sonLoglar, setSonLoglar] = useState([]);
  
  // CİHAZ KONTROL STATE'LERİ
  const [cihazDurumu, setCihazDurumu] = useState({ kilitli: false, mesaj: '' });
  const [ekranMesaji, setEkranMesaji] = useState('');
  const [islemMesaji, setIslemMesaji] = useState({ tip: '', metin: '' });

  // --- ZAMANLI KİLİT STATE'LERİ (Yeni Eklendi) ---
  const [zamanliKilit, setZamanliKilit] = useState(false);
  const [kilitBaslangic, setKilitBaslangic] = useState('');
  const [kilitBitis, setKilitBitis] = useState('');

  useEffect(() => {
    const kilitSistemiRef = ref(db, 'KilitSistemi');

    onValue(kilitSistemiRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const suAn = new Date();
      const bugunStr = suAn.toISOString().split('T')[0];

      let aktifSifreSayisi = 0;
      let bekleyenIstekSayisi = 0;
      let bugunkuGirisSayisi = 0;
      let bugunkuHataSayisi = 0;

      // 1. İstatistik Hesaplamaları
      const toplamKullaniciSayisi = data.Kullanicilar ? Object.keys(data.Kullanicilar).length : 0;

      if (data.Sifreler) {
        Object.values(data.Sifreler).forEach(sifre => {
          const baslangic = new Date(sifre.Baslangic.replace(" ", "T"));
          const bitis = new Date(sifre.Bitis.replace(" ", "T"));
          if (suAn >= baslangic && suAn <= bitis) aktifSifreSayisi++;
        });
      }

      if (data.Istekler) {
        Object.values(data.Istekler).forEach(istek => {
          if (istek.Durum === 'Bekliyor') bekleyenIstekSayisi++;
        });
      }

      let logListesi = [];
      if (data.GirisLoglari) {
        Object.keys(data.GirisLoglari).forEach(key => {
          const log = data.GirisLoglari[key];
          logListesi.push({ id: key, ...log });
          const logTarihi = log.IslemZamani.split(' ')[0];
          if (logTarihi === bugunStr) {
            if (log.Durum === 'Basarili Giris') bugunkuGirisSayisi++;
            if (log.Durum === 'Hatali Sifre' || log.Durum === 'Yetkisiz Saat') bugunkuHataSayisi++;
          }
        });
        logListesi.sort((a, b) => (a.IslemZamani > b.IslemZamani ? -1 : 1));
        logListesi = logListesi.slice(0, 5);
      }

      // 2. Cihaz (Ekran) Durumunu Çekme
      if (data.CihazDurumu) {
        setCihazDurumu({
          kilitli: data.CihazDurumu.Kilitli || false,
          mesaj: data.CihazDurumu.Mesaj || ''
        });
        
        // Veritabanındaki zamanlı ayarları çek
        setZamanliKilit(data.CihazDurumu.Zamanli || false);
        if (data.CihazDurumu.Baslangic) setKilitBaslangic(data.CihazDurumu.Baslangic.replace(" ", "T").substring(0, 16));
        if (data.CihazDurumu.Bitis) setKilitBitis(data.CihazDurumu.Bitis.replace(" ", "T").substring(0, 16));

        if (data.CihazDurumu.Kilitli && !ekranMesaji) {
          setEkranMesaji(data.CihazDurumu.Mesaj);
        }
      }

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

  // CİHAZ KİLİTLEME/AÇMA FONKSİYONU
  const handleCihazKilitle = async (kilitDurumu) => {
    try {
      if (kilitDurumu && !ekranMesaji.trim()) {
        setIslemMesaji({ tip: 'hata', metin: 'Lütfen ekranda görünecek bir uyarı mesajı yazın!' });
        setTimeout(() => setIslemMesaji({ tip: '', metin: '' }), 3000);
        return;
      }

      // Zamanlı kilit seçildiyse tarihleri kontrol et
      if (kilitDurumu && zamanliKilit) {
        if (!kilitBaslangic || !kilitBitis) {
          setIslemMesaji({ tip: 'hata', metin: 'Zamanlı kilit için başlangıç ve bitiş zamanını seçmelisiniz!' });
          setTimeout(() => setIslemMesaji({ tip: '', metin: '' }), 3000);
          return;
        }
      }

      const gidenMesaj = kilitDurumu ? ekranMesaji : 'Sistem Aktif'; 
      const dbBaslangic = (kilitDurumu && zamanliKilit) ? kilitBaslangic.replace("T", " ") + ":00" : "";
      const dbBitis = (kilitDurumu && zamanliKilit) ? kilitBitis.replace("T", " ") + ":00" : "";
      
      await update(ref(db, 'KilitSistemi/CihazDurumu'), {
        Kilitli: kilitDurumu,
        Zamanli: kilitDurumu ? zamanliKilit : false,
        Baslangic: dbBaslangic,
        Bitis: dbBitis,
        Mesaj: gidenMesaj
      });

      if (!kilitDurumu) {
        setEkranMesaji('');
        setZamanliKilit(false);
        setKilitBaslangic('');
        setKilitBitis('');
      }

      setIslemMesaji({ 
        tip: 'basari', 
        metin: kilitDurumu ? (zamanliKilit ? 'Sistem belirtilen saatlerde kilitlenmek üzere programlandı.' : 'Sistem anında kilitlendi.') : 'Sistem kilidi açıldı, normale dönüldü.' 
      });
      setTimeout(() => setIslemMesaji({ tip: '', metin: '' }), 3000);

    } catch (error) {
      console.error("Cihaz kontrol hatası:", error);
      setIslemMesaji({ tip: 'hata', metin: 'Cihaza bağlanılamadı!' });
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">Sistem Özeti</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">Akıllı Kapı Kilit Sisteminin anlık durum raporu.</p>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          </div>
          <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aktif Şifreler</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{istatistikler.aktifSifreler}</p></div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg relative">
            {istatistikler.bekleyenIstekler > 0 && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            )}
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </div>
          <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bekleyen İstekler</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{istatistikler.bekleyenIstekler}</p></div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bugün Girişler</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{istatistikler.bugunkuGirisler}</p></div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bugün Hatalı</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{istatistikler.bugunkuHatalar}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LOGLAR TABLOSU / MOBİLDE KART YAPISI */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Son Sistem Hareketleri</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">Canlı Akış</span>
          </div>
          
          <div className="w-full">
            <table className="w-full text-left block md:table">
              {/* Masaüstünde görünen, mobilde gizlenen başlıklar */}
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Tarih & Saat</th>
                  <th className="py-3 px-4 font-semibold">Kullanıcı / PIN</th>
                  <th className="py-3 px-4 font-semibold text-right">Durum</th>
                </tr>
              </thead>
              
              <tbody className="block md:table-row-group">
                {sonLoglar.length === 0 ? (
                  <tr className="block md:table-row">
                    <td colSpan="3" className="block md:table-cell text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                      Henüz sistem hareketi yok.
                    </td>
                  </tr>
                ) : (
                  sonLoglar.map(log => (
                    <tr key={log.id} className="block md:table-row border border-gray-200 dark:border-gray-700 md:border-0 md:border-b md:border-gray-50 md:dark:border-gray-700/50 bg-gray-50/50 md:bg-transparent dark:bg-gray-800/50 md:dark:bg-transparent rounded-lg md:rounded-none mb-3 md:mb-0 p-3 md:p-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      
                      {/* Tarih & Saat Hücresi */}
                      <td className="flex justify-between items-center md:table-cell py-2 md:py-3 px-0 md:px-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Zaman</span>
                        <span className="whitespace-nowrap">{log.IslemZamani}</span>
                      </td>
                      
                      {/* Kullanıcı / PIN Hücresi */}
                      <td className="flex justify-between items-center md:items-start md:table-cell py-2 md:py-3 px-0 md:px-4 border-t border-gray-200 dark:border-gray-700 md:border-none">
                        <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Kişi / PIN</span>
                        <div className="text-right md:text-left">
                          <div className="text-sm font-semibold text-gray-800 dark:text-white">{log.KullaniciAdi || 'Bilinmeyen'}</div>
                          <div className="text-xs text-indigo-500 dark:text-indigo-400 font-mono mt-0.5">{log.KullanilanPIN}</div>
                        </div>
                      </td>
                      
                      {/* Durum Hücresi */}
                      <td className="flex justify-between items-center md:table-cell py-2 md:py-3 px-0 md:px-4 md:text-right border-t border-gray-200 dark:border-gray-700 md:border-none">
                        <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Durum</span>
                        <div>
                          {log.Durum === 'Basarili Giris' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">Başarılı</span>}
                          {log.Durum === 'Hatali Sifre' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Hatalı</span>}
                          {log.Durum === 'Yetkisiz Saat' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">Yetkisiz</span>}
                        </div>
                      </td>
                      
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SİSTEM & EKRAN KONTROLÜ MODÜLÜ (Değişmedi) */}
        <div className={`rounded-xl shadow-sm p-6 border transition-colors duration-300 ${cihazDurumu.kilitli && !zamanliKilit ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30' : (cihazDurumu.kilitli && zamanliKilit ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700')}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${cihazDurumu.kilitli ? (zamanliKilit ? 'text-orange-800 dark:text-orange-400' : 'text-red-800 dark:text-red-400') : 'text-gray-800 dark:text-white'}`}>Cihaz Kontrolü</h3>
            {cihazDurumu.kilitli ? (
              zamanliKilit ? (
                <span className="flex items-center text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full animate-pulse">
                  <span className="w-2 h-2 bg-orange-600 dark:bg-orange-500 rounded-full mr-1"></span> PLANLANDI
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full animate-pulse">
                  <span className="w-2 h-2 bg-red-600 dark:bg-red-500 rounded-full mr-1"></span> KİLİTLİ
                </span>
              )
            ) : (
              <span className="flex items-center text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-600 dark:bg-green-500 rounded-full mr-1"></span> AKTİF
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 transition-colors">
            Sistemi anında kilitleyebilir veya belirli bir zaman aralığı için programlayabilirsiniz.
          </p>

          {islemMesaji.metin && (
            <div className={`p-3 mb-4 rounded-lg text-xs font-semibold ${islemMesaji.tip === 'basari' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
              {islemMesaji.metin}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Nextion Ekran Mesajı</label>
              <textarea 
                rows="2"
                placeholder="Örn: Sınav Var, Lütfen Girmeyiniz!"
                value={ekranMesaji}
                onChange={(e) => setEkranMesaji(e.target.value)}
                disabled={cihazDurumu.kilitli}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${cihazDurumu.kilitli ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
              />
            </div>

            {/* ZAMANLI KİLİT CHECKBOX */}
            {!cihazDurumu.kilitli && (
              <div className="flex items-center gap-2 mb-2 pt-2 border-t dark:border-gray-700">
                <input 
                  type="checkbox" 
                  id="zamanli" 
                  checked={zamanliKilit} 
                  onChange={(e) => setZamanliKilit(e.target.checked)} 
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-500 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <label htmlFor="zamanli" className="text-sm font-semibold text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                  Planlı (Zamanlı) Kilitleme Yap
                </label>
              </div>
            )}

            {/* ZAMAN SEÇİM ALANLARI */}
            {(zamanliKilit || (cihazDurumu.kilitli && zamanliKilit)) && (
              <div className="grid grid-cols-2 gap-3 pb-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Başlangıç</label>
                  <input 
                    type="datetime-local" 
                    value={kilitBaslangic} 
                    onChange={(e)=>setKilitBaslangic(e.target.value)} 
                    disabled={cihazDurumu.kilitli} 
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded text-xs transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Bitiş</label>
                  <input 
                    type="datetime-local" 
                    value={kilitBitis} 
                    onChange={(e)=>setKilitBitis(e.target.value)} 
                    disabled={cihazDurumu.kilitli} 
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded text-xs transition-colors" 
                  />
                </div>
              </div>
            )}

            {cihazDurumu.kilitli ? (
              <button 
                onClick={() => handleCihazKilitle(false)}
                className="w-full bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition shadow-md flex justify-center items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                Kilidi Aç ve Normale Dön
              </button>
            ) : (
              <button 
                onClick={() => handleCihazKilitle(true)}
                className={`w-full text-white font-medium py-2.5 rounded-lg transition shadow-md flex justify-center items-center gap-2 ${zamanliKilit ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 shadow-orange-500/30' : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 shadow-red-500/30'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                {zamanliKilit ? 'Planlı Kilidi Başlat' : 'Sistemi Kilitle & Mesaj Gönder'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}