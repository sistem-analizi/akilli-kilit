import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../firebase';

export default function Sifreler() {
  const [sifreler, setSifreler] = useState([]);
  const [istatistik, setIstatistik] = useState({ toplam: 0, aktif: 0, bekleyen: 0 });
  
  // Sıralama için state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // FİLTRELEME VE ARAMA STATE'LERİ (Yeni Eklendi)
  const [aramaMetni, setAramaMetni] = useState('');
  const [filtreDurum, setFiltreDurum] = useState('Tümü');
  const [filtreBaslangic, setFiltreBaslangic] = useState('');
  const [filtreBitis, setFiltreBitis] = useState('');

  // SAYFALAMA STATE'LERİ
  const [mevcutSayfa, setMevcutSayfa] = useState(1);
  const kayitSayisi = 5; // Her sayfada kaç kayıt gösterilecek

  // Tarih ve saat karşılaştırması yapan yardımcı fonksiyon
  const durumHesapla = (baslangicStr, bitisStr) => {
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

        // Varsayılan: Tarihe göre sırala
        liste.sort((a, b) => new Date(a.Bitis.replace(" ", "T")) - new Date(b.Bitis.replace(" ", "T")));

        setSifreler(liste);
        setIstatistik({ toplam: liste.length, aktif: aktifSayisi, bekleyen: bekleyenSayisi });
      } else {
        setSifreler([]);
        setIstatistik({ toplam: 0, aktif: 0, bekleyen: 0 });
      }
    });
  }, []);

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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setMevcutSayfa(1);
  };

  // --- FİLTRELEME MANTIĞI (Yeni Eklendi) ---
  const filtreleriTemizle = () => {
    setAramaMetni('');
    setFiltreDurum('Tümü');
    setFiltreBaslangic('');
    setFiltreBitis('');
    setMevcutSayfa(1);
  };

  const filtrelenmisSifreler = sifreler.filter((sifre) => {
    // 1. Arama Metni (İsim veya PIN)
    const aramaKucuk = aramaMetni.toLowerCase();
    const isimEslesmesi = sifre.KullaniciAdi?.toLowerCase().includes(aramaKucuk);
    const pinEslesmesi = sifre.pin?.includes(aramaMetni);
    const aramaUygun = aramaMetni === '' || isimEslesmesi || pinEslesmesi;

    // 2. Durum Filtresi
    const durumUygun = filtreDurum === 'Tümü' || sifre.durum.etiket === filtreDurum;

    // 3. Tarih Filtreleri (Başlangıç Tarihine Göre)
    const sifreTarihi = sifre.Baslangic ? sifre.Baslangic.split(' ')[0] : '';
    const baslangicUygun = !filtreBaslangic || sifreTarihi >= filtreBaslangic;
    const bitisUygun = !filtreBitis || sifreTarihi <= filtreBitis;

    return aramaUygun && durumUygun && baslangicUygun && bitisUygun;
  });

  // --- SIRALAMA MANTIĞI (Filtrelenmiş Veri Üzerinden Çalışır) ---
  const siraliSifreler = [...filtrelenmisSifreler].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'durum') {
      aValue = a.durum.etiket;
      bValue = b.durum.etiket;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sonKayitIndeksi = mevcutSayfa * kayitSayisi;
  const ilkKayitIndeksi = sonKayitIndeksi - kayitSayisi;

  const gosterilecekSifreler = siraliSifreler.slice(ilkKayitIndeksi, sonKayitIndeksi);
  const toplamSayfa = Math.ceil(siraliSifreler.length / kayitSayisi);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
        </svg>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 text-indigo-600 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path>
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-indigo-600 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
      </svg>
    );
  };

  return (
    <div className="transition-colors duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">Atanan Şifreler</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">Sisteme atanmış PIN kodlarının güncel durumları.</p>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Toplam Atanan Şifre</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white">{istatistik.toplam}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 border-l-4 border-l-green-500 dark:border-l-green-600 transition-colors">
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Şu An Giriş Yapabilenler</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-500">{istatistik.aktif}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 border-l-4 border-l-yellow-500 dark:border-l-yellow-600 transition-colors">
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Saati Bekleyen Şifreler</div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{istatistik.bekleyen}</div>
        </div>  
      </div>

      {/* FİLTRELEME ÇUBUĞU */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-end transition-colors">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Arama</label>
          <input 
            type="text" 
            placeholder="İsim veya PIN ara..." 
            value={aramaMetni}
            onChange={(e) => { setAramaMetni(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Duruma Göre</label>
          <select 
            value={filtreDurum}
            onChange={(e) => { setFiltreDurum(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          >
            <option value="Tümü">Tümü (Filtresiz)</option>
            <option value="Şu An Aktif">Şu An Aktif</option>
            <option value="Bekliyor">Bekliyor</option>
            <option value="Süresi Doldu">Süresi Doldu</option>
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Başlangıç Tarihi (İtibaren)</label>
          <input 
            type="date" 
            value={filtreBaslangic}
            onChange={(e) => { setFiltreBaslangic(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Başlangıç Tarihi (Kadar)</label>
          <input 
            type="date" 
            value={filtreBitis}
            onChange={(e) => { setFiltreBitis(e.target.value); setMevcutSayfa(1); }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
          />
        </div>

        <div className="w-full md:w-auto flex justify-end">
          <button 
            onClick={filtreleriTemizle}
            className="w-full md:w-auto px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition whitespace-nowrap"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      {/* TABLO / MOBİLDE KART YAPISI */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Tüm PIN Kodları</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Listelenen: {filtrelenmisSifreler.length} kayıt</span>
        </div>
        
        <div className="w-full">
          <table className="w-full text-left block md:table">
            
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-sm transition-colors">
                <th className="py-3 px-4 rounded-tl-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition select-none" onClick={() => handleSort('pin')}>
                  <div className="flex items-center gap-2">PIN Kodu <SortIcon columnKey="pin" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition select-none" onClick={() => handleSort('KullaniciAdi')}>
                  <div className="flex items-center gap-2">Kullanıcı <SortIcon columnKey="KullaniciAdi" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition select-none" onClick={() => handleSort('Baslangic')}>
                  <div className="flex items-center gap-2">Başlangıç <SortIcon columnKey="Baslangic" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition select-none" onClick={() => handleSort('Bitis')}>
                  <div className="flex items-center gap-2">Bitiş <SortIcon columnKey="Bitis" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition select-none" onClick={() => handleSort('durum')}>
                  <div className="flex items-center gap-2">Durum <SortIcon columnKey="durum" /></div>
                </th>
                <th className="py-3 px-4 rounded-tr-lg text-right">İşlem</th>
              </tr>
            </thead>
            
            <tbody className="block md:table-row-group">
              {siraliSifreler.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="6" className="block md:table-cell text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{sifreler.length === 0 ? "Sistemde kayıtlı şifre bulunmuyor." : "Filtreleme kriterlerinize uyan şifre bulunamadı."}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                gosterilecekSifreler.map((sifre) => (
                  <tr key={sifre.pin} className="block md:table-row border border-gray-200 dark:border-gray-700 md:border-0 md:border-b md:border-gray-50 md:dark:border-gray-700/50 bg-white dark:bg-transparent rounded-xl md:rounded-none shadow-sm md:shadow-none mb-4 md:mb-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors p-4 md:p-0">
                    
                    {/* PIN */}
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      <span className="md:hidden text-xs font-bold text-gray-500 uppercase">PIN Kodu</span>
                      <span className="text-right md:text-left">{sifre.pin}</span>
                    </td>
                    
                    {/* Kullanıcı */}
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 font-semibold text-gray-800 dark:text-white border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                      <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Kullanıcı</span>
                      <span className="text-right md:text-left">{sifre.KullaniciAdi}</span>
                    </td>
                    
                    {/* Başlangıç */}
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 text-gray-600 dark:text-gray-400 text-sm border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                      <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Başlangıç</span>
                      <span className="text-right md:text-left whitespace-nowrap">{sifre.Baslangic}</span>
                    </td>
                    
                    {/* Bitiş */}
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 text-gray-600 dark:text-gray-400 text-sm border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                      <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Bitiş</span>
                      <span className="text-right md:text-left whitespace-nowrap">{sifre.Bitis}</span>
                    </td>
                    
                    {/* Durum */}
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 px-0 md:px-4 border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
                      <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Durum</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sifre.durum.renk.replace('text', 'border').replace('100', '200')} dark:bg-opacity-20 ${sifre.durum.renk}`}>
                        {sifre.durum.etiket}
                      </span>
                    </td>
                    
                    {/* İşlem */}
                    <td className="flex justify-end md:table-cell py-3 md:py-4 px-0 md:px-4 md:text-right border-t border-gray-100 dark:border-gray-700 md:border-none mt-2 md:mt-0 pt-3 md:pt-4">
                      <button onClick={() => handleSifreIptal(sifre.pin)} className="w-full md:w-auto text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-semibold hover:underline bg-red-50 dark:bg-red-900/30 px-3 py-2 md:py-1 rounded-lg transition text-center">
                        İptal Et
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SAYFALAMA BUTONLARI (MOBİL UYUMLU) */}
        {toplamSayfa > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 mt-4 md:mt-2 rounded-b-lg transition-colors gap-4 md:gap-0">
          <div className="w-full md:flex-1 flex justify-center md:justify-start">
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center md:text-left">
              Toplam <span className="font-medium">{filtrelenmisSifreler.length}</span> kayıttan{' '}
              <span className="font-medium">{ilkKayitIndeksi + 1}</span> -{' '}
              <span className="font-medium">{Math.min(sonKayitIndeksi, filtrelenmisSifreler.length)}</span> arası.
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