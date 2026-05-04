import { useState, useEffect } from 'react';
import { ref, onValue, set, remove, update, get } from 'firebase/database';
import { db } from '../firebase';

export default function Kullanicilar() {
  const [kullanicilar, setKullanicilar] = useState([]);
  
  // Hangi satırın 3 nokta menüsü açık?
  const [acikMenuId, setAcikMenuId] = useState(null);

  // ARAMA VE MENÜ STATE'LERİ
  const [aramaMetni, setAramaMetni] = useState('');
  
  // Modallar için State'ler
  const [isEkleModalOpen, setIsEkleModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [seciliKullanici, setSeciliKullanici] = useState(null);
  
  // Form State'leri
  const [ekleForm, setEkleForm] = useState({ Ad: '', Email: '', Sifre: '' });
  const [editForm, setEditForm] = useState({ Ad: '', Email: '', Sifre: '' });
  const [pinForm, setPinForm] = useState({ pin: '', baslangic: '', bitis: '' });
  const [mesaj, setMesaj] = useState({ tip: '', metin: '' });
  // PIN atama modalı için ayrı mesaj state'i
  const [pinMesaj, setPinMesaj] = useState({ tip: '', metin: '' });

  // SAYFALAMA STATE'LERİ
  const [mevcutSayfa, setMevcutSayfa] = useState(1);
  const kayitSayisi = 5; // Her sayfada kaç kayıt gösterilecek


  useEffect(() => {
    const kullanicilarRef = ref(db, 'KilitSistemi/Kullanicilar');
    onValue(kullanicilarRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liste = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setKullanicilar(liste);
      } else { setKullanicilar([]); }
    });
  }, []);

  // --- FİLTRELEME MANTIĞI ---
  const filtrelenmisKullanicilar = kullanicilar.filter((user) => {
    return user.Ad.toLowerCase().includes(aramaMetni.toLowerCase()) || 
           user.Email.toLowerCase().includes(aramaMetni.toLowerCase());
  });

  const sonKayitIndeksi = mevcutSayfa * kayitSayisi;
  const ilkKayitIndeksi = sonKayitIndeksi - kayitSayisi;
  
  const gosterilecekKullanicilar = filtrelenmisKullanicilar.slice(ilkKayitIndeksi, sonKayitIndeksi);
  const toplamSayfa = Math.ceil(filtrelenmisKullanicilar.length / kayitSayisi);

  // --- YENİ KULLANICI EKLEME ---
  const handleKullaniciEkle = async (e) => {
    e.preventDefault();
    const yeniId = `uid_${Date.now()}`; // Otomatik benzersiz ID oluştur
    try {
      await set(ref(db, `KilitSistemi/Kullanicilar/${yeniId}`), ekleForm);
      setMesaj({ tip: 'basari', metin: 'Yeni kullanıcı başarıyla eklendi!' });
      setIsEkleModalOpen(false);
      setEkleForm({ Ad: '', Email: '', Sifre: '' }); // Formu temizle
      setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);
    } catch (error) { 
        console.error("Kullanıcı ekleme hatası:", error);
        setMesaj({ tip: 'hata', metin: 'Kullanıcı eklenemedi.' }); }
  };

  // --- SİLME İŞLEMİ ( cascade -> kullanıcı ve ilişkili şifreler) ---
  const handleKullaniciSil = async (id) => {
    if (window.confirm("Bu kullanıcıyı sildiğinizde ona tanımlı olan aktif şifreler de kalıcı olarak silinecektir. Onaylıyor musunuz?")) {
      try {
        // 1. ADIM: Sifreler düğümünde bu kullanıcıya ait bir kayıt var mı tara
        const sifrelerRef = ref(db, 'KilitSistemi/Sifreler');
        const snapshot = await get(sifrelerRef);

        if (snapshot.exists()) {
          const mevcutSifreler = snapshot.val();
          
          // Silinecek kullanıcının ID'sine sahip olan PIN'i buluyoruz
          const silinecekPin = Object.keys(mevcutSifreler).find(
            (pin) => mevcutSifreler[pin].UserID === id
          );

          // Eğer kullanıcıya ait bir PIN bulunduysa, önce onu temizle
          if (silinecekPin) {
            await remove(ref(db, `KilitSistemi/Sifreler/${silinecekPin}`));
            console.log(`Cascade: ${id} kullanıcısına ait ${silinecekPin} PIN'i silindi.`);
          }
        }

        // 2. ADIM: Kullanıcının kendisini sil
        await remove(ref(db, `KilitSistemi/Kullanicilar/${id}`));

        setMesaj({ tip: 'basari', metin: 'Kullanıcı ve ilişkili tüm veriler başarıyla temizlendi.' });
        setAcikMenuId(null); // 3 nokta menüsünü kapat
        setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);

      } catch (error) { 
        console.error("Silme hatası:", error);
        alert("Silme işlemi sırasında teknik bir sorun oluştu.");
      }
    }
  };

  // --- GÜNCELLEME İŞLEMİ ---
  const handleGuncelle = async (e) => {
    e.preventDefault();
    try {
      await update(ref(db, `KilitSistemi/Kullanicilar/${seciliKullanici.id}`), editForm);
      setMesaj({ tip: 'basari', metin: 'Bilgiler güncellendi!' });
      setIsEditModalOpen(false);
      setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);
    } catch (error) { 
      console.error("Kullanıcı güncelleme hatası:", error);
      setMesaj({ tip: 'hata', metin: 'Güncelleme başarısız.' }); }
  };

  // --- PIN (ŞİFRE ATA) İŞLEMİ ---
  const handlePinAta = async (e) => {
    e.preventDefault();
    
    // Mesajı gösterip 1.5 saniye sonra otomatik temizleyen yardımcı fonksiyon
    const pinMesajGosterVeSil = (tip, metin) => {
      setPinMesaj({ tip, metin });
      setTimeout(() => setPinMesaj({ tip: '', metin: '' }), 1500);
    };
    
    // 1. FORMAT KONTROLLERİ
    if (!/^\d{4}$/.test(pinForm.pin)) {
      pinMesajGosterVeSil('hata', 'PIN kodu 4 haneli sayı olmalıdır.');
      return;
    }

    const baslangicTarihi = new Date(pinForm.baslangic);
    const bitisTarihi = new Date(pinForm.bitis);
    const suAn = new Date();
    
    // Kullanıcı formu doldururken geçecek süreyi hesaba katarak 5 dakikalık bir tolerans tanıyoruz
    const toleransliSuAn = new Date(suAn.getTime() - 5 * 60000);

    if (baslangicTarihi < toleransliSuAn) {
      pinMesajGosterVeSil('hata', 'Başlangıç tarihi geçmiş bir zaman olamaz.');
      return;
    }

    if (baslangicTarihi >= bitisTarihi) {
      pinMesajGosterVeSil('hata', 'Bitiş zamanı başlangıç zamanından sonra olmalıdır.');
      return;
    }

    try {
     // 2. VERİTABANI KONTROLLERİ
      const sifrelerRef = ref(db, 'KilitSistemi/Sifreler');
      const snapshot = await get(sifrelerRef);
      
      if (snapshot.exists()) {
        const mevcutSifreler = snapshot.val();
        const suAn = new Date();

        // A) Bu kullanıcının GEÇERLİ/AKTİF bir şifresi var mı? (Süresi dolmuş şifreler sayılmaz)
        const kullanicininAktifSifresiVarMi = Object.values(mevcutSifreler).some((sifre) => {
          const bitisTarihi = new Date(sifre.Bitis.replace(" ", "T"));
          return sifre.UserID === seciliKullanici.id && bitisTarihi > suAn;
        });

        if (kullanicininAktifSifresiVarMi) {
          pinMesajGosterVeSil('hata', 'Bu kullanıcının halihazırda geçerli bir şifresi var! Önce onu iptal edin.');
          return;
        }

        // B) Girilen PIN başkası tarafından AKTİF olarak kullanılıyor mu?
        if (mevcutSifreler[pinForm.pin]) {
          const eskiSifreBitis = new Date(mevcutSifreler[pinForm.pin].Bitis.replace(" ", "T"));
          
          // Eğer PIN var ama Bitiş tarihi hala gelecekteyse (Süresi Dolmamışsa) işlemi engelle
          if (eskiSifreBitis > suAn) {
            pinMesajGosterVeSil('hata', 'Bu PIN kodu şu anda başka bir kullanıcıda aktif!');
            return;
          }
          // Eğer Bitiş tarihi eskiyse, kod aşağıya inip eski PIN'in üzerine yazacak!
        }
      }

      // 3. HER ŞEY UYGUNSA KAYIT İŞLEMİ (Tarihi geçmiş PIN varsa üzerine yazar)
      await set(ref(db, `KilitSistemi/Sifreler/${pinForm.pin}`), {
        UserID: seciliKullanici.id,
        KullaniciAdi: seciliKullanici.Ad,
        Baslangic: pinForm.baslangic.replace("T", " "),
        Bitis: pinForm.bitis.replace("T", " ")
      });
      
      setMesaj({ tip: 'basari', metin: 'PIN başarıyla atandı!' });
      setIsPinModalOpen(false);
      setPinForm({ pin: '', baslangic: '', bitis: '' }); // Formu temizle
      setPinMesaj({ tip: '', metin: '' }); // Modal mesajını temizle
      setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);
      
    } catch (error) { 
      console.error("PIN atama hatası:", error);
      setPinMesaj({ tip: 'hata', metin: 'Sistemsel bir hata oluştu, PIN atanamadı.' }); 
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 relative transition-colors duration-300">
      
     {/* ÜST BAŞLIK VE AKSİYONLAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Sistemdeki tüm kayıtlı kullanıcılar</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          {/* ARAMA ÇUBUĞU */}
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="İsim veya e-posta ile ara..." 
              value={aramaMetni}
              onChange={(e) => { setAramaMetni(e.target.value); setMevcutSayfa(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-colors"
            />
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <button 
            onClick={() => setIsEkleModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            + Yeni Ekle
          </button>
        </div>
      </div>

      {/* MESAJ KUTUSU */}
      {mesaj.metin && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium transition-colors ${mesaj.tip === 'basari' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
          {mesaj.metin}
        </div>
      )}

      {/* KULLANICI TABLOSU */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-800/50 transition-colors">
              <th className="py-3 px-4">Ad Soyad</th>
              <th className="py-3 px-4">E-posta</th>
              <th className="py-3 px-4">Giriş Şifresi</th>
              <th className="py-3 px-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtrelenmisKullanicilar.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-400 dark:text-gray-500">
                  {kullanicilar.length === 0 ? "Henüz kullanıcı yok." : "Arama kriterine uygun kullanıcı bulunamadı."}
                </td>
              </tr>
            ) : (
              gosterilecekKullanicilar.map((u, index) => {
                
                // son satırlarda açılan menünün ekran dışına taşmaması için kontrol
                const isSonSatirlar = gosterilecekKullanicilar.length > 2 && index >= gosterilecekKullanicilar.length - 2;

              return (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-800 dark:text-white">{u.Ad}</td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{u.Email}</td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-mono">{u.Sifre || '---'}</td>
                  <td className="py-4 px-4 text-right relative">
                    <button onClick={() => setAcikMenuId(acikMenuId === u.id ? null : u.id)} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {acikMenuId === u.id && (
                      <div className={`absolute right-12 w-40 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded-lg shadow-2xl z-50 py-1 overflow-hidden transition-colors ${isSonSatirlar ? 'bottom-10 mb-1' : 'top-10 mt-1'}`}>
                        <button onClick={() => { setSeciliKullanici(u); setIsPinModalOpen(true); setAcikMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 font-medium transition-colors">PIN Ata</button>
                        <button onClick={() => { setSeciliKullanici(u); setEditForm({ Ad: u.Ad, Email: u.Email, Sifre: u.Sifre || '' }); setIsEditModalOpen(true); setAcikMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Düzenle</button>
                        <div className="border-t border-gray-100 dark:border-gray-600 my-1"></div>
                        <button onClick={() => handleKullaniciSil(u.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 font-medium transition-colors">Kullanıcıyı Sil</button>
                      </div>
                    )}
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>

      {toplamSayfa > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 mt-2 rounded-b-lg transition-colors">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Toplam <span className="font-medium">{kullanicilar.length}</span> kayıttan{' '}
                <span className="font-medium">{ilkKayitIndeksi + 1}</span> -{' '}
                <span className="font-medium">{Math.min(sonKayitIndeksi, kullanicilar.length)}</span> arası gösteriliyor.
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
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
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* YENİ KULLANICI EKLE MODALI */}
      {isEkleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl border dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Yeni Kullanıcı Ekle</h3>
            <form onSubmit={handleKullaniciEkle} className="space-y-4">
              <input type="text" required value={ekleForm.Ad} onChange={e => setEkleForm({...ekleForm, Ad: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="Ad Soyad" />
              <input type="email" required value={ekleForm.Email} onChange={e => setEkleForm({...ekleForm, Email: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="E-posta Adresi" />
              <input type="text" value={ekleForm.Sifre} onChange={e => setEkleForm({...ekleForm, Sifre: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="Kullanıcı Şifresi" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEkleModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">İptal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors">Kullanıcıyı Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DÜZENLEME MODALI */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl border dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Bilgileri Düzenle</h3>
            <form onSubmit={handleGuncelle} className="space-y-4">
              <input type="text" required value={editForm.Ad} onChange={e => setEditForm({...editForm, Ad: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="Ad Soyad" />
              <input type="email" required value={editForm.Email} onChange={e => setEditForm({...editForm, Email: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="Email" />
              <input type="text" value={editForm.Sifre} onChange={e => setEditForm({...editForm, Sifre: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="Şifre" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">İptal</button>
                <button type="submit" className="flex-1 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition-colors">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN ATA MODALI */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl border dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{seciliKullanici?.Ad} İçin PIN Ata</h3>
            {pinMesaj.metin && (
              <div className={`p-4 rounded-lg mb-6 text-sm font-medium transition-colors ${pinMesaj.tip === 'basari' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                {pinMesaj.metin}
              </div>
            )}
            <form onSubmit={handlePinAta} className="space-y-4">
              <input type="number" required onChange={e => setPinForm({...pinForm, pin: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" placeholder="Kapı PIN Kodu (Örn: 1453)" />
              <input type="datetime-local" required onChange={e => setPinForm({...pinForm, baslangic: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" />
              <input type="datetime-local" required onChange={e => setPinForm({...pinForm, bitis: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none transition-colors" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsPinModalOpen(false); setPinMesaj({ tip: '', metin: '' }); }} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">İptal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors">PIN Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}